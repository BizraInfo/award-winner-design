"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Shield, Loader2, AlertCircle } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Login failed" }))
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      const next = new URLSearchParams(window.location.search).get("next")
      router.push(next || "/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "#030810" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Shield className="w-10 h-10 mx-auto mb-3" style={{ color: "#C9A962" }} />
          <h1 style={{
            fontFamily: "var(--font-cinzel), serif",
            color: "#C9A962",
            fontSize: 18,
            letterSpacing: 6,
          }}>
            BIZRA
          </h1>
          <p style={{ color: "#F8F6F180", fontSize: 11, marginTop: 4, letterSpacing: 2 }}>
            SOVEREIGN NODE ACCESS
          </p>
        </div>

        <form onSubmit={handleSubmit}
          className="border rounded-xl p-6 space-y-4"
          style={{
            background: "#0A1628",
            borderColor: "rgba(201,169,98,0.15)",
          }}>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded text-sm"
              style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.15)" }}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs mb-1.5" style={{ color: "#F8F6F160", letterSpacing: 1 }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="demo@bizra.ai"
              autoFocus
              className="w-full px-3 py-2.5 rounded text-sm outline-none"
              style={{
                background: "#060E1B",
                border: "1px solid rgba(201,169,98,0.12)",
                color: "#F8F6F1",
              }}
            />
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: "#F8F6F160", letterSpacing: 1 }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="demo123"
              className="w-full px-3 py-2.5 rounded text-sm outline-none"
              style={{
                background: "#060E1B",
                border: "1px solid rgba(201,169,98,0.12)",
                color: "#F8F6F1",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-2.5 rounded text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              background: "#C9A962",
              color: "#0A1628",
            }}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              "Sign In"
            )}
          </button>

          <p className="text-center text-xs" style={{ color: "#F8F6F130" }}>
            Demo credentials pre-filled in placeholders
          </p>
        </form>
      </div>
    </div>
  )
}
