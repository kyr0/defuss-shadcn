import { describe, expect, it } from 'vitest';
import {
  assembleSkillText,
  parseSkillFrontmatter,
  renderSkillEntry,
  SKILL_COMPONENTS_MARKER,
  SKILL_FRONTMATTER_KEYS,
  type SkillEntry,
} from '../scripts/lib/skill.ts';

/**
 * Why: dist/SKILL.md is the entry point a 3rd-party agent reads first; its
 * generator (scripts/lib/skill.ts) parses each skill's frontmatter and renders
 * the index. These tests pin the parse contract (all keys required), the
 * rendered block shape (incl. the screenshot naming agents rely on), and that
 * the real src/ tree renders deterministically without the marker leaking.
 */

const VALID = `---
name: Dialog
type: MOL
why: Native <dialog> gives focus trap and Escape.
when: Modals — unless the answer is mandatory.
where: dist/components/dialog/dialog.css + dist/components/dialog/dialog.js
supportedStates: default, open
---

# Pattern: Dialog
`;

const entry = (over: Partial<SkillEntry> = {}): SkillEntry => ({
  folder: 'dialog',
  name: 'Dialog',
  type: 'MOL',
  why: 'Native <dialog> gives focus trap and Escape.',
  when: 'Modals — unless the answer is mandatory.',
  where: 'dist/components/dialog/dialog.css + dist/components/dialog/dialog.js',
  supportedStates: 'default, open',
  ...over,
});

describe('parseSkillFrontmatter', () => {
  it('parses every required key from a valid block', () => {
    const meta = parseSkillFrontmatter(VALID);
    expect(meta).not.toBeNull();
    for (const key of SKILL_FRONTMATTER_KEYS) expect(meta![key]).toBeTruthy();
    expect(meta!.name).toBe('Dialog');
    expect(meta!.type).toBe('MOL');
    expect(meta!.supportedStates).toBe('default, open');
  });

  it('returns null without a leading fence or unclosed block', () => {
    expect(parseSkillFrontmatter('# Pattern: Dialog\n')).toBeNull();
    expect(parseSkillFrontmatter('---\nname: X\n')).toBeNull();
  });

  it('returns null when any required key is missing or empty', () => {
    for (const key of SKILL_FRONTMATTER_KEYS) {
      const md = VALID.split('\n')
        .filter((l) => !l.startsWith(`${key}:`))
        .join('\n');
      expect(parseSkillFrontmatter(md)).toBeNull();
    }
  });

  it('returns null on a malformed (non key: value) line', () => {
    expect(parseSkillFrontmatter('---\njust prose\nname: X\n---\n')).toBeNull();
  });

  it('returns null when type is not one of the five taxonomy codes', () => {
    expect(parseSkillFrontmatter(VALID.replace('type: MOL', 'type: ATOM'))).toBeNull();
    expect(parseSkillFrontmatter(VALID.replace('type: MOL', 'type: '))).toBeNull();
  });

  it('accepts extra unknown keys (forward-compatible frontmatter)', () => {
    const md = VALID.replace('---\nname:', '---\nversion: 2\nname:');
    expect(parseSkillFrontmatter(md)?.name).toBe('Dialog');
  });
});

describe('renderSkillEntry', () => {
  const block = renderSkillEntry(entry());

  it('renders the index block with name, type, why, when, files, states, skill link', () => {
    expect(block).toMatch(/^## Dialog\n/);
    expect(block).toContain('**Type:** MOL');
    expect(block).toContain('**Why:** Native <dialog> gives focus trap and Escape.');
    expect(block).toContain('**When:** Modals');
    expect(block).toContain('**Files:** dist/components/dialog/dialog.css + dist/components/dialog/dialog.js');
    expect(block).toContain('**Supported states:** default, open');
    expect(block).toContain('[components/dialog/component-skill.md](components/dialog/component-skill.md)');
  });

  it('maps screenshots per state: default = {name}.png, others = {name}-{state}.png', () => {
    const shots = block.match(/\*\*Screenshots:\*\* (.*)/)![1];
    expect(shots).toContain('screenshots/{light,dark}/dialog.png');
    expect(shots).toContain('screenshots/{light,dark}/dialog-open.png');
    // CSS-only component (single default state) → exactly one file pattern
    const cssOnly = renderSkillEntry(entry({ folder: 'badge', supportedStates: 'default' }));
    const only = cssOnly.match(/\*\*Screenshots:\*\* (.*)/)![1];
    expect(only).toBe('screenshots/{light,dark}/badge.png');
  });
});

describe('assembleSkillText', () => {
  // fs-free (Vitest browser mode): the real-tree render is pinned by verify's
  // "SKILL.md ↔ skills" gate, which compares against this same function.
  const template = `# defuss-shadcn — Agent Skill\n\ntokens in theme/utils/default-semantic-tokens.css\n\n# Components\n\n${SKILL_COMPONENTS_MARKER}\n`;

  it('injects the index in place of the marker, preserving template prose', () => {
    const text = assembleSkillText(template, [entry(), entry({ folder: 'badge', name: 'Badge', supportedStates: 'default' })]);
    expect(text).not.toContain(SKILL_COMPONENTS_MARKER);
    expect(text).toContain('Agent Skill');
    expect(text).toContain('theme/utils/default-semantic-tokens.css');
    expect(text).toContain('## Dialog');
    expect(text).toContain('## Badge');
    // index blocks render in given order and each link resolves relatively
    expect(text.indexOf('## Dialog')).toBeLessThan(text.indexOf('## Badge'));
    expect((text.match(/^## /gm) ?? []).length).toBe(2); // template headings are h1; ## are only the entries
    expect(text).toContain('[components/badge/component-skill.md](components/badge/component-skill.md)');
  });

  it('throws when the template lost its marker', () => {
    expect(() => assembleSkillText('# no marker here', [entry()])).toThrow(/marker/);
  });
});
