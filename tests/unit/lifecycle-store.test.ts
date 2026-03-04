import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

// Mock zustand persist middleware to avoid localStorage complexity in tests
vi.mock('zustand/middleware', async () => {
  const actual = await vi.importActual('zustand/middleware')
  return {
    ...actual,
    persist: (config: unknown) => config,
  }
})

// Import after mocking
import { useLifecycleStore, type LifecyclePhase, type AgentRole } from '@/store/use-lifecycle-store'

describe('useLifecycleStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useLifecycleStore.getState()
    store.resetLifecycle()
  })

  describe('initial state', () => {
    it('should start in FIRST_ENCOUNTER phase', () => {
      const { result } = renderHook(() => useLifecycleStore())
      expect(result.current.phase).toBe('FIRST_ENCOUNTER')
    })

    it('should have empty seed profile', () => {
      const { result } = renderHook(() => useLifecycleStore())
      expect(result.current.seedProfile.primaryDesire).toBeNull()
      expect(result.current.seedProfile.primaryStressor).toBeNull()
      expect(result.current.seedProfile.profileComplete).toBe(false)
    })

    it('should have default PAT agents', () => {
      const { result } = renderHook(() => useLifecycleStore())
      expect(result.current.patAgents.length).toBeGreaterThan(0)
      expect(result.current.patAgents.some((a: { id: AgentRole }) => a.id === 'master_reasoner')).toBe(true)
    })

    it('should start in onboarding mode', () => {
      const { result } = renderHook(() => useLifecycleStore())
      expect(result.current.isOnboarding).toBe(true)
      expect(result.current.onboardingStep).toBe(0)
    })
  })

  describe('phase transitions', () => {
    it('should transition to SEED_TEST phase', () => {
      const { result } = renderHook(() => useLifecycleStore())
      
      act(() => {
        result.current.setPhase('SEED_TEST')
      })
      
      expect(result.current.phase).toBe('SEED_TEST')
    })

    it('should transition through all phases', () => {
      const { result } = renderHook(() => useLifecycleStore())
      const phases: LifecyclePhase[] = [
        'SEED_TEST',
        'PAT_INTRO', 
        'FIRST_SESSION',
        'DAILY_LOOP',
        'NODE_ACTIVATION',
        'COMMUNITY',
        'LEGACY'
      ]
      
      phases.forEach(phase => {
        act(() => {
          result.current.setPhase(phase)
        })
        expect(result.current.phase).toBe(phase)
      })
    })

    it('should advance phase correctly', () => {
      const { result } = renderHook(() => useLifecycleStore())
      
      expect(result.current.phase).toBe('FIRST_ENCOUNTER')
      
      act(() => {
        result.current.advancePhase()
      })
      
      expect(result.current.phase).toBe('SEED_TEST')
    })
  })

  describe('seed profile updates', () => {
    it('should update primary desire', () => {
      const { result } = renderHook(() => useLifecycleStore())
      
      act(() => {
        result.current.updateSeedProfile({ primaryDesire: 'income' })
      })
      
      expect(result.current.seedProfile.primaryDesire).toBe('income')
    })

    it('should update primary stressor', () => {
      const { result } = renderHook(() => useLifecycleStore())
      
      act(() => {
        result.current.updateSeedProfile({ primaryStressor: 'financial_stress' })
      })
      
      expect(result.current.seedProfile.primaryStressor).toBe('financial_stress')
    })

    it('should update weekly hours', () => {
      const { result } = renderHook(() => useLifecycleStore())
      
      act(() => {
        result.current.updateSeedProfile({ weeklyHours: 10 })
      })
      
      expect(result.current.seedProfile.weeklyHours).toBe(10)
    })

    it('should complete seed test', () => {
      const { result } = renderHook(() => useLifecycleStore())
      
      act(() => {
        result.current.updateSeedProfile({
          primaryDesire: 'income',
          weeklyHours: 10,
          existingAssets: {
            skills: ['coding'],
            hasComputer: true,
            hasInternet: true,
            other: ''
          },
          primaryStressor: 'time'
        })
        result.current.completeSeedTest()
      })
      
      expect(result.current.seedProfile.profileComplete).toBe(true)
      expect(result.current.seedProfile.createdAt).not.toBeNull()
    })
  })

  describe('PAT agent selection', () => {
    it('should select an agent', () => {
      const { result } = renderHook(() => useLifecycleStore())
      
      act(() => {
        result.current.selectAgent('master_reasoner')
      })
      
      const agent = result.current.patAgents.find((a: { id: AgentRole }) => a.id === 'master_reasoner')
      expect(agent?.isSelected).toBe(true)
    })

    it('should select agent as primary', () => {
      const { result } = renderHook(() => useLifecycleStore())
      
      act(() => {
        result.current.selectAgent('master_reasoner', true)
      })
      
      const agent = result.current.patAgents.find((a: { id: AgentRole }) => a.id === 'master_reasoner')
      expect(agent?.isPrimary).toBe(true)
      expect(agent?.isSelected).toBe(true)
    })

    it('should deselect an agent', () => {
      const { result } = renderHook(() => useLifecycleStore())
      
      act(() => {
        result.current.selectAgent('master_reasoner')
      })
      
      act(() => {
        result.current.deselectAgent('master_reasoner')
      })
      
      const agent = result.current.patAgents.find((a: { id: AgentRole }) => a.id === 'master_reasoner')
      expect(agent?.isSelected).toBe(false)
    })

    it('should complete PAT onboarding', () => {
      const { result } = renderHook(() => useLifecycleStore())
      
      act(() => {
        result.current.selectAgent('master_reasoner', true)
        result.current.completePATOnboard()
      })
      
      expect(result.current.patOnboardComplete).toBe(true)
    })
  })

  describe('daily loop - check-ins', () => {
    it('should record check-in and update streak', () => {
      const { result } = renderHook(() => useLifecycleStore())
      
      act(() => {
        result.current.recordCheckIn()
      })
      
      expect(result.current.streakDays).toBe(1)
      expect(result.current.lastCheckIn).not.toBeNull()
    })

    it('should not increment streak on same-day check-in', () => {
      const { result } = renderHook(() => useLifecycleStore())
      
      act(() => {
        result.current.recordCheckIn()
      })
      
      expect(result.current.streakDays).toBe(1)
      
      // Immediate second check-in should NOT increment streak (same day)
      act(() => {
        result.current.recordCheckIn()
      })
      
      // Streak stays at 1 because daysSinceLastCheckIn is 0, not 1
      expect(result.current.streakDays).toBe(1)
    })
  })

  describe('node activation', () => {
    it('should activate node with settings', () => {
      const { result } = renderHook(() => useLifecycleStore())
      
      const settings = {
        cpuShare: 30,
        gpuShare: 10,
        storageShare: 20,
        availableHours: [8, 22] as [number, number],
        alwaysAvailable: false
      }
      
      act(() => {
        result.current.activateNode(settings)
      })
      
      expect(result.current.nodeStatus.isActive).toBe(true)
      expect(result.current.nodeStatus.resourceSettings.cpuShare).toBe(30)
      expect(result.current.nodeStatus.activatedAt).not.toBeNull()
    })
  })

  describe('reset lifecycle', () => {
    it('should reset all state to initial values', () => {
      const { result } = renderHook(() => useLifecycleStore())
      
      // Make some changes
      act(() => {
        result.current.setPhase('DAILY_LOOP')
        result.current.updateSeedProfile({ primaryDesire: 'income' })
        result.current.recordCheckIn()
      })
      
      // Verify changes
      expect(result.current.phase).toBe('DAILY_LOOP')
      expect(result.current.seedProfile.primaryDesire).toBe('income')
      expect(result.current.streakDays).toBe(1)
      
      // Reset
      act(() => {
        result.current.resetLifecycle()
      })
      
      // Verify reset
      expect(result.current.phase).toBe('FIRST_ENCOUNTER')
      expect(result.current.seedProfile.primaryDesire).toBeNull()
      expect(result.current.streakDays).toBe(0)
    })
  })

  describe('onboarding', () => {
    it('should update onboarding step', () => {
      const { result } = renderHook(() => useLifecycleStore())
      
      act(() => {
        result.current.setOnboardingStep(2)
      })
      
      expect(result.current.onboardingStep).toBe(2)
    })

    it('should complete onboarding', () => {
      const { result } = renderHook(() => useLifecycleStore())
      
      act(() => {
        result.current.completeOnboarding()
      })
      
      expect(result.current.isOnboarding).toBe(false)
      expect(result.current.phase).toBe('DAILY_LOOP')
    })
  })
})
