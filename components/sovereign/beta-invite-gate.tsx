"use client"

import { useState, useCallback, type FormEvent } from "react"
import { G, BG, TXT, DIM, DIMR, LINE } from "./design-tokens"

type BetaInviteGateProps = {
  onAdmitted: () => void
}

export function BetaInviteGate({ onAdmitted }: BetaInviteGateProps) {
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = useCallback(async (e?: FormEvent) => {
    e?.preventDefault()
    if (!code.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/beta/verify-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.admitted) {
        throw new Error(data.error || "Invitation not accepted")
      }
      onAdmitted()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invitation failed")
    } finally {
      setLoading(false)
    }
  }, [code, loading, onAdmitted])

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: BG, fontFamily: "var(--font-jetbrains), monospace", padding: 24,
    }}>
      <div style={{
        maxWidth: 440, width: "100%", border: `1px solid ${LINE}`, borderRadius: 8,
        padding: "32px 28px", background: "rgba(7,17,29,.85)",
      }}>
        <div style={{ fontFamily: "var(--font-cinzel), serif", color: G, fontSize: 11, letterSpacing: 4, marginBottom: 8 }}>
          BIZRA BETA
        </div>
        <h1 style={{ color: TXT, fontSize: 22, fontFamily: "var(--font-playfair), serif", margin: "0 0 12px", fontWeight: 600 }}>
          Invitation required
        </h1>
        <p style={{ color: DIM, fontSize: 13, lineHeight: 1.7, margin: "0 0 24px" }}>
          The sovereign node is in <strong style={{ color: G }}>invitation-only beta</strong>.
          Public access opens when the proof spine is ready. Enter your invite code to continue.
        </p>
        <form onSubmit={submit}>
          <label style={{ display: "block", fontSize: 10, color: DIMR, letterSpacing: 2, marginBottom: 8 }}>
            INVITATION CODE
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="your-invite-code"
            autoFocus
            style={{
              width: "100%", boxSizing: "border-box", background: "transparent",
              border: `1px solid ${G}30`, color: TXT, padding: "12px 14px", borderRadius: 4,
              fontSize: 14, fontFamily: "var(--font-jetbrains), monospace", outline: "none", marginBottom: 16,
            }}
          />
          {error && (
            <p style={{ color: "#ef4444", fontSize: 12, margin: "0 0 12px" }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={!code.trim() || loading}
            style={{
              width: "100%", background: code.trim() ? `${G}18` : "transparent",
              border: `1px solid ${code.trim() ? G + "50" : LINE}`,
              color: code.trim() ? G : `${TXT}30`, padding: "12px 16px", borderRadius: 4,
              fontSize: 12, letterSpacing: 3, cursor: code.trim() && !loading ? "pointer" : "default",
            }}
          >
            {loading ? "VERIFYING…" : "ENTER BETA"}
          </button>
        </form>
        <p style={{ color: DIMR, fontSize: 10, marginTop: 20, lineHeight: 1.6 }}>
          No code? Request a design-partner invite from the BIZRA operator.
          Marketing site remains readable; node initialization stays gated.
        </p>
      </div>
    </div>
  )
}
