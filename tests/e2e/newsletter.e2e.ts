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
]);
