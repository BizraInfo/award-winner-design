import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import type {
  TerminalStateName,
  ExecutionPathLabel,
  MissionReceipt,
  BriefingContext,
} from "@/lib/sovereign-client"

/**
 * Terminal v1 — 7-view state management
 *
 * Build Contract §3: Seven Views. This store manages which view is active,
 * terminal state machine sync, and critical event acknowledgement.
 */

export type TerminalView =
  | "dashboard"
  | "mission"
  | "timeline"
  | "memory"
  | "agents"
  | "network"
  | "settings"

interface CriticalEvent {
  id: string
  category: string
  message: string
  timestamp: number
}

interface TerminalStore {
  // Active view
  activeView: TerminalView
  setActiveView: (view: TerminalView) => void

  // Terminal state mirror (from backend polling)
  terminalState: TerminalStateName
  executionPath: ExecutionPathLabel
  activeMissionId: string
  setTerminalState: (
    state: TerminalStateName,
    path: ExecutionPathLabel,
    missionId: string,
  ) => void

  // Connection status
  isConnected: boolean
  setConnected: (connected: boolean) => void

  // Last receipt (for mission completion rendering)
  lastReceipt: MissionReceipt | null
  setLastReceipt: (receipt: MissionReceipt | null) => void

  // Mission execution state (Contract §10.2)
  missionSubmitting: boolean
  missionError: string | null
  setMissionSubmitting: (submitting: boolean) => void
  setMissionError: (error: string | null) => void

  // Briefing (session continuity)
  briefing: BriefingContext | null
  setBriefing: (ctx: BriefingContext | null) => void

  // Critical events (sticky until acknowledged — Contract §7.3)
  criticalEvents: CriticalEvent[]
  addCriticalEvent: (event: CriticalEvent) => void
  acknowledgeCriticalEvent: (id: string) => void
}

export const useTerminalStore = create<TerminalStore>()(
  subscribeWithSelector((set) => ({
    activeView: "dashboard",
    setActiveView: (view) => set({ activeView: view }),

    terminalState: "boot",
    executionPath: "system_2",
    activeMissionId: "",
    setTerminalState: (state, path, missionId) =>
      set({ terminalState: state, executionPath: path, activeMissionId: missionId }),

    isConnected: false,
    setConnected: (connected) => set({ isConnected: connected }),

    lastReceipt: null,
    setLastReceipt: (receipt) => set({ lastReceipt: receipt }),

    missionSubmitting: false,
    missionError: null,
    setMissionSubmitting: (submitting) => set({ missionSubmitting: submitting }),
    setMissionError: (error) => set({ missionError: error }),

    briefing: null,
    setBriefing: (ctx) => set({ briefing: ctx }),

    criticalEvents: [],
    addCriticalEvent: (event) =>
      set((s) => {
        if (s.criticalEvents.some((e) => e.id === event.id)) return s
        return { criticalEvents: [...s.criticalEvents, event] }
      }),
    acknowledgeCriticalEvent: (id) =>
      set((s) => ({
        criticalEvents: s.criticalEvents.filter((e) => e.id !== id),
      })),
  })),
)

// Selectors
export const useActiveView = () => useTerminalStore((s) => s.activeView)
export const useIsConnected = () => useTerminalStore((s) => s.isConnected)
export const useCriticalEvents = () => useTerminalStore((s) => s.criticalEvents)
