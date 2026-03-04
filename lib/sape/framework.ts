// lib/sape/framework.ts
/**
 * SAPE Framework: System Analysis and Performance Evaluation
 * 
 * Implements multi-lens analysis methodology with:
 * - Graph-of-Thoughts (GoT) reasoning
 * - Signal-to-Noise Ratio (SNR) optimization
 * - Evidence-based knowledge synthesis
 */

export interface ThoughtNode {
  id: string;
  content: string;
  type: 'observation' | 'hypothesis' | 'evidence' | 'conclusion' | 'action';
  confidence: number;
  dependencies: string[];
  metadata: Record<string, unknown>;
}

export interface AnalysisLens {
  name: string;
  description: string;
  snrScore: number;
  findings: string[];
  risks: Risk[];
  recommendations: string[];
}

export interface Risk {
  id: string;
  category: 'security' | 'performance' | 'architecture' | 'documentation' | 'operational';
  severity: 'critical' | 'high' | 'medium' | 'low';
  probability: number;  // 0-1
  impact: number;       // 0-1
  description: string;
  mitigation: string;
}

export interface SNRMetrics {
  signalStrength: number;
  noiseLevel: number;
  snrRatio: number;
  category: string;
}

export interface SAPEAnalysisResult {
  overallSNR: number;
  lenses: AnalysisLens[];
  knowledgeGraph: ThoughtNode[];
  riskMatrix: Risk[];
  prioritizedActions: PrioritizedAction[];
  timestamp: Date;
}

export interface PrioritizedAction {
  id: string;
  title: string;
  description: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  effort: 'low' | 'medium' | 'high';
  impact: number;
  timeline: string;
  dependencies: string[];
}

/**
 * Graph-of-Thoughts reasoning engine
 */
export class GraphOfThoughts {
  private nodes: Map<string, ThoughtNode> = new Map();
  private edges: Map<string, Set<string>> = new Map();
  
  /**
   * Add a thought node to the graph
   */
  addNode(node: ThoughtNode): void {
    this.nodes.set(node.id, node);
    
    // Create edges for dependencies
    if (!this.edges.has(node.id)) {
      this.edges.set(node.id, new Set());
    }
    
    for (const depId of node.dependencies) {
      const depEdges = this.edges.get(depId);
      if (depEdges) {
        depEdges.add(node.id);
      }
    }
  }
  
  /**
   * Traverse graph using topological sort
   */
  topologicalTraversal(): ThoughtNode[] {
    const visited = new Set<string>();
    const result: ThoughtNode[] = [];
    
    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      const node = this.nodes.get(nodeId);
      if (!node) return;
      
      // Visit dependencies first
      for (const depId of node.dependencies) {
        visit(depId);
      }
      
      result.push(node);
    };
    
    for (const nodeId of this.nodes.keys()) {
      visit(nodeId);
    }
    
    return result;
  }
  
  /**
   * Find path between two nodes
   */
  findPath(startId: string, endId: string): ThoughtNode[] | null {
    const visited = new Set<string>();
    const path: ThoughtNode[] = [];
    
    const dfs = (currentId: string): boolean => {
      if (visited.has(currentId)) return false;
      visited.add(currentId);
      
      const node = this.nodes.get(currentId);
      if (!node) return false;
      
      path.push(node);
      
      if (currentId === endId) return true;
      
      const edges = this.edges.get(currentId);
      if (edges) {
        for (const nextId of edges) {
          if (dfs(nextId)) return true;
        }
      }
      
      path.pop();
      return false;
    };
    
    return dfs(startId) ? path : null;
  }
  
  /**
   * Get nodes by type
   */
  getNodesByType(type: ThoughtNode['type']): ThoughtNode[] {
    return Array.from(this.nodes.values()).filter(n => n.type === type);
  }
  
  /**
   * Calculate confidence propagation
   */
  propagateConfidence(): void {
    const sorted = this.topologicalTraversal();
    
    for (const node of sorted) {
      if (node.dependencies.length === 0) continue;
      
      // Confidence is the product of own confidence and min dependency confidence
      const depConfidences = node.dependencies
        .map(id => this.nodes.get(id)?.confidence || 0);
      
      const minDepConfidence = Math.min(...depConfidences);
      node.confidence = node.confidence * minDepConfidence;
    }
  }
  
  /**
   * Export graph as JSON for visualization
   */
  toJSON(): { nodes: ThoughtNode[]; edges: Array<{ from: string; to: string }> } {
    const edgeList: Array<{ from: string; to: string }> = [];
    
    for (const [fromId, toIds] of this.edges) {
      for (const toId of toIds) {
        edgeList.push({ from: fromId, to: toId });
      }
    }
    
    return {
      nodes: Array.from(this.nodes.values()),
      edges: edgeList
    };
  }
}

/**
 * SAPE Framework main class
 */
export class SAPEFramework {
  private got: GraphOfThoughts;
  private lenses: Map<string, AnalysisLens>;
  private risks: Risk[];
  
  constructor() {
    this.got = new GraphOfThoughts();
    this.lenses = new Map();
    this.risks = [];
  }
  
  /**
   * Calculate Signal-to-Noise Ratio
   */
  calculateSNR(metrics: {
    signalMetrics: number[];  // Positive indicators
    noiseMetrics: number[];   // Negative indicators
    weights?: number[];
  }): SNRMetrics {
    const { signalMetrics, noiseMetrics, weights } = metrics;
    
    // Calculate weighted signal strength
    let signalStrength = 0;
    let noiseLevel = 0;
    
    const effectiveWeights = weights || signalMetrics.map(() => 1);
    const totalWeight = effectiveWeights.reduce((a, b) => a + b, 0);
    
    signalMetrics.forEach((s, i) => {
      signalStrength += s * (effectiveWeights[i] || 1);
    });
    signalStrength /= totalWeight;
    
    noiseMetrics.forEach((n, i) => {
      noiseLevel += n * (effectiveWeights[i] || 1);
    });
    noiseLevel /= totalWeight;
    
    // Prevent division by zero
    const snrRatio = noiseLevel === 0 ? signalStrength * 10 : signalStrength / noiseLevel;
    
    return {
      signalStrength: Math.round(signalStrength * 100) / 100,
      noiseLevel: Math.round(noiseLevel * 100) / 100,
      snrRatio: Math.round(snrRatio * 100) / 100,
      category: this.categorizeSNR(snrRatio)
    };
  }
  
  /**
   * Categorize SNR value
   */
  private categorizeSNR(snr: number): string {
    if (snr >= 5) return 'EXCELLENT';
    if (snr >= 3) return 'GOOD';
    if (snr >= 2) return 'FAIR';
    if (snr >= 1) return 'POOR';
    return 'CRITICAL';
  }
  
  /**
   * Add analysis lens
   */
  addLens(lens: AnalysisLens): void {
    this.lenses.set(lens.name, lens);
    
    // Add lens findings to GoT as observations
    lens.findings.forEach((finding, index) => {
      this.got.addNode({
        id: `${lens.name.toLowerCase()}-finding-${index}`,
        content: finding,
        type: 'observation',
        confidence: 0.8 + (lens.snrScore / 50), // Higher SNR = higher confidence
        dependencies: [],
        metadata: { lens: lens.name, snr: lens.snrScore }
      });
    });
    
    // Add risks from lens
    this.risks.push(...lens.risks);
  }
  
  /**
   * Add hypothesis based on observations
   */
  addHypothesis(hypothesis: {
    id: string;
    content: string;
    basedOn: string[];
    confidence: number;
  }): void {
    this.got.addNode({
      id: hypothesis.id,
      content: hypothesis.content,
      type: 'hypothesis',
      confidence: hypothesis.confidence,
      dependencies: hypothesis.basedOn,
      metadata: {}
    });
  }
  
  /**
   * Add evidence supporting or refuting hypothesis
   */
  addEvidence(evidence: {
    id: string;
    content: string;
    supports: string[];
    confidence: number;
    source: string;
  }): void {
    this.got.addNode({
      id: evidence.id,
      content: evidence.content,
      type: 'evidence',
      confidence: evidence.confidence,
      dependencies: evidence.supports,
      metadata: { source: evidence.source }
    });
  }
  
  /**
   * Draw conclusions from evidence
   */
  addConclusion(conclusion: {
    id: string;
    content: string;
    basedOn: string[];
  }): void {
    const baseNodes = conclusion.basedOn
      .map(id => this.got.getNodesByType('evidence').find(n => n.id === id) ||
                 this.got.getNodesByType('hypothesis').find(n => n.id === id))
      .filter(Boolean);
    
    const avgConfidence = baseNodes.length > 0
      ? baseNodes.reduce((sum, n) => sum + (n?.confidence || 0), 0) / baseNodes.length
      : 0.5;
    
    this.got.addNode({
      id: conclusion.id,
      content: conclusion.content,
      type: 'conclusion',
      confidence: avgConfidence * 0.9, // Slight discount for inference
      dependencies: conclusion.basedOn,
      metadata: {}
    });
  }
  
  /**
   * Generate prioritized actions from analysis
   */
  generatePrioritizedActions(): PrioritizedAction[] {
    const actions: PrioritizedAction[] = [];
    
    // Sort risks by severity and impact
    const sortedRisks = [...this.risks].sort((a, b) => {
      const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      const aScore = severityWeight[a.severity] * a.impact * a.probability;
      const bScore = severityWeight[b.severity] * b.impact * b.probability;
      return bScore - aScore;
    });
    
    // Generate actions for top risks
    sortedRisks.slice(0, 10).forEach((risk, index) => {
      const priority = risk.severity === 'critical' ? 'P0'
        : risk.severity === 'high' ? 'P1'
        : risk.severity === 'medium' ? 'P2' : 'P3';
      
      actions.push({
        id: `action-${index + 1}`,
        title: `Mitigate: ${risk.id}`,
        description: risk.mitigation,
        priority,
        effort: risk.impact > 0.7 ? 'high' : risk.impact > 0.4 ? 'medium' : 'low',
        impact: risk.impact,
        timeline: priority === 'P0' ? '1 week' : priority === 'P1' ? '2 weeks' : '1 month',
        dependencies: []
      });
    });
    
    // Add recommendations from lenses
    let actionIndex = actions.length;
    for (const lens of this.lenses.values()) {
      lens.recommendations.forEach(rec => {
        actions.push({
          id: `action-${++actionIndex}`,
          title: `[${lens.name}] Improvement`,
          description: rec,
          priority: lens.snrScore < 3 ? 'P1' : 'P2',
          effort: 'medium',
          impact: lens.snrScore / 10,
          timeline: '1 month',
          dependencies: []
        });
      });
    }
    
    // Sort by priority and impact
    return actions.sort((a, b) => {
      const priorityWeight = { P0: 4, P1: 3, P2: 2, P3: 1 };
      const aScore = priorityWeight[a.priority] * a.impact;
      const bScore = priorityWeight[b.priority] * b.impact;
      return bScore - aScore;
    });
  }
  
  /**
   * Calculate overall system SNR
   */
  calculateOverallSNR(): number {
    if (this.lenses.size === 0) return 0;
    
    let totalSNR = 0;
    for (const lens of this.lenses.values()) {
      totalSNR += lens.snrScore;
    }
    
    return Math.round((totalSNR / this.lenses.size) * 100) / 100;
  }
  
  /**
   * Run complete analysis
   */
  analyze(): SAPEAnalysisResult {
    // Propagate confidence through GoT
    this.got.propagateConfidence();
    
    return {
      overallSNR: this.calculateOverallSNR(),
      lenses: Array.from(this.lenses.values()),
      knowledgeGraph: this.got.topologicalTraversal(),
      riskMatrix: this.risks,
      prioritizedActions: this.generatePrioritizedActions(),
      timestamp: new Date()
    };
  }
  
  /**
   * Generate analysis report
   */
  generateReport(): string {
    const result = this.analyze();
    
    const lensReport = result.lenses.map(lens => `
### ${lens.name} (SNR: ${lens.snrScore})
${lens.description}

**Findings:**
${lens.findings.map(f => `- ${f}`).join('\n')}

**Risks:**
${lens.risks.map(r => `- [${r.severity.toUpperCase()}] ${r.description}`).join('\n')}

**Recommendations:**
${lens.recommendations.map(r => `- ${r}`).join('\n')}
`).join('\n');
    
    const riskMatrix = this.generateRiskMatrix();
    
    const actionPlan = result.prioritizedActions.slice(0, 10).map(action => 
      `| ${action.priority} | ${action.title} | ${action.effort} | ${action.timeline} |`
    ).join('\n');
    
    return `
# SAPE Framework Analysis Report

**Generated:** ${result.timestamp.toISOString()}
**Overall SNR:** ${result.overallSNR}
**Knowledge Graph Nodes:** ${result.knowledgeGraph.length}
**Identified Risks:** ${result.riskMatrix.length}

## Executive Summary

System analysis completed with ${this.lenses.size} analytical lenses.
Current system SNR of ${result.overallSNR} indicates ${this.categorizeSNR(result.overallSNR)} performance.

${lensReport}

## Risk Matrix

${riskMatrix}

## Prioritized Action Plan

| Priority | Action | Effort | Timeline |
|----------|--------|--------|----------|
${actionPlan}

---
*Report generated by SAPE Framework v1.0*
    `.trim();
  }
  
  /**
   * Generate visual risk matrix
   */
  private generateRiskMatrix(): string {
    const matrix: string[][] = [
      ['', 'Low Impact', 'Med Impact', 'High Impact'],
      ['High Prob', '', '', ''],
      ['Med Prob', '', '', ''],
      ['Low Prob', '', '', '']
    ];
    
    for (const risk of this.risks) {
      const probRow = risk.probability > 0.66 ? 1 : risk.probability > 0.33 ? 2 : 3;
      const impactCol = risk.impact > 0.66 ? 3 : risk.impact > 0.33 ? 2 : 1;
      
      const current = matrix[probRow][impactCol];
      matrix[probRow][impactCol] = current 
        ? `${current}, ${risk.id}` 
        : risk.id;
    }
    
    return matrix.map(row => 
      `| ${row.map(cell => cell || '-').join(' | ')} |`
    ).join('\n');
  }
}

// Export singleton instance
export const sapeFramework = new SAPEFramework();
