import { describe, expect, it } from 'vitest';
import { sectionArtifacts, sectionNeeds, sectionPlans, sectionSlug } from '../scripts/lib/sections.ts';
import { withTwins, zipPlans } from '../scripts/lib/release-zips.ts';
import type { NavSection } from '../src/documentation/lib/nav.ts';

/**
 * Why: scripts/lib/sections.ts splits the components into one bundle per
 * sidebar section and scripts/lib/release-zips.ts packs those bundles for
 * vendoring. A component in no bundle or in two, a section that half-overlaps
 * an extra bundle, or a ZIP that leaves out a needed section all ship broken
 * pages - these pin the rules; section-bundles.e2e renders the real ZIPs.
 */

const nav = (...sections: [string, string[]][]): NavSection[] =>
  sections.map(([heading, hrefs]) => ({ heading, icon: 'x', items: hrefs.map((h) => ({ label: h, href: `${h}.html` })) }));
const comps = (...names: string[]) => names.map((name) => ({ name, hasJs: name.endsWith('-js') }));

describe('sectionSlug', () => {
  it('lowercases, drops & and joins words with -', () => {
    expect(sectionSlug('Forms & Inputs')).toBe('forms-inputs');
    expect(sectionSlug('WYSIWYG Editors')).toBe('wysiwyg-editors');
  });
});

describe('sectionPlans', () => {
  it('one bundle per section with components, in sidebar order; pages without a component folder are skipped', () => {
    const plans = sectionPlans(nav(['Introduction', ['index']], ['Actions', ['button', 'fab-js']], ['Data Display', ['card']]), comps('button', 'fab-js', 'card'), {});
    expect(plans).toEqual([
      { name: 'actions', heading: 'Actions', members: ['button', 'fab-js'], dir: 'sections', hasJs: true },
      { name: 'data-display', heading: 'Data Display', members: ['card'], dir: 'sections', hasJs: false },
    ]);
  });
  it('counts sub-pages (children) as members of their section', () => {
    const sections: NavSection[] = [{ heading: 'Data Display', icon: 'x', items: [{ label: 'Image', href: 'image.html', children: [{ label: 'Gallery', href: 'image-gallery.html' }] }] }];
    expect(sectionPlans(sections, comps('image', 'image-gallery'), {})[0].members).toEqual(['image', 'image-gallery']);
  });
  it('a section that IS an extra bundle reuses it (name + dist/components/)', () => {
    const [plan] = sectionPlans(nav(['WYSIWYG Editors', ['code-example-js']]), comps('code-example-js'), { wysiwyg: ['code-example-js'] });
    expect(plan).toMatchObject({ name: 'wysiwyg', dir: 'components' });
    expect(sectionArtifacts(plan)).toEqual(['components/wysiwyg.css', 'components/wysiwyg.min.css.map', 'components/wysiwyg.js']);
  });
  it('fails on a component in no section, in two sections, or a half-overlapping extra bundle', () => {
    expect(() => sectionPlans(nav(['A', ['x']]), comps('x', 'y'), {})).toThrow(/not in any sidebar section: y/);
    expect(() => sectionPlans(nav(['A', ['x']], ['B', ['x']]), comps('x'), {})).toThrow(/"x" is in "A" and "B"/);
    expect(() => sectionPlans(nav(['A', ['x', 'y']]), comps('x', 'y'), { extra: ['x'] })).toThrow(/overlaps the extra bundle only partly/);
  });
  it('a CSS-only section ships no .js', () => {
    expect(sectionArtifacts({ name: 'mockup', heading: 'Mockup', members: ['mockup-code'], dir: 'sections', hasJs: false })).toEqual(['sections/mockup.css', 'sections/mockup.min.css.map']);
  });
});

describe('sectionNeeds', () => {
  it('the other sections the used components live in, in sidebar order, never itself', () => {
    const plan = { name: 'website', heading: 'Website', members: ['pricing'], dir: 'sections' as const, hasJs: false };
    const owner = new Map([['pricing', 'Website'], ['button', 'Actions'], ['badge', 'Data Display'], ['typography', 'Primitives']]);
    expect(sectionNeeds(plan, ['badge', 'button', 'pricing', 'typography'], owner, ['Primitives', 'Actions', 'Data Display', 'Website'])).toEqual(['Primitives', 'Actions', 'Data Display']);
  });
});

describe('zipPlans', () => {
  const sections = [
    { name: 'primitives', heading: 'Primitives', members: ['typography'], needs: [], files: ['sections/primitives.css', 'sections/primitives.js'] },
    { name: 'mockup', heading: 'Mockup', members: ['mockup-code'], needs: [], files: ['sections/mockup.css'] },
    { name: 'overlays', heading: 'Overlays', members: ['dialog'], needs: ['Mockup', 'Primitives'], files: ['sections/overlays.css', 'sections/overlays.js'] },
  ];
  const plans = zipPlans(sections, '1.2.3', 'https://example.test/docs/');

  it('one ZIP per section + all, named after the release', () => {
    expect(plans.map((p) => p.zip)).toEqual(['all', 'primitives', 'mockup', 'overlays'].map((n) => `defuss-shadcn-v1.2.3-${n}.zip`));
  });
  it('a section ZIP loads core first, its needs in sidebar order, then itself - with every twin', () => {
    const overlays = plans.find((p) => p.zip.endsWith('-overlays.zip'))!;
    expect(overlays.css).toEqual(['components/core.css', 'sections/primitives.css', 'sections/mockup.css', 'sections/overlays.css']);
    expect(overlays.js).toEqual(['components/core.js', 'sections/primitives.js', 'sections/overlays.js']);
    expect(overlays.files).toEqual(expect.arrayContaining(['sections/mockup.min.css.map', 'components/core.min.js.map', 'components/NOTICE.txt', 'LICENSE', 'README.md']));
    expect(overlays.readme).toContain('<link rel="stylesheet" href="sections/overlays.min.css">');
    expect(overlays.readme).toContain('https://example.test/docs/bundles.html');
  });
  it('the all ZIP carries no core.js - all.js embeds the runtime', () => {
    const all = plans[0];
    expect(all.js).toEqual(['components/all.js']);
    expect(all.files).not.toContain('components/core.js');
    expect(all.css).toEqual(['components/core.css', 'components/all.css']);
  });
  it('fails when a section needs one that does not exist', () => {
    expect(() => zipPlans([{ ...sections[2], needs: ['Nowhere'] }], '1.0.0', 'x')).toThrow(/needs unknown sections: Nowhere/);
  });
  it('withTwins lists the min twin and maps minify.ts writes', () => {
    expect(withTwins('sections/a.css')).toEqual(['sections/a.css', 'sections/a.min.css', 'sections/a.min.css.map']);
    expect(withTwins('sections/a.js')).toEqual(['sections/a.js', 'sections/a.js.map', 'sections/a.min.js', 'sections/a.min.js.map']);
  });
});
