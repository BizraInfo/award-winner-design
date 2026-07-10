/**
 * Edge-safe beta admit verification (Web Crypto — middleware).
 */

import { BIZRA_BETA_ADMIT_COOKIE } from "./access-mode";

export { BIZRA_BETA_ADMIT_COOKIE };

const TOKEN_VERSION = "v1";

function getGateSecret(): string | null {
  return (
    process.env.BIZRA_BETA_GATE_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    null
  );
}

function base64UrlToBytes(input: string): Uint8Array | null {
  try {
    const padded = input.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
    const binary = atob(padded + pad);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a[i] ^ b[i];
  return mismatch === 0;
}

async function hmacSha256Base64Url(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  const bytes = new Uint8Array(sig);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function verifyBetaAdmitTokenEdge(
  token: string | null | undefined,
): Promise<boolean> {
  if (!token) return false;
  const secret = getGateSecret();
  if (!secret) return false;

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return false;
  const [, encoded, sig] = parts;
  if (!encoded || !sig) return false;

  const expected = await hmacSha256Base64Url(encoded, secret);
  const sigBytes = base64UrlToBytes(sig);
  const expectedBytes = base64UrlToBytes(expected);
  if (!sigBytes || !expectedBytes) return false;
  if (!timingSafeEqualBytes(sigBytes, expectedBytes)) return false;

  const payloadBytes = base64UrlToBytes(encoded);
  if (!payloadBytes) return false;
  try {
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as {
      v?: number;
      exp?: number;
    };
    if (payload.v !== 1 || typeof payload.exp !== "number") return false;
    return Date.now() < payload.exp;
  } catch {
    return false;
  }
}
