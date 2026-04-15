// app/api/workspaces/[workspaceId]/members/route.ts
/**
 * GET /api/workspaces/:workspaceId/members — List members of a workspace
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/security/api-auth";
import { getMemberStore } from "@/lib/members/member-store";
import { canViewMembers } from "@/lib/members/permissions";
import { resolveWorkspaceUser } from "@/lib/members/resolve-role";
import { isRedisUnavailableError } from "@/lib/redis/client";

type RouteContext = { params: Promise<{ workspaceId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  return withAuth(request, async (_req, user) => {
    try {
      const { workspaceId } = await context.params;
      const effectiveUser = await resolveWorkspaceUser(workspaceId, user);

      if (!canViewMembers(effectiveUser)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const store = getMemberStore();
      const members = await store.listByWorkspace(workspaceId);
      return NextResponse.json({ members });
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
