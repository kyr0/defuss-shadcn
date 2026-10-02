import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: hero is a copy-only CSS block - verify the badge/title/desc/CTA
 * column and the wide-container size steps all apply from hero.css
 * (values at the fixture's wide container: 30rem+ steps).
 */
await cssSmoke('hero', [
  {
    label: 'hero stacks copy (48px base gap), centered column',
    selector: '.mk-hero',
    css: { display: 'flex', 'flex-direction': 'column', gap: '48px' },
  },
  {
    label: 'badge is a pill (border-radius 9999px), 12px text',
    selector: '.mk-hero-badge',
    css: { 'border-radius': '9999px', 'font-size': '12px' },
  },
  {
    label: 'title renders at the wide size step (60px, weight 500)',
    selector: '.mk-hero-title',
    css: { 'font-size': '60px', 'font-weight': '500' },
  },
  {
    label: 'description is 18px muted, balanced wrap off, pretty on',
    selector: '.mk-hero-desc',
    css: { 'font-size': '18px', 'text-wrap': 'pretty' },
  },
  {
    label: 'CTA row is a row (wide step) with 8px gap',
    selector: '.mk-hero-actions',
    css: { 'flex-direction': 'row', gap: '8px' },
  },
  { label: 'split: copy and media side by side', run: async (page) => {
    const r = await page.evaluate(() => { const h = document.querySelector('.mk-hero[data-variant="split"]')!; const c = h.querySelector('.mk-hero-copy')!.getBoundingClientRect(); const m = h.querySelector('.mk-hero-media')!.getBoundingClientRect(); return { display: getComputedStyle(h).display, beside: m.left > c.right - 1, align: getComputedStyle(h.querySelector('.mk-hero-copy')!).textAlign }; });
    if (r.display !== 'grid' || !r.beside || r.align !== 'start') throw new Error(JSON.stringify(r));
  } },
  { label: 'image: white copy over a covering photo and a scrim', run: async (page) => {
    const r = await page.evaluate(() => { const h = document.querySelector('.mk-hero[data-variant="image"]')!; const bg = getComputedStyle(h.querySelector('.mk-hero-bg')!); return { color: getComputedStyle(h).color, pos: bg.position, fit: bg.objectFit, scrim: getComputedStyle(h, '::before').backgroundImage.includes('gradient') }; });
    if (r.color !== 'rgb(255, 255, 255)' || r.pos !== 'absolute' || r.fit !== 'cover' || !r.scrim) throw new Error(JSON.stringify(r));
  } },
  { label: 'glow: gradient-clipped title over a glow and a masked grid', run: async (page) => {
    const r = await page.evaluate(() => { const h = document.querySelector('.mk-hero[data-variant="glow"]')!; return { clip: getComputedStyle(h.querySelector('.mk-hero-title')!).backgroundClip, glow: getComputedStyle(h, '::before').backgroundImage.includes('radial-gradient'), mask: getComputedStyle(h, '::after').maskImage.includes('radial-gradient') }; });
    if (r.clip !== 'text' || !r.glow || !r.mask) throw new Error(JSON.stringify(r));
  } },
  { label: 'pill and proof: a chip link and an avatar group with stars', run: async (page) => {
    const r = await page.evaluate(() => ({ radius: getComputedStyle(document.querySelector('.mk-hero-pill')!).borderTopLeftRadius, avatars: document.querySelectorAll('.mk-hero-proof .avatar').length, stars: document.querySelectorAll('.mk-hero-proof .mk-hero-stars svg').length }));
    if (r.radius !== '999px' || r.avatars !== 4 || r.stars !== 5) throw new Error(JSON.stringify(r));
  } },
  { label: 'signup: start-aligned, the form on one row', run: async (page) => {
    const r = await page.evaluate(() => ({ align: getComputedStyle(document.querySelector('.mk-hero[data-align="start"] .mk-hero-copy')!).textAlign, dir: getComputedStyle(document.querySelector('.mk-hero-form')!).flexDirection }));
    if (r.align !== 'start' || r.dir !== 'row') throw new Error(JSON.stringify(r));
  } },
  { label: 'stage: a framed screenshot with a fade', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-hero-stage')!; return { border: getComputedStyle(s).borderTopWidth, shadow: getComputedStyle(s).boxShadow !== 'none', fade: getComputedStyle(s, '::after').backgroundImage.includes('gradient') }; });
    if (r.border !== '1px' || !r.shadow || !r.fade) throw new Error(JSON.stringify(r));
  } },
]);
