"use client";

import { useEffect, useState } from "react";

const G = "#C9A962";
const DIM = "rgba(232,228,219,.38)";
const MUT = "rgba(232,228,219,.65)";
const BG2 = "#0E1E34";
const LINE = "rgba(201,169,98,.12)";

interface Stats {
  nodes: number;
  tests: number;
  loc: number;
  coverage: number;
  crates: number;
  vectors: number;
  commits: number;
  agents: number;
  z3Proofs: number;
  membraneTax: string;
  vulns: number;
}

const DEFAULTS: Stats = {
  nodes: 1, tests: 0, loc: 0, coverage: 0, crates: 0,
  vectors: 0, commits: 0, agents: 12, z3Proofs: 0,
  membraneTax: "0", vulns: 0,
};

export function LiveNetworkStats() {
  const [stats, setStats] = useState<Stats>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/scaffold/metrics")
      .then(r => r.json())
      .then(d => {
        const m = d?.payload?.metrics || {};
        const arch = m?.architecture || {};
        setStats({
          nodes: 1,
          tests: m?.tests?.total || 0,
          loc: m?.loc?.total || 0,
          coverage: m?.coverage?.line_coverage_percent || 0,
          crates: arch?.rust_crates || 0,
          vectors: arch?.faiss_vectors || 0,
          commits: arch?.commits || 0,
          agents: arch?.agents || 12,
          z3Proofs: arch?.z3_proofs || 0,
          membraneTax: (arch?.membrane_tax_ms || 0).toString(),
          vulns: m?.security?.vulnerabilities || 0,
        });
        setLoaded(true);
      })
      .catch(() => setLoaded(false));
  }, []);

  if (!loaded) return null;

  const items = [
    { label: "LIVE NODES", value: stats.nodes.toString(), color: "#34D399" },
    { label: "TESTS", value: stats.tests.toLocaleString(), color: G },
    { label: "COMMITS", value: stats.commits.toLocaleString(), color: G },
    { label: "RUST CRATES", value: stats.crates.toString(), color: "#60A5FA" },
    { label: "FAISS VECTORS", value: stats.vectors.toLocaleString(), color: "#A78BFA" },
    { label: "Z3 PROOFS", value: stats.z3Proofs.toString(), color: "#22D3EE" },
    { label: "COVERAGE", value: stats.coverage + "%", color: "#34D399" },
    { label: "MEMBRANE TAX", value: stats.membraneTax + "ms", color: G },
    { label: "VULNERABILITIES", value: stats.vulns.toString(), color: stats.vulns === 0 ? "#34D399" : "#F87171" },
    { label: "AGENTS PER NODE", value: stats.agents.toString(), color: G },
  ];

  return (
    <div style={{
      padding: "32px 24px",
      background: `linear-gradient(180deg, transparent, ${BG2}40)`,
      borderTop: `1px solid ${LINE}`,
      borderBottom: `1px solid ${LINE}`,
    }}>
      <div style={{
        fontSize: 8, letterSpacing: 4, color: DIM,
        textAlign: "center", marginBottom: 20,
        textTransform: "uppercase",
      }}>
        Live Network Data
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 12,
        maxWidth: 700,
        margin: "0 auto",
      }}>
        {items.map((item) => (
          <div key={item.label} style={{ textAlign: "center" }}>
            <div style={{
              fontSize: 18, fontWeight: 700,
              fontFamily: "var(--font-cinzel), serif",
              color: item.color,
            }}>
              {item.value}
            </div>
            <div style={{
              fontSize: 7, letterSpacing: 2, color: DIM,
              marginTop: 2, textTransform: "uppercase",
            }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
