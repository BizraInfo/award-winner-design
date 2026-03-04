"use client"

import { useState } from "react"
import { useLifecycleStore } from "@/store/use-lifecycle-store"
import { useBizraStore } from "@/store/use-bizra-store"

interface ClearDataDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function ClearDataDialog({ isOpen, onClose }: ClearDataDialogProps) {
  const [confirmText, setConfirmText] = useState("")
  const [clearing, setClearing] = useState(false)
  const resetLifecycle = useLifecycleStore((s) => s.resetLifecycle)

  const handleClear = async () => {
    if (confirmText.toLowerCase() !== "reset") return

    setClearing(true)
    
    try {
      // Clear lifecycle store
      resetLifecycle()
      
      // Clear bizra store to initial state
      useBizraStore.setState({
        poi: 220181.94,
        ihsan: 0.88,
        hours: 0,
        phase: "VOID",
        isDevMode: false,
      })
      
      // Clear any localStorage items with our prefix
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith("bizra-") || key.startsWith("lifecycle-"))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key))
      
      // Small delay to show feedback
      await new Promise((r) => setTimeout(r, 500))
      
      // Reload to ensure clean state
      window.location.reload()
    } catch (error) {
      console.error("Error clearing data:", error)
      setClearing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0A1628] border border-[#C9A962]/20 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <h2 className="text-xl font-semibold text-[#F8F6F1] mb-2">
          Clear All Local Data
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          This will permanently delete all your local BIZRA data including:
        </p>
        <ul className="text-gray-400 text-sm mb-4 space-y-1 pl-4">
          <li>• Your profile and preferences</li>
          <li>• Progress through onboarding</li>
          <li>• Selected agents and plans</li>
          <li>• Activity history</li>
        </ul>
        <p className="text-amber-400 text-sm mb-4">
          ⚠️ This action cannot be undone.
        </p>
        
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">
            Type <span className="text-[#C9A962] font-mono">reset</span> to confirm:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-3 py-2 bg-[#050B14] border border-[#C9A962]/20 rounded-lg text-white focus:outline-none focus:border-[#C9A962]/50"
            placeholder="Type 'reset' here"
            disabled={clearing}
          />
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={clearing}
            className="flex-1 px-4 py-2 bg-[#1A2A3A] text-gray-300 rounded-lg hover:bg-[#2A3A4A] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleClear}
            disabled={confirmText.toLowerCase() !== "reset" || clearing}
            className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {clearing ? "Clearing..." : "Clear Data"}
          </button>
        </div>
      </div>
    </div>
  )
}

// Settings Panel Component with Clear Data option
export function DataPrivacySettings() {
  const [showDialog, setShowDialog] = useState(false)
  const phase = useLifecycleStore((s) => s.phase)

  return (
    <div className="p-4 bg-[#0A1628]/50 rounded-xl border border-[#C9A962]/10">
      <h3 className="text-lg font-medium text-[#F8F6F1] mb-3">
        Data Privacy
      </h3>
      
      <p className="text-gray-400 text-sm mb-4">
        All your data is stored locally on your device. BIZRA does not send personal information to external servers.
      </p>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-[#050B14]/50 rounded-lg">
          <div>
            <p className="text-sm text-[#F8F6F1]">Current Phase</p>
            <p className="text-xs text-gray-500">{phase.replace("_", " ")}</p>
          </div>
          <span className="text-xs text-[#2A9D8F] bg-[#2A9D8F]/10 px-2 py-1 rounded">
            Local Storage
          </span>
        </div>
        
        <button
          onClick={() => setShowDialog(true)}
          className="w-full px-4 py-3 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors text-sm"
        >
          Clear All Local Data
        </button>
      </div>
      
      <ClearDataDialog isOpen={showDialog} onClose={() => setShowDialog(false)} />
    </div>
  )
}

// Export for use in settings pages
export function ClearDataButton() {
  const [showDialog, setShowDialog] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="text-sm text-gray-400 hover:text-red-400 transition-colors"
      >
        Clear local data
      </button>
      <ClearDataDialog isOpen={showDialog} onClose={() => setShowDialog(false)} />
    </>
  )
}
