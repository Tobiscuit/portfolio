import { Hono, type Context } from "hono";

import { HONEYPOT_FIELD, LIMITS, TURNSTILE_ACTION } from "../../lib/inquiry/form";
import { handleInquiry, type Fields, type InquiryOutcome } from "../../lib/inquiry/handle";
import { platformClient } from "../../lib/platform/reads";
import { profileLinks } from "../../lib/profile-links";
import { HTMX_SRC, TURNSTILE_SRC } from "../assets";
import type { AppEnv } from "../env";
import { Section, SectionHeader, Shell } from "../views/ui";
import { profileFor, renderPage } from "./render";

/**
 * The contact page (spec 003 section 5; tasks T4/T7). One route, two ways in:
 *
 *   with JavaScript   htmx 4 posts the form and swaps the answer's fragment
 *                     into #form-status (htmx 4 swaps error statuses too)
 *   without           the browser posts the form and gets the whole page back,
 *                     the answer in the same place and the fields kept
 *
 * Either way lib/inquiry/handle.ts decides: Turnstile, the write host, then
 * the engine's inquire(). htmx and Turnstile load on this page only.
 */
export const contact = new Hono<AppEnv>();

/** After each htmx answer: a fresh Turnstile token (tokens are single-use), and an empty form after a success. */
const AFTER_REQUEST = `document.addEventListener('htmx:after:request',function(e){var f=document.getElementById('contact-form');if(!f||e.target!==f)return;try{if(window.turnstile)window.turnstile.reset()}catch(_){}var c=e.detail&&e.detail.ctx;if(c&&c.response&&c.response.status===200)f.reset();});`;

contact.get("/contact", (c) => contactPage(c));

contact.post("/contact", async (c) => {
  const outcome = await handleInquiry(c.req.raw, { env: c.env, contactEmail: (await profileFor(c)).email ?? undefined });
  const headers: Record<string, string> = {};
  if (!outcome.ok && outcome.retryAfterSeconds) headers["retry-after"] = String(outcome.retryAfterSeconds);
  if (c.req.header("hx-request") === "true") {
    const fragment = await (<FormStatus outcome={outcome} />).toString();
    return c.html(fragment, outcome.status, headers);
  }
  const response = await contactPage(c, outcome);
  for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
  return response;
});

async function contactPage(c: Context<AppEnv>, outcome?: InquiryOutcome): Promise<Response> {
  const [profile, links] = await Promise.all([profileFor(c), profileLinks.links()]);
  const siteKey = c.env.TURNSTILE_SITE_KEY;
  const ready = Boolean(siteKey && c.env.TURNSTILE_SECRET_KEY && platformClient(c.env));
  const kept: Fields | undefined = outcome && !outcome.ok ? outcome.fields : undefined;
  const linkedin = links.find((link) => link.kind === "linkedin");
  return renderPage(
    c,
    { title: "Contact", description: "Hiring for a software engineering role, or want to talk about something I built? Send me a note.", path: "/contact" },
    <Section>
      <Shell>
        <div class="contact-layout">
          <div class="stack">
            <SectionHeader as="h1" eyebrow="Contact" title="Get in touch" lede="Hiring for a software engineering role, or want to talk about something I built? I read every message and answer within a few days." />
            <div class="contact-channels">
              {profile.email ? (
                <a class="contact-channel" href={`mailto:${profile.email}`}>
                  {profile.email}
                </a>
              ) : null}
              {linkedin ? (
                <a class="contact-channel" href={linkedin.href} rel="me noopener">
                  LinkedIn
                </a>
              ) : null}
            </div>
          </div>
          <div class="contact-form-panel">
            {ready ? (
              <form
                id="contact-form"
                class="form-stack"
                action="/contact"
                method="post"
                hx-post="/contact"
                hx-target="#form-status"
                hx-swap="innerHTML"
                hx-disable="find button[type=submit]"
              >
                <div class="field">
                  <label class="field__label" for="name">
                    Name
                  </label>
                  <input class="field__input" id="name" name="name" type="text" autocomplete="name" required maxlength={LIMITS.name} value={kept?.name} />
                </div>
                <div class="field">
                  <label class="field__label" for="email">
                    Email
                  </label>
                  <input class="field__input" id="email" name="email" type="email" autocomplete="email" required maxlength={LIMITS.email} value={kept?.email} />
                </div>
                <div class="field">
                  <label class="field__label" for="message">
                    Message
                  </label>
                  <textarea class="field__textarea" id="message" name="message" required maxlength={LIMITS.message} rows={6}>
                    {kept?.message ?? ""}
                  </textarea>
                </div>
                <div class="hp" aria-hidden="true">
                  <label>
                    Leave this empty
                    <input type="text" name={HONEYPOT_FIELD} tabindex={-1} autocomplete="off" />
                  </label>
                </div>
                <div class="cf-turnstile turnstile-slot" data-sitekey={siteKey} data-action={TURNSTILE_ACTION} data-theme="auto" data-size="flexible" />
                <button type="submit" class="btn btn--primary">
                  Send
                </button>
                <div id="form-status" role="status" aria-live="polite">
                  {outcome ? <FormStatus outcome={outcome} /> : null}
                </div>
              </form>
            ) : (
              <div class="stack">
                <h2>Write to me</h2>
                <p>
                  The form is not connected yet. Please e-mail me at <a href={`mailto:${profile.email}`}>{profile.email}</a>.
                </p>
              </div>
            )}
          </div>
        </div>
      </Shell>
    </Section>,
    {
      status: outcome?.status ?? 200,
      scripts: ready
        ? [
            { src: HTMX_SRC, defer: true },
            { src: TURNSTILE_SRC, async: true, defer: true },
          ]
        : [],
      inlineScript: ready ? AFTER_REQUEST : undefined,
    },
  );
}

export function FormStatus({ outcome }: { outcome: InquiryOutcome }) {
  return <p class={outcome.ok ? "form-status form-status--success" : "form-status form-status--error"}>{outcome.message}</p>;
}
