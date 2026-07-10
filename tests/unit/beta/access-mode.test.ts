import { afterEach, describe, expect, it } from "vitest";
import {
  getBizraAccessMode,
  isBetaProtectedApiPath,
  isInviteOnlyAccess,
  normalizeInviteCode,
  parseBetaInviteCodes,
  verifyInviteCode,
} from "@/lib/beta/access-mode";

const ENV_KEYS = [
  "BIZRA_ACCESS_MODE",
  "BIZRA_BETA_INVITE_CODES",
  "NODE_ENV",
] as const;

function snapshotEnv(): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const k of ENV_KEYS) out[k] = process.env[k];
  return out;
}

describe("beta access-mode", () => {
  const saved = snapshotEnv();

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("defaults production to invite_only", () => {
    delete process.env.BIZRA_ACCESS_MODE;
    process.env.NODE_ENV = "production";
    expect(getBizraAccessMode()).toBe("invite_only");
    expect(isInviteOnlyAccess()).toBe(true);
  });

  it("defaults non-production to public", () => {
    delete process.env.BIZRA_ACCESS_MODE;
    process.env.NODE_ENV = "development";
    expect(getBizraAccessMode()).toBe("public");
  });

  it("honors explicit BIZRA_ACCESS_MODE=public", () => {
    process.env.BIZRA_ACCESS_MODE = "public";
    process.env.NODE_ENV = "production";
    expect(isInviteOnlyAccess()).toBe(false);
  });

  it("verifies invite codes case-insensitively", () => {
    process.env.BIZRA_BETA_INVITE_CODES = "alpha-1, BetaTwo";
    expect(verifyInviteCode("ALPHA-1")).toBe(true);
    expect(verifyInviteCode("betatwo")).toBe(true);
    expect(verifyInviteCode("wrong")).toBe(false);
  });

  it("rejects when no codes configured", () => {
    delete process.env.BIZRA_BETA_INVITE_CODES;
    expect(parseBetaInviteCodes()).toEqual([]);
    expect(verifyInviteCode("anything")).toBe(false);
  });

  it("protects genesis and activate paths", () => {
    expect(isBetaProtectedApiPath("/api/genesis")).toBe(true);
    expect(isBetaProtectedApiPath("/api/node/activate")).toBe(true);
    expect(isBetaProtectedApiPath("/api/health")).toBe(false);
  });

  it("normalizes invite codes", () => {
    expect(normalizeInviteCode("  AbC  ")).toBe("abc");
  });
});
