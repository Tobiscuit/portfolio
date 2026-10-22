import path from "node:path";

import { defineConfig, type Plugin } from "vitest/config";

/**
 * wrangler.jsonc imports every .css file as its text (a `Text` module rule);
 * this does the same for the tests by resolving each import to Vite's own
 * `?raw` form, so src/assets.ts builds the real bundle under Vitest too.
 */
const cssAsText: Plugin = {
  name: "css-as-text",
  enforce: "pre",
  resolveId(source, importer) {
    if (!source.endsWith(".css") || !importer) return null;
    return `${path.resolve(path.dirname(importer), source)}?raw`;
  },
};

/**
 * Two projects (montano-btm's arrangement, without its Vite app config: this
 * site is bundled by wrangler). The unit tests are plain Node, the whole Hono
 * app included (app.request with a fake binding); the smoke tests talk to the
 * real Worker in workerd over HTTP.
 *
 *   unit   tests/unit   pure modules, no network, no Worker
 *   smoke  tests/smoke  `npm run build` first; boots dist/ in workerd with a
 *                       stub seo-engine (tests/stubs/seo-engine)
 */
export default defineConfig({
  plugins: [cssAsText],
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
          // Let CSS through Vitest's CSS stub, so the `?raw` imports above
          // arrive as their text.
          css: true,
          // Run the kit through Vite's module graph, so vi.resetModules() gives
          // a test a fresh isolate's state (announceOnce remembers per module).
          server: { deps: { inline: ["@jrcodex/seo-kit"] } },
        },
      },
      {
        test: {
          name: "smoke",
          include: ["tests/smoke/**/*.test.ts"],
          globalSetup: ["./tests/smoke/global-setup.ts"],
          // One Worker process is shared by every smoke file.
          fileParallelism: false,
          testTimeout: 30_000,
          // Booting workerd is slow on a cold cache.
          hookTimeout: 180_000,
        },
      },
    ],
  },
});
