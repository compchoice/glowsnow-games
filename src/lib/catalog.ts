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
  {
    slug: "minesweeper",
    title: "Minesweeper",
    category: "Puzzle",
    description:
      "Clear the board without hitting a mine. Flags, numbers and that one guess you always regret.",
    tags: ["classic", "logic", "quick"],
    embedUrl: "https://minesweeper.online/embed",
    playUrl: "https://minesweeper.online/",
    featured: true,
  },
  {
    slug: "sudoku",
    title: "Sudoku",
    category: "Puzzle",
    description:
      "Fill every row, column and box with the digits one to nine. Three difficulty levels.",
    tags: ["numbers", "logic", "relaxing"],
    embedUrl: "https://playpager.com/embed/sudoku/index.html",
    playUrl: "https://playpager.com/embed/sudoku/index.html",
    featured: false,
  },
  {
    slug: "net",
    title: "Net",
    category: "Puzzle",
    description:
      "Rotate the tiles until every pipe connects back to the source. A calm, tidy brain-teaser.",
    tags: ["logic", "relaxing", "solo"],
    embedUrl: "https://www.chiark.greenend.org.uk/~sgtatham/puzzles/js/net.html",
    playUrl: "https://www.chiark.greenend.org.uk/~sgtatham/puzzles/js/net.html",
    featured: false,
  },
  {
    slug: "tents",
    title: "Tents",
    category: "Puzzle",
    description:
      "Place a tent beside every tree, keeping them apart from each other. Pure logic, no guessing.",
    tags: ["logic", "solo", "relaxing"],
    embedUrl: "https://www.chiark.greenend.org.uk/~sgtatham/puzzles/js/tents.html",
    playUrl: "https://www.chiark.greenend.org.uk/~sgtatham/puzzles/js/tents.html",
    featured: false,
  },
  {
    slug: "fifteen",
    title: "Fifteen",
    category: "Puzzle",
    description:
      "The sliding tile puzzle. Shuffle, then slide the numbered tiles back into order.",
    tags: ["classic", "quick", "logic"],
    embedUrl: "https://www.chiark.greenend.org.uk/~sgtatham/puzzles/js/sixteen.html",
    playUrl: "https://www.chiark.greenend.org.uk/~sgtatham/puzzles/js/sixteen.html",
    featured: false,
  },
  {
    slug: "peg-solitaire",
    title: "Peg Solitaire",
    category: "Board",
    description:
      "Jump pegs to remove them until a single one is left. Simple rules, sneaky depth.",
    tags: ["classic", "strategy", "solo"],
    embedUrl: "https://www.chiark.greenend.org.uk/~sgtatham/puzzles/js/pegs.html",
    playUrl: "https://www.chiark.greenend.org.uk/~sgtatham/puzzles/js/pegs.html",
    featured: false,
  },
  {
    slug: "lightup",
    title: "Light Up",
    category: "Puzzle",
    description:
      "Place lamps that light every wall and bulb. The grid fills with false certainty.",
    tags: ["logic", "puzzle", "solo"],
    embedUrl:
      "https://www.chiark.greenend.org.uk/~sgtatham/puzzles/js/lightup.html",
    playUrl:
      "https://www.chiark.greenend.org.uk/~sgtatham/puzzles/js/lightup.html",
    featured: false,
  },
  {
    slug: "map-puzzle",
    title: "Jigsaw Map",
    category: "Puzzle",
    description:
      "Pick a place on the map and cut it into pieces to put back together.",
    tags: ["puzzle", "relaxing", "map"],
    embedUrl:
      "https://www.chiark.greenend.org.uk/~sgtatham/puzzles/js/map.html",
    playUrl:
      "https://www.chiark.greenend.org.uk/~sgtatham/puzzles/js/map.html",
    featured: false,
  },
  {
    slug: "flappy-bird",
    title: "Flappy Bird",
    category: "Arcade",
    description:
      "Tap to flap through the pipes. Brutally simple and famously hard.",
    tags: ["reflex", "endless", "quick"],
    embedUrl: "https://flappybird.io/",
    playUrl: "https://flappybird.io/",
    featured: false,
  },
  {
    slug: "tetris",
    title: "Tetris",
    category: "Arcade",
    description:
      "Stack the falling blocks, clear the lines, and keep the stack from reaching the top.",
    tags: ["classic", "reflex", "high score"],
    embedUrl: "https://www.mathsisfun.com/games/tetris.html",
    playUrl: "https://www.mathsisfun.com/games/tetris.html",
    featured: false,
  },
  {
    slug: "untrusted",
    title: "Untrusted",
    category: "Adventure",
    description:
      "A puzzle adventure where the only way forward is to rewrite the game while you play it.",
    tags: ["puzzle", "coding", "story"],
    embedUrl: "https://alexnisnevich.github.io/untrusted/",
    playUrl: "https://alexnisnevich.github.io/untrusted/",
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
