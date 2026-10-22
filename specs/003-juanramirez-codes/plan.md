# 003 — Plan: juanramirez.codes as a Proprietor tenant

Read with `spec.md` (what and why), `domain-model.md` (contexts, ports,
gaps) and `tasks.md` (slices). Nothing here is applied: no deploy, no upload,
no DNS, no merge.

## 1. Architecture

```
                 ┌─────────────────────────── Cloudflare edge ────────────────────────────┐
  browser ─────▶ │ Workers Cache (RFC 9111; slices Range itself)   /cdn-cgi/image/*        │
                 │ Access on preview URLs (account-wide app)        Turnstile (siteverify) │
                 └──────────────────────────────────┬──────────────────────────────────────┘
                                                    ▼
                 ┌──────────────── Worker: juanramirez-codes (worker/index.ts) ───────────┐
                 │ (static assets in public/ are answered before the Worker runs)         │
                 │ 1. announceInBackground(manifestFor(caps))  production host only       │
                 │ 2. Hono app (src/app.tsx):                                             │
                 │    /projects* → 301 /work · /media/* (kit mediaHandler)                │
                 │    /assets/site.<hash>.css · pages (hono/jsx) · /api/inquiries         │
                 │    sitemap.xml · robots.txt · notFound · onError                       │
                 │ 3. withCachePolicy(request, response)                                  │
                 │                                                                        │
                 │ pages: lib/platform/* ── rpc(env.SEO, SEO_SITE_KEY) ──▶ SEO binding ───┼──▶ seo-engine
                 │ POST /api/inquiries ── Turnstile ── inquire()                          │    entrypoint Sites
                 │ vars: ENGINE_WRITE_HOST, TURNSTILE_SITE_KEY                            │    (no public URL)
                 │ secrets: SEO_SITE_KEY, TURNSTILE_SECRET_KEY                            │
                 └────────────────────────────────────────────────────────────────────────┘
```

No D1, no R2, no KV: the site keeps no data of its own. `wrangler.jsonc`:
`main: ./worker/index.ts`, `assets.directory: ./public`, a `Text` rule for
`**/*.css`, `compatibility_date` = the newest the installed workerd supports
(≥ 2026-04-21), `workers_dev: false`, `preview_urls: true`
(Access-gated), `cache.enabled: true`, `services: [{ binding: "SEO",
service: "seo-engine", entrypoint: "Sites" }]`, `routes: [{ pattern:
"juanramirez.codes", custom_domain: true }]` (attaches only once the zone is
active; the deploy is the owner's).

## 2. Files and contracts

Exclusive owner of each file: this branch. The interfaces other lanes will
touch are marked **contract**.

| Path | What | Contract |
|---|---|---|
| `worker/index.ts` | entry: announce, then the Hono app, then the cache policy | — |
| `src/app.tsx` | the Hono app: routes, `notFound`, `onError` | — |
| `src/routes/*.tsx` | one module per page group (home, about, work, blog, videos, contact, seo) | — |
| `src/views/*.tsx` | server-only `hono/jsx` components: document, header, footer, primitives | — |
| `src/assets.ts` | the CSS bundle (four files as text, in order), its hash and route | — |
| `lib/site.ts` | `SITE_HOST = "juanramirez.codes"`, `SITE_URL`, `absolute(path)`, `DEFAULT_LOCALE`, `GITHUB_URL`, `LINKEDIN_URL`, `FALLBACK_PROFILE` | one host constant (G4) |
| `lib/seo.ts` | `manifestFor({ videos })`, `engineClient(env)`, `mayWriteToEngine`, `announceInBackground`, `describe` | **contract**: the manifest the engine stores |
| `lib/cache-policy.ts` | `cachePolicy(req, res)`, `withCachePolicy` | rules in §3 |
| `lib/platform/reads.ts` | `readPosts`, `readPost`, `readSitemap`, `readProfile` with shape checks | ACL |
| `lib/platform/images.ts` | `plainPost`, `plainPostSummary`: transform URLs → originals off production | — |
| `lib/platform/videos.ts` | `readVideos(env)`, `canReadVideos(env)` | the shim (R4) |
| `lib/inquiry/{form,turnstile,handle}.ts` | the intake flow | **contract**: `POST /api/inquiries` answers `200 {ok:true}` or `{ok:false,error}` with 400/429/503 |
| `lib/projects/port.ts` | `ProjectsPort`, `ProjectCard`, `ProjectPage`, `ProjectStatus` | **contract** for the spec 030 adapter |
| `lib/projects/placeholder.ts` | `placeholderProjects` | replaced by the engine adapter |
| `lib/profile-links.ts` | `ProfileLinksPort`, `staticProfileLinks` | **contract** for spec 030's profile links |
| `content/*.ts` | narrative data: home, about, work summaries | claims rules (G8) |
| `styles/*.css`, `design-system.json` | PR #5's tokens, base, primitives, enhancements | contrast pairs |
| `public/` | fonts, `vendor/htmx-4.0.0.min.js`, favicon, `_headers` | — |
| `tests/unit/**` | Node-only unit tests (Vitest) | — |
| `tests/smoke/**`, `tests/stubs/seo-engine/**` | the Worker in `wrangler dev` (workerd) with a stub `seo-engine` | — |
| `tests/a11y/**`, `tests/perf/**` | Playwright + axe; Lighthouse | — |

### 2.1 The projects port (the seam for engine spec 030)

```ts
export type ProjectStatus = "live" | "built" | "in-progress";   // never "production"
export type ProjectKind = "product" | "open-source" | "platform" | "tooling" | "client";
export const LIVE_URLS = ["https://montanobtm.com/"];           // the only live links allowed
export interface ProjectCard {
  slug: string;            // kebab-case, unique
  title: string;
  summary: string;         // one or two sentences
  status: ProjectStatus;   // "live" only with an allow-listed live link
  kind: ProjectKind;       // grouping on /work
  role: string | null;     // "Designed and built it"
  stack: string[];         // chips
  highlights: string[];    // what was hard, what I did
  facts: Array<{ value: string; label: string; source: string }>;  // every number with its source
  links: Array<{ label: string; href: string; kind: "repo" | "live" | "write-up" }>;
  path: string | null;     // "/work/<slug>" when a page exists; null for a summary-only card
}
export interface ProjectPage extends ProjectCard { bodyHtml: string; updatedAt: string }
export interface ProjectsPort {
  list(): Promise<ProjectCard[]>;
  get(slug: string): Promise<ProjectPage | null>;
}
```

The engine adapter (later) maps spec 030's fixed core (title, summary,
cover, path) and this site's extension fields (role, stack, links, status)
onto `ProjectCard`. Until then `placeholderProjects.list()` returns the
static summaries in `content/work.ts` with `path: null`, and `get()` returns
null (so `/work/<slug>` is a 404, not a fake page).

## 3. Cache policy (`lib/cache-policy.ts`)

| Request | Response | Cache-Control | Why |
|---|---|---|---|
| not GET/HEAD, or `set-cookie` present | any | `private, no-store` | never store a write or a session |
| `/api/*` | any | `private, no-store` | routes |
| `/media/<slug>/video/*` | 200, 304 | **the engine's header, verbatim** (`public, max-age=300`); `private, no-store` if absent | spec 028: hiding reaches caches within 5 min; Workers Cache slices Range from the stored 200 |
| `/media/<slug>/video/*` | anything else | `private, no-store` | a Worker's 206 is never stored anyway |
| `/media/*` (images) | 200, 304; engine header says `private` | `private, max-age=86400` | a visitor's own picture (montano's rule) |
| `/media/*` (images) | 200, 304 | `public, max-age=31536000, immutable` | content-addressed originals |
| `/media/*` | other | `private, no-store` | |
| an htmx request (`HX-Request: true`) | any | `private, no-store` | a fragment must never be stored under a page's URL |
| `/assets/site.<hash>.css` | 200 | `public, max-age=31536000, immutable` | the URL changes with the content (R0) |
| page | 200 HTML, XML, text | `public, max-age=0, s-maxage=60, stale-while-revalidate=600` | edge keeps a minute, browsers revalidate |
| anything else | | `private, no-store` | unknown ⇒ not stored |

Adapted from montano-btm's `lib/cache-policy.ts` (develop, spec 008 D13);
the video rule is new here.

## 3.1 Images off the production host

The engine writes post images as `/cdn-cgi/image/<opts>/media/<key>`. That
path answers only on the proxied production zone with transformations
enabled, so a route whose request host is not `SITE_HOST` asks the readers
for originals (`{ originals: true }`), and they rewrite to `/media/<key>`
(PR #4's `plainPost`, which also rewrites `blocks` and the JSON-LD). Hono
hands each route its request, so no marker header is needed (montano-btm
needed one to reach its React Server Components).

## 4. Test strategy (all through `boxed`, in the foreground, with `timeout`)

| Suite | Runs | What it proves |
|---|---|---|
| `tests/unit` (Vitest, Node) | `npm run test:unit` | manifest, cache policy, intake handler outcomes, Turnstile, shape checks, image rewrite, videos shim, ports, content claims, contrast pairs |
| `tests/smoke` (Vitest → `wrangler dev -c wrangler.jsonc -c <stub>`) | `npm run test:smoke` | every page renders, the blog through `compose()`, `/media` streaming and headers, the inquiry route end to end (stub records the call, htmx fragment and no-JS fallback), redirects, robots/sitemap, Cache-Control on every response, 404/500 pages |
| `tests/a11y` (Playwright + axe) | `npm run test:a11y` against the smoke server | WCAG 2.2 AA, 0 violations, both schemes, 320 and 1280 px |
| `tests/perf` (Lighthouse, mobile, simulated 4G) | `npm run test:perf` | LCP, CLS, TBT budgets |

`npm run build` is `wrangler deploy --dry-run --outdir dist` (bundles,
uploads nothing); nothing in the tree calls `npm run build` (the 2026-10-20
freeze was a build that called itself).

## 5. Design system: PR #5 judged

To be filled from this branch's own checks (tokens test, axe, Lighthouse):
see §9 when the build reports.

## 6. Verified facts for the content (each with its source)

| Claim on the site | Source (command or file, 2026-10-21/22) |
|---|---|
| Proprietor's engine: 28 specs, 35 SQL migrations, 188 test files on `main` | `git -C ~/seo-engine ls-tree origin/main` at `9ca1df4` (specs dirs, `migrations/*.sql`, `*.test.ts`) |
| The engine and agents have no public address; doors are the dashboard (Access) and client sites | `~/seo-engine/docs/security-posture.md` (2026-10-04; workers.dev closed 2026-10-05) |
| Five locks, honest limit: all trust the first | same file, "The locks, in order" |
| Model output is JSON-Schema-constrained blocks; no model-written markup served | memory `portfolio-talking-points.md` (spec 019), stated as written |
| montanobtm.com is live on the platform | `curl https://montanobtm.com/` → 200 (2026-10-22); live since 2026-09-26 (memory `client-sites-actual-status.md`) |
| proprietor-mail: public, Apache-2.0, "built and tested, not deployed" | `gh api repos/Tobiscuit/proprietor-mail` (license apache-2.0), its README "Status" |
| proprietor-mail: HPKE-sealed per mailbox, keys wrapped per passkey (WebAuthn PRF) and a recovery key | its README, "The promise, and its limits" |
| Platform: one Hetzner node, k3s, Argo CD app-of-apps, 37 application manifests | `ls ~/platform-gitops/apps \| wc -l` = 37 at `be16e70` |
| Vault for secrets via external-secrets; nightly restic backups to R2 | `~/CLAUDE.md`; memory `node-backups-restic.md` |
| Cloudflare DNS across 7 zones in Terraform, state in R2 | `gh repo view Tobiscuit/cloudflare-infra` description; `~/CLAUDE.md` |
| Fluency: Next.js 16, React 19, Better Auth, Postgres, ts-fsrs, Stripe; CI builds the image, Argo CD rolls it | `~/CLAUDE.md` Fluency section; `~/fluency/.github/workflows/build-image.yml` |
| Fluency answers at fluency.study | `curl https://fluency.study/` → 200 (2026-10-22) |
| Pulse Agent: one Rust binary; the tool server's list is the capability ceiling; every call needs a technician keypress | `~/Projects/pulse-agent/README.md` |
| Pulse Diagnostics: Tauri 2 + Rust; the check-in starts on the stick | `~/Projects/pulse-diagnostics/README.md` |
| AWS Certified Cloud Practitioner is his one earned credential; no degree | memory `user-background.md` (confirmed 2026-09-09) |
| LinkedIn `https://www.linkedin.com/in/cloud-juan-manuel-ramirez/` | old site, `app/(app)/contact/page.tsx` on `main` |
| `juan@proprietor.systems` reaches him | `~/cloudflare-infra/proprietor-systems.tf` (forwarded: hello, tobias, juan) |

Not used (could not verify from a repo): any user or revenue numbers, the
old copy's "production-grade" and "I ship production systems for real
businesses", "CISSP Domain Mastery (20+ Hours)".

## 7. Parked infrastructure and teardown

Files in `specs/003-juanramirez-codes/infra/*.tf.pending`, re-targeted to the
Worker (nothing applied):

| File | What | Change from the first version |
|---|---|---|
| `juanramirez-codes-zone.tf.pending` | the zone, re-declared; 28-day rule | none in substance |
| `juanramirez-codes-turnstile.tf.pending` | one widget for `juanramirez.codes` (+ `jrcodex.dev` during the redirect window) | the secret goes in with `wrangler secret put` through stdin; no deploy wrapper |
| `jrcodex-dev-redirect.tf.pending` | 301 jrcodex.dev/www → juanramirez.codes | `/projects` → `/work` is answered by the Worker (R7) |
| ~~`juanramirez-codes-admin-access.tf.pending`~~ | removed | there is no admin: content is edited in the Proprietor dashboard, already behind Access |

**Teardown of the spike.** As far as known the spike created **no Cloudflare
resources**: it ran only locally (Vault was sealed, so no token existed in
the session). Verify after Vault is unsealed, read-only:

```sh
cd /home/link && export CLOUDFLARE_ACCOUNT_ID=93368368c927399b55ef1fb9e98df666
CLOUDFLARE_API_TOKEN="$(vault kv get -field=token secret/cloudflare/workers)" npx wrangler d1 list | grep -i portfolio-spike
CLOUDFLARE_API_TOKEN="$(vault kv get -field=token secret/cloudflare/workers)" npx wrangler r2 bucket list | grep -i portfolio-spike
```

Expect no output. If either prints, delete with `wrangler d1 delete
portfolio-spike-d1` / `wrangler r2 bucket delete portfolio-spike-media`.

## 8. Owner runbook (only Tobias, in order)

1. **Tenant** (engine lane): create business `juanramirez` (D3), mint its
   site key for origin `https://juanramirez.codes`, store it at
   `secret/portfolio/seo-site-key` in Vault.
2. **Turnstile**: create the widget in the dashboard (parked file's steps);
   put the site key in `wrangler.jsonc` `vars.TURNSTILE_SITE_KEY`; the secret
   at `secret/portfolio/turnstile`.
3. **Secrets** (stdin, never argv):
   `cd /home/link/portfolio && vault kv get -field=key secret/portfolio/seo-site-key | CLOUDFLARE_API_TOKEN="$(vault kv get -field=token secret/cloudflare/workers)" npx wrangler secret put SEO_SITE_KEY`
   and the same for `TURNSTILE_SECRET_KEY`.
4. **Zone**: state surgery and `juanramirez-codes-zone.tf.pending` (its
   header), then the nameservers at Namecheap the same day. Then enable
   Images → Transformations on the zone, so the engine's `/cdn-cgi/image/`
   post images resize there.
5. **Deploy** from `main` (Workers Builds, D11); the `routes` entry attaches
   `juanramirez.codes`.
6. **Redirect**: retire the Vercel project, flip jrcodex.dev's two records to
   proxied placeholders, apply `jrcodex-dev-redirect.tf.pending`.
7. **Spike teardown check** (§7).

## 9. Results on this branch

Filled as the build reports (test counts, axe, Lighthouse numbers, the
design-system judgment).
