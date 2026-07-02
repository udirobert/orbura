/**
 * Localization strings for Body Debt.
 *
 * Three languages supported out of the box: English (default), Spanish, French.
 * The user's language preference is stored in the Zustand store and
 * persisted to localStorage.
 *
 * Coverage: dashboard chrome (verdict prefix, recovery labels, CTAs) and
 * the deterministic prescription/schedule/triage fallbacks. The QVAC
 * multi-agent output is in the language the user writes in — we don't
 * auto-translate LLM output (would be lossy) but we DO seed the prompts
 * in the user's locale.
 */

export type Locale = "en" | "es" | "fr";

export const LOCALES: Array<{ id: Locale; label: string; emoji: string }> = [
  { id: "en", label: "English",  emoji: "🇺🇸" },
  { id: "es", label: "Español",  emoji: "🇪🇸" },
  { id: "fr", label: "Français", emoji: "🇫🇷" },
];

export interface LocalizedCopy {
  // Verdict prefixes per personality
  verdictPrefix: Record<"honest" | "gentle" | "scientific" | "sarcastic", string>;
  // Score band labels
  scoreBand: Record<"clear" | "mild" | "elevated" | "overtime" | "damage", string>;
  // Section labels
  labels: {
    recoveryAround: string;       // "Recovery around 6pm tonight"
    systems: string;              // "Recovery by system"
    allClear: string;             // "All systems clear"
    counterfactual: string;       // "What would change this"
    multiAgent: string;           // "Multi-Agent Pipeline"
    recoverySchedule: string;     // "Recovery Schedule"
    edgeAiBadge: string;          // "Edge AI"
    onChainBadge: string;         // "On-chain"
    onChainPill: string;          // "Last verified on SKALE"
    qvacBadge: string;            // "QVAC · Qwen3-1.7B · on-device"
    qvacAgentsWorking: string;    // "edge AI agents working"
    checkBack: string;            // "Check back in the morning"
    checkBackSubtitle: string;    // sub-copy under "Check back"
    streakChain: (n: number) => string; // "{n}-day streak — don't break the chain"
    systemClear: string;          // "Cleared"
  };
  // Deterministic fallback prescription phrases (used when QVAC + cloud fail)
  prescription: {
    rightNowFallback:   string;
    thisMorningFallback:string;
    todayFallback:      string;
    avoidFallback:      string;
    // Per-stressor insights (deterministic engine)
    insights: {
      alcohol:  string;
      sleep:    string;
      training: string;
      stress:   string;
      ill:      string;
      caregiving:string;
    };
  };
  // Schedule time-of-day labels
  schedule: {
    nowTo10:    string; // "NOW-10AM"
    tenToNoon:  string; // "10AM-12PM"
    noonTo3:    string; // "12PM-3PM"
    threeTo6:   string; // "3PM-6PM"
  };
  // CTAs
  ctas: {
    viewPrescription: string;
    shareScore:       string;
    setReminder:      string;
    newAssessment:    string;
    startAssessment:  string;
    startFresh:       string;
    cancel:           string;
    signInToSave:     string;
    giveOrbMoreSignal:string;
  };
}

const EN: LocalizedCopy = {
  verdictPrefix: {
    honest: "",
    gentle: "You're doing okay — ",
    scientific: "Biometrically speaking — ",
    sarcastic: "Surprise — ",
  },
  scoreBand: {
    clear: "Body is clear",
    mild: "Mild debt",
    elevated: "Elevated burden",
    overtime: "Working overtime",
    damage: "Damage control",
  },
  labels: {
    recoveryAround: "Recovery around",
    systems: "Recovery by system",
    allClear: "All systems clear ●",
    counterfactual: "What would change this",
    multiAgent: "Multi-Agent Pipeline",
    recoverySchedule: "Recovery Schedule",
    edgeAiBadge: "Edge AI",
    onChainBadge: "On-chain",
    onChainPill: "Last verified on SKALE",
    qvacBadge: "QVAC · Qwen3-1.7B · on-device",
    qvacAgentsWorking: "edge AI agents working",
    checkBack: "Check back in the morning",
    checkBackSubtitle:
      "Your systems recover on different timelines. Log tomorrow to see how much debt cleared overnight and keep your streak going.",
    streakChain: (n) => `${n}-day streak — don't break the chain`,
    systemClear: "Cleared",
  },
  prescription: {
    rightNowFallback:   "Drink 500ml water with electrolytes — your cells are dehydrated.",
    thisMorningFallback:"Get 10 minutes of natural light exposure to reset your cortisol rhythm.",
    todayFallback:      "Expect 70–80% cognitive capacity today. Prioritise your two most important tasks.",
    avoidFallback:      "Anything that raises cortisol further — late nights, processed food, stimulants.",
    insights: {
      alcohol:   "Liver processing peaks 4–6 hours after drinking. Cortisol remains elevated.",
      sleep:     "Cognitive performance at 60–70% capacity. Decision quality reduced.",
      training:  "Muscle protein synthesis requires 24–72 hours to complete.",
      stress:    "Cortisol load reduces prefrontal cortex throughput. Decision fatigue is real.",
      ill:       "Immune response is energy-expensive. Your body is doing work you can't see.",
      caregiving:"Sleep fragmentation reduces deep-sleep cycles. Recovery runs slower.",
    },
  },
  schedule: {
    nowTo10:   "NOW-10AM",
    tenToNoon: "10AM-12PM",
    noonTo3:   "12PM-3PM",
    threeTo6:  "3PM-6PM",
  },
  ctas: {
    viewPrescription:   "View my prescription →",
    shareScore:         "Share my score",
    setReminder:        "Set recovery reminder",
    newAssessment:      "New assessment",
    startAssessment:    "Start assessment",
    startFresh:         "Start fresh",
    cancel:             "Cancel",
    signInToSave:       "Sign in to save",
    giveOrbMoreSignal:  "Give your orb more signal",
  },
};

const ES: LocalizedCopy = {
  verdictPrefix: {
    honest: "",
    gentle: "Vas bien — ",
    scientific: "Biométricamente — ",
    sarcastic: "Sorpresa — ",
  },
  scoreBand: {
    clear: "Cuerpo limpio",
    mild: "Deuda leve",
    elevated: "Carga elevada",
    overtime: "Trabajando extra",
    damage: "Control de daños",
  },
  labels: {
    recoveryAround: "Recuperación alrededor de",
    systems: "Recuperación por sistema",
    allClear: "Todos los sistemas despejados ●",
    counterfactual: "Qué cambiaría esto",
    multiAgent: "Pipeline multi-agente",
    recoverySchedule: "Horario de recuperación",
    edgeAiBadge: "Edge AI",
    onChainBadge: "On-chain",
    onChainPill: "Última verificación en SKALE",
    qvacBadge: "QVAC · Qwen3-1.7B · en el dispositivo",
    qvacAgentsWorking: "agentes edge AI trabajando",
    checkBack: "Vuelve por la mañana",
    checkBackSubtitle:
      "Tus sistemas se recuperan en plazos diferentes. Registra mañana para ver cuánta deuda se liberó durante la noche y mantén tu racha.",
    streakChain: (n) => `Racha de ${n} días — no la rompas`,
    systemClear: "Despejado",
  },
  prescription: {
    rightNowFallback:   "Bebe 500ml de agua con electrolitos — tus células están deshidratadas.",
    thisMorningFallback:"Recibe 10 minutos de luz natural para reiniciar tu ritmo de cortisol.",
    todayFallback:      "Espera 70–80% de capacidad cognitiva hoy. Prioriza tus dos tareas más importantes.",
    avoidFallback:      "Cualquier cosa que suba el cortisol: trasnochar, comida procesada, estimulantes.",
    insights: {
      alcohol:    "El hígado procesa alcohol pico 4–6h después. El cortisol sigue elevado.",
      sleep:      "Rendimiento cognitivo al 60–70%. La calidad de decisión cae.",
      training:   "La síntesis de proteína muscular necesita 24–72h para completarse.",
      stress:     "La carga de cortisol reduce el rendimiento prefrontal. Fatiga de decisión real.",
      ill:        "La respuesta inmune consume energía. Tu cuerpo trabaja sin que lo veas.",
      caregiving: "Sueño fragmentado reduce el sueño profundo. La recuperación va más lenta.",
    },
  },
  schedule: {
    nowTo10:   "AHORA-10AM",
    tenToNoon: "10AM-12PM",
    noonTo3:   "12PM-3PM",
    threeTo6:  "3PM-6PM",
  },
  ctas: {
    viewPrescription:   "Ver mi prescripción →",
    shareScore:         "Compartir mi puntuación",
    setReminder:        "Configurar recordatorio",
    newAssessment:      "Nueva evaluación",
    startAssessment:    "Iniciar evaluación",
    startFresh:         "Empezar de cero",
    cancel:             "Cancelar",
    signInToSave:       "Inicia sesión para guardar",
    giveOrbMoreSignal:  "Dale más señal a tu orbe",
  },
};

const FR: LocalizedCopy = {
  verdictPrefix: {
    honest: "",
    gentle: "Tu vas bien — ",
    scientific: "Biométriquement — ",
    sarcastic: "Surprise — ",
  },
  scoreBand: {
    clear: "Corps net",
    mild: "Dette légère",
    elevated: "Charge élevée",
    overtime: "Heures sup'",
    damage: "Dommages collatéraux",
  },
  labels: {
    recoveryAround: "Récupération vers",
    systems: "Récupération par système",
    allClear: "Tous les systèmes au vert ●",
    counterfactual: "Ce qui changerait ça",
    multiAgent: "Pipeline multi-agents",
    recoverySchedule: "Programme de récupération",
    edgeAiBadge: "Edge AI",
    onChainBadge: "On-chain",
    onChainPill: "Dernière vérif sur SKALE",
    qvacBadge: "QVAC · Qwen3-1.7B · sur l'appareil",
    qvacAgentsWorking: "agents edge AI en cours",
    checkBack: "Reviens demain matin",
    checkBackSubtitle:
      "Tes systèmes récupèrent à des rythmes différents. Log demain pour voir combien de dette s'est effacée pendant la nuit et garde ta série.",
    streakChain: (n) => `Série de ${n} jours — casse pas la dynamique`,
    systemClear: "Net",
  },
  prescription: {
    rightNowFallback:   "Bois 500ml d'eau avec électrolytes — tes cellules sont déshydratées.",
    thisMorningFallback:"Prends 10 minutes de lumière naturelle pour recaler ton rythme de cortisol.",
    todayFallback:      "Compte sur 70–80% de capacité cognitive aujourd'hui. Priorise tes deux tâches clés.",
    avoidFallback:      "Tout ce qui monte le cortisol — nuits tardives, plats industriels, excitants.",
    insights: {
      alcohol:    "Le foie traite l'alcool 4–6h après. Le cortisol reste haut.",
      sleep:      "Performance cognitive à 60–70%. La décision perd en qualité.",
      training:   "La synthèse protéique musculaire demande 24–72h.",
      stress:     "La charge de cortisol réduit le débit préfrontal. Fatigue de décision réelle.",
      ill:        "La réponse immunitaire coûte cher en énergie. Ton corps bosse sans que tu le voies.",
      caregiving: "Sommeil fragmenté réduit le sommeil profond. Récupération plus lente.",
    },
  },
  schedule: {
    nowTo10:   "MAINT-10H",
    tenToNoon: "10H-12H",
    noonTo3:   "12H-15H",
    threeTo6:  "15H-18H",
  },
  ctas: {
    viewPrescription:   "Voir ma prescription →",
    shareScore:         "Partager mon score",
    setReminder:        "Programmer un rappel",
    newAssessment:      "Nouvelle évaluation",
    startAssessment:    "Commencer l'évaluation",
    startFresh:         "Recommencer",
    cancel:             "Annuler",
    signInToSave:       "Connecte-toi pour sauvegarder",
    giveOrbMoreSignal:  "Donne plus de signal à ton orbe",
  },
};

const STRINGS: Record<Locale, LocalizedCopy> = {
  en: EN,
  es: ES,
  fr: FR,
};

export function getStrings(locale: Locale): LocalizedCopy {
  return STRINGS[locale] ?? EN;
}

export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language?.toLowerCase() ?? "en";
  if (lang.startsWith("es")) return "es";
  if (lang.startsWith("fr")) return "fr";
  return "en";
}
