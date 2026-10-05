import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: a session's whole job is where the scroll goes. These checks drive the
 * real dist/ files: it opens where it says (end / start / last anchor), follows
 * the live edge only while the reader is there, lets go when they scroll up and
 * shows the way back, keeps the visible row still when history prepends,
 * anchors a data-anchor turn near the top, follows a streaming reply (aria-busy),
 * tracks the current turn, and turns dropped files into an event. Reduced motion
 * makes every programmatic scroll instant, so positions are exact.
 */

const server = startServer();
const browser = await chromium.launch();
let failures = 0;

const check = async (label: string, fn: () => Promise<void>): Promise<void> => {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${label}\n    ${err instanceof Error ? err.message : err}`);
  }
};

try {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 1400 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => {
    failures++;
    console.error(`  ✗ page error: ${e.message}`);
  });
  await page.goto(`${server.url}/tests/e2e/session.e2e-fixture.html`);
  await page.waitForSelector('#s1[data-init]');
  await page.waitForTimeout(150);

  const vp = (id: string) => `#${id} > .session-viewport`;
  const fromEnd = (id: string) => page.$eval(vp(id), (v) => Math.round(v.scrollHeight - v.scrollTop - v.clientHeight));
  const top = (id: string) => page.$eval(vp(id), (v) => Math.round(v.scrollTop));
  const state = (id: string) => page.$eval(`#${id}`, (s) => (s as HTMLElement).dataset.stateName);
  const attr = (sel: string, a: string) => page.$eval(sel, (e, n) => e.getAttribute(n), a);
  const settle = () => page.waitForTimeout(120);
  const append = (id: string, text: string, anchor = false) =>
    page.evaluate(([i, t, a]) => (globalThis as any).df$.shadcn.session.append(i, `<div class="message"><div class="message-content"><div class="bubble"><div class="bubble-content">${t}</div></div></div></div>`, { id: t, anchor: a }), [id, text, anchor] as const);

  await check('init: labelled focusable region around a role="log" transcript; opens at the end, following', async () => {
    const r = await page.evaluate(() => {
      const v = document.querySelector('#s1 > .session-viewport')!, c = document.getElementById('s1-content')!;
      return [v.getAttribute('role'), v.getAttribute('aria-label'), (v as HTMLElement).tabIndex, c.getAttribute('role'), c.getAttribute('aria-relevant'), typeof (document.getElementById('s1') as any).api?.setState];
    });
    assert.deepEqual(r, ['region', 'Messages', 0, 'log', 'additions', 'function']);
    assert.ok(await fromEnd('s1') <= 1, 'at the end');
    assert.equal(await state('s1'), 'default');
    assert.equal(await attr('#s1', 'data-stick'), '');
    assert.equal(await attr('#s1', 'data-scrollable'), 'start');
    assert.equal(await page.$eval('#s1-end', (b) => (b as HTMLElement).inert), true, 'nothing below: the end button is inert');
    assert.equal(await page.$eval('#s1-start', (b) => getComputedStyle(b).visibility), 'visible', 'something above: the start button shows');
  });

  await check('rows skip rendering off screen but do not clip what draws outside them (bubble tails, reactions)', async () => {
    const r = await page.$eval('#s1 .session-item', (i) => { const cs = getComputedStyle(i); return [cs.contentVisibility, cs.overflowClipMargin]; });
    assert.deepEqual(r, ['auto', '16px']);
  });

  await check('the reader scrolls up: it lets go (detached) and the end button appears', async () => {
    await page.$eval(vp('s1'), (v) => { v.scrollTop = 100; });
    await settle();
    assert.equal(await state('s1'), 'detached');
    assert.equal(await attr('#s1', 'data-stick'), null);
    assert.equal(await page.$eval('#s1-end', (b) => [(b as HTMLElement).inert, getComputedStyle(b).visibility, b.getAttribute('data-active')].join()), 'false,visible,true');
  });

  await check('while detached a new message does not pull the reader down; the end button brings them back and it follows again', async () => {
    const before = await top('s1');
    await append('s1', 'new-while-reading');
    await settle();
    assert.equal(await top('s1'), before, 'the reader stays put');
    await page.click('#s1-end');
    await settle();
    assert.ok(await fromEnd('s1') <= 1, 'back at the end');
    assert.equal(await state('s1'), 'default');
    await append('s1', 'followed');
    await settle();
    assert.ok(await fromEnd('s1') <= 1, 'follows the new message');
  });

  await check('history prepends above: the visible row does not move', async () => {
    await page.$eval(vp('s1'), (v) => { v.scrollTop = 200; });
    await settle();
    const probe = () => page.evaluate(() => {
      const v = document.querySelector('#s1 > .session-viewport')!.getBoundingClientRect();
      const it = [...document.querySelectorAll('#s1-content > .session-item')].find((e) => e.getBoundingClientRect().top >= v.top)!;
      return { id: (it as HTMLElement).dataset.messageId, y: Math.round(it.getBoundingClientRect().top - v.top) };
    });
    const before = await probe();
    await page.evaluate(() => (globalThis as any).df$.shadcn.session.prepend('s1', ['<div>old 1</div>', '<div>old 2</div>', '<div>old 3</div>']));
    await settle();
    const after = await page.evaluate((id) => {
      const v = document.querySelector('#s1 > .session-viewport')!.getBoundingClientRect();
      return Math.round(document.querySelector(`#s1-content > [data-message-id="${id}"]`)!.getBoundingClientRect().top - v.top);
    }, before.id);
    assert.ok(Math.abs(after - before.y) <= 1, `${before.id} stayed at ${before.y}px (now ${after}px)`);
    assert.equal(await page.$eval('#s1-content', (c) => c.firstElementChild!.textContent), 'old 1');
  });

  await check('a data-anchor turn settles near the top with a peek, instead of following to the end', async () => {
    await page.evaluate(() => (globalThis as any).df$.shadcn.session.scrollToEnd('s1', { smooth: false }));
    await settle();
    await append('s1', 'anchored-q', true);
    await settle();
    const r = await page.evaluate(() => {
      const v = document.querySelector('#s1 > .session-viewport') as HTMLElement;
      const it = document.querySelector('#s1-content > [data-message-id="anchored-q"]') as HTMLElement;
      return { top: Math.round(v.scrollTop), want: it.offsetTop - 48, max: v.scrollHeight - v.clientHeight };
    });
    // the session reserves room under the turn, so it reaches its spot even
    // with nothing below it yet
    assert.equal(r.top, r.want, `scrollTop ${r.top} - wanted ${r.want} (max ${r.max})`);
    assert.equal(await state('s1'), 'detached');
    const pad = await page.$eval('#s1-content', (c) => parseFloat((c as HTMLElement).style.paddingBlockEnd) || 0);
    assert.ok(pad > 0, 'anchor space reserved');
    // the reply grows past the window: the reserved room shrinks to nothing
    await page.evaluate(() => (globalThis as any).df$.shadcn.session.append('s1', '<div style="height:400px">long reply</div>'));
    await settle();
    assert.equal(await page.$eval('#s1-content', (c) => (c as HTMLElement).style.paddingBlockEnd), '', 'no space once the reply fills the window');
  });

  await check('streaming: aria-busy on the log; a growing reply keeps the end in view; default ends it', async () => {
    await page.evaluate(() => (globalThis as any).df$.shadcn.session.scrollToEnd('s1', { smooth: false }));
    await settle();
    const reply = 'reply-stream';
    await append('s1', reply);
    await page.evaluate(() => (document.getElementById('s1') as any).api.setState('streaming'));
    assert.equal(await attr('#s1-content', 'aria-busy'), 'true');
    for (let i = 0; i < 6; i++) {
      await page.evaluate((id) => {
        const b = document.querySelector(`#s1-content > [data-message-id="${id}"] .bubble-content`)!;
        b.textContent += ' more words that make the reply grow line after line';
      }, reply);
      await page.waitForTimeout(60);
    }
    assert.ok(await fromEnd('s1') <= 1, 'followed the growing reply');
    assert.equal(await state('s1'), 'streaming');
    await page.evaluate(() => (document.getElementById('s1') as any).api.setState('default'));
    assert.equal(await attr('#s1-content', 'aria-busy'), null);
    assert.equal(await state('s1'), 'default');
  });

  await check('State API: detached { to: "start" } / { to: id }, isAtEnd, scrollToMessage, unknown throws', async () => {
    await page.evaluate(() => (document.getElementById('s1') as any).api.setState('detached', { to: 'start' }));
    await settle();
    assert.equal(await top('s1'), 0);
    assert.deepEqual(await page.evaluate(() => { const { name, config } = (document.getElementById('s1') as any).api.getState(); return { name, config }; }), { name: 'detached', config: { to: 'start' } });
    assert.equal(await page.evaluate(() => (globalThis as any).df$.shadcn.session.isAtEnd('s1')), false);
    const ok = await page.evaluate(() => (globalThis as any).df$.shadcn.session.scrollToMessage('s1', 'a10', { smooth: false }));
    await settle();
    const r = await page.evaluate(() => [Math.round((document.querySelector('#s1 > .session-viewport') as HTMLElement).scrollTop), (document.querySelector('[data-message-id="a10"]') as HTMLElement).offsetTop - 48]);
    assert.equal(ok, true);
    assert.equal(r[0], r[1]);
    const threw = await page.evaluate(() => { try { (document.getElementById('s1') as any).api.setState('nope'); return false; } catch { return true; } });
    assert.equal(threw, true);
  });

  await check('opening positions: data-default-position="start" at the top, "last-anchor" at the last anchored turn', async () => {
    assert.equal(await top('s2'), 0);
    assert.equal(await state('s2'), 'detached');
    const r = await page.evaluate(() => {
      const v = document.querySelector('#s3 > .session-viewport') as HTMLElement;
      const last = [...document.querySelectorAll('#s3 [data-anchor]')].pop() as HTMLElement;
      return [Math.round(v.scrollTop), Math.min(last.offsetTop - 48, v.scrollHeight - v.clientHeight)];
    });
    assert.equal(r[0], r[1]);
  });

  await check('data-track: session-visibility names the current turn and the visible rows; data-current marks it', async () => {
    const detail = await page.evaluate(() => new Promise<any>((resolve) => {
      const s = document.getElementById('s3')!;
      s.addEventListener('session-visibility', (e: any) => resolve(e.detail), { once: true });
      (s.querySelector('.session-viewport') as HTMLElement).scrollTop = 0;
    }));
    assert.equal(detail.currentAnchorId, 'c1');
    assert.ok(detail.visibleMessageIds.includes('c1'));
    assert.equal(await attr('#s3 [data-message-id="c1"]', 'data-current'), '');
  });

  await check('data-drop: dragging files shows the overlay; dropping fires session-drop with the accepted files only', async () => {
    const r = await page.evaluate(() => {
      const s = document.getElementById('s4')!;
      const dt = new DataTransfer();
      dt.items.add(new File(['x'], 'photo.png', { type: 'image/png' }));
      dt.items.add(new File(['y'], 'notes.txt', { type: 'text/plain' }));
      let got: string[] = [];
      s.addEventListener('session-drop', (e: any) => { got = e.detail.files.map((f: File) => f.name); });
      const target = s.querySelector('.bubble-content')!;
      target.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: dt }));
      const overlay = getComputedStyle(s, '::after').content;
      const active = s.hasAttribute('data-drop-active');
      target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
      return { overlay, active, after: s.hasAttribute('data-drop-active'), got };
    });
    assert.deepEqual(r, { overlay: '"Drop images"', active: true, after: false, got: ['photo.png'] });
  });

  await check('footer and status: the composer sits under the transcript; the status line is quiet', async () => {
    const r = await page.evaluate(() => {
      const v = document.querySelector('#s1 > .session-viewport')!.getBoundingClientRect();
      const f = document.querySelector('#s1 > .session-footer')!.getBoundingClientRect();
      return { below: f.top >= v.bottom - 1, status: getComputedStyle(document.getElementById('s2-status')!).fontSize };
    });
    assert.deepEqual(r, { below: true, status: '12px' });
  });
  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await assertRenderContract(page, '.session[id]', ['default','detached','streaming'], { runtimeAttrs: ['data-pending-scroll','data-autoscrolling','style','data-stick'] });
  });

} finally {
  await browser.close();
  server.stop?.();
}

if (failures) {
  console.error(`\nsession.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('session.e2e: all checks passed');
