"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  useLifecycleStore,
  useNodeStatus,
  useLegacyRecord
} from "@/store/use-lifecycle-store"
import {
  Server,
  Cpu,
  HardDrive,
  Clock,
  Zap,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Shield,
  Coins,
  BarChart3,
  Settings,
  Check,
  AlertCircle,
  Gift
} from "lucide-react"

// ============================================
// NODE ACTIVATION - Phase 6: "Become part of the network"
// Resource sharing, PoI dashboard, contribution tracking
// ============================================

type NodeView = "intro" | "settings" | "dashboard"

export function NodeActivation() {
  const [view, setView] = useState<NodeView>("intro")
  const [localSettings, setLocalSettings] = useState({
    cpuShare: 20,
    gpuShare: 0,
    storageShare: 10,
    alwaysAvailable: true,
    startHour: 0,
    endHour: 24
  })
  
  const nodeStatus = useNodeStatus()
  const legacyRecord = useLegacyRecord()
  const activateNode = useLifecycleStore(s => s.activateNode)
  const updateNodeSettings = useLifecycleStore(s => s.updateNodeSettings)
  const setPhase = useLifecycleStore(s => s.setPhase)

  const handleActivate = () => {
    activateNode({
      cpuShare: localSettings.cpuShare,
      gpuShare: localSettings.gpuShare,
      storageShare: localSettings.storageShare,
      alwaysAvailable: localSettings.alwaysAvailable,
      availableHours: [localSettings.startHour, localSettings.endHour]
    })
    setView("dashboard")
  }

  // If already active, go straight to dashboard
  if (nodeStatus.isActive && view === "intro") {
    setView("dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050B14] via-[#0A1628] to-[#050B14]">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, #2A9D8F 1px, transparent 1px)`,
          backgroundSize: "40px 40px"
        }} />
      </div>

      <AnimatePresence mode="wait">
        {/* INTRO: "Do you want to become a Node?" */}
        {view === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 100 }}
              className="mb-8"
            >
              <div className="w-24 h-24 rounded-2xl bg-[#2A9D8F]/20 border-2 border-[#2A9D8F] flex items-center justify-center">
                <Server className="w-12 h-12 text-[#2A9D8F]" />
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl font-serif text-[#F8F6F1] mb-6"
            >
              Become a <span className="text-[#2A9D8F]">Node</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-xl text-gray-300 max-w-xl mb-4"
            >
              Earn by contributing what you already have —
              <br />
              your device, your knowledge, your work.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-gray-400 mb-12"
            >
              No pressure. You decide how much to share.
            </motion.p>

            {/* Benefits */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="grid md:grid-cols-3 gap-6 max-w-3xl mb-12"
            >
              <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                <Coins className="w-8 h-8 text-[#C9A962] mb-4" />
                <h3 className="text-white font-medium mb-2">Earn Impact Tokens</h3>
                <p className="text-sm text-gray-400">
                  Your contributions are tracked and rewarded fairly.
                </p>
              </div>
              <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                <Shield className="w-8 h-8 text-[#2A9D8F] mb-4" />
                <h3 className="text-white font-medium mb-2">Your Sovereignty</h3>
                <p className="text-sm text-gray-400">
                  You control what you share. Opt out anytime.
                </p>
              </div>
              <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                <Gift className="w-8 h-8 text-[#8B5CF6] mb-4" />
                <h3 className="text-white font-medium mb-2">Help Others Grow</h3>
                <p className="text-sm text-gray-400">
                  Your resources help train and run the network.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="flex gap-4"
            >
              <button
                onClick={() => setPhase("DAILY_LOOP")}
                className="px-6 py-3 rounded-xl border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-all"
              >
                Maybe Later
              </button>
              <button
                onClick={() => setView("settings")}
                className="px-10 py-3 rounded-xl bg-[#2A9D8F] text-white font-bold flex items-center gap-2 hover:bg-[#238B7D] transition-colors shadow-[0_0_30px_rgba(42,157,143,0.3)]"
              >
                Configure Node
                <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* SETTINGS: Configure resource sharing */}
        {view === "settings" && (
          <motion.div
            key="settings"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen px-4 py-12 max-w-2xl mx-auto"
          >
            <button
              onClick={() => setView("intro")}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <div className="mb-8">
              <h1 className="text-3xl font-serif text-white mb-2">Node Configuration</h1>
              <p className="text-gray-400">Decide what you want to contribute</p>
            </div>

            <div className="space-y-8">
              {/* CPU Share */}
              <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <Cpu className="w-5 h-5 text-[#C9A962]" />
                  <span className="text-white font-medium">CPU Share</span>
                  <span className="ml-auto text-[#C9A962] font-bold">{localSettings.cpuShare}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={localSettings.cpuShare}
                  onChange={(e) => setLocalSettings(s => ({ ...s, cpuShare: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#C9A962]"
                />
                <p className="text-xs text-gray-500 mt-2">
                  How much processing power to share when idle
                </p>
              </div>

              {/* GPU Share */}
              <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-5 h-5 text-[#E76F51]" />
                  <span className="text-white font-medium">GPU Share</span>
                  <span className="ml-auto text-[#E76F51] font-bold">{localSettings.gpuShare}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={localSettings.gpuShare}
                  onChange={(e) => setLocalSettings(s => ({ ...s, gpuShare: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#E76F51]"
                />
                <p className="text-xs text-gray-500 mt-2">
                  GPU helps with AI training (higher rewards)
                </p>
              </div>

              {/* Storage Share */}
              <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <HardDrive className="w-5 h-5 text-[#2A9D8F]" />
                  <span className="text-white font-medium">Storage Share</span>
                  <span className="ml-auto text-[#2A9D8F] font-bold">{localSettings.storageShare} GB</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={localSettings.storageShare}
                  onChange={(e) => setLocalSettings(s => ({ ...s, storageShare: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#2A9D8F]"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Disk space for distributed storage
                </p>
              </div>

              {/* Availability */}
              <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-[#8B5CF6]" />
                    <span className="text-white font-medium">Availability</span>
                  </div>
                  <button
                    onClick={() => setLocalSettings(s => ({ ...s, alwaysAvailable: !s.alwaysAvailable }))}
                    className={`w-14 h-7 rounded-full transition-colors ${
                      localSettings.alwaysAvailable ? "bg-[#8B5CF6]" : "bg-white/20"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform mx-1 ${
                      localSettings.alwaysAvailable ? "translate-x-7" : "translate-x-0"
                    }`} />
                  </button>
                </div>
                <p className="text-sm text-gray-400">
                  {localSettings.alwaysAvailable 
                    ? "Your node is available 24/7 (when device is on)"
                    : "Set specific hours when your node is available"
                  }
                </p>
                
                {!localSettings.alwaysAvailable && (
                  <div className="flex gap-4 mt-4">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 block mb-1">From</label>
                      <select 
                        value={localSettings.startHour}
                        onChange={(e) => setLocalSettings(s => ({ ...s, startHour: parseInt(e.target.value) }))}
                        className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white"
                      >
                        {Array.from({ length: 24 }).map((_, i) => (
                          <option key={i} value={i}>{i}:00</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 block mb-1">To</label>
                      <select 
                        value={localSettings.endHour}
                        onChange={(e) => setLocalSettings(s => ({ ...s, endHour: parseInt(e.target.value) }))}
                        className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white"
                      >
                        {Array.from({ length: 24 }).map((_, i) => (
                          <option key={i} value={i + 1}>{i + 1}:00</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Activate Button */}
              <button
                onClick={handleActivate}
                className="w-full py-4 rounded-xl bg-[#2A9D8F] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#238B7D] transition-colors shadow-[0_0_30px_rgba(42,157,143,0.3)]"
              >
                <Server className="w-5 h-5" />
                Activate Node
              </button>

              <p className="text-center text-sm text-gray-500">
                You can change these settings anytime
              </p>
            </div>
          </motion.div>
        )}

        {/* DASHBOARD: Node is active */}
        {view === "dashboard" && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen px-4 py-8"
          >
            {/* Header */}
            <div className="max-w-6xl mx-auto flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 rounded-full bg-[#2A9D8F] animate-pulse" />
                  <span className="text-[#2A9D8F] text-sm font-medium">NODE ACTIVE</span>
                </div>
                <h1 className="text-3xl font-serif text-white">Your Genesis Node</h1>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setPhase("COMMUNITY")}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  Community
                </button>
                <button
                  onClick={() => setView("settings")}
                  className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="max-w-6xl mx-auto">
              {/* Stats Grid */}
              <div className="grid md:grid-cols-4 gap-4 mb-8">
                <div className="p-5 rounded-xl bg-[#2A9D8F]/10 border border-[#2A9D8F]/30">
                  <div className="text-sm text-gray-400 mb-1">Tasks Contributed</div>
                  <div className="text-3xl font-bold text-[#2A9D8F]">
                    {nodeStatus.contributions.tasksCompleted}
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-[#C9A962]/10 border border-[#C9A962]/30">
                  <div className="text-sm text-gray-400 mb-1">Impact Tokens</div>
                  <div className="text-3xl font-bold text-[#C9A962]">
                    {nodeStatus.contributions.impactTokens.toLocaleString()}
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/30">
                  <div className="text-sm text-gray-400 mb-1">Models Refined</div>
                  <div className="text-3xl font-bold text-[#8B5CF6]">
                    {nodeStatus.contributions.modelsRefined}
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-sm text-gray-400 mb-1">Network Rank</div>
                  <div className="text-3xl font-bold text-white">#--</div>
                </div>
              </div>

              {/* Resource Status */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Cpu className="w-5 h-5 text-[#C9A962]" />
                      <span className="text-white">CPU</span>
                    </div>
                    <span className="text-[#C9A962] font-mono">{nodeStatus.resourceSettings.cpuShare}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#C9A962] rounded-full"
                      style={{ width: `${nodeStatus.resourceSettings.cpuShare}%` }}
                    />
                  </div>
                </div>

                <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-[#E76F51]" />
                      <span className="text-white">GPU</span>
                    </div>
                    <span className="text-[#E76F51] font-mono">{nodeStatus.resourceSettings.gpuShare}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#E76F51] rounded-full"
                      style={{ width: `${nodeStatus.resourceSettings.gpuShare}%` }}
                    />
                  </div>
                </div>

                <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <HardDrive className="w-5 h-5 text-[#2A9D8F]" />
                      <span className="text-white">Storage</span>
                    </div>
                    <span className="text-[#2A9D8F] font-mono">{nodeStatus.resourceSettings.storageShare} GB</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#2A9D8F] rounded-full"
                      style={{ width: `${(nodeStatus.resourceSettings.storageShare / 100) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Weekly Activity */}
              <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-medium flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#2A9D8F]" />
                    Weekly Activity
                  </h3>
                  <span className="text-sm text-gray-400">Last 12 weeks</span>
                </div>

                {nodeStatus.contributions.weeklyStats.length > 0 ? (
                  <div className="flex items-end gap-2 h-32">
                    {nodeStatus.contributions.weeklyStats.map((week, i) => (
                      <div key={week.week} className="flex-1 flex flex-col items-center">
                        <div 
                          className="w-full bg-[#2A9D8F] rounded-t"
                          style={{ height: `${Math.min(100, week.tasks * 10)}%` }}
                        />
                        <div className="text-[10px] text-gray-500 mt-1">W{i + 1}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center text-gray-500">
                    <p>Activity will appear here as you contribute</p>
                  </div>
                )}
              </div>

              {/* Back to Daily Loop */}
              <div className="mt-8 text-center">
                <button
                  onClick={() => setPhase("DAILY_LOOP")}
                  className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 mx-auto"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Dashboard
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
