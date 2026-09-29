/**
 * The runtime shim injected into every proxied HTML document.
 *
 * Server-side rewriting fixes links and assets that exist in the markup. This
 * script covers the URLs a page builds at runtime: fetch, XMLHttpRequest,
 * EventSource, window.open, history pushes, and anchor clicks.
 *
 * Written without template literals so it can live inside a TS template.
 */
const SHIM_SOURCE = `(function () {
  var BASE = "__PROXY_BASE__";
  var TARGET = "__PROXY_TARGET__";
  if (window.__dexProxyShim) return;
  window.__dexProxyShim = true;

  var SKIP = /^(?:#|data:|blob:|javascript:|mailto:|tel:|about:|ws:|wss:)/i;

  function absolute(value) {
    try {
      return new URL(value, TARGET).href;
    } catch (error) {
      return null;
    }
  }

  function wrap(value) {
    var raw = String(value == null ? "" : value);
    if (!raw) return raw;
    if (raw.indexOf(BASE) === 0) return raw;
    if (SKIP.test(raw)) return raw;
    var resolved = absolute(raw);
    if (!resolved) return raw;
    if (SKIP.test(resolved)) return raw;
    return BASE + "?url=" + encodeURIComponent(resolved);
  }

  window.__dexProxyUrl = wrap;
  window.__dexProxyTarget = TARGET;

  // fetch
  var originalFetch = window.fetch;
  if (originalFetch) {
    window.fetch = function (input, init) {
      try {
        if (typeof input === "string") {
          input = wrap(input);
        } else if (input && typeof input === "object" && input.url) {
          input = new Request(wrap(input.url), input);
        }
      } catch (error) {
        /* fall through with the original input */
      }
      return originalFetch.call(this, input, init);
    };
  }

  // XMLHttpRequest
  var originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    var args = Array.prototype.slice.call(arguments);
    args[1] = wrap(url);
    return originalOpen.apply(this, args);
  };

  // EventSource
  var OriginalEventSource = window.EventSource;
  if (OriginalEventSource) {
    var WrappedEventSource = function (url, config) {
      return new OriginalEventSource(wrap(url), config);
    };
    WrappedEventSource.prototype = OriginalEventSource.prototype;
    window.EventSource = WrappedEventSource;
  }

  // window.open
  var originalOpenWindow = window.open;
  window.open = function (url, name, features) {
    if (!url) return originalOpenWindow.call(window, url, name, features);
    return originalOpenWindow.call(window, wrap(url), name, features);
  };

  // history push/replace so client-side routers keep working
  ["pushState", "replaceState"].forEach(function (method) {
    var original = history[method];
    history[method] = function (state, title, url) {
      if (url === undefined || url === null) {
        return original.call(history, state, title, url);
      }
      return original.call(history, state, title, wrap(url));
    };
  });

  // Anchor clicks: prefer the raw attribute so relative links stay proxyable.
  document.addEventListener(
    "click",
    function (event) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      var node = event.target;
      while (node && node.tagName !== "A") node = node.parentElement;
      if (!node) return;
      if (node.target && node.target !== "_self") return;
      var href = node.getAttribute("href");
      if (!href) {
        if (node.href) window.location.href = wrap(node.href);
        event.preventDefault();
        return;
      }
      if (SKIP.test(href)) return;
      event.preventDefault();
      window.location.href = wrap(href);
    },
    true
  );

  // form submissions that would otherwise post to the original origin
  document.addEventListener(
    "submit",
    function (event) {
      var form = event.target;
      if (!form || form.tagName !== "FORM") return;
      var action = form.getAttribute("action");
      if (!action) return;
      if (SKIP.test(action)) return;
      form.setAttribute("action", wrap(action));
    },
    true
  );
})();`;

/** Builds the script tag injected into a proxied document. */
export function buildShim(proxyBase: string, targetUrl: string): string {
  const source = SHIM_SOURCE.replace(
    '"__PROXY_BASE__"',
    JSON.stringify(proxyBase),
  ).replace('"__PROXY_TARGET__"', JSON.stringify(targetUrl));

  return `<script data-dex-proxy="shim">${source}</script>`;
}
