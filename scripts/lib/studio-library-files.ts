import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NAV } from '../../src/documentation/lib/nav.ts';
import { NAV_ICONS } from '../../src/documentation/lib/nav-icons.ts';
import { pageFile } from '../../src/documentation/lib/page-dirs-files.ts';
import { componentFile } from '../../src/documentation/lib/component-dirs.ts';
import { componentSources } from './apps-files.ts';
import { sections } from './sections-files.ts';
import { parseSkillFrontmatter } from './skill.ts';
import { ownedClasses, studioLibrary, utilityClasses, type StudioComponent } from './studio-library.ts';
import { examplePartsInput } from './example-parts-files.ts';
import { classifyFence, componentRoots, guideOf } from './example-parts.ts';

/**
 * The fs half of the Studio's library (scripts/lib/studio-library.ts is the pure one): reads the sidebar, the pages
 * and the components, and returns the files the docs serve - `studio/library.json` and one
 * `studio/examples/<slug>.json` per page with examples, by path from the docs root. scripts/build-docs.ts writes
 * them, verify's `studio library fresh` compares them - one owner, two readers. Each section carries its sidebar icon
 * (lib/nav-icons.ts), and the library the utility modules' classes (src/theme/utils/) for the class editor.
 * VERIFIED: (verify, 2026-10-15) the docs build's files and this function's agree - the tree and 378 pages of
 * examples.
 */
export function studioLibraryFiles(root: string = join(import.meta.dirname, '..', '..')): Map<string, string> {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
  const comps = join(root, 'src', 'components');
  const pages = join(root, 'src', 'documentation', 'pages');
  const sources = componentSources();
  const owned = ownedClasses(sources);
  const plans = sections();
  const order = plans.flatMap((s) => s.members);
  const components: StudioComponent[] = [...sources]
    .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name))
    .map((s) => {
      const meta = parseSkillFrontmatter(readFileSync(componentFile(comps, s.name, 'component-skill.md'), 'utf8'));
      const schema = componentFile(comps, s.name, `${s.name}.schema.json`);
      return {
        name: s.name,
        title: meta?.name ?? s.name,
        type: meta?.type ?? '',
        classes: owned(s.name),
        js: s.ts !== '',
        schema: existsSync(schema) ? JSON.parse(readFileSync(schema, 'utf8')) : null,
      };
    });
  const headings = new Set(plans.map((s) => s.heading));
  const utilities = (['layout', 'sizing', 'shapes', 'accessibility'] as const).map((m) => ({
    group: m[0].toUpperCase() + m.slice(1),
    classes: utilityClasses(readFileSync(join(root, 'src', 'theme', 'utils', `${m}.css`), 'utf8')),
  }));
  const parts = examplePartsInput(root);
  const { roots } = componentRoots(parts.components);
  const partPages = new Map(parts.pages.map((p) => [p.slug, p]));
  const { library, examples } = studioLibrary({
    sections: NAV.filter((s) => headings.has(s.heading)).map((s) => ({ ...s, icon: NAV_ICONS[s.icon] ?? '' })),
    page: (slug) => {
      const file = pageFile(pages, slug);
      return existsSync(file) ? readFileSync(file, 'utf8') : null;
    },
    components,
    utilities,
    // which entries are individual examples - the contract's own classification (scripts/lib/example-parts.ts), with
    // the contract's page: a guide's part fences are individual by its gallery classes. VERIFIED: (2026-10-16) without
    // the page and its guide classes the library marked none of the Shapes page's 254 part fences
    isIndividual: (fence, p) => {
      const page = partPages.get(p.slug);
      return classifyFence(fence, p.own, roots, p.slug, page ? guideOf(page, parts.shapes) : null).individual;
    },
    version: pkg.version,
  });
  const files = new Map<string, string>([['studio/library.json', `${JSON.stringify(library)}\n`]]);
  for (const [slug, list] of Object.entries(examples)) files.set(`studio/examples/${slug}.json`, `${JSON.stringify(list)}\n`);
  return files;
}
