"use client"

import Link from "next/link"

const GOLD = "#C9A962"
const NAVY = "#030810"

const PAPERS = [
  { title: "البذرة — The Seed", date: "June 2023", type: "Founding Paper", description: "The original Arabic paper that defined BIZRA's vision: every human is a node, every node is a seed." },
  { title: "الرسالة — The Message", date: "July 2023", type: "Founding Paper", description: "The companion paper defining BIZRA's mission: sovereign AI governed by constitutional principles." },
  { title: "BIZRA Technical White Paper v1.0", date: "2024", type: "Whitepaper", description: "Full technical architecture: proof engine, FATE gate, PAT-7/SAT-5 topology, token economics." },
  { title: "ADK v0.2 Blueprint — Internal Agent Factory", date: "April 2026", type: "Architecture", description: "The agent development kit spec: 7 primitives, 7-step lifecycle, hard constitutional governance." },
  { title: "METRICS_CANONICAL.md", date: "April 2026", type: "Canonical Reference", description: "Single source of truth for all BIZRA metrics. Every number verified by running the stated command." },
]

const ARCHITECTURE_DOCS = [
  { title: "BIZRA Diamond Architecture", description: "Multi-layer architectural overview" },
  { title: "Sovereign Cognitive Architecture", description: "The cognitive stack from ZPK to URP" },
  { title: "Dual Bus Kernel Blueprint", description: "Event bus + receipt chain dual-track architecture" },
  { title: "FATE Gate Integration", description: "How constitutional governance is enforced at runtime" },
]

export default function ResearchPage() {
  return (
    <div className="min-h-screen" style={{ background: NAVY }}>
      <header className="border-b" style={{ borderColor: `${GOLD}15` }}>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link href="/info" className="text-sm opacity-40 hover:opacity-60 transition-opacity">
            ← bizra.info
          </Link>
          <h1 className="text-3xl font-light mt-4" style={{ color: GOLD }}>Research &amp; Papers</h1>
          <p className="text-sm opacity-50 mt-2">35 months of R&amp;D — from البذرة to 983 constitutional tests</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <section className="mb-16">
          <h2 className="text-lg font-light mb-6" style={{ color: `${GOLD}80` }}>Core Papers</h2>
          <div className="space-y-4">
            {PAPERS.map((p) => (
              <div key={p.title} className="border rounded-lg p-5" style={{ borderColor: `${GOLD}15` }}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-light">{p.title}</h3>
                    <p className="text-sm opacity-60 mt-2 leading-relaxed">{p.description}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: `${GOLD}10`, color: `${GOLD}80` }}>
                      {p.type}
                    </span>
                    <p className="text-xs opacity-30 mt-2">{p.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-lg font-light mb-6" style={{ color: `${GOLD}80` }}>Architecture Documents</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {ARCHITECTURE_DOCS.map((d) => (
              <div key={d.title} className="border rounded-lg p-4" style={{ borderColor: `${GOLD}10` }}>
                <h3 className="text-sm font-light">{d.title}</h3>
                <p className="text-xs opacity-40 mt-1">{d.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border rounded-lg p-6" style={{ borderColor: `${GOLD}15`, background: `${GOLD}05` }}>
          <h2 className="text-lg font-light mb-4" style={{ color: GOLD }}>Open Source</h2>
          <p className="text-sm opacity-60 leading-relaxed mb-4">
            All BIZRA research and code is available for verification. 148 repositories
            on GitHub, 136 public. The constitutional proof surface (983 tests) can be
            run by anyone on any machine.
          </p>
          <a href="https://github.com/BizraInfo/bizra-data-lake"
            className="text-sm transition-opacity hover:opacity-80" style={{ color: GOLD }}>
            github.com/BizraInfo/bizra-data-lake →
          </a>
        </section>
      </main>
    </div>
  )
}
