import os from "os";

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 1500;
const DEFAULT_SCAFFOLD_API =
  process.env.SCAFFOLD_API_URL ||
  process.env.BIZRA_SCAFFOLD_API_URL ||
  "http://localhost:9740";

type ScaffoldHealth = {
  status?: string;
  version?: string;
  uptime_seconds?: number;
  components?: Record<string, unknown>;
};

type NodeHealth = {
  status: string;
  version: string;
  mode: string;
  uptime: number;
  hardware: {
    cpu_cores: number;
    ram_gb: number;
    has_gpu: boolean;
    gpu_name?: string;
  };
  agent_status: string;
  cortex: { status: string; model: string };
  scaffold?: ScaffoldHealth;
};

let cached: { timestamp: number; data: NodeHealth } | null = null;

function normalizeStatus(input?: string): string {
  if (!input) return "unknown";
  const value = input.toLowerCase();
  if (value.includes("healthy")) return "healthy";
  if (value.includes("degraded")) return "degraded";
  if (value.includes("critical") || value.includes("unhealthy")) return "unhealthy";
  return "unknown";
}

async function fetchScaffoldHealth(baseUrl: string): Promise<ScaffoldHealth | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  const url = `${baseUrl.replace(/\/$/, "")}/health`;

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    return (await response.json()) as ScaffoldHealth;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function buildHardwareSnapshot() {
  const totalMemoryGb = Math.round((os.totalmem() / 1024 / 1024 / 1024) * 10) / 10;
  return {
    cpu_cores: os.cpus().length,
    ram_gb: totalMemoryGb,
    has_gpu: false,
  };
}

export async function GET() {
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  const scaffoldHealth = await fetchScaffoldHealth(DEFAULT_SCAFFOLD_API);
  const status = normalizeStatus(scaffoldHealth?.status);

  const response: NodeHealth = {
    status,
    version: scaffoldHealth?.version || "scaffold",
    mode: process.env.NODE_ENV || "development",
    uptime: scaffoldHealth?.uptime_seconds ?? Math.floor(process.uptime()),
    hardware: buildHardwareSnapshot(),
    agent_status: scaffoldHealth ? "online" : "offline",
    cortex: {
      status: scaffoldHealth ? "ready" : "offline",
      model: scaffoldHealth ? "scaffold-core" : "unavailable",
    },
    scaffold: scaffoldHealth || undefined,
  };

  cached = { timestamp: now, data: response };
  return NextResponse.json(response);
}
