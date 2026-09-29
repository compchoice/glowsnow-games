import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AtSign,
  Bell,
  CornerDownRight,
  MessageSquare,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const KIND_ICON = {
  lounge: MessageSquare,
  reply: CornerDownRight,
  mention: AtSign,
  request: UserPlus,
} as const;

function timeAgo(timestamp: number) {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return "just now";
  }
}

/** New lounge messages, replies to your posts, and chat mentions. */
export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const feed = useQuery(api.notifications.list, isAuthenticated ? {} : "skip");
  const markSeen = useMutation(api.notifications.markSeen);
  const respond = useMutation(api.friends.respond);

  if (!isAuthenticated) return null;

  const items = feed?.items ?? [];
  const unread = feed?.unreadCount ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          className="relative border-border/70 text-muted-foreground hover:text-foreground"
          aria-label={
            unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
          }
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b border-border/70 px-3 py-2">
          <span className="text-sm font-medium">Notifications</span>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => void markSeen()}
              className="text-xs text-primary transition-opacity hover:opacity-80"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {feed === undefined ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          ) : items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="divide-y divide-border/70">
              {items.map((item) => {
                const Icon = KIND_ICON[item.kind];
                return (
                  <li key={item.key}>
                    <Link
                      to={item.href}
                      onClick={() => void markSeen()}
                      className={cn(
                        "flex gap-2.5 px-3 py-2.5 transition-colors hover:bg-accent/60",
                        item.unread && "bg-primary/5",
                      )}
                    >
                      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {item.author}
                          </span>
                          <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                            {timeAgo(item.createdAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {item.body}
                        </p>
                        {/* Friend requests can be answered without leaving. */}
                        {item.kind === "request" && item.requestId && (
                          <div
                            className="mt-2 flex gap-1.5"
                            onClick={(event) => event.preventDefault()}
                          >
                            <Button
                              size="sm"
                              className="h-7"
                              onClick={() =>
                                void respond({
                                  requestId: item.requestId as Id<"friendships">,
                                  accept: true,
                                })
                              }
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7"
                              onClick={() =>
                                void respond({
                                  requestId: item.requestId as Id<"friendships">,
                                  accept: false,
                                })
                              }
                            >
                              Ignore
                            </Button>
                          </div>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
