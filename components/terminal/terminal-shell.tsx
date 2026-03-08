"use client"

/**
 * Terminal Shell — 7-View Navigation Container
 *
 * Build Contract §3: Seven Views.
 * This is the persistent frame that holds all terminal views.
 * View switching is instant (client-side, no route change).
 *
 * All 7 views locked — Phase C.1 through C.7 complete.
 */

import { lazy, Suspense, useEffect } from "react"
import {
  LayoutDashboard,
  Target,
  Clock,
  Brain,
  Users,
  Globe,
  Settings,
} from "lucide-react"
import {
  useTerminalStore,
  useCriticalEvents,
  type TerminalView,
} from "@/store/use-terminal-store"

const TerminalDashboard = lazy(() =>
  import("@/components/terminal/terminal-dashboard").then((m) => ({
    default: m.TerminalDashboard,
  })),
)

const TerminalMission = lazy(() =>
  import("@/components/terminal/terminal-mission").then((m) => ({
    default: m.TerminalMission,
  })),
)

const TerminalTimeline = lazy(() =>
  import("@/components/terminal/terminal-timeline").then((m) => ({
    default: m.TerminalTimeline,
  })),
)

const TerminalMemory = lazy(() =>
  import("@/components/terminal/terminal-memory").then((m) => ({
    default: m.TerminalMemory,
  })),
)

const TerminalSkills = lazy(() =>
  import("@/components/terminal/terminal-skills").then((m) => ({
    default: m.TerminalSkills,
  })),
)

const TerminalNetwork = lazy(() =>
  import("@/components/terminal/terminal-network").then((m) => ({
    default: m.TerminalNetwork,
  })),
)

const TerminalSettings = lazy(() =>
  import("@/components/terminal/terminal-settings").then((m) => ({
    default: m.TerminalSettings,
  })),
)

const VIEWS: { key: TerminalView; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "mission", label: "Mission", icon: Target },
  { key: "timeline", label: "Timeline", icon: Clock },
  { key: "memory", label: "Memory", icon: Brain },
  { key: "agents", label: "Skills", icon: Users },
  { key: "network", label: "Network", icon: Globe },
  { key: "settings", label: "Settings", icon: Settings },
]

export function TerminalShell() {
  const activeView = useTerminalStore((s) => s.activeView)
  const setActiveView = useTerminalStore((s) => s.setActiveView)
  const criticalEvents = useCriticalEvents()

  // Keyboard shortcuts: 1..7 switches views (only bare keys, no modifiers)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.altKey || e.metaKey) return
      const idx = parseInt(e.key, 10) - 1
      if (idx >= 0 && idx < VIEWS.length) {
        const target = e.target as HTMLElement | null
        const tag = target?.tagName
        if (
          target?.isContentEditable ||
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT"
        ) {
          return
        }
        e.preventDefault()
        setActiveView(VIEWS[idx].key)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [setActiveView])

  return (
    <div className="min-h-screen bg-[#050810] text-zinc-100">
      {/* Top Navigation */}
      <nav className="border-b border-zinc-800/60 bg-[#070B14]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center h-12 gap-1">
            <span className="text-sm font-semibold text-zinc-400 mr-4 select-none">
              BIZRA Terminal
            </span>
            {VIEWS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveView(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  activeView === key
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
            {/* Critical event indicator (Contract §7.3 — visible across all views) */}
            {criticalEvents.length > 0 && (
              <button
                onClick={() => setActiveView("dashboard")}
                className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-950/50 border border-red-900/50 text-red-400 text-xs font-medium animate-pulse"
              >
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {criticalEvents.length} critical
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* View Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Suspense
          fallback={
            <div className="border border-zinc-800/60 rounded-lg bg-[#070B14]/80 px-4 py-6 text-sm text-zinc-500">
              Loading terminal view...
            </div>
          }
        >
          {activeView === "dashboard" && <TerminalDashboard />}
          {activeView === "mission" && <TerminalMission />}
          {activeView === "timeline" && <TerminalTimeline />}
          {activeView === "memory" && <TerminalMemory />}
          {activeView === "agents" && <TerminalSkills />}
          {activeView === "network" && <TerminalNetwork />}
          {activeView === "settings" && <TerminalSettings />}
        </Suspense>
      </main>
    </div>
  )
}
