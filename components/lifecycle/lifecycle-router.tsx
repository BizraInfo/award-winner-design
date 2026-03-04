"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useLifecycleStore, useLifecyclePhase, LifecyclePhase } from "@/store/use-lifecycle-store"

// Lifecycle Phase Components
import { LandingPage } from "@/components/landing/landing-page"
import { SeedTest } from "@/components/onboarding/seed-test"
import { PATOnboarding } from "@/components/onboarding/pat-onboarding"
import { FirstSession } from "@/components/onboarding/first-session"
import { DailyLoop } from "@/components/dashboard/daily-loop"
import { NodeActivation } from "@/components/dashboard/node-activation"
import { CommunityLayer } from "@/components/dashboard/community-layer"

// ============================================
// LIFECYCLE ROUTER
// Routes to the correct component based on 
// the user's current lifecycle phase
// ============================================

export function LifecycleRouter() {
  const phase = useLifecyclePhase()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <LoadingScreen />
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phase}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen"
      >
        {renderPhase(phase)}
      </motion.div>
    </AnimatePresence>
  )
}

function renderPhase(phase: ReturnType<typeof useLifecyclePhase>) {
  switch (phase) {
    case "FIRST_ENCOUNTER":
      return <LandingPage />
    
    case "SEED_TEST":
      return <SeedTest />
    
    case "PAT_INTRO":
      return <PATOnboarding />
    
    case "FIRST_SESSION":
      return <FirstSession />
    
    case "DAILY_LOOP":
      return <DailyLoop />
    
    case "NODE_ACTIVATION":
      return <NodeActivation />
    
    case "COMMUNITY":
      return <CommunityLayer />
    
    case "LEGACY":
      // For now, route to daily loop with legacy features
      return <DailyLoop />
    
    default:
      return <LandingPage />
  }
}

// Simple loading screen during hydration
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#050B14] flex items-center justify-center">
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.5, 1, 0.5]
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2A9D8F] to-[#8B5CF6] flex items-center justify-center"
      >
        <span className="text-2xl">🌱</span>
      </motion.div>
    </div>
  )
}

// Development/Debug Component
export function LifecycleDebugger() {
  const phase = useLifecyclePhase()
  const setPhase = useLifecycleStore(s => s.setPhase)
  const resetLifecycle = useLifecycleStore(s => s.resetLifecycle)
  
  const phases: LifecyclePhase[] = [
    "FIRST_ENCOUNTER",
    "SEED_TEST",
    "PAT_INTRO",
    "FIRST_SESSION",
    "DAILY_LOOP",
    "NODE_ACTIVATION",
    "COMMUNITY",
    "LEGACY"
  ]

  if (process.env.NODE_ENV !== "development") {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 z-[100] p-3 rounded-xl bg-black/80 border border-white/20 text-xs font-mono">
      <div className="text-gray-400 mb-2">Lifecycle Phase: <span className="text-[#C9A962]">{phase}</span></div>
      <div className="flex flex-wrap gap-1 mb-2">
        {phases.map(p => (
          <button
            key={p}
            onClick={() => setPhase(p)}
            className={`px-2 py-1 rounded text-[10px] ${
              p === phase 
                ? "bg-[#2A9D8F] text-white" 
                : "bg-white/10 text-gray-400 hover:bg-white/20"
            }`}
          >
            {p.slice(0, 4)}
          </button>
        ))}
      </div>
      <button
        onClick={resetLifecycle}
        className="w-full px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
      >
        Reset All
      </button>
    </div>
  )
}
