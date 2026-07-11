import { afterEach, describe, expect, it } from "vitest";
import { buildOnboardingClosedLoopReport } from "@/lib/beta/onboarding-closed-loop";

describe("onboarding closed-loop diagnostic", () => {
  const savedMode = process.env.BIZRA_ACCESS_MODE;
  const savedCodes = process.env.BIZRA_BETA_INVITE_CODES;

  afterEach(() => {
    if (savedMode === undefined) delete process.env.BIZRA_ACCESS_MODE;
    else process.env.BIZRA_ACCESS_MODE = savedMode;
    if (savedCodes === undefined) delete process.env.BIZRA_BETA_INVITE_CODES;
    else process.env.BIZRA_BETA_INVITE_CODES = savedCodes;
  });

  it("flags missing invite codes in invite_only mode", () => {
    process.env.BIZRA_ACCESS_MODE = "invite_only";
    delete process.env.BIZRA_BETA_INVITE_CODES;
    const report = buildOnboardingClosedLoopReport({
      redis: "disabled",
      admitted: false,
    });
    expect(report.truth_label).toBe("PREVIEW_DIAGNOSTIC_ONLY");
    expect(report.critique.gaps.some((g) => g.includes("BIZRA_BETA_INVITE_CODES"))).toBe(
      true,
    );
    expect(report.persistence.ok).toBe(true);
  });

  it("suggests smoke path when healthy", () => {
    process.env.BIZRA_ACCESS_MODE = "invite_only";
    process.env.BIZRA_BETA_INVITE_CODES = "test-code";
    const report = buildOnboardingClosedLoopReport({
      redis: "ok",
      admitted: true,
    });
    expect(report.critique.gaps.length).toBe(0);
    expect(report.next_micro_actions[0]).toContain("smoke");
  });
});
