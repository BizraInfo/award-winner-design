/**
 * BIZRA Node0 Genesis - Performance Thresholds Configuration
 * 
 * Elite performance standards aligned with industry SLOs
 * Based on Google SRE, AWS Well-Architected, and Netflix best practices
 */

export const thresholds = {
  // HTTP Request Duration - P95 should be under 200ms for API calls
  http_req_duration: [
    'p(50)<100',   // 50th percentile under 100ms
    'p(75)<150',   // 75th percentile under 150ms
    'p(90)<200',   // 90th percentile under 200ms
    'p(95)<250',   // 95th percentile under 250ms (SLO)
    'p(99)<500',   // 99th percentile under 500ms
    'avg<150',     // Average under 150ms
    'max<2000',    // Maximum under 2 seconds
  ],

  // HTTP Request Waiting (TTFB)
  http_req_waiting: [
    'p(90)<150',   // Time to first byte under 150ms
    'p(95)<200',   // SLO for TTFB
  ],

  // HTTP Request Failures
  http_req_failed: [
    'rate<0.001',  // Less than 0.1% failure rate (99.9% success)
  ],

  // HTTP Request Blocked (connection queue time)
  http_req_blocked: [
    'p(95)<50',    // Connection blocked time under 50ms
  ],

  // Virtual Users concurrent
  vus: [
    'value<=1000', // Maximum 1000 concurrent users
  ],

  // Iterations completed per second
  iterations: [
    'rate>100',    // At least 100 requests per second
  ],

  // Data received rate
  data_received: [
    'rate>1000000', // At least 1MB/s data throughput
  ],

  // Custom metrics for specific endpoints
  'http_req_duration{endpoint:health}': [
    'p(95)<50',    // Health checks should be very fast
  ],
  
  'http_req_duration{endpoint:api}': [
    'p(95)<300',   // API calls under 300ms
  ],

  'http_req_duration{endpoint:llm}': [
    'p(95)<5000',  // LLM calls can take longer (streaming)
    'p(99)<10000', // But should not exceed 10s
  ],

  // Checks passing rate
  checks: [
    'rate>0.99',   // 99% of checks should pass
  ],
};

// SLO Definitions for monitoring integration
export const slos = {
  availability: {
    target: 99.95,  // 99.95% availability
    window: '30d',  // 30-day rolling window
  },
  latency: {
    p50: 100,
    p95: 250,
    p99: 500,
    unit: 'ms',
  },
  errorBudget: {
    monthly: 0.0005 * 30 * 24 * 60, // ~21.6 minutes of downtime/month
    burn_rate_threshold: 14.4,       // Alert if burning 14.4x normal rate
  },
  throughput: {
    min_rps: 100,   // Minimum requests per second
    target_rps: 500, // Target RPS
  },
};

// Alert thresholds for Grafana/Prometheus integration
export const alertThresholds = {
  warning: {
    latency_p95: 300,
    error_rate: 0.005,
    cpu_usage: 70,
    memory_usage: 75,
  },
  critical: {
    latency_p95: 500,
    error_rate: 0.01,
    cpu_usage: 85,
    memory_usage: 90,
  },
};

export default { thresholds, slos, alertThresholds };
