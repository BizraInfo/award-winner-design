import { describe, expect, it } from "vitest";
import {
  evaluatePersistenceSubstrate,
} from "@/lib/onboarding/persistence-gate";

describe("evaluatePersistenceSubstrate", () => {
  it("allows server_redis when health reports ok", () => {
    const r = evaluatePersistenceSubstrate("ok");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.mode).toBe("server_redis");
    }
  });

  it("allows client_local when Redis is disabled (default)", () => {
    const r = evaluatePersistenceSubstrate("disabled");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.mode).toBe("client_local");
      expect(r.statusLine).toContain("client-local");
    }
  });

  it("blocks disabled when requireRedis is true", () => {
    const r = evaluatePersistenceSubstrate("disabled", { requireRedis: true });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain("REDIS_URL not set");
    }
  });

  it("blocks degraded Redis", () => {
    const r = evaluatePersistenceSubstrate("degraded");
    expect(r.ok).toBe(false);
  });
});
