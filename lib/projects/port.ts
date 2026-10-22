/**
 * The projects port (spec 003, plan section 2.1, domain-model section 3).
 *
 * Pattern: Ports and adapters. /work and the home page depend on this
 * interface only. Today the placeholder adapter answers (static summaries in
 * content/work.ts); when engine spec 030 forwards its content-model shapes
 * (a fixed project core with per-business extension fields), an engine
 * adapter maps them onto these types and replaces it in lib/projects/index.ts
 * without touching a page (tasks W1).
 *
 * These names are the site's own, deliberately: the engine's "projects" are a
 * trade owner's job write-ups (spec 015), this site's are software work
 * (domain-model gap G1). The mapping lives in the adapter.
 */

/** Never "production" (content rules). `live` only with an allow-listed live link. */
export const PROJECT_STATUSES = ["live", "built", "in-progress"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** Grouping on /work. */
export const PROJECT_KINDS = ["product", "open-source", "platform", "tooling", "client"] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];

/** The only URLs a card may call live (content rule: only montanobtm.com is live among client work). */
export const LIVE_URLS: readonly string[] = ["https://montanobtm.com/"];

export interface ProjectLink {
  label: string;
  href: string;
  /** `repo` only for public repositories. */
  kind: "repo" | "live" | "write-up";
}

/** A number on the page, with where it came from (content rule: nothing invented). */
export interface ProjectFact {
  value: string;
  label: string;
  /** The command or file it came from, and when. Not rendered as a claim; kept for review. */
  source: string;
}

export interface ProjectCard {
  /** kebab-case, unique */
  slug: string;
  title: string;
  /** One or two sentences: the card text. */
  summary: string;
  status: ProjectStatus;
  kind: ProjectKind;
  /** "Designed and built it", "Sole engineer". */
  role: string | null;
  /** Chips. */
  stack: string[];
  /** Short points: what was hard, what I did. */
  highlights: string[];
  facts: ProjectFact[];
  links: ProjectLink[];
  /** "/work/<slug>" when a page exists; null for a summary-only card. */
  path: string | null;
}

export interface ProjectPage extends ProjectCard {
  /** Sanitised by the engine. */
  bodyHtml: string;
  /** ISO 8601. */
  updatedAt: string;
}

export interface ProjectsPort {
  /** In display order. */
  list(): Promise<ProjectCard[]>;
  /** null when there is no page for that slug: a 404. */
  get(slug: string): Promise<ProjectPage | null>;
}
