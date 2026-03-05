"use client"

import { useState, useEffect } from "react"

// ─── Design Tokens (CSS variable-aligned) ──────────────────────────
const C = {
  bg: "var(--color-dash-bg)",
  surface: "var(--color-dash-surface)",
  card: "var(--color-dash-card)",
  border: "var(--color-dash-border)",
  gold: "var(--color-radiant-gold)",
  text: "var(--color-dash-text)",
  dim: "var(--color-dash-dim)",
  green: "var(--color-dash-green)",
  amber: "var(--color-dash-amber)",
  red: "var(--color-dash-red)",
  blue: "var(--color-dash-blue)",
  purple: "var(--color-dash-purple)",
  cyan: "var(--color-dash-cyan)",
} as const

// ─── Data Models ────────────────────────────────────────────────────

interface Agent {
  id: string
  label: string
  icon: string
  color: string
  desc: string
}

interface Tier {
  label: string
  agents: string[]
  color: string
  desc: string
}

interface Emotion {
  id: string
  label: string
  emoji: string
  tone: string
  boost?: string[]
  reduce?: boolean
}

interface TrustLevel {
  id: string
  label: string
  days: string
  autonomy: number
  icon: string
}

const agents: Agent[] = [
  { id: "planner", label: "Planner", icon: "\u{1f5fa}\ufe0f", color: C.blue, desc: "Strategy & sequencing" },
  { id: "critic", label: "Critic", icon: "\u{1f50d}", color: C.amber, desc: "Risk & edge cases" },
  { id: "ethicist", label: "Ethicist", icon: "\u2696\ufe0f", color: C.purple, desc: "Moral evaluation" },
  { id: "executor", label: "Executor", icon: "\u26a1", color: C.green, desc: "Implementation" },
  { id: "verifier", label: "Verifier", icon: "\u2713", color: C.cyan, desc: "Success criteria" },
  { id: "security", label: "Security", icon: "\u{1f6e1}\ufe0f", color: C.red, desc: "Sovereignty & TeleScript" },
  { id: "optimizer", label: "Optimizer", icon: "\u{1f4ca}", color: C.gold, desc: "Efficiency & cost" },
]

const tiers: Record<string, Tier> = {
  s1: { label: "S1 \u00b7 Reflex", agents: [], color: C.green, desc: "Maestro responds directly. No agents." },
  s15: { label: "S1.5 \u00b7 Moderate", agents: ["executor"], color: C.cyan, desc: "One specialist." },
  s2: { label: "S2 \u00b7 Deliberative", agents: ["planner", "executor", "verifier"], color: C.blue, desc: "Core triangle." },
  s2p: { label: "S2+ \u00b7 Complex", agents: agents.map((a) => a.id), color: C.purple, desc: "Full ensemble." },
}

const emotions: Emotion[] = [
  { id: "neutral", label: "Neutral", emoji: "\u{1f610}", tone: "warm_professional" },
  { id: "frustrated", label: "Frustrated", emoji: "\u{1f624}", tone: "patient_empathetic", boost: ["critic"] },
  { id: "urgent", label: "Urgent", emoji: "\u23f0", tone: "direct_action_oriented", boost: ["optimizer"] },
  { id: "curious", label: "Curious", emoji: "\u{1f914}", tone: "enthusiastic_detailed", boost: ["planner"] },
  { id: "overwhelmed", label: "Overwhelmed", emoji: "\u{1f635}", tone: "calm_simplified", reduce: true },
  { id: "confident", label: "Confident", emoji: "\u{1f4aa}", tone: "collaborative_peer" },
  { id: "playful", label: "Playful", emoji: "\u{1f604}", tone: "light_creative" },
]

const trustLevels: TrustLevel[] = [
  { id: "stranger", label: "Stranger", days: "0-1", autonomy: 0.1, icon: "\u{1f464}" },
  { id: "acquaintance", label: "Acquaintance", days: "1-7", autonomy: 0.3, icon: "\u{1f91d}" },
  { id: "colleague", label: "Colleague", days: "7-30", autonomy: 0.5, icon: "\u{1f465}" },
  { id: "partner", label: "Partner", days: "30-90", autonomy: 0.7, icon: "\u{1f932}" },
  { id: "extension", label: "Extension", days: "90+", autonomy: 0.9, icon: "\u{1f9ec}" },
]

// ─── Sub-components ─────────────────────────────────────────────────

function FlowNode({ label, icon, active, color, sub }: {
  label: string; icon: string; active: boolean; color: string; sub: string
}) {
  return (
    <div style={{
      textAlign: "center", padding: "10px 14px",
      border: `1px solid ${active ? color : C.border}`,
      borderRadius: 10,
      background: active ? `color-mix(in srgb, ${color} 8%, transparent)` : "transparent",
      transition: "all 0.4s",
      boxShadow: active ? `0 0 15px color-mix(in srgb, ${color} 15%, transparent)` : "none",
      minWidth: 70,
    }}>
      <div style={{ fontSize: 18 }}>{icon}</div>
      <div style={{ fontSize: 11, color: active ? color : C.dim, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 9, color: C.dim }}>{sub}</div>
    </div>
  )
}

function Arrow({ active }: { active: boolean }) {
  return (
    <div style={{
      color: active ? C.gold : C.border,
      fontSize: 16, transition: "color 0.4s",
      padding: "0 2px",
    }}>
      \u2192
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────

export function MaestroViz() {
  const [selectedTier, setSelectedTier] = useState("s2")
  const [selectedEmotion, setSelectedEmotion] = useState("neutral")
  const [trustIdx, setTrustIdx] = useState(0)
  const [animPhase, setAnimPhase] = useState(0)
  const [showFlow, setShowFlow] = useState(false)

  const tier = tiers[selectedTier]
  const emotion = emotions.find((e) => e.id === selectedEmotion)!
  const trust = trustLevels[trustIdx]

  let activeAgents = new Set(tier.agents)
  if (emotion.boost) emotion.boost.forEach((a) => activeAgents.add(a))
  if (emotion.reduce) activeAgents = new Set([...activeAgents].filter((a) => a === "executor"))
  if (selectedTier === "s1") activeAgents = new Set<string>()

  useEffect(() => {
    if (!showFlow) return
    const interval = setInterval(() => {
      setAnimPhase((p) => (p + 1) % 7)
    }, 1200)
    return () => clearInterval(interval)
  }, [showFlow])

  const phaseLabels = [
    "User speaks",
    "Emotion detected",
    "Agents selected",
    "Agents deliberate",
    "Maestro synthesizes",
    "Tone adapted",
    "Response delivered",
  ]

  return (
    <div style={{
      background: C.bg, color: C.text,
      fontFamily: "var(--font-mono)",
      minHeight: "100vh", padding: "24px", boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 11, color: C.gold, letterSpacing: 6, marginBottom: 8 }}>
          B I Z R A
        </div>
        <h1 style={{
          fontSize: 28, fontWeight: 300, margin: 0, color: C.text,
          fontFamily: "var(--font-serif)",
        }}>
          The Maestro Layer
        </h1>
        <p style={{ color: C.dim, fontSize: 13, marginTop: 8, fontStyle: "italic" }}>
          One voice. One personality. One relationship. Seven agents behind the curtain.
        </p>
      </div>

      {/* Main Architecture */}
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Architecture Flow */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
          padding: 24, marginBottom: 24,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: C.gold, letterSpacing: 3 }}>ARCHITECTURE</div>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <button
              onClick={() => setShowFlow(!showFlow)}
              style={{
                background: showFlow ? C.gold : "transparent",
                color: showFlow ? C.bg : C.gold,
                border: `1px solid ${C.gold}`,
                borderRadius: 6, padding: "4px 12px", fontSize: 11,
                cursor: "pointer", letterSpacing: 1,
              }}
            >
              {showFlow ? "\u23f8 PAUSE" : "\u25b6 ANIMATE"}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            <FlowNode label="User" icon="\u{1f464}" active={showFlow && animPhase === 0} color={C.text} sub="speaks" />
            <Arrow active={showFlow && animPhase >= 1} />

            {/* Maestro */}
            <div style={{
              background: animPhase >= 1 && animPhase <= 5 && showFlow
                ? `color-mix(in srgb, ${C.gold} 8%, transparent)` : `color-mix(in srgb, ${C.gold} 3%, transparent)`,
              border: `2px solid ${C.gold}`,
              borderRadius: 12, padding: "16px 20px", textAlign: "center",
              transition: "all 0.4s",
              boxShadow: showFlow && animPhase >= 1 && animPhase <= 5
                ? `0 0 20px color-mix(in srgb, ${C.gold} 18%, transparent)` : "none",
              minWidth: 160,
            }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{"\u{1f3ad}"}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.gold }}>MAESTRO</div>
              <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>
                {showFlow ? phaseLabels[animPhase] : "Communication Persona"}
              </div>
              <div style={{ fontSize: 9, color: emotion.tone === "warm_professional" ? C.dim : C.amber, marginTop: 6, fontStyle: "italic" }}>
                tone: {emotion.tone}
              </div>
            </div>
            <Arrow active={showFlow && animPhase >= 3} />

            {/* Agent Ensemble */}
            <div style={{
              border: `1px solid ${C.border}`, borderRadius: 12,
              padding: 12, minWidth: 260,
              opacity: selectedTier === "s1" ? 0.3 : 1,
              transition: "opacity 0.3s",
            }}>
              <div style={{ fontSize: 10, color: C.dim, marginBottom: 8, textAlign: "center" }}>
                PAT ENSEMBLE ({activeAgents.size} active)
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                {agents.map((a) => {
                  const isActive = activeAgents.has(a.id)
                  const isAnimating = showFlow && animPhase === 3 && isActive
                  return (
                    <div key={a.id} style={{
                      background: isActive ? `color-mix(in srgb, ${a.color} 12%, transparent)` : `color-mix(in srgb, ${C.border} 25%, transparent)`,
                      border: `1px solid ${isActive ? a.color : C.border}`,
                      borderRadius: 8, padding: "6px 10px",
                      fontSize: 10, color: isActive ? a.color : C.dim,
                      transition: "all 0.3s",
                      transform: isAnimating ? "scale(1.1)" : "scale(1)",
                      boxShadow: isAnimating ? `0 0 12px color-mix(in srgb, ${a.color} 25%, transparent)` : "none",
                    }}>
                      <span style={{ marginRight: 4 }}>{a.icon}</span>
                      {a.label}
                    </div>
                  )
                })}
              </div>
              {selectedTier === "s1" && (
                <div style={{ textAlign: "center", fontSize: 10, color: C.green, marginTop: 8, fontStyle: "italic" }}>
                  Maestro responds directly — agents sleeping
                </div>
              )}
            </div>
            <Arrow active={showFlow && animPhase >= 4} />

            <FlowNode label="FATE" icon="\u26e9\ufe0f" active={showFlow && animPhase >= 5} color={C.green} sub="gate" />
            <Arrow active={showFlow && animPhase >= 6} />
            <FlowNode label="Response" icon="\u{1f4ac}" active={showFlow && animPhase === 6} color={C.gold} sub="single voice" />
          </div>
        </div>

        {/* Controls Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>

          {/* Complexity Tier */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, color: C.gold, letterSpacing: 3, marginBottom: 16 }}>COMPLEXITY TIER</div>
            {Object.entries(tiers).map(([key, t]) => (
              <button
                key={key}
                onClick={() => setSelectedTier(key)}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  background: selectedTier === key ? `color-mix(in srgb, ${t.color} 8%, transparent)` : "transparent",
                  border: `1px solid ${selectedTier === key ? t.color : "transparent"}`,
                  borderRadius: 8, padding: "10px 14px", marginBottom: 6,
                  color: selectedTier === key ? t.color : C.dim,
                  cursor: "pointer", fontSize: 12, transition: "all 0.2s",
                }}
              >
                <div style={{ fontWeight: 600 }}>{t.label}</div>
                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>
                  {t.desc} \u2192 {t.agents.length} agent{t.agents.length !== 1 ? "s" : ""}
                </div>
              </button>
            ))}
          </div>

          {/* Emotion State */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, color: C.gold, letterSpacing: 3, marginBottom: 16 }}>USER EMOTION \u2192 TONE</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {emotions.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedEmotion(e.id)}
                  style={{
                    background: selectedEmotion === e.id ? `color-mix(in srgb, ${C.gold} 12%, transparent)` : `color-mix(in srgb, ${C.border} 25%, transparent)`,
                    border: `1px solid ${selectedEmotion === e.id ? C.gold : C.border}`,
                    borderRadius: 8, padding: "8px 12px",
                    color: selectedEmotion === e.id ? C.gold : C.dim,
                    cursor: "pointer", fontSize: 11, transition: "all 0.2s",
                  }}
                >
                  <span style={{ marginRight: 4 }}>{e.emoji}</span>
                  {e.label}
                </button>
              ))}
            </div>
            <div style={{
              marginTop: 16, padding: 12,
              background: `color-mix(in srgb, ${C.gold} 4%, transparent)`,
              borderRadius: 8, border: `1px solid color-mix(in srgb, ${C.gold} 18%, transparent)`,
            }}>
              <div style={{ fontSize: 10, color: C.dim }}>Selected tone:</div>
              <div style={{ fontSize: 13, color: C.gold, marginTop: 4 }}>
                {emotion.tone.replace(/_/g, " ")}
              </div>
              {emotion.boost && (
                <div style={{ fontSize: 10, color: C.amber, marginTop: 6 }}>
                  +agents: {emotion.boost.join(", ")}
                </div>
              )}
              {emotion.reduce && (
                <div style={{ fontSize: 10, color: C.red, marginTop: 6 }}>
                  Reduces to executor only (simplification)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Trust Evolution */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: C.gold, letterSpacing: 3, marginBottom: 16 }}>TRUST EVOLUTION</div>
          <div style={{ display: "flex", gap: 4, alignItems: "stretch" }}>
            {trustLevels.map((t, i) => (
              <button
                key={t.id}
                onClick={() => setTrustIdx(i)}
                style={{
                  flex: 1, textAlign: "center",
                  background: i === trustIdx
                    ? `color-mix(in srgb, ${C.gold} 8%, transparent)`
                    : i <= trustIdx ? `color-mix(in srgb, ${C.green} 4%, transparent)` : "transparent",
                  border: `1px solid ${i === trustIdx ? C.gold : i <= trustIdx ? `color-mix(in srgb, ${C.green} 25%, transparent)` : C.border}`,
                  borderRadius: 8, padding: "12px 8px",
                  color: i === trustIdx ? C.gold : i <= trustIdx ? C.green : C.dim,
                  cursor: "pointer", fontSize: 11, transition: "all 0.2s",
                }}
              >
                <div style={{ fontSize: 20 }}>{t.icon}</div>
                <div style={{ fontWeight: 600, marginTop: 4 }}>{t.label}</div>
                <div style={{ fontSize: 9, opacity: 0.6 }}>Day {t.days}</div>
              </button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
            <div style={{ padding: 12, background: `color-mix(in srgb, ${C.gold} 4%, transparent)`, borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: C.dim }}>Autonomy Budget</div>
              <div style={{ fontSize: 22, color: C.gold, fontWeight: 300 }}>
                {(trust.autonomy * 100).toFixed(0)}%
              </div>
              <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>
                {trust.autonomy < 0.3 ? "Ask before everything" :
                 trust.autonomy < 0.6 ? "Handle routine silently" :
                 "Only ask for novel/risky"}
              </div>
            </div>
            <div style={{ padding: 12, background: `color-mix(in srgb, ${C.gold} 4%, transparent)`, borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: C.dim }}>Proactive Threshold</div>
              <div style={{ fontSize: 22, color: C.gold, fontWeight: 300 }}>
                {((1 - trust.autonomy) * 100 + 5).toFixed(0)}%
              </div>
              <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>
                {trust.autonomy < 0.3 ? "Only surface high-confidence" :
                 trust.autonomy < 0.6 ? "Share moderate hunches" :
                 "Surface even early intuitions"}
              </div>
            </div>
          </div>
        </div>

        {/* The JARVIS Principle */}
        <div style={{
          background: `color-mix(in srgb, ${C.gold} 4%, transparent)`,
          border: `1px solid color-mix(in srgb, ${C.gold} 18%, transparent)`,
          borderRadius: 12, padding: 24, textAlign: "center",
        }}>
          <div style={{ fontSize: 11, color: C.gold, letterSpacing: 3, marginBottom: 12 }}>THE JARVIS PRINCIPLE</div>
          <div style={{
            fontSize: 15, color: C.text, lineHeight: 1.8,
            fontFamily: "var(--font-serif)", maxWidth: 600, margin: "0 auto",
          }}>
            The user talks to <span style={{ color: C.gold }}>one person</span>.
            Behind that person, <span style={{ color: C.blue }}>seven specialists</span> deliberate.
            The Maestro reads <span style={{ color: C.amber }}>emotion</span>,
            selects <span style={{ color: C.cyan }}>agents</span>,
            synthesizes into <span style={{ color: C.gold }}>one voice</span>,
            and evolves <span style={{ color: C.green }}>trust</span> over time.
          </div>
        </div>
      </div>
    </div>
  )
}
