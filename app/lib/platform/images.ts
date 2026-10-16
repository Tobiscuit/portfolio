import type { Post, PostSummary } from "@jrcodex/seo-kit";

/**
 * The engine builds its image URLs for Cloudflare's image transformations:
 * `/cdn-cgi/image/<options>/media/<key>`, root-relative in a post and absolute
 * in its JSON-LD (seo-engine src/render/image-url.ts). That path answers only
 * on a zone Cloudflare proxies, and www.jrcodex.dev is not proxied: it points
 * at Vercel with `proxied = false` (~/cloudflare-infra/dns.tf, record `www`).
 * So on every host, the production host included, each picture points at its
 * stored original, `/media/<key>`, which app/media/[...key]/route.ts serves.
 * (montano-btm's lib/images.ts, applied unconditionally.)
 */

const TRANSFORM = /\/cdn-cgi\/image\/[^/\s"']+\/media\//g;

/** Every `/cdn-cgi/image/<options>/media/<key>` in the text becomes `/media/<key>`. */
export function withoutTransforms(text: string): string {
  return text.replace(TRANSFORM, "/media/");
}

export function plainPicture<T extends { src: string; srcset: string }>(picture: T): T {
  return { ...picture, src: withoutTransforms(picture.src), srcset: withoutTransforms(picture.srcset) };
}

export function plainPostSummary<T extends Pick<PostSummary, "hero">>(post: T): T {
  return { ...post, hero: post.hero === null ? null : plainPicture(post.hero) };
}

/** The hero, the body as one string and as blocks (what compose() renders), and the JSON-LD. */
export function plainPost(post: Post): Post {
  return {
    ...plainPostSummary(post),
    html: withoutTransforms(post.html),
    blocks: post.blocks.map(withoutTransforms),
    jsonLd: JSON.parse(withoutTransforms(JSON.stringify(post.jsonLd))) as Post["jsonLd"],
  };
}
