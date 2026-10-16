import type { Metadata } from "next";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { FIXTURE_VIDEOS, ORIGIN } from "./fixtures";
import { SITE_KEY, startStubEngine, type StubEngine } from "./stub-engine";

// A4: /videos and the nav's "Videos" (specs/002-proprietor-adoption/tasks.md).
// The cuts come through the shim (app/lib/platform/videos.ts): a binding with
// videos() here; kit 0.6.2's http(), the production transport, has none.

const state = vi.hoisted(() => ({ env: {} as Record<string, unknown> }));
vi.mock("@/lib/platform/env", () => ({ platformEnv: () => state.env }));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

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

/** engine spec 028 over a service binding, read with kit 0.6.2. */
const withBinding = () => {
  state.env = { SEO: { videos: vi.fn(async () => FIXTURE_VIDEOS) }, SEO_SITE_KEY: SITE_KEY };
};
const overHttp = () => {
  state.env = { SEO_ENGINE_URL: engine.url, SEO_SITE_KEY: SITE_KEY };
};
const count = (html: string, needle: string) => html.split(needle).length - 1;

async function videosPage(): Promise<{ html: string; metadata: Metadata }> {
  const page = await import("../app/(app)/videos/page");
  return { metadata: await page.generateMetadata(), html: renderToStaticMarkup(await page.default()) };
}

describe("/videos", () => {
  it("unconfigured: renders its empty state with one <h1>, no player, and asks not to be indexed", async () => {
    const { html, metadata } = await videosPage();
    expect(count(html, "<h1")).toBe(1);
    expect(html).toContain("No videos yet.");
    expect(html).not.toContain("<video");
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe(`${ORIGIN}/videos`);
  });

  it("over kit 0.6.2's http(): empty and not indexed, without asking the engine for videos", async () => {
    overHttp();
    const { html, metadata } = await videosPage();
    expect(html).toContain("No videos yet.");
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(engine.requests.map((r) => r.path)).not.toContain("/v1/videos");
  });

  it("with a binding that has videos: one player per cut, newest first, with controls, preload=metadata, title and duration", async () => {
    withBinding();
    const { html, metadata } = await videosPage();
    expect(metadata.robots).toBeUndefined();
    expect(metadata.title).toBe("Videos | Juan Ramirez");
    expect(count(html, "<h1")).toBe(1);
    expect(count(html, "<video")).toBe(2);
    expect(count(html, 'controls=""')).toBe(2);
    expect(count(html, 'preload="metadata"')).toBe(2);
    for (const video of FIXTURE_VIDEOS) expect(html).toContain(`<source src="${video.src}" type="video/mp4"/>`);
    expect(html.indexOf(FIXTURE_VIDEOS[0].title)).toBeLessThan(html.indexOf(FIXTURE_VIDEOS[1].title));
    expect(html).toMatch(/<time dateTime="PT92S"[^>]*>1:32<\/time>/);
    expect(html).toMatch(/<time dateTime="PT41S"[^>]*>0:41<\/time>/);
    expect(html).toMatch(/data-format="portrait"/);
  });
});

describe('the nav\'s "Videos"', () => {
  async function header(showVideos?: boolean): Promise<string> {
    const { default: Header } = await import("../app/components/Header");
    return renderToStaticMarkup(createElement(Header, showVideos === undefined ? {} : { showVideos }));
  }

  it("is in the nav only when the server says there are videos; Blog always is, and Work stays on /projects", async () => {
    for (const html of [await header(), await header(false)]) {
      expect(html).not.toContain('href="/videos"');
      expect(html).toContain('href="/blog"');
      expect(html).toContain('href="/projects"');
    }
    const shown = await header(true);
    expect(shown).toContain('href="/videos"');
    expect(count(shown, 'href="/videos"')).toBe(2); // the desktop nav and the mobile menu
  });

  it("is flagged by showVideosInNav(): true only when the list has a cut", async () => {
    const { showVideosInNav } = await import("../app/components/platform/nav");
    await expect(showVideosInNav()).resolves.toBe(false);
    overHttp();
    await expect(showVideosInNav()).resolves.toBe(false);
    withBinding();
    await expect(showVideosInNav()).resolves.toBe(true);
  });
});
