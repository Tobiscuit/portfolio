import type { ContentModelView, Project030, ProjectSummary030 } from "../../lib/kit-030/types";

/**
 * Spec 030 answers (kit 0.8.0 shapes) for the adapter tests: the case-study
 * preset's public fields (seo-engine 9060ece, content-models/presets/
 * case-study.json) as a ContentModelView, and projects carrying them.
 * Fictional where it is not the site's own public facts.
 */
export const CASE_STUDY_VIEW: ContentModelView = {
  version: 1,
  locale: "en",
  projects: {
    category: "kind",
    roles: [
      { key: "screen", label: "Screenshot" },
      { key: "diagram", label: "Diagram" },
    ],
    fields: [
      { key: "name", type: "text", label: "Name" },
      {
        key: "kind",
        type: "choice",
        label: "Kind",
        options: [
          { key: "product", label: "Product" },
          { key: "platform", label: "Platform" },
          { key: "open-source", label: "Open source" },
          { key: "client", label: "Client work" },
          { key: "tooling", label: "Tooling" },
          { key: "earlier", label: "Earlier work" },
        ],
      },
      {
        key: "status",
        type: "choice",
        label: "Status",
        options: [
          { key: "live", label: "Live" },
          { key: "built", label: "Built" },
          { key: "in-progress", label: "In progress" },
          { key: "archived", label: "Archived" },
        ],
      },
      { key: "role", type: "text", label: "Role" },
      { key: "since", type: "date", label: "Started", precision: "month" },
      { key: "stack", type: "list", item: "text", label: "Stack" },
      { key: "repo", type: "link", label: "Code" },
      { key: "live", type: "link", label: "Live site" },
      { key: "outcomes", type: "list", item: "entry", label: "Numbers", entry: { text: "The number", note: "Where it comes from" } },
      { key: "featured", type: "flag", label: "Featured" },
    ],
  },
  profile: { fields: [] },
};

const base = {
  locale: "en",
  service: "",
  locality: "",
  city: "",
  completedOn: null,
  publishedAt: "2026-10-22T00:00:00.000Z",
  cover: null,
  photoCount: 0,
  hasBeforeAfter: false,
  alternates: [],
};

export const ENGINE_PROJECTS: ProjectSummary030[] = [
  {
    ...base,
    slug: "proprietor-mail",
    path: "/work/proprietor-mail",
    title: "proprietor-mail",
    summary: "An inbox the operator cannot read at rest.",
    fields: {
      name: "proprietor-mail",
      kind: "open-source",
      status: "built",
      role: "Designed and built it",
      since: "2026-10",
      stack: ["TypeScript", "Durable Objects"],
      repo: { url: "https://github.com/Tobiscuit/proprietor-mail", label: "Source on GitHub" },
      outcomes: [{ text: "Apache-2.0", note: "gh api repos/Tobiscuit/proprietor-mail" }],
      featured: true,
    },
  },
  {
    ...base,
    slug: "montanobtm",
    path: "/work/montanobtm",
    title: "montanobtm.com",
    summary: "A contractor's site on the platform.",
    fields: { name: "montanobtm.com", kind: "client", status: "live", live: { url: "https://montanobtm.com", label: "montanobtm.com" }, featured: false },
  },
  {
    ...base,
    slug: "granite-site",
    path: "/work/granite-site",
    title: "A granite shop's site",
    summary: "Built, not launched.",
    // The owner typed "live": the content rule says only montanobtm.com may be called live.
    fields: { name: "A granite shop's site", kind: "client", status: "live", live: { url: "https://granite.example.com" } },
  },
  {
    ...base,
    slug: "old-thing",
    path: "/work/old-thing",
    title: "Old thing",
    summary: "An earlier project.",
    fields: { name: "Old thing", kind: "earlier", status: "archived", role: "<script>alert(1)</script> & co" },
  },
];

export const ENGINE_PROJECT: Project030 = {
  ...(ENGINE_PROJECTS[0] as ProjectSummary030),
  bodyHtml: "<h2>What it is</h2><p>An inbox.</p>",
  photos: [],
};
