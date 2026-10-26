import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { NAV } from '../../src/documentation/lib/nav.ts';
import { pageDirs, pageFile } from '../../src/documentation/lib/page-dirs-files.ts';
import { componentDirs, componentFile, isPartsFile, partsFileName } from '../../src/documentation/lib/component-dirs.ts';
import { componentSources } from './apps-files.ts';
import { sections } from './sections-files.ts';
import { parseSkillFrontmatter } from './skill.ts';
import { ownedClasses } from './studio-library.ts';
import {
  componentRoots,
  exampleParts,
  pagePartFences,
  strayParts,
  type ExampleDebt,
  type PartComponent,
  type PartPage,
  type PartRoot,
  type PartsFile,
} from './example-parts.ts';

/** The first ```html block of a skill's ## Structure section ('' when it has none). */
export const structureBlock = (md: string): string =>
  (md.split(/^## Structure\s*$/m)[1]?.split(/^## /m)[0] ?? '').match(/```html\n([\s\S]*?)```/)?.[1] ?? '';

/**
 * The fs half of scripts/lib/example-parts.ts: the components (their owned classes, their skill's Structure block and
 * declared `roots:`), their parts files (`<name>.parts.md` beside the sources), the pages of the sidebar sections that
 * hold components, each with the component it is about (its own, else its parent page's - as the Studio's library
 * reads them), and every page's MDX for the part-card check. verify's `individual examples` gate, the generator and the
 * Studio's library read the same. VERIFIED: (tmp/probe-parts-contract.ts, 2026-10-20) over the migrated sources - 104
 * parts files, 396 pages of the component sections, 404 pages in all - no debt, no stray part, no part fence on a page,
 * and every component resolves a root.
 */
export function examplePartsInput(root: string = join(import.meta.dirname, '..', '..')): {
  components: PartComponent[];
  pages: PartPage[];
  parts: PartsFile[];
  /** every docs page - the sections without components too */
  allPages: { slug: string; mdx: string }[];
  /** `*.parts.md` files in a component folder that are not named after it (no reader takes them) */
  misnamed: string[];
} {
  const comps = join(root, 'src', 'components');
  const pagesDir = join(root, 'src', 'documentation', 'pages');
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
  const parts: PartsFile[] = [];
  const misnamed: string[] = [];
  for (const c of componentDirs(comps)) {
    for (const f of readdirSync(c.dir).filter(isPartsFile))
      if (f !== partsFileName(c.name)) misnamed.push(`src/components/${c.section}/${c.name}/${f}`);
    const file = join(c.dir, partsFileName(c.name));
    if (existsSync(file)) parts.push({ component: c.name, md: readFileSync(file, 'utf8') });
  }
  const names = new Set(components.map((c) => c.name));
  const headings = new Set(sections().map((s) => s.heading));
  const pages: PartPage[] = [];
  type Item = { href: string; type?: string; children?: Item[] };
  const walk = (items: readonly Item[], parent: string | null, inherited: string) =>
    items.forEach((i) => {
      const slug = i.href.replace(/\.html$/, '');
      const own = names.has(slug) ? slug : parent;
      const type = types.get(slug) || i.type || inherited;
      const file = pageFile(pagesDir, slug);
      if (existsSync(file)) pages.push({ slug, own, type, mdx: readFileSync(file, 'utf8') });
      walk(i.children ?? [], own, type);
    });
  NAV.filter((s) => headings.has(s.heading)).forEach((s) => walk(s.items as readonly Item[], null, ''));
  const allPages = pageDirs(pagesDir).map((p) => ({ slug: p.slug, mdx: readFileSync(pageFile(pagesDir, p.slug), 'utf8') }));
  return { components, pages, parts, allPages, misnamed };
}

/** The roots, the components without one, the debt, the parts that are no instance of their component, the part fences on pages - as of the sources now. */
export function examplePartsNow(root?: string): {
  roots: PartRoot[];
  rootless: string[];
  debt: Map<string, ExampleDebt>;
  strays: string[];
  onPages: string[];
} {
  const { components, pages, parts, allPages, misnamed } = examplePartsInput(root);
  const { roots, rootless } = componentRoots(components);
  return {
    roots,
    rootless,
    debt: exampleParts(pages, parts, roots),
    strays: [...misnamed.map((f) => `${f} is not named after its folder - no reader takes it`), ...strayParts(parts, roots)],
    onPages: pagePartFences(allPages),
  };
}
