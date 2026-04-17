"use client"

import { useEffect, useState } from "react"
import { Shield, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react"
import type { AdmissibilityResult, GateVerdict, Invariant } from "@/lib/dema/types"

const GATE_LABELS: Record<Invariant, { label: string; description: string }> = {
  ZANN_ZERO: { label: "ZANN ZERO", description: "No claim without evidence" },
  CLAIM_MUST_BIND: { label: "CLAIM MUST BIND", description: "Every claim has a verifiable artifact" },
  RIBA_ZERO: { label: "RIBA ZERO", description: "No extractive economic patterns" },
  NO_SHADOW_STATE: { label: "NO SHADOW STATE", description: "No UI simulation without backend truth" },
  IHSAN_FLOOR: { label: "IHSAN FLOOR", description: "Excellence threshold ≥ 0.95" },
}

const VERDICT_ICON = {
  PERMIT: { Icon: CheckCircle, color: "#22c55e" },
  REJECT: { Icon: XCircle, color: "#ef4444" },
  REVIEW: { Icon: AlertTriangle, color: "#f97316" },
  SCORE_ONLY: { Icon: Shield, color: "#3b82f6" },
}

function GateRow({ gate }: { gate: GateVerdict }) {
  const meta = GATE_LABELS[gate.invariant]
  const { Icon, color } = VERDICT_ICON[gate.verdict]

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
      background: "rgba(255,255,255,0.02)", borderRadius: 6,
      border: `1px solid ${color}15`,
    }}>
      <Icon style={{ width: 18, height: 18, color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: "#F8F6F1", fontWeight: 600, letterSpacing: 1 }}>
          {meta.label}
        </div>
        <div style={{ fontSize: 10, color: "rgba(248,246,241,0.5)", marginTop: 2 }}>
          {gate.reason || meta.description}
        </div>
      </div>
      <div style={{ fontSize: 10, color, fontWeight: 600, flexShrink: 0 }}>
        {gate.verdict}
        {gate.score !== null && (
          <span style={{ marginLeft: 6, color: "rgba(248,246,241,0.4)" }}>
            {gate.score.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  )
}

interface Props {
  missionId: string | null
}

export function GateViewer({ missionId }: Props) {
  const [result, setResult] = useState<AdmissibilityResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!missionId) { setResult(null); return }
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/gates/${encodeURIComponent(missionId)}`)
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => { if (!cancelled) setResult(data) })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [missionId])

  if (!missionId) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "rgba(248,246,241,0.3)", fontSize: 12 }}>
        Submit an intent to see the admissibility chain.
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "rgba(201,169,98,0.6)" }}>
        <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite", margin: "0 auto" }} />
        <div style={{ fontSize: 11, marginTop: 8 }}>Evaluating gates...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 12, background: "rgba(239,68,68,0.06)", borderRadius: 6, color: "#ef4444", fontSize: 11 }}>
        Gate evaluation failed: {error}
      </div>
    )
  }

  if (!result) return null

  const verdictColor = VERDICT_ICON[result.finalVerdict].color

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 12,
      }}>
        <div style={{
          color: "#C9A962", fontSize: 10, letterSpacing: 3,
          fontFamily: "var(--font-cinzel), serif",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Shield style={{ width: 14, height: 14 }} />
          ADMISSIBILITY CHAIN
        </div>
        <div style={{
          fontSize: 11, fontWeight: 700, color: verdictColor,
          padding: "2px 10px", borderRadius: 12,
          border: `1px solid ${verdictColor}30`,
          background: `${verdictColor}08`,
        }}>
          {result.finalVerdict}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {result.gates.map((gate, i) => (
          <GateRow key={i} gate={gate} />
        ))}
      </div>

      <div style={{ marginTop: 8, fontSize: 9, color: "rgba(248,246,241,0.25)", textAlign: "right" }}>
        Mission: {result.missionId.slice(0, 16)}... | {new Date(result.timestamp).toLocaleTimeString()}
      </div>
    </div>
  )
}
