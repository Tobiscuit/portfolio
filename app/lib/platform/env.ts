import type { EngineEnv } from "../intake/engine";

/**
 * The environment the platform modules read (specs/002-proprietor-adoption,
 * plan.md section 1): SEO_ENGINE_URL and SEO_SITE_KEY for the kit's http()
 * (the production transport on Vercel), a `SEO` service binding when the site
 * runs as a Worker, and ENGINE_WRITE_HOST.
 *
 * This is the only file of the platform modules that reads `process.env`. A
 * move to Workers changes this body, and nothing else, to the Worker's env.
 */
export interface PlatformEnv extends EngineEnv {
  /** The only host whose requests may write to the engine: www.jrcodex.dev in production. */
  ENGINE_WRITE_HOST?: string;
}

export function platformEnv(): PlatformEnv {
  return process.env;
}
