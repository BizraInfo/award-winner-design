"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  useLifecycleStore, 
  usePATAgents, 
  useSeedProfile,
  AgentRole 
} from "@/store/use-lifecycle-store"
import { 
  Check, 
  Crown, 
  ChevronRight, 
  ChevronLeft,
  Star,
  Info
} from "lucide-react"

// ============================================
// PAT ONBOARDING - Phase 3: "Your Personal AI Team"
// Introduction to the 7 agents + selection flow
// ============================================

export function PATOnboarding() {
  const [step, setStep] = useState<"intro" | "selection" | "confirmation">("intro")
  const patAgents = usePATAgents()
  const seedProfile = useSeedProfile()
  const selectAgent = useLifecycleStore(s => s.selectAgent)
  const deselectAgent = useLifecycleStore(s => s.deselectAgent)
  const completePATOnboard = useLifecycleStore(s => s.completePATOnboard)
  
  const selectedAgents = useMemo(() => patAgents.filter(a => a.isSelected), [patAgents])
  const primaryAgent = useMemo(() => patAgents.find(a => a.isPrimary), [patAgents])
  const recommendedAgents = useMemo(() => patAgents.filter(a => a.isRecommended), [patAgents])

  const handleAgentToggle = (agentId: AgentRole) => {
    const agent = patAgents.find(a => a.id === agentId)
    if (agent?.isSelected) {
      deselectAgent(agentId)
    } else {
      selectAgent(agentId)
    }
  }

  const handleSetPrimary = (agentId: AgentRole) => {
    selectAgent(agentId, true)
  }

  const canProceed = selectedAgents.length > 0 && !!primaryAgent

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050B14] via-[#0A1628] to-[#050B14] px-4 py-12 overflow-y-auto">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, #C9A962 1px, transparent 1px)`,
          backgroundSize: "60px 60px"
        }} />
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: Introduction */}
        {step === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -50 }}
            className="max-w-4xl mx-auto pt-12 text-center"
          >
            {/* Central Visual */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
              className="relative w-64 h-64 mx-auto mb-12"
            >
              {/* Orbiting Agent Icons */}
              {patAgents.map((agent, i) => {
                const angle = (i / patAgents.length) * Math.PI * 2 - Math.PI / 2
                const radius = 100
                return (
                  <motion.div
                    key={agent.id}
                    className="absolute w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg"
                    style={{
                      backgroundColor: `${agent.color}20`,
                      borderColor: agent.color,
                      borderWidth: 2,
                      left: `calc(50% + ${Math.cos(angle) * radius}px - 28px)`,
                      top: `calc(50% + ${Math.sin(angle) * radius}px - 28px)`
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                  >
                    {agent.icon}
                  </motion.div>
                )
              })}
              
              {/* Center Circle */}
              <motion.div
                className="absolute inset-0 m-auto w-24 h-24 rounded-full bg-[#C9A962]/10 border-2 border-[#C9A962] flex items-center justify-center"
                animate={{ 
                  boxShadow: [
                    "0 0 20px rgba(201,169,98,0.3)",
                    "0 0 40px rgba(201,169,98,0.5)",
                    "0 0 20px rgba(201,169,98,0.3)"
                  ]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <span className="text-3xl font-serif text-[#C9A962]">YOU</span>
              </motion.div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-4xl md:text-5xl font-serif text-[#F8F6F1] mb-6"
            >
              You're not getting <span className="text-[#C9A962]">one assistant</span>.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="text-xl text-gray-300 mb-4"
            >
              You're getting a <strong className="text-[#C9A962]">team of 7</strong> working only for you.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="text-gray-400 max-w-xl mx-auto mb-12"
            >
              Each agent has unique strengths. They work with your data, your preferences, your goals.
              <span className="text-[#2A9D8F]"> No one else can control them.</span>
            </motion.p>

            {/* Info Cards */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-12"
            >
              <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                <div className="text-3xl mb-3">🛡️</div>
                <h3 className="text-white font-medium mb-2">Your Sovereignty</h3>
                <p className="text-sm text-gray-400">They answer only to you. Your data stays yours.</p>
              </div>
              <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                <div className="text-3xl mb-3">🧠</div>
                <h3 className="text-white font-medium mb-2">They Learn You</h3>
                <p className="text-sm text-gray-400">Over time, they understand what works for you.</p>
              </div>
              <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="text-white font-medium mb-2">They Collaborate</h3>
                <p className="text-sm text-gray-400">When you need it, they work together seamlessly.</p>
              </div>
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3 }}
              onClick={() => setStep("selection")}
              className="px-10 py-4 rounded-xl bg-[#C9A962] text-[#050B14] font-bold flex items-center gap-2 mx-auto hover:bg-[#D4AF37] transition-colors shadow-[0_0_30px_rgba(201,169,98,0.3)]"
            >
              Meet Your Team
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}

        {/* STEP 2: Agent Selection */}
        {step === "selection" && (
          <motion.div
            key="selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-6xl mx-auto pt-8"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-serif text-[#F8F6F1] mb-4">
                Choose Your <span className="text-[#C9A962]">Personal Agent Team</span>
              </h2>
              <p className="text-gray-400 max-w-xl mx-auto">
                Select agents that match your needs. Pick a <strong className="text-[#C9A962]">primary agent</strong> to lead your team.
              </p>
            </div>

            {/* Recommendations Banner */}
            {recommendedAgents.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-4 rounded-xl bg-[#2A9D8F]/10 border border-[#2A9D8F]/30 flex items-center gap-4"
              >
                <Star className="w-6 h-6 text-[#2A9D8F] flex-shrink-0" />
                <div>
                  <p className="text-[#2A9D8F] font-medium">Recommended for you</p>
                  <p className="text-sm text-gray-400">
                    Based on your goal of <span className="text-white">{seedProfile.primaryDesire}</span>, 
                    we suggest starting with: {recommendedAgents.map(a => a.name).join(" & ")}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Agent Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-8">
              {patAgents.map((agent, i) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative"
                >
                  {/* Recommended Badge */}
                  {agent.isRecommended && (
                    <div className="absolute -top-2 -right-2 z-10 px-2 py-0.5 rounded-full bg-[#2A9D8F] text-[10px] text-white font-bold">
                      SUGGESTED
                    </div>
                  )}

                  <div
                    onClick={() => handleAgentToggle(agent.id)}
                    className={`cursor-pointer p-5 rounded-xl border-2 transition-all duration-300 h-full ${
                      agent.isSelected
                        ? `bg-[${agent.color}]/10 border-[${agent.color}] shadow-[0_0_20px_${agent.color}40]`
                        : "bg-white/5 border-white/10 hover:border-white/30"
                    }`}
                    style={{
                      backgroundColor: agent.isSelected ? `${agent.color}15` : undefined,
                      borderColor: agent.isSelected ? agent.color : undefined,
                      boxShadow: agent.isSelected ? `0 0 25px ${agent.color}30` : undefined
                    }}
                  >
                    {/* Agent Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div 
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                        style={{ 
                          backgroundColor: `${agent.color}20`,
                          border: `1px solid ${agent.color}40`
                        }}
                      >
                        {agent.icon}
                      </div>
                      {agent.isSelected && (
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: agent.color }}
                        >
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Agent Info */}
                    <h3 className="font-bold text-white mb-1">{agent.name}</h3>
                    <p className="text-xs text-gray-400 mb-3" style={{ color: agent.isSelected ? agent.color : undefined }}>
                      {agent.title}
                    </p>
                    <p className="text-sm text-gray-300 mb-4 line-clamp-2">
                      {agent.description}
                    </p>

                    {/* Capabilities */}
                    <div className="flex flex-wrap gap-1.5">
                      {agent.capabilities.map(cap => (
                        <span 
                          key={cap} 
                          className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-400"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>

                    {/* Primary Button */}
                    {agent.isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSetPrimary(agent.id)
                        }}
                        className={`mt-4 w-full py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                          agent.isPrimary
                            ? "bg-[#C9A962] text-[#050B14]"
                            : "bg-white/10 text-white hover:bg-white/20"
                        }`}
                      >
                        <Crown className="w-4 h-4" />
                        {agent.isPrimary ? "Primary Agent" : "Set as Primary"}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Selection Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-0 left-0 right-0 bg-[#0A1628]/95 backdrop-blur-lg border-t border-white/10 p-4"
            >
              <div className="max-w-6xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => setStep("intro")}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      <span className="text-gray-400">Selected: </span>
                      <span className="text-white font-medium">{selectedAgents.length} agents</span>
                    </div>
                    {primaryAgent && (
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9A962]/20 border border-[#C9A962]/30">
                        <Crown className="w-3 h-3 text-[#C9A962]" />
                        <span className="text-sm text-[#C9A962]">{primaryAgent.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => canProceed && setStep("confirmation")}
                  disabled={!canProceed}
                  className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                    canProceed
                      ? "bg-[#C9A962] text-[#050B14] hover:bg-[#D4AF37] shadow-[0_0_30px_rgba(201,169,98,0.3)]"
                      : "bg-white/10 text-white/30 cursor-not-allowed"
                  }`}
                >
                  Continue
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              {!canProceed && (
                <p className="text-center text-xs text-gray-500 mt-2 flex items-center justify-center gap-1">
                  <Info className="w-3 h-3" />
                  Select at least one agent and set a primary to continue
                </p>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* STEP 3: Confirmation */}
        {step === "confirmation" && (
          <motion.div
            key="confirmation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-2xl mx-auto pt-16 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 100 }}
              className="w-24 h-24 mx-auto mb-8 rounded-full bg-[#C9A962]/20 border-2 border-[#C9A962] flex items-center justify-center"
            >
              <Check className="w-12 h-12 text-[#C9A962]" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl font-serif text-[#F8F6F1] mb-4"
            >
              Your Team is Ready
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-gray-400 mb-8"
            >
              This is your <span className="text-[#C9A962]">Personal Agent Team (PAT)</span>.
              <br />
              They work with your data, your preferences, your goals.
              <br />
              <span className="text-[#2A9D8F]">Only for you; no one else can control them.</span>
            </motion.p>

            {/* Selected Agents Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap justify-center gap-3 mb-12"
            >
              {selectedAgents.map(agent => (
                <div
                  key={agent.id}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border"
                  style={{
                    backgroundColor: `${agent.color}15`,
                    borderColor: `${agent.color}50`
                  }}
                >
                  <span>{agent.icon}</span>
                  <span className="text-sm text-white">{agent.name}</span>
                  {agent.isPrimary && (
                    <Crown className="w-3 h-3 text-[#C9A962]" />
                  )}
                </div>
              ))}
            </motion.div>

            {/* Primary Agent Highlight */}
            {primaryAgent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="p-6 rounded-2xl bg-[#C9A962]/10 border border-[#C9A962]/30 mb-12"
              >
                <div className="flex items-center justify-center gap-3 mb-3">
                  <Crown className="w-5 h-5 text-[#C9A962]" />
                  <span className="text-[#C9A962] font-medium">Your Primary Agent</span>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <div 
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                    style={{ backgroundColor: `${primaryAgent.color}20` }}
                  >
                    {primaryAgent.icon}
                  </div>
                  <div className="text-left">
                    <div className="text-xl font-bold text-white">{primaryAgent.name}</div>
                    <div className="text-sm text-gray-400">{primaryAgent.title}</div>
                  </div>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex gap-4 justify-center"
            >
              <button
                onClick={() => setStep("selection")}
                className="px-6 py-3 rounded-xl border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-all"
              >
                Adjust Team
              </button>
              <button
                onClick={completePATOnboard}
                className="px-10 py-3 rounded-xl bg-[#C9A962] text-[#050B14] font-bold flex items-center gap-2 hover:bg-[#D4AF37] transition-colors shadow-[0_0_30px_rgba(201,169,98,0.3)]"
              >
                Start Working Together
                <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
