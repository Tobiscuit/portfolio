import { describe, expect, it, vi } from "vitest";

import { INTAKE_FIELDS } from "../../lib/inquiry/form";
import { announceInBackground, describe as describeError, engineClient, manifestFor, mayWriteToEngine } from "../../lib/seo";
import { SITE_HOST } from "../../lib/site";

const production = new Request(`https://${SITE_HOST}/`);
const preview = new Request("https://abc123-juanramirez-codes.tobiasramzy.workers.dev/");

describe("manifestFor (spec 003 R3-R5)", () => {
  it("declares the blog and the inquiry form, in English, with the form's fields", () => {
    const manifest = manifestFor({ videos: false });
    expect(manifest.version).toBe(1);
    expect(manifest.kind).toBe("service");
    expect(manifest.has).toEqual({ blog: true, intake: true });
    expect(manifest.locales).toEqual(["en"]);
    expect(manifest.intake?.fields).toEqual([...INTAKE_FIELDS]);
  });

  it("declares videos only when the site can read them", () => {
    expect(manifestFor({ videos: true }).has).toEqual({ blog: true, intake: true, videos: true });
    expect(manifestFor({ videos: false }).has).not.toHaveProperty("videos");
  });

  it("never declares projects (they wait on engine spec 030) nor an unknown word like profile", () => {
    for (const videos of [true, false]) {
      const has = manifestFor({ videos }).has;
      expect(has).not.toHaveProperty("projects");
      expect(has).not.toHaveProperty("profile");
      expect(has).not.toHaveProperty("gallery");
      expect(has).not.toHaveProperty("chat");
    }
  });

  it("says the post page renders every compose() item at every placement", () => {
    expect(manifestFor({ videos: false }).renders).toEqual({
      pullQuote: true,
      keyPoints: true,
      aside: true,
      placements: ["wide", "inset-left", "inset-right"],
    });
  });
});

describe("mayWriteToEngine", () => {
  it("is true only on the write host", () => {
    expect(mayWriteToEngine(production, { ENGINE_WRITE_HOST: SITE_HOST })).toBe(true);
    expect(mayWriteToEngine(preview, { ENGINE_WRITE_HOST: SITE_HOST })).toBe(false);
  });

  it("is false when the write host is not configured", () => {
    expect(mayWriteToEngine(production, {})).toBe(false);
    expect(mayWriteToEngine(production, { ENGINE_WRITE_HOST: "" })).toBe(false);
  });
});

describe("engineClient", () => {
  it("throws when the binding is missing", () => {
    expect(() => engineClient({ SEO_SITE_KEY: "sk_x" })).toThrow(/SEO service binding/);
  });

  it("builds the kit's rpc client over the binding", () => {
    const client = engineClient({ SEO: {}, SEO_SITE_KEY: "sk_test_0123456789abcdef0123456789abcdef" });
    expect(typeof client.posts).toBe("function");
    expect(typeof client.inquire).toBe("function");
  });
});

describe("announceInBackground", () => {
  const key = "sk_test_0123456789abcdef0123456789abcdef";

  it("does nothing off the write host", () => {
    const waitUntil = vi.fn();
    const announce = vi.fn();
    announceInBackground(preview, { SEO: { announce }, SEO_SITE_KEY: key, ENGINE_WRITE_HOST: SITE_HOST }, { waitUntil });
    expect(waitUntil).not.toHaveBeenCalled();
    expect(announce).not.toHaveBeenCalled();
  });

  it("never throws when the binding is missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const waitUntil = vi.fn();
    expect(() => announceInBackground(production, { ENGINE_WRITE_HOST: SITE_HOST }, { waitUntil })).not.toThrow();
    expect(waitUntil).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("announces once from the write host, and a failure resolves (logged, not thrown)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const promises: Promise<unknown>[] = [];
    const announce = vi.fn().mockRejectedValue(new Error("engine down"));
    announceInBackground(production, { SEO: { announce }, SEO_SITE_KEY: key, ENGINE_WRITE_HOST: SITE_HOST }, { waitUntil: (p) => promises.push(p) });
    expect(promises).toHaveLength(1);
    await expect(promises[0]).resolves.toBeUndefined();
    expect(announce).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls.flat().join(" ")).not.toContain(key);
    warn.mockRestore();
  });
});

describe("describe", () => {
  it("names an error by name and message only", () => {
    const error = new Error("nope");
    error.name = "SiteKeyError";
    expect(describeError(error)).toBe("SiteKeyError: nope");
    expect(describeError("plain")).toBe("plain");
  });
});
