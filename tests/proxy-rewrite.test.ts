import { describe, expect, test } from "bun:test";
import {
  isBlockedHost,
  parseTarget,
  rewriteHtml,
  rewriteValue,
  toProxyUrl,
} from "../src/convex/proxy/rewrite";
import { buildShim } from "../src/convex/proxy/shim";

const PROXY = "https://proxy.example/proxy";
const wrap = (url: string) => `${PROXY}?url=${encodeURIComponent(url)}`;

describe("isBlockedHost", () => {
  test("allows ordinary public hosts", () => {
    for (const host of ["example.com", "en.wikipedia.org", "8.8.8.8", "172.32.0.1", "11.0.0.1"]) {
      expect(isBlockedHost(host)).toBe(false);
    }
  });

  test("normalises case and trailing dots", () => {
    expect(isBlockedHost("EXAMPLE.COM.")).toBe(false);
  });

  test("blocks the internal network", () => {
    const blocked = [
      "",
      "localhost",
      "api.localhost",
      "printer.local",
      "vault.internal",
      "metadata.google.internal",
      "0.0.0.0",
      "127.0.0.1",
      "10.1.2.3",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.0.1",
      "169.254.169.254",
      "100.64.0.1",
      "999.1.1.1",
      "[::1]",
    ];
    for (const host of blocked) {
      expect(isBlockedHost(host)).toBe(true);
    }
  });
});

describe("parseTarget", () => {
  test("accepts public http and https URLs", () => {
    expect(parseTarget("https://example.com/a?b=c")?.href).toBe(
      "https://example.com/a?b=c",
    );
    expect(parseTarget("http://example.com/")?.hostname).toBe("example.com");
  });

  test("rejects every non-proxyable scheme", () => {
    for (const value of [
      null,
      "",
      "not a url",
      "javascript:alert(1)",
      "file:///etc/passwd",
      "ftp://example.com/x",
      "data:text/html,<h1>hi</h1>",
      "ws://example.com/socket",
    ]) {
      expect(parseTarget(value)).toBeNull();
    }
  });

  test("rejects internal addresses and oversized input", () => {
    expect(parseTarget("http://localhost:8080/admin")).toBeNull();
    expect(parseTarget("http://169.254.169.254/latest/meta-data/")).toBeNull();
    expect(parseTarget("http://10.0.0.1/")).toBeNull();
    expect(parseTarget("https://example.com/" + "a".repeat(2100))).toBeNull();
  });
});

describe("toProxyUrl / rewriteValue", () => {
  test("encodes the target so query strings survive", () => {
    expect(toProxyUrl("https://ex.com/a?b=1&c=2", PROXY)).toBe(
      `${PROXY}?url=https%3A%2F%2Fex.com%2Fa%3Fb%3D1%26c%3D2`,
    );
  });

  test("resolves relative URLs and leaves non-navigable ones alone", () => {
    expect(rewriteValue("/next", "https://site.dev/dir/page", PROXY)).toBe(
      wrap("https://site.dev/next"),
    );
    expect(rewriteValue("other.html", "https://site.dev/dir/page", PROXY)).toBe(
      wrap("https://site.dev/dir/other.html"),
    );
    for (const value of ["#top", "mailto:a@b.c", "data:image/png;base64,AAA", "javascript:void(0)"]) {
      expect(rewriteValue(value, "https://site.dev/dir/page", PROXY)).toBe(value);
    }
  });

  test("never double-wraps an already proxied URL", () => {
    const already = wrap("https://site.dev/next");
    expect(rewriteValue(already, "https://site.dev/", PROXY)).toBe(already);
  });
});

describe("rewriteHtml", () => {
  const base = "https://site.dev/dir/page";
  const shim = buildShim(PROXY, base);

  test("rewrites links, assets, forms and posters", () => {
    const html = `<a href="/next">n</a><img src="pic.png"><form action="/post"></form><video poster="/p.jpg"></video>`;
    const output = rewriteHtml(html, base, PROXY, shim);

    expect(output).toContain(wrap("https://site.dev/next"));
    expect(output).toContain(wrap("https://site.dev/dir/pic.png"));
    expect(output).toContain(wrap("https://site.dev/post"));
    expect(output).toContain(wrap("https://site.dev/p.jpg"));
  });

  test("rewrites srcset, inline CSS and @import", () => {
    const html = `<img srcset="/a.png 1x, /b.png 2x"><div style="background:url('/bg.png')"></div><style>@import "/x.css";</style>`;
    const output = rewriteHtml(html, base, PROXY, shim);

    expect(output).toContain(`${wrap("https://site.dev/a.png")} 1x, ${wrap("https://site.dev/b.png")} 2x`);
    expect(output).toContain(`url('${wrap("https://site.dev/bg.png")}')`);
    expect(output).toContain(`@import "${wrap("https://site.dev/x.css")}"`);
  });

  test("strips tags that would fight the proxy", () => {
    const html = `<head><base href="/"><meta http-equiv="Content-Security-Policy" content="default-src 'self'"><meta http-equiv="X-Frame-Options" content="DENY"></head>`;
    const output = rewriteHtml(html, base, PROXY, shim);

    expect(output).not.toMatch(/<base\b/i);
    expect(output).not.toContain("Content-Security-Policy");
    expect(output).not.toContain("X-Frame-Options");
  });

  test("rewrites meta refresh redirects", () => {
    const html = `<meta http-equiv="refresh" content="0; url=/home">`;
    const output = rewriteHtml(html, base, PROXY, shim);

    expect(output).toContain(wrap("https://site.dev/home"));
  });

  test("injects the shim inside the head", () => {
    const output = rewriteHtml("<html><head><title>t</title></head><body></body></html>", base, PROXY, shim);

    expect(output).toContain('data-dex-proxy="shim"');
    expect(output.indexOf('data-dex-proxy="shim"')).toBeLessThan(output.indexOf("<title>"));
  });

  test("injects the shim even without a head or html tag", () => {
    const output = rewriteHtml("<p>hello</p>", base, PROXY, shim);
    expect(output.startsWith("<script")).toBe(true);
  });

  test("leaves a realistic document with no unproxied relative URLs", () => {
    const html = `<html><head><link rel="stylesheet" href="/app.css"></head><body><a href="/a">a</a><script src="/app.js"></script></body></html>`;
    const output = rewriteHtml(html, base, PROXY, shim);

    expect(output).not.toMatch(/(?:href|src)="\//);
    expect(output).not.toMatch(/(?:href|src)="[^h"][^"]*\.(?:css|js|png|jpg)"/);
  });
});

describe("buildShim", () => {
  test("embeds the proxy base and target as safe JS string literals", () => {
    const target = 'https://site.dev/a"b\\c';
    const shim = buildShim(PROXY, target);

    expect(shim).toContain(JSON.stringify(PROXY));
    expect(shim).toContain(JSON.stringify(target));
    expect(shim).not.toContain("__PROXY_BASE__");
    expect(shim).not.toContain("__PROXY_TARGET__");
    expect(shim.endsWith("</script>")).toBe(true);
  });

  test("wraps a value the same way the server does", () => {
    const shim = buildShim(PROXY, "https://site.dev/dir/page");
    // the shim builds URLs as BASE + "?url=" + encodeURIComponent(absolute)
    expect(shim).toContain('BASE + "?url=" + encodeURIComponent(resolved)');
    expect(shim).toContain("window.__dexProxyUrl = wrap");
  });
});
