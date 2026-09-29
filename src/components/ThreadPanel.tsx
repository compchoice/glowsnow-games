import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Plus, X } from "lucide-react";

/**
 * Threads in a channel. A thread is a titled side conversation, so a busy room
 * can set something off without burying it.
 */
export function ThreadPanel({ channel }: { channel: string }) {
  const { isAuthenticated } = useAuth();
  const threads = useQuery(api.threads.list, { channel });
  const create = useMutation(api.threads.create);
  const reply = useMutation(api.threads.reply);

  const [starting, setStarting] = useState(false);
  const [title, setTitle] = useState("");
  const [openId, setOpenId] = useState<Id<"threads"> | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const open = useQuery(
    api.threads.thread,
    openId ? { threadId: openId } : "skip",
  );

  async function start() {
    const text = title.trim();
    if (!text) {
      setError("Give the thread a title.");
      return;
    }
    setError(null);
    try {
      const id = await create({ channel, title: text });
      setTitle("");
      setStarting(false);
      setOpenId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start that thread.");
    }
  }

  async function send() {
    if (!openId || !draft.trim()) return;
    try {
      await reply({ threadId: openId, body: draft });
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reply.");
    }
  }

  return (
    <section className="rounded-xl border border-border/70 bg-card/60">
      <div className="flex items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <MessageSquare className="size-3.5" />
          Threads in #{channel}
        </p>
        {isAuthenticated && !starting && (
          <Button variant="ghost" size="sm" onClick={() => setStarting(true)}>
            <Plus className="size-3.5" />
            New
          </Button>
        )}
      </div>

      {starting && (
        <div className="space-y-2 border-b border-border/70 p-3">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What is this about?"
            maxLength={80}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStarting(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={start}>
              Start thread
            </Button>
          </div>
        </div>
      )}

      {error && <p className="px-4 pt-2 text-xs text-destructive">{error}</p>}

      {(threads ?? []).length === 0 && !starting && (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          No threads here yet.
        </p>
      )}

      <ul className="divide-y divide-border/40">
        {(threads ?? []).map((thread) => (
          <li key={thread._id}>
            <button
              type="button"
              onClick={() =>
                setOpenId(openId === thread._id ? null : (thread._id as Id<"threads">))
              }
              className="flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/40"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {thread.title}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {thread.authorName} · {formatDistanceToNow(thread.lastReplyAt, { addSuffix: true })}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                {thread.replyCount}
              </span>
            </button>

            {openId === thread._id && (
              <div className="space-y-2 bg-muted/25 px-4 py-3">
                {(open?.replies ?? []).map((row) => (
                  <div key={row._id} className="text-sm">
                    <span className="mr-2 text-xs font-medium text-muted-foreground">
                      {row.authorName}
                    </span>
                    <span className="whitespace-pre-wrap break-words">{row.body}</span>
                  </div>
                ))}
                {open && open.replies.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No replies yet.
                  </p>
                )}

                {isAuthenticated && (
                  <div className="flex flex-col gap-2 pt-1">
                    <Textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      rows={2}
                      maxLength={500}
                      placeholder="Reply in this thread…"
                    />
                    <div className="flex justify-end">
                      <Button size="sm" onClick={send} disabled={!draft.trim()}>
                        Reply
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {openId && (
        <div className="border-t border-border/70 p-2">
          <Button variant="ghost" size="sm" onClick={() => setOpenId(null)}>
            <X className="size-3.5" />
            Close thread
          </Button>
        </div>
      )}
    </section>
  );
}
