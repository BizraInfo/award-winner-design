import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// In-memory cache with TTL for knowledge graph
let graphCache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL_MS = 30000; // 30 seconds

export async function GET() {
  try {
    const graphPath = path.join(process.cwd(), '.bizra-kernel', 'memory', 'knowledge_graph.json');
    
    // Check cache first
    const now = Date.now();
    if (graphCache && (now - graphCache.timestamp) < CACHE_TTL_MS) {
      return NextResponse.json(graphCache.data);
    }
    
    // Check file exists (async)
    try {
      await fs.access(graphPath);
    } catch {
      return NextResponse.json({ error: 'Knowledge Graph not found. Run synthesis first.' }, { status: 404 });
    }

    // Read file asynchronously (non-blocking)
    const data = await fs.readFile(graphPath, 'utf-8');
    const graph = JSON.parse(data);
    
    // Update cache
    graphCache = { data: graph, timestamp: now };

    return NextResponse.json(graph);
  } catch (error) {
    console.error('Failed to load knowledge graph:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
