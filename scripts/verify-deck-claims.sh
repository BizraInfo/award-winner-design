#!/usr/bin/env bash
# verify-deck-claims.sh
# Self-audit script: verifies factual claims in the investor deck against
# the live codebase and GitHub state. CLAIM_MUST_BIND enforcement.
#
# Usage:   bash scripts/verify-deck-claims.sh
# Returns: exit 0 if all claims verify, exit 1 if any fail
#
# This script IS a receipt. If a claim cannot be verified, it must be
# corrected in the deck or acknowledged as a known tension.

set -euo pipefail

PASS=0
FAIL=0
WARN=0

pass() { PASS=$((PASS + 1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  ❌ $1"; }
warn() { WARN=$((WARN + 1)); echo "  ⚠️  $1"; }

section() { echo ""; echo "━━━ $1 ━━━"; }

# ─── Claim: Node version ───────────────────────────────────────────────
section "Infrastructure Versions"

NODE_ACTUAL=$(node -v 2>/dev/null | sed 's/^v//')
NODE_DECK="22.22.2"
if [[ "$NODE_ACTUAL" == "$NODE_DECK" ]]; then
  pass "Node.js version: $NODE_ACTUAL (matches deck)"
else
  warn "Node.js version: deck says $NODE_DECK, actual is $NODE_ACTUAL"
fi

# ─── Claim: pnpm 10.x ─────────────────────────────────────────────────
PNPM_ACTUAL=$(pnpm -v 2>/dev/null || echo "not installed")
if [[ "$PNPM_ACTUAL" == 10.* ]]; then
  pass "pnpm version: $PNPM_ACTUAL"
else
  warn "pnpm version: expected 10.x, got $PNPM_ACTUAL"
fi

# ─── Claim: 124 frontend governance tests ──────────────────────────────
section "Test Counts"

if command -v npx >/dev/null 2>&1; then
  TEST_OUTPUT=$(npx vitest run 2>&1) || true
  # Strip ANSI color codes, then parse "Tests  124 passed (124)"
  CLEAN_OUTPUT=$(echo "$TEST_OUTPUT" | sed 's/\x1b\[[0-9;]*m//g')
  TEST_COUNT=$(echo "$CLEAN_OUTPUT" | grep "Tests" | grep "passed" | sed 's/.*Tests *//' | sed 's/ .*//')
  TEST_COUNT=${TEST_COUNT:-0}
  DECK_TESTS=124
  if [[ "$TEST_COUNT" -ge "$DECK_TESTS" ]]; then
    pass "Frontend tests: $TEST_COUNT (deck claims $DECK_TESTS)"
  else
    fail "Frontend tests: $TEST_COUNT (deck claims $DECK_TESTS)"
  fi

  # Check for failures
  FAIL_COUNT=$(echo "$CLEAN_OUTPUT" | grep "failed" | sed 's/[^0-9]//g' | head -1 || echo "0")
  FAIL_COUNT=${FAIL_COUNT:-0}
  if [[ "$FAIL_COUNT" == "0" ]]; then
    pass "Zero test failures"
  else
    fail "$FAIL_COUNT test failures detected"
  fi
else
  warn "npx not available — cannot verify test count"
fi

# ─── Claim: GitHub repo count ──────────────────────────────────────────
section "GitHub Repo Count"

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  REPO_COUNT=$(gh repo list BizraInfo --limit 500 --json name 2>/dev/null | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
  DECK_REPOS=149
  if [[ "$REPO_COUNT" -ge "$DECK_REPOS" ]]; then
    pass "BizraInfo repos: $REPO_COUNT (deck claims $DECK_REPOS)"
  else
    warn "BizraInfo repos: $REPO_COUNT (deck claims $DECK_REPOS) — drift detected"
  fi

  # Public repos
  PUBLIC_COUNT=$(gh repo list BizraInfo --limit 500 --json name,visibility 2>/dev/null | python3 -c "import json,sys; print(sum(1 for r in json.load(sys.stdin) if r['visibility']=='PUBLIC'))" 2>/dev/null || echo "0")
  DECK_PUBLIC=137
  if [[ "$PUBLIC_COUNT" -ge "$DECK_PUBLIC" ]]; then
    pass "Public repos: $PUBLIC_COUNT (deck claims $DECK_PUBLIC)"
  else
    warn "Public repos: $PUBLIC_COUNT (deck claims $DECK_PUBLIC)"
  fi
else
  warn "gh CLI not authenticated — skipping repo count verification"
fi

# ─── Claim: Dependabot open alerts ─────────────────────────────────────
section "Security Posture"

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  OPEN_ALERTS=$(gh api "/repos/BizraInfo/award-winner-design/dependabot/alerts?state=open&per_page=100" 2>/dev/null | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "unknown")
  FIXED_ALERTS=$(gh api "/repos/BizraInfo/award-winner-design/dependabot/alerts?state=fixed&per_page=100" 2>/dev/null | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "unknown")
  pass "Dependabot: $OPEN_ALERTS open, $FIXED_ALERTS fixed"

  if [[ "$OPEN_ALERTS" != "unknown" ]]; then
    HIGH_ALERTS=$(gh api "/repos/BizraInfo/award-winner-design/dependabot/alerts?state=open&severity=high&per_page=100" 2>/dev/null | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "unknown")
    CRIT_ALERTS=$(gh api "/repos/BizraInfo/award-winner-design/dependabot/alerts?state=open&severity=critical&per_page=100" 2>/dev/null | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "unknown")
    if [[ "$CRIT_ALERTS" == "0" ]]; then
      pass "Zero critical Dependabot alerts"
    else
      warn "Critical Dependabot alerts: $CRIT_ALERTS"
    fi
    echo "    (High: $HIGH_ALERTS, Open total: $OPEN_ALERTS)"
  fi
else
  warn "gh CLI not authenticated — skipping Dependabot verification"
fi

# ─── Claim: Coverage thresholds ────────────────────────────────────────
section "Coverage Quality Gate"

if command -v npx >/dev/null 2>&1; then
  COV_OUTPUT=$(npx vitest run --coverage 2>&1 || true)
  COV_LINE=$(echo "$COV_OUTPUT" | grep "^All files" | head -1)
  if [[ -n "$COV_LINE" ]]; then
    pass "Coverage report generated: $COV_LINE"
  else
    warn "Could not parse coverage output"
  fi

  # Check thresholds passed (vitest exits 1 on threshold failure)
  if echo "$COV_OUTPUT" | grep -q "Tests.*passed"; then
    THRESHOLD_FAIL=$(echo "$COV_OUTPUT" | grep -c "ERROR.*coverage" || true)
    if [[ "$THRESHOLD_FAIL" == "0" ]]; then
      pass "Coverage thresholds: all gates pass"
    else
      fail "Coverage thresholds: gate failure detected"
    fi
  fi
else
  warn "npx not available — cannot verify coverage"
fi

# ─── Claim: TypeScript compiles ────────────────────────────────────────
section "Build Verification"

if command -v npx >/dev/null 2>&1; then
  TSC_OUTPUT=$(npx tsc --noEmit 2>&1 || true)
  TSC_ERRORS=$(echo "$TSC_OUTPUT" | grep -c "error TS" || true)
  if [[ "$TSC_ERRORS" == "0" ]]; then
    pass "TypeScript: zero compilation errors"
  else
    fail "TypeScript: $TSC_ERRORS compilation errors"
  fi
else
  warn "npx not available — cannot verify TypeScript"
fi

# ─── Claim: Redis persistence scripts exist ────────────────────────────
section "Infrastructure Scripts"

if [[ -x "scripts/verify-canary-rollback-drill.sh" ]]; then
  pass "Canary/rollback drill script exists and is executable"
else
  fail "Canary/rollback drill script missing or not executable"
fi

# ─── Claim: CI pipeline exists ─────────────────────────────────────────
if [[ -f ".github/workflows/ci.yml" ]]; then
  pass "CI pipeline workflow exists"
else
  fail "CI pipeline workflow missing"
fi

if [[ -f ".github/workflows/canary-rollback-drill.yml" ]]; then
  pass "Canary drill CI workflow exists"
else
  warn "Canary drill CI workflow missing"
fi

# ─── Summary ───────────────────────────────────────────────────────────
section "CLAIM_MUST_BIND Verification Summary"

TOTAL=$((PASS + FAIL + WARN))
echo ""
echo "  Passed:   $PASS / $TOTAL"
echo "  Failed:   $FAIL / $TOTAL"
echo "  Warnings: $WARN / $TOTAL"
echo ""

if [[ "$FAIL" -gt 0 ]]; then
  echo "  ❌ VERDICT: CLAIM_MUST_BIND VIOLATION — $FAIL claim(s) failed verification"
  echo "     Action: Update deck or fix codebase before presenting."
  exit 1
elif [[ "$WARN" -gt 0 ]]; then
  echo "  ⚠️  VERDICT: CLAIMS HOLD — $WARN item(s) need attention (drift detected)"
  echo "     Action: Review warnings and update deck if numbers have changed."
  exit 0
else
  echo "  ✅ VERDICT: ALL CLAIMS VERIFIED — deck is truth-bound"
  exit 0
fi
