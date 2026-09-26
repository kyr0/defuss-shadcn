// -- Animation Canvas ----------------------------------------------
// A chess-board slide canvas: slides sit side by side on one board, the
// viewport frames exactly one of them (1:1), arrow keys move directionally
// (data-east/west/north/south id refs), and a zoomed-out overview shows the
// whole board at once (click a tile to zoom back in). EVERY animation is the
// shared engine (df$.anim, src/shared/anim.ts): per-slide in/out channels are
// declared in markup (data-anim-in/data-anim-out + discrete config attrs) and
// played through the registry - the canvas composes the public engine, it
// never grows a private one. The board pan is plain WAAPI (el.animate), the
// platform API, with a 1ms collapse under prefers-reduced-motion (same
// contract the engine keeps). Keyboard rides the shared bindGlobalKeys.
//
// Markup contract: .anim-canvas viewport > .anim-canvas-slide sections with
// id + relation attrs. JS moves the slides into ONE .anim-canvas-board div
// that carries the pan/zoom transform (transform-origin: 0 0). Slide positions
// derive by BFS from the start slide (0,0): east = x+1, west = x−1,
// south = y+1, north = y−1. Dangling id refs and position conflicts are loud
// console errors, never silent misplacement. State lives ON THE ROOT element
// (dataset.stateName + data-current-slide + data-overview) - the bound `api`
// is the only mutator (AGENTS.md "State API").

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
// NOTE: `anim` (the registry) is imported, not animChannel - the shared
// namespace core installs (src/core/index.ts) publishes `anim` only, so the
// emitted binding can only destructure names that exist there. Name
// validation below goes through anim.names, keeping the same fail-loud
// contract animChannel has.
import { defussGlobals, defussQuery, anim, bindGlobalKeys } from '../../shared/state-api.js';
import type { AnimChannel, AnimDirection, AnimOptions } from '../../shared/anim.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

const animCanvasStates = ['default', 'overview'];

/** Board geometry of one slide cell, in board units (px at scale 1). */
interface SlidePos {
  x: number;
  y: number;
}

/** The one pan/zoom the board currently rests at (or animates toward). */
interface BoardView {
  s: number;
  tx: number;
  ty: number;
}

/** Per-instance context - state lives on the element, never module scope. */
interface CanvasCtx {
  board: HTMLElement;
  slides: HTMLElement[];
  byId: Map<string, HTMLElement>;
  pos: Map<HTMLElement, SlidePos>;
  w: number;
  h: number;
  active: HTMLElement;
  busy: boolean;
  view: BoardView | null;
  pan: Animation | null;
}

type CanvasRoot = HTMLElement & { _animCanvas?: CanvasCtx };

const DIRS: Record<AnimDirection, [number, number]> = {
  east: [1, 0],
  west: [-1, 0],
  south: [0, 1],
  north: [0, -1],
};

/**
 * Registry lookup with the engine's fail-loud contract: a typo in
 * data-anim-in/data-anim-out throws a naming error, never a silent no-op
 * (mirrors animChannel - which the emitted shared binding cannot carry, see
 * the preamble note).
 */
function channelFor(name: string): AnimChannel {
  if (!(anim.names as readonly string[]).includes(name)) {
    throw new Error(`anim-canvas: unknown animation "${name}" (supported: ${anim.names.join(', ')})`);
  }
  return anim[name as keyof typeof anim] as AnimChannel;
}

/** The animation a slide declares for one phase, with per-slide config. */
function animNameFor(slide: HTMLElement, phase: 'in' | 'out'): string {
  return (phase === 'in' ? slide.dataset.animIn : slide.dataset.animOut) || (phase === 'in' ? 'slideIn' : 'slideOut');
}

/**
 * Discrete per-slide config attrs (data-anim-in-direction|duration|easing|
 * origin|distance|blocks|stagger|color, same for -out-). Absent values fall
 * back to the engine defaults; direction falls back to the travel direction.
 */
function animOptsFor(slide: HTMLElement, phase: 'in' | 'out', travel: AnimDirection): AnimOptions {
  const d = slide.dataset as Record<string, string | undefined>;
  const p = phase === 'in' ? 'animIn' : 'animOut';
  const opts: AnimOptions = { direction: (d[`${p}Direction`] as AnimDirection | undefined) ?? travel };
  const duration = parseFloat(d[`${p}Duration`] ?? '');
  if (Number.isFinite(duration)) opts.duration = duration;
  if (d[`${p}Easing`]) opts.easing = d[`${p}Easing`];
  if (d[`${p}Origin`]) opts.origin = d[`${p}Origin`];
  if (d[`${p}Distance`]) opts.distance = d[`${p}Distance`];
  const blocks = parseInt(d[`${p}Blocks`] ?? '', 10);
  if (Number.isFinite(blocks)) opts.blocks = blocks;
  const stagger = parseFloat(d[`${p}Stagger`] ?? '');
  if (Number.isFinite(stagger)) opts.stagger = stagger;
  if (d[`${p}Color`]) opts.color = d[`${p}Color`];
  return opts;
}

const transformFor = (v: BoardView): string => `translate(${v.tx}px, ${v.ty}px) scale(${v.s})`;

const reducedMotion = (): boolean =>
  typeof globalThis.matchMedia === 'function' &&
  globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Root-level pan duration (data-pan-duration, ms); 1500 default, 1 when reduced. */
function panDuration(root: CanvasRoot): number {
  if (reducedMotion()) return 1;
  const v = parseFloat(root.dataset.panDuration ?? '');
  return Number.isFinite(v) ? v : 1500;
}

/** The 1:1 view: the given slide framed exactly by the viewport, centered. */
function focusView(root: CanvasRoot, ctx: CanvasCtx, slide: HTMLElement): BoardView | null {
  const box = root.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) return null; // hidden mount - ResizeObserver re-fires
  const p = ctx.pos.get(slide) ?? { x: 0, y: 0 };
  const s = Math.min(box.width / ctx.w, box.height / ctx.h);
  return {
    s,
    tx: (box.width - ctx.w * s) / 2 - p.x * ctx.w * s,
    ty: (box.height - ctx.h * s) / 2 - p.y * ctx.h * s,
  };
}

/** The overview view: every slide in frame at once, ~8% margin around the bbox. */
function overviewView(root: CanvasRoot, ctx: CanvasCtx): BoardView | null {
  const box = root.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of ctx.pos.values()) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const bw = (maxX - minX + 1) * ctx.w;
  const bh = (maxY - minY + 1) * ctx.h;
  const s = Math.min(box.width / bw, box.height / bh) * 0.92;
  return {
    s,
    tx: (box.width - bw * s) / 2 - minX * ctx.w * s,
    ty: (box.height - bh * s) / 2 - minY * ctx.h * s,
  };
}

/**
 * Pan/zoom the board to a view. Platform WAAPI with fill:'both' while in
 * flight; the settled transform lands as the board's own style so the resting
 * state never depends on a live animation. A new pan cancels the old one.
 */
function panTo(root: CanvasRoot, ctx: CanvasCtx, view: BoardView | null, animate = true): Promise<void> {
  if (!view) return Promise.resolve();
  ctx.pan?.cancel();
  ctx.pan = null;
  const to = transformFor(view);
  const from = ctx.view ? transformFor(ctx.view) : null;
  ctx.view = view;
  if (!animate || !from || from === to || panDuration(root) <= 1) {
    ctx.board.style.transform = to;
    return Promise.resolve();
  }
  const flight = ctx.board.animate([{ transform: from }, { transform: to }], {
    duration: panDuration(root),
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    fill: 'both',
  });
  ctx.pan = flight;
  return flight.finished
    .catch(() => undefined) // cancel rejects - a superseded pan is not an error
    .then(() => {
      if (ctx.pan === flight) {
        ctx.board.style.transform = to;
        flight.cancel();
        ctx.pan = null;
      }
    });
}

/** a11y + chrome mirrors of the active slide: inert/aria-hidden, control availability. */
function applySlideState(root: CanvasRoot, ctx: CanvasCtx): void {
  const overview = root.hasAttribute('data-overview');
  for (const s of ctx.slides) {
    const on = overview || s === ctx.active;
    s.inert = !on;
    if (on) s.removeAttribute('aria-hidden');
    else s.setAttribute('aria-hidden', 'true');
  }
  // authored directional controls follow the active slide's relation map
  root.querySelectorAll('[data-anim-canvas-go]').forEach((el) => {
    const dir = el.getAttribute('data-anim-canvas-go');
    if (dir === 'overview' || !(el instanceof HTMLButtonElement)) return;
    el.disabled = !ctx.active.dataset[dir as AnimDirection];
  });
}

/** The one place slide activation (and its mirrors) changes. */
function activate(root: CanvasRoot, ctx: CanvasCtx, slide: HTMLElement): void {
  ctx.active = slide;
  for (const s of ctx.slides) s.toggleAttribute('data-active', s === slide);
  root.dataset.currentSlide = slide.id; // the bridge/schema observation point
  applySlideState(root, ctx);
}

/**
 * The transition. No-op while busy or already there; an overview open
 * collapses into the target (the zoom IS the transition). The blocks pair is
 * always a CURTAIN, never a per-slide effect: whether the target declares
 * data-anim-in="blocksIn" or the current slide declares
 * data-anim-out="blocksOut", the cover builds on the slide we LEAVE, the
 * board pans and the active flag flips underneath, and the reveal plays on
 * the slide we ARRIVE at (blocksOut for a blocks target, else its own
 * in-anim). A declared blocksOut therefore never replays a pointless
 * cover+reveal on the old slide the user just moved away from.
 * Everything else plays current's out-anim and target's in-anim concurrently
 * with the pan - all through the shared registry channels.
 *
 * busy covers exactly the sequencing window (cover → pan → flip); the slide
 * in/out anims themselves TRAIL - they are per-channel and restart
 * deterministically, so a fast arrow-key repeat is never swallowed by a
 * cosmetic tail.
 */
async function goTo(root: CanvasRoot, ctx: CanvasCtx, id: string): Promise<void> {
  const target = ctx.byId.get(id);
  if (!target) {
    console.error(`anim-canvas: goTo("${id}") - no .anim-canvas-slide with that id in this canvas`);
    return;
  }
  if (ctx.busy) return;
  if (target === ctx.active && !root.hasAttribute('data-overview')) return;
  ctx.busy = true;
  try {
    if (root.hasAttribute('data-overview')) {
      // zoom back into the clicked/chosen slide - the pan carries the story
      root.removeAttribute('data-overview');
      activate(root, ctx, target);
      await panTo(root, ctx, focusView(root, ctx, target));
      return;
    }
    const from = ctx.pos.get(ctx.active) ?? { x: 0, y: 0 };
    const to = ctx.pos.get(target) ?? from;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const travel: AnimDirection = dx > 0 ? 'east' : dx < 0 ? 'west' : dy > 0 ? 'south' : dy < 0 ? 'north' : 'east';
    const current = ctx.active;
    const inName = animNameFor(target, 'in');
    const outName = target !== current ? animNameFor(current, 'out') : null;

    if (target !== current && (inName === 'blocksIn' || outName === 'blocksOut')) {
      // curtain config comes from the blocks-declaring slide
      const cfg = animOptsFor(inName === 'blocksIn' ? target : current, inName === 'blocksIn' ? 'in' : 'out', travel);
      const cover = channelFor('blocksIn').play(current, cfg);
      const pan = panTo(root, ctx, focusView(root, ctx, target));
      await cover.finished; // sequencing: the flip happens under the cover
      await pan;
      activate(root, ctx, target);
      cover.reset(); // a settled blocksIn keeps its overlay - the now-hidden slide must not
      // the reveal belongs to the slide we ARRIVE at (cosmetic, trails)
      const reveal = inName === 'blocksIn' ? 'blocksOut' : inName;
      channelFor(reveal).play(target, animOptsFor(target, 'in', travel));
      return;
    }

    activate(root, ctx, target);
    const pan = panTo(root, ctx, focusView(root, ctx, target));
    // in/out anims trail the pan: per-channel, deterministic restart
    channelFor(inName).play(target, animOptsFor(target, 'in', travel));
    if (target !== current) {
      channelFor(outName!).play(current, animOptsFor(current, 'out', travel));
    }
    await pan;
  } finally {
    ctx.busy = false;
  }
}

/** Overview mode: every slide in frame, clickable (CSS owns the cursor). */
function enterOverview(root: CanvasRoot, ctx: CanvasCtx): void {
  // an in-flight pan never blocks the toggle - panTo cancels it cleanly
  if (root.hasAttribute('data-overview')) return;
  ctx.busy = true;
  root.setAttribute('data-overview', ''); // the schema observation point
  applySlideState(root, ctx); // every slide is visible now - nothing stays inert
  void panTo(root, ctx, overviewView(root, ctx)).then(() => {
    ctx.busy = false;
  });
}

/** Leave overview; `focus` (a clicked tile) becomes the active slide. */
function exitOverview(root: CanvasRoot, ctx: CanvasCtx, focus?: HTMLElement): void {
  // an in-flight enter pan never swallows the exit (the bridge toggles fast)
  if (!root.hasAttribute('data-overview')) return;
  ctx.busy = true;
  root.removeAttribute('data-overview');
  if (focus && ctx.byId.get(focus.id) === focus) activate(root, ctx, focus);
  else applySlideState(root, ctx);
  void panTo(root, ctx, focusView(root, ctx, ctx.active)).then(() => {
    ctx.busy = false;
  });
}

function toggleOverview(root: CanvasRoot, ctx: CanvasCtx): void {
  if (root.hasAttribute('data-overview')) exitOverview(root, ctx);
  else enterOverview(root, ctx);
}

/**
 * UI side of setState: 'overview' zooms out (config.value === false zooms
 * back - the bridge's checkbox off); 'default' with { slide } focuses that
 * slide, bare 'default' leaves overview / re-frames the active slide.
 * Unknown names throw.
 */
function triggerStateChange(root: CanvasRoot, stateName: string, config: Record<string, unknown> = {}): void {
  if (!animCanvasStates.includes(stateName)) {
    throw new Error(`anim-canvas: unknown state "${stateName}" (supported: ${animCanvasStates.join(', ')})`);
  }
  const ctx = root._animCanvas;
  if (!ctx) return;
  if (stateName === 'overview') {
    if (config.value === false) exitOverview(root, ctx);
    else enterOverview(root, ctx);
    return;
  }
  if (typeof config.slide === 'string') void goTo(root, ctx, config.slide);
  else if (root.hasAttribute('data-overview')) exitOverview(root, ctx);
  else void panTo(root, ctx, focusView(root, ctx, ctx.active));
}

/** Registry-level API; pass the root explicitly. Unknown names throw. */
export const animCanvasApi = {
  setState(root: HTMLElement, stateName: string, config: Record<string, unknown> = {}) {
    triggerStateChange(root as CanvasRoot, stateName, config);
    // state lives on the ELEMENT, not module scope (AGENTS.md "State API")
    root.dataset.stateName = stateName;
    root._stateConfig = config;
  },
  getState(root: HTMLElement) {
    const ctx = (root as CanvasRoot)._animCanvas;
    // reflect reality: keyboard/clicks move the canvas without setState()
    return {
      name: root.dataset.stateName || 'default',
      config: {
        ...root._stateConfig,
        slide: ctx?.active.id,
        overview: root.hasAttribute('data-overview'),
      },
    };
  },
};

df$.animCanvasApi = animCanvasApi;
df$.animCanvasStates = animCanvasStates;

/**
 * Keyboard routing: the focused canvas answers first; otherwise the first
 * canvas intersecting the viewport (presentation's routing idea, simplified —
 * editable targets are already filtered by the shared listener). Unhandled
 * directions (no neighbor that way) are NOT swallowed, so arrow-key scrolling
 * keeps working at the board's edge.
 */
function pickCanvas(target: EventTarget | null): CanvasRoot | null {
  const focused = target instanceof HTMLElement ? (target.closest('.anim-canvas') as CanvasRoot | null) : null;
  if (focused) return focused;
  const all = Array.from(document.querySelectorAll<CanvasRoot>('.anim-canvas'));
  return (
    all.find((r) => {
      const b = r.getBoundingClientRect();
      return b.bottom > 0 && b.top < globalThis.innerHeight && b.right > 0 && b.left < globalThis.innerWidth;
    }) ??
    all[0] ??
    null
  );
}

let keysBound = false;
function bindKeys(): void {
  if (keysBound) return;
  keysBound = true;
  bindGlobalKeys((e) => {
    const key = e.key;
    const dir: AnimDirection | null =
      key === 'ArrowRight' ? 'east' : key === 'ArrowLeft' ? 'west' : key === 'ArrowDown' ? 'south' : key === 'ArrowUp' ? 'north' : null;
    const toggle = key === 'o' || key === 'O' || key === 'Escape';
    if (!dir && !toggle) return;
    const root = pickCanvas(e.target);
    const ctx = root?._animCanvas;
    if (!root || !ctx) return;
    if (dir && !ctx.active.dataset[dir]) return; // no neighbor - never swallow the key
    e.preventDefault();
    if (dir) void goTo(root, ctx, ctx.active.dataset[dir] as string);
    else toggleOverview(root, ctx);
    return true;
  });
}

function init(): void {
  document.querySelectorAll<CanvasRoot>('.anim-canvas:not([data-init])').forEach((root) => {
    root.dataset.init = '';

    // bind-scope the api per instance: `$('#board').api.setState('overview')`
    root.api = {
      setState: (stateName: string, config?: Record<string, unknown>) =>
        animCanvasApi.setState(root, stateName, config),
      getState: () => animCanvasApi.getState(root),
    };

    // the board: ONE transformed layer holding every slide. Reused when the
    // markup already carries one (the docs CodeExample round-trips serialized
    // live DOM back into the editor - init must stay idempotent for it).
    let board = root.querySelector<HTMLElement>(':scope > .anim-canvas-board');
    if (!board) {
      board = document.createElement('div');
      board.className = 'anim-canvas-board';
      for (const slide of Array.from(root.querySelectorAll<HTMLElement>(':scope > .anim-canvas-slide'))) {
        dfDollar(board).append(slide);
      }
      root.prepend(board);
    }
    const slides = dfDollar(board).find('.anim-canvas-slide') as HTMLElement[];
    if (slides.length === 0) return;

    // artboard contract: board units come from --anim-canvas-width/height
    const cs = getComputedStyle(root);
    const w = parseFloat(cs.getPropertyValue('--anim-canvas-width')) || 1280;
    const h = parseFloat(cs.getPropertyValue('--anim-canvas-height')) || 720;

    // relation map → board positions by BFS from the start slide (0,0):
    // the authored data-active slide, else the first one. Dangling id refs
    // and conflicting positions fail LOUD (console.error), never silently.
    const byId = new Map<string, HTMLElement>();
    for (const s of slides) {
      if (!s.id) {
        console.error('anim-canvas: every .anim-canvas-slide needs an id - the data-east/west/north/south relation map references slides by id');
        continue;
      }
      byId.set(s.id, s);
    }
    const start = slides.find((s) => s.hasAttribute('data-active')) ?? slides[0];
    const pos = new Map<HTMLElement, SlidePos>([[start, { x: 0, y: 0 }]]);
    const queue: HTMLElement[] = [start];
    for (let qi = 0; qi < queue.length; qi++) {
      const cur = queue[qi];
      const p = pos.get(cur) as SlidePos;
      for (const dir of Object.keys(DIRS) as AnimDirection[]) {
        const ref = cur.dataset[dir];
        if (!ref) continue;
        const neighbor = byId.get(ref);
        if (!neighbor) {
          console.error(
            `anim-canvas: #${cur.id || '(unnamed)'} declares data-${dir}="${ref}" but no .anim-canvas-slide with id="${ref}" exists in this canvas - dangling id ref`,
          );
          continue;
        }
        const np: SlidePos = { x: p.x + DIRS[dir][0], y: p.y + DIRS[dir][1] };
        const existing = pos.get(neighbor);
        if (existing) {
          if (existing.x !== np.x || existing.y !== np.y) {
            console.error(
              `anim-canvas: conflicting position for #${ref} - reached as (${np.x},${np.y}) from #${cur.id}, already placed at (${existing.x},${existing.y}); the relation map must be consistent`,
            );
          }
          continue;
        }
        pos.set(neighbor, np);
        queue.push(neighbor);
      }
    }
    // slides unreachable from the start slide: loud error + a deterministic
    // fallback row past the board's east edge (never silently stacked at 0,0)
    const unreachable = slides.filter((s) => !pos.has(s));
    if (unreachable.length) {
      console.error(
        `anim-canvas: ${unreachable.map((s) => `#${s.id || '(unnamed)'}`).join(', ')} unreachable from #${start.id || '(the first slide)'} - wire them into the data-east/west/north/south relation map`,
      );
      let fx = Math.max(...Array.from(pos.values()).map((p) => p.x)) + 1;
      for (const s of unreachable) pos.set(s, { x: fx++, y: 0 });
    }
    // one cell per coordinate pair (a cycle wiring two slides onto the same
    // cell corrupts the board - say so)
    const taken = new Map<string, HTMLElement>();
    for (const [s, p] of pos) {
      const k = `${p.x},${p.y}`;
      const other = taken.get(k);
      if (other) {
        console.error(
          `anim-canvas: #${s.id || '(unnamed)'} and #${other.id || '(unnamed)'} both land on board cell (${k}) - the relation map must give every slide its own cell`,
        );
      } else taken.set(k, s);
    }

    // board layout: absolute cells in board units (px at scale 1)
    for (const [s, p] of pos) {
      s.style.left = `${p.x * w}px`;
      s.style.top = `${p.y * h}px`;
      s.style.width = `${w}px`;
      s.style.height = `${h}px`;
    }

    // declared animation names are validated up front - a markup typo must
    // fail loud at init, not mid-transition (the registry throws the same
    // way; this just moves the error to authoring time)
    for (const s of slides) {
      for (const phase of ['In', 'Out'] as const) {
        const name = (s.dataset as Record<string, string | undefined>)[`anim${phase}`];
        if (name) channelFor(name);
      }
    }

    const ctx: CanvasCtx = { board, slides, byId, pos, w, h, active: start, busy: false, view: null, pan: null };
    root._animCanvas = ctx;

    // authored directional/overview chrome (optional): click delegation on the
    // root; in overview a click on a slide tile zooms back into it
    root.addEventListener('click', (e) => {
      const c = root._animCanvas;
      if (!c) return;
      const t = e.target as HTMLElement | null;
      const control = t?.closest?.('[data-anim-canvas-go]');
      if (control && root.contains(control)) {
        const dir = control.getAttribute('data-anim-canvas-go');
        if (dir === 'overview') toggleOverview(root, c);
        else {
          const id = c.active.dataset[dir as AnimDirection];
          if (id) void goTo(root, c, id);
        }
        return;
      }
      if (!root.hasAttribute('data-overview')) return;
      const tile = t?.closest?.('.anim-canvas-slide') as HTMLElement | null;
      if (tile && c.slides.includes(tile)) exitOverview(root, c, tile);
    });

    // uniform scale: board units → rendered viewport (ResizeObserver does the
    // math, never a window resize listener - same technique as presentation)
    const frame = (): void => {
      const c = root._animCanvas;
      if (!c) return;
      void panTo(root, c, root.hasAttribute('data-overview') ? overviewView(root, c) : focusView(root, c, c.active), false);
    };
    new ResizeObserver(frame).observe(root);

    activate(root, ctx, start);
    frame();
  });
}

bindKeys();
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
