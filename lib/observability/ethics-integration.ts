// lib/observability/ethics-integration.ts
/**
 * SAPE/Ihsan Observability Integration
 * 
 * Bridges the symbolic ethics frameworks (SAPE, Ihsan) with runtime
 * observability metrics, enabling:
 * - Real-time ethics scoring
 * - Compliance monitoring
 * - SNR tracking
 * - Risk assessment metrics
 */

import { IhsanScoringSystem, type SystemMetrics, type IhsanResult } from '../ihsan/scoring-system';
import type { SAPEAnalysisResult, SNRMetrics, AnalysisLens, Risk } from '../sape/framework';
import { metrics, healthChecks, logger } from './index';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface EthicsMetricsSnapshot {
  ihsan: IhsanResult;
  sape: {
    overallSNR: number;
    lensScores: Record<string, number>;
    riskCount: { critical: number; high: number; medium: number; low: number };
  };
  timestamp: Date;
}

export interface EthicsHealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  score: number;
  threshold: number;
  message: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// METRICS DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const IHSAN_METRICS = {
  composite: 'ihsan_composite_score',
  excellence: 'ihsan_itqan_score',
  trustworthiness: 'ihsan_amanah_score',
  justice: 'ihsan_adl_score',
  benevolence: 'ihsan_ihsan_score',
};

const SAPE_METRICS = {
  snr: 'sape_snr_ratio',
  security: 'sape_security_snr',
  performance: 'sape_performance_snr',
  architecture: 'sape_architecture_snr',
  documentation: 'sape_documentation_snr',
  risksCritical: 'sape_risks_critical',
  risksHigh: 'sape_risks_high',
  risksMedium: 'sape_risks_medium',
  risksLow: 'sape_risks_low',
};

// ═══════════════════════════════════════════════════════════════════════════════
// ETHICS MONITOR
// ═══════════════════════════════════════════════════════════════════════════════

class EthicsMonitor {
  private ihsanSystem: IhsanScoringSystem;
  private lastSnapshot: EthicsMetricsSnapshot | null = null;
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.ihsanSystem = new IhsanScoringSystem();
    this.registerHealthChecks();
  }

  /**
   * Update metrics from current system state
   */
  async updateFromSystemState(systemMetrics: Partial<SystemMetrics>): Promise<EthicsMetricsSnapshot> {
    // Fill in defaults for missing metrics
    const fullMetrics: SystemMetrics = {
      testCoverage: systemMetrics.testCoverage ?? 0,
      codeQualityScore: systemMetrics.codeQualityScore ?? 0,
      performanceScore: systemMetrics.performanceScore ?? 0,
      securityScore: systemMetrics.securityScore ?? 0,
      dataSovereigntyRatio: systemMetrics.dataSovereigntyRatio ?? 1,
      uptimePercentage: systemMetrics.uptimePercentage ?? 0.99,
      poiFairnessIndex: systemMetrics.poiFairnessIndex ?? 0.5,
      accessEquityRatio: systemMetrics.accessEquityRatio ?? 0.9,
      resourceDistributionScore: systemMetrics.resourceDistributionScore ?? 0.5,
      humanityBenefitScore: systemMetrics.humanityBenefitScore ?? 0.5,
      communityContributions: systemMetrics.communityContributions ?? 0,
      openSourceRatio: systemMetrics.openSourceRatio ?? 0.8,
    };

    // Update Ihsan scoring
    this.ihsanSystem.updateMetrics(fullMetrics);
    const ihsanResult = this.ihsanSystem.calculateCompositeScore();

    // Export to Prometheus metrics
    this.exportIhsanMetrics(ihsanResult);

    // Create snapshot
    this.lastSnapshot = {
      ihsan: ihsanResult,
      sape: {
        overallSNR: this.calculateSAPESNR(fullMetrics),
        lensScores: this.calculateLensScores(fullMetrics),
        riskCount: { critical: 0, high: 0, medium: 0, low: 0 },
      },
      timestamp: new Date(),
    };

    logger.info('Ethics metrics updated', {
      ihsanComposite: ihsanResult.composite,
      ihsanStatus: ihsanResult.status,
      sapeSNR: this.lastSnapshot.sape.overallSNR,
    });

    return this.lastSnapshot;
  }

  /**
   * Export Ihsan scores to Prometheus metrics
   */
  private exportIhsanMetrics(result: IhsanResult): void {
    metrics.setGauge(IHSAN_METRICS.composite, result.composite);

    for (const dimension of result.dimensions) {
      const metricName = this.dimensionToMetricName(dimension.name);
      if (metricName) {
        metrics.setGauge(metricName, dimension.score ?? 0);
      }
    }
  }

  private dimensionToMetricName(dimensionName: string): string | null {
    switch (dimensionName) {
      case 'Excellence':
        return IHSAN_METRICS.excellence;
      case 'Trustworthiness':
        return IHSAN_METRICS.trustworthiness;
      case 'Justice':
        return IHSAN_METRICS.justice;
      case 'Benevolence':
        return IHSAN_METRICS.benevolence;
      default:
        return null;
    }
  }

  /**
   * Calculate overall SAPE SNR from system metrics
   */
  private calculateSAPESNR(systemMetrics: SystemMetrics): number {
    // Weighted average of key metrics as SNR proxy
    const weights = {
      security: 0.3,
      performance: 0.25,
      quality: 0.25,
      uptime: 0.2,
    };

    return (
      systemMetrics.securityScore * weights.security +
      systemMetrics.performanceScore * weights.performance +
      systemMetrics.codeQualityScore * weights.quality +
      systemMetrics.uptimePercentage * weights.uptime
    );
  }

  /**
   * Calculate individual lens SNR scores
   */
  private calculateLensScores(systemMetrics: SystemMetrics): Record<string, number> {
    return {
      security: systemMetrics.securityScore,
      performance: systemMetrics.performanceScore,
      architecture: systemMetrics.codeQualityScore,
      documentation: 0.7, // Placeholder - could be calculated from doc coverage
      scalability: (systemMetrics.uptimePercentage + systemMetrics.resourceDistributionScore) / 2,
    };
  }

  /**
   * Export SAPE risk counts to metrics
   */
  updateRiskMetrics(risks: Risk[]): void {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };

    for (const risk of risks) {
      counts[risk.severity]++;
    }

    metrics.setGauge(SAPE_METRICS.risksCritical, counts.critical);
    metrics.setGauge(SAPE_METRICS.risksHigh, counts.high);
    metrics.setGauge(SAPE_METRICS.risksMedium, counts.medium);
    metrics.setGauge(SAPE_METRICS.risksLow, counts.low);

    if (this.lastSnapshot) {
      this.lastSnapshot.sape.riskCount = counts;
    }
  }

  /**
   * Update from full SAPE analysis result
   */
  updateFromSAPEAnalysis(analysis: SAPEAnalysisResult): void {
    metrics.setGauge(SAPE_METRICS.snr, analysis.overallSNR);

    for (const lens of analysis.lenses) {
      const metricName = `sape_${lens.name.toLowerCase().replace(/\s+/g, '_')}_snr`;
      metrics.setGauge(metricName, lens.snrScore);
    }

    this.updateRiskMetrics(analysis.riskMatrix);

    logger.info('SAPE analysis metrics exported', {
      overallSNR: analysis.overallSNR,
      lensCount: analysis.lenses.length,
      riskCount: analysis.riskMatrix.length,
      actionCount: analysis.prioritizedActions.length,
    });
  }

  /**
   * Register ethics-related health checks
   */
  private registerHealthChecks(): void {
    // Ihsan composite score health check
    healthChecks.register('ethics_ihsan', async () => {
      const score = this.lastSnapshot?.ihsan.composite ?? 0;
      const threshold = 0.7;

      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (score >= threshold) {
        status = 'healthy';
      } else if (score >= threshold * 0.7) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      return {
        name: 'ethics_ihsan',
        status,
        responseTime: 0,
        message: `Ihsan composite score: ${(score * 100).toFixed(1)}%`,
        details: { score, threshold, status: this.lastSnapshot?.ihsan.status },
        lastCheck: new Date().toISOString(),
      };
    });

    // Security ethics health check
    healthChecks.register('ethics_security', async () => {
      const securitySNR = this.lastSnapshot?.sape.lensScores.security ?? 0;
      const riskCount = this.lastSnapshot?.sape.riskCount ?? { critical: 0, high: 0, medium: 0, low: 0 };

      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (riskCount.critical > 0) {
        status = 'unhealthy';
      } else if (riskCount.high > 0 || securitySNR < 0.7) {
        status = 'degraded';
      } else {
        status = 'healthy';
      }

      return {
        name: 'ethics_security',
        status,
        responseTime: 0,
        message: `Security SNR: ${(securitySNR * 100).toFixed(1)}%, Critical risks: ${riskCount.critical}`,
        details: { securitySNR, riskCount },
        lastCheck: new Date().toISOString(),
      };
    });
  }

  /**
   * Get current snapshot
   */
  getSnapshot(): EthicsMetricsSnapshot | null {
    return this.lastSnapshot;
  }

  /**
   * Start periodic monitoring
   */
  startPeriodicUpdate(
    intervalMs: number,
    metricsProvider: () => Promise<Partial<SystemMetrics>>
  ): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      try {
        const systemMetrics = await metricsProvider();
        await this.updateFromSystemState(systemMetrics);
      } catch (error) {
        logger.error('Failed to update ethics metrics', { error });
      }
    }, intervalMs);

    // Run immediately
    metricsProvider()
      .then((m) => this.updateFromSystemState(m))
      .catch((e) => logger.error('Initial ethics metrics update failed', { error: e }));
  }

  /**
   * Stop periodic monitoring
   */
  stopPeriodicUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const ethicsMonitor = new EthicsMonitor();

/**
 * Quick helper to update ethics from partial metrics
 */
export async function updateEthicsMetrics(metrics: Partial<SystemMetrics>): Promise<EthicsMetricsSnapshot> {
  return ethicsMonitor.updateFromSystemState(metrics);
}

/**
 * Get current ethics status for API responses
 */
export function getEthicsStatus(): {
  ihsan: { score: number; status: string } | null;
  sape: { snr: number; risks: { critical: number; high: number } } | null;
} {
  const snapshot = ethicsMonitor.getSnapshot();

  if (!snapshot) {
    return { ihsan: null, sape: null };
  }

  return {
    ihsan: {
      score: snapshot.ihsan.composite,
      status: snapshot.ihsan.status,
    },
    sape: {
      snr: snapshot.sape.overallSNR,
      risks: {
        critical: snapshot.sape.riskCount.critical,
        high: snapshot.sape.riskCount.high,
      },
    },
  };
}
