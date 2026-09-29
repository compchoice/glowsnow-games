/**
 * The tab icon: a snowflake in the visitor's accent colour.
 *
 * A browser tab title is plain text and cannot be coloured or glowing, but the
 * favicon can be — so the "purple snow" identity lives here, and it follows the
 * accent chosen in Settings rather than being frozen at the shipped violet.
 */

type Mode = "dark" | "light";

/** One arm of the flake, with barbs at both tips. Rotated to make six. */
const ARM = "M16 4V28M11 8.5L16 13L21 8.5M11 23.5L16 19L21 23.5";

/**
 * HSL rather than oklch: favicons are rendered as standalone images, and oklch
 * in an SVG image is not supported everywhere. Converting the accent hue is
 * trivial and hsl works everywhere.
 */
function flakeColor(hue: number, mode: Mode): string {
  if (mode === "light") {
    // A deeper flake so it still reads against a light tab bar.
    return `hsl(${hue} 72% 42%)`;
  }
  return `hsl(${hue} 88% 74%)`;
}

export function snowflakeFavicon(hue: number, mode: Mode): string {
  const color = flakeColor(hue, mode);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
    `<g fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="${ARM}"/>` +
    `<path d="${ARM}" transform="rotate(60 16 16)"/>` +
    `<path d="${ARM}" transform="rotate(120 16 16)"/>` +
    `</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Points the tab icon at whatever the current look calls for. */
export function setFavicon(href: string) {
  if (typeof document === "undefined") return;
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = href;
}
