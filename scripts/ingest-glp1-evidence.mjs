#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const root = dirname(__filename);

const CSV_PATH = join(root, "..", "data", "glp1-side-effects-2026.csv");
const OUT_PATH = join(root, "..", "src", "lib", "care", "glp1-evidence.json");

const SIDE_EFFECT_TO_SYMPTOM = {
  Nausea: "nausea",
  Vomiting: "vomiting",
  Diarrhea: "diarrhoea",
  Constipation: "constipation",
  "Abdominal pain": "abdominal_pain",
  Headache: "headache",
  Fatigue: "fatigue",
  "Injection site reactions": "injection_site_reaction",
  "Hypoglycemia (non-diabetic)": "hypoglycaemia_symptoms",
  Gallbladder: "abdominal_pain",
  Pancreatitis: "abdominal_pain",
};

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const header = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    const row = {};
    header.forEach((key, i) => {
      row[key] = values[i] ?? "";
    });
    return row;
  });
}

function normalizeSeverity(severity) {
  const s = severity.toLowerCase();
  if (s.includes("mild") && !s.includes("moderate")) return "mild";
  if (s.includes("moderate") && !s.includes("severe")) return "moderate";
  if (s.includes("mild-moderate")) return "moderate";
  if (s.includes("moderate-severe")) return "severe";
  if (s.includes("severe")) return "severe";
  return "mild";
}

function sideEffectToSymptom(name) {
  for (const [key, value] of Object.entries(SIDE_EFFECT_TO_SYMPTOM)) {
    if (name.toLowerCase().startsWith(key.toLowerCase())) return value;
  }
  return undefined;
}

const csv = readFileSync(CSV_PATH, "utf-8");
const rows = parseCSV(csv);

const evidence = rows
  .map((row) => {
    const symptom = sideEffectToSymptom(row.side_effect);
    if (!symptom) return undefined;
    return {
      symptom,
      originalSideEffect: row.side_effect,
      systemOrganClass: row.system_organ_class,
      severity: normalizeSeverity(row.severity_classification),
      severityClassification: row.severity_classification,
      medication: row.medication,
      dose: row.dose,
      frequencyTreatmentPct: row.frequency_treatment_pct,
      frequencyPlaceboPct: row.frequency_placebo_pct,
      excessFrequencyPct: row.excess_frequency_pct,
      onsetTiming: row.onset_timing,
      duration: row.duration,
      discontinuationRatePct: row.discontinuation_rate_pct,
      managementStrategy: row.management_strategy,
      clinicalSignificance: row.clinical_significance,
      trialSource: row.trial_source,
      notes: row.notes,
    };
  })
  .filter(Boolean);

const output = {
  source: "Ozarihealth/glp1-side-effects-2026 on Hugging Face (CC-BY-4.0)",
  url: "https://huggingface.co/datasets/Ozarihealth/glp1-side-effects-2026",
  lastIngested: new Date().toISOString(),
  entries: evidence,
};

writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
console.log(`Ingested ${evidence.length} evidence rows to ${OUT_PATH}`);
