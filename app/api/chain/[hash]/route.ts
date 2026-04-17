import { NextRequest, NextResponse } from "next/server";
import type { Receipt } from "@/lib/dema/types";

type Ctx = { params: Promise<{ hash: string }> };

// D1 stub — single receipt lookup.
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { hash } = await ctx.params;

  const stub: Receipt = {
    id: hash,
    kind: "CognitionBoot",
    timestamp: Date.now(),
    prevChain: "0".repeat(64),
    payloadHash: "b".repeat(64),
  };

  return NextResponse.json(stub);
}
