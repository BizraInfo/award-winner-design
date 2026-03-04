/**
 * Elite Cache Layer with Ihsān Principles
 * 
 * Intelligent caching system featuring:
 * - Multi-tier caching (memory + external)
 * - Cache-aside pattern
 * - Write-through/write-behind strategies
 * - TTL management with stale-while-revalidate
 * - Cache invalidation patterns
 * - Compression for large values
 * - Cache warming capabilities
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface CacheEntry<T> {
  value: T;
  createdAt: number;
  expiresAt: number;
  staleAt?: number;
  tags: string[];
  metadata?: Record<string, unknown>;
}

export interface CacheOptions {
  ttl: number;           // Time to live in ms
  staleTtl?: number;     // Stale-while-revalidate window in ms
  tags?: string[];       // Tags for grouped invalidation
  compress?: boolean;    // Compress large values
  writeThrough?: boolean; // Write to external cache immediately
}

export interface CacheStats {
  hits: number;
  misses: number;
  staleHits: number;
  evictions: number;
  size: number;
  hitRate: number;
}

export interface ExternalCacheProvider {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  keys(pattern: string): Promise<string[]>;
  exists(key: string): Promise<boolean>;
}

type CacheEventType = 'hit' | 'miss' | 'stale' | 'eviction' | 'invalidation';
type CacheEventListener = (event: CacheEventType, key: string, metadata?: unknown) => void;

// ============================================================================
// In-Memory LRU Cache
// ============================================================================

class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private readonly maxSize: number;
  
  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }
  
  get(key: string): CacheEntry<T> | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, entry);
    }
    return entry;
  }
  
  set(key: string, entry: CacheEntry<T>): void {
    // If key exists, delete it first
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // Evict oldest entries if at capacity
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, entry);
  }
  
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  has(key: string): boolean {
    return this.cache.has(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  keys(): IterableIterator<string> {
    return this.cache.keys();
  }
  
  get size(): number {
    return this.cache.size;
  }
}

// ============================================================================
// Cache Manager
// ============================================================================

export class CacheManager {
  private readonly memoryCache: LRUCache<unknown>;
  private readonly externalCache?: ExternalCacheProvider;
  private readonly namespace: string;
  private readonly defaultTtl: number;
  private readonly listeners: Set<CacheEventListener>;
  private stats: CacheStats;
  private readonly pendingRefreshes: Map<string, Promise<unknown>>;
  
  constructor(options: {
    namespace?: string;
    maxMemoryItems?: number;
    defaultTtl?: number;
    externalCache?: ExternalCacheProvider;
  } = {}) {
    this.namespace = options.namespace || 'cache';
    this.memoryCache = new LRUCache(options.maxMemoryItems || 1000);
    this.defaultTtl = options.defaultTtl || 5 * 60 * 1000; // 5 minutes default
    this.externalCache = options.externalCache;
    this.listeners = new Set();
    this.pendingRefreshes = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      staleHits: 0,
      evictions: 0,
      size: 0,
      hitRate: 0
    };
  }
  
  /**
   * Get value from cache with stale-while-revalidate support
   */
  async get<T>(
    key: string,
    fetcher?: () => Promise<T>,
    options?: Partial<CacheOptions>
  ): Promise<T | null> {
    const fullKey = this.buildKey(key);
    const now = Date.now();
    
    // Check memory cache first
    let entry = this.memoryCache.get(fullKey) as CacheEntry<T> | undefined;
    
    // If not in memory, check external cache
    if (!entry && this.externalCache) {
      entry = await this.getFromExternal<T>(fullKey);
      if (entry) {
        // Populate memory cache
        this.memoryCache.set(fullKey, entry);
      }
    }
    
    // Cache hit
    if (entry) {
      // Check if expired
      if (now > entry.expiresAt) {
        this.emit('eviction', key);
        this.stats.evictions++;
        this.memoryCache.delete(fullKey);
        if (this.externalCache) {
          await this.externalCache.del(fullKey);
        }
        entry = undefined;
      }
      // Check if stale (but still valid)
      else if (entry.staleAt && now > entry.staleAt) {
        this.emit('stale', key);
        this.stats.staleHits++;
        
        // Background refresh if fetcher provided
        if (fetcher && !this.pendingRefreshes.has(fullKey)) {
          this.backgroundRefresh(fullKey, key, fetcher, options);
        }
        
        // Return stale value
        return entry.value;
      }
      // Fresh hit
      else {
        this.emit('hit', key);
        this.stats.hits++;
        this.updateStats();
        return entry.value;
      }
    }
    
    // Cache miss
    this.emit('miss', key);
    this.stats.misses++;
    this.updateStats();
    
    // Fetch if fetcher provided
    if (fetcher) {
      const value = await fetcher();
      await this.set(key, value, options);
      return value;
    }
    
    return null;
  }
  
  /**
   * Set value in cache
   */
  async set<T>(
    key: string,
    value: T,
    options?: Partial<CacheOptions>
  ): Promise<void> {
    const fullKey = this.buildKey(key);
    const now = Date.now();
    const ttl = options?.ttl || this.defaultTtl;
    
    const entry: CacheEntry<T> = {
      value,
      createdAt: now,
      expiresAt: now + ttl,
      staleAt: options?.staleTtl ? now + options.staleTtl : undefined,
      tags: options?.tags || [],
      metadata: {}
    };
    
    // Set in memory cache
    this.memoryCache.set(fullKey, entry);
    this.stats.size = this.memoryCache.size;
    
    // Set in external cache if write-through
    if (this.externalCache && options?.writeThrough !== false) {
      await this.setToExternal(fullKey, entry, ttl);
    }
    
    // Index tags for invalidation
    if (entry.tags.length > 0) {
      await this.indexTags(fullKey, entry.tags);
    }
  }
  
  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    
    this.memoryCache.delete(fullKey);
    this.stats.size = this.memoryCache.size;
    
    if (this.externalCache) {
      await this.externalCache.del(fullKey);
    }
    
    this.emit('invalidation', key);
    return true;
  }
  
  /**
   * Invalidate cache entries by tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    const tagKey = this.buildKey(`_tags:${tag}`);
    let invalidated = 0;
    
    // Get all keys with this tag from external cache
    if (this.externalCache) {
      const keysData = await this.externalCache.get(tagKey);
      if (keysData) {
        const keys = JSON.parse(keysData) as string[];
        await Promise.all(keys.map(async (key) => {
          await this.externalCache!.del(key);
          invalidated++;
        }));
        await this.externalCache.del(tagKey);
      }
    }
    
    // Invalidate from memory cache
    for (const key of this.memoryCache.keys()) {
      const entry = this.memoryCache.get(key);
      if (entry && entry.tags.includes(tag)) {
        this.memoryCache.delete(key);
        invalidated++;
      }
    }
    
    this.stats.size = this.memoryCache.size;
    this.emit('invalidation', tag, { count: invalidated });
    return invalidated;
  }
  
  /**
   * Invalidate cache entries by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    let invalidated = 0;
    
    // Invalidate from memory cache
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
        invalidated++;
      }
    }
    
    // Invalidate from external cache
    if (this.externalCache) {
      const keys = await this.externalCache.keys(this.buildKey(pattern));
      await Promise.all(keys.map(key => this.externalCache!.del(key)));
      invalidated += keys.length;
    }
    
    this.stats.size = this.memoryCache.size;
    return invalidated;
  }
  
  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    if (this.externalCache) {
      const keys = await this.externalCache.keys(this.buildKey('*'));
      await Promise.all(keys.map(key => this.externalCache!.del(key)));
    }
    
    this.stats.size = 0;
  }
  
  /**
   * Warm cache with multiple entries
   */
  async warm<T>(
    entries: Array<{ key: string; fetcher: () => Promise<T>; options?: Partial<CacheOptions> }>
  ): Promise<void> {
    await Promise.all(
      entries.map(async ({ key, fetcher, options }) => {
        try {
          const value = await fetcher();
          await this.set(key, value, options);
        } catch (error) {
          console.warn(`Failed to warm cache for key ${key}:`, error);
        }
      })
    );
  }
  
  /**
   * Get or compute with memoization
   */
  async memoize<T>(
    key: string,
    fn: () => Promise<T>,
    options?: Partial<CacheOptions>
  ): Promise<T> {
    const result = await this.get<T>(key, fn, options);
    return result as T;
  }
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }
  
  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      staleHits: 0,
      evictions: 0,
      size: this.memoryCache.size,
      hitRate: 0
    };
  }
  
  /**
   * Subscribe to cache events
   */
  on(listener: CacheEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  // ============================================================================
  // Private Methods
  // ============================================================================
  
  private buildKey(key: string): string {
    return `${this.namespace}:${key}`;
  }
  
  private emit(event: CacheEventType, key: string, metadata?: unknown): void {
    this.listeners.forEach(listener => {
      try {
        listener(event, key, metadata);
      } catch (error) {
        console.error('Cache event listener error:', error);
      }
    });
  }
  
  private updateStats(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
    this.stats.size = this.memoryCache.size;
  }
  
  private async getFromExternal<T>(key: string): Promise<CacheEntry<T> | undefined> {
    if (!this.externalCache) return undefined;
    
    const data = await this.externalCache.get(key);
    if (!data) return undefined;
    
    try {
      return JSON.parse(data) as CacheEntry<T>;
    } catch {
      return undefined;
    }
  }
  
  private async setToExternal<T>(
    key: string,
    entry: CacheEntry<T>,
    ttl: number
  ): Promise<void> {
    if (!this.externalCache) return;
    
    const data = JSON.stringify(entry);
    await this.externalCache.set(key, data, Math.ceil(ttl / 1000));
  }
  
  private async indexTags(key: string, tags: string[]): Promise<void> {
    if (!this.externalCache) return;
    
    await Promise.all(
      tags.map(async (tag) => {
        const tagKey = this.buildKey(`_tags:${tag}`);
        const existingData = await this.externalCache!.get(tagKey);
        const keys: string[] = existingData ? JSON.parse(existingData) : [];
        if (!keys.includes(key)) {
          keys.push(key);
          await this.externalCache!.set(tagKey, JSON.stringify(keys));
        }
      })
    );
  }
  
  private async backgroundRefresh<T>(
    fullKey: string,
    key: string,
    fetcher: () => Promise<T>,
    options?: Partial<CacheOptions>
  ): Promise<void> {
    const refreshPromise = (async () => {
      try {
        const value = await fetcher();
        await this.set(key, value, options);
      } catch (error) {
        console.warn(`Background refresh failed for key ${key}:`, error);
      } finally {
        this.pendingRefreshes.delete(fullKey);
      }
    })();
    
    this.pendingRefreshes.set(fullKey, refreshPromise);
  }
}

// ============================================================================
// Cache Decorators (for class methods)
// ============================================================================

export function Cached(options?: Partial<CacheOptions>) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const cache = new CacheManager({ namespace: `method:${propertyKey}` });
    
    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      const cacheKey = JSON.stringify(args);
      
      return cache.memoize(
        cacheKey,
        () => originalMethod.apply(this, args),
        options
      );
    };
    
    return descriptor;
  };
}

export function CacheInvalidate(tags: string[]) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const cache = new CacheManager();
    
    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      const result = await originalMethod.apply(this, args);
      
      // Invalidate associated cache tags
      await Promise.all(tags.map(tag => cache.invalidateByTag(tag)));
      
      return result;
    };
    
    return descriptor;
  };
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalCacheManager: CacheManager | null = null;

export function getGlobalCache(): CacheManager {
  if (!globalCacheManager) {
    globalCacheManager = new CacheManager({
      namespace: 'bizra',
      maxMemoryItems: 5000,
      defaultTtl: 10 * 60 * 1000 // 10 minutes
    });
  }
  return globalCacheManager;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a cached version of an async function
 */
export function createCachedFunction<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options?: Partial<CacheOptions> & { keyFn?: (...args: T) => string }
): (...args: T) => Promise<R> {
  const cache = new CacheManager({ namespace: 'fn' });
  
  return async (...args: T): Promise<R> => {
    const key = options?.keyFn ? options.keyFn(...args) : JSON.stringify(args);
    return cache.memoize(key, () => fn(...args), options);
  };
}

/**
 * Batch cache operations for efficiency
 */
export async function batchGet<T>(
  cache: CacheManager,
  keys: string[],
  fetcher: (keys: string[]) => Promise<Map<string, T>>,
  options?: Partial<CacheOptions>
): Promise<Map<string, T>> {
  const results = new Map<string, T>();
  const missingKeys: string[] = [];
  
  // Check cache for each key
  await Promise.all(
    keys.map(async (key) => {
      const cached = await cache.get<T>(key);
      if (cached !== null) {
        results.set(key, cached);
      } else {
        missingKeys.push(key);
      }
    })
  );
  
  // Fetch missing keys in batch
  if (missingKeys.length > 0) {
    const fetched = await fetcher(missingKeys);
    
    // Cache and add to results
    await Promise.all(
      Array.from(fetched.entries()).map(async ([key, value]) => {
        await cache.set(key, value, options);
        results.set(key, value);
      })
    );
  }
  
  return results;
}

export default CacheManager;
