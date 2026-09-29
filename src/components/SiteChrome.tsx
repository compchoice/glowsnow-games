import { useEffect } from "react";
import { devStore, useDevTools } from "@/lib/dev-store";
import { applyCloak, setCloak } from "@/lib/cloak";
import { snowflakeFavicon } from "@/lib/favicon";
import { accentById, useTheme } from "@/lib/theme";
import { TAB_PRESETS } from "@/lib/site";

/**
 * Anything that legitimately owns the Escape key: Radix menus, selects,
 * dialogs and alert dialogs, plus our own developer console. While one of these
 * is mounted, Escape means "close me" and must not also fire the panic key.
 */
const ESCAPE_OWNERS =
  "[role='alertdialog'],[role='dialog'],[role='menu'],[role='listbox']," +
  "[data-radix-popper-content-wrapper],[data-dev-console]";

/** Keeps the cloaked tab title in sync across reloads and route changes. */
export function SiteEffects() {
  const [state] = useDevTools();
  const [theme] = useTheme();

  // The tab icon is a snowflake in the current accent, so it tracks the accent
  // picker. applyCloak runs last and wins whenever a disguise is active.
  const icon = snowflakeFavicon(accentById(theme.accent).hue, theme.mode);

  useEffect(() => {
    applyCloak(state.panicTab, icon);
  }, [state.panicTab, icon]);

  // The panic key: Escape disguises the tab instantly.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      // Someone already handled it, or an open menu/dialog/console is about to.
      if (event.defaultPrevented) return;
      if (document.querySelector(ESCAPE_OWNERS)) return;
      if (devStore.get().panicTab) return;
      setCloak(TAB_PRESETS[0]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return null;
}/** Small label used across pages for section eyebrows. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
      {children}
    </p>
  );
}
