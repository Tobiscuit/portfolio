import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chromiumPath, ROUTES } from "../browser";
import { BASE_URL, root } from "../smoke/harness";

/**
 * The performance budgets (spec 003 section 3), measured by Lighthouse 13 with
 * its default mobile profile: simulated throttling at 150 ms RTT, 1.6 Mbps
 * down, 4x CPU slowdown. Against the local Worker in workerd, so the numbers
 * show the page's own weight, not Cloudflare's network; the remote numbers
 * come from the preview URL once one can be uploaded (plan section 8).
 *
 *   LCP < 2.0 s · CLS < 0.05 · TBT < 200 ms (the lab stand-in for INP)
 */
const BUDGET = { lcpMs: 2000, cls: 0.05, tbtMs: 200 };
const reportDir = path.join(root, "tests", "perf", "report");

let chrome: chromeLauncher.LaunchedChrome;
const results: Array<{ route: string; lcp: number; cls: number; tbt: number; fcp: number; bytes: number; score: number }> = [];

beforeAll(async () => {
  chrome = await chromeLauncher.launch({ chromePath: chromiumPath(), chromeFlags: ["--headless=new", "--no-first-run", "--no-sandbox"] });
});

afterAll(async () => {
  chrome?.kill();
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(path.join(reportDir, "summary.json"), `${JSON.stringify({ budget: BUDGET, results }, null, 2)}\n`);
});

describe("Lighthouse, mobile, simulated 4G", () => {
  it.each(ROUTES)("%s meets LCP, CLS and TBT budgets", async (route) => {
    const run = await lighthouse(`${BASE_URL}${route}`, { port: chrome.port, output: "json", logLevel: "error", onlyCategories: ["performance"] });
    const lhr = run!.lhr;
    const value = (id: string) => lhr.audits[id]?.numericValue ?? Number.NaN;
    const row = {
      route,
      lcp: Math.round(value("largest-contentful-paint")),
      cls: Number(value("cumulative-layout-shift").toFixed(3)),
      tbt: Math.round(value("total-blocking-time")),
      fcp: Math.round(value("first-contentful-paint")),
      bytes: Math.round(value("total-byte-weight")),
      score: Math.round((lhr.categories.performance.score ?? 0) * 100),
    };
    results.push(row);
    expect(row.lcp, `${route} LCP`).toBeLessThan(BUDGET.lcpMs);
    expect(row.cls, `${route} CLS`).toBeLessThan(BUDGET.cls);
    expect(row.tbt, `${route} TBT`).toBeLessThan(BUDGET.tbtMs);
  });
});
