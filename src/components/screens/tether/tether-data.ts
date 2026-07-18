/**
 * Data for the Tether Developers Cup judge page.
 *
 * The Tether Cup is football-themed with 3 tracks:
 * Pears (P2P), QVAC (self-hosted AI), WDK (Wallets).
 *
 * The story: a football match is a physiological event — for the players who
 * run 11km AND the billions who watch a shootout with their heart in their
 * mouth. One self-hosted engine, two experiences:
 *
 *  • Match Fit    — the team doctor for players & coaches (+ WDK squad payments)
 *  • Fan Recovery — an emotional-recovery coach for fans (the mass audience)
 *
 * All AI runs through the self-hosted QVAC SDK. No third-party model API,
 * no API keys, no account.
 */

import { scienceFor } from "@/lib/science";

// ─── Tournament timeline ─────────────────────────────────────────────────────

export const TOURNAMENT_DATES = [
  { date: "July 6",  event: "Registration closes, field locks",     status: "upcoming" },
  { date: "July 8",  event: "First cut — submit project + demo",    status: "upcoming" },
  { date: "July 12", event: "Semifinals — field cuts to 4",         status: "upcoming" },
  { date: "July 14", event: "Final submission deadline",            status: "upcoming" },
  { date: "July 15-18", event: "Live pitch to Tether team",         status: "upcoming" },
  { date: "July 19", event: "Winners announced",                    status: "upcoming" },
];

// ─── The pitch ───────────────────────────────────────────────────────────────

export const PITCH = {
  headline: "Match Fit",
  subheadline: "The self-hosted football readiness coach, powered by QVAC without a third-party model API.",
  problem: "Football teams at every level — from Sunday league to World Cup — need to assess player readiness. Is your striker match-fit after a late night? Can your defender play through a concussion protocol? Today this requires a sports scientist, a connected app, or a gut call from the manager.",
  solution: "Match Fit runs a 4-agent QVAC pipeline on the app host. Scan a player's face in the browser, log their stressors (match minutes, training load, sleep, alcohol, travel, cards, concussion), and get a match-readiness estimate and time-blocked recovery schedule from a self-hosted 1.7B model.",
  whyQvac: "The QVAC SDK runs a Qwen3 model across four agents (triage, coach, schedule, reflection) without sending prompts to a third-party model API. In the hosted web app the worker runs on the app server; a fully local deployment can keep the complete runtime on the operator's machine.",
};

// ─── Two experiences, one self-hosted engine ─────────────────────────────────

export const HERO = {
  eyebrow: "One self-hosted engine · two experiences",
  headlineTop: "The match is over.",
  headlineAccent: "Your body isn't.",
  subheadline:
    "A football match is a physiological event — for the players who run 11km and the billions who watch a shootout with their heart in their mouth. Body Debt estimates the recovery either one needs with deterministic scoring and a self-hosted QVAC runtime.",
};

export const EXPERIENCES = [
  {
    icon: "⚽",
    name: "Match Fit",
    audience: "Players & coaches",
    line: "The team doctor in your pocket. Scan a player, get a match-readiness score and a return-to-play protocol — plus self-custodial USDt squad payments.",
    color: "var(--color-states-success)",
  },
  {
    icon: "❤️",
    name: "Fan Recovery",
    audience: "The billions who watch",
    line: "The match is over — how are you? Log the result and get a private wind-down that clears the adrenaline and protects your sleep before the next late kickoff.",
    color: "#fb7185",
  },
];

// ─── Fan Recovery story (emotional / mental debt) ────────────────────────────

export const FAN_STORY = {
  problem:
    "Watching football is physical too. A late winner, a knockout, a penalty shootout — they spike cortisol and adrenaline, raise heart rate, and wreck sleep, especially for the late kickoffs fans stay up for across time zones. Billions feel it every tournament, and nothing helps them recover. Ask any fan the morning after their team went out.",
  solution:
    "Fan Recovery reuses the same self-hosted QVAC engine. A fan logs how the match left them — the result, how tense it was to watch, the post-match doomscroll — and the coach returns a practical wind-down: a short walk, water, screens down, and protected sleep.",
};

export const FAN_SCIENCE = {
  stat: "2×",
  claim:
    "Cardiac emergencies more than doubled on days the German team played at the 2006 World Cup. The trigger was the emotional stress of watching — not physical exertion. 'Your team losing is physiological debt' is a documented finding, not a metaphor.",
  // Citation single-sourced from the canonical science module.
  cite: scienceFor("cardiovascular", "fan").cite,
};

export const FAN_STRESSORS = [
  {
    icon: "⚽",
    name: "The result",
    scoring: "brain + cardio + gut",
    detail: "Won comfortably → knocked out. A loss drives cortisol and rumination for hours; a knockout is the heaviest emotional load in the model.",
  },
  {
    icon: "😰",
    name: "Match tension",
    scoring: "cardio-led + brain",
    detail: "Comfortable → penalty shootout. A shootout is peak cardiac stress — sustained adrenaline through the 90 and beyond.",
  },
  {
    icon: "📱",
    name: "Post-match scroll",
    scoring: "brain (+ gut)",
    detail: "Replays, hot takes, arguing online. Blue light plus rumination push back sleep onset — and it's the one lever the fan fully controls.",
  },
];

export const FAN_QVAC_OUTPUT = {
  triage:
    "PRIORITY: Cardiovascular 61/100 — shootout kept heart rate elevated\nSECONDARY: Brain 58/100 — the loss and the doomscroll are delaying sleep\nAVOID: more caffeine, replays, arguing in the group chat",
  coach:
    "RIGHT NOW: Get up and take a 15-minute walk. Movement burns off the cortisol still running from the match.\nTHIS MORNING: Natural light and a real breakfast reset your nervous system faster than caffeine.\nTODAY: Be kind to yourself — the result stung, and your body is still catching up.\nAVOID: Rewatching the highlights before bed. The takes will still be there tomorrow; your sleep won't.",
};

// ─── Football-specific stressors ─────────────────────────────────────────────

export const FOOTBALL_STRESSORS = [
  {
    icon: "⚽",
    name: "Match minutes",
    scoring: "35 pts muscular/CNS × duration modifier",
    detail: "Under 30 min: 0.3–0.4×, 30–60 min: 0.6–0.7×, 60–90 min: 0.9–1.0×, extra time: 1.2–1.3×",
  },
  {
    icon: "🟨",
    name: "Card / foul stress",
    scoring: "20 pts brain × modifier + 10 cardio",
    detail: "Yellow: 0.4×, heavy foul: 0.7×, red: 1.0×. Psychological load from disciplinary events.",
  },
  {
    icon: "✈️",
    name: "Travel / timezone",
    scoring: "Up to +30 brain, +18 cardio, +15 gut",
    detail: "1–2h shift: +8 brain. 3–5h: +18. 6h+: +30. Circadian disruption compounds with sleep debt.",
  },
  {
    icon: "🤕",
    name: "Concussion check",
    scoring: "50 pts brain × severity modifier",
    detail: "Minor: 0.8×, moderate: 1.0×, protocol: 1.5×. The largest single-stressor impact in the engine.",
  },
  {
    icon: "💪",
    name: "Training load",
    scoring: "40 pts muscular × area × intensity",
    detail: "Legs/full body: 1.0×, upper: 0.5×, mobility: −0.5×. Destroyed: 1.2×, hard: 0.85×, easy: 0.4×.",
  },
  {
    icon: "😴",
    name: "Poor sleep",
    scoring: "35 pts brain × sleep-hours modifier",
    detail: "<4h: 1.0×, 4–6h: 0.75×, 6–7h: 0.40×. Compounds with circadian penalty for late bedtimes.",
  },
  {
    icon: "🍺",
    name: "Alcohol",
    scoring: "30 pts × drink-type × count modifier",
    detail: "Spirits: 1.4× liver, cocktails: 1.4× brain. 5+ drinks: 1.0×, lost count: 1.2×.",
  },
  {
    icon: "🤒",
    name: "Illness",
    scoring: "12–30 pts × severity across systems",
    detail: "Mild: 0.5×, moderate: 1.0×, floored: 1.5×. Affects cardiovascular, gut, and muscular recovery.",
  },
  {
    icon: "😤",
    name: "Mental stress",
    scoring: "+8–28 pts brain + cardio",
    detail: "Carried stress: full penalty. Mostly gone: half penalty. Pressure, expectations, personal issues.",
  },
  {
    icon: "✦",
    name: "Recovery day",
    scoring: "−6 to −12 pts across systems",
    detail: "Active recovery or rest day. The only stressor that reduces debt. Self-care is scored.",
  },
];

// ─── Squad readiness tiers ───────────────────────────────────────────────────

export const READINESS_TIERS = [
  {
    range: "0–20",
    label: "Fit to start",
    color: "#22D3EE",
    icon: "⚽",
    desc: "Minimal debt. Player is fully match-ready. No restrictions.",
  },
  {
    range: "21–40",
    label: "Modified",
    color: "#4ADE80",
    icon: "🟢",
    desc: "Low debt. Play with minor modifications — reduced minutes or position adjustment.",
  },
  {
    range: "41–60",
    label: "Impact sub",
    color: "#F59E0B",
    icon: "🟡",
    desc: "Moderate debt. Not ready to start. Available as an impact substitute for 20–30 minutes.",
  },
  {
    range: "61–80",
    label: "Out — rest",
    color: "#DC2626",
    icon: "🔴",
    desc: "High debt. Player should not feature. Full recovery protocol required before next match.",
  },
  {
    range: "81–100",
    label: "Critical",
    color: "#991B1B",
    icon: "⛔",
    desc: "Severe debt. Medical attention may be needed. No training, no match. Full rest mode.",
  },
];

// ─── QVAC pipeline for football ──────────────────────────────────────────────

export const QVAC_PIPELINE = [
  {
    agent: "triage",
    icon: "🔬",
    role: "Identifies priority body system, secondary concern, and what to avoid",
    duration: "~6.3s",
    footballOutput: "PRIORITY: Muscular / CNS 72/100 — match load exceeds recovery\nSECONDARY: Brain 58/100 — sleep debt impairs decision-making\nAVOID: high-intensity training, heavy lifts",
  },
  {
    agent: "coach",
    icon: "💊",
    role: "Generates 4-part return-to-play prescription from triage context",
    duration: "~4.3s",
    footballOutput: "RIGHT NOW: 500ml water + electrolytes. No screens for 10 minutes.\nTHIS MORNING: Delay caffeine 90 minutes. Light walk only.\nTODAY: No training. Recovery session only. Bland foods.\nAVOID: Alcohol, heavy decisions, intense exercise.",
  },
  {
    agent: "schedule",
    icon: "📅",
    role: "Produces time-blocked recovery schedule for the day",
    duration: "~6.4s",
    footballOutput: "9:00–10:00 | Light walk + mobility | Muscular\n10:00–12:00 | Hydration + nutrition | Gut\n14:00–15:00 | Recovery session | Cardiovascular\n18:00–22:00 | Sleep prep protocol | Brain",
  },
  {
    agent: "reflection",
    icon: "🎭",
    role: "Rewrites prescription in manager's chosen voice (honest / gentle / intense)",
    duration: "~4.4s",
    footballOutput: "Manager's call: He's not fit to start. 72 on muscular, 58 on brain.\nBring him off the bench for the last 20 if the scoreline allows.\nNo training today — recovery session only.",
  },
];

// ─── Architecture ────────────────────────────────────────────────────────────

export const ARCHITECTURE = [
  { step: "Manager opens Match Fit mode", icon: "⚽", detail: "Opening screen — Check my debt, or Match Fit / Fan Recovery" },
  { step: "Add player to squad", icon: "👥", detail: "Name, position (GK/DEF/MID/FWD), stressor log" },
  { step: "Optional: face scan", icon: "📷", detail: "MediaPipe FaceMesh → 7-dim feature vector → ZK proof (Web Worker)" },
  { step: "QVAC 4-agent pipeline", icon: "🧠", detail: "Qwen3-1.7B via QVAC SDK — triage → coach → schedule → reflection" },
  { step: "Match-readiness score", icon: "📊", detail: "0–100 score + 5-system breakdown + readiness tier" },
  { step: "Return-to-play protocol", icon: "📋", detail: "4-part prescription + time-blocked recovery schedule" },
  { step: "Squad readiness board", icon: "🏟", detail: "All players on one screen: fit / modified / impact sub / out" },
  { step: "WDK squad payment", icon: "💰", detail: "Self-custodial USDt: match-day bonus, player fine, or fan tip" },
];

// ─── Fallback chain (deterministic-only, no third-party model API) ───────────

export const FALLBACK_CHAIN = [
  { layer: "QVAC 4-agent pipeline",  primary: "Self-hosted inference (Qwen3-1.7B)", fallback: "Deterministic prescription + schedule from score" },
  { layer: "Verdict",                primary: "Deterministic Layer 1 score",        fallback: "Always available — no AI needed" },
  { layer: "Prescription",           primary: "QVAC Coach Agent",                   fallback: "Deterministic rule-based prescription" },
  { layer: "Schedule",               primary: "QVAC Schedule Agent",                fallback: "Deterministic 4-block schedule" },
  { layer: "Counterfactual",         primary: "Deterministic single-flip",          fallback: "Always available, no LLM needed" },
];

// ─── Performance metrics ─────────────────────────────────────────────────────

export const PERFORMANCE = {
  model: "Qwen3-1.7B-Instruct (Q4 quantized + TurboQuant KV-cache)",
  totalPipeline: "~21.5s self-hosted",
  agentBreakdown: [
    { agent: "Triage", time: "6.3s" },
    { agent: "Coach", time: "4.3s" },
    { agent: "Schedule", time: "6.4s" },
    { agent: "Reflection", time: "4.4s" },
  ],
  offlineAfterFirstRun: true,
  modelSize: "~250MB RAM",
  zeroCloudCalls: true,
  wdkWallet: "Self-custodial USDt via @tetherto/wdk",
  wdkChain: "Ethereum Sepolia (testnet)",
};

// ─── Judging criteria mapping ────────────────────────────────────────────────

export const JUDGING_CRITERIA = [
  {
    criterion: "Technical ambition",
    score: "Two-track project: self-hosted QVAC 4-agent pipeline + WDK self-custodial USDt wallet. ZK face scan proof verified on SKALE. Deterministic fallback chain for every AI layer. One engine, three contexts (personal + Match Fit + Fan Recovery) — a new audience is a data-driven registry entry, not a new codebase.",
  },
  {
    criterion: "User experience",
    score: "Animated debt orb that morphs with score. Time-drum picker for sleep timing. Squad readiness board with traffic-light tiers. In-app USDt payments: bonus, fine, tip — no wallet extension needed. And a full-time moment for fans: log how the match left you, get a wind-down. 3 coach personalities (honest / gentle / intense).",
  },
  {
    criterion: "Real-world use",
    score: "Two real audiences. Coaches scan a player in 30 seconds and send a USDt bonus from the same screen. And the billions who only watch get something no one has built — recover from a loss, protect your sleep after a late kickoff. No account, no third-party model API, no API bills.",
  },
  {
    criterion: "Creativity",
    score: "Body debt as physiological, not financial, debt — extended to the emotional load of watching football. 'Recover from your team losing' is a genuinely new idea, and it's grounded: the NEJM 2006 World Cup finding that cardiac events doubled from watching. Counterfactual engine ('log off instead of doomscrolling and brain debt drops'). Concussion protocol for players, penalty-shootout cardiac load for fans.",
  },
  {
    criterion: "Real use of QVAC track",
    score: "All AI inference via @qvac/sdk. Qwen3-1.7B-Instruct Q4. 4 agents (triage, coach, schedule, reflection) chained via SSE streaming. The same pipeline powers a private emotional-recovery coach — how you feel after your team loses is processed by self-hosted QVAC with no third-party model API. Model cached after first run; subsequent runs reuse it without a third-party model API.",
  },
  {
    criterion: "Real use of WDK track",
    score: "Self-custodial USDt wallet via @tetherto/wdk + @tetherto/wdk-wallet-evm. Manager's wallet initialized from seed phrase (server-side, never exposed to client). Send bonus, fine, or tip to any player with an EVM address. Treasury balance + payment history in-app.",
  },
];

// ─── WDK squad payments ──────────────────────────────────────────────────────

export const PAYMENT_TYPES = [
  {
    type: "bonus",
    icon: "🏆",
    label: "Match-day bonus",
    desc: "Manager sends USDt to player of the match. Reward performance directly.",
    color: "var(--color-states-success)",
  },
  {
    type: "fine",
    icon: "🟨",
    label: "Player fine",
    desc: "Late to training, red card, missed curfew. Automatic USDt deduction to team fund.",
    color: "var(--color-states-warning)",
  },
  {
    type: "tip",
    icon: "💚",
    label: "Fan tip",
    desc: "Fans tip players after a match. Peer-to-peer, no platform fees.",
    color: "var(--color-system-brain)",
  },
];

export const PAYMENT_FLOW = [
  { step: "Manager connects treasury", icon: "🔑", detail: "WDK wallet initialized from seed phrase (server-side, never exposed to client)" },
  { step: "Player adds EVM address", icon: "👤", detail: "Each squad player can register their Ethereum address for receiving payments" },
  { step: "Manager selects payment type", icon: "📋", detail: "Bonus, fine, or tip — with amount in USDt and optional note" },
  { step: "Server signs + broadcasts", icon: "⛓", detail: "API route calls WDK to sign and send the USDt transaction on Ethereum" },
  { step: "Tx hash returned to client", icon: "✅", detail: "Payment recorded in store with tx hash, status, and timestamp" },
  { step: "Treasury balance updates", icon: "💰", detail: "Manager sees updated balance and payment history in the squad view" },
];

// ─── Links ───────────────────────────────────────────────────────────────────

export const TETHER_LINKS = {
  live: "/",
  squad: "/squad",
  evidence: "/evidence",
  github: "https://github.com/udirobert/bodydebt",
  qvac: "https://qvac.tether.io",
  wdk: "https://wdk.tether.io",
  dorahacks: "https://dorahacks.io/hackathon/tether-developers-cup",
  tetherPlan: "/docs/tether-cup-plan.md",
};
