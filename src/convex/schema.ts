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

/** A permanent ban, or a temporary silence. */
export const moderationKindValidator = v.union(
  v.literal("ban"),
  v.literal("timeout"),
);

/** A friend request either waits for an answer or has been accepted. */
export const friendshipStatusValidator = v.union(
  v.literal("pending"),
  v.literal("accepted"),
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
  },
  {
    schemaValidation: false,
  },
);

export default schema;
