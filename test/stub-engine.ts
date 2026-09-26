import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

/**
 * A local stand-in for the SEO engine's HTTPS server, which does not exist yet
 * (specs/001-platform-intake/spec.md section 2). It implements the part of the
 * contract @jrcodex/seo-kit 0.3.1 speaks over http():
 *
 *   POST /v1/manifest    the site's manifest   -> 200 { changed, manifest }
 *   POST /v1/inquiries   { locale, page, fields } -> 201 { id, receivedAt }
 *
 * with `authorization: Bearer sk_...` on every call (anything else: 401), and,
 * like the engine (seo-engine src/sites/inquiries.ts), an inquiry from a site
 * whose manifest it has not stored is refused with 400.
 *
 * A test scripts other answers per path - 400 with a reason, 403, 429 with
 * Retry-After, 500, or "hang" (never answer) - and reads what arrived from
 * `requests`. test/harness.test.ts pins this stub to the kit's contract.
 */

/** A fake key for tests; the kit only requires the `sk_` prefix. */
export const SITE_KEY = "sk_test_portfolio_intake"; // pragma: allowlist secret

export type EnginePath = "/v1/manifest" | "/v1/inquiries";

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

export async function startStubEngine(): Promise<StubEngine> {
  const requests: RecordedRequest[] = [];
  const scripted = new Map<string, Reply>();
  let storedManifest: { has?: { intake?: boolean }; intake?: { fields?: unknown } } | null = null;
  let nextId = 1;

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const path = (req.url ?? "/").split("?")[0];
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
