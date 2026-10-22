import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { bundleCss, compactCss, fnv1a } from "../../lib/fingerprint";
import { contrast, enclosingAtRules, inPrelude, indexesOf, stripComments } from "./css-helpers";
import { read, root } from "./helpers";

/**
 * The design system (spec 003 R2; T6). PR #5's tests/tokens.node-test.ts and
 * tests/css-features.node-test.ts, moved to Vitest and pointed at styles/;
 * the TransitionLink check is gone with TransitionLink (CSS view transitions
 * need no script). New: the bundle and the vendored htmx.
 */

type Pair = { foreground: string; background: string; minimum: number; use: string };
type DesignSystem = {
  version: string;
  colors: Record<string, Record<string, { hex: string }>>;
  accessibility: { contrastPairs: Pair[]; avoid: Pair[] };
};

const ds = JSON.parse(read("design-system.json")) as DesignSystem;
const FILES = ["styles/reset.css", "styles/fonts.css", "styles/tokens.css", "styles/base.css", "styles/primitives.css", "styles/enhancements.css", "styles/site.css"];
const sheets = Object.fromEntries(FILES.map((file) => [file, stripComments(read(file))]));
const tokens = read("styles/tokens.css").toUpperCase();

const palette: Record<string, string> = {};
for (const group of ["primary", "neutral", "functional"]) for (const [name, swatch] of Object.entries(ds.colors[group])) palette[name] = swatch.hex;
const resolve = (ref: string) => (ref.startsWith("#") ? ref : palette[ref]);

describe("tokens and contrast (PR #5's evidence, re-run here)", () => {
  it("keeps the fixed eleven-colour palette", () => {
    expect(ds.version).toBe("2.0");
    expect(palette).toEqual({
      "sage-blue-900": "#0D1B2A",
      "ink-900": "#1B263B",
      "ink-700": "#415A77",
      "ink-500": "#778DA9",
      "parchment-300": "#E0E1DD",
      "parchment-200": "#F0F2F5",
      "parchment-100": "#FFFFFF",
      "arcane-gold-500": "#FFC300",
      "success-500": "#2ECC71",
      "warning-500": "#F39C12",
      "error-500": "#E74C3C",
    });
  });

  it("defines every palette hex in tokens.css under its own name", () => {
    for (const [name, hex] of Object.entries(palette)) expect(tokens).toContain(`--${name.toUpperCase()}: ${hex.toUpperCase()}`);
  });

  it("meets every documented contrast minimum", () => {
    expect(ds.accessibility.contrastPairs.length).toBeGreaterThanOrEqual(30);
    for (const pair of ds.accessibility.contrastPairs) {
      const ratio = contrast(resolve(pair.foreground), resolve(pair.background));
      expect(ratio, `${pair.foreground} on ${pair.background} (${pair.use})`).toBeGreaterThanOrEqual(pair.minimum);
    }
  });

  it("keeps the 'avoid' list honest: those pairs really fail", () => {
    expect(ds.accessibility.avoid.length).toBeGreaterThanOrEqual(3);
    for (const pair of ds.accessibility.avoid) expect(contrast(resolve(pair.foreground), resolve(pair.background))).toBeLessThan(pair.minimum);
  });

  it("has the static fallbacks for the colour-mixed tokens", () => {
    for (const hex of ["#0E592E", "#6C4303", "#8F2C21", "#F37F6E", "#FFCB49", "#152234", "#E6EAEA"]) expect(tokens).toContain(hex);
  });

  it("uses no raw hex colour outside tokens.css", () => {
    for (const file of FILES.filter((f) => f !== "styles/tokens.css")) expect(/#[0-9a-fA-F]{6}\b/.test(sheets[file]), file).toBe(false);
  });
});

function assertGated(needle: string, gatePrefix: string) {
  let seen = 0;
  for (const file of FILES) {
    const css = sheets[file];
    for (const i of indexesOf(css, needle)) {
      if (inPrelude(css, i)) continue;
      seen++;
      const gates = enclosingAtRules(css, i);
      expect(gates.some((g) => g.startsWith(gatePrefix)), `${file}: "${needle}" must be inside ${gatePrefix} (found: ${gates.join(" > ") || "none"})`).toBe(true);
    }
  }
  expect(seen, `"${needle}" is used somewhere`).toBeGreaterThan(0);
}

describe("modern CSS is gated, with fallbacks (PR #5's css-features test)", () => {
  it("gates scroll-driven animation, field-sizing, anchors, light-dark(), color-mix(), subgrid, discrete transitions, backdrop-filter, :has()", () => {
    assertGated("animation-timeline:", "@supports (animation-timeline");
    assertGated("field-sizing:", "@supports (field-sizing");
    for (const prop of ["anchor-name:", "position-anchor:", "position-area:", "position-try-fallbacks:"]) assertGated(prop, "@supports (anchor-name");
    assertGated("light-dark(", "@supports (color: light-dark");
    assertGated("color-mix(", "@supports (color: color-mix");
    assertGated("subgrid;", "@supports (grid-template-rows: subgrid");
    assertGated("@starting-style", "@supports (transition-behavior: allow-discrete");
    assertGated("backdrop-filter:", "@supports (backdrop-filter");
    assertGated(":has(.card__link", "@supports selector(:has(*))");
  });

  it("declares each gated feature's fallback outside the gate", () => {
    const t = sheets["styles/tokens.css"];
    const p = sheets["styles/primitives.css"];
    expect(t).toContain("@supports not (color: light-dark(#000, #fff))");
    expect(t).toMatch(/--accent-hover: #FFCB49;/);
    expect(p).toMatch(/\.nav-popover \{[^}]*position: fixed;[^}]*inset: calc\(var\(--header-h\)/);
    expect(p).toMatch(/\.field__textarea \{ min-block-size: 9rem;/);
    expect(p).toMatch(/\.site-header \{[^}]*background: var\(--surface\);/);
  });

  it("honours reduced motion: durations collapse, animations stop, view transitions do not animate", () => {
    const t = sheets["styles/tokens.css"];
    const block = t.slice(t.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    for (const d of ["--duration-1: 0ms", "--duration-2: 0ms", "--duration-3: 0ms", "--duration-4: 0ms"]) expect(block).toContain(d);
    const enh = sheets["styles/enhancements.css"];
    const vt = enh.indexOf("::view-transition-new(*) { animation: none !important; }");
    expect(vt).toBeGreaterThan(-1);
    expect(enclosingAtRules(enh, vt)).toContain("@media (prefers-reduced-motion: reduce)");
    expect(enh).toContain("@view-transition");
  });
});

describe("the bundle (src/assets.ts) and the vendored files", () => {
  it("bundles every stylesheet in styles/, in cascade order, reset first", () => {
    const src = read("src/assets.ts");
    const order = ["reset", "fonts", "tokens", "base", "primitives", "enhancements", "site"];
    expect(src).toContain(`bundleCss([${order.join(", ")}])`);
    const onDisk = readdirCss();
    expect(onDisk.sort()).toEqual(order.map((name) => `${name}.css`).sort());
  });

  it("fingerprints the bundle: same input, same URL; any change, a new URL", () => {
    const a = bundleCss(["a { color: red; }"]);
    expect(a.href).toMatch(/^\/assets\/site\.[0-9a-f]{8}\.css$/);
    expect(bundleCss(["a { color: red; }"]).href).toBe(a.href);
    expect(bundleCss(["a { color: blue; }"]).href).not.toBe(a.href);
    expect(fnv1a("")).toBe("811c9dc5");
    expect(compactCss("/* x */ a {\n   b: c;\n}")).toBe("a {\nb: c;\n}");
  });

  it("vendors htmx 4.0.0 byte for byte from the installed package", () => {
    const vendored = readFileSync(path.join(root, "public/vendor/htmx-4.0.0.min.js"));
    const installed = readFileSync(path.join(root, "node_modules/htmx.org/dist/htmx.min.js"));
    expect(vendored.equals(installed)).toBe(true);
    expect(JSON.parse(read("node_modules/htmx.org/package.json")).version).toBe("4.0.0");
  });

  it("caches the versioned static files for a year, and nothing else", () => {
    const headers = read("public/_headers");
    expect(headers).toMatch(/\/fonts\/\*\n\s+Cache-Control: public, max-age=31536000, immutable/);
    expect(headers).toMatch(/\/vendor\/\*\n\s+Cache-Control: public, max-age=31536000, immutable/);
    expect(headers.match(/^\//gm)).toHaveLength(2);
  });
});

function readdirCss(): string[] {
  return readdirSync(path.join(root, "styles")).filter((f) => f.endsWith(".css"));
}
