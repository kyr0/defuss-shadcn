// -- Presentation ------------------------------------------------
// The deck runtime: a fixed-coordinate artboard (default 1600×900) uniformly
// scaled into the mount, with declarative CSS entrance animations
// ([data-reveal], [data-draw]) that fire when a slide gets [data-active].
// JS is the thin part - slide lifecycle (activation, inert/aria-hidden),
// keyboard/click/hash navigation, ResizeObserver scaling, presenter notes and
// fullscreen - plus the animated counters (the one effect CSS can't express)
// and the slide TRANSITIONS: every slide change plays an out-animation on the
// leaving slide and an in-animation on the arriving one through the shared
// df$.anim engine (data-anim-in / data-anim-out, per slide or deck-wide on
// the mount - the same attribute contract the animation canvas uses).
// Everything else is presentation.css (AGENTS.md "Native web platform first").
//
// Markup contract: `.presentation` mount > `[data-slide]` children (each with
// data-theme="ink|paper"); optional in-deck chrome: [data-presentation-action]
// buttons, .presentation-counter, progress.presentation-progress,
// .presentation-note per slide. State lives ON THE ELEMENT (dataset.stateName
// + data-current-slide) - the mount's bound `api` is the only mutator
// (AGENTS.md "State API").

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/, and
// the same functions are published under the global `ddf$` alias.
import { defussGlobals, animateCount, clampIndex, coerceIndex, draw, entrance, anim } from '../../shared/state-api.js';
import type { AnimChannel, AnimDirection, AnimOptions } from '../../shared/anim.js';

const df$ = defussGlobals();

const presentationStates = ['default', 'notes', 'fullscreen'];

/** Typed view of a mount's per-instance extras (module-private state bag). */
type Deck = HTMLElement & {
  _presentationActivate?: (index: number, forward?: boolean) => void;
  /** settles the in-flight transition (finish + cleanup) before the next starts */
  _presentationSettle?: () => void;
};

/** A deck that declares nothing still animates every slide in and out. */
const DEFAULT_IN = 'fadeIn';
const DEFAULT_OUT = 'fadeOut';

/** Registry lookup with the engine's fail-loud contract (typos throw). */
function channelFor(name: string): AnimChannel {
  if (!(anim.names as readonly string[]).includes(name)) {
    throw new Error(`presentation: unknown animation "${name}" (supported: ${anim.names.join(', ')})`);
  }
  return anim[name as keyof typeof anim] as AnimChannel;
}

/**
 * The declared animation for one phase: the slide's own data-anim-in|out
 * (+ -direction|-duration|-easing|-origin|-distance|-scale|-blocks|-stagger|
 * -color), else the mount's deck-wide declaration, else fade. Direction
 * defaults to the travel: forward arrives from the east and leaves west.
 */
function animSpec(root: HTMLElement, slide: HTMLElement, phase: 'in' | 'out', forward: boolean): { name: string; opts: AnimOptions } {
  const p = phase === 'in' ? 'animIn' : 'animOut';
  const pick = (suffix = ''): string | undefined =>
    (slide.dataset as Record<string, string | undefined>)[p + suffix] ??
    (root.dataset as Record<string, string | undefined>)[p + suffix];
  const travel: AnimDirection = phase === 'in' ? (forward ? 'east' : 'west') : forward ? 'west' : 'east';
  const opts: AnimOptions = { direction: (pick('Direction') as AnimDirection | undefined) ?? travel };
  const num = (suffix: string): number | undefined => {
    const n = parseFloat(pick(suffix) ?? '');
    return Number.isFinite(n) ? n : undefined;
  };
  if (num('Duration') !== undefined) opts.duration = num('Duration');
  if (num('Scale') !== undefined) opts.scale = num('Scale');
  if (num('Blocks') !== undefined) opts.blocks = Math.round(num('Blocks') as number);
  if (num('Stagger') !== undefined) opts.stagger = num('Stagger');
  if (pick('Easing')) opts.easing = pick('Easing');
  if (pick('Origin')) opts.origin = pick('Origin');
  if (pick('Distance')) opts.distance = pick('Distance');
  if (pick('Color')) opts.color = pick('Color');
  return { name: pick() || (phase === 'in' ? DEFAULT_IN : DEFAULT_OUT), opts };
}

/** One 1×1 canvas resolves any CSS color (hex, oklch, color-mix…) to sRGB. */
let probe: CanvasRenderingContext2D | null = null;
function rgbOf(css: string): [number, number, number, number] | null {
  if (!css || typeof document === 'undefined') return null;
  probe ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!probe) return null;
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = 'rgba(1, 2, 3, 0.5)';
  probe.fillStyle = css;
  if (probe.fillStyle === 'rgba(1, 2, 3, 0.5)') return null;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a / 255];
}

/** WCAG relative-luminance contrast ratio of two sRGB colors. */
function contrast(a: number[], b: number[]): number {
  const lum = (c: number[]): number => {
    const [r, g, bl] = c.slice(0, 3).map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Why: a curtain (blocksIn/blocksOut) is only seen when its color differs
 * from BOTH surfaces it passes over - a curtain in the slide's own
 * background color is an invisible transition. The declared color wins when
 * it contrasts; otherwise the first candidate that does: the deck accent,
 * the leaving slide's text color, the ink, the paper.
 */
function curtainColor(root: HTMLElement, from: HTMLElement, to: HTMLElement, declared?: string): string {
  const surfaces = [from, to]
    .map((s) => rgbOf(getComputedStyle(s).backgroundColor))
    .filter((c): c is [number, number, number, number] => !!c && c[3] > 0.5);
  const cs = getComputedStyle(root);
  const candidates = [
    declared,
    cs.getPropertyValue('--presentation-accent').trim(),
    getComputedStyle(from).color,
    cs.getPropertyValue('--presentation-ink').trim(),
    cs.getPropertyValue('--presentation-paper').trim(),
  ];
  for (const c of candidates) {
    if (!c) continue;
    const rgb = rgbOf(c);
    if (rgb && surfaces.every((bg) => contrast(rgb, bg) >= 1.6)) return c;
  }
  return getComputedStyle(from).color;
}

/** The mount's slide elements, document order (direct children only). */
const slidesOf = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(':scope > [data-slide]'));

/** The live 0-based index, mirrored by activate() for ddf$ / bridge reads. */
const indexOf = (root: HTMLElement): number => coerceIndex(root.dataset.currentSlide, 0);

/**
 * The deck currently in CONFIRMED native fullscreen (its promise resolved).
 * Exit bookkeeping can then distinguish "this deck left native fullscreen"
 * (clear its data-fullscreen) from a deck sitting in the fallback mode
 * (which never fires fullscreenchange and must keep its attribute).
 */
let nativeDeck: HTMLElement | null = null;

/**
 * Enter fullscreen: the standard spelling with a rejection fallback. An
 * embedded deck (iframe without allow="fullscreen") or a gesture-less
 * programmatic call rejects - instead of silently lying, the deck switches
 * into the fixed-overlay focus mode (same data-fullscreen attribute; CSS
 * owns the visual). A resolving promise confirms NATIVE mode; the
 * fullscreenchange listener keeps the attribute in sync from there on.
 */
function enterFullscreen(root: Deck): void {
  const host = root as HTMLElement & { webkitRequestFullscreen?: () => void };
  if (typeof host.requestFullscreen === 'function') {
    host.requestFullscreen().then(
      () => {
        nativeDeck = root;
      },
      () => {
        root.dataset.fullscreen = ''; // denied → honest fallback overlay
      },
    );
    return;
  }
  host.webkitRequestFullscreen?.();
  nativeDeck = root;
  root.dataset.fullscreen = '';
}

/** Leave fullscreen (native when active) and always drop the mode attribute. */
function exitFullscreen(root: Deck): void {
  delete root.dataset.fullscreen;
  const doc = document as Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
  if ((doc.fullscreenElement ?? doc.webkitFullscreenElement) === root) {
    try {
      (doc.exitFullscreen?.bind(doc) ?? doc.webkitExitFullscreen?.bind(doc))?.();
    } catch {
      /* already gone */
    }
  }
  if (nativeDeck === root) nativeDeck = null;
}

/**
 * UI side of setState: 'default' = activate the configured slide (optional
 * { index }); a bare setState('default') (the bridge reset) additionally drops
 * the mode toggles back to the authored surface. 'notes'/'fullscreen' turn
 * their mode ON (the bridge sends value:false to clear). Unknown names throw.
 */
function triggerStateChange(root: Deck, stateName: string, config: Record<string, unknown> = {}): void {
  if (!presentationStates.includes(stateName)) {
    throw new Error(`presentation: unknown state "${stateName}" (supported: ${presentationStates.join(', ')})`);
  }
  if (stateName === 'default') {
    if (config.index !== undefined) root._presentationActivate?.(clampIndex(config.index, slidesOf(root).length));
    // bare reset (no index, no explicit mode) → authored surface
    if (config.index === undefined && config.notes === undefined && config.fullscreen === undefined) {
      delete root.dataset.notes;
      exitFullscreen(root);
    }
    return;
  }
  if (stateName === 'notes') {
    root.toggleAttribute('data-notes', config.value !== false);
    return;
  }
  if (config.value === false) exitFullscreen(root);
  else enterFullscreen(root);
}

/** Registry-level API; pass the mount explicitly. Unknown names throw. */
export const presentationApi = {
  setState(root: HTMLElement, stateName: string, config: Record<string, unknown> = {}) {
    triggerStateChange(root as Deck, stateName, config);
    // state lives on the ELEMENT, not module scope (AGENTS.md "State API")
    root.dataset.stateName = stateName;
    root._stateConfig = config;
  },
  getState(root: HTMLElement) {
    // reflect reality: keyboard/controls/hash move the deck without setState()
    return {
      name: root.dataset.stateName || 'default',
      config: {
        ...root._stateConfig,
        slide: indexOf(root),
        notes: root.hasAttribute('data-notes'),
        fullscreen: root.hasAttribute('data-fullscreen'),
      },
    };
  },
};

df$.presentationApi = presentationApi;
df$.presentationStates = presentationStates;

/** One document-level keyboard listener for all decks (global-flag guard). */
let keysBound = false;

/**
 * Why: keyboard is the deck's primary surface (← → Space Home End, N notes,
 * F fullscreen). One listener routes by the key's context - while focus sits
 * inside a deck, that deck answers; bare arrows (focus on <body>) drive the
 * first deck. Form fields and Space on focused controls are never hijacked.
 */
function bindKeyboard(): void {
  if (keysBound) return;
  keysBound = true;
  document.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable]')) return;
    const root =
      (target?.closest('.presentation') as Deck | null) ?? document.querySelector<Deck>('.presentation');
    if (!root) return;
    // Space belongs to a focused control, not to the deck
    if (e.key === ' ' && target?.closest('button, a, [role="button"]')) return;
    const total = slidesOf(root).length;
    const go = (index: number, forward?: boolean): void => root._presentationActivate?.(index, forward);
    const step = (delta: number): void => {
      const next = indexOf(root) + delta;
      // data-loop wraps at both ends (a deck is a ring, when asked to be)
      if (root.hasAttribute('data-loop') && total > 1) go((next + total) % total, delta > 0);
      else go(next, delta > 0);
    };
    let handled = true;
    switch (e.key) {
      case 'ArrowRight':
      case 'PageDown':
      case ' ':
        step(1);
        break;
      case 'ArrowLeft':
      case 'PageUp':
        step(-1);
        break;
      case 'Home':
        go(0);
        break;
      case 'End':
        go(total - 1);
        break;
      case 'n':
      case 'N':
        root.toggleAttribute('data-notes');
        break;
      case 'f':
      case 'F':
        triggerStateChange(root, 'fullscreen', { value: !root.hasAttribute('data-fullscreen') });
        break;
      default:
        handled = false;
    }
    if (handled) e.preventDefault();
  });
}

/** Hash deep-links (#slide-id) and later hashchange navigations move a deck. */
let hashBound = false;
function bindHash(): void {
  if (hashBound) return;
  hashBound = true;
  addEventListener('hashchange', () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    const slide = document.getElementById(id);
    const root = slide?.closest('.presentation') as Deck | null;
    if (root && slide) root._presentationActivate?.(slidesOf(root).indexOf(slide));
  });
}

/**
 * Native-fullscreen bookkeeping (once per document): entering confirms the
 * attribute; leaving (Escape / browser chrome) clears it - but only for the
 * deck that was actually in NATIVE mode, never for one in the fallback mode.
 */
let fullscreenBound = false;
function bindFullscreen(): void {
  if (fullscreenBound) return;
  fullscreenBound = true;
  document.addEventListener('fullscreenchange', () => {
    const el = document.fullscreenElement as HTMLElement | null;
    if (el?.classList.contains('presentation')) el.dataset.fullscreen = '';
    if (!el && nativeDeck) {
      delete nativeDeck.dataset.fullscreen;
      nativeDeck = null;
    }
  });
}

function init(): void {
  document.querySelectorAll<Deck>('.presentation:not([data-init])').forEach((root) => {
    root.dataset.init = '';

    // bind-scope the api per instance: `$('#deck').api.setState('notes')`
    root.api = {
      setState: (stateName: string, config?: Record<string, unknown>) =>
        presentationApi.setState(root, stateName, config),
      getState: () => presentationApi.getState(root),
    };

    // ── the visual flip: the one place slide visibility (and its a11y state)
    // changes, plus everything a slide does on arrival ──────────────────────
    const enter = (target: HTMLElement): void => {
      const slides = slidesOf(root);
      slides.forEach((slide) => {
        const on = slide === target;
        slide.toggleAttribute('data-active', on);
        // visually-hidden must also be inert for AT + tab order (not just
        // visibility:hidden - inactive slides hold no interactive surface)
        slide.inert = !on;
        slide.setAttribute('aria-hidden', String(!on));
        // media belongs to the stage it is on: autoplay videos run only on
        // the active slide and restart on every arrival
        slide.querySelectorAll<HTMLVideoElement>('video[autoplay]').forEach((video) => {
          if (on) {
            video.currentTime = 0;
            void video.play()?.catch(() => {});
          } else video.pause();
        });
      });

      // animated counters are per-slide on activation (a revisit re-runs them)
      target.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => animateCount(el));

      // entrances replay per activation through the SHARED motion controller
      // (motion.css keyframes): cancel → play is deterministic, so a fresh
      // load AND a revisit get identical entrances (AGENTS.md: animations,
      // not transitions - no rendered "from" state required)
      target.querySelectorAll<HTMLElement>('[data-df-entrance]').forEach((el) => {
        entrance(el);
      });
      target.querySelectorAll<SVGElement>('[data-df-draw]').forEach((el) => {
        draw(el);
      });
    };

    /**
     * Why: every slide that comes and goes animates. A curtain target
     * (data-anim-in="blocksIn") covers the LEAVING slide, the flip happens
     * under the cover, then the cover rolls off the arriving slide - in a
     * color that contrasts with both surfaces. Everything else plays the
     * leaving slide's out-animation and the arriving slide's in-animation
     * concurrently ([data-leaving] keeps the old slide visible meanwhile).
     * A new navigation first SETTLES the running transition (finish +
     * cleanup), so fast arrow keys are never swallowed.
     */
    const transition = (from: HTMLElement | undefined, to: HTMLElement, forward: boolean): void => {
      root._presentationSettle?.();
      root._presentationSettle = undefined;
      const inSpec = animSpec(root, to, 'in', forward);
      if (!from || from === to) {
        enter(to);
        channelFor(inSpec.name === 'blocksIn' ? 'fadeIn' : inSpec.name).play(to, inSpec.opts);
        return;
      }
      if (inSpec.name === 'blocksIn') {
        // the curtain is ONE transition: cover + reveal share its duration
        const cfg: AnimOptions = {
          ...inSpec.opts,
          duration: (inSpec.opts.duration ?? 1500) / 2,
          color: curtainColor(root, from, to, inSpec.opts.color),
        };
        root.setAttribute('data-curtain', '');
        const cover = channelFor('blocksIn').play(from, cfg);
        let flipped = false;
        const flip = (): void => {
          if (flipped) return;
          flipped = true;
          cover.reset(); // a settled blocksIn keeps its overlay - the hidden slide must not
          enter(to);
          root.removeAttribute('data-curtain');
          const reveal = channelFor('blocksOut').play(to, cfg);
          root._presentationSettle = () => reveal.finish();
        };
        root._presentationSettle = () => {
          cover.finish();
          flip();
        };
        void cover.finished.then(flip);
        return;
      }
      const outSpec = animSpec(root, from, 'out', forward);
      from.setAttribute('data-leaving', '');
      enter(to);
      const arriving = channelFor(inSpec.name).play(to, inSpec.opts);
      const leaving = channelFor(outSpec.name === 'blocksOut' ? DEFAULT_OUT : outSpec.name).play(from, outSpec.opts);
      let done = false;
      const cleanup = (): void => {
        if (done) return;
        done = true;
        from.removeAttribute('data-leaving');
        leaving.reset();
      };
      void leaving.finished.then(cleanup);
      root._presentationSettle = () => {
        arriving.finish();
        cleanup();
      };
    };

    // ── activation: chrome updates now, the flip runs through transition() ──
    let booted = false;
    const activate = (index: number, forward?: boolean): void => {
      const slides = slidesOf(root);
      if (slides.length === 0) return;
      const clamped = clampIndex(index, slides.length);
      // the first activation is an arrival without a departure (authored
      // data-active markup is normalized by enter())
      const previous = booted ? slides.find((s) => s.hasAttribute('data-active')) : undefined;
      const fromIndex = previous ? slides.indexOf(previous) : -1;
      if (booted && previous === slides[clamped]) return;
      booted = true;
      transition(previous, slides[clamped], forward ?? clamped >= fromIndex);
      // mirror the live index for ddf$, the bridge and getState()
      root.dataset.currentSlide = String(clamped);

      const counter = root.querySelector('.presentation-counter');
      if (counter) counter.textContent = `${clamped + 1} / ${slides.length}`;
      const progress = root.querySelector('progress.presentation-progress');
      if (progress) {
        progress.setAttribute('max', String(slides.length));
        progress.setAttribute('value', String(clamped + 1));
      }
      const loop = root.hasAttribute('data-loop');
      const prev = root.querySelector<HTMLButtonElement>('[data-presentation-action="prev"]');
      const next = root.querySelector<HTMLButtonElement>('[data-presentation-action="next"]');
      if (prev) prev.disabled = clamped === 0 && !loop;
      if (next) next.disabled = clamped === slides.length - 1 && !loop;

      // in-slide number chip: NN ⁄ NN (fraction slash - inherently slanted),
      // filled per activation; the chrome counter remains the a11y surface
      const pad = (n: number): string => String(n).padStart(2, '0');
      const number = slides[clamped].querySelector('.presentation-slide-number');
      if (number) number.textContent = `${pad(clamped + 1)}⁄${pad(slides.length)}`;
    };
    root._presentationActivate = activate;

    // ── fixed artboard → uniform scale (ResizeObserver does the math,
    // never a window.resize listener; container-accurate) ────────────────
    const applyScale = (): void => {
      const cs = getComputedStyle(root);
      const w = parseFloat(cs.getPropertyValue('--presentation-width')) || 1600;
      const h = parseFloat(cs.getPropertyValue('--presentation-height')) || 900;
      const box = root.getBoundingClientRect();
      const scale = Math.min(box.width / w, box.height / h);
      if (Number.isFinite(scale) && scale > 0) root.style.setProperty('--presentation-scale', String(scale));
    };
    new ResizeObserver(applyScale).observe(root);

    // ── in-deck control buttons (click delegation on the mount) ─────────
    root.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement | null)?.closest?.('[data-presentation-action]');
      if (!btn || !root.contains(btn)) return;
      const total = slidesOf(root).length;
      const at = indexOf(root);
      switch (btn.getAttribute('data-presentation-action')) {
        case 'next':
          activate(root.hasAttribute('data-loop') ? (at + 1) % total : at + 1, true);
          break;
        case 'prev':
          activate(root.hasAttribute('data-loop') && at === 0 ? total - 1 : at - 1, false);
          break;
        case 'first':
          activate(0);
          break;
        case 'last':
          activate(total - 1);
          break;
        case 'notes':
          root.toggleAttribute('data-notes');
          break;
        case 'fullscreen':
          triggerStateChange(root, 'fullscreen', { value: !root.hasAttribute('data-fullscreen') });
          break;
      }
    });

    bindKeyboard();
    bindHash();
    bindFullscreen();

    // initial slide: #hash deep-link > authored data-current-slide > first
    const hashId = decodeURIComponent(location.hash.slice(1));
    const hashIndex = hashId ? slidesOf(root).findIndex((s) => s.id === hashId) : -1;
    activate(hashIndex >= 0 ? hashIndex : coerceIndex(root.dataset.currentSlide, 0));
    applyScale();
  });
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
