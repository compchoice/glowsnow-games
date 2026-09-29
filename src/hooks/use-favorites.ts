import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export type FavoriteRow = {
  _id: string;
  gameSlug: string;
  createdAt: number;
  lastPlayedAt: number | null;
};

/**
 * The signed-in member's saved games. Convex dedupes identical subscriptions, so
 * every game card can call this without extra server work.
 */
export function useFavorites(): {
  rows: FavoriteRow[];
  slugs: Set<string>;
  isLoading: boolean;
  toggle: (args: { gameSlug: string }) => Promise<unknown>;
} {
  const rows = useQuery(api.favorites.mine);
  const toggle = useMutation(api.favorites.toggle);

  const list = useMemo(() => (rows ?? []) as FavoriteRow[], [rows]);
  const slugs = useMemo(
    () => new Set(list.map((row) => row.gameSlug)),
    [list],
  );

  return {
    rows: list,
    slugs,
    isLoading: rows === undefined,
    toggle,
  };
}
