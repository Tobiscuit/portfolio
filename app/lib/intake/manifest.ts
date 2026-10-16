import type { Manifest } from "@jrcodex/seo-kit";

/**
 * What jrcodex.dev tells the SEO engine it is (engine spec 005; this repo's
 * specs/001-platform-intake/spec.md, "The manifest", and
 * specs/002-proprietor-adoption): a service business with an English contact
 * form of three fields, and a blog. The engine keeps only these fields from an
 * inquiry, and composes every post with what `renders` says the post page
 * (app/components/platform/BlogPost.tsx) can show: every compose() item, and
 * figures at all three placements.
 *
 * Never declare what the site does not have. Projects stay in Payload (spec
 * 002, D1), so no `projects`; no gallery, chat or catalog; `video` is a tool
 * the operator turns on, not a module. `has.email` only under spec 002 D4(b),
 * after that mailbox is active.
 */
export const manifest = {
  version: 1,
  kind: "service",
  has: { intake: true, blog: true },
  renders: { pullQuote: true, keyPoints: true, aside: true, placements: ["wide", "inset-left", "inset-right"] },
  locales: ["en"],
  intake: { fields: ["name", "email", "message"] },
} satisfies Manifest;
