import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { startServer } from '../server.ts';
import { offlineJsdelivr, offlineModels } from '../lib/vendor-offline.ts';
import { chooseLanguage, renderedLanguage, translationGaps } from '../lib/translation.ts';
import docs from '../../../src/documentation/runtime/api-docs/rpc.docs.json' with { type: 'json' };

/**
 * Why: the API Documentation scaffold promises a reference you can work in: every guide, resource and endpoint is a
 * route, the Try it form drives the code samples and a sandbox that answers like the API, the palette ranks hits
 * with defuss-search in the language shown - BM25 at once, fused with the ColBERT model once it has loaded in the
 * background (served offline from .cache/models) - and the frame and the reference switch to German. This drives the
 * generated full-screen page (application/app-api-docs.html, built from the scaffold page's example fence) with the
 * pinned vendors served offline. The defuss-rpc reference is written from rpc.docs.json (defuss-rpc schema's output):
 * its Call it form answers from the same API in the page, and from the example server (runtime/api-docs/server.ts),
 * which this test starts; every page also exists as Markdown and JSON under api-docs/.
 */
const PAGE = '/dist/documentation/application/app-api-docs.html';
type DocMethod = { description?: string; params?: { name: string; description?: string }[] };
const method = (ns: string, m: string): DocMethod =>
  (docs as unknown as { className?: string; methods: Record<string, DocMethod> }[]).find((e) => e.className === ns)!.methods[m]!;
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
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const vendors = await offlineJsdelivr(page);
  const modelRequests = await offlineModels(page);
  // the model waits until the BM25 checks are done: a page route runs before the context's offline one
  let releaseModel = () => {};
  const modelHeld = new Promise<void>((resolve) => (releaseModel = resolve));
  await page.route(/huggingface\.co/, async (route) => {
    await modelHeld;
    await route.fallback();
  });
  // Shiki (esm.sh) stays offline: the code is plain text, the checks read its words
  await page.route('https://esm.sh/**', (r) => r.fulfill({ status: 404, body: 'offline' }));
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${server.url}${PAGE}`);
  await page.waitForFunction(() => document.querySelector('[data-ad]')?.hasAttribute('data-route'), undefined, { timeout: 10_000 });
  const shownView = () => page.$$eval('[data-ad-view]', (v) => v.filter((x) => !(x as HTMLElement).hidden).map((x) => x.getAttribute('data-ad-view')));
  const route = () => page.getAttribute('[data-ad]', 'data-route');
  const sample = (lang: string) => page.textContent(`[data-ad-sample="${lang}"]`);

  await check('opens on the introduction: the navigation lists the guides and every endpoint', async () => {
    assert.deepEqual(await shownView(), ['guide']);
    assert.equal(await page.textContent('[data-ad-guide-title]'), 'Introduction');
    assert.equal(await page.$$eval('[data-ad-nav] a', (a) => a.length), 5 + 4 + 13 + 1 + 4 + 9, 'the REST pages, then the defuss-rpc overview, namespaces and methods');
    assert.equal(await page.$$eval('[data-ad-home-cards] .card', (c) => c.length), 4 + 1, 'the resources and the defuss-rpc reference');
    assert.equal(await page.getAttribute('[data-ad-nav] a[href="#/"]', 'aria-current'), 'page');
  });

  await check('a guide, a resource and an endpoint are routes; the pager walks the order', async () => {
    await page.click('[data-ad-nav] a[href="#/guides/errors"]');
    assert.equal(await page.textContent('[data-ad-guide-title]'), 'Errors');
    assert.equal(await page.textContent('[data-ad-view="guide"] [data-ad-pager] a[rel="next"] strong'), 'Pagination →');
    await page.click('[data-ad-nav] a[href="#/ref/tasks"]');
    assert.deepEqual(await shownView(), ['resource']);
    assert.equal(await page.textContent('[data-ad-res-object]'), 'The task object');
    assert.equal(await page.$$eval('[data-ad-res-ops] li', (l) => l.length), 5);
    assert.ok((await page.textContent('[data-ad-res-json]'))!.includes('"id": "t_105"'));
    await page.click('[data-ad-res-ops] a[href="#/ref/tasks/create"]');
    assert.deepEqual(await shownView(), ['endpoint']);
    assert.equal(page.url().split('#')[1], '/ref/tasks/create');
    assert.equal(await page.textContent('[data-ad-ep-title]'), 'Create a task');
    assert.equal(await page.textContent('[data-ad-ep-method]'), 'POST');
    assert.equal(await page.textContent('[data-ad-ep-path]'), 'https://api.acme.example/v4/tasks');
    assert.equal(await page.getAttribute('[data-ad-nav] a[href="#/ref/tasks/create"]', 'aria-current'), 'page');
    await page.goBack();
    assert.equal(await route(), '#/ref/tasks');
    await page.goForward();
    assert.equal(await route(), '#/ref/tasks/create');
  });

  await check('an endpoint documents its parameters and status codes', async () => {
    assert.deepEqual(await page.$$eval('[data-ad-ep-params] [data-param]', (p) => p.map((x) => x.getAttribute('data-param'))), ['workspace', 'title', 'assignee', 'due_on', 'status']);
    assert.equal(await page.textContent('[data-param="title"] .ad-required'), 'required');
    assert.ok((await page.textContent('[data-param="status"] .ad-enum'))!.includes('todo, doing, done'));
    assert.deepEqual(await page.$$eval('[data-ad-ep-responses] .ad-status', (s) => s.map((x) => x.textContent)), ['201', '400', '401']);
  });

  await check('the samples follow the form: curl, JavaScript and Python', async () => {
    assert.ok((await sample('curl'))!.includes(`curl -X POST 'https://api.acme.example/v4/tasks'`));
    assert.ok((await sample('curl'))!.includes('Bearer YOUR_API_KEY'));
    await page.fill('#ad-try-title', 'Plan the launch');
    assert.ok((await sample('curl'))!.includes('"title":"Plan the launch"'));
    assert.ok((await sample('js'))!.includes(`"title": "Plan the launch"`));
    assert.ok((await sample('python'))!.includes('requests.post('));
    await page.click('[data-ad-samples] label:has(input[value="python"])');
    assert.equal(await page.$eval('[data-tab="python"]', (e) => getComputedStyle(e).display), 'block');
    assert.equal(await page.$eval('[data-tab="curl"]', (e) => getComputedStyle(e).display), 'none');
  });

  await check('the sandbox: 401 without a key, then 201 with one, and the next list sees the new task', async () => {
    await page.click('[data-ad-try] button[type="submit"]');
    assert.equal(await page.textContent('[data-ad-res-status]'), '401');
    assert.ok((await page.textContent('[data-ad-res-body]'))!.includes('authentication_error'));
    await page.click('[data-ad-authorize]');
    await page.click('#ad-key button[value="save"]');
    // the dialog's close event comes a task later
    await page.waitForFunction(() => !(document.querySelector('[data-ad-key-on]') as HTMLElement).hidden);
    assert.ok((await sample('python'))!.includes('Bearer acme_test_51Nq7Kx2aLpVd9'));
    await page.click('[data-ad-try] button[type="submit"]');
    assert.equal(await page.textContent('[data-ad-res-status]'), '201');
    const made = JSON.parse((await page.textContent('[data-ad-res-body]'))!);
    assert.deepEqual([made.id, made.title, made.status], ['t_106', 'Plan the launch', 'todo']);
    await page.fill('#ad-try-title', '');
    await page.click('[data-ad-try] button[type="submit"]');
    assert.equal(await page.textContent('[data-ad-res-status]'), '400');
    assert.equal(JSON.parse((await page.textContent('[data-ad-res-body]'))!).error.param, 'title');
    await page.click('[data-ad-nav] a[href="#/ref/tasks/list"]');
    await page.click('[data-ad-try] button[type="submit"]');
    const list = JSON.parse((await page.textContent('[data-ad-res-body]'))!);
    assert.deepEqual([list.data.map((t: { id: string }) => t.id), list.has_more, list.next_cursor], [['t_106', 't_105', 't_104'], true, 't_104']);
    await page.fill('#ad-try-cursor', 't_104');
    await page.click('[data-ad-try] button[type="submit"]');
    assert.deepEqual(JSON.parse((await page.textContent('[data-ad-res-body]'))!).data.map((t: { id: string }) => t.id), ['t_103', 't_102', 't_101']);
    assert.ok((await sample('curl'))!.includes('?workspace=ws_acme&limit=3&cursor=t_104'));
    assert.ok((await page.textContent('[data-ad-res-time]'))!.includes('X-RateLimit-Remaining: 96'));
    await page.fill('#ad-try-cursor', 't_999');
    await page.click('[data-ad-try] button[type="submit"]');
    assert.equal(await page.textContent('[data-ad-res-status]'), '400');
    assert.equal(JSON.parse((await page.textContent('[data-ad-res-body]'))!).error.param, 'cursor');
  });

  await check('a webhook needs HTTPS; a quote in a value keeps the curl sample a valid shell command', async () => {
    await page.click('[data-ad-nav] a[href="#/ref/webhooks/create"]');
    await page.fill('#ad-try-url', 'http://hooks.acme.example/x');
    await page.click('[data-ad-try] button[type="submit"]');
    assert.equal(JSON.parse((await page.textContent('[data-ad-res-body]'))!).error.param, 'url');
    await page.click('[data-ad-nav] a[href="#/ref/docs/create"]');
    await page.fill('#ad-try-title', "Ana's notes");
    assert.ok((await sample('curl'))!.includes(`"title":"Ana'\\''s notes"`), (await sample('curl'))!);
  });

  await check('a retrieve of a deleted task answers 404; Reset brings the examples back', async () => {
    await page.click('[data-ad-nav] a[href="#/ref/tasks/delete"]');
    await page.click('[data-ad-try] button[type="submit"]');
    assert.equal(JSON.parse((await page.textContent('[data-ad-res-body]'))!).deleted, true);
    await page.click('[data-ad-nav] a[href="#/ref/tasks/retrieve"]');
    await page.fill('#ad-try-id', 't_103');
    await page.click('[data-ad-try] button[type="submit"]');
    assert.equal(await page.textContent('[data-ad-res-status]'), '404');
    await page.click('[data-ad-try] button[type="reset"]');
    assert.equal(await page.inputValue('#ad-try-id'), 't_101');
  });

  await check('the version select calls /v3 and shows its sunset note', async () => {
    await page.selectOption('[data-ad-version]', 'v3');
    assert.equal(await page.$eval('[data-ad-v3]', (e) => e.checkVisibility()), true);
    assert.ok((await sample('curl'))!.includes('https://api.acme.example/v3/tasks/t_101'));
    await page.selectOption('[data-ad-version]', 'v4');
    assert.equal(await page.$eval('[data-ad-v3]', (e) => e.checkVisibility()), false);
  });

  const status = () => page.textContent('[data-ad-find-status]');
  const hrefs = () => page.$$eval('[data-ad-hits] .command-item', (a) => a.map((x) => x.getAttribute('href')));
  const ask = async (text: string) => {
    await page.fill('[data-ad-query]', '');
    await page.fill('[data-ad-query]', text);
    await page.waitForFunction(() => /results in|Treffer in/.test(document.querySelector('[data-ad-find-status]')!.textContent!));
    return hrefs();
  };

  await check('the palette ranks with defuss-search (loaded offline) and a hit opens its page', async () => {
    await page.waitForFunction(() => document.querySelector('[data-ad]')!.getAttribute('data-search') === 'ready', undefined, { timeout: 10_000 });
    assert.ok(vendors.some((u) => u.includes('defuss-search@0.5.0/dist/strategies.js')));
    await page.keyboard.press('ControlOrMeta+k');
    await page.waitForFunction(() => (document.getElementById('ad-find') as HTMLDialogElement).open);
    await page.waitForFunction(() => document.querySelector('[data-ad]')!.getAttribute('data-semantic') === 'loading');
    // while the model loads, the keywords answer
    await page.waitForFunction(() => /search by meaning loads in the background/.test(document.querySelector('[data-ad-find-status]')!.textContent!));
    assert.deepEqual(await ask('how do I log in'), [], 'no keyword of the reference matches');
    assert.match((await status())!, /0 results in .* BM25$/);
    const first = await ask('webhook secret');
    assert.ok(first.length > 0 && first[0]!.startsWith('#/ref/webhooks'), first.join(' '));
    assert.ok((await ask('cursr')).includes('#/guides/pagination'), 'fuzzy: cursr finds the cursor');
    // the REST endpoint and the defuss-rpc method both invite; Enter opens the first hit
    const invite = await ask('invite');
    assert.ok(['#/ref/members/invite', '#/rpc/Members/invite'].includes(invite[0]!), invite.join(' '));
    await page.keyboard.press('Enter');
    await page.waitForFunction((h) => document.querySelector('[data-ad]')!.getAttribute('data-route') === h, invite[0]);
    assert.equal(await page.$eval('#ad-find', (d) => (d as HTMLDialogElement).open), false);
  });

  await check('once the model has loaded in the background, the palette searches by meaning too', async () => {
    releaseModel();
    await page.waitForFunction(() => document.querySelector('[data-ad]')!.getAttribute('data-semantic') === 'semantic', undefined, { timeout: 60_000 });
    assert.deepEqual(
      [...new Set(modelRequests.map((u) => u.split('/').pop()))].sort(),
      ['model_q8.onnx.br', 'runtime.json.br', 'tokenizer.json.br', 'tokenizer_config.json.br'],
      'the four pinned files of Winzling-reranker',
    );
    assert.ok(vendors.some((u) => u.includes('defuss-vectorsearch@0.4.0/dist/onnx.mjs')));
    await page.keyboard.press('ControlOrMeta+k');
    await page.waitForFunction(() => (document.getElementById('ad-find') as HTMLDialogElement).open);
    await page.waitForFunction(() => /Keywords and meaning/.test(document.querySelector('[data-ad-find-status]')!.textContent!));
    assert.ok((await ask('how do I log in')).slice(0, 3).includes('#/guides/authentication'), (await hrefs()).join(' '));
    assert.match((await status())!, /BM25 \+ ColBERT$/);
    assert.ok((await ask('get rid of a hook')).slice(0, 3).includes('#/ref/webhooks/delete'), (await hrefs()).join(' '));
    await page.keyboard.press('Escape');
  });

  await check('a reload takes the model from the Cache API, not from the network', async () => {
    const before = modelRequests.length;
    await page.reload();
    await page.waitForFunction(() => document.querySelector('[data-ad]')!.getAttribute('data-semantic') === 'semantic', undefined, { timeout: 60_000 });
    assert.equal(modelRequests.length, before);
  });

  await check('narrow: the code goes under the page, the navigation is a drawer', async () => {
    try {
    await page.setViewportSize({ width: 600, height: 900 });
    // the drawer's visibility moves with its slide (0.2 s)
    await page.waitForTimeout(300);
    assert.equal(await page.$eval('.ad-side', (e) => getComputedStyle(e).visibility), 'hidden');
    await page.click('[data-ad-menu]');
    await page.waitForTimeout(300);
    assert.equal(await page.$eval('.ad-side', (e) => getComputedStyle(e).visibility), 'visible');
    await page.click('[data-ad-nav] a[href="#/guides/authentication"]');
    assert.equal(await page.getAttribute('[data-ad-menu]', 'aria-expanded'), 'false');
    assert.equal(await page.textContent('[data-ad-guide-title]'), 'Authentication');
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.equal(scroll, 0, 'no horizontal page scroll');
    } finally {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(300);
    }
  });

  await check('dark mode: the Swap sets html.dark', async () => {
    await page.click('label.swap:has([data-ad-mode])');
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), true);
    await page.click('label.swap:has([data-ad-mode])');
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), false);
  });

  const goto = async (hash: string) => {
    await page.click(`[data-ad-nav] a[href="${hash}"]`);
    await page.waitForFunction((h) => document.querySelector('[data-ad]')!.getAttribute('data-route') === h, hash);
  };
  const answer = () =>
    page.evaluate(
      () =>
        new Promise<{ status: number; target: string; frames: number }>((resolve, reject) => {
          setTimeout(() => reject(new Error('no ad-rpc-answer')), 10_000);
          document.querySelector('[data-ad]')!.addEventListener('ad-rpc-answer', (e) => resolve((e as CustomEvent).detail), { once: true });
        }),
    );
  const send = async () => {
    const answered = answer();
    await page.click('[data-ad-rpc-try] button[type="submit"]');
    return answered;
  };
  const rows = () => page.$$eval('[data-ad-rpc-result] [role="treeitem"]', (r) => r.map((x) => x.getAttribute('aria-label')));

  await check('defuss-rpc: the overview, a namespace and a method are routes written from rpc.docs.json', async () => {
    await goto('#/rpc');
    assert.equal(await page.textContent('[data-ad-rn-title]'), 'defuss-rpc API');
    assert.equal(await page.$$eval('[data-ad-rn-cards] .card', (c) => c.length), 4);
    assert.equal(await page.$$eval('[data-ad-nav] a[href^="#/rpc/"]', (a) => a.length), 4 + 9, 'every namespace and method in the navigation');
    await goto('#/rpc/Tasks');
    assert.match((await page.textContent('[data-ad-rn-lead]'))!, /fresh instance for every call/);
    assert.equal(await page.$$eval('[data-ad-rn-ops] li', (l) => l.length), 5);
    await goto('#/rpc/Tasks/create');
    assert.equal(await page.textContent('[data-ad-rm-title]'), 'Tasks.create');
    assert.equal(await page.textContent('[data-ad-rm-signature]'), 'async create(input: NewTask): Promise<Task>');
    assert.equal(await page.textContent('[data-ad-rm-docs] [data-param="input"] p'), 'Its title and, optionally, who does it, when it is due and its labels.');
    assert.ok((await page.textContent('[data-ad-rm-docs]'))!.includes('RpcError when the title is empty'), 'the @throws tag');
    assert.match((await page.textContent('[data-ad-rsample="ts"]'))!, /await rpc\.Tasks\.create\(\{"title":"Write the release notes"\}\)/);
  });

  await check('every page exists as Markdown and JSON: the links resolve, the files say what the page says', async () => {
    const [md, json] = await page.$$eval('[data-ad-view="rpc-method"] [data-ad-doc-links] a', (a) => a.map((x) => (x as HTMLAnchorElement).href));
    const markdown = await (await fetch(md!)).text();
    assert.ok(markdown.startsWith('# Tasks.create\n'), markdown.slice(0, 40));
    assert.ok(markdown.includes('| `input` | `NewTask` | yes |'), 'the parameter table');
    const data = await (await fetch(json!)).json();
    assert.equal(data.kind, 'method');
    assert.equal(data.signature, 'async create(input: NewTask): Promise<Task>');
    assert.deepEqual(data.call, { endpoint: '/rpc', body: { className: 'Tasks', methodName: 'create', args: [{ title: 'Write the release notes' }] } });
    const base = new URL('../api-docs/', page.url()).href;
    const index = await (await fetch(base + 'index.json')).json();
    assert.equal(index.length, 5 + 4 + 13 + 1 + 4 + 9, 'every guide, resource, endpoint, the RPC overview, namespace and method');
    for (const entry of index) assert.equal((await fetch(base + entry.markdown)).status, 200, entry.markdown);
    const llms = await (await fetch(base + 'llms.txt')).text();
    assert.ok(llms.startsWith('# Acme API\n') && llms.includes('- [Tasks.create](rpc/Tasks/create.md)'), 'llms.txt lists the pages');
    // a REST page too
    await goto('#/ref/tasks/create');
    const rest = await page.$eval('[data-ad-view="endpoint"] [data-ad-doc-links] a', (a) => (a as HTMLAnchorElement).href);
    assert.ok((await (await fetch(rest)).text()).includes('POST https://api.acme.example/v4/'));
  });

  await check('Call it in the page: a value, a refused call, an argument in the Property Tree, Reset', async () => {
    await goto('#/rpc/Tasks/create');
    assert.equal((await send()).status, 200);
    assert.deepEqual((await rows()).slice(0, 4), ['root: {5 keys}', 'id: "t_105"', 'title: "Write the release notes"', 'status: "todo"']);
    await goto('#/rpc/Members/invite');
    await page.fill('#ad-rpc-arg-email', 'not an address');
    assert.match((await page.textContent('[data-ad-rsample="ts"]'))!, /rpc\.Members\.invite\("not an address"\)/, 'the samples follow');
    assert.equal((await send()).status, 500);
    assert.equal(await page.textContent('[data-ad-rpc-error]'), 'Error calling invite: Not an email address: not an address');
    await page.click('[data-ad-rpc-try] button[type="reset"]');
    assert.equal(await page.inputValue('#ad-rpc-arg-email'), 'lin@acme.example');
    // an object argument is a Property Tree; Tasks.list with an empty filter lists the four seeded tasks
    await goto('#/rpc/Tasks/list');
    assert.equal(await page.$$eval('[data-ad-rpc-fields] .property-tree', (t) => t.length), 1);
    assert.equal((await send()).status, 200);
    assert.equal((await rows())[0], 'root: [4 items]');
    // the answer grows as its rows open (the maintainer 2026-11-22: an opened answer scrolled inside five rows),
    // up to 14 rows; the aside never runs taller than the app below its bar, so the answer stays in reach
    const answerHeight = () => page.$eval('[data-ad-rpc-result]', (t) => t.getBoundingClientRect().height);
    const closed = await answerHeight();
    for (const i of [1, 2]) await page.click(`[data-ad-rpc-result] [role="treeitem"] >> nth=${i} >> .property-tree-toggle`);
    await page.waitForFunction((h) => document.querySelector('[data-ad-rpc-result]')!.getBoundingClientRect().height > h + 100, closed);
    assert.equal(await page.$eval('[data-ad-view="rpc-method"] .ad-aside', (a) => getComputedStyle(a).overflowY), 'auto');
    // the signature and the examples are TypeScript listings, painted like the samples when Shiki loads
    assert.equal(await page.getAttribute('[data-ad-rm-signature]', 'data-lang'), 'ts');
    assert.ok((await page.$$('[data-ad-rm-example][data-lang="ts"]')).length > 0);
    // the RPC tag's text sits in its middle
    assert.equal(await page.$eval('[data-ad-view="rpc-method"] .ad-method', (t) => getComputedStyle(t).alignItems), 'center');
  });

  await check('Call it against the example server: its schema first, then a call and a stream; a server that is gone says so', async () => {
    const server = spawn('bun', ['src/documentation/runtime/api-docs/server.ts'], { env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'inherit'] });
    try {
      const url = await new Promise<string>((resolve, reject) => {
        setTimeout(() => reject(new Error('the example server did not start')), 15_000);
        server.stdout!.on('data', (d) => {
          const m = /url=(\S+)/.exec(String(d));
          if (m) resolve(m[1]!);
        });
      });
      // the server's own schema carries the documentation the reference is written from (defuss-rpc 3 `docs`)
      const served = (await (await fetch(`${url}/rpc/schema`, { method: 'POST' })).json()) as {
        className?: string;
        methods: Record<string, { description?: string; params?: { name: string; description?: string }[] }>;
      }[];
      const create = served.find((ns) => ns.className === 'Tasks')!.methods.create!;
      assert.equal(create.description, method('Tasks', 'create').description);
      assert.equal(create.params?.[0]?.description, method('Tasks', 'create').params?.[0]?.description);
      await goto('#/rpc/Tasks/get');
      await page.selectOption('[data-ad-rpc-target]', 'server');
      await page.fill('[data-ad-rpc-url]', url);
      await page.dispatchEvent('[data-ad-rpc-url]', 'change');
      await page.waitForFunction(() => document.querySelector('[data-ad]')!.getAttribute('data-rpc-server') === 'ok');
      assert.equal(await page.textContent('[data-ad-rpc-conn]'), `${url} serves 4 namespaces`);
      assert.ok((await page.textContent('[data-ad-rsample="curl"]'))!.startsWith(`curl ${url}/rpc`), 'the samples call the server');
      assert.deepEqual(await send(), { status: 200, target: 'server', frames: 0 });
      assert.ok((await rows()).includes('title: "Draft the Q1 roadmap"'), (await rows()).join(' '));
      await goto('#/rpc/Activity/recent');
      assert.deepEqual(await send(), { status: 200, target: 'server', frames: 4 });
      assert.equal(await page.$$eval('[data-ad-rpc-frames] li', (l) => l.length), 4);
      assert.deepEqual(await rows(), ['root: 4']);
      server.kill('SIGTERM');
      await new Promise((resolve) => server.once('exit', resolve));
      await page.fill('[data-ad-rpc-url]', url.replace(/:\d+$/, ':9'));
      await page.dispatchEvent('[data-ad-rpc-url]', 'change');
      await page.waitForFunction(() => document.querySelector('[data-ad]')!.getAttribute('data-rpc-server') === 'failed');
      assert.match((await page.textContent('[data-ad-rpc-conn]'))!, /does not answer/);
      await page.selectOption('[data-ad-rpc-target]', 'page');
    } finally {
      server.kill('SIGTERM');
    }
  });

  await check('German: the frame and the reference translate, and the search uses the German index', async () => {
    assert.deepEqual(await translationGaps(page, '[data-ad]'), [], 'every target and attribute in English and German');
    assert.equal(await renderedLanguage(page, '[data-ad]'), 'en');
    await page.click('[data-ad-nav] a[href="#/ref/tasks/create"]');
    await chooseLanguage(page, 'de');
    assert.equal(await renderedLanguage(page, '[data-ad]'), 'de');
    assert.equal(await page.textContent('[data-ad-ep-title]'), 'Aufgabe anlegen');
    assert.equal(await page.textContent('[data-param="title"] .ad-required'), 'Pflicht');
    assert.equal(await page.textContent('[data-i18n-target="h-try"]'), 'Ausprobieren');
    assert.equal(await page.textContent('[data-ad-nav] a[href="#/ref/docs/create"] span:last-child'), 'Dokument anlegen');
    await page.keyboard.press('ControlOrMeta+k');
    await page.waitForFunction(() => (document.getElementById('ad-find') as HTMLDialogElement).open);
    await page.fill('[data-ad-query]', 'Einladung');
    await page.waitForFunction(() => document.querySelector('[data-ad-hits] .command-item')?.getAttribute('href') === '#/ref/members/invite');
    assert.match((await status())!, /Treffer in .* BM25 \+ ColBERT$/);
    await page.keyboard.press('Escape');
  });

  await check('no page errors', async () => {
    assert.deepEqual(errors, []);
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`scaffold-api-docs.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('scaffold-api-docs.e2e: all checks passed');
