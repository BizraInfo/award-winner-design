/**
 * POST /api/genesis
 *
 * Real genesis for a new sovereign node. Uses Node.js native crypto
 * (Ed25519 keygen + SHA-256 digests). Not theater — every field returned
 * is cryptographically derived from the keypair generated on this request.
 *
 * Returns:
 *  - publicKey (hex): 32-byte Ed25519 public key
 *  - nodeId (hex):    SHA-256(publicKey) — binds identity to key material
 *                     (SHA-256 pre-image; sovereign backend will re-derive with
 *                     BLAKE3 per DIGEST_SPEC when wired through)
 *  - signature (hex): Ed25519 signature over a genesis envelope
 *  - constitutionHash: SHA-256 of the bound constitution text
 *  - agentIds:        7 PAT agent ids derived deterministically from the node key
 *  - activatedAt:     ISO8601 timestamp
 *
 * We DO NOT persist private keys — the client is responsible for secure storage
 * in future versions; today the private key is discarded after signing the
 * envelope to keep the genesis stateless and safe.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateKeyPairSync, sign, createHash } from "node:crypto";

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

function hex(buf: Buffer | Uint8Array): string {
  return Buffer.from(buf).toString("hex");
}

function sha256(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}


export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { name?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  if (!name || name.length > 64 || !/^[\w\s.'-]+$/.test(name)) {
    return NextResponse.json({ error: "name required (1-64 chars, alphanumeric/spaces only)" }, { status: 400 });
  }

  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const pubDer = publicKey.export({ type: "spki", format: "der" });
  const pubRaw = pubDer.subarray(pubDer.length - 32);

  const nodeId = sha256(Buffer.from(pubRaw));
  const constitutionHash = sha256(CONSTITUTION_V5);
  const activatedAt = new Date().toISOString();

  const envelope = JSON.stringify({
    name,
    nodeId,
    publicKey: hex(pubRaw),
    constitutionHash,
    constitutionVersion: "5.0.0-GENESIS",
    activatedAt,
  });

  const signature = sign(null, Buffer.from(envelope), privateKey);

  const agentIds = Array.from({ length: 7 }, (_, i) =>
    sha256(`${nodeId}:pat:${i}`).slice(0, 40)
  );

  return NextResponse.json(
    {
      name,
      nodeId,
      publicKey: hex(pubRaw),
      constitutionHash,
      constitutionVersion: "5.0.0-GENESIS",
      envelope,
      signature: hex(signature),
      agentIds,
      activatedAt,
      steps: [
        { label: "Generated Ed25519 keypair", detail: `pk:${hex(pubRaw).slice(0, 16)}…`, ok: true },
        { label: "Derived node identity", detail: `id:${nodeId.slice(0, 20)}…`, ok: true },
        { label: "Bound constitution v5.0.0-GENESIS", detail: `sha:${constitutionHash.slice(0, 12)}…`, ok: true },
        { label: "Derived 7 PAT agent ids", detail: `${agentIds[0].slice(0, 10)}…`, ok: true },
        { label: "Signed genesis envelope", detail: `sig:${hex(signature).slice(0, 16)}…`, ok: true },
      ],
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
