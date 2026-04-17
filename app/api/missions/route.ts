import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/security/api-auth";
import type { Mission } from "@/lib/dema/types";
import { randomUUID } from "crypto";

// D1 stub — create mission from intent text.
export async function POST(request: NextRequest) {
  return withAuth(request, async (_req, _user) => {
    let body: { intent?: string; priority?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body.intent || typeof body.intent !== "string" || body.intent.length < 1) {
      return NextResponse.json({ error: "Intent is required" }, { status: 400 });
    }

    const id = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");

    const mission: Mission = {
      id: id.slice(0, 64),
      intent: body.intent,
      stage: "S1_INTAKE",
      priority: (body.priority as Mission["priority"]) || "Normal",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      admissibility: null,
    };

    return NextResponse.json(mission, { status: 201 });
  });
}
