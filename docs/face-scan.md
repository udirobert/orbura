# Face scan reliability

In-browser MediaPipe FaceLandmarker (Tasks Vision) → feature vector → EZKL
worker → optional SKALE anchor. Camera frames and landmarks are never persisted.

**Status (landed):** still-frame confirm, retake detection restart, worker
prefetch filter, softer capture gates + “Capture anyway”, prove timeout, and
manual fallback CTA. MediaPipe migrated from the legacy `@mediapipe/face_mesh`
solution bundle to `@mediapipe/tasks-vision` (ESM, typed, self-hosted
`face_landmarker.task` + WASM under `public/mediapipe/`); the legacy
`onResults`/`send({image})` surface is preserved by `FaceMeshAdapter`, so the
pipeline hook and feature math are unchanged. Context: [progress.md](./progress.md).

## Known failure modes (fixed / guarded)

| Issue | Guard |
| --- | --- |
| Confirm extracted from unmounted `<video>` after review | Extract from offscreen canvas of the accepted still (`capturedFrameRef`) |
| Retake left detection dead (video remount race) | `phase === "camera"` effect waits for `<video>`, then restarts detection loop |
| Prefetch `{ success }` treated as a proof | Worker handler ignores `type === "prefetch-result"`; requires `proof`/`proofHex` |
| Strict lighting/blur/distance bricked Capture | Softened thresholds; after ~6s of face lock, **Capture anyway** |
| MediaPipe WASM never ready | Landmarker creation failure inside `send()` → `mediapipe_error` / manual fallback; warm-up failure is retried on next send |
| Prove hangs forever | 90s prove timeout; clearer analysis error + manual fallback CTA |

## State machine

```text
privacy → prompt → camera ⇄ review → extracting → proving → verifying → result
              ↓         ↓        ↓         ↓
            skip      skip    delete     error → retry | manual fallback | skip
```

## Hard rules

- Never store face images, raw pixels, or full landmark arrays in Zustand.
- Never run EZKL on the main thread — use `src/workers/ezkl-prover.worker.ts`.
- Review phase keeps the camera stream alive for retake; stop tracks only after
  successful landmark extraction (or skip/delete).

## Key files

- `src/components/face-scan/use-face-scan-pipeline.ts`
- `src/components/screens/FaceScanScreen.tsx`
- `src/lib/ai/face-mesh.ts`
- `public/mediapipe/` (self-hosted WASM + assets)
