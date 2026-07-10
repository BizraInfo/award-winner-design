/**
 * BIZRA beta access policy — invitation-only until operator opens public.
 */

export type BizraAccessMode = "invite_only" | "public";

export const BIZRA_BETA_ADMIT_COOKIE = "bizra_beta_admit";

export function getBizraAccessMode(): BizraAccessMode {
  const explicit = (process.env.BIZRA_ACCESS_MODE ?? "").trim().toLowerCase();
  if (explicit === "public") return "public";
  if (explicit === "invite_only") return "invite_only";
  return process.env.NODE_ENV === "production" ? "invite_only" : "public";
}

export function isInviteOnlyAccess(): boolean {
  return getBizraAccessMode() === "invite_only";
}

export function parseBetaInviteCodes(): string[] {
  const raw = process.env.BIZRA_BETA_INVITE_CODES ?? "";
  return raw
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toLowerCase();
}

export function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function verifyInviteCode(candidate: string): boolean {
  const normalized = normalizeInviteCode(candidate);
  if (!normalized) return false;
  const allowed = parseBetaInviteCodes();
  if (allowed.length === 0) return false;
  return allowed.some((code) => timingSafeEqualStrings(code, normalized));
}

export const BETA_PROTECTED_API_PATHS = new Set<string>([
  "/api/genesis",
  "/api/node/activate",
]);

export function isBetaProtectedApiPath(pathname: string): boolean {
  return BETA_PROTECTED_API_PATHS.has(pathname);
}
