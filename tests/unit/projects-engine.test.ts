import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Client030 } from "../../lib/kit-030/types";
import { engineProjects } from "../../lib/projects/engine";
import { placeholderProjects } from "../../lib/projects/placeholder";
import { CASE_STUDY_VIEW, ENGINE_PROJECT, ENGINE_PROJECTS } from "../fixtures/engine-030";

/**
 * The ProjectsPort's engine adapter (spec 003 W1, against seo-engine spec 030
 * at 9060ece): case-study fields onto the work pages, the content rule on
 * engine data, and the data module as the fallback.
 */
function client(overrides: Partial<Record<keyof Client030, unknown>> = {}): Client030 {
  return {
    contentModel: vi.fn(async () => CASE_STUDY_VIEW),
    projects: vi.fn(async () => ENGINE_PROJECTS),
    project: vi.fn(async (_locale: string, slug: string) => (slug === ENGINE_PROJECT.slug ? ENGINE_PROJECT : null)),
    profile: vi.fn(),
    ...overrides,
  } as unknown as Client030;
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("list()", () => {
  it("asks for the fields and roles, in English", async () => {
    const c = client();
    await engineProjects(c, placeholderProjects).list();
    expect(c.projects).toHaveBeenCalledWith("en", { include: ["fields", "roles"] });
    expect(c.contentModel).toHaveBeenCalledWith("en");
  });

  it("maps the case-study fields onto cards: name, kind, status, role, stack, code link, numbers, featured, page path, the model's labels", async () => {
    const [mail] = await engineProjects(client(), placeholderProjects).list();
    expect(mail).toEqual({
      slug: "proprietor-mail",
      title: "proprietor-mail",
      summary: "An inbox the operator cannot read at rest.",
      status: "built",
      statusLabel: "Built",
      kind: "open-source",
      kindLabel: "Open source",
      role: "Designed and built it",
      stack: ["TypeScript", "Durable Objects"],
      highlights: [],
      facts: [{ value: "Apache-2.0", label: "", source: "gh api repos/Tobiscuit/proprietor-mail" }],
      links: [{ label: "Source on GitHub", href: "https://github.com/Tobiscuit/proprietor-mail", kind: "repo" }],
      featured: true,
      path: "/work/proprietor-mail",
    });
  });

  it("keeps 'live' for montanobtm.com, with its live link", async () => {
    const cards = await engineProjects(client(), placeholderProjects).list();
    const montano = cards.find((card) => card.slug === "montanobtm")!;
    expect(montano.status).toBe("live");
    expect(montano.links).toEqual([{ label: "montanobtm.com", href: "https://montanobtm.com", kind: "live" }]);
  });

  it("renders any other 'live' as built and drops its live link (only montanobtm.com may be called live)", async () => {
    const cards = await engineProjects(client(), placeholderProjects).list();
    const granite = cards.find((card) => card.slug === "granite-site")!;
    expect(granite.status).toBe("built");
    expect(granite.statusLabel).toBe("Built");
    expect(granite.links).toEqual([]);
  });

  it("knows the preset's other kinds and statuses: earlier work, archived", async () => {
    const old = (await engineProjects(client(), placeholderProjects).list()).find((card) => card.slug === "old-thing")!;
    expect(old.kind).toBe("earlier");
    expect(old.kindLabel).toBe("Earlier work");
    expect(old.status).toBe("archived");
  });

  it("keeps a field's markup as text: the value is never parsed as HTML", async () => {
    const old = (await engineProjects(client(), placeholderProjects).list()).find((card) => card.slug === "old-thing")!;
    expect(old.role).toBe("<script>alert(1)</script> & co");
  });

  it("skips an item without the required fields, and never links a non-https URL", async () => {
    const odd = [
      { ...ENGINE_PROJECTS[0], slug: "no-fields", fields: undefined },
      { ...ENGINE_PROJECTS[0], slug: "bad-link", fields: { ...ENGINE_PROJECTS[0].fields, repo: { url: "javascript:alert(1)" } } },
    ];
    const cards = await engineProjects(client({ projects: vi.fn(async () => odd) }), placeholderProjects).list();
    expect(cards.map((card) => card.slug)).toEqual(["bad-link"]);
    expect(cards[0].links).toEqual([]);
  });
});

describe("the fallback: the data module answers when the engine cannot serve the includes", () => {
  it("when the business has no content model (contentModel answers null)", async () => {
    const cards = await engineProjects(client({ contentModel: vi.fn(async () => null) }), placeholderProjects).list();
    expect(cards).toEqual(await placeholderProjects.list());
  });

  it("when the engine refuses or fails the call", async () => {
    const failing = client({ contentModel: vi.fn(async () => Promise.reject(Object.assign(new Error("unknown method"), { name: "TypeError" }))) });
    expect(await engineProjects(failing, placeholderProjects).list()).toEqual(await placeholderProjects.list());
    await expect(engineProjects(failing, placeholderProjects).get("proprietor-mail")).resolves.toBeNull();
  });
});

describe("get()", () => {
  it("is the project page: the card, the engine's body, and the remaining fields as words", async () => {
    const page = await engineProjects(client(), placeholderProjects).get("proprietor-mail");
    expect(page?.title).toBe("proprietor-mail");
    expect(page?.bodyHtml).toBe("<h2>What it is</h2><p>An inbox.</p>");
    expect(page?.details).toEqual([{ label: "Started", text: "2026-10" }]);
  });

  it("is null for an unknown slug (a 404)", async () => {
    await expect(engineProjects(client(), placeholderProjects).get("nope")).resolves.toBeNull();
  });
});
