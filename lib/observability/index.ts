/**
 * Observability and Monitoring Module
 * 
 * Elite monitoring infrastructure for BIZRA Genesis:
 * - Structured logging with correlation IDs
 * - Metrics collection (Prometheus-compatible)
 * - Distributed tracing support
 * - Health check aggregation
 * - Performance monitoring
 * 
 * @module lib/observability
 */

// Log levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

// Structured log entry
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  service: string;
  environment: string;
  version: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  duration?: number;
  httpRequest?: {
    method: string;
    url: string;
    status?: number;
    userAgent?: string;
    ip?: string;
  };
}

// Metric types
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

export interface MetricDefinition {
  name: string;
  type: MetricType;
  help: string;
  labels?: string[];
}

export interface MetricValue {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp?: number;
}

// Health check types
export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  message?: string;
  details?: Record<string, unknown>;
  lastCheck: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: HealthCheckResult[];
}

/**
 * Structured Logger with JSON output
 */
class StructuredLogger {
  private service: string;
  private environment: string;
  private version: string;
  private minLevel: LogLevel;
  private correlationIdGenerator: () => string;

  constructor(config: {
    service: string;
    environment?: string;
    version?: string;
    minLevel?: LogLevel;
  }) {
    this.service = config.service;
    this.environment = config.environment || process.env.NODE_ENV || 'development';
    this.version = config.version || process.env.npm_package_version || '0.0.0';
    this.minLevel = config.minLevel || LogLevel.INFO;
    this.correlationIdGenerator = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2);
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private formatEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      environment: this.environment,
      version: this.version,
    };

    if (context) {
      // Extract special fields
      if (context.correlationId) {
        entry.correlationId = context.correlationId as string;
        delete context.correlationId;
      }
      if (context.traceId) {
        entry.traceId = context.traceId as string;
        delete context.traceId;
      }
      if (context.spanId) {
        entry.spanId = context.spanId as string;
        delete context.spanId;
      }
      if (context.error instanceof Error) {
        entry.error = {
          name: context.error.name,
          message: context.error.message,
          stack: context.error.stack,
        };
        delete context.error;
      }
      if (context.duration !== undefined) {
        entry.duration = context.duration as number;
        delete context.duration;
      }
      if (context.httpRequest) {
        entry.httpRequest = context.httpRequest as LogEntry['httpRequest'];
        delete context.httpRequest;
      }

      // Remaining context
      if (Object.keys(context).length > 0) {
        entry.context = context;
      }
    }

    return entry;
  }

  private output(entry: LogEntry): void {
    const json = JSON.stringify(entry);
    
    switch (entry.level) {
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(json);
        break;
      case LogLevel.WARN:
        console.warn(json);
        break;
      case LogLevel.DEBUG:
        console.debug(json);
        break;
      default:
        console.log(json);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.output(this.formatEntry(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.output(this.formatEntry(LogLevel.INFO, message, context));
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.output(this.formatEntry(LogLevel.WARN, message, context));
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.output(this.formatEntry(LogLevel.ERROR, message, context));
    }
  }

  fatal(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.FATAL)) {
      this.output(this.formatEntry(LogLevel.FATAL, message, context));
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, unknown>): ChildLogger {
    return new ChildLogger(this, context);
  }

  /**
   * Generate a new correlation ID
   */
  generateCorrelationId(): string {
    return this.correlationIdGenerator();
  }
}

/**
 * Child logger with inherited context
 */
class ChildLogger {
  private parent: StructuredLogger;
  private context: Record<string, unknown>;

  constructor(parent: StructuredLogger, context: Record<string, unknown>) {
    this.parent = parent;
    this.context = context;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.parent.debug(message, { ...this.context, ...context });
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.parent.info(message, { ...this.context, ...context });
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.parent.warn(message, { ...this.context, ...context });
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.parent.error(message, { ...this.context, ...context });
  }

  fatal(message: string, context?: Record<string, unknown>): void {
    this.parent.fatal(message, { ...this.context, ...context });
  }
}

/**
 * Metrics Collector (Prometheus-compatible)
 */
class MetricsCollector {
  private metrics: Map<string, MetricDefinition> = new Map();
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private histogramBuckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

  /**
   * Register a new metric
   */
  register(definition: MetricDefinition): void {
    this.metrics.set(definition.name, definition);
  }

  /**
   * Increment a counter
   */
  incCounter(name: string, value = 1, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    this.gauges.set(key, value);
  }

  /**
   * Record a histogram observation
   */
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    const observations = this.histograms.get(key) || [];
    observations.push(value);
    this.histograms.set(key, observations);
  }

  /**
   * Get all metrics in Prometheus format
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];

    // Output counters
    for (const [key, value] of this.counters) {
      const { name, labels } = this.parseKey(key);
      const labelStr = this.formatLabels(labels);
      const def = this.metrics.get(name);
      if (def && !lines.includes(`# HELP ${name} ${def.help}`)) {
        lines.push(`# HELP ${name} ${def.help}`);
        lines.push(`# TYPE ${name} counter`);
      }
      lines.push(`${name}${labelStr} ${value}`);
    }

    // Output gauges
    for (const [key, value] of this.gauges) {
      const { name, labels } = this.parseKey(key);
      const labelStr = this.formatLabels(labels);
      const def = this.metrics.get(name);
      if (def && !lines.includes(`# HELP ${name} ${def.help}`)) {
        lines.push(`# HELP ${name} ${def.help}`);
        lines.push(`# TYPE ${name} gauge`);
      }
      lines.push(`${name}${labelStr} ${value}`);
    }

    // Output histograms
    for (const [key, observations] of this.histograms) {
      const { name, labels } = this.parseKey(key);
      const def = this.metrics.get(name);
      if (def && !lines.includes(`# HELP ${name} ${def.help}`)) {
        lines.push(`# HELP ${name} ${def.help}`);
        lines.push(`# TYPE ${name} histogram`);
      }

      // Calculate buckets
      let cumulative = 0;
      for (const bucket of this.histogramBuckets) {
        cumulative += observations.filter(v => v <= bucket).length;
        const bucketLabels = { ...labels, le: String(bucket) };
        lines.push(`${name}_bucket${this.formatLabels(bucketLabels)} ${cumulative}`);
      }
      lines.push(`${name}_bucket${this.formatLabels({ ...labels, le: '+Inf' })} ${observations.length}`);
      lines.push(`${name}_sum${this.formatLabels(labels)} ${observations.reduce((a, b) => a + b, 0)}`);
      lines.push(`${name}_count${this.formatLabels(labels)} ${observations.length}`);
    }

    return lines.join('\n');
  }

  /**
   * Get metrics as JSON
   */
  getJsonMetrics(): MetricValue[] {
    const result: MetricValue[] = [];

    for (const [key, value] of this.counters) {
      const { name, labels } = this.parseKey(key);
      result.push({ name, value, labels, timestamp: Date.now() });
    }

    for (const [key, value] of this.gauges) {
      const { name, labels } = this.parseKey(key);
      result.push({ name, value, labels, timestamp: Date.now() });
    }

    return result;
  }

  private getKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) return name;
    const sortedLabels = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${sortedLabels}}`;
  }

  private parseKey(key: string): { name: string; labels: Record<string, string> } {
    const match = key.match(/^([^{]+)(?:\{(.+)\})?$/);
    if (!match) return { name: key, labels: {} };

    const name = match[1];
    const labels: Record<string, string> = {};
    
    if (match[2]) {
      const pairs = match[2].match(/([^=,]+)="([^"]+)"/g) || [];
      for (const pair of pairs) {
        const [k, v] = pair.split('=');
        labels[k] = v.replace(/"/g, '');
      }
    }

    return { name, labels };
  }

  private formatLabels(labels: Record<string, string>): string {
    const entries = Object.entries(labels);
    if (entries.length === 0) return '';
    return `{${entries.map(([k, v]) => `${k}="${v}"`).join(',')}}`;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}

/**
 * Health Check Manager
 */
class HealthCheckManager {
  private checks: Map<string, () => Promise<HealthCheckResult>> = new Map();
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Register a health check
   */
  register(name: string, check: () => Promise<HealthCheckResult>): void {
    this.checks.set(name, check);
  }

  /**
   * Run all health checks
   */
  async runAll(): Promise<SystemHealth> {
    const results: HealthCheckResult[] = [];
    let overallStatus: SystemHealth['status'] = 'healthy';

    for (const [name, check] of this.checks) {
      try {
        const start = performance.now();
        const result = await check();
        result.responseTime = performance.now() - start;
        result.lastCheck = new Date().toISOString();
        results.push(result);

        if (result.status === 'unhealthy') {
          overallStatus = 'unhealthy';
        } else if (result.status === 'degraded' && overallStatus !== 'unhealthy') {
          overallStatus = 'degraded';
        }
      } catch (error) {
        results.push({
          name,
          status: 'unhealthy',
          responseTime: 0,
          message: error instanceof Error ? error.message : 'Unknown error',
          lastCheck: new Date().toISOString(),
        });
        overallStatus = 'unhealthy';
      }
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.0.0',
      uptime: Date.now() - this.startTime,
      checks: results,
    };
  }

  /**
   * Run a single health check
   */
  async runSingle(name: string): Promise<HealthCheckResult | null> {
    const check = this.checks.get(name);
    if (!check) return null;

    try {
      const start = performance.now();
      const result = await check();
      result.responseTime = performance.now() - start;
      result.lastCheck = new Date().toISOString();
      return result;
    } catch (error) {
      return {
        name,
        status: 'unhealthy',
        responseTime: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date().toISOString(),
      };
    }
  }

  /**
   * Get uptime in milliseconds
   */
  getUptime(): number {
    return Date.now() - this.startTime;
  }
}

/**
 * Request timing middleware helper
 */
export function createTimingMiddleware(
  metrics: MetricsCollector,
  logger: StructuredLogger
) {
  return async function timingMiddleware(
    request: Request,
    handler: (req: Request) => Promise<Response>
  ): Promise<Response> {
    const start = performance.now();
    const correlationId = request.headers.get('x-correlation-id') || logger.generateCorrelationId();
    const method = request.method;
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      const response = await handler(request);
      const duration = performance.now() - start;

      // Record metrics
      metrics.incCounter('http_requests_total', 1, { method, path, status: String(response.status) });
      metrics.observeHistogram('http_request_duration_seconds', duration / 1000, { method, path });

      // Log request
      logger.info('HTTP Request', {
        correlationId,
        duration,
        httpRequest: {
          method,
          url: request.url,
          status: response.status,
          userAgent: request.headers.get('user-agent') || undefined,
        },
      });

      return response;
    } catch (error) {
      const duration = performance.now() - start;

      metrics.incCounter('http_requests_total', 1, { method, path, status: '500' });
      metrics.incCounter('http_errors_total', 1, { method, path });

      logger.error('HTTP Request Error', {
        correlationId,
        duration,
        error: error instanceof Error ? error : new Error(String(error)),
        httpRequest: {
          method,
          url: request.url,
        },
      });

      throw error;
    }
  };
}

// Create default instances
export const logger = new StructuredLogger({
  service: 'bizra-genesis',
  environment: process.env.NODE_ENV,
  version: process.env.npm_package_version,
  minLevel: process.env.LOG_LEVEL as LogLevel || LogLevel.INFO,
});

export const metrics = new MetricsCollector();

export const healthChecks = new HealthCheckManager();

// Register default metrics
metrics.register({
  name: 'http_requests_total',
  type: 'counter',
  help: 'Total number of HTTP requests',
  labels: ['method', 'path', 'status'],
});

metrics.register({
  name: 'http_request_duration_seconds',
  type: 'histogram',
  help: 'HTTP request duration in seconds',
  labels: ['method', 'path'],
});

metrics.register({
  name: 'http_errors_total',
  type: 'counter',
  help: 'Total number of HTTP errors',
  labels: ['method', 'path'],
});

// Register default health checks
healthChecks.register('process', async () => ({
  name: 'process',
  status: 'healthy',
  responseTime: 0,
  lastCheck: new Date().toISOString(),
  details: {
    pid: typeof process !== 'undefined' ? process.pid : 0,
    memory: typeof process !== 'undefined' ? process.memoryUsage() : {},
    uptime: typeof process !== 'undefined' ? process.uptime() : 0,
  },
}));

// Export classes for custom instances
export { StructuredLogger, MetricsCollector, HealthCheckManager };
