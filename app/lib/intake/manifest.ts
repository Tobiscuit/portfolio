import type { Manifest } from "@jrcodex/seo-kit";

/**
 * What jrcodex.dev tells the SEO engine it is (engine spec 005; this repo's
 * specs/001-platform-intake/spec.md, "The manifest"): a service business with
 * an English contact form of three fields. The engine keeps only these fields
 * from an inquiry.
 *
 * Never declare what the site does not have: no blog, no gallery. `has.email`
 * is added when the jrcodex mailbox (Track A) is active, never before.
 */
export const manifest = {
  version: 1,
  kind: "service",
  has: { intake: true },
  locales: ["en"],
  intake: { fields: ["name", "email", "message"] },
} satisfies Manifest;
