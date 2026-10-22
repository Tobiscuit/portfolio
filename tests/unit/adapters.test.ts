import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Client030 } from "../../lib/kit-030/types";
import { engineProfileLinks, staticProfileLinks } from "../../lib/profile-links";
import { placeholderProjects } from "../../lib/projects/placeholder";
import { engineClient } from "../../lib/seo";
import { portsFor } from "../../src/ports";
import { CASE_STUDY_VIEW, ENGINE_PROJECTS } from "../fixtures/engine-030";

/**
 * The composition root (src/ports.ts): which adapter answers each port. The
 * engine adapters only when the kit client can ask for spec 030's data
 * (kit 0.8.0); the data module otherwise (kit 0.6.2 today, or unconnected).
 */
const KEY = "sk_test_0123456789abcdef0123456789abcdef";

function client030(overrides: Record<string, unknown> = {}): Client030 {
  return {
    contentModel: vi.fn(async () => CASE_STUDY_VIEW),
    projects: vi.fn(async () => ENGINE_PROJECTS),
    project: vi.fn(async () => null),
    profile: vi.fn(async () => ({
      name: "Juan Ramirez", telephone: null, email: null, address: null, social: {}, serviceArea: [], team: "solo", hours: null, updatedAt: "2026-10-22T00:00:00.000Z",
      links: [
        { kind: "github", url: "https://github.com/Tobiscuit" },
        { kind: "x", url: "https://x.com/example" },
        { kind: "other", url: "https://example.com/talk", label: "A talk" },
        { kind: "website", url: "http://insecure.example.com" },
      ],
    })),
    ...overrides,
  } as unknown as Client030;
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("portsFor (the composition root)", () => {
  it("picks the data module with kit 0.6.2's client, which cannot send include", async () => {
    const kit062 = engineClient({ SEO: {}, SEO_SITE_KEY: KEY });
    const ports = portsFor(kit062);
    expect(ports.projects).toBe(placeholderProjects);
    expect(ports.profileLinks).toBe(staticProfileLinks);
  });

  it("picks the data module when the site is not connected", () => {
    const ports = portsFor(null);
    expect(ports.projects).toBe(placeholderProjects);
    expect(ports.profileLinks).toBe(staticProfileLinks);
  });

  it("picks the engine adapters for a client that can (kit 0.8.0)", async () => {
    const ports = portsFor(client030());
    expect(ports.projects).not.toBe(placeholderProjects);
    expect((await ports.projects.list()).map((card) => card.slug)).toContain("proprietor-mail");
  });
});

describe("the profile links' engine adapter", () => {
  it("reads links through linksOf with include links, labels each kind, and keeps https only", async () => {
    const c = client030();
    const links = await engineProfileLinks(c, staticProfileLinks).links();
    expect(c.profile).toHaveBeenCalledWith({ include: ["links"] });
    expect(links).toEqual([
      { kind: "github", label: "GitHub", href: "https://github.com/Tobiscuit" },
      { kind: "x", label: "X", href: "https://x.com/example" },
      { kind: "other", label: "A talk", href: "https://example.com/talk" },
    ]);
  });

  it("reads an older engine's links from social (linksOf's projection)", async () => {
    const older = client030({ profile: vi.fn(async () => ({ ...(await client030().profile()), links: undefined, social: { instagram: "https://www.instagram.com/example/" } })) });
    expect(await engineProfileLinks(older, staticProfileLinks).links()).toEqual([{ kind: "instagram", label: "Instagram", href: "https://www.instagram.com/example/" }]);
  });

  it("falls back to the data module when the owner has saved no link, or the call fails", async () => {
    const none = client030({ profile: vi.fn(async () => ({ ...(await client030().profile()), links: [] })) });
    expect(await engineProfileLinks(none, staticProfileLinks).links()).toEqual(await staticProfileLinks.links());
    const failing = client030({ profile: vi.fn(async () => Promise.reject(new Error("down"))) });
    expect(await engineProfileLinks(failing, staticProfileLinks).links()).toEqual(await staticProfileLinks.links());
  });
});
