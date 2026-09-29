export type CommandSpec = {
  cmd: string;
  args?: string;
  desc: string;
};

/**
 * The developer console's command list. Shared by the console, the site footer
 * and the owner dashboard, so it lives outside the component module. The footer
 * renders each entry as a button that prefills the console, so the `args` here
 * double as the clickable example.
 */
export const DEV_COMMANDS: CommandSpec[] = [
  { cmd: "help", desc: "list every command" },
  { cmd: "status", desc: "show what the console is set to right now" },
  { cmd: "ban", args: "ana spamming", desc: "permanently remove a member (owner)" },
  { cmd: "timeout", args: "ana 10m", desc: "silence a member for a while (mod+)" },
  { cmd: "mute", args: "ana 2h flooding chat", desc: "same as timeout, with a reason" },
  { cmd: "unban", args: "ana", desc: "lift a ban or silence early (mod+)" },
  { cmd: "mods", desc: "everyone currently moderated (mod+)" },
  { cmd: "check", args: "ana", desc: "look up one member (mod+)" },
  { cmd: "role", args: "ana moderator", desc: "change a member's role (owner)" },
  { cmd: "snow", args: "on | off", desc: "turn the droplets on or off" },
  { cmd: "font", args: "serif", desc: "change the body font" },
  { cmd: "wallpaper", args: "dots | off", desc: "change the background" },
  { cmd: "cloak", args: "preset | off", desc: "disguise the tab as schoolwork" },
  { cmd: "theme", args: "preset", desc: "recolour the site accent" },
  { cmd: "mode", args: "dark | light", desc: "switch the site appearance" },
  { cmd: "clear", desc: "wipe the console output" },
  { cmd: "exit", desc: "close the console" },
];
