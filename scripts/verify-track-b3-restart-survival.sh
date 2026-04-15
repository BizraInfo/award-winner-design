#!/usr/bin/env bash
# verify-track-b3-restart-survival.sh
# Restart-survival evidence for Track B.3 Redis persistence (spec §11).
# Run from the award-winner-design repo root:
#   export BEARER_TOKEN=<valid JWT from /api/auth/login>
#   bash scripts/verify-track-b3-restart-survival.sh
#
# What this does:
#   1. Confirms redis npm package is installed; installs if missing.
#   2. Brings up the redis service from docker-compose.
#   3. Boots the Next.js dev server with REDIS_URL set.
#   4. Exercises the invite + member flow via curl.
#   5. Kills the dev server, restarts it against the same Redis instance.
#   6. Re-queries the same endpoints — proves state survived.
#   7. Tears down the dev server cleanly. Leaves Redis up (or tears down with --full).
#
# Exit codes:
#   0 — restart-survival passed
#   1 — setup failed (redis, docker, or dev server)
#   2 — post-restart state did not match pre-restart state (Row 14 stays PARTIALLY LIVE)

set -euo pipefail

REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
# Bizra-Node0 already binds :3000 for the compose frontend container.
# Default to :3005 to avoid collision. Override with APP_PORT= or APP_URL=.
APP_PORT="${APP_PORT:-3005}"
APP_URL="${APP_URL:-http://localhost:${APP_PORT}}"
FULL_TEARDOWN=${1:-}

# Pre-flight port check — fail fast if something already listens on APP_PORT.
if command -v lsof >/dev/null 2>&1 && lsof -iTCP:"$APP_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[FAIL] port $APP_PORT is already in use. Stop the occupant or export APP_PORT=<free port>" >&2
  exit 1
fi

log() { printf '\n\033[1;36m[verify]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[FAIL]\033[0m %s\n' "$*" >&2; exit "${2:-1}"; }

# ---------------------------------------------------------------------------
# 1. pnpm deps
# ---------------------------------------------------------------------------
log "Step 1/7: verify redis npm package"
if [ ! -d node_modules/redis ]; then
  log "  redis not installed — running pnpm install"
  pnpm install --silent || fail "pnpm install failed"
fi
[ -d node_modules/redis ] || fail "redis still missing after install"

# ---------------------------------------------------------------------------
# 2. redis service
# ---------------------------------------------------------------------------
log "Step 2/7: start redis container"
docker compose up -d redis || fail "docker compose failed — check iptables/networking on host"

# Wait for redis to be reachable (up to 15 s)
for i in $(seq 1 15); do
  if docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
    log "  redis ready (attempt $i)"
    break
  fi
  sleep 1
  if [ "$i" = 15 ]; then fail "redis did not become reachable"; fi
done

# ---------------------------------------------------------------------------
# 3. first dev-server boot
# ---------------------------------------------------------------------------
log "Step 3/7: start dev server (first boot)"
REDIS_URL="$REDIS_URL" PORT="$APP_PORT" pnpm dev >/tmp/track-b3-dev-1.log 2>&1 &
DEV_PID=$!
trap 'kill $DEV_PID 2>/dev/null || true' EXIT

# Wait for /api/health
for i in $(seq 1 30); do
  if curl -fsS "$APP_URL/api/health" 2>/dev/null | grep -q '"redis"'; then
    break
  fi
  sleep 1
  if [ "$i" = 30 ]; then
    cat /tmp/track-b3-dev-1.log | tail -30
    fail "dev server did not respond with /api/health within 30 s"
  fi
done

HEALTH_PRE=$(curl -fsS "$APP_URL/api/health")
log "  health (pre): $HEALTH_PRE"
echo "$HEALTH_PRE" | grep -q '"redis":"ok"' || fail "pre-restart health is not redis:ok — aborting"

# ---------------------------------------------------------------------------
# 4. pre-restart: seed some state
# ---------------------------------------------------------------------------
log "Step 4/7: seed state via live API (owner genesis + member count)"
# These endpoints are withAuth-gated. BEARER_TOKEN must be set or the script
# cannot produce decisive evidence (both queries would return 401 and compare
# equal, yielding a false PASS).
if [ -z "${BEARER_TOKEN:-}" ]; then
  kill $DEV_PID 2>/dev/null || true
  fail "BEARER_TOKEN env var is required to produce decisive restart-survival evidence.
       export BEARER_TOKEN=<valid JWT> before running this script.
       (Obtain one via POST /api/auth/login against the running dev server.)"
fi
HDRS=("-H" "Authorization: Bearer $BEARER_TOKEN")

# Prime /api/auth/me to trigger lazy genesis owner seeding (spec §7).
curl -fsS "${HDRS[@]}" "$APP_URL/api/auth/me" >/dev/null \
  || fail "/api/auth/me returned non-200 — BEARER_TOKEN invalid or auth broken"

MEMBERS_PRE=$(curl -fsS "${HDRS[@]}" "$APP_URL/api/workspaces/default/members") \
  || fail "pre-restart /api/workspaces/default/members failed — cannot collect baseline"
log "  members (pre): $MEMBERS_PRE"
# The genesis owner should appear — zero-member result means genesis seed failed.
echo "$MEMBERS_PRE" | grep -q '"role":"owner"' \
  || fail "no owner in pre-restart member list — genesis seed never ran"

# ---------------------------------------------------------------------------
# 5. kill dev server
# ---------------------------------------------------------------------------
log "Step 5/7: kill first dev server (and its Next.js child processes)"
# Next.js dev spawns worker/turbopack children. Killing just $DEV_PID leaves
# them holding the port. pkill -P takes the whole process group.
pkill -TERM -P $DEV_PID 2>/dev/null || true
kill -TERM $DEV_PID 2>/dev/null || true
wait $DEV_PID 2>/dev/null || true
# Wait up to 10 s for port to free, then force-kill anything still on it.
for i in $(seq 1 10); do
  if ! lsof -iTCP:"$APP_PORT" -sTCP:LISTEN >/dev/null 2>&1; then break; fi
  sleep 1
  if [ "$i" = 10 ]; then
    log "  port $APP_PORT still bound — force killing"
    lsof -tiTCP:"$APP_PORT" -sTCP:LISTEN 2>/dev/null | xargs -r kill -KILL 2>/dev/null || true
    sleep 1
  fi
done

# ---------------------------------------------------------------------------
# 6. second dev-server boot against SAME redis
# ---------------------------------------------------------------------------
log "Step 6/7: restart dev server"
REDIS_URL="$REDIS_URL" PORT="$APP_PORT" pnpm dev >/tmp/track-b3-dev-2.log 2>&1 &
DEV_PID=$!

for i in $(seq 1 30); do
  # Require redis:ok on second boot, not just presence of the field.
  if curl -fsS "$APP_URL/api/health" 2>/dev/null | grep -q '"redis":"ok"'; then
    break
  fi
  sleep 1
  if [ "$i" = 30 ]; then
    cat /tmp/track-b3-dev-2.log | tail -100
    fail "dev server (2nd boot) did not report redis:ok within 30 s"
  fi
done

HEALTH_POST=$(curl -fsS "$APP_URL/api/health")
log "  health (post): $HEALTH_POST"
MEMBERS_POST=$(curl -fsS "${HDRS[@]}" "$APP_URL/api/workspaces/default/members") \
  || fail "post-restart /api/workspaces/default/members failed — dev server not serving members API"
log "  members (post): $MEMBERS_POST"

# ---------------------------------------------------------------------------
# 7. compare — the decisive step
# ---------------------------------------------------------------------------
log "Step 7/7: compare pre vs post"
if [ "$MEMBERS_PRE" = "$MEMBERS_POST" ]; then
  log "  ✅ members list IDENTICAL across restart — restart-survival PASSED"
  kill $DEV_PID 2>/dev/null || true
  [ "$FULL_TEARDOWN" = "--full" ] && docker compose down
  exit 0
else
  fail "members list DIFFERED across restart — state was lost.
       pre : $MEMBERS_PRE
       post: $MEMBERS_POST
       Row 14 must stay FUNCTIONALLY LIVE, PERSISTENCE TARGET." 2
fi
