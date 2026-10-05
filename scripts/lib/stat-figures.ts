/**
 * Why: a figure on a page (a slide's "54.0 KiB", "2.3 s for 81 gates") is a
 * claim about a measurement - so it is written FROM the measurement and
 * checked against it. A page marks such a figure with the measurement it
 * shows:
 *
 *   <b data-stat="stats.apps.messenger.totalSizeGzMinified" data-stat-format="kib">54.0</b>
 *   <span data-stat="verify.seconds" data-stat-format="s">142.3</span>
 *
 * `stats.*` reads dist/stats.json, `verify.*` src/documentation/data/
 * verify-timing.json (scripts/time-verify.ts); a path may end in `.length`.
 * scripts/stat-figures.ts rewrites every marked figure in pages/*.mdx;
 * verify's `stat figures` gate fails when one disagrees. Pure module (no fs)
 * - tests/stat-figures.test.ts pins it.
 */

export type StatSources = Record<string, unknown>;

/** formats a figure may use */
export const STAT_FORMATS = ['int', 'kib', 'mib', 's', 'min', 'pct', 'text'] as const;
export type StatFormat = (typeof STAT_FORMATS)[number];

/** `<tag … data-stat="path" …>figure</tag>` - the figure is plain text */
const FIGURE = /<([a-z][a-z0-9]*)\b([^>]*?\bdata-stat="([^"]+)"[^>]*)>([^<]*)<\/\1>/g;

/** The value at a dotted path (`stats.apps.notes.components.length`). */
export function statValue(sources: StatSources, path: string): unknown {
  let v: unknown = sources;
  for (const key of path.split('.')) {
    if (v === null || v === undefined) return undefined;
    v = (v as Record<string, unknown>)[key];
  }
  return v;
}

/** A value as the page shows it. */
export function formatStat(value: unknown, format: StatFormat = 'int'): string {
  if (format === 'text') return String(value);
  const n = Number(value);
  switch (format) {
    case 'kib':
      return (n / 1024).toFixed(1);
    case 'mib':
      return (n / 1024 / 1024).toFixed(2);
    case 's':
      return n.toFixed(1);
    case 'min':
      return `${Math.floor(n / 60)}:${String(Math.round(n % 60)).padStart(2, '0')}`;
    case 'pct':
      return String(Math.round(n * 100));
    default:
      return Math.round(n).toLocaleString('en-US');
  }
}

type Figure = { index: number; length: number; open: string; tag: string; path: string; format: StatFormat; shown: string };

function figures(text: string): Figure[] {
  return [...text.matchAll(FIGURE)].map((m) => {
    const format = (m[2].match(/\bdata-stat-format="([^"]+)"/)?.[1] ?? 'int') as StatFormat;
    return { index: m.index!, length: m[0].length, open: `<${m[1]}${m[2]}>`, tag: m[1], path: m[3], format, shown: m[4] };
  });
}

/** Every marked figure that disagrees with its measurement (or names none). */
export function statFigureProblems(text: string, sources: StatSources, file: string): string[] {
  const out: string[] = [];
  for (const f of figures(text)) {
    if (!(STAT_FORMATS as readonly string[]).includes(f.format)) {
      out.push(`${file}: data-stat="${f.path}" has an unknown data-stat-format="${f.format}" (${STAT_FORMATS.join(', ')})`);
      continue;
    }
    const value = statValue(sources, f.path);
    if (value === undefined) {
      out.push(`${file}: data-stat="${f.path}" names no measurement`);
      continue;
    }
    const want = formatStat(value, f.format);
    if (f.shown !== want) out.push(`${file}: data-stat="${f.path}" shows "${f.shown}" - the measurement says "${want}"`);
  }
  return out;
}

/** The text with every marked figure written from its measurement. */
export function rewriteStatFigures(text: string, sources: StatSources): string {
  let out = '';
  let at = 0;
  for (const f of figures(text)) {
    const value = statValue(sources, f.path);
    out += text.slice(at, f.index);
    out += value === undefined ? text.slice(f.index, f.index + f.length) : `${f.open}${formatStat(value, f.format)}</${f.tag}>`;
    at = f.index + f.length;
  }
  return out + text.slice(at);
}
