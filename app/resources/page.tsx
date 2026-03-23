"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { SovereignNav } from "@/components/sovereign/sovereign-nav"
import {
  G, G2, BG, BG2, GR, RD, BL, PU, CY, AM, YL,
  TXT, MUT, DIM, DIMR, LINE
} from "@/components/sovereign/design-tokens"

interface ModelConfig {
  id: string; name: string; provider: "ollama" | "lmstudio" | "cloud"
  size: string; status: "loaded" | "available" | "downloading"
  vram: number; quality: number; speed: number
}

const MODELS: ModelConfig[] = [
  { id: "qwen2.5-7b", name: "Qwen 2.5 7B", provider: "ollama", size: "4.4 GB", status: "loaded", vram: 5.2, quality: 82, speed: 45 },
  { id: "deepseek-r1-8b", name: "DeepSeek R1 8B", provider: "ollama", size: "4.9 GB", status: "loaded", vram: 6.1, quality: 88, speed: 38 },
  { id: "mistral-7b", name: "Mistral 7B", provider: "ollama", size: "4.1 GB", status: "loaded", vram: 4.8, quality: 80, speed: 52 },
  { id: "llama3.2-3b", name: "Llama 3.2 3B", provider: "ollama", size: "2.0 GB", status: "loaded", vram: 2.4, quality: 72, speed: 78 },
  { id: "bizra-planner", name: "BIZRA Planner", provider: "ollama", size: "3.8 GB", status: "loaded", vram: 4.2, quality: 91, speed: 35 },
  { id: "gemma-9b", name: "Gemma 2 9B", provider: "lmstudio", size: "5.5 GB", status: "available", vram: 6.8, quality: 85, speed: 32 },
  { id: "phi-3-mini", name: "Phi-3 Mini", provider: "lmstudio", size: "2.3 GB", status: "available", vram: 2.8, quality: 75, speed: 68 },
  { id: "claude-api", name: "Claude 4.6 Sonnet", provider: "cloud", size: "API", status: "available", vram: 0, quality: 98, speed: 25 },
]

const TIERS = [
  { id: "local-fast", label: "Local Fast", desc: "Llama/Phi — low latency, lower quality", color: GR, icon: "⚡" },
  { id: "local-balanced", label: "Local Balanced", desc: "Qwen/Mistral — good balance", color: BL, icon: "⚖️" },
  { id: "local-deep", label: "Local Deep", desc: "DeepSeek/BIZRA — high quality reasoning", color: PU, icon: "🧠" },
  { id: "cloud-emergency", label: "Cloud Fallback", desc: "Claude API — emergency tier only", color: AM, icon: "☁️" },
]

export default function ResourcesPage() {
  const [selectedTier, setSelectedTier] = useState("local-balanced")
  const [models, setModels] = useState(MODELS)
  const [memBudget, setMemBudget] = useState(24)
  const [concurrency, setConcurrency] = useState(2)
  const [tab, setTab] = useState<"models" | "compute" | "tiers">("models")

  const loaded = models.filter(m => m.status === "loaded")
  const totalVram = loaded.reduce((a, m) => a + m.vram, 0)
  const toggleModel = (id: string) => {
    setModels(p => p.map(m => m.id === id
      ? { ...m, status: m.status === "loaded" ? "available" as const : "loaded" as const }
      : m))
  }

  const S = {
    panel: { padding: 16, borderRadius: 10, border: `1px solid ${G}15`, background: `${G}04` } as const,
    card: { padding: 14, borderRadius: 8, border: `1px solid ${LINE}`, background: BG2, transition: "all .2s" } as const,
  }

  const TABS = [
    { id: "models" as const, label: "MODELS", icon: "◇" },
    { id: "compute" as const, label: "COMPUTE", icon: "⬡" },
    { id: "tiers" as const, label: "TIERS", icon: "◆" },
  ]

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TXT, fontFamily: "var(--font-jetbrains), monospace" }}>
      <SovereignNav />
      <div style={{ paddingTop: 44 }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 0", maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 8, letterSpacing: 3, color: G, marginBottom: 4 }}>SOVEREIGN INFRASTRUCTURE</div>
              <div style={{ fontSize: 18, fontWeight: 500 }}>Resource Pool</div>
              <div style={{ fontSize: 10, color: DIM, marginTop: 2 }}>Local-first inference · Tiered fallback · Constitutional governance</div>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 9 }}>
              <div style={{ textAlign: "right" as const }}>
                <div style={{ color: DIM }}>VRAM Used</div>
                <div style={{ color: totalVram > memBudget ? RD : GR, fontSize: 14 }}>{totalVram.toFixed(1)} / {memBudget} GB</div>
              </div>
              <div style={{ textAlign: "right" as const }}>
                <div style={{ color: DIM }}>Models Loaded</div>
                <div style={{ color: GR, fontSize: 14 }}>{loaded.length}</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 2, borderBottom: `1px solid ${LINE}` }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: "transparent", border: "none",
                borderBottom: tab === t.id ? `2px solid ${G}` : "2px solid transparent",
                color: tab === t.id ? G : DIM, padding: "8px 16px", fontSize: 8, letterSpacing: 2,
                cursor: "pointer", fontFamily: "var(--font-jetbrains), monospace",
              }}><span style={{ marginRight: 4 }}>{t.icon}</span>{t.label}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: "16px 24px", maxWidth: 960, margin: "0 auto" }}>
          {/* MODELS TAB */}
          {tab === "models" && (
            <div>
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                {(["ollama", "lmstudio", "cloud"] as const).map(p => {
                  const count = models.filter(m => m.provider === p).length
                  const col = p === "ollama" ? GR : p === "lmstudio" ? BL : AM
                  return (
                    <div key={p} style={{ ...S.panel, flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: col }} />
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 500, color: col }}>{p === "ollama" ? "Ollama" : p === "lmstudio" ? "LM Studio" : "Cloud API"}</div>
                        <div style={{ fontSize: 8, color: DIM }}>{count} model{count !== 1 ? "s" : ""}</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Model list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {models.map(m => {
                  const pCol = m.provider === "ollama" ? GR : m.provider === "lmstudio" ? BL : AM
                  const isLoaded = m.status === "loaded"
                  return (
                    <motion.div key={m.id} layout
                      style={{
                        ...S.card, display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
                        borderColor: isLoaded ? `${pCol}30` : LINE,
                        background: isLoaded ? `${pCol}06` : BG2,
                      }}
                      onClick={() => toggleModel(m.id)}>
                      <div style={{ width: 36, height: 36, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: `${pCol}12`, border: `1px solid ${pCol}25` }}>
                        <span style={{ fontSize: 8, color: pCol, fontWeight: 600 }}>{m.provider === "ollama" ? "OL" : m.provider === "lmstudio" ? "LM" : "☁"}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: isLoaded ? TXT : MUT }}>{m.name}</div>
                        <div style={{ fontSize: 8, color: DIM, marginTop: 2 }}>{m.size} · {m.vram > 0 ? m.vram + " GB VRAM" : "Remote"}</div>
                      </div>
                      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                        <div style={{ width: 60 }}>
                          <div style={{ fontSize: 7, color: DIM, marginBottom: 2 }}>Quality</div>
                          <div style={{ height: 3, borderRadius: 2, background: `${TXT}08` }}>
                            <div style={{ height: "100%", borderRadius: 2, background: PU, width: `${m.quality}%` }} />
                          </div>
                        </div>
                        <div style={{ width: 60 }}>
                          <div style={{ fontSize: 7, color: DIM, marginBottom: 2 }}>Speed</div>
                          <div style={{ height: 3, borderRadius: 2, background: `${TXT}08` }}>
                            <div style={{ height: "100%", borderRadius: 2, background: CY, width: `${m.speed}%` }} />
                          </div>
                        </div>
                      </div>
                      <div style={{
                        padding: "4px 10px", borderRadius: 3, fontSize: 8, fontWeight: 500,
                        background: isLoaded ? `${GR}15` : "transparent",
                        border: `1px solid ${isLoaded ? GR + "40" : LINE}`,
                        color: isLoaded ? GR : DIM,
                      }}>{isLoaded ? "● LOADED" : "LOAD"}</div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* COMPUTE TAB */}
          {tab === "compute" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={S.panel}>
                <div style={{ fontSize: 8, letterSpacing: 2, color: G, marginBottom: 12 }}>HARDWARE</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { l: "CPU", v: "i9-14900HX", c: BL },
                    { l: "GPU", v: "RTX 4090 Mobile", c: GR },
                    { l: "RAM", v: "128 GB DDR5", c: PU },
                    { l: "Storage", v: "2 TB NVMe", c: CY },
                  ].map((h, i) => (
                    <div key={i} style={{ padding: 10, borderRadius: 6, border: `1px solid ${LINE}`, background: BG2 }}>
                      <div style={{ fontSize: 7, letterSpacing: 2, color: DIM }}>{h.l}</div>
                      <div style={{ fontSize: 11, color: h.c, marginTop: 2 }}>{h.v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={S.panel}>
                <div style={{ fontSize: 8, letterSpacing: 2, color: G, marginBottom: 12 }}>ALLOCATION</div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, marginBottom: 4 }}>
                    <span style={{ color: DIM }}>VRAM Budget</span>
                    <span style={{ color: G }}>{memBudget} GB</span>
                  </div>
                  <input type="range" min={8} max={48} value={memBudget}
                    onChange={e => setMemBudget(+e.target.value)}
                    style={{ width: "100%", accentColor: G }} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, marginBottom: 4 }}>
                    <span style={{ color: DIM }}>Max Concurrency</span>
                    <span style={{ color: BL }}>{concurrency} agents</span>
                  </div>
                  <input type="range" min={1} max={4} value={concurrency}
                    onChange={e => setConcurrency(+e.target.value)}
                    style={{ width: "100%", accentColor: BL }} />
                </div>
                <div>
                  <div style={{ fontSize: 9, color: DIM, marginBottom: 6 }}>Utilization</div>
                  {[
                    { l: "VRAM", v: totalVram / memBudget, c: totalVram > memBudget ? RD : GR },
                    { l: "CPU", v: 0.34, c: BL },
                    { l: "Disk I/O", v: 0.12, c: CY },
                  ].map((u, i) => (
                    <div key={i} style={{ marginBottom: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, marginBottom: 2 }}>
                        <span style={{ color: DIM }}>{u.l}</span>
                        <span style={{ color: u.c }}>{(u.v * 100).toFixed(0)}%</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: `${TXT}08` }}>
                        <div style={{ height: "100%", borderRadius: 2, background: u.c, width: `${Math.min(100, u.v * 100)}%`, transition: "width .3s" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inference Pipeline */}
              <div style={{ ...S.panel, gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 8, letterSpacing: 2, color: G, marginBottom: 12 }}>INFERENCE PIPELINE</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {[
                    { l: "Request", c: TXT, icon: "▸" },
                    { l: "LM Studio", c: BL, icon: "1" },
                    { l: "Ollama", c: GR, icon: "2" },
                    { l: "Cloud API", c: AM, icon: "3" },
                    { l: "Response", c: G, icon: "◆" },
                  ].map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                      <div style={{
                        padding: "8px 12px", borderRadius: 6, border: `1px solid ${s.c}25`,
                        background: `${s.c}08`, flex: 1, textAlign: "center" as const,
                      }}>
                        <div style={{ fontSize: 10, color: s.c, fontWeight: 500 }}>{s.icon}</div>
                        <div style={{ fontSize: 8, color: DIM, marginTop: 2 }}>{s.l}</div>
                      </div>
                      {i < 4 && <span style={{ color: DIMR, fontSize: 10 }}>→</span>}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 8, color: DIM, marginTop: 8, fontStyle: "italic" }}>
                  Local-first: LM Studio → Ollama fallback → Cloud emergency only. Your data never leaves unless you allow it.
                </div>
              </div>
            </div>
          )}

          {/* TIERS TAB */}
          {tab === "tiers" && (
            <div>
              <div style={{ fontSize: 10, color: DIM, marginBottom: 16 }}>
                Configure which inference tier handles each mission type. The system routes automatically but you can override.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {TIERS.map(t => {
                  const tierModels = models.filter(m =>
                    t.id === "local-fast" ? m.speed >= 60 :
                    t.id === "local-balanced" ? m.speed >= 30 && m.speed < 60 :
                    t.id === "local-deep" ? m.quality >= 85 && m.provider !== "cloud" :
                    m.provider === "cloud"
                  )
                  return (
                    <div key={t.id} onClick={() => setSelectedTier(t.id)}
                      style={{
                        ...S.card, cursor: "pointer",
                        borderColor: selectedTier === t.id ? t.color + "50" : LINE,
                        background: selectedTier === t.id ? `${t.color}06` : BG2,
                      }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                        <span style={{ fontSize: 20 }}>{t.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: selectedTier === t.id ? t.color : TXT }}>{t.label}</div>
                          <div style={{ fontSize: 9, color: DIM }}>{t.desc}</div>
                        </div>
                        {selectedTier === t.id && <span style={{ color: t.color }}>✓</span>}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                        {tierModels.map(m => (
                          <span key={m.id} style={{
                            padding: "3px 8px", borderRadius: 3, fontSize: 8,
                            background: `${t.color}10`, border: `1px solid ${t.color}20`, color: t.color,
                          }}>{m.name}</span>
                        ))}
                        {tierModels.length === 0 && (
                          <span style={{ fontSize: 8, color: DIMR }}>No models in this tier</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ ...S.panel, marginTop: 16 }}>
                <div style={{ fontSize: 8, letterSpacing: 2, color: G, marginBottom: 8 }}>CONSTITUTIONAL CONSTRAINT</div>
                <div style={{ fontSize: 10, color: MUT, lineHeight: 1.7 }}>
                  All inference requests pass through the İhsān gate (≥ 0.95 threshold). Cloud fallback activates only when local tiers are unavailable or degraded below quality floor. Your data sovereignty is constitutionally guaranteed — cloud requests are encrypted end-to-end and never persisted on remote servers.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
