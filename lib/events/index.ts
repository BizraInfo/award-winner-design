/**
 * Elite Event-Driven Architecture with Ihsān Principles
 * 
 * Comprehensive event system featuring:
 * - Type-safe event bus
 * - Pub/Sub patterns
 * - Event sourcing primitives
 * - Async message queues
 * - Event replay and persistence
 * - Dead letter queue handling
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface Event<T = unknown> {
  id: string;
  type: string;
  payload: T;
  timestamp: number;
  metadata: EventMetadata;
}

export interface EventMetadata {
  correlationId?: string;
  causationId?: string;
  userId?: string;
  source?: string;
  version?: number;
  retryCount?: number;
}

export type EventHandler<T = unknown> = (event: Event<T>) => void | Promise<void>;

export interface Subscription {
  unsubscribe: () => void;
  pause: () => void;
  resume: () => void;
}

export interface EventStore {
  append(event: Event): Promise<void>;
  getEvents(streamId: string, fromVersion?: number): Promise<Event[]>;
  getAllEvents(fromTimestamp?: number): Promise<Event[]>;
}

export interface MessageQueueOptions {
  maxRetries?: number;
  retryDelay?: number;
  deadLetterQueue?: boolean;
  concurrency?: number;
}

// ============================================================================
// Event Bus
// ============================================================================

export class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private wildcardHandlers: Set<EventHandler> = new Set();
  private middleware: Array<(event: Event, next: () => Promise<void>) => Promise<void>> = [];
  private eventHistory: Event[] = [];
  private readonly maxHistorySize: number;
  
  constructor(options: { maxHistorySize?: number } = {}) {
    this.maxHistorySize = options.maxHistorySize || 1000;
  }
  
  /**
   * Subscribe to a specific event type
   */
  on<T>(eventType: string, handler: EventHandler<T>): Subscription {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    
    this.handlers.get(eventType)!.add(handler as EventHandler);
    
    let paused = false;
    
    return {
      unsubscribe: () => {
        this.handlers.get(eventType)?.delete(handler as EventHandler);
      },
      pause: () => { paused = true; },
      resume: () => { paused = false; }
    };
  }
  
  /**
   * Subscribe once to an event
   */
  once<T>(eventType: string, handler: EventHandler<T>): Subscription {
    const wrappedHandler: EventHandler<T> = async (event) => {
      subscription.unsubscribe();
      await handler(event);
    };
    
    const subscription = this.on(eventType, wrappedHandler);
    return subscription;
  }
  
  /**
   * Subscribe to all events (wildcard)
   */
  onAny(handler: EventHandler): Subscription {
    this.wildcardHandlers.add(handler);
    
    return {
      unsubscribe: () => this.wildcardHandlers.delete(handler),
      pause: () => {},
      resume: () => {}
    };
  }
  
  /**
   * Emit an event
   */
  async emit<T>(eventType: string, payload: T, metadata: Partial<EventMetadata> = {}): Promise<void> {
    const event: Event<T> = {
      id: this.generateId(),
      type: eventType,
      payload,
      timestamp: Date.now(),
      metadata: {
        version: 1,
        retryCount: 0,
        ...metadata
      }
    };
    
    // Store in history
    this.eventHistory.push(event as Event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
    
    // Run through middleware
    await this.runMiddleware(event as Event, async () => {
      // Notify specific handlers
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        await Promise.all(
          Array.from(handlers).map(handler => 
            this.safeExecute(handler, event as Event)
          )
        );
      }
      
      // Notify wildcard handlers
      await Promise.all(
        Array.from(this.wildcardHandlers).map(handler =>
          this.safeExecute(handler, event as Event)
        )
      );
    });
  }
  
  /**
   * Emit multiple events in batch
   */
  async emitBatch(events: Array<{ type: string; payload: unknown; metadata?: Partial<EventMetadata> }>): Promise<void> {
    await Promise.all(
      events.map(({ type, payload, metadata }) => 
        this.emit(type, payload, metadata)
      )
    );
  }
  
  /**
   * Add middleware to event processing pipeline
   */
  use(middleware: (event: Event, next: () => Promise<void>) => Promise<void>): void {
    this.middleware.push(middleware);
  }
  
  /**
   * Get event history
   */
  getHistory(eventType?: string): Event[] {
    if (eventType) {
      return this.eventHistory.filter(e => e.type === eventType);
    }
    return [...this.eventHistory];
  }
  
  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
    this.wildcardHandlers.clear();
  }
  
  /**
   * Get handler count for an event type
   */
  listenerCount(eventType: string): number {
    return (this.handlers.get(eventType)?.size || 0) + this.wildcardHandlers.size;
  }
  
  private async runMiddleware(event: Event, finalHandler: () => Promise<void>): Promise<void> {
    let index = 0;
    
    const next = async (): Promise<void> => {
      if (index < this.middleware.length) {
        const mw = this.middleware[index++];
        await mw(event, next);
      } else {
        await finalHandler();
      }
    };
    
    await next();
  }
  
  private async safeExecute(handler: EventHandler, event: Event): Promise<void> {
    try {
      await handler(event);
    } catch (error) {
      console.error(`[EventBus] Handler error for ${event.type}:`, error);
    }
  }
  
  private generateId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}

// ============================================================================
// Pub/Sub Manager
// ============================================================================

export class PubSubManager {
  private topics: Map<string, Set<EventHandler>> = new Map();
  private topicFilters: Map<string, (payload: unknown) => boolean> = new Map();
  
  /**
   * Subscribe to a topic with optional filter
   */
  subscribe<T>(
    topic: string,
    handler: EventHandler<T>,
    filter?: (payload: T) => boolean
  ): Subscription {
    if (!this.topics.has(topic)) {
      this.topics.set(topic, new Set());
    }
    
    const wrappedHandler: EventHandler<T> = async (event) => {
      if (!filter || filter(event.payload)) {
        await handler(event);
      }
    };
    
    this.topics.get(topic)!.add(wrappedHandler as EventHandler);
    
    return {
      unsubscribe: () => this.topics.get(topic)?.delete(wrappedHandler as EventHandler),
      pause: () => {},
      resume: () => {}
    };
  }
  
  /**
   * Subscribe to multiple topics
   */
  subscribeMany(
    topics: string[],
    handler: EventHandler
  ): Subscription {
    const subscriptions = topics.map(topic => this.subscribe(topic, handler));
    
    return {
      unsubscribe: () => subscriptions.forEach(s => s.unsubscribe()),
      pause: () => subscriptions.forEach(s => s.pause()),
      resume: () => subscriptions.forEach(s => s.resume())
    };
  }
  
  /**
   * Subscribe to topics matching a pattern
   */
  subscribePattern(
    pattern: string,
    handler: EventHandler
  ): Subscription {
    const regex = new RegExp(pattern.replace('*', '.*'));
    
    // This is a special subscription that checks all topics
    const checkHandler: EventHandler = async (event) => {
      if (regex.test(event.type)) {
        await handler(event);
      }
    };
    
    // Store in a special pattern topic
    const patternTopic = `__pattern__${pattern}`;
    if (!this.topics.has(patternTopic)) {
      this.topics.set(patternTopic, new Set());
    }
    this.topics.get(patternTopic)!.add(checkHandler);
    
    return {
      unsubscribe: () => this.topics.get(patternTopic)?.delete(checkHandler),
      pause: () => {},
      resume: () => {}
    };
  }
  
  /**
   * Publish to a topic
   */
  async publish<T>(topic: string, payload: T, metadata: Partial<EventMetadata> = {}): Promise<void> {
    const event: Event<T> = {
      id: `pub_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      type: topic,
      payload,
      timestamp: Date.now(),
      metadata: { version: 1, ...metadata }
    };
    
    // Direct subscribers
    const handlers = this.topics.get(topic);
    if (handlers) {
      await Promise.all(
        Array.from(handlers).map(handler => handler(event as Event))
      );
    }
    
    // Pattern subscribers
    for (const [key, patternHandlers] of this.topics) {
      if (key.startsWith('__pattern__')) {
        await Promise.all(
          Array.from(patternHandlers).map(handler => handler(event as Event))
        );
      }
    }
  }
  
  /**
   * Get all topics
   */
  getTopics(): string[] {
    return Array.from(this.topics.keys()).filter(k => !k.startsWith('__pattern__'));
  }
  
  /**
   * Check if topic has subscribers
   */
  hasSubscribers(topic: string): boolean {
    return (this.topics.get(topic)?.size || 0) > 0;
  }
}

// ============================================================================
// Message Queue
// ============================================================================

interface QueuedMessage<T = unknown> {
  id: string;
  data: T;
  timestamp: number;
  retries: number;
  scheduledFor?: number;
}

export class MessageQueue<T = unknown> {
  private queue: QueuedMessage<T>[] = [];
  private processing = false;
  private handlers: Set<(message: T) => Promise<void>> = new Set();
  private deadLetterQueue: QueuedMessage<T>[] = [];
  private options: Required<MessageQueueOptions>;
  
  constructor(options: MessageQueueOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
      deadLetterQueue: options.deadLetterQueue ?? true,
      concurrency: options.concurrency ?? 1
    };
  }
  
  /**
   * Add a message to the queue
   */
  enqueue(data: T, delay?: number): string {
    const message: QueuedMessage<T> = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      data,
      timestamp: Date.now(),
      retries: 0,
      scheduledFor: delay ? Date.now() + delay : undefined
    };
    
    this.queue.push(message);
    this.processQueue();
    
    return message.id;
  }
  
  /**
   * Add a message handler
   */
  onMessage(handler: (message: T) => Promise<void>): () => void {
    this.handlers.add(handler);
    this.processQueue();
    
    return () => this.handlers.delete(handler);
  }
  
  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.handlers.size === 0) return;
    
    this.processing = true;
    
    try {
      while (this.queue.length > 0) {
        // Get messages that are ready to process
        const now = Date.now();
        const readyMessages = this.queue.filter(
          m => !m.scheduledFor || m.scheduledFor <= now
        );
        
        if (readyMessages.length === 0) {
          // Schedule next check for delayed messages
          const nextMessage = this.queue
            .filter(m => m.scheduledFor)
            .sort((a, b) => (a.scheduledFor || 0) - (b.scheduledFor || 0))[0];
          
          if (nextMessage?.scheduledFor) {
            setTimeout(() => this.processQueue(), nextMessage.scheduledFor - now);
          }
          break;
        }
        
        // Process up to concurrency limit
        const toProcess = readyMessages.slice(0, this.options.concurrency);
        
        await Promise.all(
          toProcess.map(message => this.processMessage(message))
        );
      }
    } finally {
      this.processing = false;
    }
  }
  
  private async processMessage(message: QueuedMessage<T>): Promise<void> {
    // Remove from queue
    const index = this.queue.findIndex(m => m.id === message.id);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
    
    for (const handler of this.handlers) {
      try {
        await handler(message.data);
      } catch (error) {
        console.error(`[MessageQueue] Handler error:`, error);
        
        // Retry logic
        if (message.retries < this.options.maxRetries) {
          message.retries++;
          message.scheduledFor = Date.now() + (this.options.retryDelay * message.retries);
          this.queue.push(message);
        } else if (this.options.deadLetterQueue) {
          this.deadLetterQueue.push(message);
        }
      }
    }
  }
  
  /**
   * Get queue length
   */
  get length(): number {
    return this.queue.length;
  }
  
  /**
   * Get dead letter queue contents
   */
  getDeadLetterQueue(): QueuedMessage<T>[] {
    return [...this.deadLetterQueue];
  }
  
  /**
   * Reprocess dead letter queue
   */
  reprocessDeadLetterQueue(): void {
    const messages = this.deadLetterQueue.splice(0);
    messages.forEach(m => {
      m.retries = 0;
      m.scheduledFor = undefined;
      this.queue.push(m);
    });
    this.processQueue();
  }
  
  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
  }
}

// ============================================================================
// Event Store (Event Sourcing)
// ============================================================================

export class InMemoryEventStore implements EventStore {
  private events: Map<string, Event[]> = new Map();
  private allEvents: Event[] = [];
  
  async append(event: Event): Promise<void> {
    const streamId = event.metadata.correlationId || 'default';
    
    if (!this.events.has(streamId)) {
      this.events.set(streamId, []);
    }
    
    this.events.get(streamId)!.push(event);
    this.allEvents.push(event);
  }
  
  async getEvents(streamId: string, fromVersion?: number): Promise<Event[]> {
    const events = this.events.get(streamId) || [];
    
    if (fromVersion !== undefined) {
      return events.filter(e => (e.metadata.version || 0) >= fromVersion);
    }
    
    return [...events];
  }
  
  async getAllEvents(fromTimestamp?: number): Promise<Event[]> {
    if (fromTimestamp !== undefined) {
      return this.allEvents.filter(e => e.timestamp >= fromTimestamp);
    }
    
    return [...this.allEvents];
  }
  
  /**
   * Get event count
   */
  get count(): number {
    return this.allEvents.length;
  }
  
  /**
   * Clear all events
   */
  clear(): void {
    this.events.clear();
    this.allEvents = [];
  }
}

// ============================================================================
// Aggregate Root (Event Sourcing Pattern)
// ============================================================================

export abstract class AggregateRoot<TState> {
  protected state: TState;
  private uncommittedEvents: Event[] = [];
  private version = 0;
  
  constructor(initialState: TState) {
    this.state = initialState;
  }
  
  /**
   * Apply an event to the aggregate
   */
  protected apply<T>(eventType: string, payload: T): void {
    const event: Event<T> = {
      id: `agg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      type: eventType,
      payload,
      timestamp: Date.now(),
      metadata: {
        version: ++this.version
      }
    };
    
    this.state = this.evolve(this.state, event as Event);
    this.uncommittedEvents.push(event as Event);
  }
  
  /**
   * Evolve state based on event (to be implemented by subclass)
   */
  protected abstract evolve(state: TState, event: Event): TState;
  
  /**
   * Load from event history
   */
  loadFromHistory(events: Event[]): void {
    for (const event of events) {
      this.state = this.evolve(this.state, event);
      this.version = event.metadata.version || this.version;
    }
  }
  
  /**
   * Get uncommitted events
   */
  getUncommittedEvents(): Event[] {
    return [...this.uncommittedEvents];
  }
  
  /**
   * Clear uncommitted events (after persistence)
   */
  clearUncommittedEvents(): void {
    this.uncommittedEvents = [];
  }
  
  /**
   * Get current state
   */
  getState(): TState {
    return this.state;
  }
  
  /**
   * Get current version
   */
  getVersion(): number {
    return this.version;
  }
}

// ============================================================================
// Event Middlewares
// ============================================================================

export function loggingMiddleware(
  event: Event,
  next: () => Promise<void>
): Promise<void> {
  console.log(`[Event] ${event.type}`, {
    id: event.id,
    timestamp: new Date(event.timestamp).toISOString(),
    metadata: event.metadata
  });
  return next();
}

export function validationMiddleware(
  validators: Map<string, (payload: unknown) => boolean>
): (event: Event, next: () => Promise<void>) => Promise<void> {
  return async (event, next) => {
    const validator = validators.get(event.type);
    if (validator && !validator(event.payload)) {
      throw new Error(`Invalid payload for event ${event.type}`);
    }
    await next();
  };
}

export function persistenceMiddleware(
  store: EventStore
): (event: Event, next: () => Promise<void>) => Promise<void> {
  return async (event, next) => {
    await store.append(event);
    await next();
  };
}

// ============================================================================
// Singleton Instances
// ============================================================================

let globalEventBus: EventBus | null = null;
let globalPubSub: PubSubManager | null = null;

export function getEventBus(): EventBus {
  if (!globalEventBus) {
    globalEventBus = new EventBus();
  }
  return globalEventBus;
}

export function getPubSub(): PubSubManager {
  if (!globalPubSub) {
    globalPubSub = new PubSubManager();
  }
  return globalPubSub;
}

export default {
  EventBus,
  PubSubManager,
  MessageQueue,
  InMemoryEventStore,
  AggregateRoot,
  getEventBus,
  getPubSub,
  loggingMiddleware,
  validationMiddleware,
  persistenceMiddleware
};
