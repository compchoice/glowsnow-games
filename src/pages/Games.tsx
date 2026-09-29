import { useMemo, useState } from "react";
import { PageShell } from "@/components/Layout";
import { GameGrid } from "@/components/GameGrid";
import { Eyebrow } from "@/components/SiteChrome";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCatalog } from "@/hooks/use-catalog";
import {
  ALL_CATEGORIES,
  categoriesOf,
  filterCatalog,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";

export default function Games() {
  const { games, isLoading } = useCatalog();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES);

  const categories = useMemo(() => categoriesOf(games), [games]);
  const results = useMemo(
    () => filterCatalog(games, query, category),
    [games, query, category],
  );

  return (
    <PageShell wide>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Section one</Eyebrow>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">Games</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Pick a game and it opens right here in the page. Search by title,
            category, description or tag.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Loading catalog…" : `${results.length} of ${games.length} games`}
        </p>
      </header>

      <div className="mt-6 space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search games…"
            aria-label="Search games"
            className="h-11 pl-9 pr-10 text-base"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setQuery("")}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCategory(option)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                category === option
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/70 bg-card/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <GameGrid
          games={results}
          emptyMessage={
            query
              ? `No games match “${query}”.`
              : "No games in this category yet."
          }
        />
      </div>
    </PageShell>
  );
}
