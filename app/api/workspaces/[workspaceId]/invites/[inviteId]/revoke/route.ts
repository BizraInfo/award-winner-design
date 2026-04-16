// app/api/workspaces/[workspaceId]/invites/[inviteId]/revoke/route.ts
/**
 * POST /api/workspaces/:workspaceId/invites/:inviteId/revoke — Revoke an invite
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/security/api-auth';
import { getInviteStore } from '@/lib/invites/invite-store';
import { canManageInvites } from '@/lib/invites/permissions';
import { resolveWorkspaceUser } from '@/lib/members/resolve-role';
import { isRedisUnavailableError } from '@/lib/redis/client';

type RouteContext = { params: Promise<{ workspaceId: string; inviteId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  return withAuth(request, async (_req, user) => {
    try {
      const { workspaceId, inviteId } = await context.params;
      const effectiveUser = await resolveWorkspaceUser(workspaceId, user);

      if (!canManageInvites(effectiveUser)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const store = getInviteStore();
      const invite = await store.getById(inviteId);

      if (!invite || invite.workspaceId !== workspaceId) {
        return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
      }
      if (invite.status !== 'pending') {
        return NextResponse.json({ error: `Cannot revoke: invite is ${invite.status}` }, { status: 400 });
      }

      await store.update(inviteId, { status: 'revoked' });

      return NextResponse.json({ message: 'Invite revoked' });
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
