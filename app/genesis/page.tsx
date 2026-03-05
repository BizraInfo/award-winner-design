import type { Metadata } from "next"
import GenesisPortal from "@/components/genesis/genesis-portal"

export const metadata: Metadata = {
  title: "Genesis Portal | BIZRA",
  description:
    "The living proof of sovereign AI. Explore the first system with mathematical ethics bounds, cryptographic evidence, and 8-dimensional Ihsan scoring.",
  openGraph: {
    title: "BIZRA Genesis Portal",
    description:
      "From darkness to light. The sovereign AI that proves its own integrity.",
    type: "website",
  },
}

export default function GenesisPage() {
  return <GenesisPortal />
}
