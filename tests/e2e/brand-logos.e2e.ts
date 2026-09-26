import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: brand-logos is CSS-only - the promise is that marks follow
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
  {
    label: 'roll viewport clips and fades both inline edges (mask-image gradient)',
    selector: '#roll-x .mk-logos-roll',
    css: { overflow: 'hidden', 'mask-image': /^linear-gradient\(to right/ },
  },
  {
    label: 'horizontal track loops mk-logos-roll, linear infinite, default 30s duration',
    selector: '#roll-x .mk-logos-roll-track',
    css: {
      display: 'flex',
      'animation-name': 'mk-logos-roll',
      'animation-duration': '30s',
      'animation-timing-function': 'linear',
      'animation-iteration-count': 'infinite',
    },
  },
  {
    label: 'vertical roll uses the y keyframes and resolves --mk-logos-roll-duration (20s override)',
    selector: '#roll-y .mk-logos-roll-track',
    css: {
      'animation-name': 'mk-logos-roll-y',
      'animation-duration': '20s',
      'flex-direction': 'column',
    },
  },
  {
    label: 'vertical roll viewport is --mk-logos-roll-height tall (12rem default)',
    selector: '#roll-y .mk-logos-roll',
    css: { height: '192px', overflow: 'hidden' },
  },
  {
    label: 'the duplicated copy carries aria-hidden + tabindex="-1" on every roll track',
    run: async (page) => {
      const r = await page.evaluate(() =>
        [...document.querySelectorAll('.mk-logos-roll-track')].map((track) => {
          const dupes = [...track.querySelectorAll(':scope > [aria-hidden="true"]')];
          const total = track.childElementCount;
          return {
            half: dupes.length * 2 === total,
            unfocusable: dupes.every((el) => el.getAttribute('tabindex') === '-1'),
          };
        }),
      );
      assert.ok(r.length >= 2, 'fixture has both roll tracks');
      for (const t of r) {
        assert.ok(t.half, 'second half of the track must be the aria-hidden duplicate set');
        assert.ok(t.unfocusable, 'duplicated linked logos need tabindex="-1"');
      }
    },
  },
  {
    label: 'roll pauses on hover (animation-play-state: paused)',
    run: async (page) => {
      await page.hover('#roll-x .mk-logos-roll');
      const state = await page.$eval(
        '#roll-x .mk-logos-roll-track',
        (el) => getComputedStyle(el).animationPlayState,
      );
      await page.mouse.move(0, 0);
      assert.equal(state, 'paused');
    },
  },
  {
    label: 'reduced-motion: animation off, track wraps as a static layout, duplicate hidden',
    run: async (page) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const r = await page.evaluate(() => {
        const track = document.querySelector('#roll-x .mk-logos-roll-track')!;
        const cs = getComputedStyle(track);
        const dupe = track.querySelector(':scope > [aria-hidden="true"]')!;
        return {
          name: cs.animationName,
          wrap: cs.flexWrap,
          dupeDisplay: getComputedStyle(dupe).display,
        };
      });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      assert.equal(r.name, 'none');
      assert.equal(r.wrap, 'wrap');
      assert.equal(r.dupeDisplay, 'none');
    },
  },
]);
