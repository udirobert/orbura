// Metered smoke test: launches the Electron app, starts a ~40s measurement
// (≈1.3 credits), reads the vitals readouts, stops, and exits.
// Usage: node scripts/smoke-electron.mjs [seconds]
import { _electron as electron } from 'playwright';

const seconds = Number(process.argv[2] ?? 40);

const app = await electron.launch({
  args: ['.'],
  cwd: new URL('..', import.meta.url).pathname,
  env: { ...process.env },
});
app.process().stdout?.on('data', (d) => process.stdout.write(`[main] ${d}`));
app.process().stderr?.on('data', (d) => process.stdout.write(`[main:err] ${d}`));
const win = await app.firstWindow();
win.on('console', (m) => console.log(`[renderer:${m.type()}]`, m.text()));
win.on('pageerror', (e) => console.log('[pageerror]', e.message));

await win.waitForSelector('#btn-start', { timeout: 20000 });
await win.waitForTimeout(2500); // let the renderer SDK + camera settle
await win.click('#btn-start');
console.log(`[smoke] measuring for ${seconds}s…`);

// wait until the status badge leaves its pre-start state
for (let i = 0; i < 30; i++) {
  const badge = (await win.textContent('#status-badge').catch(() => '')) ?? '';
  if (!/uninitialized|idle|ready/i.test(badge)) { console.log('[smoke] status:', badge.trim()); break; }
  await win.waitForTimeout(1000);
}

await win.waitForTimeout(seconds * 1000);

const read = async (id) => (await win.textContent(id).catch(() => '—'))?.trim();
console.log('[smoke] pulse:', await read('#readout-pulse'), 'BPM');
console.log('[smoke] breathing:', await read('#readout-breathing'), 'BR/min');
console.log('[smoke] validation:', await read('#validation'));
console.log('[smoke] error banner:', await win.isVisible('#error-banner').catch(() => false));

await win.click('#btn-stop').catch(() => {});
await app.close();
console.log('[smoke] done');
