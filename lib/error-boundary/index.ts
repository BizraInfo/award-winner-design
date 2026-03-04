/**
 * Elite Error Boundary System with Ihsān Principles
 * 
 * Comprehensive error handling featuring:
 * - Error boundaries with recovery
 * - Fallback components
 * - Error reporting
 * - Retry mechanisms
 * - Error classification
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ErrorInfo {
  componentStack?: string;
  errorBoundary?: string;
  timestamp: number;
  url?: string;
  userAgent?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export interface ErrorBoundaryOptions {
  fallback?: ErrorFallback;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  maxRetries?: number;
  retryDelay?: number;
  reportError?: (error: Error, errorInfo: ErrorInfo) => Promise<void>;
}

export type ErrorFallback = 
  | React.ComponentType<ErrorFallbackProps>
  | React.ReactNode
  | ((props: ErrorFallbackProps) => React.ReactNode);

export interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
  retry: () => void;
  retryCount: number;
}

export interface ErrorClassification {
  type: ErrorType;
  severity: ErrorSeverity;
  recoverable: boolean;
  userMessage: string;
  technicalMessage: string;
}

export type ErrorType = 
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'notFound'
  | 'serverError'
  | 'clientError'
  | 'timeout'
  | 'unknown';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// React type placeholder for standalone library
interface React {
  ComponentType: unknown;
  ReactNode: unknown;
}

// ============================================================================
// Error Classifier
// ============================================================================

export class ErrorClassifier {
  private static patterns: Map<RegExp, Partial<ErrorClassification>> = new Map([
    [/network|fetch|ECONNREFUSED|ENOTFOUND/i, {
      type: 'network',
      severity: 'medium',
      recoverable: true,
      userMessage: 'Network connection issue. Please check your internet connection.'
    }],
    [/401|unauthorized|unauthenticated/i, {
      type: 'authentication',
      severity: 'medium',
      recoverable: true,
      userMessage: 'Your session has expired. Please log in again.'
    }],
    [/403|forbidden/i, {
      type: 'authorization',
      severity: 'medium',
      recoverable: false,
      userMessage: 'You do not have permission to perform this action.'
    }],
    [/404|not found/i, {
      type: 'notFound',
      severity: 'low',
      recoverable: false,
      userMessage: 'The requested resource was not found.'
    }],
    [/timeout|ETIMEDOUT/i, {
      type: 'timeout',
      severity: 'medium',
      recoverable: true,
      userMessage: 'The request timed out. Please try again.'
    }],
    [/5\d{2}|server error|internal error/i, {
      type: 'serverError',
      severity: 'high',
      recoverable: true,
      userMessage: 'A server error occurred. Please try again later.'
    }],
    [/validation|invalid|required/i, {
      type: 'validation',
      severity: 'low',
      recoverable: true,
      userMessage: 'Please check your input and try again.'
    }]
  ]);
  
  /**
   * Classify an error
   */
  static classify(error: Error | unknown): ErrorClassification {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : 'Error';
    
    for (const [pattern, classification] of this.patterns) {
      if (pattern.test(errorMessage) || pattern.test(errorName)) {
        return {
          type: classification.type || 'unknown',
          severity: classification.severity || 'medium',
          recoverable: classification.recoverable ?? true,
          userMessage: classification.userMessage || 'An unexpected error occurred.',
          technicalMessage: errorMessage
        };
      }
    }
    
    return {
      type: 'unknown',
      severity: 'medium',
      recoverable: true,
      userMessage: 'An unexpected error occurred. Please try again.',
      technicalMessage: errorMessage
    };
  }
  
  /**
   * Add custom pattern
   */
  static addPattern(pattern: RegExp, classification: Partial<ErrorClassification>): void {
    this.patterns.set(pattern, classification);
  }
  
  /**
   * Check if error is recoverable
   */
  static isRecoverable(error: Error | unknown): boolean {
    return this.classify(error).recoverable;
  }
  
  /**
   * Get user-friendly message
   */
  static getUserMessage(error: Error | unknown): string {
    return this.classify(error).userMessage;
  }
}

// ============================================================================
// Error Reporter
// ============================================================================

export interface ErrorReport {
  id: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  classification: ErrorClassification;
  context: {
    url?: string;
    userAgent?: string;
    timestamp: number;
    componentStack?: string;
    breadcrumbs: Breadcrumb[];
    tags: Record<string, string>;
    extra: Record<string, unknown>;
  };
  user?: {
    id?: string;
    email?: string;
  };
}

export interface Breadcrumb {
  type: 'navigation' | 'click' | 'api' | 'console' | 'custom';
  category?: string;
  message: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface ErrorReporterConfig {
  endpoint?: string;
  apiKey?: string;
  maxBreadcrumbs?: number;
  beforeSend?: (report: ErrorReport) => ErrorReport | null;
  sampleRate?: number;
  ignorePatterns?: RegExp[];
  tags?: Record<string, string>;
}

export class ErrorReporter {
  private static instance: ErrorReporter | null = null;
  private config: ErrorReporterConfig;
  private breadcrumbs: Breadcrumb[] = [];
  private tags: Record<string, string> = {};
  private user?: { id?: string; email?: string };
  private extra: Record<string, unknown> = {};
  
  private constructor(config: ErrorReporterConfig = {}) {
    this.config = {
      maxBreadcrumbs: 50,
      sampleRate: 1.0,
      ignorePatterns: [],
      ...config
    };
    
    this.tags = config.tags || {};
    this.setupGlobalHandlers();
  }
  
  /**
   * Initialize reporter
   */
  static init(config: ErrorReporterConfig = {}): ErrorReporter {
    if (!this.instance) {
      this.instance = new ErrorReporter(config);
    }
    return this.instance;
  }
  
  /**
   * Get instance
   */
  static getInstance(): ErrorReporter {
    if (!this.instance) {
      this.instance = new ErrorReporter();
    }
    return this.instance;
  }
  
  /**
   * Capture error
   */
  async captureError(
    error: Error | unknown,
    context?: Partial<ErrorReport['context']>
  ): Promise<string | null> {
    // Check sample rate
    if (Math.random() > (this.config.sampleRate || 1)) {
      return null;
    }
    
    const err = error instanceof Error ? error : new Error(String(error));
    
    // Check ignore patterns
    if (this.config.ignorePatterns?.some(pattern => pattern.test(err.message))) {
      return null;
    }
    
    const report = this.createReport(err, context);
    
    // Apply beforeSend hook
    const finalReport = this.config.beforeSend?.(report) ?? report;
    if (!finalReport) {
      return null;
    }
    
    // Send report
    await this.sendReport(finalReport);
    
    return report.id;
  }
  
  /**
   * Capture message
   */
  async captureMessage(
    message: string,
    severity: ErrorSeverity = 'low'
  ): Promise<string | null> {
    const error = new Error(message);
    error.name = 'CapturedMessage';
    
    return this.captureError(error, {
      extra: { severity }
    });
  }
  
  /**
   * Add breadcrumb
   */
  addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    const maxBreadcrumbs = this.config.maxBreadcrumbs || 50;
    
    this.breadcrumbs.push({
      ...breadcrumb,
      timestamp: Date.now()
    });
    
    // Trim if exceeds max
    if (this.breadcrumbs.length > maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-maxBreadcrumbs);
    }
  }
  
  /**
   * Set user context
   */
  setUser(user: { id?: string; email?: string } | null): void {
    this.user = user || undefined;
  }
  
  /**
   * Set tag
   */
  setTag(key: string, value: string): void {
    this.tags[key] = value;
  }
  
  /**
   * Set extra context
   */
  setExtra(key: string, value: unknown): void {
    this.extra[key] = value;
  }
  
  /**
   * Clear breadcrumbs
   */
  clearBreadcrumbs(): void {
    this.breadcrumbs = [];
  }
  
  // ============================================================================
  // Private Methods
  // ============================================================================
  
  private createReport(
    error: Error,
    context?: Partial<ErrorReport['context']>
  ): ErrorReport {
    return {
      id: this.generateId(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      classification: ErrorClassifier.classify(error),
      context: {
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        timestamp: Date.now(),
        breadcrumbs: [...this.breadcrumbs],
        tags: { ...this.tags },
        extra: { ...this.extra },
        ...context
      },
      user: this.user
    };
  }
  
  private async sendReport(report: ErrorReport): Promise<void> {
    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Report');
      console.error('Error:', report.error);
      console.log('Classification:', report.classification);
      console.log('Context:', report.context);
      console.groupEnd();
    }
    
    // Send to endpoint if configured
    if (this.config.endpoint) {
      try {
        await fetch(this.config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey && { 'X-API-Key': this.config.apiKey })
          },
          body: JSON.stringify(report)
        });
      } catch (sendError) {
        console.error('[ErrorReporter] Failed to send report:', sendError);
      }
    }
  }
  
  private generateId(): string {
    return `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  }
  
  private setupGlobalHandlers(): void {
    if (typeof window === 'undefined') return;
    
    // Unhandled errors
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), {
        extra: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });
    
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason))
      );
    });
    
    // Navigation breadcrumbs
    window.addEventListener('popstate', () => {
      this.addBreadcrumb({
        type: 'navigation',
        message: `Navigated to ${window.location.pathname}`
      });
    });
    
    // Click breadcrumbs
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const selector = this.getElementSelector(target);
      
      if (selector) {
        this.addBreadcrumb({
          type: 'click',
          message: `Clicked on ${selector}`,
          data: {
            tagName: target.tagName,
            id: target.id,
            className: target.className
          }
        });
      }
    }, { capture: true, passive: true });
  }
  
  private getElementSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ').join('.')}`;
    return element.tagName.toLowerCase();
  }
}

// ============================================================================
// Error Boundary Manager (Framework-agnostic)
// ============================================================================

export class ErrorBoundaryManager {
  private state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    retryCount: 0
  };
  
  private options: ErrorBoundaryOptions;
  private listeners: Set<(state: ErrorBoundaryState) => void> = new Set();
  
  constructor(options: ErrorBoundaryOptions = {}) {
    this.options = {
      maxRetries: 3,
      retryDelay: 1000,
      ...options
    };
  }
  
  /**
   * Handle error
   */
  handleError(error: Error, componentStack?: string): void {
    const errorInfo: ErrorInfo = {
      componentStack,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
    };
    
    this.state = {
      hasError: true,
      error,
      errorInfo,
      retryCount: this.state.retryCount
    };
    
    // Notify listeners
    this.notify();
    
    // Call onError callback
    this.options.onError?.(error, errorInfo);
    
    // Report error
    this.options.reportError?.(error, errorInfo).catch(console.error);
  }
  
  /**
   * Reset error state
   */
  reset(): void {
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
    
    this.notify();
    this.options.onReset?.();
  }
  
  /**
   * Retry failed operation
   */
  async retry(): Promise<boolean> {
    const maxRetries = this.options.maxRetries || 3;
    
    if (this.state.retryCount >= maxRetries) {
      return false;
    }
    
    this.state.retryCount++;
    
    // Delay before retry
    if (this.options.retryDelay) {
      await new Promise(resolve => setTimeout(resolve, this.options.retryDelay));
    }
    
    // Reset error state to allow re-render
    this.state = {
      ...this.state,
      hasError: false,
      error: null
    };
    
    this.notify();
    return true;
  }
  
  /**
   * Get current state
   */
  getState(): ErrorBoundaryState {
    return { ...this.state };
  }
  
  /**
   * Check if can retry
   */
  canRetry(): boolean {
    return this.state.retryCount < (this.options.maxRetries || 3);
  }
  
  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: ErrorBoundaryState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notify(): void {
    const state = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('[ErrorBoundaryManager] Listener error:', error);
      }
    });
  }
}

// ============================================================================
// Async Error Handler
// ============================================================================

export interface AsyncErrorHandlerOptions {
  onError?: (error: Error) => void;
  fallbackValue?: unknown;
  retries?: number;
  retryDelay?: number;
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: AsyncErrorHandlerOptions = {}
): T {
  const { onError, fallbackValue, retries = 0, retryDelay = 1000 } = options;
  
  return (async (...args: Parameters<T>) => {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    // All attempts failed
    onError?.(lastError!);
    
    if (fallbackValue !== undefined) {
      return fallbackValue;
    }
    
    throw lastError;
  }) as T;
}

/**
 * Try-catch wrapper with classification
 */
export async function tryCatch<T>(
  fn: () => Promise<T>
): Promise<{ data: T; error: null } | { data: null; error: ErrorClassification }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (error) {
    return { data: null, error: ErrorClassifier.classify(error) };
  }
}

/**
 * Safe JSON parse
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safe property access
 */
export function safeGet<T>(
  obj: unknown,
  path: string,
  fallback: T
): T {
  try {
    const keys = path.split('.');
    let value: unknown = obj;
    
    for (const key of keys) {
      if (value === null || value === undefined) return fallback;
      value = (value as Record<string, unknown>)[key];
    }
    
    return (value as T) ?? fallback;
  } catch {
    return fallback;
  }
}

// ============================================================================
// Error Factory
// ============================================================================

export class AppError extends Error {
  public code: string;
  public statusCode: number;
  public classification: ErrorClassification;
  public context: Record<string, unknown>;
  
  constructor(
    message: string,
    options: {
      code?: string;
      statusCode?: number;
      cause?: Error;
      context?: Record<string, unknown>;
    } = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.code = options.code || 'UNKNOWN_ERROR';
    this.statusCode = options.statusCode || 500;
    this.classification = ErrorClassifier.classify(this);
    this.context = options.context || {};
    
    if (options.cause) {
      this.cause = options.cause;
    }
  }
  
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      classification: this.classification,
      context: this.context,
      stack: this.stack
    };
  }
}

// Pre-defined error factories
export const Errors = {
  notFound: (resource: string) => new AppError(
    `${resource} not found`,
    { code: 'NOT_FOUND', statusCode: 404 }
  ),
  
  unauthorized: (message = 'Authentication required') => new AppError(
    message,
    { code: 'UNAUTHORIZED', statusCode: 401 }
  ),
  
  forbidden: (message = 'Permission denied') => new AppError(
    message,
    { code: 'FORBIDDEN', statusCode: 403 }
  ),
  
  validation: (message: string, context?: Record<string, unknown>) => new AppError(
    message,
    { code: 'VALIDATION_ERROR', statusCode: 400, context }
  ),
  
  conflict: (message: string) => new AppError(
    message,
    { code: 'CONFLICT', statusCode: 409 }
  ),
  
  serverError: (message = 'Internal server error') => new AppError(
    message,
    { code: 'SERVER_ERROR', statusCode: 500 }
  ),
  
  timeout: (operation: string) => new AppError(
    `${operation} timed out`,
    { code: 'TIMEOUT', statusCode: 408 }
  ),
  
  network: (message = 'Network error') => new AppError(
    message,
    { code: 'NETWORK_ERROR', statusCode: 0 }
  )
};

// ============================================================================
// Default Export
// ============================================================================

export default {
  ErrorClassifier,
  ErrorReporter,
  ErrorBoundaryManager,
  AppError,
  Errors,
  withErrorHandling,
  tryCatch,
  safeJsonParse,
  safeGet
};
