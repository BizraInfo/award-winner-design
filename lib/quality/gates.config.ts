// lib/quality/gates.config.ts
/**
 * Quality Gates Configuration
 * 
 * Defines thresholds and rules for the 6-gate CI/CD pipeline
 * ensuring code quality, security, and performance standards.
 */

export interface QualityGateConfig {
  name: string;
  description: string;
  thresholds: Record<string, number | string | boolean>;
  failOnBreach: boolean;
  notifyOnWarning: boolean;
}

export interface QualityGatesConfiguration {
  gates: QualityGateConfig[];
  globalSettings: {
    enforceAllGates: boolean;
    allowOverrideWithApproval: boolean;
    notificationChannels: string[];
    reportFormat: 'json' | 'html' | 'markdown';
  };
}

export const qualityGatesConfig: QualityGatesConfiguration = {
  globalSettings: {
    enforceAllGates: true,
    allowOverrideWithApproval: true,
    notificationChannels: ['slack', 'email'],
    reportFormat: 'markdown'
  },
  gates: [
    // ═══════════════════════════════════════════════════════════════
    // GATE 1: Code Quality & Linting
    // ═══════════════════════════════════════════════════════════════
    {
      name: 'Code Quality',
      description: 'Ensures code style, formatting, and type safety',
      failOnBreach: true,
      notifyOnWarning: true,
      thresholds: {
        // ESLint
        eslint_errors: 0,
        eslint_warnings_max: 10,
        
        // TypeScript
        typescript_strict: true,
        no_any_allowed: true,
        no_explicit_any_max: 5,
        
        // Code Style
        max_line_length: 100,
        max_file_lines: 500,
        max_function_lines: 50,
        max_complexity: 10,
        
        // Formatting
        prettier_compliant: true,
        
        // Debug Code
        console_log_allowed: false,
        debugger_allowed: false
      }
    },

    // ═══════════════════════════════════════════════════════════════
    // GATE 2: Testing
    // ═══════════════════════════════════════════════════════════════
    {
      name: 'Testing',
      description: 'Validates test coverage and test quality',
      failOnBreach: true,
      notifyOnWarning: true,
      thresholds: {
        // Coverage
        line_coverage_min: 80,
        branch_coverage_min: 75,
        function_coverage_min: 80,
        statement_coverage_min: 80,
        
        // Test Quality
        tests_must_pass: true,
        min_test_count: 100,
        max_test_duration_ms: 60000,
        
        // Test Types Required
        unit_tests_required: true,
        integration_tests_required: true,
        
        // Mutation Testing (when enabled)
        mutation_score_min: 70
      }
    },

    // ═══════════════════════════════════════════════════════════════
    // GATE 3: Security
    // ═══════════════════════════════════════════════════════════════
    {
      name: 'Security',
      description: 'Ensures no security vulnerabilities or secrets',
      failOnBreach: true,
      notifyOnWarning: true,
      thresholds: {
        // Dependency Vulnerabilities
        critical_vulnerabilities: 0,
        high_vulnerabilities: 0,
        medium_vulnerabilities_max: 5,
        
        // Secret Scanning
        secrets_detected: 0,
        api_keys_in_code: 0,
        
        // SAST
        sql_injection_findings: 0,
        xss_findings: 0,
        path_traversal_findings: 0,
        
        // License Compliance
        copyleft_licenses_allowed: false,
        unknown_licenses_allowed: false,
        allowed_licenses: 'MIT,Apache-2.0,BSD-2-Clause,BSD-3-Clause,ISC,0BSD',
        
        // Security Headers
        csp_configured: true,
        hsts_configured: true,
        csrf_protection: true
      }
    },

    // ═══════════════════════════════════════════════════════════════
    // GATE 4: Build & Bundle
    // ═══════════════════════════════════════════════════════════════
    {
      name: 'Build',
      description: 'Validates build output and bundle size',
      failOnBreach: true,
      notifyOnWarning: true,
      thresholds: {
        // Build Success
        build_must_succeed: true,
        
        // Bundle Size Limits (in KB)
        total_bundle_size_max_kb: 500,
        main_chunk_size_max_kb: 200,
        initial_js_max_kb: 150,
        
        // Code Splitting
        dynamic_imports_min: 5,
        
        // Image Optimization
        unoptimized_images_max: 0,
        
        // Asset Optimization
        unused_css_max_percent: 5,
        
        // Build Artifacts
        source_maps_generated: true,
        treeshaking_enabled: true
      }
    },

    // ═══════════════════════════════════════════════════════════════
    // GATE 5: E2E & Performance
    // ═══════════════════════════════════════════════════════════════
    {
      name: 'E2E & Performance',
      description: 'End-to-end tests and performance benchmarks',
      failOnBreach: true,
      notifyOnWarning: true,
      thresholds: {
        // E2E Tests
        e2e_tests_must_pass: true,
        visual_regression_threshold: 0.01,
        
        // Lighthouse Scores (0-100)
        lighthouse_performance_min: 90,
        lighthouse_accessibility_min: 95,
        lighthouse_best_practices_min: 90,
        lighthouse_seo_min: 90,
        
        // Core Web Vitals
        lcp_max_ms: 2500,          // Largest Contentful Paint
        fid_max_ms: 100,           // First Input Delay
        cls_max: 0.1,              // Cumulative Layout Shift
        ttfb_max_ms: 800,          // Time to First Byte
        
        // Performance Budgets
        time_to_interactive_max_ms: 3500,
        total_blocking_time_max_ms: 300,
        
        // Load Testing (K6)
        p95_response_time_max_ms: 500,
        p99_response_time_max_ms: 1000,
        error_rate_max_percent: 0.1
      }
    },

    // ═══════════════════════════════════════════════════════════════
    // GATE 6: Container & Deployment
    // ═══════════════════════════════════════════════════════════════
    {
      name: 'Container',
      description: 'Container security and deployment readiness',
      failOnBreach: true,
      notifyOnWarning: true,
      thresholds: {
        // Container Security (Trivy)
        container_critical_vulns: 0,
        container_high_vulns: 0,
        
        // Image Size
        image_size_max_mb: 500,
        image_layers_max: 15,
        
        // Best Practices
        non_root_user: true,
        no_secrets_in_env: true,
        health_check_configured: true,
        
        // Deployment
        replicas_min: 2,
        resource_limits_set: true,
        readiness_probe_configured: true,
        liveness_probe_configured: true,
        
        // Rollback Capability
        rollback_strategy_defined: true,
        canary_deployment_enabled: true
      }
    }
  ]
};

/**
 * Gate result interface
 */
export interface GateResult {
  gate: string;
  passed: boolean;
  score: number;
  breaches: string[];
  warnings: string[];
  details: Record<string, { value: number | string | boolean; threshold: number | string | boolean; passed: boolean }>;
}

/**
 * Evaluate a single quality gate
 */
export function evaluateGate(
  gate: QualityGateConfig,
  metrics: Record<string, number | string | boolean>
): GateResult {
  const breaches: string[] = [];
  const warnings: string[] = [];
  const details: GateResult['details'] = {};
  
  for (const [key, threshold] of Object.entries(gate.thresholds)) {
    const value = metrics[key];
    
    if (value === undefined) {
      warnings.push(`Missing metric: ${key}`);
      continue;
    }
    
    let passed = true;
    
    if (typeof threshold === 'number' && typeof value === 'number') {
      // For _max thresholds, value should be <= threshold
      // For _min thresholds, value should be >= threshold
      if (key.includes('_max')) {
        passed = value <= threshold;
      } else if (key.includes('_min')) {
        passed = value >= threshold;
      } else {
        // Exact match for counts (like errors: 0)
        passed = value <= threshold;
      }
    } else if (typeof threshold === 'boolean') {
      passed = value === threshold;
    } else if (typeof threshold === 'string' && typeof value === 'string') {
      // For comma-separated lists, check if value is in list
      const allowedValues = threshold.split(',');
      passed = allowedValues.includes(value);
    }
    
    details[key] = { value, threshold, passed };
    
    if (!passed) {
      breaches.push(`${key}: ${value} (threshold: ${threshold})`);
    }
  }
  
  // Calculate gate score (percentage of passing checks)
  const totalChecks = Object.keys(details).length;
  const passingChecks = Object.values(details).filter(d => d.passed).length;
  const score = totalChecks > 0 ? (passingChecks / totalChecks) * 100 : 0;
  
  return {
    gate: gate.name,
    passed: breaches.length === 0 || !gate.failOnBreach,
    score: Math.round(score * 100) / 100,
    breaches,
    warnings,
    details
  };
}

/**
 * Evaluate all quality gates
 */
export function evaluateAllGates(
  metrics: Record<string, Record<string, number | string | boolean>>
): { results: GateResult[]; overallPassed: boolean; overallScore: number } {
  const results: GateResult[] = [];
  
  for (const gate of qualityGatesConfig.gates) {
    const gateMetrics = metrics[gate.name.toLowerCase().replace(/ /g, '_')] || {};
    results.push(evaluateGate(gate, gateMetrics));
  }
  
  const overallPassed = qualityGatesConfig.globalSettings.enforceAllGates
    ? results.every(r => r.passed)
    : results.filter(r => r.passed).length > results.length / 2;
  
  const overallScore = results.length > 0
    ? results.reduce((sum, r) => sum + r.score, 0) / results.length
    : 0;
  
  return {
    results,
    overallPassed,
    overallScore: Math.round(overallScore * 100) / 100
  };
}

/**
 * Generate quality gates report
 */
export function generateGatesReport(
  results: GateResult[],
  overallPassed: boolean,
  overallScore: number
): string {
  const statusEmoji = overallPassed ? '✅' : '❌';
  const scoreColor = overallScore >= 90 ? '🟢' : overallScore >= 70 ? '🟡' : '🔴';
  
  let report = `
# Quality Gates Report

${statusEmoji} **Overall Status:** ${overallPassed ? 'PASSED' : 'FAILED'}
${scoreColor} **Overall Score:** ${overallScore}%

---

`;
  
  for (const result of results) {
    const gateEmoji = result.passed ? '✅' : '❌';
    
    report += `## ${gateEmoji} ${result.gate} (${result.score}%)

`;
    
    if (result.breaches.length > 0) {
      report += `**Breaches:**
${result.breaches.map(b => `- ❌ ${b}`).join('\n')}

`;
    }
    
    if (result.warnings.length > 0) {
      report += `**Warnings:**
${result.warnings.map(w => `- ⚠️ ${w}`).join('\n')}

`;
    }
    
    report += '---\n\n';
  }
  
  return report;
}
