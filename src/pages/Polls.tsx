import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { PageShell } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eyebrow } from "@/components/SiteChrome";
import { ReportDialog, type ReportTarget } from "@/components/ReportDialog";
import { MAX_POLL_OPTIONS, validatePoll } from "@/lib/engagement";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Plus, X } from "lucide-react";

/** Community polls. One vote per member, and a vote can be taken back. */
export default function Polls() {
  const { isAuthenticated } = useAuth();
  const polls = useQuery(api.polls.list);
  const vote = useMutation(api.polls.vote);
  const create = useMutation(api.polls.create);
  const close = useMutation(api.polls.close);

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState<ReportTarget | null>(null);

  async function submit() {
    const check = validatePoll(question, options);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await create({ question, options: check.options });
      setQuestion("");
      setOptions(["", ""]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start that poll.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <header>
        <Eyebrow>Community</Eyebrow>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">Polls</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          One vote each, and you can change it until the poll closes.
        </p>
      </header>

      {isAuthenticated && (
        <section className="mt-6 rounded-xl border border-border/70 bg-card/60 p-4">
          <p className="text-sm font-medium">Start a poll</p>
          <div className="mt-3 space-y-2">
            <Input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="What should we play next?"
              maxLength={120}
            />
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={option}
                  onChange={(event) =>
                    setOptions((current) =>
                      current.map((value, i) =>
                        i === index ? event.target.value : value,
                      ),
                    )
                  }
                  placeholder={`Choice ${index + 1}`}
                  maxLength={40}
                  onKeyDown={(event) => {
                    // Enter on a blank choice adds the next one, rather than
                    // submitting a half-finished poll.
                    if (
                      event.key === "Enter" &&
                      !event.currentTarget.value.trim() &&
                      options.length < MAX_POLL_OPTIONS
                    ) {
                      event.preventDefault();
                      setOptions((current) => [...current, ""]);
                    }
                  }}
                />
                {options.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove choice ${index + 1}`}
                    onClick={() =>
                      setOptions((current) =>
                        current.filter((_, i) => i !== index),
                      )
                    }
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            ))}
            {options.length < MAX_POLL_OPTIONS && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOptions((current) => [...current, ""])}
              >
                <Plus className="size-3.5" />
                Add a choice
              </Button>
            )}
          </div>

          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <Button onClick={submit} disabled={busy} className="mt-3" size="sm">
            {busy && <Loader2 className="size-4 animate-spin" />}
            Post the poll
          </Button>
        </section>
      )}

      <div className="mt-6 space-y-4">
        {(polls ?? []).length === 0 && (
          <p className="rounded-xl border border-border/70 bg-card/60 px-4 py-10 text-center text-sm text-muted-foreground">
            No polls yet. {isAuthenticated ? "Start the first one." : "Sign in to start one."}
          </p>
        )}

        {(polls ?? []).map((poll) => (
          <article
            key={poll._id}
            className="rounded-xl border border-border/70 bg-card/60 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="font-medium">{poll.question}</h2>
              <div className="flex items-center gap-2">
                {poll.closed && (
                  <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    closed
                  </span>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setReporting({
                      type: "poll",
                      id: poll._id,
                      label: `Report the poll: “${poll.question}”`,
                    })
                  }
                  disabled={!isAuthenticated}
                  className="text-[11px] text-muted-foreground/70 underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
                >
                  Report
                </button>
              </div>
            </div>

            <ul className="mt-3 space-y-2">
              {poll.options.map((option, index) => {
                const share = poll.total === 0 ? 0 : poll.counts[index];
                const leading = poll.leaderIndex === index && poll.total > 0;
                return (
                  <li key={option}>
                    <button
                      type="button"
                      disabled={poll.closed || !isAuthenticated}
                      onClick={() => void vote({ pollId: poll._id, optionIndex: index })}
                      className="group relative block w-full overflow-hidden rounded-lg border border-border/70 text-left transition-colors hover:border-primary/40 disabled:cursor-not-allowed"
                    >
                      <span
                        className={`absolute inset-y-0 left-0 transition-all ${
                          leading ? "bg-primary/20" : "bg-muted/40"
                        }`}
                        style={{ width: `${share}%` }}
                      />
                      <span className="relative flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <span className="flex items-center gap-2">
                          {poll.myVote === index && (
                            <span className="text-primary">●</span>
                          )}
                          {option}
                        </span>
                        <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                          {poll.counts[index]}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <p className="mt-2 text-xs text-muted-foreground">
              {poll.total} {poll.total === 1 ? "vote" : "votes"} ·{" "}
              {poll.endsAt
                ? `${poll.closed ? "closed" : "closes"} ${formatDistanceToNow(poll.endsAt, { addSuffix: true })}`
                : "no closing date"}{" "}
              · asked by {poll.authorName}
              {!poll.closed && isAuthenticated && (
                <>
                  {" · "}
                  <button
                    type="button"
                    onClick={() => void close({ pollId: poll._id })}
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    close it
                  </button>
                </>
              )}
            </p>
          </article>
        ))}
      </div>

      <ReportDialog
        target={reporting}
        open={reporting !== null}
        onOpenChange={(open) => !open && setReporting(null)}
      />
    </PageShell>
  );
}
