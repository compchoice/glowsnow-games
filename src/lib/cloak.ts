import { devStore } from "@/lib/dev-store";
import { setFavicon } from "@/lib/favicon";
import { BASE_TITLE, type TabPreset, emojiFavicon } from "@/lib/site";

/**
 * Cloaking helpers. They live outside the component modules so the React Fast
 * Refresh boundary stays component-only.
 */

/**
 * Applies a cloak preset to the tab title and favicon. `null` restores both,
 * using `fallbackIcon` for the icon so the accent snowflake comes back rather
 * than the old static logo.
 */
export function applyCloak(preset: TabPreset | null, fallbackIcon?: string) {
  if (preset) {
    document.title = preset.title;
    setFavicon(emojiFavicon(preset.icon));
    return;
  }

  document.title = BASE_TITLE;
  setFavicon(fallbackIcon ?? "/logo.svg");
}

/** Stores the cloak and applies it immediately. */
export function setCloak(preset: TabPreset | null) {
  devStore.set({ panicTab: preset });
  applyCloak(preset);
}
