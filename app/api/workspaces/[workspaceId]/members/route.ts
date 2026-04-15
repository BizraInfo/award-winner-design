// app/api/workspaces/[workspaceId]/members/route.ts
/**
 * GET /api/workspaces/:workspaceId/members — List members of a workspace
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/security/api-auth";
import { getMemberStore } from "@/lib/members/member-store";
import { canViewMembers } from "@/lib/members/permissions";

type RouteContext = { params: Promise<{ workspaceId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  return withAuth(request, async (_req, user) => {
    const { workspaceId } = await context.params;

    if (!canViewMembers(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const store = getMemberStore();
    const members = await store.listByWorkspace(workspaceId);
    return NextResponse.json({ members });
  });
}
