/**
 * Why: the defuss-shadcn-shared layer entry (§2.5 of
 * plans/defuss-query-morph-integration.md) - the component-only shared runtime,
 * bundled exactly once into core and installed at df$.shadcn.shared. The
 * export list is explicit and reviewed: every name has actual cross-component
 * consumers (defussGlobals/safeShowPopover) or is the core bootstrap surface
 * (defussQuery/SHARED_ABI) or a general utility consumers bind to (debounce).
 * Docs-only code must never import from here - at runtime it reaches these
 * functions through df$.shadcn.shared instead (verify's `core allow-list` gate
 * enforces the membership).
 */
export { debounce, type Debounced } from './debounce.js';
export { bindGlobalKeys, isEditableTarget, type GlobalKeyHandler, type GlobalKeyOptions } from './keys.js';
export { defussGlobals, safeShowPopover } from './state-api.js';
export { defussQuery, RUNTIME_INCOMPLETE, type HostQuery } from './query.js';
export { SHARED_ABI } from './version.js';
// presentation machinery - the shared-library helpers core also publishes
// under the global `ddf$` alias (installDdf runs in the core bootstrap).
export {
  animateCount,
  clampIndex,
  coerceIndex,
  installDdf,
  presentationScope,
  revealAttr,
  REVEAL_DIRECTIONS,
  PRESENTATION_NOT_INITIALIZED,
  type CountOptions,
  type DdfNamespace,
  type PresentationScope,
  type RevealDirection,
} from './presentation.js';
// motion machinery - the entrance()/draw() CSSAnimation controller shared by
// every component (the deck runtime uses it to replay entrances on slide
// activation); keyframes live in components/motion/motion.css.
export {
  draw,
  entrance,
  ENTRANCES,
  type Entrance,
  type MotionHandle,
  type MotionOptions,
} from './motion.js';
// the imperative animation engine - df$.anim.<name>.* (WAAPI twin of the
// motion vocabulary: paired in/out variants, direction/origin config, the
// blocks composite, and scroll-relative progress binding)
export {
  anim,
  animChannel,
  animKeyframes,
  ANIM_NAMES,
  type AnimChannel,
  type AnimContext,
  type AnimDirection,
  type AnimHandle,
  type AnimName,
  type AnimOptions,
  type AnimRegistry,
  type AnimScrollBinding,
  type AnimState,
} from './anim.js';
// theme resource loader - fetches a theme's <id>.json sidecar (font <link>s
// as defuss-JSX-as-JSON) and mounts them; installed at df$.shadcn.shared.loadTheme
// and ddf$.loadTheme so every theme UI and every agent shares one mechanism.
export {
  loadTheme,
  applyThemeLinks,
  clearThemeLinks,
  parseThemeLinks,
  type ThemeLinkNode,
  type ThemeLinksFile,
} from './theme-links.js';
