import { http, rpc, type SeoClient, type SitesBinding } from "@jrcodex/seo-kit";

/**
 * The one place that decides how this site reaches the SEO engine
 * (specs/001-platform-intake/spec.md, "Keeps working if the site leaves
 * Vercel"). The route never names a host platform:
 *
 *   a `SEO` service binding     -> rpc()   the site runs as a Worker in the account
 *   SEO_ENGINE_URL (+ key)      -> http()  Vercel, or anywhere else
 *   neither                     -> null    the legacy SES path, unchanged
 *
 * SEO_ENGINE_URL is the switch: rollback is removing it, so a key left behind
 * does not keep the platform path on; a URL without a valid key is a
 * misconfiguration the handler answers with 503, never a silent return to SES.
 */

/** Every engine call over HTTP gives up after this long (spec section 2). */
export const ENGINE_TIMEOUT_MS = 10_000;

export interface EngineEnv {
  /** The seo-engine Worker's `Sites` entrypoint (a service binding). Never in process.env. */
  SEO?: unknown;
  /** The engine's HTTPS base URL. */
  SEO_ENGINE_URL?: string;
  /** `sk_...`, a secret. */
  SEO_SITE_KEY?: string;
}

export type Transport = "rpc" | "http";

/** Which transport this environment asks for; null means the legacy SES path. */
export function transportFor(env: EngineEnv): Transport | null {
  if (env.SEO) return "rpc";
  if (env.SEO_ENGINE_URL) return "http";
  return null;
}

/**
 * The engine client for this environment. Throws the kit's `SiteKeyError` when
 * SEO_SITE_KEY is missing or malformed, before anything is sent.
 *
 * `fetchImpl` is called as a plain function, never as a method: Workers throw
 * "Illegal invocation" for a fetch called with the wrong `this`.
 */
export function engineFor(env: EngineEnv, fetchImpl: typeof fetch = globalThis.fetch): SeoClient {
  const key = env.SEO_SITE_KEY ?? "";
  switch (transportFor(env)) {
    case "rpc":
      // A structural contract: the kit types the binding, the engine implements it.
      return rpc(env.SEO as SitesBinding, key);
    case "http":
      return http(env.SEO_ENGINE_URL as string, key, withTimeout(fetchImpl, ENGINE_TIMEOUT_MS));
    default:
      throw new Error("no engine transport configured: set SEO_ENGINE_URL or bind SEO");
  }
}

/** The kit's injectable fetch, with a deadline on every call, body included. */
function withTimeout(fetchImpl: typeof fetch, ms: number): typeof fetch {
  return (input, init) => fetchImpl(input, { ...init, signal: AbortSignal.timeout(ms) });
}
