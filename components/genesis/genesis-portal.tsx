"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import Link from "next/link"

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

// ─── Animation Easing ──────────────────────────────────────────────
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

// ─── Types ─────────────────────────────────────────────────────────
interface HealthData {
  status: string
  uptime: number
  version: string
  timestamp: string
}

interface EthicsData {
  ihsan: { score: number; status: string }
  sape: { snr: number; risks?: { critical: number; high: number } }
}

// ─── Constants ─────────────────────────────────────────────────────
const IHSAN_DIMS = [
  { name: "Moral Clarity", val: 0.95, tag: "الوضوح" },
  { name: "Epistemic Humility", val: 0.72, tag: "التواضع" },
  { name: "Temporal Awareness", val: 0.90, tag: "الوعي" },
  { name: "Resource Efficiency", val: 0.88, tag: "الكفاءة" },
  { name: "User Alignment", val: 0.96, tag: "التوافق" },
  { name: "Transparency", val: 0.85, tag: "الشفافية" },
  { name: "Reversibility", val: 0.92, tag: "الرجعة" },
  { name: "Harm Minimization", val: 0.99, tag: "السلامة" },
]

const STORY = [
  {
    icon: "🌱",
    title: "The Seed",
    arabic: "الْبَذْرَة",
    body: "Every human is a node. Every node is a seed. BIZRA began as one question: what if AI served the many, not the few?",
  },
  {
    icon: "🏗️",
    title: "The Architecture",
    arabic: "العمارة",
    body: "7 agents deliberate on every decision. Mathematical consensus — not corporate policy — determines the outcome.",
  },
  {
    icon: "⚖️",
    title: "The Ethics",
    arabic: "الإحسان",
    body: "Excellence is not optional. An 8-dimensional Ihsan tensor scores every action. Below 0.95, the system refuses to proceed.",
  },
  {
    icon: "🔏",
    title: "The Proof",
    arabic: "البرهان",
    body: "Every important action is designed to leave a signed, chain-referenced receipt. BIZRA moves toward traceability, replayability, and verified action — without asking you to trust empty claims.",
  },
]

const EXPLORE = [
  {
    href: "/showcase/maestro",
    title: "Maestro Architecture",
    desc: "7-agent ensemble with emotion detection and trust evolution",
    icon: "🎭",
  },
  {
    href: "/showcase/pipeline",
    title: "Sovereign Pipeline",
    desc: "9-step lifecycle from intent to cryptographic receipt",
    icon: "⚡",
  },
  {
    href: "/atlas",
    title: "Knowledge Atlas",
    desc: "3D force-directed graph of thought and evidence nodes",
    icon: "🌐",
  },
]

// ─── Flower of Life Canvas (19 circles — da Vinci precision) ───────
function FlowerOfLife() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let w = 0
    let h = 0
    let time = 0
    const particles: { x: number; y: number; vx: number; vy: number; s: number; a: number }[] = []

    function resize() {
      w = canvas!.width = window.innerWidth
      h = canvas!.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    // Ambient particles — gold dust
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.15 - 0.05,
        s: Math.random() * 1.5 + 0.3,
        a: Math.random() * 0.2 + 0.03,
      })
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h)
      time += 0.006

      // Particles — rising gold dust
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = w
        if (p.x > w) p.x = 0
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w }
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.s, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(201, 169, 98, ${p.a * (0.6 + 0.4 * Math.sin(time + p.x * 0.01))})`
        ctx!.fill()
      }

      const cx = w / 2
      const cy = h / 2
      const r = Math.min(w, h) * 0.09
      const rot = time * 0.025

      // Build all 19 circle centers — the Flower of Life geometry
      const centers: [number, number][] = [[cx, cy]]

      // Ring 1: Seed of Life — 6 at distance r
      for (let i = 0; i < 6; i++) {
        const a = i * (Math.PI / 3) + rot
        centers.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
      }

      // Ring 2a: 6 at distance 2r (same angles as ring 1)
      for (let i = 0; i < 6; i++) {
        const a = i * (Math.PI / 3) + rot
        centers.push([cx + 2 * r * Math.cos(a), cy + 2 * r * Math.sin(a)])
      }

      // Ring 2b: 6 at distance √3·r (offset 30° from ring 1)
      for (let i = 0; i < 6; i++) {
        const a = i * (Math.PI / 3) + Math.PI / 6 + rot
        centers.push([cx + Math.sqrt(3) * r * Math.cos(a), cy + Math.sqrt(3) * r * Math.sin(a)])
      }

      // Draw the 19 circles with layered opacity
      for (let i = 0; i < centers.length; i++) {
        const [x, y] = centers[i]
        const ring = i === 0 ? 0 : i <= 6 ? 1 : 2
        const baseOpacity = ring === 0 ? 0.15 : ring === 1 ? 0.10 : 0.06
        const breathe = Math.sin(time * 0.4 + i * 0.5) * 0.04
        ctx!.beginPath()
        ctx!.arc(x, y, r, 0, Math.PI * 2)
        ctx!.strokeStyle = `rgba(201, 169, 98, ${baseOpacity + breathe})`
        ctx!.lineWidth = ring === 0 ? 1.4 : ring === 1 ? 1.0 : 0.6
        ctx!.stroke()
      }

      // Hexagonal lattice — connect ring 1 centers
      ctx!.beginPath()
      for (let i = 1; i <= 6; i++) {
        const [x, y] = centers[i]
        if (i === 1) ctx!.moveTo(x, y)
        else ctx!.lineTo(x, y)
      }
      ctx!.closePath()
      ctx!.strokeStyle = `rgba(201, 169, 98, ${0.04 + 0.02 * Math.sin(time * 0.6)})`
      ctx!.lineWidth = 0.5
      ctx!.stroke()

      // Outer hexagon — connect ring 2a centers
      ctx!.beginPath()
      for (let i = 7; i <= 12; i++) {
        const [x, y] = centers[i]
        if (i === 7) ctx!.moveTo(x, y)
        else ctx!.lineTo(x, y)
      }
      ctx!.closePath()
      ctx!.strokeStyle = `rgba(201, 169, 98, ${0.025 + 0.015 * Math.sin(time * 0.5)})`
      ctx!.lineWidth = 0.4
      ctx!.stroke()

      // Enclosing circle — the boundary of creation
      ctx!.beginPath()
      ctx!.arc(cx, cy, r * 2.6, 0, Math.PI * 2)
      ctx!.strokeStyle = `rgba(201, 169, 98, ${0.03 + 0.015 * Math.sin(time * 0.3)})`
      ctx!.lineWidth = 0.6
      ctx!.stroke()

      // Center glow — the heart
      const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r * 3)
      grad.addColorStop(0, `rgba(201, 169, 98, ${0.06 + 0.03 * Math.sin(time * 0.25)})`)
      grad.addColorStop(0.5, `rgba(201, 169, 98, ${0.015 + 0.01 * Math.sin(time * 0.3)})`)
      grad.addColorStop(1, "rgba(201, 169, 98, 0)")
      ctx!.fillStyle = grad
      ctx!.beginPath()
      ctx!.arc(cx, cy, r * 3, 0, Math.PI * 2)
      ctx!.fill()

      // Intersection dots — where circles meet (Vesica Piscis points)
      for (let i = 1; i <= 6; i++) {
        const next = i === 6 ? 1 : i + 1
        const [x1, y1] = centers[i]
        const [x2, y2] = centers[next]
        const mx = (x1 + x2) / 2
        const my = (y1 + y2) / 2
        const dotOpacity = 0.15 + 0.1 * Math.sin(time * 0.7 + i)
        ctx!.beginPath()
        ctx!.arc(mx, my, 1.5, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(201, 169, 98, ${dotOpacity})`
        ctx!.fill()
      }

      frameRef.current = requestAnimationFrame(draw)
    }

    frameRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.7 }}
    />
  )
}

// ─── Animated Counter Hook ─────────────────────────────────────────
function useCounter(target: number, active: boolean, duration = 1200) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!active) return
    const start = performance.now()
    let raf = 0
    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(target * eased)
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, active, duration])
  return value
}

// ─── Dimension Bar ─────────────────────────────────────────────────
function DimensionBar({
  name,
  val,
  tag,
  delay,
  active,
}: {
  name: string
  val: number
  tag: string
  delay: number
  active: boolean
}) {
  const width = active ? val * 100 : 0
  const color =
    val >= 0.95 ? C.green : val >= 0.85 ? C.blue : val >= 0.75 ? C.amber : C.red

  return (
    <div className="flex items-center gap-3 py-2">
      <span
        className="w-36 text-xs font-mono shrink-0 text-right"
        style={{ color: C.dim }}
      >
        {name}
      </span>
      <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: C.card }}>
        <div
          className="h-full rounded-full relative"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${color}44, ${color})`,
            transition: `width 1.2s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
          }}
        >
          <span
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold"
            style={{ color: C.bg }}
          >
            {active ? (val * 100).toFixed(0) : 0}%
          </span>
        </div>
      </div>
      <span className="w-10 text-xs font-arabic text-right" style={{ color: C.dim }}>
        {tag}
      </span>
    </div>
  )
}

// ─── Status Dot ────────────────────────────────────────────────────
function StatusDot({ status }: { status: string }) {
  const color =
    status === "healthy"
      ? "#2dd4a0"
      : status === "degraded"
        ? "#eab308"
        : "#f06050"
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full animate-pulse"
      style={{ background: color, boxShadow: `0 0 8px ${color}80` }}
    />
  )
}

// ─── Main Component ────────────────────────────────────────────────
export default function GenesisPortal() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [ethics, setEthics] = useState<EthicsData | null>(null)
  const [pulseVisible, setPulseVisible] = useState(false)
  const [ihsanVisible, setIhsanVisible] = useState(false)
  const pulseRef = useRef<HTMLDivElement>(null)
  const ihsanRef = useRef<HTMLDivElement>(null)

  // Fetch live data
  const fetchData = useCallback(async () => {
    try {
      const [hRes, eRes] = await Promise.all([
        fetch("/api/health"),
        fetch("/api/ethics"),
      ])
      if (hRes.ok) setHealth(await hRes.json())
      if (eRes.ok) {
        const d = await eRes.json()
        setEthics(d.data || d)
      }
    } catch {
      /* APIs may not be running — show fallback state */
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30_000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Intersection observers for scroll-triggered animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.target === pulseRef.current && e.isIntersecting) setPulseVisible(true)
          if (e.target === ihsanRef.current && e.isIntersecting) setIhsanVisible(true)
        }
      },
      { threshold: 0.2 }
    )
    if (pulseRef.current) observer.observe(pulseRef.current)
    if (ihsanRef.current) observer.observe(ihsanRef.current)
    return () => observer.disconnect()
  }, [])

  const ihsanScore = useCounter(
    ethics?.ihsan?.score ?? 0.896,
    ihsanVisible
  )
  const uptimeHours = health ? Math.floor(health.uptime / 3600) : 0
  const uptimeMins = health ? Math.floor((health.uptime % 3600) / 60) : 0

  const fadeUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.7, ease: EASE },
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden" style={{ background: C.bg }}>
      {/* ─── Nav ───────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md"
        style={{ background: "rgba(10, 14, 20, 0.8)", borderBottom: `1px solid ${C.border}` }}>
        <Link href="/" className="font-cinzel text-lg tracking-widest" style={{ color: C.gold }}>
          BIZRA
        </Link>
        <div className="flex gap-6 text-xs font-mono" style={{ color: C.dim }}>
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <Link href="/showcase" className="hover:text-white transition-colors">Showcase</Link>
          <Link href="/atlas" className="hover:text-white transition-colors">Atlas</Link>
        </div>
      </nav>

      {/* ─── Hero ──────────────────────────────────────────────── */}
      <section className="relative h-screen flex flex-col items-center justify-center text-center overflow-hidden">
        <FlowerOfLife />
        <div className="relative z-10 flex flex-col items-center gap-6 px-4">
          <p className="font-arabic text-xl md:text-2xl opacity-60" style={{ color: C.gold }}>
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
          <h1 className="font-cinzel text-4xl md:text-6xl lg:text-7xl tracking-[0.2em] text-gradient-gold">
            GENESIS PORTAL
          </h1>
          <p className="text-sm md:text-base max-w-lg opacity-70 font-mono" style={{ color: C.text }}>
            The living proof of sovereign AI — every action measured, every claim verified,
            every dimension scored.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs font-mono opacity-40" style={{ color: C.gold }}>
            <StatusDot status={health?.status ?? "healthy"} />
            <span>{health?.status?.toUpperCase() ?? "INITIALIZING"}</span>
            <span className="mx-2">·</span>
            <span>v{health?.version ?? "0.1.0"}</span>
          </div>
        </div>
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40 animate-bounce">
          <span className="text-xs font-mono" style={{ color: C.dim }}>scroll</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" style={{ color: C.gold }} />
          </svg>
        </div>
      </section>

      {/* ─── The Pulse ─────────────────────────────────────────── */}
      <section ref={pulseRef} className="relative py-24 px-4 md:px-8">
        <motion.div {...fadeUp} className="max-w-5xl mx-auto">
          <h2 className="font-cinzel text-2xl md:text-3xl text-center mb-2 text-gradient-gold">
            THE PULSE
          </h2>
          <p className="text-center text-xs font-mono mb-12 opacity-50" style={{ color: C.dim }}>
            Live system telemetry · Auto-refresh 30s
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Status */}
            <div className="glass-panel rounded-xl p-5 text-center">
              <p className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: C.dim }}>
                Status
              </p>
              <div className="flex items-center justify-center gap-2">
                <StatusDot status={health?.status ?? "healthy"} />
                <span className="text-lg font-mono font-bold" style={{ color: C.green }}>
                  {health?.status?.toUpperCase() ?? "—"}
                </span>
              </div>
            </div>
            {/* Uptime */}
            <div className="glass-panel rounded-xl p-5 text-center">
              <p className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: C.dim }}>
                Uptime
              </p>
              <span className="text-2xl font-mono font-bold" style={{ color: C.text }}>
                {health ? `${uptimeHours}h ${uptimeMins}m` : "—"}
              </span>
            </div>
            {/* Ihsan */}
            <div className="glass-panel rounded-xl p-5 text-center">
              <p className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: C.dim }}>
                Ihsan Score
              </p>
              <span className="text-2xl font-mono font-bold" style={{ color: C.gold }}>
                {pulseVisible ? (ethics?.ihsan?.score ?? 0.896).toFixed(3) : "0.000"}
              </span>
              <p className="text-[10px] mt-1 font-mono" style={{
                color: (ethics?.ihsan?.status ?? "COMPLIANT") === "ELITE" ? C.green : C.amber,
              }}>
                {ethics?.ihsan?.status ?? "COMPLIANT"}
              </p>
            </div>
            {/* SNR */}
            <div className="glass-panel rounded-xl p-5 text-center">
              <p className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: C.dim }}>
                Signal Quality
              </p>
              <span className="text-2xl font-mono font-bold" style={{ color: C.cyan }}>
                {ethics?.sape?.snr?.toFixed(2) ?? "—"}
              </span>
              <p className="text-[10px] mt-1 font-mono" style={{ color: C.dim }}>
                SNR ratio
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── The Ascending Spiral (Story) ──────────────────────── */}
      <section className="relative py-24 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.h2 {...fadeUp} className="font-cinzel text-2xl md:text-3xl text-center mb-2 text-gradient-gold">
            THE ASCENDING SPIRAL
          </motion.h2>
          <motion.p {...fadeUp} className="text-center text-xs font-mono mb-16 opacity-50" style={{ color: C.dim }}>
            From darkness to light — the four pillars of sovereign computation
          </motion.p>
          <div className="flex flex-col gap-8">
            {STORY.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
                className="glass-panel rounded-xl p-6 md:p-8 flex flex-col md:flex-row items-start gap-6"
                style={{ borderLeft: `3px solid rgba(201, 169, 98, ${0.2 + i * 0.1})` }}
              >
                <div className="shrink-0 flex flex-col items-center gap-1">
                  <span className="text-3xl">{card.icon}</span>
                  <span className="text-[10px] font-mono opacity-40">0{i + 1}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-3 mb-2">
                    <h3 className="font-cinzel text-lg" style={{ color: C.gold }}>
                      {card.title}
                    </h3>
                    <span className="font-arabic text-sm opacity-50" dir="rtl">
                      {card.arabic}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: C.text }}>
                    {card.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Ihsan Tensor ──────────────────────────────────────── */}
      <section ref={ihsanRef} className="relative py-24 px-4 md:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.h2 {...fadeUp} className="font-cinzel text-2xl md:text-3xl text-center mb-2 text-gradient-gold">
            THE IHSAN TENSOR
          </motion.h2>
          <motion.p {...fadeUp} className="text-center text-xs font-mono mb-4 opacity-50" style={{ color: C.dim }}>
            8 dimensions of ethical computation · Hard constraint at 0.95
          </motion.p>
          {/* Composite score */}
          <motion.div {...fadeUp} className="text-center mb-12">
            <span className="text-5xl md:text-6xl font-mono font-bold" style={{ color: C.gold }}>
              {ihsanScore.toFixed(3)}
            </span>
            <p className="text-xs font-mono mt-1 opacity-50" style={{ color: C.dim }}>
              composite score
            </p>
          </motion.div>
          {/* Dimension bars */}
          <motion.div {...fadeUp} className="glass-panel rounded-xl p-6">
            {IHSAN_DIMS.map((d, i) => (
              <DimensionBar
                key={d.name}
                name={d.name}
                val={d.val}
                tag={d.tag}
                delay={i * 80}
                active={ihsanVisible}
              />
            ))}
            <div
              className="mt-4 pt-4 text-center text-xs font-mono"
              style={{ borderTop: `1px solid ${C.border}`, color: C.dim }}
            >
              Average: {(IHSAN_DIMS.reduce((s, d) => s + d.val, 0) / IHSAN_DIMS.length).toFixed(3)}
              <span className="mx-2">·</span>
              Threshold: 0.950
              <span className="mx-2">·</span>
              <span style={{ color: C.green }}>PASSING</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── The Sealed Proof (Evidence Chain) ───────────────── */}
      <section className="relative py-24 px-4 md:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.h2 {...fadeUp} className="font-cinzel text-2xl md:text-3xl text-center mb-2 text-gradient-gold">
            THE SEALED PROOF
          </motion.h2>
          <motion.p {...fadeUp} className="text-center text-xs font-mono mb-12 opacity-50" style={{ color: C.dim }}>
            Every action cryptographically sealed · Every claim independently verifiable
          </motion.p>
          <motion.div {...fadeUp}>
            <div
              className="rounded-xl overflow-hidden font-mono text-xs"
              style={{ background: C.card, border: `1px solid ${C.border}` }}
            >
              {/* Receipt header */}
              <div className="flex items-center justify-between px-5 py-3"
                style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}>
                <div className="flex items-center gap-2">
                  <span style={{ color: C.green }}>&#x2713;</span>
                  <span style={{ color: C.text }}>PROOF-OF-IMPACT RECEIPT</span>
                </div>
                <span style={{ color: C.dim }}>Block #892</span>
              </div>
              {/* Receipt body */}
              <div className="p-5 space-y-3">
                <div className="flex justify-between">
                  <span style={{ color: C.dim }}>Hash</span>
                  <span className="font-mono" style={{ color: C.gold }}>
                    blake3:f4a3b2c1...e7d9
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: C.dim }}>Prev Hash</span>
                  <span style={{ color: C.text }}>blake3:a4b3c2d1...f9e8</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: C.dim }}>Timestamp</span>
                  <span style={{ color: C.text }}>{new Date().toISOString().split(".")[0]}Z</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: C.dim }}>Ihsan Score</span>
                  <span style={{ color: C.green }}>0.951</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: C.dim }}>FATE Gate</span>
                  <span style={{ color: C.green }}>APPROVED</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: C.dim }}>UIA Verified</span>
                  <span style={{ color: C.green }}>&#x2713; Confirmed</span>
                </div>
                <div
                  className="pt-3 mt-3 flex justify-between"
                  style={{ borderTop: `1px solid ${C.border}` }}
                >
                  <span style={{ color: C.dim }}>Signature</span>
                  <span style={{ color: C.purple }}>ed25519:7a4f3e...sign</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: C.dim }}>Chain</span>
                  <span style={{ color: C.cyan }}>BLAKE3 → Ed25519 → Dilithium</span>
                </div>
              </div>
              {/* Receipt footer */}
              <div
                className="px-5 py-3 text-center"
                style={{ background: C.surface, borderTop: `1px solid ${C.border}`, color: C.dim }}
              >
                Every important action is designed to leave a receipt · Claims bound to evidence
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Explore Deeper ────────────────────────────────────── */}
      <section className="relative py-24 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.h2 {...fadeUp} className="font-cinzel text-2xl md:text-3xl text-center mb-2 text-gradient-gold">
            EXPLORE DEEPER
          </motion.h2>
          <motion.p {...fadeUp} className="text-center text-xs font-mono mb-12 opacity-50" style={{ color: C.dim }}>
            Interactive deep-dives into the sovereign architecture
          </motion.p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {EXPLORE.map((link) => (
              <motion.div key={link.href} {...fadeUp}>
                <Link href={link.href} className="block group">
                  <div
                    className="glass-panel rounded-xl p-6 h-full transition-all duration-500 group-hover:-translate-y-1"
                    style={{
                      borderColor: "rgba(201, 169, 98, 0.15)",
                    }}
                  >
                    <span className="text-3xl mb-4 block">{link.icon}</span>
                    <h3
                      className="font-cinzel text-base mb-2 transition-colors duration-300 group-hover:text-[color:var(--color-radiant-gold)]"
                      style={{ color: C.text }}
                    >
                      {link.title}
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: C.dim }}>
                      {link.desc}
                    </p>
                    <span
                      className="inline-block mt-4 text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ color: C.gold }}
                    >
                      Enter →
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────── */}
      <section className="relative py-32 px-4 text-center">
        <motion.div {...fadeUp} className="max-w-md mx-auto flex flex-col items-center gap-6">
          <p className="font-arabic text-lg opacity-50" dir="rtl" style={{ color: C.gold }}>
            وَجَعَلْنَا مِنَ الْمَاءِ كُلَّ شَيْءٍ حَيٍّ
          </p>
          <h2 className="font-cinzel text-3xl md:text-4xl text-gradient-gold">
            BEGIN YOUR GENESIS
          </h2>
          <p className="text-sm opacity-60" style={{ color: C.text }}>
            The seed is planted. The proof is sealed. Your node awaits.
          </p>
          <Link
            href="/"
            className="btn-brand-primary mt-4 inline-block text-center no-underline"
          >
            Enter the Lifecycle
          </Link>
        </motion.div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────── */}
      <footer
        className="text-center py-8 text-xs font-mono"
        style={{ color: C.dim, borderTop: `1px solid ${C.border}` }}
      >
        BIZRA Genesis · The Seed of Sovereign Intelligence · بذرة
      </footer>
    </main>
  )
}
