import type { BusinessProfile } from "@jrcodex/seo-kit";

/**
 * The site's own facts, in one place (spec 003, domain-model G3/G4).
 *
 * The canonical host lives here and only here: wrangler.jsonc's route and
 * ENGINE_WRITE_HOST, the sitemap, canonicals and JSON-LD all derive from it,
 * and tests/unit/config.test.ts fails if wrangler.jsonc disagrees.
 *
 * His name and e-mail come from the platform's business profile once the site
 * is connected (lib/platform/reads.ts); FALLBACK_PROFILE is what the site says
 * until then, or whenever the profile cannot be read. The profile has no
 * GitHub or LinkedIn field yet (engine spec 030 adds profile links), so those
 * two are constants here, read through lib/profile-links.ts.
 */

export const SITE_HOST = "juanramirez.codes";

/** The canonical origin, with a trailing slash. */
export const SITE_URL = `https://${SITE_HOST}/`;

/** The one language the site serves, unprefixed; the engine's first locale must agree. */
export const DEFAULT_LOCALE = "en";

/** An absolute URL on the canonical origin, for canonicals, the sitemap and robots.txt. */
export const absolute = (path: string): string => new URL(path, SITE_URL).href;

export const PERSON_NAME = "Juan Ramirez";

/** As linked from the old site's contact page (main, app/(app)/contact/page.tsx). */
export const LINKEDIN_URL = "https://www.linkedin.com/in/cloud-juan-manuel-ramirez/";

/** The GitHub account his repositories live under. */
export const GITHUB_URL = "https://github.com/Tobiscuit";

/**
 * Forwarded to his inbox (~/cloudflare-infra/proprietor-systems.tf: hello,
 * tobias, juan). Spec 003 D4: shown until his engine profile says otherwise.
 */
export const CONTACT_EMAIL = "juan@proprietor.systems";

/** What the site states while the engine's profile cannot be read, in the profile's shape. */
export const FALLBACK_PROFILE: BusinessProfile = {
  name: PERSON_NAME,
  telephone: null,
  email: CONTACT_EMAIL,
  address: null,
  social: {},
  serviceArea: [],
  team: "solo",
  hours: null,
  updatedAt: "2026-10-21T00:00:00.000Z",
};
