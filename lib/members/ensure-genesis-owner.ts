// lib/members/ensure-genesis-owner.ts
/**
 * Lazy genesis owner seeding (spec §7).
 *
 * When an authenticated user hits /api/auth/me for a workspace with zero
 * members, they are automatically seeded as `owner`. This is the ONLY code
 * path that creates an owner without an existing owner present.
 *
 * Race safety: the in-memory store's add() checks for duplicates; concurrent
 * callers will collapse to a single seeded owner (the loser hits
 * DuplicateMembershipError which we swallow here — the winner owns).
 */

import { randomUUID } from "crypto";
import { getMemberStore } from "./member-store";
import { DuplicateMembershipError } from "./errors";
import type { UserPayload } from "@/lib/security/api-auth";

export async function ensureGenesisOwner(
  workspaceId: string,
  user: UserPayload
): Promise<void> {
  const store = getMemberStore();
  const existing = await store.getByUserAndWorkspace(workspaceId, user.sub);
  if (existing) return;

  const members = await store.listByWorkspace(workspaceId);
  if (members.length > 0) return; // workspace already has members; no genesis

  try {
    await store.add({
      id: randomUUID(),
      workspaceId,
      userId: user.sub,
      email: user.email,
      role: "owner",
      joinedAt: Date.now(),
      // invitedBy / inviteId intentionally unset — genesis owner has no inviter
    });
  } catch (err) {
    if (err instanceof DuplicateMembershipError) return; // race loser
    throw err;
  }
}
