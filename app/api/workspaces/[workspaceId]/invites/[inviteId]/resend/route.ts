// app/api/workspaces/[workspaceId]/invites/[inviteId]/resend/route.ts
/**
 * POST /api/workspaces/:workspaceId/invites/:inviteId/resend — Resend an invite
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/security/api-auth';
import { getInviteStore } from '@/lib/invites/invite-store';
import { generateInviteToken, hashInviteToken } from '@/lib/invites/tokens';
import { canManageInvites } from '@/lib/invites/permissions';
import { sendInviteEmail } from '@/lib/notifications/invite-email';
import { isRedisUnavailableError } from '@/lib/redis/client';
import { MAX_RESEND, INVITE_TTL_MS } from '../../route';

type RouteContext = { params: Promise<{ workspaceId: string; inviteId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  return withAuth(request, async (_req, user) => {
    try {
      const { workspaceId, inviteId } = await context.params;

      if (!canManageInvites(user)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const store = getInviteStore();
      const invite = await store.getById(inviteId);

      if (!invite || invite.workspaceId !== workspaceId) {
        return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
      }
      if (invite.status !== 'pending') {
        return NextResponse.json({ error: `Cannot resend: invite is ${invite.status}` }, { status: 400 });
      }
      if (invite.resentCount >= MAX_RESEND) {
        return NextResponse.json({ error: `Maximum resend limit (${MAX_RESEND}) reached` }, { status: 429 });
      }

      // Generate a new token (old one is invalidated by hash replacement)
      const rawToken = generateInviteToken();
      const tokenHash = hashInviteToken(rawToken);
      const now = Date.now();

      await store.update(inviteId, {
        tokenHash,
        expiresAt: now + INVITE_TTL_MS,
        resentAt: now,
        resentCount: invite.resentCount + 1,
      });

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
        || `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host') || 'localhost:3000'}`;
      const acceptUrl = `${baseUrl}/invites/${rawToken}`;

      await sendInviteEmail({
        to: invite.email,
        inviterName: user.email,
        workspaceName: workspaceId,
        role: invite.role,
        acceptUrl,
        expiresAt: new Date(now + INVITE_TTL_MS),
      });

      return NextResponse.json({ message: 'Invite resent', resentCount: invite.resentCount + 1 });
    } catch (error) {
      if (isRedisUnavailableError(error)) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: 503 }
        );
      }
      throw error;
    }
  });
}
