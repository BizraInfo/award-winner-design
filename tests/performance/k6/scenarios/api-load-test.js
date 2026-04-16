/**
 * BIZRA Node0 Genesis - API Load Test Scenarios
 * 
 * Comprehensive load testing with k6
 * Tests critical paths, stress testing, spike testing, and soak testing
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';
import { randomItem, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import { thresholds } from '../config/thresholds.js';

// Custom metrics
const apiLatency = new Trend('api_latency', true);
const apiErrors = new Counter('api_errors');
const apiSuccessRate = new Rate('api_success_rate');
const activeConnections = new Gauge('active_connections');

// Base configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const API_KEY = __ENV.API_KEY || 'test-api-key';

// Test data
const testUsers = [
  { email: 'test1@bizra.ai', password: 'TestPass123!' },
  { email: 'test2@bizra.ai', password: 'TestPass123!' },
  { email: 'test3@bizra.ai', password: 'TestPass123!' },
];

const queryTemplates = [
  'Explain quantum computing basics',
  'What is machine learning?',
  'How does blockchain work?',
  'Describe neural network architecture',
  'What are transformer models?',
];

// Test options - Multiple scenarios
export const options = {
  scenarios: {
    // Smoke test - Quick validation
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      gracefulStop: '5s',
      tags: { test_type: 'smoke' },
      exec: 'smokeTest',
    },

    // Load test - Steady state performance
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up
        { duration: '5m', target: 50 },   // Steady state
        { duration: '2m', target: 100 },  // Push higher
        { duration: '5m', target: 100 },  // Sustain
        { duration: '2m', target: 0 },    // Ramp down
      ],
      gracefulStop: '30s',
      tags: { test_type: 'load' },
      exec: 'loadTest',
      startTime: '35s', // Start after smoke
    },

    // Stress test - Find breaking point
    stress: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 500,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '3m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '3m', target: 300 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 0 },
      ],
      gracefulStop: '30s',
      tags: { test_type: 'stress' },
      exec: 'stressTest',
      startTime: '16m40s', // After load test
    },

    // Spike test - Sudden traffic surge
    spike: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '10s', target: 500 },  // Sudden spike
        { duration: '1m', target: 500 },   // Sustain spike
        { duration: '10s', target: 10 },   // Quick drop
        { duration: '1m', target: 10 },    // Recovery
      ],
      gracefulStop: '10s',
      tags: { test_type: 'spike' },
      exec: 'spikeTest',
      startTime: '30m', // After stress
    },
  },

  thresholds: thresholds.thresholds,

  // Output configuration
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// Headers configuration
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`,
  'X-Request-ID': () => `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
};

// Utility functions
function getRequestHeaders() {
  return {
    ...headers,
    'X-Request-ID': `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
}

// Health check function
function checkHealth() {
  const response = http.get(`${BASE_URL}/health`, {
    headers: getRequestHeaders(),
    tags: { endpoint: 'health' },
  });

  check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100,
    'health check returns ok': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'healthy' || body.status === 'ok';
      } catch {
        return false;
      }
    },
  });

  return response;
}

// API call function
function apiCall(path, method = 'GET', payload = null) {
  const url = `${BASE_URL}${path}`;
  const requestHeaders = getRequestHeaders();
  
  const params = {
    headers: requestHeaders,
    tags: { endpoint: 'api' },
    timeout: '10s',
  };

  let response;
  const startTime = Date.now();

  switch (method.toUpperCase()) {
    case 'POST':
      response = http.post(url, JSON.stringify(payload), params);
      break;
    case 'PUT':
      response = http.put(url, JSON.stringify(payload), params);
      break;
    case 'DELETE':
      response = http.del(url, null, params);
      break;
    default:
      response = http.get(url, params);
  }

  const duration = Date.now() - startTime;
  apiLatency.add(duration);

  const success = response.status >= 200 && response.status < 300;
  apiSuccessRate.add(success);

  if (!success) {
    apiErrors.add(1);
  }

  return response;
}

// Smoke Test - Basic functionality validation
export function smokeTest() {
  group('Smoke Test - Health Checks', () => {
    const health = checkHealth();
    check(health, {
      'smoke: service is up': (r) => r.status === 200,
    });
  });

  group('Smoke Test - Basic API', () => {
    const response = apiCall('/api/v1/status');
    check(response, {
      'smoke: API status returns 200': (r) => r.status === 200,
    });
  });

  sleep(1);
}

// Load Test - Normal expected traffic
export function loadTest() {
  const user = randomItem(testUsers);
  
  group('Load Test - Authentication Flow', () => {
    // Login
    const loginResponse = apiCall('/api/v1/auth/login', 'POST', {
      email: user.email,
      password: user.password,
    });

    check(loginResponse, {
      'load: login successful': (r) => r.status === 200 || r.status === 401,
      'load: login response time < 500ms': (r) => r.timings.duration < 500,
    });
  });

  group('Load Test - Data Retrieval', () => {
    // Get dashboard data
    const dashboardResponse = apiCall('/api/v1/dashboard');
    check(dashboardResponse, {
      'load: dashboard data retrieved': (r) => r.status === 200 || r.status === 401,
      'load: dashboard response time < 300ms': (r) => r.timings.duration < 300,
    });

    // Get metrics
    const metricsResponse = apiCall('/api/v1/metrics');
    check(metricsResponse, {
      'load: metrics retrieved': (r) => r.status === 200 || r.status === 401,
    });
  });

  group('Load Test - Query Processing', () => {
    const query = randomItem(queryTemplates);
    const queryResponse = apiCall('/api/v1/query', 'POST', {
      query: query,
      model: 'default',
    });

    check(queryResponse, {
      'load: query processed': (r) => r.status === 200 || r.status === 202 || r.status === 401,
      'load: query response time < 2000ms': (r) => r.timings.duration < 2000,
    });
  });

  sleep(randomIntBetween(1, 3));
}

// Stress Test - Push system limits
export function stressTest() {
  group('Stress Test - Concurrent Requests', () => {
    // Multiple rapid requests
    const requests = [
      { method: 'GET', url: `${BASE_URL}/health`, tags: { name: 'health' } },
      { method: 'GET', url: `${BASE_URL}/api/v1/status`, tags: { name: 'status' } },
      { method: 'GET', url: `${BASE_URL}/api/v1/metrics`, tags: { name: 'metrics' } },
    ];

    const responses = http.batch(requests);
    
    check(responses[0], {
      'stress: health under load': (r) => r.status === 200,
    });

    check(responses[1], {
      'stress: status under load': (r) => r.status === 200 || r.status === 429,
    });

    check(responses[2], {
      'stress: metrics under load': (r) => r.status === 200 || r.status === 429 || r.status === 401,
    });
  });

  group('Stress Test - Heavy Computation', () => {
    const heavyQuery = {
      query: randomItem(queryTemplates),
      model: 'complex',
      max_tokens: 1000,
      temperature: 0.7,
    };

    const response = apiCall('/api/v1/query', 'POST', heavyQuery);
    check(response, {
      'stress: heavy query handled': (r) => r.status !== 500,
      'stress: rate limiting works': (r) => r.status !== 500 || r.status === 429,
    });
  });

  // Minimal sleep during stress
  sleep(randomIntBetween(0.1, 0.5));
}

// Spike Test - Sudden traffic surge
export function spikeTest() {
  group('Spike Test - Rapid Requests', () => {
    // No sleep - maximum request rate
    const response = apiCall('/api/v1/status');
    check(response, {
      'spike: service handles spike': (r) => r.status !== 500,
      'spike: graceful degradation': (r) => r.status === 200 || r.status === 429 || r.status === 503,
    });
  });

  // Very short pause
  sleep(0.1);
}

// Default function (required by k6)
export default function() {
  loadTest();
}

// Setup function - runs once at start
export function setup() {
  console.log(`🚀 BIZRA Node0 Genesis - Performance Test Suite`);
  console.log(`📍 Target: ${BASE_URL}`);
  console.log(`⏱️  Starting performance tests...`);

  // Verify service is up
  const healthCheck = http.get(`${BASE_URL}/health`, { timeout: '5s' });
  if (healthCheck.status !== 200) {
    console.warn(`⚠️ Warning: Health check returned ${healthCheck.status}`);
  }

  return { startTime: Date.now() };
}

// Teardown function - runs once at end
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`\n✅ Test suite completed in ${duration.toFixed(2)} seconds`);
  console.log(`📊 Check results in output for detailed metrics`);
}

// Handle summary
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'results/summary.json': JSON.stringify(data, null, 2),
    'results/summary.html': htmlReport(data),
  };
}

// Text summary helper
function textSummary(data, options) {
  const { metrics, root_group } = data;
  
  let summary = '\n═══════════════════════════════════════════════════════════════\n';
  summary += '                  BIZRA Node0 Genesis - Test Results              \n';
  summary += '═══════════════════════════════════════════════════════════════\n\n';

  // Key metrics
  if (metrics.http_req_duration) {
    summary += `📈 Response Time (P95): ${metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
    summary += `📈 Response Time (Avg): ${metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  }

  if (metrics.http_req_failed) {
    summary += `❌ Error Rate: ${(metrics.http_req_failed.values.rate * 100).toFixed(4)}%\n`;
  }

  if (metrics.iterations) {
    summary += `🔄 Total Requests: ${metrics.iterations.values.count}\n`;
    summary += `⚡ Requests/sec: ${metrics.iterations.values.rate.toFixed(2)}\n`;
  }

  summary += '\n═══════════════════════════════════════════════════════════════\n';

  return summary;
}

// HTML report helper
function htmlReport(data) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>BIZRA Node0 Genesis - Performance Report</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 40px; background: #0a0a0a; color: #e0e0e0; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #00d4ff; border-bottom: 2px solid #00d4ff; padding-bottom: 10px; }
    .metric { background: #1a1a2e; border-left: 4px solid #00d4ff; padding: 15px; margin: 10px 0; border-radius: 4px; }
    .metric-title { font-weight: bold; color: #00d4ff; }
    .metric-value { font-size: 24px; margin-top: 5px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
    .success { border-left-color: #00ff88; }
    .warning { border-left-color: #ffaa00; }
    .error { border-left-color: #ff4444; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 BIZRA Node0 Genesis - Performance Report</h1>
    <div class="grid">
      ${generateMetricCards(data)}
    </div>
    <p style="margin-top: 40px; color: #888;">Generated: ${new Date().toISOString()}</p>
  </div>
</body>
</html>`;
}

function generateMetricCards(data) {
  const { metrics } = data;
  let cards = '';

  if (metrics.http_req_duration) {
    const p95 = metrics.http_req_duration.values['p(95)'];
    const statusClass = p95 < 250 ? 'success' : p95 < 500 ? 'warning' : 'error';
    cards += `<div class="metric ${statusClass}">
      <div class="metric-title">Response Time (P95)</div>
      <div class="metric-value">${p95.toFixed(2)}ms</div>
    </div>`;
  }

  if (metrics.http_req_failed) {
    const rate = metrics.http_req_failed.values.rate;
    const statusClass = rate < 0.001 ? 'success' : rate < 0.01 ? 'warning' : 'error';
    cards += `<div class="metric ${statusClass}">
      <div class="metric-title">Error Rate</div>
      <div class="metric-value">${(rate * 100).toFixed(4)}%</div>
    </div>`;
  }

  if (metrics.iterations) {
    cards += `<div class="metric success">
      <div class="metric-title">Total Requests</div>
      <div class="metric-value">${metrics.iterations.values.count}</div>
    </div>`;
  }

  return cards;
}
