// app/api/invites/[token]/route.ts
/**
 * GET  /api/invites/:token — View invite details (pre-accept, public-ish)
 * POST /api/invites/:token/accept — Accept an invite (requires auth)
 *
 * The GET endpoint is intentionally lightweight — it reveals only email, role,
 * workspace, and expiry. It does NOT require auth so the acceptance page can
 * render before the user logs in.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getInviteStore } from '@/lib/invites/invite-store';
import { hashInviteToken } from '@/lib/invites/tokens';
import { isRedisUnavailableError } from '@/lib/redis/client';

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const tokenHash = hashInviteToken(token);
    const store = getInviteStore();
    const invite = await store.getByTokenHash(tokenHash);

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found or expired' }, { status: 404 });
    }

    if (invite.status === 'revoked') {
      return NextResponse.json({ error: 'This invite has been revoked' }, { status: 410 });
    }
    if (invite.status === 'accepted') {
      return NextResponse.json({ error: 'This invite has already been accepted' }, { status: 410 });
    }
    if (invite.expiresAt < Date.now()) {
      return NextResponse.json({ error: 'This invite has expired' }, { status: 410 });
    }

    return NextResponse.json({
      email: invite.email,
      role: invite.role,
      workspaceId: invite.workspaceId,
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    if (isRedisUnavailableError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 503 }
      );
    }
    throw error;
  }
}
