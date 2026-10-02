import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: audio-player is a CSS-only website block (Media) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('audio-player', [
  { label: 'default: cover beside the details, a native audio player', run: async (page) => {
    const r = await page.evaluate(() => { const a = document.querySelector('.mk-audio-player:not([data-variant])')!; return { col: getComputedStyle(a).gridTemplateColumns.split(' ')[0], controls: (a.querySelector('audio') as HTMLAudioElement).controls, pre: a.querySelector('audio')!.getAttribute('preload') }; });
    if (r.col !== '96px' || !r.controls || r.pre !== 'none') throw new Error(JSON.stringify(r));
  } },
  { label: 'download link is labelled with format and size', run: async (page) => {
    const l = await page.evaluate(() => document.querySelector('.mk-audio-player a[download]')!.getAttribute('aria-label'));
    if (!l?.includes('MP3')) throw new Error(String(l));
  } },
  { label: 'compact: one column, title and length on a line', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-audio-player[data-variant="compact"]')!; return { cols: getComputedStyle(c).gridTemplateColumns.split(' ').length, body: getComputedStyle(c.querySelector('.mk-audio-player-body')!).gridTemplateColumns.split(' ').length }; });
    if (r.cols !== 1 || r.body !== 2) throw new Error(JSON.stringify(r));
  } },
  { label: 'podcast: a 24px title, show notes in a details', run: async (page) => {
    const r = await page.evaluate(() => { const p = document.querySelector('.mk-audio-player[data-variant="podcast"]')!; return { size: getComputedStyle(p.querySelector('.mk-audio-player-title')!).fontSize, notes: p.querySelector('details') !== null }; });
    if (r.size !== '24px' || !r.notes) throw new Error(JSON.stringify(r));
  } },
]);
