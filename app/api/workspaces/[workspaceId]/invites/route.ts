// app/api/workspaces/[workspaceId]/invites/route.ts
/**
 * POST /api/workspaces/:workspaceId/invites — Create a new invite
 * GET  /api/workspaces/:workspaceId/invites — List invites for workspace
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type UserPayload } from '@/lib/security/api-auth';
import {
  getInviteStore,
  isDuplicatePendingInviteError,
  type InviteRole,
} from '@/lib/invites/invite-store';
import { generateInviteToken, hashInviteToken } from '@/lib/invites/tokens';
import { canManageInvites, canViewInvites, canAssignRole } from '@/lib/invites/permissions';
import { resolveWorkspaceUser } from '@/lib/members/resolve-role';
import { sendInviteEmail } from '@/lib/notifications/invite-email';
import { isRedisUnavailableError } from '@/lib/redis/client';
import { randomUUID } from 'crypto';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_RESEND = 3;
const VALID_ROLES: InviteRole[] = ['owner', 'admin', 'member', 'viewer'];

// Simple email format check — not exhaustive, just structural
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

type RouteContext = { params: Promise<{ workspaceId: string }> };

// ═══════════════════════════════════════════════════════════════════════════════
// POST — Create Invite
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest, context: RouteContext) {
  return withAuth(request, async (_req, user) => {
    try {
      const { workspaceId } = await context.params;
      const effectiveUser = await resolveWorkspaceUser(workspaceId, user);

      if (!canManageInvites(effectiveUser)) {
        return NextResponse.json({ error: 'Forbidden: invite management requires admin role' }, { status: 403 });
      }

      let body: { email?: string; role?: string; message?: string };
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }

      const { email, role, message } = body;
      if (message !== undefined && (typeof message !== 'string' || message.length > 500)) {
        return NextResponse.json({ error: 'Message must be a string ≤ 500 chars' }, { status: 400 });
      }

      if (!email || !isValidEmail(email)) {
        return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
      }
      if (!role || !VALID_ROLES.includes(role as InviteRole)) {
        return NextResponse.json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 });
      }
      if (!canAssignRole(effectiveUser.roles, role)) {
        const msg =
          role === 'owner'
            ? 'Only an existing Owner can grant the Owner role'
            : 'Insufficient privileges to assign this role';
        return NextResponse.json({ error: msg }, { status: 403 });
      }

      const store = getInviteStore();

      // Check for existing pending invite to same email in same workspace
      const existing = await store.listByWorkspace(workspaceId);
      const duplicate = existing.find(
        (inv) => inv.email === email && inv.status === 'pending' && inv.expiresAt > Date.now()
      );
      if (duplicate) {
        return NextResponse.json(
          { error: 'A pending invite already exists for this email in this workspace' },
          { status: 409 }
        );
      }

      const rawToken = generateInviteToken();
      const tokenHash = hashInviteToken(rawToken);
      const now = Date.now();

      const invite = {
        id: randomUUID(),
        workspaceId,
        email,
        role: role as InviteRole,
        tokenHash,
        status: 'pending' as const,
        invitedBy: user.sub,
        createdAt: now,
        expiresAt: now + INVITE_TTL_MS,
        resentCount: 0,
      };

      await store.create(invite);

      const acceptUrl = `${getBaseUrl(request)}/invites/${rawToken}`;

      await sendInviteEmail({
        to: email,
        inviterName: user.email,
        workspaceName: workspaceId,
        role,
        acceptUrl,
        expiresAt: new Date(invite.expiresAt),
      });

      return NextResponse.json(
        {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          status: invite.status,
          expiresAt: invite.expiresAt,
        },
        { status: 201 }
      );
    } catch (error) {
      if (isDuplicatePendingInviteError(error)) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
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

// ═══════════════════════════════════════════════════════════════════════════════
// GET — List Invites
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest, context: RouteContext) {
  return withAuth(request, async (_req, user) => {
    try {
      const { workspaceId } = await context.params;
      const effectiveUser = await resolveWorkspaceUser(workspaceId, user);

      if (!canViewInvites(effectiveUser)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const store = getInviteStore();
      const invites = await store.listByWorkspace(workspaceId);

      // Never expose tokenHash to clients
      const safe = invites.map(({ tokenHash: _h, ...rest }) => rest);

      return NextResponse.json({ invites: safe });
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

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function getBaseUrl(request: NextRequest): string {
  // Prefer explicit env var to prevent Host Header Injection
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

// Re-export for use by resend/revoke sub-routes
export { MAX_RESEND, INVITE_TTL_MS };
