import { http, InquiryRefused, ManifestError, SiteKeyError, type Manifest } from "@jrcodex/seo-kit";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { FIXTURE_MEDIA, FIXTURE_POSTS, FIXTURE_PROFILE, FIXTURE_SITEMAP, FIXTURE_VIDEOS, HERO_KEY } from "./fixtures";
import { SITE_KEY, startStubEngine, type StubEngine } from "./stub-engine";

// T1: the stub engine every other test talks to. These tests pin it to the
// contract of @jrcodex/seo-kit (0.3.1 then; 0.6.2 since spec 002, whose read
// routes are pinned below), through the kit's own http() client, so
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

  // Spec 002: the reads this site makes, through the same client.

  it("answers the post list newest first, one post, and 404 for an unknown slug, which the kit reads as null", async () => {
    const client = http(engine.url, SITE_KEY);
    const posts = await client.posts("en");
    expect(posts.map((p) => p.slug)).toEqual(FIXTURE_POSTS.map((p) => p.slug));
    expect(posts.every((p) => !("html" in p))).toBe(true);
    await expect(client.post("en", FIXTURE_POSTS[0].slug)).resolves.toEqual(FIXTURE_POSTS[0]);
    await expect(client.post("en", "no-such-post")).resolves.toBeNull();
    await expect(client.posts("es")).resolves.toEqual([]);
    expect(engine.requests.map((r) => [r.method, r.path, r.authorization])).toEqual([
      ["GET", "/v1/posts", `Bearer ${SITE_KEY}`],
      ["GET", `/v1/posts/en/${FIXTURE_POSTS[0].slug}`, `Bearer ${SITE_KEY}`],
      ["GET", "/v1/posts/en/no-such-post", `Bearer ${SITE_KEY}`],
      ["GET", "/v1/posts", `Bearer ${SITE_KEY}`],
    ]);
  });

  it("answers the profile and the sitemap", async () => {
    const client = http(engine.url, SITE_KEY);
    await expect(client.profile()).resolves.toEqual(FIXTURE_PROFILE);
    await expect(client.sitemap()).resolves.toEqual(FIXTURE_SITEMAP);
  });

  it("streams a stored original with its ETag under a nested key, and 404 for a key it does not have, which the kit reads as null", async () => {
    const client = http(engine.url, SITE_KEY);
    const media = await client.media(HERO_KEY);
    expect(media?.status).toBe(200);
    expect(media?.headers.get("content-type")).toBe("image/png");
    expect(media?.headers.get("etag")).toBe(FIXTURE_MEDIA[HERO_KEY].etag);
    expect(Buffer.from(await media!.arrayBuffer()).equals(Buffer.from(FIXTURE_MEDIA[HERO_KEY].base64, "base64"))).toBe(true);
    await expect(client.media("jrcodex/no-such-file.png")).resolves.toBeNull();
    expect(engine.requests.map((r) => r.path)).toEqual([`/v1/media/${HERO_KEY}`, "/v1/media/jrcodex/no-such-file.png"]);
  });

  it("refuses every read without the site key, which the kit raises as SiteKeyError", async () => {
    const stranger = http(engine.url, "sk_test_someone_else");
    await expect(stranger.posts("en")).rejects.toBeInstanceOf(SiteKeyError);
    await expect(stranger.post("en", FIXTURE_POSTS[0].slug)).rejects.toBeInstanceOf(SiteKeyError);
    await expect(stranger.profile()).rejects.toBeInstanceOf(SiteKeyError);
    await expect(stranger.media(HERO_KEY)).rejects.toBeInstanceOf(SiteKeyError);
  });

  it("answers a scripted 500 on a read, which the kit raises as an error naming the status", async () => {
    engine.respond("/v1/posts", { status: 500, body: "D1_ERROR" });
    await expect(http(engine.url, SITE_KEY).posts("en")).rejects.toThrow("SEO engine answered 500 for /v1/posts?locale=en");
  });

  it("answers GET /v1/videos as plan.md section 2.2 fixes it (kit 0.7.0's contract; 0.6.2 has no videos())", async () => {
    expect("videos" in http(engine.url, SITE_KEY)).toBe(false);
    const answer = await fetch(`${engine.url}/v1/videos`, { headers: { authorization: `Bearer ${SITE_KEY}` } });
    expect(answer.status).toBe(200);
    expect(await answer.json()).toEqual(FIXTURE_VIDEOS);
    expect((await fetch(`${engine.url}/v1/videos`)).status).toBe(401);
  });

  it("can hold a request open without ever answering, until the client gives up", async () => {
    engine.respond("/v1/manifest", "hang");
    const client = http(engine.url, SITE_KEY, (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(100) }));
    const error = await client.announce(manifest).catch((e: unknown) => e);
    expect((error as Error).name).toBe("TimeoutError");
    expect(engine.requests.map((r) => r.path)).toEqual(["/v1/manifest"]);
  });
});
