import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { displayName, getCurrentUser, requireUser } from "./lib";
import { assertCanParticipate } from "./moderation";
import { dmKey } from "../lib/engagement";

const MAX_BODY = 1000;
const CONVERSATION_SCAN = 50;
const MESSAGE_LIMIT = 100;

/**
 * Private conversations. There is no conversation table: the pair of member
 * ids, sorted and joined, is the conversation. That means a thread cannot be
 * created twice, and neither side can widen it to a third person by editing a
 * row.
 */
export const conversations = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Two indexed reads rather than a scan: Convex cannot express "sent to me
    // OR sent by me" in one query, so both sides are read and merged in memory.
    // Capped, because the list only needs the most recent of each.
    const [sent, received] = await Promise.all([
      ctx.db
        .query("directMessages")
        .withIndex("by_sender", (q) => q.eq("senderId", user._id))
        .order("desc")
        .take(CONVERSATION_SCAN),
      ctx.db
        .query("directMessages")
        .withIndex("by_recipient", (q) => q.eq("recipientId", user._id))
        .order("desc")
        .take(CONVERSATION_SCAN),
    ]);

    const byPartner = new Map<
      string,
      { partnerId: string; lastAt: number; lastBody: string; unread: number }
    >();

    for (const message of [...sent, ...received]) {
      if (message.senderId !== user._id && message.recipientId !== user._id) continue;
      const partnerId =
        message.senderId === user._id ? message.recipientId : message.senderId;
      const entry = byPartner.get(partnerId) ?? {
        partnerId,
        lastAt: 0,
        lastBody: "",
        unread: 0,
      };
      if (message.createdAt >= entry.lastAt) {
        entry.lastAt = message.createdAt;
        entry.lastBody = message.body;
      }
      if (message.recipientId === user._id && !message.readAt) {
        entry.unread += 1;
      }
      byPartner.set(partnerId, entry);
    }

    const partners = await Promise.all(
      [...byPartner.values()].map(async (entry) => {
        const partnerId = ctx.db.normalizeId("users", entry.partnerId);
        const partner = partnerId ? await ctx.db.get(partnerId) : null;
        return {
          partnerId: entry.partnerId,
          partnerName: partner ? displayName(partner) : "Member",
          partnerAvatar: partner?.avatar ?? null,
          lastBody: entry.lastBody,
          lastAt: entry.lastAt,
          unread: entry.unread,
        };
      }),
    );

    partners.sort((a, b) => b.lastAt - a.lastAt);
    return partners.slice(0, CONVERSATION_SCAN);
  },
});

/** One conversation, oldest message first. */
export const thread = query({
  args: { partnerId: v.string() },
  handler: async (ctx, { partnerId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const partner = ctx.db.normalizeId("users", partnerId);
    if (!partner || partner === user._id) return null;

    const rows = await ctx.db
      .query("directMessages")
      .withIndex("by_key", (q) => q.eq("key", dmKey(user._id, partnerId)))
      .collect();

    // The member can be deleted between the id check and this read.
    const partnerDoc = await ctx.db.get(partner);
    if (!partnerDoc) return null;

    return {
      partnerId,
      partnerName: displayName(partnerDoc),
      messages: rows.slice(0, MESSAGE_LIMIT).map((row) => ({
        _id: row._id,
        body: row.body,
        createdAt: row.createdAt,
        mine: row.senderId === user._id,
      })),
    };
  },
});

/** How many unread direct messages the bell should show. */
export const unread = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;
    const rows = await ctx.db
      .query("directMessages")
      .withIndex("by_recipient", (q) => q.eq("recipientId", user._id))
      .collect();
    return rows.filter((row) => !row.readAt).length;
  },
});

/** Sends a private message. */
export const send = mutation({
  args: { partnerId: v.string(), body: v.string() },
  handler: async (ctx, { partnerId, body }) => {
    const user = await requireUser(ctx);
    await assertCanParticipate(ctx, user);

    const text = body.trim().slice(0, MAX_BODY);
    if (!text) throw new Error("Write something first.");

    const partnerId_ = ctx.db.normalizeId("users", partnerId);
    if (!partnerId_) throw new Error("That member no longer exists.");
    if (partnerId_ === user._id) throw new Error("You cannot message yourself.");

    const partner = await ctx.db.get(partnerId_);
    if (!partner) throw new Error("That member no longer exists.");

    const id = await ctx.db.insert("directMessages", {
      key: dmKey(user._id, partnerId_),
      senderId: user._id,
      recipientId: partnerId_,
      body: text,
      createdAt: Date.now(),
    });

    return { id };
  },
});

/** Marks everything a partner has sent as read. */
export const markRead = mutation({
  args: { partnerId: v.string() },
  handler: async (ctx, { partnerId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { ok: false };

    const rows = await ctx.db
      .query("directMessages")
      .withIndex("by_recipient", (q) => q.eq("recipientId", user._id))
      .collect();

    const now = Date.now();
    let cleared = 0;
    for (const row of rows) {
      if (row.readAt) continue;
      if (row.senderId !== partnerId) continue;
      await ctx.db.patch(row._id, { readAt: now });
      cleared += 1;
    }
    return { ok: true, cleared };
  },
});
