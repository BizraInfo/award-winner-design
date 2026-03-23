"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  AM,
  BG,
  BG2,
  BL,
  CY,
  DIM,
  G,
  GR,
  LINE,
  MUT,
  PU,
  RD,
  TXT,
  YL,
} from "@/components/sovereign/design-tokens"
import { ECONOMIC_THRESHOLDS } from "@/lib/economic"
import { useWallet, type NodeState } from "@/hooks/use-wallet"

type WalletTab = "overview" | "receipts" | "economy"
type ReceiptRarity = "common" | "rare" | "epic" | "legendary"

interface ReceiptItem {
  id: string
  agent: string
  agentColor: string
  mission: string
  ihsan: number
  seed: number
  hash: string
  timestamp: number
  rarity: ReceiptRarity
}

const NODE0_STATE: NodeState = {
  seed: 22.34,
  bloom: 0.1842,
  rac: 22,
  vac: 24,
  ihsan: 0.9821,
  streak: 12,
  sovereignty: 0.91,
  reflexes: 7,
}

const RECEIPTS: ReceiptItem[] = [
  { id: "r1", agent: "P3-Forge", agentColor: GR, mission: "Organized governed intake bundles", ihsan: 0.9812, seed: 1.42, hash: "a3f8c21e", timestamp: Date.now() - 3_600_000, rarity: "epic" },
  { id: "r2", agent: "P2-Oracle", agentColor: CY, mission: "Mapped sovereign architecture evidence", ihsan: 0.9671, seed: 1.18, hash: "7d2b9f44", timestamp: Date.now() - 7_200_000, rarity: "rare" },
  { id: "r3", agent: "P1-Atlas", agentColor: BL, mission: "Explained constitutional membrane routing", ihsan: 0.9923, seed: 1.67, hash: "e1c4a88b", timestamp: Date.now() - 10_800_000, rarity: "legendary" },
  { id: "r4", agent: "P6-Herald", agentColor: AM, mission: "Prepared CMN evidence bundle", ihsan: 0.9558, seed: 1.05, hash: "5f9d32c1", timestamp: Date.now() - 14_400_000, rarity: "rare" },
  { id: "r5", agent: "P4-Judge", agentColor: YL, mission: "Verified membrane properties", ihsan: 0.9847, seed: 1.51, hash: "b2e7f609", timestamp: Date.now() - 18_000_000, rarity: "epic" },
  { id: "r6", agent: "P5-Crown", agentColor: RD, mission: "Ran adversarial resilience simulation", ihsan: 0.9961, seed: 1.82, hash: "c8a1d3f7", timestamp: Date.now() - 21_600_000, rarity: "legendary" },
]

const TABS: { id: WalletTab; label: string; icon: string }[] = [
  { id: "overview", label: "OVERVIEW", icon: "◈" },
  { id: "receipts", label: "RECEIPTS", icon: "◇" },
  { id: "economy", label: "ECONOMY", icon: "◆" },
]

const RARITY_COLORS: Record<ReceiptRarity, string> = {
  common: BL,
  rare: PU,
  epic: AM,
  legendary: G,
}

function formatAgo(timestamp: number | null) {
  if (!timestamp) return "never"
  const delta = Date.now() - timestamp
  if (delta < 60_000) return `${Math.max(1, Math.floor(delta / 1_000))}s ago`
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`
  return `${Math.floor(delta / 86_400_000)}d ago`
}

function statusColor(status: "ok" | "error" | "pending") {
  if (status === "ok") return GR
  if (status === "pending") return YL
  return RD
}

export default function WalletPage() {
  const [tab, setTab] = useState<WalletTab>("overview")
  const wallet = useWallet(NODE0_STATE)

  const totalReceiptSeed = useMemo(
    () => RECEIPTS.reduce((sum, receipt) => sum + receipt.seed, 0),
    [],
  )
  const avgReceiptIhsan = useMemo(
    () => RECEIPTS.reduce((sum, receipt) => sum + receipt.ihsan, 0) / RECEIPTS.length,
    [],
  )
  const rewardEligible = wallet.factors.quality >= ECONOMIC_THRESHOLDS.MINTING_FLOOR
  const excellenceEligible = wallet.factors.quality >= ECONOMIC_THRESHOLDS.EXCELLENCE

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TXT, fontFamily: "var(--font-jetbrains), monospace" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 40, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", borderBottom: `1px solid ${LINE}`, background: `${BG}ee`, backdropFilter: "blur(16px)" }}>
        <a href="/" style={{ color: G, textDecoration: "none", letterSpacing: 3, fontSize: 11, fontWeight: 600 }}>BIZRA</a>
        <div style={{ display: "flex", gap: 14, fontSize: 9, color: MUT }}>
          <a href="/" style={{ color: MUT, textDecoration: "none" }}>HOME</a>
          <a href="/genesis" style={{ color: MUT, textDecoration: "none" }}>GENESIS</a>
          <a href="/terminal" style={{ color: MUT, textDecoration: "none" }}>TERMINAL</a>
        </div>
      </div>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "56px 24px 36px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 8, letterSpacing: 3, color: G, marginBottom: 4 }}>SOVEREIGN ECONOMY</div>
            <div style={{ fontSize: 22, fontWeight: 500 }}>Token & Wallet</div>
            <div style={{ fontSize: 11, color: DIM, marginTop: 4 }}>
              SEED utility, BLOOM governance, receipt-native rewards, and Node0 economic telemetry.
            </div>
          </div>
          <div style={{ minWidth: 320, padding: 14, borderRadius: 10, border: `1px solid ${LINE}`, background: BG2 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontSize: 8, letterSpacing: 2, color: DIM }}>SYNC STATUS</div>
                <div style={{ fontSize: 13, color: wallet.live ? GR : YL, marginTop: 4 }}>
                  {wallet.live ? "LIVE LEDGER LINKED" : "OFFLINE DERIVATION"}
                </div>
                <div style={{ fontSize: 9, color: DIM, marginTop: 4 }}>Last sync {formatAgo(wallet.lastSync)}</div>
              </div>
              <button
                onClick={() => void wallet.refresh()}
                style={{
                  border: `1px solid ${G}35`,
                  background: `${G}10`,
                  color: G,
                  borderRadius: 6,
                  padding: "10px 14px",
                  fontSize: 10,
                  letterSpacing: 1.4,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {wallet.loading ? "SYNCING" : "REFRESH"}
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 12 }}>
              {([
                ["BALANCE", wallet.fetchStatus.balance],
                ["SUPPLY", wallet.fetchStatus.supply],
                ["POTENTIAL", wallet.fetchStatus.potential],
              ] as const).map(([label, status]) => (
                <div key={label} style={{ padding: 8, borderRadius: 6, border: `1px solid ${statusColor(status)}25`, background: `${statusColor(status)}08` }}>
                  <div style={{ fontSize: 7, color: DIM, letterSpacing: 1.5 }}>{label}</div>
                  <div style={{ fontSize: 10, color: statusColor(status), marginTop: 4 }}>{status.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 2, paddingBottom: 2, borderBottom: `1px solid ${LINE}`, marginBottom: 18, overflowX: "auto" }}>
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: tab === item.id ? `2px solid ${G}` : "2px solid transparent",
                color: tab === item.id ? G : DIM,
                padding: "10px 16px",
                fontSize: 8,
                letterSpacing: 2,
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ marginRight: 6 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 18 }}>
              {[
                { label: "SEED BALANCE", value: wallet.seed.toFixed(2), color: GR, note: "Liquid utility credit" },
                { label: "BLOOM BALANCE", value: wallet.bloom.toFixed(4), color: PU, note: "Governance weight" },
                { label: "LOCKED SEED", value: wallet.lockedSeed.toFixed(2), color: CY, note: "Reserved or staked" },
                { label: "İHSĀN QUALITY", value: wallet.factors.quality.toFixed(4), color: G, note: rewardEligible ? "Minting threshold met" : "Below minting floor" },
              ].map((card) => (
                <div key={card.label} style={{ padding: 16, borderRadius: 10, border: `1px solid ${card.color}25`, background: `linear-gradient(135deg, ${card.color}10, ${BG2})` }}>
                  <div style={{ fontSize: 8, letterSpacing: 2, color: DIM }}>{card.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 300, color: card.color, marginTop: 6 }}>{card.value}</div>
                  <div style={{ fontSize: 9, color: MUT, marginTop: 6 }}>{card.note}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 18 }}>
              {[
                { label: "Receipt Count", value: `${RECEIPTS.length}`, color: BL },
                { label: "Receipt SEED", value: totalReceiptSeed.toFixed(2), color: AM },
                { label: "Average İhsān", value: avgReceiptIhsan.toFixed(4), color: G },
                { label: "Supply Cap Usage", value: `${(wallet.supplyCapUtilization * 100).toFixed(4)}%`, color: CY },
                { label: "Reward Eligibility", value: rewardEligible ? "PASS" : "HOLD", color: rewardEligible ? GR : RD },
                { label: "Excellence Tier", value: excellenceEligible ? "ACTIVE" : "NOT YET", color: excellenceEligible ? G : DIM },
              ].map((item) => (
                <div key={item.label} style={{ padding: 14, borderRadius: 8, border: `1px solid ${LINE}`, background: BG2 }}>
                  <div style={{ fontSize: 7, letterSpacing: 1.5, color: DIM }}>{item.label}</div>
                  <div style={{ fontSize: 18, color: item.color, marginTop: 6 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "receipts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {RECEIPTS.map((receipt) => (
              <motion.div
                key={receipt.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: 16,
                  borderRadius: 8,
                  border: `1px solid ${RARITY_COLORS[receipt.rarity]}22`,
                  background: `linear-gradient(135deg, ${RARITY_COLORS[receipt.rarity]}08, ${BG2})`,
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{receipt.mission}</div>
                    <div style={{ fontSize: 8, color: DIM, marginTop: 2 }}>{receipt.agent} · {formatAgo(receipt.timestamp)}</div>
                  </div>
                  <div style={{ fontSize: 8, color: RARITY_COLORS[receipt.rarity] }}>{receipt.rarity.toUpperCase()}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 7, letterSpacing: 1.5, color: DIM }}>QUALITY</div>
                    <div style={{ fontSize: 16, color: G, marginTop: 4 }}>{receipt.ihsan.toFixed(4)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 7, letterSpacing: 1.5, color: DIM }}>SEED CREDIT</div>
                    <div style={{ fontSize: 16, color: GR, marginTop: 4 }}>+{receipt.seed.toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 7, letterSpacing: 1.5, color: DIM }}>CHAIN HASH</div>
                    <div style={{ fontSize: 11, color: CY, marginTop: 4, wordBreak: "break-all" }}>{receipt.hash}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {tab === "economy" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div style={{ padding: 16, borderRadius: 10, border: `1px solid ${LINE}`, background: BG2 }}>
              <div style={{ fontSize: 8, letterSpacing: 2, color: DIM, marginBottom: 12 }}>CONSTITUTIONAL GATES</div>
              {[
                ["Mission floor", ECONOMIC_THRESHOLDS.MISSION_FLOOR, BL],
                ["BLOOM eligibility", ECONOMIC_THRESHOLDS.BLOOM_ELIGIBILITY, PU],
                ["Minting floor", ECONOMIC_THRESHOLDS.MINTING_FLOOR, GR],
                ["Excellence tier", ECONOMIC_THRESHOLDS.EXCELLENCE, G],
                ["SNR minimum", ECONOMIC_THRESHOLDS.SNR_MINIMUM, CY],
              ].map(([label, value, color]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${LINE}` }}>
                  <span style={{ fontSize: 9, color: MUT }}>{label}</span>
                  <span style={{ fontSize: 10, color: color as string }}>{(value as number).toFixed(4)}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: 16, borderRadius: 10, border: `1px solid ${LINE}`, background: BG2 }}>
              <div style={{ fontSize: 8, letterSpacing: 2, color: DIM, marginBottom: 12 }}>ISSUANCE FLOW</div>
              <div style={{ display: "grid", gap: 10 }}>
                {[
                  ["Intent", "Mission proposed", TXT],
                  ["Quality Gate", rewardEligible ? "Eligible" : "Held", rewardEligible ? GR : RD],
                  ["Mint", `${wallet.seed.toFixed(2)} SEED visible`, GR],
                  ["Redistribute", `${(ECONOMIC_THRESHOLDS.COMMUNITY_POOL_SPLIT * 100).toFixed(0)}% commons split`, CY],
                  ["Governance", `${wallet.bloom.toFixed(4)} BLOOM`, PU],
                ].map(([label, value, color]) => (
                  <div key={label} style={{ padding: 12, borderRadius: 8, border: `1px solid ${LINE}`, background: `${color as string}07` }}>
                    <div style={{ fontSize: 8, letterSpacing: 1.5, color: DIM }}>{label}</div>
                    <div style={{ fontSize: 12, color: color as string, marginTop: 8 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
