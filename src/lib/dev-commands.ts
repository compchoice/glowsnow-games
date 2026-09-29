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
  { cmd: "status", desc: "show what the console is set to right now", group: "site" },
  { cmd: "go", args: "/games", desc: "jump to a page on this site", group: "site" },
  { cmd: "play", args: "granny", desc: "open a game by name", group: "site" },
  { cmd: "games", desc: "list the whole catalog", group: "site" },
  { cmd: "id", desc: "your user id and profile link", group: "site" },
  { cmd: "nick", args: "ana", desc: "change your display name", group: "site" },
  { cmd: "bio", args: "hello there", desc: "rewrite your bio", group: "site" },
  { cmd: "clear", desc: "wipe the console output", group: "site" },
  { cmd: "exit", desc: "close the console", group: "site" },

  { cmd: "rooms", desc: "list the chat channels", group: "info" },
  { cmd: "online", desc: "who is in chat right now", group: "info" },
  { cmd: "rank", desc: "top of the points table", group: "info" },
  { cmd: "badges", desc: "the badges you have earned", group: "info" },
  { cmd: "search", args: "granny", desc: "search games, people and ideas", group: "info" },
  { cmd: "dm", args: "ana see you in chat", desc: "send a private message", group: "info" },
  { cmd: "poll", args: "Which game? | Granny | Blox Fruits", desc: "start a poll", group: "info" },
  { cmd: "polls", desc: "list recent polls", group: "info" },
  { cmd: "unpoll", args: "2", desc: "close a poll you started", group: "info" },

  { cmd: "check", args: "ana", desc: "look up one member (mod+)", group: "moderation" },
  { cmd: "mods", desc: "everyone currently moderated (mod+)", group: "moderation" },
  { cmd: "audit", desc: "every staff action, newest first (mod+)", group: "moderation" },
  { cmd: "reports", desc: "the open report queue (mod+)", group: "moderation" },
  { cmd: "resolve", args: "1", desc: "mark a report as handled (mod+)", group: "moderation" },
  { cmd: "kick", args: "ana 2h", desc: "boot a member for an hour, or longer (mod+)", group: "moderation" },
  { cmd: "timeout", args: "ana 10m", desc: "silence a member for a while (mod+)", group: "moderation" },
  { cmd: "mute", args: "ana 2h flooding chat", desc: "same as timeout, with a reason", group: "moderation" },
  { cmd: "unban", args: "ana", desc: "lift a ban or silence early (mod+)", group: "moderation" },
  { cmd: "ban", args: "ana spamming", desc: "permanently remove a member (owner)", group: "moderation" },
  { cmd: "role", args: "ana moderator", desc: "change a member's role (owner)", group: "moderation" },
  { cmd: "announce", args: "server is back up", desc: "set the home page message (owner)", group: "moderation" },
  { cmd: "unannounce", desc: "take the home page message down (owner)", group: "moderation" },

  { cmd: "theme", args: "preset", desc: "recolour the site accent", group: "appearance" },
  { cmd: "mode", desc: "dark | light — switch the site appearance", group: "appearance" },
  { cmd: "font", args: "serif", desc: "change the body font", group: "appearance" },
  { cmd: "wallpaper", desc: "dots | off — change the background", group: "appearance" },
  { cmd: "snow", desc: "on | off — turn the droplets on or off", group: "appearance" },
  { cmd: "cloak", desc: "preset | off — disguise the tab as schoolwork", group: "appearance" },
];

/** The commands in one group, in the order they were declared. */
export function commandsIn(group: CommandGroup): CommandSpec[] {
  return DEV_COMMANDS.filter((command) => command.group === group);
}

/** Everything in a group, as one console line. */
export function commandLine(command: CommandSpec): string {
  return `${command.cmd}${command.args ? ` ${command.args}` : ""}`;
}
