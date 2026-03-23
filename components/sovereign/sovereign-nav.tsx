"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { G, BG, DIM, DIMR, LINE, TXT, GR, PU, BL, CY, AM } from "@/components/sovereign/design-tokens"

const NAV_ITEMS = [
  { href: "/", label: "HOME", icon: "◈", color: G },
  { href: "/onboarding", label: "ONBOARD", icon: "⬡", color: CY },
  { href: "/chat", label: "CHAT", icon: "◉", color: BL },
  { href: "/resources", label: "RESOURCES", icon: "◇", color: GR },
  { href: "/skills", label: "SKILLS", icon: "♗", color: PU },
  { href: "/wallet", label: "WALLET", icon: "◆", color: AM },
  { href: "/atlas", label: "ATLAS", icon: "✦", color: G },
]

export function SovereignNav() {
  const pathname = usePathname()

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 90,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 20px", height: 44,
      background: `${BG}ee`, backdropFilter: "blur(16px)",
      borderBottom: `1px solid ${LINE}`,
      fontFamily: "var(--font-jetbrains), monospace",
    }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
        <span style={{ fontFamily: "var(--font-cinzel), serif", color: G, fontSize: 11, letterSpacing: 3, fontWeight: 600 }}>BIZRA</span>
        <span style={{ fontSize: 7, color: DIMR, letterSpacing: 2 }}>DDAGI OS</span>
      </Link>

      <div style={{ display: "flex", gap: 2 }}>
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href} style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "6px 10px", borderRadius: 3, textDecoration: "none",
              background: active ? `${item.color}12` : "transparent",
              border: `1px solid ${active ? item.color + "30" : "transparent"}`,
              transition: "all .2s",
            }}>
              <span style={{ fontSize: 10, color: active ? item.color : DIMR }}>{item.icon}</span>
              <span style={{
                fontSize: 7, letterSpacing: 1.5, fontWeight: active ? 600 : 400,
                color: active ? item.color : DIM,
                fontFamily: "var(--font-jetbrains), monospace",
              }}>{item.label}</span>
            </Link>
          )
        })}
      </div>

      <div style={{ fontSize: 8, color: DIMR, letterSpacing: 1 }}>
        <span style={{ color: GR }}>●</span> NODE0
      </div>
    </nav>
  )
}
