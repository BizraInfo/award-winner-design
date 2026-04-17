import { NextResponse } from "next/server";
import type { ReceiptChainHead } from "@/lib/dema/types";
import { gatewayFetch } from "@/lib/dema/gateway";

// GET /api/chain — proxy to bizra-cognition-gateway /chain.
// Canonical chain head is owned by the Rust runtime; this route is a projection.
export async function GET() {
  const result = await gatewayFetch<ReceiptChainHead>("/chain");
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error.status },
    );
  }
  return NextResponse.json(result.data);
}
