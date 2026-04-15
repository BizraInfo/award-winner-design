"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, User as UserIcon, Trash2, ChevronDown } from "lucide-react"

type Role = "owner" | "admin" | "member" | "viewer"

interface Member {
  id: string
  workspaceId: string
  userId: string
  email: string
  role: Role
  joinedAt: number
  invitedBy?: string
  inviteId?: string
  lastRoleChangeAt?: number
  lastRoleChangeBy?: string
}

interface Props {
  workspaceId: string
  currentUserId: string
  currentUserRoles: string[]
  /** Bump from parent to refetch (e.g. after an invite is accepted externally). */
  refreshSignal?: number
}

function allowedAssignRolesFor(currentRoles: string[]): Role[] {
  if (currentRoles.includes("owner")) return ["owner", "admin", "member", "viewer"]
  if (currentRoles.includes("admin")) return ["admin", "member", "viewer"]
  return []
}

export function MembersList({
  workspaceId,
  currentUserId,
  currentUserRoles,
  refreshSignal = 0,
}: Props) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const assignableRoles = allowedAssignRolesFor(currentUserRoles)
  const canManage = assignableRoles.length > 0

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/members`
      )
      if (!res.ok) throw new Error("Failed to load members")
      const data = await res.json()
      setMembers(data.members ?? [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members")
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers, refreshSignal])

  const ownersCount = members.filter((m) => m.role === "owner").length

  async function changeRole(member: Member, newRole: Role) {
    if (newRole === member.role) return
    setBusyId(member.id)
    setError(null)
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(
          workspaceId
        )}/members/${encodeURIComponent(member.id)}/role`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(data.error || `Request failed (${res.status})`)
      }
      await fetchMembers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Role change failed")
    } finally {
      setBusyId(null)
    }
  }

  async function removeMember(member: Member) {
    const confirmed = window.confirm(
      `Remove ${member.email} from this workspace?`
    )
    if (!confirmed) return
    setBusyId(member.id)
    setError(null)
    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(
          workspaceId
        )}/members/${encodeURIComponent(member.id)}`,
        { method: "DELETE" }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(data.error || `Request failed (${res.status})`)
      }
      await fetchMembers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed")
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading members...
      </div>
    )
  }

  if (error && members.length === 0) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-sm">
        {error}
      </div>
    )
  }

  if (members.length === 0) {
    return <p className="text-gray-500 text-sm py-4">No members yet.</p>
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-sm">
          {error}
        </div>
      )}
      {members.map((member) => {
        const isSelf = member.userId === currentUserId
        const isLastOwner = member.role === "owner" && ownersCount === 1
        const canEditRole =
          canManage &&
          !isLastOwner &&
          assignableRoles.length > 0 &&
          // Admin cannot touch an Owner
          !(
            !currentUserRoles.includes("owner") &&
            currentUserRoles.includes("admin") &&
            member.role === "owner"
          )
        const canDelete =
          canManage &&
          !isSelf &&
          !isLastOwner &&
          !(
            !currentUserRoles.includes("owner") &&
            currentUserRoles.includes("admin") &&
            member.role === "owner"
          )

        return (
          <div
            key={member.id}
            className="bg-[#0D1F3C] border border-[#C9A962]/10 rounded-lg px-4 py-3
                       flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <UserIcon className="w-4 h-4 text-gray-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm text-[#F8F6F1] truncate">
                  {member.email}
                  {isSelf && (
                    <span className="ml-2 text-xs text-gray-500">(you)</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  Joined {new Date(member.joinedAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {canEditRole ? (
                <div className="relative">
                  <select
                    value={member.role}
                    disabled={busyId === member.id}
                    onChange={(e) => changeRole(member, e.target.value as Role)}
                    className="appearance-none bg-[#060E1B] border border-[#C9A962]/20 rounded
                               text-[#F8F6F1] text-xs pl-2 pr-7 py-1 capitalize
                               focus:outline-none focus:border-[#C9A962]/60 disabled:opacity-50"
                  >
                    {assignableRoles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                    {/* Always show the current role so the select reflects reality */}
                    {!assignableRoles.includes(member.role) && (
                      <option value={member.role}>{member.role}</option>
                    )}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                </div>
              ) : (
                <span
                  className="text-xs px-2 py-0.5 rounded-full border border-gray-500/20 text-gray-400 capitalize"
                  title={
                    isLastOwner
                      ? "Cannot demote the last Owner — grant Owner to another member first."
                      : undefined
                  }
                >
                  {member.role}
                </span>
              )}

              {canDelete ? (
                <button
                  onClick={() => removeMember(member)}
                  disabled={busyId === member.id}
                  title="Remove member"
                  className="p-1.5 text-gray-500 hover:text-red-400 transition-colors
                             disabled:opacity-50"
                >
                  {busyId === member.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              ) : (
                <span className="w-[28px]" aria-hidden />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
