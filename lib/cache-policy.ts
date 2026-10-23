/**
 * What Workers Cache and browsers may keep, for every response the Worker
 * returns (spec 003, plan section 3). Workers Cache sits in front of the
 * Worker and follows the response's Cache-Control (RFC 9111); a response
 * without one is cached heuristically, a 200 for two hours. So nothing leaves
 * without an explicit header, and anything this module does not recognise as
 * public is never stored.
 *
 * Adapted from montano-btm's lib/cache-policy.ts (develop, its spec 008
 * decision 13). New here: a shown video keeps the engine's own header (engine
 * spec 028: `public, max-age=300`, so "Hide from my website" reaches every
 * cache within five minutes) and is never made immutable; the content-hashed
 * stylesheet; htmx fragments.
 *
 * Pure (Request and Response only), so the unit tests run it in Node.
 */

export type CachePolicy = "immutable" | "private-media" | "public-page" | "upstream" | "private";

export const CACHE_CONTROL: Record<Exclude<CachePolicy, "upstream">, string> = {
  // Engine images (content-addressed by key) and the hashed stylesheet.
  immutable: "public, max-age=31536000, immutable",
  // A /media key the engine marks private: the visitor's browser keeps it a
  // day; no shared cache keeps it at all.
  "private-media": "private, max-age=86400",
  // Public pages: the edge serves a copy for a minute, then a stale copy for up
  // to ten while it fetches a new one; browsers always ask again.
  "public-page": "public, max-age=0, s-maxage=60, stale-while-revalidate=600",
  private: "private, no-store",
};

/** Types a public page may be: HTML, and the XML and text of sitemap.xml and robots.txt. */
const PAGE_TYPES = /^(text\/html|application\/xml|text\/xml|text\/plain)\b/i;

/** `/media/<slug>/video/...`: a shown clip (engine spec 028). */
const VIDEO = /^\/media\/[^/]+\/video\//;

/** The stylesheet's content-hashed URL (src/assets.ts). */
const HASHED_ASSET = /^\/assets\/site\.[0-9a-f]{8,}\.css$/;

export function cachePolicy(request: Request, response: Response): CachePolicy {
  const path = new URL(request.url).pathname;
  if (request.method !== "GET" && request.method !== "HEAD") return "private";
  if (response.headers.has("set-cookie")) return "private";
  if (request.headers.get("hx-request") === "true") return "private";
  if (path === "/api" || path.startsWith("/api/")) return "private";
  const ok = response.status === 200 || response.status === 304;
  if (VIDEO.test(path)) {
    const upstream = response.headers.get("cache-control") ?? "";
    // Only the engine's own, finite header survives; a Worker's 206 is never
    // stored by Workers Cache anyway (it slices ranges from the stored 200).
    if (!ok || upstream === "" || /\bimmutable\b/i.test(upstream)) return "private";
    return "upstream";
  }
  if (path.startsWith("/media/")) {
    if (!ok) return "private";
    return /\bprivate\b/i.test(response.headers.get("cache-control") ?? "") ? "private-media" : "immutable";
  }
  if (path.startsWith("/assets/")) return ok && HASHED_ASSET.test(path) ? "immutable" : "private";
  if (response.status === 200 && PAGE_TYPES.test(response.headers.get("content-type") ?? "")) return "public-page";
  return "private";
}

/** The response with its policy's Cache-Control, replacing whatever it had (except "upstream", which keeps it). */
export function withCachePolicy(request: Request, response: Response): Response {
  const policy = cachePolicy(request, response);
  const out = new Response(response.body, response);
  if (policy !== "upstream") out.headers.set("cache-control", CACHE_CONTROL[policy]);
  return out;
}
