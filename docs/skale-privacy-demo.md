# SKALE Programmable Privacy Hackathon — Demo Script (2 minutes)

> **Status:** Technology showcase, not the active product roadmap. Browser-local
> MediaPipe/EZKL remains an optional privacy capability; blockchain is not a
> substitute for consent, clinical evidence, or compliance. See
> [product strategy](./product-strategy.md) and [target architecture](./architecture.md).

## Setup (before recording)

1. Open the app at `bodydebt.app` in Chrome
2. Open DevTools → Network tab set to filter `rpc` or `skalenodes`
3. Open MetaMask/browser wallet on **SKALE Europa Testnet**
4. Have your wallet funded with sFUEL (faucet pre-loaded)
5. Have the [SKALE Explorer](https://juicy-low-small-testnet.explorer.skalenodes.com/) open on a second monitor with the Halo2VerifierReusable contract address `0x01c8C37961eA7548600323A3c4F636c75b7B31d0` ready
6. **Pre-cache the ZK artifacts** by visiting the app once before recording (service worker makes second visit instant)

---

## 0:00–0:15 — The Privacy Problem

**Show:** The landing page (wake-time screen)

**Say:**
> *"Body Debt is a health intelligence app that measures your physiological state using AI — but unlike every other health app, it proves it ran the computation correctly without ever revealing your biometric data. This is programmable privacy in production."*

**Click:** Log a stressor quickly → Continue through intake

---

## 0:15–0:35 — Zero-Knowledge Face Scan

**Show:** The face scan privacy notice

**Say:**
> *"The face scan extracts 468 facial landmarks locally using MediaPipe. From those, we compute 7 stress features — eye fatigue, brow tension, mouth asymmetry. These features are then fed into a neural network that generates a deterministic stress score."*

**Show:** The privacy notice with its **"Processed entirely on your device"** badge

**Say:**
> *"The raw pixel data never leaves this browser tab. Not stored, not uploaded, not logged. The only thing that is produced is a zero-knowledge proof — a cryptographic guarantee that the computation was correct."*

**Click:** Accept privacy → Open camera

**Show:** The persistent privacy badge floating below the header — "Live preview · Not recording" during camera, then "In memory only · Not saved" after capture

**Say:**
> *"Notice the badge — it adapts as we go. Right now it says 'Live preview, not recording.' The camera is a live view, not a recording. After capture, it switches to 'In memory only, not saved.'"*

**Click:** "Capture & Prove" → 3-2-1 countdown → review screen appears with the captured photo

**Show:** The review screen with three options: "Use this photo", "Retake photo", "Delete photo & skip"

**Say:**
> *"After capture, the user gets a review screen. They can retake if it's blurry, or delete the photo entirely — which purges it from memory and exits. The user is in control the whole time. The camera stream stays alive during review, so retake is instant."*

**Click:** "Use this photo" → processing begins

---

## 0:35–1:00 — Proof Circuit Animation + Local Verification

**Show:** The "Photo cleared from memory" confirmation card animates in on the result screen, then the circuit-board proof lifecycle animates through 4 stages

**Say:**
> *"First — see that confirmation? 'Photo cleared from memory.' The image was discarded after measurement. Only the math proof remains. Now watch the circuit board..."*

**Say:**
> *"Watch the circuit board. Four stages: Extract facial features, generate the ZK proof in a Web Worker using EZKL, cryptographically verify the proof locally, then commit the result to SKALE. Everything except the final commit happens inside this browser tab."*

**Show:** Point to step 3 (Cryptographic verification) — the green checkmark and timing

**Say:**
> *"Step three is critical — EZKL's `verify()` function cryptographically checks the proof against the verification key, right here in the browser. If the proof was tampered with, it returns false. This is real cryptographic verification, not a hash comparison. It takes under a second."*

---

## 1:00–1:30 — On-Chain Halo2 Verification

**Show:** The SKALE transaction appears — wallet prompt or "Verified on-chain ✓" badge

**Say:**
> *"Now the interesting part. We also submit the proof to a deployed Halo2VerifierReusable contract on the SKALE Europa testnet. The contract cryptographically verifies the proof on-chain — the same EZKL verification, but running inside the EVM."*

**Show:** The SKALE Explorer link with the transaction hash, then the gas cost display

**Say:**
> *"Each verification costs about 2.2 million gas — or roughly $0.00001 in sFUEL. SKALE's near-zero gas makes real on-chain ZK verification economically viable for the first time. On Ethereum mainnet, this same transaction would cost $50-100."*

**Show:** Point to the lifecycle step 4 detail: "Cryptographic proof verified on-chain ✓"

---

## 1:30–1:45 — The Explorer Proof

**Show:** Click the SKALE Explorer link — open in a new tab

**Say:**
> *"You can verify the transaction yourself on the SKALE Explorer. The contract emits a `HealthCredentialVerified` event — permanent, transparent, auditable. The proof hash is committed on-chain, and the verification key was registered in a prior transaction — `registerVka()` with 157 bytes32 VKA entries."*

**Show:** The explorer page with the contract events visible

**Say:**
> *"The verification key registration cost 720,000 gas — a one-time setup. Every subsequent proof verification is a separate verifiable transaction on SKALE."*

---

## 1:45–1:55 — Gas Cost + Privacy Summary

**Show:** Back to the scan result page, scrolling to show the gas cost section

**Say:**
> *"The complete flow — 7 features extracted, ZK proof generated and verified locally, then cryptographically re-verified on SKALE — costs less than a cent per scan. The user gets privacy guarantees that no other health app provides, and the verification is independently auditable on-chain."*

---

## 1:55–2:00 — Close

**Show:** The "Accept & Continue" button

**Say:**
> *"Body Debt demonstrates that programmable privacy isn't theoretical — it's shipping. Real ZK proofs, real on-chain verification, real self-hosted AI, all protecting user biometric data. This is what privacy-first health intelligence looks like."*

---

## Key talking points for judges

| Topic | One-liner |
|---|---|
| **Why SKALE?** | "Sub-cent on-chain ZK verification. Ethereum would cost $50-100 per proof." |
| **Halo2VerifierReusable** | "Deployed at `0x01c8C3...` — real EZKL verifier, 1,607 lines of Solidity." |
| **Proof lifecycle** | "Extract → Prove → Verify (browser) → Verify (SKALE) — 4-stage pipeline." |
| **Gas costs** | "VKA registration: ~125K gas. Proof verification: ~2.3M gas. Sub-cent total." |
| **Privacy model** | "Raw biometric data never leaves the device. Only the proof and public outputs go on-chain." |
| **Browser verify** | "EZKL's `verify()` runs in the Web Worker — cryptographic certainty without network." |

## Pitfalls to avoid

- ❌ Don't spend time explaining ZK cryptography — say "cryptographic proof" and move on
- ❌ Don't let the wallet prompt hang — pre-confirm the transaction before recording
- ❌ Don't open the explorer link during a paused demo state — click it live
- ✅ Do hover over the gas cost display so the judge reads "$0.00001"
- ✅ Do pause after the circuit animation finishes — let the judge see all 4 green checkmarks
- ✅ Do mention that the ZK artifacts are cached via service worker for instant performance on return visits
