#!/usr/bin/env node

/**
 * Trim unnecessary platform-specific prebuilds from node_modules after install.
 *
 * @qvac/sdk bundles native prebuilds for 6+ platforms (darwin-arm64, darwin-x64,
 * linux-x64, linux-arm64, win32-x64, etc). We only need darwin-arm64 on this
 * machine, so we remove the rest from every @qvac/* package that has prebuilds.
 *
 * Also removes truly unused transitive deps (bare-ffmpeg, react-native-bare-kit,
 * hermes-compiler, bare-runtime-darwin-x64) that are not referenced by the SDK.
 *
 * IMPORTANT: Do NOT remove the @qvac/* packages themselves — the SDK's bare
 * runtime eagerly imports ALL plugin packages at startup even if you only use
 * the LLM completion plugin. See plugins at:
 *   node_modules/@qvac/sdk/dist/server/bare/plugins/
 *
 * Called automatically via the "postinstall" script in package.json.
 * Safe to run repeatedly — idempotent.
 */

import { rmSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const NM = join(ROOT, "node_modules");

/**
 * Trim prebuilds in a @qvac/* package to keep only OUR_PLATFORM.
 * Returns number of directories removed, or 0 if nothing to trim.
 *
 * Platform defaults to process.platform + process.arch (e.g. darwin-arm64,
 * linux-x64). Override with TRIM_PLATFORM env var on servers where the
 * dev machine and deploy target differ — e.g. `TRIM_PLATFORM=linux-x64
 * bun install --production` on a Hetzner deploy that runs linux-x64.
 */
function detectPlatform() {
  if (process.env.TRIM_PLATFORM) return process.env.TRIM_PLATFORM;
  const arch = process.arch === "x64" ? "x64" : "arm64";
  return `${process.platform}-${arch}`;
}

const OUR_PLATFORM = detectPlatform();

let saved = 0;

/**
 * Trim prebuilds in a @qvac/* package to keep only OUR_PLATFORM.
 * Returns number of directories removed, or 0 if nothing to trim.
 */
function trimPrebuilds(pkg) {
  const prebuildsDir = join(NM, pkg, "prebuilds");
  if (!existsSync(prebuildsDir)) return 0;

  let count = 0;
  for (const platform of readdirSync(prebuildsDir)) {
    if (platform !== OUR_PLATFORM) {
      const target = join(prebuildsDir, platform);
      rmSync(target, { recursive: true, force: true });
      count++;
    }
  }
  return count;
}

// 1. Trim non-arm64 prebuilds from every @qvac/* ML package (~1.5 GB)
//    The packages themselves must be kept — SDK bare runtime imports them eagerly.
const qvacPackagesWithPrebuilds = [
  "@qvac/llm-llamacpp",
  "@qvac/embed-llamacpp",
  "@qvac/translation-nmtcpp",
  "@qvac/vla-ggml",
  "@qvac/diffusion-cpp",
  "@qvac/transcription-whispercpp",
  "@qvac/transcription-parakeet",
  "@qvac/tts-ggml",
  "@qvac/ocr-onnx",
  "@qvac/classification-ggml",
];

for (const pkg of qvacPackagesWithPrebuilds) {
  saved += trimPrebuilds(pkg);
}

// 2. Unnecessary large packages (~400 MB)
//    These are NOT imported by the SDK's plugin system.
//    Note: bare-ffmpeg is kept because @qvac/decoder-audio imports it.
const unnecessary = [
  "react-native-bare-kit", // mobile only
  "bare-runtime-darwin-x64", // we're arm64
  "hermes-compiler",        // React Native JS engine — not used server-side
];

for (const pkg of unnecessary) {
  if (existsSync(join(NM, pkg))) {
    rmSync(join(NM, pkg), { recursive: true, force: true });
    saved++;
  }
}

if (saved > 0) {
  console.log(`[trim] Removed ${saved} unused prebuild packages from node_modules`);
} else {
  console.log("[trim] Already clean");
}
