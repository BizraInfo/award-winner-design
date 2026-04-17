"use client"

import { useEffect, useState } from "react"
import { Activity, Shield, Database, Users, Hash, Loader2 } from "lucide-react"
import type { DailyManifest } from "@/lib/dema/types"

function Stat({ icon: Icon, label, value, color }: { icon: typeof Activity; label: string; value: string | number; color: string }) {
  return (
    <div style={{
      padding: "12px 14px", borderRadius: 6,
      border: "1px solid rgba(255,255,255,0.04)",
      background: "rgba(255,255,255,0.02)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <Icon style={{ width: 12, height: 12, color }} />
        <span style={{ fontSize: 9, color: "rgba(248,246,241,0.4)", letterSpacing: 1 }}>{label}</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: "var(--font-jetbrains), monospace" }}>
        {value}
      </div>
    </div>
  )
}

export function DailyManifestView() {
  const [manifest, setManifest] = useState<DailyManifest | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await fetch("/api/manifest/today")
        if (r.ok && !cancelled) setManifest(await r.json())
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false)
    }
    load()
    const id = setInterval(load, 30_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 24, color: "rgba(201,169,98,0.6)" }}>
        <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite", margin: "0 auto" }} />
      </div>
    )
  }

  if (!manifest) {
    return <div style={{ color: "rgba(248,246,241,0.3)", fontSize: 11, padding: 12 }}>Failed to load manifest.</div>
  }

  const redisColor = manifest.systemHealth.redis === "ok" ? "#22c55e" : manifest.systemHealth.redis === "degraded" ? "#f97316" : "rgba(248,246,241,0.3)"

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12,
      }}>
        <div style={{
          color: "#C9A962", fontSize: 10, letterSpacing: 3,
          fontFamily: "var(--font-cinzel), serif",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Activity style={{ width: 14, height: 14 }} />
          DAILY MANIFEST
        </div>
        <span style={{ fontSize: 9, color: "rgba(248,246,241,0.3)" }}>{manifest.date}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        <Stat icon={Shield} label="MISSIONS" value={manifest.missionsCreated} color="#C9A962" />
        <Stat icon={Activity} label="GATES PASSED" value={manifest.gatesPassed} color="#22c55e" />
        <Stat icon={Activity} label="GATES FAILED" value={manifest.gatesFailed} color="#ef4444" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        <Stat icon={Hash} label="RECEIPTS" value={manifest.receiptsSealed} color="#3b82f6" />
        <Stat icon={Hash} label="CHAIN LENGTH" value={manifest.chainLength} color="#a855f7" />
        <Stat icon={Shield} label="IHSAN AGG" value={manifest.ihsanAggregate.toFixed(2)} color="#C9A962" />
      </div>

      <div style={{
        padding: "10px 14px", borderRadius: 6,
        border: "1px solid rgba(255,255,255,0.04)",
        background: "rgba(255,255,255,0.02)",
        display: "flex", gap: 16, fontSize: 10, color: "rgba(248,246,241,0.5)",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Database style={{ width: 10, height: 10, color: redisColor }} />
          Redis: <span style={{ color: redisColor, fontWeight: 600 }}>{manifest.systemHealth.redis.toUpperCase()}</span>
        </span>
        <span>
          Uptime: {Math.floor(manifest.systemHealth.uptime / 3600)}h {Math.floor((manifest.systemHealth.uptime % 3600) / 60)}m
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Users style={{ width: 10, height: 10 }} />
          Members: {manifest.systemHealth.memberCount}
        </span>
      </div>
    </div>
  )
}
