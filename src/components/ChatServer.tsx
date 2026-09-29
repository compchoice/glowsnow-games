import { useMutation, useQuery } from "convex/react";
import { Link, useSearchParams } from "react-router";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ChatRoom } from "@/components/ChatRoom";
import { ThreadPanel } from "@/components/ThreadPanel";
import { MemberAvatar } from "@/components/MemberAvatar";
import { useMemberDirectory } from "@/hooks/use-directory";
import { useCatalog } from "@/hooks/use-catalog";
import { cn } from "@/lib/utils";
import { Crown, Hash, Shield, UserRound } from "lucide-react";

/**
 * The chat, laid out like a chat server: rooms down the left, the active
 * conversation in the middle, who is around on the right. The friend panel
 * shows only the signed-in member's own requests.
 */
export function ChatServer() {
  const channels = useQuery(api.chat.channels);
  const presence = useQuery(api.chat.presence, {});
  const unread = useQuery(api.chat.unread, {});
  const friends = useQuery(api.friends.mine);
  const directory = useMemberDirectory();
  const { games } = useCatalog();
  const [params, setParams] = useSearchParams();

  const rooms = channels ?? [];
  // The room lives in the URL so a channel can be linked to and survives reload.
  const wanted = params.get("channel");
  const active =
    rooms.find((room) => room.id === wanted) ??
    (wanted ? null : (rooms[0] ?? null));

  const featured = games.filter((game) => game.featured).slice(0, 3);

  if (!active) {
    return (
      <div className="rounded-xl border border-border/70 px-6 py-16 text-center text-sm text-muted-foreground">
        Loading the server…
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[13rem_minmax(0,1fr)_15rem]">
      {/* Channel sidebar */}
      <aside className="flex flex-col gap-1 rounded-xl border border-border/70 bg-card/50 p-2">
        <p className="px-2 pt-1 pb-2 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Dex:Active
        </p>
        {rooms.map((room) => {
          const count = unread?.channels[room.id] ?? 0;
          const isActive = room.id === active.id;
          return (
            <Link
              key={room.id}
              to={`/chat?channel=${room.id}`}
              onClick={(event) => {
                // Keep the URL tidy without a full navigation.
                event.preventDefault();
                setParams({ channel: room.id });
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-primary/15 font-medium text-primary"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <Hash className="size-3.5 shrink-0" />
              <span className="truncate">{room.label}</span>
              {count > 0 && !isActive && (
                <span className="ml-auto flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          );
        })}

        {featured.length > 0 && (
          <div className="mt-3 border-t border-border/70 pt-3">
            <p className="px-2 pb-1.5 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Now playing
            </p>
            {featured.map((game) => (
              <Link
                key={game.slug}
                to={`/games/${game.slug}`}
                className="block truncate rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
              >
                {game.title}
              </Link>
            ))}
          </div>
        )}
      </aside>

      {/* Conversation */}
      <div className="flex min-w-0 flex-col gap-3">
        <div className="overflow-hidden rounded-xl border border-border/70">
          <ChatRoom channel={active.id} topic={active.topic} />
        </div>
        <ThreadPanel channel={active.id} />
      </div>

      {/* Member list */}
      <aside className="flex flex-col gap-1 rounded-xl border border-border/70 bg-card/50 p-2">
        <p className="px-2 pt-1 pb-2 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Online — {presence?.onlineCount ?? 0}
        </p>

        {(presence?.online ?? []).length === 0 && (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            Nobody else is here yet.
          </p>
        )}

        {(presence?.online ?? []).map((person) => {
          const member = directory.get(person.userId);
          return (
            <Link
              key={person.userId}
              to={`/u/${person.userId}`}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/60"
            >
              <span className="relative">
                <MemberAvatar
                  name={member?.name ?? person.name}
                  avatar={member?.avatar}
                  seed={person.userId}
                  size="sm"
                />
                <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-card bg-emerald-500" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">
                {member?.name ?? person.name}
              </span>
              {member?.role === "admin" && (
                <Crown className="size-3.5 shrink-0 text-primary" />
              )}
              {member?.role === "moderator" && (
                <Shield className="size-3.5 shrink-0 text-primary" />
              )}
            </Link>
          );
        })}

        {friends && friends.incoming.length > 0 && (
          <div className="mt-3 border-t border-border/70 pt-3">
            <p className="px-2 pb-1.5 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Friend requests
            </p>
            {friends.incoming.map((request) => (
              <FriendRequestRow
                key={request._id}
                id={request._id}
                userId={request.userId}
                name={request.name}
              />
            ))}
            <Link
              to="/dashboard"
              className="mt-1 block px-2 text-[11px] text-primary hover:underline"
            >
              See all on your dashboard
            </Link>
          </div>
        )}

        {friends && friends.friends.length > 0 && (
          <div className="mt-3 border-t border-border/70 pt-3">
            <p className="px-2 pb-1.5 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Friends — {friends.friends.length}
            </p>
            {friends.friends.map((friend) => (
              <Link
                key={friend.userId}
                to={`/u/${friend.userId}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent/60"
              >
                <UserRound className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{friend.name}</span>
              </Link>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

function FriendRequestRow({
  id,
  userId,
  name,
}: {
  id: string;
  userId: string;
  name: string;
}) {
  const respond = useMutation(api.friends.respond);
  const requestId = id as Id<"friendships">;

  return (
    <div className="rounded-lg px-2 py-1.5">
      <Link
        to={`/u/${userId}`}
        className="block truncate text-sm hover:text-primary"
      >
        {name}
      </Link>
      <p className="text-[11px] text-muted-foreground">wants to be friends</p>
      <div className="mt-1.5 flex gap-1">
        <button
          type="button"
          onClick={() => void respond({ requestId, accept: true })}
          className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[11px] text-primary transition-colors hover:bg-primary/25"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() => void respond({ requestId, accept: false })}
          className="rounded-md border border-border/70 px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Ignore
        </button>
      </div>
    </div>
  );
}
