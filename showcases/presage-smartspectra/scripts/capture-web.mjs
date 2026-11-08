// Records the web-side demo beats in a real browser with the user's session:
// /hrv-pull picker → camera panel → link-code generation.
// Cookies are injected from /tmp/orbura-cookies.json (exported from ego-browser).
// Usage: node scripts/capture-web.mjs
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';

const outDir = new URL('../demo-assets/capture/web/', import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

const raw = JSON.parse(readFileSync('/tmp/orbura-cookies.json', 'utf8'));
const cookies = raw.map((c) => ({
  name: c.name,
  value: c.value,
  domain: c.domain,
  path: c.path || '/',
  httpOnly: !!c.httpOnly,
  secure: c.secure !== false,
  sameSite: c.sameSite === 'Lax' ? 'Lax' : c.sameSite === 'Strict' ? 'Strict' : 'None',
  expires: c.expires > 0 ? c.expires : undefined,
}));

const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: outDir, size: { width: 1440, height: 900 } },
});
await context.addCookies(cookies);
const page = await context.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

await page.goto('https://orbura.famile.xyz/hrv-pull', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

// Slow scroll down the picker to reveal Camera check-in
await page.evaluate(async () => {
  await new Promise((res) => {
    let y = 0;
    const t = setInterval(() => {
      y += 60;
      window.scrollTo(0, y);
      if (y >= document.body.scrollHeight) { clearInterval(t); res(); }
    }, 120);
  });
});
await page.waitForTimeout(1200);

// Click Camera check-in
const camBtn = page.locator('button', { hasText: 'Camera check-in' }).first();
await camBtn.scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await camBtn.click();
await page.waitForTimeout(3000); // panel loads vitals

// Generate a link code
const genBtn = page.locator('button', { hasText: 'Generate a link code' });
if (await genBtn.count()) {
  await genBtn.click();
  await page.waitForTimeout(2500); // token + expiry render
  const codeText = await page.evaluate(() => document.body.innerText.slice(0, 900));
  console.log('AFTER GENERATE:', codeText);
  // copy it for good measure
  const copyBtn = page.locator('button[aria-label="Copy link code"]');
  if (await copyBtn.count()) { await copyBtn.click(); await page.waitForTimeout(1200); }
}
await page.waitForTimeout(4000); // hold on final state

await context.close(); // flushes video
await browser.close();
console.log('web capture done ->', outDir);
