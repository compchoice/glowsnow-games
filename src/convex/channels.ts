/**
 * The rooms in the server. This lives on its own so chat, threads and the
 * client sidebar all read the same list — a channel cannot exist in the UI and
 * be rejected by the server.
 */
export const CHANNELS = [
  { id: "lounge", label: "lounge", topic: "Anything goes" },
  { id: "games", label: "what-are-we-playing", topic: "Scores, tips, sessions" },
  { id: "horror", label: "horror-corner", topic: "Granny talk, jumpscares, tactics" },
  { id: "memes", label: "memes", topic: "Post the good stuff" },
  { id: "help", label: "help", topic: "Stuck on something?" },
  { id: "chill", label: "chill", topic: "Off-topic, low stakes" },
] as const;

export type ChannelId = (typeof CHANNELS)[number]["id"];

const CHANNEL_IDS = new Set<string>(CHANNELS.map((channel) => channel.id));

export const DEFAULT_CHANNEL: ChannelId = "lounge";

/** Throws unless the client named a real room. */
export function checkChannel(channel: string): string {
  if (!CHANNEL_IDS.has(channel)) {
    throw new Error("That channel does not exist.");
  }
  return channel;
}

export function isChannel(channel: string): channel is ChannelId {
  return CHANNEL_IDS.has(channel);
}

/** Channel ids, for the client to prefetch reactions and threads against. */
export function channelIds(): string[] {
  return CHANNELS.map((channel) => channel.id);
}
