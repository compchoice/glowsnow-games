/**
 * End-to-end smoke test for the deployed proxy.
 *
 * It talks to the real HTTP action, so it only runs when the endpoint is
 * supplied:
 *
 *   DEX_PROXY_URL="$(grep -o 'VITE_CONVEX_SITE_URL=.*' .env.local | cut -d= -f2- | tr -d '"')/proxy" \
 *     bun test tests/proxy-endpoint.test.ts
 *
 * Without that variable every case is skipped, so the default `bun test` run
 * stays offline and deterministic.
 */
import { describe, expect, test } from "bun:test";

const BASE = process.env.DEX_PROXY_URL;
const maybeDescribe = BASE ? describe : describe.skip;

const wrapped = (target: string) => `${BASE}?url=${encodeURIComponent(target)}`;

maybeDescribe("deployed proxy", () => {
  test("serves a frameable, rewritten document", async () => {
    const response = await fetch(wrapped("https://example.com/"));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("x-frame-options")).toBeNull();
    expect(response.headers.get("content-security-policy")).toBeNull();
    expect(body).toContain('data-dex-proxy="shim"');
    expect(body).not.toMatch(/(?:href|src)="\/[^"]*"/);
  });

  test("rewrites a real site's internal links", async () => {
    const response = await fetch(wrapped("https://en.wikipedia.org/wiki/Main_Page"));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-frame-options")).toBeNull();
    const rewritten = body.match(/proxy\?url=/g) ?? [];
    expect(rewritten.length).toBeGreaterThan(100);
  });

  test("rewrites stylesheets it serves", async () => {
    const response = await fetch(
      wrapped("https://en.wikipedia.org/w/load.php?lang=en&modules=site.styles&only=styles&skin=vector-2022"),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/css");
    if (body.includes("url(")) {
      expect(body).toContain("proxy?url=");
    }
  });

  test("plays a catalog game host through the proxy", async () => {
    const response = await fetch(wrapped("https://play2048.co/"));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-frame-options")).toBeNull();
  });

  test("keeps query strings on the target", async () => {
    const response = await fetch(wrapped("https://example.com/?a=1&b=2"));
    expect(response.status).toBe(200);
  });

  test("refuses the internal network and non-http schemes", async () => {
    const targets = [
      "http://127.0.0.1/",
      "http://169.254.169.254/latest/meta-data/",
      "http://10.0.0.1/",
      "http://localhost:8080/",
      "file:///etc/passwd",
    ];
    for (const target of targets) {
      const response = await fetch(wrapped(target));
      const body = await response.text();
      expect(body).toContain("cannot be proxied");
    }
  });

  test("explains itself when no target is supplied", async () => {
    const response = await fetch(BASE as string);
    expect(await response.text()).toContain("cannot be proxied");
  });
});
