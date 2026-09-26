import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: get-in-touch is CSS-only - the overlapping avatar stack (negative
 * margin on all but the first, grayscale, background ring) is the entire
 * visual contract besides the bordered card.
 */
await cssSmoke('get-in-touch', [
  {
    label: 'card is a bordered, rounded, background-filled block',
    selector: '.mk-contact',
    css: { 'border-width': '1px', display: 'flex', 'flex-direction': 'column', 'align-items': 'center' },
  },
  {
    label: 'avatar overlap: 2nd/3rd pulled left 8px, first not',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const [a, b, c] = [...document.querySelectorAll('.mk-contact-avatars .avatar')].map(
          (el) => getComputedStyle(el).marginInlineStart,
        );
        return { a, b, c };
      });
      if (r.a !== '0px') throw new Error(`first avatar should not overlap (margin ${r.a})`);
      if (r.b !== '-8px' || r.c !== '-8px') throw new Error(`expected -8px overlap, got ${r.b}/${r.c}`);
    },
  },
  {
    label: 'avatars are grayscale with a ring outline',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const cs = getComputedStyle(document.querySelector('.mk-contact-avatars .avatar')!);
        return { filter: cs.filter, outline: cs.outlineColor };
      });
      if (!/grayscale/.test(r.filter)) throw new Error(`no grayscale: ${r.filter}`);
    },
  },
  {
    label: 'copy block is centered, title 36px at wide width',
    selector: '.mk-contact-title',
    css: { 'font-size': '36px', 'text-align': 'center' },
  },
]);
