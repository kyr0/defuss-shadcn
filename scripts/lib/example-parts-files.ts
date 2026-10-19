import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NAV } from '../../src/documentation/lib/nav.ts';
import { pageFile } from '../../src/documentation/lib/page-dirs-files.ts';
import { componentFile } from '../../src/documentation/lib/component-dirs.ts';
import { componentSources } from './apps-files.ts';
import { sections } from './sections-files.ts';
import { parseSkillFrontmatter } from './skill.ts';
import { ownedClasses, utilityClasses } from './studio-library.ts';
import {
  activeParts,
  componentRoots,
  compositeParts,
  exampleParts,
  type GuideClasses,
  type PageDebt,
  type PartComponent,
  type PartPage,
  type PartRoot,
} from './example-parts.ts';

/** The first ```html block of a skill's ## Structure section ('' when it has none). */
export const structureBlock = (md: string): string =>
  (md.split(/^## Structure\s*$/m)[1]?.split(/^## /m)[0] ?? '').match(/```html\n([\s\S]*?)```/)?.[1] ?? '';

/**
 * The fs half of scripts/lib/example-parts.ts: the components (their owned classes, their skill's Structure block and
 * declared `roots:`), and the pages of the sidebar sections that hold components, each with the component it is about
 * (its own, else its parent page's - as the Studio's library reads them). verify's `individual examples` gate and the
 * baseline writer read the same. VERIFIED: (verify, 2026-10-16) the gate's debt equals the baseline written from this
 * input - 159 pages; every one of the 240 components resolves a root.
 */
export function examplePartsInput(root: string = join(import.meta.dirname, '..', '..')): {
  components: PartComponent[];
  pages: PartPage[];
  shapes: GuideClasses;
} {
  const comps = join(root, 'src', 'components');
  const types = new Map<string, string>();
  const sources = componentSources();
  const owned = ownedClasses(sources);
  const components: PartComponent[] = sources.map((s) => {
    const md = readFileSync(componentFile(comps, s.name, 'component-skill.md'), 'utf8');
    const meta = parseSkillFrontmatter(md) as Record<string, string> | null;
    const declared = meta?.roots;
    if (meta?.type) types.set(s.name, meta.type);
    return {
      name: s.name,
      classes: owned(s.name),
      structure: structureBlock(md),
      // `roots: ".chart"` - quoted, so a YAML reader keeps `[data-lucide]` a string
      ...(declared ? { roots: declared.replace(/^"|"$/g, '').split(',').map((x) => x.trim()).filter(Boolean) } : {}),
    };
  });
  const names = new Set(components.map((c) => c.name));
  const headings = new Set(sections().map((s) => s.heading));
  const pages: PartPage[] = [];
  type Item = { href: string; type?: string; children?: Item[] };
  const walk = (items: readonly Item[], parent: string | null, inherited: string) =>
    items.forEach((i) => {
      const slug = i.href.replace(/\.html$/, '');
      const own = names.has(slug) ? slug : parent;
      const type = types.get(slug) || i.type || inherited;
      const file = pageFile(join(root, 'src', 'documentation', 'pages'), slug);
      if (existsSync(file)) pages.push({ slug, own, type, mdx: readFileSync(file, 'utf8') });
      walk(i.children ?? [], own, type);
    });
  NAV.filter((s) => headings.has(s.heading)).forEach((s) => walk(s.items as readonly Item[], null, ''));
  const shapes = new Set(utilityClasses(readFileSync(join(root, 'src', 'theme', 'utils', 'shapes.css'), 'utf8')));
  return { components, pages, shapes };
}

/** The roots, the components without one, every page's debt, the part fences that are composites and those that run something - as of the sources now. */
export function examplePartsNow(root?: string): {
  roots: PartRoot[];
  rootless: string[];
  debt: Map<string, PageDebt>;
  composites: string[];
  active: string[];
} {
  const { components, pages, shapes } = examplePartsInput(root);
  const { roots, rootless } = componentRoots(components);
  return { roots, rootless, debt: exampleParts(pages, roots, shapes), composites: compositeParts(pages, roots, shapes), active: activeParts(pages) };
}
