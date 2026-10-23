/** From PR #5's tests/helpers.ts (design/jrcodex-2026): text-level CSS checks and WCAG contrast. */

export function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** The at-rule preludes enclosing a character index, outermost first. Good enough for our own stylesheets. */
export function enclosingAtRules(css: string, index: number): string[] {
  const stack: string[] = [];
  let buffer = "";
  for (let i = 0; i < index; i++) {
    const c = css.charAt(i);
    if (c === "{") {
      stack.push(buffer.trim());
      buffer = "";
    } else if (c === "}") {
      stack.pop();
      buffer = "";
    } else if (c === ";") {
      buffer = "";
    } else {
      buffer += c;
    }
  }
  return stack.filter((prelude) => prelude.startsWith("@"));
}

/** True when index sits inside an at-rule prelude, e.g. the condition of `@supports (x: y) {`. */
export function inPrelude(css: string, index: number): boolean {
  let i = index;
  while (i > 0) {
    const c = css.charAt(i - 1);
    if (c === "{" || c === "}" || c === ";") break;
    i--;
  }
  return css.slice(i, index).trim().startsWith("@");
}

export function indexesOf(haystack: string, needle: string): number[] {
  const out: number[] = [];
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    out.push(i);
    i = haystack.indexOf(needle, i + needle.length);
  }
  return out;
}

/** WCAG 2.x contrast ratio for two #rrggbb colours, rounded to 2 places. */
export function contrast(hexA: string, hexB: string): number {
  const lum = (hex: string) => {
    const channels = hex
      .replace("#", "")
      .match(/../g)!
      .map((x) => parseInt(x, 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const values = [lum(hexA), lum(hexB)].sort((x, y) => y - x);
  return Math.round(((values[0] + 0.05) / (values[1] + 0.05)) * 100) / 100;
}
