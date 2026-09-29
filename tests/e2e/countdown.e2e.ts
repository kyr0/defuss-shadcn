import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E smoke test for the shipped countdown component. The CSS half is
 * checked through the digit columns' computed styles (which column line is in
 * the window, how wide the leading-digit column is); the timer half runs on
 * Playwright's fake clock, so ticking, pausing, finishing and restarting are
 * exact - on the real dist/ files.
 */

const FIXTURE = '/tests/e2e/countdown.e2e-fixture.html';
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

type Api = { setState(n: string, c?: object): void; getState(): { name: string; config: Record<string, unknown> } };

/** The digit a column shows = -translateY / line height; the column width in ch. */
const cols = (page: Page, sel: string) =>
  page.$eval(sel, (span) => {
    const b = getComputedStyle(span, '::before');
    const a = getComputedStyle(span, '::after');
    const em = parseFloat(a.fontSize);
    const ty = (t: string) => Math.round(-parseFloat(t.split(" ")[1] ?? "0") / em) || 0;
    // 1ch of the digit font
    const probe = document.createElement('span');
    probe.style.cssText = `font-size:${em}px;width:1ch;display:inline-block;font-variant-numeric:tabular-nums`;
    span.parentElement!.append(probe);
    const ch = probe.getBoundingClientRect().width;
    probe.remove();
    return { hi: ty(b.translate), lo: ty(a.translate), hiW: Math.round(parseFloat(b.width) / ch), em, height: span.getBoundingClientRect().height, textSize: getComputedStyle(span).fontSize };
  });
const values = (page: Page, sel: string) =>
  page.$$eval(`${sel} [data-unit]`, (spans) =>
    Object.fromEntries(spans.map((s) => [(s as HTMLElement).dataset.unit, [(s as HTMLElement).style.getPropertyValue('--value'), s.textContent]])),
  );
const api = (page: Page, sel: string, fn: string, ...args: unknown[]) =>
  page.$eval(sel, (el, [fn, args]) => (el as unknown as { api: Record<string, (...a: unknown[]) => unknown> }).api[fn as string](...(args as unknown[])), [fn, args] as const);

try {
  const page = await browser.newPage();
  await page.clock.install({ time: new Date('2026-06-01T12:00:00Z') });
  // time only moves when a check advances it (runFor) - real waits for CSS rolls must not tick the timers
  await page.clock.pauseAt(new Date('2026-06-01T12:00:01Z'));
  await page.goto(`${server.url}${FIXTURE}`);

  await check('countdown.js initialized every root (not the .countdowns inside a timer group)', async () => {
    await page.waitForFunction(() => document.querySelectorAll('.countdown[data-init]').length >= 13);
    const r = await page.evaluate(() => ({
      group: document.getElementById('t-group')!.hasAttribute('data-init'),
      inner: document.querySelector('#t-group .countdown')!.hasAttribute('data-init'),
    }));
    assert.ok(r.group); assert.ok(!r.inner);
  });

  await check('CSS: 42 → tens column on line 4, ones on line 2; 1em window, text hidden', async () => {
    const c = await cols(page, '#v42 > span');
    assert.equal(c.hi, 4); assert.equal(c.lo, 2); assert.equal(c.hiW, 1);
    assert.equal(c.em, 36, 'data-size xl = 36px digits');
    assert.equal(c.height, 36, 'one-digit window');
    assert.equal(c.textSize, '0px', 'the fallback text takes no space');
  });

  await check('CSS: 123 → higher column shows 12 (2ch wide), ones 3', async () => {
    const c = await cols(page, '#v123 > span');
    assert.equal(c.hi, 12); assert.equal(c.lo, 3); assert.equal(c.hiW, 2);
  });

  await check('leading zeros: none drops them (0ch), data-digits 2 → 1ch, 3 → 2ch', async () => {
    assert.equal((await cols(page, '#v7 > span')).hiW, 0);
    assert.equal((await cols(page, '#v7-2 > span')).hiW, 1);
    const three = await cols(page, '#v7-3 > span');
    assert.equal(three.hiW, 2); assert.equal(three.hi, 0);
    const content = await page.$eval('#v7-3 > span', (s) => getComputedStyle(s, '::before').content);
    assert.ok(content.startsWith('"00\\a 01'), `padded list (${content.slice(0, 20)})`);
  });

  await check('sizes: sm 14 · md 16 · lg 24 · xl 36 · 2xl 60 · 3xl 96px', async () => {
    const r = await page.evaluate(() => ['s-sm', 's-md', 'v123', 'v42', 's-2xl', 's-3xl'].map((id) => getComputedStyle(document.getElementById(id)!).fontSize));
    assert.deepEqual(r, ['14px', '16px', '24px', '36px', '60px', '96px']);
  });

  await check('speed: the roll lasts 1s by default, 0.4s fast, 1.6s slow; tabular digits', async () => {
    const d = (id: string) => page.$eval(`#${id} > span`, (s) => getComputedStyle(s, '::after').transitionDuration.split(',')[0]);
    assert.equal(await d('v42'), '1s'); assert.equal(await d('fast'), '0.4s'); assert.equal(await d('slow'), '1.6s');
    assert.equal(await page.$eval('#v42', (e) => getComputedStyle(e).fontVariantNumeric), 'tabular-nums');
  });

  await check('digit lists are silent for screen readers (content alt text "")', async () => {
    const c = await page.$eval('#v42 > span', (s) => getComputedStyle(s, '::after').content);
    assert.ok(c.endsWith('/ ""'), c.slice(-12));
  });

  await check("plain api: setState('default', { value }) / { values } write --value + text; bare default restores", async () => {
    await api(page, '#v42', 'setState', 'default', { value: 57 });
    assert.deepEqual(await page.$eval('#v42 > span', (s) => [(s as HTMLElement).style.getPropertyValue('--value'), s.textContent]), ['57', '57']);
    await page.waitForTimeout(1100); // let the 1s roll land
    assert.equal((await cols(page, '#v42 > span')).lo, 7);
    await api(page, '#clock', 'setState', 'default', { values: { hours: 9, seconds: 5 } });
    assert.deepEqual(await values(page, '#clock'), { hours: ['9', '9'], minutes: ['24', '24'], seconds: ['5', '5'] });
    await api(page, '#v42', 'setState', 'default');
    assert.equal(await page.$eval('#v42 > span', (s) => s.textContent), '42');
    await api(page, '#v42', 'setState', 'default', { value: 1500 });
    assert.equal(await page.$eval('#v42 > span', (s) => s.textContent), '999', 'clamped to 999');
  });

  await check('timer group: 90061 s → 1 day 1 h 1 min 1 s, role=timer, spoken label; running', async () => {
    assert.deepEqual(await values(page, '#t-group'), { days: ['1', '1'], hours: ['1', '1'], minutes: ['1', '1'], seconds: ['1', '1'] });
    const r = await page.$eval('#t-group', (el) => ({ role: el.getAttribute('role'), label: el.getAttribute('aria-label'), state: (el as HTMLElement).dataset.stateName }));
    assert.equal(r.role, 'timer'); assert.equal(r.state, 'running');
    assert.ok(/1 day/.test(r.label ?? '') && /1 second/.test(r.label ?? ''), `label: ${r.label}`);
  });

  await check('ticks once a second; the largest present unit absorbs the rest (hours past 24)', async () => {
    await page.clock.runFor(2050);
    assert.deepEqual((await values(page, '#t-group')).seconds, ['59', '59']);
    assert.deepEqual((await values(page, '#t-group')).minutes, ['0', '0']);
    // t-inline: 93784 s, no days span → 26 h 3 min 4 s, minus 2 s
    assert.deepEqual(await values(page, '#t-inline'), { hours: ['26', '26'], minutes: ['3', '3'], seconds: ['2', '2'] });
    assert.equal(await page.$eval('#t-inline', (el) => el.getAttribute('aria-label')), 'Sale ends', 'an author label is kept');
  });

  await check('paused: frozen while time passes; running resumes from there', async () => {
    await api(page, '#t-group', 'setState', 'paused');
    const before = await values(page, '#t-group');
    await page.clock.runFor(5050);
    assert.deepEqual(await values(page, '#t-group'), before);
    assert.equal(((await api(page, '#t-group', 'getState')) as { name: string }).name, 'paused');
    await api(page, '#t-group', 'setState', 'running');
    await page.clock.runFor(1050);
    assert.deepEqual((await values(page, '#t-group')).seconds, ['58', '58']);
  });

  await check('authored data-paused: holds until setState("running", { duration }) starts it', async () => {
    assert.equal(await page.$eval('#t-single', (el) => (el as HTMLElement).dataset.stateName), 'paused');
    assert.deepEqual(await values(page, '#t-single'), { minutes: ['1', '1'], seconds: ['30', '30'] });
    await api(page, '#t-single', 'setState', 'running', { duration: 3 });
    assert.deepEqual(await values(page, '#t-single'), { minutes: ['0', '0'], seconds: ['3', '3'] });
    const s = (await api(page, '#t-single', 'getState')) as { name: string; config: { remaining: number } };
    assert.equal(s.name, 'running'); assert.equal(s.config.remaining, 3);
  });

  await check('finished: at zero every unit reads 0, data-state-name=finished, countdown:finished fires once', async () => {
    await page.$eval('#t-single', (el) => {
      (globalThis as unknown as { __fin: number }).__fin = 0;
      el.addEventListener('countdown:finished', () => (globalThis as unknown as { __fin: number }).__fin++);
    });
    await page.clock.runFor(4050);
    assert.deepEqual(await values(page, '#t-single'), { minutes: ['0', '0'], seconds: ['0', '0'] });
    assert.equal(await page.$eval('#t-single', (el) => (el as HTMLElement).dataset.stateName), 'finished');
    await page.clock.runFor(3050);
    assert.equal(await page.evaluate(() => (globalThis as unknown as { __fin: number }).__fin), 1);
  });

  await check('a data-until in the past is finished on load', async () => {
    assert.equal(await page.$eval('#t-past', (el) => (el as HTMLElement).dataset.stateName), 'finished');
    assert.equal(await page.$eval('#t-past > span', (s) => s.textContent), '0');
  });

  await check("setState('finished') ends early; setState('default') restarts from the authored duration", async () => {
    await api(page, '#t-group', 'setState', 'finished');
    assert.deepEqual((await values(page, '#t-group')).days, ['0', '0']);
    await api(page, '#t-group', 'setState', 'default');
    assert.deepEqual(await values(page, '#t-group'), { days: ['1', '1'], hours: ['1', '1'], minutes: ['1', '1'], seconds: ['1', '1'] });
    assert.equal(await page.$eval('#t-group', (el) => (el as HTMLElement).dataset.stateName), 'running');
  });

  await check('units: muted / primary / outline boxes, uppercase labels', async () => {
    const r = await page.$$eval('#t-group .countdown-unit', (units) => units.map((u) => { const cs = getComputedStyle(u); return [cs.backgroundColor, cs.borderTopWidth, cs.paddingTop]; }));
    assert.notEqual(r[0][0], r[1][0], 'muted vs primary background');
    assert.equal(r[2][1], '1px', 'outline border');
    assert.equal(r[3][2], '0px', 'no variant = no box');
    assert.equal(await page.$eval('#t-group .countdown-label', (l) => getComputedStyle(l).textTransform), 'uppercase');
  });

  await check('state API: unknown names throw; registry globals', async () => {
    const r = await page.evaluate(() => {
      let err = '';
      try { (document.getElementById('v42') as unknown as { api: Api }).api.setState('nope'); } catch (e) { err = String(e); }
      const g = globalThis as unknown as { df$: { shadcn: { countdownApi?: { setState: unknown }; countdownStates?: string[] } } };
      return { err, api: typeof g.df$?.shadcn?.countdownApi?.setState, states: g.df$?.shadcn?.countdownStates };
    });
    assert.ok(r.err.includes('unknown state'), r.err);
    assert.equal(r.api, 'function');
    assert.deepEqual(r.states, ['default', 'running', 'paused', 'finished']);
  });

  await check('prefers-reduced-motion: values change without the roll', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const d = await page.$eval('#v42 > span', (s) => getComputedStyle(s, '::after').transitionProperty);
    assert.equal(d, "none");
    const dur = await page.$eval('#v42 > span', (s) => getComputedStyle(s, '::after').transitionDuration);
    assert.equal(dur, '0s');
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\ncountdown.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('countdown.e2e: all checks passed');
