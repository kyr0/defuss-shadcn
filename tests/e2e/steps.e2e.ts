import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: steps is CSS-only - the status circle scale (32px default, sm/lg)
 * and the connector line + per-status recolor. Indicator circles are read
 * literally; status colors assert as distinct (theme tokens).
 */
await cssSmoke('steps', [
  {
    label: 'data-variant on the list: nine distinct colors of done + current steps; error = destructive',
    run: async (page) => {
      const r = await page.evaluate(() => ["primary","secondary","accent","info","success","warning","neutral","destructive","error"].map((v) => {
        const done = document.querySelector(`#sc-${v} .step[data-status="complete"] .step-indicator`)!;
        const cur = document.querySelector(`#sc-${v} .step[data-status="current"] .step-indicator`)!;
        const line = getComputedStyle(document.querySelector(`#sc-${v} .step[data-status="complete"]`)!, '::after').backgroundColor;
        return { bg: getComputedStyle(done).backgroundColor, cur: getComputedStyle(cur).borderTopColor, line };
      }));
      const bgs = r.map((x) => x.bg);
      assert.equal(new Set(bgs.slice(0, 8)).size, 8, bgs.join(' | '));
      assert.equal(bgs[8], bgs[7], 'error is an alias of destructive');
      for (const x of r) { assert.equal(x.cur, x.bg, 'current ring = done fill'); assert.equal(x.line, x.bg, 'connector follows'); }
    },
  },
  {
    label: 'data-variant on one .step overrides the list color',
    run: async (page) => {
      const r = await page.evaluate(() => [
        getComputedStyle(document.querySelector('#sc-per-step .step:first-child .step-indicator')!).backgroundColor,
        getComputedStyle(document.querySelector('#sc-per-step-2 .step-indicator')!).backgroundColor,
        getComputedStyle(document.querySelector('#sc-info .step[data-status="complete"] .step-indicator')!).backgroundColor,
        getComputedStyle(document.querySelector('#sc-warning .step[data-status="complete"] .step-indicator')!).backgroundColor,
      ]);
      assert.equal(r[0], r[2], 'list color (info)');
      assert.equal(r[1], r[3], 'step color (warning)');
    },
  },
  {
    label: '.step-icon is a size up (1.5em); plain drops the circle and takes the accent color when current',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const ind = document.querySelector('#si .step-indicator')!;
        const plain = getComputedStyle(document.getElementById('si-plain')!);
        return {
          icon: parseFloat(getComputedStyle(document.getElementById('si-emoji')!).fontSize) / parseFloat(getComputedStyle(ind).fontSize),
          border: plain.borderTopColor, bg: plain.backgroundColor, color: plain.color,
          accent: getComputedStyle(document.querySelector('#sc-primary .step[data-status="current"] .step-indicator')!).color,
          pending: getComputedStyle(document.getElementById('si-plain-pending')!).backgroundColor,
        };
      });
      assert.equal(r.icon, 1.5);
      assert.deepEqual([r.border, r.bg, r.pending], ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)']);
      assert.equal(r.color, r.accent, 'a current plain glyph takes the accent');
    },
  },
  {
    label: 'data-orientation="responsive": a row from 48rem, a column below',
    run: async (page) => {
      const dir = () => page.$eval('#sr', (el) => getComputedStyle(el).flexDirection);
      await page.setViewportSize({ width: 1280, height: 900 });
      assert.equal(await dir(), 'row');
      await page.setViewportSize({ width: 600, height: 900 });
      assert.equal(await dir(), 'column');
      const line = await page.$eval('#sr .step:first-child', (el) => { const a = getComputedStyle(el, '::after'); return [a.width, a.left]; });
      assert.deepEqual(line, ['2px', '15px'], 'a vertical connector under the indicator');
      await page.setViewportSize({ width: 1280, height: 900 });
    },
  },
  {
    label: '.steps is an equal-flex row with no list markers',
    selector: '#st-horizontal',
    css: { display: 'flex', gap: '8px', 'list-style-type': 'none', padding: '0px' },
  },
  {
    label: 'indicator is a 2rem circle; sm/lg scale to 1.5rem/2.5rem (+2px border each side)',
    run: async (page) => {
      // getBoundingClientRect includes the 2px border (content-box sizing)
      const [def, sm, lg] = await page.evaluate(() => [
        document.querySelector('#st-horizontal .step-indicator')!.getBoundingClientRect().width,
        document.querySelector('#st-sm .step-indicator')!.getBoundingClientRect().width,
        document.querySelector('#st-lg .step-indicator')!.getBoundingClientRect().width,
      ]);
      assert.deepEqual([def, sm, lg], [36, 28, 44]);
    },
  },
  {
    label: 'complete vs pending: border AND background recolor (primary pair)',
    run: async (page) => {
      const styles = await page.evaluate(() => ({
        completeBorder: getComputedStyle(document.querySelector('#st-horizontal .step[data-status="complete"] .step-indicator')!).borderTopColor,
        pendingBorder: getComputedStyle(document.querySelector('#st-pending .step-indicator')!).borderTopColor,
        completeBg: getComputedStyle(document.querySelector('#st-horizontal .step[data-status="complete"] .step-indicator')!).backgroundColor,
        pendingBg: getComputedStyle(document.querySelector('#st-pending .step-indicator')!).backgroundColor,
      }));
      assert.notEqual(styles.completeBorder, styles.pendingBorder, 'complete border uses --primary');
      assert.notEqual(styles.completeBg, styles.pendingBg, 'complete fill uses --primary');
    },
  },
  {
    label: 'connector line exists between steps and is 2px tall',
    run: async (page) => {
      const line = await page.evaluate(() => {
        const s = getComputedStyle(document.querySelector('#st-horizontal .step:not(:last-child)')!, '::after');
        return { content: s.content, height: s.height };
      });
      assert.equal(line.content, '""', 'connector is a generated box');
      assert.equal(line.height, '2px');
    },
  },
  {
    label: 'data-orientation="vertical" stacks the rail',
    selector: '#st-vertical',
    css: { 'flex-direction': 'column' },
  },

  { label: 'steps: data-size="xs" geometry', selector: '#z-steps-xs .step-indicator', css: { 'height': '20px' } },
  { label: 'steps: data-size="sm" geometry', selector: '#z-steps-sm .step-indicator', css: { 'height': '24px' } },
  { label: 'steps: data-size="md" geometry', selector: '#z-steps-md .step-indicator', css: { 'height': '32px' } },
  { label: 'steps: data-size="lg" geometry', selector: '#z-steps-lg .step-indicator', css: { 'height': '40px' } },
  { label: 'steps: data-size="xl" geometry', selector: '#z-steps-xl .step-indicator', css: { 'height': '48px' } },
  { label: 'steps: density "compact" → row-gap 6px', selector: '#st-compact .step', css: { 'row-gap': '6px' } },
  { label: 'steps: density "comfortable" → row-gap 8px', selector: '#st-comfortable .step', css: { 'row-gap': '8px' } },
  { label: 'steps: density "spacious" → row-gap 12px', selector: '#st-spacious .step', css: { 'row-gap': '12px' } },

  // steps gained a runtime (steps.ts): the statuses of #st-live are MAPPED from
  // data-active-step (2 → complete, current, none) rather than authored.
  {
    label: 'runtime: data-active-step=2 maps statuses complete/current/none + one aria-current',
    run: async (page) => {
      await page.waitForFunction(() => !!document.querySelector('#st-live[data-init]'));
      const st = await page.$$eval('#st-live .step', (els) => els.map((e) => e.getAttribute('data-status') ?? ''));
      assert.deepEqual(st, ['complete', 'current', ''], 'positional statuses');
      assert.equal(await page.$$eval('#st-live .step[aria-current="step"]', (els) => els.length), 1);
    },
  },
  {
    label: "state API: getState().name === 'default'; errorStep=2 paints the current step destructive",
    run: async (page) => {
      assert.equal(await page.$eval('#st-live', (el) => (el as any).api.getState().name), 'default', "declared state 'default'");
      await page.$eval('#st-live', (el) => (el as any).api.setState('default', { errorStep: 2 }));
      assert.equal(await page.$eval('#st-live .step:nth-child(2)', (el) => el.getAttribute('data-status')), 'error');
    },
  },
  {
    label: 'render(): reproduces the authored markup 1:1 and every state',
    run: async (page) => {
      await assertRenderContract(page, '.steps[id]', ['default']);
    },
  },
]);
void assert;
