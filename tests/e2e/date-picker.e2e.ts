import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: date-picker is CSS-only (a styled native <input type="date">) —
 * verify the 36px (md-step) control box and disabled dimming. The calendar indicator
 * is UA shadow-DOM and intentionally not asserted.
 */
await cssSmoke('date-picker', [
  {
    label: '.date-input is a 36px control (md default) with 12px inline padding',
    selector: '#dp-default',
    css: { height: '36px', padding: '0px 12px', 'font-size': '14px', 'border-top-width': '1px', cursor: 'pointer' },
  },
  {
    label: 'disabled dims to 0.5 with not-allowed',
    selector: '#dp-disabled',
    css: { opacity: '0.5', cursor: 'not-allowed' },
  },

  { label: 'date-picker: data-size="xs" geometry', selector: '#z-datepicker-xs', css: { 'height': '28px' } },
  { label: 'date-picker: data-size="sm" geometry', selector: '#z-datepicker-sm', css: { 'height': '32px' } },
  { label: 'date-picker: data-size="md" geometry', selector: '#z-datepicker-md', css: { 'height': '36px' } },
  { label: 'date-picker: data-size="lg" geometry', selector: '#z-datepicker-lg', css: { 'height': '44px' } },
  { label: 'date-picker: data-size="xl" geometry', selector: '#z-datepicker-xl', css: { 'height': '52px' } },
]);
