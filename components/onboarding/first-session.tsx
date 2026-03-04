"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  useLifecycleStore,
  usePATAgents,
  useSeedProfile,
  useSevenDayPlan
} from "@/store/use-lifecycle-store"
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Calendar,
  CheckCircle2,
  Circle,
  Edit3,
  MessageSquare,
  Target,
  Lightbulb,
  ArrowRight
} from "lucide-react"

// ============================================
// FIRST SESSION - Phase 4: "Fix something real in 7 days"
// Primary PAT agent interaction + 7-day plan creation
// ============================================

// Goal categories with prompts
const GOAL_EXAMPLES = {
  job: [
    "I need to find a better job",
    "I want to update my resume and apply to companies",
    "I need to prepare for interviews"
  ],
  education: [
    "I'm drowning in university work",
    "I need to learn a new skill for my career",
    "I have exams coming and feel unprepared"
  ],
  project: [
    "I want to start a side project",
    "I have an idea I've been putting off",
    "I need to finish something I started"
  ],
  motivation: [
    "I feel lost and unmotivated",
    "I don't know what direction to take",
    "I need to get my life back on track"
  ],
  other: [
    "Something else entirely",
    "I'll describe my own goal"
  ]
}

// Sample 7-day plan structure based on goal category
const PLAN_TEMPLATES: Record<string, { day: number; title: string; bizraHelps: string[]; userActions: string[] }[]> = {
  job: [
    { day: 1, title: "Audit & Reflect", bizraHelps: ["Analyze your current skills", "Identify market demand"], userActions: ["List your top 5 skills", "Write what job excites you"] },
    { day: 2, title: "Resume Refresh", bizraHelps: ["Draft compelling bullet points", "Optimize for ATS"], userActions: ["Gather past work examples", "Review and approve draft"] },
    { day: 3, title: "Target Companies", bizraHelps: ["Research companies that fit", "Find insider insights"], userActions: ["Select 5 dream companies", "Follow them on LinkedIn"] },
    { day: 4, title: "Online Presence", bizraHelps: ["Optimize LinkedIn profile", "Draft professional summary"], userActions: ["Update your photo", "Connect with 3 people"] },
    { day: 5, title: "Application Sprint", bizraHelps: ["Customize cover letters", "Track applications"], userActions: ["Apply to 3 positions", "Note what you learned"] },
    { day: 6, title: "Interview Prep", bizraHelps: ["Prepare common Q&A", "Mock interview practice"], userActions: ["Practice answers aloud", "Research company culture"] },
    { day: 7, title: "Review & Iterate", bizraHelps: ["Analyze what worked", "Adjust strategy"], userActions: ["Celebrate progress", "Set next week's goals"] }
  ],
  education: [
    { day: 1, title: "Map the Challenge", bizraHelps: ["Break down all subjects/topics", "Identify priority areas"], userActions: ["List everything due", "Rate your confidence 1-5"] },
    { day: 2, title: "Create Structure", bizraHelps: ["Design study schedule", "Optimize for your energy"], userActions: ["Block study times", "Prepare your workspace"] },
    { day: 3, title: "Deep Dive #1", bizraHelps: ["Explain difficult concepts", "Create practice questions"], userActions: ["Study for 2 focused hours", "Test yourself"] },
    { day: 4, title: "Deep Dive #2", bizraHelps: ["Connect ideas across topics", "Simplify complex material"], userActions: ["Teach someone what you learned", "Fill knowledge gaps"] },
    { day: 5, title: "Practice & Apply", bizraHelps: ["Generate practice problems", "Grade your work"], userActions: ["Do practice exercises", "Note areas of struggle"] },
    { day: 6, title: "Review & Reinforce", bizraHelps: ["Create summary sheets", "Quiz you on weak areas"], userActions: ["Review all material", "Get good sleep"] },
    { day: 7, title: "Confidence Check", bizraHelps: ["Final review session", "Mental preparation tips"], userActions: ["Light review only", "Trust your preparation"] }
  ],
  project: [
    { day: 1, title: "Vision Clarity", bizraHelps: ["Help define the end goal", "Break into milestones"], userActions: ["Describe your project vision", "Set success criteria"] },
    { day: 2, title: "Resource Audit", bizraHelps: ["List what you need", "Find free resources"], userActions: ["Gather materials", "Clear your schedule"] },
    { day: 3, title: "Foundation Work", bizraHelps: ["Guide first steps", "Troubleshoot blockers"], userActions: ["Complete first milestone", "Document progress"] },
    { day: 4, title: "Build Momentum", bizraHelps: ["Review your work", "Suggest improvements"], userActions: ["Continue building", "Share with one person"] },
    { day: 5, title: "Push Through", bizraHelps: ["Keep you accountable", "Solve problems together"], userActions: ["Work through challenges", "Stay focused"] },
    { day: 6, title: "Polish & Refine", bizraHelps: ["Quality review", "Final adjustments"], userActions: ["Improve what you have", "Prepare to share"] },
    { day: 7, title: "Ship It", bizraHelps: ["Help you publish/share", "Celebrate properly"], userActions: ["Launch or complete", "Reflect on journey"] }
  ],
  motivation: [
    { day: 1, title: "Honest Assessment", bizraHelps: ["Listen without judgment", "Ask clarifying questions"], userActions: ["Write how you really feel", "Identify 3 energy drains"] },
    { day: 2, title: "Values Excavation", bizraHelps: ["Help uncover core values", "Explore what matters"], userActions: ["Answer reflection prompts", "Find patterns"] },
    { day: 3, title: "Small Wins", bizraHelps: ["Suggest tiny achievable tasks", "Celebrate every step"], userActions: ["Complete 3 small tasks", "Notice how it feels"] },
    { day: 4, title: "Environment Reset", bizraHelps: ["Audit your surroundings", "Suggest changes"], userActions: ["Clean one space", "Remove one distraction"] },
    { day: 5, title: "Future Self", bizraHelps: ["Vision exercise", "Write letter from future you"], userActions: ["Imagine your ideal day", "Set one intention"] },
    { day: 6, title: "Build Routines", bizraHelps: ["Design simple routines", "Stack habits"], userActions: ["Try one morning routine", "Note what works"] },
    { day: 7, title: "Direction Emerges", bizraHelps: ["Reflect on the week", "Identify next steps"], userActions: ["Review your progress", "Choose one path forward"] }
  ],
  other: [
    { day: 1, title: "Define Your Goal", bizraHelps: ["Help clarify your objective", "Break it into parts"], userActions: ["Write your goal clearly", "Set success criteria"] },
    { day: 2, title: "Plan the Path", bizraHelps: ["Create action steps", "Identify obstacles"], userActions: ["Approve the plan", "Prepare what you need"] },
    { day: 3, title: "First Steps", bizraHelps: ["Guide your start", "Answer questions"], userActions: ["Take first action", "Note what you learn"] },
    { day: 4, title: "Build Progress", bizraHelps: ["Check in on progress", "Adjust if needed"], userActions: ["Continue working", "Stay consistent"] },
    { day: 5, title: "Overcome Obstacles", bizraHelps: ["Problem-solve together", "Find alternatives"], userActions: ["Push through blocks", "Ask for help"] },
    { day: 6, title: "Refine & Improve", bizraHelps: ["Review what's working", "Optimize approach"], userActions: ["Polish your work", "Prepare for completion"] },
    { day: 7, title: "Celebrate & Plan Next", bizraHelps: ["Acknowledge achievement", "Set future direction"], userActions: ["Complete your goal", "Define next steps"] }
  ]
}

export function FirstSession() {
  const [stage, setStage] = useState<"welcome" | "input" | "plan" | "confirm">("welcome")
  const [goalInput, setGoalInput] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof GOAL_EXAMPLES | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  
  const patAgents = usePATAgents()
  const seedProfile = useSeedProfile()
  const sevenDayPlan = useSevenDayPlan()
  const createSevenDayPlan = useLifecycleStore(s => s.createSevenDayPlan)
  const setPhase = useLifecycleStore(s => s.setPhase)
  
  const primaryAgent = useMemo(() => patAgents.find(a => a.isPrimary), [patAgents])
  
  // Detect category from goal input
  const detectCategory = (text: string): keyof typeof GOAL_EXAMPLES => {
    const lower = text.toLowerCase()
    if (lower.includes("job") || lower.includes("resume") || lower.includes("interview") || lower.includes("career") || lower.includes("work")) return "job"
    if (lower.includes("study") || lower.includes("university") || lower.includes("exam") || lower.includes("learn") || lower.includes("course")) return "education"
    if (lower.includes("project") || lower.includes("build") || lower.includes("create") || lower.includes("start") || lower.includes("side")) return "project"
    if (lower.includes("lost") || lower.includes("motivation") || lower.includes("direction") || lower.includes("stuck") || lower.includes("unmotivated")) return "motivation"
    return "other"
  }

  const handleSubmitGoal = () => {
    const category = selectedCategory || detectCategory(goalInput)
    createSevenDayPlan(goalInput, category)
    setStage("plan")
  }

  const handleConfirmPlan = () => {
    setPhase("DAILY_LOOP")
  }

  // Get the generated plan or create from template
  const planTasks = useMemo(() => {
    if (sevenDayPlan?.tasks && sevenDayPlan.tasks.length > 0) {
      return sevenDayPlan.tasks
    }
    const category = selectedCategory || detectCategory(goalInput) || "other"
    return PLAN_TEMPLATES[category] || PLAN_TEMPLATES.other
  }, [sevenDayPlan, selectedCategory, goalInput])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050B14] via-[#0A1628] to-[#050B14]">
      {/* Background */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, #C9A962 1px, transparent 1px)`,
          backgroundSize: "50px 50px"
        }} />
      </div>

      <AnimatePresence mode="wait">
        {/* WELCOME: "Let's fix something real" */}
        {stage === "welcome" && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -30 }}
            className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
          >
            {/* Primary Agent Avatar */}
            {primaryAgent && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 100 }}
                className="mb-8"
              >
                <div 
                  className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl shadow-2xl"
                  style={{ 
                    backgroundColor: `${primaryAgent.color}20`,
                    border: `2px solid ${primaryAgent.color}`
                  }}
                >
                  {primaryAgent.icon}
                </div>
                <div className="mt-3 text-center">
                  <div className="text-sm text-gray-400">Your Primary Agent</div>
                  <div className="text-white font-medium">{primaryAgent.name}</div>
                </div>
              </motion.div>
            )}

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl font-serif text-[#F8F6F1] mb-6"
            >
              Let's take <span className="text-[#C9A962]">one thing</span>
              <br />from your life
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-xl text-gray-300 mb-12"
            >
              and make it better in <span className="text-[#2A9D8F] font-bold">7 days</span>.
            </motion.p>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              onClick={() => setStage("input")}
              className="px-10 py-4 rounded-xl bg-[#C9A962] text-[#050B14] font-bold flex items-center gap-2 hover:bg-[#D4AF37] transition-colors shadow-[0_0_30px_rgba(201,169,98,0.3)]"
            >
              <Target className="w-5 h-5" />
              Set My Goal
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}

        {/* INPUT: Goal conversation */}
        {stage === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col px-4 py-12 max-w-3xl mx-auto"
          >
            {/* Chat-like interface with primary agent */}
            <div className="flex-1 space-y-6">
              {/* Agent Message */}
              {primaryAgent && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-4"
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ 
                      backgroundColor: `${primaryAgent.color}20`,
                      border: `1px solid ${primaryAgent.color}40`
                    }}
                  >
                    {primaryAgent.icon}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-400 mb-1">{primaryAgent.name}</div>
                    <div className="p-4 rounded-2xl rounded-tl-sm bg-white/5 border border-white/10">
                      <p className="text-white leading-relaxed">
                        Tell me one problem or goal that really matters to you this week. 
                        <span className="text-gray-400"> Don't overthink it — what's been on your mind?</span>
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Quick Suggestions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="pl-16"
              >
                <div className="text-xs text-gray-500 mb-3 flex items-center gap-2">
                  <Lightbulb className="w-3 h-3" />
                  Quick starts (tap one or write your own):
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(GOAL_EXAMPLES).slice(0, 4).flatMap(([cat, examples]) => 
                    examples.slice(0, 1).map(example => (
                      <button
                        key={example}
                        onClick={() => {
                          setGoalInput(example)
                          setSelectedCategory(cat as keyof typeof GOAL_EXAMPLES)
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                          goalInput === example 
                            ? "bg-[#C9A962]/20 border-[#C9A962] text-[#C9A962]"
                            : "bg-white/5 border border-white/10 text-gray-400 hover:border-white/30"
                        }`}
                      >
                        {example}
                      </button>
                    ))
                  )}
                </div>
              </motion.div>

              {/* User Input */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="pl-16"
              >
                <div className="relative">
                  <textarea
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    placeholder="What's weighing on you? What do you want to change?"
                    rows={4}
                    className="w-full p-4 pr-14 rounded-2xl bg-[#C9A962]/5 border-2 border-[#C9A962]/30 text-white placeholder:text-gray-500 focus:border-[#C9A962] focus:outline-none transition-colors resize-none"
                  />
                  <button
                    onClick={handleSubmitGoal}
                    disabled={goalInput.length < 10}
                    className={`absolute right-3 bottom-3 p-3 rounded-xl transition-all ${
                      goalInput.length >= 10
                        ? "bg-[#C9A962] text-[#050B14] hover:bg-[#D4AF37]"
                        : "bg-white/10 text-white/30 cursor-not-allowed"
                    }`}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-right">
                  {goalInput.length < 10 
                    ? `${10 - goalInput.length} more characters`
                    : "Press enter or click arrow to continue"
                  }
                </p>
              </motion.div>
            </div>

            {/* Back button */}
            <button
              onClick={() => setStage("welcome")}
              className="mt-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors mx-auto"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          </motion.div>
        )}

        {/* PLAN: Show the 7-day plan */}
        {stage === "plan" && (
          <motion.div
            key="plan"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen px-4 py-12 max-w-4xl mx-auto"
          >
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <div className="flex items-center justify-center gap-2 text-[#2A9D8F] text-sm mb-3">
                <Calendar className="w-4 h-4" />
                Your 7-Day Plan
              </div>
              <h2 className="text-3xl font-serif text-white mb-2">
                Here's how we'll tackle this
              </h2>
              <p className="text-gray-400">
                "{goalInput}"
              </p>
            </motion.div>

            {/* Plan Timeline */}
            <div className="relative">
              {/* Vertical Line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#C9A962] via-[#2A9D8F] to-[#C9A962]" />

              {/* Days */}
              <div className="space-y-6">
                {planTasks.map((task, i) => (
                  <motion.div
                    key={task.day || i + 1}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className="relative pl-16"
                  >
                    {/* Day Circle */}
                    <div 
                      className="absolute left-0 w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-sm"
                      style={{
                        backgroundColor: i === 0 ? "#C9A962" : "transparent",
                        borderColor: i === 0 ? "#C9A962" : "#C9A962",
                        color: i === 0 ? "#050B14" : "#C9A962"
                      }}
                    >
                      D{task.day || i + 1}
                    </div>

                    {/* Task Card */}
                    <div className={`p-5 rounded-xl border transition-all ${
                      i === 0 
                        ? "bg-[#C9A962]/10 border-[#C9A962]/50" 
                        : "bg-white/5 border-white/10"
                    }`}>
                      <h3 className="font-bold text-white mb-3">{task.title}</h3>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* BIZRA Helps */}
                        <div>
                          <div className="text-xs text-[#2A9D8F] font-medium mb-2 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            BIZRA helps you:
                          </div>
                          <ul className="space-y-1">
                            {task.bizraHelps.map((help, j) => (
                              <li key={j} className="text-sm text-gray-400 flex items-start gap-2">
                                <Circle className="w-1.5 h-1.5 mt-1.5 fill-[#2A9D8F] text-[#2A9D8F] flex-shrink-0" />
                                {help}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* User Actions */}
                        <div>
                          <div className="text-xs text-[#C9A962] font-medium mb-2 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            You do:
                          </div>
                          <ul className="space-y-1">
                            {task.userActions.map((action, j) => (
                              <li key={j} className="text-sm text-gray-400 flex items-start gap-2">
                                <Circle className="w-1.5 h-1.5 mt-1.5 fill-[#C9A962] text-[#C9A962] flex-shrink-0" />
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Confirmation */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-12 p-6 rounded-2xl bg-white/5 border border-white/10 text-center"
            >
              <h3 className="text-xl font-serif text-white mb-3">
                Does this feel <span className="text-[#C9A962]">realistic</span>?
              </h3>
              <p className="text-gray-400 mb-6">
                We can adjust the plan anytime. You're in control.
              </p>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setStage("input")}
                  className="px-6 py-3 rounded-xl border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-all flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Adjust Goal
                </button>
                <button
                  onClick={handleConfirmPlan}
                  className="px-10 py-3 rounded-xl bg-[#C9A962] text-[#050B14] font-bold flex items-center gap-2 hover:bg-[#D4AF37] transition-colors shadow-[0_0_30px_rgba(201,169,98,0.3)]"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Let's Do This
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
