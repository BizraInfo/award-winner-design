"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

// ============================================
// BIZRA LAB — Founder Profile & System Proof
// The page that proves BIZRA is real.
// ============================================

const GOLD = "#C9A962"
const NAVY = "#030810"

interface MetricCard {
  label: string
  value: string
  detail: string
  verified: boolean
}

const METRICS: MetricCard[] = [
  { label: "Constitutional Tests", value: "983", detail: "proof_engine + pci + token + sat + urp + zpk", verified: true },
  { label: "Total Test Suite", value: "11,605", detail: "Full ecosystem aggregate", verified: true },
  { label: "PAT-7 Agents", value: "7/7", detail: "All EXERCISED through FATE gate", verified: true },
  { label: "SAT-5 Gates", value: "5/5", detail: "59 checks, fail-closed composite", verified: true },
  { label: "Python Core", value: "259K LOC", detail: "core/ production code", verified: true },
  { label: "Rust Crates", value: "24", detail: "Compiles clean, cargo check passes", verified: true },
  { label: "Sovereign Binary", value: "3.3 MB", detail: "Cross-platform, zero cloud deps", verified: true },
  { label: "GitHub Repos", value: "148", detail: "136 public, 12 private", verified: true },
]

const TIMELINE = [
  { date: "Ramadan 2023", event: "البذرة (The Seed) — vision crystallizes", type: "origin" },
  { date: "June 2023", event: "First Arabic papers shared via WhatsApp", type: "origin" },
  { date: "Jul-Sep 2023", event: "Midjourney, Runway Gen-2, first BIZRA video", type: "creation" },
  { date: "Nov 2023", event: "First ChatGPT conversations, BIZRAAgent", type: "learning" },
  { date: "Jan 2024", event: "Bizra Foundation AI constitution written", type: "architecture" },
  { date: "2024", event: "Architecture evolution, whitepaper versions", type: "architecture" },
  { date: "2025", event: "26 Rust crates, proof engine, FATE gate", type: "engineering" },
  { date: "Apr 2026", event: "Spearpoint seal, ADK, 7/7 PAT agents, SAT-5 composite", type: "proof" },
]

const ANCHORS = [
  { name: "IHSAN", value: "≥ 0.95", meaning: "Excellence as minimum standard" },
  { name: "RIBA_ZERO", value: "true", meaning: "Zero tolerance for interest-based instruments" },
  { name: "ZAKAT", value: "2.5%", meaning: "Redistribution to community pools" },
  { name: "GINI_MAX", value: "≤ 0.35", meaning: "Inequality hard-capped" },
  { name: "HARBERGER", value: "5%", meaning: "Tax on idle compute — use it or share it" },
  { name: "CLAIM_MUST_BIND", value: "enforced", meaning: "Every claim backed by verifiable proof" },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <h2 className="text-2xl font-light tracking-wide mb-8" style={{ color: GOLD }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

export default function LabPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div className="min-h-screen" style={{ background: NAVY }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: `${GOLD}15` }}>
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm opacity-50 hover:opacity-80 transition-opacity">
              ← bizra.ai
            </Link>
            <h1 className="text-3xl font-light mt-2" style={{ color: GOLD }}>
              BIZRA Lab
            </h1>
            <p className="text-sm opacity-60 mt-1">Sovereign AI Research &amp; Development</p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-40">Founded Ramadan 2023</p>
            <p className="text-xs opacity-40">Dubai, UAE</p>
            <p className="text-xs mt-2 font-mono" style={{ color: `${GOLD}80` }}>
              NODE0 OPERATIONAL
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Founder */}
        <Section title="Founder">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <h3 className="text-xl font-light mb-4">Mohamed Beshr</h3>
              <p className="text-sm opacity-70 leading-relaxed mb-4">
                Solo founder. 35 months of continuous R&amp;D since Ramadan 2023.
                259,000 lines of production code. 24 Rust crates. 148 GitHub repositories.
                Built the first AI system where every agent action emits a cryptographic
                receipt and passes constitutional governance before it reaches the user.
              </p>
              <p className="text-sm opacity-70 leading-relaxed">
                Self-taught systems architect. Designed and built the full BIZRA stack:
                sovereign runtime, proof engine, FATE gate, token economics,
                PAT-7 agent team, SAT-5 governance gates, and the ADK agent
                development kit — all running on a single MSI Titan 18 HX with
                an RTX 4090 Mobile.
              </p>
            </div>
            <div className="border rounded-lg p-4" style={{ borderColor: `${GOLD}20` }}>
              <p className="text-xs uppercase tracking-wider mb-3" style={{ color: `${GOLD}80` }}>
                The Promise
              </p>
              <p className="text-sm italic opacity-80 leading-relaxed">
                &ldquo;The reason you can trust the parts we&apos;re showing you is that
                we&apos;re not hiding the parts we&apos;re not.&rdquo;
              </p>
              <div className="mt-4 pt-4 border-t" style={{ borderColor: `${GOLD}10` }}>
                <p className="text-xs opacity-40">بذرة واحدة تصنع غابة</p>
                <p className="text-xs opacity-40 mt-1">One seed makes a forest</p>
              </div>
            </div>
          </div>
        </Section>

        {/* Verified Metrics */}
        <Section title="Verified Metrics">
          <p className="text-xs opacity-40 mb-6">
            Every number below is verified by running the stated command on Node0.
            Source: docs/METRICS_CANONICAL.md
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {METRICS.map((m) => (
              <div
                key={m.label}
                className="border rounded-lg p-4 transition-colors hover:border-opacity-40"
                style={{ borderColor: `${GOLD}15` }}
              >
                <p className="text-2xl font-light" style={{ color: GOLD }}>{m.value}</p>
                <p className="text-sm mt-1 opacity-80">{m.label}</p>
                <p className="text-xs mt-2 opacity-40">{m.detail}</p>
                {m.verified && (
                  <span className="text-[10px] mt-2 inline-block px-2 py-0.5 rounded-full"
                    style={{ background: `${GOLD}10`, color: `${GOLD}90` }}>
                    VERIFIED
                  </span>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Constitutional Anchors */}
        <Section title="Constitutional Anchors">
          <p className="text-xs opacity-40 mb-6">
            Runtime constants enforced at the kernel level. Not policies — invariants.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {ANCHORS.map((a) => (
              <div key={a.name} className="flex items-start gap-3 p-3 rounded-lg"
                style={{ background: `${GOLD}05` }}>
                <span className="font-mono text-sm shrink-0" style={{ color: GOLD }}>{a.value}</span>
                <div>
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs opacity-50 mt-0.5">{a.meaning}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Timeline */}
        <Section title="Timeline">
          <div className="space-y-4">
            {TIMELINE.map((t, i) => (
              <div key={i} className="flex gap-4 items-start">
                <span className="text-xs font-mono opacity-40 w-28 shrink-0 pt-0.5">{t.date}</span>
                <div className="flex-1 border-l pl-4 pb-4" style={{ borderColor: `${GOLD}20` }}>
                  <p className="text-sm opacity-80">{t.event}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Verify Yourself */}
        <Section title="Verify It Yourself">
          <div className="border rounded-lg p-6 font-mono text-sm" style={{ borderColor: `${GOLD}20`, background: `${GOLD}05` }}>
            <p className="opacity-40 mb-4"># Clone the repo and run the tests</p>
            <p>git clone https://github.com/BizraInfo/bizra-data-lake.git</p>
            <p>cd bizra-data-lake</p>
            <p>python -m venv .venv &amp;&amp; source .venv/bin/activate</p>
            <p>pip install -e .</p>
            <p>pytest tests/core/proof_engine/ tests/core/sat/ tests/core/pci/ -v</p>
            <p className="mt-4 opacity-40"># See the constitutional proof surface: 983 tests</p>
            <p className="mt-2 opacity-40"># Every claim in this page binds to that output.</p>
          </div>
        </Section>

        {/* Links */}
        <section className="mt-16 pt-8 border-t" style={{ borderColor: `${GOLD}10` }}>
          <div className="flex flex-wrap gap-6 text-sm">
            <a href="https://github.com/BizraInfo" className="opacity-50 hover:opacity-80 transition-opacity">
              GitHub →
            </a>
            <a href="https://github.com/BizraInfo/bizra-data-lake" className="opacity-50 hover:opacity-80 transition-opacity">
              Source Code →
            </a>
            <Link href="/genesis" className="opacity-50 hover:opacity-80 transition-opacity">
              Genesis Dashboard →
            </Link>
            <Link href="/terminal" className="opacity-50 hover:opacity-80 transition-opacity">
              Sovereign Terminal →
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-8" style={{ borderColor: `${GOLD}10` }}>
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
          <p className="text-xs opacity-30">BIZRA Lab — Dubai, UAE</p>
          <p className="text-xs opacity-30">بسم الله الرحمن الرحيم</p>
        </div>
      </footer>
    </div>
  )
}
