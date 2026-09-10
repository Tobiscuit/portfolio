/**
 * Contact-form handler for jrcodex.dev.
 *
 * Two messages per submission, and the ORDER matters:
 *   1. the notification to me, so the enquiry is not lost
 *   2. the acknowledgement to the sender, so they know it arrived
 *
 * If (1) fails, (2) is never sent. Telling someone "got it, I'll reply" when
 * the enquiry actually vanished is worse than showing them an error - they
 * would sit and wait instead of trying another channel.
 *
 * Zero dependencies, like ./ses.ts - runs on Node 18+ and on Workers.
 */

import { createSes, type SesCredentials } from "./ses";

export interface ContactConfig {
  /** Verified SES identity to send as, e.g. 'jrcodex.dev <hello@jrcodex.dev>'. */
  from: string;
  /** Where enquiries land. */
  owner: string;
  /** Configuration set carrying suppression + reputation metrics. */
  configurationSet?: string;
  /** Shown in the acknowledgement so the reply is recognisable. */
  siteName?: string;
  /** Name signed at the bottom of the acknowledgement. */
  signature?: string;
  credentials: SesCredentials;
}

export interface ContactSubmission {
  name?: unknown;
  email?: unknown;
  message?: unknown;
  /**
   * Honeypot: a field hidden from humans by CSS that naive bots fill anyway.
   * Non-empty means discard - and we return success, because telling a bot it
   * was detected only teaches whoever wrote it to stop filling the field.
   */
  _gotcha?: unknown;
}

export type ContactOutcome =
  | { ok: true; discarded?: true }
  | { ok: false; status: number; error: string };

const LIMITS = { name: 100, email: 254, message: 5000 } as const;

/**
 * Deliberately permissive. Strict RFC 5322 validation rejects addresses that
 * work, and the real check is whether SES can deliver to it - which the
 * suppression list already records for us.
 */
const EMAIL = /^[^\s@,;]+@[^\s@,;.]+\.[^\s@,;]+$/;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Collapse control characters to spaces. A bare CR or LF in a value that ends
 * up in a header - a name inside Reply-To, or the subject line - is how header
 * injection works, so it is stripped at the boundary rather than trusted.
 */
function clean(v: string): string {
  return v.replace(/[\u0000-\u001F\u007F]+/g, " ").trim();
}

/**
 * Format `Display Name <addr>` safely.
 *
 * The display name goes in an RFC 5322 quoted-string, because a name is
 * arbitrary visitor input and an unquoted `<` or `>` in it produces a malformed
 * address that SES rejects outright - losing the whole enquiry over a character
 * in someone's name. Inside a quoted-string only `"` and `\` need escaping,
 * and control characters are already stripped by clean().
 */
function formatAddress(name: string, email: string): string {
  const quoted = name.replace(/[\\"]/g, (c) => `\\${c}`);
  return `"${quoted}" <${email}>`;
}

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function validate(
  body: ContactSubmission,
): { ok: true; name: string; email: string; message: string } | { ok: false; error: string } {
  const name = clean(str(body.name));
  const email = clean(str(body.email)).toLowerCase();
  const message = str(body.message);

  if (!name) return { ok: false, error: "Please enter your name." };
  if (name.length > LIMITS.name) return { ok: false, error: "That name is too long." };
  if (!email) return { ok: false, error: "Please enter your email address." };
  if (email.length > LIMITS.email || !EMAIL.test(email)) {
    return { ok: false, error: "That email address does not look right." };
  }
  if (!message) return { ok: false, error: "Please enter a message." };
  if (message.length > LIMITS.message) {
    return { ok: false, error: `Please keep the message under ${LIMITS.message} characters.` };
  }
  return { ok: true, name, email, message };
}

export function createContactHandler(config: ContactConfig) {
  const ses = createSes(config.credentials);
  const site = config.siteName ?? "jrcodex.dev";
  const signature = config.signature ?? "Juan";

  /**
   * Send, and if a configuration set was requested but the send fails, try
   * once more without it.
   *
   * A credential that may send as an identity does not necessarily have
   * permission to use a named configuration set - those are separate resources
   * in an IAM policy. Passing one the caller cannot use turns a working send
   * into AccessDenied, which would mean a visitor's enquiry is lost over a
   * telemetry setting. Suppression and per-domain reputation are worth having,
   * but not worth dropping mail for; losing them is logged loudly instead.
   */
  async function sendWithFallback(opts: Parameters<typeof ses.send>[0]) {
    try {
      return await ses.send(opts);
    } catch (err) {
      if (!opts.configurationSet) throw err;
      console.error(
        `contact: send failed with configuration set ${opts.configurationSet}; ` +
          "retrying without it. Suppression and reputation tracking are NOT " +
          "being applied to this message - check that the sending credential " +
          "is permitted on that configuration set.",
        err,
      );
      const { configurationSet: _dropped, ...rest } = opts;
      return await ses.send(rest);
    }
  }

  return async function handle(body: ContactSubmission): Promise<ContactOutcome> {
    if (str(body._gotcha)) return { ok: true, discarded: true };

    const v = validate(body);
    if (!v.ok) return { ok: false, status: 400, error: v.error };
    const { name, email, message } = v;

    // 1. The enquiry. Reply-To is the sender, so hitting reply in my mail
    //    client goes to them and not to my own send-only address.
    try {
      await sendWithFallback({
        from: config.from,
        to: [config.owner],
        replyTo: [formatAddress(name, email)],
        subject: `${site}: enquiry from ${name}`,
        text: `From: ${name} <${email}>\n\n${message}\n`,
        html:
          `<p><strong>${escapeHtml(name)}</strong> &lt;${escapeHtml(email)}&gt;</p>` +
          `<p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
        configurationSet: config.configurationSet,
      });
    } catch (err) {
      // The real reason goes to the logs; the visitor gets something they can
      // actually act on instead of an AWS error string.
      console.error("contact: owner notification failed", err);
      return {
        ok: false,
        status: 502,
        error: `Sorry - the message could not be sent. Please email ${config.owner} directly.`,
      };
    }

    // 2. The acknowledgement. Best effort: the enquiry is already safe, so a
    //    failure here must not turn a delivered message into a visible error.
    try {
      await sendWithFallback({
        from: config.from,
        to: [email],
        replyTo: [config.owner],
        subject: "Thanks - I got your message",
        text:
          `Hi ${name},\n\n` +
          `Thanks for getting in touch through ${site}. I have your message and ` +
          `I will reply personally, usually within a couple of days.\n\n` +
          `For reference, this is what you sent:\n\n${message}\n\n` +
          `- ${signature}\n`,
        html:
          `<p>Hi ${escapeHtml(name)},</p>` +
          `<p>Thanks for getting in touch through ${escapeHtml(site)}. I have your ` +
          `message and I will reply personally, usually within a couple of days.</p>` +
          `<p>For reference, this is what you sent:</p>` +
          `<blockquote style="white-space:pre-wrap;border-left:3px solid #2f7d6b;` +
          `padding-left:12px;margin-left:0;color:#555">${escapeHtml(message)}</blockquote>` +
          `<p>&ndash; ${escapeHtml(signature)}</p>`,
        configurationSet: config.configurationSet,
      });
    } catch (err) {
      console.error("contact: acknowledgement failed (enquiry was delivered)", err);
    }

    return { ok: true };
  };
}
