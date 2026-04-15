"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Shield, Loader2, AlertCircle, CheckCircle } from "lucide-react"

type InvitePreview = {
  email: string
  role: string
  workspaceId: string
  expiresAt: number
}

type AcceptState =
  | { phase: "loading" }
  | { phase: "preview"; invite: InvitePreview }
  | { phase: "accepting" }
  | { phase: "accepted"; workspaceId: string }
  | { phase: "signInRequired"; invite: InvitePreview }
  | { phase: "error"; message: string; kind: "expired" | "revoked" | "not_found" | "email_mismatch" | "already_accepted" | "generic" }

export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [state, setState] = useState<AcceptState>({ phase: "loading" })

  useEffect(() => {
    async function fetchInvite() {
      try {
        const res = await fetch(`/api/invites/${encodeURIComponent(params.token)}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Invite not found" }))
          const message = data.error || "Invite not found"
          const kind =
            res.status === 404
              ? "not_found"
              : /revoked/i.test(message)
              ? "revoked"
              : /expired/i.test(message)
              ? "expired"
              : /already/i.test(message)
              ? "already_accepted"
              : "generic"
          setState({ phase: "error", message, kind })
          return
        }
        const invite: InvitePreview = await res.json()
        setState({ phase: "preview", invite })
      } catch {
        setState({ phase: "error", message: "Failed to load invite details", kind: "generic" })
      }
    }

    fetchInvite()
  }, [params.token])

  const handleAccept = async () => {
    const invite = state.phase === "preview" ? state.invite : null
    setState({ phase: "accepting" })
    try {
      const res = await fetch(`/api/invites/${encodeURIComponent(params.token)}/accept`, {
        method: "POST",
      })
      if (res.status === 401 && invite) {
        setState({ phase: "signInRequired", invite })
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to accept invite" }))
        const message = data.error || "Failed to accept invite"
        const kind =
          /revoked/i.test(message)
            ? "revoked"
            : /expired/i.test(message)
            ? "expired"
            : /already/i.test(message)
            ? "already_accepted"
            : /signed in as|sent to/i.test(message)
            ? "email_mismatch"
            : "generic"
        setState({ phase: "error", message, kind })
        return
      }
      const data = await res.json()
      setState({ phase: "accepted", workspaceId: data.workspaceId })
      setTimeout(() => {
        router.push("/")
      }, 2000)
    } catch (err) {
      setState({
        phase: "error",
        message: err instanceof Error ? err.message : "Failed to accept",
        kind: "generic",
      })
    }
  }

  return (
    <div className="min-h-screen bg-[#060E1B] flex items-center justify-center p-4">
      <div className="bg-[#0A1628] border border-[#C9A962]/20 rounded-xl p-8 max-w-md w-full shadow-2xl text-center">
        <Shield className="w-12 h-12 text-[#C9A962] mx-auto mb-4" />

        {state.phase === "loading" && (
          <div className="space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#C9A962] mx-auto" />
            <p className="text-gray-400 text-sm">Loading invite...</p>
          </div>
        )}

        {state.phase === "preview" && (
          <div className="space-y-4">
            <h1 className="text-xl font-semibold text-[#F8F6F1]">
              You&apos;re Invited
            </h1>
            <p className="text-gray-400 text-sm">
              You&apos;ve been invited to join workspace{" "}
              <span className="text-[#C9A962] font-medium">
                {state.invite.workspaceId}
              </span>{" "}
              as a{" "}
              <span className="text-[#F8F6F1] font-medium capitalize">
                {state.invite.role}
              </span>
              .
            </p>
            <p className="text-gray-500 text-xs">
              Invite for: {state.invite.email}
              <br />
              Expires: {new Date(state.invite.expiresAt).toLocaleDateString()}
            </p>
            <button
              onClick={handleAccept}
              className="w-full px-4 py-3 bg-[#C9A962] text-[#0A1628] rounded-lg font-medium
                         hover:bg-[#D4B972] transition-colors"
            >
              Accept Invite
            </button>
          </div>
        )}

        {state.phase === "accepting" && (
          <div className="space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#C9A962] mx-auto" />
            <p className="text-gray-400 text-sm">Accepting invite...</p>
          </div>
        )}

        {state.phase === "accepted" && (
          <div className="space-y-2">
            <CheckCircle className="w-8 h-8 text-green-400 mx-auto" />
            <h2 className="text-lg font-semibold text-[#F8F6F1]">Welcome!</h2>
            <p className="text-gray-400 text-sm">
              You&apos;ve joined the workspace. Redirecting...
            </p>
          </div>
        )}

        {state.phase === "signInRequired" && (
          <div className="space-y-3">
            <AlertCircle className="w-8 h-8 text-[#C9A962] mx-auto" />
            <h2 className="text-lg font-semibold text-[#F8F6F1]">Please sign in</h2>
            <p className="text-gray-400 text-sm">
              This invite is for{" "}
              <span className="text-[#F8F6F1] font-medium">{state.invite.email}</span>. Sign in
              with that account, then return to this page and click Accept again.
            </p>
            <button
              onClick={handleAccept}
              className="w-full px-4 py-2 bg-[#C9A962] text-[#0A1628] rounded-lg text-sm font-medium
                         hover:bg-[#D4B972] transition-colors"
            >
              Retry Accept
            </button>
          </div>
        )}

        {state.phase === "error" && (
          <div className="space-y-3">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
            <h2 className="text-lg font-semibold text-[#F8F6F1]">
              {state.kind === "expired"
                ? "Invite Expired"
                : state.kind === "revoked"
                ? "Invite Revoked"
                : state.kind === "already_accepted"
                ? "Already Accepted"
                : state.kind === "email_mismatch"
                ? "Wrong Account"
                : state.kind === "not_found"
                ? "Invite Not Found"
                : "Invite Unavailable"}
            </h2>
            <p className="text-red-400 text-sm">{state.message}</p>
            {state.kind === "expired" || state.kind === "revoked" ? (
              <p className="text-gray-500 text-xs">
                Ask the person who invited you to send a fresh invite.
              </p>
            ) : null}
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
            >
              Go to Home
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
