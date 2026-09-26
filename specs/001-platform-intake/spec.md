# 001 — Client inquiries go to the platform, and the hosting question

Status: written 2026-09-26. The code for this spec is built on branch
`feat/platform-intake`; nothing is deployed and no Vercel setting is changed.
Companion: the platform side is `Tobiscuit/platform-mail`
`specs/001-inbox-module/` (Track A) and, in the SEO-engine repo, spec 005
(manifest and Inquiries).

## 1. What changes

**Today.** The contact form (`app/(app)/contact/page.tsx`) posts JSON
`{ name, email, message, _gotcha }` to `app/api/contact/route.ts`, which uses
the vendored `app/lib/ses/*` to send two emails through SES: a notification to
`SES_RECIPIENT_EMAIL` with Reply-To set to the visitor, then a "Thanks - I got
your message" acknowledgement to the visitor. A non-empty `_gotcha` (the
honeypot) is discarded with a success answer.

**After.** The same route hands the inquiry to the platform, exactly as
montano-btm's quote form does (`~/montano-btm` `lib/inquiry.ts` on develop):

```
form ──POST /api/contact──▶ route handler (Vercel today)
                             1. honeypot filled?          → 200, discarded
                             2. validate name/email/message → 400 with the field's message
                             3. Turnstile, when configured  → 400 / 503
                             4. host is ENGINE_WRITE_HOST?   → otherwise 503 "preview"
                             5. announceOnce(manifest)       ┐ @jrcodex/seo-kit
                             6. inquire({ locale, page, fields })┘ over http() today
                                                          → 200 {ok:true}
                                    │
                                    ▼
                SEO engine: Inquiries for tenant "jrcodex" (spec 005)
                → shown first on the dashboard, and emailed to every member
                  of the tenant by the engine's own notification path
```

The inquiry lands in the one dashboard, next to every other business's, and
the engine's notification replaces the site's own SES notification.

### Keeps working if the site leaves Vercel

The route never names a host platform. One function picks the transport:

| What the environment has | Transport | When |
|---|---|---|
| a `SEO` service binding | `rpc(env.SEO, key)` | the site runs as a Worker in the same Cloudflare account |
| `SEO_ENGINE_URL` and `SEO_SITE_KEY` | `http(SEO_ENGINE_URL, key)` | Vercel, or anywhere else |
| neither | the existing SES path, unchanged | until the cutover |

So the PR is safe to merge before the platform side is ready (nothing
changes until the variables exist), the cutover is a configuration change in
Vercel with no code deploy, rollback is removing the variables, and a move to
Workers later is a binding instead of two variables. The handler itself takes a
`Request` and returns a `Response`, like the current `contactRoute`, so a
framework change touches only the file that mounts it.

### The manifest

Declared in code, next to the client (`app/lib/intake/manifest.ts`):

```ts
{ version: 1, kind: "service", has: { intake: true }, locales: ["en"],
  intake: { fields: ["name", "email", "message"] } }
```

Nothing more is declared, because the site has nothing more: no blog, no
gallery. `has.email` is added in a one-line follow-up when the jrcodex mailbox
(Track A) is active, never before.

### What the visitor sees

The response shape the page already reads is unchanged: `200 { ok: true }`,
or an error status with `{ ok: false, error }`. The words, in the site's own
voice:

| Outcome | Status | Message |
|---|---|---|
| sent | 200 | (the page's existing success state) |
| a field is wrong | 400 | the field's own message (the current validation messages) |
| rate limited by the engine | 429 + `Retry-After` | "Too many messages just now — please try again in a minute." |
| the engine refused the fields | 400 | the engine's reason, which the kit documents as plain enough to show |
| a preview deployment | 503 | "This is a preview of the site, so messages aren't sent from here." |
| not configured, the engine unreachable, or the site key refused | 503 | "The message could not be sent. Please email <fallback> directly." |

The fallback address comes from `CONTACT_FALLBACK_EMAIL` (see B-D4).

## 2. The contract it honours

- `@jrcodex/seo-kit` **0.3.1**, pinned exactly: `http(baseUrl, key, fetch)`,
  `announceOnce`, `inquire`, `SiteKeyError`, `InquiryRefused`,
  `ManifestError`. Over HTTP the kit calls `POST /v1/manifest` and
  `POST /v1/inquiries` with `authorization: Bearer sk_…`; 401/403 raise
  `SiteKeyError`; 400 raises `InquiryRefused` (or `ManifestError`); 429 raises
  `InquiryRefused` with `retryAfterSeconds` from `Retry-After`.
- **The engine's HTTPS server does not exist yet.** The kit's client does; the
  SEO-engine session is building the server (on a superblock.dev host that
  needs Tobias's Terraform approval) and will create the `jrcodex` tenant and
  site key after that. This work is therefore tested against a local stub
  server that implements the kit's contract, and its live wiring waits.
- Every engine call has a 10-second timeout, through the kit's injectable
  `fetch`.
- Engine writes happen only for requests whose host equals
  `ENGINE_WRITE_HOST` (the live site answers on `www.jrcodex.dev`; the apex
  redirects there). Vercel previews have other hosts, so a preview can never
  create a real inquiry — montano-btm's rule.

## 3. Decisions for Tobias (this track)

| # | Decision | Recommendation |
|---|---|---|
| **B-D1** | **The acknowledgement email to the visitor.** Inquiries has no acknowledgement; the current route sends one. | **Drop it.** A form that makes jrcodex.dev send mail to any address someone types is a known abuse channel (people type a victim's address), and it is the only reason the site needs an SES credential at all. The page already confirms on screen; the success text can promise the reply time the email used to ("I'll reply personally, usually within a couple of days"). If he wants it kept, it stays in the site behind the same honeypot and bot check. |
| **B-D2** | **A real bot check.** Today there is only the honeypot; the engine allows 60 inquiries an hour per site, and anything under that reaches his inbox. | **Turnstile before go-live**, like montano-btm. The code supports it now and turns it on when both keys are set; one key without the other fails closed. The widget needs creating (the Terraform token lacks Turnstile Edit as of 2026-09-26, so either that grant or the dashboard, as Montano's was). |
| **B-D3** | **Hosting** — see §5. | **Do not move yet; first decide which site is jrcodex.dev's future** (this Next.js/Payload site, or the Hono + HTMX `juanramirez-portfolio` Worker, whose source is only on his Windows machine). If this site stays, move it to Workers with OpenNext + D1 + R2 — and do not wait long if the Vercel project is on the Hobby plan (§5). |
| **B-D4** | **Where "please email me directly" points.** The page shows `jramirez203@outlook.com`; the route's current fallback is `SES_RECIPIENT_EMAIL`, whose value is only in Vercel. | `CONTACT_FALLBACK_EMAIL = jramirez203@outlook.com` now (what the page already shows); `hello@jrcodex.dev` once Track A's mailbox is active. |

## 4. Going live (not done in this work)

1. The SEO-engine session ships its HTTPS server and creates tenant `jrcodex`
   and the site key (Vault `secret/seo-engine/sites/jrcodex`, field `key`).
2. B-D1, B-D2 and B-D4 decided; Turnstile widget created if B-D2 is yes.
3. Tobias sets, in Vercel's **Production** environment only: `SEO_ENGINE_URL`,
   `SEO_SITE_KEY`, `ENGINE_WRITE_HOST=www.jrcodex.dev`,
   `CONTACT_FALLBACK_EMAIL`, and the Turnstile pair. (There is no Vercel CLI on
   the node; this is a dashboard step.)
4. Redeploy. Tobias sends one message through the live form, as himself, and
   sees it first on the dashboard and in the engine's notification.
5. After a quiet week: a follow-up PR removes the legacy SES path and
   `app/lib/ses/*` (if B-D1 dropped the acknowledgement), and the SES variables
   are removed from Vercel.

Rollback before step 5: remove `SEO_ENGINE_URL` in Vercel and redeploy; the
SES path answers again.

## 5. Migration assessment: Vercel → Cloudflare Workers

**Facts, checked 2026-09-26:**

- jrcodex.dev's DNS is already on Cloudflare (`charles`/`priscilla`
  nameservers); the apex A record and `www` CNAME point at Vercel. The
  Cloudflare account is on Workers Paid.
- Vercel's fair-use guidelines restrict the **Hobby** plan to non-commercial
  personal use and give, as an example of commercial use, "a static website
  promoting the services you provide". jrcodex.dev promotes services. Which
  plan the project is on is not visible from here (no Vercel CLI on the node) —
  Tobias can check in seconds. On Hobby, the site is outside Vercel's terms
  today; on Pro it costs $20 a month that Workers Paid already covers.
- Payload's own Cloudflare template (`templates/with-cloudflare-d1`) runs
  Payload 3 on Workers through **OpenNext** (`@opennextjs/cloudflare`), with
  `@payloadcms/db-d1-sqlite` and `@payloadcms/storage-r2`, and says it needs
  the paid Workers plan because of bundle size.
- vinext's own guidance: libraries that use only `next/*` public APIs
  generally work; libraries that depend on Next.js build plugins or internals
  need shims. Payload's admin is mounted through a Next.js config plugin
  (`withPayload`) and `@payloadcms/next`. No evidence was found of Payload
  running on vinext.
- This site uses MongoDB Atlas (`@payloadcms/db-mongodb`), S3 in us-east-2 for
  media (`@payloadcms/storage-s3`), and `sharp`. `sharp` is a native module and
  cannot run on Workers; Payload's Cloudflare template does not configure it.

**Options:**

| Option | Effort | Risk | Notes |
|---|---|---|---|
| **Stay on Vercel** | none | the Hobby-plan question above | the intake works as built |
| **Workers via OpenNext, Payload on D1 + R2** (Payload's own template) | about 3–5 days | medium | swap the database adapter (Mongo → D1) and generate Payload's migrations; a one-off script moves the Users/Media/Projects documents from Mongo to D1 through Payload's Local API; copy media from S3 to R2 and switch to `storage-r2`; drop `sharp` (upload-time resizing goes; Cloudflare Image Transformations resize at request time instead, on the free tier's 5,000 unique transformations a month); Workers Builds; custom domain for `www` and the apex redirect. The intake needs no code change: a `SEO` binding makes the transport `rpc()`. Cost: a second Next-on-Workers toolchain beside vinext. |
| **Workers via vinext** | unknown; a half-day `vinext check` spike first | high | matches the client sites and the dashboard (one mental model, Tobias's stated reason for vinext); Payload's admin is exactly the kind of dependency vinext says needs shims |
| **Retire Payload** | about 2–3 days | low | the CMS holds three collections for one editor; projects could become content files or come from the platform, and the site then runs on vinext like the client sites. Loses the admin UI, which may matter as résumé material. |

**Recommendation.** Settle which portfolio is the future first (B-D3). If it
is this one: check the Vercel plan; if it is Hobby, move soon, via **OpenNext +
D1 + R2**, because it is the path Payload itself ships and supports; run the
half-day `vinext check` spike only if one toolchain matters more to Tobias
than a supported path. The intake built here does not change in any of these
moves.

## 6. Tasks (builder)

**Owns:** `app/api/contact/route.ts`, `app/lib/intake/**` (new),
`app/(app)/contact/page.tsx` (only for the Turnstile widget and the success
text), `package.json` / `package-lock.json` (the kit, the test runner),
`vitest.config.ts`, `test/**`, `.env.example`, this spec's task ticks.
**Does not touch:** `app/lib/ses/*` (the legacy path keeps working as is),
Payload, anything in Vercel.

- [ ] T1 test harness (vitest, Node environment) and a stub engine server
  implementing the kit's `/v1/manifest` and `/v1/inquiries` contract
- [ ] T2 `app/lib/intake/manifest.ts` and `app/lib/intake/engine.ts`
  (transport selection, 10 s timeout)
- [ ] T3 `app/lib/intake/handle.ts`: honeypot → validate → Turnstile (when
  configured) → host guard → announceOnce → inquire, returning the outcomes in
  §1, framework-free (`Request` → `Response`)
- [ ] T4 the route: platform path when configured, the unchanged SES path
  otherwise
- [ ] T5 the Turnstile widget on the page, rendered only when its site key is
  set
- [ ] T6 `.env.example` documents every variable; the spec's go-live list
  stays accurate

**Acceptance tests (written first):**

- through the kit's real `http()` against the stub server: a valid submission
  announces once per process, then inquires with exactly `name`, `email`,
  `message`, `locale: "en"` and `page: "/contact"`, and answers 200 `{ ok: true }`;
- the honeypot answers 200 and makes no engine call;
- each validation failure answers 400 with the current messages and makes no
  engine call;
- a stub 429 with `Retry-After: 30` answers 429 with `Retry-After: 30`;
- a stub 400 answers 400 with the engine's reason; a stub 403 (refused key)
  answers 503 with the fallback address and logs the misconfiguration without
  the key;
- a stub that never answers is cut off at the timeout and answers 503;
- a request whose host is not `ENGINE_WRITE_HOST` answers 503 "preview" and
  makes no engine call;
- Turnstile: both keys unset → not checked; both set and the token missing or
  rejected → 400; siteverify unreachable → 503; only one key set → 503 without
  calling the engine;
- with no platform variables set, the route still sends through the existing
  SES path (checked with a stubbed fetch, no real mail);
- `npx tsc --noEmit` passes; `npm run lint` passes if it runs in this repo.
