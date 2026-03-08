/**
 * Constitutional constants -- single source of truth for frontend.
 * Mirrors core/integration/constants.py from the backend.
 *
 * Standing on Giants: Al-Khwarizmi (determinism)
 */

// ═══════════════════════════════════════════════════════════════════
// IHSAN THRESHOLDS (from constants.py)
// ═══════════════════════════════════════════════════════════════════

/** Production-grade excellence floor */
export const IHSAN_PRODUCTION = 0.95
/** Strict / consensus threshold */
export const IHSAN_STRICT = 0.99
/** Minimum acceptable -- below this is red */
export const IHSAN_GATE = 0.85
/** SNR minimum -- signal quality floor */
export const SNR_MINIMUM = 0.85
/** SNR Tier-1 threshold */
export const SNR_T1 = 0.95
/** ADL Gini hard ceiling -- constitutional invariant */
export const GINI_CEILING = 0.35

// ═══════════════════════════════════════════════════════════════════
// NETWORK HEALTH THRESHOLDS
// ═══════════════════════════════════════════════════════════════════

/** Gini "healthy" -- well below constitutional ceiling */
export const GINI_HEALTHY = 0.20
/** Asabiyyah (social cohesion) -- strong threshold */
export const ASABIYYAH_STRONG = 0.70
/** Asabiyyah -- moderate threshold */
export const ASABIYYAH_MODERATE = 0.50

// ═══════════════════════════════════════════════════════════════════
// SCORE COLOR HELPERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Returns a Tailwind text color class for a score on a "higher is better" scale.
 * Green at production level, amber at gate level, red below.
 */
export function scoreColor(score: number): string {
  if (score >= IHSAN_PRODUCTION) return "text-emerald-400"
  if (score >= IHSAN_GATE) return "text-amber-400"
  return "text-red-400"
}

/** Alias -- semantically identical to scoreColor for Ihsan-specific contexts */
export const ihsanColor = scoreColor

/**
 * Generic threshold color: green if >= green, amber if >= yellow, red below.
 * When yellow is omitted, uses a binary green/red split.
 */
export function thresholdColor(
  value: number,
  green: number,
  yellow?: number,
): string {
  if (yellow !== undefined) {
    if (value >= green) return "text-emerald-400"
    if (value >= yellow) return "text-amber-400"
    return "text-red-400"
  }
  return value >= green ? "text-emerald-400" : "text-red-400"
}

/**
 * Gini color -- inverted scale (lower is better).
 * Uses the constitutional ceiling (0.35) as the red boundary,
 * and the healthy threshold (0.20) as the green boundary.
 */
export function giniColor(v: number): string {
  if (v <= GINI_HEALTHY) return "text-emerald-400"
  if (v <= GINI_CEILING) return "text-yellow-400"
  return "text-red-400"
}

/** Gini background color variant */
export function giniBg(v: number): string {
  if (v <= GINI_HEALTHY) return "bg-emerald-500"
  if (v <= GINI_CEILING) return "bg-yellow-500"
  return "bg-red-500"
}

/** Gini human-readable label */
export function giniLabel(v: number): string {
  if (v <= GINI_HEALTHY) return "healthy"
  if (v <= GINI_CEILING) return "caution"
  return "breach"
}

/** Asabiyyah (social cohesion) color -- higher is better */
export function asabiyyahColor(v: number): string {
  if (v >= ASABIYYAH_STRONG) return "text-emerald-400"
  if (v >= ASABIYYAH_MODERATE) return "text-yellow-400"
  return "text-red-400"
}

/** Asabiyyah human-readable label */
export function asabiyyahLabel(v: number): string {
  if (v >= ASABIYYAH_STRONG) return "strong"
  if (v >= ASABIYYAH_MODERATE) return "moderate"
  return "weak"
}

// ═══════════════════════════════════════════════════════════════════
// LIFECYCLE STAGES (unified -- network, skills, settings views)
// ═══════════════════════════════════════════════════════════════════

export const LIFECYCLE_STAGES = [
  { name: "Seedling", minActions: 0, minIhsan: 0, threshold: 0.0 },
  { name: "Sprout", minActions: 10, minIhsan: 0.85, threshold: 0.15 },
  { name: "Sapling", minActions: 50, minIhsan: 0.88, threshold: 0.30 },
  { name: "Branch", minActions: 200, minIhsan: 0.90, threshold: 0.50 },
  { name: "Canopy", minActions: 500, minIhsan: 0.93, threshold: 0.75 },
  { name: "Catalyst", minActions: 1000, minIhsan: 0.95, threshold: 0.95 },
] as const

export type LifecycleStageName = (typeof LIFECYCLE_STAGES)[number]["name"]

// ═══════════════════════════════════════════════════════════════════
// SKILL TIERS (skills view)
// ═══════════════════════════════════════════════════════════════════

export const SKILL_TIERS = [
  { name: "Novice", minActions: 0, minIhsan: 0 },
  { name: "Adept", minActions: 10, minIhsan: 0.85 },
  { name: "Expert", minActions: 100, minIhsan: 0.90 },
  { name: "Master", minActions: 1000, minIhsan: 0.95 },
] as const

export type SkillTierName = (typeof SKILL_TIERS)[number]["name"]

// ═══════════════════════════════════════════════════════════════════
// SOVEREIGNTY TIERS (from seed_engine.py)
// ═══════════════════════════════════════════════════════════════════

export const SOVEREIGNTY_TIERS = [
  { name: "SEED", min: 0, max: 0.25 },
  { name: "SPROUT", min: 0.25, max: 0.50 },
  { name: "TREE", min: 0.50, max: 0.75 },
  { name: "FOREST", min: 0.75, max: 1.0 },
] as const

export type SovereigntyTierName = (typeof SOVEREIGNTY_TIERS)[number]["name"]
