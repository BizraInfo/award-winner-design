// app/api/ethics/route.ts
/**
 * Ethics Metrics API
 * 
 * Exposes SAPE/Ihsan framework metrics for runtime observability.
 * Returns current ethics scores, risk assessments, and compliance status.
 */

import { NextResponse } from 'next/server';
import { getEthicsStatus, updateEthicsMetrics } from '@/lib/observability/ethics-integration';

/**
 * GET /api/ethics
 * 
 * Returns current ethics metrics snapshot
 */
export async function GET() {
  try {
    const status = getEthicsStatus();

    // If no snapshot exists, create one with default/estimated metrics
    if (!status.ihsan && !status.sape) {
      // Generate a baseline snapshot with estimated values
      await updateEthicsMetrics({
        testCoverage: 0.75,
        codeQualityScore: 0.80,
        performanceScore: 0.85,
        securityScore: 0.70, // Conservative estimate pending audit
        dataSovereigntyRatio: 1.0,
        uptimePercentage: 0.99,
        poiFairnessIndex: 0.6,
        accessEquityRatio: 0.9,
        resourceDistributionScore: 0.7,
        humanityBenefitScore: 0.8,
        communityContributions: 0.5,
        openSourceRatio: 0.9,
      });

      const updatedStatus = getEthicsStatus();

      return NextResponse.json({
        success: true,
        data: {
          ...updatedStatus,
          source: 'baseline',
          timestamp: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...status,
        source: 'runtime',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Ethics API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve ethics metrics',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ethics
 * 
 * Update ethics metrics with new system measurements
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Update metrics
    const snapshot = await updateEthicsMetrics(body);

    return NextResponse.json({
      success: true,
      data: {
        ihsan: {
          score: snapshot.ihsan.composite,
          status: snapshot.ihsan.status,
          dimensions: snapshot.ihsan.dimensions.map((d) => ({
            name: d.name,
            score: d.score,
          })),
        },
        sape: snapshot.sape,
        timestamp: snapshot.timestamp.toISOString(),
      },
    });
  } catch (error) {
    console.error('Ethics POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update ethics metrics' },
      { status: 500 }
    );
  }
}
