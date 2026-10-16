# 002 — Tasks

Three slices, non-overlapping files. Every slice: failing tests first; use
context7 for every library and platform fact; no secrets anywhere (the Vault
token is expired by design for builders); never merge, never push to `main`
or `develop`, never deploy, never touch live infrastructure; commits end with
`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; the global
pre-commit secret scanner stays on (no `--no-verify`); scratch files in the
scratchpad, never in a repo.

## Slice E — engine spec 028 (`~/worktrees/seo-engine-jrcodex-adoption`, branch `028-portfolio-site`, PR against `main`)

**Owns:** `specs/028-portfolio-site/**`, `migrations/0034_*.sql`,
`src/sites/project-store.ts`, `src/sites/project-writer.ts`,
`src/sites/projects.ts`, `src/render/sites.ts` (videos, media Range),
`src/sites-entrypoint.ts`, `src/video/store.ts` (show/hide), dashboard:
`apps/dashboard/app/actions/{projects,videos}.ts`,
`apps/dashboard/components/projects/DraftEditor.tsx`,
`apps/dashboard/components/videos/**` (the toggle), `packages/seo-kit/**`
(0.7.0: types, `videos()`, `/v1/videos`, `mediaHandler` forwards Range,
README), `scripts/import-portfolio.ts`, the tests for each, and
`test/architecture.test.ts` where it pins the Sites method list.
**Does not touch:** anything under `src/video/*` but `store.ts`, the agents
Worker, `wrangler*.jsonc`, deploys.

- [ ] E1 spec `specs/028-portfolio-site/spec.md` (short; cites this spec)
- [ ] E2 migration 0034: `projects.link TEXT` (null or https, <= 300),
  `cuts.shown_on_site_at TEXT`; contract test on the schema
- [ ] E3 projects: `link` through `NewProject`, `saveProjectText`,
  `updateLiveProject`, dashboard form and `Sites.projects/project`
  (`ProjectSummary.link`); sanitiser keeps `h2`/`h3` (no attributes); the
  dashboard editor round-trips a write-up with headings unchanged
- [ ] E4 videos: `showOnSite(cutId)` / `hideFromSite(cutId)` (ready cuts only,
  the business's own), `Sites.videos(siteKey)` per `plan.md` §2.2,
  `Sites.media()` serves a shown render key with Range (206, Content-Range,
  Accept-Ranges) and refuses a hidden one; dashboard toggle on a ready cut
- [ ] E5 kit 0.7.0: `VideoSummary`, `videos()` on `SeoClient`/`SitesBinding`,
  `http()` `/v1/videos`, `ProjectSummary.link`, `mediaHandler` forwards the
  `range` header to `media(key, { range })` (optional second argument;
  older engines ignore it); README; version bump (tagging is Tobias's)
- [ ] E6 `scripts/import-portfolio.ts`: reads `PortfolioExport` (`plan.md`
  §2.3), resolves images by `gallery_images.source`, emits reviewed SQL
  (`scripts/showcase/build.ts` pattern), prints the legacy-id → slug map;
  dry run by default; idempotent
- [ ] E7 PR against `main`; body ends with the attribution line

**Acceptance tests (written first):**
- a published project with `link` comes back with it over `Sites.project`
  and `projects`; a non-https link is refused at save with plain words
- `sanitizeProjectHtml("<h2 onclick=x>A</h2><p>b</p>")` keeps `<h2>A</h2>`
  without attributes; `<script>` and `<img>` still vanish; an editor
  round-trip of `<h2>A</h2><p>b</p><ul><li>c</li></ul>` is byte-identical
- `videos(siteKey)` lists only cuts that are `ready`, not removed and shown,
  newest first; another business's shown cut never appears; hiding removes
  it and `media(renderKey)` answers null afterwards
- `media(renderKey, { range: "bytes=0-99" })` answers 206 with
  `content-range: bytes 0-99/<size>`; without a range, 200 with
  `accept-ranges: bytes`
- the kit's `http()` and `rpc()` tests cover `videos()` and the Range
  passthrough; `npm test` (engine) and the kit's tests pass
- the import's dry run on a two-project fixture prints SQL that `sqlite3`
  accepts against the migrated schema and a slug map with two entries

## Slice A — additive platform modules (this repo, branch `feat/proprietor-adoption`)

**Owns:** `app/(app)/blog/**`, `app/(app)/work/**`, `app/(app)/videos/**`,
`app/components/platform/**`, `app/components/Footer.tsx`,
`app/components/Header.tsx` (the `navLinks` array only),
`app/(app)/layout.tsx` (mounting `<Footer/>` only), `app/lib/platform/**`,
`app/lib/site.ts`, `app/lib/intake/manifest.ts`, `app/sitemap.ts`,
`app/robots.ts`, `test/**`, `package.json`/`package-lock.json` (only the kit
to 0.6.2 exact), this file's A ticks.
**Does not touch:** `app/globals.css`, page copy of existing pages, the
contact page, `app/lib/intake/{engine,handle,form,turnstile}.ts`,
`app/api/**`, Payload, anything B owns.

- [ ] A1 kit 0.6.2; `app/lib/site.ts` (SITE_URL, LinkedIn/GitHub, fallback
  profile "Juan Ramirez"); `app/lib/platform/{env,client,reads,images,videos}.ts`;
  manifest `has: { intake: true, blog: true, projects: true }` in the same
  commit as the pages; the stub extended with the read routes and fixtures
- [ ] A2 `/blog` and `/blog/[slug]`: `postMetadata`, `postJsonLd`,
  `compose(post, { supports: manifest.renders })` mapped to plain components
  (opening, html, figure, pull-quote, key-points, aside, closing); the
  manifest's `renders` says exactly what A2 maps
- [ ] A3 `/work` and `/work/[slug]`: grid (cover, title, summary, service
  chip), project page (cover, write-up as it comes, photos, "Visit" when
  `link`), empty state with `noindex`; `path` mismatch redirects
- [ ] A4 `/videos`: `<video controls preload="metadata">` per cut, title,
  duration; empty → nothing visible, `noindex`; the nav link appears only
  when the list is non-empty (the header reads a server-provided flag or the
  page is simply absent from nav until then — keep it simple and say which)
- [ ] A5 footer with the profile (name, email, LinkedIn, GitHub) and the
  fallback when unconnected; `sitemap.ts` (home, about, contact, blog,
  work, every post and project; videos never) and `robots.ts`
- [ ] A6 tests green: `npm test`, `npx tsc --noEmit`, `npm run build`
  (Next) still passes with the platform unconfigured

**Acceptance tests (written first), against the stub over `http()`:**
- unconfigured (no `SEO_ENGINE_URL`, no `SEO`): `/blog`, `/work`, `/videos`
  render 200 with their empty states and `noindex`; the footer shows the
  fallback profile; the sitemap lists only the site's own pages
- configured: `/blog` lists the fixture posts newest first with `href` =
  `post.path`; `/blog/<slug>` has one `<h1>`, the engine's canonical, one
  hreflang per locale plus `x-default`, the JSON-LD, and every `compose()`
  item kind rendered; an unknown slug is 404; a stub 500 on the single read
  is a thrown error (5xx), not a 404
- `/work` shows the fixture projects with service chips; `/work/<slug>`
  shows the write-up HTML unchanged, the photos in order, "Visit" only
  when `link` is a string; a project answering a different `path` redirects
- `/videos` with a binding that has `videos` lists them; over `http()` it
  is empty; `preload="metadata"` and `controls` present
- the manifest is exactly `{ version: 1, kind: "service", has: { intake:
  true, blog: true, projects: true }, renders: {...}, locales: ["en"],
  intake: { fields: ["name","email","message"] } }` and spec 001's
  intake tests still pass with it
- off the production host, every engine image URL is `/media/<key>`; on
  it, the transform URL as given

## Slice B — hosting cutover and delivery (this repo, after A, its own commits)

**Owns:** `scripts/export-portfolio.mjs` (first commit), `vite.config.ts`,
`wrangler.jsonc`, `worker/index.ts`, `env.d.ts`, `.dev.vars.example`,
`next.config.mjs`, `tsconfig.json`, `package.json`/`package-lock.json`
(everything but the kit line), `app/api/contact/route.ts`,
`app/lib/platform/env.ts` (body swap only), `app/lib/legacy-redirects.ts`,
`app/lib/cache-policy.ts`, `app/components/Header.tsx` (`/projects` →
`/work` in `navLinks` only), the removals listed in `plan.md` §1,
`public/images/projects/**` (the three moved heroes), `tests/**` (smoke),
`vitest.config.ts` (two projects: `test/` in Node, `tests/smoke` against the
built Worker), `.github/workflows/ci.yml`, `docs/delivery-pipeline.md`,
`.gitignore`, `README.md`, `.env.example`, this file's B ticks.
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
  versions and any hold with its reason goes HERE and in the PR body
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
  both custom-domain routes and the `SEO` service binding present in the
  generated config
- `grep -r payload\|mongodb\|@aws-sdk\|sharp package.json app` finds nothing
  but the export script

### B6 — versions landed (filled by the builder)

| Package | Was | Now | Hold? Why |
|---|---|---|---|
| | | | |
