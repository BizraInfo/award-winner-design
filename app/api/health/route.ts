import { NextResponse } from 'next/server'
import { healthChecks, metrics } from '@/lib/observability'

/**
 * Health Check Endpoint
 * 
 * Provides container orchestration and load balancer health checks.
 * Returns 200 OK when the application is healthy and ready to serve traffic.
 * 
 * @route GET /api/health
 * @route GET /api/health?verbose=true - Detailed health info
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const verbose = url.searchParams.get('verbose') === 'true';

  // Increment health check counter
  metrics.incCounter('health_checks_total', 1);

  // Run all health checks
  const systemHealth = await healthChecks.runAll();
  
  // Basic health response for k8s probes
  const healthCheck = {
    status: systemHealth.status,
    timestamp: systemHealth.timestamp,
    uptime: systemHealth.uptime,
    version: process.env.NEXT_PUBLIC_APP_VERSION || systemHealth.version,
    buildId: process.env.NEXT_PUBLIC_BUILD_ID || 'development',
    environment: process.env.NODE_ENV || 'development',
  }

  // Add detailed checks if verbose
  const response = verbose 
    ? { ...healthCheck, checks: systemHealth.checks, memory: getMemoryHealth() }
    : healthCheck;

  // Return appropriate status code
  const statusCode = systemHealth.status === 'healthy' ? 200 
    : systemHealth.status === 'degraded' ? 200 
    : 503;

  return NextResponse.json(response, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}

/**
 * Memory health check
 * Warns if memory usage exceeds 90% of heap limit
 */
function getMemoryHealth(): { status: 'pass' | 'warn' | 'fail'; details: object } {
  const memUsage = process.memoryUsage()
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024)
  const usagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)

  let status: 'pass' | 'warn' | 'fail' = 'pass'
  if (usagePercent > 95) {
    status = 'fail'
  } else if (usagePercent > 85) {
    status = 'warn'
  }

  return {
    status,
    details: {
      heapUsedMB,
      heapTotalMB,
      usagePercent,
      rssBytes: memUsage.rss,
    },
  }
}

// Also handle HEAD requests for simpler health checks
export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
