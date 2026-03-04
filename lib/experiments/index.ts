/**
 * A/B Testing & Experimentation Framework
 * 
 * Elite experimentation infrastructure with:
 * - Experiment definition and management
 * - Consistent variant assignment
 * - Metrics tracking and event collection
 * - Statistical significance calculation
 * - Experiment lifecycle management
 * 
 * @module lib/experiments
 */

import { featureFlags, type EvaluationContext } from '@/lib/feature-flags';

// Experiment types
export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed' | 'archived';
export type MetricType = 'conversion' | 'count' | 'revenue' | 'duration' | 'custom';

export interface Experiment {
  id: string;
  key: string;
  name: string;
  description?: string;
  hypothesis?: string;
  status: ExperimentStatus;
  variants: ExperimentVariant[];
  metrics: ExperimentMetric[];
  targetingRules?: TargetingRule[];
  trafficAllocation: number; // 0-100 percentage of traffic
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  metadata?: Record<string, unknown>;
}

export interface ExperimentVariant {
  key: string;
  name: string;
  description?: string;
  weight: number; // Percentage weight (should sum to 100)
  isControl: boolean;
  config?: Record<string, unknown>;
}

export interface ExperimentMetric {
  key: string;
  name: string;
  type: MetricType;
  description?: string;
  isPrimary: boolean;
  minimumDetectableEffect?: number; // MDE percentage
  expectedBaseline?: number;
}

export interface TargetingRule {
  attribute: string;
  operator: 'eq' | 'neq' | 'in' | 'notIn' | 'gt' | 'lt' | 'gte' | 'lte';
  value: string | number | boolean | string[];
}

export interface ExperimentAssignment {
  experimentId: string;
  experimentKey: string;
  variantKey: string;
  variantName: string;
  userId: string;
  timestamp: number;
  inExperiment: boolean;
}

export interface ExperimentEvent {
  experimentId: string;
  variantKey: string;
  userId: string;
  metricKey: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ExperimentResults {
  experimentId: string;
  experimentKey: string;
  status: ExperimentStatus;
  totalParticipants: number;
  variantResults: VariantResult[];
  metrics: MetricResult[];
  startDate: string;
  endDate?: string;
  duration: number; // days
  statisticalPower?: number;
}

export interface VariantResult {
  variantKey: string;
  variantName: string;
  participants: number;
  percentage: number;
}

export interface MetricResult {
  metricKey: string;
  metricName: string;
  isPrimary: boolean;
  variants: {
    variantKey: string;
    sampleSize: number;
    mean: number;
    standardDeviation: number;
    confidenceInterval: [number, number];
  }[];
  controlVariant: string;
  statisticalSignificance?: number; // p-value
  relativeUplift?: number; // percentage change vs control
  isSignificant: boolean;
}

// Hash function for consistent assignment
function hashUserId(userId: string, experimentKey: string): number {
  const combined = `${experimentKey}:${userId}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 10000; // Return value 0-9999 for 0.01% granularity
}

/**
 * Experiment Manager
 */
class ExperimentManager {
  private experiments: Map<string, Experiment> = new Map();
  private assignments: Map<string, ExperimentAssignment> = new Map();
  private events: ExperimentEvent[] = [];
  private eventListeners: ((event: ExperimentEvent) => void)[] = [];
  private assignmentListeners: ((assignment: ExperimentAssignment) => void)[] = [];

  constructor() {
    this.registerDefaultExperiments();
  }

  /**
   * Register default experiments
   */
  private registerDefaultExperiments(): void {
    const now = new Date().toISOString();

    // Example experiment: New onboarding flow
    this.register({
      id: 'exp_001',
      key: 'new_onboarding_flow',
      name: 'New Onboarding Flow',
      description: 'Testing a streamlined onboarding experience',
      hypothesis: 'A simplified onboarding flow will increase completion rates by 15%',
      status: 'running',
      trafficAllocation: 50, // 50% of users
      variants: [
        { key: 'control', name: 'Control', weight: 50, isControl: true },
        { key: 'streamlined', name: 'Streamlined Flow', weight: 50, isControl: false },
      ],
      metrics: [
        { key: 'onboarding_completion', name: 'Onboarding Completion Rate', type: 'conversion', isPrimary: true, minimumDetectableEffect: 15 },
        { key: 'time_to_complete', name: 'Time to Complete', type: 'duration', isPrimary: false },
        { key: 'drop_off_rate', name: 'Drop-off Rate', type: 'conversion', isPrimary: false },
      ],
      createdAt: now,
      updatedAt: now,
    });

    // Example experiment: Dashboard layout
    this.register({
      id: 'exp_002',
      key: 'dashboard_layout',
      name: 'Dashboard Layout Test',
      description: 'Testing different dashboard layouts for engagement',
      status: 'running',
      trafficAllocation: 100,
      variants: [
        { key: 'control', name: 'Classic Layout', weight: 34, isControl: true },
        { key: 'grid', name: 'Grid Layout', weight: 33, isControl: false },
        { key: 'modular', name: 'Modular Layout', weight: 33, isControl: false },
      ],
      metrics: [
        { key: 'engagement_time', name: 'Engagement Time', type: 'duration', isPrimary: true },
        { key: 'feature_discovery', name: 'Feature Discovery', type: 'count', isPrimary: false },
        { key: 'user_satisfaction', name: 'User Satisfaction', type: 'custom', isPrimary: false },
      ],
      createdAt: now,
      updatedAt: now,
    });

    // Example experiment: CTA button color
    this.register({
      id: 'exp_003',
      key: 'cta_button_color',
      name: 'CTA Button Color Test',
      description: 'Testing button colors for conversion optimization',
      status: 'running',
      trafficAllocation: 100,
      variants: [
        { key: 'control', name: 'Default Blue', weight: 25, isControl: true, config: { color: '#3b82f6' } },
        { key: 'green', name: 'Green', weight: 25, isControl: false, config: { color: '#22c55e' } },
        { key: 'orange', name: 'Orange', weight: 25, isControl: false, config: { color: '#f97316' } },
        { key: 'purple', name: 'Purple', weight: 25, isControl: false, config: { color: '#a855f7' } },
      ],
      metrics: [
        { key: 'click_rate', name: 'Click Rate', type: 'conversion', isPrimary: true, minimumDetectableEffect: 10 },
        { key: 'conversion_rate', name: 'Conversion Rate', type: 'conversion', isPrimary: true },
      ],
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Register a new experiment
   */
  register(experiment: Omit<Experiment, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string }): void {
    const now = new Date().toISOString();
    this.experiments.set(experiment.key, {
      ...experiment,
      createdAt: experiment.createdAt || now,
      updatedAt: experiment.updatedAt || now,
    });
  }

  /**
   * Get experiment assignment for a user
   */
  getAssignment(experimentKey: string, context: EvaluationContext): ExperimentAssignment {
    const userId = context.userId || context.sessionId || 'anonymous';
    const cacheKey = `${experimentKey}:${userId}`;

    // Check cache first
    const cached = this.assignments.get(cacheKey);
    if (cached) {
      return cached;
    }

    const experiment = this.experiments.get(experimentKey);
    
    if (!experiment || experiment.status !== 'running') {
      const assignment: ExperimentAssignment = {
        experimentId: experiment?.id || 'unknown',
        experimentKey,
        variantKey: 'control',
        variantName: 'Control',
        userId,
        timestamp: Date.now(),
        inExperiment: false,
      };
      return assignment;
    }

    // Check targeting rules
    if (experiment.targetingRules && !this.matchesTargeting(experiment.targetingRules, context)) {
      const controlVariant = experiment.variants.find(v => v.isControl) || experiment.variants[0];
      const assignment: ExperimentAssignment = {
        experimentId: experiment.id,
        experimentKey,
        variantKey: controlVariant.key,
        variantName: controlVariant.name,
        userId,
        timestamp: Date.now(),
        inExperiment: false,
      };
      return assignment;
    }

    // Check traffic allocation
    const trafficBucket = hashUserId(userId, `${experimentKey}:traffic`) % 100;
    if (trafficBucket >= experiment.trafficAllocation) {
      const controlVariant = experiment.variants.find(v => v.isControl) || experiment.variants[0];
      const assignment: ExperimentAssignment = {
        experimentId: experiment.id,
        experimentKey,
        variantKey: controlVariant.key,
        variantName: controlVariant.name,
        userId,
        timestamp: Date.now(),
        inExperiment: false,
      };
      return assignment;
    }

    // Assign to variant based on weights
    const variantBucket = hashUserId(userId, experimentKey);
    const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
    const normalizedBucket = (variantBucket / 10000) * totalWeight;

    let cumulativeWeight = 0;
    let selectedVariant = experiment.variants[0];
    
    for (const variant of experiment.variants) {
      cumulativeWeight += variant.weight;
      if (normalizedBucket < cumulativeWeight) {
        selectedVariant = variant;
        break;
      }
    }

    const assignment: ExperimentAssignment = {
      experimentId: experiment.id,
      experimentKey,
      variantKey: selectedVariant.key,
      variantName: selectedVariant.name,
      userId,
      timestamp: Date.now(),
      inExperiment: true,
    };

    // Cache and notify
    this.assignments.set(cacheKey, assignment);
    this.notifyAssignmentListeners(assignment);

    return assignment;
  }

  /**
   * Check if user matches targeting rules
   */
  private matchesTargeting(rules: TargetingRule[], context: EvaluationContext): boolean {
    for (const rule of rules) {
      const value = this.getContextValue(rule.attribute, context);
      if (!this.evaluateRule(rule, value)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get value from context
   */
  private getContextValue(attribute: string, context: EvaluationContext): unknown {
    const parts = attribute.split('.');
    let value: unknown = context;
    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = (value as Record<string, unknown>)[part];
    }
    return value;
  }

  /**
   * Evaluate a targeting rule
   */
  private evaluateRule(rule: TargetingRule, value: unknown): boolean {
    switch (rule.operator) {
      case 'eq': return value === rule.value;
      case 'neq': return value !== rule.value;
      case 'in': return Array.isArray(rule.value) && rule.value.includes(value as string);
      case 'notIn': return Array.isArray(rule.value) && !rule.value.includes(value as string);
      case 'gt': return typeof value === 'number' && value > (rule.value as number);
      case 'lt': return typeof value === 'number' && value < (rule.value as number);
      case 'gte': return typeof value === 'number' && value >= (rule.value as number);
      case 'lte': return typeof value === 'number' && value <= (rule.value as number);
      default: return false;
    }
  }

  /**
   * Track an experiment event/metric
   */
  track(
    experimentKey: string,
    metricKey: string,
    value: number,
    context: EvaluationContext,
    metadata?: Record<string, unknown>
  ): void {
    const userId = context.userId || context.sessionId || 'anonymous';
    const assignment = this.getAssignment(experimentKey, context);

    if (!assignment.inExperiment) {
      return; // Don't track for users not in experiment
    }

    const event: ExperimentEvent = {
      experimentId: assignment.experimentId,
      variantKey: assignment.variantKey,
      userId,
      metricKey,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.events.push(event);
    this.notifyEventListeners(event);
  }

  /**
   * Track a conversion event (value = 1)
   */
  trackConversion(
    experimentKey: string,
    metricKey: string,
    context: EvaluationContext,
    metadata?: Record<string, unknown>
  ): void {
    this.track(experimentKey, metricKey, 1, context, metadata);
  }

  /**
   * Get experiment results
   */
  getResults(experimentKey: string): ExperimentResults | null {
    const experiment = this.experiments.get(experimentKey);
    if (!experiment) return null;

    const experimentEvents = this.events.filter(e => 
      this.experiments.get(experimentKey)?.id === e.experimentId
    );

    // Calculate participants per variant
    const participantsByVariant = new Map<string, Set<string>>();
    for (const event of experimentEvents) {
      if (!participantsByVariant.has(event.variantKey)) {
        participantsByVariant.set(event.variantKey, new Set());
      }
      participantsByVariant.get(event.variantKey)!.add(event.userId);
    }

    const totalParticipants = new Set(experimentEvents.map(e => e.userId)).size;

    const variantResults: VariantResult[] = experiment.variants.map(variant => {
      const participants = participantsByVariant.get(variant.key)?.size || 0;
      return {
        variantKey: variant.key,
        variantName: variant.name,
        participants,
        percentage: totalParticipants > 0 ? (participants / totalParticipants) * 100 : 0,
      };
    });

    // Calculate metrics
    const controlVariant = experiment.variants.find(v => v.isControl)?.key || experiment.variants[0].key;
    const metricResults: MetricResult[] = experiment.metrics.map(metric => {
      const variantMetrics = experiment.variants.map(variant => {
        const variantEvents = experimentEvents.filter(
          e => e.variantKey === variant.key && e.metricKey === metric.key
        );
        const values = variantEvents.map(e => e.value);
        const sampleSize = values.length;
        const mean = sampleSize > 0 ? values.reduce((a, b) => a + b, 0) / sampleSize : 0;
        const variance = sampleSize > 1 
          ? values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (sampleSize - 1)
          : 0;
        const standardDeviation = Math.sqrt(variance);
        const standardError = sampleSize > 0 ? standardDeviation / Math.sqrt(sampleSize) : 0;
        const confidenceInterval: [number, number] = [
          mean - 1.96 * standardError,
          mean + 1.96 * standardError,
        ];

        return {
          variantKey: variant.key,
          sampleSize,
          mean,
          standardDeviation,
          confidenceInterval,
        };
      });

      // Calculate statistical significance (simplified z-test)
      const control = variantMetrics.find(v => v.variantKey === controlVariant);
      let isSignificant = false;
      let relativeUplift: number | undefined;
      let statisticalSignificance: number | undefined;

      if (control && control.sampleSize > 30) {
        const treatment = variantMetrics.find(v => v.variantKey !== controlVariant);
        if (treatment && treatment.sampleSize > 30) {
          const pooledSE = Math.sqrt(
            (Math.pow(control.standardDeviation, 2) / control.sampleSize) +
            (Math.pow(treatment.standardDeviation, 2) / treatment.sampleSize)
          );
          
          if (pooledSE > 0) {
            const zScore = (treatment.mean - control.mean) / pooledSE;
            // Two-tailed p-value approximation
            statisticalSignificance = 2 * (1 - this.normalCDF(Math.abs(zScore)));
            isSignificant = statisticalSignificance < 0.05;
            relativeUplift = control.mean !== 0 
              ? ((treatment.mean - control.mean) / control.mean) * 100 
              : 0;
          }
        }
      }

      return {
        metricKey: metric.key,
        metricName: metric.name,
        isPrimary: metric.isPrimary,
        variants: variantMetrics,
        controlVariant,
        statisticalSignificance,
        relativeUplift,
        isSignificant,
      };
    });

    const startDate = experiment.startDate || experiment.createdAt;
    const duration = Math.floor(
      (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      experimentId: experiment.id,
      experimentKey: experiment.key,
      status: experiment.status,
      totalParticipants,
      variantResults,
      metrics: metricResults,
      startDate,
      endDate: experiment.endDate,
      duration,
    };
  }

  /**
   * Normal CDF approximation for p-value calculation
   */
  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  /**
   * Get all experiments
   */
  getAllExperiments(): Experiment[] {
    return Array.from(this.experiments.values());
  }

  /**
   * Get experiment by key
   */
  getExperiment(key: string): Experiment | undefined {
    return this.experiments.get(key);
  }

  /**
   * Update experiment status
   */
  updateStatus(key: string, status: ExperimentStatus): void {
    const experiment = this.experiments.get(key);
    if (experiment) {
      experiment.status = status;
      experiment.updatedAt = new Date().toISOString();
      
      if (status === 'completed' && !experiment.endDate) {
        experiment.endDate = new Date().toISOString();
      }
    }
  }

  /**
   * Add event listener
   */
  onEvent(listener: (event: ExperimentEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index > -1) this.eventListeners.splice(index, 1);
    };
  }

  /**
   * Add assignment listener
   */
  onAssignment(listener: (assignment: ExperimentAssignment) => void): () => void {
    this.assignmentListeners.push(listener);
    return () => {
      const index = this.assignmentListeners.indexOf(listener);
      if (index > -1) this.assignmentListeners.splice(index, 1);
    };
  }

  private notifyEventListeners(event: ExperimentEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[Experiments] Event listener error:', error);
      }
    }
  }

  private notifyAssignmentListeners(assignment: ExperimentAssignment): void {
    for (const listener of this.assignmentListeners) {
      try {
        listener(assignment);
      } catch (error) {
        console.error('[Experiments] Assignment listener error:', error);
      }
    }
  }

  /**
   * Clear all cached assignments (useful for testing)
   */
  clearAssignments(): void {
    this.assignments.clear();
  }

  /**
   * Clear all events (useful for testing)
   */
  clearEvents(): void {
    this.events = [];
  }
}

// Create singleton instance
export const experiments = new ExperimentManager();

// React hooks
import { useState, useEffect, useCallback } from 'react';

/**
 * React hook for experiment assignment
 */
export function useExperiment(
  experimentKey: string,
  context: EvaluationContext
): {
  variant: string;
  variantName: string;
  inExperiment: boolean;
  config?: Record<string, unknown>;
  track: (metricKey: string, value?: number) => void;
} {
  const [assignment, setAssignment] = useState<ExperimentAssignment | null>(null);

  useEffect(() => {
    const result = experiments.getAssignment(experimentKey, context);
    setAssignment(result);
  }, [experimentKey, JSON.stringify(context)]);

  const track = useCallback((metricKey: string, value = 1) => {
    experiments.track(experimentKey, metricKey, value, context);
  }, [experimentKey, context]);

  const experiment = experiments.getExperiment(experimentKey);
  const variantConfig = experiment?.variants.find(v => v.key === assignment?.variantKey)?.config;

  return {
    variant: assignment?.variantKey || 'control',
    variantName: assignment?.variantName || 'Control',
    inExperiment: assignment?.inExperiment || false,
    config: variantConfig,
    track,
  };
}

/**
 * React hook for tracking experiment events
 */
export function useExperimentTracking(experimentKey: string, context: EvaluationContext) {
  const track = useCallback((metricKey: string, value = 1, metadata?: Record<string, unknown>) => {
    experiments.track(experimentKey, metricKey, value, context, metadata);
  }, [experimentKey, context]);

  const trackConversion = useCallback((metricKey: string, metadata?: Record<string, unknown>) => {
    experiments.trackConversion(experimentKey, metricKey, context, metadata);
  }, [experimentKey, context]);

  return { track, trackConversion };
}

// Export manager class
export { ExperimentManager };
