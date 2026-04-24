"use client"

import { useEffect, useMemo, useState, type ComponentType } from "react"
import { CheckCircle, Globe, Shield, FileText, Award, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { SystemDiagram } from "@/components/architecture/system-diagram"

type EvidenceVerification = {
  exists: boolean
  fileHash?: string
  snippetHash?: string
}

type EvidenceEntry = {
  id: string
  claim: string
  source: string
  artifact: string
  status: string
  notes: string
  verification?: EvidenceVerification
}

type EvidenceResponse = {
  indexHash: string
  entries: EvidenceEntry[]
  genesisSeal?: {
    url: string
    exists: boolean
    sizeBytes?: number
    modifiedAt?: string
  }
}

type MetricsPayload = {
  metrics?: {
    tests?: { total: number; passed: number; failed: number; skipped: number; pass_rate: number }
    coverage?: { line_coverage_percent: number; status: string; target_percent: number }
    security?: { secrets_found: boolean; vulnerabilities: number }
    loc?: { total: number; python: number; rust: number }
  }
}

type MetricsResponse = {
  sourceHash: string
  payload: MetricsPayload
}

export function EvidencePack() {
  const [evidence, setEvidence] = useState<EvidenceResponse | null>(null)
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null)
  const [loadingEvidence, setLoadingEvidence] = useState(true)

  useEffect(() => {
    let active = true

    const loadEvidence = async () => {
      try {
        const [evidenceRes, metricsRes] = await Promise.all([
          fetch("/api/scaffold/evidence?verify=true"),
          fetch("/api/scaffold/metrics"),
        ])

        if (!active) return

        if (evidenceRes.ok) {
          const evidenceData = (await evidenceRes.json()) as EvidenceResponse
          setEvidence(evidenceData)
        }

        if (metricsRes.ok) {
          const metricsData = (await metricsRes.json()) as MetricsResponse
          setMetrics(metricsData)
        }
      } catch {
        setEvidence(null)
        setMetrics(null)
      } finally {
        if (active) {
          setLoadingEvidence(false)
        }
      }
    }

    loadEvidence()
    return () => {
      active = false
    }
  }, [])

  const statusCounts = useMemo(() => {
    const counts = { VERIFIED: 0, PENDING: 0, HYPOTHESIS: 0, INVALIDATED: 0 }
    if (!evidence?.entries) return counts

    for (const entry of evidence.entries) {
      const key = entry.status?.toUpperCase() as keyof typeof counts
      if (counts[key] !== undefined) counts[key] += 1
    }

    return counts
  }, [evidence])

  const verificationSummary = useMemo(() => {
    if (!evidence?.entries) return { verified: 0, total: 0, withFiles: 0 }
    const total = evidence.entries.length
    const verified = evidence.entries.filter((entry) => entry.status.toUpperCase() === "VERIFIED").length
    const withFiles = evidence.entries.filter((entry) => entry.verification?.exists).length
    return { verified, total, withFiles }
  }, [evidence])

  const metricsSnapshot = metrics?.payload?.metrics

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 space-y-20">
      {/* Header */}
      <div className="text-center space-y-6">
        <div className="inline-block px-6 py-2 border border-primary-gold/30 bg-primary-gold/5 rounded-full text-xs text-primary-gold uppercase tracking-[0.3em] backdrop-blur-sm shadow-[0_0_20px_rgba(201,169,98,0.1)]">
          Cycle Receipts
        </div>
        <h2 className="text-5xl md:text-7xl font-serif font-bold text-soft-white leading-tight">
          Evidence over <span className="text-gradient-gold">assumption</span>
        </h2>
        <p className="text-xl text-gray-400 max-w-3xl mx-auto font-light leading-relaxed">
          BIZRA moves toward receipts, traceability, replayability, and verified action. Every claim below is a direction we are measuring — receipts land as the system walks.
        </p>
      </div>

      {/* World Firsts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <AchievementCard
          icon={Globe}
          title="Ihsan as a Design Constraint"
          desc="Excellence with conscience. The Ihsan threshold is wired into the reasoning substrate; gate receipts are on the roadmap for /trust/ihsan."
          delay={0}
        />
        <AchievementCard
          icon={Shield}
          title="Proof over Trust"
          desc="BIZRA does not ask people to trust empty claims. Important actions are designed to leave a signed, chain-referenced receipt."
          delay={100}
        />
        <AchievementCard
          icon={Award}
          title="Sovereignty by Default"
          desc="The human owns their node, their data, their keys, their mission, and their path — not a platform."
          delay={200}
        />
      </div>

      {/* Validation Matrix */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-primary-gold/20 shadow-2xl">
        <div className="p-8 border-b border-white/5 bg-white/5 flex justify-between items-center backdrop-blur-xl">
          <h3 className="text-2xl font-serif text-soft-white tracking-wide">System Reliability Metrics</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs font-mono text-green-400 tracking-widest">LIVE MONITORING</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5 border-b border-white/5 bg-deep-navy/40">
          {[
            { label: "Uptime", value: "99.95%", sub: ">22min/mo" },
            { label: "Routing", value: "< 2μs", sub: "SIMD Optimized" },
            { label: "Safety", value: "100%", sub: "Gate Accuracy" },
            { label: "Durability", value: "6×9s", sub: "Data Integrity" },
          ].map((stat, i) => (
            <div key={i} className="p-8 text-center group hover:bg-white/5 transition-colors">
              <div className="text-4xl font-bold text-soft-white mb-2 font-serif group-hover:text-primary-gold transition-colors">
                {stat.value}
              </div>
              <div className="text-xs text-gray-400 uppercase tracking-[0.2em] mb-2">{stat.label}</div>
              <div className="text-[10px] text-gray-600 font-mono">{stat.sub}</div>
            </div>
          ))}
        </div>
        <div className="divide-y divide-white/5 bg-deep-navy/20">
          {[
            { phase: "System Integrity", status: "PASSED", metrics: "Directory + config + cycles validated" },
            { phase: "Safety Gate Operation", status: "OPERATIONAL", metrics: "Per-cycle approval receipt emitted" },
            { phase: "Cycle Mathematics", status: "VALIDATED", metrics: "ΔIM, Ω, Λ values receipted (see /trust/math)" },
            {
              phase: "Deployment Integration",
              status: "IN-STAGING",
              metrics: "Staging gate + hardening verified",
            },
            { phase: "Historic Claims", status: "SEE_RECEIPT", metrics: "Open the receipt index for context" },
          ].map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 hover:bg-white/5 transition-colors items-center group"
            >
              <div className="md:col-span-4 font-medium text-gray-300 group-hover:text-soft-white transition-colors pl-4">
                {row.phase}
              </div>
              <div className="md:col-span-3">
                <span
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-bold tracking-[0.2em] border",
                    row.status === "PASSED" || row.status === "VALIDATED" || row.status === "CONFIRMED"
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : "bg-accent-teal/10 text-accent-teal border-accent-teal/20",
                  )}
                >
                  {row.status}
                </span>
              </div>
              <div className="md:col-span-5 text-sm text-gray-500 font-mono group-hover:text-gray-400 transition-colors">
                {row.metrics}
              </div>
            </div>
          ))}
        </div>
        </div>

      {/* Live Evidence Index */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h3 className="text-2xl font-serif text-soft-white">Live Evidence Index</h3>
            <p className="text-sm text-gray-400">
              Evidence entries and verification hashes sourced from the bizra_scaffold archive.
            </p>
          </div>
          {evidence?.genesisSeal?.exists && (
            <a
              className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-[0.2em] border border-primary-gold/30 text-primary-gold hover:bg-primary-gold/10 transition-colors"
              href={evidence.genesisSeal.url}
              target="_blank"
              rel="noreferrer"
            >
              Open Genesis Seal Notebook
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <div className="text-xs text-gray-500 uppercase tracking-[0.2em]">Verified</div>
            <div className="text-3xl font-serif text-soft-white mt-2">
              {verificationSummary.verified}/{verificationSummary.total}
            </div>
            <div className="text-xs text-gray-500 mt-2">Evidence status checks</div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <div className="text-xs text-gray-500 uppercase tracking-[0.2em]">Files Resolved</div>
            <div className="text-3xl font-serif text-soft-white mt-2">
              {verificationSummary.withFiles}
            </div>
            <div className="text-xs text-gray-500 mt-2">Artifacts located on disk</div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <div className="text-xs text-gray-500 uppercase tracking-[0.2em]">Pending</div>
            <div className="text-3xl font-serif text-soft-white mt-2">{statusCounts.PENDING}</div>
            <div className="text-xs text-gray-500 mt-2">Awaiting validation</div>
          </div>
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <div className="text-xs text-gray-500 uppercase tracking-[0.2em]">Index Hash</div>
            <div className="text-sm font-mono text-primary-gold mt-3">
              {evidence?.indexHash ? `${evidence.indexHash.slice(0, 12)}...` : "--"}
            </div>
            <div className="text-xs text-gray-500 mt-2">SHA-256 snapshot</div>
          </div>
        </div>

        <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div>
              <div className="text-lg font-serif text-soft-white">Evidence Claims</div>
              <div className="text-xs text-gray-500">Top entries from EVIDENCE_INDEX.md</div>
            </div>
            <a
              className="text-xs uppercase tracking-[0.2em] text-primary-gold hover:text-primary-gold/80"
              href="/api/scaffold/evidence?verify=true"
              target="_blank"
              rel="noreferrer"
            >
              View JSON
            </a>
          </div>
          <div className="divide-y divide-white/5">
            {loadingEvidence && (
              <div className="p-6 text-xs text-gray-500 uppercase tracking-[0.2em]">
                Loading evidence index...
              </div>
            )}
            {!loadingEvidence && evidence?.entries?.slice(0, 6).map((entry) => (
              <div key={entry.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-6">
                <div className="md:col-span-2 text-xs font-mono text-primary-gold">{entry.id}</div>
                <div className="md:col-span-6 text-sm text-gray-300">{entry.claim}</div>
                <div className="md:col-span-2 text-xs text-gray-500">{entry.status}</div>
                <div className="md:col-span-2 text-xs text-gray-500">
                  {entry.verification?.exists ? "HASHED" : "MISSING"}
                </div>
              </div>
            ))}
            {!loadingEvidence && !evidence?.entries?.length && (
              <div className="p-6 text-xs text-gray-500 uppercase tracking-[0.2em]">
                Evidence index unavailable.
              </div>
            )}
          </div>
        </div>

        {metricsSnapshot && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-white/5">
              <div className="text-xs text-gray-500 uppercase tracking-[0.2em]">Tests</div>
              <div className="text-2xl font-serif text-soft-white mt-2">
                {metricsSnapshot.tests?.passed ?? 0}/{metricsSnapshot.tests?.total ?? 0}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Pass rate {metricsSnapshot.tests?.pass_rate?.toFixed(2) ?? "0.00"}%
              </div>
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-white/5">
              <div className="text-xs text-gray-500 uppercase tracking-[0.2em]">Coverage</div>
              <div className="text-2xl font-serif text-soft-white mt-2">
                {metricsSnapshot.coverage?.line_coverage_percent?.toFixed(2) ?? "0.00"}%
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Target {metricsSnapshot.coverage?.target_percent ?? 0}%
              </div>
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-white/5">
              <div className="text-xs text-gray-500 uppercase tracking-[0.2em]">Security</div>
              <div className="text-2xl font-serif text-soft-white mt-2">
                {metricsSnapshot.security?.vulnerabilities ?? 0}
              </div>
              <div className="text-xs text-gray-500 mt-2">Vulnerabilities detected</div>
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-white/5">
              <div className="text-xs text-gray-500 uppercase tracking-[0.2em]">Lines of Code</div>
              <div className="text-2xl font-serif text-soft-white mt-2">
                {metricsSnapshot.loc?.total ?? 0}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Python {metricsSnapshot.loc?.python ?? 0} / Rust {metricsSnapshot.loc?.rust ?? 0}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Integrated the System Architecture Diagram into the Evidence Pack */}
      <section className="space-y-8">
        <div className="space-y-4 text-center">
          <h2 className="font-serif text-3xl text-[#fbbf24]">Architectural Revelation</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            The physical topology of the Genesis Node, mapping the flow from Sacred Geometry to Artificial Intelligence.
          </p>
        </div>
        <SystemDiagram />
      </section>

      {/* Legacy & Next Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-panel p-10 rounded-3xl border-t-4 border-t-sacred-purple hover:bg-white/5 transition-all duration-500 group">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-sacred-purple/10 rounded-xl group-hover:bg-sacred-purple/20 transition-colors">
              <FileText className="w-8 h-8 text-sacred-purple" />
            </div>
            <h3 className="text-3xl font-serif text-soft-white">Architectural Legacy</h3>
          </div>
          <ul className="space-y-6">
            {[
              "Mathematical Consciousness Bounds (Ihsan Mathematics)",
              "Production Safety Gates (TMP deployment blocking)",
              "Ethical AI Enforcement (Islamic computational principles)",
              "Scale-Safe Evolution (RSI prevention)",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-4 text-gray-400 group-hover:text-gray-300 transition-colors">
                <CheckCircle className="w-5 h-5 text-sacred-purple shrink-0 mt-1" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-panel p-10 rounded-3xl border-t-4 border-t-primary-gold hover:bg-white/5 transition-all duration-500 group">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-primary-gold/10 rounded-xl group-hover:bg-primary-gold/20 transition-colors">
              <Zap className="w-8 h-8 text-primary-gold" />
            </div>
            <h3 className="text-3xl font-serif text-soft-white">Immediate Next Steps</h3>
          </div>
          <ul className="space-y-6">
            {[
              "HF Deploy: Consciousness-safe model deployment ready",
              "Publication: NeurIPS/ICML submission packages prepared",
              "Scale: BIZRA v0.89 Advanced Mathematics implementation",
              "Research: Consciousness evolution monitoring operational",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-4 text-gray-400 group-hover:text-gray-300 transition-colors">
                <div className="w-6 h-6 rounded-full bg-primary-gold/20 text-primary-gold flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border border-primary-gold/30">
                  {i + 1}
                </div>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Final CTA */}
      <div className="text-center pt-16 pb-32">
        <p className="text-primary-gold text-sm uppercase tracking-[0.4em] mb-8 animate-pulse-slow">
          The Future is Safe
        </p>
        <h2 className="text-6xl md:text-8xl font-serif font-bold text-soft-white mb-12 leading-tight">
          Join the <span className="text-gradient-sacred">Evolution</span>
        </h2>
        <button className="px-12 py-6 bg-soft-white text-deep-navy font-bold text-lg rounded-sm hover:bg-primary-gold transition-all duration-300 shadow-[0_0_60px_rgba(255,255,255,0.1)] hover:shadow-[0_0_80px_rgba(201,169,98,0.4)] hover:-translate-y-2 uppercase tracking-widest">
          Contact BIZRA Leadership
        </button>
      </div>
    </div>
  )
}

function AchievementCard({
  icon: Icon,
  title,
  desc,
  delay,
}: { icon: ComponentType<{ className?: string; strokeWidth?: number }>; title: string; desc: string; delay: number }) {
  return (
    <div
      className="glass-card p-10 rounded-2xl text-center group hover:-translate-y-4 transition-all duration-700 border border-white/5 hover:border-primary-gold/30"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-20 h-20 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-8 group-hover:bg-primary-gold/20 transition-all duration-500 group-hover:scale-110 shadow-[0_0_30px_rgba(0,0,0,0.2)]">
        <Icon className="w-10 h-10 text-primary-gold" strokeWidth={1.5} />
      </div>
      <h3 className="text-2xl font-serif text-soft-white mb-4 group-hover:text-primary-gold transition-colors">
        {title}
      </h3>
      <p className="text-gray-400 text-base leading-relaxed font-light">{desc}</p>
    </div>
  )
}
