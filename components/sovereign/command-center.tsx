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

interface Msg { a: string; t: string; ty: string; ts: number }

interface DashStats {
  seed: number; bloom: number; rac: number; vac: number; tier: number; mye: number
  s1: number; s2: number; streak: number; ihsan: number; reflexes: number
  leg: number; epic: number; sov: number
}

export function CommandCenter() {
  const userName = useLifecycleStore(s => s.userName) || "Sovereign"
  const config = useLifecycleStore(s => s.teachConfig)

  const [tab, setTab] = useState("cmd")
  const commStyle = config?.communication_pref || "Concise bullet points"
  const greeting = commStyle.includes("critical")
    ? `${userName}. Systems nominal.`
    : commStyle.includes("Detailed")
      ? `Good evening, ${userName}. All seven agents are online and reporting nominal status. Your schedule is loaded, domains are configured, and I'm ready for your first mission.`
      : `Good evening, ${userName}. All agents reporting. What shall we work on?`

  const [msgs, setMsgs] = useState<Msg[]>([{ a: "NEXUS", t: greeting, ty: "greet", ts: Date.now() }])
  const [input, setInput] = useState("")
  const [running, setRunning] = useState(false)
  const [st, setSt] = useState<DashStats>({ seed: 0, bloom: 0, rac: 0, vac: 0, tier: 0, mye: 0, s1: 0, s2: 0, streak: 0, ihsan: 0, reflexes: 0, leg: 0, epic: 0, sov: 0 })
  const [time, setTime] = useState(new Date())
  const fe = useRef<HTMLDivElement>(null)
  const ir = useRef<HTMLInputElement>(null)

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t) }, [])
  useEffect(() => { fe.current?.scrollIntoView({ behavior: "smooth" }) }, [msgs])

  const add = useCallback((a: string, t: string, ty = "agent") =>
    setMsgs(p => [...p, { a, t, ty, ts: Date.now() }].slice(-80)), [])

  // Proactive morning brief
  useEffect(() => {
    const t = setTimeout(() => {
      add("ATLAS", "I've prepared your morning brief based on overnight activity.", "pro")
      setTimeout(() => add("ORACLE", `Priority domains loaded: ${(config?.priority_domains || ["Engineering"]).join(", ")}.`, "pro"), 2000)
      setTimeout(() => add("NEXUS", `${SCHEDULED.filter(m => !m.auto).length} scheduled missions pending approval.`, "pro"), 3500)
    }, 6000)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const exec = useCallback(async (task: string) => {
    if (!task.trim() || running) return
    setRunning(true)
    add("YOU", task, "user")
    await delay(300)
    add("NEXUS", `Analyzing: "${task.slice(0, 50)}${task.length > 50 ? "..." : ""}"`, "work")
    await delay(500)

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
    add("NEXUS", `Routing \u2192 ${ag.c}. ${ag.n} match.`, "route")
    await delay(400)

    for (const s of ["Scanning...", "Processing...", "Synthesizing...", "Quality check..."]) {
      add(ag.c, s, "work"); await delay(400 + Math.random() * 300)
    }
    add("JUDGE", "Quality assessment.", "work"); await delay(300)
    const ih = +(0.95 + Math.random() * 0.04).toFixed(4)
    add("JUDGE", `Ihsan: ${ih}. ${ih >= 0.98 ? "Exceptional." : "Above floor."}`, "score"); await delay(200)
    add("CROWN", "Constitutional scan \u2014 invariants hold.", "clear"); await delay(200)

    const isL = ih >= 0.98 && Math.random() > 0.5, isE = !isL && ih >= 0.96
    const drop = isL ? "\u26A1 LEGENDARY" : isE ? "\uD83D\uDC9C EPIC" : "\uD83D\uDD35 RARE"
    const mul = isL ? 1.5 : isE ? 1.3 : 1.15
    const se = +(ih * mul).toFixed(3), be = +(0.01 * ih).toFixed(4)
    add("SYS", `Receipt signed. ${drop} +${se} SEED`, "mint"); await delay(150)
    add("HERALD", "Delivered. Chained.", "agent")

    setSt(p => {
      const ns = { ...p, seed: +(p.seed + se).toFixed(3), bloom: +(p.bloom + be).toFixed(4), rac: p.rac + 1, vac: p.vac + 1, streak: p.streak + 1, s2: p.s2 + 1, ihsan: ih, leg: p.leg + (isL ? 1 : 0), epic: p.epic + (isE ? 1 : 0) }
      if (ns.rac >= 100) ns.tier = 1; if (ns.rac >= 500) ns.tier = 2
      ns.mye = ns.s1 / Math.max(ns.s1 + ns.s2, 1)
      ns.sov = Math.min(1, 0.3 * (ns.rac / Math.max(ns.vac, 1)) + 0.25 * ih + 0.2 * (ns.streak / (ns.streak + 5)) + 0.15 * 0.8 + 0.1 * (ns.reflexes > 0 ? 0.5 : 0))
      return ns
    })

    const comp = (st.rac + 1) % 5 === 0
    if (comp) setSt(p => ({ ...p, reflexes: p.reflexes + 1 }))
    add("NEXUS", `Complete. +${se} SEED. ${comp ? "\u26A1 Reflex compiled!" : (5 - ((st.rac + 1) % 5)) + " to compile."}`, "done")
    setRunning(false)
    setTimeout(() => ir.current?.focus(), 100)

    setTimeout(() => {
      const pr: [string, string][] = [[ag.c, "Follow-up available."], ["ORACLE", "Related pattern found."], ["JUDGE", `Ihsan: ${ih}.`], ["ATLAS", "Queue updated."]]
      const [pa, pt] = pr[Math.floor(Math.random() * pr.length)]
      add(pa, pt, "pro")
    }, 3500)
  }, [add, running, st.rac, st.streak, st.reflexes])

  const stage = getStage(st.sov)
  const nv = +(st.sov * Math.max(st.rac, 0.01) * (st.ihsan || 0.01) * (1 + Math.log(1 + st.streak) / Math.log(10))).toFixed(2)
  const TABS = [
    { id: "cmd", l: "COMMAND", i: "\u25B8" },
    { id: "char", l: "CHARACTER", i: "\u25C8" },
    { id: "skill", l: "SKILLS", i: "\u2B21" },
    { id: "quest", l: "QUESTS", i: "\u2657" },
    { id: "prog", l: "PROGRESS", i: "\u2197" },
  ]

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: BG, color: TXT, fontFamily: "var(--font-jetbrains), monospace", fontSize: 11 }}>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 16px", borderBottom: `1px solid ${LINE}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "var(--font-cinzel), serif", color: G, fontSize: 11, letterSpacing: 3, fontWeight: 600 }}>BIZRA</span>
          <span style={{ fontSize: 7, color: DIMR, letterSpacing: 2 }}>NODE0</span>
          <span style={{ fontSize: 7, letterSpacing: 1, color: running ? AM : GR }}>{running ? "\u25CF EXECUTING" : "\u25CF READY"}</span>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 9 }}>
          <span style={{ color: GR }}>{st.seed.toFixed(1)} SEED</span>
          <span style={{ color: PU }}>{st.bloom.toFixed(3)} BLOOM</span>
          <span style={{ color: TCOL[st.tier] }}>{TIERS[st.tier]}</span>
          <span style={{ color: G }}>{time.toLocaleTimeString("en", { hour12: false })}</span>
        </div>
      </div>

      {/* Agent bar */}
      <div style={{ display: "flex", gap: 1, padding: "2px 16px", borderBottom: `1px solid ${LINE}08` }}>
        {Object.values(PAT).map((a, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", padding: "2px 0", borderRadius: 2, border: `1px solid ${LINE}` }}>
            <div style={{ fontSize: 7, letterSpacing: 1, fontWeight: 500, color: a.col }}>{a.c}</div>
          </div>
        ))}
        <div style={{ width: 1, background: LINE, margin: "0 3px" }} />
        {SAT.map((s, i) => (
          <div key={i} style={{ padding: "2px 2px" }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: `${s.col}50`, margin: "0 auto" }} />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", padding: "0 16px", borderBottom: `1px solid ${LINE}` }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "transparent", border: "none",
            borderBottom: tab === t.id ? `2px solid ${G}` : "2px solid transparent",
            color: tab === t.id ? G : DIM, padding: "7px 12px", fontSize: 8, letterSpacing: 2, cursor: "pointer",
            fontFamily: "var(--font-jetbrains), monospace"
          }}>
            <span style={{ marginRight: 4 }}>{t.i}</span>{t.l}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* COMMAND TAB */}
        {tab === "cmd" && (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "6px 16px" }}>
              {msgs.map((m, i) => {
                const isU = m.ty === "user", isM = m.ty === "mint", isP = m.ty === "pro", isD = m.ty === "done"
                const col = isU ? G : isM ? GR : isD ? G : PAT[m.a as keyof typeof PAT]?.col || "#6B7280"
                return (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 1, padding: "1.5px 0", opacity: m.ty === "route" ? 0.45 : isP ? 0.65 : 1 }}>
                    <span style={{ fontWeight: 600, minWidth: 50, textAlign: "right", fontSize: 9, color: col }}>{isU ? "YOU" : m.a}</span>
                    <span style={{ color: isU ? TXT : isM ? GR : isD ? G : isP ? col : "#9CA3AF", fontSize: isU ? 11 : 10, lineHeight: 1.6, fontStyle: isP ? "italic" : "normal" }}>
                      {isM ? "\u25BA " + m.t : isD ? "\u2713 " + m.t : m.t}
                    </span>
                  </div>
                )
              })}
              <div ref={fe} />
            </div>
            {!running && (
              <div style={{ padding: "3px 16px", display: "flex", gap: 3, flexWrap: "wrap", borderTop: `1px solid ${LINE}08` }}>
                {["Research AI safety developments", "Build authentication tests", "Plan quarterly roadmap", "Evaluate deployment quality"].map((m, i) => (
                  <button key={i} onClick={() => exec(m)} style={{
                    background: `${TXT}05`, border: `1px solid ${LINE}`, color: DIM, padding: "3px 7px", borderRadius: 2, fontSize: 7,
                    cursor: "pointer", fontFamily: "var(--font-jetbrains), monospace"
                  }}>{m}</button>
                ))}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 16px", borderTop: `1px solid ${G}10` }}>
              <span style={{ color: G }}>{"\u25B8"}</span>
              <input ref={ir} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { const t = input; setInput(""); exec(t) } }}
                placeholder={running ? "Executing..." : "Speak your mission..."}
                disabled={running}
                style={{ flex: 1, background: "transparent", border: "none", color: TXT, fontSize: 11, fontFamily: "var(--font-jetbrains), monospace", outline: "none", letterSpacing: 0.5 }} />
              <div style={{ display: "flex", gap: 8, fontSize: 8, color: DIMR }}>
                <span>RAC:{st.rac}</span><span>{st.reflexes}{"\u26A1"}</span>
              </div>
            </div>
          </>
        )}

        {/* CHARACTER TAB */}
        {tab === "char" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            <div style={{ padding: 14, borderRadius: 10, border: `1px solid ${G}15`, background: `${G}04`, marginBottom: 12 }}>
              <div style={{ fontSize: 8, letterSpacing: 2, color: G, marginBottom: 4 }}>NODE VALUE</div>
              <div style={{ fontSize: 26, fontWeight: 300, color: G }}>{nv}</div>
            </div>
            <div style={{ padding: 14, borderRadius: 10, border: `1px solid ${LINE}`, background: BG2, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div><div style={{ fontSize: 8, letterSpacing: 2, color: DIM }}>LIFECYCLE</div><div style={{ fontSize: 14, color: G, fontWeight: 500 }}>{stage.n}</div></div>
                <div style={{ textAlign: "right" }}><div style={{ fontSize: 8, color: DIM }}>Sovereignty</div><div style={{ fontSize: 14, color: G }}>{(st.sov * 100).toFixed(1)}%</div></div>
              </div>
              <div style={{ width: "100%", height: 5, borderRadius: 99, background: `${TXT}08` }}>
                <div style={{ height: "100%", borderRadius: 99, background: G, transition: "width .7s", width: `${Math.min(100, stage.h > stage.l ? ((st.sov - stage.l) / (stage.h - stage.l)) * 100 : 100)}%` }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { l: "SEED", v: st.seed.toFixed(2), c: GR }, { l: "BLOOM", v: st.bloom.toFixed(3), c: PU },
                { l: "IHSAN", v: st.ihsan.toFixed(4), c: G }, { l: "TIER", v: TIERS[st.tier], c: TCOL[st.tier] },
                { l: "MYELINATION", v: (st.mye * 100).toFixed(0) + "%", c: BL }, { l: "STREAK", v: "" + st.streak, c: YL },
              ].map((s, i) => (
                <div key={i} style={{ padding: 10, borderRadius: 8, border: `1px solid ${LINE}`, background: BG2 }}>
                  <div style={{ fontSize: 7, letterSpacing: 2, color: DIM }}>{s.l}</div>
                  <div style={{ fontSize: 18, fontWeight: 300, color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SKILLS TAB */}
        {tab === "skill" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            <div style={{ fontSize: 8, letterSpacing: 2, color: DIM, marginBottom: 4 }}>HDA SKILLS {"\u2014"} {SKILLS.filter(s => "u" in s && s.u).length}/{SKILLS.length}</div>
            <div style={{ fontSize: 7, color: DIMR, marginBottom: 10 }}>8 productized desktop actions from founder-ops-agent manifest</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
              {SKILLS.map(sk => {
                const tc = TCOL[sk.t]
                const unlocked = "u" in sk && sk.u
                return (
                  <div key={sk.id} style={{ padding: 8, borderRadius: 6, border: `1px solid ${unlocked ? tc + "20" : LINE}`, background: unlocked ? `${tc}05` : BG2, opacity: unlocked ? 1 : 0.4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13 }}>{sk.i}</span>
                      <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                        {"hda" in sk && sk.hda && <span style={{ fontSize: 5, color: CY, letterSpacing: 1 }}>HDA</span>}
                        <span style={{ fontSize: 6, color: tc, letterSpacing: 1 }}>{TIERS[sk.t]}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 8, marginTop: 3, fontWeight: unlocked ? 500 : 400, color: unlocked ? tc : DIM }}>{sk.n}</div>
                    <div style={{ fontSize: 7, marginTop: 2, color: unlocked ? GR : DIMR }}>{unlocked ? "\u2713" : "\uD83D\uDD12"}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* QUESTS TAB */}
        {tab === "quest" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            <div style={{ fontSize: 8, letterSpacing: 2, color: DIM, marginBottom: 4 }}>SCHEDULED MISSIONS</div>
            <div style={{ fontSize: 7, color: DIMR, marginBottom: 12 }}>From founder-ops-agent manifest {"\u00B7"} {config?.work_schedule || "8:00-18:00"}</div>
            {SCHEDULED.map((q, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 5, borderRadius: 8, border: `1px solid ${LINE}`, background: BG2 }}>
                <span style={{ fontSize: 18 }}>{q.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 500 }}>{q.n}</div>
                  <div style={{ fontSize: 8, color: DIM, fontFamily: "var(--font-playfair), serif", fontStyle: "italic" }}>{q.desc}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
                    {q.agents.map((a, j) => (
                      <span key={j} style={{ fontSize: 7, color: PAT[Object.keys(PAT).find(k => PAT[k as keyof typeof PAT].c === a) as keyof typeof PAT]?.col || DIM, letterSpacing: 1 }}>{a}</span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: GR, fontSize: 10 }}>+{q.seed} SEED</div>
                  <div style={{ fontSize: 7, color: DIM, fontFamily: "var(--font-jetbrains), monospace" }}>{q.cron}</div>
                  <div style={{ fontSize: 7, color: q.auto ? CY : YL, marginTop: 2 }}>{q.auto ? "AUTO" : "APPROVAL"}</div>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 8, letterSpacing: 2, color: DIM, marginTop: 20, marginBottom: 8 }}>AD-HOC MISSIONS</div>
            {[
              { n: "File Janitor", seed: "0.50", icon: "🧹", desc: "Organize a folder" },
              { n: "Report Generator", seed: "1.00", icon: "📊", desc: "Create report from data" },
              { n: "Build Pipeline", seed: "2.00", icon: "🏗️", desc: "Full CI/CD execution" },
              { n: "Knowledge Crawl", seed: "5.00", icon: "🧠", desc: "Index your digital life" },
            ].map((q, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 4, borderRadius: 8, border: `1px solid ${LINE}`, background: "transparent", opacity: 0.7 }}>
                <span style={{ fontSize: 16 }}>{q.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 500 }}>{q.n}</div>
                  <div style={{ fontSize: 8, color: DIM, fontStyle: "italic" }}>{q.desc}</div>
                </div>
                <div style={{ color: GR, fontSize: 9 }}>+{q.seed}</div>
              </div>
            ))}
          </div>
        )}

        {/* PROGRESS TAB */}
        {tab === "prog" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            <div style={{ fontSize: 8, letterSpacing: 2, color: DIM, marginBottom: 10 }}>NODE VALUE FACTORS</div>
            {[
              { l: "Potential", v: st.sov, mx: 1, c: G }, { l: "Activation", v: st.rac, mx: 10, c: GR },
              { l: "Quality", v: st.ihsan, mx: 1, c: YL },
              { l: "Compounding", v: st.streak * (1 + Math.log(1 + st.streak) / Math.log(10)), mx: 50, c: BL },
              { l: "Synergy", v: 1, mx: 5, c: PU },
            ].map((f, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 9, color: f.c }}>{f.l}</span>
                  <span style={{ fontSize: 9, color: f.c }}>{f.v.toFixed(3)}</span>
                </div>
                <div style={{ width: "100%", height: 4, borderRadius: 99, background: `${TXT}08` }}>
                  <div style={{ height: "100%", borderRadius: 99, background: f.c, transition: "width .5s", width: Math.min(100, (f.v / f.mx) * 100) + "%" }} />
                </div>
              </div>
            ))}
            <div style={{ padding: 14, borderRadius: 10, textAlign: "center", border: `1px solid ${G}15`, background: `${G}04`, marginTop: 8 }}>
              <div style={{ fontSize: 8, letterSpacing: 2, color: DIM }}>COMPOSITE</div>
              <div style={{ fontSize: 30, fontWeight: 300, color: G, marginTop: 4 }}>{nv}</div>
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 8, letterSpacing: 2, color: DIM, marginBottom: 8 }}>SEED {"\u2192"} CATALYST</div>
              {STAGES.map((s, i) => {
                const active = st.sov >= s.l, cur = stage.n === s.n
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8,
                      background: cur ? `${G}12` : active ? `${GR}08` : "transparent",
                      border: `1px solid ${cur ? G : active ? GR + "30" : LINE}`, color: cur ? G : active ? GR : DIMR
                    }}>{cur ? "\u25C9" : active ? "\u2713" : "\u25CB"}</div>
                    <span style={{ fontSize: 9, color: cur ? G : active ? GR : DIM, fontWeight: cur ? 600 : 400 }}>{s.n}</span>
                    <span style={{ fontSize: 7, color: DIM }}>{(s.l * 100).toFixed(0)}%</span>
                    {cur && <span style={{ fontSize: 7, color: G }}>{"\u25C4"}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 16px", fontSize: 7, letterSpacing: 1, color: DIMR, borderTop: `1px solid ${LINE}` }}>
        <span>{userName.toUpperCase()} {"\u00B7"} {TIERS[st.tier].toUpperCase()} {"\u00B7"} {stage.n.toUpperCase()}</span>
        <span>PAT-7 {"\u00B7"} SAT-5 {"\u00B7"} 15 ALG {"\u00B7"} 7 INV {"\u00B7"} {config?.autonomy?.includes("Full") ? "FULL AUTO" : config?.autonomy?.includes("Ask") ? "MANUAL" : "SEMI-AUTO"}</span>
      </div>
    </div>
  )
}
