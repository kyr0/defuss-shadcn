import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NAV } from '../../src/documentation/lib/nav.ts';
import { appResolver } from './apps.ts';
import { componentSources } from './apps-files.ts';
import { EXTRA_BUNDLES } from './bundles.ts';
import { sectionNeeds, sectionPlans, type SectionPlan } from './sections.ts';

/**
 * Why: the file-system half of the section split (./sections.ts is pure):
 * the components from src/, and each section's `needs` resolved from what its
 * members document - every ```html block of their component-skill.md, the
 * markup a consumer copies. bundle.ts builds dist/sections/ from it,
 * stats-files.ts publishes it (the Bundles & Downloads page renders that),
 * verify checks dist/ against it, release-zips.ts packs it. One answer for all.
 *
 * VERIFIED: (tests/e2e/section-bundles.e2e.ts) the needs suffice - every
 * section's ZIP renders its members' skill markup exactly as core + that
 * section + its needs + every other section does.
 */

const ROOT = join(import.meta.dirname, '..', '..');
const SRC_COMPONENTS = join(ROOT, 'src', 'components');

export type Section = SectionPlan & {
  /** the headings of the other sections its documented markup uses, sidebar order */
  needs: string[];
};

const htmlBlocks = (md: string): string => [...md.matchAll(/```html\n([\s\S]*?)```/g)].map((m) => m[1]).join('\n');

/** Every section bundle with what it needs, in sidebar order. */
export function sections(): Section[] {
  const sources = componentSources();
  const plans = sectionPlans(NAV, sources.map((s) => ({ name: s.name, hasJs: s.ts !== '' })), EXTRA_BUNDLES);
  const owner = new Map(plans.flatMap((p) => p.members.map((m) => [m, p.heading] as const)));
  const order = plans.map((p) => p.heading);
  const resolve = appResolver(sources);
  return plans.map((plan) => {
    const markup = plan.members.map((m) => htmlBlocks(readFileSync(join(SRC_COMPONENTS, m, 'component-skill.md'), 'utf8'))).join('\n');
    return { ...plan, needs: sectionNeeds(plan, resolve(markup), owner, order) };
  });
}
