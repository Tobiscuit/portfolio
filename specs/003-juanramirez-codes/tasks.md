# 003 — Tasks

One builder worked this branch directly (no parallel builders), so slices
are ordered rather than parallel. Each was written test-first: the tests
named under "Acceptance" were written and seen failing, then made to pass.
Every build and test run goes through `boxed` with a `timeout`.

## Built on this branch

### T0 — Pivot (done)
- Commit the spike's last working tree (`3883cef`), remove `spike/` in one
  commit citing `8ef58ed` (`d9ddbcb`), rewrite this spec set, retire the
  admin Access file, re-target the other parked Terraform.

### T1 — Scaffold the Worker
- **Inputs**: montano-btm (develop) `vitest.config.ts`, `wrangler.jsonc`,
  `worker/index.ts`; context7 for Hono, htmx 4, Workers static assets and
  Workers Cache. (Re-stacked 2026-10-22 from vinext to Hono, R0.)
- **Contract**: plan §1; `build` = `wrangler deploy --dry-run --outdir dist`.
- **Acceptance**: `tests/unit/config.test.ts` — `wrangler.jsonc` has the
  `SEO` binding to `seo-engine`/`Sites`, `cache.enabled`, `workers_dev:
  false`, `preview_urls: true`, the custom-domain route for `SITE_HOST`,
  `ENGINE_WRITE_HOST === SITE_HOST`, a `compatibility_date` ≥ 2026-04-21, no
  D1/R2/KV, `assets.directory` = `./public`, a `Text` rule for CSS;
  `package.json`'s `build` is a dry run and never mentions `npm run`.
- **Owns**: root config files, `.gitignore`, `.dev.vars.example`, `.nvmrc`.

### T2 — Engine side: manifest, client, cache policy
- **Acceptance**: `tests/unit/seo.test.ts` (manifest keys exactly `blog`,
  `intake` (+ `videos` when readable), never `projects`; `intake.fields`
  equals the form's; `mayWriteToEngine` only on the write host;
  `announceInBackground` never throws), `tests/unit/cache-policy.test.ts`
  (one test per row of plan §3, including "a video is never immutable").
- **Owns**: `lib/seo.ts`, `lib/cache-policy.ts`, `lib/site.ts`.

### T3 — Platform reads (ACL), images, videos shim
- **Inputs**: PR #4 `app/lib/platform/{client,images,videos}.ts`.
- **Acceptance**: `tests/unit/platform.test.ts` — malformed answers dropped
  or thrown as specified; unconnected ⇒ empty / fallback; `plainPost`
  rewrites html, blocks, hero and JSON-LD; the videos chain in order.
- **Owns**: `lib/platform/*`.

### T4 — Intake
- **Inputs**: PR #4 `app/lib/intake/*` (from PR #1), montano-btm `lib/turnstile.ts`.
- **Acceptance**: `tests/unit/inquiry.test.ts` — every outcome of the flow
  (honeypot, invalid, Turnstile missing/rejected/unavailable/misconfigured,
  preview host, rate-limited with Retry-After, refused, site key, manifest,
  engine error, sent) and that no log line carries the visitor's words or a
  secret.
- **Owns**: `lib/inquiry/*`, `src/routes/contact.tsx`.

### T5 — Ports
- **Acceptance**: `tests/unit/projects.test.ts` (placeholder adapter: no
  `live` except montanobtm.com, no page paths, statuses from the closed
  set), `tests/unit/profile-links.test.ts`.
- **Owns**: `lib/projects/*`, `lib/profile-links.ts`, `content/work.ts`.

### T6 — Design system and shell
- **Inputs**: PR #5 `app/styles/*`, `app/components/ui/*` (re-written as hono/jsx),
  `design-system.json`, `tests/tokens.node-test.ts`, `tests/helpers.ts`.
- **Acceptance**: `tests/unit/design.test.ts` (palette fixed, every
  documented pair meets its minimum, "avoid" pairs really fail).
- **Owns**: `styles/*`, `src/views/*`, `src/assets.ts`, `design-system.json`, `public/*`.

### T7 — Pages
- **Acceptance**: smoke tests per route (status, one `h1`, landmarks, the
  right Cache-Control, the blog via `compose()` from the stub, the inquiry
  posted through to the stub as an htmx fragment and as a plain form post,
  `/projects` → 301 `/work`, robots and sitemap, 404 page),
  `tests/unit/claims.test.ts` over `content/`.
- **Owns**: `src/routes/*`, `src/app.tsx`, `worker/index.ts`, `content/*`.

### T8 — Budgets
- **Acceptance**: axe 0 violations (both schemes, 320 and 1280 px); Lighthouse
  mobile LCP < 2.0 s, CLS < 0.05, TBT < 200 ms on five routes.
- **Owns**: `tests/a11y/*`, `tests/perf/*`, `.github/workflows/ci.yml`.

## Waiting on other lanes

| # | Task | Waits on | What changes here |
|---|---|---|---|
| W1 | Engine adapter for `ProjectsPort`; `/work/<slug>` pages; declare `projects` | engine spec 030 contract shapes + a kit release | `lib/projects/engine.ts` (new), `app/work/[slug]/page.tsx` (new), `lib/seo.ts` (one key) |
| W2 | Engine adapter for `ProfileLinksPort` | spec 030 profile links | `lib/profile-links.ts` |
| W3 | Kit 0.7.0: replace the videos shim with `videos()` | kit 0.7.0 published | `lib/platform/videos.ts` lookup deleted; `package.json` |
| W4 | Tenant row + site key | engine lane (D3) | none in code; secrets per plan §8 |
| W5 | Turnstile widget, zone, redirect | Tobias (plan §8) | `wrangler.jsonc` `vars.TURNSTILE_SITE_KEY` |
| W6 | "Write my own post" | spec 030 blog mode | none: `/blog` renders what the engine publishes |
| W7 | RSS `/feed.xml` | posts exist | a route over `posts()` |
