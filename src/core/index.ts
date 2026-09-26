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
  animateCount,
  anim,
  bindGlobalKeys,
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
    animateCount: typeof animateCount;
    clampIndex: typeof clampIndex;
    coerceIndex: typeof coerceIndex;
    presentationScope: typeof presentationScope;
    revealAttr: typeof revealAttr;
    entrance: typeof entrance;
    draw: typeof draw;
    anim: typeof anim;
    bindGlobalKeys: typeof bindGlobalKeys;
    loadTheme: typeof loadTheme;
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
  // theme resource loader (theme/<id>.json sidecars, built from themes.ts)
  loadTheme,
};

// -- the imperative animation registry on the callable itself: df$.anim.* is
// the public surface agents and decks drive (df$.anim.fadeIn.play(el)); core
// is the only legal installer, components never extend df$ (§2.1).
Reflect.set(df, 'anim', anim);
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
  loadTheme,
  clampIndex,
  coerceIndex,
});
