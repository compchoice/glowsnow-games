import { v } from "convex/values";
import { query } from "./_generated/server";
import { displayName, requireModerator } from "./lib";
import { ROLES } from "./schema";

/**
 * Member lookup for moderators: find somebody by name, and see whether they are
 * around right now before deciding what to do about it.
 */

/** Matches the chat room's own "online" window so the two never disagree. */
const ONLINE_WINDOW_MS = 25_000;
/** Beyond this we call somebody inactive rather than guessing. */
const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1_000;
const LIMIT = 12;

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, { query }) => {
    await requireModerator(ctx);
    const needle = query.trim().toLowerCase();
    if (!needle) return { results: [] };

    const now = Date.now();
    const [users, presence, messages, chat, moderated] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("chatPresence").collect(),
      ctx.db.query("messages").collect(),
      ctx.db.query("chatMessages").collect(),
      ctx.db.query("moderation").collect(),
    ]);

    const lastSeen = new Map(presence.map((row) => [row.userId, row.lastSeenAt]));
    const blocked = new Set(
      moderated
        .filter(
          (row) => row.kind === "ban" || (row.until ?? Infinity) > now,
        )
        .map((row) => row.userId),
    );
    const posts = new Map<string, number>();
    for (const message of messages) {
      posts.set(message.authorId, (posts.get(message.authorId) ?? 0) + 1);
    }
    const lines = new Map<string, number>();
    for (const message of chat) {
      lines.set(message.authorId, (lines.get(message.authorId) ?? 0) + 1);
    }

    return {
      results: users
        .map((user) => {
          const name = displayName(user);
          const seen = lastSeen.get(user._id) ?? null;
          return {
            _id: user._id,
            name,
            email: user.email ?? null,
            role: user.role ?? ROLES.MEMBER,
            isAnonymous: user.isAnonymous ?? false,
            joinedAt: user._creationTime,
            lastSeenAt: seen,
            /** In the chat room right now. */
            online: seen !== null && now - seen < ONLINE_WINDOW_MS,
            /** Seen at some point in the last week. */
            recent: seen !== null && now - seen < RECENT_WINDOW_MS,
            posts: posts.get(user._id) ?? 0,
            chatLines: lines.get(user._id) ?? 0,
            moderated: blocked.has(user._id),
          };
        })
        .filter((person) => {
          if (person.isAnonymous) return false;
          return (
            person.name.toLowerCase().includes(needle) ||
            (person.email ?? "").toLowerCase().includes(needle)
          );
        })
        .sort((a, b) => {
          if (a.online !== b.online) return a.online ? -1 : 1;
          return (b.lastSeenAt ?? 0) - (a.lastSeenAt ?? 0);
        })
        .slice(0, LIMIT),
    };
  },
});
