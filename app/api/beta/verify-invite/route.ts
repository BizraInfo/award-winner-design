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
import { buildPublicBetaStatus } from "@/lib/beta/public-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function admittedResponse(mode: ReturnType<typeof getBizraAccessMode>) {
  return buildPublicBetaStatus({
    admitted: true,
    measuredAt: new Date().toISOString(),
    mode,
  });
}

/**
 * POST /api/beta/verify-invite
 * Body: { code: string }
 */
export async function POST(request: NextRequest) {
  if (!isInviteOnlyAccess()) {
    return NextResponse.json(admittedResponse(getBizraAccessMode()), {
      headers: { "Cache-Control": "no-store" },
    });
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
  const response = NextResponse.json(admittedResponse("invite_only"), {
    headers: { "Cache-Control": "no-store" },
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
