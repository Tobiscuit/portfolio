import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// T5: the Turnstile widget renders only when its site key is set. Next inlines
// NEXT_PUBLIC_TURNSTILE_SITE_KEY at build time; here the page reads it when
// the module loads, so each case sets the environment and imports it fresh.

async function renderContactPage(): Promise<string> {
  vi.resetModules();
  const { default: Contact } = await import("../app/(app)/contact/page");
  return renderToStaticMarkup(createElement(Contact));
}

describe("the contact page", () => {
  it("renders the form without a Turnstile widget when NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", undefined);
    const html = await renderContactPage();
    expect(html).toContain('name="_gotcha"');
    expect(html).toContain('name="message"');
    expect(html).not.toContain('id="turnstile-widget"');
  });

  it("renders the widget's container when the site key is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "1x00000000000000000000AA");
    const html = await renderContactPage();
    expect(html).toContain('id="turnstile-widget"');
  });
});
