import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';

/**
 * Why: a chat card is only useful when the reader's answer arrives as the document promised - typed, validated,
 * with a sentence for the transcript - and when nothing a document says can run as markup (a language model wrote
 * it). These checks drive the real dist/ bundle: every node type renders the component its skill documents, the
 * browser's validation guards Send, answers are typed (amounts and numbers as numbers, switches as booleans, groups
 * as lists, Other as its text), quick replies and cancel finish the card, a questionnaire node branches and sends,
 * an authored answer starts answered, an invalid document becomes an Alert with JSON paths, hostile text stays text,
 * and the API (validate, summary, fences, tool, markup, mount) and Chat Scripts (run, branches, free text, match,
 * back, restart, persist, validate) work in a Session.
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

const URL = `${server.url}/tests/e2e/chat/chat-components.e2e-fixture.html`;

try {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 1200 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => {
    failures++;
    console.error(`  ✗ page error: ${e.message}`);
  });
  const ready = async () => {
    await page.goto(URL);
    await page.waitForSelector('#cc-fields[data-init] .chat-components-card');
    await page.evaluate(() => {
      const g = globalThis as any;
      g.__answers = {};
      document.addEventListener('chat-components-answer', (e: any) => (g.__answers[e.target.id] = e.detail));
    });
  };
  await ready();
  const answer = (id: string) => page.evaluate((i) => (globalThis as any).__answers[i] ?? null, id);
  const state = (id: string) =>
    page.$eval(`#${id}`, (e: any) => [e.dataset.stateName, e.getAttribute('data-answered')]);

  await check(
    'init: every card is built from its document - a form Card of the components the skills document',
    async () => {
      assert.deepEqual(await state('cc-plan'), ['default', null]);
      assert.equal(
        await page.$eval('#cc-plan .chat-components-body > form.card.chat-components-card', (f) =>
          f.getAttribute('data-size'),
        ),
        'sm',
      );
      assert.equal(await page.textContent('#cc-plan .card-title'), 'Confirm the migration plan');
      assert.equal(
        await page.$eval('#cc-plan .card-description', (d) => d.innerHTML),
        'I will run these steps <strong>in order</strong>.',
      );
      // each field type is its component's markup
      const has = (sel: string) => page.$$eval(`#cc-fields ${sel}`, (l) => l.length);
      assert.equal(
        await has(
          '.number-input[data-currency="EUR"][data-locale="de-DE"] input[type="hidden"][name="budget"][data-number-output]',
        ),
        1,
      );
      assert.equal(await has('.number-input input[type="number"][name="hours"][min="1"][max="40"]'), 1);
      assert.equal(await has('input.input[type="email"][name="email"][required]'), 1);
      assert.equal(await has('textarea.textarea[name="reason"][rows="2"]'), 1);
      assert.equal(await has('select.select[name="team"] option'), 4);
      assert.equal(await has('fieldset.chat-components-group input.radio[name="start"]'), 3);
      assert.equal(await has('input.input.chat-components-other[name="startOther"]'), 1);
      assert.equal(await has('fieldset.chat-components-group input.checkbox[name="tools"]'), 3);
      assert.equal(await has('input.switch[role="switch"][name="remote"]:checked'), 1);
      assert.equal(await has('input.slider[type="range"][name="confidence"][data-unit="%"]'), 1);
      assert.equal(await has('.rating .rating-input[name="priority"]'), 5);
      assert.equal(await has('input.input[type="date"][name="due"][min="2026-01-01"]'), 1);
      // the components' own scripts ran (the number input's mask, the slider's output)
      assert.equal(await page.$eval('#cc-fields .number-input[data-currency]', (w: any) => !!w.api), true);
      assert.equal(await page.$eval('#cc-fields output[for]', (o: any) => o.htmlFor.value), 'cc-fields-confidence');
      // labels and hints are wired
      assert.equal(
        await page.$eval('#cc-fields-budget', (i) => i.getAttribute('aria-describedby')),
        'cc-fields-budget-hint',
      );
      assert.equal(await page.$eval('label[for="cc-fields-email"]', (l) => l.textContent), 'Email');
    },
  );

  await check(
    'content nodes: text with inline formatting, an ordered list, a Table, facts, a Separator, an Alert',
    async () => {
      assert.equal(
        await page.$eval('#cc-content .chat-components-text', (p) => p.innerHTML),
        'Ordered <strong>2 items</strong> with <code>express</code> delivery.',
      );
      assert.deepEqual(
        await page.$$eval('#cc-content ol.chat-components-list li', (l) => l.map((x) => x.textContent)),
        ['Desk lamp', 'Notebook'],
      );
      assert.equal(await page.textContent('#cc-content .table-caption'), 'Items');
      assert.deepEqual(await page.$$eval('#cc-content .table-cell', (l) => l.map((x) => x.textContent)), [
        'Desk lamp',
        '39.9',
        'Notebook',
        '4.5',
      ]);
      assert.deepEqual(
        await page.$$eval('#cc-content .chat-components-facts > div', (l) => l.map((x) => x.textContent)),
        ['Total44,40 €', 'ArrivesFriday'],
      );
      assert.equal(await page.$$eval('#cc-content hr.separator', (l) => l.length), 1);
      assert.equal(await page.textContent('#cc-content .alert .alert-title'), 'Heads up');
      assert.equal(
        await page.$$eval('#cc-content .chat-components-actions', (l) => l.length),
        0,
        'content only: no actions',
      );
    },
  );

  await check(
    'fields: the browser checks Send first; the answers arrive typed (amount and numbers as numbers, the switch a boolean, the group a list, Other its text)',
    async () => {
      await page.click('#cc-fields [data-chat-action="submit"]');
      assert.equal(await answer('cc-fields'), null, 'required fields stop Send');
      await page.fill('#cc-fields-budget', '1234,5');
      await page.fill('#cc-fields-email', 'ada@example.com');
      await page.fill('#cc-fields [name="startOther"]', 'Next Wednesday');
      await page.check('#cc-fields [name="tools"][value="Linear"]');
      await page.check('#cc-fields [name="terms"]');
      await page.selectOption('#cc-fields-team', 'data');
      await page.click('#cc-fields .rating-item:nth-child(4)');
      await page.fill('#cc-fields-due', '2026-12-01');
      await page.click('#cc-fields [data-chat-action="submit"]');
      const a = await answer('cc-fields');
      assert.deepEqual(a.answers, {
        budget: 1234.5,
        hours: 20,
        email: 'ada@example.com',
        reason: null,
        team: 'data',
        start: 'other',
        startOther: 'Next Wednesday',
        tools: ['Linear'],
        terms: true,
        remote: true,
        confidence: 70,
        priority: 4,
        due: '2026-12-01',
      });
      assert.equal(a.id, 'request');
      assert.equal(a.action, 'submit');
      assert.equal(a.reply, null);
      assert.match(
        a.summary.replace(/\u00a0/g, ' '),
        /^Budget: 1\.234,50 €; Hours per week: 20 h; Email: ada@example\.com; Reason: -; Team: Data & ML; Start: Next Wednesday; Tools: Linear; I accept the travel policy: Yes; Remote: Yes; Confidence: 70 %; Priority: 4 of 5; Due date: 2026-12-01$/,
      );
      // answered: read only, the chosen action marked
      assert.deepEqual(await state('cc-fields'), ['answered', 'answered']);
      assert.equal(await page.$eval('#cc-fields-email', (i: any) => i.disabled), true);
      assert.equal(
        await page.$eval('#cc-fields [data-chat-action="submit"]', (b) =>
          [b.hasAttribute('data-chosen'), b.getAttribute('aria-pressed')].join(),
        ),
        'true,true',
      );
      assert.deepEqual(
        (await page.evaluate(() => (document.querySelector('#cc-fields') as any).api.getState().config)).answers.budget,
        1234.5,
      );
    },
  );

  await check('a plan: untick a step, Confirm answers the ticked ids; Not now cancels (state cancelled)', async () => {
    await page.uncheck('#cc-plan [name="steps"][value="verify"]');
    await page.click('#cc-plan [data-chat-action="confirm"]');
    const a = await answer('cc-plan');
    assert.deepEqual(a.answers, { steps: ['backup', 'migrate'] });
    assert.equal(a.summary, 'Steps: Back up the database, Run the migrations');
    // reopened by the State API, then cancelled
    await page.evaluate(() => (document.querySelector('#cc-plan') as any).api.setState('default'));
    assert.deepEqual(await state('cc-plan'), ['default', null]);
    assert.equal(
      await page.$eval('#cc-plan [data-chat-action="cancel"]', (b) => getComputedStyle(b).display !== 'none'),
      true,
    );
    await page.click('#cc-plan [data-chat-action="cancel"]');
    assert.deepEqual(await state('cc-plan'), ['cancelled', 'cancelled']);
    const c = await answer('cc-plan');
    assert.deepEqual([c.action, c.answers, c.summary], ['cancel', {}, 'Not now']);
    assert.equal(await page.$eval('#cc-plan [data-chat-action="confirm"]', (b) => getComputedStyle(b).display), 'none');
  });

  await check('quick replies: a tap answers with its text; the others go', async () => {
    await page.click('#cc-quick [data-chat-action="team"]');
    const a = await answer('cc-quick');
    assert.deepEqual([a.action, a.reply, a.summary, a.answers], ['team', 'The Team plan', 'The Team plan', {}]);
    assert.equal(
      await page.$eval('#cc-quick [data-chat-action="starter"]', (b) => getComputedStyle(b).display),
      'none',
    );
  });

  await check(
    'a questionnaire node: steps with a choice branch (goto), Other, a required amount, the review; Send finishes the card and lists the answers',
    async () => {
      const Q = '#cc-q .questionnaire';
      assert.equal(await page.$eval(Q, (f) => f.getAttribute('data-persist')), 'none');
      assert.equal(await page.textContent(`${Q} [data-questionnaire="submit"]`), 'Send the brief');
      assert.equal(
        await page.$$eval('#cc-q .chat-components-actions [data-chat-action]', (l) =>
          l.map((b) => b.textContent).join(),
        ),
        'Later',
        "the submit action is the questionnaire's Send",
      );
      await page.click(`${Q} .questionnaire-step[data-step="kind"] .questionnaire-choice:nth-child(2)`);
      await page.click(`${Q} [data-questionnaire="next"]`);
      await page.waitForSelector(`${Q} .questionnaire-step[data-step="platform"]:not([hidden])`);
      await page.click(`${Q} .questionnaire-step[data-step="platform"] .questionnaire-choice:nth-child(1)`);
      await page.click(`${Q} [data-questionnaire="next"]`);
      await page.waitForSelector(`${Q} .questionnaire-step[data-step="budget"]:not([hidden])`);
      await page.click(`${Q} [data-questionnaire="next"]`);
      assert.equal(
        await page.$eval(`${Q} .questionnaire-step[data-step="budget"]`, (s: any) => s.hidden),
        false,
        'a required amount stops the step',
      );
      await page.fill('#cc-q-q-budget', '25000');
      await page.click(`${Q} [data-questionnaire="next"]`);
      await page.waitForSelector(`${Q} .questionnaire-step[data-step="review"]:not([hidden])`);
      await page.click(`${Q} [data-questionnaire="submit"]`);
      await page.waitForFunction(() => !!(globalThis as any).__answers['cc-q']);
      const a = await answer('cc-q');
      assert.deepEqual(a.answers, { kind: 'app', platforms: ['iOS'], budget: 25000 });
      assert.equal(a.action, 'send');
      assert.deepEqual(await state('cc-q'), ['answered', 'answered']);
      assert.equal(await page.$eval(Q, (f: any) => f.hidden), true);
      assert.deepEqual(await page.$$eval('#cc-q .chat-components-answers > div', (l) => l.map((x) => x.textContent)), [
        'kindAn app',
        'platformsiOS',
        'budget$25,000.00',
      ]);
    },
  );

  await check(
    'an authored answer: chat-components-answers starts the card answered, the fields show it read only',
    async () => {
      assert.deepEqual(await state('cc-answered'), ['answered', 'answered']);
      assert.equal(
        await page.$eval('#cc-answered [name="slot"][value="Evening"]', (i: any) => i.checked && i.disabled),
        true,
      );
      assert.equal(await page.$eval('#cc-answered [name="floor"]', (i: any) => i.value), '3');
      assert.deepEqual(
        (await page.evaluate(() => (document.querySelector('#cc-answered') as any).api.getState())).config,
        { action: 'submit', answers: { slot: 'Evening', floor: 3 } },
      );
    },
  );

  await check('an invalid document: a destructive Alert names each problem by its JSON path - no form', async () => {
    assert.equal(await page.$eval('#cc-invalid', (e) => e.hasAttribute('data-invalid')), true);
    assert.equal(await page.$$eval('#cc-invalid form', (l) => l.length), 0);
    assert.equal(
      await page.$eval('#cc-invalid .alert', (a) => [a.getAttribute('data-variant'), a.getAttribute('role')].join()),
      'destructive,alert',
    );
    assert.equal(
      await page.$eval('#cc-invalid .alert-description', (d) => d.innerHTML),
      'body[0].type: unknown type "slider-xl"<br>body[1].options: a list of choices',
    );
  });

  await check('hostile text stays text: no element, attribute or script from the document runs', async () => {
    assert.equal(await page.evaluate(() => (globalThis as any).__pwned ?? 0), 0);
    assert.equal(
      await page.$$eval(
        '#cc-xss img, #cc-xss svg, #cc-xss .chat-components-body script, #cc-xss b, #cc-xss i',
        (l) => l.length,
      ),
      0,
    );
    assert.equal(await page.textContent('#cc-xss .card-title'), '<img src=x onerror="globalThis.__pwned=1">');
    assert.equal(
      await page.$eval('#cc-xss .chat-components-text', (p) => p.innerHTML),
      '&lt;script&gt;globalThis.__pwned=2&lt;/script&gt;<strong>bold</strong>',
    );
    assert.equal(
      await page.$eval('#cc-xss [name="x"]', (i) =>
        [i.getAttribute('placeholder'), i.hasAttribute('onerror')].join('|'),
      ),
      '"><img src=x onerror=globalThis.__pwned=5>|false',
    );
    assert.equal(
      await page.$eval('#cc-xss option:last-child', (o: any) => [o.value, o.textContent].join('|')),
      '"><svg onload=globalThis.__pwned=4>|<i>o</i>',
    );
  });

  await check(
    'the API: validate (paths, warnings), summary, fences (closed and streaming), tool / jsonSchema, markup + mount',
    async () => {
      const r = await page.evaluate(() => {
        const cc = (globalThis as any).df$.shadcn.chatComponents;
        const md =
          'Before\n\n```ui::component-schema\n{"version":1,"body":[{"type":"switch","name":"ok","label":"OK"}]}\n```\n\nAfter\n\n```ui::component-schema\n{"version":1,';
        const f = cc.fences(md);
        const tool = cc.tool();
        return {
          fence: cc.fence,
          problems: cc.validate({
            version: 2,
            extra: 1,
            body: [
              { type: 'input' },
              { type: 'radio', name: 'a', options: ['x', 'x'] },
              { type: 'number', name: 'a', min: 5, max: 1 },
            ],
            actions: [{ id: 'go' }],
          }),
          none: cc.validate({ version: 1, body: [{ type: 'text', text: 'hi' }] }),
          q: cc.validate({
            version: 1,
            body: [
              { type: 'input', name: 'x' },
              {
                type: 'questionnaire',
                steps: [
                  {
                    id: 'a',
                    title: 'A',
                    fields: [{ type: 'radio', name: 'r', options: [{ value: 'y', goto: 'nowhere' }] }],
                  },
                ],
              },
            ],
          }),
          summary: cc.summary(
            {
              version: 1,
              body: [
                { type: 'currency', name: 'p', label: 'Price', currency: 'USD', locale: 'en-US' },
                { type: 'switch', name: 's', label: 'Gift' },
              ],
            },
            { p: 12.5, s: false },
          ),
          fences: f.map((x: any) => [
            x.closed,
            x.spec?.body?.[0]?.name ?? null,
            md.slice(x.end).startsWith('\nAfter') || x.end === md.length,
          ]),
          tool: [tool.type, tool.function.name, tool.function.parameters.$defs.node.properties.type.enum.length],
          markup: cc.markup({ version: 1, title: 'T' }, { id: 'x1' }),
        };
      });
      assert.equal(r.fence, 'ui::component-schema');
      assert.deepEqual(
        r.problems.map((p: any) => `${p.level} ${p.path}: ${p.message}`),
        [
          'error version: version 2 is not supported (1)',
          'warning extra: unknown key, ignored',
          'error body[0].name: a field needs a name (letters, digits, - and _, starting with a letter)',
          'error body[1].options[1].value: "x" twice',
          'error body[2].name: the name "a" is used twice',
          'error body[2].min: above max',
          'error actions[0].label: missing',
        ],
      );
      assert.deepEqual(r.none, []);
      assert.deepEqual(
        r.q.map((p: any) => p.path),
        ['body[1].steps[0].fields[0].options[0].goto', 'body'],
      );
      assert.equal(r.summary, 'Price: $12.50; Gift: No');
      assert.deepEqual(r.fences, [
        [true, 'ok', true],
        [false, null, true],
      ]);
      assert.deepEqual(r.tool, ['function', 'show_components', 19]);
      assert.equal(
        r.markup,
        '<div class="chat-components" id="x1" aria-label="T"><script type="application/json" class="chat-components-schema">{"version":1,"title":"T"}</script></div>',
      );
      // mount: another document in a card, opened again
      await page.evaluate(() =>
        (globalThis as any).df$.shadcn.chatComponents.mount('#cc-quick', {
          version: 1,
          body: [{ type: 'input', name: 'city', label: 'City' }],
        }),
      );
      assert.deepEqual(await state('cc-quick'), ['default', null]);
      assert.equal(await page.$$eval('#cc-quick input[name="city"]', (l) => l.length), 1);
      await page.fill('#cc-quick input[name="city"]', 'Lisbon');
      assert.deepEqual(await page.evaluate(() => (globalThis as any).df$.shadcn.chatComponents.answers('#cc-quick')), {
        city: 'Lisbon',
      });
    },
  );

  await check('setState answered writes the answers into the fields; default opens them again', async () => {
    await page.evaluate(() =>
      (document.querySelector('#cc-answered') as any).api.setState('answered', {
        action: 'submit',
        answers: { slot: 'Morning', floor: 7 },
      }),
    );
    assert.equal(await page.$eval('#cc-answered [name="slot"][value="Morning"]', (i: any) => i.checked), true);
    assert.equal(await page.$eval('#cc-answered [name="floor"]', (i: any) => i.value), '7');
    await page.evaluate(() => (document.querySelector('#cc-answered') as any).api.setState('default'));
    assert.equal(await page.$eval('#cc-answered [name="floor"]', (i: any) => i.disabled), false);
    assert.equal(await page.$eval('#cc-answered [data-chat-action="submit"]', (b: any) => b.disabled), false);
    await page.evaluate(() =>
      (document.querySelector('#cc-answered') as any).api.setState('cancelled', { action: 'submit' }),
    );
    assert.deepEqual(await state('cc-answered'), ['cancelled', 'cancelled']);
  });

  // -- Chat Scripts ----------------------------------------------------------------------
  const SCRIPT = {
    version: 1,
    start: 'hello',
    fallback: 'Use the buttons, please.',
    nodes: {
      hello: {
        say: ['Hi!', 'What do you need?'],
        ask: {
          version: 1,
          id: 'topic',
          actions: [
            { id: 'order', label: 'Order', reply: 'An order' },
            { id: 'talk', label: 'Talk', reply: 'Just talk' },
          ],
        },
        match: [{ pattern: 'refund', goto: 'refund' }],
        branches: [{ when: { field: 'topic', value: 'order' }, goto: 'size' }],
        next: 'name',
      },
      size: {
        say: 'Which size?',
        ask: {
          version: 1,
          id: 'sizeCard',
          body: [{ type: 'number', name: 'qty', label: 'How many', min: 1, required: true }],
          actions: [{ id: 'ok', label: 'OK', submit: true }],
        },
        branches: [{ when: { field: 'qty', op: 'gte', value: 10 }, goto: 'bulk' }],
        next: 'done',
      },
      bulk: { say: '{{qty}} is a bulk order.', end: true },
      done: { say: 'Ordered {{qty}}.', end: true },
      name: { say: 'Your name?', input: 'name', next: 'greet' },
      greet: { say: 'Hello **{{name}}**.', end: true },
      refund: { say: 'Refunds are on the way.', end: true },
    },
  };
  const rows = () =>
    page.$$eval('#chat .chat-script-row', (l) =>
      l.map(
        (r) =>
          (r.getAttribute('data-align') === 'end' ? 'you: ' : 'bot: ') +
          ((r.querySelector('.bubble-content') as HTMLElement | null)?.textContent ??
            `[card ${r.querySelector('.chat-components')?.id}]`),
      ),
    );

  await check(
    'a script in a Session: lines, a quick-reply card, a branch on the action, a card whose number branches (gte), {{answers}} filled in',
    async () => {
      await page.evaluate((s) => {
        const g = globalThis as any;
        g.__events = [];
        g.__run = g.df$.shadcn.chatScript.run('#chat', s, {
          composer: '#composer',
          bot: { name: 'Ada', initials: 'AD' },
          on: {
            step: (n: string) => g.__events.push('step ' + n),
            end: (a: any) => g.__events.push('end ' + JSON.stringify(a)),
          },
        });
      }, SCRIPT);
      await page.waitForFunction(() => (globalThis as any).__run.state().waiting === 'components');
      assert.deepEqual(await rows(), ['bot: Hi!', 'bot: What do you need?', 'bot: [card chat-card-1]']);
      assert.equal(await page.$eval('#chat .chat-script-row .avatar-fallback', (a) => a.textContent), 'AD');
      await page.click('#chat-card-1 [data-chat-action="order"]');
      await page.waitForSelector('#chat-card-2');
      await page.fill('#chat-card-2 input[type="number"]', '12');
      await page.click('#chat-card-2 [data-chat-action="ok"]');
      await page.waitForFunction(() => (globalThis as any).__run.state().waiting === 'end');
      assert.deepEqual(await rows(), [
        'bot: Hi!',
        'bot: What do you need?',
        'bot: [card chat-card-1]',
        'you: An order',
        'bot: Which size?',
        'bot: [card chat-card-2]',
        'you: How many: 12',
        'bot: 12 is a bulk order.',
      ]);
      const st = await page.evaluate(() => (globalThis as any).__run.state());
      assert.deepEqual(
        [st.answers, st.history],
        [{ topic: 'order', qty: 12, sizeCard: 'ok' }, ['hello', 'size', 'bulk']],
      );
      assert.deepEqual(await page.evaluate(() => (globalThis as any).__events), [
        'step hello',
        'step size',
        'step bulk',
        'end {"topic":"order","qty":12,"sizeCard":"ok"}',
      ]);
    },
  );

  await check(
    'back() undoes the last answer (its rows go, the question asks again); restart() starts over',
    async () => {
      assert.equal(await page.evaluate(() => (globalThis as any).__run.back()), true);
      await page.waitForFunction(() => (globalThis as any).__run.state().waiting === 'components');
      assert.deepEqual(await rows(), [
        'bot: Hi!',
        'bot: What do you need?',
        'bot: [card chat-card-1]',
        'you: An order',
        'bot: Which size?',
        'bot: [card chat-card-3]',
      ]);
      assert.deepEqual(await page.evaluate(() => (globalThis as any).__run.state().answers), { topic: 'order' });
      await page.fill('#chat-card-3 input[type="number"]', '2');
      await page.click('#chat-card-3 [data-chat-action="ok"]');
      await page.waitForFunction(() => (globalThis as any).__run.state().waiting === 'end');
      assert.equal((await rows()).at(-1), 'bot: Ordered 2.');
      await page.evaluate(() => (globalThis as any).__run.restart());
      await page.waitForFunction(() => (globalThis as any).__run.state().waiting === 'components');
      assert.deepEqual(await rows(), ['bot: Hi!', 'bot: What do you need?', 'bot: [card chat-card-4]']);
    },
  );

  await check(
    "free text: typed while a card waits - a match routes, else the fallback; an input node takes the composer's text (Enter sends)",
    async () => {
      await page.fill('#composer textarea', 'hello?');
      await page.press('#composer textarea', 'Enter');
      await page.waitForFunction(() => (globalThis as any).__run.state().rows === 5);
      assert.deepEqual((await rows()).slice(-2), ['you: hello?', 'bot: Use the buttons, please.']);
      assert.equal(await page.inputValue('#composer textarea'), '', 'the composer is emptied');
      await page.click('#chat-card-4 [data-chat-action="talk"]');
      await page.waitForFunction(() => (globalThis as any).__run.state().waiting === 'text');
      await page.fill('#composer textarea', 'Grace');
      await page.click('#composer [type="submit"]');
      await page.waitForFunction(() => (globalThis as any).__run.state().waiting === 'end');
      assert.deepEqual((await rows()).slice(-4), [
        'you: Just talk',
        'bot: Your name?',
        'you: Grace',
        'bot: Hello Grace.',
      ]);
      assert.equal(
        await page.$$eval('#chat .chat-script-row .bubble-content', (l) => l.at(-1)!.innerHTML),
        'Hello <strong>Grace</strong>.',
      );
      // a match from the start
      await page.evaluate(() => (globalThis as any).__run.restart());
      await page.waitForFunction(() => (globalThis as any).__run.state().waiting === 'components');
      await page.fill('#composer textarea', 'I want a REFUND');
      await page.press('#composer textarea', 'Enter');
      await page.waitForFunction(() => (globalThis as any).__run.state().waiting === 'end');
      assert.equal((await rows()).at(-1), 'bot: Refunds are on the way.');
    },
  );

  await check(
    'persist: a conversation comes back after a reload - its rows, answered cards answered, the open card still answerable',
    async () => {
      await page.evaluate((s) => {
        localStorage.removeItem('e2e-chat');
        const g = globalThis as any;
        document.querySelector('#chat .session-content')!.replaceChildren();
        g.__run = g.df$.shadcn.chatScript.run('#chat', s, { persist: 'e2e-chat' });
      }, SCRIPT);
      await page.waitForFunction(() => (globalThis as any).__run.state().waiting === 'components');
      await page.click('#chat [data-chat-action="order"]');
      await page.waitForFunction(() => document.querySelectorAll('#chat .chat-components').length === 2);
      await page.reload();
      await page.waitForSelector('#cc-fields[data-init]');
      await page.evaluate((s) => {
        const g = globalThis as any;
        g.__run = g.df$.shadcn.chatScript.run('#chat', s, { persist: 'e2e-chat' });
      }, SCRIPT);
      await page.waitForFunction(() => document.querySelectorAll('#chat .chat-components[data-init]').length === 2);
      assert.deepEqual(await rows(), [
        'bot: Hi!',
        'bot: What do you need?',
        'bot: [card chat-card-1]',
        'you: An order',
        'bot: Which size?',
        'bot: [card chat-card-2]',
      ]);
      assert.deepEqual(await page.$$eval('#chat .chat-components', (l: any[]) => l.map((c) => c.dataset.stateName)), [
        'answered',
        'default',
      ]);
      assert.equal(await page.evaluate(() => (globalThis as any).__run.state().waiting), 'components');
      await page.fill('#chat-card-2 input[type="number"]', '3');
      await page.click('#chat-card-2 [data-chat-action="ok"]');
      await page.waitForFunction(() => (globalThis as any).__run.state().waiting === 'end');
      assert.equal((await rows()).at(-1), 'bot: Ordered 3.');
      await page.evaluate(() => localStorage.removeItem('e2e-chat'));
    },
  );

  await check(
    "chatScript.validate: a missing start, a node leading nowhere or to no node, a bad pattern, a card's own problems",
    async () => {
      const problems = await page.evaluate(() =>
        (globalThis as any).df$.shadcn.chatScript.validate({
          version: 1,
          start: 'nope',
          nodes: {
            a: { say: 'x', next: 'b' },
            c: { say: 'y' },
            d: { input: 'n', match: [{ pattern: '(', goto: 'a' }], next: 'a' },
            e: { ask: { version: 1, body: [{ type: 'select', name: 's' }] }, next: 'a' },
          },
        }),
      );
      assert.deepEqual(
        problems.map((p: any) => `${p.path}: ${p.message}`),
        [
          'start: no node "nope"',
          'nodes.a: leads to "b", which does not exist',
          'nodes.c: leads nowhere: next, branches or end',
          'nodes.d.match[0].pattern: not a regular expression',
          'nodes.e.ask.body[0].options: a list of choices',
        ],
      );
    },
  );

  await check(
    'chatScript.create: hooks receive every turn; a state() resumes without saying anything again',
    async () => {
      const r = await page.evaluate(async (s) => {
        const log: string[] = [];
        const hooks = {
          say: (t: string) => log.push('say ' + t),
          ask: (spec: any) => log.push('ask ' + spec.id),
          user: (t: string) => log.push('user ' + t),
        };
        const cs = (globalThis as any).df$.shadcn.chatScript;
        const run = cs.create(s, hooks);
        await run.start();
        await run.answer({ id: 'topic', action: 'talk', answers: {}, reply: 'Just talk', summary: 'Just talk' });
        const saved = run.state();
        const resumed = cs.create(s, hooks, saved);
        await resumed.start();
        const before = log.length;
        await resumed.reply('Linus');
        return { log, before, waiting: resumed.state().waiting, answers: resumed.state().answers };
      }, SCRIPT);
      assert.deepEqual(r.log, [
        'say Hi!',
        'say What do you need?',
        'ask topic',
        'user Just talk',
        'say Your name?',
        'user Linus',
        'say Hello **Linus**.',
      ]);
      assert.equal(r.before, 5, 'resuming said nothing again');
      assert.deepEqual([r.waiting, r.answers], ['end', { topic: 'talk', name: 'Linus' }]);
    },
  );

  // LAST (AGENTS.md "State API" → render): the contract reloads the page
  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await assertRenderContract(page, '.chat-components[id]', ['default', 'answered', 'cancelled'], {
      runtimeAttrs: ['data-invalid'],
      runtimeOwned: '.chat-components-body',
    });
  });
} finally {
  await browser.close();
  server.stop?.();
}

if (failures) {
  console.error(`\nchat-components.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('chat-components.e2e: all checks passed');
