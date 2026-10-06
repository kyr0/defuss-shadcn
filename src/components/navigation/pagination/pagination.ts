// -- Pagination -----------------------------------------------
// Window renderer for the static pagination markup. The nav carries its
// contract as data attributes (data-active-page / -min-page / -max-page /
// -page-display-count); this script computes the link window around the
// active page, keeps prev/next honest, and turns link clicks + the
// next()/back() action events into page changes (AGENTS.md "State API").
//
// Attribute-driven on purpose: the sandbox bridge mutates DOM natively, so
// writing data-active-page (panel editor) must visibly re-render - the
// MutationObserver below is that bridge between "attribute changed" and
// "window recomputed". The authored markup stays fully functional without
// this file (progressive enhancement); the script only adds the window
// math and the interaction.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
// defussQuery: the window is (re)rendered through keyed morph (plans/
// defuss-query-morph-integration.md §3: link nodes keep identity across a
// page change - focus survives).
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

// VERIFIED: (verify's component types ratchet - tsc -p tsconfig.components.json) every type
// this file's API docs state - arguments, return values, event details - holds
// against its code: a wrong one is a new type error and fails the build.

/** What pagination-change carries. */
interface PaginationChangeDetail {
  /** the page now active, clamped to data-min / data-max */
  page: number;
}

const paginationStates = ['default'];

/** setState() configs per state (getState() reports the live page and range). */
export interface PaginationStateConfigs {
  /** The links for the current page and range. */
  default: {
    /** the page to make active (clamped to the range) */
    activePage?: number;
    /** the same as activePage (when activePage is not given) */
    page?: number;
    /** the first page */
    minPage?: number;
    /** the last page */
    maxPage?: number;
    /** how many page links show at once (default 5) */
    pageDisplayCount?: number;
  };
}

/** Read one numeric data attribute (camelCase key) with a fallback. */
const numAttr = (el: HTMLElement, key: string, fallback: number): number => {
  const v = parseInt(el.dataset[key] ?? '', 10);
  return Number.isFinite(v) ? v : fallback;
};

/**
 * Render the link window between the authored prev/next items: `count`
 * consecutive page links containing the active page (clamped to the range,
 * ellipsis where pages are skipped). Idempotent: running it twice on the
 * same attribute state produces the same DOM (morph keys by data-page).
 */
function renderWindow(nav: HTMLElement): void {
  const list = dfDollar(nav).find('.pagination-list').get(0);
  const prev = dfDollar(nav).find('.pagination-prev').get(0);
  const next = dfDollar(nav).find('.pagination-next').get(0);
  const prevLi = prev?.closest('li') ?? null;
  const nextLi = next?.closest('li') ?? null;
  if (!list || !prev || !next || !prevLi || !nextLi) return;
  const min = Math.max(1, numAttr(nav, 'minPage', 1));
  const max = Math.max(min, numAttr(nav, 'maxPage', 1));
  const active = Math.min(max, Math.max(min, numAttr(nav, 'activePage', min)));
  // native disabled affordance the CSS already styles (aria-disabled leg)
  dfDollar(prev).attr('aria-disabled', active <= min ? 'true' : null);
  dfDollar(next).attr('aria-disabled', active >= max ? 'true' : null);
  if (!nav.hasAttribute('data-active-page')) return; // authored window: untouched

  const count = Math.max(1, numAttr(nav, 'pageDisplayCount', 5));
  // guard the write: a same-value setAttribute STILL fires a MutationObserver
  // record - unguarded, the attribute MO below would re-render forever
  if (nav.dataset.activePage !== String(active)) nav.dataset.activePage = String(active);
  // window start: center `active` in `count` slots, slide to stay in range
  const start = Math.max(min, Math.min(active - Math.floor((count - 1) / 2), max - count + 1));
  const end = Math.min(max, start + count - 1);

  // 1. the current window (everything between the authored prev/next items):
  //    page links that stay visible MOVE (node identity → focus survives),
  //    everything else leaves the document
  const survivors = new Map<number, HTMLElement>();
  let n = prevLi.nextSibling as ChildNode | null;
  while (n && n !== nextLi) {
    const node = n as HTMLElement;
    n = n.nextSibling as ChildNode | null;
    const page = node.nodeType === Node.ELEMENT_NODE ? dfDollar(node).find('.pagination-link[data-page]').attr('data-page') : null;
    const p = page ? parseInt(page, 10) : NaN;
    if (Number.isFinite(p) && p >= start && p <= end) {
      node.remove(); // detach, then re-insert in order below
      survivors.set(p, node);
    } else node.remove();
  }

  // 2. build the ordered window (fresh nodes for pages that appear) and insert
  //    everything before the authored next item - .before() is the sanctioned
  //    move op (AGENTS.md DOM boundary), inserted in order so it lands sorted
  for (const node of windowNodes(start, end, min, max, active, survivors)) dfDollar(nextLi).before(node);
}

/**
 * Ordered <li> nodes for the window [start, end]: leading/trailing ellipsis
 * when pages are skipped, reused nodes from `survivors` where a page stays
 * visible, fresh (data-page-keyed) nodes otherwise. Active page is rebuilt
 * every time (its class/aria are the state - a reused node could be stale).
 */
function windowNodes(
  start: number,
  end: number,
  min: number,
  max: number,
  active: number,
  survivors: Map<number, HTMLElement>,
): HTMLElement[] {
  const out: HTMLElement[] = [];
  const ellipsis = () => {
    const li = document.createElement('li');
    const s = document.createElement('span');
    s.className = 'pagination-ellipsis';
    s.setAttribute('aria-hidden', 'true');
    s.textContent = '…';
    li.append(s);
    return li;
  };
  const pageLink = (p: number): HTMLElement => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'pagination-link' + (p === active ? ' pagination-active' : '');
    a.href = '#';
    a.dataset.page = String(p);
    if (p === active) a.setAttribute('aria-current', 'page');
    a.textContent = String(p);
    li.append(a);
    return li;
  };
  if (start > min) out.push(ellipsis());
  for (let p = start; p <= end; p++) {
    if (p === active || !survivors.has(p)) out.push(pageLink(p));
    else {
      // reused link: drop stale active markers (it WAS the active page before
      // this render - its class/aria are now wrong)
      const node = survivors.get(p)!;
      const a = dfDollar(node).find('a').get(0);
      a?.classList.remove('pagination-active');
      a?.removeAttribute('aria-current');
      out.push(node);
    }
  }
  if (end < max) out.push(ellipsis());
  return out;
}

/**
 * Move the active page by a delta (clamped) and re-render - the single path
 * for link clicks, prev/next clicks and the next()/back() action events.
 */
function setPage(nav: HTMLElement, page: number): void {
  const min = Math.max(1, numAttr(nav, 'minPage', 1));
  const max = Math.max(min, numAttr(nav, 'maxPage', 1));
  const next = Math.min(max, Math.max(min, page));
  if (next === numAttr(nav, 'activePage', min)) return;
  nav.dataset.activePage = String(next); // the attribute MO re-renders
  // Fires when the user changes the page (a link, the arrows) - the new page.
  nav.dispatchEvent(new CustomEvent<PaginationChangeDetail>('pagination-change', { bubbles: true, detail: { page: next } }));
}

/**
 * UI side of setState: 'default' applies an optional { page|activePage,
 * minPage, maxPage, pageDisplayCount } config onto the attributes (the MO
 * re-renders). Without config it just re-renders the current contract.
 */
/**
 * The pager attributes a config names - only where they differ from what the
 * markup already says (getState() reports the defaults - page 1, 5 slots -
 * even when none was authored): setState(getState()) changes nothing.
 */
function applyConfig(nav: HTMLElement, config: Record<string, unknown>): void {
  const a = config.activePage ?? config.page;
  if (a !== undefined && numAttr(nav, 'activePage', 1) !== Number(a)) nav.dataset.activePage = String(a);
  if (config.minPage !== undefined && numAttr(nav, 'minPage', 1) !== Number(config.minPage)) nav.dataset.minPage = String(config.minPage);
  if (config.maxPage !== undefined && numAttr(nav, 'maxPage', 1) !== Number(config.maxPage)) nav.dataset.maxPage = String(config.maxPage);
  if (config.pageDisplayCount !== undefined && numAttr(nav, 'pageDisplayCount', 5) !== Number(config.pageDisplayCount)) nav.dataset.pageDisplayCount = String(config.pageDisplayCount);
}

/** The markup of a state, for render(): the same config + window render the
 *  live nav runs on setState, on a detached copy of the authored markup. */
function applyMarkup(nav: HTMLElement, config: Record<string, unknown> = {}): void {
  applyConfig(nav, config);
  if (nav.hasAttribute('data-active-page')) renderWindow(nav);
}

function triggerStateChange(nav: HTMLElement, stateName: string, config: Record<string, unknown> = {}): void {
  if (stateName !== 'default') return;
  applyConfig(nav, config);
  // the same opt-in as init: only a data-driven nav is re-rendered - an
  // authored one stays exactly as written
  if (nav.hasAttribute('data-active-page')) renderWindow(nav);
}

/** Registry-level API; pass the nav element explicitly. Unknown names throw. */
export const paginationApi = componentState({
  component: 'pagination',
  states: paginationStates,
  apply: (nav, state) => triggerStateChange(nav, state.name, state.config),
  read: (nav, state) => {
    // reflect reality: clicks and actions move the page without setState()
    return {
      name: nav.dataset.stateName || 'default',
      config: {
        ...state.config,
        activePage: numAttr(nav, 'activePage', 1),
        minPage: numAttr(nav, 'minPage', 1),
        maxPage: numAttr(nav, 'maxPage', 1),
        pageDisplayCount: numAttr(nav, 'pageDisplayCount', 5),
      },
    };
  },
  markup: (el, state) => applyMarkup(el as HTMLElement, state.config),
});

df$.paginationApi = paginationApi;
df$.paginationStates = paginationStates;

function init(): void {
  (dfDollar('.pagination:not([data-init])').toArray() as HTMLElement[]).forEach((nav) => {
    nav.dataset.init = '';
    // el.store + el.api (AGENTS.md "State through stores")
    bindComponent(nav, paginationApi);

    // opt-in: only a data-driven nav (one that declares its contract with
    // data-active-page) gets its window rendered - plain authored markup is
    // left exactly as written (progressive enhancement)
    if (nav.hasAttribute('data-active-page')) renderWindow(nav);
    // attribute-driven re-render: panel edits (bridge writes the data attrs)
    // and setState both land here - the attributes ARE the state
    new MutationObserver(() => {
      if (nav.hasAttribute('data-active-page')) renderWindow(nav);
    }).observe(nav, {
      attributes: true,
      attributeFilter: ['data-active-page', 'data-min-page', 'data-max-page', 'data-page-display-count', 'data-size'],
    });

    // one delegated click path: page links jump, prev/next step (href="#"
    // would jump to the top - the component owns the interaction)
    nav.addEventListener('click', (e) => {
      const link = (e.target as HTMLElement).closest<HTMLElement>('.pagination-link[data-page], .pagination-prev, .pagination-next');
      if (!link) return;
      e.preventDefault();
      if (link.classList.contains('pagination-link')) {
        setPage(nav, parseInt(link.dataset.page ?? '1', 10));
      } else if (link.classList.contains('pagination-prev')) {
        setPage(nav, numAttr(nav, 'activePage', 1) - 1);
      } else {
        setPage(nav, numAttr(nav, 'activePage', 1) + 1);
      }
    });
    // action vocabulary (CodeExample Actions tab dispatches these on the nav)
    nav.addEventListener('pagination-next', () => setPage(nav, numAttr(nav, 'activePage', 1) + 1));
    nav.addEventListener('pagination-prev', () => setPage(nav, numAttr(nav, 'activePage', 1) - 1));
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
