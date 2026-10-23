import { describe, expect, it } from "vitest";

import { CACHE_CONTROL, cachePolicy, withCachePolicy } from "../../lib/cache-policy";

/** One test per row of specs/003-juanramirez-codes/plan.md, section 3. */
const req = (path: string, init?: RequestInit) => new Request(`https://juanramirez.codes${path}`, init);
const res = (status: number, headers: Record<string, string> = {}, body: BodyInit | null = "x") =>
  new Response(status === 304 ? null : body, { status, headers });
const html = { "content-type": "text/html; charset=utf-8" };

describe("cachePolicy", () => {
  it("never stores a write or a response that sets a cookie", () => {
    expect(cachePolicy(req("/contact", { method: "POST" }), res(200, html))).toBe("private");
    expect(cachePolicy(req("/"), res(200, { ...html, "set-cookie": "a=b" }))).toBe("private");
  });

  it("never stores an API route", () => {
    expect(cachePolicy(req("/api/inquiries"), res(200, { "content-type": "application/json" }))).toBe("private");
    expect(cachePolicy(req("/api"), res(404))).toBe("private");
  });

  it("keeps a shown video's own header: the engine's max-age=300, never immutable", () => {
    const video = req("/media/juanramirez/video/renders/abc.mp4");
    const answer = res(200, { "content-type": "video/mp4", "cache-control": "public, max-age=300" });
    expect(cachePolicy(video, answer)).toBe("upstream");
    const out = withCachePolicy(video, answer);
    expect(out.headers.get("cache-control")).toBe("public, max-age=300");
    expect(out.headers.get("cache-control")).not.toMatch(/immutable/);
  });

  it("keeps a revalidated video's header too", () => {
    const out = withCachePolicy(req("/media/juanramirez/video/renders/abc.mp4"), res(304, { "cache-control": "public, max-age=300" }));
    expect(out.headers.get("cache-control")).toBe("public, max-age=300");
  });

  it("does not store a video answer without the engine's header, or a partial or failed one", () => {
    const video = req("/media/juanramirez/video/renders/abc.mp4");
    expect(withCachePolicy(video, res(200, { "content-type": "video/mp4" })).headers.get("cache-control")).toBe(CACHE_CONTROL.private);
    expect(cachePolicy(video, res(206, { "cache-control": "public, max-age=300" }))).toBe("private");
    expect(cachePolicy(video, res(404))).toBe("private");
  });

  it("never lets an engine header make a video immutable", () => {
    const out = withCachePolicy(req("/media/x/video/renders/a.mp4"), res(200, { "cache-control": "public, max-age=31536000, immutable" }));
    expect(out.headers.get("cache-control")).toBe(CACHE_CONTROL.private);
  });

  it("stores an engine image for a year, immutable", () => {
    const out = withCachePolicy(req("/media/juanramirez/posts/a.webp"), res(200, { "content-type": "image/webp", "cache-control": "public, max-age=31536000, immutable" }));
    expect(out.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
  });

  it("keeps a private picture in the visitor's browser only", () => {
    expect(cachePolicy(req("/media/x/runs/r/picture.webp"), res(200, { "cache-control": "private, max-age=86400" }))).toBe("private-media");
  });

  it("does not store a missing media key", () => {
    expect(cachePolicy(req("/media/nope"), res(404))).toBe("private");
  });

  it("never stores an htmx fragment under a page's URL", () => {
    expect(cachePolicy(req("/contact", { headers: { "hx-request": "true" } }), res(200, html))).toBe("private");
  });

  it("lets the edge keep a public page for a minute", () => {
    const out = withCachePolicy(req("/about"), res(200, html));
    expect(out.headers.get("cache-control")).toBe("public, max-age=0, s-maxage=60, stale-while-revalidate=600");
    expect(cachePolicy(req("/sitemap.xml"), res(200, { "content-type": "application/xml" }))).toBe("public-page");
    expect(cachePolicy(req("/robots.txt"), res(200, { "content-type": "text/plain" }))).toBe("public-page");
  });

  it("stores the content-hashed stylesheet for a year, and nothing else under /assets", () => {
    expect(cachePolicy(req("/assets/site.0123abcd.css"), res(200, { "content-type": "text/css; charset=utf-8" }))).toBe("immutable");
    expect(cachePolicy(req("/assets/other.css"), res(404))).toBe("private");
  });

  it("stores nothing it does not recognise", () => {
    expect(cachePolicy(req("/nope"), res(404, html))).toBe("private");
    expect(cachePolicy(req("/x.json"), res(200, { "content-type": "application/json" }))).toBe("private");
    expect(cachePolicy(req("/projects"), res(301, { location: "/work" }))).toBe("private");
  });
});
