/**
 * Genesis onboarding persistence gate (Row 10 ratchet).
 *
 * - server_redis: REDIS_URL set and health ping ok
 * - client_local: REDIS_URL unset — sovereign keys stay in browser localStorage only
 * - blocked: Redis configured but unreachable (degraded)
 */

export type PersistenceSubstrateMode = "server_redis" | "client_local";

export type PersistenceGateResult =
  | {
      ok: true;
      mode: PersistenceSubstrateMode;
      statusLine: string;
    }
  | {
      ok: false;
      error: string;
    };

export function evaluatePersistenceSubstrate(
  redis: string,
  options?: { requireRedis?: boolean },
): PersistenceGateResult {
  const requireRedis = options?.requireRedis === true;

  if (redis === "ok") {
    return {
      ok: true,
      mode: "server_redis",
      statusLine: "Persistence substrate: ok (server Redis)",
    };
  }

  if (redis === "disabled") {
    if (requireRedis) {
      return {
        ok: false,
        error:
          "Persistence disabled (REDIS_URL not set) — cannot activate sovereign node.",
      };
    }
    return {
      ok: true,
      mode: "client_local",
      statusLine:
        "Persistence substrate: client-local (REDIS_URL unset — keys stay in browser only)",
    };
  }

  if (redis === "degraded") {
    return {
      ok: false,
      error: "Persistence substrate not ready — cannot activate sovereign node.",
    };
  }

  return {
    ok: false,
    error: `Persistence substrate unknown (${redis}) — cannot activate sovereign node.`,
  };
}

export function isRedisRequiredForOnboarding(): boolean {
  return process.env.BIZRA_REQUIRE_REDIS_FOR_ONBOARDING === "true";
}
