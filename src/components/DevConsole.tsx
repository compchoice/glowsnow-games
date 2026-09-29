import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { devStore, useDevTools } from "@/lib/dev-store";
import { SITE_NAME, TAB_PRESETS, emojiFavicon } from "@/lib/site";
import { Terminal, X } from "lucide-react";

type CommandSpec = {
  cmd: string;
  args?: string;
  desc: string;
  usage: string;
};

export const DEV_COMMANDS: CommandSpec[] = [
  {
    cmd: "help",
    desc: "show every developer command",
    usage: "help",
  },
  {
    cmd: "snow",
    args: "on|off",
    desc: "toggle the purple snow droplets",
    usage: "snow on",
  },
  {
    cmd: "cloak",
    args: "preset|off",
    desc: "disguise the tab as schoolwork (panic cloak)",
    usage: "cloak google classroom",
  },
  {
    cmd: "status",
    desc: "show current dev settings",
    usage: "status",
  },
  {
    cmd: "clear",
    desc: "clear this console",
    usage: "clear",
  },
  {
    cmd: "exit",
    desc: "close the console",
    usage: "exit",
  },
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

function setPanicTab(preset: (typeof TAB_PRESETS)[number] | null) {
  devStore.set({ panicTab: preset });
  if (preset) {
    document.title = preset.title;
    let link = document.querySelector<HTMLLinkElement>(
      "link[rel='icon']",
    );
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = emojiFavicon(preset.icon);
  } else {
    document.title = `${SITE_NAME} — Play Free, Unblocked`;
    const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (link) link.href = "/logo.svg";
  }
}

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
        const args = spec.args ? ` ${spec.args}` : "";
        println({ kind: "output", text: `  ${spec.cmd}${args} — ${spec.desc}` });
      }
      break;

    case "snow": {
      if (arg === "on" || arg === "off") {
        devStore.set({ snow: arg === "on" });
        println({ kind: "output", text: `Snow droplets ${arg}.` });
      } else {
        println({ kind: "error", text: "Usage: snow on|off" });
      }
      break;
    }

    case "cloak": {
      if (arg === "off" || arg === "none") {
        setPanicTab(null);
        println({ kind: "output", text: "Panic cloak off. Real title restored." });
      } else if (arg) {
        const idx = CLOAK_ALIASES[arg];
        if (idx === undefined) {
          println({
            kind: "error",
            text: `Unknown preset "${arg}". Try: ${TAB_PRESETS.map((p) => p.label.toLowerCase()).join(", ")}, or off.`,
          });
        } else {
          const preset = TAB_PRESETS[idx];
          setPanicTab(preset);
          println({
            kind: "output",
            text: `Tab cloaked as "${preset.title}" ${preset.icon}`,
          });
        }
      } else {
        println({ kind: "error", text: "Usage: cloak <preset|off>" });
      }
      break;
    }

    case "status": {
      const state = devStore.get();
      println({
        kind: "output",
        text: `snow=${state.snow ? "on" : "off"} · cloak=${state.panicTab ? state.panicTab.label : "off"} · site=${SITE_NAME}`,
      });
      break;
    }

    case "clear":
      println({ kind: "clear", text: "" });
      break;

    case "exit":
      println({ kind: "output", text: "Bye, dev." });
      devStore.set({ devConsoleOpen: false });
      break;

    default:
      println({ kind: "error", text: `Unknown command: ${cmd}. Type "help".` });
  }
}

export function DevConsole() {
  const [state, setState] = useDevTools();
  const [lines, setLines] = useState<Line[]>([
    { kind: "output", text: `${SITE_NAME} dev console. Type "help" for commands.` },
  ]);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number | null>(null);
  const [hintDismissed, setHintDismissed] = useState(false);
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

  // Owner-only summon: Ctrl + ` (backtick)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
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
    setLines((prev) => [...prev.slice(-80), line]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = value;
    setValue("");
    setHistory((h) => [...h.slice(-40), raw]);
    setHistoryIdx(null);
    runCommand(raw, println);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const next = historyIdx === null ? history.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(next);
      setValue(history[next]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx === null) return;
      const next = historyIdx + 1;
      if (next >= history.length) {
        setHistoryIdx(null);
        setValue("");
      } else {
        setHistoryIdx(next);
        setValue(history[next]);
      }
    }
  }

  if (!state.ownerMode && !open) {
    return (
      <button
        type="button"
        onClick={() => setState({ ownerMode: true, devConsoleOpen: true })}
        className="fixed bottom-4 left-4 z-50 flex size-11 items-center justify-center rounded-full bg-card/80 ring-glow text-primary/90 backdrop-blur-md transition hover:text-primary"
        aria-label="Open developer console"
        title="Developer console (Ctrl + `)"
      >
        <Terminal className="size-5" />
      </button>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setState({ devConsoleOpen: true })}
        className="fixed bottom-4 left-4 z-50 flex size-11 items-center justify-center rounded-full bg-card/80 ring-glow text-primary/90 backdrop-blur-md transition hover:text-primary"
        aria-label="Open developer console"
        title="Developer console (Ctrl + `)"
      >
        <Terminal className="size-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex h-80 w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-primary/40 bg-[oklch(0.13_0.04_293_/_0.92)] text-sm shadow-2xl backdrop-blur-xl glow-md">
      <div className="flex items-center justify-between border-b border-primary/25 bg-primary/10 px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-primary">
          <Terminal className="size-3.5" />
          dev console
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary/80">
            owner
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-primary/70 hover:text-primary"
          onClick={() => setState({ devConsoleOpen: false })}
          aria-label="Close console"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto px-3 py-2 font-mono text-xs leading-5">
        {lines.map((line, i) =>
          line.kind === "input" ? (
            <p key={i} className="text-primary/90">
              <span className="text-primary/50">~$ </span>
              {line.text}
            </p>
          ) : line.kind === "error" ? (
            <p key={i} className="text-red-300/90">
              {line.text}
            </p>
          ) : (
            <p key={i} className="whitespace-pre-wrap text-foreground/80">
              {line.text}
            </p>
          ),
        )}
        {lines.length > 0 && lines[lines.length - 1].kind === "output" && (
          <p className="text-foreground/40">
            {"\u00A0"}
            <span className="animate-blink-caret">▍</span>
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-primary/25 bg-primary/5 px-3 py-2">
        <span className="font-mono text-xs text-primary/60">~$</span>
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='type "help"'
          className="h-7 border-none bg-transparent px-0 font-mono text-xs shadow-none focus-visible:ring-0"
          autoComplete="off"
          spellCheck={false}
        />
      </form>

      {!hintDismissed && (
        <div className="flex items-center justify-between border-t border-primary/20 px-3 py-1.5 text-[10px] text-muted-foreground">
          <span>
            commands: snow · cloak · status · clear · exit — summon with Ctrl + `
          </span>
          <button
            type="button"
            className="underline decoration-dotted hover:text-primary"
            onClick={() => setHintDismissed(true)}
          >
            hide
          </button>
        </div>
      )}
    </div>
  );
}
