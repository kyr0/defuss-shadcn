import { describe, expect, it } from 'vitest';
import {
  BADGE_ANCHOR,
  injectTypeBadge,
  typeBadgeHtml,
} from '../scripts/lib/taxonomy.ts';

import { COMPONENT_TYPES } from '../scripts/lib/taxonomy.ts';

/**
 * Why: the doc-page type badge is generated (never hand-written) and lives
 * inside the page-title <h1>, right after the component name. These tests pin
 * that contract: exact badge markup, the h1 anchor, idempotent re-injection
 * (type change replaces the old badge), and fail-closed errors.
 */

describe('COMPONENT_TYPES', () => {
  it('includes TPL (Template) - the whole-composition taxonomy class', () => {
    expect(COMPONENT_TYPES).toContain('TPL');
  });
});

const PAGE = `<div class="page-header">${BADGE_ANCHOR}Badge</h1></div>`;

describe('injectTypeBadge', () => {
  it('places the exact badge markup inside the title h1, after the name', () => {
    const out = injectTypeBadge(PAGE, 'ATM');
    expect(out).toBe(
      `<div class="page-header">${BADGE_ANCHOR}Badge${typeBadgeHtml('ATM')}</h1></div>`,
    );
  });

  it('is idempotent and swaps the type when re-injected', () => {
    const once = injectTypeBadge(PAGE, 'ATM');
    const twice = injectTypeBadge(once, 'MOL');
    expect((twice.match(/type-badge/g) ?? []).length).toBe(1);
    expect(twice).toContain(`${BADGE_ANCHOR}Badge${typeBadgeHtml('MOL')}</h1>`);
    expect(twice).not.toContain(typeBadgeHtml('ATM'));
    // re-running with the same type changes nothing
    expect(injectTypeBadge(twice, 'MOL')).toBe(twice);
  });

  it('throws on an unknown type or a page without the title h1', () => {
    expect(() => injectTypeBadge(PAGE, 'XYZ' as never)).toThrow('unknown component type');
    expect(() => injectTypeBadge('<h1>No style attr</h1>', 'ATM')).toThrow('no page-title <h1>');
  });
});
