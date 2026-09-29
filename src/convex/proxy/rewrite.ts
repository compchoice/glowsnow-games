/**
 * Pure helpers for the in-page web proxy: which URLs may be proxied, how to
 * wrap them, and how to rewrite a fetched document so every link, asset and
 * form posts back through the proxy instead of the school network.
 */

const SKIP_PATTERN =
  /^(?:#|data:|blob:|javascript:|mailto:|tel:|about:|file:|ws:|wss:)/i;

/** Blocks the internal network so the proxy can't be used to probe it. */
export function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return true;

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".home.arpa") ||
    host === "metadata.google.internal"
  ) {
    return true;
  }

  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b, c, d] = v4.slice(1).map(Number);
    if ([a, b, c, d].some((part) => part > 255)) return true;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // carrier NAT
    return false;
  }

  // Bare IPv6 literals arrive bracketed in a URL; anything else with a colon
  // is a malformed host.
  return host.includes(":") || host.includes("[");
}

/** Parses and vets a target, returning null when it must not be proxied. */
export function parseTarget(raw: string | null): URL | null {
  if (!raw) return null;
  if (raw.length > 2000) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (isBlockedHost(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

export function toProxyUrl(absolute: string, proxyBase: string): string {
  return `${proxyBase}?url=${encodeURIComponent(absolute)}`;
}

function rewriteOne(
  value: string,
  base: string,
  proxyBase: string,
): string | null {
  const trimmed = value.trim();
  if (!trimmed || SKIP_PATTERN.test(trimmed)) return null;
  if (trimmed.startsWith(proxyBase)) return null;
  try {
    const absolute = new URL(trimmed, base).href;
    if (absolute.startsWith("data:") || absolute.startsWith("blob:")) return null;
    return toProxyUrl(absolute, proxyBase);
  } catch {
    return null;
  }
}

/** Rewrites one URL-ish attribute value, leaving it alone when in doubt. */
export function rewriteValue(
  value: string,
  base: string,
  proxyBase: string,
): string {
  return rewriteOne(value, base, proxyBase) ?? value;
}

function rewriteAttributes(
  html: string,
  base: string,
  proxyBase: string,
): string {
  // href, src, action, poster, formaction, data-src, data-href, xlink:href
  return html.replace(
    /(\s(?:href|src|action|poster|formaction|data-src|data-href|xlink:href)\s*=\s*)(["'])(.*?)\2/gi,
    (match, prefix: string, quote: string, value: string) => {
      const next = rewriteOne(value, base, proxyBase);
      return next ? `${prefix}${quote}${next}${quote}` : match;
    },
  );
}

function rewriteSrcset(html: string, base: string, proxyBase: string): string {
  return html.replace(
    /(\ssrcset\s*=\s*)(["'])(.*?)\2/gi,
    (match, prefix: string, quote: string, value: string) => {
      const next = value
        .split(",")
        .map((part: string) => {
          const [url, ...descriptor] = part.trim().split(/\s+/);
          const rewritten = rewriteOne(url ?? "", base, proxyBase);
          if (!rewritten) return part.trim();
          return [rewritten, ...descriptor].join(" ");
        })
        .join(", ");
      return `${prefix}${quote}${next}${quote}`;
    },
  );
}

function rewriteCss(html: string, base: string, proxyBase: string): string {
  let output = html.replace(
    /url\(\s*(["']?)([^"')]+)\1\s*\)/gi,
    (match, quote: string, value: string) => {
      const next = rewriteOne(value, base, proxyBase);
      return next ? `url(${quote}${next}${quote})` : match;
    },
  );

  output = output.replace(
    /@import\s+(["'])(.*?)\1/gi,
    (match, quote: string, value: string) => {
      const next = rewriteOne(value, base, proxyBase);
      return next ? `@import ${quote}${next}${quote}` : match;
    },
  );

  return output;
}

/**
 * Full document rewrite. Returns HTML that is safe to serve into an iframe on
 * our own origin: no framing headers, no CSP meta tags, and every URL pointed
 * back at the proxy.
 */
export function rewriteHtml(
  html: string,
  finalUrl: string,
  proxyBase: string,
  injection: string,
): string {
  let output = html;

  // Strip tags that would fight the proxy.
  output = output.replace(/<base\b[^>]*>/gi, "");
  output = output.replace(
    /<meta[^>]+http-equiv\s*=\s*["']?content-security-policy["']?[^>]*>/gi,
    "",
  );
  output = output.replace(
    /<meta[^>]+http-equiv\s*=\s*["']?x-frame-options["']?[^>]*>/gi,
    "",
  );

  // meta refresh redirects
  output = output.replace(
    /(<meta[^>]+http-equiv\s*=\s*["']?refresh["']?[^>]*content\s*=\s*["'][^"']*?url=)([^"';]+)/gi,
    (match, prefix: string, value: string) => {
      const next = rewriteOne(value, finalUrl, proxyBase);
      return next ? `${prefix}${next}` : match;
    },
  );

  output = rewriteAttributes(output, finalUrl, proxyBase);
  output = rewriteSrcset(output, finalUrl, proxyBase);
  output = rewriteCss(output, finalUrl, proxyBase);

  // Inject the runtime shim as early as possible.
  if (/<head[^>]*>/i.test(output)) {
    output = output.replace(/<head[^>]*>/i, (match) => `${match}${injection}`);
  } else if (/<html[^>]*>/i.test(output)) {
    output = output.replace(/<html[^>]*>/i, (match) => `${match}${injection}`);
  } else {
    output = injection + output;
  }

  return output;
}
