import type { MetadataRoute } from "next";
import { sitemapEntries } from "@jrcodex/seo-kit/next";

import { getProjects } from "@/lib/getProjects";
import { postsOrNone, sitemapOrNone } from "@/lib/platform/reads";
import { absolute, SITE_URL } from "@/lib/site";

/**
 * /sitemap.xml (specs/002-proprietor-adoption, A5), absolute on the canonical
 * origin:
 *   - the site's own pages and /projects;
 *   - each /projects/<id>, through the existing getProjects() (Payload, or the
 *     hard-coded data when Payload is off; D1 keeps projects there);
 *   - /blog and every post, with the engine's dates and alternates, while the
 *     engine has any;
 *   - never /videos: an index of players is not a page to rank.
 * It always answers: an engine or Payload failure leaves its part out.
 * Rendered per request, so a new post is listed without a deploy.
 */
export const dynamic = "force-dynamic";

const OWN_PAGES = ["/", "/about", "/contact", "/projects"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, posts, entries] = await Promise.all([projectEntries(), postsOrNone(), sitemapOrNone()]);
  const blog: MetadataRoute.Sitemap =
    posts.length > 0 || entries.length > 0 ? [{ url: absolute("/blog") }, ...sitemapEntries(entries, new URL(SITE_URL).origin)] : [];
  return [...OWN_PAGES.map((path) => ({ url: absolute(path) })), ...projects, ...blog];
}

async function projectEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    return (await getProjects()).map((project) => ({ url: absolute(`/projects/${project.id}`) }));
  } catch (error) {
    console.error("[sitemap] could not read the projects; listing none", error);
    return [];
  }
}
