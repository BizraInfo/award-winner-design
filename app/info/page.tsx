"use client"

import Link from "next/link"

// ============================================
// BIZRA.INFO — Knowledge Hub
// The ideology, the book, the documentation.
// "Understand BIZRA before you use BIZRA."
// ============================================

const GOLD = "#C9A962"
const NAVY = "#030810"

const SECTIONS = [
  {
    title: "The Book",
    subtitle: "الانهيار الصامت — The Silent Collapse",
    description: "The foundational text explaining why sovereign AI matters, why Islamic financial principles produce better economic systems, and why every human deserves to own their own intelligence.",
    href: "/book",
    icon: "📖",
    status: "In progress — 5 chapters drafted",
  },
  {
    title: "Documentation",
    subtitle: "Technical Architecture & API Reference",
    description: "How BIZRA works at every level: the proof engine, the FATE gate, the PAT-7 agent team, the SAT-5 governance gates, the Universal Resource Pool, and the constitutional kernel.",
    href: "/docs",
    icon: "📋",
    status: "983 constitutional tests documented",
  },
  {
    title: "Research",
    subtitle: "Papers, Whitepapers & Architecture",
    description: "The academic and technical foundations of BIZRA. From the original البذرة (The Seed) in Ramadan 2023 to the current METRICS_CANONICAL.md — every claim backed by evidence.",
    href: "/research",
    icon: "🔬",
    status: "35 months of R&D",
  },
  {
    title: "Constitutional Anchors",
    subtitle: "The Non-Negotiable Principles",
    description: "IHSAN ≥ 0.95. RIBA_ZERO. ZAKAT 2.5%. GINI ≤ 0.35. CLAIM_MUST_BIND. These aren't policies — they're runtime invariants enforced at the kernel level.",
    href: "/lab#constitutional-anchors",
    icon: "⚖️",
    status: "Enforced in core/integration/constants.py",
  },
]

const ORIGIN_STORY = {
  title: "بذرة واحدة تصنع غابة",
  translation: "One seed makes a forest",
  text: `BIZRA (بذرة) means "seed" in Arabic. It started in Ramadan 2023 with two handwritten Arabic papers — البذرة (The Seed) and الرسالة (The Message) — written by a solo founder in Dubai who believed that AI should serve humanity, not extract from it.

35 months later: 259,000 lines of code. 24 Rust crates. 7 governed AI agents. 5 constitutional gates. 983 tests verifying that the system cannot lie about what it did.

The seed became a forest. And the forest has roots.`,
}

export default function InfoPage() {
  return (
    <div className="min-h-screen" style={{ background: NAVY }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: `${GOLD}15` }}>
        <div className="max-w-5xl mx-auto px-6 py-8">
          <p className="text-sm opacity-40 mb-2">bizra.info</p>
          <h1 className="text-4xl font-light tracking-wide" style={{ color: GOLD }}>
            Understand BIZRA
          </h1>
          <p className="text-lg opacity-60 mt-3 font-light">
            The ideology. The book. The documentation. The research.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Origin */}
        <section className="mb-16 border rounded-lg p-8" style={{ borderColor: `${GOLD}15` }}>
          <p className="text-2xl font-light mb-1" style={{ color: GOLD }}>
            {ORIGIN_STORY.title}
          </p>
          <p className="text-sm opacity-40 mb-6">{ORIGIN_STORY.translation}</p>
          <p className="text-sm opacity-70 leading-relaxed whitespace-pre-line">
            {ORIGIN_STORY.text}
          </p>
        </section>

        {/* Sections Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {SECTIONS.map((s) => (
            <Link
              key={s.title}
              href={s.href}
              className="border rounded-lg p-6 transition-all hover:border-opacity-40 group"
              style={{ borderColor: `${GOLD}15` }}
            >
              <div className="flex items-start gap-4">
                <span className="text-2xl">{s.icon}</span>
                <div className="flex-1">
                  <h2 className="text-lg font-light group-hover:opacity-100 transition-opacity"
                    style={{ color: GOLD }}>
                    {s.title}
                  </h2>
                  <p className="text-sm opacity-50 mt-0.5">{s.subtitle}</p>
                  <p className="text-sm opacity-60 mt-3 leading-relaxed">
                    {s.description}
                  </p>
                  <p className="text-xs mt-4 px-2 py-1 inline-block rounded"
                    style={{ background: `${GOLD}08`, color: `${GOLD}80` }}>
                    {s.status}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Call to Action */}
        <section className="text-center py-12 border-t" style={{ borderColor: `${GOLD}10` }}>
          <p className="text-sm opacity-40 mb-4">Ready to see it in action?</p>
          <a
            href="https://app.bizra.ai"
            className="inline-block px-8 py-3 rounded-lg text-sm font-medium transition-colors"
            style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}30` }}
          >
            Launch BIZRA →
          </a>
          <div className="mt-6 flex justify-center gap-6 text-sm opacity-40">
            <a href="https://github.com/BizraInfo" className="hover:opacity-70 transition-opacity">
              GitHub
            </a>
            <a href="https://app.bizra.ai/lab" className="hover:opacity-70 transition-opacity">
              BIZRA Lab
            </a>
            <a href="https://github.com/BizraInfo/bizra-data-lake" className="hover:opacity-70 transition-opacity">
              Source Code
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t py-8" style={{ borderColor: `${GOLD}10` }}>
        <div className="max-w-5xl mx-auto px-6 flex justify-between items-center">
          <p className="text-xs opacity-30">BIZRA — Dubai, UAE — Since Ramadan 2023</p>
          <p className="text-xs opacity-30">بسم الله الرحمن الرحيم</p>
        </div>
      </footer>
    </div>
  )
}
