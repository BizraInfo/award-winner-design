/**
 * WebGL Context Manager - Elite 3D Performance Optimization
 * 
 * Implements:
 * - Context pooling and reuse
 * - Automatic context loss recovery
 * - Memory pressure monitoring
 * - GPU capability detection
 * - Adaptive quality settings
 * 
 * @module lib/webgl/context-manager
 */

// GPU capability tiers for adaptive rendering
export enum GPUTier {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra',
}

// Quality preset configurations
export interface QualityPreset {
  maxInstances: number;
  shadowMapSize: number;
  antialias: boolean;
  pixelRatio: number;
  lodDistances: { high: number; medium: number; low: number };
  postProcessing: boolean;
  particleCount: number;
}

// Quality presets per GPU tier
export const QUALITY_PRESETS: Record<GPUTier, QualityPreset> = {
  [GPUTier.LOW]: {
    maxInstances: 5000,
    shadowMapSize: 512,
    antialias: false,
    pixelRatio: 1,
    lodDistances: { high: 30, medium: 60, low: 100 },
    postProcessing: false,
    particleCount: 1000,
  },
  [GPUTier.MEDIUM]: {
    maxInstances: 10000,
    shadowMapSize: 1024,
    antialias: true,
    pixelRatio: 1.5,
    lodDistances: { high: 50, medium: 100, low: 150 },
    postProcessing: true,
    particleCount: 5000,
  },
  [GPUTier.HIGH]: {
    maxInstances: 20000,
    shadowMapSize: 2048,
    antialias: true,
    pixelRatio: 2,
    lodDistances: { high: 75, medium: 150, low: 250 },
    postProcessing: true,
    particleCount: 15000,
  },
  [GPUTier.ULTRA]: {
    maxInstances: 50000,
    shadowMapSize: 4096,
    antialias: true,
    pixelRatio: window.devicePixelRatio || 2,
    lodDistances: { high: 100, medium: 200, low: 400 },
    postProcessing: true,
    particleCount: 50000,
  },
};

// Context state for recovery
interface ContextState {
  id: string;
  canvas: HTMLCanvasElement | OffscreenCanvas;
  gl: WebGLRenderingContext | WebGL2RenderingContext | null;
  tier: GPUTier;
  preset: QualityPreset;
  isLost: boolean;
  lostCount: number;
  lastRestoreAttempt: number;
  extensions: Map<string, unknown>;
}

/**
 * Singleton WebGL Context Manager
 * Handles context lifecycle, pooling, and recovery
 */
class WebGLContextManager {
  private static instance: WebGLContextManager;
  private contexts: Map<string, ContextState> = new Map();
  private memoryPressure: number = 0;
  private lastMemoryCheck: number = 0;
  private gpuTier: GPUTier = GPUTier.MEDIUM;
  private isInitialized: boolean = false;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): WebGLContextManager {
    if (!WebGLContextManager.instance) {
      WebGLContextManager.instance = new WebGLContextManager();
    }
    return WebGLContextManager.instance;
  }

  /**
   * Initialize the context manager and detect GPU capabilities
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.gpuTier = await this.detectGPUTier();
    this.setupMemoryMonitoring();
    this.isInitialized = true;

    console.log(`[WebGL] Initialized with GPU tier: ${this.gpuTier}`);
  }

  /**
   * Detect GPU capabilities and determine rendering tier
   */
  private async detectGPUTier(): Promise<GPUTier> {
    // Try WebGPU first for modern detection
    if ('gpu' in navigator) {
      try {
        const adapter = await (navigator as any).gpu?.requestAdapter();
        if (adapter) {
          const info = await adapter.requestAdapterInfo?.();
          if (info) {
            return this.classifyGPU(info.vendor, info.architecture);
          }
        }
      } catch {
        // WebGPU not available or failed
      }
    }

    // Fallback to WebGL-based detection
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!gl) {
      console.warn('[WebGL] WebGL not supported, falling back to LOW tier');
      return GPUTier.LOW;
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      
      // Clean up test context
      const loseContext = gl.getExtension('WEBGL_lose_context');
      loseContext?.loseContext();
      
      return this.classifyGPUFromRenderer(vendor, renderer);
    }

    // Use performance heuristics as fallback
    return this.detectTierFromBenchmark(gl);
  }

  /**
   * Classify GPU tier based on WebGPU adapter info
   */
  private classifyGPU(vendor: string, architecture: string): GPUTier {
    const vendorLower = vendor?.toLowerCase() || '';
    const archLower = architecture?.toLowerCase() || '';

    // NVIDIA
    if (vendorLower.includes('nvidia')) {
      if (archLower.includes('4090') || archLower.includes('4080') || archLower.includes('3090')) {
        return GPUTier.ULTRA;
      }
      if (archLower.includes('30') || archLower.includes('20')) {
        return GPUTier.HIGH;
      }
      return GPUTier.MEDIUM;
    }

    // AMD
    if (vendorLower.includes('amd') || vendorLower.includes('ati')) {
      if (archLower.includes('7900') || archLower.includes('6900')) {
        return GPUTier.ULTRA;
      }
      if (archLower.includes('6800') || archLower.includes('6700')) {
        return GPUTier.HIGH;
      }
      return GPUTier.MEDIUM;
    }

    // Apple Silicon
    if (vendorLower.includes('apple')) {
      if (archLower.includes('m2') || archLower.includes('m3')) {
        return GPUTier.HIGH;
      }
      return GPUTier.MEDIUM;
    }

    // Intel integrated
    if (vendorLower.includes('intel')) {
      return GPUTier.LOW;
    }

    return GPUTier.MEDIUM;
  }

  /**
   * Classify GPU from WebGL renderer string
   */
  private classifyGPUFromRenderer(vendor: string, renderer: string): GPUTier {
    const rendererLower = renderer.toLowerCase();

    // High-end discrete GPUs
    if (
      rendererLower.includes('rtx 40') ||
      rendererLower.includes('rtx 30') ||
      rendererLower.includes('rx 79') ||
      rendererLower.includes('rx 69')
    ) {
      return GPUTier.ULTRA;
    }

    if (
      rendererLower.includes('rtx 20') ||
      rendererLower.includes('gtx 10') ||
      rendererLower.includes('rx 68') ||
      rendererLower.includes('rx 67')
    ) {
      return GPUTier.HIGH;
    }

    // Mobile/integrated
    if (
      rendererLower.includes('intel') ||
      rendererLower.includes('mali') ||
      rendererLower.includes('adreno')
    ) {
      return GPUTier.LOW;
    }

    // Apple
    if (rendererLower.includes('apple')) {
      if (rendererLower.includes('m2') || rendererLower.includes('m3')) {
        return GPUTier.HIGH;
      }
      return GPUTier.MEDIUM;
    }

    return GPUTier.MEDIUM;
  }

  /**
   * Benchmark-based tier detection
   */
  private detectTierFromBenchmark(gl: WebGLRenderingContext | WebGL2RenderingContext): GPUTier {
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
    const maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);

    // Score based on capabilities
    let score = 0;
    if (maxTextureSize >= 16384) score += 3;
    else if (maxTextureSize >= 8192) score += 2;
    else if (maxTextureSize >= 4096) score += 1;

    if (maxVertexAttribs >= 32) score += 2;
    else if (maxVertexAttribs >= 16) score += 1;

    if (maxRenderbufferSize >= 16384) score += 2;
    else if (maxRenderbufferSize >= 8192) score += 1;

    // WebGL2 gives bonus
    if (gl instanceof WebGL2RenderingContext) score += 2;

    if (score >= 8) return GPUTier.ULTRA;
    if (score >= 6) return GPUTier.HIGH;
    if (score >= 3) return GPUTier.MEDIUM;
    return GPUTier.LOW;
  }

  /**
   * Setup memory pressure monitoring
   */
  private setupMemoryMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Monitor memory if available
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        
        if (usedRatio > 0.9) {
          this.memoryPressure = 3; // Critical
        } else if (usedRatio > 0.75) {
          this.memoryPressure = 2; // High
        } else if (usedRatio > 0.5) {
          this.memoryPressure = 1; // Moderate
        } else {
          this.memoryPressure = 0; // Low
        }
      }
      this.lastMemoryCheck = performance.now();
    };

    // Check every 5 seconds
    setInterval(checkMemory, 5000);
    checkMemory();
  }

  /**
   * Create or retrieve a WebGL context
   */
  createContext(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    id: string,
    options?: WebGLContextAttributes
  ): WebGLRenderingContext | WebGL2RenderingContext | null {
    // Check for existing context
    const existing = this.contexts.get(id);
    if (existing && !existing.isLost && existing.gl) {
      return existing.gl;
    }

    const preset = QUALITY_PRESETS[this.gpuTier];
    const contextOptions: WebGLContextAttributes = {
      alpha: false,
      antialias: preset.antialias,
      depth: true,
      failIfMajorPerformanceCaveat: false,
      powerPreference: this.memoryPressure > 1 ? 'low-power' : 'high-performance',
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      stencil: false,
      ...options,
    };

    // Try WebGL2 first, fallback to WebGL1
    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = 
      canvas.getContext('webgl2', contextOptions) as WebGL2RenderingContext | null;
    if (!gl) {
      gl = canvas.getContext('webgl', contextOptions) as WebGLRenderingContext | null;
    }

    if (!gl) {
      console.error('[WebGL] Failed to create context');
      return null;
    }

    // Setup context loss handling
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.handleContextLost(id);
    });

    canvas.addEventListener('webglcontextrestored', () => {
      this.handleContextRestored(id);
    });

    // Store context state
    const state: ContextState = {
      id,
      canvas,
      gl,
      tier: this.gpuTier,
      preset,
      isLost: false,
      lostCount: 0,
      lastRestoreAttempt: 0,
      extensions: new Map(),
    };

    this.contexts.set(id, state);
    this.loadCommonExtensions(state);

    return gl;
  }

  /**
   * Load commonly used extensions
   */
  private loadCommonExtensions(state: ContextState): void {
    const { gl } = state;
    if (!gl) return;

    const extensions = [
      'OES_texture_float',
      'OES_texture_float_linear',
      'OES_texture_half_float',
      'OES_texture_half_float_linear',
      'WEBGL_compressed_texture_s3tc',
      'WEBGL_compressed_texture_astc',
      'EXT_texture_filter_anisotropic',
      'OES_vertex_array_object',
      'ANGLE_instanced_arrays',
      'OES_element_index_uint',
    ];

    for (const name of extensions) {
      const ext = gl.getExtension(name);
      if (ext) {
        state.extensions.set(name, ext);
      }
    }
  }

  /**
   * Handle WebGL context loss
   */
  private handleContextLost(id: string): void {
    const state = this.contexts.get(id);
    if (!state) return;

    console.warn(`[WebGL] Context lost: ${id}`);
    state.isLost = true;
    state.lostCount++;

    // Emit event for application handling
    window.dispatchEvent(new CustomEvent('webgl-context-lost', { detail: { id } }));
  }

  /**
   * Handle WebGL context restoration
   */
  private handleContextRestored(id: string): void {
    const state = this.contexts.get(id);
    if (!state) return;

    console.log(`[WebGL] Context restored: ${id}`);
    state.isLost = false;
    state.lastRestoreAttempt = performance.now();

    // Reload extensions
    this.loadCommonExtensions(state);

    // Emit event for application handling
    window.dispatchEvent(new CustomEvent('webgl-context-restored', { detail: { id } }));
  }

  /**
   * Get current quality preset based on GPU tier and memory pressure
   */
  getQualityPreset(): QualityPreset {
    let effectiveTier = this.gpuTier;

    // Downgrade if memory pressure is high
    if (this.memoryPressure >= 3 && effectiveTier !== GPUTier.LOW) {
      effectiveTier = GPUTier.LOW;
    } else if (this.memoryPressure >= 2) {
      if (effectiveTier === GPUTier.ULTRA) effectiveTier = GPUTier.HIGH;
      else if (effectiveTier === GPUTier.HIGH) effectiveTier = GPUTier.MEDIUM;
    }

    return QUALITY_PRESETS[effectiveTier];
  }

  /**
   * Get current GPU tier
   */
  getGPUTier(): GPUTier {
    return this.gpuTier;
  }

  /**
   * Get memory pressure level (0-3)
   */
  getMemoryPressure(): number {
    return this.memoryPressure;
  }

  /**
   * Check if a context is valid
   */
  isContextValid(id: string): boolean {
    const state = this.contexts.get(id);
    return state ? !state.isLost && state.gl !== null : false;
  }

  /**
   * Dispose of a context
   */
  disposeContext(id: string): void {
    const state = this.contexts.get(id);
    if (!state) return;

    if (state.gl) {
      const loseContext = state.gl.getExtension('WEBGL_lose_context');
      loseContext?.loseContext();
    }

    this.contexts.delete(id);
    console.log(`[WebGL] Context disposed: ${id}`);
  }

  /**
   * Get statistics about all contexts
   */
  getStats(): {
    totalContexts: number;
    activeContexts: number;
    lostContexts: number;
    gpuTier: GPUTier;
    memoryPressure: number;
  } {
    let active = 0;
    let lost = 0;

    for (const state of this.contexts.values()) {
      if (state.isLost) lost++;
      else active++;
    }

    return {
      totalContexts: this.contexts.size,
      activeContexts: active,
      lostContexts: lost,
      gpuTier: this.gpuTier,
      memoryPressure: this.memoryPressure,
    };
  }
}

// Export singleton instance
export const webglManager = WebGLContextManager.getInstance();

// React hook for WebGL context management
export function useWebGLContext(canvasRef: React.RefObject<HTMLCanvasElement>, id: string) {
  const [isReady, setIsReady] = React.useState(false);
  const [isLost, setIsLost] = React.useState(false);
  const [preset, setPreset] = React.useState<QualityPreset>(QUALITY_PRESETS[GPUTier.MEDIUM]);

  React.useEffect(() => {
    const init = async () => {
      await webglManager.initialize();
      setPreset(webglManager.getQualityPreset());
      setIsReady(true);
    };
    init();
  }, []);

  React.useEffect(() => {
    const handleLost = (e: CustomEvent) => {
      if (e.detail.id === id) setIsLost(true);
    };
    const handleRestored = (e: CustomEvent) => {
      if (e.detail.id === id) {
        setIsLost(false);
        setPreset(webglManager.getQualityPreset());
      }
    };

    window.addEventListener('webgl-context-lost', handleLost as EventListener);
    window.addEventListener('webgl-context-restored', handleRestored as EventListener);

    return () => {
      window.removeEventListener('webgl-context-lost', handleLost as EventListener);
      window.removeEventListener('webgl-context-restored', handleRestored as EventListener);
    };
  }, [id]);

  const createContext = React.useCallback((options?: WebGLContextAttributes) => {
    if (!canvasRef.current) return null;
    return webglManager.createContext(canvasRef.current, id, options);
  }, [canvasRef, id]);

  return {
    isReady,
    isLost,
    preset,
    createContext,
    gpuTier: webglManager.getGPUTier(),
    memoryPressure: webglManager.getMemoryPressure(),
    disposeContext: () => webglManager.disposeContext(id),
  };
}

// Import React for hook
import React from 'react';
