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
]);
