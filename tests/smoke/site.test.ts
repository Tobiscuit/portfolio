import { beforeAll, describe, expect, it } from "vitest";

import { FORBIDDEN } from "../../lib/claims";
import { HERO_KEY, VIDEO_KEY } from "../fixtures/engine";
import { BASE_URL, stubCalls, TEST_TURNSTILE_TOKEN } from "./harness";

/**
 * The real Worker in workerd, with the stub engine behind the real service
 * binding (spec 003, plan section 4). What only the runtime can show: wrangler
 * bundles the app and its CSS, static assets and _headers answer, kit rpc()
 * crosses a real binding (errors keep their name and retryAfterSeconds), a
 * Response crosses it with its headers, and the cache policy is on every
 * answer. Host-dependent rules are unit-tested: wrangler dev presents the
 * custom-domain host, so every request here reads as production.
 */
const get = (path: string, init?: RequestInit) => fetch(`${BASE_URL}${path}`, { redirect: "manual", ...init });

describe("pages in workerd", () => {
  it.each(["/", "/about", "/work", "/blog", "/blog/fixture-laid-out", "/contact", "/videos"])("%s renders, with the page cache policy and no forbidden claim", async (path) => {
    const response = await get(path);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=0, s-maxage=60, stale-while-revalidate=600");
    const html = await response.text();
    expect(html).toMatch(/^<!doctype html>/);
    const words = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ");
    for (const { pattern, why } of FORBIDDEN) expect(pattern.test(words), why).toBe(false);
  });

  it("reads the blog from the engine over the binding and lays the post out", async () => {
    const html = await (await get("/blog/fixture-laid-out")).text();
    expect(html).toContain('<blockquote class="pull-quote">');
    expect(html).toContain("A caption that adds a fact.");
  });

  it("shows the stub's shown clip on /videos (the binding has videos())", async () => {
    expect(await (await get("/videos")).text()).toContain(`src="/media/${VIDEO_KEY}"`);
  });

  it("answers an unknown path with the 404 page, not stored", async () => {
    const response = await get("/nothing-here");
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("redirects /projects to /work, permanently", async () => {
    const response = await get("/projects");
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("/work");
  });
});

describe("assets", () => {
  let stylesheet = "";
  beforeAll(async () => {
    stylesheet = /<link rel="stylesheet" href="([^"]+)"/.exec(await (await get("/")).text())?.[1] ?? "";
  });

  it("serves the bundled stylesheet at its hash, for a year", async () => {
    expect(stylesheet).toMatch(/^\/assets\/site\.[0-9a-f]{8}\.css$/);
    const response = await get(stylesheet);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/text\/css/);
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    const css = await response.text();
    expect(css).toContain("@layer reset, base, components;");
    expect(css).toContain("--sage-blue-900");
    expect(css).not.toContain("/*");
  });

  it.each(["/fonts/inter-latin-wght-normal.woff2", "/fonts/source-serif-4-latin-wght-normal.woff2", "/vendor/htmx-4.0.0.min.js"])("serves %s as a static asset with the _headers year", async (path) => {
    const response = await get(path);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
  });

  it("serves the favicon", async () => {
    expect((await get("/favicon.svg")).status).toBe(200);
  });
});

describe("engine media over the binding", () => {
  it("keeps a shown video's five minutes: never immutable", async () => {
    const response = await get(`/media/${VIDEO_KEY}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("video/mp4");
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
    expect(await response.text()).toBe("fixture video bytes");
  });

  it("stores an image for a year, and answers a matched etag with 304", async () => {
    const response = await get(`/media/${HERO_KEY}`);
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    const again = await get(`/media/${HERO_KEY}`, { headers: { "if-none-match": '"hero-1"' } });
    expect(again.status).toBe(304);
  });

  it("404s a key the engine does not have", async () => {
    expect((await get("/media/juanramirez/unknown.webp")).status).toBe(404);
  });
});

describe("the contact form, end to end", () => {
  const body = (message: string) =>
    new URLSearchParams({ name: "Dana Alvarez", email: "dana@example.com", message, "cf-turnstile-response": TEST_TURNSTILE_TOKEN });

  it("verifies Turnstile (Cloudflare's test secret), announces, and hands the engine the three fields", async () => {
    const response = await get("/contact", { method: "POST", body: body("Hello from the smoke test"), headers: { "hx-request": "true" } });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.text()).toContain("form-status--success");
    const calls = await stubCalls();
    const announce = calls.find((call) => call.method === "announce");
    expect(announce?.body).toMatchObject({ version: 1, kind: "service", has: { blog: true, intake: true, videos: true }, locales: ["en"], intake: { fields: ["name", "email", "message"] } });
    const inquiry = calls.filter((call) => call.method === "inquire").at(-1);
    expect(inquiry?.siteKey).toBe("sk_smoke_placeholder_not_a_real_key");
    expect(inquiry?.body).toEqual({ locale: "en", page: "/contact", fields: { name: "Dana Alvarez", email: "dana@example.com", message: "Hello from the smoke test" } });
  });

  it("carries the engine's retryAfterSeconds across the real binding into Retry-After", async () => {
    const response = await get("/contact", { method: "POST", body: body("please [stub:rate-limit]"), headers: { "hx-request": "true" } });
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("37");
  });

  it("shows the engine's refusal in its own words, as a sentence", async () => {
    const response = await get("/contact", { method: "POST", body: body("buy now [stub:refuse]"), headers: { "hx-request": "true" } });
    expect(response.status).toBe(400);
    expect(await response.text()).toContain("Message looks like spam.");
  });

  it("answers a plain form post with the whole page", async () => {
    const response = await get("/contact", { method: "POST", body: body("Plain post"), headers: { "content-type": "application/x-www-form-urlencoded" } });
    expect(response.status).toBe(200);
    expect(await response.text()).toMatch(/^<!doctype html>[\s\S]*form-status--success/);
  });
});

describe("sitemap and robots", () => {
  it("list the own pages and the engine's posts", async () => {
    const xml = await (await get("/sitemap.xml")).text();
    expect(xml).toContain("<loc>https://juanramirez.codes/blog/fixture-laid-out</loc>");
    expect((await get("/robots.txt")).headers.get("cache-control")).toBe("public, max-age=0, s-maxage=60, stale-while-revalidate=600");
  });
});
