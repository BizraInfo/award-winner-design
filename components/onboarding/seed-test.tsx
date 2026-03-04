"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useLifecycleStore } from "@/store/use-lifecycle-store"
import { 
  Briefcase, 
  BookOpen, 
  Rocket, 
  Brain, 
  Compass,
  Clock,
  Laptop,
  Wifi,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Check
} from "lucide-react"

// ============================================
// SEED TEST - Phase 2: "Plant Your First Seed"
// The 3-5 question flow that builds their initial profile
// ============================================

interface QuestionOption {
  id: string
  label: string
  description: string
  icon: React.ReactNode
}

const DESIRE_OPTIONS: QuestionOption[] = [
  {
    id: "income",
    label: "More Income",
    description: "Find ways to earn, build value, increase financial freedom",
    icon: <Briefcase className="w-6 h-6" />
  },
  {
    id: "skills",
    label: "Better Skills",
    description: "Learn new abilities, deepen expertise, grow professionally",
    icon: <BookOpen className="w-6 h-6" />
  },
  {
    id: "project",
    label: "Finish a Project",
    description: "Complete something meaningful that's been waiting",
    icon: <Rocket className="w-6 h-6" />
  },
  {
    id: "clarity",
    label: "Mental Clarity",
    description: "Clear the fog, reduce overwhelm, find peace",
    icon: <Brain className="w-6 h-6" />
  },
  {
    id: "future",
    label: "Plan My Future",
    description: "See the path ahead, make strategic decisions",
    icon: <Compass className="w-6 h-6" />
  }
]

const TIME_OPTIONS = [
  { hours: 2, label: "1-2 hours", description: "A few focused moments" },
  { hours: 5, label: "3-5 hours", description: "A solid block per week" },
  { hours: 10, label: "5-10 hours", description: "Serious commitment" },
  { hours: 20, label: "10-20 hours", description: "Major time investment" },
  { hours: 40, label: "20+ hours", description: "Full dedication" }
]

export function SeedTest() {
  const [step, setStep] = useState(0)
  const updateSeedProfile = useLifecycleStore(s => s.updateSeedProfile)
  const completeSeedTest = useLifecycleStore(s => s.completeSeedTest)
  const seedProfile = useLifecycleStore(s => s.seedProfile)

  const [localState, setLocalState] = useState({
    primaryDesire: seedProfile.primaryDesire,
    weeklyHours: seedProfile.weeklyHours,
    hasComputer: seedProfile.existingAssets.hasComputer,
    hasInternet: seedProfile.existingAssets.hasInternet,
    skills: seedProfile.existingAssets.skills.join(", "),
    primaryStressor: seedProfile.primaryStressor || ""
  })

  const totalSteps = 4

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1)
    } else {
      // Complete the test
      updateSeedProfile({
        primaryDesire: localState.primaryDesire as any,
        weeklyHours: localState.weeklyHours,
        existingAssets: {
          skills: localState.skills.split(",").map(s => s.trim()).filter(Boolean),
          hasComputer: localState.hasComputer,
          hasInternet: localState.hasInternet,
          other: ""
        },
        primaryStressor: localState.primaryStressor
      })
      completeSeedTest()
    }
  }

  const handleBack = () => {
    if (step > 0) setStep(step - 1)
  }

  const canProceed = () => {
    switch (step) {
      case 0: return !!localState.primaryDesire
      case 1: return localState.weeklyHours !== null
      case 2: return localState.hasComputer || localState.hasInternet
      case 3: return localState.primaryStressor.length > 10
      default: return false
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050B14] via-[#0A1628] to-[#050B14] flex flex-col items-center justify-center px-4 py-12">
      {/* Sacred Background Pattern */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, #C9A962 1px, transparent 1px)`,
          backgroundSize: "40px 40px"
        }} />
      </div>

      {/* Progress Indicator */}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <motion.div
            key={i}
            className={`h-1 rounded-full transition-all duration-500 ${
              i <= step ? "bg-[#C9A962]" : "bg-white/10"
            }`}
            animate={{ width: i === step ? 40 : 20 }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 0: What do you most want? */}
        {step === 0 && (
          <motion.div
            key="step-0"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="max-w-2xl w-full text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-16 h-16 mx-auto mb-8 rounded-full bg-[#C9A962]/10 border border-[#C9A962]/30 flex items-center justify-center"
            >
              <Sparkles className="w-8 h-8 text-[#C9A962]" />
            </motion.div>

            <h2 className="text-3xl md:text-4xl font-serif text-[#F8F6F1] mb-4">
              What do you <span className="text-[#C9A962]">most want</span> right now?
            </h2>
            <p className="text-gray-400 mb-12">
              Be honest. This helps your Personal Agent Team understand where to focus.
            </p>

            <div className="grid gap-4">
              {DESIRE_OPTIONS.map((option, i) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i }}
                  onClick={() => setLocalState(s => ({ ...s, primaryDesire: option.id as any }))}
                  className={`w-full p-5 rounded-xl border transition-all duration-300 text-left flex items-center gap-5 group ${
                    localState.primaryDesire === option.id
                      ? "bg-[#C9A962]/10 border-[#C9A962] shadow-[0_0_30px_rgba(201,169,98,0.2)]"
                      : "bg-white/5 border-white/10 hover:border-white/30"
                  }`}
                >
                  <div className={`p-3 rounded-lg transition-colors ${
                    localState.primaryDesire === option.id
                      ? "bg-[#C9A962] text-[#050B14]"
                      : "bg-white/10 text-white/60 group-hover:text-white"
                  }`}>
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${
                      localState.primaryDesire === option.id ? "text-[#C9A962]" : "text-white"
                    }`}>
                      {option.label}
                    </div>
                    <div className="text-sm text-gray-400">{option.description}</div>
                  </div>
                  {localState.primaryDesire === option.id && (
                    <Check className="w-5 h-5 text-[#C9A962]" />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 1: How much time can you give? */}
        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="max-w-2xl w-full text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-16 h-16 mx-auto mb-8 rounded-full bg-[#2A9D8F]/10 border border-[#2A9D8F]/30 flex items-center justify-center"
            >
              <Clock className="w-8 h-8 text-[#2A9D8F]" />
            </motion.div>

            <h2 className="text-3xl md:text-4xl font-serif text-[#F8F6F1] mb-4">
              How much time can you give <span className="text-[#2A9D8F]">per week</span>?
            </h2>
            <p className="text-gray-400 mb-12">
              No judgment. We'll work with what you have.
            </p>

            <div className="grid gap-4">
              {TIME_OPTIONS.map((option, i) => (
                <motion.button
                  key={option.hours}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i }}
                  onClick={() => setLocalState(s => ({ ...s, weeklyHours: option.hours }))}
                  className={`w-full p-5 rounded-xl border transition-all duration-300 text-left flex items-center justify-between ${
                    localState.weeklyHours === option.hours
                      ? "bg-[#2A9D8F]/10 border-[#2A9D8F] shadow-[0_0_30px_rgba(42,157,143,0.2)]"
                      : "bg-white/5 border-white/10 hover:border-white/30"
                  }`}
                >
                  <div>
                    <div className={`font-medium ${
                      localState.weeklyHours === option.hours ? "text-[#2A9D8F]" : "text-white"
                    }`}>
                      {option.label}
                    </div>
                    <div className="text-sm text-gray-400">{option.description}</div>
                  </div>
                  {localState.weeklyHours === option.hours && (
                    <Check className="w-5 h-5 text-[#2A9D8F]" />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 2: What do you already have? */}
        {step === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="max-w-2xl w-full text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-16 h-16 mx-auto mb-8 rounded-full bg-[#E76F51]/10 border border-[#E76F51]/30 flex items-center justify-center"
            >
              <Laptop className="w-8 h-8 text-[#E76F51]" />
            </motion.div>

            <h2 className="text-3xl md:text-4xl font-serif text-[#F8F6F1] mb-4">
              What do you <span className="text-[#E76F51]">already have</span>?
            </h2>
            <p className="text-gray-400 mb-12">
              Let's see what we're working with.
            </p>

            <div className="space-y-6">
              {/* Basic resources */}
              <div className="flex gap-4 justify-center">
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  onClick={() => setLocalState(s => ({ ...s, hasComputer: !s.hasComputer }))}
                  className={`flex-1 max-w-[180px] p-6 rounded-xl border transition-all ${
                    localState.hasComputer
                      ? "bg-[#E76F51]/10 border-[#E76F51]"
                      : "bg-white/5 border-white/10 hover:border-white/30"
                  }`}
                >
                  <Laptop className={`w-8 h-8 mx-auto mb-3 ${
                    localState.hasComputer ? "text-[#E76F51]" : "text-white/60"
                  }`} />
                  <div className={localState.hasComputer ? "text-[#E76F51]" : "text-white/60"}>
                    Computer / Phone
                  </div>
                </motion.button>

                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  onClick={() => setLocalState(s => ({ ...s, hasInternet: !s.hasInternet }))}
                  className={`flex-1 max-w-[180px] p-6 rounded-xl border transition-all ${
                    localState.hasInternet
                      ? "bg-[#E76F51]/10 border-[#E76F51]"
                      : "bg-white/5 border-white/10 hover:border-white/30"
                  }`}
                >
                  <Wifi className={`w-8 h-8 mx-auto mb-3 ${
                    localState.hasInternet ? "text-[#E76F51]" : "text-white/60"
                  }`} />
                  <div className={localState.hasInternet ? "text-[#E76F51]" : "text-white/60"}>
                    Internet Access
                  </div>
                </motion.button>
              </div>

              {/* Skills input */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-left"
              >
                <label className="block text-sm text-gray-400 mb-2">
                  Any skills you're proud of? (optional)
                </label>
                <input
                  type="text"
                  value={localState.skills}
                  onChange={(e) => setLocalState(s => ({ ...s, skills: e.target.value }))}
                  placeholder="e.g., writing, coding, design, teaching..."
                  className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#E76F51] focus:outline-none transition-colors"
                />
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Step 3: What stresses you most? */}
        {step === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="max-w-2xl w-full text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-16 h-16 mx-auto mb-8 rounded-full bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 flex items-center justify-center"
            >
              <Brain className="w-8 h-8 text-[#8B5CF6]" />
            </motion.div>

            <h2 className="text-3xl md:text-4xl font-serif text-[#F8F6F1] mb-4">
              What <span className="text-[#8B5CF6]">stresses you</span> most right now?
            </h2>
            <p className="text-gray-400 mb-12">
              This stays between you and your agents. We want to help.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <textarea
                value={localState.primaryStressor}
                onChange={(e) => setLocalState(s => ({ ...s, primaryStressor: e.target.value }))}
                placeholder="Share what's weighing on you... We're here to help lighten that load."
                rows={5}
                className="w-full p-5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#8B5CF6] focus:outline-none transition-colors resize-none"
              />
              <div className="text-right text-sm text-gray-500 mt-2">
                {localState.primaryStressor.length < 10 
                  ? `${10 - localState.primaryStressor.length} more characters needed`
                  : <span className="text-[#8B5CF6]">✓ Ready to continue</span>
                }
              </div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-gray-500 mt-8"
            >
              Your data stays with you. BIZRA doesn't sell or share your personal information.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4"
      >
        {step > 0 && (
          <button
            onClick={handleBack}
            className="px-6 py-3 rounded-xl border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-all flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        )}
        
        <button
          onClick={handleNext}
          disabled={!canProceed()}
          className={`px-8 py-3 rounded-xl font-medium flex items-center gap-2 transition-all ${
            canProceed()
              ? "bg-[#C9A962] text-[#050B14] hover:bg-[#D4AF37] shadow-[0_0_30px_rgba(201,169,98,0.3)]"
              : "bg-white/10 text-white/30 cursor-not-allowed"
          }`}
        >
          {step === totalSteps - 1 ? "Meet Your Team" : "Continue"}
          <ChevronRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  )
}
