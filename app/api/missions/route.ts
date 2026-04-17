import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/security/api-auth";
import type {
  AdmissibilityResult,
  GateVerdict,
  GatewayAdmissibility,
  GatewayVerdict,
  Mission,
  MissionStage,
  Verdict,
} from "@/lib/dema/types";

// Gateway POST /mission success contract (mirrors bizra-cognition-gateway v0.2).
interface GatewaySubmitResponse {
  missionId: string;
  admissibility: GatewayAdmissibility;
  receiptId: string;
  finalStage: MissionStage;
  chainHead: string;
}

function verdictFromGateway(v: GatewayVerdict): Verdict {
  switch (v) {
    case "Permit": return "PERMIT";
    case "Reject": return "REJECT";
    case "Review": return "REVIEW";
    case "ScoreOnly": return "SCORE_ONLY";
  }
}

function translateAdmissibility(
  missionId: string,
  gw: GatewayAdmissibility,
): AdmissibilityResult {
  const gates: GateVerdict[] = gw.gateVerdicts
    .filter((gv) => gv.invariant !== null)
    .map((gv) => ({
      invariant: gv.invariant as GateVerdict["invariant"],
      verdict: verdictFromGateway(gv.verdict),
      reason: gv.reason,
      score: gv.score,
    }));
  return {
    missionId,
    finalVerdict: verdictFromGateway(gw.verdict),
    gates,
    timestamp: Date.now(),
  };
}

// Cycle-5 G3b — POST /api/missions proxies to bizra-cognition-gateway
// POST /mission. No more fabricated IDs. On PERMIT, returns a Mission whose
// id == missionId and admissibility reflects the real 5-gate chain verdict.
// On REJECT, the gateway returns HTTP 422; the structured error body is
// passed through verbatim so the UI can surface remediationPath + reason.
export async function POST(request: NextRequest) {
  return withAuth(request, async (_req, _user) => {
    let body: { intent?: string; priority?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const intent = typeof body.intent === "string" ? body.intent.trim() : "";
    if (!intent) {
      return NextResponse.json({ error: "Intent is required" }, { status: 400 });
    }

    // NO_SHADOW_STATE: gateway owns constitutional truth. Sensible default state
    // snapshots accompany the intent; the runtime computes gap + admissibility.
    // UI priority is carried only as metadata on the returned Mission — the
    // constitutional flow does not branch on it.
    const gatewayBody = {
      intent,
      currentState: { summary: "Principal state pre-mission", metric: 0.0 },
      idealState: { summary: "Mission canonical, receipted", metric: 1.0 },
      originator: "Operator",
      qualityScore: 0.98,
    };

    const gwUrl =
      process.env.BIZRA_COGNITION_GATEWAY_URL || "http://127.0.0.1:7421";

    let res: Response;
    try {
      res = await fetch(`${gwUrl}/mission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gatewayBody),
        cache: "no-store",
      });
    } catch (e) {
      return NextResponse.json(
        {
          error: {
            code: "GATEWAY_UNREACHABLE",
            message: `Cannot reach bizra-cognition-gateway at ${gwUrl}`,
            upstream: e instanceof Error ? e.message : String(e),
          },
        },
        { status: 503 },
      );
    }

    if (res.status === 422) {
      // Reject: pass through gateway's structured admissibility verbatim.
      const rejectBody = await res.json().catch(() => null);
      return NextResponse.json(rejectBody ?? { error: "Rejected" }, { status: 422 });
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      return NextResponse.json(
        errBody ?? { error: { code: "GATEWAY_HTTP", message: `HTTP ${res.status}` } },
        { status: res.status },
      );
    }

    const gw: GatewaySubmitResponse = await res.json();
    const now = Date.now();
    const mission: Mission = {
      id: gw.missionId,
      intent,
      stage: gw.finalStage,
      priority: (body.priority as Mission["priority"]) || "Normal",
      createdAt: now,
      updatedAt: now,
      admissibility: translateAdmissibility(gw.missionId, gw.admissibility),
    };

    return NextResponse.json(mission, { status: 201 });
  });
}
