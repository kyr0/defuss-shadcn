import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: brand-logos is CSS-only — the promise is that marks follow
 * currentColor (= --foreground: black in light mode, white in dark via the
 * tokens), muted only via opacity, with the name text muted and the caption
 * centered beneath the wrapping row.
 */
await cssSmoke('brand-logos', [
  {
    label: 'row wraps and centers, 40px marks at wide containers',
    selector: '.mk-logos-row',
    css: { display: 'flex', 'flex-wrap': 'wrap', 'justify-content': 'center' },
  },
  {
    label: 'logo mark renders 40px (2.5rem) at fixture width',
    selector: '.mk-logo svg',
    css: { width: '40px', height: '40px' },
  },
  {
    label: 'marks follow --foreground (theme ink: black light / white dark), softened by opacity',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const cs = getComputedStyle(document.querySelector('.mk-logo')!);
        const root = getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim();
        // resolve the token through a probe element to compare serialized colors
        const probe = document.createElement('span');
        probe.style.color = root;
        document.body.appendChild(probe);
        const tokenColor = getComputedStyle(probe).color;
        probe.remove();
        const nameColor = getComputedStyle(document.querySelector('.mk-logo-name')!).color;
        const muted = getComputedStyle(document.documentElement).getPropertyValue('--muted-foreground').trim();
        const nameProbe = document.createElement('span');
        nameProbe.style.color = muted;
        document.body.appendChild(nameProbe);
        const mutedColor = getComputedStyle(nameProbe).color;
        nameProbe.remove();
        return {
          logoColor: cs.color,
          tokenColor,
          opacity: parseFloat(cs.opacity),
          nameColor,
          mutedColor,
        };
      });
      if (r.logoColor !== r.tokenColor)
        throw new Error(`logo color ${r.logoColor} != --foreground ${r.tokenColor}`);
      if (!(r.opacity < 1)) throw new Error('marks must be softened (opacity < 1)');
      if (r.nameColor !== r.mutedColor)
        throw new Error(`name color ${r.nameColor} != --muted-foreground ${r.mutedColor}`);
    },
  },
  {
    label: 'logo name is 20px medium (wide step)',
    selector: '.mk-logo-name',
    css: { 'font-size': '20px', 'font-weight': '500' },
  },
  {
    label: 'each mark is a real link to the brand site, unstyled until hover',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const links = [...document.querySelectorAll('a.mk-logo')] as HTMLAnchorElement[];
        return {
          count: links.length,
          allHttp: links.every((a) => a.href.startsWith('https://')),
          noUnderline: links.every((a) => getComputedStyle(a).textDecorationLine === 'none'),
          svgFilled: links.every((a) => getComputedStyle(a.querySelector('svg')!).fill !== 'none'),
        };
      });
      if (r.count < 4) throw new Error(`only ${r.count} linked logos`);
      if (!r.allHttp) throw new Error('a logo link is not an https URL');
      if (!r.noUnderline) throw new Error('logo links show underlines');
      if (!r.svgFilled) throw new Error('a brand mark is not filled (currentColor inheritance broken)');
    },
  },
  {
    label: 'caption is centered 14px muted text',
    selector: '.mk-logos-caption',
    css: { 'text-align': 'center', 'font-size': '14px' },
  },
]);
