import { cssSmoke } from '../lib/css-smoke.ts';

/**
 * Why: speaker-item is a CSS-only website block (Events & Promotions) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('speaker-item', [
  { label: 'default: a square grayscale portrait, color on hover', run: async (page) => {
    const sel = '.mk-speaker-item:not([data-variant])';
    const before = await page.$eval(`${sel} .mk-speaker-item-photo`, (e) => getComputedStyle(e).filter);
    await page.hover(sel);
    await page.waitForTimeout(400);
    const after = await page.$eval(`${sel} .mk-speaker-item-photo`, (e) => getComputedStyle(e).filter);
    if (!before.includes('grayscale') || after !== 'none') throw new Error(JSON.stringify({ before, after }));
  } },
  { label: 'featured: portrait beside the bio, a 28px name', run: async (page) => {
    const r = await page.evaluate(() => { const f = document.querySelector('.mk-speaker-item[data-variant="featured"]')!; return { size: getComputedStyle(f.querySelector('.mk-speaker-item-name')!).fontSize, beside: f.querySelector('.mk-speaker-item-body')!.getBoundingClientRect().left > f.querySelector('.mk-speaker-item-photo')!.getBoundingClientRect().right }; });
    if (r.size !== '28px' || !r.beside) throw new Error(JSON.stringify(r));
  } },
  { label: 'overlay: the portrait fills a 3:4 card; the talk and the links appear on hover', run: async (page) => {
    const sel = '.mk-speaker-item[data-variant="overlay"]';
    const read = () => page.$eval(sel, (c) => ({ ratio: getComputedStyle(c).aspectRatio, photo: getComputedStyle(c.querySelector('.mk-speaker-item-photo')!).position, color: getComputedStyle(c).color, talk: getComputedStyle(c.querySelector('.mk-speaker-item-talk')!).opacity, links: getComputedStyle(c.querySelector('.mk-speaker-item-social')!).opacity }));
    const before = await read();
    await page.hover(sel);
    await page.waitForTimeout(400);
    const after = await read();
    if (before.ratio !== '3 / 4' || before.photo !== 'absolute' || before.color !== 'rgb(255, 255, 255)' || before.talk !== '0' || after.talk !== '1' || after.links !== '1') throw new Error(JSON.stringify({ before, after }));
  } },
  { label: 'tags are pills, social links are 32px round icon links named by aria-label', run: async (page) => {
    const r = await page.$eval('.mk-speaker-item[data-variant="overlay"]', (c) => { const tag = c.querySelector('.mk-speaker-item-tags li')!; const a = c.querySelector('.mk-speaker-item-social a')!; return { pill: getComputedStyle(tag).borderTopLeftRadius, w: getComputedStyle(a).width, label: a.getAttribute('aria-label') }; });
    if (r.pill !== '999px' || r.w !== '32px' || !r.label?.includes(' on ')) throw new Error(JSON.stringify(r));
  } },
  { label: 'compact: a round 56px portrait', selector: '.mk-speaker-item[data-variant="compact"] .mk-speaker-item-photo', css: { width: '56px', 'border-top-left-radius': '50%' } },
]);
