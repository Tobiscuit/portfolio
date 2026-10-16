# 002 — Domain model

A DDD pass over "jrcodex.dev becomes a tenant of Proprietor": the bounded
contexts, what each one owns, the invariants a builder must keep, the map
between them, and the gaps found on the way. Terms are the platform's
(`business`, not "tenant", since the 2026-09-28 rename; the engine's own code
still says `tenant_id` and `t-<slug>` ids).

## 1. Bounded contexts

### Site (this repo)

The pages a visitor sees, in the site's design, and the one place that knows
how to reach the platform. It owns no content once Payload goes: posts,
projects, photos, videos and the profile are read; only the home, about and
contact copy, the resume PDF, the LinkedIn/GitHub links and the static
illustrations are its own.

Aggregates:

- **PlatformConnection** — `{ transport, siteKey, writeHost }`. Built from
  the environment once per request (`app/lib/platform/env.ts`). Invariants:
  a missing or malformed key means *not connected*, never a thrown render;
  writes (announce, inquire) only from `ENGINE_WRITE_HOST`; reads from any
  host, previews included (they bind production, read-only).
- **Manifest** — what the site declares. Invariant (spec 005): declare only
  what the site renders in the same release. This work moves it from
  `{ intake }` to `{ intake, blog, projects }`; `email` only under D4(b);
  `gallery`, `chat`, `catalog` never (the site has no gallery page, chat or
  catalog). `video` is not declarable: it is a tool.
- **LegacyRedirects** — `/projects` and `/projects/<id>` to `/work/<slug>`.
  Invariant: a redirect is 301 to a URL that answers 200 after the import;
  an unknown id answers 404, never 500.

### Engine / Business (`~/seo-engine`, spec 028 for the delta)

The business `jrcodex`: profile, taxonomy, posts, projects, gallery, cuts,
inquiries, site rows, memberships. Identity on every call is the site key.

Aggregates touched here:

- **Project** — `projects` + `project_translations` + `project_images`.
  Invariants (015, kept): `service` is a taxonomy category; a photo belongs to
  at most one project; the write-up is sanitised; published implies
  `published_at`. New in 028: `link` is null or an `https://` URL of at most
  300 characters; `h2`/`h3` survive the sanitiser and the editor.
- **Cut** (025) — a rendered clip or video. New in 028: `shown_on_site_at`,
  settable only on a `ready` cut; `Sites.videos()` lists exactly the cuts
  with it set and not removed; `Sites.media()` serves a render key only while
  it is shown. Invariant: hiding a cut takes its URL down with it (as a
  removed gallery photo does).
- **Site** — `sites` row: key hash, origin, business. Invariant: one origin
  per site, decided at minting (D5).

### Mail (`~/proprietor-mail` + cloudflare-infra)

Mailboxes, addresses, delivery mode. The only aggregate this work touches is
**Mailbox addresses**: under D4(a), `hello@jrcodex.dev` joins
`mbx_343m0trnz4ccka4vvq5mfpwhc7`; the Directory refuses an address that
belongs to another mailbox, and an address is never removed. Under D4(b) a
new Mailbox for business `jrcodex` with its own key ring. Invariant either
way: the Worker forwards before it stores while delivery is
`store-and-forward` (plan §8), so Gmail misses nothing during the trial.

### Video (engine, 025–027)

Recording, Moment, Cut, the renderer. Unchanged except the publication state
above. Invariant kept: nothing in the core knows what the footage is of; a
business sees only its own cuts.

### Delivery (repo + Cloudflare account)

Branches, builds, versions, previews, custom domains. Aggregates:
**WorkerConfig** (`wrangler.jsonc`; invariant: the `routes` block never
disappears, or a deploy detaches the domains), **Trigger** (at most two per
Worker), **PreviewGate** (the account-wide Access app; invariant: it exists
before `preview_urls: true` is deployed — true today).

### Content migration (one-off, owner-run)

Not a lasting context, but it has an aggregate: **PortfolioExport**
(`plan.md` §2.3), the one JSON both halves agree on. Invariants: produced
from one named source (`mongo` or `code`); every image path it names is
reachable on the site's registered origin at import time; re-running the
import adds nothing (idempotent by `source` URL and by title-derived id).

## 2. Context map

```
  Site ──(customer/supplier; conformist to the kit's types)──▶ Engine/Business
   │        reads: posts, projects, profile, media, videos(028)
   │        writes: announce(manifest), inquire(submission)
   │
   ├──(published language: PortfolioExport JSON)──▶ Content migration ──▶ Engine
   │
   ├──(shared kernel: wrangler.jsonc, dist/server/wrangler.json)──▶ Delivery
   │
   └──(no code relationship; Terraform + Directory row only)──▶ Mail
                                                                  │
  Engine/Business ◀──(dashboard: Inbox gated per business)────────┘

  Video ──(inside Engine; 028 adds the publication edge)──▶ Sites.videos()
```

- Site → Engine is **conformist**: the site adapts to the kit's shapes and
  never asks the engine to know one client from another.
- Site → Delivery is a **shared kernel**: the same `wrangler.jsonc` is the
  Worker's config and the build's output; Workers Builds reads
  `dist/server/wrangler.json` (vinext rewrites `main` and assets; montano's
  pipeline doc proves the bare config fails).
- Mail is **separate ways** from the site's code: under D4 nothing in this
  repo knows the mailbox exists; the only touch is the manifest's `email`
  flag, and only under D4(b).

## 3. Gaps found, and what this work does about each

| # | Gap | Where it bites | Resolution |
|---|---|---|---|
| G1 | **Who owns project write-ups once Payload goes** (under D1(a); under (b) Payload keeps them and `/work`, `has.projects` and the engine's project changes are not built). Today: Mongo documents edited in Payload's admin, with sections, headings, inline images, code and a live URL. The engine's Project is a trade job: one body, photos as a list, title drafted from service and place. | Migration and every later edit | The owner, on the dashboard, in the engine's model. 028 adds `link` and headings so a case study keeps its shape; inline `<code>`/`<a>` flatten (D8). The site renders `bodyHtml` as it comes, photos as a gallery under the write-up, `link` as "Visit". |
| G2 | **Video has no site edge.** 025 is deployed; nothing faces a site; no publication state on a cut. | `/videos` | 028: `shown_on_site_at`, `Sites.videos()`, Range on `media()`, a dashboard toggle; kit 0.7.0. Until the kit ships, the site's shim reads the binding structurally and shows nothing over `http()`. |
| G3 | **Mail: jrcodex.dev receives no mail and the partition said it never would** (`mail.tf`, 2026-09-06). The Mail Worker's SES policy allows only the three proprietor.systems addresses. | `hello@jrcodex.dev` | D4 supersedes the partition; parked Terraform adds routing, tenant association and the policy line; the Directory gets the address row. No code in the public repo changes. |
| G4 | **The engine has no public address.** Spec 001 planned `http()` from Vercel "until the cutover"; that path can never go live. | The additive half | Pages render empty when unconfigured; tests use the stub over `http()`; production is the Worker. Stated in spec §1. |
| G5 | **The manifest's `has` lifecycle.** A module declared before its pages exist makes the dashboard link to 404s; one declared late hides the owner's tools. `email` depends on D4; `video` is not a module at all. | Manifest, dashboard nav | The manifest and its pages change in the same commit (A1); `email` is not declared; the spec says when it would be. The `has` object is asserted exactly by a test. |
| G6 | **Preview Access** — the brief expected a gate to create. | `preview_urls: true` | Already applied account-wide (`06161bc`); D9 is a confirmation, not a creation. |
| G7 | **Custom domains vs existing DNS.** The apex has an A record and www a CNAME, both to Vercel, both in Terraform. Cloudflare refuses a Custom Domain on a hostname with a CNAME; Terraform would recreate any record wrangler replaced. | Cutover | Remove both resources from `dns.tf` (parked as a replacement file), apply, then deploy. Minutes of 404 at most; rollback is `git checkout dns.tf`. |
| G8 | **`/media/*` collides.** The site serves `public/media/*` statically today; the Worker must answer `/media/<key>` from the engine. | Cutover | `public/media/` is deleted; the three hero images that live only there move under `public/images/projects/<slug>/` so the gallery import can fetch them from the site's origin. |
| G9 | **Profile has no LinkedIn/GitHub.** | Footer, contact | The site's own constants; a kit/profile addition is noted for the engine as a later nicety, not built here. |
| G10 | **Two content sources may disagree** (Mongo vs `project-data.ts`). | Export | The export reads either; the owner diffs. |
| G11 | **A trade and taxonomy for a software portfolio do not exist** on the engine; `service` must be one of its categories. | Minting, import | `plan.md` §7 proposes six categories and a mapping of the nine projects; the owner confirms in `seo-admin`. |
| G12 | **Old project URLs** are indexed. | SEO | D13 redirects. |
| G13 | **Kit 0.7.0 publication is Tobias's** (`npm stage approve`, 2FA). | Videos, `link` | The site pins 0.6.2 and ships the shim; bumping to 0.7.0 is a one-line follow-up that deletes the shim. |
