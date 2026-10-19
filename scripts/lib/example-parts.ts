import { parseHTML } from 'linkedom';
import { exampleFences } from './schema.ts';
import { isPartMeta } from '../../src/documentation/lib/mdx-example.ts';

/**
 * Why: every part an example is made of must also be an example of its own, ahead of the composite ones - the
 * maintainer's contract for the docs and the Studio (2026-10-16): a composite example still drops whole, and each
 * component in it drops alone, once, from its own page. This module is the ONE reader of that contract: it says which
 * fence is an individual example and which a composite, which kinds of component a composite holds, and what a page
 * still owes. verify's `individual examples` gate fails any debt, scripts/individual-examples.ts writes what is owed,
 * and the Studio's library marks the individual examples by the same classification. Pure - the caller
 * (example-parts-files.ts) reads the skills, the stylesheets' class ownership and the pages.
 *
 * VERIFIED: (tmp/probe-example-parts.ts, 2026-10-16) the first ```html block of a skill's ## Structure names the
 * component's root for 236 of 240 components when searched depth-first for a class the component owns; Chart, Date
 * Picker, Icon and Motion declare theirs (`roots:` in the skill's front matter). Of 1,664 fences 728 are individual,
 * 936 composite; 408 kinds (component, root, variant, size) lack an individual example on their component's page, and
 * 99 pages put 196 individual examples after a composite one. A class-name rule ("not <owned class>-...") named parts
 * such as breadcrumb-item roots (tmp/probe-isolated-coverage.ts).
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
/** What a guide's gallery items are named by beside a caption: the classes of the shapes module (shapes.css). */
export type GuideClasses = ReadonlySet<string>;
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

/** What a page owes the contract. */
export type PageDebt = {
  /** individual examples placed after a composite one (labels) */
  late: string[];
  /** individual examples equal to an earlier one of the same component (labels) */
  duplicates: string[];
  /** kinds of this page's component that composites hold and no individual example shows */
  missing: string[];
};

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
 * Classify one fence of a page. Scripts, stylesheet links and templates are not part of it. An individual example is
 * one element - reached through layout wrappers that hold nothing else - that is an instance of the page's own
 * component; anything else is a composite, and every component instance in it (at any depth) is a kind it holds.
 */
export function classifyFence(
  fence: { body: string; label: string | null; line: number; meta?: string },
  own: string | null,
  roots: readonly PartRoot[],
  page = '',
  /** the shapes classes when the page is a guide (not a template); null: no gallery items are kinds here */
  guide: GuideClasses | null = null,
): ClassifiedFence {
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
  // a guide (no component) has no instance to name: its individual examples are its part fences of one element, each
  // named by the gallery item it shows (`caption:<page>:<name>`)
  const guidePart = !own && !!guide && !!one && isPartMeta(fence.meta ?? '');
  const individual = guidePart || !!(root && own && root.component === own);
  const kind = guidePart ? captionKind(page, label) : individual ? kindOf(one!, root!) : null;
  // every instance the fence is made of - an individual example's own root aside (a card's button is a part of it);
  // on a guide, every captioned gallery item too
  const holds = new Set<string>();
  for (const el of document.body.querySelectorAll('*')) {
    const r = el !== one || !individual ? rootOf(el, roots) : null;
    if (r) holds.add(kindOf(el, r));
  }
  if (!own && guide && !individual) for (const item of galleryItems(document.body, roots, guide)) holds.add(captionKind(page, item.name));
  return { label, line: fence.line, individual, kind, holds: [...holds].sort(), markup };
}

/** A guide's gallery item: its kind names the page and the caption (quotes as the fence label can hold them). */
export const captionKind = (page: string, text: string) => `caption:${page}:${text.replace(/"/g, "'")}`;
/** the text of an element with a space between its elements ("shape-hexagon<br><span>vertical</span>" is two words) */
const words = (n: Node): string => (n.nodeType === 3 ? (n.nodeValue ?? '') : [...n.childNodes].map(words).join(n.nodeType === 1 ? ' ' : ''));
/**
 * A guide's gallery items, in document order, each name once: every captioned item (captionOf - named by its caption),
 * and every uncaptioned element in a gallery (a parent holding two or more) that carries a class of the shapes module
 * (named by those classes: "shape-hexagon-2", "aura aura-dual"). Only shapes classes name an uncaptioned item - a
 * layout guide's demo tiles (w-24, shrink-0) show a utility, not a part. VERIFIED: (2026-10-16) the captions alone named
 * 88 of the Shapes page's shapes; its other shapes (images, auras) carry no caption.
 */
export function galleryItems(body: Element, roots: readonly PartRoot[], shapes: GuideClasses): { content: Element; name: string }[] {
  const out: { content: Element; name: string }[] = [];
  const named = new Set<string>();
  const shown = new Set<string>();
  // the same content under another caption (an RTL twin: its direction sits on the wrapper) is no item of its own
  const push = (content: Element, name: string) => {
    const markup = content.outerHTML.replace(/\s+/g, ' ');
    if (named.has(name) || shown.has(markup)) return;
    named.add(name);
    shown.add(markup);
    out.push({ content, name });
  };
  for (const el of body.querySelectorAll('*')) {
    const c = captionOf(el, roots);
    if (c) {
      push(c.content, c.text);
      continue;
    }
    const parent = el.parentElement;
    if (!parent || el.matches('.demo-label, figcaption') || captionOf(parent, roots)) continue;
    if ([...parent.children].filter((k) => !k.matches('.demo-label, figcaption')).length < 2) continue;
    const own = [...el.classList].filter((k) => shapes.has(k));
    if (own.length) push(el, own.join(' '));
  }
  return out;
}

/**
 * A captioned gallery item: a layout element (no root) holding one element and its caption (`.demo-label`,
 * `<figcaption>`) - the element is what the item shows, the caption names it. Null for anything else.
 */
export function captionOf(el: Element, roots: readonly PartRoot[]): { content: Element; text: string } | null {
  if (rootOf(el, roots)) return null;
  const kids = [...el.children];
  const caption = kids.find((k) => k.matches('.demo-label, figcaption'));
  const rest = kids.filter((k) => k !== caption);
  if (!caption || rest.length !== 1) return null;
  const text = words(caption).replace(/\s+/g, ' ').trim();
  return text ? { content: rest[0], text } : null;
}

/**
 * The debt of every page: individual examples after a composite one, duplicates, and the kinds its component lacks
 * an individual example of. A kind is owed by its component's page (the page named after it, else the first page
 * about it); a kind whose component has no page is owed by '(no page)'; a guide's caption kind by its guide.
 */
export function exampleParts(pages: readonly PartPage[], roots: readonly PartRoot[], shapes: GuideClasses = new Set()): Map<string, PageDebt> {
  const debt = new Map<string, PageDebt>();
  const of = (slug: string) => {
    if (!debt.has(slug)) debt.set(slug, { late: [], duplicates: [], missing: [] });
    return debt.get(slug)!;
  };
  const shown = new Set<string>(); // kinds with an individual example on a page about their component
  const held = new Set<string>(); // kinds composites hold
  const markups = new Map<string, Set<string>>(); // component → the markup of its individual examples
  const home = new Map<string, string>(); // component → the page that owes its kinds
  for (const p of pages) {
    if (p.own && (p.slug === p.own || !home.has(p.own))) home.set(p.own, p.slug);
    let composite = false;
    for (const f of exampleFences(p.mdx).filter((x) => x.lang === 'html')) {
      const c = classifyFence(f, p.own, roots, p.slug, guideOf(p, shapes));
      c.holds.forEach((k) => held.add(k));
      if (!c.individual) {
        composite = true;
        continue;
      }
      shown.add(c.kind!);
      if (composite) of(p.slug).late.push(c.label);
      const owner = p.own ?? `page:${p.slug}`;
      const seen = markups.get(owner) ?? new Set<string>();
      if (seen.has(c.markup)) of(p.slug).duplicates.push(c.label);
      seen.add(c.markup);
      markups.set(owner, seen);
    }
  }
  const ownerPage = (k: string) => (k.startsWith('caption:') ? k.split(':')[1] : (home.get(k.split(':')[0]) ?? '(no page)'));
  for (const k of [...held].sort()) if (!shown.has(k)) of(ownerPage(k)).missing.push(k);
  for (const [slug, d] of debt) if (!d.late.length && !d.duplicates.length && !d.missing.length) debt.delete(slug);
  return debt;
}

/**
 * Part fences (` ```html example part `) that are not individual examples: a part card renders one component with no
 * preview around it (lib/components/part-card.tsx) - a composite there would show half an example. One entry per
 * such fence: "<page> line <n> "<label>"".
 */
export function compositeParts(pages: readonly PartPage[], roots: readonly PartRoot[], shapes: GuideClasses = new Set()): string[] {
  const out: string[] = [];
  for (const p of pages)
    for (const f of exampleFences(p.mdx).filter((x) => x.lang === 'html' && isPartMeta(x.meta)))
      if (!classifyFence(f, p.own, roots, p.slug, guideOf(p, shapes)).individual) out.push(`${p.slug} line ${f.line} "${f.label ?? ''}"`);
  return out;
}

/**
 * Part fences that would run something: a `<script>` or an inline handler (`onclick`). A part card mounts its markup
 * into the docs page itself, in a shadow root with no sandbox (runtime/code-example.ts initPartCards) - a script there
 * runs with the page. One entry per such fence: "<page> line <n> "<label>"".
 */
export function activeParts(pages: readonly PartPage[]): string[] {
  const out: string[] = [];
  for (const p of pages)
    for (const f of exampleFences(p.mdx).filter((x) => x.lang === 'html' && isPartMeta(x.meta))) {
      const { document } = parseHTML(`<!doctype html><html><body>${f.body}</body></html>`);
      const runs = [...document.body.querySelectorAll('*')].some((el) => el.tagName === 'SCRIPT' || [...el.attributes].some((at) => /^on/i.test(at.name)));
      if (runs) out.push(`${p.slug} line ${f.line} "${f.label ?? ''}"`);
    }
  return out;
}

/** The shapes classes for a guide - a page about no component that is not a template (a template is used whole). */
export const guideOf = (p: PartPage, shapes: GuideClasses): GuideClasses | null => (!p.own && p.type !== 'TPL' ? shapes : null);
