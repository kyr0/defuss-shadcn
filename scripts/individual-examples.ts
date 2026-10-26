// Why: verify's `individual examples` gate fails what the contract (AGENTS.md "Individual examples") is owed - a
// component the docs examples are made of with no example of its own, an individual example after a composite one, a
// duplicate. This writes what is owed, from the docs themselves, so it is fixed by review instead of by hand.
// VERIFIED: (plans/2026-10-15_22-31_individual-examples.md) it migrated the whole docs once - 713 part fences, 196
// moves; the parts left the pages for the components' parts files on 2026-10-20 (the maintainer dropped the part
// cards). It stays for the next composite example that brings a new kind:
// (1) a page's individual examples placed after a composite move ahead of its first composite, unchanged;
// (2) every kind a component lacks gets an individual example in its parts file
//     (src/components/<section>/<name>/<name>.parts.md, created when missing) - a ```html example part fence cut from
//     the cleanest instance of that kind (its component's own pages first, then other component pages, then guides
//     and templates; the fewest ids, inline styles and page hooks; the fewest classes beside its root; then the first
//     in sidebar order), with the example <style> blocks for classes no component owns, no docs hook and no inline
//     handler; appended in root, variant, size and state order as the component's CSS declares them.
// It reads the contract only through scripts/lib/example-parts.ts (classifyFence, exampleParts) - no second reader.
// A moved example that is alone in its own section leaves that section empty: move the section with it.
//
//   bun run individual-examples button typography     dry run: what would move, what would be written
//   bun run individual-examples --write button         write (then: bun scripts/format-pages.ts --write)
//   bun run individual-examples --all [--write]        everything owed
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseHTML } from 'linkedom';
import { examplePartsInput } from './lib/example-parts-files.ts';
import { classifyFence, componentRoots, exampleParts, kindOf, partsFileHead, rootOf, type PartRoot } from './lib/example-parts.ts';
import { parseSkillFrontmatter } from './lib/skill.ts';
import { componentFile, partsFileName } from '../src/documentation/lib/component-dirs.ts';
import { pageFile } from '../src/documentation/lib/page-dirs-files.ts';
import { componentSources } from './lib/apps-files.ts';

const args = process.argv.slice(2);
const write = args.includes('--write');
const all = args.includes('--all');
const wanted = new Set(args.filter((a) => !a.startsWith('--')));

// GEN_ROOT: a copy of the repo's layout to run on (pages copied, the rest linked) - a dry run of --write
const ROOT = process.env.GEN_ROOT ?? join(import.meta.dirname, '..');
const COMPS = join(ROOT, 'src', 'components');
const { components, pages, parts } = examplePartsInput(ROOT);
const { roots } = componentRoots(components);
const debt = exampleParts(pages, parts, roots);
const css = new Map(componentSources().map((s) => [s.name, s.css]));
const title = (name: string) => parseSkillFrontmatter(readFileSync(componentFile(COMPS, name, 'component-skill.md'), 'utf8'))?.name ?? name;

// the fences of a page with their exact spans (the same pattern as scripts/lib/schema.ts exampleFences)
const FENCE = /(^|\n)(`{3,}|~{3,})([^\n]*)\n([\s\S]*?)\n\2(?=\n|$)/g;
type Span = { start: number; end: number; meta: string; body: string; line: number };
function spans(mdx: string): Span[] {
  const out: Span[] = [];
  for (const m of mdx.matchAll(FENCE)) {
    const meta = m[3].trim();
    if (!/(^|\s)example(\s|$)/.test(meta) || meta.split(/\s+/)[0] !== 'html') continue;
    const start = m.index! + m[1].length;
    out.push({ start, end: m.index! + m[0].length, meta, body: m[4], line: mdx.slice(0, start).split('\n').length });
  }
  return out;
}
const labelOf = (meta: string) => /label="(.*?)"(?=\s+[a-zA-Z-]+="|\s*$)/.exec(meta)?.[1] ?? null;

const kindParts = (k: string) => {
  const [component, rest] = [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)];
  const [selector, variant, size, states = ''] = rest.split('|');
  return { component, selector, variant, size, states };
};
// an element that needs its container (verify's exampleFragment: a list item, a row, an option) gets a bare one - a
// wrapper with no class of its own, which the classifier passes through, so the part stays the item's example
const contained = (el: Element, from: Element = el): string => {
  const tag = el.tagName;
  if (tag === 'LI') return from.parentElement?.tagName === 'OL' ? `<ol>${el.outerHTML}</ol>` : `<ul>${el.outerHTML}</ul>`;
  if (tag === 'TR') return `<table><tbody>${el.outerHTML}</tbody></table>`;
  if (tag === 'TD' || tag === 'TH') return `<table><tbody><tr>${el.outerHTML}</tr></tbody></table>`;
  if (tag === 'THEAD' || tag === 'TBODY' || tag === 'TFOOT') return `<table>${el.outerHTML}</table>`;
  if (tag === 'OPTION' || tag === 'OPTGROUP') return `<select>${el.outerHTML}</select>`;
  if (tag === 'DT' || tag === 'DD') return `<dl>${el.outerHTML}</dl>`;
  return el.outerHTML;
};
// every class a component owns: a part's own <style> is needed only for the classes nobody owns (a demo's .shape-demo)
const ownedAll = new Set(components.flatMap((c) => c.classes));
// a part's markup: the example's <style> blocks that name a class of it nobody owns, then a copy of the element in its
// container - with no docs hook (the screenshot anchor, the example root) and no inline handler
const partHtml = (el: Element, styles: Element[]): string => {
  const clean = el.cloneNode(true) as Element;
  for (const e of [clean, ...clean.querySelectorAll('*')])
    for (const at of Array.from(e.attributes)) if (/^on|^data-state-demo$|^data-example-root$/.test(at.name)) e.removeAttribute(at.name);
  const classes = new Set([clean, ...clean.querySelectorAll('[class]')].flatMap((e) => [...e.classList]).filter((c) => !ownedAll.has(c)));
  const sheets = styles.filter((st) => [...classes].some((c) => new RegExp(`\\.${c.replace(/[^\w-]/g, '\\$&')}(?![\\w-])`).test(st.textContent ?? '')));
  return [...sheets.map((st) => st.outerHTML), contained(clean, el)].join('\n');
};
// the instance each kind is cut from: the cleanest one - on its component's own pages first, then on other component
// pages, then anywhere (a guide, a template); the fewest ids, inline styles and page hooks; the fewest classes beside
// its root (a demo's px-4, a frame); then the first in sidebar order
type Candidate = { html: string; from: string; score: number[] };
const best = new Map<string, Candidate>();
let seq = 0;
for (const p of pages) {
  for (const s of spans(p.mdx)) {
    const body = s.body.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<link\b[^>]*>/gi, '');
    const { document } = parseHTML(`<!doctype html><html><body>${body}</body></html>`);
    const styles = [...document.body.children].filter((e) => e.tagName === 'STYLE');
    for (const el of document.body.querySelectorAll('*')) {
      const root = rootOf(el, roots);
      if (!root) continue;
      const k = kindOf(el, root);
      const nodes = [el, ...el.querySelectorAll('*')];
      const hooks = nodes.reduce(
        (n, e) => n + [...e.attributes].filter((a) => a.name === 'id' || a.name === 'style' || /^(popovertarget|commandfor|aria-controls|for|data-(?!variant|size|lucide|state))/.test(a.name)).length,
        0,
      );
      const tier = p.own === root.component ? 0 : p.own ? 1 : 2;
      const html = partHtml(el, styles);
      const extra = el.classList.length - 1;
      const score = [tier, hooks, extra, seq++];
      const had = best.get(k);
      if (!had || (score[0] - had.score[0] || score[1] - had.score[1] || score[2] - had.score[2] || score[3] - had.score[3]) < 0)
        best.set(k, { html, from: `${p.slug}: ${labelOf(s.meta) ?? `line ${s.line}`}`, score });
    }
  }
}

// a kind's position: its root in the component's roots, then its variant and its size in the order the CSS declares
// them, then its states
const order = (k: string) => {
  const { component, selector, variant, size, states } = kindParts(k);
  const text = css.get(component) ?? '';
  const at = (attr: string, v: string) => (v ? text.indexOf(`[${attr}="${v}"]`) + 1 || 9e6 : 0);
  const rootAt = roots.filter((r: PartRoot) => r.component === component).findIndex((r) => r.selector === selector);
  return [rootAt, at('data-variant', variant), at('data-size', size), states ? 1 : 0];
};
const byOrder = (a: string, b: string) => {
  const [x, y] = [order(a), order(b)];
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2] || x[3] - y[3] || a.localeCompare(b);
};
const partLabel = (k: string) => {
  const { component, selector, variant, size, states } = kindParts(k);
  const several = roots.filter((r) => r.component === component).length > 1;
  const name = several ? selector.replace(/^[.[]|]$/g, '') : title(component);
  const marks = [variant, size, ...states.split(',')].filter(Boolean);
  return `${name}${marks.length ? ` (${marks.join(', ')})` : ''}`.replace(/"/g, "'");
};

let changed = 0;
// (2) the parts files: every missing kind of a component, appended to its <name>.parts.md
for (const [key, d] of debt) {
  if (!key.endsWith('.parts.md') || !d.missing.length) continue;
  const component = key.slice(0, -'.parts.md'.length);
  if (!all && !wanted.has(component)) continue;
  const file = componentFile(COMPS, component, partsFileName(component));
  const text = existsSync(file) ? readFileSync(file, 'utf8') : `${partsFileHead(title(component))}\n`;
  const taken = new Set(spans(text).map((s) => labelOf(s.meta)));
  const fences: string[] = [];
  const report: string[] = [];
  for (const k of [...new Set(d.missing)].sort(byOrder)) {
    const inst = best.get(k);
    if (!inst) {
      report.push(`  ! no instance of ${k}`);
      continue;
    }
    let label = partLabel(k);
    for (let n = 2; taken.has(label); n++) label = `${partLabel(k)} ${n}`;
    taken.add(label);
    fences.push(`\`\`\`html example part label="${label}"\n${inst.html}\n\`\`\``);
    report.push(`  + part "${label}" from ${inst.from}: ${inst.html.replace(/\s+/g, ' ').slice(0, 110)}`);
  }
  if (!fences.length && !report.length) continue;
  changed++;
  console.log(`${key}: ${fences.length} parts`);
  console.log(report.join('\n'));
  if (write && fences.length) writeFileSync(file, `${text.trimEnd()}\n\n${fences.join('\n\n')}\n`);
}
// (1) the pages: individual examples after a composite move ahead of the first composite
for (const p of pages) {
  const d = debt.get(p.slug);
  if (!d?.late.length || !p.own || (!all && !wanted.has(p.slug))) continue;
  const fences = spans(p.mdx);
  const classified = fences.map((s) => classifyFence({ body: s.body, label: labelOf(s.meta), line: s.line }, p.own, roots));
  const firstComposite = classified.findIndex((c) => !c.individual);
  if (firstComposite < 0) continue;
  const late = fences.filter((_s, i) => i > firstComposite && classified[i].individual);
  if (!late.length) continue;
  changed++;
  console.log(`${p.slug}: ${late.length} moved`);
  for (const s of late) console.log(`  ~ move "${labelOf(s.meta)}" (line ${s.line}) ahead of "${labelOf(fences[firstComposite].meta)}" (line ${fences[firstComposite].line})`);
  if (!write) continue;
  // cut the late fences (with the blank line after each) and put them right before the first composite
  let mdx = p.mdx;
  const moved = late.map((s) => mdx.slice(s.start, s.end));
  for (const s of [...late].sort((a, b) => b.start - a.start)) mdx = mdx.slice(0, s.start) + mdx.slice(s.end).replace(/^\n\n?/, '');
  const anchor = spans(mdx).find((s) => !classifyFence({ body: s.body, label: labelOf(s.meta), line: s.line }, p.own, roots).individual)!;
  mdx = `${mdx.slice(0, anchor.start)}${moved.join('\n\n')}\n\n${mdx.slice(anchor.start)}`;
  writeFileSync(pageFile(join(ROOT, 'src', 'documentation', 'pages'), p.slug), mdx);
}
console.log(`${changed} file(s) ${write ? 'written' : 'would change'}`);
