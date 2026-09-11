import { describe, expect, it } from 'vitest';
// Vite ?raw imports instead of node:fs — Vitest runs in browser mode where the
// filesystem isn't available (same pattern as contrast.test.ts).
import formCss from '../src/components/form/form.css?raw';
import inputCss from '../src/components/input/input.css?raw';
import formSkill from '../src/components/form/component-skill.md?raw';
import inputSkill from '../src/components/input/component-skill.md?raw';
import formDoc from '../dist/documentation/form.html?raw';
import inputDoc from '../dist/documentation/input.html?raw';
import {
  ariaDescribedByProblems,
  fieldClasses,
  fieldDescriptionOwnerProblems,
  fieldFeatureProblems,
  type AriaRef,
  type FieldComponent,
} from '../scripts/lib/fields.ts';

/**
 * Why: verify's "field feature parity" gate decides whether a component that
 * ships .field-* styling also documents it. These tests pin the pure helper's
 * contract (extraction, documentation forms, failure naming) on synthetic
 * fixtures, plus one real-repo check that input + form are currently clean —
 * the same components the gate guards.
 */

/** Minimal compliant component to prove the no-problem path. */
const clean: FieldComponent = {
  name: 'demo',
  css: '.field-description { font-size: 0.8rem } .field-error { color: red }',
  skill: 'Use `<p class="field-description">` and `<p class="field-error">`.',
  doc: '<p class="field-description">…</p><p class="field-error">…</p>',
};

describe('fieldClasses', () => {
  it('extracts every .field-* selector, de-duped, in first-seen order', () => {
    expect(fieldClasses('.field-description { } .field-error { } .field-description { }')).toEqual([
      'field-description',
      'field-error',
    ]);
  });
  it('ignores non-field classes and bare prose mentions', () => {
    expect(fieldClasses('.form .form-field field-description .field-help-x { }')).toEqual(['field-help-x']);
  });
  it('returns [] for css without field selectors', () => {
    expect(fieldClasses('.btn { color: red }')).toEqual([]);
  });
});

describe('fieldFeatureProblems', () => {
  it('passes when both skill and doc document every styled class', () => {
    expect(fieldFeatureProblems([clean])).toEqual([]);
  });
  it('names the skill when a styled class is missing there', () => {
    const problems = fieldFeatureProblems([{ ...clean, skill: 'no mentions at all' }]);
    expect(problems).toEqual([
      'demo: CSS styles .field-description but component-skill.md doesn\'t document it',
      'demo: CSS styles .field-error but component-skill.md doesn\'t document it',
    ]);
  });
  it('names the doc page when a styled class is missing there', () => {
    const problems = fieldFeatureProblems([{ ...clean, doc: '<div></div>' }]);
    expect(problems).toEqual([
      'demo: CSS styles .field-description but documentation/demo.html doesn\'t show it',
      'demo: CSS styles .field-error but documentation/demo.html doesn\'t show it',
    ]);
  });
  it('accepts all three documentation forms', () => {
    const forms: FieldComponent = {
      name: 'demo',
      css: '.field-a{} .field-b{} .field-c{}',
      skill: '`field-a` backticked | quoted "field-b" | selector .field-c',
      doc: 'quoted "field-a" backticked `field-b` selector .field-c',
    };
    expect(fieldFeatureProblems([forms])).toEqual([]);
  });
  it('passes components whose CSS styles no .field-* class', () => {
    expect(fieldFeatureProblems([{ name: 'button', css: '.btn {}', skill: '', doc: '' }])).toEqual([]);
  });
});

describe('ariaDescribedByProblems', () => {
  const ref = (owner: string, tokens: string[]): AriaRef => ({ owner, tag: 'input', tokens });

  it('passes when every token matches exactly one id', () => {
    expect(ariaDescribedByProblems('p', [ref('input#a', ['hint'])], ['a', 'hint'])).toEqual([]);
    // space-separated multiple ids all resolve
    expect(ariaDescribedByProblems('p', [ref('input#a', ['hint', 'err'])], ['hint', 'err'])).toEqual([]);
  });
  it('names a dangling reference', () => {
    expect(ariaDescribedByProblems('label.html', [ref('input#username', ['username-desc'])], ['username'])).toEqual([
      'label.html: input#username references #username-desc — no element has that id',
    ]);
  });
  it('names a duplicated id and counts the duplicates', () => {
    const problems = ariaDescribedByProblems('form.html', [ref('input#f-name', ['f-name-desc'])], ['f-name-desc', 'f-name-desc']);
    expect(problems).toEqual([
      'form.html: input#f-name references #f-name-desc — 2 elements share the id (must be exactly one)',
    ]);
  });
  it('passes pages without any references', () => {
    expect(ariaDescribedByProblems('index.html', [], ['root'])).toEqual([]);
  });
});

describe('fieldDescriptionOwnerProblems', () => {
  const target = [{ id: 'hint', cls: 'field-description' }];

  it('passes when a host element (input/select/textarea/fieldset) references it', () => {
    for (const tag of ['input', 'select', 'textarea', 'fieldset'])
      expect(fieldDescriptionOwnerProblems('p', [{ owner: `${tag}#x`, tag, tokens: ['hint'] }], target)).toEqual([]);
  });
  it('flags a wrapper-only reference (the div names nothing for the control)', () => {
    expect(fieldDescriptionOwnerProblems('p', [{ owner: 'div.wrap', tag: 'div', tokens: ['hint'] }], target)).toEqual([
      'p: #hint (.field-description) is only referenced by <div> — aria-describedby must sit on the input/select/textarea/fieldset itself',
    ]);
  });
  it('skips targets nobody references (wiring gate owns that finding)', () => {
    expect(fieldDescriptionOwnerProblems('p', [], target)).toEqual([]);
  });
});

describe('real repo components', () => {
  // The gate's current keepers: form.css re-styles .field-description while
  // input.css defines .field-description and .field-error — both must stay
  // documented in their skill and doc page or `bun run verify` fails.
  it('form + input ship field features that are documented everywhere', () => {
    expect(fieldFeatureProblems([
      { name: 'form', css: formCss, skill: formSkill, doc: formDoc },
      { name: 'input', css: inputCss, skill: inputSkill, doc: inputDoc },
    ])).toEqual([]);
  });
  it('the field classes actually present are the expected ones', () => {
    expect(fieldClasses(formCss)).toEqual(['field-description']);
    expect(fieldClasses(inputCss)).toEqual(['field-description', 'field-error']);
  });
});
