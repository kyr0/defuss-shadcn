// -- Fretboard Neck ----------------------------------------------
// The neck of a fretted instrument from its markup: the strings of its tuning, the nut on the fretting hand's side (or
// a capo's bold bar with the frets behind it), the inlays and fret numbers - and the fingers on it: a chord's shape
// (faint; its barre a dashed line; × on a muted string), the notes sounding (filled, with their fret) and the notes
// coming next (outlined); nothing on an open string. Across, the 1st string on top as a tab draws it, or upright as a
// chord chart draws it; the right hand mirrors either. Bound to a Fretboard (data-fretboard-for) it follows the
// playhead: the Fretboard sets its tuning, capo and frets and, as it plays, its shape and notes.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

const fretboardNeckStates = ['default'];

/** The config the state takes. */
export interface FretboardNeckConfig {
  /** a chord's shape, drawn faint: a fret per string from the string the tuning names first to the 1st ("0003", "x32010", "x 10 12 12 12 10"); "" for none */
  shape?: string;
  /** the fret the shape's barre lies on, null for none */
  barre?: number | null;
  /** the notes sounding, drawn filled with their fret: "string/fret" pairs ("3/2 2/3"; string 1 is the highest), or a list of { string, fret } */
  notes?: string | FretboardNeckNote[];
  /** the notes coming next, drawn outlined - as notes */
  next?: string | FretboardNeckNote[];
  /** the capo's fret, 0 for none; the frets of the shape and the notes count from it */
  capo?: number;
}

/** A note on the neck. */
export interface FretboardNeckNote {
  /** the string, 1 = the highest */
  string: number;
  /** the fret, 0 = open (nothing is drawn on an open string) */
  fret: number;
}

// VERIFIED: (verify's API docs gate) the states below are exactly the declared ones, each
// described, and every config field typed, described and named in the code.
/** setState() configs per state. */
export interface FretboardNeckStateConfigs {
  /** The neck with the fingers the config puts on it. */
  default: FretboardNeckConfig;
}

type Fret = number | 'x';
type Barre = { fret: number; from: number; to: number };
type Note = { string: number; fret: number | 'x' };

const INLAYS = [3, 5, 7, 10, 12, 15];
const ROLES = ['muted', 'chord', 'next', 'active'];

let described = 0;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const esc = (s: unknown): string =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
const numAttr = (el: Element, name: string): number | null => {
  const v = el.getAttribute(name);
  return v === null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);
};

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

/** notes from their text ("3/2 2/3") or a list - each on a string and a fret that exist */
function parseNotes(v: unknown): FretboardNeckNote[] {
  const list: unknown[] = Array.isArray(v)
    ? v
    : String(v ?? '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
  const out: FretboardNeckNote[] = [];
  for (const x of list) {
    const [s, f] =
      typeof x === 'string'
        ? x.split('/').map(Number)
        : [Number((x as FretboardNeckNote)?.string), Number((x as FretboardNeckNote)?.fret)];
    if (Number.isInteger(s) && s >= 1 && s <= 12 && Number.isInteger(f) && f >= 0 && f <= 24)
      out.push({ string: s, fret: f });
  }
  return out;
}
const notesText = (notes: FretboardNeckNote[]): string => notes.map((n) => `${n.string}/${n.fret}`).join(' ');

/** the tuning's names, from the string it names first (the highest-numbered) to the 1st */
const tuningOf = (el: Element): string[] => (el.getAttribute('data-tuning') ?? '').trim().split(/\s+/).filter(Boolean);
const capoOf = (el: Element): number => clamp(Math.round(numAttr(el, 'data-capo') ?? 0), 0, 12);

/** the neck: its board (strings, nut or capo, wires, inlays, fret numbers) and the fingers on it */
function neckMarkup(el: Element): { board: string; text: string } {
  const shape = parseShape(el.getAttribute('data-shape'));
  const tuning = tuningOf(el);
  const n = tuning.length || shape?.length || Math.max(1, numAttr(el, 'data-strings') ?? 4);
  const capo = capoOf(el);
  const notes = parseNotes(el.getAttribute('data-notes'));
  const next = parseNotes(el.getAttribute('data-next'));
  const highest = Math.max(
    3,
    ...(shape ?? []).map((f) => (typeof f === 'number' ? f : 0)),
    ...notes.map((x) => x.fret),
    ...next.map((x) => x.fret),
  );
  const frets = clamp(Math.round(numAttr(el, 'data-frets') ?? capo + highest + 2), 3, 24);
  const strings = Array.from({ length: n }, (_, k) => {
    const s = n - k;
    const name = tuning[k] ?? '';
    return `${name ? `<span class="fretboard-neck-string-name" data-string="${s}" style="--fretboard-neck-s: ${s}">${esc(name)}</span>` : ''}<span class="fretboard-neck-string" data-string="${s}" style="--fretboard-neck-s: ${s}"></span>`;
  }).join('');
  const inlays = INLAYS.filter((f) => f <= frets)
    .map(
      (f) =>
        `<span class="fretboard-neck-inlay" style="--fretboard-neck-f: ${f}"${f === 12 ? ' data-double' : ''}></span>`,
    )
    .join('');
  const numbers = INLAYS.filter((f) => f <= frets)
    .map((f) => `<span class="fretboard-neck-fret-number" style="--fretboard-neck-f: ${f}">${f}</span>`)
    .join('');
  const capoBar = capo ? `<span class="fretboard-neck-capo" style="--fretboard-neck-f: ${capo}"></span>` : '';
  // the fingers: each position takes its strongest role
  const roles = new Map<string, string>();
  const put = (x: Note, role: string) => {
    if (x.fret === 0 || x.string < 1 || x.string > n) return;
    const k = `${x.string}/${x.fret}`;
    if (ROLES.indexOf(role) > ROLES.indexOf(roles.get(k) ?? '')) roles.set(k, role);
  };
  const barre = shape ? barreOf(shape, numAttr(el, 'data-barre') ?? 0) : null;
  (shape ?? []).forEach((fret, k) => {
    if (barre && fret === barre.fret && k >= barre.from && k <= barre.to) return;
    put({ string: n - k, fret }, fret === 'x' ? 'muted' : 'chord');
  });
  next.forEach((x) => put(x, 'next'));
  notes.forEach((x) => put(x, 'active'));
  const bar = barre
    ? `<span class="fretboard-neck-barre" style="--fretboard-neck-f: ${capo + barre.fret}; --fretboard-neck-s1: ${n - barre.to}; --fretboard-neck-s2: ${n - barre.from}"></span>`
    : '';
  const dots = [...roles]
    .map(([k, role]) => {
      const [string, fret] = k.split('/');
      // a muted string: × at the nut, or just behind the capo
      const muted = fret === 'x';
      return `<span class="fretboard-neck-dot" data-role="${role}" data-string="${string}"${muted && !capo ? ' data-nut' : ''} style="--fretboard-neck-s: ${string}; --fretboard-neck-f: ${muted ? capo : capo + Number(fret)}">${role === 'active' || role === 'muted' ? (muted ? '×' : fret) : ''}</span>`;
    })
    .join('');
  const say = (list: FretboardNeckNote[]) =>
    list.map((x) => `string ${x.string} ${x.fret ? `fret ${x.fret}` : 'open'}`).join(', ');
  const text = [
    tuning.length ? `${tuning.join(' ')} neck` : `${n} strings`,
    capo ? `capo ${capo}` : '',
    shape ? `shape ${shape.join(' ')}${barre ? `, barre at fret ${barre.fret}` : ''}` : '',
    notes.length ? `sounding ${say(notes)}` : '',
    next.length ? `next ${say(next)}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  const board = `<div class="fretboard-neck-board" aria-hidden="true" style="--fretboard-neck-strings: ${n}; --fretboard-neck-frets: ${frets}"><div class="fretboard-neck-wires"></div>${strings}${inlays}${numbers}${capoBar}${bar}${dots}</div>`;
  return { board, text };
}

/** Draw the neck again from its markup. */
function draw(el: HTMLElement): void {
  const m = neckMarkup(el);
  const rt = el._fretboardNeck as { board: string; desc: HTMLElement };
  if (rt.board !== m.board) {
    rt.board = m.board;
    const board = dfDollar(m.board).get(0) as HTMLElement;
    const old = dfDollar(el).children('.fretboard-neck-board');
    if (old.length) old.replaceWith(board);
    else dfDollar(el).prepend(board);
  }
  if (dfDollar(rt.desc).text() !== m.text) dfDollar(rt.desc).text(m.text);
}

/** the markup of the state: the shape, barre, notes, next notes and capo as data attributes */
function applyMarkup(el: Element, _stateName: string, config: FretboardNeckConfig): void {
  const write = (name: string, v: string | null) => {
    if (el.getAttribute(name) !== v) dfDollar(el).attr(name, v);
  };
  // the authored text stays while it means the same shape or notes ("x 5 7 7 7 5" is x57775)
  const same = (name: string, text: string | null, norm: (v: string | null) => string | null) =>
    norm(el.getAttribute(name)) === text;
  const shapeNorm = (v: string | null) => {
    const s = parseShape(v);
    return s ? shapeText(s) : null;
  };
  const notesNorm = (v: string | null) => notesText(parseNotes(v)) || null;
  if (config.shape !== undefined) {
    const text = shapeNorm(typeof config.shape === 'string' ? config.shape : null);
    if (!same('data-shape', text, shapeNorm)) write('data-shape', text);
  }
  if (config.barre !== undefined)
    write(
      'data-barre',
      config.barre === null || !(Number(config.barre) > 0) ? null : String(Math.round(Number(config.barre))),
    );
  if (config.notes !== undefined) {
    const text = notesText(parseNotes(config.notes)) || null;
    if (!same('data-notes', text, notesNorm)) write('data-notes', text);
  }
  if (config.next !== undefined) {
    const text = notesText(parseNotes(config.next)) || null;
    if (!same('data-next', text, notesNorm)) write('data-next', text);
  }
  if (config.capo !== undefined) {
    const c = clamp(Math.round(Number(config.capo) || 0), 0, 12);
    write('data-capo', c ? String(c) : null);
  }
}

/** what the neck shows, read from its markup */
const configOf = (el: Element) => ({
  shape: el.getAttribute('data-shape') ?? '',
  barre: numAttr(el, 'data-barre'),
  notes: el.getAttribute('data-notes') ?? '',
  next: el.getAttribute('data-next') ?? '',
  capo: capoOf(el),
});

/** UI side of setState: the state's markup, the neck drawn again. */
function triggerStateChange(el: HTMLElement, stateName: string, incoming: FretboardNeckConfig): undefined {
  applyMarkup(el, stateName, incoming);
  if (el._fretboardNeck) draw(el);
  return undefined;
}

/** Registry-level API; pass the .fretboard-neck element explicitly. Unknown names throw. */
export const fretboardNeckApi = componentState({
  component: 'fretboard-neck',
  states: fretboardNeckStates,
  // the config is the fingers on the neck: a setState names what changes, the rest stays
  mergeConfig: true,
  apply: (el, state, _previous, incoming) => triggerStateChange(el, state.name, incoming as FretboardNeckConfig),
  // a bound Fretboard and the markup change it without setState
  read: (el, state) => {
    const now = configOf(el);
    const c = state.config as FretboardNeckConfig;
    if (
      c.shape === now.shape &&
      c.barre === now.barre &&
      c.notes === now.notes &&
      c.next === now.next &&
      c.capo === now.capo
    )
      return state;
    return { name: 'default', config: now as Record<string, unknown> };
  },
  markup: (el, state) => applyMarkup(el, state.name, state.config as FretboardNeckConfig),
});

df$.fretboardNeckApi = fretboardNeckApi;
df$.fretboardNeckStates = fretboardNeckStates;

function init() {
  dfDollar('.fretboard-neck:not([data-init])')
    .toArray()
    .forEach((el: HTMLElement) => {
      el.dataset.init = '';
      const desc = dfDollar(
        `<span class="fretboard-neck-desc" id="fretboard-neck-desc-${++described}" hidden></span>`,
      ).get(0) as HTMLElement;
      dfDollar(el).append(desc);
      if (!el.hasAttribute('role')) dfDollar(el).attr('role', 'img');
      const by = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
      dfDollar(el).attr('aria-describedby', [...by, desc.id].join(' '));
      el._fretboardNeck = { board: '', desc };
      draw(el);
      // el.store + el.api (AGENTS.md "State through stores"): $('#neck').api.setState('default', { notes: '3/2' })
      bindComponent(el, fretboardNeckApi, { name: 'default', config: configOf(el) });
      // the markup changes the neck: drawn again
      new MutationObserver(() => draw(el)).observe(el, {
        attributes: true,
        attributeFilter: [
          'data-tuning',
          'data-strings',
          'data-frets',
          'data-shape',
          'data-barre',
          'data-notes',
          'data-next',
          'data-capo',
        ],
      });
    });
}

/** the neck of a target: the .fretboard-neck element or a selector of it */
const resolve = (target: string | HTMLElement): HTMLElement | undefined => {
  const el = typeof target === 'string' ? dfDollar(target).get(0) : target;
  const neck = el?.closest?.<HTMLElement>('.fretboard-neck');
  return neck?._fretboardNeck ? neck : undefined;
};

df$.fretboardNeck = {
  /**
   * Put fingers on the neck - the notes sounding, and optionally a shape and the notes next (setState; what it does
   * not name stays).
   * @param target - the .fretboard-neck element or a selector of it
   * @param notes - the notes sounding: "3/2 2/3" or a list of { string, fret }; [] or "" for none
   * @param config - the shape, barre, next notes or capo to show with them
   * @returns the notes now, as { string, fret }; [] for an unknown element
   */
  play: (
    target: string | HTMLElement,
    notes: string | FretboardNeckNote[],
    config: FretboardNeckConfig = {},
  ): FretboardNeckNote[] => {
    const el = resolve(target);
    if (!el) return [];
    el.api?.setState('default', { ...config, notes });
    return parseNotes(el.getAttribute('data-notes'));
  },
};

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
