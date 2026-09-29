/** Site identity */
export const SITE_NAME = "SnowVault Arcade";

/** Version-1 game: Friday Night Funkin' (HTML5 mirror made for iframe embedding) */
export const FNF_EMBED_URL = "https://kdata1.com/2020/05/fnf/";
export const FNF_PLAY_URL = FNF_EMBED_URL; // open-direct fallback

/** Version-1 proxy: Brave Search (opens in a new tab so results can't be frame-broken) */
export const BRAVE_SEARCH_URL = "https://search.brave.com/search?q=";

/** Panic-key cloaking presets: the page pretends to be schoolwork */
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

/** Emoji-as-favicon data URI so cloaked tabs even get a believable icon */
export function emojiFavicon(emoji: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="0.9em" font-size="90">${emoji}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
