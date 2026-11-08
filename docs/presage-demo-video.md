# Presage Demo Video — Treatment

**Working title:** *The Body Keeps the Minutes*
**Runtime target:** ~115 seconds
**Category targets:** Best Overall Human-Sensing Experience (primary), Most Creative or Delightful Use (secondary)
**Core argument:** A camera check-in is trivia; accumulation is health. The video performs Orbura's
thesis — health signals → one safe action → longitudinal record — rather than describing it.

## Creative concept

Hybrid of three moves:

1. **Cold open (human ritual, no narration)** — a person does the check-in as part of an ordinary
   morning. The measurement is ambient, not the subject. (Direction C)
2. **The turn** — hard cut from the mundane to the product: consent → live SmartSpectra capture →
   result card with one safe action. (Real screen capture — non-negotiable)
3. **The accumulation** — the video itself performs the product's longitudinal claim: the same
   45-second ritual repeated across days, rendered as one continuous visual organism — a baseline
   forming. (Direction A)

The video argues that health data doesn't require a *device* — it requires a *moment*, and the
moment was already there.

## Visual registers

Two registers, alternated deliberately so cuts feel designed:

- **Human plate** — warm natural light, 35mm, shallow depth of field, quiet morning interiors.
  Faces partially obscured or in profile (tasteful, not invasive — consistent with the privacy pitch).
- **Signal abstract** — dark background, warm orange/amber particles and light traces, breathing-paced
  motion. Represents data-in-motion without faking any UI or numbers.

## Shot list

| # | Timecode | Beat | Source | Picture | Overlay / audio |
|---|----------|------|--------|---------|-----------------|
| 1 | 0:00–0:12 | Morning ritual | FLUX (human plate) | Person at kitchen table, coffee, laptop open, window light. Laptop camera dot glows. They don't notice it. | Ambient room tone only. No music yet. |
| 2 | 0:12–0:20 | The unnoticed sensor | FLUX (human plate) | Closer angle: the same morning, over-shoulder. A faint breathing-paced pulse in the light. | Text fades in: *"Health data is either expensive, effortful, or invisible."* |
| 3 | 0:20–0:22 | The turn | Edit | Hard cut — screen capture begins. | Music enters: single soft piano note, breathing-paced. |
| 4 | 0:22–0:38 | Consent as interface | Real capture | Orbura Companion consent screen, slow scroll of privacy list. Camera indicator visible. | VO/captions: *"The camera measures. It doesn't record. Nothing leaves this device."* |
| 5 | 0:38–0:42 | Boundary | FLUX (signal abstract) | Light fragments dissolve at an invisible wall; clean structured particles pass through. | Caption: *"Frames stay here. Numbers are yours."* |
| 6 | 0:42–1:12 | The scan | Real capture | Guided scan: guide oval locks, breathing trace draws, MiniOrb forming, pulse/HRV readouts populate. Hold on real numbers. | Breath-paced ambience. One status line visible at a time. |
| 7 | 1:12–1:27 | One action | Real capture | Result card: vitals → "one thing to notice" → "Today's one action" → Save to Orbura tapped. | VO: *"A reading is trivia. An action is health."* |
| 8 | 1:27–1:35 | See it in Orbura | Real capture | "See it in Orbura →" click → cut to orbura.famile.xyz/hrv-pull camera panel showing the fresh reading. | Music lifts. |
| 9 | 1:35–1:48 | The accumulation | Edit + FLUX | The exhale motif repeats — day 1, 3, 7, 14, 30 — trace lines converging into a baseline band. Intercut with real trend tooltip showing breathing/pulse. | Caption: *"Day 1 is a reading. Day 30 is a baseline."* |
| 10 | 1:48–1:58 | Ritual close | FLUX (human plate) | Same person, same table, days later — glances at phone, small smile. Match-cut back to shot 1 framing. | Music resolves. Room tone returns. |
| 11 | 1:58–2:00 | End card | Edit | Orbura wordmark on dark. Thesis line + Presage credit + #presagechallenge + repo URL. | Silence, then one soft chord. |

## FLUX generation prompts

Style suffix applied to all human plates: *"cinematic, 35mm film, warm natural window light,
shallow depth of field, quiet domestic morning, photorealistic, muted warm palette"*
Style suffix for signal abstracts: *"abstract, dark background, warm orange and amber light particles,
long-exposure light traces, breathing-paced motion, minimal, cinematic"*

| Beat | Prompt |
|------|--------|
| 1 | "A person seen from behind at a kitchen table in morning light, laptop open, ceramic coffee cup, soft curtains, quiet apartment, cinematic" |
| 2 | "Over-shoulder view of hands near a laptop keyboard, warm morning light, shallow depth of field, coffee steam rising, cinematic" |
| 5 | "Abstract visualization: warm light fragments dissolving at an invisible vertical boundary, clean structured amber particles streaming through to the other side, dark background, long exposure" |
| 9 (transition) | "Luminous amber particles flowing left to right, converging into a tightening horizontal band, dark background, data-stream aesthetic" |
| 10 | "Same person at the same kitchen table, now holding a phone and smiling slightly, afternoon light, warm tones, cinematic, photorealistic" |
| 11 (texture) | "Slow-drifting warm ember particles on near-black background, subtle depth, cinematic, loopable" |

Notes: generate 2–3 variants per beat; pick for hands/faces — reject any with distorted hands or
uncanny faces (profile/over-shoulder angles hide this well). 15s cap → each prompt yields one clip;
shot 1 may need two clips stitched.

## Real capture shot list (what to record)

1. **Consent screen** — full scroll of privacy list, ~15s of footage (trim to 16s).
2. **Scan** — one clean ~50s session: guide lock → breathing trace → pulse/HRV populate → stop.
   Record at 1080p; budget ~2 credits. Have a second take ready (~2 credits) for safety.
3. **Result** — let vitals populate, hold on "one thing to notice" + "Today's one action", tap Save.
   Capture the "See it in Orbura →" reveal (~10s).
4. **Web** — screen-record `/hrv-pull` → Camera check-in panel with the fresh reading + freshness,
   then the trend tooltip showing breathing/pulse. Pre-seed a couple of `device:` check-ins so the
   panel isn't empty for camera-only takes.

Total SmartSpectra budget: ~4–6 credits for captures. ~89 remain after.

## Audio design

- No music until the turn (shot 3). Before that: room tone only — the silence *is* the statement.
- Score: single instrument (felt piano or low strings), breathing-paced, ~60bpm. Enters on the hard cut.
- Sync moment: one soft chime (the product's own haptic energy, translated to audio).
- End card: one sustained chord, then silence.

## Caption / VO script

Voiceover is optional — captions carry the full argument for muted judges. If VO is used, keep it
to three lines (shots 4, 7, 9); everything else is text.

| Beat | Caption text |
|------|--------------|
| 2 | "Health data is either expensive, effortful, or invisible." |
| 4 | "The camera measures. It doesn't record. Nothing leaves this device." |
| 5 | "Frames stay here. Numbers are yours." |
| 7 | "A reading is trivia. An action is health." |
| 9 | "Day 1 is a reading. Day 30 is a baseline." |

## Production checklist

- [ ] Generate FLUX clips (6 prompts × 2–3 variants) — free until Nov 9
- [ ] Record companion captures (consent scroll, one clean scan, result + sync)
- [ ] Screen-record web panel + trend tooltip
- [ ] Assemble in editor: real footage is the spine; FLUX is connective tissue only
- [ ] Export 1080p H.264, ~115s, captions burned in (judges watch muted)
- [ ] DEV post: #presagechallenge, repo link, setup instructions, consent/data-handling disclosure
  (mirror shot 4's privacy claims verbatim — they're literally true)

## Risk notes

- **Generated faces**: keep human plates wide/profile; reject anything uncanny. The product's
  privacy pitch makes *visible* faces in generated footage slightly ironic — obscured angles solve it.
- **Fake-data temptation**: never generate charts, numbers, or UI. All data on screen is real.
- **Length discipline**: if the cut runs long, sacrifice shot 10 (ritual close) before touching
  shots 4–9 — the product beats are the proof.
