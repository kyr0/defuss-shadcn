// -- Fretboard -------------------------------------------------
// A tablature rendered from a JSON of scores: per measure a lane of chord names, a tab staff (fret numbers on the
// strings, a strummed chord as a column) and lanes of lyrics, laid out in lines that break where the width ends. It
// keeps its own clock at the score's tempo: the playhead runs through the measures, the chords, notes and syllables
// under it light up, and the sheet scrolls to the line being played - a musician plays along. A song holds several
// scores (other keys, other time signatures), switched as they are written: nothing is transposed, no music theory. The
// model is the Media Timeline's (lanes of timed items under one clock, outlets anywhere on the page) with beats for
// seconds: a neck view (the fingers on the strings) and a chord chart anywhere on the page follow the playhead too.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import {
  defussGlobals,
  defussQuery,
  componentState,
  bindComponent,
  bindGlobalKeys,
  mediaTime,
} from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

const fretboardStates = ['default', 'playing', 'paused'];

/** The config every state takes - every key optional; only the keys passed are applied. */
export interface FretboardConfig {
  /** the playhead's position in beats from the start (0 = the first beat of measure 1); getState() reports the live one */
  position?: number;
  /** the id of the score shown - a song's scores are its keys and time signatures */
  score?: string;
  /** without score: shows the score in this key (in the time signature shown, else the key's first score) */
  key?: string;
  /** without score: shows the score in this time signature ("3/4") in the key shown */
  signature?: string;
  /** the measures playback repeats, null for none */
  loop?: FretboardLoop | null;
  /** the sheet's scale - 1 is the default size, from 0.5 to 3; the lines break again for it (data-zoom) */
  zoom?: number;
  /** the song - new data re-renders the sheet, the position keeps its share of the song */
  data?: FretboardSong;
}

/** A loop: a run of measures, both ends included. */
export interface FretboardLoop {
  /** the first measure of the loop, 1 = the first of the score */
  start: number;
  /** the last measure of the loop */
  end: number;
}

// VERIFIED: (verify's API docs gate) the states below are exactly the declared ones, each
// described, and every config field typed, described and named in the code.
/** setState() configs per state. */
export interface FretboardStateConfigs {
  /** Stopped: the clock stands and the playhead with it (Stop puts it at the start of the loop, else of the score; the end of the score lands here, back at the start). */
  default: FretboardConfig;
  /** The clock runs at the score's tempo: the playhead moves, what it reaches lights up and the sheet follows the line being played. */
  playing: FretboardConfig;
  /** Paused: the clock stands where it was - playing goes on from there. */
  paused: FretboardConfig;
}

/** A song (version 1): its scores and what they share. */
export interface FretboardSong {
  /** the format version - 1 */
  version: number;
  /** the song's title - the sheet's accessible name */
  title?: string;
  /** the strings' names from the highest-numbered to the 1st (a ukulele's 4th, a guitar's 6th), as tunings and chord
   *  charts write them - labels only, nothing is computed from them; default G C E A */
  tuning?: string[];
  /** chord shapes by name: a fret per string in tuning order ("0003" or [0, 0, 0, 3]), x for a muted string - or a
   *  shape with its barre */
  chords?: Record<string, string | (number | string)[] | FretboardShape>;
  /** the scores - one per key and time signature; the first is shown first */
  scores: FretboardScore[];
}

/** A chord shape with a barre. */
export interface FretboardShape {
  /** a fret per string in tuning order, as a plain shape ("133211") */
  frets: string | (number | string)[];
  /** the fret one finger presses across several strings: from the first to the last string at that fret, every
   *  string between pressed there or higher - drawn as a dashed line in the necks and the chord charts */
  barre?: number;
}

/** One score of a song. */
export interface FretboardScore {
  /** unique in the song - the score config and from name it */
  id: string;
  /** its name in a score select; default: its key and time signature */
  label?: string;
  /** the key it is written in - shown and picked, never transposed */
  key?: string;
  /** the tempo it plays at, in beats per minute (default 90) */
  bpm?: number;
  /** the time signature - beats per measure and the beat's note value (default [4, 4]); shown and picked */
  time?: number[];
  /** the number of measures; default: up to the last item */
  measures?: number;
  /** the strings, as the song's tuning; default: the song's */
  tuning?: string[];
  /** the fret a capo clamps (default none): the score's frets and chord shapes count from it, as tabs for a capo are
   *  written - the necks and the chord charts draw it */
  capo?: number;
  /** chord shapes of this score, over the song's */
  chords?: Record<string, string | (number | string)[] | FretboardShape>;
  /** the id of another score this one plays: its tracks, time and measures - this score's tracks replace those of the same id */
  from?: string;
  /** the lanes of every measure, top to bottom */
  tracks?: FretboardTrack[];
}

/** One lane of a score. */
export interface FretboardTrack {
  /** unique in the score - follow and a from score's tracks name it */
  id: string;
  /** chords (names above the staff), tab (the staff: fret numbers on the strings) or lyrics (a line of words); default tab */
  kind?: 'chords' | 'tab' | 'lyrics';
  /** the lane's label at the start of each line - short for lyrics ("EN") */
  label?: string;
  /** a lyrics lane's language (BCP 47, "en") */
  lang?: string;
  /** a lyrics lane: the id of the tab lane whose notes its text is sung on - one syllable per note */
  follow?: string;
  /** a lyrics lane that follows: its words, syllables split by hyphens ("Twin-kle"); _ holds a syllable over the next note */
  text?: string;
  /** what the lane shows */
  items?: FretboardItem[];
}

/** One chord, note, strum or syllable of a lane. */
export interface FretboardItem {
  /** the measure it starts in, 1 = the first (default 1) */
  measure?: number;
  /** the beat it starts on in that measure, 1 = the first, 2.5 = the "and" of 2 (default 1) */
  beat?: number;
  /** how many beats it lasts; default: until the next item of its lane */
  beats?: number;
  /** a chords lane: the chord's name */
  name?: string;
  /** a lyrics lane: the syllable or word */
  text?: string;
  /** a tab lane: the string played, 1 = the highest (the top line) */
  string?: number;
  /** a tab lane: the fret on that string, 0 = open; default: the fret of the chord sounding there */
  fret?: number;
  /** a tab lane: several strings at once */
  notes?: FretboardNote[];
  /** a tab lane: a chord on every string; default (with strum): the chord sounding there */
  chord?: string;
  /** a tab lane: a strummed chord and the strum's direction */
  strum?: 'down' | 'up';
}

/** A string played. */
export interface FretboardNote {
  /** the string, 1 = the highest */
  string: number;
  /** the fret, 0 = open; default: the fret of the chord sounding there */
  fret?: number;
}

/** An item under the playhead. */
export interface FretboardActive {
  /** its lane's id */
  track: string;
  /** its id - "<lane id>-<index>" */
  item: string;
  /** its lane's kind: chords, tab or lyrics */
  kind: string;
  /** a chord's name, a syllable, or a tab item's notes ("3/0 2/3": string/fret) */
  text: string;
  /** where it starts, beats from the start */
  start: number;
  /** where it ends, beats from the start */
  end: number;
}

/** What fretboard-change carries. */
export interface FretboardChangeDetail {
  /** the playhead's position, beats from the start */
  position: number;
  /** the measure it stands in, 1 = the first */
  measure: number;
  /** the id of the score shown */
  score: string;
  /** the items under the playhead, in lane order */
  active: FretboardActive[];
}

/** A score as the selects list it. */
export interface FretboardScoreInfo {
  /** the score's id */
  id: string;
  /** its label */
  label: string;
  /** its key */
  key: string;
  /** its time signature, "3/4" */
  signature: string;
  /** its tempo, beats per minute */
  bpm: number;
}

/** What select() picks - one of the three. */
export interface FretboardChoice {
  /** a score by its id */
  score?: string;
  /** a key: the score in it in the time signature shown, else the key's first score */
  key?: string;
  /** a time signature ("3/4"): the score in it in the key shown */
  signature?: string;
}

/** standard ukulele tuning, 4th string to 1st (re-entrant: the G is the high one) */
const GCEA = ['G', 'C', 'E', 'A'];
const KINDS = ['chords', 'tab', 'lyrics'];
const MAX_MEASURES = 999;
const MAX_ITEMS = 5000;
/** a measure narrower than this is not drawn below it: chars at 0.6em, text sizes in rem */
const CHAR_EM = 0.6;
const SIZES: Record<string, number> = { chords: 0.875, tab: 0.75, lyrics: 0.875 };
/** a last line this full or more is stretched to the width like the others */
const STRETCH_LAST = 0.7;
/** the sheet's scale: its bounds and the step of a zoom control or key */
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 1.25;
/** the keys that zoom the sheet */
const ZOOM_KEYS: Record<string, string> = { '+': 'zoom-in', '=': 'zoom-in', '-': 'zoom-out', '0': 'zoom-reset' };
/** where the inlays of a neck sit */

type Fret = number | 'x';
type Note = { string: number; fret: Fret };
/** a barre: its fret and the strings it covers (shape indexes, the highest-numbered string first) */
type Barre = { fret: number; from: number; to: number };
/** an item placed on the score: times in beats from the start */
type Placed = {
  id: string;
  track: string;
  kind: string;
  start: number;
  end: number;
  text: string;
  notes: Note[];
  strum: string;
  chord: string;
};
type Lane = { id: string; kind: string; label: string; lang: string; strums: boolean; items: Placed[] };
/** a score ready to draw and play */
type Score = {
  id: string;
  label: string;
  key: string;
  bpm: number;
  beats: number;
  /** the time signature, "3/4" */
  signature: string;
  measures: number;
  total: number;
  tuning: string[];
  chords: Map<string, Fret[]>;
  /** the barres of the chord shapes that name one */
  barres: Map<string, Barre>;
  /** the fret of the capo, 0 without one */
  capo: number;
  lanes: Lane[];
  /** every start and end of an item and every bar line, in order - the moments the clock wakes up for */
  marks: number[];
};

/** per-element runtime (state lives on the element) */
type Runtime = {
  song: FretboardSong;
  score: Score | null;
  status: string;
  /** the position while the clock stands */
  position: number;
  /** while it plays: when the clock started (performance.now()) and from which position */
  clock?: { at: number; from: number };
  timer?: ReturnType<typeof setTimeout>;
  loop: FretboardLoop | null;
  /** the line each measure is drawn in */
  lineOf: number[];
  /** the measure and the line painted last (-1: none yet - a new layout follows nothing) */
  measure: number;
  line: number;
  /** the active items painted last */
  active: string;
  /** a measure's inner padding in px (where its first beat starts) */
  pad: number;
  /** the sheet's scale, 1 = the default size */
  zoom: number;
  /** counts the score changes - an outlet drawn for an older one is drawn again */
  version: number;
  anim?: Animation;
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
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
/** a scale within the bounds (1 when it is none) */
const zoomOf = (v: unknown): number => Math.round(clamp(num(v, 1), MIN_ZOOM, MAX_ZOOM) * 1000) / 1000;
const round = (v: number): number => Math.round(v * 1e4) / 1e4;
const runtimeOf = (el: HTMLElement): Runtime => el._fretboard;
const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const spbOf = (s: Score): number => 60 / s.bpm;

/** the song as a plain, versioned copy - anything else reads as a song without scores */
function songOf(raw: unknown): FretboardSong {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as FretboardSong).scores))
    return { version: 1, scores: [] };
  try {
    return { version: 1, ...(JSON.parse(JSON.stringify(raw)) as FretboardSong) };
  } catch {
    return { version: 1, scores: [] };
  }
}

/** a fret as the data writes it: a number from 0, or x for a muted string; null when it is neither */
function fretOf(v: unknown): Fret | null {
  if (String(v).trim().toLowerCase() === 'x') return 'x';
  const n = num(v, NaN);
  return Number.isFinite(n) ? clamp(Math.round(n), 0, 36) : null;
}

/** the strings a barre at a fret covers: from the first to the last string at that fret, every string between
 *  pressed there or higher - else none */
function barreOf(shape: Fret[], fret: number): Barre | null {
  const at = shape.flatMap((f, i) => (f === fret ? [i] : []));
  if (!(fret > 0) || at.length < 2) return null;
  const from = at[0];
  const to = at[at.length - 1];
  for (let i = from; i <= to; i++) {
    const f = shape[i];
    if (typeof f !== 'number' || f < fret) return null;
  }
  return { fret, from, to };
}

/** the fret of a capo: a whole number from 0 (none) to 12 */
const capoOf = (raw: FretboardScore): number => clamp(Math.round(num(raw.capo, 0)), 0, 12);

/** a chord shape: a fret per string in tuning order - "0003", "10,10,10,12" or an array; null when it does not fit */
function shapeOf(v: unknown, strings: number): Fret[] | null {
  const parts = typeof v === 'string' ? (/[\s,]/.test(v.trim()) ? v.trim().split(/[\s,]+/) : [...v.trim()]) : v;
  if (!Array.isArray(parts) || parts.length !== strings) return null;
  const frets = parts.map(fretOf);
  return frets.every((f) => f !== null) ? (frets as Fret[]) : null;
}

/** A score with its from resolved: the named score's fields under this one's, its tracks replaced by id. Pure. */
function rawScore(song: FretboardSong, id: string, depth = 0): FretboardScore | null {
  const own = song.scores.find((s) => s && String(s.id) === id);
  if (!own) return null;
  const base =
    own.from != null && depth < 8 && String(own.from) !== id ? rawScore(song, String(own.from), depth + 1) : null;
  if (!base) return own;
  const tracks = [...(Array.isArray(base.tracks) ? base.tracks : [])];
  for (const t of Array.isArray(own.tracks) ? own.tracks : []) {
    const i = tracks.findIndex((b) => b && t && String(b.id) === String(t.id));
    if (i >= 0) tracks[i] = t;
    else tracks.push(t);
  }
  // a label names one score: a variant of another is labelled by its own key and time signature
  return {
    ...base,
    ...own,
    label: own.label,
    chords: { ...base.chords, ...own.chords },
    tracks,
    from: undefined,
  };
}

/** every score of the song as the selects list it, in data order */
function infosOf(song: FretboardSong): FretboardScoreInfo[] {
  return song.scores
    .filter((s) => s && s.id != null)
    .map((s) => {
      const raw = rawScore(song, String(s.id)) ?? s;
      const key = String(raw.key ?? '');
      const signature = signatureOf(raw);
      const bpm = clamp(num(raw.bpm, 90), 20, 400);
      return { id: String(s.id), label: labelOf(raw, signature), key, signature, bpm };
    });
}

/** a score's time signature as written: "beats/note value" (default 4/4) */
function signatureOf(raw: FretboardScore): string {
  const time = Array.isArray(raw.time) ? raw.time : [];
  return `${clamp(Math.round(num(time[0], 4)), 1, 32)}/${Math.max(1, Math.round(num(time[1], 4)))}`;
}
/** a score's label: its own, else its key, time signature and capo */
const labelOf = (raw: FretboardScore, signature: string): string =>
  String(raw.label ?? `${raw.key ? `${raw.key} · ` : ''}${signature}${capoOf(raw) ? ` · capo ${capoOf(raw)}` : ''}`);

/** the score a key and a time signature pick: in that key, the one in that time signature, else the key's first - the
 *  current one when the key has none */
function pick(song: FretboardSong, key: unknown, signature: unknown, current: string): string {
  const inKey = infosOf(song).filter((i) => i.key === String(key ?? ''));
  if (!inKey.length) return current;
  return (inKey.find((i) => i.signature === String(signature ?? '')) ?? inKey[0]).id;
}

/** syllables of a lyrics text: words split after their hyphens ("Twin-kle" → "Twin-", "kle"); _ is a hold */
const syllables = (text: string): string[] =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((w) => (w === '_' ? ['_'] : w.split(/(?<=-)(?=.)/)));

/** Place every item of a score: starts from measure + beat, ends from beats or the next item, chords and strums
 *  resolved to frets, followed lyrics put on their notes, the moments the clock wakes up for. Pure. */
function build(song: FretboardSong, raw: FretboardScore): Score {
  const tuningRaw = Array.isArray(raw.tuning) ? raw.tuning : Array.isArray(song.tuning) ? song.tuning : GCEA;
  const tuning = tuningRaw.length >= 1 && tuningRaw.length <= 12 ? tuningRaw.map(String) : GCEA;
  const n = tuning.length;
  const chords = new Map<string, Fret[]>();
  const barres = new Map<string, Barre>();
  for (const [name, v] of Object.entries({ ...song.chords, ...raw.chords })) {
    const withBarre = !!v && typeof v === 'object' && !Array.isArray(v);
    const shape = shapeOf(withBarre ? v.frets : v, n);
    if (!shape) continue;
    chords.set(name, shape);
    const barre = withBarre ? barreOf(shape, num(v.barre, 0)) : null;
    if (barre) barres.set(name, barre);
  }
  const time = Array.isArray(raw.time) ? raw.time : [];
  const beats = clamp(Math.round(num(time[0], 4)), 1, 32);
  const bpm = clamp(num(raw.bpm, 90), 20, 400);
  const tracks = (Array.isArray(raw.tracks) ? raw.tracks : []).filter(
    (t) => t && typeof t === 'object' && t.id != null,
  );
  const itemsOf = (t: FretboardTrack): FretboardItem[] =>
    (Array.isArray(t.items) ? t.items : []).slice(0, MAX_ITEMS).filter((i) => i && typeof i === 'object');
  const startOf = (i: FretboardItem): number =>
    (clamp(Math.round(num(i.measure, 1)), 1, MAX_MEASURES) - 1) * beats + Math.max(0, num(i.beat, 1) - 1);
  // the number of measures: the data's, else up to the last item (its start, or its end when it says how long)
  let last = 1;
  for (const t of tracks)
    for (const i of itemsOf(t)) {
      const s = startOf(i);
      last = Math.max(last, Math.floor(s / beats) + 1, Math.ceil((s + Math.max(0, num(i.beats, 0))) / beats));
    }
  const measures = clamp(Math.round(num(raw.measures, 0)) || last, 1, MAX_MEASURES);
  const total = measures * beats;
  const kindOf = (t: FretboardTrack): string => (KINDS.includes(String(t.kind)) ? String(t.kind) : 'tab');

  /** ends: the beats an item says, else the next start of its lane, else the end of the score */
  const finish = (list: (Placed & { beats: number | null })[]): Placed[] => {
    const sorted = list.filter((p) => p.start < total).sort((a, b) => a.start - b.start);
    const starts = [...new Set(sorted.map((p) => p.start))];
    return sorted.map(({ beats: b, ...p }) => {
      const next = starts.find((s) => s > p.start) ?? total;
      return { ...p, end: Math.min(total, b !== null ? p.start + Math.max(0, b) : next) };
    });
  };
  const blank = (t: FretboardTrack, i: number, start: number, item: FretboardItem) => ({
    id: `${t.id}-${i}`,
    track: String(t.id),
    kind: kindOf(t),
    start,
    end: start,
    text: '',
    notes: [] as Note[],
    strum: '',
    chord: '',
    beats: item.beats != null && Number.isFinite(num(item.beats, NaN)) ? num(item.beats, 0) : null,
  });

  const placed = new Map<string, Placed[]>();
  // chords first: a strum or a picked string without a fret plays the chord sounding there
  for (const t of tracks.filter((t) => kindOf(t) === 'chords'))
    placed.set(
      String(t.id),
      finish(
        itemsOf(t)
          .map((item, i) => ({ ...blank(t, i, startOf(item), item), text: String(item.name ?? item.text ?? '') }))
          .filter((p) => p.text !== ''),
      ),
    );
  const chordLane = tracks.find((t) => kindOf(t) === 'chords');
  const chordAt = (at: number): string =>
    (chordLane && placed.get(String(chordLane.id))?.find((p) => p.start <= at && at < p.end)?.text) ?? '';
  for (const t of tracks.filter((t) => kindOf(t) === 'tab'))
    placed.set(
      String(t.id),
      finish(
        itemsOf(t)
          .map((item, i) => {
            const start = startOf(item);
            const chord = item.chord != null ? String(item.chord) : chordAt(start);
            const shape = chords.get(chord);
            const fromShape = (s: number): Fret | null => shape?.[n - s] ?? null;
            const strum = item.strum === 'down' || item.strum === 'up' ? item.strum : '';
            let notes: Note[] = [];
            let usesChord = false;
            const note = (s: unknown, f: unknown): Note | null => {
              const string = Math.round(num(s, NaN));
              if (!(string >= 1 && string <= n)) return null;
              const fret = f != null && f !== '' ? fretOf(f) : fromShape(string);
              if (f == null || f === '') usesChord = true;
              return fret === null ? null : { string, fret };
            };
            const real = (x: Note | null): x is Note => !!x;
            if (Array.isArray(item.notes))
              notes = item.notes.map((x) => (x ? note(x.string, x.fret) : null)).filter(real);
            else if (item.string != null) notes = [note(item.string, item.fret)].filter(real);
            else if (item.chord != null || strum) {
              usesChord = true;
              notes = shape ? shape.map((fret, k) => ({ string: n - k, fret })) : [];
            }
            notes.sort((a, b) => a.string - b.string);
            return { ...blank(t, i, start, item), notes, strum, chord: usesChord ? chord : '' };
          })
          .filter((p) => p.notes.length || p.strum),
      ),
    );
  // lyrics: their own items, or one syllable per note of the tab lane they follow
  for (const t of tracks.filter((t) => kindOf(t) === 'lyrics')) {
    const followed = t.follow != null ? placed.get(String(t.follow)) : undefined;
    if (followed && typeof t.text === 'string') {
      const notes = [...new Set(followed.map((p) => p.start))].map((start) => ({
        start,
        end: Math.max(...followed.filter((p) => p.start === start).map((p) => p.end)),
      }));
      const out: Placed[] = [];
      let k = 0;
      for (const sy of syllables(t.text)) {
        if (k >= notes.length) break;
        if (sy === '_') {
          if (out.length) out[out.length - 1].end = notes[k].end;
        } else {
          const { start, end } = notes[k];
          out.push({
            id: `${t.id}-${out.length}`,
            track: String(t.id),
            kind: 'lyrics',
            start,
            end,
            text: sy,
            notes: [],
            strum: '',
            chord: '',
          });
        }
        k++;
      }
      placed.set(String(t.id), out);
    } else
      placed.set(
        String(t.id),
        finish(
          itemsOf(t)
            .map((item, i) => ({ ...blank(t, i, startOf(item), item), text: String(item.text ?? item.name ?? '') }))
            .filter((p) => p.text !== ''),
        ),
      );
  }
  const lanes: Lane[] = tracks.map((t) => {
    const items = placed.get(String(t.id)) ?? [];
    return {
      id: String(t.id),
      kind: kindOf(t),
      label: String(t.label ?? ''),
      lang: String(t.lang ?? ''),
      strums: items.some((p) => p.strum),
      items,
    };
  });
  const marks = new Set<number>();
  for (let m = 0; m <= measures; m++) marks.add(m * beats);
  for (const l of lanes)
    for (const p of l.items) {
      marks.add(round(p.start));
      marks.add(round(p.end));
    }
  return {
    id: String(raw.id),
    label: labelOf(raw, signatureOf(raw)),
    key: String(raw.key ?? ''),
    bpm,
    beats,
    signature: signatureOf(raw),
    measures,
    total,
    tuning,
    chords,
    barres,
    capo: capoOf(raw),
    lanes,
    marks: [...marks].sort((a, b) => a - b),
  };
}

/** the first moment after a position the clock wakes up for */
function nextMark(s: Score, p: number): number {
  let lo = 0;
  let hi = s.marks.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (s.marks[mid] <= p + 1e-6) lo = mid + 1;
    else hi = mid;
  }
  return s.marks[lo] ?? s.total;
}

/** the notes of a tab item as text: "string/fret" */
const notesText = (p: Placed): string => p.notes.map((n) => `${n.string}/${n.fret}`).join(' ');

/** the items under a position, in lane order */
function activeAt(s: Score, p: number): FretboardActive[] {
  return s.lanes.flatMap((l) =>
    l.items
      .filter((x) => x.start <= p + 1e-6 && p + 1e-6 < x.end)
      .map((x) => ({
        track: l.id,
        item: x.id,
        kind: l.kind,
        text: l.kind === 'tab' ? notesText(x) : x.text,
        start: x.start,
        end: x.end,
      })),
  );
}

/** the position now: the clock's while it runs, else where it stands */
function positionOf(rt: Runtime): number {
  const s = rt.score;
  if (!s) return 0;
  const p = rt.clock ? rt.clock.from + (performance.now() - rt.clock.at) / 1000 / spbOf(s) : rt.position;
  return clamp(p, 0, s.total);
}

/** the loop as beats from the start: [its first beat, the beat after its last measure] */
const loopRange = (rt: Runtime): [number, number] | null =>
  rt.loop && rt.score ? [(rt.loop.start - 1) * rt.score.beats, rt.loop.end * rt.score.beats] : null;

/** a loop that holds: whole measures of the score, start before end */
function loopOf(raw: unknown, s: Score | null): FretboardLoop | null {
  if (!raw || typeof raw !== 'object' || !s) return null;
  const r = raw as FretboardLoop;
  const a = Math.round(num(r.start, NaN));
  const b = Math.round(num(r.end, a));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { start: clamp(Math.min(a, b), 1, s.measures), end: clamp(Math.max(a, b), 1, s.measures) };
}
const sameLoop = (a: FretboardLoop | null, b: FretboardLoop | null): boolean =>
  a === b || (!!a && !!b && a.start === b.start && a.end === b.end);

/** the parts the runtime keeps */
const part = (el: HTMLElement, name: string): HTMLElement | undefined =>
  dfDollar(el).find<HTMLElement>(`.fretboard-${name}`).get(0);

/** the controls, readouts and outlets bound to a tab: inside it, and [data-fretboard-for="<its id>"] */
function boundOf(el: HTMLElement, sel: string): HTMLElement[] {
  const out = dfDollar(el).find<HTMLElement>(sel).toArray() as HTMLElement[];
  if (el.id)
    for (const bound of dfDollar(`[data-fretboard-for="${CSS.escape(el.id)}"]`).toArray() as HTMLElement[]) {
      if (bound.matches(sel)) out.push(bound);
      out.push(...(dfDollar(bound).find<HTMLElement>(sel).toArray() as HTMLElement[]));
    }
  return out;
}

/** a length custom property in px (px, rem or em) */
function lengthOf(el: Element, name: string, rem: number, fallback: number): number {
  const m = /^\s*(-?[\d.]+)(px|rem|em)?\s*$/.exec(getComputedStyle(el).getPropertyValue(name));
  if (!m) return fallback;
  return m[2] === 'px' ? Number(m[1]) : Number(m[1]) * rem;
}

/** The width every measure needs: its beats at the beat width, widened until no text of a lane reaches the next
 *  item (texts estimated at 0.6em a character - no layout read), plus its padding. Pure. */
function measureWidths(s: Score, rem: number, beatPx: number, padPx: number): number[] {
  const out = Array.from({ length: s.measures }, () => s.beats * beatPx);
  for (const lane of s.lanes) {
    const size = SIZES[lane.kind] * rem;
    const need = new Map<number, number>();
    for (const p of lane.items) {
      const chars = lane.kind === 'tab' ? Math.max(1, ...p.notes.map((n) => String(n.fret).length)) : p.text.length;
      need.set(p.start, Math.max(need.get(p.start) ?? 0, chars * CHAR_EM * size + 0.5 * rem));
    }
    const starts = [...need.keys()].sort((a, b) => a - b);
    starts.forEach((start, i) => {
      const m = Math.floor(start / s.beats);
      if (m >= s.measures) return;
      const end = (m + 1) * s.beats;
      const span = Math.max(0.125, Math.min(end, starts[i + 1] ?? end) - start);
      out[m] = Math.max(out[m], (need.get(start)! * s.beats) / span);
    });
  }
  return out.map((w) => Math.ceil(w + 2 * padPx));
}

/** Lines of measures: as many as fit the width, in order (a measure wider than the width has a line of its own). Pure. */
function breakLines(widths: number[], width: number): number[][] {
  const lines: number[][] = [];
  let line: number[] = [];
  let sum = 0;
  widths.forEach((w, i) => {
    if (line.length && sum + w > width) {
      lines.push(line);
      line = [];
      sum = 0;
    }
    line.push(i);
    sum += w;
  });
  if (line.length) lines.push(line);
  return lines;
}

/** a lane's box at the start of a line: string names on a tab staff, the label of the others */
function clefLane(s: Score, l: Lane): string {
  const n = s.tuning.length;
  if (l.kind === 'tab')
    return `<div class="fretboard-lane" data-kind="tab"${l.strums ? ' data-strums' : ''} style="--fretboard-strings: ${n}">${s.tuning
      .map(
        (name, k) =>
          `<span class="fretboard-string-name" data-string="${n - k}" style="--fretboard-s: ${n - k}">${esc(name)}</span>`,
      )
      .join('')}</div>`;
  return `<div class="fretboard-lane" data-kind="${l.kind}"${l.label ? ` title="${esc(l.label)}"` : ''}><span class="fretboard-lane-label">${esc(l.label)}</span></div>`;
}

/** an item of a measure, placed at its beat (--fretboard-at: 0 at the first beat, 1 at the bar line) */
function itemMarkup(l: Lane, p: Placed, at: number): string {
  const attrs = `data-item="${esc(p.id)}" style="--fretboard-at: ${round(at)}"`;
  if (l.kind === 'chords') return `<span class="fretboard-chord" ${attrs}>${esc(p.text)}</span>`;
  if (l.kind === 'lyrics') return `<span class="fretboard-syllable" ${attrs}>${esc(p.text)}</span>`;
  const frets = p.notes
    .map(
      (x) =>
        `<span class="fretboard-fret" data-string="${x.string}" style="--fretboard-s: ${x.string}">${x.fret === 'x' ? '×' : x.fret}</span>`,
    )
    .join('');
  const strum = p.strum ? `<span class="fretboard-strum" data-dir="${p.strum}"></span>` : '';
  return `<span class="fretboard-hit" ${attrs}${p.chord ? ` title="${esc(p.chord)}"` : ''}>${frets}${strum}</span>`;
}

/** Lay the score out in lines for the width the sheet has, at its scale: a column of string names and lane labels,
 *  then the measures, stretched to the width (a last line that is not nearly full keeps its measures' widths). The
 *  playhead and the marks are painted again; a new layout scrolls nothing. */
function layout(el: HTMLElement): void {
  const rt = runtimeOf(el);
  const sheet = part(el, 'sheet');
  if (!sheet) return;
  rt.anim?.cancel();
  rt.anim = undefined;
  rt.measure = -1;
  rt.line = -1;
  rt.active = '';
  const s = rt.score;
  if (!s) {
    rt.lineOf = [];
    dfDollar(sheet).html('');
    return;
  }
  // the scale multiplies every length of the lines (the stylesheet reads it as --fretboard-zoom)
  const z = rt.zoom;
  if (sheet.style.getPropertyValue('--fretboard-zoom') !== String(z))
    sheet.style.setProperty('--fretboard-zoom', String(z));
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const cs = getComputedStyle(sheet);
  rt.pad = lengthOf(sheet, '--fretboard-pad', rem, 0.75 * rem) * z;
  const clef = lengthOf(sheet, '--fretboard-clef', rem, 2.25 * rem) * z;
  const inner = sheet.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
  const width = Math.max(1, inner - clef);
  const widths = measureWidths(s, rem * z, lengthOf(sheet, '--fretboard-beat', rem, 2.5 * rem) * z, rt.pad);
  const lines = breakLines(widths, width);
  rt.lineOf = [];
  const byMeasure = s.lanes.map((l) => {
    const per: Placed[][] = Array.from({ length: s.measures }, () => []);
    for (const p of l.items) per[Math.min(s.measures - 1, Math.floor(p.start / s.beats))].push(p);
    return per;
  });
  // the strings of a staff: a line each (a colour each with data-colors="strings")
  const strings = Array.from(
    { length: s.tuning.length },
    (_, k) => `<span class="fretboard-string" data-string="${k + 1}" style="--fretboard-s: ${k + 1}"></span>`,
  ).join('');
  const clefMarkup = `<div class="fretboard-clef" aria-hidden="true"><span class="fretboard-number"></span>${s.lanes.map((l) => clefLane(s, l)).join('')}</div>`;
  const markup = lines
    .map((line, li) => {
      const sum = line.reduce((a, m) => a + widths[m], 0);
      const stretch = li < lines.length - 1 || sum >= STRETCH_LAST * width;
      const measures = line
        .map((m) => {
          rt.lineOf[m] = li;
          const lanes = s.lanes
            .map((l, k) => {
              const tab = l.kind === 'tab';
              const items =
                (tab ? strings : '') +
                byMeasure[k][m].map((p) => itemMarkup(l, p, (p.start - m * s.beats) / s.beats)).join('');
              return `<div class="fretboard-lane" data-kind="${l.kind}" data-track="${esc(l.id)}"${l.lang ? ` lang="${esc(l.lang)}"` : ''}${tab && l.strums ? ' data-strums' : ''}${tab ? ` aria-hidden="true" style="--fretboard-strings: ${s.tuning.length}"` : ''}>${items}</div>`;
            })
            .join('');
          return `<div class="fretboard-measure" data-measure="${m + 1}"${m === s.measures - 1 ? ' data-last' : ''} style="flex: ${stretch ? widths[m] : 0} 1 ${widths[m]}px; min-inline-size: ${widths[m]}px"><span class="fretboard-number" aria-hidden="true">${m + 1}</span>${lanes}</div>`;
        })
        .join('');
      return `<div class="fretboard-line" data-line="${li}">${clefMarkup}${measures}</div>`;
    })
    .join('');
  dfDollar(sheet).html(markup);
  dfDollar(sheet).attr('data-lines', String(lines.length));
  paintLoop(el);
  paint(el, true);
}

/** Show a score (another key or time signature of the song, or new data): drawn again, the position kept - the same
 *  beat in a score as long, else the same share of the song from the start of its measure -, the loop kept inside
 *  it, the selects and outlets filled for it. */
function showScore(el: HTMLElement, id: string): void {
  const rt = runtimeOf(el);
  const p = positionOf(rt);
  const before = rt.score?.total ?? 0;
  const first = rt.song.scores.find((x) => x && x.id != null);
  const raw = rawScore(rt.song, id) ?? (first ? rawScore(rt.song, String(first.id)) : null);
  rt.score = raw ? build(rt.song, raw) : null;
  const s = rt.score;
  const mapped = !s || !before || before === s.total ? p : Math.floor(((p / before) * s.total) / s.beats) * s.beats;
  const at = s ? clamp(mapped, 0, Math.max(0, s.total - 1e-3)) : 0;
  if (rt.clock) rt.clock = { at: performance.now(), from: at };
  else rt.position = at;
  rt.loop = loopOf(rt.loop, s);
  rt.version++;
  fillControls(el);
  layout(el);
  if (rt.clock) schedule(el);
}

/** the selects and the position slider bound to the tab, filled for the song and the score shown */
function fillControls(el: HTMLElement): void {
  const rt = runtimeOf(el);
  const s = rt.score;
  const infos = infosOf(rt.song);
  for (const c of boundOf(el, '[data-fretboard-control]')) {
    const kind = c.getAttribute('data-fretboard-control');
    if (kind === 'position') {
      dfDollar(c).attr('max', String(s?.total ?? 0));
      continue;
    }
    if (c.localName !== 'select') continue;
    let options: [string, string][] = [];
    let value = '';
    if (kind === 'key') {
      options = [...new Set(infos.map((i) => i.key).filter(Boolean))].map((k) => [k, k]);
      value = s?.key ?? '';
    } else if (kind === 'signature') {
      options = [...new Set(infos.filter((i) => i.key === (s?.key ?? '')).map((i) => i.signature))].map((x) => [x, x]);
      value = s?.signature ?? '';
    } else if (kind === 'score') {
      options = infos.map((i) => [i.id, i.label]);
      value = s?.id ?? '';
    }
    const markup = options.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('');
    if (c._fretboardOptions !== markup) {
      dfDollar(c).html(markup);
      c._fretboardOptions = markup;
    }
    (c as HTMLSelectElement).value = value;
  }
}

/** how a chords outlet is drawn: the fretting hand (left by default: a right-handed player; right mirrors it), the
 *  charts across or upright (the outlet's own data-orientation), string colours - the outlet's attributes over the
 *  tab's */
type Look = { hand: string; orientation: string; colors: string };
function lookOf(el: HTMLElement, outlet: HTMLElement): Look {
  const attr = (name: string) => outlet.getAttribute(name) ?? el.getAttribute(name) ?? '';
  return {
    hand: attr('data-hand') === 'right' ? 'right' : 'left',
    orientation: outlet.getAttribute('data-orientation') === 'vertical' ? 'vertical' : 'horizontal',
    colors: attr('data-colors') === 'strings' ? 'strings' : '',
  };
}
/** a shape as the components write it: characters while every fret has one digit, else a spaced list */
const shapeText = (shape: Fret[]): string =>
  shape.some((f) => typeof f === 'number' && f > 9) ? shape.join(' ') : shape.join('');

/** A chord chart outlet: a Chord Chart (src/components/multimedia/chord-chart) per chord the score plays, in the
 *  order it first sounds - its shape, barre and capo, the outlet's look. */
function renderChords(outlet: HTMLElement, s: Score, look: Look): void {
  const names: string[] = [];
  const seen = (name: string) => name && !names.includes(name) && names.push(name);
  const items = s.lanes
    .flatMap((l) => l.items.map((p) => [p.start, l.kind === 'chords' ? p.text : p.chord] as const))
    .sort((a, b) => a[0] - b[0]);
  for (const [, name] of items) seen(name);
  const chart = (name: string) => {
    const shape = s.chords.get(name);
    const barre = s.barres.get(name);
    return `<figure class="chord-chart" data-chord="${esc(name)}"${shape ? ` data-shape="${esc(shapeText(shape))}"` : ''}${barre ? ` data-barre="${barre.fret}"` : ''}${s.capo ? ` data-capo="${s.capo}"` : ''} data-orientation="${look.orientation}" data-hand="${look.hand}"${look.colors ? ` data-colors="${look.colors}"` : ''}><figcaption>${esc(name)}</figcaption></figure>`;
  };
  dfDollar(outlet).html(names.map(chart).join(''));
}

/** the frets a bound neck shows: the capo and the score's highest fret + 2 */
function neckFrets(s: Score): number {
  const highest = Math.max(
    0,
    ...s.lanes.flatMap((l) => l.items.flatMap((p) => p.notes.map((x) => (typeof x.fret === 'number' ? x.fret : 0)))),
    ...[...s.chords.values()].flatMap((f) => f.map((x) => (typeof x === 'number' ? x : 0))),
  );
  return clamp(s.capo + highest + 2, 3, 24);
}

/** A Fretboard Neck bound to the tab (src/components/multimedia/fretboard-neck): the tab sets what the neck does not
 *  say itself - its tuning, frets, hand and colours - and, as the playhead moves, the shape of the chord sounding,
 *  the notes sounding and the notes coming next, through the neck's State API (its markup before it starts). */
function driveNeck(el: HTMLElement, neck: HTMLElement, s: Score, active: FretboardActive[], p: number): void {
  const own: string[] = (neck._fretboardOwn ??= ['data-tuning', 'data-frets', 'data-hand', 'data-colors'].filter((a) =>
    neck.hasAttribute(a),
  ));
  const put = (name: string, v: string | null) => {
    if (!own.includes(name) && neck.getAttribute(name) !== v) dfDollar(neck).attr(name, v);
  };
  put('data-tuning', s.tuning.join(' '));
  put('data-frets', String(neckFrets(s)));
  put('data-hand', el.getAttribute('data-hand') === 'right' ? 'right' : 'left');
  put('data-colors', el.getAttribute('data-colors') === 'strings' ? 'strings' : null);
  const chord = active.find((a) => a.kind === 'chords')?.text ?? '';
  const shape = s.chords.get(chord);
  const tabs = s.lanes.filter((l) => l.kind === 'tab');
  const ids = new Set(active.map((a) => a.item));
  const next = Math.min(
    Infinity,
    ...tabs.flatMap((l) => l.items.filter((x) => x.start > p + 1e-6).map((x) => x.start)),
  );
  const pairs = (pick: (x: Placed) => boolean) =>
    tabs
      .flatMap((l) => l.items.filter(pick).flatMap((x) => x.notes))
      .filter((n) => typeof n.fret === 'number')
      .map((n) => `${n.string}/${n.fret}`)
      .join(' ');
  const state = {
    shape: shape ? shapeText(shape) : '',
    barre: s.barres.get(chord)?.fret ?? null,
    notes: pairs((x) => ids.has(x.id)),
    next: pairs((x) => x.start === next),
    capo: s.capo,
  };
  const key = JSON.stringify(state);
  if (neck._fretboardNeckFrom === key) return;
  neck._fretboardNeckFrom = key;
  if (neck.api) neck.api.setState('default', state);
  else {
    const attr = (name: string, v: string | null) => {
      if (neck.getAttribute(name) !== v) dfDollar(neck).attr(name, v);
    };
    attr('data-shape', state.shape || null);
    attr('data-barre', state.barre === null ? null : String(state.barre));
    attr('data-notes', state.notes || null);
    attr('data-next', state.next || null);
    attr('data-capo', state.capo ? String(state.capo) : null);
  }
}

/** Put the playhead into the measure of the position and, while the clock runs, let it run to the bar line on its
 *  own (a Web Animation - no script per frame); the clock moves it on at the next bar line. */
function runCursor(el: HTMLElement): void {
  const rt = runtimeOf(el);
  const s = rt.score;
  const sheet = part(el, 'sheet');
  rt.anim?.cancel();
  rt.anim = undefined;
  if (!s || !sheet) return;
  const p = positionOf(rt);
  const m = Math.min(s.measures - 1, Math.floor(p / s.beats));
  rt.measure = m;
  const measure = dfDollar(sheet)
    .find<HTMLElement>(`.fretboard-measure[data-measure="${m + 1}"]`)
    .get(0);
  if (!measure) return;
  let cursor = dfDollar(sheet).find<HTMLElement>('.fretboard-cursor').get(0);
  if (!cursor) {
    cursor = dfDollar(
      '<div class="fretboard-cursor" aria-hidden="true"><div class="fretboard-playhead"></div></div>',
    ).get(0) as HTMLElement;
  }
  if (cursor.parentElement !== measure) dfDollar(measure).append(cursor);
  const head = cursor.firstElementChild as HTMLElement;
  const f = clamp((p - m * s.beats) / s.beats, 0, 1);
  head.style.setProperty('left', `${round(f * 100)}%`);
  if (rt.status === 'playing' && rt.clock && f < 1 && typeof head.animate === 'function')
    rt.anim = head.animate([{ left: `${round(f * 100)}%` }, { left: '100%' }], {
      duration: (1 - f) * s.beats * spbOf(s) * 1000,
      easing: 'linear',
      fill: 'forwards',
    });
}

/** Scroll to a line. While it plays the line goes to the top of the sheet's box (the next lines below it - the
 *  musician reads ahead) or, when the page scrolls instead, to the top of the window once it leaves the upper two
 *  thirds; otherwise just into view. Smooth unless the reader asked for less motion; data-follow="none" turns it off. */
function follow(el: HTMLElement, line: number, align: boolean): void {
  if (el.getAttribute('data-follow') === 'none') return;
  const sheet = part(el, 'sheet');
  const row = sheet && (dfDollar(sheet).children<HTMLElement>('.fretboard-line').eq(line).get(0) as HTMLElement);
  if (!sheet || !row) return;
  const behavior: ScrollBehavior = reduced() ? 'auto' : 'smooth';
  if (sheet.scrollHeight > sheet.clientHeight + 1) {
    const gap = lineGap(sheet);
    const top = Math.max(0, row.offsetTop - gap);
    const bottom = row.offsetTop + row.offsetHeight + gap;
    if (align || top < sheet.scrollTop) sheet.scrollTo({ top, behavior });
    else if (bottom > sheet.scrollTop + sheet.clientHeight)
      sheet.scrollTo({ top: bottom - sheet.clientHeight, behavior });
    return;
  }
  const box = row.getBoundingClientRect();
  const view = document.documentElement.clientHeight;
  if (box.top < 0 || box.bottom > view * (align ? 2 / 3 : 1))
    row.scrollIntoView({ block: align ? 'start' : 'nearest', behavior });
}
/** the room left above a line scrolled to the top: the sheet's gap between lines */
const lineGap = (sheet: HTMLElement): number => parseFloat(getComputedStyle(sheet).rowGap) || 8;

/** Paint what follows the position: the playhead (moved on at a bar line), the line (scrolled to), the active items,
 *  the readouts, the controls and the outlets - and tell the page when the items under the playhead change. */
function paint(el: HTMLElement, restart = false): void {
  const rt = runtimeOf(el);
  const s = rt.score;
  if (!s || !part(el, 'sheet')) return;
  const p = positionOf(rt);
  const m = Math.min(s.measures - 1, Math.floor(p / s.beats));
  const playing = rt.status === 'playing' && !!rt.clock;
  if (restart || m !== rt.measure || playing !== !!rt.anim) runCursor(el);
  const line = rt.lineOf[m] ?? 0;
  if (line !== rt.line) {
    const first = rt.line < 0;
    rt.line = line;
    if (!first) follow(el, line, rt.status === 'playing');
  }
  const active = activeAt(s, p);
  // the toggles show the live state (also when it moved on by itself: the end of the score)
  for (const b of boundOf(el, '[data-fretboard-action="toggle"], [data-fretboard-action="loop"]')) {
    const on = b.getAttribute('data-fretboard-action') === 'toggle' ? rt.status === 'playing' : !!rt.loop;
    if (b.getAttribute('aria-pressed') !== String(on)) dfDollar(b).attr('aria-pressed', String(on));
  }
  for (const out of boundOf(el, '[data-fretboard-output]')) {
    const text = outputText(out.getAttribute('data-fretboard-output') ?? '', rt, s, p, m, active);
    if (dfDollar(out).text() !== text) dfDollar(out).text(text);
  }
  for (const c of boundOf(el, '[data-fretboard-control="position"]')) {
    const v = String(Math.floor(p + 1e-6));
    if ((c as HTMLInputElement).value !== v) (c as HTMLInputElement).value = v;
  }
  // a bound neck follows the playhead; a chords outlet is drawn again for a new score and when its look changes
  for (const neck of boundOf(el, '.fretboard-neck')) driveNeck(el, neck, s, active, p);
  const chord = active.find((a) => a.kind === 'chords')?.text ?? '';
  for (const outlet of boundOf(el, '[data-fretboard-outlet="chords"]')) {
    const look = lookOf(el, outlet);
    const drawn = `${rt.version}|${look.hand}|${look.orientation}|${look.colors}`;
    if (outlet._fretboardFor !== drawn) {
      outlet._fretboardFor = drawn;
      renderChords(outlet, s, look);
    }
    // the chart of the chord sounding is active - through its State API once it runs
    dfDollar(outlet)
      .find<HTMLElement>('.chord-chart')
      .each((_i, d) => {
        const on = d.getAttribute('data-chord') === chord;
        if (d.hasAttribute('data-active') === on) return;
        if (d.api) d.api.setState(on ? 'active' : 'default');
        else dfDollar(d).attr('data-active', on ? '' : null);
      });
  }
  const key = active.map((a) => a.item).join('\n');
  if (key === rt.active && !restart) return;
  rt.active = key;
  const ids = new Set(active.map((a) => a.item));
  dfDollar(part(el, 'sheet'))
    .find<HTMLElement>('[data-item]')
    .each((_i, item) => {
      const on = ids.has(item.getAttribute('data-item') ?? '');
      if (item.hasAttribute('data-active') !== on) dfDollar(item).attr('data-active', on ? '' : null);
    });
  // Fires when the items under the playhead change - as it moves, after a seek, a new score or new data.
  el.dispatchEvent(
    new CustomEvent<FretboardChangeDetail>('fretboard-change', {
      bubbles: true,
      detail: { position: round(p), measure: m + 1, score: s.id, active },
    }),
  );
}

/** a readout's text */
function outputText(kind: string, rt: Runtime, s: Score, p: number, m: number, active: FretboardActive[]): string {
  const spb = spbOf(s);
  if (kind === 'time') return mediaTime(p * spb, s.total * spb);
  if (kind === 'duration') return mediaTime(s.total * spb);
  if (kind === 'measure') return String(m + 1);
  if (kind === 'measures') return String(s.measures);
  if (kind === 'beat') return String(Math.min(s.beats, Math.floor(p - m * s.beats + 1e-6) + 1));
  if (kind === 'bpm') return String(s.bpm);
  if (kind === 'signature') return s.signature;
  if (kind === 'key') return s.key;
  if (kind === 'score') return s.label;
  if (kind === 'chord') return active.find((a) => a.kind === 'chords')?.text ?? '';
  if (kind === 'loop') return rt.loop ? `${rt.loop.start} - ${rt.loop.end}` : '';
  if (kind === 'zoom') return `${Math.round(rt.zoom * 100)}%`;
  if (kind === 'capo') return s.capo ? String(s.capo) : '';
  return '';
}

/** mark the measures of the loop */
function paintLoop(el: HTMLElement): void {
  const rt = runtimeOf(el);
  const sheet = part(el, 'sheet');
  if (!sheet) return;
  dfDollar(sheet)
    .find<HTMLElement>('.fretboard-measure')
    .each((_i, m) => {
      const n = Number(m.getAttribute('data-measure'));
      const on = !!rt.loop && n >= rt.loop.start && n <= rt.loop.end;
      if (m.hasAttribute('data-loop') !== on) dfDollar(m).attr('data-loop', on ? '' : null);
    });
}

/** Wake up at the next moment something changes (an item starts or ends, a bar line): paint, then sleep again. A
 *  timer, never a frame callback (those stop in a frame scrolled out of view). At the loop's end playback goes on at
 *  its start; at the score's end it stops, back at the start. */
function schedule(el: HTMLElement): void {
  const rt = runtimeOf(el);
  const s = rt.score;
  clearTimeout(rt.timer);
  rt.timer = undefined;
  if (!rt.clock || !s) return;
  const p = positionOf(rt);
  const range = loopRange(rt);
  const bound = range ? range[1] : s.total;
  if (p >= bound - 1e-6) {
    if (range) {
      rt.clock = { at: performance.now(), from: range[0] };
      paint(el, true);
      schedule(el);
    } else {
      rt.clock = undefined;
      rt.position = 0;
      rt.status = 'default';
      paint(el, true);
    }
    rt.report();
    return;
  }
  const next = Math.min(bound, nextMark(s, p));
  rt.timer = setTimeout(
    () => {
      rt.timer = undefined;
      paint(el);
      schedule(el);
      rt.report();
    },
    Math.max(4, (next - p) * spbOf(s) * 1000 + 2),
  );
}

/** Start the clock (inside the loop when there is one; from the start again at the end) or stop it where it is. */
function runClock(el: HTMLElement, on: boolean): void {
  const rt = runtimeOf(el);
  const s = rt.score;
  if (!on || !s || s.total <= 0) {
    clearTimeout(rt.timer);
    rt.timer = undefined;
    if (rt.clock) {
      rt.position = positionOf(rt);
      rt.clock = undefined;
    }
    return;
  }
  if (!rt.clock) {
    const range = loopRange(rt);
    let p = rt.position;
    if (range && (p < range[0] || p >= range[1])) p = range[0];
    else if (p >= s.total - 1e-6) p = 0;
    rt.position = p;
    rt.clock = { at: performance.now(), from: p };
  }
  schedule(el);
}

/** Move the playhead - a running clock goes on from there. */
function seek(el: HTMLElement, position: number): void {
  const rt = runtimeOf(el);
  const s = rt.score;
  if (!s) return;
  const p = clamp(position, 0, Math.max(0, s.total - 1e-3));
  if (rt.clock) rt.clock = { at: performance.now(), from: p };
  else rt.position = p;
  paint(el, true);
  if (rt.clock) schedule(el);
}

/** Set (or clear) the loop: a playhead outside a new loop goes to its start (playback stays inside it). */
function setLoop(el: HTMLElement, loop: FretboardLoop | null): void {
  const rt = runtimeOf(el);
  if (sameLoop(loop, rt.loop)) return;
  rt.loop = loop;
  paintLoop(el);
  const range = loopRange(rt);
  const p = positionOf(rt);
  if (range && (p < range[0] || p >= range[1])) seek(el, range[0]);
  else if (rt.clock) schedule(el);
}

/** The markup of a state: the play toggle pressed while it plays, the loop toggle while a loop is set, the scale as
 *  data-zoom (none at 1), and the song in its script (only when it differs from what the script says - authored
 *  formatting stays). The sheet is the runtime's. */
function applyMarkup(el: HTMLElement, stateName: string, config: FretboardConfig): void {
  const zoom = zoomOf(config.zoom);
  const scale = zoom === 1 ? null : String(zoom);
  if (el.getAttribute('data-zoom') !== scale) dfDollar(el).attr('data-zoom', scale);
  const press = (action: string, on: boolean) =>
    dfDollar(el)
      .find<HTMLElement>(`[data-fretboard-action="${action}"]`)
      .each((_i, b) => {
        if (b.getAttribute('aria-pressed') !== String(on)) dfDollar(b).attr('aria-pressed', String(on));
      });
  press('toggle', stateName === 'playing');
  press('loop', !!config.loop);
  const script = dfDollar(el).children<HTMLScriptElement>('script.fretboard-source');
  if (!config.data || !script.length) return;
  let authored: unknown = null;
  try {
    authored = JSON.parse(script.text() || 'null');
  } catch {
    authored = null;
  }
  if (JSON.stringify(songOf(authored)) !== JSON.stringify(songOf(config.data)))
    script.text(JSON.stringify(config.data, null, 2));
}

/** The DOM side of a state: new data or another score re-render (the position stays), a position seeks, a loop is
 *  set, then the clock runs or stands. */
function triggerStateChange(
  el: HTMLElement,
  stateName: string,
  config: FretboardConfig,
  incoming: Record<string, unknown>,
) {
  const rt = runtimeOf(el);
  applyMarkup(el, stateName, config);
  if (!rt) return undefined;
  let again = false;
  if ('data' in incoming && incoming.data !== rt.song) {
    const song = songOf(incoming.data);
    if (JSON.stringify(song) !== JSON.stringify(rt.song)) {
      rt.song = song;
      again = true;
    }
  }
  const current = rt.score?.id ?? '';
  let id = current;
  if ('zoom' in incoming && (again || incoming.score != null || 'key' in incoming || 'signature' in incoming))
    rt.zoom = zoomOf(incoming.zoom);
  if (incoming.score != null) id = String(incoming.score);
  else if ('key' in incoming || 'signature' in incoming)
    id = pick(rt.song, incoming.key ?? rt.score?.key, incoming.signature ?? rt.score?.signature, current);
  if (again || id !== current) showScore(el, id);
  else if ('zoom' in incoming && zoomOf(incoming.zoom) !== rt.zoom) {
    rt.zoom = zoomOf(incoming.zoom);
    layout(el);
    if (rt.line >= 0) follow(el, rt.line, false);
  }
  // the clock stops before a seek - it would run on from the new position while it stops
  if (stateName !== 'playing') runClock(el, false);
  // the state first: a seek into another line while it plays scrolls that line to the top
  rt.status = stateName === 'playing' && !(rt.score && rt.score.total > 0) ? 'default' : stateName;
  // a state that cannot play (no score) lands in default - the state recorded
  if (rt.status !== stateName) dfDollar(el).attr('data-state-name', rt.status);
  if ('position' in incoming) seek(el, num(incoming.position, positionOf(rt)));
  if ('loop' in incoming) setLoop(el, loopOf(incoming.loop, rt.score));
  runClock(el, rt.status === 'playing');
  paint(el, true);
  return undefined;
}

/** Registry-level API; pass the .fretboard element explicitly. Unknown names throw. */
export const fretboardApi = componentState({
  component: 'fretboard',
  states: fretboardStates,
  // the config is the player's settings: a setState names what changes, the rest stays
  mergeConfig: true,
  apply: (el, state, _previous, incoming) => triggerStateChange(el, state.name, state.config, incoming),
  // reflect reality: the clock moves the position and stops at the end of the score on its own
  read: (el, state) => {
    const rt = runtimeOf(el);
    if (!rt) return state;
    const c = state.config as FretboardConfig;
    const s = rt.score;
    const position = Math.round(positionOf(rt) * 1000) / 1000;
    const score = s?.id ?? '';
    const key = s?.key ?? '';
    const signature = s?.signature ?? '';
    if (
      rt.status === state.name &&
      c.position === position &&
      c.score === score &&
      c.key === key &&
      c.signature === signature &&
      c.loop === rt.loop &&
      c.zoom === rt.zoom &&
      c.data === rt.song
    )
      return state;
    return {
      name: rt.status,
      config: { ...c, position, score, key, signature, loop: rt.loop, zoom: rt.zoom, data: rt.song },
    };
  },
  markup: (el, state) => applyMarkup(el, state.name, state.config),
});

df$.fretboardApi = fretboardApi;
df$.fretboardStates = fretboardStates;

const now = (el: HTMLElement): string => runtimeOf(el)?.status ?? 'default';

/** Stop: the clock stands, the playhead at the start of the loop, else of the score. */
function stop(el: HTMLElement): void {
  const rt = runtimeOf(el);
  const range = loopRange(rt);
  el.api?.setState('default', { position: range ? range[0] : 0 });
}

/** the controls a Space keeps working for themselves */
const SPACE_CONTROLS =
  'button, a[href], input, select, textarea, summary, [contenteditable="true"], [role="button"], [role="slider"], [role="menuitem"], [role="tab"], [role="option"], [role="checkbox"], [role="switch"]';

/** Space plays, pauses and resumes: the tab the key comes from (the tab, or an element bound to it) - unless a control
 *  there takes the key itself -, or, with nothing focused, the tab playing, else the one used last, else the only one;
 *  while another player plays (a Media Timeline, a Video), an idle page's Space is that player's */
function onSpace(e: KeyboardEvent): void | true {
  if (e.key !== ' ' || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
  const target = e.target instanceof Element ? e.target : null;
  const tabs = dfDollar('.fretboard[data-init]').toArray() as HTMLElement[];
  const inside = target?.closest<HTMLElement>('.fretboard');
  const bound = target?.closest<HTMLElement>('[data-fretboard-for]');
  const idle = !target || target === document.body || target === document.documentElement;
  if (!inside && !bound && !idle) return;
  if (!idle && target?.closest(SPACE_CONTROLS)) return;
  const playing = tabs.find((t) => t._fretboard?.status === 'playing');
  if (idle && !playing && dfDollar('[data-state-name="playing"]:not(.fretboard)').length) return;
  const el =
    (inside?._fretboard ? inside : null) ??
    (bound ? tabs.find((t) => t.id === bound.getAttribute('data-fretboard-for')) : null) ??
    playing ??
    [...tabs].filter((t) => t._fretboardUsed).sort((a, b) => b._fretboardUsed - a._fretboardUsed)[0] ??
    (tabs.length === 1 ? tabs[0] : null);
  if (!el?._fretboard?.score) return;
  e.preventDefault();
  el.api?.setState(el._fretboard.status === 'playing' ? 'paused' : 'playing');
  return true;
}

function onAction(el: HTMLElement, control: HTMLElement): void {
  const rt = runtimeOf(el);
  el._fretboardUsed = performance.now();
  const action = control.getAttribute('data-fretboard-action') ?? '';
  if (action === 'toggle') el.api?.setState(rt.status === 'playing' ? 'paused' : 'playing');
  else if (action === 'play') el.api?.setState('playing');
  else if (action === 'pause') {
    if (rt.status === 'playing') el.api?.setState('paused');
  } else if (action === 'stop') stop(el);
  else if (action === 'loop' && rt.score)
    el.api?.setState(now(el), { loop: rt.loop ? null : { start: 1, end: rt.score.measures } });
  else {
    const zoom = zoomFor(rt, action);
    if (zoom !== null) el.api?.setState(now(el), { zoom });
  }
}

/** what a zoom control or key asks for: a step larger, a step smaller, or the default size; null for anything else */
function zoomFor(rt: Runtime, action: string): number | null {
  if (action === 'zoom-in') return zoomOf(rt.zoom * ZOOM_STEP);
  if (action === 'zoom-out') return zoomOf(rt.zoom / ZOOM_STEP);
  if (action === 'zoom-reset') return 1;
  return null;
}

function onControl(el: HTMLElement, control: HTMLElement): void {
  el._fretboardUsed = performance.now();
  const kind = control.getAttribute('data-fretboard-control');
  const value = (control as HTMLInputElement).value;
  if (kind === 'key') el.api?.setState(now(el), { key: value });
  else if (kind === 'signature') el.api?.setState(now(el), { signature: value });
  else if (kind === 'score') el.api?.setState(now(el), { score: value });
  else if (kind === 'position') el.api?.setState(now(el), { position: Number(value) });
}

/** the keys of the sheet: arrows move a beat (Shift: a measure), Home / End, [ and ] set the loop's ends at the
 *  playhead's measure, Escape clears the loop, + and - zoom, 0 back to the default size (Space: onSpace) */
function onKey(el: HTMLElement, e: KeyboardEvent): void {
  const rt = runtimeOf(el);
  const s = rt.score;
  if (!s || e.altKey || e.ctrlKey || e.metaKey) return;
  const p = positionOf(rt);
  const m = Math.min(s.measures - 1, Math.floor(p / s.beats));
  const atBar = p - m * s.beats < 0.01;
  let position: number | null = null;
  let loop: FretboardLoop | null | undefined;
  if (e.key === 'ArrowRight') position = e.shiftKey ? (m + 1) * s.beats : Math.floor(p + 1e-6) + 1;
  else if (e.key === 'ArrowLeft') position = e.shiftKey ? (m - (atBar ? 1 : 0)) * s.beats : Math.ceil(p - 1e-6) - 1;
  else if (e.key === 'Home') position = 0;
  else if (e.key === 'End') position = (s.measures - 1) * s.beats;
  else if (e.key === '[') loop = { start: m + 1, end: rt.loop && rt.loop.end > m ? rt.loop.end : s.measures };
  else if (e.key === ']') loop = { start: rt.loop && rt.loop.start <= m + 1 ? rt.loop.start : 1, end: m + 1 };
  else if (e.key === 'Escape' && rt.loop) loop = null;
  const zoom = zoomFor(rt, ZOOM_KEYS[e.key] ?? '');
  if (zoom !== null) {
    e.preventDefault();
    if (zoom !== rt.zoom) el.api?.setState(now(el), { zoom });
  } else if (position !== null) {
    e.preventDefault();
    el.api?.setState(now(el), { position: clamp(position, 0, s.total - 1) });
  } else if (loop !== undefined) {
    e.preventDefault();
    el.api?.setState(now(el), { loop });
  }
}

/** a click on the sheet: on a measure's number it loops that measure (Shift: the loop grows to it), elsewhere in a
 *  measure the playhead goes to the beat under the pointer */
function onSheetClick(el: HTMLElement, e: MouseEvent): void {
  const rt = runtimeOf(el);
  const s = rt.score;
  const target = e.target as Element;
  const measure = target.closest<HTMLElement>('.fretboard-measure');
  if (!s || !measure) return;
  const n = Number(measure.getAttribute('data-measure'));
  if (target.closest('.fretboard-number')) {
    const loop =
      e.shiftKey && rt.loop
        ? { start: Math.min(rt.loop.start, n), end: Math.max(rt.loop.end, n) }
        : { start: n, end: n };
    el.api?.setState(now(el), { loop });
    return;
  }
  const box = measure.getBoundingClientRect();
  const inner = box.width - 2 * rt.pad;
  const f = inner > 0 ? clamp((e.clientX - box.left - rt.pad) / inner, 0, 0.9999) : 0;
  el.api?.setState(now(el), { position: (n - 1) * s.beats + Math.floor(f * s.beats) });
}

function init() {
  dfDollar('.fretboard:not([data-init])')
    .toArray()
    .forEach((el: HTMLElement) => {
      el.dataset.init = '';
      let data: unknown = null;
      try {
        data = JSON.parse(dfDollar(el).children('script.fretboard-source').text() || 'null');
      } catch {
        data = null;
      }
      const rt: Runtime = {
        song: songOf(data),
        score: null,
        status: 'default',
        position: 0,
        loop: null,
        lineOf: [],
        measure: -1,
        line: -1,
        active: '',
        pad: 8,
        zoom: zoomOf(el.getAttribute('data-zoom')),
        version: 0,
        report: () => fretboardApi.getState(el),
      };
      el._fretboard = rt;
      const first = rt.song.scores.find((x) => x && x.id != null);
      const raw = first ? rawScore(rt.song, String(first.id)) : null;
      rt.score = raw ? build(rt.song, raw) : null;
      // el.store + el.api (AGENTS.md "State through stores"): $('#my-tab').api.setState('playing')
      bindComponent(el, fretboardApi, {
        name: 'default',
        config: {
          position: 0,
          score: rt.score?.id ?? '',
          key: rt.score?.key ?? '',
          signature: rt.score?.signature ?? '',
          loop: null,
          zoom: rt.zoom,
          data: rt.song,
        },
      });
      const sheet = dfDollar(
        `<div class="fretboard-sheet" tabindex="0" role="group" aria-label="${esc(rt.song.title || el.getAttribute('aria-label') || 'Tablature')}"></div>`,
      );
      const header = dfDollar(el).children('.fretboard-header');
      if (header.length) header.after(sheet);
      else dfDollar(el).append(sheet);
      const box = part(el, 'sheet')!;
      dfDollar(box).on('click', (e: MouseEvent) => {
        box.focus({ preventScroll: true });
        onSheetClick(el, e);
      });
      dfDollar(box).on('keydown', (e: KeyboardEvent) => onKey(el, e));
      // the tab used last is the one Space plays on a page with nothing focused
      const used = () => {
        el._fretboardUsed = performance.now();
      };
      dfDollar(el).on('pointerdown', used);
      dfDollar(el).on('focusin', used);
      dfDollar(el).on('click', (e: Event) => {
        const control = (e.target as Element).closest<HTMLElement>('[data-fretboard-action]');
        if (control && control.closest('.fretboard') === el) onAction(el, control);
      });
      dfDollar(el).on('change', (e: Event) => {
        const control = (e.target as Element).closest<HTMLElement>('select[data-fretboard-control]');
        if (control && control.closest('.fretboard') === el) onControl(el, control);
      });
      dfDollar(el).on('input', (e: Event) => {
        const control = (e.target as Element).closest<HTMLElement>('input[data-fretboard-control]');
        if (control && control.closest('.fretboard') === el) onControl(el, control);
      });
      // the lines follow the width: a new width lays the measures out again, the position stays
      let width = 0;
      new ResizeObserver(() => {
        const w = box.clientWidth;
        if (Math.abs(w - width) < 1) return;
        width = w;
        layout(el);
      }).observe(box);
      // another fretting hand or string colours on the tab: its outlets are drawn again at once
      new MutationObserver(() => paint(el, true)).observe(el, {
        attributes: true,
        attributeFilter: ['data-hand', 'data-colors'],
      });
      rt.version++;
      fillControls(el);
      layout(el);
    });
}

// controls bound from outside (data-fretboard-for): one document listener per event type
if (!document.__fretboardInit) {
  document.__fretboardInit = true;
  bindGlobalKeys(onSpace);
  const boundTab = (e: Event, sel: string): [HTMLElement, HTMLElement] | null => {
    const control = (e.target as Element | null)?.closest?.<HTMLElement>(sel);
    const bound = control?.closest<HTMLElement>('[data-fretboard-for]');
    if (!control || !bound || bound.closest('.fretboard')) return null;
    const el = dfDollar(`#${CSS.escape(bound.getAttribute('data-fretboard-for') ?? '')}`).get(0) as
      | HTMLElement
      | undefined;
    return el?._fretboard ? [el, control] : null;
  };
  document.addEventListener('click', (e) => {
    const hit = boundTab(e, '[data-fretboard-action]');
    if (hit) onAction(...hit);
  });
  document.addEventListener('change', (e) => {
    const hit = boundTab(e, 'select[data-fretboard-control]');
    if (hit) onControl(...hit);
  });
  document.addEventListener('input', (e) => {
    const hit = boundTab(e, 'input[data-fretboard-control]');
    if (hit) onControl(...hit);
  });
}

const resolve = (target: string | HTMLElement): HTMLElement | undefined =>
  typeof target === 'string' ? dfDollar(target).get(0) : target;

df$.fretboard = {
  /**
   * Replace the song: the sheet re-renders with its first score, the position keeps its share of the song (setState
   * with { data }).
   * @param target - the .fretboard element or its selector
   * @param data - the song (version 1)
   */
  load: (target: string | HTMLElement, data: FretboardSong): void => {
    const el = resolve(target);
    if (el?._fretboard) el.api?.setState(now(el), { data, score: songOf(data).scores[0]?.id ?? '' });
  },
  /**
   * The current song, as loaded.
   * @param target - the .fretboard element or its selector
   * @returns a copy of the song; a song without scores when the element is unknown
   */
  data: (target: string | HTMLElement): FretboardSong => {
    const el = resolve(target);
    return el?._fretboard ? songOf(runtimeOf(el).song) : { version: 1, scores: [] };
  },
  /**
   * The song's scores, as the key, time signature and score selects list them.
   * @param target - the .fretboard element or its selector
   * @returns every score's id, label, key, time signature and tempo, in data order
   */
  scores: (target: string | HTMLElement): FretboardScoreInfo[] => {
    const el = resolve(target);
    return el?._fretboard ? infosOf(runtimeOf(el).song) : [];
  },
  /**
   * Show another score of the song - by its id, its key or its time signature; the position stays, playing stays playing.
   * @param target - the .fretboard element or its selector
   * @param choice - { score } or { key } and / or { signature }
   * @returns the id of the score shown now
   */
  select: (target: string | HTMLElement, choice: FretboardChoice): string => {
    const el = resolve(target);
    if (!el?._fretboard) return '';
    const c: Record<string, unknown> = {};
    if (choice?.score != null) c.score = String(choice.score);
    else {
      if (choice?.key != null) c.key = String(choice.key);
      if (choice?.signature != null) c.signature = String(choice.signature);
    }
    el.api?.setState(now(el), c);
    return runtimeOf(el).score?.id ?? '';
  },
  /**
   * Start playback (the playing state) - from where the playhead stands, inside the loop when there is one.
   * @param target - the .fretboard element or its selector
   */
  play: (target: string | HTMLElement): void => {
    const el = resolve(target);
    if (el?._fretboard) el.api?.setState('playing');
  },
  /**
   * Pause (the paused state): the playhead stays where it is.
   * @param target - the .fretboard element or its selector
   */
  pause: (target: string | HTMLElement): void => {
    const el = resolve(target);
    if (el?._fretboard && runtimeOf(el).status === 'playing') el.api?.setState('paused');
  },
  /**
   * Stop (the default state): the playhead goes to the start of the loop, else of the score.
   * @param target - the .fretboard element or its selector
   */
  stop: (target: string | HTMLElement): void => {
    const el = resolve(target);
    if (el?._fretboard) stop(el);
  },
  /**
   * Move the playhead to a beat of a measure; playing stays playing.
   * @param target - the .fretboard element or its selector
   * @param measure - the measure, 1 = the first
   * @param beat - the beat in it, 1 = the first (default 1)
   */
  seek: (target: string | HTMLElement, measure: number, beat: number = 1): void => {
    const el = resolve(target);
    const s = el?._fretboard ? runtimeOf(el).score : null;
    if (el && s) el.api?.setState(now(el), { position: (Math.max(1, measure) - 1) * s.beats + Math.max(0, beat - 1) });
  },
  /**
   * Loop measures - playback repeats them; the playhead goes to their start when it stands outside - or clear the loop.
   * @param target - the .fretboard element or its selector
   * @param start - the first measure, 1 = the first; null (or nothing) clears the loop
   * @param end - the last measure (default: the first)
   * @returns the loop now, null when there is none
   */
  loop: (target: string | HTMLElement, start?: number | null, end?: number): FretboardLoop | null => {
    const el = resolve(target);
    if (!el?._fretboard) return null;
    const rt = runtimeOf(el);
    el.api?.setState(now(el), { loop: start == null ? null : { start, end: end ?? start } });
    return rt.loop ? { ...rt.loop } : null;
  },
  /**
   * Scale the sheet - the lines break again for it, the line being played stays in view (setState with { zoom }).
   * @param target - the .fretboard element or its selector
   * @param scale - 1 is the default size, from 0.5 to 3
   * @returns the scale now
   */
  zoom: (target: string | HTMLElement, scale: number): number => {
    const el = resolve(target);
    if (!el?._fretboard) return 1;
    el.api?.setState(now(el), { zoom: scale });
    return runtimeOf(el).zoom;
  },
  /**
   * The items under the playhead, or under another position.
   * @param target - the .fretboard element or its selector
   * @param position - beats from the start; default: the playhead's
   * @returns the chords, notes and syllables there, in lane order
   */
  active: (target: string | HTMLElement, position?: number): FretboardActive[] => {
    const el = resolve(target);
    const rt = el?._fretboard ? runtimeOf(el) : null;
    return rt?.score ? activeAt(rt.score, position ?? positionOf(rt)) : [];
  },
};

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
