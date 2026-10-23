import { linksOf } from "./kit-030/helpers";
import type { Client030, LinkKind } from "./kit-030/types";
import { warnOnce } from "./platform/reads";
import { describe } from "./seo";
import { GITHUB_URL, LINKEDIN_URL } from "./site";

/**
 * Where else to find him (spec 003 R5, domain-model gap G2). Two adapters,
 * chosen by the composition root (src/ports.ts). Pattern: Ports and adapters.
 *   - staticProfileLinks: GitHub and LinkedIn from lib/site.ts (the data
 *     module; kit 0.6.2 today).
 *   - engineProfileLinks: the owner's own links from the engine, spec 030's
 *     profile links read through linksOf() (W2), with the data module as
 *     the fallback when there are none or the call fails.
 */

export interface ProfileLink {
  kind: LinkKind | "email";
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

/** A link's words when the owner gave none ("other" always has a label). */
const KIND_LABELS: Record<LinkKind, string> = {
  website: "Website",
  github: "GitHub",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X",
  youtube: "YouTube",
  tiktok: "TikTok",
  google: "Google",
  yelp: "Yelp",
  nextdoor: "Nextdoor",
  houzz: "Houzz",
  npm: "npm",
  other: "Link",
};

const isHttps = (url: string) => {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
};

export function engineProfileLinks(client: Client030, fallback: ProfileLinksPort): ProfileLinksPort {
  return {
    async links() {
      try {
        const profile = await client.profile({ include: ["links"] });
        const links = linksOf(profile)
          .filter((link) => isHttps(link.url))
          .map((link) => ({ kind: link.kind, label: link.label ?? KIND_LABELS[link.kind] ?? "Link", href: link.url }));
        return links.length > 0 ? links : fallback.links();
      } catch (error) {
        warnOnce(`profile links: ${describe(error)}; using lib/site.ts`);
        return fallback.links();
      }
    },
  };
}
