import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { PageShell } from "@/components/Layout";
import { MemberAvatar } from "@/components/MemberAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ReportDialog, type ReportTarget } from "@/components/ReportDialog";
import { Eyebrow } from "@/components/SiteChrome";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Send } from "lucide-react";

/**
 * Private messages. The list is one row per partner, so opening the page is a
 * single query rather than a scan of every message.
 */
export default function Messages() {
  const { isAuthenticated } = useAuth();
  const conversations = useQuery(api.dms.conversations, isAuthenticated ? {} : "skip");
  // A profile's "Message" button links here with ?with=<id>, so the right
  // conversation is already open.
  const [params, setParams] = useSearchParams();
  const withParam = params.get("with");
  const [chosen, setChosen] = useState<string | null>(null);
  const partnerId = chosen ?? withParam;
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState<ReportTarget | null>(null);

  const thread = useQuery(
    api.dms.thread,
    isAuthenticated && partnerId ? { partnerId } : "skip",
  );
  const send = useMutation(api.dms.send);
  const markRead = useMutation(api.dms.markRead);

  async function open(id: string) {
    setChosen(id);
    setError(null);
    // Clears the unread badge for this partner without waiting for a refetch.
    void markRead({ partnerId: id }).catch(() => undefined);
  }

  async function submit() {
    if (!partnerId) return;
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    try {
      await send({ partnerId, body: text });
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that.");
    } finally {
      setBusy(false);
    }
  }

  const active = conversations?.find((row) => row.partnerId === partnerId);

  return (
    <PageShell>
      <header>
        <Eyebrow>Private</Eyebrow>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">Messages</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          One-to-one conversations with other members. Only the two of you can read
          them.
        </p>
      </header>

      <div className="mt-6 grid gap-5 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <div className="rounded-xl border border-border/70 bg-card/60">
          <p className="border-b border-border/70 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Conversations
          </p>
          {conversations && conversations.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Nothing yet. Open someone&apos;s profile and send them a message.
            </p>
          )}
          <ul className="max-h-[420px] overflow-y-auto">
            {(conversations ?? []).map((row) => (
              <li key={row.partnerId}>
                <button
                  type="button"
                  onClick={() => {
                    void open(row.partnerId);
                    setParams({}, { replace: true });
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                    row.partnerId === partnerId ? "bg-muted/60" : ""
                  }`}
                >
                  <MemberAvatar
                    name={row.partnerName}
                    avatar={row.partnerAvatar}
                    seed={row.partnerId}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {row.partnerName}
                      </span>
                      {row.unread > 0 && (
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                          {row.unread}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {row.lastBody}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex min-h-[420px] flex-col rounded-xl border border-border/70 bg-card/60">
          {!partnerId ? (
            <p className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
              Pick somebody on the left to read the conversation.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
                <Link
                  to={`/u/${partnerId}`}
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  {active?.partnerName ?? "Conversation"}
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setReporting({
                      type: "user",
                      id: partnerId,
                      label: `Report ${active?.partnerName ?? "this member"}`,
                    })
                  }
                >
                  Report
                </Button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {(thread?.messages ?? []).map((message) => (
                  <div
                    key={message._id}
                    className={`flex ${message.mine ? "justify-end" : "justify-start"}`}
                  >
                    <p
                      className={`max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                        message.mine
                          ? "rounded-br-md border border-primary/25 bg-primary/15"
                          : "rounded-bl-md bg-muted/60"
                      }`}
                    >
                      {message.body}
                      <span className="mt-1 block text-[10px] text-muted-foreground">
                        {formatDistanceToNow(message.createdAt, { addSuffix: true })}
                      </span>
                    </p>
                  </div>
                ))}
                {thread && thread.messages.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No messages yet. Say hello.
                  </p>
                )}
              </div>

              <div className="border-t border-border/70 p-3">
                <Textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void submit();
                    }
                  }}
                  rows={2}
                  maxLength={1000}
                  placeholder="Write a message…"
                />
                {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
                <div className="mt-2 flex justify-end">
                  <Button onClick={submit} disabled={busy || !body.trim()} size="sm">
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    Send
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <ReportDialog
        target={reporting}
        open={reporting !== null}
        onOpenChange={(open) => !open && setReporting(null)}
      />
    </PageShell>
  );
}

/** Used by a profile's "Message" button, which opens the conversation. */
export function DmLink({ userId }: { userId: string }) {
  return (
    <Button asChild variant="outline" size="sm">
      <Link to={`/messages?with=${userId}`}>Message</Link>
    </Button>
  );
}
