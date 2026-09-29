import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DEFAULT_GAMES, sortCatalog, type CatalogGame } from "@/lib/catalog";

/**
 * The live catalog: built-in starters, overlaid with anything the owner has
 * added or edited in the admin area (matched by slug).
 */
export function useCatalog(): { games: CatalogGame[]; isLoading: boolean } {
  const stored = useQuery(api.games.list);

  const games = useMemo(() => {
    const bySlug = new Map<string, CatalogGame>();

    for (const game of DEFAULT_GAMES) {
      bySlug.set(game.slug, { ...game, source: "built-in" });
    }

    for (const game of stored ?? []) {
      bySlug.set(game.slug, {
        slug: game.slug,
        title: game.title,
        category: game.category,
        description: game.description,
        tags: game.tags,
        embedUrl: game.embedUrl,
        playUrl: game.playUrl,
        featured: game.featured,
        source: "database",
      });
    }

    return sortCatalog([...bySlug.values()]);
  }, [stored]);

  return { games, isLoading: stored === undefined };
}
