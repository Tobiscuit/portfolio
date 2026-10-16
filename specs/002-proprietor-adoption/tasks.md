# 002 — Tasks

Slices with non-overlapping files. Every slice: failing tests first; use
context7 for every library and platform fact; no secrets anywhere (the Vault
token is expired by design for builders); never merge, never push to `main`
or `develop`, never deploy, never touch live infrastructure; commits end with
`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; the global
pre-commit secret scanner stays on (no `--no-verify`); scratch files in the
scratchpad, never in a repo; no sub-agents unless essential; research only
what you use; a lean report.

**Status 2026-10-16.** D1 (spec §3) is reopened: Tobias is deciding whether
Payload stays. Slices E and A are built now and are the same under every
option, with the project-specific work in commits that can be dropped
(E5–E6, A3). Slices B (vinext, Payload retired) and B′ (hybrid: OpenNext +
Payload on D1/R2) are written and **on hold until his word**; exactly one of
them is built.

## Slice E — engine spec 028 (`~/worktrees/seo-engine-jrcodex-adoption`, branch `028-portfolio-site`, PR against `main`)

**Owns:** `specs/028-portfolio-site/**`, `migrations/0034_*.sql` (videos)
and `migrations/0035_*.sql` (projects: separate, droppable),
`src/video/store.ts` (show/hide), `src/render/sites.ts` (videos, media
Range), `src/sites-entrypoint.ts`, dashboard `apps/dashboard/app/actions/videos.ts`
and `apps/dashboard/components/videos/**` (the toggle),
`packages/seo-kit/**` (0.7.0), `test/architecture.test.ts` where it pins the
Sites method list, and — in the droppable commits — `src/sites/project-store.ts`,
`src/sites/project-writer.ts`, `src/sites/projects.ts`,
`apps/dashboard/app/actions/projects.ts`,
`apps/dashboard/components/projects/DraftEditor.tsx`,
`scripts/import-portfolio.ts`; the tests for each.
**Does not touch:** the rest of `src/video/*`, the agents Worker,
`wrangler*.jsonc`, deploys, `./deploy`.

Commit order matters: E1–E4 first (needed under every D1 option), then E5–E6
as their own commits headed "028 projects:" so the PR can drop them.

- [ ] E1 spec `specs/028-portfolio-site/spec.md` (short; cites the site's
  spec 002 and states the droppable half)
- [ ] E2 videos, engine side: migration 0034 `cuts.shown_on_site_at TEXT`;
  `showOnSite`/`hideFromSite` in `src/video/store.ts` (ready cuts only, the
  business's own, idempotent); `Sites.videos(siteKey)` per the site's
  `plan.md` §2.2 (`VideoSummary`: id, title, src `/media/<render key>`,
  contentType `video/mp4`, seconds, format from the cut's format, publishedAt;
  newest first); `Sites.media(siteKey, key, opts?: { range?: string })`
  serves a shown render key with Range (206, `content-range`,
  `accept-ranges: bytes`; HEAD answers headers) and refuses a hidden or
  removed one; the architecture test's method list
- [ ] E3 dashboard: "Show on site" / "Hide from site" on a ready cut
  (`actions/videos.ts` + the cut's row in `components/videos/**`), shown only
  when the business has a `sites` row; plain words on refusal
- [ ] E4 kit 0.7.0: `VideoSummary`, `videos()` on `SeoClient` and
  `SitesBinding`, `http()` `GET /v1/videos`, `mediaHandler` forwards the
  request's `range` header as `media(key, { range })` (an optional second
  argument; an older engine ignores it), README section, version bump
  (tagging and `npm stage approve` are Tobias's)
- [ ] E5 **028 projects:** migration 0035 `projects.link TEXT` (null or
  `https://`, <= 300); `link` through `NewProject`, `saveProjectText`,
  `updateLiveProject`, the dashboard form, `Sites.projects/project`
  (`ProjectSummary.link`); the sanitiser keeps `h2`/`h3` without attributes;
  the dashboard editor round-trips a write-up with headings unchanged; kit:
  `ProjectSummary.link`
- [ ] E6 **028 projects:** `scripts/import-portfolio.ts`: reads
  `PortfolioExport` (site `plan.md` §2.3), resolves images by
  `gallery_images.source`, emits reviewed SQL (`scripts/showcase/build.ts`
  is the pattern), prints the legacy-id → slug map; dry run by default;
  idempotent
- [ ] E7 PR against `main`, body ends with the attribution line and names
  the droppable commits

**Acceptance tests (written first):**
- `videos(siteKey)` lists only cuts that are `ready`, not removed and shown,
  newest first; another business's shown cut never appears; hiding removes
  it and `media(renderKey)` answers null afterwards; a draft or failed cut
  cannot be shown (plain words)
- `media(renderKey, { range: "bytes=0-99" })` answers 206 with
  `content-range: bytes 0-99/<size>` and 100 bytes; without a range, 200
  with `accept-ranges: bytes`; a gallery key is unaffected
- the kit's `http()` and `rpc()` tests cover `videos()` and the Range
  passthrough; `npm test` (engine: workers + architecture) and the kit's
  tests pass
- (E5) a published project with `link` comes back with it over
  `Sites.project` and `projects`; a non-https link is refused at save with
  plain words; `sanitizeProjectHtml("<h2 onclick=x>A</h2><p>b</p>")` keeps
  `<h2>A</h2>`; `<script>` and `<img>` still vanish; an editor round-trip of
  `<h2>A</h2><p>b</p><ul><li>c</li></ul>` is byte-identical
- (E6) the import's dry run on a two-project fixture prints SQL that
  applies to the migrated local D1 and a slug map with two entries; a second
  run prints nothing to insert

## Slice A — additive platform modules (this repo, branch `feat/proprietor-adoption`)

Built now, on today's Next.js build; every page renders with the platform
unconfigured. `/work` (A3) is the LAST commit, alone, with `has.projects`
in it, so D1(b) can revert exactly one commit.

**Owns:** `app/(app)/blog/**`, `app/(app)/work/**`, `app/(app)/videos/**`,
`app/components/platform/**`, `app/components/Footer.tsx`,
`app/components/Header.tsx` (the `navLinks` array only),
`app/(app)/layout.tsx` (mounting `<Footer/>` only), `app/lib/platform/**`,
`app/lib/site.ts`, `app/lib/intake/manifest.ts`, `app/sitemap.ts`,
`app/robots.ts`, `test/**`, `package.json`/`package-lock.json` (only the kit
to 0.6.2 exact), this file's A ticks.
**Does not touch:** `app/globals.css`, page copy of existing pages, the
contact page, `app/lib/intake/{engine,handle,form,turnstile}.ts`,
`app/api/**`, Payload, `app/(app)/projects/**`, anything B/B′ owns.

- [ ] A1 kit 0.6.2; `app/lib/site.ts` (SITE_URL, LinkedIn/GitHub, fallback
  profile "Juan Ramirez"); `app/lib/platform/{env,client,reads,images,videos}.ts`
  (`env.ts` returns `process.env`; its body is the one thing the cutover
  swaps); manifest `has: { intake: true, blog: true }` + `renders`; the
  stub extended with the read routes and fixtures
- [ ] A2 `/blog` and `/blog/[slug]`: `postMetadata`, `postJsonLd`,
  `compose(post, { supports: manifest.renders })` mapped to plain components
  (opening, html, figure, pull-quote, key-points, aside, closing); the
  manifest's `renders` says exactly what A2 maps
- [ ] A4 `/videos`: `<video controls preload="metadata">` per cut, title,
  duration; empty → nothing visible and `noindex`; the nav shows "Videos"
  only when the list is non-empty (say how)
- [ ] A5 footer with the profile (name, email, LinkedIn, GitHub) and the
  fallback when unconnected; `sitemap.ts` (home, about, contact, blog,
  every post; work and projects when A3 is in; videos never) and `robots.ts`
- [ ] A6 tests green: `npm test`, `npx tsc --noEmit`, `npm run build`
  (Next) passes with the platform unconfigured
- [ ] A3 **last, alone:** `/work` and `/work/[slug]` (grid: cover, title,
  summary, service chip; page: cover, write-up as it comes, photos, "Visit"
  when `link`), empty state with `noindex`, `path` mismatch redirects,
  `has.projects: true`, nav "Work" pointing at `/work` (the old `/projects`
  link stays until the cutover decides)

**Acceptance tests (written first), against the stub over `http()`:**
- unconfigured (no `SEO_ENGINE_URL`, no `SEO`): `/blog`, `/videos` (and
  `/work`) render 200 with their empty states and `noindex`; the footer
  shows the fallback profile; the sitemap lists only the site's own pages
- configured: `/blog` lists the fixture posts newest first with `href` =
  `post.path`; `/blog/<slug>` has one `<h1>`, the engine's canonical, one
  hreflang per locale plus `x-default`, the JSON-LD, and every `compose()`
  item kind rendered; an unknown slug is 404; a stub 500 on the single read
  is a thrown error (5xx), never a 404
- `/videos` with a binding that has `videos` lists them; over `http()` it is
  empty; `preload="metadata"` and `controls` present
- the manifest is exactly `{ version: 1, kind: "service", has: { intake:
  true, blog: true[, projects: true] }, renders: {...}, locales: ["en"],
  intake: { fields: ["name","email","message"] } }` and spec 001's intake
  tests still pass with it
- off the production host, every engine image URL is `/media/<key>`; on
  it, the transform URL as given
- (A3) `/work` shows the fixture projects with service chips; `/work/<slug>`
  shows the write-up HTML unchanged, the photos in order, "Visit" only when
  `link` is a string; a project answering a different `path` redirects

## Slice B — cutover, variant (a): vinext, Payload retired — ON HOLD

**Owns:** `scripts/export-portfolio.mjs` (first commit), `vite.config.ts`,
`wrangler.jsonc`, `worker/index.ts`, `env.d.ts`, `.dev.vars.example`,
`next.config.mjs`, `tsconfig.json`, `package.json`/`package-lock.json`
(everything but the kit line), `app/api/contact/route.ts`,
`app/lib/platform/env.ts` (body swap only: `cloudflare:workers`),
`app/lib/legacy-redirects.ts`, `app/lib/cache-policy.ts`,
`app/components/Header.tsx` (`/projects` → `/work` in `navLinks` only), the
removals in `plan.md` §1, `public/images/projects/**` (the three moved
heroes), `tests/**` (smoke), `vitest.config.ts` (two projects),
`.github/workflows/ci.yml`, `docs/delivery-pipeline.md`, `.gitignore`,
`README.md`, `.env.example`, this file's B ticks.
**Does not touch:** `app/components/platform/**`, the pages A built,
`app/globals.css`, `app/lib/intake/{handle,engine,form,turnstile}.ts`.

- [ ] B1 `scripts/export-portfolio.mjs` (`--source mongo|code`, `mongodb`
  driver through `npx --package mongodb`, no new dependency; writes
  `PortfolioExport` + `photos.json` for `import-gallery`; gitignored
  `export/`); a unit test on the `code` source
- [ ] B2 the port: vinext, Vite, the Cloudflare plugin, Tailwind via
  `@tailwindcss/vite`, `worker/index.ts` (announce in background, `/media/*`
  through `mediaHandler`, legacy redirects, Cache-Control), `wrangler.jsonc`
  per `plan.md` §2.4, `env.d.ts`, `.dev.vars.example` with Cloudflare's
  Turnstile test keys and a placeholder site key
- [ ] B3 Payload, Mongo, S3, `sharp`, SES and the Vercel-only code removed;
  `/projects*` redirected; `public/media/` gone, heroes moved; `next.config`
  without `withPayload`, `images.unoptimized`, `htmlLimitedBots: /.*/`
- [ ] B4 the route reads `env` from `cloudflare:workers` (`plan.md` §2.5);
  `app/lib/platform/env.ts` body swapped
- [ ] B5 smoke harness (montano's) and tests; `npm run typecheck`,
  `npm run build`, `npm test` green
- [ ] B6 dependency currency: every kept or added package at `npm view`'s
  current stable, breaking changes researched with context7; the table of
  versions and any hold with its reason goes in the B6 table below and in
  the PR body
- [ ] B7 `.github/workflows/ci.yml`, `docs/delivery-pipeline.md` (the two
  triggers verbatim, what only the owner can do, proven vs unproven),
  `README.md` rewritten for the Worker

**Acceptance tests (written first), on the built Worker with the stub engine:**
- `/`, `/about`, `/contact`, `/blog`, `/work`, `/videos` answer 200 with no
  RSC error rows; `/sitemap.xml` and `/robots.txt` answer; `/media/<fixture
  key>` streams the stub's bytes with `cache-control: public, max-age=31536000, immutable`
- `/projects` → 301 `/work`; `/projects/1` → 301 `/work/<slug from the map>`;
  `/projects/99` → 404
- `POST /api/contact` with Cloudflare's test Turnstile token reaches the
  stub's `inquire` exactly once after one `announce`; the stub's refusals
  surface as spec 001's statuses (the smoke Worker sees the production host)
- public pages carry `cache-control: public, max-age=0, s-maxage=60,
  stale-while-revalidate=600`; `/api/*` and RSC payloads `private, no-store`
- `wrangler versions upload --dry-run -c dist/server/wrangler.json` and
  `wrangler deploy --dry-run -c dist/server/wrangler.json` validate, with
  both custom-domain routes and the `SEO` service binding present
- `grep -r "payload\|mongodb\|@aws-sdk\|sharp" package.json app` finds
  nothing but the export script

## Slice B′ — cutover, variant (b): hybrid, OpenNext + Payload on D1/R2 — ON HOLD

Payload stays as the site's content layer for projects and media; Proprietor
supplies blog, inquiries, profile, mail and video through the kit over the
`SEO` binding. A3 is reverted (one commit) and E5–E6 dropped from the engine
PR.

**Owns:** `open-next.config.ts`, `wrangler.jsonc` (OpenNext's shape: `main`
`.open-next/worker.js`, `assets` `.open-next/assets`, a D1 binding for
Payload, an R2 binding for media, the `SEO` service binding, `nodejs_compat`,
`routes` with both custom domains, `workers_dev: false`, `preview_urls:
true`), `payload.config.ts` (`@payloadcms/db-d1-sqlite`,
`@payloadcms/storage-r2`, no `sharp`), `collections/**` (kept; media URLs
move to Payload's own file route, never `/media/*`, which is the engine's),
`src/migrations/**` (Payload's generated migrations), `scripts/migrate-mongo-to-d1.ts`
(Payload Local API with both adapters; the owner runs it once),
`scripts/mirror-assets.ts` (removed), `next.config.mjs` (`withPayload` kept,
`images.unoptimized`), `app/api/contact/route.ts` and
`app/lib/platform/env.ts` (body swap to `getCloudflareContext().env`),
`app/media/[...key]/route.ts` (the engine's `mediaHandler` as a route
handler, Range forwarded), `instrumentation.ts` or the Worker wrapper
(announce in background), `app/lib/cache-policy.ts`, `tests/**` (smoke
against `.open-next` under `wrangler dev`), `vitest.config.ts`,
`.github/workflows/ci.yml`, `docs/delivery-pipeline.md`, `.gitignore`,
`README.md`, `.env.example`, `package.json`/`package-lock.json`, this file's
B′ ticks.
**Does not touch:** `app/components/platform/**`, A's pages,
`app/globals.css`, `app/lib/intake/{handle,engine,form,turnstile}.ts`,
`app/(app)/projects/**` beyond the media URL change.

- [ ] B′1 `npx vinext check` is NOT run; instead Payload's
  `templates/with-cloudflare-d1` is read (context7) and its versions and
  config shape recorded here before any change
- [ ] B′2 OpenNext + the Cloudflare adapter; `wrangler.jsonc` as above; the
  site builds and runs under `wrangler dev` with a local D1 and R2
- [ ] B′3 Payload on D1 (adapter, generated migrations) and R2 (storage
  plugin); `sharp` removed; `scripts/migrate-mongo-to-d1.ts`; S3 mirroring
  and the SES path removed; `/projects` pages read Payload as today
- [ ] B′4 the kit's modules on the Worker: `env.ts` swap, the contact route
  over `rpc()`, `/media/*` route handler with Range, announce
- [ ] B′5 smoke harness and tests; `npm run build`, `npm test` green
- [ ] B′6 dependency currency as B6 (the kept Payload packages included,
  at the versions Payload's template pins where its adapters require it:
  record each as a hold with the reason)
- [ ] B′7 CI, delivery doc, README

**Acceptance tests:** as B's, with `/projects` and `/projects/<id>` answering
200 from local D1 instead of redirecting, Payload's admin reachable at
`/admin` (and gated by Access in the parked Terraform, like montanobtm's
admin was), `/media/<engine key>` from the stub engine and Payload's media
from R2 at Payload's own route, no `/media/*` overlap.

### B6 / B′6 — versions landed (filled by the builder)

| Package | Was | Now | Hold? Why |
|---|---|---|---|
| | | | |
