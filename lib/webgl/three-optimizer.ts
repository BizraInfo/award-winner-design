/**
 * Three.js Performance Optimizer
 * 
 * Elite optimization utilities for Three.js rendering:
 * - Geometry merging and batching
 * - Texture atlasing
 * - Draw call reduction
 * - Memory-efficient instancing
 * - Adaptive frame budget
 * 
 * @module lib/webgl/three-optimizer
 */

import * as THREE from 'three';
import { webglManager, GPUTier, QualityPreset } from './context-manager';

// Frame budget configuration (target 60fps = 16.67ms per frame)
const FRAME_BUDGETS = {
  rendering: 8, // ms for actual rendering
  physics: 2,   // ms for physics updates
  logic: 2,     // ms for game logic
  culling: 1,   // ms for frustum culling
  buffer: 3.67, // ms headroom
};

/**
 * Geometry batching for static meshes
 */
export class GeometryBatcher {
  private batches: Map<string, THREE.BufferGeometry> = new Map();
  private materials: Map<string, THREE.Material> = new Map();

  /**
   * Create a batch key from material properties
   */
  private getBatchKey(material: THREE.Material): string {
    if (material instanceof THREE.MeshStandardMaterial) {
      return `std_${material.color.getHexString()}_${material.roughness}_${material.metalness}`;
    }
    if (material instanceof THREE.MeshBasicMaterial) {
      return `basic_${material.color.getHexString()}`;
    }
    return `other_${material.uuid}`;
  }

  /**
   * Add geometry to batch
   */
  addToBatch(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    transform: THREE.Matrix4
  ): void {
    const key = this.getBatchKey(material);

    // Clone and transform geometry
    const clonedGeom = geometry.clone();
    clonedGeom.applyMatrix4(transform);

    if (!this.batches.has(key)) {
      this.batches.set(key, clonedGeom);
      this.materials.set(key, material);
    } else {
      // Merge geometries
      const existing = this.batches.get(key)!;
      const merged = this.mergeGeometries([existing, clonedGeom]);
      if (merged) {
        existing.dispose();
        this.batches.set(key, merged);
      }
    }
  }

  /**
   * Merge multiple geometries into one
   */
  private mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
    if (geometries.length === 0) return null;
    if (geometries.length === 1) return geometries[0].clone();

    // Calculate total vertex count
    let totalVertices = 0;
    let totalIndices = 0;
    let hasNormals = true;
    let hasUVs = true;

    for (const geom of geometries) {
      const positions = geom.getAttribute('position');
      if (positions) totalVertices += positions.count;
      
      const indices = geom.getIndex();
      if (indices) totalIndices += indices.count;
      
      if (!geom.getAttribute('normal')) hasNormals = false;
      if (!geom.getAttribute('uv')) hasUVs = false;
    }

    // Create merged arrays
    const positions = new Float32Array(totalVertices * 3);
    const normals = hasNormals ? new Float32Array(totalVertices * 3) : null;
    const uvs = hasUVs ? new Float32Array(totalVertices * 2) : null;
    const indices = totalIndices > 0 ? new Uint32Array(totalIndices) : null;

    let vertexOffset = 0;
    let indexOffset = 0;
    let indexVertexOffset = 0;

    for (const geom of geometries) {
      const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
      positions.set(posAttr.array as Float32Array, vertexOffset * 3);

      if (hasNormals && normals) {
        const normAttr = geom.getAttribute('normal') as THREE.BufferAttribute;
        if (normAttr) normals.set(normAttr.array as Float32Array, vertexOffset * 3);
      }

      if (hasUVs && uvs) {
        const uvAttr = geom.getAttribute('uv') as THREE.BufferAttribute;
        if (uvAttr) uvs.set(uvAttr.array as Float32Array, vertexOffset * 2);
      }

      const geomIndices = geom.getIndex();
      if (indices && geomIndices) {
        const arr = geomIndices.array;
        for (let i = 0; i < arr.length; i++) {
          indices[indexOffset + i] = arr[i] + indexVertexOffset;
        }
        indexOffset += arr.length;
      }

      indexVertexOffset += posAttr.count;
      vertexOffset += posAttr.count;
    }

    // Create merged geometry
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    if (normals) merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    if (uvs) merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    if (indices) merged.setIndex(new THREE.BufferAttribute(indices, 1));

    return merged;
  }

  /**
   * Create meshes from batches
   */
  createMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];

    for (const [key, geometry] of this.batches) {
      const material = this.materials.get(key);
      if (material) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = `batch_${key}`;
        meshes.push(mesh);
      }
    }

    return meshes;
  }

  /**
   * Dispose all batched geometries
   */
  dispose(): void {
    for (const geometry of this.batches.values()) {
      geometry.dispose();
    }
    this.batches.clear();
    this.materials.clear();
  }
}

/**
 * Texture atlas manager for reducing texture switches
 */
export class TextureAtlasManager {
  private atlases: Map<string, THREE.Texture> = new Map();
  private uvMappings: Map<string, { u: number; v: number; width: number; height: number }> = new Map();
  private atlasSize: number;

  constructor(atlasSize = 2048) {
    this.atlasSize = atlasSize;
  }

  /**
   * Create atlas from multiple textures
   */
  async createAtlas(
    textures: Map<string, THREE.Texture>,
    atlasId: string
  ): Promise<THREE.Texture | null> {
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = this.atlasSize;
    canvas.height = this.atlasSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Simple grid packing
    const textureCount = textures.size;
    const gridSize = Math.ceil(Math.sqrt(textureCount));
    const cellSize = this.atlasSize / gridSize;

    let index = 0;
    for (const [id, texture] of textures) {
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;
      const x = col * cellSize;
      const y = row * cellSize;

      // Draw texture to canvas
      if (texture.image) {
        ctx.drawImage(texture.image, x, y, cellSize, cellSize);
      }

      // Store UV mapping
      this.uvMappings.set(id, {
        u: x / this.atlasSize,
        v: y / this.atlasSize,
        width: cellSize / this.atlasSize,
        height: cellSize / this.atlasSize,
      });

      index++;
    }

    // Create atlas texture
    const atlasTexture = new THREE.CanvasTexture(canvas);
    atlasTexture.needsUpdate = true;
    atlasTexture.generateMipmaps = true;
    atlasTexture.minFilter = THREE.LinearMipmapLinearFilter;
    atlasTexture.magFilter = THREE.LinearFilter;

    this.atlases.set(atlasId, atlasTexture);
    return atlasTexture;
  }

  /**
   * Get UV coordinates for a texture in the atlas
   */
  getUVMapping(textureId: string) {
    return this.uvMappings.get(textureId);
  }

  /**
   * Get atlas texture
   */
  getAtlas(atlasId: string): THREE.Texture | undefined {
    return this.atlases.get(atlasId);
  }

  /**
   * Dispose all atlases
   */
  dispose(): void {
    for (const atlas of this.atlases.values()) {
      atlas.dispose();
    }
    this.atlases.clear();
    this.uvMappings.clear();
  }
}

/**
 * Adaptive rendering controller
 */
export class AdaptiveRenderer {
  private targetFPS: number;
  private frameHistory: number[] = [];
  private lastFrameTime: number = 0;
  private currentQuality: number = 1.0;
  private readonly QUALITY_STEP = 0.1;
  private readonly MIN_QUALITY = 0.3;
  private readonly MAX_QUALITY = 1.0;
  private readonly HISTORY_SIZE = 60;

  constructor(targetFPS = 60) {
    this.targetFPS = targetFPS;
  }

  /**
   * Record frame time and adjust quality
   */
  recordFrame(frameTime: number): void {
    this.frameHistory.push(frameTime);
    if (this.frameHistory.length > this.HISTORY_SIZE) {
      this.frameHistory.shift();
    }

    // Calculate average FPS
    const avgFrameTime = this.frameHistory.reduce((a, b) => a + b, 0) / this.frameHistory.length;
    const avgFPS = 1000 / avgFrameTime;

    // Adjust quality based on performance
    if (avgFPS < this.targetFPS * 0.9) {
      // Reduce quality if below 90% of target
      this.currentQuality = Math.max(this.MIN_QUALITY, this.currentQuality - this.QUALITY_STEP);
    } else if (avgFPS > this.targetFPS * 0.95 && this.currentQuality < this.MAX_QUALITY) {
      // Increase quality if above 95% of target
      this.currentQuality = Math.min(this.MAX_QUALITY, this.currentQuality + this.QUALITY_STEP * 0.5);
    }

    this.lastFrameTime = frameTime;
  }

  /**
   * Get current quality multiplier (0.3 - 1.0)
   */
  getQuality(): number {
    return this.currentQuality;
  }

  /**
   * Get render scale based on quality
   */
  getRenderScale(): number {
    return Math.sqrt(this.currentQuality); // Square root for pixel count
  }

  /**
   * Get instance count multiplier
   */
  getInstanceMultiplier(): number {
    return this.currentQuality;
  }

  /**
   * Get LOD bias (negative = use lower detail)
   */
  getLODBias(): number {
    return (1 - this.currentQuality) * 2; // 0 to 1.4 bias
  }

  /**
   * Check if we're within frame budget
   */
  isWithinBudget(budgetMs: number = FRAME_BUDGETS.rendering): boolean {
    return this.lastFrameTime < budgetMs;
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    const avgFrameTime = this.frameHistory.length > 0
      ? this.frameHistory.reduce((a, b) => a + b, 0) / this.frameHistory.length
      : 0;

    return {
      avgFPS: avgFrameTime > 0 ? 1000 / avgFrameTime : 0,
      avgFrameTime,
      quality: this.currentQuality,
      renderScale: this.getRenderScale(),
      lastFrameTime: this.lastFrameTime,
    };
  }

  /**
   * Reset to default quality
   */
  reset(): void {
    this.currentQuality = 1.0;
    this.frameHistory = [];
  }
}

/**
 * Efficient instanced mesh manager with LOD
 */
export class InstancedLODManager<T extends { position: THREE.Vector3; scale: number }> {
  private instancedMeshes: Map<number, THREE.InstancedMesh> = new Map();
  private lodDistances: number[];
  private lodGeometries: THREE.BufferGeometry[];
  private material: THREE.Material;
  private maxInstances: number;
  private dummy = new THREE.Object3D();
  private instanceCounts: Map<number, number> = new Map();

  constructor(
    lodGeometries: THREE.BufferGeometry[],
    material: THREE.Material,
    lodDistances: number[],
    maxInstances: number
  ) {
    this.lodGeometries = lodGeometries;
    this.material = material;
    this.lodDistances = lodDistances;
    this.maxInstances = maxInstances;

    // Create instanced mesh for each LOD level
    for (let i = 0; i < lodGeometries.length; i++) {
      const mesh = new THREE.InstancedMesh(lodGeometries[i], material, maxInstances);
      mesh.count = 0;
      mesh.frustumCulled = false; // We do our own culling
      this.instancedMeshes.set(i, mesh);
      this.instanceCounts.set(i, 0);
    }
  }

  /**
   * Update instances based on camera position
   */
  updateInstances(
    instances: T[],
    camera: THREE.Camera,
    frustum: THREE.Frustum,
    qualityMultiplier: number = 1.0
  ): void {
    // Reset counts
    for (const [lod] of this.instanceCounts) {
      this.instanceCounts.set(lod, 0);
    }

    const cameraPosition = camera.position;
    const effectiveMaxInstances = Math.floor(this.maxInstances * qualityMultiplier);

    for (let i = 0; i < Math.min(instances.length, effectiveMaxInstances); i++) {
      const instance = instances[i];
      
      // Frustum culling
      if (!frustum.containsPoint(instance.position)) continue;

      // Calculate LOD level based on distance
      const distance = instance.position.distanceTo(cameraPosition);
      let lodLevel = this.lodDistances.length - 1;
      
      for (let l = 0; l < this.lodDistances.length; l++) {
        if (distance < this.lodDistances[l]) {
          lodLevel = l;
          break;
        }
      }

      // Get current count for this LOD
      const count = this.instanceCounts.get(lodLevel) || 0;
      if (count >= effectiveMaxInstances) continue;

      // Set instance matrix
      this.dummy.position.copy(instance.position);
      this.dummy.scale.setScalar(instance.scale);
      this.dummy.updateMatrix();

      const mesh = this.instancedMeshes.get(lodLevel);
      if (mesh) {
        mesh.setMatrixAt(count, this.dummy.matrix);
        this.instanceCounts.set(lodLevel, count + 1);
      }
    }

    // Update instance counts and matrices
    for (const [lod, mesh] of this.instancedMeshes) {
      const count = this.instanceCounts.get(lod) || 0;
      mesh.count = count;
      if (mesh.instanceMatrix) {
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
  }

  /**
   * Get all instanced meshes for adding to scene
   */
  getMeshes(): THREE.InstancedMesh[] {
    return Array.from(this.instancedMeshes.values());
  }

  /**
   * Get total visible instances
   */
  getTotalVisibleInstances(): number {
    let total = 0;
    for (const count of this.instanceCounts.values()) {
      total += count;
    }
    return total;
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    for (const mesh of this.instancedMeshes.values()) {
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material.dispose();
      }
    }
    this.instancedMeshes.clear();
  }
}

/**
 * Create optimized material pool
 */
export class MaterialPool {
  private materials: Map<string, THREE.Material> = new Map();

  /**
   * Get or create a standard material
   */
  getStandardMaterial(params: {
    color?: number;
    roughness?: number;
    metalness?: number;
    emissive?: number;
    emissiveIntensity?: number;
  }): THREE.MeshStandardMaterial {
    const key = `std_${params.color || 0xffffff}_${params.roughness || 0.5}_${params.metalness || 0}`;
    
    let material = this.materials.get(key) as THREE.MeshStandardMaterial;
    if (!material) {
      material = new THREE.MeshStandardMaterial({
        color: params.color || 0xffffff,
        roughness: params.roughness || 0.5,
        metalness: params.metalness || 0,
        emissive: params.emissive || 0x000000,
        emissiveIntensity: params.emissiveIntensity || 0,
      });
      this.materials.set(key, material);
    }
    
    return material;
  }

  /**
   * Get or create a basic material
   */
  getBasicMaterial(params: {
    color?: number;
    transparent?: boolean;
    opacity?: number;
  }): THREE.MeshBasicMaterial {
    const key = `basic_${params.color || 0xffffff}_${params.transparent || false}_${params.opacity || 1}`;
    
    let material = this.materials.get(key) as THREE.MeshBasicMaterial;
    if (!material) {
      material = new THREE.MeshBasicMaterial({
        color: params.color || 0xffffff,
        transparent: params.transparent || false,
        opacity: params.opacity || 1,
      });
      this.materials.set(key, material);
    }
    
    return material;
  }

  /**
   * Dispose all materials
   */
  dispose(): void {
    for (const material of this.materials.values()) {
      material.dispose();
    }
    this.materials.clear();
  }
}

// Export utilities
export const geometryBatcher = new GeometryBatcher();
export const textureAtlasManager = new TextureAtlasManager();
export const adaptiveRenderer = new AdaptiveRenderer();
export const materialPool = new MaterialPool();
