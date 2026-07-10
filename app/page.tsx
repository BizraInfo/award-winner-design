"use client"

import { LifecycleRouter, LifecycleDebugger } from "@/components/lifecycle/lifecycle-router"
import { ClearDataButton } from "@/components/settings/data-privacy"
import Link from "next/link"

// ============================================
// MAIN PAGE - LIFECYCLE MODE (DEFAULT)
// Lean and fast-loading user journey
//
// For 3D showcase, visit /showcase
// ============================================

export default function Page() {
  return (
    <>
      <LifecycleRouter />
      <LifecycleDebugger />

      {/* Privacy controls - always accessible */}
      <div className="fixed bottom-4 right-4 z-[100]">
        <ClearDataButton />
      </div>

      {/* Showcase + manifest links for development/presentations */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed top-4 right-4 z-[100] flex gap-2">
          <Link
            href="/manifest"
            className="px-3 py-1.5 text-xs bg-[#C9A962]/10 text-[#C9A962] border border-[#C9A962]/20 rounded-full hover:bg-[#C9A962]/20 transition-colors"
          >
            Manifest
          </Link>
          <Link
            href="/showcase"
            className="px-3 py-1.5 text-xs bg-[#C9A962]/10 text-[#C9A962] border border-[#C9A962]/20 rounded-full hover:bg-[#C9A962]/20 transition-colors"
          >
            3D Showcase
          </Link>
        </div>
      )}
    </>
  )
}
