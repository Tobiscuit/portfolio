/**
 * Send email through Amazon SES v2 with no dependencies.
 *
 * Runs unchanged on Node 18+ and on Cloudflare Workers: it uses only fetch and
 * WebCrypto, both of which are standard in each. That is the point - an email
 * sender is a small, stable problem, and the alternative (@aws-sdk/client-sesv2)
 * pulls in hundreds of transitive packages to do this much. SigV4 has not
 * changed since 2012.
 *
 * Usage:
 *   const ses = createSes({
 *     accessKeyId: env.AWS_ACCESS_KEY_ID,
 *     secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
 *   });
 *   await ses.send({
 *     from: "Juan Ramirez <hello@jrcodex.dev>",
 *     to: ["someone@example.com"],
 *     subject: "Thanks for getting in touch",
 *     text: "I'll reply within a day.",
 *     configurationSet: "send-jrcodex",
 *   });
 */

export interface SesCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  /** Present only for temporary (STS) credentials. */
  sessionToken?: string;
  region?: string;
}

export interface SendOptions {
  /** "Name <address@domain>" or a bare address. The domain must be a verified SES identity. */
  from: string;
  to: string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string[];
  cc?: string[];
  bcc?: string[];
  /**
   * The SES configuration set. Always pass one: it is what attributes bounces
   * and complaints to a single sending domain instead of pooling every domain's
   * reputation together, and what makes a per-domain kill switch possible.
   */
  configurationSet?: string;
  /**
   * Marketing mail only. Google, Yahoo and Apple require one-click unsubscribe
   * (RFC 8058) for bulk senders and reject non-compliant mail outright. Purely
   * transactional mail must NOT set this.
   */
  unsubscribeUrl?: string;
}

export interface SendResult {
  messageId: string;
}

const enc = new TextEncoder();

async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === "string" ? enc.encode(data) : data;
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return hex(digest);
}

function hex(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(key: BufferSource, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message) as BufferSource);
}

/** AWS4 signing key: a chain of HMACs over date, region, service, terminator. */
async function signingKey(
  secret: string,
  date: string,
  region: string,
  service: string,
): Promise<ArrayBuffer> {
  let k: BufferSource = enc.encode(`AWS4${secret}`);
  for (const part of [date, region, service, "aws4_request"]) k = await hmac(k, part);
  return k as ArrayBuffer;
}

export function createSes(creds: SesCredentials) {
  const region = creds.region ?? "us-east-1";
  const service = "ses";
  const host = `email.${region}.amazonaws.com`;
  const path = "/v2/email/outbound-emails";

  async function send(opts: SendOptions): Promise<SendResult> {
    if (!opts.to?.length) throw new Error("ses: at least one recipient is required");
    if (opts.unsubscribeUrl && !/^https:\/\//.test(opts.unsubscribeUrl)) {
      throw new Error("ses: unsubscribeUrl must be https - one-click unsubscribe POSTs to it");
    }

    const headers: Record<string, string> = {};
    if (opts.unsubscribeUrl) {
      // Both headers are required together: List-Unsubscribe alone is the old
      // mailto-style hint, and only List-Unsubscribe-Post declares that the URL
      // accepts the one-click POST that Gmail and Yahoo actually require.
      headers["List-Unsubscribe"] = `<${opts.unsubscribeUrl}>`;
      headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
    }

    const payload: Record<string, unknown> = {
      FromEmailAddress: opts.from,
      Destination: {
        ToAddresses: opts.to,
        ...(opts.cc?.length ? { CcAddresses: opts.cc } : {}),
        ...(opts.bcc?.length ? { BccAddresses: opts.bcc } : {}),
      },
      ...(opts.replyTo?.length ? { ReplyToAddresses: opts.replyTo } : {}),
      ...(opts.configurationSet ? { ConfigurationSetName: opts.configurationSet } : {}),
      Content: {
        Simple: {
          Subject: { Data: opts.subject, Charset: "UTF-8" },
          Body: {
            Text: { Data: opts.text, Charset: "UTF-8" },
            ...(opts.html ? { Html: { Data: opts.html, Charset: "UTF-8" } } : {}),
          },
          ...(Object.keys(headers).length
            ? { Headers: Object.entries(headers).map(([Name, Value]) => ({ Name, Value })) }
            : {}),
        },
      },
    };

    const body = JSON.stringify(payload);
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ""); // 20260910T150405Z
    const date = amzDate.slice(0, 8);
    const payloadHash = await sha256Hex(body);

    // Signed headers must be lower-case and sorted. host and x-amz-date are the
    // minimum; the security token is signed too when using STS credentials.
    const signed: Record<string, string> = {
      "content-type": "application/json",
      host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      ...(creds.sessionToken ? { "x-amz-security-token": creds.sessionToken } : {}),
    };
    const names = Object.keys(signed).sort();
    const canonicalHeaders = names.map((n) => `${n}:${signed[n].trim()}\n`).join("");
    const signedHeaders = names.join(";");

    const canonicalRequest = [
      "POST",
      path,
      "", // no query string
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const scope = `${date}/${region}/${service}/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      scope,
      await sha256Hex(canonicalRequest),
    ].join("\n");

    const key = await signingKey(creds.secretAccessKey, date, region, service);
    const signature = hex(await hmac(key, stringToSign));

    const res = await fetch(`https://${host}${path}`, {
      method: "POST",
      headers: {
        ...signed,
        Authorization:
          `AWS4-HMAC-SHA256 Credential=${creds.accessKeyId}/${scope}, ` +
          `SignedHeaders=${signedHeaders}, Signature=${signature}`,
      },
      body,
    });

    const responseText = await res.text();
    if (!res.ok) {
      // SES returns a JSON body with a message; surface it rather than a bare status.
      let detail = responseText.slice(0, 400);
      try {
        const parsed = JSON.parse(responseText);
        detail = parsed.message ?? parsed.Message ?? detail;
      } catch { /* keep the raw text */ }
      throw new Error(`ses: ${res.status} ${detail}`);
    }
    return { messageId: JSON.parse(responseText).MessageId };
  }

  return { send };
}
