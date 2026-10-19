import { SiteKeyError } from "@jrcodex/seo-kit";
import { describe, expect, it, vi } from "vitest";

import { ENGINE_TIMEOUT_MS, engineFor, transportFor } from "@/lib/intake/engine";
import { SITE_KEY } from "./stub-engine";

// T2: one function picks the transport (spec section 1, "Keeps working if the
// site leaves Vercel"). The acceptance tests in test/intake.test.ts drive both
// transports end to end; these pin the selection rules themselves.

const binding = { announce: vi.fn(), inquire: vi.fn() };

describe("transportFor", () => {
  it.each([
    ["a SEO service binding", { SEO: binding, SEO_SITE_KEY: SITE_KEY }, "rpc"],
    ["a binding, even beside an engine URL", { SEO: binding, SEO_ENGINE_URL: "https://engine.example", SEO_SITE_KEY: SITE_KEY }, "rpc"],
    ["SEO_ENGINE_URL and SEO_SITE_KEY", { SEO_ENGINE_URL: "https://engine.example", SEO_SITE_KEY: SITE_KEY }, "http"],
    // The URL is the switch: with it and no key, the engine path answers 503
    // rather than quietly going back to SES.
    ["SEO_ENGINE_URL without a key", { SEO_ENGINE_URL: "https://engine.example" }, "http"],
    ["neither", {}, null],
    // Rollback (spec section 4) is removing SEO_ENGINE_URL; a key left behind
    // must not keep the platform path on.
    ["only SEO_SITE_KEY", { SEO_SITE_KEY: SITE_KEY }, null],
    ["empty strings", { SEO_ENGINE_URL: "", SEO_SITE_KEY: "" }, null],
  ])("%s -> %s", (_label, env, expected) => {
    expect(transportFor(env)).toBe(expected);
  });
});

describe("engineFor", () => {
  it("speaks http() to SEO_ENGINE_URL with the key as a bearer token, through the given fetch, with a 10 s timeout", async () => {
    const calls: { url: string; init: RequestInit | undefined }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init });
      return Response.json({ id: "inq-1", receivedAt: "2026-09-26T12:00:00.000Z" });
    };
    const timeout = vi.spyOn(AbortSignal, "timeout");

    const client = engineFor({ SEO_ENGINE_URL: "https://engine.example/", SEO_SITE_KEY: SITE_KEY }, fetchImpl);
    await client.inquire({ fields: {} });

    expect(ENGINE_TIMEOUT_MS).toBe(10_000);
    expect(timeout).toHaveBeenCalledWith(10_000);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://engine.example/v1/inquiries");
    expect(calls[0].init?.signal).toBeInstanceOf(AbortSignal);
    expect(new Headers(calls[0].init?.headers).get("authorization")).toBe(`Bearer ${SITE_KEY}`);
  });

  it("speaks rpc() to a binding, passing the key", async () => {
    const seo = { announce: vi.fn(), inquire: vi.fn(async () => ({ id: "inq-1", receivedAt: "2026-09-26T12:00:00.000Z" })) };
    await engineFor({ SEO: seo, SEO_SITE_KEY: SITE_KEY }).inquire({ fields: { name: "A" } });
    expect(seo.inquire).toHaveBeenCalledWith(SITE_KEY, { fields: { name: "A" } });
  });

  it("throws the kit's SiteKeyError when the key is missing or malformed", () => {
    expect(() => engineFor({ SEO_ENGINE_URL: "https://engine.example" })).toThrow(SiteKeyError);
    expect(() => engineFor({ SEO_ENGINE_URL: "https://engine.example", SEO_SITE_KEY: "pk_live_x" })).toThrow(SiteKeyError);
  });

  it("refuses to build a client when no transport is configured", () => {
    expect(() => engineFor({ SEO_SITE_KEY: SITE_KEY })).toThrow(/no engine transport/);
  });
});
