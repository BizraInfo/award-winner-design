"use client"

/**
 * Terminal Dashboard — View 1 (Build Contract §3, §10.1)
 *
 * Immediate node readiness and sovereignty overview.
 * Primary routes: GET /v1/health, GET /v1/seed/potential
 * EventBus topics: economy.seed_minted, economy.asabiyyah
 * Offline fallback: local state files
 *
 * Acceptance criteria (§10.1):
 * - Loads without error in < 500ms
 * - Ihsān with color (green ≥ 0.95, yellow ≥ 0.85, red < 0.85)
 * - SNR with color (green ≥ 0.85, red < 0.85)
 * - Gini with color (green ≤ 0.35, red > 0.35)
 * - Last tick timestamp and interval
 * - LIVE or OFFLINE status
 * - SEED + BLOOM balance (compact)
 * - Last mission summary (one line)
 */

import { useEffect } from "react"
import {
  Activity,
  Shield,
  Coins,
  TrendingUp,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
} from "lucide-react"
import {
  useSovereignHealth,
  useSeedPotential,
  useTokenBalance,
  useTerminalState,
  useTerminalBriefing,
  useConstitutionalStatus,
} from "@/hooks/use-sovereign-api"
import { useTerminalStore, useCriticalEvents } from "@/store/use-terminal-store"
import {
  IHSAN_PRODUCTION,
  IHSAN_GATE,
  SNR_MINIMUM,
  GINI_CEILING,
  thresholdColor,
  giniColor,
} from "@/lib/constitutional-constants"

// ─── Sub-Components ──────────────────────────────────────────────

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {connected ? (
        <>
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
            Live
          </span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Offline
          </span>
        </>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  colorClass,
  icon: Icon,
  subtitle,
}: {
  label: string
  value: string
  colorClass: string
  icon: typeof Activity
  subtitle?: string
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${colorClass}`} />
        <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-mono font-semibold ${colorClass}`}>{value}</div>
      {subtitle && (
        <div className="text-xs text-zinc-600 mt-1">{subtitle}</div>
      )}
    </div>
  )
}

function CriticalEventBanner() {
  const events = useCriticalEvents()
  const ack = useTerminalStore((s) => s.acknowledgeCriticalEvent)

  if (events.length === 0) return null

  return (
    <div className="space-y-2">
      {events.map((evt) => (
        <div
          key={evt.id}
          className="flex items-center justify-between rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-sm text-red-300">{evt.message}</span>
            <span className="text-xs text-red-600 ml-2">
              {new Date(evt.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <button
            onClick={() => ack(evt.id)}
            className="text-xs text-red-500 hover:text-red-300 px-2 py-1 rounded border border-red-900/50 hover:border-red-700 transition-colors"
          >
            Acknowledge
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Main Dashboard ──────────────────────────────────────────────

export function TerminalDashboard() {
  const health = useSovereignHealth()
  const seed = useSeedPotential()
  const balance = useTokenBalance()
  const terminal = useTerminalState()
  const briefing = useTerminalBriefing()
  const constitution = useConstitutionalStatus()

  const setConnected = useTerminalStore((s) => s.setConnected)
  const setTerminalState = useTerminalStore((s) => s.setTerminalState)
  const setBriefing = useTerminalStore((s) => s.setBriefing)
  const isConnected = useTerminalStore((s) => s.isConnected)

  // Sync connection state
  useEffect(() => {
    setConnected(health.isConnected)
  }, [health.isConnected, setConnected])

  // Sync terminal state
  useEffect(() => {
    if (terminal.data) {
      setTerminalState(
        terminal.data.state,
        terminal.data.execution_path,
        terminal.data.mission_id,
      )
    }
  }, [terminal.data, setTerminalState])

  // Sync briefing
  useEffect(() => {
    if (briefing.data) {
      setBriefing(briefing.data)
    }
  }, [briefing.data, setBriefing])

  // Wire critical events from constitutional metrics (Contract §7.3)
  const addCriticalEvent = useTerminalStore((s) => s.addCriticalEvent)

  useEffect(() => {
    if (!constitution.data) return

    const giniVal = constitution.data.network_gini
    if (giniVal > GINI_CEILING) {
      addCriticalEvent({
        id: `gini-breach-${Math.floor(Date.now() / 60_000)}`,
        category: "invariant.violation",
        message: `Gini coefficient ${giniVal.toFixed(4)} exceeds constitutional limit (≤ ${GINI_CEILING})`,
        timestamp: Date.now(),
      })
    }
  }, [constitution.data, addCriticalEvent])

  useEffect(() => {
    if (!seed.data) return

    const ihsanVal = seed.data.reward_ema
    if (ihsanVal > 0 && ihsanVal < IHSAN_GATE) {
      addCriticalEvent({
        id: `ihsan-breach-${Math.floor(Date.now() / 60_000)}`,
        category: "ihsan.breach",
        message: `Ihsān score ${ihsanVal.toFixed(4)} below critical threshold (≥ ${IHSAN_GATE})`,
        timestamp: Date.now(),
      })
    }
  }, [seed.data, addCriticalEvent])

  // ─── Derived values ─────────────────────────────────────────

  const healthStatus: string = health.data?.status ?? "unknown"
  const ihsan = seed.data?.reward_ema ?? 0
  const snr = seed.data?.qualification_rate ?? 0
  const gini = constitution.data?.network_gini ?? 0.28
  const seedBalance = balance.data?.balance ?? briefing.data?.wallet_snapshot?.seed ?? 0
  const bloomBalance = briefing.data?.wallet_snapshot?.bloom ?? 0
  const tier = seed.data?.tier ?? "SEED"
  const tierProgress = seed.data?.tier_progress ?? 0
  const streak = seed.data?.streak ?? 0
  const lastMission = briefing.data?.last_mission_summary || "No missions yet"
  const qualityTrend = briefing.data?.quality_trend ?? "stable"
  const nextAction = briefing.data?.next_action_suggestion || ""
  const compiled = seed.data?.compiled ?? false

  const trendIcon =
    qualityTrend === "improving" ? "↑" : qualityTrend === "declining" ? "↓" : "→"

  // ─── Health status icon ─────────────────────────────────────

  const HealthIcon =
    healthStatus === "ready" || healthStatus === "healthy"
      ? CheckCircle2
      : healthStatus === "degraded"
        ? AlertTriangle
        : XCircle

  const healthColor =
    healthStatus === "ready" || healthStatus === "healthy"
      ? "text-emerald-400"
      : healthStatus === "degraded"
        ? "text-amber-400"
        : "text-red-400"

  return (
    <div className="space-y-4">
      {/* Header: Node Health + Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HealthIcon className={`w-5 h-5 ${healthColor}`} />
          <h2 className="text-lg font-semibold text-zinc-200">
            Node Health
          </h2>
          <span className={`text-sm ${healthColor} capitalize`}>
            {healthStatus}
          </span>
        </div>
        <StatusBadge connected={isConnected} />
      </div>

      {/* Critical Events (sticky — Contract §7.3) */}
      <CriticalEventBanner />

      {/* Constitutional Metrics Row */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          label="Ihsān"
          value={ihsan.toFixed(4)}
          colorClass={thresholdColor(ihsan, IHSAN_PRODUCTION, IHSAN_GATE)}
          icon={Shield}
          subtitle={`≥ ${IHSAN_PRODUCTION} required`}
        />
        <MetricCard
          label="SNR"
          value={snr.toFixed(4)}
          colorClass={thresholdColor(snr, SNR_MINIMUM)}
          icon={Activity}
          subtitle={`≥ ${SNR_MINIMUM} required`}
        />
        <MetricCard
          label="Gini"
          value={gini.toFixed(4)}
          colorClass={giniColor(gini)}
          icon={TrendingUp}
          subtitle={`≤ ${GINI_CEILING} required`}
        />
      </div>

      {/* Wallet + Tier Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">
              Wallet
            </span>
          </div>
          <div className="flex items-baseline gap-4">
            <div>
              <span className="text-xl font-mono font-semibold text-amber-400">
                {seedBalance.toFixed(2)}
              </span>
              <span className="text-xs text-zinc-500 ml-1">SEED</span>
            </div>
            <div>
              <span className="text-xl font-mono font-semibold text-emerald-400">
                {bloomBalance.toFixed(2)}
              </span>
              <span className="text-xs text-zinc-500 ml-1">BLOOM</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">
              Sovereignty
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl font-mono font-semibold text-purple-400">
              {tier}
            </span>
            <div className="flex-1">
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(tierProgress * 100, 100)}%` }}
                />
              </div>
              <div className="text-xs text-zinc-600 mt-0.5">
                {(tierProgress * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Heartbeat + Readiness Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">
              Status
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">State</span>
              <span className="text-sm font-mono text-zinc-300 capitalize">
                {terminal.data?.state?.replace(/_/g, " ") ?? "boot"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Streak</span>
              <span className="text-sm font-mono text-zinc-300">
                {streak} missions
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Trend</span>
              <span className="text-sm font-mono text-zinc-300">
                {trendIcon} {qualityTrend}
              </span>
            </div>
            {compiled && (
              <div className="flex items-center gap-1 mt-1">
                <Zap className="w-3 h-3 text-yellow-400" />
                <span className="text-xs text-yellow-400">Reflex compiled</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">
              Last Mission
            </span>
          </div>
          <p className="text-sm text-zinc-400 line-clamp-3 leading-relaxed">
            {lastMission}
          </p>
          {nextAction && (
            <p className="text-xs text-cyan-600 mt-2 line-clamp-1">
              Next: {nextAction}
            </p>
          )}
        </div>
      </div>

      {/* Heartbeat + Dev Insight (Contract §10.1: tick timestamp + interval) */}
      <div className="flex items-center justify-between text-xs text-zinc-700 px-1">
        <span>
          Tick:{" "}
          {constitution.data?.last_tick_timestamp
            ? new Date(constitution.data.last_tick_timestamp * 1000).toLocaleTimeString()
            : "—"}{" "}
          / {constitution.data?.tick_interval_s ?? 60}s
        </span>
        <span>Circuit: {health.circuitState}</span>
        <span>
          Seed Engine:{" "}
          {health.data?.seed_engine?.active ? "active" : "inactive"}
        </span>
      </div>
    </div>
  )
}
