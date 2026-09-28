import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseSkillFrontmatter,
  SKILL_FRONTMATTER_KEYS,
  SKILL_TEMPLATE_FILE,
  ROOT_SKILL_TEMPLATE_FILE,
  assembleSkillText,
  assembleRootSkillText,
  type RootDocPage,
  type SkillEntry,
} from './skill.ts';

/**
 * Why: the file-system half of SKILL.md generation, split from the pure
 * module (skill.ts) so the pure half stays importable in Vitest browser mode
 * (no node:fs there). build.ts and verify.ts use these.
 */

/**
 * Why: collect the index entries for every component folder, in stable
 * alphabetical order, failing loudly (throw) on the first skill without valid
 * frontmatter - a component without a discoverable entry is the exact failure
 * mode SKILL.md exists to prevent.
 */
export function skillEntries(compsDir: string): SkillEntry[] {
  const entries: SkillEntry[] = [];
  for (const folder of readdirSync(compsDir).sort()) {
    const skill = join(compsDir, folder, 'component-skill.md');
    if (!existsSync(skill)) continue; // "component skills" gate reports that
    const meta = parseSkillFrontmatter(readFileSync(skill, 'utf8'));
    if (!meta)
      throw new Error(
        `src/components/${folder}/component-skill.md is missing valid frontmatter (${SKILL_FRONTMATTER_KEYS.join('/')}) - see AGENTS.md "Component skill template"`,
      );
    entries.push({ folder, ...meta });
  }
  return entries;
}

/** Why: the full SKILL.md text - template prose + generated index. Pure
 * function of src/, so build.ts (write) and verify.ts (compare) share one truth. */
export function buildSkillText(src: string): string {
  return assembleSkillText(
    readFileSync(join(src, SKILL_TEMPLATE_FILE), 'utf8'),
    skillEntries(join(src, 'components')),
  );
}

/** Page frontmatter (`title:` / `description:`) of one docs page, or blanks. */
function pageMeta(pagesDir: string, slug: string): { title: string; description: string } {
  const file = join(pagesDir, `${slug}.mdx`);
  if (!existsSync(file)) return { title: '', description: '' };
  const fm = readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  const field = (k: string): string =>
    (fm.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, 'm'))?.[1] ?? '').replace(/\\"/g, '"');
  return { title: field('title'), description: field('description') };
}

/** Why: the repo-root SKILL.md - the whole project as ONE agent skill. Pure
 * function of the repo (template, sidebar nav, page + skill frontmatter,
 * package version), so build.ts writes it and verify.ts compares it. */
export async function buildRootSkillText(root: string): Promise<string> {
  const src = join(root, 'src');
  const pagesDir = join(src, 'documentation', 'pages');
  const { NAV } = await import(join(src, 'documentation', 'lib', 'nav.ts'));
  type Nav = { label: string; href: string; children?: Nav[] };
  const toPage = (n: Nav): RootDocPage => {
    const slug = n.href.replace(/\.html$/, '');
    return { label: n.label, slug, description: pageMeta(pagesDir, slug).description, children: (n.children ?? []).map(toPage) };
  };
  const compsDir = join(src, 'components');
  const components = skillEntries(compsDir).map((e) => ({
    ...e,
    hasJs: existsSync(join(compsDir, e.folder, `${e.folder}.ts`)),
  }));
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const version = pkg.version as string;
  // raw file URLs on the default branch: the skill installers take the repo
  // HEAD, so HEAD's files are the ones the skill describes
  const repo = String(typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url ?? '')
    .replace(/^git\+/, '')
    .replace(/^git@github\.com:/, 'https://github.com/')
    .replace(/\.git$/, '');
  const sourceBase = repo.replace(/^https:\/\/github\.com\//, 'https://raw.githubusercontent.com/') + '/main/';
  return assembleRootSkillText(readFileSync(join(src, ROOT_SKILL_TEMPLATE_FILE), 'utf8'), {
    version,
    sourceBase,
    total: components.length,
    withJs: components.filter((c) => c.hasJs).length,
    sections: (NAV as { heading: string; items: Nav[] }[]).map((s) => ({ heading: s.heading, pages: s.items.map(toPage) })),
    components,
  });
}
