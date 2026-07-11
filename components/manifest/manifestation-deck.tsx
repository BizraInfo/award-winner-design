"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AGENT_OUTSIDE_SANDBOX,
  CORE_LAWS,
  DEV_LIFECYCLE,
  MANIFEST_CATEGORY,
  MANIFEST_CHAPTERS,
  MANIFEST_PRODUCTS,
  M1_PLAN,
  MARKET_FORCES,
  PROOF_SPINE,
  TRUST_QUESTIONS,
  TRUTH_STRIP,
  productStatusClass,
} from "@/lib/manifest/manifest-truth-surface";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs uppercase tracking-[0.32em] text-[#C9A962]">
      {children}
    </p>
  );
}

function ChapterSection({
  id,
  index,
  children,
  className = "",
}: {
  id: string;
  index: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      data-chapter={index}
      className={`min-h-screen snap-start flex flex-col justify-center px-[8vw] py-[12vh] relative ${className}`}
    >
      {children}
    </section>
  );
}

export function ManifestationDeck() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeChapter, setActiveChapter] = useState(0);

  const onScroll = useCallback(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const sections = root.querySelectorAll<HTMLElement>("[data-chapter]");
    const mid = window.innerHeight * 0.45;
    let best = 0;
    let bestDist = Infinity;
    sections.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const dist = Math.abs(rect.top + rect.height / 2 - mid);
      const idx = Number(el.dataset.chapter ?? 0);
      if (dist < bestDist) {
        bestDist = dist;
        best = idx;
      }
    });
    setActiveChapter(best);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  const scrollToChapter = (i: number) => {
    document.getElementById(`ch-${i}`)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative bg-[#050B14] text-[#F8F6F1] min-h-screen">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_40%,rgba(201,169,98,0.11),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,transparent_44%,rgba(3,7,14,0.72)_100%)]" />
      </div>

      <header className="fixed top-6 left-[6vw] z-50 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="font-serif font-bold text-lg tracking-[0.14em] group-hover:text-[#C9A962] transition-colors">
            BIZRA
          </span>
        </Link>
        <span className="text-white/30">·</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
          Manifestation
        </span>
      </header>

      <nav
        className="fixed right-5 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col gap-3 items-end"
        aria-label="Chapters"
      >
        {MANIFEST_CHAPTERS.map((name, i) => (
          <button
            key={name}
            type="button"
            onClick={() => scrollToChapter(i)}
            className="flex items-center gap-2 bg-transparent border-0 cursor-pointer p-0"
          >
            {activeChapter === i && (
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#C9A962]">
                {name}
              </span>
            )}
            <span
              className={`font-mono text-[9px] ${activeChapter === i ? "text-[#C9A962]" : "text-white/35"}`}
            >
              {String(i).padStart(2, "0")}
            </span>
            <span
              className={`h-px transition-all duration-300 ${activeChapter === i ? "w-8 bg-[#C9A962]" : "w-4 bg-white/20"}`}
            />
          </button>
        ))}
      </nav>

      <footer className="fixed bottom-5 left-[6vw] right-[6vw] z-50 flex justify-between items-center font-mono text-[10px] uppercase tracking-[0.13em] text-white/40 pointer-events-none">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C9A962] shadow-[0_0_9px_#C9A962]" />
          {TRUTH_STRIP[activeChapter] ?? TRUTH_STRIP[0]}
        </span>
        <span>proof first · magic never</span>
      </footer>

      <div ref={scrollerRef} className="relative z-10 snap-y snap-proximity">
        <ChapterSection id="ch-0" index={0} className="items-center text-center">
          <SectionLabel>Proof-State Runtime · Dubai · Jul 2026</SectionLabel>
          <h1 className="mt-6 font-serif font-extrabold text-[clamp(3.5rem,12vw,9rem)] leading-[0.9] tracking-wide bg-gradient-to-br from-[#8A6B2E] via-[#C9A962] to-[#F9F1D8] bg-clip-text text-transparent">
            BIZRA
          </h1>
          <p className="mt-4 font-serif text-[clamp(1.5rem,3.5vw,2.5rem)] max-w-[22ch] leading-tight">
            The proof layer for{" "}
            <span className="italic text-[#C9A962]">agentic work</span>.
          </p>
          <p className="mt-5 text-lg font-light text-white/60 max-w-[54ch] leading-relaxed">
            AI agents can act. BIZRA proves what they did — through{" "}
            <span className="text-[#E6D5A6]">
              consent, receipts, replay, and correction
            </span>
            .
          </p>
        </ChapterSection>

        <ChapterSection id="ch-1" index={1}>
          <SectionLabel>The law it runs on</SectionLabel>
          <h2 className="mt-4 font-serif font-semibold text-[clamp(1.75rem,4vw,3.25rem)] leading-tight max-w-[20ch]">
            One constitution. Five gates. No exceptions.
          </h2>
          <ol className="mt-10 space-y-6 max-w-3xl">
            {CORE_LAWS.map((law, i) => (
              <li key={law.key} className="flex gap-6 items-start">
                <span className="shrink-0 w-9 h-9 rounded-full border border-[#C9A962]/55 flex items-center justify-center font-mono text-xs text-[#C9A962] bg-[#C9A962]/5">
                  {i + 1}
                </span>
                <p className="font-serif text-[clamp(1.1rem,2.6vw,1.75rem)] text-white/90 pt-1">
                  {law.pre}
                  <span className="italic font-semibold text-[#C9A962]">
                    {law.key}
                  </span>
                  {law.post}
                </p>
              </li>
            ))}
          </ol>
        </ChapterSection>

        <ChapterSection id="ch-2" index={2}>
          <SectionLabel>The business logic</SectionLabel>
          <h2 className="mt-4 font-serif font-semibold text-[clamp(1.75rem,3.6vw,3rem)] leading-tight max-w-[26ch]">
            Enterprises don&apos;t ask{" "}
            <span className="text-white/40 italic">can the AI do it.</span>
            <br />
            They ask{" "}
            <span className="italic text-[#C9A962]">can we trust it.</span>
          </h2>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
            {TRUST_QUESTIONS.map((q) => (
              <div
                key={q.k}
                className="border border-[#C9A962]/16 rounded-xl bg-[#142837]/22 p-4 min-h-[96px] flex flex-col justify-between hover:border-[#C9A962]/50 transition-colors"
              >
                <span className="font-mono text-[10px] text-[#C9A962] tracking-wider">
                  {q.k}
                </span>
                <span className="font-serif text-lg leading-snug">{q.t}</span>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/40 mb-4">
              Where BIZRA sits
            </p>
            <div className="flex flex-wrap items-stretch gap-0">
              {PROOF_SPINE.map((n, i) => (
                <div key={n.t} className="flex items-center">
                  <div className="border border-[#C9A962]/30 rounded-xl px-5 py-4 min-w-[140px] bg-[#C9A962]/5">
                    <div className="font-semibold text-sm">{n.t}</div>
                    <div className="font-mono text-[9px] uppercase text-white/45 mt-1">
                      {n.s}
                    </div>
                  </div>
                  {i < PROOF_SPINE.length - 1 && (
                    <span className="text-[#C9A962] px-3">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </ChapterSection>

        <ChapterSection id="ch-3" index={3}>
          <SectionLabel>The category</SectionLabel>
          <h2 className="mt-3 font-serif font-bold text-[clamp(2rem,5.5vw,4.5rem)] leading-[1.02] max-w-[16ch] bg-gradient-to-br from-[#B08D45] via-[#C9A962] to-[#F9F1D8] bg-clip-text text-transparent">
            {MANIFEST_CATEGORY}
          </h2>
          <div className="mt-8 grid md:grid-cols-2 gap-4">
            <div className="border-l-2 border-[#C9A962]/50 pl-4">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#C9A962]">
                For investors
              </span>
              <p className="mt-2 text-white/75">
                Trust infrastructure for autonomous AI work.
              </p>
            </div>
            <div className="border-l-2 border-[#C9A962]/50 pl-4">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#C9A962]">
                For builders
              </span>
              <p className="mt-2 text-white/75">
                A local-first layer that turns agent actions into consent-bound,
                receipt-backed, replayable work.
              </p>
            </div>
          </div>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {MARKET_FORCES.map((f) => (
              <div
                key={f.k}
                className={`rounded-xl p-4 min-h-[150px] flex flex-col gap-2 border ${
                  f.wedge
                    ? "border-[#C9A962]/50 bg-[#C9A962]/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <span
                  className={`font-mono text-[9px] uppercase tracking-wider ${f.wedge ? "text-[#C9A962]" : "text-white/45"}`}
                >
                  {f.state}
                </span>
                <span className="font-serif text-xl">{f.k}</span>
                <span className="text-sm text-white/60 flex-1">{f.d}</span>
              </div>
            ))}
          </div>
        </ChapterSection>

        <ChapterSection id="ch-4" index={4}>
          <SectionLabel>Agent architecture</SectionLabel>
          <h2 className="mt-4 font-serif font-semibold text-[clamp(1.75rem,3.6vw,2.75rem)] leading-tight max-w-[28ch]">
            The case for putting the agent{" "}
            <span className="italic text-[#C9A962]">outside</span> the sandbox,
            not inside it
          </h2>
          <p className="mt-5 text-white/65 max-w-[62ch] leading-relaxed">
            {AGENT_OUTSIDE_SANDBOX.thesis}
          </p>
          <div className="mt-10 grid lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[#C9A962]/25 bg-[#C9A962]/5 p-6">
              <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#C9A962] mb-4">
                Outside — harness · reason · propose
              </h3>
              <ul className="space-y-4">
                {AGENT_OUTSIDE_SANDBOX.outside.map((row) => (
                  <li key={row.role}>
                    <span className="font-semibold text-[#E8D5A3]">
                      {row.role}
                    </span>
                    <p className="text-sm text-white/60 mt-1">{row.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
              <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-white/50 mb-4">
                Inside — kernel · execute · witness
              </h3>
              <ul className="space-y-4">
                {AGENT_OUTSIDE_SANDBOX.inside.map((row) => (
                  <li key={row.role}>
                    <span className="font-semibold text-white/90">
                      {row.role}
                    </span>
                    <p className="text-sm text-white/55 mt-1">{row.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {AGENT_OUTSIDE_SANDBOX.bridge.map((cmd) => (
              <code
                key={cmd}
                className="font-mono text-[11px] px-3 py-1.5 rounded-full border border-white/15 bg-black/30 text-white/70"
              >
                {cmd}
              </code>
            ))}
          </div>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {DEV_LIFECYCLE.map((step, i) => (
              <div
                key={step.t}
                className="border border-white/10 rounded-lg p-3 text-sm"
              >
                <span className="font-mono text-[#C9A962] text-[10px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="font-semibold mt-1">{step.t}</div>
                <p className="text-white/55 text-xs mt-1 leading-relaxed">
                  {step.d}
                </p>
              </div>
            ))}
          </div>
        </ChapterSection>

        <ChapterSection id="ch-5" index={5}>
          <SectionLabel>Products</SectionLabel>
          <h2 className="mt-3 font-serif font-semibold text-[clamp(1.75rem,3.6vw,2.75rem)]">
            Ten products. One proof spine.
          </h2>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-white/40">
            Truth labels — no magic status inflation
          </p>
          <div className="mt-8 grid md:grid-cols-2 gap-3">
            {MANIFEST_PRODUCTS.map((p) => (
              <article
                key={p.name}
                className="border border-white/10 rounded-xl p-5 hover:border-[#C9A962]/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-serif text-lg">{p.name}</h3>
                  <span
                    className={`shrink-0 font-mono text-[9px] uppercase tracking-wider px-2 py-1 rounded border ${productStatusClass(p.status)}`}
                  >
                    {p.status.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-3 text-sm text-white/65 leading-relaxed">
                  {p.value}
                </p>
                <p className="mt-2 font-mono text-[10px] text-[#C9A962]/70">
                  {p.serves}
                </p>
              </article>
            ))}
          </div>
        </ChapterSection>

        <ChapterSection id="ch-6" index={6}>
          <SectionLabel>Roadmap</SectionLabel>
          <h2 className="mt-3 font-serif font-semibold text-[clamp(1.75rem,3.6vw,2.5rem)]">
            {M1_PLAN.tag} — {M1_PLAN.goal}
          </h2>
          <p className="mt-2 text-white/50 font-mono text-sm">
            {M1_PLAN.when} · target {M1_PLAN.rev}
          </p>
          <ul className="mt-8 space-y-3 max-w-2xl">
            {M1_PLAN.actions.map((action) => (
              <li
                key={action}
                className="flex gap-3 items-start text-white/75 border-l border-[#C9A962]/30 pl-4 py-1"
              >
                <span className="text-[#C9A962]">→</span>
                {action}
              </li>
            ))}
          </ul>
        </ChapterSection>

        <ChapterSection id="ch-7" index={7} className="items-center text-center">
          <SectionLabel>The verdict</SectionLabel>
          <h2 className="mt-6 font-serif text-[clamp(2rem,4vw,3.5rem)] max-w-[20ch] leading-tight">
            Only verified impact can justify reward.
          </h2>
          <p className="mt-6 text-white/55 max-w-[48ch]">
            Proof runtime is emerging — not shipped as production autonomy. This
            deck is claim-governed; every product carries an honest label.
          </p>
          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <Link
              href="/genesis"
              className="px-6 py-3 rounded-full border border-[#C9A962]/40 text-[#C9A962] hover:bg-[#C9A962]/10 transition-colors text-sm"
            >
              Genesis Portal
            </Link>
            <Link
              href="/"
              className="px-6 py-3 rounded-full border border-white/20 text-white/70 hover:bg-white/5 transition-colors text-sm"
            >
              Start lifecycle
            </Link>
          </div>
        </ChapterSection>
      </div>
    </div>
  );
}
