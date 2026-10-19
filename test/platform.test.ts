import type { SeoClient } from "@jrcodex/seo-kit";
import { http } from "@jrcodex/seo-kit";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { EngineEnv } from "@/lib/intake/engine";
import { FIGURE_KEY, FIXTURE_POSTS, FIXTURE_PROFILE, FIXTURE_VIDEOS, HERO_KEY, PRODUCTION_HOST } from "./fixtures";
import { SITE_KEY, startStubEngine, type StubEngine } from "./stub-engine";

// A1: the platform's reads (specs/002-proprietor-adoption/plan.md section 2.1,
// montano's rules), against the stub over the kit's real http(), the
// production transport under D1 (the hybrid on Vercel):
//   - unconnected: empty lists and the fallback profile, logged once per process;
//   - connected and a read fails: the error goes through, and the pages decide
//     where a 5xx is right (/blog) and where "none" is (footer, sitemap);
//   - a single read answering 404 is null;
//   - every engine image URL becomes /media/<key> on every host: the zone is
//     not proxied, so /cdn-cgi/image/ answers nowhere on this site;
//   - videos (section 2.2): client.videos() when the kit has it, else the
//     binding's videos(siteKey), else [].

// If anything ever asks for the request's host, it is the production host:
// the rewrite must not depend on it.
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: PRODUCTION_HOST }) }));

let engine: StubEngine;
let logs: string[] = [];

beforeAll(async () => {
  engine = await startStubEngine();
});
afterAll(async () => {
  await engine.close();
});
beforeEach(() => {
  engine.reset();
  logs = [];
  for (const level of ["log", "info", "warn", "error", "debug"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });
  }
});

const connected = (): EngineEnv => ({ SEO_ENGINE_URL: engine.url, SEO_SITE_KEY: SITE_KEY });
const [FULL, PLAIN] = FIXTURE_POSTS;

describe("the environment (app/lib/platform/env.ts)", () => {
  it("is process.env today: the one place the platform modules read it", async () => {
    const { platformEnv } = await import("@/lib/platform/env");
    expect(platformEnv()).toBe(process.env);
  });
});

describe("the connection (app/lib/platform/client.ts)", () => {
  it("is null when neither a SEO binding nor SEO_ENGINE_URL is set, and says so once per process", async () => {
    vi.resetModules();
    const { platformClient } = await import("@/lib/platform/client");
    expect(platformClient({})).toBeNull();
    expect(platformClient({ SEO_SITE_KEY: SITE_KEY })).toBeNull();
    expect(logs.filter((line) => /not connected/.test(line))).toHaveLength(1);
  });

  it("is null, logged without the value, when SEO_ENGINE_URL is set but the key is missing or malformed", async () => {
    vi.resetModules();
    const { platformClient } = await import("@/lib/platform/client");
    expect(platformClient({ SEO_ENGINE_URL: engine.url })).toBeNull();
    expect(platformClient({ SEO_ENGINE_URL: engine.url, SEO_SITE_KEY: "pk_live_not_a_site_key" })).toBeNull();
    expect(logs.join("\n")).toMatch(/SEO_SITE_KEY/);
    expect(logs.join("\n")).not.toContain("pk_live_not_a_site_key");
  });

  it("speaks the kit's http() with the key as a bearer token when SEO_ENGINE_URL and the key are set", async () => {
    const { platformClient } = await import("@/lib/platform/client");
    const client = platformClient(connected());
    expect(client).not.toBeNull();
    await expect(client!.posts("en")).resolves.toHaveLength(FIXTURE_POSTS.length);
    expect(engine.requests.map((r) => [r.method, r.path, r.authorization])).toEqual([["GET", "/v1/posts", `Bearer ${SITE_KEY}`]]);
  });
});

describe("posts", () => {
  it("are [] when unconnected, and the fixture posts newest first when connected", async () => {
    const { readPosts } = await import("@/lib/platform/client");
    await expect(readPosts({})).resolves.toEqual([]);
    const posts = await readPosts(connected());
    expect(posts.map((p) => p.slug)).toEqual([FULL.slug, PLAIN.slug]);
    expect(posts.map((p) => p.path)).toEqual([FULL.path, PLAIN.path]);
  });

  it("let a failed list read through when connected: a 5xx for /blog, never a silent empty list", async () => {
    const { readPosts } = await import("@/lib/platform/client");
    engine.respond("/v1/posts", { status: 500, body: "D1_ERROR" });
    await expect(readPosts(connected())).rejects.toThrow(/500/);
  });

  it("drop a listed post whose shape is wrong, and say so", async () => {
    const { readPosts } = await import("@/lib/platform/client");
    const [good] = await readPosts(connected());
    engine.respond("/v1/posts", { status: 200, body: JSON.stringify([good, { slug: "x" }, { ...good, path: "https://elsewhere.example/blog/x" }]), headers: { "content-type": "application/json" } });
    await expect(readPosts(connected())).resolves.toEqual([good]);
    expect(logs.join("\n")).toMatch(/dropped 2/);
  });

  it("read one post by slug; an unknown slug is null; a 500 is thrown, never null", async () => {
    const { readPost } = await import("@/lib/platform/client");
    const post = await readPost(connected(), FULL.slug);
    expect(post?.title).toBe(FULL.title);
    expect(post?.blocks).toHaveLength(FULL.blocks.length);
    await expect(readPost(connected(), "no-such-post")).resolves.toBeNull();
    await expect(readPost({}, FULL.slug)).resolves.toBeNull();
    engine.respond(`/v1/posts/en/${FULL.slug}`, { status: 500, body: "D1_ERROR" });
    await expect(readPost(connected(), FULL.slug)).rejects.toThrow(/500/);
  });

  it("refuse a single post whose shape is wrong with an error (a 5xx), not a broken page", async () => {
    const { readPost } = await import("@/lib/platform/client");
    engine.respond(`/v1/posts/en/${FULL.slug}`, { status: 200, body: JSON.stringify({ ...FULL, blocks: "not a list" }), headers: { "content-type": "application/json" } });
    await expect(readPost(connected(), FULL.slug)).rejects.toThrow(/not a Post/);
  });

  it("are served unprefixed in the site's one locale, as the engine's paths say (the kit's README test)", async () => {
    const { manifest } = await import("@/lib/intake/manifest");
    const { readPost } = await import("@/lib/platform/client");
    const post = await readPost(connected(), FULL.slug);
    expect(post?.locales[0]).toBe(manifest.locales[0]);
    expect(post?.path).toBe(`/blog/${FULL.slug}`);
  });

  it("come with the engine's sitemap entries; [] when unconnected", async () => {
    const { readSitemap } = await import("@/lib/platform/client");
    await expect(readSitemap({})).resolves.toEqual([]);
    const entries = await readSitemap(connected());
    expect(entries.map((e) => e.path)).toEqual([FULL.path, PLAIN.path]);
  });
});

describe("the profile", () => {
  it("is the fallback (app/lib/site.ts) when unconnected, logged once", async () => {
    vi.resetModules();
    const { readProfile } = await import("@/lib/platform/client");
    const { FALLBACK_PROFILE } = await import("@/lib/site");
    await expect(readProfile({})).resolves.toEqual(FALLBACK_PROFILE);
    await expect(readProfile({})).resolves.toEqual(FALLBACK_PROFILE);
    expect(FALLBACK_PROFILE.name).toBe("Juan Ramirez");
    expect(FALLBACK_PROFILE.email).toBe("jramirez203@outlook.com");
    expect(logs.filter((line) => /profile/.test(line))).toHaveLength(1);
  });

  it("is the engine's when connected, and the fallback (never a throw) when the read fails or the shape is wrong", async () => {
    vi.resetModules();
    const { readProfile } = await import("@/lib/platform/client");
    const { FALLBACK_PROFILE } = await import("@/lib/site");
    await expect(readProfile(connected())).resolves.toEqual(FIXTURE_PROFILE);

    engine.respond("/v1/profile", { status: 500, body: "boom" });
    await expect(readProfile(connected())).resolves.toEqual(FALLBACK_PROFILE);

    engine.respond("/v1/profile", { status: 200, body: JSON.stringify({ ...FIXTURE_PROFILE, name: "" }), headers: { "content-type": "application/json" } });
    await expect(readProfile(connected())).resolves.toEqual(FALLBACK_PROFILE);
    expect(logs.join("\n")).toMatch(/not a BusinessProfile/);
  });
});

describe("videos (the shim, plan.md section 2.2)", () => {
  const binding = (videos: unknown) => ({ posts: vi.fn(), profile: vi.fn(), videos: vi.fn(async () => videos) });
  /** What kit 0.7.0's http() will be: 0.6.2's client plus videos() over GET /v1/videos. */
  const kit070 = (): SeoClient & { videos(): Promise<unknown> } => ({
    ...http(engine.url, SITE_KEY),
    videos: async () => (await fetch(`${engine.url}/v1/videos`, { headers: { authorization: `Bearer ${SITE_KEY}` } })).json(),
  });

  it("come from client.videos() when the kit's client has it, over either transport", async () => {
    const { readVideos } = await import("@/lib/platform/videos");
    await expect(readVideos(connected(), kit070())).resolves.toEqual(FIXTURE_VIDEOS);
    expect(engine.requests.map((r) => r.path)).toEqual(["/v1/videos"]);
  });

  it("else from the SEO binding's videos(siteKey)", async () => {
    const { readVideos } = await import("@/lib/platform/videos");
    const seo = binding(FIXTURE_VIDEOS);
    await expect(readVideos({ SEO: seo, SEO_SITE_KEY: SITE_KEY })).resolves.toEqual(FIXTURE_VIDEOS);
    expect(seo.videos).toHaveBeenCalledWith(SITE_KEY);
  });

  it("else []: over kit 0.6.2's http(), on a binding without videos, unconnected, or without a key", async () => {
    const { readVideos } = await import("@/lib/platform/videos");
    await expect(readVideos(connected())).resolves.toEqual([]);
    await expect(readVideos({ SEO: { posts: vi.fn(), profile: vi.fn() }, SEO_SITE_KEY: SITE_KEY })).resolves.toEqual([]);
    await expect(readVideos({})).resolves.toEqual([]);
    const keyless = binding(FIXTURE_VIDEOS);
    await expect(readVideos({ SEO: keyless })).resolves.toEqual([]);
    expect(keyless.videos).not.toHaveBeenCalled();
    expect(engine.requests).toEqual([]);
  });

  it("keep only well-shaped cuts, and are [] (logged, never thrown) when the read fails or answers nonsense", async () => {
    const { readVideos } = await import("@/lib/platform/videos");
    const env = (videos: unknown) => ({ SEO: binding(videos), SEO_SITE_KEY: SITE_KEY });
    const malformed = [
      FIXTURE_VIDEOS[0],
      { id: "x", title: "no src" },
      { ...FIXTURE_VIDEOS[1], contentType: "video/webm" },
      { ...FIXTURE_VIDEOS[1], format: "square" },
      { ...FIXTURE_VIDEOS[1], src: "https://elsewhere.example/v.mp4" },
      { ...FIXTURE_VIDEOS[1], src: "//elsewhere.example/v.mp4" },
    ];
    await expect(readVideos(env(malformed))).resolves.toEqual([FIXTURE_VIDEOS[0]]);
    await expect(readVideos(env({ not: "a list" }))).resolves.toEqual([]);
    const throwing = { videos: vi.fn(async () => { throw new Error("binding down"); }) };
    await expect(readVideos({ SEO: throwing, SEO_SITE_KEY: SITE_KEY })).resolves.toEqual([]);
    expect(logs.join("\n")).toMatch(/binding down/);
  });
});

describe("images (app/lib/platform/images.ts)", () => {
  it("rewrite every transform URL to /media/<key>, root-relative or absolute", async () => {
    const { withoutTransforms } = await import("@/lib/platform/images");
    expect(withoutTransforms("/cdn-cgi/image/format=auto,width=960/media/jrcodex/a.png 960w")).toBe("/media/jrcodex/a.png 960w");
    expect(withoutTransforms("https://www.jrcodex.dev/cdn-cgi/image/format=auto,width=1024/media/jrcodex/a.png")).toBe("https://www.jrcodex.dev/media/jrcodex/a.png");
    expect(withoutTransforms("/media/jrcodex/a.png")).toBe("/media/jrcodex/a.png");
  });

  it("rewrite a post's hero, html, blocks (what compose() renders) and JSON-LD; a post without a hero keeps null", async () => {
    const { plainPost, plainPostSummary } = await import("@/lib/platform/images");
    const post = plainPost(FULL);
    expect(post.hero?.src).toBe(`/media/${HERO_KEY}`);
    expect(post.hero?.srcset).toBe(`/media/${HERO_KEY} 480w, /media/${HERO_KEY} 768w, /media/${HERO_KEY} 1024w`);
    expect(post.html).not.toContain("/cdn-cgi/");
    expect(post.blocks.join("")).not.toContain("/cdn-cgi/");
    expect(post.blocks[2]).toContain(`src="/media/${FIGURE_KEY}"`);
    expect(JSON.stringify(post.jsonLd)).not.toContain("/cdn-cgi/");
    expect(JSON.stringify(post.jsonLd)).toContain(`"image":"https://www.jrcodex.dev/media/${HERO_KEY}"`);
    expect(plainPost(PLAIN).hero).toBeNull();
    expect(plainPostSummary(FULL).hero?.src).toBe(`/media/${HERO_KEY}`);
    // The engine's answer is never mutated in place.
    expect(FULL.hero?.src).toContain("/cdn-cgi/");
  });
});

describe("the server reads (app/lib/platform/reads.ts), through app/lib/platform/env.ts only", () => {
  it("list nothing and show the fallback profile with nothing configured, calling no engine", async () => {
    vi.stubEnv("SEO_ENGINE_URL", undefined);
    vi.stubEnv("SEO_SITE_KEY", undefined);
    const reads = await import("@/lib/platform/reads");
    await expect(reads.listPosts()).resolves.toEqual([]);
    await expect(reads.getPost(FULL.slug)).resolves.toBeNull();
    await expect(reads.listVideos()).resolves.toEqual([]);
    await expect(reads.postsOrNone()).resolves.toEqual([]);
    await expect(reads.sitemapOrNone()).resolves.toEqual([]);
    expect((await reads.getProfile()).name).toBe("Juan Ramirez");
    expect(engine.requests).toEqual([]);
  });

  it("point every engine image at /media/<key> on every host, the production host included", async () => {
    vi.stubEnv("SEO_ENGINE_URL", engine.url);
    vi.stubEnv("SEO_SITE_KEY", SITE_KEY);
    vi.stubEnv("ENGINE_WRITE_HOST", PRODUCTION_HOST);
    const reads = await import("@/lib/platform/reads");
    expect((await reads.listPosts())[0].hero?.src).toBe(`/media/${HERO_KEY}`);
    const post = await reads.getPost(FULL.slug);
    expect(post?.blocks[2]).toContain(`src="/media/${FIGURE_KEY}"`);
    expect(JSON.stringify(post)).not.toContain("/cdn-cgi/");
  });

  it("show none for the footer and the sitemap when a connected read fails, and throw for /blog", async () => {
    vi.stubEnv("SEO_ENGINE_URL", engine.url);
    vi.stubEnv("SEO_SITE_KEY", SITE_KEY);
    const reads = await import("@/lib/platform/reads");
    engine.respond("/v1/posts", { status: 500, body: "boom" });
    engine.respond("/v1/sitemap", { status: 500, body: "boom" });
    await expect(reads.listPosts()).rejects.toThrow(/500/);
    await expect(reads.postsOrNone()).resolves.toEqual([]);
    await expect(reads.sitemapOrNone()).resolves.toEqual([]);
    expect(logs.join("\n")).toMatch(/showing none/);
  });
});
