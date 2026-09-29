import { mutation, query } from "./_generated/server";
import { displayName, getCurrentUser } from "./lib";
import { isMentioned, mentionNeedles } from "./mention";

/** How many of each source we scan when building the tray. */
const LOUNGE_SCAN = 30;
const CHAT_SCAN = 60;
const REPLY_ROOTS = 25;
const MAX_ITEMS = 30;

type Item = {
  key: string;
  kind: "lounge" | "reply" | "mention";
  authorId: string;
  author: string;
  body: string;
  createdAt: number;
  href: string;
  unread: boolean;
};

/**
 * The notification tray. There is no notifications table: everything is derived
 * from what already exists — new lounge messages, replies to your messages, and
 * chat messages that mention you — compared against the last time you opened
 * the tray.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { items: [] as Item[], unreadCount: 0, seenAt: 0 };

    const seenAt = user.notificationsSeenAt ?? 0;
    // Mentions only make sense for people with a real, distinctive name.
    const needles = mentionNeedles(displayName(user), user.isAnonymous ?? false);

    const lounge = await ctx.db
      .query("messages")
      .withIndex("by_scope", (q) => q.eq("scope", "community"))
      .order("desc")
      .take(LOUNGE_SCAN);

    const chat = await ctx.db
      .query("chatMessages")
      .withIndex("by_createdAt")
      .order("desc")
      .take(CHAT_SCAN);

    const myRoots = (
      await ctx.db
        .query("messages")
        .withIndex("by_author", (q) => q.eq("authorId", user._id))
        .order("desc")
        .take(REPLY_ROOTS)
    ).filter((message) => !message.parentId);

    const items: Item[] = [];

    for (const message of lounge) {
      if (message.authorId === user._id) continue;
      // Replies get their own "reply" item further down. Listing them here too
      // would show the same message twice under two different icons.
      if (message.parentId) continue;
      items.push({
        key: `lounge:${message._id}`,
        kind: "lounge",
        authorId: message.authorId,
        author: message.authorName,
        body: message.body,
        createdAt: message.createdAt,
        href: "/community",
        unread: message.createdAt > seenAt,
      });
    }

    // Fan out instead of awaiting each root in turn — twenty-five sequential
    // round trips is the slowest part of building this tray.
    const replyGroups = await Promise.all(
      myRoots.map((root) =>
        ctx.db
          .query("messages")
          .withIndex("by_parent", (q) => q.eq("parentId", root._id))
          .order("desc")
          .take(5),
      ),
    );

    for (const replies of replyGroups) {
      for (const reply of replies) {
        if (reply.authorId === user._id) continue;
        items.push({
          key: `reply:${reply._id}`,
          kind: "reply",
          authorId: reply.authorId,
          author: reply.authorName,
          body: reply.body,
          createdAt: reply.createdAt,
          href: reply.gameSlug ? `/games/${reply.gameSlug}` : "/community",
          unread: reply.createdAt > seenAt,
        });
      }
    }

    if (needles.length > 0) {
      for (const message of chat) {
        if (message.authorId === user._id) continue;
        if (!isMentioned(message.body, needles)) continue;
        items.push({
          key: `mention:${message._id}`,
          kind: "mention",
          authorId: message.authorId,
          author: message.authorName,
          body: message.body,
          createdAt: message.createdAt,
          href: "/chat",
          unread: message.createdAt > seenAt,
        });
      }
    }

    items.sort((a, b) => b.createdAt - a.createdAt);

    return {
      items: items.slice(0, MAX_ITEMS),
      // Counted before trimming, otherwise the badge silently caps out at
      // MAX_ITEMS on a busy day.
      unreadCount: items.filter((item) => item.unread).length,
      seenAt,
    };
  },
});

/** Marks the tray as read up to now. */
export const markSeen = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { ok: false };
    await ctx.db.patch(user._id, { notificationsSeenAt: Date.now() });
    return { ok: true };
  },
});
