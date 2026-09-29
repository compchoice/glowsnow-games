import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  MODERATOR: "moderator",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.MODERATOR),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

/** Where a message lives: the community lounge, or a game's comment thread. */
export const scopeValidator = v.union(
  v.literal("community"),
  v.literal("game"),
);

/**
 * How a member is restricted.
 * - `ban` is permanent and only the owner can lift it.
 * - `kick` is a removal that lapses on its own, and any moderator can undo it.
 * - `timeout` is a silence for a chosen stretch.
 */
export const moderationKindValidator = v.union(
  v.literal("ban"),
  v.literal("kick"),
  v.literal("timeout"),
);

/** A friend request either waits for an answer or has been accepted. */
export const friendshipStatusValidator = v.union(
  v.literal("pending"),
  v.literal("accepted"),
);

/** What a reaction is attached to. */
export const reactionTargetValidator = v.union(
  v.literal("chat"),
  v.literal("lounge"),
);

/** What a report is about. */
export const reportTargetValidator = v.union(
  v.literal("chat"),
  v.literal("lounge"),
  v.literal("review"),
  v.literal("poll"),
  v.literal("user"),
);

/** Where a report has got to. */
export const reportStatusValidator = v.union(
  v.literal("open"),
  v.literal("resolved"),
  v.literal("dismissed"),
);

/** Where a feature request has got to. */
export const requestStatusValidator = v.union(
  v.literal("open"),
  v.literal("planned"),
  v.literal("done"),
  v.literal("declined"),
);

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove

      /** Public profile: a short bio and an emoji avatar. */
      bio: v.optional(v.string()),
      avatar: v.optional(v.string()),
      /** Last time this member opened the notifications tray. */
      notificationsSeenAt: v.optional(v.number()),
    })
      .index("email", ["email"]) // index for the email. do not remove or modify
      .index("by_role", ["role"]), // lets the header ask "is there an owner?" without scanning every user

    // The site-wide announcement shown in the landing hero. Only one row is
    // active at a time; setting a new one retires the last.
    announcements: defineTable({
      message: v.string(),
      /** Optional call to action. Internal paths only, checked on write. */
      linkTo: v.optional(v.string()),
      linkLabel: v.optional(v.string()),
      by: v.optional(v.id("users")),
      createdAt: v.number(),
      active: v.boolean(),
    })
      .index("by_active", ["active", "createdAt"])
      .index("by_createdAt", ["createdAt"]),

    // The playable catalog. Owners manage this from the admin area.
    games: defineTable({
      slug: v.string(),
      title: v.string(),
      category: v.string(),
      description: v.string(),
      tags: v.array(v.string()),
      embedUrl: v.string(),
      playUrl: v.string(),
      /** Optional mirror used only when playing through the proxy. */
      proxyUrl: v.optional(v.string()),
      featured: v.boolean(),
      addedBy: v.optional(v.id("users")),
      createdAt: v.number(),
      updatedAt: v.optional(v.number()),
    })
      .index("by_slug", ["slug"])
      .index("by_category", ["category"]),

    // The live chat room. High volume, flat (no threads), newest last.
    chatMessages: defineTable({
      authorId: v.id("users"),
      authorName: v.string(),
      body: v.string(),
      createdAt: v.number(),
      /** Which room it was posted in. Absent on older rows, which were "lounge". */
      channel: v.optional(v.string()),
    })
      .index("by_createdAt", ["createdAt"])
      .index("by_author", ["authorId", "createdAt"])
      .index("by_channel", ["channel", "createdAt"]),

    // Friend requests and friendships. Always private to the two members
    // involved: nothing here is ever readable by anyone else.
    friendships: defineTable({
      requesterId: v.id("users"),
      recipientId: v.id("users"),
      status: friendshipStatusValidator,
      createdAt: v.number(),
      respondedAt: v.optional(v.number()),
    })
      .index("by_requester", ["requesterId", "status"])
      .index("by_recipient", ["recipientId", "status"]),

    // A member's saved games. One row per member per game.
    favorites: defineTable({
      userId: v.id("users"),
      gameSlug: v.string(),
      createdAt: v.number(),
      /** Bumped whenever the game is played, so the shelf can show recents. */
      lastPlayedAt: v.optional(v.number()),
    })
      .index("by_user", ["userId", "createdAt"])
      .index("by_user_game", ["userId", "gameSlug"]),

    // A member's named collections of games.
    playlists: defineTable({
      userId: v.id("users"),
      name: v.string(),
      slugs: v.array(v.string()),
      createdAt: v.number(),
      updatedAt: v.optional(v.number()),
    }).index("by_user", ["userId", "createdAt"]),

    // Member reviews for a game. One row per member per game.
    reviews: defineTable({
      gameSlug: v.string(),
      userId: v.id("users"),
      authorName: v.string(),
      /** Whole stars, 1 (bad) to 5 (great). */
      rating: v.number(),
      body: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.optional(v.number()),
    })
      .index("by_game", ["gameSlug", "createdAt"])
      .index("by_user_game", ["userId", "gameSlug"]),

    // How far each member has read in each chat room, for unread badges.
    chatReadState: defineTable({
      userId: v.id("users"),
      channel: v.string(),
      lastReadAt: v.number(),
    }).index("by_user_channel", ["userId", "channel"]),

    // Owner moderation. One row per moderated member; the newest wins.
    moderation: defineTable({
      userId: v.id("users"),
      kind: moderationKindValidator,
      /** When the timeout lapses. Absent for a permanent ban. */
      until: v.optional(v.number()),
      reason: v.optional(v.string()),
      by: v.optional(v.id("users")),
      createdAt: v.number(),
    }).index("by_user", ["userId"]),

    // What members would like built, and the owner's replies.
    requests: defineTable({
      authorId: v.id("users"),
      authorName: v.string(),
      title: v.string(),
      body: v.string(),
      status: requestStatusValidator,
      createdAt: v.number(),
      updatedAt: v.optional(v.number()),
    })
      .index("by_createdAt", ["createdAt"])
      .index("by_status", ["status", "createdAt"]),

    // Only moderators and the owner can leave a reply on a request.
    requestComments: defineTable({
      requestId: v.id("requests"),
      authorId: v.id("users"),
      authorName: v.string(),
      /** Snapshotted so a reply still reads as "Owner" if the role later changes. */
      authorRole: v.string(),
      body: v.string(),
      createdAt: v.number(),
    }).index("by_request", ["requestId", "createdAt"]),

    // Who is in the chat right now, and who is mid-sentence. One row per user.
    chatPresence: defineTable({
      userId: v.id("users"),
      name: v.string(),
      lastSeenAt: v.number(),
      typingAt: v.optional(v.number()),
    }).index("by_userId", ["userId"]),

    // Community messages (scope "community") and game comments (scope "game").
    messages: defineTable({
      scope: scopeValidator,
      gameSlug: v.optional(v.string()),
      parentId: v.optional(v.id("messages")),
      authorId: v.id("users"),
      authorName: v.string(),
      body: v.string(),
      createdAt: v.number(),
      pinned: v.optional(v.boolean()),
    })
      .index("by_scope", ["scope", "createdAt"])
      .index("by_game", ["gameSlug", "createdAt"])
      .index("by_parent", ["parentId"])
      .index("by_author", ["authorId", "createdAt"]),

    // A private conversation between two members. `key` is the two user ids
    // sorted and joined, so there is only ever one row-space per pair and
    // neither side can be told apart by looking at it.
    directMessages: defineTable({
      key: v.string(),
      senderId: v.id("users"),
      recipientId: v.id("users"),
      body: v.string(),
      createdAt: v.number(),
      /** Set once the recipient has seen it, so the badge can clear. */
      readAt: v.optional(v.number()),
    })
      .index("by_key", ["key", "createdAt"])
      .index("by_recipient", ["recipientId", "createdAt"])
      .index("by_sender", ["senderId", "createdAt"]),

    // An emoji tap on a chat or lounge message. One row per person per
    // message per emoji, so the count is just the row count.
    reactions: defineTable({
      targetType: reactionTargetValidator,
      targetId: v.string(),
      userId: v.id("users"),
      emoji: v.string(),
      createdAt: v.number(),
    })
      .index("by_target", ["targetType", "targetId"])
      .index("by_user", ["userId", "createdAt"]),

    // A conversation thread started inside a chat channel. Replies hang off
    // the thread rather than off a chat message, so a thread has one parent
    // and a reply count with no message-tree walking.
    threads: defineTable({
      channel: v.string(),
      title: v.string(),
      authorId: v.id("users"),
      authorName: v.string(),
      createdAt: v.number(),
      lastReplyAt: v.number(),    })
      .index("by_channel", ["channel", "lastReplyAt"])
      .index("by_createdAt", ["createdAt"]),

    threadReplies: defineTable({
      threadId: v.id("threads"),
      authorId: v.id("users"),
      authorName: v.string(),
      body: v.string(),
      createdAt: v.number(),
    }).index("by_thread", ["threadId", "createdAt"]),

    // A badge a member has earned. The key matches a definition in
    // src/lib/engagement.ts, so the client never has to store the copy.
    achievements: defineTable({
      userId: v.id("users"),
      key: v.string(),
      earnedAt: v.number(),
    }).index("by_user", ["userId", "earnedAt"]),

    // The leaderboard row. Points are the sum of earned badges, cached here so
    // ranking never has to walk every member's achievements.
    standings: defineTable({
      userId: v.id("users"),
      points: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_points", ["points"]),

    // A community poll, plus one vote row per member per poll.
    polls: defineTable({
      question: v.string(),
      options: v.array(v.string()),
      authorId: v.id("users"),
      authorName: v.string(),
      createdAt: v.number(),
      /** When voting closes. Absent means it never closes. */
      endsAt: v.optional(v.number()),
    }).index("by_createdAt", ["createdAt"]),

    pollVotes: defineTable({
      pollId: v.id("polls"),
      userId: v.id("users"),
      optionIndex: v.number(),
    })
      .index("by_poll", ["pollId"])
      .index("by_user", ["userId", "pollId"]),

    // Something a member reported, and how the staff answered it.
    reports: defineTable({
      targetType: reportTargetValidator,
      /** The message, review, poll or member id, as a string. */
      targetId: v.string(),
      reporterId: v.id("users"),
      reason: v.string(),
      details: v.optional(v.string()),
      createdAt: v.number(),
      status: reportStatusValidator,
      resolvedBy: v.optional(v.id("users")),
      resolvedAt: v.optional(v.number()),
    })
      .index("by_status", ["status", "createdAt"])
      .index("by_reporter", ["reporterId", "createdAt"]),

    // Every staff action, kept whether or not it needed a report. This is the
    // audit trail the staff desk reads.
    auditLog: defineTable({
      actorId: v.id("users"),
      actorName: v.string(),
      action: v.string(),
      targetId: v.optional(v.string()),
      detail: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_createdAt", ["createdAt"])
      .index("by_actor", ["actorId", "createdAt"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
