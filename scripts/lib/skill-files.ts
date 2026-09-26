import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseSkillFrontmatter,
  SKILL_FRONTMATTER_KEYS,
  SKILL_TEMPLATE_FILE,
  assembleSkillText,
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
