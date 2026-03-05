import type { Metadata } from "next"
import { PipelineDashboard } from "@/components/dashboard/pipeline-dashboard"

export const metadata: Metadata = {
  title: "Node0 Pipeline Dashboard | BIZRA Showcase",
  description:
    "Real-time visualization of the BIZRA Node0 sovereign pipeline — 9-step message lifecycle with FATE gates and Ihsan scoring.",
}

export default function PipelinePage() {
  return (
    <main className="min-h-screen bg-[var(--color-dash-bg)]">
      <PipelineDashboard />
    </main>
  )
}
