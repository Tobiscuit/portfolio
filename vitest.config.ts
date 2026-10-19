import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Vite does not read tsconfig "paths", so the aliases are restated here.
const root = fileURLToPath(new URL('./', import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      { find: '@payload-config', replacement: `${root}payload.config.ts` },
      { find: '@payload-types', replacement: `${root}payload-types.ts` },
      { find: /^@\/components\//, replacement: `${root}app/components/` },
      { find: /^@\/lib\//, replacement: `${root}app/lib/` },
      { find: /^@\/app\//, replacement: `${root}app/` },
    ],
  },
  test: {
    environment: 'node',
    // Characterization tests sit beside their code; the contact intake's unit
    // and contract tests (specs/001-platform-intake) live in test/.
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
    // The kit keeps its announceOnce memo in module scope ("once per process").
    // Inlined, it goes through Vitest's module runner, so vi.resetModules()
    // gives each test a fresh process-level memo instead of one leaking from
    // the test before it.
    server: { deps: { inline: ['@jrcodex/seo-kit'] } },
    // Tests stub the environment and fetch; never let one leak into the next.
    unstubEnvs: true,
    unstubGlobals: true,
    restoreMocks: true,
  },
})
