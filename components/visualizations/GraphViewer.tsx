'use client';

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';

// Types matching our Kernel Graph
interface GraphNode {
  id: string;
  type: 'thought' | 'evidence';
  label: string;
  data: any;
  position?: [number, number, number]; // Calculated position
}

interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  weight: number;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface GraphViewerProps {
  data: GraphData;
}

interface LayoutNode extends GraphNode {
  position: [number, number, number];
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook to calculate graph layout in a Web Worker
 * Prevents UI freezing for large graphs
 */
function useGraphLayout(nodes: GraphNode[], edges: GraphEdge[]) {
  const [layoutNodes, setLayoutNodes] = useState<LayoutNode[]>([]);
  const [progress, setProgress] = useState(0);
  const [isCalculating, setIsCalculating] = useState(true);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Create worker
    workerRef.current = new Worker(
      new URL('../../workers/graph-layout.worker.ts', import.meta.url)
    );

    workerRef.current.onmessage = (event) => {
      const { type, nodes: resultNodes, progress: p, error } = event.data;

      if (type === 'progress') {
        setProgress(p);
      } else if (type === 'complete') {
        setLayoutNodes(resultNodes);
        setIsCalculating(false);
        setProgress(1);
      } else if (type === 'error') {
        console.error('[GraphLayout] Worker error:', error);
        // Fallback to simple layout on error
        setLayoutNodes(nodes.map((node, i) => ({
          ...node,
          position: [
            Math.cos(i * 0.5) * 10,
            Math.sin(i * 0.3) * 10,
            Math.sin(i * 0.5) * 10
          ] as [number, number, number]
        })));
        setIsCalculating(false);
      }
    };

    // Start calculation
    workerRef.current.postMessage({
      type: 'calculate',
      nodes,
      edges,
      config: {
        // Adaptive iterations based on graph size
        iterations: Math.min(50, Math.max(20, 100 - nodes.length / 2)),
        repulsionStrength: 5,
        attractionStrength: 0.1,
        damping: 0.85,
        centerGravity: 0.05,
        cellSize: 5
      }
    });

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [nodes, edges]);

  return { layoutNodes, progress, isCalculating };
}

function Node({ node, onSelect }: { node: GraphNode; onSelect: (n: GraphNode) => void }) {
  const color = node.type === 'thought' ? '#4f46e5' : '#ec4899'; // Indigo vs Pink
  const size = node.type === 'thought' ? 0.2 : 0.4;
  const [hovered, setHover] = useState(false);

  return (
    <group position={node.position}>
      <mesh 
        onClick={(e) => { e.stopPropagation(); onSelect(node); }}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial color={hovered ? '#ffffff' : color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      {hovered && (
        <Html distanceFactor={10}>
          <div className="bg-black/80 text-white p-2 rounded text-xs whitespace-nowrap border border-white/20">
            {node.label}
          </div>
        </Html>
      )}
    </group>
  );
}

function Connections({ nodes, edges }: { nodes: GraphNode[], edges: GraphEdge[] }) {
  const lines = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    edges.forEach(edge => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (source && target && source.position && target.position) {
        points.push(new THREE.Vector3(...source.position));
        points.push(new THREE.Vector3(...target.position));
      }
    });
    return points;
  }, [nodes, edges]);

  if (lines.length === 0) return null;

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(lines.flatMap(v => [v.x, v.y, v.z])), 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#ffffff" opacity={0.1} transparent />
    </lineSegments>
  );
}

export function GraphViewer({ data }: GraphViewerProps) {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  
  // Calculate layout in Web Worker (prevents UI freeze for large graphs)
  const { layoutNodes, progress, isCalculating } = useGraphLayout(data.nodes, data.edges);

  return (
    <div className="w-full h-[600px] bg-slate-950 relative rounded-xl overflow-hidden border border-slate-800">
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h3 className="text-white font-bold text-lg">BIZRA Neural Atlas</h3>
        <p className="text-slate-400 text-sm">
          {data.nodes.length} Nodes | {data.edges.length} Synapses
        </p>
        {isCalculating && (
          <div className="mt-2">
            <div className="text-xs text-indigo-400">Computing layout...</div>
            <div className="w-32 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {selectedNode && (
        <div className="absolute bottom-4 right-4 z-10 w-80 bg-slate-900/90 p-4 rounded-lg border border-slate-700 text-white backdrop-blur-md">
          <h4 className="font-bold text-indigo-400 uppercase text-xs mb-1">{selectedNode.type}</h4>
          <p className="font-medium mb-2">{selectedNode.label}</p>
          <div className="text-xs text-slate-400 font-mono">
            ID: {selectedNode.id.substring(0, 8)}...
          </div>
          {selectedNode.type === 'evidence' && (
             <button className="mt-3 w-full py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-bold transition-colors">
               OPEN EVIDENCE
             </button>
          )}
        </div>
      )}

      <Canvas camera={{ position: [0, 0, 25], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <OrbitControls autoRotate autoRotateSpeed={0.5} />
        {layoutNodes.length > 0 && (
          <>
            <Connections nodes={layoutNodes} edges={data.edges} />
            {layoutNodes.map((node) => (
              <Node key={node.id} node={node} onSelect={setSelectedNode} />
            ))}
          </>
        )}
      </Canvas>
    </div>
  );
}
