"use client"

import Link from "next/link"

const GOLD = "#C9A962"
const NAVY = "#030810"

const CHAPTERS = [
  { num: 1, title: "The Silent Collapse", titleAr: "الانهيار الصامت", status: "drafted", summary: "How humanity's most powerful technology became its most extractive — and why nobody noticed." },
  { num: 2, title: "The Seed", titleAr: "البذرة", status: "drafted", summary: "A different premise: what if AI served the human instead of the platform? The founding vision from Ramadan 2023." },
  { num: 3, title: "The Constitutional Machine", titleAr: "الآلة الدستورية", status: "drafted", summary: "Why Islamic financial principles produce better AI economics — RIBA_ZERO, ZAKAT, IHSAN as runtime constants." },
  { num: 4, title: "The Proof Engine", titleAr: "محرك البرهان", status: "drafted", summary: "Receipts, evidence audit, FATE gates, loop proofs. How to build AI that can prove what it did." },
  { num: 5, title: "The Garden", titleAr: "الحديقة", status: "planned", summary: "From one node to a billion. The MMORPG ecosystem where every human is a node and every node is a seed." },
]

export default function BookPage() {
  return (
    <div className="min-h-screen" style={{ background: NAVY }}>
      <header className="border-b" style={{ borderColor: `${GOLD}15` }}>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link href="/info" className="text-sm opacity-40 hover:opacity-60 transition-opacity">
            ← bizra.info
          </Link>
          <h1 className="text-4xl font-light mt-4" style={{ color: GOLD }}>
            الانهيار الصامت
          </h1>
          <p className="text-xl opacity-60 mt-2 font-light">The Silent Collapse</p>
          <p className="text-sm opacity-40 mt-4">
            A book about why the world needs sovereign AI — and how to build it with
            integrity, proof, and 1,400 years of economic wisdom.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <section className="mb-12">
          <p className="text-sm opacity-70 leading-relaxed mb-6">
            This book is being written in public, alongside the system it describes.
            Every claim in the book is backed by code that runs, tests that pass,
            and receipts that prove it. The book is not separate from the technology —
            the technology is the book&apos;s evidence chain.
          </p>
          <p className="text-sm opacity-50">
            By Mohamed Beshr — Founder of BIZRA, Dubai, since Ramadan 2023.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-light mb-8" style={{ color: `${GOLD}80` }}>Chapters</h2>
          <div className="space-y-6">
            {CHAPTERS.map((ch) => (
              <div key={ch.num} className="border rounded-lg p-6" style={{ borderColor: `${GOLD}15` }}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono opacity-30">Chapter {ch.num}</span>
                    <h3 className="text-lg font-light mt-1">{ch.title}</h3>
                    <p className="text-sm opacity-40 mt-0.5">{ch.titleAr}</p>
                    <p className="text-sm opacity-60 mt-3 leading-relaxed">{ch.summary}</p>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full shrink-0 ml-4"
                    style={{
                      background: ch.status === "drafted" ? `${GOLD}15` : `${GOLD}08`,
                      color: ch.status === "drafted" ? `${GOLD}` : `${GOLD}60`,
                    }}>
                    {ch.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 pt-8 border-t text-center" style={{ borderColor: `${GOLD}10` }}>
          <p className="text-sm opacity-40">
            The full book will be published when the system it describes is proven at N=10.
          </p>
          <p className="text-xs opacity-30 mt-2">
            Until then, the code is the most honest draft.
          </p>
        </section>
      </main>
    </div>
  )
}
