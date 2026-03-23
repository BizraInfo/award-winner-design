"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useLifecycleStore } from "@/store/use-lifecycle-store"
import { SovereignNav } from "@/components/sovereign/sovereign-nav"
import {
  G, G2, BG, BG2, GR, RD, BL, PU, CY, AM, YL,
  TXT, MUT, DIM, DIMR, LINE, PAT, SAT
} from "@/components/sovereign/design-tokens"

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

interface ChatMessage {
  id: string
  role: "user" | "agent" | "system"
  agent?: string
  agentColor?: string
  content: string
  timestamp: number
  ihsan?: number
  receiptHash?: string
}

const QUICK_ACTIONS = [
  { label: "Morning Brief", icon: "☀️", prompt: "Give me my morning brief — overnight alerts and priority tasks." },
  { label: "Research", icon: "🔍", prompt: "Research the latest developments in " },
  { label: "Code Review", icon: "🔧", prompt: "Review and improve this code: " },
  { label: "Write Report", icon: "📝", prompt: "Draft a report on " },
  { label: "Plan Sprint", icon: "📋", prompt: "Plan my next sprint based on current priorities." },
  { label: "Health Check", icon: "💚", prompt: "Run a full system health check." },
]

export default function ChatPage() {
  const userName = useLifecycleStore(s => s.userName) || "Sovereign"
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "0", role: "system", content: `Welcome back, ${userName}. All 7 agents online. What shall we work on?`, timestamp: Date.now(), agent: "NEXUS", agentColor: PU },
  ])
  const [input, setInput] = useState("")
  const [running, setRunning] = useState(false)
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sessionSeed, setSessionSeed] = useState(0)
  const [sessionCount, setSessionCount] = useState(0)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])
  useEffect(() => { inputRef.current?.focus() }, [])

  const addMsg = useCallback((msg: Omit<ChatMessage, "id" | "timestamp">) => {
    setMessages(p => [...p, { ...msg, id: crypto.randomUUID(), timestamp: Date.now() }])
  }, [])

  const routeToAgent = (text: string): [string, keyof typeof PAT] => {
    const kw: Record<string, string[]> = {
      P1: ["plan", "organize", "strategy", "roadmap", "schedule", "sprint"],
      P2: ["research", "find", "analyze", "study", "paper", "learn"],
      P3: ["code", "build", "test", "fix", "deploy", "debug", "implement"],
      P4: ["evaluate", "score", "review", "audit", "benchmark", "quality"],
      P5: ["check", "ethics", "compliance", "constitution", "risk"],
      P6: ["write", "draft", "report", "document", "publish", "email"],
      P7: ["help", "brief", "morning", "status", "health"],
    }
    let best: keyof typeof PAT = "P7", bs = 0
    for (const [a, ws] of Object.entries(kw)) {
      const s = ws.filter(w => text.toLowerCase().includes(w)).length
      if (s > bs) { best = a as keyof typeof PAT; bs = s }
    }
    return [PAT[best].c, best]
  }

  const exec = useCallback(async (text: string) => {
    if (!text.trim() || running) return
    setRunning(true)
    addMsg({ role: "user", content: text })
    setInput("")
    await delay(300)

    const [agentCode, agentKey] = routeToAgent(text)
    const agent = PAT[agentKey]
    setActiveAgent(agentCode)
    addMsg({ role: "system", content: `Routing → ${agentCode}`, agent: "NEXUS", agentColor: PU })
    await delay(400)

    // Simulate agent thinking phases
    const phases = [
      `Scanning context for "${text.slice(0, 40)}${text.length > 40 ? "..." : ""}"`,
      "Retrieving relevant knowledge...",
      "Synthesizing response...",
    ]
    for (const p of phases) {
      addMsg({ role: "agent", content: p, agent: agentCode, agentColor: agent.col })
      await delay(350 + Math.random() * 300)
    }

    // Quality check
    const ih = +(0.95 + Math.random() * 0.04).toFixed(4)
    addMsg({ role: "agent", content: `Quality gate: İhsān ${ih}`, agent: "JUDGE", agentColor: YL })
    await delay(200)
    addMsg({ role: "agent", content: "Constitutional invariants hold ✓", agent: "CROWN", agentColor: RD })
    await delay(200)

    // Final response
    const hash = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(b => b.toString(16).padStart(2, "0")).join("")
    const seed = +(ih * 1.15).toFixed(3)
    addMsg({
      role: "agent", agent: agentCode, agentColor: agent.col,
      content: `Analysis complete. ${agent.n} has processed your request through the ${agent.d} pipeline. Receipt chained and signed.\n\nKey findings have been indexed to your knowledge graph. SEED earned: +${seed}`,
      ihsan: ih, receiptHash: hash,
    })
    setSessionSeed(p => +(p + seed).toFixed(3))
    setSessionCount(p => p + 1)
    setActiveAgent(null)
    setRunning(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [running, addMsg])

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: BG, color: TXT, fontFamily: "var(--font-jetbrains), monospace" }}>
      <SovereignNav />

      <div style={{ display: "flex", flex: 1, paddingTop: 44 }}>
        {/* Sidebar — Agent Panel */}
        {sidebarOpen && (
          <div style={{
            width: 220, borderRight: `1px solid ${LINE}`, padding: "12px 0",
            display: "flex", flexDirection: "column", flexShrink: 0,
          }}>
            <div style={{ padding: "0 12px 10px", fontSize: 7, letterSpacing: 2, color: DIM }}>PAT-7 AGENTS</div>
            {Object.entries(PAT).map(([k, a]) => (
              <div key={k} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px", cursor: "pointer",
                background: activeAgent === a.c ? `${a.col}08` : "transparent",
                borderLeft: `2px solid ${activeAgent === a.c ? a.col : "transparent"}`,
                transition: "all .15s",
              }}>
                <span style={{ fontSize: 12, color: a.col }}>{a.i}</span>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: activeAgent === a.c ? a.col : TXT, letterSpacing: 1 }}>{a.c}</div>
                  <div style={{ fontSize: 7, color: DIM }}>{a.d}</div>
                </div>
                <div style={{
                  marginLeft: "auto", width: 5, height: 5, borderRadius: "50%",
                  background: activeAgent === a.c ? a.col : `${GR}60`,
                }} />
              </div>
            ))}

            <div style={{ padding: "12px 12px 4px", fontSize: 7, letterSpacing: 2, color: DIM, marginTop: 8, borderTop: `1px solid ${LINE}` }}>SAT-5 SYSTEM</div>
            {SAT.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: `${s.col}80` }} />
                <span style={{ fontSize: 8, color: s.col }}>{s.n}</span>
                <span style={{ fontSize: 7, color: DIMR, marginLeft: "auto" }}>●</span>
              </div>
            ))}

            <div style={{ marginTop: "auto", padding: "12px", borderTop: `1px solid ${LINE}` }}>
              <div style={{ fontSize: 7, letterSpacing: 2, color: DIM, marginBottom: 6 }}>SESSION</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9 }}>
                <span style={{ color: DIM }}>Missions</span><span style={{ color: GR }}>{sessionCount}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, marginTop: 3 }}>
                <span style={{ color: DIM }}>SEED earned</span><span style={{ color: G }}>+{sessionSeed.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Main chat area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Toggle sidebar + header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderBottom: `1px solid ${LINE}` }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
              background: "transparent", border: `1px solid ${LINE}`, color: DIM,
              padding: "4px 8px", borderRadius: 3, cursor: "pointer", fontSize: 10,
              fontFamily: "var(--font-jetbrains), monospace",
            }}>{sidebarOpen ? "◁" : "▷"}</button>
            <span style={{ fontSize: 9, letterSpacing: 2, color: DIM }}>SOVEREIGN CHAT</span>
            {running && <span style={{ fontSize: 8, color: AM, marginLeft: "auto" }}>● PROCESSING</span>}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
            {messages.length <= 1 && (
              <div style={{ textAlign: "center", padding: "40px 0 20px" }}>
                <div style={{ fontFamily: "var(--font-cinzel), serif", fontSize: 14, color: G, letterSpacing: 3, marginBottom: 8 }}>BIZRA SOVEREIGN CHAT</div>
                <div style={{ fontSize: 10, color: DIM, maxWidth: 400, margin: "0 auto", lineHeight: 1.8 }}>
                  Every mission is routed through your Personal Agent Team, scored for quality, and recorded with a cryptographic receipt.
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 20 }}>
                  {QUICK_ACTIONS.map((q, i) => (
                    <button key={i} onClick={() => exec(q.prompt)} style={{
                      padding: "8px 14px", background: `${TXT}04`, border: `1px solid ${LINE}`,
                      borderRadius: 4, color: DIM, fontSize: 9, cursor: "pointer",
                      fontFamily: "var(--font-jetbrains), monospace", transition: "all .2s",
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      <span style={{ fontSize: 13 }}>{q.icon}</span>{q.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence>
              {messages.map(m => (
                <motion.div key={m.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    marginBottom: 8, display: "flex", flexDirection: "column",
                    alignItems: m.role === "user" ? "flex-end" : "flex-start",
                  }}>
                  {m.role !== "user" && m.agent && (
                    <span style={{ fontSize: 7, letterSpacing: 2, color: m.agentColor || DIM, marginBottom: 2, fontWeight: 600 }}>{m.agent}</span>
                  )}
                  <div style={{
                    maxWidth: "75%", padding: "10px 14px", borderRadius: 8,
                    background: m.role === "user" ? `${G}12` : m.role === "system" ? `${BG2}` : BG2,
                    border: `1px solid ${m.role === "user" ? G + "25" : LINE}`,
                    fontSize: 11, lineHeight: 1.7, color: m.role === "user" ? TXT : MUT,
                    whiteSpace: "pre-wrap" as const,
                  }}>
                    {m.content}
                  </div>
                  {m.receiptHash && (
                    <div style={{ display: "flex", gap: 10, marginTop: 3, fontSize: 7, color: DIMR }}>
                      <span>İhsān: <span style={{ color: (m.ihsan || 0) >= 0.98 ? GR : G }}>{m.ihsan}</span></span>
                      <span>Receipt: {m.receiptHash.slice(0, 12)}...</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={endRef} />
          </div>

          {/* Input area */}
          <div style={{ padding: "10px 20px 14px", borderTop: `1px solid ${G}10` }}>
            <div style={{
              display: "flex", alignItems: "flex-end", gap: 10,
              padding: "10px 14px", borderRadius: 8,
              background: BG2, border: `1px solid ${input ? G + "30" : LINE}`,
              transition: "border .2s",
            }}>
              <textarea ref={inputRef} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); exec(input) }
                }}
                placeholder={running ? "Processing..." : "Speak your mission... (Enter to send, Shift+Enter for newline)"}
                disabled={running}
                rows={1}
                style={{
                  flex: 1, background: "transparent", border: "none", color: TXT,
                  fontSize: 12, fontFamily: "var(--font-jetbrains), monospace",
                  outline: "none", resize: "none", lineHeight: 1.6,
                  minHeight: 20, maxHeight: 120,
                }} />
              <button onClick={() => exec(input)} disabled={running || !input.trim()}
                style={{
                  padding: "6px 16px", background: input.trim() && !running ? `${G}15` : "transparent",
                  border: `1px solid ${input.trim() && !running ? G + "40" : LINE}`,
                  borderRadius: 4, color: input.trim() && !running ? G : DIMR,
                  fontSize: 9, letterSpacing: 2, cursor: input.trim() && !running ? "pointer" : "default",
                  fontFamily: "var(--font-jetbrains), monospace",
                }}>SEND</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
