/**
 * Chaos Engineering & Resilience Framework
 * 
 * Elite resilience testing with:
 * - Circuit breakers with configurable thresholds
 * - Fault injection for testing
 * - Retry strategies with exponential backoff
 * - Bulkhead pattern for isolation
 * - Timeout management
 * 
 * @module lib/resilience
 */

// Circuit breaker states
export type CircuitState = 'closed' | 'open' | 'half-open';

// Retry strategies
export type RetryStrategy = 'exponential' | 'linear' | 'fixed' | 'fibonacci';

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes to close from half-open
  timeout: number; // Time in ms before trying again (half-open)
  monitorInterval?: number; // Stats monitoring interval
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
  onFailure?: (error: Error) => void;
  onSuccess?: () => void;
}

export interface RetryConfig {
  maxAttempts: number;
  strategy: RetryStrategy;
  initialDelay: number; // ms
  maxDelay: number; // ms
  jitter?: boolean; // Add randomness to prevent thundering herd
  retryOn?: (error: Error) => boolean; // Custom retry condition
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

export interface BulkheadConfig {
  name: string;
  maxConcurrent: number;
  maxQueue: number;
  timeout?: number; // Queue timeout in ms
  onReject?: (reason: string) => void;
}

export interface FaultInjectionConfig {
  enabled: boolean;
  failureRate: number; // 0-1 probability of failure
  latencyMs?: number; // Added latency
  latencyJitter?: number; // Random variance in latency
  errorTypes?: string[]; // Types of errors to inject
}

export interface CircuitBreakerStats {
  name: string;
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  lastStateChange?: Date;
}

/**
 * Circuit Breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private totalRequests = 0;
  private lastFailure?: Date;
  private lastSuccess?: Date;
  private lastStateChange?: Date;
  private nextAttempt = 0;
  private config: Required<CircuitBreakerConfig>;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      monitorInterval: 60000,
      onStateChange: () => {},
      onFailure: () => {},
      onSuccess: () => {},
      ...config,
    };
  }

  /**
   * Execute a function through the circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if circuit is open
    if (this.state === 'open') {
      if (Date.now() < this.nextAttempt) {
        throw new CircuitOpenError(
          `Circuit ${this.config.name} is open. Retry after ${new Date(this.nextAttempt).toISOString()}`
        );
      }
      // Try half-open
      this.transition('half-open');
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error as Error);
      throw error;
    }
  }

  /**
   * Record a successful call
   */
  private recordSuccess(): void {
    this.successes++;
    this.lastSuccess = new Date();
    this.config.onSuccess();

    if (this.state === 'half-open') {
      if (this.successes >= this.config.successThreshold) {
        this.transition('closed');
        this.failures = 0;
      }
    } else if (this.state === 'closed') {
      // Reset failure count on success in closed state
      this.failures = 0;
    }
  }

  /**
   * Record a failed call
   */
  private recordFailure(error: Error): void {
    this.failures++;
    this.lastFailure = new Date();
    this.config.onFailure(error);

    if (this.state === 'half-open') {
      // Immediately open on failure in half-open state
      this.transition('open');
    } else if (this.state === 'closed' && this.failures >= this.config.failureThreshold) {
      this.transition('open');
    }
  }

  /**
   * Transition to a new state
   */
  private transition(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = new Date();

    if (newState === 'open') {
      this.nextAttempt = Date.now() + this.config.timeout;
      this.successes = 0;
    } else if (newState === 'half-open') {
      this.successes = 0;
    }

    this.config.onStateChange(oldState, newState);
  }

  /**
   * Get current stats
   */
  getStats(): CircuitBreakerStats {
    return {
      name: this.config.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalRequests: this.totalRequests,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      lastStateChange: this.lastStateChange,
    };
  }

  /**
   * Force state (for testing)
   */
  forceState(state: CircuitState): void {
    this.transition(state);
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.totalRequests = 0;
    this.lastFailure = undefined;
    this.lastSuccess = undefined;
    this.lastStateChange = undefined;
    this.nextAttempt = 0;
  }
}

/**
 * Custom error for circuit breaker
 */
export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

/**
 * Retry with configurable strategies
 */
export class RetryHandler {
  private config: Required<RetryConfig>;

  constructor(config: RetryConfig) {
    this.config = {
      jitter: true,
      retryOn: () => true,
      onRetry: () => {},
      ...config,
    };
  }

  /**
   * Execute with retry
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt < this.config.maxAttempts) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        attempt++;

        if (attempt >= this.config.maxAttempts || !this.config.retryOn(lastError)) {
          throw lastError;
        }

        const delay = this.calculateDelay(attempt);
        this.config.onRetry(attempt, lastError, delay);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Calculate delay based on strategy
   */
  private calculateDelay(attempt: number): number {
    let delay: number;

    switch (this.config.strategy) {
      case 'exponential':
        delay = Math.min(
          this.config.initialDelay * Math.pow(2, attempt - 1),
          this.config.maxDelay
        );
        break;
      case 'linear':
        delay = Math.min(
          this.config.initialDelay * attempt,
          this.config.maxDelay
        );
        break;
      case 'fibonacci':
        delay = Math.min(
          this.config.initialDelay * this.fibonacci(attempt),
          this.config.maxDelay
        );
        break;
      case 'fixed':
      default:
        delay = this.config.initialDelay;
    }

    // Add jitter
    if (this.config.jitter) {
      const jitterRange = delay * 0.2; // 20% jitter
      delay += Math.random() * jitterRange - jitterRange / 2;
    }

    return Math.max(0, delay);
  }

  /**
   * Fibonacci number calculation
   */
  private fibonacci(n: number): number {
    if (n <= 1) return n;
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
      const temp = a + b;
      a = b;
      b = temp;
    }
    return b;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Bulkhead for isolation
 */
export class Bulkhead {
  private running = 0;
  private queue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
    timeout?: NodeJS.Timeout;
  }> = [];
  private config: Required<BulkheadConfig>;

  constructor(config: BulkheadConfig) {
    this.config = {
      timeout: 30000,
      onReject: () => {},
      ...config,
    };
  }

  /**
   * Execute within bulkhead
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  /**
   * Acquire a slot
   */
  private acquire(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.running < this.config.maxConcurrent) {
        this.running++;
        resolve();
      } else if (this.queue.length < this.config.maxQueue) {
        const item: typeof this.queue[0] = { resolve, reject };
        
        if (this.config.timeout > 0) {
          item.timeout = setTimeout(() => {
            const index = this.queue.indexOf(item);
            if (index > -1) {
              this.queue.splice(index, 1);
              this.config.onReject('timeout');
              reject(new BulkheadRejectError(`Bulkhead ${this.config.name} queue timeout`));
            }
          }, this.config.timeout);
        }
        
        this.queue.push(item);
      } else {
        this.config.onReject('queue_full');
        reject(new BulkheadRejectError(`Bulkhead ${this.config.name} queue is full`));
      }
    });
  }

  /**
   * Release a slot
   */
  private release(): void {
    if (this.queue.length > 0) {
      const item = this.queue.shift()!;
      if (item.timeout) clearTimeout(item.timeout);
      item.resolve();
    } else {
      this.running--;
    }
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      name: this.config.name,
      running: this.running,
      queued: this.queue.length,
      maxConcurrent: this.config.maxConcurrent,
      maxQueue: this.config.maxQueue,
    };
  }
}

/**
 * Custom error for bulkhead rejection
 */
export class BulkheadRejectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BulkheadRejectError';
  }
}

/**
 * Fault Injector for chaos testing
 */
export class FaultInjector {
  private config: Required<FaultInjectionConfig>;
  private injectedFaults = 0;
  private totalCalls = 0;

  constructor(config: FaultInjectionConfig) {
    this.config = {
      latencyMs: 0,
      latencyJitter: 0,
      errorTypes: ['Error'],
      ...config,
    };
  }

  /**
   * Execute with potential fault injection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalCalls++;

    if (!this.config.enabled) {
      return fn();
    }

    // Inject latency
    if (this.config.latencyMs > 0) {
      const jitter = this.config.latencyJitter 
        ? (Math.random() - 0.5) * 2 * this.config.latencyJitter 
        : 0;
      const delay = Math.max(0, this.config.latencyMs + jitter);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Inject failure
    if (Math.random() < this.config.failureRate) {
      this.injectedFaults++;
      const errorType = this.config.errorTypes[
        Math.floor(Math.random() * this.config.errorTypes.length)
      ];
      throw new InjectedFaultError(`Injected ${errorType} fault`);
    }

    return fn();
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      enabled: this.config.enabled,
      failureRate: this.config.failureRate,
      latencyMs: this.config.latencyMs,
      injectedFaults: this.injectedFaults,
      totalCalls: this.totalCalls,
      actualFailureRate: this.totalCalls > 0 ? this.injectedFaults / this.totalCalls : 0,
    };
  }

  /**
   * Enable/disable fault injection
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Update failure rate
   */
  setFailureRate(rate: number): void {
    this.config.failureRate = Math.max(0, Math.min(1, rate));
  }

  /**
   * Reset stats
   */
  reset(): void {
    this.injectedFaults = 0;
    this.totalCalls = 0;
  }
}

/**
 * Custom error for injected faults
 */
export class InjectedFaultError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InjectedFaultError';
  }
}

/**
 * Timeout wrapper
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  timeoutError?: string
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new TimeoutError(timeoutError || `Operation timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Custom error for timeout
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Resilience Builder - Combine multiple patterns
 */
export class ResilienceBuilder<T> {
  private circuitBreaker?: CircuitBreaker;
  private retryHandler?: RetryHandler;
  private bulkhead?: Bulkhead;
  private faultInjector?: FaultInjector;
  private timeoutMs?: number;
  private fn: () => Promise<T>;

  constructor(fn: () => Promise<T>) {
    this.fn = fn;
  }

  withCircuitBreaker(config: CircuitBreakerConfig): this {
    this.circuitBreaker = new CircuitBreaker(config);
    return this;
  }

  withRetry(config: RetryConfig): this {
    this.retryHandler = new RetryHandler(config);
    return this;
  }

  withBulkhead(config: BulkheadConfig): this {
    this.bulkhead = new Bulkhead(config);
    return this;
  }

  withFaultInjection(config: FaultInjectionConfig): this {
    this.faultInjector = new FaultInjector(config);
    return this;
  }

  withTimeout(timeoutMs: number): this {
    this.timeoutMs = timeoutMs;
    return this;
  }

  /**
   * Execute with all configured resilience patterns
   */
  async execute(): Promise<T> {
    let execution = this.fn;

    // Apply fault injection (innermost)
    if (this.faultInjector) {
      const injector = this.faultInjector;
      const innerFn = execution;
      execution = () => injector.execute(innerFn);
    }

    // Apply timeout
    if (this.timeoutMs) {
      const timeout = this.timeoutMs;
      const innerFn = execution;
      execution = () => withTimeout(innerFn, timeout);
    }

    // Apply bulkhead
    if (this.bulkhead) {
      const bulkhead = this.bulkhead;
      const innerFn = execution;
      execution = () => bulkhead.execute(innerFn);
    }

    // Apply retry
    if (this.retryHandler) {
      const retry = this.retryHandler;
      const innerFn = execution;
      execution = () => retry.execute(innerFn);
    }

    // Apply circuit breaker (outermost)
    if (this.circuitBreaker) {
      const cb = this.circuitBreaker;
      const innerFn = execution;
      execution = () => cb.execute(innerFn);
    }

    return execution();
  }
}

/**
 * Create a resilient function
 */
export function resilient<T>(fn: () => Promise<T>): ResilienceBuilder<T> {
  return new ResilienceBuilder(fn);
}

// Export for testing
export { CircuitBreaker as CircuitBreakerClass };
