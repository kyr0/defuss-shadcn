/**
 * Why: dist/SKILL.md is the single discovery point for a 3rd-party agent
 * dropped into the library - it explains integration, philosophy, and the
 * dist/ layout once, then indexes every component skill. It must never drift
 * from the skills themselves, so it is GENERATED: the static prose lives in
 * src/SKILL_tpl.md (template - never inlined here, per repo rule) and the
 * per-component index is parsed from each component-skill.md's frontmatter
 * (name/why/when/where/supportedStates). build.ts regenerates src/SKILL.md
 * (which the 1:1 copy ships to dist/); verify.ts compares against this exact
 * logic. This module is fs-free (tests run in browser mode); the file-based
 * entry collection lives in ./skill-files.ts.
 */

import { COMPONENT_TYPES } from './taxonomy.ts';

/** Required frontmatter keys every component-skill.md must declare (AGENTS.md). */
export const SKILL_FRONTMATTER_KEYS = ['name', 'type', 'why', 'when', 'where', 'supportedStates'] as const;

export type SkillMeta = Record<(typeof SKILL_FRONTMATTER_KEYS)[number], string>;

/** Where the template and generated index live, relative to src/. */
export const SKILL_TEMPLATE_FILE = 'SKILL_tpl.md';
export const SKILL_OUTPUT_FILE = 'SKILL.md';

/** Marker in the template where the generated component index is injected. */
export const SKILL_COMPONENTS_MARKER = '<!-- COMPONENTS -->';

/**
 * Why: a tiny line-based YAML subset parser - the frontmatter is a flat
 * `key: value` map by contract, so a real YAML dependency would be
 * disproportionate (and this library ships zero dependencies).
 * Returns null when the block is absent, incomplete, or malformed.
 */
export function parseSkillFrontmatter(md: string): SkillMeta | null {
  if (!md.startsWith('---\n')) return null;
  const end = md.indexOf('\n---', 3);
  if (end < 0) return null;
  const meta: Record<string, string> = {};
  for (const line of md.slice(4, end).split('\n')) {
    if (!line.trim()) continue;
    const m = line.match(/^([A-Za-z][\w]*):\s*(.*)$/);
    if (!m) return null;
    meta[m[1]] = m[2].trim();
  }
  for (const key of SKILL_FRONTMATTER_KEYS) {
    if (!meta[key]) return null;
  }
  // the taxonomy code must be one of the five allowed types (fail-closed: an
  // unknown code would propagate into SKILL.md, the sidebar, and the badge)
  if (!(COMPONENT_TYPES as readonly string[]).includes(meta.type)) return null;
  return meta as SkillMeta;
}

export type SkillEntry = SkillMeta & { folder: string };

/** Render one `## Name` block of the generated index (user-facing contract:
 *  name, why, when, where, states, then links an agent can follow). Exported
 *  pure so tests/skill.test.ts pins the block shape without touching fs. */
export function renderSkillEntry(e: SkillEntry): string {
  const states = e.supportedStates.split(',').map((s) => s.trim()).filter(Boolean);
  // screenshot naming follows scripts/create-screenshots.ts: default state is
  // {name}.png, others {name}-{state}.png - spell them out so the agent never
  // has to guess (the repo root is one level up from dist/SKILL.md)
  const shots = states
    .map((s) => `screenshots/{light,dark}/${e.folder}${s === 'default' ? '' : `-${s}`}.png`)
    .join(', ');
  return [
    `## ${e.name}`,
    '',
    `**Type:** ${e.type}`,
    `**Why:** ${e.why}`,
    `**When:** ${e.when}`,
    `**Files:** ${e.where}`,
    `**Supported states:** ${states.join(', ')}`,
    `**Screenshots:** ${shots}`,
    `**Skill:** [components/${e.folder}/component-skill.md](components/${e.folder}/component-skill.md)`,
    '',
  ].join('\n');
}

/** Why: pure assembly (template + entries → final text) - fs-free so
 * tests/skill.test.ts (Vitest browser mode, no node:fs) can pin it. */
export function assembleSkillText(template: string, entries: SkillEntry[]): string {
  const index = entries.map(renderSkillEntry).join('\n');
  if (!template.includes(SKILL_COMPONENTS_MARKER))
    throw new Error(`${SKILL_TEMPLATE_FILE} lost the ${SKILL_COMPONENTS_MARKER} marker`);
  return template.replace(SKILL_COMPONENTS_MARKER, () => index.trimEnd()); // fn: index may contain `$`
}


// -- Top-level SKILL.md (the whole project packaged as one agent skill) ------

/** Template for the repo-root SKILL.md (relative to src/) and its output (relative to the repo root). */
export const ROOT_SKILL_TEMPLATE_FILE = 'SKILL_root_tpl.md';
/** The whole project as ONE Agent Skill, in the cross-harness layout
 *  (skills/<name>/SKILL.md): the skills CLI (`npx skills add`) and the
 *  Claude Code plugin (.claude-plugin/, source "./") both discover it there. */
export const ROOT_SKILL_OUTPUT_FILE = 'skills/defuss-shadcn/SKILL.md';
export const ROOT_SKILL_DOCS_MARKER = '<!-- DOCS -->';

/** One documentation page as the sidebar lists it (children = its submenu). */
export interface RootDocPage {
  label: string;
  slug: string;
  description: string;
  children: RootDocPage[];
}

export interface RootDocSection {
  heading: string;
  pages: RootDocPage[];
}

export interface RootSkillData {
  version: string;
  total: number;
  withJs: number;
  /** sidebar sections in order - pages AND components, the renderer splits them */
  sections: RootDocSection[];
  components: (SkillEntry & { hasJs: boolean })[];
  /** Absolute base the links resolve against (e.g. the repo's raw GitHub
   *  URL). An installed skill is its folder alone - repo-relative links
   *  would point at nothing - so the generated skill links absolutely; the
   *  link TEXT stays the repo path (= the path inside an npm install). */
  sourceBase?: string;
}

const pagePath = (slug: string): string => `src/documentation/pages/${slug}.mdx`;

/** Frontmatter prose may name elements (`An <hr> …`, `<dialog> + showModal()`):
 *  outside code spans a markdown renderer would emit them as REAL elements, so
 *  wrap every bare tag in backticks (existing `code` spans stay untouched). */
export function mdProse(text: string): string {
  return text
    .split(/(`[^`]*`)/)
    .map((part, i) => (i % 2 ? part : part.replace(/<\/?[a-zA-Z][^<>]*>/g, (tag) => `\`${tag}\``)))
    .join('');
}
const skillPath = (folder: string): string => `dist/components/${folder}/component-skill.md`;
/** [repo path](base + repo path) - the text says where the file lives in the repo / npm package. */
const link = (base: string | undefined, path: string, text = path): string => `[${text}](${base ?? ''}${path})`;

/** Docs map: every sidebar page that is NOT a component page (those live in the index). */
function renderDocsMap(data: RootSkillData, isComponent: (slug: string) => boolean): string {
  const line = (p: RootDocPage, depth: number): string[] => {
    const own = isComponent(p.slug)
      ? []
      : [`${'  '.repeat(depth)}- ${link(data.sourceBase, pagePath(p.slug), p.label)}${p.description ? ` - ${mdProse(p.description)}` : ''}`];
    return [...own, ...p.children.flatMap((c) => line(c, isComponent(p.slug) ? depth : depth + 1))];
  };
  return data.sections
    .map((s) => ({ heading: s.heading, lines: s.pages.flatMap((p) => line(p, 0)) }))
    .filter((s) => s.lines.length)
    .map((s) => `### ${s.heading}\n\n${s.lines.join('\n')}`)
    .join('\n\n');
}

/** Component index, grouped by sidebar section (unlisted components last). */
function renderComponentIndex(data: RootSkillData): string {
  const bySlug = new Map(data.components.map((c) => [c.folder, c]));
  const seen = new Set<string>();
  const block = (c: (typeof data.components)[number]): string => {
    const states = c.supportedStates.split(',').map((s) => `\`${s.trim()}\``).join(', ');
    return [
      `#### ${c.name} · ${c.type} · ${c.hasJs ? 'JS' : 'CSS'}`,
      '',
      `- **Why:** ${mdProse(c.why)}`,
      `- **When:** ${mdProse(c.when)}`,
      `- **States:** ${states} · **Skill:** ${link(data.sourceBase, skillPath(c.folder))} · **Examples:** ${link(data.sourceBase, pagePath(c.folder))}`,
    ].join('\n');
  };
  const collect = (pages: RootDocPage[]): string[] =>
    pages.flatMap((p) => {
      const c = bySlug.get(p.slug);
      const own = c && !seen.has(c.folder) ? (seen.add(c.folder), [block(c)]) : [];
      return [...own, ...collect(p.children)];
    });
  const groups = data.sections
    .map((s) => ({ heading: s.heading, blocks: collect(s.pages) }))
    .filter((g) => g.blocks.length);
  const rest = data.components.filter((c) => !seen.has(c.folder)).map(block);
  if (rest.length) groups.push({ heading: 'Other', blocks: rest });
  return groups.map((g) => `### ${g.heading}\n\n${g.blocks.join('\n\n')}`).join('\n\n');
}

/** Pure assembly of the repo-root SKILL.md (template + nav/page/skill data). */
export function assembleRootSkillText(template: string, data: RootSkillData): string {
  for (const marker of [ROOT_SKILL_DOCS_MARKER, SKILL_COMPONENTS_MARKER]) {
    if (!template.includes(marker)) throw new Error(`${ROOT_SKILL_TEMPLATE_FILE} lost the ${marker} marker`);
  }
  const isComponent = (slug: string): boolean => data.components.some((c) => c.folder === slug);
  return template
    .replaceAll('{{VERSION}}', data.version)
    .replaceAll('{{TOTAL}}', String(data.total))
    .replaceAll('{{WITH_JS}}', String(data.withJs))
    .replaceAll('{{CSS_ONLY}}', String(data.total - data.withJs))
    // function replacers: rendered text contains `df$` - a string replacement
    // would read "$`" as "insert the text before the match"
    .replace(ROOT_SKILL_DOCS_MARKER, () => renderDocsMap(data, isComponent))
    .replace(SKILL_COMPONENTS_MARKER, () => renderComponentIndex(data))
    .replace(/\n{3,}/g, '\n\n');
}
