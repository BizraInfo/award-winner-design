// app/api/auth/me/route.ts
/**
 * GET /api/auth/me — Returns the authenticated user's claims from the JWT.
 *
 * Used by the Settings → Team page to gate the Invite button by role.
 * Does NOT hit a database (none exists yet); it just reflects the JWT payload.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/security/api-auth';
import { ensureGenesisOwner } from '@/lib/members/ensure-genesis-owner';
import { resolveWorkspaceUser } from '@/lib/members/resolve-role';
import { isRedisUnavailableError } from '@/lib/redis/client';

// Default workspace identifier — matches app/settings/team/page.tsx until
// workspace routing ships. Any single-tenant read of /api/auth/me implicitly
// asserts membership in this workspace.
const DEFAULT_WORKSPACE_ID = 'default';

export async function GET(request: NextRequest) {
  return withAuth(request, async (_req, user) => {
    try {
      // Spec §7 — lazy genesis: first authenticated user on an empty workspace
      // is auto-seeded as Owner. No-op if the workspace already has members.
      await ensureGenesisOwner(DEFAULT_WORKSPACE_ID, user);

      // Merge workspace-scoped role into effective roles so the client's
      // permission gates (Invite button, role editors) see the same shape
      // the server uses. Mirrors lib/members/resolve-role.ts on the API.
      const effective = await resolveWorkspaceUser(DEFAULT_WORKSPACE_ID, user);

      return NextResponse.json({
        sub: effective.sub,
        email: effective.email,
        roles: effective.roles,
        permissions: effective.permissions,
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
  });
}
