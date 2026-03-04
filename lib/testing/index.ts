/**
 * Elite Testing Utilities with Ihsān Principles
 * 
 * Comprehensive testing toolkit featuring:
 * - Mock factories
 * - Test fixtures
 * - Custom matchers
 * - Test helpers
 * - Component testing utilities
 * - API mocking
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface MockOptions {
  delay?: number;
  error?: Error;
  partial?: boolean;
}

export interface FixtureOptions<T> {
  overrides?: Partial<T>;
  count?: number;
}

export interface MockApiResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export interface MockFetchConfig {
  url: string | RegExp;
  method?: string;
  response: unknown;
  status?: number;
  delay?: number;
  headers?: Record<string, string>;
}

export interface WaitOptions {
  timeout?: number;
  interval?: number;
}

// ============================================================================
// Mock Factory
// ============================================================================

export class MockFactory<T extends Record<string, unknown>> {
  private defaults: T;
  private sequences: Map<keyof T, number> = new Map();
  private generators: Map<keyof T, () => unknown> = new Map();
  
  constructor(defaults: T) {
    this.defaults = { ...defaults };
  }
  
  /**
   * Create a single mock instance
   */
  create(overrides: Partial<T> = {}): T {
    const result = { ...this.defaults };
    
    // Apply generators
    for (const [key, generator] of this.generators) {
      result[key] = generator() as T[keyof T];
    }
    
    // Apply sequences
    for (const [key] of this.sequences) {
      const current = this.sequences.get(key) || 0;
      this.sequences.set(key, current + 1);
      result[key] = current as T[keyof T];
    }
    
    // Apply overrides
    return { ...result, ...overrides };
  }
  
  /**
   * Create multiple mock instances
   */
  createMany(count: number, overrides: Partial<T> = {}): T[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
  
  /**
   * Set a sequence for a field
   */
  sequence(key: keyof T, startAt: number = 0): this {
    this.sequences.set(key, startAt);
    return this;
  }
  
  /**
   * Set a generator function for a field
   */
  generate<K extends keyof T>(key: K, generator: () => T[K]): this {
    this.generators.set(key, generator);
    return this;
  }
  
  /**
   * Create with traits
   */
  withTrait(trait: string, overrides: Partial<T>): MockFactory<T> {
    const newFactory = new MockFactory({ ...this.defaults, ...overrides });
    newFactory.sequences = new Map(this.sequences);
    newFactory.generators = new Map(this.generators);
    return newFactory;
  }
}

// ============================================================================
// Fixture Manager
// ============================================================================

export class FixtureManager {
  private fixtures: Map<string, unknown> = new Map();
  private factories: Map<string, MockFactory<Record<string, unknown>>> = new Map();
  
  /**
   * Register a fixture
   */
  register<T>(name: string, data: T): void {
    this.fixtures.set(name, data);
  }
  
  /**
   * Register a factory
   */
  registerFactory<T extends Record<string, unknown>>(
    name: string,
    factory: MockFactory<T>
  ): void {
    this.factories.set(name, factory as MockFactory<Record<string, unknown>>);
  }
  
  /**
   * Get a fixture
   */
  get<T>(name: string): T {
    const fixture = this.fixtures.get(name);
    if (!fixture) {
      throw new Error(`Fixture "${name}" not found`);
    }
    return JSON.parse(JSON.stringify(fixture)) as T;
  }
  
  /**
   * Create from factory
   */
  create<T extends Record<string, unknown>>(
    factoryName: string,
    overrides: Partial<T> = {}
  ): T {
    const factory = this.factories.get(factoryName);
    if (!factory) {
      throw new Error(`Factory "${factoryName}" not found`);
    }
    return factory.create(overrides) as T;
  }
  
  /**
   * Create many from factory
   */
  createMany<T extends Record<string, unknown>>(
    factoryName: string,
    count: number,
    overrides: Partial<T> = {}
  ): T[] {
    const factory = this.factories.get(factoryName);
    if (!factory) {
      throw new Error(`Factory "${factoryName}" not found`);
    }
    return factory.createMany(count, overrides) as T[];
  }
  
  /**
   * Clear all fixtures
   */
  clear(): void {
    this.fixtures.clear();
    this.factories.clear();
  }
}

// ============================================================================
// Mock API Handler
// ============================================================================

export class MockApiHandler {
  private handlers: MockFetchConfig[] = [];
  private originalFetch: typeof fetch | null = null;
  private calls: Array<{ url: string; init?: RequestInit }> = [];
  
  /**
   * Add mock handler
   */
  mock(config: MockFetchConfig): this {
    this.handlers.push({
      status: 200,
      delay: 0,
      headers: { 'Content-Type': 'application/json' },
      ...config
    });
    return this;
  }
  
  /**
   * Mock GET request
   */
  get(url: string | RegExp, response: unknown, options?: Partial<MockFetchConfig>): this {
    return this.mock({ url, response, method: 'GET', ...options });
  }
  
  /**
   * Mock POST request
   */
  post(url: string | RegExp, response: unknown, options?: Partial<MockFetchConfig>): this {
    return this.mock({ url, response, method: 'POST', ...options });
  }
  
  /**
   * Mock PUT request
   */
  put(url: string | RegExp, response: unknown, options?: Partial<MockFetchConfig>): this {
    return this.mock({ url, response, method: 'PUT', ...options });
  }
  
  /**
   * Mock DELETE request
   */
  delete(url: string | RegExp, response: unknown, options?: Partial<MockFetchConfig>): this {
    return this.mock({ url, response, method: 'DELETE', ...options });
  }
  
  /**
   * Install mock fetch
   */
  install(): void {
    if (typeof globalThis.fetch !== 'undefined') {
      this.originalFetch = globalThis.fetch;
    }
    
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';
      
      // Record call
      this.calls.push({ url, init });
      
      // Find matching handler
      const handler = this.handlers.find(h => {
        const methodMatch = !h.method || h.method.toUpperCase() === method.toUpperCase();
        const urlMatch = typeof h.url === 'string'
          ? url.includes(h.url)
          : h.url.test(url);
        return methodMatch && urlMatch;
      });
      
      if (!handler) {
        throw new Error(`No mock handler found for ${method} ${url}`);
      }
      
      // Simulate delay
      if (handler.delay) {
        await this.delay(handler.delay);
      }
      
      // Return response
      return new Response(
        JSON.stringify(handler.response),
        {
          status: handler.status,
          headers: handler.headers
        }
      );
    };
  }
  
  /**
   * Restore original fetch
   */
  restore(): void {
    if (this.originalFetch) {
      globalThis.fetch = this.originalFetch;
      this.originalFetch = null;
    }
    this.handlers = [];
    this.calls = [];
  }
  
  /**
   * Get recorded calls
   */
  getCalls(): Array<{ url: string; init?: RequestInit }> {
    return [...this.calls];
  }
  
  /**
   * Assert call was made
   */
  assertCalled(url: string | RegExp, method?: string): void {
    const found = this.calls.find(call => {
      const urlMatch = typeof url === 'string'
        ? call.url.includes(url)
        : url.test(call.url);
      const methodMatch = !method || call.init?.method === method;
      return urlMatch && methodMatch;
    });
    
    if (!found) {
      throw new Error(`Expected call to ${method || 'ANY'} ${url} but it was not made`);
    }
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Test Helpers
// ============================================================================

export const TestHelpers = {
  /**
   * Wait for condition
   */
  async waitFor(
    condition: () => boolean | Promise<boolean>,
    options: WaitOptions = {}
  ): Promise<void> {
    const { timeout = 5000, interval = 50 } = options;
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (await condition()) return;
      await this.sleep(interval);
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  },
  
  /**
   * Wait for element
   */
  async waitForElement(
    selector: string,
    options: WaitOptions & { container?: Element } = {}
  ): Promise<Element> {
    const { timeout = 5000, interval = 50, container = document } = options;
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      const element = container.querySelector(selector);
      if (element) return element;
      await this.sleep(interval);
    }
    
    throw new Error(`Element "${selector}" not found within ${timeout}ms`);
  },
  
  /**
   * Sleep for duration
   */
  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  /**
   * Create mock event
   */
  createEvent<T extends Event>(
    type: string,
    eventInit: Partial<T> = {}
  ): T {
    const event = new Event(type, { bubbles: true, cancelable: true }) as T;
    Object.assign(event, eventInit);
    return event;
  },
  
  /**
   * Create mock keyboard event
   */
  createKeyboardEvent(
    type: string,
    options: Partial<KeyboardEventInit> = {}
  ): KeyboardEvent {
    return new KeyboardEvent(type, {
      bubbles: true,
      cancelable: true,
      ...options
    });
  },
  
  /**
   * Create mock mouse event
   */
  createMouseEvent(
    type: string,
    options: Partial<MouseEventInit> = {}
  ): MouseEvent {
    return new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      ...options
    });
  },
  
  /**
   * Simulate user input
   */
  async typeText(element: HTMLInputElement | HTMLTextAreaElement, text: string): Promise<void> {
    element.focus();
    
    for (const char of text) {
      element.value += char;
      element.dispatchEvent(new InputEvent('input', { bubbles: true, data: char }));
      await this.sleep(10);
    }
    
    element.dispatchEvent(new Event('change', { bubbles: true }));
  },
  
  /**
   * Simulate click
   */
  click(element: Element): void {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  },
  
  /**
   * Simulate focus
   */
  focus(element: Element): void {
    (element as HTMLElement).focus?.();
    element.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
  },
  
  /**
   * Simulate blur
   */
  blur(element: Element): void {
    (element as HTMLElement).blur?.();
    element.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
  },
  
  /**
   * Random string generator
   */
  randomString(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  },
  
  /**
   * Random number generator
   */
  randomNumber(min: number = 0, max: number = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  
  /**
   * Random email generator
   */
  randomEmail(): string {
    return `${this.randomString(8).toLowerCase()}@${this.randomString(5).toLowerCase()}.com`;
  },
  
  /**
   * Random UUID generator
   */
  randomUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};

// ============================================================================
// Custom Matchers
// ============================================================================

export const CustomMatchers = {
  /**
   * Check if value is within range
   */
  toBeWithinRange(actual: number, min: number, max: number): { pass: boolean; message: string } {
    const pass = actual >= min && actual <= max;
    return {
      pass,
      message: pass
        ? `Expected ${actual} not to be within range ${min}-${max}`
        : `Expected ${actual} to be within range ${min}-${max}`
    };
  },
  
  /**
   * Check if array contains all items
   */
  toContainAll<T>(actual: T[], expected: T[]): { pass: boolean; message: string } {
    const pass = expected.every(item => actual.includes(item));
    return {
      pass,
      message: pass
        ? `Expected array not to contain all items`
        : `Expected array to contain all items: ${expected.filter(item => !actual.includes(item)).join(', ')}`
    };
  },
  
  /**
   * Check if object has all keys
   */
  toHaveAllKeys(actual: object, keys: string[]): { pass: boolean; message: string } {
    const actualKeys = Object.keys(actual);
    const pass = keys.every(key => actualKeys.includes(key));
    return {
      pass,
      message: pass
        ? `Expected object not to have all keys`
        : `Expected object to have keys: ${keys.filter(key => !actualKeys.includes(key)).join(', ')}`
    };
  },
  
  /**
   * Check if value matches schema
   */
  toMatchSchema(actual: unknown, schema: Record<string, string>): { pass: boolean; message: string } {
    const errors: string[] = [];
    
    for (const [key, expectedType] of Object.entries(schema)) {
      const value = (actual as Record<string, unknown>)[key];
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      
      if (actualType !== expectedType) {
        errors.push(`${key}: expected ${expectedType}, got ${actualType}`);
      }
    }
    
    return {
      pass: errors.length === 0,
      message: errors.length === 0
        ? `Value matches schema`
        : `Schema mismatch: ${errors.join('; ')}`
    };
  },
  
  /**
   * Check if async function throws
   */
  async toThrowAsync(fn: () => Promise<unknown>, expectedError?: string | RegExp): Promise<{ pass: boolean; message: string }> {
    try {
      await fn();
      return {
        pass: false,
        message: `Expected function to throw but it did not`
      };
    } catch (error) {
      if (!expectedError) {
        return {
          pass: true,
          message: `Function threw as expected`
        };
      }
      
      const message = error instanceof Error ? error.message : String(error);
      const pass = typeof expectedError === 'string'
        ? message.includes(expectedError)
        : expectedError.test(message);
      
      return {
        pass,
        message: pass
          ? `Function threw expected error`
          : `Expected error "${expectedError}" but got "${message}"`
      };
    }
  },
  
  /**
   * Check if element is visible
   */
  toBeVisible(element: Element): { pass: boolean; message: string } {
    const htmlElement = element as HTMLElement;
    const style = window.getComputedStyle(htmlElement);
    const rect = htmlElement.getBoundingClientRect();
    
    const pass = (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      rect.width > 0 &&
      rect.height > 0
    );
    
    return {
      pass,
      message: pass
        ? `Element is visible`
        : `Element is not visible`
    };
  },
  
  /**
   * Check if element has class
   */
  toHaveClass(element: Element, className: string): { pass: boolean; message: string } {
    const pass = element.classList.contains(className);
    return {
      pass,
      message: pass
        ? `Element has class "${className}"`
        : `Element does not have class "${className}"`
    };
  },
  
  /**
   * Check if element has attribute
   */
  toHaveAttribute(element: Element, name: string, value?: string): { pass: boolean; message: string } {
    const hasAttr = element.hasAttribute(name);
    const attrValue = element.getAttribute(name);
    
    if (value !== undefined) {
      const pass = hasAttr && attrValue === value;
      return {
        pass,
        message: pass
          ? `Element has attribute "${name}" with value "${value}"`
          : `Expected attribute "${name}" to be "${value}" but got "${attrValue}"`
      };
    }
    
    return {
      pass: hasAttr,
      message: hasAttr
        ? `Element has attribute "${name}"`
        : `Element does not have attribute "${name}"`
    };
  }
};

// ============================================================================
// Spy Utility
// ============================================================================

export interface SpyCall<A extends unknown[], R> {
  args: A;
  returnValue?: R;
  error?: Error;
  timestamp: number;
}

export class Spy<A extends unknown[] = unknown[], R = unknown> {
  private calls: SpyCall<A, R>[] = [];
  private implementation: ((...args: A) => R) | null = null;
  
  /**
   * Get the spy function
   */
  fn = ((...args: A): R => {
    const call: SpyCall<A, R> = {
      args,
      timestamp: Date.now()
    };
    
    try {
      if (this.implementation) {
        const result = this.implementation(...args);
        call.returnValue = result;
        this.calls.push(call);
        return result;
      }
      this.calls.push(call);
      return undefined as R;
    } catch (error) {
      call.error = error instanceof Error ? error : new Error(String(error));
      this.calls.push(call);
      throw error;
    }
  }) as (...args: A) => R;
  
  /**
   * Set mock implementation
   */
  mockImplementation(impl: (...args: A) => R): this {
    this.implementation = impl;
    return this;
  }
  
  /**
   * Mock return value
   */
  mockReturnValue(value: R): this {
    this.implementation = () => value;
    return this;
  }
  
  /**
   * Mock return value once
   */
  mockReturnValueOnce(value: R): this {
    const originalImpl = this.implementation;
    this.implementation = (...args: A) => {
      this.implementation = originalImpl;
      return value;
    };
    return this;
  }
  
  /**
   * Mock resolved value (for async functions)
   */
  mockResolvedValue(value: Awaited<R>): this {
    this.implementation = (() => Promise.resolve(value)) as unknown as (...args: A) => R;
    return this;
  }
  
  /**
   * Mock rejected value (for async functions)
   */
  mockRejectedValue(error: unknown): this {
    this.implementation = (() => Promise.reject(error)) as unknown as (...args: A) => R;
    return this;
  }
  
  /**
   * Get call count
   */
  get callCount(): number {
    return this.calls.length;
  }
  
  /**
   * Check if called
   */
  get called(): boolean {
    return this.calls.length > 0;
  }
  
  /**
   * Get all calls
   */
  getCalls(): SpyCall<A, R>[] {
    return [...this.calls];
  }
  
  /**
   * Get call at index
   */
  getCall(index: number): SpyCall<A, R> | undefined {
    return this.calls[index];
  }
  
  /**
   * Get first call
   */
  get firstCall(): SpyCall<A, R> | undefined {
    return this.calls[0];
  }
  
  /**
   * Get last call
   */
  get lastCall(): SpyCall<A, R> | undefined {
    return this.calls[this.calls.length - 1];
  }
  
  /**
   * Check if called with specific args
   */
  calledWith(...args: A): boolean {
    return this.calls.some(call =>
      JSON.stringify(call.args) === JSON.stringify(args)
    );
  }
  
  /**
   * Reset spy
   */
  reset(): void {
    this.calls = [];
  }
  
  /**
   * Restore (clear implementation)
   */
  restore(): void {
    this.calls = [];
    this.implementation = null;
  }
}

// ============================================================================
// Timer Utilities
// ============================================================================

export class FakeTimers {
  private originalSetTimeout: typeof setTimeout | null = null;
  private originalSetInterval: typeof setInterval | null = null;
  private originalClearTimeout: typeof clearTimeout | null = null;
  private originalClearInterval: typeof clearInterval | null = null;
  private originalDateNow: typeof Date.now | null = null;
  
  private timers: Map<number, { callback: () => void; delay: number; interval: boolean }> = new Map();
  private currentTime: number = 0;
  private nextId: number = 1;
  
  /**
   * Install fake timers
   */
  install(startTime: number = 0): void {
    this.currentTime = startTime;
    
    this.originalSetTimeout = globalThis.setTimeout;
    this.originalSetInterval = globalThis.setInterval;
    this.originalClearTimeout = globalThis.clearTimeout;
    this.originalClearInterval = globalThis.clearInterval;
    this.originalDateNow = Date.now;
    
    globalThis.setTimeout = ((callback: () => void, delay: number = 0) => {
      const id = this.nextId++;
      this.timers.set(id, { callback, delay: this.currentTime + delay, interval: false });
      return id as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout;
    
    globalThis.setInterval = ((callback: () => void, delay: number = 0) => {
      const id = this.nextId++;
      this.timers.set(id, { callback, delay: this.currentTime + delay, interval: true });
      return id as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval;
    
    globalThis.clearTimeout = ((id: ReturnType<typeof setTimeout>) => {
      this.timers.delete(id as unknown as number);
    }) as typeof clearTimeout;
    
    globalThis.clearInterval = ((id: ReturnType<typeof setInterval>) => {
      this.timers.delete(id as unknown as number);
    }) as typeof clearInterval;
    
    Date.now = () => this.currentTime;
  }
  
  /**
   * Advance time
   */
  tick(ms: number): void {
    const targetTime = this.currentTime + ms;
    
    while (this.currentTime < targetTime) {
      // Find next timer to fire
      let nextTimer: { id: number; timer: { callback: () => void; delay: number; interval: boolean } } | null = null;
      
      for (const [id, timer] of this.timers) {
        if (timer.delay <= targetTime) {
          if (!nextTimer || timer.delay < nextTimer.timer.delay) {
            nextTimer = { id, timer };
          }
        }
      }
      
      if (nextTimer && nextTimer.timer.delay <= targetTime) {
        this.currentTime = nextTimer.timer.delay;
        
        if (nextTimer.timer.interval) {
          // Reschedule interval
          nextTimer.timer.delay = this.currentTime + nextTimer.timer.delay;
        } else {
          this.timers.delete(nextTimer.id);
        }
        
        nextTimer.timer.callback();
      } else {
        this.currentTime = targetTime;
      }
    }
  }
  
  /**
   * Run all timers
   */
  runAll(): void {
    while (this.timers.size > 0) {
      const timers = Array.from(this.timers.entries());
      const next = timers.sort((a, b) => a[1].delay - b[1].delay)[0];
      
      if (next) {
        this.tick(next[1].delay - this.currentTime);
      }
    }
  }
  
  /**
   * Get current time
   */
  now(): number {
    return this.currentTime;
  }
  
  /**
   * Restore real timers
   */
  restore(): void {
    if (this.originalSetTimeout) globalThis.setTimeout = this.originalSetTimeout;
    if (this.originalSetInterval) globalThis.setInterval = this.originalSetInterval;
    if (this.originalClearTimeout) globalThis.clearTimeout = this.originalClearTimeout;
    if (this.originalClearInterval) globalThis.clearInterval = this.originalClearInterval;
    if (this.originalDateNow) Date.now = this.originalDateNow;
    
    this.timers.clear();
    this.currentTime = 0;
  }
}

// ============================================================================
// Snapshot Testing
// ============================================================================

export class SnapshotManager {
  private snapshots: Map<string, string> = new Map();
  private updateMode: boolean = false;
  
  constructor(updateMode: boolean = false) {
    this.updateMode = updateMode;
  }
  
  /**
   * Match snapshot
   */
  match(name: string, value: unknown): { pass: boolean; message: string } {
    const serialized = this.serialize(value);
    const existing = this.snapshots.get(name);
    
    if (this.updateMode || !existing) {
      this.snapshots.set(name, serialized);
      return {
        pass: true,
        message: 'Snapshot updated'
      };
    }
    
    const pass = serialized === existing;
    return {
      pass,
      message: pass
        ? 'Snapshot matches'
        : `Snapshot mismatch:\nExpected:\n${existing}\n\nReceived:\n${serialized}`
    };
  }
  
  /**
   * Serialize value for snapshot
   */
  private serialize(value: unknown): string {
    if (value instanceof Element) {
      return this.serializeElement(value);
    }
    
    return JSON.stringify(value, null, 2);
  }
  
  /**
   * Serialize DOM element
   */
  private serializeElement(element: Element, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    const tagName = element.tagName.toLowerCase();
    
    // Get attributes
    const attrs = Array.from(element.attributes)
      .map(attr => `${attr.name}="${attr.value}"`)
      .join(' ');
    
    const attrsStr = attrs ? ` ${attrs}` : '';
    
    // Self-closing tags
    if (element.children.length === 0 && !element.textContent?.trim()) {
      return `${spaces}<${tagName}${attrsStr} />`;
    }
    
    // With children
    const children = Array.from(element.childNodes)
      .map(child => {
        if (child instanceof Element) {
          return this.serializeElement(child, indent + 1);
        }
        if (child.textContent?.trim()) {
          return '  '.repeat(indent + 1) + child.textContent.trim();
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
    
    return `${spaces}<${tagName}${attrsStr}>\n${children}\n${spaces}</${tagName}>`;
  }
  
  /**
   * Export snapshots
   */
  export(): Record<string, string> {
    return Object.fromEntries(this.snapshots);
  }
  
  /**
   * Import snapshots
   */
  import(snapshots: Record<string, string>): void {
    for (const [key, value] of Object.entries(snapshots)) {
      this.snapshots.set(key, value);
    }
  }
  
  /**
   * Clear snapshots
   */
  clear(): void {
    this.snapshots.clear();
  }
}

// ============================================================================
// Default Exports
// ============================================================================

export default {
  MockFactory,
  FixtureManager,
  MockApiHandler,
  TestHelpers,
  CustomMatchers,
  Spy,
  FakeTimers,
  SnapshotManager
};
