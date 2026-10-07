import { expect, test } from 'vitest';
import { clickSelector, openDocPage, waitFor } from './helpers.ts';
import type { StatsDoc } from '../scripts/lib/stats.ts';

/** site.js/layout.js expose their globals under `df$` (no window globals). */
type DocsGlobal = Window & { df$: { shadcn: { docs: { realignWhenSettled?: (id: string) => void } } } };

/**
 * Why: end-to-end checks that the real doc-site UI - web components, SPA
 * router, and component interaction JS - actually work in a real browser
 * (Chromium via Playwright), loading the genuine pages from dist/.
 */

/** Header/sidebar are static markup now (defuss-ssg renders them per page). */
type HTMLElementOrNull = HTMLElement | null;

/** Why: sections render collapsed by default (only Introduction and the
 * active page's section are open) - tests that click a link expand its
 * section first, exactly like a visitor would. */
async function expandSection(doc: Document, heading: string): Promise<void> {
  const group = doc.querySelector(`details[data-nav-section="${heading}"]`) as HTMLDetailsElement | null;
  expect(group, `nav section "${heading}"`).toBeTruthy();
  if (!group!.open) await clickSelector(doc, `details[data-nav-section="${heading}"] > summary`);
  await waitFor(() => group!.open, `"${heading}" section to open`);
}

test('site shell renders header and sidebar from layout.js web components', async () => {
  const { doc } = await openDocPage('index.html');

  // header/sidebar are static markup rendered by defuss-ssg
  await waitFor(() => doc.querySelector('.site-header button#theme-toggle'), 'site-header to render');
  // checkVisibility() runs in the iframe's document, since Vitest's ARIA-based
  // expect.element doesn't traverse into child frames reliably.
  // Installation lives in the always-open Introduction section → visible.
  const navLink: HTMLElementOrNull = doc.querySelector('.site-sidebar a[href="installation.html"]');
  expect(navLink, 'sidebar link to Installation').toBeTruthy();
  expect(navLink!.checkVisibility({ opacityProperty: true, visibilityProperty: true })).toBe(true);
  // collapsed-by-default sections keep their links in the DOM (the group
  // holds them closed - checkVisibility() can't see the closed state, since
  // Blink hides <details> content via content-visibility, which that API
  // ignores without checkVisibilityCSS)
  const accordion: HTMLElementOrNull = doc.querySelector('.site-sidebar a[href="accordion.html"]');
  expect(accordion, 'sidebar link to Accordion').toBeTruthy();
  expect((accordion!.closest('details') as HTMLDetailsElement).open, 'Accordion section closed').toBe(false);
});

test('header: panel-left toggle docks the sidebar; version badge + separators sit by the GitHub link', async () => {
  const { doc } = await openDocPage('index.html');
  await waitFor(() => doc.querySelector('.site-header #sidebar-toggle'), 'sidebar toggle');

  // the toggle rides right behind the brand (where the version badge used to be)
  const toggle: HTMLElementOrNull = doc.querySelector('.site-header #sidebar-toggle');
  expect(toggle, 'header sidebar toggle').toBeTruthy();
  expect(toggle!.previousElementSibling?.classList.contains('header-brand'), 'toggle follows the brand').toBe(true);

  // the version badge sits in the brand, centered under the logo and clear
  // of the name beside it (every width)
  const version: HTMLElementOrNull = doc.querySelector('.site-header .header-brand .header-brand-mark .header-version');
  expect(version, 'version badge under the logo').toBeTruthy();
  expect(version!.textContent!.trim()).toMatch(/^v\d+\.\d+\.\d+$/);
  const logoBox = doc.querySelector('.header-brand-logo')!.getBoundingClientRect();
  const badgeBox = version!.getBoundingClientRect();
  const nameBox = doc.querySelector('.header-brand-name')!.getBoundingClientRect();
  expect(Math.abs(badgeBox.left + badgeBox.width / 2 - (logoBox.left + logoBox.width / 2)), 'badge centered under the logo').toBeLessThan(1.5);
  expect(badgeBox.top, 'badge below the logo').toBeGreaterThan(logoBox.top + logoBox.height / 2);
  expect(badgeBox.right, 'badge clear of the name').toBeLessThanOrEqual(nameBox.left);
  // the actions nav: GitHub, a separator, the icon buttons
  const nav = doc.querySelector('.site-header nav');
  expect(nav, 'actions nav').toBeTruthy();
  expect(nav!.querySelector('.header-version'), 'no version badge in the nav any more').toBeNull();
  const separators = nav!.querySelectorAll('.separator[data-orientation="vertical"]');
  expect(separators.length, 'GitHub↔buttons separator').toBe(1);
  const gh = nav!.querySelector<HTMLAnchorElement>('a[href*="github.com"]');
  expect(gh?.nextElementSibling?.classList.contains('separator'), 'separator after GitHub').toBe(true);

  // clicking the toggle docks the sidebar (component data-state) and re-labels it
  await clickSelector(doc, '.site-header #sidebar-toggle');
  const sidebar: HTMLElementOrNull = doc.querySelector('.site-sidebar');
  await waitFor(() => sidebar?.dataset.state === 'collapsed', 'sidebar to dock');
  expect(toggle!.getAttribute('aria-label'), 'toggle re-labelled for reopen').toBe('Expand sidebar');
  // second click undocks
  await clickSelector(doc, '.site-header #sidebar-toggle');
  await waitFor(() => sidebar?.dataset.state === 'expanded', 'sidebar to expand');
  expect(toggle!.getAttribute('aria-label')).toBe('Collapse sidebar');
});

test('sidebar shows component type badges (taxonomy), never the generic PREVIEW marker', async () => {
  const { doc } = await openDocPage('index.html');
  await waitFor(() => doc.querySelector('.site-sidebar a[href="accordion.html"]'), 'sidebar links');

  // badge type must match the skill frontmatter (accordion is an ATM - verified
  // against src/ by `bun run verify`'s `component type badges` gate)
  const atm: HTMLElementOrNull = doc.querySelector('.site-sidebar a[href="accordion.html"] .type-badge');
  expect(atm, 'Accordion type badge').toBeTruthy();
  expect(atm!.dataset.type).toBe('ATM');
  expect(atm!.textContent).toBe('ATM');
  const blk: HTMLElementOrNull = doc.querySelector('.site-sidebar a[href="hero.html"] .type-badge');
  expect(blk, 'Hero type badge').toBeTruthy();
  expect(blk!.dataset.type).toBe('BLK');
  // the old generic PREVIEW marker is gone everywhere in the sidebar
  expect(doc.querySelector('.site-sidebar')!.textContent).not.toContain('PREVIEW');
});

test('doc page type badge rides the title <h1> baseline, after the component name', async () => {
  const { doc } = await openDocPage('badge.html');
  await waitFor(() => doc.querySelector('.page-header h1'), 'page title');

  const badge: HTMLElementOrNull = doc.querySelector('.page-header h1 .type-badge');
  expect(badge, 'type badge inside title <h1>').toBeTruthy();
  expect(badge!.dataset.type).toBe('ATM');
  // badge directly follows the component-name text node inside the heading
  expect(badge!.previousSibling!.textContent).toBe('Badge');
  // small inline padding on the baseline (see .page-header h1 .type-badge in layout.css)
  const styles = (doc.defaultView as Window).getComputedStyle(badge!);
  expect(styles.marginLeft).not.toBe('0px');
  expect(styles.verticalAlign).toBe('baseline');
  // the metadata row no longer carries a badge
  expect(doc.querySelector('.page-header .flex .type-badge')).toBeFalsy();
});

test('SPA router swaps <main> content on nav click without reloading', async () => {
  const { doc } = await openDocPage('index.html');
  await waitFor(() => doc.querySelector('.site-header button#theme-toggle'), 'shell to render');

  await expandSection(doc, 'Navigation');
  await clickSelector(doc, '.site-sidebar a[href="tabs.html"]');

  // the router replaces <main> innerHTML - new page shows its own <h1>
  await waitFor(() => doc.querySelector('main h1')?.textContent?.includes('Tabs'), 'tabs page content');
  // no full reload: the header web component instance is still the same node
  expect(doc.querySelector('.site-header button#theme-toggle')).toBeTruthy();
});

test('dark-mode toggle flips the .dark class on <html>', async () => {
  const { doc } = await openDocPage('index.html');
  await waitFor(() => doc.querySelector('.site-header button#theme-toggle'), 'shell to render');

  const root = doc.documentElement;
  const wasDark = root.classList.contains('dark');
  await clickSelector(doc, '#theme-toggle');

  await waitFor(() => root.classList.contains('dark') === !wasDark, 'dark class to flip');
});

test('dialog component: the CodeExample card drives showModal/close end to end', async () => {
  // the dialog demos are executable fences - the <dialog> lives inside the
  // opaque sandbox iframe, so the assertable contract is the card's mirrored
  // data-state-values (the sandbox observed the real `open` property).
  const { doc } = await openDocPage('dialog.html');

  const card = doc.querySelector('.code-example[data-component="dialog"]') as HTMLElement & {
    preview?: { setState(name: string, config?: unknown): void };
  };
  await waitFor(() => card?.preview, 'dialog example card to boot its sandbox');

  card.preview!.setState('open', true);
  await waitFor(
    () => JSON.parse(card.dataset.stateValues || '{}').open === true,
    'dialog to open (mirrored)',
  );

  card.preview!.setState('open', false);
  await waitFor(
    () => JSON.parse(card.dataset.stateValues || '{}').open === false,
    'dialog to close (mirrored)',
  );
});

test('menubar component: the CodeExample card opens and closes a menu of the bar end to end', async () => {
  // the menubar demo is an executable fence (sandbox iframe) - assert the
  // card's mirrored data-state-values, observed from the bar's state name
  const { doc } = await openDocPage('menubar.html');

  const card = doc.querySelector('.code-example[data-component="menubar"]') as HTMLElement & {
    preview?: { setState(name: string, config?: unknown): void };
  };
  await waitFor(() => card?.preview, 'menubar example card to boot its sandbox');

  card.preview!.setState('open', true);
  await waitFor(() => JSON.parse(card.dataset.stateValues || '{}').open === true, 'a menu of the bar to open (mirrored)');

  card.preview!.setState('open', false);
  await waitFor(() => JSON.parse(card.dataset.stateValues || '{}').open === false, 'the bar to close (mirrored)');
});

for (const name of ['data-grid', 'data-tree', 'autocomplete']) {
  test(`${name} component: the big-data CodeExample card drives loading through the State API end to end`, async () => {
    // the big-data demos are executable fences: the records are generated and
    // queried inside the sandbox - the card mirrors the observed state name
    const { doc } = await openDocPage(`${name}.html`);
    const card = doc.querySelector(`.code-example[data-component="${name}"]`) as HTMLElement & {
      preview?: { setState(state: string, value?: unknown): void };
    };
    await waitFor(() => card?.preview, `${name} example card to boot its sandbox`);
    await waitFor(() => JSON.parse(card.dataset.stateValues || '{}').loading === false, `${name} to settle`);
    card.preview!.setState('loading', true);
    await waitFor(() => JSON.parse(card.dataset.stateValues || '{}').loading === true, `${name} to be loading (mirrored)`);
    card.preview!.setState('loading', false);
    await waitFor(() => JSON.parse(card.dataset.stateValues || '{}').loading === false, `${name} to show its records again (mirrored)`);
  });
}

test('questionnaire component: the CodeExample card walks to the review and back through the State API', async () => {
  // the feedback flow is an executable fence: the walk happens in the
  // sandbox, the card mirrors the observed state name
  const { doc } = await openDocPage('questionnaire.html');
  const card = doc.querySelector('.code-example[data-component="questionnaire"]') as HTMLElement & {
    preview?: { setState(state: string, value?: unknown): void };
  };
  await waitFor(() => card?.preview, 'questionnaire example card to boot its sandbox');
  card.preview!.setState('review', true);
  await waitFor(() => JSON.parse(card.dataset.stateValues || '{}').review === true, 'the questionnaire to show its review (mirrored)');
  card.preview!.setState('review', false);
  await waitFor(() => JSON.parse(card.dataset.stateValues || '{}').review === false, 'the questionnaire to leave the review (mirrored)');
});

test('diagram component: the CodeExample card pauses on a step and plays through the State API', async () => {
  // the first example on the page is a played diagram: the State tab drives
  // the step in the sandbox, the card mirrors data-step-current / the state
  const { doc } = await openDocPage('diagram.html');
  const card = doc.querySelector('.code-example[data-component="diagram"]') as HTMLElement & {
    preview?: { setState(state: string, value?: unknown): void };
  };
  await waitFor(() => card?.preview, 'diagram example card to boot its sandbox');
  card.preview!.setState('paused', 2);
  await waitFor(() => String(JSON.parse(card.dataset.stateValues || '{}').paused) === '2', 'the diagram to pause on step 2 (mirrored)');
  card.preview!.setState('playing', true);
  await waitFor(() => JSON.parse(card.dataset.stateValues || '{}').playing === true, 'the diagram to play (mirrored)');
  card.preview!.setState('active', 'api');
  await waitFor(() => JSON.parse(card.dataset.stateValues || '{}').active === 'api', 'the gateway to be active (mirrored)');
});

test('property-grid component: the CodeExample card opens an editor through the State API', async () => {
  // the settings grid is an executable fence: the State tab names a path,
  // the sandbox opens that value's editor and the card mirrors data-editing
  const { doc } = await openDocPage('property-grid.html');
  const card = doc.querySelector('.code-example[data-component="property-grid"]') as HTMLElement & {
    preview?: { setState(state: string, value?: unknown): void };
  };
  await waitFor(() => card?.preview, 'property grid example card to boot its sandbox');
  card.preview!.setState('editing', 'replicas');
  await waitFor(() => JSON.parse(card.dataset.stateValues || '{}').editing === 'replicas', 'the replicas editor to open (mirrored)');
});

test('code-example component: every docs card IS the shipped HTML Preview Editor; its page previews nested cards', async () => {
  // the page's first example nests a card in its preview: the State tab's
  // `code` control drives the nested card's own State API in the sandbox
  const { doc } = await openDocPage('code-example.html');
  const card = doc.querySelector('.code-example[data-component="code-example"]') as HTMLElement & {
    preview?: { setState(state: string, value?: unknown): void };
    api?: { setState(name: string, config?: unknown): void; getState(): { name: string; config: { source: string } } };
  };
  await waitFor(() => card?.preview, 'the HTML Preview Editor example card to boot its sandbox');
  card.preview!.setState('code', true);
  await waitFor(() => JSON.parse(card.dataset.stateValues || '{}').code === true, 'the nested card to open its source (mirrored)');
  // dogfooding: the docs card itself runs the component's State API
  card.api!.setState('code');
  const panel = card.querySelector('.code-example-panel[data-panel="code"]') as HTMLElement;
  expect(panel.hidden).toBe(false);
  expect(card.api!.getState().name).toBe('code');
  expect(card.api!.getState().config.source).toContain('class="code-example"');
  card.api!.setState('default');
  expect(panel.hidden).toBe(true);
});

test('index shows the current stats.json footprint as whole-KiB cards and dogfoods the Statistic component', async () => {
  // what a visitor reads must equal what the build measured: the cards carry
  // the numbers (whole KiB - no decimal clutter); README states the claim
  // sentence (verify's `stats claim (README)` gate), the index no longer does
  const stats = (await (await fetch('/dist/stats.json')).json()) as StatsDoc;

  const { doc } = await openDocPage('index.html');
  await waitFor(() => doc.querySelector('main h1') || doc.querySelector('.statistic'), 'index content');

  const normalized = doc.body!.textContent!.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  expect(normalized).not.toContain('minified + compressed');
  expect(normalized).toContain(`${Math.round(stats.bundle.totalSizeGzMinified / 1024)} KiB`);
  expect(normalized).toContain(`${Math.round(stats.core.totalSizeGzMinified / 1024)} KiB`);

  // dogfooding: the numbers render through the shipped Statistic component,
  // with its CSS applied (1.875rem value ⇒ 30px computed)
  const cards = [...doc.querySelectorAll('.statistic')];
  expect(cards.length, 'Statistic cards on the index').toBeGreaterThanOrEqual(4);
  const styles = (doc.defaultView as Window).getComputedStyle(cards[0].querySelector('.statistic-value')!);
  expect(styles.fontSize).toBe('30px');
  const values = cards.map((c) => c.querySelector('.statistic-value')!.textContent!.trim());
  expect(values).toContain(String(stats.total));
  expect(values).toContain(String(stats.withJs));
  expect(values).toContain(String(stats.withoutJs));
});

const textOf = (el: Element | null) => (el as HTMLTextAreaElement | null)?.value ?? el?.textContent ?? '';

test('SPA navigation boots the State API example (dialog inside its own sandbox)', async () => {
  // The State API demo used to be a page-level dialog (PageOverlay) the
  // router had to migrate; it is now a self-contained executable example -
  // its dialog lives in the sandbox and df$ wires it. After an SPA hop the
  // card must boot without an error, and no page-level dialog is left over.
  const { doc } = await openDocPage('index.html');
  await waitFor(() => doc.querySelector('.site-header button#theme-toggle'), 'shell to render');

  await expandSection(doc, 'Guides');
  await clickSelector(doc, '.site-sidebar a[href="state-api.html"]');
  await waitFor(() => doc.querySelector('main h1')?.textContent?.includes('State API'), 'state-api page content');
  await waitFor(() => doc.querySelector('main .code-example'), 'example card');
  const card = doc.querySelector('main .code-example') as HTMLElement;
  await waitFor(() => card.querySelector('iframe.code-example-frame'), 'sandbox frame');
  const err = card.querySelector('.code-example-error') as HTMLElement | null;
  expect(err?.hidden ?? true, `sandbox error: ${err?.textContent}`).toBe(true);
  expect(textOf(card.querySelector('.code-example-src'))).toContain("df$('#sa-dialog')");
  expect(doc.querySelector('body > dialog#state-api-dialog'), 'no page-level demo dialog').toBeNull();
});

test('sidebar sections are collapsible (dogfood of the sidebar-group pattern)', async () => {
  const { doc } = await openDocPage('index.html');
  await waitFor(() => doc.querySelector('.site-header button#theme-toggle'), 'shell to render');
  // same-origin localStorage survives iframes - start from a clean slate
  doc.defaultView!.localStorage.removeItem('defuss-shadcn-nav-collapsed');

  // every nav section is a <details class="nav-section sidebar-group">
  const groups = [...doc.querySelectorAll('details.nav-section')] as HTMLDetailsElement[];
  expect(groups.length, 'nav renders collapsible sections').toBeGreaterThan(3);

  // collapsed-by-default contract: only Introduction (holding index.html) is open
  const intro = groups.find((g) => g.dataset.navSection === 'Introduction')!;
  expect(intro.open, 'Introduction section starts expanded').toBe(true);
  const forms = groups.find((g) => g.dataset.navSection === 'Forms & Inputs')!;
  expect(forms.open, 'other sections start collapsed').toBe(false);

  // clicking the summary expands the section - but only for this page: a
  // non-Introduction toggle is never stored (13 sections used to pile up open)
  expect(forms.querySelector('a[href="input.html"]'), 'section contains its links').toBeTruthy();
  doc.defaultView!.localStorage.setItem('defuss-shadcn-nav-collapsed', JSON.stringify({ 'Forms & Inputs': '1', Charts: '1' }));
  await clickSelector(doc, 'details[data-nav-section="Forms & Inputs"] > summary');
  await waitFor(() => forms.open, 'Forms & Inputs to expand');
  const charts = groups.find((g) => g.dataset.navSection === 'Charts')!;
  await clickSelector(doc, 'details[data-nav-section="Charts"] > summary');
  await waitFor(() => charts.open, 'Charts to expand');

  // SPA-navigating to a page in Forms & Inputs keeps that section open and
  // closes every other one except Introduction
  await clickSelector(doc, '.site-sidebar a[href="input.html"]');
  await waitFor(() => doc.querySelector('main h1')?.textContent?.includes('Input'), 'input page content');
  await waitFor(() => forms.open && !charts.open, 'navigation keeps the active section open and closes the rest');
  expect(intro.open, 'Introduction keeps its own state').toBe(true);

  // Introduction is the one section whose toggle is remembered - saving it
  // rewrites the map with that single key (older per-section entries go)
  await clickSelector(doc, 'details[data-nav-section="Introduction"] > summary');
  await waitFor(() => !intro.open, 'Introduction to collapse');
  await waitFor(
    // a persisted store: the defuss-store envelope around the map
    () => JSON.stringify(JSON.parse(doc.defaultView!.localStorage.getItem('defuss-shadcn-nav-collapsed') ?? 'null')?.value) === JSON.stringify({ Introduction: '0' }),
    'only the Introduction toggle is stored',
  );
  doc.defaultView!.localStorage.removeItem('defuss-shadcn-nav-collapsed');
});

/** Runtime anchor clearance published by layout.js (fixed site header + sticky .page-header). */
function padPx(win: Window): number {
  return parseFloat(getComputedStyle(win.document.documentElement).scrollPaddingTop);
}

test('TOC links land their heading below the fixed AND sticky headers (issue #2)', async () => {
  const { doc } = await openDocPage('theming.html');
  await waitFor(() => doc.querySelector('.toc-link'), 'TOC to build');
  const win = doc.defaultView!;
  // --anchor-pad must clear BOTH bars: 3.5rem fixed site header + the sticky page header
  expect(padPx(win)).toBeGreaterThan(64);

  // regression: the pad must match the SETTLED header stack. The Fraunces
  // web-font swap reflows .page-header taller (~50px) AFTER init; with the
  // old one-shot measurement the pad stayed stale and every anchor overscrolled
  // the delta - landing the heading UNDER the sticky bar. The click assertion
  // below can't catch that (scrollIntoView honors the same stale pad), so pin
  // the invariant directly: ResizeObserver keeps scroll-padding-top >= stack.
  const stackPx = () =>
    (doc.querySelector('.site-header')?.getBoundingClientRect().height ?? 0) +
    (doc.querySelector('.page-header')?.getBoundingClientRect().height ?? 0);
  // determinism: the swap is what grows the stack - assert only after it, or
  // the stale pre-swap pad would satisfy the check with the stale pre-swap stack
  await doc.fonts.ready;
  await waitFor(() => padPx(win) >= stackPx(), '--anchor-pad to track the settled header stack');

  // clicking a mid-page TOC entry rests the heading exactly at scroll-padding-top
  await clickSelector(doc, '.toc-link[href="#toc-radius-scale"]');
  const heading = doc.getElementById('toc-radius-scale')!;
  const pad = padPx(win);
  await waitFor(() => Math.abs(heading.getBoundingClientRect().top - pad) <= 2, 'heading to rest at scroll-padding-top');
});

test('every TOC heading carries a § permalink that deep-links (issue #2)', async () => {
  const { doc } = await openDocPage('button.html');
  await waitFor(() => doc.querySelector('.toc-link'), 'TOC to build');

  const links = [...doc.querySelectorAll('.toc-link')];
  expect(links.length).toBeGreaterThan(5);
  for (const link of links) {
    const heading = doc.getElementById(link.getAttribute('href')!.slice(1))!;
    const anchor = heading.querySelector(':scope > a.heading-anchor');
    expect(anchor, `§ permalink on #${heading.id}`).toBeTruthy();
    expect(anchor!.getAttribute('href')).toBe(`#${heading.id}`);
    expect(anchor!.textContent).toBe('§');
    // the § must not leak into the TOC label (getHeadingText strips <a>)
    expect(link.textContent).not.toContain('§');
  }
});

test('no § permalink is injected inside .preview demo markup', async () => {
  // preview subtrees hold component demo markup (alert-dialog titles,
  // typography samples) - the § must never be stamped there
  for (const page of ['alert-dialog.html', 'typography.html']) {
    const { doc } = await openDocPage(page);
    await waitFor(() => doc.querySelector('.toc-link'), 'TOC to build');
    expect(
      doc.querySelector('.preview .heading-anchor'),
      `no § inside .preview on ${page}`,
    ).toBeNull();
  }
});

test('realignWhenSettled corrects a stale landing and respects reader input (issue #2)', async () => {
  const { doc } = await openDocPage('theming.html');
  await waitFor(() => doc.querySelector('.toc-link'), 'TOC to build');
  const win = doc.defaultView as DocsGlobal;
  expect(typeof win.df$.shadcn.docs.realignWhenSettled).toBe('function');
  const heading = doc.getElementById('toc-chart-tokens')!;
  const realign = win.df$.shadcn.docs.realignWhenSettled!;

  const pad = padPx(win);
  // simulate the issue-#2 outcome: scrolling ended 150px short of the heading
  win.scrollTo({ top: win.scrollY + heading.getBoundingClientRect().top - pad - 150 });
  await new Promise((r) => setTimeout(r, 120));
  expect(heading.getBoundingClientRect().top).toBeGreaterThan(pad + 100);

  realign('toc-chart-tokens');
  await waitFor(() => Math.abs(heading.getBoundingClientRect().top - pad) <= 2, 'correction to snap the heading to scroll-padding-top');

  // a reader who scrolls during the correction must never be fought
  win.scrollTo({ top: win.scrollY + heading.getBoundingClientRect().top - pad - 150 });
  await new Promise((r) => setTimeout(r, 120));
  const wrong = heading.getBoundingClientRect().top;
  realign('toc-chart-tokens');
  win.dispatchEvent(new WheelEvent('wheel', { deltaY: -1 })); // global ctor, dispatch into frame
  await new Promise((r) => setTimeout(r, 400));
  expect(heading.getBoundingClientRect().top).toBeCloseTo(wrong, 0);
});

test('component skill link toggles its <details> natively (no modal intercept)', async () => {
  // regression: the old spec-modal click handler preventDefault()ed the
  // summary activation, so clicking the link text never opened the panel.
  const { doc } = await openDocPage('badge.html');

  const details = doc.querySelector('details:has(span[data-spec-href])') as HTMLDetailsElement;
  expect(details.open, 'skill starts collapsed').toBe(false);

  await clickSelector(doc, 'span[data-spec-href]');
  await waitFor(() => details.open, 'details to open via the link click');

  await clickSelector(doc, 'span[data-spec-href]');
  await waitFor(() => !details.open, 'details to close via the link click');

  // the removed modal must not come back
  expect(doc.querySelector('dialog.spec-modal'), 'no spec modal in DOM').toBeNull();
});

test('field description example wires aria-describedby to its input', async () => {
  // regression: doc examples showed a .field-description under the field with
  // no aria-describedby - sighted users see the hint, screen-runner users
  // heard nothing. The pattern is gated by verify's `field description wiring`;
  // the demo now runs inside the CodeExample sandbox (opaque origin - the
  // parent cannot read into it), so this proves the wiring on the fence source
  // the sandbox renders verbatim: the editable <textarea> IS the executed DOM's
  // single source (plan §5).
  const { doc } = await openDocPage('label.html');

  const src = [...doc.querySelectorAll<HTMLTextAreaElement>('textarea.code-example-src')]
    .map((t) => t.value)
    .find((v) => v.includes('id="username"'));
  expect(src, 'the username demo fence exists on the page').toBeTruthy();

  // the aria-describedby of the input tag itself (attribute order-independent)
  const inputTag = /<input[^>]*id="username"[^>]*>/.exec(src!)![0];
  const descId = /aria-describedby="([^"]+)"/.exec(inputTag)?.[1];
  expect(descId, 'input must reference a description id').toBeTruthy();
  expect(src!, 'referenced element is the field description').toContain(`class="field-description" id="${descId}"`);
  expect(src!, 'description carries the help text').toContain('public display name');
});

test('code collapse-all toggles every snippet block - including the standalone CSS/JS source sections', async () => {
  // regression: initCodeCollapse paired toggles with ".preview's next sibling"
  // only, so the CSS/JS source sections at the bottom of each page had no
  // toggle and "Collapse all code" visibly did nothing for them.
  const { doc } = await openDocPage('sheet.html');

  await waitFor(() => doc.querySelector('.code-collapse-toolbar'), 'code collapse toolbar');

  const main = doc.querySelector('main')!;
  const wrappers = [...main.querySelectorAll('.code-block-wrapper')];
  const toggles = [...main.querySelectorAll('.code-toggle-btn')];
  // every snippet wrapper (copy-btn + <pre> div) on the page got a toggle...
  // (examples are CodeExample fences now - their source lives in the card's
  // textarea, not a .code-block-wrapper - so this page's wrappers are the
  // two standalone source sections)
  expect(wrappers.length).toBeGreaterThanOrEqual(2); // CSS + JS
  expect(toggles.length).toBe(wrappers.length);
  // ...including the two standalone source sections (old bug: these were missed)
  const cssWrapper = doc.querySelector('#source-css .copy-btn')!.parentElement!;
  const jsWrapper = doc.querySelector('#source-js .copy-btn')!.parentElement!;
  expect(cssWrapper.classList.contains('code-block-wrapper'), 'CSS source section is collapsible').toBe(true);
  expect(jsWrapper.classList.contains('code-block-wrapper'), 'JS source section is collapsible').toBe(true);

  const win = doc.defaultView!;
  const allBtn = doc.querySelector('.code-collapse-all-btn')!;

  // default: every block starts COLLAPSED (demos are primary, source opt-in) —
  // hidden, per-block toggles say "Show", toolbar offers "Expand all"
  expect(wrappers.every((w) => w.classList.contains('code-collapsed')), 'all blocks collapsed by default').toBe(true);
  wrappers.forEach((w) => expect(win.getComputedStyle(w).display).toBe('none'));
  expect(toggles.every((t) => t.getAttribute('aria-expanded') === 'false'), 'per-block toggles start collapsed').toBe(true);
  expect(allBtn.textContent, 'toolbar offers expand-all initially').toContain('Expand all code');

  // expand all → nothing hidden, toggles + toolbar in sync
  await clickSelector(doc, '.code-collapse-all-btn');
  await waitFor(
    () => wrappers.every((w) => !w.classList.contains('code-collapsed')),
    'all code blocks to expand',
  );
  wrappers.forEach((w) => expect(win.getComputedStyle(w).display).not.toBe('none'));
  expect(toggles.every((t) => t.getAttribute('aria-expanded') === 'true'), 'per-block toggles in sync').toBe(true);
  expect(allBtn.textContent, 'button offers collapse-all afterwards').toContain('Collapse all code');
  // …and every CodeExample card opened its Code panel too (tab pressed)
  const cards = [...main.querySelectorAll('.code-example')];
  expect(cards.length).toBeGreaterThan(0);
  cards.forEach((c) => {
    expect(c.querySelector('.code-example-tab[data-tab="code"]')!.getAttribute('aria-pressed')).toBe('true');
    expect((c.querySelector('.code-example-panel[data-panel="code"]') as HTMLElement).hidden).toBe(false);
  });

  // collapse all → every wrapper hidden again (display:none via .code-collapsed)
  await clickSelector(doc, '.code-collapse-all-btn');
  await waitFor(
    () => wrappers.every((w) => w.classList.contains('code-collapsed')),
    'all code blocks to collapse',
  );
  wrappers.forEach((w) => expect(win.getComputedStyle(w).display).toBe('none'));
  cards.forEach((c) => expect((c.querySelector('.code-example-panel[data-panel="code"]') as HTMLElement).hidden).toBe(true));

  // a single card's Code tab keeps the page-wide button honest. Collapsing
  // re-sizes every preview frame (height bridge, setTimeout), so the tab moves
  // for a moment - wait until it holds still, or the trusted click lands where
  // the tab used to be
  const singleTab = doc.querySelector('.code-example .code-example-tab[data-tab="code"]') as HTMLElement;
  let lastPos = '';
  let steady = 0;
  await waitFor(() => {
    const r = singleTab.getBoundingClientRect();
    const pos = `${r.top}|${r.left}`;
    steady = pos === lastPos ? steady + 1 : 0;
    lastPos = pos;
    return steady >= 3;
  }, 'code tab to stop moving');
  await clickSelector(doc, '.code-example .code-example-tab[data-tab="code"]');
  await waitFor(() => allBtn.textContent!.includes('Collapse all code'), 'toolbar follows a single card');
  await clickSelector(doc, '.code-example .code-example-tab[data-tab="code"]');
  await waitFor(() => allBtn.textContent!.includes('Expand all code'), 'toolbar follows the card back');
});

test('CodeExample fullscreen: the whole card fills the screen with the toolbar docked at the bottom', async () => {
  // the test page sits in an iframe without allow="fullscreen", so the request
  // is rejected and the card takes the data-fullscreen fixed-overlay fallback - the
  // same layout the native :fullscreen rules produce
  const { doc } = await openDocPage('sheet.html');
  await waitFor(() => doc.querySelector('.code-example[data-init]'), 'booted card');
  const card = doc.querySelector('.code-example[data-init]') as HTMLElement;
  const win = doc.defaultView!;
  card.scrollIntoView();
  (card.querySelector('.code-example-full') as HTMLElement).click();
  await waitFor(() => card.hasAttribute('data-fullscreen'), 'fullscreen fallback overlay');

  const tb = card.querySelector('.code-example-toolbar')!.getBoundingClientRect();
  const stage = card.querySelector('.preview')!.getBoundingClientRect();
  expect(win.getComputedStyle(card).position).toBe('fixed');
  expect(Math.round(tb.bottom), 'toolbar docks at the bottom edge').toBe(win.innerHeight);
  expect(stage.top, 'the stage sits above the toolbar').toBeLessThan(tb.top);
  expect(stage.height, 'the stage takes the remaining height').toBeGreaterThan(win.innerHeight * 0.5);
  expect(card.querySelector('.code-example-full')!.textContent).toContain('Exit fullscreen');

  // device modes keep working in fullscreen - and the canvas is no longer
  // pinned to 100%: the phone box is its own size with resize handles
  (card.querySelector('.code-example-vp[data-vp="phone"]') as HTMLElement).click();
  await waitFor(() => (card.querySelector('.code-example-screen') as HTMLElement).dataset.mode === 'phone', 'phone mode');
  const rz = card.querySelector('.code-example-resizer') as HTMLElement;
  expect(Math.round(rz.getBoundingClientRect().width), 'phone canvas keeps its own width').toBeLessThan(win.innerWidth);
  expect(rz.querySelectorAll('.resizer-handle').length, 'resize handles present').toBeGreaterThan(0);

  (card.querySelector('.code-example-full-exit') as HTMLElement).click();
  await waitFor(() => !card.hasAttribute('data-fullscreen'), 'exit fullscreen');
  expect(card.querySelector('.code-example-full')!.textContent).toContain('Fullscreen');
  (card.querySelector('.code-example-vp[data-vp="full"]') as HTMLElement).click();
});

test('accordion state contract: the CodeExample card exposes the schema State API end to end', async () => {
  // the doc demos are executable CodeExample fences now - the sandbox is an
  // opaque-origin iframe (sandbox="allow-scripts"), so the host-side contract
  // is the card's bound api + its mirrored data-state-values (§11). The
  // single-open click behavior itself is pinned in tests/e2e/accordion.e2e.ts.
  const { doc } = await openDocPage('accordion.html');

  const card = doc.querySelector('.code-example[data-component="accordion"]') as HTMLElement & {
    preview?: { setState(name: string, config?: Record<string, unknown>): void; getState(): { name: Record<string, unknown> } };
  };
  await waitFor(() => card?.preview, 'accordion example card to boot its sandbox');

  const mirrored = (): Record<string, unknown> => JSON.parse(card.dataset.stateValues || '{}') as Record<string, unknown>;
  card.preview!.setState('all-open');
  await waitFor(() => mirrored()['all-open'] === true, 'all-open to mirror onto the card');
  expect(mirrored()['all-closed'], 'all-closed is false while all-open').toBe(false);

  card.preview!.setState('default');
  await waitFor(() => mirrored()['all-open'] === false, 'default clears all-open');
});

test('presentation state contract: the CodeExample card drives the sandbox deck end to end', async () => {
  // same contract shape as the accordion test: the opaque sandbox is driven
  // through the host card's api; the mirrored data-state-values is assertable.
  const { doc } = await openDocPage('presentation.html');

  const card = doc.querySelector('.code-example[data-component="presentation"]') as HTMLElement & {
    // host card preview api: name is a SCHEMA state (slide/notes/fullscreen), config the
    // scalar editor value - the bridge maps it onto the runtime's own contract
    preview?: { setState(name: string, config?: unknown): void; getState(): { name: Record<string, unknown> } };
  };
  await waitFor(() => card?.preview, 'presentation example card to boot its sandbox');

  const mirrored = (): Record<string, unknown> => JSON.parse(card.dataset.stateValues || '{}') as Record<string, unknown>;
  card.preview!.setState('slide', 1);
  await waitFor(() => mirrored()['slide'] === '1' || mirrored()['slide'] === 1, 'slide 1 to mirror onto the card');

  card.preview!.setState('notes');
  await waitFor(() => mirrored()['notes'] === true, 'notes to mirror onto the card');

  card.preview!.setState('slide', 0);
  await waitFor(() => mirrored()['slide'] === '0' || mirrored()['slide'] === 0, 'back to slide 0');
  expect(mirrored()['notes'], 'notes survive a slide move').toBe(true);

  card.preview!.setState('notes', false);
  await waitFor(() => mirrored()['notes'] === false, 'notes cleared');
});

test('anim-canvas state contract: the CodeExample card drives the sandbox canvas end to end', async () => {
  // same contract shape as the presentation test: the canvas lives in the
  // opaque sandbox iframe, so arrow-key behavior itself is pinned in
  // tests/e2e/anim-canvas.e2e.ts; here the host card api + the mirrored
  // data-state-values prove the schema State API round-trip (§11).
  const { doc } = await openDocPage('anim-canvas.html');

  const card = doc.querySelector('.code-example[data-component="anim-canvas"]') as HTMLElement & {
    preview?: { setState(name: string, config?: unknown): void; getState(): { name: Record<string, unknown> } };
  };
  await waitFor(() => card?.preview, 'anim-canvas example card to boot its sandbox');

  const mirrored = (): Record<string, unknown> => JSON.parse(card.dataset.stateValues || '{}') as Record<string, unknown>;
  // initial observation: the authored data-active slide, no overview
  await waitFor(() => mirrored()['slide'] === 'ac-1', 'initial slide to mirror onto the card');
  expect(mirrored()['overview'], 'overview starts off').toBe(false);

  card.preview!.setState('slide', 'ac-2');
  await waitFor(() => mirrored()['slide'] === 'ac-2', 'slide ac-2 to mirror onto the card');

  card.preview!.setState('overview');
  await waitFor(() => mirrored()['overview'] === true, 'overview to mirror onto the card');

  card.preview!.setState('overview', false);
  await waitFor(() => mirrored()['overview'] === false, 'overview cleared');
  expect(mirrored()['slide'], 'slide survives the overview round-trip').toBe('ac-2');
});

test('switching to a font-bearing theme retypes the site (kodama-grove fonts)', async () => {
  const { doc } = await openDocPage('theming.html');
  const win = doc.defaultView as Window & {
    df$: { shadcn: { docs: { applyTheme?: (id: string) => void } } };
  };
  await waitFor(() => typeof win.df$.shadcn.docs.applyTheme === 'function', 'docs theme switcher to boot');
  const { body } = doc;
  const fontSans = () => getComputedStyle(doc.documentElement).getPropertyValue('--font-sans');

  // default rides the docs sheet (Geist) - not Merriweather
  expect(fontSans()).not.toContain('Merriweather');

  win.df$.shadcn.docs.applyTheme!('kodama-grove');
  // token mirror: inline overrides beat docs-theme.css's :root Geist block
  await waitFor(() => fontSans().includes('Merriweather'), 'theme font token to win the cascade');
  // the sidecar's font <link>s mount into the page <head>
  await waitFor(
    () => doc.querySelectorAll('link[data-df-theme-link="kodama-grove"]').length >= 3,
    'font links to mount',
  );
  // and the theme-sheet cascade really retypes the body
  await waitFor(
    () => getComputedStyle(body).fontFamily.includes('Merriweather'),
    'body to render in the theme font',
  );

  // back to default: inline overrides + links are gone (no font bleed)
  win.df$.shadcn.docs.applyTheme!('default');
  await waitFor(() => !fontSans().includes('Merriweather'), 'default restores Geist');
  await waitFor(() => doc.querySelectorAll('link[data-df-theme-link]').length === 0, 'links unmount');
});
