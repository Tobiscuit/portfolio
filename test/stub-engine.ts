import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

import { FIXTURE_MEDIA, FIXTURE_PROFILE, FIXTURE_SITEMAP, FIXTURE_VIDEOS, fixturePost, fixtureSummaries } from "./fixtures";

/**
 * A local stand-in for the SEO engine's HTTPS server, which has no public
 * address (specs/002-proprietor-adoption/spec.md section 1). It implements the
 * part of the contract @jrcodex/seo-kit 0.6.2 speaks over http() that this
 * site uses:
 *
 *   POST /v1/manifest                 the site's manifest       -> 200 { changed, manifest }
 *   POST /v1/inquiries                { locale, page, fields }  -> 201 { id, receivedAt }
 *   GET  /v1/posts?locale=            PostSummary[], newest first
 *   GET  /v1/posts/:locale/:slug      Post, or 404
 *   GET  /v1/profile                  BusinessProfile
 *   GET  /v1/sitemap                  SitemapEntry[]
 *   GET  /v1/media/<key>              the stored bytes with an ETag, or 404
 *
 * and, beyond 0.6.2, what kit 0.7.0 will speak (plan.md section 2.2):
 *
 *   GET  /v1/videos                   VideoSummary[], newest first
 *
 * with `authorization: Bearer sk_...` on every call (anything else: 401), and,
 * like the engine (seo-engine src/sites/inquiries.ts), an inquiry from a site
 * whose manifest it has not stored is refused with 400. Anything else is 404
 * (projects and the gallery too: this site reads neither; D1 keeps them in
 * Payload).
 *
 * A test scripts other answers per path - 400 with a reason, 403, 429 with
 * Retry-After, 500, or "hang" (never answer) - and reads what arrived from
 * `requests`. test/harness.test.ts pins this stub to the kit's contract.
 */

/** A fake key for tests; the kit only requires the `sk_` prefix. */
export const SITE_KEY = "sk_test_portfolio_intake"; // pragma: allowlist secret

/** A path without its query string, e.g. "/v1/posts" or "/v1/posts/en/queues-before-cron". */
export type EnginePath = string;

export type Reply = { status: number; body?: string; headers?: Record<string, string> } | "hang";

export interface RecordedRequest {
  method: string;
  path: string;
  authorization: string | null;
  contentType: string | null;
  /** The parsed JSON body, or the raw text when it is not JSON. */
  body: unknown;
}

export interface StubEngine {
  /** Base URL, e.g. http://127.0.0.1:43127 - what SEO_ENGINE_URL would hold. */
  url: string;
  /** Every request that reached the stub, in order, including ones it refused. */
  requests: RecordedRequest[];
  /** Answer every later request to `path` with `reply` instead of the default behaviour. */
  respond(path: EnginePath, reply: Reply): void;
  /** Forget scripted replies, recorded requests and the stored manifest. */
  reset(): void;
  close(): Promise<void>;
}

const POST_PATH = /^\/v1\/posts\/([^/]+)\/([^/]+)$/;
const MEDIA_PATH = /^\/v1\/media\/(.+)$/;

export async function startStubEngine(): Promise<StubEngine> {
  const requests: RecordedRequest[] = [];
  const scripted = new Map<string, Reply>();
  let storedManifest: { has?: { intake?: boolean }; intake?: { fields?: unknown } } | null = null;
  let nextId = 1;

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", "http://stub.invalid");
    const path = url.pathname;
    const text = await readText(req);
    const contentType = req.headers["content-type"] ?? null;
    let body: unknown = text;
    if (contentType?.includes("application/json")) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
    requests.push({ method: req.method ?? "", path, authorization: req.headers.authorization ?? null, contentType, body });

    const reply = scripted.get(path);
    if (reply === "hang") return; // never answer; the client's timeout has to end it
    if (reply) return send(res, reply.status, reply.body ?? "", reply.headers);

    if (req.method === "GET") return answerRead(req, res, path, url.searchParams.get("locale") ?? "");

    if (req.method !== "POST" || (path !== "/v1/manifest" && path !== "/v1/inquiries")) {
      return send(res, 404, "not found");
    }
    if (req.headers.authorization !== `Bearer ${SITE_KEY}`) return send(res, 401, "unknown site key");

    if (path === "/v1/manifest") {
      const manifest = body as typeof storedManifest;
      if (typeof manifest !== "object" || manifest === null) return send(res, 400, "a manifest is an object");
      if (manifest.has?.intake && !Array.isArray(manifest.intake?.fields)) {
        return send(res, 400, "intake.fields: required when has.intake is true");
      }
      const changed = JSON.stringify(storedManifest) !== JSON.stringify(manifest);
      storedManifest = manifest;
      return sendJson(res, 200, { changed, manifest });
    }

    if (!storedManifest?.has?.intake) {
      return send(res, 400, "this site has not declared an intake form: set has.intake and intake.fields in its manifest");
    }
    const fields = (body as { fields?: unknown } | null)?.fields;
    if (typeof fields !== "object" || fields === null) return send(res, 400, "a submission is an object with a fields object");
    return sendJson(res, 201, { id: `inq-${nextId++}`, receivedAt: new Date().toISOString() });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    respond(path, reply) {
      scripted.set(path, reply);
    },
    reset() {
      requests.length = 0;
      scripted.clear();
      storedManifest = null;
      nextId = 1;
    },
    close() {
      // A "hang" leaves its connection open on purpose; close() must not wait for it.
      server.closeAllConnections();
      return new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    },
  };
}

/** The read routes: every one needs the key; a missing thing is 404, like the engine's HTTP server. */
function answerRead(req: IncomingMessage, res: ServerResponse, path: string, locale: string): void {
  if (!path.startsWith("/v1/")) return send(res, 404, "not found");
  if (req.headers.authorization !== `Bearer ${SITE_KEY}`) return send(res, 401, "unknown site key");

  if (path === "/v1/posts") return sendJson(res, 200, fixtureSummaries(locale));
  const post = POST_PATH.exec(path);
  if (post) {
    const found = fixturePost(decodeURIComponent(post[1]), decodeURIComponent(post[2]));
    return found ? sendJson(res, 200, found) : send(res, 404, "no such post");
  }

  if (path === "/v1/profile") return sendJson(res, 200, FIXTURE_PROFILE);
  if (path === "/v1/sitemap") return sendJson(res, 200, FIXTURE_SITEMAP);
  if (path === "/v1/videos") return sendJson(res, 200, FIXTURE_VIDEOS);

  const media = MEDIA_PATH.exec(path);
  if (media) {
    const key = media[1].split("/").map(decodeURIComponent).join("/");
    const stored = FIXTURE_MEDIA[key];
    if (!stored) return send(res, 404, "no such media");
    const bytes = Buffer.from(stored.base64, "base64");
    res.writeHead(200, {
      "content-type": stored.contentType,
      "content-length": String(bytes.length),
      "cache-control": "public, max-age=31536000, immutable",
      etag: stored.etag,
    });
    res.end(bytes);
    return;
  }

  return send(res, 404, "not found");
}

function readText(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, text: string, headers: Record<string, string> = {}): void {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8", ...headers });
  res.end(text);
}

function sendJson(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(value));
}
