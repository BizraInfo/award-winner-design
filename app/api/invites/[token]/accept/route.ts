// app/api/invites/[token]/accept/route.ts
/**
 * POST /api/invites/:token/accept — Accept an invite (requires auth)
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { withAuth } from '@/lib/security/api-auth';
import { getInviteStore } from '@/lib/invites/invite-store';
import { hashInviteToken } from '@/lib/invites/tokens';
import { getMemberStore, type MemberRole } from '@/lib/members/member-store';
import { DuplicateMembershipError } from '@/lib/members/errors';

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  return withAuth(request, async (_req, user) => {
    const { token } = await context.params;
    const tokenHash = hashInviteToken(token);
    const store = getInviteStore();
    const invite = await store.getByTokenHash(tokenHash);

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
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

    // Email must match the invite target
    if (user.email !== invite.email) {
      return NextResponse.json(
        { error: `This invite was sent to ${invite.email}. You are signed in as ${user.email}.` },
        { status: 403 }
      );
    }

    const memberStore = getMemberStore();
    const existingMember = await memberStore.getByUserAndWorkspace(
      invite.workspaceId,
      user.sub
    );

    // Idempotent: if user is already a member, mark the invite accepted
    // but do not mutate membership. (At this point invite.status is
    // guaranteed to be 'pending' — earlier guards rejected revoked/accepted/expired.)
    if (existingMember) {
      await store.update(invite.id, {
        status: 'accepted',
        acceptedAt: Date.now(),
        acceptedBy: user.sub,
      });
      return NextResponse.json({
        message: 'Already a member',
        workspaceId: invite.workspaceId,
        role: existingMember.role,
      });
    }

    // First mark the invite accepted, then add the membership. If membership
    // creation fails for any reason other than duplicate, revert the invite
    // so the user can retry.
    await store.update(invite.id, {
      status: 'accepted',
      acceptedAt: Date.now(),
      acceptedBy: user.sub,
    });

    try {
      await memberStore.add({
        id: randomUUID(),
        workspaceId: invite.workspaceId,
        userId: user.sub,
        email: user.email,
        role: invite.role as MemberRole,
        joinedAt: Date.now(),
        invitedBy: invite.invitedBy,
        inviteId: invite.id,
      });
    } catch (err) {
      if (!(err instanceof DuplicateMembershipError)) {
        // Revert invite status so user can retry
        await store.update(invite.id, {
          status: 'pending',
          acceptedAt: undefined,
          acceptedBy: undefined,
        });
        throw err;
      }
    }

    return NextResponse.json({
      message: 'Invite accepted',
      workspaceId: invite.workspaceId,
      role: invite.role,
    });
  });
}
