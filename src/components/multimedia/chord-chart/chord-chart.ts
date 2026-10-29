// -- Chord Chart -------------------------------------------------
// One chord diagram of a fretted instrument from its markup: the shape (a fret per string), the barre the data names,
// a capo. Drawn across as the player sees the fretboard (the nut on the fretting hand's side, the 1st string on top)
// or upright (the classic chart: the nut on top), for either hand: dots where fingers go, nothing on an open string,
// × on a muted one, a barre as a dashed line, the first fret's number when the shape sits higher up the neck, a capo
// as the bold bar with the strings going on behind it. The Fretboard writes one per chord into its chords outlet and
// marks the one sounding (the active state).

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

const chordChartStates = ['default', 'active'];

/** The config every state takes. */
export interface ChordChartConfig {
  /** the chord's name - the caption */
  name?: string;
  /** the shape: a fret per string, from the string the tuning names first (a ukulele's G) to the 1st - "0003", "x32010", "x 10 12 12 12 10" for frets past 9; x mutes a string */
  shape?: string;
  /** the fret a barre lies on (one finger across the strings pressed there), null for none */
  barre?: number | null;
  /** the capo's fret, 0 for none */
  capo?: number;
}

// VERIFIED: (verify's API docs gate) the states below are exactly the declared ones, each
// described, and every config field typed, described and named in the code.
/** setState() configs per state. */
export interface ChordChartStateConfigs {
  /** The chart at rest. */
  default: ChordChartConfig;
  /** The chord sounding now (data-active): its frame, caption and dots in the primary colour. */
  active: ChordChartConfig;
}

/** A shape read: each string's fret (x for a muted one), from the string the tuning names first to the 1st. */
export type ChordChartShape = (number | 'x')[];

type Fret = number | 'x';
type Barre = { fret: number; from: number; to: number };

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const esc = (s: unknown): string =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );

/** a shape from its text: one character per string, or a space- / comma-separated list once a fret has two digits */
function parseShape(text: string | null | undefined): Fret[] | null {
  const s = String(text ?? '').trim();
  if (!s) return null;
  const tokens = /[\s,]/.test(s) ? s.split(/[\s,]+/).filter(Boolean) : [...s];
  const out: Fret[] = [];
  for (const t of tokens) {
    if (t === 'x' || t === 'X') out.push('x');
    else if (/^\d{1,2}$/.test(t) && Number(t) <= 24) out.push(Number(t));
    else return null;
  }
  return out.length >= 1 && out.length <= 12 ? out : null;
}
/** a shape as text: characters while every fret has one digit, else a spaced list */
const shapeText = (shape: Fret[]): string =>
  shape.some((f) => typeof f === 'number' && f > 9) ? shape.join(' ') : shape.join('');

/** a barre on a fret: the strings from the first to the last pressed there, every string between pressed there or
 *  higher - a barre the shape cannot hold is none */
function barreOf(shape: Fret[], fret: number): Barre | null {
  if (!(fret > 0)) return null;
  const at = shape.map((f, i) => (f === fret ? i : -1)).filter((i) => i >= 0);
  if (at.length < 2) return null;
  const from = at[0];
  const to = at[at.length - 1];
  for (let i = from; i <= to; i++) if (typeof shape[i] !== 'number' || (shape[i] as number) < fret) return null;
  return { fret, from, to };
}

const numAttr = (el: Element, name: string): number | null => {
  const v = el.getAttribute(name);
  return v === null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);
};
const captionOf = (el: Element): string => dfDollar(el).children('figcaption').text().trim();

/** the chart's grid: four frets or more, the first fret's number when the shape sits higher up (above the 4th) */
function gridMarkup(el: Element): string {
  const name = captionOf(el);
  const shape = parseShape(el.getAttribute('data-shape'));
  const n = shape?.length ?? Math.max(1, numAttr(el, 'data-strings') ?? 4);
  const played = (shape ?? []).filter((f): f is number => typeof f === 'number' && f > 0);
  const top = Math.max(0, ...played);
  const base = top > 4 ? Math.min(...played) : 1;
  const rows = clamp(top - base + 1, 4, 6);
  const barre = shape ? barreOf(shape, numAttr(el, 'data-barre') ?? 0) : null;
  const barred = (f: Fret, i: number) => !!barre && f === barre.fret && i >= barre.from && i <= barre.to;
  const marks = (shape ?? [])
    .map((f, i) =>
      f === 'x'
        ? `<span class="chord-chart-mark" data-string="${n - i}" style="--chord-chart-i: ${i}">×</span>`
        : f === 0 || barred(f, i)
          ? ''
          : `<span class="chord-chart-dot" data-string="${n - i}" style="--chord-chart-i: ${i}; --chord-chart-r: ${f - base}"></span>`,
    )
    .join('');
  const bar = barre
    ? `<span class="chord-chart-barre" style="--chord-chart-i: ${barre.from}; --chord-chart-j: ${barre.to}; --chord-chart-r: ${barre.fret - base}"></span>`
    : '';
  const capo = clamp(Math.round(numAttr(el, 'data-capo') ?? 0), 0, 12);
  const label = shape
    ? `${name ? `${name}: ` : ''}${shape.join(' ')}${barre ? `, barre at fret ${barre.fret}` : ''}${capo ? `, capo ${capo}` : ''}`
    : name;
  return `<div class="chord-chart-grid" role="img" aria-label="${esc(label)}" style="--chord-chart-strings: ${n}; --chord-chart-frets: ${rows}"${base > 1 ? ` data-base="${base}"` : ''}${capo && base === 1 ? ` data-capo="${capo}"` : ''}>${bar}${marks}</div>`;
}

/** Draw the grid again (another shape, barre, capo or name) - after the caption. */
function draw(el: HTMLElement): void {
  const markup = gridMarkup(el);
  // a morph of the markup around it (the Fretboard writing its chords outlet again) keeps the chart, not its grid
  const old = dfDollar(el).children('.chord-chart-grid');
  if (el._chordChart === markup && old.length) return;
  el._chordChart = markup;
  const grid = dfDollar(markup).get(0) as HTMLElement;
  if (old.length) old.replaceWith(grid);
  else {
    const caption = dfDollar(el).children('figcaption');
    if (caption.length) caption.after(grid);
    else dfDollar(el).append(grid);
  }
}

/** the markup of a state: active is data-active; the config's name, shape, barre and capo are the caption and the
 *  data attributes */
function applyMarkup(el: Element, stateName: string, config: ChordChartConfig): void {
  const active = stateName === 'active' ? '' : null;
  if (el.getAttribute('data-active') !== active) dfDollar(el).attr('data-active', active);
  if (typeof config.name === 'string') {
    const caption = dfDollar(el).children('figcaption');
    if (!caption.length) dfDollar(el).prepend(dfDollar(`<figcaption>${esc(config.name)}</figcaption>`));
    else if (caption.text() !== config.name) caption.text(config.name);
  }
  if (typeof config.shape === 'string') {
    const parsed = parseShape(config.shape);
    const text = parsed ? shapeText(parsed) : null;
    // the authored text stays while it means the same shape ("x 5 7 7 7 5" is x57775)
    const now = parseShape(el.getAttribute('data-shape'));
    if ((now ? shapeText(now) : null) !== text) dfDollar(el).attr('data-shape', text);
  }
  if (config.barre !== undefined) {
    const v = config.barre === null || !(Number(config.barre) > 0) ? null : String(Math.round(Number(config.barre)));
    if (el.getAttribute('data-barre') !== v) dfDollar(el).attr('data-barre', v);
  }
  if (config.capo !== undefined) {
    const c = clamp(Math.round(Number(config.capo) || 0), 0, 12);
    const v = c ? String(c) : null;
    if (el.getAttribute('data-capo') !== v) dfDollar(el).attr('data-capo', v);
  }
}

/** what the chart shows, read from its markup */
const configOf = (el: Element): Required<ChordChartConfig> => ({
  name: captionOf(el),
  shape: el.getAttribute('data-shape') ?? '',
  barre: numAttr(el, 'data-barre'),
  capo: numAttr(el, 'data-capo') ?? 0,
});

/** UI side of setState: the state's markup, the grid drawn again. */
function triggerStateChange(el: HTMLElement, stateName: string, incoming: ChordChartConfig): undefined {
  applyMarkup(el, stateName, incoming);
  if (el._chordChart !== undefined) draw(el);
  return undefined;
}

/** Registry-level API; pass the .chord-chart element explicitly. Unknown names throw. */
export const chordChartApi = componentState({
  component: 'chord-chart',
  states: chordChartStates,
  // the config is the chord: a state change keeps it unless it names another
  mergeConfig: true,
  apply: (el, state, _previous, incoming) => triggerStateChange(el, state.name, incoming as ChordChartConfig),
  // data-active is the active state - the Fretboard writes it on the chart of the chord sounding
  read: (el, state) => {
    const name = el.hasAttribute('data-active') ? 'active' : 'default';
    const now = configOf(el);
    const c = state.config as ChordChartConfig;
    if (
      name === state.name &&
      c.name === now.name &&
      c.shape === now.shape &&
      c.barre === now.barre &&
      c.capo === now.capo
    )
      return state;
    return { name, config: now as Record<string, unknown> };
  },
  markup: (el, state) => applyMarkup(el, state.name, state.config as ChordChartConfig),
});

df$.chordChartApi = chordChartApi;
df$.chordChartStates = chordChartStates;

function init() {
  dfDollar('.chord-chart:not([data-init])')
    .toArray()
    .forEach((el: HTMLElement) => {
      el.dataset.init = '';
      draw(el);
      // el.store + el.api (AGENTS.md "State through stores"): $('#c').api.setState('active')
      bindComponent(el, chordChartApi, {
        name: el.hasAttribute('data-active') ? 'active' : 'default',
        config: configOf(el),
      });
      // another shape, barre, capo or name written into the markup: drawn again
      new MutationObserver(() => draw(el)).observe(el, {
        attributes: true,
        attributeFilter: ['data-shape', 'data-barre', 'data-capo', 'data-strings'],
        childList: true,
        characterData: true,
        subtree: true,
      });
    });
}

/** the chart of a target: the .chord-chart element or a selector of it */
const resolve = (target: string | HTMLElement): HTMLElement | undefined => {
  const el = typeof target === 'string' ? dfDollar(target).get(0) : target;
  const chart = el?.closest?.<HTMLElement>('.chord-chart');
  return chart?.api ? chart : undefined;
};

df$.chordChart = {
  /**
   * The chord a chart shows, or show another (setState in its current state - the rest of the chord stays).
   * @param target - the .chord-chart element or a selector of it
   * @param chord - the name, shape, barre and capo to show; leave it out to read
   * @returns the chord now; null for an unknown element
   */
  chord: (target: string | HTMLElement, chord?: ChordChartConfig): Required<ChordChartConfig> | null => {
    const el = resolve(target);
    if (!el) return null;
    if (chord)
      el.api?.setState(el.hasAttribute('data-active') ? 'active' : 'default', chord as Record<string, unknown>);
    return configOf(el);
  },
  /**
   * Read a shape's text.
   * @param shape - "0003", "x32010" or "x 10 12 12 12 10"
   * @returns each string's fret (x muted), from the string the tuning names first to the 1st; null for a shape that is none
   */
  parse: (shape: string): ChordChartShape | null => parseShape(shape),
};

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
