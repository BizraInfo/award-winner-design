// app/api/workspaces/[workspaceId]/members/[memberId]/route.ts
/**
 * DELETE /api/workspaces/:workspaceId/members/:memberId — Remove member
 *
 * Invariants (enforced in memberStore.remove):
 *   - Admin cannot remove an Owner.
 *   - Last Owner cannot be removed (409).
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/security/api-auth";
import { getMemberStore } from "@/lib/members/member-store";
import {
  canManageMembers,
  canRemoveMemberWithRole,
} from "@/lib/members/permissions";
import {
  LastOwnerInvariantError,
  MemberNotFoundError,
} from "@/lib/members/errors";

type RouteContext = {
  params: Promise<{ workspaceId: string; memberId: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  return withAuth(request, async (_req, user) => {
    const { workspaceId, memberId } = await context.params;

    if (!canManageMembers(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const store = getMemberStore();
    const existing = await store.getById(memberId);
    if (!existing || existing.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (!canRemoveMemberWithRole(user.roles, existing.role)) {
      return NextResponse.json(
        { error: "Insufficient privileges to remove this member" },
        { status: 403 }
      );
    }

    try {
      await store.remove(memberId);
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
      throw err;
    }

    return NextResponse.json({ removed: memberId });
  });
}
