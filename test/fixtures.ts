import type { BusinessProfile, Post, PostSummary, SitemapEntry } from "@jrcodex/seo-kit";

import type { VideoSummary } from "@/lib/platform/videos";

/**
 * Test data for the stub engine (test/stub-engine.ts), shaped exactly like
 * @jrcodex/seo-kit 0.6.2's Post, PostSummary, BusinessProfile and
 * SitemapEntry, and like specs/002-proprietor-adoption/plan.md section 2.2's
 * VideoSummary. The shapes follow montano-btm's tests/stubs/seo-engine/
 * fixtures.ts; the content is invented for these tests and claims nothing.
 *
 * The engine's image URLs are Cloudflare transform URLs
 * (`/cdn-cgi/image/<options>/media/<key>`, seo-engine src/render/image-url.ts),
 * root-relative in a post and absolute in its JSON-LD. This site's zone is not
 * proxied, so app/lib/platform/images.ts rewrites every one to `/media/<key>`.
 */

/** The origin the engine has for this site (spec 002, D5: www stays canonical). */
export const ORIGIN = "https://www.jrcodex.dev";
export const PRODUCTION_HOST = "www.jrcodex.dev";
export const PREVIEW_HOST = "portfolio-git-feat-proprietor-adoption-tobiscuit.vercel.app";

/** Built the engine's way: `transformUrl(origin, key, { width })`. */
const transform = (key: string, width: number, origin = "") => `${origin}/cdn-cgi/image/format=auto,onerror=redirect,width=${width}/media/${key}`;

const picture = (key: string, alt: string) => ({
  key,
  alt,
  src: transform(key, 768),
  srcset: `${transform(key, 480)} 480w, ${transform(key, 768)} 768w, ${transform(key, 1024)} 1024w`,
  sizes: "(min-width: 48rem) 48rem, 100vw",
});

/** What the engine would answer for the business `jrcodex`: a person, no phone, no address. */
export const FIXTURE_PROFILE: BusinessProfile = {
  name: "Juan Ramirez",
  telephone: null,
  email: "hello@jrcodex.dev",
  address: null,
  social: {},
  serviceArea: [],
  team: "solo",
  hours: null,
  updatedAt: "2026-10-16T12:00:00.000Z",
};

export const HERO_KEY = "jrcodex/fixture-hero.png";
export const FIGURE_KEY = "jrcodex/fixture-figure.png";

/** Every word a test looks for in a rendered post, named once. */
export const POST_WORDS = {
  title: "Queues before cron",
  excerpt: "Why a queue beat a scheduler for the mail Worker.",
  h2: "The schedule was the bug",
  intro: "A cron that runs every minute is a queue with no backpressure.",
  figureAlt: "One Worker, one queue, one consumer",
  caption: "The consumer acknowledges a message only after the write lands.",
  pullQuote: "Retries are the queue's job.",
  points: ["Retries are the queue's job, not the handler's", "A dead-letter queue is the alarm"],
  aside: "Batch size 10 keeps one consumer under the free tier's CPU time.",
  closingPara: "The scheduler is gone and nothing has been lost since.",
} as const;

/** A post whose plan uses every item compose() can produce. */
function fullPost(): Post {
  const slug = "queues-before-cron";
  const path = `/blog/${slug}`;
  const blocks = [
    `<h2>${POST_WORDS.h2}</h2>`,
    `<p>${POST_WORDS.intro}</p>`,
    `<figure><img src="${transform(FIGURE_KEY, 768)}" alt="${POST_WORDS.figureAlt}" width="1" height="1"></figure>`,
    `<p>${POST_WORDS.closingPara}</p>`,
  ];
  const publishedAt = "2026-10-10T15:00:00.000Z";
  return {
    slug,
    locale: "en",
    path,
    title: POST_WORDS.title,
    excerpt: POST_WORDS.excerpt,
    publishedAt,
    hero: picture(HERO_KEY, POST_WORDS.title),
    category: "delivery-and-devops",
    readingMinutes: 4,
    html: blocks.join(""),
    blocks,
    layout: {
      intent: "The reader stops reaching for cron when a queue is the shape of the problem.",
      tone: "authority",
      opening: "hero-inset",
      figures: [{ block: 2, placement: "inset-right", caption: POST_WORDS.caption }],
      inserts: [
        { kind: "pull-quote", at: 2, text: POST_WORDS.pullQuote },
        { kind: "key-points", at: 3, items: [...POST_WORDS.points] },
        { kind: "aside", at: 4, note: "tip", text: POST_WORDS.aside },
      ],
      closing: "read-more",
    },
    canonical: `${ORIGIN}${path}`,
    alternates: [{ locale: "en", path, url: `${ORIGIN}${path}` }],
    xDefault: { path, url: `${ORIGIN}${path}` },
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: POST_WORDS.title,
        description: POST_WORDS.excerpt,
        datePublished: publishedAt,
        dateModified: publishedAt,
        inLanguage: "en",
        // The engine's articles.ts: an absolute transform URL.
        image: transform(HERO_KEY, 1024, ORIGIN),
        mainEntityOfPage: { "@type": "WebPage", "@id": `${ORIGIN}${path}` },
        author: { "@type": "Person", name: "Juan Ramirez" },
      },
    ],
    locales: ["en"],
  };
}

/** An older post with the neutral plan and no hero. */
function plainPost(): Post {
  const slug = "a-service-binding-is-not-a-url";
  const path = `/blog/${slug}`;
  const blocks = ["<p>A binding is a capability the platform hands a Worker; a URL is an address anyone can find.</p>"];
  const publishedAt = "2026-09-30T15:00:00.000Z";
  return {
    slug,
    locale: "en",
    path,
    title: "A service binding is not a URL",
    excerpt: "The difference that decides where a site can run.",
    publishedAt,
    hero: null,
    category: "cloud-architecture",
    readingMinutes: 2,
    html: blocks.join(""),
    blocks,
    layout: { intent: "", tone: "reassure", opening: "statement", figures: [], inserts: [], closing: "none" },
    canonical: `${ORIGIN}${path}`,
    alternates: [{ locale: "en", path, url: `${ORIGIN}${path}` }],
    xDefault: { path, url: `${ORIGIN}${path}` },
    jsonLd: [{ "@context": "https://schema.org", "@type": "BlogPosting", headline: "A service binding is not a URL" }],
    locales: ["en"],
  };
}

/** Newest first, as the engine lists them. */
export const FIXTURE_POSTS: Post[] = [fullPost(), plainPost()];

export function fixtureSummaries(locale: string): PostSummary[] {
  return FIXTURE_POSTS.filter((p) => p.locale === locale).map(({ slug, locale, path, title, excerpt, publishedAt, hero, category, readingMinutes }) => ({
    slug,
    locale,
    path,
    title,
    excerpt,
    publishedAt,
    hero,
    category,
    readingMinutes,
  }));
}

export function fixturePost(locale: string, slug: string): Post | null {
  return FIXTURE_POSTS.find((p) => p.locale === locale && p.slug === slug) ?? null;
}

export const FIXTURE_SITEMAP: SitemapEntry[] = FIXTURE_POSTS.map((p) => ({
  path: p.path,
  lastModified: p.publishedAt,
  alternates: { en: p.path },
}));

/** Two cuts the owner showed, newest first (engine spec 028). */
export const FIXTURE_VIDEOS: VideoSummary[] = [
  {
    id: "cut_01j9x4m2k7",
    title: "Deploying the mail Worker in ninety seconds",
    src: "/media/jrcodex/video/renders/cut_01j9x4m2k7.mp4",
    contentType: "video/mp4",
    seconds: 92,
    format: "landscape",
    publishedAt: "2026-10-12T18:00:00.000Z",
  },
  {
    id: "cut_01j9x4m2k8",
    title: "One queue, no cron",
    src: "/media/jrcodex/video/renders/cut_01j9x4m2k8.mp4",
    contentType: "video/mp4",
    seconds: 41,
    format: "portrait",
    publishedAt: "2026-10-05T18:00:00.000Z",
  },
];

/** The smallest valid PNG, so /v1/media/* answers real image bytes. */
const ONE_PIXEL_PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/** What the stub stores under /v1/media/<key>; every engine key has the business's slug as its first segment. */
export const FIXTURE_MEDIA: Record<string, { contentType: string; base64: string; etag: string }> = {
  [HERO_KEY]: { contentType: "image/png", base64: ONE_PIXEL_PNG, etag: '"fixture-hero-1"' },
  [FIGURE_KEY]: { contentType: "image/png", base64: ONE_PIXEL_PNG, etag: '"fixture-figure-1"' },
};
