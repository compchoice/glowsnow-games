import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useMemberDirectory } from "@/hooks/use-directory";
import { MemberAvatar } from "@/components/MemberAvatar";
import { Button } from "@/components/ui/button";
import {
  CHAT_MAX_BODY,
  clockLabel,
  groupChatMessages,
  memberName,
  typingLabel,
} from "@/lib/chat";
import { cn } from "@/lib/utils";
import { ArrowDown, Loader2, MessageSquare, Send } from "lucide-react";

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

export function ChatRoom() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const messages = useQuery(api.chat.list, {});
  const presence = useQuery(api.chat.presence, {});
  const heartbeat = useMutation(api.chat.heartbeat);
  const leave = useMutation(api.chat.leave);

  /**
   * Optimistic send: the message is written straight into the local query
   * result, so it appears in the same frame as the click. Convex then swaps in
   * the server row and pushes it to every other open client over the socket.
   */
  const send = useMutation(api.chat.send).withOptimisticUpdate(
    (localStore, args) => {
      if (!user) return;
      const existing = localStore.getQuery(api.chat.list, {});
      if (existing === undefined) return;

      localStore.setQuery(api.chat.list, {}, [
        ...existing,
        echoMessage(user, args.body.trim()),
      ]);
    },
  );

  const directory = useMemberDirectory();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pinned, setPinned] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const lastTypingSentAt = useRef(0);

  const rows = useMemo(
    () => groupChatMessages(messages ?? [], user?._id ?? null),
    [messages, user?._id],
  );

  // Stay with the conversation: follow the newest message while pinned.
  useEffect(() => {
    const element = listRef.current;
    if (!element || !pinned) return;
    element.scrollTop = element.scrollHeight;
  }, [rows.length, pinned]);

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
      await send({ body });
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
    setPinned(distance < 80);
  }

  const draftRows = Math.min(4, Math.max(1, draft.split("\n").length));

  return (
    <div className="relative flex h-[calc(100dvh-16rem)] min-h-[26rem] flex-col overflow-hidden rounded-xl border border-border/70 bg-card/50">
      {/* Room header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-primary" />
          <span className="text-sm font-medium">Lounge chat</span>
          <span className="text-xs text-muted-foreground">
            {presence === undefined
              ? "connecting…"
              : `${presence.onlineCount} online`}
          </span>
        </div>
        {presence && presence.onlineCount > 0 && (
          <span
            className="hidden max-w-[55%] truncate text-xs text-muted-foreground sm:block"
            title={presence.online.map((person) => person.name).join(", ")}
          >
            {presence.online.map((person) => person.name).join(", ")}
          </span>
        )}
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
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-sm text-muted-foreground">
              {isAuthenticated
                ? "Say hi — everyone in the room sees it instantly."
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
              placeholder="Message the room…  (Enter to send, Shift + Enter for a new line)"
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
            const element = listRef.current;
            if (element) element.scrollTop = element.scrollHeight;
          }}
          className="absolute bottom-24 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <ArrowDown className="size-3.5" />
          Jump to latest
        </button>
      )}
    </div>
  );
}
