/**
 * Server-side Turnstile validation for the contact form. Adapted from
 * montano-btm's lib/turnstile.ts (develop), with this form's action.
 *
 * Cloudflare: the widget alone does not protect a form; the token must be
 * checked with Siteverify. Tokens are single-use, valid for 300 seconds and at
 * most 2,048 characters; the endpoint takes form-encoded or JSON bodies and
 * always answers JSON, with HTTP 400 for a missing or invalid secret.
 */

import { TURNSTILE_ACTION } from "./form";

export const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const MAX_TOKEN_LENGTH = 2048;

/** Error codes that mean the check itself could not run, not that the visitor failed it. */
const UNAVAILABLE_CODES = new Set(["missing-input-secret", "invalid-input-secret", "internal-error", "bad-request"]);

export type TurnstileResult =
  | { ok: true }
  | { ok: false; reason: "missing-token" }
  | { ok: false; reason: "rejected"; codes: string[] }
  | { ok: false; reason: "unavailable"; codes?: string[] };

export interface VerifyInput {
  token: unknown;
  secret: string;
  /** The visitor's IP, sent as `remoteip` when known. */
  remoteIp?: string | null;
  /** Lets a retried validation be recognised as the same one. */
  idempotencyKey?: string;
  fetch?: typeof globalThis.fetch;
  /** Cloudflare's own reference implementation uses 10 seconds. */
  timeoutMs?: number;
}

export async function verifyTurnstile({
  token,
  secret,
  remoteIp,
  idempotencyKey = crypto.randomUUID(),
  fetch = globalThis.fetch,
  timeoutMs = 10_000,
}: VerifyInput): Promise<TurnstileResult> {
  if (typeof token !== "string" || token === "" || token.length > MAX_TOKEN_LENGTH) {
    return { ok: false, reason: "missing-token" };
  }

  const body = new URLSearchParams({ secret, response: token, idempotency_key: idempotencyKey });
  if (remoteIp) body.set("remoteip", remoteIp);

  let outcome: { success?: unknown; action?: unknown; "error-codes"?: unknown };
  try {
    const response = await fetch(SITEVERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(timeoutMs) });
    // Parsed whatever the status: a bad secret answers 400 with a JSON body.
    outcome = (await response.json()) as typeof outcome;
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  const codes = Array.isArray(outcome["error-codes"]) ? outcome["error-codes"].map(String) : [];
  if (outcome.success === true) {
    if (outcome.action !== undefined && outcome.action !== TURNSTILE_ACTION) {
      return { ok: false, reason: "rejected", codes: ["action-mismatch"] };
    }
    return { ok: true };
  }
  if (codes.some((code) => UNAVAILABLE_CODES.has(code))) return { ok: false, reason: "unavailable", codes };
  return { ok: false, reason: "rejected", codes };
}
