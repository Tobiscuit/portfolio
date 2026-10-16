# 002 — Domain model

A DDD pass over "jrcodex.dev becomes a tenant of Proprietor", for the
decided hybrid (spec §3 D1): the bounded contexts, what each one owns, the
invariants a builder must keep, the map between them, and the gaps found on
the way. Terms are the platform's (`business`, not "tenant", since the
2026-09-28 rename; the engine's code still says `tenant_id` and `t-<slug>`).

## 1. Bounded contexts

### Site (this repo)

The pages a visitor sees, in the site's design, and the one place that
knows how to reach the platform. It owns its home, about and contact copy,
the resume, the LinkedIn and GitHub links, and the static illustrations.
It reads posts, videos and the profile.

Aggregates:

- **PlatformConnection** — `{ transport, siteKey, writeHost }`, from the
  environment once per request (`app/lib/platform/env.ts` is the only reader
  of `process.env`). Invariants: a missing or malformed key means *not
  connected*, never a thrown render; writes (announce, inquire) only from
  `ENGINE_WRITE_HOST`; reads from any host, Vercel previews included.
- **Manifest** — what the site declares. Invariant (spec 005): declare only
  what the site renders in the same release. This work moves it from
  `{ intake }` to `{ intake, blog, videos }` with `renders`; never `projects`
  (Payload's), `gallery`, `chat`, `catalog`; `email` only under D4(b);
  `videos` because it renders `/videos` (engine 028 added the module after
  review: "Show on my website" is offered only to a site that declares it).
  The operator's video *tool* is a separate switch on the business.
- **MediaPath** — every engine image or video the site shows is
  `/media/<key>` on the site's own origin, served by its route through the
  kit. Invariant: no `/cdn-cgi/image/` URL is ever rendered (the site's
  hosts are not proxied by Cloudflare).

### Content (Payload, this repo, the upgrade lane's)

Projects and media for one editor, unchanged by this work. Not a platform
context: the platform never reads it, and the site's manifest never
declares `projects`.

### Engine / Business (`~/seo-engine`; spec 028 for the delta)

The business `jrcodex`: profile, taxonomy, posts, cuts, inquiries, the site
row, memberships. Identity on every call is the site key.

- **Cut** (025) — a rendered clip or video. New in 028:
  `shown_on_site_at`, settable only on a `ready` cut of a business whose
  site declares `videos`; served with a five-minute lifetime; `Sites.videos()` lists
  exactly the shown, not removed cuts; `Sites.media()` serves a render key
  only while it is shown, with Range. Invariant: hiding a cut takes its URL
  down with it, as a removed gallery photo's does.
- **Site** — a `sites` row: key hash, origin, business. One origin per
  site, decided at minting (`https://www.jrcodex.dev`, D5).

### Door (D14, designed, not built)

A stateless HTTPS adapter from the kit's `/v1` contract to `Sites`.
Invariants: holds no data and no secret; never answers a browser (no CORS);
every request carries a site key the engine resolves; a refusal keeps its
meaning across the HTTP boundary (401, 400, 429 with `Retry-After`).

### Mail (`~/proprietor-mail` + cloudflare-infra)

Under D4(a), `hello@jrcodex.dev` joins `mbx_343m0trnz4ccka4vvq5mfpwhc7`:
the Directory refuses an address that belongs to another mailbox, and an
address is never removed. While delivery is `store-and-forward` the Worker
forwards before it stores (plan §8), so Gmail misses nothing during the
trial. Nothing in the public repo changes.

### Video (engine, 025–027)

Recording, Moment, Cut, the renderer. Unchanged except the publication
state above. Nothing in the core knows what the footage is of.

## 2. Context map

```
  Site ──(conformist to the kit's types; http() in production)──▶ Door ──(binding)──▶ Engine/Business
   │        reads: posts, profile, media, videos(028)                   (D14: not built;
   │        writes: announce(manifest), inquire(submission)              until then: unconnected)
   │
   ├──(same repo, separate ways)── Content (Payload: projects, media)
   │
   └──(no code relationship; Terraform + a Directory row)──▶ Mail ──▶ Inbox on the Proprietor business

  Video ──(inside the engine; 028 adds the publication edge)──▶ Sites.videos(), Sites.media(range)
```

- Site → Engine is **conformist**: the site adapts to the kit's shapes and
  never asks the engine to know one client from another.
- Site ↔ Content are **separate ways** inside one repo: the platform pages
  never read Payload, and Payload's pages never read the platform. The
  sitemap is the one place that lists both.
- Mail is **separate ways** from the site's code.

## 3. Gaps found, and what this work does about each

| # | Gap | Where it bites | Resolution |
|---|---|---|---|
| G1 | **Who owns project write-ups.** Payload's structured case studies did not fit the engine's Project. | Projects | Decided (D1): Payload keeps them. The engine changes that would have made them fit are cancelled. |
| G2 | **Video has no site edge.** 025 is deployed; nothing faces a site; no publication state on a cut. | `/videos` | 028: `shown_on_site_at`, `Sites.videos()`, Range on `media()`, a dashboard toggle, kit 0.7.0 on both transports; the site's shim until 0.7.0 is published. |
| G3 | **Mail: jrcodex.dev receives no mail, and the partition said it never would** (`mail.tf`, 2026-09-06). The Mail Worker's SES policy names only proprietor.systems addresses. | `hello@jrcodex.dev` | D4 supersedes the partition; parked Terraform adds routing, DMARC, the tenant association and a policy; the Directory gets the address row. |
| G4 | **The engine has no public address, and `/v1` never had a server.** Spec 001 planned `http()` from Vercel; with the hybrid, that is the production path. | Everything live | D14: the door (plan §9). Until then the pages render empty and the contact form keeps SES. |
| G5 | **The manifest's `has` lifecycle.** A module declared before its pages exist makes the dashboard link to 404s; one declared late hides the owner's tools. | Manifest, dashboard nav | `{ intake, blog, videos }` lands with the pages; `email` per D4; the video tool is the operator's switch, the `videos` module the site's. A test asserts the manifest literally. |
| G6 | **Image transforms do not exist on the site's hosts** (Vercel, unproxied). The engine's post html names `/cdn-cgi/image/...`. | Every post image | MediaPath: rewrite to `/media/<key>` everywhere, served by the site's route. |
| G7 | **Every media byte passes through a Vercel function.** | Bandwidth, D7 | Stated (plan §2.2); small at this scale; gone if the site ever moves. |
| G8 | **Profile has no LinkedIn or GitHub field.** | Footer | The site's own constants; a profile addition is a later engine nicety, not built here. |
| G9 | **A trade and taxonomy for a software engineer do not exist** on the engine. | Minting, post categories | `plan.md` §7 proposes one; the owner confirms in `seo-admin`. |
| G10 | **Kit 0.7.0 publication is Tobias's** (`npm stage approve`, 2FA). | Videos | The site pins 0.6.2 and ships the shim. |
