import { renderToStaticMarkup } from "react-dom/server";
import { render } from "../tests/helpers";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { FIXTURE_POSTS, FIXTURE_PROFILE, FIXTURE_SITEMAP, FIXTURE_VIDEOS, fixtureSummaries, ORIGIN } from "./fixtures";
import { SITE_KEY, startStubEngine, type StubEngine } from "./stub-engine";

// A5: the footer's profile, /sitemap.xml and /robots.txt
// (specs/002-proprietor-adoption/tasks.md). Projects stay Payload's (D1): the
// sitemap lists them through the existing getProjects(), which here answers
// its hard-coded data, as it does whenever Payload is off.

const state = vi.hoisted(() => ({ env: {} as Record<string, unknown>, projectsFail: false }));
vi.mock("@/lib/platform/env", () => ({ platformEnv: () => state.env }));
vi.mock("@/lib/getProjects", () => ({
  getProjects: async () => {
    if (state.projectsFail) throw new Error("payload down");
    return (await import("../app/lib/project-data")).projects;
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
  state.projectsFail = false;
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const connect = () => {
  state.env = { SEO_ENGINE_URL: engine.url, SEO_SITE_KEY: SITE_KEY };
};

async function footer(): Promise<string> {
  const { default: Footer } = await import("../app/components/Footer");
  // SiteFooter's links are TransitionLinks, which need the App Router mounted.
  return render(await Footer());
}

describe("the footer", () => {
  it("shows the fallback profile when unconfigured: the name, the contact page's email, LinkedIn and GitHub", async () => {
    const html = await footer();
    expect(html).toContain("<footer");
    expect(html).toContain("Juan Ramirez");
    expect(html).toContain('href="mailto:jramirez203@outlook.com"');
    expect(html).toContain('href="https://www.linkedin.com/in/cloud-juan-manuel-ramirez/"');
    expect(html).toContain('href="https://github.com/Tobiscuit"');
  });

  it("shows the engine's profile when connected, and the fallback when the read fails", async () => {
    connect();
    expect(await footer()).toContain('href="mailto:hello@jrcodex.dev"');
    engine.respond("/v1/profile", { status: 500, body: "boom" });
    vi.resetModules();
    expect(await footer()).toContain('href="mailto:jramirez203@outlook.com"');
  });

  it("leaves the email out when the profile has none", async () => {
    connect();
    engine.respond("/v1/profile", {
      status: 200,
      body: JSON.stringify({ name: "Juan Ramirez", telephone: null, email: null, address: null, social: {}, serviceArea: [], team: "solo", hours: null, updatedAt: "2026-10-16T00:00:00.000Z" }),
      headers: { "content-type": "application/json" },
    });
    const html = await footer();
    expect(html).not.toContain("mailto:");
    expect(html).toContain("LinkedIn");
  });
});

describe("/sitemap.xml", () => {
  const sitemap = async () => (await import("../app/sitemap")).default();
  const urls = async () => (await sitemap()).map((entry) => entry.url);
  const OWN = [`${ORIGIN}/`, `${ORIGIN}/about`, `${ORIGIN}/contact`, `${ORIGIN}/projects`];
  const PROJECTS = Array.from({ length: 9 }, (_, i) => `${ORIGIN}/projects/${i + 1}`);

  it("unconfigured: the site's own pages and its projects, nothing else", async () => {
    expect(await urls()).toEqual([...OWN, ...PROJECTS]);
  });

  it("connected: also /blog and every post, absolute on the canonical origin with the engine's dates and alternates", async () => {
    connect();
    const entries = await sitemap();
    expect(entries.map((e) => e.url)).toEqual([...OWN, ...PROJECTS, `${ORIGIN}/blog`, ...FIXTURE_POSTS.map((p) => `${ORIGIN}${p.path}`)]);
    const post = entries.find((e) => e.url === `${ORIGIN}${FIXTURE_POSTS[0].path}`);
    expect(post?.lastModified).toBe(FIXTURE_POSTS[0].publishedAt);
    expect(post?.alternates?.languages).toEqual({ en: `${ORIGIN}${FIXTURE_POSTS[0].path}` });
  });

  it("never lists videos, even when the owner shows some (over a binding that answers them)", async () => {
    const seo = {
      posts: async () => fixtureSummaries("en"),
      sitemap: async () => FIXTURE_SITEMAP,
      profile: async () => FIXTURE_PROFILE,
      videos: vi.fn(async () => FIXTURE_VIDEOS),
    };
    state.env = { SEO: seo, SEO_SITE_KEY: SITE_KEY };
    const entries = await urls();
    expect(entries).toContain(`${ORIGIN}${FIXTURE_POSTS[0].path}`);
    expect(entries.some((url) => url.includes("/videos") || url.includes("/media/"))).toBe(false);
  });

  it("still answers, with the site's own pages and projects, when the engine fails", async () => {
    connect();
    engine.respond("/v1/posts", { status: 500, body: "boom" });
    engine.respond("/v1/sitemap", { status: 500, body: "boom" });
    expect(await urls()).toEqual([...OWN, ...PROJECTS]);
  });

  it("still answers, without the project pages, when getProjects() fails", async () => {
    connect();
    state.projectsFail = true;
    expect(await urls()).toEqual([...OWN, `${ORIGIN}/blog`, ...FIXTURE_POSTS.map((p) => `${ORIGIN}${p.path}`)]);
  });
});

describe("/robots.txt", () => {
  it("lets everything public be crawled, keeps crawlers out of Payload's admin and the APIs, and names the sitemap", async () => {
    const { default: robots } = await import("../app/robots");
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
      sitemap: `${ORIGIN}/sitemap.xml`,
    });
  });
});
