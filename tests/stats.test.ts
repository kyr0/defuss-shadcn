import { describe, expect, it } from 'vitest';
import {
  aggregateStats,
  buildStatsText,
  formatKiB,
  statsClaimProblems,
  statsClaimText,
  STATS_FILE,
  type ComponentMeasure,
} from '../scripts/lib/stats.ts';

/**
 * Why: dist/stats.json is the published answer to "how many / how big" — its
 * totals must be arithmetically derived from the component list, never typed
 * by hand. The measurement side (fs + gzip) lives in stats-files.ts; this
 * test pins the pure aggregation the JSON is serialized from, in browser
 * mode — same split as tests/minify.test.ts.
 */

const comp = (over: Partial<ComponentMeasure> & Pick<ComponentMeasure, 'name' | 'type'>): ComponentMeasure => ({
  withJs: false,
  jsSize: 0,
  jsSizeMinified: 0,
  cssSize: 10,
  cssSizeMinified: 5,
  totalSizeGz: 8,
  totalSizeGzMinified: 4,
  ...over,
});

describe('aggregateStats', () => {
  const doc = aggregateStats([
    comp({ name: 'badge', type: 'ATM' }),
    comp({
      name: 'dialog',
      type: 'MOL',
      withJs: true,
      jsSize: 100,
      jsSizeMinified: 40,
      cssSize: 20,
      cssSizeMinified: 10,
      totalSizeGz: 60,
      totalSizeGzMinified: 25,
    }),
    comp({ name: 'hero', type: 'BLK' }),
  ]);

  it('counts the total and per-type (all five types present, zero-filled)', () => {
    expect(doc.total).toBe(3);
    expect(doc.byType).toEqual({ ATM: 1, MOL: 1, ORG: 0, BLK: 1, TPL: 0 });
  });

  it('splits by withJs / withoutJs', () => {
    expect(doc.withJs).toBe(1);
    expect(doc.withoutJs).toBe(2);
    expect(doc.components.dialog.withJs).toBe(true);
    expect(doc.components.badge.withJs).toBe(false);
  });

  it('derives per-component and grand totals from the parts', () => {
    expect(doc.components.dialog.totalSize).toBe(120); // js 100 + css 20
    expect(doc.components.dialog.totalSizeMinified).toBe(50);
    expect(doc.components.badge.totalSize).toBe(10);
    expect(doc.totalSize).toBe(140); // 120 + 10 + 10
    expect(doc.totalSizeMinified).toBe(60);
    expect(doc.totalSizeGz).toBe(76); // gz is the sum of per-file gzips
    expect(doc.totalSizeGzMinified).toBe(33);
  });

  it('rejects an unknown taxonomy type instead of publishing a wrong count', () => {
    expect(() => aggregateStats([comp({ name: 'x', type: 'WAT' as never })])).toThrow(/unknown component type/);
  });

  it('emits an empty but well-shaped document for no components', () => {
    const empty = aggregateStats([]);
    expect(empty.total).toBe(0);
    expect(empty.withJs).toBe(0);
    expect(empty.withoutJs).toBe(0);
    expect(empty.components).toEqual({});
    expect(empty.byType).toEqual({ ATM: 0, MOL: 0, ORG: 0, BLK: 0, TPL: 0 });
  });
});

describe('formatKiB', () => {
  it.each([
    [0, '0.0 KiB'],
    [1024, '1.0 KiB'],
    [136136, '132.9 KiB'],
    [69554, '67.9 KiB'],
  ])('renders %d bytes as %s', (bytes, want) => expect(formatKiB(bytes)).toBe(want));
});

describe('statsClaimText / statsClaimProblems', () => {
  const doc = aggregateStats([
    comp({ name: 'badge', type: 'ATM' }),
    comp({ name: 'dialog', type: 'MOL', withJs: true, jsSize: 100 }),
  ]);

  it('states every machine-checked number in one sentence', () => {
    const claim = statsClaimText(doc);
    expect(claim).toBe(
      '2 components — 1 with JavaScript, 1 CSS-only — 0.0 KiB minified + compressed' +
        ' — 0.0 KiB as the all.css/all.js bundle',
    );
  });

  it('includes the measured bundle size in the claim', () => {
    const withBundle = aggregateStats([comp({ name: 'badge', type: 'ATM' })], {
      jsSize: 1000,
      jsSizeMinified: 500,
      cssSize: 2000,
      cssSizeMinified: 1000,
      totalSizeGz: 900,
      totalSizeGzMinified: 1024,
    });
    expect(statsClaimText(withBundle)).toContain('1.0 KiB as the all.css/all.js bundle');
    expect(withBundle.bundle.totalSizeGzMinified).toBe(1024);
    // the bundle is an alternative consumption path — never folded into component totals
    expect(withBundle.totalSizeGzMinified).toBe(4);
  });

  it('passes when the file states the claim (markup and bold allowed)', () => {
    const claim = statsClaimText(doc);
    expect(statsClaimProblems(`<p><strong>${claim}.</strong></p>`, 'x', doc)).toEqual([]);
    expect(statsClaimProblems(`**${claim}.**`, 'x', doc)).toEqual([]);
  });

  it('flags stale numbers — a value that no longer matches stats.json is misinformation', () => {
    const stale = statsClaimText(doc).replace('2 components', '3 components');
    const problems = statsClaimProblems(`text ${stale} more`, 'README.md', doc);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('README.md');
    expect(problems[0]).toContain(statsClaimText(doc));
  });

  it('flags scattered numbers that do not form the contiguous sentence', () => {
    expect(statsClaimProblems('2 components. 1 CSS-only. KiB sizes elsewhere.', 'x', doc)).toHaveLength(1);
  });
});

describe('buildStatsText', () => {
  it('is the exact serialization of aggregateStats (writer == verify gate)', () => {
    const measures = [comp({ name: 'badge', type: 'ATM' })];
    expect(buildStatsText(measures)).toBe(`${JSON.stringify(aggregateStats(measures), null, 2)}\n`);
  });

  it('is deterministic (no timestamps — rebuilds stay byte-identical)', () => {
    const measures = [comp({ name: 'badge', type: 'ATM' })];
    expect(buildStatsText(measures)).toBe(buildStatsText(measures));
  });

  it('names the published file stats.json', () => {
    expect(STATS_FILE).toBe('stats.json');
  });
});
