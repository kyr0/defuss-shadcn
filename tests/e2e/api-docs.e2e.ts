import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { startServer } from './server.ts';

/**
 * Why: verify's `API docs` gate proves the SOURCE documents every member,
 * argument, state config, event and type. This proves the PAGES show it -
 * every JS component page, not a sample: the API section has its States,
 * Every element and Registry tables; one States row per declared state, in
 * order, each described, every config field filled in; every member row
 * described and typed (no `?` where a type belongs); no empty cell anywhere.
 * (A review once checked one page and missed what the others lacked.)
 */

const ROOT = join(import.meta.dirname, '..', '..');
const comps = readdirSync(join(ROOT, 'src', 'components'))
  .filter((c) => existsSync(join(ROOT, 'src', 'components', c, `${c}.ts`)) && existsSync(join(ROOT, 'src', 'documentation', 'pages', `${c}.mdx`)))
  .sort();
const statesOf = (c: string): string[] =>
  (/const \w+States = \[([^\]]*)\]/.exec(readFileSync(join(ROOT, 'src', 'components', c, `${c}.ts`), 'utf8'))?.[1] ?? '').match(/'[^']+'/g)?.map((s) => s.slice(1, -1)) ?? [];

const server = startServer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
// the pages' third-party requests (icons, fonts, a vendor renderer) are not what this checks
await page.route('**', (r) => (r.request().url().startsWith(server.url) ? r.continue() : r.abort()));
let failures = 0;

try {
  for (const c of comps) {
    try {
      await page.goto(`${server.url}/dist/documentation/${c}.html`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      const problems = await page.evaluate((states) => {
        const out: string[] = [];
        const api = document.querySelector('#api');
        if (!api) return ['no #api section'];
        const tableAfter = (title: string) => {
          const h = [...api.querySelectorAll('h3')].find((x) => x.textContent?.trim() === title);
          if (!h) { out.push(`no "${title}" heading`); return null; }
          let el = h.nextElementSibling;
          while (el && !el.querySelector('table')) el = el.nextElementSibling;
          return el?.querySelector('table') ?? null;
        };
        const rows = (t: Element | null) => (t ? [...t.querySelectorAll(':scope > tbody > tr')] : []);
        // a cell's own prose: without its nested tables, its Returns line and "No config." - those fill a
        // cell even when the description itself is missing
        const prose = (cell: Element | undefined): string => {
          if (!cell) return '';
          const copy = cell.cloneNode(true) as Element;
          copy.querySelectorAll('table, p').forEach((x) => { if (x.tagName === 'TABLE' || /^(Returns|No config\.)/.test(x.textContent?.trim() ?? '')) x.remove(); });
          return (copy.textContent ?? '').replace(/\bconfig\b/g, '').trim();
        };
        const st = rows(tableAfter('States'));
        const names = st.map((tr) => tr.querySelector('td code')?.textContent?.trim());
        if (JSON.stringify(names) !== JSON.stringify(states)) out.push(`States rows ${JSON.stringify(names)}, declared ${JSON.stringify(states)}`);
        for (const tr of st) if (prose(tr.children[1]).length < 4) out.push(`state ${tr.children[0]?.textContent?.trim()}: no description`);
        for (const title of ['Every element', 'Registry']) {
          const rs = rows(tableAfter(title));
          if (!rs.length) out.push(`${title}: no rows`);
          for (const tr of rs) {
            const sig = tr.children[0]?.textContent?.trim() ?? '';
            if (prose(tr.children[1]).length < 4) out.push(`${title} ${sig}: no description`);
            if (/:\s*\?($|[,;)\s])/.test(sig)) out.push(`${title} ${sig}: a missing type`);
          }
        }
        for (const td of api.querySelectorAll('td')) if (!td.textContent?.trim()) out.push(`an empty cell in "${td.closest('tr')?.textContent?.trim().slice(0, 60)}"`);
        return [...new Set(out)];
      }, statesOf(c));
      assert.deepEqual(problems, []);
    } catch (err) {
      failures++;
      console.error(`  ✗ ${c}\n    ${err instanceof Error ? err.message.split('\n').slice(0, 8).join('\n    ') : err}`);
    }
  }
  if (!failures) console.log(`  ✓ ${comps.length} JS component pages: States / Every element / Registry complete, every row described and typed, no empty cell`);
} finally {
  await browser.close();
  server.stop();
}
if (failures) {
  console.error(`api-docs: ${failures} page(s) incomplete`);
  process.exit(1);
}
console.log('api-docs: all checks passed');
