import { cssSmoke, type Check } from '../lib/css-smoke.ts';

/**
 * Why: E2E smoke test for the CSS-only heading-anchor. The fixture holds every documented placement - in front (the
 * default: hanging in the gutter, shown on hover, focus and target), before and after the text - the # glyph and
 * every size; the checks pin where the glyph sits and when it shows.
 */
const checks: Check[] = [
  {
    label: 'in front (default): hangs in the gutter - the heading text starts where a heading without an anchor does - and hides until hovered',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const text = (h: Element) => {
          const range = document.createRange();
          const node = [...h.childNodes].find((n) => n.nodeType === 3 && n.textContent!.trim())!;
          range.selectNodeContents(node);
          return range.getBoundingClientRect().left;
        };
        const front = document.querySelector('#t-front')!;
        const a = front.querySelector('.heading-anchor')!;
        // a text node's box starts with its leading space; compare the glyph against the heading's own start edge
        return { glyphRight: a.getBoundingClientRect().right, start: front.getBoundingClientRect().left, opacity: getComputedStyle(a).opacity, textFront: text(front), textPlain: document.querySelector('#t-plain')!.getBoundingClientRect().left };
      });
      if (!(r.glyphRight <= r.start)) throw new Error(`the glyph does not hang in front (${r.glyphRight} > ${r.start})`);
      if (r.opacity !== '0') throw new Error(`shown before hover (${r.opacity})`);
      if (Math.abs(r.textFront - r.textPlain) > 6) throw new Error(`the text moved (${r.textFront} vs ${r.textPlain})`);
      await page.hover('#t-front');
      await page.waitForFunction(() => getComputedStyle(document.querySelector('#t-front .heading-anchor')!).opacity === '1');
      await page.mouse.move(0, 0);
    },
  },
  {
    label: 'in front: keyboard focus and the address target show it',
    run: async (page) => {
      await page.focus('#t-hash .heading-anchor');
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await page.waitForFunction(() => getComputedStyle(document.querySelector('#t-hash .heading-anchor')!).opacity === '1');
      await page.evaluate(() => (document.activeElement as HTMLElement).blur());
      await page.evaluate(() => (location.hash = 't-front'));
      await page.waitForFunction(() => getComputedStyle(document.querySelector('#t-front .heading-anchor')!).opacity === '1');
    },
  },
  {
    label: 'the # glyph hangs like the §',
    run: async (page) => {
      const r = await page.$eval('#t-hash', (h) => ({ glyph: h.querySelector('.heading-anchor')!.textContent, right: h.querySelector('.heading-anchor')!.getBoundingClientRect().right, start: h.getBoundingClientRect().left }));
      if (r.glyph !== '#' || !(r.right <= r.start)) throw new Error(JSON.stringify(r));
    },
  },
  {
    label: 'before: inline in front of the text, muted, no underline, normal weight, always shown',
    selector: 'h3#t-before .heading-anchor',
    css: {
      textDecoration: 'none',
      marginRight: '6px',
      marginLeft: '0px',
      fontWeight: '400',
      opacity: '1',
    },
  },
  {
    label: 'data-placement="after" swaps the margin side',
    selector: 'h3#t-after .heading-anchor',
    css: {
      marginRight: '0px',
      marginLeft: '6px',
      opacity: '1',
    },
  },
  {
    label: 'sizes map to the documented font sizes',
    selector: 'a[data-size="md"]',
    css: { fontSize: '16px' },
  },
  {
    label: 'xs and xl are the two ends of the scale',
    selector: 'a[data-size="xl"]',
    css: { fontSize: '20px' },
  },
  {
    label: 'hover turns the glyph primary + underlined (escape hatch)',
    run: async (page) => {
      const a = page.locator('h3#t-before .heading-anchor');
      await a.hover();
      const [decoration, color] = await a.evaluate((el) => {
        const cs = getComputedStyle(el);
        return [cs.textDecoration, cs.color];
      });
      if (!decoration.includes('underline')) throw new Error(`hover did not underline (${decoration})`);
      // --primary resolved (never the muted foreground of the base rule)
      const base = await page.locator('h3#t-after .heading-anchor').evaluate((el) => getComputedStyle(el).color);
      if (color === base) throw new Error(`hover color did not change (${color})`);
    },
  },
];

await cssSmoke('heading-anchor', checks);
console.log('heading-anchor.e2e: all checks passed');
