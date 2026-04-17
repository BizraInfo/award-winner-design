"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Loader2, Shield } from "lucide-react"
import type { Mission } from "@/lib/dema/types"

interface Props {
  onMissionCreated: (mission: Mission) => void
}

export function IntentEntry({ onMissionCreated }: Props) {
  const [intent, setIntent] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  const submit = async () => {
    if (!intent.trim() || loading) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: intent.trim(), priority: "Normal" }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const mission: Mission = await res.json()
      onMissionCreated(mission)
      setIntent("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create mission")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: "24px 0" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
        color: "#C9A962", fontSize: 10, letterSpacing: 3,
        fontFamily: "var(--font-cinzel), serif",
      }}>
        <Shield style={{ width: 14, height: 14 }} />
        MISSION INTENT
      </div>

      <div style={{
        display: "flex", gap: 8, alignItems: "flex-end",
      }}>
        <textarea
          ref={ref}
          value={intent}
          onChange={e => setIntent(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit() } }}
          placeholder="What do you want BIZRA to do?"
          rows={2}
          style={{
            flex: 1, padding: "12px 14px", fontSize: 13, resize: "none",
            background: "#060E1B", border: "1px solid rgba(201,169,98,0.12)",
            borderRadius: 8, color: "#F8F6F1", outline: "none",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
          }}
        />
        <button
          onClick={submit}
          disabled={loading || !intent.trim()}
          style={{
            padding: "12px 16px", borderRadius: 8, border: "none",
            background: intent.trim() ? "#C9A962" : "rgba(201,169,98,0.2)",
            color: "#0A1628", cursor: intent.trim() ? "pointer" : "default",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 16, height: 16 }} />}
        </button>
      </div>

      {error && (
        <div style={{
          marginTop: 8, padding: "6px 10px", borderRadius: 4, fontSize: 11,
          background: "rgba(239,68,68,0.08)", color: "#ef4444",
          border: "1px solid rgba(239,68,68,0.15)",
        }}>
          {error}
        </div>
      )}
    </div>
  )
}
