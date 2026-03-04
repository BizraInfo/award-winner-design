"use client"

import * as THREE from "three"
import { useRef, useMemo, useLayoutEffect, useCallback, useState, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { useBizraStore } from "@/store/use-bizra-store"

// Advanced type system for memory management
interface InstanceData {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
  lodLevel: 0 | 1 | 2 // Level of Detail: 0=full detail, 1=medium, 2=low
  distanceFromCamera: number
  lastUpdate: number
}

// Memory pool for object reuse
class ObjectPool<T> {
  private pool: T[] = []
  private createFn: () => T
  private resetFn: (obj: T) => void

  constructor(createFn: () => T, resetFn: (obj: T) => void, initialSize = 10) {
    this.createFn = createFn
    this.resetFn = resetFn
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn())
    }
  }

  get(): T {
    return this.pool.pop() || this.createFn()
  }

  release(obj: T): void {
    this.resetFn(obj)
    this.pool.push(obj)
  }

  get size(): number { return this.pool.length }
}

// Spatial partitioning with octree for efficient culling
class Octree<T> {
  private bounds: THREE.Box3
  private children: Octree<T>[] | null = null
  private objects: T[] = []
  private MAX_DEPTH = 5
  private MAX_OBJECTS = 8

  constructor(bounds: THREE.Box3, depth = 0) {
    this.bounds = bounds
  }

  insert(object: T, position: THREE.Vector3): void {
    if (!this.bounds.containsPoint(position)) return

    if (!this.children && (this.objects.length >= this.MAX_OBJECTS)) {
      this.subdivide()
    }

    if (this.children) {
      const index = this.getChildIndex(position)
      this.children[index].insert(object, position)
    } else {
      this.objects.push(object)
    }
  }

  query(frustum: THREE.Frustum): T[] {
    if (!frustum.intersectsBox(this.bounds)) return []

    let result: T[] = []

    if (this.children) {
      for (const child of this.children) {
        result.push(...child.query(frustum))
      }
    } else {
      result.push(...this.objects)
    }

    return result
  }

  private subdivide(): void {
    const { min, max } = this.bounds
    const midX = (min.x + max.x) / 2
    const midY = (min.y + max.y) / 2
    const midZ = (min.z + max.z) / 2

    this.children = [
      new Octree(new THREE.Box3(new THREE.Vector3(min.x, min.y, min.z), new THREE.Vector3(midX, midY, midZ))),
      new Octree(new THREE.Box3(new THREE.Vector3(midX, min.y, min.z), new THREE.Vector3(max.x, midY, midZ))),
      new Octree(new THREE.Box3(new THREE.Vector3(min.x, midY, min.z), new THREE.Vector3(midX, max.y, midZ))),
      new Octree(new THREE.Box3(new THREE.Vector3(midX, midY, min.z), new THREE.Vector3(max.x, max.y, midZ))),
      new Octree(new THREE.Box3(new THREE.Vector3(min.x, min.y, midZ), new THREE.Vector3(midX, midY, max.z))),
      new Octree(new THREE.Box3(new THREE.Vector3(midX, min.y, midZ), new THREE.Vector3(max.x, midY, max.z))),
      new Octree(new THREE.Box3(new THREE.Vector3(min.x, midY, midZ), new THREE.Vector3(midX, max.y, max.z))),
      new Octree(new THREE.Box3(new THREE.Vector3(midX, midY, midZ), new THREE.Vector3(max.x, max.y, max.z))),
    ]
  }

  private getChildIndex(position: THREE.Vector3): number {
    const { min, max } = this.bounds
    const midX = (min.x + max.x) / 2
    const midY = (min.y + max.y) / 2
    const midZ = (min.z + max.z) / 2

    let index = 0
    if (position.x > midX) index |= 1
    if (position.y > midY) index |= 2
    if (position.z > midZ) index |= 4
    return index
  }
}

// Performance monitoring system
class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private frameCount = 0
  private lastTime = 0
  private fpsHistory: number[] = []
  private memoryHistory: number[] = []
  private gcPressure = 0

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  update(deltaTime: number): void {
    this.frameCount++
    const now = performance.now()
    const fps = 1000 / deltaTime

    this.fpsHistory.push(fps)
    if (this.fpsHistory.length > 60) this.fpsHistory.shift()

    if ('memory' in performance && performance.memory) {
      this.memoryHistory.push((performance.memory as any).usedJSHeapSize);
      if (this.memoryHistory.length > 60) this.memoryHistory.shift();

      // Detect memory pressure
      if (this.memoryHistory.length > 10) {
        const recent = this.memoryHistory.slice(-10);
        const growth = recent[recent.length - 1] - recent[0];
        if (growth > 50 * 1024 * 1024) { // 50MB growth
          this.gcPressure++;
        } else {
          this.gcPressure = Math.max(0, this.gcPressure - 1);
        }
      }
    }

    this.lastTime = now
  }

  getMetrics() {
    const avgFps = this.fpsHistory.length > 0 ? this.fpsHistory.reduce((a, b) => a + b) / this.fpsHistory.length : 0
    const minFps = this.fpsHistory.length > 0 ? Math.min(...this.fpsHistory) : 0
    const maxMemory = this.memoryHistory.length > 0 ? Math.max(...this.memoryHistory) : 0
    return { avgFps, minFps, maxMemory, gcPressure: this.gcPressure }
  }
}

const TOTAL_COUNT = 15000
const CHUNK_SIZE = 500 // Process in chunks for progressive loading
const LOD_LEVELS = {
  HIGH_DETAIL: { distance: 50, instances: 1.0 },
  MEDIUM_DETAIL: { distance: 100, instances: 0.5 },
  LOW_DETAIL: { distance: 200, instances: 0.2 }
}

export function CitadelOptimized() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const { camera } = useThree()
  const isDevMode = useBizraStore((state) => state.isDevMode)

  // Performance monitoring
  const monitor = PerformanceMonitor.getInstance()

  // Memory pools and spatial data structures
  const [spatialTree] = useState(() => new Octree<InstanceData>(
    new THREE.Box3(new THREE.Vector3(-500, -50, -500), new THREE.Vector3(500, 300, 500))
  ))

  // Progressive loading state
  const [loadedChunks, setLoadedChunks] = useState(0)
  const [visibleInstances, setVisibleInstances] = useState<InstanceData[]>([])

  // Advanced procedural generation with noise-based distribution
  const proceduralData = useMemo(() => {
    const instances: InstanceData[] = []

    // Improved noise function for organic distribution
    const noise3D = (x: number, y: number, z: number): number => {
      // Simplex-like noise for more natural distribution
      return Math.sin(x * 0.01) * Math.cos(y * 0.015) * Math.sin(z * 0.008) * 0.5 + 0.5
    }

    for (let i = 0; i < TOTAL_COUNT; i++) {
      // Fibonacci spiral for natural distribution (Golden Spiral)
      const t = i / (TOTAL_COUNT - 1)
      const angle = i * 0.618034 * Math.PI * 2 // Golden angle
      const radiusNoise = noise3D(i * 0.1, i * 0.15, i * 0.05)
      const radius = Math.sqrt(i) * 0.8 + radiusNoise * 50

      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius

      // Height with volumetric noise and temporal variation
      const heightNoise = noise3D(x * 0.02, z * 0.02, i * 0.005)
      const y = (i / TOTAL_COUNT) * 20 + heightNoise * 10 + Math.sin(i * 0.02) * 8

      instances.push({
        position: [x, y, z],
        rotation: [0, angle + Math.PI / 4, Math.PI / 6],
        scale: 0.3 + noise3D(x, y, z) * 0.4,
        lodLevel: 0,
        distanceFromCamera: 0,
        lastUpdate: performance.now()
      })
    }

    return instances
  }, [])

  // Efficient frustum culling and LOD calculation
  const updateVisibleInstances = useCallback(() => {
    if (!camera || !meshRef.current) return

    const frustum = new THREE.Frustum()
    const matrix = new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    )
    frustum.setFromProjectionMatrix(matrix)

    const cameraPosition = camera.position.clone()
    const now = performance.now()

    // Query spatial tree for visible objects
    const visible = proceduralData.filter((instance, index) => {
      const pos = new THREE.Vector3(...instance.position)

      // Frustum culling
      if (!frustum.containsPoint(pos)) return false

      // Distance-based LOD
      instance.distanceFromCamera = cameraPosition.distanceTo(pos)
      instance.lastUpdate = now

      if (instance.distanceFromCamera < LOD_LEVELS.HIGH_DETAIL.distance) {
        instance.lodLevel = 0 // High detail
      } else if (instance.distanceFromCamera < LOD_LEVELS.MEDIUM_DETAIL.distance) {
        instance.lodLevel = 1 // Medium detail
      } else {
        instance.lodLevel = 2 // Low detail
      }

      return true
    })

    // Sort by distance for alpha blending
    visible.sort((a, b) => b.distanceFromCamera - a.distanceFromCamera)

    setVisibleInstances(visible)
  }, [proceduralData, camera])

  // Progressive loading system
  useEffect(() => {
    const interval = setInterval(() => {
      if (loadedChunks * CHUNK_SIZE < TOTAL_COUNT) {
        setLoadedChunks(prev => prev + 1)

        // Populate spatial tree in chunks
        const start = (loadedChunks) * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, TOTAL_COUNT)

        for (let i = start; i < end; i++) {
          const instance = proceduralData[i]
          const pos = new THREE.Vector3(...instance.position)
          spatialTree.insert(instance, pos)
        }
      } else {
        clearInterval(interval)
      }
    }, 16) // ~60fps loading

    return () => clearInterval(interval)
  }, [loadedChunks, proceduralData])

  // GPU matrix update optimization
  const updateMatrices = useCallback(() => {
    const mesh = meshRef.current
    if (!mesh) return

    let instanceIndex = 0
    const tempObject = new THREE.Object3D()

    visibleInstances.forEach((instance, localIndex) => {
      tempObject.position.set(...instance.position)
      tempObject.rotation.set(...instance.rotation)
      tempObject.scale.setScalar(instance.scale * (instance.lodLevel === 0 ? 1 : instance.lodLevel === 1 ? 0.6 : 0.3))
      tempObject.updateMatrix()

      mesh.setMatrixAt(instanceIndex++, tempObject.matrix)

      // LOD-based color variation
      let color = new THREE.Color("#C9A962")
      if (instance.lodLevel === 1) {
        color.multiplyScalar(0.7) // Darker for medium LOD
      } else if (instance.lodLevel === 2) {
        color.multiplyScalar(0.4) // Much darker for low LOD
      }

      if (isDevMode && localIndex === 0) {
        color.set("#FF0044") // Debug marker
      }

      mesh.setColorAt(instanceIndex - 1, color)
    })

    // Hide unused instances
    for (let i = instanceIndex; i < mesh.count; i++) {
      tempObject.position.set(0, -1000, 0) // Move far away
      tempObject.updateMatrix()
      mesh.setMatrixAt(i, tempObject.matrix)
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true

    mesh.count = instanceIndex // Update visible count
  }, [visibleInstances, isDevMode])

  // Optimized render loop with performance monitoring
  useFrame((state, delta) => {
    monitor.update(delta * 1000) // Convert to ms

    // Update culling and LOD every few frames for performance
    if (state.clock.elapsedTime % 0.1 < 0.016) {
      updateVisibleInstances()
      updateMatrices()
    }

    // Breathing animation with performance adaptation
    const metrics = monitor.getMetrics()
    const performanceFactor = Math.max(0.3, Math.min(1, metrics.avgFps / 60))

    const mesh = meshRef.current
    if (mesh) {
      // Adaptive animation based on performance
      const breath = Math.sin(state.clock.elapsedTime * 0.7 * performanceFactor) * 0.03 + 1
      mesh.scale.setScalar(breath)

      // Slow rotation
      mesh.rotation.y += 0.001 * performanceFactor
    }

    // Dev mode performance overlay
    if (isDevMode && loadedChunks * CHUNK_SIZE >= TOTAL_COUNT) {
      console.log('Citadel Metrics:', {
        fps: metrics.avgFps.toFixed(1),
        minFps: metrics.minFps.toFixed(1),
        memory: `${(metrics.maxMemory / 1024 / 1024).toFixed(1)}MB`,
        visible: visibleInstances.length,
        lod: {
          high: visibleInstances.filter(i => i.lodLevel === 0).length,
          medium: visibleInstances.filter(i => i.lodLevel === 1).length,
          low: visibleInstances.filter(i => i.lodLevel === 2).length
        }
      })
    }
  })

  // Progressive render count based on loading progress
  const renderCount = Math.min(visibleInstances.length, (loadedChunks + 1) * CHUNK_SIZE)

  return (
    <>
      {/* Main instanced mesh with LOD geometry */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, renderCount]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 1, 0.2]} /> {/* Base high-detail geometry */}
        <meshStandardMaterial
          roughness={0.2}
          metalness={0.8}
          emissive="#C9A962"
          emissiveIntensity={0.25}
        />
      </instancedMesh>

      {/* Loading indicator */}
      {loadedChunks * CHUNK_SIZE < TOTAL_COUNT && (
        <mesh position={[0, -2, 0]}>
          <boxGeometry args={[10, 0.1, 10]} />
          <meshBasicMaterial color="#C9A962" transparent opacity={0.3} />
        </mesh>
      )}
    </>
  )
}
