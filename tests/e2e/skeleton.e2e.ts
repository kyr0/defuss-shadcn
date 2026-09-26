import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: skeleton is CSS-only - the pulse keyframes are its entire purpose.
 * Verify the animation is actually running (Web Animations API sees it) and
 * the round modifier overrides the radius.
 */
await cssSmoke('skeleton', [
  {
    label: '.skeleton runs the 2s infinite pulse animation',
    run: async (page) => {
      const anim = await page.evaluate(() => {
        const el = document.querySelector('#sk-line')!;
        const cs = getComputedStyle(el);
        const running = el.getAnimations().some((a) => a.playState === 'running');
        return { name: cs.animationName, duration: cs.animationDuration, count: cs.animationIterationCount, running };
      });
      assert.equal(anim.name, 'skeleton-pulse');
      assert.equal(anim.duration, '2s');
      assert.equal(anim.count, 'infinite');
      assert.equal(anim.running, true, 'animation is actually playing');
    },
  },
  {
    label: '.skeleton-round overrides the radius to a circle',
    selector: '#sk-round',
    css: { 'border-radius': '9999px' },
  },
]);
