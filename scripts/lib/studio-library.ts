import { classOwners, topLevelClasses, type AppComponentSource } from './apps.ts';
import { exampleFences, type ExampleFence } from './schema.ts';

/**
 * Why: the Studio's library is the docs' own examples - every ```html example fence of every page in a sidebar
 * section that holds components, under the page it is on: section → page (→ sub-pages) → example. A person picks
 * "Japanese text" on the Typography page, not "Typography"; what drops into the page is the markup that example shows.
 * (The first Studio listed the component skills' blocks, 463 of them: a skill block names the component, an example
 * names a use of it - the maintainer asked for the uses, 2026-10-15.)
 *
 * A component's page lists its parts first - each kind of the component alone, from its parts file
 * (src/components/<section>/<name>/<name>.parts.md, AGENTS.md "Individual examples"; the docs page shows none of them)
 * - then the page's examples in page order, its individual ones ahead of its composites. Which entry is individual is
 * scripts/lib/example-parts.ts' classification, handed in by the caller (one reader of the contract). The parts were
 * part cards on the docs pages from 2026-10-16 until the maintainer dropped those (2026-10-20).
 *
 * Two artifacts, because the markup is large - VERIFIED: (tmp/probe-example-size.ts, 2026-10-15) 1,661 examples
 * are 5 MB raw, 588 KiB compressed, the tree alone 167 KiB / 29 KiB: the tree (labels only) loads with the Studio, a
 * page's examples when one of them is picked. Pure - the caller reads the pages and components
 * (scripts/lib/studio-library-files.ts); verify's `studio library fresh` regenerates both and compares.
 */

/** One example: its label, the markup it drops into a page, and whether it is one component alone. */
export type StudioExample = { label: string; html: string; individual: boolean };
/** A docs page in the tree: its examples' labels (the markup: `examples/<slug>.json`) and its sub-pages. */
export type StudioPage = {
  slug: string;
  title: string;
  /** its taxonomy type: the component's, else the sidebar entry's, else its parent page's ('' when none) */
  type: string;
  /** its examples, individual ones first (the page's order) */
  examples: string[];
  /** the indexes of its individual examples - each one component alone */
  individual: number[];
  pages: StudioPage[];
};
/** A component as the Studio needs it beside the tree. */
export type StudioComponent = {
  name: string;
  title: string;
  type: string;
  /** the classes it owns - how a page shows that it is used (`.btn` is Button's) */
  classes: string[];
  /** it ships a script: a State API, its markup a function of its state (render()) */
  js: boolean;
  /** its schema (the HTML Preview Editor's State tab reads the same), null without one */
  schema: unknown;
};
/** The classes of one theme utility module (layout.css, sizing.css ...). */
export type StudioUtilities = { group: string; classes: string[] };
/** The tree, in sidebar order. */
export type StudioLibrary = {
  schema: 4;
  /** the release the library was written for */
  version: string;
  /** where each component's skill lives: `${skills}${name}/component-skill.md` (pinned to the release) */
  skills: string;
  components: StudioComponent[];
  /** the system's utility classes by module - what the class editor offers after the component's own */
  utilities: StudioUtilities[];
  /** each section with its sidebar icon: the inner markup of a 24 × 24 lucide SVG ('' when it has none) */
  sections: { heading: string; icon: string; pages: StudioPage[] }[];
};
/** A sidebar entry, as lib/nav.ts writes it. */
export type LibraryNavItem = { label: string; href: string; type?: string; children?: LibraryNavItem[] };
/** Whether a fence of a page is an individual example - the page's slug and the component it is about (or null). */
export type IndividualTest = (fence: ExampleFence, page: { slug: string; own: string | null }) => boolean;

/** the CDN folder of the release's component skills */
export const skillBase = (version: string): string =>
  `https://cdn.jsdelivr.net/gh/kyr0/defuss-shadcn@v${version}/dist/components/`;

/** The classes each component owns: its top-level classes that classOwners gives to it (`.btn` → button). */
export function ownedClasses(sources: readonly AppComponentSource[]): (name: string) => string[] {
  const owners = classOwners(sources);
  const byName = new Map(sources.map((s) => [s.name, s]));
  return (name) => [...topLevelClasses(byName.get(name)?.css ?? '')].filter((c) => owners(c).includes(name)).sort();
}

/**
 * Every class a stylesheet's selectors name, unescaped (`.w-1\/2` → `w-1/2`) and sorted - the utility modules write
 * theirs inside `:where()`, which topLevelClasses (a rule's leading class) does not read. VERIFIED:
 * (tmp/probe-utility-classes.ts) layout 135, sizing 1,042, shapes 294, accessibility 2.
 */
export function utilityClasses(css: string): string[] {
  const names = new Set<string>();
  for (const sel of css.replace(/\/\*[\s\S]*?\*\//g, '').match(/[^{};]+(?=\{)/g) ?? []) {
    if (/^\s*@/.test(sel)) continue;
    for (const m of sel.matchAll(/\.((?:\\.|[a-zA-Z0-9_-])+)/g)) names.add(m[1].replace(/\\(.)/g, '$1'));
  }
  return [...names].filter((n) => /^[a-z]/i.test(n)).sort();
}

/**
 * The examples of one page: each ```html example fence, scripts and stylesheet links removed (the Visual Editor's
 * parser drops scripts anyway; the page loads the system), its label (`label="..."`, else "<page> <n>"), and whether
 * it is individual (`isIndividual`, the contract's classification). A fence left with no element, or holding a whole
 * document, is no example.
 */
export function pageExamples(mdx: string, title: string, isIndividual: (fence: ExampleFence) => boolean = () => false): StudioExample[] {
  const out: StudioExample[] = [];
  exampleFences(mdx)
    .filter((f) => f.lang === 'html')
    .forEach((f, i) => {
      const html = f.body
        .replace(/<script\b[\s\S]*?<\/script>/gi, '')
        .replace(/<link\b[^>]*>/gi, '')
        .trim();
      if (/<(?:!doctype|html|head|body)\b/i.test(html)) return;
      if (!/<[a-z]/i.test(html.replace(/<!--[\s\S]*?-->/g, ''))) return;
      out.push({ label: f.label?.trim() || `${title} ${i + 1}`, html: `${html}\n`, individual: isIndividual(f) });
    });
  return out;
}

/**
 * The library: the sections that hold components, each with its sidebar entries as pages (sub-pages nested), every
 * page with its examples; a page with no example anywhere under it is left out. Returns the tree and, per page slug,
 * its file - the markup of its examples.
 */
export function studioLibrary(input: {
  sections: readonly { heading: string; icon?: string; items: readonly LibraryNavItem[] }[];
  /** a page's MDX by slug, null when there is no such page */
  page: (slug: string) => string | null;
  components: readonly StudioComponent[];
  utilities?: readonly StudioUtilities[];
  /** which fences are individual examples (scripts/lib/example-parts.ts); none when left out */
  isIndividual?: IndividualTest;
  /** the parts a page lists ahead of its examples - its component's parts file, on the component's home page */
  parts?: (slug: string) => StudioExample[];
  version: string;
}): { library: StudioLibrary; examples: Record<string, StudioExample[]> } {
  const examples: Record<string, StudioExample[]> = {};
  const byName = new Map(input.components.map((c) => [c.name, c]));
  const toPage = (item: LibraryNavItem, inherited: string, component: string | null): StudioPage | null => {
    const slug = item.href.replace(/\.html$/, '');
    const type = byName.get(slug)?.type || item.type || inherited;
    const own = byName.has(slug) ? slug : component;
    const mdx = input.page(slug);
    const list = [
      ...(input.parts?.(slug) ?? []),
      ...(mdx ? pageExamples(mdx, item.label, (f) => input.isIndividual?.(f, { slug, own }) ?? false) : []),
    ];
    const pages = (item.children ?? []).map((c) => toPage(c, type, own)).filter((p): p is StudioPage => !!p);
    if (!list.length && !pages.length) return null;
    if (list.length) examples[slug] = list;
    return {
      slug,
      title: item.label,
      type,
      examples: list.map((e) => e.label),
      individual: list.flatMap((e, i) => (e.individual ? [i] : [])),
      pages,
    };
  };
  const sections = input.sections
    .map((s) => ({
      heading: s.heading,
      icon: s.icon ?? '',
      pages: s.items.map((i) => toPage(i, '', null)).filter((p): p is StudioPage => !!p),
    }))
    .filter((s) => s.pages.length);
  return {
    library: {
      schema: 4,
      version: input.version,
      skills: skillBase(input.version),
      components: [...input.components],
      utilities: [...(input.utilities ?? [])],
      sections,
    },
    examples,
  };
}
