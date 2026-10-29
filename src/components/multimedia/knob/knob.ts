// -- Knob ------------------------------------------------------
// A rotary control over a native <input type="range"> - the knobs of an audio plugin: the value on any scale (linear,
// exponential, logarithmic, power, decibel, or one the page registers), drawn as an arc from its origin and a pointer,
// rings around it for the automation and modulation sources that move it (their range and their live value), and a
// drag whose precision follows the distance from the knob: within its radius a horizontal move turns it fast, farther
// away slower and finer. The input stays the form control, the keyboard target and the accessible slider; the runtime
// draws the dial over it.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent, textLocale } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

const knobStates = ['default', 'adjusting', 'disabled'];

/** The config every state takes. */
export interface KnobConfig {
  /** the value in the knob's units, between the input's min and max and on its step; getState() reports the live one */
  value?: number;
}

// VERIFIED: (verify's API docs gate) the states below are exactly the declared ones, each
// described, and every config field typed, described and named in the code.
/** setState() configs per state. */
export interface KnobStateConfigs {
  /** At rest: the pointer and the arc from the origin show the value, the readout writes it. */
  default: KnobConfig;
  /** Being turned: the precision radius and the pointer's reach show around the dial - a drag enters it and returns to default when it ends. */
  adjusting: KnobConfig;
  /** Disabled: the input is disabled - no drag, no keys, and a form leaves it out. */
  disabled: KnobConfig;
}

/** A ring around the knob: an automation or modulation source that moves its value. */
export interface KnobRing {
  /** unique on the knob - modulate() names the source by it */
  id: string;
  /** the source's name ("LFO 1") - the ring's title and its description for assistive technology */
  label?: string;
  /** how far the source moves the knob, as a share of its turn: -1 to 1 (0.25 = a quarter of the turn up) */
  amount: number;
  /** a theme colour (chart-1 ... chart-5, primary, destructive) or a CSS colour; default the chart colour of its number */
  color?: string;
  /** the source swings both ways around the value (an LFO), not away from it (an envelope) */
  bipolar?: boolean;
}

/** What a scale maps between. */
export interface KnobRange {
  /** the value at the start of the turn - the input's min */
  min: number;
  /** the value at the end of the turn - the input's max */
  max: number;
  /** the curve of the power and decibel scales (data-exponent) */
  exponent: number;
}

/** A scale: how a position on the knob's turn (0 to 1) maps to a value, and back. */
export interface KnobScale {
  /** the value at a position of the turn */
  value: (position: number, range: KnobRange) => number;
  /** the position of a value - the inverse of value() */
  position: (value: number, range: KnobRange) => number;
}

/** What a format gets besides the value. */
export interface KnobFormatContext {
  /** the unit (data-unit), "" without one */
  unit: string;
  /** the fraction digits asked for (data-decimals), null for the format's own */
  decimals: number | null;
  /** the locale numbers are written in */
  locale: string;
  /** the value at the start of the turn */
  min: number;
  /** the value at the end of the turn */
  max: number;
  /** the input's step, null for any */
  step: number | null;
}

/** What knob-change carries. */
export interface KnobChangeDetail {
  /** the value */
  value: number;
  /** its position on the turn, 0 to 1 */
  position: number;
  /** the value as the readout writes it ("1.20 kHz") */
  text: string;
  /** true when the change is done (a drag ended, a key, a reset, setState), false while a drag goes on */
  committed: boolean;
}

/** a drag: the pointer, where it was, the position it moves (unrounded), the value it started from */
type Drag = { id: number; x: number; p: number; start: number; cx: number; cy: number; radius: number };
/** per-element runtime (state lives on the element) */
type Runtime = {
  input: HTMLInputElement;
  dial: HTMLElement;
  value: number;
  p: number;
  /** the value of the last change event - change fires when a committed value differs from it */
  committed: number;
  rings: KnobRing[];
  live: Map<string, number>;
  drag: Drag | null;
  /** set while the runtime dispatches the input's events - its own input event is not a change from outside */
  writing: boolean;
  /** the Number Input over the readout while the value is typed in */
  editor: HTMLElement | null;
};

/** the slowest a far drag gets, as a share of the full speed */
const MIN_SPEED = 0.02;
/** the keys' steps on the turn: an arrow, with Shift, a page */
const KEY_STEP = 0.01;
const FINE_STEP = 0.001;
const PAGE_STEP = 0.1;
/** the most marks a dial draws - a finer step draws none */
const MAX_TICKS = 49;
/** the theme colours a ring names */
const THEME_COLORS = /^(chart-[1-5]|primary|destructive|foreground|muted-foreground)$/;

let rings = 0;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const num = (v: unknown, fallback: number): number => {
  const n = typeof v === 'number' ? v : v === null || v === undefined || v === '' ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
/** no float noise in a value: 12 significant digits */
const tidy = (v: number): number => Number(v.toPrecision(12));
const round4 = (v: number): string => String(Math.round(v * 10000) / 10000);
const sameSign = (r: KnobRange): boolean => r.min !== 0 && r.max !== 0 && Math.sign(r.min) === Math.sign(r.max);

const linear: KnobScale = {
  value: (p, r) => r.min + p * (r.max - r.min),
  position: (v, r) => (r.max === r.min ? 0 : (v - r.min) / (r.max - r.min)),
};

/** the scales by name - a page adds its own with df$.shadcn.knob.scale() */
const SCALES: Record<string, KnobScale> = {
  linear,
  // equal ratios per share of the turn - frequency, time: from 20 Hz to 20 kHz every decade turns as far
  exponential: {
    value: (p, r) => (sameSign(r) ? r.min * Math.pow(r.max / r.min, p) : linear.value(p, r)),
    position: (v, r) => (sameSign(r) ? Math.log(v / r.min) / Math.log(r.max / r.min) : linear.position(v, r)),
  },
  // the mirror of exponential: fast at the start of the turn, fine at its end
  logarithmic: {
    value: (p, r) => (sameSign(r) ? r.min + r.max - r.min * Math.pow(r.max / r.min, 1 - p) : linear.value(p, r)),
    position: (v, r) =>
      sameSign(r) ? 1 - Math.log((r.min + r.max - v) / r.min) / Math.log(r.max / r.min) : linear.position(v, r),
  },
  // a curve: exponent 2 (default) is fine at the start, 0.5 fine at the end
  power: {
    value: (p, r) => r.min + (r.max - r.min) * Math.pow(p, r.exponent),
    position: (v, r) => Math.pow(clamp(linear.position(v, r), 0, 1), 1 / r.exponent),
  },
  // a gain in dB on an audio taper - the amplitude grows with the turn to the power of the exponent (3, default): the
  // turn's start is the min (-60 dB), its end the max
  decibel: {
    value: (p, r) => {
      const floor = Math.pow(10, (r.min - r.max) / (20 * r.exponent));
      return r.max + 20 * r.exponent * Math.log10(floor + (1 - floor) * p);
    },
    position: (v, r) => {
      const floor = Math.pow(10, (r.min - r.max) / (20 * r.exponent));
      return (Math.pow(10, (v - r.max) / (20 * r.exponent)) - floor) / (1 - floor);
    },
  },
};

const fixed = (locale: string, digits: number) =>
  new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
const three = (locale: string) =>
  new Intl.NumberFormat(locale, { minimumSignificantDigits: 3, maximumSignificantDigits: 3 });
/** the fraction digits a value needs when the knob does not say: its step's, else fewer the wider its range */
const autoDecimals = (c: KnobFormatContext): number => {
  if (c.step !== null) return Math.min(6, (String(c.step).split('.')[1] ?? '').length);
  const span = Math.abs(c.max - c.min);
  return span >= 100 ? 0 : span >= 10 ? 1 : 2;
};
const withUnit = (text: string, unit: string): string => (unit ? `${text} ${unit}` : text);
const SI: [number, string][] = [
  [1e9, 'G'],
  [1e6, 'M'],
  [1e3, 'k'],
  [1, ''],
  [1e-3, 'm'],
];

/** the formats by name - a page adds its own with df$.shadcn.knob.format() */
const FORMATS: Record<string, (value: number, context: KnobFormatContext) => string> = {
  number: (v, c) => withUnit(fixed(c.locale, c.decimals ?? autoDecimals(c)).format(v), c.unit),
  // with a metric prefix and three significant digits: 440 Hz, 1.20 kHz, 500 mHz
  si: (v, c) => {
    const a = Math.abs(v);
    const [f, prefix] = a === 0 ? [1, ''] : (SI.find(([x]) => a >= x) ?? SI[SI.length - 1]);
    const n = c.decimals === null ? three(c.locale) : fixed(c.locale, c.decimals);
    return withUnit(n.format(v / f), `${prefix}${c.unit}`);
  },
  // a fraction as a percentage: 0.5 is 50 %
  percent: (v, c) =>
    new Intl.NumberFormat(c.locale, {
      style: 'percent',
      minimumFractionDigits: c.decimals ?? 0,
      maximumFractionDigits: c.decimals ?? 0,
    }).format(v),
  // seconds: below one in milliseconds - 250 ms, 1.20 s
  time: (v, c) => {
    const n = c.decimals === null ? three(c.locale) : fixed(c.locale, c.decimals);
    return Math.abs(v) < 1 ? `${n.format(v * 1000)} ms` : `${n.format(v)} s`;
  },
  // always with its sign: +12 st, -3.0 dB
  signed: (v, c) => {
    const d = c.decimals ?? autoDecimals(c);
    const text = new Intl.NumberFormat(c.locale, {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
      signDisplay: 'exceptZero',
    }).format(v);
    return withUnit(text, c.unit);
  },
};

const runtimeOf = (el: HTMLElement): Runtime => el._knob;
const inputOf = (el: Element): HTMLInputElement | undefined =>
  dfDollar(el).find<HTMLInputElement>('input.knob-input').get(0);

/** the knob's range: the input's min and max, the scale's exponent */
function rangeOf(el: HTMLElement, input: HTMLInputElement): KnobRange {
  const scale = el.getAttribute('data-scale') ?? 'linear';
  const exponent = num(el.getAttribute('data-exponent'), scale === 'decibel' ? 3 : 2);
  return {
    min: num(input.getAttribute('min'), 0),
    max: num(input.getAttribute('max'), 100),
    exponent: exponent > 0 ? exponent : 1,
  };
}
const scaleOf = (el: HTMLElement): KnobScale => SCALES[el.getAttribute('data-scale') ?? 'linear'] ?? linear;

/** the value at a position of the turn, on the knob's scale - a scale that fails is linear */
function valueAt(el: HTMLElement, p: number): number {
  const r = rangeOf(el, runtimeOf(el).input);
  let v = NaN;
  try {
    v = scaleOf(el).value(clamp(p, 0, 1), r);
  } catch {
    v = NaN;
  }
  return Number.isFinite(v) ? v : linear.value(clamp(p, 0, 1), r);
}

/** the position of a value on the turn, 0 to 1 */
function positionAt(el: HTMLElement, v: number): number {
  const r = rangeOf(el, runtimeOf(el).input);
  let p = NaN;
  try {
    p = scaleOf(el).position(v, r);
  } catch {
    p = NaN;
  }
  return clamp(Number.isFinite(p) ? p : linear.position(v, r), 0, 1);
}

/** a value the knob can take: inside its range, on the input's step (step="any": any) */
function settle(el: HTMLElement, v: number): number {
  const input = runtimeOf(el).input;
  const r = rangeOf(el, input);
  const lo = Math.min(r.min, r.max);
  const hi = Math.max(r.min, r.max);
  let out = clamp(Number.isFinite(v) ? v : lo, lo, hi);
  const step = Number(input.getAttribute('step'));
  if (step > 0) out = clamp(r.min + Math.round((out - r.min) / step) * step, lo, hi);
  return tidy(out);
}

/** the value as the readout writes it - the knob's format, its unit and decimals, in its locale */
function textOf(el: HTMLElement, v: number): string {
  const input = runtimeOf(el).input;
  const r = rangeOf(el, input);
  const d = Number.parseInt(el.getAttribute('data-decimals') ?? '', 10);
  const context: KnobFormatContext = {
    unit: el.getAttribute('data-unit') ?? '',
    decimals: Number.isFinite(d) && d >= 0 ? Math.min(d, 20) : null,
    locale: textLocale(el),
    min: r.min,
    max: r.max,
    step: Number(input.getAttribute('step')) > 0 ? Number(input.getAttribute('step')) : null,
  };
  const format = FORMATS[el.getAttribute('data-format') ?? 'number'] ?? FORMATS.number;
  try {
    return String(format(v, context));
  } catch {
    return FORMATS.number(v, context);
  }
}

/** the rings as the data writes them: an id, an amount from -1 to 1, a label, a colour, bipolar */
function ringsOf(raw: unknown): KnobRing[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw
    .filter((r) => r && typeof r === 'object' && r.id != null && !seen.has(String(r.id)) && seen.add(String(r.id)))
    .map((r) => ({
      id: String(r.id),
      label: r.label == null ? String(r.id) : String(r.label),
      amount: clamp(num(r.amount, 0), -1, 1),
      ...(r.color == null ? {} : { color: String(r.color) }),
      bipolar: r.bipolar === true,
    }));
}

/** a ring's colour: a theme colour by name, a CSS colour the browser takes, else the chart colour of its number */
function colorOf(ring: KnobRing, i: number): string {
  const c = ring.color ?? '';
  if (THEME_COLORS.test(c)) return `var(--${c})`;
  if (c && typeof CSS !== 'undefined' && CSS.supports('color', c)) return c;
  return `var(--chart-${(i % 5) + 1})`;
}

/** what the rings say for assistive technology: "modulated by LFO 1 (± 25 %), Envelope (+ 40 %)" */
function ringsText(list: KnobRing[]): string {
  if (!list.length) return '';
  const share = (r: KnobRing) =>
    `${r.bipolar ? '±' : r.amount < 0 ? '-' : '+'} ${Math.round(Math.abs(r.amount) * 100)} %`;
  return `Modulated by ${list.map((r) => `${r.label} (${share(r)})`).join(', ')}`;
}

/** the marks around the value ring (data-ticks): a mark per step of a stepped knob, or that many over the turn
 *  (data-ticks="5": the quarters) - none for more than MAX_TICKS */
function ticksOf(el: HTMLElement): number[] {
  const attr = el.getAttribute('data-ticks');
  if (attr === null) return [];
  const count = Number.parseInt(attr, 10);
  if (count >= 2)
    return Array.from({ length: Math.min(count, MAX_TICKS) }, (_, i) => i / (Math.min(count, MAX_TICKS) - 1));
  const input = runtimeOf(el).input;
  const step = Number(input.getAttribute('step'));
  const r = rangeOf(el, input);
  const steps = step > 0 ? Math.floor(Math.abs(r.max - r.min) / step + 1e-9) + 1 : Infinity;
  if (steps > MAX_TICKS) return [];
  const dir = Math.sign(r.max - r.min) || 1;
  return Array.from({ length: steps }, (_, i) => positionAt(el, r.min + i * step * dir));
}

/** Draw the dial: the rings of the sources (the first next to the value ring), the marks of the steps, the value
 *  ring, the face and its pointer. */
function renderDial(el: HTMLElement): void {
  const rt = runtimeOf(el);
  const n = rt.rings.length;
  const markup = rt.rings
    .map(
      (r, i) =>
        `<span class="knob-ring" data-ring="${esc(r.id)}"${r.bipolar ? ' data-bipolar' : ''} title="${esc(r.label ?? r.id)}" style="--knob-ring: ${i + 1}; --knob-ring-color: ${esc(colorOf(r, i))}"></span>`,
    )
    .join('');
  const ticks = ticksOf(el)
    .map((t) => `<span class="knob-tick" style="--knob-t: ${round4(t)}"></span>`)
    .join('');
  const id = rt.dial.getAttribute('data-describes') ?? '';
  dfDollar(rt.dial).html(
    `${markup}${ticks}<span class="knob-track"></span><span class="knob-face"><span class="knob-pointer"></span></span><span class="knob-rings-text" id="${esc(id)}">${esc(ringsText(rt.rings))}</span>`,
  );
  rt.dial.style.setProperty('--knob-rings', String(n));
  if (el.hasAttribute('data-radius'))
    rt.dial.style.setProperty('--knob-radius', `${Math.max(8, num(el.getAttribute('data-radius'), 8))}px`);
}

/** the same value drawn again - after another scale, range, step, marks or format */
function redraw(el: HTMLElement): void {
  renderDial(el);
  show(el, runtimeOf(el).value, true, false);
}

/** Paint the value: the pointer, the arc from the origin, each ring's range and live value, the effective value, the
 *  readout and the input's text. */
function paint(el: HTMLElement): void {
  const rt = runtimeOf(el);
  const dial = rt.dial;
  const origin = el.hasAttribute('data-origin') ? positionAt(el, num(el.getAttribute('data-origin'), 0)) : 0;
  dial.style.setProperty('--knob-p', round4(rt.p));
  dial.style.setProperty('--knob-o', round4(origin));
  let effective = rt.p;
  let modulated = false;
  dfDollar(dial)
    .children<HTMLElement>('.knob-ring')
    .each((i, ring) => {
      const r = rt.rings[i];
      if (!r) return;
      const reach = Math.abs(r.amount);
      const from = r.bipolar ? rt.p - reach : Math.min(rt.p, rt.p + r.amount);
      const to = r.bipolar ? rt.p + reach : Math.max(rt.p, rt.p + r.amount);
      ring.style.setProperty('--knob-from', round4(clamp(from, 0, 1)));
      ring.style.setProperty('--knob-to', round4(clamp(to, 0, 1)));
      const out = rt.live.get(r.id);
      if (out === undefined) {
        if (ring.hasAttribute('data-live')) dfDollar(ring).attr('data-live', null);
        return;
      }
      const at = clamp(rt.p + r.amount * out, 0, 1);
      effective += r.amount * out;
      modulated = true;
      ring.style.setProperty('--knob-at-lo', round4(Math.min(rt.p, at)));
      ring.style.setProperty('--knob-at-hi', round4(Math.max(rt.p, at)));
      if (!ring.hasAttribute('data-live')) dfDollar(ring).attr('data-live', '');
    });
  dial.style.setProperty('--knob-e', round4(clamp(effective, 0, 1)));
  if (dial.hasAttribute('data-modulated') !== modulated) dfDollar(dial).attr('data-modulated', modulated ? '' : null);
  const text = textOf(el, rt.value);
  if (rt.input.getAttribute('aria-valuetext') !== text) dfDollar(rt.input).attr('aria-valuetext', text);
  dfDollar(el)
    .find<HTMLElement>('.knob-value')
    .each((_i, out) => {
      if (dfDollar(out).text() !== text) dfDollar(out).text(text);
    });
}

/** Show a value: settled on the knob's range and step, written into the input, painted - and told: the input's input
 *  event and knob-change while it changes, its change event when a change is committed. */
function show(el: HTMLElement, v: number, committed: boolean, emit = true): void {
  const rt = runtimeOf(el);
  const value = settle(el, v);
  const changed = value !== rt.value;
  rt.value = value;
  rt.p = positionAt(el, value);
  if (rt.input.value !== String(value)) rt.input.value = String(value);
  paint(el);
  if (!emit) {
    if (committed) rt.committed = value;
    return;
  }
  const done = committed && value !== rt.committed;
  if (!changed && !done) return;
  rt.writing = true;
  try {
    if (changed) rt.input.dispatchEvent(new Event('input', { bubbles: true }));
    if (done) {
      rt.committed = value;
      rt.input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  } finally {
    rt.writing = false;
  }
  // Fires when the value changes - while a drag goes on (committed: false) and when a change is done.
  el.dispatchEvent(
    new CustomEvent<KnobChangeDetail>('knob-change', {
      bubbles: true,
      detail: { value, position: Math.round(rt.p * 10000) / 10000, text: textOf(el, value), committed },
    }),
  );
}

/** the value a reset goes back to: data-default, else the input's authored value */
const defaultOf = (el: HTMLElement): number =>
  num(el.getAttribute('data-default'), num(runtimeOf(el).input.defaultValue, rangeOf(el, runtimeOf(el).input).min));

/** the markup of a state: disabled disables the input; the other states write none */
function applyMarkup(el: Element, stateName: string): void {
  const input = inputOf(el);
  if (!input) return;
  if (stateName === 'disabled') {
    if (!input.hasAttribute('disabled')) dfDollar(input).attr('disabled', '');
  } else if (input.hasAttribute('disabled')) dfDollar(input).attr('disabled', null);
}

/** UI side of setState: the state's markup, then the value when the config names one. */
function triggerStateChange(el: HTMLElement, stateName: string, incoming: Record<string, unknown>) {
  applyMarkup(el, stateName);
  const rt = runtimeOf(el);
  if (!rt) return undefined;
  if (stateName !== 'adjusting' && rt.drag) endDrag(el, false, false);
  if (stateName !== 'adjusting') rt.dial.style.removeProperty('--knob-reach');
  if ('value' in incoming) show(el, num(incoming.value, rt.value), true);
  return undefined;
}

/** Registry-level API; pass the .knob element explicitly. Unknown names throw. */
export const knobApi = componentState({
  component: 'knob',
  states: knobStates,
  // the config is the value: a state change keeps it unless it names another
  mergeConfig: true,
  apply: (el, state, _previous, incoming) => triggerStateChange(el, state.name, incoming),
  // the user turns the knob without setState; a disabled input is the disabled state
  read: (el, state) => {
    const rt = runtimeOf(el);
    if (!rt) return state;
    const name = rt.input.disabled ? 'disabled' : state.name === 'disabled' ? 'default' : state.name;
    if (name === state.name && (state.config as KnobConfig).value === rt.value) return state;
    return { name, config: { ...state.config, value: rt.value } };
  },
  markup: (el, state) => applyMarkup(el, state.name),
  events: ['input', 'change'],
});

df$.knobApi = knobApi;
df$.knobStates = knobStates;

/** the speed of a drag at a pointer: full within the radius, the radius over the distance beyond it */
function speedAt(d: Drag, e: PointerEvent): number {
  const dist = Math.hypot(e.clientX - d.cx, e.clientY - d.cy);
  return dist <= d.radius ? 1 : Math.max(MIN_SPEED, d.radius / dist);
}

/** the drag's precision drawn: the circle through the pointer around the knob */
function reach(el: HTMLElement, e: PointerEvent): void {
  const rt = runtimeOf(el);
  if (!rt.drag) return;
  const dist = Math.hypot(e.clientX - rt.drag.cx, e.clientY - rt.drag.cy);
  rt.dial.style.setProperty('--knob-reach', `${Math.round(dist)}px`);
}

/** the precision radius: data-radius (px), else the dial's width - beyond it a drag slows down */
const radiusOf = (el: HTMLElement, box: DOMRect): number => Math.max(8, num(el.getAttribute('data-radius'), box.width));

function onPointerDown(el: HTMLElement, e: PointerEvent): void {
  const rt = runtimeOf(el);
  if (!rt || rt.input.disabled || e.button !== 0) return;
  e.preventDefault();
  // the keys go to the knob now - without the ring a key press would show
  rt.input.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
  // Ctrl / Cmd + click: back to the default, as in a plugin
  if (e.ctrlKey || e.metaKey) {
    show(el, defaultOf(el), true);
    return;
  }
  const box = rt.dial.getBoundingClientRect();
  rt.drag = {
    id: e.pointerId,
    x: e.clientX,
    p: rt.p,
    start: rt.value,
    cx: box.left + box.width / 2,
    cy: box.top + box.height / 2,
    radius: radiusOf(el, box),
  };
  rt.dial.style.setProperty('--knob-radius', `${Math.round(rt.drag.radius)}px`);
  try {
    rt.dial.setPointerCapture(e.pointerId);
  } catch {
    /* a synthetic pointer: no capture */
  }
  el.api?.setState('adjusting');
  reach(el, e);
}

function onPointerMove(el: HTMLElement, e: PointerEvent): void {
  const rt = runtimeOf(el);
  const d = rt?.drag;
  if (!d || e.pointerId !== d.id) return;
  const dx = e.clientX - d.x;
  d.x = e.clientX;
  const travel = Math.max(20, num(el.getAttribute('data-travel'), 200));
  d.p = clamp(d.p + (dx / travel) * speedAt(d, e) * (e.shiftKey ? 0.1 : 1), 0, 1);
  reach(el, e);
  show(el, valueAt(el, d.p), false);
}

/** End a drag: committed where it is, or (cancel: Escape) back where it started. */
function endDrag(el: HTMLElement, cancel: boolean, rest = true): void {
  const rt = runtimeOf(el);
  const d = rt.drag;
  if (!d) return;
  rt.drag = null;
  try {
    if (rt.dial.hasPointerCapture(d.id)) rt.dial.releasePointerCapture(d.id);
  } catch {
    /* already released */
  }
  show(el, cancel ? d.start : rt.value, true);
  if (rest && el.dataset.stateName === 'adjusting') el.api?.setState('default');
}

/** The keys (the APG slider): an arrow a step - the input's step, else 1 % of the turn (Shift: 0.1 %) -, Page Up /
 *  Down 10 %, Home / End the ends, Delete / Backspace the default, Escape ends a drag where it started. */
function onKey(el: HTMLElement, e: KeyboardEvent): void {
  const rt = runtimeOf(el);
  if (!rt || rt.input.disabled || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'Escape') {
    if (!rt.drag) return;
    e.preventDefault();
    endDrag(el, true);
    return;
  }
  const dir = ({ ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 } as Record<string, number>)[e.key];
  const step = Number(rt.input.getAttribute('step'));
  let value: number | null = null;
  if (dir && step > 0)
    value = rt.value + dir * step * Math.sign(rangeOf(el, rt.input).max - rangeOf(el, rt.input).min || 1);
  else if (dir) value = valueAt(el, rt.p + dir * (e.shiftKey ? FINE_STEP : KEY_STEP));
  else if (e.key === 'PageUp' || e.key === 'PageDown')
    value = valueAt(el, rt.p + (e.key === 'PageUp' ? PAGE_STEP : -PAGE_STEP));
  else if (e.key === 'Home' || e.key === 'End') value = valueAt(el, e.key === 'Home' ? 0 : 1);
  else if (e.key === 'Delete' || e.key === 'Backspace') value = defaultOf(el);
  else if (e.key === 'Enter' && !rt.drag) {
    e.preventDefault();
    openEditor(el);
    return;
  }
  if (value === null) return;
  e.preventDefault();
  if (rt.drag) rt.drag.p = positionAt(el, settle(el, value));
  show(el, value, true);
}

/** how the editor writes a value: a percent knob in percent, a time knob in seconds, any other in its unit */
function editScaleOf(el: HTMLElement): { factor: number; unit: string } {
  const format = el.getAttribute('data-format') ?? 'number';
  if (format === 'percent') return { factor: 100, unit: '%' };
  if (format === 'time') return { factor: 1, unit: 's' };
  return { factor: 1, unit: el.getAttribute('data-unit') ?? '' };
}

/** Type the value in: a Number Input (xs) over the readout - the knob's range and step, its unit -, Enter or leaving
 *  it sets the value (settled on the range and step), Escape keeps the old one. It lies over the knob, so nothing
 *  moves while it is open. */
function openEditor(el: HTMLElement): void {
  const rt = runtimeOf(el);
  if (!rt || rt.input.disabled || rt.editor) return;
  const { factor, unit } = editScaleOf(el);
  const r = rangeOf(el, rt.input);
  const step = Number(rt.input.getAttribute('step'));
  const id = `${rt.dial.getAttribute('data-describes') ?? 'knob'}-edit`;
  const name = dfDollar(el).find('.knob-label').text().trim() || rt.input.getAttribute('aria-label') || 'Value';
  const typed = (v: number) => String(tidy(v * factor));
  const editor = dfDollar(
    `<div class="number-input knob-editor" data-size="xs"><input type="number" id="${esc(id)}" min="${typed(Math.min(r.min, r.max))}" max="${typed(Math.max(r.min, r.max))}" step="${step > 0 ? typed(step) : 'any'}" value="${typed(rt.value)}" aria-label="${esc(name)}" enterkeyhint="done" />${unit ? `<label class="number-input-unit" for="${esc(id)}">${esc(unit)}</label>` : ''}</div>`,
  ).get(0) as HTMLElement;
  const output = dfDollar(el).find<HTMLElement>('.knob-value').get(0);
  // centred on the readout (without one, just under the dial)
  const middle = output ? output.offsetTop + output.offsetHeight / 2 : rt.dial.offsetTop + rt.dial.offsetHeight + 16;
  editor.style.setProperty('top', `${middle}px`);
  if (output) output.style.setProperty('visibility', 'hidden');
  dfDollar(el).append(editor);
  rt.editor = editor;
  const field = dfDollar(editor).find<HTMLInputElement>('input').get(0)!;
  const close = (commit: boolean, back: boolean) => {
    if (rt.editor !== editor) return;
    rt.editor = null;
    const n = field.valueAsNumber;
    editor.remove();
    if (output) output.style.removeProperty('visibility');
    if (commit && Number.isFinite(n)) show(el, n / factor, true);
    if (back) rt.input.focus({ preventScroll: true });
  };
  dfDollar(field).on('keydown', (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    close(e.key === 'Enter', true);
  });
  dfDollar(field).on('blur', () => close(true, false));
  field.focus({ preventScroll: true });
  field.select();
}

function init() {
  dfDollar('.knob:not([data-init])')
    .toArray()
    .forEach((el: HTMLElement) => {
      el.dataset.init = '';
      const input = inputOf(el);
      if (!input) return;
      // a range without a step snaps to whole numbers - the knob's values are as fine as its scale unless it says
      // (the browser has snapped the authored value already: it is read again under step="any")
      if (!input.hasAttribute('step')) {
        dfDollar(input).attr('step', 'any');
        if (input.hasAttribute('value')) input.value = input.defaultValue;
      }
      let data: unknown = null;
      try {
        data = JSON.parse(dfDollar(el).children('script.knob-rings').text() || 'null');
      } catch {
        data = null;
      }
      const id = `knob-rings-${++rings}`;
      const dial = dfDollar(`<span class="knob-dial" aria-hidden="true" data-describes="${id}"></span>`).get(
        0,
      ) as HTMLElement;
      dfDollar(input).before(dial);
      const described = (input.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
      dfDollar(input).attr('aria-describedby', [...described, id].join(' '));
      const rt: Runtime = {
        input,
        dial,
        value: NaN,
        p: 0,
        committed: NaN,
        rings: ringsOf(data),
        live: new Map(),
        drag: null,
        writing: false,
        editor: null,
      };
      el._knob = rt;
      renderDial(el);
      show(el, num(input.value, defaultOf(el)), true, false);
      // el.store + el.api (AGENTS.md "State through stores"): $('#cutoff').api.setState('default', { value: 440 })
      bindComponent(el, knobApi, { name: input.disabled ? 'disabled' : 'default', config: { value: rt.value } });

      dfDollar(dial).on('pointerdown', (e: PointerEvent) => onPointerDown(el, e));
      dfDollar(dial).on('pointermove', (e: PointerEvent) => onPointerMove(el, e));
      dfDollar(dial).on('pointerup', () => endDrag(el, false));
      dfDollar(dial).on('pointercancel', () => endDrag(el, false));
      dfDollar(dial).on('lostpointercapture', () => endDrag(el, false));
      dfDollar(dial).on('dblclick', () => {
        if (!input.disabled) show(el, defaultOf(el), true);
      });
      dfDollar(input).on('keydown', (e: KeyboardEvent) => onKey(el, e));
      // a double click on the readout types the value in
      dfDollar(el).on('dblclick', (e: MouseEvent) => {
        if ((e.target as Element).closest?.('.knob-value')) openEditor(el);
      });
      // a value written from outside (input.value = ... and an input event) is shown, not sent back
      dfDollar(input).on('input', () => {
        if (!rt.writing && Number(input.value) !== rt.value) show(el, num(input.value, rt.value), true, false);
      });
      // a form reset puts the authored value back
      if (input.form)
        dfDollar(input.form).on('reset', () => {
          setTimeout(() => show(el, num(input.value, defaultOf(el)), true, false));
        });
      // another scale, range, step, marks or format: the same value drawn again
      const again = () => redraw(el);
      new MutationObserver(again).observe(el, {
        attributes: true,
        attributeFilter: [
          'data-scale',
          'data-exponent',
          'data-origin',
          'data-unit',
          'data-format',
          'data-decimals',
          'data-ticks',
        ],
      });
      new MutationObserver(again).observe(input, { attributes: true, attributeFilter: ['min', 'max', 'step'] });
    });
}

/** the knob of a target: the .knob element, its input, or a selector of either */
const resolve = (target: string | HTMLElement): HTMLElement | undefined => {
  const el = typeof target === 'string' ? dfDollar(target).get(0) : target;
  const knob = el?.closest?.<HTMLElement>('.knob');
  return knob?._knob ? knob : undefined;
};

df$.knob = {
  /**
   * The knob's value, or set it (setState with { value }: settled on the range and step, the change told).
   * @param target - the .knob element, its input, or a selector of either
   * @param value - the value to set; leave it out to read
   * @returns the value now; NaN for an unknown element
   */
  value: (target: string | HTMLElement, value?: number): number => {
    const el = resolve(target);
    if (!el) return NaN;
    if (value !== undefined) el.api?.setState(el.dataset.stateName === 'disabled' ? 'disabled' : 'default', { value });
    return runtimeOf(el).value;
  },
  /**
   * Where the value stands on the knob's turn.
   * @param target - the .knob element, its input, or a selector of either
   * @returns the position, 0 (the start of the turn) to 1 (its end); NaN for an unknown element
   */
  position: (target: string | HTMLElement): number => {
    const el = resolve(target);
    return el ? runtimeOf(el).p : NaN;
  },
  /**
   * Back to the default value (data-default, else the input's authored value) - what a double click does.
   * @param target - the .knob element, its input, or a selector of either
   * @returns the value now; NaN for an unknown element
   */
  reset: (target: string | HTMLElement): number => {
    const el = resolve(target);
    if (!el) return NaN;
    show(el, defaultOf(el), true);
    return runtimeOf(el).value;
  },
  /**
   * The rings around the knob, or replace them - the live values of the sources that stay are kept.
   * @param target - the .knob element, its input, or a selector of either
   * @param list - the new rings; leave it out to read
   * @returns a copy of the rings now
   */
  rings: (target: string | HTMLElement, list?: KnobRing[]): KnobRing[] => {
    const el = resolve(target);
    if (!el) return [];
    const rt = runtimeOf(el);
    if (list !== undefined) {
      rt.rings = ringsOf(list);
      for (const id of rt.live.keys()) if (!rt.rings.some((r) => r.id === id)) rt.live.delete(id);
      renderDial(el);
      paint(el);
    }
    return rt.rings.map((r) => ({ ...r }));
  },
  /**
   * The live outputs of the sources - each ring shows how far its source moves the knob now, the value ring the
   * effective value. A unipolar source runs from 0 to 1, a bipolar one from -1 to 1.
   * @param target - the .knob element, its input, or a selector of either
   * @param values - the outputs by ring id (null for a ring: no live value); null: none at all
   * @returns the effective value - the knob's value moved by every live source, inside its range
   */
  modulate: (target: string | HTMLElement, values: Record<string, number | null> | null): number => {
    const el = resolve(target);
    if (!el) return NaN;
    const rt = runtimeOf(el);
    if (values === null) rt.live.clear();
    else
      for (const [id, out] of Object.entries(values ?? {})) {
        const ring = rt.rings.find((r) => r.id === id);
        if (!ring || out === null || !Number.isFinite(Number(out))) rt.live.delete(id);
        else rt.live.set(id, clamp(Number(out), ring.bipolar ? -1 : 0, 1));
      }
    paint(el);
    let p = rt.p;
    for (const r of rt.rings) p += r.amount * (rt.live.get(r.id) ?? 0);
    return settle(el, valueAt(el, clamp(p, 0, 1)));
  },
  /**
   * Add a scale knobs name in data-scale - the knobs on it are drawn again.
   * @param name - the scale's name
   * @param scale - its value() and position(), each the inverse of the other
   */
  scale: (name: string, scale: KnobScale): void => {
    if (!name || typeof scale?.value !== 'function' || typeof scale?.position !== 'function') return;
    SCALES[name] = scale;
    for (const el of dfDollar(`.knob[data-init][data-scale="${CSS.escape(name)}"]`).toArray() as HTMLElement[])
      if (el._knob) redraw(el);
  },
  /**
   * Add a format knobs name in data-format - the knobs in it write their values again.
   * @param name - the format's name
   * @param format - the value's text, from the value and the knob's unit, decimals, locale and range
   */
  format: (name: string, format: (value: number, context: KnobFormatContext) => string): void => {
    if (!name || typeof format !== 'function') return;
    FORMATS[name] = format;
    for (const el of dfDollar(`.knob[data-init][data-format="${CSS.escape(name)}"]`).toArray() as HTMLElement[])
      if (el._knob) paint(el);
  },
};

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
