import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: team-member is a CSS-only website block (Company) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('team-member', [
  { label: 'default: a 4:5 portrait with a tag', run: async (page) => {
    const r = await page.evaluate(() => { const m = document.querySelector('.mk-team-member:not([data-variant])')!; return { ar: getComputedStyle(m.querySelector('.mk-team-member-photo')!).aspectRatio, tag: getComputedStyle(m.querySelector('.mk-team-member-tag')!).position }; });
    if (r.ar !== '4 / 5' || r.tag !== 'absolute') throw new Error(JSON.stringify(r));
  } },
  { label: 'default: the links slide in on hover', run: async (page) => {
    const sel = '.mk-team-member:not([data-variant])';
    const before = await page.$eval(`${sel} .mk-team-member-links`, (e) => getComputedStyle(e).opacity);
    await page.hover(sel);
    await page.waitForTimeout(400);
    const after = await page.$eval(`${sel} .mk-team-member-links`, (e) => getComputedStyle(e).opacity);
    if (before !== '0' || after !== '1') throw new Error(JSON.stringify({ before, after }));
  } },
  { label: 'keyboard focus reveals the links too', run: async (page) => {
    await page.mouse.move(0, 0);
    await page.focus('.mk-team-member:nth-child(2) .mk-team-member-links a');
    await page.waitForTimeout(400);
    const o = await page.$eval('.mk-team-member:nth-child(2) .mk-team-member-links', (e) => getComputedStyle(e).opacity);
    if (o !== '1') throw new Error(o);
  } },
  { label: 'horizontal: portrait beside the bio, links shown', run: async (page) => {
    const r = await page.evaluate(() => { const m = document.querySelector('.mk-team-member[data-variant="horizontal"]')!; return { cols: getComputedStyle(m).gridTemplateColumns.split(' ').length, links: getComputedStyle(m.querySelector('.mk-team-member-links')!).opacity }; });
    if (r.cols !== 2 || r.links !== '1') throw new Error(JSON.stringify(r));
  } },
  { label: 'compact: a round 48px portrait, no links', run: async (page) => {
    const r = await page.evaluate(() => { const m = document.querySelector('.mk-team-member[data-variant="compact"]')!; const p = m.querySelector('.mk-team-member-portrait')!; return { w: Math.round(p.getBoundingClientRect().width), radius: getComputedStyle(p).borderTopLeftRadius, links: getComputedStyle(m.querySelector('.mk-team-member-links')!).display }; });
    if (r.w !== 48 || r.radius !== '50%' || r.links !== 'none') throw new Error(JSON.stringify(r));
  } },
  { label: 'every icon link is labelled', run: async (page) => {
    const n = await page.evaluate(() => [...document.querySelectorAll('.mk-team-member-links a')].filter((a) => !a.getAttribute('aria-label')).length);
    if (n) throw new Error(`${n} unlabelled`);
  } },
]);
