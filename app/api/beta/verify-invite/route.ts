import { NextRequest, NextResponse } from "next/server";
import {
  betaAdmitCookieOptions,
  mintBetaAdmitToken,
} from "@/lib/beta/admit-token";
import {
  getBizraAccessMode,
  isInviteOnlyAccess,
  verifyInviteCode,
} from "@/lib/beta/access-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/beta/verify-invite
 * Body: { code: string }
 */
export async function POST(request: NextRequest) {
  if (!isInviteOnlyAccess()) {
    return NextResponse.json({ admitted: true, mode: getBizraAccessMode() });
  }

  let body: { code?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code : "";
  if (!verifyInviteCode(code)) {
    return NextResponse.json(
      {
        error: "Invalid or expired invitation code",
        admitted: false,
      },
      { status: 403 },
    );
  }

  const token = mintBetaAdmitToken();
  if (!token) {
    return NextResponse.json(
      {
        error:
          "Beta gate secret not configured (set BIZRA_BETA_GATE_SECRET or JWT_SECRET)",
        admitted: false,
      },
      { status: 503 },
    );
  }

  const opts = betaAdmitCookieOptions(30 * 24 * 60 * 60);
  const response = NextResponse.json({
    admitted: true,
    mode: "invite_only",
    message: "Invitation accepted. You may initialize your node.",
  });
  response.cookies.set(opts.name, token, {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    path: opts.path,
    maxAge: opts.maxAge,
  });
  return response;
}
