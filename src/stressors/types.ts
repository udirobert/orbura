import type {
  Stressor,
  StressorType,
  RecoveryMode,
  RecoverySystem,
} from "@/lib/types";

export interface SubOption {
  key: string;
  label: string;
}

export interface StressorDef {
  type: StressorType;
  /** Modes this stressor is shown in. Omit to include in every mode. */
  modes?: RecoveryMode[];
  label: string;
  sublabel: string;
  icon: string;
  basePoints: number;
  expansions?: {
    field: keyof Stressor;
    question: string;
    options: SubOption[];
  }[];
}

export interface CounterfactualResult {
  system: RecoverySystem;
  systemLabel: string;
  fromScore: number;
  toScore: number;
  drop: number;
  leverLabel: string;
}
