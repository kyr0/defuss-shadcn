import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: download-item is a CSS-only website block (Docs & Help) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('download-item', [
  { label: 'file badges colored by format', run: async (page) => {
    const r = await page.evaluate(() => ['PDF', 'DMG', 'EXE'].map((e) => getComputedStyle(document.querySelector(`.mk-download-item-file[data-ext="${e}"]`)!).backgroundColor));
    if (r[0] !== 'rgb(220, 38, 38)' || r[2] !== 'rgb(37, 99, 235)') throw new Error(r.join());
  } },
  { label: 'the download link carries format and size', run: async (page) => {
    const r = await page.evaluate(() => { const a = document.querySelector('.mk-download-item > a')!; return a.hasAttribute('download') + '|' + a.getAttribute('aria-label'); });
    if (r !== 'true|Download Acme for macOS (DMG, 148 MB)') throw new Error(r);
  } },
  { label: 'checksum: a closed details with selectable code', run: async (page) => {
    const r = await page.evaluate(() => { const d = document.querySelector('.mk-download-item-checksum') as HTMLDetailsElement; return { open: d.open, sel: getComputedStyle(d.querySelector('code')!).userSelect }; });
    if (r.open || r.sel !== 'all') throw new Error(JSON.stringify(r));
  } },
]);
