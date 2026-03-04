import { create } from "zustand"
import { subscribeWithSelector, persist } from "zustand/middleware"

// ============================================
// BIZRA USER LIFECYCLE PHASES
// ============================================
// Phase 0: FIRST_ENCOUNTER - First time visitor, mysterious promise
// Phase 1: SEED_TEST - "Plant your first seed" - account + seed test
// Phase 2: PAT_INTRO - Meeting their Personal Agent Team
// Phase 3: FIRST_SESSION - "Fix something real in 7 days"
// Phase 4: DAILY_LOOP - Living with BIZRA
// Phase 5: NODE_ACTIVATION - Becoming part of the network
// Phase 6: COMMUNITY - SAT layer, spaces, collaboration
// Phase 7: LEGACY - Long-term impact record

export type LifecyclePhase = 
  | "FIRST_ENCOUNTER"
  | "SEED_TEST"
  | "PAT_INTRO"
  | "FIRST_SESSION"
  | "DAILY_LOOP"
  | "NODE_ACTIVATION"
  | "COMMUNITY"
  | "LEGACY"

// ============================================
// SEED TEST PROFILE (Phase 2)
// ============================================
export interface SeedTestProfile {
  // Q1: What do you most want right now?
  primaryDesire: 
    | "income"
    | "skills"
    | "project"
    | "clarity"
    | "future"
    | null

  // Q2: How much time can you give per week?
  weeklyHours: number | null

  // Q3: What do you already have?
  existingAssets: {
    skills: string[]
    hasComputer: boolean
    hasInternet: boolean
    other: string
  }

  // Q4: What stresses you most?
  primaryStressor: string | null

  // Computed
  profileComplete: boolean
  createdAt: Date | null
}

// ============================================
// PERSONAL AGENT TEAM (Phase 3)
// ============================================
export type AgentRole = 
  | "master_reasoner"
  | "memory_architect"
  | "creative_synthesizer"
  | "data_analyst"
  | "communicator"
  | "execution_planner"
  | "ethics_guardian"

export interface PATAgent {
  id: AgentRole
  name: string
  title: string
  description: string
  icon: string
  color: string
  capabilities: string[]
  isRecommended: boolean
  isSelected: boolean
  isPrimary: boolean
}

export const DEFAULT_PAT_AGENTS: PATAgent[] = [
  {
    id: "master_reasoner",
    name: "The Reasoner",
    title: "Master Reasoner",
    description: "Deep thinking for hard decisions. Breaks down complex problems into clear paths.",
    icon: "MR",
    color: "#C9A962",
    capabilities: ["Strategic planning", "Decision frameworks", "Problem decomposition"],
    isRecommended: false,
    isSelected: false,
    isPrimary: false
  },
  {
    id: "memory_architect",
    name: "The Architect",
    title: "Memory Architect",
    description: "Organizes everything in your life. Builds your personal knowledge base.",
    icon: "MA",
    color: "#2A9D8F",
    capabilities: ["Knowledge organization", "Pattern recognition", "Life documentation"],
    isRecommended: false,
    isSelected: false,
    isPrimary: false
  },
  {
    id: "creative_synthesizer",
    name: "The Creator",
    title: "Creative Synthesizer",
    description: "Writing, ideas, and creative output. Turns your thoughts into polished work.",
    icon: "CS",
    color: "#E76F51",
    capabilities: ["Content creation", "Idea generation", "Writing assistance"],
    isRecommended: false,
    isSelected: false,
    isPrimary: false
  },
  {
    id: "data_analyst",
    name: "The Analyst",
    title: "Data & Analysis Agent",
    description: "Makes sense of numbers and information. Finds patterns others miss.",
    icon: "DA",
    color: "#264653",
    capabilities: ["Data analysis", "Research synthesis", "Trend identification"],
    isRecommended: false,
    isSelected: false,
    isPrimary: false
  },
  {
    id: "communicator",
    name: "The Voice",
    title: "Communication Agent",
    description: "Helps you present ideas and communicate with impact.",
    icon: "CO",
    color: "#F4A261",
    capabilities: ["Presentation design", "Communication strategy", "Message clarity"],
    isRecommended: false,
    isSelected: false,
    isPrimary: false
  },
  {
    id: "execution_planner",
    name: "The Executor",
    title: "Execution Planner",
    description: "Turns plans into action. Keeps you on track without shame.",
    icon: "EP",
    color: "#E9C46A",
    capabilities: ["Task breakdown", "Timeline management", "Accountability"],
    isRecommended: false,
    isSelected: false,
    isPrimary: false
  },
  {
    id: "ethics_guardian",
    name: "The Guardian",
    title: "Ethics & Safety Guardian",
    description: "Watches over your digital sovereignty. Protects your values.",
    icon: "EG",
    color: "#8B5CF6",
    capabilities: ["Privacy protection", "Ethical guidance", "Value alignment"],
    isRecommended: false,
    isSelected: false,
    isPrimary: false
  }
]

// ============================================
// FIRST SESSION / 7-DAY PLAN (Phase 4)
// ============================================
export interface DayTask {
  id: string
  day: number
  title: string
  description: string
  bizraHelps: string[]
  userActions: string[]
  isCompleted: boolean
  completedAt: Date | null
}

export interface SevenDayPlan {
  goal: string
  goalCategory: "job" | "education" | "project" | "motivation" | "other"
  createdAt: Date
  tasks: DayTask[]
  currentDay: number
  isAdjusted: boolean
}

// ============================================
// NODE STATUS (Phase 6)
// ============================================
export interface NodeStatus {
  isActive: boolean
  activatedAt: Date | null
  resourceSettings: {
    cpuShare: number // 0-100
    gpuShare: number // 0-100
    storageShare: number // GB
    availableHours: [number, number] // [start, end] in 24h format
    alwaysAvailable: boolean
  }
  contributions: {
    tasksCompleted: number
    modelsRefined: number
    impactTokens: number
    weeklyStats: {
      week: string
      tasks: number
      tokens: number
    }[]
  }
}

// ============================================
// COMMUNITY / SAT (Phase 7)
// ============================================
export interface Space {
  id: string
  name: string
  type: "study_circle" | "open_source" | "local_community" | "project"
  members: number
  role: "member" | "contributor" | "leader"
  joinedAt: Date
}

export interface CommunityProfile {
  spaces: Space[]
  contributionScore: number
  reputation: number
  activeTasks: number
}

// ============================================
// LEGACY (Phase 8)
// ============================================
export interface LegacyRecord {
  skillsLearned: string[]
  projectsCompleted: string[]
  contributionsMade: number
  impactOnOthers: number
  totalHoursInvested: number
  joinedAt: Date
  milestones: {
    title: string
    date: Date
    description: string
  }[]
}

// ============================================
// MAIN STATE INTERFACE
// ============================================
interface LifecycleState {
  // Current phase
  phase: LifecyclePhase
  
  // Phase 2: Seed Test
  seedProfile: SeedTestProfile
  
  // Phase 3: PAT
  patAgents: PATAgent[]
  patOnboardComplete: boolean
  
  // Phase 4: First Session
  sevenDayPlan: SevenDayPlan | null
  
  // Phase 5: Daily Loop
  lastCheckIn: Date | null
  streakDays: number
  
  // Phase 6: Node
  nodeStatus: NodeStatus
  
  // Phase 7: Community
  communityProfile: CommunityProfile
  
  // Phase 8: Legacy
  legacyRecord: LegacyRecord

  // UI State
  isOnboarding: boolean
  onboardingStep: number
}

// ============================================
// ACTIONS
// ============================================
interface LifecycleActions {
  // Phase transitions
  setPhase: (phase: LifecyclePhase) => void
  advancePhase: () => void

  // Phase 2: Seed Test
  updateSeedProfile: (updates: Partial<SeedTestProfile>) => void
  completeSeedTest: () => void

  // Phase 3: PAT
  selectAgent: (agentId: AgentRole, isPrimary?: boolean) => void
  deselectAgent: (agentId: AgentRole) => void
  setRecommendedAgents: (agentIds: AgentRole[]) => void
  completePATOnboard: () => void

  // Phase 4: First Session
  createSevenDayPlan: (goal: string, category: SevenDayPlan["goalCategory"]) => void
  completeTask: (taskId: string) => void
  adjustPlan: () => void

  // Phase 5: Daily Loop
  recordCheckIn: () => void

  // Phase 6: Node
  activateNode: (settings: NodeStatus["resourceSettings"]) => void
  updateNodeSettings: (settings: Partial<NodeStatus["resourceSettings"]>) => void
  recordContribution: (tasks: number, tokens: number) => void

  // Phase 7: Community
  joinSpace: (space: Omit<Space, "joinedAt">) => void
  leaveSpace: (spaceId: string) => void

  // Phase 8: Legacy
  addMilestone: (title: string, description: string) => void
  recordSkill: (skill: string) => void
  recordProject: (project: string) => void

  // Onboarding
  setOnboardingStep: (step: number) => void
  completeOnboarding: () => void
  
  // Reset
  resetLifecycle: () => void
}

// ============================================
// INITIAL STATE
// ============================================
const initialSeedProfile: SeedTestProfile = {
  primaryDesire: null,
  weeklyHours: null,
  existingAssets: {
    skills: [],
    hasComputer: false,
    hasInternet: false,
    other: ""
  },
  primaryStressor: null,
  profileComplete: false,
  createdAt: null
}

const initialNodeStatus: NodeStatus = {
  isActive: false,
  activatedAt: null,
  resourceSettings: {
    cpuShare: 20,
    gpuShare: 0,
    storageShare: 10,
    availableHours: [0, 24],
    alwaysAvailable: true
  },
  contributions: {
    tasksCompleted: 0,
    modelsRefined: 0,
    impactTokens: 0,
    weeklyStats: []
  }
}

const initialCommunityProfile: CommunityProfile = {
  spaces: [],
  contributionScore: 0,
  reputation: 0,
  activeTasks: 0
}

const initialLegacyRecord: LegacyRecord = {
  skillsLearned: [],
  projectsCompleted: [],
  contributionsMade: 0,
  impactOnOthers: 0,
  totalHoursInvested: 0,
  joinedAt: new Date(),
  milestones: []
}

const initialState: LifecycleState = {
  phase: "FIRST_ENCOUNTER",
  seedProfile: initialSeedProfile,
  patAgents: DEFAULT_PAT_AGENTS,
  patOnboardComplete: false,
  sevenDayPlan: null,
  lastCheckIn: null,
  streakDays: 0,
  nodeStatus: initialNodeStatus,
  communityProfile: initialCommunityProfile,
  legacyRecord: initialLegacyRecord,
  isOnboarding: true,
  onboardingStep: 0
}

const LIFECYCLE_PERSIST_VERSION = 1

const reviveDate = (value: unknown): Date | null => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value as string)
  return Number.isNaN(date.getTime()) ? null : date
}

const revivePersistedState = (state: Partial<LifecycleState> | undefined): LifecycleState => {
  const merged = { ...initialState, ...(state || {}) }

  const seedProfile: SeedTestProfile = {
    ...initialSeedProfile,
    ...(merged.seedProfile || {}),
    createdAt: reviveDate(merged.seedProfile?.createdAt)
  }

  const sevenDayPlan: SevenDayPlan | null = merged.sevenDayPlan
    ? {
        ...merged.sevenDayPlan,
        createdAt: reviveDate(merged.sevenDayPlan.createdAt) ?? new Date(),
        tasks: merged.sevenDayPlan.tasks?.map((task) => ({
          ...task,
          completedAt: reviveDate(task.completedAt)
        })) ?? []
      }
    : null

  const nodeStatus: NodeStatus = merged.nodeStatus
    ? {
        ...merged.nodeStatus,
        activatedAt: reviveDate(merged.nodeStatus.activatedAt)
      }
    : initialNodeStatus

  const communityProfile: CommunityProfile = merged.communityProfile
    ? {
        ...merged.communityProfile,
        spaces: merged.communityProfile.spaces?.map((space) => ({
          ...space,
          joinedAt: reviveDate(space.joinedAt) ?? new Date()
        })) ?? []
      }
    : initialCommunityProfile

  const legacyRecord: LegacyRecord = merged.legacyRecord
    ? {
        ...merged.legacyRecord,
        joinedAt: reviveDate(merged.legacyRecord.joinedAt) ?? initialLegacyRecord.joinedAt,
        milestones: merged.legacyRecord.milestones?.map((milestone) => ({
          ...milestone,
          date: reviveDate(milestone.date) ?? new Date()
        })) ?? []
      }
    : initialLegacyRecord

  return {
    ...merged,
    seedProfile,
    sevenDayPlan,
    lastCheckIn: reviveDate(merged.lastCheckIn),
    nodeStatus,
    communityProfile,
    legacyRecord,
    patAgents: merged.patAgents ?? DEFAULT_PAT_AGENTS
  }
}

// ============================================
// PHASE ORDER FOR ADVANCEMENT
// ============================================
const PHASE_ORDER: LifecyclePhase[] = [
  "FIRST_ENCOUNTER",
  "SEED_TEST",
  "PAT_INTRO",
  "FIRST_SESSION",
  "DAILY_LOOP",
  "NODE_ACTIVATION",
  "COMMUNITY",
  "LEGACY"
]

// ============================================
// CREATE STORE
// ============================================
export const useLifecycleStore = create<LifecycleState & LifecycleActions>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        // Phase transitions
        setPhase: (phase) => set({ phase }),
        
        advancePhase: () => {
          const currentIndex = PHASE_ORDER.indexOf(get().phase)
          if (currentIndex < PHASE_ORDER.length - 1) {
            set({ phase: PHASE_ORDER[currentIndex + 1] })
          }
        },

        // Phase 2: Seed Test
        updateSeedProfile: (updates) => set((state) => ({
          seedProfile: { ...state.seedProfile, ...updates }
        })),

        completeSeedTest: () => {
          const { seedProfile } = get()
          if (
            seedProfile.primaryDesire &&
            seedProfile.weeklyHours !== null &&
            seedProfile.primaryStressor
          ) {
            set((state) => ({
              seedProfile: {
                ...state.seedProfile,
                profileComplete: true,
                createdAt: new Date()
              },
              phase: "PAT_INTRO"
            }))

            // Auto-recommend agents based on profile
            const { primaryDesire } = seedProfile
            const recommended: AgentRole[] = []
            
            if (primaryDesire === "income") {
              recommended.push("execution_planner", "communicator")
            } else if (primaryDesire === "skills") {
              recommended.push("master_reasoner", "memory_architect")
            } else if (primaryDesire === "project") {
              recommended.push("creative_synthesizer", "execution_planner")
            } else if (primaryDesire === "clarity") {
              recommended.push("master_reasoner", "ethics_guardian")
            } else if (primaryDesire === "future") {
              recommended.push("master_reasoner", "data_analyst")
            }

            get().setRecommendedAgents(recommended)
          }
        },

        // Phase 3: PAT
        selectAgent: (agentId, isPrimary = false) => set((state) => ({
          patAgents: state.patAgents.map(agent => 
            agent.id === agentId 
              ? { ...agent, isSelected: true, isPrimary: isPrimary || agent.isPrimary }
              : isPrimary 
                ? { ...agent, isPrimary: false }
                : agent
          )
        })),

        deselectAgent: (agentId) => set((state) => ({
          patAgents: state.patAgents.map(agent =>
            agent.id === agentId
              ? { ...agent, isSelected: false, isPrimary: false }
              : agent
          )
        })),

        setRecommendedAgents: (agentIds) => set((state) => ({
          patAgents: state.patAgents.map(agent => ({
            ...agent,
            isRecommended: agentIds.includes(agent.id)
          }))
        })),

        completePATOnboard: () => {
          const selectedAgents = get().patAgents.filter(a => a.isSelected)
          const hasPrimary = selectedAgents.some(a => a.isPrimary)
          
          if (selectedAgents.length > 0 && hasPrimary) {
            set({
              patOnboardComplete: true,
              phase: "FIRST_SESSION"
            })
          }
        },

        // Phase 4: First Session
        createSevenDayPlan: (goal, category) => {
          const tasks: DayTask[] = []
          
          // Generate 7 days of tasks based on goal
          for (let day = 1; day <= 7; day++) {
            tasks.push({
              id: `day-${day}`,
              day,
              title: `Day ${day} Task`,
              description: "",
              bizraHelps: [],
              userActions: [],
              isCompleted: false,
              completedAt: null
            })
          }

          set({
            sevenDayPlan: {
              goal,
              goalCategory: category,
              createdAt: new Date(),
              tasks,
              currentDay: 1,
              isAdjusted: false
            }
          })
        },

        completeTask: (taskId) => set((state) => {
          if (!state.sevenDayPlan) return state
          
          return {
            sevenDayPlan: {
              ...state.sevenDayPlan,
              tasks: state.sevenDayPlan.tasks.map(task =>
                task.id === taskId
                  ? { ...task, isCompleted: true, completedAt: new Date() }
                  : task
              ),
              currentDay: Math.min(
                state.sevenDayPlan.currentDay + 1,
                7
              )
            }
          }
        }),

        adjustPlan: () => set((state) => ({
          sevenDayPlan: state.sevenDayPlan
            ? { ...state.sevenDayPlan, isAdjusted: true }
            : null
        })),

        // Phase 5: Daily Loop
        recordCheckIn: () => set((state) => {
          const now = new Date()
          const lastCheckIn = state.lastCheckIn
          
          let newStreak = state.streakDays
          if (lastCheckIn) {
            const daysSinceLastCheckIn = Math.floor(
              (now.getTime() - new Date(lastCheckIn).getTime()) / (1000 * 60 * 60 * 24)
            )
            if (daysSinceLastCheckIn === 1) {
              newStreak += 1
            } else if (daysSinceLastCheckIn > 1) {
              newStreak = 1
            }
          } else {
            newStreak = 1
          }

          return {
            lastCheckIn: now,
            streakDays: newStreak,
            legacyRecord: {
              ...state.legacyRecord,
              totalHoursInvested: state.legacyRecord.totalHoursInvested + 0.25 // 15 min check-in
            }
          }
        }),

        // Phase 6: Node
        activateNode: (settings) => set((state) => ({
          nodeStatus: {
            ...state.nodeStatus,
            isActive: true,
            activatedAt: new Date(),
            resourceSettings: settings
          },
          phase: "NODE_ACTIVATION"
        })),

        updateNodeSettings: (settings) => set((state) => ({
          nodeStatus: {
            ...state.nodeStatus,
            resourceSettings: {
              ...state.nodeStatus.resourceSettings,
              ...settings
            }
          }
        })),

        recordContribution: (tasks, tokens) => set((state) => {
          const now = new Date()
          const weekKey = `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}`
          
          const existingWeekIndex = state.nodeStatus.contributions.weeklyStats
            .findIndex(w => w.week === weekKey)

          const newWeeklyStats = [...state.nodeStatus.contributions.weeklyStats]
          
          if (existingWeekIndex >= 0) {
            newWeeklyStats[existingWeekIndex] = {
              ...newWeeklyStats[existingWeekIndex],
              tasks: newWeeklyStats[existingWeekIndex].tasks + tasks,
              tokens: newWeeklyStats[existingWeekIndex].tokens + tokens
            }
          } else {
            newWeeklyStats.push({ week: weekKey, tasks, tokens })
          }

          return {
            nodeStatus: {
              ...state.nodeStatus,
              contributions: {
                ...state.nodeStatus.contributions,
                tasksCompleted: state.nodeStatus.contributions.tasksCompleted + tasks,
                impactTokens: state.nodeStatus.contributions.impactTokens + tokens,
                weeklyStats: newWeeklyStats.slice(-12) // Keep last 12 weeks
              }
            },
            legacyRecord: {
              ...state.legacyRecord,
              contributionsMade: state.legacyRecord.contributionsMade + tasks
            }
          }
        }),

        // Phase 7: Community
        joinSpace: (space) => set((state) => ({
          communityProfile: {
            ...state.communityProfile,
            spaces: [
              ...state.communityProfile.spaces,
              { ...space, joinedAt: new Date() }
            ]
          }
        })),

        leaveSpace: (spaceId) => set((state) => ({
          communityProfile: {
            ...state.communityProfile,
            spaces: state.communityProfile.spaces.filter(s => s.id !== spaceId)
          }
        })),

        // Phase 8: Legacy
        addMilestone: (title, description) => set((state) => ({
          legacyRecord: {
            ...state.legacyRecord,
            milestones: [
              ...state.legacyRecord.milestones,
              { title, description, date: new Date() }
            ]
          }
        })),

        recordSkill: (skill) => set((state) => ({
          legacyRecord: {
            ...state.legacyRecord,
            skillsLearned: [...new Set([...state.legacyRecord.skillsLearned, skill])]
          }
        })),

        recordProject: (project) => set((state) => ({
          legacyRecord: {
            ...state.legacyRecord,
            projectsCompleted: [...state.legacyRecord.projectsCompleted, project]
          }
        })),

        // Onboarding
        setOnboardingStep: (step) => set({ onboardingStep: step }),
        
        completeOnboarding: () => set({
          isOnboarding: false,
          phase: "DAILY_LOOP"
        }),

        // Reset
        resetLifecycle: () => set({
          ...initialState,
          patAgents: DEFAULT_PAT_AGENTS.map(a => ({ ...a }))
        })
      }),
      {
        name: "bizra-lifecycle-storage",
        version: LIFECYCLE_PERSIST_VERSION,
        migrate: (persistedState, version) => {
          // Handle migration from older versions
          const rawState = persistedState as Partial<LifecycleState> | undefined
          return revivePersistedState(rawState)
        },
        partialize: (state) => ({
          phase: state.phase,
          // Exclude sensitive fields from seedProfile (primaryStressor)
          seedProfile: {
            ...state.seedProfile,
            primaryStressor: null, // Never persist stress information
          },
          patAgents: state.patAgents,
          patOnboardComplete: state.patOnboardComplete,
          sevenDayPlan: state.sevenDayPlan,
          lastCheckIn: state.lastCheckIn,
          streakDays: state.streakDays,
          nodeStatus: state.nodeStatus,
          communityProfile: state.communityProfile,
          legacyRecord: state.legacyRecord,
          isOnboarding: state.isOnboarding,
          onboardingStep: state.onboardingStep
        })
      }
    )
  )
)

// Convenience selectors
export const useLifecyclePhase = () => useLifecycleStore(s => s.phase)
export const useSeedProfile = () => useLifecycleStore(s => s.seedProfile)
export const usePATAgents = () => useLifecycleStore(s => s.patAgents)
export const useSevenDayPlan = () => useLifecycleStore(s => s.sevenDayPlan)
export const useNodeStatus = () => useLifecycleStore(s => s.nodeStatus)
export const useCommunityProfile = () => useLifecycleStore(s => s.communityProfile)
export const useLegacyRecord = () => useLifecycleStore(s => s.legacyRecord)

