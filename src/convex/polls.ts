import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { displayName, getCurrentUser, requireUser } from "./lib";
import { assertCanParticipate } from "./moderation";
import { award } from "./achievements";
import { tallyPoll, validatePoll } from "../lib/engagement";

const POLL_SCAN = 20;

/** Recent polls with the caller's own vote marked, newest first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const polls = await ctx.db
      .query("polls")
      .withIndex("by_createdAt")
      .order("desc")
      .take(POLL_SCAN);

    const votes = user
      ? await ctx.db
          .query("pollVotes")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect()
      : [];

    const mine = new Map(votes.map((vote) => [vote.pollId, vote.optionIndex]));

    return Promise.all(
      polls.map(async (poll) => {
        const all = await ctx.db
          .query("pollVotes")
          .withIndex("by_poll", (q) => q.eq("pollId", poll._id))
          .collect();
        const tallied = tallyPoll(
          poll.options,
          all.map((vote) => vote.optionIndex),
        );
        return {
          _id: poll._id,
          question: poll.question,
          options: poll.options,
          authorName: poll.authorName,
          authorId: poll.authorId,
          createdAt: poll.createdAt,
          endsAt: poll.endsAt ?? null,
          closed: poll.endsAt !== undefined && poll.endsAt <= Date.now(),
          counts: tallied.counts,
          total: tallied.total,
          leaderIndex: tallied.leaderIndex,
          myVote: mine.get(poll._id) ?? null,
        };
      }),
    );
  },
});

/** Starts a poll. */
export const create = mutation({
  args: {
    question: v.string(),
    options: v.array(v.string()),
    /** How long voting stays open, in milliseconds. */
    durationMs: v.optional(v.number()),
  },
  handler: async (ctx, { question, options, durationMs }) => {
    const user = await requireUser(ctx);
    await assertCanParticipate(ctx, user);

    const check = validatePoll(question, options);
    if (!check.ok) throw new Error(check.error);

    // Anything past a month is a poll nobody will come back to.
    const window = Math.min(Math.max(durationMs ?? 7 * 24 * 60 * 60 * 1000, 60_000), 30 * 24 * 60 * 60 * 1000);

    return await ctx.db.insert("polls", {
      question: question.trim(),
      options: check.options,
      authorId: user._id,
      authorName: displayName(user),
      createdAt: Date.now(),
      endsAt: Date.now() + window,
    });
  },
});

/** Casts a vote, replacing any earlier one. One vote per member. */
export const vote = mutation({
  args: { pollId: v.id("polls"), optionIndex: v.number() },
  handler: async (ctx, { pollId, optionIndex }) => {
    const user = await requireUser(ctx);
    await assertCanParticipate(ctx, user);

    const poll = await ctx.db.get(pollId);
    if (!poll) throw new Error("That poll is gone.");
    if (poll.endsAt !== undefined && poll.endsAt <= Date.now()) {
      throw new Error("Voting on that poll has closed.");
    }
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= poll.options.length) {
      throw new Error("That is not one of the choices.");
    }

    const existing = await ctx.db
      .query("pollVotes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const previous = existing.find((vote) => vote.pollId === pollId);
    if (previous) {
      if (previous.optionIndex === optionIndex) {
        // Tapping the same option again takes the vote back.
        await ctx.db.delete(previous._id);
        return { optionIndex: null as number | null };
      }
      await ctx.db.patch(previous._id, { optionIndex });
      return { optionIndex };
    }

    await ctx.db.insert("pollVotes", {
      pollId,
      userId: user._id,
      optionIndex,
    });
    await award(ctx, user, "pollster");
    return { optionIndex };
  },
});

/** Closes a poll early. Its author or any staff member. */
export const close = mutation({
  args: { pollId: v.id("polls") },
  handler: async (ctx, { pollId }) => {
    const user = await requireUser(ctx);
    const poll = await ctx.db.get(pollId);
    if (!poll) throw new Error("That poll is gone.");

    const staff = user.role === "admin" || user.role === "moderator";
    if (poll.authorId !== user._id && !staff) {
      throw new Error("Only the person who started it, or staff, can close it.");
    }

    await ctx.db.patch(pollId, { endsAt: Date.now() });
    return { ok: true };
  },
});
