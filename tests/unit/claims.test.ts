import { describe, expect, it } from "vitest";

import { ABOUT } from "../../content/about";
import { HOME } from "../../content/home";
import { WORK } from "../../content/work";
import { breaches, degreeClaimsOk, liveClaimsOk } from "../../lib/claims";

/** Every string in a value, flattened. */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (typeof value === "object" && value !== null) return Object.values(value).flatMap(strings);
  return [];
}

describe("the content rules hold for every word in content/", () => {
  it.each([
    ["content/home.ts", HOME],
    ["content/about.ts", ABOUT],
    ["content/work.ts (text only; links and statuses are checked by the projects port)", WORK.map(({ links, status, ...card }) => card)],
  ])("%s", (_file, data) => {
    for (const text of strings(data)) expect(breaches(text), text).toEqual([]);
  });

  it("every number on a card has a source", () => {
    for (const card of WORK) for (const fact of card.facts) expect(fact.source.trim(), `${card.slug}: ${fact.label}`).not.toBe("");
  });
});

describe("the rules themselves catch what they should", () => {
  it("flags production, Three Chicks, Gilded Shear, hardware keys, a named employer and a degree", () => {
    expect(breaches("Nine production sites")).not.toEqual([]);
    expect(breaches("Three Chicks storefront")).not.toEqual([]);
    expect(breaches("The Gilded Shear")).not.toEqual([]);
    expect(breaches("Sign in with a YubiKey")).not.toEqual([]);
    expect(breaches("Technology Specialist, The Computer Hospital")).not.toEqual([]);
    expect(breaches("B.S. in Computer Science")).not.toEqual([]);
    expect(degreeClaimsOk("A degree from UH.")).toBe(false);
    expect(degreeClaimsOk("I don't have a degree.")).toBe(true);
  });

  it("allows 'live' only next to montanobtm.com", () => {
    expect(liveClaimsOk("montanobtm.com is live on the platform.")).toBe(true);
    expect(liveClaimsOk("The granite site is live.")).toBe(false);
  });
});
