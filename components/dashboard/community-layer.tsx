"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  useLifecycleStore,
  useCommunityProfile,
  useNodeStatus,
  useLegacyRecord,
  Space
} from "@/store/use-lifecycle-store"
import {
  Users,
  BookOpen,
  Code,
  Globe,
  Rocket,
  ChevronRight,
  ChevronLeft,
  Plus,
  Shield,
  Scale,
  Eye,
  Sparkles,
  Check,
  Clock,
  TrendingUp,
  MessageSquare,
  Award
} from "lucide-react"

// ============================================
// COMMUNITY / SAT LAYER - Phase 7
// Spaces, system agents, fair governance
// ============================================

type CommunityView = "intro" | "spaces" | "sat" | "explore"

// Available space templates
const SPACE_TEMPLATES = [
  {
    type: "study_circle" as const,
    name: "Study Circle",
    icon: BookOpen,
    color: "#8B5CF6",
    description: "Learn together with others pursuing similar knowledge"
  },
  {
    type: "open_source" as const,
    name: "Open Source Team",
    icon: Code,
    color: "#2A9D8F",
    description: "Build open tools and contribute to shared projects"
  },
  {
    type: "local_community" as const,
    name: "Local Community",
    icon: Globe,
    color: "#E76F51",
    description: "Connect with people in your region or city"
  },
  {
    type: "project" as const,
    name: "Project Team",
    icon: Rocket,
    color: "#C9A962",
    description: "Collaborate on specific goals and outcomes"
  }
]

// System Agents (SAT)
const SYSTEM_AGENTS = [
  {
    id: "economist",
    name: "The Economist",
    role: "Fair Economy Guardian",
    description: "Ensures fair token distribution and prevents exploitation",
    icon: "⚖️",
    status: "active",
    color: "#C9A962"
  },
  {
    id: "auditor",
    name: "The Auditor",
    role: "Proof-of-Impact Reviewer",
    description: "Verifies contributions and validates impact claims",
    icon: "🔍",
    status: "active",
    color: "#2A9D8F"
  },
  {
    id: "mediator",
    name: "The Mediator",
    role: "Conflict Resolution",
    description: "Handles disputes and ensures fair treatment for all",
    icon: "🤝",
    status: "active",
    color: "#8B5CF6"
  },
  {
    id: "coordinator",
    name: "The Coordinator",
    role: "Task Allocator",
    description: "Distributes work fairly based on skills and availability",
    icon: "📋",
    status: "active",
    color: "#E76F51"
  },
  {
    id: "guardian",
    name: "The Guardian",
    role: "Security & Ethics",
    description: "Monitors for abuse, fraud, and harmful behavior",
    icon: "🛡️",
    status: "active",
    color: "#F59E0B"
  },
  {
    id: "researcher",
    name: "The Researcher",
    role: "Knowledge Synthesis",
    description: "Aggregates learning and improves system knowledge",
    icon: "🧪",
    status: "active",
    color: "#EC4899"
  }
]

// Sample spaces to explore
const SAMPLE_SPACES: Omit<Space, "joinedAt">[] = [
  { id: "ai-ethics", name: "AI Ethics Circle", type: "study_circle", members: 847, role: "member" },
  { id: "bizra-core", name: "BIZRA Core Dev", type: "open_source", members: 156, role: "member" },
  { id: "dubai-node", name: "Dubai Node Operators", type: "local_community", members: 234, role: "member" },
  { id: "startup-mvp", name: "MVP Builders", type: "project", members: 89, role: "member" }
]

export function CommunityLayer() {
  const [view, setView] = useState<CommunityView>("intro")
  
  const communityProfile = useCommunityProfile()
  const nodeStatus = useNodeStatus()
  const legacyRecord = useLegacyRecord()
  const joinSpace = useLifecycleStore(s => s.joinSpace)
  const leaveSpace = useLifecycleStore(s => s.leaveSpace)
  const setPhase = useLifecycleStore(s => s.setPhase)

  const joinedSpaceIds = useMemo(() => 
    communityProfile.spaces.map(s => s.id), 
    [communityProfile.spaces]
  )

  const handleJoinSpace = (space: Omit<Space, "joinedAt">) => {
    if (!joinedSpaceIds.includes(space.id)) {
      joinSpace(space)
    }
  }

  const getSpaceIcon = (type: Space["type"]) => {
    const template = SPACE_TEMPLATES.find(t => t.type === type)
    return template?.icon || Users
  }

  const getSpaceColor = (type: Space["type"]) => {
    const template = SPACE_TEMPLATES.find(t => t.type === type)
    return template?.color || "#C9A962"
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050B14] via-[#0A1628] to-[#050B14]">
      {/* Background */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, #8B5CF6 1px, transparent 1px)`,
          backgroundSize: "50px 50px"
        }} />
      </div>

      <AnimatePresence mode="wait">
        {/* INTRO: Not just you — your place in the world */}
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
              className="mb-8 relative"
            >
              {/* Orbiting dots representing community */}
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: SYSTEM_AGENTS[i].color,
                    left: `calc(50% + ${Math.cos((i / 6) * Math.PI * 2) * 60}px - 6px)`,
                    top: `calc(50% + ${Math.sin((i / 6) * Math.PI * 2) * 60}px - 6px)`
                  }}
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.3,
                    repeat: Infinity
                  }}
                />
              ))}
              <div className="w-24 h-24 rounded-2xl bg-[#8B5CF6]/20 border-2 border-[#8B5CF6] flex items-center justify-center">
                <Users className="w-12 h-12 text-[#8B5CF6]" />
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl font-serif text-[#F8F6F1] mb-6"
            >
              Not just you —
              <br />
              <span className="text-[#8B5CF6]">Your place in the world</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-xl text-gray-300 max-w-xl mb-12"
            >
              Join spaces, collaborate with others, and let system agents
              <br />
              keep everything fair and balanced.
            </motion.p>

            {/* Feature Cards */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="grid md:grid-cols-2 gap-6 max-w-2xl mb-12"
            >
              <button
                onClick={() => setView("spaces")}
                className="p-6 rounded-xl bg-white/5 border border-white/10 text-left hover:border-[#8B5CF6]/50 transition-all group"
              >
                <Users className="w-8 h-8 text-[#8B5CF6] mb-4" />
                <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                  Spaces & Communities
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-sm text-gray-400">
                  Join study circles, project teams, and local communities
                </p>
              </button>
              
              <button
                onClick={() => setView("sat")}
                className="p-6 rounded-xl bg-white/5 border border-white/10 text-left hover:border-[#C9A962]/50 transition-all group"
              >
                <Scale className="w-8 h-8 text-[#C9A962] mb-4" />
                <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                  System Agents (SAT)
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-sm text-gray-400">
                  Automated guardians that keep the system fair and just
                </p>
              </button>
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              onClick={() => setView("explore")}
              className="px-10 py-3 rounded-xl bg-[#8B5CF6] text-white font-bold flex items-center gap-2 hover:bg-[#7C3AED] transition-colors shadow-[0_0_30px_rgba(139,92,246,0.3)]"
            >
              Explore Communities
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}

        {/* SPACES: My joined spaces */}
        {view === "spaces" && (
          <motion.div
            key="spaces"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen px-4 py-12 max-w-4xl mx-auto"
          >
            <button
              onClick={() => setView("intro")}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-serif text-white mb-2">My Spaces</h1>
                <p className="text-gray-400">Communities you're part of</p>
              </div>
              <button
                onClick={() => setView("explore")}
                className="px-4 py-2 rounded-lg bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30 flex items-center gap-2 hover:bg-[#8B5CF6]/30 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Join More
              </button>
            </div>

            {communityProfile.spaces.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {communityProfile.spaces.map(space => {
                  const SpaceIcon = getSpaceIcon(space.type)
                  const color = getSpaceColor(space.type)
                  
                  return (
                    <motion.div
                      key={space.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 rounded-xl bg-white/5 border border-white/10"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${color}20` }}
                          >
                            <SpaceIcon className="w-6 h-6" style={{ color }} />
                          </div>
                          <div>
                            <h3 className="font-medium text-white">{space.name}</h3>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <Users className="w-3 h-3" />
                              {space.members} members
                            </div>
                          </div>
                        </div>
                        <span 
                          className="text-xs px-2 py-1 rounded-full"
                          style={{ 
                            backgroundColor: `${color}20`,
                            color 
                          }}
                        >
                          {space.role}
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        <button className="flex-1 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors">
                          Open
                        </button>
                        <button 
                          onClick={() => leaveSpace(space.id)}
                          className="px-4 py-2 rounded-lg text-gray-400 text-sm hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        >
                          Leave
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="p-12 rounded-xl bg-white/5 border border-white/10 text-center">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-white font-medium mb-2">No spaces yet</h3>
                <p className="text-gray-400 mb-6">Join communities to collaborate and grow together</p>
                <button
                  onClick={() => setView("explore")}
                  className="px-6 py-3 rounded-xl bg-[#8B5CF6] text-white font-bold hover:bg-[#7C3AED] transition-colors"
                >
                  Explore Spaces
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* SAT: System Agent Team */}
        {view === "sat" && (
          <motion.div
            key="sat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen px-4 py-12 max-w-4xl mx-auto"
          >
            <button
              onClick={() => setView("intro")}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <div className="mb-8">
              <h1 className="text-3xl font-serif text-white mb-2">System Agent Team</h1>
              <p className="text-gray-400">
                Automated guardians that keep BIZRA fair and just for everyone
              </p>
            </div>

            {/* Info Banner */}
            <div className="p-5 rounded-xl bg-[#C9A962]/10 border border-[#C9A962]/30 mb-8 flex items-start gap-4">
              <Shield className="w-6 h-6 text-[#C9A962] flex-shrink-0" />
              <div>
                <h3 className="text-white font-medium mb-1">These agents work for the system, not individuals</h3>
                <p className="text-sm text-gray-400">
                  Like NPCs in a game, they maintain fairness, review contributions, resolve disputes, and ensure no one dominates or cheats.
                </p>
              </div>
            </div>

            {/* SAT Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {SYSTEM_AGENTS.map((agent, i) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-5 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${agent.color}20` }}
                    >
                      {agent.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-white">{agent.name}</h3>
                        <span className="flex items-center gap-1 text-xs text-[#2A9D8F]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2A9D8F] animate-pulse" />
                          Active
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{agent.role}</p>
                      <p className="text-xs text-gray-500">{agent.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* What SAT Does */}
            <div className="mt-8 p-6 rounded-xl bg-white/5 border border-white/10">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#8B5CF6]" />
                What the System Agents Do
              </h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-400 mb-2">Economy</div>
                  <ul className="space-y-1 text-gray-500">
                    <li>• Fair token distribution</li>
                    <li>• Prevent exploitation</li>
                    <li>• Validate PoI claims</li>
                  </ul>
                </div>
                <div>
                  <div className="text-gray-400 mb-2">Community</div>
                  <ul className="space-y-1 text-gray-500">
                    <li>• Allocate tasks fairly</li>
                    <li>• Resolve disputes</li>
                    <li>• Protect from abuse</li>
                  </ul>
                </div>
                <div>
                  <div className="text-gray-400 mb-2">Growth</div>
                  <ul className="space-y-1 text-gray-500">
                    <li>• Research priorities</li>
                    <li>• System upgrades</li>
                    <li>• Global coordination</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* EXPLORE: Find and join spaces */}
        {view === "explore" && (
          <motion.div
            key="explore"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen px-4 py-12 max-w-4xl mx-auto"
          >
            <button
              onClick={() => setView("intro")}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <div className="mb-8">
              <h1 className="text-3xl font-serif text-white mb-2">Explore Spaces</h1>
              <p className="text-gray-400">Find communities that match your interests</p>
            </div>

            {/* Space Types */}
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              {SPACE_TEMPLATES.map(template => (
                <div
                  key={template.type}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 text-center"
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                    style={{ backgroundColor: `${template.color}20` }}
                  >
                    <template.icon className="w-6 h-6" style={{ color: template.color }} />
                  </div>
                  <div className="text-white text-sm font-medium">{template.name}</div>
                </div>
              ))}
            </div>

            {/* Available Spaces */}
            <h2 className="text-white font-medium mb-4">Recommended for You</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {SAMPLE_SPACES.map(space => {
                const SpaceIcon = getSpaceIcon(space.type)
                const color = getSpaceColor(space.type)
                const isJoined = joinedSpaceIds.includes(space.id)
                
                return (
                  <motion.div
                    key={space.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${color}20` }}
                        >
                          <SpaceIcon className="w-6 h-6" style={{ color }} />
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{space.name}</h3>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Users className="w-3 h-3" />
                            {space.members} members
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleJoinSpace(space)}
                      disabled={isJoined}
                      className={`w-full py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                        isJoined
                          ? "bg-[#2A9D8F]/20 text-[#2A9D8F] cursor-default"
                          : "bg-white/10 text-white hover:bg-white/20"
                      }`}
                    >
                      {isJoined ? (
                        <>
                          <Check className="w-4 h-4" />
                          Joined
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Join Space
                        </>
                      )}
                    </button>
                  </motion.div>
                )
              })}
            </div>

            {/* Create New Space */}
            <div className="mt-8 p-6 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-center">
              <Sparkles className="w-8 h-8 text-[#8B5CF6] mx-auto mb-4" />
              <h3 className="text-white font-medium mb-2">Start Your Own Space</h3>
              <p className="text-sm text-gray-400 mb-4">
                Can't find what you're looking for? Create a new community.
              </p>
              <button className="px-6 py-2 rounded-lg bg-[#8B5CF6] text-white font-medium hover:bg-[#7C3AED] transition-colors">
                Create Space
              </button>
            </div>

            {/* Back to Dashboard */}
            <div className="mt-8 text-center">
              <button
                onClick={() => setPhase("DAILY_LOOP")}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
