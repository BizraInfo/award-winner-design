'use client';

import { useEffect, useState } from 'react';
import { GraphViewer } from '@/components/visualizations/GraphViewer';

export default function AtlasPage() {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/knowledge-graph')
      .then(res => res.json())
      .then(data => {
        setGraphData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          The Knowledge Atlas
        </h1>
        <p className="text-slate-400 max-w-2xl">
          Visualizing the synaptic connections between 15,000 hours of thought history and the flagship evidence vault.
          This is the living memory of the BIZRA ecosystem.
        </p>
      </header>

      <main>
        {loading ? (
          <div className="w-full h-[600px] flex items-center justify-center border border-slate-800 rounded-xl bg-slate-950">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-500 text-sm animate-pulse">Loading Neural Synapses...</p>
            </div>
          </div>
        ) : graphData ? (
          <GraphViewer data={graphData} />
        ) : (
          <div className="p-4 bg-red-900/20 border border-red-800 rounded text-red-200">
            Failed to load Knowledge Graph. Ensure the Kernel Synthesis has been run.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800">
            <h3 className="text-lg font-semibold mb-2 text-indigo-400">Slot-Alpha: Mind</h3>
            <p className="text-sm text-slate-400">
              Ingested conversation history containing architectural decisions, philosophical alignments, and code evolution.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800">
            <h3 className="text-lg font-semibold mb-2 text-pink-400">Slot-Beta: Evidence</h3>
            <p className="text-sm text-slate-400">
              Cataloged multimedia assets from the Flagship Proof Pack, serving as the empirical validation of thoughts.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 opacity-50">
            <h3 className="text-lg font-semibold mb-2 text-slate-500">Slot-Gamma: Research</h3>
            <p className="text-sm text-slate-500">
              [Pending Activation] Deep archive of Jupyter notebooks and academic papers from the Cloud Drive.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
