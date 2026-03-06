/**
 * Sovereign API Client — Phase 76
 *
 * Typed client for all 22 sovereign backend endpoints.
 * Features: JWT auth, automatic retry with exponential backoff,
 * circuit breaker, request deduplication.
 *
 * Usage:
 *   import { sovereign } from "@/lib/sovereign-client"
 *   const health = await sovereign.health()
 *   const potential = await sovereign.seed.potential()
 */

// ─── Types ───────────────────────────────────────────────────────

export interface SovereignHealth {
  status: "ready" | "degraded" | "unhealthy"
  tier: string
  critical_subsystems: {
    evidence_ledger: string
    snr_maximizer: string
    guardian_council: string
  }
  seed_engine?: {
    active: boolean
    episodes: number
    tier: string
    compiled: boolean
    streak: number
  }
}

export interface HealthDeep extends SovereignHealth {
  subsystems: Record<string, { status: string; latency_ms: number }>
}

export interface SeedPotential {
  sovereignty_score: number
  tier: "SEED" | "SPROUT" | "TREE" | "FOREST"
  tier_progress: number
  episodes_total: number
  episodes_qualified: number
  qualification_rate: number
  reward_ema: number
  streak: number
  compiled: boolean
  converged: boolean
  chain_valid: boolean
  potential_unlocked: number
  potential_remaining: number
  weakest_dimension: string | null
  growth_velocity: number
  last_receipt_hash: string
}

export interface SeedEpisode {
  episode_id: string
  timestamp: string
  reward: number
  qualified: boolean
  dimensions: Record<string, number>
}

export interface NodeValue {
  potential: number
  activation: number
  quality: number
  compounding: number
  synergy: number
  composite: number
  tier: string
  human_stage: string
  timestamp: string
}

export interface LifecycleStage {
  current_stage: string
  rank: number
  progress: number
  sovereignty_score: number
  next_stage: string | null
  next_threshold: number | null
  points_to_next: number
  description: string
  unlock_condition: string
}

export interface NetworkEffect {
  nodes: number
  skills_available: number
  compute_tflops: number
  latency_factor: number
  intelligence_density: number
  cost_per_node: number
}

export interface NetworkMilestone {
  nodes: number
  skills: number
  tflops: number
  latency_factor: number
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface UserProfile {
  id: string
  username: string
  tier: string
  sovereignty_score: number
  created_at: string
}

export interface TokenBalance {
  balance: number
  pending: number
  total_earned: number
  zakat_contributed: number
}

export interface TokenSupply {
  total_supply: number
  circulating: number
  burned: number
  zakat_pool: number
}

export interface MissionResult {
  mission_id: string
  status: string
  result: unknown
  receipt_hash: string
}

export interface OnboardingState {
  step: number
  total_steps: number
  completed: string[]
  current: string
  profile: Record<string, unknown>
}

export interface TeachResult {
  step: string
  accepted: boolean
  next_step: string | null
  profile_update: Record<string, unknown>
}

export interface CognitiveStatus {
  status: string
  active_agents: number
  memory_usage_mb: number
}

// ─── Circuit Breaker ─────────────────────────────────────────────

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN"

class CircuitBreaker {
  private state: CircuitState = "CLOSED"
  private failures = 0
  private lastFailure = 0
  private readonly threshold = 5
  private readonly resetMs = 30_000

  canRequest(): boolean {
    if (this.state === "CLOSED") return true
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailure > this.resetMs) {
        this.state = "HALF_OPEN"
        return true
      }
      return false
    }
    return true // HALF_OPEN allows one probe
  }

  recordSuccess(): void {
    this.failures = 0
    this.state = "CLOSED"
  }

  recordFailure(): void {
    this.failures++
    this.lastFailure = Date.now()
    if (this.failures >= this.threshold) {
      this.state = "OPEN"
    }
  }

  get currentState(): CircuitState {
    return this.state
  }
}

// ─── Client Core ─────────────────────────────────────────────────

const TOKEN_KEY = "bizra_api_token"
const REFRESH_KEY = "bizra_refresh_token"

const breaker = new CircuitBreaker()

// Deduplication: prevent identical concurrent requests
const inflight = new Map<string, Promise<unknown>>()

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

function setTokens(access: string, refresh?: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(TOKEN_KEY, access)
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
}

function clearTokens(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

async function request<T>(
  method: string,
  path: string,
  options?: {
    body?: unknown
    auth?: boolean
    retries?: number
    dedupe?: boolean
  },
): Promise<T> {
  const { body, auth = false, retries = 2, dedupe = method === "GET" } = options ?? {}

  // Circuit breaker check
  if (!breaker.canRequest()) {
    throw new SovereignError("Circuit breaker open — backend unavailable", 503, path)
  }

  // Deduplication for GET requests
  const dedupeKey = `${method}:${path}`
  if (dedupe && inflight.has(dedupeKey)) {
    return inflight.get(dedupeKey) as Promise<T>
  }

  const execute = async (attempt: number): Promise<T> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    }

    if (auth) {
      const token = getToken()
      if (token) headers["Authorization"] = `Bearer ${token}`
    }

    try {
      const res = await fetch(`/api/v1/${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })

      if (res.status === 401 && auth) {
        clearTokens()
        throw new SovereignError("Authentication expired", 401, path)
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new SovereignError(
          err.error || err.detail || `HTTP ${res.status}`,
          res.status,
          path,
        )
      }

      breaker.recordSuccess()
      return (await res.json()) as T
    } catch (e) {
      if (e instanceof SovereignError) {
        // Don't retry client errors (4xx)
        if (e.status >= 400 && e.status < 500) throw e
      }

      breaker.recordFailure()

      if (attempt < retries) {
        const delay = Math.min(1000 * 2 ** attempt, 8000)
        await new Promise((r) => setTimeout(r, delay))
        return execute(attempt + 1)
      }

      throw e instanceof SovereignError
        ? e
        : new SovereignError("Network error", 0, path)
    }
  }

  const promise = execute(0)

  if (dedupe) {
    inflight.set(dedupeKey, promise)
    promise.finally(() => inflight.delete(dedupeKey))
  }

  return promise
}

// ─── Error Class ─────────────────────────────────────────────────

export class SovereignError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly path: string,
  ) {
    super(message)
    this.name = "SovereignError"
  }
}

// ─── Public API (22 endpoints) ───────────────────────────────────

export const sovereign = {
  // Health (3 endpoints)
  health: () => request<SovereignHealth>("GET", "health"),
  healthDeep: () => request<HealthDeep>("GET", "health/deep"),
  status: () => request<{ status: string }>("GET", "status"),

  // Seed Engine (2 endpoints)
  seed: {
    potential: () => request<SeedPotential>("GET", "seed/potential"),
    episodes: () => request<{ episodes: SeedEpisode[] }>("GET", "seed/episodes"),
  },

  // Node (2 endpoints)
  node: {
    value: () => request<NodeValue>("GET", "node/value", { auth: true }),
    lifecycle: () => request<LifecycleStage>("GET", "node/lifecycle", { auth: true }),
  },

  // Network (2 endpoints)
  network: {
    effect: (nodes = 1000) =>
      request<NetworkEffect>("GET", `network/effect?nodes=${nodes}`),
    milestones: () =>
      request<{ milestones: NetworkMilestone[] }>("GET", "network/milestones"),
  },

  // Auth (3 endpoints)
  auth: {
    register: (payload: {
      username: string
      email: string
      password: string
      accept_covenant: boolean
    }) => request<AuthTokens>("POST", "auth/register", { body: payload }),

    login: (credentials: { email: string; password: string }) =>
      request<AuthTokens>("POST", "auth/login", { body: credentials }).then(
        (tokens) => {
          setTokens(tokens.access_token, tokens.refresh_token)
          return tokens
        },
      ),

    me: () => request<UserProfile>("GET", "auth/me", { auth: true }),
  },

  // Token (2 endpoints)
  token: {
    balance: () => request<TokenBalance>("GET", "token/balance", { auth: true }),
    supply: () => request<TokenSupply>("GET", "token/supply"),
  },

  // Mission (1 endpoint)
  mission: (payload: { objective: string; context?: Record<string, unknown> }) =>
    request<MissionResult>("POST", "mission", { body: payload, auth: true }),

  // Onboarding (2 endpoints)
  onboarding: {
    state: () => request<OnboardingState>("GET", "onboarding/state", { auth: true }),
    teach: (step: string, data: Record<string, unknown>) =>
      request<TeachResult>("POST", "onboarding/teach", {
        body: { step, ...data },
        auth: true,
      }),
  },

  // Cognitive (1 endpoint)
  cognitive: {
    status: () => request<CognitiveStatus>("GET", "cognitive/status"),
  },

  // Metrics (1 endpoint)
  metrics: () => request<string>("GET", "metrics"),

  // Verify (3 endpoints — public, no auth)
  verify: {
    genesis: () => request<{ valid: boolean; hash: string }>("GET", "verify/genesis"),
    envelope: (hash: string) =>
      request<{ valid: boolean }>("GET", `verify/envelope?hash=${hash}`),
    receipt: (hash: string) =>
      request<{ valid: boolean; receipt: unknown }>(
        "GET",
        `verify/receipt?hash=${hash}`,
      ),
  },

  // Utilities
  isAuthenticated: () => !!getToken(),
  logout: () => clearTokens(),
  circuitState: () => breaker.currentState,
} as const
