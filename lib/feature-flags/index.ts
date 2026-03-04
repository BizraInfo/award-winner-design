/**
 * Feature Flags System
 * 
 * Elite feature management with:
 * - Runtime flag toggling
 * - Percentage-based rollouts
 * - User/segment targeting
 * - A/B experiment integration
 * - Environment-aware defaults
 * 
 * @module lib/feature-flags
 */

// Feature flag types
export type FlagValue = boolean | string | number | Record<string, unknown>;

export interface FeatureFlag {
  key: string;
  name: string;
  description?: string;
  defaultValue: FlagValue;
  enabled: boolean;
  rules?: FlagRule[];
  variants?: FlagVariant[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface FlagRule {
  id: string;
  priority: number;
  conditions: FlagCondition[];
  value: FlagValue;
  percentage?: number; // 0-100 for gradual rollout
}

export interface FlagCondition {
  attribute: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'notIn' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
  value: string | number | boolean | string[];
}

export interface FlagVariant {
  key: string;
  name: string;
  value: FlagValue;
  weight: number; // Percentage weight for distribution
}

export interface EvaluationContext {
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  country?: string;
  region?: string;
  platform?: 'web' | 'ios' | 'android' | 'desktop';
  appVersion?: string;
  userAttributes?: Record<string, unknown>;
  requestId?: string;
  timestamp?: number;
}

export interface EvaluationResult {
  flagKey: string;
  value: FlagValue;
  variant?: string;
  reason: 'default' | 'rule_match' | 'percentage_rollout' | 'variant' | 'disabled' | 'error';
  ruleId?: string;
  evaluationTime: number;
}

// Hash function for consistent user assignment
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Get percentage bucket (0-99) for consistent user assignment
function getPercentageBucket(userId: string, flagKey: string): number {
  const combined = `${flagKey}:${userId}`;
  return hashString(combined) % 100;
}

/**
 * Feature Flag Manager
 */
class FeatureFlagManager {
  private flags: Map<string, FeatureFlag> = new Map();
  private overrides: Map<string, FlagValue> = new Map();
  private evaluationListeners: ((result: EvaluationResult) => void)[] = [];
  private defaultContext: Partial<EvaluationContext> = {};

  constructor() {
    // Initialize with default flags
    this.registerDefaultFlags();
  }

  /**
   * Register default feature flags
   */
  private registerDefaultFlags(): void {
    const defaultFlags: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>[] = [
      {
        key: 'dark_mode',
        name: 'Dark Mode',
        description: 'Enable dark mode UI theme',
        defaultValue: true,
        enabled: true,
      },
      {
        key: 'new_dashboard',
        name: 'New Dashboard',
        description: 'Enable redesigned dashboard experience',
        defaultValue: false,
        enabled: true,
        rules: [
          {
            id: 'beta_users',
            priority: 1,
            conditions: [
              { attribute: 'userAttributes.beta', operator: 'eq', value: true }
            ],
            value: true,
          },
        ],
      },
      {
        key: 'ai_suggestions',
        name: 'AI Suggestions',
        description: 'Enable AI-powered suggestions',
        defaultValue: false,
        enabled: true,
        rules: [
          {
            id: 'gradual_rollout',
            priority: 1,
            conditions: [],
            value: true,
            percentage: 25, // 25% rollout
          },
        ],
      },
      {
        key: '3d_visualization',
        name: '3D Visualization',
        description: 'Enable Three.js 3D visualizations',
        defaultValue: true,
        enabled: true,
        rules: [
          {
            id: 'low_end_devices',
            priority: 1,
            conditions: [
              { attribute: 'userAttributes.gpuTier', operator: 'eq', value: 'low' }
            ],
            value: false, // Disable for low-end devices
          },
        ],
      },
      {
        key: 'experimental_features',
        name: 'Experimental Features',
        description: 'Enable experimental features for testing',
        defaultValue: false,
        enabled: process.env.NODE_ENV !== 'production',
      },
      {
        key: 'performance_monitoring',
        name: 'Performance Monitoring',
        description: 'Enable detailed performance monitoring',
        defaultValue: true,
        enabled: true,
      },
      {
        key: 'websocket_updates',
        name: 'WebSocket Updates',
        description: 'Enable real-time WebSocket updates',
        defaultValue: true,
        enabled: true,
      },
      {
        key: 'offline_mode',
        name: 'Offline Mode',
        description: 'Enable offline-first functionality',
        defaultValue: false,
        enabled: true,
        rules: [
          {
            id: 'pwa_users',
            priority: 1,
            conditions: [
              { attribute: 'platform', operator: 'eq', value: 'web' }
            ],
            value: true,
            percentage: 50,
          },
        ],
      },
    ];

    const now = new Date().toISOString();
    for (const flag of defaultFlags) {
      this.flags.set(flag.key, {
        ...flag,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  /**
   * Register a new feature flag
   */
  register(flag: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>): void {
    const now = new Date().toISOString();
    this.flags.set(flag.key, {
      ...flag,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Update an existing feature flag
   */
  update(key: string, updates: Partial<FeatureFlag>): void {
    const existing = this.flags.get(key);
    if (existing) {
      this.flags.set(key, {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Set a local override for a flag (useful for testing)
   */
  setOverride(key: string, value: FlagValue): void {
    this.overrides.set(key, value);
  }

  /**
   * Clear a local override
   */
  clearOverride(key: string): void {
    this.overrides.delete(key);
  }

  /**
   * Clear all local overrides
   */
  clearAllOverrides(): void {
    this.overrides.clear();
  }

  /**
   * Set default context for all evaluations
   */
  setDefaultContext(context: Partial<EvaluationContext>): void {
    this.defaultContext = context;
  }

  /**
   * Evaluate a feature flag
   */
  evaluate(key: string, context?: EvaluationContext): EvaluationResult {
    const startTime = performance.now();
    const mergedContext = { ...this.defaultContext, ...context, timestamp: Date.now() };
    
    // Check for override first
    if (this.overrides.has(key)) {
      const result: EvaluationResult = {
        flagKey: key,
        value: this.overrides.get(key)!,
        reason: 'rule_match',
        ruleId: 'override',
        evaluationTime: performance.now() - startTime,
      };
      this.notifyListeners(result);
      return result;
    }

    const flag = this.flags.get(key);
    
    // Flag not found - return default
    if (!flag) {
      const result: EvaluationResult = {
        flagKey: key,
        value: false,
        reason: 'error',
        evaluationTime: performance.now() - startTime,
      };
      this.notifyListeners(result);
      return result;
    }

    // Flag disabled - return default
    if (!flag.enabled) {
      const result: EvaluationResult = {
        flagKey: key,
        value: flag.defaultValue,
        reason: 'disabled',
        evaluationTime: performance.now() - startTime,
      };
      this.notifyListeners(result);
      return result;
    }

    // Evaluate rules in priority order
    if (flag.rules && flag.rules.length > 0) {
      const sortedRules = [...flag.rules].sort((a, b) => a.priority - b.priority);
      
      for (const rule of sortedRules) {
        // Check conditions
        const conditionsMet = this.evaluateConditions(rule.conditions, mergedContext);
        
        if (conditionsMet) {
          // Check percentage rollout
          if (rule.percentage !== undefined && rule.percentage < 100) {
            const userId = mergedContext.userId || mergedContext.sessionId || 'anonymous';
            const bucket = getPercentageBucket(userId, key);
            
            if (bucket >= rule.percentage) {
              continue; // User not in rollout percentage
            }
          }
          
          const result: EvaluationResult = {
            flagKey: key,
            value: rule.value,
            reason: rule.percentage !== undefined ? 'percentage_rollout' : 'rule_match',
            ruleId: rule.id,
            evaluationTime: performance.now() - startTime,
          };
          this.notifyListeners(result);
          return result;
        }
      }
    }

    // Evaluate variants if present
    if (flag.variants && flag.variants.length > 0) {
      const userId = mergedContext.userId || mergedContext.sessionId || 'anonymous';
      const variant = this.selectVariant(flag.variants, userId, key);
      
      if (variant) {
        const result: EvaluationResult = {
          flagKey: key,
          value: variant.value,
          variant: variant.key,
          reason: 'variant',
          evaluationTime: performance.now() - startTime,
        };
        this.notifyListeners(result);
        return result;
      }
    }

    // Return default value
    const result: EvaluationResult = {
      flagKey: key,
      value: flag.defaultValue,
      reason: 'default',
      evaluationTime: performance.now() - startTime,
    };
    this.notifyListeners(result);
    return result;
  }

  /**
   * Evaluate conditions against context
   */
  private evaluateConditions(conditions: FlagCondition[], context: EvaluationContext): boolean {
    if (conditions.length === 0) return true;

    for (const condition of conditions) {
      const attributeValue = this.getAttributeValue(condition.attribute, context);
      const matches = this.evaluateCondition(condition, attributeValue);
      
      if (!matches) return false; // AND logic for conditions
    }

    return true;
  }

  /**
   * Get attribute value from context using dot notation
   */
  private getAttributeValue(attribute: string, context: EvaluationContext): unknown {
    const parts = attribute.split('.');
    let value: unknown = context;

    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = (value as Record<string, unknown>)[part];
    }

    return value;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: FlagCondition, attributeValue: unknown): boolean {
    const { operator, value } = condition;

    switch (operator) {
      case 'eq':
        return attributeValue === value;
      case 'neq':
        return attributeValue !== value;
      case 'gt':
        return typeof attributeValue === 'number' && attributeValue > (value as number);
      case 'gte':
        return typeof attributeValue === 'number' && attributeValue >= (value as number);
      case 'lt':
        return typeof attributeValue === 'number' && attributeValue < (value as number);
      case 'lte':
        return typeof attributeValue === 'number' && attributeValue <= (value as number);
      case 'in':
        return Array.isArray(value) && value.includes(attributeValue as string);
      case 'notIn':
        return Array.isArray(value) && !value.includes(attributeValue as string);
      case 'contains':
        return typeof attributeValue === 'string' && attributeValue.includes(value as string);
      case 'startsWith':
        return typeof attributeValue === 'string' && attributeValue.startsWith(value as string);
      case 'endsWith':
        return typeof attributeValue === 'string' && attributeValue.endsWith(value as string);
      case 'regex':
        return typeof attributeValue === 'string' && new RegExp(value as string).test(attributeValue);
      default:
        return false;
    }
  }

  /**
   * Select a variant based on user ID (consistent hashing)
   */
  private selectVariant(variants: FlagVariant[], userId: string, flagKey: string): FlagVariant | null {
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight === 0) return null;

    const bucket = getPercentageBucket(userId, flagKey);
    const normalizedBucket = (bucket / 100) * totalWeight;

    let cumulativeWeight = 0;
    for (const variant of variants) {
      cumulativeWeight += variant.weight;
      if (normalizedBucket < cumulativeWeight) {
        return variant;
      }
    }

    return variants[variants.length - 1];
  }

  /**
   * Add evaluation listener
   */
  onEvaluation(listener: (result: EvaluationResult) => void): () => void {
    this.evaluationListeners.push(listener);
    return () => {
      const index = this.evaluationListeners.indexOf(listener);
      if (index > -1) {
        this.evaluationListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of evaluation
   */
  private notifyListeners(result: EvaluationResult): void {
    for (const listener of this.evaluationListeners) {
      try {
        listener(result);
      } catch (error) {
        console.error('[FeatureFlags] Listener error:', error);
      }
    }
  }

  /**
   * Get all flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Get a specific flag definition
   */
  getFlag(key: string): FeatureFlag | undefined {
    return this.flags.get(key);
  }

  /**
   * Check if a flag exists
   */
  hasFlag(key: string): boolean {
    return this.flags.has(key);
  }

  /**
   * Boolean helper - evaluate flag as boolean
   */
  isEnabled(key: string, context?: EvaluationContext): boolean {
    const result = this.evaluate(key, context);
    return Boolean(result.value);
  }

  /**
   * String helper - evaluate flag as string
   */
  getString(key: string, context?: EvaluationContext): string {
    const result = this.evaluate(key, context);
    return String(result.value);
  }

  /**
   * Number helper - evaluate flag as number
   */
  getNumber(key: string, context?: EvaluationContext): number {
    const result = this.evaluate(key, context);
    return Number(result.value);
  }

  /**
   * JSON helper - evaluate flag as object
   */
  getJSON<T = Record<string, unknown>>(key: string, context?: EvaluationContext): T {
    const result = this.evaluate(key, context);
    return result.value as T;
  }

  /**
   * Export all flags as JSON (for persistence/sync)
   */
  exportFlags(): string {
    const flags = Object.fromEntries(this.flags);
    return JSON.stringify(flags, null, 2);
  }

  /**
   * Import flags from JSON
   */
  importFlags(json: string): void {
    try {
      const flags = JSON.parse(json);
      for (const [key, flag] of Object.entries(flags)) {
        this.flags.set(key, flag as FeatureFlag);
      }
    } catch (error) {
      console.error('[FeatureFlags] Import error:', error);
    }
  }
}

// Create singleton instance
export const featureFlags = new FeatureFlagManager();

// React hook for feature flags
import { useState, useEffect, useMemo } from 'react';

export function useFeatureFlag(
  key: string,
  context?: EvaluationContext
): { value: FlagValue; isEnabled: boolean; variant?: string; isLoading: boolean } {
  const [result, setResult] = useState<EvaluationResult | null>(null);

  useEffect(() => {
    const evaluation = featureFlags.evaluate(key, context);
    setResult(evaluation);

    // Listen for changes
    const unsubscribe = featureFlags.onEvaluation((newResult) => {
      if (newResult.flagKey === key) {
        setResult(newResult);
      }
    });

    return unsubscribe;
  }, [key, JSON.stringify(context)]);

  return useMemo(() => ({
    value: result?.value ?? false,
    isEnabled: Boolean(result?.value),
    variant: result?.variant,
    isLoading: result === null,
  }), [result]);
}

/**
 * React hook for multiple feature flags
 */
export function useFeatureFlags(
  keys: string[],
  context?: EvaluationContext
): Record<string, { value: FlagValue; isEnabled: boolean }> {
  const [results, setResults] = useState<Record<string, EvaluationResult>>({});

  useEffect(() => {
    const newResults: Record<string, EvaluationResult> = {};
    for (const key of keys) {
      newResults[key] = featureFlags.evaluate(key, context);
    }
    setResults(newResults);
  }, [keys.join(','), JSON.stringify(context)]);

  return useMemo(() => {
    const mapped: Record<string, { value: FlagValue; isEnabled: boolean }> = {};
    for (const key of keys) {
      const result = results[key];
      mapped[key] = {
        value: result?.value ?? false,
        isEnabled: Boolean(result?.value),
      };
    }
    return mapped;
  }, [results, keys]);
}

// Export manager class for custom instances
export { FeatureFlagManager };
