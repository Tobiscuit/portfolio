import { GITHUB_URL, LINKEDIN_URL } from "./site";

/**
 * Where else to find him (spec 003 R5, domain-model gap G2). The engine's
 * BusinessProfile has no GitHub or LinkedIn field; engine spec 030 adds
 * profile links. Until then the static adapter answers from lib/site.ts, and
 * the engine adapter replaces it here (tasks W2). Pattern: Ports and adapters.
 */

export interface ProfileLink {
  kind: "github" | "linkedin" | "email" | "other";
  label: string;
  /** Absolute https URL. */
  href: string;
}

export interface ProfileLinksPort {
  links(): Promise<ProfileLink[]>;
}

export const staticProfileLinks: ProfileLinksPort = {
  async links() {
    return [
      { kind: "github", label: "GitHub", href: GITHUB_URL },
      { kind: "linkedin", label: "LinkedIn", href: LINKEDIN_URL },
    ];
  },
};

export const profileLinks: ProfileLinksPort = staticProfileLinks;
