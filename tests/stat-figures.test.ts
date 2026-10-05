import { describe, expect, it } from 'vitest';
import { formatStat, rewriteStatFigures, statFigureProblems, statValue } from '../scripts/lib/stat-figures.ts';

/**
 * Why: a slide's measured figures are written from, and gated against, the
 * measurement they name (scripts/lib/stat-figures.ts). Pins the paths, the
 * formats, the rewrite and the gate's messages.
 */

const sources = { stats: { apps: { notes: { totalSizeGzMinified: 59392, components: ['a', 'b', 'c'] } } }, verify: { seconds: 142.34 } };

describe('statValue', () => {
  it('walks dotted paths - .length included - and answers undefined for a missing one', () => {
    expect(statValue(sources, 'stats.apps.notes.totalSizeGzMinified')).toBe(59392);
    expect(statValue(sources, 'stats.apps.notes.components.length')).toBe(3);
    expect(statValue(sources, 'stats.apps.chat.totalSizeGzMinified')).toBeUndefined();
  });
});

describe('formatStat', () => {
  it('formats KiB, seconds, minutes, percent and integers', () => {
    expect(formatStat(59392, 'kib')).toBe('58.0');
    expect(formatStat(142.34, 's')).toBe('142.3');
    expect(formatStat(142.34, 'min')).toBe('2:22');
    expect(formatStat(0.746, 'pct')).toBe('75');
    expect(formatStat(1540)).toBe('1,540');
  });
});

describe('figures', () => {
  const page = '<b data-stat="stats.apps.notes.totalSizeGzMinified" data-stat-format="kib">57.1</b> in <span data-stat="verify.seconds" data-stat-format="s">142.3</span> s';
  it('reports the figures that disagree with their measurement', () => {
    expect(statFigureProblems(page, sources, 'deck.mdx')).toEqual(['deck.mdx: data-stat="stats.apps.notes.totalSizeGzMinified" shows "57.1" - the measurement says "58.0"']);
    expect(statFigureProblems('<i data-stat="stats.nope">1</i>', sources, 'x')).toEqual(['x: data-stat="stats.nope" names no measurement']);
  });
  it('rewrites every figure from its measurement and leaves the markup alone', () => {
    const next = rewriteStatFigures(page, sources);
    expect(next).toBe(page.replace('>57.1<', '>58.0<'));
    expect(statFigureProblems(next, sources, 'deck.mdx')).toEqual([]);
  });
});
