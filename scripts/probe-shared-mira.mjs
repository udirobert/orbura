#!/usr/bin/env node
// Probe the Famile shared Mira memory store from Orbura.
//
// This is the cross-product read contract: Orbura reads a Mira session that
// was started on famile.xyz, proving the shared memory store works across
// products. It does NOT write, and it does NOT touch Orbura's own Drizzle
// Postgres — Orbura's local Mira instance and schema are untouched.
//
// Usage:
//   BASE44_APP_ID=<app-id> node scripts/probe-shared-mira.mjs <session-key>
//
// Exit codes:
//   0 — session found, turns printed
//   1 — session not found (expected if the person never visited famile.xyz)
//   2 — Base44 not configured or unreachable
//
// This script is the submission proof for the Base44 Dev Build-Off: it
// demonstrates that the shared Mira memory store is readable from a sibling
// product repo without any code changes to that repo's own backend.

const BASE44_APP_ID = process.env.BASE44_APP_ID;
const SESSION_KEY = process.argv[2];

if (!BASE44_APP_ID) {
  console.error("BASE44_APP_ID not set. Find it in the Base44 editor URL.");
  process.exit(2);
}
if (!SESSION_KEY) {
  console.error("Usage: node scripts/probe-shared-mira.mjs <session-key>");
  console.error("  Get a session-key from the famile_mira_session cookie");
  console.error("  after visiting https://famile.xyz/ask and asking Mira.");
  process.exit(2);
}

const url = `https://${BASE44_APP_ID}.base44.app/functions/miraHistory?session_key=${encodeURIComponent(SESSION_KEY)}&surface=famile&limit=20`;

try {
  const res = await fetch(url, { method: "GET" });
  if (res.status === 404) {
    console.log("No session found for that key. Visit famile.xyz/ask first.");
    process.exit(1);
  }
  if (!res.ok) {
    console.error(`Base44 returned ${res.status}: ${await res.text()}`);
    process.exit(2);
  }
  const data = await res.json();
  console.log(`Session: ${data.session_id}`);
  console.log(`Surface: ${data.surface}`);
  console.log(`Turns:   ${data.turns.length}`);
  console.log("");
  for (const turn of data.turns) {
    const who = turn.role === "user" ? "you" : "mira";
    const flag = turn.redacted ? " [redacted]" : "";
    console.log(`${who}: ${turn.content}${flag}`);
    if (turn.created_date) {
      console.log(`     (${turn.created_date})`);
    }
    console.log("");
  }
  process.exit(0);
} catch (e) {
  console.error(`Failed to reach Base44: ${e instanceof Error ? e.message : e}`);
  process.exit(2);
}
