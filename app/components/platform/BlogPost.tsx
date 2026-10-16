/* eslint-disable @next/next/no-img-element -- the engine's pictures come with their own srcset; /media serves them */
import type { ReactNode } from "react";
import type { Post } from "@jrcodex/seo-kit";
import { compose, type LayoutItem } from "@jrcodex/seo-kit/compose";
import { postJsonLd } from "@jrcodex/seo-kit/next";

import { manifest } from "@/lib/intake/manifest";
import { formatDate } from "./format";

/**
 * One post, laid out as the engine planned it (engine spec 004; montano-btm's
 * BlogPost.tsx is the model): compose() turns the plan into an ordered list,
 * and each item kind gets one plain component here. `manifest.renders` says
 * exactly which: every kind, and figures at all three placements.
 *
 * The body HTML is rendered as the engine filtered it, never re-sanitised;
 * pull quotes, key points, asides and captions are plain text React escapes.
 * Canonical, hreflang and JSON-LD are the engine's (the page's metadata and
 * postJsonLd). Pictures already point at /media (app/lib/platform/images.ts).
 */

const BUTTON = "inline-flex items-center justify-center px-8 py-3 bg-arcane-gold-500 text-sage-blue-900 font-bold rounded-lg hover:shadow-sm transition-all duration-300";

/** The engine's body blocks: its h2-h6, lists and links, on the site's tokens. */
const PROSE =
  "space-y-4 text-parchment-300 [&_h2]:font-serif [&_h2]:text-parchment-100 [&_h2]:mt-10 [&_h3]:font-serif [&_h3]:text-parchment-100 [&_h3]:mt-8 " +
  "[&_a]:text-arcane-gold-500 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_img]:rounded-lg";

const PLACEMENT = {
  wide: "my-8",
  "inset-left": "my-6 md:float-left md:w-1/2 md:mr-6",
  "inset-right": "my-6 md:float-right md:w-1/2 md:ml-6",
} as const;

const NOTE_LABEL = { tip: "Tip", warning: "Warning", cost: "Cost" } as const;

export default function BlogPost({ post }: { post: Post }) {
  return (
    <article className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <p className="mb-8 text-sm">
        <a href="/blog" className="text-ink-500 hover:text-parchment-100 transition-colors">
          All posts
        </a>
      </p>
      <div className="flow-root">{renderItems(compose(post, { supports: manifest.renders }), post)}</div>
      <script type="application/ld+json" dangerouslySetInnerHTML={postJsonLd(post)} />
    </article>
  );
}

/** Items in plan order; neighbouring body blocks share one prose container. */
function renderItems(items: LayoutItem[], post: Post): ReactNode[] {
  const out: ReactNode[] = [];
  let prose: string[] = [];
  const flush = () => {
    if (prose.length === 0) return;
    out.push(<div key={`prose-${out.length}`} className={PROSE} dangerouslySetInnerHTML={{ __html: prose.join("") }} />);
    prose = [];
  };
  items.forEach((item, index) => {
    if (item.kind === "html") {
      prose.push(item.html);
      return;
    }
    flush();
    out.push(renderItem(item, index, post));
  });
  flush();
  return out;
}

function renderItem(item: Exclude<LayoutItem, { kind: "html" }>, index: number, post: Post): ReactNode {
  switch (item.kind) {
    case "opening": {
      const showHero = item.hero !== null && (item.treatment === "hero-full" || item.treatment === "hero-inset");
      const hero = showHero && item.hero && (
        <figure key="hero" className="my-8">
          <img src={item.hero.src} srcSet={item.hero.srcset || undefined} sizes={item.hero.sizes || undefined} alt={item.hero.alt} className="w-full rounded-lg" />
        </figure>
      );
      const head = (
        <header key="head" className="mb-8">
          <h1 className="font-serif text-parchment-100">{item.title}</h1>
          <p className={item.treatment === "statement" ? "mt-6 text-2xl text-parchment-100" : "mt-4 text-ink-500"}>{item.excerpt}</p>
          <p className="mt-4 text-sm text-ink-500">
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
            <span aria-hidden="true"> · </span>
            <span>{post.readingMinutes} min read</span>
          </p>
        </header>
      );
      return <div key={`opening-${index}`}>{item.treatment === "hero-full" ? [hero, head] : [head, hero]}</div>;
    }
    case "figure":
      return (
        <div key={`figure-${index}`} data-placement={item.placement} className={PLACEMENT[item.placement]}>
          <div className={PROSE} dangerouslySetInnerHTML={{ __html: item.html }} />
          {item.caption && <p className="mt-2 text-sm text-ink-500">{item.caption}</p>}
        </div>
      );
    case "pull-quote":
      return (
        <blockquote key={`quote-${index}`} className="my-8 border-l-4 border-arcane-gold-500 pl-6 font-serif text-parchment-100">
          <p>{item.text}</p>
        </blockquote>
      );
    case "key-points":
      return (
        <aside key={`points-${index}`} className="my-8 bg-ink-900 rounded-lg p-6" aria-labelledby={`key-points-${index}`}>
          <p id={`key-points-${index}`} className="font-bold text-parchment-100">
            Key points
          </p>
          <ul className="mt-3 list-disc pl-6 space-y-1 text-parchment-300">
            {item.items.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </aside>
      );
    case "aside":
      return (
        <aside key={`aside-${index}`} data-note={item.note} className="my-8 bg-ink-900 rounded-lg p-6">
          <p className="font-bold text-arcane-gold-500">{NOTE_LABEL[item.note]}</p>
          <p className="mt-2 text-parchment-300">{item.text}</p>
        </aside>
      );
    case "closing":
      if (item.cta === "none") return null;
      return (
        <div key={`closing-${index}`} data-tone={item.tone} className="mt-12 clear-both">
          {item.cta === "read-more" ? (
            <a href="/blog" className={BUTTON}>
              More posts
            </a>
          ) : (
            // "call" and "schedule": the site has no phone, so both are the contact form.
            <a href="/contact" className={BUTTON}>
              Get in touch
            </a>
          )}
        </div>
      );
  }
}
