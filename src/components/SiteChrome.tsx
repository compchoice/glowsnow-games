import { useEffect } from "react";
import { devStore, useDevTools } from "@/lib/dev-store";
import { BASE_TITLE, TAB_PRESETS, type TabPreset, emojiFavicon } from "@/lib/site";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, EyeOff, Snowflake } from "lucide-react";

/** Applies the cloak (tab title + favicon) wherever it changes. */
export function applyCloak(preset: TabPreset | null) {
  if (preset) {
    document.title = preset.title;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = emojiFavicon(preset.icon);
    return;
  }

  document.title = BASE_TITLE;
  const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (link) link.href = "/logo.svg";
}

export function setCloak(preset: TabPreset | null) {
  devStore.set({ panicTab: preset });
  applyCloak(preset);
}

/** Keeps the cloaked tab title in sync across reloads and route changes. */
export function SiteEffects() {
  const [state] = useDevTools();

  useEffect(() => {
    applyCloak(state.panicTab);
  }, [state.panicTab]);

  // The panic key: Escape disguises the tab instantly.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !devStore.get().panicTab) {
        setCloak(TAB_PRESETS[0]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return null;
}

/** Quick disguise switcher, available to every visitor. */
export function CloakMenu() {
  const [state] = useDevTools();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-border/70 bg-card/60 text-muted-foreground hover:text-foreground"
        >
          <EyeOff className="size-4" />
          <span className="hidden sm:inline">
            {state.panicTab ? state.panicTab.label : "Disguise"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Show this tab as
        </DropdownMenuLabel>
        {TAB_PRESETS.map((preset) => (
          <DropdownMenuItem
            key={preset.label}
            onClick={() => setCloak(preset)}
            className="gap-2"
          >
            <span aria-hidden>{preset.icon}</span>
            <span className="flex-1">{preset.label}</span>
            {state.panicTab?.label === preset.label && (
              <Check className="size-3.5 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setCloak(null)}>
          Remove disguise
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Snow droplet toggle. */
export function SnowToggle() {
  const [state, setState] = useDevTools();

  return (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label={state.snow ? "Turn the snow off" : "Turn the snow on"}
      aria-pressed={state.snow}
      onClick={() => setState({ snow: !state.snow })}
      className={
        state.snow
          ? "border-primary/40 text-primary"
          : "border-border/70 text-muted-foreground"
      }
    >
      <Snowflake className="size-4" />
    </Button>
  );
}

/** Small label used across pages for section eyebrows. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
      {children}
    </p>
  );
}
