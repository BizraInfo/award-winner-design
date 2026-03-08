"use client"

/**
 * Terminal Agents — Phase C.5
 *
 * Build Contract §3 View 5: Capability surface.
 * Shows PAT-7 (user's personal team) + SAT-5 (forest pool).
 * Agent activity derived from cognitive endpoint — no synthetic state.
 */

import {
  Compass,
  Search,
  Hammer,
  Scale,
  Shield,
  Megaphone,
  Cpu,
  Lock,
  BarChart3,
  BookOpen,
  Radio,
  Users,
  Activity,
  HardDrive,
  Zap,
  WifiOff,
} from "lucide-react"
import {
  useCognitiveStatus,
  useNodeValue,
  useSeedPotential,
  useConstitutionalStatus,
} from "@/hooks/use-sovereign-api"
import type { ComponentType } from "react"

// ─── Agent Roster (static — البذرة p.12) ────────────────────

interface AgentDef {
  name: string
  role: string
  icon: ComponentType<{ className?: string }>
  description: string
}

const PAT_AGENTS: AgentDef[] = [
  { name: "Atlas", role: "Planner", icon: Compass, description: "Decomposes missions into executable steps" },
  { name: "Oracle", role: "Researcher", icon: Search, description: "Gathers and synthesizes information" },
  { name: "Forge", role: "Coder", icon: Hammer, description: "Writes and refactors code" },
  { name: "Judge", role: "Evaluator", icon: Scale, description: "Scores quality against Ihsān thresholds" },
  { name: "Crown", role: "Ethicist", icon: Shield, description: "Enforces constitutional constraints" },
  { name: "Herald", role: "Publisher", icon: Megaphone, description: "Formats and delivers outputs" },
  { name: "JARVIS", role: "Integrator", icon: Cpu, description: "Orchestrates cross-agent coordination" },
]

const SAT_AGENTS: AgentDef[] = [
  { name: "Sentinel", role: "Security", icon: Lock, description: "Guards network integrity" },
  { name: "Oracle-S", role: "Balance", icon: BarChart3, description: "Maintains economic equilibrium" },
  { name: "Ledger", role: "Trust", icon: BookOpen, description: "Verifies proof chains" },
  { name: "Conductor", role: "Capacity", icon: Radio, description: "Allocates compute resources" },
  { name: "Ambassador", role: "Social", icon: Users, description: "Manages network relationships" },
]

// ─── Components ─────────────────────────────────────────────

function AgentCard({
  agent,
  status,
}: {
  agent: AgentDef
  status: "active" | "idle" | "pool" | "unknown"
}) {
  const Icon = agent.icon
  const statusColors = {
    active: "bg-emerald-500",
    idle: "bg-zinc-600",
    pool: "bg-blue-500",
    unknown: "bg-zinc-700",
  }
  const statusLabels = {
    active: "Active",
    idle: "Idle",
    pool: "Pool",
    unknown: "—",
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-3 py-2.5">
      <div className="flex-shrink-0 rounded-md bg-zinc-800/60 p-1.5">
        <Icon className="w-4 h-4 text-zinc-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-200">{agent.name}</span>
          <span className="text-xs text-zinc-500">{agent.role}</span>
        </div>
        <p className="text-xs text-zinc-600 truncate">{agent.description}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
        <span className="text-xs text-zinc-500">{statusLabels[status]}</span>
      </div>
    </div>
  )
}

function CognitiveOverview({
  activeAgents,
  memoryMb,
  status,
  composite,
  tier,
  humanStage,
}: {
  activeAgents: number | null
  memoryMb: number | null
  status: string | null
  composite: number | null
  tier: string | null
  humanStage: string | null
}) {
  const statusColor =
    status === "healthy" || status === "ready"
      ? "text-emerald-400"
      : status === "degraded"
        ? "text-yellow-400"
        : "text-zinc-500"

  return (
    <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-4 space-y-3">
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        Cognitive Overview
      </h3>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-zinc-500">Active Agents</p>
          <p className="text-lg font-semibold text-zinc-200">
            {activeAgents ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Memory</p>
          <p className="text-lg font-semibold text-zinc-200">
            {memoryMb != null ? `${memoryMb.toFixed(0)} MB` : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Status</p>
          <p className={`text-lg font-semibold ${statusColor}`}>
            {status ?? "—"}
          </p>
        </div>
      </div>

      {composite != null && (
        <div className="pt-2 border-t border-zinc-800/40">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Node Quality</span>
            <span className="text-xs text-zinc-500">
              {tier && <span className="text-zinc-400 mr-2">{tier}</span>}
              {humanStage && <span className="text-zinc-600">{humanStage}</span>}
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                composite >= 0.95
                  ? "bg-emerald-500"
                  : composite >= 0.85
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${Math.min(composite * 100, 100)}%` }}
            />
          </div>
          <p className="text-right text-xs text-zinc-500 mt-0.5">
            {(composite * 100).toFixed(1)}%
          </p>
        </div>
      )}
    </div>
  )
}

function ReflexInventory({
  compiled,
  reflexCount,
  streak,
  weakestDimension,
}: {
  compiled: boolean | null
  reflexCount: number | null
  streak: number | null
  weakestDimension: string | null
}) {
  return (
    <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-4 space-y-3">
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
        <Zap className="w-3.5 h-3.5" />
        Reflex Inventory
      </h3>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-zinc-500">Compiled</p>
          <p className="text-lg font-semibold text-zinc-200">
            {compiled != null ? (compiled ? "Yes" : "No") : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Reflexes</p>
          <p className="text-lg font-semibold text-zinc-200">
            {reflexCount ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Streak</p>
          <p className="text-lg font-semibold text-zinc-200">
            {streak ?? "—"}
          </p>
        </div>
      </div>

      {weakestDimension && (
        <p className="text-xs text-yellow-500/80">
          Weakest dimension: <span className="text-yellow-400">{weakestDimension}</span>
        </p>
      )}
    </div>
  )
}

// ─── Main View ──────────────────────────────────────────────

export function TerminalAgents() {
  const cognitive = useCognitiveStatus()
  const nodeValue = useNodeValue()
  const seed = useSeedPotential()
  const constit = useConstitutionalStatus()

  const isOffline =
    !cognitive.isConnected && !nodeValue.isConnected && !seed.isConnected

  // Derive agent activity from cognitive.active_agents
  const activeCount = cognitive.data?.active_agents ?? 0

  return (
    <div className="space-y-4">
      {/* Offline banner */}
      {isOffline && (
        <div className="flex items-center gap-2 rounded-lg border border-zinc-700/50 bg-zinc-900/60 px-4 py-2">
          <WifiOff className="w-4 h-4 text-zinc-500" />
          <span className="text-xs text-zinc-500">
            Offline — showing cached agent roster
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Cognitive + Reflex */}
        <div className="space-y-4">
          <CognitiveOverview
            activeAgents={cognitive.data?.active_agents ?? null}
            memoryMb={cognitive.data?.memory_usage_mb ?? null}
            status={cognitive.data?.status ?? null}
            composite={nodeValue.data?.composite ?? null}
            tier={nodeValue.data?.tier ?? null}
            humanStage={nodeValue.data?.human_stage ?? null}
          />
          <ReflexInventory
            compiled={seed.data?.compiled ?? null}
            reflexCount={constit.data?.reflexes ?? null}
            streak={seed.data?.streak ?? null}
            weakestDimension={seed.data?.weakest_dimension ?? null}
          />
        </div>

        {/* Right: Agent Rosters */}
        <div className="lg:col-span-2 space-y-4">
          {/* PAT-7 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                PAT-7 — Your Team
              </h3>
              <span className="text-xs text-zinc-600">
                ({activeCount} active)
              </span>
            </div>
            <div className="space-y-1.5">
              {PAT_AGENTS.map((agent, i) => (
                <AgentCard
                  key={agent.name}
                  agent={agent}
                  status={
                    isOffline
                      ? "unknown"
                      : i < activeCount
                        ? "active"
                        : "idle"
                  }
                />
              ))}
            </div>
          </div>

          {/* SAT-5 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="w-4 h-4 text-blue-500" />
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                SAT-5 — Forest Pool
              </h3>
            </div>
            <div className="space-y-1.5">
              {SAT_AGENTS.map((agent) => (
                <AgentCard
                  key={agent.name}
                  agent={agent}
                  status={isOffline ? "unknown" : "pool"}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
