// -- Media Timeline --------------------------------------------
// A timeline rendered from a JSON of timeline metadata (tracks of regions, markers and spans) that drives a video
// or an audio: its playhead follows the media's time, a click, a drag or a key on it moves the media, a captions
// track becomes the media's text track, and the items under the playhead fill an info outlet anywhere on the page.
// New data re-renders it with the playhead where it is. Transferred from the archivar-poc timeline
// (plans/feat-timeline/, the maintainer's handoff): its typed audio regions, scenes and (higher-order) aggregations
// are tracks of one shape here, its colours come from the theme, its 20 px/s scale is a zoom (fit by default).
// Beyond the handoff: annotation rows above the track they name (for), several ruler rows (scales), a loop region
// dragged on the ruler, and timed events for an outlet - none of them a row on the timeline.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import {
  defussGlobals,
  defussQuery,
  componentState,
  bindComponent,
  bindGlobalKeys,
  mediaOf,
  mediaTextTracks,
  mediaTime,
  textLocale,
} from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

const mediaTimelineStates = ['default', 'playing'];

/** The config both states take - every key optional; only the keys passed are applied. */
export interface MediaTimelineConfig {
  /** the playhead's time, seconds - the controlled media seeks there; getState() reports the live time */
  time?: number;
  /** the scale in pixels per second; 0 fits the whole length into the width */
  zoom?: number;
  /** the timeline metadata - new data re-renders the timeline, the playhead stays */
  data?: MediaTimelineData;
  /** the loop region playback stays inside, null for none - a drag on the ruler makes one */
  loop?: MediaTimelineLoop | null;
}

/** A loop region. */
export interface MediaTimelineLoop {
  /** where it starts, seconds */
  start: number;
  /** where it ends, seconds */
  end: number;
}

// VERIFIED: (verify's API docs gate) the states below are exactly the declared ones, each
// described, and every config field typed, described and named in the code.
/** setState() configs per state. */
export interface MediaTimelineStateConfigs {
  /** The media is paused (without media: the timeline's own clock stands) - the playhead stands. */
  default: MediaTimelineConfig;
  /** The media plays and the playhead moves with it (without media: the timeline's own clock runs to the end of the length, then lands in default). A browser may refuse to start sound without a click (autoplay rules) - the state then stays default. */
  playing: MediaTimelineConfig;
}

/** The timeline metadata (version 1). */
export interface MediaTimelineData {
  /** the format version - 1 */
  version: number;
  /** the length in seconds; default: the media's, else the end of the last item */
  duration?: number;
  /** the rows, top to bottom - a row with for sits above the row it names */
  tracks: MediaTimelineTrack[];
  /** the ruler's rows, coarsest first; default: one ruler that picks its own interval */
  scales?: MediaTimelineScale[];
  /** moments with a text and no row of their own - an events outlet lists them */
  events?: MediaTimelineEvent[];
}

/** One row of the timeline. */
export interface MediaTimelineTrack {
  /** unique in the data - events, the info outlet, a for and the captions key name it */
  id: string;
  /** the row's label; default: the id */
  label?: string;
  /** regions (default: start + end), video / audio (the clips of a picture or a sound track - what for names), markers (one time each), or a text row whose items the media shows: subtitles and captions (what is heard), descriptions (what is seen) */
  kind?: 'regions' | 'video' | 'audio' | 'markers' | 'subtitles' | 'captions' | 'descriptions';
  /** the id of the track this row annotates: it renders directly above it, rows naming one track in data order */
  for?: string;
  /** the default colour of its items: chart-1 ... chart-5, primary, secondary, accent, muted, destructive, or a CSS colour */
  color?: string;
  /** the row's background: a theme colour name or a CSS colour */
  background?: string;
  /** a text row's language (BCP 47, "en") */
  lang?: string;
  /** a text row shown first when the media shows no other text yet */
  default?: boolean;
  /** what the row shows */
  items: MediaTimelineItem[];
}

/** One row of the ruler. */
export interface MediaTimelineScale {
  /** its unit: hours, minutes, seconds or frames */
  unit: 'h' | 'min' | 's' | 'frame';
  /** minor ticks per unit (10 on seconds: tenths) - drawn while they stand 4px apart */
  divisions?: number;
  /** frames per second of a frame row (default 25) */
  fps?: number;
  /** the row's label in the label column */
  label?: string;
}

/** A moment of the recording an events outlet lists. */
export interface MediaTimelineEvent {
  /** when, seconds */
  time: number;
  /** what happens */
  text: string;
}

/** One region, marker or span of a track. */
export interface MediaTimelineItem {
  /** unique in the data - a span names items by it; default: "<track id>-<index>" */
  id?: string;
  /** a region's start, seconds */
  start?: number;
  /** a region's end, seconds */
  end?: number;
  /** a marker's time, seconds */
  time?: number;
  /** the ids of other items: this region runs from the earliest start to the latest end among them */
  span?: string[];
  /** the text on the item (a caption's words: text) */
  label?: string;
  /** a caption's words */
  text?: string;
  /** the item's colour - a theme colour name or a CSS colour; default: its track's */
  color?: string;
  /** what the info outlet shows while the playhead is inside the item */
  info?: MediaTimelineInfo;
}

/** What an info outlet shows for an item. */
export interface MediaTimelineInfo {
  /** the card's title; default: the item's label */
  title?: string;
  /** a paragraph */
  text?: string;
  /** name → value pairs, shown as a list */
  fields?: Record<string, string | number>;
}

/** An item under the playhead. */
export interface MediaTimelineActive {
  /** its track's id */
  track: string;
  /** its id */
  item: string;
  /** its label */
  label: string;
  /** where it starts, seconds */
  start: number;
  /** where it ends, seconds */
  end: number;
}

/** What media-timeline-change carries. */
export interface MediaTimelineChangeDetail {
  /** the playhead's time, seconds */
  time: number;
  /** the items under the playhead, in track order */
  active: MediaTimelineActive[];
}

/** What media-timeline-loop carries. */
export interface MediaTimelineLoopDetail {
  /** the loop region now, null when it was cleared */
  loop: MediaTimelineLoop | null;
}

const COLORS = [
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'primary',
  'secondary',
  'accent',
  'muted',
  'destructive',
];
/** [label interval, tick interval] in seconds, finest first - the first whose labels stand 56px apart is used */
const SCALES: [number, number][] = [
  [0.5, 0.1],
  [1, 0.25],
  [2, 0.5],
  [5, 1],
  [10, 2],
  [15, 5],
  [30, 5],
  [60, 10],
  [120, 30],
  [300, 60],
  [600, 120],
  [900, 300],
  [1800, 300],
  [3600, 600],
  [7200, 1800],
];
const MAX_ZOOM = 400;
/** the kinds whose items are text the media shows (its text tracks) */
const TEXT_KINDS = ['subtitles', 'captions', 'descriptions'];
/** seconds per unit of a scale row */
const UNIT_SECONDS: Record<string, number> = { h: 3600, min: 60, s: 1 };
/** Intl's unit names for a scale row's labels */
const UNIT_NAMES: Record<string, string> = { h: 'hour', min: 'minute', s: 'second' };
/** a scale row's label intervals, in its units - the first whose labels stand 40px apart is used */
const STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600];
/** the label intervals of a row under one of per of its units: the divisors of per, then multiples of it - so its
 *  labels restart with every unit of the row above (frames 0, 5, 10, 15, 20 under seconds at 25 fps) */
const stepsFor = (per: number): number[] =>
  per > 1
    ? [...Array.from({ length: per }, (_, i) => i + 1).filter((n) => per % n === 0), ...STEPS.map((n) => n * per)]
    : STEPS;
/** a loop shorter than this is a click */
const MIN_LOOP = 0.1;

/** a colour as the markup carries it: a theme name (data-color) or a checked CSS colour (an inline variable) */
type Color = { name: string; css: string };
/** an item placed on the timeline */
type Placed = {
  id: string;
  track: string;
  label: string;
  start: number;
  end: number;
  marker: boolean;
  lane: number;
  color: Color;
  info?: MediaTimelineInfo;
};
/** a track placed on the timeline: for = the row it annotates (rendered above it), background its tint */
type Row = {
  id: string;
  label: string;
  kind: string;
  for: string;
  background: Color;
  lanes: number;
  items: Placed[];
};

/** per-element runtime (state lives on the element) */
type Runtime = {
  data: MediaTimelineData;
  rows: Row[];
  duration: number;
  zoom: number;
  time: number;
  media: HTMLMediaElement | null;
  active: string;
  anim?: Animation;
  animFrom?: { time: number; rate: number };
  /** without media, while it plays: when the clock started (performance.now()) and from which time */
  clock?: { at: number; from: number };
  /** which run of the clock the pending tick belongs to (a stop and a new start end the old ticks) */
  clockRun?: number;
  /** the loop region playback stays inside */
  loop: MediaTimelineLoop | null;
  /** while a drag on the ruler draws a loop: where it started, and the region so far */
  drawing?: { from: number; x: number; loop: MediaTimelineLoop | null };
  /** the last press was on the ruler (a captured pointer's click and dblclick target the scroll box) */
  onRuler?: boolean;
  /** the pending return to the loop's start */
  loopTimer?: ReturnType<typeof setTimeout>;
  /** the event an events outlet marks as current (its index, -1 for none) */
  current: number;
  report: () => void;
};

const num = (v: unknown, fallback: number): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
};
const esc = (s: unknown): string =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
const pct = (t: number, d: number): string => `${d > 0 ? Math.round((t / d) * 1e6) / 1e4 : 0}%`;
const runtimeOf = (el: HTMLElement): Runtime => el._timeline;

/** a colour from the data: a theme name, else any colour CSS accepts, else the fallback */
function colorOf(value: unknown, fallback: Color): Color {
  const v = String(value ?? '').trim();
  if (COLORS.includes(v)) return { name: v, css: '' };
  if (v && !/[;{}<>"]/.test(v) && globalThis.CSS?.supports?.('color', v)) return { name: '', css: v };
  return fallback;
}
/** a colour as attributes: data-color for a theme name, the inline variable for a CSS colour */
const colorAttr = (c: Color, variable = '--media-timeline-color'): { attr: string; style: string } =>
  c.name
    ? { attr: ` data-color="${c.name}"`, style: '' }
    : c.css
      ? { attr: '', style: ` ${variable}: ${esc(c.css)};` }
      : { attr: '', style: '' };

/** two loops are the same region */
const sameLoop = (a: MediaTimelineLoop | null, b: MediaTimelineLoop | null): boolean =>
  a === b || (!!a && !!b && a.start === b.start && a.end === b.end);

/** a loop region that holds: start before end, both inside the length (when it is known) */
function loopOf(raw: unknown, d: number): MediaTimelineLoop | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as MediaTimelineLoop;
  const end = d > 0 ? d : Infinity;
  const a = Math.min(end, Math.max(0, num(r.start, NaN)));
  const b = Math.min(end, Math.max(0, num(r.end, NaN)));
  if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(b - a) < MIN_LOOP) return null;
  return { start: Math.min(a, b), end: Math.max(a, b) };
}

/** the data as a plain, versioned copy - anything else reads as an empty timeline */
function dataOf(raw: unknown): MediaTimelineData {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as MediaTimelineData).tracks))
    return { version: 1, tracks: [] };
  try {
    return { version: 1, ...(JSON.parse(JSON.stringify(raw)) as MediaTimelineData) };
  } catch {
    return { version: 1, tracks: [] };
  }
}

/** Place every item: ids, times (a span from the items it names), colours, and lanes so regions of a track never
 *  overlap (greedy, by start). Pure. */
function place(data: MediaTimelineData): Row[] {
  const known = new Map<string, { start: number; end: number }>();
  const tracks = data.tracks.filter((t) => t && Array.isArray(t.items));
  const idOf = (t: MediaTimelineTrack, i: number, item: MediaTimelineItem) => String(item.id ?? `${t.id}-${i}`);
  // times first; a span may name another span, so resolve them in a few rounds
  tracks.forEach((t) =>
    t.items.forEach((item, i) => {
      const marker = t.kind === 'markers' || (item.time !== undefined && item.end === undefined);
      const start = num(marker ? (item.time ?? item.start) : item.start, NaN);
      const end = marker ? start : num(item.end, NaN);
      if (Number.isFinite(start) && Number.isFinite(end) && end >= start) known.set(idOf(t, i, item), { start, end });
    }),
  );
  for (let round = 0; round < 4; round++)
    tracks.forEach((t) =>
      t.items.forEach((item, i) => {
        if (!Array.isArray(item.span) || known.has(idOf(t, i, item))) return;
        const parts = item.span.map((id) => known.get(String(id))).filter(Boolean) as { start: number; end: number }[];
        if (parts.length && parts.length === item.span.length)
          known.set(idOf(t, i, item), {
            start: Math.min(...parts.map((p) => p.start)),
            end: Math.max(...parts.map((p) => p.end)),
          });
      }),
    );
  const rows = tracks.map((t, ti) => {
    const fallback = colorOf(t.color, { name: `chart-${(ti % 5) + 1}`, css: '' });
    const items: Placed[] = [];
    t.items.forEach((item, i) => {
      const id = idOf(t, i, item);
      const at = known.get(id);
      if (!at) return;
      items.push({
        id,
        track: String(t.id),
        label: String(item.label ?? item.text ?? ''),
        start: at.start,
        end: at.end,
        marker: at.end === at.start,
        lane: 0,
        color: colorOf(item.color, fallback),
        info: item.info,
      });
    });
    const lanes: number[] = [];
    for (const p of [...items].filter((x) => !x.marker).sort((a, b) => a.start - b.start)) {
      let lane = lanes.findIndex((end) => end <= p.start);
      if (lane < 0) lane = lanes.length;
      lanes[lane] = p.end;
      p.lane = lane;
    }
    return {
      id: String(t.id),
      label: String(t.label ?? t.id),
      kind: String(t.kind ?? 'regions'),
      for: t.for == null ? '' : String(t.for),
      background: colorOf(t.background, { name: '', css: '' }),
      lanes: Math.max(1, lanes.length),
      items,
    };
  });
  return grouped(rows);
}

/** The rows in their display order: a row with for sits directly above the row it names - rows naming one row in
 *  data order, the first on top; a for that names no other row (or a row that annotates one itself) keeps its
 *  place. Pure. */
function grouped(rows: Row[]): Row[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  /** the row a for leads to: followed through annotation rows to a row that annotates none */
  const target = (r: Row): Row | undefined => {
    let at: Row | undefined = r;
    for (let i = 0; i < rows.length && at?.for; i++) at = byId.get(at.for) === at ? undefined : byId.get(at.for);
    return at && at !== r && !at.for ? at : undefined;
  };
  const out: Row[] = [];
  for (const r of rows) {
    if (target(r)) continue;
    out.push(...rows.filter((a) => target(a) === r), r);
  }
  return out;
}

/** the length the timeline shows: the data's, else the media's, else the last item's end */
function lengthOf(rt: Runtime): number {
  const own = num(rt.data.duration, 0);
  if (own > 0) return own;
  const m = rt.media?.duration;
  if (m && Number.isFinite(m) && m > 0) return m;
  return Math.max(0, ...rt.rows.flatMap((r) => r.items.map((p) => p.end)));
}

/** the playhead's time: the media's, else the timeline's own clock */
const timeOf = (rt: Runtime): number =>
  rt.media
    ? rt.media.currentTime
    : rt.clock
      ? Math.min(rt.duration, rt.clock.from + (performance.now() - rt.clock.at) / 1000)
      : rt.time;
/** the media plays - or, without media, the timeline's own clock runs */
const playingOf = (rt: Runtime): boolean => (rt.media ? !rt.media.paused && !rt.media.ended : !!rt.clock);
/** the playback rate the playhead runs at */
const rateOf = (rt: Runtime): number => (rt.media ? rt.media.playbackRate : 1);

/** the items under a time (regions only - a marker is a moment, never under the playhead) */
function activeAt(rt: Runtime, time: number): MediaTimelineActive[] {
  return rt.rows.flatMap((r) =>
    r.items
      .filter((p) => !p.marker && time >= p.start && time < p.end)
      .map((p) => ({ track: r.id, item: p.id, label: p.label, start: p.start, end: p.end })),
  );
}

/** the parts the runtime keeps across renders */
const part = (el: HTMLElement, name: string): HTMLElement | undefined =>
  dfDollar(el).find<HTMLElement>(`.media-timeline-${name}`).get(0);

/** the controls, readouts and outlets bound to a timeline: inside it, and [data-media-timeline-for="<its id>"] */
function boundOf(el: HTMLElement, sel: string): HTMLElement[] {
  const out = dfDollar(el).find<HTMLElement>(sel).toArray() as HTMLElement[];
  if (el.id)
    for (const bound of dfDollar(`[data-media-timeline-for="${CSS.escape(el.id)}"]`).toArray() as HTMLElement[]) {
      if (bound.matches(sel)) out.push(bound);
      out.push(...(dfDollar(bound).find<HTMLElement>(sel).toArray() as HTMLElement[]));
    }
  return out;
}

/** the content box's width in px: the length times the zoom, else the width it fits */
const widthOf = (el: HTMLElement, rt: Runtime): number =>
  rt.zoom > 0 ? rt.duration * rt.zoom : (part(el, 'scroll')?.clientWidth ?? 0);

/** the ruler's scale for the current width: [label interval, tick interval] */
function scaleOf(el: HTMLElement, rt: Runtime): [number, number] {
  const pxps = rt.duration > 0 ? widthOf(el, rt) / rt.duration : 0;
  return SCALES.find(([label]) => label * pxps >= 56) ?? SCALES[SCALES.length - 1];
}

/** one ruler row as drawn: its label interval and tick interval in seconds, and its labels' text */
type ScaleRow = { major: number; minor: number; label: string; text: (t: number) => string };

/** The ruler's rows: the data's scales (coarsest first), each labelling its unit within the row above it, its labels
 *  thinned to stand 40px apart, its minor ticks drawn while they stand 4px apart - else the one automatic row. */
function scaleRows(el: HTMLElement, rt: Runtime): ScaleRow[] {
  const d = rt.duration;
  const scales = (Array.isArray(rt.data.scales) ? rt.data.scales : []).filter(
    (s) => s && (UNIT_SECONDS[s.unit] || s.unit === 'frame'),
  );
  if (!scales.length) {
    const [major, minor] = scaleOf(el, rt);
    return [{ major, minor, label: '', text: (t) => mediaTime(t, d) }];
  }
  const pxps = d > 0 ? widthOf(el, rt) / d : 0;
  const locale = textLocale(el);
  const secOf = (s: MediaTimelineScale) =>
    s.unit === 'frame' ? 1 / Math.max(1, num(s.fps, 25)) : UNIT_SECONDS[s.unit];
  return scales.map((s, i) => {
    const sec = secOf(s);
    // within the row above: seconds 0-59 under a minutes row, frames 0-24 under a seconds row
    const parent = i > 0 ? secOf(scales[i - 1]) : Infinity;
    const per = Number.isFinite(parent) && parent > sec ? Math.round(parent / sec) : 0;
    const steps = stepsFor(per);
    const k = steps.find((n) => n * sec * pxps >= 40) ?? steps[steps.length - 1];
    const fine = sec / Math.max(1, Math.round(num(s.divisions, 1)));
    const minor = fine * pxps >= 4 ? fine : sec * pxps >= 4 ? sec : k * sec;
    const format = UNIT_NAMES[s.unit]
      ? new Intl.NumberFormat(locale, { style: 'unit', unit: UNIT_NAMES[s.unit], unitDisplay: 'narrow' })
      : new Intl.NumberFormat(locale);
    return {
      major: k * sec,
      minor,
      label: String(s.label ?? ''),
      text: (t: number) => {
        const n = Math.round(t / sec);
        return format.format(per ? n % per : n);
      },
    };
  });
}

/** Render the rows, the ruler and the labels from the placed data (the parts stay: the scroll position, the focus
 *  and a running playhead animation survive a re-render). */
function render(el: HTMLElement): void {
  const rt = runtimeOf(el);
  rt.rows = place(rt.data);
  rt.duration = lengthOf(rt);
  const body = part(el, 'body');
  const content = part(el, 'content');
  if (!body || !content) return;
  dfDollar(body).attr('hidden', rt.duration > 0 ? null : '');
  const d = rt.duration;
  const scales = scaleRows(el, rt);
  const finest = scales[scales.length - 1];
  content.style.setProperty('inline-size', rt.zoom > 0 ? `max(100%, ${Math.round(d * rt.zoom)}px)` : '100%');
  content.style.setProperty('--media-timeline-major', String(d / finest.major));
  content.style.setProperty('--media-timeline-minor', String(d / finest.minor));
  content.style.setProperty('--media-timeline-scales', String(scales.length));
  const ruler = scales
    .map((s) => {
      let ticks = '';
      for (let i = 0; i < 2000 && i * s.major < d - s.major / 4; i++)
        ticks += `<span class="media-timeline-tick" style="left: ${pct(i * s.major, d)}">${esc(s.text(i * s.major))}</span>`;
      return `<div class="media-timeline-scale" style="--media-timeline-major: ${d / s.major}; --media-timeline-minor: ${d / s.minor}">${ticks}</div>`;
    })
    .join('');
  const rows = rt.rows
    .map((r) => {
      const items = r.items
        .filter((p) => p.start < d || (p.marker && p.start === d))
        .map((p) => {
          const span = `${mediaTime(p.start, d)}${p.marker ? '' : ` - ${mediaTime(p.end, d)}`}`;
          const title = esc(p.label ? `${p.label} · ${span}` : span);
          const c = colorAttr(p.color);
          return p.marker
            ? `<div class="media-timeline-marker" data-item="${esc(p.id)}"${c.attr} style="left: ${pct(p.start, d)};${c.style}" title="${title}"><span>${esc(p.label)}</span></div>`
            : `<div class="media-timeline-item" data-item="${esc(p.id)}"${c.attr} style="left: ${pct(p.start, d)}; width: ${pct(Math.min(p.end, d) - p.start, d)}; --lane: ${p.lane};${c.style}" title="${title}"><span>${esc(p.label)}</span></div>`;
        })
        .join('');
      return `<div class="media-timeline-track" data-track="${esc(r.id)}" data-kind="${esc(r.kind)}"${rowAttrs(r)}>${items}</div>`;
    })
    .join('');
  const labels =
    scales.map((s) => `<div class="media-timeline-label" data-ruler>${esc(s.label)}</div>`).join('') +
    rt.rows
      .map((r) => `<div class="media-timeline-label" data-kind="${esc(r.kind)}"${rowAttrs(r)}>${esc(r.label)}</div>`)
      .join('');
  dfDollar(part(el, 'ruler')).html(ruler);
  dfDollar(part(el, 'tracks')).html(rows);
  dfDollar(part(el, 'labels')).html(labels);
  rt.active = '';
  const loop = loopOf(rt.loop, d);
  if (!sameLoop(loop, rt.loop)) rt.loop = loop;
  syncCaptions(el);
  for (const outlet of boundOf(el, '[data-media-timeline-outlet="events"]')) renderEvents(outlet, rt);
  rt.current = -2;
  paint(el, true);
}

/** a row's (and its label's) attributes: what it annotates, its lanes and its background */
function rowAttrs(r: Row): string {
  const bg = r.background.name ? `var(--${r.background.name})` : r.background.css;
  return `${r.for ? ` data-for="${esc(r.for)}"` : ''}${bg ? ' data-background' : ''} style="--lanes: ${r.lanes};${bg ? ` --media-timeline-row: ${esc(bg)};` : ''}"`;
}

/** Text rows (subtitles, captions, descriptions) become keyed text tracks of the media through the media engine -
 *  their cues replaced on every render, a row gone from the data retired. A bare <video> draws the one it shows; a
 *  Video component lists them in its captions menu by their track id. */
function syncCaptions(el: HTMLElement): void {
  const rt = runtimeOf(el);
  const m = rt.media;
  if (!m) return;
  mediaTextTracks(
    m,
    rt.data.tracks
      .filter((t) => TEXT_KINDS.includes(String(t?.kind)) && Array.isArray(t.items))
      .map((t) => ({
        id: String(t.id),
        kind: String(t.kind),
        label: String(t.label ?? t.id),
        lang: String(t.lang ?? ''),
        default: !!t.default,
        items: t.items,
      })),
    el,
  );
}

/** Move the playhead to the current time and, while the media plays, let it run to the end on its own (a Web
 *  Animation - no script per frame, no attribute written per frame). */
function runPlayhead(el: HTMLElement): void {
  const rt = runtimeOf(el);
  const head = part(el, 'playhead');
  if (!head) return;
  rt.anim?.cancel();
  rt.anim = undefined;
  const t = Math.min(rt.duration, timeOf(rt));
  head.style.setProperty('left', pct(t, rt.duration));
  const rate = rateOf(rt);
  // inside a loop the playhead runs to the loop's end, where playback returns to its start
  const to = rt.loop && t < rt.loop.end ? rt.loop.end : rt.duration;
  if (playingOf(rt) && to > t && rate > 0 && typeof head.animate === 'function') {
    rt.animFrom = { time: t, rate };
    rt.anim = head.animate([{ left: pct(t, rt.duration) }, { left: pct(to, rt.duration) }], {
      duration: ((to - t) / rate) * 1000,
      easing: 'linear',
      fill: 'forwards',
    });
  }
  loopWatch(el);
}

/** While a loop is set and playback runs: return to the loop's start at its end - a timer to the moment it is
 *  due (timeupdate comes only a few times a second), re-armed on every playhead run; a time outside the loop
 *  goes to its start at once (playback stays inside the loop). */
function loopWatch(el: HTMLElement): void {
  const rt = runtimeOf(el);
  clearTimeout(rt.loopTimer);
  rt.loopTimer = undefined;
  const loop = rt.loop;
  if (!loop || !playingOf(rt)) return;
  const t = timeOf(rt);
  if (t < loop.start - 0.05 || t >= loop.end - 0.01) {
    seek(el, loop.start);
    return;
  }
  const rate = rateOf(rt) || 1;
  rt.loopTimer = setTimeout(
    () => {
      rt.loopTimer = undefined;
      if (rt.loop && playingOf(rt) && timeOf(rt) >= rt.loop.end - 0.05) seek(el, rt.loop.start);
      else loopWatch(el);
    },
    Math.max(10, ((loop.end - t) / rate) * 1000),
  );
}

/** Paint what follows the time: the playhead (re-run when it drifts), the slider's value, the readouts, the active
 *  items, the info outlets - and keep the playhead in view while it plays. */
function paint(el: HTMLElement, restart = false): void {
  const rt = runtimeOf(el);
  const t = timeOf(rt);
  const d = rt.duration;
  const playing = playingOf(rt);
  const anim = rt.anim;
  const implied = anim && rt.animFrom ? rt.animFrom.time + (num(anim.currentTime, 0) / 1000) * rt.animFrom.rate : NaN;
  if (restart || playing !== !!anim || (playing && Math.abs(implied - t) > 0.2)) runPlayhead(el);
  const scroll = part(el, 'scroll');
  if (scroll) {
    const now = String(Math.floor(t));
    if (dfDollar(scroll).attr('aria-valuenow') !== now || restart) {
      dfDollar(scroll).attr('aria-valuemax', String(Math.floor(d)));
      dfDollar(scroll).attr('aria-valuenow', now);
      dfDollar(scroll).attr('aria-valuetext', `${mediaTime(t, d)} of ${mediaTime(d)}`);
    }
    // follow: a zoomed timeline scrolls to keep the playhead in its middle part
    if (playing && scroll.scrollWidth > scroll.clientWidth && d > 0) {
      const x = (t / d) * scroll.scrollWidth;
      if (x < scroll.scrollLeft || x > scroll.scrollLeft + scroll.clientWidth * 0.85)
        scroll.scrollTo({ left: x - scroll.clientWidth * 0.15, behavior: reduced() ? 'auto' : 'smooth' });
    }
  }
  paintLoop(el);
  // the events outlets mark the latest event at or before the playhead
  const events = eventsOf(rt);
  let current = -1;
  for (let i = 0; i < events.length && events[i].time <= t + 1e-6; i++) current = i;
  if (current !== rt.current) {
    rt.current = current;
    for (const outlet of boundOf(el, '[data-media-timeline-outlet="events"]'))
      dfDollar(outlet)
        .find<HTMLElement>('[data-event]')
        .each((_i, li) => {
          const on = Number(li.getAttribute('data-event')) === current;
          if (li.hasAttribute('aria-current') !== on) dfDollar(li).attr('aria-current', on ? 'true' : null);
        });
  }
  const active = activeAt(rt, t);
  const key = active.map((a) => `${a.track}\n${a.item}`).join('\n\n');
  for (const out of boundOf(el, '[data-media-timeline-output]')) {
    const kind = out.getAttribute('data-media-timeline-output');
    const loop = rt.drawing?.loop ?? rt.loop;
    const text =
      kind === 'duration'
        ? mediaTime(d)
        : kind === 'loop'
          ? loop
            ? `${mediaTime(loop.start, d)} - ${mediaTime(loop.end, d)}`
            : ''
          : kind === 'active'
            ? active
                .map((a) => a.label)
                .filter(Boolean)
                .join(' · ')
            : mediaTime(t, d);
    if (dfDollar(out).text() !== text) dfDollar(out).text(text);
  }
  if (key === rt.active && !restart) return;
  rt.active = key;
  const ids = new Set(active.map((a) => `${a.track}\n${a.item}`));
  dfDollar(el)
    .find<HTMLElement>('.media-timeline-track')
    .each((_i, row) => {
      const track = row.getAttribute('data-track');
      dfDollar(row)
        .find<HTMLElement>('.media-timeline-item')
        .each((_j, item) => {
          const on = ids.has(`${track}\n${item.getAttribute('data-item')}`);
          if (item.hasAttribute('data-active') !== on) dfDollar(item).attr('data-active', on ? '' : null);
        });
    });
  for (const outlet of boundOf(el, '[data-media-timeline-outlet="info"]')) renderInfo(outlet, rt, active);
  // Fires when the items under the playhead change - as it moves, after a seek and after new data.
  el.dispatchEvent(
    new CustomEvent<MediaTimelineChangeDetail>('media-timeline-change', { bubbles: true, detail: { time: t, active } }),
  );
}

const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Place the loop region (the one being drawn, else the one set) over the ruler and the rows; the loop-clear
 *  controls are disabled while there is none. */
function paintLoop(el: HTMLElement): void {
  const rt = runtimeOf(el);
  const box = part(el, 'loop');
  const loop = rt.drawing?.loop ?? rt.loop;
  if (box) {
    const d = rt.duration;
    if (box.hasAttribute('hidden') !== !loop) dfDollar(box).attr('hidden', loop ? null : '');
    if (loop && d > 0) {
      box.style.setProperty('left', pct(loop.start, d));
      box.style.setProperty('width', pct(loop.end - loop.start, d));
    }
  }
  for (const c of boundOf(el, '[data-media-timeline-action="loop-clear"]'))
    if (c.hasAttribute('disabled') !== !rt.loop) dfDollar(c).attr('disabled', rt.loop ? null : '');
}

/** the data's events with a time and a text, in time order */
function eventsOf(rt: Runtime): MediaTimelineEvent[] {
  return (Array.isArray(rt.data.events) ? rt.data.events : [])
    .filter((e) => e && Number.isFinite(num(e.time, NaN)) && String(e.text ?? '') !== '')
    .map((e) => ({ time: num(e.time, 0), text: String(e.text) }))
    .sort((a, b) => a.time - b.time);
}

/** An events outlet: every event as a list item - its time a button that seeks there (and pauses), then its text;
 *  its authored content when the data has none. */
function renderEvents(outlet: HTMLElement, rt: Runtime): void {
  outlet._timelineEmpty ??= dfDollar(outlet).html() ?? '';
  const d = rt.duration;
  const items = eventsOf(rt)
    .map(
      (e, i) =>
        `<li class="media-timeline-event" data-event="${i}"><button type="button" class="media-timeline-event-time" data-media-timeline-action="seek" data-value="${e.time}">${esc(mediaTime(e.time, d))}</button><span>${esc(e.text)}</span></li>`,
    )
    .join('');
  dfDollar(outlet).html(items ? `<ol class="media-timeline-events">${items}</ol>` : outlet._timelineEmpty);
}

/** An info outlet: a Card per item under the playhead that carries info (its authored content when there is none). */
function renderInfo(outlet: HTMLElement, rt: Runtime, active: MediaTimelineActive[]): void {
  outlet._timelineEmpty ??= dfDollar(outlet).html() ?? '';
  const d = rt.duration;
  const cards = active
    .map((a) => {
      const row = rt.rows.find((r) => r.id === a.track);
      const p = row?.items.find((x) => x.id === a.item);
      if (!row || !p?.info) return '';
      const fields = Object.entries(p.info.fields ?? {})
        .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
        .join('');
      return `<article class="card media-timeline-card" data-track="${esc(a.track)}" data-item="${esc(a.item)}" data-color="${p.color}"><div class="card-header"><p class="media-timeline-card-meta"><span>${esc(row.label)}</span><span>${esc(`${mediaTime(p.start, d)} - ${mediaTime(p.end, d)}`)}</span></p><h3 class="card-title">${esc(p.info.title ?? p.label)}</h3>${p.info.text ? `<p class="card-description">${esc(p.info.text)}</p>` : ''}</div>${fields ? `<div class="card-content"><dl class="media-timeline-fields">${fields}</dl></div>` : ''}</article>`;
    })
    .join('');
  dfDollar(outlet).html(cards || outlet._timelineEmpty);
}

/** Seek: the media when there is one, else the timeline's own clock (a running clock goes on from there). */
function seek(el: HTMLElement, time: number): void {
  const rt = runtimeOf(el);
  const t = Math.min(rt.duration || Infinity, Math.max(0, time));
  if (rt.media) {
    if (Math.abs(rt.media.currentTime - t) > 0.001) rt.media.currentTime = t;
  } else {
    rt.time = t;
    if (rt.clock) rt.clock = { at: performance.now(), from: t };
  }
  paint(el, true);
}

/** Without media: start the timeline's own clock (from the start again at the end), or stop it where it is. Ticks
 *  like a media's timeupdate - on a timer, never a frame callback (those stop in a frame scrolled out of view) - and
 *  stops at the end of the length, landing in default. */
function runClock(el: HTMLElement, on: boolean): void {
  const rt = runtimeOf(el);
  if (on === !!rt.clock) return;
  if (!on) {
    rt.time = timeOf(rt);
    rt.clock = undefined;
    paint(el, true);
    return;
  }
  if (rt.time >= rt.duration) rt.time = 0;
  rt.clock = { at: performance.now(), from: rt.time };
  const run = (rt.clockRun = (rt.clockRun ?? 0) + 1);
  paint(el, true);
  const tick = () => {
    if (rt.clockRun !== run || !rt.clock) return;
    if (timeOf(rt) >= rt.duration) {
      rt.time = rt.duration;
      rt.clock = undefined;
      paint(el, true);
    } else {
      paint(el);
      setTimeout(tick, 250);
    }
    rt.report();
  };
  setTimeout(tick, 250);
}

/** Set (or clear) the loop: a new one moves the playhead to its start when it stands outside it (playback stays
 *  inside a loop); the region repaints, the playhead's run is re-planned, media-timeline-loop tells the page. */
function setLoop(el: HTMLElement, loop: MediaTimelineLoop | null): void {
  const rt = runtimeOf(el);
  if (sameLoop(loop, rt.loop)) return;
  rt.loop = loop;
  const t = timeOf(rt);
  if (loop && (t < loop.start || t >= loop.end)) seek(el, loop.start);
  else paint(el, true);
  // Fires when the loop region is set, moved or cleared - by a drag on the ruler, a key, setState or the API.
  el.dispatchEvent(
    new CustomEvent<MediaTimelineLoopDetail>('media-timeline-loop', {
      bubbles: true,
      detail: { loop: loop ? { ...loop } : null },
    }),
  );
}

/** The markup of a state: the zoom as data-zoom, a loop-clear control disabled while there is no loop, and the data
 *  in its script (only when it differs from what the script says - authored formatting stays). The rendered rows
 *  are the runtime's. */
function applyMarkup(el: HTMLElement, _stateName: string, config: MediaTimelineConfig): void {
  const zoom = num(config.zoom, 0);
  dfDollar(el).attr('data-zoom', zoom > 0 ? String(zoom) : null);
  dfDollar(el)
    .find<HTMLElement>('[data-media-timeline-action="loop-clear"]')
    .each((_i, c) => {
      if (c.hasAttribute('disabled') !== !config.loop) dfDollar(c).attr('disabled', config.loop ? null : '');
    });
  const script = dfDollar(el).children<HTMLScriptElement>('script.media-timeline-source');
  if (!config.data || !script.length) return;
  let authored: unknown = null;
  try {
    authored = JSON.parse(script.text() || 'null');
  } catch {
    authored = null;
  }
  if (JSON.stringify(dataOf(authored)) !== JSON.stringify(dataOf(config.data)))
    script.text(JSON.stringify(config.data, null, 2));
}

/** The DOM side of a state: new data and zoom re-render, a time seeks, then the media plays or pauses. */
function triggerStateChange(
  el: HTMLElement,
  stateName: string,
  config: MediaTimelineConfig,
  incoming: Record<string, unknown>,
) {
  const rt = runtimeOf(el);
  applyMarkup(el, stateName, config);
  let again = false;
  if ('data' in incoming && incoming.data !== rt.data) {
    const data = dataOf(incoming.data);
    if (JSON.stringify(data) !== JSON.stringify(rt.data)) {
      rt.data = data;
      again = true;
    }
  }
  if ('zoom' in incoming) {
    const zoom = Math.min(MAX_ZOOM, Math.max(0, num(incoming.zoom, 0)));
    if (zoom !== rt.zoom) {
      rt.zoom = zoom;
      again = true;
    }
  }
  if (again) render(el);
  const m = rt.media;
  // the own clock stops before a seek - it would run on from the new time while it stops
  if (!m && stateName !== 'playing') runClock(el, false);
  if ('time' in incoming) seek(el, num(incoming.time, timeOf(rt)));
  if ('loop' in incoming) setLoop(el, loopOf(incoming.loop, rt.duration));
  if (!m) {
    runClock(el, stateName === 'playing' && rt.duration > 0);
    return undefined;
  }
  if (stateName === 'playing' && m.paused)
    return m.play().then(
      () => undefined,
      () => undefined,
    );
  if (stateName !== 'playing' && !m.paused) m.pause();
  return undefined;
}

/** Registry-level API; pass the .media-timeline element explicitly. Unknown names throw. */
export const mediaTimelineApi = componentState({
  component: 'media-timeline',
  states: mediaTimelineStates,
  // the config is the timeline's settings: a setState names what changes, the rest stays
  mergeConfig: true,
  apply: (el, state, _previous, incoming) => triggerStateChange(el, state.name, state.config, incoming),
  // reflect reality: the media plays, pauses and seeks on its own (its controls, another player's API); the own
  // clock stops at the end
  read: (el, state) => {
    const rt = runtimeOf(el);
    if (!rt) return state;
    const name = playingOf(rt) ? 'playing' : 'default';
    const time = timeOf(rt);
    const c = state.config;
    const loop = rt.loop;
    if (name === state.name && c.time === time && c.zoom === rt.zoom && c.data === rt.data && c.loop === loop)
      return state;
    return { name, config: { ...c, time, zoom: rt.zoom, data: rt.data, loop } };
  },
  markup: (el, state) => applyMarkup(el, state.name, state.config),
});

df$.mediaTimelineApi = mediaTimelineApi;
df$.mediaTimelineStates = mediaTimelineStates;

/** the timeline's media: data-media names a .video / .audio element or a <video> / <audio> */
function attach(el: HTMLElement): void {
  const rt = runtimeOf(el);
  if (rt.media) return;
  const id = el.getAttribute('data-media');
  const target = id ? dfDollar(`#${CSS.escape(id)}`).get(0) : undefined;
  const m = mediaOf(target);
  if (!m) return;
  rt.media = m;
  const changed = (e: Event) => {
    if (e.type === 'loadedmetadata' || e.type === 'durationchange') render(el);
    else if (e.type === 'ended' && rt.loop) {
      // a loop that ends where the media ends: the media stopped, playback goes on at the loop's start
      seek(el, rt.loop.start);
      void m.play().catch(() => undefined);
    } else paint(el, e.type !== 'timeupdate');
    rt.report();
  };
  for (const type of [
    'play',
    'pause',
    'ended',
    'timeupdate',
    'seeked',
    'ratechange',
    'loadedmetadata',
    'durationchange',
    'emptied',
  ])
    m.addEventListener(type, changed);
  render(el);
}

/** the key a slider takes: [seconds to move, or an absolute time] */
function keyStep(e: KeyboardEvent, rt: Runtime, t: number): number | null {
  const step = e.shiftKey ? 5 : 1;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') return t - step;
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') return t + step;
  if (e.key === 'PageDown') return t - 10;
  if (e.key === 'PageUp') return t + 10;
  if (e.key === 'Home') return 0;
  if (e.key === 'End') return rt.duration;
  return null;
}

/** the loop a key asks for: [ starts it at the playhead, ] ends it there (the other end kept, else the start or the
 *  end of the length), Escape clears it; undefined for any other key */
function loopKey(e: KeyboardEvent, rt: Runtime, t: number): MediaTimelineLoop | null | undefined {
  if (e.key === 'Escape') return rt.loop ? null : undefined;
  if (e.key === '[')
    return loopOf({ start: t, end: rt.loop && rt.loop.end > t ? rt.loop.end : rt.duration }, rt.duration);
  if (e.key === ']') return loopOf({ start: rt.loop && rt.loop.start < t ? rt.loop.start : 0, end: t }, rt.duration);
  return undefined;
}

/** what a zoom control asks for: px per second (0 = fit) */
function zoomFor(el: HTMLElement, action: string): number | null {
  const rt = runtimeOf(el);
  const width = part(el, 'scroll')?.clientWidth ?? 0;
  const fit = rt.duration > 0 ? width / rt.duration : 0;
  const now = rt.zoom || fit;
  if (action === 'fit') return 0;
  if (action === 'zoom-in') return Math.min(MAX_ZOOM, now * 1.5);
  if (action === 'zoom-out') return now / 1.5 <= fit * 1.01 ? 0 : now / 1.5;
  return null;
}

const now = (el: HTMLElement): string => (playingOf(runtimeOf(el)) ? 'playing' : 'default');

/** the controls a Space keeps working for themselves (the timeline's own slider excepted) */
const SPACE_CONTROLS =
  'button, a[href], input, select, textarea, summary, video, audio, [contenteditable="true"], [role="button"], [role="slider"], [role="menuitem"], [role="tab"], [role="option"], [role="checkbox"], [role="switch"]';

/** Space plays and pauses: the timeline the key comes from (its slider, or an element bound to it) - unless a control
 *  there takes the key itself -, or, with nothing focused, the timeline playing, else the one used last, else the only
 *  one; while another player plays (a Fretboard, a Video of its own), an idle page's Space is that player's */
function onSpace(e: KeyboardEvent): void | true {
  if (e.key !== ' ' || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
  const target = e.target instanceof Element ? e.target : null;
  const timelines = dfDollar('.media-timeline[data-init]').toArray() as HTMLElement[];
  const inside = target?.closest<HTMLElement>('.media-timeline');
  const bound = target?.closest<HTMLElement>('[data-media-timeline-for]');
  const idle = !target || target === document.body || target === document.documentElement;
  if (!inside && !bound && !idle) return;
  const control = idle ? null : target?.closest(SPACE_CONTROLS);
  if (control && !control.matches('.media-timeline-scroll')) return;
  const playing = timelines.find((t) => t._timeline && playingOf(runtimeOf(t)));
  if (idle && !playing && dfDollar('[data-state-name="playing"]:not(.media-timeline)').length) return;
  const el =
    (inside?._timeline ? inside : null) ??
    (bound ? timelines.find((t) => t.id === bound.getAttribute('data-media-timeline-for')) : null) ??
    playing ??
    [...timelines].filter((t) => t._timelineUsed).sort((a, b) => b._timelineUsed - a._timelineUsed)[0] ??
    (timelines.length === 1 ? timelines[0] : null);
  if (!el?._timeline || !(runtimeOf(el).duration > 0)) return;
  e.preventDefault();
  el.api?.setState(now(el) === 'playing' ? 'default' : 'playing');
  return true;
}

function init() {
  dfDollar('.media-timeline:not([data-init])')
    .toArray()
    .forEach((el: HTMLElement) => {
      el.dataset.init = '';
      let data: unknown = null;
      try {
        data = JSON.parse(dfDollar(el).children('script.media-timeline-source').text() || 'null');
      } catch {
        data = null;
      }
      const rt: Runtime = {
        data: dataOf(data),
        rows: [],
        duration: 0,
        zoom: Math.min(MAX_ZOOM, Math.max(0, num(el.getAttribute('data-zoom'), 0))),
        time: 0,
        media: null,
        active: '',
        loop: null,
        current: -1,
        report: () => mediaTimelineApi.getState(el),
      };
      el._timeline = rt;
      // el.store + el.api (AGENTS.md "State through stores"): $('#my-timeline').api.setState('default', { data })
      bindComponent(el, mediaTimelineApi, {
        name: 'default',
        config: { time: 0, zoom: rt.zoom, data: rt.data, loop: null },
      });
      dfDollar(el).append(
        dfDollar(
          `<div class="media-timeline-body" hidden><div class="media-timeline-labels" aria-hidden="true"></div><div class="media-timeline-scroll" role="slider" tabindex="0" aria-label="${esc(el.getAttribute('data-label') ?? 'Playback position')}" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0"><div class="media-timeline-content"><div class="media-timeline-ruler" aria-hidden="true"></div><div class="media-timeline-tracks" aria-hidden="true"></div><div class="media-timeline-loop" aria-hidden="true" hidden></div><div class="media-timeline-playhead" aria-hidden="true"></div></div></div></div>`,
        ),
      );
      const scroll = part(el, 'scroll')!;
      /** the time under the pointer */
      const timeAt = (e: PointerEvent): number | null => {
        const box = part(el, 'content')?.getBoundingClientRect();
        if (!box || box.width <= 0) return null;
        return Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)) * runtimeOf(el).duration;
      };
      // a press, a drag: the playhead and the media go where the pointer is - a drag on the ruler draws a loop
      dfDollar(scroll).on('pointerdown', (e: PointerEvent) => {
        if (e.button !== 0 || !part(el, 'content')?.contains(e.target as Node)) return;
        const t = timeAt(e);
        if (t === null) return;
        scroll.setPointerCapture?.(e.pointerId);
        scroll.focus({ preventScroll: true });
        const onRuler = !!part(el, 'ruler')?.contains(e.target as Node);
        rt.onRuler = onRuler;
        rt.drawing = onRuler ? { from: t, x: e.clientX, loop: null } : undefined;
        seek(el, t);
      });
      dfDollar(scroll).on('pointermove', (e: PointerEvent) => {
        if (!scroll.hasPointerCapture?.(e.pointerId)) return;
        const t = timeAt(e);
        if (t === null) return;
        if (!rt.drawing) seek(el, t);
        else if (Math.abs(e.clientX - rt.drawing.x) >= 4) {
          rt.drawing.loop = loopOf({ start: rt.drawing.from, end: t }, rt.duration);
          paint(el);
        }
      });
      const drawn = () => {
        const loop = rt.drawing?.loop;
        rt.drawing = undefined;
        if (loop) el.api?.setState(now(el), { loop });
        else paintLoop(el);
      };
      dfDollar(scroll).on('pointerup', drawn);
      dfDollar(scroll).on('pointercancel', drawn);
      // a double click on the ruler clears the loop
      dfDollar(scroll).on('dblclick', () => {
        if (rt.loop && rt.onRuler) el.api?.setState(now(el), { loop: null });
      });
      dfDollar(scroll).on('keydown', (e: KeyboardEvent) => {
        const t = timeOf(rt);
        const loop = loopKey(e, rt, t);
        if (loop !== undefined) {
          e.preventDefault();
          el.api?.setState(now(el), { loop });
          return;
        }
        const next = keyStep(e, rt, t);
        if (next === null) return;
        e.preventDefault();
        el.api?.setState(now(el), { time: next });
      });
      // the timeline used last is the one Space plays on a page with nothing focused
      const used = () => {
        el._timelineUsed = performance.now();
      };
      dfDollar(el).on('pointerdown', used);
      dfDollar(el).on('focusin', used);
      dfDollar(el).on('click', (e: Event) => {
        const control = (e.target as Element).closest<HTMLElement>('[data-media-timeline-action]');
        if (!control || control.closest('.media-timeline') !== el) return;
        onAction(el, control);
      });
      // fitting: the ruler's labels follow the width
      let width = 0;
      new ResizeObserver(() => {
        const w = scroll.clientWidth;
        if (Math.abs(w - width) < 1) return;
        width = w;
        if (runtimeOf(el).zoom === 0) render(el);
      }).observe(scroll);
      attach(el);
      render(el);
    });
  // a timeline whose media came later, controls bound from outside
  dfDollar('.media-timeline[data-init][data-media]')
    .toArray()
    .forEach((el: HTMLElement) => {
      if (el._timeline && !el._timeline.media) attach(el);
    });
}

function onAction(el: HTMLElement, control: HTMLElement): void {
  el._timelineUsed = performance.now();
  const action = control.getAttribute('data-media-timeline-action') ?? '';
  const zoom = zoomFor(el, action);
  if (zoom !== null) el.api?.setState(now(el), { zoom });
  else if (action === 'toggle') el.api?.setState(now(el) === 'playing' ? 'default' : 'playing');
  // a time to go to (an event's time): there, paused - play goes on from there
  else if (action === 'seek') el.api?.setState('default', { time: num(control.getAttribute('data-value'), 0) });
  else if (action === 'loop-clear') el.api?.setState(now(el), { loop: null });
}

// controls bound from outside (data-media-timeline-for): one document listener
if (!document.__mediaTimelineInit) {
  document.__mediaTimelineInit = true;
  bindGlobalKeys(onSpace);
  document.addEventListener('click', (e) => {
    const control = (e.target as Element | null)?.closest?.<HTMLElement>('[data-media-timeline-action]');
    const bound = control?.closest<HTMLElement>('[data-media-timeline-for]');
    if (!control || !bound || bound.closest('.media-timeline')) return;
    const el = dfDollar(`#${CSS.escape(bound.getAttribute('data-media-timeline-for') ?? '')}`).get(0) as
      | HTMLElement
      | undefined;
    if (el?._timeline) onAction(el, control);
  });
}

const resolve = (target: string | HTMLElement): HTMLElement | undefined =>
  typeof target === 'string' ? dfDollar(target).get(0) : target;

df$.mediaTimeline = {
  /**
   * Replace the timeline metadata: the timeline re-renders, the playhead stays where it is (setState with { data }).
   * @param target - the .media-timeline element or its selector
   * @param data - the timeline metadata (version 1)
   */
  load: (target: string | HTMLElement, data: MediaTimelineData): void => {
    const el = resolve(target);
    if (el?._timeline) el.api?.setState(now(el), { data });
  },
  /**
   * The current timeline metadata, as loaded.
   * @param target - the .media-timeline element or its selector
   * @returns a copy of the data; an empty timeline when the element is unknown
   */
  data: (target: string | HTMLElement): MediaTimelineData => {
    const el = resolve(target);
    return el?._timeline ? dataOf(runtimeOf(el).data) : { version: 1, tracks: [] };
  },
  /**
   * Move the playhead - the controlled media seeks with it; playing stays playing.
   * @param target - the .media-timeline element or its selector
   * @param time - seconds from the start
   */
  seek: (target: string | HTMLElement, time: number): void => {
    const el = resolve(target);
    if (el?._timeline) el.api?.setState(now(el), { time });
  },
  /**
   * Set the scale.
   * @param target - the .media-timeline element or its selector
   * @param pxPerSecond - pixels per second; 0 fits the whole length into the width
   */
  zoom: (target: string | HTMLElement, pxPerSecond: number): void => {
    const el = resolve(target);
    if (el?._timeline) el.api?.setState(now(el), { zoom: pxPerSecond });
  },
  /**
   * Set the loop region - playback stays inside it: the playhead goes to its start, its end returns there - or clear
   * it (setState with { loop }).
   * @param target - the .media-timeline element or its selector
   * @param start - where it starts, seconds; null (or nothing) clears the loop
   * @param end - where it ends, seconds; default: the end of the length
   * @returns the loop region now, null when there is none
   */
  loop: (target: string | HTMLElement, start?: number | null, end?: number): MediaTimelineLoop | null => {
    const el = resolve(target);
    if (!el?._timeline) return null;
    const rt = runtimeOf(el);
    el.api?.setState(now(el), { loop: start == null ? null : { start, end: end ?? rt.duration } });
    return rt.loop ? { ...rt.loop } : null;
  },
  /**
   * The items under the playhead, or under another time.
   * @param target - the .media-timeline element or its selector
   * @param time - seconds; default: the playhead's time
   * @returns the regions there, in track order (markers are moments and never under it)
   */
  active: (target: string | HTMLElement, time?: number): MediaTimelineActive[] => {
    const el = resolve(target);
    if (!el?._timeline) return [];
    const rt = runtimeOf(el);
    return activeAt(rt, time ?? timeOf(rt));
  },
};

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
