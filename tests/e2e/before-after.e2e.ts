import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: before-after is a CSS-only website block (Media) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('before-after', [
  { label: 'slider: the after picture is clipped at --mk-ba-pos (50%)', run: async (page) => {
    const r = await page.evaluate(() => { const f = document.querySelector('.mk-before-after:not([data-variant])')!; return { clip: getComputedStyle(f.querySelector('.mk-before-after-after')!).clipPath, range: (f.querySelector('.mk-before-after-range') as HTMLInputElement).type }; });
    if (r.clip !== 'inset(0px 0px 0px 50%)' || r.range !== 'range') throw new Error(JSON.stringify(r));
  } },
  { label: 'moving the divider changes the clip', run: async (page) => {
    await page.evaluate(() => (document.querySelector('.mk-before-after:not([data-variant])') as HTMLElement).style.setProperty('--mk-ba-pos', '20%'));
    const c = await page.$eval('.mk-before-after:not([data-variant]) .mk-before-after-after', (e) => getComputedStyle(e).clipPath);
    if (c !== 'inset(0px 0px 0px 20%)') throw new Error(c);
  } },
  { label: 'toggle: the switch reveals the after picture (CSS-only)', run: async (page) => {
    await page.click('label[for="ba-toggle"]');
    await page.waitForTimeout(700);
    const c = await page.$eval('.mk-before-after[data-variant="toggle"] .mk-before-after-after', (e) => getComputedStyle(e).clipPath);
    if (c !== 'inset(0px)') throw new Error(c);
  } },
  { label: 'split: two pictures side by side', run: async (page) => {
    const r = await page.evaluate(() => { const d = document.querySelectorAll('.mk-before-after[data-variant="split"] .mk-before-after-stage > div'); return Math.round(d[0].getBoundingClientRect().top) === Math.round(d[1].getBoundingClientRect().top); });
    if (!r) throw new Error('stacked');
  } },
]);
