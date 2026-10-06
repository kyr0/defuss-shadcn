/**
 * Why: the folders on disk read like the documentation's sidebar - every component lives in
 * src/components/<section>/<name>/, where <section> is the slug of its sidebar section, and its skill's
 * front matter names that section (`section: actions`). An agent - or a person - finds a component
 * where the docs show it, and a component that moves in the sidebar must move on disk too. Pure: verify's
 * `component sections` gate passes it what it read from src/ and the sidebar plan (./sections.ts).
 *
 * VERIFIED: (tests/component-sections.test.ts) each way a component can be misplaced is reported, with
 * the move or the front-matter line that fixes it.
 */

export interface ComponentPlacement {
  /** the component's name (its folder) */
  name: string;
  /** the folder it sits in under src/components/ - null when it sits there directly, in no section */
  folder: string | null;
  /** the `section:` its component-skill.md front matter declares - null when it declares none */
  declared: string | null;
}

/**
 * Every misplacement, each with its fix.
 * @param placements - where each component sits and what its skill declares
 * @param expected - component name → the slug of the sidebar section that lists it
 * @param folders - every folder directly under src/components/ that holds no component itself
 * @returns the problems, empty when the layout matches the sidebar
 */
export function sectionProblems(
  placements: readonly ComponentPlacement[],
  expected: ReadonlyMap<string, string>,
  folders: readonly string[],
): string[] {
  const out: string[] = [];
  const sections = new Set(expected.values());
  for (const p of placements) {
    const want = expected.get(p.name);
    const at = p.folder ? `src/components/${p.folder}/${p.name}/` : `src/components/${p.name}/`;
    if (!want) {
      out.push(`${at}: no sidebar section lists ${p.name}.html - add it to src/documentation/lib/nav.ts`);
      continue;
    }
    if (p.folder === null) out.push(`${at} is in no section folder - move it to src/components/${want}/${p.name}/ (git mv)`);
    else if (p.folder !== want) out.push(`${at} is in "${p.folder}", but the sidebar lists it under "${want}" - move it to src/components/${want}/${p.name}/ (git mv)`);
    if (p.declared === null) out.push(`${at}component-skill.md: no \`section:\` in the front matter - add \`section: ${want}\``);
    else if (p.declared !== want) out.push(`${at}component-skill.md: \`section: ${p.declared}\`, but the sidebar section is "${want}" - write \`section: ${want}\``);
  }
  for (const f of folders) if (!sections.has(f)) out.push(`src/components/${f}/ is not a sidebar section (${[...sections].sort().join(', ')}) - move its components into their sections and remove it`);
  return out;
}
