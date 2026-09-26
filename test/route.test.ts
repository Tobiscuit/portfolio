import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { SITE_KEY, startStubEngine, type StubEngine } from "./stub-engine";

// T4: app/api/contact/route.ts mounts the platform path when it is configured
// and the unchanged SES path otherwise. The route reads its SES configuration
// when the module loads, so every test sets the environment, then imports the
// route fresh. SES is only ever reached through a stubbed fetch: no real mail.

const SES_ENV = {
  SES_SENDER_EMAIL: "site@example.test",
  SES_RECIPIENT_EMAIL: "owner@example.test",
  SES_AWS_ACCESS_KEY_ID: "test-access-key-id",
  SES_AWS_SECRET_ACCESS_KEY: "test-secret-access-key", // pragma: allowlist secret
  AWS_REGION: "us-east-1",
};
const PLATFORM_VARS = [
  "SEO_ENGINE_URL",
  "SEO_SITE_KEY",
  "ENGINE_WRITE_HOST",
  "CONTACT_FALLBACK_EMAIL",
  "TURNSTILE_SECRET_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
];
const SES_ENDPOINT = "https://email.us-east-1.amazonaws.com/v2/email/outbound-emails";

const visitor = { name: "Ada Tester", email: "ada.tester@example.test", message: "Looking for help with a data pipeline, ref 7731." };

let engine: StubEngine;
beforeAll(async () => {
  engine = await startStubEngine();
});
afterAll(async () => {
  await engine.close();
});

beforeEach(() => {
  engine.reset();
  for (const [name, value] of Object.entries(SES_ENV)) vi.stubEnv(name, value);
  for (const name of PLATFORM_VARS) vi.stubEnv(name, undefined);
  for (const level of ["info", "warn", "error"] as const) vi.spyOn(console, level).mockImplementation(() => {});
});

async function loadRoute() {
  vi.resetModules();
  return import("../app/api/contact/route");
}

function post(body: unknown): Request {
  return new Request("https://www.jrcodex.dev/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/contact", () => {
  it.each([
    ["no platform variables set", {}],
    ["only SEO_SITE_KEY left behind (the rollback: SEO_ENGINE_URL removed)", { SEO_SITE_KEY: SITE_KEY }],
  ])("with %s, still sends through the existing SES path", async (_label, extra: Record<string, string>) => {
    for (const [name, value] of Object.entries(extra)) vi.stubEnv(name, value);
    const ses = vi.fn<typeof fetch>(async () => Response.json({ MessageId: "stub-message-id" }));
    vi.stubGlobal("fetch", ses);
    const { POST } = await loadRoute();

    const response = await POST(post(visitor));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    // The notification to the owner first, then the acknowledgement to the visitor.
    const sent = ses.mock.calls.map(([input, init]) => ({
      url: String(input),
      to: (JSON.parse(String(init?.body)) as { Destination: { ToAddresses: string[] } }).Destination.ToAddresses,
    }));
    expect(sent).toEqual([
      { url: SES_ENDPOINT, to: [SES_ENV.SES_RECIPIENT_EMAIL] },
      { url: SES_ENDPOINT, to: [visitor.email] },
    ]);
    expect(engine.requests).toEqual([]);
  });

  it("with SEO_ENGINE_URL set, sends to the engine instead, and nothing through SES", async () => {
    vi.stubEnv("SEO_ENGINE_URL", engine.url);
    vi.stubEnv("SEO_SITE_KEY", SITE_KEY);
    vi.stubEnv("ENGINE_WRITE_HOST", "www.jrcodex.dev");
    vi.stubEnv("CONTACT_FALLBACK_EMAIL", "fallback@example.test");
    // Only the local stub engine is reachable; anything else (SES) is recorded and refused.
    const realFetch = globalThis.fetch;
    const outbound: string[] = [];
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      outbound.push(url);
      if (url.startsWith(`${engine.url}/`)) return realFetch(input, init);
      throw new TypeError(`test: no network beyond the stub engine (${new URL(url).host})`);
    });
    const { POST } = await loadRoute();

    const response = await POST(post(visitor));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(engine.requests.map((r) => r.path)).toEqual(["/v1/manifest", "/v1/inquiries"]);
    expect(engine.requests[1].body).toEqual({ locale: "en", page: "/contact", fields: visitor });
    expect(outbound).toEqual([`${engine.url}/v1/manifest`, `${engine.url}/v1/inquiries`]);
  });

  it("with SEO_ENGINE_URL set but no site key, answers 503 rather than falling back to SES", async () => {
    vi.stubEnv("SEO_ENGINE_URL", engine.url);
    vi.stubEnv("ENGINE_WRITE_HOST", "www.jrcodex.dev");
    vi.stubEnv("CONTACT_FALLBACK_EMAIL", "fallback@example.test");
    const ses = vi.fn(async () => Response.json({ MessageId: "stub-message-id" }));
    vi.stubGlobal("fetch", ses);
    const { POST } = await loadRoute();

    const response = await POST(post(visitor));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "The message could not be sent. Please email fallback@example.test directly." });
    expect(ses).not.toHaveBeenCalled();
  });
});
