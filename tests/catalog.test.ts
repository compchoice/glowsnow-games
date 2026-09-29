import { describe, expect, test } from "bun:test";
import {
  ALL_CATEGORIES,
  DEFAULT_GAMES,
  categoriesOf,
  filterCatalog,
  sortCatalog,
  type CatalogGame,
} from "../src/lib/catalog";

const asCatalog = DEFAULT_GAMES.map((game) => ({
  ...game,
  source: "built-in" as const,
}));

const httpsUrl = /^https:\/\/\S+$/;

describe("starter catalog", () => {
  test("every game is complete and reachable looking", () => {
    expect(DEFAULT_GAMES.length).toBeGreaterThanOrEqual(6);
    for (const game of DEFAULT_GAMES) {
      expect(game.slug).toMatch(/^[a-z0-9-]+$/);
      expect(game.title.trim().length).toBeGreaterThan(0);
      expect(game.category.trim().length).toBeGreaterThan(0);
      expect(game.description.trim().length).toBeGreaterThan(20);
      expect(game.embedUrl).toMatch(httpsUrl);
      expect(game.playUrl).toMatch(httpsUrl);
      if (game.proxyUrl) expect(game.proxyUrl).toMatch(httpsUrl);
    }
  });

  test("slugs are unique", () => {
    const slugs = DEFAULT_GAMES.map((game) => game.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test("Friday Night Funkin' carries a proxy mirror, since its host refuses server fetches", () => {
    const fnf = DEFAULT_GAMES.find((game) => game.slug === "friday-night-funkin");
    expect(fnf).toBeDefined();
    expect(fnf?.proxyUrl).toBeTruthy();
    expect(fnf?.proxyUrl).not.toBe(fnf?.embedUrl);
  });
});

describe("categoriesOf", () => {
  test("lists All first, then each category once", () => {
    const categories = categoriesOf(asCatalog);
    expect(categories[0]).toBe(ALL_CATEGORIES);
    expect(new Set(categories).size).toBe(categories.length);
    for (const expected of ["Rhythm", "Puzzle", "Arcade", "Board", "Cards"]) {
      expect(categories).toContain(expected);
    }
  });
});

describe("filterCatalog", () => {
  test("returns everything for an empty query in All", () => {
    expect(filterCatalog(asCatalog, "", ALL_CATEGORIES).length).toBe(
      asCatalog.length,
    );
    expect(filterCatalog(asCatalog, "   ", ALL_CATEGORIES).length).toBe(
      asCatalog.length,
    );
  });

  test("matches on title, case-insensitively", () => {
    const results = filterCatalog(asCatalog, "FUNKIN", ALL_CATEGORIES);
    expect(results.map((game) => game.slug)).toContain("friday-night-funkin");
  });

  test("matches on tags and description", () => {
    expect(filterCatalog(asCatalog, "music", ALL_CATEGORIES).length).toBeGreaterThan(0);
    expect(
      filterCatalog(asCatalog, "neon", ALL_CATEGORIES).some(
        (game: CatalogGame) => game.slug === "slope",
      ),
    ).toBe(true);
  });

  test("filters by category", () => {
    const board = filterCatalog(asCatalog, "", "Board");
    expect(board.length).toBeGreaterThan(0);
    expect(board.every((game) => game.category === "Board")).toBe(true);
  });

  test("combines query and category", () => {
    expect(filterCatalog(asCatalog, "solitaire", "Cards").length).toBe(1);
    expect(filterCatalog(asCatalog, "checkers", "Board").length).toBe(1);
    expect(filterCatalog(asCatalog, "checkers", "Cards").length).toBe(0);
  });

  test("returns nothing for a nonsense query", () => {
    expect(filterCatalog(asCatalog, "zzzzz-nope", ALL_CATEGORIES).length).toBe(0);
  });
});

describe("sortCatalog", () => {
  test("puts featured games first, then sorts alphabetically", () => {
    const sorted = sortCatalog(asCatalog);
    const firstUnfeatured = sorted.findIndex((game) => !game.featured);
    const lastFeatured = sorted.map((game) => game.featured).lastIndexOf(true);
    expect(firstUnfeatured).toBeGreaterThan(lastFeatured);

    const titles = sorted.slice(firstUnfeatured).map((game) => game.title);
    expect([...titles].sort((a, b) => a.localeCompare(b))).toEqual(titles);
  });

  test("does not mutate the input array", () => {
    const input = [...asCatalog].reverse();
    const snapshot = input.map((game) => game.slug);
    sortCatalog(input);
    expect(input.map((game) => game.slug)).toEqual(snapshot);
  });
});

describe("DEFAULT_GAMES embed targets", () => {
  // A game that 404s or is served by a host that refuses framing shows up as a
  // raw nginx error page inside the frame, with nothing the player can do.
  test("every embed and play URL is absolute https", () => {
    for (const game of DEFAULT_GAMES) {
      expect(game.embedUrl.startsWith("https://")).toBe(true);
      expect(game.playUrl.startsWith("https://")).toBe(true);
    }
  });

  test("no two games share an embed URL", () => {
    const urls = DEFAULT_GAMES.map((game) => game.embedUrl);
    expect(new Set(urls).size).toBe(urls.length);
  });

  test("proxy mirrors use https too", () => {
    for (const game of DEFAULT_GAMES) {
      if (game.proxyUrl) expect(game.proxyUrl.startsWith("https://")).toBe(true);
    }
  });

  // hextris.io stopped resolving entirely, which is what made the catalog look
  // broken. The GitHub Pages build is the maintained one.
  test("Hextris points at a host that still answers", () => {
    const hextris = DEFAULT_GAMES.find((game) => game.slug === "hextris");
    expect(hextris?.embedUrl).toBe("https://hextris.github.io/");
  });
});

describe("catalog curation", () => {
  const slugs = DEFAULT_GAMES.map((game) => game.slug);

  // These were pulled as too plain for the shelf. Keeping them out stops a
  // future copy-paste from quietly putting them back.
  test("the plain vintage puzzles stay out", () => {
    for (const gone of ["peg-solitaire", "lightup", "net", "tents", "fifteen", "tetris"]) {
      expect(slugs).not.toContain(gone);
    }
  });

  test("Granny and Granny 2 are both here and playable", () => {
    for (const want of ["granny", "granny-2"]) {
      const game = DEFAULT_GAMES.find((entry) => entry.slug === want);
      expect(game).toBeDefined();
      // The portal's page URL is the wrapper; the .embed path is the frame.
      expect(game?.embedUrl.endsWith(".embed")).toBe(true);
      expect(game?.category).toBe("Horror");
    }
  });

  test("every game is reachable through the proxy fallback", () => {
    for (const game of DEFAULT_GAMES) {
      const target = game.proxyUrl ?? game.embedUrl;
      expect(target.startsWith("https://")).toBe(true);
    }
  });
});
