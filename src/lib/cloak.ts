import { devStore } from "@/lib/dev-store";
import { BASE_TITLE, type TabPreset, emojiFavicon } from "@/lib/site";

/**
 * Cloaking helpers. They live outside the component modules so the React Fast
 * Refresh boundary stays component-only.
 */

/** Applies a cloak preset to the tab title and favicon (null restores both). */
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

/** Stores the cloak and applies it immediately. */
export function setCloak(preset: TabPreset | null) {
  devStore.set({ panicTab: preset });
  applyCloak(preset);
}
