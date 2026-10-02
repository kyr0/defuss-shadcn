import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: gallery-item is a CSS-only website block (Media) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('gallery-item', [
  { label: 'the picture is a button that opens the modal viewer (command="show-modal")', run: async (page) => {
    await page.click('.mk-gallery-item:not([data-variant]) .mk-gallery-item-open');
    const open = await page.evaluate(() => (document.getElementById('gi-1') as HTMLDialogElement).matches(':modal'));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const closed = await page.evaluate(() => !(document.getElementById('gi-1') as HTMLDialogElement).open);
    if (!open || !closed) throw new Error(JSON.stringify({ open, closed }));
  } },
  { label: 'the close button closes it (form method=dialog)', run: async (page) => {
    await page.click('.mk-gallery-item:not([data-variant]) .mk-gallery-item-open');
    await page.click('#gi-1 .mk-gallery-item-close');
    await page.waitForTimeout(300);
    const open = await page.evaluate(() => (document.getElementById('gi-1') as HTMLDialogElement).open);
    if (open) throw new Error('still open');
  } },
  { label: 'overlay: caption hidden until hover', run: async (page) => {
    const sel = '.mk-gallery-item[data-variant="overlay"]';
    const before = await page.$eval(`${sel} .mk-gallery-item-caption`, (e) => getComputedStyle(e).opacity);
    await page.hover(sel);
    await page.waitForTimeout(300);
    const after = await page.$eval(`${sel} .mk-gallery-item-caption`, (e) => getComputedStyle(e).opacity);
    if (before !== '0' || after !== '1') throw new Error(JSON.stringify({ before, after }));
  } },
  { label: 'framed: a white print frame, turned', selector: '.mk-gallery-item[data-variant="framed"]', css: { 'background-color': 'rgb(255, 255, 255)', rotate: '-1.5deg' } },
]);
