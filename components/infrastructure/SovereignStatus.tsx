"use client"

/**
 * Sovereign Status Badge — Phase 75.03
 *
 * Compact status indicator that connects to the sovereign API.
 * Shows: connection status, seed engine tier, sovereignty score.
 * Graceful fallback: shows "offline" badge if API unreachable.
 */

import { useSovereignHealth, useSeedPotential } from "@/hooks/use-sovereign-api"

const STATUS_COLORS: Record<string, string> = {
  healthy: "#22c55e",
  degraded: "#eab308",
  unhealthy: "#ef4444",
  offline: "#6b7280",
}

const TIER_LABELS: Record<string, string> = {
  SEED: "Seed",
  SPROUT: "Sprout",
  TREE: "Tree",
  FOREST: "Forest",
}

export function SovereignStatus() {
  const health = useSovereignHealth()
  const seed = useSeedPotential()

  const status = health.isConnected
    ? health.data?.status ?? "healthy"
    : "offline"
  const dotColor = STATUS_COLORS[status] ?? STATUS_COLORS.offline
  const tier = seed.data?.tier ? TIER_LABELS[seed.data.tier] ?? seed.data.tier : null
  const score = seed.data?.sovereignty_score

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300"
      style={{
        borderColor: `${dotColor}33`,
        background: `${dotColor}0a`,
      }}
    >
      {/* Status dot with pulse animation when connected */}
      <span className="relative flex h-2 w-2">
        {health.isConnected && (
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: dotColor }}
          />
        )}
        <span
          className="relative inline-flex rounded-full h-2 w-2"
          style={{ backgroundColor: dotColor }}
        />
      </span>

      <span
        className="text-[10px] font-mono uppercase tracking-wider"
        style={{ color: dotColor }}
      >
        {status}
      </span>

      {tier && (
        <>
          <span className="text-[8px] text-gray-600">|</span>
          <span className="text-[10px] font-mono text-[#C9A962] tracking-wider">
            {tier}
          </span>
        </>
      )}

      {score != null && score > 0 && (
        <span className="text-[10px] font-mono text-[#C9A962]/70">
          {(score * 100).toFixed(0)}%
        </span>
      )}
    </div>
  )
}

/**
 * Compact inline version for the navigation bar.
 */
export function SovereignDot() {
  const health = useSovereignHealth()
  const status = health.isConnected
    ? health.data?.status ?? "healthy"
    : "offline"
  const dotColor = STATUS_COLORS[status] ?? STATUS_COLORS.offline

  return (
    <span
      className="inline-flex h-1.5 w-1.5 rounded-full"
      style={{ backgroundColor: dotColor }}
      title={`Sovereign API: ${status}`}
    />
  )
}
