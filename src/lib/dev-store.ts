import { useEffect, useState } from "react";

export type DevToolsState = {
  /** Developer console panel open */
  devConsoleOpen: boolean;
  /** Snow droplets visible */
  snow: boolean;
  /** Active cloak tab, or null when off */
  panicTab: { label: string; icon: string; title: string } | null;
};

const STORAGE_KEY = "snowvault:dev";
const DEFAULT_STATE: DevToolsState = {
  devConsoleOpen: false,
  snow: true,
  panicTab: null,
};

let state: DevToolsState = readInitial();
const listeners = new Set<(s: DevToolsState) => void>();

function readInitial(): DevToolsState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  // The open/closed panel state is session-only, never persisted
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    // The open/closed panel state is session-only, so it is never restored.
    const parsed = JSON.parse(raw) as Partial<DevToolsState>;
    return {
      devConsoleOpen: false,
      snow: parsed.snow ?? DEFAULT_STATE.snow,
      panicTab: parsed.panicTab ?? DEFAULT_STATE.panicTab,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function setState(patch: Partial<DevToolsState>) {
  state = { ...state, ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — keep in-memory state */
  }
  listeners.forEach((listener) => listener(state));
}

export const devStore = {
  get: () => state,
  set: setState,
};

/** React hook over the dev store (keeps every consumer in sync). */
export function useDevTools(): [
  DevToolsState,
  (patch: Partial<DevToolsState>) => void,
] {
  const [snapshot, setSnapshot] = useState<DevToolsState>(state);
  useEffect(() => {
    const listener = (next: DevToolsState) => setSnapshot(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return [snapshot, setState];
}
