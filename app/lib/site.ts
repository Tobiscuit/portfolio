import type { BusinessProfile } from "@jrcodex/seo-kit";

/**
 * The site's own facts, in one place (specs/002-proprietor-adoption).
 *
 * The owner's name and email come from the platform's business profile
 * (engine spec 010) once the site is connected; FALLBACK_PROFILE is what the
 * site states until then, or whenever the profile cannot be read
 * (app/lib/platform/client.ts). The profile has no LinkedIn or GitHub field,
 * so those two links stay the site's own constants, like montano-btm's.
 */

/** The canonical origin (spec 002, D5: www stays canonical under the hybrid). */
export const SITE_URL = "https://www.jrcodex.dev/";

/** The one language the site serves, unprefixed; the engine's first locale must agree. */
export const DEFAULT_LOCALE = "en";

/** An absolute URL on the canonical origin, for canonicals, the sitemap and robots.txt. */
export const absolute = (path: string): string => new URL(path, SITE_URL).href;

/** The address the contact page shows (spec 001, B-D4), until hello@jrcodex.dev is active. */
export const CONTACT_EMAIL = "jramirez203@outlook.com";

/** As linked from the contact page. */
export const LINKEDIN_URL = "https://www.linkedin.com/in/cloud-juan-manuel-ramirez/";

/** The GitHub account the site's repositories live under (Tobiscuit/portfolio). */
export const GITHUB_URL = "https://github.com/Tobiscuit";

/** What the site states while the profile cannot be read: in the profile's shape. */
export const FALLBACK_PROFILE: BusinessProfile = {
  name: "Juan Ramirez",
  telephone: null,
  email: CONTACT_EMAIL,
  address: null,
  social: {},
  serviceArea: [],
  team: "solo",
  hours: null,
  updatedAt: "2026-10-16T00:00:00.000Z",
};
