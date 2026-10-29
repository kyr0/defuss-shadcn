// -- Envelope ----------------------------------------------------
// The curves of an audio plugin, drawn and edited by their handles: an ADSR envelope (delay, attack, hold, decay,
// sustain, release, each slope bent), the transfer curve of a compressor (threshold, ratio, knee, makeup, its attack
// and release) and the frequency response of a filter or an EQ (bands of the Web Audio BiquadFilterNode types - the
// curve drawn is the response Web Audio computes for them). While it plays the curve shows where it is: an envelope
// its phase and level after a gate, a compressor the level going in, the gain it takes and whether it is attacking or
// releasing, a filter the modulated curve. The parameters are one JSON object in the markup; knobs, inputs and
// selects bound to a parameter follow it both ways, and the same parameters drive Web Audio (schedule(), connect()).

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent, textLocale } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

const envelopeStates = ['default', 'playing', 'editing', 'disabled'];

/** The kinds of curve (data-kind). */
export type EnvelopeKind = 'adsr' | 'dynamics' | 'filter';

/** The parameters of an ADSR envelope (data-kind="adsr", the default): times in seconds, levels 0 to 1. */
export interface EnvelopeAdsr {
  /** the wait before the attack - the stage shows only when the key is given */
  delay?: number;
  /** the rise from 0 to the peak */
  attack: number;
  /** the time the peak is held - the stage shows only when the key is given */
  hold?: number;
  /** the fall from the peak to the sustain level */
  decay: number;
  /** the level held while the gate stays open, 0 to 1 */
  sustain: number;
  /** the fall to 0 after the gate closes */
  release: number;
  /** the attack's bend, -1 to 1: 0 is a straight line, above 0 fast first, below 0 slow first */
  attackCurve?: number;
  /** the decay's bend, -1 to 1 */
  decayCurve?: number;
  /** the release's bend, -1 to 1 */
  releaseCurve?: number;
}

/** The parameters of a compressor (data-kind="dynamics"): levels in dB, times in seconds. */
export interface EnvelopeDynamics {
  /** the level above which the gain is reduced */
  threshold: number;
  /** how much a level above the threshold is reduced: 4 = 4 dB in, 1 dB out; 100 and more is a limiter */
  ratio: number;
  /** the width of the soft knee around the threshold, in dB (0: a hard knee) */
  knee: number;
  /** the gain added after the reduction */
  makeup: number;
  /** how fast the reduction follows a rising level */
  attack: number;
  /** how fast it lets go when the level falls */
  release: number;
}

/** A band of a filter or an EQ - the parameters of a Web Audio BiquadFilterNode. */
export interface EnvelopeBand {
  /** the band's name in a bound parameter ("low.gain") and in modulate(); without one it is its number from 1 */
  id?: string;
  /** the band's name for people ("Low cut") */
  label?: string;
  /** the BiquadFilterNode type: lowpass, highpass, bandpass, lowshelf, highshelf, peaking, notch or allpass */
  type: BiquadFilterType;
  /** the cutoff, centre or corner frequency in Hz, 20 to 20 000 */
  frequency: number;
  /** the resonance in dB for lowpass and highpass (Web Audio's meaning), the quality factor for bandpass, peaking, notch and allpass; shelves take none */
  Q?: number;
  /** the gain in dB of peaking and the shelves */
  gain?: number;
  /** lowpass and highpass: the slope in dB per octave - 12, 24, 36 or 48 (that many filters in a row) */
  slope?: number;
  /** false: the band is drawn dashed and left out of the response */
  on?: boolean;
  /** a theme colour (chart-1 ... chart-5, primary, destructive) or a CSS colour; default the chart colour of its number */
  color?: string;
}

/** The parameters of a filter or an EQ (data-kind="filter"). */
export interface EnvelopeFilter {
  /** the bands, their responses added in dB */
  bands: EnvelopeBand[];
}

/** The parameters of a curve - the ones of its kind. */
export type EnvelopeParams = EnvelopeAdsr | EnvelopeDynamics | EnvelopeFilter;

/** The config every state takes. */
export interface EnvelopeConfig {
  /** the curve's parameters (EnvelopeAdsr, EnvelopeDynamics or EnvelopeFilter, by data-kind); a setState may name only some of them - getState() reports them all */
  params?: Partial<EnvelopeAdsr> | Partial<EnvelopeDynamics> | EnvelopeFilter;
  /** playing an ADSR: the gate's length in seconds - left out, the gate stays open until noteOff() */
  gate?: number;
  /** editing: the handle being edited (its data-handle) */
  handle?: string;
}

// VERIFIED: (verify's API docs gate) the states below are exactly the declared ones, each
// described, and every config field typed, described and named in the code.
/** setState() configs per state. */
export interface EnvelopeStateConfigs {
  /** At rest: the curve and its handles. */
  default: EnvelopeConfig;
  /** Playing: an ADSR after its gate opened (until its release ends), a compressor while levels come in, a filter while it is modulated - the curve shows the live value. */
  playing: EnvelopeConfig;
  /** A handle is dragged: it shows its value - a drag enters it and returns to default when it ends. */
  editing: EnvelopeConfig;
  /** Disabled: aria-disabled, no handle moves; playback stops. */
  disabled: EnvelopeConfig;
}

/** What envelope-change carries. */
export interface EnvelopeChangeDetail {
  /** the parameters now */
  params: EnvelopeParams;
  /** the handle or bound parameter that changed them, null for setState and the API */
  handle: string | null;
  /** true when the change is done (a drag ended, a key, setState), false while a drag goes on */
  committed: boolean;
}

/** What envelope-phase and envelope-value carry. */
export interface EnvelopeValueDetail {
  /** an ADSR: the level, 0 to 1; a compressor: the gain reduction in dB (0 or more) */
  value: number;
  /** an ADSR: delay, attack, hold, decay, sustain, release or idle; a compressor: attack, release or idle */
  phase: string;
  /** an ADSR: seconds since the gate opened; a compressor: the time of the level in seconds */
  time: number;
  /** a compressor: the level going in, in dB */
  input?: number;
  /** a compressor: the level coming out, in dB (the reduction and the makeup applied) */
  output?: number;
}

/** What schedule() writes and how. */
export interface EnvelopeScheduleOptions {
  /** the context time the gate opens; default the context's current time */
  start?: number;
  /** the gate's length in seconds; default until the sustain is reached and a quarter second more */
  gate?: number;
  /** the parameter's value at level 0; default 0 */
  min?: number;
  /** the parameter's value at level 1; default 1 */
  max?: number;
  /** "exponential" maps the level onto min ... max on a log scale (a frequency); default "linear" */
  scale?: 'linear' | 'exponential';
}

/** The audio nodes connect() made - put them between a source and a destination. */
export interface EnvelopeChain {
  /** connect the source to it */
  input: AudioNode;
  /** connect it to the destination */
  output: AudioNode;
  /** the compressor of a dynamics curve (its live reduction is shown), null for a filter */
  compressor: DynamicsCompressorNode | null;
  /** take the nodes apart and stop following the curve */
  disconnect: () => void;
}

/** one band, normalized */
type Band = Required<Pick<EnvelopeBand, 'type' | 'frequency' | 'Q' | 'gain' | 'slope' | 'on'>> &
  Pick<EnvelopeBand, 'id' | 'label' | 'color'>;
type Adsr = Required<Omit<EnvelopeAdsr, 'delay' | 'hold'>> & Pick<EnvelopeAdsr, 'delay' | 'hold'>;
type Params = Adsr | EnvelopeDynamics | { bands: Band[] };
/** a handle: where it is (fractions of the plot, y up) and what a move does */
type Handle = {
  id: string;
  label: string;
  x: number;
  y: number;
  text: string;
  now: number;
  min: number;
  max: number;
  setX?: (fx: number) => void;
  setY?: (fy: number) => void;
  keyX?: (dir: number, fine: boolean) => void;
  keyY?: (dir: number, fine: boolean) => void;
  keyQ?: (dir: number, fine: boolean) => void;
  color?: string;
  off?: boolean;
};
type View = { T: number; sustainWidth: number; floor: number; range: number };
type Drag = { id: number; handle: string; x: number; y: number; fx: number; fy: number; start: string };
type Play = { start: number; gateOff: number | null; gateLen: number | null; v0: number; phase: string; value: number };
type Live = { gr: number; input: number | null; at: number; phase: string; quiet: number };
type Chain = {
  ctx: BaseAudioContext;
  input: GainNode;
  output: GainNode;
  nodes: AudioNode[];
  shape: string;
  comp: DynamicsCompressorNode | null;
  analyser: AnalyserNode | null;
  makeup: GainNode | null;
  frame: number;
};
/** per-element runtime (state lives on the element) */
type Runtime = {
  kind: EnvelopeKind;
  params: Params;
  /** the source's authored text and its parameters - written back when the parameters return to them */
  authored: { text: string; json: string };
  status: string;
  graph: HTMLElement;
  plot: HTMLElement;
  svg: SVGSVGElement;
  view: View;
  frozen: boolean;
  drag: Drag | null;
  play: Play | null;
  live: Live | null;
  mod: Map<string, Partial<Pick<Band, 'frequency' | 'gain' | 'Q'>>>;
  chains: Chain[];
  frame: number;
  writing: boolean;
  desc: HTMLElement;
  /** the handle the editing state names */
  editHandle: string | null;
  /** the handle pressed last and when - a double click after a captured press lands on the plot */
  pressed: { id: string; at: number } | null;
};

const MAX_TIME = 32;
const F_MIN = 20;
const F_MAX = 20000;
const SAMPLES = 256;
const BAND_TYPES = ['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'peaking', 'notch', 'allpass'];
const TYPE_NAMES: Record<string, string> = {
  lowpass: 'Low pass',
  highpass: 'High pass',
  bandpass: 'Band pass',
  lowshelf: 'Low shelf',
  highshelf: 'High shelf',
  peaking: 'Bell',
  notch: 'Notch',
  allpass: 'All pass',
};
const STAGES = ['delay', 'attack', 'hold', 'decay', 'sustain', 'release'] as const;
const STAGE_NAMES: Record<string, string> = {
  delay: 'Delay',
  attack: 'Attack',
  hold: 'Hold',
  decay: 'Decay',
  sustain: 'Sustain',
  release: 'Release',
};
/** the phase strip's marks */
const PHASE_MARKS: Record<string, string> = {
  delay: 'Dly',
  attack: 'A',
  hold: 'H',
  decay: 'D',
  sustain: 'S',
  release: 'R',
};
const THEME_COLORS = /^(chart-[1-5]|primary|destructive|foreground|muted-foreground)$/;
const DEFAULTS = {
  adsr: { attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.5 },
  dynamics: { threshold: -18, ratio: 4, knee: 6, makeup: 0, attack: 0.01, release: 0.1 },
};

let described = 0;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const num = (v: unknown, fallback: number): number => {
  const n = typeof v === 'number' ? v : v === null || v === undefined || v === '' ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
/** no float noise in a parameter: 6 significant digits */
const tidy = (v: number): number => Number(v.toPrecision(6));
const r1 = (v: number): string => String(Math.round(v * 10) / 10);
const runtimeOf = (el: HTMLElement): Runtime => el._envelope;
const kindOf = (el: Element): EnvelopeKind => {
  const k = el.getAttribute('data-kind');
  return k === 'dynamics' || k === 'filter' ? k : 'adsr';
};

// -- the curves ---------------------------------------------------

/** a bent slope: the share of the way covered at t (0 to 1) - straight at 0, fast first above 0, slow first below */
function shape(t: number, curve: number): number {
  const k = curve * 8;
  if (Math.abs(k) < 1e-4) return t;
  return (1 - Math.exp(-k * t)) / (1 - Math.exp(-k));
}
/** the bend that puts the middle of a slope at a share of its way - the inverse of shape(0.5, c) */
const bendFor = (share: number): number => clamp((2 * Math.log(share / (1 - share))) / 8, -1, 1);

/** an ADSR's level and phase at t seconds after its gate opened (gateOff: when it closed, null while open) */
function levelAt(p: Adsr, t: number, gateOff: number | null, v0 = 0): { value: number; phase: string } {
  const held = (s: number): { value: number; phase: string } => {
    let u = s;
    const delay = p.delay ?? 0;
    if (u < delay) return { value: v0, phase: 'delay' };
    u -= delay;
    if (u < p.attack) return { value: v0 + (1 - v0) * shape(u / p.attack, p.attackCurve), phase: 'attack' };
    u -= p.attack;
    const hold = p.hold ?? 0;
    if (u < hold) return { value: 1, phase: 'hold' };
    u -= hold;
    if (u < p.decay) return { value: 1 + (p.sustain - 1) * shape(u / p.decay, p.decayCurve), phase: 'decay' };
    return { value: p.sustain, phase: 'sustain' };
  };
  if (t < 0) return { value: v0, phase: 'idle' };
  if (gateOff === null || t < gateOff) return held(t);
  const from = held(gateOff).value;
  const r = t - gateOff;
  if (r >= p.release || from <= 0) return { value: 0, phase: 'idle' };
  return { value: from * (1 - shape(r / p.release, p.releaseCurve)), phase: 'release' };
}
/** the time the sustain is reached */
const sustainStart = (p: Adsr): number => (p.delay ?? 0) + p.attack + (p.hold ?? 0) + p.decay;

/** a compressor's output for a level going in, before its makeup (the soft knee of Giannoulis, Massberg and Reiss) */
function staticCurve(p: EnvelopeDynamics, x: number): number {
  const over = x - p.threshold;
  const w = p.knee;
  if (2 * over < -w) return x;
  if (w > 0 && 2 * Math.abs(over) <= w) return x + ((1 / p.ratio - 1) * (over + w / 2) ** 2) / (2 * w);
  return p.threshold + over / p.ratio;
}

let audio: OfflineAudioContext | null | undefined;
let biquad: BiquadFilterNode | null = null;
let freqs: Float32Array | null = null;
/** the frequencies a response is drawn at: log-spaced from 20 Hz to 20 kHz */
function frequencies(): Float32Array {
  if (!freqs) {
    freqs = new Float32Array(SAMPLES);
    for (let i = 0; i < SAMPLES; i++) freqs[i] = F_MIN * (F_MAX / F_MIN) ** (i / (SAMPLES - 1));
  }
  return freqs;
}
const stages = (b: Band): number => (b.type === 'lowpass' || b.type === 'highpass' ? Math.round(b.slope / 12) : 1);
/** a band's response in dB at the frequencies - Web Audio's own (getFrequencyResponse), a flat line without it */
function bandDb(b: Band, at: Float32Array): Float32Array {
  const out = new Float32Array(at.length);
  if (audio === undefined) {
    try {
      audio = new OfflineAudioContext(1, 128, 48000);
      biquad = audio.createBiquadFilter();
    } catch {
      audio = null;
    }
  }
  if (!biquad) return out;
  biquad.type = b.type;
  biquad.frequency.value = b.frequency;
  biquad.Q.value = b.Q;
  biquad.gain.value = b.gain;
  const mag = new Float32Array(at.length);
  biquad.getFrequencyResponse(at as Float32Array<ArrayBuffer>, mag, new Float32Array(at.length));
  const n = stages(b);
  for (let i = 0; i < at.length; i++) out[i] = Math.max(-120, 20 * Math.log10(mag[i] || 1e-6) * n);
  return out;
}
/** where a band's handle sits: its own level at its frequency */
function bandY(b: Band): number {
  if (b.type === 'peaking') return b.gain;
  if (b.type === 'lowshelf' || b.type === 'highshelf') return b.gain / 2;
  if (b.type === 'lowpass' || b.type === 'highpass') return b.Q * stages(b);
  return 0;
}
const QS: Record<string, [number, number]> = { cut: [-12, 24], q: [0.1, 24] };
const isCut = (t: string): boolean => t === 'lowpass' || t === 'highpass';
const hasGain = (t: string): boolean => t === 'peaking' || t === 'lowshelf' || t === 'highshelf';
const hasQ = (t: string): boolean => t !== 'lowshelf' && t !== 'highshelf';

// -- the parameters -----------------------------------------------

/** a band from what the markup or a call says - every field on its range */
function bandOf(raw: unknown): Band | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const type = (BAND_TYPES.includes(String(r.type)) ? String(r.type) : 'peaking') as BiquadFilterType;
  const [qlo, qhi] = isCut(type) ? QS.cut : QS.q;
  const band: Band = {
    type,
    frequency: tidy(clamp(num(r.frequency, 1000), F_MIN, F_MAX)),
    Q: hasQ(type) ? tidy(clamp(num(r.Q, isCut(type) ? 0 : 1), qlo, qhi)) : 1,
    gain: hasGain(type) ? tidy(clamp(num(r.gain, 0), -24, 24)) : 0,
    slope: isCut(type) ? clamp(Math.round(num(r.slope, 12) / 12) * 12, 12, 48) : 12,
    on: r.on !== false,
  };
  const out: Band = {} as Band;
  if (typeof r.id === 'string' && r.id) out.id = r.id;
  if (typeof r.label === 'string' && r.label) out.label = r.label;
  Object.assign(out, band);
  if (typeof r.color === 'string' && r.color) out.color = r.color;
  return out;
}

/** the parameters of a kind from a raw object - missing ones from the base (the current ones, else the defaults) */
function paramsOf(kind: EnvelopeKind, raw: unknown, base?: Params): Params {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  if (kind === 'filter') {
    const list = Array.isArray(r.bands) ? r.bands : base ? (base as { bands: Band[] }).bands : [];
    return { bands: list.map(bandOf).filter((b): b is Band => !!b) };
  }
  const b = (base ?? DEFAULTS[kind]) as Record<string, number | undefined>;
  const pick = (key: string, lo: number, hi: number, fallback: number): number =>
    tidy(clamp(num(r[key], num(b[key], fallback)), lo, hi));
  if (kind === 'dynamics')
    return {
      threshold: pick('threshold', -96, 0, -18),
      ratio: pick('ratio', 1, 100, 4),
      knee: pick('knee', 0, 24, 6),
      makeup: pick('makeup', -24, 24, 0),
      attack: pick('attack', 0, 1, 0.01),
      release: pick('release', 0, 5, 0.1),
    };
  const out: Record<string, number> = {};
  const has = (key: string) => key in r || (base ? (base as Record<string, unknown>)[key] !== undefined : false);
  if (has('delay')) out.delay = pick('delay', 0, MAX_TIME, 0);
  out.attack = pick('attack', 0, MAX_TIME, 0.01);
  if (has('hold')) out.hold = pick('hold', 0, MAX_TIME, 0);
  out.decay = pick('decay', 0, MAX_TIME, 0.3);
  out.sustain = pick('sustain', 0, 1, 0.7);
  out.release = pick('release', 0, MAX_TIME, 0.5);
  out.attackCurve = pick('attackCurve', -1, 1, 0);
  out.decayCurve = pick('decayCurve', -1, 1, 0);
  out.releaseCurve = pick('releaseCurve', -1, 1, 0);
  return out as Adsr;
}
const clone = (p: Params): Params => JSON.parse(JSON.stringify(p));

/** the bands' names: the id, else the number from 1 */
const keyOf = (b: Band, i: number): string => b.id ?? String(i + 1);
/** a band with its live values (modulate()) */
function liveBand(rt: Runtime, b: Band, i: number): Band {
  const m = rt.mod.get(keyOf(b, i));
  return m ? (bandOf({ ...b, ...m }) ?? b) : b;
}

// -- text ----------------------------------------------------------

const fmt = (locale: string, o: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale, o);
function timeText(locale: string, s: number): string {
  if (s <= 0) return `0 ms`;
  if (s < 1) return `${fmt(locale, { maximumSignificantDigits: 3 }).format(s * 1000)} ms`;
  return `${fmt(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(s)} s`;
}
const pctText = (locale: string, v: number): string => fmt(locale, { style: 'percent' }).format(v);
const dbText = (locale: string, v: number): string =>
  `${fmt(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(v)} dB`;
const bendText = (locale: string, v: number): string =>
  fmt(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero' }).format(v);
const ratioText = (locale: string, v: number): string =>
  v >= 100 ? '∞:1' : `${fmt(locale, { maximumFractionDigits: v < 10 ? 1 : 0 }).format(v)}:1`;
function hzText(locale: string, f: number): string {
  if (f < 1000) return `${fmt(locale, { maximumSignificantDigits: 3 }).format(f)} Hz`;
  return `${fmt(locale, { maximumSignificantDigits: 3 }).format(f / 1000)} kHz`;
}
const qText = (locale: string, q: number): string =>
  `Q ${fmt(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(q)}`;
const bandName = (b: Band, i: number): string => b.label ?? `${TYPE_NAMES[b.type]} ${i + 1}`;
function bandText(locale: string, b: Band): string {
  const parts = [hzText(locale, b.frequency)];
  if (hasGain(b.type)) parts.push(dbText(locale, b.gain));
  if (isCut(b.type)) parts.push(`${b.slope} dB/oct`, `resonance ${dbText(locale, b.Q)}`);
  else if (hasQ(b.type)) parts.push(qText(locale, b.Q));
  if (!b.on) parts.push('off');
  return parts.join(', ');
}
/** the curve in words - the description of the whole for assistive technology */
function summary(el: HTMLElement): string {
  const rt = runtimeOf(el);
  const locale = textLocale(el);
  if (rt.kind === 'filter') {
    const bands = (rt.params as { bands: Band[] }).bands;
    return bands.length
      ? bands.map((b, i) => `${bandName(b, i)}: ${TYPE_NAMES[b.type].toLowerCase()}, ${bandText(locale, b)}`).join('; ')
      : 'No bands';
  }
  if (rt.kind === 'dynamics') {
    const p = rt.params as EnvelopeDynamics;
    return `Threshold ${dbText(locale, p.threshold)}, ratio ${ratioText(locale, p.ratio)}, knee ${fmt(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(p.knee)} dB, makeup ${dbText(locale, p.makeup)}, attack ${timeText(locale, p.attack)}, release ${timeText(locale, p.release)}`;
  }
  const p = rt.params as Adsr;
  const parts: string[] = [];
  if (p.delay !== undefined) parts.push(`delay ${timeText(locale, p.delay)}`);
  parts.push(`attack ${timeText(locale, p.attack)}`);
  if (p.hold !== undefined) parts.push(`hold ${timeText(locale, p.hold)}`);
  parts.push(
    `decay ${timeText(locale, p.decay)}`,
    `sustain ${pctText(locale, p.sustain)}`,
    `release ${timeText(locale, p.release)}`,
  );
  const s = parts.join(', ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** a theme colour by name, a CSS colour, or the chart colour of a number */
function colorOf(color: string | undefined, i: number): string {
  if (color && THEME_COLORS.test(color)) return `var(--${color})`;
  if (color && globalThis.CSS?.supports?.('color', color)) return color;
  return `var(--chart-${(i % 5) + 1})`;
}

// -- the view ------------------------------------------------------

/** what the plot spans: an ADSR its stages and a sustain a quarter as long (at least data-length seconds), a
 *  compressor data-range dB up to 0, a filter ± data-range dB */
function viewOf(el: HTMLElement, p: Params, kind: EnvelopeKind): View {
  const range = Math.abs(num(el.getAttribute('data-range'), kind === 'dynamics' ? 60 : 24)) || 24;
  if (kind !== 'adsr') return { T: 1, sustainWidth: 0, floor: -range, range };
  const a = p as Adsr;
  const span = sustainStart(a) + a.release;
  const sustainWidth = Math.max(span * 0.25, 0.05);
  const T = Math.max(span + sustainWidth, num(el.getAttribute('data-length'), 0));
  return { T, sustainWidth, floor: -range, range };
}
/** an ADSR's drawn gate: where the drawn sustain ends */
const gateAt = (p: Adsr, v: View): number => sustainStart(p) + v.sustainWidth;
const fxFreq = (f: number): number => Math.log(f / F_MIN) / Math.log(F_MAX / F_MIN);
const freqFx = (fx: number): number => F_MIN * (F_MAX / F_MIN) ** fx;

// -- the handles ---------------------------------------------------

/** the handles of the curve, each with where it sits and what moving it changes */
function handlesOf(el: HTMLElement): Handle[] {
  const rt = runtimeOf(el);
  const v = rt.view;
  const locale = textLocale(el);
  const time = (key: 'delay' | 'attack' | 'hold' | 'decay' | 'release', from: () => number) => ({
    setX: (fx: number) => set(el, { [key]: Math.max(0, fx * v.T - from()) }, key),
    keyX: (dir: number, fine: boolean) => {
      const now = (rt.params as Adsr)[key] ?? 0;
      const f = fine ? 1.01 : 1.1;
      set(el, { [key]: dir > 0 ? Math.max(0.001, now * f) : now < 0.0011 ? 0 : now / f }, key);
    },
  });
  if (rt.kind === 'adsr') {
    const p = rt.params as Adsr;
    const d = p.delay ?? 0;
    const peak = d + p.attack;
    const held = peak + (p.hold ?? 0);
    const sus = held + p.decay;
    const gate = gateAt(p, v);
    const out: Handle[] = [];
    const bend = (
      key: 'attackCurve' | 'decayCurve' | 'releaseCurve',
      label: string,
      t: number,
      y: number,
      share: (fy: number) => number,
    ) =>
      out.push({
        id: key,
        label,
        x: t / v.T,
        y,
        text: `${label} ${bendText(locale, p[key])}`,
        now: p[key],
        min: -1,
        max: 1,
        setY: (fy) => set(el, { [key]: bendFor(clamp(share(fy), 0.02, 0.98)) }, key),
        keyY: (dir, fine) => set(el, { [key]: clamp(p[key] + dir * (fine ? 0.01 : 0.05), -1, 1) }, key),
        keyX: (dir, fine) => set(el, { [key]: clamp(p[key] + dir * (fine ? 0.01 : 0.05), -1, 1) }, key),
      });
    if (p.delay !== undefined)
      out.push({
        id: 'delay',
        label: 'Delay',
        x: d / v.T,
        y: 0,
        text: `Delay ${timeText(locale, d)}`,
        now: d,
        min: 0,
        max: MAX_TIME,
        ...time('delay', () => 0),
      });
    out.push({
      id: 'attack',
      label: 'Attack',
      x: peak / v.T,
      y: 1,
      text: `Attack ${timeText(locale, p.attack)}`,
      now: p.attack,
      min: 0,
      max: MAX_TIME,
      ...time('attack', () => d),
    });
    if (p.attack > 0) bend('attackCurve', 'Attack curve', d + p.attack / 2, shape(0.5, p.attackCurve), (fy) => fy);
    if (p.hold !== undefined)
      out.push({
        id: 'hold',
        label: 'Hold',
        x: held / v.T,
        y: 1,
        text: `Hold ${timeText(locale, p.hold)}`,
        now: p.hold,
        min: 0,
        max: MAX_TIME,
        ...time('hold', () => peak),
      });
    out.push({
      id: 'decay',
      label: 'Decay and sustain',
      x: sus / v.T,
      y: p.sustain,
      text: `Decay ${timeText(locale, p.decay)}, sustain ${pctText(locale, p.sustain)}`,
      now: p.decay,
      min: 0,
      max: MAX_TIME,
      ...time('decay', () => held),
      setY: (fy) => set(el, { sustain: clamp(fy, 0, 1) }, 'sustain'),
      keyY: (dir, fine) => set(el, { sustain: clamp(p.sustain + dir * (fine ? 0.001 : 0.01), 0, 1) }, 'sustain'),
    });
    if (p.decay > 0 && p.sustain < 0.999)
      bend(
        'decayCurve',
        'Decay curve',
        held + p.decay / 2,
        1 + (p.sustain - 1) * shape(0.5, p.decayCurve),
        (fy) => (1 - fy) / (1 - p.sustain),
      );
    out.push({
      id: 'release',
      label: 'Release',
      x: (gate + p.release) / v.T,
      y: 0,
      text: `Release ${timeText(locale, p.release)}`,
      now: p.release,
      min: 0,
      max: MAX_TIME,
      ...time('release', () => gateAt(rt.params as Adsr, v)),
    });
    if (p.release > 0 && p.sustain > 0.001)
      bend(
        'releaseCurve',
        'Release curve',
        gate + p.release / 2,
        p.sustain * (1 - shape(0.5, p.releaseCurve)),
        (fy) => 1 - fy / p.sustain,
      );
    return out;
  }
  if (rt.kind === 'dynamics') {
    const p = rt.params as EnvelopeDynamics;
    const span = -v.floor;
    const fy = (db: number) => (db - v.floor) / span;
    const out0 = staticCurve(p, 0) + p.makeup;
    return [
      {
        id: 'threshold',
        label: 'Threshold',
        x: fy(p.threshold),
        y: fy(staticCurve(p, p.threshold) + p.makeup),
        text: `Threshold ${dbText(locale, p.threshold)}`,
        now: p.threshold,
        min: v.floor,
        max: 0,
        setX: (fx) => set(el, { threshold: clamp(v.floor + fx * span, v.floor, 0) }, 'threshold'),
        keyX: (dir, fine) =>
          set(el, { threshold: clamp(p.threshold + dir * (fine ? 0.1 : 1), v.floor, 0) }, 'threshold'),
        keyY: (dir, fine) => set(el, { knee: clamp(p.knee + dir * (fine ? 0.1 : 1), 0, 24) }, 'knee'),
      },
      {
        id: 'ratio',
        label: 'Ratio',
        x: 1,
        y: fy(out0),
        text: `Ratio ${ratioText(locale, p.ratio)}`,
        now: p.ratio,
        min: 1,
        max: 100,
        setY: (fyv) => {
          const o = v.floor + fyv * span - p.makeup;
          const ratio = o <= p.threshold + 0.01 ? 100 : o >= 0 ? 1 : -p.threshold / (o - p.threshold);
          set(el, { ratio: clamp(ratio, 1, 100) }, 'ratio');
        },
        keyY: (dir, fine) => {
          const f = fine ? 1.01 : 1.1;
          set(el, { ratio: clamp(dir < 0 ? p.ratio * f : p.ratio / f, 1, 100) }, 'ratio');
        },
      },
    ];
  }
  const bands = (rt.params as { bands: Band[] }).bands;
  const R = v.range;
  return bands.map((b, i): Handle => {
    const key = keyOf(b, i);
    const put = (patch: Partial<Band>, param: string) => {
      const next = (rt.params as { bands: Band[] }).bands.map((x, j) => (j === i ? { ...x, ...patch } : x));
      set(el, { bands: next }, `${key}.${param}`);
    };
    const yParam = (dbv: number): Partial<Band> | null => {
      if (b.type === 'peaking') return { gain: clamp(dbv, -24, 24) };
      if (b.type === 'lowshelf' || b.type === 'highshelf') return { gain: clamp(dbv * 2, -24, 24) };
      if (isCut(b.type)) return { Q: clamp(dbv / stages(b), QS.cut[0], QS.cut[1]) };
      return null;
    };
    const q = (dir: number, fine: boolean) => {
      if (!hasQ(b.type)) return;
      if (isCut(b.type)) put({ Q: clamp(b.Q + dir * (fine ? 0.1 : 0.5), QS.cut[0], QS.cut[1]) }, 'Q');
      else put({ Q: clamp(b.Q * (dir > 0 ? (fine ? 1.01 : 1.1) : 1 / (fine ? 1.01 : 1.1)), QS.q[0], QS.q[1]) }, 'Q');
    };
    return {
      id: key,
      label: bandName(b, i),
      x: fxFreq(b.frequency),
      y: (clamp(bandY(b), -R, R) + R) / (2 * R),
      text: `${bandName(b, i)} ${bandText(locale, b)}`,
      now: b.frequency,
      min: F_MIN,
      max: F_MAX,
      color: colorOf(b.color, i),
      off: !b.on,
      setX: (fx) => put({ frequency: clamp(freqFx(fx), F_MIN, F_MAX) }, 'frequency'),
      setY: (fy) => {
        const patch = yParam(fy * 2 * R - R);
        if (patch) put(patch, Object.keys(patch)[0]);
      },
      keyX: (dir, fine) =>
        put({ frequency: clamp(b.frequency * 2 ** ((dir * (fine ? 0.1 : 1)) / 12), F_MIN, F_MAX) }, 'frequency'),
      keyY: (dir, fine) => {
        const patch = yParam(bandY(b) + dir * (fine ? 0.1 : 0.5));
        if (patch) put(patch, Object.keys(patch)[0]);
      },
      keyQ: q,
    };
  });
}

// -- drawing -------------------------------------------------------

const X = (fx: number): string => r1(fx * 1000);
const Y = (fy: number): string => r1((1 - fy) * 1000);
const line = (pts: [number, number][]): string =>
  pts.length ? `M${pts.map(([x, y]) => `${X(x)} ${Y(y)}`).join('L')}` : '';
/** the paths of the curve: its stroke (per stage for an ADSR), its fill, the grid, a reference line */
function paths(el: HTMLElement): {
  grid: string;
  major: string;
  ref: string;
  fill: string;
  ghost: string;
  curve: string;
  stages: Record<string, string>;
  bands: { d: string; color: string; off: boolean }[];
  labels: string;
} {
  const rt = runtimeOf(el);
  const v = rt.view;
  const out = {
    grid: '',
    major: '',
    ref: '',
    fill: '',
    ghost: '',
    curve: '',
    stages: {} as Record<string, string>,
    bands: [] as { d: string; color: string; off: boolean }[],
    labels: '',
  };
  const label = (axis: 'x' | 'y', at: number, text: string) =>
    `<span class="envelope-tick" data-axis="${axis}" style="--envelope-${axis}: ${Math.round(at * 10000) / 10000}">${esc(text)}</span>`;
  if (rt.kind === 'adsr') {
    const p = rt.params as Adsr;
    const gate = gateAt(p, v);
    for (const y of [0.25, 0.5, 0.75]) out.grid += `M0 ${Y(y)}H1000`;
    const at = (t: number) => levelAt(p, t, gate).value;
    const bounds: Record<string, [number, number]> = {};
    let t0 = 0;
    for (const s of STAGES) {
      const len =
        s === 'delay'
          ? (p.delay ?? 0)
          : s === 'hold'
            ? (p.hold ?? 0)
            : s === 'sustain'
              ? v.sustainWidth
              : s === 'release'
                ? p.release
                : (p[s] as number);
      bounds[s] = [t0, t0 + len];
      t0 += len;
    }
    const all: [number, number][] = [];
    for (const s of STAGES) {
      const [a, b] = bounds[s];
      if (b - a <= 0) {
        out.stages[s] = '';
        continue;
      }
      const bent = s === 'attack' || s === 'decay' || s === 'release';
      const n = bent ? 48 : 1;
      const pts: [number, number][] = [];
      for (let i = 0; i <= n; i++) {
        const t = a + ((b - a) * i) / n;
        // the end of a stage is the start of the next: the level just inside it
        const value = i === n && s !== 'release' ? at(b - 1e-9) : s === 'release' && i === n ? 0 : at(t);
        pts.push([t / v.T, value]);
      }
      out.stages[s] = line(pts);
      all.push(...pts);
    }
    out.curve = line(all);
    if (all.length) out.fill = `${line(all)}L${X(all[all.length - 1][0])} 1000L0 1000Z`;
    return out;
  }
  if (rt.kind === 'dynamics') {
    const p = rt.params as EnvelopeDynamics;
    const span = -v.floor;
    const fy = (db: number) => (db - v.floor) / span;
    const step = span > 48 ? 12 : 6;
    for (let db = -step; db > v.floor; db -= step) {
      out.grid += `M${X(fy(db))} 0V1000M0 ${Y(fy(db))}H1000`;
      out.labels += label('x', fy(db), String(db)) + label('y', fy(db), String(db));
    }
    out.ref = `M0 1000L1000 0M${X(fy(p.threshold))} 0V1000`;
    const pts: [number, number][] = [];
    for (let i = 0; i <= 160; i++) {
      const x = v.floor + (span * i) / 160;
      pts.push([fy(x), clamp(fy(staticCurve(p, x) + p.makeup), -0.05, 1.05)]);
    }
    out.curve = line(pts);
    out.fill = `${line(pts)}L1000 1000L0 1000Z`;
    return out;
  }
  const R = v.range;
  const fy = (db: number) => (clamp(db, -R * 1.2, R * 1.2) + R) / (2 * R);
  for (let dec = 10; dec <= 10000; dec *= 10)
    for (let m = 1; m <= 9; m++) {
      const f = dec * m;
      if (f < F_MIN || f > F_MAX) continue;
      const path = `M${X(fxFreq(f))} 0V1000`;
      if (m === 1) out.major += path;
      else out.grid += path;
    }
  for (const f of [50, 100, 200, 500, 1000, 2000, 5000, 10000])
    out.labels += label('x', fxFreq(f), f >= 1000 ? `${f / 1000}k` : String(f));
  const dbStep = R >= 18 ? 6 : 3;
  for (let db = dbStep; db < R; db += dbStep) out.grid += `M0 ${Y(fy(db))}H1000M0 ${Y(fy(-db))}H1000`;
  for (let db = dbStep * 2; db < R; db += dbStep * 2)
    out.labels += label('y', fy(db), `+${db}`) + label('y', fy(-db), `-${db}`);
  out.ref = `M0 ${Y(fy(0))}H1000`;
  const at = frequencies();
  const bands = (rt.params as { bands: Band[] }).bands;
  const xs = Array.from(at, fxFreq);
  const sum = (list: Band[]) => {
    const total = new Float32Array(at.length);
    for (const b of list) {
      if (!b.on) continue;
      const db = bandDb(b, at);
      for (let i = 0; i < at.length; i++) total[i] += db[i];
    }
    return total;
  };
  bands.forEach((b, i) => {
    const db = bandDb(b, at);
    out.bands.push({ d: line(xs.map((x, j) => [x, fy(db[j])])), color: colorOf(b.color, i), off: !b.on });
  });
  const total = sum(bands.map((b, i) => liveBand(rt, b, i)));
  const pts: [number, number][] = xs.map((x, j) => [x, fy(total[j])]);
  out.curve = line(pts);
  out.fill = `${line(pts)}L1000 ${Y(fy(0))}L0 ${Y(fy(0))}Z`;
  if (rt.mod.size) out.ghost = line(xs.map((x, j) => [x, fy(sum(bands)[j])]));
  return out;
}

/** Draw the curve: the paths, the labels, the handles (kept by id - a drag and the focus stay on them), the phases. */
function draw(el: HTMLElement): void {
  const rt = runtimeOf(el);
  if (!rt.frozen) rt.view = viewOf(el, rt.params, rt.kind);
  const d = paths(el);
  const svg = dfDollar(rt.svg);
  const put = (sel: string, value: string) => {
    const path = svg.find(sel).get(0);
    if (path && path.getAttribute('d') !== value) dfDollar(path).attr('d', value || null);
  };
  put('.envelope-grid', d.grid);
  put('.envelope-grid-major', d.major);
  put('.envelope-ref', d.ref);
  put('.envelope-fill', d.fill);
  put('.envelope-ghost', d.ghost);
  put('.envelope-curve', d.curve);
  for (const s of STAGES) put(`.envelope-stage[data-stage="${s}"]`, d.stages[s] ?? '');
  // the bands' own curves: one path each
  const bandPaths = svg.find('.envelope-band-curve').toArray() as unknown as SVGPathElement[];
  if (bandPaths.length !== d.bands.length) {
    for (const p of bandPaths) p.remove();
    const markup = d.bands.map(() => '<path class="envelope-band-curve"></path>').join('');
    if (markup) {
      const made = dfDollar(`<svg>${markup}</svg>`).children().toArray() as Element[];
      const ref = svg.find('.envelope-fill').get(0);
      for (const p of made) ref?.before(p);
    }
  }
  (svg.find('.envelope-band-curve').toArray() as unknown as SVGPathElement[]).forEach((p, i) => {
    const b = d.bands[i];
    if (p.getAttribute('d') !== b.d) dfDollar(p).attr('d', b.d);
    p.style.setProperty('--envelope-band-color', b.color);
    dfDollar(p).attr('data-off', b.off ? '' : null);
  });
  const labels = dfDollar(rt.plot).find<HTMLElement>('.envelope-ticks');
  if (labels.html() !== d.labels) labels.html(d.labels);
  drawHandles(el);
  drawPhases(el);
  const text = summary(el);
  if (dfDollar(rt.desc).text() !== text) dfDollar(rt.desc).text(text);
}

function drawHandles(el: HTMLElement): void {
  const rt = runtimeOf(el);
  const box = dfDollar(rt.plot).find<HTMLElement>('.envelope-handles');
  const readonly = el.hasAttribute('data-readonly');
  const list = readonly ? [] : handlesOf(el);
  const disabled = rt.status === 'disabled';
  const have = new Map(
    (box.children<HTMLElement>('.envelope-handle').toArray() as HTMLElement[]).map((h) => [
      h.getAttribute('data-handle') ?? '',
      h,
    ]),
  );
  for (const [id, h] of have) if (!list.some((x) => x.id === id)) h.remove();
  for (const h of list) {
    let node = have.get(h.id);
    if (!node) {
      node = dfDollar(`<span class="envelope-handle" role="slider" data-handle="${esc(h.id)}"></span>`).get(
        0,
      ) as HTMLElement;
      box.append(node);
    }
    const n = dfDollar(node);
    const attrs: Record<string, string | null> = {
      tabindex: disabled ? '-1' : '0',
      'aria-label': h.label,
      'aria-valuemin': String(h.min),
      'aria-valuemax': String(h.max),
      'aria-valuenow': String(tidy(h.now)),
      'aria-valuetext': h.text,
      'aria-disabled': disabled ? 'true' : null,
      'data-bend': h.id.endsWith('Curve') ? '' : null,
      'data-off': h.off ? '' : null,
      'data-active': rt.drag?.handle === h.id || (rt.status === 'editing' && rt.editHandle === h.id) ? '' : null,
    };
    for (const [k, val] of Object.entries(attrs)) if (node.getAttribute(k) !== val) n.attr(k, val);
    node.style.setProperty('--envelope-x', String(Math.round(h.x * 10000) / 10000));
    node.style.setProperty('--envelope-y', String(Math.round(h.y * 10000) / 10000));
    if (h.color) node.style.setProperty('--envelope-handle-color', h.color);
  }
}

/** the ADSR's phase strip: one span per stage, as wide as its stage */
function drawPhases(el: HTMLElement): void {
  const rt = runtimeOf(el);
  const strip = dfDollar(rt.graph).find<HTMLElement>('.envelope-phases');
  if (!strip.length) return;
  if (rt.kind !== 'adsr') {
    if (strip.html()) strip.html('');
    return;
  }
  const p = rt.params as Adsr;
  const v = rt.view;
  let t0 = 0;
  let markup = '';
  for (const s of STAGES) {
    const len = s === 'delay' ? p.delay : s === 'hold' ? p.hold : s === 'sustain' ? v.sustainWidth : (p[s] as number);
    if (len === undefined) continue;
    const from = t0 / v.T;
    t0 += len;
    markup += `<span class="envelope-phase" data-phase="${s}" style="--envelope-from: ${Math.round(from * 10000) / 10000}; --envelope-to: ${Math.round((t0 / v.T) * 10000) / 10000}" title="${STAGE_NAMES[s]}">${PHASE_MARKS[s]}</span>`;
  }
  if (strip.html() !== markup) strip.html(markup);
  showPhase(el, rt.play?.phase ?? rt.live?.phase ?? 'idle');
}

/** the active phase drawn: its stage's stroke and its chip */
function showPhase(el: HTMLElement, phase: string): void {
  const rt = runtimeOf(el);
  const active = rt.status === 'playing' && phase !== 'idle' ? phase : null;
  if (rt.graph.getAttribute('data-phase') !== active) dfDollar(rt.graph).attr('data-phase', active);
  for (const node of dfDollar(rt.graph).find<Element>('.envelope-stage, .envelope-phase').toArray() as Element[]) {
    const on = (node.getAttribute('data-stage') ?? node.getAttribute('data-phase')) === active;
    if (node.hasAttribute('data-active') !== on) dfDollar(node).attr('data-active', on ? '' : null);
  }
}

/** the live point: an ADSR's level on its time, a compressor's level in and out; the meter of the reduction */
function showDot(el: HTMLElement, x: number | null, y = 0): void {
  const rt = runtimeOf(el);
  const dot = dfDollar(rt.plot).find<HTMLElement>('.envelope-dot').get(0);
  const head = dfDollar(rt.plot).find<HTMLElement>('.envelope-playhead').get(0);
  for (const n of [dot, head]) {
    if (!n) continue;
    if (x === null) {
      if (!n.hidden) n.hidden = true;
      continue;
    }
    n.hidden = false;
    n.style.setProperty('--envelope-x', String(Math.round(clamp(x, 0, 1) * 10000) / 10000));
    n.style.setProperty('--envelope-y', String(Math.round(clamp(y, 0, 1) * 10000) / 10000));
  }
}

// -- bound controls and outputs ------------------------------------

/** the elements of an envelope matching a selector: inside it, or bound to it by data-envelope-for */
function boundOf(el: HTMLElement, sel: string): HTMLElement[] {
  const out = dfDollar(el).find<HTMLElement>(sel).toArray() as HTMLElement[];
  if (el.id)
    for (const bound of dfDollar(`[data-envelope-for="${CSS.escape(el.id)}"]`).toArray() as HTMLElement[]) {
      if (bound.matches(sel)) out.push(bound);
      out.push(...(dfDollar(bound).find<HTMLElement>(sel).toArray() as HTMLElement[]));
    }
  return out;
}
/** the envelope a control or an output belongs to */
function ownerOf(node: Element): HTMLElement | undefined {
  const forId = node.closest('[data-envelope-for]')?.getAttribute('data-envelope-for');
  const el = forId ? dfDollar(`#${CSS.escape(forId)}`).get(0) : node.closest('.envelope');
  return (el as HTMLElement | undefined)?._envelope ? (el as HTMLElement) : undefined;
}
/** a bound parameter's value: "attack", "threshold", "low.gain" (a band by id or number) */
function paramValue(rt: Runtime, name: string): number | string | boolean | undefined {
  if (rt.kind !== 'filter') return (rt.params as unknown as Record<string, number>)[name];
  const [band, key] = name.split('.');
  const bands = (rt.params as { bands: Band[] }).bands;
  const b = bands.find((x, i) => keyOf(x, i) === band);
  return b ? (b as unknown as Record<string, number | string | boolean>)[key] : undefined;
}
function paramPatch(rt: Runtime, name: string, value: unknown): Record<string, unknown> | null {
  if (rt.kind !== 'filter')
    return name in (rt.params as object) || name === 'delay' || name === 'hold' ? { [name]: value } : null;
  const [band, key] = name.split('.');
  const bands = (rt.params as { bands: Band[] }).bands;
  const i = bands.findIndex((x, j) => keyOf(x, j) === band);
  if (i < 0 || !key) return null;
  return { bands: bands.map((b, j) => (j === i ? { ...b, [key]: value } : b)) };
}
/** a control's value: a checkbox's checked, a select's option (a number when it is one), an input's number */
const fieldValue = (field: HTMLInputElement | HTMLSelectElement): boolean | string | number =>
  field instanceof HTMLInputElement && field.type === 'checkbox'
    ? field.checked
    : field.tagName === 'SELECT' && Number.isNaN(Number(field.value))
      ? field.value
      : Number(field.value);
const fieldOf = (ctl: Element): HTMLInputElement | HTMLSelectElement | null =>
  ctl.matches('input, select')
    ? (ctl as HTMLInputElement)
    : (dfDollar(ctl).find<HTMLInputElement>('input, select').get(0) ?? null);

/** the bound controls show the parameters (all but the one a change came from) */
function syncControls(el: HTMLElement, except?: Element | null): void {
  const rt = runtimeOf(el);
  rt.writing = true;
  try {
    for (const ctl of boundOf(el, '[data-envelope-param]')) {
      if (ctl === except || (except && ctl.contains(except))) continue;
      const value = paramValue(rt, ctl.getAttribute('data-envelope-param') ?? '');
      if (value === undefined) continue;
      const field = fieldOf(ctl);
      if (!field) continue;
      if (field instanceof HTMLInputElement && field.type === 'checkbox') {
        if (field.checked !== !!value) {
          field.checked = !!value;
          field.dispatchEvent(new Event('input', { bubbles: true }));
        }
        continue;
      }
      if (field.value === String(value)) continue;
      const knob = ctl.closest('.knob');
      if (knob && df$.knob) df$.knob.value(knob as HTMLElement, Number(value));
      else {
        field.value = String(value);
        field.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  } finally {
    rt.writing = false;
  }
}

/** the outputs: the live value, the phase, a compressor's gain reduction */
function writeOutputs(el: HTMLElement): void {
  const rt = runtimeOf(el);
  const locale = textLocale(el);
  for (const out of boundOf(el, '[data-envelope-output]')) {
    const what = out.getAttribute('data-envelope-output');
    let text = '';
    if (what === 'phase')
      text = STAGE_NAMES[rt.play?.phase ?? rt.live?.phase ?? ''] ?? (rt.status === 'playing' ? '' : '');
    else if (what === 'reduction') text = rt.live ? dbText(locale, -rt.live.gr) : dbText(locale, 0);
    else if (what === 'value')
      text =
        rt.kind === 'adsr'
          ? pctText(locale, rt.play?.value ?? 0)
          : rt.live?.input != null
            ? dbText(locale, rt.live.input - rt.live.gr + (rt.params as EnvelopeDynamics).makeup)
            : '';
    if (dfDollar(out).text() !== text) dfDollar(out).text(text);
  }
  for (const btn of boundOf(el, '[data-envelope-action="gate"]')) {
    const on = String(!!rt.play && rt.play.gateOff === null);
    if (btn.getAttribute('aria-pressed') !== on) dfDollar(btn).attr('aria-pressed', on);
  }
}

// -- changes -------------------------------------------------------

/** the source's text for parameters: the authored text while they are the authored ones */
const sourceText = (json: string, authored: { text: string; json: string }): string =>
  json === authored.json ? authored.text : json;

/** Change parameters: the curve drawn again, the bound controls and the chains follow, envelope-change told; a
 *  committed change is written into the source. */
function set(
  el: HTMLElement,
  patch: Record<string, unknown>,
  handle: string | null,
  committed = !runtimeOf(el).drag,
  from: Element | null = null,
): void {
  const rt = runtimeOf(el);
  const next = paramsOf(rt.kind, { ...(rt.params as object), ...patch }, rt.params);
  const changed = JSON.stringify(next) !== JSON.stringify(rt.params);
  rt.params = next;
  if (changed) {
    draw(el);
    syncControls(el, from);
    for (const c of rt.chains) tune(el, c);
  }
  if (committed) writeSource(el);
  if (!changed && !committed) return;
  // Fires when the parameters change - while a drag goes on (committed: false) and when a change is done.
  el.dispatchEvent(
    new CustomEvent<EnvelopeChangeDetail>('envelope-change', {
      bubbles: true,
      detail: { params: clone(rt.params) as EnvelopeParams, handle, committed },
    }),
  );
}
function writeSource(el: HTMLElement): void {
  const rt = runtimeOf(el);
  const script = dfDollar(el).children<HTMLScriptElement>('script.envelope-source');
  if (!script.length) return;
  const text = sourceText(JSON.stringify(rt.params), rt.authored);
  if (script.text() !== text) script.text(text);
}

// -- playback ------------------------------------------------------

function tick(el: HTMLElement): void {
  const rt = runtimeOf(el);
  rt.frame = 0;
  const play = rt.play;
  if (!play || !el.isConnected) return;
  const p = rt.params as Adsr;
  const t = (performance.now() - play.start) / 1000;
  if (play.gateLen !== null && play.gateOff === null && t >= play.gateLen) play.gateOff = play.gateLen;
  const { value, phase } = levelAt(p, t, play.gateOff, play.v0);
  play.value = value;
  if (phase === 'idle') {
    finish(el);
    return;
  }
  const v = rt.view;
  const s0 = sustainStart(p);
  const x =
    play.gateOff !== null ? gateAt(p, v) + (t - play.gateOff) : t < s0 ? t : s0 + Math.min(t - s0, v.sustainWidth);
  showDot(el, x / v.T, value);
  if (phase !== play.phase) {
    play.phase = phase;
    showPhase(el, phase);
    told(el, 'envelope-phase', { value, phase, time: t });
  }
  writeOutputs(el);
  told(el, 'envelope-value', { value, phase, time: t });
  rt.frame = requestAnimationFrame(() => tick(el));
}
function told(el: HTMLElement, type: 'envelope-phase' | 'envelope-value', detail: EnvelopeValueDetail): void {
  if (type === 'envelope-phase')
    // Fires when the phase changes - an ADSR's stage, a compressor's attack or release - and with idle when playback ends.
    el.dispatchEvent(new CustomEvent<EnvelopeValueDetail>('envelope-phase', { bubbles: true, detail }));
  // Fires on every frame of a playing ADSR and with every level a compressor gets - drive other components from it.
  else el.dispatchEvent(new CustomEvent<EnvelopeValueDetail>('envelope-value', { bubbles: true, detail }));
}
/** Open the gate: an ADSR starts its attack from the level it is at (null: until noteOff). */
function noteOn(el: HTMLElement, gate: number | null): void {
  const rt = runtimeOf(el);
  if (rt.kind !== 'adsr' || rt.status === 'disabled') return;
  const v0 = rt.play?.value ?? 0;
  rt.play = { start: performance.now(), gateOff: null, gateLen: gate, v0, phase: '', value: v0 };
  if (rt.status !== 'playing') {
    rt.status = 'playing';
    dfDollar(el).attr('data-state-name', 'playing');
  }
  if (!rt.frame) rt.frame = requestAnimationFrame(() => tick(el));
  writeOutputs(el);
}
function noteOff(el: HTMLElement): void {
  const rt = runtimeOf(el);
  const play = rt.play;
  if (!play || play.gateOff !== null) return;
  play.gateOff = (performance.now() - play.start) / 1000;
  writeOutputs(el);
}
/** playback ended (or stopped): idle, the live point gone, the state back to default */
function finish(el: HTMLElement): void {
  const rt = runtimeOf(el);
  if (rt.frame) cancelAnimationFrame(rt.frame);
  rt.frame = 0;
  const had = !!rt.play || !!rt.live || rt.mod.size > 0;
  rt.play = null;
  rt.live = null;
  dfDollar(rt.graph).find<HTMLElement>('.envelope-meter').get(0)?.style.removeProperty('--envelope-reduction');
  if (rt.mod.size) {
    rt.mod.clear();
    draw(el);
    for (const c of rt.chains) tune(el, c);
  }
  showDot(el, null);
  if (rt.status === 'playing') {
    rt.status = 'default';
    dfDollar(el).attr('data-state-name', 'default');
  }
  showPhase(el, 'idle');
  writeOutputs(el);
  if (had) told(el, 'envelope-phase', { value: 0, phase: 'idle', time: 0 });
}

/** a compressor gets a level: the reduction follows it at the attack and release times */
function feed(el: HTMLElement, db: number, time: number, reduction?: number): number {
  const rt = runtimeOf(el);
  const p = rt.params as EnvelopeDynamics;
  const x = clamp(db, -120, 24);
  const target = Math.max(0, x - staticCurve(p, x));
  const live = rt.live ?? { gr: 0, input: null, at: time, phase: 'idle', quiet: 0 };
  const before = live.gr;
  if (reduction !== undefined) live.gr = Math.max(0, reduction);
  else {
    const dt = Math.max(0, time - live.at);
    const tau = target > live.gr ? p.attack : p.release;
    live.gr = target + (live.gr - target) * (tau > 0 ? Math.exp(-dt / tau) : 0);
  }
  live.input = x;
  live.at = time;
  const phase =
    live.gr > before + 1e-3
      ? 'attack'
      : live.gr < before - 1e-3
        ? 'release'
        : live.gr < 0.05
          ? 'idle'
          : live.phase === 'idle'
            ? 'attack'
            : live.phase;
  rt.live = live;
  if (rt.status !== 'playing' && rt.status !== 'disabled') {
    rt.status = 'playing';
    dfDollar(el).attr('data-state-name', 'playing');
  }
  const v = rt.view;
  const output = x - live.gr + p.makeup;
  showDot(el, (x - v.floor) / -v.floor, (output - v.floor) / -v.floor);
  const meter = dfDollar(rt.graph).find<HTMLElement>('.envelope-meter').get(0);
  meter?.style.setProperty('--envelope-reduction', String(Math.round(clamp(live.gr / 24, 0, 1) * 10000) / 10000));
  if (phase !== live.phase) {
    live.phase = phase;
    showPhase(el, phase);
    told(el, 'envelope-phase', { value: live.gr, phase, time, input: x, output });
  }
  writeOutputs(el);
  told(el, 'envelope-value', { value: live.gr, phase, time, input: x, output });
  return live.gr;
}

// -- Web Audio -----------------------------------------------------

/** a chain follows the curve: the filters' parameters (rebuilt when the bands' types or slopes change), the
 *  compressor's */
function tune(el: HTMLElement, c: Chain): void {
  const rt = runtimeOf(el);
  if (rt.kind === 'dynamics') {
    const p = rt.params as EnvelopeDynamics;
    if (!c.comp || !c.makeup) return;
    c.comp.threshold.value = p.threshold;
    c.comp.ratio.value = Math.min(20, p.ratio);
    c.comp.knee.value = Math.min(40, p.knee);
    c.comp.attack.value = p.attack;
    c.comp.release.value = Math.min(1, p.release);
    c.makeup.gain.value = 10 ** (p.makeup / 20);
    return;
  }
  const bands = (rt.params as { bands: Band[] }).bands.map((b, i) => liveBand(rt, b, i)).filter((b) => b.on);
  const shapeKey = bands.map((b) => `${b.type}/${stages(b)}`).join(',');
  if (shapeKey !== c.shape) {
    c.input.disconnect();
    for (const n of c.nodes) n.disconnect();
    c.nodes = [];
    for (const b of bands)
      for (let i = 0; i < stages(b); i++) {
        const f = c.ctx.createBiquadFilter();
        f.type = b.type;
        c.nodes.push(f);
      }
    let prev: AudioNode = c.input;
    for (const n of c.nodes) {
      prev.connect(n);
      prev = n;
    }
    prev.connect(c.output);
    c.shape = shapeKey;
  }
  let k = 0;
  for (const b of bands)
    for (let i = 0; i < stages(b); i++) {
      const f = c.nodes[k++] as BiquadFilterNode;
      f.frequency.value = b.frequency;
      f.Q.value = b.Q;
      f.gain.value = b.gain;
    }
}
/** while a compressor chain runs, its input level and its reduction are shown */
function follow(el: HTMLElement, c: Chain): void {
  c.frame = 0;
  const rt = runtimeOf(el);
  if (!c.analyser || !c.comp || !rt.chains.includes(c) || !el.isConnected) return;
  if (c.ctx instanceof AudioContext && c.ctx.state === 'running') {
    const data = new Float32Array(c.analyser.fftSize);
    c.analyser.getFloatTimeDomainData(data);
    let peak = 0;
    for (const s of data) peak = Math.max(peak, Math.abs(s));
    const db = peak > 0 ? 20 * Math.log10(peak) : -120;
    if (db > rt.view.floor) feed(el, db, c.ctx.currentTime, -c.comp.reduction);
    else if (rt.live && c.ctx.currentTime - rt.live.at > 0.3) finish(el);
  }
  c.frame = requestAnimationFrame(() => follow(el, c));
}

/** the markup of a state: disabled is aria-disabled; parameters a setState names are written into the source */
function applyMarkup(el: Element, stateName: string, config: EnvelopeConfig = {}): void {
  const disabled = stateName === 'disabled' ? 'true' : null;
  if (el.getAttribute('aria-disabled') !== disabled) dfDollar(el).attr('aria-disabled', disabled);
  const script = dfDollar(el).children<HTMLScriptElement>('script.envelope-source');
  if (!config.params || !script.length) return;
  const rt = (el as HTMLElement)._envelope as Runtime | undefined;
  const kind = kindOf(el);
  let authoredRaw: unknown = null;
  const authoredText = rt?.authored.text ?? script.text();
  try {
    authoredRaw = JSON.parse(authoredText || 'null');
  } catch {
    authoredRaw = null;
  }
  const authored = paramsOf(kind, authoredRaw);
  const json = JSON.stringify(paramsOf(kind, config.params, rt?.params ?? authored));
  const text = sourceText(json, { text: authoredText, json: JSON.stringify(authored) });
  if (script.text() !== text) script.text(text);
}

/** UI side of setState: the state's markup, then the parameters, playback and the edited handle. */
function triggerStateChange(el: HTMLElement, stateName: string, incoming: EnvelopeConfig): void {
  const rt = runtimeOf(el);
  if (!rt) {
    applyMarkup(el, stateName, incoming);
    return;
  }
  const was = rt.status;
  if (incoming.params) set(el, incoming.params as Record<string, unknown>, null, true);
  applyMarkup(el, stateName, { params: rt.params as EnvelopeParams });
  if (stateName !== 'editing' && rt.drag) endDrag(el, false, false);
  rt.status = stateName;
  rt.editHandle = stateName === 'editing' ? (incoming.handle ?? rt.drag?.handle ?? rt.editHandle) : null;
  if (stateName === 'playing') {
    if (was !== 'playing' && rt.kind === 'adsr')
      noteOn(
        el,
        incoming.gate !== undefined && Number.isFinite(Number(incoming.gate))
          ? Math.max(0, Number(incoming.gate))
          : null,
      );
  } else if (was === 'playing') finish(el);
  rt.status = stateName;
  draw(el);
  writeOutputs(el);
}

/** Registry-level API; pass the .envelope element explicitly. Unknown names throw. */
export const envelopeApi = componentState({
  component: 'envelope',
  states: envelopeStates,
  // the config is the parameters: a state change keeps them unless it names others
  mergeConfig: true,
  apply: (el, state, _previous, incoming) => triggerStateChange(el, state.name, incoming as EnvelopeConfig),
  // a drag, a bound control and the end of a release change it without setState
  read: (el, state) => {
    const rt = runtimeOf(el);
    if (!rt) return state;
    const c = state.config as EnvelopeConfig;
    const params = rt.params as EnvelopeParams;
    const handle = rt.status === 'editing' ? (rt.drag?.handle ?? rt.editHandle ?? undefined) : undefined;
    if (
      rt.status === state.name &&
      JSON.stringify(c.params) === JSON.stringify(params) &&
      c.handle === handle &&
      c.gate === undefined
    )
      return state;
    const config: EnvelopeConfig = { params: clone(params as Params) as EnvelopeParams };
    if (handle) config.handle = handle;
    return { name: rt.status, config: config as Record<string, unknown> };
  },
  markup: (el, state) => applyMarkup(el, state.name, state.config as EnvelopeConfig),
  events: ['envelope-change', 'envelope-phase'],
});

df$.envelopeApi = envelopeApi;
df$.envelopeStates = envelopeStates;

// -- pointer and keys ----------------------------------------------

function onPointerDown(el: HTMLElement, e: PointerEvent): void {
  const rt = runtimeOf(el);
  const node = (e.target as Element).closest?.<HTMLElement>('.envelope-handle');
  if (!rt || !node || rt.status === 'disabled' || e.button !== 0) return;
  e.preventDefault();
  node.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
  const id = node.getAttribute('data-handle') ?? '';
  rt.pressed = { id, at: performance.now() };
  // Ctrl / Cmd + click: the handle's parameters back to the authored ones
  if (e.ctrlKey || e.metaKey) {
    resetHandle(el, id);
    return;
  }
  const h = handlesOf(el).find((x) => x.id === id);
  if (!h) return;
  rt.frozen = true;
  rt.drag = {
    id: e.pointerId,
    handle: id,
    x: e.clientX,
    y: e.clientY,
    fx: h.x,
    fy: h.y,
    start: JSON.stringify(rt.params),
  };
  try {
    rt.plot.setPointerCapture(e.pointerId);
  } catch {
    /* a synthetic pointer: no capture */
  }
  if (rt.status !== 'playing') el.api?.setState('editing', { handle: id });
  else drawHandles(el);
}
function onPointerMove(el: HTMLElement, e: PointerEvent): void {
  const rt = runtimeOf(el);
  const d = rt?.drag;
  if (!d || e.pointerId !== d.id) return;
  const box = rt.plot.getBoundingClientRect();
  const f = e.shiftKey ? 0.1 : 1;
  d.fx += ((e.clientX - d.x) / Math.max(1, box.width)) * f;
  d.fy -= ((e.clientY - d.y) / Math.max(1, box.height)) * f;
  d.x = e.clientX;
  d.y = e.clientY;
  const h = handlesOf(el).find((x) => x.id === d.handle);
  h?.setX?.(Math.max(0, d.fx));
  // the handle list is rebuilt for the second axis: setX may have moved its other parameters
  handlesOf(el)
    .find((x) => x.id === d.handle)
    ?.setY?.(clamp(d.fy, 0, 1));
}
/** End a drag: committed where it is, or (cancel: Escape) back where it started. */
function endDrag(el: HTMLElement, cancel: boolean, rest = true): void {
  const rt = runtimeOf(el);
  const d = rt.drag;
  if (!d) return;
  rt.drag = null;
  try {
    if (rt.plot.hasPointerCapture(d.id)) rt.plot.releasePointerCapture(d.id);
  } catch {
    /* already released */
  }
  rt.frozen = false;
  if (cancel) set(el, JSON.parse(d.start), d.handle, true);
  else set(el, {}, d.handle, true);
  draw(el);
  if (rest && rt.status === 'editing') el.api?.setState('default');
}
/** a handle's parameters back to the authored ones */
function resetHandle(el: HTMLElement, id: string): void {
  const rt = runtimeOf(el);
  let authored: Params;
  try {
    authored = paramsOf(rt.kind, JSON.parse(rt.authored.text || 'null'));
  } catch {
    authored = paramsOf(rt.kind, null);
  }
  if (rt.kind === 'filter') {
    const bands = (rt.params as { bands: Band[] }).bands;
    const i = bands.findIndex((b, j) => keyOf(b, j) === id);
    const was = (authored as { bands: Band[] }).bands.find((b, j) => keyOf(b, j) === id);
    if (i >= 0 && was) set(el, { bands: bands.map((b, j) => (j === i ? was : b)) }, id, true);
    return;
  }
  const a = authored as unknown as Record<string, number>;
  const keys: Record<string, string[]> = { decay: ['decay', 'sustain'], threshold: ['threshold', 'knee'] };
  const patch: Record<string, number> = {};
  for (const k of keys[id] ?? [id]) if (a[k] !== undefined) patch[k] = a[k];
  set(el, patch, id, true);
}

/** The keys of a handle: Left / Right its time or frequency, Up / Down its level, gain, resonance or bend (Shift
 *  finer), Page Up / Down a band's Q, Delete the authored value, Escape ends a drag where it started. */
function onKey(el: HTMLElement, e: KeyboardEvent): void {
  const rt = runtimeOf(el);
  const node = (e.target as Element).closest?.<HTMLElement>('.envelope-handle');
  if (!rt || !node || rt.status === 'disabled' || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'Escape') {
    if (!rt.drag) return;
    e.preventDefault();
    endDrag(el, true);
    return;
  }
  const id = node.getAttribute('data-handle') ?? '';
  const h = handlesOf(el).find((x) => x.id === id);
  if (!h) return;
  const fine = e.shiftKey;
  const run: Record<string, (() => void) | undefined> = {
    ArrowRight: h.keyX && (() => h.keyX!(1, fine)),
    ArrowLeft: h.keyX && (() => h.keyX!(-1, fine)),
    ArrowUp: h.keyY && (() => h.keyY!(1, fine)),
    ArrowDown: h.keyY && (() => h.keyY!(-1, fine)),
    PageUp: h.keyQ && (() => h.keyQ!(1, fine)),
    PageDown: h.keyQ && (() => h.keyQ!(-1, fine)),
    Delete: () => resetHandle(el, id),
    Backspace: () => resetHandle(el, id),
  };
  const fn = run[e.key];
  if (!fn) return;
  e.preventDefault();
  fn();
}

// -- init ----------------------------------------------------------

const GRAPH = `<div class="envelope-graph"><div class="envelope-plot"><svg class="envelope-svg" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="envelope-grid"></path><path class="envelope-grid-major"></path><path class="envelope-ref"></path><path class="envelope-fill"></path><path class="envelope-ghost"></path><path class="envelope-curve"></path>${STAGES.map((s) => `<path class="envelope-stage" data-stage="${s}"></path>`).join('')}</svg><div class="envelope-ticks" aria-hidden="true"></div><span class="envelope-playhead" hidden></span><span class="envelope-dot" hidden></span><div class="envelope-handles"></div></div><span class="envelope-meter" aria-hidden="true"></span><div class="envelope-phases" aria-hidden="true"></div></div>`;

function init() {
  dfDollar('.envelope:not([data-init])')
    .toArray()
    .forEach((el: HTMLElement) => {
      el.dataset.init = '';
      const kind = kindOf(el);
      const script = dfDollar(el).children<HTMLScriptElement>('script.envelope-source');
      const text = script.length ? script.text() : '';
      let raw: unknown = null;
      try {
        raw = JSON.parse(text || 'null');
      } catch {
        raw = null;
      }
      const params = paramsOf(kind, raw);
      const graph = dfDollar(GRAPH).get(0) as HTMLElement;
      if (script.length) script.after(graph);
      else dfDollar(el).prepend(graph);
      const desc = dfDollar(`<span class="envelope-desc" id="envelope-desc-${++described}" hidden></span>`).get(
        0,
      ) as HTMLElement;
      dfDollar(graph).after(desc);
      if (!el.hasAttribute('role')) dfDollar(el).attr('role', 'group');
      const by = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
      dfDollar(el).attr('aria-describedby', [...by, desc.id].join(' '));
      const rt: Runtime = {
        kind,
        params,
        authored: { text, json: JSON.stringify(params) },
        status: el.getAttribute('aria-disabled') === 'true' ? 'disabled' : 'default',
        graph,
        plot: dfDollar(graph).find<HTMLElement>('.envelope-plot').get(0)!,
        svg: dfDollar(graph).find<SVGSVGElement>('svg').get(0)!,
        view: viewOf(el, params, kind),
        frozen: false,
        drag: null,
        play: null,
        live: null,
        mod: new Map(),
        chains: [],
        frame: 0,
        writing: false,
        desc,
        editHandle: null,
        pressed: null,
      };
      el._envelope = rt;
      draw(el);
      syncControls(el);
      writeOutputs(el);
      // el.store + el.api (AGENTS.md "State through stores"): $('#amp').api.setState('playing', { gate: 0.5 })
      bindComponent(el, envelopeApi, { name: rt.status, config: { params: clone(params) } });

      dfDollar(rt.plot).on('pointerdown', (e: PointerEvent) => onPointerDown(el, e));
      dfDollar(rt.plot).on('pointermove', (e: PointerEvent) => onPointerMove(el, e));
      dfDollar(rt.plot).on('pointerup', () => endDrag(el, false));
      dfDollar(rt.plot).on('pointercancel', () => endDrag(el, false));
      dfDollar(rt.plot).on('lostpointercapture', () => endDrag(el, false));
      dfDollar(rt.plot).on('dblclick', (e: MouseEvent) => {
        const node = (e.target as Element).closest?.('.envelope-handle');
        const id =
          node?.getAttribute('data-handle') ??
          (rt.pressed && performance.now() - rt.pressed.at < 800 ? rt.pressed.id : null);
        if (id && rt.status !== 'disabled') resetHandle(el, id);
      });
      dfDollar(rt.plot).on('keydown', (e: KeyboardEvent) => onKey(el, e));
      // the wheel over a band's handle: its Q (resonance for a cut)
      dfDollar(rt.plot).on('wheel', (e: WheelEvent) => {
        const node = (e.target as Element).closest?.('.envelope-handle');
        if (!node || rt.status === 'disabled' || rt.kind !== 'filter') return;
        const h = handlesOf(el).find((x) => x.id === node.getAttribute('data-handle'));
        if (!h?.keyQ) return;
        e.preventDefault();
        h.keyQ(e.deltaY < 0 ? 1 : -1, e.shiftKey);
      });
      // another range, length or locale: the same curve drawn again
      new MutationObserver(() => draw(el)).observe(el, {
        attributes: true,
        attributeFilter: ['data-range', 'data-length', 'data-readonly', 'lang'],
      });
    });
}

// bound controls and actions: one listener each on the document (they may sit anywhere, and come and go)
if (!document.__envelopeInit) {
  document.__envelopeInit = true;
  document.addEventListener('input', (e) => {
    const node = e.target as Element;
    const ctl = node.closest?.('[data-envelope-param]');
    if (!ctl) return;
    const el = ownerOf(ctl);
    const rt = el && runtimeOf(el);
    if (!el || !rt || rt.writing || rt.status === 'disabled') return;
    const field = fieldOf(ctl);
    if (!field) return;
    const name = ctl.getAttribute('data-envelope-param') ?? '';
    const patch = paramPatch(rt, name, fieldValue(field));
    if (patch) set(el, patch, name, true, ctl);
  });
  const action = (e: Event): { el: HTMLElement; btn: Element; name: string } | null => {
    const btn = (e.target as Element).closest?.('[data-envelope-action]');
    const el = btn && ownerOf(btn);
    return btn && el ? { el, btn, name: btn.getAttribute('data-envelope-action') ?? '' } : null;
  };
  // the gate is held: pointer down opens it, up (or leaving) closes it; Space and Enter the same
  document.addEventListener('pointerdown', (e) => {
    const a = action(e);
    if (!a || a.name !== 'gate' || e.button !== 0) return;
    e.preventDefault();
    (a.btn as HTMLElement).focus?.({ preventScroll: true, focusVisible: false } as FocusOptions);
    noteOn(a.el, null);
    const up = () => {
      noteOff(a.el);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
    };
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  });
  document.addEventListener('keydown', (e) => {
    const a = action(e);
    if (!a || a.name !== 'gate' || (e.key !== ' ' && e.key !== 'Enter')) return;
    e.preventDefault();
    if (!e.repeat) noteOn(a.el, null);
  });
  document.addEventListener('keyup', (e) => {
    const a = action(e);
    if (!a || a.name !== 'gate' || (e.key !== ' ' && e.key !== 'Enter')) return;
    e.preventDefault();
    noteOff(a.el);
  });
  // a form reset puts the bound controls back without an input event (after the reset event): read them again
  // a form reset puts the bound controls back without an input event (after the reset event): read them all again,
  // then set them - a set syncs the other controls, so none is read after another was written
  document.addEventListener('reset', (e) => {
    const form = e.target as HTMLFormElement;
    setTimeout(() => {
      const reads = (dfDollar(form).find<HTMLElement>('[data-envelope-param]').toArray() as HTMLElement[]).map(
        (ctl) => {
          const field = fieldOf(ctl);
          return {
            el: ownerOf(ctl),
            name: ctl.getAttribute('data-envelope-param') ?? '',
            value: field && fieldValue(field),
          };
        },
      );
      for (const { el, name, value } of reads) {
        if (!el || value === null) continue;
        const patch = paramPatch(runtimeOf(el), name, value);
        if (patch) set(el, patch, name, true);
      }
    });
  });
  document.addEventListener('click', (e) => {
    const a = action(e);
    if (!a) return;
    const rt = runtimeOf(a.el);
    if (a.name === 'trigger') {
      const gate = num(a.btn.getAttribute('data-value'), NaN);
      noteOn(a.el, Number.isFinite(gate) ? gate : sustainStart(rt.params as Adsr) + 0.25);
    } else if (a.name === 'stop') finish(a.el);
    else if (a.name === 'reset') set(a.el, JSON.parse(rt.authored.json), null, true);
  });
}

/** the envelope of a target: the .envelope element or a selector of it */
const resolve = (target: string | HTMLElement): HTMLElement | undefined => {
  const el = typeof target === 'string' ? dfDollar(target).get(0) : target;
  const env = el?.closest?.<HTMLElement>('.envelope');
  return env?._envelope ? env : undefined;
};

df$.envelope = {
  /**
   * The parameters, or change some of them (the others stay; each on its range).
   * @param target - the .envelope element or a selector of it
   * @param params - the parameters to change; leave it out to read
   * @returns a copy of the parameters now; null for an unknown element
   */
  params: (
    target: string | HTMLElement,
    params?: Partial<EnvelopeAdsr> | Partial<EnvelopeDynamics> | EnvelopeFilter,
  ): EnvelopeParams | null => {
    const el = resolve(target);
    if (!el) return null;
    if (params) set(el, params as Record<string, unknown>, null, true);
    return clone(runtimeOf(el).params) as EnvelopeParams;
  },
  /**
   * Open an ADSR's gate: the attack starts from the level it is at, the sustain holds until noteOff().
   * @param target - the .envelope element or a selector of it
   */
  noteOn: (target: string | HTMLElement): void => {
    const el = resolve(target);
    if (el) noteOn(el, null);
  },
  /**
   * Close the gate: the release runs from the level it is at, then playback ends.
   * @param target - the .envelope element or a selector of it
   */
  noteOff: (target: string | HTMLElement): void => {
    const el = resolve(target);
    if (el) noteOff(el);
  },
  /**
   * Play an ADSR with a gate of a length.
   * @param target - the .envelope element or a selector of it
   * @param gate - the gate's length in seconds; default until the sustain is reached and a quarter second more
   */
  trigger: (target: string | HTMLElement, gate?: number): void => {
    const el = resolve(target);
    if (!el) return;
    const p = runtimeOf(el).params as Adsr;
    noteOn(el, gate !== undefined && Number.isFinite(gate) ? Math.max(0, gate) : sustainStart(p) + 0.25);
  },
  /**
   * Stop playback now - no release; a compressor's level and a filter's modulation are cleared too.
   * @param target - the .envelope element or a selector of it
   */
  stop: (target: string | HTMLElement): void => {
    const el = resolve(target);
    if (el) finish(el);
  },
  /**
   * An ADSR's level and phase at a time - what playback shows and schedule() writes.
   * @param target - the .envelope element or a selector of it
   * @param time - seconds after the gate opened
   * @param gate - the gate's length in seconds; leave it out for a gate still open
   * @returns the level (0 to 1) and the phase (delay, attack, hold, decay, sustain, release or idle)
   */
  valueAt: (target: string | HTMLElement, time: number, gate?: number): { value: number; phase: string } => {
    const el = resolve(target);
    if (!el || runtimeOf(el).kind !== 'adsr') return { value: 0, phase: 'idle' };
    return levelAt(runtimeOf(el).params as Adsr, time, gate ?? null);
  },
  /**
   * Write an ADSR into a Web Audio parameter: the attack, decay and sustain from the start, the release after the
   * gate - sampled curves (setValueCurveAtTime), so the bends are kept.
   * @param target - the .envelope element or a selector of it
   * @param param - the AudioParam to drive (a GainNode's gain, a filter's frequency)
   * @param options - when the gate opens and how long it stays, and the parameter's range
   * @returns the context time the release ends
   */
  schedule: (target: string | HTMLElement, param: AudioParam, options: EnvelopeScheduleOptions = {}): number => {
    const el = resolve(target);
    if (!el || runtimeOf(el).kind !== 'adsr' || !param) return NaN;
    const p = runtimeOf(el).params as Adsr;
    const start = num(options.start, 0);
    const gate = Math.max(0, num(options.gate, sustainStart(p) + 0.25));
    const min = num(options.min, 0);
    const max = num(options.max, 1);
    const map = (v: number) =>
      options.scale === 'exponential' && min > 0 && max > 0 ? min * (max / min) ** v : min + (max - min) * v;
    const write = (from: number, length: number) => {
      if (length <= 0) return;
      const n = Math.max(2, Math.ceil(length * 200));
      const curve = new Float32Array(n);
      for (let i = 0; i < n; i++) curve[i] = map(levelAt(p, from + (length * i) / (n - 1), gate).value);
      param.setValueCurveAtTime(curve, start + from, length);
    };
    param.cancelScheduledValues(start);
    param.setValueAtTime(map(0), start);
    write(0, gate);
    write(gate, p.release);
    param.setValueAtTime(map(0), start + gate + p.release);
    return start + gate + p.release;
  },
  /**
   * A compressor gets a level: its reduction follows at the attack and release times, the curve shows the level in
   * and out and the meter the reduction. null ends it.
   * @param target - the .envelope element or a selector of it
   * @param level - the level going in, in dB; null: no more levels (back to default)
   * @param time - the level's time in seconds; default now - give it for levels that are not live
   * @returns the gain reduction in dB (0 or more)
   */
  input: (target: string | HTMLElement, level: number | null, time?: number): number => {
    const el = resolve(target);
    if (!el || runtimeOf(el).kind !== 'dynamics') return 0;
    if (level === null || !Number.isFinite(Number(level))) {
      finish(el);
      return 0;
    }
    if (runtimeOf(el).status === 'disabled') return 0;
    return feed(el, Number(level), time !== undefined && Number.isFinite(time) ? time : performance.now() / 1000);
  },
  /**
   * A compressor's curve: the level coming out for a level going in (the makeup included, no attack or release).
   * @param target - the .envelope element or a selector of it
   * @param level - the level going in, in dB
   * @returns the level coming out, in dB; NaN for an element that is no compressor
   */
  transfer: (target: string | HTMLElement, level: number): number => {
    const el = resolve(target);
    if (!el || runtimeOf(el).kind !== 'dynamics') return NaN;
    const p = runtimeOf(el).params as EnvelopeDynamics;
    return staticCurve(p, level) + p.makeup;
  },
  /**
   * A filter's live values - the curve shows them over the authored one (dashed) while any is set, the chains
   * follow. Values are absolute: { cutoff: { frequency: 2400 } }.
   * @param target - the .envelope element or a selector of it
   * @param values - by band (id or number from 1): its frequency, gain or Q now, null for none; null: none at all
   */
  modulate: (
    target: string | HTMLElement,
    values: Record<string, Partial<Pick<EnvelopeBand, 'frequency' | 'gain' | 'Q'>> | null> | null,
  ): void => {
    const el = resolve(target);
    if (!el) return;
    const rt = runtimeOf(el);
    if (rt.kind !== 'filter' || rt.status === 'disabled') return;
    if (values === null) rt.mod.clear();
    else
      for (const [key, v] of Object.entries(values ?? {})) {
        if (!v) rt.mod.delete(key);
        else {
          const m: Partial<Pick<Band, 'frequency' | 'gain' | 'Q'>> = {};
          for (const k of ['frequency', 'gain', 'Q'] as const) if (Number.isFinite(Number(v[k]))) m[k] = Number(v[k]);
          rt.mod.set(key, m);
        }
      }
    if (!rt.mod.size) {
      draw(el);
      for (const c of rt.chains) tune(el, c);
      finish(el);
      return;
    }
    if (rt.status !== 'playing') {
      rt.status = 'playing';
      dfDollar(el).attr('data-state-name', 'playing');
    }
    draw(el);
    for (const c of rt.chains) tune(el, c);
  },
  /**
   * A filter's response - the curve drawn, with its live values.
   * @param target - the .envelope element or a selector of it
   * @param frequencies - the frequencies in Hz
   * @returns the level in dB at each frequency (the bands that are on, added)
   */
  response: (target: string | HTMLElement, frequencies: number[]): number[] => {
    const el = resolve(target);
    if (!el || runtimeOf(el).kind !== 'filter') return [];
    const rt = runtimeOf(el);
    const at = Float32Array.from(frequencies ?? []);
    const total: number[] = Array.from({ length: at.length }, () => 0);
    (rt.params as { bands: Band[] }).bands.forEach((b, i) => {
      const live = liveBand(rt, b, i);
      if (!live.on) return;
      const db = bandDb(live, at);
      for (let j = 0; j < at.length; j++) total[j] += db[j];
    });
    return total.map((v) => Math.round(v * 1000) / 1000);
  },
  /**
   * Web Audio nodes that follow the curve: a filter's BiquadFilterNodes in a row (each band, a cut as many times as
   * its slope says), or a compressor's DynamicsCompressorNode and makeup gain - whose input level and live reduction
   * the curve then shows while the context runs. The node's ratio stops at 20, its knee at 40 dB and its release at
   * 1 s, and its knee is the browser's.
   * @param target - the .envelope element or a selector of it
   * @param context - the AudioContext (or OfflineAudioContext) to make the nodes in
   * @returns the chain's input and output, the compressor, and disconnect(); null for an ADSR or an unknown element
   */
  connect: (target: string | HTMLElement, context: BaseAudioContext): EnvelopeChain | null => {
    const el = resolve(target);
    if (!el || !context) return null;
    const rt = runtimeOf(el);
    if (rt.kind === 'adsr') return null;
    const c: Chain = {
      ctx: context,
      input: context.createGain(),
      output: context.createGain(),
      nodes: [],
      shape: '',
      comp: null,
      analyser: null,
      makeup: null,
      frame: 0,
    };
    if (rt.kind === 'dynamics') {
      c.analyser = context.createAnalyser();
      c.analyser.fftSize = 1024;
      c.comp = context.createDynamicsCompressor();
      c.makeup = context.createGain();
      c.input.connect(c.analyser);
      c.analyser.connect(c.comp);
      c.comp.connect(c.makeup);
      c.makeup.connect(c.output);
      c.nodes = [c.analyser, c.comp, c.makeup];
    }
    rt.chains.push(c);
    tune(el, c);
    if (c.comp) c.frame = requestAnimationFrame(() => follow(el, c));
    return {
      input: c.input,
      output: c.output,
      compressor: c.comp,
      disconnect: () => {
        rt.chains = rt.chains.filter((x) => x !== c);
        if (c.frame) cancelAnimationFrame(c.frame);
        c.input.disconnect();
        for (const n of c.nodes) n.disconnect();
        c.output.disconnect();
      },
    };
  },
};

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
