/** Site identity */
export const SITE_NAME = "Dex:Active";
export const SITE_TAGLINE = "Play, search, and talk — all from one clean tab.";
export const SITE_DESCRIPTION =
  "Dex:Active is a hosted arcade with a Brave-powered search proxy and a members' lounge.";
export const BASE_TITLE = "Dex:Active — Games, search and community";

/** Proxy: Brave Search (opens in a new tab so results can never be frame-broken) */
export const BRAVE_SEARCH_URL = "https://search.brave.com/search?q=";

export type NavLink = { label: string; to: string };

export const NAV_LINKS: NavLink[] = [
  { label: "Games", to: "/games" },
  { label: "Proxy", to: "/proxy" },
  { label: "Community", to: "/community" },
  { label: "Chat", to: "/chat" },
];

/** Panic-key cloaking presets: the tab pretends to be schoolwork. */
export type TabPreset = {
  label: string;
  icon: string;
  title: string;
};

export const TAB_PRESETS: TabPreset[] = [
  { label: "Google Classroom", icon: "📚", title: "Classes" },
  { label: "Google Drive", icon: "📁", title: "My Drive - Google Drive" },
  { label: "Google Docs", icon: "📄", title: "Untitled document - Google Docs" },
  { label: "Canvas LMS", icon: "🎓", title: "Dashboard" },
  { label: "Wikipedia", icon: "🌐", title: "Wikipedia, the free encyclopedia" },
  {
    label: "Khan Academy",
    icon: "🧮",
    title: "Khan Academy | Free Online Courses, Lessons & Practice",
  },
];

/** Emoji-as-favicon data URI so cloaked tabs get a believable icon too. */
export function emojiFavicon(emoji: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="0.9em" font-size="90">${emoji}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
