"use client"

import { useEffect, useState, useCallback } from "react"
import { RefreshCw, XCircle, Mail, Clock, Loader2 } from "lucide-react"

interface Invite {
  id: string
  email: string
  role: string
  status: "pending" | "accepted" | "revoked" | "expired"
  createdAt: number
  expiresAt: number
  resentCount: number
}

interface PendingInvitesListProps {
  workspaceId: string
  /** Bump this from the parent to force a refetch (e.g. after a new invite is created). */
  refreshSignal?: number
}

export function PendingInvitesList({ workspaceId, refreshSignal = 0 }: PendingInvitesListProps) {
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchInvites = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/invites`)
      if (!res.ok) throw new Error("Failed to load invites")
      const data = await res.json()
      setInvites(data.invites)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invites")
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchInvites()
  }, [fetchInvites, refreshSignal])

  const handleResend = async (inviteId: string) => {
    setActionLoading(inviteId)
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/invites/${inviteId}/resend`,
        { method: "POST" }
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Resend failed")
      }
      await fetchInvites()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resend failed")
    } finally {
      setActionLoading(null)
    }
  }

  const handleRevoke = async (inviteId: string) => {
    setActionLoading(inviteId)
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/invites/${inviteId}/revoke`,
        { method: "POST" }
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Revoke failed")
      }
      await fetchInvites()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed")
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })

  const isExpired = (invite: Invite) =>
    invite.status === "pending" && invite.expiresAt < Date.now()

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading invites...
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-sm">
        {error}
      </div>
    )
  }

  if (invites.length === 0) {
    return (
      <p className="text-gray-500 text-sm py-4">No invites yet.</p>
    )
  }

  return (
    <div className="space-y-2">
      {invites.map((invite) => {
        const expired = isExpired(invite)
        const effectiveStatus = expired ? "expired" : invite.status

        return (
          <div
            key={invite.id}
            className="bg-[#0D1F3C] border border-[#C9A962]/10 rounded-lg px-4 py-3 
                       flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Mail className="w-4 h-4 text-gray-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm text-[#F8F6F1] truncate">{invite.email}</div>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <span className="capitalize">{invite.role}</span>
                  <span>·</span>
                  <span>{formatDate(invite.createdAt)}</span>
                  {invite.resentCount > 0 && (
                    <>
                      <span>·</span>
                      <span>Resent ×{invite.resentCount}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <StatusBadge status={effectiveStatus} />

              {effectiveStatus === "pending" && (
                <>
                  <button
                    onClick={() => handleResend(invite.id)}
                    disabled={actionLoading === invite.id}
                    title="Resend invite"
                    className="p-1.5 text-gray-500 hover:text-[#C9A962] transition-colors 
                               disabled:opacity-50"
                  >
                    {actionLoading === invite.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleRevoke(invite.id)}
                    disabled={actionLoading === invite.id}
                    title="Revoke invite"
                    className="p-1.5 text-gray-500 hover:text-red-400 transition-colors 
                               disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    accepted: "bg-green-500/10 text-green-400 border-green-500/20",
    revoked: "bg-red-500/10 text-red-400 border-red-500/20",
    expired: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  }

  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full border capitalize ${
        styles[status] || styles.expired
      }`}
    >
      {status === "pending" && <Clock className="w-3 h-3 inline mr-1 -mt-0.5" />}
      {status}
    </span>
  )
}
