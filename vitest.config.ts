import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit and contract tests for the contact intake (specs/001-platform-intake).
// Plain Node: the handler is framework-free and the engine is a local stub
// server, so nothing here needs a DOM, a Next.js build or a database.
export default defineConfig({
  resolve: {
    // The one tsconfig path the code under test uses.
    alias: { "@/lib": fileURLToPath(new URL("./app/lib", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // The kit keeps its announceOnce memo in module scope ("once per process").
    // Inlined, it goes through Vitest's module runner, so vi.resetModules()
    // gives each test a fresh process-level memo instead of one leaking from
    // the test before it.
    server: { deps: { inline: ["@jrcodex/seo-kit"] } },
    // Tests stub the environment and fetch; never let one leak into the next.
    unstubEnvs: true,
    unstubGlobals: true,
    restoreMocks: true,
  },
});
