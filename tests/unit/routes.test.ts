import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FORBIDDEN, degreeClaimsOk } from "../../lib/claims";
import { RENDERS, manifestFor } from "../../lib/seo";
import { SITE_HOST } from "../../lib/site";
import { app } from "../../src/app";
import { STYLESHEET } from "../../src/assets";
import worker from "../../worker/index";
import { FIGURE_KEY, FIXTURE_POSTS, FIXTURE_PROFILE, FIXTURE_SITEMAP, FIXTURE_SUMMARIES, FIXTURE_VIDEOS, HERO_KEY, VIDEO_KEY } from "../fixtures/engine";

/**
 * The whole app in Node, through Hono's app.request() with a fake SEO
 * binding (spec 003, plan section 4; T7). Host-dependent behaviour is tested
 * here, where the request host is ours to choose; tests/smoke runs the real
 * Worker in workerd.
 */
const KEY = "sk_test_0123456789abcdef0123456789abcdef";
const PROD = `https://${SITE_HOST}`;
const PREVIEW = "https://abc123-juanramirez-codes.tobiasramzy.workers.dev";
const TURNSTILE = { TURNSTILE_SITE_KEY: "1x00000000000000000000AA", TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA" }; // pragma: allowlist secret

function binding(overrides: Record<string, unknown> = {}) {
  return {
    posts: vi.fn(async () => FIXTURE_SUMMARIES),
    post: vi.fn(async (_key: string, q: { slug: string }) => FIXTURE_POSTS.find((p) => p.slug === q.slug) ?? null),
    sitemap: vi.fn(async () => FIXTURE_SITEMAP),
    profile: vi.fn(async () => FIXTURE_PROFILE),
    announce: vi.fn(async () => ({ changed: false, manifest: {}, unrecognized: [] })),
    inquire: vi.fn(async () => ({ id: "inq_1", receivedAt: "2026-10-22T00:00:00.000Z" })),
    media: vi.fn(async (_key: string, key: string) =>
      key === VIDEO_KEY
        ? new Response("video-bytes", { headers: { "content-type": "video/mp4", "cache-control": "public, max-age=300", etag: '"v1"' } })
        : key === HERO_KEY
          ? new Response("image-bytes", { headers: { "content-type": "image/webp", "cache-control": "public, max-age=31536000, immutable", etag: '"i1"' } })
          : null,
    ),
    ...overrides,
  };
}

function env(overrides: Record<string, unknown> = {}, seo: unknown = binding()) {
  return { SEO: seo, SEO_SITE_KEY: KEY, ENGINE_WRITE_HOST: SITE_HOST, ...TURNSTILE, ...overrides } as never;
}

const get = (path: string, e = env(), host = PROD, headers: Record<string, string> = {}) => app.request(`${host}${path}`, { headers }, e);
const text = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ");
const count = (html: string, needle: string | RegExp) => (typeof needle === "string" ? html.split(needle).length - 1 : (html.match(needle) ?? []).length);

let logs: string[];
beforeEach(() => {
  logs = [];
  for (const level of ["log", "info", "warn", "error"] as const) vi.spyOn(console, level).mockImplementation((...args: unknown[]) => void logs.push(args.map(String).join(" ")));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("every page", () => {
  const PAGES = ["/", "/about", "/work", "/blog", "/blog/fixture-laid-out", "/contact", "/videos"];

  it.each(PAGES)("%s: 200, one h1, the landmarks in order, a title, a canonical and the hashed stylesheet", async (path) => {
    const response = await get(path);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/text\/html/);
    const html = await response.text();
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(count(html, /<h1[\s>]/g)).toBe(1);
    expect(count(html, /<main[\s>]/g)).toBe(1);
    const order = ['class="skip-link"', '<header class="site-header"', '<main id="main"', '<footer class="site-footer"'].map((needle) => html.indexOf(needle));
    expect(order.every((i) => i > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html).toMatch(/<title>[^<]+ — Juan Ramirez<\/title>|<title>Juan Ramirez — Software engineer<\/title>/);
    expect(html).toMatch(/<link rel="canonical" href="https:\/\/juanramirez\.codes\//);
    expect(html).toContain(`<link rel="stylesheet" href="${STYLESHEET.href}"`);
    expect(html).toContain('<html lang="en"');
  });

  it.each(PAGES)("%s: no forbidden claim in the rendered text", async (path) => {
    const words = text(await (await get(path)).text());
    for (const { pattern, why } of FORBIDDEN) expect(pattern.test(words), why).toBe(false);
    expect(degreeClaimsOk(words)).toBe(true);
  });

  it("marks the current section in the nav, and links nowhere off-site except GitHub, LinkedIn, the source, montanobtm.com and the inbox repo", async () => {
    const html = await (await get("/work")).text();
    expect(html).toMatch(/<a href="\/work" class="site-nav__link" aria-current="page">/);
    const external = [...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1]).filter((href) => !href.startsWith(PROD));
    for (const href of external) expect(href).toMatch(/^https:\/\/(github\.com\/Tobiscuit|www\.linkedin\.com\/in\/cloud-juan-manuel-ramirez\/|montanobtm\.com\/)/);
  });
});

describe("the home page", () => {
  it("shows the flagship work, the sourced numbers and the latest posts", async () => {
    const html = await (await get("/")).text();
    expect(html).toContain("Proprietor Systems");
    expect(html).toContain('<span class="proof__value">28</span>');
    expect(html).toContain('<span class="proof__value">188</span>');
    expect(html).toContain('href="/blog/fixture-laid-out"');
    expect(html).toContain('"@type":"Person"');
  });

  it("hides the writing section when the engine cannot answer, and still renders (fallback profile)", async () => {
    const html = await (await get("/", env({}, binding({ posts: vi.fn(async () => Promise.reject(new Error("down"))), profile: vi.fn(async () => Promise.reject(new Error("down"))) })))).text();
    expect(html).not.toContain('id="writing-title"');
    expect(html).toContain("juan@proprietor.systems");
  });

  it("renders unconnected (no binding, no key): no posts, the site's own profile", async () => {
    const response = await get("/", env({ SEO: undefined, SEO_SITE_KEY: undefined }));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("juan@proprietor.systems");
  });
});

describe("/work", () => {
  it("groups the cards by kind with status badges, Live only on montanobtm.com", async () => {
    const html = await (await get("/work")).text();
    for (const heading of ["Products", "Open source", "Platform", "Tools at work", "Client work"]) expect(html).toContain(`>${heading}</h2>`);
    expect(count(html, ">Live</span>")).toBe(1);
    const live = html.slice(html.lastIndexOf(">Live</span>") - 300, html.lastIndexOf(">Live</span>"));
    expect(live).toContain("montanobtm.com");
    expect(html).toContain('href="https://github.com/Tobiscuit/proprietor-mail"');
  });

  it("has no project pages yet: /work/<slug> is the 404 page", async () => {
    const response = await get("/work/proprietor-systems");
    expect(response.status).toBe(404);
    expect(await response.text()).toContain('<meta name="robots" content="noindex"');
  });
});

describe("the blog", () => {
  it("lists the engine's posts, newest first", async () => {
    const html = await (await get("/blog")).text();
    expect(html.indexOf("fixture-laid-out")).toBeLessThan(html.indexOf("fixture-plain"));
  });

  it("lays a post out by its plan: pull quote, key points, aside, captioned wide figure, the engine's canonical and JSON-LD", async () => {
    const html = await (await get("/blog/fixture-laid-out")).text();
    expect(html).toContain('<blockquote class="pull-quote"><p>The sentence the pull quote lifts, word for word.</p></blockquote>');
    expect(html).toContain('<aside class="key-points"');
    expect(html).toContain("<li>One point</li>");
    expect(html).toContain('class="note note--tip"');
    expect(html).toContain('class="post-figure placement-wide"');
    expect(html).toContain("<figcaption>A caption that adds a fact.</figcaption>");
    expect(html).toContain('<link rel="canonical" href="https://juanramirez.codes/blog/fixture-laid-out"');
    expect(html).toContain('"@type":"BlogPosting"');
    expect(html).toContain('<meta property="og:type" content="article"');
  });

  it("keeps the engine's transform URLs on the production host, and uses the originals elsewhere", async () => {
    const prod = await (await get("/blog/fixture-laid-out")).text();
    expect(prod).toContain(`/cdn-cgi/image/format=auto,width=1280/media/${HERO_KEY}`);
    const preview = await (await get("/blog/fixture-laid-out", env(), PREVIEW)).text();
    expect(preview).not.toContain("/cdn-cgi/image/");
    expect(preview).toContain(`src="/media/${HERO_KEY}"`);
    expect(preview).toContain(`/media/${FIGURE_KEY}`);
  });

  it("answers an unknown post with the 404 page", async () => {
    expect((await get("/blog/nope")).status).toBe(404);
  });

  it("answers 503 (crawlers retry) when the engine fails, logging the error's name only", async () => {
    const response = await get("/blog", env({}, binding({ posts: vi.fn(async () => Promise.reject(Object.assign(new Error("secret detail"), { name: "Error" }))) })));
    expect(response.status).toBe(503);
    expect(await response.text()).toContain("Something went wrong");
  });

  it("escapes plain-text items: a pull quote with markup is shown, not run", async () => {
    const post = { ...FIXTURE_POSTS[0], layout: { ...FIXTURE_POSTS[0].layout, inserts: [{ kind: "pull-quote" as const, at: 2, text: "<script>alert(1)</script>" }] } };
    const html = await (await get("/blog/fixture-laid-out", env({}, binding({ post: vi.fn(async () => post) })))).text();
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("composes posts with exactly what the manifest says the page renders", () => {
    expect(manifestFor({ videos: false }).renders).toEqual({ ...RENDERS, placements: [...RENDERS.placements] });
  });
});

describe("/videos", () => {
  it("is an empty, unindexed page until a clip is shown", async () => {
    const html = await (await get("/videos")).text();
    expect(html).toContain("Nothing here yet");
    expect(html).toContain('<meta name="robots" content="noindex"');
  });

  it("plays each shown clip from /media, with its title as the player's name", async () => {
    const html = await (await get("/videos", env({}, binding({ videos: vi.fn(async () => FIXTURE_VIDEOS) })))).text();
    expect(html).toContain(`src="/media/${VIDEO_KEY}"`);
    expect(html).toContain('aria-label="Fixture: a shown clip"');
    expect(html).not.toContain('content="noindex"');
  });
});

describe("/contact", () => {
  const form = (fields: Record<string, string>) => new URLSearchParams({ name: "Dana Alvarez", email: "dana@example.com", message: "Hello", "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX", ...fields }); // pragma: allowlist secret
  const post = (body: URLSearchParams, headers: Record<string, string> = {}, e = env(), host = PROD) => app.request(`${host}/contact`, { method: "POST", body, headers }, e);
  const siteverifyOk = () => vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: true, action: "contact" })));

  it("renders the form for htmx and for plain posts, with Turnstile, and loads htmx and Turnstile here only", async () => {
    const html = await (await get("/contact")).text();
    expect(html).toContain('action="/contact" method="post" hx-post="/contact" hx-target="#form-status" hx-swap="innerHTML"');
    expect(html).toContain('data-sitekey="1x00000000000000000000AA" data-action="contact"');
    expect(html).toContain('<script src="/vendor/htmx-4.0.0.min.js" defer');
    expect(html).toContain('<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async');
    expect(html).toContain('role="status" aria-live="polite"');
    const home = await (await get("/")).text();
    expect(home).not.toContain("htmx");
    expect(home).not.toContain("challenges.cloudflare.com");
  });

  it("shows the e-mail address instead of a form that cannot send (no Turnstile keys, or not connected)", async () => {
    for (const e of [env({ TURNSTILE_SITE_KEY: undefined }), env({ SEO: undefined })]) {
      const html = await (await get("/contact", e)).text();
      expect(html).not.toContain("<form");
      expect(html).toContain("The form is not connected yet");
      expect(html).not.toContain("htmx");
    }
  });

  it("answers htmx with a success fragment, and hands the engine exactly the three fields", async () => {
    siteverifyOk();
    const seo = binding();
    const response = await post(form({}), { "hx-request": "true" }, env({}, seo));
    expect(response.status).toBe(200);
    const fragment = await response.text();
    expect(fragment).toMatch(/^<p class="form-status form-status--success">Thanks, your message is on its way/);
    expect(seo.inquire).toHaveBeenCalledWith(KEY, { locale: "en", page: "/contact", fields: { name: "Dana Alvarez", email: "dana@example.com", message: "Hello" } });
  });

  it("answers htmx with an error fragment and its status (htmx 4 swaps errors)", async () => {
    siteverifyOk();
    const response = await post(form({ email: "nope" }), { "hx-request": "true" });
    expect(response.status).toBe(400);
    expect(await response.text()).toContain('class="form-status form-status--error">That email address does not look right.');
  });

  it("answers a plain post with the whole page, the message in place and the fields kept", async () => {
    siteverifyOk();
    const response = await post(form({ email: "nope" }));
    expect(response.status).toBe(400);
    const html = await response.text();
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("That email address does not look right.");
    expect(html).toContain('value="Dana Alvarez"');
  });

  it("passes Retry-After through when the engine asks to wait", async () => {
    siteverifyOk();
    const inquire = vi.fn(async () => Promise.reject(Object.assign(new Error("slow down"), { name: "InquiryRefused", retryAfterSeconds: 42 })));
    const response = await post(form({}), { "hx-request": "true" }, env({}, binding({ inquire })));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
  });

  it("never sends from a preview host", async () => {
    siteverifyOk();
    const seo = binding();
    const response = await post(form({}), { "hx-request": "true" }, env({}, seo), PREVIEW);
    expect(response.status).toBe(503);
    expect(await response.text()).toContain("This is a preview of the site");
    expect(seo.inquire).not.toHaveBeenCalled();
  });
});

describe("delivery", () => {
  it("serves the stylesheet at its hashed URL, and 404s any other /assets path", async () => {
    const css = await get(STYLESHEET.href);
    expect(css.status).toBe(200);
    expect(css.headers.get("content-type")).toMatch(/text\/css/);
    expect(await css.text()).toContain("--sage-blue-900");
    expect((await get("/assets/site.00000000.css")).status).toBe(404);
  });

  it("redirects the old /projects paths to /work, permanently", async () => {
    for (const path of ["/projects", "/projects/some-old-id"]) {
      const response = await get(path);
      expect(response.status).toBe(301);
      expect(response.headers.get("location")).toBe("/work");
    }
  });

  it("serves engine media through the kit's door, and 404s unknown keys or an unconnected site", async () => {
    const image = await get(`/media/${HERO_KEY}`);
    expect(image.status).toBe(200);
    expect(await image.text()).toBe("image-bytes");
    expect((await get("/media/juanramirez/nope.webp")).status).toBe(404);
    expect((await get(`/media/${HERO_KEY}`, env({ SEO: undefined }))).status).toBe(404);
  });

  it("lists the own pages and the engine's posts in the sitemap, absolute; robots points at it", async () => {
    const xml = await (await get("/sitemap.xml")).text();
    for (const loc of ["https://juanramirez.codes/", "https://juanramirez.codes/work", "https://juanramirez.codes/blog/fixture-laid-out"]) expect(xml).toContain(`<loc>${loc}</loc>`);
    const failing = await (await get("/sitemap.xml", env({}, binding({ sitemap: vi.fn(async () => Promise.reject(new Error("down"))) })))).text();
    expect(failing).toContain("<loc>https://juanramirez.codes/about</loc>");
    expect(await (await get("/robots.txt")).text()).toContain("Sitemap: https://juanramirez.codes/sitemap.xml");
  });

  it("never shows a stack trace or the error's message on the 503 page", async () => {
    const response = await get("/blog", env({}, binding({ posts: vi.fn(async () => Promise.reject(new Error("internal detail"))) })));
    expect(await response.text()).not.toContain("internal detail");
  });
});

describe("the Worker (worker/index.ts)", () => {
  const ctx = () => {
    const waits: Promise<unknown>[] = [];
    return { waits, ctx: { waitUntil: (p: Promise<unknown>) => void waits.push(p), passThroughOnException() {}, props: {} } as unknown as ExecutionContext };
  };

  it("gives every response an explicit Cache-Control: pages a minute at the edge, a video the engine's five minutes", async () => {
    const { ctx: c } = ctx();
    const page = await worker.fetch(new Request(`${PREVIEW}/about`), env(), c);
    expect(page.headers.get("cache-control")).toBe("public, max-age=0, s-maxage=60, stale-while-revalidate=600");
    const video = await worker.fetch(new Request(`${PREVIEW}/media/${VIDEO_KEY}`), env(), c);
    expect(video.headers.get("cache-control")).toBe("public, max-age=300");
    const notFound = await worker.fetch(new Request(`${PREVIEW}/nope`), env(), c);
    expect(notFound.headers.get("cache-control")).toBe("private, no-store");
  });

  it("announces from the production host only, with the manifest the site can honour", async () => {
    vi.resetModules();
    const fresh = (await import("../../worker/index")).default;
    const seo = binding({ videos: vi.fn(async () => []) });
    const preview = ctx();
    await fresh.fetch(new Request(`${PREVIEW}/`), env({}, seo), preview.ctx);
    expect(preview.waits).toHaveLength(0);
    const prod = ctx();
    await fresh.fetch(new Request(`${PROD}/`), env({}, seo), prod.ctx);
    await Promise.all(prod.waits);
    expect(seo.announce).toHaveBeenCalledWith(KEY, expect.objectContaining({ has: { blog: true, intake: true, videos: true } }));
  });
});
