import { mediaHandler } from "@jrcodex/seo-kit/worker";

import { platformClient } from "@/lib/platform/client";
import { platformEnv } from "@/lib/platform/env";

/**
 * /media/<key>: the engine's stored originals - post pictures and shown video
 * renders - through the kit's mediaHandler, which passes the engine's headers
 * through (Cache-Control, ETag) and answers 304 on a matching If-None-Match
 * (specs/002-proprietor-adoption, D6). Every engine picture points here
 * (app/lib/platform/images.ts).
 *
 * Engine keys always have the business's slug as their first segment
 * (`jrcodex/...`). The files Payload's build mirrors into public/media/ are
 * flat names, and Next serves public/ files before any dynamic route, so this
 * route only ever sees what public/ does not have.
 *
 * Range: @jrcodex/seo-kit 0.6.2's mediaHandler does not forward the request's
 * `range` header, so a video streams whole and a browser cannot seek before it
 * has loaded; kit 0.7.0 forwards it (engine spec 028). Not worked around here.
 */

async function serve(request: Request): Promise<Response> {
  const client = platformClient(platformEnv());
  if (client === null) return new Response("not found", { status: 404 });
  return (await mediaHandler(request, client)) ?? new Response("not found", { status: 404 });
}

export async function GET(request: Request): Promise<Response> {
  return serve(request);
}

export async function HEAD(request: Request): Promise<Response> {
  return serve(request);
}
