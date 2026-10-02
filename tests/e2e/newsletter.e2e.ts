import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: newsletter is CSS-only around a real form - inline row at wide
 * width, the browser-native email input semantics (type/required/label),
 * and the privacy note styling.
 */
await cssSmoke('newsletter', [
  {
    label: 'layout is a wide row: copy left, form right-aligned',
    selector: '.mk-newsletter-layout',
    css: { display: 'flex', 'flex-direction': 'row', 'justify-content': 'space-between' },
  },
  {
    label: 'form lays inline (row) at fixture width',
    selector: '.mk-newsletter-form',
    css: { 'flex-direction': 'row' },
  },
  {
    label: 'input keeps native email semantics + sr-only label + placeholder',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const i = document.querySelector('input[type="email"]') as HTMLInputElement | null;
        if (!i) throw new Error('no input[type=email]');
        const label = document.querySelector(`label[for="${i.id}"]`);
        if (!label) throw new Error('input has no <label for>');
        return { required: i.required, autocomplete: i.autocomplete, enterkeyhint: i.getAttribute('enterkeyhint') };
      });
      if (!r.required) throw new Error('input should be required');
      if (r.autocomplete !== 'email') throw new Error(`autocomplete=${r.autocomplete}`);
      if (r.enterkeyhint !== 'send') throw new Error(`enterkeyhint=${r.enterkeyhint}`);
    },
  },
  {
    label: 'title 36px / desc 16px muted (distinct)',
    distinct: [
      { selector: '.mk-newsletter-title', prop: 'font-size' },
      { selector: '.mk-newsletter-desc', prop: 'font-size' },
    ],
  },
  {
    label: 'a failed attempt (:user-invalid) swaps the note for the error; the note sits just inside the input edge',
    run: async (page) => {
      const before = await page.evaluate(() => ({ err: getComputedStyle(document.querySelector('.mk-newsletter-error')!).display, pad: getComputedStyle(document.querySelector('.mk-newsletter-note')!).paddingLeft }));
      await page.fill('#mk-nl-email', 'not-an-email');
      await page.click('.mk-newsletter-form .btn');
      const after = await page.evaluate(() => ({ err: getComputedStyle(document.querySelector('.mk-newsletter-error')!).display, note: getComputedStyle(document.querySelector('.mk-newsletter-note')!).display }));
      if (before.err !== 'none' || before.pad !== '6px' || after.err !== 'flex' || after.note !== 'none') throw new Error(JSON.stringify({ before, after }));
    },
  },
  { label: 'card: centered on a surface - the input + button row too - with an icon and social proof', run: async (page) => {
    const r = await page.evaluate(() => { const c = document.querySelector('.mk-newsletter[data-variant="card"] .mk-newsletter-layout')!; return { align: getComputedStyle(c).textAlign, border: getComputedStyle(c).borderTopWidth, icon: !!c.querySelector('.mk-newsletter-icon svg'), proof: c.querySelectorAll('.mk-newsletter-proof .avatar').length, off: (() => { const mid = (e: Element) => { const b = e.getBoundingClientRect(); return b.left + b.width / 2; }; const i = c.querySelector('.mk-newsletter-form .input')!.getBoundingClientRect(); const b = c.querySelector('.mk-newsletter-form .btn')!.getBoundingClientRect(); return Math.round(Math.abs((i.left + b.right) / 2 - mid(c))); })() }; });
    if (r.align !== 'center' || r.border !== '1px' || !r.icon || r.proof !== 3 || r.off > 1) throw new Error(JSON.stringify(r));
  } },
  { label: 'banner: a gradient strip, copy and form on one row', run: async (page) => {
    const r = await page.evaluate(() => { const b = document.querySelector('.mk-newsletter[data-variant="banner"] .mk-newsletter-layout')!; return { grad: getComputedStyle(b).backgroundImage.includes('gradient'), dir: getComputedStyle(b).flexDirection }; });
    if (!r.grad || r.dir !== 'row') throw new Error(JSON.stringify(r));
  } },
  { label: 'split: checkboxes pick the lists; the email is required', run: async (page) => {
    const r = await page.evaluate(() => ({ boxes: document.querySelectorAll('.mk-newsletter-topics input[type="checkbox"]').length, req: (document.getElementById('nl-split') as HTMLInputElement).required }));
    if (r.boxes !== 3 || !r.req) throw new Error(JSON.stringify(r));
  } },
]);
