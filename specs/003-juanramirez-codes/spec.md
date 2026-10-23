# 003 — juanramirez.codes: the portfolio as a Proprietor tenant

Status: **pivoted 2026-10-21, re-stacked 2026-10-22, built on this branch**
(`spec/juanramirez-codes`, draft PR #6). Nothing is merged, deployed,
uploaded to Cloudflare or changed in DNS. The first version of this spec
(2026-10-20) proposed Payload on Workers and a hosting spike; Tobias decided
on 2026-10-21: **no Payload**, and on 2026-10-22: **Hono + hono/jsx + htmx**,
the leanest stack (his BASTION site's), instead of vinext. The site is one
small Worker that reaches the Proprietor engine through a `SEO` service
binding with `rpc()` (no public engine door) and gets every dynamic part
from `@jrcodex/seo-kit`. montano-btm stays the model for the engine wiring
(manifest, write host, cache policy, stub-engine smoke tests), not for the
framework.

Companion documents: `domain-model.md` (contexts, the ports, the gaps),
`plan.md` (architecture, contracts, the spike's evidence, parked
infrastructure, the owner runbook), `tasks.md` (the slices as built, and the
ones that wait on other lanes).

## 1. What changes

**Before.** www.jrcodex.dev: Next.js 16 on Vercel, Payload 3.75 on MongoDB
Atlas and S3. Five open PRs on top (#1 contact → Inquiries, #2 lint, #3
Payload 3.91, #4 the hybrid's platform pages, #5 the 2026 design system).
The older BASTION portfolio (a Hono + htmx Worker, source lost) is exported
to `~/backups/juanramirez-portfolio-2026-10-19/content.json`.

**After.**

```
  juanramirez.codes  ONE Worker: Hono 4 + hono/jsx (server-rendered HTML), htmx 4 on /contact only,
                     bundled by wrangler; static files from Workers static assets; no database, no bucket
  ├── /                  home: who, what I build, selected work, writing, contact
  ├── /about             narrative, experience, credentials (static, in the repo)
  ├── /work              projects: a typed port, placeholder adapter until engine spec 030
  ├── /blog, /blog/<s>   posts                ─┐
  ├── /videos            shown clips (fallback)│  Proprietor engine, Sites entrypoint
  ├── /media/<key>       engine media          │  rpc(env.SEO, SEO_SITE_KEY) over the SEO
  ├── /contact           form → POST /contact (htmx, or a plain post) → inquire() → his dashboard's inquiries
  ├── footer + about     profile() (name, email); links: a port until spec 030
  └── announce(manifest) once per isolate, production host only
       { has: { blog, intake, videos? }, renders, locales: ["en"], intake.fields }

  jrcodex.dev: left as it is (Tobias, 2026-10-22). No redirect, nothing changes on the old Vercel site.
  /projects, /projects/<x>     ──301──▶ /work    (the old site's paths; the Worker answers)
```

What the site does **not** have any more: Payload, an admin, a database, a
bucket, MongoDB, S3, `sharp`, Vercel. Content the owner edits (posts, his
profile, projects once spec 030 lands, videos) lives on the engine and is
edited in his Proprietor dashboard, like every other tenant's. The narrative
pages (home, about) are code, reviewed in PRs.

### 1.1 Payload on Workers: evaluated, measured, not chosen

The spike (`spike/payload-on-workers/`, removed from the tree; history keeps
it at `8ef58ed`, the last commit as written, and `3883cef`, the working tree
it was measured from) ran Payload's official `with-cloudflare-d1` template
through `@opennextjs/cloudflare` with D1 and R2, locally in workerd:

| What | Measured |
|---|---|
| Build | only with `next build --webpack`, as the template's v3.91.0 tag does; Turbopack's hashed externals broke OpenNext's dependency trace |
| Build cost | 52 s at a 4.2 GB memory peak |
| Output | 60 MB `.open-next` |
| `GET /` (workerd, local) | 0.53 s cold, ~26 ms warm median |
| Admin | 200; first-register, login and a D1 write worked |
| R2 upload | **unfinished**: the D1 migration predated the R2 storage plugin, so the `media` table lacked `_objectKey` |
| Copy errors | three bugs came from copying the template's `main` branch (already the 4.x API, e.g. top-level `storage`) onto 3.91 |

Why not chosen (Tobias, 2026-10-21, with these numbers): a 60 MB Worker and
a 4 GB build to serve a handful of pages; a second content system beside the
engine he already runs for clients, with its own auth, migrations and
upgrade train (Payload 4 is in beta); and an admin he would have to keep
locked. The tenant route reuses the engine, its dashboard, its inbox and its
security posture, and makes the portfolio the platform's second real site.
No remote preview was run (Vault was sealed); as far as known the spike
created **no Cloudflare resources** — verify after Vault is unsealed
(`plan.md` §7).

### Facts this rests on (checked 2026-10-21/22)

- **Versions** (`npm view`, 2026-10-22): hono 4.13.13, htmx.org 4.0.0 (`next`
  tag; `latest` 2.0.11), wrangler 4.151.3 (workerd 1.20261019.1), TypeScript
  7.0.2, vitest 5.0.5, `@jrcodex/seo-kit` **0.6.2** (`latest`; 0.7.0 with
  `videos()` is built in `~/seo-engine/packages/seo-kit` and unpublished).
  Considered and not used (R0): honox 0.1.62, @hono/vite-build 1.11.1,
  @hono/vite-dev-server 0.26.1; vinext 1.3.0 was the stack until 2026-10-22.
- **Kit 0.6.2's modules** are `blog intake commerce email gallery projects
  chat catalog`. There is no `profile` module: `profile()` is always
  readable. There is no `videos` module in the kit's type; the engine's
  catalogue gained `videos` in engine spec 028.
- **Engine spec 028**: `Sites.videos(siteKey)` answers the shown clips;
  `src` is `/media/<slug>/video/renders/<id>.mp4`, served with
  `cache-control: public, max-age=300` — **never `immutable`**, because
  "Hide from my website" must reach caches within five minutes.
- **Workers Cache** (developers.cloudflare.com/workers/cache, read
  2026-10-21 through context7): with `cache.enabled`, Cloudflare strips a
  `Range` header before invoking the Worker, stores the full 200 and slices
  the 206 itself; a 206 returned by the Worker is never stored. So the site
  needs no Range code for video: it returns the engine's whole file with the
  engine's header, and seeking works at the edge.
- **Hono 4.13.13** (`npm view hono version`): `hono/jsx` renders HTML on the
  server (async components awaited by `c.html()`); `jsxImportSource:
  "hono/jsx"` in `tsconfig.json`; Workers static assets serve `public/`
  before the Worker runs (hono.dev, Cloudflare Workers guide, via context7).
  Hono's docs recommend Vite + `@cloudflare/vite-plugin` for full-stack apps
  that bundle client scripts; this site has none to bundle (R0).
- **htmx 4.0.0** was released 2026-08-28 and is on npm's `next` tag; `latest`
  is still 2.0.11, so it is installed as `htmx.org@4.0.0` exactly. Read in the
  v4 docs (context7 `/bigskysoftware/htmx/v4.0.0`): attribute inheritance is
  opt-in (`hx-target:inherited`); **every response is swapped except 204 and
  304** (errors included); events are `htmx:after:request` etc. with
  `event.detail.ctx`; `hx-disable` disables elements during a request;
  requests carry `HX-Request: true`.
- **Workers static assets** (developers.cloudflare.com, via context7): a
  `_headers` file in the assets directory sets headers on asset responses
  only; the default is `public, max-age=0, must-revalidate` with an ETag.
  Wrangler `rules` of type `Text` import other files (here: CSS) as strings.
- **Image transformations** answer at `/cdn-cgi/image/<options>/<source>`
  only on a zone where they are enabled (Images → Transformations), never on
  `*.workers.dev`.
- **Cross-document view transitions**: `@view-transition { navigation: auto; }`
  in both documents, same origin only (MDN).
- **The engine has no public address** (`~/seo-engine/docs/security-posture.md`,
  since 2026-10-05). A site reaches it only through the service binding.
- **juanramirez.codes** is registered at Namecheap; its Cloudflare zone was
  deleted after 28 days pending (2026-10-04). Until the zone is re-declared
  and the nameservers switched (owner steps), the site lives on preview URLs.

## 2. Decisions

### 2.1 Decided here (reversible; recorded with reasons)

| # | Decision | Why |
|---|---|---|
| R0 | **Plain Hono, bundled by wrangler: no Vite, no HonoX.** Server-rendered `hono/jsx`; htmx 4 for the contact form only; no `hono/jsx/dom` islands (the theme toggle and the form's Turnstile reset are a few lines of plain JS). CSS is imported as text (wrangler `Text` rule) and served by the Worker at a content-hashed URL, `immutable`; fonts and htmx are static assets with an `immutable` `_headers` rule. | Tobias asked for the leanest stack. Nothing on the site needs a client bundle, so Vite would add a toolchain to build nothing; wrangler already bundles the Worker and is what the smoke tests run. HonoX is pre-1.0 (0.1.62): a meta-framework to justify, for eight routes, on a stack the platform may adopt. Add Vite + `@cloudflare/vite-plugin` the day a page needs a `hono/jsx/dom` island. |
| R1 | **Rebuild the repo on this branch as the Hono Worker**, superseding PRs #1–#5. Reusable code is copied with attribution in each file's header; their branches are never pushed to. | Four of the five PRs build on Payload/Mongo/Vercel, which this spec removes; merging them first means migrating twice. What survives is code, not history: the intake handler and Turnstile check (#1, #4), the platform reads and the videos shim (#4), the design system (#5). |
| R2 | **PR #5's design system is kept** (palette, tokens, type scale, primitives, feature gates, contrast pairs), re-branded to Juan Ramirez. | Judged in `plan.md` §5: it holds up. Its tests come along and pass here; axe runs against this build. |
| R3 | **Projects wait behind a port** (`lib/projects/port.ts`); `/work` renders the placeholder adapter. The manifest does **not** declare `projects` yet. | Engine spec 030 (another session) defines content models as data; its contract shapes are not forwarded yet. Declaring `projects` now would put a Projects screen on his dashboard for pages that do not render it. |
| R4 | **`videos` is declared only when the site can read videos**: `manifestFor({ videos })`, where `videos` is true when the kit client or the binding has a `videos` function. `/videos` shows an empty state otherwise. | Kit 0.6.2 has no `videos()`; PR #4's structural shim reads the binding directly. "Never declare what the site does not have." |
| R5 | **No `profile` word in the manifest.** The footer and contact page read `profile()`; the GitHub/LinkedIn links come from a port with a static adapter until spec 030's profile links exist. | `profile` is not a module (kit 0.6.2); an unknown word is "left out, never refused, and a person is asked what it is" — noise in his review queue. |
| R6 | **Workers Cache on** (`cache.enabled`), policy per response in `lib/cache-policy.ts`. | Tobias wants Workers-native features where they fit; the policy object already exists in montano-btm. |
| R7 | **The canonical paths** are `/`, `/about`, `/work`, `/blog`, `/blog/<slug>`, `/videos`, `/contact`; `/projects*` answers 301 → `/work`. | `/work/<slug>` is what the engine's Projects module produces for every tenant; the old site's `/projects` links keep working. |
| R8 | **English only** (`locales: ["en"]`, unprefixed). | One audience; the engine's first locale must equal the site's default. |

### 2.2 Decisions for Tobias

Each with a recommendation. Nothing below is assumed; where the site needs
an answer to render, it renders the recommended default and the decision
says so.

| # | Decision | Recommendation |
|---|---|---|
| **D1** | **Merge this PR in place of #1–#5**, then close those five as superseded. | **Yes.** Their reusable parts are in this tree with attribution; the rest is Payload/Vercel work this spec removes. Close, do not delete, the branches (history). |
| **D2** | **Domain.** `juanramirez.codes` canonical. **jrcodex.dev: left as it is (Tobias, 2026-10-22)**: no redirect, nothing goes to the old Vercel site; this site replaces it rather than taking over its address. | Decided. Owner steps in `plan.md` §8: zone re-declared, nameservers at Namecheap within 28 days. |
| **D3** | **Engine tenant**: a business row and a site key for origin `https://juanramirez.codes`. Slug `juanramirez`. | **`juanramirez`** (the name says what it is; `jrcodex` stays the npm scope). Minted by the engine lane; the key goes to Vault, then `wrangler secret put` through stdin. Until then the site renders its fallbacks (empty blog, the site's own profile). |
| **D4** | **The visible e-mail address.** | **`juan@proprietor.systems`** as the fallback profile's address (exists, delivers to his inbox) until his business profile on the engine says otherwise; the profile's email wins when set. |
| **D5** | **Client work on `/work`.** | **montanobtm.com named and called live** (the only one allowed). Every other client build appears only as an anonymised placeholder ("a Houston garage-door company"), each **flagged for his per-client yes/no**; nothing client-specific renders until spec 030 lands and he writes them. Three Chicks stays out; "Gilded Shear Production-Grade" stays out. |
| **D6** | **Naming his employer.** Pulse is built for the repair shop he works at. | **Say "the computer repair shop I work at in Houston"** until he says the shop's name may appear. The repos are private either way, so no repo links. |
| **D7** | **Credentials and education on `/about`.** | **Only what is verified:** AWS Certified Cloud Practitioner (earned); studying named as studying. Education as coursework, never a degree. The earlier copy's "CISSP Domain Mastery", "production-grade" and "I ship production systems for real businesses" are not carried over. |
| **D8** | **Résumé.** The repo's PDF is dated September 2025. | **Not linked** until he provides a current one; the about page carries the same facts. |
| **D9** | **Portrait.** The BASTION export has one (126,760 B). | **No photo in this build** (the layout reserves none; nothing to shift). Add one later as a static asset if he wants a face on the page. |
| **D10** | **Theme default.** PR #5 is dark by default with a light toggle. | **Keep dark by default, with the toggle**; the light scheme passes the same contrast checks. Following the OS preference instead is a one-line change if he prefers it. |
| **D11** | **CI and previews.** | **Workers Builds** (parity with the client sites; no Cloudflare token in GitHub), with `preview_urls: true` behind the account-wide previews Access app. The GitHub Actions workflow in this PR only typechecks, builds and tests. |
| **D12** | **"Write my own post" (spec 030's blog mode).** | **Use it** for the case studies' long forms once the engine ships it; until then `/blog` renders whatever the engine publishes. |

### 2.3 What Next.js gave for free, now this site's own (kept small)

| Concern | Here |
|---|---|
| Titles, meta description, canonical, Open Graph, Twitter card | `src/views/document.tsx` from a `PageMeta` per route; a post's from the engine's `Post` (title, excerpt, canonical, alternates, JSON-LD) since the kit's `./next` helpers only shape Next metadata objects |
| `sitemap.xml`, `robots.txt` | routes in `src/routes/seo.ts`; own pages + `sitemap()` entries, absolute on `SITE_URL` |
| 404 and 500 pages | `app.notFound` and `app.onError` render the site's own pages (no stack traces) |
| Redirects | `/projects*` → `/work` (301) in the Worker, from tenant data; jrcodex.dev is left as it is (D2) |
| Cache-Control per route | `lib/cache-policy.ts` on every Worker response; `_headers` on static assets; never `immutable` on `/media/<slug>/video/*` |
| Image resizing | the engine's `/cdn-cgi/image/` URLs on the production zone once it is proxied and transformations are enabled; originals elsewhere |
| Asset fingerprinting | the CSS's content hash in its URL (R0) |
| HTML escaping | `hono/jsx` escapes every string; engine HTML (already filtered by the engine) is inserted with `dangerouslySetInnerHTML` only in the post body |
| RSS | not now: the engine has no feed and the blog is empty; add `/feed.xml` from `posts()` when there are posts (W7) |

## 3. Budgets and gates

| Budget | Target | How it is checked here |
|---|---|---|
| LCP | < 2.0 s, mobile, 4G (Lighthouse simulated: 150 ms RTT, 1.6 Mbps, 4× CPU) | `tests/perf/perf.test.ts` (Lighthouse 13 default mobile profile) against the Worker in workerd, on all seven pages |
| CLS | < 0.05 | the same run |
| INP | < 200 ms | lab proxy: the same run's TBT (< 200 ms), plus a Playwright timing on the theme toggle (`tests/a11y`) |
| Accessibility | WCAG 2.2 AA | `tests/a11y` — axe-core (`wcag2a wcag2aa wcag21a wcag21aa wcag22aa`) through Playwright on every public route, dark and light, 320 px and 1280 px: 0 violations; the contrast pairs re-checked by `tests/unit/design.test.ts` |
| Weight | no third-party script except Turnstile on `/contact`; fonts self-hosted | smoke tests assert the script origins per page |

## 4. What the site renders, and from where

| Page | Source | When the engine cannot answer |
|---|---|---|
| `/` | `content/` (the narrative), `readPosts()` for the three newest posts, `ProjectsPort.list()` for selected work | posts section hidden; work shows the placeholder cards |
| `/about` | `content/about.ts` | — (static) |
| `/work` | `ProjectsPort.list()` | placeholder adapter: the flagship projects as static cards from `content/work.ts`, each marked as a summary; client work only montanobtm.com + anonymised placeholders (D5) |
| `/blog`, `/blog/<slug>` | `posts()`, `post()`, `compose()` | unconnected: an empty-state list, 404 for a post; connected and failing: 5xx (crawlers retry) |
| `/videos` | `readVideos()` (fallback chain, R4) | empty state |
| `/contact` | form + `profile()` email | fallback profile (D4) |
| footer | `profile()` name, email; `ProfileLinksPort` | the site's own facts |
| `/sitemap.xml` | own pages + `sitemap()` | own pages only |
| 404 / 500 | the site's own pages | — |
| `/robots.txt` | static | — |

## 5. Proprietor integration

- **Transport**: `rpc(env.SEO, env.SEO_SITE_KEY)` over
  `services: [{ binding: "SEO", service: "seo-engine", entrypoint: "Sites" }]`.
  No `http()`, no `SEO_ENGINE_URL`.
- **Manifest** (`lib/seo.ts`): `version 1`, `kind: "service"`,
  `has: { blog: true, intake: true }` plus `videos: true` when readable (R4),
  `renders` = every `compose()` item and all three placements,
  `locales: ["en"]`, `intake.fields: ["name", "email", "message"]`.
- **Writes** (announce, inquire) only from requests whose host is
  `ENGINE_WRITE_HOST` (`juanramirez.codes`); previews and local runs never
  write. Turnstile is verified before `inquire()`.
- **Reads** allowed from any host. Off the production host, post images point
  at their stored originals (`/media/<key>`), since `/cdn-cgi/image/` answers
  only on the proxied zone.
- **`compatibility_date`** ≥ 2026-04-21 so `InquiryRefused.retryAfterSeconds`
  crosses the binding.
- **Cache** (`lib/cache-policy.ts`): engine images `immutable`; a visitor's
  private media `private, max-age=86400`; **`/media/<slug>/video/*` keeps the
  engine's `Cache-Control` verbatim and is never made `immutable`**; public
  pages `public, max-age=0, s-maxage=60, stale-while-revalidate=600`;
  everything else `private, no-store`.
- **Secrets**: `SEO_SITE_KEY`, `TURNSTILE_SECRET_KEY` as Worker secrets from
  Vault through stdin. `TURNSTILE_SITE_KEY` is a public var.

## 6. The open PRs

| PR | Verdict | What this tree reuses (attributed in file headers) |
|---|---|---|
| #1 `feat/platform-intake` | superseded | the intake flow and Turnstile check (`lib/inquiry/*`) |
| #2 `fix/lint-eslint-css-order` | superseded | nothing (the lint setup was for Next/Payload) |
| #3 `chore/upgrade-2026-10` | superseded | nothing (Payload upgrade) |
| #4 `feat/proprietor-adoption` | superseded | platform reads + shape checks, the videos shim, image rewrite, manifest shape (`lib/platform/*`) |
| #5 `design/jrcodex-2026` | superseded | the design system (`styles/*.css` from `app/styles/*`, `design-system.json`, the contrast test); its React components are re-written as server-only `hono/jsx` components, its 12 client components as plain HTML (native `<dialog>`, CSS view transitions) or a few lines of plain JS |

## 7. The old content

Carried, rewritten for truth: the about narrative's facts, the stack lists
(as "what I use", only what the repos show), the reading list from PR #5.
Dropped: BASTION branding, "$ Hello from the CMS!", Three Chicks (project and
case study), the two test posts, the placeholder social links, the
certifications list's unverifiable rows (D7). The old repo's
`app/lib/project-data.ts` entries are not carried (WeatherWise AI and WeFix4U
can return as "earlier work" through the dashboard once spec 030 exists).

## 8. Content plan

Audience: hiring managers and engineers reviewing a self-taught candidate for
software engineering roles. Voice: first person, plain words, numbers only
with a source, no superlatives. Every claim on the site is in `plan.md` §6's
table with the command or file it came from; anything not there is not on
the site.

The flagship stories, in order: **Proprietor Systems** (the multi-tenant
platform), **proprietor-mail** (public, Apache-2.0, built and tested, not
deployed), **the platform** (one node, k3s, Vault, Argo CD, restic),
**Fluency**, **Pulse Agent / Pulse Diagnostics**. Client work: montanobtm.com
(live) and anonymised placeholders (D5).

## 9. Design direction

PR #5's system, re-branded (R2): dark sage-blue by default with a light
toggle (D10), Source Serif 4 headings and Inter text (self-hosted, latin
subset, preloaded), one fluid type scale, gold only for action, status
badges `live` / `built` / `in progress` (never "production").

## 9.1 What could not be verified

- HTMX 4's behaviour beyond what its v4 docs state was not exercised in a
  real browser against Turnstile's widget until the a11y/perf runs; those
  runs use Cloudflare's test keys, never a real widget.
- Workers Cache's Range slicing for video was read in the docs, not observed:
  no remote preview could run (no token; Vault sealed).
- Whether the deployed engine's `Sites` entrypoint already answers
  `videos()` (engine spec 028's state on production) was not checked; the
  shim handles both answers.

## 10. Acceptance (this branch)

- [x] Spec pivoted; the spike's evidence recorded; spike removed in one commit.
- [x] `npm run typecheck`, `npm test` (158 unit + 24 smoke, the Worker in
      `wrangler dev` with a stub engine), `npm run build` (`wrangler deploy
      --dry-run`, which uploads nothing): green, run through `boxed`.
- [x] axe 0 violations on every route, both schemes, two widths (28 runs).
- [x] Lighthouse budgets met locally (§3): LCP 1.52–1.69 s, CLS 0, TBT 0;
      `plan.md` §9.
- [x] PR #6's body: the pivot, what is built, what waits, decisions, teardown.
