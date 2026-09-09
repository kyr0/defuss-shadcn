import { COMPONENT_TYPES, type ComponentType } from './taxonomy.ts';

/**
 * Why: consumers and agents want one machine-readable answer to "how big is
 * this system" without walking dist/ themselves — counts per taxonomy type,
 * the JS/CSS-only split, and per-component byte sizes (readable, minified,
 * gzipped). scripts/stats.ts measures dist/components/ and publishes
 * dist/stats.json; this module holds the pure aggregation so
 * tests/stats.test.ts can pin it in Vitest browser mode (no fs/zlib there) —
 * same split as skill.ts / skill-files.ts.
 */

/** Filename of the generated document, relative to dist/. */
export const STATS_FILE = 'stats.json';

/** KiB with one decimal — 136136 → "132.9 KiB". The ONE size format the
 *  README and the doc-site index are allowed to advertise; verify's
 *  `stats claim` gate compares this exact rendering, so bytes → prose can
 *  never drift into stale or invented numbers. */
export function formatKiB(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

/** One component as measured from the shipped files. Sizes are bytes;
 *  gzip sizes are per-file (each asset is served compressed on its own), so
 *  a component's gzip total is the sum of its individually gzipped files.
 *  `withJs` is file presence, not jsSize > 0, so an empty file never hides
 *  that a component ships behavior. */
export type ComponentMeasure = {
  name: string;
  type: ComponentType;
  withJs: boolean;
  jsSize: number;
  jsSizeMinified: number;
  cssSize: number;
  cssSizeMinified: number;
  totalSizeGz: number;
  totalSizeGzMinified: number;
};

/** A measured component with the derived totals, as published in stats.json. */
export type ComponentStats = ComponentMeasure & {
  totalSize: number;
  totalSizeMinified: number;
};

/** The single-file bundle (all.css/all.js + min twins), measured like a component. */
export type BundleStats = {
  jsSize: number;
  jsSizeMinified: number;
  cssSize: number;
  cssSizeMinified: number;
  totalSizeGz: number;
  totalSizeGzMinified: number;
};

/** Zero bundle — the default when none was measured (keeps the doc shape stable). */
export const EMPTY_BUNDLE: BundleStats = {
  jsSize: 0,
  jsSizeMinified: 0,
  cssSize: 0,
  cssSizeMinified: 0,
  totalSizeGz: 0,
  totalSizeGzMinified: 0,
};

/** The whole dist/stats.json document. */
export type StatsDoc = {
  total: number;
  byType: Record<ComponentType, number>;
  withJs: number;
  withoutJs: number;
  totalSize: number;
  totalSizeMinified: number;
  totalSizeGz: number;
  totalSizeGzMinified: number;
  bundle: BundleStats;
  components: Record<string, ComponentStats>;
};

/**
 * Why: the single place every published number is computed, so the per-type
 * counts, the JS split and all size totals can never disagree with the
 * component list. Totals are derived from the per-component parts (never
 * passed in), `byType` is zero-initialized for all five taxonomy types so
 * the shape is stable, and the components map keeps caller (alphabetical)
 * order — the document is deterministic byte-for-byte across builds. The
 * bundle block is measured by the caller (fs + gzip) and passes through
 * untouched — the bundle is an ALTERNATIVE way to consume the same components,
 * so its bytes are never folded into the per-component totals.
 */
export function aggregateStats(
  components: readonly ComponentMeasure[],
  bundle: BundleStats = EMPTY_BUNDLE,
): StatsDoc {
  const doc: StatsDoc = {
    total: components.length,
    byType: Object.fromEntries(COMPONENT_TYPES.map((t) => [t, 0])) as Record<ComponentType, number>,
    withJs: 0,
    withoutJs: 0,
    totalSize: 0,
    totalSizeMinified: 0,
    totalSizeGz: 0,
    totalSizeGzMinified: 0,
    bundle,
    components: {},
  };
  for (const c of components) {
    if (!(COMPONENT_TYPES as readonly string[]).includes(c.type))
      throw new Error(`${c.name}: unknown component type "${c.type}" (allowed: ${COMPONENT_TYPES.join(', ')})`);
    const stats: ComponentStats = {
      ...c,
      totalSize: c.jsSize + c.cssSize,
      totalSizeMinified: c.jsSizeMinified + c.cssSizeMinified,
    };
    doc.byType[c.type]++;
    if (c.withJs) doc.withJs++;
    else doc.withoutJs++;
    doc.totalSize += stats.totalSize;
    doc.totalSizeMinified += stats.totalSizeMinified;
    doc.totalSizeGz += c.totalSizeGz;
    doc.totalSizeGzMinified += c.totalSizeGzMinified;
    doc.components[c.name] = stats;
  }
  return doc;
}

/**
 * Why: one canonical serializer shared by scripts/stats.ts (writer) and
 * verify.ts (freshness gate) so the gate compares byte-for-byte against
 * exactly what the writer produces. Deliberately timestamp-free: a generated
 * date would make every rebuild dirty and the verify gate meaningless.
 */
export function buildStatsText(
  components: readonly ComponentMeasure[],
  bundle: BundleStats = EMPTY_BUNDLE,
): string {
  return `${JSON.stringify(aggregateStats(components, bundle), null, 2)}\n`;
}

/**
 * Why: the single sentence README.md and the doc-site index must state
 * verbatim (counts + the production KiB footprint, generated from
 * dist/stats.json). Human-facing prose that a machine can check — "we lack
 * information or information is outdated" becomes a failing gate, not a
 * silent lie. Only minified+compressed sizes are claimed: that's the
 * payload a consumer actually ships; the raw-gzip figures stay in stats.json.
 * The bundle figure covers both all.min.* files together — the two requests
 * a bundle consumer actually makes.
 */
export function statsClaimText(doc: StatsDoc): string {
  return (
    `${doc.total} components — ${doc.withJs} with JavaScript, ${doc.withoutJs} CSS-only` +
    ` — ${formatKiB(doc.totalSizeGzMinified)} minified + compressed` +
    ` — ${formatKiB(doc.bundle.totalSizeGzMinified)} as the all.css/all.js bundle`
  );
}

/** Strip markup/markdown/no-break spaces and collapse whitespace so the
 *  claim can sit inside HTML tags or **bold** without breaking the match. */
const normalizeForClaim = (text: string): string =>
  text.replace(/<[^>]+>/g, ' ').replace(/[*\u00a0]/g, '').replace(/\s+/g, ' ');

/**
 * Why: verify's `stats claim` gate — one function for both files (same
 * contract as readmeCssOnlyProblems). The sentence must appear contiguously
 * (markup between words breaks the match on purpose: the claim must be
 * stated as one thought, prominently, not scattered across the page).
 */
export function statsClaimProblems(text: string, file: string, doc: StatsDoc): string[] {
  const claim = statsClaimText(doc);
  if (normalizeForClaim(text).includes(claim)) return [];
  return [`${file} does not state the current footprint verbatim — expected: "${claim}"`];
}
