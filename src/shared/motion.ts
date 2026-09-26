/**
 * Why: the shared motion controller - the JS half of the motion component
 * (src/components/motion/motion.css owns the keyframes; CSS is the source of
 * truth). This module triggers/retriggers those CSSAnimations, applies
 * per-call timing overrides via the --df-motion-* custom properties, and owns
 * the finished/cancel lifecycle. It never defines keyframes, never toggles
 * classes, never forces layout (no offsetWidth reflow hacks) - it drives the
 * browser's own CSSAnimation objects.
 *
 * Published under BOTH df$.shadcn.entrance/draw (the registry namespace) and
 * the ddf$ shared-library alias. Isomorphic file, DOM-facing functions need a
 * document (browser API); the pure parts (ENTRANCES, revealAttr) are
 * unit-tested in tests/motion.test.ts.
 */

/** The full entrance vocabulary - the machine-readable twin of motion.css's
 * [data-df-entrance="…"] rules. The skill documents it, entrance() validates
 * against it, e2e pins it against the CSS file itself. Keep all four in sync.
 * Channels: drift (up/down/left/right) · scale (zoom/zoom-out/pop) ·
 * rotational (spin/flip/skew) · filter (blur) · clip-path (wipe/wipe-up/iris)
 * · fade. */
export const ENTRANCES = [
  'up',
  'down',
  'left',
  'right',
  'zoom',
  'zoom-out',
  'pop',
  'spin',
  'flip',
  'skew',
  'blur',
  'wipe',
  'wipe-up',
  'iris',
  'fade',
] as const;

export type Entrance = (typeof ENTRANCES)[number];

/** Per-call timing overrides (each lands as a --df-motion-* custom property). */
export interface MotionOptions {
  /** total duration in ms */
  duration?: number;
  /** start delay in ms */
  delay?: number;
  /** any CSS easing (curve name, cubic-bezier(), linear()) */
  easing?: string;
  /** drift distance (any CSS length) for up/down/left/right */
  distance?: string;
}

/** Lifecycle handle: resolve on settle, cancel to unwind deterministically. */
export interface MotionHandle {
  /** resolves when every animation of this trigger settled (or was cancelled) */
  finished: Promise<void>;
  /** cancels the animations and removes the trigger attribute */
  cancel(): void;
}

/** Per-element registry of the animations this controller started - the token
 * that keeps finished/cancel honest when a second trigger supersedes the first. */
const active = new WeakMap<Element, Animation[]>();

/** The motion animations currently on `el` - filters the platform's list down
 * to the keyframes this system owns (animation-name prefix match). */
const owned = (el: Element, prefix: string): Animation[] =>
  el
    .getAnimations({ subtree: false })
    .filter((a) =>
      typeof (a as CSSAnimation).animationName === 'string' &&
      (a as CSSAnimation).animationName.startsWith(prefix),
    ) as Animation[];

/** Shared trigger machinery: apply vars + attribute, then deterministically
 * (re)start the animations the CSS created for it. */
function trigger(
  el: HTMLElement | SVGElement,
  attr: 'data-df-entrance' | 'data-df-draw',
  effect: string | undefined,
  prefix: 'df-enter-' | 'df-draw',
  options: MotionOptions = {},
): MotionHandle {
  const style = (el as HTMLElement).style;
  if (effect !== undefined) el.setAttribute(attr, effect);
  // no effect given → replay whatever the attribute already declares

  // cancel → (snapshot) → play is the deterministic replay. The snapshot MUST
  // happen after cancel(): while a running/filling animation is applied,
  // getComputedStyle returns the ANIMATED value - capturing then would freeze
  // e.g. a mid-flight opacity 0 as the fade's end value (deck replays made
  // titles vanish exactly this way). A cancelled, unfilled animation leaves
  // the element at its authored style.
  const animations = owned(el, prefix);
  for (const animation of animations) animation.cancel();

  // fading ends at the element's AUTHORED opacity, never at 1 - content the
  // caller dimmed stays dimmed (base value snapshotted into the keyframe var)
  style.setProperty('--df-motion-base-opacity', getComputedStyle(el).opacity);
  if (options.duration !== undefined) style.setProperty('--df-motion-duration', `${options.duration}ms`);
  if (options.delay !== undefined) style.setProperty('--df-motion-delay', `${options.delay}ms`);
  if (options.easing !== undefined) style.setProperty('--df-motion-ease', options.easing);
  if (options.distance !== undefined) style.setProperty('--df-motion-distance', options.distance);
  for (const animation of animations) animation.play();
  active.set(el, animations);

  const finished = Promise.all(
    animations.map((a) => a.finished.catch(() => undefined)),
  ).then(() => {
    if (active.get(el) !== animations) return; // superseded by a newer trigger
    // The attribute STAYS (fill:both already holds the settled state - the
    // settled state IS the element's natural style, so this is visually a
    // no-op): it is the permanent marker query-based hosts replay from (the
    // deck re-runs every [data-df-entrance] on slide activation - stripping
    // it here would make slide revisits silent). Only cancel() unwinds it.
    active.delete(el);
  });

  return {
    finished,
    cancel() {
      if (active.get(el) !== animations) return; // a newer trigger owns the element now
      animations.forEach((a) => a.cancel());
      active.delete(el);
      el.removeAttribute(attr);
    },
  };
}

/**
 * Why: the imperative entry point for any component - trigger (or retrigger)
 * a CSS entrance on any element. Unknown effects throw (fail loud at the call
 * site); a replay with no effect reuses the element's data-df-entrance value.
 */
export function entrance(
  element: HTMLElement | SVGElement,
  effect?: Entrance | string,
  options: MotionOptions = {},
): MotionHandle {
  const current = element.getAttribute('data-df-entrance') ?? undefined;
  const target = effect ?? current;
  if (target !== undefined && !(ENTRANCES as readonly string[]).includes(target)) {
    throw new Error(`motion: unknown entrance "${target}" (supported: ${ENTRANCES.join(', ')})`);
  }
  return trigger(element, 'data-df-entrance', target, 'df-enter-', options);
}

/**
 * Why: SVG draw-in replay (data-df-draw + pathLength="1"). A distinct
 * primitive - strokes are not transformable DOM - same lifecycle contract.
 * The element must already carry data-df-draw (it is structural authoring).
 */
export function draw(element: SVGElement, options: MotionOptions = {}): MotionHandle {
  return trigger(element, 'data-df-draw', undefined, 'df-draw', options);
}

/**
 * Why: the animation DSL in attribute form - `entrance(el, 'up', { delay: 400 })`
 * and hand-written `data-df-entrance="up" style="--df-motion-delay:400ms"`
 * produce the exact same markup bytes, so docs demos, JSX authors and the
 * pure-CSS technique stay one contract. Unknown directions fall back to 'up'
 * (fail-soft: a typo degrades the entrance, never breaks the slide).
 */
export function revealAttr(direction: Entrance | string, delay?: unknown): Record<string, string> {
  const dir = (ENTRANCES as readonly string[]).includes(String(direction))
    ? String(direction)
    : 'up';
  const ms = delay === undefined ? -1 : Math.max(0, Number(delay) || 0);
  const attrs: Record<string, string> = { 'data-df-entrance': dir };
  if (ms > 0) attrs.style = `--df-motion-delay:${ms}ms`;
  return attrs;
}
