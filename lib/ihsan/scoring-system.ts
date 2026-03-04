// lib/ihsan/scoring-system.ts
/**
 * Ihsān Scoring System: Quantitative Ethical Integrity Measurement
 * 
 * Implements the four pillars of Ihsān:
 * - Itqān (إتقان): Excellence and mastery
 * - Amānah (أمانة): Trustworthiness and reliability
 * - Adl (عدل): Justice and fairness
 * - Ihsān (إحسان): Benevolence and doing good
 */

export interface IhsanMetric {
  name: string;
  value: number;
  threshold: number;
  weight: number;
}

export interface IhsanDimension {
  name: string;
  arabicName: string;
  description: string;
  weight: number;
  metrics: IhsanMetric[];
  score?: number;
}

export interface IhsanResult {
  composite: number;
  dimensions: IhsanDimension[];
  status: 'ELITE' | 'COMPLIANT' | 'NEEDS_IMPROVEMENT' | 'CRITICAL';
  recommendations: string[];
  timestamp: Date;
}

export interface SystemMetrics {
  // Itqān metrics
  testCoverage: number;
  codeQualityScore: number;
  performanceScore: number;
  
  // Amānah metrics
  securityScore: number;
  dataSovereigntyRatio: number;
  uptimePercentage: number;
  
  // Adl metrics
  poiFairnessIndex: number;
  accessEquityRatio: number;
  resourceDistributionScore: number;
  
  // Ihsān metrics
  humanityBenefitScore: number;
  communityContributions: number;
  openSourceRatio: number;
}

export const IHSAN_DIMENSIONS: IhsanDimension[] = [
  {
    name: 'Excellence',
    arabicName: 'إتقان (Itqān)',
    description: 'Mastery and perfection in execution - doing things with complete dedication',
    weight: 0.30,
    metrics: [
      { name: 'test_coverage', value: 0, threshold: 0.95, weight: 0.4 },
      { name: 'code_quality', value: 0, threshold: 0.98, weight: 0.35 },
      { name: 'performance', value: 0, threshold: 0.90, weight: 0.25 }
    ]
  },
  {
    name: 'Trustworthiness',
    arabicName: 'أمانة (Amānah)',
    description: 'Reliability and responsible stewardship of data and systems',
    weight: 0.25,
    metrics: [
      { name: 'security', value: 0, threshold: 1.0, weight: 0.5 },
      { name: 'data_sovereignty', value: 0, threshold: 1.0, weight: 0.3 },
      { name: 'uptime', value: 0, threshold: 0.9999, weight: 0.2 }
    ]
  },
  {
    name: 'Justice',
    arabicName: 'عدل (Adl)',
    description: 'Fair distribution of benefits and equitable treatment of all',
    weight: 0.25,
    metrics: [
      { name: 'poi_fairness', value: 0, threshold: 0.7, weight: 0.4 },
      { name: 'access_equity', value: 0, threshold: 0.95, weight: 0.35 },
      { name: 'resource_distribution', value: 0, threshold: 0.7, weight: 0.25 }
    ]
  },
  {
    name: 'Benevolence',
    arabicName: 'إحسان (Ihsān)',
    description: 'Doing good beyond requirements, creating positive societal impact',
    weight: 0.20,
    metrics: [
      { name: 'humanity_benefit', value: 0, threshold: 0.9, weight: 0.4 },
      { name: 'community_value', value: 0, threshold: 0.8, weight: 0.35 },
      { name: 'knowledge_sharing', value: 0, threshold: 0.8, weight: 0.25 }
    ]
  }
];

export class IhsanScoringSystem {
  private dimensions: IhsanDimension[];
  
  constructor() {
    this.dimensions = JSON.parse(JSON.stringify(IHSAN_DIMENSIONS));
  }
  
  /**
   * Update metrics from system data
   */
  updateMetrics(metrics: SystemMetrics): void {
    // Itqān (Excellence)
    this.dimensions[0].metrics[0].value = metrics.testCoverage;
    this.dimensions[0].metrics[1].value = metrics.codeQualityScore;
    this.dimensions[0].metrics[2].value = metrics.performanceScore;
    
    // Amānah (Trustworthiness)
    this.dimensions[1].metrics[0].value = metrics.securityScore;
    this.dimensions[1].metrics[1].value = metrics.dataSovereigntyRatio;
    this.dimensions[1].metrics[2].value = metrics.uptimePercentage;
    
    // Adl (Justice)
    this.dimensions[2].metrics[0].value = metrics.poiFairnessIndex;
    this.dimensions[2].metrics[1].value = metrics.accessEquityRatio;
    this.dimensions[2].metrics[2].value = metrics.resourceDistributionScore;
    
    // Ihsān (Benevolence)
    this.dimensions[3].metrics[0].value = metrics.humanityBenefitScore;
    this.dimensions[3].metrics[1].value = metrics.communityContributions;
    this.dimensions[3].metrics[2].value = metrics.openSourceRatio;
  }
  
  /**
   * Calculate composite Ihsān score using geometric mean
   */
  calculateCompositeScore(): IhsanResult {
    // Calculate dimension scores
    for (const dimension of this.dimensions) {
      dimension.score = this.calculateDimensionScore(dimension);
    }
    
    // Composite score using weighted geometric mean
    // This ensures all dimensions must meet thresholds for high score
    const weightedProduct = this.dimensions.reduce((product, dim) => {
      return product * Math.pow(dim.score || 0.01, dim.weight);
    }, 1);
    
    const compositeScore = weightedProduct;
    
    // Determine status
    const status = this.determineStatus(compositeScore);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations();
    
    return {
      composite: Math.round(compositeScore * 1000) / 1000,
      dimensions: this.dimensions,
      status,
      recommendations,
      timestamp: new Date()
    };
  }
  
  /**
   * Calculate individual dimension score
   */
  private calculateDimensionScore(dimension: IhsanDimension): number {
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const metric of dimension.metrics) {
      // Normalize metric value relative to threshold
      const normalizedValue = Math.min(metric.value / metric.threshold, 1);
      weightedSum += normalizedValue * metric.weight;
      totalWeight += metric.weight;
    }
    
    return weightedSum / totalWeight;
  }
  
  /**
   * Determine compliance status based on score
   */
  private determineStatus(score: number): IhsanResult['status'] {
    if (score >= 0.95) return 'ELITE';
    if (score >= 0.85) return 'COMPLIANT';
    if (score >= 0.70) return 'NEEDS_IMPROVEMENT';
    return 'CRITICAL';
  }
  
  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    for (const dimension of this.dimensions) {
      for (const metric of dimension.metrics) {
        const normalizedValue = metric.value / metric.threshold;
        
        if (normalizedValue < 0.85) {
          const percentNeeded = Math.round((metric.threshold - metric.value) / metric.threshold * 100);
          recommendations.push(
            `[${dimension.arabicName}] Improve ${metric.name}: ${percentNeeded}% improvement needed to reach threshold`
          );
        }
      }
      
      if ((dimension.score || 0) < 0.85) {
        recommendations.push(
          `[${dimension.arabicName}] ${dimension.name} dimension score (${((dimension.score || 0) * 100).toFixed(1)}%) below 85% compliance threshold`
        );
      }
    }
    
    return recommendations;
  }
  
  /**
   * Verify ethical alignment for a specific action
   */
  verifyAction(action: {
    name: string;
    impactOnUsers: number;      // -1 to 1 scale
    impactOnCommunity: number;  // -1 to 1 scale
    dataSovereignty: boolean;
    transparencyLevel: number;  // 0 to 1 scale
  }): {
    approved: boolean;
    score: number;
    reasoning: string[];
  } {
    const reasoning: string[] = [];
    let score = 0;
    
    // Check user impact (Ihsān)
    if (action.impactOnUsers >= 0) {
      score += 0.3 * action.impactOnUsers;
      reasoning.push(`✓ Positive user impact: ${(action.impactOnUsers * 100).toFixed(0)}%`);
    } else {
      reasoning.push(`✗ Negative user impact: ${(action.impactOnUsers * 100).toFixed(0)}%`);
    }
    
    // Check community impact (Adl)
    if (action.impactOnCommunity >= 0) {
      score += 0.3 * action.impactOnCommunity;
      reasoning.push(`✓ Positive community impact: ${(action.impactOnCommunity * 100).toFixed(0)}%`);
    } else {
      reasoning.push(`✗ Negative community impact: ${(action.impactOnCommunity * 100).toFixed(0)}%`);
    }
    
    // Check data sovereignty (Amānah)
    if (action.dataSovereignty) {
      score += 0.2;
      reasoning.push('✓ Data sovereignty preserved');
    } else {
      reasoning.push('✗ Data sovereignty compromised');
    }
    
    // Check transparency (Itqān)
    score += 0.2 * action.transparencyLevel;
    if (action.transparencyLevel >= 0.8) {
      reasoning.push(`✓ High transparency: ${(action.transparencyLevel * 100).toFixed(0)}%`);
    } else {
      reasoning.push(`⚠ Transparency could be improved: ${(action.transparencyLevel * 100).toFixed(0)}%`);
    }
    
    return {
      approved: score >= 0.7 && action.impactOnUsers >= 0 && action.dataSovereignty,
      score: Math.round(score * 100) / 100,
      reasoning
    };
  }
  
  /**
   * Get current system health summary
   */
  getHealthSummary(): string {
    const result = this.calculateCompositeScore();
    
    return `
╔══════════════════════════════════════════════════════════════════╗
║                    BIZRA Ihsān Health Report                     ║
╠══════════════════════════════════════════════════════════════════╣
║  Composite Score: ${(result.composite * 100).toFixed(1).padStart(5)}%  │  Status: ${result.status.padEnd(17)} ║
╠══════════════════════════════════════════════════════════════════╣
║  إتقان (Itqān/Excellence):     ${((this.dimensions[0].score || 0) * 100).toFixed(1).padStart(5)}%                         ║
║  أمانة (Amānah/Trust):         ${((this.dimensions[1].score || 0) * 100).toFixed(1).padStart(5)}%                         ║
║  عدل (Adl/Justice):            ${((this.dimensions[2].score || 0) * 100).toFixed(1).padStart(5)}%                         ║
║  إحسان (Ihsān/Benevolence):    ${((this.dimensions[3].score || 0) * 100).toFixed(1).padStart(5)}%                         ║
╚══════════════════════════════════════════════════════════════════╝
    `.trim();
  }
}

// Export singleton instance
export const ihsanScoring = new IhsanScoringSystem();
