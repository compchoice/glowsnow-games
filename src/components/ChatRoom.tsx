import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useMemberDirectory } from "@/hooks/use-directory";
import { MemberAvatar } from "@/components/MemberAvatar";
import { ReactionBar } from "@/components/ReactionBar";
import { ReportDialog, type ReportTarget } from "@/components/ReportDialog";
import { Button } from "@/components/ui/button";
import {
  CHAT_MAX_BODY,
  clockLabel,
  groupChatMessages,
  memberName,
  typingLabel,
} from "@/lib/chat";
import { cn } from "@/lib/utils";
import { ArrowDown, Hash, Loader2, Send } from "lucide-react";

const HEARTBEAT_MS = 8_000;
const TYPING_THROTTLE_MS = 1_500;

/**
 * Builds the local echo of a message. Kept at module scope because it reads the
 * clock and a uuid — both need to happen when a message is sent, never during
 * render.
 */
function echoMessage(
  user: { _id: Id<"users">; name?: string | null; email?: string | null },
  body: string,
): Doc<"chatMessages"> {
  const now = Date.now();
  return {
    _id: crypto.randomUUID() as Id<"chatMessages">,
    _creationTime: now,
    authorId: user._id,
    authorName: memberName(user),
    body,
    createdAt: now,
  };
}

export function ChatRoom({
  channel,
  topic,
}: {
  channel: string;
  topic: string;
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const messages = useQuery(api.chat.list, { channel });
  const presence = useQuery(api.chat.presence, {});
  const heartbeat = useMutation(api.chat.heartbeat);
  const markRead = useMutation(api.chat.markRead);
  const leave = useMutation(api.chat.leave);

  /**
   * Optimistic send: the message is written straight into the local query
   * result, so it appears in the same frame as the click. Convex then swaps in
   * the server row and pushes it to every other open client over the socket.
   */
  const send = useMutation(api.chat.send).withOptimisticUpdate(
    (localStore, args) => {
      if (!user) return;
      const existing = localStore.getQuery(api.chat.list, { channel });
      if (existing === undefined) return;

      localStore.setQuery(api.chat.list, { channel }, [
        ...existing,
        echoMessage(user, args.body.trim()),
      ]);
    },
  );

  const directory = useMemberDirectory();

  // One reaction query for the whole visible room, rather than one per message.
  // The newest messages are the ones on screen, so take them from the end.
  const visibleIds = useMemo(
    () => (messages ?? []).map((message) => message._id as string),
    [messages],
  );
  const reactions = useQuery(
    api.reactions.forTargets,
    visibleIds.length > 0
      ? { targetType: "chat", targetIds: visibleIds.slice(-60) }
      : "skip",
  );

  const [reporting, setReporting] = useState<ReportTarget | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pinned, setPinned] = useState(true);
  const [missed, setMissed] = useState(0);
  const [seenCount, setSeenCount] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const lastTypingSentAt = useRef(0);

  const rows = useMemo(
    () => groupChatMessages(messages ?? [], user?._id ?? null),
    [messages, user?._id],
  );

  // Stay with the conversation: follow the newest message while pinned.
  // This effect is a pure DOM write — the missed counter is derived during
  // render below instead of being set from here.
  useEffect(() => {
    const element = listRef.current;
    if (!element || !pinned) return;
    element.scrollTop = element.scrollHeight;
  }, [rows.length, pinned]);

  // Adjust-during-render: how many messages have arrived while the reader was
  // scrolled away. Counted from the raw messages, not `rows`, which also holds
  // the day separators and would inflate the number.
  const messageCount = messages?.length ?? 0;
  if (pinned) {
    if (missed !== 0) setMissed(0);
    if (seenCount !== messageCount) setSeenCount(messageCount);
  } else if (messageCount > seenCount) {
    setMissed(messageCount - seenCount);
    setSeenCount(messageCount);
  }

  // A room counts as read once you are actually at the bottom of it.
  useEffect(() => {
    if (!pinned || !isAuthenticated) return;
    void markRead({ channel }).catch(() => undefined);
  }, [pinned, isAuthenticated, channel, rows.length, markRead]);

  // Presence: announce ourselves, keep the heartbeat going, leave on unmount.
  useEffect(() => {
    if (!isAuthenticated) return;
    void heartbeat({}).catch(() => undefined);
    const timer = window.setInterval(() => {
      void heartbeat({}).catch(() => undefined);
    }, HEARTBEAT_MS);
    return () => {
      window.clearInterval(timer);
      void leave().catch(() => undefined);
    };
  }, [isAuthenticated, heartbeat, leave]);

  const othersTyping = (presence?.typing ?? [])
    .filter((person) => person.userId !== user?._id)
    .map((person) => person.name.split(" ")[0]);
  const typing = typingLabel(othersTyping);

  function handleDraft(value: string) {
    setDraft(value);
    if (!isAuthenticated) return;
    const now = Date.now();
    if (now - lastTypingSentAt.current > TYPING_THROTTLE_MS) {
      lastTypingSentAt.current = now;
      void heartbeat({ typing: value.trim().length > 0 }).catch(() => undefined);
    }
  }

  async function submit() {
    const body = draft.trim();
    if (!body || !user) return;
    setError(null);
    setDraft("");
    setPinned(true);
    try {
      await send({ body, channel });
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "That didn't send.",
      );
      setDraft(body);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  function handleScroll() {
    const element = listRef.current;
    if (!element) return;
    const distance =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    const atBottom = distance < 80;
    setPinned(atBottom);
    if (atBottom) setMissed(0);
  }

  const draftRows = Math.min(4, Math.max(1, draft.split("\n").length));

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-card/50">
      {/* Room header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Hash className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium">{channel}</span>
          <span className="truncate text-xs text-muted-foreground">{topic}</span>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {presence === undefined
            ? "connecting…"
            : `${presence.onlineCount} online`}
        </span>
      </div>

      {/* Message log */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="relative flex-1 space-y-0.5 overflow-y-auto px-4 py-4"
      >
        {messages === undefined ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Loading the room…
          </p>
        ) : rows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">              <p className="text-sm font-medium">
                This is the start of #{channel}
              </p>
              <p className="text-sm text-muted-foreground">
                {isAuthenticated
                  ? "Say hi — everyone in the channel sees it instantly."
                  : "Sign in to start the conversation."}
              </p>
          </div>
        ) : (
          rows.map((row) =>
            row.kind === "day" ? (
              <div key={row.key} className="flex items-center justify-center py-3">
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-muted-foreground">
                  {row.label}
                </span>
              </div>
            ) : (
              <div
                key={row.key}
                className={cn(
                  "flex items-end gap-2.5",
                  row.mine && "flex-row-reverse",
                )}
              >
                <div className="w-8 shrink-0">
                  {row.showHeader ? (
                    <MemberAvatar
                      name={
                        directory.get(row.message.authorId)?.name ??
                        row.message.authorName
                      }
                      avatar={directory.get(row.message.authorId)?.avatar}
                      seed={row.message.authorId}
                    />
                  ) : null}
                </div>

                <div className={cn("min-w-0 max-w-[78%]", row.mine && "text-right")}>
                  {row.showHeader && (
                    <div
                      className={cn(
                        "mb-1 flex items-center gap-2 text-xs text-muted-foreground",
                        row.mine && "justify-end",
                      )}
                    >
                      {row.mine ? (
                        <span className="font-medium text-foreground/85">You</span>
                      ) : (
                        <Link
                          to={`/u/${row.message.authorId}`}
                          className="font-medium text-foreground/85 transition-colors hover:text-primary"
                        >
                          {directory.get(row.message.authorId)?.name ??
                            row.message.authorName}
                        </Link>
                      )}
                      <span>{clockLabel(row.message.createdAt)}</span>
                    </div>
                  )}
                  <p
                    className={cn(
                      "inline-block rounded-2xl px-3.5 py-2 text-left text-sm leading-relaxed break-words whitespace-pre-wrap",
                      row.mine
                        ? "rounded-br-md border border-primary/25 bg-primary/15"
                        : "rounded-bl-md bg-muted/60",
                    )}
                  >
                    {row.message.body}
                  </p>
                  <ReactionBar
                    targetType="chat"
                    targetId={row.message._id}
                    reactions={reactions?.[row.message._id] ?? []}
                    onReport={
                      isAuthenticated && !row.mine
                        ? () =>
                            setReporting({
                              type: "chat",
                              id: row.message._id,
                              label: `Report this message from ${row.message.authorName}: “${row.message.body.slice(0, 120)}”`,
                            })
                        : undefined
                    }
                  />
                </div>
              </div>
            ),
          )
        )}

        {(messages?.length ?? 0) >= 200 && (
          <p className="pt-3 pb-1 text-center text-[11px] text-muted-foreground">
            Showing the last 200 messages.
          </p>
        )}
      </div>

      {/* Typing indicator */}
      <div className="flex h-6 items-center gap-2 px-4 text-xs text-muted-foreground">
        {typing && (
          <>
            <span className="flex gap-0.5" aria-hidden>
              <span className="size-1 animate-pulse rounded-full bg-primary" />
              <span className="size-1 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
              <span className="size-1 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
            </span>
            <span>{typing}</span>
          </>
        )}
        {isAuthenticated && !typing && draft.length > 400 && (
          <span className="ml-auto">
            {draft.length}/{CHAT_MAX_BODY}
          </span>
        )}
      </div>

      {/* Composer */}
      {isLoading ? (
        <div className="border-t border-border/70 px-4 py-3 text-sm text-muted-foreground">
          Checking your session…
        </div>
      ) : isAuthenticated ? (
        <div className="border-t border-border/70 p-3">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
            className="flex items-end gap-2"
          >
            <textarea
              value={draft}
              onChange={(event) => handleDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={draftRows}
              maxLength={CHAT_MAX_BODY}
              placeholder={`Message #${channel}…  (Enter to send, Shift + Enter for a new line)`}
              className="min-h-10 flex-1 resize-none rounded-xl border border-input bg-background/60 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            <Button
              type="submit"
              size="icon-lg"
              aria-label="Send message"
              disabled={!draft.trim()}
            >
              <Send className="size-4" />
            </Button>
          </form>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-4 py-3 text-sm text-muted-foreground">
          <span>Sign in to join the chat — it takes a few seconds.</span>
          <Button asChild size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      )}

      {!pinned && (
        <button
          type="button"
          onClick={() => {
            setPinned(true);
            setMissed(0);
            setSeenCount(messageCount);
            const element = listRef.current;
            if (element) element.scrollTop = element.scrollHeight;
          }}
          className="absolute bottom-24 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <ArrowDown className="size-3.5" />
          {missed > 0
            ? `${missed} new ${missed === 1 ? "message" : "messages"}`
            : "Jump to latest"}
        </button>
      )}

      <ReportDialog
        target={reporting}
        open={reporting !== null}
        onOpenChange={(open) => !open && setReporting(null)}
      />
    </div>
  );
}
