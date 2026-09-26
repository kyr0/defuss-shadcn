import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: statistic is CSS-only - the type scale (muted 13px title, bold 30px
 * value) plus the two hardcoded trend colors (green/red per the token
 * boundary rule - status colors are literals, not tokens).
 */
await cssSmoke('statistic', [
  {
    label: '.statistic is a tight 2px column',
    selector: '#st-demo',
    css: { display: 'flex', 'flex-direction': 'column', gap: '2px' },
  },
  {
    label: 'title 13px/500, value 30px/700, description 12px',
    run: async (page) => {
      const scale = await page.evaluate(() => ({
        title: getComputedStyle(document.querySelector('.statistic-title')!).fontSize,
        value: getComputedStyle(document.querySelector('.statistic-value')!).fontSize,
        valueWeight: getComputedStyle(document.querySelector('.statistic-value')!).fontWeight,
        desc: getComputedStyle(document.querySelector('.statistic-description')!).fontSize,
      }));
      assert.deepEqual(scale, { title: '13px', value: '30px', valueWeight: '700', desc: '12px' });
    },
  },
  {
    label: 'trend up is green #16a34a, down is red #dc2626 (literal status colors)',
    run: async (page) => {
      const [up, down] = await page.evaluate(() => [
        getComputedStyle(document.querySelector('[data-trend="up"]')!).color,
        getComputedStyle(document.querySelector('[data-trend="down"]')!).color,
      ]);
      assert.equal(up, 'rgb(22, 163, 74)');
      assert.equal(down, 'rgb(220, 38, 38)');
    },
  },
]);
