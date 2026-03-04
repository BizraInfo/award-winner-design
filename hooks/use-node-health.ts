"use client"

import { useState, useEffect } from "react"

interface CortexStatus {
  status: string
  model: string
}

interface NodeHealth {
  status: string
  version: string
  mode: string
  uptime: number
  hardware: any
  agent_status: string
  cortex: CortexStatus
}

export function useNodeHealth() {
  const [health, setHealth] = useState<NodeHealth | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const endpoint = process.env.NEXT_PUBLIC_NODE_HEALTH_URL || "/api/scaffold/health"

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(endpoint)
        if (res.ok) {
          const data = await res.json()
          setHealth(data)
          const connected =
            data?.agent_status === "online" ||
            data?.status === "healthy" ||
            data?.status === "degraded"
          setIsConnected(connected)
          setLastUpdated(new Date())
        } else {
          setIsConnected(false)
        }
      } catch (error) {
        setIsConnected(false)
      }
    }

    // Check immediately
    checkHealth()

    // Poll every 2 seconds
    const interval = setInterval(checkHealth, 2000)

    return () => clearInterval(interval)
  }, [endpoint])

  return { health, isConnected, lastUpdated }
}
