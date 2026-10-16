import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { FIXTURE_MEDIA, FIXTURE_VIDEOS, HERO_KEY, ORIGIN } from "./fixtures";
import { SITE_KEY, startStubEngine, type StubEngine } from "./stub-engine";

// A2: /media/<key> (app/media/[...key]/route.ts) serves the engine's stored
// originals through the kit's mediaHandler, over http() to the stub. Engine
// keys are nested (<business slug>/...); Payload's mirrored files in
// public/media/ are flat names, which Next serves before this route.

const state = vi.hoisted(() => ({ env: {} as Record<string, unknown> }));
vi.mock("@/lib/platform/env", () => ({ platformEnv: () => state.env }));

let engine: StubEngine;
beforeAll(async () => {
  engine = await startStubEngine();
});
afterAll(async () => {
  await engine.close();
});
beforeEach(() => {
  engine.reset();
  state.env = { SEO_ENGINE_URL: engine.url, SEO_SITE_KEY: SITE_KEY };
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

const route = () => import("../app/media/[...key]/route");
const request = (path: string, init: RequestInit = {}) => new Request(`${ORIGIN}${path}`, init);

describe("/media/<key>", () => {
  it("streams a nested engine key's bytes with the engine's headers", async () => {
    const { GET } = await route();
    const response = await GET(request(`/media/${HERO_KEY}`));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(response.headers.get("etag")).toBe(FIXTURE_MEDIA[HERO_KEY].etag);
    expect(Buffer.from(await response.arrayBuffer()).equals(Buffer.from(FIXTURE_MEDIA[HERO_KEY].base64, "base64"))).toBe(true);
    expect(engine.requests.map((r) => r.path)).toEqual([`/v1/media/${HERO_KEY}`]);
  });

  it("answers 304 with no body when the browser already has that ETag", async () => {
    const { GET } = await route();
    const response = await GET(request(`/media/${HERO_KEY}`, { headers: { "if-none-match": FIXTURE_MEDIA[HERO_KEY].etag } }));
    expect(response.status).toBe(304);
    expect(await response.text()).toBe("");
  });

  it("answers HEAD with the headers and no body", async () => {
    const { HEAD } = await route();
    const response = await HEAD(request(`/media/${HERO_KEY}`, { method: "HEAD" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.body).toBeNull();
  });

  it("answers 404 for a key the engine does not have, and asks the engine for a video's render key as it is", async () => {
    const { GET } = await route();
    expect((await GET(request("/media/jrcodex/no-such-file.png"))).status).toBe(404);
    expect((await GET(request(FIXTURE_VIDEOS[0].src))).status).toBe(404);
    expect(engine.requests.map((r) => r.path)).toEqual(["/v1/media/jrcodex/no-such-file.png", `/v1${FIXTURE_VIDEOS[0].src}`]);
  });

  it("answers 404 \"not found\" without calling anything when the platform is unconfigured", async () => {
    state.env = {};
    const { GET, HEAD } = await route();
    const response = await GET(request(`/media/${HERO_KEY}`));
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("not found");
    expect((await HEAD(request(`/media/${HERO_KEY}`, { method: "HEAD" }))).status).toBe(404);
    expect(engine.requests).toEqual([]);
  });

  it("lets an engine failure through as an error (a 5xx), never a 404", async () => {
    engine.respond(`/v1/media/${HERO_KEY}`, { status: 500, body: "R2 down" });
    const { GET } = await route();
    await expect(GET(request(`/media/${HERO_KEY}`))).rejects.toThrow(/500/);
  });
});
