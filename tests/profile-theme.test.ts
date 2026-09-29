import { describe, expect, test } from "bun:test";
import {
  AVATAR_EMOJI,
  fallbackEmoji,
  hueFromSeed,
  initialsOf,
} from "../src/lib/avatar";
import { ACCENTS, accentById, accentSwatch, type AccentId } from "../src/lib/theme";
import { isMentioned, mentionNeedles } from "../src/convex/mention";

describe("avatar helpers", () => {
  test("hueFromSeed is stable and always a valid hue", () => {
    for (const seed of ["user-ana", "j57abc123", "", "🦊", "a".repeat(64)]) {
      const hue = hueFromSeed(seed);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
      expect(Number.isInteger(hue)).toBe(true);
      expect(hueFromSeed(seed)).toBe(hue);
    }
  });

  test("different ids get spread around the colour wheel", () => {
    const ids = [
      "j57aaa111",
      "j57bbb222",
      "j57ccc333",
      "j57ddd444",
      "j57eee555",
      "j57fff666",
    ];
    const hues = new Set(ids.map(hueFromSeed));
    expect(hues.size).toBeGreaterThanOrEqual(4);
  });

  test("initialsOf trims, uppercases and copes with blanks", () => {
    expect(initialsOf("Ana Reyes")).toBe("AR");
    expect(initialsOf("  ana  ")).toBe("AN");
    expect(initialsOf("Ana Maria Reyes")).toBe("AM");
    expect(initialsOf("   ")).toBe("??");
    expect(initialsOf("")).toBe("??");
  });

  test("fallbackEmoji always returns one of the offered avatars", () => {
    const options = AVATAR_EMOJI as readonly string[];
    for (const seed of ["j57aaa111", "user-ana", "", "zzz"]) {
      expect(options).toContain(fallbackEmoji(seed));
    }
  });
});

describe("theme presets", () => {
  test("accent ids and hues are unique and in range", () => {
    const ids = ACCENTS.map((accent) => accent.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const accent of ACCENTS) {
      expect(accent.hue).toBeGreaterThanOrEqual(0);
      expect(accent.hue).toBeLessThan(360);
      expect(accent.chroma).toBeGreaterThan(0);
    }
  });

  test("the default accent is the one the CSS ships with", () => {
    expect(accentById("violet").hue).toBe(295);
  });

  test("an unknown accent falls back instead of throwing", () => {
    expect(accentById("nope" as AccentId).id).toBe(ACCENTS[0].id);
  });

  test("accentSwatch emits a usable oklch colour", () => {
    for (const accent of ACCENTS) {
      expect(accentSwatch(accent)).toMatch(/^oklch\(0\.\d+ [\d.]+ \d+\)$/);
    }
  });
});

describe("mention matching", () => {
  test("builds a needle set from the full name and first name", () => {
    expect(mentionNeedles("Ana Reyes", false)).toEqual(["ana reyes", "ana"]);
  });

  test("ignores guests and very short names", () => {
    expect(mentionNeedles("Ana", true)).toEqual([]);
    expect(mentionNeedles("Jo", false)).toEqual([]);
    expect(mentionNeedles("   ", false)).toEqual([]);
  });

  test("matches a mention case-insensitively", () => {
    const needles = mentionNeedles("Ana Reyes", false);
    expect(isMentioned("hey ANA can you play?", needles)).toBe(true);
    expect(isMentioned("Ana Reyes beat my score", needles)).toBe(true);
    expect(isMentioned("nobody here", needles)).toBe(false);
  });

  test("an empty needle set never matches", () => {
    expect(isMentioned("Ana Ana Ana", [])).toBe(false);
  });

  test("matches whole words only, not substrings", () => {
    const ann = mentionNeedles("Ann", false);
    expect(isMentioned("that was so annoying", ann)).toBe(false);
    expect(isMentioned("banana split time", ann)).toBe(false);
    expect(isMentioned("hey ann", ann)).toBe(true);
    expect(isMentioned("Ann, you around?", ann)).toBe(true);
  });
});
