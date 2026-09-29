import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/convex/_generated/api";
import { PageShell } from "@/components/Layout";
import { MemberAvatar } from "@/components/MemberAvatar";
import { Eyebrow } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useFavorites } from "@/hooks/use-favorites";
import {
  Crown,
  Gamepad2,
  Heart,
  MessageSquare,
  Pencil,
  Search,
  Shield,
  Sparkles,
  Terminal,
  Users,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const mine = useQuery(api.messages.mine);
  const status = useQuery(api.users.adminStatus);
  const claimAdmin = useMutation(api.users.claimAdmin);
  const favorites = useFavorites();

  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(
    null,
  );

  const posts = (mine ?? []).filter((message) => !message.parentId);
  const comments = (mine ?? []).filter((message) => message.parentId);

  async function handleClaim() {
    try {
      const result = await claimAdmin();
      setNotice({
        tone: result.claimed ? "ok" : "error",
        text: result.reason,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not claim ownership.",
      });
    }
  }

  return (
    <PageShell wide>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Your dashboard</Eyebrow>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">
            Welcome back{user?.name ? `, ${user.name}` : ""}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {user?.email ?? "Signed in"} · joined{" "}
            {user?._creationTime
              ? formatDistanceToNow(new Date(user._creationTime), {
                  addSuffix: true,
                })
              : "recently"}
            {status?.isAdmin ? " · owner" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/games">
              <Gamepad2 className="size-4" />
              Browse games
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/community">
              <MessageSquare className="size-4" />
              Open lounge
            </Link>
          </Button>
        </div>
      </header>

      {notice && (
        <p
          className={
            notice.tone === "ok"
              ? "mt-4 text-sm text-primary"
              : "mt-4 text-sm text-destructive"
          }
        >
          {notice.text}
        </p>
      )}

      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Messages", posts.length, "posted in the lounge"],
          ["Replies", comments.length, "left on posts and games"],
          ["Saved games", favorites.slugs.size, "on your shelf"],
        ].map(([label, value, detail]) => (
          <div
            key={label as string}
            className="rounded-xl border border-border/70 bg-card/60 px-5 py-4"
          >
            <dt className="text-sm text-muted-foreground">{label as string}</dt>
            <dd className="mt-1 text-2xl font-semibold">{value as number}</dd>
            <dd className="mt-0.5 text-xs text-muted-foreground">
              {detail as string}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="text-base">Your activity</CardTitle>
          </CardHeader>
          <CardContent>
            {mine === undefined ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : mine.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You haven&apos;t posted anything yet. Head to the lounge and
                start a thread.
              </p>
            ) : (
              <ul className="divide-y divide-border/70">
                {mine.slice(0, 8).map((message) => (
                  <li key={message._id} className="py-3 first:pt-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {message.parentId ? "Comment" : "Message"} ·{" "}
                        {timeAgoText(message.createdAt)}
                      </span>
                      {message.scope === "game" && message.gameSlug && (
                        <Link
                          to={`/games/${message.gameSlug}`}
                          className="text-primary hover:underline"
                        >
                          {message.gameSlug}
                        </Link>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm">{message.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/70 bg-card/60">
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <MemberAvatar
                  name={user?.name ?? "Member"}
                  avatar={user?.avatar ?? null}
                  seed={user?._id ?? "member"}
                  size="lg"
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {user?.name ?? "Unnamed member"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user?.bio?.trim() || "No bio yet."}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Your name, avatar and bio live on your profile page.
              </p>
              {user && (
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link to={`/u/${user._id}`}>
                    <Pencil className="size-4" />
                    Edit profile
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/60">
            <CardHeader>
              <CardTitle className="text-base">Owner controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <Terminal className="size-4 shrink-0" />
                Developer console lives bottom-left — summon it with Ctrl + `.
              </p>
              {status?.isAdmin ? (
                <>
                  <p className="flex items-center gap-2 text-primary">
                    <Shield className="size-4" />
                    You have owner access.
                  </p>
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <Link to="/admin">
                      <Crown className="size-4" />
                      Open the admin area
                    </Link>
                  </Button>
                </>
              ) : status && !status.hasAdmin ? (
                <>
                  <p className="flex items-start gap-2">
                    <Crown className="mt-0.5 size-4 shrink-0 text-primary" />
                    No owner exists yet. If this is your site, claim the seat —
                    it unlocks the admin area and shows your Admin link.
                  </p>
                  <Button size="sm" className="w-full" onClick={handleClaim}>
                    <Crown className="size-4" />
                    Claim owner access
                  </Button>
                </>
              ) : (
                <p className="flex items-center gap-2">
                  <Users className="size-4" />
                  Ask the owner for admin access if you need it.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild variant="outline" size="sm" className="justify-start">
              <Link to="/proxy">
                <Search className="size-4" />
                Search proxy
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="justify-start">
              <Link to="/shelf">
                <Heart className="size-4" />
                Your shelf
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="justify-start">
              <Link to="/games">
                <Sparkles className="size-4" />
                What&apos;s new
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function timeAgoText(timestamp: number) {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return "just now";
  }
}
