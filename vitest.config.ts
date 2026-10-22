import { defineConfig } from "vitest/config";

/**
 * Deliberately NOT vite.config.ts: that config loads vinext and the
 * Cloudflare plugin, which build RSC/SSR environments for workerd. The unit
 * tests are plain Node; the smoke tests talk to an already-built Worker over
 * HTTP (montano-btm's arrangement).
 *
 *   unit   tests/unit   pure modules, no network, no Worker
 *   smoke  tests/smoke  `npm run build` first; boots dist/ in workerd with a
 *                       stub seo-engine (tests/stubs/seo-engine)
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
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
