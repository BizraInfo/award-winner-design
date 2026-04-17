import { NextResponse } from "next/server";
import { getRedisHealthStatus } from "@/lib/redis/client";
import type { DailyManifest } from "@/lib/dema/types";

// D1 stub — daily manifest with live health data.
export async function GET() {
  const redis = await getRedisHealthStatus();

  const manifest: DailyManifest = {
    date: new Date().toISOString().slice(0, 10),
    missionsCreated: 0,
    gatesPassed: 0,
    gatesFailed: 0,
    receiptsSealed: 0,
    chainLength: 0,
    chainHead: "0".repeat(64),
    ihsanAggregate: 0,
    systemHealth: {
      redis,
      uptime: process.uptime(),
      memberCount: 0,
    },
  };

  return NextResponse.json(manifest);
}
