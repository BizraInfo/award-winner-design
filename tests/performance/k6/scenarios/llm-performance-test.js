/**
 * BIZRA Node0 Genesis - LLM Backend Performance Test
 * 
 * Tests Ollama and LM Studio backend performance
 * Measures streaming latency, throughput, and concurrent request handling
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';
import { randomItem, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Custom metrics for LLM performance
const llmFirstTokenLatency = new Trend('llm_first_token_latency', true);
const llmTotalLatency = new Trend('llm_total_latency', true);
const llmTokensPerSecond = new Gauge('llm_tokens_per_second');
const llmRequestsTotal = new Counter('llm_requests_total');
const llmSuccessRate = new Rate('llm_success_rate');
const llmTimeouts = new Counter('llm_timeouts');

// Configuration
const OLLAMA_URL = __ENV.OLLAMA_URL || 'http://localhost:11434';
const LM_STUDIO_URL = __ENV.LM_STUDIO_URL || 'http://localhost:1234';
const API_URL = __ENV.API_URL || 'http://localhost:8080';

// Test prompts of varying complexity
const shortPrompts = [
  'What is 2 + 2?',
  'Say hello',
  'Name a color',
  'What day is it?',
];

const mediumPrompts = [
  'Explain the concept of recursion in programming',
  'Describe the water cycle in simple terms',
  'What are the main benefits of exercise?',
  'How does photosynthesis work?',
];

const longPrompts = [
  'Write a detailed explanation of how neural networks learn from data, including the concepts of forward propagation, backpropagation, and gradient descent. Include examples where appropriate.',
  'Explain the complete history of the internet from ARPANET to modern day, including key milestones, technologies, and the people who made significant contributions.',
  'Describe the architecture of a modern microservices application, including API gateways, service mesh, containerization, orchestration, and best practices for deployment.',
];

// System prompts for different personas
const systemPrompts = [
  'You are a helpful assistant.',
  'You are a technical expert specializing in software engineering.',
  'You are a concise and direct assistant. Keep responses brief.',
];

// Test configuration
export const options = {
  scenarios: {
    // Baseline test - Single user, sequential requests
    baseline: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 10,
      tags: { scenario: 'baseline' },
      exec: 'baselineTest',
    },

    // Concurrent users test
    concurrent: {
      executor: 'constant-vus',
      vus: 5,
      duration: '3m',
      tags: { scenario: 'concurrent' },
      exec: 'concurrentTest',
      startTime: '2m',
    },

    // Throughput test - Maximize request rate
    throughput: {
      executor: 'constant-arrival-rate',
      rate: 10,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 20,
      maxVUs: 50,
      tags: { scenario: 'throughput' },
      exec: 'throughputTest',
      startTime: '6m',
    },

    // Streaming test
    streaming: {
      executor: 'constant-vus',
      vus: 3,
      duration: '2m',
      tags: { scenario: 'streaming' },
      exec: 'streamingTest',
      startTime: '9m',
    },
  },

  thresholds: {
    'llm_first_token_latency': ['p(95)<3000'],   // First token in 3s
    'llm_total_latency': ['p(95)<30000'],        // Total response in 30s
    'llm_success_rate': ['rate>0.95'],           // 95% success rate
    'llm_timeouts': ['count<10'],                // Less than 10 timeouts
    'http_req_duration{endpoint:ollama}': ['p(95)<30000'],
    'http_req_duration{endpoint:lmstudio}': ['p(95)<30000'],
  },
};

// Helper: Make Ollama request
function ollamaGenerate(prompt, options = {}) {
  const payload = {
    model: options.model || 'llama2',
    prompt: prompt,
    system: options.system || 'You are a helpful assistant.',
    stream: options.stream || false,
    options: {
      temperature: options.temperature || 0.7,
      top_p: options.top_p || 0.9,
      num_predict: options.max_tokens || 256,
    },
  };

  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'ollama' },
    timeout: '60s',
  };

  const startTime = Date.now();
  const response = http.post(`${OLLAMA_URL}/api/generate`, JSON.stringify(payload), params);
  const totalTime = Date.now() - startTime;

  llmRequestsTotal.add(1);
  llmTotalLatency.add(totalTime);

  const success = response.status === 200;
  llmSuccessRate.add(success);

  if (response.status === 0) {
    llmTimeouts.add(1);
  }

  return { response, totalTime };
}

// Helper: Make LM Studio request (OpenAI compatible)
function lmStudioGenerate(prompt, options = {}) {
  const payload = {
    model: options.model || 'local-model',
    messages: [
      { role: 'system', content: options.system || 'You are a helpful assistant.' },
      { role: 'user', content: prompt },
    ],
    temperature: options.temperature || 0.7,
    max_tokens: options.max_tokens || 256,
    stream: options.stream || false,
  };

  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'lmstudio' },
    timeout: '60s',
  };

  const startTime = Date.now();
  const response = http.post(`${LM_STUDIO_URL}/v1/chat/completions`, JSON.stringify(payload), params);
  const totalTime = Date.now() - startTime;

  llmRequestsTotal.add(1);
  llmTotalLatency.add(totalTime);

  const success = response.status === 200;
  llmSuccessRate.add(success);

  if (response.status === 0) {
    llmTimeouts.add(1);
  }

  return { response, totalTime };
}

// Helper: Make API gateway request
function apiGenerate(prompt, options = {}) {
  const payload = {
    query: prompt,
    model: options.model || 'default',
    system: options.system || 'You are a helpful assistant.',
    max_tokens: options.max_tokens || 256,
    temperature: options.temperature || 0.7,
  };

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.API_KEY || 'test-key'}`,
    },
    tags: { endpoint: 'api' },
    timeout: '60s',
  };

  const startTime = Date.now();
  const response = http.post(`${API_URL}/api/v1/query`, JSON.stringify(payload), params);
  const totalTime = Date.now() - startTime;

  llmRequestsTotal.add(1);
  llmTotalLatency.add(totalTime);

  const success = response.status === 200 || response.status === 202;
  llmSuccessRate.add(success);

  return { response, totalTime };
}

// Baseline Test
export function baselineTest() {
  group('Baseline - Short Prompts', () => {
    const prompt = randomItem(shortPrompts);
    const { response, totalTime } = ollamaGenerate(prompt, { max_tokens: 50 });

    check(response, {
      'baseline: short prompt success': (r) => r.status === 200,
      'baseline: short prompt < 5s': () => totalTime < 5000,
    });

    if (response.status === 200) {
      try {
        const body = JSON.parse(response.body);
        if (body.eval_count && body.eval_duration) {
          const tokensPerSec = (body.eval_count / (body.eval_duration / 1e9));
          llmTokensPerSecond.add(tokensPerSec);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  });

  group('Baseline - Medium Prompts', () => {
    const prompt = randomItem(mediumPrompts);
    const { response, totalTime } = ollamaGenerate(prompt, { max_tokens: 256 });

    check(response, {
      'baseline: medium prompt success': (r) => r.status === 200,
      'baseline: medium prompt < 15s': () => totalTime < 15000,
    });
  });

  sleep(1);
}

// Concurrent Test
export function concurrentTest() {
  const backend = randomItem(['ollama', 'lmstudio', 'api']);
  const prompt = randomItem([...shortPrompts, ...mediumPrompts]);
  const system = randomItem(systemPrompts);

  group(`Concurrent - ${backend}`, () => {
    let result;

    switch (backend) {
      case 'ollama':
        result = ollamaGenerate(prompt, { system, max_tokens: 128 });
        break;
      case 'lmstudio':
        result = lmStudioGenerate(prompt, { system, max_tokens: 128 });
        break;
      default:
        result = apiGenerate(prompt, { system, max_tokens: 128 });
    }

    check(result.response, {
      [`concurrent: ${backend} success`]: (r) => r.status === 200 || r.status === 202,
      [`concurrent: ${backend} no timeout`]: (r) => r.status !== 0,
    });
  });

  sleep(randomIntBetween(0.5, 2));
}

// Throughput Test
export function throughputTest() {
  // Quick requests only
  const prompt = randomItem(shortPrompts);

  group('Throughput - Rapid Requests', () => {
    const { response, totalTime } = ollamaGenerate(prompt, { max_tokens: 32 });

    check(response, {
      'throughput: request completed': (r) => r.status !== 0,
      'throughput: under 10s': () => totalTime < 10000,
    });
  });

  // Minimal sleep
  sleep(0.1);
}

// Streaming Test (simulated - k6 doesn't natively support SSE)
export function streamingTest() {
  group('Streaming - Simulated', () => {
    const prompt = randomItem(mediumPrompts);

    // For actual streaming, we'd need to handle SSE
    // Here we measure the initial connection time
    const params = {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'ollama_stream' },
      timeout: '60s',
    };

    const payload = {
      model: 'llama2',
      prompt: prompt,
      stream: true,
      options: { num_predict: 256 },
    };

    const startTime = Date.now();
    const response = http.post(`${OLLAMA_URL}/api/generate`, JSON.stringify(payload), params);
    
    // In streaming mode, first response contains first token timing
    const firstTokenTime = Date.now() - startTime;
    llmFirstTokenLatency.add(firstTokenTime);

    check(response, {
      'streaming: connection established': (r) => r.status === 200,
      'streaming: first byte < 3s': () => firstTokenTime < 3000,
    });
  });

  sleep(2);
}

// Default function
export default function() {
  concurrentTest();
}

// Setup
export function setup() {
  console.log('🧠 BIZRA Node0 Genesis - LLM Performance Test Suite');
  console.log(`📍 Ollama: ${OLLAMA_URL}`);
  console.log(`📍 LM Studio: ${LM_STUDIO_URL}`);
  console.log(`📍 API Gateway: ${API_URL}`);

  // Check service availability
  const services = {};

  const ollamaCheck = http.get(`${OLLAMA_URL}/api/version`, { timeout: '5s' });
  services.ollama = ollamaCheck.status === 200;

  const lmStudioCheck = http.get(`${LM_STUDIO_URL}/v1/models`, { timeout: '5s' });
  services.lmStudio = lmStudioCheck.status === 200;

  const apiCheck = http.get(`${API_URL}/health`, { timeout: '5s' });
  services.api = apiCheck.status === 200;

  console.log(`\n📊 Service Status:`);
  console.log(`   Ollama: ${services.ollama ? '✅' : '❌'}`);
  console.log(`   LM Studio: ${services.lmStudio ? '✅' : '❌'}`);
  console.log(`   API Gateway: ${services.api ? '✅' : '❌'}`);

  return { startTime: Date.now(), services };
}

// Teardown
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`\n✅ LLM Performance test completed in ${duration.toFixed(2)} seconds`);
}

// Summary handler
export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    metrics: {
      first_token_latency_p95: data.metrics.llm_first_token_latency?.values['p(95)'],
      total_latency_p95: data.metrics.llm_total_latency?.values['p(95)'],
      success_rate: data.metrics.llm_success_rate?.values.rate,
      total_requests: data.metrics.llm_requests_total?.values.count,
      timeouts: data.metrics.llm_timeouts?.values.count,
    },
  };

  return {
    'results/llm-performance.json': JSON.stringify(summary, null, 2),
    stdout: generateLLMSummary(data),
  };
}

function generateLLMSummary(data) {
  let output = '\n';
  output += '═══════════════════════════════════════════════════════════════\n';
  output += '              BIZRA Node0 - LLM Performance Results            \n';
  output += '═══════════════════════════════════════════════════════════════\n\n';

  const m = data.metrics;

  if (m.llm_first_token_latency) {
    output += `🚀 First Token Latency (P95): ${m.llm_first_token_latency.values['p(95)'].toFixed(2)}ms\n`;
  }

  if (m.llm_total_latency) {
    output += `⏱️  Total Latency (P95): ${m.llm_total_latency.values['p(95)'].toFixed(2)}ms\n`;
  }

  if (m.llm_success_rate) {
    output += `✅ Success Rate: ${(m.llm_success_rate.values.rate * 100).toFixed(2)}%\n`;
  }

  if (m.llm_requests_total) {
    output += `📊 Total Requests: ${m.llm_requests_total.values.count}\n`;
  }

  if (m.llm_tokens_per_second) {
    output += `⚡ Tokens/Second (Avg): ${m.llm_tokens_per_second.values.value?.toFixed(2) || 'N/A'}\n`;
  }

  output += '\n═══════════════════════════════════════════════════════════════\n';

  return output;
}
