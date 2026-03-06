"use client"

/**
 * Sovereign Registration Hook — Phase 75.03
 *
 * Bridges the local zustand onboarding flow with sovereign API registration.
 * Local-first: onboarding completes instantly via zustand, then fires
 * a background registration call to the sovereign backend.
 *
 * If registration fails, the user continues normally — the frontend
 * works fully offline. Registration is retried on next app load.
 */

import { useEffect, useRef } from "react"
import { useLifecycleStore, useLifecyclePhase } from "@/store/use-lifecycle-store"

const REGISTRATION_KEY = "bizra_sovereign_registered"

interface RegistrationPayload {
  username: string
  email: string
  password: string
  accept_covenant: boolean
}

async function registerWithSovereign(payload: RegistrationPayload): Promise<boolean> {
  try {
    const res = await fetch("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      // 409 = already registered — treat as success
      if (res.status === 409) return true
      console.warn("[sovereign] Registration failed:", err.error || res.status)
      return false
    }

    const tokens = await res.json()
    // Store access token for subsequent API calls
    if (tokens.access_token) {
      localStorage.setItem("bizra_api_token", tokens.access_token)
    }
    if (tokens.refresh_token) {
      localStorage.setItem("bizra_refresh_token", tokens.refresh_token)
    }

    return true
  } catch {
    console.warn("[sovereign] Registration unreachable — will retry on next load")
    return false
  }
}

/**
 * Hook that watches the lifecycle phase and triggers sovereign registration
 * when the user completes the SEED_TEST and transitions to PAT_INTRO.
 *
 * Call this once in the app shell (e.g., layout or LifecycleRouter).
 */
export function useSovereignRegistration() {
  const phase = useLifecyclePhase()
  const seedProfile = useLifecycleStore((s) => s.seedProfile)
  const attempted = useRef(false)

  useEffect(() => {
    // Only attempt registration once per session
    if (attempted.current) return

    // Only register when user has completed seed test (phase >= PAT_INTRO)
    const REGISTRATION_PHASES = new Set([
      "PAT_INTRO",
      "FIRST_SESSION",
      "DAILY_LOOP",
      "NODE_ACTIVATION",
      "COMMUNITY",
      "LEGACY",
    ])
    if (!REGISTRATION_PHASES.has(phase)) return

    // Skip if already registered
    if (localStorage.getItem(REGISTRATION_KEY) === "true") return

    // Skip if profile not complete
    if (!seedProfile.profileComplete) return

    attempted.current = true

    // Generate a deterministic username from seed profile
    // Real registration will use proper email/password from identity step
    const pseudoId = `seed_${Date.now().toString(36)}`

    registerWithSovereign({
      username: pseudoId,
      email: `${pseudoId}@node.bizra.ai`,
      password: crypto.randomUUID(), // Ephemeral — real auth uses device keys
      accept_covenant: true,
    }).then((success) => {
      if (success) {
        localStorage.setItem(REGISTRATION_KEY, "true")
      }
    })
  }, [phase, seedProfile])
}
