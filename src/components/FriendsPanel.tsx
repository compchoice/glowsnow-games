import { useMutation, useQuery } from "convex/react";
import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MemberAvatar } from "@/components/MemberAvatar";
import { useMemberDirectory } from "@/hooks/use-directory";
import { Button } from "@/components/ui/button";
import { UserRound, Users } from "lucide-react";

/**
 * A member's friends and pending requests. Everything shown here comes from
 * `friends.mine`, which only ever returns the caller's own relationships.
 */
export function FriendsPanel({
  compact = false,
}: {
  /** Sidebar mode: fewer rows, no heading, smaller targets. */
  compact?: boolean;
}) {
  const friends = useQuery(api.friends.mine);
  const directory = useMemberDirectory();

  if (friends === undefined) {
    return (
      <p className="text-sm text-muted-foreground">Loading your people…</p>
    );
  }

  const nothing =
    friends.friends.length === 0 &&
    friends.incoming.length === 0 &&
    friends.outgoing.length === 0;

  if (nothing) {
    return (
      <p className="text-sm text-muted-foreground">
        No friends yet. Open somebody&apos;s profile from the lounge and send a
        request.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {friends.incoming.length > 0 && (
        <div>
          <SectionLabel
            count={friends.incoming.length}
            label="Wants to be friends"
          />
          <ul className="mt-2 space-y-2">
            {friends.incoming.map((request) => (
              <IncomingRequest
                key={request._id}
                id={request._id}
                userId={request.userId}
                name={request.name}
                compact={compact}
              />
            ))}
          </ul>
        </div>
      )}

      {friends.friends.length > 0 && (
        <div>
          <SectionLabel count={friends.friends.length} label="Friends" />
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {friends.friends.map((friend) => {
              const member = directory.get(friend.userId);
              return (
                <li key={friend.userId}>
                  <Link
                    to={`/u/${friend.userId}`}
                    className="flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2 transition-colors hover:border-primary/40"
                  >
                    <MemberAvatar
                      name={member?.name ?? friend.name}
                      avatar={member?.avatar}
                      seed={friend.userId}
                      size="sm"
                    />
                    <span className="truncate text-sm">
                      {member?.name ?? friend.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {friends.outgoing.length > 0 && (
        <div>
          <SectionLabel count={friends.outgoing.length} label="Sent" />
          <ul className="mt-2 space-y-1.5">
            {friends.outgoing.map((request) => (
              <li
                key={request._id}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <UserRound className="size-3.5 shrink-0" />
                <span className="truncate">{request.name}</span>
                <span className="ml-auto shrink-0 text-xs">waiting</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ count, label }: { count: number; label: string }) {
  return (
    <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
      <Users className="size-3" />
      {label} — {count}
    </p>
  );
}

function IncomingRequest({
  id,
  userId,
  name,
  compact,
}: {
  id: string;
  userId: string;
  name: string;
  compact: boolean;
}) {
  const respond = useMutation(api.friends.respond);
  const directory = useMemberDirectory();
  const requestId = id as Id<"friendships">;
  const member = directory.get(userId);

  return (
    <li className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
      <Link
        to={`/u/${userId}`}
        className="flex items-center gap-2 text-sm font-medium hover:text-primary"
      >
        <MemberAvatar
          name={member?.name ?? name}
          avatar={member?.avatar}
          seed={userId}
          size="sm"
        />
        <span className="truncate">{member?.name ?? name}</span>
      </Link>
      <div className="mt-2 flex gap-1.5">
        <Button
          size="sm"
          className="h-7"
          onClick={() => void respond({ requestId, accept: true })}
        >
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          onClick={() => void respond({ requestId, accept: false })}
        >
          {compact ? "No" : "Ignore"}
        </Button>
      </div>
    </li>
  );
}
