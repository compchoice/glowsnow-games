export type CommandGroup = "moderation" | "site" | "info" | "appearance";

export type CommandSpec = {
  cmd: string;
  args?: string;
  desc: string;
  group: CommandGroup;
};

/** Group order and headings, used by `help` and the footer. */
export const COMMAND_GROUPS: { id: CommandGroup; label: string }[] = [
  { id: "moderation", label: "Moderation" },
  { id: "site", label: "Site" },
  { id: "info", label: "Info" },
  { id: "appearance", label: "Appearance" },
];

/**
 * The developer console's command list. Shared by the console, the site footer
 * and the owner dashboard, so it lives outside the component module. The footer
 * renders each entry as a button that prefills the console, so the `args` here
 * double as the clickable example.
 */
export const DEV_COMMANDS: CommandSpec[] = [
  { cmd: "help", desc: "list every command", group: "site" },
  { cmd: "status", desc: "what the console is set to", group: "site" },
  { cmd: "go", args: "/games", desc: "jump to a page here", group: "site" },
  { cmd: "play", args: "granny", desc: "open a game by name", group: "site" },
  { cmd: "games", desc: "list the catalog", group: "site" },
  { cmd: "id", desc: "your id and profile link", group: "site" },
  { cmd: "nick", args: "ana", desc: "change your name", group: "site" },
  { cmd: "bio", args: "hello there", desc: "rewrite your bio", group: "site" },
  { cmd: "clear", desc: "wipe the output", group: "site" },
  { cmd: "exit", desc: "close the console", group: "site" },

  { cmd: "rooms", desc: "list the chat channels", group: "info" },
  { cmd: "online", desc: "who is in chat now", group: "info" },
  { cmd: "rank", desc: "top of the points table", group: "info" },
  { cmd: "badges", desc: "badges you have earned", group: "info" },
  { cmd: "search", args: "granny", desc: "search the whole site", group: "info" },
  { cmd: "dm", args: "ana see you in chat", desc: "send a private message", group: "info" },
  { cmd: "poll", args: "Which game? | Granny | Blox Fruits", desc: "start a poll", group: "info" },
  { cmd: "polls", desc: "list recent polls", group: "info" },
  { cmd: "unpoll", args: "2", desc: "close a poll you started", group: "info" },

  { cmd: "check", args: "ana", desc: "look up a member (mod+)", group: "moderation" },
  { cmd: "mods", desc: "who is moderated (mod+)", group: "moderation" },
  { cmd: "audit", desc: "every staff action (mod+)", group: "moderation" },
  { cmd: "reports", desc: "the report queue (mod+)", group: "moderation" },
  { cmd: "resolve", args: "1", desc: "mark a report handled (mod+)", group: "moderation" },
  { cmd: "kick", args: "ana 2h", desc: "boot for an hour (mod+)", group: "moderation" },
  { cmd: "timeout", args: "ana 10m", desc: "silence for a while (mod+)", group: "moderation" },
  { cmd: "mute", args: "ana 2h flooding chat", desc: "timeout, with a reason", group: "moderation" },
  { cmd: "unban", args: "ana", desc: "lift a ban or silence (mod+)", group: "moderation" },
  { cmd: "ban", args: "ana spamming", desc: "remove for good (owner)", group: "moderation" },
  { cmd: "role", args: "ana moderator", desc: "change a role (owner)", group: "moderation" },
  { cmd: "announce", args: "server is back up", desc: "set the home message (owner)", group: "moderation" },
  { cmd: "unannounce", desc: "clear the home message (owner)", group: "moderation" },

  { cmd: "theme", args: "preset", desc: "recolour the accent", group: "appearance" },
  { cmd: "mode", args: "dark", desc: "dark or light", group: "appearance" },
  { cmd: "font", args: "serif", desc: "change the body font", group: "appearance" },
  { cmd: "wallpaper", args: "dots", desc: "change the background", group: "appearance" },
  { cmd: "snow", args: "on", desc: "the falling snow", group: "appearance" },
  { cmd: "cloak", args: "preset", desc: "disguise the tab", group: "appearance" },
];

/** The commands in one group, in the order they were declared. */
export function commandsIn(group: CommandGroup): CommandSpec[] {
  return DEV_COMMANDS.filter((command) => command.group === group);
}

/** Everything in a group, as one console line. */
export function commandLine(command: CommandSpec): string {
  return `${command.cmd}${command.args ? ` ${command.args}` : ""}`;
}
