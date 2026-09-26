import { http, InquiryRefused, ManifestError, SiteKeyError, type Manifest } from "@jrcodex/seo-kit";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { SITE_KEY, startStubEngine, type StubEngine } from "./stub-engine";

// T1: the stub engine every other test talks to. These tests pin it to the
// contract of @jrcodex/seo-kit 0.3.1, through the kit's own http() client, so
// a passing acceptance test means "works against that contract", not "works
// against a stub that agrees with whatever the handler happens to do".

const manifest: Manifest = { version: 1, kind: "service", has: { intake: true }, intake: { fields: ["name"] } };
const submission = { locale: "en", page: "/contact", fields: { name: "Test Visitor" } };

let engine: StubEngine;
beforeAll(async () => {
  engine = await startStubEngine();
});
afterAll(async () => {
  await engine.close();
});
beforeEach(() => {
  engine.reset();
});

describe("the stub engine, through the kit's http()", () => {
  it("stores a manifest, then keeps an inquiry, both sent with the key as a bearer token", async () => {
    const client = http(engine.url, SITE_KEY);

    await expect(client.announce(manifest)).resolves.toMatchObject({ changed: true });
    await expect(client.inquire(submission)).resolves.toMatchObject({ id: expect.any(String), receivedAt: expect.any(String) });

    expect(engine.requests.map((r) => [r.method, r.path, r.authorization, r.contentType])).toEqual([
      ["POST", "/v1/manifest", `Bearer ${SITE_KEY}`, "application/json"],
      ["POST", "/v1/inquiries", `Bearer ${SITE_KEY}`, "application/json"],
    ]);
    expect(engine.requests[1].body).toEqual(submission);
  });

  it("refuses an inquiry from a site whose manifest it has not stored, as the engine does", async () => {
    const refusal = await http(engine.url, SITE_KEY).inquire(submission).catch((e: unknown) => e);
    expect(refusal).toBeInstanceOf(InquiryRefused);
    expect((refusal as InquiryRefused).message).toMatch(/has not declared an intake form/);
  });

  it("answers 401 to any other key, which the kit raises as SiteKeyError", async () => {
    await expect(http(engine.url, "sk_test_someone_else").announce(manifest)).rejects.toBeInstanceOf(SiteKeyError);
  });

  it("answers a scripted 403 on either endpoint, which the kit raises as SiteKeyError", async () => {
    engine.respond("/v1/manifest", { status: 403, body: "site key revoked" });
    engine.respond("/v1/inquiries", { status: 403, body: "site key revoked" });
    const client = http(engine.url, SITE_KEY);
    await expect(client.announce(manifest)).rejects.toBeInstanceOf(SiteKeyError);
    await expect(client.inquire(submission)).rejects.toBeInstanceOf(SiteKeyError);
  });

  it("answers a scripted 400 on /v1/manifest, which the kit raises as ManifestError with the reason", async () => {
    engine.respond("/v1/manifest", { status: 400, body: "has.shop: this engine has no such module" });
    const error = await http(engine.url, SITE_KEY).announce(manifest).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ManifestError);
    expect((error as ManifestError).message).toBe("has.shop: this engine has no such module");
  });

  it("answers a scripted 400 on /v1/inquiries, which the kit raises as InquiryRefused with the reason", async () => {
    engine.respond("/v1/inquiries", { status: 400, body: "message is longer than 1000 characters" });
    const error = await http(engine.url, SITE_KEY).inquire(submission).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(InquiryRefused);
    expect((error as InquiryRefused).message).toBe("message is longer than 1000 characters");
    expect((error as InquiryRefused).retryAfterSeconds).toBeUndefined();
  });

  it("answers a scripted 429 with Retry-After, which the kit raises as InquiryRefused with retryAfterSeconds", async () => {
    engine.respond("/v1/inquiries", { status: 429, body: "too many inquiries from this site in the last hour; try again in a minute", headers: { "retry-after": "30" } });
    const error = await http(engine.url, SITE_KEY).inquire(submission).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(InquiryRefused);
    expect((error as InquiryRefused).retryAfterSeconds).toBe(30);
  });

  it("can hold a request open without ever answering, until the client gives up", async () => {
    engine.respond("/v1/manifest", "hang");
    const client = http(engine.url, SITE_KEY, (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(100) }));
    const error = await client.announce(manifest).catch((e: unknown) => e);
    expect((error as Error).name).toBe("TimeoutError");
    expect(engine.requests.map((r) => r.path)).toEqual(["/v1/manifest"]);
  });
});
