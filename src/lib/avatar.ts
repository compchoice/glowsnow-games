/**
 * Avatar helpers. A member can pick an emoji avatar; without one we fall back
 * to their initials on a deterministic colour derived from their id, so
 * everybody still looks distinct.
 */

export const AVATAR_EMOJI = [
  "🦊",
  "🐙",
  "🐼",
  "🐸",
  "🦉",
  "🐝",
  "🦄",
  "🐳",
  "🦁",
  "🐧",
  "🦖",
  "🐢",
  "🌵",
  "🍄",
  "⚡",
  "🔥",
  "❄️",
  "🌟",
  "🚀",
  "🎧",
  "🎮",
  "🏆",
  "👾",
  "🤖",
] as const;

/** Stable 0–359 hue for a seed string. */
export function hueFromSeed(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 360;
  }
  return hash;
}

/** The two letters shown when no emoji avatar is set. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

/** The emoji we show for someone who never picked one. */
export function fallbackEmoji(seed: string): string {
  return AVATAR_EMOJI[hueFromSeed(seed) % AVATAR_EMOJI.length];
}
