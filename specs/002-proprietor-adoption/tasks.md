# 002 — Tasks

Slices with non-overlapping files. Every slice: failing tests first; use
context7 for every library and platform fact; no secrets anywhere (the Vault
token is expired by design for builders); never merge, never push to `main`
or `develop`, never deploy, never touch live infrastructure; commits end with
`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; the global
pre-commit secret scanner stays on (no `--no-verify`); scratch files in the
scratchpad, never in a repo; no sub-agents unless essential; research only
what you use; a lean report.

**Status 2026-10-16.** D1 decided: the hybrid on Vercel. The cutover slices
(vinext port, Payload/Mongo/S3 removal, Worker config, Workers delivery
path) are **cancelled**, as are the project-specific halves of E and A. What
is built: E1–E4 (videos on the site, engine + kit 0.7.0) and A1, A2, A4,
A5, A6 (blog, videos, footer profile, sitemap, manifest). Slice D (the
engine door, D14) is designed, not started.

## Slice E — engine spec 028 (`~/worktrees/seo-engine-jrcodex-adoption`, branch `028-portfolio-site`, PR against `main`)

**Owns:** `specs/028-portfolio-site/**`, `migrations/0034_*.sql`,
`src/video/store.ts` (show/hide), `src/render/sites.ts` (videos, media
Range), `src/sites-entrypoint.ts`, dashboard `apps/dashboard/app/actions/videos.ts`
and `apps/dashboard/components/videos/**` (the toggle),
`packages/seo-kit/**` (0.7.0), `test/architecture.test.ts` where it pins the
Sites method list, and the tests for each.
**Does not touch:** the rest of `src/video/*`, the agents Worker,
`wrangler*.jsonc`, deploys, `./deploy`, projects.

- [ ] E1 spec `specs/028-portfolio-site/spec.md` (short; cites the site's
  spec 002; says projects are out of scope for this site and why)
- [ ] E2 videos, engine side: migration 0034 `cuts.shown_on_site_at TEXT`;
  `showOnSite`/`hideFromSite` in `src/video/store.ts` (ready cuts only, the
  business's own, idempotent); `Sites.videos(siteKey)` per `plan.md` §2.2;
  `Sites.media(siteKey, key, opts?: { range?: string })` serves a shown
  render key with Range (206, `content-range`, `accept-ranges: bytes`; HEAD
  answers headers) and refuses a hidden or removed one; the architecture
  test's method list
- [ ] E3 dashboard: "Show on site" / "Hide from site" on a ready cut, shown
  only when the business has a `sites` row; plain words on refusal
- [ ] E4 kit 0.7.0: `VideoSummary`, `videos()` on `SeoClient` and
  `SitesBinding`, `rpc()` AND `http()` (`GET /v1/videos`; `GET /v1/media/<key>`
  forwards the `range` header and passes a 206 through), `mediaHandler`
  forwards the request's `range` as `media(key, { range })`, README, version
  bump (tagging and `npm stage approve` are Tobias's)
- [ ] ~~E5, E6 (projects link, headings, import)~~ cancelled with D1
- [ ] E8 (PR #12's review) a shown clip answers `public, max-age=300`, no
  `immutable`, full and ranged; `videos` joins MODULES, the control plane's
  list, the dashboard registry and the kit's `Module`; "Show on my website"
  only when the site's announced manifest declares `videos` (hide always
  allowed); the nits: a case-insensitive range unit, a reversed range served
  whole; README lines; spec 028 updated
- [ ] E7 PR against `main`; body ends with the attribution line

**Acceptance tests (written first):**
- `videos(siteKey)` lists only cuts that are `ready`, not removed and shown,
  newest first; another business's shown cut never appears; hiding removes
  it and `media(renderKey)` answers null afterwards; a draft or failed cut
  cannot be shown (plain words)
- `media(renderKey, { range: "bytes=0-99" })` answers 206 with
  `content-range: bytes 0-99/<size>` and 100 bytes; without a range, 200
  with `accept-ranges: bytes`; a gallery key is unaffected
- the kit's `http()` and `rpc()` tests cover `videos()` and the Range
  passthrough on both transports; `npm test` (engine: workers +
  architecture) and the kit's tests pass

## Slice A — the site's platform modules (this repo, branch `feat/proprietor-adoption`)

On today's Next.js build; every page renders with the platform unconfigured;
`http()` is the production transport.

**Owns:** `app/(app)/blog/**`, `app/(app)/videos/**`, `app/media/[...key]/route.ts`
(the engine's images and video, added at the audit: www.jrcodex.dev is not
proxied by Cloudflare, so `/cdn-cgi/image/` exists on none of its hosts),
`app/components/platform/**`, `app/components/Footer.tsx`,
`app/components/Header.tsx` (the `navLinks` array only),
`app/(app)/layout.tsx` (mounting `<Footer/>`, the `showVideos` prop, and the
subtree's `revalidate`), `app/lib/platform/**`,
`app/lib/site.ts`, `app/lib/intake/manifest.ts`, `app/sitemap.ts`,
`app/robots.ts`, `test/**`, `package.json`/`package-lock.json` (adding the
kit at 0.6.2 exact and nothing else; existing versions are the upgrade
lane's), this file's A ticks.
**Does not touch:** `app/globals.css`, page copy of existing pages, the
contact page, `app/lib/intake/{engine,handle,form,turnstile}.ts`,
`app/api/**`, `payload.config.ts`, `collections/`, `app/(app)/projects/**`,
`app/lib/getProjects.ts` (read by the sitemap, never edited).

- [x] A1 (`948d1fa`) kit 0.6.2; `app/lib/site.ts` (SITE_URL, LinkedIn/GitHub, fallback
  profile "Juan Ramirez"); `app/lib/platform/{env,client,reads,images,videos}.ts`
  (`env.ts` returns `process.env` and is the only reader of it); manifest
  `has: { intake: true, blog: true }` + `renders` (`videos: true` added after
  PR #12's review, see A7); the stub extended with the
  read routes and fixtures
- [x] A2 (`3440185`, with `app/media/[...key]/route.ts`) `/blog` and `/blog/[slug]`: `postMetadata`, `postJsonLd`,
  `compose(post, { supports: manifest.renders })` mapped to plain components;
  the manifest's `renders` says exactly what A2 maps
- [ ] ~~A3 `/work`, `has.projects`~~ cancelled with D1
- [x] A4 (`156e481`; the layout hands Header a `showVideos` boolean from `showVideosInNav()`) `/videos`: `<video controls preload="metadata">` per cut, title,
  duration; empty → nothing visible and `noindex`; the nav shows "Videos"
  only when the list is non-empty (say how); the shim reads `client.videos()`
  when the kit has it, else the binding's `videos`, else `[]`
- [x] A5 (`9daf18a`) footer with the profile (name, email, LinkedIn, GitHub) and the
  fallback when unconnected; `sitemap.ts` (the site's pages, `/projects` and
  each `/projects/<id>` through the existing `getProjects()`, every post;
  videos never) and `robots.ts`
- [x] A6 tests green: `npm test`, `npx tsc --noEmit`, the Next build with the
  platform unconfigured

- [ ] A7 (after PR #12's review) `has.videos: true` in the manifest; a test
  that `/media` forwards the engine's Cache-Control verbatim (a clip's
  `public, max-age=300`, an image's year-long `immutable`)

**Acceptance tests (written first), against the stub over `http()`:**
- unconfigured: `/blog` and `/videos` render 200 with their empty states and
  `noindex`; the footer shows the fallback profile; the sitemap lists the
  site's own pages and projects only
- configured: `/blog` lists the fixture posts newest first with `href` =
  `post.path`; `/blog/<slug>` has one `<h1>`, the engine's canonical, one
  hreflang per locale plus `x-default`, the JSON-LD, and every `compose()`
  item kind rendered; an unknown slug is 404; a stub 500 on the single read
  is a thrown error (5xx), never a 404
- `/videos` with a client or binding that has `videos` lists them; over kit
  0.6.2's `http()` it is empty; `preload="metadata"` and `controls` present
- the manifest is exactly `{ version: 1, kind: "service", has: { intake:
  true, blog: true }, renders: {...}, locales: ["en"], intake: { fields:
  ["name","email","message"] } }` and spec 001's intake tests pass with it
- off the production host every engine image URL is `/media/<key>`; on it,
  the transform URL as given

## Slice D — the engine door (D14) — designed, NOT started

`plan.md` §9. Its own spec in `~/seo-engine` (029), its own PR, Tobias's
explicit go before any deploy: a new public surface.

## Cancelled 2026-10-16 with D1

Slice B (vinext port, Payload/Mongo/S3/SES removal, `wrangler.jsonc`,
Workers Builds, smoke harness, dependency currency pass), slice B′ (OpenNext
+ Payload on D1/R2), E5–E6, A3, the export/import scripts, and the parked
`dns.tf.pending`, `redirects.tf.pending`, `jrcodex-admin-access.tf.pending`
(deleted). The three parked files that remain are the mail pair and the
Turnstile widget.
