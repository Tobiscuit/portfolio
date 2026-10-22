import type { BusinessProfile, Project, ProjectPhoto, ProjectSummary } from "@jrcodex/seo-kit";

/**
 * TEMPORARY: the kit 0.8.0 shapes this site codes against, typed by hand from
 * seo-engine spec 030 at commit 9060ece (PR #16, branch 030-content-models),
 * specs/030-content-models/spec.md, "What the site gets (kit 0.8.0,
 * additive)" and "Profile links".
 *
 * REPLACE with `import type { ... } from "@jrcodex/seo-kit"` when 0.8.0 is
 * published (tasks W1/W2), and delete this file and ./helpers.ts. Until then
 * the site runs on kit 0.6.2, whose client cannot send `include`, so the
 * composition root (src/app.tsx) picks the data-module adapters.
 */

export type FieldType = "text" | "longText" | "number" | "date" | "choice" | "flag" | "link" | "list";
export interface LinkValue {
  url: string;
  label?: string;
}
export interface EntryValue {
  text: string;
  note: string;
}
/** text, longText, date and choice (the option's key): string. list: string[] (text, choice keys), LinkValue[] or EntryValue[]. */
export type FieldValue = string | number | boolean | LinkValue | string[] | LinkValue[] | EntryValue[];

export type ProjectSummary030 = ProjectSummary & {
  /** The business's own public fields, in its model's order. Absent from an older engine and while the business has no valid model. */
  fields?: Record<string, FieldValue>;
};
export type ProjectPhoto030 = ProjectPhoto & { roleKey?: string };
export type Project030 = Project & { fields?: Record<string, FieldValue>; photos: ProjectPhoto030[] };

export type LinkKind = "website" | "github" | "linkedin" | "instagram" | "facebook" | "x" | "youtube" | "tiktok" | "google" | "yelp" | "nextdoor" | "houzz" | "npm" | "other";
export interface EngineProfileLink {
  kind: LinkKind;
  url: string;
  /** Required for "other". */
  label?: string;
}
export type BusinessProfile030 = BusinessProfile & {
  links?: EngineProfileLink[];
  fields?: Record<string, FieldValue>;
};

export interface FieldView {
  key: string;
  type: FieldType;
  label: string;
  help?: string;
  precision?: "month" | "day";
  item?: "text" | "link" | "choice" | "entry";
  options?: { key: string; label: string }[];
  entry?: { text: string; note: string };
}
export interface ModuleView {
  fields: FieldView[];
}
export interface ContentModelView {
  version: number;
  locale: string;
  projects: ModuleView & { category: string; roles: { key: string; label: string }[]; pair?: { first: string; second: string; label: string } };
  profile: ModuleView;
}

/** Rendering data, not markup. `html` is `text`, HTML-escaped, nothing added. */
export interface FieldDisplay {
  key: string;
  label: string;
  type: FieldType;
  value: FieldValue;
  text: string;
  html: string;
}

export type Include = "fields" | "roles";

/** The part of the 0.8.0 client the adapters use. */
export interface Client030 {
  contentModel(locale: string): Promise<ContentModelView | null>;
  projects(locale: string, opts?: { include?: Include[] }): Promise<ProjectSummary030[]>;
  project(locale: string, slug: string, opts?: { include?: Include[] }): Promise<Project030 | null>;
  profile(opts?: { include?: ("links" | "fields")[] }): Promise<BusinessProfile030>;
}

/** True for a kit client that can ask for spec 030's data (0.8.0 adds contentModel); kit 0.6.2's cannot. */
export function supports030(client: unknown): client is Client030 {
  return typeof client === "object" && client !== null && typeof (client as { contentModel?: unknown }).contentModel === "function";
}
