#!/usr/bin/env bash
# local.sh — one fresh local run of the spike, end to end, with no Cloudflare account:
#   1. throwaway PAYLOAD_SECRET in .dev.vars (generated once, never printed, gitignored)
#   2. fresh local D1 + R2 state, Payload migrations applied (`payload migrate`)
#   3. `opennextjs-cloudflare build` (pass --no-build to reuse .open-next/worker.js)
#   4. `opennextjs-cloudflare preview` = wrangler dev + workerd with LOCAL bindings on :8787
#   5. scripts/measure.sh against it; its first request is the cold one, nothing hits the
#      server before it. Output is kept in .wrangler/measure.txt, the server log in
#      .wrangler/preview.log
#   6. the preview's whole process group is stopped; exit code = measure.sh's (failed checks)
# Needs: node >= 24.15, npm, openssl, curl, python3.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-8787}"
BUILD=1
for arg in "$@"; do
  case "$arg" in
    --no-build) BUILD=0 ;;
    *) echo "unknown argument: $arg" >&2; exit 2 ;;
  esac
done

mkdir -p .wrangler
LOG=.wrangler/preview.log
OUT=.wrangler/measure.txt

# 1. secret: wrangler reads .dev.vars itself for the Worker; `next build` gets it from the
#    environment, so it is sourced here. The value never appears on a command line.
if [ ! -f .dev.vars ]; then
  (umask 077 && printf 'PAYLOAD_SECRET=%s\n' "$(openssl rand -hex 32)" > .dev.vars)
fi
set -a
# shellcheck disable=SC1091
. ./.dev.vars
set +a

# 2. fresh state + migrations. `payload migrate` reaches the local D1 through wrangler's
#    getPlatformProxy (see src/payload.config.ts); wrangler dev reads the same .wrangler/state/v3.
rm -rf .wrangler/state
npm run --silent migrate

# 3. build
if [ "$BUILD" = 1 ] || [ ! -f .open-next/worker.js ]; then
  npm run --silent build
fi

# 4. preview in its own session so the whole tree (npm -> opennextjs-cloudflare -> wrangler -> workerd)
#    can be stopped at the end
: > "$LOG"
setsid npm run --silent preview -- --port "$PORT" >"$LOG" 2>&1 &
PREVIEW_PID=$!
cleanup() { kill -- -"$PREVIEW_PID" 2>/dev/null || true; }
trap cleanup EXIT

for _ in $(seq 1 180); do
  grep -q "Ready on" "$LOG" && break
  if ! kill -0 "$PREVIEW_PID" 2>/dev/null; then
    echo "preview exited before it was ready:" >&2
    cat "$LOG" >&2
    exit 1
  fi
  sleep 1
done
if ! grep -q "Ready on" "$LOG"; then
  echo "preview did not become ready in 180 s:" >&2
  cat "$LOG" >&2
  exit 1
fi

# 5. measure
set +e
BASE_URL="http://localhost:$PORT" bash scripts/measure.sh | tee "$OUT"
STATUS=${PIPESTATUS[0]}
set -e
echo
echo "measure output: $OUT   preview log: $LOG"
exit "$STATUS"
