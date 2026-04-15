// @vitest-environment node
/**
 * Locks the self-heal branch added in Track B.6: when node-redis's
 * reconnectStrategy ceiling is hit and the client stays permanently closed
 * (isOpen === false), getClient() MUST drop and re-initialise the client so
 * the next operation sees a fresh connection — not throw "The client is
 * closed".
 *
 * Integration proof lives in scripts/verify-canary-rollback-drill.sh; this
 * unit test locks the behavior at the class level so a refactor can't
 * silently regress it.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RedisTokenStore } from "../../../lib/security/token-store";
import { __resetRedisMock } from "../mocks/redis";

// Access private state through the unknown-cast we already do in the class.
type InternalState = {
  client: { isOpen?: boolean; quit: () => Promise<void> } | null;
  connected: boolean;
  initPromise: Promise<void> | null;
  redisUrl?: string;
};

function peek(store: RedisTokenStore): InternalState {
  return store as unknown as InternalState;
}

describe("RedisTokenStore — self-heal", () => {
  beforeEach(() => {
    __resetRedisMock();
  });

  afterEach(async () => {
    __resetRedisMock();
  });

  it("replaces a permanently-closed client (isOpen=false) with a fresh one", async () => {
    const store = new RedisTokenStore({ redisUrl: "redis://localhost:6379" });
    // Wait for the constructor's async initClient to settle.
    const state = peek(store);
    await state.initPromise;

    const originalClient = state.client;
    expect(originalClient).not.toBeNull();

    // Simulate the post-ceiling state: node-redis gave up, client.isOpen is
    // false, but our `connected` cache still thinks we are connected because
    // no 'end'/'disconnect' event ever fired.
    const quitSpy = vi.fn().mockResolvedValue(undefined);
    state.client = { isOpen: false, quit: quitSpy } as InternalState["client"];
    state.connected = true;

    // Any operation routes through getClient(). revokeToken is the simplest.
    await store.revokeToken("jti-under-test");

    // Dead client was torn down and a fresh one replaced it.
    expect(quitSpy).toHaveBeenCalledTimes(1);
    expect(peek(store).client).not.toBe(originalClient);
    expect(peek(store).client).not.toBeNull();
  });

  it("tolerates a fresh client that never needed self-heal", async () => {
    const store = new RedisTokenStore({ redisUrl: "redis://localhost:6379" });
    const state = peek(store);
    await state.initPromise;

    const originalClient = state.client;
    await store.revokeToken("jti-happy-path");

    // No self-heal triggered — same client instance reused.
    expect(peek(store).client).toBe(originalClient);
  });
});
