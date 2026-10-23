/**
 * The content rules as code (spec 003, domain-model ContentClaim and gap G8).
 * Used by tests/unit/claims.test.ts over content/*.ts and by the smoke tests
 * over every rendered page, so a breach fails before it can be published.
 */

/** Words and names that must never appear on the site. */
export const FORBIDDEN: ReadonlyArray<{ pattern: RegExp; why: string }> = [
  { pattern: /\bproduction\b/i, why: "client builds are 'built', never 'production'; only montanobtm.com is live" },
  { pattern: /three\s+chicks/i, why: "Three Chicks stays out" },
  { pattern: /gilded\s+shear/i, why: "'Gilded Shear' stays out" },
  { pattern: /project\s+eta/i, why: "placeholder project from the old site" },
  { pattern: /\bbastion\b/i, why: "the old brand is retired" },
  { pattern: /cissp\s+domain\s+mastery/i, why: "unverifiable credential" },
  { pattern: /yubikey|security\s+key|hardware\s+key/i, why: "passkeys are the phone's own, never hardware keys" },
  { pattern: /computer\s+hospital/i, why: "the employer is not named until he says so (D6)" },
  { pattern: /\b(bachelor|master)'?s?\b|\bassociate'?s\s+degree|\bB\.?S\.?\s+in\b|\bdegree\s+in\b/i, why: "no degree is ever claimed" },
];

/** "live" only where montanobtm.com is what is live. */
export function liveClaimsOk(text: string): boolean {
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (/\blive\b/i.test(sentence) && !/montanobtm/i.test(sentence)) return false;
  }
  return true;
}

/** "degree" only in a sentence that says there is none. */
export function degreeClaimsOk(text: string): boolean {
  for (const sentence of text.split(/(?<=[.!?;])\s+/)) {
    if (/\bdegree\b/i.test(sentence) && !/\b(no|don't have a|without a|never earned a)\s+degree\b/i.test(sentence)) return false;
  }
  return true;
}

/** Every rule broken by `text`, as human-readable reasons. */
export function breaches(text: string): string[] {
  const out = FORBIDDEN.filter(({ pattern }) => pattern.test(text)).map(({ pattern, why }) => `${pattern}: ${why}`);
  if (!liveClaimsOk(text)) out.push("'live' used for something other than montanobtm.com");
  if (!degreeClaimsOk(text)) out.push("a degree is implied");
  return out;
}
