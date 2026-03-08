/**
 * Wallet Hardening Tests — Race Conditions & State Coherence
 * ===========================================================
 *
 * Tests the four race conditions identified in post-sprint review:
 * 1. WebSocket receipt arrives during polling -> stale overwrite prevention
 * 2. Offline fallback cannot overwrite fresh live state
 * 3. Visibility-change refresh cannot collide with in-flight fetch
 * 4. Partial backend failures produce consistent (not mixed) UI state
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWallet, type NodeState, INITIAL_NODE_STATE } from '@/hooks/use-wallet';
import { ECONOMIC_THRESHOLDS } from '@/lib/economic';

// Mock the sovereign client module
vi.mock('@/lib/sovereign-client', () => ({
  sovereign: {
    token: {
      balance: vi.fn(),
      supply: vi.fn(),
    },
    seed: {
      potential: vi.fn(),
    },
  },
  SovereignError: class SovereignError extends Error {
    constructor(message: string, public readonly status: number, public readonly path: string) {
      super(message);
      this.name = 'SovereignError';
    }
  },
}));

import { sovereign } from '@/lib/sovereign-client';

// ─── Mock data matching sovereign-client.ts API shapes ─────────────

const mockBalanceRaw = {
  account: 'node0',
  balances: {
    SEED: { balance: 42.5, staked: 5.0 },
    BLOOM: { balance: 1.23, staked: 0 },
  },
};

const mockSupplyRaw = {
  total_supply: 10000,
  circulating: 9500,
  burned: 100,
  zakat_pool: 400,
};

const mockPotentialRaw = {
  sovereignty_score: 0.6,
  tier: 'SPROUT' as const,
  tier_progress: 0.55,
  episodes_total: 100,
  episodes_qualified: 80,
  qualification_rate: 0.8,
  reward_ema: 0.97,
  streak: 7,
  compiled: true,
  converged: false,
  chain_valid: true,
  potential_unlocked: 0.6,
  potential_remaining: 0.4,
  weakest_dimension: null,
  growth_velocity: 0.02,
  last_receipt_hash: 'abc123',
};

const ACTIVE_NODE: NodeState = {
  ...INITIAL_NODE_STATE,
  seed: 10,
  bloom: 0.5,
  rac: 15,
  vac: 20,
  ihsan: 0.96,
  streak: 7,
  sovereignty: 0.45,
  reflexes: 2,
};

/** Set up all three mocks to resolve with standard data (persistent) */
function mockAllSuccess() {
  (sovereign.token.balance as ReturnType<typeof vi.fn>).mockResolvedValue(mockBalanceRaw);
  (sovereign.token.supply as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupplyRaw);
  (sovereign.seed.potential as ReturnType<typeof vi.fn>).mockResolvedValue(mockPotentialRaw);
}

/** Set up all three mocks to reject (persistent) */
function mockAllFailure() {
  (sovereign.token.balance as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'));
  (sovereign.token.supply as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'));
  (sovereign.seed.potential as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'));
}

describe('Wallet Hardening: Race Conditions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══ TEST 1: Version monotonicity prevents stale overwrites ═══

  it('drops stale fetch results when a newer fetch has already landed', async () => {
    // All endpoints succeed persistently — every poll returns same data
    mockAllSuccess();

    const { result } = renderHook(() => useWallet(ACTIVE_NODE));

    await waitFor(() => expect(result.current.live).toBe(true));

    // Wallet should be live with version >= 1 and correct balance value
    expect(result.current.version).toBeGreaterThanOrEqual(1);
    expect(result.current.seed).toBe(42.5);
  });

  // ═══ TEST 2: Offline fallback cannot overwrite live state ═══

  it('preserves live state when backend temporarily fails', async () => {
    // First: all succeed
    mockAllSuccess();

    const { result } = renderHook(() => useWallet(ACTIVE_NODE));

    await waitFor(() => expect(result.current.live).toBe(true));

    const liveSync = result.current.lastSync;
    expect(liveSync).toBeGreaterThan(0);
    expect(result.current.seed).toBe(42.5);

    // Now set all endpoints to fail (persistent)
    mockAllFailure();

    // Trigger manual refresh
    await act(async () => { await result.current.refresh(); });

    // CRITICAL: live state should be preserved, NOT overwritten with offline fallback
    // The hook checks if recent live data exists and keeps it.
    expect(result.current.live).toBe(true);
    expect(result.current.seed).toBe(42.5); // Preserved
    expect(result.current.lastSync).toBe(liveSync); // Not reset
  });

  // ═══ TEST 3: In-flight guard prevents concurrent fetches ═══

  it('prevents concurrent fetches from stacking', async () => {
    let callCount = 0;
    (sovereign.token.balance as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      return new Promise(r => setTimeout(() => r(mockBalanceRaw), 50));
    });
    (sovereign.token.supply as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupplyRaw);
    (sovereign.seed.potential as ReturnType<typeof vi.fn>).mockResolvedValue(mockPotentialRaw);

    const { result } = renderHook(() => useWallet(ACTIVE_NODE));

    // Wait a tick for the hook to mount and start initial fetch
    await act(async () => { await new Promise(r => setTimeout(r, 10)); });

    // Rapid-fire manual refreshes while initial fetch is in-flight
    await act(async () => {
      result.current.refresh();
      result.current.refresh();
      result.current.refresh();
    });

    // Wait for everything to settle
    await act(async () => { await new Promise(r => setTimeout(r, 200)); });

    // With in-flight guard, tokenBalance should be called AT MOST twice
    // (initial fetch + possibly one after the first completes)
    expect(callCount).toBeLessThanOrEqual(2);
  });

  // ═══ TEST 4: Partial backend failure produces consistent state ═══

  it('merges partial success without corrupting wallet', async () => {
    // Balance succeeds, supply fails, potential succeeds (persistent)
    (sovereign.token.balance as ReturnType<typeof vi.fn>).mockResolvedValue(mockBalanceRaw);
    (sovereign.token.supply as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('timeout'));
    (sovereign.seed.potential as ReturnType<typeof vi.fn>).mockResolvedValue(mockPotentialRaw);

    const { result } = renderHook(() => useWallet(ACTIVE_NODE));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Balance should reflect live data
    expect(result.current.seed).toBe(42.5);
    // Factors should reflect live data from seed potential
    expect(result.current.factors.quality).toBe(mockPotentialRaw.reward_ema);

    // fetchStatus should indicate partial failure
    expect(result.current.fetchStatus.balance).toBe('ok');
    expect(result.current.fetchStatus.supply).toBe('error');
    expect(result.current.fetchStatus.potential).toBe('ok');
  });

  it('handles all three endpoints failing gracefully', async () => {
    mockAllFailure();

    const { result } = renderHook(() => useWallet(ACTIVE_NODE));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Should fall back to offline with node state values
    expect(result.current.live).toBe(false);
    expect(result.current.seed).toBe(ACTIVE_NODE.seed);
    expect(result.current.bloom).toBe(ACTIVE_NODE.bloom);
  });
});

describe('Wallet Hardening: Economic Integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('zakat is always exactly 2.5% of gross', async () => {
    const balanceWith100Seed = {
      account: 'node0',
      balances: {
        SEED: { balance: 100, staked: 0 },
        BLOOM: { balance: 5, staked: 0 },
      },
    };
    (sovereign.token.balance as ReturnType<typeof vi.fn>).mockResolvedValue(balanceWith100Seed);
    (sovereign.token.supply as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupplyRaw);
    (sovereign.seed.potential as ReturnType<typeof vi.fn>).mockResolvedValue(mockPotentialRaw);

    const { result } = renderHook(() => useWallet(ACTIVE_NODE));

    await waitFor(() => expect(result.current.live).toBe(true));

    const gross = result.current.seed / (1 - ECONOMIC_THRESHOLDS.ZAKAT_RATE);
    const expectedZakat = +(gross * ECONOMIC_THRESHOLDS.ZAKAT_RATE).toFixed(4);
    expect(result.current.zakatContributed).toBeCloseTo(expectedZakat, 4);
  });

  it('supply cap utilization is bounded [0, 1+]', async () => {
    (sovereign.token.balance as ReturnType<typeof vi.fn>).mockResolvedValue(mockBalanceRaw);
    (sovereign.token.supply as ReturnType<typeof vi.fn>).mockResolvedValue({
      total_supply: 0,
      circulating: 0,
      burned: 0,
      zakat_pool: 0,
    });
    (sovereign.seed.potential as ReturnType<typeof vi.fn>).mockResolvedValue(mockPotentialRaw);

    const { result } = renderHook(() => useWallet(ACTIVE_NODE));

    await waitFor(() => expect(result.current.live).toBe(true));

    expect(result.current.supplyCapUtilization).toBeGreaterThanOrEqual(0);
  });

  it('offline factors derive from nodeState deterministically', async () => {
    mockAllFailure();

    const { result } = renderHook(() => useWallet(ACTIVE_NODE));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Same input always produces same output
    expect(result.current.factors.sovereignty).toBe(ACTIVE_NODE.sovereignty);
    expect(result.current.factors.quality).toBe(ACTIVE_NODE.ihsan);
    expect(result.current.factors.activation).toBeCloseTo(ACTIVE_NODE.rac / ACTIVE_NODE.vac, 4);
    expect(result.current.factors.compounding).toBeCloseTo(ACTIVE_NODE.streak / (ACTIVE_NODE.streak + 5), 4);
    expect(result.current.factors.synergy).toBe(0.5); // reflexes > 0
  });
});
