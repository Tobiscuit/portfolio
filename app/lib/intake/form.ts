/**
 * What the contact page and the intake handler share. No server code here, so
 * the page's browser bundle can import it without pulling in the handler.
 */

/** The field the page sends the Turnstile token in: the widget's own default name. */
export const TOKEN_FIELD = "cf-turnstile-response";

/**
 * The widget's action. Siteverify echoes it for real site keys, and the handler
 * refuses a token minted for any other action. At most 32 characters of
 * [A-Za-z0-9_-] (Cloudflare's widget configuration).
 */
export const TURNSTILE_ACTION = "contact";
