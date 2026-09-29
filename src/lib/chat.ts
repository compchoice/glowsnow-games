/** Pure helpers behind the chat room: member names, day labels, grouping. */

/** Mirrors MAX_BODY in src/convex/chat.ts (Convex can't share imports outward). */
export const CHAT_MAX_BODY = 500;

/** Consecutive messages from one person within this window share a header. */
const RUN_GAP_MS = 5 * 60 * 1000;

export type ChatMessageLike = {
  _id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: number;
};

export type ChatRow =
  | { kind: "day"; key: string; label: string }
  | {
      kind: "message";
      key: string;
      message: ChatMessageLike;
      mine: boolean;
      /** Show avatar, name and time (false on continuation lines). */
      showHeader: boolean;
    };

/** The name shown next to a message, matching the server's displayName(). */
export function memberName(
  user: { name?: string | null; email?: string | null } | null | undefined,
): string {
  const name = user?.name?.trim();
  if (name) return name;
  const email = user?.email?.trim();
  if (email) return email.split("@")[0];
  return "Member";
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0] ?? "").join("").toUpperCase() || "?";
}

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** "Today" / "Yesterday" / a short date, for the separators in the log. */
export function dayLabel(timestamp: number, now = Date.now()): string {
  const today = startOfDay(now);
  const day = startOfDay(timestamp);
  const daysApart = Math.round((today - day) / 86_400_000);

  if (daysApart <= 0) return "Today";
  if (daysApart === 1) return "Yesterday";

  const date = new Date(timestamp);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function clockLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "Ana is typing…" / "Ana and Ben are typing…" / "3 people are typing…" */
export function typingLabel(names: string[]): string | null {
  if (names.length === 0) return null;
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  return `${names.length} people are typing…`;
}

/**
 * Flattens messages into render rows: day separators plus messages flagged
 * with whether they start a new run (avatar + name + time) or continue one.
 */
export function groupChatMessages(
  messages: ChatMessageLike[],
  currentUserId: string | null,
  now = Date.now(),
): ChatRow[] {
  const rows: ChatRow[] = [];
  let previous: ChatMessageLike | null = null;

  for (const message of messages) {
    const day = startOfDay(message.createdAt);
    if (previous === null || startOfDay(previous.createdAt) !== day) {
      rows.push({
        kind: "day",
        key: `day-${day}`,
        label: dayLabel(message.createdAt, now),
      });
      previous = null;
    }

    const continuesRun =
      previous !== null &&
      previous.authorId === message.authorId &&
      message.createdAt - previous.createdAt < RUN_GAP_MS;

    rows.push({
      kind: "message",
      key: message._id,
      message,
      mine: currentUserId !== null && message.authorId === currentUserId,
      showHeader: !continuesRun,
    });

    previous = message;
  }

  return rows;
}
