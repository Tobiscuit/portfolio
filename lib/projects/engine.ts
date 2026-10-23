import { displayFields } from "../kit-030/helpers";
import type { Client030, ContentModelView, FieldValue, FieldView, Include, LinkValue, ProjectSummary030 } from "../kit-030/types";
import { describe } from "../seo";
import { warnOnce } from "../platform/reads";
import { isAllowedLive, PROJECT_KINDS, PROJECT_STATUSES, type ProjectCard, type ProjectKind, type ProjectLink, type ProjectPage, type ProjectsPort, type ProjectStatus } from "./port";

/**
 * The ProjectsPort's engine adapter (spec 003 W1): the owner's projects from
 * the engine, in the shape of seo-engine spec 030's case-study preset
 * (9060ece: name, kind, status, role, since, stack, repo, live, outcomes,
 * featured; clientName is never sent). Pattern: Adapter, with the data module
 * as its fallback (a Null-Object-like stand-in) whenever the engine cannot
 * serve the includes: no content model, an older engine, a failed call.
 *
 * The content rule holds on engine data too: only montanobtm.com may be
 * called live. Any other "live" is shown as built and its live link dropped.
 */

const INCLUDE: Include[] = ["fields", "roles"];
const LOCALE = "en";

/** Fields the card already shows; the rest of the public fields go to the page's details. */
const ON_THE_CARD = new Set(["name", "kind", "status", "role", "stack", "repo", "live", "outcomes", "featured"]);

const isString = (value: unknown): value is string => typeof value === "string";
const isLink = (value: unknown): value is LinkValue => typeof value === "object" && value !== null && typeof (value as LinkValue).url === "string";
const isHttps = (url: string) => {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
};
const onSite = (path: unknown): path is string => isString(path) && path.startsWith("/") && !path.startsWith("//");

function field(view: ContentModelView, key: string): FieldView | undefined {
  return view.projects.fields.find((f) => f.key === key);
}

function optionLabel(view: ContentModelView, key: string, option: string): string | undefined {
  return field(view, key)?.options?.find((o) => o.key === option)?.label;
}

function link(view: ContentModelView, key: "repo" | "live", value: FieldValue | undefined, kind: ProjectLink["kind"]): ProjectLink | null {
  if (!isLink(value) || !isHttps(value.url)) return null;
  return { label: value.label ?? field(view, key)?.label ?? key, href: value.url, kind };
}

/** One summary as a card, or null when it lacks what a card needs. */
export function toCard(summary: ProjectSummary030, view: ContentModelView): ProjectCard | null {
  const f = summary.fields;
  if (!f || !isString(f.kind) || !isString(f.status) || !onSite(summary.path)) return null;
  if (!(PROJECT_KINDS as readonly string[]).includes(f.kind) || !(PROJECT_STATUSES as readonly string[]).includes(f.status)) return null;

  const repo = link(view, "repo", f.repo, "repo");
  const liveLink = isLink(f.live) && isAllowedLive(f.live.url) ? link(view, "live", f.live, "live") : null;
  let status = f.status as ProjectStatus;
  if (status === "live" && !liveLink) {
    warnOnce(`projects: "${summary.slug}" says live without an allow-listed live link; shown as built`);
    status = "built";
  }
  const outcomes = Array.isArray(f.outcomes) ? (f.outcomes as unknown[]).filter((o): o is { text: string; note: string } => typeof o === "object" && o !== null && isString((o as { text?: unknown }).text) && isString((o as { note?: unknown }).note)) : [];

  return {
    slug: summary.slug,
    title: isString(f.name) && f.name.trim() !== "" ? f.name : summary.title,
    summary: summary.summary,
    status,
    statusLabel: optionLabel(view, "status", status),
    kind: f.kind as ProjectKind,
    kindLabel: optionLabel(view, "kind", f.kind),
    role: isString(f.role) && f.role.trim() !== "" ? f.role : null,
    stack: Array.isArray(f.stack) ? (f.stack as unknown[]).filter(isString) : [],
    highlights: [],
    facts: outcomes.map((o) => ({ value: o.text, label: "", source: o.note })),
    links: [repo, liveLink].filter((l): l is ProjectLink => l !== null),
    featured: f.featured === true,
    path: summary.path,
  };
}

export function engineProjects(client: Client030, fallback: ProjectsPort): ProjectsPort {
  return {
    async list() {
      try {
        const [view, items] = await Promise.all([client.contentModel(LOCALE), client.projects(LOCALE, { include: INCLUDE })]);
        if (view === null) {
          warnOnce("projects: the business has no content model; showing the site's own list");
          return fallback.list();
        }
        const cards = items.map((item) => toCard(item, view));
        const kept = cards.filter((card): card is ProjectCard => card !== null);
        if (kept.length < cards.length) warnOnce(`projects: skipped ${cards.length - kept.length} without the case-study fields`);
        return kept;
      } catch (error) {
        warnOnce(`projects: ${describe(error)}; showing the site's own list`);
        return fallback.list();
      }
    },

    async get(slug: string): Promise<ProjectPage | null> {
      try {
        const [view, project] = await Promise.all([client.contentModel(LOCALE), client.project(LOCALE, slug, { include: INCLUDE })]);
        if (view === null) return fallback.get(slug);
        if (project === null) return null;
        const card = toCard(project, view);
        if (card === null) return null;
        const details = displayFields(project.fields, view.projects)
          .filter((shown) => !ON_THE_CARD.has(shown.key))
          .map((shown) => ({ label: shown.label, text: shown.text }));
        return { ...card, bodyHtml: project.bodyHtml, updatedAt: project.publishedAt, details };
      } catch (error) {
        warnOnce(`project ${slug}: ${describe(error)}; using the site's own`);
        return fallback.get(slug);
      }
    },
  };
}
