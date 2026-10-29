// playwright from node_modules, or the global install used in the Claude sandbox (override with PLAYWRIGHT_ESM)
let chromium; try { ({ chromium } = await import('playwright')); } catch (_) { ({ chromium } = await import(process.env.PLAYWRIGHT_ESM || '/opt/node22/lib/node_modules/playwright/index.mjs')); }
import { spawn } from 'node:child_process';
export const SP = process.env.SHOTS || '/tmp';   // where screenshots go
import { fileURLToPath } from 'node:url'; import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let srv;
export async function start(launch = {}) { srv = spawn('python3', ['-m', 'http.server', String(process.env.PORT || 8123)], { cwd: ROOT, stdio: 'ignore' }); await new Promise(r => setTimeout(r, 700)); return await chromium.launch(launch); }
export function stop(b) { b.close(); srv.kill(); }
export async function newPage(browser, w, h, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: false, ...opts });
  // a headless window that went fullscreen (safe mode asks for it on the first tap) cannot be resized any more, so the tests turn it off
  if (!opts.fullscreen) await ctx.addInitScript(() => { Element.prototype.requestFullscreen = function () { return Promise.resolve(); }; });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto('http://localhost:' + (process.env.PORT || 8123) + '/index.html'); await page.waitForTimeout(400);
  page.errs = errs; return page;
}
export async function login(page, { gender = 'girl', age = 4 } = {}) {
  if (await page.$('#setup:not(.hidden)')) {
    await page.click('.name-btn >> nth=0');
    if (gender) await page.click(`#gender-pick .seg-btn >> text=${gender === 'girl' ? 'Girl' : 'Boy'}`);
    if (age) await page.click(`#age-pick .seg-btn >> text="${age}"`);
    await page.click('#setup-go'); await page.waitForTimeout(300);
    if (await page.$('#vintro:not(.hidden)')) await page.click('#vintro .btn.quiet');
  } else { await page.click('.who-tile >> nth=0'); }
  await page.waitForTimeout(400);
}
export async function openGame(page, name) {
  await page.evaluate(n => document.querySelector(`.card[aria-label="${n}"], .shopfront[aria-label="${n}"]`).dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true })), name);
  await page.waitForTimeout(600);
}
