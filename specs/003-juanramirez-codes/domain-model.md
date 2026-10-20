# 003 — Domain model

The DDD pass for juanramirez.codes: bounded contexts, aggregates with their
invariants, the context map, and the gaps it found. Patterns are named where
they are actually used, with one line on why.

## 1. Bounded contexts

```
  ┌───────────────────────────── juanramirez.codes (one Worker) ─────────────────────────────┐
  │                                                                                           │
  │  SITE CONTENT (core)            PLATFORM CONTENT (supporting, external)                   │
  │  Payload on D1 + R2             Proprietor's Sites entrypoint over the SEO binding        │
  │  Project · Media · Profile      Post · Video · BusinessProfile · Inquiry · Manifest       │
  │  Skills · Site                  read through @jrcodex/seo-kit, shapes re-checked          │
  │        │                                 │                                                │
  │        └──────── DELIVERY (supporting) ──┘                                                │
  │                  routes, cache policy, /media and /api/media/file, redirects, previews    │
  │                                                                                           │
  │  IDENTITY (generic): Payload Users (admin) · Cloudflare Access (edge) · the site key      │
  └───────────────────────────────────────────────────────────────────────────────────────────┘
```

**Site Content** is the core domain: what makes this site his and not a
template — projects with sourced numbers, the about page, the résumé. Payload
owns its persistence; the site owns the model.

**Platform Content** is a supporting domain owned by another system
(Proprietor). The site is a *conformist* to the kit's types for reads, and
keeps an *anti-corruption layer* (`app/lib/platform/client.ts`: shape checks
on every answer, `plainPost` rewriting image URLs) so a change in the engine's
answers fails loudly in one file rather than rendering garbage.

**Delivery** is where the two meet: one Worker serves both content kinds with
different cache policies and URL spaces.

**Identity** is generic: Payload's auth for the admin, Cloudflare Access as
the edge lock, and one secret (the site key) that makes the site a tenant.

## 2. Aggregates and invariants (Site Content)

| Aggregate (root) | Contains | Invariants |
|---|---|---|
| **Project** | title, slug, summary, status, kind, order, featured, role, period, links[], tech[], outcomes[], anonymised + clientName, caseStudy (intro, sections[], conclusion, futureWork, finalArchitecture), seo | slug unique and kebab-case · `status = live` only for montanobtm.com among `kind = client` (content rule; a `beforeValidate` hook enforces it by slug allow-list) · every `outcomes[]` row has a non-empty `source` · `anonymised` ⇒ `clientName` is never in any rendered field (an `afterRead` hook strips it for unauthenticated reads) · a `featured` project has a `cover` · `period.to ≥ period.from` when both set |
| **Media** | file (R2 object), alt, mime, dimensions | `alt` required · filename unique (Payload) · mime in `image/*` or `application/pdf` · no derived sizes (no sharp) |
| **Profile** (global, singleton) | name, headline, tagline, portrait, bio, philosophy[], certifications[], education[], reading[], location, availability | one document · certifications carry a `status` and never a claim of an earned credential without a year |
| **Skills** (global) | groups[] { name, items[] } | group names unique |
| **Site** (global) | seo defaults, ogImage, social[], resume, email, cta | `resume` is a PDF media · every social url is absolute https |
| **User** | email, password hash, sessions | exactly one user in phase 2; `first-register` closed once one exists (Payload) |

Value objects: `Outcome { claim, source }`, `Link { label, url, kind }`,
`Period { from, to? }`, `CaseStudySection { title, body, image?, imageAlt?, list[] }`.

Project is one aggregate rather than Project + CaseStudy because a case study
never exists without its project, is edited in one sitting, and is published
as one page: one transaction boundary.

## 3. The platform side, as the site sees it

| Concept | Owner | The site's view | Where it is checked |
|---|---|---|---|
| Post, PostSummary | engine | read-only; `compose()` turns the layout plan into items; images rewritten to `/media/<key>` | `app/lib/platform/client.ts` (`isPost`, `isPostSummary`) |
| VideoSummary | engine (spec 028) | read-only; `[]` when none shown; never an error | `app/lib/platform/videos.ts` |
| BusinessProfile | engine (spec 010) | name and email for the footer; `team: solo` ⇒ "I" | `readProfile`, `FALLBACK_PROFILE` |
| Inquiry | engine (spec 005) | a command: `inquire({ locale, page, fields })` after Turnstile, from the canonical host only | `app/lib/intake/handle.ts` |
| Manifest | the site declares, the engine keeps | `{ intake, blog, videos } + renders`, announced once per isolate | `app/lib/intake/manifest.ts`, `test/boundaries.test.ts` |
| Site key | minted by the engine, kept in Vault | a Worker secret; never logged (the kit's `SiteKeyError` names the variable, not the value) | `engine.ts` |

Pattern: **Anti-corruption layer** (`app/lib/platform/*`) — the engine's
answers are validated into the kit's types before any page sees them, and the
URL rewrite isolates the site from the engine's image-transform conventions.
Pattern: **Adapter** — `transportFor(env)` picks `rpc()` or `http()` from the
environment so the handler never names a host platform.

## 4. Delivery: two URL spaces, two cache policies

| Path | Source | Cache-Control | Why |
|---|---|---|---|
| `/api/media/file/<name>` | Payload media in the site's R2 bucket | `public, max-age=31536000, immutable` (set by the site) | Payload filenames are unique per upload; a replaced file is a new name |
| `/media/<key>` | engine media over the binding | **forwarded verbatim** from the engine | images arrive immutable; a shown clip arrives `max-age=300` and hiding must take effect within five minutes; never force immutable here |
| `/cdn-cgi/image/<opts>/api/media/file/<name>` | Cloudflare's transformation on the proxied zone | Cloudflare's | the `next/image` loader target (D10) |
| content pages | Next.js render, D1 reads | ISR through the R2 incremental cache (phase 2), `s-maxage` per page | the admin's edits appear within the revalidate window |
| `/admin/*`, `/api/*` (Payload REST) | Payload | `no-store` | per-user |

Pattern: **Policy object** for the cache rules (`app/lib/cache-policy.ts`,
one function from `(path, upstream headers)` to a `Cache-Control`), so the
"never immutable for video" rule is one line with one test, as montano-btm's
`lib/cache-policy.ts` does for images.

## 5. Context map

```
  Proprietor engine  ──(published language: kit types, manifest catalogue)──▶  Site: Platform Content (conformist + ACL)
  Payload (framework) ──(conformist: collections config, Local API, admin)──▶  Site: Site Content
  Site Content + Platform Content ──(shared kernel: SITE_HOST, cache policy)──▶  Delivery
  Cloudflare Access ──(upstream)──▶ /admin ; Payload auth ──(upstream)──▶ /admin, /api
  cloudflare-infra (Terraform) ──(parked .tf.pending, owner-applied)──▶ zone, custom domain, redirect, Access, Turnstile
```

The one constant shared by three contexts is the canonical host
(`juanramirez.codes`): the engine's site origin at minting, `ENGINE_WRITE_HOST`,
Payload's `serverURL`, the sitemap base and the JSON-LD `url`. It lives in one
place (`app/lib/site.ts`) and a test asserts the others derive from it (gap G4).

## 6. Gaps found (and what the spec does about each)

| # | Gap | Resolution |
|---|---|---|
| G1 | **Word collision: "projects".** Payload's `projects` collection (this site's case studies) and the engine's Projects module (spec 015, `has.projects`, `/work/<slug>` on client sites) share a name and even a path. | The manifest never declares `projects`; `/work` is Payload's here. `test/boundaries.test.ts` already asserts the manifest's exact keys — extend it to assert `projects` is absent. The engine's word is for trade owners' job write-ups; this site's are case studies. |
| G2 | **Two media stores, two URL spaces.** Payload media at `/api/media/file/*` (site bucket) and engine media at `/media/*` (engine bucket), with opposite cache rules. | Kept separate on purpose (ownership is different); one policy object (§4) and one test per rule. |
| G3 | **Profile split.** "Who I am" lives in Payload (`profile` global); the footer's name and email come from the engine's BusinessProfile. Two sources for one name. | Rule: the engine's profile is authoritative for *contact facts* (email), Payload's for *narrative* (bio, headline). The footer shows the engine's email and Payload's name; a test fails if the two names differ, so drift is caught, not hidden. |
| G4 | **The canonical host is named in five places.** | One constant; a test. The 301 from jrcodex.dev is edge-side (Terraform), so the app never sees the old host. |
| G5 | **Videos before kit 0.7.0.** `videos()` exists on the engine but not in the published kit. | PR #4's structural shim (`app/lib/platform/videos.ts`) calls the binding's `videos(siteKey)` directly; delete the lookup when 0.7.0 is published (its comment says so). |
| G6 | **Previews share production bindings** under `wrangler versions upload`. A preview that migrates D1 would migrate production. | D11: a `preview` wrangler environment with its own D1 and R2; CI uploads previews with `--env preview`; `payload migrate` in CI targets the environment's database. |
| G7 | **No email adapter on Workers** ⇒ no password reset. | D9: a scripted reset from his shell (plan §6); Access as the second lock. |
| G8 | **sharp is absent** ⇒ no `imageSizes`, no crop, no focal point, no blur placeholder generation (`blurDataURL` on main's Media). | D10: transformations at the edge; `blurDataURL` dropped (PR #5's `SuspenseImage` reserves the aspect ratio instead, CLS 0 measured). |
| G9 | **Ownership of the content rules** ("only montanobtm.com is live", "clients anonymised", "no invented numbers"). Today they live in memory files and PR descriptions. | They become invariants on the Project aggregate (hooks + tests) and a `CONTENT-RULES.md` beside the collections, so the admin cannot publish a breach by accident. |
| G10 | **The old export's social links are placeholders** and his LinkedIn URL is not on disk. | D6: an owner input; the seed refuses to run with a placeholder URL (`github.com/juanramirez`) in place. |
| G11 | **Migration ordering vs the open PRs.** Slice S1 swaps adapters that PR #3 upgraded; doing S1 before #3 merges means doing the upgrade twice. | D5: merge order first, then S1 on top; `tasks.md` S0 is the merge train. |
