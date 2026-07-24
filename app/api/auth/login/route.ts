import { NextRequest, NextResponse } from 'next/server';
import {
  clearAuthCookies,
  revokeAllUserTokens,
  withAuth,
} from '@/lib/security/api-auth';

const AUTH_INTEGRITY_HOLD = {
  code: 'AUTH_INTEGRITY_HOLD',
  error: 'Authentication is unavailable during the public integrity review',
} as const;

function integrityHoldResponse(): NextResponse {
  return NextResponse.json(AUTH_INTEGRITY_HOLD, {
    status: 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}

/**
 * Login and refresh remain unavailable until a production identity provider
 * replaces the removed source-embedded demo registry.
 */
export async function POST(_request: NextRequest): Promise<NextResponse> {
  return integrityHoldResponse();
}

export async function PUT(_request: NextRequest): Promise<NextResponse> {
  return integrityHoldResponse();
}

/**
 * Existing authenticated sessions retain a bounded logout path.
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  return withAuth(request, async (_req, user) => {
    try {
      if (user.sub) {
        revokeAllUserTokens(user.sub);
      }

      await clearAuthCookies();

      return NextResponse.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch {
      return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
    }
  });
}
