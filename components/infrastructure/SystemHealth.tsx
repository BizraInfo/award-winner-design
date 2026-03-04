'use client';

import { useEffect, useState } from 'react';
import { HttpClient } from '@/lib/data-fetching';

interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  message?: string;
}

interface HealthData {
  status: string;
  timestamp: string;
  version: string;
  uptime: number;
  // API returns array of HealthCheckResult, but we normalize to Record for display
  checks?: HealthCheckResult[] | Record<string, string>;
}

/**
 * Normalize checks to a Record<string, string> for consistent rendering
 */
function normalizeChecks(checks?: HealthCheckResult[] | Record<string, string>): Record<string, string> | undefined {
  if (!checks) return undefined;
  
  // If already a record (legacy format), return as-is
  if (!Array.isArray(checks)) {
    return checks;
  }
  
  // Convert array to record: name -> status
  const record: Record<string, string> = {};
  for (const check of checks) {
    record[check.name] = check.status;
  }
  return record;
}

export function SystemHealth() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = new HttpClient();
    
    const fetchHealth = async () => {
      try {
        const data = await client.get<HealthData>('/api/health?verbose=true');
        setHealth(data);
      } catch (error) {
        console.error('Health check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Poll every 30s

    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-xs text-slate-500 animate-pulse">Initializing System Diagnostics...</div>;
  if (!health) return <div className="text-xs text-red-500">System Diagnostics Offline</div>;

  // Normalize checks to handle both array and object formats
  const normalizedChecks = normalizeChecks(health.checks);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-full px-3 py-1.5 shadow-lg">
        <div className={`w-2 h-2 rounded-full ${health.status === 'healthy' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
        <span className="text-xs font-mono text-slate-300">
          KERNEL: {health.status.toUpperCase()}
        </span>
        <span className="text-[10px] text-slate-500 border-l border-slate-700 pl-2 ml-1">
          v{health.version}
        </span>
      </div>
      
      {normalizedChecks && (
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg p-3 text-[10px] font-mono text-slate-400 shadow-xl w-48">
          <div className="flex justify-between mb-1">
            <span>UPTIME</span>
            <span className="text-indigo-400">{Math.floor(health.uptime / 1000)}s</span>
          </div>
          {Object.entries(normalizedChecks).map(([key, status]) => (
            <div key={key} className="flex justify-between">
              <span className="uppercase">{key}</span>
              <span className={status === 'healthy' || status === 'pass' ? 'text-emerald-500' : status === 'degraded' ? 'text-yellow-500' : 'text-red-500'}>
                {status === 'healthy' ? 'PASS' : status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
