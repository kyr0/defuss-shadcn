import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Why: the task skills ship tools an agent runs in someone else's project -
 * skills/shadcn-theme/scripts/theme-check.mjs and skills/shadcn-review/
 * scripts/markup-check.mjs - and a preview page for a theme. This consumes
 * them as a user's agent does: the built files, under plain `node`, on a theme
 * written from a brief (fjord) and on files with planted mistakes; then the
 * preview page renders that theme in light and dark (its CDN requests served
 * from this build's dist/, so it runs offline and before the release tag
 * exists). Screenshots land in output/agent-skills/.
 */

const ROOT = join(import.meta.dirname, '..', '..');
const FIX = join(ROOT, 'tests/e2e/agent-skills');
const OUT = join(ROOT, 'output/agent-skills');
let failures = 0;
async function check(label: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${label}\n    ${err instanceof Error ? err.message : err}`);
  }
}
const run = (tool: string, ...args: string[]) => {
  const r = spawnSync('node', [join(ROOT, tool), ...args], { encoding: 'utf8', timeout: 30_000 });
  return { code: r.status, out: r.stdout, err: r.stderr };
};
const rules = (json: string) => [...new Set((JSON.parse(json) as { findings: { rule: string }[] }).findings.map((f) => f.rule))].sort();
const THEME = 'skills/shadcn-theme/scripts/theme-check.mjs';
const MARKUP = 'skills/shadcn-review/scripts/markup-check.mjs';

await check('theme-check passes the theme written from a brief (node, exit 0)', () => {
  const r = run(THEME, join(FIX, 'fjord-theme.css'));
  assert.equal(r.code, 0, r.out + r.err);
  assert.match(r.out, /^VERIFIED\[theme-check\]=true BC errors=0 warnings=0 defuss-shadcn=\d+\.\d+\.\d+$/m);
});

await check('theme-check names every planted mistake and fails (exit 1)', () => {
  const r = run(THEME, join(FIX, 'flawed-theme.css'), '--json');
  assert.equal(r.code, 1, r.err);
  assert.deepEqual(rules(r.out), ['theme-contrast-text', 'theme-contrast-ui', 'theme-font-import', 'theme-missing-color', 'theme-radius', 'theme-unknown-token']);
  const fix = (JSON.parse(r.out) as { findings: { rule: string; fix?: string; line?: number }[] }).findings.find((f) => f.rule === 'theme-contrast-text' && f.line === 5)!;
  assert.match(fix.fix ?? '', /--primary-foreground: oklch\([\d.]+ [\d.]+ [\d.]+\) reaches 4\.5:1/);
});

await check('markup-check names every planted mistake and fails (exit 1)', () => {
  const r = run(MARKUP, join(FIX, 'flawed-page.html'), '--json');
  assert.equal(r.code, 1, r.err);
  assert.deepEqual(rules(r.out), ['core-css', 'html-sink', 'icon-button-label', 'modifier-class', 'module-script', 'pin-version', 'unknown-part', 'unknown-token', 'unknown-variant', 'window-global']);
  const f = (JSON.parse(r.out) as { findings: { rule: string; fix: string }[] }).findings;
  assert.equal(f.find((x) => x.rule === 'modifier-class')!.fix, 'class="btn" data-variant="outline"');
  assert.match(f.find((x) => x.rule === 'unknown-part')!.fix, /did you mean "card-title"/);
});

await check('markup-check passes clean markup and walks a folder (project CSS and custom properties are the project\'s)', () => {
  const clean = run(MARKUP, join(FIX, 'clean-page.html'));
  assert.equal(clean.code, 0, clean.out + clean.err);
  const dir = run(MARKUP, FIX, '--json');
  assert.equal((JSON.parse(dir.out) as { files: number }).files, 4);
});

const browser = await chromium.launch();
try {
  await check('the theme preview renders the theme in light and dark, without an error', async () => {
    mkdirSync(OUT, { recursive: true });
    // reduced motion: the components' colour transitions would leave a mid-fade frame after the toggle
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(15_000);
    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
    page.on('requestfailed', (r) => problems.push(`failed: ${r.url()}`));
    await page.route('**/*', (route) => {
      const url = route.request().url();
      const cdn = url.match(/^https:\/\/cdn\.jsdelivr\.net\/gh\/kyr0\/defuss-shadcn@v[^/]+\/(dist\/.+)$/);
      if (cdn) return route.fulfill({ path: join(ROOT, cdn[1]) });
      if (url === 'http://preview.test/index.html') return route.fulfill({ path: join(ROOT, 'skills/shadcn-theme/assets/theme-preview.html'), contentType: 'text/html' });
      if (url === 'http://preview.test/theme.css') return route.fulfill({ path: join(FIX, 'fjord-theme.css'), contentType: 'text/css' });
      if (url.startsWith('https://fonts.googleapis.com/')) return route.fulfill({ body: '', contentType: 'text/css' });
      return route.abort();
    });
    await page.goto('http://preview.test/index.html');
    await page.waitForFunction(() => typeof (globalThis as { df$?: unknown }).df$ === 'function');
    const token = (name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
    // the primary button shows exactly the theme's --primary, resolved by the browser
    const primaryMatches = () => page.evaluate(() => {
      const probe = document.createElement('i');
      probe.style.background = 'var(--primary)';
      document.body.append(probe);
      const want = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return [getComputedStyle(document.querySelector('.btn[data-variant="default"]')!).backgroundColor, want];
    });
    assert.equal(await token('--primary'), 'oklch(0.5 0.1 200)');
    assert.equal(await token('--radius'), '0.75rem');
    const [light, lightWant] = await primaryMatches();
    assert.equal(light, lightWant);
    await page.screenshot({ path: join(OUT, 'preview-light.png'), fullPage: true });
    await page.click('#mode');
    assert.equal(await token('--primary'), 'oklch(0.74 0.11 195)');
    const [dark, darkWant] = await primaryMatches();
    assert.equal(dark, darkWant);
    assert.notEqual(dark, light, 'the primary button keeps its light colour in dark mode');
    await page.screenshot({ path: join(OUT, 'preview-dark.png'), fullPage: true });
    assert.deepEqual(problems, []);
    await page.close();
  });
} finally {
  await browser.close();
}
// the fixtures this test reads must stay what it asserts (a planted mistake fixed by accident is a silent pass)
assert.ok(readFileSync(join(FIX, 'flawed-page.html'), 'utf8').includes('btn-outline'));
if (failures) {
  console.error(`agent-skills: ${failures} failure(s)`);
  process.exit(1);
}
console.log('agent-skills: all checks passed');
