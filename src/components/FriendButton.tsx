import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Check, UserCheck, UserPlus, UserX, X } from "lucide-react";

/**
 * Friend controls on a member's profile. Every answer comes from the server, so
 * nothing is shown where it would not be allowed — a request is only ever
 * visible to the two people involved.
 */
export function FriendButton({
  userId,
  name,
}: {
  userId: Id<"users">;
  name: string;
}) {
  const { isAuthenticated } = useAuth();
  const status = useQuery(
    api.friends.status,
    isAuthenticated ? { userId } : "skip",
  );
  const send = useMutation(api.friends.request);
  const respond = useMutation(api.friends.respond);
  const cancel = useMutation(api.friends.cancel);
  const unfriend = useMutation(api.friends.remove);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isAuthenticated) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link to="/auth?returnTo=%2Fcommunity">
          <UserPlus className="size-4" />
          Sign in to add a friend
        </Link>
      </Button>
    );
  }

  async function run(action: () => Promise<unknown>, fallback: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  const state = status?.state;
  const requestId = (status as { requestId?: string } | undefined)?.requestId;

  let body;
  switch (state) {
    case undefined:
      body = (
        <Button variant="outline" size="sm" disabled>
          Loading…
        </Button>
      );
      break;
    case "self":
      body = null;
      break;
    case "none":
      body = (
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => void run(() => send({ userId }), "Could not send that request.")}
        >
          <UserPlus className="size-4" />
          Add friend
        </Button>
      );
      break;
    case "outgoing":
      body = (
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 rounded-lg border border-border/70 px-3 py-1.5 text-sm text-muted-foreground">
            <UserCheck className="size-4" />
            Request sent
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy || !requestId}
            onClick={() =>
              void run(
                () => cancel({ requestId: requestId as Id<"friendships"> }),
                "Could not cancel that request.",
              )
            }
          >
            Cancel
          </Button>
        </div>
      );
      break;
    case "incoming":
      body = (
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 rounded-lg border border-primary/35 bg-primary/10 px-3 py-1.5 text-sm text-primary">
            <UserPlus className="size-4" />
            Wants to be friends
          </span>
          <Button
            size="sm"
            disabled={busy || !requestId}
            onClick={() =>
              void run(
                () =>
                  respond({
                    requestId: requestId as Id<"friendships">,
                    accept: true,
                  }),
                "Could not accept that request.",
              )
            }
          >
            <Check className="size-4" />
            Accept
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy || !requestId}
            onClick={() =>
              void run(
                () =>
                  respond({
                    requestId: requestId as Id<"friendships">,
                    accept: false,
                  }),
                "Could not decline that request.",
              )
            }
          >
            <X className="size-4" />
            Decline
          </Button>
        </div>
      );
      break;
    case "friends":
      body = (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-lg border border-primary/35 bg-primary/10 px-3 py-1.5 text-sm text-primary">
            <UserCheck className="size-4" />
            Friends with {name}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() =>
              void run(() => unfriend({ userId }), "Could not remove that friend.")
            }
          >
            <UserX className="size-4" />
            Remove
          </Button>
        </div>
      );
      break;
    default:
      body = null;
  }

  if (!body && !error) return null;

  return (
    <div className="space-y-2">
      {body}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
