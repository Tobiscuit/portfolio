import { describe, expect, it } from "vitest";

import { staticProfileLinks } from "../../lib/profile-links";
import { GITHUB_URL, LINKEDIN_URL } from "../../lib/site";

describe("the profile-links data module (the fallback; spec 003 W2)", () => {
  it("answers GitHub and LinkedIn from lib/site.ts", async () => {
    await expect(staticProfileLinks.links()).resolves.toEqual([
      { kind: "github", label: "GitHub", href: GITHUB_URL },
      { kind: "linkedin", label: "LinkedIn", href: LINKEDIN_URL },
    ]);
  });

  it("links only absolute https URLs", async () => {
    for (const link of await staticProfileLinks.links()) expect(link.href).toMatch(/^https:\/\//);
  });
});
