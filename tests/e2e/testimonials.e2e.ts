import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: testimonials is CSS-only - the risky parts are the floating review
 * overlay (must blur + translucent over any photo) and the star group
 * sizing; the quote scales to the wide size step.
 */
await cssSmoke('testimonials', [
  {
    label: 'pull quote is 36px at wide containers, weight 400 by default',
    selector: '.mk-testimonial-quote',
    css: { 'font-size': '36px' },
  },
  {
    label: 'context icon is 24px muted',
    selector: '.mk-testimonial-context svg',
    css: { width: '24px', height: '24px' },
  },
  {
    label: 'review cards keep a 3:4 portrait box',
    selector: '.mk-testimonial-card',
    css: { 'aspect-ratio': '3 / 4', overflow: 'hidden' },
  },
  {
    label: 'overlay floats: absolute photo, blurred translucent body above it',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const body = getComputedStyle(document.querySelector('.mk-testimonial-card-body')!);
        const img = getComputedStyle(document.querySelector('.mk-testimonial-card > img')!);
        return {
          bodyZ: body.zIndex,
          blur: body.backdropFilter,
          bg: body.backgroundColor,
          imgZ: img.zIndex,
          imgPos: img.position,
        };
      });
      if (r.bodyZ !== '10' || r.imgZ !== '0') throw new Error(`z-order wrong: overlay ${r.bodyZ} vs img ${r.imgZ}`);
      if (!/blur/.test(r.blur)) throw new Error(`backdrop-filter missing: "${r.blur}"`);
      // translucent background → alpha < 1 (color-mix 80%); serialization
      // differs per engine (rgba(...,0.8) vs color(srgb ... / 0.8))
      const alpha = Number(r.bg.match(/(?:, |\/\s)([\d.]+)\)$/)?.[1] ?? '1');
      if (!(alpha > 0 && alpha < 1)) throw new Error(`overlay background not translucent: ${r.bg}`);
      if (r.imgPos !== 'absolute') throw new Error(`photo should be absolute, got ${r.imgPos}`);
    },
  },
  {
    label: 'stars are 12px and fill inherits currentColor',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const cs = getComputedStyle(document.querySelector('.mk-stars svg')!);
        return { w: cs.width, fill: cs.fill, color: cs.color };
      });
      if (r.w !== '12px') throw new Error('star width ' + r.w);
      if (r.fill !== r.color) throw new Error('fill ' + r.fill + ' != currentColor ' + r.color);
    },
  },
  {
    label: 'quote cards: stars, the review, an Avatar with name and role',
    run: async (page) => {
      const r = await page.evaluate(() => { const c = document.querySelector('.mk-testimonial-card[data-variant="quote"]')!; return { text: !!c.querySelector('.mk-testimonial-card-text')?.textContent, avatar: !!c.querySelector('.mk-testimonial-card-author .avatar'), aspect: getComputedStyle(c).aspectRatio, quote: getComputedStyle(c.querySelector('.mk-testimonial-card-text')!, '::before').content }; });
      if (!r.text || !r.avatar || r.aspect !== 'auto' || r.quote !== '"“"') throw new Error(JSON.stringify(r));
    },
  },
  {
    label: 'photo cards carry the review line too',
    run: async (page) => {
      const n = await page.evaluate(() => document.querySelectorAll('.mk-testimonial-card-body .mk-testimonial-card-text').length);
      if (n < 4) throw new Error(String(n));
    },
  },
  { label: 'wall: CSS columns, cards never split', run: async (page) => {
    const r = await page.evaluate(() => { const w = document.querySelector('.mk-testimonial-cards[data-variant="wall"]')!; return { cols: getComputedStyle(w).columnWidth, brk: getComputedStyle(w.querySelector('.mk-testimonial-card')!).breakInside, metric: !!w.querySelector('.mk-testimonial-card-metric strong') }; });
    if (r.cols !== '256px' || r.brk !== 'avoid' || !r.metric) throw new Error(JSON.stringify(r));
  } },
  { label: 'marquee: the tracks run (the second reversed), the copy is inert; reduced motion stops them', run: async (page) => {
    const r = await page.evaluate(() => { const [a, b] = document.querySelectorAll('.mk-testimonial-marquee-track'); return { a: getComputedStyle(a).animationName, dir: getComputedStyle(b).animationDirection, inert: !!(a.querySelector('[inert][aria-hidden="true"]') as HTMLElement | null)?.inert }; });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const still = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-testimonial-marquee-track')!).animationName);
    await page.emulateMedia({ reducedMotion: null });
    if (r.a !== 'mk-testimonial-marquee' || r.dir !== 'reverse' || !r.inert || still !== 'none') throw new Error(JSON.stringify({ ...r, still }));
  } },
  { label: 'spotlight: centered serif quote, author row with the company', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-testimonial-spotlight')!; return { align: getComputedStyle(s).textAlign, serif: getComputedStyle(s.querySelector('.mk-testimonial-spotlight-quote')!).fontFamily !== getComputedStyle(s).fontFamily, logo: !!s.querySelector('.mk-testimonial-spotlight-logo') }; });
    if (r.align !== 'center' || !r.serif || !r.logo) throw new Error(JSON.stringify(r));
  } },
]);
