# Cycle 2 — Admissibility Spec (Sovereign Onboarding Gate)

**Status:** RATIFIED 2026-04-15
**Authority:** Independent SAPE-style review (external advisor)
**Applies to:** `TrustSite → GenesisFlow → lifecycle store → Assembly → CommandCenter → activation receipt`
**Companion:** `docs/cycle-2-acceptance-checklist.md` (implementation rubric)

---

## Purpose

Define the **non-negotiable pass/fail gate** for sovereign onboarding. No partial credit. If any gate fails, onboarding is not sovereign.

## Target State

```
signerMode = genesis_ed25519
```

---

## Gate 1 — Sovereign Key Ownership

The onboarding identity must be rooted in a **real persisted Ed25519 key** controlled by the sovereign runtime, not an ephemeral edge/server-only key.

### Pass
- Key material generated or provisioned into the real sovereign backend/runtime
- Runtime can later re-use the same identity
- Public key exposed in onboarding matches runtime identity

### Fail
- Key generated only in a stateless API route
- Private key discarded after response
- Later runtime signer differs from genesis signer

### Evidence
- Persisted identity record
- Runtime health/identity endpoint
- Public key equality proof across genesis and runtime

---

## Gate 2 — Activation Receipt Lineage

`/api/node/activate` must sign with the **same genesis-backed Ed25519 identity**.

### Pass
- Activation receipt verifies against the genesis public key
- `signerMode === "genesis_ed25519"`
- Receipt chain reproducible after restart

### Fail
- `signerMode === "ephemeral_edge"`
- Receipt signer is HMAC, placeholder, or unrelated key
- Activation cannot be re-verified by runtime identity

### Evidence
- Signed receipt
- Verification script
- Restart/reload verification

---

## Gate 3 — Single Canonical Truth Path

There must be **exactly one live onboarding flow** and one truth source for node identity.

### Pass
- One canonical component path
- Dead/demo activation paths removed or explicitly unreachable
- Store state derived only from canonical backend artifacts

### Fail
- Duplicate onboarding components with divergent behavior
- UI claims based on local theater instead of signed artifacts

### Evidence
- Import graph
- Route/component map
- Lifecycle trace

---

## Gate 4 — Artifact Integrity

All exposed onboarding artifacts must be **deterministic, typed, and semantically valid**.

### Pass
- `nodeId` derivation documented and reproducible
- Agent IDs deterministic
- Timestamps consistent between signed envelope and response
- Resource settings validated before signing

### Fail
- Signed garbage payloads
- Mismatched envelope/response fields
- Unchecked shape/type/range inputs

### Evidence
- Adversarial tests
- Cross-language verification
- Schema validation

---

## Gate 5 — Honest Surface

UI and docs must **not overclaim beyond what the backend actually guarantees**.

### Pass
- "Awaiting first mission" style wording until real execution exists
- Signer mode disclosed truthfully
- Metrics and docs match actual implementation state

### Fail
- "All agents online" when not true
- "Sovereign" when key ownership is not real
- Stale or conflicting truth-labeled docs

### Evidence
- UI copy audit
- Docs diff
- Live walkthrough

---

## Acceptance Rule

**Onboarding is admissible only if all 5 gates pass simultaneously.**

No gate may be waived. No averaging across gates. Any single FAIL holds the cycle at CANDIDATE_CANONICAL.

## Current Known Blockers

**Gate 1** — server generates the Ed25519 keypair and discards the private key. The node never owns its sovereign key. This is the dependency root: Gate 2 cannot pass until Gate 1 passes.

**Gate 2** — current flow ships `signerMode: "ephemeral_edge"`. Activation receipts are not signed with the genesis key. Blocked by Gate 1.

All other gates are either partially satisfied (close to pass after v0.1 fixes) or pending explicit verification.

## Implementation Order

1. **Bind genesis identity** to real sovereign runtime key ownership (Gate 1)
2. **Make activation sign** with that same identity (Gate 2)
3. **Remove duplicate onboarding truth paths** (Gate 3) — e.g. `components/dashboard/node-activation.tsx` dead code
4. **Lock schemas and adversarial tests** (Gate 4) — already partly green after v0.1 fixes
5. **Re-audit UI/doc claims** (Gate 5)

## Relationship to Cycle 1

This spec is the **direct remediation path** for findings 1, 2, 4 from the Cycle 1 Gate 3 rejection (issue #23 in `bizra-data-lake`). Cycle 1 established the autopoietic template and caught the admissibility gap; Cycle 2 closes it.

Cycle 1 Gate 3 rejection stays in effect on `TOPOLOGY_CANON.md` (Node0 Activation = CANDIDATE_CANONICAL) until Cycle 2 closes all 5 gates here AND an independent human reviewer re-runs SAPE audit against the new state.

## Non-goals

- Not a UX polish cycle
- Not a new-feature cycle
- Not a refactor-for-its-own-sake cycle

If a change doesn't move a gate from FAIL → PASS, it does not belong in Cycle 2.

---

*Ratified from external SAPE review, 2026-04-15. Companion checklist: `docs/cycle-2-acceptance-checklist.md`.*
