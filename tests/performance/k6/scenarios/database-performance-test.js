/**
 * BIZRA Node0 Genesis - Database Performance Test
 * 
 * Tests PostgreSQL, Redis, Neo4j, and Qdrant performance
 * Measures query latency, connection pooling, and throughput
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomItem, randomIntBetween, randomString } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Custom metrics
const dbQueryLatency = new Trend('db_query_latency', true);
const dbConnectionLatency = new Trend('db_connection_latency', true);
const dbSuccessRate = new Rate('db_success_rate');
const dbErrors = new Counter('db_errors');

// Configuration
const API_URL = __ENV.API_URL || 'http://localhost:8080';
const API_KEY = __ENV.API_KEY || 'test-api-key';

// Test options
export const options = {
  scenarios: {
    // Read-heavy workload (80% reads, 20% writes)
    read_heavy: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '3m', target: 20 },
        { duration: '1m', target: 0 },
      ],
      tags: { workload: 'read_heavy' },
      exec: 'readHeavyWorkload',
    },

    // Write-heavy workload (20% reads, 80% writes)
    write_heavy: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '3m', target: 10 },
        { duration: '1m', target: 0 },
      ],
      tags: { workload: 'write_heavy' },
      exec: 'writeHeavyWorkload',
      startTime: '6m',
    },

    // Mixed workload
    mixed: {
      executor: 'constant-vus',
      vus: 15,
      duration: '3m',
      tags: { workload: 'mixed' },
      exec: 'mixedWorkload',
      startTime: '12m',
    },

    // Connection pool test
    connection_stress: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 100,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 20 },
      ],
      tags: { workload: 'connection_stress' },
      exec: 'connectionStressTest',
      startTime: '16m',
    },
  },

  thresholds: {
    'db_query_latency': ['p(95)<100', 'p(99)<200'],
    'db_connection_latency': ['p(95)<50'],
    'db_success_rate': ['rate>0.99'],
    'db_errors': ['count<50'],
    'http_req_duration{db:postgres}': ['p(95)<150'],
    'http_req_duration{db:redis}': ['p(95)<20'],
    'http_req_duration{db:neo4j}': ['p(95)<200'],
    'http_req_duration{db:qdrant}': ['p(95)<100'],
  },
};

// Headers
function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
    'X-Request-ID': `db-${Date.now()}-${randomString(8)}`,
  };
}

// API request helper
function dbRequest(endpoint, method = 'GET', payload = null, dbTag = 'api') {
  const url = `${API_URL}${endpoint}`;
  const params = {
    headers: getHeaders(),
    tags: { db: dbTag },
    timeout: '10s',
  };

  const startTime = Date.now();
  let response;

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

  const latency = Date.now() - startTime;
  dbQueryLatency.add(latency);

  const success = response.status >= 200 && response.status < 300;
  dbSuccessRate.add(success);

  if (!success && response.status !== 404) {
    dbErrors.add(1);
  }

  return { response, latency };
}

// Simulate PostgreSQL operations
function postgresRead() {
  const operations = [
    '/api/v1/users',
    '/api/v1/users/1',
    '/api/v1/sessions',
    '/api/v1/audit-logs',
    '/api/v1/settings',
  ];

  const endpoint = randomItem(operations);
  return dbRequest(endpoint, 'GET', null, 'postgres');
}

function postgresWrite() {
  const operations = [
    {
      endpoint: '/api/v1/audit-logs',
      method: 'POST',
      payload: {
        action: 'test_action',
        userId: `user-${randomIntBetween(1, 1000)}`,
        timestamp: new Date().toISOString(),
        metadata: { test: true },
      },
    },
    {
      endpoint: '/api/v1/sessions',
      method: 'POST',
      payload: {
        userId: `user-${randomIntBetween(1, 1000)}`,
        deviceInfo: 'k6-test-device',
        ipAddress: '127.0.0.1',
      },
    },
  ];

  const op = randomItem(operations);
  return dbRequest(op.endpoint, op.method, op.payload, 'postgres');
}

// Simulate Redis operations
function redisRead() {
  const keys = [
    'cache:user:profile',
    'cache:session:token',
    'cache:settings:global',
    'cache:metrics:realtime',
  ];

  const key = randomItem(keys);
  return dbRequest(`/api/v1/cache/${key}`, 'GET', null, 'redis');
}

function redisWrite() {
  const key = `cache:test:${randomString(8)}`;
  const payload = {
    key: key,
    value: JSON.stringify({ data: randomString(64), timestamp: Date.now() }),
    ttl: 300,
  };

  return dbRequest('/api/v1/cache', 'POST', payload, 'redis');
}

// Simulate Neo4j operations
function neo4jRead() {
  const queries = [
    '/api/v1/graph/nodes',
    '/api/v1/graph/relationships',
    '/api/v1/graph/paths',
  ];

  const endpoint = randomItem(queries);
  return dbRequest(endpoint, 'GET', null, 'neo4j');
}

function neo4jWrite() {
  const payload = {
    label: 'TestNode',
    properties: {
      id: `node-${randomString(8)}`,
      name: `Test ${randomIntBetween(1, 1000)}`,
      timestamp: Date.now(),
    },
  };

  return dbRequest('/api/v1/graph/nodes', 'POST', payload, 'neo4j');
}

// Simulate Qdrant operations
function qdrantRead() {
  const vector = Array.from({ length: 384 }, () => Math.random());
  const payload = {
    vector: vector,
    limit: 10,
    filter: {},
  };

  return dbRequest('/api/v1/vectors/search', 'POST', payload, 'qdrant');
}

function qdrantWrite() {
  const vector = Array.from({ length: 384 }, () => Math.random());
  const payload = {
    id: `vec-${randomString(16)}`,
    vector: vector,
    payload: {
      text: `Sample text ${randomIntBetween(1, 10000)}`,
      source: 'k6-test',
    },
  };

  return dbRequest('/api/v1/vectors', 'POST', payload, 'qdrant');
}

// Read-heavy workload (80% reads)
export function readHeavyWorkload() {
  const rand = Math.random();

  group('Read Heavy Workload', () => {
    if (rand < 0.4) {
      // 40% PostgreSQL reads
      const result = postgresRead();
      check(result.response, {
        'postgres read success': (r) => r.status === 200 || r.status === 404 || r.status === 401,
      });
    } else if (rand < 0.6) {
      // 20% Redis reads
      const result = redisRead();
      check(result.response, {
        'redis read success': (r) => r.status === 200 || r.status === 404 || r.status === 401,
      });
    } else if (rand < 0.8) {
      // 20% writes
      if (Math.random() < 0.5) {
        postgresWrite();
      } else {
        redisWrite();
      }
    } else {
      // 20% vector/graph operations
      if (Math.random() < 0.5) {
        qdrantRead();
      } else {
        neo4jRead();
      }
    }
  });

  sleep(randomIntBetween(0.1, 0.5));
}

// Write-heavy workload (80% writes)
export function writeHeavyWorkload() {
  const rand = Math.random();

  group('Write Heavy Workload', () => {
    if (rand < 0.4) {
      // 40% PostgreSQL writes
      const result = postgresWrite();
      check(result.response, {
        'postgres write success': (r) => r.status >= 200 && r.status < 400,
      });
    } else if (rand < 0.6) {
      // 20% Redis writes
      const result = redisWrite();
      check(result.response, {
        'redis write success': (r) => r.status >= 200 && r.status < 400,
      });
    } else if (rand < 0.8) {
      // 20% reads
      if (Math.random() < 0.5) {
        postgresRead();
      } else {
        redisRead();
      }
    } else {
      // 20% vector/graph writes
      if (Math.random() < 0.5) {
        qdrantWrite();
      } else {
        neo4jWrite();
      }
    }
  });

  sleep(randomIntBetween(0.2, 0.8));
}

// Mixed workload
export function mixedWorkload() {
  const databases = ['postgres', 'redis', 'neo4j', 'qdrant'];
  const db = randomItem(databases);
  const isRead = Math.random() < 0.5;

  group(`Mixed - ${db} ${isRead ? 'Read' : 'Write'}`, () => {
    switch (db) {
      case 'postgres':
        isRead ? postgresRead() : postgresWrite();
        break;
      case 'redis':
        isRead ? redisRead() : redisWrite();
        break;
      case 'neo4j':
        isRead ? neo4jRead() : neo4jWrite();
        break;
      case 'qdrant':
        isRead ? qdrantRead() : qdrantWrite();
        break;
    }
  });

  sleep(randomIntBetween(0.1, 0.3));
}

// Connection stress test
export function connectionStressTest() {
  group('Connection Stress', () => {
    // Rapid connection establishment
    const connectionStart = Date.now();
    
    // Multiple rapid requests to stress connection pool
    const requests = [
      { method: 'GET', url: `${API_URL}/health`, tags: { name: 'health' } },
      { method: 'GET', url: `${API_URL}/api/v1/status`, tags: { name: 'status' } },
    ];

    const responses = http.batch(requests);
    
    const connectionTime = Date.now() - connectionStart;
    dbConnectionLatency.add(connectionTime);

    check(responses[0], {
      'connection: health ok': (r) => r.status === 200,
    });
  });

  // Minimal sleep to maximize connection pressure
  sleep(0.05);
}

// Default function
export default function() {
  mixedWorkload();
}

// Setup
export function setup() {
  console.log('💾 BIZRA Node0 Genesis - Database Performance Test Suite');
  console.log(`📍 API Gateway: ${API_URL}`);

  // Verify API is up
  const healthCheck = http.get(`${API_URL}/health`, { timeout: '5s' });
  
  console.log(`\n📊 API Status: ${healthCheck.status === 200 ? '✅' : '❌'}`);

  return { startTime: Date.now() };
}

// Teardown
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`\n✅ Database performance test completed in ${duration.toFixed(2)} seconds`);
}

// Summary handler
export function handleSummary(data) {
  const summary = generateDBSummary(data);
  
  return {
    'results/db-performance.json': JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics: extractDBMetrics(data.metrics),
    }, null, 2),
    stdout: summary,
  };
}

function extractDBMetrics(metrics) {
  return {
    query_latency_p95: metrics.db_query_latency?.values['p(95)'],
    query_latency_avg: metrics.db_query_latency?.values.avg,
    connection_latency_p95: metrics.db_connection_latency?.values['p(95)'],
    success_rate: metrics.db_success_rate?.values.rate,
    total_errors: metrics.db_errors?.values.count,
  };
}

function generateDBSummary(data) {
  const m = data.metrics;
  let output = '\n';
  output += '═══════════════════════════════════════════════════════════════\n';
  output += '             BIZRA Node0 - Database Performance Results        \n';
  output += '═══════════════════════════════════════════════════════════════\n\n';

  if (m.db_query_latency) {
    output += `📊 Query Latency (P95): ${m.db_query_latency.values['p(95)'].toFixed(2)}ms\n`;
    output += `📊 Query Latency (Avg): ${m.db_query_latency.values.avg.toFixed(2)}ms\n`;
  }

  if (m.db_connection_latency) {
    output += `🔌 Connection Latency (P95): ${m.db_connection_latency.values['p(95)'].toFixed(2)}ms\n`;
  }

  if (m.db_success_rate) {
    output += `✅ Success Rate: ${(m.db_success_rate.values.rate * 100).toFixed(2)}%\n`;
  }

  if (m.db_errors) {
    output += `❌ Total Errors: ${m.db_errors.values.count}\n`;
  }

  // Per-database metrics
  const dbs = ['postgres', 'redis', 'neo4j', 'qdrant'];
  output += '\n📦 Per-Database Metrics:\n';
  
  for (const db of dbs) {
    const key = `http_req_duration{db:${db}}`;
    if (m[key]) {
      output += `   ${db}: P95=${m[key].values['p(95)'].toFixed(2)}ms\n`;
    }
  }

  output += '\n═══════════════════════════════════════════════════════════════\n';

  return output;
}
