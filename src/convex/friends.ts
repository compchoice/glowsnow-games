import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { displayName, getCurrentUser, requireUser } from "./lib";
import { award } from "./achievements";

/**
 * Friend requests.
 *
 * Every function here is scoped to the caller and one other member. A request
 * is only ever readable by the person who sent it and the person it was sent to
 * — there is no query that lists anybody's requests, so nothing about who is
 * friends with whom can leak to a third member.
 */

type Ctx = Parameters<typeof getCurrentUser>[0];

/** The one live row between two members, whichever way it was sent. */
async function between(
  ctx: Ctx,
  a: Id<"users">,
  b: Id<"users">,
): Promise<Doc<"friendships"> | null> {
  const sent = await ctx.db
    .query("friendships")
    .withIndex("by_requester", (q) =>
      q.eq("requesterId", a).eq("status", "pending"),
    )
    .first();
  if (sent && sent.recipientId === b) return sent;

  const received = await ctx.db
    .query("friendships")
    .withIndex("by_recipient", (q) =>
      q.eq("recipientId", a).eq("status", "pending"),
    )
    .first();
  if (received && received.requesterId === b) return received;

  const accepted = await ctx.db
    .query("friendships")
    .withIndex("by_requester", (q) =>
      q.eq("requesterId", a).eq("status", "accepted"),
    )
    .first();
  if (accepted && accepted.recipientId === b) return accepted;

  return null;
}

function describeRow(row: Doc<"friendships">, me: Id<"users">) {
  const incoming = row.recipientId === me;
  return {
    _id: row._id,
    userId: incoming ? row.requesterId : row.recipientId,
    status: row.status,
    incoming,
    createdAt: row.createdAt,
  };
}

/** Everything the signed-in member needs to render friend UI. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await getCurrentUser(ctx);
    if (!me) {
      return { friends: [], incoming: [], outgoing: [] };
    }

    const [accepted, incoming, outgoing] = await Promise.all([
      ctx.db
        .query("friendships")
        .withIndex("by_requester", (q) =>
          q.eq("requesterId", me._id).eq("status", "accepted"),
        )
        .collect(),
      ctx.db
        .query("friendships")
        .withIndex("by_recipient", (q) =>
          q.eq("recipientId", me._id).eq("status", "pending"),
        )
        .collect(),
      ctx.db
        .query("friendships")
        .withIndex("by_requester", (q) =>
          q.eq("requesterId", me._id).eq("status", "pending"),
        )
        .collect(),
    ]);

    // Accepted rows are stored one-way, so find the other half of each.
    const partners = new Set([
      ...accepted.map((row) => row.recipientId),
      ...incoming.map((row) => row.requesterId),
      ...outgoing.map((row) => row.recipientId),
    ]);
    const people = await Promise.all(
      [...partners].map((id) => ctx.db.get(id)),
    );
    const names = new Map(
      people
        .filter((person): person is Doc<"users"> => person !== null)
        .map((person) => [person._id, displayName(person)]),
    );

    return {
      friends: accepted.map((row) => ({
        userId: row.recipientId,
        name: names.get(row.recipientId) ?? "Member",
        since: row.respondedAt ?? row.createdAt,
      })),
      incoming: incoming.map((row) => ({
        ...describeRow(row, me._id),
        name: names.get(row.requesterId) ?? "Member",
      })),
      outgoing: outgoing.map((row) => ({
        ...describeRow(row, me._id),
        name: names.get(row.recipientId) ?? "Member",
      })),
    };
  },
});

/** The viewer's relationship with one member, for their profile page. */
export const status = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const me = await getCurrentUser(ctx);
    if (!me || me._id === userId) return { state: "self" as const };
    if (!(await ctx.db.get(userId))) return { state: "missing" as const };

    const row = await between(ctx, me._id, userId);
    if (!row) return { state: "none" as const };
    if (row.status === "accepted") return { state: "friends" as const };
    return {
      state: (row.recipientId === me._id ? "incoming" : "outgoing") as
        | "incoming"
        | "outgoing",
      requestId: row._id,
      createdAt: row.createdAt,
    };
  },
});

/** Ask somebody to be friends. */
export const request = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const me = await requireUser(ctx);
    if (me._id === userId) {
      throw new Error("You are already friends with yourself.");
    }
    if (!(await ctx.db.get(userId))) {
      throw new Error("That member no longer exists.");
    }
    if (await between(ctx, me._id, userId)) {
      throw new Error("There is already a request between you two.");
    }

    const id = await ctx.db.insert("friendships", {
      requesterId: me._id,
      recipientId: userId,
      status: "pending",
      createdAt: Date.now(),
    });
    return { id };
  },
});

/** Accept or decline. Only the person who received it can answer. */
export const respond = mutation({
  args: { requestId: v.id("friendships"), accept: v.boolean() },
  handler: async (ctx, { requestId, accept }) => {
    const me = await requireUser(ctx);
    const row = await ctx.db.get(requestId);
    if (!row) throw new Error("That request no longer exists.");
    if (row.recipientId !== me._id) {
      throw new Error("That request was not sent to you.");
    }
    if (row.status !== "pending") {
      throw new Error("That request has already been answered.");
    }

    if (!accept) {
      await ctx.db.delete(row._id);
      return { accepted: false };
    }

    await ctx.db.patch(row._id, {
      status: "accepted",
      respondedAt: Date.now(),
    });
    // Both sides of a new friendship get the badge.
    await award(ctx, me, "friend");
    const other = await ctx.db.get(row.requesterId);
    if (other) await award(ctx, other, "friend");
    return { accepted: true };
  },
});

/** Withdraw a request you sent. */
export const cancel = mutation({
  args: { requestId: v.id("friendships") },
  handler: async (ctx, { requestId }) => {
    const me = await requireUser(ctx);
    const row = await ctx.db.get(requestId);
    if (!row) throw new Error("That request no longer exists.");
    if (row.requesterId !== me._id) {
      throw new Error("That request was not yours to cancel.");
    }
    await ctx.db.delete(row._id);
    return { ok: true };
  },
});

/** Unfriend, or decline without answering. */
export const remove = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const me = await requireUser(ctx);
    const row = await between(ctx, me._id, userId);
    if (!row) throw new Error("You are not friends.");
    await ctx.db.delete(row._id);
    return { ok: true };
  },
});
