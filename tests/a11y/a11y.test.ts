import AxeBuilder from "@axe-core/playwright";
import { chromium, type Browser } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chromiumPath, ROUTES } from "../browser";
import { BASE_URL } from "../smoke/harness";

/**
 * WCAG 2.2 AA (spec 003 section 3): axe-core through Playwright on every
 * public page, in the dark and the light scheme, at 320 px and 1280 px wide,
 * with JavaScript on (the theme toggle and Turnstile present). PR #5's
 * method, moved into the repository. 0 violations is the bar.
 */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const SCHEMES = ["dark", "light"] as const;
const WIDTHS = [320, 1280] as const;

let browser: Browser;
beforeAll(async () => {
  browser = await chromium.launch({ executablePath: chromiumPath() });
});
afterAll(async () => {
  await browser?.close();
});

describe.each(SCHEMES)("%s scheme", (scheme) => {
  describe.each(WIDTHS)("%i px", (width) => {
    it.each(ROUTES)("%s has no WCAG 2.2 AA violation", async (route) => {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(`try { localStorage.setItem("theme", ${JSON.stringify(scheme)}) } catch (e) {}`);
      const page = await context.newPage();
      await page.goto(`${BASE_URL}${route}`, { waitUntil: "load" });
      expect(await page.evaluate("document.documentElement.dataset.theme ?? 'dark'")).toBe(scheme);
      const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      await context.close();
      const summary = violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
      expect(summary).toEqual([]);
    });
  });
});

describe("the check itself", () => {
  it("does catch a violation (a negative control, so 0 above means something)", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setContent('<!doctype html><html lang="en"><title>x</title><body><main><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></main></body></html>');
    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    await context.close();
    expect(violations.map((v) => v.id)).toContain("image-alt");
  });
});

describe("keyboard and interaction", () => {
  it("the theme toggle switches the scheme and remembers it; the skip link lands on main", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/about`);
    const started = performance.now();
    await page.click(".theme-toggle");
    const elapsed = performance.now() - started;
    expect(await page.evaluate("document.documentElement.dataset.theme")).toBe("light");
    await page.reload();
    expect(await page.evaluate("document.documentElement.dataset.theme")).toBe("light");
    expect(elapsed).toBeLessThan(200);
    await page.keyboard.press("Tab");
    expect(await page.evaluate("document.activeElement?.className")).toBe("skip-link");
    await page.keyboard.press("Enter");
    expect(await page.evaluate("location.hash")).toBe("#main");
    await context.close();
  });

  it("the small-screen menu opens without script (a native popover) and lists the sections", async () => {
    const context = await browser.newContext({ viewport: { width: 320, height: 700 }, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/`);
    await page.click(".menu-button");
    expect(await page.locator("#site-menu").isVisible()).toBe(true);
    expect(await page.locator("#site-menu a").allTextContents()).toEqual(["Work", "Writing", "About", "Contact"]);
    await context.close();
  });
});
