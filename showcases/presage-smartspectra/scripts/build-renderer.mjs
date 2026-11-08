#!/usr/bin/env node
// Bundles renderer.js with the Presage API key injected at build time.
// Key source order: SMARTSPECTRA_API_KEY env → .smartspectra-key file.
// The key is a build-time define — it never appears in committed source.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadKey() {
  if (process.env.SMARTSPECTRA_API_KEY) return process.env.SMARTSPECTRA_API_KEY.trim();
  const keyFile = join(root, '.smartspectra-key');
  if (existsSync(keyFile)) return readFileSync(keyFile, 'utf8').trim();
  return null;
}

const apiKey = loadKey();
if (!apiKey) {
  console.warn('[build] No API key found (.smartspectra-key or SMARTSPECTRA_API_KEY) — bundle will use the placeholder.');
}

const defineArgs = apiKey ? [`--define:__SS_API_KEY__=${JSON.stringify(apiKey)}`] : [];

execFileSync('esbuild', [
  'renderer.js',
  '--bundle',
  '--outfile=dist/renderer.bundle.js',
  '--platform=browser',
  '--format=iife',
  '--log-level=warning',
  ...defineArgs,
], { cwd: root, stdio: 'inherit' });
