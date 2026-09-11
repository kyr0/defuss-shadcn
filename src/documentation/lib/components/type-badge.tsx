import type { Props } from 'defuss';

export const COMPONENT_TYPES = ['ATM', 'MOL', 'ORG', 'BLK', 'TPL'] as const;
export type ComponentType = (typeof COMPONENT_TYPES)[number];

/** Same mapping as scripts/lib/taxonomy.ts (verify's type-badge gates compare
 * the rendered markup against that module's typeBadgeHtml output). */
const TYPE_NAMES: Record<ComponentType, string> = {
  ATM: 'Atom',
  MOL: 'Molecule',
  ORG: 'Organism',
  BLK: 'Block',
  TPL: 'Template',
};

/** Doc-page title badge — renders byte-identical to taxonomy.ts typeBadgeHtml. */
export function TypeBadge({ type }: { type: ComponentType } & Props) {
  return (
    <span class="type-badge" data-type={type} title={TYPE_NAMES[type]}>
      {type}
    </span>
  );
}

/** Sidebar/palette badge — title carries the code itself (matches the old
 * layout.ts typeBadge()). */
export function NavTypeBadge({ type }: { type: ComponentType } & Props) {
  return (
    <span class="type-badge" data-type={type} title={type}>
      {type}
    </span>
  );
}
