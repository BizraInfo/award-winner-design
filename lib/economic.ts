/**
 * Unified Economic Contract — Single Source of Truth
 * ===================================================
 * Drop into: lib/economic.ts
 *
 * This file replaces the split between:
 * - MissionReceipt (deprecated in types.ts)
 * - RewardReceipt (from reward-engine.ts)
 * - WalletState (from useWallet.ts)
 * - Display transforms scattered across Dashboard.tsx
 *
 * One type system for all economic surfaces.
 *
 * Standing on Giants:
 *   Al-Ghazali (1111) — Ihsan as constitutional quality gate
 *   Nakamoto (2008) — verifiable supply, transparent ledger
 *   Ostrom (1990) — commons governance (BLOOM as governance token)
 */

// ═══════════════════════════════════════════════════════════════════
// THRESHOLDS (mirrored from constants.py, verified against backend)
// ═══════════════════════════════════════════════════════════════════

export const ECONOMIC_THRESHOLDS = {
  /** Mission floor — minimum Ihsan for action execution */
  MISSION_FLOOR: 0.85,
  /** BLOOM eligibility — minimum Ihsan for governance rights */
  BLOOM_ELIGIBILITY: 0.90,
  /** Minting floor — minimum Ihsan for SEED reward */
  MINTING_FLOOR: 0.95,
  /** Excellence tier — bonus multiplier threshold */
  EXCELLENCE: 0.97,
  /** Zakat rate — constitutional redistribution */
  ZAKAT_RATE: 0.025,
  /** Community pool split — page 19, HARDCODED */
  COMMUNITY_POOL_SPLIT: 0.50,
  /** SNR minimum — signal quality floor */
  SNR_MINIMUM: 0.85,
  /** BLOOM accrual rate — 1% of wallet credit per receipt */
  BLOOM_ACCRUAL_RATE: 0.01,
  /** SEED supply cap per year */
  SEED_SUPPLY_CAP_PER_YEAR: 1_000_000,
} as const;

// ═══════════════════════════════════════════════════════════════════
// TOKEN TYPES
// ═══════════════════════════════════════════════════════════════════

export type TokenType = 'SEED' | 'BLOOM' | 'BRANCH';

/**
 * WalletTokenBalance — per-wallet token breakdown.
 *
 * Named WalletTokenBalance (not TokenBalance) to avoid collision with
 * sovereign-client.ts's TokenBalance which represents the API response shape.
 */
export interface WalletTokenBalance {
  /** SEED — liquid utility token, transferable */
  seed: number;
  /** BLOOM — soulbound governance token, non-transferable, decays */
  bloom: number;
  /** BRANCH — reputation token, earned through attestation */
  branch: number;
  /** SEED locked in staking */
  lockedSeed: number;
}

// ═══════════════════════════════════════════════════════════════════
// PROOF OF IMPACT (PoI)
// ═══════════════════════════════════════════════════════════════════

/** PoI rejection reason codes — aligned between frontend and backend */
export type PoIReasonCode =
  | 'POI_OK'
  | 'POI_REJECT_IHSAN_BELOW_THRESHOLD'
  | 'POI_REJECT_SNR_BELOW_THRESHOLD'
  | 'POI_REJECT_SUPPLY_CAP_EXCEEDED'
  | 'POI_REJECT_DUPLICATE'
  | 'POI_REJECT_EXPIRED';

/** Input factors for PoI scoring */
export interface PoIFactors {
  /** Direct work contribution (0-1) */
  contribution: number;
  /** Network reach / influence (0-1) */
  reach: number;
  /** Historical consistency (0-1) */
  longevity: number;
  /** Constitutional quality score (0-1) */
  ihsan: number;
  /** Signal-to-noise ratio (0-1) */
  snr: number;
}

/** PoI weights — must match backend poi_engine.py */
export const POI_WEIGHTS = {
  contribution: 0.5,
  reach: 0.3,
  longevity: 0.2,
} as const;

// ═══════════════════════════════════════════════════════════════════
// UNIFIED ECONOMIC RECEIPT
// ═══════════════════════════════════════════════════════════════════

/**
 * EconomicReceipt — THE canonical receipt type.
 *
 * Replaces MissionReceipt, RewardReceipt, and ad-hoc display transforms.
 * Every economic event in BIZRA produces one of these.
 */
export interface EconomicReceipt {
  /** Unique receipt ID */
  id: string;
  /** ISO timestamp */
  timestamp: string;

  /** PoI composite score (0-1) */
  poiScore: number;
  /** PoI input factors */
  factors: PoIFactors;

  /** Gross SEED before zakat */
  grossSeed: number;
  /** Zakat deduction (2.5% of gross) */
  zakatSeed: number;
  /** Net SEED to node (gross - zakat) */
  netSeed: number;
  /** Community pool share (50% of net) */
  poolShare: number;
  /** Final SEED credited to wallet (net - poolShare) */
  walletCredit: number;

  /** BLOOM accrued (governance weight) */
  bloom: number;
  /** BRANCH earned (reputation) */
  branch: number;

  /** Whether supply cap was hit */
  capHit: boolean;
  /** Reason code */
  reason: PoIReasonCode;

  /** Evidence hash (BLAKE2b of receipt content) */
  evidenceHash: string;
  /** Chain hash (links to previous receipt) */
  chainHash: string;
}

// ═══════════════════════════════════════════════════════════════════
// RECEIPT BUILDER
// SIMULATION ONLY — not cryptographic. Authoritative minting happens
// in the backend (poi_engine.py + mint.py). The frontend receipt is
// a preview — not a ledger entry.
// ═══════════════════════════════════════════════════════════════════

/**
 * Build an EconomicReceipt from PoI factors.
 *
 * SIMULATION ONLY — not cryptographic.
 * Authoritative minting happens in the backend (poi_engine.py + mint.py).
 * The frontend receipt is a preview — not a ledger entry.
 */
export function buildReceipt(
  factors: PoIFactors,
  supplyUsed: number = 0,
  supplyCap: number = 1_000_000,
): EconomicReceipt {
  const T = ECONOMIC_THRESHOLDS;

  // Gate checks
  if (factors.ihsan < T.MINTING_FLOOR) {
    return rejectReceipt('POI_REJECT_IHSAN_BELOW_THRESHOLD');
  }
  if (factors.snr < T.SNR_MINIMUM) {
    return rejectReceipt('POI_REJECT_SNR_BELOW_THRESHOLD');
  }
  if (supplyUsed >= supplyCap) {
    return rejectReceipt('POI_REJECT_SUPPLY_CAP_EXCEEDED');
  }

  // PoI composite
  const poiScore =
    POI_WEIGHTS.contribution * factors.contribution +
    POI_WEIGHTS.reach * factors.reach +
    POI_WEIGHTS.longevity * factors.longevity;

  // SEED computation
  let grossSeed = poiScore * factors.ihsan * 10; // Base scaling
  const remaining = supplyCap - supplyUsed;
  const capHit = grossSeed > remaining;
  if (capHit) grossSeed = remaining;

  // Zakat (2.5%)
  const zakatSeed = round4(grossSeed * T.ZAKAT_RATE);
  const netSeed = round4(grossSeed - zakatSeed);

  // Community pool (50% of net)
  const poolShare = round4(netSeed * T.COMMUNITY_POOL_SPLIT);
  const walletCredit = round4(netSeed - poolShare);

  // BLOOM (uses named constant instead of magic number)
  const bloom = round4(walletCredit * T.BLOOM_ACCRUAL_RATE);

  // BRANCH (0 unless attestation work — handled separately)
  const branch = 0;

  return {
    id: `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    poiScore: round4(poiScore),
    factors,
    grossSeed: round4(grossSeed),
    zakatSeed,
    netSeed,
    poolShare,
    walletCredit,
    bloom,
    branch,
    capHit,
    reason: 'POI_OK',
    evidenceHash: '',  // Computed by backend
    chainHash: '',     // Computed by backend
  };
}

function rejectReceipt(reason: PoIReasonCode): EconomicReceipt {
  return {
    id: `rcpt_${Date.now()}_rejected`,
    timestamp: new Date().toISOString(),
    poiScore: 0,
    factors: { contribution: 0, reach: 0, longevity: 0, ihsan: 0, snr: 0 },
    grossSeed: 0,
    zakatSeed: 0,
    netSeed: 0,
    poolShare: 0,
    walletCredit: 0,
    bloom: 0,
    branch: 0,
    capHit: false,
    reason,
    evidenceHash: '',
    chainHash: '',
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
