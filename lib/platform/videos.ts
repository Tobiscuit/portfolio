import type { SeoClient } from "@jrcodex/seo-kit";

import { bindingHasVideos, describe, type EngineEnv } from "../seo";
import { onSite, platformClient, warnOnce } from "./reads";

/**
 * The clips the owner chose to show on the site (engine spec 028), read
 * through a shim until the site moves to @jrcodex/seo-kit 0.7.0, which carries
 * `videos()` (spec 003 R4, W3). From PR #4's `app/lib/platform/videos.ts`
 * (feat/proprietor-adoption). Delete the binding lookup then, keep the checks.
 *
 * Pattern: Strategy, three sources tried in order, one result shape:
 *   1. the kit client has `videos` (0.7.0): call it;
 *   2. the SEO binding has `videos` (engine 028, read with kit 0.6.2):
 *      `SEO.videos(siteKey)`;
 *   3. otherwise [].
 *
 * Never throws: /videos shows its empty state rather than an error. Each
 * clip's `src` is `/media/<slug>/video/renders/<id>.mp4`, served by the /media
 * door with the engine's `public, max-age=300` (lib/cache-policy.ts).
 */

export interface VideoSummary {
  id: string;
  /** The owner's title. */
  title: string;
  /** Root-relative: /media/<slug>/video/renders/<id>.mp4. */
  src: string;
  contentType: "video/mp4";
  seconds: number;
  /** 1920x1080 or 1080x1920. */
  format: "landscape" | "portrait";
  /** ISO 8601: when the owner showed it. Newest first. */
  publishedAt: string;
}

type WithVideos = { videos(...args: unknown[]): Promise<unknown> };
const hasVideos = (value: unknown): value is WithVideos =>
  typeof value === "object" && value !== null && typeof (value as { videos?: unknown }).videos === "function";

function isVideo(value: unknown): value is VideoSummary {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" && v.id !== "" &&
    typeof v.title === "string" &&
    onSite(v.src) &&
    v.contentType === "video/mp4" &&
    typeof v.seconds === "number" && Number.isFinite(v.seconds) && v.seconds >= 0 &&
    (v.format === "landscape" || v.format === "portrait") &&
    typeof v.publishedAt === "string"
  );
}

const validKey = (env: EngineEnv): env is EngineEnv & { SEO_SITE_KEY: string } => typeof env.SEO_SITE_KEY === "string" && env.SEO_SITE_KEY.startsWith("sk_");

/** Whether any source can list videos here: the manifest's `videos` (lib/seo.ts manifestFor). */
export function canReadVideos(env: EngineEnv, client?: unknown): boolean {
  return hasVideos(client) || (bindingHasVideos(env) && validKey(env));
}

export async function readVideos(env: EngineEnv, client: SeoClient | WithVideos | null = null): Promise<VideoSummary[]> {
  try {
    let answer: unknown;
    if (hasVideos(client)) {
      answer = await client.videos();
    } else if (hasVideos(env.SEO) && validKey(env) && platformClient(env) !== null) {
      answer = await env.SEO.videos(env.SEO_SITE_KEY);
    } else {
      return [];
    }
    if (!Array.isArray(answer)) {
      warnOnce("videos: the engine's answer is not a list; showing none");
      return [];
    }
    const valid = answer.filter(isVideo);
    if (valid.length < answer.length) warnOnce(`videos: dropped ${answer.length - valid.length} clip(s) with an unexpected shape`);
    return valid;
  } catch (error) {
    warnOnce(`videos: ${describe(error)}; showing none`);
    return [];
  }
}
