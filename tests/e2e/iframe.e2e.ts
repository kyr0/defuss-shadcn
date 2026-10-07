import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: the iframe component promises a size that fits where it lives and a
 * message bridge that only its own frames, from allowed origins, can use.
 * This drives the shipped files: the three fits, a same-origin page measured
 * and followed as it grows, the handshake that recovers a cross-origin
 * frame's first height report, messages both ways, the library child mode,
 * an opaque (sandboxed) origin accepted only when data-origins lists null,
 * the load state through the State API, and the render contract.
 */

const FIXTURE = '/tests/e2e/iframe.e2e-fixture.html';
const server = startServer();
const browser = await chromium.launch();
let failures = 0;
async function check(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${label}\n    ${err instanceof Error ? err.message : err}`);
  }
}
const frameHeight = (page: Page, id: string) => page.$eval(`#${id} .iframe-frame`, (f) => Math.round(f.getBoundingClientRect().height));
/** the framed page of a title - through its element, never by frame order */
const innerFrame = async (page: Page, title: string) => (await (await page.$(`iframe[title="${title}"]`))!.contentFrame())!;

try {
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  page.setDefaultTimeout(10_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // every iframe-message and iframe-resize the page hears, recorded before the components init
  await page.addInitScript(() => {
    const log: { type: string; id: string; detail: unknown }[] = [];
    (globalThis as unknown as { __iframeLog: typeof log }).__iframeLog = log;
    for (const type of ['iframe-message', 'iframe-resize']) document.addEventListener(type, (e) => log.push({ type, id: (e.target as HTMLElement).id, detail: (e as CustomEvent).detail }));
  });
  await page.goto(`${server.url}${FIXTURE}`);
  await page.waitForFunction(() => document.querySelectorAll('.iframe[data-init][data-loaded]').length === 8);
  const log = () => page.evaluate(() => (globalThis as unknown as { __iframeLog: { type: string; id: string; detail: any }[] }).__iframeLog);

  await check('every figure initializes, binds the State API and reaches loaded on the load event', async () => {
    const r = await page.$$eval('.iframe', (els) => els.map((el) => [el.id, (el as any).api?.getState().name]));
    assert.ok(r.every(([, name]) => name === 'loaded'), JSON.stringify(r));
  });

  await check('fit by ratio: the container width, a 16:9 height (--iframe-ratio)', async () => {
    const r = await page.$eval('#if-ratio .iframe-frame', (f) => { const b = f.getBoundingClientRect(); return { w: b.width, h: b.height }; });
    assert.ok(Math.abs(r.h - (r.w * 9) / 16) <= 1, JSON.stringify(r));
  });

  await check('fit the container: the frame takes the height of the element it lives in', async () => {
    assert.equal(await frameHeight(page, 'if-container'), 300);
  });

  await check('fit the content (same origin): measured, then followed as the framed page grows', async () => {
    await page.waitForFunction(() => document.querySelector('#if-content .iframe-frame')!.getBoundingClientRect().height > 200);
    const before = await frameHeight(page, 'if-content');
    await (await innerFrame(page, 'Growing page')).click('#more');
    await page.waitForFunction((b) => document.querySelector('#if-content .iframe-frame')!.getBoundingClientRect().height >= b + 99, before);
    const resized = (await log()).filter((e) => e.type === 'iframe-resize' && e.id === 'if-content').map((e) => e.detail.height);
    assert.ok(resized.length >= 2 && resized.at(-1) - resized[0] >= 99, JSON.stringify(resized));
  });

  await check('the framed page controls the host: iframe-message with name, detail and origin', async () => {
    await (await innerFrame(page, 'Bridge page')).click('#pick');
    await page.waitForFunction(() => (globalThis as any).__iframeLog.some((e: any) => e.type === 'iframe-message' && e.id === 'if-bridge'));
    const m = (await log()).find((e) => e.type === 'iframe-message' && e.id === 'if-bridge')!;
    assert.deepEqual(m.detail, { name: 'select', detail: { id: 'M' }, origin: new URL(server.url).origin });
  });

  await check('the host posts into the frame: df$.shadcn.iframe.post', async () => {
    const ok = await page.evaluate(() => (globalThis as any).df$.shadcn.iframe.post('#if-bridge', 'dark', { on: true }));
    assert.equal(ok, true);
    await (await innerFrame(page, 'Bridge page')).waitForFunction(() => document.body.dataset.dark === 'true');
  });

  await check('library child mode: data-iframe-child reports the height, df$.shadcn.iframe.send reaches the host', async () => {
    const child = await innerFrame(page, 'Library child page');
    await child.waitForFunction(() => typeof (globalThis as any).df$?.shadcn?.iframe?.send === 'function');
    await child.click('#send');
    await page.waitForFunction(() => (globalThis as any).__iframeLog.some((e: any) => e.type === 'iframe-message' && e.id === 'if-child'));
    const m = (await log()).find((e) => e.type === 'iframe-message' && e.id === 'if-child')!;
    assert.deepEqual([m.detail.name, m.detail.detail], ['hi', { n: 1 }]);
    assert.ok((await frameHeight(page, 'if-child')) >= 180);
  });

  await check('an opaque origin listed in data-origins: its height arrives (hello handshake) and its message is accepted', async () => {
    await page.waitForFunction(() => document.querySelector('#if-opaque .iframe-frame')!.getBoundingClientRect().height >= 220);
    await page.waitForFunction(() => (globalThis as any).__iframeLog.some((e: any) => e.type === 'iframe-message' && e.id === 'if-opaque'));
    const m = (await log()).find((e) => e.type === 'iframe-message' && e.id === 'if-opaque')!;
    assert.deepEqual([m.detail.name, m.detail.origin], ['ping', 'null']);
  });

  await check('an origin not listed is ignored: no message, no height', async () => {
    await page.waitForTimeout(600);
    assert.equal((await log()).filter((e) => e.id === 'if-rejected').length, 0);
    // the minimum (8rem) plus the 1px border on both sides - border-box
    assert.equal(await frameHeight(page, 'if-rejected'), 130);
  });

  await check('bare variant: no border, no radius', async () => {
    const r = await page.$eval('#if-bare .iframe-frame', (f) => { const cs = getComputedStyle(f); return [cs.borderTopWidth, cs.borderTopLeftRadius]; });
    assert.deepEqual(r, ['0px', '0px']);
  });

  await check('states: setState default / loaded write data-loaded, the shimmer only before loaded', async () => {
    const r = await page.evaluate(() => {
      const el = document.getElementById('if-ratio') as any;
      const frame = el.querySelector('.iframe-frame');
      el.api.setState('default');
      const d = [el.hasAttribute('data-loaded'), el.api.getState().name, getComputedStyle(frame).animationName];
      el.api.setState('loaded');
      const l = [el.hasAttribute('data-loaded'), el.api.getState().name, getComputedStyle(frame).animationName];
      return { d, l };
    });
    assert.deepEqual(r, { d: [false, 'default', 'iframe-shimmer'], l: [true, 'loaded', 'none'] });
  });

  await check('reduced motion: no shimmer, no height transition', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const r = await page.evaluate(() => {
      const el = document.getElementById('if-ratio') as any;
      el.api.setState('default');
      const cs = getComputedStyle(el.querySelector('.iframe-frame'));
      const out = [cs.animationName, getComputedStyle(document.querySelector('#if-content .iframe-frame')!).transitionDuration];
      el.api.setState('loaded');
      return out;
    });
    await page.emulateMedia({ reducedMotion: null });
    assert.deepEqual(r, ['none', '0s']);
  });

  await check('no page error', async () => {
    assert.deepEqual(errors, []);
  });

  await check('render(): the model is the authored markup; render(state) equals setState(state) on the live element', async () => {
    await assertRenderContract(page, '.iframe[id]', ['default', 'loaded'], { runtimeAttrs: ['style'] });
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\niframe.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('iframe.e2e: all checks passed');
