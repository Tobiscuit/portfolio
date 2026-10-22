import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HONEYPOT_FIELD, TOKEN_FIELD, TURNSTILE_ACTION } from "../../lib/inquiry/form";
import { handleInquiry, validate, type InquiryEnv } from "../../lib/inquiry/handle";
import { SITEVERIFY_URL, verifyTurnstile } from "../../lib/inquiry/turnstile";
import { SITE_HOST } from "../../lib/site";

/**
 * The contact form's flow (spec 003, domain-model section 2, InquirySubmission;
 * T4). Adapted from PR #1/#4's test/intake.test.ts: the engine is a fake
 * binding here (rpc), and the handler returns an outcome the route renders as
 * an htmx fragment or a full page.
 *
 *   honeypot -> field rules -> Turnstile -> write host -> announce -> inquire
 */
const KEY = "sk_test_0123456789abcdef0123456789abcdef";
const SECRET = "1x0000000000000000000000000000000AA"; // pragma: allowlist secret
const VISITOR = { name: "Dana Alvarez", email: "dana@example.com", message: "Hello there, a private sentence." };

function engine(overrides: Record<string, unknown> = {}) {
  return {
    announce: vi.fn(async () => ({ changed: true, manifest: {}, unrecognized: [] })),
    inquire: vi.fn(async () => ({ id: "inq_1", receivedAt: "2026-10-22T00:00:00.000Z" })),
    ...overrides,
  };
}

const okSiteverify = vi.fn(async () => Response.json({ success: true, action: TURNSTILE_ACTION }));

function env(overrides: Partial<InquiryEnv> = {}, seo = engine()): InquiryEnv {
  return { SEO: seo, SEO_SITE_KEY: KEY, ENGINE_WRITE_HOST: SITE_HOST, TURNSTILE_SECRET_KEY: SECRET, TURNSTILE_SITE_KEY: "1x00000000000000000000AA", ...overrides };
}

function post(fields: Record<string, string>, host = SITE_HOST): Request {
  const body = new URLSearchParams(fields);
  return new Request(`https://${host}/contact`, { method: "POST", body, headers: { "cf-connecting-ip": "203.0.113.7" } });
}
const withToken = (extra: Record<string, string> = {}) => ({ ...VISITOR, [TOKEN_FIELD]: "XXXX.DUMMY.TOKEN.XXXX", ...extra });

let logs: string[];
beforeEach(() => {
  logs = [];
  for (const level of ["log", "info", "warn", "error"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => void logs.push(args.map(String).join(" ")));
  }
});
afterEach(() => {
  vi.restoreAllMocks();
  okSiteverify.mockClear();
});

describe("a valid submission", () => {
  it("is verified, announced, then sent with exactly name, email and message, from /contact in English", async () => {
    const seo = engine();
    const outcome = await handleInquiry(post(withToken()), { env: env({}, seo), fetch: okSiteverify });
    expect(outcome).toMatchObject({ ok: true, status: 200, outcome: "sent" });
    expect(seo.announce).toHaveBeenCalledTimes(1);
    expect(seo.inquire).toHaveBeenCalledWith(KEY, { locale: "en", page: "/contact", fields: VISITOR });
    expect(okSiteverify).toHaveBeenCalledWith(SITEVERIFY_URL, expect.objectContaining({ method: "POST" }));
  });

  it("never logs what the visitor typed, the site key or the Turnstile secret", async () => {
    await handleInquiry(post(withToken()), { env: env(), fetch: okSiteverify });
    const all = logs.join("\n");
    for (const secret of [VISITOR.name, VISITOR.email, VISITOR.message, KEY, SECRET]) expect(all).not.toContain(secret);
  });
});

describe("nothing reaches the engine", () => {
  it("when the honeypot is filled: a quiet success, discarded", async () => {
    const seo = engine();
    const outcome = await handleInquiry(post(withToken({ [HONEYPOT_FIELD]: "bot" })), { env: env({}, seo), fetch: okSiteverify });
    expect(outcome).toMatchObject({ ok: true, outcome: "discarded" });
    expect(seo.inquire).not.toHaveBeenCalled();
  });

  it.each([
    [{ name: "" }, /your name/],
    [{ name: "x".repeat(101) }, /too long/],
    [{ email: "" }, /email address/],
    [{ email: "not-an-address" }, /does not look right/],
    [{ message: "" }, /a message/],
    [{ message: "x".repeat(5001) }, /under 5000/],
  ])("when a field is wrong (%o): 400 with the reason, and the fields kept", async (bad, reason) => {
    const seo = engine();
    const outcome = await handleInquiry(post(withToken(bad as Record<string, string>)), { env: env({}, seo), fetch: okSiteverify });
    expect(outcome).toMatchObject({ ok: false, status: 400, outcome: "invalid" });
    expect(outcome.message).toMatch(reason);
    expect(outcome.ok === false && outcome.fields?.name).toBe((bad as Record<string, string>).name ?? VISITOR.name);
    expect(seo.inquire).not.toHaveBeenCalled();
  });

  it("when the body cannot be read: 400", async () => {
    const request = new Request(`https://${SITE_HOST}/contact`, { method: "POST", body: "{", headers: { "content-type": "application/json" } });
    await expect(handleInquiry(request, { env: env(), fetch: okSiteverify })).resolves.toMatchObject({ ok: false, status: 400, outcome: "malformed" });
  });

  it("when the Turnstile token is missing: 400, siteverify not called", async () => {
    const outcome = await handleInquiry(post(VISITOR), { env: env(), fetch: okSiteverify });
    expect(outcome).toMatchObject({ ok: false, status: 400, outcome: "turnstile-missing-token" });
    expect(okSiteverify).not.toHaveBeenCalled();
  });

  it("when Turnstile says no: 400", async () => {
    const no = vi.fn(async () => Response.json({ success: false, "error-codes": ["invalid-input-response"] }));
    await expect(handleInquiry(post(withToken()), { env: env(), fetch: no })).resolves.toMatchObject({ ok: false, status: 400, outcome: "turnstile-rejected" });
  });

  it("when the token was minted for another action: 400", async () => {
    const other = vi.fn(async () => Response.json({ success: true, action: "login" }));
    await expect(handleInquiry(post(withToken()), { env: env(), fetch: other })).resolves.toMatchObject({ outcome: "turnstile-rejected" });
  });

  it("when Turnstile cannot be reached: 503 with the e-mail address", async () => {
    const down = vi.fn(async () => Promise.reject(new Error("network")));
    const outcome = await handleInquiry(post(withToken()), { env: env(), fetch: down });
    expect(outcome).toMatchObject({ ok: false, status: 503, outcome: "turnstile-unavailable" });
    expect(outcome.message).toContain("@");
  });

  it("when only one Turnstile key is set: 503, fail closed", async () => {
    const outcome = await handleInquiry(post(withToken()), { env: env({ TURNSTILE_SITE_KEY: undefined }), fetch: okSiteverify });
    expect(outcome).toMatchObject({ ok: false, status: 503, outcome: "turnstile-misconfigured" });
  });

  it("when neither Turnstile key is set: 503, never an unchecked form", async () => {
    const outcome = await handleInquiry(post(withToken()), { env: env({ TURNSTILE_SITE_KEY: undefined, TURNSTILE_SECRET_KEY: undefined }), fetch: okSiteverify });
    expect(outcome).toMatchObject({ ok: false, status: 503, outcome: "turnstile-misconfigured" });
  });

  it("from a host that is not the write host (a preview): 503 preview, after the checks", async () => {
    const seo = engine();
    const outcome = await handleInquiry(post(withToken(), "abc-juanramirez-codes.tobiasramzy.workers.dev"), { env: env({}, seo), fetch: okSiteverify });
    expect(outcome).toMatchObject({ ok: false, status: 503, outcome: "preview" });
    expect(seo.announce).not.toHaveBeenCalled();
    expect(seo.inquire).not.toHaveBeenCalled();
  });

  it("when the site is not connected (no binding or key): 503 with the e-mail address", async () => {
    await expect(handleInquiry(post(withToken()), { env: env({ SEO: undefined }), fetch: okSiteverify })).resolves.toMatchObject({ status: 503, outcome: "unconfigured" });
    await expect(handleInquiry(post(withToken()), { env: env({ SEO_SITE_KEY: undefined }), fetch: okSiteverify })).resolves.toMatchObject({ status: 503, outcome: "site-key-refused" });
  });
});

describe("the engine says no", () => {
  const refused = (name: string, message: string, extra: Record<string, unknown> = {}) =>
    vi.fn(async () => {
      const error = Object.assign(new Error(message), extra);
      error.name = name;
      throw error;
    });

  it("too many inquiries: 429 with Retry-After, the visitor's words kept", async () => {
    const outcome = await handleInquiry(post(withToken()), { env: env({}, engine({ inquire: refused("InquiryRefused", "slow down", { retryAfterSeconds: 30 }) })), fetch: okSiteverify });
    expect(outcome).toMatchObject({ ok: false, status: 429, outcome: "rate-limited", retryAfterSeconds: 30 });
  });

  it("a refused inquiry: 400 with the engine's reason as a sentence", async () => {
    const outcome = await handleInquiry(post(withToken()), { env: env({}, engine({ inquire: refused("InquiryRefused", "message is too short") })), fetch: okSiteverify });
    expect(outcome).toMatchObject({ ok: false, status: 400, outcome: "refused", message: "Message is too short." });
  });

  it.each([
    ["SiteKeyError", "site-key-refused"],
    ["ManifestError", "manifest-refused"],
    ["Error", "engine-error"],
  ])("%s: 503 with the e-mail address, logged by name only", async (name, outcome) => {
    const result = await handleInquiry(post(withToken()), { env: env({}, engine({ inquire: refused(name, "detail that might carry anything") })), fetch: okSiteverify });
    expect(result).toMatchObject({ ok: false, status: 503, outcome });
    expect(result.message).toContain("juan@proprietor.systems");
    expect(logs.join("\n")).not.toContain("detail that might carry anything");
  });

  it("a failed announce: 503 and no inquiry", async () => {
    // announceOnce remembers a success per isolate (the kit's module state), so
    // this test loads fresh modules, as a new isolate would.
    vi.resetModules();
    const fresh = await import("../../lib/inquiry/handle");
    const seo = engine({ announce: refused("ManifestError", "has.projects is not a module") });
    const result = await fresh.handleInquiry(post(withToken()), { env: env({}, seo), fetch: okSiteverify });
    expect(result).toMatchObject({ status: 503, outcome: "manifest-refused" });
    expect(seo.inquire).not.toHaveBeenCalled();
  });
});

describe("validate", () => {
  it("trims, lower-cases the address and strips control characters", () => {
    expect(validate({ name: " Dana\u0007 ", email: " Dana@Example.COM ", message: " hi " })).toEqual({ ok: true, name: "Dana", email: "dana@example.com", message: "hi" });
  });
});

describe("verifyTurnstile", () => {
  it("sends the secret, the token, the visitor's IP and an idempotency key, form-encoded", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = init?.body as URLSearchParams;
      expect(body.get("secret")).toBe(SECRET);
      expect(body.get("response")).toBe("tok");
      expect(body.get("remoteip")).toBe("203.0.113.7");
      expect(body.get("idempotency_key")).toBeTruthy();
      return Response.json({ success: true });
    });
    await expect(verifyTurnstile({ token: "tok", secret: SECRET, remoteIp: "203.0.113.7", fetch: fetchImpl as unknown as typeof fetch })).resolves.toEqual({ ok: true });
  });

  it("refuses a token over 2048 characters without calling out", async () => {
    const fetchImpl = vi.fn();
    await expect(verifyTurnstile({ token: "x".repeat(2049), secret: SECRET, fetch: fetchImpl as unknown as typeof fetch })).resolves.toEqual({ ok: false, reason: "missing-token" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reads a bad secret as unavailable, not as the visitor's failure", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ success: false, "error-codes": ["invalid-input-secret"] }, { status: 400 }));
    await expect(verifyTurnstile({ token: "tok", secret: "bad", fetch: fetchImpl as unknown as typeof fetch })).resolves.toMatchObject({ ok: false, reason: "unavailable" });
  });
});
