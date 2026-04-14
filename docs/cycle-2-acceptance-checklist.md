# /G cycle-2-acceptance — Sovereign Onboarding Acceptance Checklist

> **Authority:** Implementation rubric for `docs/cycle-2-admissibility-spec.md` (5-gate pass/fail spec).
> Spec file = **what must be true**. This file = **how to get there**.
> Every criterion in this checklist must advance exactly one gate in the spec.
>
> **Purpose:** This document is the single source of truth for Cycle 2 AMANAH work.
> It serves as: **(a)** Cycle 2 niyyah success criteria, **(b)** AMANAH test spec, **(c)** Gate 3 evaluation rubric.
>
> **Baseline:** Onboarding v0.1 — demo-functional, pre-sovereign (Cycle 1 audit 7.5/10)
> **Target:** Onboarding v0.2 — sovereign-verifiable
> **Do NOT modify TOPOLOGY_CANON.md from this checklist.**

---

## Gate Criteria Key

| Symbol | Meaning |
|--------|---------|
| ☐ | Not started |
| 🔧 | Implementation in progress |
| ✅ | Implemented + tested |
| 🔒 | Canonicalized (receipted, immutable) |

---

## 1. KEY CUSTODY — "The node owns its own keys"

> **Why:** v0.1 generates Ed25519 keypairs server-side and discards the private key.
> The node never possesses its own signing capability. This is the #1 sovereignty gap.

| # | Criterion | File(s) | Test | Measurable Signal |
|---|-----------|---------|------|-------------------|
| 1.1 | ☐ Ed25519 keypair generated **client-side** (WebCrypto or noble-ed25519) | `lib/crypto/keygen.ts` (new) | Unit: keypair generates in <50ms, pubKey is 32 bytes | `window.crypto.subtle` or noble-ed25519 import present |
| 1.2 | ☐ Private key stored in **client-only** secure storage (IndexedDB with encryption or Web Crypto non-exportable) | `lib/crypto/keystore.ts` (new) | Unit: private key never appears in localStorage, never sent in any fetch body | `grep -r "privateKey" -- app/api/` returns 0 matches in request bodies |
| 1.3 | ☐ Genesis endpoint accepts **public key** from client (not generating its own) | `app/api/genesis/route.ts` | Integration: POST with client-generated pubKey → nodeId = SHA-256(pubKey) matches client derivation | Server no longer calls `generateKeyPairSync` |
| 1.4 | ☐ Genesis envelope **signed by client** before submission (or co-signed: client signs, server countersigns) | `components/sovereign/onboarding-flow.tsx` | Integration: envelope.signature verifiable against client's pubKey | `crypto.sign()` call exists in client code, signature in request payload |
| 1.5 | ☐ Server returns **countersignature** (optional: server attests it witnessed the genesis, does not replace client authority) | `app/api/genesis/route.ts` | Integration: response includes `serverSignature` field, verifiable against known server pubKey | Two distinct signatures in genesis receipt |

---

## 2. SIGNER LINEAGE — "Every receipt chains to the canonical genesis key"

> **Why:** v0.1 uses `ephemeral_edge` signer for activation receipts — a fresh keypair
> per request with no relationship to the genesis key. Receipts are orphaned from identity.

| # | Criterion | File(s) | Test | Measurable Signal |
|---|-----------|---------|------|-------------------|
| 2.1 | ☐ Activation receipt signed by **node's own key** (the genesis keypair), not an ephemeral signer | `app/api/node/activate/route.ts` or client-side signing | Integration: activation receipt signature verifiable against genesis publicKey | `signerMode` changes from `ephemeral_edge` to `node_sovereign` |
| 2.2 | ☐ Receipt includes **genesisNodeId** reference creating an auditable chain | `app/api/node/activate/route.ts` | Unit: receipt JSON contains `genesisNodeId` field matching genesis nodeId | `genesisNodeId` field present in all activation receipts |
| 2.3 | ☐ Receipt chain is **append-only** — each receipt references the hash of the previous receipt | `lib/receipts/chain.ts` (new) | Integration: `receipt[n].previousReceiptHash === SHA-256(receipt[n-1])` | Chain verification function exists and passes |
| 2.4 | ☐ `signerMode` field is **machine-truthful** — reflects actual signer provenance | All receipt-producing routes | Grep: no hardcoded `signerMode` string that doesn't match actual signing logic | Automated test: parse signerMode, verify it describes the real signer |

---

## 3. SIGNATURE VERIFICATION — "Forged signatures are rejected at every boundary"

> **Why:** Gate 3 finding from SAPE audit — a forged 32-byte signature was accepted at
> canonicalization. No verification exists anywhere in the current codebase.

| # | Criterion | File(s) | Test | Measurable Signal |
|---|-----------|---------|------|-------------------|
| 3.1 | ☐ Genesis receipt signature **verified on client** after server response | `components/sovereign/onboarding-flow.tsx` | Unit: `crypto.verify(pubKey, signature, envelope)` returns true for valid, false for tampered | `verify()` call exists in GenesisFlow component |
| 3.2 | ☐ Activation receipt signature **verified on client** before persisting to store | `components/dashboard/node-activation.tsx` | Unit: tampered receipt rejected, valid receipt persisted | Store `setActivationReceipt` guarded by verify |
| 3.3 | ☐ **Forged 32-byte signature REJECTED** — adversarial test with random bytes | New test file | Adversarial: `crypto.verify(pubKey, randomBytes(64), envelope)` → false, rejected at client | Test exists and passes |
| 3.4 | ☐ **Bit-flipped signature REJECTED** — adversarial test with 1-bit mutation | New test file | Adversarial: flip bit 0 of valid signature → verify fails | Test exists and passes |
| 3.5 | ☐ **Wrong-key signature REJECTED** — sign with key A, verify with key B | New test file | Adversarial: sign(keyA, data) + verify(keyB, sig) → false | Test exists and passes |

---

## 4. CONSTITUTION INTEGRITY — "The constitution is canonical, not hardcoded"

> **Why:** v0.1 hardcodes Constitution v5 as an inline string constant in the genesis route.
> If the constitution changes, the route must be manually updated — no single source of truth.

| # | Criterion | File(s) | Test | Measurable Signal |
|---|-----------|---------|------|-------------------|
| 4.1 | ☐ Constitution loaded from **canonical file** (not inline string) | `lib/constitution/v5.ts` or `public/constitution-v5.txt` | Unit: file exists, SHA-256 matches known hash | `import` or `fs.readFileSync` from canonical path |
| 4.2 | ☐ Constitution hash in genesis receipt **matches** the canonical file hash | `app/api/genesis/route.ts` | Integration: `SHA-256(canonicalFile) === receipt.constitutionHash` | Hash derivation uses imported canonical text |
| 4.3 | ☐ Constitution hash **verified client-side** against bundled copy | Client code | Unit: client computes SHA-256 of its constitution copy, compares to server's hash | Mismatch triggers error, not silent acceptance |

---

## 5. DEAD CODE & WIRING — "Every component is reachable and intentional"

> **Why:** NodeActivation component exists (500 lines, real API calls) but is never imported.
> NODE_ACTIVATION lifecycle phase routes to CommandCenter, not NodeActivation.

| # | Criterion | File(s) | Test | Measurable Signal |
|---|-----------|---------|------|-------------------|
| 5.1 | ☐ NodeActivation component either **wired into lifecycle-router** at NODE_ACTIVATION phase, or **removed** | `components/lifecycle/lifecycle-router.tsx`, `components/dashboard/node-activation.tsx` | Integration: navigating to NODE_ACTIVATION phase renders correct component | `grep -rn "NodeActivation"` returns import in lifecycle-router, OR file deleted |
| 5.2 | ☐ Every exported component has **at least one import** | All `components/**/*.tsx` | Automated: `grep -rn "export.*function\|export.*const"` cross-referenced with imports | Zero orphaned exports in production components |

---

## 6. INPUT VALIDATION COMPLETENESS — "Every signed field is validated"

> **Why:** v0.1 had storageShare and availableHours unvalidated (fixed in this audit),
> but the principle must hold for ALL fields that end up in signed receipts.

| # | Criterion | File(s) | Test | Measurable Signal |
|---|-----------|---------|------|-------------------|
| 6.1 | ✅ storageShare validated 0-80 range (FIXED this audit) | `app/api/node/activate/route.ts` | Adversarial: storageShare:-1 → 400 | Test passes |
| 6.2 | ✅ availableHours validated as [number, number] in 0-24 (FIXED this audit) | `app/api/node/activate/route.ts` | Adversarial: "INJECT" → 400 | Test passes |
| 6.3 | ☐ `alwaysAvailable` validated as boolean | `app/api/node/activate/route.ts` | Adversarial: `alwaysAvailable: "true"` → 400 | Explicit typeof check |
| 6.4 | ☐ `name` field sanitized against XSS/injection in genesis (currently length-checked only) | `app/api/genesis/route.ts` | Adversarial: `name: "<script>alert(1)</script>"` → rejected or sanitized | Regex or allowlist validation |

---

## 7. RATE LIMITING & DoS PROTECTION [ARCHITECTURE]

> **Why:** In-memory Map rate limiter resets on serverless cold start.
> Ed25519 keygen per genesis request is CPU-intensive — no protection.
> This may warrant its own sub-cycle given architectural scope.

| # | Criterion | File(s) | Test | Measurable Signal |
|---|-----------|---------|------|-------------------|
| 7.1 | ☐ Rate limiting **persists across cold starts** (KV store, Redis, or Vercel Edge Config) | `middleware.ts` | Integration: trigger rate limit → cold start → limit still enforced | External store lookup in rate limit path |
| 7.2 | ☐ Genesis endpoint has **stricter rate limit** (e.g., 3 req/min per IP) given CPU cost | `middleware.ts` | Load test: >3 genesis calls/min from same IP → 429 | Per-endpoint rate limit config |

---

## Cycle 2 Scope Recommendation

**Sub-cycle A (Core Sovereignty):** Items 1.x, 2.x, 3.x — This is the essential sovereignty gap.
Without client-side key custody and verified signer lineage, the system cannot claim sovereignty.

**Sub-cycle B (Hardening):** Items 4.x, 5.x, 6.x, 7.x — Constitution canonicalization,
dead code cleanup, validation completeness, and DoS protection.

**Recommended order:** A before B. Sovereignty before hardening.
Sub-cycle A changes the fundamental architecture (client-side keygen).
Sub-cycle B is incremental improvement on the existing architecture.

---

## Audit Provenance

- **Auditor:** BIZRA Pilot (autopoietic quality engine)
- **Audit date:** 2026-04-14
- **Baseline commit:** HEAD of award-winner-design/main + 2 bug fixes (storageShare, activatedAt)
- **Typecheck:** clean (tsc --noEmit exit 0)
- **Build:** clean (next build, 25 routes, 0 errors)
- **Adversarial tests:** 10/10 passed (including fixed bugs + regression)
- **Rating:** 7.5/10 for v0.1 demo-functional scope
