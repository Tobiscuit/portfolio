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
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
  },
})
