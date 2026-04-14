/**
 * Client-side Ed25519 key generation and signing via WebCrypto.
 * Private key material NEVER leaves the browser.
 *
 * Used by the sovereign onboarding flow (G1: Sovereign Key Ownership)
 * and activation signing (G2: Activation Receipt Lineage).
 */

const encoder = new TextEncoder();

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface SovereignKeypair {
  publicKeyHex: string;
  privateKeyJwk: JsonWebKey;
}

/**
 * Generate a new Ed25519 keypair via WebCrypto.
 * The private key is exported as JWK for encrypted persistence.
 */
export async function generateSovereignKeypair(): Promise<SovereignKeypair> {
  const keyPair = await crypto.subtle.generateKey("Ed25519", true, [
    "sign",
    "verify",
  ]);

  const pubRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  return {
    publicKeyHex: bufToHex(pubRaw),
    privateKeyJwk: privJwk,
  };
}

/**
 * Sign a UTF-8 payload string with a stored Ed25519 private key (JWK).
 * Returns the signature as hex.
 */
export async function signWithSovereignKey(
  privateKeyJwk: JsonWebKey,
  payload: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    "Ed25519",
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("Ed25519", key, encoder.encode(payload));
  return bufToHex(sig);
}
