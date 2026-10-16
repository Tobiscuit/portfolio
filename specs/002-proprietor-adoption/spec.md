# 002 — jrcodex.dev becomes a tenant of Proprietor

Status: written 2026-10-16 on top of spec 001 (branch `feat/platform-intake`,
PR #1). **D1 decided the same day: the hybrid.** Payload stays on jrcodex.dev
as the site's own content layer for projects and media (another lane takes
it to 3.91 and adds `@payloadcms/plugin-mcp`); Proprietor supplies blog,
inquiries, profile, mail and video through `@jrcodex/seo-kit`. The site
stays on Next.js and Vercel for now. The platform-side record of the
content-layer decision is the ADR
`~/seo-engine/docs/decisions/0001-content-layer-workers-native-not-payload.md`
(branch `docs/adr-content-layer`, seo-engine PR #11,
https://github.com/Tobiscuit/seo-engine/pull/11); this spec does not restate it.

Companion documents: `domain-model.md` (the DDD pass and the gaps it found),
`plan.md` (architecture, contracts, infrastructure, the owner's runbook),
`tasks.md` (the build slices). Engine side: `~/seo-engine/specs/028-portfolio-site/`
(branch `028-portfolio-site`).

Tobias's words: "I want this website to be adopted by Proprietor, so I can
blog on there as well. That way I can have my own mail, can do videos, and
all of that through Proprietor.Systems."

## 1. What changes

**Today.** www.jrcodex.dev is a Next.js 16 site on Vercel. Payload CMS
(MongoDB Atlas, S3, `sharp`) holds Users, Media and Projects for one editor;
`NEXT_PUBLIC_USE_PAYLOAD_DATA` switches between Payload and the hard-coded
`app/lib/project-data.ts`. The contact form reaches the platform's Inquiries
through the kit when `SEO_ENGINE_URL` is set (spec 001), and SES otherwise.

**After.**

```
  www.jrcodex.dev  (Next.js on Vercel, as today)
  ├── /projects, /projects/<id>   Payload: projects and media   (unchanged, the other lane's)
  ├── /blog, /blog/<slug>         posts        ─┐
  ├── /videos                     shown cuts    │  read from the engine's Sites
  ├── footer                      profile       │  through @jrcodex/seo-kit over
  ├── /api/contact                inquiry      ─┘  http(SEO_ENGINE_URL, SEO_SITE_KEY)   (spec 001, as built)
  └── announce(manifest)          { intake, blog }, production host only
                  │  HTTPS, the kit's /v1 contract, bearer site key
                  ▼
  the engine door (D14: does not exist yet - the one thing between this PR and live content)
                  │  service binding -> seo-engine#Sites (private, as today)
  Proprietor (app.proprietor.systems): ONE dashboard, business "jrcodex":
     Blog · Inquiries · Videos (tool) · Profile; Inbox on the Proprietor business (D4)
  hello@jrcodex.dev  ->  Email Routing  ->  proprietor-mail Worker  ->  his inbox
```

Nothing is removed. Projects and media stay where they are; the new pages
read the platform and render empty, never an error, when it is unreachable.

### Three facts that shape this, checked 2026-10-16

- **Spec 025 (video) is merged and deployed**, not "built, not deployed":
  engine `main` contains `89ddb20`; `specs/025-video-highlights/plan.md` has
  a "Deployed (2026-10-10)" section; spec 026 followed on 2026-10-13. But
  **nothing in it faces a site**: the `Videos` entrypoint is dashboard-only,
  `Sites` has no `videos()`, the kit has none, and `cuts` has no "shown on
  the site" state ("the result downloads; posting is his"). Engine spec 028
  adds that edge.
- **The engine has no public address** since 2026-10-05
  (`~/seo-engine/docs/security-posture.md`): the workers.dev and preview
  hosts are off; `/v1/*` over HTTPS exists only in the kit's `http()` client
  and this repo's test stub. A site on Vercel can therefore reach nothing on
  the platform today. With the hybrid decided, this is the go-live blocker:
  D14.
- **Projects** stay Payload's. The engine's Projects module (015) was
  measured against the case studies and found to need a link column and
  headings to hold them (that work is cancelled with the decision); the
  `/work` pages and `has.projects` are not built.

## 2. The contract it honours

- **`@jrcodex/seo-kit` 0.6.2** (npm, `npm view`): `rpc()`, `http()`,
  `announceOnce`, `inquire`, `posts`, `post`, `sitemap`, `media`, `profile`,
  `gallery`, `projects`, `project`; `./next` (`postMetadata`, `postJsonLd`,
  `postBodyProps`, `sitemapEntries`), `./worker` (`mediaHandler`),
  `./compose`. Types as in `packages/seo-kit/src/index.ts`. Pinned exactly.
  Over `http()` the kit calls `GET /v1/posts?locale=`, `/v1/posts/:locale/:slug`,
  `/v1/sitemap`, `/v1/profile`, `/v1/gallery`, `/v1/projects…`,
  `/v1/media/<key>`, `POST /v1/manifest`, `POST /v1/inquiries` with
  `authorization: Bearer sk_…`; 401/403 → `SiteKeyError`, 404 → null, 400 →
  `ManifestError`/`InquiryRefused`, 429 → `InquiryRefused` with `Retry-After`.
  That client is the whole HTTP contract; `test/stub-engine.ts` implements
  it and is pinned to it by `test/harness.test.ts`.
- **The engine's `Sites` entrypoint** as deployed, plus **engine spec 028**
  (built in this work): `Sites.videos(siteKey): Promise<VideoSummary[]>`
  (the cuts the owner chose to show, newest first), `Sites.media(siteKey,
  key, { range })` serving a shown render key with HTTP Range, a "Show on
  site" toggle on the dashboard, and kit 0.7.0 carrying `videos()` on both
  transports and the Range passthrough. The site reads videos through a
  structural shim until 0.7.0 is published (`plan.md` §2.2).
- **The manifest catalogue is closed**: `blog, intake, commerce, email,
  gallery, projects, chat, catalog`. This site declares `{ intake: true,
  blog: true }` plus `renders`. `video` is a tool the operator turns on per
  business (`businesses.tools`), not a module. `email` only under D4(b).
- **Profile** (spec 010): no LinkedIn or GitHub field, so those two links
  stay the site's own constants (`app/lib/site.ts`), like montano's
  `FALLBACK_PROFILE`.
- **Mail** (`~/proprietor-mail`, PUBLIC repo): one mailbox per business, or
  several addresses on one mailbox (plan §12). Tobias's mailbox
  `mbx_343m0trnz4ccka4vvq5mfpwhc7` is provisioned and its proprietor.systems
  rules already deliver to the Worker (cloudflare-infra `6c9e0b2`).
  jrcodex.dev receives no mail today (no MX at the apex); its SES identity,
  DKIM and MAIL FROM exist (`sending-jrcodex.tf`). Nothing tenant-specific
  goes into the public repo: Terraform and a Directory row.
- **Spec 001 stays as built** (B-D1..B-D5 decided). `http()` is now the
  production transport; `rpc()` stays as a code path and its tests.
- **Ownership**: `payload.config.ts`, `collections/`, every existing
  version in `package.json` belong to the upgrade lane; `app/components/**`
  presentation and `app/globals.css` to the redesign lane. Merge order:
  PR #2 → upgrade → PR #1 → this → redesign.

## 3. Decisions for Tobias

| # | Decision | Recommendation / state |
|---|---|---|
| **D1** | **Hosting and the content layer.** | **DECIDED 2026-10-16: the hybrid, on Vercel.** Payload stays for projects and media; Proprietor supplies blog, inquiries, profile, mail and video through the kit. The comparison that was put to him is kept below ("D1, as compared"). *Later, only if the Vercel plan forces a move* (D7): Payload's own Cloudflare template (`with-cloudflare-d1`: OpenNext + D1 + R2) is the path; vinext is not, since Payload's admin mounts through a Next config plugin. The site's `SEO` service binding then replaces `SEO_ENGINE_URL` and D14's door becomes unnecessary. |
| **D2** | **Which portfolio is jrcodex.dev's future**: this repo, or the Hono + HTMX `juanramirez-portfolio` Worker whose source exists only on his Windows machine. | **This one** (assumed). The BASTION Workers stay where they are. |
| **D3** | **Which business on the platform**: a new `jrcodex` (profile "Juan Ramirez", solo, its own trade and taxonomy, posts in his voice), or the existing `t-proprietor` (brand "Proprietor", vertical `v-platform`). | **A new business `jrcodex`**, as spec 001 named it (Vault `secret/seo-engine/sites/jrcodex`). The blog on his portfolio is his engineering writing, not the product's. Needs a trade in `seo-admin` first; `plan.md` §7 proposes one. |
| **D4** | **Mail at `hello@jrcodex.dev`**: (a) an address on his existing proprietor mailbox (mail plan §12), or (b) a second mailbox for business `jrcodex`. Either way: Email Routing on the zone (`cloudflare_email_routing_dns` writes the MX and apex SPF; SES keeps sending from `mail.jrcodex.dev`), a rule for `hello@`, the jrcodex SES identity associated with the mailbox's tenant, and `ses-send-mail` allowed to send as `hello@jrcodex.dev`. | **(a), one inbox.** Parked as `jrcodex-mail.tf.pending` (forward to Gmail first, mail plan §8's dual delivery) and `jrcodex-mail-to-worker.tf.pending` (the Worker), both validated. Consequence: this site does not declare `has.email` (the Inbox lives on the Proprietor business). Under (b), `has.email` is the one-line follow-up after that mailbox is active. The 2026-09-06 note in `mail.tf` that jrcodex.dev receives no mail is superseded. |
| **D5** | **Canonical host.** | **`www.jrcodex.dev` stays** (the hybrid changes no DNS). `ENGINE_WRITE_HOST=www.jrcodex.dev`; the engine's site `origin` at minting is `https://www.jrcodex.dev`. The apex convention of the other sites applies only if the site ever moves. |
| **D6** | **How 025's clips reach the site**: (a) the engine's R2 through the kit's `/v1/media/<key>` over HTTPS and the site's own `/media/*` route (Range by 028; $0), (b) Cloudflare Stream ($5 per 1,000 minutes stored + $1 per 1,000 delivered), (c) a YouTube embed. While nothing is published: nothing visible, `/videos` an empty `noindex` page, never an error. | **(a)**, `<video controls preload="metadata">` per cut, a "Show on site" toggle on the dashboard (028). On Vercel the site's `/media/[...key]` route handler streams from the door with Range passed through; until the door exists the list is empty by design. |
| **D7** | **The Vercel plan** (spec 001 §5): on Hobby the site is outside the fair-use terms; on Pro it costs $20 a month. Not visible from the node. | **Check it.** The hybrid keeps Vercel, so this is now a standing cost or a standing risk; the "later" note in D1 is the way out. |
| **D8** | Content migration of Payload's projects into the engine. | **Cancelled** with D1: projects stay in Payload. |
| **D9** | Preview Access before `preview_urls: true`. | **Not applicable**: Vercel's PR previews serve; `ENGINE_WRITE_HOST` keeps a preview from ever announcing or inquiring (spec 001). |
| **D10** | **Minting the business and the site key** with `seo-admin` (needs `vault login`): add the trade (`t`), the business (`a`), connect the website (`w`, origin `https://www.jrcodex.dev`), key into Vault `secret/seo-engine/sites/jrcodex` field `key`, then into Vercel's Production environment as `SEO_SITE_KEY`. | Owner step, `plan.md` §8. The key is shown once; the engine keeps only its hash. |
| **D11** | **Turnstile widget for jrcodex.dev** (B-D2 decided: before go-live). The Terraform token lacks Turnstile. | Create it in the dashboard for `jrcodex.dev` (managed); `jrcodex-turnstile.tf.pending` adopts it by import when a capable token exists; `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` into Vercel's Production environment (spec 001 §4). |
| **D12** | Images on a Worker. | Not applicable (Vercel). |
| **D13** | Old `/projects` URLs. | Not applicable: they stay. |
| **D14** | **The engine door — the go-live blocker.** The engine has no public address and the site stays on Vercel, so `SEO_ENGINE_URL` has nothing to point at. Options: (i) reopen a public `/v1` on the engine itself (reverses the 2026-10-05 posture for every tenant); (ii) wait for a move to Workers (D1's "later"), after which the service binding works and no door is needed; (iii) **a door Worker**: a small Worker in the account, bound to `seo-engine#Sites`, that implements exactly the kit's `/v1` HTTP contract for a bearer site key (reads, media with Range, manifest, inquiries), on a hostname of its own, with the engine itself staying private. The site's `test/stub-engine.ts` is already its executable specification, and the engine's own audit recommended exactly this on 2026-09-27 (`~/seo-engine/docs/spec-audit-2026-09-27.md` item 5: "`/v1` does not exist … build `/v1` with `api.proprietor.systems`"). | **(iii)** if content is to go live before any move. About a day in the engine repo (`plan.md` §9 has the design); a new public surface, so his explicit go, and a line in the security-posture doc, before it is deployed. Not built in this work: it is a decision, not a slice. Until it exists, the new pages render empty on production and full against the stub in tests. |

### D1, as compared (the table put to him; decided (c))

| | (a) vinext, Payload retired | (b) hybrid on Workers (OpenNext + Payload on D1/R2) | (c) hybrid on Vercel — **decided** |
|---|---|---|---|
| Build, in days | site port 2 · removals 0.5 · export and import 1 · smoke and delivery 1 · ≈ 4.5; engine 028 ≈ 1.5 | OpenNext + D1 adapter + migrations 1.5 · Mongo → D1 1 · S3 → R2 0.5 · `sharp` out 0.5 · smoke and delivery 1 · wiring 0.5 · ≈ 5; engine 028 ≈ 1 | site: the additive pages only (≈ 1.5, this work); engine 028 ≈ 1; **plus the door (D14) ≈ 1** |
| "One dashboard" | yes | no: projects and media in Payload's admin | no: the same |
| Toolchains | one (vinext) | two (OpenNext here, vinext elsewhere) | two (Next on Vercel, vinext elsewhere) |
| Services retired | Vercel, Atlas, S3, `sharp` | the same four | none |
| What is lost | inline code/links and per-section images in migrated write-ups | the engine's cross-links and topic sourcing for projects | the same, plus the engine's private-network posture (the door is one new public surface) |

## 4. Going live (owner steps, in order; `plan.md` §8 has the commands)

1. `vault login`. D3 and D4 confirmed (recommendations above).
2. `seo-admin`: trade, business `jrcodex`, connect `https://www.jrcodex.dev`
   (D10). Key to Vault.
3. Review and merge, in order: PR #2, the upgrade PR, PR #1, this PR, then
   the redesign. The engine PR (028) and its deploy (`./deploy`), and kit
   0.7.0 (`npm stage approve`).
4. D14: decide and build the door (its own spec and PR); deploy it; its
   hostname becomes `SEO_ENGINE_URL`.
5. Vercel, Production environment only: `SEO_ENGINE_URL`, `SEO_SITE_KEY`,
   `ENGINE_WRITE_HOST=www.jrcodex.dev`, `CONTACT_FALLBACK_EMAIL`, the
   Turnstile pair (D11). Redeploy. One message through the live form, as
   himself; the dashboard shows it first.
6. Mail (D4a): the Directory address row, `jrcodex-mail.tf`, a test message
   to Gmail, then `jrcodex-mail-to-worker.tf`; two weeks later, `store`.
7. Videos: turn the tool on for business `jrcodex` (`businesses.tools`),
   upload, cut, "Show on site".
8. After a quiet week: the SES path and its variables leave Vercel (spec 001
   §4 step 5).

Rollback at any point before step 5 is nothing; after it, removing
`SEO_ENGINE_URL` in Vercel returns the contact form to SES and empties the
platform pages.
