/**
 * What the contact page and the intake handler share. No server code here, so
 * the page's browser bundle can import it without pulling in the handler.
 * (From PR #1/#4 `app/lib/intake/form.ts`, with the field list added.)
 */

/** The only fields an inquiry carries; the manifest declares exactly these. */
export const INTAKE_FIELDS = ["name", "email", "message"] as const;
export type IntakeField = (typeof INTAKE_FIELDS)[number];

/** The field the page sends the Turnstile token in: the widget's own default name. */
export const TOKEN_FIELD = "cf-turnstile-response"; // pragma: allowlist secret

/** The honeypot: a field people never see and bots fill. */
export const HONEYPOT_FIELD = "_gotcha";

/**
 * The widget's action. Siteverify echoes it for real site keys, and the handler
 * refuses a token minted for any other action. At most 32 characters of
 * [A-Za-z0-9_-] (Cloudflare's widget configuration).
 */
export const TURNSTILE_ACTION = "contact";

/** Field limits, checked in the browser (maxLength) and again on the server. */
export const LIMITS = { name: 100, email: 254, message: 5000 } as const;
