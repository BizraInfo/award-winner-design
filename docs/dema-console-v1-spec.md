# Dema Console v1 — Minimal Spec

**Status:** SPEC (not yet implemented)
**Date:** 2026-04-17
**Manifest step:** 6 (after bizra-cognition blocker closure)
**Named after:** Dema — the Daughter Test surface

---

## Purpose

Dema is the single coherent face of BIZRA. It is the trust surface
where a human (the principal) interacts with the sovereign node. It is
NOT a dashboard. It is NOT an admin panel. It is the Daughter Test:
would Dema understand this screen?

## What v1 must deliver (success condition from Manifest page 20)

One trust surface that satisfies condition #7: "one coherent face."

Specifically:
1. **One authoritative entry point** — the principal types or speaks intent
2. **One visible gate chain** — the principal sees which gates passed/failed
3. **One receipt lineage** — the principal can trace any output to its receipt
4. **One replay reproduction** — the principal can re-run any chain step
5. **One daily manifest** — the principal sees today's state at a glance

## What v1 does NOT include

- No multi-user. Single principal.
- No signup. The principal is the node operator.
- No mobile. Desktop browser only.
- No voice (v2).
- No custom interfaces (v3).
- No robotics integration.

## Architecture

```
┌─────────────────────────────────────────────┐
│           Dema Console (Next.js)             │
│  ┌────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Intent │  │ Gate     │  │ Receipt    │  │
│  │ Entry  │  │ Viewer   │  │ Explorer   │  │
│  └───┬────┘  └────┬─────┘  └─────┬──────┘  │
│      │            │              │          │
│      └────────────┴──────────────┘          │
│                    │                         │
│         ┌──────────┴───────────┐             │
│         │  Daily Manifest      │             │
│         │  (pulse/state view)  │             │
│         └──────────────────────┘             │
└──────────────────┬──────────────────────────┘
                   │ API
┌──────────────────┴──────────────────────────┐
│         Node Gateway (existing)              │
│  /api/health  /api/auth  /api/workspaces     │
│  + NEW: /api/chain  /api/receipts            │
│  + NEW: /api/gates   /api/manifest           │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────┴──────────────────────────┐
│       bizra-cognition (Rust substrate)       │
│  receipts · admissibility · mission · eval   │
└─────────────────────────────────────────────┘
```

## Four screens

### 1. Intent Entry
- Text input (v1), voice (v2)
- Shows: "What do you want BIZRA to do?"
- Submits to mission pipeline → creates MissionEnvelope (§7)
- Returns: mission_id, stage S1 acknowledgment

### 2. Gate Viewer
- Shows the 5-gate admissibility chain for the current mission
- Each gate: ZANN_ZERO → CLAIM_MUST_BIND → RIBA_ZERO → NO_SHADOW_STATE → IHSAN_FLOOR
- Visual: green/red per gate, with the rejection reason if any
- Real data from `admissibility_freeze_v1::AdmissibilityResult`

### 3. Receipt Explorer
- List of receipts in the current chain
- Each receipt: kind, timestamp, hash (truncated), payload preview
- Click to expand: full JSON, chain lineage, replay button
- Replay: re-runs the receipt's inputs through the pipeline, compares output hash

### 4. Daily Manifest
- Today's pulse: missions created, gates passed/failed, receipts sealed
- Health: Redis status, system uptime, Ihsan score aggregate
- Member count, active missions, chain length
- Maps to Manifest condition #5: "one daily manifest"

## API surface (new endpoints)

| Endpoint | Method | Returns |
|---|---|---|
| `/api/chain` | GET | Current receipt chain head + length |
| `/api/chain/:hash` | GET | Single receipt by hash |
| `/api/gates/:mission_id` | GET | AdmissibilityResult for a mission |
| `/api/manifest/today` | GET | Daily manifest summary |
| `/api/missions` | POST | Create MissionEnvelope |
| `/api/missions/:id` | GET | Mission state + stage |
| `/api/missions/:id/replay` | POST | Re-run mission, compare hashes |

## Implementation plan

| Phase | Work | Gate |
|---|---|---|
| D1 (2 days) | API stubs + types from bizra-cognition | Endpoints return typed JSON |
| D2 (2 days) | Intent Entry + Gate Viewer UI | Submit intent → see gates |
| D3 (2 days) | Receipt Explorer + Replay | Click receipt → see chain → replay |
| D4 (1 day) | Daily Manifest + Health integration | Pulse view live |
| D5 (1 day) | Daughter Test pass | Dema (age 5) can understand the main screen |

**Total: 8 days focused work.**

## Kill condition

If D1 (API stubs) takes more than 3 days, STOP and reassess.
The cognition substrate must be callable from the Next.js API layer.
If it's not, the bridge architecture is wrong.

## Connection to existing work

- `/api/health` already exists and returns Redis status
- `/api/auth/me` + member store already wired
- `award-winner-design` has the UI framework, design tokens, and lifecycle router
- `bizra-cognition` has the receipt chain, admissibility gates, and mission types
- The bridge: a Rust→JSON API layer (new, or Python shim via bizra-python)

## Evidence labels

| Claim | Status |
|---|---|
| Receipt chain types exist in Rust | VERIFIED (receipts.rs, 53 tests) |
| Admissibility 5-gate pipeline exists | VERIFIED (admissibility_freeze_v1.rs, 12 tests) |
| Mission lifecycle types exist | VERIFIED (mission_freeze_v1.rs, 8 tests) |
| Next.js UI framework exists | VERIFIED (award-winner-design, 124 tests) |
| API bridge Rust→JSON | PLANNED (D1) |
| Gate Viewer UI | PLANNED (D2) |
| Receipt Explorer UI | PLANNED (D3) |
| Daily Manifest | PLANNED (D4) |
| Daughter Test pass | PLANNED (D5) |
