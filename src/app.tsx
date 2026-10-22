import { mediaHandler } from "@jrcodex/seo-kit/worker";
import { Hono } from "hono";

import { describe } from "../lib/seo";
import { platformClient } from "../lib/platform/reads";
import { STYLESHEET } from "./assets";
import type { AppEnv } from "./env";
import { blog } from "./routes/blog";
import { contact } from "./routes/contact";
import { pages } from "./routes/pages";
import { renderPage } from "./routes/render";
import { seo } from "./routes/seo";
import { EmptyState, Section, Shell } from "./views/ui";

/**
 * The site (spec 003, plan section 1). worker/index.ts wraps it: announce
 * before, the cache policy after.
 */
export const app = new Hono<AppEnv>();

// The one stylesheet, at its content-hashed URL (spec 003 R0). Any other name is a 404.
app.get("/assets/:file", (c) => {
  if (c.req.path !== STYLESHEET.href) return c.notFound();
  return c.body(STYLESHEET.css, 200, { "content-type": "text/css; charset=utf-8" });
});

// The engine's stored media (post images, shown clips) through the kit's door;
// a 404 when this Worker is not connected to the engine.
app.on(["GET", "HEAD"], "/media/*", async (c) => {
  const client = platformClient(c.env);
  if (!client) return c.text("not found", 404);
  return (await mediaHandler(c.req.raw, client)) ?? c.text("not found", 404);
});

// The old site's paths (spec 003 R7).
app.get("/projects", (c) => c.redirect("/work", 301));
app.get("/projects/*", (c) => c.redirect("/work", 301));

app.route("/", pages);
app.route("/", blog);
app.route("/", contact);
app.route("/", seo);

app.notFound((c) =>
  renderPage(
    c,
    { title: "Not found", description: "There is no page at this address.", path: new URL(c.req.url).pathname, noindex: true },
    <Section>
      <Shell size="narrow">
        <EmptyState as="h1" title="There is nothing here">
          <p>
            The page may have moved. Try the <a href="/work">work</a>, the <a href="/blog">writing</a> or the <a href="/">home page</a>.
          </p>
        </EmptyState>
      </Shell>
    </Section>,
    { status: 404 },
  ),
);

app.onError(async (error, c) => {
  console.error(`[app] ${c.req.method} ${new URL(c.req.url).pathname}: ${describe(error)}`);
  try {
    return await renderPage(
      c,
      { title: "Something went wrong", description: "This page could not be shown just now.", path: new URL(c.req.url).pathname, noindex: true },
      <Section>
        <Shell size="narrow">
          <EmptyState as="h1" title="Something went wrong">
            <p>This page could not be shown just now. Please try again in a minute.</p>
          </EmptyState>
        </Shell>
      </Section>,
      { status: 503 },
    );
  } catch {
    return c.text("Something went wrong. Please try again in a minute.", 503);
  }
});
