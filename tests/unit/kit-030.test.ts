import { describe, expect, it } from "vitest";

import { displayFields, linksOf } from "../../lib/kit-030/helpers";
import { supports030 } from "../../lib/kit-030/types";
import { CASE_STUDY_VIEW } from "../fixtures/engine-030";

/** The kit 0.8.0 helpers, local until 0.8.0 is published (spec 030 at 9060ece, "What the site gets"). */
describe("displayFields", () => {
  it("returns one entry per public field with a value, in the model's order, with words for every type", () => {
    const shown = displayFields(
      {
        featured: false,
        stack: ["TypeScript", "Hono"],
        status: "in-progress",
        name: "A <b>name</b>",
        repo: { url: "https://github.com/example/x" },
        live: { url: "https://example.com", label: "example.com" },
        outcomes: [{ text: "28 specs", note: "ls specs" }],
        since: "2026-08",
        unknownField: "dropped",
      },
      CASE_STUDY_VIEW.projects,
    );
    expect(shown.map((f) => f.key)).toEqual(["name", "status", "since", "stack", "repo", "live", "outcomes"]);
    const by = Object.fromEntries(shown.map((f) => [f.key, f]));
    expect(by.status.text).toBe("In progress");
    expect(by.stack.text).toBe("TypeScript, Hono");
    expect(by.repo.text).toBe("https://github.com/example/x");
    expect(by.live.text).toBe("example.com");
    expect(by.outcomes.text).toBe("28 specs (ls specs)");
    expect(by.since.text).toBe("2026-08");
    expect(by.name.html).toBe("A &lt;b&gt;name&lt;/b&gt;");
  });

  it("shows a true flag as its label, and nothing for a false one or an absent value", () => {
    expect(displayFields({ featured: true }, CASE_STUDY_VIEW.projects)).toEqual([{ key: "featured", label: "Featured", type: "flag", value: true, text: "Featured", html: "Featured" }]);
    expect(displayFields(undefined, CASE_STUDY_VIEW.projects)).toEqual([]);
  });
});

describe("linksOf", () => {
  it("is profile.links when the engine sends them", () => {
    const links = [{ kind: "github" as const, url: "https://github.com/example" }];
    expect(linksOf({ ...profile(), links })).toEqual(links);
  });

  it("is what `social` implies on an older engine", () => {
    expect(linksOf({ ...profile(), social: { instagram: "https://www.instagram.com/x/", facebook: "https://www.facebook.com/x" } })).toEqual([
      { kind: "instagram", url: "https://www.instagram.com/x/" },
      { kind: "facebook", url: "https://www.facebook.com/x" },
    ]);
  });
});

describe("supports030", () => {
  it("is true only for a client with contentModel (kit 0.8.0)", () => {
    expect(supports030({ contentModel: () => null })).toBe(true);
    expect(supports030({ posts: () => [] })).toBe(false);
    expect(supports030(null)).toBe(false);
  });
});

function profile() {
  return { name: "Fixture", telephone: null, email: null, address: null, social: {}, serviceArea: [], team: "solo" as const, hours: null, updatedAt: "2026-10-22T00:00:00.000Z" };
}
