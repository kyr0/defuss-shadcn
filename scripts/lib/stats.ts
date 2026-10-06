import { COMPONENT_TYPES, type ComponentType } from './taxonomy.ts';

/**
 * Why: consumers and agents want one machine-readable answer to "how big is
 * this system" without walking dist/ themselves - counts per taxonomy type,
 * the JS/CSS-only split, and per-component byte sizes (readable, minified,
 * gzipped). scripts/stats.ts measures dist/components/ and publishes
 * dist/stats.json; this module holds the pure aggregation so
 * tests/stats.test.ts can pin it in Vitest browser mode (no fs/zlib there) —
 * same split as skill.ts / skill-files.ts.
 */

/** Filename of the generated document, relative to dist/. */
export const STATS_FILE = 'stats.json';

/** KiB with one decimal - 136136 → "132.9 KiB". The ONE size format the
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
  /** all.min.js / all.min.css (or core, or an app) each gzipped on its own - one request each */
  jsSizeGzMinified: number;
  cssSizeGzMinified: number;
};

/** Zero bundle - the default when none was measured (keeps the doc shape stable). */
export const EMPTY_BUNDLE: BundleStats = {
  jsSize: 0,
  jsSizeMinified: 0,
  cssSize: 0,
  cssSizeMinified: 0,
  totalSizeGz: 0,
  totalSizeGzMinified: 0,
  jsSizeGzMinified: 0,
  cssSizeGzMinified: 0,
};

/** One Application Scaffold built on its own (dist/apps/{app}.*): core + the
 *  components its markup uses - what a real app ships. */
export type AppStats = BundleStats & {
  /** the scaffold page it is generated from (pages/{page}.mdx) */
  page: string;
  /** the full-screen page that loads only this bundle */
  href: string;
  /** the components in the bundle, alphabetical */
  components: string[];
};

/** One sidebar section built on its own (scripts/lib/sections.ts): only its
 *  members, loaded after core.* - the Bundles & Downloads page renders these.
 *  VERIFIED: (verify `stats.json fresh`) regenerated from dist/ on every build. */
export type SectionStats = BundleStats & {
  /** the sidebar section heading */
  heading: string;
  /** its components, in sidebar order */
  members: string[];
  /** the headings of the other sections its documented markup uses */
  needs: string[];
  /** dist-relative bundle files a page links (the min twins sit beside them) */
  files: string[];
};

/** Extra measurements the caller passes through (fs-bound, see stats-files.ts). */
export type StatsExtra = { tokens?: number; examples?: number; apps?: Record<string, AppStats>; templateGroups?: Record<string, number>; bundles?: Record<string, BundleStats>; sections?: Record<string, SectionStats> };

/** The whole dist/stats.json document. */
export type StatsDoc = {
  total: number;
  /** component folders per taxonomy type (sums to total) */
  byType: Record<ComponentType, number>;
  /** pages that are whole templates (decks, website templates) - TPL in the
   *  nav without a component folder of their own */
  templatePages: number;
  /** every template: TPL components + template pages */
  templates: number;
  /** the template pages per sidebar section (Application → the scaffolds,
   *  Presentations → the decks, Website → the site templates) */
  templateGroups: Record<string, number>;
  /** TOK - the design tokens (custom properties of the token file) */
  tokens: number;
  /** EXL - the live examples on the documentation pages */
  examples: number;
  withJs: number;
  withoutJs: number;
  totalSize: number;
  totalSizeMinified: number;
  totalSizeGz: number;
  totalSizeGzMinified: number;
  bundle: BundleStats;
  /** core.js + core.min.js (morph + query + shared) - the modular path's fixed cost */
  core: BundleStats;
  /** the extra bundles (scripts/lib/bundles.ts) - components kept out of all.*, e.g. wysiwyg */
  bundles: Record<string, BundleStats>;
  /** one bundle per sidebar section, in sidebar order (scripts/lib/sections.ts) */
  sections: Record<string, SectionStats>;
  components: Record<string, ComponentStats>;
  /** the Application Scaffolds, each built on its own */
  apps: Record<string, AppStats>;
};

/**
 * Why: the single place every published number is computed, so the per-type
 * counts, the JS split and all size totals can never disagree with the
 * component list. Totals are derived from the per-component parts (never
 * passed in), `byType` is zero-initialized for all five taxonomy types so
 * the shape is stable, and the components map keeps caller (alphabetical)
 * order - the document is deterministic byte-for-byte across builds. The
 * bundle block is measured by the caller (fs + gzip) and passes through
 * untouched - the bundle is an ALTERNATIVE way to consume the same components,
 * so its bytes are never folded into the per-component totals.
 */
export function aggregateStats(
  components: readonly ComponentMeasure[],
  bundle: BundleStats = EMPTY_BUNDLE,
  core: BundleStats = EMPTY_BUNDLE,
  templatePages = 0,
  extra: StatsExtra = {},
): StatsDoc {
  const doc: StatsDoc = {
    total: components.length,
    byType: Object.fromEntries(COMPONENT_TYPES.map((t) => [t, 0])) as Record<ComponentType, number>,
    templatePages,
    templates: templatePages,
    templateGroups: extra.templateGroups ?? {},
    tokens: extra.tokens ?? 0,
    examples: extra.examples ?? 0,
    withJs: 0,
    withoutJs: 0,
    totalSize: 0,
    totalSizeMinified: 0,
    totalSizeGz: 0,
    totalSizeGzMinified: 0,
    bundle,
    core,
    bundles: extra.bundles ?? {},
    sections: extra.sections ?? {},
    components: {},
    apps: extra.apps ?? {},
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
    if (c.type === 'TPL') doc.templates++;
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
  core: BundleStats = EMPTY_BUNDLE,
  templatePages = 0,
  extra: StatsExtra = {},
): string {
  return `${JSON.stringify(aggregateStats(components, bundle, core, templatePages, extra), null, 2)}\n`;
}

/**
 * Why: the single sentence README.md and the doc-site index must state
 * verbatim (counts + the production KiB footprint, generated from
 * dist/stats.json). Human-facing prose that a machine can check - "we lack
 * information or information is outdated" becomes a failing gate, not a
 * silent lie. Only minified+compressed sizes are claimed: that's the
 * payload a consumer actually ships; the raw-gzip figures stay in stats.json.
 * The bundle figure covers both all.min.* files together - the two requests
 * a bundle consumer actually makes.
 */
export function statsClaimText(doc: StatsDoc): string {
  return (
    `${doc.total} components - ${doc.withJs} with JavaScript, ${doc.withoutJs} CSS-only` +
    ` - ${formatKiB(doc.totalSizeGzMinified)} minified + compressed` +
    ` - ${formatKiB(doc.bundle.totalSizeGzMinified)} as the all.css/all.js bundle`
  );
}

/** Strip markup/markdown/no-break spaces and collapse whitespace so the
 *  claim can sit inside HTML tags or **bold** without breaking the match. */
const normalizeForClaim = (text: string): string =>
  text.replace(/<[^>]+>/g, ' ').replace(/[*\u00a0]/g, '').replace(/\s+/g, ' ');

/**
 * Why: verify's `stats claim` gate - one function for both files (same
 * contract as readmeCssOnlyProblems). The sentence must appear contiguously
 * (markup between words breaks the match on purpose: the claim must be
 * stated as one thought, prominently, not scattered across the page).
 */
export function statsClaimProblems(text: string, file: string, doc: StatsDoc): string[] {
  const claim = statsClaimText(doc);
  if (normalizeForClaim(text).includes(claim)) return [];
  return [`${file} does not state the current footprint verbatim - expected: "${claim}"`];
}
