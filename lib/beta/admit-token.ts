/**
 * Signed beta-admission cookie (Node runtime).
 * Format: v1.<base64url(payload)>.<base64url(hmac-sha256)>
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { BIZRA_BETA_ADMIT_COOKIE } from "./access-mode";

export { BIZRA_BETA_ADMIT_COOKIE };

const TOKEN_VERSION = "v1";
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type AdmitPayload = {
  v: 1;
  iat: number;
  exp: number;
};

function getGateSecret(): string | null {
  return (
    process.env.BIZRA_BETA_GATE_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    null
  );
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

function signPayload(encodedPayload: string, secret: string): string {
  return base64UrlEncode(createHmac("sha256", secret).update(encodedPayload).digest());
}

export function mintBetaAdmitToken(ttlMs: number = DEFAULT_TTL_MS): string | null {
  const secret = getGateSecret();
  if (!secret) return null;
  const now = Date.now();
  const payload: AdmitPayload = { v: 1, iat: now, exp: now + ttlMs };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const sig = signPayload(encoded, secret);
  return `${TOKEN_VERSION}.${encoded}.${sig}`;
}

export function verifyBetaAdmitToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const secret = getGateSecret();
  if (!secret) return false;

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return false;
  const [, encoded, sig] = parts;
  if (!encoded || !sig) return false;

  const expected = signPayload(encoded, secret);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return false;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return false;

  try {
    const payload = JSON.parse(base64UrlDecode(encoded).toString("utf8")) as AdmitPayload;
    if (payload.v !== 1 || typeof payload.exp !== "number") return false;
    return Date.now() < payload.exp;
  } catch {
    return false;
  }
}

export function betaAdmitCookieOptions(maxAgeSeconds: number) {
  return {
    name: BIZRA_BETA_ADMIT_COOKIE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
