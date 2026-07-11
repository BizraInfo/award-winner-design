import type { Metadata } from "next";
import { ManifestationDeck } from "@/components/manifest/manifestation-deck";

export const metadata: Metadata = {
  title: "Manifestation | BIZRA",
  description:
    "Proof-State Runtime for Agentic Work — claim-governed investor narrative with consent, receipts, replay, and honest product labels.",
  openGraph: {
    title: "BIZRA Manifestation",
    description:
      "The proof layer for agentic work. Agent reasons outside the sandbox; kernel executes inside with micro-consent.",
    type: "website",
  },
};

export default function ManifestPage() {
  return <ManifestationDeck />;
}
