"use client"

import Link from "next/link"

const GOLD = "#C9A962"
const NAVY = "#030810"

const DOC_SECTIONS = [
  {
    category: "Getting Started",
    docs: [
      { title: "Clone & Verify", description: "git clone, pip install, pytest — verify everything yourself", command: "git clone https://github.com/BizraInfo/bizra-data-lake.git" },
      { title: "Node0 Activation", description: "Boot the sovereign runtime with PAT-7 + SAT-5 on your machine", command: "bash deploy/node0/bizra_node_activate.sh" },
      { title: "Run the Smoke Test", description: "11 tests verifying the activation chain", command: "python deploy/node0/activation_smoke_test.py" },
    ],
  },
  {
    category: "Constitutional Proof Surface",
    docs: [
      { title: "METRICS_CANONICAL.md", description: "Single source of truth — 983 constitutional tests, verified per-module", command: "cat docs/METRICS_CANONICAL.md" },
      { title: "Proof Engine (703 tests)", description: "Receipts, BLAKE3 chains, FATE gate, loop proof, Ihsan scoring", command: "pytest tests/core/proof_engine/ -v" },
      { title: "PCI Crypto (122 tests)", description: "Ed25519 signing, RFC 8785 canonicalization", command: "pytest tests/core/pci/ -v" },
      { title: "Token Economics (92 tests)", description: "SEED/BLOOM minting, Zakat, Gini cap, emission decay", command: "pytest tests/core/token/ -v" },
    ],
  },
  {
    category: "Agent Development Kit (ADK)",
    docs: [
      { title: "ADK Blueprint v0.2", description: "Internal agent factory spec — 7 primitives, 7-step lifecycle", command: "cat docs/plans/bizra-adk-v0.2-blueprint.md" },
      { title: "Writing an Agent", description: "130 LOC to a FATE-gated agent. @charter + @tool + self.draft()", command: "cat core/adk/agents/researcher.py" },
      { title: "Agent Tests (51)", description: "All 7 PAT agents tested through real FATE gate", command: "pytest tests/core/adk/ -v" },
    ],
  },
  {
    category: "Architecture",
    docs: [
      { title: "PAT-7 (Personal Agentic Team)", description: "7 agents that work for you locally: Researcher, Strategist, Analyst, Creator, Executor, Coordinator, Guardian", command: "ls core/adk/agents/" },
      { title: "SAT-5 (System Agentic Team)", description: "5 governance gates: Sentinel, Oracle-S, Ledger, Conductor, Ambassador — 59 checks", command: "ls core/sat/*_gate.py" },
      { title: "URP (Universal Resource Pool)", description: "The shared commons: constitutional membrane, resource pool, SAT registry", command: "ls core/urp/" },
      { title: "Rust Workspace (24 crates)", description: "bizra-core through bizra-protocol — compiles clean", command: "cargo check --workspace" },
    ],
  },
]

export default function DocsPage() {
  return (
    <div className="min-h-screen" style={{ background: NAVY }}>
      <header className="border-b" style={{ borderColor: `${GOLD}15` }}>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link href="/info" className="text-sm opacity-40 hover:opacity-60 transition-opacity">
            ← bizra.info
          </Link>
          <h1 className="text-3xl font-light mt-4" style={{ color: GOLD }}>Documentation</h1>
          <p className="text-sm opacity-50 mt-2">Everything runs. Everything is tested. Verify it yourself.</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {DOC_SECTIONS.map((section) => (
          <section key={section.category} className="mb-12">
            <h2 className="text-lg font-light mb-6" style={{ color: `${GOLD}80` }}>
              {section.category}
            </h2>
            <div className="space-y-4">
              {section.docs.map((doc) => (
                <div key={doc.title} className="border rounded-lg p-5" style={{ borderColor: `${GOLD}12` }}>
                  <h3 className="font-light">{doc.title}</h3>
                  <p className="text-sm opacity-50 mt-1">{doc.description}</p>
                  <code className="block text-xs font-mono mt-3 px-3 py-2 rounded opacity-60"
                    style={{ background: `${GOLD}08` }}>
                    $ {doc.command}
                  </code>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}
