import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PageShell } from "@/components/Layout";
import { GameGrid } from "@/components/GameGrid";
import { Eyebrow } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCatalog } from "@/hooks/use-catalog";
import { useFavorites } from "@/hooks/use-favorites";
import type { CatalogGame } from "@/lib/catalog";
import { ArrowRight, ListPlus, Plus, Trash2, X } from "lucide-react";

type PlaylistRow = {
  _id: Id<"playlists">;
  name: string;
  slugs: string[];
  createdAt: number;
  updatedAt: number;
};

function PlaylistCard({
  playlist,
  games,
}: {
  playlist: PlaylistRow;
  games: CatalogGame[];
}) {
  const rename = useMutation(api.playlists.rename);
  const remove = useMutation(api.playlists.remove);
  const addGame = useMutation(api.playlists.addGame);
  const removeGame = useMutation(api.playlists.removeGame);

  const [name, setName] = useState(playlist.name);
  const [pick, setPick] = useState("");
  const [error, setError] = useState<string | null>(null);

  const bySlug = useMemo(
    () => new Map(games.map((game) => [game.slug, game])),
    [games],
  );
  const inList = playlist.slugs
    .map((slug) => bySlug.get(slug))
    .filter((game): game is CatalogGame => Boolean(game));
  const available = games.filter((game) => !playlist.slugs.includes(game.slug));

  async function handleRename() {
    setError(null);
    try {
      await rename({ id: playlist._id, name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rename that.");
    }
  }

  async function handleAdd(slug: string) {
    setError(null);
    setPick(slug);
    try {
      await addGame({ id: playlist._id, gameSlug: slug });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that game.");
    } finally {
      setPick("");
    }
  }

  return (
    <Card className="border-border/70 bg-card/60">
      <div className="flex items-center gap-2 px-6">
        <ListPlus className="size-4 shrink-0 text-primary" />
        <span className="truncate font-semibold">{playlist.name}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {inList.length} {inList.length === 1 ? "game" : "games"}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto shrink-0 text-muted-foreground hover:text-destructive"
          aria-label={`Delete ${playlist.name}`}
          onClick={() => void remove({ id: playlist._id })}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <CardContent className="space-y-3">
        {inList.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Empty for now. Add a game below.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {inList.map((game) => (
              <li
                key={game.slug}
                className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/50 py-1 pr-1 pl-2.5 text-xs"
              >
                <Link
                  to={`/games/${game.slug}`}
                  className="transition-colors hover:text-primary"
                >
                  {game.title}
                </Link>
                <button
                  type="button"
                  aria-label={`Remove ${game.title} from ${playlist.name}`}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                  onClick={() =>
                    void removeGame({ id: playlist._id, gameSlug: game.slug })
                  }
                >
                  <X className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Select value={pick} onValueChange={(value) => void handleAdd(value)}>
            <SelectTrigger size="sm" className="w-52">
              <SelectValue placeholder="Add a game…" />
            </SelectTrigger>
            <SelectContent>
              {available.length === 0 ? (
                <SelectItem value="__none" disabled>
                  Every game is already here
                </SelectItem>
              ) : (
                available.map((game) => (
                  <SelectItem key={game.slug} value={game.slug}>
                    {game.title}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void handleRename();
            }}
          >
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={40}
              aria-label={`Rename ${playlist.name}`}
              className="h-8 w-40 text-sm"
            />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={!name.trim() || name === playlist.name}
            >
              Rename
            </Button>
          </form>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

export default function Shelf() {
  const { games, isLoading } = useCatalog();
  const { rows, slugs } = useFavorites();
  const playlists = useQuery(api.playlists.mine) as PlaylistRow[] | undefined;
  const create = useMutation(api.playlists.create);

  const [newName, setNewName] = useState("");

  // Saved games, most recently played first.
  const savedGames = useMemo(() => {
    const bySlug = new Map(games.map((game) => [game.slug, game]));
    // Most recently played first, then newest save.
    const playedAt = new Map(
      rows.map((row) => [row.gameSlug, row.lastPlayedAt ?? 0]),
    );
    const savedAt = new Map(rows.map((row) => [row.gameSlug, row.createdAt]));
    return rows
      .map((row) => bySlug.get(row.gameSlug))
      .filter((game): game is CatalogGame => Boolean(game))
      .sort((a, b) => {
        const played =
          (playedAt.get(b.slug) ?? 0) - (playedAt.get(a.slug) ?? 0);
        if (played !== 0) return played;
        return (savedAt.get(b.slug) ?? 0) - (savedAt.get(a.slug) ?? 0);
      });
  }, [games, rows]);

  async function handleCreate() {
    if (!newName.trim()) return;
    await create({ name: newName });
    setNewName("");
  }

  return (
    <PageShell wide>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Your shelf</Eyebrow>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">Shelf</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Games you saved and the playlists you built. Saving a game puts it
            here and on your dashboard.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/games">
            Browse the catalog
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </header>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xl font-semibold tracking-tight">
            Saved games
          </h2>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${slugs.size} saved`}
          </p>
        </div>
        <div className="mt-4">
          {savedGames.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 px-6 py-12 text-center text-sm text-muted-foreground">
              Nothing saved yet. Tap the heart on any game to keep it here.
            </div>
          ) : (
            <GameGrid games={savedGames} />
          )}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Playlists</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Group games into your own collections — a study-hall lineup, a
              two-player night, whatever you like.
            </p>
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void handleCreate();
            }}
          >
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="New playlist name"
              maxLength={40}
              aria-label="New playlist name"
              className="h-9 w-48"
            />
            <Button type="submit" size="sm" disabled={!newName.trim()}>
              <Plus className="size-4" />
              Create
            </Button>
          </form>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {playlists === undefined ? (
            <p className="text-sm text-muted-foreground">Loading playlists…</p>
          ) : playlists.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 px-6 py-10 text-center text-sm text-muted-foreground lg:col-span-2">
              No playlists yet. Create one above and start dropping games in.
            </div>
          ) : (
            playlists.map((playlist) => (
              <PlaylistCard
                key={playlist._id}
                playlist={playlist}
                games={games}
              />
            ))
          )}
        </div>
      </section>
    </PageShell>
  );
}
