/**
 * Why: the imperative animation engine - `df$.anim.<name>.*()` - the WAAPI
 * twin of the declarative motion component (src/components/motion/motion.css
 * owns the CSS-attribute entrances; this engine owns generated keyframes so
 * direction/origin/blocks are true runtime config and every animation comes
 * in paired in/out variants). Installed once by core at df$.anim,
 * df$.shadcn.anim, df$.shadcn.shared.anim and ddf$.anim; components import
 * { anim } from '../../shared/state-api.js' (build.ts binds it like every
 * other shared name).
 *
 * Contract per animation channel: play(el, opts?) starts deterministically
 * (a running instance is reset first), pause()/resume() freeze/continue,
 * finish() jumps to the end, reset() unwinds everything (scroll binding and
 * composite overlay included), state() reports 'idle' | 'running' | 'paused'
 * | 'finished'. Unknown animation names throw at the call site.
 *
 * Scroll binding (opts.scroll) ties progress to the relative scroll position
 * of the viewport or a target element - the parallax use. Primary path is
 * the platform's ScrollTimeline (AGENTS.md: scroll-driven animations, not
 * scroll listeners); the fallback scrubs animation.currentTime from a
 * rAF-throttled scroll listener so older engines behave identically.
 *
 * Isomorphic: the pure parts (ANIM_NAMES, animKeyframes, direction math) are
 * import-safe without a document; the DOM-facing parts check for one.
 */

/** Orientation axis shared by every directional animation. */
export type AnimDirection = 'north' | 'south' | 'east' | 'west';

/** Lifecycle states an animation instance can report. */
export type AnimState = 'idle' | 'running' | 'paused' | 'finished';

/** Scroll-relative progress binding (parallax). */
export interface AnimScrollBinding {
  /** whose scroll drives progress: the viewport (default) or this element's own scroll offset */
  target?: Element | 'viewport';
  /** scroll axis: 'y' (default, block) or 'x' (inline) */
  axis?: 'x' | 'y';
  /** progress window the scroll range maps onto (default [0, 1]) */
  range?: [number, number];
  /** internal: force the listener fallback even when ScrollTimeline exists (tests) */
  forceFallback?: boolean;
}

/** Per-play configuration. Every axis is optional - defaults mirror motion.css. */
export interface AnimOptions {
  /** total duration in ms (default 1500) */
  duration?: number;
  /** start delay in ms (default 0) */
  delay?: number;
  /** any CSS easing (default cubic-bezier(0.16, 1, 0.3, 1)) */
  easing?: string;
  /** starting edge for in-variants, exit edge for out-variants */
  direction?: AnimDirection;
  /** 'x y' origin for zoom/iris (default '50% 50%') */
  origin?: string;
  /** zoom scale factor (default 0.8; e.g. 1.1 = the shrink-in entrance) */
  scale?: number;
  /** slide travel, any CSS length (default '24px') */
  distance?: string;
  /** block count for the blocks composite (default 5) */
  blocks?: number;
  /** per-block delay step in ms for the blocks composite (default 90) */
  stagger?: number;
  /** block color for the blocks composite - pick one that CONTRASTS with the
   * covered element so the blend-over is seen (default 'currentColor') */
  color?: string;
  /** bind progress to scroll instead of time (parallax) */
  scroll?: AnimScrollBinding;
}

/** Lifecycle handle returned by play(); channel methods delegate to it. */
export interface AnimHandle {
  /** resolves when every owned animation settles (or is cancelled) */
  readonly finished: Promise<void>;
  pause(): void;
  resume(): void;
  /** jump to the end state */
  finish(): void;
  /** cancel + restore the authored style + unbind scroll + remove overlays */
  reset(): void;
  state(): AnimState;
}

/** One animation channel: `df$.anim.fadeIn.play(el)`. */
export interface AnimChannel {
  play(el: Element, opts?: AnimOptions): AnimHandle;
  pause(el: Element): void;
  resume(el: Element): void;
  finish(el: Element): void;
  reset(el: Element): void;
  state(el: Element): AnimState;
}

/** The full registry - `df$.anim`. */
export type AnimRegistry = Record<AnimName, AnimChannel> & {
  /** every registered animation name (machine-readable twin of the docs) */
  readonly names: readonly AnimName[];
};

/** The complete animation vocabulary - every name ships in/out variants. */
export const ANIM_NAMES = [
  'fadeIn', 'fadeOut',
  'slideIn', 'slideOut',
  'zoomIn', 'zoomOut',
  'popIn', 'popOut',
  'spinIn', 'spinOut',
  'flipIn', 'flipOut',
  'skewIn', 'skewOut',
  'blurIn', 'blurOut',
  'wipeIn', 'wipeOut',
  'irisIn', 'irisOut',
  'blocksIn', 'blocksOut',
] as const;

export type AnimName = (typeof ANIM_NAMES)[number];

const DEFAULT_DURATION = 1500;
const DEFAULT_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';
const DEFAULT_DISTANCE = '24px';
const DEFAULT_BLUR = '12px';
const DEFAULT_ANGLE = '12deg';
const DEFAULT_SPIN = '0.5turn';
const DEFAULT_ZOOM_SCALE = 0.8;
const DEFAULT_ORIGIN = '50% 50%';
const DEFAULT_BLOCKS = 5;
const DEFAULT_STAGGER = 90;

/** Runtime context collected at play() time (authored opacity end-state). */
export interface AnimContext {
  /** the element's authored opacity - fade end state, never hardcoded 1 */
  baseOpacity: number;
}

const DIRECTIONS: readonly AnimDirection[] = ['north', 'south', 'east', 'west'];

function coerceDirection(value: unknown, fallback: AnimDirection): AnimDirection {
  return DIRECTIONS.includes(value as AnimDirection) ? (value as AnimDirection) : fallback;
}

/** translate() offset pointing FROM the given edge (starting position). */
function offsetFor(direction: AnimDirection, distance: string): string {
  switch (direction) {
    case 'north': return `translate(0px, calc(-1 * ${distance}))`;
    case 'south': return `translate(0px, ${distance})`;
    case 'west': return `translate(calc(-1 * ${distance}), 0px)`;
    case 'east': return `translate(${distance}, 0px)`;
  }
}

/** clip-path inset() that leaves only the given edge visible (zero-width). */
function insetFor(direction: AnimDirection): string {
  switch (direction) {
    case 'north': return 'inset(0px 0px 100% 0px)';
    case 'south': return 'inset(100% 0px 0px 0px)';
    case 'west': return 'inset(0px 100% 0px 0px)';
    case 'east': return 'inset(0px 0px 0px 100%)';
  }
}

/**
 * Why: the pure keyframe generator - one function, every single-element
 * animation. Direction semantics: in-variants START at the named edge,
 * out-variants EXIT toward it. `blocks*` is composite (overlay-driven) and
 * handled by the runtime, not here. Unknown names throw.
 */
export function animKeyframes(
  name: AnimName,
  opts: AnimOptions = {},
  ctx: AnimContext = { baseOpacity: 1 },
): Keyframe[] {
  const direction = coerceDirection(opts.direction, 'north');
  const distance = opts.distance ?? DEFAULT_DISTANCE;
  const origin = opts.origin ?? DEFAULT_ORIGIN;
  const base = ctx.baseOpacity;
  switch (name) {
    case 'fadeIn':
      return [{ opacity: 0 }, { opacity: base }];
    case 'fadeOut':
      return [{ opacity: base }, { opacity: 0 }];

    case 'slideIn':
      return [
        { transform: offsetFor(direction, distance), opacity: 0 },
        { transform: 'translate(0px, 0px)', opacity: base },
      ];
    case 'slideOut':
      return [
        { transform: 'translate(0px, 0px)', opacity: base },
        { transform: offsetFor(direction, distance), opacity: 0 },
      ];

    case 'zoomIn':
      return [
        { transform: `scale(${opts.scale ?? DEFAULT_ZOOM_SCALE})`, opacity: 0, transformOrigin: origin },
        { transform: 'scale(1)', opacity: base, transformOrigin: origin },
      ];
    case 'zoomOut':
      return [
        { transform: 'scale(1)', opacity: base, transformOrigin: origin },
        { transform: `scale(${opts.scale ?? DEFAULT_ZOOM_SCALE})`, opacity: 0, transformOrigin: origin },
      ];

    case 'popIn':
      return [
        { transform: 'scale(0.65)', opacity: 0, offset: 0 },
        { transform: 'scale(1.07)', opacity: base, offset: 0.65 },
        { transform: 'scale(1)', opacity: base, offset: 1 },
      ];
    case 'popOut':
      return [
        { transform: 'scale(1)', opacity: base, offset: 0 },
        { transform: 'scale(1.07)', opacity: base, offset: 0.35 },
        { transform: 'scale(0.65)', opacity: 0, offset: 1 },
      ];

    case 'spinIn':
      return [
        { transform: `rotate(-${DEFAULT_SPIN})`, opacity: 0 },
        { transform: 'rotate(0deg)', opacity: base },
      ];
    case 'spinOut':
      return [
        { transform: 'rotate(0deg)', opacity: base },
        { transform: `rotate(${DEFAULT_SPIN})`, opacity: 0 },
      ];

    case 'flipIn': {
      const axis = direction === 'north' || direction === 'south' ? 'rotateX' : 'rotateY';
      const sign = direction === 'north' || direction === 'west' ? 1 : -1;
      return [
        { transform: `perspective(900px) ${axis}(${sign * 70}deg)`, opacity: 0 },
        { transform: `perspective(900px) ${axis}(0deg)`, opacity: base },
      ];
    }
    case 'flipOut': {
      const axis = direction === 'north' || direction === 'south' ? 'rotateX' : 'rotateY';
      const sign = direction === 'north' || direction === 'west' ? -1 : 1;
      return [
        { transform: `perspective(900px) ${axis}(0deg)`, opacity: base },
        { transform: `perspective(900px) ${axis}(${sign * 70}deg)`, opacity: 0 },
      ];
    }

    case 'skewIn': {
      const horizontal = direction === 'east' || direction === 'west';
      const axis = horizontal ? 'skewX' : 'skewY';
      const sign = direction === 'west' || direction === 'south' ? 1 : -1;
      return [
        { transform: `${axis}(calc(${sign} * ${DEFAULT_ANGLE}))`, opacity: 0 },
        { transform: `${axis}(0deg)`, opacity: base },
      ];
    }
    case 'skewOut': {
      const horizontal = direction === 'east' || direction === 'west';
      const axis = horizontal ? 'skewX' : 'skewY';
      const sign = direction === 'west' || direction === 'south' ? -1 : 1;
      return [
        { transform: `${axis}(0deg)`, opacity: base },
        { transform: `${axis}(calc(${sign} * ${DEFAULT_ANGLE}))`, opacity: 0 },
      ];
    }

    case 'blurIn':
      return [
        { filter: `blur(${DEFAULT_BLUR})`, opacity: 0 },
        { filter: 'blur(0px)', opacity: base },
      ];
    case 'blurOut':
      return [
        { filter: 'blur(0px)', opacity: base },
        { filter: `blur(${DEFAULT_BLUR})`, opacity: 0 },
      ];

    case 'wipeIn':
      return [{ clipPath: insetFor(direction) }, { clipPath: 'inset(0px 0px 0px 0px)' }];
    case 'wipeOut':
      return [{ clipPath: 'inset(0px 0px 0px 0px)' }, { clipPath: insetFor(direction) }];

    case 'irisIn':
      return [
        { clipPath: `circle(0% at ${origin})` },
        { clipPath: `circle(150% at ${origin})` },
      ];
    case 'irisOut':
      return [
        { clipPath: `circle(150% at ${origin})` },
        { clipPath: `circle(0% at ${origin})` },
      ];

    default:
      throw new Error(`anim: "${name}" is composite - it has no element keyframes`);
  }
}

/* ---------------------------------------------------------------- runtime */

interface AnimInstance {
  animations: Animation[];
  unbind: (() => void) | null;
  /** removes composite scaffolding (the blocks overlay) */
  cleanup: (() => void) | null;
  finished: Promise<void>;
}

/** Per-element instance registry - state lives on the element, not module scope. */
const instances = new WeakMap<Element, Map<string, AnimInstance>>();

const instanceFor = (el: Element, name: string): AnimInstance | undefined =>
  instances.get(el)?.get(name);

const reducedMotion = (): boolean =>
  typeof globalThis.matchMedia === 'function' &&
  globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;

function dropInstance(el: Element, name: string): void {
  const map = instances.get(el);
  if (!map) return;
  map.delete(name);
  if (map.size === 0) instances.delete(el);
}

function storeInstance(el: Element, name: string, instance: AnimInstance): void {
  let map = instances.get(el);
  if (!map) {
    map = new Map();
    instances.set(el, map);
  }
  map.set(name, instance);
}

function deriveState(animations: Animation[]): AnimState {
  if (animations.length === 0) return 'idle';
  const states = animations.map((a) => a.playState as string);
  if (states.every((s) => s === 'finished')) return 'finished';
  if (states.every((s) => s === 'paused')) return 'paused';
  if (states.some((s) => s === 'running' || s === 'pending')) return 'running';
  return 'idle';
}

/**
 * Why: one binding path for scroll-relative progress. Prefers the platform's
 * ScrollTimeline (declarative, compositor-friendly); falls back to a
 * rAF-throttled scroll listener scrubbing currentTime so behavior is
 * identical where ScrollTimeline is missing. Returns the unbind function.
 */
function bindScroll(animations: Animation[], scroll: AnimScrollBinding, totalMs: number): () => void {
  const axis = scroll.axis ?? 'y';
  const target = scroll.target ?? 'viewport';
  const [rangeFrom, rangeTo] = scroll.range ?? [0, 1];

  const supportsTimeline =
    !scroll.forceFallback &&
    typeof (globalThis as { ScrollTimeline?: unknown }).ScrollTimeline === 'function';

  if (supportsTimeline) {
    const source =
      target === 'viewport' ? (document.scrollingElement ?? document.documentElement) : target;
    const TimelineCtor = (
      globalThis as unknown as { ScrollTimeline: new (init: { source: Element; axis: string }) => AnimationTimeline }
    ).ScrollTimeline;
    const timeline = new TimelineCtor({ source, axis: axis === 'x' ? 'inline' : 'block' });
    for (const animation of animations) {
      animation.pause();
      animation.timeline = timeline;
      animation.play();
    }
    return () => {
      for (const animation of animations) animation.timeline = document.timeline;
    };
  }

  // fallback: scrub currentTime from the relative scroll position
  for (const animation of animations) animation.pause();
  const progress = (): number => {
    let p: number;
    if (target === 'viewport') {
      const doc = document.documentElement;
      p =
        axis === 'y'
          ? doc.scrollTop / Math.max(1, doc.scrollHeight - doc.clientHeight)
          : doc.scrollLeft / Math.max(1, doc.scrollWidth - doc.clientWidth);
    } else {
      p =
        axis === 'y'
          ? target.scrollTop / Math.max(1, target.scrollHeight - target.clientHeight)
          : target.scrollLeft / Math.max(1, target.scrollWidth - target.clientWidth);
    }
    return rangeFrom + Math.min(1, Math.max(0, p)) * (rangeTo - rangeFrom);
  };
  const apply = (): void => {
    const time = progress() * totalMs;
    for (const animation of animations) animation.currentTime = time;
  };
  let queued = false;
  const onScroll = (): void => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      apply();
    });
  };
  const listenTarget: Element | typeof globalThis =
    target === 'viewport' ? globalThis : target;
  listenTarget.addEventListener('scroll', onScroll, { passive: true });
  apply();
  return () => listenTarget.removeEventListener('scroll', onScroll);
}

/** Timing options shared by single-element and composite plays. */
function timingFor(opts: AnimOptions, durationOverride?: number): KeyframeAnimationOptions {
  return {
    duration: durationOverride ?? (reducedMotion() ? 1 : (opts.duration ?? DEFAULT_DURATION)),
    delay: reducedMotion() ? 0 : (opts.delay ?? 0),
    easing: opts.easing ?? DEFAULT_EASING,
    fill: 'both',
  };
}

/**
 * Why: the blocks composite - an overlay of N panels that rolls over the
 * element (blocksIn: cover, top-down with ascending delays) or rolls off it
 * (blocksOut: starts fully covered, panels retreat in reverse order). The
 * overlay is engine-managed scaffolding: created on play, kept after
 * blocksIn settles (the element IS covered), removed after blocksOut or
 * reset(). Nothing here is canvas-specific - any element can be covered.
 */
function playBlocks(
  el: Element,
  name: 'blocksIn' | 'blocksOut',
  opts: AnimOptions,
): { animations: Animation[]; cleanup: () => void; totalMs: number } {
  const host = el as HTMLElement;
  const direction = coerceDirection(opts.direction, 'north');
  const count = Math.max(1, Math.round(opts.blocks ?? DEFAULT_BLOCKS));
  const stagger = Math.max(0, opts.stagger ?? DEFAULT_STAGGER);
  const timing = timingFor(opts);
  const duration = timing.duration as number;
  const horizontal = direction === 'east' || direction === 'west';

  // the host must anchor the overlay; remember the authored position value
  const authoredPosition = host.style.position;
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

  const overlay = document.createElement('div');
  overlay.setAttribute('data-df-anim-blocks', '');
  overlay.setAttribute('aria-hidden', 'true');
  Object.assign(overlay.style, {
    position: 'absolute',
    inset: '0',
    display: 'flex',
    flexDirection: horizontal ? 'row' : 'column',
    pointerEvents: 'none',
    zIndex: '1',
    overflow: 'hidden',
  } satisfies Partial<CSSStyleDeclaration>);

  const animations: Animation[] = [];
  for (let i = 0; i < count; i++) {
    const block = document.createElement('div');
    Object.assign(block.style, {
      flex: '1 1 0%',
      background: opts.color ?? 'currentColor',
      // blocks meet on fractional pixels (scaled/zoomed hosts) - a 1px
      // outline in the block color closes the antialiased seams between them
      outline: `1px solid ${opts.color ?? 'currentColor'}`,
      transformOrigin: horizontal
        ? direction === 'west' ? 'left' : 'right'
        : direction === 'north' ? 'top' : 'bottom',
    } satisfies Partial<CSSStyleDeclaration>);
    overlay.append(block);

    const axis = horizontal ? 'scaleX' : 'scaleY';
    // in: panels arrive in reading order from the named edge (delay ascends);
    // out: fully covered, panels retreat in reverse order (last-in leaves first)
    const index = name === 'blocksIn' ? i : count - 1 - i;
    const keyframes: Keyframe[] =
      name === 'blocksIn'
        ? [{ transform: `${axis}(0)` }, { transform: `${axis}(1)` }]
        : [{ transform: `${axis}(1)` }, { transform: `${axis}(0)` }];
    animations.push(
      block.animate(keyframes, { ...timing, delay: (timing.delay as number) + index * stagger }),
    );
  }
  host.append(overlay);

  const cleanup = (): void => {
    overlay.remove();
    host.style.position = authoredPosition;
  };
  // a settled cover-up keeps its overlay (that IS the end state); a settled
  // uncover removes it - the element is visible again, scaffolding is noise
  if (name === 'blocksOut') {
    void Promise.all(animations.map((a) => a.finished.catch(() => undefined))).then(() => {
      if (instanceFor(el, name)?.cleanup) cleanup();
    });
  }
  return {
    animations,
    cleanup,
    totalMs: (timing.delay as number) + (count - 1) * stagger + duration,
  };
}

/** The core play path every channel delegates to. Unknown names throw. */
function playAnim(name: AnimName, el: Element, opts: AnimOptions = {}): AnimHandle {
  if (!(ANIM_NAMES as readonly string[]).includes(name)) {
    throw new Error(`anim: unknown animation "${name}" (supported: ${ANIM_NAMES.join(', ')})`);
  }
  // deterministic restart: a superseded instance unwinds before the new one
  resetAnim(name, el);

  const composite = name === 'blocksIn' || name === 'blocksOut';
  const timing = timingFor(opts);

  let animations: Animation[];
  let cleanup: (() => void) | null = null;
  let totalMs: number;

  if (composite) {
    const built = playBlocks(el, name, opts);
    animations = built.animations;
    cleanup = built.cleanup;
    totalMs = built.totalMs;
  } else {
    const ctx: AnimContext = { baseOpacity: Number(getComputedStyle(el).opacity) || 1 };
    animations = [el.animate(animKeyframes(name, opts, ctx), timing)];
    totalMs = (timing.delay as number) + (timing.duration as number);
  }

  let unbind: (() => void) | null = null;
  if (opts.scroll) unbind = bindScroll(animations, opts.scroll, totalMs);

  const instance: AnimInstance = {
    animations,
    unbind,
    cleanup,
    finished: Promise.all(animations.map((a) => a.finished.catch(() => undefined))).then(
      () => undefined,
    ),
  };
  storeInstance(el, name, instance);

  return {
    finished: instance.finished,
    pause: () => animations.forEach((a) => a.pause()),
    resume: () => animations.forEach((a) => a.play()),
    finish: () => animations.forEach((a) => a.finish()),
    reset: () => resetAnim(name, el),
    state: () => deriveState(animations),
  };
}

function resetAnim(name: AnimName, el: Element): void {
  const instance = instanceFor(el, name);
  if (!instance) return;
  for (const animation of instance.animations) animation.cancel();
  instance.unbind?.();
  instance.cleanup?.();
  dropInstance(el, name);
}

function channelFor(name: AnimName): AnimChannel {
  return {
    play: (el, opts) => playAnim(name, el, opts),
    pause: (el) => instanceFor(el, name)?.animations.forEach((a) => a.pause()),
    resume: (el) => instanceFor(el, name)?.animations.forEach((a) => a.play()),
    finish: (el) => instanceFor(el, name)?.animations.forEach((a) => a.finish()),
    reset: (el) => resetAnim(name, el),
    state: (el) => {
      const instance = instanceFor(el, name);
      return instance ? deriveState(instance.animations) : 'idle';
    },
  };
}

/**
 * Why: the registry object core installs as `df$.anim` - one channel per
 * animation name, all sharing the same lifecycle machinery.
 */
export const anim: AnimRegistry = Object.freeze(
  Object.assign(
    Object.fromEntries(ANIM_NAMES.map((name) => [name, channelFor(name)])),
    { names: ANIM_NAMES },
  ),
) as unknown as AnimRegistry;

/**
 * Why: string-keyed lookup for data-attribute-driven hosts (the animation
 * canvas reads animation names from markup). Unknown names throw - a typo in
 * markup must fail loud at the call site, never silently no-op.
 */
export function animChannel(name: string): AnimChannel {
  if (!(ANIM_NAMES as readonly string[]).includes(name)) {
    throw new Error(`anim: unknown animation "${name}" (supported: ${ANIM_NAMES.join(', ')})`);
  }
  return anim[name as AnimName];
}
