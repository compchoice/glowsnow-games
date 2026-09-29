/**
 * Duration parsing for moderation timeouts. Kept as a plain module (no Convex
 * imports) so the rules can be unit tested directly and reused by the client
 * console and the server-side moderation checks.
 */

const UNITS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

const UNIT_ORDER: [string, number][] = [
  ["w", UNITS.w],
  ["d", UNITS.d],
  ["h", UNITS.h],
  ["m", UNITS.m],
  ["s", UNITS.s],
];

/**
 * Parses "30s", "10m", "2h", "1d30m", "1w" or a bare number of seconds into
 * milliseconds. Returns null when the input is not a duration at all, so callers
 * can tell "no duration given" from "0 seconds".
 */
export function parseDuration(input: string): number | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;

  // A bare number means seconds: "ban-ish 60" is a minute, not sixty minutes.
  if (/^\d+$/.test(text)) {
    const seconds = Number(text);
    return seconds > 0 ? seconds * 1_000 : null;
  }

  let total = 0;
  let matched = false;
  for (const match of text.matchAll(/(\d+)\s*(s|m|h|d|w)/g)) {
    total += Number(match[1]) * UNITS[match[2]];
    matched = true;
  }
  if (!matched || total <= 0) return null;

  // "10m nonsense" is a typo, not a duration — reject it instead of quietly
  // accepting the part that happened to parse.
  const leftover = text.replace(/(\d+)\s*(s|m|h|d|w)/g, "").replace(/[\s+]/g, "");
  return leftover.length > 0 ? null : total;
}

/** Renders milliseconds back as "1d 2h 30m", dropping empty units. */
export function describeDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0s";
  let rest = Math.floor(ms);
  const parts: string[] = [];
  for (const [label, size] of UNIT_ORDER) {
    const amount = Math.floor(rest / size);
    if (amount > 0) {
      parts.push(`${amount}${label}`);
      rest -= amount * size;
    }
  }
  return parts.length > 0 ? parts.join(" ") : "0s";
}

/** How long a timeout has left, phrased for an error message. */
export function timeLeft(until: number, now: number = Date.now()): string {
  return describeDuration(until - now);
}
