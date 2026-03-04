/**
 * Elite Performance Monitoring System with Ihsān Principles
 * 
 * Comprehensive performance tracking featuring:
 * - Web Vitals (LCP, FID, CLS, TTFB, FCP, INP)
 * - Custom metrics
 * - Resource timing
 * - Long task detection
 * - Memory monitoring
 * - Performance reporting
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface WebVitalsMetric {
  name: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  entries: PerformanceEntry[];
}

export interface CustomMetric {
  name: string;
  value: number;
  unit?: string;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface ResourceMetric {
  name: string;
  type: 'script' | 'stylesheet' | 'image' | 'font' | 'fetch' | 'xmlhttprequest' | 'other';
  duration: number;
  transferSize: number;
  decodedBodySize: number;
  startTime: number;
  responseStart: number;
  responseEnd: number;
}

export interface LongTaskMetric {
  duration: number;
  startTime: number;
  attribution: string[];
}

export interface MemoryMetric {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}

export interface PerformanceReport {
  id: string;
  timestamp: number;
  url: string;
  webVitals: Partial<Record<WebVitalsMetric['name'], WebVitalsMetric>>;
  customMetrics: CustomMetric[];
  resources: ResourceMetric[];
  longTasks: LongTaskMetric[];
  memory?: MemoryMetric;
  navigationTiming: NavigationTimingMetric;
  userAgent: string;
  connection?: ConnectionInfo;
}

export interface NavigationTimingMetric {
  dnsLookup: number;
  tcpConnection: number;
  tlsNegotiation: number;
  timeToFirstByte: number;
  contentDownload: number;
  domInteractive: number;
  domContentLoaded: number;
  windowLoad: number;
}

export interface ConnectionInfo {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export interface PerformanceMonitorConfig {
  endpoint?: string;
  apiKey?: string;
  sampleRate?: number;
  reportInterval?: number;
  enableWebVitals?: boolean;
  enableResourceTiming?: boolean;
  enableLongTasks?: boolean;
  enableMemoryMonitoring?: boolean;
  beforeReport?: (report: PerformanceReport) => PerformanceReport | null;
  onMetric?: (metric: WebVitalsMetric | CustomMetric) => void;
}

// ============================================================================
// Web Vitals Thresholds
// ============================================================================

const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  TTFB: { good: 800, poor: 1800 },
  FCP: { good: 1800, poor: 3000 },
  INP: { good: 200, poor: 500 }
} as const;

// ============================================================================
// Rating Calculator
// ============================================================================

function getRating(
  metric: WebVitalsMetric['name'],
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[metric];
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

// ============================================================================
// Performance Monitor
// ============================================================================

export class PerformanceMonitor {
  private static instance: PerformanceMonitor | null = null;
  private config: PerformanceMonitorConfig;
  private webVitals: Partial<Record<WebVitalsMetric['name'], WebVitalsMetric>> = {};
  private customMetrics: CustomMetric[] = [];
  private resources: ResourceMetric[] = [];
  private longTasks: LongTaskMetric[] = [];
  private memory?: MemoryMetric;
  private observers: PerformanceObserver[] = [];
  private reportInterval: ReturnType<typeof setInterval> | null = null;
  private memoryInterval: ReturnType<typeof setInterval> | null = null;
  private started = false;
  
  private constructor(config: PerformanceMonitorConfig = {}) {
    this.config = {
      sampleRate: 1.0,
      reportInterval: 60000,
      enableWebVitals: true,
      enableResourceTiming: true,
      enableLongTasks: true,
      enableMemoryMonitoring: true,
      ...config
    };
  }
  
  /**
   * Initialize monitor
   */
  static init(config: PerformanceMonitorConfig = {}): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor(config);
    }
    return this.instance;
  }
  
  /**
   * Get instance
   */
  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }
  
  /**
   * Start monitoring
   */
  start(): void {
    if (this.started || typeof window === 'undefined') return;
    
    this.started = true;
    
    // Check sample rate
    if (Math.random() > (this.config.sampleRate || 1)) {
      return;
    }
    
    if (this.config.enableWebVitals) {
      this.observeWebVitals();
    }
    
    if (this.config.enableResourceTiming) {
      this.observeResources();
    }
    
    if (this.config.enableLongTasks) {
      this.observeLongTasks();
    }
    
    if (this.config.enableMemoryMonitoring) {
      this.observeMemory();
    }
    
    // Start periodic reporting
    if (this.config.reportInterval && this.config.endpoint) {
      this.reportInterval = setInterval(() => {
        this.sendReport();
      }, this.config.reportInterval);
    }
    
    // Report on page unload
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.sendReport();
      }
    });
  }
  
  /**
   * Stop monitoring
   */
  stop(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = null;
    }
    
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }
    
    this.started = false;
  }
  
  /**
   * Record custom metric
   */
  recordMetric(
    name: string,
    value: number,
    options: { unit?: string; tags?: Record<string, string> } = {}
  ): void {
    const metric: CustomMetric = {
      name,
      value,
      unit: options.unit,
      timestamp: Date.now(),
      tags: options.tags
    };
    
    this.customMetrics.push(metric);
    this.config.onMetric?.(metric);
  }
  
  /**
   * Measure function execution time
   */
  async measure<T>(
    name: string,
    fn: () => T | Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const start = performance.now();
    
    try {
      return await fn();
    } finally {
      const duration = performance.now() - start;
      this.recordMetric(name, duration, { unit: 'ms', tags });
    }
  }
  
  /**
   * Create performance mark
   */
  mark(name: string): void {
    if (typeof performance !== 'undefined') {
      performance.mark(name);
    }
  }
  
  /**
   * Measure between marks
   */
  measureMarks(name: string, startMark: string, endMark: string): void {
    if (typeof performance !== 'undefined') {
      try {
        performance.measure(name, startMark, endMark);
        const entries = performance.getEntriesByName(name, 'measure');
        if (entries.length > 0) {
          this.recordMetric(name, entries[entries.length - 1].duration, { unit: 'ms' });
        }
      } catch {
        // Marks may not exist
      }
    }
  }
  
  /**
   * Get current Web Vitals
   */
  getWebVitals(): Partial<Record<WebVitalsMetric['name'], WebVitalsMetric>> {
    return { ...this.webVitals };
  }
  
  /**
   * Get custom metrics
   */
  getCustomMetrics(): CustomMetric[] {
    return [...this.customMetrics];
  }
  
  /**
   * Get performance report
   */
  getReport(): PerformanceReport {
    return {
      id: this.generateId(),
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      webVitals: this.webVitals,
      customMetrics: this.customMetrics,
      resources: this.resources,
      longTasks: this.longTasks,
      memory: this.memory,
      navigationTiming: this.getNavigationTiming(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      connection: this.getConnectionInfo()
    };
  }
  
  /**
   * Clear metrics
   */
  clear(): void {
    this.customMetrics = [];
    this.resources = [];
    this.longTasks = [];
  }
  
  // ============================================================================
  // Private Methods
  // ============================================================================
  
  private observeWebVitals(): void {
    // LCP - Largest Contentful Paint
    this.createObserver('largest-contentful-paint', (entries) => {
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
      this.recordWebVital('LCP', lastEntry.startTime, [lastEntry]);
    });
    
    // FID - First Input Delay
    this.createObserver('first-input', (entries) => {
      const firstEntry = entries[0] as PerformanceEventTiming;
      const fid = firstEntry.processingStart - firstEntry.startTime;
      this.recordWebVital('FID', fid, [firstEntry]);
    });
    
    // CLS - Cumulative Layout Shift
    let clsValue = 0;
    const clsEntries: PerformanceEntry[] = [];
    
    this.createObserver('layout-shift', (entries) => {
      for (const entry of entries as Array<PerformanceEntry & { hadRecentInput: boolean; value: number }>) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          clsEntries.push(entry);
        }
      }
      this.recordWebVital('CLS', clsValue, clsEntries);
    });
    
    // TTFB - Time to First Byte
    this.createObserver('navigation', (entries) => {
      const navEntry = entries[0] as PerformanceNavigationTiming;
      const ttfb = navEntry.responseStart - navEntry.requestStart;
      this.recordWebVital('TTFB', ttfb, [navEntry]);
    });
    
    // FCP - First Contentful Paint
    this.createObserver('paint', (entries) => {
      const fcpEntry = entries.find(e => e.name === 'first-contentful-paint');
      if (fcpEntry) {
        this.recordWebVital('FCP', fcpEntry.startTime, [fcpEntry]);
      }
    });
    
    // INP - Interaction to Next Paint
    let inpValue = 0;
    const inpEntries: PerformanceEntry[] = [];
    
    this.createObserver('event', (entries) => {
      for (const entry of entries as PerformanceEventTiming[]) {
        const interactionDuration = entry.duration;
        if (interactionDuration > inpValue) {
          inpValue = interactionDuration;
          inpEntries.push(entry);
        }
      }
      if (inpValue > 0) {
        this.recordWebVital('INP', inpValue, inpEntries);
      }
    }, { durationThreshold: 40 });
  }
  
  private observeResources(): void {
    this.createObserver('resource', (entries) => {
      for (const entry of entries as PerformanceResourceTiming[]) {
        this.resources.push({
          name: entry.name,
          type: this.getResourceType(entry.initiatorType),
          duration: entry.duration,
          transferSize: entry.transferSize,
          decodedBodySize: entry.decodedBodySize,
          startTime: entry.startTime,
          responseStart: entry.responseStart,
          responseEnd: entry.responseEnd
        });
      }
    });
  }
  
  private observeLongTasks(): void {
    this.createObserver('longtask', (entries) => {
      for (const entry of entries as Array<PerformanceEntry & { attribution: Array<{ containerType: string }> }>) {
        this.longTasks.push({
          duration: entry.duration,
          startTime: entry.startTime,
          attribution: entry.attribution?.map(a => a.containerType) || []
        });
      }
    });
  }
  
  private observeMemory(): void {
    const updateMemory = () => {
      const memory = (performance as Performance & { 
        memory?: { 
          usedJSHeapSize: number; 
          totalJSHeapSize: number; 
          jsHeapSizeLimit: number 
        } 
      }).memory;
      
      if (memory) {
        this.memory = {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          timestamp: Date.now()
        };
      }
    };
    
    // Update memory every 10 seconds (store reference for cleanup)
    updateMemory();
    this.memoryInterval = setInterval(updateMemory, 10000);
  }
  
  private createObserver(
    type: string,
    callback: (entries: PerformanceEntry[]) => void,
    options?: { durationThreshold?: number }
  ): void {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      
      observer.observe({ type, buffered: true, ...options } as PerformanceObserverInit);
      this.observers.push(observer);
    } catch {
      // Observer type may not be supported
    }
  }
  
  private recordWebVital(
    name: WebVitalsMetric['name'],
    value: number,
    entries: PerformanceEntry[]
  ): void {
    const previous = this.webVitals[name];
    
    const metric: WebVitalsMetric = {
      name,
      value,
      rating: getRating(name, value),
      delta: value - (previous?.value || 0),
      id: this.generateId(),
      entries
    };
    
    this.webVitals[name] = metric;
    this.config.onMetric?.(metric);
  }
  
  private getNavigationTiming(): NavigationTimingMetric {
    if (typeof performance === 'undefined') {
      return {
        dnsLookup: 0,
        tcpConnection: 0,
        tlsNegotiation: 0,
        timeToFirstByte: 0,
        contentDownload: 0,
        domInteractive: 0,
        domContentLoaded: 0,
        windowLoad: 0
      };
    }
    
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    
    if (!nav) {
      return {
        dnsLookup: 0,
        tcpConnection: 0,
        tlsNegotiation: 0,
        timeToFirstByte: 0,
        contentDownload: 0,
        domInteractive: 0,
        domContentLoaded: 0,
        windowLoad: 0
      };
    }
    
    return {
      dnsLookup: nav.domainLookupEnd - nav.domainLookupStart,
      tcpConnection: nav.connectEnd - nav.connectStart,
      tlsNegotiation: nav.secureConnectionStart > 0
        ? nav.connectEnd - nav.secureConnectionStart
        : 0,
      timeToFirstByte: nav.responseStart - nav.requestStart,
      contentDownload: nav.responseEnd - nav.responseStart,
      domInteractive: nav.domInteractive,
      domContentLoaded: nav.domContentLoadedEventEnd,
      windowLoad: nav.loadEventEnd
    };
  }
  
  private getConnectionInfo(): ConnectionInfo | undefined {
    const connection = (navigator as Navigator & { 
      connection?: { 
        effectiveType?: string; 
        downlink?: number; 
        rtt?: number; 
        saveData?: boolean 
      } 
    }).connection;
    
    if (!connection) return undefined;
    
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };
  }
  
  private getResourceType(
    initiatorType: string
  ): ResourceMetric['type'] {
    const typeMap: Record<string, ResourceMetric['type']> = {
      script: 'script',
      link: 'stylesheet',
      img: 'image',
      image: 'image',
      font: 'font',
      fetch: 'fetch',
      xmlhttprequest: 'xmlhttprequest'
    };
    
    return typeMap[initiatorType] || 'other';
  }
  
  private async sendReport(): Promise<void> {
    if (!this.config.endpoint) return;
    
    const report = this.getReport();
    
    // Apply beforeReport hook
    const finalReport = this.config.beforeReport?.(report) ?? report;
    if (!finalReport) return;
    
    try {
      // Use sendBeacon for reliability on page unload
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(
          this.config.endpoint,
          JSON.stringify(finalReport)
        );
      } else {
        await fetch(this.config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey && { 'X-API-Key': this.config.apiKey })
          },
          body: JSON.stringify(finalReport),
          keepalive: true
        });
      }
    } catch (error) {
      console.error('[PerformanceMonitor] Failed to send report:', error);
    }
  }
  
  private generateId(): string {
    return `perf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

// ============================================================================
// Performance Marks Helper
// ============================================================================

export class PerformanceMarks {
  private prefix: string;
  
  constructor(prefix: string = 'app') {
    this.prefix = prefix;
  }
  
  /**
   * Create a mark
   */
  mark(name: string): void {
    if (typeof performance !== 'undefined') {
      performance.mark(`${this.prefix}:${name}`);
    }
  }
  
  /**
   * Measure between two marks
   */
  measure(name: string, startMark: string, endMark?: string): number | null {
    if (typeof performance === 'undefined') return null;
    
    try {
      const measureName = `${this.prefix}:${name}`;
      const start = `${this.prefix}:${startMark}`;
      const end = endMark ? `${this.prefix}:${endMark}` : undefined;
      
      performance.measure(measureName, start, end);
      
      const entries = performance.getEntriesByName(measureName, 'measure');
      return entries.length > 0 ? entries[entries.length - 1].duration : null;
    } catch {
      return null;
    }
  }
  
  /**
   * Clear marks
   */
  clear(): void {
    if (typeof performance !== 'undefined') {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }
}

// ============================================================================
// Frame Rate Monitor
// ============================================================================

export class FrameRateMonitor {
  private frameCount = 0;
  private lastTime = 0;
  private fps = 0;
  private rafId: number | null = null;
  private listeners: Set<(fps: number) => void> = new Set();
  
  /**
   * Start monitoring
   */
  start(): void {
    if (this.rafId !== null) return;
    
    this.lastTime = performance.now();
    this.frameCount = 0;
    
    const tick = (time: number) => {
      this.frameCount++;
      
      const elapsed = time - this.lastTime;
      
      if (elapsed >= 1000) {
        this.fps = Math.round((this.frameCount * 1000) / elapsed);
        this.frameCount = 0;
        this.lastTime = time;
        
        this.listeners.forEach(listener => listener(this.fps));
      }
      
      this.rafId = requestAnimationFrame(tick);
    };
    
    this.rafId = requestAnimationFrame(tick);
  }
  
  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
  
  /**
   * Get current FPS
   */
  getFps(): number {
    return this.fps;
  }
  
  /**
   * Subscribe to FPS updates
   */
  subscribe(callback: (fps: number) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}

// ============================================================================
// Bundle Size Tracker
// ============================================================================

export class BundleSizeTracker {
  private static sizes: Map<string, number> = new Map();
  
  /**
   * Record bundle size
   */
  static record(name: string, size: number): void {
    this.sizes.set(name, size);
  }
  
  /**
   * Get all bundle sizes
   */
  static getAll(): Record<string, number> {
    return Object.fromEntries(this.sizes);
  }
  
  /**
   * Get total size
   */
  static getTotal(): number {
    return Array.from(this.sizes.values()).reduce((sum, size) => sum + size, 0);
  }
  
  /**
   * Format size for display
   */
  static formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  PerformanceMonitor,
  PerformanceMarks,
  FrameRateMonitor,
  BundleSizeTracker,
  THRESHOLDS,
  getRating
};
