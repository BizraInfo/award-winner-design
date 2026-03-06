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
  type SeedPotential,
  type NodeValue,
  type LifecycleStage,
  type NetworkEffect,
  type NetworkMilestone,
  type TokenBalance,
  type TokenSupply,
  type CognitiveStatus,
  type OnboardingState,
} from "@/lib/sovereign-client"

// Re-export types for backward compatibility
export type {
  SovereignHealth,
  SeedPotential,
  NodeValue,
  LifecycleStage,
  NetworkEffect,
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

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const refetch = useCallback(async () => {
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

// Seed Engine (public)
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

// Network (public)
export function useNetworkEffect(nodes: number = 1000) {
  const fetcher = useCallback(() => sovereign.network.effect(nodes), [nodes])
  return useSovereignPoll(fetcher, 120_000)
}

export function useNetworkMilestones() {
  return useSovereignPoll(sovereign.network.milestones, 300_000)
}

// Token (mixed)
export function useTokenBalance() {
  return useSovereignPoll(sovereign.token.balance, 60_000)
}

export function useTokenSupply() {
  return useSovereignPoll(sovereign.token.supply, 120_000)
}

// Cognitive (public)
export function useCognitiveStatus() {
  return useSovereignPoll(sovereign.cognitive.status, 30_000)
}

// Onboarding (authenticated)
export function useOnboardingState() {
  return useSovereignPoll(sovereign.onboarding.state, 10_000)
}
