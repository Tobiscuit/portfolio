import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { plainPost, plainPostSummary, withoutTransforms } from "../../lib/platform/images";
import { readPost, readPosts, readProfile, readSitemap } from "../../lib/platform/reads";
import { canReadVideos, readVideos } from "../../lib/platform/videos";
import { FALLBACK_PROFILE } from "../../lib/site";
import { FIGURE_KEY, FIXTURE_POSTS, FIXTURE_PROFILE, FIXTURE_SITEMAP, FIXTURE_SUMMARIES, FIXTURE_VIDEOS, HERO_KEY } from "../fixtures/engine";

/**
 * The platform reads (spec 003, domain-model section 4; T3). Adapted from PR
 * #4's test/platform.test.ts: the transport here is the kit's rpc() over a
 * fake binding (an object with the Sites methods), since the engine has no
 * public address.
 */
const KEY = "sk_test_0123456789abcdef0123456789abcdef";

function binding(overrides: Record<string, unknown> = {}) {
  return {
    posts: vi.fn(async () => FIXTURE_SUMMARIES),
    post: vi.fn(async (_key: string, q: { slug: string }) => FIXTURE_POSTS.find((p) => p.slug === q.slug) ?? null),
    sitemap: vi.fn(async () => FIXTURE_SITEMAP),
    profile: vi.fn(async () => FIXTURE_PROFILE),
    ...overrides,
  };
}

let logs: string[];
beforeEach(() => {
  logs = [];
  for (const level of ["log", "info", "warn", "error"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => void logs.push(args.map(String).join(" ")));
  }
});
afterEach(() => vi.restoreAllMocks());

describe("posts", () => {
  it("are [] when the site is not connected (no binding, or no key), and say so without the key", async () => {
    await expect(readPosts({})).resolves.toEqual([]);
    await expect(readPosts({ SEO: binding() })).resolves.toEqual([]);
    await expect(readPosts({ SEO: binding(), SEO_SITE_KEY: "pk_not_a_site_key" })).resolves.toEqual([]);
    expect(logs.join("\n")).toMatch(/not connected/);
    expect(logs.join("\n")).not.toContain("pk_not_a_site_key");
  });

  it("are the engine's, newest first, in the site's one locale", async () => {
    const seo = binding();
    const posts = await readPosts({ SEO: seo, SEO_SITE_KEY: KEY });
    expect(posts.map((p) => p.slug)).toEqual(["fixture-laid-out", "fixture-plain"]);
    expect(seo.posts).toHaveBeenCalledWith(KEY, { locale: "en" });
  });

  it("let a failed read through when connected (a 5xx for /blog, never a silent empty list)", async () => {
    const seo = binding({ posts: vi.fn(async () => Promise.reject(new Error("engine down"))) });
    await expect(readPosts({ SEO: seo, SEO_SITE_KEY: KEY })).rejects.toThrow(/engine down/);
  });

  it("drop a listed post whose shape is wrong, and say so", async () => {
    const seo = binding({ posts: vi.fn(async () => [FIXTURE_SUMMARIES[0], { slug: "broken" }]) });
    const posts = await readPosts({ SEO: seo, SEO_SITE_KEY: KEY });
    expect(posts).toHaveLength(1);
    expect(logs.join("\n")).toMatch(/dropped 1/);
  });

  it("refuse a post answer that is not a list", async () => {
    const seo = binding({ posts: vi.fn(async () => ({ nope: true })) });
    await expect(readPosts({ SEO: seo, SEO_SITE_KEY: KEY })).rejects.toThrow(/not a list/);
  });

  it("never accept a post path that points off the site", async () => {
    const seo = binding({ posts: vi.fn(async () => [{ ...FIXTURE_SUMMARIES[0], path: "//evil.example/x" }]) });
    await expect(readPosts({ SEO: seo, SEO_SITE_KEY: KEY })).resolves.toEqual([]);
  });

  it("point images at the stored originals when asked (off the production host)", async () => {
    const posts = await readPosts({ SEO: binding(), SEO_SITE_KEY: KEY }, { originals: true });
    expect(posts[0].hero?.src).toBe(`/media/${HERO_KEY}`);
    const kept = await readPosts({ SEO: binding(), SEO_SITE_KEY: KEY });
    expect(kept[0].hero?.src).toMatch(/^\/cdn-cgi\/image\//);
  });
});

describe("one post", () => {
  it("is the engine's, null for an unknown slug, and null when unconnected", async () => {
    const env = { SEO: binding(), SEO_SITE_KEY: KEY };
    await expect(readPost(env, "fixture-plain")).resolves.toMatchObject({ slug: "fixture-plain" });
    await expect(readPost(env, "nope")).resolves.toBeNull();
    await expect(readPost({}, "fixture-plain")).resolves.toBeNull();
  });

  it("throws (a 5xx, not a broken page) when the answer is not a Post", async () => {
    const seo = binding({ post: vi.fn(async () => ({ slug: "x" })) });
    await expect(readPost({ SEO: seo, SEO_SITE_KEY: KEY }, "x")).rejects.toThrow(/not a Post/);
  });

  it("agrees with the site's routing: the engine's first locale is the site's default (the kit's rule)", async () => {
    const post = await readPost({ SEO: binding(), SEO_SITE_KEY: KEY }, "fixture-laid-out");
    expect(post?.locales[0]).toBe("en");
    expect(post?.path).toBe("/blog/fixture-laid-out");
  });
});

describe("the sitemap", () => {
  it("is the engine's entries, [] when unconnected", async () => {
    await expect(readSitemap({ SEO: binding(), SEO_SITE_KEY: KEY })).resolves.toEqual(FIXTURE_SITEMAP);
    await expect(readSitemap({})).resolves.toEqual([]);
  });
});

describe("the profile", () => {
  it("is the fallback when unconnected, and never throws", async () => {
    await expect(readProfile({})).resolves.toEqual(FALLBACK_PROFILE);
    const failing = binding({ profile: vi.fn(async () => Promise.reject(new Error("down"))) });
    await expect(readProfile({ SEO: failing, SEO_SITE_KEY: KEY })).resolves.toEqual(FALLBACK_PROFILE);
    const malformed = binding({ profile: vi.fn(async () => ({ name: "" })) });
    await expect(readProfile({ SEO: malformed, SEO_SITE_KEY: KEY })).resolves.toEqual(FALLBACK_PROFILE);
  });

  it("is the engine's when connected", async () => {
    await expect(readProfile({ SEO: binding(), SEO_SITE_KEY: KEY })).resolves.toEqual(FIXTURE_PROFILE);
  });
});

describe("images (lib/platform/images.ts)", () => {
  it("rewrite every transform URL to /media/<key>, root-relative or absolute", () => {
    expect(withoutTransforms(`/cdn-cgi/image/format=auto,width=768/media/${HERO_KEY}`)).toBe(`/media/${HERO_KEY}`);
    expect(withoutTransforms(`https://juanramirez.codes/cdn-cgi/image/width=1/media/${HERO_KEY}`)).toBe(`https://juanramirez.codes/media/${HERO_KEY}`);
  });

  it("rewrite a post's hero, html, blocks and JSON-LD; a post without a hero keeps null", () => {
    const post = plainPost(FIXTURE_POSTS[0]);
    expect(post.hero?.src).toBe(`/media/${HERO_KEY}`);
    expect(post.hero?.srcset).not.toContain("/cdn-cgi/");
    expect(post.html).toContain(`/media/${FIGURE_KEY}`);
    expect(post.html).not.toContain("/cdn-cgi/");
    expect(post.blocks.join("")).not.toContain("/cdn-cgi/");
    expect(JSON.stringify(post.jsonLd)).not.toContain("/cdn-cgi/");
    expect(plainPostSummary(FIXTURE_SUMMARIES[1]).hero).toBeNull();
  });
});

describe("videos (the shim, spec 003 R4)", () => {
  it("come from the client's videos() when the kit has it (0.7.0)", async () => {
    const client = { videos: vi.fn(async () => FIXTURE_VIDEOS) };
    await expect(readVideos({ SEO: binding(), SEO_SITE_KEY: KEY }, client)).resolves.toEqual(FIXTURE_VIDEOS);
  });

  it("else from the binding's videos(siteKey) (engine spec 028, kit 0.6.2)", async () => {
    const videos = vi.fn(async () => FIXTURE_VIDEOS);
    await expect(readVideos({ SEO: binding({ videos }), SEO_SITE_KEY: KEY })).resolves.toEqual(FIXTURE_VIDEOS);
    expect(videos).toHaveBeenCalledWith(KEY);
  });

  it("else []: a binding without videos, no binding, or no key", async () => {
    await expect(readVideos({ SEO: binding(), SEO_SITE_KEY: KEY })).resolves.toEqual([]);
    await expect(readVideos({})).resolves.toEqual([]);
    await expect(readVideos({ SEO: binding({ videos: vi.fn() }) })).resolves.toEqual([]);
  });

  it("keep only well-shaped clips with on-site paths, and are [] (logged, never thrown) when the read fails", async () => {
    const odd = vi.fn(async () => [...FIXTURE_VIDEOS, { ...FIXTURE_VIDEOS[0], id: "x", src: "https://elsewhere.example/a.mp4" }, { id: "" }]);
    await expect(readVideos({ SEO: binding({ videos: odd }), SEO_SITE_KEY: KEY })).resolves.toEqual(FIXTURE_VIDEOS);
    const failing = vi.fn(async () => Promise.reject(new Error("refused")));
    await expect(readVideos({ SEO: binding({ videos: failing }), SEO_SITE_KEY: KEY })).resolves.toEqual([]);
    const nonsense = vi.fn(async () => "nope");
    await expect(readVideos({ SEO: binding({ videos: nonsense }), SEO_SITE_KEY: KEY })).resolves.toEqual([]);
  });

  it("canReadVideos says whether any source exists (what the manifest declares)", () => {
    expect(canReadVideos({ SEO: binding({ videos: vi.fn() }), SEO_SITE_KEY: KEY })).toBe(true);
    expect(canReadVideos({ SEO: binding(), SEO_SITE_KEY: KEY })).toBe(false);
    expect(canReadVideos({})).toBe(false);
  });
});
