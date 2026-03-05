// lib/security/token-store.ts
/**
 * Token Store Abstraction - Redis/Memory Hybrid
 * 
 * Provides cross-instance token management for:
 * - Token revocation that propagates across all instances
 * - Refresh token tracking with proper TTL
 * - Token family management for rotation detection
 * 
 * In production: Uses Redis for distributed state (requires `redis` package)
 * In development: Falls back to in-memory store with warnings
 * 
 * @module lib/security/token-store
 */

/* eslint-disable no-console */

// Redis client type (dynamically imported)
type RedisClient = {
  connect(): Promise<void>;
  quit(): Promise<void>;
  setEx(key: string, ttl: number, value: string): Promise<void>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  sAdd(key: string, member: string): Promise<number>;
  sRem(key: string, member: string): Promise<number>;
  sMembers(key: string): Promise<string[]>;
  expire(key: string, seconds: number): Promise<boolean>;
  on(event: 'error', handler: (err: Error) => void): void;
  on(event: 'connect' | 'disconnect', handler: () => void): void;
  on(event: string, handler: (...args: never[]) => void): void;
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface RefreshTokenData {
  userId: string;
  deviceId: string;
  family: string;
  issuedAt: number;
  expiresAt: number;
}

export interface TokenStoreConfig {
  redisUrl?: string;
  keyPrefix?: string;
  revokedTokenTTL?: number;  // seconds
  refreshTokenTTL?: number;  // seconds
}

export interface TokenStore {
  // Revoked tokens
  revokeToken(jti: string, ttl?: number): Promise<void>;
  isTokenRevoked(jti: string): Promise<boolean>;
  
  // Refresh tokens
  storeRefreshToken(tokenId: string, data: RefreshTokenData): Promise<void>;
  getRefreshToken(tokenId: string): Promise<RefreshTokenData | null>;
  deleteRefreshToken(tokenId: string): Promise<void>;
  
  // Token family operations
  revokeTokenFamily(family: string): Promise<void>;
  revokeAllUserTokens(userId: string): Promise<void>;
  
  // Cleanup
  close(): Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REDIS TOKEN STORE (Production)
// ═══════════════════════════════════════════════════════════════════════════════

class RedisTokenStore implements TokenStore {
  private client: RedisClient | null;
  private keyPrefix: string;
  private revokedTokenTTL: number;
  private refreshTokenTTL: number;
  private connected: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor(config: TokenStoreConfig) {
    this.keyPrefix = config.keyPrefix || 'bizra:auth:';
    this.revokedTokenTTL = config.revokedTokenTTL || 15 * 60; // 15 min default
    this.refreshTokenTTL = config.refreshTokenTTL || 7 * 24 * 60 * 60; // 7 days
    
    // Defer client creation to connect() to handle dynamic import
    this.client = null;
    this.initPromise = this.initClient(config.redisUrl);
  }

  private async initClient(redisUrl?: string): Promise<void> {
    try {
      // Runtime-only import to avoid build-time module resolution when redis is optional
      // eslint-disable-next-line no-new-func
      const importAtRuntime = new Function(
        'specifier',
        'return import(specifier)'
      ) as (specifier: string) => Promise<{
        createClient: (options: unknown) => RedisClient;
      }>;
      const redis = await importAtRuntime('redis');
      
      this.client = redis.createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries: number) => {
            if (retries > 10) {
              console.error('[TokenStore] Max Redis reconnection attempts reached');
              return new Error('Max reconnection attempts');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      }) as RedisClient;

      this.client.on('error', (err: Error) => {
        console.error('[TokenStore] Redis error:', err.message);
      });

      this.client.on('connect', () => {
        console.log('[TokenStore] Connected to Redis');
        this.connected = true;
      });

      this.client.on('disconnect', () => {
        console.warn('[TokenStore] Disconnected from Redis');
        this.connected = false;
      });
    } catch {
      throw new Error('Redis package not installed. Run: pnpm add redis');
    }
  }

  private async getClient(): Promise<RedisClient> {
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = null;
    }
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    if (!this.connected) {
      await this.client.connect();
    }
    return this.client;
  }

  private key(type: string, id: string): string {
    return `${this.keyPrefix}${type}:${id}`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Revoked Tokens
  // ─────────────────────────────────────────────────────────────────────────────

  async revokeToken(jti: string, ttl?: number): Promise<void> {
    const client = await this.getClient();
    const key = this.key('revoked', jti);
    await client.setEx(key, ttl || this.revokedTokenTTL, '1');
  }

  async isTokenRevoked(jti: string): Promise<boolean> {
    const client = await this.getClient();
    const key = this.key('revoked', jti);
    const result = await client.exists(key);
    return result === 1;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Refresh Tokens
  // ─────────────────────────────────────────────────────────────────────────────

  async storeRefreshToken(tokenId: string, data: RefreshTokenData): Promise<void> {
    const client = await this.getClient();
    const key = this.key('refresh', tokenId);
    const userKey = this.key('user_tokens', data.userId);
    const familyKey = this.key('family', data.family);
    
    const ttl = Math.max(0, Math.floor((data.expiresAt - Date.now()) / 1000));
    
    // Store token data
    await client.setEx(key, ttl, JSON.stringify(data));
    
    // Add to user's token set
    await client.sAdd(userKey, tokenId);
    await client.expire(userKey, this.refreshTokenTTL);
    
    // Add to family set
    await client.sAdd(familyKey, tokenId);
    await client.expire(familyKey, this.refreshTokenTTL);
  }

  async getRefreshToken(tokenId: string): Promise<RefreshTokenData | null> {
    const client = await this.getClient();
    const key = this.key('refresh', tokenId);
    const data = await client.get(key);
    
    if (!data) return null;
    
    try {
      return JSON.parse(data) as RefreshTokenData;
    } catch {
      return null;
    }
  }

  async deleteRefreshToken(tokenId: string): Promise<void> {
    const client = await this.getClient();
    const key = this.key('refresh', tokenId);
    
    // Get token data to find user and family
    const data = await this.getRefreshToken(tokenId);
    
    // Delete the token
    await client.del(key);
    
    // Remove from user's token set
    if (data) {
      const userKey = this.key('user_tokens', data.userId);
      await client.sRem(userKey, tokenId);
      
      const familyKey = this.key('family', data.family);
      await client.sRem(familyKey, tokenId);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Family Operations
  // ─────────────────────────────────────────────────────────────────────────────

  async revokeTokenFamily(family: string): Promise<void> {
    const client = await this.getClient();
    const familyKey = this.key('family', family);
    
    // Get all tokens in this family
    const tokenIds = await client.sMembers(familyKey);
    
    // Delete each token
    for (const tokenId of tokenIds) {
      await this.deleteRefreshToken(tokenId);
    }
    
    // Delete the family set
    await client.del(familyKey);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    const client = await this.getClient();
    const userKey = this.key('user_tokens', userId);
    
    // Get all user's tokens
    const tokenIds = await client.sMembers(userKey);
    
    // Delete each token
    for (const tokenId of tokenIds) {
      const key = this.key('refresh', tokenId);
      await client.del(key);
    }
    
    // Delete the user's token set
    await client.del(userKey);
  }

  async close(): Promise<void> {
    if (this.connected && this.client) {
      await this.client.quit();
      this.connected = false;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY TOKEN STORE (Development Fallback)
// ═══════════════════════════════════════════════════════════════════════════════

class MemoryTokenStore implements TokenStore {
  private revokedTokens = new Map<string, number>(); // jti -> expiresAt
  private refreshTokens = new Map<string, RefreshTokenData>();
  private userTokens = new Map<string, Set<string>>(); // userId -> Set<tokenId>
  private familyTokens = new Map<string, Set<string>>(); // family -> Set<tokenId>
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    console.warn(
      '[TokenStore] Using in-memory store. Token revocation will not persist ' +
      'across instances or restarts. Set REDIS_URL for production.'
    );
    
    // Periodic cleanup of expired tokens
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    
    // Clean expired revoked tokens
    for (const [jti, expiresAt] of this.revokedTokens.entries()) {
      if (expiresAt < now) {
        this.revokedTokens.delete(jti);
      }
    }
    
    // Clean expired refresh tokens
    for (const [tokenId, data] of this.refreshTokens.entries()) {
      if (data.expiresAt < now) {
        this.refreshTokens.delete(tokenId);
        
        // Clean from user and family sets
        this.userTokens.get(data.userId)?.delete(tokenId);
        this.familyTokens.get(data.family)?.delete(tokenId);
      }
    }
  }

  async revokeToken(jti: string, ttl?: number): Promise<void> {
    const expiresAt = Date.now() + (ttl || 15 * 60) * 1000;
    this.revokedTokens.set(jti, expiresAt);
  }

  async isTokenRevoked(jti: string): Promise<boolean> {
    const expiresAt = this.revokedTokens.get(jti);
    if (!expiresAt) return false;
    
    if (expiresAt < Date.now()) {
      this.revokedTokens.delete(jti);
      return false;
    }
    
    return true;
  }

  async storeRefreshToken(tokenId: string, data: RefreshTokenData): Promise<void> {
    this.refreshTokens.set(tokenId, data);
    
    // Add to user's token set
    if (!this.userTokens.has(data.userId)) {
      this.userTokens.set(data.userId, new Set());
    }
    this.userTokens.get(data.userId)!.add(tokenId);
    
    // Add to family set
    if (!this.familyTokens.has(data.family)) {
      this.familyTokens.set(data.family, new Set());
    }
    this.familyTokens.get(data.family)!.add(tokenId);
  }

  async getRefreshToken(tokenId: string): Promise<RefreshTokenData | null> {
    const data = this.refreshTokens.get(tokenId);
    
    if (!data) return null;
    
    // Check expiration
    if (data.expiresAt < Date.now()) {
      await this.deleteRefreshToken(tokenId);
      return null;
    }
    
    return data;
  }

  async deleteRefreshToken(tokenId: string): Promise<void> {
    const data = this.refreshTokens.get(tokenId);
    
    if (data) {
      this.userTokens.get(data.userId)?.delete(tokenId);
      this.familyTokens.get(data.family)?.delete(tokenId);
    }
    
    this.refreshTokens.delete(tokenId);
  }

  async revokeTokenFamily(family: string): Promise<void> {
    const tokenIds = this.familyTokens.get(family);
    
    if (tokenIds) {
      for (const tokenId of tokenIds) {
        await this.deleteRefreshToken(tokenId);
      }
    }
    
    this.familyTokens.delete(family);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    const tokenIds = this.userTokens.get(userId);
    
    if (tokenIds) {
      for (const tokenId of tokenIds) {
        this.refreshTokens.delete(tokenId);
        
        // Also remove from family sets
        const data = this.refreshTokens.get(tokenId);
        if (data) {
          this.familyTokens.get(data.family)?.delete(tokenId);
        }
      }
    }
    
    this.userTokens.delete(userId);
  }

  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

let tokenStoreInstance: TokenStore | null = null;

/**
 * Get or create the token store singleton
 */
export function getTokenStore(): TokenStore {
  if (tokenStoreInstance) {
    return tokenStoreInstance;
  }

  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    tokenStoreInstance = new RedisTokenStore({
      redisUrl,
      keyPrefix: 'bizra:auth:',
      revokedTokenTTL: 15 * 60,      // 15 minutes (match access token expiry)
      refreshTokenTTL: 7 * 24 * 60 * 60  // 7 days
    });
  } else {
    tokenStoreInstance = new MemoryTokenStore();
  }

  return tokenStoreInstance;
}

/**
 * Helper exports for convenience
 */
export async function revokeToken(jti: string): Promise<void> {
  return getTokenStore().revokeToken(jti);
}

export async function isTokenRevoked(jti: string): Promise<boolean> {
  return getTokenStore().isTokenRevoked(jti);
}

export { RedisTokenStore, MemoryTokenStore };
