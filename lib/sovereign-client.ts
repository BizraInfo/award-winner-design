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
  status: "ready" | "healthy" | "degraded" | "unhealthy"
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

export interface TokenBalanceEntry {
  balance: number
  staked: number
}

export interface TokenBalance {
  account: string
  balances: Record<string, TokenBalanceEntry>
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
  cognitive_fusion_available: boolean
  subsystems: {
    moe_router: boolean
    hrm_engine: boolean
    hypergraph_rag: boolean
    northstar_engine: boolean
  }
  hypergraph_store: boolean
  memory_synthesizer: boolean
  pattern_codebook: boolean
}

// ─── Memory Types (Build Contract §3 View 4, §10.4) ──────────────

export interface MemoryStats {
  total_records: number
  active_records: number
  archived_records: number
  deleted_records: number
  indexed_vectors: number
  hnsw_capacity: number
  sqlite_path: string
  hnsw_path: string
}

export interface MemoryProfile {
  // Semantic continuity
  preferred_domains: string[]
  work_hours: { start: number; end: number } | null
  vocabulary: string[]
  // Procedural continuity
  compiled_reflexes: {
    pattern: string
    avg_ihsan: number
    execution_count: number
    avg_latency_ms: number
  }[]
  near_compile_patterns: {
    pattern: string
    count: number
    threshold: number
  }[]
}

// ─── Verifier Response (uniform shape for all /v1/verify/* endpoints) ──

export interface VerifierResponse {
  decision: "APPROVED" | "REJECTED" | "QUARANTINED"
  reason_codes: string[]
  receipt_id: string
  receipt_signature: string
  artifacts: Record<string, unknown>
}

// ─── Terminal v1 Types (Build Contract §5, §8) ─────────────────

export type TerminalStateName =
  | "boot"
  | "ready"
  | "mission_drafting"
  | "permission_review"
  | "executing"
  | "awaiting_escalation"
  | "completed"
  | "failed_recoverably"
  | "blocked_constitutionally"

export type ExecutionPathLabel = "system_1" | "system_2" | "mixed"

export interface TerminalState {
  state: TerminalStateName
  execution_path: ExecutionPathLabel
  mission_id: string
}

export interface BriefingContext {
  time_since_last_mission_s: number
  active_project: string
  last_mission_summary: string
  near_compile_patterns: string[]
  quality_trend: "improving" | "stable" | "declining"
  next_action_suggestion: string
  wallet_snapshot: { seed?: number; bloom?: number }
}

export interface WalletDelta {
  seed: number
  bloom: number
}

export interface ReflexDelta {
  compiled: boolean
  near_compile: boolean
  compile_count: number
  threshold: number
}

export interface MemoryDelta {
  episodic: number
  semantic: number
  procedural: number
}

export interface ChannelRecord {
  channel: string
  success: boolean
  duration_ms: number
}

export interface MissionReceipt {
  mission_id: string
  receipt_id: string
  status: "COMPLETE" | "PARTIAL" | "FAILED" | "BLOCKED"
  synthesis: string
  ihsan_score: number
  snr_score: number
  duration_ms: number
  channels_executed: ChannelRecord[]
  execution_path: ExecutionPathLabel
  wallet_delta: WalletDelta
  reflex_delta: ReflexDelta
  memory_delta: MemoryDelta
  hash_chain_ref: string
  action_count: number
  reflex_pattern: string
  reflex_latency_ms: number
  comparison_s2_avg_ms: number
}

export interface ConstitutionalStatus {
  status: string
  wallets: number
  events: number
  reflexes: number
  pending_receipts: number
  pending_proposals: number
  network_gini: number
  network_asabiyyah: number
  last_tick_timestamp: number | null
  tick_interval_s: number
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
    headers?: Record<string, string>
  },
): Promise<T> {
  const { body, auth = false, retries = 2, dedupe = method === "GET", headers: extraHeaders } = options ?? {}

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

    if (extraHeaders) {
      for (const [k, v] of Object.entries(extraHeaders)) {
        headers[k] = v
      }
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

  // Seed Engine (2 endpoints — policy: AUTHENTICATED)
  seed: {
    potential: () => request<SeedPotential>("GET", "seed/potential", { auth: true }),
    episodes: () =>
      request<{ count: number; episodes: SeedEpisode[] }>("GET", "seed/episodes", { auth: true }),
  },

  // Node (2 endpoints)
  node: {
    value: () => request<NodeValue>("GET", "node/value", { auth: true }),
    lifecycle: () => request<LifecycleStage>("GET", "node/lifecycle", { auth: true }),
  },

  // Network (2 endpoints — authenticated)
  network: {
    effect: (nodes = 1000) =>
      request<NetworkEffect>("GET", `network/effect?nodes=${nodes}`, { auth: true }),
    milestones: () =>
      request<{ milestones: NetworkMilestone[] }>("GET", "network/milestones", {
        auth: true,
      }),
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

  // Mission — alias for terminal.plan (golden path is POST /v1/plan)
  mission: (payload: { description: string; source?: string }) =>
    request<MissionReceipt>("POST", "plan", { body: payload, auth: true }),

  // Onboarding (2 endpoints)
  onboarding: {
    state: () => request<OnboardingState>("GET", "onboarding/state", { auth: true }),
    teach: (step: string, data: Record<string, unknown>) =>
      request<TeachResult>("POST", "onboarding/teach", {
        body: { step, ...data },
        auth: true,
      }),
  },

  // Constitutional (2 endpoints — Build Contract §5)
  constitutional: {
    status: () =>
      request<ConstitutionalStatus>("GET", "constitutional/status", { auth: true }),
  },

  // Terminal (3 endpoints — Build Contract §4, §5)
  terminal: {
    state: (sessionId?: string) =>
      request<TerminalState>("GET", "terminal/state", {
        auth: true,
        headers: sessionId ? { "X-Session-ID": sessionId } : undefined,
      }),
    briefing: () =>
      request<BriefingContext>("GET", "terminal/briefing", { auth: true }),
    plan: (payload: { description: string; source?: string }) =>
      request<MissionReceipt>("POST", "plan", { body: payload, auth: true }),
  },

  // Memory (2 endpoints — authenticated)
  memory: {
    stats: () => request<MemoryStats>("GET", "memory/stats", { auth: true }),
  },

  // Cognitive (1 endpoint)
  cognitive: {
    status: () => request<CognitiveStatus>("GET", "cognitive/status"),
  },

  // Metrics (1 endpoint)
  metrics: () => request<string>("GET", "metrics"),

  // Verify (3 endpoints — public, no auth, POST per backend)
  // All return uniform VerifierResponse: {decision, reason_codes, receipt_id, receipt_signature, artifacts}
  verify: {
    genesis: () => request<VerifierResponse>("POST", "verify/genesis"),
    envelope: (hash: string) =>
      request<VerifierResponse>("POST", "verify/envelope", {
        body: { hash },
      }),
    receipt: (hash: string) =>
      request<VerifierResponse>("POST", "verify/receipt", {
        body: { hash },
      }),
  },

  // Utilities
  isAuthenticated: () => !!getToken(),
  logout: () => clearTokens(),
  circuitState: () => breaker.currentState,
} as const
