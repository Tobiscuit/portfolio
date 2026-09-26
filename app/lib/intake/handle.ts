import { announceOnce } from "@jrcodex/seo-kit";

import { validate } from "../ses/contact";
import { engineFor, type EngineEnv } from "./engine";
import { TOKEN_FIELD } from "./form";
import { manifest } from "./manifest";
import { verifyTurnstile } from "./turnstile";

/**
 * The contact form on the platform path: hand the inquiry to the SEO engine's
 * Inquiries, exactly as montano-btm's quote form does (its lib/inquiry.ts on
 * develop, adapted here). Flow and every outcome:
 * specs/001-platform-intake/spec.md, section 1.
 *
 *   honeypot -> validate -> Turnstile (when configured) -> host guard
 *            -> announceOnce(manifest) -> inquire(...)
 *
 * Framework-free: a web Request in, a web Response out, so a move from
 * Next.js touches only the file that mounts it. The answer keeps the shape
 * the page reads: 200 { ok: true }, or an error status with { ok: false, error }.
 *
 * Logs name the outcome only - never the site key, the Turnstile secret or
 * anything the visitor typed.
 */

/** Where the visitor was: the contact page, in English. */
const SUBMISSION_CONTEXT = { locale: "en", page: "/contact" } as const;

export interface IntakeEnv extends EngineEnv {
  /** The only host whose requests may write to the engine: www.jrcodex.dev in production. */
  ENGINE_WRITE_HOST?: string;
  /** Where "please email me directly" points when a message cannot be sent. */
  CONTACT_FALLBACK_EMAIL?: string;
  /** Turnstile's secret. Both keys set: checked. Neither: skipped. One alone: every request fails closed. */
  TURNSTILE_SECRET_KEY?: string;
  /** Turnstile's site key; the page renders the widget with it. */
  NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string;
}

export interface ContactDeps {
  env: IntakeEnv;
  /** Every outbound call - the engine over HTTP, and siteverify - goes through it. Default: the global fetch. */
  fetch?: typeof fetch;
}

/** The visitor's words (spec section 1), in the site's own voice. */
const MESSAGES = {
  /** The legacy adapter's words for the same thing. */
  malformed: "Malformed request.",
  rateLimited: "Too many messages just now — please try again in a minute.",
  preview: "This is a preview of the site, so messages aren't sent from here.",
  missingToken: "The security check didn't finish, so nothing was sent. Please try again.",
  rejected: "The security check didn't pass, so nothing was sent. Please try again.",
  unsent: (fallback: string | undefined) =>
    fallback
      ? `The message could not be sent. Please email ${fallback} directly.`
      : "The message could not be sent. Please use the email address on this page instead.",
  /** The engine's reason: "plain enough to show on the form" (the kit's README). */
  refused: (reason: string) => sentence(reason) || "The message was not accepted. Please check it and try again.",
};

type Result = { error?: undefined } | { error: string; retryAfterSeconds?: number };

type OutcomeName =
  | "sent"
  | "discarded"
  | "malformed"
  | "invalid"
  | "turnstile-missing-token"
  | "turnstile-rejected"
  | "preview"
  | "rate-limited"
  | "refused"
  | "turnstile-misconfigured"
  | "turnstile-unavailable"
  | "unconfigured"
  | "site-key-refused"
  | "manifest-refused"
  | "engine-error";

/** Outcomes that need someone to look: configuration errors and outages. */
const NEEDS_ATTENTION: ReadonlySet<OutcomeName> = new Set<OutcomeName>([
  "turnstile-misconfigured",
  "turnstile-unavailable",
  "unconfigured",
  "site-key-refused",
  "manifest-refused",
  "engine-error",
]);

export async function handleContact(request: Request, deps: ContactDeps): Promise<Response> {
  const { env } = deps;
  const fetchImpl = deps.fetch ?? globalThis.fetch;
  const unsent = MESSAGES.unsent(env.CONTACT_FALLBACK_EMAIL);

  const body = await readBody(request);
  if (body === null) return answer("malformed", 400, { error: MESSAGES.malformed });

  // 1. The honeypot. Success, because telling a bot it was detected only
  //    teaches its author to stop filling the field; nothing is sent.
  if (str(body._gotcha)) return answer("discarded", 200, {});

  // 2. The site's own field rules and messages (app/lib/ses/contact.ts).
  const fields = validate(body);
  if (!fields.ok) return answer("invalid", 400, { error: fields.error });

  // 3. Turnstile, once both keys exist; half a configuration fails closed.
  const secret = env.TURNSTILE_SECRET_KEY;
  const siteKey = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (secret || siteKey) {
    if (!secret || !siteKey) {
      return answer("turnstile-misconfigured", 503, { error: unsent }, "set both TURNSTILE_SECRET_KEY and NEXT_PUBLIC_TURNSTILE_SITE_KEY, or neither");
    }
    const check = await verifyTurnstile({ token: body[TOKEN_FIELD], secret, remoteIp: clientIp(request), fetch: fetchImpl });
    if (!check.ok) {
      if (check.reason === "missing-token") return answer("turnstile-missing-token", 400, { error: MESSAGES.missingToken });
      if (check.reason === "rejected") return answer("turnstile-rejected", 400, { error: MESSAGES.rejected }, check.codes.join(", "));
      return answer("turnstile-unavailable", 503, { error: unsent }, check.codes?.join(", "));
    }
  }

  // 4. Only the production host writes to the engine, so a preview can never
  //    create a real inquiry (montano-btm's rule). On Vercel, Next.js builds
  //    request.url from the Host header (experimental.trustHostHeader, which
  //    next@16 turns on by itself when the build platform has Next support).
  const writeHost = env.ENGINE_WRITE_HOST;
  if (!writeHost) return answer("unconfigured", 503, { error: unsent }, "ENGINE_WRITE_HOST is not set");
  if (new URL(request.url).host !== writeHost) return answer("preview", 503, { error: MESSAGES.preview });

  // 5 and 6. The engine refuses inquiries from a site whose manifest it has
  //    not stored, so announce first; announceOnce is memoized per process.
  try {
    const client = engineFor(env, fetchImpl);
    await announceOnce(client, manifest);
    await client.inquire({ ...SUBMISSION_CONTEXT, fields: { name: fields.name, email: fields.email, message: fields.message } });
  } catch (error) {
    return fromEngineError(error, unsent);
  }
  return answer("sent", 200, {});
}

/**
 * The kit raises its own classes over http(); over a service binding they
 * arrive as plain Errors carrying the name and own fields, or, in the legacy
 * shape, with the name folded into the message. So: by name, never instanceof.
 */
function fromEngineError(error: unknown, unsent: string): Response {
  const e = (typeof error === "object" && error !== null ? error : {}) as {
    name?: unknown;
    message?: unknown;
    retryAfterSeconds?: unknown;
    cause?: { code?: unknown };
  };
  const message = String(e.message ?? "");
  const legacy = /^(InquiryRefused|SiteKeyError|ManifestError): ([\s\S]*)$/.exec(message);
  const name = legacy ? legacy[1] : String(e.name ?? "");

  if (name === "InquiryRefused") {
    const retry = typeof e.retryAfterSeconds === "number" && e.retryAfterSeconds > 0 ? Math.ceil(e.retryAfterSeconds) : undefined;
    if (retry !== undefined) return answer("rate-limited", 429, { error: MESSAGES.rateLimited, retryAfterSeconds: retry });
    return answer("refused", 400, { error: MESSAGES.refused(legacy ? legacy[2] : message) });
  }
  if (name === "SiteKeyError") {
    return answer("site-key-refused", 503, { error: unsent }, "SEO_SITE_KEY is missing, malformed or refused by the engine");
  }
  if (name === "ManifestError") {
    return answer("manifest-refused", 503, { error: unsent }, "the engine refused app/lib/intake/manifest.ts");
  }
  // Timeouts, network failures and the kit's "SEO engine answered 5xx": the
  // error's name, an errno code or the status - never a message that could
  // carry anything else.
  const status = /^SEO engine answered (\d{3}) for (the manifest|the inquiry)$/.exec(message);
  const code = typeof e.cause?.code === "string" && /^[A-Z0-9_]+$/.test(e.cause.code) ? `: ${e.cause.code}` : "";
  return answer("engine-error", 503, { error: unsent }, status ? `HTTP ${status[1]} for ${status[2]}` : `${name || "unknown error"}${code}`);
}

function answer(outcome: OutcomeName, status: number, result: Result, detail?: string): Response {
  const line = `[contact] ${outcome}${detail ? ` (${detail})` : ""}`;
  if (NEEDS_ATTENTION.has(outcome)) console.error(line);
  else if (outcome === "rate-limited" || outcome === "refused") console.warn(line);
  else console.info(line);

  const headers = new Headers({ "cache-control": "no-store" });
  if (result.error === undefined) return Response.json({ ok: true }, { status, headers });
  if (result.retryAfterSeconds) headers.set("retry-after", String(result.retryAfterSeconds));
  return Response.json({ ok: false, error: result.error }, { status, headers });
}

/** A JSON object or a classic form post, like the legacy adapter; null when it cannot be read. */
async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const type = request.headers.get("content-type") ?? "";
    const parsed: unknown = type.includes("application/json") ? await request.json() : Object.fromEntries(await request.formData());
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * The visitor's IP for siteverify's optional `remoteip`: Cloudflare's header
 * when the zone proxies the request, else the one Vercel sets.
 */
function clientIp(request: Request): string | null {
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip");
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** "message is longer than 1000 characters" -> "Message is longer than 1000 characters." */
function sentence(text: string): string {
  const trimmed = text.trim().replace(/[.\s]+$/, "");
  return trimmed ? `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}.` : "";
}
