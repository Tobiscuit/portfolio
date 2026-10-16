# 002 — Plan

Architecture, the contracts between slices, the infrastructure parked for
approval, the engine door (D14), and the owner's runbook, for the decided
hybrid (spec §3 D1): Payload keeps projects and media, the site stays on
Next.js and Vercel, Proprietor supplies blog, inquiries, profile, mail and
video through `@jrcodex/seo-kit` over `http()`. The slices and their
acceptance tests are in `tasks.md`.

## 1. Shape of the work

```
  this repo (feat/proprietor-adoption, PR against feat/platform-intake)
    app/(app)/blog/page.tsx, blog/[slug]/page.tsx     A2  posts, compose(), the engine's head
    app/(app)/videos/page.tsx                         A4  shown cuts, empty -> invisible
    app/media/[...key]/route.ts                       A   the engine's images and video, via mediaHandler
    app/components/platform/*, Footer.tsx             A   plain semantic markup, existing tokens
    app/components/Header.tsx  (navLinks only)        A   Blog; Videos when there are any
    app/(app)/layout.tsx       (mount <Footer/>)      A
    app/lib/platform/{env,client,reads,images,videos}.ts   A   the only reader of process.env is env.ts
    app/lib/site.ts            SITE_URL, links, fallback profile   A
    app/lib/intake/manifest.ts { intake, blog } + renders           A
    app/sitemap.ts, app/robots.ts                     A
    test/**                                           A   Node, the stub over http()
    package.json               + @jrcodex/seo-kit 0.6.2 exact      A   (nothing else: existing versions are the upgrade lane's)

  ~/seo-engine (028-portfolio-site, PR against main)
    migration 0034, src/video/store.ts, src/render/sites.ts, src/sites-entrypoint.ts,
    dashboard videos toggle, packages/seo-kit 0.7.0     E   videos on the site, Range on media

  ~/cloudflare-infra (parked, *.tf.pending)
    jrcodex-mail.tf.pending, jrcodex-mail-to-worker.tf.pending, jrcodex-turnstile.tf.pending

  NOT in this work: Payload, collections/, app/(app)/projects/**, any version bump,
  the contact page and route (spec 001, as built), the engine door (D14, §9).
```

## 2. Contracts

### 2.1 The site's reads (A), honoured by the stub (A) and the engine (E)

From montano's `lib/blog.ts` and `lib/projects.ts`, adjusted for Vercel:

- **Transport.** `transportFor(env)` from `app/lib/intake/engine.ts`
  decides, as for the contact form: a `SEO` binding → `rpc()`;
  `SEO_ENGINE_URL` → `http()` with the 10 s timeout; neither → unconnected.
  On Vercel it is always `http()` or unconnected.
- **Unconnected** (no transport, or no key): list reads answer empty, the
  profile answers the site's fallback, logged once per isolate.
- **Connected, a read fails**: `/blog` and `/blog/<slug>` let it through (a
  5xx is retried by crawlers; a 404 would say a real post is gone); the
  footer, the nav and the sitemap catch it and show none.
- **A single read answering null** is `notFound()`.
- **Reads from any host; writes only from `ENGINE_WRITE_HOST`** (announce
  and inquire are spec 001's; this work adds no write).
- **Images, on every host: `/media/<key>`.** www.jrcodex.dev resolves to
  Vercel unproxied (`dns.tf` record `www`, `proxied = false`), so
  Cloudflare's `/cdn-cgi/image/<options>/media/<key>` transform path exists
  on none of this site's hosts. `images.ts` rewrites every transform URL in
  post html, hero `src` and `srcset` to `/media/<key>` (montano's
  `withoutTransforms`), and `app/media/[...key]/route.ts` serves it through
  the kit's `mediaHandler` and `http()` client. Engine keys always contain a
  slash (`<business slug>/…`); Payload's mirrored files in `public/media/`
  are flat names, and Next serves `public/` before a dynamic route.
- **Every page**: one `<h1>`; a post's canonical, alternates and JSON-LD as
  `postMetadata`/`postJsonLd` give them; `robots: { index: false }` on an
  empty index.

### 2.2 Videos (E provides, A consumes)

```ts
/** One cut the owner chose to show (engine spec 028). */
export interface VideoSummary {
  id: string;
  /** The owner's title, one language. */
  title: string;
  /** Root-relative: /media/<slug>/video/renders/<id>.mp4 — served by the site's /media route. */
  src: string;
  contentType: "video/mp4";
  seconds: number;
  format: "landscape" | "portrait";   // 1920x1080 or 1080x1920 (src/video/profiles.ts FORMATS)
  /** ISO 8601: when the owner showed it on the site. Newest first in the list. */
  publishedAt: string;
}
// Sites:      videos(siteKey: string): Promise<VideoSummary[]>
//             media(siteKey, key, opts?: { range?: string }): a render key answers only while shown;
//             Range -> 206 with Content-Range and Accept-Ranges: bytes; HEAD answers the headers.
// Kit 0.7.0:  client.videos(): Promise<VideoSummary[]>   rpc(): binding.videos(key); http(): GET /v1/videos
//             client.media(key, { range })                http(): the range header on GET /v1/media/<key>
//             mediaHandler forwards the request's range header.
```

The site's shim (`app/lib/platform/videos.ts`) reads, in order: the kit
client's `videos()` when it has one (0.7.0, either transport); the `SEO`
binding's `videos(siteKey)` when present; else `[]`. It validates each item
before rendering. Moving the site to kit 0.7.0 is a one-line bump that
leaves the shim's first branch as the only live one.

**Bandwidth, stated.** On Vercel, every image and video byte the site
serves passes through a Vercel function (`/media/*`), which counts toward
Vercel's bandwidth and function duration (D7). At a portfolio's scale this
is small; the clean fix is the move in D1's "later", where `/media/*` is
served by the site's own Worker over the binding.

## 3. The engine door (D14) — what `SEO_ENGINE_URL` needs

The engine has had no public address since 2026-10-05, and `/v1` has never
had a server (`~/seo-engine/docs/spec-audit-2026-09-27.md` item 5). Until
something answers the kit's HTTP contract, a site on Vercel reaches nothing:
the contact form keeps its SES path (spec 001's rollback state) and the new
pages render empty. §9 is the design for Tobias to approve.

## 4. Tests, with no secrets anywhere

- A: vitest in Node against `test/stub-engine.ts`, extended with the read
  routes (`GET /v1/posts?locale=`, `/v1/posts/:locale/:slug`, `/v1/sitemap`,
  `/v1/profile`, `/v1/media/<key>`, `/v1/videos`) and fixtures shaped like
  montano's `tests/stubs/seo-engine/fixtures.ts`, the business being a
  fictional one; pages rendered by awaiting the server component and
  `renderToStaticMarkup`. `test/harness.test.ts` keeps the stub pinned to the
  kit's real `http()` client, so the stub is the door's executable spec.
- E: the engine's `npm test` (the `workers` project under
  `@cloudflare/vitest-pool-workers` with the real migrations, and the
  `architecture` project in Node) and the kit's tests.

## 5. Delivery

Unchanged: Vercel builds this repo; Vercel's PR previews serve review
copies; `ENGINE_WRITE_HOST=www.jrcodex.dev` keeps a preview from announcing
or inquiring. The engine half deploys with the engine's own `./deploy` after
its PR merges; kit 0.7.0 is staged by the engine's publish workflow on the
tag `seo-kit-v0.7.0` and made public by Tobias (`npm stage approve`, 2FA).

## 6. Infrastructure, parked (architect) — `~/cloudflare-infra/*.tf.pending`

Never applied here (the Vault token is expired; the checkout is shared).
Each file says what it does and how to approve it. All three validated
2026-10-16 with `terraform validate` on a scratch copy of the checkout (local
backend, `init -backend=false`), never with `./tf`.

| File | What it does | When |
|---|---|---|
| `jrcodex-mail.tf.pending` | `cloudflare_email_routing_dns.jrcodex` (MX + apex SPF), a DMARC record (the zone had none), rule `hello@jrcodex.dev` → forward to the verified Gmail address (dual delivery, step 1), SES: the `jrcodex.dev` identity joins tenant `proprietor`, a second inline policy on `ses-send-mail` allowing `hello@jrcodex.dev` through `send-proprietor-mail` (inside `iam/ses-send-boundary.json`). | D4(a), after the Directory address row |
| `jrcodex-mail-to-worker.tf.pending` | REPLACES `jrcodex-mail.tf`: the rule's action becomes `worker proprietor-mail` (an in-place update). | after step 1 delivers and the mailbox is store-and-forward |
| `jrcodex-turnstile.tf.pending` | the contact form's widget, created in the dashboard, adopted by import once a Turnstile-capable token exists | D11 |

The DNS, redirect and Payload-admin Access files written for the cutover
were deleted when D1 was decided: the hybrid changes no DNS.

## 7. The business `jrcodex` on the engine (owner, `seo-admin`)

Trade (vertical) proposal — `t` in `seo-admin`:

- trade `software-engineering`, persona: a full-stack engineer writing in
  the first person about systems he built; voice: plain, specific, no hype;
  safety: no claims about employers or clients beyond what the profile says.
- taxonomy (each post's `category`): `cloud-architecture`, `web-platforms`,
  `ecommerce-systems`, `ai-and-automation`, `delivery-and-devops`,
  `security-engineering`.

Business: name "Juan Ramirez", short name `jrcodex`, locale `en`, team
`solo`, owner tobiasramzy@gmail.com; pause it after creation if the blog
should not start writing yet.

## 8. Owner runbook (in order; nothing here runs from a builder)

```sh
# 0. Secrets reach a process only through Vault and stdin or the dashboard. Never argv, never a kept file.
vault login                                   # the node's token is expired

# 1. The business and the site key (D3, D10)
npm run admin --prefix ~/seo-engine           # t: trade (§7) · a: business jrcodex · w: connect https://www.jrcodex.dev
vault kv put secret/seo-engine/sites/jrcodex key=-   # paste the key shown once, then ^D (never on the command line)

# 2. Merge, in order: PR #2 -> the upgrade PR -> PR #1 -> this PR -> the redesign.
#    Engine: PR 028 -> ./deploy (engine, then dashboard); kit: git tag seo-kit-v0.7.0 && git push origin seo-kit-v0.7.0,
#    then: npm stage approve @jrcodex/seo-kit@0.7.0   (2FA)

# 3. D14: approve and build the door (§9; its own spec and PR); deploy it; note its URL.

# 4. Vercel, Production environment only (dashboard; there is no Vercel CLI on the node):
#    SEO_ENGINE_URL=<the door>  SEO_SITE_KEY=<from Vault>  ENGINE_WRITE_HOST=www.jrcodex.dev
#    CONTACT_FALLBACK_EMAIL=jramirez203@outlook.com (hello@jrcodex.dev after step 6)
#    NEXT_PUBLIC_TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY (step 7)
#    Redeploy. Send one message through the live form, as yourself; it shows first on the dashboard.

# 5. Videos: turn the tool on for business jrcodex (as for t-proprietor:
#    businesses.tools = '["video"]', or '["video","email"]' under D4b), upload, cut, "Show on site".

# 6. Mail (D4a)
cd ~/proprietor-mail   # the address printer (plan §12) prints the Directory row for hello@jrcodex.dev
                       # on mbx_343m0trnz4ccka4vvq5mfpwhc7; review the SQL, apply it with the workers token
cd ~/cloudflare-infra && git pull && mv jrcodex-mail.tf.pending jrcodex-mail.tf && ./tf plan
./tf apply && git add jrcodex-mail.tf && git commit -m "hello@jrcodex.dev: routing on, forward to Gmail" && git push
#    send one message to hello@jrcodex.dev; it arrives in Gmail. Set the mailbox to store-and-forward (mail-admin), then:
git rm --cached jrcodex-mail.tf; mv jrcodex-mail-to-worker.tf.pending jrcodex-mail.tf && ./tf plan   # 1 in-place update
./tf apply && git add jrcodex-mail.tf && git commit -m "hello@jrcodex.dev: to the proprietor-mail Worker" && git push
#    two weeks later, on your word: delivery -> store (mail-admin)

# 7. Turnstile (D11): create the widget in the Cloudflare dashboard for jrcodex.dev (managed);
#    its site key and secret into Vercel's Production environment; keep jrcodex-turnstile.tf.pending
#    until a Turnstile-capable token exists, then fill its import id and approve it.

# 8. After a quiet week: the SES path and its variables leave Vercel (spec 001 §4 step 5).
```

## 9. The door (D14) — design for approval, not built

A Worker, `seo-engine-sites-http` (name to confirm), in the engine repo,
reached at `https://api.proprietor.systems/v1` (the 2026-09-27 audit's
choice: the platform's own domain, not a client's), with:

- **one binding**, `services: [{ binding: "SEO", service: "seo-engine",
  entrypoint: "Sites" }]`: the engine itself stays private; the door holds
  no data, no D1, no R2, no secret of its own;
- **exactly the kit's `http()` contract** and nothing more: `GET
  /v1/posts?locale=`, `/v1/posts/:locale/:slug`, `/v1/sitemap`,
  `/v1/profile`, `/v1/gallery`, `/v1/projects?locale=`,
  `/v1/projects/:locale/:slug`, `/v1/videos`, `/v1/media/<key>` (Range
  passed through), `POST /v1/manifest`, `POST /v1/inquiries`. No recipes,
  no chat, no FAQ: the kit refuses those over `http()` by design;
- **identity** from `authorization: Bearer sk_…`, passed to the `Sites`
  method that already resolves it; `SiteKeyError` → 401, `ManifestError` →
  400 with the message, `InquiryRefused` → 400, or 429 with `Retry-After`;
  any other error → 502 with no detail; `null` → 404;
- **abuse limits** before the binding: a Workers rate-limit binding keyed on
  the key's hash (reads generous, writes as the engine's 60 inquiries an
  hour), a 64 KB body cap on writes, no CORS headers (server-to-server only:
  a browser never holds a site key);
- **custom domain** in its own wrangler `routes` (`custom_domain: true`), not
  Terraform; `workers_dev: false`, `preview_urls: false`; Workers Logs on
  with no request bodies logged (inquiries are personal data);
- **tests**: the site's `test/stub-engine.ts` contract, run against the door
  over a miniflare service binding to a fixture `Sites`; the kit's
  `kit.test.ts` `http()` cases pointed at it;
- **cost**: Workers Paid includes the requests; $0 extra. **Risk**: a new
  public surface for every business with a site key; the security-posture
  document gets a line, and Tobias's explicit go comes before the first
  deploy.

About a day. Its own spec (engine 029) and PR when he says go.
