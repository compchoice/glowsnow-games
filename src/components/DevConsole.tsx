import { useEffect, useRef, useState } from "react";
import { devStore, useDevTools } from "@/lib/dev-store";
import { setCloak } from "@/components/SiteChrome";
import { SITE_NAME, TAB_PRESETS } from "@/lib/site";
import { Terminal, X } from "lucide-react";

export type CommandSpec = {
  cmd: string;
  args?: string;
  desc: string;
};

export const DEV_COMMANDS: CommandSpec[] = [
  { cmd: "snow", args: "on | off", desc: "turn the droplets on or off" },
  { cmd: "cloak", args: "preset | off", desc: "disguise the tab as schoolwork" },
  { cmd: "status", desc: "show what the console is set to right now" },
  { cmd: "clear", desc: "wipe the console output" },
  { cmd: "exit", desc: "close the console" },
];

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

function runCommand(raw: string, println: (line: Line) => void) {
  const input = raw.trim();
  if (!input) return;
  println({ kind: "input", text: input });

  const [cmd, ...rest] = input.toLowerCase().split(/\s+/);
  const arg = rest.join(" ");

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

    case "snow":
      if (arg === "on" || arg === "off") {
        devStore.set({ snow: arg === "on" });
        println({ kind: "output", text: `Snow droplets ${arg}.` });
      } else {
        println({ kind: "error", text: "Usage: snow on | snow off" });
      }
      break;

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

    case "status": {
      const state = devStore.get();
      println({
        kind: "output",
        text: `site=${SITE_NAME} · snow=${state.snow ? "on" : "off"} · disguise=${state.panicTab ? state.panicTab.label : "off"}`,
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

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
    runCommand(raw, println);
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
    <div className="fixed bottom-4 left-4 z-50 flex h-72 w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border/70 bg-card/95 text-sm backdrop-blur-md">
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
