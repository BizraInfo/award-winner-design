import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  BIZRA_BETA_ADMIT_COOKIE,
  getBizraAccessMode,
} from "@/lib/beta/access-mode";
import { verifyBetaAdmitToken } from "@/lib/beta/admit-token";
import { buildPublicBetaStatus } from "@/lib/beta/public-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/beta/status — public beta admission state (no secrets).
 */
export async function GET() {
  const mode = getBizraAccessMode();
  const cookieStore = await cookies();
  const token = cookieStore.get(BIZRA_BETA_ADMIT_COOKIE)?.value ?? null;
  const admitted = mode === "public" || verifyBetaAdmitToken(token);

  return NextResponse.json(
    buildPublicBetaStatus({
      admitted,
      measuredAt: new Date().toISOString(),
      mode,
    }),
    { headers: { "Cache-Control": "no-store" } },
  );
}
