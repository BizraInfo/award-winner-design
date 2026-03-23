"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { SovereignNav } from "@/components/sovereign/sovereign-nav"
import {
  G, G2, G3, BG, BG2, GR, RD, BL, PU, CY, AM, YL,
  TXT, MUT, DIM, DIMR, LINE, PAT
} from "@/components/sovereign/design-tokens"

interface Receipt {
  id: string; agent: string; agentColor: string
  mission: string; ihsan: number; seed: number
  hash: string; timestamp: number; rarity: "common" | "rare" | "epic" | "legendary"
}

const MOCK_RECEIPTS: Receipt[] = [
  { id: "r1", agent: "P3-Artisan", agentColor: GR, mission: "Organize Downloads: 32 files classified", ihsan: 0.9812, seed: 1.42, hash: "a3f8c21e", timestamp: Date.now() - 3600000, rarity: "epic" },
  { id: "r2", agent: "P7-Oracle", agentColor: CY, mission: "Research sovereign AI architecture", ihsan: 0.9671, seed: 1.18, hash: "7d2b9f44", timestamp: Date.now() - 7200000, rarity: "rare" },
  { id: "r3", agent: "P1-Navigator", agentColor: BL, mission: "Explain constitutional membrane networking", ihsan: 0.9923, seed: 1.67, hash: "e1c4a88b", timestamp: Date.now() - 10800000, rarity: "legendary" },
  { id: "r4", agent: "P6-Diplomat", agentColor: AM, mission: "Generate CMN paper evidence pack", ihsan: 0.9558, seed: 1.05, hash: "5f9d32c1", timestamp: Date.now() - 14400000, rarity: "rare" },
  { id: "r5", agent: "P4-Guardian", agentColor: YL, mission: "Z3 membrane property verification", ihsan: 0.9847, seed: 1.51, hash: "b2e7f609", timestamp: Date.now() - 18000000, rarity: "epic" },
  { id: "r6", agent: "P5-Mentor", agentColor: RD, mission: "Adversarial resilience simulation", ihsan: 0.9961, seed: 1.82, hash: "c8a1d3f7", timestamp: Date.now() - 21600000, rarity: "legendary" },
  { id: "r7", agent: "P2-Scholar", agentColor: PU, mission: "Morning sovereign briefing", ihsan: 0.9734, seed: 1.24, hash: "4e6b8a22", timestamp: Date.now() - 25200000, rarity: "rare" },
  { id: "r8", agent: "P3-Artisan", agentColor: GR, mission: "FAISS knowledge enrichment scan", ihsan: 0.9589, seed: 1.09, hash: "91f3c7d5", timestamp: Date.now() - 28800000, rarity: "common" },
]

const RARITY_COLORS: Record<string, string> = {
  common: BL, rare: PU, epic: AM, legendary: G,
}
const RARITY_LABELS: Record<string, string> = {
  common: "COMMON", rare: "◆ RARE", epic: "💜 EPIC", legendary: "⚡ LEGENDARY",
}

export default function WalletPage() {
  const [tab, setTab] = useState<"overview" | "receipts" | "economy">("overview")
  const [receipts] = useState(MOCK_RECEIPTS)

  const totalSeed = receipts.reduce((a, r) => a + r.seed, 0)
  const totalBloom = +(totalSeed * 0.008).toFixed(4)
  const avgIhsan = receipts.reduce((a, r) => a + r.ihsan, 0) / receipts.length
  const legendaryCount = receipts.filter(r => r.rarity === "legendary").length
  const epicCount = receipts.filter(r => r.rarity === "epic").length

  const TABS = [
    { id: "overview" as const, label: "OVERVIEW", icon: "◈" },
    { id: "receipts" as const, label: "RECEIPTS", icon: "◇" },
    { id: "economy" as const, label: "ECONOMY", icon: "◆" },
  ]

  const fmt = (ts: number) => {
    const d = Date.now() - ts
    if (d < 3600000) return `${Math.floor(d / 60000)}m ago`
    if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`
    return `${Math.floor(d / 86400000)}d ago`
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TXT, fontFamily: "var(--font-jetbrains), monospace" }}>
      <SovereignNav />
      <div style={{ paddingTop: 44, maxWidth: 960, margin: "0 auto" }}>
        <div style={{ padding: "20px 24px 0" }}>
          <div style={{ fontSize: 8, letterSpacing: 3, color: G, marginBottom: 4 }}>SOVEREIGN ECONOMY</div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>Token & Wallet</div>
          <div style={{ fontSize: 10, color: DIM, marginTop: 2 }}>SEED utility · BLOOM growth · Receipt ledger · PoI rewards</div>
        </div>

        <div style={{ display: "flex", gap: 2, padding: "12px 24px 0", borderBottom: `1px solid ${LINE}` }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: "transparent", border: "none",
              borderBottom: tab === t.id ? `2px solid ${G}` : "2px solid transparent",
              color: tab === t.id ? G : DIM, padding: "8px 16px", fontSize: 8, letterSpacing: 2,
              cursor: "pointer", fontFamily: "var(--font-jetbrains), monospace",
            }}><span style={{ marginRight: 4 }}>{t.icon}</span>{t.label}</button>
          ))}
        </div>

        <div style={{ padding: "16px 24px" }}>
          {/* OVERVIEW TAB */}
          {tab === "overview" && (
            <div>
              {/* Balance Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                <div style={{
                  padding: 20, borderRadius: 10,
                  border: `1px solid ${GR}25`,
                  background: `linear-gradient(135deg, ${GR}08, ${GR}03)`,
                }}>
                  <div style={{ fontSize: 7, letterSpacing: 2, color: DIM }}>SEED BALANCE</div>
                  <div style={{ fontSize: 28, fontWeight: 300, color: GR, marginTop: 4 }}>{totalSeed.toFixed(2)}</div>
                  <div style={{ fontSize: 8, color: `${GR}80`, marginTop: 4 }}>Utility token · Earned per mission</div>
                </div>
                <div style={{
                  padding: 20, borderRadius: 10,
                  border: `1px solid ${PU}25`,
                  background: `linear-gradient(135deg, ${PU}08, ${PU}03)`,
                }}>
                  <div style={{ fontSize: 7, letterSpacing: 2, color: DIM }}>BLOOM BALANCE</div>
                  <div style={{ fontSize: 28, fontWeight: 300, color: PU, marginTop: 4 }}>{totalBloom.toFixed(4)}</div>
                  <div style={{ fontSize: 8, color: `${PU}80`, marginTop: 4 }}>Growth token · Compounds over time</div>
                </div>
                <div style={{
                  padding: 20, borderRadius: 10,
                  border: `1px solid ${G}25`,
                  background: `linear-gradient(135deg, ${G}08, ${G}03)`,
                }}>
                  <div style={{ fontSize: 7, letterSpacing: 2, color: DIM }}>İHSĀN AVERAGE</div>
                  <div style={{ fontSize: 28, fontWeight: 300, color: G, marginTop: 4 }}>{avgIhsan.toFixed(4)}</div>
                  <div style={{ fontSize: 8, color: `${G}80`, marginTop: 4 }}>Quality score · Floor: 0.9500</div>
                </div>
              </div>

              {/* Stats Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
                {[
                  { l: "Total Missions", v: `${receipts.length}`, c: BL },
                  { l: "Legendary Drops", v: `${legendaryCount}`, c: G },
                  { l: "Epic Drops", v: `${epicCount}`, c: AM },
                  { l: "Receipt Chain", v: "Verified ✓", c: GR },
                ].map((s, i) => (
                  <div key={i} style={{ padding: 12, borderRadius: 8, border: `1px solid ${LINE}`, background: BG2 }}>
                    <div style={{ fontSize: 7, letterSpacing: 1, color: DIM }}>{s.l}</div>
                    <div style={{ fontSize: 16, color: s.c, marginTop: 4 }}>{s.v}</div>
                  </div>
                ))}
              </div>

              {/* Node Value */}
              <div style={{
                padding: 20, borderRadius: 10, textAlign: "center" as const,
                border: `1px solid ${G}20`, background: `${G}04`,
              }}>
                <div style={{ fontSize: 8, letterSpacing: 2, color: DIM }}>COMPOSITE NODE VALUE</div>
                <div style={{ fontSize: 36, fontWeight: 300, color: G, margin: "8px 0" }}>
                  {(totalSeed * avgIhsan * 1.15).toFixed(2)}
                </div>
                <div style={{ fontSize: 9, color: DIM }}>
                  NV = SEED × İhsān × Compounding × Synergy
                </div>
              </div>

              {/* Recent Activity */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 8, letterSpacing: 2, color: DIM, marginBottom: 8 }}>RECENT ACTIVITY</div>
                {receipts.slice(0, 4).map(r => (
                  <div key={r.id} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                    marginBottom: 4, borderRadius: 6, border: `1px solid ${LINE}`, background: BG2,
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: r.agentColor }} />
                    <span style={{ fontSize: 9, color: r.agentColor, fontWeight: 600, minWidth: 54 }}>{r.agent}</span>
                    <span style={{ fontSize: 10, color: MUT, flex: 1 }}>{r.mission}</span>
                    <span style={{ fontSize: 9, color: RARITY_COLORS[r.rarity] }}>{RARITY_LABELS[r.rarity]}</span>
                    <span style={{ fontSize: 10, color: GR }}>+{r.seed.toFixed(2)}</span>
                    <span style={{ fontSize: 8, color: DIMR }}>{fmt(r.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RECEIPTS TAB */}
          {tab === "receipts" && (
            <div>
              <div style={{ fontSize: 10, color: DIM, marginBottom: 12 }}>
                Every mission produces a cryptographic receipt — BLAKE3-chained, Ed25519-signed, constitutionally gated.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {receipts.map(r => (
                  <motion.div key={r.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    style={{
                      padding: 16, borderRadius: 8,
                      border: `1px solid ${RARITY_COLORS[r.rarity]}20`,
                      background: `${RARITY_COLORS[r.rarity]}04`,
                    }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 6,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: `${r.agentColor}15`, border: `1px solid ${r.agentColor}30`,
                          fontSize: 8, color: r.agentColor, fontWeight: 600,
                        }}>{r.agent.slice(0, 2)}</div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{r.mission}</div>
                          <div style={{ fontSize: 8, color: DIM, marginTop: 1 }}>Agent: {r.agent} · {fmt(r.timestamp)}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: 8, color: RARITY_COLORS[r.rarity], padding: "2px 8px", borderRadius: 3, border: `1px solid ${RARITY_COLORS[r.rarity]}30`, background: `${RARITY_COLORS[r.rarity]}10` }}>
                        {RARITY_LABELS[r.rarity]}
                      </span>
                    </div>
