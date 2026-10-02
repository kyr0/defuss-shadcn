import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: pricing is CSS-only but has real BEHAVIOR - the billing toggle flips
 * every plan's price pair through `:has()`. This checks geometry (featured
 * 2px border, 48px price) and drives the radio to prove the year/month swap.
 */
await cssSmoke('pricing', [
  {
    label: 'plans resolve to three columns at wide width, centered so the featured one stands taller',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const g = getComputedStyle(document.querySelector('.mk-plans')!);
        return { cols: g.gridTemplateColumns.trim().split(/\s+/).length, align: g.alignItems };
      });
      if (r.cols !== 3 || r.align !== 'center') throw new Error(`got ${r.cols} cols / ${r.align}`);
    },
  },
  {
    label: 'featured plan has a 2px border in a distinct color (others 1px)',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const f = getComputedStyle(document.querySelector('.mk-plan[data-featured]')!);
        const p = getComputedStyle(document.querySelector('.mk-plan:not([data-featured])')!);
        return { fw: f.borderTopWidth, pw: p.borderTopWidth, fc: f.borderTopColor, pc: p.borderTopColor };
      });
      if (r.fw !== '2px' || r.pw !== '1px') throw new Error(`widths ${r.fw}/${r.pw}`);
      if (r.fc === r.pc) throw new Error('featured border color identical to plain plan');
    },
  },
  {
    label: 'price digits are 48px tabular',
    selector: '.mk-plan-amount',
    css: { 'font-size': '48px', 'font-variant-numeric': 'tabular-nums' },
  },
  {
    label: 'CTA button fills the card width (used px == container width)',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const btn = document.querySelector('.mk-plan-cta .btn')!.getBoundingClientRect();
        const cta = document.querySelector('.mk-plan-cta')!;
        const cs = getComputedStyle(cta);
        // content box of the padded wrapper is what width:100% resolves to
        const content =
          cta.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        return { btn: btn.width, content };
      });
      if (Math.abs(r.btn - r.content) > 1) throw new Error(`btn ${r.btn}px vs content ${r.content}px`);
    },
  },
  {
    label: 'yearly shows, monthly hides - and the radio flips them',
    run: async (page) => {
      const visible = () =>
        page.evaluate(() => ({
          yearly: getComputedStyle(document.querySelector('.mk-price-yearly')!).display,
          monthly: getComputedStyle(document.querySelector('.mk-price-monthly')!).display,
        }));
      const before = await visible();
      if (before.yearly !== 'flex' || before.monthly !== 'none')
        throw new Error(`initial swap wrong: ${JSON.stringify(before)}`);
      await page.click('.mk-bill-monthly');
      const after = await visible();
      if (after.yearly !== 'none' || after.monthly !== 'flex')
        throw new Error(`after toggle wrong: ${JSON.stringify(after)}`);
    },
  },
  {
    label: 'the featured plan sits in a gold aura (the light is its border); a saving badge on the yearly choice',
    run: async (page) => {
      const r = await page.evaluate(() => { const a = document.querySelector('.aura.aura-gold')!; return { plan: !!a.querySelector(':scope > .mk-plan[data-featured]'), anim: getComputedStyle(a).animationName, border: getComputedStyle(a.querySelector('.mk-plan')!).borderTopColor, badge: !!document.querySelector('.mk-pricing-billing .badge') }; });
      if (!r.plan || r.anim !== 'shape-aura-spin' || r.border !== 'rgba(0, 0, 0, 0)' || !r.badge) throw new Error(JSON.stringify(r));
    },
  },
  { label: 'compare: the Table with a tinted featured column; dashes and checks are labelled', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-pricing-compare')!; const f = c.querySelector('td[data-featured]')!; const n = c.querySelector('td:not([data-featured])')!; return { tint: getComputedStyle(f).backgroundColor !== getComputedStyle(n).backgroundColor, labels: c.querySelectorAll('svg[aria-label]').length, scroll: getComputedStyle(c).overflowX }; });
    if (!r.tint || r.labels < 10 || r.scroll !== 'auto') throw new Error(JSON.stringify(r));
  } },
  { label: 'compact: one bordered list, rows separated by rules', run: async (page) => {
    const r = await page.evaluate(() => { const l = document.querySelector('.mk-plans[data-variant="compact"]')!; const p = l.querySelector('.mk-plan')!; return { cols: getComputedStyle(l).gridTemplateColumns.split(' ').length, rule: getComputedStyle(p).borderBottomWidth, radius: getComputedStyle(p).borderTopLeftRadius }; });
    if (r.cols !== 1 || r.rule !== '1px' || r.radius !== '0px') throw new Error(JSON.stringify(r));
  } },
  { label: 'wide: the features in columns beside the price', run: async (page) => {
    const r = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-plan[data-variant="wide"] .mk-plan-features')!).columnWidth);
    if (r !== '192px') throw new Error(r);
  } },
  { label: 'usage: a range input and an output; the CTA strip is dark', run: async (page) => {
    const r = await page.evaluate(() => ({ range: (document.getElementById('seats') as HTMLInputElement).type, out: document.getElementById('seats-price')!.tagName, cta: getComputedStyle(document.querySelector('.mk-pricing-cta')!).backgroundColor !== getComputedStyle(document.body).backgroundColor }));
    if (r.range !== 'range' || r.out !== 'OUTPUT' || !r.cta) throw new Error(JSON.stringify(r));
  } },
]);
