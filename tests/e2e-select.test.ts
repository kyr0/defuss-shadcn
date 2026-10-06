import { describe, expect, it } from 'vitest';
import { CORE_INPUTS, SITE_INPUTS, coveredBy, e2eInputs, fixturesNamed } from '../scripts/lib/e2e-select.ts';

/**
 * Why: `bun run e2e` runs a file again only when its inputs changed - the
 * planner decides those inputs, so a missing one would skip a test that a
 * change broke. Pinned here: what a component fixture, a bundle fixture and a
 * docs test depend on.
 */
const components = new Set(['accordion', 'badge', 'code-example', 'dialog']);
// each component's section folder, as the repository lays them out (src/components/<section>/<name>/)
const SECTION: Record<string, string> = { accordion: 'overlays', badge: 'data-display', 'code-example': 'wysiwyg-editors', dialog: 'overlays' };
const base = {
  componentsOf: (m: string) => [...components].filter((c) => m.includes(`class="${c}`)),
  componentDir: (n: string) => (components.has(n) ? `src/components/${SECTION[n]}/${n}/` : undefined),
};

describe('e2eInputs', () => {
  it('a per-component fixture: its folder, core, the shared helpers - not other components', () => {
    const inputs = e2eInputs({
      ...base,
      name: 'accordion',
      test: "await page.goto(url + '/tests/e2e/accordion.e2e-fixture.html')",
      fixtures: { 'accordion.e2e-fixture.html': '<script type="module" src="/dist/components/core.js"></script><script type="module" src="/dist/components/accordion/accordion.js"></script>' },
    });
    expect(inputs).toContain('src/components/overlays/accordion/');
    expect(inputs).toContain('tests/e2e/accordion.e2e-fixture.html');
    for (const c of CORE_INPUTS) expect(inputs).toContain(c);
    expect(inputs).toContain('tests/e2e/lib/');
    expect(inputs).not.toContain('src/components/overlays/dialog/');
    expect(inputs).not.toContain('src/');
  });

  it('an all.js fixture: core plus exactly the components its markup uses', () => {
    const inputs = e2eInputs({
      ...base,
      name: 'bundle',
      test: '',
      fixtures: { 'bundle.e2e-fixture.html': '<script src="/dist/components/all.js"></script><div class="badge">x</div><details class="accordion"></details>' },
    });
    expect(inputs).toContain('src/components/data-display/badge/');
    expect(inputs).toContain('src/components/overlays/accordion/');
    expect(inputs).not.toContain('src/components/overlays/dialog/');
  });

  it('wysiwyg.js brings the code-example component', () => {
    const inputs = e2eInputs({ ...base, name: 'x', test: '', fixtures: { 'x.e2e-fixture.html': '<script src="/dist/components/wysiwyg.js"></script>' } });
    expect(inputs).toContain('src/components/wysiwyg-editors/code-example/');
  });

  it('a test of the documentation site depends on everything that renders it', () => {
    const inputs = e2eInputs({ ...base, name: 'kbd-docs', test: "await page.goto(`${url}/dist/documentation/kbd.html`)", fixtures: {} });
    for (const s of SITE_INPUTS) expect(inputs).toContain(s);
  });

  it('nothing recognised: safe - everything', () => {
    const inputs = e2eInputs({ ...base, name: 'odd', test: 'console.log(1)', fixtures: {} });
    expect(inputs).toContain('src/');
  });

  it('fixturesNamed / coveredBy', () => {
    expect(fixturesNamed("a('x.e2e-fixture.html'); b('y.e2e-fixture.html'); a('x.e2e-fixture.html')")).toEqual(['x.e2e-fixture.html', 'y.e2e-fixture.html']);
    expect(coveredBy('src/components/badge/badge.css', ['src/components/badge/'])).toBe(true);
    expect(coveredBy('src/components/badges/x.css', ['src/components/badge/'])).toBe(false);
    expect(coveredBy('bun.lock', ['bun.lock'])).toBe(true);
  });
});
