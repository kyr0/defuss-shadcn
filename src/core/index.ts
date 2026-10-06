/**
 * Why: the core runtime artifact (§2.6 step 1 of
 * plans/defuss-query-morph-integration.md) - ONE defuss-morph + ONE defuss-query +
 * the defuss-shadcn-shared layer, composed explicitly through query's
 * createDf$ injection boundary (never a patch of either engine, never query's
 * auto-created library instance). Bundled to dist/components/core.js by
 * scripts/bundle.ts and embedded FIRST inside all.js.
 *
 * Initialization order inside the distribution is morph → query → shared →
 * components. ONLY this bootstrap installs globalThis.df$ (§2.1): components
 * own their df$.shadcn APIs/state and never replace df$ or extend df$.fn.
 * Docs-only code lives outside this graph entirely (verify's `core
 * allow-list` gate).
 */
import * as morph from 'defuss-morph';
import { createDf$ } from 'defuss-query/core';
import {
  textLocale,
  animateCount,
  anim,
  bindGlobalKeys,
  isEditableTarget,
  clampIndex,
  coerceIndex,
  debounce,
  defussGlobals,
  draw,
  entrance,
  installDdf,
  loadTheme,
  presentationScope,
  revealAttr,
  safeShowPopover,
  defussQuery,
  captureAuthored,
  componentState,
  bindComponent,
  unbindComponent,
  computed,
  createStore,
  persisted,
  reload,
  forget,
  persistOk,
  viewPersistence,
  dataSource,
  parseFilter,
  filterText,
  cycleSort,
  createDataview,
  evaluateDataview,
  addRows,
  removeRows,
  updateRows,
  setParent,
  virtualWindow,
  sizerHeight,
  scrollTopFor,
  scrollIntoViewTop,
  elementModel,
  renderModel,
  SHARED_ABI,
} from '../shared/index.js';

/** The df$.shadcn namespace core prepares (§2.1): shared layer + registries. */
type ShadcnNamespace = {
  shared?: {
    abi: string;
    defussGlobals: () => unknown;
    safeShowPopover: (el: HTMLElement) => void;
    defussQuery: () => unknown;
    debounce: (fn: (...args: unknown[]) => void, wait: number) => unknown;
    textLocale: typeof textLocale;
    animateCount: typeof animateCount;
    clampIndex: typeof clampIndex;
    coerceIndex: typeof coerceIndex;
    presentationScope: typeof presentationScope;
    revealAttr: typeof revealAttr;
    entrance: typeof entrance;
    draw: typeof draw;
    anim: typeof anim;
    bindGlobalKeys: typeof bindGlobalKeys;
    isEditableTarget: typeof isEditableTarget;
    loadTheme: typeof loadTheme;
    elementModel: typeof elementModel;
    renderModel: typeof renderModel;
    componentState: typeof componentState;
    bindComponent: typeof bindComponent;
    unbindComponent: typeof unbindComponent;
    createStore: typeof createStore;
    computed: typeof computed;
    persisted: typeof persisted;
    reload: typeof reload;
    forget: typeof forget;
    persistOk: typeof persistOk;
    viewPersistence: typeof viewPersistence;
    dataSource: typeof dataSource;
    parseFilter: typeof parseFilter;
    filterText: typeof filterText;
    cycleSort: typeof cycleSort;
    virtualWindow: typeof virtualWindow;
    sizerHeight: typeof sizerHeight;
    scrollTopFor: typeof scrollTopFor;
    scrollIntoViewTop: typeof scrollIntoViewTop;
  };
  docs?: Record<string, unknown>;
  [key: string]: unknown;
};

// -- guarded bootstrap (§2.1): must run before this module installs anything.
// A df$ that already exists - our own re-executed bootstrap (distinct URL /
// classic re-include), core loaded alongside all, or a foreign runtime - is a
// configuration error: reject without overwriting it, creating a second
// registry or adopting an unqualified runtime. The throw leaves the original
// factory, handlers and state untouched (§5.3 "Bootstrap failures").
// Note: the bundled morph/query modules evaluate before this body by ESM
// semantics; both library entries are side-effect-free, so nothing is
// installed before the guard runs.
const existing: unknown = Reflect.get(globalThis, 'df$');
if (existing !== undefined) {
  throw new Error(
    'defuss-shadcn core: globalThis.df$ is already defined - load core OR all, never both and never twice',
  );
}

// compose the callable from THIS bundled morph instance (§2.6 step 1) and
// publish it; after this point defussQuery() in the shared layer validates it
const df = createDf$(morph);
Reflect.set(globalThis, 'df$', df);

// -- component-shared layer (§2.1): installed ONCE at df$.shadcn.shared.
// Component registries ({name}Api / {name}States / toast) and docs data
// (df$.shadcn.docs) join the same namespace as their owners load - core never
// prepopulates component-specific or docs state.
const shadcn = ((df as { shadcn?: ShadcnNamespace }).shadcn ??= {});
shadcn.shared = {
  abi: SHARED_ABI,
  defussGlobals,
  safeShowPopover,
  defussQuery,
  debounce,
  // the locale numbers and dates are formatted in: the text's (nearest [lang]), else 'en'
  textLocale,
  // presentation machinery - the same functions ddf$ publishes below; the
  // emitted component binding (component-shared-binding.js) reads exactly
  // these names off this object.
  animateCount,
  clampIndex,
  coerceIndex,
  presentationScope,
  revealAttr,
  // motion controller (components/motion/motion.css owns the keyframes)
  entrance,
  draw,
  // imperative animation engine (src/shared/anim.ts) - also the df$.anim surface
  anim,
  // shared global-key API (src/shared/keys.ts) - one document listener
  bindGlobalKeys,
  isEditableTarget,
  // theme resource loader (theme/<id>.json sidecars, built from themes.ts)
  loadTheme,
  // render() machinery (src/shared/render.ts): markup model + state render
  elementModel,
  renderModel,
  // the State API on a store per element (src/shared/component-state.ts)
  componentState,
  bindComponent,
  unbindComponent,
  // stores + Web Storage persistence (src/shared/store.ts) - also df$.store
  createStore,
  computed,
  persisted,
  reload,
  forget,
  persistOk,
  viewPersistence,
  // the big-data layer (src/shared/dataview.ts + virtual.ts) - also df$.dataview
  dataSource,
  parseFilter,
  filterText,
  cycleSort,
  virtualWindow,
  sizerHeight,
  scrollTopFor,
  scrollIntoViewTop,
};

// -- df$.store: the one store primitive for pages and apps - observable
// values (defuss-store), and values kept in local / session storage
// (validated, memory fallback) - core is the only legal installer (§2.1)
Reflect.set(df, 'store', { create: createStore, computed, persisted });

// -- df$.dataview: query plain row arrays - filter, multisort, page, walk a
// tree (defuss-dataview) - through a cached source, the same engine the
// virtual list, data tree and data grid run on
Reflect.set(df, 'dataview', {
  source: dataSource,
  parseFilter,
  cycleSort,
  create: createDataview,
  evaluate: evaluateDataview,
  addRows,
  removeRows,
  updateRows,
  setParent,
});

// -- the imperative animation registry on the callable itself: df$.anim.* is
// the public surface agents and decks drive (df$.anim.fadeIn.play(el)); core
// is the only legal installer, components never extend df$ (§2.1).
Reflect.set(df, 'anim', anim);

// -- the authored markup render() starts from (src/shared/render.ts): the
// page as parsed, captured before any component runs, and every subtree
// added later - this observer is created before any component's, and
// MutationObserver callbacks run in creation order, so it sees new nodes
// first. Components read it through elementModel().
if (typeof document !== 'undefined') {
  const captureAll = (): void => {
    if (document.body) captureAuthored(document.body);
    new MutationObserver((records) => {
      for (const r of records) for (const n of r.addedNodes) if (n.nodeType === Node.ELEMENT_NODE) captureAuthored(n as Element);
    }).observe(document, { childList: true, subtree: true });
  };
  if (document.body) captureAll();
  else document.addEventListener('DOMContentLoaded', captureAll, { once: true });
}
shadcn.anim = anim;

// -- the shared library's public alias: `ddf$` (guarded, installed once by the
// same bootstrap). df$ stays the callable query runtime; ddf$ is the flat
// helper namespace decks and agents use imperatively (presentation scope,
// counters, the reveal vocabulary). Same release stamp as the shared layer.
installDdf({
  abi: SHARED_ABI,
  defussGlobals,
  safeShowPopover,
  defussQuery,
  debounce,
  presentation: presentationScope,
  animateCount,
  revealAttr,
  entrance,
  draw,
  anim,
  bindGlobalKeys,
  isEditableTarget,
  loadTheme,
  clampIndex,
  coerceIndex,
});
