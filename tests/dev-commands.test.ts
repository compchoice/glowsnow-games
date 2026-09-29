import { describe, expect, test } from "bun:test";
import {
  COMMAND_GROUPS,
  DEV_COMMANDS,
  commandLine,
  commandsIn,
} from "../src/lib/dev-commands";
import { NAV_LINKS, SECONDARY_LINKS } from "../src/lib/site";

describe("developer command list", () => {
  test("every command belongs to a known group", () => {
    const groups = new Set(COMMAND_GROUPS.map((group) => group.id));
    for (const command of DEV_COMMANDS) {
      expect(groups.has(command.group)).toBe(true);
    }
  });

  test("every group actually has commands, so none renders empty", () => {
    for (const group of COMMAND_GROUPS) {
      expect(commandsIn(group.id).length).toBeGreaterThan(0);
    }
  });

  test("command names are unique", () => {
    const names = DEV_COMMANDS.map((command) => command.cmd);
    expect(new Set(names).size).toBe(names.length);
  });

  test("every command has a description", () => {
    for (const command of DEV_COMMANDS) {
      expect(command.desc.length).toBeGreaterThan(0);
    }
  });

  test("the example renders as the command plus its arguments", () => {
    expect(commandLine({ cmd: "kick", args: "ana 2h", desc: "", group: "site" })).toBe(
      "kick ana 2h",
    );
    expect(commandLine({ cmd: "help", desc: "", group: "site" })).toBe("help");
  });

  test("help is offered, since every other command is discovered through it", () => {
    expect(DEV_COMMANDS.some((command) => command.cmd === "help")).toBe(true);
  });
});

describe("navigation", () => {
  test("the header bar stays short enough not to wrap", () => {
    expect(NAV_LINKS.length).toBeLessThanOrEqual(5);
  });

  test("no destination appears twice across the two nav lists", () => {
    const paths = [...NAV_LINKS, ...SECONDARY_LINKS].map((link) => link.to);
    expect(new Set(paths).size).toBe(paths.length);
  });

  test("every nav entry has a label and an internal path", () => {
    for (const link of [...NAV_LINKS, ...SECONDARY_LINKS]) {
      expect(link.label.length).toBeGreaterThan(0);
      expect(link.to.startsWith("/")).toBe(true);
    }
  });
});
