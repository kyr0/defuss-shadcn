import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: contents is a CSS-only website block (Search & Navigation) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('contents', [
  { label: 'rail: the current section lights the line', selector: '.mk-contents:not([data-variant]) a[aria-current]', css: { 'border-left-width': '2px', 'font-weight': '600' } },
  { label: 'boxed: numbered by a counter', run: async (page) => {
    const c = await page.$eval('.mk-contents[data-variant="boxed"] > ol > li > a', (e) => getComputedStyle(e, '::before').content);
    if (!c.startsWith('counter(mk-toc)')) throw new Error(c);
  } },
  { label: 'dropdown: a closed details', run: async (page) => {
    const o = await page.evaluate(() => (document.querySelector('details.mk-contents') as HTMLDetailsElement).open);
    if (o) throw new Error('open');
  } },
]);
