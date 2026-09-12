import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: steps is CSS-only — the status circle scale (32px default, sm/lg)
 * and the connector line + per-status recolor. Indicator circles are read
 * literally; status colors assert as distinct (theme tokens).
 */
await cssSmoke('steps', [
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
]);
