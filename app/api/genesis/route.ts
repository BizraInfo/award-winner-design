/**
 * POST /api/genesis
 *
 * Sovereign node registration endpoint. The CLIENT generates its own Ed25519
 * keypair via WebCrypto and sends only the public key here. The server derives
 * deterministic fields (nodeId, constitutionHash, agentIds) and returns the
 * unsigned genesis envelope for the client to sign locally.
 *
 * The private key NEVER reaches the server (G1: Sovereign Key Ownership).
 *
 * Expects: { name: string, publicKey: string (64 hex, 32-byte Ed25519 raw) }
 *
 * Returns:
 *  - publicKey (hex): the provided 32-byte Ed25519 public key
 *  - nodeId (hex):    SHA-256(publicKey raw bytes) — binds identity to key material
 *  - constitutionHash: SHA-256 of the bound constitution text
 *  - agentIds:        7 PAT agent ids derived deterministically from the nodeId
 *  - activatedAt:     ISO8601 timestamp
 *  - envelope:        JSON string for the client to sign
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONSTITUTION_V5 = [
  "BIZRA Constitution v5.0.0-GENESIS",
  "RIBA_ZERO",
  "ZANN_ZERO",
  "IHSAN_THRESHOLD=0.95",
  "CLAIM_MUST_BIND",
  "ADL_GINI_THRESHOLD=0.35",
  "ZAKAT_RATE=0.025",
  "SOVEREIGNTY_ABSOLUTE",
].join("\n");

function sha256(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}


export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { name?: string; publicKey?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  if (!name || name.length > 64 || !/^[\w\s.'-]+$/.test(name)) {
    return NextResponse.json({ error: "name required (1-64 chars, alphanumeric/spaces only)" }, { status: 400 });
  }

  const publicKeyHex = (body.publicKey ?? "").trim();
  if (!/^[0-9a-f]{64}$/.test(publicKeyHex)) {
    return NextResponse.json({ error: "publicKey required (64 hex chars, Ed25519 raw)" }, { status: 400 });
  }

  const pubRaw = Buffer.from(publicKeyHex, "hex");
  const nodeId = sha256(pubRaw);
  const constitutionHash = sha256(CONSTITUTION_V5);
  const activatedAt = new Date().toISOString();

  const envelope = JSON.stringify({
    name,
    nodeId,
    publicKey: publicKeyHex,
    constitutionHash,
    constitutionVersion: "5.0.0-GENESIS",
    activatedAt,
  });

  const agentIds = Array.from({ length: 7 }, (_, i) =>
    sha256(`${nodeId}:pat:${i}`).slice(0, 40)
  );

  return NextResponse.json(
    {
      name,
      nodeId,
      publicKey: publicKeyHex,
      constitutionHash,
      constitutionVersion: "5.0.0-GENESIS",
      envelope,
      agentIds,
      activatedAt,
      steps: [
        { label: "Accepted client public key", detail: `pk:${publicKeyHex.slice(0, 16)}…`, ok: true },
        { label: "Derived node identity", detail: `id:${nodeId.slice(0, 20)}…`, ok: true },
        { label: "Bound constitution v5.0.0-GENESIS", detail: `sha:${constitutionHash.slice(0, 12)}…`, ok: true },
        { label: "Derived 7 PAT agent ids", detail: `${agentIds[0].slice(0, 10)}…`, ok: true },
      ],
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
