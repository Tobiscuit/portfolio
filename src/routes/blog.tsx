import { Hono } from "hono";

import { readPost, readPosts } from "../../lib/platform/reads";
import type { AppEnv } from "../env";
import { Article } from "../views/post";
import { EmptyState, Section, SectionHeader, Shell } from "../views/ui";
import { PostCards } from "./pages";
import { renderPage, wantsOriginals } from "./render";

/**
 * The blog, from the engine (spec 003 section 4). A list read that fails lets
 * the error through to onError (a 5xx crawlers retry, never a silent empty
 * list); an unknown slug is the 404 page. Canonical, hreflang and JSON-LD are
 * the engine's (the kit's rule: never set them by hand).
 */
export const blog = new Hono<AppEnv>();

blog.get("/blog", async (c) => {
  const posts = await readPosts(c.env, { originals: wantsOriginals(c) });
  return renderPage(
    c,
    { title: "Writing", description: "Notes on what I build and why: platforms, security, and the decisions behind them.", path: "/blog", noindex: posts.length === 0 },
    <Section>
      <Shell>
        <SectionHeader as="h1" eyebrow="Writing" title="Writing" lede="Notes on what I build and why." />
        {posts.length === 0 ? (
          <EmptyState title="No posts yet">
            <p>
              The first ones will be the long versions of the <a href="/work">work</a>.
            </p>
          </EmptyState>
        ) : (
          <PostCards posts={posts} headingLevel="h2" />
        )}
      </Shell>
    </Section>,
  );
});

blog.get("/blog/:slug", async (c) => {
  const post = await readPost(c.env, c.req.param("slug"), { originals: wantsOriginals(c) });
  if (post === null) return c.notFound();
  const ogImage = post.hero ? new URL(post.hero.src, post.canonical).href : undefined;
  return renderPage(
    c,
    {
      title: post.title,
      description: post.excerpt,
      path: post.path,
      canonical: post.canonical,
      alternates: post.alternates.map((alt) => ({ locale: alt.locale, url: alt.url })),
      ogType: "article",
      ogImage,
      jsonLd: post.jsonLd,
    },
    <Section>
      <Article post={post} />
    </Section>,
  );
});
