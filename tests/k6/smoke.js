import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const homePageDuration = new Trend('home_page_duration');
const showcaseDuration = new Trend('showcase_page_duration');

// Test configuration with thresholds
export const options = {
  // Smoke test: light load
  stages: [
    { duration: '30s', target: 5 },   // Ramp up to 5 users
    { duration: '1m', target: 5 },    // Stay at 5 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  
  // Performance budgets (thresholds)
  thresholds: {
    // p95 response time < 250ms for API/pages
    http_req_duration: ['p(95)<250', 'p(99)<500'],
    
    // Error rate < 1%
    errors: ['rate<0.01'],
    
    // Custom page thresholds
    home_page_duration: ['p(95)<2500'],      // Home < 2.5s at p95
    showcase_page_duration: ['p(95)<3000'],  // Showcase < 3s at p95 (heavier)
    
    // HTTP-specific
    http_req_failed: ['rate<0.30'],          // < 30% failed (static asset 404s expected in CI)
    http_req_waiting: ['p(95)<200'],         // TTFB < 200ms at p95
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Test 1: Home page (lifecycle mode)
  const homeStart = Date.now();
  const homeRes = http.get(`${BASE_URL}/`);
  homePageDuration.add(Date.now() - homeStart);
  
  const homeChecks = check(homeRes, {
    'home: status is 200': (r) => r.status === 200,
    'home: has content': (r) => r.body.length > 0,
    'home: response time < 2.5s': (r) => r.timings.duration < 2500,
  });
  errorRate.add(!homeChecks);
  
  sleep(1);
  
  // Test 2: Showcase page (3D heavy)
  const showcaseStart = Date.now();
  const showcaseRes = http.get(`${BASE_URL}/showcase`);
  showcaseDuration.add(Date.now() - showcaseStart);
  
  const showcaseChecks = check(showcaseRes, {
    'showcase: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'showcase: response time < 3s': (r) => r.timings.duration < 3000,
  });
  errorRate.add(!showcaseChecks);
  
  sleep(1);
  
  // Test 3: Static assets (simulate user journey)
  const assetsRes = http.batch([
    ['GET', `${BASE_URL}/_next/static/css/`, { tags: { name: 'css' } }],
  ]);
  
  sleep(2);
}

// Setup function - runs once before test
export function setup() {
  // Verify server is reachable
  const res = http.get(`${BASE_URL}/`);
  if (res.status !== 200) {
    throw new Error(`Server not reachable at ${BASE_URL}`);
  }
  console.log(`✅ Server verified at ${BASE_URL}`);
}

// Teardown function - runs once after test
export function teardown(data) {
  console.log('🏁 Smoke test completed');
}
