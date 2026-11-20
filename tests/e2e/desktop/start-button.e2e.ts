import assert from 'node:assert/strict';
import { cssSmoke } from '../lib/css-smoke.ts';

/**
 * Why: Start Button is CSS-only - a native popovertarget button. These checks verify its geometry, that the icon
 * variant keeps the label for assistive technology only, and that it opens its Start Menu without a script of its
 * own (the menu's runtime sets aria-expanded, which the pressed look follows).
 */
await cssSmoke('start-button', [
  {
    label: 'start-button.css applies its geometry',
    selector: '#sb',
    css: { 'align-items': 'center', height: '40px', 'min-width': '40px', 'font-weight': '600' },
  },
  {
    label: 'the icon variant hides the label visually only',
    selector: '#sb-icon .start-button-label',
    css: { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden' },
  },
  {
    label: 'a click opens the menu (popovertarget), the button turns pressed',
    run: async (page) => {
      const before = await page.$eval('#sb', (b) => getComputedStyle(b).backgroundColor);
      await page.click('#sb');
      assert.equal(await page.$eval('#start', (m) => m.matches(':popover-open')), true);
      await page.waitForFunction(() => document.querySelector('#sb')!.getAttribute('aria-expanded') === 'true');
      await page.mouse.move(0, 0);
      assert.notEqual(await page.$eval('#sb', (b) => getComputedStyle(b).backgroundColor), before);
      await page.keyboard.press('Escape');
    },
  },
]);
