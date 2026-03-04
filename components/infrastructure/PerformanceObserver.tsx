'use client';

import { useEffect } from 'react';
import { PerformanceMonitor } from '@/lib/performance';

export function PerformanceObserver() {
  useEffect(() => {
    // Initialize the Elite Performance Monitor
    const monitor = PerformanceMonitor.init({
      enableWebVitals: true,
      enableResourceTiming: true,
      enableLongTasks: true,
      sampleRate: 1.0, // 100% sampling for dev/demo
      onMetric: (metric) => {
        // In a real app, this would stream to an analytics endpoint
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Performance] ${metric.name}:`, metric.value);
        }
      }
    });

    monitor.start();

    return () => {
      // Cleanup if necessary
    };
  }, []);

  return null; // Headless component
}
