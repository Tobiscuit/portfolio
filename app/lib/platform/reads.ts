import type { BusinessProfile, Post, PostSummary, SitemapEntry } from "@jrcodex/seo-kit";
import { cache } from "react";

import { describeError, readPost, readPosts, readProfile, readSitemap } from "./client";
import { platformEnv } from "./env";
import { plainPost, plainPostSummary } from "./images";
import { readVideos, type VideoSummary } from "./videos";

/**
 * The platform's reads for server components, with the environment from
 * env.ts and every engine picture pointed at /media/<key> (images.ts). React's
 * `cache()` shares one engine call per request between a page, its metadata,
 * the header and the footer (montano-btm's lib/business-server.ts).
 *
 * listPosts and getPost let a connected failure through (a 5xx on /blog); the
 * *OrNone reads are for what must render without the engine: the sitemap and
 * the footer. getProfile and listVideos never throw.
 */

export const listPosts = cache(async (): Promise<PostSummary[]> => (await readPosts(platformEnv())).map(plainPostSummary));

/** null when there is no such post: the page's notFound(). */
export const getPost = cache(async (slug: string): Promise<Post | null> => {
  const post = await readPost(platformEnv(), slug);
  return post === null ? null : plainPost(post);
});

export const getProfile = cache((): Promise<BusinessProfile> => readProfile(platformEnv()));

export const listVideos = cache((): Promise<VideoSummary[]> => readVideos(platformEnv()));

/** For the sitemap: [] when the engine cannot answer. */
export async function postsOrNone(): Promise<PostSummary[]> {
  try {
    return await listPosts();
  } catch (error) {
    console.warn(`[platform] posts: showing none: ${describeError(error)}`);
    return [];
  }
}

/** For the sitemap: [] when the engine cannot answer. */
export async function sitemapOrNone(): Promise<SitemapEntry[]> {
  try {
    return await readSitemap(platformEnv());
  } catch (error) {
    console.warn(`[platform] sitemap: showing none: ${describeError(error)}`);
    return [];
  }
}
