// Demo capture: drives the Electron app through consent → scan → result → sync
// while recording the renderer via CDP Page.startScreencast to JPEG frames.
// Usage: node scripts/capture-demo.mjs [scanSeconds]
// Output: demo-assets/capture/frames/*.jpg + markers.json
import { _electron as electron } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const scanSeconds = Number(process.argv[2] ?? 50);
const outDir = new URL('../demo-assets/capture/frames/', import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

const markers = [];
const mark = (name) => {
  markers.push({ name, t: Date.now() - t0 });
  console.log(`[marker] ${name} @ ${((Date.now() - t0) / 1000).toFixed(1)}s`);
};

const app = await electron.launch({ args: ['.'], cwd: new URL('..', import.meta.url).pathname });
const win = await app.firstWindow();
win.on('pageerror', (e) => console.log('[pageerror]', e.message));

const t0 = Date.now();
let frameIdx = 0;
let lastFrame = 0;

// Start screencast as early as possible (consent screen)
const client = await win.context().newCDPSession(win);
await client.send('Page.startScreencast', {
  format: 'jpeg',
  quality: 85,
  maxWidth: 1440,
  maxHeight: 900,
  everyNthFrame: 1,
});
client.on('Page.screencastFrame', async (ev) => {
  const { data, sessionId } = ev;
  const now = Date.now();
  if (now - lastFrame >= 66) { // ~15fps cap
    lastFrame = now;
    writeFileSync(join(outDir, `f_${String(frameIdx++).padStart(6, '0')}.jpg`), Buffer.from(data, 'base64'));
  }
  await client.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});

await win.waitForSelector('#btn-consent', { timeout: 20000 });
await win.waitForTimeout(1200);
mark('consent-visible');

// Slow, readable consent scroll for the video
await win.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
await win.waitForTimeout(2500);
await win.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
await win.waitForTimeout(1200);
mark('consent-scrolled');

await win.click('#btn-consent');
await win.waitForSelector('#btn-start', { timeout: 8000 });
mark('scan-visible');
await win.waitForTimeout(2000);

// Pre-flight: wait for face validation before spending credits
let validated = false;
for (let i = 0; i < 30; i++) {
  const v = (await win.textContent('#validation').catch(() => '')) ?? '';
  const guide = await win.evaluate(() => getComputedStyle(document.querySelector('.guide-oval, #guide-oval, .scan-guide') || document.body).borderColor).catch(() => '');
  if (/face|position|hold|good|ready|detected/i.test(v) || /rgb\(74, 222, 128\)|74, 222, 128/.test(guide)) { validated = true; break; }
  await win.waitForTimeout(1000);
}
console.log('[preflight] validation text:', await win.textContent('#validation').catch(() => 'n/a'));
if (!validated) {
  console.log('[preflight] WARN: no clear face-validation signal — continuing anyway (check frames)');
}
mark('face-check');

await win.click('#btn-start');
mark('measurement-started');

// Poll status until Running-ish, then hold for scanSeconds
for (let i = 0; i < 30; i++) {
  const badge = (await win.textContent('#status-badge').catch(() => '')) ?? '';
  if (!/uninitialized|idle|ready|starting/i.test(badge)) { mark(`running:${badge.trim().slice(0, 30)}`); break; }
  await win.waitForTimeout(1000);
}

await win.waitForTimeout(scanSeconds * 1000);
mark('measurement-stopped');
await win.click('#btn-stop').catch(() => {});
await win.waitForTimeout(2500); // teardown + result reveal
mark('result-visible');

// Let vitals populate, then sync
await win.waitForTimeout(1500);
mark('sync-click');
await win.click('#btn-sync').catch(() => {});
await win.waitForTimeout(3000);
mark('sync-done');
await win.waitForTimeout(1500);

writeFileSync(join(outDir, '..', 'markers.json'), JSON.stringify({ t0, markers, frameCount: frameIdx }, null, 2));
await client.send('Page.stopScreencast').catch(() => {});
await app.close();
console.log(`[done] ${frameIdx} frames, markers:`, markers.map(m => m.name).join(' → '));
