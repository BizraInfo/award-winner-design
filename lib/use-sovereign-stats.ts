"use client";

/**
 * useSovereignStats — client-side hook for live kernel data.
 *
 * The kernel runs on the USER's machine at localhost:9740.
 * This hook fetches directly from the browser → user's kernel.
 * Works when the user has BIZRA running. Shows defaults otherwise.
 */

import { useEffect, useState, useCallback } from "react";

const KERNEL_URL = "http://127.0.0.1:9740";
const POLL_INTERVAL_MS = 15_000; // 15 seconds

export interface SovereignStats {
  kernelAlive: boolean;
  version: string;
  uptimeSeconds: number;
  seedBalance: number;
  totalMissions: number;
  knowledgeEntries: number;
  receiptsRecorded: number;
  seedTreasury: number;
  cpu: string;
  cores: number;
  ramGb: number;
  gpu: string;
  agents: number;
  nodeId: string;
}

const DEFAULTS: SovereignStats = {
  kernelAlive: false,
  version: "0.88.1",
  uptimeSeconds: 0,
  seedBalance: 0,
  totalMissions: 0,
  knowledgeEntries: 0,
  receiptsRecorded: 0,
  seedTreasury: 0,
  cpu: "",
  cores: 0,
  ramGb: 0,
  gpu: "",
  agents: 12,
  nodeId: "not connected",
};

async function fetchStats(): Promise<SovereignStats> {
  try {
    const resp = await fetch(`${KERNEL_URL}/api/live-stats`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) return { ...DEFAULTS };
    const data = await resp.json();

    return {
      kernelAlive: data.kernel?.alive ?? false,
      version: data.kernel?.version ?? "0.88.1",
      uptimeSeconds: data.kernel?.uptime_s ?? 0,
      seedBalance: data.seed?.balance ?? 0,
      totalMissions: data.seed?.total_missions ?? 0,
      knowledgeEntries: data.urp?.knowledge_entries ?? 0,
      receiptsRecorded: data.urp?.receipts ?? 0,
      seedTreasury: data.urp?.treasury ?? 0,
      cpu: data.hardware?.cpu ?? "",
      cores: data.hardware?.cores ?? 0,
      ramGb: data.hardware?.ram_gb ?? 0,
      gpu: data.hardware?.gpu ?? "",
      agents: data.node?.agents ?? 12,
      nodeId: data.node?.node_id ?? "not connected",
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function useSovereignStats(): SovereignStats {
  const [stats, setStats] = useState<SovereignStats>(DEFAULTS);

  const refresh = useCallback(async () => {
    const s = await fetchStats();
    setStats(s);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  return stats;
}
