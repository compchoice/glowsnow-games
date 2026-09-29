import { describe, expect, test } from "bun:test";
import {
  DEFAULT_ANNOUNCEMENT,
  MAX_MESSAGE,
  announcementToShow,
  checkAnnouncement,
  isSafeLink,
} from "../src/lib/announcement";

describe("isSafeLink", () => {
  test("accepts a path inside the site", () => {
    expect(isSafeLink("/games")).toBe(true);
    expect(isSafeLink("/games/granny")).toBe(true);
  });

  test("rejects other schemes, which would be stored XSS", () => {
    expect(isSafeLink("javascript:alert(1)")).toBe(false);
    expect(isSafeLink("https://example.com")).toBe(false);
    expect(isSafeLink("data:text/html,<script>")).toBe(false);
  });

  test("rejects a protocol-relative URL that starts with a slash", () => {
    expect(isSafeLink("//example.com")).toBe(false);
  });

  test("rejects an empty link", () => {
    expect(isSafeLink("   ")).toBe(false);
  });
});

describe("checkAnnouncement", () => {
  test("accepts a message on its own", () => {
    const result = checkAnnouncement("  New games!  ", "", "");
    expect(result).toEqual({
      ok: true,
      announcement: { message: "New games!", linkTo: null, linkLabel: null },
    });
  });

  test("needs a message", () => {
    expect(checkAnnouncement("   ", "", "")).toEqual({
      ok: false,
      error: "Write the announcement first.",
    });
  });

  test("refuses an over-long message", () => {
    expect(checkAnnouncement("x".repeat(MAX_MESSAGE + 1), "", "").ok).toBe(false);
  });

  test("refuses an unsafe link", () => {
    const result = checkAnnouncement("Hi", "javascript:alert(1)", "Click");
    expect(result).toEqual({
      ok: false,
      error: "The link has to be a page on this site, like /games.",
    });
  });

  test("a link with no label is refused rather than rendered blank", () => {
    expect(checkAnnouncement("Hi", "/games", "").ok).toBe(false);
  });

  test("a label with no link is refused", () => {
    expect(checkAnnouncement("Hi", "", "Read more").ok).toBe(false);
  });

  test("accepts a message with a safe link and label", () => {
    const result = checkAnnouncement("Hi", "/games", "Play now");
    expect(result).toEqual({
      ok: true,
      announcement: { message: "Hi", linkTo: "/games", linkLabel: "Play now" },
    });
  });
});

describe("announcementToShow", () => {
  test("falls back to the built-in message when there is none", () => {
    expect(announcementToShow(null).message).toBe(DEFAULT_ANNOUNCEMENT);
    expect(announcementToShow({ message: "  " }).message).toBe(DEFAULT_ANNOUNCEMENT);
  });

  test("uses the stored message when there is one", () => {
    expect(announcementToShow({ message: "  Hello  " }).message).toBe("Hello");
  });

  test("drops a link that is no longer considered safe", () => {
    const result = announcementToShow({
      message: "Hi",
      linkTo: "javascript:alert(1)",
      linkLabel: "Click",
    });
    expect(result.linkTo).toBeNull();
    expect(result.linkLabel).toBeNull();
  });

  test("drops a label whose link is gone", () => {
    const result = announcementToShow({ message: "Hi", linkTo: null, linkLabel: "Click" });
    expect(result.linkLabel).toBeNull();
  });
});
