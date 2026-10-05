import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { skillEntries } from './skill-files.ts';
import { EXTRA_BUNDLES } from './bundles.ts';
import { aggregateStats, buildStatsText, STATS_FILE, type AppStats, type BundleStats, type StatsDoc } from './stats.ts';
import { appPlans } from './apps-files.ts';
import { standaloneAppFile } from './docs-ssg.ts';
import type { ComponentType } from './taxonomy.ts';
import { ALL_PAGES, NAV, flattenNav } from '../../src/documentation/lib/nav.ts';

/** TOK: the distinct custom properties the token file defines (light + dark
 *  share names - each token counts once). */
export function countTokens(distDir: string): number {
  const file = join(distDir, 'theme', 'utils', 'default-semantic-tokens.css');
  if (!existsSync(file)) return 0;
  return new Set([...readFileSync(file, 'utf8').matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1])).size;
}

/** EXL: the live examples on the documentation pages - every ```… example
 *  fence in the MDX sources (each renders one CodeExample). */
export function countExamples(): number {
  const dir = join(import.meta.dirname, '..', '..', 'src', 'documentation', 'pages');
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((f) => f.endsWith('.mdx'))
    .reduce((n, f) => n + (readFileSync(join(dir, f), 'utf8').match(/^```[a-z]+ example\b/gm)?.length ?? 0), 0);
}

/** Template pages: nav items typed TPL that are pages, not component folders
 *  (the decks, the website templates). The nav is the one list of pages. */
export function countTemplatePages(componentNames: readonly string[]): number {
  const comps = new Set(componentNames);
  return ALL_PAGES.filter((p) => p.type === 'TPL' && !comps.has(p.href.replace(/\.html$/, ''))).length;
}

/** The template pages per sidebar section, in sidebar order. */
export function templateGroups(componentNames: readonly string[]): Record<string, number> {
  const comps = new Set(componentNames);
  const out: Record<string, number> = {};
  for (const sec of NAV) {
    const n = flattenNav(sec.items).filter((p) => p.type === 'TPL' && !comps.has(p.href.replace(/\.html$/, ''))).length;
    if (n) out[sec.heading] = n;
  }
  return out;
}

/**
 * Why: the file-system half of dist/stats.json generation, split from the
 * pure aggregation (./stats.ts) so the pure half stays importable in Vitest
 * browser mode (no node:fs / node:zlib there). scripts/stats.ts (the writer)
 * and verify.ts (the `stats.json fresh` gate) both call these, so the gate
 * compares against exactly what the writer writes. Gzip uses node:zlib
 * defaults - the same compression CDNs apply per asset on the wire.
 */

const bytesOf = (file: string): Buffer | null => (existsSync(file) ? readFileSync(file) : null);
const sizeOf = (b: Buffer | null): number => b?.byteLength ?? 0;
const gzOf = (b: Buffer | null): number => (b ? gzipSync(b).byteLength : 0);

/**
 * Why: measure every component folder in stable alphabetical order. The
 * taxonomy type comes from the component-skill.md frontmatter (single source
 * of truth); a component whose skill is missing/unparsable throws - same
 * fail-closed contract as skillEntries, because an uncounted component would
 * silently shrink the published totals.
 */
export function measureComponents(componentsDir: string) {
  const types = new Map(skillEntries(componentsDir).map((e) => [e.folder, e.type as ComponentType]));
  return readdirSync(componentsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .map((name) => {
      const type = types.get(name);
      if (!type)
        throw new Error(
          `components/${name}/component-skill.md missing valid frontmatter - its taxonomy type is unknown (see AGENTS.md "Component skill template")`,
        );
      const dir = join(componentsDir, name);
      const js = bytesOf(join(dir, `${name}.js`));
      const jsMin = bytesOf(join(dir, `${name}.min.js`));
      const css = bytesOf(join(dir, `${name}.css`));
      const cssMin = bytesOf(join(dir, `${name}.min.css`));
      return {
        name,
        type,
        withJs: js !== null,
        jsSize: sizeOf(js),
        jsSizeMinified: sizeOf(jsMin),
        cssSize: sizeOf(css),
        cssSizeMinified: sizeOf(cssMin),
        totalSizeGz: gzOf(js) + gzOf(css),
        totalSizeGzMinified: gzOf(jsMin) + gzOf(cssMin),
      };
    });
}

/**
 * Why: measure the single-file bundle (scripts/bundle.ts → minify.ts twins)
 * like a component. Missing files measure as 0 rather than throwing - stats
 * can run on a dist/ that predates the bundle, and the `stats.json fresh`
 * gate forces a regeneration as soon as it exists.
 */
export function measureBundle(componentsDir: string, name = 'all'): BundleStats {
  const js = bytesOf(join(componentsDir, `${name}.js`));
  const jsMin = bytesOf(join(componentsDir, `${name}.min.js`));
  const css = bytesOf(join(componentsDir, `${name}.css`));
  const cssMin = bytesOf(join(componentsDir, `${name}.min.css`));
  return {
    jsSize: sizeOf(js),
    jsSizeMinified: sizeOf(jsMin),
    cssSize: sizeOf(css),
    cssSizeMinified: sizeOf(cssMin),
    totalSizeGz: gzOf(js) + gzOf(css),
    totalSizeGzMinified: gzOf(jsMin) + gzOf(cssMin),
    jsSizeGzMinified: gzOf(jsMin),
    cssSizeGzMinified: gzOf(cssMin),
  };
}

/** the extra bundles (scripts/lib/bundles.ts), each measured like all.* */
export function measureExtraBundles(componentsDir: string): Record<string, BundleStats> {
  return Object.fromEntries(Object.keys(EXTRA_BUNDLES).map((b) => [b, measureBundle(componentsDir, b)]));
}

/**
 * Why: measure the core runtime pair (core.js: morph + query + shared;
 * core.css: the four theme utility sheets - plans/core-bundle.md) - the fixed
 * cost every modular consumer pays once. all.js/all.css embed/carry the same
 * payload, so the bundle figures already include core.
 */
export function measureCore(componentsDir: string): BundleStats {
  const js = bytesOf(join(componentsDir, 'core.js'));
  const jsMin = bytesOf(join(componentsDir, 'core.min.js'));
  const css = bytesOf(join(componentsDir, 'core.css'));
  const cssMin = bytesOf(join(componentsDir, 'core.min.css'));
  return {
    jsSize: sizeOf(js),
    jsSizeMinified: sizeOf(jsMin),
    cssSize: sizeOf(css),
    cssSizeMinified: sizeOf(cssMin),
    totalSizeGz: gzOf(js) + gzOf(css),
    totalSizeGzMinified: gzOf(jsMin) + gzOf(cssMin),
    jsSizeGzMinified: gzOf(jsMin),
    cssSizeGzMinified: gzOf(cssMin),
  };
}

/**
 * Why: the Application Scaffolds built on their own (bundle.ts step 3) - each
 * measured like the bundle, with the component list it was built from. The
 * list is resolved again from the sources (apps-files.ts), so the gate fails
 * when a scaffold's markup changed but dist/apps/ was not rebuilt.
 */
export function measureApps(distDir: string): Record<string, AppStats> {
  const dir = join(distDir, 'apps');
  const out: Record<string, AppStats> = {};
  for (const plan of appPlans()) {
    const js = bytesOf(join(dir, `${plan.name}.js`));
    const jsMin = bytesOf(join(dir, `${plan.name}.min.js`));
    const css = bytesOf(join(dir, `${plan.name}.css`));
    const cssMin = bytesOf(join(dir, `${plan.name}.min.css`));
    out[plan.name] = {
      page: plan.slug,
      href: standaloneAppFile(plan.slug),
      components: plan.components,
      jsSize: sizeOf(js),
      jsSizeMinified: sizeOf(jsMin),
      cssSize: sizeOf(css),
      cssSizeMinified: sizeOf(cssMin),
      totalSizeGz: gzOf(js) + gzOf(css),
      totalSizeGzMinified: gzOf(jsMin) + gzOf(cssMin),
      jsSizeGzMinified: gzOf(jsMin),
      cssSizeGzMinified: gzOf(cssMin),
    };
  }
  return out;
}

/** The full stats.json text for one dist/ tree - writer and gate share this. */
export function buildStatsFileText(distDir: string): string {
  const componentsDir = join(distDir, 'components');
  const measures = measureComponents(componentsDir);
  return buildStatsText(measures, measureBundle(componentsDir), measureCore(componentsDir), countTemplatePages(measures.map((m) => m.name)), { tokens: countTokens(distDir), examples: countExamples(), apps: measureApps(distDir), templateGroups: templateGroups(measures.map((m) => m.name)), bundles: measureExtraBundles(componentsDir) });
}

/** Write dist/stats.json and return the document (for the CLI summary line). */
export function writeStatsFile(distDir: string): StatsDoc {
  const componentsDir = join(distDir, 'components');
  const measures = measureComponents(componentsDir);
  const bundle = measureBundle(componentsDir);
  const core = measureCore(componentsDir);
  const pages = countTemplatePages(measures.map((m) => m.name));
  const extra = { tokens: countTokens(distDir), examples: countExamples(), apps: measureApps(distDir), templateGroups: templateGroups(measures.map((m) => m.name)), bundles: measureExtraBundles(join(distDir, 'components')) };
  writeFileSync(join(distDir, STATS_FILE), buildStatsText(measures, bundle, core, pages, extra));
  return aggregateStats(measures, bundle, core, pages, extra);
}
