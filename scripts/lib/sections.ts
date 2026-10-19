import type { NavItem, NavSection } from '../../src/documentation/lib/nav.ts';
import { sectionSlug } from '../../src/documentation/lib/page-dirs.ts';

/**
 * Why: all.* (every component) and core + one file per component are the two
 * ends of loading the system; a page that uses one area - the forms, the
 * website blocks - wants the area, not 228 files or the whole bundle. The
 * sidebar already groups the components by area, and every component sits in
 * exactly one section, so the section IS the unit: one bundle per sidebar
 * section that holds components - dist/sections/{name}.css (+ .js when a
 * member has JS, + the min twins minify.ts derives).
 *
 * A section bundle carries ONLY its members, like an extra bundle
 * (./bundles.ts): it binds to the df$ runtime core.js (or all.js) installed,
 * so loading several sections never ships a component twice. What else a
 * section's markup needs is listed instead (`needs`, computed in
 * ./sections-files.ts from the members' documented markup with the apps
 * resolver). A section whose members are exactly an extra bundle's (WYSIWYG
 * Editors = wysiwyg, Math = math) IS that bundle - no second copy. An extra
 * bundle that is a PART of a section (mermaid in Diagrams) stays in the
 * section bundle too: the section path (core + sections) and the all path
 * (all.* + extra bundles) are two ways to load the system, and no page takes
 * a file from both.
 *
 * Pure (no fs): bundle.ts, stats-files.ts, verify.ts and release-zips.ts read
 * the plan through ./sections-files.ts.
 *
 * VERIFIED: (tests/sections.test.ts) a component in no section or in two, and
 * an extra bundle spread over two sections, fail the plan.
 */

export type SectionPlan = {
  /** the bundle's file name: the heading slug, or the extra bundle it reuses */
  name: string;
  /** the sidebar section heading */
  heading: string;
  /** its components, in sidebar order */
  members: string[];
  /** dist-relative directory of the bundle files: `sections`, or `components` for a reused extra bundle */
  dir: 'sections' | 'components';
  /** true when a member ships JS - the bundle then has a .js next to its .css */
  hasJs: boolean;
};

// the section folder rule is the docs lib's (page-dirs.ts owns the layout);
// re-exported for the scripts that import it from here
export { sectionSlug };

const flatten = (items: readonly NavItem[]): NavItem[] => items.flatMap((i) => [i, ...flatten(i.children ?? [])]);

/**
 * The section bundles in sidebar order. A component belongs to the section
 * whose items link `{name}.html`; sections without components (Introduction)
 * get no bundle. Throws when a component is in no section or in two, or when
 * an extra bundle lies partly outside a section it overlaps - the split must
 * partition the components, and an extra bundle is one area or a part of one.
 */
export function sectionPlans(
  nav: readonly NavSection[],
  components: readonly { name: string; hasJs: boolean }[],
  extraBundles: Readonly<Record<string, readonly string[]>>,
): SectionPlan[] {
  const byName = new Map(components.map((c) => [c.name, c]));
  const owner = new Map<string, string>();
  const plans: SectionPlan[] = [];
  for (const sec of nav) {
    const members: string[] = [];
    for (const item of flatten(sec.items)) {
      const name = item.href.replace(/\.html$/, '');
      if (!byName.has(name) || members.includes(name)) continue;
      if (owner.has(name)) throw new Error(`sections: "${name}" is in "${owner.get(name)}" and "${sec.heading}"`);
      owner.set(name, sec.heading);
      members.push(name);
    }
    if (!members.length) continue;
    let name = sectionSlug(sec.heading);
    let dir: SectionPlan['dir'] = 'sections';
    for (const [bundle, bundleMembers] of Object.entries(extraBundles)) {
      const shared = bundleMembers.filter((m) => members.includes(m));
      if (!shared.length) continue;
      if (shared.length !== bundleMembers.length)
        throw new Error(`sections: the ${bundle} bundle lies partly outside "${sec.heading}" - an extra bundle is one section or a part of one`);
      // a part of the section: the section bundle carries it as well
      if (shared.length !== members.length) continue;
      name = bundle;
      dir = 'components';
    }
    plans.push({ name, heading: sec.heading, members, dir, hasJs: members.some((m) => byName.get(m)!.hasJs) });
  }
  const orphans = components.filter((c) => !owner.has(c.name)).map((c) => c.name);
  if (orphans.length) throw new Error(`sections: not in any sidebar section: ${orphans.join(', ')}`);
  return plans;
}

/** dist-relative paths of a section bundle's generated files (not their derived min twins / js maps). */
export function sectionArtifacts(plan: SectionPlan): string[] {
  const base = `${plan.dir}/${plan.name}`;
  return [`${base}.css`, `${base}.min.css.map`, ...(plan.hasJs ? [`${base}.js`] : [])];
}

/**
 * The other sections a section's markup needs, in sidebar order: `used` is
 * every component the members' documented markup uses (the apps resolver -
 * directly, or through markup a member's JS writes), `owner` maps each
 * component to its section heading.
 */
export function sectionNeeds(plan: SectionPlan, used: readonly string[], owner: ReadonlyMap<string, string>, order: readonly string[]): string[] {
  const needed = new Set(used.filter((c) => !plan.members.includes(c)).map((c) => owner.get(c)!));
  return order.filter((h) => needed.has(h) && h !== plan.heading);
}
