import { NextResponse } from "next/server";
import type { ReceiptChainHead } from "@/lib/dema/types";

// D1 stub — returns mock chain head.
// Replace with bizra-cognition bridge in D2.
const STUB_CHAIN_HEAD: ReceiptChainHead = {
  head: "a".repeat(64),
  length: 0,
  latestTimestamp: Date.now(),
};

export async function GET() {
  return NextResponse.json(STUB_CHAIN_HEAD);
}
