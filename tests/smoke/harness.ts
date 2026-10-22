import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

/**
 * Shared by the smoke global setup (which starts the Worker) and the tests
 * (which read back what the stub engine saw). From montano-btm's
 * tests/stub-engine.ts and tests/base-url.ts (develop).
 *
 * Nothing here is a secret: the Turnstile keys are Cloudflare's published
 * test keys ("always passes"), the site key is a placeholder.
 */
const run = promisify(execFile);

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const persistTo = path.join(root, ".wrangler", "smoke-state");
export const stubConfig = path.join(root, "tests", "stubs", "seo-engine", "wrangler.jsonc");
/** wrangler's dev registry, private to this run, so no other local Worker session can be bound. */
export const registryPath = path.join(root, ".wrangler", "smoke-dev-registry");

export const PORT = Number(process.env.SMOKE_PORT ?? 4201);
export const INSPECTOR_PORT = Number(process.env.SMOKE_INSPECTOR_PORT ?? 9241);
export const BASE_URL = `http://127.0.0.1:${PORT}`;

export const TEST_VARS = {
  SEO_SITE_KEY: "sk_smoke_placeholder_not_a_real_key",
  TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
  TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA", // pragma: allowlist secret
} as const;

/** The token Cloudflare's always-passing test site key produces. */
export const TEST_TURNSTILE_TOKEN = "XXXX.DUMMY.TOKEN.XXXX"; // pragma: allowlist secret

export const wranglerEnv = { ...process.env, WRANGLER_SEND_METRICS: "false", WRANGLER_REGISTRY_PATH: registryPath };

async function d1(command: string): Promise<unknown> {
  const { stdout } = await run(
    "npx",
    ["--no-install", "wrangler", "d1", "execute", "seo_engine_stub", "--local", `--persist-to=${persistTo}`, "-c", stubConfig, "--command", command, "--json"],
    { cwd: root, env: wranglerEnv, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  return JSON.parse(stdout);
}

const TABLE = "CREATE TABLE IF NOT EXISTS calls (id INTEGER PRIMARY KEY AUTOINCREMENT, method TEXT NOT NULL, site_key TEXT, body TEXT NOT NULL)";

export async function resetStubCalls(): Promise<void> {
  await d1(`${TABLE}; DELETE FROM calls;`);
}

export type StubCall = { id: number; method: "announce" | "inquire"; siteKey: string; body: Record<string, unknown> };

export async function stubCalls(): Promise<StubCall[]> {
  type Row = { id: number; method: StubCall["method"]; site_key: string; body: string };
  // One result per statement: the SELECT's is the last.
  const results = (await d1(`${TABLE}; SELECT id, method, site_key, body FROM calls ORDER BY id;`)) as Array<{ results?: Row[] }>;
  const rows = results.at(-1)?.results ?? [];
  return rows.map((row) => ({ id: row.id, method: row.method, siteKey: row.site_key, body: JSON.parse(row.body) as Record<string, unknown> }));
}
