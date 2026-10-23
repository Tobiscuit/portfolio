import type { Post, PostSummary } from "@jrcodex/seo-kit";

/**
 * The engine builds its image URLs for Cloudflare's image transformations:
 * `/cdn-cgi/image/<options>/media/<key>`, root-relative in a post and absolute
 * in its JSON-LD (seo-engine src/render/image-url.ts). That path answers only
 * on the production zone, once it is proxied with transformations enabled;
 * a preview (`*.workers.dev`) or a local run has no such path. Off the
 * production host each picture points at its stored original, `/media/<key>`,
 * which worker/index.ts serves on any host.
 *
 * From PR #4 (`app/lib/platform/images.ts`, feat/proprietor-adoption), which
 * rewrites blocks and JSON-LD too (montano-btm's version rewrites only html).
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
