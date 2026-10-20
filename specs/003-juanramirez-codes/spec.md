# 003 — juanramirez.codes: the portfolio on Cloudflare Workers

Status: **proposal, written 2026-10-20** for a decision checkpoint. This phase
delivers a working hosting spike (`spike/payload-on-workers/`), this spec set
(`spec.md`, `domain-model.md`, `plan.md`, `tasks.md`) and a recommendation.
It does not build the site. Nothing is deployed, merged or changed in DNS.

Companion documents: `domain-model.md` (the DDD pass and its gaps), `plan.md`
(architecture, the spike's measurements, contracts, parked infrastructure, the
owner runbook), `tasks.md` (test-first slices for the build phase).

Builds on spec 001 (contact form → platform Inquiries, PR #1), spec 002 (the
hybrid: Payload for the site's own content, Proprietor for blog, videos,
profile, mail; PR #4) and the platform's decision record
`~/seo-engine/docs/decisions/0001-content-layer-workers-native-not-payload.md`
(seo-engine PR #11). Those are not restated here; where this spec changes one
of their decisions it says so.

Tobias's direction (2026-10-16, binding): **the hybrid**, Payload 3.x as the
site's content layer (projects and case studies with real fields, about,
skills, media), Proprietor supplying blog, contact, profile and videos through
`@jrcodex/seo-kit`, a manifest announced. Not a Payload fork; the Payload MCP
plugin waits for an explicit go. **Hosting to validate: Payload on Cloudflare
Workers** (D1 + R2, the official `with-cloudflare-d1` template through
`@opennextjs/cloudflare`), the public site never depending on the k3s node.

## 1. What changes

**Today.** www.jrcodex.dev is a Next.js 16 app on Vercel with Payload 3.75 on
MongoDB Atlas and S3 (`sharp` for image sizes). Four open PRs sit on top of
it (#2 lint, #3 Payload 3.91 + current deps, #1 contact → Inquiries, #4 the
hybrid's pages, #5 the 2026 design system); their trial merge
`wip/integration-2026-10-snapshot` passed every gate on 2026-10-16. The old
BASTION portfolio (a Hono + htmx Worker, source lost) is exported to
`~/backups/juanramirez-portfolio-2026-10-19/content.json`; its media are in
the R2 bucket `bastion-media`.

**After.**

```
  juanramirez.codes  (ONE Worker, Next.js 16 through @opennextjs/cloudflare)
  ├── /                     home: who, proof strip, featured work, writing, CTA
  ├── /work, /work/<slug>   Payload: Projects + case studies  ──┐ D1 (content)
  ├── /about                Payload: Profile global, Skills     │ R2 (media, served at /api/media/file/*)
  ├── /resume               Payload: Media (the PDF)           ─┘
  ├── /blog, /blog/<slug>   posts        ─┐
  ├── /videos               shown clips   │ Proprietor, read over the SEO service binding
  ├── /media/<key>          engine media  │ rpc(env.SEO, SEO_SITE_KEY)  — no public /v1, no door Worker
  ├── /contact, /api/contact inquiry     ─┘ (spec 001's handler; the binding transport it already has)
  ├── /admin                Payload admin (Payload auth; Cloudflare Access in front — parked Terraform)
  └── announce(manifest)    { intake, blog, videos } + renders, canonical host only

  jrcodex.dev, www.jrcodex.dev  ──301 (path kept)──▶  juanramirez.codes          (D2)
```

The site's own content moves from Mongo/S3 to D1/R2 with Payload's own
adapters (`@payloadcms/db-d1-sqlite`, `@payloadcms/storage-r2`, both 3.91.0
today). The platform integration already written for Vercel (PR #4) works
unchanged on Workers because `app/lib/intake/engine.ts` picks `rpc()` when an
`SEO` binding exists; spec 002's go-live blocker D14 (a public "door" Worker
for `/v1`) is **withdrawn**: on Workers the engine is reached privately over
the binding, which keeps the platform's private-engine posture intact.

### Facts this rests on (checked 2026-10-20)

- **Versions** (`npm view`): payload 3.91.0 (`latest`; 4.0.0-beta.3 on
  `beta`), @payloadcms/{next,db-d1-sqlite,storage-r2,richtext-lexical,ui}
  3.91.0, next 16.4.2, react 19.3.1, @opennextjs/cloudflare 1.20.12, wrangler
  4.151.2, @jrcodex/seo-kit 0.6.2 published (0.7.0 with `videos()` built,
  unpublished).
- **Payload's own template** `templates/with-cloudflare-d1` (read from GitHub
  `main`, source in `plan.md` §2): OpenNext, D1 adapter, R2 adapter, a
  console logger because pino-pretty needs Node APIs Workers lacks, `crop`
  and `focalPoint` off "due to lack of sharp", GraphQL "not guaranteed"
  (workerd issue 5175), and the README line "can only be deployed on Paid
  Workers right now due to size limits" (3 MB).
- **The Workers size limit is no longer 3 MB / 10 MB compressed.**
  developers.cloudflare.com/workers/platform/limits, fetched 2026-10-20:
  "Worker size (uncompressed): 64 MiB" on Free and Paid, "There is no
  compressed size limit. Only the uncompressed bundle size counts", and "A
  Worker must parse and execute its global scope … within 1 second". So the
  template README's paid-plan warning is stale on the size side; the live
  constraint is **startup time**, which the spike measures. The account is
  on Workers Paid anyway (CLAUDE.md).
- **OpenNext on Workers**: image optimisation through `next/image` works only
  with a Cloudflare `IMAGES` binding (otherwise the original passes through,
  with a warning); `/cdn-cgi/image/` is served by the network on a proxied
  zone; the R2 incremental cache (`NEXT_INC_CACHE_R2_BUCKET`) is optional and
  needs a self-reference service binding. OpenNext's own fixture notes that
  Cache Components deadlock on Workers with Next 16.3.x; the template is on
  16.4.2 and this site does not use Cache Components.
- **Payload auth on Workers**: cookie JWT with a sessions table (the
  template's migration creates `users_sessions`); `first-register` is open
  only until a user exists. No email adapter → a console adapter, so "forgot
  password" sends nothing (D9).
- **The engine's `Sites` entrypoint** (`~/seo-engine/src/sites-entrypoint.ts`)
  already carries `videos(siteKey)` and `media(siteKey, key, { range })`, so
  the binding path serves videos today with PR #4's structural shim, before
  kit 0.7.0 is published.
- **juanramirez.codes** is registered at Namecheap. The Cloudflare zone
  `cloudflare_zone.juanramirez_codes` declared in `~/cloudflare-infra/mail.tf`
  on 2026-09-06 was never activated (nameservers stayed at Namecheap) and
  Cloudflare deleted it around 2026-10-04; the Terraform state still names
  it, which is why a full `./tf plan` fails (`docs/plan-breakage-2026-10-16.md`,
  parked replacement `mail.tf.pending`). **Only Tobias can switch the
  nameservers at Namecheap**, and he has 28 days from re-declaring the zone.
- **jrcodex.dev** apex (A 76.76.21.21) and `www` (CNAME cname.vercel-dns.com)
  are `proxied = false` (`dns.tf`); a Cloudflare redirect rule needs the
  records proxied.

## 2. Decisions for Tobias

Each with a recommendation. Nothing below is assumed; `plan.md` says what is
built either way.

| # | Decision | Recommendation |
|---|---|---|
| **D1** | **Hosting: Payload on Workers (OpenNext + D1 + R2)**, or the fallback (Payload admin on the node for editing only, the public site on Cloudflare reading D1/R2). | **Workers, if the spike's numbers hold** (`plan.md` §3 has them; the verdict is stated there, not here, so it cannot drift from the evidence). The thresholds: uncompressed bundle well under 64 MiB, measured startup under the 1 s ceiling with margin, cold TTFB on a content page that leaves room for LCP < 2.0 s on 4G, admin login and an R2 upload round trip working in workerd. The fallback keeps the public site off the node either way; it costs a second runtime, a sync of D1/R2 edits from the node, and the "edit from anywhere" admin. |
| **D2** | **Domain.** `juanramirez.codes` canonical; `jrcodex.dev` and `www` 301 to it with the path kept. | **Yes.** It is his name, and the old brand carries his earlier work's copy (the "JRCodex" client business keeps its own name on the dashboard and in the kit's npm scope; nothing there renames). The 301 keeps the LinkedIn/CV links alive. Owner steps: re-declare the zone (parked Terraform, `plan.md` §5) and switch nameservers at Namecheap within 28 days; then proxy jrcodex.dev's apex/www so the redirect rule can run. Until the zone is active the site lives on its preview URL. |
| **D3** | **The three parked jrcodex.dev files** (`jrcodex-mail.tf.pending`, `jrcodex-mail-to-worker.tf.pending`, `jrcodex-turnstile.tf.pending`): re-target to juanramirez.codes, or supersede. | **Supersede the two mail files; re-target Turnstile.** Mail: the site's contact path is the form → Inquiries → his encrypted inbox (spec 001), so no address at jrcodex.dev is needed for the site; his own addresses already live on proprietor.systems since 2026-09-28 (`hello@`, `tobias@`, `juan@`). A public address on the *canonical* domain (`hello@juanramirez.codes`) is a later, separate file, after the zone is active and only if he wants one (D3b below). Turnstile: one widget whose hostnames are `juanramirez.codes` and `jrcodex.dev` for the redirect window; same shape as the parked file, new name `juanramirez-codes-turnstile.tf.pending`. Neither parked file is edited by this work. |
| **D3b** | A visible e-mail address on the site at all. | **Show `juan@proprietor.systems` now** (exists, delivers to his inbox), and move to `hello@juanramirez.codes` only when he wants mail routed on the new zone. Recruiters expect an address; the form alone reads as a wall. |
| **D4** | **Content model** (`§4`): Projects with structured case-study fields, Media, Users, plus globals Profile, Skills, Site. | **As §4.** It keeps PR #3's Projects shape where it is good (title, slug, description, tech, features, order, image, url, caseStudy groups) and adds what the content plan needs: role, period, links, outcomes with sources, status (`live` / `built` / `in progress` / `archived`), featured. |
| **D5** | **Which of PRs #1–#5 to merge, and in what order.** | **Merge all five, in the proven order #2 → #3 → #1 → #4 → #5** (the trial merge passed lint 0 / tsc 0 / 170 Vitest + 34 node:test / `next build` 16 routes on 2026-10-16; recipe in PR #5's comment), then land this spec's slices on top. Reasons per PR in §6. Two caveats: #4 gained two commits after the trial (`dfc0adf`, `a4ad7f7`: videos as a manifest module, `/media` Cache-Control pinned) that must be in the merge; and #4 and #5 are another session's work, so the rebases are copied with attribution, never pushed to their branches. |
| **D6** | **Old BASTION content** (`§7`): what to carry over. | Carry the **copy** (bio, tagline, philosophy, certifications, stack, skills, SEO defaults) as the seed of the Profile/Skills/Site globals, lightly edited for truth (the certifications list says "In Progress" for SecurityX; the site copy in PR #5 is sourced from LinkedIn and is the newer truth). Drop the one project (Three Chicks: excluded by rule), its case study, the two test posts. Copy two media objects (portrait, avatar). Replace the placeholder social links (`github.com/juanramirez`, `linkedin.com/in/juanramirez`) with real ones — **his LinkedIn URL is not on disk**. |
| **D7** | **Projects to feature and how clients are named** (`§8`). | Six first-class case studies (Proprietor Systems, proprietor-mail, the platform, Fluency, Pulse, Rift Bingo) plus an "Earlier work" strip. Client work: **montanobtm.com named and called live** (the only one allowed); every other client build appears as an anonymised placeholder ("a Houston tile contractor", "a Houston garage-door company") — **flagged for his decision per client**. The JRCodex-repo entries "Three Chicks Production eCommerce", its "Business Admin Panel", "The Gilded Shear" and "Project Eta" are not carried over. |
| **D8** | **Design.** PR #5's SageScale v2 system as the base; the BASTION terminal aesthetic ("$ hire --me") is not continued. | **Keep PR #5's system** (tokens, primitives, feature gates, the a11y and contrast tests, axe 0 violations, CLS 0 measured) and re-brand the strings to his name. Palette: keep the eleven fixed colours unless he wants a personal re-skin (one file, `app/styles/tokens.css`). The old site's terminal voice spoke to developers; the audience here is hiring managers first (PR #5's rationale), so it goes, with one nod kept if he likes it: a `$ man juan --verbose` easter egg on `/about`, no more. |
| **D9** | **Admin password recovery.** Payload on Workers has no email adapter unless one is configured. | **No adapter in phase 2.** One user; reset by a `payload` script against remote D1 from his shell (plan §6). Add `@payloadcms/email-resend` (fetch-based, works on Workers) or an SES adapter only if a second editor ever exists. Cloudflare Access in front of `/admin` (parked Terraform) is the second lock either way. |
| **D10** | **Image optimisation without sharp.** | **Cloudflare's image transformations on the proxied zone** (`/cdn-cgi/image/<options>/api/media/file/<name>` via a `next/image` loader), the same mechanism the engine uses for post images. No `IMAGES` binding in phase 2 (it needs the Images paid tier for transformations beyond the free 5,000 unique/month; check the current price before enabling). Payload stores one original per upload; `imageSizes` stay off. |
| **D11** | **Previews.** `wrangler versions upload --preview-alias` previews share production bindings. | **A `preview` wrangler environment with its own D1 and R2** (`portfolio-preview-*`), used by CI for PR previews; production bindings only on `main`. Previews gated by Cloudflare Access (parked) like the other sites. The spike's `portfolio-spike-*` resources are torn down after the decision. |
| **D12** | **Payload MCP plugin.** | **Not in this spec** (his explicit go first, as directed). The content model is designed so that adding it later changes `payload.config.ts` only. |
| **D13** | **Engine business for the site.** Spec 002's D3 (a new business `jrcodex`) stands; the site key is minted for origin `https://juanramirez.codes`. | **Name the business `juanramirez`** rather than `jrcodex` (naming preference: the name should say what it is; `jrcodex` stays the npm scope and the client brand). If `jrcodex` was already created, keep it: the slug is not shown anywhere public. |

## 3. Budgets and gates (the build phase must meet these on the preview URL)

| Budget | Target | How it is checked |
|---|---|---|
| LCP | < 2.0 s on a throttled 4G mobile profile (Lighthouse: 1.6 Mbps down, 150 ms RTT, 4× CPU slowdown) | Lighthouse CI against the preview URL, in CI, on `/`, `/work/<one>`, `/about`, `/blog/<one>` |
| CLS | < 0.05 | the same run; every image and embed carries `width`/`height` or `aspect-ratio` (PR #5 measured 0) |
| INP | < 200 ms | the same run's TBT as the lab proxy, plus a Playwright interaction trace on the menu, theme toggle and résumé dialog |
| Accessibility | WCAG 2.2 AA | axe-core through Playwright on every public route in dark and light at 320 px and 1280 px (PR #5's method, moved into the repo); the contrast table in `design-system.json` re-checked by `tests/tokens.node-test.ts` |
| Weight | ≤ 100 KB JS on content pages (gzip), fonts self-hosted, no third-party script | `next build` output asserted in a test; the Turnstile widget loads on `/contact` only |
| Startup | Worker global scope well under 1 s; cold TTFB on `/` recorded per deploy | `wrangler versions upload` prints startup time; the measure script from the spike runs in CI against each preview |

## 4. Content model (Payload, D1)

Field types are Payload's. `*` = required. Everything public is `access.read: () => true`;
writes need a logged-in user. Slugs are kebab-case and unique.

**Collection `projects`** (`/work/<slug>`)

| Field | Type | Notes |
|---|---|---|
| title* | text | useAsTitle |
| slug* | text, unique | sidebar |
| summary* | textarea | one or two sentences, the card text and the meta description |
| status* | select: `live` · `built` · `in-progress` · `archived` | only montanobtm.com may be `live` among client work (content rule); the badge text follows the value |
| featured | checkbox | the home page shows featured, ordered |
| order* | number | sidebar; `defaultSort` |
| role | text | "sole engineer", "designed and built" |
| period | group { from: date, to: date (optional) } | shown as "2026 –" |
| kind* | select: `product` · `platform` · `open-source` · `client` · `tooling` · `earlier` | drives the section on `/work` |
| cover | upload → media | the card image; `alt` lives on media |
| links | array { label*, url*, kind: select `repo` · `live` · `npm` · `write-up` } | `repo` links only for public repos |
| tech | array { name* } | chips |
| outcomes | array { claim*: text, source*: text } | **every number on the page is a row here**; `source` is the file path or command it came from (content rule: nothing invented). Rendered as the "Numbers" strip with a tooltip naming the source. |
| anonymised | checkbox | client work shown as a placeholder name; the real name never leaves the admin (`clientName` below) |
| clientName | text, `admin.condition: anonymised` | admin-only; never rendered |
| caseStudy | group | as PR #3's shape: `intro { title, body: richText, image, imageAlt }`, `sections[] { title, body: richText, image, imageAlt, list[] }`, `conclusion { title, body }`, `futureWork { title, intro, points[] }`, `finalArchitecture { title, body, image, imageAlt }`. `richText` (Lexical) replaces the textarea-as-HTML. |
| seo | group { title, description } | optional overrides |

**Collection `media`** (R2): `alt*` text; `upload: { crop: false, focalPoint: false }`,
`mimeTypes: ['image/*', 'application/pdf']`, no `imageSizes` (D10). The résumé
PDF is a media document referenced from the `site` global.

**Collection `users`**: `auth: true`, email as title. One user.

**Global `profile`** (`/about`, the home hero): `name*`, `headline*` (the one
line under the name), `tagline`, `portrait` (upload), `bio*` (richText),
`philosophy[] { title*, body* }`, `certifications[] { title*, issuer, status:
select earned · in-progress, year }`, `education[] { institution*, what*,
years }`, `reading[] { title*, author, note }`, `location` (text: "Houston,
TX"), `availability` (select: open · listening · not-now).

**Global `skills`**: `groups[] { name*, items[] { name*, note } }` — the old
site's "Development Stack" / "Security & Infrastructure" split, kept.

**Global `site`**: `seoTitle*`, `seoDescription*`, `ogImage` (upload),
`social[] { platform: select github · linkedin · npm · other, url*, label }`,
`resume` (upload → media, PDF), `email` (text; D3b), `ctaHeading`, `ctaBody`.

What stays on the platform (not modelled here): posts, videos, the business
profile used by the footer (name, email), inquiries. The manifest declares
`{ intake: true, blog: true, videos: true }` plus `renders`; **never
`projects`** (that word is the engine's own module, spec 015; see
`domain-model.md` gap G1).

## 5. Proprietor integration (via the kit; unchanged from spec 002 except the transport)

- Transport: `rpc(env.SEO, env.SEO_SITE_KEY)` over `services: [{ binding:
  "SEO", service: "seo-engine", entrypoint: "Sites" }]` in `wrangler.jsonc`.
  `app/lib/intake/engine.ts` (spec 001) already selects it; `app/lib/platform/env.ts`
  changes its one body from `process.env` to the Worker's env (it says so in
  its own comment). No `SEO_ENGINE_URL`, no door Worker.
- `compatibility_date` ≥ 2026-04-21 so `InquiryRefused.retryAfterSeconds`
  crosses the binding (kit README).
- Kit **0.6.2** exact, with PR #4's structural shim for `videos()` until 0.7.0
  is published; the engine side already answers.
- Cache policy on `/media/<key>`: forward the engine's `Cache-Control`
  verbatim. Images arrive `public, max-age=31536000, immutable`; a shown clip
  arrives `public, max-age=300` and **must not be made immutable** (hiding a
  video takes effect within five minutes; PR #4 commit `a4ad7f7` pins this in
  a test). The site's own Payload media at `/api/media/file/*` gets a long
  `immutable` policy because Payload names files uniquely.
- Writes (announce, inquire) only from `ENGINE_WRITE_HOST=juanramirez.codes`;
  previews never write (spec 001).
- Secrets: `SEO_SITE_KEY` and `PAYLOAD_SECRET` as Worker secrets, set from
  Vault through the process environment (`plan.md` §6), never in a file.

## 6. The open PRs: merge or supersede

| PR | What | Verdict | Why |
|---|---|---|---|
| #2 `fix/lint-eslint-css-order` | `npm run lint` works on Next 16 (ESLint flat config), CSS import order | **merge first** | every later gate depends on it; no product change |
| #3 `chore/upgrade-2026-10` | Payload 3.91, Next 16.4, current deps; characterisation tests | **merge** | the spike runs the same versions on Workers; the Mongo/S3 adapters it keeps are swapped by slice S1, the versions are not. A pin is a schedule, not a fix: these are the versions |
| #1 `feat/platform-intake` | contact → Inquiries with a transport that already prefers the `SEO` binding | **merge** | the binding path is exactly what Workers needs; nothing to redo |
| #4 `feat/proprietor-adoption` | `/blog`, `/videos`, `/media`, footer profile, sitemap, manifest; spec 002 | **merge, with `dfc0adf` and `a4ad7f7`** | all additive, 130 tests against the kit's real `http()` client; on Workers `rpc()` takes over by configuration. Spec 002's D14 door is withdrawn by this spec; D5 (www.jrcodex.dev canonical) is replaced by D2 |
| #5 `design/jrcodex-2026` | SageScale v2 design system, a11y/CWV verified, sourced copy | **rebase last and merge** | the system is built for the platform-fed pages and tested; the copy becomes the content plan's base. Rebase, do not merge main into it (the secret scanner flags #1's Turnstile fixtures on a merge commit, per the recipe) |

Superseded by this spec: spec 002 §3 D1 "the hybrid on Vercel" (now Workers),
D5 (host), D7 (Vercel plan: moot), D9/D12/D13 ("not applicable" on Vercel: now
applicable, decided above as D11, D10, and the 301 in D2), D14 (withdrawn).

## 7. Migration of the old content

Source: `~/backups/juanramirez-portfolio-2026-10-19/content.json` (keys
`site_config`, `projects`, `case_studies`, `posts`, `media`) and the R2 bucket
`bastion-media`.

| Old | New | Rule |
|---|---|---|
| `about_bio`, `about_tagline`, `about_philosophy_json`, `about_certifications_json`, `author_bio` | `profile` global seed | edit for truth against PR #5's sourced copy (LinkedIn is newer than April's BASTION copy) |
| `about_stack_dev_json`, `about_stack_security_json`, `skills_json` | `skills` global seed | the eight skills become notes on the two groups |
| `seo_default_title`, `seo_default_description`, `about_cta_*`, `social_links_json` | `site` global seed | social links are placeholders in the export: replace with real URLs (D6) |
| `hero_title` "$ Hello from the CMS!", `site_name` "BASTION", `hero_subtitle` | dropped | brand retired (D8); the hero subtitle's claims ("I ship production systems for real businesses") survive only where PR #5's sourced copy supports them |
| project `three-chicks`, case study `cs-three-chicks-001` | dropped | content rule |
| posts `testing-cms-pipeline`, `test-publish-action` | dropped | test data; the blog is the engine's |
| media `7f98ee…` (portrait, 126,760 B), `7663765…` (avatar, same bytes) | copied to the new R2 bucket as media documents | the three 22,232 B `me.png` variants are duplicates of one upload; copy one if any |

The JRCodex repo's hard-coded `app/lib/project-data.ts`: WeatherWise AI (a real
refactoring case study with the diagrams in `docs/architecture_diagrams/`)
and WeFix4U move to "Earlier work"; NASA Mission Control (a course project)
and "The Commons" are his call (D7); Three Chicks ×2, The Gilded Shear and
"Project Eta" are not carried over.

Mechanics (slice S3): export every Payload document from the Vercel/Mongo
site over its REST API as JSON, import through the Local API against D1 with
the new fields defaulted (`kind: earlier`, `status: built`), copy S3 objects
to R2 with `rclone` (both S3-compatible), then a verification script that
compares counts, slugs and file byte lengths and fails on any difference.

## 8. Content plan

Audience, in order: hiring managers and recruiters for software and platform
roles; then small-business owners (one short section, the contact page line).
Voice: first person, plain words, numbers with sources, no superlatives. The
"honest résumé lines" from the ADR are the model: say what was done and when,
not what it might be.

Each case study answers four questions in order — what it is, what was hard,
what I did about it, what I can show — and ends with the numbers strip
(`outcomes[]`, each with its source). The numbers below are what the repos
can support today; `plan.md` §8 has the verified table with source paths
(filled from the research pass; anything it could not verify is marked and
is **not** used).

| # | Project (`kind`, `status`) | The story | Numbers it can cite (source in plan §8) |
|---|---|---|---|
| 1 | **Proprietor Systems** (product, live) — a multi-tenant platform for local trade businesses on Cloudflare Workers: an SEO/blog engine, owner dashboards, inquiries, a catalog/visualizer recipe system, a customer chat agent, video highlights | The engine has no public address: client sites and the dashboard reach it only over service bindings. Five locks with the honest limit. A block language so no model-written markup is ever served. Temporal facts in SQL. The decision record that kept the platform Workers-native and put Payload on the owner's own site as the experiment | specs count, migrations count, tests count, Workers count, ADRs, "montanobtm.com live since 2026-09-26" |
| 2 | **proprietor-mail** (open-source, built) — a zero-access encrypted inbox, Apache-2.0, public | Specs with decision sections; mutation-tested slices; a live probe against the real mail path that changed the logging design | GitHub URL, licence, specs, mutation score if recorded, the probe's spec path |
| 3 | **The platform** (platform, live) — one Hetzner node, k3s, Vault, Argo CD GitOps, restic DR, internal PKI, default-deny network policy; seven Cloudflare zones in Terraform; a three-site DR design | Everything is a commit; reversion is the feature. What it costs and what it deliberately does not do (one node, $0 extra) | Argo CD app count, zones, backup schedule, PKI |
| 4 | **Fluency** (product, in progress) — a learning and spaced-repetition app, Next.js 16, FSRS, Better Auth, Stripe; CI builds the image, Argo CD rolls it | Unifying a predecessor into one queue; a service worker kept deliberately narrow because the app is per-user | slices done, tests |
| 5 | **Pulse** (tooling, built) — repair-shop tools: a customer-facing check-in that starts a ticket from a scan, an agent TUI that has to work at 80×16 | Built on shift for the shop he works in; a cut-off approval prompt that reached a real job, and the render tests that followed | versions, tests |
| 6 | **Rift Bingo** (product, built) — a rebuild done spec-first, domain-first, test-first; a private preview behind Access with an origin JWT check | What SDD/DDD/TDD looked like on something small | specs, tests |
| 7 | **Client work** (client) — montanobtm.com, live on the platform (named); the others anonymised ("a Houston garage-door company", "a Houston granite shop") pending D7 | One story per client in the owner's words: a form that submits nothing is worse than no form | only facts from the client-site repos; no business claims the owner has not confirmed |
| 8 | **Earlier work** (earlier) — WeatherWise AI (refactoring a prototype into a well-structured monolith, with the before/after diagrams), WeFix4U | kept short; shows the arc | none |

Writing is the engine's (`/blog`): the first posts are these case studies'
longer forms, in his voice, through his dashboard.

## 9. Design direction

PR #5's system, re-branded. Dark sage-blue by default with an explicit light
toggle; Source Serif 4 headings, Inter text, both self-hosted; one fluid type
scale; gold only for action. New here: the **numbers strip** (an `outcomes`
row with its source in a tooltip, `Tooltip` primitive), a **status badge**
(`live` / `built` / `in progress` / `archived`, never "production"), the
`/work` page grouped by `kind` with featured first, and the case study laid
out in `Prose` with `wide` figures for diagrams. Motion stays behind
`prefers-reduced-motion`. The résumé opens in the existing dialog and is a
media document, so he replaces it in the admin.

## 10. Acceptance (the checkpoint, this phase)

- [ ] The spike builds with OpenNext and runs in workerd with local D1 and R2:
      admin first user, login, an image upload round-trip through R2, and a
      public page reading D1 (`spike/payload-on-workers/README.md` has the
      measurements).
- [ ] Bundle size (uncompressed and gzip) and cold/warm TTFB are recorded,
      with the limits they are judged against quoted from the live docs.
- [ ] A remote preview (`wrangler versions upload --preview-alias spike`)
      with cold-start TTFB from the network — **requires Vault unsealed**; if
      it could not run, `plan.md` §3 says so and lists the exact commands.
- [ ] This spec set, with every owner decision in §2.
- [ ] A PR from `spec/juanramirez-codes` to `main`, marked as a proposal.
