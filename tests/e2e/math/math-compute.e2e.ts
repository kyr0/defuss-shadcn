import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';

/**
 * Why: E2E for the shipped Compute & Explain component, with the REAL Compute
 * Engine (the pinned devDependency, served offline - the worker's import is
 * routed too). Verifies the mathematical promises of the plan's acceptance
 * examples against the engine: a cancellation keeps x ≠ 1; x/x keeps x ≠ 0
 * although the canonical form already is 1; squaring an equation makes
 * candidates and the extraneous one is rejected in the original equation; an
 * identity is proven, an undecidable comparison stays unknown; an assumption
 * changes the result and shows as assumed. And the machinery: computation off
 * the main thread in a worker started from a Blob, explicit runs only, a
 * recorded result shown without loading the engine, edits clearing a stale
 * result, Cancel and the deadline terminating the worker, invalid and
 * unsupported input, the step navigation, and the State API + render().
 */

const FIXTURE = '/tests/e2e/math/math-compute.e2e-fixture.html';
const PINNED = 'https://cdn.jsdelivr.net/npm/@cortex-js/compute-engine@0.149.0/dist/esm-min/';
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

try {
  await check('the component pins compute-engine@0.149.0 (never @latest)', async () => {
    const src = readFileSync(resolve(import.meta.dirname, '../../../dist/components/math-compute/math-compute.js'), 'utf8');
    assert.ok(src.includes(`${PINNED}compute-engine.js`));
    assert.doesNotMatch(src, /compute-engine@latest/);
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const requests = await offlineJsdelivr(page);
  const workers: string[] = [];
  page.on('worker', (w) => workers.push(w.url()));
  await page.goto(`${server.url}${FIXTURE}`);
  await page.waitForFunction(() => document.querySelectorAll('.math-compute[data-init]').length === 6);

  await check('nothing is computed on load: no worker, no engine request; a recorded result shows as recorded', async () => {
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const rec = document.getElementById('mc-recorded')!;
      return {
        states: [...document.querySelectorAll('.math-compute')].map((el) => (el as HTMLElement).dataset.stateName),
        recorded: rec.querySelector('.math-compute-recorded')?.textContent,
        result: rec.querySelector('.math-compute-pair figure:last-child .math-renderer-source')?.textContent,
        condition: rec.querySelector('.math-compute-conditions .math-renderer-source')?.textContent,
      };
    });
    assert.deepEqual(workers, []);
    assert.deepEqual(requests.filter((u) => u.includes('compute-engine')), []);
    assert.deepEqual(r.states, ['default', 'default', 'default', 'result', 'default', 'default']);
    assert.equal(r.recorded, 'Recorded with Compute Engine 0.149.0 - not computed on this page. Compute runs it again.');
    assert.deepEqual([r.result, r.condition], ['1', 'x\\ne0']);
  });

  await check('Compute: the job runs in a worker started from a Blob; the panel is busy, then shows the result', async () => {
    await page.click('#mc-cancel [data-math-run]');
    const busy = await page.evaluate(() => {
      const el = document.getElementById('mc-cancel')!;
      return { state: el.dataset.stateName, busy: el.getAttribute('aria-busy'), run: (el.querySelector('[data-math-run]') as HTMLButtonElement).disabled, cancel: (el.querySelector('[data-math-cancel]') as HTMLButtonElement).disabled, status: el.querySelector('.math-compute-status')!.textContent };
    });
    await page.waitForFunction(() => document.getElementById('mc-cancel')!.dataset.stateName === 'result', undefined, { timeout: 30_000 });
    assert.deepEqual(busy, { state: 'computing', busy: 'true', run: true, cancel: false, status: 'Computing ...' });
    assert.equal(workers.length, 1);
    assert.match(workers[0], /^blob:/);
    assert.deepEqual(requests.filter((u) => u.endsWith('/compute-engine.js')), [`${PINNED}compute-engine.js`]);
  });

  await check('cancellation: (x²-1)/(x-1) → x+1, which holds where x-1 ≠ 0 - read from the input as written', async () => {
    const r = await page.evaluate(() => {
      const c = document.getElementById('mc-cancel')!.api!.getState().config as any;
      return { result: c.result.result.latex, conditions: c.result.conditions.map((k: any) => [k.json, k.origin]), coverage: c.result.coverage, steps: c.result.steps.map((s: any) => [s.rule, s.relation, s.after.latex]), notices: c.result.notices };
    });
    assert.equal(r.result, 'x+1');
    assert.deepEqual(r.conditions, [[['NotEqual', ['Subtract', 'x', 1], 0], 'input']]);
    assert.equal(r.coverage, 'complete');
    assert.deepEqual(r.steps, [['cancel common polynomial factors', 'transform', 'x+1']]);
    assert.ok(r.notices.includes("The steps are the engine's own report, not a proof."));
  });

  await check('the view: input and result typeset, the condition inline, the step listed, the record folded', async () => {
    await page.waitForFunction(() => [...document.querySelectorAll('#mc-cancel .math-compute-view .math-renderer')].every((f) => (f as HTMLElement).dataset.state === 'rendered'));
    const r = await page.evaluate(() => {
      const v = document.querySelector('#mc-cancel .math-compute-view')!;
      return {
        chrome: v.hasAttribute('data-ce-chrome'),
        figures: [...v.querySelectorAll('.math-compute-pair figcaption')].map((f) => f.textContent),
        condition: v.querySelector('.math-compute-conditions .math-renderer')?.getAttribute('data-variant'),
        steps: [...v.querySelectorAll('.math-compute-step')].map((b) => b.textContent),
        record: !!v.querySelector('details.math-compute-record pre'),
      };
    });
    assert.deepEqual(r, { chrome: true, figures: ['Input', 'Result (simplify)'], condition: 'inline', steps: ['Cancel the common factors'], record: true });
  });

  await check('x/x: the canonical form is already 1 - the result still holds only where x ≠ 0, and the untraced rewrite is named', async () => {
    const r = await page.evaluate(async () => {
      const el = document.getElementById('mc-cancel')!;
      await (globalThis as any).df$.shadcn.mathCompute.run(el, { latex: '\\frac{x}{x}' });
      const c = el.api!.getState().config as any;
      return { result: c.result.result.latex, canonical: c.result.canonical.latex, conditions: c.result.conditions.map((k: any) => k.json), steps: c.result.steps.length, notices: c.result.notices };
    });
    assert.deepEqual([r.result, r.canonical, r.steps], ['1', '1', 0]);
    assert.deepEqual(r.conditions, [['NotEqual', 'x', 0]]);
    assert.ok(r.notices.some((n: string) => /canonical form before any step/.test(n)));
    assert.ok(r.notices.some((n: string) => /no steps/.test(n)));
  });

  await check('an edit of the input clears the result it no longer belongs to', async () => {
    await page.fill('#mc-cancel-source', '\\frac{x^2-4}{x-2}');
    const r = await page.evaluate(() => {
      const el = document.getElementById('mc-cancel')!;
      return { state: el.dataset.stateName, result: (el.api!.getState().config as any).result, view: !!el.querySelector('.math-compute-view'), latex: (el.api!.getState().config as any).latex };
    });
    assert.deepEqual(r, { state: 'default', result: null, view: false, latex: '\\frac{x^2-4}{x-2}' });
  });

  await check('squaring an equation: candidates 0 and 3 - 0 is rejected in the original equation, 3 accepted', async () => {
    await page.click('#mc-solve [data-math-run]');
    await page.waitForFunction(() => document.getElementById('mc-solve')!.dataset.stateName === 'result', undefined, { timeout: 30_000 });
    const r = await page.evaluate(() => {
      const c = document.getElementById('mc-solve')!.api!.getState().config as any;
      return {
        result: c.result.result.json,
        candidates: c.result.candidates.map((k: any) => [k.value.json, k.status]).sort(),
        relations: c.result.steps.map((s: any) => [s.rule, s.relation]),
        conditions: c.result.conditions.map((k: any) => k.json),
        badges: [...document.querySelectorAll('#mc-solve .math-compute-candidates .badge')].map((b) => b.textContent),
      };
    });
    assert.deepEqual(r.result, ['List', 3]);
    assert.deepEqual(r.candidates, [[0, 'rejected'], [3, 'accepted']]);
    assert.deepEqual(r.relations, [
      ['solve.move-terms', 'transform'],
      ['solve.square-both-sides', 'implies'],
      ['solve.quadratic-formula', 'candidate'],
      ['solve.validate-roots', 'check'],
      ['solve.roots', 'transform'],
    ]);
    assert.deepEqual(r.conditions, [['GreaterEqual', ['Add', 'x', 1], 0]]);
    assert.deepEqual(r.badges.sort(), ['accepted', 'rejected']);
  });

  await check('the steps: Next opens the first, the list marks the current one, Previous returns to the result - nothing is computed again', async () => {
    const before = workers.length;
    await page.click('#mc-solve [data-math-step-next]');
    const first = await page.evaluate(() => {
      const el = document.getElementById('mc-solve')!;
      return { state: el.dataset.stateName, step: (el.api!.getState().config as any).step, current: el.querySelector('[aria-current="step"]')?.getAttribute('data-math-step'), captions: [...el.querySelectorAll('.math-compute-pair figcaption')].map((f) => f.textContent), text: el.querySelector('.math-compute-explanation')?.textContent };
    });
    await page.click('#mc-solve [data-math-step="1"]');
    const second = await page.evaluate(() => (document.getElementById('mc-solve')!.api!.getState().config as any).step);
    const rel = await page.evaluate(() => document.querySelector('#mc-solve .math-compute-rule')?.textContent);
    await page.click('#mc-solve [data-math-step-prev]');
    await page.click('#mc-solve [data-math-step-prev]');
    const back = await page.evaluate(() => document.getElementById('mc-solve')!.dataset.stateName);
    assert.deepEqual(first, { state: 'explaining', step: 0, current: '0', captions: ['Before step 1', 'After step 1'], text: 'Step 1 of 5: Move all terms to one side solve.move-terms - rewritten by the engine' });
    assert.equal(second, 1);
    assert.match(rel ?? '', /may add solutions/);
    assert.equal(back, 'result');
    assert.equal(workers.length, before, 'no new worker');
  });

  await check('compare: an identity is proven; sin²x + cos²x = 1 by value stays unknown - not false', async () => {
    await page.click('#mc-compare [data-math-run]');
    await page.waitForFunction(() => document.getElementById('mc-compare')!.dataset.stateName === 'result', undefined, { timeout: 30_000 });
    const identity = await page.evaluate(() => [(document.getElementById('mc-compare')!.api!.getState().config as any).result.comparison, document.querySelector('#mc-compare .math-compute-verdict .badge')?.textContent]);
    const value = await page.evaluate(async () => {
      const el = document.getElementById('mc-compare')!;
      await (globalThis as any).df$.shadcn.mathCompute.run(el, { latex: '\\sin(x)^2+\\cos(x)^2', right: '1', comparison: 'value' });
      const c = el.api!.getState().config as any;
      return [c.result.comparison, el.querySelector('.math-compute-verdict .badge')?.textContent, (document.getElementById('mc-compare-right') as HTMLInputElement).value, c.result.notices.some((n: string) => /unknown is its answer/.test(n))];
    });
    assert.deepEqual(identity, ['true', 'equal']);
    assert.deepEqual(value, ['unknown', 'unknown', '1', true]);
  });

  await check('an assumption changes the result and shows as assumed: √(x²) = x where x > 0', async () => {
    const r = await page.evaluate(async () => {
      const el = document.getElementById('mc-assume')!;
      await (globalThis as any).df$.shadcn.mathCompute.run(el);
      const c = el.api!.getState().config as any;
      return { result: c.result.result.latex, conditions: c.result.conditions.map((k: any) => [k.json, k.origin]) };
    });
    assert.equal(r.result, 'x');
    assert.deepEqual(r.conditions, [[['GreaterEqual', ['Power', 'x', 2], 0], 'input'], [['Greater', 'x', 0], 'assumption']]);
  });

  await check('contradictory assumptions, invalid TeX → error; an equation the solver cannot handle → unsupported', async () => {
    const r = await page.evaluate(async () => {
      const m = (globalThis as any).df$.shadcn.mathCompute;
      const el = document.getElementById('mc-assume')!;
      await m.run(el, { context: { domain: 'real', variables: { x: 'real' }, assumptions: [['Greater', 'x', 0], ['Less', 'x', 0]], precision: 34 } });
      const contradiction = [el.dataset.stateName, el.querySelector('.math-compute-status')!.textContent];
      await m.run(el, { latex: '\\frac{1}{', context: { domain: 'real', variables: {}, assumptions: [], precision: 34 } });
      const invalid = [el.dataset.stateName, el.querySelector('.math-compute-status')!.textContent];
      await m.run(el, { latex: '\\sin(x)=x', operation: 'solve' });
      const unsupported = [el.dataset.stateName, el.querySelector('.math-compute-status')!.textContent];
      return { contradiction, invalid, unsupported };
    });
    assert.deepEqual(r.contradiction, ['error', 'The assumptions contradict each other.']);
    assert.deepEqual(r.invalid, ['error', 'The expression is invalid or incomplete.']);
    assert.equal(r.unsupported[0], 'unsupported');
    assert.match(String(r.unsupported[1]), /no solution list/);
  });

  await check('a floating-point root (x⁵ - x + 1 = 0) is undecided, not rejected - it cannot be checked exactly', async () => {
    const r = await page.evaluate(async () => {
      const el = document.getElementById('mc-assume')!;
      await (globalThis as any).df$.shadcn.mathCompute.run(el, { latex: 'x^5-x+1=0', operation: 'solve', context: { domain: 'real', variables: {}, assumptions: [], precision: 34 } });
      const c = el.api!.getState().config as any;
      return { candidates: c.result.candidates.map((k: any) => k.status), solutions: c.result.result.json, notice: c.result.notices.some((n: string) => /numerical root/.test(n)) };
    });
    assert.deepEqual(r, { candidates: ['unknown'], solutions: ['List'], notice: true });
  });

  await check('a config the component cannot use is refused and changes nothing', async () => {
    const r = await page.evaluate(() => {
      const el = document.getElementById('mc-cancel')!;
      const before = JSON.stringify(el.api!.getState());
      const refused: string[] = [];
      for (const bad of [{ operation: 'integrate' }, { order: 9 }, { context: { domain: 'real', variables: { 'x;': 'real' }, assumptions: [], precision: 34 } }, { latex: 'x'.repeat(70_000) }])
        try {
          el.api!.setState('default', bad);
        } catch (e) {
          refused.push((e as Error).message.split(' ')[0]);
        }
      return { refused, same: JSON.stringify(el.api!.getState()) === before };
    });
    assert.deepEqual(r.refused, ['operation', 'order:', 'context:', 'TeX']);
    assert.equal(r.same, true);
  });

  await check('the deadline terminates the worker: a 200000! evaluation stops after data-timeout and the next run works', async () => {
    await page.click('#mc-slow [data-math-run]');
    await page.waitForFunction(() => document.getElementById('mc-slow')!.dataset.stateName === 'error', undefined, { timeout: 30_000 });
    const msg = await page.evaluate(() => document.querySelector('#mc-slow .math-compute-status')!.textContent);
    const again = await page.evaluate(async () => {
      const el = document.getElementById('mc-slow')!;
      await (globalThis as any).df$.shadcn.mathCompute.run(el, { latex: '10!' });
      return [el.dataset.stateName, (el.api!.getState().config as any).result.result.latex];
    });
    assert.equal(msg, 'The computation took longer than 0.4 s and was stopped.');
    assert.deepEqual(again, ['result', '3\\,628\\,800']);
  });

  await check('Cancel terminates a running job: the panel returns to default and math-result says cancelled', async () => {
    const r = await page.evaluate(async () => {
      const el = document.getElementById('mc-slow')!;
      const events: string[] = [];
      el.addEventListener('math-result', (e) => events.push((e as CustomEvent).detail.status));
      const done = (globalThis as any).df$.shadcn.mathCompute.run(el, { latex: '200000!' });
      await new Promise((r) => setTimeout(r, 150));
      (el.querySelector('[data-math-cancel]') as HTMLButtonElement).click();
      await done;
      return { state: el.dataset.stateName, events, result: (el.api!.getState().config as any).result };
    });
    assert.deepEqual(r, { state: 'default', events: ['cancelled'], result: null });
  });

  await check('export(): the record as JSON - what a page records into script.math-compute-config', async () => {
    const r = await page.evaluate(() => {
      const json = (globalThis as any).df$.shadcn.mathCompute.export('#mc-solve');
      const rec = JSON.parse(json);
      return [rec.schemaVersion, rec.engine, rec.operation, (globalThis as any).df$.shadcn.mathCompute.export('#mc-slow')];
    });
    assert.deepEqual(r, [1, '0.149.0', 'solve', null]);
  });

  await check('a panel taken out of the page lets its worker go', async () => {
    const r = await page.evaluate(async () => {
      const el = document.getElementById('mc-compare')!;
      const worker = el._computeWorker as Worker;
      let alive = true;
      worker.addEventListener('message', () => undefined);
      const parent = el.parentElement!;
      const next = el.nextElementSibling;
      el.remove();
      await new Promise((r) => setTimeout(r, 50));
      alive = !!el._computeWorker;
      parent.insertBefore(el, next);
      return { had: !!worker, alive };
    });
    assert.deepEqual(r, { had: true, alive: false });
  });

  await check('no page errors', async () => {
    assert.deepEqual(errors, []);
  });

  await check('render() contract: render(state) reproduces each state; the store mirrors it', async () => {
    await assertRenderContract(page, '.math-compute[id]', ['default', 'computing', 'result', 'explaining', 'unsupported', 'error'], {
      // the status line is a live region the runtime writes as a job ends (a deadline's message comes from the run)
      runtimeOwned: '.math-compute-view, .math-compute-status',
    });
  });

  await page.close();
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nmath-compute.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nmath-compute.e2e: all checks passed');
