import type { Metadata } from "next"
import { MaestroViz } from "@/components/dashboard/maestro-viz"

export const metadata: Metadata = {
  title: "Maestro Agent Orchestration | BIZRA Showcase",
  description:
    "Interactive visualization of the BIZRA Maestro agent orchestration flow — complexity tiers, emotion-tone mapping, and trust evolution.",
}

export default function MaestroPage() {
  return (
    <main className="min-h-screen bg-[var(--color-dash-bg)]">
      <MaestroViz />
    </main>
  )
}
