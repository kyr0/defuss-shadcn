import { describe, expect, it } from 'vitest';
import { BUNDLE_INPUTS, CORE_INPUTS, SITE_INPUTS, coveredBy, e2eFolder, e2eInputs, fixturesNamed, inputContent } from '../scripts/lib/e2e-select.ts';

/**
 * Why: `bun run e2e` runs a file again only when its inputs changed - the
 * planner decides those inputs, so a missing one would skip a test that a
 * change broke. Pinned here: what a component fixture, a bundle fixture and a
 * docs test depend on.
 */
const components = new Set(['accordion', 'badge', 'code-example', 'dialog', 'editorjs', 'math-renderer', 'math-editor', 'math-compute', 'mermaid']);
// each component's section folder, as the repository lays them out (src/components/<section>/<name>/)
const SECTION: Record<string, string> = {
  accordion: 'overlays',
  badge: 'data-display',
  'code-example': 'wysiwyg-editors',
  dialog: 'overlays',
  editorjs: 'wysiwyg-editors',
  'math-renderer': 'math',
  'math-editor': 'math',
  'math-compute': 'math',
  mermaid: 'diagrams',
};
const base = {
  componentsOf: (m: string) => [...components].filter((c) => m.includes(`class="${c}`)),
  componentDir: (n: string) => (components.has(n) ? `src/components/${SECTION[n]}/${n}/` : undefined),
};

describe('e2eInputs', () => {
  it('a per-component fixture: its built folder and its sources, the built core, the shared helpers - not other components, not the core sources', () => {
    const inputs = e2eInputs({
      ...base,
      name: 'accordion',
      test: "await page.goto(url + '/tests/e2e/accordion.e2e-fixture.html')",
      fixtures: { 'accordion.e2e-fixture.html': '<script type="module" src="/dist/components/core.js"></script><script type="module" src="/dist/components/accordion/accordion.js"></script>' },
    });
    expect(inputs).toContain('dist/components/accordion/');
    expect(inputs).toContain('src/components/overlays/accordion/');
    // the test and its fixtures live in the component's section folder (e2eFolder)
    expect(inputs).toContain('tests/e2e/overlays/accordion.e2e-fixture.html');
    expect(inputs).toContain('tests/e2e/overlays/accordion.e2e.ts');
    expect(e2eFolder('accordion', (n) => base.componentDir(n)?.split('/')[2])).toBe('overlays');
    expect(e2eFolder('documentation', (n) => base.componentDir(n)?.split('/')[2])).toBe('site');
    expect(e2eInputs({ ...base, name: 'documentation', test: 'openDocPage', fixtures: {} })).toContain('tests/e2e/site/documentation.e2e.ts');
    for (const c of CORE_INPUTS) expect(inputs).toContain(c);
    expect(inputs).toContain('tests/e2e/lib/');
    expect(inputs).not.toContain('src/components/overlays/dialog/');
    expect(inputs).not.toContain('dist/components/dialog/');
    expect(inputs).not.toContain('src/');
    // what the browser runs, not what it was built from: a comment in src/shared/ builds the same core.js
    for (const source of ['src/core/', 'src/shared/', 'scripts/build.ts', 'package.json']) expect(inputs.some((i) => coveredBy(source, [i]) || i === source)).toBe(false);
    for (const b of BUNDLE_INPUTS) expect(inputs).not.toContain(b);
  });

  it('an all.js fixture: core plus exactly the components its markup uses', () => {
    const inputs = e2eInputs({
      ...base,
      name: 'bundle',
      test: '',
      fixtures: { 'bundle.e2e-fixture.html': '<script src="/dist/components/all.js"></script><div class="badge">x</div><details class="accordion"></details>' },
    });
    expect(inputs).toContain('dist/components/badge/');
    expect(inputs).toContain('dist/components/accordion/');
    expect(inputs).not.toContain('dist/components/dialog/');
    for (const c of [...CORE_INPUTS, ...BUNDLE_INPUTS]) expect(inputs).toContain(c);
  });

  it('an extra bundle brings its members: wysiwyg.js code-example + editorjs, math.min.js the three math components', () => {
    const inputs = e2eInputs({ ...base, name: 'x', test: '', fixtures: { 'x.e2e-fixture.html': '<script src="/dist/components/wysiwyg.js"></script>' } });
    expect(inputs).toContain('dist/components/code-example/');
    expect(inputs).toContain('dist/components/editorjs/');
    for (const b of BUNDLE_INPUTS) expect(inputs).toContain(b);
    const math = e2eInputs({ ...base, name: 'x', test: '', fixtures: { 'x.e2e-fixture.html': '<script src="/dist/components/math.min.js"></script>' } });
    for (const c of ['math-renderer', 'math-editor', 'math-compute']) expect(math).toContain(`dist/components/${c}/`);
    expect(math).not.toContain('dist/components/mermaid/');
  });

  it('a docs image or video a fixture shows: that file, not everything that renders the site', () => {
    const fixture = '<link rel="stylesheet" href="/dist/components/core.css" /><img src="/dist/documentation/images/mk-wide.png" /><video src="/dist/documentation/videos/demo.webm"></video>';
    const inputs = e2eInputs({ ...base, name: 'badge', test: '', fixtures: { 'badge.e2e-fixture.html': fixture } });
    expect(inputs).toContain('dist/documentation/images/mk-wide.png');
    expect(inputs).toContain('dist/documentation/videos/demo.webm');
    expect(inputs).not.toContain('src/');
    expect(inputs).not.toContain('scripts/');
    // a page is the site
    expect(e2eInputs({ ...base, name: 'badge', test: '', fixtures: { 'badge.e2e-fixture.html': fixture + '<iframe src="/dist/documentation/data-display/badge.html"></iframe>' } })).toContain('src/');
  });

  it('the theme: the built theme folder', () => {
    const inputs = e2eInputs({ ...base, name: 'x', test: '', fixtures: { 'x.e2e-fixture.html': '<link rel="stylesheet" href="/dist/theme/utils/default-semantic-tokens.css" />' } });
    expect(inputs).toContain('dist/theme/');
    expect(inputs).not.toContain('src/theme/');
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

  it('inputContent: package.json decides a test without its scripts - a script edit re-runs nothing, a version or a dependency does', () => {
    const pkg = (o: object) => new TextEncoder().encode(JSON.stringify(o));
    const base = inputContent('package.json', pkg({ version: '1.0.0', scripts: { verify: 'a' }, devDependencies: { x: '1' } }));
    expect(inputContent('package.json', pkg({ version: '1.0.0', scripts: { verify: 'b' }, devDependencies: { x: '1' } }))).toEqual(base);
    expect(inputContent('package.json', pkg({ version: '1.0.1', scripts: { verify: 'a' }, devDependencies: { x: '1' } }))).not.toEqual(base);
    expect(inputContent('package.json', pkg({ version: '1.0.0', scripts: { verify: 'a' }, devDependencies: { x: '2' } }))).not.toEqual(base);
    // any other file, and a package.json that is no JSON: as it is
    const bytes = new TextEncoder().encode('{"scripts":1}');
    expect(inputContent('src/x.json', bytes)).toBe(bytes);
    expect(inputContent('package.json', new TextEncoder().encode('{'))).toEqual(new TextEncoder().encode('{'));
  });
});
