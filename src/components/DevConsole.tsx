import { useEffect, useRef, useState } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { devStore, useDevTools } from "@/lib/dev-store";
import { setCloak } from "@/lib/cloak";
import { COMMAND_GROUPS, commandLine, commandsIn } from "@/lib/dev-commands";
import { achievementByKey } from "@/lib/engagement";
import { ACCENTS, FONTS, WALLPAPERS, themeStore } from "@/lib/theme";
import { onConsoleCommand } from "@/lib/console-bridge";
import { findMember, searchMembers, type MemberLike } from "@/lib/members";
import { describeDuration, parseDuration } from "@/convex/duration";
import { SITE_NAME, TAB_PRESETS } from "@/lib/site";
import { Terminal, X } from "lucide-react";

const ROLES = ["member", "user", "moderator", "admin"] as const;
type RoleName = (typeof ROLES)[number];

/** Shapes the informational commands read, mirrored from their queries. */
type AuditEntry = { actorName: string; action: string; detail: string | null };
type PresenceInfo = { onlineCount: number; online: { name: string }[] };
type LeaderboardRow = {
  rank: number;
  name: string;
  points: number;
  badges: number;
};
type MineBadges = { earned: string[]; points: number };
type RoomInfo = { readonly id: string; readonly label: string; readonly topic: string };
/** The channel list is a compile-time constant upstream, so it arrives frozen. */
type RoomList = readonly RoomInfo[];
type SearchHit = { kind: string; title: string; detail: string; href: string };

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
  kick: (args: {
    userId: Id<"users">;
    durationMs?: number;
    reason?: string;
  }) => Promise<unknown>;
  timeout: (args: {
    userId: Id<"users">;
    durationMs: number;
    reason?: string;
  }) => Promise<unknown>;
  clear: (args: { userId: Id<"users"> }) => Promise<unknown>;
  setRole: (args: { userId: Id<"users">; role: RoleName }) => Promise<unknown>;
  setAnnouncement: (args: {
    message: string;
    linkTo?: string;
    linkLabel?: string;
  }) => Promise<unknown>;
  clearAnnouncement: (args: Record<string, never>) => Promise<unknown>;
  /**
   * Read-only data for the informational commands. Held in one object so the
   * mutation surface above stays readable, and so it is obvious which fields
   * are a snapshot the server pushed rather than something the console did.
   */
  info: {
    audit: AuditEntry[] | undefined;
    online: PresenceInfo | undefined;
    leaderboard: LeaderboardRow[] | undefined;
    badges: MineBadges | undefined;
    rooms: RoomList | undefined;
  };
  /** Anything the site search can find. */
  search: (args: { query: string }) => Promise<
    { hits: SearchHit[] } | undefined
  >;
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
      for (const group of COMMAND_GROUPS) {
        const commands = commandsIn(group.id);
        if (commands.length === 0) continue;
        println({ kind: "output", text: `  ${group.label}` });
        for (const command of commands) {
          println({
            kind: "output",
            text: `    ${commandLine(command)} — ${command.desc}`,
          });
        }
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

    case "kick": {
      if (!ctx.isModerator) {
        println({ kind: "error", text: "You need moderator access to do that." });
        break;
      }
      // `kick ana` is the one-hour default; `kick ana 2h` says how long.
      const durationText = args[1];
      const member = needMember(args[0]);
      if (!member) {
        if (!args[0]) println({ kind: "error", text: "Usage: kick <member> [duration] [reason]" });
        break;
      }
      const ms = durationText ? parseDuration(durationText) : null;
      if (durationText && ms === null) {
        println({ kind: "error", text: "Give a duration like 10m, 2h, 1d or 1w." });
        break;
      }
      const reason = args[1] ? args.slice(2).join(" ") : args.slice(1).join(" ");
      try {
        const result = (await ctx.kick({
          userId: member._id as Id<"users">,
          durationMs: ms ?? undefined,
          reason: reason || undefined,
        })) as { label?: string } | null;
        println({
          kind: "output",
          text: `Kicked ${member.name} — back in ${result?.label ?? "an hour"}.`,
        });
      } catch (error) {
        println({ kind: "error", text: describeError(error, "Could not kick that member.") });
      }
      break;
    }

    case "ban": {
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

    case "announce": {
      if (!ctx.isAdmin) {
        println({ kind: "error", text: "Only the owner can post an announcement." });
        break;
      }
      const message = args.join(" ");
      if (!message) {
        println({ kind: "error", text: "Usage: announce <message>" });
        break;
      }
      try {
        await ctx.setAnnouncement({ message });
        println({ kind: "output", text: "Announcement posted to the home page." });
      } catch (error) {
        println({ kind: "error", text: describeError(error, "Could not post that.") });
      }
      break;
    }

    case "unannounce": {
      if (!ctx.isAdmin) {
        println({ kind: "error", text: "Only the owner can take an announcement down." });
        break;
      }
      try {
        await ctx.clearAnnouncement({});
        println({
          kind: "output",
          text: "Announcement taken down. The home page falls back to its own message.",
        });
      } catch (error) {
        println({
          kind: "error",
          text: describeError(error, "Could not take it down."),
        });
      }
      break;
    }

    case "audit": {
      if (!ctx.isModerator) {
        println({ kind: "error", text: "You need moderator access to do that." });
        break;
      }
      const rows = ctx.info.audit ?? [];
      if (rows.length === 0) {
        println({ kind: "output", text: "No staff actions recorded yet." });
        break;
      }
      for (const row of rows.slice(0, 15)) {
        println({
          kind: "output",
          text: `  ${row.actorName} · ${row.action}${row.detail ? ` · ${row.detail}` : ""}`,
        });
      }
      break;
    }

    case "rooms":
    case "channels": {
      for (const room of ctx.info.rooms ?? []) {
        println({ kind: "output", text: `  #${room.id} — ${room.topic}` });
      }
      break;
    }

    case "online": {
      const people = ctx.info.online?.online ?? [];
      println({
        kind: "output",
        text: `${ctx.info.online?.onlineCount ?? 0} in chat right now.`,
      });
      for (const person of people.slice(0, 15)) {
        println({ kind: "output", text: `  ${person.name}` });
      }
      break;
    }

    case "rank":
    case "leaderboard": {
      const rows = ctx.info.leaderboard ?? [];
      if (rows.length === 0) {
        println({ kind: "output", text: "Nobody has earned a badge yet." });
        break;
      }
      for (const row of rows.slice(0, 10)) {
        println({
          kind: "output",
          text: `  ${row.rank}. ${row.name} — ${row.points} pts (${row.badges})`,
        });
      }
      break;
    }

    case "badges": {
      const earned = ctx.info.badges?.earned ?? [];
      if (earned.length === 0) {
        println({
          kind: "output",
          text: "No badges yet. Post in chat, save a game, or vote in a poll.",
        });
        break;
      }
      println({ kind: "output", text: `You have ${ctx.info.badges?.points ?? 0} points:` });
      for (const key of earned) {
        const badge = achievementByKey(key);
        if (badge) {
          println({ kind: "output", text: `  ${badge.emoji} ${badge.title} (${badge.points})` });
        }
      }
      break;
    }

    case "find":
    case "search": {
      const query = args.join(" ");
      if (!query) {
        println({ kind: "error", text: "Usage: search <words>" });
        break;
      }
      try {
        const result = await ctx.search({ query });
        const hits = result?.hits ?? [];
        if (hits.length === 0) {
          println({ kind: "output", text: `Nothing matched “${query}”.` });
          break;
        }
        for (const hit of hits.slice(0, 10)) {
          println({ kind: "output", text: `  ${hit.kind} · ${hit.title} — ${hit.href}` });
        }
      } catch (error) {
        println({ kind: "error", text: describeError(error, "Search failed.") });
      }
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
  const kick = useMutation(api.moderation.kick);
  const timeout = useMutation(api.moderation.timeout);
  const clear = useMutation(api.moderation.clear);
  const setRole = useMutation(api.users.setRole);
  const setAnnouncement = useMutation(api.announcements.set);
  const clearAnnouncement = useMutation(api.announcements.clear);

  // Read-only data for the new informational commands. Staff-only queries are
  // skipped rather than fetched, so a member never triggers a rejected query.
  const audit = useQuery(
    api.reports.audit,
    status?.isModerator ? {} : "skip",
  );
  const online = useQuery(api.chat.presence, open ? {} : "skip");
  const leaderboard = useQuery(
    api.achievements.leaderboard,
    open ? {} : "skip",
  );
  const badges = useQuery(
    api.achievements.mine,
    open && status?.signedIn ? {} : "skip",
  );
  const rooms = useQuery(api.chat.channels, open ? {} : "skip");
  // Search is a one-off, typed command rather than a live subscription, so it
  // runs through the client instead of holding a query open.
  const convex = useConvex();

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
      info: { audit, online, leaderboard, badges, rooms },
      search: (args) => convex.query(api.search.all, args),
      isAdmin: status?.isAdmin ?? false,
      isModerator: status?.isModerator ?? false,
      moderation,
      ban,
      kick,
      timeout,
      clear,
      setRole,
      setAnnouncement,
      clearAnnouncement,
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

  // The console is a staff tool. Members and guests get no button, no Ctrl + `
  // shortcut, and no keyboard listener, because the whole component unmounts.
  // Checked here, after every hook, so a role change can never break the order.
  if (!status?.isModerator) return null;

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
