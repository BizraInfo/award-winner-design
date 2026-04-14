/**
 * POST /api/node/activate
 *
 * Node activation with client-signed receipt (G2: Activation Receipt Lineage).
 *
 * The client constructs the activation receipt locally, signs it with the
 * genesis Ed25519 private key, and sends the receipt + signature + publicKey.
 * This endpoint verifies:
 *   1. SHA-256(publicKey bytes) === nodeId (key-identity binding)
 *   2. Ed25519.verify(receipt, signature, publicKey) (valid signature)
 *
 * Returns: { receiptId, receiptHash, signature, activatedAt, signerMode: "genesis_ed25519" }
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash, createPublicKey, verify } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sha256(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

interface ResourceSettings {
  cpuShare: number;
  gpuShare: number;
  storageShare: number;
  alwaysAvailable: boolean;
  availableHours: [number, number];
}

// Ed25519 SPKI DER prefix (12 bytes) + 32-byte raw public key
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: {
    nodeId?: string;
    publicKey?: string;
    resourceSettings?: ResourceSettings;
    receipt?: string;
    signature?: string;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const nodeId = (body.nodeId ?? "").trim();
  const publicKeyHex = (body.publicKey ?? "").trim();
  const signatureHex = (body.signature ?? "").trim();
  const receiptJson = (body.receipt ?? "").trim();
  const rs = body.resourceSettings;

  if (!/^[0-9a-f]{64}$/.test(nodeId)) {
    return NextResponse.json({ error: "invalid nodeId" }, { status: 400 });
  }
  if (!/^[0-9a-f]{64}$/.test(publicKeyHex)) {
    return NextResponse.json({ error: "invalid publicKey (64 hex chars required)" }, { status: 400 });
  }
  if (!/^[0-9a-f]{128}$/.test(signatureHex)) {
    return NextResponse.json({ error: "invalid signature (128 hex chars required)" }, { status: 400 });
  }
  if (!receiptJson) {
    return NextResponse.json({ error: "receipt JSON string required" }, { status: 400 });
  }
  if (
    !rs ||
    typeof rs.cpuShare !== "number" ||
    typeof rs.gpuShare !== "number" ||
    typeof rs.storageShare !== "number" ||
    typeof rs.alwaysAvailable !== "boolean"
  ) {
    return NextResponse.json({ error: "resourceSettings required" }, { status: 400 });
  }
  if (rs.cpuShare < 0 || rs.cpuShare > 80 || rs.gpuShare < 0 || rs.gpuShare > 80 || rs.storageShare < 0 || rs.storageShare > 80) {
    return NextResponse.json({ error: "share out of range" }, { status: 400 });
  }
  if (
    rs.availableHours != null &&
    (!Array.isArray(rs.availableHours) || rs.availableHours.length !== 2 ||
      typeof rs.availableHours[0] !== "number" || typeof rs.availableHours[1] !== "number" ||
      rs.availableHours[0] < 0 || rs.availableHours[1] > 24 || rs.availableHours[0] > rs.availableHours[1])
  ) {
    return NextResponse.json({ error: "availableHours must be [start, end] in 0-24" }, { status: 400 });
  }

  // G2 Check 1: Key-identity binding — SHA-256(publicKey bytes) must equal nodeId
  const derivedNodeId = sha256(Buffer.from(publicKeyHex, "hex"));
  if (derivedNodeId !== nodeId) {
    return NextResponse.json({ error: "publicKey does not match nodeId" }, { status: 403 });
  }

  // G2 Check 2: Verify Ed25519 signature over the receipt
  let signatureValid = false;
  try {
    const pubKeyObj = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyHex, "hex")]),
      format: "der",
      type: "spki",
    });
    signatureValid = verify(
      null,
      Buffer.from(receiptJson),
      pubKeyObj,
      Buffer.from(signatureHex, "hex")
    );
  } catch {
    return NextResponse.json({ error: "signature verification failed" }, { status: 403 });
  }

  if (!signatureValid) {
    return NextResponse.json({ error: "invalid signature — receipt not signed by genesis key" }, { status: 403 });
  }

  // Verify receipt content matches provided resourceSettings
  let parsedReceipt: Record<string, unknown>;
  try {
    parsedReceipt = JSON.parse(receiptJson);
  } catch {
    return NextResponse.json({ error: "receipt is not valid JSON" }, { status: 400 });
  }
  if (parsedReceipt.nodeId !== nodeId || parsedReceipt.type !== "node.activation.v1") {
    return NextResponse.json({ error: "receipt content mismatch" }, { status: 400 });
  }

  const receiptHash = sha256(receiptJson);

  return NextResponse.json(
    {
      receiptId: receiptHash.slice(0, 32),
      receiptHash,
      signerPublicKey: publicKeyHex,
      signature: signatureHex,
      activatedAt: parsedReceipt.activatedAt,
      receipt: parsedReceipt,
      signerMode: "genesis_ed25519",
      verified: true,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
