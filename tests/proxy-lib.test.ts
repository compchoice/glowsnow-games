import { describe, expect, test } from "bun:test";
import {
  displayTarget,
  looksLikeAddress,
  resolveAddress,
  toTargetUrl,
} from "../src/lib/proxy";

describe("looksLikeAddress", () => {
  test("recognises URLs and bare domains", () => {
    for (const value of [
      "https://example.com",
      "http://example.com/path?x=1",
      "example.com",
      "en.wikipedia.org/wiki/Main_Page",
      "sub.domain.co.uk/path",
    ]) {
      expect(looksLikeAddress(value)).toBe(true);
    }
  });

  test("treats phrases as searches", () => {
    for (const value of ["", "   ", "how to beat week 7", "cool math", "what is 2+2?"]) {
      expect(looksLikeAddress(value)).toBe(false);
    }
  });
});

describe("toTargetUrl", () => {
  test("adds https to a bare domain but keeps explicit schemes", () => {
    expect(toTargetUrl("example.com")).toBe("https://example.com");
    expect(toTargetUrl("http://example.com")).toBe("http://example.com");
    expect(toTargetUrl("  example.com/path  ")).toBe("https://example.com/path");
  });
});

describe("resolveAddress", () => {
  test("routes addresses to the browser", () => {
    expect(resolveAddress("example.com")).toEqual({
      kind: "address",
      value: "https://example.com",
    });
    expect(resolveAddress("https://example.com")).toEqual({
      kind: "address",
      value: "https://example.com",
    });
  });

  test("routes everything else to search", () => {
    expect(resolveAddress("friday night funkin mods")).toEqual({
      kind: "search",
      value: "friday night funkin mods",
    });
    expect(resolveAddress("  spaced  search  ")).toEqual({
      kind: "search",
      value: "spaced  search",
    });
  });
});

describe("displayTarget", () => {
  test("shows the real address for anything that isn't proxied", () => {
    expect(displayTarget("https://example.com/x")).toBe("https://example.com/x");
  });
});
