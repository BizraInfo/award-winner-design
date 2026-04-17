import { NextRequest, NextResponse } from "next/server";
import type { AdmissibilityResult, Invariant, Verdict } from "@/lib/dema/types";

type Ctx = { params: Promise<{ missionId: string }> };

const INVARIANTS: Invariant[] = [
  "ZANN_ZERO",
  "CLAIM_MUST_BIND",
  "RIBA_ZERO",
  "NO_SHADOW_STATE",
  "IHSAN_FLOOR",
];

// D1 stub — returns all-PERMIT admissibility result.
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { missionId } = await ctx.params;

  const result: AdmissibilityResult = {
    missionId,
    finalVerdict: "PERMIT" as Verdict,
    gates: INVARIANTS.map((inv) => ({
      invariant: inv,
      verdict: "PERMIT" as Verdict,
      reason: null,
      score: inv === "IHSAN_FLOOR" ? 0.97 : null,
    })),
    timestamp: Date.now(),
  };

  return NextResponse.json(result);
}
