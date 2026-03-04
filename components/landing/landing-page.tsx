"use client"

import { useEffect, useRef, useState } from "react"
import { useLifecycleStore } from "@/store/use-lifecycle-store"
import { Sparkles, ArrowRight, ShieldCheck, Heart, Leaf, Star, ChevronDown, Monitor, Mail, ExternalLink } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

// GSAP and Chart.js are lazy-loaded in useEffect hooks to reduce initial bundle (~300KB)
let _gsap: Promise<{ gsap: typeof import("gsap").default; ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger }> | null = null
function loadGsap() {
  if (!_gsap) {
    _gsap = Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([{ default: gsap }, { ScrollTrigger }]) => {
        gsap.registerPlugin(ScrollTrigger)
        return { gsap, ScrollTrigger }
      },
    )
  }
  return _gsap
}

let _chart: Promise<typeof import("chart.js").Chart> | null = null
function loadChart() {
  if (!_chart) {
    _chart = import("chart.js").then(({ Chart, registerables }) => {
      Chart.register(...registerables)
      return Chart
    })
  }
  return _chart
}

// ============================================
// SOVEREIGN LANDING PAGE
// High-fidelity design upgrade based on 
// "The Sovereign Future" aesthetic.
// ============================================

export function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeSlide, setActiveSlide] = useState(0)
  const setPhase = useLifecycleStore((s) => s.setPhase)

  const handleBegin = () => {
    setPhase("SEED_TEST")
  }

  return (
    <div ref={containerRef} className="relative z-10 font-sans selection:bg-radiant-gold selection:text-celestial-navy bg-dark overflow-x-hidden">
      <SacredGeometry />
      <div className="fixed inset-0 bg-noise opacity-30 z-[1] pointer-events-none" />
      <ProgressBar />

      <Navigation />
      <SideDots activeSlide={activeSlide} setActiveSlide={setActiveSlide} />

      <main className="relative z-10">
        <section id="slide-0" className="h-screen w-full flex items-center justify-center relative section-slide">
          <GenesisSlide onBegin={handleBegin} />
          <ScrollIndicator />
        </section>

        <section id="slide-1" className="min-h-screen w-full flex items-center justify-center relative section-slide py-20">
          <StruggleSlide />
        </section>

        <section id="slide-2" className="min-h-screen w-full flex items-center justify-center relative section-slide bg-celestial-navy">
          <CrisisSlide />
        </section>

        <section id="slide-3" className="min-h-screen w-full flex items-center justify-center relative section-slide">
          <ArchitectureSlide />
        </section>

        <section id="slide-4" className="min-h-screen w-full flex items-center justify-center relative section-slide bg-dark">
          <EthicsSlide />
        </section>

        <section id="slide-5" className="min-h-screen w-full flex items-center justify-center relative section-slide">
          <EvidenceSlide />
        </section>

        <section id="slide-6" className="h-screen w-full flex items-center justify-center relative section-slide bg-gradient-to-b from-celestial-navy to-black">
          <JoinSlide onBegin={handleBegin} />
        </section>
      </main>
    </div>
  )
}

// --- SUB-COMPONENTS ---

function Navigation() {
  return (
    <nav className="fixed top-0 w-full z-50 px-8 py-6 flex justify-between items-center mix-blend-difference">
      <div className="text-xl font-accent font-bold tracking-[0.2em] text-radiant-gold">BIZRA</div>
      <div className="hidden md:flex gap-8 text-xs uppercase tracking-widest text-pure-white/70">
        <span className="cursor-pointer hover:text-radiant-gold transition-colors" onClick={() => document.getElementById('slide-0')?.scrollIntoView({ behavior: 'smooth' })}>Genesis</span>
        <span className="cursor-pointer hover:text-radiant-gold transition-colors" onClick={() => document.getElementById('slide-1')?.scrollIntoView({ behavior: 'smooth' })}>Struggle</span>
        <span className="cursor-pointer hover:text-radiant-gold transition-colors" onClick={() => document.getElementById('slide-3')?.scrollIntoView({ behavior: 'smooth' })}>Architecture</span>
        <span className="cursor-pointer hover:text-radiant-gold transition-colors" onClick={() => document.getElementById('slide-5')?.scrollIntoView({ behavior: 'smooth' })}>Evidence</span>
      </div>
      <a href="mailto:m.beshr@bizra.info" className="text-xs border border-radiant-gold/50 px-6 py-2 rounded-full text-radiant-gold hover:bg-radiant-gold hover:text-celestial-navy transition-all duration-300">
        INVEST
      </a>
    </nav>
  )
}

function ProgressBar() {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    loadGsap().then(({ gsap }) => {
      if (cancelled || !barRef.current) return
      gsap.to(barRef.current, {
        width: "100%",
        ease: "none",
        scrollTrigger: {
          trigger: "body",
          start: "top top",
          end: "bottom bottom",
          scrub: 0
        }
      })
    })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="fixed top-0 left-0 w-full h-1 z-[100] bg-celestial-navy">
      <div ref={barRef} className="h-full bg-radiant-gold w-0" />
    </div>
  )
}

function SideDots({ activeSlide, setActiveSlide }: { activeSlide: number, setActiveSlide: (i: number) => void }) {
  const dots = [0, 1, 2, 3, 4, 5, 6]

  useEffect(() => {
    let cancelled = false
    loadGsap().then(({ ScrollTrigger }) => {
      if (cancelled) return
      const slides = document.querySelectorAll('.section-slide')
      slides.forEach((slide, i) => {
        ScrollTrigger.create({
          trigger: slide,
          start: "top center",
          end: "bottom center",
          onEnter: () => setActiveSlide(i),
          onEnterBack: () => setActiveSlide(i)
        })
      })
    })
    return () => { cancelled = true }
  }, [setActiveSlide])

  return (
    <div className="fixed right-8 top-1/2 -translate-y-1/2 z-40 hidden md:block">
      {dots.map(i => (
        <div
          key={i}
          className={`nav-dot ${activeSlide === i ? 'active' : ''}`}
          onClick={() => document.getElementById(`slide-${i}`)?.scrollIntoView({ behavior: 'smooth' })}
        />
      ))}
    </div>
  )
}

function ScrollIndicator() {
  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50 animate-bounce cursor-pointer"
      onClick={() => document.getElementById('slide-1')?.scrollIntoView({ behavior: 'smooth' })}>
      <span className="text-[10px] uppercase tracking-widest text-pure-white">Begin Journey</span>
      <ChevronDown className="w-5 h-5 text-radiant-gold" />
    </div>
  )
}

function GenesisSlide({ onBegin }: { onBegin: () => void }) {
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let ctx: ReturnType<typeof import("gsap").default.context> | undefined
    loadGsap().then(({ gsap }) => {
      ctx = gsap.context(() => {
        gsap.from(".fade-in-up", {
          y: 40,
          opacity: 0,
          duration: 1,
          stagger: 0.2,
          ease: "power3.out"
        })
      }, sectionRef)
    })
    return () => { ctx?.revert() }
  }, [])

  return (
    <div ref={sectionRef} className="text-center px-6">
      <div className="font-arabic text-radiant-gold/60 text-3xl mb-4 opacity-1 fade-in-up">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
      <h1 className="text-7xl md:text-9xl font-serif font-bold mb-2 opacity-1 fade-in-up text-gradient">BIZRA</h1>
      <div className="text-2xl md:text-3xl font-arabic text-radiant-gold mb-8 opacity-1 fade-in-up">البذرة</div>
      <p className="text-pure-white/60 max-w-xl mx-auto text-lg leading-relaxed opacity-1 fade-in-up">
        From darkness comes light.<br />From a single seed grows a civilization.
      </p>
      <div className="mt-8 opacity-1 fade-in-up">
        <button
          onClick={onBegin}
          className="px-8 py-3 bg-radiant-gold text-celestial-navy font-bold rounded-full hover:scale-105 transition-transform shadow-lg shadow-radiant-gold/20"
        >
          START GENESIS
        </button>
      </div>
      <div className="mt-12 opacity-1 fade-in-up">
        <span className="text-xs uppercase tracking-[0.3em] text-accent-teal border-b border-accent-teal pb-1">The Genesis Node</span>
      </div>
    </div>
  )
}

function StruggleSlide() {
  const counterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!counterRef.current) return
    let cancelled = false
    const target = 15000
    loadGsap().then(({ gsap, ScrollTrigger }) => {
      if (cancelled || !counterRef.current) return
      ScrollTrigger.create({
        trigger: counterRef.current,
        start: "top 80%",
        onEnter: () => {
          gsap.to(counterRef.current, {
            innerText: target,
            duration: 3,
            snap: { innerText: 1 },
            onUpdate: function () {
              if (counterRef.current) {
                counterRef.current.innerText = Math.ceil(Number(counterRef.current.innerText)).toLocaleString()
              }
            }
          })
        },
        once: true
      })
    })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="container mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
      <div className="order-2 md:order-1">
        <div className="glass-panel p-10 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-radiant-gold" />
          <h3 className="text-radiant-gold text-sm tracking-widest uppercase mb-4">The Price Paid</h3>
          <div ref={counterRef} className="text-6xl font-serif font-bold text-pure-white mb-2">0</div>
          <div className="text-xl text-pure-white/50 mb-8">Hours of Solitary Engineering</div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border border-pure-white/10 flex items-center justify-center text-radiant-gold">3</div>
              <div>
                <div className="text-pure-white font-bold">Years of Focus</div>
                <div className="text-xs text-pure-white/40">Away from family, dedicated to the code</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border border-pure-white/10 flex items-center justify-center text-radiant-gold">1</div>
              <div>
                <div className="text-pure-white font-bold">Sovereign Architect</div>
                <div className="text-xs text-pure-white/40">MoMo: Solo Developer to Systems Architect</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="order-1 md:order-2">
        <h2 className="text-4xl md:text-6xl font-serif leading-tight mb-8">
          \"I chose to <span className="text-radiant-gold italic">continue</span> when others would retreat.\"
        </h2>
        <p className="text-lg text-pure-white/70 leading-relaxed mb-6">
          In a dark, empty space inside myself, I made a promise. To build a system not for profit, but for humanity. To verify truth in an age of AI hallucination. To build a financial system free of usury.
        </p>
        <p className="text-lg text-pure-white/70 leading-relaxed">
          This is not just software. This is a life's work manifested in code.
        </p>
      </div>
    </div>
  )
}

function CrisisSlide() {
  return (
    <div className="container mx-auto px-6 py-20">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-cinzel mb-4">The Digital Leviathan</h2>
        <p className="text-pure-white/50">Why the world needs a Sovereign Operating System</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <CrisisCard
          icon="👁️"
          title="Centralized Control"
          desc="90% of global compute is held by 5 entities. Intelligence is rented, not owned. You are a tenant in your own digital life."
        />
        <CrisisCard
          icon="🕸️"
          title="The Hallucination"
          titleColor="text-radiant-gold"
          borderColor="border-radiant-gold/30 border"
          desc="AI models speak with confidence but lack verification. Without a 'Third Fact' (Proof), truth becomes subjective and manipulatable."
        />
        <CrisisCard
          icon="💸"
          title="Extractive Finance"
          desc="The Riba-based economy extracts value from the many to the few. We need a system based on Proof of Impact, not Proof of Stake."
        />
      </div>
    </div>
  )
}

function CrisisCard({ icon, title, desc, titleColor = "text-pure-white", borderColor = "" }: any) {
  return (
    <div className={`glass-panel p-8 rounded-xl hover:translate-y-[-10px] transition-transform duration-500 ${borderColor}`}>
      <div className="text-4xl mb-6">{icon}</div>
      <h3 className={`text-xl font-bold mb-4 ${titleColor}`}>{title}</h3>
      <p className="text-pure-white/60 text-sm leading-relaxed">{desc}</p>
    </div>
  )
}

function ArchitectureSlide() {
  return (
    <div className="container mx-auto px-6 py-20">
      <div className="grid md:grid-cols-12 gap-12 items-center">
        <div className="md:col-span-4">
          <div className="text-radiant-gold text-xs tracking-[0.3em] uppercase mb-4">The Masterpiece</div>
          <h2 className="text-5xl font-cinzel mb-8">BIZRA<br />AEON OMEGA</h2>
          <p className="text-pure-white/70 mb-8">
            A decentralized, distributed, agentic general intelligence (DDAGI). A sovereign operating system for 8 billion humans.
          </p>
          <ul className="space-y-4 text-sm text-pure-white/60">
            <li className="flex items-center gap-3"><span className="w-2 h-2 bg-accent-teal rounded-full" />Node0 Genesis Protocol</li>
            <li className="flex items-center gap-3"><span className="w-2 h-2 bg-accent-teal rounded-full" />PAT/SAT Dual-Agent Architecture</li>
            <li className="flex items-center gap-3"><span className="w-2 h-2 bg-accent-teal rounded-full" />Z3 Formal Verification (Cold Core)</li>
            <li className="flex items-center gap-3"><span className="w-2 h-2 bg-accent-teal rounded-full" />Proof-of-Impact Consensus</li>
          </ul>
        </div>
        <div className="md:col-span-8">
          <div className="glass-panel p-2 rounded-xl relative aspect-video flex items-center justify-center overflow-hidden">
            <ArchitectureGraph />

            <div className="absolute top-6 left-6">
              <div className="text-xs text-pure-white/40 uppercase">Architecture Score</div>
              <div className="text-3xl text-radiant-gold font-cinzel">100/100</div>
            </div>
            <div className="absolute bottom-6 right-6 text-right">
              <div className="text-xs text-pure-white/40 uppercase">Status</div>
              <div className="text-accent-teal font-mono">PRODUCTION READY</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ArchitectureGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    const nodes: any[] = []
    const nodeCount = 20

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    window.addEventListener('resize', resize)
    resize()

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 1,
        vy: (Math.random() - 0.5) * 1,
        radius: Math.random() * 2 + 1
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.15)'
      ctx.fillStyle = 'rgba(212, 175, 55, 0.5)'

      nodes.forEach((node, i) => {
        node.x += node.vx
        node.y += node.vy

        if (node.x < 0 || node.x > canvas.width) node.vx *= -1
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1

        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
        ctx.fill()

        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j]
          const dx = node.x - other.x
          const dy = node.y - other.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 150) {
            ctx.beginPath()
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(other.x, other.y)
            ctx.stroke()
          }
        }
      })

      animationFrameId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return <canvas ref={canvasRef} className="w-full h-full opacity-40" />
}

function EthicsSlide() {
  return (
    <div className="container mx-auto px-6 py-20 relative z-10">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-radiant-gold/5 to-transparent pointer-events-none" />

      <div className="text-center mb-16">
        <div className="font-arabic text-4xl text-radiant-gold mb-2">الإحسان</div>
        <h2 className="text-4xl md:text-5xl font-cinzel">The Ihsan Protocol</h2>
        <p className="text-pure-white/50 mt-4">Ethics as Physics. Hard mathematical constraints.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="text-center">
          <GaugeChart value={96} label="Truthfulness" subtext="Zero Hallucination" color="#f8f6f1" />
        </div>
        <div className="text-center">
          <GaugeChart value={100} label="Excellence" subtext="Professional Elite Standard" color="#d4af37" highlighted />
        </div>
        <div className="text-center">
          <GaugeChart value={98} label="Benevolence" subtext="Social Impact" color="#2a9d8f" />
        </div>
      </div>

      <div className="mt-16 text-center max-w-2xl mx-auto glass-panel p-6 rounded-lg border-l-4 border-radiant-gold">
        <p className="font-serif italic text-lg text-pure-white/90">\"We do not trust. We verify. If the Ihsan Score drops below 95%, the system halts. Ethics are not guidelines; they are code.\"</p>
      </div>
    </div>
  )
}

function GaugeChart({ value, label, subtext, color, highlighted = false }: any) {
  const chartRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!chartRef.current) return
    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return

    let chart: InstanceType<typeof import("chart.js").Chart> | undefined
    loadChart().then((Chart) => {
      chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [value, 100 - value],
            backgroundColor: [color, 'rgba(255,255,255,0.05)'],
            borderWidth: 0,
          }]
        },
        options: {
          cutout: '85%',
          circumference: 180,
          rotation: 270,
          responsive: true,
          plugins: { tooltip: { enabled: false }, legend: { display: false } }
        }
      })
    })

    return () => { chart?.destroy() }
  }, [value, color])

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${highlighted ? 'w-48 h-48' : 'w-40 h-40'} mb-6`}>
        <canvas ref={chartRef} />
        <div className={`absolute inset-0 flex items-center justify-center font-bold ${highlighted ? 'text-2xl text-radiant-gold' : 'text-xl text-pure-white'}`}>
          {value}%
        </div>
      </div>
      <h3 className={`${highlighted ? 'text-2xl text-radiant-gold' : 'text-xl text-pure-white'} font-cinzel`}>{label}</h3>
      <p className={`text-xs mt-2 ${highlighted ? 'text-radiant-gold/60' : 'text-pure-white/40'}`}>{subtext}</p>
    </div>
  )
}

function EvidenceSlide() {
  return (
    <div className="container mx-auto px-6 py-20">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-4xl md:text-5xl font-cinzel mb-6">Verification is Truth</h2>
          <p className="text-lg text-pure-white/70 mb-8">
            We don't ask you to believe. We ask you to audit. The entire 3-year history, the code, the intent—sealed cryptographically on the blockchain.
          </p>

          <div className="space-y-4">
            <EvidenceItem
              icon={<ShieldCheck className="w-6 h-6" />}
              title="Genesis Seal"
              subtitle="SHA256: 9f3d8a7c... (Bitcoin Anchored)"
              color="bg-accent-teal/20 text-accent-teal"
            />
            <EvidenceItem
              icon={<Monitor className="w-6 h-6" />}
              title="Sovereign Audit Report"
              subtitle="SAPE Framework: 9.3/10 Score"
              color="bg-radiant-gold/20 text-radiant-gold"
            />
          </div>
        </div>
        <div className="glass-panel p-1 rounded-xl overflow-hidden shadow-2xl">
          <TerminalOutput />
        </div>
      </div>
    </div>
  )
}

function EvidenceItem({ icon, title, subtitle, color }: any) {
  return (
    <div className="flex items-center gap-4 p-4 glass-panel rounded-lg hover:bg-pure-white/5 transition-colors cursor-pointer group">
      <div className={`${color} p-3 rounded-lg transition-transform group-hover:scale-110`}>{icon}</div>
      <div>
        <div className="font-bold text-pure-white">{title}</div>
        <div className="text-xs font-mono text-pure-white/40">{subtitle}</div>
      </div>
    </div>
  )
}

function TerminalOutput() {
  const [output, setOutput] = useState<string[]>([])
  const fullOutput = [
    "➜ bizra-node0 verify --deep",
    "[INIT] Loading Genesis Manifest...",
    "[HASH] Verifying 15,432 artifacts...",
    "[PASS] Integrity Check: OK (100%)",
    "[AUTH] Verifying Ed25519 Signatures...",
    "[PASS] Architect Identity: Momo (Verified)",
    "[IHSAN] Running Ethical Invariant Checks...",
    "[PASS] Gini Coefficient <= 0.35",
    "[PASS] Truthfulness >= 0.95",
    "",
    ">>> SYSTEM STATE: SOVEREIGN & SECURE",
    ">>> READY FOR DEPLOYMENT"
  ]

  useEffect(() => {
    let currentLine = 0
    const interval = setInterval(() => {
      if (currentLine < fullOutput.length) {
        setOutput(prev => [...prev, fullOutput[currentLine]])
        currentLine++
      } else {
        clearInterval(interval)
      }
    }, 400)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-[#0f111a] rounded-lg p-6 font-mono text-[10px] sm:text-xs min-h-[400px]">
      <div className="flex gap-2 mb-4">
        <div className="w-3 h-3 rounded-full bg-red-500/50" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
        <div className="w-3 h-3 rounded-full bg-green-500/50" />
      </div>
      <div className="space-y-1.5 overflow-y-auto">
        {output.map((line, i) => {
          let color = "text-pure-white/70"
          if (line.startsWith("➜")) color = "text-accent-teal"
          if (line.includes("bizra-node0")) color = "text-accent-teal"
          if (line.includes("[PASS]")) color = "text-green-500/80"
          if (line.includes("PASS")) color = "text-green-500/80"
          if (line.includes(">>>")) color = "text-radiant-gold font-bold"
          if (line.includes("Architect")) color = "text-pure-white"

          return (
            <div key={i} className={color}>
              {line || "\u00A0"}
            </div>
          )
        })}
        {output.length < fullOutput.length && (
          <div className="text-accent-teal animate-pulse">_</div>
        )}
      </div>
    </div>
  )
}

function JoinSlide({ onBegin }: { onBegin: () => void }) {
  return (
    <div className="text-center px-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
      >
        <div className="text-radiant-gold text-sm tracking-[0.5em] uppercase mb-6">The Next Chapter</div>
        <h2 className="text-5xl md:text-7xl font-cinzel mb-8 text-pure-white">Join the Sovereign Future</h2>
        <p className="text-xl text-pure-white/60 mb-12 leading-relaxed">
          The seed has grown. The foundation is laid. Now we build the forest.<br />
          We are looking for partners who value integrity over hype, and impact over extraction.
        </p>

        <div className="flex flex-col md:flex-row gap-6 justify-center">
          <button
            onClick={onBegin}
            className="group relative px-10 py-5 bg-radiant-gold text-celestial-navy font-bold rounded-full overflow-hidden transition-all hover:scale-105 shadow-2xl"
          >
            <div className="absolute inset-0 w-full h-full bg-pure-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative flex items-center gap-2">
              CONTACT THE ARCHITECT <ArrowRight className="w-5 h-5" />
            </span>
          </button>
          <a href="https://bizra.info" target="_blank" rel="noopener noreferrer" className="px-10 py-5 border border-pure-white/20 text-pure-white rounded-full hover:bg-pure-white/10 transition-all flex items-center gap-2 justify-center">
            VISIT BIZRA.INFO <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div className="mt-24 pt-10 border-t border-pure-white/10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-[10px] uppercase tracking-widest text-pure-white/30">
          <div className="flex flex-col gap-1"><span className="text-pure-white/50">Location</span>Dubai, UAE</div>
          <div className="flex flex-col gap-1"><span className="text-pure-white/50">Network</span>Genesis Node</div>
          <div className="flex flex-col gap-1"><span className="text-pure-white/50">Ethics</span>Sharia Compliant</div>
          <div className="flex flex-col gap-1"><span className="text-pure-white/50">License</span>Open Source</div>
        </div>
      </motion.div>
    </div>
  )
}

function SacredGeometry() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let time = 0
    let animationFrameId: number

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('resize', resize)
    resize()

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.15)'
      ctx.lineWidth = 1

      const width = canvas.width
      const height = canvas.height
      const centerX = width / 2
      const centerY = height / 2
      const radius = 120 + Math.sin(time) * 15

      for (let i = 0; i < 6; i++) {
        const angle = (i * 60 + time * 20) * Math.PI / 180
        const x = centerX + Math.cos(angle) * (radius * 0.5)
        const y = centerY + Math.sin(angle) * (radius * 0.5)

        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.stroke()
      }

      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.stroke()

      time += 0.005
      animationFrameId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return <canvas ref={canvasRef} className="canvas-bg" />
}
