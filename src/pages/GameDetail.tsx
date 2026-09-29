import { useEffect } from "react";
import { Link, useParams } from "react-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PageShell } from "@/components/Layout";
import { GamePlayer } from "@/components/GamePlayer";
import { GameGrid } from "@/components/GameGrid";
import { Messages } from "@/components/Messages";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Eyebrow } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";
import { useCatalog } from "@/hooks/use-catalog";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft } from "lucide-react";

export default function GameDetail() {
  const { slug = "" } = useParams();
  const { games, isLoading } = useCatalog();
  const game = games.find((entry) => entry.slug === slug);

  // Playing a saved game is what makes it "recent" on the shelf.
  const { isAuthenticated } = useAuth();
  const touch = useMutation(api.favorites.touch);
  const gameSlug = game?.slug;
  useEffect(() => {
    if (!isAuthenticated || !gameSlug) return;
    void touch({ gameSlug }).catch(() => undefined);
  }, [isAuthenticated, gameSlug, touch]);

  if (isLoading) {
    return (
      <PageShell wide>
        <p className="text-sm text-muted-foreground">Loading game…</p>
      </PageShell>
    );
  }

  if (!game) {
    return (
      <PageShell wide>
        <Eyebrow>Not found</Eyebrow>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">
          That game isn&apos;t in the catalog
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been removed by the owner. Browse the catalog for
          something else to play.
        </p>
        <Button asChild className="mt-5">
          <Link to="/games">Back to the catalog</Link>
        </Button>
      </PageShell>
    );
  }

  const related = games
    .filter((entry) => entry.slug !== game.slug && entry.category === game.category)
    .slice(0, 3);

  return (
    <PageShell wide>
      <Link
        to="/games"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All games
      </Link>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>{game.category}</Eyebrow>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">
            {game.title}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <FavoriteButton slug={game.slug} showLabel />
          {game.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </header>

      <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
        {game.description}
      </p>

      <div className="mt-6">
        <GamePlayer game={game} />
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">
          Comments on {game.title}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Leave a tip, ask for help, or tell everyone your high score.
        </p>
        <div className="mt-5">
          <Messages
            scope="game"
            gameSlug={game.slug}
            emptyText="No comments on this game yet — be the first."
          />
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">
            More {game.category.toLowerCase()} games
          </h2>
          <div className="mt-5">
            <GameGrid games={related} />
          </div>
        </section>
      )}
    </PageShell>
  );
}
