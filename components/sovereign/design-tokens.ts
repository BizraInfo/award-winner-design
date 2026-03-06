/**
 * BIZRA DDAGI OS Design Tokens
 * Ported from BIZRA_DDAGI_OS_Complete.jsx prototype
 */

// Brand colors
export const G = "#C9A962"   // Living Gold
export const G2 = "#E8D5A3"  // Light Gold
export const G3 = "#8B7340"  // Dark Gold
export const BG = "#030810"  // Deep Space
export const BG2 = "#08121f" // Surface

// Semantic colors
export const GR = "#22c55e"  // Green
export const RD = "#ef4444"  // Red
export const BL = "#3b82f6"  // Blue
export const PU = "#a855f7"  // Purple
export const CY = "#06b6d4"  // Cyan
export const AM = "#f97316"  // Amber
export const YL = "#eab308"  // Yellow
export const RS = "#f43f5e"  // Rose

// Text colors
export const TXT = "#F8F6F1"
export const MUT = "rgba(248,246,241,.72)"
export const DIM = "rgba(248,246,241,.45)"
export const DIMR = "rgba(248,246,241,.25)"
export const LINE = "rgba(255,255,255,.08)"

// PAT-7 Agent Manifest
export const PAT = {
  P1: { n: "Planner", c: "ATLAS", d: "Strategy", b: "Strategic planning ready.", i: "\u25C8", col: BL },
  P2: { n: "Researcher", c: "ORACLE", d: "Knowledge", b: "Knowledge systems nominal.", i: "\u25C9", col: CY },
  P3: { n: "Coder", c: "FORGE", d: "Build", b: "Compiler initialized.", i: "\u2B21", col: GR },
  P4: { n: "Evaluator", c: "JUDGE", d: "Quality", b: "Quality gates armed.", i: "\u25C7", col: YL },
  P5: { n: "Ethicist", c: "CROWN", d: "Ethics", b: "All invariants holding.", i: "\u2657", col: RD },
  P6: { n: "Publisher", c: "HERALD", d: "Deliver", b: "Delivery channels open.", i: "\u25C6", col: AM },
  P7: { n: "Integrator", c: "NEXUS", d: "Orchestrate", b: "All agents reporting.", i: "\u2726", col: PU },
} as const

export const SAT = [
  { n: "Sentinel", col: RD },
  { n: "Oracle", col: G },
  { n: "Ledger", col: YL },
  { n: "Conductor", col: BL },
  { n: "Ambassador", col: CY },
] as const

export const TIERS = ["Novice", "Apprentice", "Adept", "Expert", "Master", "Grandmaster"] as const
export const TCOL = ["#6B7280", BL, GR, PU, YL, G] as const

export const STAGES = [
  { n: "Seed", l: 0, h: 0.10, d: "Identity created. Potential infinite." },
  { n: "Node", l: 0.10, h: 0.20, d: "First mission completed." },
  { n: "Apprentice", l: 0.20, h: 0.35, d: "Building habits." },
  { n: "Builder", l: 0.35, h: 0.55, d: "Compiled first reflex." },
  { n: "Verifier", l: 0.55, h: 0.70, d: "Trusted to attest others." },
  { n: "Mentor", l: 0.70, h: 0.85, d: "Skills published." },
  { n: "Catalyst", l: 0.85, h: 1, d: "Network multiplier." },
] as const

export function getStage(s: number) {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (s >= STAGES[i].l) return STAGES[i]
  }
  return STAGES[0]
}

export const SKILLS = [
  { id: "open_app", n: "Open App", t: 0, i: "🚀", u: true, hda: true },
  { id: "switch_window", n: "Switch Window", t: 0, i: "🪟", u: true, hda: true },
  { id: "type_text", n: "Type Text", t: 0, i: "⌨️", u: true, hda: true },
  { id: "click_element", n: "Click Element", t: 1, i: "🖱️", hda: true },
  { id: "screenshot", n: "Screenshot", t: 1, i: "📸", hda: true },
  { id: "read_clipboard", n: "Clipboard", t: 1, i: "📋", hda: true },
  { id: "file_open", n: "File Open", t: 2, i: "📖", hda: true },
  { id: "browser_nav", n: "Browser Nav", t: 2, i: "🌐", hda: true },
  { id: "powershell", n: "PowerShell", t: 3, i: "⚡" },
  { id: "multistep", n: "Multi-Step", t: 3, i: "🔗" },
  { id: "crossapp", n: "Cross-App", t: 4, i: "🔄" },
  { id: "network", n: "Network", t: 4, i: "📡" },
  { id: "governance", n: "Governance", t: 4, i: "🏛️" },
  { id: "selfmod", n: "Self-Modify", t: 5, i: "🧬" },
  { id: "validator", n: "Validator", t: 5, i: "🛡️" },
  { id: "federation", n: "Federation", t: 5, i: "🌍" },
] as const

export const SCHEDULED = [
  { id: "morning-brief", n: "Morning Brief", cron: "08:00 weekdays", icon: "☀️", seed: "0.50", desc: "Overnight alerts + priority tasks", auto: false, agents: ["ATLAS", "ORACLE", "CROWN"] },
  { id: "standup", n: "Daily Standup", cron: "10:00 weekdays", icon: "📋", seed: "0.30", desc: "Progress, blockers, plan", auto: false, agents: ["ATLAS", "ORACLE"] },
  { id: "health-check", n: "Health Check", cron: "Every 15 min", icon: "💚", seed: "0.05", desc: "Node0 subsystem monitoring", auto: true, agents: ["ORACLE"] },
  { id: "weekly-review", n: "Weekly Review", cron: "16:00 Friday", icon: "📊", seed: "1.00", desc: "Accomplishments, metrics, next week", auto: false, agents: ["ATLAS", "ORACLE", "CROWN"] },
] as const

export const TEACH_QUESTIONS = [
  { id: "work_schedule", prompt: "What's your typical work schedule?", type: "text" as const, default: "8:00-18:00", icon: "🕐" },
  { id: "primary_tools", prompt: "Which apps do you use most?", type: "multi" as const,
    opts: ["VS Code", "Chrome", "Slack", "Terminal", "Notion", "Figma", "Excel"], icon: "🛠️" },
  { id: "communication_pref", prompt: "How should I communicate with you?", type: "single" as const,
    opts: ["Concise bullet points", "Detailed explanations", "Only when critical"], default: "Concise bullet points", icon: "💬" },
  { id: "priority_domains", prompt: "What are your top priority domains?", type: "multi" as const,
    opts: ["Engineering", "Business strategy", "Marketing", "Operations", "Research"], icon: "🎯" },
  { id: "autonomy", prompt: "How much autonomy should I have?", type: "single" as const,
    opts: ["Ask before every action", "Auto low-risk, ask high-risk", "Full autonomous within budget"], default: "Auto low-risk, ask high-risk", icon: "🤖" },
] as const
