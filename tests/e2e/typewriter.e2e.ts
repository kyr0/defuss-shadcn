import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: the typewriter's promise is a line that types, holds, deletes and
 * cycles - while assistive tech reads the authored strings once and never a
 * keystroke. These checks watch the real timers on the real dist/ files:
 * the typed copy grows and shrinks, the cursor is solid while typing and
 * blinks idle, strings carry their colour, graphemes stay whole, a run
 * without data-loop ends in done, the State API pauses / resumes / finishes,
 * data-trigger waits for the viewport, and reduced motion / no script fall
 * back to whole strings.
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

const url = `${server.url}/tests/e2e/typewriter.e2e-fixture.html`;

try {
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  page.on('pageerror', (e) => {
    failures++;
    console.error(`  ✗ page error: ${e.message}`);
  });
  await page.goto(url);
  await page.waitForSelector('#tw-loop[data-init]');

  const text = (id: string) => page.$eval(`#${id} .typewriter-text`, (e) => e.textContent ?? '');
  const attr = (id: string, a: string) => page.$eval(`#${id}`, (e, n) => e.getAttribute(n), a);
  const cursor = (id: string) => page.$eval(`#${id} .typewriter-cursor`, (e) => {
    const s = getComputedStyle(e);
    return { anim: s.animationName, width: parseFloat(s.width), height: parseFloat(s.height), display: s.display, visibility: s.visibility };
  });

  await check('initialized: sources kept but visually hidden, an aria-hidden line with text + cursor, api bound', async () => {
    const r = await page.evaluate(() => {
      const tw = document.getElementById('tw-loop')!;
      const src = tw.querySelector('.typewriter-source') as HTMLElement;
      return {
        sources: tw.querySelectorAll(':scope > .typewriter-source').length,
        clipped: getComputedStyle(src).position === 'absolute' && src.getBoundingClientRect().width <= 1,
        hidden: tw.querySelector('.typewriter-line')!.getAttribute('aria-hidden'),
        api: typeof (tw as any).api?.setState,
        state: tw.dataset.stateName,
      };
    });
    assert.deepEqual(r, { sources: 3, clipped: true, hidden: 'true', api: 'function', state: 'default' });
  });

  await check('types, holds, deletes and cycles through the strings (data-loop)', async () => {
    const seen = new Set<string>();
    const phases = new Set<string>();
    const indexes = new Set<string>();
    for (let i = 0; i < 120; i++) {
      seen.add(await text('tw-loop'));
      phases.add((await attr('tw-loop', 'data-phase')) ?? '');
      indexes.add((await attr('tw-loop', 'data-index')) ?? '');
      await page.waitForTimeout(15);
    }
    assert.ok(seen.has('design') && seen.has('des'), 'typed through "design"');
    assert.ok(seen.has('red'), 'the next string');
    assert.ok(['typing', 'holding', 'deleting'].every((p) => phases.has(p)), `phases: ${[...phases]}`);
    assert.ok(indexes.has('0') && indexes.has('1'), 'index advances');
  });

  await check('a string carries its colour onto the typed line; graphemes stay whole (👍🏽 is one keystroke)', async () => {
    await page.evaluate(() => (document.getElementById('tw-loop') as any).api.setState('done', { index: 1 }));
    assert.equal(await page.$eval('#tw-loop .typewriter-text', (e) => getComputedStyle(e).color), 'rgb(200, 0, 0)');
    await page.evaluate(() => (document.getElementById('tw-loop') as any).api.setState('default', { index: 2 }));
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) { seen.add(await text('tw-loop')); await page.waitForTimeout(8); }
    assert.ok(seen.has('ok 👍🏽'), 'the full emoji');
    assert.ok(![...seen].some((s) => s.startsWith('ok ') && s.length > 3 && s !== 'ok 👍🏽' && s.includes('👍') && !s.includes('🏽')), 'never half an emoji');
  });

  await check('cursor: solid while typing, blinking idle; block / underscore / none shapes', async () => {
    await page.evaluate(() => (document.getElementById('tw-idle') as any).api.setState('default'));
    await page.waitForTimeout(100);
    assert.equal(await attr('tw-idle', 'data-phase'), 'typing');
    assert.equal((await cursor('tw-loop')).anim !== undefined, true);
    const typingCursor = await page.evaluate(() => {
      const tw = document.getElementById('tw-var')!;
      tw.dataset.phase = 'typing'; // freeze the phase the CSS keys on
      return getComputedStyle(tw.querySelector('.typewriter-cursor')!).animationName;
    });
    assert.equal(typingCursor, 'none', 'solid while typing');
    await page.evaluate(() => (document.getElementById('tw-block') as any).api.setState('paused'));
    assert.equal((await cursor('tw-block')).anim, 'typewriter-blink', 'blinks idle');
    const bar = await cursor('tw-once'), block = await cursor('tw-block'), under = await cursor('tw-under');
    assert.ok(block.width > bar.width * 3, 'block is wide');
    assert.ok(under.height < bar.height / 3, 'underscore is flat');
    assert.equal((await cursor('tw-none')).display, 'none');
  });

  await check('data-cursor-hide="typing" hides the cursor while typing only', async () => {
    await page.evaluate(() => (document.getElementById('tw-idle') as any).api.setState('default'));
    await page.waitForTimeout(250);
    assert.equal(await attr('tw-idle', 'data-phase'), 'typing');
    assert.equal((await cursor('tw-idle')).visibility, 'hidden');
    await page.evaluate(() => (document.getElementById('tw-idle') as any).api.setState('paused'));
    assert.equal((await cursor('tw-idle')).visibility, 'visible');
  });

  await check('without data-loop: types once, ends in done, fires typewriter-done; data-cursor-hide="done" drops the cursor', async () => {
    await page.evaluate(() => {
      (globalThis as any).__done = 0;
      (globalThis as any).__typed = [];
      const tw = document.getElementById('tw-once')!;
      tw.addEventListener('typewriter-done', () => (globalThis as any).__done++);
      tw.addEventListener('typewriter-typed', (e: any) => (globalThis as any).__typed.push(e.detail.text));
      (tw as any).api.setState('default');
    });
    await page.waitForFunction(() => document.getElementById('tw-once')!.dataset.stateName === 'done', null, { timeout: 5000 });
    assert.equal(await text('tw-once'), 'Ship it.');
    assert.equal(await page.evaluate(() => (globalThis as any).__done), 1);
    assert.deepEqual(await page.evaluate(() => (globalThis as any).__typed), ['Ship it.']);
    assert.equal((await cursor('tw-once')).visibility, 'hidden');
  });

  await check('State API: paused freezes mid-word, default resumes, done shows { index } in full, unknown throws', async () => {
    await page.evaluate(() => (document.getElementById('tw-ctl') as any).api.setState('default'));
    await page.waitForTimeout(500);
    await page.evaluate(() => (document.getElementById('tw-ctl') as any).api.setState('paused'));
    const frozen = await text('tw-ctl');
    assert.ok(frozen.length > 0 && frozen.length < 'Pause me mid-word.'.length, `mid-word: "${frozen}"`);
    await page.waitForTimeout(400);
    assert.equal(await text('tw-ctl'), frozen, 'stays frozen');
    assert.equal(await attr('tw-ctl', 'data-state-name'), 'paused');
    await page.evaluate(() => (document.getElementById('tw-ctl') as any).api.setState('default'));
    await page.waitForTimeout(300);
    const resumed = await text('tw-ctl');
    assert.ok(resumed.startsWith(frozen) && resumed.length > frozen.length, `resumed from "${frozen}" to "${resumed}"`);
    await page.evaluate(() => (document.getElementById('tw-ctl') as any).api.setState('done', { index: 2 }));
    assert.equal(await text('tw-ctl'), 'Or finish on me.');
    assert.equal(await attr('tw-ctl', 'data-index'), '2');
    assert.deepEqual(await page.evaluate(() => { const { name, config } = (document.getElementById('tw-ctl') as any).api.getState(); return { name, config }; }), { name: 'done', config: { index: 2 } });
    const threw = await page.evaluate(() => { try { (document.getElementById('tw-ctl') as any).api.setState('nope'); return false; } catch { return true; } });
    assert.equal(threw, true);
  });

  await check('data-reserve: the box is as wide as the longest string from the start', async () => {
    const w = await page.evaluate(() => {
      const tw = document.getElementById('tw-reserve')!;
      (tw as any).api.setState('done', { index: 0 });
      const short = tw.getBoundingClientRect().width;
      (tw as any).api.setState('done', { index: 1 });
      return { short, long: tw.getBoundingClientRect().width };
    });
    assert.ok(w.short > 100 && Math.abs(w.short - w.long) < 1, `width stays ${w.short} / ${w.long}`);
  });

  await check('inside a code mockup: the command types behind the prompt; data-variable still types', async () => {
    await page.waitForFunction(() => document.getElementById('tw-term')!.dataset.stateName === 'done', null, { timeout: 5000 });
    assert.equal(await text('tw-term'), 'npm i defuss-shadcn');
    assert.equal(await page.$eval('#m-term > pre', (e) => getComputedStyle(e, '::before').content), '"$"');
    assert.ok((await text('tw-var')).length > 0);
  });

  await check('data-trigger="visible" waits for the viewport', async () => {
    assert.equal(await text('tw-visible'), '', 'not started off-screen');
    await page.$eval('#tw-visible', (e) => e.scrollIntoView());
    await page.waitForFunction(() => document.getElementById('tw-visible')!.dataset.stateName === 'done', null, { timeout: 5000 });
    assert.equal(await text('tw-visible'), 'seen');
  });

  await check('reduced motion: whole strings, no typing, a still cursor', async () => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    await p.goto(url);
    await p.waitForSelector('#tw-loop[data-init]');
    const seen = new Set<string>();
    for (let i = 0; i < 10; i++) { seen.add(await p.$eval('#tw-loop .typewriter-text', (e) => e.textContent ?? '')); await p.waitForTimeout(20); }
    assert.deepEqual([...seen], ['design'], 'the whole string at once');
    assert.equal(await p.$eval('#tw-block .typewriter-cursor', (e) => getComputedStyle(e).animationName), 'none');
    await ctx.close();
  });

  await check('no script: the first string shows as plain text, the rest stay hidden', async () => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const p = await ctx.newPage();
    await p.goto(url);
    const r = await p.$eval('#tw-loop', (tw) => Array.from(tw.children).map((c) => getComputedStyle(c).display));
    assert.deepEqual(r, ['inline', 'none', 'none']);
    await ctx.close();
  });
  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await assertRenderContract(page, '.typewriter[id]', ['default','paused','done'], { runtimeAttrs: ['data-index','data-phase'], runtimeOwned: '.typewriter-text' });
  });

} finally {
  await browser.close();
  server.stop?.();
}

if (failures) {
  console.error(`\ntypewriter.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('typewriter.e2e: all checks passed');
