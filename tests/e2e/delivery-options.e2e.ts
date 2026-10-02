import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: delivery-options is a CSS-only website block (Shop) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('delivery-options', [
  { label: 'the checked option is highlighted', run: async (page) => {
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-delivery-options-option:has(input:checked)')!).boxShadow !== 'none');
    if (!r) throw new Error('not highlighted');
  } },
  { label: 'clicking a card selects its method', run: async (page) => {
    await page.click('label[for="dl-exp"]');
    const v = await page.evaluate(() => (document.querySelector('.mk-delivery-options:not([data-variant]) input:checked') as HTMLInputElement).value);
    if (v !== 'dl-exp') throw new Error(v);
  } },
  { label: 'grid: cards side by side', run: async (page) => {
    const r = await page.evaluate(() => new Set([...document.querySelectorAll('.mk-delivery-options[data-variant="grid"] .mk-delivery-options-option')].map((e) => Math.round(e.getBoundingClientRect().top))).size);
    if (r !== 1) throw new Error(String(r));
  } },
]);
