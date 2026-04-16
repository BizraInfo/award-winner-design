"use client"

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react"
import { useLifecycleStore } from "@/store/use-lifecycle-store"
import type { TeachConfig } from "@/store/use-lifecycle-store"
import { generateSovereignKeypair, signWithSovereignKey } from "@/lib/crypto/sovereign-keygen"
import { G, BG, GR, TXT, DIM, DIMR, LINE, PAT, SAT, CY, PU, TEACH_QUESTIONS } from "./design-tokens"

// Row 10 ratchet: presentation-only waits. Semantically just setTimeout, but
// grep-findable and self-documenting. Use this for animation pacing,
// console-log reveal cadence, etc. — anything that does NOT gate phase
// advancement. Advancement gates bind to real backend events (see
// /api/health and /api/node/activate call sites in this file).
const presentationDelay = (ms: number, _reason: string): Promise<void> =>
  new Promise(r => setTimeout(r, ms))

function F({ children, d = 0 }: { children: ReactNode; d?: number }) {
  const [v, setV] = useState(false)
  useEffect(() => { const t = setTimeout(() => setV(true), d); return () => clearTimeout(t) }, [d])
  return (
    <div style={{ opacity: v ? 1 : 0, transform: v ? "translateY(0)" : "translateY(10px)", transition: "all .6s ease" }}>
      {children}
    </div>
  )
}

// ============================
// SPLASH SCREEN
// ============================
export function SplashScreen({ onStart }: { onStart: () => void }) {
  const [h, setH] = useState(false)
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: BG, fontFamily: "var(--font-jetbrains), monospace", position: "relative", overflow: "hidden"
    }}>
      <div style={{
        position: "absolute", width: 400, height: 400, borderRadius: "50%", opacity: 0.06,
        background: `radial-gradient(circle,${G},transparent)`, top: "15%", left: "25%", filter: "blur(60px)"
      }} />
      <F d={300}>
        <div style={{
          width: 100, height: 100, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          border: `1.5px solid ${G}18`, boxShadow: `0 0 80px ${G}06`, marginBottom: 32
        }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: `radial-gradient(circle,${G}25,transparent)`, animation: "pulse 3s ease-in-out infinite" }} />
        </div>
      </F>
      <F d={700}><div style={{ fontFamily: "var(--font-cinzel), serif", color: G, fontSize: 16, letterSpacing: 6, fontWeight: 600 }}>BIZRA</div></F>
      <F d={1000}><div style={{ fontSize: 11, color: DIMR, letterSpacing: 4, marginTop: 4 }}>SOVEREIGN AI OPERATING SYSTEM</div></F>
      <F d={1400}>
        <div style={{ marginTop: 28, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-amiri), serif", fontSize: 16, color: `${G}35`, direction: "rtl", marginBottom: 8 }}>{"\u0628\u0633\u0645 \u0627\u0644\u0644\u0647 \u0627\u0644\u0631\u062D\u0645\u0646 \u0627\u0644\u0631\u062D\u064A\u0645"}</div>
          <div style={{ color: `${TXT}55`, fontSize: 12, lineHeight: 1.9, fontFamily: "var(--font-playfair), serif", fontStyle: "italic", maxWidth: 320 }}>
            Every human is a node. Every node is a seed.<br />Every seed has infinite potential.
          </div>
        </div>
      </F>
      <F d={2000}>
        <button onClick={onStart} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
          style={{
            marginTop: 36, background: h ? `${G}0A` : "transparent", border: `1px solid ${h ? G + "50" : G + "20"}`,
            color: G, padding: "14px 44px", borderRadius: 2, fontSize: 13, letterSpacing: 5, cursor: "pointer",
            fontFamily: "var(--font-jetbrains), monospace", transition: "all .4s", boxShadow: h ? `0 0 50px ${G}0A` : "none"
          }}>INITIALIZE NODE</button>
      </F>
      <style>{`@keyframes pulse{0%,100%{opacity:.25;transform:scale(1)}50%{opacity:.5;transform:scale(1.06)}}`}</style>
    </div>
  )
}

// ============================
// GENESIS (name + identity)
// ============================
export interface GenesisIdentity {
  nodeId: string
  publicKey: string
  privateKeyJwk: JsonWebKey
  agentIds: string[]
  signature: string
  constitutionHash: string
  activatedAt: string
}

export function GenesisFlow({ onDone }: { onDone: (name: string, identity: GenesisIdentity) => void }) {
  const [name, setName] = useState("")
  const [ph, setPh] = useState<"in" | "gen">("in")
  const [lines, setLines] = useState<string[]>([])
  const r = useRef<HTMLInputElement>(null)

  useEffect(() => { setTimeout(() => r.current?.focus(), 500) }, [])

  const [error, setError] = useState<string | null>(null)
  const go = useCallback(async () => {
    if (!name.trim()) return
    setPh("gen")
    setError(null)

    // G1: Generate Ed25519 keypair client-side — private key never leaves the browser
    setLines(p => [...p, "Generating Ed25519 keypair locally..."])
    let keypair: Awaited<ReturnType<typeof generateSovereignKeypair>>
    try {
      keypair = await generateSovereignKeypair()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(`Key generation failed: ${msg}`)
      setLines(p => [...p, `FAILED: Key generation — ${msg}`])
      return
    }
    await presentationDelay(200, "post-keygen-reveal")
    setLines(p => [...p, `Ed25519 keypair generated  —  pk:${keypair.publicKeyHex.slice(0, 16)}…`])

    // Register with genesis endpoint — send only public key
    setLines(p => [...p, "Registering with sovereign endpoint..."])
    try {
      const res = await fetch("/api/genesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), publicKey: keypair.publicKeyHex }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error || `Genesis failed (${res.status})`)
      }
      const data = await res.json() as {
        nodeId: string
        publicKey: string
        constitutionHash: string
        agentIds: string[]
        activatedAt: string
        envelope: string
        steps: Array<{ label: string; detail: string; ok: boolean }>
      }
      for (const s of data.steps) {
        await presentationDelay(280, "genesis-step-reveal")
        setLines(p => [...p, `${s.label}  —  ${s.detail}`])
      }

      // G1: Sign the genesis envelope locally with the client's private key
      await presentationDelay(200, "pre-sign-pause")
      setLines(p => [...p, "Signing genesis envelope locally..."])
      const signature = await signWithSovereignKey(keypair.privateKeyJwk, data.envelope)
      await presentationDelay(200, "post-sign-reveal")
      setLines(p => [...p, `Signed genesis envelope  —  sig:${signature.slice(0, 16)}…`])

      // Row 10 ratchet: gate the final handoff on a real backend readiness
      // probe instead of a hardcoded delay. If the persistence substrate is
      // not ok, surface the truth rather than advance theatrically.
      setLines(p => [...p, "Verifying persistence substrate..."])
      try {
        const h = await fetch("/api/health")
        const hj = await h.json()
        if (hj.redis !== "ok") {
          throw new Error(
            hj.redis === "disabled"
              ? "Persistence disabled (REDIS_URL not set) — cannot activate sovereign node."
              : "Persistence substrate not ready — cannot activate sovereign node."
          )
        }
        setLines(p => [...p, `Persistence substrate: ${hj.redis}`])
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
        setLines(p => [...p, `FAILED: ${msg}`])
        return
      }

      setLines(p => [...p, `Welcome, ${name.trim()}.`])
      onDone(name.trim(), {
        nodeId: data.nodeId,
        publicKey: data.publicKey,
        privateKeyJwk: keypair.privateKeyJwk,
        agentIds: data.agentIds,
        signature,
        constitutionHash: data.constitutionHash,
        activatedAt: data.activatedAt,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      setLines(p => [...p, `FAILED: ${msg}`])
    }
  }, [name, onDone])

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: BG, fontFamily: "var(--font-jetbrains), monospace"
    }}>
      <F d={200}><div style={{ fontFamily: "var(--font-cinzel), serif", color: G, fontSize: 11, letterSpacing: 5, marginBottom: 24 }}>IDENTITY GENESIS</div></F>
      {ph === "in" && (
        <F d={400}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <div style={{ color: DIM, fontSize: 12, fontFamily: "var(--font-playfair), serif", fontStyle: "italic" }}>What shall the network know you as?</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: G }}>{"\u25B8"}</span>
              <input ref={r} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && go()}
                placeholder="Your sovereign name"
                style={{
                  background: "transparent", border: "none", borderBottom: `1px solid ${G}25`, color: TXT, fontSize: 14,
                  fontFamily: "var(--font-jetbrains), monospace", padding: "8px 0", width: 240, outline: "none", letterSpacing: 1
                }} />
            </div>
            <button onClick={go} disabled={!name.trim()} style={{
              marginTop: 4, background: "transparent", border: `1px solid ${name.trim() ? G + "35" : LINE}`,
              color: name.trim() ? G : `${TXT}20`, padding: "10px 32px", borderRadius: 2, fontSize: 12, letterSpacing: 4,
              fontFamily: "var(--font-jetbrains), monospace", cursor: name.trim() ? "pointer" : "default"
            }}>GENERATE IDENTITY</button>
          </div>
        </F>
      )}
      {ph !== "in" && (
        <div style={{ maxWidth: 560, width: "100%", padding: "0 24px" }}>
          {lines.map((l, i) => {
            const isFail = l.startsWith("FAILED")
            const isWelcome = l.startsWith("Welcome,")
            const color = isFail ? "#ef4444" : isWelcome ? G : l.includes("Requesting") ? DIM : GR
            const marker = isFail ? "\u2717" : isWelcome ? "\u2605" : l.includes("Requesting") ? "\u25B8" : "\u2713"
            return (
              <F key={i} d={i * 60}>
                <div style={{ padding: "3px 0", fontSize: 13, color, fontFamily: "var(--font-jetbrains), monospace" }}>
                  <span style={{ color, marginRight: 8 }}>{marker}</span>{l}
                </div>
              </F>
            )
          })}
          {error && (
            <div style={{ marginTop: 16, padding: 12, border: "1px solid #ef444433", borderRadius: 4, color: "#ef4444", fontSize: 12 }}>
              Genesis endpoint error. <button onClick={() => { setPh("in"); setLines([]); setError(null) }} style={{ color: G, background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>retry</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================
// TEACH STEPS (5 questions)
// ============================
export function TeachSteps({ userName, onDone }: { userName: string; onDone: (config: TeachConfig) => void }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [textVal, setTextVal] = useState("")
  const [selected, setSelected] = useState<string[]>([])

  const q = TEACH_QUESTIONS[step]
  const total = TEACH_QUESTIONS.length

  const next = () => {
    const ans = { ...answers }
    if (q.type === "text") ans[q.id] = textVal || q.default || ""
    else if (q.type === "single") ans[q.id] = selected[0] || q.default || ""
    else ans[q.id] = selected.length ? selected : []
    setAnswers(ans)
    setSelected([])
    setTextVal("")
    if (step < total - 1) {
      setStep(step + 1)
    } else {
      onDone({
        work_schedule: (ans.work_schedule as string) || "8:00-18:00",
        primary_tools: Array.isArray(ans.primary_tools) ? ans.primary_tools : [],
        communication_pref: (ans.communication_pref as string) || "Concise bullet points",
        priority_domains: Array.isArray(ans.priority_domains) ? ans.priority_domains : [],
        autonomy: (ans.autonomy as string) || "Auto low-risk, ask high-risk",
      })
    }
  }

  const toggleOpt = (o: string) => {
    if (q.type === "single") setSelected([o])
    else setSelected(p => p.includes(o) ? p.filter(x => x !== o) : [...p, o])
  }

  const isText = q.type === "text"
  const canNext = isText || selected.length > 0

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: BG, fontFamily: "var(--font-jetbrains), monospace"
    }}>
      <F d={100}>
        <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
          {TEACH_QUESTIONS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 32 : 20, height: 3, borderRadius: 99,
              background: i < step ? GR : i === step ? G : `${TXT}15`, transition: "all .4s"
            }} />
          ))}
        </div>
      </F>
      <F d={200}><div style={{ fontFamily: "var(--font-cinzel), serif", color: G, fontSize: 12, letterSpacing: 4, marginBottom: 4 }}>TEACH {"\u00B7"} STEP {step + 1}/{total}</div></F>
      <F d={300} key={step}>
        <div style={{ textAlign: "center", maxWidth: 420, padding: "0 24px" }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>{q.icon}</div>
          <div style={{ fontSize: 14, color: TXT, marginBottom: 6, fontFamily: "var(--font-playfair), serif" }}>{q.prompt}</div>
          <div style={{ fontSize: 11, color: DIMR, marginBottom: 24 }}>This configures your PAT-7 agent team</div>

          {q.type === "text" && (
            <input value={textVal} onChange={e => setTextVal(e.target.value)} onKeyDown={e => e.key === "Enter" && next()}
              placeholder={q.default} autoFocus
              style={{
                background: "transparent", border: "none", borderBottom: `1px solid ${G}25`, color: TXT, fontSize: 14,
                fontFamily: "var(--font-jetbrains), monospace", padding: "8px 0", width: "100%", outline: "none", textAlign: "center"
              }} />
          )}

          {(q.type === "single" || q.type === "multi") && "opts" in q && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {q.opts.map((o, i) => {
                const sel = selected.includes(o)
                return (
                  <button key={i} onClick={() => toggleOpt(o)}
                    style={{
                      padding: "10px 16px", borderRadius: 6, background: sel ? `${G}12` : "transparent",
                      border: `1px solid ${sel ? G + "40" : LINE}`, color: sel ? G : `${TXT}80`, fontSize: 12,
                      fontFamily: "var(--font-jetbrains), monospace", cursor: "pointer", transition: "all .2s", textAlign: "left",
                      display: "flex", alignItems: "center", gap: 10
                    }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: q.type === "single" ? "50%" : 4, border: `1.5px solid ${sel ? G : LINE}`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                    }}>
                      {sel && <div style={{ width: 8, height: 8, borderRadius: q.type === "single" ? "50%" : 2, background: G }} />}
                    </div>
                    {o}
                  </button>
                )
              })}
            </div>
          )}

          <button onClick={next} disabled={!canNext}
            style={{
              marginTop: 24, background: canNext ? `${G}15` : "transparent",
              border: `1px solid ${canNext ? G + "40" : LINE}`,
              color: canNext ? G : `${TXT}20`, padding: "10px 36px", borderRadius: 4, fontSize: 13, letterSpacing: 3,
              fontFamily: "var(--font-jetbrains), monospace", cursor: canNext ? "pointer" : "default", transition: "all .3s"
            }}>
            {step === total - 1 ? "CONFIGURE AGENTS" : "NEXT \u2192"}
          </button>
        </div>
      </F>
    </div>
  )
}

// ============================
// ASSEMBLY (agent boot)
// ============================
export function Assembly({ userName, config, onDone }: { userName: string; config: TeachConfig; onDone: () => void }) {
  const agentIds = useLifecycleStore(s => s.agentIds)
  const nodeId = useLifecycleStore(s => s.nodeId)
  const publicKey = useLifecycleStore(s => s.publicKey)
  const privateKeyJwk = useLifecycleStore(s => s.privateKeyJwk)
  const [booted, setBooted] = useState<string[]>([])
  const [sat, setSat] = useState(false)
  const [done, setDone] = useState(false)
  const [configLines, setConfigLines] = useState<string[]>([])
  const [activationError, setActivationError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (config.work_schedule) { await presentationDelay(300, "config-line-reveal"); if (cancelled) return; setConfigLines(p => [...p, `Schedule: ${config.work_schedule}`]) }
      if (config.primary_tools?.length) { await presentationDelay(200, "config-line-reveal"); if (cancelled) return; setConfigLines(p => [...p, `Tools: ${config.primary_tools.join(", ")}`]) }
      if (config.communication_pref) { await presentationDelay(200, "config-line-reveal"); if (cancelled) return; setConfigLines(p => [...p, `Comms: ${config.communication_pref}`]) }
      if (config.priority_domains?.length) { await presentationDelay(200, "config-line-reveal"); if (cancelled) return; setConfigLines(p => [...p, `Domains: ${config.priority_domains.join(", ")}`]) }
      if (config.autonomy) { await presentationDelay(200, "config-line-reveal"); if (cancelled) return; setConfigLines(p => [...p, `Autonomy: ${config.autonomy}`]) }
      await presentationDelay(400, "pre-agent-boot-pause")
      for (const id of Object.keys(PAT)) {
        await presentationDelay(300 + Math.random() * 150, "agent-boot-stagger")
        if (cancelled) return
        setBooted(p => [...p, id])
      }
      await presentationDelay(400, "pre-sat-reveal"); if (cancelled) return; setSat(true)

      // G2: Activate node with client-signed receipt — FAIL CLOSED.
      // If activation cannot verify cryptographically, onboarding does NOT
      // proceed to DAILY_LOOP. The user sees the error + a retry, and onDone()
      // is held until a verified receipt is returned.
      if (!nodeId || !publicKey || !privateKeyJwk) {
        if (!cancelled) setActivationError("Missing sovereign identity; cannot activate. Re-run genesis.")
        return
      }

      await presentationDelay(300, "pre-sign-activation"); if (cancelled) return;
      setConfigLines(p => [...p, "Signing activation receipt..."])
      try {
        const resourceSettings = { cpuShare: 20, gpuShare: 0, storageShare: 10, alwaysAvailable: true, availableHours: [0, 24] as [number, number] }
        const receipt = JSON.stringify({
          type: "node.activation.v1",
          nodeId,
          resourceSettings,
          activatedAt: new Date().toISOString(),
          constitutionVersion: "5.0.0-GENESIS",
        })
        const signature = await signWithSovereignKey(privateKeyJwk, receipt)
        await presentationDelay(200, "post-sign-activation-reveal"); if (cancelled) return;
        setConfigLines(p => [...p, `Receipt signed  —  sig:${signature.slice(0, 16)}…`])

        const res = await fetch("/api/node/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nodeId, publicKey, resourceSettings, receipt, signature }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
          throw new Error(err.error || `Activation failed (${res.status})`)
        }
        const data = await res.json()
        // Fail-closed: the server MUST confirm signerMode=genesis_ed25519 AND verified=true.
        if (data.signerMode !== "genesis_ed25519" || data.verified !== true) {
          throw new Error(`Unverifiable activation (mode:${data.signerMode} verified:${data.verified})`)
        }
        await presentationDelay(200, "post-activate-reveal"); if (cancelled) return;
        setConfigLines(p => [...p, `Node activated  —  mode:${data.signerMode}  verified:${data.verified}`])
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (!cancelled) {
          setActivationError(msg)
          setConfigLines(p => [...p, `ACTIVATION BLOCKED: ${msg}`])
        }
        return  // fail-closed: do NOT call setDone or onDone
      }

      await presentationDelay(600, "post-activate-pause"); if (cancelled) return; setDone(true)
      await presentationDelay(500, "pre-handoff-reveal"); if (cancelled) return; onDone()
    })()
    return () => { cancelled = true }
  }, []) // eslint-disable-line

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20,
      background: BG, fontFamily: "var(--font-jetbrains), monospace"
    }}>
      <F d={100}><div style={{ textAlign: "center" }}><div style={{ fontFamily: "var(--font-cinzel), serif", color: G, fontSize: 13, letterSpacing: 5 }}>ASSEMBLING YOUR TEAM</div></div></F>

      {configLines.length > 0 && (
        <div style={{ minWidth: 340 }}>
          {configLines.map((l, i) => (
            <F key={i} d={i * 50}><div style={{ fontSize: 12, color: CY, padding: "2px 0" }}>
              <span style={{ color: GR, marginRight: 8 }}>{"\u2699"}</span>{l}
            </div></F>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 460 }}>
        {Object.entries(PAT).map(([id, ag], i) => {
          const on = booted.includes(id)
          const agentIdShort = agentIds[i] ? `${agentIds[i].slice(0, 12)}…` : "—"
          return (
            <F key={id} d={100 + i * 60}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderRadius: 6,
                background: on ? `${ag.col}06` : "transparent", border: `1px solid ${on ? ag.col + "18" : LINE}`, transition: "all .5s"
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
                  border: `1px solid ${on ? ag.col + "30" : LINE}`, color: on ? ag.col : `${TXT}15`, transition: "all .5s"
                }}>{ag.i}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, color: on ? ag.col : `${TXT}15`, transition: "color .5s" }}>{ag.c}</span>
                    <span style={{ fontSize: 12, color: on ? "#9CA3AF" : `${TXT}15`, transition: "color .5s" }}>{ag.n}</span>
                  </div>
                  <div style={{ fontSize: 7, marginTop: 1, color: on ? DIM : `${TXT}10`, fontFamily: "var(--font-playfair), serif", fontStyle: "italic", transition: "color .5s" }}>
                    {on ? ag.b : "..."}
                  </div>
                </div>
                <div style={{ fontSize: 9, color: on ? DIM : `${TXT}10`, fontFamily: "var(--font-jetbrains), monospace", marginRight: 6, transition: "color .5s" }}>
                  {on ? agentIdShort : ""}
                </div>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: on ? ag.col : `${TXT}10`, boxShadow: on ? `0 0 5px ${ag.col}35` : "none", transition: "all .5s" }} />
              </div>
            </F>
          )
        })}
      </div>

      {sat && (
        <F>
          <div style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${PU}12`, background: `${PU}04` }}>
            <div style={{ fontSize: 7, letterSpacing: 2, color: PU, marginBottom: 4 }}>SAT-5 {"\u2014"} ZERO USER CONTROL</div>
            <div style={{ display: "flex", gap: 12 }}>
              {SAT.map((s, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: s.col, margin: "0 auto 2px", boxShadow: `0 0 3px ${s.col}35` }} />
                  <div style={{ fontSize: 6, color: DIM }}>{s.n}</div>
                </div>
              ))}
            </div>
          </div>
        </F>
      )}

      {activationError && !done && (
        <F>
          <div style={{ textAlign: "center", maxWidth: 460, padding: 16, border: `1px solid #ef444455`, borderRadius: 6, background: "#ef44440A" }}>
            <div style={{ color: "#ef4444", fontSize: 11, fontFamily: "var(--font-cinzel), serif", letterSpacing: 3, marginBottom: 8 }}>
              ACTIVATION BLOCKED
            </div>
            <div style={{ color: "#ef4444aa", fontSize: 11, marginBottom: 12, fontFamily: "var(--font-jetbrains), monospace" }}>
              {activationError}
            </div>
            <div style={{ color: DIM, fontSize: 10, marginBottom: 12, fontFamily: "var(--font-playfair), serif", fontStyle: "italic" }}>
              Onboarding cannot proceed without a verified sovereign activation receipt.
            </div>
            <button
              onClick={() => { setActivationError(null); setBooted([]); setSat(false); setConfigLines([]); /* trigger re-run via useEffect reset */ window.location.reload() }}
              style={{ background: "transparent", border: `1px solid ${G}40`, color: G, padding: "8px 24px", borderRadius: 2, fontSize: 11, letterSpacing: 3, cursor: "pointer", fontFamily: "var(--font-jetbrains), monospace" }}
            >
              RETRY ACTIVATION
            </button>
          </div>
        </F>
      )}

      {done && !activationError && (
        <F>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: G, fontSize: 11, fontFamily: "var(--font-playfair), serif", fontStyle: "italic" }}>
              Your sovereign node is initialized, {userName}. Key custody established.
            </div>
            {nodeId && (
              <div style={{ marginTop: 8, fontSize: 9, color: DIM, fontFamily: "var(--font-jetbrains), monospace", letterSpacing: 1 }}>
                node {nodeId.slice(0, 16)}… · {agentIds.length} identities bound
              </div>
            )}
          </div>
        </F>
      )}
    </div>
  )
}
