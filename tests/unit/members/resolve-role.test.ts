// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { randomUUID } from "crypto";
import {
  __resetMemberStoreForTests,
  getMemberStore,
} from "../../../lib/members/member-store";
import { resolveWorkspaceUser } from "../../../lib/members/resolve-role";
import type { UserPayload } from "../../../lib/security/api-auth";
import { __resetRedisMock } from "../mocks/redis";

function makeUser(overrides: Partial<UserPayload> = {}): UserPayload {
  return {
    sub: "u-test",
    email: "test@example.com",
    roles: ["user"],
    permissions: [],
    ...overrides,
  };
}

describe("resolveWorkspaceUser", () => {
  beforeEach(async () => {
    delete process.env.REDIS_URL;
    __resetRedisMock();
    await __resetMemberStoreForTests();
  });

  it("returns the user unchanged when no membership exists", async () => {
    const user = makeUser();
    const resolved = await resolveWorkspaceUser("ws-none", user);
    expect(resolved).toBe(user);
    expect(resolved.roles).toEqual(["user"]);
  });

  it("appends the workspace-scoped role when membership exists", async () => {
    const user = makeUser({ sub: "genesis-u" });
    const store = getMemberStore();
    await store.add({
      id: randomUUID(),
      workspaceId: "ws-x",
      userId: "genesis-u",
      email: user.email,
      role: "owner",
      joinedAt: Date.now(),
    });

    const resolved = await resolveWorkspaceUser("ws-x", user);
    expect(resolved.roles).toContain("user");
    expect(resolved.roles).toContain("owner");
    expect(user.roles).toEqual(["user"]);
  });

  it("does not duplicate when the JWT already carries the same role", async () => {
    const user = makeUser({ roles: ["user", "owner"] });
    const store = getMemberStore();
    await store.add({
      id: randomUUID(),
      workspaceId: "ws-y",
      userId: user.sub,
      email: user.email,
      role: "owner",
      joinedAt: Date.now(),
    });

    const resolved = await resolveWorkspaceUser("ws-y", user);
    expect(resolved).toBe(user);
    expect(resolved.roles.filter((r) => r === "owner")).toHaveLength(1);
  });

  it("only resolves for the requested workspace", async () => {
    const user = makeUser({ sub: "multi-u" });
    const store = getMemberStore();
    await store.add({
      id: randomUUID(),
      workspaceId: "ws-alpha",
      userId: "multi-u",
      email: user.email,
      role: "owner",
      joinedAt: Date.now(),
    });
    await store.add({
      id: randomUUID(),
      workspaceId: "ws-beta",
      userId: "multi-u",
      email: user.email,
      role: "viewer",
      joinedAt: Date.now(),
    });

    const alpha = await resolveWorkspaceUser("ws-alpha", user);
    const beta = await resolveWorkspaceUser("ws-beta", user);
    expect(alpha.roles).toContain("owner");
    expect(alpha.roles).not.toContain("viewer");
    expect(beta.roles).toContain("viewer");
    expect(beta.roles).not.toContain("owner");
  });
});
