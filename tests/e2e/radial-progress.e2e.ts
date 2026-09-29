import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: the ring is CSS (the stylesheet plus the public custom properties);
 * radial-progress.js adds tones' auto level, labels, the State API, step
 * jumps vs. a linear glide and the button commands - both halves are tested. This asserts the geometry those
 * properties produce (diameter per data-size, the private @property copy that
 * makes --value tween - without registering --value itself), that the ring is actually painted as a
 * masked conic-gradient, and that the four documented variants resolve to
 * genuinely distinct token colors (theme-agnostic distinctness, not literal
 * oklch values).
 */
await cssSmoke('radial-progress', [
  {
    label: 'radial-progress.js initialized every ring (data-init) and derived --value from aria-valuenow',
    run: async (page) => {
      await page.waitForFunction(() => document.querySelectorAll('.radial-progress:not([data-init])').length === 0, undefined, { timeout: 5000 });
      assert.equal(await page.$eval('#l-pct', (el) => (el as HTMLElement).style.getPropertyValue('--value')), '38');
    },
  },
  {
    label: 'base geometry: 5rem inline-grid disc, centered content',
    selector: '#rp-default',
    css: {
      display: 'inline-grid',
      width: '80px',
      height: '80px',
      'border-radius': '9999px',
      'box-sizing': 'content-box',
    },
  },
  {
    label: 'the public --value feeds the registered private --_rp-value (a typed <number>)',
    selector: '#rp-default',
    css: { '--value': '70', '--_rp-value': '70' },
  },
  {
    label: 'without --value the ring reads 0',
    selector: '#rp-unset',
    css: { '--_rp-value': '0' },
  },
  {
    label: 'no global @property --value: a foreign --value keeps its own type (countdown, consumer code)',
    selector: '#foreign',
    css: { '--value': '5px' },
  },
  {
    label: 'a new --value tweens the ring (600ms) - no JS animation',
    run: async (page) => {
      await page.$eval('#rp-tween', (el) => (el as HTMLElement).style.setProperty('--value', '100'));
      await page.waitForTimeout(200);
      const mid = Number(await page.$eval('#rp-tween', (el) => getComputedStyle(el).getPropertyValue('--_rp-value')));
      assert.ok(mid > 0 && mid < 100, `mid-tween value ${mid}`);
      await page.waitForTimeout(700);
      assert.equal(await page.$eval('#rp-tween', (el) => getComputedStyle(el).getPropertyValue('--_rp-value')), '100');
    },
  },
  {
    label: 'the ring is a masked conic-gradient, not an SVG or border trick',
    run: async (page) => {
      const [bg, mask] = await page.$eval('#rp-default', (el) => {
        const s = getComputedStyle(el, '::before');
        return [s.backgroundImage, s.maskImage || s.webkitMaskImage];
      });
      assert.match(bg, /conic-gradient/, 'arc layer');
      assert.match(bg, /radial-gradient/, 'start-cap dot layer');
      assert.match(mask, /radial-gradient/, 'ring mask');
    },
  },
  {
    label: 'the leading cap tracks --value (0% at top, 25% at right)',
    run: async (page) => {
      const capLeft = (sel: string) =>
        page.$eval(sel, (el) => getComputedStyle(el, '::after').insetInlineStart);
      // r = (80 - 8) / 2 = 36 ; cap box is 8px, so left = 40 + 36*cos(a) - 4
      assert.equal(await capLeft('#rp-v0'), '36px'); // -90deg → cos = 0
      assert.equal(await capLeft('#rp-v25'), '72px'); // 0deg → cos = 1
    },
  },
  {
    label: 'data-size sets the documented diameters',
    run: async (page) => {
      const box = (sel: string) =>
        page.$eval(sel, (el) => {
          const s = getComputedStyle(el);
          return `${s.width}/${s.height}/${s.fontSize}`;
        });
      assert.equal(await box('#rp-sm'), '56px/56px/12px');
      assert.equal(await box('#rp-lg'), '128px/128px/20px');
    },
  },
  {
    label: 'custom --size / --thickness override the defaults',
    selector: '#rp-custom',
    css: { width: '192px', height: '192px' },
  },
  {
    label: 'all four variants carry distinct arc colors',
    distinct: [
      { selector: '#rp-variant-default', prop: 'color' },
      { selector: '#rp-secondary', prop: 'color' },
      { selector: '#rp-destructive', prop: 'color' },
      { selector: '#rp-success', prop: 'color' },
    ],
  },
  {
    label: 'the arc color is also the label color (one declaration recolors both)',
    run: async (page) => {
      const [own, cap] = await page.$eval('#rp-destructive', (el) => [
        getComputedStyle(el).color,
        getComputedStyle(el, '::after').backgroundColor,
      ]);
      assert.equal(cap, own, 'currentColor cap');
    },
  },
  {
    label: 'tones: success / warning / info / destructive / --progress-color are distinct arc colors; auto follows the value',
    run: async (page) => {
      const colors = await page.evaluate(() => ['t-success', 't-warning', 't-info', 't-destructive', 't-custom'].map((id) => getComputedStyle(document.getElementById(id)!).color));
      assert.equal(new Set(colors).size, 5, colors.join(' | '));
      assert.equal(colors[4], 'rgb(200, 0, 200)');
      const at = async (v: number) => {
        await page.$eval('#t-auto', (el, v) => (el as any).api.setState('default', { value: v }), v);
        return page.$eval('#t-auto', (el) => [el.getAttribute('data-level'), getComputedStyle(el).color]);
      };
      const r = [await at(20), await at(50), await at(85)];
      assert.deepEqual(r.map((x) => x[0]), ['low', 'mid', 'high']);
      assert.equal(new Set(r.map((x) => x[1])).size, 3);
    },
  },
  {
    label: 'labels: percent, fraction, template, value + caption slot; markup inside (an icon) is left alone; fraction / template become aria-valuetext',
    run: async (page) => {
      const r = await page.evaluate(() => ({
        pct: document.getElementById('l-pct')!.textContent,
        frac: document.getElementById('rp-fraction')!.textContent,
        fracText: document.getElementById('rp-fraction')!.getAttribute('aria-valuetext'),
        tpl: document.getElementById('l-tpl')!.textContent,
        cap: [document.getElementById('l-cap-v')!.textContent, document.getElementById('l-cap-c')!.textContent],
        icon: !!document.getElementById('l-icon-i'),
      }));
      assert.deepEqual(r, { pct: '38%', frac: '7 / 10', fracText: '7 / 10', tpl: '7 km', cap: ['4 / 5', 'workouts'], icon: true });
    },
  },
  {
    label: 'indeterminate: no aria-valuenow - a quarter arc spins, the cap hides, the label shows its waiting text',
    run: async (page) => {
      const r = await page.$eval('#ind', (el) => ({ spin: getComputedStyle(el, '::before').animationName, cap: getComputedStyle(el, '::after').display, text: el.textContent, state: (el as any).api.getState().name }));
      assert.deepEqual(r, { spin: 'radial-progress-spin', cap: 'none', text: 'Waiting', state: 'indeterminate' });
    },
  },
  {
    label: 'commands: --increment / --decrement jump by data-step, --reset empties; --play glides linearly (arc + number per frame), --pause holds',
    run: async (page) => {
      const v = (sel: string) => page.$eval(sel, (el) => Number(el.getAttribute('aria-valuenow')));
      await page.click('#b-inc');
      assert.equal(await v('#cmd'), 40);
      await page.click('#b-dec');
      await page.click('#b-dec');
      assert.equal(await v('#cmd'), 20);
      assert.equal(await page.$eval('#cmd', (el) => el.textContent), '20%');
      await page.click('#b-reset');
      assert.equal(await v('#cmd'), 0);
      await page.click('#b-play');
      await page.waitForTimeout(250);
      const r = await page.$eval('#cmd', (el) => ({ v: Number(el.getAttribute('aria-valuenow')), arc: el.style.getPropertyValue('--value'), running: el.hasAttribute('data-running'), transition: getComputedStyle(el).transitionProperty }));
      assert.ok(r.v > 5 && r.v < 95, `mid-glide ${r.v}`);
      assert.equal(Number(r.arc), r.v, 'the arc follows the value frame by frame');
      assert.deepEqual([r.running, r.transition], [true, 'none'], 'no CSS easing on top of the scripted glide');
      await page.click('#b-pause');
      const held = await v('#cmd');
      await page.waitForTimeout(200);
      assert.equal(await v('#cmd'), held);
      await page.click('#b-play');
      await page.waitForFunction(() => document.getElementById('cmd')!.getAttribute('aria-valuenow') === '100', undefined, { timeout: 2000 });
      assert.equal(await page.$eval('#cmd', (el) => (el as any).api.getState().name), 'complete');
    },
  },
  {
    label: "state API: jump, linear { value, duration }, 'indeterminate', 'complete' (+ events), authored restore, unknown names throw",
    run: async (page) => {
      const v = (sel: string) => page.$eval(sel, (el) => Number(el.getAttribute('aria-valuenow')));
      await page.$eval('#l-pct', (el) => (el as any).api.setState('default', { value: 20 }));
      assert.equal(await v('#l-pct'), 20);
      await page.$eval('#l-pct', (el) => (el as any).api.setState('default', { value: 80, duration: 600 }));
      await page.waitForTimeout(300);
      const mid = await v('#l-pct');
      assert.ok(mid > 35 && mid < 65, `linear midpoint ~50, got ${mid}`);
      await page.waitForFunction(() => document.getElementById('l-pct')!.getAttribute('aria-valuenow') === '80', undefined, { timeout: 2000 });
      await page.$eval('#l-pct', (el) => (el as any).api.setState('default'));
      assert.equal(await v('#l-pct'), 38, 'authored value restored');
      await page.$eval('#l-pct', (el) => (el as any).api.setState('indeterminate'));
      assert.equal(await page.$eval('#l-pct', (el) => [el.hasAttribute('aria-valuenow'), (el as any).api.getState().name].join()), 'false,indeterminate');
      const events = await page.$eval('#l-pct', (el) => {
        const seen: string[] = [];
        el.addEventListener('progress:change', () => seen.push('change'));
        el.addEventListener('progress:completed', () => seen.push('completed'));
        (el as any).api.setState('complete');
        return seen;
      });
      assert.deepEqual(events, ['change', 'completed']);
      assert.equal(await page.$eval('#l-pct', (el) => el.textContent), '100%');
      const r = await page.evaluate(() => {
        const ns = (globalThis as any).df$.shadcn;
        let threw = false;
        try { ns.radialProgressApi.setState(document.getElementById('l-pct'), 'bogus'); } catch { threw = true; }
        return { states: ns.radialProgressStates, threw };
      });
      assert.deepEqual(r, { states: ['default', 'indeterminate', 'complete'], threw: true });
    },
  },
  {
    label: 'a direct aria-valuenow write repaints arc and label',
    run: async (page) => {
      await page.$eval('#rp-v50', (el) => el.setAttribute('aria-valuenow', '65'));
      await page.waitForFunction(() => document.getElementById('rp-v50')!.textContent === '65%', undefined, { timeout: 2000 });
      assert.equal(await page.$eval('#rp-v50', (el) => (el as HTMLElement).style.getPropertyValue('--value')), '65');
    },
  },
]);
