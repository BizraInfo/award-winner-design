import { NextRequest, NextResponse } from "next/server";
import type { Mission } from "@/lib/dema/types";

type Ctx = { params: Promise<{ id: string }> };

// D1 stub — mission by ID.
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  const mission: Mission = {
    id,
    intent: "(stub — mission not persisted yet)",
    stage: "Intent",
    priority: "Normal",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    admissibility: null,
  };

  return NextResponse.json(mission);
}
