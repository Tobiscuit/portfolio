import type { EngineProfileLink, BusinessProfile030, FieldDisplay, FieldValue, FieldView, ModuleView } from "./types";

/**
 * TEMPORARY: local stand-ins for kit 0.8.0's `displayFields` and `linksOf`,
 * written to the contract in seo-engine spec 030 at 9060ece ("What the site
 * gets"). Delete this file when @jrcodex/seo-kit 0.8.0 is published and
 * import the kit's own (tasks W1/W2).
 */

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const isLink = (value: unknown): value is { url: string; label?: string } => typeof value === "object" && value !== null && typeof (value as { url?: unknown }).url === "string";
const isEntry = (value: unknown): value is { text: string; note: string } =>
  typeof value === "object" && value !== null && typeof (value as { text?: unknown }).text === "string" && typeof (value as { note?: unknown }).note === "string";

function optionLabel(field: FieldView, key: string): string {
  return field.options?.find((option) => option.key === key)?.label ?? key;
}

/** The value as words: a choice's label, a list joined with ", ", a link's label or URL, an entry as "text (note)", a true flag as its label. */
function asText(field: FieldView, value: FieldValue): string | null {
  if (typeof value === "boolean") return value ? field.label : null;
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return field.type === "choice" ? optionLabel(field, value) : value;
  if (isLink(value)) return value.label ?? value.url;
  if (Array.isArray(value)) {
    const parts = (value as unknown[]).map((item) => {
      if (typeof item === "string") return field.item === "choice" ? optionLabel(field, item) : item;
      if (isEntry(item)) return `${item.text} (${item.note})`;
      if (isLink(item)) return item.label ?? item.url;
      return "";
    });
    const words = parts.filter((part) => part !== "");
    return words.length > 0 ? words.join(", ") : null;
  }
  return null;
}

/** One entry per public field that has a value (a false flag has none), in the model's order. */
export function displayFields(fields: Record<string, FieldValue> | undefined, view: ModuleView): FieldDisplay[] {
  if (!fields) return [];
  const out: FieldDisplay[] = [];
  for (const field of view.fields) {
    const value = fields[field.key];
    if (value === undefined || value === null) continue;
    const text = asText(field, value);
    if (text === null || text === "") continue;
    out.push({ key: field.key, label: field.label, type: field.type, value, text, html: escapeHtml(text) });
  }
  return out;
}

/** `profile.links`, or the ones `social` implies on an engine older than 0.8.0. */
export function linksOf(profile: BusinessProfile030): EngineProfileLink[] {
  if (Array.isArray(profile.links)) return profile.links;
  const out: EngineProfileLink[] = [];
  if (profile.social?.instagram) out.push({ kind: "instagram", url: profile.social.instagram });
  if (profile.social?.facebook) out.push({ kind: "facebook", url: profile.social.facebook });
  return out;
}
