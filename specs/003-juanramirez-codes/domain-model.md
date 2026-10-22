# 003 — Domain model

The DDD pass for juanramirez.codes as a Proprietor tenant: bounded contexts,
what the site owns and what it only reads, the ports that wait on other
lanes, the context map and the gaps. Patterns are named where they are used,
with one line on why.

## 1. Bounded contexts

```
  ┌──────────────────────────── juanramirez.codes (one Worker) ────────────────────────────┐
  │                                                                                         │
  │  NARRATIVE (core, the site's own)        PLATFORM CONTENT (supporting, the engine's)    │
  │  home + about copy, experience,          Post · BusinessProfile · Inquiry · Video       │
  │  credentials, the flagship summaries     · Project (spec 030, not yet) · ProfileLinks   │
  │  content/*.ts, reviewed in PRs           read through @jrcodex/seo-kit over SEO binding │
  │          │                                         │                                    │
  │          └──────────── DELIVERY (supporting) ──────┘                                    │
  │                 routes, worker/index.ts, cache policy, /media door, redirects           │
  │                                                                                         │
  │  IDENTITY (generic): the site key (a Worker secret) · ENGINE_WRITE_HOST · Turnstile     │
  └─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Narrative** is the core: what makes this his portfolio and not a template —
who he is, what he built, with every claim traceable to a file or command
(`plan.md` §6). It is code because it changes rarely, deserves review, and
carries rules (no invented numbers, client-naming rules) that a test can
check.

**Platform Content** belongs to Proprietor. The site is a **conformist** to
the kit's types for reads and keeps an **anti-corruption layer**
(`lib/platform/*`): every answer is shape-checked before a page sees it, and
image URLs are rewritten off the production host. A change in the engine's
answers fails loudly in one module instead of rendering garbage.

**Delivery** joins the two: one Worker, two URL spaces (pages, `/media/*`),
one cache policy.

**Identity** is generic and small: the site key makes the Worker a tenant;
the write host keeps previews from writing; Turnstile keeps bots out of his
inbox.

## 2. What the site owns (invariants)

| Concept | Kind | Invariants | Enforced by |
|---|---|---|---|
| **Manifest** | value object, built by `manifestFor(caps)` | declares only what the site renders: `blog`, `intake`; `videos` only when readable; never `projects` until the port has a real adapter; `intake.fields` equals the form's fields | `tests/unit/seo.test.ts` |
| **InquirySubmission** | command | honeypot → field rules → Turnstile → write host → announce → `inquire`; only `name`, `email`, `message`; the visitor's words never logged | `tests/unit/inquiry.test.ts`, smoke `inquiries` |
| **CachePolicy** | policy object | every response leaves with an explicit `Cache-Control`; a video is never `immutable`; anything unrecognised is `private, no-store` | `tests/unit/cache-policy.test.ts` |
| **ContentClaim** | rule over `content/*` | only montanobtm.com is "live" among client work; other client builds are "built"; no "production"; no Three Chicks, no "Gilded Shear"; no degree; no hardware security keys | `tests/unit/claims.test.ts` (greps the built HTML and `content/`) |
| **ProjectCard** | read model (port output) | a card states its `status` from the closed set `live` · `built` · `in-progress`; `live` only with an allow-listed URL | `lib/projects/port.ts` types + `tests/unit/projects.test.ts` |

## 3. The ports (the seams for work in other lanes)

Pattern: **Ports and adapters** (hexagonal) — the page depends on an
interface the site defines; an adapter answers it. Today's adapters are
placeholders; the engine-backed adapter replaces them without touching a
page.

| Port | Shape (site-owned) | Adapter today | Adapter later | Waits on |
|---|---|---|---|---|
| `ProjectsPort` (`lib/projects/port.ts`) | `list(): Promise<ProjectCard[]>`, `get(slug): Promise<ProjectPage \| null>` | `placeholderProjects` (static cards from `content/work.ts`; `get` → null) | an engine adapter over `projects()`/`project()` mapping spec 030's extension fields | engine spec 030 contract shapes; kit release carrying them |
| `ProfileLinksPort` (`lib/profile-links.ts`) | `links(): Promise<ProfileLink[]>` (`kind`: github · linkedin · email · other) | `staticProfileLinks` (GitHub, LinkedIn from `lib/site.ts`) | the engine's profile links | engine spec 030 |
| `readVideos` (`lib/platform/videos.ts`) | `VideoSummary[]` | the shim: kit `videos()` if present → `SEO.videos(siteKey)` if present → `[]` | kit 0.7.0's `videos()` only (delete the lookup) | kit 0.7.0 published |

Pattern: **Adapter** also in `lib/seo.ts` (`engineClient(env)` builds the
kit's `rpc()` client from the env) and **Strategy** in the videos shim (three
sources tried in order, one result shape).

## 4. The engine's side, as the site sees it

| Concept | Owner | The site's view | Checked in |
|---|---|---|---|
| Post, PostSummary | engine | read-only; `compose()` lays out the plan; images rewritten off production | `lib/platform/reads.ts` (`isPost`, `isPostSummary`) |
| BusinessProfile | engine (spec 010) | name and email for the footer and contact page; `team: solo` ⇒ "I" | `readProfile`, `FALLBACK_PROFILE` |
| Inquiry | engine (spec 005) | a command after Turnstile, from the production host only | `lib/inquiry/handle.ts` |
| VideoSummary | engine (spec 028) | read-only; `[]` when none; never an error | `lib/platform/videos.ts` |
| Project (content model) | engine (spec 030) | **not read yet**; the port's types are the site's own and will map to whatever 030 forwards | `lib/projects/port.ts` |
| Site key | engine mints, Vault keeps | a Worker secret; never logged | `lib/seo.ts` |

## 5. Context map

```
  Proprietor engine ──(published language: kit 0.6.2 types, manifest catalogue)──▶ Platform Content (conformist + ACL)
  engine spec 030   ──(not yet published; the site waits behind ports)───────────▶ ProjectsPort, ProfileLinksPort
  Narrative + Platform Content ──(shared kernel: lib/site.ts host + links, cache policy)──▶ Delivery
  Cloudflare (Turnstile, Workers Cache, Access on previews) ──(upstream)──▶ Delivery
  cloudflare-infra ──(parked .tf.pending, owner-applied)──▶ zone, Turnstile widget (jrcodex.dev left as it is)
```

## 6. Gaps found (and what the spec does about each)

| # | Gap | Resolution |
|---|---|---|
| G1 | **"projects" means two things.** The engine's Projects module (spec 015) is a trade owner's job write-up; this site's projects are software case studies. Spec 030 resolves it engine-side (a fixed project core with per-business extension fields and labels). | The site does not declare `projects` until spec 030's adapter exists (R3). The port's names are the site's (`ProjectCard`), so the mapping lives in one adapter. |
| G2 | **Profile links have no home on the engine.** `BusinessProfile.social` has only `instagram` and `facebook`. | `ProfileLinksPort` with a static adapter; spec 030 adds profile links. |
| G3 | **Two sources for his name.** The engine's profile and `lib/site.ts`. | The engine's profile wins for contact facts (name, email); the site's constants are the fallback only. |
| G4 | **The canonical host appears in several places** (manifest write host, sitemap base, JSON-LD, wrangler route, Turnstile hostnames). | One constant in `lib/site.ts`; `wrangler.jsonc` and the parked Terraform cite it; a unit test fails if `ENGINE_WRITE_HOST` differs from it. |
| G5 | **Videos before kit 0.7.0.** | The shim (§3); `manifestFor` declares `videos` only when readable (R4). |
| G6 | **Smoke tests see the production host.** `wrangler dev` with a custom-domain route rewrites the URL host (memory, 2026-09-29), so host-dependent logic reads as production there. | Host-dependent rules are tested at the unit level; the smoke run's stub engine only records calls. |
| G7 | **A tenant without a tenant row.** The site key and the business do not exist yet. | Every read degrades to a fallback (empty blog, site profile); the inquiry form answers 503 with the e-mail fallback until the key exists (D3). |
| G8 | **Content claims live in memory files**, not in the repo. | `tests/unit/claims.test.ts` turns the rules into failing tests over `content/` and the rendered pages. |
| G9 | **Client consent.** Naming a client on a public portfolio is the client's and Tobias's call. | Only montanobtm.com is named (its owner's site is live on the platform and was named in the earlier spec as allowed); the rest are anonymised placeholders flagged in D5. |
