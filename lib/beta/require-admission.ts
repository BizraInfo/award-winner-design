import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  BIZRA_BETA_ADMIT_COOKIE,
  isInviteOnlyAccess,
} from "@/lib/beta/access-mode";
import { verifyBetaAdmitToken } from "@/lib/beta/admit-token";

export async function requireBetaAdmission(): Promise<NextResponse | null> {
  if (!isInviteOnlyAccess()) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get(BIZRA_BETA_ADMIT_COOKIE)?.value ?? null;
  if (verifyBetaAdmitToken(token)) return null;
  return NextResponse.json(
    {
      error: "Beta invitation required",
      code: "BETA_INVITE_REQUIRED",
      admitted: false,
    },
    { status: 403 },
  );
}
