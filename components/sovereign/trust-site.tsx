"use client"

import { useState, useEffect, useRef, type ReactNode } from "react"
import { useLifecycleStore } from "@/store/use-lifecycle-store"
import { G, G2, G3, BG, GR, BL, CY, PU, YL, RS, TXT, MUT, DIM, DIMR, LINE } from "./design-tokens"

function F({ children, d = 0, s = {} }: { children: ReactNode; d?: number; s?: React.CSSProperties }) {
  const [v, setV] = useState(false)
  useEffect(() => { const t = setTimeout(() => setV(true), d); return () => clearTimeout(t) }, [d])
  return (
    <div style={{ opacity: v ? 1 : 0, transform: v ? "translateY(0)" : "translateY(10px)", transition: "all .6s ease", ...s }}>
      {children}
    </div>
  )
}

import { LiveNetworkStats } from "./live-network-stats"

export function TrustSite() {
  const setPhase = useLifecycleStore(s => s.setPhase)
  const [hov, setHov] = useState(false)
  const [sy, setSy] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    const h = () => setSy(el?.scrollTop || 0)
    el?.addEventListener("scroll", h)
    return () => el?.removeEventListener("scroll", h)
  }, [])

  const onEnter = () => setPhase("SEED_TEST")
  const showStats = true

  const layers = [
    { n: "Human Seed", c: "\u0627\u0644\u0631\u0633\u0627\u0644\u0629 + \u0627\u0644\u0628\u0630\u0631\u0629", t: "\u2014", col: G },
    { n: "Sovereign Node", c: "12 agents (Ed25519)", t: "654 commits", col: BL },
    { n: "Mission Pipeline", c: "10 stages", t: "12,680 tests", col: GR },
    { n: "Verification", c: "Z3 + BLAKE3", t: "18 proofs", col: YL },
    { n: "Learning", c: "FAISS + reflexes", t: "84,795 vectors", col: CY },
    { n: "Economic", c: "SEED + Zakat + Gini", t: "22 SEED", col: PU },
    { n: "URP Membrane", c: "Node→URP→Sea", t: "4 properties", col: RS },
  ]

  return (
    <div ref={ref} style={{ height: "100vh", overflow: "auto", background: BG, color: TXT, fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      {/* Sticky nav */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 32px",
        background: sy > 50 ? "rgba(3,8,16,.92)" : "transparent", backdropFilter: sy > 50 ? "blur(20px)" : "none",
        borderBottom: sy > 50 ? `1px solid ${LINE}` : "none", transition: "all .4s"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "var(--font-cinzel), serif", color: G, fontSize: 14, fontWeight: 600, letterSpacing: 4 }}>BIZRA</span>
          <span style={{ fontFamily: "var(--font-jetbrains), monospace", fontSize: 8, color: DIMR, letterSpacing: 3 }}>DDAGI OS</span>
        </div>
        <button onClick={onEnter} style={{
          background: `${G}12`, border: `1px solid ${G}40`, color: G, padding: "8px 20px", borderRadius: 4, fontSize: 11,
          fontFamily: "var(--font-jetbrains), monospace", letterSpacing: 2, cursor: "pointer"
        }}>INITIALIZE NODE</button>
      </div>

      {/* Hero */}
      <div style={{
        position: "relative", padding: "100px 48px 80px",
        background: `radial-gradient(circle at 15% 15%,rgba(201,169,98,.1),transparent 35%),radial-gradient(circle at 85% 20%,rgba(59,130,246,.08),transparent 30%),linear-gradient(180deg,#07111d,${BG})`
      }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)",
          backgroundSize: "42px 42px", maskImage: "linear-gradient(180deg,rgba(0,0,0,.6),transparent)"
        }} />
        <div style={{ position: "relative", maxWidth: 1100, margin: "0 auto" }}>
          <F d={200}><div style={{ fontFamily: "var(--font-jetbrains), monospace", fontSize: 11, color: G, letterSpacing: 3 }}>DISTRIBUTED DECENTRALIZED AGI OPERATING SYSTEM</div></F>
          <F d={500}><h1 style={{ fontFamily: "var(--font-playfair), serif", fontSize: 56, lineHeight: 0.96, margin: "20px 0", maxWidth: 800, fontWeight: 700 }}>From human need<br />to sovereign intelligence.</h1></F>
          <F d={800}><p style={{ color: MUT, fontSize: 17, maxWidth: 700, lineHeight: 1.7, margin: 0 }}>BIZRA turns every human into a sovereign node, every node into a living seed, and every verified act of growth into shared intelligence, capability, and value.</p></F>
          <F d={1100}>
            <button onClick={onEnter} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
              style={{
                marginTop: 32, background: hov ? G : "transparent", color: hov ? BG : G, border: `1.5px solid ${G}`,
                padding: "14px 36px", borderRadius: 6, fontSize: 12, fontFamily: "var(--font-jetbrains), monospace",
                letterSpacing: 3, cursor: "pointer", transition: "all .3s"
              }}>BEGIN YOUR JOURNEY</button>
          </F>
          <F d={1400}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginTop: 48 }}>
              {[{ v: "8,237", l: "Tests Passing" }, { v: "22", l: "Rust Crates" }, { v: "31+", l: "Days Live" }, { v: "0.95+", l: "Ihsan Floor" }].map((k, i) => (
                <div key={i} style={{ padding: "16px 18px", borderRadius: 16, background: "rgba(255,255,255,.025)", border: `1px solid ${LINE}`, backdropFilter: "blur(12px)" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, color: G2 }}>{k.v}</div>
                  <div style={{ fontSize: 11, color: DIM, letterSpacing: 1.2, textTransform: "uppercase", marginTop: 4 }}>{k.l}</div>
                </div>
              ))}
            </div>
          </F>
        </div>
      </div>

      {/* Body content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 48px" }}>
        {/* Bismillah quote */}
        <div style={{ borderLeft: `3px solid ${G}`, padding: "20px 24px", background: `${G}0A`, borderRadius: "0 16px 16px 0", marginBottom: 48 }}>
          <div style={{ fontFamily: "var(--font-amiri), serif", fontSize: 16, color: `${G}60`, direction: "rtl", marginBottom: 8 }}>{"\u0628\u0633\u0645 \u0627\u0644\u0644\u0647 \u0627\u0644\u0631\u062D\u0645\u0646 \u0627\u0644\u0631\u062D\u064A\u0645"}</div>
          <div style={{ fontSize: 18, lineHeight: 1.6 }}>&quot;Every human is a node, and every node is a seed, and every seed has infinite potential.&quot;</div>
          <div style={{ fontSize: 12, color: DIM, marginTop: 8, fontFamily: "var(--font-jetbrains), monospace" }}>{"\u2014 \u0627\u0644\u0628\u0630\u0631\u0629, Ramadan 2023"}</div>
        </div>

        {/* Five invariants */}
        <div style={{ fontFamily: "var(--font-jetbrains), monospace", fontSize: 10, color: G, letterSpacing: 3, marginBottom: 8 }}>FIVE NON-NEGOTIABLE INVARIANTS</div>
        <h2 style={{ fontFamily: "var(--font-playfair), serif", fontSize: 32, margin: "0 0 24px" }}>Machine-enforced. No exceptions.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 48 }}>
          {[
            { id: "I-1", n: "Excellence", v: "Ihsan \u2265 0.95", c: G },
            { id: "I-2", n: "Signal", v: "SNR \u2265 0.85", c: BL },
            { id: "I-3", n: "Justice", v: "Gini \u2264 0.35", c: GR },
            { id: "I-4", n: "Sovereignty", v: "Keys LOCAL", c: PU },
            { id: "I-5", n: "Proof", v: "Hash-chained", c: CY },
          ].map((v, i) => (
            <div key={i} style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,.025)", border: `1px solid ${LINE}` }}>
              <div style={{ fontFamily: "var(--font-jetbrains), monospace", fontSize: 9, color: v.c, letterSpacing: 2, marginBottom: 8 }}>{v.id}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{v.n}</div>
              <div style={{ fontSize: 11, color: MUT, fontFamily: "var(--font-jetbrains), monospace" }}>{v.v}</div>
            </div>
          ))}
        </div>

        {/* Seven-layer stack */}
        <div style={{ fontFamily: "var(--font-jetbrains), monospace", fontSize: 10, color: G, letterSpacing: 3, marginBottom: 8 }}>SEVEN-LAYER DDAGI STACK</div>
        <h2 style={{ fontFamily: "var(--font-playfair), serif", fontSize: 32, margin: "0 0 24px" }}>Every layer has code. Every layer has tests.</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 48 }}>
          {layers.map((l, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "32px 1fr 200px 80px", gap: 16, alignItems: "center",
              padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: `1px solid ${LINE}`
            }}>
              <div style={{ fontFamily: "var(--font-jetbrains), monospace", fontSize: 10, color: l.col, fontWeight: 600 }}>L{i}</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{l.n}</div>
              <div style={{ fontFamily: "var(--font-jetbrains), monospace", fontSize: 10, color: DIM }}>{l.c}</div>
              <div style={{ fontFamily: "var(--font-jetbrains), monospace", fontSize: 10, color: GR, textAlign: "right" }}>{l.t}</div>
            </div>
          ))}
        </div>

        {/* Live Stats */}
      <LiveNetworkStats />

      {/* CTA */}
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <div style={{ fontFamily: "var(--font-amiri), serif", fontSize: 20, color: `${G}50`, direction: "rtl", marginBottom: 16 }}>{"\u0643\u0644 \u0628\u0630\u0631\u0629 \u062A\u062D\u0645\u0644 \u0641\u064A \u062F\u0627\u062E\u0644\u0647\u0627 \u0645\u062E\u0637\u0637 \u063A\u0627\u0628\u0629 \u0628\u0623\u0643\u0645\u0644\u0647\u0627"}</div>
          <button onClick={onEnter} style={{
            background: G, color: BG, border: "none", padding: "16px 48px", borderRadius: 6, fontSize: 13,
            fontFamily: "var(--font-jetbrains), monospace", letterSpacing: 3, cursor: "pointer", fontWeight: 600
          }}>BECOME A NODE</button>
          <div style={{ marginTop: 12, fontSize: 11, color: DIM }}>Zero cloud. Zero cost. Your keys. Your sovereignty.</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${LINE}`, padding: "24px 48px", display: "flex", justifyContent: "space-between", fontSize: 11, color: DIM }}>
        <span style={{ fontFamily: "var(--font-cinzel), serif", letterSpacing: 3, color: G3 }}>BIZRA</span>
        <span style={{ fontFamily: "var(--font-amiri), serif" }}>{"\u0628\u0633\u0645 \u0627\u0644\u0644\u0647 \u0627\u0644\u0631\u062D\u0645\u0646 \u0627\u0644\u0631\u062D\u064A\u0645 \u00B7 Dubai"}</span>
        <span style={{ fontFamily: "var(--font-jetbrains), monospace" }}>v0.3.0-GENESIS</span>
      </div>
    </div>
  )
}
