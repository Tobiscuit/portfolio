# 002 — Plan

Architecture, the contracts between slices, the infrastructure parked for
approval, and the owner's runbook. The slices and their acceptance tests are
in `tasks.md`.

## 1. Shape of the work: two halves in one PR

The PR reviews in two halves, in commit order:

1. **Additive platform modules** (slice A) — new pages and reads that also
   work on today's Next.js/Vercel build with `http()` or nothing configured.
   Nothing breaks if the cutover waits.
2. **Hosting cutover** — ON HOLD until Tobias decides D1. Written twice in
   `tasks.md`: slice B (vinext, Payload retired) and slice B′ (hybrid:
   OpenNext + Payload on D1/R2 beside the kit's modules). Exactly one is
   built, in its own commits, last. Under B′, A's `/work` commit is reverted
   and the engine PR drops its "028 projects" commits.

The engine's half (slice E) is a separate PR in `~/seo-engine`.

```
  app/
    (app)/blog/page.tsx, blog/[slug]/page.tsx       A
    (app)/work/page.tsx, work/[slug]/page.tsx       A
    (app)/videos/page.tsx                           A
    (app)/layout.tsx  (+ <Footer/>)                 A (3 lines)
    components/Header.tsx (nav: Blog, Work, Videos) A (navLinks only; the redesign lane restyles)
    components/platform/*                           A  plain semantic markup, existing tokens
    lib/platform/env.ts        runtime env           A creates (process.env); B swaps the body (cloudflare:workers)
    lib/platform/client.ts     PlatformConnection    A
    lib/platform/reads.ts      cached reads          A
    lib/platform/videos.ts     the structural shim   A
    lib/site.ts                SITE_URL, links, fallback profile   A
    lib/legacy-redirects.ts    D13 map               B
    lib/intake/manifest.ts     has: intake, blog, projects         A
    sitemap.ts, robots.ts                           A
    api/contact/route.ts       env from cloudflare:workers         B
  worker/index.ts, wrangler.jsonc, vite.config.ts, env.d.ts, .dev.vars.example   B
  scripts/export-portfolio.mjs                      B (first commit of the slice, before removals)
  tests/smoke/**, tests/stubs/seo-engine/**          B (built Worker + stub engine over wrangler dev)
  test/**                                            A (Node, stub over http())
  docs/delivery-pipeline.md, .github/workflows/ci.yml   B
  specs/002-proprietor-adoption/**                   architect; tasks.md ticks by each slice
```

Removed by B: `app/(payload)/**`, `collections/`, `payload.config.ts`,
`payload-types.ts`, `scripts/{mirror-assets,seed,verify-media,check-region}.ts`,
`seed*.log`, `public/media/`, `postcss.config.js` (Tailwind through
`@tailwindcss/vite`), `app/lib/getProjects.ts`, `app/lib/project-data.ts`,
`app/lib/types.ts`, `app/(app)/projects/**`, `app/components/ProjectCard.tsx`,
`app/components/ProjectDetailsView.tsx`, `app/lib/ses/**` and the SES branch
of the route (B-D1 decided; the platform path is the only path on the
Worker), `next.config.js` → `next.config.mjs` without `withPayload`.

## 2. Contracts

### 2.1 The site's reads (A), honoured by the stub (A) and the engine (E)

Rules, from montano `lib/blog.ts` and `lib/projects.ts`:

- A list read (`posts`, `projects`, `videos`, `profile`) on an unconnected
  site answers empty / the fallback profile and logs once per isolate. A
  connected site whose list read fails lets the error through on `/blog`
  and `/work` (a 5xx is retried by crawlers) but not on the home page, the
  footer or the sitemap, which show none.
- A single read (`post`, `project`) answering `null` is `notFound()`; a
  project whose `path` is not the URL asked for redirects to its real path.
- Reads are allowed from any host; writes only from `ENGINE_WRITE_HOST`.
- Images: on the production host, the engine's transform URLs as given;
  off it (previews, local), `/cdn-cgi/image/...` is rewritten to
  `/media/<key>` (montano `lib/images.ts`), because transforms answer only on
  the production zone.
- Every page: one `<h1>`; the engine's canonical and alternates as
  `postMetadata` gives them; `robots: { index: false }` on an empty index.

### 2.2 Videos (E provides, A consumes through the shim)

```ts
/** One cut the owner chose to show (engine spec 028). */
export interface VideoSummary {
  id: string;
  /** The owner's title, one language. */
  title: string;
  /** Root-relative: /media/<slug>/video/renders/<id>.mp4 — serve with mediaHandler. */
  src: string;
  contentType: "video/mp4";
  seconds: number;
  format: "landscape" | "portrait";   // 1920x1080 or 1080x1920 (src/video/profiles.ts FORMATS)
  /** ISO 8601: when the owner showed it on the site. Newest first in the list. */
  publishedAt: string;
}
// Sites:   videos(siteKey: string): Promise<VideoSummary[]>
// Kit 0.7: client.videos(): Promise<VideoSummary[]>;  http(): GET /v1/videos
// media(): a render key answers only while shown; honours Range -> 206 with
//          Content-Range and Accept-Ranges: bytes; HEAD answers the headers.
```

The site's shim (`app/lib/platform/videos.ts`): if `env.SEO` has a function
`videos`, call `env.SEO.videos(siteKey)`; otherwise `[]`. Deleted when the
site moves to kit 0.7.0.

`ProjectSummary.link: string | null` is read the same way: `"link" in
summary ? summary.link : null`.

### 2.3 PortfolioExport (B's export writes it; E's import reads it)

```ts
export interface PortfolioExport {
  version: 1;
  source: "mongo" | "code";
  exportedAt: string;                 // ISO 8601
  /** The origin the images are fetched from by the engine's import-gallery task. */
  origin: string;                     // "https://jrcodex.dev"
  projects: ExportedProject[];        // in display order (Payload `order`, or the array order)
}
export interface ExportedProject {
  legacyId: number;                   // Payload `order` / project-data `id`: the /projects/<id> URL
  title: string;                      // <= 160
  summary: string;                    // description, <= 400 (truncated at a sentence end if longer, the rest moved into the body's first paragraph)
  link: string | null;                // the live URL, https only
  service: string;                    // a taxonomy category (plan §7); the owner edits
  features: string[];
  tech: string[];
  /** Sections in order; `html` is the Payload/data HTML as stored (the import sanitises). */
  sections: { heading: string | null; html: string; listHtml: string | null; image: ExportedImage | null }[];
  cover: ExportedImage | null;
}
export interface ExportedImage {
  /** Root-relative path on `origin`, e.g. /images/projects/weatherwise/arch_diagram_1.png */
  path: string;
  alt: string;
  role: "detail";                     // software screenshots have no before/after
}
```

The import turns `sections` into one `bodyHtml`: `<h2>` per heading, the
section's paragraphs, its list, "Built with: …" as the last paragraph; the
images become `project_images` in section order with the cover first; the
rows are emitted as SQL for review (`scripts/showcase/build.ts` is the
pattern), applied with `./deploy d1 execute seo-engine --remote --file`.

### 2.4 Worker config (B) — the facts it must carry

`name: "jrcodex-dev"` (never `juanramirez-portfolio`, which exists);
`routes: [{ pattern: "jrcodex.dev", custom_domain: true }, { pattern:
"www.jrcodex.dev", custom_domain: true }]`; `workers_dev: false`;
`preview_urls: true`; `compatibility_date` no later than the workerd both
wrangler and the test pool ship, and on or after 2026-04-21 (enhanced error
serialization: `InquiryRefused.retryAfterSeconds` crosses the binding);
`compatibility_flags: ["nodejs_compat"]`; `services: [{ binding: "SEO",
service: "seo-engine", entrypoint: "Sites" }]`; `vars: { ENGINE_WRITE_HOST,
CONTACT_FALLBACK_EMAIL }` (+ `TURNSTILE_SITE_KEY` once the widget exists);
secrets `SEO_SITE_KEY`, `TURNSTILE_SECRET_KEY` through stdin; `assets:
{ not_found_handling: "none" }`; `observability.enabled: true`; `cache:
{ enabled: true }` with an explicit Cache-Control on every response
(montano `lib/cache-policy.ts`). No D1, no R2, no KV: the site stores nothing.

### 2.5 The contact route on the Worker (B)

`handleContact(request, { env: { SEO: env.SEO, SEO_SITE_KEY, ENGINE_WRITE_HOST,
CONTACT_FALLBACK_EMAIL, TURNSTILE_SECRET_KEY, NEXT_PUBLIC_TURNSTILE_SITE_KEY:
env.TURNSTILE_SITE_KEY } })`. The handler and its tests are unchanged; the
page's inlined `NEXT_PUBLIC_TURNSTILE_SITE_KEY` keeps its name (vinext
honours `NEXT_PUBLIC_*` at build time).

## 3. Delivery (B, documented as montano's `docs/delivery-pipeline.md`)

- Branches: `develop` is created at merge time by the owner (it does not
  exist in this repo yet); until then PRs stack on `main`.
- Workers Builds, two triggers: production `main` → `npm run build` then
  `npx wrangler deploy -c dist/server/wrangler.json`; preview `*` minus
  `main` → `npm run build` then `npx wrangler versions upload -c
  dist/server/wrangler.json`, no alias.
- CI (`.github/workflows/ci.yml`): `npm ci`, typecheck, build, test; no
  secrets, no deploy.
- What only the owner can do: connect the repo, create the triggers, put the
  secrets, confirm the preview gate.

## 4. Dependency currency (B)

Every dependency the ported site keeps or adds lands at the current stable
`npm view <pkg> version` at the time of the slice, breaking changes
researched with context7, versions and any deliberate hold recorded in
`tasks.md` B6 and the PR body. Montano's versions are a reference, not the
target. Expected set: `vinext`, `vite`, `@cloudflare/vite-plugin`,
`@vinext/cloudflare`, `@vitejs/plugin-rsc`, `wrangler`, `react`,
`react-dom`, `@types/react`, `@types/react-dom`, `@types/node`, `typescript`,
`tailwindcss`, `@tailwindcss/vite`, `lucide-react`, `react-zoom-pan-pinch`,
`@jrcodex/seo-kit` (0.6.2 exact: 0.7.0 is unpublished), `vitest`, `eslint`
and whichever flat config survives Next's removal (if `eslint-config-next`
needs `next`, replace it with `typescript-eslint` + `eslint-plugin-react-hooks`
and say so).

## 5. Tests, with no secrets anywhere

- A: vitest in Node against `test/stub-engine.ts`, extended with the read
  routes (`GET /v1/posts`, `/v1/posts/:locale/:slug`, `/v1/projects`,
  `/v1/projects/:locale/:slug`, `/v1/profile`, `/v1/sitemap`, `/v1/media/*`,
  `/v1/videos`), fixtures shaped like montano's
  `tests/stubs/seo-engine/fixtures.ts`; pages rendered with
  `renderToStaticMarkup` after awaiting the server component.
- B: montano's smoke harness: `vinext build`, then `wrangler dev --local` of
  `dist/server/wrangler.json` beside a stub `seo-engine` Worker whose `Sites`
  class answers from fixtures and records writes in a local D1; tests assert
  pages, heads, redirects, `/media`, Cache-Control, no RSC error rows
  (`tests/flight.ts`), and that the smoke Worker sees the production host
  (`wrangler dev` rewrites the host for `custom_domain` routes).
- E: the engine's existing `@cloudflare/vitest-pool-workers` projects
  (`npm test` runs `workers` + `architecture`); the kit's `kit.test.ts`.

## 6. Infrastructure, parked (architect) — `~/cloudflare-infra/*.tf.pending`

Never applied here; the Vault token is expired and the checkout is shared.
Each file says what it replaces and how to approve it.

| File | What it does | Order |
|---|---|---|
| `dns.tf.pending` | `dns.tf` without `jrcodex_root` (A 76.76.21.21) and `www` (CNAME cname.vercel-dns.com): Terraform destroys both, then the Worker's deploy creates its custom domains. Needed under D1 (a) and (b) alike; not under (c). | after D1 and D5, before the first production deploy |
| `redirects-jrcodex.tf.pending` | adds `jrcodex` to `local.www_redirects` (D5 apex). Only with the apex choice. | with the above |
| `jrcodex-mail.tf.pending` | `cloudflare_email_routing_dns.jrcodex`, rule `hello@jrcodex.dev` → forward to the verified Gmail address (dual delivery, step 1), SES: associate `aws_sesv2_email_identity.jrcodex` with tenant `proprietor`, add `hello@jrcodex.dev` to `ses-send-mail`'s FromAddress list. A second file, `jrcodex-mail-to-worker.tf.pending`, flips the rule to `worker proprietor-mail` (step 2). | D4(a); after the Directory row |
| `jrcodex-turnstile.tf.pending` | the widget, by import, once a Turnstile-capable token exists | D11 |

## 7. The business `jrcodex` on the engine (owner, `seo-admin`)

Trade (vertical) proposal — `t` in `seo-admin`:

- trade `software-engineering-portfolio`, persona: a full-stack engineer
  writing in the first person about systems he built; voice: plain, specific,
  no hype; safety: no claims about employers or clients beyond what the
  profile says.
- taxonomy (the `service` of a project and the `category` of a post):
  `cloud-architecture`, `web-platforms`, `ecommerce-systems`,
  `ai-and-automation`, `delivery-and-devops`, `security-engineering`.
- mapping the nine projects: WeatherWise → cloud-architecture; WeFix4U →
  web-platforms; Three Chicks & A Wick → ecommerce-systems; The Gilded
  Shear → web-platforms; NASA Mission Control → web-platforms; TC&AW admin
  → ecommerce-systems; The Commons → ai-and-automation; Audify →
  ai-and-automation; Project Eta → drop (placeholder text).

Business: name "Juan Ramirez", short name `jrcodex`, locale `en`, team
`solo`, owner tobiasramzy@gmail.com, status active (no runs until he asks:
pause after creation if the blog should wait).

## 8. Owner runbook (in order; nothing here runs from a builder)

```sh
# 0. Secrets reach a process only through Vault and stdin. Never argv, never a file.
vault login                                   # the node's token is expired

# 1. The business and the site key
npm run admin --prefix ~/seo-engine           # t: trade (§7) · a: business jrcodex · w: connect https://jrcodex.dev (D5)
#    the key is shown once:
vault kv put secret/seo-engine/sites/jrcodex key=-   # paste, then ^D   (never on the command line)

# 2. Decide D1. Merge order: PR #2 -> PR #1 -> this PR's additive half; then the cutover PR (B or B'); the engine PR (028, minus
#    its "028 projects" commits under (b)) -> deploy the engine (./deploy). Steps 3-5 and 8 apply to (a) and (b); step 5's import only to (a).

# 3. Terraform (shared checkout; announce first; never leave an unapproved .tf on disk)
cd ~/cloudflare-infra && git pull
mv dns.tf.pending dns.tf && mv redirects-jrcodex.tf.pending redirects-jrcodex.tf
./tf plan                                     # expect: 2 destroyed (jrcodex_root, www), 1 ruleset created
./tf apply && git add -A && git commit -m "jrcodex.dev: leave Vercel; www -> apex" && git push

# 4. Workers Builds (dashboard): connect Tobiscuit/portfolio, two triggers (docs/delivery-pipeline.md)
#    secrets, from Vault through stdin:
vault kv get -field=key secret/seo-engine/sites/jrcodex | npx wrangler secret put SEO_SITE_KEY --name jrcodex-dev
#    first production deploy creates both custom domains; verify:
dig +short jrcodex.dev @1.1.1.1 ; dig +short www.jrcodex.dev @1.1.1.1 ; curl -sI https://www.jrcodex.dev | head -3   # 301 to apex
#    open a preview URL in a private window: the Access gate must challenge (D9)

# 5. Content
#    on a machine with the Vercel CLI (not the node):  vercel env pull .env.local   -> DATABASE_URI
node scripts/export-portfolio.mjs --source mongo --out export/portfolio.json      # or --source code; diff the two
node ~/seo-engine/scripts/import-gallery.ts --business jrcodex --file export/photos.json --apply   # fetches from https://jrcodex.dev
#    wait for the engine's "gallery-imported" line, then
npx -y tsx ~/seo-engine/scripts/import-portfolio.ts --business jrcodex --file export/portfolio.json          # dry run: prints SQL + the slug map
npx -y tsx ~/seo-engine/scripts/import-portfolio.ts --business jrcodex --file export/portfolio.json --apply  # ./deploy d1 execute --remote
#    paste the slug map into app/lib/legacy-redirects.ts (D13), PR, deploy

# 6. Mail (D4a)
cd ~/proprietor-mail && node scripts/provision-mailbox.ts --add-address ...   # the address printer (plan §12); review the SQL, apply with the workers token
cd ~/cloudflare-infra && mv jrcodex-mail.tf.pending jrcodex-mail.tf && ./tf plan && ./tf apply   # routing on, forward to Gmail
#    send one message to hello@jrcodex.dev; it arrives in Gmail; then
mv jrcodex-mail-to-worker.tf.pending jrcodex-mail.tf && ./tf plan && ./tf apply   # the rule flips to the Worker (store-and-forward)
#    two weeks later, on his word: delivery -> store (mail-admin)

# 7. Turnstile (D11): create the widget in the dashboard for jrcodex.dev; TURNSTILE_SITE_KEY into wrangler.jsonc vars,
#    the secret: printf '%s' "$SECRET" | npx wrangler secret put TURNSTILE_SECRET_KEY --name jrcodex-dev   (from Vault, not typed)

# 8. After a quiet week: delete the Vercel project; remove the SES variables; close the S3 bucket and the Atlas cluster.
```
