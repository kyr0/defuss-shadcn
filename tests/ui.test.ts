import { expect, test } from 'vitest';
import { clickSelector, openDocPage, waitFor } from './helpers.ts';
import { statsClaimText, type StatsDoc } from '../scripts/lib/stats.ts';

/** site.js/layout.js expose their globals under `df$` (no window globals). */
type DocsGlobal = Window & { df$: { shadcn: { docs: { realignWhenSettled?: (id: string) => void } } } };

/**
 * Why: end-to-end checks that the real doc-site UI — web components, SPA
 * router, and component interaction JS — actually work in a real browser
 * (Chromium via Playwright), loading the genuine pages from dist/.
 */

/** Header/sidebar are static markup now (defuss-ssg renders them per page). */
type HTMLElementOrNull = HTMLElement | null;

/** Why: sections render collapsed by default (only Introduction and the
 * active page's section are open) — tests that click a link expand its
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
  // holds them closed — checkVisibility() can't see the closed state, since
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

  // version badge now lives in the actions nav, left of the GitHub link,
  // separated from it (and from the icon buttons) by vertical separators
  const nav = doc.querySelector('.site-header nav');
  expect(nav, 'actions nav').toBeTruthy();
  const version: HTMLElementOrNull = nav!.querySelector('.header-version');
  expect(version, 'version badge in actions nav').toBeTruthy();
  expect(version!.textContent).toMatch(/^v\d+\.\d+\.\d+$/);
  const separators = nav!.querySelectorAll('.separator[data-orientation="vertical"]');
  expect(separators.length, 'version↔GitHub and GitHub↔buttons separators').toBe(2);
  expect(version!.nextElementSibling?.classList.contains('separator'), 'separator after version').toBe(true);
  const gh = nav!.querySelector<HTMLAnchorElement>('a[href*="github.com"]');
  expect(gh?.previousElementSibling?.classList.contains('separator'), 'separator before GitHub').toBe(true);
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

  // badge type must match the skill frontmatter (accordion is an ATM — verified
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

  // the router replaces <main> innerHTML — new page shows its own <h1>
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
  // the dialog demos are executable fences — the <dialog> lives inside the
  // opaque sandbox iframe, so the assertable contract is the card's mirrored
  // data-state-values (the sandbox observed the real `open` property).
  const { doc } = await openDocPage('dialog.html');

  const card = doc.querySelector('.code-example[data-component="dialog"]') as HTMLElement & {
    api?: { setState(name: string, config?: unknown): void };
  };
  await waitFor(() => card?.api, 'dialog example card to boot its sandbox');

  card.api!.setState('open', true);
  await waitFor(
    () => JSON.parse(card.dataset.stateValues || '{}').open === true,
    'dialog to open (mirrored)',
  );

  card.api!.setState('open', false);
  await waitFor(
    () => JSON.parse(card.dataset.stateValues || '{}').open === false,
    'dialog to close (mirrored)',
  );
});

test('index states the current stats.json footprint and dogfoods the Statistic component', async () => {
  // the machine-checked claim (verify's `stats claim` gate) proven in the real
  // browser too: what a visitor reads must equal what the build measured
  const stats = (await (await fetch('/dist/stats.json')).json()) as StatsDoc;

  const { doc } = await openDocPage('index.html');
  await waitFor(() => doc.querySelector('main h1') || doc.querySelector('.statistic'), 'index content');

  const normalized = doc.body!.textContent!.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  expect(normalized).toContain(statsClaimText(stats));

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

test('SPA router migrates body-level dialogs so triggers work after nav', async () => {
  // regression: PageOverlay dialogs live OUTSIDE <main> (direct children of
  // body). The router swaps main.innerHTML only, so without migrating them
  // the trigger click found no dialog and "nothing happened" after nav.
  // (dialog/sheet moved into self-contained CodeExample fences; the State API
  // guide page still demos the page-level pattern with a live dialog.)
  const { doc } = await openDocPage('index.html');
  await waitFor(() => doc.querySelector('.site-header button#theme-toggle'), 'shell to render');

  await expandSection(doc, 'Guides');
  await clickSelector(doc, '.site-sidebar a[href="state-api.html"]');
  await waitFor(() => doc.querySelector('main h1')?.textContent?.includes('State API'), 'state-api page content');
  await waitFor(() => doc.getElementById('state-api-dialog'), 'migrated dialog in DOM');

  const dialog = doc.getElementById('state-api-dialog') as HTMLDialogElement;
  expect(dialog.closest('main'), 'dialog must be adopted at body level').toBeNull();

  // plain CSS: the open button is the one whose inline handler names 'open'
  await clickSelector(doc, "button[onclick*=\"setState('open')\"]");
  await waitFor(() => dialog.open, 'dialog to open after SPA navigation');
  await clickSelector(doc, '#state-api-dialog [data-dialog-close]');
  await waitFor(() => !dialog.open, 'dialog to close');

  // navigating away must drop the previous page's dialogs (no duplicate ids)
  await clickSelector(doc, '.site-sidebar a[href="sheet.html"]');
  await waitFor(() => doc.querySelector('main h1')?.textContent?.includes('Sheet'), 'sheet page content');
  expect(doc.getElementById('state-api-dialog'), 'dialog of the previous page removed').toBeNull();
});

test('sidebar sections are collapsible (dogfood of the sidebar-group pattern)', async () => {
  const { doc } = await openDocPage('index.html');
  await waitFor(() => doc.querySelector('.site-header button#theme-toggle'), 'shell to render');
  // same-origin localStorage survives iframes — start from a clean slate
  doc.defaultView!.localStorage.removeItem('defuss-shadcn-nav-collapsed');

  // every nav section is a <details class="nav-section sidebar-group">
  const groups = [...doc.querySelectorAll('details.nav-section')] as HTMLDetailsElement[];
  expect(groups.length, 'nav renders collapsible sections').toBeGreaterThan(3);

  // collapsed-by-default contract: only Introduction (holding index.html) is open
  const intro = groups.find((g) => g.dataset.navSection === 'Introduction')!;
  expect(intro.open, 'Introduction section starts expanded').toBe(true);
  const forms = groups.find((g) => g.dataset.navSection === 'Forms & Inputs')!;
  expect(forms.open, 'other sections start collapsed').toBe(false);

  // clicking the summary expands the section and persists '1'
  expect(forms.querySelector('a[href="input.html"]'), 'section contains its links').toBeTruthy();
  await clickSelector(doc, 'details[data-nav-section="Forms & Inputs"] > summary');
  await waitFor(() => forms.open, 'Forms & Inputs to expand');
  // `open` flips synchronously on click but the toggle event (which persists
  // to localStorage) is a queued task — wait on the stored value itself
  await waitFor(
    () => (doc.defaultView!.localStorage.getItem('defuss-shadcn-nav-collapsed') ?? '').includes('"Forms & Inputs":"1"'),
    'expand to persist to localStorage',
  );

  // collapsing again persists '0' — an explicit choice either way
  await clickSelector(doc, 'details[data-nav-section="Forms & Inputs"] > summary');
  await waitFor(() => !forms.open, 'Forms & Inputs to collapse');
  await waitFor(
    () => (doc.defaultView!.localStorage.getItem('defuss-shadcn-nav-collapsed') ?? '').includes('"Forms & Inputs":"0"'),
    'collapse to persist to localStorage',
  );

  // SPA-navigating INTO the collapsed section re-opens it (never hide the page you opened)
  await clickSelector(doc, '.site-sidebar a[href="input.html"]');
  await waitFor(() => doc.querySelector('main h1')?.textContent?.includes('Input'), 'input page content');
  await waitFor(() => forms.open, 'collapsed section to reopen on navigation into it');
  await waitFor(
    () => (doc.defaultView!.localStorage.getItem('defuss-shadcn-nav-collapsed') ?? '').includes('"Forms & Inputs":"1"'),
    're-open to persist the new state',
  );
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
  // the delta — landing the heading UNDER the sticky bar. The click assertion
  // below can't catch that (scrollIntoView honors the same stale pad), so pin
  // the invariant directly: ResizeObserver keeps scroll-padding-top >= stack.
  const stackPx = () =>
    (doc.querySelector('.site-header')?.getBoundingClientRect().height ?? 0) +
    (doc.querySelector('.page-header')?.getBoundingClientRect().height ?? 0);
  // determinism: the swap is what grows the stack — assert only after it, or
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
  // typography samples) — the § must never be stamped there
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
  // no aria-describedby — sighted users see the hint, screen-reader users
  // heard nothing. The pattern is gated by verify's `field description wiring`;
  // this proves it in the rendered page.
  const { doc } = await openDocPage('label.html');

  const input = doc.querySelector('#demo-username') as HTMLInputElement;
  const descId = input.getAttribute('aria-describedby');
  expect(descId, 'input must reference a description id').toBeTruthy();

  const desc = doc.getElementById(descId!);
  expect(desc?.classList.contains('field-description'), 'referenced element is the field description').toBe(true);
  expect(desc?.textContent, 'description carries the help text').toContain('public display name');
});

test('code collapse-all toggles every snippet block — including the standalone CSS/JS source sections', async () => {
  // regression: initCodeCollapse paired toggles with ".preview's next sibling"
  // only, so the CSS/JS source sections at the bottom of each page had no
  // toggle and "Collapse all code" visibly did nothing for them.
  const { doc } = await openDocPage('sheet.html');

  await waitFor(() => doc.querySelector('.code-collapse-toolbar'), 'code collapse toolbar');

  const main = doc.querySelector('main')!;
  const wrappers = [...main.querySelectorAll('.code-block-wrapper')];
  const toggles = [...main.querySelectorAll('.code-toggle-btn')];
  // every snippet wrapper (copy-btn + <pre> div) on the page got a toggle...
  // (examples are CodeExample fences now — their source lives in the card's
  // textarea, not a .code-block-wrapper — so this page's wrappers are the
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

  // collapse all → every wrapper hidden again (display:none via .code-collapsed)
  await clickSelector(doc, '.code-collapse-all-btn');
  await waitFor(
    () => wrappers.every((w) => w.classList.contains('code-collapsed')),
    'all code blocks to collapse',
  );
  wrappers.forEach((w) => expect(win.getComputedStyle(w).display).toBe('none'));
});

test('accordion state contract: the CodeExample card exposes the schema State API end to end', async () => {
  // the doc demos are executable CodeExample fences now — the sandbox is an
  // opaque-origin iframe (sandbox="allow-scripts"), so the host-side contract
  // is the card's bound api + its mirrored data-state-values (§11). The
  // single-open click behavior itself is pinned in tests/e2e/accordion.e2e.ts.
  const { doc } = await openDocPage('accordion.html');

  const card = doc.querySelector('.code-example[data-component="accordion"]') as HTMLElement & {
    api?: { setState(name: string, config?: Record<string, unknown>): void; getState(): { name: Record<string, unknown> } };
  };
  await waitFor(() => card?.api, 'accordion example card to boot its sandbox');

  const mirrored = (): Record<string, unknown> => JSON.parse(card.dataset.stateValues || '{}') as Record<string, unknown>;
  card.api!.setState('all-open');
  await waitFor(() => mirrored()['all-open'] === true, 'all-open to mirror onto the card');
  expect(mirrored()['all-closed'], 'all-closed is false while all-open').toBe(false);

  card.api!.setState('default');
  await waitFor(() => mirrored()['all-open'] === false, 'default clears all-open');
});
