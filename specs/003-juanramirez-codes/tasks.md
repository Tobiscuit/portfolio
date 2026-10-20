# 003 — Tasks: test-first slices for the build phase

These slices start only after the checkpoint decisions (spec §2) and only if
D1 lands on Workers (plan §3.3). Each slice names its inputs, the contract it
must honour (plan §4), its acceptance tests (written first, failing, then made
to pass) and the files it owns. Ownership is exclusive: two slices never edit
the same file; where one must follow another it says so. Every slice is one
PR against `main`, never merged by the builder, with the preview alias in its
description.

Conventions for every slice: `npm run lint` 0 errors, `npx tsc --noEmit` 0,
`npm test` green, `npx opennextjs-cloudflare build` succeeds; context7 for
every library fact; secrets only via Vault → process environment; the global
pre-commit secret scanner stays on.

## S0 — The merge train (sequential, one PR)

- **Inputs**: PRs #2, #3, #1, #4 (with `dfc0adf`, `a4ad7f7`), #5; the recipe
  in PR #5's comment (issuecomment-6219912266); the resolved tree kept at
  `~/worktrees/portfolio-integration` as a reference, not a source.
- **Contract**: the result equals the trial merge plus #4's two later commits;
  #5 is rebased, never merged into (the secret scanner flags #1's Turnstile
  fixtures on a merge commit).
- **Acceptance**: lint 0 errors, tsc 0, 170 Vitest + 34 node:test (plus any
  added by `dfc0adf`/`a4ad7f7`), `payload generate:types` + `generate:importmap`
  + `next build` 16 routes; `mirror-assets` skipped (needs Mongo) and said so.
- **Owns**: the whole tree for the duration (no other slice runs in parallel
  with S0).

## S1 — The Workers runtime (after S0)

- **Inputs**: the spike (`spike/payload-on-workers`), the template, plan §1–2.
- **Contract**: plan §4 "Platform env", "Payload config" (adapters only),
  "Media URLs", bindings table; `transportFor` untouched; `compatibility_date`
  ≥ 2026-04-21; `graphQL.disable: true`; console logger.
- **Acceptance (first, failing)**:
  - `test/platform-env.test.ts`: `platformEnv()` returns the Worker env with
    `SEO` present ⇒ `transportFor` is `"rpc"`; with neither ⇒ `null`.
  - `test/build.node-test.ts`: `open-next.config.ts` and `wrangler.jsonc`
    parse; `wrangler.jsonc` has `nodejs_compat`, the `SEO` service binding
    with entrypoint `Sites`, `D1`, `R2`, an `env.preview` with different
    ids, and `routes[0].custom_domain === true` for `juanramirez.codes`.
  - `spike/payload-on-workers/scripts/measure.sh` (moved to
    `scripts/measure.sh`) passes against `opennextjs-cloudflare preview`
    with the real app.
  - `next build` under OpenNext succeeds; the Mongo and S3 packages are gone
    from `package.json`.
- **Owns**: `next.config.ts`, `open-next.config.ts`, `wrangler.jsonc`,
  `payload.config.ts` (adapters, `serverURL`, `secret`, `logger`, `graphQL`),
  `app/lib/platform/env.ts`, `package.json` + lockfile, `scripts/measure.sh`,
  `src/migrations/0000_*` (initial), `.gitignore`, `.dev.vars.example` (names
  only, no values).

## S2 — The content model and its rules (after S1)

- **Inputs**: spec §4 (field lists), domain-model §2 (invariants), §6 G1, G9.
- **Contract**: plan §4 "Content rules", "Payload config" (`collections`,
  `globals` arrays only), "Migrations".
- **Acceptance (first, failing)**:
  - `test/content-rules.test.ts`: pure functions — `liveAllowed(kind, slug,
    status)` false for `client`/`live`/`navagranite`, true for
    `client`/`live`/`montanobtm`, true for `product`/`live`/anything;
    `outcomesSourced(outcomes)` false when any `source` is blank;
    `stripClientName(doc, user)` removes `clientName` when `anonymised` and no
    user, keeps it for a user; `periodOrdered`.
  - `test/collections.test.ts`: `payload.config.ts` builds (`buildConfig`
    resolves) with the six entities; `projects` fields include every row of
    spec §4; `media.upload.crop === false`, `focalPoint === false`, no
    `imageSizes`; `users.auth === true`.
  - Through the Local API against local D1 (`getPlatformProxy`): creating a
    `client` project with `status: live` and slug `acme` is rejected with the
    rule's message; an `outcomes` row without `source` is rejected; an
    unauthenticated read never contains `clientName`.
  - `payload migrate:create` produces one migration; `payload migrate` applies
    it to a fresh local D1.
- **Owns**: `collections/*.ts`, `globals/*.ts`, `collections/rules.ts`,
  `collections/CONTENT-RULES.md`, `src/migrations/0001_*`, `payload-types.ts`
  (generated), the `collections`/`globals` lines of `payload.config.ts`.

## S3 — Content migration and seed (after S2; can run beside S4)

- **Inputs**: spec §7; `~/backups/juanramirez-portfolio-2026-10-19/content.json`;
  the Vercel site's REST API (read-only, credentials via env); R2 `bastion-media`;
  the owner's inputs (LinkedIn URL; D7 per-client decisions).
- **Contract**: plan §4 "Seed / import".
- **Acceptance (first, failing)**:
  - `test/import.test.ts`: the mapper turns `content.json`'s `site_config`
    into `profile`/`skills`/`site` documents with the rows of spec §7; drops
    `three-chicks`, `cs-three-chicks-001`, the two test posts, the BASTION
    hero strings; refuses (`PlaceholderUrlError`) when `social_links_json`
    still holds `github.com/juanramirez` or `linkedin.com/in/juanramirez`.
  - `test/import.test.ts`: the project-data mapper keeps WeatherWise AI and
    WeFix4U as `kind: earlier, status: built` and never emits the four
    excluded entries (Three Chicks ×2, The Gilded Shear, Project Eta).
  - `scripts/verify-import.ts` exits non-zero on a count, slug or byte-length
    difference (tested with a fabricated difference).
- **Owns**: `scripts/import-content.ts`, `scripts/verify-import.ts`,
  `scripts/mirror-assets.ts` (rewritten for R2), `seed/` (the mapped JSON,
  reviewed by the owner before import), `test/import.test.ts`.

## S4 — The pages (after S2; beside S3)

- **Inputs**: spec §8 (content plan), §9 (design), PR #5's primitives
  (`app/components/ui`), plan §8 (verified numbers).
- **Contract**: reads Payload through the Local API only; every number on a
  page comes from `outcomes[]`; the status badge never renders "production";
  `next/image` through the loader of plan §4 "Media URLs".
- **Acceptance (first, failing)**:
  - `test/work.test.ts`: `/work` groups by `kind` in the spec's order with
    `featured` first; `/work/<slug>` renders the four questions in order and
    the numbers strip with one `Tooltip` per outcome naming its source; an
    `anonymised` project shows its placeholder name and never `clientName`.
  - `test/about.test.ts`: `/about` renders profile, certifications with their
    `status` wording ("in progress", never "earned" without a year), skills
    groups; the `$ man juan --verbose` easter egg only if D8 keeps it.
  - `tests/a11y.spec.ts` (Playwright + axe): 0 violations on `/`, `/work`,
    `/work/<one>`, `/about`, `/blog`, `/contact`, dark and light, 320/1280.
  - `tests/weight.node-test.ts`: content pages ≤ 100 KB JS gzip.
- **Owns**: `app/(app)/work/**`, `app/(app)/about/**`, `app/(app)/resume/**`,
  `app/(app)/page.tsx`, `app/components/work/**`, `app/components/about/**`,
  `app/lib/image-loader.ts`, `tests/a11y.spec.ts`, `tests/weight.node-test.ts`,
  `test/work.test.ts`, `test/about.test.ts`.

## S5 — Delivery rules (after S1; beside S2)

- **Inputs**: domain-model §4, gaps G1–G4; PR #4's `/media` route and test.
- **Contract**: plan §4 "Canonical host", "Cache policy", "Manifest".
- **Acceptance (first, failing)**:
  - `test/cache-policy.test.ts`: one case per rule, including "a video's
    `max-age=300` is forwarded verbatim and never becomes immutable".
  - `test/site.test.ts` (extended): the literal host appears in no file but
    `app/lib/site.ts`; `serverURL`, sitemap base, JSON-LD `url` and the
    `ENGINE_WRITE_HOST` default all equal `canonical("")`'s host.
  - `test/boundaries.test.ts` (extended): `manifest.has` has no `projects`.
  - `test/footer.test.ts`: the footer's name equals Payload's `profile.name`;
    the test fails when the engine profile's name differs (gap G3).
- **Owns**: `app/lib/site.ts`, `app/lib/cache-policy.ts`, `app/media/[...key]/route.ts`
  (apply the policy object; behaviour unchanged), `test/cache-policy.test.ts`,
  `test/footer.test.ts`, the named test extensions.

## S6 — CI, previews, deploy wrapper (after S1; beside S2–S5)

- **Inputs**: plan §4 "Deploy wrapper", "Preview environment", §7; the
  seo-engine `deploy` script; D14 (CI path) once decided.
- **Contract**: previews with `--env preview --preview-alias pr-<n>`; never
  `wrangler deploy` from a PR; migrations applied to the environment's D1
  before upload; Lighthouse CI budgets as plan §7; no token in a file.
- **Acceptance (first, failing)**:
  - `tests/ci.node-test.ts`: the workflow YAML parses; the preview job uses
    `versions upload` and never `deploy`; the production job triggers only on
    `main`; `lighthouserc.json` carries the four budgets with the spec's
    thresholds.
  - A dry run of `scripts/deploy --help` with Vault sealed fails with the
    sealed message and prints no token.
  - One PR preview exists with a Lighthouse report attached (the slice's own
    PR proves it).
- **Owns**: `.github/workflows/*.yml`, `lighthouserc.json`, `scripts/deploy`,
  `tests/ci.node-test.ts`, `README.md` (deploy section).

## S7 — Parked infrastructure and the runbook (no code; beside everything)

- **Inputs**: plan §5–6; `~/cloudflare-infra` conventions.
- **Contract**: `.tf.pending` only; the three existing `jrcodex-*.tf.pending`
  untouched; nothing applied.
- **Acceptance**: `terraform validate` passes on a scratch copy of
  `cloudflare-infra` with the four files renamed to `.tf` and the dead zone
  removed from the plan (`-target` is not used); each file's header says what
  it depends on and the exact `./tf plan` expectation.
- **Owns**: `specs/003-juanramirez-codes/infra/*.tf.pending` and their
  untracked copies in `~/cloudflare-infra/`.

## S8 — Writing (the owner's, with help; after S4)

Not a code slice. The six case studies in spec §8, in his voice, from the
verified numbers in plan §8; each one's longer form as a blog post through
his Proprietor dashboard (the plain-words gate applies). The checklist: no
superlatives, every number sourced, "built" never "production" except
montanobtm.com, passkeys are the phone's own.

## Order and parallelism

```
S0 ──▶ S1 ──┬──▶ S2 ──┬──▶ S3
            │         └──▶ S4 ──▶ S8
            ├──▶ S5
            └──▶ S6
S7 runs beside everything (owner-applied at the end)
```

At most two builders at once; S2 before S3/S4 because they need the model.
