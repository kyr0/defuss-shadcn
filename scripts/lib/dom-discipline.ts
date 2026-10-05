/**
 * Why: the df$ discipline (AGENTS.md "DOM through df$"): component, shared and
 * docs-runtime code selects through df$ (defuss-query) and writes markup
 * through df$ (.html()/.morph()/.text()/factory), never through native DOM
 * queries or HTML string sinks - one runtime owns the DOM, so morph can
 * reconcile it and render() can reproduce it. The existing code predates the
 * rule: its uses are DEBT, counted per file in the baselines below, and the
 * baselines only go down (verify's `DOM queries through df$` / `HTML string
 * sinks` gates: a count above its baseline fails as new debt, a count below
 * fails until the baseline is lowered to match - every cleanup is locked in).
 * Pure: scanning only, no fs (verify reads the files).
 */

/** A use of a native query: getElementById / querySelector(All) / getElementsBy*. */
export const QUERY_RE = /\bgetElementById\s*\(|\.querySelector(?:All)?\s*(?:<[^>()]*>)?\s*\(|\.getElementsBy(?:ClassName|TagName|TagNameNS|Name)\s*\(/g;
/** A use of an HTML string sink (read or write): innerHTML / outerHTML /
 *  innerText / outerText, insertAdjacentHTML, document.write. */
export const SINK_RE = /\.(?:innerHTML|outerHTML|innerText|outerText)\b|\binsertAdjacentHTML\s*\(|\bdocument\.write(?:ln)?\s*\(/g;

export type Hit = { line: number; text: string };

/** The registry name of a component's State API: `tree-view` → `treeViewApi`. */
export const apiName = (component: string): string => component.replace(/-([a-z])/g, (_, x: string) => x.toUpperCase()) + 'Api';

/** True when `src` declares `{name}Api = { … }` with a render method INSIDE
 *  that object (`render(state) {` or `render: …`) - the render() half of the
 *  State API (AGENTS.md "State API" → render). The object is cut out by
 *  brace depth, so a render function elsewhere in the file does not count. */
export function hasRender(component: string, src: string): boolean {
  // componentState() builds render() from the component's markup function
  if (new RegExp(`${apiName(component)}\\s*=\\s*(Object\\.assign\\()?componentState\\s*(<[^>]*>)?\\(`).test(src)) return true;
  const m = new RegExp(`${apiName(component)}\\s*=\\s*\\{`).exec(src);
  if (!m) return false;
  let depth = 0;
  let end = src.length;
  for (let i = m.index + m[0].length - 1; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) { end = i; break; }
  }
  // a method or property named render - not a call (".render(")
  return /(?:^|[^.\w$])render\s*(?:\(|:)/m.test(src.slice(m.index + m[0].length, end));
}

/** Uses of `re` on code lines (comment lines document the rule - skipped). */
export function scan(src: string, re: RegExp): Hit[] {
  const hits: Hit[] = [];
  src.split('\n').forEach((text, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(text)) return;
    const n = (text.match(new RegExp(re.source, 'g')) || []).length;
    for (let k = 0; k < n; k++) hits.push({ line: i + 1, text: text.trim() });
  });
  return hits;
}

/**
 * The ratchet: `counts` (file → uses now) against `baseline` (file → uses
 * allowed). Returns the failures (new uses, stale baselines) and the debt
 * left (for the warning).
 */
export function ratchet(counts: Record<string, number>, baseline: Record<string, number>, what: string): { problems: string[]; debt: Array<[string, number]> } {
  const problems: string[] = [];
  const debt: Array<[string, number]> = [];
  for (const [file, n] of Object.entries(counts)) {
    const allowed = baseline[file] ?? 0;
    if (n > allowed) problems.push(`${file}: ${n} ${what} (baseline ${allowed}) - ${n - allowed} new`);
    else if (n < allowed) problems.push(`${file}: ${n} ${what} but the baseline says ${allowed} - lower it to ${n} (the ratchet only goes down)`);
    if (n > 0) debt.push([file, n]);
  }
  for (const file of Object.keys(baseline)) if (!(file in counts)) problems.push(`${file}: baseline entry for a file that no longer exists - remove it`);
  debt.sort((a, b) => b[1] - a[1]);
  return { problems, debt };
}

// -- baselines (debt that predates the rule; lower them as files migrate) ------
// Docs-runtime note: the classic head scripts (theme-switcher.ts, the
// pre-paint part of layout.ts) run BEFORE core installs df$ - what they do
// before DOMContentLoaded cannot go through df$; everything after can.

/** Native DOM queries allowed per file. */
export const QUERY_BASELINE: Record<string, number> = {
  'src/documentation/runtime/layout.ts': 45,
  'src/documentation/runtime/shiki-highlight.ts': 5,
  'src/documentation/runtime/site.ts': 31,
  'src/documentation/runtime/theme-switcher.ts': 12,
};

/** HTML string sinks allowed per file - components and shared code have NONE
 *  (verify fails any there outright); only the docs runtime carries debt. */
export const SINK_BASELINE: Record<string, number> = {
  'src/documentation/runtime/layout.ts': 3,
  'src/documentation/runtime/shiki-highlight.ts': 3,
  'src/documentation/runtime/site.ts': 12,
};

/** JS components not on df$ yet (no defussQuery import). Shrink-only - and
 *  empty: every JS component is on df$; a new one must land on it. */
export const DF_ADOPTION_LEGACY: string[] = [];

/** JS components without the render() contract yet - {name}Api.render(state)
 *  plus an assertRenderContract() call in tests/e2e/{name}.e2e.ts. Shrink-only
 *  - and empty: every JS component renders its markup from state. */
export const RENDER_LEGACY: string[] = [];
