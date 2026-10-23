import base from "../styles/base.css";
import enhancements from "../styles/enhancements.css";
import fonts from "../styles/fonts.css";
import primitives from "../styles/primitives.css";
import reset from "../styles/reset.css";
import site from "../styles/site.css";
import tokens from "../styles/tokens.css";
import { bundleCss } from "../lib/fingerprint";

/**
 * The one stylesheet, in cascade order (design-system.json "source"). Built
 * once per isolate from the Text modules wrangler bundles (spec 003 R0).
 */
export const STYLESHEET = bundleCss([reset, fonts, tokens, base, primitives, enhancements, site]);

/** The vendored htmx (public/vendor), loaded on /contact only. */
export const HTMX_SRC = "/vendor/htmx-4.0.0.min.js";

/** Cloudflare's Turnstile script, loaded on /contact only. */
export const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

/** Preloaded on every page: the body face and the heading face. */
export const FONT_PRELOADS = ["/fonts/inter-latin-wght-normal.woff2", "/fonts/source-serif-4-latin-wght-normal.woff2"] as const;
