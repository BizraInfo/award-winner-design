"use client"

import { useEffect, useState, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useLifecycleStore, useLifecyclePhase, type LifecyclePhase } from "@/store/use-lifecycle-store"
import type { TeachConfig } from "@/store/use-lifecycle-store"

// Sovereign Design Components (ported from BIZRA_DDAGI_OS_Complete.jsx)
import { TrustSite } from "@/components/sovereign/trust-site"
import { SplashScreen, GenesisFlow, TeachSteps, Assembly, type GenesisIdentity } from "@/components/sovereign/onboarding-flow"
import { CommandCenter } from "@/components/sovereign/command-center"

// ============================================
// LIFECYCLE ROUTER
// Routes to the correct component based on
// the user's current lifecycle phase.
//
// Phase mapping (prototype → lifecycle store):
//   TrustSite     → FIRST_ENCOUNTER
//   Splash        → (auto-transition within SEED_TEST)
//   Genesis       → SEED_TEST
//   TeachSteps    → PAT_INTRO
//   Assembly      → FIRST_SESSION
//   Dashboard     → DAILY_LOOP / NODE_ACTIVATION / COMMUNITY / LEGACY
// ============================================

export function LifecycleRouter() {
  const phase = useLifecyclePhase()
  const [mounted, setMounted] = useState(false)
  const [showSplash, setShowSplash] = useState(false)

  const setPhase = useLifecycleStore(s => s.setPhase)
  const setUserName = useLifecycleStore(s => s.setUserName)
  const setGenesisIdentity = useLifecycleStore(s => s.setGenesisIdentity)
  const setTeachConfig = useLifecycleStore(s => s.setTeachConfig)
  const userName = useLifecycleStore(s => s.userName)
  const teachConfig = useLifecycleStore(s => s.teachConfig)

  useEffect(() => { setMounted(true) }, [])

  // Handle splash → genesis transition
  const handleSplashDone = useCallback(() => {
    setShowSplash(false)
  }, [])

  // When entering SEED_TEST, show splash first
  useEffect(() => {
    if (phase === "SEED_TEST" && !userName) {
      setShowSplash(true)
    }
  }, [phase, userName])

  const handleGenesisDone = useCallback((name: string, identity: GenesisIdentity) => {
    setUserName(name)
    setGenesisIdentity(identity)
    setPhase("PAT_INTRO")
  }, [setUserName, setGenesisIdentity, setPhase])

  const handleTeachDone = useCallback((config: TeachConfig) => {
    setTeachConfig(config)
    setPhase("FIRST_SESSION")
  }, [setTeachConfig, setPhase])

  const handleAssemblyDone = useCallback(() => {
    setPhase("DAILY_LOOP")
  }, [setPhase])

  if (!mounted) {
    return <LoadingScreen />
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={showSplash ? "splash" : phase}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen"
      >
        {renderPhase()}
      </motion.div>
    </AnimatePresence>
  )

  function renderPhase() {
    // Splash intercept
    if (showSplash) {
      return <SplashScreen onStart={handleSplashDone} />
    }

    switch (phase) {
      case "FIRST_ENCOUNTER":
        return <TrustSite />

      case "SEED_TEST":
        return <GenesisFlow onDone={handleGenesisDone} />

      case "PAT_INTRO":
        return <TeachSteps userName={userName} onDone={handleTeachDone} />

      case "FIRST_SESSION":
        return <Assembly userName={userName} config={teachConfig} onDone={handleAssemblyDone} />

      case "DAILY_LOOP":
      case "NODE_ACTIVATION":
      case "COMMUNITY":
      case "LEGACY":
        return <CommandCenter />

      default:
        return <TrustSite />
    }
  }
}

// Simple loading screen during hydration
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#030810" }}>
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ border: "1.5px solid rgba(201,169,98,0.15)", boxShadow: "0 0 80px rgba(201,169,98,0.04)" }}
      >
        <div className="w-8 h-8 rounded-full" style={{ background: "radial-gradient(circle,rgba(201,169,98,0.25),transparent)" }} />
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
      <div className="text-gray-400 mb-2">Phase: <span className="text-[#C9A962]">{phase}</span></div>
      <div className="flex flex-wrap gap-1 mb-2">
        {phases.map(p => (
          <button
            key={p}
            onClick={() => setPhase(p)}
            className={`px-2 py-1 rounded text-[10px] ${
              p === phase
                ? "bg-[#C9A962] text-black"
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
