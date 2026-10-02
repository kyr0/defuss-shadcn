import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: search-suggestions is a CSS-only website block (Search & Navigation) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('search-suggestions', [
  { label: 'combobox wiring: expanded, controls the listbox, an active descendant', run: async (page) => {
    const r = await page.evaluate(() => { const i = document.getElementById('ss-q')!; return [i.getAttribute('role'), i.getAttribute('aria-expanded'), document.getElementById(i.getAttribute('aria-controls')!)!.getAttribute('role'), document.getElementById(i.getAttribute('aria-activedescendant')!)!.getAttribute('aria-selected')].join(); });
    if (r !== 'combobox,true,listbox,true') throw new Error(r);
  } },
  { label: 'the selected option is highlighted, matches are marks', run: async (page) => {
    const r = await page.evaluate(() => ({ bg: getComputedStyle(document.getElementById('ss-o2')!).backgroundColor !== getComputedStyle(document.getElementById('ss-o3')!).backgroundColor, mark: getComputedStyle(document.querySelector('.mk-search-suggestions-option mark')!).fontWeight }));
    if (!r.bg || r.mark !== '700') throw new Error(JSON.stringify(r));
  } },
  { label: 'native: the input lists a datalist', run: async (page) => {
    const n = await page.evaluate(() => (document.getElementById('ss-n') as HTMLInputElement).list?.options.length);
    if (n !== 5) throw new Error(String(n));
  } },
]);
