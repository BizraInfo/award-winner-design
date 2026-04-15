// app/api/workspaces/[workspaceId]/members/[memberId]/role/route.ts
/**
 * PATCH /api/workspaces/:workspaceId/members/:memberId/role — Change role
 *
 * Invariants (enforced in memberStore.updateRole):
 *   - Owner can only be assigned by an existing Owner.
 *   - Last-owner demotion is blocked (409).
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/security/api-auth";
import { getMemberStore, type MemberRole } from "@/lib/members/member-store";
import {
  canManageMembers,
  canAssignMemberRole,
} from "@/lib/members/permissions";
import { LastOwnerInvariantError, MemberNotFoundError } from "@/lib/members/errors";
import { isRedisUnavailableError } from "@/lib/redis/client";

const VALID_ROLES: MemberRole[] = ["owner", "admin", "member", "viewer"];

type RouteContext = {
  params: Promise<{ workspaceId: string; memberId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  return withAuth(request, async (_req, user) => {
    try {
      const { workspaceId, memberId } = await context.params;

      if (!canManageMembers(user)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      let body: { role?: string };
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON body" },
          { status: 400 }
        );
      }

      const { role } = body;
      if (!role || !VALID_ROLES.includes(role as MemberRole)) {
        return NextResponse.json(
          { error: `Role must be one of: ${VALID_ROLES.join(", ")}` },
          { status: 400 }
        );
      }

      if (!canAssignMemberRole(user.roles, role)) {
        return NextResponse.json(
          {
            error:
              role === "owner"
                ? "Only an existing Owner can grant the Owner role"
                : "Insufficient privileges to assign this role",
          },
          { status: 403 }
        );
      }

      const store = getMemberStore();
      const existing = await store.getById(memberId);
      if (!existing || existing.workspaceId !== workspaceId) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }

      try {
        await store.updateRole(memberId, role as MemberRole, user.sub);
      } catch (err) {
        if (err instanceof LastOwnerInvariantError) {
          return NextResponse.json(
            { error: err.message, code: err.code },
            { status: 409 }
          );
        }
        if (err instanceof MemberNotFoundError) {
          return NextResponse.json(
            { error: err.message, code: err.code },
            { status: 404 }
          );
        }
        if (isRedisUnavailableError(err)) {
          return NextResponse.json(
            { error: err.message, code: err.code },
            { status: 503 }
          );
        }
        throw err;
      }

      const updated = await store.getById(memberId);
      return NextResponse.json({ member: updated });
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
