import { describe, expect, it } from "vitest";
import {
  AGENT_OUTSIDE_SANDBOX,
  MANIFEST_PRODUCTS,
  isNonShippedProductStatus,
} from "@/lib/manifest/manifest-truth-surface";

describe("manifest truth surface", () => {
  it("marks preview, sim, and future products as non-shipped", () => {
    const nonShipped = MANIFEST_PRODUCTS.filter((p) =>
      isNonShippedProductStatus(p.status),
    );
    expect(nonShipped.map((p) => p.name)).toEqual(
      expect.arrayContaining([
        "Proof-of-Spend",
        "Mobile Companion",
        "Economy Simulator",
        "OKF Bridge",
        "Impact Launchpad",
      ]),
    );
  });

  it("keeps agent harness outside and kernel inside", () => {
    expect(AGENT_OUTSIDE_SANDBOX.outside.length).toBeGreaterThanOrEqual(3);
    expect(AGENT_OUTSIDE_SANDBOX.inside.length).toBeGreaterThanOrEqual(3);
    expect(AGENT_OUTSIDE_SANDBOX.thesis.toLowerCase()).toContain("outside");
    expect(AGENT_OUTSIDE_SANDBOX.bridge.some((b) => b.includes("spine"))).toBe(
      true,
    );
  });

  it("has ten products aligned to the manifestation deck", () => {
    expect(MANIFEST_PRODUCTS).toHaveLength(10);
  });
});
