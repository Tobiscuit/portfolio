/**
 * Runtime secrets and not-yet-configured vars, declared for the type checker.
 * `wrangler types` generates Cloudflare.Env from wrangler.jsonc, but secrets
 * are set with `wrangler secret put` and are not in it (montano-btm's env.d.ts).
 *
 * All optional on purpose: each page degrades rather than failing when one is
 * unset, and the tests cover those paths.
 */
declare namespace Cloudflare {
  interface Env {
    /** The site's key for the Proprietor engine (`sk_…`). Unset: fallbacks everywhere; the form answers 503. */
    SEO_SITE_KEY?: string;
    /** Turnstile's secret. Set with the site key, or neither. */
    TURNSTILE_SECRET_KEY?: string;
    /** Turnstile's public site key: a var once the widget exists (plan.md section 8). */
    TURNSTILE_SITE_KEY?: string;
  }
}
