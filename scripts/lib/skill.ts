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
  return template.replace(SKILL_COMPONENTS_MARKER, index.trimEnd());
}

