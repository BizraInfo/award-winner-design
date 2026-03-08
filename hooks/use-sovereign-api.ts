"use client"

/**
 * Sovereign API Hooks — Phase 76
 *
 * React hooks for polling the sovereign Python backend via /api/v1/* proxy.
 * Built on the sovereign-client with circuit breaker and retry.
 * Local-first: returns cached/default data immediately, enriches with live API data.
 */

import { useState, useEffect, useCallback, useRef } from "react"
import {
  sovereign,
  SovereignError,
  type SovereignHealth,
  type HealthDeep,
  type SeedPotential,
  type NodeValue,
  type LifecycleStage,
  type NetworkEffect,
  type NetworkMilestone,
  type TokenBalance,
  type TokenSupply,
  type CognitiveStatus,
  type MemoryStats,
  type OnboardingState,
  type TerminalState,
  type BriefingContext,
  type ConstitutionalStatus,
  type UserProfile,
} from "@/lib/sovereign-client"

// ─── UI View Models (derived from backend types) ──────────────────
// These provide backward-compatible field names for components.

export interface TokenBalanceView {
  balance: number
  pending: number
  total_earned: number | null
  zakat_contributed: number | null
}

export interface CognitiveStatusView {
  status: string
  active_agents: number
  memory_usage_mb: number | null
}

export interface MemoryStatsView {
  total_records: number
  episodic: number
  semantic: number
  procedural: number
  vector_index_size: number
  db_path: string
}

export function toTokenBalanceView(raw: TokenBalance): TokenBalanceView {
  const seed = raw.balances["SEED"]
  return {
    balance: seed?.balance ?? 0,
    pending: seed?.staked ?? 0,
    total_earned: null, // not available from this endpoint
    zakat_contributed: null,
  }
}

export function toCognitiveStatusView(raw: CognitiveStatus): CognitiveStatusView {
  const subs = raw.subsystems
  const active = [subs.moe_router, subs.hrm_engine, subs.hypergraph_rag, subs.northstar_engine]
    .filter(Boolean).length
  return {
    status: raw.cognitive_fusion_available ? "active" : "inactive",
    active_agents: active,
    memory_usage_mb: null, // not exposed by backend
  }
}

export function toMemoryStatsView(raw: MemoryStats): MemoryStatsView {
  return {
    total_records: raw.total_records,
    episodic: raw.active_records,
    semantic: raw.indexed_vectors,
    procedural: raw.archived_records,
    vector_index_size: raw.hnsw_capacity,
    db_path: raw.sqlite_path,
  }
}

// Re-export types for backward compatibility
export type {
  SovereignHealth,
  SeedPotential,
  NodeValue,
  LifecycleStage,
  NetworkEffect,
  TerminalState,
  BriefingContext,
  ConstitutionalStatus,
  MemoryStats,
  TokenBalance,
  CognitiveStatus,
}

export interface NetworkMilestones {
  milestones: NetworkMilestone[]
}

// Generic polling hook with circuit breaker awareness
interface PollResult<T> {
  data: T | null
  error: string | null
  isLoading: boolean
  isConnected: boolean
  circuitState: string
  refetch: () => void
}

function useSovereignPoll<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
): PollResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const mounted = useRef(true)
  const visible = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  // Pause polling when the tab is hidden to save bandwidth and battery
  useEffect(() => {
    if (typeof document === "undefined") return

    const onVisibilityChange = () => {
      visible.current = document.visibilityState === "visible"
    }

    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => document.removeEventListener("visibilitychange", onVisibilityChange)
  }, [])

  const refetch = useCallback(async () => {
    // Skip fetching when the tab is hidden
    if (!visible.current) return

    try {
      const result = await fetcher()
      if (!mounted.current) return
      setData(result)
      setError(null)
      setIsConnected(true)
    } catch (e) {
      if (!mounted.current) return
      const msg = e instanceof SovereignError ? e.message : "Network error"
      setError(msg)
      setIsConnected(false)
    } finally {
      if (mounted.current) setIsLoading(false)
    }
  }, [fetcher])

  useEffect(() => {
    refetch()
    const timer = setInterval(refetch, intervalMs)
    return () => clearInterval(timer)
  }, [refetch, intervalMs])

  return {
    data,
    error,
    isLoading,
    isConnected,
    circuitState: sovereign.circuitState(),
    refetch,
  }
}

// ─── Typed hooks for each sovereign endpoint ─────────────────────

// Health (public)
export function useSovereignHealth() {
  return useSovereignPoll(sovereign.health, 10_000)
}

// Seed Engine (authenticated — Contract §4)
export function useSeedPotential() {
  return useSovereignPoll(sovereign.seed.potential, 30_000)
}

// Node (authenticated)
export function useNodeValue() {
  return useSovereignPoll(sovereign.node.value, 60_000)
}

export function useLifecycleStage() {
  return useSovereignPoll(sovereign.node.lifecycle, 60_000)
}

// Network (authenticated — Contract §4)
export function useNetworkEffect(nodes: number = 1000) {
  const fetcher = useCallback(() => sovereign.network.effect(nodes), [nodes])
  return useSovereignPoll(fetcher, 120_000)
}

export function useNetworkMilestones() {
  return useSovereignPoll(sovereign.network.milestones, 300_000)
}

// Token (mixed) — adapter maps {account, balances} → {balance, pending, ...}
export function useTokenBalance() {
  const fetcher = useCallback(async () => toTokenBalanceView(await sovereign.token.balance()), [])
  return useSovereignPoll(fetcher, 60_000)
}

export function useTokenSupply() {
  return useSovereignPoll(sovereign.token.supply, 120_000)
}

// Cognitive (public) — adapter maps subsystem booleans → {status, active_agents, memory_usage_mb}
export function useCognitiveStatus() {
  const fetcher = useCallback(async () => toCognitiveStatusView(await sovereign.cognitive.status()), [])
  return useSovereignPoll(fetcher, 30_000)
}

// Onboarding (authenticated)
export function useOnboardingState() {
  return useSovereignPoll(sovereign.onboarding.state, 10_000)
}

// Seed Episodes (authenticated — Build Contract §4, C.3 Timeline)
export function useSeedEpisodes() {
  return useSovereignPoll(sovereign.seed.episodes, 30_000)
}

// Memory (authenticated — Build Contract §4, C.4 Memory) — adapter maps AgentDB stats → view model
export function useMemoryStats() {
  const fetcher = useCallback(async () => toMemoryStatsView(await sovereign.memory.stats()), [])
  return useSovereignPoll(fetcher, 60_000)
}

// Constitutional (authenticated — Build Contract §5)
export function useConstitutionalStatus() {
  return useSovereignPoll(sovereign.constitutional.status, 15_000)
}

// Terminal v1 (authenticated — Build Contract §4)
export function useTerminalState() {
  return useSovereignPoll(sovereign.terminal.state, 5_000)
}

export function useTerminalBriefing() {
  return useSovereignPoll(sovereign.terminal.briefing, 60_000)
}

// Auth (authenticated — C.7 Settings)
export function useAuthMe() {
  return useSovereignPoll(sovereign.auth.me, 60_000)
}

// Health Deep (public — C.7 Settings)
export function useHealthDeep() {
  return useSovereignPoll(sovereign.healthDeep, 30_000)
}

// ─── Aliases ────────────────────────────────────────────────────────
// Terminal components import useNodeLifecycle; the backend method is node.lifecycle.
export const useNodeLifecycle = useLifecycleStage
