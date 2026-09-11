import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: spinner is CSS-only — the rotate keyframes + the four documented
 * sizes are the contract. Verify each size maps to its literal box and that
 * the 1s linear rotation actually runs.
 */
await cssSmoke('spinner', [
  {
    label: 'spinner sizes: xs 10 / sm 14 / default 16 / md 20 / lg 24 / xl 32',
    run: async (page) => {
      // computed `width` (layout box), not getBoundingClientRect().width:
      // the rect INCLUDES the rotation transform, so measuring mid-spin
      // yields the diagonal (16 → up to 22.6 at 45°) and the assert raced
      // the 1s animation. (offsetWidth is undefined on <svg> elements.)
      const sizes = await page.evaluate(() =>
        ['#sp-xs', '#sp-sm', '#sp-default', '#sp-md', '#sp-lg', '#sp-xl'].map(
          (s) => parseFloat(getComputedStyle(document.querySelector(s)!).width),
        ),
      );
      assert.deepEqual(sizes, [10, 14, 16, 20, 24, 32]);
    },
  },
  {
    label: 'spinner runs the 1s linear infinite rotation',
    run: async (page) => {
      const anim = await page.evaluate(() => {
        const el = document.querySelector('#sp-default')!;
        const cs = getComputedStyle(el);
        return {
          name: cs.animationName,
          duration: cs.animationDuration,
          timing: cs.animationTimingFunction,
          running: el.getAnimations().some((a) => a.playState === 'running'),
        };
      });
      assert.equal(anim.name, 'spinner-rotate');
      assert.equal(anim.duration, '1s');
      assert.equal(anim.timing, 'linear');
      assert.equal(anim.running, true, 'rotation is actually playing');
    },
  },
]);
