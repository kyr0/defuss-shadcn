import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ENTRANCES } from '../../src/shared/motion.js';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: motion is CSS-only - the shipped contract is motion.css itself (the JS
 * controller is pinned in tests/motion.test.ts). This verifies every direction
 * maps to the right animation-name pair with the right composition, the var
 * surface defaults + cascades, the stagger grader, the draw dash rule, and the
 * reduced-motion flattening - plus the CSS↔vocabulary sync (every ENTRANCES
 * name ships a rule; the same check the unit test runs on src, run here on
 * dist so a stale build fails).
 */

// contract sync against the BUILT file (dist is what consumers copy)
{
  const cssSrc = readFileSync('dist/components/motion/motion.css', 'utf8');
  const missing = ENTRANCES.filter((d) => !cssSrc.includes(`[data-df-entrance="${d}"]`));
  assert.deepEqual(missing, [], `motion.css lacks rule(s): ${missing.join(', ')}`);
  console.log('  ✓ CSS↔vocabulary sync (every ENTRANCES name has a rule in dist)');
}

await cssSmoke('motion', [
  // every transform-channel direction: [direction, fade] pair, add composition
  ...ENTRANCES.filter((d) => !['wipe', 'wipe-up', 'iris', 'fade'].includes(d)).map((d) => ({
    label: `data-df-entrance="${d}" → df-enter-${d} + fade (composed add/replace)`,
    selector: `#e-${d}`,
    css: {
      'animation-name': new RegExp(`^df-enter-${d}, df-enter-fade$`),
      'animation-composition': 'add, replace',
      // Chromium dedupes identical list entries when serializing the shorthand
      'animation-fill-mode': 'both',
    },
  })),

  {
    label: 'clip-path directions run their clip keyframes alone (no fade needed)',
    selector: '#e-wipe',
    css: { 'animation-name': 'df-enter-wipe', 'animation-composition': 'replace' },
  },
  { label: 'wipe-up animation', selector: '#e-wipe-up', css: { 'animation-name': 'df-enter-wipe-up' } },
  { label: 'iris animation', selector: '#e-iris', css: { 'animation-name': 'df-enter-iris' } },
  { label: 'fade animation', selector: '#e-fade', css: { 'animation-name': 'df-enter-fade' } },

  {
    label: 'timing defaults from the var surface (1500ms, out curve, both fill)',
    selector: '#e-up',
    css: {
      'animation-duration': '1.5s',
      'animation-delay': '0s',
      'animation-timing-function': 'cubic-bezier(0.16, 1, 0.3, 1)',
    },
  },
  {
    label: 'ancestor vars cascade into the entrance (duration/ease override)',
    selector: '#tuned-child',
    css: { 'animation-duration': '2.5s', 'animation-timing-function': 'linear' },
  },
  {
    label: 'stagger grades children 0/120/240/360ms',
    run: async (page) => {
      const ms = await page.evaluate(() =>
        Array.from(document.querySelectorAll('#stag > li')).map(
          (el) => Math.round(parseFloat(getComputedStyle(el).animationDelay) * 1000),
        ),
      );
      assert.deepEqual(ms, [0, 120, 240, 360]);
    },
  },
  {
    label: 'draw-in: dash rule applies and settles to 0 (declarative load-run)',
    run: async (page) => {
      // the attribute runs the entrance on load - sample mid-flight only for
      // the RULE (dasharray normalized to pathLength=1), then wait to settle
      const got = await page.evaluate(() => {
        const p = document.querySelector('#draw-1')!;
        const cs = getComputedStyle(p);
        return { dasharray: cs.strokeDasharray, name: cs.animationName };
      });
      assert.equal(got.name, 'df-draw');
      assert.equal(parseFloat(got.dasharray), 1, 'dasharray = pathLength (1) → geometry-independent');
      await page.waitForFunction(
        () => parseFloat(getComputedStyle(document.querySelector('#draw-1')!).strokeDashoffset) < 0.02,
        undefined,
        { timeout: 6000 },
      );
    },
  },
  {
    label: 'draw-in honors the --df-motion-duration override',
    run: async (page) => {
      const dur = await page.$eval('#draw-2', (el) => getComputedStyle(el).animationDuration);
      assert.equal(dur, '2s');
    },
  },
  {
    label: 'reduced-motion flattens every entrance/draw to ~1ms',
    run: async (page) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const vals = await page.evaluate(() =>
        [document.querySelector('#e-up')!, document.querySelector('#draw-1')!].map(
          (el) => parseFloat(getComputedStyle(el).animationDuration),
        ),
      );
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      for (const v of vals) assert.ok(v > 0 && v <= 0.002, `expected ~1ms, got ${v}s`);
    },
  },
]);
