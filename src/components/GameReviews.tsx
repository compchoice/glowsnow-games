import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link } from "react-router";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useMemberDirectory } from "@/hooks/use-directory";
import { MemberAvatar } from "@/components/MemberAvatar";
import { cn } from "@/lib/utils";
import { Star, Trash2 } from "lucide-react";

function timeAgo(timestamp: number) {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return "recently";
  }
}

function StarRow({
  value,
  onChange,
  readOnly,
}: {
  value: number;
  onChange?: (next: number) => void;
  readOnly?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
          className={cn(
            "transition-colors",
            readOnly ? "cursor-default" : "hover:text-primary",
          )}
        >
          <Star
            className={cn(
              "size-4",
              star <= Math.round(value)
                ? "fill-primary text-primary"
                : "text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </span>
  );
}

export function GameReviews({ gameSlug }: { gameSlug: string }) {
  const { isAuthenticated, user } = useAuth();
  const feed = useQuery(api.reviews.forGame, { gameSlug });
  const mine = useQuery(
    api.reviews.mine,
    isAuthenticated ? { gameSlug } : "skip",
  );
  const submit = useMutation(api.reviews.submit);
  const remove = useMutation(api.reviews.remove);
  const directory = useMemberDirectory();

  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Seed the form from an existing review without fighting the user's edits.
  const [seeded, setSeeded] = useState(false);
  if (mine && !seeded) {
    setRating(mine.rating);
    setBody(mine.body);
    setSeeded(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (rating === 0) {
      setError("Pick a star rating first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submit({ gameSlug, rating, body });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Ratings</h2>
        {feed && feed.count > 0 && feed.average !== null && (
          <>
            <StarRow value={feed.average} readOnly />
            <span className="text-sm text-muted-foreground">
              {feed.average.toFixed(1)} from {feed.count}{" "}
              {feed.count === 1 ? "review" : "reviews"}
            </span>
          </>
        )}
      </div>

      {/* Composer */}
      {isAuthenticated ? (
        <form
          className="mt-4 space-y-3 rounded-xl border border-border/70 bg-card/60 p-4"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {mine ? "Your rating" : "Rate it"}
            </span>
            <StarRow value={rating} onChange={setRating} />
            {mine && (
              <span className="text-xs text-muted-foreground">
                saving again replaces yours
              </span>
            )}
          </div>
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Anything you liked or didn't? (optional)"
            rows={2}
            maxLength={600}
            className="resize-none"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="sm" disabled={busy || rating === 0}>
            {busy ? "Saving…" : mine ? "Update review" : "Post review"}
          </Button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          <Link to="/auth" className="text-primary hover:underline">
            Sign in
          </Link>{" "}
          to rate this game.
        </p>
      )}

      {/* List */}
      <div className="mt-5">
        {feed === undefined ? (
          <p className="text-sm text-muted-foreground">Loading reviews…</p>
        ) : feed.reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No ratings yet. Be the first.
          </p>
        ) : (
          <ul className="space-y-4">
            {feed.reviews.map((review) => {
              const member = directory.get(review.userId);
              return (
                <li key={review._id} className="flex gap-3">
                  <MemberAvatar
                    name={member?.name ?? review.author}
                    avatar={member?.avatar}
                    seed={review.userId}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/u/${review.userId}`}
                        className="text-sm font-medium hover:text-primary"
                      >
                        {member?.name ?? review.author}
                      </Link>
                      <StarRow value={review.rating} readOnly />
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(review.createdAt)}
                        {review.updatedAt ? " · edited" : ""}
                      </span>
                      {review.userId === user?._id && (
                        <button
                          type="button"
                          aria-label="Delete your review"
                          onClick={() =>
                            void remove({ id: review._id as Id<"reviews"> })
                          }
                          className="text-xs text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                    {review.body && (
                      <p className="mt-1 text-sm whitespace-pre-wrap text-foreground/90">
                        {review.body}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
