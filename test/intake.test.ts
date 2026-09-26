import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { ContactDeps, IntakeEnv } from "@/lib/intake/handle";
import { SITE_KEY, startStubEngine, type StubEngine } from "./stub-engine";

// Acceptance tests for the contact intake: specs/001-platform-intake/spec.md,
// section 6. Every engine call goes through @jrcodex/seo-kit's real http()
// to a local stub server (test/stub-engine.ts, pinned to the kit's contract by
// test/harness.test.ts). Only siteverify is answered in-process.

const HOST = "www.jrcodex.dev";
const PREVIEW_HOST = "portfolio-git-feat-platform-intake-tobiscuit.vercel.app";
const FALLBACK = "fallback@example.test";
const UNSENT = `The message could not be sent. Please email ${FALLBACK} directly.`;
const PREVIEW = "This is a preview of the site, so messages aren't sent from here.";
const RATE_LIMITED = "Too many messages just now — please try again in a minute.";

// Cloudflare's published Turnstile test keys (always pass) and dummy token.
const TURNSTILE_SITE_KEY = "1x00000000000000000000AA";
const TURNSTILE_SECRET = "1x0000000000000000000000000000000AA"; // pragma: allowlist secret
const TOKEN = "XXXX.DUMMY.TOKEN.XXXX";
const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const visitor = { name: "Ada Tester", email: "ada.tester@example.test", message: "Looking for help with a data pipeline, ref 7731." };

let engine: StubEngine;
let handleContact: (request: Request, deps: ContactDeps) => Promise<Response>;
let logs: string[] = [];

beforeAll(async () => {
  engine = await startStubEngine();
});
afterAll(async () => {
  await engine.close();
});

beforeEach(async () => {
  engine.reset();
  // A fresh module graph per test is a fresh process as far as the kit's
  // announceOnce memo is concerned (the kit is inlined: vitest.config.ts).
  vi.resetModules();
  ({ handleContact } = await import("@/lib/intake/handle"));

  logs = [];
  for (const level of ["log", "info", "warn", "error", "debug"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });
  }
});

afterEach(() => {
  // Logs name the outcome only: never the site key, the Turnstile secret or
  // anything the visitor typed.
  for (const line of logs) {
    for (const secret of [SITE_KEY, TURNSTILE_SECRET, TOKEN, visitor.name, visitor.email, visitor.message]) {
      expect(line).not.toContain(secret);
    }
  }
});

function env(overrides: Partial<IntakeEnv> = {}): IntakeEnv {
  return { SEO_ENGINE_URL: engine.url, SEO_SITE_KEY: SITE_KEY, ENGINE_WRITE_HOST: HOST, CONTACT_FALLBACK_EMAIL: FALLBACK, ...overrides };
}

function post(body: unknown, host = HOST): Request {
  return new Request(`https://${host}/api/contact`, {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.7" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function submit(body: unknown, deps: Partial<ContactDeps> = {}, host = HOST) {
  const response = await handleContact(post(body, host), { env: env(), ...deps });
  return { status: response.status, headers: response.headers, body: (await response.json()) as { ok: boolean; error?: string } };
}

const enginePaths = () => engine.requests.map((r) => r.path);

/** A fetch that answers siteverify in-process and sends everything else (the engine) over the network. */
function siteverify(answer: () => Response | Promise<Response>) {
  const calls: URLSearchParams[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url === SITEVERIFY_URL) {
      calls.push(new URLSearchParams(String(init?.body ?? "")));
      return answer();
    }
    return fetch(input, init);
  };
  return { fetch: fetchImpl, calls };
}

const verified = () => Response.json({ success: true, "error-codes": [], action: "contact", hostname: HOST });

describe("a valid submission, through the kit's http() against the stub engine", () => {
  it("announces once per process, then inquires with exactly name, email, message, locale en and page /contact, and answers 200 { ok: true }", async () => {
    const first = await submit(visitor);
    // The same process again; extra and hidden fields must not travel, and the
    // fields arrive the way the site's own validate() normalises them.
    const second = await submit({ ...visitor, name: `  ${visitor.name}  `, email: visitor.email.toUpperCase(), _gotcha: "", admin: "true" });

    expect(first).toMatchObject({ status: 200, body: { ok: true } });
    expect(second).toMatchObject({ status: 200, body: { ok: true } });
    expect(enginePaths()).toEqual(["/v1/manifest", "/v1/inquiries", "/v1/inquiries"]);
    expect(engine.requests.every((r) => r.authorization === `Bearer ${SITE_KEY}`)).toBe(true);
    expect(engine.requests[0].body).toEqual({
      version: 1,
      kind: "service",
      has: { intake: true },
      locales: ["en"],
      intake: { fields: ["name", "email", "message"] },
    });
    const submission = { locale: "en", page: "/contact", fields: { name: visitor.name, email: visitor.email, message: visitor.message } };
    expect(engine.requests[1].body).toEqual(submission);
    expect(engine.requests[2].body).toEqual(submission);
  });

  it("declares exactly the manifest in the spec", async () => {
    const { manifest } = await import("@/lib/intake/manifest");
    expect(manifest).toEqual({ version: 1, kind: "service", has: { intake: true }, locales: ["en"], intake: { fields: ["name", "email", "message"] } });
  });

  it("announces again after a failed announce", async () => {
    engine.respond("/v1/manifest", { status: 500, body: "boom" });
    expect((await submit(visitor)).status).toBe(503);
    engine.reset();
    expect((await submit(visitor)).status).toBe(200);
    expect(enginePaths()).toEqual(["/v1/manifest", "/v1/inquiries"]);
  });
});

describe("nothing reaches the engine", () => {
  it("when the honeypot is filled: 200, discarded", async () => {
    const { status, body } = await submit({ ...visitor, _gotcha: "https://spam.example" });
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(engine.requests).toEqual([]);
  });

  it.each([
    ["no name", { name: "   " }, "Please enter your name."],
    ["a name over 100 characters", { name: "x".repeat(101) }, "That name is too long."],
    ["no email", { email: "" }, "Please enter your email address."],
    ["an email that does not look right", { email: "ada@localhost" }, "That email address does not look right."],
    ["no message", { message: " " }, "Please enter a message."],
    ["a message over 5,000 characters", { message: "x".repeat(5001) }, "Please keep the message under 5000 characters."],
  ])("when the form has %s: 400 with the current message", async (_label, change, message) => {
    const { status, body } = await submit({ ...visitor, ...change });
    expect(status).toBe(400);
    expect(body).toEqual({ ok: false, error: message });
    expect(engine.requests).toEqual([]);
  });

  it("when the body is not JSON: 400", async () => {
    const { status, body } = await submit("{not json");
    expect(status).toBe(400);
    expect(body).toEqual({ ok: false, error: "Malformed request." });
    expect(engine.requests).toEqual([]);
  });

  it("from a host that is not ENGINE_WRITE_HOST (a preview): 503 preview", async () => {
    const { status, body } = await submit(visitor, {}, PREVIEW_HOST);
    expect(status).toBe(503);
    expect(body).toEqual({ ok: false, error: PREVIEW });
    expect(engine.requests).toEqual([]);
  });

  it("when ENGINE_WRITE_HOST is not set: 503 with the fallback address, and says why in the log", async () => {
    const { status, body } = await submit(visitor, { env: env({ ENGINE_WRITE_HOST: undefined }) });
    expect(status).toBe(503);
    expect(body).toEqual({ ok: false, error: UNSENT });
    expect(engine.requests).toEqual([]);
    expect(logs.join("\n")).toMatch(/ENGINE_WRITE_HOST/);
  });

  it.each([
    ["missing", undefined],
    ["malformed", "pk_live_not_a_site_key"],
  ])("when SEO_SITE_KEY is %s: 503 with the fallback address, logged without the value", async (_label, key) => {
    const { status, body } = await submit(visitor, { env: env({ SEO_SITE_KEY: key }) });
    expect(status).toBe(503);
    expect(body).toEqual({ ok: false, error: UNSENT });
    expect(engine.requests).toEqual([]);
    expect(logs.join("\n")).toMatch(/SEO_SITE_KEY/);
    if (key) expect(logs.join("\n")).not.toContain(key);
  });

  it("says where to write instead when CONTACT_FALLBACK_EMAIL is not set", async () => {
    const { status, body } = await submit(visitor, { env: env({ ENGINE_WRITE_HOST: undefined, CONTACT_FALLBACK_EMAIL: undefined }) });
    expect(status).toBe(503);
    expect(body.error).toBe("The message could not be sent. Please use the email address on this page instead.");
  });
});

describe("the engine says no", () => {
  it("a 429 with Retry-After: 30 answers 429 with Retry-After: 30", async () => {
    engine.respond("/v1/inquiries", {
      status: 429,
      body: "too many inquiries from this site in the last hour; try again in a minute",
      headers: { "retry-after": "30" },
    });
    const { status, headers, body } = await submit(visitor);
    expect(status).toBe(429);
    expect(headers.get("retry-after")).toBe("30");
    expect(body).toEqual({ ok: false, error: RATE_LIMITED });
  });

  it("a 400 answers 400 with the engine's reason", async () => {
    engine.respond("/v1/inquiries", { status: 400, body: "message is longer than 1000 characters" });
    const { status, body } = await submit(visitor);
    expect(status).toBe(400);
    expect(body).toEqual({ ok: false, error: "Message is longer than 1000 characters." });
  });

  it.each([
    ["a 403 (the key refused)", () => engine.respond("/v1/manifest", { status: 403, body: "site key revoked" }), {}],
    ["a 401 (a key the engine does not know)", () => undefined, { SEO_SITE_KEY: "sk_test_unknown_to_the_engine" }],
  ])("%s answers 503 with the fallback address and logs the misconfiguration without the key", async (_label, script, overrides) => {
    script();
    const { status, body } = await submit(visitor, { env: env(overrides) });
    expect(status).toBe(503);
    expect(body).toEqual({ ok: false, error: UNSENT });
    const log = logs.join("\n");
    expect(log).toMatch(/SEO_SITE_KEY/);
    expect(log).not.toContain("sk_");
    expect(enginePaths()).toEqual(["/v1/manifest"]);
  });

  it("a refused manifest answers 503 with the fallback address and sends no inquiry", async () => {
    engine.respond("/v1/manifest", { status: 400, body: "has.intake: intake.fields is required" });
    const { status, body } = await submit(visitor);
    expect(status).toBe(503);
    expect(body).toEqual({ ok: false, error: UNSENT });
    expect(enginePaths()).toEqual(["/v1/manifest"]);
    expect(logs.join("\n")).toMatch(/manifest/i);
  });

  it("a 500 answers 503 with the fallback address", async () => {
    engine.respond("/v1/inquiries", { status: 500, body: "D1_ERROR: database is locked" });
    const { status, body } = await submit(visitor);
    expect(status).toBe(503);
    expect(body).toEqual({ ok: false, error: UNSENT });
  });

  it("an engine that never answers is cut off at the 10-second timeout and answers 503", async () => {
    engine.respond("/v1/manifest", "hang");
    // Production asks AbortSignal.timeout for 10 s; the test records that and
    // lets the real signal fire after 50 ms, so the suite does not sit idle.
    const realTimeout = AbortSignal.timeout.bind(AbortSignal);
    const requested: number[] = [];
    vi.spyOn(AbortSignal, "timeout").mockImplementation((ms: number) => {
      requested.push(ms);
      return realTimeout(50);
    });

    const started = Date.now();
    const { status, body } = await submit(visitor);

    expect(requested).toEqual([10_000]);
    expect(status).toBe(503);
    expect(body).toEqual({ ok: false, error: UNSENT });
    expect(enginePaths()).toEqual(["/v1/manifest"]);
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  it("an engine that is down answers 503", async () => {
    const { status, body } = await submit(visitor, { env: env({ SEO_ENGINE_URL: "http://127.0.0.1:9" }) });
    expect(status).toBe(503);
    expect(body).toEqual({ ok: false, error: UNSENT });
  });
});

describe("over a SEO service binding (rpc)", () => {
  /** Errors cross Workers RPC as plain Errors carrying the provider's name and own fields. */
  const remoteError = (name: string, message: string, fields: Record<string, unknown> = {}) => Object.assign(new Error(message), { name, ...fields });

  function binding(inquire: () => Promise<unknown>) {
    const calls: { method: string; key: string; value: unknown }[] = [];
    return {
      calls,
      SEO: {
        announce: async (key: string, value: unknown) => {
          calls.push({ method: "announce", key, value });
          return { changed: true, manifest: value };
        },
        inquire: async (key: string, value: unknown) => {
          calls.push({ method: "inquire", key, value });
          return inquire();
        },
      },
    };
  }

  it("uses the binding, not HTTP, and sends the same submission", async () => {
    const b = binding(async () => ({ id: "inq-1", receivedAt: "2026-09-26T12:00:00.000Z" }));
    const { status, body } = await submit(visitor, { env: env({ SEO: b.SEO, SEO_ENGINE_URL: undefined }) });
    expect(status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(engine.requests).toEqual([]);
    expect(b.calls.map((c) => [c.method, c.key])).toEqual([
      ["announce", SITE_KEY],
      ["inquire", SITE_KEY],
    ]);
    expect(b.calls[1].value).toEqual({ locale: "en", page: "/contact", fields: visitor });
  });

  it.each([
    ["a rate limit with its name kept", remoteError("InquiryRefused", "too many inquiries", { retryAfterSeconds: 60 }), 429, RATE_LIMITED],
    ["a refusal with its name kept", remoteError("InquiryRefused", "message is longer than 1000 characters"), 400, "Message is longer than 1000 characters."],
    ["a refusal in the legacy shape, the name folded into the message", new Error("InquiryRefused: nothing to keep: no declared field was filled in"), 400, "Nothing to keep: no declared field was filled in."],
    ["a refused key", remoteError("SiteKeyError", "the SEO engine refused this site key"), 503, UNSENT],
  ])("reads %s", async (_label, error, expectedStatus, message) => {
    const b = binding(async () => {
      throw error;
    });
    const { status, body } = await submit(visitor, { env: env({ SEO: b.SEO, SEO_ENGINE_URL: undefined }) });
    expect(status).toBe(expectedStatus);
    expect(body).toEqual({ ok: false, error: message });
  });
});

describe("Turnstile", () => {
  const withTurnstile = (overrides: Partial<IntakeEnv> = {}) =>
    env({ TURNSTILE_SECRET_KEY: TURNSTILE_SECRET, NEXT_PUBLIC_TURNSTILE_SITE_KEY: TURNSTILE_SITE_KEY, ...overrides });

  it("with both keys unset, is not checked", async () => {
    const check = siteverify(verified);
    const { status } = await submit(visitor, { fetch: check.fetch });
    expect(status).toBe(200);
    expect(check.calls).toEqual([]);
    expect(enginePaths()).toEqual(["/v1/manifest", "/v1/inquiries"]);
  });

  it("with both keys set and a good token, verifies server-side, then sends only the form's fields", async () => {
    const check = siteverify(verified);
    const { status } = await submit({ ...visitor, "cf-turnstile-response": TOKEN }, { env: withTurnstile(), fetch: check.fetch });

    expect(status).toBe(200);
    expect(check.calls).toHaveLength(1);
    const sent = check.calls[0];
    expect(sent.get("secret")).toBe(TURNSTILE_SECRET);
    expect(sent.get("response")).toBe(TOKEN);
    expect(sent.get("remoteip")).toBe("203.0.113.7");
    expect(sent.get("idempotency_key")).toMatch(/^[0-9a-f-]{36}$/);
    expect(engine.requests[1].body).toEqual({ locale: "en", page: "/contact", fields: visitor });
  });

  it("with both keys set and the token missing: 400, no engine call", async () => {
    const check = siteverify(verified);
    const { status, body } = await submit(visitor, { env: withTurnstile(), fetch: check.fetch });
    expect(status).toBe(400);
    expect(body).toEqual({ ok: false, error: "The security check didn't finish, so nothing was sent. Please try again." });
    expect(check.calls).toEqual([]);
    expect(engine.requests).toEqual([]);
  });

  it.each([
    ["a rejected token", () => Response.json({ success: false, "error-codes": ["invalid-input-response"] })],
    ["a token already used", () => Response.json({ success: false, "error-codes": ["timeout-or-duplicate"] })],
    ["a token from another widget's action", () => Response.json({ success: true, "error-codes": [], action: "login" })],
  ])("with both keys set and %s: 400, no engine call", async (_label, answer) => {
    const check = siteverify(answer);
    const { status, body } = await submit({ ...visitor, "cf-turnstile-response": TOKEN }, { env: withTurnstile(), fetch: check.fetch });
    expect(status).toBe(400);
    expect(body).toEqual({ ok: false, error: "The security check didn't pass, so nothing was sent. Please try again." });
    expect(engine.requests).toEqual([]);
  });

  it.each([
    ["unreachable", () => Promise.reject(new TypeError("fetch failed"))],
    ["failing inside Cloudflare", () => Response.json({ success: false, "error-codes": ["internal-error"] })],
    ["refusing the secret", () => Response.json({ success: false, "error-codes": ["invalid-input-secret"] }, { status: 400 })],
  ])("with siteverify %s: 503 with the fallback address, no engine call", async (_label, answer) => {
    const check = siteverify(answer);
    const { status, body } = await submit({ ...visitor, "cf-turnstile-response": TOKEN }, { env: withTurnstile(), fetch: check.fetch });
    expect(status).toBe(503);
    expect(body).toEqual({ ok: false, error: UNSENT });
    expect(engine.requests).toEqual([]);
  });

  it.each([
    ["only the secret", { NEXT_PUBLIC_TURNSTILE_SITE_KEY: undefined }],
    ["only the site key", { TURNSTILE_SECRET_KEY: undefined }],
  ])("with %s set: 503 without calling siteverify or the engine", async (_label, overrides) => {
    const check = siteverify(verified);
    const { status, body } = await submit({ ...visitor, "cf-turnstile-response": TOKEN }, { env: withTurnstile(overrides), fetch: check.fetch });
    expect(status).toBe(503);
    expect(body).toEqual({ ok: false, error: UNSENT });
    expect(check.calls).toEqual([]);
    expect(engine.requests).toEqual([]);
  });
});
