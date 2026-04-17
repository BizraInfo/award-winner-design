# Dema Rust→JSON Bridge Contract (v0.1 draft + v0.2 reality-check)

**Status:** HOMEWORK draft — produced 2026-04-17 between sessions.
**Purpose:** Pre-specify the 7-endpoint bridge so next code session opens at implementation, not discovery.
**Target:** Replace stubs in `app/api/{missions,gates,chain,manifest}/**` with canonical `bizra-cognition` runtime data; re-label Dema `WIRED_PARTIAL → VALIDATED`.

---

## ⚠️ REALITY CHECK (v0.2 — added 2026-04-17 after surface verification)

Before scaffolding the gateway, I verified `bizra-cognition`'s actual public surface. Three drifts vs. the v0.1 draft below require decisions before any code lands. **Read this section first.**

### Drift 1 — CognitionRuntime has no mission concept

`runtime.rs` exposes only **3 public methods** on `CognitionRuntime`:
- `new(graph, chain, ctx) -> Self`
- `rehydrate(graph, chain) -> Result<Self, RehydrateError>` (pure chain replay)
- `handle(&mut self, event: CognitionEvent) -> Result<Option<Vec<Thought>>, LoopError>`

Events are `ReasoningRequest | ConsolidationTick | GovernanceDemyelination | Shutdown` — **no `SubmitMission`, no mission lookup, no daily aggregation, no admissibility claim construction.**

Mission types (`MissionEnvelope`, `MissionStage`, `MissionPriority`) live in `mission_freeze_v1.rs` as data structures — but there is **no mission execution runtime yet**. The PAT-7/SAT-5 factories in `configure_cognition.rs` build the graph, not a mission pipeline.

**Implication:** The 7 endpoints as drafted (§2 below) cannot be implemented against current `bizra-cognition`. Either:
- (a) A **mission runtime layer** must be added to `bizra-cognition` (new module wrapping `CognitionRuntime` with mission state) — larger arc than the gateway itself
- (b) The gateway implements mission persistence itself (in-memory + chain receipts), calling into `CognitionRuntime::handle` for reasoning — violates single-source-of-truth
- (c) Scope Dema v1 to **what actually exists**: chain inspection + admissibility evaluation on hand-crafted claims + static graph stats; drop mission CRUD until runtime supports it

🚩 **Mumu call required.** (c) is honest and fastest; (a) is correct but multi-session; (b) is a NO_SHADOW_STATE violation and should be rejected.

### Drift 2 — ReceiptKind enum mismatch

| Rust (`receipts.rs:33`) | TS (`lib/dema/types.ts:8`) | Status |
|---|---|---|
| `Genesis` (0x00) | — | **Missing from TS** |
| `CognitionBoot` (0x10) | `CognitionBoot` | ✅ matches |
| `Myelination` (0x20) | `Myelination` | ✅ matches |
| `Demyelination` (0x21) | `Demyelination` | ✅ matches |
| `ReasoningSession` (0x30) | `ReasoningSession` | ✅ matches |
| `GovernanceDecision` (0x40) | `GovernanceDemyelination` | ❌ **name mismatch** |
| `NodeLifecycle` (0x50) | `NodeLifecycle` | ✅ matches |
| `DegradedPath` (0xF0) | `DegradedPath` | ✅ matches |
| — | `GenesisValuation` | ❌ **TS-only invention** |

**Fix:** Align TS to Rust (add `Genesis`, rename `GovernanceDemyelination → GovernanceDecision`, remove `GenesisValuation` or add it to Rust if genesis-valuation receipts are a real thing — `eval_v1_integrated::GenesisValuationReceipt` exists but is not plumbed into `ReceiptKind`). Single-word call: **TS follows Rust**, not the other way. Rust is chain-canonical.

### Drift 3 — `ReceiptChainHead` fields partially available

Rust `ReceiptChain` exposes `head()` and `len()` publicly but **no `latest_timestamp()` accessor**. To fill `ReceiptChainHead.latestTimestamp`, the gateway must either:
- Add `pub fn latest_timestamp(&self) -> Option<u64>` to `ReceiptChain` (small, clean)
- Decode the last record's payload — costly and kind-dependent
**Recommend:** Add the accessor. One-line change.

### Corrected §7 next-session entry (supersedes original)

0. **Mumu decision on Drift 1 — scope (a) vs (c).** Everything downstream depends on this.
1. Browser walk-through of `/dema` (D5 Daughter Test).
2. Regardless of (a)/(c): reconcile `ReceiptKind` in `lib/dema/types.ts` → Rust. ~10-line TS patch + UI components that render the enum.
3. Add `ReceiptChain::latest_timestamp()` to `bizra-cognition` with a test. One-line change, one test.
4. Scaffold `bizra-cognition-gateway` crate (Axum, tokio, serde, hex) — health endpoint + `GET /chain` + `GET /chain/:hash` only. These two endpoints **work today** against the current runtime.
5. Wire those two in Next.js. Ship a narrower Dema that is fully VALIDATED rather than a broad one that is half-WIRED.
6. If scope (a): open a second arc for mission runtime in `bizra-cognition`. Separate session, separate spec.

### Decision on gateway crate location

Given Drift 1, the gateway **must not** contain mission state. That removes the main reason to put it outside `bizra-omega`. **Recommend:** `bizra-omega/bizra-cognition-gateway/` (28th workspace crate), read-only projection of `CognitionRuntime` state. Pure adapter, no business logic.

---

**The v0.1 draft below is preserved for reference but reflects the wished-for surface, not the actual one. Do not implement from §2–§7 below without reconciling against the reality-check above.**

---

---

## 1. Architecture choice

Three viable transport paths from `bizra-cognition` (Rust) to Next.js route handlers (TS):

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **A. Axum HTTP sidecar** (`bizra-cognition-gateway` crate) exposes JSON over localhost; Next.js `fetch()` proxies | Matches existing Python-cockpit HTTP bridge pattern; zero FFI; language-agnostic; hot-restartable | One extra process; JSON (re-)serialization cost | **RECOMMENDED** |
| B. NAPI-RS addon | Zero network hop; type-safe | FFI maintenance burden; rebuild-per-platform; ties Next.js lifecycle to Rust crate | Reject for v1 |
| C. stdio/CLI per request | Simplest | Boot cost per request; no shared runtime state | Reject |

**Decision anchor:** Option A reuses the established **Rust TUI ↔ Python cockpit HTTP bridge** pattern already proven in this stack. `bizra-cognition-gateway` becomes the 27th→28th workspace crate.

**Open question 🚩** — should the gateway live inside `bizra-omega` or as a separate crate under `award-winner-design/services/`? Needs Mumu's call.

---

## 2. Gateway surface (proposed Axum routes)

Gateway listens on `127.0.0.1:$BIZRA_COGNITION_PORT` (default `7421`). Each Next.js route calls the matching gateway route 1:1 and decodes to `lib/dema/types.ts`.

| # | Next.js route | Method | Gateway route | Rust call | Returns (TS) |
|---|---|---|---|---|---|
| 1 | `/api/missions` | POST | `/missions` | `MissionEnvelope::from_intent(intent, priority) + runtime.submit_mission(…)` | `Mission` |
| 2 | `/api/missions/[id]` | GET | `/missions/:id` | `runtime.mission_by_id(id)` → project to TS `Mission` | `Mission` |
| 3 | `/api/missions/[id]/replay` | POST | `/missions/:id/replay` | `runtime.rehydrate_mission(id)` → compare `chain_head` pre/post | `{missionId, replayResult, matchesPrevious, chainHead}` |
| 4 | `/api/gates/[missionId]` | GET | `/gates/:mission_id` | `AdmissibilityChain::canonical().evaluate(&claim_for(mission))` | `AdmissibilityResult` |
| 5 | `/api/chain` | GET | `/chain` | `ReceiptChain::{head, len, latest_timestamp}` | `ReceiptChainHead` |
| 6 | `/api/chain/[hash]` | GET | `/chain/:hash` | `ReceiptChain::fetch_and_decode(hash)` | `Receipt` |
| 7 | `/api/manifest/today` | GET | `/manifest/today` | aggregate: `runtime.today_stats() + ReceiptChain::{len, head} + eval_v1_integrated::ihsan_aggregate()` | `DailyManifest` |

---

## 3. Rust→TS type projections

Rust surface → TS contract (`lib/dema/types.ts`):

| Rust (bizra-cognition) | TS |
|---|---|
| `receipts::Blake3Hash` (`[u8;32]`) | `Blake3Hash` (64-char hex, `hex::encode`) |
| `receipts::Receipt { kind, timestamp, prev_chain, payload_hash }` | `Receipt` |
| `receipts::ReceiptKind` enum | `ReceiptKind` string union |
| `admissibility_freeze_v1::Verdict` | `Verdict` string union |
| `admissibility_freeze_v1::Invariant` | `Invariant` string union |
| `admissibility_freeze_v1::GateVerdict` | `GateVerdict` |
| `admissibility_freeze_v1::AdmissibilityResult` | `AdmissibilityResult` |
| `mission_freeze_v1::MissionStage` (S1..S9) | `MissionStage` (already aligned) |
| `mission_freeze_v1::MissionPriority` | `MissionPriority` |
| `mission_freeze_v1::MissionEnvelope` (partial) | `Mission` (project: id, intent, stage, priority, createdAt, updatedAt, admissibility) |

**Invariant: names match byte-for-byte.** TS unions already match Rust enum discriminants — confirmed against `admissibility_freeze_v1.rs:245` (Invariant) and `mission_freeze_v1.rs:258` (MissionStage).

---

## 4. Endpoint contracts (detailed)

### 1. `POST /api/missions`
**Request:** `{ intent: string, priority?: "Low"|"Normal"|"High"|"Critical" }`
**Gateway call:**
```rust
let envelope = MissionEnvelope::from_intent(&body.intent, body.priority.unwrap_or(Normal))?;
let (mission_id, mission_record) = runtime.submit_mission(envelope)?;
```
**Response (201):** `Mission` with `stage: "S1_INTAKE"`, `admissibility: null`.
**Receipt side-effect:** appends `ReceiptKind::MissionLifecycle` (if present) or `NodeLifecycle` to chain.

### 2. `GET /api/missions/:id`
**Gateway call:** `runtime.mission_by_id(&blake3_from_hex(id))?`
**Response (200):** `Mission`; (404) if not found.

### 3. `POST /api/missions/:id/replay`
**Gateway call:**
```rust
let pre_head = chain.head();
runtime.rehydrate_mission(id)?; // pure replay, no side-effects per runtime.rs:L10
let post_head = chain.head();
let matches = pre_head == post_head; // byte-for-byte
```
**Response:** `{ missionId, replayResult: "MATCH"|"DIVERGENT", matchesPrevious: bool, chainHead: Blake3Hash }`.
**Why this matters:** this is how **R1 (the chain is truth)** becomes observable in the UI — replay determinism is the core invariant.

### 4. `GET /api/gates/:missionId`
**Gateway call:**
```rust
let claim = runtime.admissibility_claim_for(mission_id)?;
let result = AdmissibilityChain::canonical().evaluate(&claim);
```
**Response:** `AdmissibilityResult` with `gates[]` across `ZANN_ZERO`, `CLAIM_MUST_BIND`, `RIBA_ZERO`, `NO_SHADOW_STATE`, `IHSAN_FLOOR`.
**Constitutional:** This endpoint is the **visible proof surface** for the 5 anchors. Score only populated for `IHSAN_FLOOR` (per current stub — confirmed against canonical).

### 5. `GET /api/chain`
**Gateway call:** `{ head: chain.head(), length: chain.len(), latest_timestamp: chain.last_receipt_ts() }`
**Response:** `ReceiptChainHead`.

### 6. `GET /api/chain/:hash`
**Gateway call:** `chain.fetch_and_decode::<T>(&blake3_from_hex(hash))?` — dispatch on `ReceiptKind`.
**Response:** `Receipt` (header only; payload fetched on expand via subsequent call if needed).
**Open question 🚩** — does UI need full payload decode in the list view, or only on expand? If on-expand, current shape is correct.

### 7. `GET /api/manifest/today`
**Gateway call:** aggregate across `runtime` + `chain` + `eval_v1_integrated`:
```rust
DailyManifest {
  date: today_iso(),
  missions_created: runtime.missions_created_since_midnight(),
  gates_passed: runtime.gates_permit_count_today(),
  gates_failed: runtime.gates_reject_count_today(),
  receipts_sealed: chain.receipts_since_midnight(),
  chain_length: chain.len(),
  chain_head: chain.head(),
  ihsan_aggregate: eval_v1_integrated::current_ihsan_aggregate(),
  system_health: SystemHealth { redis: /* via sidecar ping */, uptime, member_count }
}
```
**Keep:** Redis health still fetched directly from Next.js side (`getRedisHealthStatus()`) — do not route through Rust.

---

## 5. Error contract

Gateway returns structured errors:
```json
{ "error": { "code": "MISSION_NOT_FOUND" | "CHAIN_FETCH" | "REHYDRATE_INCONSISTENT" | ..., "message": "...", "domain": "bizra-cognition-v1" } }
```
Next.js route maps → `NextResponse.json(...)` with HTTP `4xx` on client errors, `5xx` on runtime/chain errors. Preserve the `domain` field — this is how `CLAIM_MUST_BIND` stays visible end-to-end.

---

## 6. NO_SHADOW_STATE compliance checklist

For each endpoint, the bridge must satisfy:

- [ ] Response is a **projection** of runtime state, not an independent store
- [ ] All Blake3 hashes match the chain's values byte-for-byte (no re-hashing in TS)
- [ ] Timestamps come from the Rust clock (authoritative), not `Date.now()`
- [ ] No Next.js-side caching beyond HTTP revalidation hints
- [ ] Failure modes surface Rust errors verbatim — no silent fallback to mock

This is the invariant that lets us re-label `WIRED_PARTIAL → VALIDATED`.

---

## 7. Next-session entry point

1. Browser walk-through of `/dema` (D5 Daughter Test) — visual baseline before wiring.
2. Read `bizra-cognition/src/runtime.rs` end-to-end — confirm `submit_mission`, `mission_by_id`, `rehydrate_mission`, `today_stats` either exist or need to be added (likely the latter for `today_stats` + the runtime getters).
3. Decide: gateway crate inside `bizra-omega` or separate. 🚩 Mumu call.
4. Scaffold `bizra-cognition-gateway` crate: Axum + tokio + serde + hex; health endpoint first.
5. Wire endpoint 5 (`GET /chain`) end-to-end — smallest surface, proves the pattern.
6. Then 4, 2, 1, 3, 6, 7 in ascending implementation cost.

---

## 8. Out of scope (this arc)

- Mission write-path invariants (CSRF, rate limiting) — already handled at Next.js layer
- Payload decode for every `ReceiptKind` — start with header-only
- WebSocket push for live chain updates — polling is acceptable for v1
- Authentication between Next.js ↔ gateway — localhost binding only for v1 (add mTLS before any network exposure)

---

*Spec follows design-before-debug discipline (memory: feedback_design_before_debug.md). If any Rust surface named above does not yet exist on `bizra-cognition`, add it first with tests — do not shape the gateway to hide runtime gaps.*
