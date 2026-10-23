/**
 * The Worker's entry (spec 003, plan section 1).
 *
 *   1. Tell the engine what this site is: once per isolate, production host
 *      only, never able to fail the request it rides on (lib/seo.ts).
 *   2. The Hono app answers (src/app.tsx). Static files in public/ never get
 *      here: Workers static assets answer them first.
 *   3. Every response leaves with an explicit Cache-Control, which Workers
 *      Cache in front of this Worker follows (lib/cache-policy.ts).
 */
import { withCachePolicy } from "../lib/cache-policy";
import { announceInBackground } from "../lib/seo";
import { app } from "../src/app";
import type { SiteEnv } from "../src/env";

export default {
  async fetch(request: Request, env: SiteEnv, ctx: ExecutionContext): Promise<Response> {
    announceInBackground(request, env, ctx);
    const response = await app.fetch(request, env, ctx);
    return withCachePolicy(request, response);
  },
} satisfies ExportedHandler<SiteEnv>;
