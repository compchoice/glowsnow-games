/** The Convex HTTP action that serves as our proxy. */
export function proxyEndpoint(): string | null {
  const site = import.meta.env.VITE_CONVEX_SITE_URL as string | undefined;
  if (!site) return null;
  return `${site.replace(/\/+$/, "")}/proxy`;
}

export function proxyUrl(target: string): string | null {
  const endpoint = proxyEndpoint();
  if (!endpoint) return null;
  return `${endpoint}?url=${encodeURIComponent(target)}`;
}

const URL_LIKE = /^https?:\/\//i;
const DOMAIN_LIKE = /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i;

export function looksLikeAddress(input: string): boolean {
  const value = input.trim();
  if (!value || /\s/.test(value)) return false;
  return URL_LIKE.test(value) || DOMAIN_LIKE.test(value);
}

export function toTargetUrl(input: string): string {
  const value = input.trim();
  if (URL_LIKE.test(value)) return value;
  return `https://${value}`;
}

/** Turns whatever is in the address bar into something we can load. */
export function resolveAddress(input: string): {
  kind: "address" | "search";
  value: string;
} {
  const value = input.trim();
  if (looksLikeAddress(value)) {
    return { kind: "address", value: toTargetUrl(value) };
  }
  return { kind: "search", value };
}

/** Unwraps a proxied URL so the toolbar shows the real address. */
export function displayTarget(url: string): string {
  const endpoint = proxyEndpoint();
  if (endpoint && url.startsWith(endpoint)) {
    try {
      const parsed = new URL(url);
      const target = parsed.searchParams.get("url");
      if (target) return target;
    } catch {
      /* fall through to the raw URL */
    }
  }
  return url;
}

export type Shortcut = { label: string; url: string };

export const SHORTCUTS: Shortcut[] = [
  { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Main_Page" },
  { label: "Brave Search", url: "https://search.brave.com/" },
  { label: "MDN Web Docs", url: "https://developer.mozilla.org/" },
  { label: "Friday Night Funkin'", url: "https://kdata1.com/2020/05/fnf/" },
  { label: "2048", url: "https://play2048.co/" },
  { label: "Science News", url: "https://www.sciencenewsforstudents.org/" },
];
