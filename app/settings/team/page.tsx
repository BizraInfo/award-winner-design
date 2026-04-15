"use client"

import { useEffect, useState } from "react"
import { UserPlus, Users } from "lucide-react"
import { InviteModal } from "@/components/settings/team/invite-modal"
import { PendingInvitesList } from "@/components/settings/team/pending-invites-list"
import { MembersList } from "@/components/settings/team/members-list"

// Default workspace identifier — until a real workspace router exists, settings/team
// operates against this single tenant. Replace with route param when workspace
// switching ships.
const DEFAULT_WORKSPACE_ID = "default"

type Me = {
  sub: string
  email: string
  roles: string[]
  permissions: string[]
}

export default function TeamSettingsPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [meError, setMeError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [refreshSignal, setRefreshSignal] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok) throw new Error(`Auth check failed (${res.status})`)
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setMe(data)
      })
      .catch((err) => {
        if (!cancelled) setMeError(err instanceof Error ? err.message : "Unknown error")
      })
    return () => {
      cancelled = true
    }
  }, [])

  const canInvite =
    me !== null &&
    (me.roles.includes("owner") ||
      me.roles.includes("admin") ||
      me.permissions.includes("invites:manage"))

  return (
    <div className="min-h-screen bg-[#060E1B] text-[#F8F6F1] py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#C9A962] mb-1">
              <Users className="w-5 h-5" />
              <span className="text-xs uppercase tracking-widest">Workspace · Team</span>
            </div>
            <h1 className="text-2xl font-semibold">Team members</h1>
            <p className="text-gray-500 text-sm mt-1">
              Invite collaborators and manage pending invitations.
            </p>
          </div>

          {canInvite && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#C9A962] text-[#0A1628]
                         rounded-lg text-sm font-medium hover:bg-[#D4B972] transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Invite team members
            </button>
          )}
        </header>

        {meError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-sm mb-6">
            Could not verify your account: {meError}
          </div>
        )}

        {!me && !meError && (
          <p className="text-gray-500 text-sm">Loading your account…</p>
        )}

        {me && !canInvite && (
          <div className="bg-[#0A1628] border border-[#C9A962]/10 rounded-lg px-4 py-3 text-gray-400 text-sm mb-6">
            You can view pending invites but not create new ones. Ask an Owner or Admin to grant access.
          </div>
        )}

        <section className="bg-[#0A1628] border border-[#C9A962]/20 rounded-xl p-5 mb-4">
          <h2 className="text-sm uppercase tracking-wide text-gray-400 mb-3">Members</h2>
          {me && (
            <MembersList
              workspaceId={DEFAULT_WORKSPACE_ID}
              currentUserId={me.sub}
              currentUserRoles={me.roles}
              refreshSignal={refreshSignal}
            />
          )}
        </section>

        <section className="bg-[#0A1628] border border-[#C9A962]/20 rounded-xl p-5">
          <h2 className="text-sm uppercase tracking-wide text-gray-400 mb-3">Pending invites</h2>
          <PendingInvitesList workspaceId={DEFAULT_WORKSPACE_ID} refreshSignal={refreshSignal} />
        </section>

        <p className="text-gray-600 text-xs mt-6">
          Note: membership state is held in the in-memory store (see{" "}
          <code>lib/members/member-store.ts</code>). Restarting the server will clear it until
          Redis persistence lands.
        </p>
      </div>

      {modalOpen && me && (
        <InviteModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreated={() => setRefreshSignal((n) => n + 1)}
          workspaceId={DEFAULT_WORKSPACE_ID}
          currentUserRoles={me.roles}
        />
      )}
    </div>
  )
}
