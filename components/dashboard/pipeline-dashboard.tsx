"use client"

import { useState, useEffect, useRef } from "react"

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
  red: "var(--color-dash-red)",
  blue: "var(--color-dash-blue)",
  purple: "var(--color-dash-purple)",
  cyan: "var(--color-dash-cyan)",
  amber: "var(--color-dash-amber)",
} as const

// ─── Data Models ────────────────────────────────────────────────────

interface AgentDef {
  icon: string
  color: string
}

interface Scenario {
  id: string
  label: string
  emoji: string
  message: string
  emotion: string
  tier: string
  agents: string[]
  ihsan: number
  temp: number
  response: string
  tone: string
}

interface PipelineStep {
  id: string
  label: string
  icon: string
  desc: string
}

interface IhsanDimension {
  name: string
  val: number
  tag: string
}

const AGENTS: Record<string, AgentDef> = {
  planner: { icon: "\u{1f5fa}\ufe0f", color: C.blue },
  critic: { icon: "\u{1f50d}", color: C.amber },
  ethicist: { icon: "\u2696\ufe0f", color: C.purple },
  executor: { icon: "\u26a1", color: C.green },
  verifier: { icon: "\u2713", color: C.cyan },
  security: { icon: "\u{1f6e1}\ufe0f", color: C.red },
  optimizer: { icon: "\u{1f4ca}", color: C.gold },
}

const SCENARIOS: Scenario[] = [
  {
    id: "greeting", label: "Greeting", emoji: "\u{1f44b}",
    message: "Hello!",
    emotion: "neutral", tier: "s1_simple", agents: [],
    ihsan: 0.9962, temp: 10.0, response: "Good afternoon. How can I help you?",
    tone: "warm_professional",
  },
  {
    id: "file", label: "File Task", emoji: "\u{1f4c1}",
    message: "Organize my research papers by topic into folders",
    emotion: "neutral", tier: "s2_deliberative", agents: ["planner", "executor", "verifier"],
    ihsan: 0.9751, temp: 5.0,
    response: "1) Scan target directory, 2) Classify by pattern, 3) Create structure, 4) Move files, 5) Verify\n\nI considered this from multiple angles. What if files are currently open? What if names contain special characters?",
    tone: "warm_professional",
  },
  {
    id: "complex", label: "Complex API", emoji: "\u{1f3d7}\ufe0f",
    message: "Design a distributed cache API with sharding, replication, and async concurrency",
    emotion: "neutral", tier: "s2p_complex",
    agents: ["planner", "critic", "ethicist", "executor", "verifier", "security", "optimizer"],
    ihsan: 0.9784, temp: 3.33,
    response: "Break the task into sequential steps with clear dependencies.\n\nI want to be transparent \u2014 I weighed several factors:\n  \u2022 What about error handling? Thread safety? Backward compatibility?\n  \u2022 Code changes are version-controlled. No external data exfiltration.",
    tone: "enthusiastic_detailed",
  },
  {
    id: "frustrated", label: "Frustrated", emoji: "\u{1f624}",
    message: "This is broken again, the error keeps coming back!",
    emotion: "frustrated", tier: "s1_simple", agents: ["critic"],
    ihsan: 0.9813, temp: 2.5,
    response: "That error shouldn\u2019t be happening. Let me look into it.\n\nProceed with caution.",
    tone: "patient_empathetic",
  },
  {
    id: "overwhelmed", label: "Overwhelmed", emoji: "\u{1f635}",
    message: "I\u2019m so confused and lost, this is too much",
    emotion: "overwhelmed", tier: "s1_simple", agents: ["executor"],
    ihsan: 0.9720, temp: 2.0,
    response: "Let me simplify this.\n\nUse PowerShell Get-ChildItem + Move-Item pipeline.",
    tone: "calm_simplified",
  },
  {
    id: "urgent", label: "Urgent", emoji: "\u23f0",
    message: "Deploy the fix ASAP, deadline is NOW",
    emotion: "urgent", tier: "s2_deliberative",
    agents: ["planner", "executor", "verifier", "optimizer"],
    ihsan: 0.9756, temp: 1.67,
    response: "1) Analyze requirements, 2) Design interface, 3) Implement core, 4) Add tests, 5) Review\n\nEstimated cost: minimal. Expected latency within budget.",
    tone: "direct_action_oriented",
  },
]

const PIPELINE_STEPS: PipelineStep[] = [
  { id: "ingress", label: "Ingress", icon: "\u{1f4e8}", desc: "User message received" },
  { id: "emotion", label: "Emotion", icon: "\u{1f4ad}", desc: "Detect emotional state" },
  { id: "routing", label: "Routing", icon: "\u{1f9ed}", desc: "Complexity tier + entropy" },
  { id: "gating", label: "Agent Gate", icon: "\u{1f3ad}", desc: "Maestro selects agents" },
  { id: "agents", label: "Deliberate", icon: "\u{1f91d}", desc: "Agents process in parallel" },
  { id: "synthesis", label: "Synthesize", icon: "\u{1f52e}", desc: "Merge into single voice" },
  { id: "gate", label: "FATE Gate", icon: "\u26e9\ufe0f", desc: "Constitutional check" },
  { id: "receipt", label: "Seal", icon: "\u{1f4dc}", desc: "BLAKE2b receipt chain" },
  { id: "response", label: "Respond", icon: "\u{1f4ac}", desc: "Deliver to user" },
]

const IHSAN_DIMS: IhsanDimension[] = [
  { name: "Moral Clarity", val: 0.97, tag: "E1" },
  { name: "Epistemic Humility", val: 0.96, tag: "E2" },
  { name: "Structural Integrity", val: 0.98, tag: "E3\u00b7SAP" },
  { name: "Verifiability", val: 0.99, tag: "E4\u00b7SAP" },
  { name: "Contextual Relevance", val: 0.95, tag: "E5" },
  { name: "Intent Alignment", val: 0.97, tag: "E6" },
  { name: "Resilience", val: 0.98, tag: "E7\u00b7SAP" },
  { name: "Efficiency", val: 0.99, tag: "E8" },
]

// ─── Sub-components ─────────────────────────────────────────────────

function Card({ title, active, children }: { title: string; active: boolean; children: React.ReactNode }) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${active ? `color-mix(in srgb, ${C.gold} 30%, transparent)` : C.border}`,
      borderRadius: 10, padding: 16,
      transition: "all 0.3s",
      boxShadow: active ? `0 0 12px color-mix(in srgb, ${C.gold} 8%, transparent)` : "none",
    }}>
      <div style={{ fontSize: 9, color: active ? C.gold : C.dim, letterSpacing: 3, marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function ReceiptField({ label, value, color, mono }: {
  label: string; value: string; color?: string; mono?: boolean
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      padding: "3px 0", borderBottom: `1px solid color-mix(in srgb, ${C.border} 18%, transparent)`,
    }}>
      <span style={{ fontSize: 10, color: C.dim }}>{label}</span>
      <span style={{
        fontSize: 10, color: color || C.text,
        fontFamily: mono ? "var(--font-mono)" : "inherit",
      }}>
        {value}
      </span>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────

export function PipelineDashboard() {
  const [scenario, setScenario] = useState(SCENARIOS[0])
  const [animStep, setAnimStep] = useState(-1)
  const [isAnimating, setIsAnimating] = useState(false)
  const [completedSteps, setCompletedSteps] = useState(new Set<number>())
  const [showReceipt, setShowReceipt] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const runAnimation = () => {
    setAnimStep(-1)
    setCompletedSteps(new Set())
    setIsAnimating(true)
    setShowReceipt(false)
    let step = 0
    timerRef.current = setInterval(() => {
      if (step >= PIPELINE_STEPS.length) {
        if (timerRef.current) clearInterval(timerRef.current)
        setIsAnimating(false)
        setShowReceipt(true)
        return
      }
      setAnimStep(step)
      setCompletedSteps((prev) => new Set([...prev, step]))
      step++
    }, 600)
  }

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const selectScenario = (s: Scenario) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setScenario(s)
    setAnimStep(-1)
    setCompletedSteps(new Set())
    setIsAnimating(false)
    setShowReceipt(false)
  }

  const emotionEmoji: Record<string, string> = {
    neutral: "\u{1f610}", frustrated: "\u{1f624}", overwhelmed: "\u{1f635}",
    urgent: "\u23f0", curious: "\u{1f914}", confident: "\u{1f4aa}", playful: "\u{1f604}",
  }

  return (
    <div style={{
      background: C.bg, color: C.text, minHeight: "100vh", padding: 20,
      fontFamily: "var(--font-mono)",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: C.gold, letterSpacing: 8, marginBottom: 6 }}>
          B I Z R A &nbsp; N O D E 0
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 300, margin: 0, fontFamily: "var(--font-serif)" }}>
          Pipeline Lifecycle Dashboard
        </h1>
        <p style={{ fontSize: 11, color: C.dim, marginTop: 6, fontStyle: "italic" }}>
          User message \u2192 Emotion \u2192 Agents \u2192 Gate \u2192 Receipt \u2192 Response
        </p>
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        {/* Scenario Selector */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginBottom: 20 }}>
          {SCENARIOS.map((s) => (
            <button key={s.id} onClick={() => selectScenario(s)} style={{
              background: scenario.id === s.id ? `color-mix(in srgb, ${C.gold} 12%, transparent)` : C.surface,
              border: `1px solid ${scenario.id === s.id ? C.gold : C.border}`,
              borderRadius: 8, padding: "8px 14px", cursor: "pointer",
              color: scenario.id === s.id ? C.gold : C.dim, fontSize: 11,
              transition: "all 0.2s",
            }}>
              <span style={{ marginRight: 4 }}>{s.emoji}</span>
              {s.label}
            </button>
          ))}
          <button onClick={runAnimation} disabled={isAnimating} style={{
            background: isAnimating ? C.card : C.gold,
            border: `1px solid ${C.gold}`,
            borderRadius: 8, padding: "8px 18px", cursor: isAnimating ? "default" : "pointer",
            color: isAnimating ? C.dim : C.bg, fontSize: 11, fontWeight: 700,
            letterSpacing: 1, transition: "all 0.2s",
          }}>
            {isAnimating ? "\u23f3 RUNNING..." : "\u25b6 RUN PIPELINE"}
          </button>
        </div>

        {/* User Message */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: 16, marginBottom: 16,
        }}>
          <div style={{ fontSize: 9, color: C.dim, letterSpacing: 3, marginBottom: 8 }}>USER MESSAGE</div>
          <div style={{ fontSize: 15, color: C.text, fontFamily: "var(--font-serif)" }}>
            &ldquo;{scenario.message}&rdquo;
          </div>
        </div>

        {/* Pipeline Steps */}
        <div style={{
          display: "flex", gap: 4, alignItems: "center", justifyContent: "center",
          marginBottom: 20, flexWrap: "wrap",
        }}>
          {PIPELINE_STEPS.map((step, i) => {
            const isActive = animStep === i
            const isDone = completedSteps.has(i)
            const isSkipped = scenario.agents.length === 0 && (i === 4 || i === 5)
            return (
              <div key={step.id} style={{ display: "flex", alignItems: "center" }}>
                <div style={{
                  textAlign: "center", padding: "8px 10px", borderRadius: 8, minWidth: 72,
                  background: isActive ? `color-mix(in srgb, ${C.gold} 12%, transparent)` : isDone ? `color-mix(in srgb, ${C.green} 6%, transparent)` : C.surface,
                  border: `1px solid ${isActive ? C.gold : isDone ? `color-mix(in srgb, ${C.green} 30%, transparent)` : C.border}`,
                  opacity: isSkipped ? 0.3 : 1,
                  transition: "all 0.3s",
                  boxShadow: isActive ? `0 0 16px color-mix(in srgb, ${C.gold} 15%, transparent)` : "none",
                  transform: isActive ? "scale(1.08)" : "scale(1)",
                }}>
                  <div style={{ fontSize: 16 }}>{isDone && !isActive ? "\u2705" : step.icon}</div>
                  <div style={{
                    fontSize: 9, marginTop: 2,
                    color: isActive ? C.gold : isDone ? C.green : C.dim,
                    fontWeight: isActive ? 700 : 400,
                  }}>
                    {step.label}
                  </div>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div style={{ color: isDone ? C.green : C.border, fontSize: 12, padding: "0 2px", transition: "color 0.3s" }}>\u2192</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Main Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          <Card title="EMOTION" active={animStep === 1 || completedSteps.has(1)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 28 }}>{emotionEmoji[scenario.emotion] || "\u{1f610}"}</div>
                <div style={{ fontSize: 13, color: C.gold, marginTop: 4, textTransform: "capitalize" }}>{scenario.emotion}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9, color: C.dim }}>Tone</div>
                <div style={{ fontSize: 11, color: C.cyan }}>{scenario.tone.replace(/_/g, " ")}</div>
              </div>
            </div>
          </Card>

          <Card title="ROUTING" active={animStep === 2 || completedSteps.has(2)}>
            <div style={{ fontSize: 14, color: C.blue, fontWeight: 600 }}>{scenario.tier.replace(/_/g, " ").toUpperCase()}</div>
            <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>
              Quorum: {scenario.agents.length} agent{scenario.agents.length !== 1 ? "s" : ""}
            </div>
            <div style={{ marginTop: 8, height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 2,
                background: scenario.tier === "s1_simple" ? C.green : scenario.tier === "s15_moderate" ? C.cyan : scenario.tier === "s2_deliberative" ? C.blue : C.purple,
                width: scenario.tier === "s1_simple" ? "15%" : scenario.tier === "s15_moderate" ? "40%" : scenario.tier === "s2_deliberative" ? "70%" : "100%",
                transition: "width 0.5s",
              }} />
            </div>
          </Card>

          <Card title="FATE GATE" active={animStep === 6 || completedSteps.has(6)}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 9, color: C.dim }}>Ihs\u0101n</div>
                <div style={{ fontSize: 22, fontWeight: 300, color: scenario.ihsan > 0.95 ? C.green : C.red }}>{scenario.ihsan.toFixed(4)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9, color: C.dim }}>Temperature</div>
                <div style={{ fontSize: 22, fontWeight: 300, color: C.amber }}>{scenario.temp.toFixed(2)}</div>
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: C.green, fontWeight: 600 }}>\u2713 APPROVED</div>
          </Card>
        </div>

        {/* Agent Ensemble */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: 16, marginBottom: 16,
          opacity: (animStep >= 3 || completedSteps.has(3)) ? 1 : 0.4,
          transition: "opacity 0.4s",
        }}>
          <div style={{ fontSize: 9, color: C.gold, letterSpacing: 3, marginBottom: 12 }}>
            AGENT ENSEMBLE \u2014 {scenario.agents.length === 0 ? "MAESTRO DIRECT (no agents)" : `${scenario.agents.length} ACTIVE`}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {Object.entries(AGENTS).map(([id, a]) => {
              const isActive = scenario.agents.includes(id)
              const isAnimating2 = animStep === 4 && isActive
              return (
                <div key={id} style={{
                  padding: "10px 16px", borderRadius: 8, textAlign: "center", minWidth: 80,
                  background: isActive ? `color-mix(in srgb, ${a.color} 8%, transparent)` : `color-mix(in srgb, ${C.border} 18%, transparent)`,
                  border: `1px solid ${isActive ? `color-mix(in srgb, ${a.color} 50%, transparent)` : C.border}`,
                  opacity: isActive ? 1 : 0.25,
                  transition: "all 0.3s",
                  transform: isAnimating2 ? "scale(1.1)" : "scale(1)",
                  boxShadow: isAnimating2 ? `0 0 14px color-mix(in srgb, ${a.color} 18%, transparent)` : "none",
                }}>
                  <div style={{ fontSize: 20 }}>{a.icon}</div>
                  <div style={{ fontSize: 10, color: isActive ? a.color : C.dim, marginTop: 4, fontWeight: isActive ? 600 : 400, textTransform: "capitalize" }}>
                    {id}
                  </div>
                </div>
              )
            })}
          </div>
          {scenario.agents.length === 0 && (
            <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: C.green, fontStyle: "italic" }}>
              System-1: Maestro responds directly \u2014 agents sleeping
            </div>
          )}
        </div>

        {/* Response + Receipt */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16,
            opacity: showReceipt || completedSteps.has(8) ? 1 : 0.4,
            transition: "opacity 0.4s",
          }}>
            <div style={{ fontSize: 9, color: C.gold, letterSpacing: 3, marginBottom: 10 }}>RESPONSE (Single Voice)</div>
            <div style={{ fontSize: 12, color: C.text, lineHeight: 1.7, fontFamily: "var(--font-serif)", whiteSpace: "pre-wrap" }}>
              {scenario.response}
            </div>
            <div style={{
              marginTop: 12, padding: "6px 10px",
              background: `color-mix(in srgb, ${C.gold} 6%, transparent)`, borderRadius: 6,
              fontSize: 10, color: C.dim,
            }}>
              tone: <span style={{ color: C.cyan }}>{scenario.tone.replace(/_/g, " ")}</span>
              {" \u00b7 "}agents: <span style={{ color: C.gold }}>{scenario.agents.length}</span>
              {" \u00b7 "}tier: <span style={{ color: C.blue }}>{scenario.tier}</span>
            </div>
          </div>

          <div style={{
            background: C.card,
            border: `1px solid ${showReceipt ? `color-mix(in srgb, ${C.green} 37%, transparent)` : C.border}`,
            borderRadius: 10, padding: 16,
            opacity: showReceipt || completedSteps.has(7) ? 1 : 0.4,
            transition: "all 0.4s",
          }}>
            <div style={{ fontSize: 9, color: C.gold, letterSpacing: 3, marginBottom: 10 }}>SEALED RECEIPT</div>
            <ReceiptField label="Correlation" value="req_000001_83742" />
            <ReceiptField label="Ihs\u0101n" value={scenario.ihsan.toFixed(4)} color={C.green} />
            <ReceiptField label="Temperature" value={scenario.temp.toFixed(4)} color={C.amber} />
            <ReceiptField label="Verdict" value="APPROVED" color={C.green} />
            <ReceiptField label="Emotion" value={scenario.emotion} />
            <ReceiptField label="Agents" value={scenario.agents.length === 0 ? "direct" : scenario.agents.join(", ")} />
            <ReceiptField label="Proof Hash" value="6fbadf466b1423fe..." mono />
            <ReceiptField label="Receipt Hash" value="a3c9e7f12b84d056..." mono />
            <div style={{
              marginTop: 10, padding: "6px 10px",
              background: `color-mix(in srgb, ${C.green} 6%, transparent)`, borderRadius: 6,
              fontSize: 10, color: C.green, textAlign: "center",
            }}>
              {"\uD83D\uDD17 BLAKE2b-256 \u00B7 Chained to previous receipt"}
            </div>
          </div>
        </div>

        {/* 8 Ihsan Dimensions */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginTop: 12 }}>
          <div style={{ fontSize: 9, color: C.gold, letterSpacing: 3, marginBottom: 12 }}>8 IHS\u0100N DIMENSIONS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {IHSAN_DIMS.map((d) => (
              <div key={d.tag} style={{
                padding: "8px 10px", borderRadius: 6,
                background: `color-mix(in srgb, ${C.green} 4%, transparent)`,
                border: `1px solid ${C.border}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 9, color: C.dim }}>{d.tag}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: d.val >= 0.95 ? C.green : C.amber }}>
                    {d.val.toFixed(2)}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: C.text, marginTop: 2 }}>{d.name}</div>
                <div style={{ marginTop: 4, height: 3, background: C.border, borderRadius: 2 }}>
                  <div style={{
                    height: "100%", borderRadius: 2,
                    background: d.val >= 0.95 ? C.green : C.amber,
                    width: `${d.val * 100}%`,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
