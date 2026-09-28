import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium, type Page } from 'playwright';
import { startServer } from './server.ts';

/**
 * Why: E2E proof of the distribution contract (plans/defuss-query-morph-integration.md
 * §2.3 + §5.3): consumers load core.js + selected components, or all.js alone
 * - both modes expose the callable df$ (query + morph), the shared layer at
 * df$.shadcn.shared, and initialize components; a missing core fails BEFORE
 * any mutation with the one actionable load-order error; conflicting /
 * duplicate runtimes are rejected without corrupting the winner. Runs the
 * real shipped files over HTTP, exactly like a consumer page.
 */

const server = startServer();
const browser = await chromium.launch();

let failures = 0;
async function check(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${label}\n    ${err instanceof Error ? err.message : err}`);
  }
}

async function open(fixture: string): Promise<Page> {
  const page = await browser.newPage();
  await page.goto(`${server.url}/tests/e2e/${fixture}`);
  // module scripts + their failure modes settle before load completes; give
  // the rejected-module error events a tick to land in the fixture arrays
  await page.waitForTimeout(300);
  return page;
}

// the shared ABI IS the package version (verify's `shared ABI` gate) - read it,
// never hard-code it: a literal here broke the 0.9.1 release pipeline
const ABI = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version as string;

try {
  // -- core + selected components (modular mode) --------------------------
  {
    const page = await open('core.e2e-fixture.html');
    await check('modular: callable df$ with query + morph API', async () => {
      const out = await page.evaluate(() => ({
        callable: typeof globalThis.df$ === 'function',
        queryVersion: typeof globalThis.df$?.queryVersion === 'string',
        morph: typeof globalThis.df$?.morph === 'function',
        selects: globalThis.df$('.btn').length,
      }));
      assert.ok(out.callable && out.queryVersion && out.morph, `df$ runtime incomplete: ${JSON.stringify(out)}`);
      assert.equal(out.selects, 1, 'df$(selector) must select');
    });
    await check('modular: shared layer installed at df$.shadcn.shared', async () => {
      const out = await page.evaluate(() => ({
        abi: globalThis.df$?.shadcn?.shared?.abi,
        helpers:
          typeof globalThis.df$?.shadcn?.shared?.defussGlobals === 'function' &&
          typeof globalThis.df$?.shadcn?.shared?.safeShowPopover === 'function' &&
          typeof globalThis.df$?.shadcn?.shared?.debounce === 'function',
      }));
      assert.equal(out.abi, ABI, 'shared.abi mismatch');
      assert.ok(out.helpers, 'shared helpers missing');
    });
    await check('modular: shared debounce is the real utility (trailing + flush)', async () => {
      const out = await page.evaluate(
        () =>
          new Promise<Record<string, unknown>>((resolve) => {
            const calls: number[] = [];
            const d = globalThis.df$!.shadcn!.shared!.debounce((n: number) => calls.push(n), 20);
            d(1);
            d(2); // same burst → only the freshest args survive
            setTimeout(() => {
              const trailing = calls.join(',') === '2';
              d(3);
              d.flush(); // pending call lands NOW
              d(4);
              d.cancel(); // and is dropped
              setTimeout(() => resolve({ trailing, calls: calls.join(',') }), 40);
            }, 40);
          }),
      );
      assert.equal(out.trailing, true, 'trailing-edge semantics: one call with the last args');
      assert.equal(out.calls, '2,3', 'flush() applies, cancel() drops');
    });
    await check('modular: selected component registers + initializes', async () => {
      const out = await page.evaluate(() => ({
        api: typeof globalThis.df$?.shadcn?.dialogApi?.setState,
        init: !!document.querySelector('#demo-dialog[data-init]'),
        el: typeof (document.querySelector('#demo-dialog') as HTMLElement | null)?.api?.setState,
      }));
      assert.equal(out.api, 'function', 'df$.shadcn.dialogApi missing');
      assert.ok(out.init && out.el, 'dialog did not initialize');
    });
    await check('modular: core alone registers no components and no docs data', async () => {
      const out = await page.evaluate(() => ({
        docs: globalThis.df$?.shadcn?.docs,
        toast: globalThis.df$?.shadcn?.toast,
        accordionApi: globalThis.df$?.shadcn?.accordionApi,
      }));
      assert.ok(out.docs === undefined && out.toast === undefined && out.accordionApi === undefined,
        `unselected components/docs leaked into core: ${JSON.stringify(out)}`);
    });
    await check('modular: CSS-only component styles apply (tokens live)', async () => {
      const radius = await page.$eval('#css-only', (el) => getComputedStyle(el).borderRadius);
      assert.notEqual(radius, '0px', 'badge styles not applied - component CSS broken without JS');
    });
    await page.close();
  }

  // -- all.js alone (all-in-one mode) --------------------------------------
  {
    const page = await open('core-all.e2e-fixture.html');
    const requested: string[] = [];
    page.on('request', (r) => requested.push(r.url()));
    await check('all alone: one runtime + full component set', async () => {
      const out = await page.evaluate(() => ({
        callable: typeof globalThis.df$ === 'function',
        morph: typeof globalThis.df$?.morph === 'function',
        shared: globalThis.df$?.shadcn?.shared?.abi,
        dialog: typeof globalThis.df$?.shadcn?.dialogApi?.setState,
        toast: typeof globalThis.df$?.shadcn?.toast?.show,
        accordion: Array.isArray(globalThis.df$?.shadcn?.accordionStates),
        init: !!document.querySelector('#demo-dialog[data-init]'),
      }));
      assert.ok(out.callable && out.morph, 'all.js must embed the core runtime');
      assert.equal(out.shared, ABI, 'all.js shared.abi mismatch');
      assert.ok(out.dialog === 'function' && out.toast === 'function' && out.accordion,
        'all.js is missing shipping components');
      assert.ok(out.init, 'dialog did not initialize under all.js');
      // no separate core/query/morph chunk request - all is self-contained
      await page.waitForTimeout(200);
      const extra = requested.filter((u) => /core(\.min)?\.js|defuss/.test(u));
      assert.deepEqual(extra, [], `all.js fetched external runtime chunks: ${extra.join(', ')}`);
    });
    await page.close();
  }

  // -- bootstrap failures (fail safely, before mutation, state preserved) --
  {
    const page = await open('core-no-core.e2e-fixture.html');
    await check('no core: component throws the load-order error before mutating', async () => {
      const out = await page.evaluate(() => ({
        errs: (window as unknown as { __errs: string[] }).__errs,
        mutated: !!document.querySelector('#demo-dialog[data-init]'),
        df$: typeof globalThis.df$,
      }));
      assert.ok(out.df$ === 'undefined', 'nothing may install df$ from a component file');
      assert.ok(!out.mutated, 'component mutated DOM despite missing core');
      assert.ok(
        out.errs.some((e) => e.includes('runtime incomplete; load core before component scripts')),
        `expected the actionable load-order error, got: ${out.errs.join(' | ')}`,
      );
    });
    await page.close();
  }
  {
    const page = await open('core-conflict.e2e-fixture.html');
    await check('conflicts: foreign df$ preserved, duplicates rejected', async () => {
      const out = await page.evaluate(() => ({
        errs: (window as unknown as { __errs: string[] }).__errs,
        foreignKept:
          typeof globalThis.df$ === 'function' &&
          (globalThis.df$ as unknown as { __isForeign?: boolean }).__isForeign === true,
        probe: (globalThis.df$ as unknown as (x: string) => string)('x'),
      }));
      assert.ok(out.foreignKept && out.probe === 'foreign', 'the pre-existing df$ must survive untouched');
      assert.equal(out.errs.filter((e) => e.includes('already defined')).length, 2,
        `both core.js and core.min.js must be rejected: ${out.errs.join(' | ')}`);
    });
    await page.close();
  }
} finally {
  await browser.close();
  server.stop();
}

console.log(failures === 0 ? '\ncore e2e: OK' : `\ncore e2e: ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
