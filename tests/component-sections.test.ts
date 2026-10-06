import { describe, expect, it } from 'vitest';
import { sectionProblems } from '../scripts/lib/component-sections.ts';

/**
 * Why: verify's `component sections` gate keeps the folders on disk equal to the sidebar - this pins
 * each way a component can be misplaced, and that the fix is named.
 */
const expected = new Map([
  ['button', 'actions'],
  ['badge', 'data-display'],
]);

describe('sectionProblems', () => {
  it('a component in its section folder, declaring it: no problem', () => {
    expect(sectionProblems([{ name: 'button', folder: 'actions', declared: 'actions' }], expected, ['actions'])).toEqual([]);
  });

  it('a component directly under src/components/: move it into its section', () => {
    expect(sectionProblems([{ name: 'button', folder: null, declared: 'actions' }], expected, [])).toEqual([
      'src/components/button/ is in no section folder - move it to src/components/actions/button/ (git mv)',
    ]);
  });

  it('a component in another section than the sidebar shows', () => {
    const p = sectionProblems([{ name: 'badge', folder: 'actions', declared: 'actions' }], expected, ['actions']);
    expect(p.join('\n')).toContain('is in "actions", but the sidebar lists it under "data-display" - move it to src/components/data-display/badge/');
    expect(p.join('\n')).toContain('`section: actions`, but the sidebar section is "data-display"');
  });

  it('a skill without section: in its front matter', () => {
    expect(sectionProblems([{ name: 'button', folder: 'actions', declared: null }], expected, ['actions'])).toEqual([
      'src/components/actions/button/component-skill.md: no `section:` in the front matter - add `section: actions`',
    ]);
  });

  it('a component no sidebar section lists', () => {
    expect(sectionProblems([{ name: 'orphan', folder: 'actions', declared: 'actions' }], expected, ['actions'])[0]).toContain('no sidebar section lists orphan.html');
  });

  it('a folder that is not a sidebar section', () => {
    expect(sectionProblems([], expected, ['actions', 'misc'])).toEqual([
      'src/components/misc/ is not a sidebar section (actions, data-display) - move its components into their sections and remove it',
    ]);
  });
});
