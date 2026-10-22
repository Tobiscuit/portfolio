# juanramirez.codes

Juan Ramirez's portfolio: one small Cloudflare Worker that is a tenant of
[Proprietor](https://montanobtm.com/) (his multi-tenant platform for local
businesses). The narrative pages are code in this repository; the blog, the
contact form's inbox, his profile and (behind a fallback) videos come from the
Proprietor engine through a service binding, using `@jrcodex/seo-kit`. The
engine has no public address; this Worker reaches it only over the binding.

Spec, decisions and plan: [`specs/003-juanramirez-codes/`](specs/003-juanramirez-codes/).

## Stack

- [Hono](https://hono.dev) 4 with `hono/jsx`, rendered on the server; bundled by wrangler (no Vite).
- [htmx](https://htmx.org) 4, on the contact page only, with a no-JavaScript fallback.
- The SageScale v2 design system from PR #5: native CSS, no Tailwind; one fingerprinted stylesheet.
- Workers Cache in front, with an explicit `Cache-Control` on every response (`lib/cache-policy.ts`).

## Layout

```
worker/index.ts        entry: announce to the engine, the app, the cache policy
src/app.tsx            the Hono app: routes, 404 and error pages
src/routes/            pages, blog, contact, sitemap/robots
src/views/             server-only components: document, primitives, post layout
lib/                   framework-free logic: engine client and manifest, platform reads,
                       intake, cache policy, ports (projects, profile links), content rules
content/               the narrative: home, about, work summaries
styles/                the design system's CSS
public/                fonts, vendored htmx, favicon, _headers
tests/                 unit (Node), smoke (workerd + stub engine), a11y (axe), perf (Lighthouse)
```

## Commands

Run heavy commands inside `boxed` on the shared node.

```sh
cd /home/link/portfolio && npm ci
cd /home/link/portfolio && npm run typecheck          # wrangler types + tsc
cd /home/link/portfolio && boxed npm test             # unit + smoke
cd /home/link/portfolio && boxed npm run test:a11y    # axe, WCAG 2.2 AA
cd /home/link/portfolio && boxed npm run test:perf    # Lighthouse budgets
cd /home/link/portfolio && boxed npm run build        # wrangler deploy --dry-run: uploads nothing
cd /home/link/portfolio && npm run dev                # local; copy .dev.vars.example to .dev.vars first
```

There is deliberately no deploy script. Deploying, secrets and DNS are the
owner's steps: `specs/003-juanramirez-codes/plan.md`, section 8.
