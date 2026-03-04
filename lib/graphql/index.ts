/**
 * Elite GraphQL Layer with Ihsān Principles
 * 
 * Type-safe GraphQL implementation featuring:
 * - Schema-first design
 * - Type-safe resolvers
 * - DataLoader for N+1 prevention
 * - Query complexity analysis
 * - Subscription support
 * - Error handling with masking
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface GraphQLContext {
  user?: {
    id: string;
    roles: string[];
  };
  requestId: string;
  dataloaders: Map<string, DataLoader<string, unknown>>;
  startTime: number;
}

export interface ResolverFn<TParent = unknown, TArgs = Record<string, unknown>, TResult = unknown> {
  (parent: TParent, args: TArgs, context: GraphQLContext, info: GraphQLResolveInfo): TResult | Promise<TResult>;
}

export interface GraphQLResolveInfo {
  fieldName: string;
  fieldNodes: unknown[];
  returnType: unknown;
  parentType: unknown;
  path: { prev?: unknown; key: string | number };
  schema: unknown;
  fragments: Record<string, unknown>;
  rootValue: unknown;
  operation: unknown;
  variableValues: Record<string, unknown>;
}

export interface FieldDefinition {
  type: string;
  args?: Record<string, { type: string; defaultValue?: unknown }>;
  resolve?: ResolverFn;
  description?: string;
  deprecationReason?: string;
}

export interface TypeDefinition {
  fields: Record<string, FieldDefinition | string>;
  description?: string;
}

export interface SchemaDefinition {
  types: Record<string, TypeDefinition>;
  queries: Record<string, FieldDefinition>;
  mutations?: Record<string, FieldDefinition>;
  subscriptions?: Record<string, FieldDefinition>;
}

// ============================================================================
// DataLoader Implementation
// ============================================================================

type BatchLoadFn<K, V> = (keys: readonly K[]) => Promise<(V | Error)[]>;

export class DataLoader<K, V> {
  private batch: K[] = [];
  private cache: Map<K, Promise<V>> = new Map();
  private batchScheduled = false;
  
  constructor(
    private batchLoadFn: BatchLoadFn<K, V>,
    private options: {
      maxBatchSize?: number;
      cacheEnabled?: boolean;
    } = {}
  ) {}
  
  async load(key: K): Promise<V> {
    // Check cache
    if (this.options.cacheEnabled !== false) {
      const cached = this.cache.get(key);
      if (cached) return cached;
    }
    
    // Create promise for this key
    const promise = new Promise<V>((resolve, reject) => {
      this.batch.push(key);
      
      // Schedule batch execution
      if (!this.batchScheduled) {
        this.batchScheduled = true;
        
        // Use queueMicrotask for optimal batching
        queueMicrotask(() => this.executeBatch());
      }
      
      // Store resolver for later
      const index = this.batch.length - 1;
      const checkResult = () => {
        // This will be resolved when batch executes
        setTimeout(() => {
          const result = this.getResult(key, index);
          if (result instanceof Error) {
            reject(result);
          } else {
            resolve(result as V);
          }
        }, 0);
      };
      
      // Queue the resolution check
      queueMicrotask(checkResult);
    });
    
    // Cache the promise
    if (this.options.cacheEnabled !== false) {
      this.cache.set(key, promise);
    }
    
    return promise;
  }
  
  async loadMany(keys: readonly K[]): Promise<(V | Error)[]> {
    return Promise.all(keys.map(key => this.load(key).catch(e => e)));
  }
  
  clear(key: K): this {
    this.cache.delete(key);
    return this;
  }
  
  clearAll(): this {
    this.cache.clear();
    return this;
  }
  
  prime(key: K, value: V): this {
    if (!this.cache.has(key)) {
      this.cache.set(key, Promise.resolve(value));
    }
    return this;
  }
  
  private results: Map<number, V | Error> = new Map();
  
  private async executeBatch(): Promise<void> {
    const keys = [...this.batch];
    this.batch = [];
    this.batchScheduled = false;
    
    try {
      // Apply max batch size
      const maxBatchSize = this.options.maxBatchSize || 100;
      const batches: K[][] = [];
      
      for (let i = 0; i < keys.length; i += maxBatchSize) {
        batches.push(keys.slice(i, i + maxBatchSize));
      }
      
      let resultIndex = 0;
      for (const batch of batches) {
        const results = await this.batchLoadFn(batch);
        
        for (let i = 0; i < results.length; i++) {
          this.results.set(resultIndex++, results[i]);
        }
      }
    } catch (error) {
      // Set error for all keys
      for (let i = 0; i < keys.length; i++) {
        this.results.set(i, error instanceof Error ? error : new Error(String(error)));
      }
    }
  }
  
  private getResult(key: K, index: number): V | Error {
    const result = this.results.get(index);
    if (result !== undefined) {
      this.results.delete(index);
      return result;
    }
    return new Error(`No result for key: ${String(key)}`);
  }
}

// ============================================================================
// Query Complexity Analyzer
// ============================================================================

export interface ComplexityConfig {
  maxComplexity: number;
  maxDepth: number;
  defaultFieldComplexity: number;
  fieldComplexities?: Record<string, number>;
}

export class ComplexityAnalyzer {
  private config: ComplexityConfig;
  
  constructor(config: Partial<ComplexityConfig> = {}) {
    this.config = {
      maxComplexity: config.maxComplexity || 1000,
      maxDepth: config.maxDepth || 10,
      defaultFieldComplexity: config.defaultFieldComplexity || 1,
      fieldComplexities: config.fieldComplexities || {}
    };
  }
  
  analyze(query: string): { complexity: number; depth: number; valid: boolean; errors: string[] } {
    const errors: string[] = [];
    let complexity = 0;
    let maxDepth = 0;
    
    // Simple parser for complexity estimation
    const lines = query.split('\n');
    let currentDepth = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Track depth
      if (trimmed.includes('{')) {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      }
      if (trimmed.includes('}')) {
        currentDepth--;
      }
      
      // Count fields
      const fieldMatch = trimmed.match(/^(\w+)/);
      if (fieldMatch && !trimmed.startsWith('query') && !trimmed.startsWith('mutation')) {
        const fieldName = fieldMatch[1];
        const fieldComplexity = this.config.fieldComplexities?.[fieldName] || 
                               this.config.defaultFieldComplexity;
        complexity += fieldComplexity * currentDepth;
      }
      
      // Check for list arguments that multiply complexity
      const limitMatch = trimmed.match(/(?:first|last|limit):\s*(\d+)/);
      if (limitMatch) {
        complexity *= Math.min(parseInt(limitMatch[1], 10), 100);
      }
    }
    
    if (complexity > this.config.maxComplexity) {
      errors.push(`Query complexity ${complexity} exceeds maximum ${this.config.maxComplexity}`);
    }
    
    if (maxDepth > this.config.maxDepth) {
      errors.push(`Query depth ${maxDepth} exceeds maximum ${this.config.maxDepth}`);
    }
    
    return {
      complexity,
      depth: maxDepth,
      valid: errors.length === 0,
      errors
    };
  }
}

// ============================================================================
// GraphQL Error Handling
// ============================================================================

export class GraphQLError extends Error {
  constructor(
    message: string,
    public code: string,
    public extensions?: Record<string, unknown>,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'GraphQLError';
  }
  
  toJSON(): Record<string, unknown> {
    return {
      message: this.message,
      extensions: {
        code: this.code,
        ...this.extensions
      }
    };
  }
}

export const ErrorCodes = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  RATE_LIMITED: 'RATE_LIMITED',
  COMPLEXITY_EXCEEDED: 'COMPLEXITY_EXCEEDED'
} as const;

export function formatError(error: Error, isDev: boolean = false): Record<string, unknown> {
  if (error instanceof GraphQLError) {
    return error.toJSON();
  }
  
  // Mask internal errors in production
  if (!isDev) {
    return {
      message: 'An unexpected error occurred',
      extensions: {
        code: ErrorCodes.INTERNAL_ERROR
      }
    };
  }
  
  return {
    message: error.message,
    extensions: {
      code: ErrorCodes.INTERNAL_ERROR,
      stacktrace: error.stack?.split('\n')
    }
  };
}

// ============================================================================
// Schema Builder
// ============================================================================

export class SchemaBuilder {
  private types: Map<string, TypeDefinition> = new Map();
  private queries: Map<string, FieldDefinition> = new Map();
  private mutations: Map<string, FieldDefinition> = new Map();
  private subscriptions: Map<string, FieldDefinition> = new Map();
  
  addType(name: string, definition: TypeDefinition): this {
    this.types.set(name, definition);
    return this;
  }
  
  addQuery(name: string, definition: FieldDefinition): this {
    this.queries.set(name, definition);
    return this;
  }
  
  addMutation(name: string, definition: FieldDefinition): this {
    this.mutations.set(name, definition);
    return this;
  }
  
  addSubscription(name: string, definition: FieldDefinition): this {
    this.subscriptions.set(name, definition);
    return this;
  }
  
  generateSDL(): string {
    const parts: string[] = [];
    
    // Generate type definitions
    for (const [name, def] of this.types) {
      parts.push(this.generateTypeDef(name, def));
    }
    
    // Generate Query type
    if (this.queries.size > 0) {
      parts.push(this.generateRootType('Query', this.queries));
    }
    
    // Generate Mutation type
    if (this.mutations.size > 0) {
      parts.push(this.generateRootType('Mutation', this.mutations));
    }
    
    // Generate Subscription type
    if (this.subscriptions.size > 0) {
      parts.push(this.generateRootType('Subscription', this.subscriptions));
    }
    
    return parts.join('\n\n');
  }
  
  private generateTypeDef(name: string, def: TypeDefinition): string {
    const lines = [
      def.description ? `"""${def.description}"""` : '',
      `type ${name} {`
    ].filter(Boolean);
    
    for (const [fieldName, fieldDef] of Object.entries(def.fields)) {
      const type = typeof fieldDef === 'string' ? fieldDef : fieldDef.type;
      const description = typeof fieldDef === 'object' ? fieldDef.description : undefined;
      const deprecated = typeof fieldDef === 'object' ? fieldDef.deprecationReason : undefined;
      
      if (description) {
        lines.push(`  """${description}"""`);
      }
      
      let fieldLine = `  ${fieldName}`;
      
      if (typeof fieldDef === 'object' && fieldDef.args) {
        const args = Object.entries(fieldDef.args)
          .map(([argName, argDef]) => `${argName}: ${argDef.type}`)
          .join(', ');
        fieldLine += `(${args})`;
      }
      
      fieldLine += `: ${type}`;
      
      if (deprecated) {
        fieldLine += ` @deprecated(reason: "${deprecated}")`;
      }
      
      lines.push(fieldLine);
    }
    
    lines.push('}');
    return lines.join('\n');
  }
  
  private generateRootType(name: string, fields: Map<string, FieldDefinition>): string {
    const lines = [`type ${name} {`];
    
    for (const [fieldName, def] of fields) {
      if (def.description) {
        lines.push(`  """${def.description}"""`);
      }
      
      let fieldLine = `  ${fieldName}`;
      
      if (def.args) {
        const args = Object.entries(def.args)
          .map(([argName, argDef]) => {
            let argStr = `${argName}: ${argDef.type}`;
            if (argDef.defaultValue !== undefined) {
              argStr += ` = ${JSON.stringify(argDef.defaultValue)}`;
            }
            return argStr;
          })
          .join(', ');
        fieldLine += `(${args})`;
      }
      
      fieldLine += `: ${def.type}`;
      lines.push(fieldLine);
    }
    
    lines.push('}');
    return lines.join('\n');
  }
  
  getResolvers(): Record<string, Record<string, ResolverFn>> {
    const resolvers: Record<string, Record<string, ResolverFn>> = {};
    
    // Type resolvers
    for (const [typeName, typeDef] of this.types) {
      resolvers[typeName] = {};
      for (const [fieldName, fieldDef] of Object.entries(typeDef.fields)) {
        if (typeof fieldDef === 'object' && fieldDef.resolve) {
          resolvers[typeName][fieldName] = fieldDef.resolve;
        }
      }
    }
    
    // Query resolvers
    if (this.queries.size > 0) {
      resolvers['Query'] = {};
      for (const [name, def] of this.queries) {
        if (def.resolve) {
          resolvers['Query'][name] = def.resolve;
        }
      }
    }
    
    // Mutation resolvers
    if (this.mutations.size > 0) {
      resolvers['Mutation'] = {};
      for (const [name, def] of this.mutations) {
        if (def.resolve) {
          resolvers['Mutation'][name] = def.resolve;
        }
      }
    }
    
    // Subscription resolvers
    if (this.subscriptions.size > 0) {
      resolvers['Subscription'] = {};
      for (const [name, def] of this.subscriptions) {
        if (def.resolve) {
          resolvers['Subscription'][name] = def.resolve;
        }
      }
    }
    
    return resolvers;
  }
}

// ============================================================================
// Subscription Manager (for real-time)
// ============================================================================

type SubscriptionCallback<T> = (data: T) => void;

export class SubscriptionManager {
  private subscriptions: Map<string, Set<SubscriptionCallback<unknown>>> = new Map();
  
  subscribe<T>(topic: string, callback: SubscriptionCallback<T>): () => void {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    
    this.subscriptions.get(topic)!.add(callback as SubscriptionCallback<unknown>);
    
    // Return unsubscribe function
    return () => {
      this.subscriptions.get(topic)?.delete(callback as SubscriptionCallback<unknown>);
    };
  }
  
  publish<T>(topic: string, data: T): void {
    const subscribers = this.subscriptions.get(topic);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Subscription callback error for topic ${topic}:`, error);
        }
      });
    }
  }
  
  async* asyncIterator<T>(topic: string): AsyncGenerator<T, void, unknown> {
    const queue: T[] = [];
    let resolve: (() => void) | null = null;
    
    const unsubscribe = this.subscribe<T>(topic, (data) => {
      queue.push(data);
      if (resolve) {
        resolve();
        resolve = null;
      }
    });
    
    try {
      while (true) {
        if (queue.length > 0) {
          yield queue.shift()!;
        } else {
          await new Promise<void>(r => { resolve = r; });
        }
      }
    } finally {
      unsubscribe();
    }
  }
}

// ============================================================================
// GraphQL Client
// ============================================================================

export interface GraphQLClientOptions {
  endpoint: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export class GraphQLClient {
  private endpoint: string;
  private headers: Record<string, string>;
  private timeout: number;
  
  constructor(options: GraphQLClientOptions) {
    this.endpoint = options.endpoint;
    this.headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    this.timeout = options.timeout || 30000;
  }
  
  async query<T = unknown, V = Record<string, unknown>>(
    query: string,
    variables?: V,
    options?: { headers?: Record<string, string> }
  ): Promise<{ data: T; errors?: Array<{ message: string; extensions?: unknown }> }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          ...this.headers,
          ...options?.headers
        },
        body: JSON.stringify({
          query,
          variables
        }),
        signal: controller.signal
      });
      
      if (!response.ok) {
        throw new GraphQLError(
          `HTTP error: ${response.status}`,
          ErrorCodes.INTERNAL_ERROR
        );
      }
      
      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }
  
  async mutate<T = unknown, V = Record<string, unknown>>(
    mutation: string,
    variables?: V,
    options?: { headers?: Record<string, string> }
  ): Promise<{ data: T; errors?: Array<{ message: string; extensions?: unknown }> }> {
    return this.query<T, V>(mutation, variables, options);
  }
  
  setHeader(key: string, value: string): void {
    this.headers[key] = value;
  }
  
  removeHeader(key: string): void {
    delete this.headers[key];
  }
}

// ============================================================================
// Middleware Types
// ============================================================================

export type ResolverMiddleware = (
  resolve: ResolverFn,
  parent: unknown,
  args: Record<string, unknown>,
  context: GraphQLContext,
  info: GraphQLResolveInfo
) => Promise<unknown>;

export function composeMiddleware(...middlewares: ResolverMiddleware[]): ResolverMiddleware {
  return middlewares.reduce((a, b) => (resolve, parent, args, context, info) => 
    a((p, ar, c, i) => b(resolve, p, ar, c, i), parent, args, context, info)
  );
}

// ============================================================================
// Common Middlewares
// ============================================================================

export const authMiddleware: ResolverMiddleware = async (resolve, parent, args, context, info) => {
  if (!context.user) {
    throw new GraphQLError('Not authenticated', ErrorCodes.UNAUTHENTICATED);
  }
  return resolve(parent, args, context, info);
};

export const loggingMiddleware: ResolverMiddleware = async (resolve, parent, args, context, info) => {
  const start = Date.now();
  try {
    const result = await resolve(parent, args, context, info);
    console.log(`[GraphQL] ${info.fieldName} completed in ${Date.now() - start}ms`);
    return result;
  } catch (error) {
    console.error(`[GraphQL] ${info.fieldName} failed after ${Date.now() - start}ms:`, error);
    throw error;
  }
};

export const rateLimitMiddleware = (
  limit: number,
  windowMs: number
): ResolverMiddleware => {
  const requests = new Map<string, number[]>();
  
  return async (resolve, parent, args, context, info) => {
    const key = context.user?.id || context.requestId;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get requests in window
    const userRequests = requests.get(key) || [];
    const recentRequests = userRequests.filter(t => t > windowStart);
    
    if (recentRequests.length >= limit) {
      throw new GraphQLError(
        'Rate limit exceeded',
        ErrorCodes.RATE_LIMITED,
        { retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000) }
      );
    }
    
    // Record this request
    recentRequests.push(now);
    requests.set(key, recentRequests);
    
    return resolve(parent, args, context, info);
  };
};

// ============================================================================
// Singleton Instances
// ============================================================================

let subscriptionManager: SubscriptionManager | null = null;

export function getSubscriptionManager(): SubscriptionManager {
  if (!subscriptionManager) {
    subscriptionManager = new SubscriptionManager();
  }
  return subscriptionManager;
}

export default {
  DataLoader,
  SchemaBuilder,
  ComplexityAnalyzer,
  SubscriptionManager,
  GraphQLClient,
  GraphQLError,
  ErrorCodes,
  formatError,
  authMiddleware,
  loggingMiddleware,
  rateLimitMiddleware,
  composeMiddleware
};
