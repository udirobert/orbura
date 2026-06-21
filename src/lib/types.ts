// Types shared between client and server for the BODY DEBT app

export type StressorType =
  | "alcohol"
  | "sleep"
  | "training"
  | "stress"
  | "ill"
  | "care";

export interface Stressor {
  type: StressorType;
  // Structured context — replaces the old freeform string
  alcoholType?:    "beer" | "red_wine" | "white_wine" | "spirits" | "cocktails" | "champagne";
  alcoholCount?:   "1-2" | "3-4" | "5+" | "lost_count";
  trainingArea?:   "legs" | "upper" | "cardio" | "hiit" | "full_body" | "mobility";
  trainingIntensity?: "easy" | "hard" | "destroyed";
  sleepHours?:     "under_4" | "4-6" | "6-7";
  stressCarried?:  "yes" | "mostly_gone";
  illSeverity?:    "mild" | "moderate" | "floored";
  // Legacy flat context string — kept for backward compatibility
  context?: string;
}

// ─── Five recovery systems ────────────────────────────────────────────────────

export type RecoverySystem =
  | "cardiovascular"
  | "brain"
  | "liver"
  | "muscular"
  | "gut";

export interface SystemScore {
  system:      RecoverySystem;
  label:       string;
  icon:        string;
  score:       number;        // 0–100
  clearedAt:   string;        // ISO datetime
  causeText:   string;
  actionText:  string;
  scienceFact?: string;       // one-sentence insight
  scienceCite?: string;       // "Author et al., Journal, Year"
}

// ─── Confidence tiers ─────────────────────────────────────────────────────────

export type ConfidenceTier =
  | "estimated"      // no context added
  | "partial"        // stressors only
  | "good"           // stressors + some specifics
  | "accurate"       // + face scan
  | "precise";       // + wearable data

// ─── Face analysis ────────────────────────────────────────────────────────────

export interface FaceAnalysisResult {
  periorbitalPuffiness: "none" | "mild" | "moderate" | "severe" | "unmeasured";
  skinPerfusion: "good" | "low" | "very_low";
  eyeClarity: "clear" | "fatigued" | "very_fatigued";
  inflammation: "none" | "mild" | "moderate" | "severe" | "unmeasured";
  debtContribution: number;
  summary: string;
}

// ─── HRV / wearable ───────────────────────────────────────────────────────────

export type HRVSource =
  | "terra"
  | "healthkit"
  | "google_fit"
  | "garmin_export"
  | "manual_proxy"
  | "demo";

export type HRVConfidence = "high" | "medium" | "low";

export interface HRVData {
  hrvDeltaPercent: number;
  restingHrDelta: number;
  source?: HRVSource;
  confidence?: HRVConfidence;
  sleepStages?: {
    deep: number;
    rem: number;
    light: number;
  };
}

// ─── Debt analysis ────────────────────────────────────────────────────────────

export interface StressorBreakdownItem {
  stressor: string;
  points: number;
  insight: string;
  icon: string;
}

export interface Prescription {
  rightNow: string;
  thisMorning: string;
  today: string;
  avoid: string;
}

export interface DebtAnalysis {
  debtScore: number;
  verdict: string;
  recoveryTime: string;
  prescription: Prescription;
  stressorBreakdown: StressorBreakdownItem[];
  systemScores?: SystemScore[];          // five-system breakdown (optional — degrades gracefully)
  confidenceTier?: ConfidenceTier;       // replaces confidenceLevel where present
  recoveryArc: {
    dangerEnds: string;
    partialEnds: string;
    clearedAt: string;
  };
  confidenceLevel: "high" | "medium" | "low";
  sessionId?: number;
  // ─── Multi-agent edge AI metadata ────────────────────────────────────────
  agentTrace?: AgentTrace;
  schedule?: ScheduleBlock[];
  // ─── Counterfactual insight ──────────────────────────────────────────────
  counterfactual?: {
    systemLabel: string;
    fromScore: number;
    toScore: number;
    leverLabel: string;
  };
}

// ─── Multi-agent edge AI ─────────────────────────────────────────────────────

export interface AgentStep {
  agent: "triage" | "coach" | "schedule" | "reflection";
  label: string;
  description: string;
  status: "pending" | "active" | "done" | "error";
  durationMs?: number;
  source: "qvac-local" | "eazo-cloud" | "deterministic";
  model?: string;
  raw?: string;
}

export interface TriageResult {
  priority: string;
  secondary: string;
  avoid: string;
}

export interface AgentTrace {
  steps: AgentStep[];
  triage?: TriageResult;
  source: "qvac-local" | "eazo-cloud" | "deterministic";
  totalDurationMs?: number;
  cloudDurationMs?: number;
  model?: string;
}

export interface ScheduleBlock {
  time: string;
  action: string;
  system: string;
}

export interface AnalyzeBodyRequest {
  stressors: Stressor[];
  faceAnalysis?: FaceAnalysisResult | null;
  hrvData?: HRVData | null;
  currentTime?: string;
  wakeTime?: string;
  bedTime?: string;
  personality?: "honest" | "gentle" | "scientific" | "sarcastic";
  locale?: "en" | "es" | "fr";
}

// ─── ZK Proof ─────────────────────────────────────────────────────────────────

export type OnChainVerificationStatus =
  | "idle"
  | "pending"
  | "verified"
  | "failed"
  | "no-wallet";

/**
 * How the proof was actually produced.
 *  - "crypto": real EZKL Halo2 proof, locally verified ✓
 *  - "failed": real EZKL proof produced but local verify() returned false
 *              (genuine VK/PK/circuit mismatch — surface as a hard error)
 *  - "mock":   the ZK system couldn't initialize (e.g. server is missing
 *              pk.key/vk.key/srs.key/settings.json), so the worker fell
 *              back to a deterministic app-level estimate. This is NOT a
 *              cryptographic failure and should not be presented as one.
 */
export type ZKVerifyMode = "crypto" | "failed" | "mock";

export interface ZKProofResult {
  proof: string;
  proofHex?: string;
  publicInputs: string;
  stressScore: number;
  isHealthy: boolean;
  durationMs: number;
  txHash?: string;
  verified: boolean;
  verifyMode: ZKVerifyMode;
  onChainStatus: OnChainVerificationStatus;
}
