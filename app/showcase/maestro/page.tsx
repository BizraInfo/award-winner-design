import type { Metadata } from "next"
import Link from "next/link"
import { MaestroViz } from "@/components/dashboard/maestro-viz"

export const metadata: Metadata = {
  title: "Maestro Agent Orchestration | BIZRA Showcase",
  description:
    "Interactive visualization of the BIZRA Maestro agent orchestration flow — complexity tiers, emotion-tone mapping, and trust evolution.",
}

export default function MaestroPage() {
  return (
    <main className="min-h-screen bg-[var(--color-dash-bg)]">
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center gap-4 px-6 py-3 bg-[var(--color-dash-bg)]/80 backdrop-blur-md border-b border-[var(--color-dash-border)]">
        <Link
          href="/showcase#dashboards"
          className="text-xs font-mono text-[var(--color-dash-dim)] hover:text-[var(--color-accent-gold)] transition-colors"
        >
          {"\u2190"} Showcase
        </Link>
        <span className="text-[var(--color-dash-border)]">|</span>
        <span className="text-xs font-mono text-[var(--color-dash-text)]">Maestro Orchestration</span>
        <Link
          href="/showcase/pipeline"
          className="ml-auto text-xs font-mono text-[var(--color-dash-dim)] hover:text-[var(--color-accent-teal)] transition-colors"
        >
          Pipeline {"\u2192"}
        </Link>
      </nav>
      <div className="pt-12">
        <MaestroViz />
      </div>
    </main>
  )
}
