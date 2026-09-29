import { describe, expect, test } from "bun:test";
import {
  groupChatMessages,
  initials,
  memberName,
  typingLabel,
  type ChatMessageLike,
} from "../src/lib/chat";

/** Built in local time so day boundaries are stable in any timezone. */
const at = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
) => new Date(year, month, day, hour, minute, 0, 0).getTime();

function message(
  id: string,
  authorId: string,
  authorName: string,
  createdAt: number,
  body = "hi",
): ChatMessageLike {
  return { _id: id, authorId, authorName, createdAt, body };
}

const ANA = { id: "user-ana", name: "Ana" };
const BEN = { id: "user-ben", name: "Ben" };

describe("memberName", () => {
  test("prefers the display name, then the email prefix", () => {
    expect(memberName({ name: "Ana Reyes", email: "ana@school.edu" })).toBe(
      "Ana Reyes",
    );
    expect(memberName({ name: "   ", email: "ana@school.edu" })).toBe("ana");
    expect(memberName({ name: null, email: null })).toBe("Member");
    expect(memberName(null)).toBe("Member");
  });
});

describe("initials", () => {
  test("uses up to two words", () => {
    expect(initials("Ana Reyes")).toBe("AR");
    expect(initials("ana")).toBe("A");
    expect(initials("   ")).toBe("?");
  });
});

describe("typingLabel", () => {
  test("reads naturally for one, two and many people", () => {
    expect(typingLabel([])).toBeNull();
    expect(typingLabel(["Ana"])).toBe("Ana is typing…");
    expect(typingLabel(["Ana", "Ben"])).toBe("Ana and Ben are typing…");
    expect(typingLabel(["Ana", "Ben", "Cara"])).toBe("3 people are typing…");
  });
});

describe("groupChatMessages", () => {
  const now = at(2026, 4, 5, 18, 0);

  test("adds a day separator per calendar day", () => {
    const rows = groupChatMessages(
      [
        message("1", ANA.id, ANA.name, at(2026, 4, 4, 23, 50)),
        message("2", ANA.id, ANA.name, at(2026, 4, 5, 9, 0)),
      ],
      ANA.id,
      now,
    );

    const days = rows.filter((row) => row.kind === "day");
    expect(days.map((row) => row.label)).toEqual(["Yesterday", "Today"]);
  });

  test("keeps consecutive messages from one author in a single run", () => {
    const rows = groupChatMessages(
      [
        message("1", ANA.id, ANA.name, at(2026, 4, 5, 9, 0)),
        message("2", ANA.id, ANA.name, at(2026, 4, 5, 9, 1)),
        message("3", ANA.id, ANA.name, at(2026, 4, 5, 9, 2)),
      ],
      ANA.id,
      now,
    );

    const messages = rows.filter((row) => row.kind === "message");
    expect(messages.map((row) => row.kind === "message" && row.showHeader)).toEqual([
      true,
      false,
      false,
    ]);
  });

  test("starts a new run for a different author or a long pause", () => {
    const rows = groupChatMessages(
      [
        message("1", ANA.id, ANA.name, at(2026, 4, 5, 9, 0)),
        message("2", BEN.id, BEN.name, at(2026, 4, 5, 9, 1)),
        message("3", BEN.id, BEN.name, at(2026, 4, 5, 9, 30)),
      ],
      ANA.id,
      now,
    );

    const messages = rows.filter((row) => row.kind === "message");
    // Ben's later message is 29 minutes on, so it needs its own header again.
    expect(messages.map((row) => row.kind === "message" && row.showHeader)).toEqual([
      true,
      true,
      true,
    ]);
  });

  test("flags the current user's own messages", () => {
    const rows = groupChatMessages(
      [
        message("1", ANA.id, ANA.name, at(2026, 4, 5, 9, 0)),
        message("2", BEN.id, BEN.name, at(2026, 4, 5, 9, 1)),
      ],
      BEN.id,
      now,
    );

    const flags = rows
      .filter((row) => row.kind === "message")
      .map((row) => row.mine);
    expect(flags).toEqual([false, true]);
  });

  test("treats a signed out viewer as having no own messages", () => {
    const rows = groupChatMessages(
      [message("1", ANA.id, ANA.name, at(2026, 4, 5, 9, 0))],
      null,
      now,
    );
    expect(rows.every((row) => row.kind === "day" || row.mine === false)).toBe(
      true,
    );
  });

  test("returns nothing for an empty room", () => {
    expect(groupChatMessages([], ANA.id, now)).toEqual([]);
  });
});
