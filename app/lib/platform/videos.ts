import type { SeoClient } from "@jrcodex/seo-kit";

import type { EngineEnv } from "../intake/engine";
import { describeError, onSite, platformClient, warnOnce } from "./client";

/**
 * The cuts the owner chose to show on the site (engine spec 028), read through
 * a shim until the site moves to @jrcodex/seo-kit 0.7.0, which carries
 * `videos()` on both transports (specs/002-proprietor-adoption/plan.md
 * section 2.2). Delete this file's lookup then, and keep the type's checks.
 *
 * In order:
 *   1. the kit's client has a `videos` function (0.7.0, http() or rpc()): call it;
 *   2. the env's `SEO` binding has a `videos` function (engine 028 over a
 *      service binding, read with kit 0.6.2): call `SEO.videos(siteKey)`;
 *   3. otherwise []: kit 0.6.2's http(), the production transport today.
 *
 * Never throws: the nav and /videos show nothing rather than an error (spec
 * 002, D6). Each cut's `src` is `/media/<render key>`, served by
 * app/media/[...key]/route.ts.
 */

/** One cut the owner chose to show (plan.md section 2.2). */
export interface VideoSummary {
  id: string;
  /** The owner's title, one language. */
  title: string;
  /** Root-relative: /media/<slug>/video/renders/<id>.mp4. */
  src: string;
  contentType: "video/mp4";
  seconds: number;
  /** 1920x1080 or 1080x1920. */
  format: "landscape" | "portrait";
  /** ISO 8601: when the owner showed it on the site. Newest first in the list. */
  publishedAt: string;
}

type WithVideos<T> = T & { videos(...args: unknown[]): Promise<unknown> };

const hasVideos = <T>(value: T): value is WithVideos<T> =>
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

export async function readVideos(env: EngineEnv, client: SeoClient | null = platformClient(env)): Promise<VideoSummary[]> {
  try {
    let answer: unknown;
    if (hasVideos(client)) {
      answer = await client.videos();
    } else if (hasVideos(env.SEO) && typeof env.SEO_SITE_KEY === "string" && env.SEO_SITE_KEY.startsWith("sk_")) {
      answer = await env.SEO.videos(env.SEO_SITE_KEY);
    } else {
      return [];
    }
    if (!Array.isArray(answer)) {
      warnOnce("videos: the engine's answer is not a list; showing none");
      return [];
    }
    const valid = answer.filter(isVideo);
    if (valid.length < answer.length) warnOnce(`videos: dropped ${answer.length - valid.length} cut(s) with an unexpected shape`);
    return valid;
  } catch (error) {
    warnOnce(`videos: ${describeError(error)}; showing none`);
    return [];
  }
}
