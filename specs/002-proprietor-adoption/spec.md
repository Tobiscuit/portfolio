# 002 — jrcodex.dev becomes a tenant of Proprietor

Status: written 2026-10-16 (D1 reopened the same day: the cutover half waits for Tobias), on top of spec 001 (branch `feat/platform-intake`,
PR #1). Companion documents: `domain-model.md` (the DDD pass and the gaps),
`plan.md` (architecture, contracts, infrastructure, the owner's runbook),
`tasks.md` (the build slices and the versions they landed). Engine side:
`~/seo-engine/specs/028-portfolio-site/`.

Tobias's words: "I want this website to be adopted by Proprietor, so I can
blog on there as well. That way I can have my own mail, can do videos, and
all of that through Proprietor.Systems."

## 1. What changes

**Today.** www.jrcodex.dev is a Next.js 16 site on Vercel. Payload CMS
(MongoDB Atlas, S3 in us-east-2, `sharp`) holds three collections (Users,
Media, Projects) for one editor; `NEXT_PUBLIC_USE_PAYLOAD_DATA` switches
between Payload and the hard-coded `app/lib/project-data.ts`. The contact
form reaches the platform's Inquiries through `@jrcodex/seo-kit` 0.3.1 when
`SEO_ENGINE_URL` is set (spec 001), and SES otherwise.

**After.** jrcodex.dev is a client site of the platform, run the way
montanobtm.com is run (its repo `~/worktrees/montano-btm-release` is the
reference implementation throughout):

```
  jrcodex.dev  (vinext Worker, Cloudflare account, custom domains apex + www)
  ├── /                 home, about, contact        (the site's own pages)
  ├── /blog, /blog/x    posts         ─┐
  ├── /work, /work/x    projects       │  read from the engine's Sites
  ├── /videos           published cuts │  entrypoint over the SEO service
  ├── footer            profile        │  binding, through @jrcodex/seo-kit
  ├── /media/*          images, video ─┘  (mediaHandler)
  ├── /api/contact      inquiry via rpc(env.SEO, key)        (spec 001, as built)
  └── announce(manifest) once per isolate, production host only
                  │
                  ▼ service binding "SEO" -> seo-engine#Sites (no public URL)
  Proprietor (app.proprietor.systems): ONE dashboard, business "jrcodex":
     Blog · Projects · Photos · Inquiries · Videos (tool) · Inbox (see D4)
  hello@jrcodex.dev  ->  Email Routing  ->  proprietor-mail Worker  ->  his inbox
```

MongoDB, S3, `sharp`, Payload and Vercel all go. The site keeps its own
design, pages and copy; only the data sources change.

### Two facts that differ from the brief, checked 2026-10-16

- **Spec 025 (video) is merged and deployed**, not "built, not deployed":
  engine `main` contains `89ddb20`, `specs/025-video-highlights/plan.md` has
  a "Deployed (2026-10-10)" section (migrations 0031/0032 applied, Container
  app `seo-engine-videorenderer`), and spec 026 followed on 2026-10-13. But
  **nothing in it faces a site**: the `Videos` entrypoint is dashboard-only
  (`analyze`, `makeClip`, `makeVideo`), `Sites` has no `videos()`, the kit has
  none, and `cuts` has no "shown on the site" state. Spec 025's own words:
  "Publishing to social networks: the result downloads; posting is his." A
  `/videos` page therefore needs an engine change (§2, engine spec 028).
- **The engine has no public address** since 2026-10-05
  (`~/seo-engine/docs/security-posture.md`): its workers.dev and preview
  hosts are off, and `/v1/*` over HTTPS exists only in the kit's `http()`
  client and this repo's test stub. So the `http()` transport can never reach
  the live engine from Vercel. The additive half of this work still runs on
  Vercel (every page renders with the platform unconfigured, as empty), but
  the platform is reachable only once the site is a Worker in the account.
  This settles the hosting direction harder than spec 001 §5 could.

## 2. The contract it honours

- **`@jrcodex/seo-kit` 0.6.2** (npm, checked with `npm view`): `rpc()`,
  `http()`, `announceOnce`, `inquire`, `posts`, `post`, `sitemap`, `media`,
  `profile`, `gallery`, `projects`, `project`; `./next` (`postMetadata`,
  `postJsonLd`, `postBodyProps`, `sitemapEntries`), `./worker`
  (`mediaHandler`), `./compose` (`compose(post, { supports })`). Types as in
  `packages/seo-kit/src/index.ts`. The site pins it exactly.
- **The engine's `Sites` entrypoint** (`~/seo-engine/src/sites-entrypoint.ts`)
  as deployed: the same methods, keyed by the site key on every call. The
  manifest catalogue is closed: `blog, intake, commerce, email, gallery,
  projects, chat, catalog` (`src/sites/manifest.ts`). `video` is a *tool* the
  operator turns on per business (`businesses.tools`, migration 0031), not a
  module a site declares.
- **Engine spec 028** (new, built in this work, `~/seo-engine` branch
  `028-portfolio-site`), which this site reads through a structural shim
  until kit 0.7.0 is published:
  - `Sites.videos(siteKey): Promise<VideoSummary[]>` — the cuts the owner
    chose to show, newest first; `Sites.media()` serves their render keys
    with HTTP Range (206) so a browser can seek.
  - `ProjectSummary.link: string | null` — a project's live URL (https).
  - The project sanitiser keeps `h2`/`h3`; the dashboard editor round-trips
    them.
  - `scripts/import-portfolio.ts` — the owner's one-off import (§4).
  The shapes are fixed in `plan.md` §2 so the site and the engine are built
  against the same text.
- **Projects as they are** (spec 015, verified in `src/sites/project-store.ts`
  and migration 0021): the title is the owner's (`project_translations.title`,
  160 chars, editable; "Service in Locality, City" is only the draft's
  default), `locality` and `city` may be empty, `service` must be a category
  of the business's taxonomy, summary 400 chars, up to 24 photos with roles
  `before|after|detail`, write-up sanitised to `p ul ol li strong em br`.
  A software case study fits once `link` and headings exist (028).
- **Profile** (spec 010): `name, telephone, email, address, social
  {instagram, facebook}, serviceArea, team, hours`. No LinkedIn or GitHub
  field, so those two links stay the site's own constants (`app/lib/site.ts`),
  like montano's `FALLBACK_PROFILE`.
- **Mail** (`~/proprietor-mail`, PUBLIC repo): one mailbox per business, or
  several addresses on one mailbox (plan §12, `addresses` table). Tobias's
  mailbox `mbx_343m0trnz4ccka4vvq5mfpwhc7` (tobias@, hello@, juan@
  proprietor.systems) is provisioned and its routing rules already deliver
  to the Worker (cloudflare-infra `6c9e0b2`). jrcodex.dev receives no mail
  today: no MX at the apex (`mail.tf` lists superblock and juanramirez.codes
  only); the SES identity, DKIM and MAIL FROM `mail.jrcodex.dev` exist
  (`sending-jrcodex.tf`). Nothing tenant-specific or secret goes into the
  public repo; what this needs is Terraform and a Directory row, not code.
- **Delivery** (memory `delivery-pipeline-decisions`): `develop` as the
  integration branch, Workers Builds with one production and one preview
  trigger, staging = versions + preview URLs behind Access. The account-wide
  `all_preview_workers` Access application is applied
  (`worker-previews-access.tf`, `06161bc`), so a new Worker's previews are
  gated from the day it exists: `preview_urls: true` is safe in the first
  deploy. No wrangler `env` blocks, no staging Worker.
- **Spec 001 stays as built.** B-D1..B-D5 are decided; the handler is
  framework-free; only the file that mounts it changes at the cutover (the
  env comes from `cloudflare:workers` instead of `process.env`).

## 3. Decisions for Tobias

Each with a recommendation. The build proceeds on the recommendation where a
choice had to be made for code to exist, and every such choice is one line to
flip; nothing below is decided for him.

| # | Decision | Recommendation |
|---|---|---|
| **D1** | **Hosting and the content layer** — three real options, costed below the table. (a) Retire Payload; the site is a vinext Worker like the client sites; projects live in the engine's Projects. (b) Hybrid on Workers: Payload stays as the site's own content layer for projects and media, moved to Workers with Payload's own `with-cloudflare-d1` template (OpenNext + D1 + R2); Proprietor supplies blog, inquiries, profile, mail and video through the kit over the service binding. (c) Hybrid staying on Vercel: Payload and projects as today; Proprietor's modules reach the site only if the engine grows a public HTTPS `/v1` again. Tobias is weighing Payload's new agentic authoring (not researched here, by instruction: Payload's version matters only to the export script). | **(a)**, as recommended before and as he first said; but this is his call and (b) is a sound site. The case for (a): one dashboard for everything he does, one toolchain (vinext) across every site he runs and the dashboard, four services retired at $0, the engine can cross-link projects to posts (015 steps 4–5), and the Proprietor dashboard is the stronger résumé piece. The case for (b): Payload's structured case studies (sections with their own images, code, lists) are richer than the engine's Project even after 028 (headings and a link; still no inline images or code), it keeps a CMS he knows and may want to show, and nothing he wrote is flattened. (c) is not recommended: it reverses the 2026-10-05 security posture to serve one site. The additive slices here are the same under every option; the cutover slice is written twice (`tasks.md` B and B′) and waits for his word. |
| **D2** | **Which portfolio is jrcodex.dev's future**: this repo, or the Hono + HTMX `juanramirez-portfolio` Worker whose source exists only on his Windows machine. | **This one** (assumed by the brief). The BASTION Workers stay where they are, out of scope. If he ever wants the other, the platform modules here are reusable only as a design. |
| **D3** | **Which business on the platform**: a new business `jrcodex` (profile "Juan Ramirez", solo, its own vertical and taxonomy, posts in his voice), or attach the site to the existing `t-proprietor` row (brand "Proprietor", vertical `v-platform`, taxonomy about getting found online). | **A new business `jrcodex`**, as spec 001 already named it (tenant `jrcodex`, Vault `secret/seo-engine/sites/jrcodex`). The blog on his portfolio is his engineering writing, not the product's marketing; the profile is him, not Proprietor. Needs a new trade in `seo-admin` first (`t`); a taxonomy is proposed in `plan.md` §7. |
| **D4** | **Mail at `hello@jrcodex.dev`**: (a) add it as an address on his existing proprietor mailbox (mail plan §12: several addresses, one mailbox; reply-from follows the address a message arrived at), or (b) a second mailbox for business `jrcodex` (its own key ceremony, SES tenant and configuration set, a second Inbox to check). Either way the zone needs Email Routing (`cloudflare_email_routing_dns` writes the MX and apex SPF; SES keeps sending from `mail.jrcodex.dev`), a rule for `hello@`, the jrcodex SES identity associated with the mailbox's SES tenant, and `ses-send-mail` allowed to send as `hello@jrcodex.dev`. | **(a), one inbox.** "My own mail" is one place to read it; (a) is three Terraform resources, one `addresses` row and one IAM policy line, with mail plan §8's dual delivery (forward to Gmail first, then the Worker) as the safe path. Consequence: the jrcodex site does NOT declare `has.email` (the Inbox lives on the Proprietor business). If he prefers (b), `has.email` is the one-line follow-up spec 001 promised, after that mailbox is active. The prior partition note in `mail.tf` ("jrcodex.dev receives no mail") is superseded by this decision either way. |
| **D5** | **Canonical host**: `www.jrcodex.dev` (today's canonical; apex redirects to it on Vercel) or the apex `jrcodex.dev` (every other site on the platform: `redirects.tf` 301s www to apex before the Worker runs). | **Apex.** One convention across the sites he runs, shorter, and a sitewide 301 carries the ranking. Built on: `ENGINE_WRITE_HOST=jrcodex.dev`, both hostnames as custom domains, a `www_redirects` entry parked in `redirects-jrcodex.tf.pending`. To keep www: change the var and skip the redirect; the engine's site `origin` is typed at key-minting time, so decide before D10. |
| **D6** | **How 025's clips reach the site**: (a) the engine's R2 through the site's `/media/*` (the kit's `mediaHandler`; Range added by 028; $0: R2 egress is free, the Worker streams), (b) Cloudflare Stream ($5 per 1,000 minutes stored and $1 per 1,000 delivered: not $0), (c) embed from YouTube (free, but outside Proprietor and no "Show on site" from the dashboard). What the site shows while nothing is published: nothing visible (nav link hidden, `/videos` an empty `noindex` page, never an error). | **(a)**, with a `<video controls preload="metadata">` per cut and a "Show on site" toggle on the dashboard (028). While kit 0.7.0 is unpublished the site reads `videos` through a structural shim over the binding; over `http()` or an older binding the list is empty, by design. |
| **D7** | **The Vercel plan** (spec 001 §5): on Hobby the site is outside Vercel's fair-use terms (it promotes services); on Pro it costs $20 a month that Workers Paid already covers. Not visible from the node. | **Check it** (Vercel dashboard, 10 seconds). On Hobby, the cutover is urgent; on Pro, it is money. Either way the cutover ends it. |
| **D8** | **Content migration** of the Payload Projects/Media documents into the engine's Projects for business `jrcodex`. Only the owner can run it (the Mongo URI lives only in Vercel's environment; the engine's D1 and R2 need the workers token). Two sources exist and may differ: Mongo, and `app/lib/project-data.ts` (what `NEXT_PUBLIC_USE_PAYLOAD_DATA` unset serves). | The export script (`scripts/export-portfolio.mjs`, this repo) reads either source into one JSON contract (`plan.md` §2.3); the owner runs it with `vercel env pull` for Mongo, or with `--source code`, and diffs. Photos then go through the engine's existing `import-gallery` task (fetched from the site's own origin, re-encoded, no R2 token), and `scripts/import-portfolio.ts` (engine, 028) writes the project rows as reviewed SQL. Losses to accept: inline `<code>` and `<a>` in write-ups become plain text (the sanitiser keeps none), the two `placeholder_*.svg` diagrams are not images the engine stores, and "Project Eta" is placeholder text to drop. |
| **D9** | **Previews before `preview_urls: true`**: the account-wide `all_preview_workers` Access app already gates every Worker's preview URLs (applied 2026-09-12). | **Nothing to create.** `wrangler.jsonc` ships `preview_urls: true, workers_dev: false`. The runbook has him confirm the gate on the first preview URL in a private window. |
| **D10** | **Minting the business and the site key** with `seo-admin` (needs `vault login`): add the trade (`t`), add the business (`a`), connect the website (`w`, origin per D5), put the key into Vault `secret/seo-engine/sites/jrcodex` field `key` and into the Worker as `SEO_SITE_KEY` through stdin. | Owner step, in `plan.md` §8 in order. The key is shown once; the engine keeps only its hash. |
| **D11** | **Turnstile widget for jrcodex.dev** (B-D2 decided: before go-live). The Terraform token lacks Turnstile (2026-09-26) and cannot be edited; Montano's widget was created in the dashboard and parked as a `.tf.pending` with an import block. | Same path: create it in the dashboard for domain `jrcodex.dev` (managed mode), `jrcodex-turnstile.tf.pending` adopts it by import when a Turnstile-capable token exists; the site key goes in `wrangler.jsonc` vars, the secret through stdin. |
| **D12** | **Images on the Worker**: `images: { unoptimized: true }` (the assets are already sized WebP/PNG; $0 guaranteed) or `@vinext/cloudflare`'s `imagesOptimizer()` on an Images binding (free tier 5,000 unique transformations a month per account, shared with the client zones' `/cdn-cgi/image/` use). | **Unoptimized.** A portfolio's forty images do not need a transform pipeline, and the redesign lane may choose otherwise with its own images later. |
| **D13** | **Old URLs**: `/projects` and `/projects/<id>` (1–9) are indexed today. | 301 `/projects` to `/work` and each `/projects/<id>` to its `/work/<slug>` from a map in `lib/legacy-redirects.ts`, with slugs the import script prints; the runbook verifies the map after the import. |

### D1, costed

| | (a) vinext, Payload retired | (b) hybrid on Workers (OpenNext + Payload on D1/R2) | (c) hybrid on Vercel |
|---|---|---|---|
| Build, in days | site port 2 · removals 0.5 · export and import scripts 1 · smoke harness and delivery 1 · **≈ 4.5**; engine 028 ≈ 1.5 (videos 1, project link/headings 0.5) | OpenNext + D1 adapter + Payload migrations 1.5 · Mongo → D1 through the Local API 1 · S3 → R2 and `storage-r2` 0.5 · `sharp` out, request-time resizing 0.5 · smoke harness and delivery 1 · the `/media`, announce and contact wiring inside OpenNext's Worker 0.5 · **≈ 5** (spec 001 §5 said 3–5); engine 028 ≈ 1 (videos only) | site 0 (stays) · engine: a public `/v1` for reads and inquiries with bearer keys, rate limits and Access-less exposure **≈ 2**, plus the posture reversal; video streaming would come from a public engine URL |
| "One dashboard" | **Yes**: blog, projects, photos, inquiries, videos, inbox in Proprietor | **No**: projects and media in Payload's admin (a second sign-in, a second database); everything else in Proprietor | same as (b) |
| Toolchains he maintains | one (vinext) | two (OpenNext here, vinext everywhere else) | two (Next on Vercel, vinext elsewhere) |
| Services retired | Vercel, Atlas, S3, `sharp` | the same four (D1 and R2 replace Atlas and S3) | none |
| What is lost | inline `<code>`/`<a>` and per-section images in migrated write-ups (D8) | the engine's cross-links and topic sourcing for projects; `/work` stays the site's own pages | as (b), plus the engine's private-network posture |
| Risk | low: everything the site imports is in vinext's compatibility table; `sharp` leaves with Payload | medium: Payload's template says it needs Workers Paid for bundle size (he has it); its D1 adapter and OpenNext are a second moving stack | low on the site, high on the engine (a public door that exists for one tenant) |
| Can start now | the additive half and 028 yes; the cutover on his word | the same | the additive half yes; the engine door is a new spec |

## 4. Going live (owner steps, in order; `plan.md` §8 has the commands)

1. `vault login`. Decide D3, D4, D5.
2. `seo-admin`: trade, business `jrcodex`, connect the website (D10). Key to
   Vault and, later, to the Worker.
3. Decide D1. Review and merge, in order: PR #2, PR #1, this PR's additive
   half; the cutover half (B under (a), B′ under (b)) is built on his word
   and merged after. (Nothing is deployed by a merge: the Worker does not
   exist until step 5.)
4. Approve the parked Terraform (`plan.md` §6): remove the two Vercel records,
   add the www redirect, Email Routing on the zone (D4), the Turnstile import
   when the token allows.
5. Connect the repo to Workers Builds and create the two triggers
   (`docs/delivery-pipeline.md`); the first production deploy creates both
   custom domains. Confirm with `dig @1.1.1.1`.
6. Export (this repo, `scripts/export-portfolio.mjs`), gallery import
   (engine, `scripts/import-gallery.ts`), project import (engine,
   `scripts/import-portfolio.ts`), paste the redirect map (D13).
7. Mail: Directory address row, SES tenant association, policy, dual delivery
   (D4). Then `has.email` only if D4 is (b).
8. Vercel: delete the project after a quiet week; remove the SES variables.

Rollback before step 5 is nothing (Vercel still serves). After step 5:
`git checkout dns.tf` and `./tf apply` restores the Vercel records, and
`wrangler deploy` with the two `routes` removed detaches the custom domains.
