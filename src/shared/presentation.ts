/**
 * Why: the presentation primitive's shared machinery - slide-window math, the
 * declarative reveal-attribute vocabulary, a reduced-motion-aware rAF counter,
 * and the `ddf$` install hook. These are the cross-cutting helpers the
 * `presentation` component binds to (like safeShowPopover for popovers), so
 * they live in the core-embedded shared layer and are published under `ddf$`
 * (the stable alias of the shared library) for imperative decks and agents.
 * All DOM-facing functions are mutation-honest: they drive a component
 * instance's own bound State API and never invent a second source of truth.
 * Limits: presentationScope/animateCount need a document (browser API); the
 * pure helpers (clampIndex/coerceIndex/revealAttr) are isomorphic and
 * unit-tested in tests/presentation.test.ts.
 */
import { defussQuery } from './query.js';

// The entrance vocabulary + its attribute helper live in the shared motion
// module now (src/shared/motion.ts + src/components/motion/motion.css) - they
// serve ANY component, not just decks. These re-exports keep the historical
// `REVEAL_DIRECTIONS`/`revealAttr` import paths working (tests, ddf$).
export { ENTRANCES as REVEAL_DIRECTIONS, revealAttr } from './motion.js';
export type { Entrance as RevealDirection } from './motion.js';

/**
 * Why: every index entering the runtime arrives as a string (data-* attributes,
 * panel editors, hashes) or a NaN-polluted number; the ONE tolerant parse keeps
 * slide indices integral without duplicating parseInt fallbacks per caller.
 */
export function coerceIndex(raw: unknown, fallback: number): number {
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

/** Clamp `raw` into the legal slide window [0, count-1]; empty deck → 0. */
export function clampIndex(raw: unknown, count: number): number {
  if (count <= 0) return 0;
  return Math.min(count - 1, Math.max(0, coerceIndex(raw, 0)));
}

/** Count animation options for animateCount (all optional; data-* fill the rest). */
export interface CountOptions {
  /** number to count TO (also read from data-count when omitted) */
  to?: number;
  /** start value (default: data-count-from, else 0) */
  from?: number;
  /** duration ms (default: data-count-duration, else 1200) */
  duration?: number;
  /** start delay ms (default: data-count-delay, else 0) */
  delay?: number;
  /** fixed decimals (default: data-count-decimals, else decimals of `to`) */
  decimals?: number;
  /** format override (default: Intl.NumberFormat with the decimal count) */
  format?: (n: number) => string;
}

/** The per-element handle of the active counter (re-calling replaces its run). */
const COUNT_KEY = '_presentationCount';

/**
 * Why: animated counters are the one deck effect CSS cannot express (numeric
 * text content), so it is rAF here - with built-in prefers-reduced-motion
 * (final value written immediately, never animated) and a per-element handle
 * so re-reveals (slide revisits) restart cleanly instead of stacking loops.
 * Returns a cancel function. Text-only: writes el.textContent.
 */
export function animateCount(el: HTMLElement, opts: CountOptions = {}): () => void {
  // counts are NOT indices - full precision (no truncation), one tolerant parse
  const num = (raw: unknown, fallback: number): number => {
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(n) ? n : fallback;
  };
  const to = opts.to ?? num(el.dataset.count, 0);
  const from = opts.from ?? num(el.dataset.countFrom, 0);
  const duration = Math.max(0, opts.duration ?? num(el.dataset.countDuration, 1200));
  const delay = Math.max(0, opts.delay ?? num(el.dataset.countDelay, 0));
  const decimals =
    opts.decimals ?? num(el.dataset.countDecimals, String(to).split('.')[1]?.length ?? 0);
  const fmt =
    opts.format ??
    ((n: number) =>
      new Intl.NumberFormat(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(n));

  // replace any previous run on this element before starting a new one
  const stop = (el as unknown as Record<string, (() => void) | undefined>)[COUNT_KEY];
  if (typeof stop === 'function') stop();

  let raf = 0;
  let timer: ReturnType<typeof setTimeout> | 0 = 0;
  const settle = (): void => {
    el.textContent = fmt(to);
  };
  const reduced =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const start = (): void => {
    if (reduced || duration === 0 || from === to) {
      settle();
      return;
    }
    const t0 = performance.now();
    const tick = (now: number): void => {
      const p = Math.min(1, (now - t0) / duration);
      // ease-out cubic - decelerating finish in the spirit of --presentation-out
      const eased = 1 - (1 - p) ** 3;
      el.textContent = p >= 1 ? fmt(to) : fmt(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    el.textContent = fmt(from);
    raf = requestAnimationFrame(tick);
  };

  const cancel = (): void => {
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    if ((el as unknown as Record<string, unknown>)[COUNT_KEY] === cancel)
      delete (el as unknown as Record<string, unknown>)[COUNT_KEY];
  };
  (el as unknown as Record<string, unknown>)[COUNT_KEY] = cancel;

  if (delay > 0) timer = setTimeout(start, delay);
  else start();
  return cancel;
}

/** The scope object presentationScope() hands out (ddf$.presentation(el)). */
export interface PresentationScope {
  /** the resolved .presentation mount element */
  readonly el: HTMLElement;
  /** the slide elements, document order */
  slides(): HTMLElement[];
  /** total slide count */
  count(): number;
  /** live 0-based index of the active slide (reflected by the runtime) */
  index(): number;
  /** activate an absolute slide index (clamped) - returns the new index */
  goTo(index: unknown): number;
  /** advance one slide (clamped) */
  next(): number;
  /** back one slide (clamped) */
  prev(): number;
  first(): number;
  last(): number;
  /** whether the fullscreen MODE is on (native fullscreen or fallback overlay) */
  fullscreen(): boolean;
  /** enter/leave the fullscreen mode (true/false); omitted = toggle - returns the new state */
  toggleFullscreen(on?: boolean): boolean;
}

/** The presentation runtime not loaded - one actionable message everywhere. */
export const PRESENTATION_NOT_INITIALIZED =
  'ddf$: presentation element is not initialized - load dist/components/presentation/presentation.js (or all.js) first';

/**
 * Why: the imperative entry point for decks, tests and agents - resolves the
 * nearest `.presentation` ancestor of `el` (closest matches self too), or the
 * first deck on the page, and hands back the navigation scope. Mutations go
 * through the instance's bound State API (el.api.setState), so the runtime
 * stays the single owner of activation; an un-initialized mount throws rather
 * than faking a move (AGENTS.md "State API": state lives on the element).
 */
export function presentationScope(el?: Element | null): PresentationScope {
  // closest() matches SELF too - passing the mount itself works
  const mount =
    (el?.closest('.presentation') as HTMLElement | null) ??
    (typeof document !== 'undefined' ? ((defussQuery()('.presentation').get(0) ?? null) as HTMLElement | null) : null);
  if (!mount) throw new Error('ddf$: no .presentation element found');
  const slides = (): HTMLElement[] =>
    defussQuery()(mount).find(':scope > [data-slide]').toArray() as HTMLElement[];
  // every mutation drives the component's own State API; the live index is the
  // data-current-slide the runtime mirrors - never a module-scope cache
  const apply = (index: number): number => {
    const api = (mount as HTMLElement & { api?: { setState(n: string, c?: Record<string, unknown>): void } })
      .api;
    if (!api) throw new Error(PRESENTATION_NOT_INITIALIZED);
    api.setState('default', { index });
    return coerceIndex(mount.dataset.currentSlide, index);
  };
  return {
    el: mount,
    slides,
    count: () => slides().length,
    index: () => coerceIndex(mount.dataset.currentSlide, 0),
    goTo: (index) => apply(clampIndex(index, slides().length)),
    next: () => apply(Math.min(slides().length - 1, coerceIndex(mount.dataset.currentSlide, 0) + 1)),
    prev: () => apply(Math.max(0, coerceIndex(mount.dataset.currentSlide, 0) - 1)),
    first: () => apply(0),
    last: () => apply(slides().length - 1),
    // the fullscreen MODE (data-fullscreen): native fullscreen AND the
    // rejected-request fallback - the honest state the runtime maintains
    fullscreen: () => mount.hasAttribute('data-fullscreen'),
    toggleFullscreen: (on) => {
      const api = (mount as HTMLElement & { api?: { setState(n: string, c?: Record<string, unknown>): void } })
        .api;
      if (!api) throw new Error(PRESENTATION_NOT_INITIALIZED);
      const want = on ?? !mount.hasAttribute('data-fullscreen');
      api.setState('fullscreen', { value: want });
      return want;
    },
  };
}

/** The shared-library surface core publishes at globalThis.ddf$. */
export interface DdfNamespace {
  /** the shared-ABI release stamp (same value as df$.shadcn.shared.abi) */
  abi: string;
  defussGlobals: unknown;
  safeShowPopover: (el: HTMLElement) => void;
  defussQuery: unknown;
  debounce: unknown;
  /** scope factory: ddf$.presentation(el?) - navigation for one deck */
  presentation: typeof presentationScope;
  animateCount: typeof animateCount;
  revealAttr: typeof import('./motion.js').revealAttr;
  /** motion controller: trigger/retrigger a CSS entrance on any element */
  entrance: typeof import('./motion.js').entrance;
  /** motion controller: replay an SVG draw-in (data-df-draw + pathLength="1") */
  draw: typeof import('./motion.js').draw;
  /** theme resource loader: mount a theme's <link> resources (theme/<id>.json) */
  loadTheme: typeof import('./theme-links.js').loadTheme;
  /** imperative animation engine: ddf$.anim.fadeIn.play(el) - same registry as df$.anim */
  anim: typeof import('./anim.js').anim;
  /** shared global-key API (src/shared/keys.ts) - one document keydown listener */
  bindGlobalKeys: typeof import('./keys.js').bindGlobalKeys;
  clampIndex: typeof clampIndex;
  coerceIndex: typeof coerceIndex;
  [key: string]: unknown;
}

/**
 * Why: `ddf$` is the stable public alias of the once-installed shared library —
 * core publishes it beside the guarded df$ bootstrap so imperative decks reach
 * the helpers without touching the query runtime's namespace. Same one-time
 * install guard as df$ (§2.1): a second core copy must fail loudly, never
 * silently replace or extend a foreign ddf$.
 */
export function installDdf(namespace: DdfNamespace): DdfNamespace {
  const existing: unknown = Reflect.get(globalThis, 'ddf$');
  if (existing !== undefined) {
    throw new Error(
      'defuss-shadcn: globalThis.ddf$ is already defined - core installs the shared library exactly once',
    );
  }
  Reflect.set(globalThis, 'ddf$', namespace);
  return namespace;
}
