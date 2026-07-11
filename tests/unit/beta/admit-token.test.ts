import { afterEach, describe, expect, it } from "vitest";
import {
  mintBetaAdmitToken,
  verifyBetaAdmitToken,
} from "@/lib/beta/admit-token";

describe("beta admit-token", () => {
  const savedSecret = process.env.BIZRA_BETA_GATE_SECRET;
  const savedJwt = process.env.JWT_SECRET;

  afterEach(() => {
    if (savedSecret === undefined) delete process.env.BIZRA_BETA_GATE_SECRET;
    else process.env.BIZRA_BETA_GATE_SECRET = savedSecret;
    if (savedJwt === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = savedJwt;
  });

  it("mints and verifies a token", () => {
    process.env.BIZRA_BETA_GATE_SECRET = "test-secret-for-beta-gate";
    const token = mintBetaAdmitToken(60_000);
    expect(token).toBeTruthy();
    expect(verifyBetaAdmitToken(token)).toBe(true);
  });

  it("rejects tampered token", () => {
    process.env.JWT_SECRET = "jwt-fallback-secret";
    const token = mintBetaAdmitToken(60_000);
    expect(token).toBeTruthy();
    const tampered = token!.replace(/.$/, "x");
    expect(verifyBetaAdmitToken(tampered)).toBe(false);
  });

  it("returns null when no secret configured", () => {
    delete process.env.BIZRA_BETA_GATE_SECRET;
    delete process.env.JWT_SECRET;
    expect(mintBetaAdmitToken()).toBeNull();
    expect(verifyBetaAdmitToken("v1.x.y")).toBe(false);
  });
});
