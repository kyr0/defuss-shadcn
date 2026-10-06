import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from './server.ts';
import { assertRenderContract } from './lib/render-contract.ts';

/**
 * Why: a branching questionnaire fails quietly - a branch that leads to the
 * wrong step, an answer left behind on a branch the user abandoned (and
 * submitted with the rest), a back button that goes to the previous
 * fieldset instead of the previous step taken, a reload that throws the
 * answers away. These checks walk a real flow through the shipped files:
 * choice and rule branches, validation (native, counts, cross-field),
 * branch history and back navigation, dependent-answer invalidation, skip,
 * the review, the session draft, submit - and the graph analysis of a flow
 * that is broken on purpose.
 */

const server = startServer();
const browser = await chromium.launch();
let failures = 0;

const check = async (label: string, fn: () => Promise<void>): Promise<void> => {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${label}\n    ${err instanceof Error ? err.message : err}`);
  }
};

try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  page.on('pageerror', (e) => {
    failures++;
    console.error(`  ✗ page error: ${e.message}`);
  });
  const ready = async () => {
    await page.goto(`${server.url}/tests/e2e/questionnaire.e2e-fixture.html`);
    await page.waitForFunction(() => (globalThis as any).__fixtureReady === true && (document.querySelector('#q-intake') as any)?.store, null, { timeout: 15_000 });
  };
  await ready();

  const Q = '#q-intake';
  // rendered, not just un-hidden: the CSS must let [hidden] win
  const visible = (sel = Q) => page.$$eval(`${sel} .questionnaire-step`, (s) => s.filter((x) => (x as HTMLElement).checkVisibility()).map((x) => (x as HTMLElement).dataset.step));
  const walk = () => page.$eval(Q, (el: any) => ({ name: el.store.value.name, ...el.store.value.config }));
  const next = () => page.click(`${Q} [data-questionnaire="next"]`);
  const error = () => page.$eval(`${Q} .questionnaire-step:not([hidden]) .questionnaire-error`, (e) => ((e as HTMLElement).hidden ? '' : e.textContent)).catch(() => '');
  const shown = (sel: string) => page.$eval(sel, (e) => !(e as HTMLElement).hidden && (e as HTMLElement).checkVisibility());

  await check('questionnaire.js took over the form: one step shows, start actions, key hints, progress over blocks', async () => {
    assert.deepEqual(await visible(), ['role']);
    assert.deepEqual(await Promise.all(['back', 'skip', 'next', 'submit'].map((b) => shown(`${Q} [data-questionnaire="${b}"]`))), [false, false, true, false]);
    assert.deepEqual(await page.$$eval(`${Q} [data-step="role"] .questionnaire-choice`, (c) => c.map((x) => (x as HTMLElement).dataset.key)), ['A', 'B', 'C']);
    assert.match(await page.textContent(`${Q} .questionnaire-progress-label`) ?? '', /^Question 1 of about \d+$/);
    assert.deepEqual(await page.$$eval(`${Q} .questionnaire-block-chip`, (c) => c.map((x) => (x as HTMLElement).dataset.status)), ['current', 'upcoming']);
    const w = await walk();
    assert.deepEqual([w.name, w.step, w.history], ['default', 'role', ['role']]);
  });

  await check('validation: a required choice keeps the step and says why (role=alert, aria-invalid, focus)', async () => {
    await next();
    assert.deepEqual(await visible(), ['role']);
    assert.ok((await error()).length > 0, 'a message');
    assert.equal(await page.getAttribute(`${Q} [data-step="role"]`, 'aria-invalid'), 'true');
    assert.equal(await page.$eval(`${Q} [data-step="role"] .questionnaire-error`, (e) => e.getAttribute('role')), 'alert');
  });

  await check('a letter key picks a choice; the choice\'s data-goto branches (Developer → languages)', async () => {
    await page.focus(`${Q} [data-step="role"] input[value="dev"]`);
    await page.keyboard.press('c');
    assert.equal(await page.$eval(`${Q} input[value="lead"]`, (i: HTMLInputElement) => i.checked), true, 'C = Team lead');
    await page.keyboard.press('a');
    await next();
    assert.deepEqual(await visible(), ['stack']);
    assert.deepEqual((await walk()).history, ['role', 'stack']);
    assert.equal((await walk()).name, 'answering');
  });

  await check('choice counts: data-min / data-max on a checkbox group', async () => {
    await next();
    assert.equal(await error(), 'Choose at least one.');
    for (const v of ['ts', 'py', 'go', 'rs']) await page.check(`${Q} input[name="stack"][value="${v}"]`);
    await next();
    assert.equal(await error(), 'Choose at most 3.');
    await page.uncheck(`${Q} input[name="stack"][value="go"]`);
    await page.uncheck(`${Q} input[name="stack"][value="rs"]`);
    await next();
    assert.deepEqual(await visible(), ['framework']);
    assert.deepEqual((await walk()).answers.stack, ['ts', 'py']);
  });

  await check('Enter in a text field continues; a rule branches on a number (team ≥ 50 → enterprise)', async () => {
    await page.fill('#q-fw', 'Svelte');
    await page.press('#q-fw', 'Enter');
    assert.deepEqual(await visible(), ['team']);
    await page.fill('#q-size', '60');
    await page.press('#q-size', 'Enter');
    assert.deepEqual(await visible(), ['enterprise']);
    await page.click(`${Q} input[name="sso"][value="yes"]`);
    await next();
    assert.deepEqual(await visible(), ['budget']);
    assert.deepEqual(await page.$$eval(`${Q} .questionnaire-block-chip`, (c) => c.map((x) => (x as HTMLElement).dataset.status)), ['done', 'current']);
  });

  await check('back navigation follows the branch history, not the markup', async () => {
    await page.click(`${Q} [data-questionnaire="back"]`);
    assert.deepEqual(await visible(), ['enterprise']);
    await page.click(`${Q} [data-questionnaire="back"]`);
    assert.deepEqual(await visible(), ['team']);
    const w = await walk();
    assert.deepEqual([w.index, w.history], [3, ['role', 'stack', 'framework', 'team', 'enterprise', 'budget']], 'the steps ahead stay in the history');
  });

  await check('changing an answer re-branches and clears what the old branch answered (orphans)', async () => {
    await page.$eval(Q, (el) => el.addEventListener('questionnaire-invalidate', (e: any) => { (globalThis as any).__cleared = e.detail.cleared; }));
    await page.fill('#q-size', '5');
    await next();
    assert.deepEqual(await visible(), ['budget']);
    const w = await walk();
    assert.equal(w.answers.sso, undefined, 'the enterprise answer is gone');
    assert.deepEqual(w.history, ['role', 'stack', 'framework', 'team', 'budget']);
    assert.deepEqual(await page.evaluate(() => (globalThis as any).__cleared), ['enterprise']);
    assert.match(await page.textContent(`${Q} .questionnaire-notice`) ?? '', /1 later answer was cleared/);
  });

  await check('cross-field validation: the budget\'s upper end must not be below its lower end', async () => {
    await page.fill('#q-min', '5000');
    await page.fill('#q-max', '1000');
    await next();
    assert.equal(await error(), 'The upper end must not be below the lower end.');
    assert.equal(await page.getAttribute('#q-max', 'aria-invalid'), 'true', 'the rule names its field');
    await page.fill('#q-max', '9000');
    await next();
    assert.deepEqual(await visible(), ['email']);
  });

  await check('native constraints: type=email', async () => {
    await page.fill('#q-email', 'not-an-email');
    await next();
    assert.ok((await error()).length > 0);
    await page.fill('#q-email', 'ada@example.com');
    await next();
    assert.deepEqual(await visible(), ['referral']);
  });

  await check('an optional step offers Skip; typing in "Other" picks its choice', async () => {
    assert.equal(await shown(`${Q} [data-questionnaire="skip"]`), true);
    await page.fill(`${Q} .questionnaire-other`, 'a podcast');
    assert.equal(await page.$eval(`${Q} input[name="referral"][value="other"]`, (i: HTMLInputElement) => i.checked), true);
    await page.click(`${Q} [data-questionnaire="skip"]`);
    assert.deepEqual(await visible(), ['review']);
    const w = await walk();
    assert.equal(w.name, 'review');
    assert.equal(w.answers.referral, undefined, 'skipping drops the answer');
    assert.deepEqual(w.skipped, ['referral']);
    assert.deepEqual(await Promise.all(['next', 'submit'].map((b) => shown(`${Q} [data-questionnaire="${b}"]`))), [false, true]);
  });

  await check('the review lists every answer on the path, each with Edit', async () => {
    const rows = await page.$$eval(`${Q} .questionnaire-summary-row`, (r) => r.map((x) => [x.querySelector('dt')!.textContent, x.querySelector('dd span')!.textContent]));
    assert.deepEqual(rows, [
      ['What describes you best?', 'Developer'],
      ['Which languages do you use?', 'TypeScript, Python'],
      ['Your main framework?', 'Svelte'],
      ['How many people are on your team?', '5'],
      ['Your budget range (EUR)?', '5000 · 9000'],
      ['Where can we reach you?', 'ada@example.com'],
      ['How did you hear about us?', 'Skipped'],
    ]);
  });

  await check('dependent answers: editing the languages clears the framework (data-depends-on)', async () => {
    await page.click(`${Q} .questionnaire-edit[data-questionnaire-go="stack"]`);
    assert.deepEqual(await visible(), ['stack']);
    await page.check(`${Q} input[name="stack"][value="rs"]`);
    await next();
    assert.deepEqual(await visible(), ['framework']);
    assert.equal(await page.inputValue('#q-fw'), '', 'the dependent answer is cleared');
    assert.equal((await walk()).answers.framework, undefined);
    assert.equal((await walk()).answers.email, 'ada@example.com', 'answers that do not depend on it stay');
    assert.deepEqual((await walk()).history, ['role', 'stack', 'framework'], 'the history ahead is cut where the answer changed');
  });

  await check('the branch history (an external .questionnaire-trail): every step taken, each a way back', async () => {
    const items = await page.$$eval('#q-trail-host .questionnaire-trail-item', (b) => b.map((x) => [(x as HTMLElement).dataset.questionnaireGo, x.querySelector('.questionnaire-trail-answer')!.textContent, x.getAttribute('aria-current')]));
    assert.deepEqual(items, [['role', 'Developer', null], ['stack', 'TypeScript, Python, Rust', null], ['framework', '—', 'step']]);
    await page.click('#q-trail-host [data-questionnaire-go="role"]');
    assert.deepEqual(await visible(), ['role']);
    // forward again without a change keeps the way it went
    await next();
    assert.deepEqual(await visible(), ['stack']);
    await next();
    await page.fill('#q-fw', 'Axum');
    await next();
    assert.deepEqual(await visible(), ['team']);
    assert.equal(await page.inputValue('#q-size'), '5', 'answers further on the path stay');
  });

  await check('the draft: a reload comes back to the same step with every answer (session storage)', async () => {
    const key = 'defuss-shadcn:/tests/e2e/questionnaire.e2e-fixture.html:questionnaire:q-intake';
    assert.equal(await page.evaluate((k) => JSON.parse(sessionStorage.getItem(k)!).value.step, key), 'team');
    await ready();
    assert.deepEqual(await visible(), ['team']);
    assert.equal(await page.inputValue('#q-size'), '5');
    assert.equal(await page.inputValue('#q-fw'), 'Axum');
    assert.match(await page.textContent(`${Q} .questionnaire-notice`) ?? '', /Your answers from earlier are back/);
    await page.click(`${Q} [data-questionnaire="back"]`);
    assert.deepEqual(await visible(), ['framework'], 'the history came back too');
  });

  await check('submit: only answers on the path are sent, the completion shows, the draft is gone', async () => {
    await page.$eval(Q, (el) => el.addEventListener('questionnaire-submit', (e: any) => { (globalThis as any).__sent = e.detail.answers; }));
    for (let i = 0; i < 6; i++) {
      const at = (await walk()).step;
      if (at === 'review') break;
      if (at === 'referral') await page.click(`${Q} [data-questionnaire="skip"]`);
      else await next();
    }
    assert.equal((await walk()).step, 'review');
    await page.click(`${Q} [data-questionnaire="submit"]`);
    await page.waitForFunction(() => (document.querySelector('#q-intake') as any).store.value.name === 'submitted');
    const sent = await page.evaluate(() => (globalThis as any).__sent);
    assert.deepEqual(sent, { role: 'dev', stack: ['ts', 'py', 'rs'], framework: 'Axum', size: 5, budgetMin: 5000, budgetMax: 9000, email: 'ada@example.com' });
    assert.equal(await shown(`${Q} .questionnaire-complete`), true);
    assert.deepEqual(await visible(), []);
    assert.equal(await shown(`${Q} .questionnaire-actions`), false);
    const key = 'defuss-shadcn:/tests/e2e/questionnaire.e2e-fixture.html:questionnaire:q-intake';
    assert.equal(await page.evaluate((k) => JSON.parse(sessionStorage.getItem(k)!).value, key), null);
  });

  await check('Start over: no answers, no history, the first step', async () => {
    await page.$eval(Q, (el) => (globalThis as any).df$.shadcn.questionnaire.restart(el));
    const w = await walk();
    assert.deepEqual([w.name, w.step, w.history, w.answers], ['default', 'role', ['role'], {}]);
    assert.equal(await page.$eval(`${Q} input[value="dev"]`, (i: HTMLInputElement) => i.checked), false);
  });

  await check('graph analysis: a valid flow passes; a broken one names every problem', async () => {
    const good = await page.$eval(Q, (el) => (globalThis as any).df$.shadcn.questionnaire.analyze(el));
    assert.deepEqual([good.ok, good.errors], [true, []]);
    const bad = await page.$eval('#q-broken', (el) => (globalThis as any).df$.shadcn.questionnaire.analyze(el));
    assert.equal(bad.ok, false);
    const has = (list: string[], re: RegExp) => assert.ok(list.some((m) => re.test(m)), `${re} in ${JSON.stringify(list)}`);
    has(bad.errors, /"a" leads to "ghost", which does not exist/);
    has(bad.errors, /a cycle: c → d → c/);
    has(bad.errors, /no step is an end/);
    has(bad.errors, /reads "nope", which no step asks/);
    has(bad.warnings, /"b" is unreachable/);
    assert.equal(await page.$eval('#q-broken', (el) => el.hasAttribute('data-flow-invalid')), true);
  });

  await check('dominators: a rule reading a field one branch skips is a warning; a field every path asks is not', async () => {
    const r = await page.$eval('#q-dom', (el) => (globalThis as any).df$.shadcn.questionnaire.analyze(el));
    assert.equal(r.ok, true, JSON.stringify(r.errors));
    assert.deepEqual(r.warnings, ['a branch on "y" reads "coupon" - a path can reach "y" without it']);
  });

  await check('toMermaid: the flow as a flowchart - choice and rule labels, the walked path marked', async () => {
    await page.$eval(Q, (el) => (globalThis as any).df$.shadcn.questionnaire.restart(el));
    await page.click(`${Q} input[value="design"]`);
    await next();
    const src = await page.$eval(Q, (el) => (globalThis as any).df$.shadcn.questionnaire.toMermaid(el));
    assert.match(src, /^flowchart TD/);
    assert.match(src, /q_role -->\|"Designer"\| q_tools/);
    assert.match(src, /q_team -->\|"size gte 50"\| q_enterprise/);
    assert.match(src, /class q_role visited;/);
    assert.match(src, /class q_tools current;/);
  });

  await check('toDiagram: the flow as an Illustrative Diagram spec - ranked top-down, a skipping edge routed around, the walk marked', async () => {
    const spec = await page.$eval('#q-dom', (el) => (globalThis as any).df$.shadcn.questionnaire.toDiagram(el, { title: 'Flow' }));
    assert.equal(spec.type, 'flow');
    assert.equal(spec.title, 'Flow');
    assert.equal(spec.interactive, true);
    assert.deepEqual(spec.nodes.map((n: any) => [n.id, n.row, n.col]), [['pick', 1, 1], ['x', 2, 1], ['y', 3, 1], ['end', 4, 1]]);
    assert.equal(spec.nodes[0].eyebrow, 'Start');
    assert.equal(spec.nodes[0].tone, 'accent', 'the current step');
    assert.equal(spec.nodes[3].shape, 'pill');
    const edge = (from: string, to: string) => spec.edges.find((e: any) => e.from === from && e.to === to);
    assert.equal(edge('pick', 'y').curve, 'around', 'skips a rank in the same column: around the stack');
    assert.equal(edge('pick', 'x').line, 'dashed', 'not walked yet');
  });

  await check('linkDiagram: the figure follows the form, a click moves it - back, the next step, never further', async () => {
    const G = '#q-dom-graph';
    const step = () => page.$eval('#q-dom', (el: any) => el.store.value.config.step);
    const tone = (id: string) => page.$eval(`${G} .diagram-node[data-node="${id}"]`, (n) => (n as HTMLElement).dataset.tone ?? '');
    await page.waitForSelector(`${G} .diagram-node[data-node="end"]`);
    assert.equal(await tone('pick'), 'accent');
    await page.$eval('#q-dom', (el) => { (globalThis as any).__refused = []; el.addEventListener('questionnaire-jump-refused', (e) => (globalThis as any).__refused.push((e as CustomEvent).detail)); });
    // further on: refused, the form stays and says why
    await page.click(`${G} .diagram-node[data-node="end"]`);
    assert.equal(await step(), 'pick');
    assert.deepEqual(await page.evaluate(() => (globalThis as any).__refused), [{ to: 'end', step: 'pick', reason: 'unreached' }]);
    assert.match(await page.$eval('#q-dom', (el) => el.textContent ?? ''), /"End" is not reachable yet - answer "Pick" first\./);
    // the next step, answered: the click moves on like Continue
    await page.click('#q-dom input[value="a"]');
    await page.click(`${G} .diagram-node[data-node="x"]`);
    await page.waitForFunction(() => (document.querySelector('#q-dom') as any).store.value.config.step === 'x');
    assert.equal(await tone('pick'), 'muted', 'a step taken');
    assert.equal(await tone('x'), 'accent', 'the current step');
    assert.equal(await page.$eval(`${G} .diagram-edge[data-from="pick"][data-to="x"]`, (e) => [(e as HTMLElement).dataset.tone, e.hasAttribute('data-flow')].join(',')), 'accent,true', 'the edge just walked: solid accent, a flow token');
    // the next step, not answered: refused as invalid (the form shows its own message)
    await page.click(`${G} .diagram-node[data-node="y"]`);
    assert.equal(await step(), 'x');
    assert.equal((await page.evaluate(() => (globalThis as any).__refused)).at(-1).reason, 'invalid');
    // back to a step taken
    await page.click(`${G} .diagram-node[data-node="pick"]`);
    await page.waitForFunction(() => (document.querySelector('#q-dom') as any).store.value.config.step === 'pick');
    assert.equal(await tone('pick'), 'accent');
  });

  await check('keys from the page: with nothing focused, the questionnaire last worked in takes them - digits, auto-advance, a star rating, Enter', async () => {
    await page.click('#q-poll .questionnaire-title'); // work in the poll …
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur()); // … focus back on the page
    assert.equal(await page.evaluate(() => document.activeElement === document.body), true);
    await page.keyboard.press('2');
    await page.waitForFunction(() => (document.querySelector('#q-poll') as any).store.value.config.step === 'rate');
    assert.equal(await page.$eval('#q-poll input[value="meh"]', (i: HTMLInputElement) => i.checked), true);
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await page.keyboard.press('4');
    await page.waitForFunction(() => (document.querySelector('#q-poll') as any).store.value.config.step === 'thanks');
    assert.equal(await page.$eval('#q-poll input[name="score"][value="4"]', (i: HTMLInputElement) => i.checked), true, 'a digit picks the nth star');
    const rows = await page.$$eval('#q-poll .questionnaire-summary-row', (r) => r.map((x) => x.querySelector('dd span')!.textContent));
    assert.deepEqual(rows, ['Meh', '4 stars'], 'a star reads its aria-label');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('fixture-poll')!).value.answers.score), '4');
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => (document.querySelector('#q-poll') as any).store.value.name === 'submitted');
  });

  await check('keys never leave the field being typed in', async () => {
    await page.$eval('#q-intake', (el) => (globalThis as any).df$.shadcn.questionnaire.restart(el));
    await page.click('#q-intake input[value="dev"]');
    await next();
    await next(); // stack needs a choice: stays
    await page.$eval('#q-intake', (el) => (globalThis as any).df$.shadcn.questionnaire.goTo(el, 'role'));
    await page.click('#q-intake input[value="lead"]');
    await next();
    assert.deepEqual(await visible(), ['team']);
    await page.click('#q-size');
    await page.keyboard.type('12');
    assert.equal(await page.inputValue('#q-size'), '12', 'digits went into the field');
    assert.deepEqual(await visible(), ['team']);
  });

  await check('State API: review / answering { step } / default / submitted; unknown names throw; registry', async () => {
    const r = await page.$eval(Q, (el: any) => {
      const out: unknown[] = [];
      el.api.setState('review');
      out.push(el.store.value.name, el.store.value.config.step);
      el.api.setState('answering', { step: 'email' });
      out.push(el.store.value.name, el.store.value.config.step);
      el.api.setState('default');
      out.push(el.store.value.name, el.store.value.config.step);
      el.api.setState('submitted');
      out.push(el.store.value.name, el.querySelector('.questionnaire-complete').hidden);
      el.api.setState('default');
      let threw = false;
      try { el.api.setState('nope'); } catch { threw = true; }
      return [...out, threw, typeof (globalThis as any).df$.shadcn.questionnaireApi.setState, (globalThis as any).df$.shadcn.questionnaireStates.join()];
    });
    assert.deepEqual(r, ['review', 'review', 'answering', 'email', 'default', 'role', 'submitted', false, true, 'function', 'default,answering,review,submitted']);
  });

  await check('prefers-reduced-motion: steps appear without the slide', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.$eval(`${Q} .questionnaire-step:not([hidden])`, (s) => getComputedStyle(s).animationName), 'none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  // LAST (AGENTS.md "State API" → render): the contract reloads the page
  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
    await ready();
    await assertRenderContract(page, '.questionnaire[id]', ['default', 'answering', 'review', 'submitted'], {
      // runtime-made: key hints, the progress, notes, errors, the review list
      runtimeAttrs: ['data-key', 'novalidate', 'data-flow-invalid', 'aria-invalid', 'aria-describedby'],
      runtimeOwned: '.questionnaire-progress > *, .questionnaire-notice, .questionnaire-error, .questionnaire-summary > *',
    });
    await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
  });
} finally {
  await browser.close();
  server.stop?.();
}

if (failures) {
  console.error(`\nquestionnaire.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('questionnaire.e2e: all checks passed');
