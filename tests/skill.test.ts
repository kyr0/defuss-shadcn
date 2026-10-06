import { describe, expect, it } from 'vitest';
import {
  assembleRootSkillText,
  referenceSkillText,
  assembleSkillText,
  mdProse,
  ROOT_SKILL_DOCS_MARKER,
  type RootSkillData,
  parseSkillFrontmatter,
  renderSkillEntry,
  SKILL_COMPONENTS_MARKER,
  SKILL_FRONTMATTER_KEYS,
  type SkillEntry,
} from '../scripts/lib/skill.ts';
import { flattenSkillIndex } from '../src/documentation/lib/component-links.ts';

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
section: overlays
why: Native <dialog> gives focus trap and Escape.
when: Modals - unless the answer is mandatory.
where: dist/components/dialog/dialog.css + dist/components/dialog/dialog.js
supportedStates: default, open
---

# Pattern: Dialog
`;

const entry = (over: Partial<SkillEntry> = {}): SkillEntry => ({
  folder: 'dialog',
  name: 'Dialog',
  type: 'MOL',
  section: 'overlays',
  why: 'Native <dialog> gives focus trap and Escape.',
  when: 'Modals - unless the answer is mandatory.',
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
    // src/SKILL.md links through the section; dist/SKILL.md ships it flat (flattenSkillIndex)
    expect(block).toContain('[components/overlays/dialog/component-skill.md](components/overlays/dialog/component-skill.md)');
    expect(flattenSkillIndex(block, new Set(['overlays']))).toContain('[components/dialog/component-skill.md](components/dialog/component-skill.md)');
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
  const template = `# defuss-shadcn - Agent Skill\n\ntokens in theme/utils/default-semantic-tokens.css\n\n# Components\n\n${SKILL_COMPONENTS_MARKER}\n`;

  it('injects the index in place of the marker, preserving template prose', () => {
    const text = assembleSkillText(template, [entry(), entry({ folder: 'badge', name: 'Badge', section: 'data-display', supportedStates: 'default' })]);
    expect(text).not.toContain(SKILL_COMPONENTS_MARKER);
    expect(text).toContain('Agent Skill');
    expect(text).toContain('theme/utils/default-semantic-tokens.css');
    expect(text).toContain('## Dialog');
    expect(text).toContain('## Badge');
    // index blocks render in given order and each link resolves relatively
    expect(text.indexOf('## Dialog')).toBeLessThan(text.indexOf('## Badge'));
    expect((text.match(/^## /gm) ?? []).length).toBe(2); // template headings are h1; ## are only the entries
    expect(text).toContain('[components/data-display/badge/component-skill.md](components/data-display/badge/component-skill.md)');
    // only skill paths under a known section flatten - the template's CDN paths stay as written
    expect(flattenSkillIndex('dist/components/button/button.css', new Set(['actions']))).toBe('dist/components/button/button.css');
  });

  it('throws when the template lost its marker', () => {
    expect(() => assembleSkillText('# no marker here', [entry()])).toThrow(/marker/);
  });
});

describe('assembleRootSkillText (repo-root SKILL.md)', () => {
  const dialog = { folder: 'dialog', name: 'Dialog', type: 'MOL', section: 'overlays', why: 'Native <dialog> + showModal().', when: 'Modals.', where: 'x', supportedStates: 'default, open', hasJs: true };
  const badge = { folder: 'badge', name: 'Badge', type: 'ATM', section: 'data-display', why: 'A span.', when: 'Labels - `df$` free.', where: 'y', supportedStates: 'default', hasJs: false };
  const data = (): RootSkillData => ({
    version: '9.9.9',
    total: 2,
    withJs: 1,
    sections: [
      { heading: 'Guides', pages: [{ label: 'Theming', slug: 'theming', description: 'Tokens.', children: [] }] },
      { heading: 'Overlays', pages: [{ label: 'Dialog', slug: 'dialog', description: 'Modal.', children: [] }] },
    ],
    components: [dialog, badge],
  });
  const tpl = `v{{VERSION}} {{TOTAL}}/{{WITH_JS}}/{{CSS_ONLY}}\n${ROOT_SKILL_DOCS_MARKER}\n${SKILL_COMPONENTS_MARKER}`;

  it('fills version and counts', () => {
    expect(assembleRootSkillText(tpl, data())).toMatch(/^v9\.9\.9 2\/1\/1/);
  });

  it('maps non-component pages to their .mdx source and leaves component pages to the index', () => {
    const out = assembleRootSkillText(tpl, data());
    expect(out).toContain('- [Theming](src/documentation/pages/theming.mdx) - Tokens.');
    expect(out).not.toContain('- [Dialog](src/documentation/pages/dialog.mdx)');
  });

  it('docs links are relative to the skill folder, component skills live inside it, {{RAW_BASE}} is filled', () => {
    // the plugin cache / npm install carry the package two levels up; the
    // component skills are copied into the skill folder itself
    const out = assembleRootSkillText(tpl + '\nraw: {{RAW_BASE}}', { ...data(), docsPrefix: '../../', rawBase: 'https://raw.example/r/v9.9.9/' });
    expect(out).toContain('- [Theming](../../src/documentation/pages/theming.mdx) - Tokens.');
    expect(out).toContain('**Skill:** [references/components/dialog.md](references/components/dialog.md)');
    expect(out).toContain('**Examples:** [src/documentation/pages/dialog.mdx](../../src/documentation/pages/dialog.mdx)');
    expect(out).toContain('raw: https://raw.example/r/v9.9.9/');
  });

  it('referenceSkillText flattens sibling skill links for the copied references', () => {
    expect(referenceSkillText('see [Button](../button/component-skill.md) and [x](../badge/component-skill.md#sizes)'))
      .toBe('see [Button](button.md) and [x](badge.md#sizes)');
  });

  it('indexes components by sidebar section with why/when, skill and example links', () => {
    const out = assembleRootSkillText(tpl, data());
    expect(out).toContain('### Overlays\n\n#### Dialog · MOL · JS');
    expect(out).toContain('**Skill:** [references/components/dialog.md](references/components/dialog.md)');
    expect(out).toContain('**Examples:** [src/documentation/pages/dialog.mdx](src/documentation/pages/dialog.mdx)');
    expect(out).toContain('**States:** `default`, `open`');
    // a component missing from the sidebar still lands in the index
    expect(out).toContain('### Other\n\n#### Badge · ATM · CSS');
  });

  it('keeps $ sequences literal (no String.replace pattern expansion)', () => {
    expect(assembleRootSkillText(tpl, data())).toContain('Labels - `df$` free.');
  });

  it('wraps bare tags in backticks so markdown renders them as text', () => {
    expect(mdProse('Native <dialog> + `<details>`')).toBe('Native `<dialog>` + `<details>`');
    expect(assembleRootSkillText(tpl, data())).toContain('Native `<dialog>` + showModal().');
  });

  it('throws when the template lost a marker', () => {
    expect(() => assembleRootSkillText('no markers', data())).toThrow(/marker/);
  });
});
