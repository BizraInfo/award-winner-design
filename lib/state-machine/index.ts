/**
 * Elite State Machine with Ihsān Principles
 * 
 * Finite state machine implementation featuring:
 * - Type-safe state definitions
 * - Hierarchical states (nested machines)
 * - Guard conditions
 * - Actions and effects
 * - Event-driven transitions
 * - State history
 * - Parallel states
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export type StateValue = string | { [key: string]: StateValue };

export interface StateEvent<TType extends string = string, TPayload = unknown> {
  type: TType;
  payload?: TPayload;
  timestamp?: number;
}

export interface StateContext<TContext = Record<string, unknown>> {
  data: TContext;
  history: StateValue[];
}

export type GuardFn<TContext = unknown, TEvent extends StateEvent = StateEvent> = (
  context: TContext,
  event: TEvent
) => boolean;

export type ActionFn<TContext = unknown, TEvent extends StateEvent = StateEvent> = (
  context: TContext,
  event: TEvent
) => void | TContext | Promise<void | TContext>;

export interface TransitionConfig<
  TContext = unknown,
  TEvent extends StateEvent = StateEvent
> {
  target: string;
  guard?: GuardFn<TContext, TEvent>;
  actions?: ActionFn<TContext, TEvent>[];
  description?: string;
}

export interface StateNodeConfig<
  TContext = unknown,
  TEvent extends StateEvent = StateEvent
> {
  initial?: string;
  entry?: ActionFn<TContext, TEvent>[];
  exit?: ActionFn<TContext, TEvent>[];
  on?: Record<string, string | TransitionConfig<TContext, TEvent> | TransitionConfig<TContext, TEvent>[]>;
  states?: Record<string, StateNodeConfig<TContext, TEvent>>;
  type?: 'atomic' | 'compound' | 'parallel' | 'final' | 'history';
  history?: 'shallow' | 'deep';
  meta?: Record<string, unknown>;
  invoke?: {
    src: (context: TContext) => Promise<unknown>;
    onDone?: string | TransitionConfig<TContext, TEvent>;
    onError?: string | TransitionConfig<TContext, TEvent>;
  };
}

export interface MachineConfig<
  TContext = unknown,
  TEvent extends StateEvent = StateEvent
> {
  id: string;
  initial: string;
  context: TContext;
  states: Record<string, StateNodeConfig<TContext, TEvent>>;
  on?: Record<string, string | TransitionConfig<TContext, TEvent>>;
}

export interface MachineState<TContext = unknown> {
  value: StateValue;
  context: TContext;
  matches: (value: string | string[]) => boolean;
  can: (event: string) => boolean;
  history: StateValue[];
  done: boolean;
}

// ============================================================================
// State Machine Implementation
// ============================================================================

export class StateMachine<
  TContext extends Record<string, unknown> = Record<string, unknown>,
  TEvent extends StateEvent = StateEvent
> {
  private config: MachineConfig<TContext, TEvent>;
  private currentState: StateValue;
  private context: TContext;
  private history: StateValue[] = [];
  private listeners: Set<(state: MachineState<TContext>) => void> = new Set();
  private isTransitioning = false;
  private eventQueue: TEvent[] = [];
  
  constructor(config: MachineConfig<TContext, TEvent>) {
    this.config = config;
    this.context = { ...config.context };
    this.currentState = this.resolveInitialState(config);
    
    // Execute entry actions for initial state
    this.executeEntryActions(this.currentState);
  }
  
  /**
   * Get current machine state
   */
  getState(): MachineState<TContext> {
    return {
      value: this.currentState,
      context: { ...this.context },
      matches: (value) => this.matches(value),
      can: (event) => this.can(event),
      history: [...this.history],
      done: this.isDone()
    };
  }
  
  /**
   * Send an event to the machine
   */
  async send(event: TEvent | string): Promise<MachineState<TContext>> {
    const normalizedEvent: TEvent = typeof event === 'string' 
      ? { type: event, timestamp: Date.now() } as TEvent
      : { ...event, timestamp: event.timestamp || Date.now() };
    
    // Queue event if transitioning
    if (this.isTransitioning) {
      this.eventQueue.push(normalizedEvent);
      return this.getState();
    }
    
    this.isTransitioning = true;
    
    try {
      await this.processEvent(normalizedEvent);
      
      // Process queued events
      while (this.eventQueue.length > 0) {
        const queuedEvent = this.eventQueue.shift()!;
        await this.processEvent(queuedEvent);
      }
    } finally {
      this.isTransitioning = false;
    }
    
    return this.getState();
  }
  
  /**
   * Check if current state matches
   */
  matches(value: string | string[]): boolean {
    const values = Array.isArray(value) ? value : [value];
    const currentPath = this.getStatePath(this.currentState);
    
    return values.some(v => {
      const matchPath = v.split('.');
      return matchPath.every((segment, index) => currentPath[index] === segment);
    });
  }
  
  /**
   * Check if event can trigger a transition
   */
  can(eventType: string): boolean {
    const stateNode = this.getStateNode(this.currentState);
    if (!stateNode) return false;
    
    // Check state-specific transitions
    const transition = stateNode.on?.[eventType];
    if (transition) {
      return this.canTransition(transition, { type: eventType } as TEvent);
    }
    
    // Check global transitions
    const globalTransition = this.config.on?.[eventType];
    if (globalTransition) {
      return this.canTransition(globalTransition, { type: eventType } as TEvent);
    }
    
    return false;
  }
  
  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: MachineState<TContext>) => void): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }
  
  /**
   * Reset machine to initial state
   */
  reset(context?: Partial<TContext>): void {
    // Execute exit actions
    this.executeExitActions(this.currentState);
    
    this.context = { ...this.config.context, ...context };
    this.currentState = this.resolveInitialState(this.config);
    this.history = [];
    this.eventQueue = [];
    
    // Execute entry actions for initial state
    this.executeEntryActions(this.currentState);
    
    this.notify();
  }
  
  // ============================================================================
  // Private Methods
  // ============================================================================
  
  private async processEvent(event: TEvent): Promise<void> {
    const stateNode = this.getStateNode(this.currentState);
    if (!stateNode) return;
    
    // Find applicable transition
    let transition = stateNode.on?.[event.type];
    
    // Fall back to global transitions
    if (!transition) {
      transition = this.config.on?.[event.type];
    }
    
    if (!transition) return;
    
    // Resolve transition (could be array)
    const resolvedTransition = this.resolveTransition(transition, event);
    if (!resolvedTransition) return;
    
    // Execute transition
    await this.executeTransition(resolvedTransition, event);
  }
  
  private resolveTransition(
    transition: string | TransitionConfig<TContext, TEvent> | TransitionConfig<TContext, TEvent>[],
    event: TEvent
  ): TransitionConfig<TContext, TEvent> | null {
    if (typeof transition === 'string') {
      return { target: transition };
    }
    
    if (Array.isArray(transition)) {
      // Find first transition with passing guard
      for (const t of transition) {
        if (!t.guard || t.guard(this.context, event)) {
          return t;
        }
      }
      return null;
    }
    
    // Check guard
    if (transition.guard && !transition.guard(this.context, event)) {
      return null;
    }
    
    return transition;
  }
  
  private async executeTransition(
    transition: TransitionConfig<TContext, TEvent>,
    event: TEvent
  ): Promise<void> {
    const previousState = this.currentState;
    
    // Execute exit actions
    await this.executeExitActions(previousState);
    
    // Execute transition actions
    if (transition.actions) {
      for (const action of transition.actions) {
        const result = await action(this.context, event);
        if (result && typeof result === 'object') {
          this.context = result as TContext;
        }
      }
    }
    
    // Update history
    this.history.push(previousState);
    if (this.history.length > 100) {
      this.history.shift();
    }
    
    // Resolve target state
    this.currentState = this.resolveTargetState(transition.target);
    
    // Execute entry actions
    await this.executeEntryActions(this.currentState);
    
    // Handle invoke if present
    const newStateNode = this.getStateNode(this.currentState);
    if (newStateNode?.invoke) {
      await this.handleInvoke(newStateNode.invoke);
    }
    
    this.notify();
  }
  
  private async executeEntryActions(state: StateValue): Promise<void> {
    const stateNode = this.getStateNode(state);
    if (stateNode?.entry) {
      for (const action of stateNode.entry) {
        const result = await action(this.context, { type: 'entry' } as TEvent);
        if (result && typeof result === 'object') {
          this.context = result as TContext;
        }
      }
    }
  }
  
  private async executeExitActions(state: StateValue): Promise<void> {
    const stateNode = this.getStateNode(state);
    if (stateNode?.exit) {
      for (const action of stateNode.exit) {
        const result = await action(this.context, { type: 'exit' } as TEvent);
        if (result && typeof result === 'object') {
          this.context = result as TContext;
        }
      }
    }
  }
  
  private async handleInvoke(invoke: StateNodeConfig<TContext, TEvent>['invoke']): Promise<void> {
    if (!invoke) return;
    
    try {
      const result = await invoke.src(this.context);
      
      if (invoke.onDone) {
        await this.send({
          type: 'done.invoke',
          payload: result
        } as TEvent);
        
        const transition = this.resolveTransition(invoke.onDone, {
          type: 'done.invoke',
          payload: result
        } as TEvent);
        
        if (transition) {
          await this.executeTransition(transition, {
            type: 'done.invoke',
            payload: result
          } as TEvent);
        }
      }
    } catch (error) {
      if (invoke.onError) {
        const transition = this.resolveTransition(invoke.onError, {
          type: 'error.invoke',
          payload: error
        } as TEvent);
        
        if (transition) {
          await this.executeTransition(transition, {
            type: 'error.invoke',
            payload: error
          } as TEvent);
        }
      }
    }
  }
  
  private resolveInitialState(config: MachineConfig<TContext, TEvent>): StateValue {
    const initial = config.initial;
    const stateNode = config.states[initial];
    
    if (stateNode?.initial && stateNode.states) {
      // Compound state - resolve nested initial
      return {
        [initial]: this.resolveNestedInitialState(stateNode)
      };
    }
    
    return initial;
  }
  
  private resolveNestedInitialState(stateNode: StateNodeConfig<TContext, TEvent>): StateValue {
    if (!stateNode.initial || !stateNode.states) {
      return '';
    }
    
    const nestedNode = stateNode.states[stateNode.initial];
    if (nestedNode?.initial && nestedNode.states) {
      return {
        [stateNode.initial]: this.resolveNestedInitialState(nestedNode)
      };
    }
    
    return stateNode.initial;
  }
  
  private resolveTargetState(target: string): StateValue {
    // Handle relative targets (starts with .)
    if (target.startsWith('.')) {
      const relativePath = target.slice(1).split('.');
      return this.resolveRelativeState(relativePath);
    }
    
    // Handle absolute targets
    const parts = target.split('.');
    if (parts.length === 1) {
      const stateNode = this.config.states[target];
      if (stateNode?.initial && stateNode.states) {
        return { [target]: this.resolveNestedInitialState(stateNode) };
      }
      return target;
    }
    
    // Build nested state value
    return this.buildNestedStateValue(parts);
  }
  
  private resolveRelativeState(path: string[]): StateValue {
    const currentPath = this.getStatePath(this.currentState);
    const newPath = [...currentPath.slice(0, -1), ...path];
    return this.buildNestedStateValue(newPath);
  }
  
  private buildNestedStateValue(path: string[]): StateValue {
    if (path.length === 1) return path[0];
    
    const result: Record<string, StateValue> = {};
    let current = result;
    
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = i === path.length - 2 
        ? path[path.length - 1] 
        : {};
      current = current[path[i]] as Record<string, StateValue>;
    }
    
    return result;
  }
  
  private getStatePath(state: StateValue): string[] {
    if (typeof state === 'string') return [state];
    
    const path: string[] = [];
    let current: StateValue = state;
    
    while (typeof current === 'object') {
      const key: string = Object.keys(current)[0];
      path.push(key);
      current = (current as Record<string, StateValue>)[key];
    }
    
    if (typeof current === 'string') {
      path.push(current);
    }
    
    return path;
  }
  
  private getStateNode(state: StateValue): StateNodeConfig<TContext, TEvent> | null {
    const path = this.getStatePath(state);
    let node: StateNodeConfig<TContext, TEvent> | undefined = this.config.states[path[0]];
    
    for (let i = 1; i < path.length; i++) {
      if (!node?.states) return null;
      node = node.states[path[i]];
    }
    
    return node || null;
  }
  
  private canTransition(
    transition: string | TransitionConfig<TContext, TEvent> | TransitionConfig<TContext, TEvent>[],
    event: TEvent
  ): boolean {
    return this.resolveTransition(transition, event) !== null;
  }
  
  private isDone(): boolean {
    const stateNode = this.getStateNode(this.currentState);
    return stateNode?.type === 'final';
  }
  
  private notify(): void {
    const state = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('[StateMachine] Listener error:', error);
      }
    });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a state machine
 */
export function createMachine<
  TContext extends Record<string, unknown>,
  TEvent extends StateEvent = StateEvent
>(
  config: MachineConfig<TContext, TEvent>
): StateMachine<TContext, TEvent> {
  return new StateMachine(config);
}

/**
 * Create an action that assigns to context
 */
export function assign<TContext, TEvent extends StateEvent>(
  assignment: Partial<TContext> | ((context: TContext, event: TEvent) => Partial<TContext>)
): ActionFn<TContext, TEvent> {
  return (context, event) => {
    const updates = typeof assignment === 'function' 
      ? assignment(context, event)
      : assignment;
    return { ...context, ...updates };
  };
}

/**
 * Create a guard function
 */
export function guard<TContext, TEvent extends StateEvent>(
  condition: (context: TContext, event: TEvent) => boolean
): GuardFn<TContext, TEvent> {
  return condition;
}

/**
 * Create an action that logs
 */
export function log<TContext, TEvent extends StateEvent>(
  message: string | ((context: TContext, event: TEvent) => string)
): ActionFn<TContext, TEvent> {
  return (context, event) => {
    const msg = typeof message === 'function' ? message(context, event) : message;
    console.log(`[StateMachine] ${msg}`);
  };
}

/**
 * Create a conditional action
 */
export function choose<TContext, TEvent extends StateEvent>(
  conditions: Array<{
    guard?: GuardFn<TContext, TEvent>;
    actions: ActionFn<TContext, TEvent>[];
  }>
): ActionFn<TContext, TEvent> {
  return async (context, event) => {
    for (const condition of conditions) {
      if (!condition.guard || condition.guard(context, event)) {
        let result = context;
        for (const action of condition.actions) {
          const actionResult = await action(result, event);
          if (actionResult && typeof actionResult === 'object') {
            result = actionResult as TContext;
          }
        }
        return result;
      }
    }
    return context;
  };
}

// ============================================================================
// Common Machine Patterns
// ============================================================================

/**
 * Create a toggle machine
 */
export function createToggleMachine(initialValue: boolean = false) {
  return createMachine({
    id: 'toggle',
    initial: initialValue ? 'active' : 'inactive',
    context: { value: initialValue },
    states: {
      inactive: {
        on: {
          TOGGLE: {
            target: 'active',
            actions: [assign({ value: true })]
          }
        }
      },
      active: {
        on: {
          TOGGLE: {
            target: 'inactive',
            actions: [assign({ value: false })]
          }
        }
      }
    }
  });
}

/**
 * Create a fetch machine
 */
export function createFetchMachine<T>(
  fetchFn: () => Promise<T>
) {
  type Context = { data: T | null; error: Error | null };
  type Event = StateEvent<'FETCH' | 'RETRY' | 'RESET'>;
  
  return createMachine<Context, Event>({
    id: 'fetch',
    initial: 'idle',
    context: { data: null, error: null },
    states: {
      idle: {
        on: {
          FETCH: 'loading'
        }
      },
      loading: {
        invoke: {
          src: async () => fetchFn(),
          onDone: {
            target: 'success',
            actions: [assign((_, event) => ({ 
              data: (event as StateEvent<string, T>).payload as T, 
              error: null 
            }))]
          },
          onError: {
            target: 'failure',
            actions: [assign((_, event) => ({ 
              data: null, 
              error: (event as StateEvent<string, Error>).payload as Error 
            }))]
          }
        }
      },
      success: {
        on: {
          FETCH: 'loading',
          RESET: 'idle'
        }
      },
      failure: {
        on: {
          RETRY: 'loading',
          RESET: 'idle'
        }
      }
    }
  });
}

/**
 * Create a wizard/multi-step machine
 */
export function createWizardMachine<TData extends Record<string, unknown>>(
  steps: string[],
  initialData: TData
) {
  type WizardContext = Record<string, unknown> & { currentStep: number; data: TData; completed: boolean };
  type WizardEvent = StateEvent<'NEXT' | 'PREV' | 'GOTO' | 'SUBMIT' | 'RESET', { step?: number; data?: Partial<TData> }>;
  
  const states: Record<string, StateNodeConfig<WizardContext, WizardEvent>> = {};
  
  steps.forEach((step, index) => {
    const onConfig: Record<string, string | TransitionConfig<WizardContext, WizardEvent> | TransitionConfig<WizardContext, WizardEvent>[]> = {};
    
    if (index < steps.length - 1) {
      onConfig['NEXT'] = {
        target: steps[index + 1],
        actions: [
          (ctx: WizardContext, evt: WizardEvent): WizardContext => ({ 
            ...ctx,
            data: { ...ctx.data, ...(evt.payload?.data || {}) } 
          })
        ]
      };
    }
    
    if (index > 0) {
      onConfig['PREV'] = steps[index - 1];
    }
    
    onConfig['GOTO'] = steps.map((s, i) => ({
      target: s,
      guard: (_: WizardContext, evt: WizardEvent) => evt.payload?.step === i
    }));
    
    states[step] = {
      entry: [(ctx: WizardContext): WizardContext => ({ ...ctx, currentStep: index })],
      on: onConfig
    };
  });
  
  // Add final state
  states['complete'] = {
    type: 'final',
    entry: [(ctx: WizardContext): WizardContext => ({ ...ctx, completed: true })]
  };
  
  // Add submit transition to last step
  const lastStep = steps[steps.length - 1];
  if (states[lastStep].on) {
    states[lastStep].on['SUBMIT'] = 'complete';
  }
  
  return createMachine<WizardContext, WizardEvent>({
    id: 'wizard',
    initial: steps[0],
    context: { currentStep: 0, data: initialData, completed: false } as WizardContext,
    states,
    on: {
      RESET: steps[0]
    }
  });
}

export default {
  StateMachine,
  createMachine,
  assign,
  guard,
  log,
  choose,
  createToggleMachine,
  createFetchMachine,
  createWizardMachine
};
