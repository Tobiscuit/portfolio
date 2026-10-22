import { announceOnce, rpc, type Manifest, type SeoClient, type SitesBinding } from "@jrcodex/seo-kit";

import { INTAKE_FIELDS } from "./inquiry/form";

/**
 * This site's side of the Proprietor engine (spec 003, section 5): what the
 * site tells the engine it is, and the client its Worker uses. Modelled on
 * montano-btm's lib/seo.ts (develop).
 *
 * No `cloudflare:workers` import here: callers pass their env, so the unit
 * tests run this module in plain Node.
 */

/** What the post page renders (src/views/post.tsx): every compose() item, every placement. */
export const RENDERS = { pullQuote: true, keyPoints: true, aside: true, placements: ["wide", "inset-left", "inset-right"] } as const;

/** What the site can show beyond the fixed modules, decided per isolate. */
export interface Capabilities {
  /** True when the kit client or the binding can list videos (lib/platform/videos.ts). */
  videos: boolean;
}

/**
 * What the site renders: the blog (every compose() item, every placement), the
 * contact form with three fields, in English. `videos` only when the site can
 * read them (spec 003 R4). Never what the site does not have: no `projects`
 * until the projects port has an engine adapter (R3; engine spec 030), and no
 * `profile`, which is not a module (R5) - profile() is always readable.
 */
export function manifestFor(caps: Capabilities): Manifest {
  return {
    version: 1,
    kind: "service",
    has: caps.videos ? { blog: true, intake: true, videos: true } : { blog: true, intake: true },
    renders: { ...RENDERS, placements: [...RENDERS.placements] },
    locales: ["en"],
    intake: { fields: [...INTAKE_FIELDS] },
  };
}

/** The environment this module reads; the Worker's env satisfies it. */
export interface EngineEnv {
  /** The `Sites` entrypoint of the seo-engine Worker (service binding). */
  SEO?: unknown;
  /** `sk_…`, a secret. */
  SEO_SITE_KEY?: string;
  /** The only host whose requests may write to the engine. */
  ENGINE_WRITE_HOST?: string;
}

/**
 * The engine client for this env. Throws at once when the binding is missing,
 * or (from the kit) a `SiteKeyError` when the key is missing or malformed.
 * `wrangler types` cannot see another Worker's entrypoint, so the binding is
 * typed by the kit's structural `SitesBinding`, which is the contract.
 */
export function engineClient(env: EngineEnv): SeoClient {
  if (!env.SEO) throw new Error("SEO service binding is not configured");
  return rpc(env.SEO as SitesBinding, env.SEO_SITE_KEY ?? "");
}

/**
 * Previews bind production resources, so only requests to the production host
 * may announce or inquire: a preview must never create a real inquiry, or tell
 * the engine the live site is something it is not.
 */
export function mayWriteToEngine(request: Request, env: EngineEnv): boolean {
  const host = env.ENGINE_WRITE_HOST;
  return typeof host === "string" && host !== "" && new URL(request.url).host === host;
}

/** Whether the env's binding answers `videos` (engine spec 028), the R4 check. */
export function bindingHasVideos(env: EngineEnv): boolean {
  const seo = env.SEO as { videos?: unknown } | undefined;
  return typeof seo === "object" && seo !== null && typeof seo.videos === "function";
}

/**
 * Tells the engine what this site is, once per isolate, from production
 * requests only. Never throws and never rejects: a failed announce is logged
 * and retried by the next request, and the page it rode on is unaffected.
 */
export function announceInBackground(request: Request, env: EngineEnv, ctx: { waitUntil(promise: Promise<unknown>): void }): void {
  if (!mayWriteToEngine(request, env)) return;
  let client: SeoClient;
  try {
    client = engineClient(env);
  } catch (error) {
    console.warn(`[seo] not announcing: ${describe(error)}`);
    return;
  }
  ctx.waitUntil(
    announceOnce(client, manifestFor({ videos: bindingHasVideos(env) })).then(
      () => undefined,
      (error: unknown) => console.warn(`[seo] announce failed: ${describe(error)}`),
    ),
  );
}

/** An error's name and message, which is all that crosses the RPC boundary reliably. */
export function describe(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}
