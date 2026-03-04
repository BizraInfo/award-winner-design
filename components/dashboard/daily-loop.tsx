"use client"

import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  useLifecycleStore,
  usePATAgents,
  useSevenDayPlan,
  useLegacyRecord
} from "@/store/use-lifecycle-store"
import {
  Calendar,
  CheckCircle2,
  Circle,
  Sun,
  Moon,
  Coffee,
  Flame,
  MessageSquare,
  BookOpen,
  Lightbulb,
  Heart,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Clock,
  TrendingUp,
  Zap,
  Brain,
  Target,
  Home,
  Users,
  Settings,
  BarChart3
} from "lucide-react"

// ============================================
// DAILY LOOP - Phase 5: "Living with BIZRA"
// Daily check-in, work sessions, memory, reflection
// ============================================

type DailyView = "home" | "checkin" | "work" | "memory" | "reflection"

const MOOD_OPTIONS = [
  { id: "great", emoji: "😊", label: "Great", color: "#2A9D8F" },
  { id: "good", emoji: "🙂", label: "Good", color: "#C9A962" },
  { id: "okay", emoji: "😐", label: "Okay", color: "#E9C46A" },
  { id: "rough", emoji: "😔", label: "Rough", color: "#E76F51" },
  { id: "struggling", emoji: "😢", label: "Struggling", color: "#8B5CF6" }
]

const TIME_GREETINGS = {
  morning: { greeting: "Good morning", icon: Sun, message: "Ready to make today count?" },
  afternoon: { greeting: "Good afternoon", icon: Coffee, message: "How's the day going?" },
  evening: { greeting: "Good evening", icon: Moon, message: "Let's review and wind down." }
}

export function DailyLoop() {
  const [view, setView] = useState<DailyView>("home")
  const [checkInData, setCheckInData] = useState({
    mood: "",
    yesterday: "",
    todayFocus: "",
    blockers: ""
  })
  const [workSessionActive, setWorkSessionActive] = useState(false)
  const [sessionMinutes, setSessionMinutes] = useState(0)
  
  const patAgents = usePATAgents()
  const sevenDayPlan = useSevenDayPlan()
  const legacyRecord = useLegacyRecord()
  const recordCheckIn = useLifecycleStore(s => s.recordCheckIn)
  const streakDays = useLifecycleStore(s => s.streakDays)
  const setPhase = useLifecycleStore(s => s.setPhase)
  
  const primaryAgent = useMemo(() => patAgents.find(a => a.isPrimary), [patAgents])
  const selectedAgents = useMemo(() => patAgents.filter(a => a.isSelected), [patAgents])

  // Time of day
  const timeOfDay = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return "morning"
    if (hour < 17) return "afternoon"
    return "evening"
  }, [])
  
  const timeGreeting = TIME_GREETINGS[timeOfDay]
  const GreetingIcon = timeGreeting.icon

  // Current day in plan
  const currentPlanDay = sevenDayPlan?.currentDay || 1
  const todayTask = sevenDayPlan?.tasks?.[currentPlanDay - 1]

  // Work session timer
  useEffect(() => {
    if (!workSessionActive) return
    const interval = setInterval(() => {
      setSessionMinutes(m => m + 1)
    }, 60000) // Every minute
    return () => clearInterval(interval)
  }, [workSessionActive])

  const handleCheckInSubmit = () => {
    recordCheckIn()
    setView("home")
  }

  return (
    <div className="min-h-screen bg-[#0A0E14] text-white">
      {/* Sidebar Navigation */}
      <div className="fixed left-0 top-0 h-full w-20 bg-[#12161C] border-r border-white/5 flex flex-col items-center py-6 z-50">
        {/* Logo */}
        <div className="w-10 h-10 rounded-xl bg-[#C9A962]/20 border border-[#C9A962]/30 flex items-center justify-center text-lg mb-8">
          ⬢
        </div>

        {/* Nav Items */}
        <nav className="flex-1 flex flex-col items-center gap-2">
          {[
            { id: "home", icon: Home, label: "Home" },
            { id: "checkin", icon: Calendar, label: "Check-in" },
            { id: "work", icon: Zap, label: "Work" },
            { id: "memory", icon: Brain, label: "Memory" },
            { id: "reflection", icon: Heart, label: "Reflect" }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id as DailyView)}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                view === item.id
                  ? "bg-[#C9A962]/20 text-[#C9A962]"
                  : "text-gray-500 hover:text-white hover:bg-white/5"
              }`}
              title={item.label}
            >
              <item.icon className="w-5 h-5" />
            </button>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => setPhase("NODE_ACTIVATION")}
            className="w-12 h-12 rounded-xl flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all"
            title="Become a Node"
          >
            <Users className="w-5 h-5" />
          </button>
          <button 
            className="w-12 h-12 rounded-xl flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="ml-20 min-h-screen">
        <AnimatePresence mode="wait">
          {/* HOME VIEW */}
          {view === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 max-w-5xl mx-auto"
            >
              {/* Greeting Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="flex items-center gap-3 text-gray-400 text-sm mb-1">
                    <GreetingIcon className="w-4 h-4" />
                    {timeGreeting.greeting}
                  </div>
                  <h1 className="text-3xl font-serif text-white">
                    {timeGreeting.message}
                  </h1>
                </div>

                {/* Streak */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#E76F51]/10 border border-[#E76F51]/30">
                  <Flame className="w-5 h-5 text-[#E76F51]" />
                  <span className="font-bold text-white">{streakDays}</span>
                  <span className="text-gray-400 text-sm">day streak</span>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-sm text-gray-400 mb-1">7-Day Progress</div>
                  <div className="text-2xl font-bold text-[#C9A962]">
                    Day {currentPlanDay}/7
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-sm text-gray-400 mb-1">Hours Invested</div>
                  <div className="text-2xl font-bold text-[#2A9D8F]">
                    {legacyRecord.totalHoursInvested.toFixed(1)}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-sm text-gray-400 mb-1">Skills Learned</div>
                  <div className="text-2xl font-bold text-[#8B5CF6]">
                    {legacyRecord.skillsLearned.length}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-sm text-gray-400 mb-1">Active Agents</div>
                  <div className="text-2xl font-bold text-white">
                    {selectedAgents.length}
                  </div>
                </div>
              </div>

              {/* Today's Focus */}
              {todayTask && (
                <div className="p-6 rounded-2xl bg-[#C9A962]/5 border border-[#C9A962]/20 mb-8">
                  <div className="flex items-center gap-2 text-[#C9A962] text-sm mb-3">
                    <Target className="w-4 h-4" />
                    Today's Focus — Day {currentPlanDay}
                  </div>
                  <h2 className="text-xl font-bold text-white mb-4">{todayTask.title}</h2>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-[#2A9D8F] font-medium mb-2">BIZRA helps:</div>
                      <ul className="space-y-1">
                        {todayTask.bizraHelps?.map((help, i) => (
                          <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                            <Sparkles className="w-3 h-3 mt-1 text-[#2A9D8F]" />
                            {help}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs text-[#C9A962] font-medium mb-2">Your actions:</div>
                      <ul className="space-y-1">
                        {todayTask.userActions?.map((action, i) => (
                          <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                            <Circle className="w-3 h-3 mt-1 text-[#C9A962]" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <button
                    onClick={() => setView("work")}
                    className="mt-6 px-6 py-3 rounded-xl bg-[#C9A962] text-[#050B14] font-bold flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    Start Working
                  </button>
                </div>
              )}

              {/* Active Agents */}
              <div>
                <h3 className="text-sm text-gray-400 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Your Active Team
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {selectedAgents.map(agent => (
                    <div
                      key={agent.id}
                      className="flex-shrink-0 p-4 rounded-xl bg-white/5 border border-white/10 min-w-[160px]"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                          style={{ backgroundColor: `${agent.color}20` }}
                        >
                          {agent.icon}
                        </div>
                        {agent.isPrimary && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C9A962] text-[#050B14] font-bold">
                            PRIMARY
                          </span>
                        )}
                      </div>
                      <div className="font-medium text-white text-sm">{agent.name}</div>
                      <div className="text-xs text-gray-500">{agent.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* CHECK-IN VIEW */}
          {view === "checkin" && (
            <motion.div
              key="checkin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 max-w-2xl mx-auto"
            >
              <div className="mb-8">
                <h1 className="text-3xl font-serif text-white mb-2">Daily Check-in</h1>
                <p className="text-gray-400">5-15 minutes to align your day</p>
              </div>

              <div className="space-y-8">
                {/* Mood */}
                <div>
                  <label className="block text-sm text-gray-400 mb-4">How are you feeling?</label>
                  <div className="flex gap-3">
                    {MOOD_OPTIONS.map(mood => (
                      <button
                        key={mood.id}
                        onClick={() => setCheckInData(d => ({ ...d, mood: mood.id }))}
                        className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                          checkInData.mood === mood.id
                            ? "border-current"
                            : "border-white/10 hover:border-white/30"
                        }`}
                        style={{ color: checkInData.mood === mood.id ? mood.color : undefined }}
                      >
                        <div className="text-3xl mb-2">{mood.emoji}</div>
                        <div className="text-sm">{mood.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Yesterday */}
                <div>
                  <label className="block text-sm text-gray-400 mb-3">What happened yesterday?</label>
                  <textarea
                    value={checkInData.yesterday}
                    onChange={e => setCheckInData(d => ({ ...d, yesterday: e.target.value }))}
                    placeholder="Wins, challenges, observations..."
                    rows={3}
                    className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#C9A962] focus:outline-none resize-none"
                  />
                </div>

                {/* Today Focus */}
                <div>
                  <label className="block text-sm text-gray-400 mb-3">What's your #1 focus today?</label>
                  <input
                    type="text"
                    value={checkInData.todayFocus}
                    onChange={e => setCheckInData(d => ({ ...d, todayFocus: e.target.value }))}
                    placeholder="The one thing that matters most..."
                    className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#C9A962] focus:outline-none"
                  />
                </div>

                {/* Blockers */}
                <div>
                  <label className="block text-sm text-gray-400 mb-3">Any blockers or concerns?</label>
                  <textarea
                    value={checkInData.blockers}
                    onChange={e => setCheckInData(d => ({ ...d, blockers: e.target.value }))}
                    placeholder="What might get in your way? (optional)"
                    rows={2}
                    className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#2A9D8F] focus:outline-none resize-none"
                  />
                </div>

                <button
                  onClick={handleCheckInSubmit}
                  disabled={!checkInData.mood || !checkInData.todayFocus}
                  className={`w-full py-4 rounded-xl font-bold transition-all ${
                    checkInData.mood && checkInData.todayFocus
                      ? "bg-[#C9A962] text-[#050B14]"
                      : "bg-white/10 text-white/30 cursor-not-allowed"
                  }`}
                >
                  Complete Check-in
                </button>
              </div>
            </motion.div>
          )}

          {/* WORK VIEW */}
          {view === "work" && (
            <motion.div
              key="work"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 max-w-4xl mx-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-serif text-white mb-2">Work Session</h1>
                  <p className="text-gray-400">Focus mode with your agents</p>
                </div>
                
                {workSessionActive && (
                  <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-[#2A9D8F]/20 border border-[#2A9D8F]/30">
                    <div className="w-2 h-2 rounded-full bg-[#2A9D8F] animate-pulse" />
                    <Clock className="w-4 h-4 text-[#2A9D8F]" />
                    <span className="font-mono text-white">{sessionMinutes}m</span>
                  </div>
                )}
              </div>

              {/* Work Session Controls */}
              <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center mb-8">
                {!workSessionActive ? (
                  <>
                    <div className="text-6xl mb-4">🎯</div>
                    <h2 className="text-xl font-bold text-white mb-2">Ready to focus?</h2>
                    <p className="text-gray-400 mb-6">
                      Start a work session and your agents will help you stay on track.
                    </p>
                    <button
                      onClick={() => setWorkSessionActive(true)}
                      className="px-8 py-4 rounded-xl bg-[#2A9D8F] text-white font-bold hover:bg-[#238B7D] transition-colors"
                    >
                      Start Session
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-6xl mb-4">⚡</div>
                    <h2 className="text-xl font-bold text-white mb-2">Session Active</h2>
                    <p className="text-gray-400 mb-6">
                      Your agents are ready to help. What do you need?
                    </p>
                    
                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-3 justify-center mb-6">
                      <button className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20">
                        📝 Draft something
                      </button>
                      <button className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20">
                        🔍 Research this
                      </button>
                      <button className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20">
                        💡 Brainstorm ideas
                      </button>
                      <button className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20">
                        📊 Analyze data
                      </button>
                    </div>
                    
                    <button
                      onClick={() => setWorkSessionActive(false)}
                      className="px-6 py-3 rounded-xl border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-all"
                    >
                      End Session
                    </button>
                  </>
                )}
              </div>

              {/* Available Agents for Work */}
              <div>
                <h3 className="text-sm text-gray-400 mb-4">Available to help:</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {selectedAgents.map(agent => (
                    <button
                      key={agent.id}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/30 transition-all text-left"
                    >
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3"
                        style={{ backgroundColor: `${agent.color}20` }}
                      >
                        {agent.icon}
                      </div>
                      <div className="font-medium text-white text-sm">{agent.name}</div>
                      <div className="text-xs text-gray-500">Ask for help</div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* MEMORY VIEW */}
          {view === "memory" && (
            <motion.div
              key="memory"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 max-w-4xl mx-auto"
            >
              <div className="mb-8">
                <h1 className="text-3xl font-serif text-white mb-2">Your Memory</h1>
                <p className="text-gray-400">Everything you've learned and built</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Skills */}
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 text-[#8B5CF6] text-sm mb-4">
                    <BookOpen className="w-4 h-4" />
                    Skills Learned
                  </div>
                  {legacyRecord.skillsLearned.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {legacyRecord.skillsLearned.map(skill => (
                        <span key={skill} className="px-3 py-1 rounded-full bg-[#8B5CF6]/20 text-[#8B5CF6] text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Skills you learn will appear here</p>
                  )}
                </div>

                {/* Projects */}
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 text-[#2A9D8F] text-sm mb-4">
                    <Target className="w-4 h-4" />
                    Projects Completed
                  </div>
                  {legacyRecord.projectsCompleted.length > 0 ? (
                    <ul className="space-y-2">
                      {legacyRecord.projectsCompleted.map(project => (
                        <li key={project} className="text-sm text-gray-400 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#2A9D8F]" />
                          {project}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">Completed projects will appear here</p>
                  )}
                </div>

                {/* Milestones */}
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 md:col-span-2">
                  <div className="flex items-center gap-2 text-[#C9A962] text-sm mb-4">
                    <Sparkles className="w-4 h-4" />
                    Milestones
                  </div>
                  {legacyRecord.milestones.length > 0 ? (
                    <div className="space-y-4">
                      {legacyRecord.milestones.map((milestone, i) => (
                        <div key={i} className="flex gap-4">
                          <div className="text-xs text-gray-500">
                            {new Date(milestone.date).toLocaleDateString()}
                          </div>
                          <div>
                            <div className="font-medium text-white">{milestone.title}</div>
                            <div className="text-sm text-gray-400">{milestone.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Your achievements will be recorded here</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* REFLECTION VIEW */}
          {view === "reflection" && (
            <motion.div
              key="reflection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 max-w-2xl mx-auto"
            >
              <div className="mb-8">
                <h1 className="text-3xl font-serif text-white mb-2">Weekly Reflection</h1>
                <p className="text-gray-400">What did we learn together?</p>
              </div>

              <div className="p-6 rounded-2xl bg-[#8B5CF6]/5 border border-[#8B5CF6]/20 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  {primaryAgent && (
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                      style={{ backgroundColor: `${primaryAgent.color}20` }}
                    >
                      {primaryAgent.icon}
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-gray-400">From {primaryAgent?.name || "Your Team"}</div>
                    <div className="text-white font-medium">Weekly Insights</div>
                  </div>
                </div>
                
                <div className="space-y-4 text-gray-300">
                  <p>
                    "This week you invested <strong className="text-[#C9A962]">{legacyRecord.totalHoursInvested.toFixed(1)} hours</strong> in your growth.
                    {streakDays > 3 && <span> Your <strong className="text-[#E76F51]">{streakDays}-day streak</strong> shows real commitment.</span>}
                  </p>
                  
                  {sevenDayPlan && (
                    <p>
                      You're on Day {currentPlanDay} of your 7-day journey: "{sevenDayPlan.goal}"
                    </p>
                  )}

                  <p className="text-sm text-gray-400 italic">
                    "Progress isn't always visible, but it's always happening. Keep planting seeds."
                  </p>
                </div>
              </div>

              {/* Reflection Prompts */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    What worked well this week?
                  </label>
                  <textarea
                    placeholder="Celebrate your wins, big and small..."
                    rows={3}
                    className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#2A9D8F] focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    What could improve?
                  </label>
                  <textarea
                    placeholder="No judgment, just awareness..."
                    rows={3}
                    className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#E9C46A] focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-3 flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    What are you grateful for?
                  </label>
                  <textarea
                    placeholder="Gratitude compounds..."
                    rows={3}
                    className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#8B5CF6] focus:outline-none resize-none"
                  />
                </div>

                <button className="w-full py-4 rounded-xl bg-[#8B5CF6] text-white font-bold hover:bg-[#7C3AED] transition-colors">
                  Save Reflection
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
