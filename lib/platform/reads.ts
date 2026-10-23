import type { BusinessProfile, Post, PostSummary, ResponsiveImage, SeoClient, SitemapEntry } from "@jrcodex/seo-kit";

import { describe, engineClient, type EngineEnv } from "../seo";
import { DEFAULT_LOCALE, FALLBACK_PROFILE } from "../site";
import { plainPost, plainPostSummary } from "./images";

/**
 * The site's reads from the engine: the anti-corruption layer (spec 003,
 * domain-model sections 1 and 4). From PR #4's `app/lib/platform/client.ts`
 * (feat/proprietor-adoption), with the transport fixed to rpc() over the SEO
 * binding and the env passed in by the route.
 *
 *   - Unconnected (no binding, or no valid key): empty lists and the fallback
 *     profile, logged once per isolate.
 *   - Connected, and a list or single read fails: the error goes through, so
 *     /blog answers 5xx (crawlers retry). The profile never throws.
 *   - A single read that finds nothing is null: the page's 404.
 *   - Every answer is checked against the kit's shapes before a page sees it.
 *
 * Reads write nothing, so they are allowed from any host.
 */

export interface ReadOptions {
  /** True off the production host: pictures become their stored originals (images.ts). */
  originals?: boolean;
}

const warned = new Set<string>();
/** Once per isolate per message, so an unconnected site does not log on every request. */
export function warnOnce(message: string): void {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(`[platform] ${message}`);
}

/** The kit's client for this env, or null when the site is not connected to the engine. */
export function platformClient(env: EngineEnv): SeoClient | null {
  try {
    return engineClient(env);
  } catch (error) {
    // The kit's SiteKeyError names the variable, never its value.
    warnOnce(`not connected to the engine: ${describe(error)}`);
    return null;
  }
}

// ---- Shapes -----------------------------------------------------------------

const isString = (value: unknown): value is string => typeof value === "string";
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
/** A path on this site, never another origin: the engine hands out root-relative paths. */
export const onSite = (value: unknown): value is string => isString(value) && value.startsWith("/") && !value.startsWith("//");

function isPicture(value: unknown): value is ResponsiveImage {
  return isRecord(value) && isString(value.key) && isString(value.alt) && isString(value.src) && isString(value.srcset) && isString(value.sizes);
}

function isPostSummary(value: unknown): value is PostSummary {
  return (
    isRecord(value) &&
    isString(value.slug) && value.slug !== "" &&
    isString(value.locale) &&
    onSite(value.path) &&
    isString(value.title) && value.title.trim() !== "" &&
    isString(value.excerpt) &&
    isString(value.publishedAt) && !Number.isNaN(Date.parse(value.publishedAt)) &&
    (value.hero === null || isPicture(value.hero)) &&
    isString(value.category) &&
    typeof value.readingMinutes === "number"
  );
}

function isPost(value: unknown): value is Post {
  if (!isPostSummary(value)) return false;
  const p = value as unknown as Record<string, unknown>;
  const layout = p.layout;
  return (
    isString(p.html) &&
    Array.isArray(p.blocks) && p.blocks.every(isString) &&
    isRecord(layout) && Array.isArray(layout.figures) && Array.isArray(layout.inserts) && isString(layout.opening) && isString(layout.closing) &&
    isString(p.canonical) &&
    Array.isArray(p.alternates) && p.alternates.every((a) => isRecord(a) && isString(a.locale) && isString(a.url)) &&
    (p.xDefault === null || (isRecord(p.xDefault) && isString(p.xDefault.url))) &&
    Array.isArray(p.jsonLd) &&
    Array.isArray(p.locales) && p.locales.every(isString)
  );
}

function isSitemapEntry(value: unknown): value is SitemapEntry {
  return isRecord(value) && onSite(value.path) && isString(value.lastModified) && isRecord(value.alternates);
}

const E164 = /^\+[1-9]\d{6,14}$/;
const TEAMS: ReadonlyArray<unknown> = ["solo", "crew", null];

function isProfile(value: unknown): value is BusinessProfile {
  return (
    isRecord(value) &&
    isString(value.name) && value.name.trim() !== "" &&
    (value.telephone === null || (isString(value.telephone) && E164.test(value.telephone))) &&
    (value.email === null || (isString(value.email) && value.email.includes("@"))) &&
    (value.address === null || isRecord(value.address)) &&
    isRecord(value.social) &&
    Array.isArray(value.serviceArea) && value.serviceArea.every(isString) &&
    isString(value.updatedAt)
  );
}

/** The items that have the shape, and a line saying how many did not. */
function keepValid<T>(label: string, answer: unknown, check: (value: unknown) => value is T): T[] {
  if (!Array.isArray(answer)) throw new Error(`the engine's answer for ${label} is not a list`);
  const valid = answer.filter(check);
  if (valid.length < answer.length) warnOnce(`${label}: dropped ${answer.length - valid.length} item(s) with an unexpected shape`);
  return valid;
}

// ---- Reads ------------------------------------------------------------------

/** Newest first; [] when unconnected. A failed read throws. */
export async function readPosts(env: EngineEnv, opts: ReadOptions = {}): Promise<PostSummary[]> {
  const client = platformClient(env);
  if (!client) return [];
  const posts = keepValid("posts", await client.posts(DEFAULT_LOCALE), isPostSummary);
  return opts.originals ? posts.map(plainPostSummary) : posts;
}

/** One post, or null when there is none or the site is unconnected. A failed or malformed read throws. */
export async function readPost(env: EngineEnv, slug: string, opts: ReadOptions = {}): Promise<Post | null> {
  const client = platformClient(env);
  if (!client) return null;
  const post: unknown = await client.post(DEFAULT_LOCALE, slug);
  if (post === null) return null;
  if (!isPost(post)) throw new Error(`the engine's answer for /blog/${slug} is not a Post`);
  return opts.originals ? plainPost(post) : post;
}

/** The engine's sitemap entries for the posts; [] when unconnected. A failed read throws. */
export async function readSitemap(env: EngineEnv): Promise<SitemapEntry[]> {
  const client = platformClient(env);
  if (!client) return [];
  return keepValid("sitemap", await client.sitemap(), isSitemapEntry);
}

/** The owner's profile, or the site's own facts when the engine cannot give one. Never throws. */
export async function readProfile(env: EngineEnv): Promise<BusinessProfile> {
  const client = platformClient(env);
  if (!client) return FALLBACK_PROFILE;
  try {
    const profile: unknown = await client.profile();
    if (isProfile(profile)) return { ...profile, team: TEAMS.includes(profile.team) ? profile.team : null };
    warnOnce("profile: the engine's answer is not a BusinessProfile; using lib/site.ts");
  } catch (error) {
    warnOnce(`profile: ${describe(error)}; using lib/site.ts`);
  }
  return FALLBACK_PROFILE;
}
