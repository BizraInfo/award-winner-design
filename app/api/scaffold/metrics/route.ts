import { NextResponse } from "next/server";

import { loadScaffoldMetrics } from "@/lib/scaffold/metrics";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const metrics = await loadScaffoldMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Failed to load scaffold metrics:", error);
    return NextResponse.json(
      { error: "Unable to load scaffold metrics" },
      { status: 500 },
    );
  }
}
