import { describe, expect, it } from "vitest";

import { LIVE_URLS, PROJECT_STATUSES, type ProjectCard } from "../../lib/projects/port";
import { placeholderProjects } from "../../lib/projects/placeholder";
import { projectsPort } from "../../lib/projects";

/**
 * The projects port (spec 003, plan section 2.1; T5). Until engine spec 030
 * forwards its content-model shapes, the placeholder adapter answers: static
 * summaries, no pages, and the content rules hold for every card.
 */
const cards = await placeholderProjects.list();

describe("the placeholder adapter", () => {
  it("lists the flagship work first: Proprietor Systems, proprietor-mail, the platform, Fluency, Pulse", () => {
    expect(cards.slice(0, 5).map((card) => card.slug)).toEqual(["proprietor-systems", "proprietor-mail", "platform", "fluency", "pulse"]);
  });

  it("has unique kebab-case slugs", () => {
    const slugs = cards.map((card) => card.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("uses only the closed set of statuses", () => {
    for (const card of cards) expect(PROJECT_STATUSES).toContain(card.status);
  });

  it("calls a card live only when it links an allow-listed live URL (only montanobtm.com)", () => {
    expect(LIVE_URLS).toEqual(["https://montanobtm.com/"]);
    for (const card of cards.filter((c) => c.status === "live")) {
      const live = card.links.filter((link) => link.kind === "live").map((link) => link.href);
      expect(live.length, card.slug).toBeGreaterThan(0);
      for (const href of live) expect(LIVE_URLS).toContain(href);
    }
  });

  it("never links a live URL that is not allow-listed", () => {
    for (const card of cards) for (const link of card.links.filter((l) => l.kind === "live")) expect(LIVE_URLS).toContain(link.href);
  });

  it("links repositories only where they are public", () => {
    const repos = cards.flatMap((card) => card.links.filter((link) => link.kind === "repo").map((link) => link.href));
    expect(repos).toEqual(["https://github.com/Tobiscuit/proprietor-mail"]);
  });

  it("has no pages yet: every path is null and get() is null (a 404, never a fake page)", async () => {
    for (const card of cards) expect(card.path).toBeNull();
    await expect(placeholderProjects.get("proprietor-systems")).resolves.toBeNull();
  });

  it("is the adapter the site uses until spec 030 (W1)", () => {
    expect(projectsPort).toBe(placeholderProjects);
  });

  it("names only montanobtm.com among client work; the rest is anonymised", () => {
    const client = cards.filter((card: ProjectCard) => card.kind === "client");
    expect(client.map((card) => card.slug)).toEqual(["montanobtm", "other-client-sites"]);
    const others = client[1];
    expect(others.status).toBe("built");
    expect(others.links).toEqual([]);
    expect(JSON.stringify(others)).not.toMatch(/mobil|navagranite|prestige|yanjo|jazbrym|wefix|gilded|evelyn|three chicks/i);
  });
});
