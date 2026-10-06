/**
 * Why: component sources sit in their sidebar section (src/components/<section>/<name>/), dist/ is
 * flat (dist/components/<name>/) - so a link between them is written for the source layout and
 * flattened when the file ships. Pure (no fs), so the unit tests run it in the browser; build.ts
 * writes dist/ through it, verify's dist 1:1 gate compares through it.
 *
 * VERIFIED: (tests/skill.test.ts) the shipped index links flat, and nothing but skill links under a
 * known section changes.
 */

/**
 * The skill index as it ships: src/SKILL.md links each skill through its section
 * (`components/actions/button/component-skill.md`), dist/SKILL.md through the flat layout
 * (`components/button/component-skill.md`). Only skill paths under a known section change.
 * @param md - src/SKILL.md
 * @param sections - the section folder names
 * @returns the index with every skill path flattened
 */
export function flattenSkillIndex(md: string, sections: ReadonlySet<string>): string {
  return md.replace(/\bcomponents\/([a-z0-9-]+)\/([a-z0-9-]+)\/component-skill\.md/g, (m, section: string, name: string) => (sections.has(section) ? `components/${name}/component-skill.md` : m));
}

/**
 * A component skill's links as they ship: in src/ a skill links a sibling through its section
 * (`](../../actions/button/component-skill.md)`), in the flat dist/ the same file sits one level
 * shallower (`](../button/component-skill.md)`). build.ts writes dist/ through this; verify's dist 1:1
 * gate compares through it. Only link targets change - prose naming a source path stays.
 * @param md - a component-skill.md as authored in src/
 * @param sections - the section folder names
 * @returns the text with every sectioned sibling link flattened
 */
export function flattenComponentLinks(md: string, sections: ReadonlySet<string>): string {
  return md.replace(/\]\(\.\.\/\.\.\/([a-z0-9-]+)\/([a-z0-9-]+)\//g, (m, section: string, name: string) => (sections.has(section) ? `](../${name}/` : m));
}
