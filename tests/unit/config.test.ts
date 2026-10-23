import { describe, expect, it } from "vitest";

import { SITE_HOST } from "../../lib/site";
import { parseJsonc, read } from "./helpers";

/**
 * The Worker's configuration (spec 003, plan section 1; tasks T1). These are
 * the properties the rest of the site relies on, so a change to one of them
 * fails here first.
 */
type Wrangler = {
  name: string;
  main: string;
  compatibility_date: string;
  compatibility_flags?: string[];
  routes?: Array<{ pattern: string; custom_domain?: boolean }>;
  workers_dev?: boolean;
  preview_urls?: boolean;
  cache?: { enabled?: boolean };
  vars?: Record<string, string>;
  services?: Array<{ binding: string; service: string; entrypoint?: string }>;
  assets?: { directory?: string; not_found_handling?: string; run_worker_first?: unknown };
  rules?: Array<{ type: string; globs: string[] }>;
  d1_databases?: unknown[];
  r2_buckets?: unknown[];
  kv_namespaces?: unknown[];
};

const wrangler = parseJsonc(read("wrangler.jsonc")) as Wrangler;
const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string>; dependencies: Record<string, string>; devDependencies: Record<string, string> };

describe("wrangler.jsonc", () => {
  it("binds the engine's Sites entrypoint as SEO, and nothing else that holds data", () => {
    expect(wrangler.services).toEqual([{ binding: "SEO", service: "seo-engine", entrypoint: "Sites" }]);
    expect(wrangler.d1_databases).toBeUndefined();
    expect(wrangler.r2_buckets).toBeUndefined();
    expect(wrangler.kv_namespaces).toBeUndefined();
  });

  it("lets only the canonical host write to the engine", () => {
    expect(wrangler.vars?.ENGINE_WRITE_HOST).toBe(SITE_HOST);
  });

  it("attaches the canonical host as a custom domain, and nothing else", () => {
    expect(wrangler.routes).toEqual([{ pattern: SITE_HOST, custom_domain: true }]);
  });

  it("has no workers.dev copy; previews exist (behind the account's Access app)", () => {
    expect(wrangler.workers_dev).toBe(false);
    expect(wrangler.preview_urls).toBe(true);
  });

  it("runs behind Workers Cache, which follows lib/cache-policy.ts", () => {
    expect(wrangler.cache?.enabled).toBe(true);
  });

  it("keeps enhanced error serialization and nodejs_compat on by date (>= 2026-08-04)", () => {
    expect(wrangler.compatibility_date >= "2026-08-04").toBe(true);
  });

  it("enters through worker/index.ts", () => {
    expect(wrangler.main).toBe("./worker/index.ts");
  });

  it("serves public/ as static assets before the Worker, and imports CSS as text", () => {
    expect(wrangler.assets?.directory).toBe("./public");
    expect(wrangler.assets?.run_worker_first).toBeUndefined();
    expect(wrangler.rules).toEqual([{ type: "Text", globs: ["**/*.css"], fallthrough: true }]);
  });

  it("never puts a secret in vars", () => {
    expect(Object.keys(wrangler.vars ?? {})).not.toEqual(expect.arrayContaining(["SEO_SITE_KEY"]));
    expect(Object.keys(wrangler.vars ?? {})).not.toEqual(expect.arrayContaining(["TURNSTILE_SECRET_KEY"]));
  });
});

describe("package.json", () => {
  it("build is a wrangler dry run (uploads nothing) and never runs npm (a build that called itself froze the node, 2026-10-20)", () => {
    expect(pkg.scripts.build).toBe("wrangler deploy --dry-run --outdir dist");
    for (const [name, script] of Object.entries(pkg.scripts)) {
      expect(script, name).not.toMatch(/\bnpm (run )?build\b/);
    }
  });

  it("has no deploy script: deploys are the owner's (spec 003, plan section 8)", () => {
    expect(Object.keys(pkg.scripts).filter((name) => /deploy|upload|publish/.test(name))).toEqual([]);
    for (const [name, script] of Object.entries(pkg.scripts)) {
      if (/wrangler (deploy|versions)/.test(script)) expect(script, name).toMatch(/--dry-run/);
    }
  });

  it("pins the kit and htmx exactly (htmx 4 is on npm's `next` tag, not `latest`)", () => {
    expect(pkg.dependencies["@jrcodex/seo-kit"]).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.devDependencies["htmx.org"]).toBe("4.0.0");
  });
});
