import { NextRequest, NextResponse } from "next/server";
import type { Receipt } from "@/lib/dema/types";
import { gatewayFetch } from "@/lib/dema/gateway";

type Ctx = { params: Promise<{ hash: string }> };

// GET /api/chain/:hash — proxy to bizra-cognition-gateway /chain/:hash.
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { hash } = await ctx.params;
  const result = await gatewayFetch<Receipt>(`/chain/${encodeURIComponent(hash)}`);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error.status },
    );
  }
  return NextResponse.json(result.data);
}
