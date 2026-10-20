#!/usr/bin/env bash
# measure.sh — end-to-end check + timings for the Payload-on-Workers spike.
#
# Needs: bash, curl, python3 (stdlib only). No project dependencies.
# Usage: BASE_URL=http://localhost:8787 scripts/measure.sh
#
# Run it against a FRESH local database (no users yet): /api/users/first-register
# only succeeds once per database, and the project slug "spike" is unique.
# Reset: rm -rf .wrangler/state && npm run migrate
#
# Every step prints "PASS|FAIL  <what>  <number>" and the script ends with a
# Markdown table you can paste into the README. Exit code = number of failures.
set -u

BASE_URL="${BASE_URL:-http://localhost:8787}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
JAR="$WORK/jar"
PASS=0
FAIL=0
ROWS=()

report() { # report PASS|FAIL "<what>" "<measurement>"
  if [ "$1" = PASS ]; then PASS=$((PASS + 1)); else FAIL=$((FAIL + 1)); fi
  ROWS+=("| $2 | $3 | $1 |")
  printf '%s  %-52s %s\n' "$1" "$2" "$3"
}

# http METHOD PATH OUTFILE [extra curl args...]
# prints: code|ttfb_seconds|redirect_url|content_type|size_download
http() {
  local method="$1" path="$2" out="$3"
  shift 3
  curl -sS -o "$out" -X "$method" \
    -w '%{http_code}|%{time_starttransfer}|%{redirect_url}|%{content_type}|%{size_download}' \
    "$@" "$BASE_URL$path" 2>>"$WORK/curl.err" || printf '000|0|||0'
}

median_of() { # reads whitespace-separated floats on stdin
  python3 -c 'import statistics,sys
v=[float(x) for x in sys.stdin.read().split()]
print(f"{statistics.median(v):.4f} (min {min(v):.4f}, max {max(v):.4f}, n={len(v)})" if v else "n/a")'
}

excerpt() { head -c 300 "$1" 2>/dev/null | tr '\n' ' '; }

echo "== measure.sh against $BASE_URL =="

# ---------------------------------------------------------------- 1. GET / cold + warm
res=$(http GET / "$WORK/home-cold.html")
IFS='|' read -r code cold _ _ size <<<"$res"
if [ "$code" = 200 ]; then
  report PASS "GET / cold (first request after start)" "200, TTFB ${cold}s, ${size} B"
else
  report FAIL "GET / cold (first request after start)" "HTTP $code $(excerpt "$WORK/home-cold.html")"
fi
times=""
for _ in 1 2 3 4 5 6 7 8 9 10; do
  res=$(http GET / "$WORK/home-warm.html")
  IFS='|' read -r c t _ <<<"$res"
  [ "$c" = 200 ] && times="$times $t"
done
if [ -n "$times" ]; then
  report PASS "GET / warm (median of 10)" "TTFB $(median_of <<<"$times")s"
else
  report FAIL "GET / warm (median of 10)" "no 200 responses"
fi

# ---------------------------------------------------------------- 2. GET /admin
res=$(http GET /admin "$WORK/admin.html")
IFS='|' read -r code ttfb redir _ size <<<"$res"
case "$code" in
  200) report PASS "GET /admin first request" "200, TTFB ${ttfb}s, ${size} B HTML" ;;
  301 | 302 | 303 | 307 | 308)
    if [[ "$redir" == */admin/create-first-user* ]]; then
      report PASS "GET /admin first request" "$code -> ${redir#"$BASE_URL"}, TTFB ${ttfb}s"
    else
      report FAIL "GET /admin first request" "$code -> $redir"
    fi
    ;;
  *) report FAIL "GET /admin first request" "HTTP $code $(excerpt "$WORK/admin.html")" ;;
esac
# the page a browser would actually land on (follows the redirect), for HTML size
res=$(http GET /admin "$WORK/admin-final.html" -L)
IFS='|' read -r code ttfb _ _ size <<<"$res"
if [ "$code" = 200 ]; then
  report PASS "GET /admin -L (landing page HTML)" "200, TTFB ${ttfb}s, ${size} B HTML"
else
  report FAIL "GET /admin -L (landing page HTML)" "HTTP $code"
fi
times=""
for _ in 1 2 3 4 5 6 7 8 9 10; do
  res=$(http GET /admin "$WORK/admin-warm.html" -L)
  IFS='|' read -r c t _ <<<"$res"
  [ "$c" = 200 ] && times="$times $t"
done
if [ -n "$times" ]; then
  report PASS "GET /admin -L warm (median of 10)" "TTFB $(median_of <<<"$times")s"
else
  report FAIL "GET /admin -L warm (median of 10)" "no 200 responses"
fi

# ---------------------------------------------------------------- 3. first-register + login
EMAIL="spike@example.com"
PASSWORD="$(python3 -c 'import secrets; print(secrets.token_urlsafe(18))')" # memory only
CREDS="$(EMAIL="$EMAIL" PASSWORD="$PASSWORD" python3 -c 'import json,os
print(json.dumps({"email": os.environ["EMAIL"], "password": os.environ["PASSWORD"]}))')"
res=$(printf '%s' "$CREDS" | http POST /api/users/first-register "$WORK/register.json" \
  -H 'Content-Type: application/json' --data-binary @-)
IFS='|' read -r code ttfb _ <<<"$res"
if [ "$code" = 200 ] || [ "$code" = 201 ]; then
  report PASS "POST /api/users/first-register" "$code, TTFB ${ttfb}s"
else
  report FAIL "POST /api/users/first-register" "HTTP $code $(excerpt "$WORK/register.json")"
fi
res=$(printf '%s' "$CREDS" | http POST /api/users/login "$WORK/login.json" \
  -H 'Content-Type: application/json' --data-binary @- -c "$JAR")
IFS='|' read -r code ttfb _ <<<"$res"
if [ "$code" = 200 ] && grep -q 'payload-token' "$JAR" 2>/dev/null; then
  report PASS "POST /api/users/login (payload-token cookie set)" "200, TTFB ${ttfb}s"
else
  report FAIL "POST /api/users/login (payload-token cookie set)" "HTTP $code $(excerpt "$WORK/login.json")"
fi

# ---------------------------------------------------------------- 4. R2 round trip
python3 - "$WORK/spike.png" <<'PY'
import struct, sys, zlib
w = h = 8
raw = b"".join(b"\x00" + b"\x2f\x7d\x6b" * w for _ in range(h))  # filter 0 + RGB rows
def chunk(t, d):
    c = t + d
    return struct.pack(">I", len(d)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)
png = (b"\x89PNG\r\n\x1a\n"
       + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
       + chunk(b"IDAT", zlib.compress(raw, 9))
       + chunk(b"IEND", b""))
open(sys.argv[1], "wb").write(png)
PY
PNG_BYTES=$(stat -c %s "$WORK/spike.png")
res=$(http POST /api/media "$WORK/media.json" -b "$JAR" \
  -F "file=@$WORK/spike.png;type=image/png;filename=spike.png" \
  -F '_payload={"alt":"spike"}')
IFS='|' read -r code ttfb _ <<<"$res"
MEDIA_PATH=""
if [ "$code" = 201 ]; then
  MEDIA_PATH=$(python3 -c 'import json,sys
from urllib.parse import urlparse
u = json.load(open(sys.argv[1]))["doc"]["url"]
print(urlparse(u).path if u.startswith("http") else u)' "$WORK/media.json" 2>/dev/null)
fi
if [ "$code" = 201 ] && [ -n "$MEDIA_PATH" ]; then
  report PASS "POST /api/media (multipart PNG, ${PNG_BYTES} B)" "201, TTFB ${ttfb}s, url $MEDIA_PATH"
else
  report FAIL "POST /api/media (multipart PNG, ${PNG_BYTES} B)" "HTTP $code $(excerpt "$WORK/media.json")"
fi
if [ -n "$MEDIA_PATH" ]; then
  res=$(http GET "$MEDIA_PATH" "$WORK/download.png")
  IFS='|' read -r code ttfb _ ctype size <<<"$res"
  if [ "$code" = 200 ] && [[ "$ctype" == image/png* ]] && [ "$size" = "$PNG_BYTES" ] && cmp -s "$WORK/spike.png" "$WORK/download.png"; then
    report PASS "GET $MEDIA_PATH (R2 round trip, bytes identical)" "200, $ctype, ${size} B, TTFB ${ttfb}s"
  else
    report FAIL "GET $MEDIA_PATH (R2 round trip)" "HTTP $code, type '$ctype', ${size} B (expected ${PNG_BYTES})"
  fi
else
  report FAIL "GET media url (R2 round trip)" "skipped: no media url"
fi

# ---------------------------------------------------------------- 5. create a project
PROJECT=$(python3 -c 'import json,sys
cover = None
try:
    cover = json.load(open(sys.argv[1]))["doc"]["id"]
except Exception:
    pass
print(json.dumps({"title": "Spike project", "slug": "spike",
                  "summary": "Payload 3 on Workers: D1 for data, R2 for the cover image.",
                  "cover": cover}))' "$WORK/media.json")
res=$(printf '%s' "$PROJECT" | http POST /api/projects "$WORK/project.json" -b "$JAR" \
  -H 'Content-Type: application/json' --data-binary @-)
IFS='|' read -r code ttfb _ <<<"$res"
if [ "$code" = 201 ]; then
  report PASS "POST /api/projects (D1 write)" "201, TTFB ${ttfb}s"
else
  report FAIL "POST /api/projects (D1 write)" "HTTP $code $(excerpt "$WORK/project.json")"
fi

# ---------------------------------------------------------------- 6. public page shows it
res=$(http GET / "$WORK/home-after.html")
IFS='|' read -r code ttfb _ _ size <<<"$res"
if [ "$code" = 200 ] && grep -q 'Spike project' "$WORK/home-after.html" && [ -n "$MEDIA_PATH" ] && grep -qF "$MEDIA_PATH" "$WORK/home-after.html"; then
  report PASS "GET / shows project title + R2 image url" "200, TTFB ${ttfb}s, ${size} B"
else
  report FAIL "GET / shows project title + R2 image url" "HTTP $code; title found: $(grep -c 'Spike project' "$WORK/home-after.html"), url found: $(grep -cF "${MEDIA_PATH:-<none>}" "$WORK/home-after.html")"
fi

# ---------------------------------------------------------------- summary
echo
echo "| Check | Result | Status |"
echo "| --- | --- | --- |"
printf '%s\n' "${ROWS[@]}"
echo
echo "PASS=$PASS FAIL=$FAIL"
exit "$FAIL"
