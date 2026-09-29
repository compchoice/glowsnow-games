export type CatalogGame = {
  slug: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
  embedUrl: string;
  playUrl: string;
  /** Optional mirror used only when playing through the proxy. */
  proxyUrl?: string;
  featured: boolean;
  /** Built-in starters vs. games the owner added from the admin area. */
  source: "built-in" | "database";
};

export type GameSeed = Omit<CatalogGame, "source">;

/**
 * The starter catalog. These ship with the site so the arcade is never empty;
 * the owner can import them into the database from the admin area and edit
 * every field (including the embed URL) from there.
 */
export const DEFAULT_GAMES: GameSeed[] = [
  {
    slug: "friday-night-funkin",
    title: "Friday Night Funkin'",
    category: "Rhythm",
    description:
      "Rap-battle rhythm game. Hit the arrows on the beat and clear every week.",
    tags: ["rhythm", "music", "arrow keys"],
    embedUrl: "https://kdata1.com/2020/05/fnf/",
    playUrl: "https://kdata1.com/2020/05/fnf/",
    // kdata1 refuses server-side fetches, so proxy mode uses this mirror.
    proxyUrl: "https://www.fridaynightfunkin.net/",
    featured: true,
  },
  {
    slug: "2048",
    title: "2048",
    category: "Puzzle",
    description:
      "Slide the tiles, merge the numbers, and chase the 2048 tile before the board fills up.",
    tags: ["numbers", "logic", "quick"],
    embedUrl: "https://play2048.co/",
    playUrl: "https://play2048.co/",
    featured: true,
  },
  {
    slug: "hextris",
    title: "Hextris",
    category: "Puzzle",
    description:
      "A hexagonal spin on Tetris. Rotate the ring, match the colours, and keep it from filling up.",
    tags: ["fast", "colours", "reflex"],
    embedUrl: "https://hextris.io/",
    playUrl: "https://hextris.io/",
    featured: false,
  },
  {
    slug: "slope",
    title: "Slope",
    category: "Arcade",
    description:
      "Roll a ball down an endless neon slope. Stay on the track and keep your speed up.",
    tags: ["endless", "reflex", "neon"],
    embedUrl: "https://kdata1.com/2020/05/slope/",
    playUrl: "https://kdata1.com/2020/05/slope/",
    proxyUrl: "https://slopegame.io/",
    featured: false,
  },
  {
    slug: "chess",
    title: "Chess vs Computer",
    category: "Board",
    description:
      "A full game of chess against the computer, playable right in the browser.",
    tags: ["strategy", "classic", "two players"],
    embedUrl: "https://playpager.com/embed/chess/index.html",
    playUrl: "https://playpager.com/embed/chess/index.html",
    featured: false,
  },
  {
    slug: "checkers",
    title: "Checkers",
    category: "Board",
    description:
      "Classic checkers against the computer. Simple rules, quick rounds.",
    tags: ["strategy", "classic"],
    embedUrl: "https://playpager.com/embed/checkers/index.html",
    playUrl: "https://playpager.com/embed/checkers/index.html",
    featured: false,
  },
  {
    slug: "solitaire",
    title: "Solitaire",
    category: "Cards",
    description:
      "Classic Klondike solitaire with a timer and a running score. A quiet one for study hall.",
    tags: ["cards", "solo", "relaxing"],
    embedUrl: "https://playpager.com/embed/solitaire/index.html",
    playUrl: "https://playpager.com/embed/solitaire/index.html",
    featured: false,
  },
  {
    slug: "reversi",
    title: "Reversi",
    category: "Board",
    description:
      "Also known as Othello. Flip your opponent's discs and finish with the most on the board.",
    tags: ["strategy", "classic", "quick"],
    embedUrl: "https://playpager.com/embed/reversi/index.html",
    playUrl: "https://playpager.com/embed/reversi/index.html",
    featured: false,
  },
];

export const ALL_CATEGORIES = "All";

export function categoriesOf(games: CatalogGame[]): string[] {
  return [ALL_CATEGORIES, ...new Set(games.map((game) => game.category))].filter(
    Boolean,
  );
}

/** Client-side catalog search across title, category, description and tags. */
export function filterCatalog(
  games: CatalogGame[],
  query: string,
  category: string,
): CatalogGame[] {
  const needle = query.trim().toLowerCase();
  return games.filter((game) => {
    if (category !== ALL_CATEGORIES && game.category !== category) return false;
    if (!needle) return true;
    const haystack = [
      game.title,
      game.category,
      game.description,
      ...game.tags,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export function sortCatalog(games: CatalogGame[]): CatalogGame[] {
  return [...games].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}
