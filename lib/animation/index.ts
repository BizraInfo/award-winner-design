/**
 * Elite Animation System with Ihsān Principles
 * 
 * Physics-based motion system featuring:
 * - Spring dynamics (natural motion)
 * - Keyframe animations
 * - Orchestration (stagger, sequence)
 * - Gesture-driven animations
 * - Performance optimized (RAF batching)
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface SpringConfig {
  tension: number;      // Stiffness (default: 170)
  friction: number;     // Damping (default: 26)
  mass: number;         // Mass (default: 1)
  velocity?: number;    // Initial velocity
  precision?: number;   // When to stop (default: 0.01)
}

export interface AnimationValue {
  current: number;
  target: number;
  velocity: number;
}

export interface KeyframeConfig {
  values: number[];
  times?: number[];     // 0-1 normalized times (default: evenly spaced)
  easing?: EasingFunction;
  duration: number;
}

export interface AnimationOptions {
  onUpdate?: (value: number) => void;
  onComplete?: () => void;
  onStart?: () => void;
}

export interface GestureState {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  isDragging: boolean;
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
}

export type EasingFunction = (t: number) => number;

// ============================================================================
// Spring Presets
// ============================================================================

export const SpringPresets = {
  default: { tension: 170, friction: 26, mass: 1 },
  gentle: { tension: 120, friction: 14, mass: 1 },
  wobbly: { tension: 180, friction: 12, mass: 1 },
  stiff: { tension: 210, friction: 20, mass: 1 },
  slow: { tension: 280, friction: 60, mass: 1 },
  molasses: { tension: 280, friction: 120, mass: 1 },
  bounce: { tension: 400, friction: 10, mass: 1 },
  snappy: { tension: 400, friction: 30, mass: 1 }
} as const;

// ============================================================================
// Easing Functions
// ============================================================================

export const Easings = {
  // Linear
  linear: (t: number): number => t,
  
  // Quad
  easeInQuad: (t: number): number => t * t,
  easeOutQuad: (t: number): number => t * (2 - t),
  easeInOutQuad: (t: number): number =>
    t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  
  // Cubic
  easeInCubic: (t: number): number => t * t * t,
  easeOutCubic: (t: number): number => (--t) * t * t + 1,
  easeInOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  
  // Quart
  easeInQuart: (t: number): number => t * t * t * t,
  easeOutQuart: (t: number): number => 1 - (--t) * t * t * t,
  easeInOutQuart: (t: number): number =>
    t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
  
  // Expo
  easeInExpo: (t: number): number =>
    t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  easeOutExpo: (t: number): number =>
    t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: (t: number): number => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  
  // Back
  easeInBack: (t: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeOutBack: (t: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInOutBack: (t: number): number => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },
  
  // Elastic
  easeInElastic: (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1
      : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
  },
  easeOutElastic: (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  easeInOutElastic: (t: number): number => {
    const c5 = (2 * Math.PI) / 4.5;
    return t === 0 ? 0 : t === 1 ? 1 : t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
  },
  
  // Bounce
  easeOutBounce: (t: number): number => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  easeInBounce: (t: number): number =>
    1 - Easings.easeOutBounce(1 - t),
  easeInOutBounce: (t: number): number =>
    t < 0.5
      ? (1 - Easings.easeOutBounce(1 - 2 * t)) / 2
      : (1 + Easings.easeOutBounce(2 * t - 1)) / 2
} as const;

// ============================================================================
// Spring Animation
// ============================================================================

export class SpringAnimation {
  private value: AnimationValue;
  private config: SpringConfig;
  private frameId: number | null = null;
  private onUpdate?: (value: number) => void;
  private onComplete?: () => void;
  private isRunning = false;
  
  constructor(
    initialValue: number,
    config: Partial<SpringConfig> = {}
  ) {
    this.value = {
      current: initialValue,
      target: initialValue,
      velocity: config.velocity ?? 0
    };
    
    this.config = {
      tension: config.tension ?? SpringPresets.default.tension,
      friction: config.friction ?? SpringPresets.default.friction,
      mass: config.mass ?? SpringPresets.default.mass,
      precision: config.precision ?? 0.01
    };
  }
  
  /**
   * Animate to target value
   */
  to(target: number, options?: AnimationOptions): this {
    this.value.target = target;
    this.onUpdate = options?.onUpdate;
    this.onComplete = options?.onComplete;
    
    if (!this.isRunning) {
      options?.onStart?.();
      this.start();
    }
    
    return this;
  }
  
  /**
   * Set value immediately
   */
  set(value: number): this {
    this.stop();
    this.value.current = value;
    this.value.target = value;
    this.value.velocity = 0;
    return this;
  }
  
  /**
   * Get current value
   */
  get(): number {
    return this.value.current;
  }
  
  /**
   * Stop animation
   */
  stop(): this {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    this.isRunning = false;
    return this;
  }
  
  /**
   * Update spring config
   */
  configure(config: Partial<SpringConfig>): this {
    Object.assign(this.config, config);
    return this;
  }
  
  // ============================================================================
  // Private Methods
  // ============================================================================
  
  private start(): void {
    this.isRunning = true;
    let lastTime = performance.now();
    
    const tick = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.064); // Cap at ~15fps min
      lastTime = currentTime;
      
      const { tension, friction, mass, precision } = this.config;
      const { current, target, velocity } = this.value;
      
      // Spring physics (Hooke's law with damping)
      const springForce = -tension * (current - target);
      const dampingForce = -friction * velocity;
      const acceleration = (springForce + dampingForce) / mass;
      
      // Update velocity and position
      const newVelocity = velocity + acceleration * deltaTime;
      const newPosition = current + newVelocity * deltaTime;
      
      this.value.velocity = newVelocity;
      this.value.current = newPosition;
      
      // Notify listener
      this.onUpdate?.(newPosition);
      
      // Check if animation should stop
      const isAtRest =
        Math.abs(newVelocity) < precision! &&
        Math.abs(target - newPosition) < precision!;
      
      if (isAtRest) {
        this.value.current = target;
        this.value.velocity = 0;
        this.onUpdate?.(target);
        this.isRunning = false;
        this.onComplete?.();
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };
    
    this.frameId = requestAnimationFrame(tick);
  }
}

// ============================================================================
// Keyframe Animation
// ============================================================================

export class KeyframeAnimation {
  private config: KeyframeConfig;
  private startTime: number | null = null;
  private frameId: number | null = null;
  private onUpdate?: (value: number) => void;
  private onComplete?: () => void;
  private isRunning = false;
  private isPaused = false;
  private pausedTime = 0;
  private elapsedBeforePause = 0;
  
  constructor(config: KeyframeConfig) {
    this.config = {
      ...config,
      easing: config.easing ?? Easings.easeInOutCubic,
      times: config.times ?? this.generateEvenTimes(config.values.length)
    };
  }
  
  /**
   * Start animation
   */
  start(options?: AnimationOptions): this {
    this.onUpdate = options?.onUpdate;
    this.onComplete = options?.onComplete;
    this.isPaused = false;
    this.elapsedBeforePause = 0;
    
    if (!this.isRunning) {
      options?.onStart?.();
      this.run();
    }
    
    return this;
  }
  
  /**
   * Pause animation
   */
  pause(): this {
    if (this.isRunning && !this.isPaused) {
      this.isPaused = true;
      this.pausedTime = performance.now();
      
      if (this.frameId !== null) {
        cancelAnimationFrame(this.frameId);
        this.frameId = null;
      }
    }
    return this;
  }
  
  /**
   * Resume animation
   */
  resume(): this {
    if (this.isPaused) {
      this.isPaused = false;
      this.elapsedBeforePause += this.pausedTime - (this.startTime || this.pausedTime);
      this.run();
    }
    return this;
  }
  
  /**
   * Stop animation
   */
  stop(): this {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    this.isRunning = false;
    this.startTime = null;
    return this;
  }
  
  // ============================================================================
  // Private Methods
  // ============================================================================
  
  private run(): void {
    this.isRunning = true;
    this.startTime = performance.now();
    
    const tick = (currentTime: number) => {
      const elapsed = currentTime - this.startTime! + this.elapsedBeforePause;
      const progress = Math.min(elapsed / this.config.duration, 1);
      
      // Apply easing
      const easedProgress = this.config.easing!(progress);
      
      // Interpolate value
      const value = this.interpolate(easedProgress);
      
      this.onUpdate?.(value);
      
      if (progress < 1) {
        this.frameId = requestAnimationFrame(tick);
      } else {
        this.isRunning = false;
        this.onComplete?.();
      }
    };
    
    this.frameId = requestAnimationFrame(tick);
  }
  
  private interpolate(progress: number): number {
    const { values, times } = this.config;
    
    // Find segment
    let segmentIndex = 0;
    for (let i = 0; i < times!.length - 1; i++) {
      if (progress >= times![i] && progress <= times![i + 1]) {
        segmentIndex = i;
        break;
      }
    }
    
    // Calculate segment progress
    const segmentStart = times![segmentIndex];
    const segmentEnd = times![segmentIndex + 1];
    const segmentProgress = (progress - segmentStart) / (segmentEnd - segmentStart);
    
    // Linear interpolation between keyframes
    const startValue = values[segmentIndex];
    const endValue = values[segmentIndex + 1];
    
    return startValue + (endValue - startValue) * segmentProgress;
  }
  
  private generateEvenTimes(count: number): number[] {
    const times: number[] = [];
    for (let i = 0; i < count; i++) {
      times.push(i / (count - 1));
    }
    return times;
  }
}

// ============================================================================
// Animation Orchestrator
// ============================================================================

export class AnimationOrchestrator {
  private animations: Map<string, SpringAnimation | KeyframeAnimation> = new Map();
  
  /**
   * Add animation
   */
  add(
    id: string,
    animation: SpringAnimation | KeyframeAnimation
  ): this {
    this.animations.set(id, animation);
    return this;
  }
  
  /**
   * Get animation by ID
   */
  get(id: string): SpringAnimation | KeyframeAnimation | undefined {
    return this.animations.get(id);
  }
  
  /**
   * Run animations in sequence
   */
  async sequence(
    ids: string[],
    factory: (id: string) => Promise<void>
  ): Promise<void> {
    for (const id of ids) {
      await factory(id);
    }
  }
  
  /**
   * Run animations in parallel
   */
  async parallel(
    ids: string[],
    factory: (id: string) => Promise<void>
  ): Promise<void> {
    await Promise.all(ids.map(factory));
  }
  
  /**
   * Stagger animations
   */
  stagger(
    count: number,
    delay: number,
    factory: (index: number, delayMs: number) => void
  ): void {
    for (let i = 0; i < count; i++) {
      const delayMs = i * delay;
      setTimeout(() => factory(i, delayMs), delayMs);
    }
  }
  
  /**
   * Stop all animations
   */
  stopAll(): this {
    this.animations.forEach(animation => animation.stop());
    return this;
  }
  
  /**
   * Clear all animations
   */
  clear(): this {
    this.stopAll();
    this.animations.clear();
    return this;
  }
}

// ============================================================================
// Gesture Handler
// ============================================================================

export class GestureHandler {
  private element: HTMLElement | null = null;
  private state: GestureState = this.createInitialState();
  private listeners: Set<(state: GestureState) => void> = new Set();
  private lastUpdateTime = 0;
  private positions: Array<{ x: number; y: number; time: number }> = [];
  
  /**
   * Attach to element
   */
  attach(element: HTMLElement): () => void {
    this.element = element;
    
    const handleMouseDown = (e: MouseEvent) => this.onStart(e.clientX, e.clientY);
    const handleMouseMove = (e: MouseEvent) => this.onMove(e.clientX, e.clientY);
    const handleMouseUp = () => this.onEnd();
    
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      this.onStart(touch.clientX, touch.clientY);
    };
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      this.onMove(touch.clientX, touch.clientY);
    };
    const handleTouchEnd = () => this.onEnd();
    
    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }
  
  /**
   * Subscribe to gesture updates
   */
  subscribe(listener: (state: GestureState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  /**
   * Get current state
   */
  getState(): GestureState {
    return { ...this.state };
  }
  
  // ============================================================================
  // Private Methods
  // ============================================================================
  
  private onStart(x: number, y: number): void {
    this.state = {
      x,
      y,
      velocityX: 0,
      velocityY: 0,
      isDragging: true,
      startX: x,
      startY: y,
      deltaX: 0,
      deltaY: 0
    };
    
    this.positions = [{ x, y, time: performance.now() }];
    this.notify();
  }
  
  private onMove(x: number, y: number): void {
    if (!this.state.isDragging) return;
    
    const now = performance.now();
    this.positions.push({ x, y, time: now });
    
    // Keep only recent positions for velocity calculation
    if (this.positions.length > 5) {
      this.positions.shift();
    }
    
    // Calculate velocity
    const { velocityX, velocityY } = this.calculateVelocity();
    
    this.state = {
      ...this.state,
      x,
      y,
      velocityX,
      velocityY,
      deltaX: x - this.state.startX,
      deltaY: y - this.state.startY
    };
    
    this.lastUpdateTime = now;
    this.notify();
  }
  
  private onEnd(): void {
    if (!this.state.isDragging) return;
    
    const { velocityX, velocityY } = this.calculateVelocity();
    
    this.state = {
      ...this.state,
      isDragging: false,
      velocityX,
      velocityY
    };
    
    this.notify();
  }
  
  private calculateVelocity(): { velocityX: number; velocityY: number } {
    if (this.positions.length < 2) {
      return { velocityX: 0, velocityY: 0 };
    }
    
    const first = this.positions[0];
    const last = this.positions[this.positions.length - 1];
    const timeDiff = (last.time - first.time) / 1000; // Convert to seconds
    
    if (timeDiff === 0) {
      return { velocityX: 0, velocityY: 0 };
    }
    
    return {
      velocityX: (last.x - first.x) / timeDiff,
      velocityY: (last.y - first.y) / timeDiff
    };
  }
  
  private notify(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('[GestureHandler] Listener error:', error);
      }
    });
  }
  
  private createInitialState(): GestureState {
    return {
      x: 0,
      y: 0,
      velocityX: 0,
      velocityY: 0,
      isDragging: false,
      startX: 0,
      startY: 0,
      deltaX: 0,
      deltaY: 0
    };
  }
}

// ============================================================================
// Animation Utilities
// ============================================================================

/**
 * Interpolate between values
 */
export function interpolate(
  value: number,
  inputRange: [number, number],
  outputRange: [number, number],
  options?: { extrapolate?: 'clamp' | 'extend' }
): number {
  const [inputMin, inputMax] = inputRange;
  const [outputMin, outputMax] = outputRange;
  
  let result = outputMin + ((value - inputMin) / (inputMax - inputMin)) * (outputMax - outputMin);
  
  if (options?.extrapolate === 'clamp') {
    result = Math.min(Math.max(result, Math.min(outputMin, outputMax)), Math.max(outputMin, outputMax));
  }
  
  return result;
}

/**
 * Color interpolation
 */
export function interpolateColor(
  progress: number,
  startColor: string,
  endColor: string
): string {
  const start = parseColor(startColor);
  const end = parseColor(endColor);
  
  const r = Math.round(start.r + (end.r - start.r) * progress);
  const g = Math.round(start.g + (end.g - start.g) * progress);
  const b = Math.round(start.b + (end.b - start.b) * progress);
  const a = start.a + (end.a - start.a) * progress;
  
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function parseColor(color: string): { r: number; g: number; b: number; a: number } {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }
  
  // Handle rgb/rgba
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match) {
    return {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3]),
      a: match[4] ? parseFloat(match[4]) : 1
    };
  }
  
  // Default to black
  return { r: 0, g: 0, b: 0, a: 1 };
}

/**
 * Create animation frame loop
 */
export function createAnimationLoop(
  callback: (deltaTime: number) => boolean // Return false to stop
): () => void {
  let lastTime = performance.now();
  let frameId: number | null = null;
  let isRunning = true;
  
  const tick = (currentTime: number) => {
    if (!isRunning) return;
    
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    
    const shouldContinue = callback(deltaTime);
    
    if (shouldContinue) {
      frameId = requestAnimationFrame(tick);
    }
  };
  
  frameId = requestAnimationFrame(tick);
  
  return () => {
    isRunning = false;
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
    }
  };
}

/**
 * Decay animation (momentum-based)
 */
export function decay(
  initialValue: number,
  velocity: number,
  options?: {
    deceleration?: number;
    onUpdate?: (value: number) => void;
    onComplete?: () => void;
  }
): () => void {
  const deceleration = options?.deceleration ?? 0.998;
  let value = initialValue;
  let currentVelocity = velocity;
  
  return createAnimationLoop((deltaTime) => {
    currentVelocity *= Math.pow(deceleration, deltaTime * 60);
    value += currentVelocity * deltaTime;
    
    options?.onUpdate?.(value);
    
    if (Math.abs(currentVelocity) < 0.1) {
      options?.onComplete?.();
      return false;
    }
    
    return true;
  });
}

export default {
  SpringAnimation,
  KeyframeAnimation,
  AnimationOrchestrator,
  GestureHandler,
  SpringPresets,
  Easings,
  interpolate,
  interpolateColor,
  createAnimationLoop,
  decay
};
