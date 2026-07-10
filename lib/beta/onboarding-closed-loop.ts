/**
 * Ultra-micro closed-loop diagnostic for onboarding (preview only).
 * Composes beta access + persistence substrate signals — no runtime execution.
 */

import {
  getBizraAccessMode,
  isInviteOnlyAccess,
  parseBetaInviteCodes,
} from "./access-mode";
import { evaluatePersistenceSubstrate } from "@/lib/onboarding/persistence-gate";

export type OnboardingClosedLoopReport = {
  schema: "bizra.onboarding_closed_loop.v0.1";
  truth_label: "PREVIEW_DIAGNOSTIC_ONLY";
  access: {
    mode: "invite_only" | "public";
    invite_codes_configured: boolean;
  };
  persistence: ReturnType<typeof evaluatePersistenceSubstrate>;
  critique: {
    gaps: string[];
    strengths: string[];
  };
  next_micro_actions: string[];
};

export function buildOnboardingClosedLoopReport(input: {
  redis?: string;
  admitted?: boolean;
}): OnboardingClosedLoopReport {
  const mode = getBizraAccessMode();
  const codes = parseBetaInviteCodes();
  const persistence = evaluatePersistenceSubstrate(String(input.redis ?? "unknown"));

  const gaps: string[] = [];
  const strengths: string[] = [];

  if (mode === "invite_only") {
    strengths.push("Public onboarding blocked — invitation-only beta enforced");
    if (codes.length === 0) {
      gaps.push("BIZRA_BETA_INVITE_CODES unset — no invites can be verified");
    }
    if (input.admitted === false) {
      gaps.push("Client not admitted — genesis APIs must remain blocked");
    }
  } else {
    gaps.push("ACCESS_MODE=public — not invitation-only");
  }

  if (!persistence.ok) {
    gaps.push(`Persistence: ${"error" in persistence ? persistence.error : "blocked"}`);
  } else if (persistence.mode === "client_local") {
    strengths.push("Client-local persistence path available without Redis");
  } else {
    strengths.push("Server Redis persistence path available");
  }

  const next: string[] = [];
  if (mode === "invite_only" && codes.length === 0) {
    next.push("Set BIZRA_BETA_INVITE_CODES on host before sharing beta links");
  }
  if (!persistence.ok) {
    next.push("Fix Redis degraded OR deploy persistence-gate client-local path");
  }
  if (mode === "invite_only" && input.admitted !== true) {
    next.push("Verify invite at /api/beta/verify-invite before INITIALIZE NODE");
  }
  if (next.length === 0) {
    next.push("Run full onboarding smoke: invite → genesis → teach → activate");
  }

  return {
    schema: "bizra.onboarding_closed_loop.v0.1",
    truth_label: "PREVIEW_DIAGNOSTIC_ONLY",
    access: {
      mode,
      invite_codes_configured: codes.length > 0,
    },
    persistence,
    critique: { gaps, strengths },
    next_micro_actions: next,
  };
}
