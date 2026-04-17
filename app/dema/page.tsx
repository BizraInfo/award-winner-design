"use client"

import { useState } from "react"
import Link from "next/link"
import { Shield, Activity, ArrowLeft } from "lucide-react"
import { IntentEntry } from "@/components/dema/intent-entry"
import { GateViewer } from "@/components/dema/gate-viewer"
import { ReceiptExplorer } from "@/components/dema/receipt-explorer"
import { DailyManifestView } from "@/components/dema/daily-manifest"
import type { Mission } from "@/lib/dema/types"

export default function DemaConsolePage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleCreated = (m: Mission) => {
    setMissions(prev => [m, ...prev])
    setSelectedId(m.id)
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#030810", color: "#F8F6F1",
      fontFamily: "var(--font-inter), system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "12px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/" style={{ color: "rgba(248,246,241,0.4)", display: "flex" }}>
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </Link>
          <Shield style={{ width: 18, height: 18, color: "#C9A962" }} />
          <span style={{
            fontFamily: "var(--font-cinzel), serif", color: "#C9A962",
            fontSize: 14, letterSpacing: 4, fontWeight: 600,
          }}>
            DEMA
          </span>
          <span style={{ fontSize: 9, color: "rgba(248,246,241,0.3)", letterSpacing: 2 }}>
            CONSOLE v1
          </span>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 10, color: "rgba(248,246,241,0.4)" }}>
          <Link href="/settings/team" style={{ color: "inherit", textDecoration: "none", letterSpacing: 1 }}>TEAM</Link>
          <Link href="/login" style={{ color: "inherit", textDecoration: "none", letterSpacing: 1 }}>SIGN IN</Link>
        </div>
      </div>

      {/* Main layout */}
      <div style={{
        maxWidth: 900, margin: "0 auto", padding: "0 24px",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24,
        minHeight: "calc(100vh - 50px)",
      }}>
        {/* Left: Intent + Mission list */}
        <div style={{ borderRight: "1px solid rgba(255,255,255,0.04)", paddingRight: 24 }}>
          <IntentEntry onMissionCreated={handleCreated} />

          {missions.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{
                fontSize: 10, color: "rgba(248,246,241,0.3)", letterSpacing: 2, marginBottom: 8,
              }}>
                MISSIONS ({missions.length})
              </div>
              {missions.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "10px 12px", marginBottom: 4, borderRadius: 6,
                    border: selectedId === m.id
                      ? "1px solid rgba(201,169,98,0.3)"
                      : "1px solid rgba(255,255,255,0.04)",
                    background: selectedId === m.id
                      ? "rgba(201,169,98,0.06)"
                      : "transparent",
                    cursor: "pointer", color: "#F8F6F1",
                  }}
                >
                  <div style={{ fontSize: 12, marginBottom: 2 }}>
                    {m.intent.length > 60 ? m.intent.slice(0, 60) + "..." : m.intent}
                  </div>
                  <div style={{
                    display: "flex", gap: 8, fontSize: 9,
                    color: "rgba(248,246,241,0.35)",
                  }}>
                    <span>{m.stage}</span>
                    <span>{m.priority}</span>
                    <span>{m.id.slice(0, 12)}...</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {missions.length === 0 && (
            <div style={{
              marginTop: 40, textAlign: "center", color: "rgba(248,246,241,0.2)", fontSize: 11,
            }}>
              <Activity style={{ width: 24, height: 24, margin: "0 auto 8px", opacity: 0.3 }} />
              No missions yet. Type an intent above.
            </div>
          )}
        </div>

        {/* Right: Gate Viewer + Receipt Explorer + Manifest */}
        <div style={{ paddingTop: 24, display: "flex", flexDirection: "column", gap: 24 }}>
          <GateViewer missionId={selectedId} />

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 16 }}>
            <ReceiptExplorer />
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 16 }}>
            <DailyManifestView />
          </div>
        </div>
      </div>
    </div>
  )
}
