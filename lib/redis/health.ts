/**
 * Shared Redis client health probe.
 *
 * node-redis v4 exposes `client.isOpen`. After the reconnectStrategy ceiling,
 * the client enters a permanently-closed state  — but 'end'/'disconnect' events
 * do NOT fire reliably, so module-level `connected` flags cannot be trusted.
 * This helper centralises the `isOpen` check so both Redis clients
 * (lib/redis/client.ts and lib/security/token-store.ts) use one cast site.
 *
 * If node-redis v5 renames or removes `isOpen`, only this function needs
 * updating.
 */

/**
 * Returns `true` when a node-redis v4 client has permanently closed
 * (reconnectStrategy exhausted). Returns `false` for healthy clients or
 * unknown objects that lack the `isOpen` property.
 */
export function isClientPermanentlyClosed(client: unknown): boolean {
  if (client == null) return false;
  const c = client as { isOpen?: boolean };
  return c.isOpen === false;
}
