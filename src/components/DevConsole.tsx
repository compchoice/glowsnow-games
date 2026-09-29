import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { devStore, useDevTools } from "@/lib/dev-store";
import { setCloak } from "@/lib/cloak";
import { DEV_COMMANDS } from "@/lib/dev-commands";
import { ACCENTS, FONTS, WALLPAPERS, themeStore } from "@/lib/theme";
import { onConsoleCommand } from "@/lib/console-bridge";
import { findMember, searchMembers, type MemberLike } from "@/lib/members";
import { describeDuration, parseDuration } from "@/convex/duration";
import { SITE_NAME, TAB_PRESETS } from "@/lib/site";
import { Terminal, X } from "lucide-react";

const ROLES = ["member", "user", "moderator", "admin"] as const;
type RoleName = (typeof ROLES)[number];

type Line = { kind: "input" | "output" | "error" | "clear"; text: string };

const CLOAK_ALIASES: Record<string, number> = {
  classroom: 0,
  "google classroom": 0,
  drive: 1,
  "google drive": 1,
  docs: 2,
  "google docs": 2,
  canvas: 3,
  wikipedia: 4,
  wiki: 4,
  khan: 5,
  "khan academy": 5,
};

type ModerationRow = {
  userId: string;
  name: string;
  kind: string;
  summary: string;
  reason: string | null;
};

type CommandContext = {
  println: (line: Line) => void;
  members: MemberLike[];
  isAdmin: boolean;
  isModerator: boolean;
  moderation: ModerationRow[] | undefined;
  ban: (args: { userId: Id<"users">; reason?: string }) => Promise<unknown>;
  timeout: (args: {
    userId: Id<"users">;
    durationMs: number;
    reason?: string;
  }) => Promise<unknown>;
  clear: (args: { userId: Id<"users"> }) => Promise<unknown>;
  setRole: (args: { userId: Id<"users">; role: RoleName }) => Promise<unknown>;
};

function describeError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function runCommand(raw: string, ctx: CommandContext) {
  const { println } = ctx;
  const input = raw.trim();
  if (!input) return;
  println({ kind: "input", text: input });

  const tokens = input.split(/\s+/);
  // The command and the single-argument form are case-insensitive, but member
  // names are not — so the raw tokens are kept for anything that names a person.
  const cmd = (tokens[0] ?? "").toLowerCase();
  const args = tokens.slice(1).filter(Boolean);
  const arg = args.join(" ").toLowerCase();

  /** Shared tail for the moderation commands. */
  function needMember(needle?: string) {
    if (!ctx.isModerator) {
      println({ kind: "error", text: "You need moderator access to do that." });
      return null;
    }
    if (!needle) return null;
    const member = findMember(needle, ctx.members);
    if (member) return member;
    const close = searchMembers(needle, ctx.members).slice(0, 5);
    println({
      kind: "error",
      text: close.length
        ? `No single member matches “${needle}”. Did you mean: ${close.map((m) => m.name).join(", ")}?`
        : `No member matches “${needle}”.`,
    });
    return null;
  }

  switch (cmd) {
    case "help":
      println({ kind: "output", text: "Developer commands:" });
      for (const spec of DEV_COMMANDS) {
        println({
          kind: "output",
          text: `  ${spec.cmd}${spec.args ? ` ${spec.args}` : ""} — ${spec.desc}`,
        });
      }
      break;

    case "mods":
    case "moderation": {
      if (!ctx.isModerator) {
        println({ kind: "error", text: "You need moderator access to do that." });
        break;
      }
      const rows = ctx.moderation;
      if (rows === undefined) {
        println({ kind: "output", text: "Loading moderation…" });
        break;
      }
      if (rows.length === 0) {
        println({ kind: "output", text: "Nobody is moderated." });
        break;
      }
      for (const row of rows) {
        println({
          kind: "output",
          text: `  ${row.name} — ${row.kind} · ${row.summary}${row.reason ? ` · ${row.reason}` : ""}`,
        });
      }
      break;
    }

    case "ban":
    case "kick": {
      if (!ctx.isAdmin) {
        println({
          kind: "error",
          text: "Banning is owner-only. Moderators can use timeout instead.",
        });
        break;
      }
      const member = needMember(args[0]);
      if (!member) {
        if (!args[0]) println({ kind: "error", text: "Usage: ban <member> [reason]" });
        break;
      }
      try {
        await ctx.ban({
          userId: member._id as Id<"users">,
          reason: args.slice(1).join(" ") || undefined,
        });
        println({ kind: "output", text: `Banned ${member.name}.` });
      } catch (error) {
        println({ kind: "error", text: describeError(error, "Could not ban that member.") });
      }
      break;
    }

    case "timeout":
    case "mute": {
      if (!ctx.isModerator) {
        println({ kind: "error", text: "You need moderator access to do that." });
        break;
      }
      // `mute ana` means ten minutes; `timeout ana 2h` spells it out.
      const durationText = args[1] ?? (cmd === "mute" ? "10m" : "");
      const member = needMember(args[0]);
      if (!member) {
        if (!args[0]) {
          println({
            kind: "error",
            text: cmd === "mute"
              ? "Usage: mute <member> [duration] [reason]"
              : "Usage: timeout <member> <duration> [reason]",
          });
        }
        break;
      }
      const ms = parseDuration(durationText);
      if (ms === null) {
        println({
          kind: "error",
          text: "Give a duration like 10m, 2h, 1d or 1w.",
        });
        break;
      }
      const reason = args[1] ? args.slice(2).join(" ") : args.slice(1).join(" ");
      try {
        await ctx.timeout({
          userId: member._id as Id<"users">,
          durationMs: ms,
          reason: reason || undefined,
        });
        println({
          kind: "output",
          text: `Silenced ${member.name} for ${describeDuration(ms)}.`,
        });
      } catch (error) {
        println({
          kind: "error",
          text: describeError(error, "Could not time that member out."),
        });
      }
      break;
    }

    case "unban":
    case "unmute":
    case "untimeout": {
      const member = needMember(args[0]);
      if (!member) {
        if (!args[0]) println({ kind: "error", text: "Usage: unban <member>" });
        break;
      }
      try {
        await ctx.clear({ userId: member._id as Id<"users"> });
        println({ kind: "output", text: `Lifted moderation for ${member.name}.` });
      } catch (error) {
        println({
          kind: "error",
          text: describeError(error, "That member is not moderated."),
        });
      }
      break;
    }

    case "check":
    case "who": {
      const member = needMember(args[0]);
      if (!member) {
        if (!args[0]) println({ kind: "error", text: "Usage: check <member>" });
        break;
      }
      const row = (ctx.moderation ?? []).find((entry) => entry.userId === member._id);
      println({ kind: "output", text: `${member.name} — ${row ? `${row.kind} · ${row.summary}` : "not moderated"}` });
      break;
    }

    case "role": {
      if (!ctx.isAdmin) {
        println({ kind: "error", text: "Only the owner can change roles." });
        break;
      }
      const member = needMember(args[0]);
      if (!member) {
        if (!args[0]) {
          println({ kind: "error", text: "Usage: role <member> member|user|moderator|admin" });
        }
        break;
      }
      const next = ROLES.find((role) => role === (args[1] ?? "").toLowerCase());
      if (!next) {
        println({
          kind: "error",
          text: `Pick one of: ${ROLES.join(", ")}.`,
        });
        break;
      }
      try {
        await ctx.setRole({ userId: member._id as Id<"users">, role: next });
        println({ kind: "output", text: `${member.name} is now ${next}.` });
      } catch (error) {
        println({
          kind: "error",
          text: describeError(error, "Could not change that role."),
        });
      }
      break;
    }

    case "snow":
      if (arg === "on" || arg === "off") {
        themeStore.set({ snow: arg === "on" });
        println({ kind: "output", text: `Snow droplets ${arg}.` });
      } else {
        println({ kind: "error", text: "Usage: snow on | snow off" });
      }
      break;

    case "font": {
      const font = FONTS.find(
        (entry) => entry.id === arg || entry.label.toLowerCase() === arg,
      );
      if (!font) {
        println({
          kind: "error",
          text: `Unknown font. Try: ${FONTS.map((entry) => entry.id).join(", ")}.`,
        });
      } else {
        themeStore.set({ font: font.id });
        println({ kind: "output", text: `Body font set to ${font.label}.` });
      }
      break;
    }

    case "wallpaper":
    case "bg": {
      if (arg === "off" || arg === "none") {
        themeStore.set({ wallpaper: "none" });
        println({ kind: "output", text: "Wallpaper removed." });
        break;
      }
      const wallpaper = WALLPAPERS.find(
        (entry) => entry.id === arg || entry.label.toLowerCase() === arg,
      );
      if (!wallpaper) {
        println({
          kind: "error",
          text: `Unknown wallpaper. Try: ${WALLPAPERS.map((entry) => entry.id).join(", ")}, or off.`,
        });
      } else {
        themeStore.set({ wallpaper: wallpaper.id });
        println({ kind: "output", text: `Wallpaper set to ${wallpaper.label}.` });
      }
      break;
    }

    case "cloak": {
      if (arg === "off" || arg === "none") {
        setCloak(null);
        println({ kind: "output", text: "Disguise removed." });
      } else if (arg) {
        const index = CLOAK_ALIASES[arg];
        if (index === undefined) {
          println({
            kind: "error",
            text: `Unknown preset. Try: ${TAB_PRESETS.map((p) => p.label.toLowerCase()).join(", ")}, or off.`,
          });
        } else {
          const preset = TAB_PRESETS[index];
          setCloak(preset);
          println({ kind: "output", text: `Tab disguised as ${preset.label}.` });
        }
      } else {
        println({ kind: "error", text: "Usage: cloak <preset> | cloak off" });
      }
      break;
    }

    case "theme": {
      const accent = ACCENTS.find(
        (entry) => entry.id === arg || entry.label.toLowerCase() === arg,
      );
      if (!accent) {
        println({
          kind: "error",
          text: `Unknown accent. Try: ${ACCENTS.map((entry) => entry.id).join(", ")}.`,
        });
      } else {
        themeStore.set({ accent: accent.id });
        println({ kind: "output", text: `Accent set to ${accent.label}.` });
      }
      break;
    }

    case "mode": {
      if (arg === "dark" || arg === "light") {
        themeStore.set({ mode: arg });
        println({ kind: "output", text: `Switched to ${arg} mode.` });
      } else {
        println({ kind: "error", text: "Usage: mode dark | mode light" });
      }
      break;
    }

    case "status": {
      const state = devStore.get();
      const theme = themeStore.get();
      println({
        kind: "output",
        text: `site=${SITE_NAME} · snow=${theme.snow ? "on" : "off"} · font=${theme.font} · wallpaper=${theme.wallpaper} · disguise=${state.panicTab ? state.panicTab.label : "off"} · accent=${theme.accent} · mode=${theme.mode}`,
      });
      break;
    }

    case "clear":
      println({ kind: "clear", text: "" });
      break;

    case "exit":
      println({ kind: "output", text: "Closing the console." });
      devStore.set({ devConsoleOpen: false });
      break;

    default:
      println({
        kind: "error",
        text: `Unknown command: ${cmd}. Type help for the list.`,
      });
  }
}

/**
 * The owner's developer console, pinned to the bottom-left of every page.
 * Summon it with the terminal button or Ctrl + `.
 */
export function DevConsole() {
  const [state, setState] = useDevTools();
  const [lines, setLines] = useState<Line[]>([
    { kind: "output", text: `${SITE_NAME} developer console. Type help to begin.` },
  ]);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const open = state.devConsoleOpen;

  const status = useQuery(api.users.adminStatus);
  const directory = useQuery(api.profiles.directory);
  const moderation = useQuery(
    api.moderation.list,
    status?.isModerator ? {} : "skip",
  );
  const ban = useMutation(api.moderation.ban);
  const timeout = useMutation(api.moderation.timeout);
  const clear = useMutation(api.moderation.clear);
  const setRole = useMutation(api.users.setRole);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // A command clicked in the footer opens the console with it prefilled.
  useEffect(
    () =>
      onConsoleCommand((text) => {
        setState({ devConsoleOpen: true });
        setValue(text);
      }),
    [setState],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.ctrlKey && event.key === "`") {
        event.preventDefault();
        setState({ devConsoleOpen: !devStore.get().devConsoleOpen });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setState]);

  function println(line: Line) {
    if (line.kind === "clear") {
      setLines([]);
      return;
    }
    setLines((previous) => [...previous.slice(-80), line]);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const raw = value;
    setValue("");
    setHistory((items) => [...items.slice(-40), raw]);
    setHistoryIndex(null);
    void runCommand(raw, {
      println,
      members: directory ?? [],
      isAdmin: status?.isAdmin ?? false,
      isModerator: status?.isModerator ?? false,
      moderation,
      ban,
      timeout,
      clear,
      setRole,
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (history.length === 0) return;
      const next =
        historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(next);
      setValue(history[next]);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (historyIndex === null) return;
      const next = historyIndex + 1;
      if (next >= history.length) {
        setHistoryIndex(null);
        setValue("");
      } else {
        setHistoryIndex(next);
        setValue(history[next]);
      }
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        data-dev-console=""
        onClick={() => setState({ devConsoleOpen: true })}
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-border/70 bg-card/85 px-3 py-2 text-xs text-muted-foreground backdrop-blur-md transition-colors hover:border-primary/40 hover:text-foreground"
        aria-label="Open the developer console"
        title="Developer console (Ctrl + `)"
      >
        <Terminal className="size-3.5 text-primary" />
        <span className="hidden sm:inline">dev console</span>
      </button>
    );
  }

  return (
    <div
      data-dev-console=""
      className="fixed bottom-4 left-4 z-50 flex h-72 w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border/70 bg-card/95 text-sm backdrop-blur-md"
    >
      <div className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Terminal className="size-3.5 text-primary" />
          dev console
        </div>
        <button
          type="button"
          onClick={() => setState({ devConsoleOpen: false })}
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Close the console"
        >
          <X className="size-4" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-1 overflow-y-auto px-3 py-2 font-mono text-xs leading-5"
      >
        {lines.map((line, index) =>
          line.kind === "input" ? (
            <p key={index} className="text-primary">
              <span className="text-muted-foreground">$ </span>
              {line.text}
            </p>
          ) : line.kind === "error" ? (
            <p key={index} className="text-destructive">
              {line.text}
            </p>
          ) : (
            <p key={index} className="whitespace-pre-wrap text-foreground/80">
              {line.text}
            </p>
          ),
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-border/70 px-3 py-2"
      >
        <span className="font-mono text-xs text-muted-foreground">$</span>
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="type help"
          autoComplete="off"
          spellCheck={false}
          className="w-full bg-transparent font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground"
        />
      </form>
    </div>
  );
}
