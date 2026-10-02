import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: video-player is a CSS-only website block (Media) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('video-player', [
  { label: 'a native video with controls and a default captions track', run: async (page) => {
    const r = await page.evaluate(() => { const v = document.getElementById('vp-1') as HTMLVideoElement; const t = v.querySelector('track')!; return { controls: v.controls, kind: t.kind, def: t.default, ar: getComputedStyle(v).aspectRatio }; });
    if (!r.controls || r.kind !== 'captions' || !r.def || r.ar !== '16 / 9') throw new Error(JSON.stringify(r));
  } },
  { label: 'theater: a dark band with white text', selector: '.mk-video-player[data-variant="theater"]', css: { color: 'rgb(255, 255, 255)', 'padding-top': '32px' } },
  { label: 'transcript: beside the video, scrollable', run: async (page) => {
    const r = await page.evaluate(() => { const l = document.querySelector('.mk-video-player[data-variant="transcript"] .mk-video-player-layout')!; return { cols: getComputedStyle(l).gridTemplateColumns.split(' ').length, ov: getComputedStyle(l.querySelector('.mk-video-player-transcript')!).overflowY }; });
    if (r.cols !== 2 || r.ov !== 'auto') throw new Error(JSON.stringify(r));
  } },
]);
