import { useEffect } from "react";
import { devStore, useDevTools } from "@/lib/dev-store";
import { SITE_NAME, TAB_PRESETS, emojiFavicon } from "@/lib/site";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShieldOff, ShieldCheck, Snowflake } from "lucide-react";

/** Keeps snow + panic-cloak in sync with the dev store wherever it's mounted. */
export function SiteEffects() {
  const [state] = useDevTools();

  // Restore cloak state across reloads
  useEffect(() => {
    if (state.panicTab) {
      document.title = state.panicTab.title;
      let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = emojiFavicon(state.panicTab.icon);
    } else {
      document.title = `${SITE_NAME} — Play Free, Unblocked`;
    }
  }, [state.panicTab]);

  // The panic key: Escape always snaps the tab back to a safe disguise
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !state.panicTab) {
        devStore.set({ panicTab: TAB_PRESETS[0] });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.panicTab]);

  return null;
}

function setPanicTab(preset: (typeof TAB_PRESETS)[number] | null) {
  devStore.set({ panicTab: preset });
  if (preset) {
    document.title = preset.title;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
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

/** Quick cloak switcher shown in the header for students. */
export function CloakMenu() {
  const [state, setState] = useDevTools();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-primary/30 bg-card/40 hover:bg-primary/10 hover:text-primary"
        >
          {state.panicTab ? (
            <ShieldCheck className="size-4 text-primary" />
          ) : (
            <ShieldOff className="size-4" />
          )}
          <span className="hidden sm:inline">
            {state.panicTab ? state.panicTab.label : "Cloak"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Disguise tab as
        </DropdownMenuLabel>
        {TAB_PRESETS.map((preset) => (
          <DropdownMenuItem
            key={preset.label}
            onClick={() => setPanicTab(preset)}
            className={
              state.panicTab?.label === preset.label ? "text-primary" : ""
            }
          >
            <span aria-hidden>{preset.icon}</span>
            {preset.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setPanicTab(null)}
          className="text-muted-foreground"
        >
          <ShieldOff />
          Remove disguise
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Small round toggle for the snow droplets, used in the header. */
export function SnowToggle() {
  const [state, setState] = useDevTools();

  return (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label={state.snow ? "Turn snow off" : "Turn snow on"}
      aria-pressed={state.snow}
      onClick={() => setState({ snow: !state.snow })}
      className={
        state.snow
          ? "border-primary/40 text-primary glow-sm"
          : "border-border/60 text-muted-foreground"
      }
    >
      <Snowflake className="size-4" />
    </Button>
  );
}
