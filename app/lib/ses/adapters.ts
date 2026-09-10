/**
 * Framework adapters. The handler in ./contact.ts takes a plain object and
 * returns a plain object precisely so that the framework-shaped code stays
 * this thin - if the site moves from Next.js to Hono, only this file changes.
 */

import { createContactHandler, type ContactConfig, type ContactOutcome } from "./contact";

/** Read the SES credentials out of the environment, wherever that lives. */
export function credentialsFromEnv(env: Record<string, string | undefined>) {
  const accessKeyId = env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    // Fail at startup rather than on the first visitor's submission.
    throw new Error("contact: AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY are not set");
  }
  return {
    accessKeyId,
    secretAccessKey,
    sessionToken: env.AWS_SESSION_TOKEN,
    region: env.AWS_REGION ?? "us-east-1",
  };
}

function toResponse(outcome: ContactOutcome): Response {
  if (outcome.ok) {
    return Response.json({ ok: true }, { status: 200 });
  }
  return Response.json({ ok: false, error: outcome.error }, { status: outcome.status });
}

/**
 * Accepts both a JSON body and a classic form post, so the form still works
 * with JavaScript disabled or broken.
 */
async function readBody(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    return (await request.json()) as Record<string, unknown>;
  }
  return Object.fromEntries(await request.formData());
}

/**
 * Works unchanged as a Next.js App Router route handler and as a Hono handler
 * body - both speak the web Request/Response types.
 *
 *   // app/api/contact/route.ts
 *   export const POST = contactRoute({ ... });
 *
 *   // Hono
 *   app.post("/api/contact", (c) => handler(c.req.raw));
 */
export function contactRoute(config: ContactConfig) {
  const handle = createContactHandler(config);

  return async function POST(request: Request): Promise<Response> {
    let body: Record<string, unknown>;
    try {
      body = await readBody(request);
    } catch {
      return Response.json({ ok: false, error: "Malformed request." }, { status: 400 });
    }
    return toResponse(await handle(body));
  };
}
