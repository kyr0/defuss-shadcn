import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: card is CSS-only - verify the surface (border, overflow clip, inline
 * container for the @container query), literal paddings/type, and that the
 * documented container query (<280px) actually swaps to compact paddings.
 */
await cssSmoke('card', [
  {
    label: '.card is a clipped inline-size container',
    selector: '#card-full',
    css: { overflow: 'hidden', 'container-type': 'inline-size', 'border-top-width': '1px' },
  },
  {
    label: 'header/content use literal 24px paddings, footer drops its top',
    selector: '#card-full .card-header',
    css: { padding: '24px 24px 0px' },
  },
  {
    label: '.card-title is 20px/600, description muted 14px',
    selector: '#card-full .card-title',
    css: { 'font-size': '20px', 'font-weight': '600', margin: '0px' },
  },
  {
    label: 'title and description render with distinct colors',
    distinct: [
      { selector: '#card-full .card-title', prop: 'color' },
      { selector: '#card-full .card-description', prop: 'color' },
    ],
  },
  {
    label: '@container query: <280px switches to 16px paddings + 16px title',
    run: async (page) => {
      const narrow = await page.evaluate(() => {
        const header = getComputedStyle(document.querySelector('#card-narrow .card-header')!);
        const title = getComputedStyle(document.querySelector('#card-narrow .card-title')!);
        const wide = getComputedStyle(document.querySelector('#card-full .card-header')!);
        return {
          narrowPad: header.padding,
          narrowTitle: title.fontSize,
          widePad: wide.padding,
        };
      });
      assert.equal(narrow.narrowPad, '16px 16px 0px', 'compact header padding');
      assert.equal(narrow.narrowTitle, '16px', 'compact title size');
      assert.equal(narrow.widePad, '24px 24px 0px', 'wide card unaffected');
    },
  },
  {
    label: 'a header-only card keeps its bottom padding (the header is the last section)',
    selector: '#card-header-only .card-header',
    css: { padding: '24px' },
  },
  { label: 'header-only + density "compact" → 16px all round', selector: '#cd-compact-header-only .card-header', css: { padding: '16px' } },
  {
    label: 'variants: eight distinct looks (background / border / shadow / blur)',
    run: async (page) => {
      const looks = await page.evaluate(() => ['outline', 'dashed', 'ghost', 'muted', 'elevated', 'primary', 'neutral', 'glass'].map((x) => {
        const cs = getComputedStyle(document.getElementById(`cv-${x}`)!);
        return [cs.backgroundColor, cs.borderTopStyle, cs.borderTopColor, cs.boxShadow, cs.backdropFilter].join('|');
      }));
      assert.equal(new Set(looks).size, 8, looks.join('\n'));
      const r = await page.evaluate(() => ({
        dashed: getComputedStyle(document.getElementById('cv-dashed')!).borderTopStyle,
        glass: getComputedStyle(document.getElementById('cv-glass')!).backdropFilter,
        primaryText: getComputedStyle(document.getElementById('cv-primary')!).color !== getComputedStyle(document.getElementById('card-full')!).color,
      }));
      assert.deepEqual(r, { dashed: 'dashed', glass: 'blur(16px) saturate(1.4)', primaryText: true });
    },
  },
  {
    label: 'sizes xs..xl: 12 / 16 / 24 / 32 / 40px padding + 14 / 16 / 20 / 24 / 30px titles; density multiplies a size',
    run: async (page) => {
      const r = await page.evaluate(() => ({
        pad: ['xs', 'sm', 'md', 'lg', 'xl'].map((z) => getComputedStyle(document.querySelector(`#cs-${z} .card-header`)!).paddingTop),
        title: ['xs', 'sm', 'md', 'lg', 'xl'].map((z) => getComputedStyle(document.querySelector(`#cs-${z} .card-title`)!).fontSize),
        lgCompact: getComputedStyle(document.querySelector('#cs-lg-compact .card-header')!).paddingTop,
      }));
      assert.deepEqual(r.pad, ['12px', '16px', '24px', '32px', '40px']);
      assert.deepEqual(r.title, ['14px', '16px', '20px', '24px', '30px']);
      assert.ok(Math.abs(parseFloat(r.lgCompact) - 32 * 2 / 3) < 0.5, `lg × compact = ${r.lgCompact}`);
    },
  },
  {
    label: 'media: 16:9 edge to edge on top; data-inset pads + rounds it; data-align="center" centers',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const box = (id: string) => document.getElementById(id)!.getBoundingClientRect();
        const card = box('cm-top'), m = box('cm-top-media'), inset = box('cm-inset-media'), ic = box('cm-inset');
        return {
          edge: Math.round(m.width) === Math.round(card.width - 2), ratio: Math.round((m.width / m.height) * 100) / 100,
          insetMargin: Math.round(inset.left - ic.left), insetRadius: getComputedStyle(document.getElementById('cm-inset-media')!).borderTopLeftRadius,
          center: getComputedStyle(document.getElementById('cm-inset')!).textAlign, footer: getComputedStyle(document.getElementById('cm-inset-footer')!).justifyContent,
        };
      });
      assert.equal(r.edge, true, 'edge to edge (inside the 1px border)');
      assert.equal(r.ratio, 1.78);
      assert.equal(r.insetMargin, 25, '24px padding + 1px border');
      assert.notEqual(r.insetRadius, '0px');
      assert.deepEqual([r.center, r.footer], ['center', 'center']);
    },
  },
  {
    label: 'layouts: side = media | body; auto = stacked when the card is narrow, side by side when wide; overlay stacks body over media',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const box = (id: string) => document.getElementById(id)!.getBoundingClientRect();
        const beside = (a: string, b: string) => box(b).left >= box(a).right - 1 && Math.abs(box(b).top - box(a).top) < 2;
        const stacked = (a: string, b: string) => box(b).top >= box(a).bottom - 1;
        const o = box('cl-overlay-media'), ob = box('cl-overlay-body');
        return {
          side: beside('cl-side-media', 'cl-side-body'),
          sideHeight: Math.abs(box('cl-side-media').height - box('cl-side').height) < 3,
          narrow: stacked('cl-auto-narrow-media', 'cl-auto-narrow-body'),
          wide: beside('cl-auto-wide-media', 'cl-auto-wide-body'),
          overlay: ob.top >= o.top && ob.bottom <= o.bottom + 1 && Math.abs(ob.bottom - o.bottom) < 2,
          overlayText: getComputedStyle(document.querySelector('#cl-overlay .card-title')!).color,
        };
      });
      assert.deepEqual(r, { side: true, sideHeight: true, narrow: true, wide: true, overlay: true, overlayText: 'rgb(255, 255, 255)' });
    },
  },
  {
    label: 'interactive: a link card lifts on hover; [data-interactive] shows a focus ring',
    run: async (page) => {
      await page.hover('#ci-link');
      await page.waitForTimeout(250);
      const lift = await page.$eval('#ci-link', (el) => getComputedStyle(el).translate);
      assert.equal(lift, '0px -2px');
      await page.keyboard.press('Tab');
      await page.focus('#ci-div');
      const outline = await page.evaluate(() => document.activeElement!.id + ' ' + getComputedStyle(document.activeElement!).outlineStyle);
      assert.match(outline, /^ci-div (solid|auto)$/);
    },
  },
  {
    label: 'selectable: the checked label.card takes a primary ring; a disabled input dims its card',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const cs = (id: string) => getComputedStyle(document.getElementById(id)!);
        return { on: cs('csel-on').boxShadow, off: cs('csel-off').boxShadow, dis: cs('csel-dis').opacity, cursor: cs('csel-off').cursor };
      });
      assert.notEqual(r.on, 'none');
      assert.equal(r.off, 'none');
      assert.equal(r.dis, '0.55');
      assert.equal(r.cursor, 'pointer');
      await page.click('#csel-off');
      await page.waitForTimeout(300); // the ring transitions (150ms)
      const moved = await page.evaluate(() => [getComputedStyle(document.getElementById('csel-on')!).boxShadow, getComputedStyle(document.getElementById('csel-off')!).boxShadow]);
      assert.equal(moved[0], 'none');
      assert.notEqual(moved[1], 'none');
    },
  },
  {
    label: 'neutral is a charcoal apart from primary; a ghost button on a colored card is readable at rest AND hovered',
    run: async (page) => {
      const lum = (c: string) => { const cv = document.createElement('canvas').getContext('2d')!; cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); const [r, g, b] = cv.getImageData(0, 0, 1, 1).data; const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const bgs = await page.evaluate(() => [getComputedStyle(document.getElementById('cg-neutral')!).backgroundColor, getComputedStyle(document.getElementById('cg-primary')!).backgroundColor]);
      assert.notEqual(bgs[0], bgs[1], 'neutral differs from primary');
      const link = await page.evaluate(() => [getComputedStyle(document.getElementById('cg-neutral-link')!).color, getComputedStyle(document.getElementById('cg-neutral')!).color]);
      assert.equal(link[0], link[1], 'a link button takes the card text color');
      await page.mouse.move(0, 0);
      await page.waitForTimeout(300);
      for (const [id, hovered] of [['cg-neutral', false], ['cg-primary', false], ['cg-neutral', true], ['cg-primary', true]] as const) {
        if (hovered) await page.hover(`#${id}-btn`);
        await page.waitForTimeout(300);
        const ratio = await page.evaluate(([id, lumSrc]) => {
          const lum = new Function(`return ${lumSrc}`)();
          const btn = document.getElementById(`${id}-btn`)!;
          const cs = getComputedStyle(btn);
          // the hover tint is translucent: composite it over the card
          const cv = document.createElement('canvas').getContext('2d')!;
          cv.fillStyle = getComputedStyle(document.getElementById(id)!).backgroundColor; cv.fillRect(0, 0, 1, 1);
          cv.fillStyle = cs.backgroundColor; cv.fillRect(0, 0, 1, 1);
          const [r, g, b] = cv.getImageData(0, 0, 1, 1).data;
          const a = lum(`rgb(${r}, ${g}, ${b})`), t = lum(cs.color);
          return (Math.max(a, t) + 0.05) / (Math.min(a, t) + 0.05);
        }, [id, lum.toString()] as const);
        assert.ok(ratio >= 4.5, `${id} (${hovered ? 'hovered' : 'at rest'}): ghost button contrast ${ratio.toFixed(2)} >= 4.5`);
      }
    },
  },
  { label: 'card: density "compact" → padding-top 16px', selector: '#cd-compact .card-header', css: { 'padding-top': '16px' } },
  { label: 'card: density "comfortable" → padding-top 24px', selector: '#cd-comfortable .card-header', css: { 'padding-top': '24px' } },
  { label: 'card: density "spacious" → padding-top 32px', selector: '#cd-spacious .card-header', css: { 'padding-top': '32px' } },
]);
