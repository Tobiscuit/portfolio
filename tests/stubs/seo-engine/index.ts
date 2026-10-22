import { WorkerEntrypoint } from "cloudflare:workers";

import { FIXTURE_POSTS, FIXTURE_PROFILE, FIXTURE_SITEMAP, FIXTURE_SUMMARIES, FIXTURE_VIDEOS, HERO_KEY, VIDEO_KEY } from "../../fixtures/engine";

/**
 * A stand-in for the engine's `Sites` entrypoint, for the smoke tests only.
 * Reads answer from tests/fixtures/engine.ts. Writes (announce, inquire) are
 * recorded in the stub's own local D1, where the tests read them back. A test
 * asks for a refusal with a marker in the message; the errors carry the names
 * and fields the real engine's do.
 */
interface StubEnv {
  CALLS: D1Database;
}

class InquiryRefused extends Error {
  constructor(
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "InquiryRefused";
  }
}

const TABLE = "CREATE TABLE IF NOT EXISTS calls (id INTEGER PRIMARY KEY AUTOINCREMENT, method TEXT NOT NULL, site_key TEXT, body TEXT NOT NULL)";

async function record(env: StubEnv, method: string, siteKey: unknown, body: unknown): Promise<void> {
  await env.CALLS.prepare(TABLE).run();
  await env.CALLS.prepare("INSERT INTO calls (method, site_key, body) VALUES (?, ?, ?)").bind(method, String(siteKey), JSON.stringify(body)).run();
}

export class Sites extends WorkerEntrypoint<StubEnv> {
  async posts(_siteKey: string, _query: { locale: string }) {
    return FIXTURE_SUMMARIES;
  }

  async post(_siteKey: string, query: { locale: string; slug: string }) {
    return FIXTURE_POSTS.find((post) => post.slug === query.slug) ?? null;
  }

  async sitemap(_siteKey: string) {
    return FIXTURE_SITEMAP;
  }

  async profile(_siteKey: string) {
    return FIXTURE_PROFILE;
  }

  async videos(_siteKey: string) {
    return FIXTURE_VIDEOS;
  }

  async media(_siteKey: string, key: string) {
    if (key === VIDEO_KEY) {
      return new Response("fixture video bytes", { headers: { "content-type": "video/mp4", "cache-control": "public, max-age=300", etag: '"video-1"', "accept-ranges": "bytes" } });
    }
    if (key === HERO_KEY) {
      return new Response("fixture image bytes", { headers: { "content-type": "image/webp", "cache-control": "public, max-age=31536000, immutable", etag: '"hero-1"' } });
    }
    return null;
  }

  async announce(siteKey: string, manifest: unknown) {
    await record(this.env, "announce", siteKey, manifest);
    return { changed: true, manifest, unrecognized: [] };
  }

  async inquire(siteKey: string, submission: { fields: Record<string, unknown> }) {
    const message = String(submission.fields.message ?? "");
    if (message.includes("[stub:rate-limit]")) throw new InquiryRefused("too many inquiries just now", 37);
    if (message.includes("[stub:refuse]")) throw new InquiryRefused("message looks like spam");
    await record(this.env, "inquire", siteKey, submission);
    return { id: "inq_stub", receivedAt: new Date().toISOString() };
  }
}

export default {
  async fetch(): Promise<Response> {
    return new Response("the stub engine has no public door", { status: 404 });
  },
} satisfies ExportedHandler<StubEnv>;
