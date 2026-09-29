import { useEffect, useState } from "react";

/**
 * Theme customization: one accent hue drives the whole palette, plus a
 * light/dark switch. Both live in localStorage and are applied to
 * `<html data-accent="…" class="dark?">` so the CSS variables in index.css
 * do the actual work.
 */

export type AccentId =
  | "violet"
  | "azure"
  | "cyan"
  | "emerald"
  | "amber"
  | "rose";

export type ThemeMode = "dark" | "light";

export type ThemeState = {
  accent: AccentId;
  mode: ThemeMode;
};

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

export const THEME_STORAGE_KEY = "dexactive:theme";
const DEFAULT_THEME: ThemeState = { accent: "violet", mode: "dark" };

function readInitial(): ThemeState {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return DEFAULT_THEME;
    const parsed = JSON.parse(raw) as Partial<ThemeState>;
    const accent = ACCENTS.some((entry) => entry.id === parsed.accent)
      ? (parsed.accent as AccentId)
      : DEFAULT_THEME.accent;
    const mode: ThemeMode = parsed.mode === "light" ? "light" : "dark";
    return { accent, mode };
  } catch {
    return DEFAULT_THEME;
  }
}

let state: ThemeState = readInitial();
const listeners = new Set<(next: ThemeState) => void>();

/** Pushes the theme onto the document root. */
export function applyTheme(next: ThemeState) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.accent = next.accent;
  root.classList.toggle("dark", next.mode === "dark");
  root.style.colorScheme = next.mode;
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
};

/** React hook over the theme store. */
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
