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
  | { phase: "error"; message: string }

export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [state, setState] = useState<AcceptState>({ phase: "loading" })

  useEffect(() => {
    async function fetchInvite() {
      try {
        const res = await fetch(`/api/invites/${encodeURIComponent(params.token)}`)
        if (!res.ok) {
          const data = await res.json()
          setState({ phase: "error", message: data.error || "Invite not found" })
          return
        }
        const invite: InvitePreview = await res.json()
        setState({ phase: "preview", invite })
      } catch {
        setState({ phase: "error", message: "Failed to load invite details" })
      }
    }

    fetchInvite()
  }, [params.token])

  const handleAccept = async () => {
    setState({ phase: "accepting" })
    try {
      const res = await fetch(`/api/invites/${encodeURIComponent(params.token)}/accept`, {
        method: "POST",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to accept invite")
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

        {state.phase === "error" && (
          <div className="space-y-3">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
            <h2 className="text-lg font-semibold text-[#F8F6F1]">
              Invite Unavailable
            </h2>
            <p className="text-red-400 text-sm">{state.message}</p>
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
