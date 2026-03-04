/**
 * Elite Data Fetching & Caching System with Ihsān Principles
 * 
 * Advanced data management featuring:
 * - SWR-like stale-while-revalidate pattern
 * - Request deduplication
 * - Smart caching with TTL
 * - Optimistic updates
 * - Automatic retries with backoff
 * - Prefetching
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface FetcherOptions<T> {
  fetcher: () => Promise<T>;
  key: string;
  ttl?: number;                        // Time to live in ms (default: 5 minutes)
  staleTime?: number;                  // Consider stale after ms (default: 0)
  cacheTime?: number;                  // Keep in cache after unmount (default: 5 min)
  retry?: number | boolean;            // Retry count (default: 3)
  retryDelay?: number | ((attempt: number) => number);
  dedupe?: boolean;                    // Deduplicate concurrent requests
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
  revalidateInterval?: number;         // Polling interval in ms
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onSettled?: (data: T | undefined, error: Error | undefined) => void;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  error?: Error;
  isValidating: boolean;
}

export interface QueryState<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isValidating: boolean;
  isStale: boolean;
  isFetching: boolean;
}

export interface MutationOptions<T, TVariables> {
  mutationFn: (variables: TVariables) => Promise<T>;
  onMutate?: (variables: TVariables) => Promise<unknown> | unknown;
  onSuccess?: (data: T, variables: TVariables, context: unknown) => void;
  onError?: (error: Error, variables: TVariables, context: unknown) => void;
  onSettled?: (data: T | undefined, error: Error | undefined, variables: TVariables, context: unknown) => void;
  retry?: number | boolean;
}

export interface MutationState<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isIdle: boolean;
}

export interface InfiniteQueryOptions<T> extends Omit<FetcherOptions<T[]>, 'fetcher'> {
  fetcher: (pageParam: unknown) => Promise<T[]>;
  getNextPageParam: (lastPage: T[], allPages: T[][]) => unknown | undefined;
  getPreviousPageParam?: (firstPage: T[], allPages: T[][]) => unknown | undefined;
  initialPageParam?: unknown;
}

// ============================================================================
// Cache Manager
// ============================================================================

class CacheManager {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private subscribers: Map<string, Set<(entry: CacheEntry<unknown>) => void>> = new Map();
  private gcInterval: ReturnType<typeof setInterval> | null = null;
  
  constructor() {
    // Start garbage collection
    this.startGC();
  }
  
  /**
   * Get cached data
   */
  get<T>(key: string): CacheEntry<T> | undefined {
    return this.cache.get(key) as CacheEntry<T> | undefined;
  }
  
  /**
   * Set cached data
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      isValidating: false
    };
    
    this.cache.set(key, entry as CacheEntry<unknown>);
    this.notify(key);
  }
  
  /**
   * Update entry state
   */
  update<T>(key: string, updates: Partial<CacheEntry<T>>): void {
    const entry = this.cache.get(key);
    if (entry) {
      Object.assign(entry, updates);
      this.notify(key);
    }
  }
  
  /**
   * Delete cached data
   */
  delete(key: string): void {
    this.cache.delete(key);
    this.notify(key);
  }
  
  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.subscribers.forEach((_, key) => this.notify(key));
  }
  
  /**
   * Invalidate cache entries matching pattern
   */
  invalidate(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
      }
    }
  }
  
  /**
   * Subscribe to cache updates
   */
  subscribe(key: string, callback: (entry: CacheEntry<unknown>) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    
    this.subscribers.get(key)!.add(callback);
    
    return () => {
      const subs = this.subscribers.get(key);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }
  
  /**
   * Check if data is stale
   */
  isStale(key: string, staleTime: number = 0): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;
    
    return Date.now() - entry.timestamp > staleTime;
  }
  
  /**
   * Check if data is expired
   */
  isExpired(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;
    
    return Date.now() > entry.expiresAt;
  }
  
  // ============================================================================
  // Private Methods
  // ============================================================================
  
  private notify(key: string): void {
    const entry = this.cache.get(key);
    const subs = this.subscribers.get(key);
    
    if (subs && entry) {
      subs.forEach(callback => {
        try {
          callback(entry);
        } catch (error) {
          console.error('[CacheManager] Subscriber error:', error);
        }
      });
    }
  }
  
  private startGC(): void {
    // Run garbage collection every minute
    this.gcInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [key, entry] of this.cache.entries()) {
        // Remove expired entries that have no subscribers
        if (now > entry.expiresAt && !this.subscribers.has(key)) {
          this.cache.delete(key);
        }
      }
    }, 60 * 1000);
  }
  
  /**
   * Stop garbage collection
   */
  destroy(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
    }
    this.cache.clear();
    this.subscribers.clear();
  }
}

// Global cache instance
export const cache = new CacheManager();

// ============================================================================
// Request Deduplication
// ============================================================================

class RequestDeduplicator {
  private inflight: Map<string, Promise<unknown>> = new Map();
  
  /**
   * Execute or return existing request
   */
  async execute<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // Check for existing request
    const existing = this.inflight.get(key);
    if (existing) {
      return existing as Promise<T>;
    }
    
    // Create new request
    const promise = fetcher()
      .finally(() => {
        this.inflight.delete(key);
      });
    
    this.inflight.set(key, promise);
    return promise;
  }
  
  /**
   * Check if request is in-flight
   */
  isInFlight(key: string): boolean {
    return this.inflight.has(key);
  }
  
  /**
   * Cancel all pending requests
   */
  clear(): void {
    this.inflight.clear();
  }
}

const deduplicator = new RequestDeduplicator();

// ============================================================================
// Query Client
// ============================================================================

export class QueryClient {
  private listeners: Set<() => void> = new Set();
  private focusHandler: (() => void) | null = null;
  private reconnectHandler: (() => void) | null = null;
  
  constructor() {
    this.setupEventListeners();
  }
  
  /**
   * Fetch data with SWR pattern
   */
  async query<T>(options: FetcherOptions<T>): Promise<QueryState<T>> {
    const {
      fetcher,
      key,
      ttl = 5 * 60 * 1000,
      staleTime = 0,
      retry = 3,
      retryDelay = (attempt) => Math.min(1000 * Math.pow(2, attempt), 30000),
      dedupe = true,
      onSuccess,
      onError,
      onSettled
    } = options;
    
    // Check cache
    const cached = cache.get<T>(key);
    const isStale = cache.isStale(key, staleTime);
    
    // Return cached data if fresh
    if (cached && !isStale && !cached.error) {
      return {
        data: cached.data,
        error: undefined,
        isLoading: false,
        isValidating: false,
        isStale: false,
        isFetching: false
      };
    }
    
    // Mark as validating
    if (cached) {
      cache.update(key, { isValidating: true });
    }
    
    // Fetch with retry logic
    const fetchWithRetry = async (): Promise<T> => {
      const maxRetries = typeof retry === 'number' ? retry : (retry ? 3 : 0);
      let lastError: Error | undefined;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const data = dedupe
            ? await deduplicator.execute(key, fetcher)
            : await fetcher();
          
          // Update cache
          cache.set(key, data, ttl);
          onSuccess?.(data);
          onSettled?.(data, undefined);
          
          return data;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          if (attempt < maxRetries) {
            const delay = typeof retryDelay === 'function'
              ? retryDelay(attempt)
              : retryDelay;
            await this.sleep(delay);
          }
        }
      }
      
      // All retries failed
      cache.update(key, { error: lastError, isValidating: false });
      onError?.(lastError!);
      onSettled?.(undefined, lastError);
      throw lastError;
    };
    
    try {
      const data = await fetchWithRetry();
      
      return {
        data,
        error: undefined,
        isLoading: false,
        isValidating: false,
        isStale: false,
        isFetching: false
      };
    } catch (error) {
      return {
        data: cached?.data,
        error: error instanceof Error ? error : new Error(String(error)),
        isLoading: false,
        isValidating: false,
        isStale: !!cached,
        isFetching: false
      };
    }
  }
  
  /**
   * Prefetch data
   */
  async prefetch<T>(options: FetcherOptions<T>): Promise<void> {
    const cached = cache.get<T>(options.key);
    
    if (!cached || cache.isStale(options.key, options.staleTime)) {
      await this.query(options).catch(() => {});
    }
  }
  
  /**
   * Mutate data
   */
  async mutate<T, TVariables>(
    options: MutationOptions<T, TVariables>,
    variables: TVariables
  ): Promise<MutationState<T>> {
    const { mutationFn, onMutate, onSuccess, onError, onSettled, retry = 0 } = options;
    
    let context: unknown;
    
    try {
      // Call onMutate
      context = await onMutate?.(variables);
      
      // Execute mutation with retry
      const maxRetries = typeof retry === 'number' ? retry : (retry ? 3 : 0);
      let lastError: Error | undefined;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const data = await mutationFn(variables);
          
          onSuccess?.(data, variables, context);
          onSettled?.(data, undefined, variables, context);
          
          return {
            data,
            error: undefined,
            isLoading: false,
            isSuccess: true,
            isError: false,
            isIdle: false
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          if (attempt < maxRetries) {
            await this.sleep(Math.min(1000 * Math.pow(2, attempt), 10000));
          }
        }
      }
      
      throw lastError;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err, variables, context);
      onSettled?.(undefined, err, variables, context);
      
      return {
        data: undefined,
        error: err,
        isLoading: false,
        isSuccess: false,
        isError: true,
        isIdle: false
      };
    }
  }
  
  /**
   * Optimistic update
   */
  async optimisticUpdate<T>(
    key: string,
    updater: (current: T | undefined) => T,
    mutation: () => Promise<T>
  ): Promise<T> {
    const previous = cache.get<T>(key);
    
    // Apply optimistic update
    const optimisticData = updater(previous?.data);
    cache.set(key, optimisticData);
    
    try {
      // Execute mutation
      const data = await mutation();
      cache.set(key, data);
      return data;
    } catch (error) {
      // Rollback on error
      if (previous) {
        cache.set(key, previous.data);
      } else {
        cache.delete(key);
      }
      throw error;
    }
  }
  
  /**
   * Invalidate queries
   */
  invalidateQueries(pattern: string | RegExp): void {
    cache.invalidate(pattern);
    this.notifyListeners();
  }
  
  /**
   * Set query data manually
   */
  setQueryData<T>(key: string, data: T, ttl?: number): void {
    cache.set(key, data, ttl);
  }
  
  /**
   * Get query data
   */
  getQueryData<T>(key: string): T | undefined {
    return cache.get<T>(key)?.data;
  }
  
  /**
   * Subscribe to query changes
   */
  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  /**
   * Clear all cache and pending requests
   */
  clear(): void {
    cache.clear();
    deduplicator.clear();
    this.notifyListeners();
  }
  
  // ============================================================================
  // Private Methods
  // ============================================================================
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('[QueryClient] Listener error:', error);
      }
    });
  }
  
  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;
    
    // Revalidate on focus
    this.focusHandler = () => {
      this.notifyListeners();
    };
    window.addEventListener('focus', this.focusHandler);
    
    // Revalidate on reconnect
    this.reconnectHandler = () => {
      this.notifyListeners();
    };
    window.addEventListener('online', this.reconnectHandler);
  }
  
  /**
   * Cleanup event listeners
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      if (this.focusHandler) {
        window.removeEventListener('focus', this.focusHandler);
      }
      if (this.reconnectHandler) {
        window.removeEventListener('online', this.reconnectHandler);
      }
    }
    
    cache.destroy();
    this.listeners.clear();
  }
}

// ============================================================================
// Infinite Query
// ============================================================================

export class InfiniteQueryManager<T> {
  private pages: T[][] = [];
  private pageParams: unknown[] = [];
  private options: InfiniteQueryOptions<T>;
  private client: QueryClient;
  private isFetching = false;
  private hasNextPage = true;
  private hasPreviousPage = false;
  
  constructor(options: InfiniteQueryOptions<T>, client: QueryClient) {
    this.options = options;
    this.client = client;
    this.pageParams = [options.initialPageParam ?? 0];
  }
  
  /**
   * Fetch next page
   */
  async fetchNextPage(): Promise<T[][]> {
    if (this.isFetching || !this.hasNextPage) {
      return this.pages;
    }
    
    this.isFetching = true;
    
    try {
      const pageParam = this.pageParams[this.pageParams.length - 1];
      const page = await this.options.fetcher(pageParam);
      
      this.pages.push(page);
      
      // Get next page param
      const nextParam = this.options.getNextPageParam(page, this.pages);
      
      if (nextParam !== undefined) {
        this.pageParams.push(nextParam);
        this.hasNextPage = true;
      } else {
        this.hasNextPage = false;
      }
      
      return this.pages;
    } finally {
      this.isFetching = false;
    }
  }
  
  /**
   * Fetch previous page
   */
  async fetchPreviousPage(): Promise<T[][]> {
    if (this.isFetching || !this.hasPreviousPage || !this.options.getPreviousPageParam) {
      return this.pages;
    }
    
    this.isFetching = true;
    
    try {
      const pageParam = this.options.getPreviousPageParam(this.pages[0], this.pages);
      
      if (pageParam === undefined) {
        this.hasPreviousPage = false;
        return this.pages;
      }
      
      const page = await this.options.fetcher(pageParam);
      
      this.pages.unshift(page);
      this.pageParams.unshift(pageParam);
      
      return this.pages;
    } finally {
      this.isFetching = false;
    }
  }
  
  /**
   * Refetch all pages
   */
  async refetchPages(): Promise<T[][]> {
    const params = [...this.pageParams];
    this.pages = [];
    
    for (const param of params) {
      const page = await this.options.fetcher(param);
      this.pages.push(page);
    }
    
    return this.pages;
  }
  
  /**
   * Get all data flattened
   */
  getAllData(): T[] {
    return this.pages.flat();
  }
  
  /**
   * Get state
   */
  getState(): {
    pages: T[][];
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    isFetching: boolean;
  } {
    return {
      pages: this.pages,
      hasNextPage: this.hasNextPage,
      hasPreviousPage: this.hasPreviousPage,
      isFetching: this.isFetching
    };
  }
  
  /**
   * Reset to initial state
   */
  reset(): void {
    this.pages = [];
    this.pageParams = [this.options.initialPageParam ?? 0];
    this.hasNextPage = true;
    this.hasPreviousPage = false;
  }
}

// ============================================================================
// HTTP Client with Interceptors
// ============================================================================

export interface RequestConfig extends RequestInit {
  url: string;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  baseURL?: string;
}

export interface ResponseInterceptor {
  onFulfilled?: (response: Response) => Response | Promise<Response>;
  onRejected?: (error: Error) => Error | Promise<never>;
}

export interface RequestInterceptor {
  onFulfilled?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
  onRejected?: (error: Error) => Error | Promise<never>;
}

export class HttpClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private timeout: number;
  
  constructor(config: {
    baseURL?: string;
    headers?: Record<string, string>;
    timeout?: number;
  } = {}) {
    this.baseURL = config.baseURL || '';
    this.defaultHeaders = config.headers || {};
    this.timeout = config.timeout || 30000;
  }
  
  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);
      if (index !== -1) {
        this.requestInterceptors.splice(index, 1);
      }
    };
  }
  
  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      const index = this.responseInterceptors.indexOf(interceptor);
      if (index !== -1) {
        this.responseInterceptors.splice(index, 1);
      }
    };
  }
  
  /**
   * Make HTTP request
   */
  async request<T>(config: RequestConfig): Promise<T> {
    // Apply request interceptors
    let finalConfig = { ...config };
    
    for (const interceptor of this.requestInterceptors) {
      try {
        if (interceptor.onFulfilled) {
          finalConfig = await interceptor.onFulfilled(finalConfig);
        }
      } catch (error) {
        if (interceptor.onRejected) {
          throw await interceptor.onRejected(error instanceof Error ? error : new Error(String(error)));
        }
        throw error;
      }
    }
    
    // Build URL
    let url = finalConfig.baseURL || this.baseURL;
    url += finalConfig.url;
    
    if (finalConfig.params) {
      const searchParams = new URLSearchParams();
      Object.entries(finalConfig.params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      url += `?${searchParams.toString()}`;
    }
    
    // Build headers
    const headers = new Headers({
      ...this.defaultHeaders,
      ...(finalConfig.headers as Record<string, string>)
    });
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), finalConfig.timeout || this.timeout);
    
    try {
      let response = await fetch(url, {
        ...finalConfig,
        headers,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Apply response interceptors
      for (const interceptor of this.responseInterceptors) {
        try {
          if (interceptor.onFulfilled) {
            response = await interceptor.onFulfilled(response);
          }
        } catch (error) {
          if (interceptor.onRejected) {
            throw await interceptor.onRejected(error instanceof Error ? error : new Error(String(error)));
          }
          throw error;
        }
      }
      
      if (!response.ok) {
        throw new HttpError(response.statusText, response.status, response);
      }
      
      // Parse response
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text() as unknown as T;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new HttpError('Request timeout', 408);
      }
      
      throw error;
    }
  }
  
  /**
   * GET request
   */
  async get<T>(url: string, config?: Omit<RequestConfig, 'url' | 'method'>): Promise<T> {
    return this.request<T>({ ...config, url, method: 'GET' });
  }
  
  /**
   * POST request
   */
  async post<T>(url: string, data?: unknown, config?: Omit<RequestConfig, 'url' | 'method' | 'body'>): Promise<T> {
    return this.request<T>({
      ...config,
      url,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers as Record<string, string>
      }
    });
  }
  
  /**
   * PUT request
   */
  async put<T>(url: string, data?: unknown, config?: Omit<RequestConfig, 'url' | 'method' | 'body'>): Promise<T> {
    return this.request<T>({
      ...config,
      url,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers as Record<string, string>
      }
    });
  }
  
  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: unknown, config?: Omit<RequestConfig, 'url' | 'method' | 'body'>): Promise<T> {
    return this.request<T>({
      ...config,
      url,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers as Record<string, string>
      }
    });
  }
  
  /**
   * DELETE request
   */
  async delete<T>(url: string, config?: Omit<RequestConfig, 'url' | 'method'>): Promise<T> {
    return this.request<T>({ ...config, url, method: 'DELETE' });
  }
}

/**
 * HTTP Error class
 */
export class HttpError extends Error {
  public status: number;
  public response?: Response;
  
  constructor(message: string, status: number, response?: Response) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.response = response;
  }
  
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
  
  get isServerError(): boolean {
    return this.status >= 500;
  }
  
  get isNotFound(): boolean {
    return this.status === 404;
  }
  
  get isUnauthorized(): boolean {
    return this.status === 401;
  }
  
  get isForbidden(): boolean {
    return this.status === 403;
  }
}

// ============================================================================
// Singleton Instances
// ============================================================================

let queryClientInstance: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (!queryClientInstance) {
    queryClientInstance = new QueryClient();
  }
  return queryClientInstance;
}

let httpClientInstance: HttpClient | null = null;

export function getHttpClient(config?: ConstructorParameters<typeof HttpClient>[0]): HttpClient {
  if (!httpClientInstance) {
    httpClientInstance = new HttpClient(config);
  }
  return httpClientInstance;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create query key
 */
export function createQueryKey(...parts: (string | number | boolean | object)[]): string {
  return parts.map(part => {
    if (typeof part === 'object') {
      return JSON.stringify(part);
    }
    return String(part);
  }).join(':');
}

/**
 * Wait for all queries to settle
 */
export async function waitForQueries<T extends readonly unknown[]>(
  queries: { [K in keyof T]: Promise<QueryState<T[K]>> }
): Promise<{ [K in keyof T]: QueryState<T[K]> }> {
  return Promise.all(queries) as Promise<{ [K in keyof T]: QueryState<T[K]> }>;
}

export default {
  CacheManager,
  QueryClient,
  InfiniteQueryManager,
  HttpClient,
  HttpError,
  cache,
  getQueryClient,
  getHttpClient,
  createQueryKey,
  waitForQueries
};
