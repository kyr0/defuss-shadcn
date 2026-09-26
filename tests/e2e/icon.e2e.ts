import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: icon is CSS-only - [data-lucide] geometry + size scale + the spin
 * animation. Sizes are literal px; spin is verified via the Web Animations
 * API so a silent animation regression fails loudly.
 */
await cssSmoke('icon', [
  {
    label: '[data-lucide] is a centered 16px inline-flex box',
    selector: '#ic-default',
    css: { display: 'inline-flex', 'justify-content': 'center', 'pointer-events': 'none' },
  },
  {
    label: 'size scale xs→xl: 12/14/16/20/24/32',
    run: async (page) => {
      const sizes = await page.evaluate(
        () =>
          ['#ic-xs', '#ic-sm', '#ic-default', '#ic-md', '#ic-lg', '#ic-xl'].map(
            (s) => document.querySelector(s)!.getBoundingClientRect().width,
          ),
      );
      assert.deepEqual(sizes, [12, 14, 16, 20, 24, 32]);
    },
  },
  {
    label: 'data-animate="spin" runs icon-spin 1s linear infinite',
    run: async (page) => {
      const anim = await page.evaluate(() => {
        const el = document.querySelector('#ic-spin')!;
        const cs = getComputedStyle(el);
        return {
          name: cs.animationName,
          timing: cs.animationTimingFunction,
          running: el.getAnimations().some((a) => a.playState === 'running'),
        };
      });
      assert.equal(anim.name, 'icon-spin');
      assert.equal(anim.timing, 'linear');
      assert.equal(anim.running, true, 'spin animation is actually playing');
    },
  },
]);
