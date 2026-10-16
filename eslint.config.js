import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// eslint-config-next 16 ships native flat configs, so they are spread in
// directly. Loading them through FlatCompat (the eslintrc bridge) is what
// crashed ESLint: its eslintrc validator cannot read a flat config.
// Next.js 16 docs: https://nextjs.org/docs/app/api-reference/config/eslint
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // eslint-config-next's own defaults, restated as its docs show.
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Rewritten by `payload generate:types` and `payload generate:importmap`
    // on every `npm run build`.
    "payload-types.ts",
    "app/(payload)/admin/importMap.js",
  ]),
]);
