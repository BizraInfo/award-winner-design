"use client"

import { useState } from "react"
import { UserPlus, X, Loader2 } from "lucide-react"

interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated?: () => void
  workspaceId: string
  /** Current user's roles — gates which target roles the form offers. */
  currentUserRoles: string[]
}

type InviteRole = "owner" | "admin" | "member" | "viewer"

const ROLE_DESCRIPTIONS: Record<InviteRole, string> = {
  owner: "Full control. Can assign other Owners. Grant carefully.",
  admin: "Manage members and invites. Cannot grant Owner.",
  member: "Can view and contribute to workspace projects and resources.",
  viewer: "Read-only access to workspace projects and dashboards.",
}

function allowedRolesFor(currentRoles: string[]): InviteRole[] {
  if (currentRoles.includes("owner")) return ["owner", "admin", "member", "viewer"]
  if (currentRoles.includes("admin")) return ["admin", "member", "viewer"]
  return ["member", "viewer"]
}

export function InviteModal({ isOpen, onClose, onCreated, workspaceId, currentUserRoles }: InviteModalProps) {
  const choices = allowedRolesFor(currentUserRoles)
  const defaultRole: InviteRole = choices.includes("member") ? "member" : choices[choices.length - 1]
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<InviteRole>(defaultRole)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSending(true)

    try {
      const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role, message: message.trim() || undefined }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to send invite")
      }

      setSuccess(true)
      setEmail("")
      setMessage("")
      onCreated?.()
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0A1628] border border-[#C9A962]/20 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#C9A962]" />
            <h2 className="text-xl font-semibold text-[#F8F6F1]">
              Invite Team Member
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center">
            <div className="text-[#C9A962] text-lg font-medium mb-1">Invite Sent</div>
            <p className="text-gray-400 text-sm">
              An invitation has been sent to {email || "the recipient"}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="invite-email" className="block text-sm text-gray-400 mb-1">
                Email address
              </label>
              <input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                required
                autoFocus
                className="w-full bg-[#0D1F3C] border border-[#C9A962]/10 rounded-lg px-3 py-2 
                           text-[#F8F6F1] placeholder-gray-600 text-sm
                           focus:outline-none focus:border-[#C9A962]/40 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="invite-role" className="block text-sm text-gray-400 mb-1">
                Role
              </label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value as InviteRole)}
                className="w-full bg-[#0D1F3C] border border-[#C9A962]/10 rounded-lg px-3 py-2
                           text-[#F8F6F1] text-sm
                           focus:outline-none focus:border-[#C9A962]/40 transition-colors"
              >
                {choices.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">{ROLE_DESCRIPTIONS[role]}</p>
            </div>

            <div>
              <label htmlFor="invite-message" className="block text-sm text-gray-400 mb-1">
                Message <span className="text-gray-600">(optional)</span>
              </label>
              <textarea
                id="invite-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Add a note for the recipient"
                className="w-full bg-[#0D1F3C] border border-[#C9A962]/10 rounded-lg px-3 py-2
                           text-[#F8F6F1] text-sm placeholder-gray-600 resize-none
                           focus:outline-none focus:border-[#C9A962]/40 transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending || !email}
                className="px-4 py-2 bg-[#C9A962] text-[#0A1628] rounded-lg text-sm font-medium
                           hover:bg-[#D4B972] disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors flex items-center gap-2"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Invite"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
