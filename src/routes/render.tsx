import type { Context } from "hono";
import type { Child } from "hono/jsx";

import type { BusinessProfile } from "@jrcodex/seo-kit";

import { readProfile } from "../../lib/platform/reads";
import { profileLinks } from "../../lib/profile-links";
import { SITE_HOST } from "../../lib/site";
import type { AppEnv } from "../env";
import { Document, type Chrome, type PageMeta } from "../views/document";

/**
 * One page out: the document around the page's body, the footer's profile
 * and links read once, a doctype, and the status. Every route renders
 * through here (spec 003 section 2.3).
 */
export async function renderPage(
  c: Context<AppEnv>,
  meta: PageMeta,
  body: Child,
  opts: { status?: 200 | 400 | 404 | 429 | 500 | 503; scripts?: Chrome["scripts"]; inlineScript?: string } = {},
): Promise<Response> {
  const [profile, links] = await Promise.all([profileFor(c), profileLinks.links()]);
  const path = new URL(c.req.url).pathname;
  const doc = <Document meta={meta} chrome={{ path, profile, links, scripts: opts.scripts, inlineScript: opts.inlineScript }}>{body}</Document>;
  return c.html(`<!doctype html>${await doc.toString()}`, opts.status ?? 200);
}

/** Off the production host the engine's /cdn-cgi/image/ URLs answer nowhere: use the originals (plan section 3.1). */
export function wantsOriginals(c: Context<AppEnv>): boolean {
  return new URL(c.req.url).host !== SITE_HOST;
}

const profiles = new WeakMap<Request, Promise<BusinessProfile>>();

/** The engine's profile, read once per request however many parts of the page need it. */
export function profileFor(c: Context<AppEnv>): Promise<BusinessProfile> {
  let profile = profiles.get(c.req.raw);
  if (!profile) {
    profile = readProfile(c.env);
    profiles.set(c.req.raw, profile);
  }
  return profile;
}
