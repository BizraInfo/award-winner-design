/**
 * Prometheus-compatible Metrics Endpoint
 * 
 * GET /api/metrics - Returns metrics in Prometheus format
 * GET /api/metrics?format=json - Returns metrics as JSON
 */

import { NextResponse } from 'next/server';
import { metrics, healthChecks } from '@/lib/observability';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get('format');

  // Update system gauges
  if (typeof process !== 'undefined') {
    const memUsage = process.memoryUsage();
    metrics.setGauge('nodejs_heap_size_used_bytes', memUsage.heapUsed);
    metrics.setGauge('nodejs_heap_size_total_bytes', memUsage.heapTotal);
    metrics.setGauge('nodejs_external_memory_bytes', memUsage.external);
    metrics.setGauge('nodejs_rss_bytes', memUsage.rss);
    metrics.setGauge('process_uptime_seconds', process.uptime());
  }

  // Run health checks for metrics
  const health = await healthChecks.runAll();
  metrics.setGauge('health_status', health.status === 'healthy' ? 1 : health.status === 'degraded' ? 0.5 : 0);

  if (format === 'json') {
    return NextResponse.json({
      metrics: metrics.getJsonMetrics(),
      health,
    });
  }

  // Return Prometheus format
  const prometheusMetrics = metrics.getPrometheusMetrics();
  
  return new Response(prometheusMetrics, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
