import type { Metadata } from "next"
import Link from "next/link"
import { PipelineDashboard } from "@/components/dashboard/pipeline-dashboard"

export const metadata: Metadata = {
  title: "Node0 Pipeline Dashboard | BIZRA Showcase",
  description:
    "Real-time visualization of the BIZRA Node0 sovereign pipeline — 9-step message lifecycle with FATE gates and Ihsan scoring.",
}

export default function PipelinePage() {
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
        <span className="text-xs font-mono text-[var(--color-dash-text)]">Sovereign Pipeline</span>
        <Link
          href="/showcase/maestro"
          className="ml-auto text-xs font-mono text-[var(--color-dash-dim)] hover:text-[var(--color-accent-teal)] transition-colors"
        >
          {"\u2190"} Maestro
        </Link>
      </nav>
      <div className="pt-12">
        <PipelineDashboard />
      </div>
    </main>
  )
}
