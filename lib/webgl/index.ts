/**
 * WebGL Performance Optimization Utilities
 * 
 * Elite 3D rendering optimization for BIZRA Genesis
 * 
 * @module lib/webgl
 */

// Context Management
export {
  webglManager,
  GPUTier,
  QUALITY_PRESETS,
  useWebGLContext,
  type QualityPreset,
} from './context-manager';

// Three.js Optimization
export {
  GeometryBatcher,
  TextureAtlasManager,
  AdaptiveRenderer,
  InstancedLODManager,
  MaterialPool,
  geometryBatcher,
  textureAtlasManager,
  adaptiveRenderer,
  materialPool,
} from './three-optimizer';
