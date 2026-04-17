"use client"

import { useEffect, useState, useCallback } from "react"
import { FileText, Hash, Clock, ChevronDown, ChevronRight, RefreshCw, Loader2 } from "lucide-react"
import type { ReceiptChainHead, Receipt } from "@/lib/dema/types"

const KIND_COLORS: Record<string, string> = {
  CognitionBoot: "#C9A962",
  Myelination: "#22c55e",
  Demyelination: "#ef4444",
  ReasoningSession: "#3b82f6",
  DegradedPath: "#f97316",
  GovernanceDemyelination: "#a855f7",
  GenesisValuation: "#06b6d4",
  NodeLifecycle: "#eab308",
}

function ReceiptRow({ receipt, onReplay }: { receipt: Receipt; onReplay: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const color = KIND_COLORS[receipt.kind] || "#F8F6F1"

  return (
    <div style={{
      border: "1px solid rgba(255,255,255,0.04)", borderRadius: 6,
      marginBottom: 4, overflow: "hidden",
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          padding: "10px 12px", background: "transparent", border: "none",
          cursor: "pointer", color: "#F8F6F1", textAlign: "left",
        }}
      >
        {expanded ? <ChevronDown style={{ width: 12, height: 12, flexShrink: 0 }} /> : <ChevronRight style={{ width: 12, height: 12, flexShrink: 0 }} />}
        <span style={{ width: 8, height: 8, borderRadius: 4, background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 10, color, fontWeight: 600, minWidth: 120 }}>{receipt.kind}</span>
        <span style={{ fontSize: 10, color: "rgba(248,246,241,0.4)", fontFamily: "var(--font-jetbrains), monospace" }}>
          {receipt.id.slice(0, 16)}...
        </span>
        <span style={{ marginLeft: "auto", fontSize: 9, color: "rgba(248,246,241,0.25)" }}>
          {new Date(receipt.timestamp).toLocaleTimeString()}
        </span>
      </button>

      {expanded && (
        <div style={{
          padding: "8px 12px 12px 34px", background: "rgba(255,255,255,0.01)",
          borderTop: "1px solid rgba(255,255,255,0.03)",
          fontSize: 10, fontFamily: "var(--font-jetbrains), monospace",
          color: "rgba(248,246,241,0.5)",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "4px 8px" }}>
            <span>ID</span><span style={{ color: "#F8F6F1" }}>{receipt.id}</span>
            <span>Kind</span><span style={{ color }}>{receipt.kind}</span>
            <span>Prev Chain</span><span>{receipt.prevChain.slice(0, 32)}...</span>
            <span>Payload Hash</span><span>{receipt.payloadHash.slice(0, 32)}...</span>
            <span>Timestamp</span><span>{new Date(receipt.timestamp).toISOString()}</span>
          </div>
          <button
            onClick={() => onReplay(receipt.id)}
            style={{
              marginTop: 8, display: "flex", alignItems: "center", gap: 4,
              padding: "4px 10px", borderRadius: 4, border: "1px solid rgba(201,169,98,0.2)",
              background: "transparent", color: "#C9A962", fontSize: 9,
              cursor: "pointer", letterSpacing: 1,
            }}
          >
            <RefreshCw style={{ width: 10, height: 10 }} /> REPLAY
          </button>
        </div>
      )}
    </div>
  )
}

export function ReceiptExplorer() {
  const [chain, setChain] = useState<ReceiptChainHead | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [replayResult, setReplayResult] = useState<string | null>(null)

  const fetchChain = useCallback(async () => {
    try {
      const r = await fetch("/api/chain")
      if (r.ok) setChain(await r.json())
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchChain() }, [fetchChain])

  const handleReplay = async (receiptId: string) => {
    setReplayResult(null)
    try {
      const r = await fetch(`/api/missions/${receiptId}/replay`, { method: "POST" })
      const data = await r.json()
      setReplayResult(`Replay: ${data.replayResult} | Matches: ${data.matchesPrevious}`)
    } catch (err) {
      setReplayResult(`Replay failed: ${err instanceof Error ? err.message : "unknown"}`)
    }
  }

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 12,
      }}>
        <div style={{
          color: "#C9A962", fontSize: 10, letterSpacing: 3,
          fontFamily: "var(--font-cinzel), serif",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <FileText style={{ width: 14, height: 14 }} />
          RECEIPT CHAIN
        </div>
        {chain && (
          <div style={{ fontSize: 9, color: "rgba(248,246,241,0.3)", display: "flex", gap: 12 }}>
            <span><Hash style={{ width: 10, height: 10, display: "inline" }} /> {chain.length} receipts</span>
            <span><Clock style={{ width: 10, height: 10, display: "inline" }} /> {new Date(chain.latestTimestamp).toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 24, color: "rgba(201,169,98,0.6)" }}>
          <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite", margin: "0 auto" }} />
        </div>
      )}

      {!loading && chain && chain.length === 0 && (
        <div style={{ textAlign: "center", padding: 24, color: "rgba(248,246,241,0.2)", fontSize: 11 }}>
          No receipts in chain yet. Submit a mission to generate the first receipt.
        </div>
      )}

      {receipts.map(r => (
        <ReceiptRow key={r.id} receipt={r} onReplay={handleReplay} />
      ))}

      {replayResult && (
        <div style={{
          marginTop: 8, padding: "6px 10px", borderRadius: 4, fontSize: 10,
          background: "rgba(201,169,98,0.06)", color: "#C9A962",
          border: "1px solid rgba(201,169,98,0.15)",
        }}>
          {replayResult}
        </div>
      )}
    </div>
  )
}
