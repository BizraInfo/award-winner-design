/**
 * Rate Limiting Module
 * 
 * Elite rate limiting with:
 * - Sliding window algorithm
 * - Token bucket algorithm
 * - Per-user/IP quotas
 * - Distributed rate limiting support
 * - Graceful degradation
 * 
 * @module lib/rate-limit
 */

export type RateLimitAlgorithm = 'sliding-window' | 'token-bucket' | 'fixed-window' | 'leaky-bucket';

export interface RateLimitConfig {
  algorithm: RateLimitAlgorithm;
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (request: Request) => string; // Custom key generator
  skip?: (request: Request) => boolean; // Skip rate limiting
  onRateLimit?: (key: string, info: RateLimitInfo) => void; // Callback when limited
  headers?: boolean; // Include rate limit headers in response
  store?: RateLimitStore; // Custom storage backend
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  retryAfter?: number; // Seconds until retry
  blocked: boolean;
}

export interface RateLimitStore {
  get(key: string): Promise<RateLimitEntry | null>;
  set(key: string, entry: RateLimitEntry, ttlMs: number): Promise<void>;
  increment(key: string, ttlMs: number): Promise<number>;
  delete(key: string): Promise<void>;
}

export interface RateLimitEntry {
  count: number;
  windowStart: number;
  tokens?: number; // For token bucket
  lastRefill?: number; // For token bucket
}

/**
 * In-memory rate limit store (for single instance)
 */
export class MemoryStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(cleanupIntervalMs = 60000) {
    // Periodic cleanup of expired entries
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, cleanupIntervalMs);
    }
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    return this.store.get(key) || null;
  }

  async set(key: string, entry: RateLimitEntry, _ttlMs: number): Promise<void> {
    this.store.set(key, entry);
  }

  async increment(key: string, ttlMs: number): Promise<number> {
    const existing = this.store.get(key);
    const now = Date.now();
    
    if (existing && now - existing.windowStart < ttlMs) {
      existing.count++;
      return existing.count;
    }
    
    // New window
    this.store.set(key, { count: 1, windowStart: now });
    return 1;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      // Remove entries older than 24 hours
      if (now - entry.windowStart > 24 * 60 * 60 * 1000) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

/**
 * Sliding Window Rate Limiter
 */
export class SlidingWindowLimiter {
  private store: RateLimitStore;
  private windowMs: number;
  private maxRequests: number;
  private requestLog = new Map<string, number[]>();

  constructor(config: { windowMs: number; maxRequests: number; store?: RateLimitStore }) {
    this.windowMs = config.windowMs;
    this.maxRequests = config.maxRequests;
    this.store = config.store || new MemoryStore();
  }

  async check(key: string): Promise<RateLimitInfo> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get request timestamps for this key
    let timestamps = this.requestLog.get(key) || [];
    
    // Filter to only requests in current window
    timestamps = timestamps.filter(t => t > windowStart);

    const count = timestamps.length;
    const remaining = Math.max(0, this.maxRequests - count);
    const reset = Math.ceil((now + this.windowMs) / 1000);
    const blocked = count >= this.maxRequests;

    return {
      limit: this.maxRequests,
      remaining,
      reset,
      retryAfter: blocked ? Math.ceil(this.windowMs / 1000) : undefined,
      blocked,
    };
  }

  async consume(key: string): Promise<RateLimitInfo> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let timestamps = this.requestLog.get(key) || [];
    timestamps = timestamps.filter(t => t > windowStart);

    if (timestamps.length >= this.maxRequests) {
      return {
        limit: this.maxRequests,
        remaining: 0,
        reset: Math.ceil((timestamps[0] + this.windowMs) / 1000),
        retryAfter: Math.ceil((timestamps[0] + this.windowMs - now) / 1000),
        blocked: true,
      };
    }

    timestamps.push(now);
    this.requestLog.set(key, timestamps);

    return {
      limit: this.maxRequests,
      remaining: this.maxRequests - timestamps.length,
      reset: Math.ceil((now + this.windowMs) / 1000),
      blocked: false,
    };
  }

  async reset(key: string): Promise<void> {
    this.requestLog.delete(key);
  }
}

/**
 * Token Bucket Rate Limiter
 */
export class TokenBucketLimiter {
  private store: RateLimitStore;
  private bucketSize: number;
  private refillRate: number; // Tokens per second
  private buckets = new Map<string, { tokens: number; lastRefill: number }>();

  constructor(config: { bucketSize: number; refillRate: number; store?: RateLimitStore }) {
    this.bucketSize = config.bucketSize;
    this.refillRate = config.refillRate;
    this.store = config.store || new MemoryStore();
  }

  async check(key: string): Promise<RateLimitInfo> {
    const bucket = this.getBucket(key);
    this.refillBucket(bucket);

    return {
      limit: this.bucketSize,
      remaining: Math.floor(bucket.tokens),
      reset: Math.ceil(Date.now() / 1000 + (this.bucketSize - bucket.tokens) / this.refillRate),
      blocked: bucket.tokens < 1,
    };
  }

  async consume(key: string, tokens = 1): Promise<RateLimitInfo> {
    const bucket = this.getBucket(key);
    this.refillBucket(bucket);

    if (bucket.tokens < tokens) {
      const waitTime = (tokens - bucket.tokens) / this.refillRate;
      return {
        limit: this.bucketSize,
        remaining: Math.floor(bucket.tokens),
        reset: Math.ceil(Date.now() / 1000 + waitTime),
        retryAfter: Math.ceil(waitTime),
        blocked: true,
      };
    }

    bucket.tokens -= tokens;
    this.buckets.set(key, bucket);

    return {
      limit: this.bucketSize,
      remaining: Math.floor(bucket.tokens),
      reset: Math.ceil(Date.now() / 1000 + (this.bucketSize - bucket.tokens) / this.refillRate),
      blocked: false,
    };
  }

  private getBucket(key: string): { tokens: number; lastRefill: number } {
    return this.buckets.get(key) || { tokens: this.bucketSize, lastRefill: Date.now() };
  }

  private refillBucket(bucket: { tokens: number; lastRefill: number }): void {
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;
    
    bucket.tokens = Math.min(this.bucketSize, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  async reset(key: string): Promise<void> {
    this.buckets.delete(key);
  }
}

/**
 * Fixed Window Rate Limiter
 */
export class FixedWindowLimiter {
  private store: RateLimitStore;
  private windowMs: number;
  private maxRequests: number;

  constructor(config: { windowMs: number; maxRequests: number; store?: RateLimitStore }) {
    this.windowMs = config.windowMs;
    this.maxRequests = config.maxRequests;
    this.store = config.store || new MemoryStore();
  }

  async check(key: string): Promise<RateLimitInfo> {
    const entry = await this.store.get(key);
    const now = Date.now();

    if (!entry || now - entry.windowStart >= this.windowMs) {
      return {
        limit: this.maxRequests,
        remaining: this.maxRequests,
        reset: Math.ceil((now + this.windowMs) / 1000),
        blocked: false,
      };
    }

    const remaining = Math.max(0, this.maxRequests - entry.count);
    return {
      limit: this.maxRequests,
      remaining,
      reset: Math.ceil((entry.windowStart + this.windowMs) / 1000),
      retryAfter: remaining === 0 ? Math.ceil((entry.windowStart + this.windowMs - now) / 1000) : undefined,
      blocked: remaining === 0,
    };
  }

  async consume(key: string): Promise<RateLimitInfo> {
    const count = await this.store.increment(key, this.windowMs);
    const now = Date.now();
    
    const remaining = Math.max(0, this.maxRequests - count);
    const blocked = count > this.maxRequests;

    return {
      limit: this.maxRequests,
      remaining,
      reset: Math.ceil((now + this.windowMs) / 1000),
      retryAfter: blocked ? Math.ceil(this.windowMs / 1000) : undefined,
      blocked,
    };
  }

  async reset(key: string): Promise<void> {
    await this.store.delete(key);
  }
}

/**
 * Rate Limit Middleware Factory
 */
export function createRateLimiter(config: RateLimitConfig) {
  const store = config.store || new MemoryStore();
  
  let limiter: SlidingWindowLimiter | TokenBucketLimiter | FixedWindowLimiter;
  
  switch (config.algorithm) {
    case 'token-bucket':
      limiter = new TokenBucketLimiter({
        bucketSize: config.maxRequests,
        refillRate: config.maxRequests / (config.windowMs / 1000),
        store,
      });
      break;
    case 'fixed-window':
      limiter = new FixedWindowLimiter({
        windowMs: config.windowMs,
        maxRequests: config.maxRequests,
        store,
      });
      break;
    case 'sliding-window':
    default:
      limiter = new SlidingWindowLimiter({
        windowMs: config.windowMs,
        maxRequests: config.maxRequests,
        store,
      });
  }

  const keyGenerator = config.keyGenerator || defaultKeyGenerator;

  return async function rateLimitMiddleware(
    request: Request,
    handler: (req: Request) => Promise<Response>
  ): Promise<Response> {
    // Check if should skip
    if (config.skip?.(request)) {
      return handler(request);
    }

    const key = keyGenerator(request);
    const info = await limiter.consume(key);

    if (info.blocked) {
      config.onRateLimit?.(key, info);
      
      const response = new Response(
        JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: info.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...(config.headers !== false ? getRateLimitHeaders(info) : {}),
          },
        }
      );
      
      return response;
    }

    const response = await handler(request);

    // Add rate limit headers
    if (config.headers !== false) {
      const headers = getRateLimitHeaders(info);
      for (const [name, value] of Object.entries(headers)) {
        response.headers.set(name, value);
      }
    }

    return response;
  };
}

/**
 * Default key generator (uses IP or forwarded header)
 */
function defaultKeyGenerator(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfIp = request.headers.get('cf-connecting-ip');
  
  return cfIp || realIp || forwarded?.split(',')[0].trim() || 'unknown';
}

/**
 * Generate rate limit headers
 */
function getRateLimitHeaders(info: RateLimitInfo): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(info.limit),
    'X-RateLimit-Remaining': String(info.remaining),
    'X-RateLimit-Reset': String(info.reset),
  };

  if (info.retryAfter !== undefined) {
    headers['Retry-After'] = String(info.retryAfter);
  }

  return headers;
}

/**
 * User quota manager for per-user limits
 */
export class UserQuotaManager {
  private quotas = new Map<string, UserQuota>();
  private defaultQuota: QuotaConfig;

  constructor(defaultQuota: QuotaConfig) {
    this.defaultQuota = defaultQuota;
  }

  /**
   * Set custom quota for a user
   */
  setUserQuota(userId: string, quota: Partial<QuotaConfig>): void {
    const existing = this.quotas.get(userId);
    this.quotas.set(userId, {
      config: { ...this.defaultQuota, ...quota },
      usage: existing?.usage || { requests: 0, data: 0, lastReset: Date.now() },
    });
  }

  /**
   * Get user quota info
   */
  getUserQuota(userId: string): UserQuotaInfo {
    const quota = this.quotas.get(userId) || {
      config: this.defaultQuota,
      usage: { requests: 0, data: 0, lastReset: Date.now() },
    };

    this.maybeResetQuota(userId, quota);

    return {
      userId,
      ...quota.config,
      currentRequests: quota.usage.requests,
      currentData: quota.usage.data,
      remainingRequests: quota.config.requestsPerMonth - quota.usage.requests,
      remainingData: quota.config.dataPerMonth - quota.usage.data,
      resetDate: new Date(quota.usage.lastReset + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Consume quota
   */
  consumeQuota(userId: string, requests = 1, dataBytes = 0): boolean {
    let quota = this.quotas.get(userId);
    
    if (!quota) {
      quota = {
        config: this.defaultQuota,
        usage: { requests: 0, data: 0, lastReset: Date.now() },
      };
      this.quotas.set(userId, quota);
    }

    this.maybeResetQuota(userId, quota);

    // Check if over quota
    if (
      quota.usage.requests + requests > quota.config.requestsPerMonth ||
      quota.usage.data + dataBytes > quota.config.dataPerMonth
    ) {
      return false;
    }

    quota.usage.requests += requests;
    quota.usage.data += dataBytes;
    return true;
  }

  /**
   * Reset quota if month has passed
   */
  private maybeResetQuota(userId: string, quota: UserQuota): void {
    const monthMs = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - quota.usage.lastReset >= monthMs) {
      quota.usage = { requests: 0, data: 0, lastReset: Date.now() };
    }
  }
}

interface QuotaConfig {
  requestsPerMonth: number;
  dataPerMonth: number; // bytes
  rateLimit: number; // requests per minute
}

interface UserQuota {
  config: QuotaConfig;
  usage: {
    requests: number;
    data: number;
    lastReset: number;
  };
}

interface UserQuotaInfo {
  userId: string;
  requestsPerMonth: number;
  dataPerMonth: number;
  rateLimit: number;
  currentRequests: number;
  currentData: number;
  remainingRequests: number;
  remainingData: number;
  resetDate: string;
}

// Default configurations
export const RATE_LIMIT_PRESETS = {
  // Strict: 10 requests per minute
  strict: {
    algorithm: 'sliding-window' as RateLimitAlgorithm,
    windowMs: 60 * 1000,
    maxRequests: 10,
    headers: true,
  },
  // Standard: 100 requests per minute
  standard: {
    algorithm: 'sliding-window' as RateLimitAlgorithm,
    windowMs: 60 * 1000,
    maxRequests: 100,
    headers: true,
  },
  // Relaxed: 1000 requests per minute
  relaxed: {
    algorithm: 'token-bucket' as RateLimitAlgorithm,
    windowMs: 60 * 1000,
    maxRequests: 1000,
    headers: true,
  },
  // API: 60 requests per minute (1 per second)
  api: {
    algorithm: 'sliding-window' as RateLimitAlgorithm,
    windowMs: 60 * 1000,
    maxRequests: 60,
    headers: true,
  },
  // Auth: 5 requests per 15 minutes (prevent brute force)
  auth: {
    algorithm: 'fixed-window' as RateLimitAlgorithm,
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    headers: true,
  },
};

// Export quota presets
export const QUOTA_PRESETS = {
  free: {
    requestsPerMonth: 1000,
    dataPerMonth: 100 * 1024 * 1024, // 100MB
    rateLimit: 10,
  },
  starter: {
    requestsPerMonth: 10000,
    dataPerMonth: 1024 * 1024 * 1024, // 1GB
    rateLimit: 60,
  },
  pro: {
    requestsPerMonth: 100000,
    dataPerMonth: 10 * 1024 * 1024 * 1024, // 10GB
    rateLimit: 300,
  },
  enterprise: {
    requestsPerMonth: 1000000,
    dataPerMonth: 100 * 1024 * 1024 * 1024, // 100GB
    rateLimit: 1000,
  },
};
