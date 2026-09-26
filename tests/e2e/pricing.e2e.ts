import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: pricing is CSS-only but has real BEHAVIOR - the billing toggle flips
 * every plan's price pair through `:has()`. This checks geometry (featured
 * 2px border, 48px price) and drives the radio to prove the year/month swap.
 */
await cssSmoke('pricing', [
  {
    label: 'plans resolve to three stretch columns at wide width',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const g = getComputedStyle(document.querySelector('.mk-plans')!);
        return { cols: g.gridTemplateColumns.trim().split(/\s+/).length, align: g.alignItems };
      });
      if (r.cols !== 3 || r.align !== 'stretch') throw new Error(`got ${r.cols} cols / ${r.align}`);
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
]);
