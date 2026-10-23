import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * The Chromium the a11y and perf runs drive. CHROME_PATH wins (CI installs
 * one with `npx playwright-core install chromium` and sets it); otherwise the
 * newest Playwright Chromium already in ~/.cache/ms-playwright on this node,
 * so a local run downloads nothing.
 */
export function chromiumPath(): string {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cache = path.join(os.homedir(), ".cache", "ms-playwright");
  for (const revision of ["1248", "1243"]) {
    const candidate = path.join(cache, `chromium-${revision}`, "chrome-linux64", "chrome");
    if (existsSync(candidate)) return candidate;
  }
  throw new Error("No Chromium found: set CHROME_PATH");
}

/** Every public page the budgets cover (spec 003 section 3). */
export const ROUTES = ["/", "/about", "/work", "/blog", "/blog/fixture-laid-out", "/contact", "/videos"] as const;
