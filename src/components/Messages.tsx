import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useMemberDirectory } from "@/hooks/use-directory";
import { MemberAvatar } from "@/components/MemberAvatar";
import { ReactionBar } from "@/components/ReactionBar";
import { ReportDialog, type ReportTarget } from "@/components/ReportDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CornerDownRight, Pin, Send, Trash2 } from "lucide-react";

type Scope = "community" | "game";

type MessageDoc = {
  _id: Id<"messages">;
  _creationTime: number;
  scope: Scope;
  gameSlug?: string;
  parentId?: Id<"messages">;
  authorId: Id<"users">;
  authorName: string;
  body: string;
  createdAt: number;
  pinned?: boolean;
};

function timeAgo(timestamp: number) {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return "just now";
  }
}

function Composer({
  scope,
  gameSlug,
  parentId,
  placeholder,
  autoFocus = false,
  onDone,
}: {
  scope: Scope;
  gameSlug?: string;
  parentId?: Id<"messages">;
  placeholder: string;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const post = useMutation(api.messages.post);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!body.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      await post({ scope, gameSlug, parentId, body });
      setBody("");
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post that.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="space-y-2"
    >
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={parentId ? 2 : 3}
        maxLength={800}
        className="resize-none"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {error ? (
            <span className="text-destructive">{error}</span>
          ) : (
            `${body.length}/800 characters`
          )}
        </span>
        <Button type="submit" size="sm" disabled={!body.trim() || sending}>
          <Send className="size-3.5" />
          {parentId ? "Reply" : "Post"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Message feed used by both the community lounge and game comment threads.
 * Replies are nested one level deep so threads stay readable.
 */
export function Messages({
  scope,
  gameSlug,
  emptyText = "Nothing here yet — start the conversation.",
}: {
  scope: Scope;
  gameSlug?: string;
  emptyText?: string;
}) {
  const { isAuthenticated, user } = useAuth();
  const remove = useMutation(api.messages.remove);
  const setPinned = useMutation(api.messages.setPinned);
  const status = useQuery(api.users.adminStatus, isAuthenticated ? {} : "skip");
  const messages = useQuery(api.messages.list, {
    scope,
    gameSlug,
    limit: 200,
  }) as MessageDoc[] | undefined;
  const directory = useMemberDirectory();

  // One reaction query for the page, not one per message.
  const reactionTargets = useMemo(
    () => (messages ?? []).map((message) => message._id as string).slice(0, 60),
    [messages],
  );
  const reactions = useQuery(
    api.reactions.forTargets,
    reactionTargets.length > 0
      ? { targetType: "lounge", targetIds: reactionTargets }
      : "skip",
  );

  const [reporting, setReporting] = useState<ReportTarget | null>(null);

  const [replyTo, setReplyTo] = useState<Id<"messages"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { roots, repliesByParent } = useMemo(() => {
    const roots: MessageDoc[] = [];
    const repliesByParent = new Map<string, MessageDoc[]>();
    for (const message of messages ?? []) {
      if (message.parentId) {
        const list = repliesByParent.get(message.parentId) ?? [];
        list.push(message);
        repliesByParent.set(message.parentId, list);
      } else {
        roots.push(message);
      }
    }
    for (const list of repliesByParent.values()) {
      list.sort((a, b) => a.createdAt - b.createdAt);
    }
    roots.sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return b.createdAt - a.createdAt;
    });
    return { roots, repliesByParent };
  }, [messages]);

  async function handleDelete(id: Id<"messages">) {
    setError(null);
    try {
      await remove({ id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete that.");
    }
  }

  /** Prefers the directory name so a rename shows up on old messages too. */
  function nameOf(message: MessageDoc) {
    return directory.get(message.authorId)?.name ?? message.authorName;
  }

  function canModerate(message: MessageDoc) {
    return (
      status?.isAdmin ||
      (user?._id !== undefined && message.authorId === user._id)
    );
  }

  return (
    <div className="space-y-6">
      {isAuthenticated ? (
        <div className="rounded-xl border border-border/70 bg-card/60 p-5">
          <Composer
            scope={scope}
            gameSlug={gameSlug}
            placeholder={
              scope === "game"
                ? "Share a tip or ask about this game…"
                : "Say something to the community…"
            }
          />
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border/70 px-5 py-4 text-sm text-muted-foreground">
          <span>Sign in to post a message.</span>
          <Button asChild size="sm" variant="outline">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {messages === undefined ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : roots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 px-6 py-10 text-center text-sm text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <ul className="space-y-3">
          {roots.map((message) => {
            const replies = repliesByParent.get(message._id) ?? [];
            return (
              <li
                key={message._id}
                className={cn(
                  "rounded-xl border border-border/70 bg-card/60 p-5",
                  message.pinned && "border-primary/35 bg-primary/5",
                )}
              >
                <div className="flex gap-3">
                  <MemberAvatar
                    name={nameOf(message)}
                    avatar={directory.get(message.authorId)?.avatar}
                    seed={message.authorId}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/u/${message.authorId}`}
                        className="text-sm font-medium transition-colors hover:text-primary"
                      >
                        {nameOf(message)}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(message.createdAt)}
                      </span>
                      {message.pinned && (
                        <span className="flex items-center gap-1 text-xs text-primary">
                          <Pin className="size-3" /> Pinned
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground/90">
                      {message.body}
                    </p>

                    <ReactionBar
                      targetType="lounge"
                      targetId={message._id}
                      reactions={reactions?.[message._id] ?? []}
                      onReport={
                        isAuthenticated && message.authorId !== user?._id
                          ? () =>
                              setReporting({
                                type: "lounge",
                                id: message._id,
                                label: `Report this message from ${nameOf(message)}: “${message.body.slice(0, 120)}”`,
                              })
                          : undefined
                      }
                    />

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                      {isAuthenticated && (
                        <button
                          type="button"
                          className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                          onClick={() =>
                            setReplyTo((current) =>
                              current === message._id ? null : message._id,
                            )
                          }
                        >
                          <CornerDownRight className="size-3" />
                          Reply
                          {replies.length > 0 && ` (${replies.length})`}
                        </button>
                      )}
                      {status?.isAdmin && !message.parentId && (
                        <button
                          type="button"
                          className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
                          onClick={() =>
                            setPinned({
                              id: message._id,
                              pinned: !message.pinned,
                            })
                          }
                        >
                          <Pin className="size-3" />
                          {message.pinned ? "Unpin" : "Pin"}
                        </button>
                      )}
                      {canModerate(message) && (
                        <button
                          type="button"
                          className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-destructive"
                          onClick={() => handleDelete(message._id)}
                        >
                          <Trash2 className="size-3" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {replies.length > 0 && (
                  <ul className="mt-3 space-y-2 border-l border-border/70 pl-4">
                    {replies.map((reply) => (
                      <li key={reply._id} className="flex gap-3">
                        <MemberAvatar
                          name={nameOf(reply)}
                          avatar={directory.get(reply.authorId)?.avatar}
                          seed={reply.authorId}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              to={`/u/${reply.authorId}`}
                              className="text-sm font-medium transition-colors hover:text-primary"
                            >
                              {nameOf(reply)}
                            </Link>
                            <span className="text-xs text-muted-foreground">
                              {timeAgo(reply.createdAt)}
                            </span>
                            {canModerate(reply) && (
                              <button
                                type="button"
                                className="text-xs text-muted-foreground transition-colors hover:text-destructive"
                                onClick={() => handleDelete(reply._id)}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">
                            {reply.body}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {replyTo === message._id && (
                  <div className="mt-3 border-l border-border/70 pl-4">
                    <Composer
                      scope={scope}
                      gameSlug={gameSlug}
                      parentId={message._id}
                      placeholder={`Reply to ${nameOf(message)}…`}
                      autoFocus
                      onDone={() => setReplyTo(null)}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ReportDialog
        target={reporting}
        open={reporting !== null}
        onOpenChange={(open) => !open && setReporting(null)}
      />
    </div>
  );
}
