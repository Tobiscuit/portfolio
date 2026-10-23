import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdirSync, openSync, rmSync } from "node:fs";

import { BASE_URL, INSPECTOR_PORT, PORT, persistTo, registryPath, resetStubCalls, root, stubConfig, TEST_VARS, wranglerEnv } from "./harness";

/**
 * Boots the site's Worker in workerd (`wrangler dev --local`) with the stub
 * engine in the same process, so the SEO binding can only reach the stub.
 * Everything is --local: no Cloudflare account, no token, no real engine.
 * (montano-btm's tests/global-setup.ts, adapted.)
 *
 * The Worker is NOT detached: it stays in this test run's process tree (and
 * in its `boxed` scope), and teardown kills that tree by PID, children first,
 * so nothing outlives the run.
 */
let server: ChildProcess | undefined;

async function waitForReady(timeoutMs = 120_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server?.exitCode !== null && server?.exitCode !== undefined) throw new Error(`Worker exited early with code ${server.exitCode}`);
    try {
      const response = await fetch(`${BASE_URL}/robots.txt`, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Worker did not answer on ${BASE_URL} within ${timeoutMs}ms`);
}

/** Every descendant of a PID, deepest first (ps, no pattern matching). */
function descendants(pid: number): number[] {
  const out = spawnSync("ps", ["-o", "pid=", "--ppid", String(pid)], { encoding: "utf8" });
  const children = (out.stdout ?? "").split("\n").map((line) => Number(line.trim())).filter((n) => Number.isInteger(n) && n > 0);
  return children.flatMap((child) => [...descendants(child), child]);
}

function signalAll(pids: number[], signal: NodeJS.Signals): void {
  for (const target of pids) {
    try {
      process.kill(target, signal);
    } catch {
      // already gone
    }
  }
}

export async function setup(): Promise<void> {
  rmSync(registryPath, { recursive: true, force: true });
  mkdirSync(registryPath, { recursive: true });
  await resetStubCalls();
  const log = process.env.SMOKE_LOG ? openSync(process.env.SMOKE_LOG, "a") : null;
  server = spawn(
    "npx",
    [
      "--no-install",
      "wrangler",
      "dev",
      "-c",
      "wrangler.jsonc",
      "-c",
      stubConfig,
      "--local",
      "--port",
      String(PORT),
      "--inspector-port",
      String(INSPECTOR_PORT),
      `--persist-to=${persistTo}`,
      "--show-interactive-dev-session=false",
      ...Object.entries(TEST_VARS).flatMap(([name, value]) => ["--var", `${name}:${value}`]),
    ],
    { cwd: root, env: wranglerEnv, stdio: log ? ["ignore", log, log] : "ignore" },
  );
  try {
    await waitForReady();
  } catch (error) {
    await teardown();
    throw error;
  }
}

export async function teardown(): Promise<void> {
  const pid = server?.pid;
  if (!pid) return;
  // The tree is read before anything is signalled: once npx exits, its
  // children are re-parented and can no longer be found from its PID.
  const tree = [...descendants(pid), pid];
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 5_000);
    server!.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    signalAll(tree, "SIGTERM");
  });
  // workerd sometimes ignores SIGTERM: whatever is left of the tree goes now.
  signalAll(tree, "SIGKILL");
}
