import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  BIZRA_BETA_ADMIT_COOKIE,
  getBizraAccessMode,
  isInviteOnlyAccess,
  parseBetaInviteCodes,
} from "@/lib/beta/access-mode";
import { verifyBetaAdmitToken } from "@/lib/beta/admit-token";
import { buildOnboardingClosedLoopReport } from "@/lib/beta/onboarding-closed-loop";
import { getRedisHealthStatus } from "@/lib/redis/client";

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
  const redis = await getRedisHealthStatus().catch(() => "unknown" as const);
  const loop = buildOnboardingClosedLoopReport({ redis, admitted });

  return NextResponse.json(
    {
      mode,
      admitted,
      invite_only: isInviteOnlyAccess(),
      invite_codes_configured: parseBetaInviteCodes().length > 0,
      label: mode === "invite_only" ? "BETA · INVITATION ONLY" : "PUBLIC",
      closed_loop: loop,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
