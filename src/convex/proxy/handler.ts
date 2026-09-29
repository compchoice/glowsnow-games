import { buildShim } from "./shim";
import { parseTarget, rewriteHtml, rewriteValue } from "./rewrite";

const MAX_DOCUMENT_BYTES = 4_000_000; // 4 MB of HTML/CSS
const MAX_ASSET_BYTES = 10_000_000; // 10 MB of anything else
const FETCH_TIMEOUT_MS = 20_000;

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function baseHeaders(): Headers {
  const headers = new Headers();
  headers.set("access-control-allow-origin", "*");
  headers.set("x-dex-proxy", "1");
  return headers;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Styled error page shown inside the frame, which also notifies the parent UI. */
function errorPage(message: string, detail?: string): Response {
  const headers = baseHeaders();
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-store");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Proxy message</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
    background: #1a1720; color: #eae7f2;
    font-family: Outfit, system-ui, -apple-system, "Segoe UI", sans-serif; }
  .card { max-width: 30rem; padding: 2rem; text-align: center; }
  h1 { font-size: 1.15rem; margin: 0 0 0.6rem; }
  p { margin: 0 0 0.4rem; color: #a9a3bd; font-size: 0.9rem; line-height: 1.5; }
  code { color: #b98cff; font-family: ui-monospace, Menlo, monospace; font-size: 0.8rem;
    word-break: break-all; }
  button { margin-top: 1.2rem; border: 1px solid rgba(185,140,255,0.45);
    background: rgba(185,140,255,0.12); color: #d9c6ff; border-radius: 0.6rem;
    padding: 0.5rem 1rem; font: inherit; font-size: 0.85rem; cursor: pointer; }
</style></head>
<body><div class="card">
  <h1>${escapeHtml(message)}</h1>
  <p>Some sites refuse to be proxied — they may block it, require a sign-in, or use connections the proxy can't carry.</p>
  ${detail ? `<p><code>${escapeHtml(detail)}</code></p>` : ""}
  <button onclick="location.reload()">Try again</button>
</div>
<script>
  try {
    parent.postMessage({ type: "dex-proxy-message", message: ${JSON.stringify(message)} }, "*");
  } catch (error) {}
</script>
</body></html>`;

  return new Response(html, { status: 200, headers });
}

function decodeBody(buffer: ArrayBuffer, contentType: string): string {
  const charset = /charset=([^;]+)/i.exec(contentType)?.[1]?.trim().toLowerCase();
  for (const candidate of [charset, "utf-8", "windows-1252"]) {
    if (!candidate) continue;
    try {
      return new TextDecoder(candidate).decode(buffer);
    } catch {
      // unknown label — try the next candidate
    }
  }
  return new TextDecoder("utf-8").decode(buffer);
}

/**
 * The proxy itself. Anything the browser asks for is fetched here (so the
 * visitor's network only ever sees this deployment), rewritten when it is a
 * document or stylesheet, and returned without the framing headers that
 * normally stop a site loading inside another page.
 */
export async function handleProxyRequest(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);

  if (request.method === "OPTIONS") {
    const headers = baseHeaders();
    headers.set("access-control-allow-methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    headers.set("access-control-allow-headers", "*");
    headers.set("access-control-max-age", "86400");
    return new Response(null, { status: 204, headers });
  }

  const proxyBase = `${requestUrl.origin}${requestUrl.pathname}`;
  const target = parseTarget(requestUrl.searchParams.get("url"));

  if (!target) {
    return errorPage(
      "That address cannot be proxied",
      "Only public http and https addresses are allowed.",
    );
  }

  const method = request.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  const upstreamHeaders = new Headers();
  const accept = request.headers.get("accept");
  upstreamHeaders.set("accept", accept ?? "*/*");
  const acceptLanguage = request.headers.get("accept-language");
  if (acceptLanguage) upstreamHeaders.set("accept-language", acceptLanguage);
  const contentTypeHeader = request.headers.get("content-type");
  if (contentTypeHeader) upstreamHeaders.set("content-type", contentTypeHeader);
  const range = request.headers.get("range");
  if (range) upstreamHeaders.set("range", range);

  upstreamHeaders.set(
    "user-agent",
    request.headers.get("user-agent") ?? DEFAULT_USER_AGENT,
  );
  // Pretend the request comes from the target site itself, so hotlink
  // protection and CSRF origin checks behave normally.
  upstreamHeaders.set("referer", `${target.origin}/`);
  if (method === "POST" || method === "PUT" || method === "PATCH") {
    upstreamHeaders.set("origin", target.origin);
  }
  upstreamHeaders.set("accept-encoding", "gzip, deflate");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch(target.href, {
      method,
      headers: upstreamHeaders,
      body,
      redirect: "follow",
      signal: controller.signal,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown network error";
    return errorPage("The site could not be reached", reason);
  } finally {
    clearTimeout(timer);
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  const isHtml = /text\/html|application\/xhtml\+xml/i.test(contentType);
  const isCss = /text\/css/i.test(contentType);
  const isTextual = isHtml || isCss || /(?:json|javascript|xml|plain)/i.test(contentType);

  let buffer: ArrayBuffer;
  try {
    buffer = await upstream.arrayBuffer();
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Response could not be read";
    return errorPage("The site sent a response we could not read", reason);
  }

  const limit = isHtml || isCss ? MAX_DOCUMENT_BYTES : MAX_ASSET_BYTES;
  if (buffer.byteLength > limit) {
    return errorPage(
      "That page is too large to proxy",
      `Limit is ${(limit / 1_000_000).toFixed(0)} MB.`,
    );
  }

  const finalUrl = upstream.url || target.href;
  const headers = baseHeaders();
  headers.set(
    "content-type",
    isTextual ? `${contentType.split(";")[0]}; charset=utf-8` : contentType,
  );
  headers.set("cache-control", isHtml ? "no-store" : "public, max-age=300");

  if (method === "HEAD" || upstream.status === 204 || upstream.status === 304) {
    return new Response(null, { status: upstream.status, headers });
  }

  if (isHtml) {
    const text = decodeBody(buffer, contentType);
    const rewritten = rewriteHtml(
      text,
      finalUrl,
      proxyBase,
      buildShim(proxyBase, finalUrl),
    );
    return new Response(rewritten, { status: upstream.status, headers });
  }

  if (isCss) {
    const text = decodeBody(buffer, contentType);
    // Point every url() reference back through the proxy.
    const rewritten = text.replace(
      /url\(\s*(["']?)([^"')]+)\1\s*\)/gi,
      (match, quote: string, value: string) => {
        const next = rewriteValue(value, finalUrl, proxyBase);
        return next === value ? match : `url(${quote}${next}${quote})`;
      },
    );
    return new Response(rewritten, { status: upstream.status, headers });
  }

  return new Response(buffer, { status: upstream.status, headers });
}
