import { describe, expect, test } from "bun:test";
import {
  COMMAND_ALIASES,
  COMMAND_GROUPS,
  DEV_COMMANDS,
  canonicalCommand,
  commandLine,
  commandsIn,
  completeCommand,
  suggestionsFor,
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

  test("descriptions stay short enough to read without truncating", () => {
    // The footer renders one line per command. A long description wraps or
    // clips, which is what makes the list clump, so the tooltip carries the
    // full wording and this keeps the short part short.
    for (const command of DEV_COMMANDS) {
      expect(command.desc.length).toBeLessThanOrEqual(32);
    }
  });

  test("every group fits one column without being enormous", () => {
    for (const group of COMMAND_GROUPS) {
      expect(commandsIn(group.id).length).toBeLessThanOrEqual(13);
    }
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

describe("command completion", () => {
  test("an exact name resolves to itself", () => {
    expect(canonicalCommand("help")).toBe("help");
    expect(canonicalCommand("KICK")).toBe("kick");
  });

  test("aliases resolve to the command they run", () => {
    expect(canonicalCommand("who")).toBe("check");
    expect(canonicalCommand("msg")).toBe("dm");
    expect(canonicalCommand("unmute")).toBe("unban");
  });

  test("an unknown word resolves to nothing rather than guessing", () => {
    expect(canonicalCommand("zzz")).toBeNull();
  });

  test("a prefix offers every command that starts with it", () => {
    expect(suggestionsFor("un").map((c) => c.cmd).sort()).toEqual([
      "unannounce",
      "unban",
      "unpoll",
    ]);
  });

  test("an exact alias offers only the command it means", () => {
    expect(suggestionsFor("who").map((c) => c.cmd)).toEqual(["check"]);
  });

  test("nothing is offered for an empty or unmatched token", () => {
    expect(suggestionsFor("")).toEqual([]);
    expect(suggestionsFor("qqq")).toEqual([]);
  });

  test("Tab completes to the shared prefix of every match", () => {
    // unban / unannounce / unpoll all start "un", so the first Tab adds "n".
    expect(completeCommand("u")).toBe("un");
  });

  test("Tab fills the whole word when only one command matches", () => {
    expect(completeCommand("kic")).toBe("kick");
    expect(completeCommand("rep")).toBe("reports");
  });

  test("Tab does nothing once the token is already a whole command", () => {
    expect(completeCommand("kick")).toBeNull();
    expect(completeCommand("mute")).toBeNull();
    expect(completeCommand("help")).toBeNull();
  });

  test("Tab does nothing when nothing matches", () => {
    expect(completeCommand("qqq")).toBeNull();
  });

  test("no alias shadows a real command name", () => {
    // `mute` is a listed command that also runs `timeout`; the switch handles
    // that. An alias entry for it would be dead code that reads as a bug.
    for (const alias of Object.keys(COMMAND_ALIASES)) {
      expect(DEV_COMMANDS.some((command) => command.cmd === alias)).toBe(false);
    }
  });

  test("every alias points at a command that exists", () => {
    for (const target of Object.values(COMMAND_ALIASES)) {
      expect(DEV_COMMANDS.some((command) => command.cmd === target)).toBe(true);
    }
  });
});
