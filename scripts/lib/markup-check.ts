/**
 * Why: the mistakes an agent makes with defuss-shadcn are mechanical - a
 * modifier class (`btn-outline`) instead of `data-variant`, a part class the
 * component never had (`card-titel`), a variant value no stylesheet styles,
 * a token it invented, all.js loaded as a classic script, a `window` global.
 * Each reads fine in a diff and renders wrong or not at all. The
 * shadcn-review skill runs this checker (bundled into
 * skills/shadcn-review/scripts/markup-check.mjs with a vocabulary built from
 * the shipped CSS) before its judgment pass; precision over volume - a rule
 * only fires where the vocabulary proves the markup wrong.
 * VERIFIED: (calibrated 2026-10-07 on 234 e2e fixtures + 1,553 docs examples:
 * no false finding; tests/markup-check.test.ts pins each precision rule)
 */
import { classOwners, topLevelClasses, type AppComponentSource } from './apps.ts';

export interface MarkupVocab {
  /** the release the vocabulary was built from */
  version: string;
  /** every component name */
  components: string[];
  /** every class the shipped CSS defines → its owning component ('' = a utility or shared class) */
  classes: Record<string, string>;
  /** per component: the data-variant / data-size values its stylesheet styles */
  variants: Record<string, { variant?: string[]; size?: string[] }>;
  /** every custom property the shipped CSS declares: theme tokens, derived tokens, documented knobs */
  properties: string[];
  /** components whose script names their controls at runtime (a sortable's move buttons) */
  autoLabels: string[];
}

export interface MarkupFinding {
  level: 'error' | 'warning';
  rule: string;
  path: string;
  line: number;
  message: string;
  fix: string;
}

const classTokens = (css: string): string[] =>
  [...css.matchAll(/\.((?:\\.|[a-zA-Z0-9_-])+)/g)].map((m) => m[1].replace(/\\(.)/g, '$1')).filter((c) => /^[a-z]/i.test(c) && !/^\d/.test(c));

/** The classes a text names in markup (class="...") and in selectors ('.part'). */
const namedClasses = (text: string): string[] =>
  [...text.matchAll(/\bclass(?:Name)?=\\?["'`]([^"'`\\]*)/g)].flatMap((m) => m[1].split(/\s+/))
    .concat([...text.matchAll(/['"`][^'"`\n]*?\.([a-z][a-z0-9-]*)/g)].map((m) => m[1]))
    .filter((c) => /^[a-z][a-z0-9-]*$/.test(c));

/** The vocabulary of one release - a component's contract is its stylesheet,
 *  its script (hooks without CSS: `.panel-close`, `script.property-grid-source`)
 *  and its skill (documented markup and values): component sources + their
 *  skill texts (by name) + the utility sheets. */
export function buildVocab(components: readonly AppComponentSource[], utilityCss: readonly string[], version: string, skills: Readonly<Record<string, string>> = {}): MarkupVocab {
  const owners = classOwners(components);
  const classes: Record<string, string> = {};
  for (const css of utilityCss) for (const c of classTokens(css)) classes[c] ??= '';
  for (const comp of components) for (const c of classTokens(comp.css)) if (!(c in classes) || classes[c] === '') classes[c] = owners(c)[0] ?? '';
  // a script's or skill's own parts: named after the component (`panel-close`) or after
  // one of its own top-level classes (navigation-menu's `nav-menu-item`)
  for (const comp of components) {
    const bases = [comp.name, ...topLevelClasses(comp.css)];
    for (const c of namedClasses(`${comp.ts}\n${skills[comp.name] ?? ''}`)) {
      if (c in classes) continue;
      const bare = c.replace(/^mk-/, '');
      if (bases.some((b) => bare === b || bare.startsWith(`${b}-`))) classes[c] = comp.name;
    }
  }
  const variants: MarkupVocab['variants'] = {};
  for (const comp of components) {
    const text = `${comp.css}\n${comp.ts}\n${skills[comp.name] ?? ''}`;
    // values styled ([data-variant="x"]), written in markup (data-variant="x") or compared in script (dataset.variant === 'x')
    const of = (attr: string) => {
      const prop = attr.replace(/^data-/, '');
      const found = [...text.matchAll(new RegExp(`${attr}[~|^$*]?=\\\\?["']?([a-z0-9][a-z0-9-]*)`, 'gi'))].map((m) => m[1])
        .concat([...text.matchAll(new RegExp(`dataset\\.${prop}\\s*[!=]==?\\s*['"]([a-z0-9-]+)['"]`, 'g'))].map((m) => m[1]));
      return found.length ? [...new Set(['default', ...found])].sort() : [];
    };
    const v = of('data-variant');
    const s = of('data-size');
    if (v.length || s.length) variants[comp.name] = { ...(v.length ? { variant: v } : {}), ...(s.length ? { size: s } : {}) };
  }
  const properties = new Set<string>();
  for (const css of [...utilityCss, ...components.map((c) => c.css)]) for (const m of css.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) properties.add(m[1]);
  return {
    version,
    components: components.map((c) => c.name).sort(),
    classes: Object.fromEntries(Object.entries(classes).sort(([a], [b]) => a.localeCompare(b))),
    variants,
    properties: [...properties].sort(),
    autoLabels: components.filter((c) => /(?:attr|setAttribute)\(\s*['"]aria-label['"]/.test(c.ts)).map((c) => c.name).sort(),
  };
}

const lineOf = (text: string, index: number) => text.slice(0, index).split('\n').length;
/** blank out comments, keeping offsets (so line numbers stay true) */
const blank = (text: string, re: RegExp) => text.replace(re, (m) => m.replace(/[^\n]/g, ' '));

/** A Levenshtein distance small enough to name a typo. */
function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

type File = { path: string; text: string };
const isMarkup = (p: string) => /\.(html?|jsx|tsx|vue|svelte|astro|mdx)$/i.test(p);
const isScript = (p: string) => /\.(m?[jt]sx?)$/i.test(p);
const isStyle = (p: string) => /\.css$/i.test(p);

/**
 * Every finding in a set of project files (HTML, CSS, JS/TS, JSX/TSX). Classes
 * and custom properties the project's own CSS defines (any .css file passed,
 * any <style> block) are the project's and never reported.
 */
export function checkMarkup(files: readonly File[], vocab: MarkupVocab): MarkupFinding[] {
  const out: MarkupFinding[] = [];
  const add = (f: File, index: number, level: MarkupFinding['level'], rule: string, message: string, fix: string) =>
    out.push({ level, rule, path: f.path, line: lineOf(f.text, index), message, fix });

  // what the project defines itself
  const projectCss = files.filter((f) => isStyle(f.path)).map((f) => f.text)
    .concat(files.filter((f) => isMarkup(f.path)).flatMap((f) => [...f.text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1])));
  const ownClasses = new Set(projectCss.flatMap(classTokens));
  // ... and the custom properties it sets: in CSS, in style="" attributes, from script (setProperty)
  const ownProps = new Set(projectCss.flatMap((css) => [...css.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map((m) => m[1])));
  for (const f of files) {
    for (const m of f.text.matchAll(/\bstyle\s*=\s*["'{]([^"'}]*)/g)) for (const p of m[1].matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) ownProps.add(p[1]);
    for (const m of f.text.matchAll(/setProperty\(\s*['"`](--[a-zA-Z0-9-]+)/g)) ownProps.add(m[1]);
  }
  const known = new Set(vocab.properties);
  const names = [...vocab.components].sort((a, b) => b.length - a.length);
  const partsOf = (comp: string) => Object.entries(vocab.classes).filter(([c, o]) => o === comp && c !== comp).map(([c]) => c);

  // custom properties: every var(--x) must be one the system or the project declares
  const checkVars = (f: File, text: string, offset: number) => {
    // var(--x, fallback) is a deliberate optional knob - only a bare var() can point at nothing
    for (const m of text.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)\s*([,)])/g)) {
      const p = m[1];
      if (m[2] === ',' || known.has(p) || ownProps.has(p)) continue;
      add(f, offset + m.index!, 'error', 'unknown-token', `var(${p}) - no defuss-shadcn stylesheet or project stylesheet declares ${p}`, 'use a theme token (shadcn-theme references/tokens.md) or declare the property in your own CSS; never invent a token in a component');
    }
  };

  for (const f of files) {
    if (isStyle(f.path)) checkVars(f, blank(f.text, /\/\*[\s\S]*?\*\//g), 0);

    if (isMarkup(f.path)) {
      const text = blank(f.text, /<!--[\s\S]*?-->/g);
      for (const m of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) checkVars(f, m[1], m.index! + m[0].indexOf('>') + 1);
      const scriptSrcs: { src: string; module: boolean; index: number }[] = [];
      const links: { href: string; index: number }[] = [];
      for (const tag of text.matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g)) {
        const name = tag[1].toLowerCase();
        const attrs = new Map<string, string>();
        for (const a of tag[2].matchAll(/([:@a-zA-Z_][\w:.-]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) attrs.set(a[1].toLowerCase(), a[3] ?? a[4] ?? a[5] ?? '');
        const at = tag.index!;
        if (name === 'script' && attrs.has('src')) scriptSrcs.push({ src: attrs.get('src')!, module: attrs.get('type') === 'module', index: at });
        if (name === 'link' && /stylesheet/i.test(attrs.get('rel') ?? '')) links.push({ href: attrs.get('href') ?? '', index: at });
        const style = attrs.get('style');
        if (style) checkVars(f, style, at);
        const cls = (attrs.get('class') ?? attrs.get('classname') ?? '').split(/\s+/).filter((c) => /^[a-z][a-z0-9-]*$/i.test(c));
        // classes: a component's prefix with a part it does not have
        for (const c of cls) {
          if (c in vocab.classes || ownClasses.has(c)) continue;
          // the leading runs of the class that are a component's class or name (`btn` → button):
          // the longest names the component, the shortest of the same owner is its root
          const segments = c.split('-');
          const runs: { comp: string; base: string }[] = [];
          for (let i = 1; i < segments.length; i++) {
            const prefix = segments.slice(0, i).join('-');
            if (vocab.classes[prefix]) runs.push({ comp: vocab.classes[prefix], base: prefix });
            else if (names.includes(prefix.replace(/^mk-/, ''))) runs.push({ comp: prefix.replace(/^mk-/, ''), base: prefix });
          }
          if (!runs.length) continue;
          const { comp, base } = runs[runs.length - 1];
          const root = runs.find((r) => r.comp === comp)!.base;
          const suffix = c.slice(base.length + 1);
          const v = vocab.variants[comp];
          // a modifier only on the component's root class (`btn-outline`); `card-title-sm` is a part that does not exist
          if (base === root && (v?.variant?.includes(suffix) || v?.size?.includes(suffix))) {
            const axis = v.variant?.includes(suffix) ? 'variant' : 'size';
            add(f, at, 'error', 'modifier-class', `class "${c}" - defuss-shadcn has no modifier classes; ${comp} takes its ${axis} as an attribute`, `class="${base}" data-${axis}="${suffix}"`);
            continue;
          }
          const parts = partsOf(comp);
          const near = parts.map((p) => [p, distance(p, c)] as const).sort((a, b) => a[1] - b[1])[0];
          add(f, at, 'error', 'unknown-part', `class "${c}" is not a part of ${comp}`, near && near[1] <= 3 ? `did you mean "${near[0]}"? (${comp}'s parts are in its component skill)` : `use ${comp}'s documented parts (its component skill's Structure section), or define "${c}" in your own CSS`);
        }
        // variant / size values the owning component styles
        for (const axis of ['variant', 'size'] as const) {
          const value = attrs.get(`data-${axis}`);
          if (value === undefined) continue;
          const allowed = cls.map((c) => vocab.classes[c]).filter((o): o is string => !!o && !!vocab.variants[o]?.[axis]);
          if (!allowed.length) continue;
          if (allowed.some((o) => vocab.variants[o][axis]!.includes(value))) continue;
          const owner = allowed[0];
          add(f, at, 'error', `unknown-${axis}`, `data-${axis}="${value}" - ${owner} has no such ${axis}`, `use one of: ${vocab.variants[owner][axis]!.join(', ')}`);
        }
        // an icon-only button needs a name
        if (name === 'button' && !attrs.has('aria-label') && !attrs.has('aria-labelledby') && !attrs.has('title') && !cls.some((c) => vocab.autoLabels.includes(vocab.classes[c]))) {
          const end = text.indexOf('</button>', at);
          const inner = end > 0 ? text.slice(at + tag[0].length, end) : '';
          const visible = inner.replace(/<span\b[^>]*class="[^"]*\bsr-only\b[^"]*"[^>]*>[^<]+<\/span>/gi, 'x').replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').trim();
          if (end > 0 && !visible && /<(svg|i|img)\b/i.test(inner)) add(f, at, 'error', 'icon-button-label', 'an icon-only <button> has no accessible name', 'add aria-label="<what it does>" (or a .sr-only text)');
        }
      }
      // how the system is loaded
      const runtime = scriptSrcs.filter((s) => /defuss-shadcn|\/components\//.test(s.src) && /\.js(\?|$)/.test(s.src));
      for (const s of runtime) if (!s.module) add(f, s.index, 'error', 'module-script', `<script src="${s.src}"> is not a module - core.js, all.js and every component script are ES modules`, 'add type="module"');
      const has = (re: RegExp) => runtime.some((s) => re.test(s.src));
      if (has(/\/all(\.min)?\.js/) && has(/\/core(\.min)?\.js/)) add(f, runtime.find((s) => /\/core(\.min)?\.js/.test(s.src))!.index, 'error', 'double-runtime', 'core.js and all.js both load - all.js already contains core.js', 'load all.js alone, or core.js + the component scripts you use');
      const cssLinks = links.filter((l) => /defuss-shadcn|\/components\/|\/theme\//.test(l.href));
      const core = cssLinks.findIndex((l) => /\/core(\.min)?\.css|default-semantic-tokens/.test(l.href));
      const first = cssLinks.findIndex((l) => /\/all(\.min)?\.css|\/components\/[^/]+\/[^/]+\.css/.test(l.href));
      if (first >= 0 && core < 0) add(f, cssLinks[first].index, 'error', 'core-css', 'component styles load without core.css - no tokens, no layout utilities', 'link components/core.css before all.css');
      else if (first >= 0 && core > first) add(f, cssLinks[core].index, 'warning', 'core-css-order', 'core.css loads after component styles', 'link core.css first');
      for (const u of [...scriptSrcs.map((s) => ({ url: s.src, index: s.index })), ...links.map((l) => ({ url: l.href, index: l.index }))]) {
        if (/cdn\.jsdelivr\.net\/(npm\/defuss-shadcn|gh\/[^/]+\/defuss-shadcn)(@latest)?\//.test(u.url)) add(f, u.index, 'warning', 'pin-version', `${u.url} follows the latest release`, 'pin the release you tested (defuss-shadcn@X.Y.Z) - @latest is cached for days and changes under you');
      }
    }

    // scripts: .js/.ts files and inline <script> blocks
    const scripts: { text: string; offset: number }[] = isScript(f.path) && !/\.(jsx|tsx)$/i.test(f.path) ? [{ text: f.text, offset: 0 }] : [];
    if (isMarkup(f.path) || /\.(jsx|tsx)$/i.test(f.path)) {
      if (/\.(jsx|tsx)$/i.test(f.path)) scripts.push({ text: f.text, offset: 0 });
      else for (const m of f.text.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) scripts.push({ text: m[1], offset: m.index! + m[0].indexOf('>') + 1 });
    }
    for (const s of scripts) {
      const code = blank(blank(s.text, /\/\*[\s\S]*?\*\//g), /\/\/[^\n]*/g);
      for (const m of code.matchAll(/\bwindow\s*(?:\.\s*([A-Za-z_$][\w$]*)|\[\s*['"]([^'"]+)['"]\s*\])\s*=(?!=)/g)) {
        add(f, s.offset + m.index!, 'error', 'window-global', `window.${m[1] ?? m[2]} = ... defines a global`, 'keep it in module scope, or put a page API under your own namespace on globalThis - never on window, never under df$');
      }
      for (const m of code.matchAll(/\.(innerHTML|outerHTML)\s*\+?=(?!=)|\.insertAdjacentHTML\s*\(|\bdocument\.write(?:ln)?\s*\(/g)) {
        add(f, s.offset + m.index!, 'warning', 'html-sink', `${m[0].replace(/\s*\+?[=(]$/, '')} writes markup past df$`, 'write markup with df$(el).html(markup) / .morph(markup), text with .text(value) - morph keeps component state and focus');
      }
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line);
}
