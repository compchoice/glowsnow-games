import { Link } from "react-router";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/convex/_generated/api";
import { PageShell } from "@/components/Layout";
import { GameGrid } from "@/components/GameGrid";
import { MemberAvatar } from "@/components/MemberAvatar";
import { ProxyPanel } from "@/components/ProxyPanel";
import { Eyebrow } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";
import { useCatalog } from "@/hooks/use-catalog";
import { useAuth } from "@/hooks/use-auth";
import { useMemberDirectory } from "@/hooks/use-directory";
import { SITE_TAGLINE } from "@/lib/site";
import {
  ArrowRight,
  Bell,
  Blocks,
  Heart,
  MessageSquare,
  Palette,
  Search,
  Sparkles,
  Terminal,
  Users,
} from "lucide-react";

function SectionHeader({
  eyebrow,
  title,
  description,
  to,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  to?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-1.5 text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {to && linkLabel && (
        <Button asChild variant="ghost" size="sm" className="text-primary">
          <Link to={to}>
            {linkLabel}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      )}
    </div>
  );
}

export default function Landing() {
  const { games } = useCatalog();
  const { isAuthenticated } = useAuth();
  const directory = useMemberDirectory();
  const latest = useQuery(api.messages.list, { scope: "community", limit: 3 });

  const featured = games.filter((game) => game.featured).slice(0, 3);
  const showcase = featured.length > 0 ? featured : games.slice(0, 3);

  return (
    <PageShell wide>
      {/* Hero */}
      <section className="py-6 sm:py-12">
        <Eyebrow>Hosted arcade · private search · community</Eyebrow>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          Games, search and your people — in one clean tab.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          {SITE_TAGLINE} Dex:Active is a hosted website: a playable games
          catalog, a Brave-powered search proxy, and a members&apos; lounge
          where everyone can post and reply.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild size="lg" className="h-11 px-6">
            <Link to="/games">
              Browse the catalog
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11 px-6">
            <Link to="/proxy">
              <Search className="size-4" />
              Open the proxy
            </Link>
          </Button>
          {!isAuthenticated && (
            <Button asChild size="lg" variant="ghost" className="h-11 px-6 text-primary">
              <Link to="/auth?mode=signup">Create an account</Link>
            </Button>
          )}
        </div>

        <dl className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border/70 bg-border/70 text-sm sm:grid-cols-3">
          {[
            [`${games.length} games`, "Ready to play, no downloads"],
            ["1 search box", "Brave results in a private tab"],
            ["Members only", "Sign up to post and comment"],
          ].map(([title, detail]) => (
            <div key={title} className="bg-card/70 px-5 py-4">
              <dt className="font-medium">{title}</dt>
              <dd className="mt-0.5 text-muted-foreground">{detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Games */}
      <section className="mt-16">
        <SectionHeader
          eyebrow="The catalog"
          title="Start with these"
          description="Every game plays right here in the page. Search the full catalog by name, category or tag whenever you want more."
          to="/games"
          linkLabel="See all games"
        />
        <GameGrid games={showcase} />
      </section>

      {/* Proxy */}
      <section className="mt-16">
        <SectionHeader
          eyebrow="The proxy"
          title="Search without the runaround"
          description="Type a question and Dex:Active hands it to Brave Search in a brand-new tab, so nothing on this site sees your results."
          to="/proxy"
          linkLabel="Open the proxy"
        />
        <ProxyPanel compact />
      </section>

      {/* Community */}
      <section className="mt-16">
        <SectionHeader
          eyebrow="The lounge"
          title="What the community is saying"
          description="Members post messages, reply in threads, and leave comments on individual games."
          to="/community"
          linkLabel="Join the conversation"
        />

        {latest === undefined ? (
          <div className="rounded-xl border border-dashed border-border/70 px-6 py-10 text-center text-sm text-muted-foreground">
            Loading the latest messages…
          </div>
        ) : latest.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 px-6 py-10 text-center text-sm text-muted-foreground">
            The lounge is quiet. Create an account and post the first message.
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-3">
            {latest.map((message) => (
              <li
                key={message._id}
                className="rounded-xl border border-border/70 bg-card/60 p-5"
              >
                <div className="flex items-center gap-2">
                  <MemberAvatar
                    name={message.authorName}
                    avatar={directory.get(message.authorId)?.avatar}
                    seed={message.authorId}
                    size="sm"
                  />
                  <Link
                    to={`/u/${message.authorId}`}
                    className="text-sm font-medium transition-colors hover:text-primary"
                  >
                    {directory.get(message.authorId)?.name ?? message.authorName}
                  </Link>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(message.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="mt-3 line-clamp-4 text-sm text-muted-foreground">
                  {message.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Make it yours */}
      <section className="mt-16">
        <SectionHeader
          eyebrow="Make it yours"
          title="Saved games, real profiles, your colours"
          description="Everything you do here sticks to your account, and the whole site bends to how you like it."
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-card/60 p-6">
            <Heart className="size-5 text-primary" />
            <h3 className="mt-3 text-lg font-semibold">Your shelf</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Save any game with one tap, then group them into playlists — a
              study-hall lineup, a two-player night, whatever you want.
            </p>
            <Link
              to="/shelf"
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              Open your shelf
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/60 p-6">
            <Palette className="size-5 text-primary" />
            <h3 className="mt-3 text-lg font-semibold">Yours to look at</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Six accent colours, light or dark, and the snowfall on or off —
              picked from the header or the developer console.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Try <code className="text-primary">theme azure</code> or{" "}
              <code className="text-primary">mode light</code>.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/60 p-6">
            <Bell className="size-5 text-primary" />
            <h3 className="mt-3 text-lg font-semibold">Never miss a thing</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              The bell in the header collects new lounge posts, replies to your
              messages and chat mentions — so you know when people answer.
            </p>
            <Link
              to="/chat"
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              Say hello in chat
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* What you get / owner */}
      <section className="mt-16 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-card/60 p-6">
          <Sparkles className="size-5 text-primary" />
          <h3 className="mt-3 text-lg font-semibold">
            One account, everything saved
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Signing up keeps your messages, replies and game comments in one
            place, and gives you a dashboard to review them.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {[
              [Blocks, "A searchable catalog with saved games and playlists"],
              [MessageSquare, "Threaded messages and per-game comments"],
              [Users, "A profile with an avatar, a bio and your own stats"],
            ].map(([Icon, text]) => {
              const Item = Icon as typeof Blocks;
              return (
                <li key={text as string} className="flex items-start gap-2.5">
                  <Item className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{text as string}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-5 flex gap-2">
            <Button asChild size="sm">
              <Link to={isAuthenticated ? "/dashboard" : "/auth?mode=signup"}>
                {isAuthenticated ? "Open dashboard" : "Sign up free"}
              </Link>
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/60 p-6">
          <Terminal className="size-5 text-primary" />
          <h3 className="mt-3 text-lg font-semibold">Owner tools</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            You keep the keys: an admin area for the catalog, messages and
            members, plus a developer console pinned to the bottom-left of every
            page.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex gap-2">
              <code className="shrink-0 text-primary">snow on|off</code>
              <span className="text-muted-foreground">toggle the droplets</span>
            </li>
            <li className="flex gap-2">
              <code className="shrink-0 text-primary">cloak &lt;preset&gt;</code>
              <span className="text-muted-foreground">disguise the tab</span>
            </li>
            <li className="flex gap-2">
              <code className="shrink-0 text-primary">status</code>
              <span className="text-muted-foreground">current settings</span>
            </li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/admin">Open admin area</Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="text-muted-foreground">
              <Link to="/community">Visit the lounge</Link>
            </Button>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
