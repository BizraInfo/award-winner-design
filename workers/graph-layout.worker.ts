// workers/graph-layout.worker.ts
/**
 * Web Worker for Force-Directed Graph Layout
 * 
 * Moves O(n²) computation off the main thread to prevent UI freezing.
 * Uses spatial partitioning (grid) to reduce complexity to O(n·log(n)) average case.
 */

interface GraphNode {
  id: string;
  type: 'thought' | 'evidence';
  label: string;
  data: unknown;
  position?: [number, number, number];
}

interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  weight: number;
}

interface LayoutNode extends GraphNode {
  position: [number, number, number];
  velocity: [number, number, number];
}

interface WorkerMessage {
  type: 'calculate';
  nodes: GraphNode[];
  edges: GraphEdge[];
  config?: LayoutConfig;
}

interface LayoutConfig {
  iterations: number;
  repulsionStrength: number;
  attractionStrength: number;
  damping: number;
  centerGravity: number;
  cellSize: number;  // For spatial partitioning
}

const DEFAULT_CONFIG: LayoutConfig = {
  iterations: 50,
  repulsionStrength: 5,
  attractionStrength: 0.1,
  damping: 0.85,
  centerGravity: 0.05,
  cellSize: 5,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SPATIAL GRID for O(n) neighbor lookups
// ═══════════════════════════════════════════════════════════════════════════════

class SpatialGrid {
  private cells: Map<string, LayoutNode[]> = new Map();
  private cellSize: number;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  private getCellKey(x: number, y: number, z: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx},${cy},${cz}`;
  }

  clear(): void {
    this.cells.clear();
  }

  insert(node: LayoutNode): void {
    const key = this.getCellKey(node.position[0], node.position[1], node.position[2]);
    if (!this.cells.has(key)) {
      this.cells.set(key, []);
    }
    this.cells.get(key)!.push(node);
  }

  getNeighbors(node: LayoutNode): LayoutNode[] {
    const neighbors: LayoutNode[] = [];
    const [x, y, z] = node.position;
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const cz = Math.floor(z / this.cellSize);

    // Check 3x3x3 neighborhood
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = `${cx + dx},${cy + dy},${cz + dz}`;
          const cell = this.cells.get(key);
          if (cell) {
            neighbors.push(...cell);
          }
        }
      }
    }

    return neighbors;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYOUT CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

function calculateLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  config: LayoutConfig
): LayoutNode[] {
  // Initialize nodes with random positions
  const layoutNodes: LayoutNode[] = nodes.map(node => ({
    ...node,
    position: [
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20
    ] as [number, number, number],
    velocity: [0, 0, 0] as [number, number, number]
  }));

  // Create edge lookup for O(1) access
  const edgeMap = new Map<string, { target: string; weight: number }[]>();
  for (const edge of edges) {
    if (!edgeMap.has(edge.source)) edgeMap.set(edge.source, []);
    if (!edgeMap.has(edge.target)) edgeMap.set(edge.target, []);
    edgeMap.get(edge.source)!.push({ target: edge.target, weight: edge.weight });
    edgeMap.get(edge.target)!.push({ target: edge.source, weight: edge.weight });
  }

  // Create node lookup
  const nodeMap = new Map<string, LayoutNode>();
  for (const node of layoutNodes) {
    nodeMap.set(node.id, node);
  }

  const grid = new SpatialGrid(config.cellSize);

  // Simulation loop
  for (let iteration = 0; iteration < config.iterations; iteration++) {
    // Rebuild spatial grid
    grid.clear();
    for (const node of layoutNodes) {
      grid.insert(node);
    }

    // Calculate forces
    for (const nodeA of layoutNodes) {
      // Repulsion from nearby nodes (using spatial grid)
      const neighbors = grid.getNeighbors(nodeA);
      for (const nodeB of neighbors) {
        if (nodeA.id === nodeB.id) continue;

        const dx = nodeA.position[0] - nodeB.position[0];
        const dy = nodeA.position[1] - nodeB.position[1];
        const dz = nodeA.position[2] - nodeB.position[2];
        const distSq = dx * dx + dy * dy + dz * dz || 0.01;
        const dist = Math.sqrt(distSq);

        // Repulsion force (inverse square law with cutoff)
        if (dist < config.cellSize * 2) {
          const force = config.repulsionStrength / distSq;
          nodeA.velocity[0] += (dx / dist) * force;
          nodeA.velocity[1] += (dy / dist) * force;
          nodeA.velocity[2] += (dz / dist) * force;
        }
      }

      // Attraction along edges
      const connectedEdges = edgeMap.get(nodeA.id) || [];
      for (const edge of connectedEdges) {
        const nodeB = nodeMap.get(edge.target);
        if (!nodeB) continue;

        const dx = nodeB.position[0] - nodeA.position[0];
        const dy = nodeB.position[1] - nodeA.position[1];
        const dz = nodeB.position[2] - nodeA.position[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;

        // Attraction force (linear spring)
        const force = dist * config.attractionStrength * edge.weight;
        nodeA.velocity[0] += (dx / dist) * force;
        nodeA.velocity[1] += (dy / dist) * force;
        nodeA.velocity[2] += (dz / dist) * force;
      }

      // Center gravity
      nodeA.velocity[0] -= nodeA.position[0] * config.centerGravity;
      nodeA.velocity[1] -= nodeA.position[1] * config.centerGravity;
      nodeA.velocity[2] -= nodeA.position[2] * config.centerGravity;
    }

    // Apply velocities with damping
    for (const node of layoutNodes) {
      node.position[0] += node.velocity[0] * 0.1;
      node.position[1] += node.velocity[1] * 0.1;
      node.position[2] += node.velocity[2] * 0.1;

      // Apply damping
      node.velocity[0] *= config.damping;
      node.velocity[1] *= config.damping;
      node.velocity[2] *= config.damping;
    }

    // Report progress for long computations
    if (iteration % 10 === 0 && layoutNodes.length > 100) {
      self.postMessage({
        type: 'progress',
        progress: iteration / config.iterations
      });
    }
  }

  // Clean up velocity from output
  return layoutNodes.map(node => ({
    ...node,
    velocity: [0, 0, 0] as [number, number, number]
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKER MESSAGE HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, nodes, edges, config } = event.data;

  if (type === 'calculate') {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    try {
      const result = calculateLayout(nodes, edges, mergedConfig);
      
      self.postMessage({
        type: 'complete',
        nodes: result
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

export {};
