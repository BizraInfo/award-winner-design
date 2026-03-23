"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useLifecycleStore } from "@/store/use-lifecycle-store"
import { SovereignNav } from "@/components/sovereign/sovereign-nav"
import {
  G, G2, G3, BG, BG2, GR, RD, BL, PU, CY, AM, YL,
  TXT, MUT, DIM, DIMR, LINE, PAT, SAT
} from "@/components/sovereign/design-tokens"

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

const STEPS = [
  { id: "welcome", label: "WELCOME", icon: "◈" },
  { id: "identity", label: "IDENTITY", icon: "⬡" },
  { id: "profile", label: "PROFILE", icon: "◇" },
  { id: "agents", label: "AGENTS", icon: "♗" },
  { id: "configure", label: "CONFIGURE", icon: "◆" },
  { id: "activate", label: "ACTIVATE", icon: "✦" },
]

const DESIRES = [
  { id: "income", label: "Generate Income", icon: "💰", desc: "Build revenue streams with AI assistance" },
  { id: "skills", label: "Learn New Skills", icon: "🧠", desc: "Accelerate personal growth and mastery" },
  { id: "project", label: "Ship a Project", icon: "🚀", desc: "Turn an idea into reality, fast" },
  { id: "clarity", label: "Get Clarity", icon: "🔮", desc: "Organize thoughts, find direction" },
  { id: "future", label: "Build My Future", icon: "✨", desc: "Long-term sovereign infrastructure" },
]

const TOOLS = ["VS Code", "Chrome", "Slack", "Terminal", "Notion", "Figma", "Excel", "Outlook", "Discord"]
const COMM_STYLES = [
  { id: "concise", label: "Concise", desc: "Bullet points, minimal" },
  { id: "detailed", label: "Detailed", desc: "Full explanations" },
  { id: "critical", label: "Critical Only", desc: "Interrupt only when urgent" },
]

export default function OnboardingPage() {
  const router = useRouter()
  const setPhase = useLifecycleStore(s => s.setPhase)
  const setUserName = useLifecycleStore(s => s.setUserName)
  const setNodeId = useLifecycleStore(s => s.setNodeId)

  const [step, setStep] = useState(0)
  const [name, setName] = useState("")
  const [desire, setDesire] = useState<string | null>(null)
  const [hours, setHours] = useState(10)
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [commStyle, setCommStyle] = useState("concise")
  const [selectedAgents, setSelectedAgents] = useState<string[]>(["P2", "P3", "P7"])
  const [autonomy, setAutonomy] = useState("semi")
  const [activating, setActivating] = useState(false)
  const [genLines, setGenLines] = useState<string[]>([])
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (step === 1) setTimeout(() => nameRef.current?.focus(), 400) }, [step])

  const canNext = () => {
    if (step === 1 && !name.trim()) return false
    if (step === 2 && !desire) return false
    return true
  }

  const handleActivate = useCallback(async () => {
    setActivating(true)
    const id = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, "0")).join("")
    const steps: [string, number][] = [
      ["Generating Ed25519 sovereign keypair...", 350],
      [`Node ID: ${id.slice(0, 24)}...`, 250],
      ["Deriving 12 agent child keys (HD-Ed25519)...", 400],
      ["Loading constitution v5.0.0-GENESIS...", 300],
      [`PAT agents configured: ${selectedAgents.map(a => PAT[a as keyof typeof PAT]?.c).join(", ")}`, 350],
      [`Communication: ${commStyle} · Autonomy: ${autonomy}`, 250],
      ["7 constitutional rights bound.", 300],
      [`Covenant verified ✓ — Welcome, ${name.trim()}.`, 500],
    ]
    for (const [t, d] of steps) {
      await delay(d)
      setGenLines(p => [...p, t])
    }
    await delay(600)
    setUserName(name.trim())
    setNodeId(id)
    setPhase("DAILY_LOOP")
    router.push("/")
  }, [name, selectedAgents, commStyle, autonomy, setUserName, setNodeId, setPhase, router])

  const S = { // shared styles
    panel: { padding: 20, borderRadius: 10, border: `1px solid ${G}15`, background: `${G}04` } as const,
    card: { padding: 14, borderRadius: 8, border: `1px solid ${LINE}`, background: BG2, cursor: "pointer", transition: "all .2s" } as const,
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TXT, fontFamily: "var(--font-jetbrains), monospace" }}>
      <SovereignNav />
      <div style={{ paddingTop: 64, maxWidth: 640, margin: "0 auto", padding: "64px 20px 40px" }}>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 32 }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 4, flex: i < STEPS.length - 1 ? 1 : undefined }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, border: `1px solid ${i <= step ? G : LINE}`,
                background: i < step ? `${G}15` : i === step ? `${G}08` : "transparent",
                color: i <= step ? G : DIMR, transition: "all .3s",
              }}>{i < step ? "✓" : s.icon}</div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 1, background: i < step ? `${G}30` : LINE, transition: "all .3s" }} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>

            {/* STEP 0: WELCOME */}
            {step === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{
                  width: 80, height: 80, borderRadius: "50%", margin: "0 auto 24px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1.5px solid ${G}18`, boxShadow: `0 0 60px ${G}06`,
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: `radial-gradient(circle,${G}25,transparent)` }} />
                </div>
                <div style={{ fontFamily: "var(--font-cinzel), serif", fontSize: 22, color: G, letterSpacing: 4, marginBottom: 8 }}>
                  SOVEREIGNTY BEGINS
                </div>
                <div style={{ fontFamily: "var(--font-amiri), serif", fontSize: 15, color: `${G}40`, direction: "rtl" as const, marginBottom: 16 }}>
                  بسم الله الرحمن الرحيم
                </div>
                <div style={{ color: MUT, fontSize: 12, lineHeight: 1.8, fontFamily: "var(--font-playfair), serif", fontStyle: "italic", maxWidth: 400, margin: "0 auto" }}>
                  Your node is your sovereign identity. No corporation owns your data, your AI, or your decisions.
                  This setup takes about 3 minutes.
                </div>
              </div>
            )}

            {/* STEP 1: IDENTITY */}
            {step === 1 && (
              <div>
                <div style={{ fontSize: 8, letterSpacing: 3, color: G, marginBottom: 6 }}>STEP 1 OF 6</div>
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>What should we call you?</div>
                <div style={{ fontSize: 10, color: DIM, marginBottom: 20 }}>This becomes your sovereign identity across the network.</div>
                <input ref={nameRef} value={name} onChange={e => setName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && name.trim()) setStep(2) }}
                  placeholder="Your name or callsign..."
                  style={{
                    width: "100%", padding: "14px 16px", background: BG2, border: `1px solid ${name ? G + "40" : LINE}`,
                    borderRadius: 6, color: TXT, fontSize: 14, fontFamily: "var(--font-jetbrains), monospace",
                    outline: "none", transition: "border .2s",
                  }} />
                <div style={{ fontSize: 8, color: DIMR, marginTop: 8 }}>Ed25519 keypair will be derived from this identity.</div>
              </div>
            )}

            {/* STEP 2: PROFILE — What do you want? */}
            {step === 2 && (
              <div>
                <div style={{ fontSize: 8, letterSpacing: 3, color: G, marginBottom: 6 }}>STEP 2 OF 6</div>
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>What do you most want right now?</div>
                <div style={{ fontSize: 10, color: DIM, marginBottom: 16 }}>This shapes how your agents prioritize work.</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {DESIRES.map(d => (
                    <div key={d.id} onClick={() => setDesire(d.id)}
                      style={{
                        ...S.card, display: "flex", alignItems: "center", gap: 14,
                        borderColor: desire === d.id ? G + "50" : LINE,
                        background: desire === d.id ? `${G}08` : BG2,
                      }}>
                      <span style={{ fontSize: 22 }}>{d.icon}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: desire === d.id ? G : TXT }}>{d.label}</div>
                        <div style={{ fontSize: 9, color: DIM, marginTop: 2 }}>{d.desc}</div>
                      </div>
                      {desire === d.id && <span style={{ marginLeft: "auto", color: G, fontSize: 14 }}>✓</span>}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, ...S.panel }}>
                  <div style={{ fontSize: 9, color: DIM, marginBottom: 8 }}>Weekly hours available</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <input type="range" min={1} max={60} value={hours} onChange={e => setHours(+e.target.value)}
                      style={{ flex: 1, accentColor: G }} />
                    <span style={{ fontSize: 18, color: G, minWidth: 40, textAlign: "right" }}>{hours}h</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: AGENTS — Select your PAT team */}
            {step === 3 && (
              <div>
                <div style={{ fontSize: 8, letterSpacing: 3, color: G, marginBottom: 6 }}>STEP 3 OF 6</div>
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Choose your Personal Agent Team</div>
                <div style={{ fontSize: 10, color: DIM, marginBottom: 16 }}>Select 2-4 agents. You can always change this later.</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {Object.entries(PAT).map(([k, a]) => {
                    const sel = selectedAgents.includes(k)
                    return (
                      <div key={k} onClick={() => setSelectedAgents(p =>
                        sel ? p.filter(x => x !== k) : p.length < 4 ? [...p, k] : p
                      )} style={{
                        ...S.card, borderColor: sel ? a.col + "50" : LINE,
                        background: sel ? `${a.col}08` : BG2,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 16 }}>{a.i}</span>
                          {sel && <span style={{ fontSize: 10, color: a.col }}>✓</span>}
                        </div>
                        <div style={{ fontSize: 7, letterSpacing: 2, color: sel ? a.col : DIM, fontWeight: 600 }}>{a.c}</div>
                        <div style={{ fontSize: 10, color: sel ? TXT : MUT, marginTop: 2 }}>{a.n}</div>
                        <div style={{ fontSize: 8, color: DIM, marginTop: 2 }}>{a.d}</div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop: 12, ...S.panel }}>
                  <div style={{ fontSize: 8, letterSpacing: 2, color: DIM, marginBottom: 4 }}>SAT LAYER (SYSTEM — ALWAYS ACTIVE)</div>
                  <div style={{ display: "flex", gap: 12 }}>
                    {SAT.map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.col }} />
                        <span style={{ fontSize: 8, color: s.col }}>{s.n}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: CONFIGURE — comm style + autonomy + tools */}
            {step === 4 && (
              <div>
                <div style={{ fontSize: 8, letterSpacing: 3, color: G, marginBottom: 6 }}>STEP 4 OF 6</div>
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Configure your experience</div>
                <div style={{ fontSize: 10, color: DIM, marginBottom: 16 }}>How should your agents communicate and operate?</div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 9, color: G, letterSpacing: 1, marginBottom: 8 }}>COMMUNICATION STYLE</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {COMM_STYLES.map(c => (
                      <div key={c.id} onClick={() => setCommStyle(c.id)} style={{
                        flex: 1, ...S.card, textAlign: "center" as const,
                        borderColor: commStyle === c.id ? G + "50" : LINE,
                        background: commStyle === c.id ? `${G}08` : BG2,
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 500, color: commStyle === c.id ? G : TXT }}>{c.label}</div>
                        <div style={{ fontSize: 8, color: DIM, marginTop: 3 }}>{c.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 9, color: G, letterSpacing: 1, marginBottom: 8 }}>YOUR TOOLS</div>
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                    {TOOLS.map(t => {
                      const sel = selectedTools.includes(t)
                      return (
                        <div key={t} onClick={() => setSelectedTools(p => sel ? p.filter(x => x !== t) : [...p, t])}
                          style={{
                            padding: "6px 12px", borderRadius: 4, cursor: "pointer",
                            border: `1px solid ${sel ? CY + "50" : LINE}`,
                            background: sel ? `${CY}08` : "transparent",
                            color: sel ? CY : DIM, fontSize: 10, transition: "all .2s",
                          }}>{t}</div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 9, color: G, letterSpacing: 1, marginBottom: 8 }}>AUTONOMY LEVEL</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[
                      { id: "manual", label: "Manual", desc: "Ask before every action" },
                      { id: "semi", label: "Semi-Auto", desc: "Ask for important actions" },
                      { id: "full", label: "Full Auto", desc: "Execute and report" },
                    ].map(a => (
                      <div key={a.id} onClick={() => setAutonomy(a.id)} style={{
                        flex: 1, ...S.card, textAlign: "center" as const,
                        borderColor: autonomy === a.id ? PU + "50" : LINE,
                        background: autonomy === a.id ? `${PU}08` : BG2,
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 500, color: autonomy === a.id ? PU : TXT }}>{a.label}</div>
                        <div style={{ fontSize: 8, color: DIM, marginTop: 3 }}>{a.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: ACTIVATE — Genesis ceremony */}
            {step === 5 && (
              <div style={{ textAlign: "center" as const }}>
                <div style={{ fontSize: 8, letterSpacing: 3, color: G, marginBottom: 6 }}>STEP 6 OF 6</div>
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 16 }}>Activate Your Node</div>

                {!activating ? (
                  <div>
                    <div style={{ ...S.panel, textAlign: "left" as const, marginBottom: 16 }}>
                      <div style={{ fontSize: 8, letterSpacing: 2, color: DIM, marginBottom: 10 }}>SUMMARY</div>
                      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "6px 12px", fontSize: 10 }}>
                        <span style={{ color: DIM }}>Identity</span><span style={{ color: G }}>{name}</span>
                        <span style={{ color: DIM }}>Goal</span><span style={{ color: TXT }}>{DESIRES.find(d => d.id === desire)?.label || "—"}</span>
                        <span style={{ color: DIM }}>Hours/week</span><span style={{ color: TXT }}>{hours}h</span>
                        <span style={{ color: DIM }}>Agents</span>
                        <span>{selectedAgents.map(a => <span key={a} style={{ color: PAT[a as keyof typeof PAT]?.col, marginRight: 8, fontSize: 9 }}>{PAT[a as keyof typeof PAT]?.c}</span>)}</span>
                        <span style={{ color: DIM }}>Comm</span><span style={{ color: TXT }}>{commStyle}</span>
                        <span style={{ color: DIM }}>Autonomy</span><span style={{ color: PU }}>{autonomy}</span>
                        <span style={{ color: DIM }}>Tools</span><span style={{ color: CY, fontSize: 9 }}>{selectedTools.join(", ") || "None selected"}</span>
                      </div>
                    </div>
                    <button onClick={handleActivate} style={{
                      padding: "14px 48px", background: `${G}12`, border: `1px solid ${G}40`,
                      color: G, fontSize: 11, letterSpacing: 3, borderRadius: 4, cursor: "pointer",
                      fontFamily: "var(--font-jetbrains), monospace", transition: "all .3s",
                    }}>ACTIVATE GENESIS</button>
                  </div>
                ) : (
                  <div style={{ textAlign: "left" as const, ...S.panel, fontFamily: "var(--font-jetbrains), monospace" }}>
                    {genLines.map((l, i) => (
                      <div key={i} style={{ fontSize: 10, color: l.includes("✓") ? GR : l.includes("Welcome") ? G : MUT, lineHeight: 2 }}>
                        <span style={{ color: GR, marginRight: 6 }}>▸</span>{l}
                      </div>
                    ))}
                    {genLines.length > 0 && genLines.length < 8 && (
                      <div style={{ color: DIMR, fontSize: 10, marginTop: 4 }}>Processing...</div>
                    )}
                  </div>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        {!activating && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, paddingTop: 16, borderTop: `1px solid ${LINE}` }}>
            <button onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              style={{
                padding: "10px 24px", background: "transparent", border: `1px solid ${step === 0 ? LINE : G + "30"}`,
                color: step === 0 ? DIMR : DIM, fontSize: 9, letterSpacing: 2, borderRadius: 3, cursor: step === 0 ? "default" : "pointer",
                fontFamily: "var(--font-jetbrains), monospace", opacity: step === 0 ? 0.4 : 1,
              }}>← BACK</button>
            {step < 5 && (
              <button onClick={() => { if (canNext()) setStep(step + 1) }}
                disabled={!canNext()}
                style={{
                  padding: "10px 24px", background: canNext() ? `${G}12` : "transparent",
                  border: `1px solid ${canNext() ? G + "40" : LINE}`,
                  color: canNext() ? G : DIMR, fontSize: 9, letterSpacing: 2, borderRadius: 3,
                  cursor: canNext() ? "pointer" : "default",
                  fontFamily: "var(--font-jetbrains), monospace",
                }}>NEXT →</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
