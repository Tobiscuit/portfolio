import type { Post, PostSummary, ResponsiveImage } from "@jrcodex/seo-kit";
import { compose, type LayoutItem } from "@jrcodex/seo-kit/compose";

import { RENDERS } from "../../lib/seo";
import { ButtonLink } from "./ui";

/**
 * A post laid out by its plan (the kit's compose(); kit README, "The post,
 * laid out as planned"). The engine decided the items; these components
 * decide how they look, with PR #5's prose grid. Engine HTML (html and figure
 * items) is inserted as-is: the engine filtered it, and the kit says not to
 * re-sanitize. Every plain-text item (quotes, points, asides, captions) is
 * escaped by hono/jsx.
 */

const dateFormat = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
export const formatDate = (iso: string) => dateFormat.format(new Date(iso));

function Picture({ image, eager = false }: { image: ResponsiveImage; eager?: boolean }) {
  return (
    <img
      src={image.src}
      srcset={image.srcset}
      sizes={image.sizes}
      alt={image.alt}
      loading={eager ? "eager" : "lazy"}
      fetchpriority={eager ? "high" : undefined}
      decoding="async"
    />
  );
}

export function PostMeta({ post }: { post: PostSummary }) {
  return (
    <p class="post-meta">
      <time datetime={post.publishedAt}>{formatDate(post.publishedAt)}</time> · {post.readingMinutes} min read
    </p>
  );
}

function Opening({ item, post }: { item: Extract<LayoutItem, { kind: "opening" }>; post: Post }) {
  const hero = item.hero && (item.treatment === "hero-full" || item.treatment === "hero-inset") ? item.hero : null;
  return (
    <>
      <header class="stack">
        <PostMeta post={post} />
        <h1 id="post-title">{item.title}</h1>
        {item.excerpt ? <p class={item.treatment === "statement" ? "lede post-statement" : "lede"}>{item.excerpt}</p> : null}
      </header>
      {hero ? (
        <figure class={item.treatment === "hero-full" ? "media-frame placement-wide" : "media-frame"}>
          <div class="media-frame__media">
            <Picture image={hero} eager />
          </div>
        </figure>
      ) : null}
    </>
  );
}

const NOTE_LABEL = { tip: "Tip", warning: "Watch out", cost: "On cost" } as const;

function Item({ item, post }: { item: LayoutItem; post: Post }) {
  switch (item.kind) {
    case "opening":
      return <Opening item={item} post={post} />;
    case "html":
      return <div class="prose-body" dangerouslySetInnerHTML={{ __html: item.html }} />;
    case "figure":
      return (
        <figure class={`post-figure placement-${item.placement}`}>
          <div class="prose-body" dangerouslySetInnerHTML={{ __html: item.html }} />
          {item.caption ? <figcaption>{item.caption}</figcaption> : null}
        </figure>
      );
    case "pull-quote":
      return (
        <blockquote class="pull-quote">
          <p>{item.text}</p>
        </blockquote>
      );
    case "key-points":
      return (
        <aside class="key-points" aria-label="Key points">
          <p class="key-points__title">Key points</p>
          <ul>
            {item.items.map((point) => (
              <li>{point}</li>
            ))}
          </ul>
        </aside>
      );
    case "aside":
      return (
        <aside class={`note note--${item.note}`} aria-label={NOTE_LABEL[item.note]}>
          <p>
            <span class="note__label">{NOTE_LABEL[item.note]}: </span>
            {item.text}
          </p>
        </aside>
      );
    case "closing":
      if (item.cta === "none") return null;
      return (
        <div class="cta-panel placement-wide">
          <div>
            <h2 class="cta-panel__title">{item.cta === "read-more" ? "Keep reading" : "Want to talk about it?"}</h2>
            <p class="cta-panel__text">{item.cta === "read-more" ? "More notes on what I build and why." : "I read every message and answer within a few days."}</p>
          </div>
          {item.cta === "read-more" ? <ButtonLink href="/blog">All writing</ButtonLink> : <ButtonLink href="/contact">Get in touch</ButtonLink>}
        </div>
      );
  }
  return null;
}

/**
 * The items, with each inset figure and the html items that follow it kept in
 * one .prose__flow block, so the paragraphs wrap around the float (PR #5's
 * README, "inset-right / inset-left float on screens ≥48rem").
 */
export function groupForFloats(items: LayoutItem[]): Array<LayoutItem | LayoutItem[]> {
  const out: Array<LayoutItem | LayoutItem[]> = [];
  let flow: LayoutItem[] | null = null;
  for (const item of items) {
    const inset = item.kind === "figure" && item.placement !== "wide";
    if (inset) {
      flow = [item];
      out.push(flow);
    } else if (flow && item.kind === "html") {
      flow.push(item);
    } else {
      flow = null;
      out.push(item);
    }
  }
  return out;
}

export function Article({ post }: { post: Post }) {
  const items = compose(post, { supports: { ...RENDERS, placements: [...RENDERS.placements] } });
  return (
    <article class="prose" aria-labelledby="post-title">
      {groupForFloats(items).map((entry) =>
        Array.isArray(entry) ? (
          <div class="prose__flow">
            {entry.map((item) => (
              <Item item={item} post={post} />
            ))}
          </div>
        ) : (
          <Item item={entry} post={post} />
        ),
      )}
    </article>
  );
}
