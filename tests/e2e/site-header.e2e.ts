import { cssSmoke } from './lib/css-smoke.ts';

/**
 * Why: site-header is CSS-only - the contract is that the flex header lays
 * out brand/nav/actions, the container query reveals the nav at wide
 * containers, and the sticky variant actually sticks. The nav composes the
 * navigation-menu component: trigger buttons with popovertarget + popover
 * panels, no header-side JS.
 */
await cssSmoke('site-header', [
  {
    label: 'inner row is a space-between flex bar, 56px min height',
    selector: '.mk-header-inner',
    css: { display: 'flex', 'justify-content': 'space-between', 'min-height': '56px' },
  },
  {
    label: 'brand icon is 20px and name uses primary color (≠ header bg)',
    distinct: [
      { selector: '.mk-header-name', prop: 'color' },
      { selector: '.mk-header', prop: 'background-color' },
    ],
  },
  {
    label: 'nav is visible at fixture width (container ≥ 30rem)',
    selector: '.mk-header-nav',
    css: { display: 'flex' },
  },
  {
    label: 'nav composes navigation-menu: trigger buttons + popover panels',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const nav = document.querySelector('.mk-header-nav')!;
        const triggers = [...nav.querySelectorAll('button.nav-menu-trigger[popovertarget]')];
        const panels = [...nav.querySelectorAll('div.nav-menu-content[popover]')];
        const linked = triggers.every((b) => panels.some((p) => p.id === b.getAttribute('popovertarget')));
        const pricing = !!nav.querySelector('a.nav-menu-link');
        return { triggers: triggers.length, panels: panels.length, linked, pricing };
      });
      if (r.triggers < 1 || r.panels < 1) throw new Error('nav lacks dropdown trigger/popover pairs');
      if (!r.linked) throw new Error('a popovertarget does not reference a panel in the header');
      if (!r.pricing) throw new Error('plain nav links missing');
    },
  },
  {
    label: 'dropdown opens natively on trigger click (Popover API, zero JS)',
    run: async (page) => {
      await page.click('.mk-header-nav button.nav-menu-trigger');
      const open = await page.evaluate(() => {
        const id = document.querySelector('.mk-header-nav button.nav-menu-trigger')!.getAttribute('popovertarget')!;
        return (document.getElementById(id) as HTMLDivElement).popover === 'auto';
      });
      if (!open) throw new Error('panel is not a native popover');
      await page.keyboard.press('Escape');
    },
  },
  {
    label: 'panel anchors below its trigger (navigation-menu wires anchor names per pair)',
    run: async (page) => {
      // the reported bug (Default AND Sticky demos): unwired panels keep
      // position-anchor: normal and render at the viewport top-left.
      await page.click('.mk-header-nav button.nav-menu-trigger');
      const r = await page.evaluate(() => {
        const t = document.querySelector('.mk-header-nav button.nav-menu-trigger')!;
        const id = t.getAttribute('popovertarget')!;
        const p = document.getElementById(id)!;
        return {
          posAnchor: getComputedStyle(p).positionAnchor,
          gap: p.getBoundingClientRect().top - t.getBoundingClientRect().bottom,
          aligned: Math.abs(p.getBoundingClientRect().left - t.getBoundingClientRect().left) < 2,
        };
      });
      await page.keyboard.press('Escape');
      if (r.posAnchor === 'normal') throw new Error('position-anchor not applied - anchor wiring did not run');
      if (!(r.gap >= 0 && r.gap < 24)) throw new Error(`panel ${r.gap}px from trigger bottom - not anchored below`);
      if (!r.aligned) throw new Error('panel left edge not aligned with trigger');
    },
  },
  {
    label: 'data-variant="sticky" pins the header',
    selector: '.mk-header[data-variant="sticky"]',
    css: { position: 'sticky', top: '0px' },
  },
  {
    label: 'sticky header dropdown also anchors below its trigger',
    run: async (page) => {
      // the reported issue: the Sticky demo panel opened at the viewport origin
      await page.click('[data-variant="sticky"] .nav-menu-trigger');
      const r = await page.evaluate(() => {
        const t = document.querySelector('[data-variant="sticky"] .nav-menu-trigger')!;
        const p = document.getElementById(t.getAttribute('popovertarget')!)!;
        return { gap: p.getBoundingClientRect().top - t.getBoundingClientRect().bottom };
      });
      await page.keyboard.press('Escape');
      if (!(r.gap >= 0 && r.gap < 24)) throw new Error(`sticky panel ${r.gap}px from trigger bottom - not anchored`);
    },
  },
  {
    label: 'narrow: the nav hides, the menu button opens a Sheet with the navigation; Login steps aside',
    run: async (page) => {
      await page.setViewportSize({ width: 420, height: 800 });
      const r = await page.evaluate(() => ({
        nav: getComputedStyle(document.querySelector('.mk-header-nav')!).display,
        menu: getComputedStyle(document.querySelector('.mk-header-menu')!).display,
        login: getComputedStyle(document.querySelector('.mk-header-wide')!).display,
        sheet: !!document.getElementById(document.querySelector('.mk-header-menu')!.getAttribute('data-sheet-trigger')!)?.querySelector('.mk-header-sheet-nav a'),
      }));
      await page.setViewportSize({ width: 1280, height: 720 });
      const wide = await page.evaluate(() => getComputedStyle(document.querySelector('.mk-header-menu')!).display);
      if (r.nav !== 'none' || !r.menu.endsWith('flex') || r.login !== 'none' || !r.sheet || wide !== 'none') throw new Error(JSON.stringify({ ...r, wide }));
    },
  },
  { label: 'floating: a sticky, blurred pill', run: async (page) => {
    const r = await page.evaluate(() => { const h = document.querySelector('.mk-header[data-variant="floating"]')!; const i = getComputedStyle(h.querySelector('.mk-header-inner')!); return { pos: getComputedStyle(h).position, radius: i.borderTopLeftRadius, blur: i.backdropFilter.includes('blur') }; });
    if (r.pos !== 'sticky' || r.radius !== '999px' || !r.blur) throw new Error(JSON.stringify(r));
  } },
  { label: 'announcement: a primary bar above the row', run: async (page) => {
    const r = await page.evaluate(() => { const a = document.querySelector('.mk-header-announcement')!; return { first: a === a.parentElement!.firstElementChild, bg: getComputedStyle(a).backgroundColor !== getComputedStyle(a.parentElement!).backgroundColor }; });
    if (!r.first || !r.bg) throw new Error(JSON.stringify(r));
  } },
  { label: 'overlay: absolute, transparent, white', run: async (page) => {
    const r = await page.evaluate(() => { const h = getComputedStyle(document.querySelector('.mk-header[data-variant="overlay"]')!); return { pos: h.position, bg: h.backgroundColor, color: h.color }; });
    if (r.pos !== 'absolute' || r.bg !== 'rgba(0, 0, 0, 0)' || r.color !== 'rgb(255, 255, 255)') throw new Error(JSON.stringify(r));
  } },
  { label: 'centered: the brand sits in the middle column', run: async (page) => {
    const r = await page.evaluate(() => { const i = document.querySelector('.mk-header[data-variant="centered"] .mk-header-inner')!; const b = i.querySelector('.mk-header-brand')!.getBoundingClientRect(); const box = i.getBoundingClientRect(); return Math.abs((b.left + b.width / 2) - (box.left + box.width / 2)); });
    if (r > 2) throw new Error(String(r));
  } },
  { label: 'store: search shown wide, a count bubble on the cart', run: async (page) => {
    const r = await page.evaluate(() => ({ search: getComputedStyle(document.querySelector('.mk-header-search')!).display, count: getComputedStyle(document.querySelector('.mk-header-count')!).position }));
    if (r.search !== 'block' || r.count !== 'absolute') throw new Error(JSON.stringify(r));
  } },
  { label: 'elevate: a scroll-driven animation; reduced motion shows the rule statically', run: async (page) => {
    const name = await page.$eval('.mk-header[data-elevate]', (e) => getComputedStyle(e).animationName);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const still = await page.$eval('.mk-header[data-elevate]', (e) => getComputedStyle(e).animationName);
    await page.emulateMedia({ reducedMotion: null });
    if (name !== 'mk-header-elevate' || still !== 'none') throw new Error(JSON.stringify({ name, still }));
  } },
  { label: 'the brand glyph takes the name color, never the link blue', run: async (page) => {
    const r = await page.evaluate(() => { const b = document.querySelector('.mk-header-brand')!; return [getComputedStyle(b).color, getComputedStyle(b.querySelector('.mk-header-name')!).color]; });
    if (r[0] !== r[1] || r[0] === 'rgb(0, 0, 238)') throw new Error(r.join(' vs '));
  } },
]);
