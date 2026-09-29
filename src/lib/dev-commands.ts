export type CommandSpec = {
  cmd: string;
  args?: string;
  desc: string;
};

/**
 * The developer console's command list. Shared by the console, the site footer
 * and the owner dashboard, so it lives outside the component module.
 */
export const DEV_COMMANDS: CommandSpec[] = [
  { cmd: "snow", args: "on | off", desc: "turn the droplets on or off" },
  { cmd: "cloak", args: "preset | off", desc: "disguise the tab as schoolwork" },
  { cmd: "theme", args: "preset", desc: "recolour the site accent" },
  { cmd: "mode", args: "dark | light", desc: "switch the site appearance" },
  { cmd: "status", desc: "show what the console is set to right now" },
  { cmd: "clear", desc: "wipe the console output" },
  { cmd: "exit", desc: "close the console" },
];
