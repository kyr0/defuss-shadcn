import { expect, test } from 'vitest';
import { clickSelector, openDocPage, waitFor } from './helpers.ts';
import { statsClaimText, type StatsDoc } from '../scripts/lib/stats.ts';

/** site.js/layout.js expose their globals under `_defussShadcn` (no window globals). */
type DocsGlobal = Window & { _defussShadcn: { docs: { realignWhenSettled?: (id: string) => void } } };

/**
 * Why: end-to-end checks that the real doc-site UI — web components, SPA
 * router, and component interaction JS — actually work in a real browser
 * (Chromium via Playwright), loading the genuine pages from dist/.
 */

/** Header/sidebar are static markup now (defuss-ssg renders them per page). */
type HTMLElementOrNull = HTMLElement | null;

test('site shell renders header and sidebar from layout.js web components', async () => {
  const { doc } = await openDocPage('index.html');

  // header/sidebar are static markup rendered by defuss-ssg
  await waitFor(() => doc.querySelector('.site-header button#theme-toggle'), 'site-header to render');
  // checkVisibility() runs in the iframe's document, since Vitest's ARIA-based
  // expect.element doesn't traverse into child frames reliably.
  const navLink: HTMLElementOrNull = doc.querySelector('.site-sidebar a[href="accordion.html"]');
  expect(navLink, 'sidebar link to Accordion').toBeTruthy();
  expect(navLink!.checkVisibility({ opacityProperty: true, visibilityProperty: true })).toBe(true);
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

test('dialog component: trigger opens native <dialog>, close button closes it', async () => {
  const { frame, doc } = await openDocPage('dialog.html');

  await expect.element(frame.getByRole('button', { name: 'Edit Profile' })).toBeInTheDocument();

  const dialog = doc.getElementById('demo-dialog') as HTMLDialogElement;
  expect(dialog.open).toBe(false);

  await clickSelector(doc, '[data-dialog-trigger="demo-dialog"]');
  await waitFor(() => dialog.open, 'dialog to open');

  // Cancel is inside this dialog only — safe to target by data attribute
  await clickSelector(doc, '#demo-dialog [data-dialog-close]');
  await waitFor(() => !dialog.open, 'dialog to close');
  // dialog.js restores focus to the trigger on close
  await waitFor(
    () => doc.activeElement === doc.querySelector('[data-dialog-trigger="demo-dialog"]'),
    'focus to return to trigger',
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
  // regression: <dialog> demos live OUTSIDE <main> (direct children of body).
  // The router swaps main.innerHTML only, so without migrating them the
  // trigger click found no dialog and "nothing happened" after sidebar nav.
  const { doc } = await openDocPage('index.html');
  await waitFor(() => doc.querySelector('.site-header button#theme-toggle'), 'shell to render');

  await clickSelector(doc, '.site-sidebar a[href="dialog.html"]');
  await waitFor(() => doc.querySelector('main h1')?.textContent?.includes('Dialog'), 'dialog page content');
  await waitFor(() => doc.getElementById('demo-dialog'), 'migrated dialog in DOM');

  const dialog = doc.getElementById('demo-dialog') as HTMLDialogElement;
  expect(dialog.closest('main'), 'dialog must be adopted at body level').toBeNull();

  await clickSelector(doc, '[data-dialog-trigger="demo-dialog"]');
  await waitFor(() => dialog.open, 'dialog to open after SPA navigation');
  await clickSelector(doc, '#demo-dialog [data-dialog-close]');
  await waitFor(() => !dialog.open, 'dialog to close');

  // navigating away must drop the previous page's dialogs (no duplicate ids)
  await clickSelector(doc, '.site-sidebar a[href="sheet.html"]');
  await waitFor(() => doc.querySelector('main h1')?.textContent?.includes('Sheet'), 'sheet page content');
  expect(doc.getElementById('demo-dialog'), 'dialog of the previous page removed').toBeNull();
});

test('sidebar sections are collapsible (dogfood of the sidebar-group pattern)', async () => {
  const { doc } = await openDocPage('index.html');
  await waitFor(() => doc.querySelector('.site-header button#theme-toggle'), 'shell to render');
  // same-origin localStorage survives iframes — start from a clean slate
  doc.defaultView!.localStorage.removeItem('defuss-shadcn-nav-collapsed');

  // every nav section is a <details class="nav-section sidebar-group">
  const groups = [...doc.querySelectorAll('details.nav-section')] as HTMLDetailsElement[];
  expect(groups.length, 'nav renders collapsible sections').toBeGreaterThan(3);
  expect(groups[0].open, 'sections start expanded').toBe(true);

  // clicking the summary collapses the section and persists it
  const forms = groups.find((g) => g.dataset.navSection === 'Forms & Inputs')!;
  expect(forms.querySelector('a[href="input.html"]'), 'section contains its links').toBeTruthy();
  await clickSelector(doc, 'details[data-nav-section="Forms & Inputs"] > summary');
  await waitFor(() => !forms.open, 'Forms & Inputs to collapse');
  // `open` flips synchronously on click but the toggle event (which persists
  // to localStorage) is a queued task — wait on the stored value itself
  await waitFor(
    () => (doc.defaultView!.localStorage.getItem('defuss-shadcn-nav-collapsed') ?? '').includes('Forms & Inputs'),
    'collapse to persist to localStorage',
  );

  // SPA-navigating INTO the collapsed section re-opens it (never hide the page you opened)
  await clickSelector(doc, '.site-sidebar a[href="input.html"]');
  await waitFor(() => doc.querySelector('main h1')?.textContent?.includes('Input'), 'input page content');
  await waitFor(() => forms.open, 'collapsed section to reopen on navigation into it');
  await waitFor(
    () => !(doc.defaultView!.localStorage.getItem('defuss-shadcn-nav-collapsed') ?? '').includes('Forms & Inputs'),
    're-open to clear the stored collapse',
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
  const pad = padPx(win);
  expect(pad).toBeGreaterThan(64);

  // clicking a mid-page TOC entry rests the heading exactly at scroll-padding-top
  await clickSelector(doc, '.toc-link[href="#toc-radius-scale"]');
  const heading = doc.getElementById('toc-radius-scale')!;
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
  expect(typeof win._defussShadcn.docs.realignWhenSettled).toBe('function');
  const heading = doc.getElementById('toc-chart-tokens')!;
  const realign = win._defussShadcn.docs.realignWhenSettled!;

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
  expect(wrappers.length).toBeGreaterThanOrEqual(6); // 4 examples + CSS + JS
  expect(toggles.length).toBe(wrappers.length);
  // ...including the two standalone source sections (old bug: these were missed)
  const cssWrapper = doc.querySelector('#source-css .copy-btn')!.parentElement!;
  const jsWrapper = doc.querySelector('#source-js .copy-btn')!.parentElement!;
  expect(cssWrapper.classList.contains('code-block-wrapper'), 'CSS source section is collapsible').toBe(true);
  expect(jsWrapper.classList.contains('code-block-wrapper'), 'JS source section is collapsible').toBe(true);

  const win = doc.defaultView!;
  const allBtn = doc.querySelector('.code-collapse-all-btn')!;

  // collapse all → every wrapper hidden (display:none via .code-collapsed)
  await clickSelector(doc, '.code-collapse-all-btn');
  await waitFor(
    () => wrappers.every((w) => w.classList.contains('code-collapsed')),
    'all code blocks to collapse',
  );
  wrappers.forEach((w) => expect(win.getComputedStyle(w).display).toBe('none'));
  expect(allBtn.textContent, 'button offers expand-all afterwards').toContain('Expand all code');

  // expand all → nothing hidden, individual toggles back in sync
  await clickSelector(doc, '.code-collapse-all-btn');
  await waitFor(
    () => wrappers.every((w) => !w.classList.contains('code-collapsed')),
    'all code blocks to expand',
  );
  wrappers.forEach((w) => expect(win.getComputedStyle(w).display).not.toBe('none'));
  expect(toggles.every((t) => t.getAttribute('aria-expanded') === 'true'), 'per-block toggles in sync').toBe(true);
});

test('accordion single-open: opening one item closes its siblings', async () => {
  const { doc } = await openDocPage('accordion.html');

  const single = doc.querySelector('.accordion[data-type="single"]') as HTMLElement;
  const items = [...single.querySelectorAll('.accordion-item')] as HTMLDetailsElement[];
  expect(items.length).toBe(3);

  // first item is open by default; click the second item's summary
  expect(items[0].open).toBe(true);
  await clickSelector(doc, '.accordion[data-type="single"] .accordion-item:nth-of-type(2) > summary');

  await waitFor(() => items[1].open, 'second item to open');
  // accordion.js single-open handler must have closed the first item
  await waitFor(() => !items[0].open, 'first item to close');
});
