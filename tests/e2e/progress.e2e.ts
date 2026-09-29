import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped progress component. The native
 * <progress> restyle (pill geometry, sizes, tones, stripes) plus progress.js:
 * live <output> readouts (percent / fraction / template / indeterminate text,
 * aria-valuetext), the auto tone's data-level, the two-color inside label,
 * the declarative commands (commandfor + command="--…": step jumps, reset,
 * linear play / pause) and the named State API (default / indeterminate /
 * complete, jump vs. timed linear glide, events) - on the real dist/ files.
 */
const FIXTURE = '/tests/e2e/progress.e2e-fixture.html';
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

const val = (page: Page, id: string) => page.$eval(`#${id}`, (el) => (el as HTMLProgressElement).value);
const out = (page: Page, id: string) => page.$eval(`#${id}`, (el) => (el as HTMLOutputElement).value);
const stateName = (page: Page, id: string) => page.$eval(`#${id}`, (el) => (el as any).api.getState().name);

try {
  const page = await browser.newPage();
  await page.goto(`${server.url}${FIXTURE}`);
  await page.waitForFunction(() => document.querySelectorAll('.progress:not([data-init])').length === 0, undefined, { timeout: 5000 });

  await check('.progress is an 8px pill with appearance reset; sizes 4 / 6 / 8 / 12 / 16px', async () => {
    const r = await page.evaluate(() => {
      const s = getComputedStyle(document.getElementById('pg-half')!);
      return { appearance: s.appearance, h: s.height, radius: s.borderTopLeftRadius, sizes: ['xs', 'sm', 'md', 'lg', 'xl'].map((z) => getComputedStyle(document.getElementById(`z-progress-${z}`)!).height) };
    });
    assert.deepEqual(r, { appearance: 'none', h: '8px', radius: '9999px', sizes: ['4px', '6px', '8px', '12px', '16px'] });
  });

  await check('tones: every tone + the custom --progress-color resolve to distinct fills (accent-color mirrors --_fill)', async () => {
    const fills = await page.evaluate(() => ['t-primary', 't-success', 't-warning', 't-info', 't-destructive', 't-custom'].map((id) => getComputedStyle(document.getElementById(id)!).accentColor));
    assert.equal(new Set(fills).size, 6, fills.join(' | '));
    assert.equal(fills[5], 'rgb(200, 0, 200)');
  });

  await check('auto tone: data-level follows the value (low → mid → high) and recolors', async () => {
    const at = async (v: number) => {
      await page.$eval('#t-auto', (el, v) => (el as any).api.setState('default', { value: v }), v);
      return page.$eval('#t-auto', (el) => [el.getAttribute('data-level'), getComputedStyle(el).accentColor]);
    };
    const [low, mid, high] = [await at(20), await at(50), await at(85)];
    assert.deepEqual([low[0], mid[0], high[0]], ['low', 'mid', 'high']);
    assert.equal(new Set([low[1], mid[1], high[1]]).size, 3);
  });

  await check('stripes: data-striped paints bands over the fill (rule ships for both engines)', async () => {
    const css = await page.evaluate(async () => (await fetch('/dist/components/progress/progress.css')).text());
    assert.match(css, /::-webkit-progress-value\s*{[^}]*var\(--_stripes\), var\(--_fill\)/);
    assert.match(css, /::-moz-progress-bar\s*{[^}]*var\(--_stripes\), var\(--_fill\)/);
    assert.match(await page.$eval('#t-striped', (el) => getComputedStyle(el).getPropertyValue('--_stripes')), /repeating-linear-gradient/);
  });

  await check('readouts: percent, fraction "x / n", template, indeterminate text; fraction / template become aria-valuetext', async () => {
    assert.equal(await out(page, 'o-pct'), '66%');
    assert.equal(await out(page, 'o-frac'), '3 / 8');
    assert.equal(await out(page, 'o-tpl'), '12 of 40 files · 30%');
    assert.equal(await out(page, 'o-ind'), 'Waiting…');
    assert.equal(await page.$eval('#f-frac', (el) => el.getAttribute('aria-valuetext')), '3 / 8');
    assert.equal(await page.$eval('#f-pct', (el) => el.getAttribute('aria-valuetext')), null, 'a plain percent needs no valuetext');
  });

  await check('a direct write (bar.value = …) repaints the bound readout too', async () => {
    await page.$eval('#f-pct', (el) => { (el as HTMLProgressElement).value = 12; });
    await page.waitForFunction(() => (document.getElementById('o-pct') as HTMLOutputElement).value === '12%', undefined, { timeout: 2000 });
  });

  await check('inside label: bar 20px tall, output stacked on it, the fill-colored copy clipped to the value (LTR from the left, RTL from the right)', async () => {
    const r = await page.evaluate(() => {
      const bar = document.getElementById('in-bar')!.getBoundingClientRect();
      const o = document.getElementById('in-out')!;
      const ob = o.getBoundingClientRect();
      return {
        h: Math.round(bar.height), stacked: Math.round(ob.top) === Math.round(bar.top) && Math.round(ob.width) === Math.round(bar.width),
        text: o.dataset.text, pct: o.style.getPropertyValue('--progress-pct'),
        clip: getComputedStyle(o, '::after').clipPath,
        rtl: getComputedStyle(document.getElementById('rtl-out')!, '::after').clipPath,
      };
    });
    assert.equal(r.h, 20);
    assert.ok(r.stacked);
    assert.deepEqual([r.text, r.pct], ['45%', '45.00%']);
    assert.equal(r.clip, 'inset(0px 55% 0px 0px)');
    assert.equal(r.rtl, 'inset(0px 0px 0px 60%)');
  });

  await check('commands: --increment / --decrement jump by data-step, --reset empties - no animation in between', async () => {
    await page.click('#b-inc');
    assert.equal(await val(page, 'cmd'), 40, 'jumped at once');
    await page.click('#b-inc');
    await page.click('#b-dec');
    assert.equal(await val(page, 'cmd'), 40);
    assert.equal(await out(page, 'cmd-out'), '40%');
    await page.click('#b-reset');
    assert.equal(await val(page, 'cmd'), 0);
    assert.equal(await stateName(page, 'cmd'), 'default');
  });

  await check('commands: --play glides linearly to max over data-duration (intermediate values, readout per frame), --pause holds it', async () => {
    await page.click('#b-play');
    await page.waitForTimeout(250);
    const mid = await val(page, 'cmd');
    assert.ok(mid > 5 && mid < 95, `mid-glide ${mid}`);
    assert.equal(await out(page, 'cmd-out'), `${Math.round(mid)}%`);
    await page.click('#b-pause');
    const held = await val(page, 'cmd');
    await page.waitForTimeout(200);
    assert.equal(await val(page, 'cmd'), held, 'paused');
    await page.click('#b-play');
    await page.waitForFunction(() => (document.getElementById('cmd') as HTMLProgressElement).value === 100, undefined, { timeout: 2000 });
    assert.equal(await stateName(page, 'cmd'), 'complete');
  });

  await check("state API: setState('default', { value }) jumps; { value, duration } interpolates linearly", async () => {
    await page.$eval('#pg-half', (el) => (el as any).api.setState('default', { value: 20 }));
    assert.equal(await val(page, 'pg-half'), 20);
    await page.$eval('#pg-half', (el) => (el as any).api.setState('default', { value: 80, duration: 600 }));
    await page.waitForTimeout(300);
    const mid = await val(page, 'pg-half');
    assert.ok(mid > 35 && mid < 65, `linear midpoint ~50, got ${mid}`);
    await page.waitForFunction(() => (document.getElementById('pg-half') as HTMLProgressElement).value === 80, undefined, { timeout: 2000 });
  });

  await check("state API: setState('default') with no config restores the authored value", async () => {
    await page.$eval('#pg-half', (el) => (el as any).api.setState('default'));
    assert.equal(await val(page, 'pg-half'), 50);
  });

  await check("state API: setState('indeterminate') removes the value; the readout shows its waiting text", async () => {
    await page.$eval('#f-frac', (el) => (el as any).api.setState('indeterminate'));
    const r = await page.$eval('#f-frac', (el) => [el.hasAttribute('value'), el.matches(':indeterminate'), (el as any).api.getState().name]);
    assert.deepEqual(r, [false, true, 'indeterminate']);
    assert.equal(await out(page, 'o-frac'), '…');
  });

  await check("state API: setState('complete') fills the bar and fires progress:change + progress:completed", async () => {
    const events = await page.$eval('#f-frac', (el) => {
      const seen: string[] = [];
      el.addEventListener('progress:change', () => seen.push('change'));
      el.addEventListener('progress:completed', () => seen.push('complete'));
      (el as any).api.setState('complete');
      return seen;
    });
    assert.deepEqual(events, ['change', 'complete']);
    assert.equal(await out(page, 'o-frac'), '8 / 8');
    assert.equal(await page.$eval('#f-frac', (el) => el.hasAttribute('data-complete')), true);
    assert.equal(await stateName(page, 'f-frac'), 'complete');
  });

  await check('state API: registry globals + unknown state names throw', async () => {
    const r = await page.evaluate(() => {
      const ns = (globalThis as any).df$.shadcn;
      let threw = false;
      try { ns.progressApi.setState(document.getElementById('pg-half'), 'bogus'); } catch { threw = true; }
      return { states: ns.progressStates, threw };
    });
    assert.deepEqual(r, { states: ['default', 'indeterminate', 'complete'], threw: true });
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nprogress.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('progress.e2e: all checks passed');
