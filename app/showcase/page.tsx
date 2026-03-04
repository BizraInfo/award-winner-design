"use client"

import dynamic from "next/dynamic"
import { Suspense, useEffect, useState } from "react"
import { useBizraStore } from "@/store/use-bizra-store"

// Dynamic imports for heavy 3D components - only load when needed
const Canvas = dynamic(
  () => import("@react-three/fiber").then((mod) => mod.Canvas),
  { ssr: false, loading: () => <LoadingPlaceholder text="Loading 3D Engine..." /> }
)

const EffectComposer = dynamic(
  () => import("@react-three/postprocessing").then((mod) => mod.EffectComposer),
  { ssr: false }
)

const Bloom = dynamic(
  () => import("@react-three/postprocessing").then((mod) => mod.Bloom),
  { ssr: false }
)

const Noise = dynamic(
  () => import("@react-three/postprocessing").then((mod) => mod.Noise),
  { ssr: false }
)

const Vignette = dynamic(
  () => import("@react-three/postprocessing").then((mod) => mod.Vignette),
  { ssr: false }
)

// Heavy components - dynamically imported
const Citadel = dynamic(
  () => import("@/components/citadel").then((mod) => mod.Citadel),
  { ssr: false, loading: () => null }
)

const CosmicBackground = dynamic(
  () => import("@/components/cosmic-background").then((mod) => mod.CosmicBackground),
  { ssr: false, loading: () => null }
)

const GlassInterface = dynamic(
  () => import("@/components/glass-interface").then((mod) => mod.GlassInterface),
  { ssr: false }
)

const NavDock = dynamic(
  () => import("@/components/nav-dock").then((mod) => mod.NavDock),
  { ssr: false }
)

const LoadingScreen = dynamic(
  () => import("@/components/loading-screen").then((mod) => mod.LoadingScreen),
  { ssr: false }
)

// Content sections - lazy loaded
const DeckContainer = dynamic(
  () => import("@/components/pitch-deck/deck-container").then((mod) => mod.DeckContainer),
  { ssr: false, loading: () => <SectionLoader /> }
)

const SacredGeometryInterface = dynamic(
  () => import("@/components/sacred-geometry-interface").then((mod) => mod.SacredGeometryInterface),
  { ssr: false, loading: () => <SectionLoader /> }
)

const TerminalSimulation = dynamic(
  () => import("@/components/demo/terminal-simulation").then((mod) => mod.TerminalSimulation),
  { ssr: false, loading: () => <SectionLoader /> }
)

const LayerVisualizer = dynamic(
  () => import("@/components/architecture/layer-visualizer").then((mod) => mod.LayerVisualizer),
  { ssr: false, loading: () => <SectionLoader /> }
)

const TreeVisualization = dynamic(
  () => import("@/components/architecture/tree-visualization").then((mod) => mod.TreeVisualization),
  { ssr: false, loading: () => <SectionLoader /> }
)

const GenesisDashboard = dynamic(
  () => import("@/components/genesis-dashboard").then((mod) => mod.GenesisDashboard),
  { ssr: false, loading: () => <SectionLoader /> }
)

const EvidencePack = dynamic(
  () => import("@/components/evidence/metrics-display").then((mod) => mod.EvidencePack),
  { ssr: false, loading: () => <SectionLoader /> }
)

// Loading components
function LoadingPlaceholder({ text }: { text: string }) {
  return (
    <div className="w-full h-full min-h-screen bg-[#050B14] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-[#C9A962] border-t-transparent animate-spin" />
        <p className="text-[#C9A962] font-mono text-sm">{text}</p>
      </div>
    </div>
  )
}

function SectionLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#C9A962]/30 border-t-[#C9A962] animate-spin" />
    </div>
  )
}

// Main Showcase Page Component
export default function ShowcasePage() {
  const phase = useBizraStore((state) => state.phase)
  const [showLoading, setShowLoading] = useState(true)
  const [canvasError, setCanvasError] = useState(false)

  // Keep the 3D page interactive for tests and users by auto-dismissing the splash quickly
  useEffect(() => {
    const timer = setTimeout(() => setShowLoading(false), 1200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <main className="w-full min-h-screen bg-[#050B14] relative">
      {showLoading && <LoadingScreen onComplete={() => setShowLoading(false)} />}

      {/* 3D Layer - Fixed Background */}
      <div className="fixed inset-0 z-0">
        {!canvasError ? (
          <Suspense fallback={<LoadingPlaceholder text="Initializing 3D Scene..." />}>
            <Canvas 
              camera={{ position: [0, 10, 20], fov: 45 }}
              onError={() => setCanvasError(true)}
            >
              <color attach="background" args={["#050B14"]} />
              <fog attach="fog" args={["#050B14", 10, 50]} />

              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1} color="#C9A962" />

              <Suspense fallback={null}>
                <CosmicBackground />
                <group position={[0, -5, 0]}>
                  <Citadel />
                </group>
              </Suspense>

              {/* Cinematic Post-Processing */}
              <EffectComposer enableNormalPass={false}>
                <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} radius={0.4} />
                <Noise opacity={0.05} />
                <Vignette eskil={false} offset={0.1} darkness={1.1} />
              </EffectComposer>
            </Canvas>
          </Suspense>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#C9A962]/50">
            <p>3D visualization unavailable on this device</p>
          </div>
        )}
      </div>

      {/* UI Layer - Fixed Overlay */}
      <GlassInterface />

      {/* Navigation Dock - Always visible */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <NavDock />
      </div>

      {/* Content Sections - Only visible in CITADEL phase, scrollable over the fixed background */}
      {phase === "CITADEL" && (
        <div className="relative z-20 pt-[100vh]">
          <div id="pitch-deck" className="bg-[#050B14]/80 backdrop-blur-md border-t border-[#C9A962]/20">
            <DeckContainer />
          </div>

          <div id="sacred-interface" className="border-t border-[#C9A962]/10">
            <SacredGeometryInterface />
          </div>

          <div
            id="demo"
            className="min-h-screen flex items-center justify-center border-t border-[#C9A962]/10 bg-[#0A1628]/90 relative overflow-hidden py-20 backdrop-blur-md"
          >
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none" />
            <div className="container mx-auto px-4 z-10 space-y-20">
              <div className="text-center">
                <h2 className="text-4xl md:text-5xl font-serif text-[#F8F6F1] mb-4">
                  <span className="text-[#2A9D8F]">TMP v0.1</span> Simulation
                </h2>
                <p className="text-gray-400 max-w-2xl mx-auto">
                  Experience the world&apos;s first mathematical consciousness safety system in action. Initialize the
                  sequence to verify Ihsan bounds and safety gates.
                </p>
              </div>
              <TerminalSimulation />

              <div className="pt-20 border-t border-white/5">
                <LayerVisualizer />
              </div>

              <div className="pt-20 border-t border-white/5">
                <TreeVisualization />
              </div>
            </div>
          </div>

          <div id="genesis-dashboard" className="border-t border-[#C9A962]/10">
            <GenesisDashboard />
          </div>

          <div
            id="evidence"
            className="min-h-screen flex items-center justify-center border-t border-[#C9A962]/10 py-20 bg-[#050B14]/95 backdrop-blur-md"
          >
            <EvidencePack />
          </div>
        </div>
      )}
    </main>
  )
}
