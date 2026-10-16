import type { Metadata } from "next";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { FIGURE_KEY, FIXTURE_POSTS, HERO_KEY, ORIGIN, POST_WORDS } from "./fixtures";
import { SITE_KEY, startStubEngine, type StubEngine } from "./stub-engine";

// A2: /blog and /blog/<slug> (specs/002-proprietor-adoption/tasks.md), rendered
// by awaiting the server component and renderToStaticMarkup, against the stub
// over the kit's http(). The environment reaches the pages only through
// app/lib/platform/env.ts, so the tests set it there.

const state = vi.hoisted(() => ({ env: {} as Record<string, unknown> }));
vi.mock("@/lib/platform/env", () => ({ platformEnv: () => state.env }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

let engine: StubEngine;
beforeAll(async () => {
  engine = await startStubEngine();
});
afterAll(async () => {
  await engine.close();
});
beforeEach(() => {
  engine.reset();
  state.env = {};
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

const connect = () => {
  state.env = { SEO_ENGINE_URL: engine.url, SEO_SITE_KEY: SITE_KEY };
};
const [FULL, PLAIN] = FIXTURE_POSTS;
const count = (html: string, needle: string) => html.split(needle).length - 1;

async function blogIndex(): Promise<{ html: string; metadata: Metadata }> {
  const page = await import("../app/(app)/blog/page");
  return { metadata: await page.generateMetadata(), html: renderToStaticMarkup(await page.default()) };
}

async function blogPost(slug: string): Promise<{ html: string; metadata: Metadata }> {
  const page = await import("../app/(app)/blog/[slug]/page");
  const props = { params: Promise.resolve({ slug }) };
  return { metadata: await page.generateMetadata(props), html: renderToStaticMarkup(await page.default(props)) };
}

describe("/blog with the platform unconfigured", () => {
  it("renders its empty state with one <h1>, and asks not to be indexed", async () => {
    const { html, metadata } = await blogIndex();
    expect(count(html, "<h1")).toBe(1);
    expect(html).toContain("No posts yet.");
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe(`${ORIGIN}/blog`);
    expect(metadata.title).toBe("Blog | Juan Ramirez");
  });

  it("answers 404 for any post", async () => {
    await expect(blogPost(FULL.slug)).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("/blog with the platform connected", () => {
  it("lists the posts newest first, each linking to its engine path, with pictures on /media", async () => {
    connect();
    const { html, metadata } = await blogIndex();
    expect(count(html, "<h1")).toBe(1);
    expect(metadata.robots).toBeUndefined();
    const hrefs = Array.from(html.matchAll(/<a href="(\/blog\/[^"]+)"/g), (m) => m[1]);
    expect(hrefs).toEqual([FULL.path, PLAIN.path]);
    expect(html.indexOf(FULL.title)).toBeLessThan(html.indexOf(PLAIN.title));
    expect(html).toContain(`src="/media/${HERO_KEY}"`);
    expect(html).not.toContain("/cdn-cgi/");
    expect(html).toContain(`dateTime="${FULL.publishedAt}"`);
  });

  it("answers 5xx (a thrown error) when the list read fails", async () => {
    connect();
    engine.respond("/v1/posts", { status: 500, body: "boom" });
    await expect(blogIndex()).rejects.toThrow(/500/);
  });
});

describe("/blog/<slug> with the platform connected", () => {
  it("has the engine's head: canonical, one hreflang per locale plus x-default, the title with the owner's name", async () => {
    connect();
    const { metadata } = await blogPost(FULL.slug);
    expect(metadata.title).toBe(`${FULL.title} | Juan Ramirez`);
    expect(metadata.description).toBe(FULL.excerpt);
    expect(metadata.alternates?.canonical).toBe(FULL.canonical);
    expect(metadata.alternates?.languages).toEqual({ en: FULL.canonical, "x-default": FULL.canonical });
    const og = metadata.openGraph as { url?: string; images?: { url: string }[] } | undefined;
    expect(og?.url).toBe(FULL.canonical);
    expect(og?.images?.[0].url).toBe(`${ORIGIN}/media/${HERO_KEY}`);
  });

  it("renders one <h1>, the JSON-LD, and every compose() item kind the manifest declares", async () => {
    connect();
    const { html } = await blogPost(FULL.slug);
    expect(count(html, "<h1")).toBe(1);

    // opening: hero-inset, the excerpt and the date
    expect(html).toContain(`<h1 class="font-serif text-parchment-100">${FULL.title}</h1>`);
    expect(html).toContain(POST_WORDS.excerpt);
    expect(html).toContain(`src="/media/${HERO_KEY}"`);
    // html: the body blocks as the engine filtered them
    expect(html).toContain(`<h2>${POST_WORDS.h2}</h2>`);
    expect(html).toContain(`<p>${POST_WORDS.closingPara}</p>`);
    // figure: inset-right, its caption, its picture on /media
    expect(html).toMatch(/data-placement="inset-right"/);
    expect(html).toContain(`src="/media/${FIGURE_KEY}"`);
    expect(html).toContain(POST_WORDS.caption);
    // pull-quote, key-points, aside
    expect(html).toMatch(new RegExp(`<blockquote[^>]*><p>${POST_WORDS.pullQuote.replace(/'/g, "&#x27;")}</p></blockquote>`));
    for (const point of POST_WORDS.points) expect(html).toContain(`<li>${point.replace(/'/g, "&#x27;")}</li>`);
    expect(html).toContain("Key points");
    expect(html).toContain("Tip");
    expect(html).toContain(POST_WORDS.aside.replace(/'/g, "&#x27;"));
    // closing: read-more
    expect(html).toMatch(/<a [^>]*href="\/blog"[^>]*>More posts<\/a>/);

    // the engine's structured data, its picture on /media, and nothing transform-shaped anywhere
    const ld = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
    expect(ld).not.toBeNull();
    expect(JSON.parse(ld![1])).toMatchObject({ "@type": "BlogPosting", headline: FULL.title, image: `${ORIGIN}/media/${HERO_KEY}` });
    expect(html).not.toContain("/cdn-cgi/");
  });

  it("renders a post with the neutral plan: a statement opening, no picture, no closing", async () => {
    connect();
    const { html } = await blogPost(PLAIN.slug);
    expect(count(html, "<h1")).toBe(1);
    expect(html).toContain(PLAIN.excerpt);
    expect(html).not.toContain("<img");
    expect(html).not.toContain("More posts");
  });

  it("answers 404 for an unknown slug", async () => {
    connect();
    await expect(blogPost("no-such-post")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("answers 5xx, never 404, when the single read fails", async () => {
    connect();
    engine.respond(`/v1/posts/en/${FULL.slug}`, { status: 500, body: "D1_ERROR" });
    const error = await blogPost(FULL.slug).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/500/);
    expect((error as Error).message).not.toBe("NEXT_NOT_FOUND");
  });
});
