import { useEffect, useState } from "react";

/**
 * Personal appearance settings. Everything here is client-side only: it lives in
 * this visitor's localStorage and is applied to the document root, so nobody
 * else's view changes and no account is required.
 */

export type AccentId =
  | "violet"
  | "azure"
  | "cyan"
  | "emerald"
  | "amber"
  | "rose";

export type ThemeMode = "dark" | "light";
export type FontId = "outfit" | "system" | "serif" | "mono";
export type WallpaperId = "none" | "grid" | "dots" | "aurora" | "glow" | "custom";

type Accent = {
  id: AccentId;
  label: string;
  hue: number;
  /** Hues that read poorly as a page accent get a deeper, calmer chroma. */
  chroma: number;
};

export const ACCENTS: Accent[] = [
  { id: "violet", label: "Violet", hue: 295, chroma: 0.17 },
  { id: "azure", label: "Azure", hue: 252, chroma: 0.16 },
  { id: "cyan", label: "Cyan", hue: 205, chroma: 0.14 },
  { id: "emerald", label: "Emerald", hue: 158, chroma: 0.14 },
  { id: "amber", label: "Amber", hue: 78, chroma: 0.15 },
  { id: "rose", label: "Rose", hue: 12, chroma: 0.17 },
];

export function accentById(id: AccentId): Accent {
  return ACCENTS.find((accent) => accent.id === id) ?? ACCENTS[0];
}

/** A dot for the picker, always readable regardless of the active mode. */
export function accentSwatch(accent: Accent): string {
  return `oklch(0.66 ${accent.chroma} ${accent.hue})`;
}

/** Only stacks that resolve without pulling another webfont are offered. */
export type Font = { id: FontId; label: string; stack: string };

export const FONTS: Font[] = [
  {
    id: "outfit",
    label: "Outfit",
    stack: '"Outfit", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  },
  {
    id: "system",
    label: "System",
    stack: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  {
    id: "serif",
    label: "Serif",
    stack: 'Georgia, Cambria, "Times New Roman", Times, serif',
  },
  {
    id: "mono",
    label: "Mono",
    stack: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  },
];

export function fontById(id: FontId): Font {
  return FONTS.find((font) => font.id === id) ?? FONTS[0];
}

export type Wallpaper = { id: WallpaperId; label: string; hint: string };

export const WALLPAPERS: Wallpaper[] = [
  { id: "none", label: "Plain", hint: "Just the colour" },
  { id: "grid", label: "Grid", hint: "Faint lines" },
  { id: "dots", label: "Dots", hint: "Dot matrix" },
  { id: "aurora", label: "Aurora", hint: "Soft colour wash" },
  { id: "glow", label: "Vignette", hint: "Darkened edges" },
  { id: "custom", label: "Your image", hint: "Any picture URL" },
];

export type ThemeState = {
  accent: AccentId;
  mode: ThemeMode;
  font: FontId;
  wallpaper: WallpaperId;
  /** Picture URL for the "Your image" wallpaper, stored only in this browser. */
  wallpaperUrl: string;
  snow: boolean;
};

export const THEME_STORAGE_KEY = "dexactive:theme";
/** Where the snow toggle lived before it moved into Settings. */
const LEGACY_DEV_KEY = "snowvault:dev";

const DEFAULT_THEME: ThemeState = {
  accent: "violet",
  mode: "dark",
  font: "outfit",
  wallpaper: "none",
  wallpaperUrl: "",
  snow: true,
};

/**
 * A wallpaper URL is injected into CSS, so only plain http(s) or site-relative
 * images are allowed. `data:` and `javascript:` never make it through, and
 * quotes are escaped so the value cannot break out of the url() token.
 */
export function isValidWallpaperUrl(raw: string): boolean {
  const value = raw.trim();
  if (!value) return false;
  return /^https?:\/\/\S+$/i.test(value) || value.startsWith("/");
}

function safeCssUrl(raw: string): string {
  const value = raw.trim();
  if (!isValidWallpaperUrl(value)) return "";
  return value.replace(/["'()\\<>]/g, (char) => encodeURIComponent(char));
}

function readInitial(): ThemeState {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<ThemeState>) : {};

    // Carry the old snow toggle across so nobody loses their setting.
    let snow = DEFAULT_THEME.snow;
    try {
      const legacyRaw = window.localStorage.getItem(LEGACY_DEV_KEY);
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw) as { snow?: boolean };
        if (typeof legacy.snow === "boolean") snow = legacy.snow;
      }
    } catch {
      /* a corrupt legacy blob is not worth failing the whole read over */
    }

    return {
      accent: ACCENTS.some((entry) => entry.id === parsed.accent)
        ? (parsed.accent as AccentId)
        : DEFAULT_THEME.accent,
      mode: parsed.mode === "light" ? "light" : "dark",
      font: FONTS.some((entry) => entry.id === parsed.font)
        ? (parsed.font as FontId)
        : DEFAULT_THEME.font,
      wallpaper: WALLPAPERS.some((entry) => entry.id === parsed.wallpaper)
        ? (parsed.wallpaper as WallpaperId)
        : DEFAULT_THEME.wallpaper,
      wallpaperUrl: isValidWallpaperUrl(parsed.wallpaperUrl ?? "")
        ? parsed.wallpaperUrl!.trim()
        : DEFAULT_THEME.wallpaperUrl,
      snow,
    };
  } catch {
    return DEFAULT_THEME;
  }
}

let state: ThemeState = readInitial();
const listeners = new Set<(next: ThemeState) => void>();

/** Pushes every appearance choice onto the document root. */
export function applyTheme(next: ThemeState) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.accent = next.accent;
  root.dataset.font = next.font;
  root.dataset.wallpaper = next.wallpaper;
  root.classList.toggle("dark", next.mode === "dark");
  root.style.colorScheme = next.mode;
  root.style.setProperty("--wallpaper-image", safeCssUrl(next.wallpaperUrl));
}

// Applied at import time so the first paint already has the right palette.
applyTheme(state);

function setState(patch: Partial<ThemeState>) {
  state = { ...state, ...patch };
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — keep in-memory state */
  }
  applyTheme(state);
  listeners.forEach((listener) => listener(state));
}

export const themeStore = {
  get: () => state,
  set: setState,
  /** Back to the shipped look. */
  reset: () => setState(DEFAULT_THEME),
};

/** React hook over the appearance store. */
export function useTheme(): [ThemeState, (patch: Partial<ThemeState>) => void] {
  const [snapshot, setSnapshot] = useState<ThemeState>(state);
  useEffect(() => {
    const listener = (next: ThemeState) => setSnapshot(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return [snapshot, setState];
}
