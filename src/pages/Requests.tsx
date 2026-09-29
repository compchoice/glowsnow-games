import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PageShell } from "@/components/Layout";
import { Eyebrow } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Lightbulb,
  MessageSquare,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";

const STATUSES = ["open", "planned", "done", "declined"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_STYLE: Record<Status, string> = {
  open: "border-border/70 text-muted-foreground",
  planned: "border-primary/35 bg-primary/10 text-primary",
  done: "border-emerald-500/35 bg-emerald-500/10 text-emerald-400",
  declined: "border-border/70 text-muted-foreground/70",
};

const STATUS_LABEL: Record<Status, string> = {
  open: "Open",
  planned: "Planned",
  done: "Shipped",
  declined: "Not doing it",
};

function timeAgo(timestamp: number) {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return "recently";
  }
}

export default function Requests() {
  const { isAuthenticated } = useAuth();
  const requests = useQuery(api.requests.list);
  const create = useMutation(api.requests.create);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Status | "all">("all");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (requests ?? []).filter((row) => {
      if (filter !== "all" && row.status !== filter) return false;
      if (!needle) return true;
      return (
        row.title.toLowerCase().includes(needle) ||
        row.body.toLowerCase().includes(needle) ||
        row.author.toLowerCase().includes(needle)
      );
    });
  }, [requests, query, filter]);

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: requests?.length ?? 0 };
    for (const status of STATUSES) {
      base[status] = (requests ?? []).filter((r) => r.status === status).length;
    }
    return base;
  }, [requests]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await create({ title, body });
      setTitle("");
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post that.");
    } finally {
      setBusy(false);
    }
  }

  const open = (requests ?? []).filter((row) => row.status === "open").length;

  return (
    <PageShell>
      <header>
        <Eyebrow>The suggestion board</Eyebrow>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">
          Ask for something
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Want a game added, or a bit of the interface changed? Put it here.
          Moderators and the owner reply on each thread, and requests get marked
          as planned or shipped once they are under way.
        </p>
        {open > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            {open} open {open === 1 ? "request" : "requests"} right now.
          </p>
        )}
      </header>

      <section className="mt-8 rounded-xl border border-border/70 bg-card/60 p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Lightbulb className="size-4 text-primary" />
          New request
        </h2>

        {!isAuthenticated ? (
          <p className="mt-3 text-sm text-muted-foreground">
            <Link to="/auth?returnTo=%2Frequests" className="text-primary hover:underline">
              Sign in
            </Link>{" "}
            to put a request up. Anyone on the site can read the board.
          </p>
        ) : (
          <form className="mt-4 space-y-3" onSubmit={handleCreate}>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground" htmlFor="request-title">
                What would you like?
              </label>
              <Input
                id="request-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Add Minesweeper to the arcade"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground" htmlFor="request-body">
                A little more detail
              </label>
              <Textarea
                id="request-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="The other puzzle games are great — a minesweeper with the same one-click embed would fit right in."
                rows={3}
                maxLength={1_000}
                className="resize-none"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="sm" disabled={busy || !title.trim() || !body.trim()}>
              <Send className="size-3.5" />
              {busy ? "Posting…" : "Post request"}
            </Button>
          </form>
        )}
      </section>

      <div className="mt-8 space-y-4">
        {/* Filter + search */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search requests…"
            aria-label="Search requests"
            className="h-9 w-full sm:w-64"
          />
          <div className="flex flex-wrap gap-1.5">
            {(["all", ...STATUSES] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  filter === option
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/70 text-muted-foreground hover:text-foreground",
                )}
              >
                {option === "all" ? "All" : STATUS_LABEL[option]}{" "}
                <span className="opacity-60">{counts[option] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        {requests === undefined ? (
          <p className="text-sm text-muted-foreground">Loading the board…</p>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 px-6 py-12 text-center text-sm text-muted-foreground">
            {requests.length === 0
              ? "Nothing here yet. Be the first to ask for something."
              : "No requests match that."}
          </div>
        ) : (
          visible.map((row) => (
            <RequestCard
              key={row._id}
              request={row}
              isAuthenticated={isAuthenticated}
            />
          ))
        )}
      </div>
    </PageShell>
  );
}

function RequestCard({
  request,
  isAuthenticated,
}: {
  request: {
    _id: Id<"requests">;
    authorId: Id<"users">;
    author: string;
    title: string;
    body: string;
    status: Status;
    createdAt: number;
    comments: {
      _id: Id<"requestComments">;
      authorId: Id<"users">;
      author: string;
      authorRole: string;
      body: string;
      createdAt: number;
    }[];
  };
  isAuthenticated: boolean;
}) {
  const status = useQuery(api.users.adminStatus, isAuthenticated ? {} : "skip");
  const comment = useMutation(api.requests.comment);
  const setStatus = useMutation(api.requests.setStatus);
  const remove = useMutation(api.requests.remove);
  const removeComment = useMutation(api.requests.removeComment);
  const me = useQuery(api.users.currentUser, isAuthenticated ? {} : "skip");

  const isAdmin = status?.isAdmin ?? false;
  const isMod = status?.isModerator ?? false;
  const mine = me?._id === request.authorId;
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleReply(event: React.FormEvent) {
    event.preventDefault();
    if (!reply.trim()) return;
    setError(null);
    try {
      await comment({ requestId: request._id, body: reply });
      setReply("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post that reply.");
    }
  }

  return (
    <article className="rounded-xl border border-border/70 bg-card/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">{request.title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {request.author} · {timeAgo(request.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <select
              value={request.status}
              onChange={(event) =>
                void setStatus({
                  requestId: request._id,
                  status: event.target.value as Status,
                })
              }
              aria-label={`Status for ${request.title}`}
              className="rounded-md border border-border/70 bg-background px-2 py-1 text-xs"
            >
              {STATUSES.map((option) => (
                <option key={option} value={option}>
                  {STATUS_LABEL[option]}
                </option>
              ))}
            </select>
          )}
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
              STATUS_STYLE[request.status],
            )}
          >
            {STATUS_LABEL[request.status]}
          </span>
          {(mine || isAdmin) && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Withdraw ${request.title}`}
              className="text-muted-foreground hover:text-destructive"
              onClick={() => void remove({ requestId: request._id })}
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm whitespace-pre-wrap text-foreground/90">
        {request.body}
      </p>

      {request.comments.length > 0 && (
        <ul className="mt-4 space-y-3 border-l-2 border-primary/25 pl-4">
          {request.comments.map((entry) => (
            <li key={entry._id}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{entry.author}</span>
                {(entry.authorRole === "admin" || entry.authorRole === "moderator") && (
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {entry.authorRole === "admin" ? "Owner" : "Moderator"}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {timeAgo(entry.createdAt)}
                </span>
                {(entry.authorId === me?._id || isMod) && (
                  <button
                    type="button"
                    onClick={() => void removeComment({ commentId: entry._id })}
                    className="text-xs text-muted-foreground transition-colors hover:text-destructive"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm whitespace-pre-wrap text-foreground/90">
                {entry.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      {isMod ? (
        <form className="mt-4 space-y-2" onSubmit={handleReply}>
          <Textarea
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            placeholder={
              request.status === "open"
                ? "We can do this — it's on the list."
                : "Add a note for the person who asked…"
            }
            rows={2}
            maxLength={600}
            className="resize-none"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" size="sm" disabled={!reply.trim()}>
            <MessageSquare className="size-3.5" />
            Reply as {status?.isAdmin ? "owner" : "moderator"}
          </Button>
        </form>
      ) : (
        request.status === "done" && (
          <p className="mt-4 flex items-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            This one shipped.
          </p>
        )
      )}

      {request.status === "declined" && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <XCircle className="size-3.5" />
          The owner marked this as one they are not doing.
        </p>
      )}
    </article>
  );
}
