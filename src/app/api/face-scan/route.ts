import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/sdk/eazo-client";
import type { FaceAnalysisResult } from "@/lib/types";

export const maxDuration = 30;

// Valid enum values — used to sanitise AI output
const VALID_PUFFINESS = ["none", "mild", "moderate", "severe"] as const;
const VALID_PERFUSION  = ["good", "low", "very_low"] as const;
const VALID_CLARITY    = ["clear", "fatigued", "very_fatigued"] as const;
const VALID_INFLAM     = ["none", "mild", "moderate", "severe"] as const;

function clamp<T>(value: unknown, valid: readonly T[], fallback: T): T {
  return valid.includes(value as T) ? (value as T) : fallback;
}

export async function POST(request: NextRequest) {
  // No auth gate — face analysis is available to all users (guest-first)
  let body: { imageBase64: string; mimeType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { imageBase64, mimeType = "image/jpeg" } = body;

  if (!imageBase64 || typeof imageBase64 !== "string" || imageBase64.length < 100) {
    return NextResponse.json({ error: "No valid image provided" }, { status: 400 });
  }

  // Hard size cap — reject anything over ~2MB base64 (~1.5MB raw)
  if (imageBase64.length > 2_800_000) {
    return NextResponse.json({ error: "Image too large" }, { status: 413 });
  }

  const systemPrompt = `You are a physiological inference system embedded in a personal health app.

You analyze facial images ONLY to detect visible biomarkers related to recovery debt:
- Periorbital puffiness and redness (sleep deprivation, alcohol, inflammation)
- Skin tone and perfusion (hydration, circulation)
- Eye aperture and clarity (fatigue, cognitive load)
- General visible inflammation

PRIVACY CONTRACT:
- You are NOT a medical diagnostic tool
- You do NOT identify the person
- You do NOT retain or reference any data between calls
- You observe visible physical signals only, not identity

Respond ONLY with valid JSON. No commentary. No explanation outside the JSON.`;

  const userPrompt = `Analyze this facial image for visible physiological stress markers.

Return ONLY this JSON structure with no additional text:
{
  "periorbitalPuffiness": "none" | "mild" | "moderate" | "severe",
  "skinPerfusion": "good" | "low" | "very_low",
  "eyeClarity": "clear" | "fatigued" | "very_fatigued",
  "inflammation": "none" | "mild" | "moderate" | "severe",
  "debtContribution": <integer 0–25 representing debt points from visible markers>,
  "summary": <one short sentence, 10–18 words, observational tone, no identity reference, starts with "There is..." or "Visible..." or "Your face shows...">
}`;

  try {
    const response = await ai.chat({
      model: "anthropic.claude-3-5-haiku",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 400,
    });

    const rawText = response.choices[0]?.message?.content ?? "{}";

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error("Model returned malformed JSON");
    }

    // Strict validation — never trust raw AI output directly
    const result: FaceAnalysisResult = {
      periorbitalPuffiness: clamp(parsed.periorbitalPuffiness, VALID_PUFFINESS, "mild"),
      skinPerfusion:        clamp(parsed.skinPerfusion, VALID_PERFUSION, "low"),
      eyeClarity:           clamp(parsed.eyeClarity, VALID_CLARITY, "fatigued"),
      inflammation:         clamp(parsed.inflammation, VALID_INFLAM, "mild"),
      debtContribution:     typeof parsed.debtContribution === "number"
        ? Math.max(0, Math.min(25, Math.round(parsed.debtContribution)))
        : 8,
      summary: typeof parsed.summary === "string" && parsed.summary.length > 0
        ? parsed.summary.slice(0, 200)  // hard cap
        : "Visible stress markers detected. Adjusting score.",
    };

    // Explicit: the image is not stored — it lives only in this request scope.
    // The base64 string is garbage-collected when this function returns.
    return NextResponse.json(result, {
      headers: {
        "X-Data-Retained": "false",
        "X-Image-Stored": "false",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Face analysis failed. Continuing without face data." },
      { status: 500 }
    );
  }
}
