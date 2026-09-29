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
    // hextris.io itself stopped resolving; the project page is the live build.
    embedUrl: "https://hextris.github.io/",
    playUrl: "https://hextris.github.io/",
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
    slug: "granny",
    title: "Granny",
    category: "Horror",
    description:
      "Grandma knows every creak in the house. Stay quiet, work the locks, and don't let her see you.",
    tags: ["horror", "escape", "stealth"],
    embedUrl: "https://granny2.io/granny.embed",
    playUrl: "https://granny2.io/granny",
    featured: true,
  },
  {
    slug: "granny-2",
    title: "Granny 2",
    category: "Horror",
    description:
      "Grandpa is in this one, and the house is worse. Same rules, far less room to run.",
    tags: ["horror", "escape", "stealth"],
    embedUrl: "https://granny2.io/granny-2.embed",
    playUrl: "https://granny2.io/granny-2",
    featured: true,
  },
  {
    slug: "buckshot-roulette",
    title: "Buckshot Roulette",
    category: "Horror",
    description:
      "One shell is live. Listen, look, and call the bluff before the room empties.",
    tags: ["horror", "bluff", "short"],
    embedUrl: "https://granny2.io/buckshot-roulette.embed",
    playUrl: "https://granny2.io/buckshot-roulette",
    featured: true,
  },
  {
    slug: "backrooms",
    title: "Backrooms",
    category: "Horror",
    description:
      "The yellow wallpaper, the endless hum, and something that should not be on the next floor.",
    tags: ["horror", "explore", "liminal"],
    embedUrl: "https://granny2.io/backrooms.embed",
    playUrl: "https://granny2.io/backrooms",
    featured: false,
  },
  {
    slug: "cat-and-granny",
    title: "Cat and Granny",
    category: "Horror",
    description:
      "A cat, a granny, and a house full of hiding places. Outsmart her before she finds you.",
    tags: ["horror", "escape", "quick"],
    embedUrl: "https://granny2.io/cat-and-granny.embed",
    playUrl: "https://granny2.io/cat-and-granny",
    featured: false,
  },
  {
    slug: "dude-theft-auto",
    title: "Dude Theft Auto",
    category: "Action",
    description:
      "Commit ridiculous heists, wreck the place, and lose the cops on foot or by car.",
    tags: ["chaos", "open world", "action"],
    embedUrl: "https://granny2.io/dude-theft-auto.embed",
    playUrl: "https://granny2.io/dude-theft-auto",
    featured: false,
  },
  {
    slug: "drive-mad",
    title: "Drive Mad",
    category: "Action",
    description:
      "Pull the handbrake mid-air, land the car, and keep the combo alive through the traffic.",
    tags: ["cars", "stunts", "physics"],
    embedUrl: "https://drivemad.com/",
    playUrl: "https://drivemad.com/",
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
