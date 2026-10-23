import { Hono } from "hono";

import { readSitemap } from "../../lib/platform/reads";
import { absolute, SITE_URL } from "../../lib/site";
import type { AppEnv } from "../env";

/**
 * /sitemap.xml and /robots.txt (spec 003 section 2.3): the site's own pages
 * plus the engine's post entries, absolute on the canonical origin. If the
 * engine cannot be read, the sitemap still lists the site's own pages.
 */
export const seo = new Hono<AppEnv>();

/** The site's own indexable pages. /videos joins only when it has clips (it is noindex while empty). */
export const OWN_PAGES = ["/", "/work", "/about", "/blog", "/contact"] as const;

const escapeXml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

seo.get("/sitemap.xml", async (c) => {
  let posts: Array<{ loc: string; lastmod: string }> = [];
  try {
    posts = (await readSitemap(c.env)).map((entry) => ({ loc: absolute(entry.path), lastmod: entry.lastModified }));
  } catch (error) {
    console.error(`[sitemap] the engine could not be read: ${error instanceof Error ? error.name : "error"}`);
  }
  const urls = [...OWN_PAGES.map((path) => ({ loc: absolute(path), lastmod: null as string | null })), ...posts];
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `<lastmod>${escapeXml(u.lastmod)}</lastmod>` : ""}</url>`).join("\n") +
    `\n</urlset>\n`;
  return c.body(body, 200, { "content-type": "application/xml; charset=utf-8" });
});

seo.get("/robots.txt", (c) => c.text(`User-agent: *\nAllow: /\n\nSitemap: ${new URL("sitemap.xml", SITE_URL).href}\n`));
