"use client"

/**
 * Terminal Mission — View 2 (Build Contract §3, §10.2)
 *
 * The single primary mission input and execution surface.
 * Golden path: POST /v1/plan — submit mission, receive receipted result.
 *
 * Two-Touch Execution Law (Contract §2, Law 1):
 *   Touch 1: User submits mission with permission envelope
 *   Touch 2: User receives finished result with proof
 *   No mid-execution confirmations unless escalation
 *
 * Acceptance criteria (§10.2):
 *   - Accepts single-line and multi-line input
 *   - Shows permission envelope before execution
 *   - Shows execution route label (S1/S2/Mixed)
 *   - Shows per-channel progress with timing
 *   - Shows final receipt with all normalized fields
 *   - Shows SEED earned + pool share
 *   - Shows reflex candidate status if applicable
 *   - Two-touch only
 */

import { useState, useCallback, useRef, useEffect } from "react"
import {
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  Zap,
  Brain,
  Clock,
  Coins,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Lock,
  Folder,
  Globe,
  AppWindow,
  DollarSign,
  Timer,
} from "lucide-react"
import { sovereign, type MissionReceipt } from "@/lib/sovereign-client"
import { useTerminalStore } from "@/store/use-terminal-store"
import { useTerminalBriefing } from "@/hooks/use-sovereign-api"
import {
  IHSAN_PRODUCTION,
  IHSAN_GATE,
  SNR_MINIMUM,
  thresholdColor,
} from "@/lib/constitutional-constants"

// ─── Execution Path Rendering (Contract §9.1) ──────────────────

function ExecutionPathBadge({
  path,
  latencyMs,
}: {
  path: string
  latencyMs: number
}) {
  if (path === "system_1") {
    return (
      <div className="flex items-center gap-1.5 text-emerald-400">
        <Zap className="w-4 h-4" />
        <span className="text-sm font-mono">
          System-1 ({latencyMs.toFixed(0)}ms)
        </span>
      </div>
    )
  }
  if (path === "mixed") {
    return (
      <div className="flex items-center gap-1.5 text-amber-400">
        <Zap className="w-3.5 h-3.5" />
        <Brain className="w-3.5 h-3.5" />
        <span className="text-sm font-mono">
          Mixed ({latencyMs.toFixed(0)}ms)
        </span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5 text-blue-400">
      <Brain className="w-4 h-4" />
      <span className="text-sm font-mono">
        System-2 ({latencyMs.toFixed(0)}ms)
      </span>
    </div>
  )
}

// ─── Permission Envelope Preview (Contract §6) ─────────────────

function EnvelopePreview() {
  const [expanded, setExpanded] = useState(false)

  // Default envelope — in production this would come from the backend
  // during PERMISSION_REVIEW state
  const envelope = {
    filesystem: ["workspace/**"],
    applications: ["terminal", "browser", "editor"],
    network: [],
    data_sensitivity: "standard",
    spend_budget_usd: 3.0,
    time_budget_seconds: 900,
    escalation: "ask-on-boundary-cross",
    audit_verbosity: "standard",
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-2.5 text-left hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs text-zinc-500 uppercase tracking-wider">
            Permission Envelope
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-zinc-600" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-3 space-y-2 border-t border-zinc-800/50">
          <div className="flex items-center gap-2 mt-2">
            <Folder className="w-3 h-3 text-zinc-600" />
            <span className="text-xs text-zinc-500">Filesystem:</span>
            <span className="text-xs text-zinc-400 font-mono">
              {envelope.filesystem.join(", ") || "none"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <AppWindow className="w-3 h-3 text-zinc-600" />
            <span className="text-xs text-zinc-500">Applications:</span>
            <span className="text-xs text-zinc-400 font-mono">
              {envelope.applications.join(", ")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-3 h-3 text-zinc-600" />
            <span className="text-xs text-zinc-500">Network:</span>
            <span className="text-xs text-zinc-400 font-mono">
              {envelope.network.length > 0
                ? envelope.network.join(", ")
                : "none (local only)"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-3 h-3 text-zinc-600" />
            <span className="text-xs text-zinc-500">Budget:</span>
            <span className="text-xs text-zinc-400 font-mono">
              ${envelope.spend_budget_usd.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Timer className="w-3 h-3 text-zinc-600" />
            <span className="text-xs text-zinc-500">Time limit:</span>
            <span className="text-xs text-zinc-400 font-mono">
              {envelope.time_budget_seconds}s
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-3 h-3 text-zinc-600" />
            <span className="text-xs text-zinc-500">Escalation:</span>
            <span className="text-xs text-zinc-400 font-mono">
              {envelope.escalation}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Channel Progress (Contract §10.2) ──────────────────────────

function ChannelList({
  channels,
}: {
  channels: { channel: string; success: boolean; duration_ms: number }[]
}) {
  if (channels.length === 0) return null

  return (
    <div className="space-y-1.5">
      <span className="text-xs text-zinc-500 uppercase tracking-wider">
        Channels Executed
      </span>
      {channels.map((ch, i) => (
        <div
          key={`${ch.channel}-${i}`}
          className="flex items-center justify-between px-3 py-2 rounded border border-zinc-800/50 bg-zinc-900/30"
        >
          <div className="flex items-center gap-2">
            {ch.success ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-red-500" />
            )}
            <span className="text-sm text-zinc-300 font-mono">
              {ch.channel}
            </span>
          </div>
          <span className="text-xs text-zinc-600 font-mono">
            {ch.duration_ms.toFixed(0)}ms
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Receipt Card (Contract §8.1, §9) ──────────────────────────

function ReceiptCard({ receipt }: { receipt: MissionReceipt }) {
  const statusColor =
    receipt.status === "COMPLETE"
      ? "text-emerald-400 border-emerald-900/50 bg-emerald-950/20"
      : receipt.status === "PARTIAL"
        ? "text-amber-400 border-amber-900/50 bg-amber-950/20"
        : receipt.status === "BLOCKED"
          ? "text-purple-400 border-purple-900/50 bg-purple-950/20"
          : "text-red-400 border-red-900/50 bg-red-950/20"

  const StatusIcon =
    receipt.status === "COMPLETE"
      ? CheckCircle2
      : receipt.status === "BLOCKED"
        ? ShieldAlert
        : receipt.status === "PARTIAL"
          ? AlertTriangle
          : XCircle

  const seedEarned = receipt.wallet_delta?.seed ?? 0
  const bloomEarned = receipt.wallet_delta?.bloom ?? 0

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div
        className={`flex items-center justify-between rounded-lg border px-4 py-3 ${statusColor}`}
      >
        <div className="flex items-center gap-2">
          <StatusIcon className="w-5 h-5" />
          <span className="font-semibold">{receipt.status}</span>
        </div>
        <ExecutionPathBadge
          path={receipt.execution_path}
          latencyMs={receipt.duration_ms}
        />
      </div>

      {/* Synthesis */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileCheck className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-zinc-500 uppercase tracking-wider">
            Synthesis
          </span>
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {receipt.synthesis}
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3">
        {/* Quality Scores */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
          <span className="text-xs text-zinc-500 block mb-1">Quality</span>
          <div className="flex items-baseline gap-3">
            <div>
              <span
                className={`text-lg font-mono font-semibold ${thresholdColor(receipt.ihsan_score, IHSAN_PRODUCTION, IHSAN_GATE)}`}
              >
                {receipt.ihsan_score.toFixed(3)}
              </span>
              <span className="text-xs text-zinc-600 ml-1">Ihsan</span>
            </div>
            <div>
              <span
                className={`text-lg font-mono font-semibold ${thresholdColor(receipt.snr_score, SNR_MINIMUM)}`}
              >
                {receipt.snr_score.toFixed(3)}
              </span>
              <span className="text-xs text-zinc-600 ml-1">SNR</span>
            </div>
          </div>
        </div>

        {/* SEED Earned (Contract §10.2) */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
          <span className="text-xs text-zinc-500 block mb-1">Earned</span>
          <div className="flex items-baseline gap-3">
            <div>
              <span className="text-lg font-mono font-semibold text-amber-400">
                {seedEarned >= 0 ? "+" : ""}
                {seedEarned.toFixed(3)}
              </span>
              <span className="text-xs text-zinc-600 ml-1">SEED</span>
            </div>
            {bloomEarned !== 0 && (
              <div>
                <span className="text-lg font-mono font-semibold text-emerald-400">
                  {bloomEarned >= 0 ? "+" : ""}
                  {bloomEarned.toFixed(3)}
                </span>
                <span className="text-xs text-zinc-600 ml-1">BLOOM</span>
              </div>
            )}
          </div>
        </div>

        {/* Timing */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
          <span className="text-xs text-zinc-500 block mb-1">Duration</span>
          <span className="text-lg font-mono font-semibold text-zinc-300">
            {receipt.duration_ms >= 1000
              ? `${(receipt.duration_ms / 1000).toFixed(1)}s`
              : `${receipt.duration_ms.toFixed(0)}ms`}
          </span>
          <span className="text-xs text-zinc-600 ml-1">
            ({receipt.action_count} action
            {receipt.action_count !== 1 ? "s" : ""})
          </span>
        </div>
      </div>

      {/* Reflex Visibility (Contract §9) */}
      {receipt.execution_path === "system_1" && receipt.reflex_pattern && (
        <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">
              Pattern matched
            </span>
          </div>
          <p className="text-xs text-emerald-300/70">
            &quot;{receipt.reflex_pattern}&quot; &mdash;{" "}
            {receipt.reflex_latency_ms.toFixed(0)}ms vs{" "}
            {receipt.comparison_s2_avg_ms.toFixed(0)}ms avg S2 (
            {receipt.comparison_s2_avg_ms > 0
              ? `${(receipt.comparison_s2_avg_ms / Math.max(receipt.reflex_latency_ms, 1)).toFixed(0)}x faster`
              : "first execution"}
            )
          </p>
        </div>
      )}

      {/* Reflex Candidate Notification (Contract §9.3) */}
      {receipt.reflex_delta && receipt.reflex_delta.near_compile && (
        <div className="rounded-lg border border-purple-900/40 bg-purple-950/20 px-4 py-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-300">
              Near compilation: {receipt.reflex_delta.compile_count}/
              {receipt.reflex_delta.threshold} toward reflex
            </span>
          </div>
        </div>
      )}

      {receipt.reflex_delta && receipt.reflex_delta.compiled && (
        <div className="rounded-lg border border-yellow-900/40 bg-yellow-950/20 px-4 py-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-yellow-300">
              REFLEX COMPILED — next execution will be System-1
            </span>
          </div>
        </div>
      )}

      {/* Channels */}
      <ChannelList channels={receipt.channels_executed} />

      {/* Memory Delta */}
      {receipt.memory_delta &&
        (receipt.memory_delta.episodic > 0 ||
          receipt.memory_delta.semantic > 0 ||
          receipt.memory_delta.procedural > 0) && (
          <div className="flex items-center gap-4 text-xs text-zinc-600 px-1">
            <span>
              Memory: +{receipt.memory_delta.episodic} episodic, +
              {receipt.memory_delta.semantic} semantic, +
              {receipt.memory_delta.procedural} procedural
            </span>
          </div>
        )}

      {/* Receipt Proof Footer */}
      <div className="flex items-center justify-between text-xs text-zinc-700 px-1">
        <span className="font-mono">
          Receipt: {receipt.receipt_id?.slice(0, 16) ?? "—"}
        </span>
        <span className="font-mono">
          Chain: {receipt.hash_chain_ref?.slice(0, 16) || "—"}
        </span>
        <span className="font-mono">Mission: {receipt.mission_id}</span>
      </div>
    </div>
  )
}

// ─── Mission Composer ───────────────────────────────────────────

function MissionComposer({
  onSubmit,
  disabled,
}: {
  onSubmit: (description: string) => void
  disabled: boolean
}) {
  const [text, setText] = useState("")
  const [multiline, setMultiline] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!disabled) inputRef.current?.focus()
  }, [disabled])

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
    setText("")
  }, [text, disabled, onSubmit])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
      if (e.key === "Enter" && e.shiftKey && !multiline) {
        setMultiline(true)
      }
    },
    [handleSubmit, multiline],
  )

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-start gap-3">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            if (e.target.value.includes("\n")) setMultiline(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Describe your mission..."
          disabled={disabled}
          rows={multiline ? 4 : 1}
          className="flex-1 bg-transparent text-zinc-200 placeholder:text-zinc-600 text-sm resize-none outline-none leading-relaxed"
          style={{ minHeight: multiline ? "6rem" : "1.5rem" }}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-medium transition-colors shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          Submit
        </button>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-zinc-700">
          {multiline
            ? "Multi-line mode (Enter to submit, Shift+Enter for newline)"
            : "Press Enter to submit, Shift+Enter for multi-line"}
        </span>
        {text.length > 0 && (
          <span className="text-xs text-zinc-700">
            {text.length.toLocaleString()} chars
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Executing State ────────────────────────────────────────────

function ExecutingIndicator() {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="relative">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <div className="absolute inset-0 w-8 h-8 rounded-full border-2 border-cyan-400/20" />
      </div>
      <div className="text-center">
        <p className="text-sm text-zinc-300">Mission executing...</p>
        <p className="text-xs text-zinc-600 mt-1">
          Routing through sovereign pipeline
        </p>
      </div>
    </div>
  )
}

// ─── Main Mission View ──────────────────────────────────────────

export function TerminalMission() {
  const terminalState = useTerminalStore((s) => s.terminalState)
  const lastReceipt = useTerminalStore((s) => s.lastReceipt)
  const setLastReceipt = useTerminalStore((s) => s.setLastReceipt)
  const missionSubmitting = useTerminalStore((s) => s.missionSubmitting)
  const missionError = useTerminalStore((s) => s.missionError)
  const setMissionSubmitting = useTerminalStore((s) => s.setMissionSubmitting)
  const setMissionError = useTerminalStore((s) => s.setMissionError)
  const isConnected = useTerminalStore((s) => s.isConnected)

  const handleSubmit = useCallback(
    async (description: string) => {
      setMissionSubmitting(true)
      setMissionError(null)
      setLastReceipt(null)

      try {
        const receipt = await sovereign.terminal.plan({ description })
        setLastReceipt(receipt as MissionReceipt)
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Mission execution failed"
        setMissionError(msg)
      } finally {
        setMissionSubmitting(false)
      }
    },
    [setMissionSubmitting, setMissionError, setLastReceipt],
  )

  const handleNewMission = useCallback(() => {
    setLastReceipt(null)
    setMissionError(null)
  }, [setLastReceipt, setMissionError])

  // Determine what to show based on state
  const isExecuting =
    missionSubmitting ||
    terminalState === "executing" ||
    terminalState === "mission_drafting" ||
    terminalState === "permission_review"

  const showComposer =
    !isExecuting &&
    !lastReceipt &&
    !missionError

  const showReceipt = !isExecuting && lastReceipt !== null

  // Session continuity context from briefing
  const briefing = useTerminalStore((s) => s.briefing)
  // Trigger briefing fetch if not already loaded
  useTerminalBriefing()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-200">Mission</h2>
        {!isConnected && (
          <span className="text-xs text-zinc-600">
            Offline — missions will queue locally
          </span>
        )}
      </div>

      {/* Session Context (from briefing — Contract §4, continuity) */}
      {briefing && showComposer && (
        <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-4 py-3 space-y-1.5">
          {briefing.last_mission_summary && (
            <p className="text-xs text-zinc-500">
              <span className="text-zinc-600">Last:</span>{" "}
              {briefing.last_mission_summary}
            </p>
          )}
          {briefing.near_compile_patterns.length > 0 && (
            <p className="text-xs text-purple-500">
              Near-compile: {briefing.near_compile_patterns.join(", ")}
            </p>
          )}
          {briefing.next_action_suggestion && (
            <p className="text-xs text-cyan-600">
              Suggested: {briefing.next_action_suggestion}
            </p>
          )}
        </div>
      )}

      {/* Permission Envelope (always visible, collapsible) */}
      <EnvelopePreview />

      {/* Mission Composer */}
      {showComposer && (
        <MissionComposer onSubmit={handleSubmit} disabled={!isConnected} />
      )}

      {/* Executing State */}
      {isExecuting && <ExecutingIndicator />}

      {/* Error */}
      {missionError && !isExecuting && (
        <div className="space-y-3">
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-sm text-red-300">{missionError}</span>
            </div>
          </div>
          <button
            onClick={handleNewMission}
            className="text-sm text-cyan-500 hover:text-cyan-400 transition-colors"
          >
            Try another mission
          </button>
        </div>
      )}

      {/* Receipt */}
      {showReceipt && lastReceipt && (
        <div className="space-y-3">
          <ReceiptCard receipt={lastReceipt} />
          <div className="flex justify-center pt-2">
            <button
              onClick={handleNewMission}
              className="px-4 py-2 rounded-lg border border-zinc-800 text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
            >
              New Mission
            </button>
          </div>
        </div>
      )}

      {/* State Machine Debug (dev only) */}
      <div className="flex items-center justify-between text-xs text-zinc-700 px-1 pt-2">
        <span>
          State: {terminalState.replace(/_/g, " ")}
        </span>
        <span>
          {isConnected ? "API: connected" : "API: offline"}
        </span>
      </div>
    </div>
  )
}
