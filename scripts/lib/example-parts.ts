import { parseHTML } from 'linkedom';
import { exampleFences } from './schema.ts';
import { isPartMeta } from '../../src/documentation/lib/mdx-example.ts';
import { partsFileName } from '../../src/documentation/lib/parts-file.ts';

/**
 * Why: every part an example is made of must also be an example of its own - the maintainer's contract for the
 * Studio (2026-10-16): a composite example still drops whole, and each component in it drops alone, once. This module
 * is the ONE reader of that contract: it says which fence is an individual example and which a composite, which kinds
 * of component a fence holds, and what is still owed. verify's `individual examples` gate fails any debt,
 * scripts/individual-examples.ts writes what is owed, and the Studio's library marks the individual examples by the
 * same classification. Pure - the caller (example-parts-files.ts) reads the skills, the stylesheets' class ownership,
 * the pages and the parts files.
 *
 * Where the individual examples live: in their component's parts file (src/components/<section>/<name>/<name>.parts.md
 * - ```html example part fences, one instance of each kind), never on a docs page. The docs pages showed them as part
 * cards from 2026-10-16 until the maintainer dropped those (2026-10-20: "a bad idea"); a page keeps only its full
 * examples, and verify's `no part cards on pages` fails a part fence there. An individual example a page shows as a
 * full card (one that needs its hint, its State tab or its script) counts too.
 *
 * VERIFIED: (tmp/probe-example-parts.ts, 2026-10-16) the first ```html block of a skill's ## Structure names the
 * component's root for 236 of 240 components when searched depth-first for a class the component owns; Chart, Date
 * Picker, Icon and Motion declare theirs (`roots:` in the skill's front matter). A class-name rule ("not <owned
 * class>-...") named parts such as breadcrumb-item roots (tmp/probe-isolated-coverage.ts).
 */

/** A component as the contract needs it. */
export type PartComponent = {
  name: string;
  /** the classes it owns (classOwners) */
  classes: readonly string[];
  /** the first ```html block of its skill's ## Structure ('' when none) */
  structure: string;
  /** declared root selectors (the skill's `roots:` front matter) - they replace the derived ones */
  roots?: readonly string[];
};
/** A docs page: its MDX, the component it is about (its own, or its parent page's; null for a guide) and its type. */
export type PartPage = { slug: string; own: string | null; mdx: string; type?: string };
/** A component's parts file (`<name>.parts.md` in its folder): its individual examples as ```html example part fences. */
export type PartsFile = { component: string; md: string };
/** One root of a component: a selector, and whether the component declared it. */
export type PartRoot = { component: string; selector: string; declared: boolean };

/** One fence, classified. */
export type ClassifiedFence = {
  label: string;
  line: number;
  /** one instance of the page's own component (through layout wrappers) - else a composite */
  individual: boolean;
  /** the individual example's kind; null for a composite */
  kind: string | null;
  /** the kinds of every component instance it is made of (an individual example: the instances inside its root) */
  holds: string[];
  /** the markup, whitespace collapsed - two equal ones are the same example */
  markup: string;
};

/** What a page or a parts file owes the contract. */
export type ExampleDebt = {
  /** individual examples placed after a composite one on a page (labels) */
  late: string[];
  /** individual examples equal to an earlier one of the same component (labels) */
  duplicates: string[];
  /** kinds of the component that fences hold and no individual example shows (a parts file's debt) */
  missing: string[];
};

/** The comment a parts file opens with (the migration wrote it, scripts/individual-examples.ts writes it on a new file). */
export const partsFileHead = (title: string): string =>
  `<!-- The individual examples of ${title}: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->`;

/**
 * Each component's roots: declared selectors when the skill names them, else the classes it owns on the first
 * elements of its Structure block that carry one (depth-first - a layout wrapper or a <label> is passed through).
 * Returns the roots and the components left without one.
 */
export function componentRoots(components: readonly PartComponent[]): { roots: PartRoot[]; rootless: string[] } {
  const roots: PartRoot[] = [];
  const rootless: string[] = [];
  for (const c of components) {
    if (c.roots?.length) {
      c.roots.forEach((selector) => roots.push({ component: c.name, selector, declared: true }));
      continue;
    }
    const { document } = parseHTML(`<!doctype html><html><body>${c.structure}</body></html>`);
    const found = new Set<string>();
    const visit = (el: Element) => {
      const own = [...el.classList].filter((k) => c.classes.includes(k));
      if (own.length) own.forEach((k) => found.add(k));
      else [...el.children].forEach(visit);
    };
    [...document.body.children].forEach(visit);
    if (!found.size) rootless.push(c.name);
    found.forEach((k) => roots.push({ component: c.name, selector: `.${k}`, declared: false }));
  }
  return { roots, rootless };
}

/** The root an element is an instance of: a declared root before a derived one; null when none. */
export function rootOf(el: Element, roots: readonly PartRoot[]): PartRoot | null {
  return roots.find((r) => r.declared && el.matches(r.selector)) ?? roots.find((r) => !r.declared && el.matches(r.selector)) ?? null;
}

/** The native states that make a part of their own: a disabled button, a checked switch, an open accordion item. */
export const KIND_STATES = ['disabled', 'checked', 'readonly', 'open', 'selected'] as const;

/**
 * An instance's kind: its component, its root, its variant, its size and its native states
 * (`button:.btn|outline|sm|disabled`). VERIFIED: (2026-10-16) without the states the Input page's only single input,
 * "Disabled", stood for the plain input too - no plain one was asked for.
 */
export const kindOf = (el: Element, root: PartRoot): string =>
  `${root.component}:${root.selector}|${el.getAttribute('data-variant') ?? ''}|${el.getAttribute('data-size') ?? ''}|${KIND_STATES.filter((s) => el.hasAttribute(s)).join(',')}`;

/**
 * Classify one fence. Scripts, stylesheet links and templates are not part of it. An individual example is one
 * element - reached through layout wrappers that hold nothing else - that is an instance of `own` (the page's
 * component, or the parts file's); anything else is a composite, and every component instance in it (at any depth) is
 * a kind it holds.
 */
export function classifyFence(fence: { body: string; label: string | null; line: number }, own: string | null, roots: readonly PartRoot[]): ClassifiedFence {
  const html = fence.body.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<link\b[^>]*>/gi, '');
  const { document } = parseHTML(`<!doctype html><html><body>${html}</body></html>`);
  const top = [...document.body.children].filter((e) => !/^(STYLE|SCRIPT|TEMPLATE)$/.test(e.tagName));
  const label = fence.label ?? `line ${fence.line}`;
  const markup = html.replace(/\s+/g, ' ').trim();
  let one: Element | null = top.length === 1 ? top[0] : null;
  // a wrapper that only lays its one child out (no root of its own, no text beside it) is passed through
  while (one && !rootOf(one, roots) && one.children.length === 1 && (one.textContent ?? '').trim() === (one.children[0].textContent ?? '').trim())
    one = one.children[0];
  const root = one && rootOf(one, roots);
  const individual = !!(root && own && root.component === own);
  const kind = individual ? kindOf(one!, root!) : null;
  // every instance the fence is made of - an individual example's own root aside (a card's button is a part of it)
  const holds = new Set<string>();
  for (const el of document.body.querySelectorAll('*')) {
    const r = el !== one || !individual ? rootOf(el, roots) : null;
    if (r) holds.add(kindOf(el, r));
  }
  return { label, line: fence.line, individual, kind, holds: [...holds].sort(), markup };
}

/** The html fences of a page or a parts file. */
const htmlFences = (text: string) => exampleFences(text).filter((x) => x.lang === 'html');

/**
 * The page each component's individual examples are listed on in the Studio: the page named after it, else the first
 * page about it (sidebar order).
 */
export function homePages(pages: readonly PartPage[]): Map<string, string> {
  const home = new Map<string, string>();
  for (const p of pages) if (p.own && (p.slug === p.own || !home.has(p.own))) home.set(p.own, p.slug);
  return home;
}

/**
 * The debt: per page, its individual examples after a composite one and its duplicates; per parts file
 * (`<name>.parts.md`), its duplicates and the kinds its component lacks an individual example of. Every kind a page
 * fence or a part holds is owed by its component's parts file unless a part or an individual example on a page about
 * that component shows it.
 */
export function exampleParts(pages: readonly PartPage[], parts: readonly PartsFile[], roots: readonly PartRoot[]): Map<string, ExampleDebt> {
  const debt = new Map<string, ExampleDebt>();
  const of = (key: string) => {
    if (!debt.has(key)) debt.set(key, { late: [], duplicates: [], missing: [] });
    return debt.get(key)!;
  };
  const shown = new Set<string>(); // kinds with an individual example
  const held = new Set<string>(); // kinds the fences hold
  const markups = new Map<string, Set<string>>(); // component → the markup of its individual examples
  const individual = (c: ClassifiedFence, component: string, key: string) => {
    shown.add(c.kind!);
    const seen = markups.get(component) ?? new Set<string>();
    if (seen.has(c.markup)) of(key).duplicates.push(c.label);
    seen.add(c.markup);
    markups.set(component, seen);
  };
  for (const f of parts) {
    for (const x of htmlFences(f.md)) {
      const c = classifyFence(x, f.component, roots);
      c.holds.forEach((k) => held.add(k));
      if (c.individual) individual(c, f.component, partsFileName(f.component));
    }
  }
  for (const p of pages) {
    let composite = false;
    for (const x of htmlFences(p.mdx)) {
      const c = classifyFence(x, p.own, roots);
      c.holds.forEach((k) => held.add(k));
      if (!c.individual) {
        composite = true;
        continue;
      }
      if (composite) of(p.slug).late.push(c.label);
      individual(c, p.own!, p.slug);
    }
  }
  for (const k of [...held].sort()) if (!shown.has(k)) of(partsFileName(k.slice(0, k.indexOf(':')))).missing.push(k);
  for (const [key, d] of debt) if (!d.late.length && !d.duplicates.length && !d.missing.length) debt.delete(key);
  return debt;
}

/**
 * Fences of a parts file that are no individual example of its component - a composite there would drop as half an
 * example, another component's instance belongs in that component's file. One entry per fence:
 * "<name>.parts.md line <n> "<label>"".
 */
export function strayParts(parts: readonly PartsFile[], roots: readonly PartRoot[]): string[] {
  const out: string[] = [];
  for (const f of parts)
    for (const x of htmlFences(f.md))
      if (!classifyFence(x, f.component, roots).individual) out.push(`${partsFileName(f.component)} line ${x.line} "${x.label ?? ''}"`);
  return out;
}

/**
 * Part fences (```html example part) on docs pages - every page, not only the component sections': the pages show no
 * part cards (maintainer, 2026-10-20); a part belongs in its component's parts file. One entry per fence:
 * "<page> line <n> "<label>"".
 */
export function pagePartFences(pages: readonly { slug: string; mdx: string }[]): string[] {
  return pages.flatMap((p) => htmlFences(p.mdx).filter((x) => isPartMeta(x.meta)).map((x) => `${p.slug} line ${x.line} "${x.label ?? ''}"`));
}
