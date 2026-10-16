import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// A6: the boundaries specs/002-proprietor-adoption sets for this slice's code.
// The environment reaches the platform modules only through
// app/lib/platform/env.ts (the one body a move to Workers swaps), and nothing
// here imports `cloudflare:workers`: the site runs on Vercel (D1).

const root = fileURLToPath(new URL("..", import.meta.url));

/** Every .ts/.tsx file the slice owns. */
const OWNED = [
  "app/lib/platform",
  "app/lib/site.ts",
  "app/components/platform",
  "app/components/Footer.tsx",
  "app/(app)/blog",
  "app/(app)/videos",
  "app/media",
  "app/sitemap.ts",
  "app/robots.ts",
];

function files(path: string): string[] {
  const full = join(root, path);
  if (statSync(full).isFile()) return [full];
  return readdirSync(full).flatMap((name) => files(join(path, name)));
}

const sources = OWNED.flatMap(files)
  .filter((file) => /\.tsx?$/.test(file))
  .map((file) => ({ file: relative(root, file), text: readFileSync(file, "utf8") }));

describe("the slice's boundaries", () => {
  it("finds the files it checks", () => {
    expect(sources.map((s) => s.file)).toContain("app/lib/platform/env.ts");
    expect(sources.length).toBeGreaterThan(10);
  });

  it("reads process.env only in app/lib/platform/env.ts", () => {
    const readers = sources.filter((s) => /process\.env/.test(s.text)).map((s) => s.file);
    expect(readers).toEqual(["app/lib/platform/env.ts"]);
  });

  it("never imports cloudflare:workers", () => {
    expect(sources.filter((s) => s.text.includes("cloudflare:workers")).map((s) => s.file)).toEqual([]);
  });

  it("declares exactly the modules the site has: intake and blog", async () => {
    const { manifest } = await import("@/lib/intake/manifest");
    expect(Object.keys(manifest.has).sort()).toEqual(["blog", "intake"]);
  });
});
