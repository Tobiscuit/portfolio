/**
 * The stylesheet's bundle and fingerprint, as pure functions (spec 003 R0):
 * the Worker joins the CSS files in order, strips comments and spare
 * whitespace, and serves the result at a URL carrying its hash, so it can be
 * cached for a year and a deploy that changes it changes the URL.
 */

/** FNV-1a, 32-bit, as 8 hex digits: a cache key, not a security property. */
export function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** Comments out, runs of whitespace collapsed. Strings in this site's CSS hold no comment markers. */
export function compactCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function bundleCss(parts: readonly string[]): { css: string; hash: string; href: string } {
  const css = compactCss(parts.join("\n"));
  const hash = fnv1a(css);
  return { css, hash, href: `/assets/site.${hash}.css` };
}
