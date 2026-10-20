# 003 — Plan: juanramirez.codes on Cloudflare Workers

Status: **proposal, 2026-10-20**, for the decision checkpoint. This plan says
how the site in `spec.md` is built if D1 (hosting) is decided for Workers,
what the spike measured, which contracts the build slices share, what
infrastructure is parked for the owner, and the runbook he will need. Nothing
in it is applied: no deploy, no DNS, no merge.

Read with: `spec.md` (what and why), `domain-model.md` (the DDD pass),
`tasks.md` (the test-first slices), `../../spike/payload-on-workers/README.md`
(the spike and its numbers).

## 1. Architecture

One Worker. Next.js 16 runs through `@opennextjs/cloudflare`; Payload 3.x is
mounted in the same app (`app/(payload)`), with D1 as its database and R2 as
its file store; the Proprietor engine is reached over a service binding.

```
                 ┌────────────────────────── Cloudflare edge ───────────────────────────┐
  browser ─────▶ │ Access (/admin*)   cache   /cdn-cgi/image/* transforms   Turnstile    │
                 └───────────────────────────────┬───────────────────────────────────────┘
                                                 ▼
                 ┌──────────────── Worker: juanramirez-codes (OpenNext) ────────────────┐
                 │  Next.js 16 server (App Router)            ASSETS: static files       │
                 │  ├── public pages  ── Payload Local API ──▶ D1  (binding D1)          │
                 │  │                                     └──▶ R2  (binding R2, uploads) │
                 │  ├── /admin, /api/* ── Payload (auth: cookie JWT + users_sessions)    │
                 │  ├── /blog, /videos, /media/*, /api/contact                           │
                 │  │        └── @jrcodex/seo-kit rpc(env.SEO, SEO_SITE_KEY) ──▶ SEO ────┼──▶ seo-engine
                 │  └── announce(manifest) once per isolate, canonical host only         │     (Sites entrypoint)
                 │  secrets: PAYLOAD_SECRET, SEO_SITE_KEY, TURNSTILE_SECRET_KEY          │
                 │  vars:    SITE_HOST, ENGINE_WRITE_HOST, TURNSTILE_SITE_KEY            │
                 └────────────────────────────────────────────────────────────────────────┘
```

Bindings (`wrangler.jsonc`, one `env.preview` block with its own data; D11):

| Binding | Production | Preview | Why |
|---|---|---|---|
| `D1` (d1_databases) | `portfolio-d1` | `portfolio-preview-d1` | Payload's data; previews must never migrate production (gap G6) |
| `R2` (r2_buckets) | `portfolio-media` | `portfolio-preview-media` | Payload uploads, served at `/api/media/file/<name>` |
| `SEO` (services → `seo-engine`, entrypoint `Sites`) | same | same | the engine; previews read but never write (`ENGINE_WRITE_HOST`) |
| `ASSETS` | OpenNext's | OpenNext's | static output |
| `NEXT_INC_CACHE_R2_BUCKET` + `WORKER_SELF_REFERENCE` | optional, phase 2 | optional | ISR cache; only if content pages are not fully dynamic |

The custom domain is **part of the Worker's deploy**, not Terraform:
`"routes": [{ "pattern": "juanramirez.codes", "custom_domain": true }]`, for
the reasons recorded in `~/cloudflare-infra/seo-engine-access.tf` ("THE
HOSTNAME IS NOT DECLARED HERE, deliberately": the Terraform token cannot write
Workers domains, and a Workers domain lives and dies with the Worker). It only
works once the zone is active (§5).

**The fallback, if D1 says no.** The public site stays exactly this Worker,
reading D1 and R2; only *editing* moves to the node: Payload's admin runs as a
k3s Deployment (behind Access, the node's Postgres), and a **publish** job
copies the documents and files into the Worker's D1 and R2 (Payload Local API
export → `wrangler d1 execute` / `rclone`), so the public site never calls the
node at runtime. Costs: a second runtime to keep current, a sync that can lag,
no "edit from a phone", and the node's downtime becomes the editor's downtime.
It is a real option, not a punishment; the spike's numbers decide (§3).

## 2. The template, as read, and the APIs this plan relies on

Payload's `templates/with-cloudflare-d1` (GitHub `main`, read 2026-10-20; the
spike copies it rather than inventing):

- OpenNext (`open-next.config.ts`, `wrangler.jsonc` with `nodejs_compat`),
  `@payloadcms/db-d1-sqlite` and `@payloadcms/storage-r2`.
- A console logger: `pino-pretty` needs Node APIs workerd lacks.
- `crop: false`, `focalPoint: false` on uploads "due to lack of sharp"; no
  `imageSizes` (D10).
- GraphQL "not guaranteed" on Workers (workerd issue 5175); this site does not
  use it (`graphQL: { disable: true }`).
- README: "can only be deployed on Paid Workers right now due to size
  limits". **Stale on the size side** (spec §1: 64 MiB uncompressed on Free
  and Paid, no compressed limit, 1 s startup); the account is on Workers Paid
  regardless.

APIs, verified with context7 on 2026-10-20:

| What | Shape | Note |
|---|---|---|
| Bindings from Next code | `const { env } = await getCloudflareContext({ async: true })` (`@opennextjs/cloudflare`) | `async: true` is required in statically generated routes and under `next dev`; `initOpenNextCloudflareForDev()` in `next.config` for dev |
| Payload database | `sqliteD1Adapter({ binding: env.D1 })` | `binding` required, must match the wrangler binding name |
| Payload files | `r2Storage({ collections: { media: true }, bucket: env.R2 })` | one bucket, one collection |
| Payload 4 | `4.0.0-beta.3` on `beta`; its migration guide ships `migrate:create --file @payloadcms/db-d1-sqlite/sizes-to-variants` | the build phase targets **3.91** (`latest`); the 4.x upgrade is a scheduled migration, not a pin (CLAUDE.md) |

## 3. Spike measurements

> Filled from `spike/payload-on-workers/README.md` when the builder reports.
> Verdict for D1 is written here, under the numbers, so it cannot drift from
> them. Vault was **sealed** during this run: everything below that needs the
> account is listed as pending with the exact commands.

### 3.1 Local (workerd through `opennextjs-cloudflare preview`)

_pending builder report_

### 3.2 Remote preview (needs Vault unsealed; not run this phase)

```sh
cd /home/link/worktrees/portfolio-juanramirez/spike/payload-on-workers
export VAULT_ADDR=https://vault.superblock.dev CLOUDFLARE_ACCOUNT_ID=93368368c927399b55ef1fb9e98df666
export CLOUDFLARE_API_TOKEN="$(vault kv get -field=token secret/cloudflare/workers)"
npx wrangler d1 create portfolio-spike-d1            # paste database_id into wrangler.jsonc
npx wrangler r2 bucket create portfolio-spike-media
openssl rand -hex 32 | npx wrangler secret put PAYLOAD_SECRET   # stdin, never argv
npm run migrate:remote                                # per the template's mechanism (README)
npx opennextjs-cloudflare build
npx wrangler versions upload --preview-alias spike    # prints startup time; NEVER `deploy`
BASE_URL=https://spike-<worker>.<subdomain>.workers.dev scripts/measure.sh
unset CLOUDFLARE_API_TOKEN
```

Teardown after the decision: `npx wrangler d1 delete portfolio-spike-d1`,
`npx wrangler r2 bucket delete portfolio-spike-media`, `npx wrangler delete
--name portfolio-spike` (each needs the token for that one command).

### 3.3 Verdict on D1

_pending the numbers_

## 4. Contracts between slices

File ownership is exclusive per slice (`tasks.md`); these are the interfaces
they share. A slice may read any of them; only the owner changes one.

| Contract | Owner | Shape |
|---|---|---|
| **Canonical host** | S5 | `app/lib/site.ts`: `export const SITE_HOST = "juanramirez.codes"`; `canonical(path: string): string` returns `https://${SITE_HOST}${path}`. Payload `serverURL`, the sitemap base, JSON-LD `url` and `ENGINE_WRITE_HOST`'s default derive from it (gap G4); a test greps for the literal host outside this file and fails on a second occurrence |
| **Cache policy** | S5 | `app/lib/cache-policy.ts`: `cacheControlFor(path: string, upstream: Headers \| null): string`. Rules: `/api/media/file/*` → `public, max-age=31536000, immutable`; `/media/*` → `upstream.get("cache-control")` verbatim (a video's `max-age=300` survives, PR #4 `a4ad7f7`); `/admin*`, `/api/*` (not media files) → `no-store`; content pages → the page's own `s-maxage`. One test per rule |
| **Platform env** | S1 | `app/lib/platform/env.ts`: `platformEnv(): Promise<PlatformEnv>` becomes `const { env } = await getCloudflareContext({ async: true }); return env as PlatformEnv` (PR #4 says this is the one body that changes). `transportFor(env)` in `app/lib/intake/engine.ts` is unchanged: `SEO` bound ⇒ `rpc` |
| **Manifest** | S5 (test), PR #4 (module) | `app/lib/intake/manifest.ts` unchanged: `has: { intake, blog, videos }`; `test/boundaries.test.ts` gains `expect(manifest.has).not.toHaveProperty("projects")` (gap G1) |
| **Payload config** | S1 (adapters, `serverURL`, `secret`, logger, `graphQL.disable`), S2 (`collections`, `globals`) | `payload.config.ts`: S1 lands first with the spike's three collections; S2 replaces the `collections`/`globals` arrays with `collections/*.ts` and `globals/*.ts` and touches nothing else in the file |
| **Content rules** | S2 | `collections/CONTENT-RULES.md` + hooks: `beforeValidate` on `projects` rejects `status: live` for `kind: client` unless `slug ∈ LIVE_CLIENT_SLUGS` (`["montanobtm"]`); rejects an `outcomes[]` row without `source`; `afterRead` strips `clientName` when `anonymised` and no user. Each rule is a pure function in `collections/rules.ts` with a unit test, then wired as a hook |
| **Migrations** | S1 (initial), S2 (model) | `src/migrations/*` from `payload migrate:create`; CI applies to the environment's D1 before upload (`tasks.md` S6); never hand-written SQL |
| **Media URLs** | S1 | Payload serves `/api/media/file/<filename>`; the `next/image` loader (S4) maps to `/cdn-cgi/image/<opts>/api/media/file/<filename>` only when `SITE_HOST` is proxied; otherwise the original |
| **Seed / import** | S3 | `scripts/import-content.ts` (Local API, idempotent on slug), `scripts/verify-import.ts` (counts, slugs, byte lengths; non-zero exit on any difference); refuses to run with a placeholder social URL |
| **Deploy wrapper** | S6 | `scripts/deploy`: the seo-engine pattern (`~/seo-engine/deploy`): reads `secret/cloudflare/workers` from Vault per invocation, exports `CLOUDFLARE_API_TOKEN` to the child `wrangler` only; never argv, never a file |
| **Preview environment** | S6 | `wrangler.jsonc` `env.preview` with its own D1/R2 ids; CI uploads with `--env preview --preview-alias pr-<n>`; Access already covers all preview Workers (`~/cloudflare-infra/worker-previews-access.tf`, `all_preview_workers`) |

## 5. Parked infrastructure (owner-applied; nothing here is applied)

Files are in `specs/003-juanramirez-codes/infra/*.tf.pending` in this PR and
copied, untracked, into `~/cloudflare-infra/` where the repo's convention
keeps unapproved changes (`docs/plan-breakage-2026-10-16.md`). The three
existing `jrcodex-*.tf.pending` files are **not edited** (D3).

| File | What | Depends on |
|---|---|---|
| `juanramirez-codes-zone.tf.pending` | `cloudflare_zone.juanramirez_codes` re-declared (Free plan) with the 28-day rule in its header; outputs the zone id and nameservers | the state surgery in `plan-breakage-2026-10-16.md` **first** (the dead zone's id is still in state under the same address), then nameservers at Namecheap within 28 days |
| `juanramirez-codes-admin-access.tf.pending` | Access application for `juanramirez.codes/admin*` and the three auth endpoints (`/api/users/login`, `/api/users/first-register`, `/api/users/forgot-password`); policy: his identity through the existing provider; `session_duration` long, as montanobtm's admin | the zone active; the Worker deployed on the custom domain |
| `jrcodex-dev-redirect.tf.pending` | `cloudflare_ruleset` phase `http_request_dynamic_redirect` on jrcodex.dev: 301 apex and `www` → `https://juanramirez.codes${path}${query}` (the `proprietorsystems-com.tf.pending` shape) | the two Vercel records in `dns.tf` flipped to proxied placeholders (`A 192.0.2.1`, `proxied = true`) **after** the Vercel site is retired; described in the file, not edited here |
| `juanramirez-codes-turnstile.tf.pending` | re-target of `jrcodex-turnstile.tf.pending`: one widget, domains `["juanramirez.codes", "jrcodex.dev"]` for the redirect window, same dashboard-first import path (the Terraform token has no Turnstile permission) | nothing; can be created in the dashboard today |
| (none) | previews: already covered by `worker-previews-access.tf` (`all_preview_workers`) | — |
| (none) | mail on the new domain: D3b says not now; a later file | — |

## 6. Owner runbook (the steps only Tobias can do, in order)

1. **Unseal Vault** (CLAUDE.md), then `./tf plan` state surgery for the dead
   zone (`~/cloudflare-infra/docs/plan-breakage-2026-10-16.md`).
2. **Zone**: `mv juanramirez-codes-zone.tf.pending juanramirez-codes-zone.tf && ./tf plan` (expect 1 to add), apply, then at Namecheap set the nameservers the output prints. 28 days.
3. **Resources** (the deploy token, per invocation; the repo's `scripts/deploy` wraps this):
   `cd ~/portfolio && scripts/deploy d1 create portfolio-d1 && scripts/deploy d1 create portfolio-preview-d1 && scripts/deploy r2 bucket create portfolio-media && scripts/deploy r2 bucket create portfolio-preview-media`; paste the ids into `wrangler.jsonc`.
4. **Secrets** (stdin from Vault, never argv): `vault kv get -field=secret secret/portfolio/payload | scripts/deploy secret put PAYLOAD_SECRET`; the site key: mint for business `juanramirez`, origin `https://juanramirez.codes`, the same procedure as montanobtm's key (engine spec 005; the operator CLI in `~/seo-engine`), store at `secret/portfolio/seo-site-key`, then `vault kv get -field=key secret/portfolio/seo-site-key | scripts/deploy secret put SEO_SITE_KEY`. Preview secrets the same with `--env preview`.
5. **Migrate** the production D1 (`tasks.md` S6 names the command the template uses; recorded in the spike README).
6. **First user**: open `/admin` once; `first-register` closes itself. Password reset later: `scripts/reset-password.ts` through the same remote-binding mechanism as migrations (D9).
7. **Custom domain**: `scripts/deploy deploy` from `main` only (CI does it); the `routes` block attaches `juanramirez.codes`.
8. **Access** for `/admin`: rename and apply `juanramirez-codes-admin-access.tf.pending`.
9. **Redirect**: retire the Vercel project, flip `dns.tf`'s two records to proxied placeholders, apply `jrcodex-dev-redirect.tf.pending`.
10. **Teardown** the spike (`§3.2`).

Inputs only he has: his LinkedIn URL (gap G10), the per-client anonymisation
decisions (D7), the Namecheap login (never stored here; Vaultwarden).

## 7. Verification plan for the budgets (spec §3)

| Gate | Tool | Where it runs | Pass |
|---|---|---|---|
| LCP < 2.0 s (4G), CLS < 0.05, TBT (INP proxy) | Lighthouse CI (`@lhci/cli`), mobile preset, 3 runs, median | CI job against the PR's preview alias; the report attached to the PR | `assertions` in `lighthouserc.json`; a failing budget fails the job |
| WCAG 2.2 AA | Playwright + axe-core (PR #5's method, moved into `tests/a11y.spec.ts`) | CI, `next start` of the build | 0 violations on every public route, dark and light, 320 and 1280 px |
| JS weight ≤ 100 KB gzip on content pages | `next build` manifest asserted in `tests/weight.node-test.ts` | CI | fails over budget |
| Startup < 1 s with margin; cold TTFB | `wrangler versions upload` output + `spike/.../scripts/measure.sh` against the alias | CI, recorded in the job summary | the number is recorded per upload; regression > 20 % fails |
| Cache rules, host constant, manifest keys, content rules | Vitest / node:test | CI | one test per rule (§4) |

## 8. Verified numbers for the content plan

> Filled from the read-only research pass when it reports; each row carries
> the command or path it came from. Rows that could not be verified are
> listed separately and are **not** used in copy.

_pending research report_
