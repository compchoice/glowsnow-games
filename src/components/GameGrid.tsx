import { Link } from "react-router";
import { ExternalLink, Play } from "lucide-react";
import { FavoriteButton } from "@/components/FavoriteButton";
import type { CatalogGame } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function GameCard({
  game,
  confirmUnsave = false,
}: {
  game: CatalogGame;
  /** Announce an unsave with an undo toast, for the shelf. */
  confirmUnsave?: boolean;
}) {
  return (
    <Link
      to={`/games/${game.slug}`}
      className={cn(
        "group flex flex-col justify-between rounded-xl border border-border/70 bg-card/70 p-5 transition-colors",
        "hover:border-primary/40 hover:bg-card",
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold leading-snug">{game.title}</h3>
          {game.featured && (
            <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
              Featured
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{game.description}</p>
      </div>        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              {game.category}
            </span>
            {game.external && (
              <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                New tab
              </span>
            )}
            {game.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <FavoriteButton
              slug={game.slug}
              title={game.title}
              undoable={confirmUnsave}
            />
            <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
              {game.external ? (
                <ExternalLink className="size-3.5" />
              ) : (
                <Play className="size-3.5" />
              )}
              {game.external ? "Open" : "Play"}
            </span>
          </div>
        </div>
    </Link>
  );
}

export function GameGrid({
  games,
  emptyMessage = "No games match that search yet.",
  confirmUnsave = false,
}: {
  games: CatalogGame[];
  emptyMessage?: string;
  /** Ask before unsaving, for grids where unsaving removes the card. */
  confirmUnsave?: boolean;
}) {
  if (games.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 px-6 py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {games.map((game) => (
        <GameCard
          key={game.slug}
          game={game}
          confirmUnsave={confirmUnsave}
        />
      ))}
    </div>
  );
}
