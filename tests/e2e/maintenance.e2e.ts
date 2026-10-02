import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: maintenance is a CSS-only website block (Account & States) - the fixture
 * instantiates every documented example; these checks pin the layout each
 * variant promises.
 */
await cssSmoke('maintenance', [
  { label: 'a status with an indeterminate progress and a time', run: async (page) => {
    const r = await page.evaluate(() => { const s = document.querySelector('.mk-maintenance:not([data-variant])')!; const p = s.querySelector('progress') as HTMLProgressElement; return { role: s.getAttribute('role'), ind: p.position === -1, time: !!s.querySelector('time[datetime]') }; });
    if (r.role !== 'status' || !r.ind || !r.time) throw new Error(JSON.stringify(r));
  } },
  { label: 'the icon tile is amber', selector: '.mk-maintenance:not([data-variant]) .mk-maintenance-icon', css: { color: 'rgb(180, 83, 9)', width: '64px' } },
  { label: 'banner: one amber line', selector: '.mk-maintenance[data-variant="banner"]', css: { display: 'flex', color: 'rgb(146, 64, 14)' } },
]);
