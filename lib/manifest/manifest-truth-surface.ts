/**
 * BIZRA Manifestation deck — claim-governed truth surface.
 * Ported from BIZRA Manifestation.dc.html with honest capability labels.
 */

export type ProductStatus =
  | "FLAGSHIP"
  | "PROVEN"
  | "CORE"
  | "PREVIEW"
  | "SIM_ONLY"
  | "FUTURE";

export const MANIFEST_CATEGORY =
  "Proof-State Runtime for Agentic Work" as const;

export const CORE_LAWS = [
  { pre: "No action without ", key: "consent", post: "." },
  { pre: "No result without ", key: "receipt", post: "." },
  { pre: "No receipt without ", key: "replay", post: "." },
  { pre: "No reward without ", key: "verified impact", post: "." },
  { pre: "No token before the ", key: "economy proves itself", post: "." },
] as const;

export const TRUST_QUESTIONS = [
  { k: "AUTH", t: "Who authorized it?" },
  { k: "CONTEXT", t: "What context did it use?" },
  { k: "DELTA", t: "What did it change?" },
  { k: "REPLAY", t: "Can I replay it?" },
  { k: "CORRECT", t: "Can I correct it?" },
  { k: "AUDIT", t: "Can I audit it?" },
  { k: "TRUST", t: "Can I trust it enough to pay?" },
] as const;

export const PROOF_SPINE = [
  { t: "AI agent", s: "acts" },
  { t: "Governed work", s: "consented" },
  { t: "Verified result", s: "receipted · replayable" },
  { t: "Impact candidate", s: "value proven" },
  { t: "Reward eligibility", s: "only if verified" },
] as const;

export const MARKET_FORCES = [
  {
    k: "Model routing",
    state: "Emerging",
    d: "Users ask; the system picks the model.",
    wedge: false,
  },
  {
    k: "Portable context",
    state: "Emerging",
    d: "Fragmented org knowledge, made vendor-neutral.",
    wedge: false,
  },
  {
    k: "Agent loops",
    state: "Emerging",
    d: "Teams need repeatable, governable agent runs.",
    wedge: false,
  },
  {
    k: "Verification",
    state: "Missing → our wedge",
    d: "Agents get demoed, not deployed. This is the gap.",
    wedge: true,
  },
] as const;

export const MANIFEST_PRODUCTS = [
  {
    name: "Dema Node0 Home Base",
    status: "FLAGSHIP" as const,
    value:
      "See what your AI did, did not do, and what proof exists.",
    serves: "L0 – L1",
  },
  {
    name: "Founder Work Indexer",
    status: "PROVEN" as const,
    value:
      "Turn years of messy work into evidence — without pretending it is impact yet.",
    serves: "L1 – L2",
  },
  {
    name: "Proof-of-Spend",
    status: "PREVIEW" as const,
    value:
      "Know what a mission actually cost — with source lines and hashes.",
    serves: "L1 – L2",
  },
  {
    name: "Quality Evidence Card",
    status: "CORE" as const,
    value: "Stop giving me a vibe. Give me a quality receipt.",
    serves: "L2 – L4",
  },
  {
    name: "OKF Bridge",
    status: "FUTURE" as const,
    value:
      "OKF makes knowledge portable; BIZRA makes it authorized, receipted, replayable.",
    serves: "L2 – L5",
  },
  {
    name: "Synthesis Orchestrator",
    status: "CORE" as const,
    value:
      "Not just model routing — contract-bound, proof-sealed consensus.",
    serves: "L2 – L3",
  },
  {
    name: "Mobile Companion",
    status: "PREVIEW" as const,
    value:
      "A phone as consent + display companion — not a remote actuator.",
    serves: "L1",
  },
  {
    name: "FDE Forwarder Diagnostic",
    status: "CORE" as const,
    value:
      "Route each failure to the right lane: code / state vs environment / permissions.",
    serves: "L0 – L5",
  },
  {
    name: "Economy Simulator",
    status: "SIM_ONLY" as const,
    value:
      "A private laboratory for token & resource economics. Not a launchpad.",
    serves: "L6 (sim)",
  },
  {
    name: "Impact Launchpad",
    status: "FUTURE" as const,
    value:
      "Launch impact projects only after receipts, value proof, validators, review.",
    serves: "L6",
  },
] as const;

export const M1_PLAN = {
  tag: "M1",
  when: "Month 1",
  goal: "Make proof sellable",
  rev: "$5k – 15k",
  actions: [
    "Push PROOF-OF-SPEND-1A",
    "Sync PR #312 truth surface",
    "Self-hosted runner ADR",
    "FDE Forwarder 1A",
    "Mobile Companion (read-only)",
    "Investor memo · deck · 3 demos",
  ],
} as const;

/** Agent harness sits outside; kernel + sandbox sit inside. */
export const AGENT_OUTSIDE_SANDBOX = {
  thesis:
    "Put the agent outside the sandbox, not inside it. Reasoning, critique, and planning stay unbounded; execution stays consent-gated and receipt-backed inside a measured boundary.",
  outside: [
    {
      role: "Propose",
      detail: "Slice intent, SNR review, backlog rank — preview only, no mutation.",
    },
    {
      role: "Micro-consent",
      detail: "Exact-string GO phrases before any kernel stage runs.",
    },
    {
      role: "Self-critique",
      detail: "OODA loop: observe proof density, orient to gates, decide next slice.",
    },
    {
      role: "Process mining",
      detail: "Mine signal vs noise from receipts — ref proposals, not runtime.",
    },
  ],
  inside: [
    {
      role: "Execute",
      detail: "Sandbox-root mutations only; fail closed outside the boundary.",
    },
    {
      role: "Receipt",
      detail: "Every consented action emits a signed, hashed witness.",
    },
    {
      role: "Replay",
      detail: "Deterministic re-run proves what changed and what did not.",
    },
    {
      role: "Refuse",
      detail: "No daemon, no hidden network, no mint without separate gates.",
    },
  ],
  bridge: [
    "dema peak-self-loop — harness integration preview",
    "dema node0 spine run — measured proof spine in sandbox",
    "proof:truth:local-lane — READY_LOCAL when gates pass",
  ],
} as const;

export const DEV_LIFECYCLE = [
  { t: "Intent", d: "Scope the smallest safe slice as an ADR — truth first." },
  { t: "Consent", d: "Declare what may be read and what may act." },
  { t: "Build", d: "Implement only inside the consented boundary." },
  { t: "Receipt", d: "Every action emits a signed, hashed receipt." },
  { t: "Replay", d: "Re-run receipts; verify deterministic outcome." },
  { t: "Truth-label", d: "Attach honest labels — PREVIEW, SIM_ONLY, no-mint." },
  { t: "Ship → Correct", d: "Ship the slice; corrections loop to Intent." },
] as const;

export const MANIFEST_CHAPTERS = [
  "Overture",
  "Core Law",
  "Logic",
  "Category",
  "Agent Architecture",
  "Products",
  "Roadmap",
  "Verdict",
] as const;

export const TRUTH_STRIP = [
  "status · proof runtime: emerging",
  "law · consent → receipt → replay → correction",
  "category · proof-state runtime",
  "agent · reason outside · execute inside",
  "products · proof first, magic never",
  "roadmap · 3 months to paid proof, 6 to scale",
  "verdict · only verified impact can justify reward",
] as const;

const NON_SHIPPED: ReadonlySet<ProductStatus> = new Set([
  "PREVIEW",
  "SIM_ONLY",
  "FUTURE",
]);

export function isNonShippedProductStatus(status: ProductStatus): boolean {
  return NON_SHIPPED.has(status);
}

export function productStatusClass(status: ProductStatus): string {
  switch (status) {
    case "PREVIEW":
      return "border-amber-500/40 text-amber-300 bg-amber-500/10";
    case "SIM_ONLY":
      return "border-purple-500/40 text-purple-300 bg-purple-500/10";
    case "FUTURE":
      return "border-white/20 text-white/50 bg-white/5";
    case "FLAGSHIP":
    case "PROVEN":
      return "border-[#C9A962]/50 text-[#E8D5A3] bg-[#C9A962]/10";
    default:
      return "border-emerald-500/40 text-emerald-300 bg-emerald-500/10";
  }
}
