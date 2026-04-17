// lib/dema/types.ts
// TypeScript types mirroring bizra-cognition Rust structs.
// These are the contract between the Dema Console UI and the API layer.
// When the Rust→JSON bridge lands, these types become the decode target.

export type Blake3Hash = string; // 64-char hex

// Mirrors bizra-cognition::receipts::ReceiptKind (receipts.rs:33) byte-for-byte.
export type ReceiptKind =
  | "Genesis"
  | "CognitionBoot"
  | "Myelination"
  | "Demyelination"
  | "ReasoningSession"
  | "GovernanceDecision"
  | "NodeLifecycle"
  | "DegradedPath";

export interface Receipt {
  id: Blake3Hash;
  kind: ReceiptKind;
  // Nanoseconds since UNIX epoch. null when the payload is not decodable from the
  // chain header alone (most non-Myelination kinds). See NO_SHADOW_STATE: prefer null
  // over fabricated timestamps.
  timestamp: number | null;
  prevChain: Blake3Hash;
  payloadHash: Blake3Hash;
}

export interface ReceiptChainHead {
  head: Blake3Hash;
  length: number;
  // null when chain is empty or no timestamped payload has been appended yet.
  latestTimestamp: number | null;
}

export type Verdict = "PERMIT" | "REJECT" | "REVIEW" | "SCORE_ONLY";

export type Invariant =
  | "ZANN_ZERO"
  | "CLAIM_MUST_BIND"
  | "RIBA_ZERO"
  | "NO_SHADOW_STATE"
  | "IHSAN_FLOOR";

export interface GateVerdict {
  invariant: Invariant;
  verdict: Verdict;
  reason: string | null;
  score: number | null;
}

export interface AdmissibilityResult {
  missionId: Blake3Hash;
  finalVerdict: Verdict;
  gates: GateVerdict[];
  timestamp: number;
}

export type MissionStage =
  | "S1_INTAKE"
  | "S2_BOUND"
  | "S3_ROUTED"
  | "S4_EXECUTED"
  | "S5_AUDITED"
  | "S6_GATED"
  | "S7_RECEIPTED"
  | "S8_SETTLED"
  | "S9_ARCHIVED";

export type MissionPriority = "Low" | "Normal" | "High" | "Critical";

export interface Mission {
  id: Blake3Hash;
  intent: string;
  stage: MissionStage;
  priority: MissionPriority;
  createdAt: number;
  updatedAt: number;
  admissibility: AdmissibilityResult | null;
}

export interface DailyManifest {
  date: string;
  missionsCreated: number;
  gatesPassed: number;
  gatesFailed: number;
  receiptsSealed: number;
  chainLength: number;
  chainHead: Blake3Hash;
  ihsanAggregate: number;
  systemHealth: {
    redis: "ok" | "degraded" | "disabled";
    uptime: number;
    memberCount: number;
  };
}
