import type { BusinessProfile, Post, PostSummary, SitemapEntry } from "@jrcodex/seo-kit";

/**
 * What the stub engine answers (tests/stubs/seo-engine) and what the unit
 * tests feed the readers. Plain data with no Node or Workers imports, so both
 * runtimes can load it. Fictional on purpose: no real post, person or client.
 *
 * The images are built the way the engine builds them on a proxied zone:
 * `/cdn-cgi/image/<options>/media/<key>` (seo-engine src/render/image-url.ts).
 */

export const SLUG = "juanramirez";
export const HERO_KEY = `${SLUG}/posts/fixture-hero.webp`;
export const FIGURE_KEY = `${SLUG}/posts/fixture-figure.webp`;
export const VIDEO_KEY = `${SLUG}/video/renders/fixture-cut.mp4`;

const transform = (key: string, width: number) => `/cdn-cgi/image/format=auto,width=${width}/media/${key}`;
const picture = (key: string, alt: string) => ({
  key,
  alt,
  src: transform(key, 1280),
  srcset: `${transform(key, 768)} 768w, ${transform(key, 1280)} 1280w`,
  sizes: "(max-width: 48rem) 100vw, 65ch",
});

export const FIXTURE_SUMMARIES: PostSummary[] = [
  {
    slug: "fixture-laid-out",
    locale: "en",
    path: "/blog/fixture-laid-out",
    title: "Fixture: a post with every layout item",
    excerpt: "The stub engine's post with a hero, a figure, a pull quote, key points and an aside.",
    publishedAt: "2026-10-20T15:00:00.000Z",
    hero: picture(HERO_KEY, "A test pattern"),
    category: "engineering",
    readingMinutes: 4,
  },
  {
    slug: "fixture-plain",
    locale: "en",
    path: "/blog/fixture-plain",
    title: "Fixture: a plain post",
    excerpt: "No hero, the neutral plan.",
    publishedAt: "2026-10-18T15:00:00.000Z",
    hero: null,
    category: "notes",
    readingMinutes: 2,
  },
];

const FULL_BLOCKS = [
  "<p>First paragraph of the fixture post.</p>",
  `<figure><img src="${transform(FIGURE_KEY, 1280)}" srcset="${transform(FIGURE_KEY, 768)} 768w" alt="A test diagram" width="1280" height="720"></figure>`,
  "<p>The sentence the pull quote lifts, word for word.</p>",
  "<h2>A section</h2>",
  "<p>Closing paragraph.</p>",
];

export const FIXTURE_POSTS: Post[] = [
  {
    ...FIXTURE_SUMMARIES[0],
    html: FULL_BLOCKS.join(""),
    blocks: FULL_BLOCKS,
    canonical: "https://juanramirez.codes/blog/fixture-laid-out",
    alternates: [{ locale: "en", path: "/blog/fixture-laid-out", url: "https://juanramirez.codes/blog/fixture-laid-out" }],
    xDefault: null,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: "Fixture: a post with every layout item",
        image: `https://juanramirez.codes${transform(HERO_KEY, 1280)}`,
      },
    ],
    locales: ["en"],
    layout: {
      intent: "explain",
      tone: "authority",
      opening: "hero-full",
      figures: [{ block: 1, placement: "wide", caption: "A caption that adds a fact." }],
      inserts: [
        { kind: "pull-quote", at: 2, text: "The sentence the pull quote lifts, word for word." },
        { kind: "key-points", at: 3, items: ["One point", "Another point"] },
        { kind: "aside", at: 4, note: "tip", text: "A short tip." },
      ],
      closing: "read-more",
    },
  },
  {
    ...FIXTURE_SUMMARIES[1],
    html: "<p>Only a paragraph.</p>",
    blocks: ["<p>Only a paragraph.</p>"],
    canonical: "https://juanramirez.codes/blog/fixture-plain",
    alternates: [{ locale: "en", path: "/blog/fixture-plain", url: "https://juanramirez.codes/blog/fixture-plain" }],
    xDefault: null,
    jsonLd: [],
    locales: ["en"],
    layout: { intent: "inform", tone: "reassure", opening: "none", figures: [], inserts: [], closing: "none" },
  },
];

export const FIXTURE_SITEMAP: SitemapEntry[] = FIXTURE_SUMMARIES.map((post) => ({
  path: post.path,
  lastModified: post.publishedAt,
  alternates: { en: post.path },
}));

export const FIXTURE_PROFILE: BusinessProfile = {
  name: "Juan Ramirez",
  telephone: null,
  email: "fixture@example.com",
  address: null,
  social: {},
  serviceArea: [],
  team: "solo",
  hours: null,
  updatedAt: "2026-10-20T00:00:00.000Z",
};

export const FIXTURE_VIDEOS = [
  {
    id: "fixture-cut",
    title: "Fixture: a shown clip",
    src: `/media/${VIDEO_KEY}`,
    contentType: "video/mp4" as const,
    seconds: 42,
    format: "landscape" as const,
    publishedAt: "2026-10-19T12:00:00.000Z",
  },
];
