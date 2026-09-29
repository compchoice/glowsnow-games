import { describe, expect, test } from "bun:test";
import {
  describeDuration,
  parseDuration,
  timeLeft,
} from "../src/convex/duration";
import { findMember, searchMembers } from "../src/lib/members";

describe("parseDuration", () => {
  test("reads single units", () => {
    expect(parseDuration("30s")).toBe(30_000);
    expect(parseDuration("10m")).toBe(600_000);
    expect(parseDuration("2h")).toBe(7_200_000);
    expect(parseDuration("1d")).toBe(86_400_000);
    expect(parseDuration("1w")).toBe(604_800_000);
  });

  test("reads compound durations", () => {
    expect(parseDuration("1d30m")).toBe(86_400_000 + 1_800_000);
    expect(parseDuration("1h 15m")).toBe(4_500_000);
  });

  test("treats a bare number as seconds", () => {
    expect(parseDuration("60")).toBe(60_000);
    expect(parseDuration(" 90 ")).toBe(90_000);
  });

  test("is case and space insensitive", () => {
    expect(parseDuration("10M")).toBe(600_000);
    expect(parseDuration("10 m")).toBe(600_000);
  });

  test("rejects anything that is not a duration", () => {
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("soon")).toBeNull();
    expect(parseDuration("0")).toBeNull();
    expect(parseDuration("0m")).toBeNull();
    expect(parseDuration("-5m")).toBeNull();
    expect(parseDuration("10x")).toBeNull();
  });

  test("rejects a duration with trailing junk instead of half-reading it", () => {
    expect(parseDuration("10m nonsense")).toBeNull();
    expect(parseDuration("1h later")).toBeNull();
  });
});

describe("describeDuration", () => {
  test("renders each unit", () => {
    expect(describeDuration(30_000)).toBe("30s");
    expect(describeDuration(600_000)).toBe("10m");
    expect(describeDuration(7_200_000)).toBe("2h");
  });

  test("drops empty units and keeps the largest first", () => {
    expect(describeDuration(86_400_000 + 1_800_000)).toBe("1d 30m");
    expect(describeDuration(3_600_000 + 60_000)).toBe("1h 1m");
  });

  test("never renders a negative or empty duration", () => {
    expect(describeDuration(0)).toBe("0s");
    expect(describeDuration(-1)).toBe("0s");
    expect(describeDuration(Number.NaN)).toBe("0s");
  });

  test("round-trips through parseDuration", () => {
    for (const input of ["45s", "10m", "3h", "2d", "1d12h", "1w"]) {
      const ms = parseDuration(input);
      expect(ms).not.toBeNull();
      // Formatting is the inverse for the canonical unit forms.
      expect(describeDuration(ms as number)).toContain(input.slice(-1));
    }
  });
});

describe("timeLeft", () => {
  test("counts down from now", () => {
    const now = 1_000_000_000_000;
    expect(timeLeft(now + 600_000, now)).toBe("10m");
    expect(timeLeft(now + 90_000, now)).toBe("1m 30s");
  });

  test("reports zero once the window has passed", () => {
    const now = 1_000_000_000_000;
    expect(timeLeft(now - 1, now)).toBe("0s");
  });
});

const MEMBERS = [
  { _id: "id-ana", name: "Ana Reyes" },
  { _id: "id-jo", name: "Jo" },
  { _id: "id-bob", name: "Bobby" },
  { _id: "id-ann", name: "Ann" },
];

describe("findMember", () => {
  test("matches an exact id", () => {
    expect(findMember("id-ana", MEMBERS)?.name).toBe("Ana Reyes");
  });

  test("matches a name regardless of case", () => {
    expect(findMember("ana reyes", MEMBERS)?.name).toBe("Ana Reyes");
    expect(findMember("ANA", MEMBERS)?.name).toBe("Ana Reyes");
  });

  test("accepts a leading colon", () => {
    expect(findMember(":ana", MEMBERS)?.name).toBe("Ana Reyes");
  });

  test("matches a unique prefix", () => {
    expect(findMember("bobb", MEMBERS)?.name).toBe("Bobby");
  });

  test("returns null rather than guessing when a prefix is ambiguous", () => {
    // "an" is a prefix of both "Ana Reyes" and "Ann".
    expect(findMember("an", MEMBERS)).toBeNull();
  });

  test("returns null for nobody", () => {
    expect(findMember("zzz", MEMBERS)).toBeNull();
    expect(findMember("", MEMBERS)).toBeNull();
    expect(findMember("   ", MEMBERS)).toBeNull();
  });
});

describe("searchMembers", () => {
  test("returns every partial match, for did-you-mean output", () => {
    expect(searchMembers("an", MEMBERS).map((m) => m.name)).toEqual([
      "Ana Reyes",
      "Ann",
    ]);
  });

  test("returns nothing for an empty needle", () => {
    expect(searchMembers("", MEMBERS)).toEqual([]);
    expect(searchMembers(":", MEMBERS)).toEqual([]);
  });
});
