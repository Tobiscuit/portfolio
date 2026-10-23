import { announceOnce, type SeoClient } from "@jrcodex/seo-kit";

import { canReadVideos } from "../platform/videos";
import { engineClient, manifestFor, mayWriteToEngine, type EngineEnv } from "../seo";
import { CONTACT_EMAIL } from "../site";
import { HONEYPOT_FIELD, LIMITS, TOKEN_FIELD } from "./form";
import { verifyTurnstile } from "./turnstile";

/**
 * The contact form on the platform path: hand the inquiry to the engine's
 * Inquiries, which put it first on his dashboard (spec 003, section 5). From
 * PR #1/#4's `app/lib/intake/handle.ts` (feat/platform-intake), adapted:
 *   - the transport is rpc() over the SEO binding only (no http(), no SES);
 *   - Turnstile is required: no keys means the form fails closed (503), never
 *     an unchecked form;
 *   - the result is an outcome the route renders, as an htmx fragment or as a
 *     whole page for a browser without JavaScript.
 *
 *   honeypot -> field rules -> Turnstile -> write host -> announceOnce -> inquire
 *
 * Logs name the outcome only - never the site key, the Turnstile secret or
 * anything the visitor typed.
 */

/** Where the visitor was: the contact page, in English. */
const SUBMISSION_CONTEXT = { locale: "en", page: "/contact" } as const;

export interface InquiryEnv extends EngineEnv {
  /** Turnstile's secret. Both keys set: checked. Either missing: every request fails closed. */
  TURNSTILE_SECRET_KEY?: string;
  /** Turnstile's site key; the page renders the widget with it. */
  TURNSTILE_SITE_KEY?: string;
}

export interface InquiryDeps {
  env: InquiryEnv;
  /** Siteverify goes through it. Default: the global fetch. */
  fetch?: typeof fetch;
  /** Where "please e-mail me instead" points. Default: lib/site.ts CONTACT_EMAIL. */
  contactEmail?: string;
}

export type OutcomeName =
  | "sent"
  | "discarded"
  | "malformed"
  | "invalid"
  | "turnstile-missing-token"
  | "turnstile-rejected"
  | "turnstile-unavailable"
  | "turnstile-misconfigured"
  | "preview"
  | "rate-limited"
  | "refused"
  | "unconfigured"
  | "site-key-refused"
  | "manifest-refused"
  | "engine-error";

export interface Fields {
  name: string;
  email: string;
  message: string;
}

export type InquiryOutcome =
  | { ok: true; status: 200; outcome: "sent" | "discarded"; message: string }
  | { ok: false; status: 400 | 429 | 503; outcome: Exclude<OutcomeName, "sent" | "discarded">; message: string; retryAfterSeconds?: number; fields?: Fields };

/** Outcomes that need someone to look: configuration errors and outages. */
const NEEDS_ATTENTION: ReadonlySet<OutcomeName> = new Set<OutcomeName>([
  "turnstile-misconfigured",
  "turnstile-unavailable",
  "unconfigured",
  "site-key-refused",
  "manifest-refused",
  "engine-error",
]);

/** The visitor's words, in the site's own voice. */
export const MESSAGES = {
  sent: "Thanks, your message is on its way. I read every one and answer within a few days.",
  malformed: "That did not come through as a form. Please try again.",
  rateLimited: "Too many messages just now. Please try again in a minute.",
  preview: "This is a preview of the site, so messages are not sent from here.",
  missingToken: "The security check did not finish, so nothing was sent. Please try again.",
  rejected: "The security check did not pass, so nothing was sent. Please try again.",
  unsent: (email: string) => `The message could not be sent. Please e-mail me at ${email} instead.`,
  /** The engine's reason: "plain enough to show on the form" (the kit's README). */
  refused: (reason: string) => sentence(reason) || "The message was not accepted. Please check it and try again.",
};

export async function handleInquiry(request: Request, deps: InquiryDeps): Promise<InquiryOutcome> {
  const { env } = deps;
  const fetchImpl = deps.fetch ?? globalThis.fetch;
  const unsent = MESSAGES.unsent(deps.contactEmail ?? CONTACT_EMAIL);

  const body = await readBody(request);
  if (body === null) return fail("malformed", 400, MESSAGES.malformed);

  // 1. The honeypot. Success, because telling a bot it was detected only
  //    teaches its author to stop filling the field; nothing is sent.
  if (str(body[HONEYPOT_FIELD])) return done("discarded");

  // 2. The site's own field rules and messages.
  const fields = validate(body);
  const typed: Fields = { name: str(body.name), email: str(body.email), message: str(body.message) };
  if (!fields.ok) return fail("invalid", 400, fields.error, { fields: typed });

  // 3. Turnstile, required: half or no configuration fails closed.
  const secret = env.TURNSTILE_SECRET_KEY;
  const siteKey = env.TURNSTILE_SITE_KEY;
  if (!secret || !siteKey) return fail("turnstile-misconfigured", 503, unsent, { fields: typed }, "set both TURNSTILE_SECRET_KEY and TURNSTILE_SITE_KEY");
  const check = await verifyTurnstile({ token: body[TOKEN_FIELD], secret, remoteIp: request.headers.get("cf-connecting-ip"), fetch: fetchImpl }); // pragma: allowlist secret
  if (!check.ok) {
    if (check.reason === "missing-token") return fail("turnstile-missing-token", 400, MESSAGES.missingToken, { fields: typed });
    if (check.reason === "rejected") return fail("turnstile-rejected", 400, MESSAGES.rejected, { fields: typed }, check.codes.join(", "));
    return fail("turnstile-unavailable", 503, unsent, { fields: typed }, check.codes?.join(", "));
  }

  // 4. Only the production host writes to the engine, so a preview can never
  //    create a real inquiry (montano-btm's rule).
  if (!mayWriteToEngine(request, env)) {
    if (!env.ENGINE_WRITE_HOST) return fail("unconfigured", 503, unsent, { fields: typed }, "ENGINE_WRITE_HOST is not set");
    return fail("preview", 503, MESSAGES.preview, { fields: typed });
  }

  // 5 and 6. The engine refuses inquiries from a site whose manifest it has
  //    not stored, so announce first; announceOnce is memoized per isolate.
  let client: SeoClient;
  try {
    client = engineClient(env);
  } catch (error) {
    if (errorName(error) === "SiteKeyError") return fail("site-key-refused", 503, unsent, { fields: typed }, "SEO_SITE_KEY is missing or malformed");
    return fail("unconfigured", 503, unsent, { fields: typed }, "the SEO binding is not configured");
  }
  try {
    await announceOnce(client, manifestFor({ videos: canReadVideos(env, client) }));
    await client.inquire({ ...SUBMISSION_CONTEXT, fields: { name: fields.name, email: fields.email, message: fields.message } });
  } catch (error) {
    return fromEngineError(error, unsent, typed);
  }
  return done("sent");
}

/** The site's field rules (from the old site's app/lib/ses/contact.ts, main). */
export function validate(body: Record<string, unknown>): ({ ok: true } & Fields) | { ok: false; error: string } {
  const name = clean(str(body.name));
  const email = clean(str(body.email)).toLowerCase();
  const message = str(body.message);
  if (!name) return { ok: false, error: "Please enter your name." };
  if (name.length > LIMITS.name) return { ok: false, error: "That name is too long." };
  if (!email) return { ok: false, error: "Please enter your email address." };
  if (email.length > LIMITS.email || !EMAIL.test(email)) return { ok: false, error: "That email address does not look right." };
  if (!message) return { ok: false, error: "Please enter a message." };
  if (message.length > LIMITS.message) return { ok: false, error: `Please keep the message under ${LIMITS.message} characters.` };
  return { ok: true, name, email, message };
}

/** Deliberately permissive: strict RFC 5322 checks reject addresses that work. */
const EMAIL = /^[^\s@,;]+@[^\s@,;.]+\.[^\s@,;]+$/;

/**
 * Over a service binding the kit rebuilds its own error classes from the
 * name (kit 0.4.1+), so the name is the contract: by name, never instanceof.
 */
function fromEngineError(error: unknown, unsent: string, fields: Fields): InquiryOutcome {
  const e = (typeof error === "object" && error !== null ? error : {}) as { message?: unknown; retryAfterSeconds?: unknown };
  const name = errorName(error);
  if (name === "InquiryRefused") {
    const retry = typeof e.retryAfterSeconds === "number" && e.retryAfterSeconds > 0 ? Math.ceil(e.retryAfterSeconds) : undefined;
    if (retry !== undefined) return fail("rate-limited", 429, MESSAGES.rateLimited, { fields, retryAfterSeconds: retry });
    return fail("refused", 400, MESSAGES.refused(String(e.message ?? "")), { fields });
  }
  if (name === "SiteKeyError") return fail("site-key-refused", 503, unsent, { fields }, "SEO_SITE_KEY is missing, malformed or refused by the engine");
  if (name === "ManifestError") return fail("manifest-refused", 503, unsent, { fields }, "the engine refused lib/seo.ts manifestFor()");
  // Timeouts and outages: the error's name only, never a message that could carry anything else.
  return fail("engine-error", 503, unsent, { fields }, name || "unknown error");
}

function errorName(error: unknown): string {
  return typeof error === "object" && error !== null && typeof (error as { name?: unknown }).name === "string" ? (error as { name: string }).name : "";
}

function done(outcome: "sent" | "discarded"): InquiryOutcome {
  console.info(`[contact] ${outcome}`);
  return { ok: true, status: 200, outcome, message: MESSAGES.sent };
}

function fail(
  outcome: Exclude<OutcomeName, "sent" | "discarded">,
  status: 400 | 429 | 503,
  message: string,
  extra: { fields?: Fields; retryAfterSeconds?: number } = {},
  detail?: string,
): InquiryOutcome {
  const line = `[contact] ${outcome}${detail ? ` (${detail})` : ""}`;
  if (NEEDS_ATTENTION.has(outcome)) console.error(line);
  else if (outcome === "rate-limited" || outcome === "refused") console.warn(line);
  else console.info(line);
  return { ok: false, status, outcome, message, ...extra };
}

/** A classic form post or a JSON object; null when it cannot be read. */
async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const type = request.headers.get("content-type") ?? "";
    const parsed: unknown = type.includes("application/json") ? await request.json() : Object.fromEntries(await request.formData());
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Control characters become spaces: nothing the visitor types can break a header downstream. */
function clean(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]+/g, " ").trim();
}

/** "message is too short" -> "Message is too short." */
function sentence(text: string): string {
  const trimmed = text.trim().replace(/[.\s]+$/, "");
  return trimmed ? `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}.` : "";
}
