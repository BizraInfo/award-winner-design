"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SovereignNav } from "@/components/sovereign/sovereign-nav"
import {
  G, G2, BG, BG2, GR, RD, BL, PU, CY, AM, YL, RS,
  TXT, MUT, DIM, DIMR, LINE,
  PAT, SAT, TIERS, TCOL, SKILLS, STAGES, getStage
} from "@/components/sovereign/design-tokens"

export default function SkillsPage() {
  const [tab, setTab] = useState<"agents" | "skills" | "tree">("agents")
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [unlockedSkills] = useState(() => SKILLS.filter(s => "u" in s && s.u).map(s => s.id))
  const [sovereignty] = useState(0.28)

  const TABS = [
    { id: "agents" as const, label: "PAT-7 AGENTS", icon: "♗" },
    { id: "skills" as const, label: "SKILL TREE", icon: "⬡" },
    { id: "tree" as const, label: "PROGRESSION", icon: "↗" },
  ]

  const agentDetails: Record<string, { missions: string[]; status: string; stats: Record<string, string> }> = {
    P1: { missions: ["Sprint planning", "Quarterly roadmap", "Priority matrix"], status: "Idle — awaiting directive", stats: { "Missions": "12", "İhsān avg": "0.972", "Specialty": "Strategy" } },
    P2: { missions: ["Literature survey", "Competitive analysis", "Data synthesis"], status: "Active — scanning feeds", stats: { "Missions": "34", "İhsān avg": "0.961", "Specialty": "Knowledge" } },
    P3: { missions: ["Code review", "Test generation", "Refactoring"], status: "Idle — compiler ready", stats: { "Missions": "48", "İhsān avg": "0.968", "Specialty": "Build" } },
    P4: { missions: ["Quality audit", "Benchmark scoring", "Regression check"], status: "Monitoring — quality gates armed", stats: { "Missions": "22", "İhsān avg": "0.983", "Specialty": "Quality" } },
    P5: { missions: ["Constitutional check", "Bias scan", "Ethical review"], status: "Sentinel — all invariants holding", stats: { "Missions": "18", "İhsān avg": "0.991", "Specialty": "Ethics" } },
    P6: { missions: ["Report drafting", "Email composition", "Documentation"], status: "Idle — channels open", stats: { "Missions": "27", "İhsān avg": "0.958", "Specialty": "Delivery" } },
    P7: { missions: ["Agent coordination", "Morning brief", "Cross-agent synthesis"], status: "Active — orchestrating", stats: { "Missions": "56", "İhsān avg": "0.974", "Specialty": "Orchestrate" } },
  }

  const stage = getStage(sovereignty)

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TXT, fontFamily: "var(--font-jetbrains), monospace" }}>
      <SovereignNav />
      <div style={{ paddingTop: 44, maxWidth: 960, margin: "0 auto" }}>
        <div style={{ padding: "20px 24px 0" }}>
          <div style={{ fontSize: 8, letterSpacing: 3, color: G, marginBottom: 4 }}>SOVEREIGN CAPABILITIES</div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>Skills & Agents</div>
          <div style={{ fontSize: 10, color: DIM, marginTop: 2 }}>PAT-7 Personal · SAT-5 System · 16 Desktop Skills · 7 Lifecycle Stages</div>
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
          {/* AGENTS TAB */}
          {tab === "agents" && (
            <div style={{ display: "grid", gridTemplateColumns: selectedAgent ? "280px 1fr" : "1fr", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {Object.entries(PAT).map(([k, a]) => {
                  const det = agentDetails[k]
                  const sel = selectedAgent === k
                  return (
                    <div key={k} onClick={() => setSelectedAgent(sel ? null : k)}
                      style={{
                        padding: 14, borderRadius: 8, cursor: "pointer",
                        border: `1px solid ${sel ? a.col + "50" : LINE}`,
                        background: sel ? `${a.col}08` : BG2,
                        transition: "all .2s",
                      }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 6,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: `${a.col}15`, border: `1px solid ${a.col}30`, fontSize: 14,
                        }}>{a.i}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: a.col, letterSpacing: 1 }}>{a.c}</span>
                            <span style={{ fontSize: 8, color: GR }}>● Online</span>
                          </div>
                          <div style={{ fontSize: 9, color: MUT }}>{a.n} — {a.d}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* SAT System Layer */}
                <div style={{ padding: 14, borderRadius: 8, border: `1px solid ${G}15`, background: `${G}04`, marginTop: 8 }}>
                  <div style={{ fontSize: 7, letterSpacing: 2, color: G, marginBottom: 8 }}>SAT-5 SYSTEM LAYER</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {SAT.map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 9 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.col }} />
                        <span style={{ color: s.col, fontWeight: 500 }}>{s.n}</span>
                        <span style={{ color: DIMR, marginLeft: "auto", fontSize: 7 }}>ACTIVE</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Agent Detail Panel */}
              {selectedAgent && (
                <AnimatePresence>
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                    style={{ padding: 20, borderRadius: 10, border: `1px solid ${PAT[selectedAgent as keyof typeof PAT]?.col}25`, background: BG2 }}>
                    {(() => {
                      const a = PAT[selectedAgent as keyof typeof PAT]
                      const det = agentDetails[selectedAgent]
                      if (!a || !det) return null
                      return (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: `${a.col}15`, border: `1px solid ${a.col}30`, fontSize: 22 }}>{a.i}</div>
                            <div>
                              <div style={{ fontFamily: "var(--font-cinzel), serif", fontSize: 16, color: a.col, letterSpacing: 2 }}>{a.c}</div>
                              <div style={{ fontSize: 10, color: MUT }}>{a.n} — {a.d}</div>
                            </div>
                          </div>

                          <div style={{ fontSize: 8, color: det.status.includes("Active") ? GR : DIM, marginBottom: 14, padding: "6px 10px", borderRadius: 4, background: det.status.includes("Active") ? `${GR}08` : `${TXT}04`, border: `1px solid ${det.status.includes("Active") ? GR + "25" : LINE}` }}>
                            {det.status}
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                            {Object.entries(det.stats).map(([k, v]) => (
                              <div key={k} style={{ padding: 10, borderRadius: 6, border: `1px solid ${LINE}`, background: `${TXT}03` }}>
                                <div style={{ fontSize: 7, letterSpacing: 1, color: DIM }}>{k}</div>
                                <div style={{ fontSize: 14, color: a.col, marginTop: 2 }}>{v}</div>
                              </div>
                            ))}
                          </div>

                          <div style={{ fontSize: 8, letterSpacing: 2, color: DIM, marginBottom: 6 }}>MISSION CAPABILITIES</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {det.missions.map((m, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: MUT }}>
                                <span style={{ color: a.col }}>▸</span>{m}
                              </div>
                            ))}
                          </div>

                          <div style={{ marginTop: 16, fontSize: 8, letterSpacing: 2, color: DIM, marginBottom: 6 }}>AGENT STATUS</div>
                          <div style={{ fontSize: 9, color: MUT }}>{a.b}</div>
                        </>
                      )
                    })()}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          )}

          {/* SKILLS TAB */}
          {tab === "skills" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: DIM }}>{unlockedSkills.length} / {SKILLS.length} skills unlocked</div>
                <div style={{ display: "flex", gap: 8, fontSize: 8 }}>
                  {TIERS.slice(0, 6).map((t, i) => (
                    <span key={i} style={{ color: TCOL[i], display: "flex", alignItems: "center", gap: 3 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: TCOL[i] }} />{t}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                {SKILLS.map(sk => {
                  const unlocked = unlockedSkills.includes(sk.id)
                  const tc = TCOL[sk.t]
                  return (
                    <motion.div key={sk.id} whileHover={{ scale: unlocked ? 1.03 : 1 }}
                      style={{
                        padding: 14, borderRadius: 8,
                        border: `1px solid ${unlocked ? tc + "30" : LINE}`,
                        background: unlocked ? `${tc}06` : BG2,
                        opacity: unlocked ? 1 : 0.45,
                        cursor: unlocked ? "pointer" : "default",
                      }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 20 }}>{sk.i}</span>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          {"hda" in sk && sk.hda && <span style={{ fontSize: 6, color: CY, letterSpacing: 1, padding: "1px 4px", borderRadius: 2, border: `1px solid ${CY}30` }}>HDA</span>}
                          <span style={{ fontSize: 7, color: tc, letterSpacing: 1 }}>{TIERS[sk.t]}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 500, color: unlocked ? tc : DIM, marginTop: 6 }}>{sk.n}</div>
                      <div style={{ fontSize: 8, color: unlocked ? GR : DIMR, marginTop: 4 }}>{unlocked ? "✓ Unlocked" : "🔒 Locked"}</div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* PROGRESSION TAB */}
          {tab === "tree" && (
            <div>
              <div style={{ padding: 16, borderRadius: 10, border: `1px solid ${G}15`, background: `${G}04`, marginBottom: 20, textAlign: "center" as const }}>
                <div style={{ fontSize: 8, letterSpacing: 2, color: DIM }}>SOVEREIGNTY LEVEL</div>
                <div style={{ fontSize: 28, fontWeight: 300, color: G, margin: "4px 0" }}>{(sovereignty * 100).toFixed(1)}%</div>
                <div style={{ fontSize: 12, color: G }}>{stage.n}</div>
                <div style={{ fontSize: 9, color: DIM, marginTop: 4, fontFamily: "var(--font-playfair), serif", fontStyle: "italic" }}>{stage.d}</div>
                <div style={{ width: "100%", maxWidth: 300, height: 6, borderRadius: 99, background: `${TXT}08`, margin: "12px auto 0" }}>
                  <div style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${G3}, ${G})`, width: `${Math.min(100, stage.h > stage.l ? ((sovereignty - stage.l) / (stage.h - stage.l)) * 100 : 100)}%`, transition: "width .5s" }} />
                </div>
              </div>

              <div style={{ fontSize: 8, letterSpacing: 2, color: DIM, marginBottom: 12 }}>SEED → CATALYST JOURNEY</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0, position: "relative" }}>
                {/* Vertical line */}
                <div style={{ position: "absolute", left: 15, top: 20, bottom: 20, width: 1, background: `${G}15` }} />
                {STAGES.map((s, i) => {
                  const active = sovereignty >= s.l
                  const current = stage.n === s.n
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", position: "relative" }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, zIndex: 1, flexShrink: 0,
                        background: current ? `${G}15` : active ? `${GR}08` : BG,
                        border: `2px solid ${current ? G : active ? GR + "40" : LINE}`,
                        color: current ? G : active ? GR : DIMR,
                        boxShadow: current ? `0 0 20px ${G}15` : "none",
                      }}>{current ? "◉" : active ? "✓" : "○"}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: current ? 600 : 400, color: current ? G : active ? GR : DIM }}>{s.n}</span>
                          <span style={{ fontSize: 8, color: DIMR }}>{(s.l * 100).toFixed(0)}% — {(s.h * 100).toFixed(0)}%</span>
                          {current && <span style={{ fontSize: 8, color: G, padding: "1px 6px", borderRadius: 3, border: `1px solid ${G}30`, background: `${G}08` }}>YOU ARE HERE</span>}
                        </div>
                        <div style={{ fontSize: 9, color: DIM, marginTop: 2, fontFamily: "var(--font-playfair), serif", fontStyle: "italic" }}>{s.d}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
