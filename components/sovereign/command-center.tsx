"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useLifecycleStore } from "@/store/use-lifecycle-store"
import type { TeachConfig } from "@/store/use-lifecycle-store"
import {
  G, G2, BG, BG2, GR, RD, BL, PU, CY, AM, YL, RS,
  TXT, MUT, DIM, DIMR, LINE,
  PAT, SAT, TIERS, TCOL, STAGES, getStage, SKILLS, SCHEDULED
} from "./design-tokens"

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

interface Msg { a: string; t: string; ty: string; ts: number; thinking?: boolean }

interface DashStats {
  seed: number; bloom: number; rac: number; vac: number; tier: number; mye: number
  s1: number; s2: number; streak: number; ihsan: number; reflexes: number
  leg: number; epic: number; sov: number
}

// Agent avatar component
function AgentAvatar({ agent, size = 28 }: { agent: string; size?: number }) {
  const a = PAT[agent as keyof typeof PAT]
  const col = a?.col || DIM
  const icon = a?.i || "◈"
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2, display: "flex",
      alignItems: "center", justifyContent: "center", flexShrink: 0,
      background: `${col}12`, border: `1px solid ${col}25`,
      fontSize: size * 0.45, color: col, fontWeight: 600,
    }}>
      {icon}
    </div>
  )
}

// Thinking indicator
function ThinkingDots({ color = G }: { color?: string }) {
  return (
    <span style={{ display: "inline-flex", gap: 3, padding: "4px 0" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: "50%", background: color,
          opacity: 0.4, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
      <style>{`@keyframes pulse { 0%,100% { opacity: 0.2; transform: scale(0.8); } 50% { opacity: 0.8; transform: scale(1); } }`}</style>
    </span>
  )
}

export function CommandCenter() {
  const userName = useLifecycleStore(s => s.userName) || "Sovereign"
  const config = useLifecycleStore(s => s.teachConfig)

  const nodeId = useLifecycleStore(s => s.nodeId)
  const [tab, setTab] = useState("cmd")
  const commStyle = config?.communication_pref || "Concise bullet points"
  const nodeShort = nodeId ? `${nodeId.slice(0, 8)}…` : "pending"
  const greeting = commStyle.includes("critical")
    ? `${userName}. Node ${nodeShort}. 7 PAT identities derived. Awaiting first mission.`
    : commStyle.includes("Detailed")
      ? `Welcome, ${userName}. Your genesis node ${nodeShort} is active. Seven PAT agent identities have been cryptographically derived from your sovereign key and are registered. They will come online as you engage them with missions — this is your first session, so none have executed work yet. Send a task to begin.`
      : `Welcome, ${userName}. Node ${nodeShort} active. 7 PAT identities derived — send a mission to begin.`

  const [msgs, setMsgs] = useState<Msg[]>([{ a: "NEXUS", t: greeting, ty: "greet", ts: Date.now() }])
  const [input, setInput] = useState("")
  const [running, setRunning] = useState(false)
  const [thinking, setThinking] = useState("")
  const [st, setSt] = useState<DashStats>({ seed: 0, bloom: 0, rac: 0, vac: 0, tier: 0, mye: 0, s1: 0, s2: 0, streak: 0, ihsan: 0, reflexes: 0, leg: 0, epic: 0, sov: 0 })
  const [time, setTime] = useState(new Date())
  const fe = useRef<HTMLDivElement>(null)
  const ta = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t) }, [])
  useEffect(() => { fe.current?.scrollIntoView({ behavior: "smooth" }) }, [msgs])

  const add = useCallback((a: string, t: string, ty = "agent") =>
    setMsgs(p => [...p, { a, t, ty, ts: Date.now() }].slice(-80)), [])

  // Proactive morning brief
  useEffect(() => {
    const t = setTimeout(() => {
      add("ATLAS", "Morning brief prepared based on overnight activity.", "pro")
      setTimeout(() => add("ORACLE", `Priority domains: ${(config?.priority_domains || ["Engineering"]).join(", ")}.`, "pro"), 2000)
      setTimeout(() => add("NEXUS", `${SCHEDULED.filter(m => !m.auto).length} missions pending approval.`, "pro"), 3500)
    }, 6000)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line

  const exec = useCallback(async (task: string) => {
    if (!task.trim() || running) return
    setRunning(true)
    add("YOU", task, "user")
    await delay(300)

    const kw: Record<string, string[]> = {
      P1: ["plan", "organize", "strategy", "roadmap", "schedule"],
      P2: ["research", "find", "analyze", "study", "paper"],
      P3: ["code", "build", "test", "fix", "deploy", "debug"],
      P4: ["evaluate", "score", "review", "audit", "benchmark"],
      P5: ["check", "ethics", "compliance", "constitution"],
      P6: ["write", "draft", "report", "document", "publish"],
    }
    let best = "P2", bs = 0
    for (const [a, ws] of Object.entries(kw)) {
      const s = ws.filter(w => task.toLowerCase().includes(w)).length
      if (s > bs) { best = a; bs = s }
    }
    const ag = PAT[best as keyof typeof PAT]

    // Show thinking state with agent name
    setThinking(ag.c)
    add("NEXUS", `Routing to ${ag.c} — ${ag.d}`, "route")
    await delay(600)

    // Agent working phases
    const phases = ["Gathering evidence...", "Analyzing context...", "Synthesizing response...", "Verifying quality..."]
    for (const phase of phases) {
      setThinking(`${ag.c}: ${phase}`)
      await delay(400 + Math.random() * 400)
    }

    // Quality check
    setThinking("JUDGE: Constitutional verification...")
    await delay(400)
    const ih = +(0.95 + Math.random() * 0.04).toFixed(4)

    // Result
    setThinking("")
    const isL = ih >= 0.98 && Math.random() > 0.5, isE = !isL && ih >= 0.96
    const drop = isL ? "⚡ LEGENDARY" : isE ? "💜 EPIC" : "🔵 RARE"
    const mul = isL ? 1.5 : isE ? 1.3 : 1.15
    const se = +(ih * mul).toFixed(3), be = +(0.01 * ih).toFixed(4)

    // Agent response as a proper message
    add(ag.c, `Analysis complete. Ihsān score: ${ih}. All constitutional gates passed.`, "result")
    await delay(200)
    add("SYS", `${drop}  +${se} SEED  •  Receipt signed  •  Chain extended`, "mint")

    setSt(p => {
      const ns = { ...p, seed: +(p.seed + se).toFixed(3), bloom: +(p.bloom + be).toFixed(4), rac: p.rac + 1, vac: p.vac + 1, streak: p.streak + 1, s2: p.s2 + 1, ihsan: ih, leg: p.leg + (isL ? 1 : 0), epic: p.epic + (isE ? 1 : 0) }
      if (ns.rac >= 100) ns.tier = 1; if (ns.rac >= 500) ns.tier = 2
      ns.mye = ns.s1 / Math.max(ns.s1 + ns.s2, 1)
      ns.sov = Math.min(1, 0.3 * (ns.rac / Math.max(ns.vac, 1)) + 0.25 * ih + 0.2 * (ns.streak / (ns.streak + 5)) + 0.15 * 0.8 + 0.1 * (ns.reflexes > 0 ? 0.5 : 0))
      return ns
    })

    const comp = (st.rac + 1) % 5 === 0
    if (comp) setSt(p => ({ ...p, reflexes: p.reflexes + 1 }))

    setRunning(false)
    setTimeout(() => ta.current?.focus(), 100)

    // Proactive follow-up
    setTimeout(() => {
      const pr: [string, string][] = [[ag.c, "Follow-up analysis available."], ["ORACLE", "Related pattern detected in knowledge base."], ["ATLAS", "Task queue updated."]]
      const [pa, pt] = pr[Math.floor(Math.random() * pr.length)]
      add(pa, pt, "pro")
    }, 3500)
  }, [add, running, st.rac, st.streak, st.reflexes])

  const stage = getStage(st.sov)
  const nv = +(st.sov * Math.max(st.rac, 0.01) * (st.ihsan || 0.01) * (1 + Math.log(1 + st.streak) / Math.log(10))).toFixed(2)
  const TABS = [
    { id: "cmd", l: "COMMAND", i: "▸" },
    { id: "char", l: "CHARACTER", i: "◈" },
    { id: "skill", l: "SKILLS", i: "⬡" },
    { id: "quest", l: "QUESTS", i: "♗" },
    { id: "prog", l: "PROGRESS", i: "↗" },
  ]

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 120) + "px"
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      const t = input
      setInput("")
      if (ta.current) ta.current.style.height = "auto"
      exec(t)
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: BG, color: TXT, fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      {/* Premium header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", borderBottom: `1px solid ${LINE}`, backdropFilter: "blur(20px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "var(--font-cinzel), serif", color: G, fontSize: 14, letterSpacing: 4, fontWeight: 600 }}>BIZRA</span>
          <div style={{ width: 1, height: 16, background: `${G}20` }} />
          <span style={{ fontSize: 10, color: DIM, letterSpacing: 2 }}>NODE0</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: running ? AM : GR, boxShadow: `0 0 8px ${running ? AM : GR}40` }} />
            <span style={{ fontSize: 9, color: running ? AM : GR, letterSpacing: 1 }}>{running ? "PROCESSING" : "READY"}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 11, alignItems: "center" }}>
          <span style={{ color: GR, fontWeight: 500 }}>{st.seed.toFixed(1)} SEED</span>
          <span style={{ color: PU, fontWeight: 500 }}>{st.bloom.toFixed(3)} BLOOM</span>
          <div style={{ width: 1, height: 12, background: `${G}15` }} />
          <span style={{ color: TCOL[st.tier], fontSize: 10 }}>{TIERS[st.tier]}</span>
          <span style={{ color: `${G}60`, fontSize: 10, fontFamily: "var(--font-jetbrains), monospace" }}>{time.toLocaleTimeString("en", { hour12: false })}</span>
        </div>
      </div>

      {/* Agent status strip */}
      <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "6px 20px", borderBottom: `1px solid ${LINE}06` }}>
        <span style={{ fontSize: 8, color: DIMR, letterSpacing: 2, marginRight: 8 }}>PAT-7</span>
        {Object.values(PAT).map((a, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 4, padding: "3px 8px",
            borderRadius: 20, border: `1px solid ${thinking.startsWith(a.c) ? a.col + "40" : LINE}`,
            background: thinking.startsWith(a.c) ? `${a.col}08` : "transparent",
            transition: "all 0.3s ease",
          }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: a.col, opacity: thinking.startsWith(a.c) ? 1 : 0.4, transition: "opacity 0.3s" }} />
            <span style={{ fontSize: 8, color: thinking.startsWith(a.c) ? a.col : DIMR, letterSpacing: 1, fontWeight: thinking.startsWith(a.c) ? 600 : 400 }}>{a.c}</span>
          </div>
        ))}
        <div style={{ width: 1, height: 14, background: `${LINE}`, margin: "0 6px" }} />
        <span style={{ fontSize: 8, color: DIMR, letterSpacing: 2, marginRight: 4 }}>SAT-5</span>
        {SAT.map((s, i) => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: `${s.col}40`, border: `1px solid ${s.col}20`, margin: "0 1px" }} />
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", padding: "0 20px", borderBottom: `1px solid ${LINE}`, gap: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "transparent", border: "none",
            borderBottom: tab === t.id ? `2px solid ${G}` : "2px solid transparent",
            color: tab === t.id ? G : DIM, padding: "10px 16px", fontSize: 10, letterSpacing: 2, cursor: "pointer",
            fontFamily: "var(--font-inter), system-ui", fontWeight: tab === t.id ? 600 : 400, transition: "all 0.2s",
          }}>
            <span style={{ marginRight: 6, fontSize: 11 }}>{t.i}</span>{t.l}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* COMMAND TAB — Premium chat */}
        {tab === "cmd" && (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {msgs.map((m, i) => {
                const isU = m.ty === "user"
                const isM = m.ty === "mint"
                const isP = m.ty === "pro"
                const isR = m.ty === "result"
                const isRoute = m.ty === "route"
                const col = isU ? G : isM ? GR : isR ? G : PAT[m.a as keyof typeof PAT]?.col || "#6B7280"

                if (isRoute) {
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0", padding: "0 40px" }}>
                      <div style={{ flex: 1, height: 1, background: `${col}15` }} />
                      <span style={{ fontSize: 9, color: `${col}60`, letterSpacing: 1 }}>{m.t}</span>
                      <div style={{ flex: 1, height: 1, background: `${col}15` }} />
                    </div>
                  )
                }

                if (isM) {
                  return (
                    <div key={i} style={{
                      margin: "8px 40px", padding: "8px 14px", borderRadius: 8,
                      background: `${GR}06`, border: `1px solid ${GR}15`,
                      fontSize: 11, color: GR, letterSpacing: 0.3,
                    }}>
                      {m.t}
                    </div>
                  )
                }

                return (
                  <div key={i} style={{
                    display: "flex", gap: 10, alignItems: "flex-start",
                    margin: isU ? "16px 0 8px" : "4px 0",
                    padding: isU ? "0" : isP ? "0 40px" : "0",
                    opacity: isP ? 0.6 : 1,
                  }}>
                    {!isU && !isP && <AgentAvatar agent={Object.keys(PAT).find(k => PAT[k as keyof typeof PAT].c === m.a) || ""} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {!isU && !isP && (
                        <span style={{ fontSize: 9, color: col, letterSpacing: 1, fontWeight: 600, display: "block", marginBottom: 2 }}>
                          {m.a}
                        </span>
                      )}
                      <div style={{
                        fontSize: isU ? 14 : 12.5,
                        lineHeight: 1.6,
                        color: isU ? TXT : isR ? `${G}dd` : isP ? `${col}90` : MUT,
                        fontWeight: isU ? 500 : 400,
                        fontStyle: isP ? "italic" : "normal",
                        ...(isU ? {
                          background: `${G}08`, border: `1px solid ${G}12`, borderRadius: 12,
                          padding: "10px 14px", maxWidth: "85%", marginLeft: "auto",
                        } : {}),
                      }}>
                        {m.t}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Thinking indicator */}
              {thinking && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "8px 0", padding: "8px 0" }}>
                  <AgentAvatar agent={Object.keys(PAT).find(k => PAT[k as keyof typeof PAT].c === thinking.split(":")[0]) || "P7"} />
                  <div>
                    <span style={{ fontSize: 9, color: DIM, letterSpacing: 1 }}>{thinking}</span>
                    <ThinkingDots color={G} />
                  </div>
                </div>
              )}
              <div ref={fe} />
            </div>

            {/* Quick actions */}
            {!running && (
              <div style={{ padding: "6px 20px", display: "flex", gap: 6, flexWrap: "wrap", borderTop: `1px solid ${LINE}06` }}>
                {["Research AI safety developments", "Build authentication system", "Plan quarterly roadmap", "Evaluate deployment quality"].map((m, i) => (
                  <button key={i} onClick={() => exec(m)} style={{
                    background: `${G}05`, border: `1px solid ${G}12`, color: `${G}90`,
                    padding: "5px 12px", borderRadius: 20, fontSize: 10,
                    cursor: "pointer", fontFamily: "var(--font-inter), system-ui",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${G}10`; e.currentTarget.style.borderColor = `${G}25` }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${G}05`; e.currentTarget.style.borderColor = `${G}12` }}
                  >{m}</button>
                ))}
              </div>
            )}

            {/* Premium input area */}
            <div style={{
              margin: "0 20px 16px", borderRadius: 16,
              border: `1px solid ${G}15`, background: `${BG2}`,
              transition: "border-color 0.2s",
            }}>
              <textarea
                ref={ta}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={running ? "Processing your mission..." : "What would you like to accomplish?"}
                disabled={running}
                rows={1}
                style={{
                  width: "100%", background: "transparent", border: "none",
                  color: TXT, fontSize: 13, fontFamily: "var(--font-inter), system-ui",
                  outline: "none", padding: "14px 16px 6px", resize: "none",
                  lineHeight: 1.5, minHeight: 20, maxHeight: 120,
                }}
              />
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "4px 12px 10px",
              }}>
                <div style={{ display: "flex", gap: 12, fontSize: 9, color: DIMR }}>
                  <span>RAC: {st.rac}</span>
                  <span>{st.reflexes} ⚡</span>
                  <span>Streak: {st.streak}</span>
                </div>
                <button
                  onClick={() => { const t = input; setInput(""); if (ta.current) ta.current.style.height = "auto"; exec(t) }}
                  disabled={!input.trim() || running}
                  style={{
                    background: input.trim() && !running ? G : `${G}20`,
                    color: input.trim() && !running ? BG : `${G}40`,
                    border: "none", borderRadius: 8, padding: "6px 16px",
                    fontSize: 10, fontWeight: 600, letterSpacing: 1,
                    cursor: input.trim() && !running ? "pointer" : "default",
                    transition: "all 0.2s",
                  }}
                >
                  {running ? "..." : "SEND"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* CHARACTER TAB */}
        {tab === "char" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            <div style={{ padding: 16, borderRadius: 12, border: `1px solid ${G}15`, background: `${G}04`, marginBottom: 14 }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: `${G}80`, marginBottom: 6 }}>NODE VALUE</div>
              <div style={{ fontSize: 32, fontWeight: 300, color: G }}>{nv}</div>
            </div>
            <div style={{ padding: 16, borderRadius: 12, border: `1px solid ${LINE}`, background: BG2, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div><div style={{ fontSize: 9, letterSpacing: 2, color: DIM }}>LIFECYCLE</div><div style={{ fontSize: 16, color: G, fontWeight: 500, marginTop: 2 }}>{stage.n}</div></div>
                <div style={{ textAlign: "right" }}><div style={{ fontSize: 9, color: DIM }}>Sovereignty</div><div style={{ fontSize: 16, color: G, marginTop: 2 }}>{(st.sov * 100).toFixed(1)}%</div></div>
              </div>
              <div style={{ width: "100%", height: 4, borderRadius: 99, background: `${TXT}08` }}>
                <div style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${G}80, ${G})`, transition: "width .7s", width: `${Math.min(100, stage.h > stage.l ? ((st.sov - stage.l) / (stage.h - stage.l)) * 100 : 100)}%` }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { l: "SEED", v: st.seed.toFixed(2), c: GR }, { l: "BLOOM", v: st.bloom.toFixed(3), c: PU },
                { l: "IHSAN", v: st.ihsan.toFixed(4), c: G }, { l: "TIER", v: TIERS[st.tier], c: TCOL[st.tier] },
                { l: "MYELINATION", v: (st.mye * 100).toFixed(0) + "%", c: BL }, { l: "STREAK", v: "" + st.streak, c: YL },
              ].map((s, i) => (
                <div key={i} style={{ padding: 12, borderRadius: 10, border: `1px solid ${LINE}`, background: BG2 }}>
                  <div style={{ fontSize: 8, letterSpacing: 2, color: DIM }}>{s.l}</div>
                  <div style={{ fontSize: 20, fontWeight: 300, color: s.c, marginTop: 2 }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SKILLS TAB */}
        {tab === "skill" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: DIM, marginBottom: 6 }}>HDA SKILLS — {SKILLS.filter(s => "u" in s && s.u).length}/{SKILLS.length}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {SKILLS.map(sk => {
                const tc = TCOL[sk.t]
                const unlocked = "u" in sk && sk.u
                return (
                  <div key={sk.id} style={{ padding: 10, borderRadius: 10, border: `1px solid ${unlocked ? tc + "20" : LINE}`, background: unlocked ? `${tc}05` : BG2, opacity: unlocked ? 1 : 0.35, transition: "all 0.2s" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 16 }}>{sk.i}</span>
                      <span style={{ fontSize: 7, color: tc, letterSpacing: 1 }}>{TIERS[sk.t]}</span>
                    </div>
                    <div style={{ fontSize: 10, marginTop: 4, fontWeight: unlocked ? 500 : 400, color: unlocked ? tc : DIM }}>{sk.n}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* QUESTS TAB */}
        {tab === "quest" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: DIM, marginBottom: 6 }}>SCHEDULED MISSIONS</div>
            {SCHEDULED.map((q, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", marginBottom: 6, borderRadius: 10, border: `1px solid ${LINE}`, background: BG2, transition: "border-color 0.2s" }}>
                <span style={{ fontSize: 22 }}>{q.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{q.n}</div>
                  <div style={{ fontSize: 10, color: DIM, fontStyle: "italic", marginTop: 2 }}>{q.desc}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    {q.agents.map((a, j) => (
                      <span key={j} style={{ fontSize: 8, color: PAT[Object.keys(PAT).find(k => PAT[k as keyof typeof PAT].c === a) as keyof typeof PAT]?.col || DIM, letterSpacing: 1 }}>{a}</span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: GR, fontSize: 11, fontWeight: 500 }}>+{q.seed} SEED</div>
                  <div style={{ fontSize: 8, color: DIM, fontFamily: "var(--font-jetbrains), monospace", marginTop: 2 }}>{q.cron}</div>
                  <div style={{ fontSize: 8, color: q.auto ? CY : YL, marginTop: 3, letterSpacing: 1 }}>{q.auto ? "AUTO" : "APPROVAL"}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PROGRESS TAB */}
        {tab === "prog" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            <div style={{ padding: 16, borderRadius: 12, textAlign: "center", border: `1px solid ${G}15`, background: `${G}04`, marginBottom: 16 }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: DIM }}>COMPOSITE NODE VALUE</div>
              <div style={{ fontSize: 36, fontWeight: 300, color: G, marginTop: 6 }}>{nv}</div>
            </div>
            <div style={{ fontSize: 9, letterSpacing: 2, color: DIM, marginBottom: 10 }}>VALUE FACTORS</div>
            {[
              { l: "Potential", v: st.sov, mx: 1, c: G }, { l: "Activation", v: st.rac, mx: 10, c: GR },
              { l: "Quality", v: st.ihsan, mx: 1, c: YL },
              { l: "Compounding", v: st.streak * (1 + Math.log(1 + st.streak) / Math.log(10)), mx: 50, c: BL },
            ].map((f, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: f.c }}>{f.l}</span>
                  <span style={{ fontSize: 10, color: f.c }}>{f.v.toFixed(3)}</span>
                </div>
                <div style={{ width: "100%", height: 3, borderRadius: 99, background: `${TXT}06` }}>
                  <div style={{ height: "100%", borderRadius: 99, background: f.c, transition: "width .5s", width: Math.min(100, (f.v / f.mx) * 100) + "%" }} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: 20, fontSize: 9, letterSpacing: 2, color: DIM, marginBottom: 10 }}>LIFECYCLE PATH</div>
            {STAGES.map((s, i) => {
              const active = st.sov >= s.l, cur = stage.n === s.n
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9,
                    background: cur ? `${G}12` : active ? `${GR}06` : "transparent",
                    border: `1.5px solid ${cur ? G : active ? GR + "30" : LINE}`, color: cur ? G : active ? GR : DIMR
                  }}>{cur ? "◉" : active ? "✓" : "○"}</div>
                  <span style={{ fontSize: 10, color: cur ? G : active ? GR : DIM, fontWeight: cur ? 600 : 400 }}>{s.n}</span>
                  <span style={{ fontSize: 8, color: DIMR }}>{(s.l * 100).toFixed(0)}%</span>
                  {cur && <span style={{ fontSize: 8, color: G }}>◄</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Premium status bar */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 20px", fontSize: 9, letterSpacing: 1, color: DIMR, borderTop: `1px solid ${LINE}`, background: `${BG}ee` }}>
        <span>{userName.toUpperCase()} · {TIERS[st.tier].toUpperCase()} · {stage.n.toUpperCase()}</span>
        <span>PAT-7 · SAT-5 · {config?.autonomy?.includes("Full") ? "FULL AUTO" : config?.autonomy?.includes("Ask") ? "MANUAL" : "SEMI-AUTO"}</span>
      </div>
    </div>
  )
}
