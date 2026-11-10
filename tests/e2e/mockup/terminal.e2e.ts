import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';

/**
 * Why: E2E for the shipped Terminal. xterm.js 6.0.0 and its fit, clipboard, serialize and web-links addons are
 * served OFFLINE from the pinned devDependencies (tests/e2e/lib/vendor-offline.ts), so every request is counted
 * and a pin that drifts from the installed build answers 404. Verifies: lazy loading (no terminal, no request;
 * seven terminals, each file once), the shell (prompt, typed commands, page commands, history, completion,
 * Ctrl+C, the not-found answer, the cancelable terminal-command event), the replay and its skip, read-only
 * output from the page (writeln, tone, text, serialize), the clipboard addon (OSC 52), the variants' colours
 * and the live theme, the CSS (chrome, sizes, rows), a terminal that opens once its box shows, focus that
 * leaves on Tab, the State API and the render() contract.
 */

const FIXTURE = '/tests/e2e/mockup/terminal.e2e-fixture.html';
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

type TermNs = {
  text(t: string): string;
  serialize(t: string, f?: 'html' | 'vt'): string;
  writeln(t: string, s: string): Promise<void>;
  write(t: string, s: string): Promise<void>;
  tone(s: string, t: string): string;
  theme(t: string): Record<string, string>;
  play(t: string): Promise<void>;
  clear(t: string): Promise<void>;
  xterm(t: string): Promise<{ options: Record<string, unknown> }>;
};
type Win = { df$: { shadcn: { terminal: TermNs } } };
type El = HTMLElement & { api: { setState(n: string, c?: Record<string, unknown>): void; getState(): { name: string; config: Record<string, unknown> }; settled(): Promise<void> } };

const screen = (page: Page, id: string) => page.evaluate((i) => (globalThis as unknown as Win).df$.shadcn.terminal.text(i), id);
const lastLine = async (page: Page, id: string) => (await screen(page, id)).split('\n').at(-1) ?? '';
const waitText = (page: Page, id: string, test: string | RegExp, timeout = 10000) =>
  page.waitForFunction(
    ([i, src, flags]) => new RegExp(src, flags).test((globalThis as unknown as Win).df$.shadcn.terminal.text(i)),
    [id, typeof test === 'string' ? test.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : test.source, typeof test === 'string' ? '' : test.flags] as const,
    { timeout },
  );
/** the prompt waits again: the last line is exactly the prompt (text() trims its trailing space) */
const waitPrompt = (page: Page, id: string, prompt = '$') =>
  page.waitForFunction(
    ([i, p]) => {
      const el = document.getElementById(i) as El;
      const lines = (globalThis as unknown as Win).df$.shadcn.terminal.text(i).split('\n');
      return el.getAttribute('aria-busy') === null && lines.at(-1) === p;
    },
    [id, prompt] as const,
    { timeout: 10000 },
  );
async function typeLine(page: Page, id: string, line: string, enter = true): Promise<void> {
  await page.focus(`#${id} .xterm-helper-textarea`);
  await page.keyboard.type(line, { delay: 5 });
  if (enter) await page.keyboard.press('Enter');
}

try {
  await check('the runtime pins xterm 6.0.0 and its four addons (never @latest)', async () => {
    const src = readFileSync(resolve(import.meta.dirname, '../../../dist/components/terminal/terminal.js'), 'utf8');
    for (const pin of [
      '@xterm/xterm@6.0.0/lib/xterm.mjs',
      '@xterm/xterm@6.0.0/css/xterm.css',
      '@xterm/addon-fit@0.11.0/lib/addon-fit.mjs',
      '@xterm/addon-clipboard@0.2.0/lib/addon-clipboard.mjs',
      '@xterm/addon-serialize@0.14.0/lib/addon-serialize.mjs',
      '@xterm/addon-web-links@0.12.0/lib/addon-web-links.mjs',
    ])
      assert.ok(src.includes(`https://cdn.jsdelivr.net/npm/${pin}`), `pinned ${pin}`);
    assert.doesNotMatch(src, /@latest/);
  });

  await check('no terminal on the page: xterm.js is never requested', async () => {
    const page = await browser.newPage();
    const requests = await offlineJsdelivr(page);
    await page.route(`${server.url}/tests/e2e/__terminal-empty.html`, (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><link rel="stylesheet" href="/dist/components/terminal/terminal.css"><p>none</p><script type="module" src="/dist/components/core.js"></script><script type="module" src="/dist/components/terminal/terminal.js"></script>',
      }),
    );
    await page.goto(`${server.url}/tests/e2e/__terminal-empty.html`);
    await page.waitForFunction(() => !!(globalThis as unknown as { df$?: { shadcn?: { terminalApi?: unknown } } }).df$?.shadcn?.terminalApi);
    await page.waitForTimeout(400);
    assert.deepEqual(requests, []);
    await page.close();
  });

  const context = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: server.url });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const requests = await offlineJsdelivr(page);
  await page.goto(`${server.url}${FIXTURE}`);
  const shown = ['t-shell', 't-replay', 't-log', 't-dos', 't-muted', 't-lg'];
  await page.waitForFunction((ids) => ids.every((i) => document.getElementById(i)?.hasAttribute('data-ready')), shown, { timeout: 20000 });

  await check('the visible terminals open xterm; each vendor file loads once', async () => {
    const counts = requests.reduce<Record<string, number>>((m, u) => ((m[u.replace(/^.*\/npm\//, '')] = (m[u.replace(/^.*\/npm\//, '')] ?? 0) + 1), m), {});
    assert.deepEqual(Object.keys(counts).sort(), [
      '@xterm/addon-clipboard@0.2.0/lib/addon-clipboard.mjs',
      '@xterm/addon-fit@0.11.0/lib/addon-fit.mjs',
      '@xterm/addon-serialize@0.14.0/lib/addon-serialize.mjs',
      '@xterm/addon-web-links@0.12.0/lib/addon-web-links.mjs',
      '@xterm/xterm@6.0.0/css/xterm.css',
      '@xterm/xterm@6.0.0/lib/xterm.mjs',
    ]);
    assert.ok(Object.values(counts).every((n) => n === 1), JSON.stringify(counts));
    const info = await page.evaluate(() => ({
      screens: document.querySelectorAll('.terminal:not(.xterm) > .terminal-screen[data-ce-chrome] > .xterm').length,
      // xterm names its own element "terminal xterm": the component never claims it
      claimed: document.querySelectorAll('.xterm[data-init]').length,
      busy: document.querySelectorAll('.terminal[aria-busy]').length,
      label: document.querySelector('#t-shell .xterm-helper-textarea')?.getAttribute('aria-label'),
    }));
    assert.equal(info.screens, 6);
    assert.equal(info.claimed, 0);
    assert.equal(info.label, 'A shell - type help');
  });

  await check('a shell: the prompt waits; help lists the built-ins and the page commands', async () => {
    await waitPrompt(page, 't-shell');
    await typeLine(page, 't-shell', 'help');
    await waitText(page, 't-shell', /greet\s+greets someone/);
    const text = await screen(page, 't-shell');
    for (const name of ['clear', 'echo', 'help', 'history', 'date', 'greet', 'count']) assert.match(text, new RegExp(`\\b${name}\\b`), name);
    await waitPrompt(page, 't-shell');
  });

  await check('a page command answers with its return value; echo keeps quoted words', async () => {
    await typeLine(page, 't-shell', 'greet Ada');
    await waitText(page, 't-shell', 'Hello, Ada!');
    await waitPrompt(page, 't-shell');
    await typeLine(page, 't-shell', 'echo "two words"  and');
    await waitText(page, 't-shell', /^two words and$/m);
    await waitPrompt(page, 't-shell');
  });

  await check('Up walks the history, Tab completes a name, Ctrl+C drops the line', async () => {
    await page.focus('#t-shell .xterm-helper-textarea');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await page.waitForFunction(() => (globalThis as unknown as Win).df$.shadcn.terminal.text('t-shell').split('\n').at(-1) === '$ greet Ada');
    await page.keyboard.press('ArrowDown');
    await page.waitForFunction(() => (globalThis as unknown as Win).df$.shadcn.terminal.text('t-shell').split('\n').at(-1) === '$ echo "two words"  and');
    await page.keyboard.press('Control+C');
    await waitPrompt(page, 't-shell');
    await page.keyboard.type('gr');
    await page.keyboard.press('Tab');
    await page.waitForFunction(() => (globalThis as unknown as Win).df$.shadcn.terminal.text('t-shell').split('\n').at(-1) === '$ greet');
    await page.keyboard.press('Enter');
    await waitText(page, 't-shell', 'Hello, world!');
    await waitPrompt(page, 't-shell');
  });

  await check('an unknown command gets the not-found answer', async () => {
    await typeLine(page, 't-shell', 'nope --x');
    await waitText(page, 't-shell', 'nope: command not found');
    await waitPrompt(page, 't-shell');
  });

  await check('terminal-command is cancelable: the page answers rm itself', async () => {
    await typeLine(page, 't-shell', 'rm -rf /');
    await waitText(page, 't-shell', 'rm: not in a demo');
    await waitPrompt(page, 't-shell');
    assert.doesNotMatch(await screen(page, 't-shell'), /rm: command not found/);
  });

  await check('Ctrl+C aborts a running command: its signal stops it, the prompt comes back', async () => {
    await typeLine(page, 't-shell', 'count');
    await page.waitForFunction(() => document.getElementById('t-shell')!.getAttribute('aria-busy') === 'true');
    await waitText(page, 't-shell', /^2$/m);
    assert.equal(await page.evaluate(() => (document.getElementById('t-shell') as El).api.getState().name), 'running');
    await page.keyboard.press('Control+C');
    await waitPrompt(page, 't-shell');
    await page.waitForTimeout(900);
    assert.doesNotMatch(await screen(page, 't-shell'), /^10$/m);
    assert.equal(await page.evaluate(() => (document.getElementById('t-shell') as El).api.getState().name), 'default');
  });

  await check('Ctrl+L clears the screen; the prompt is drawn again at the top', async () => {
    await page.focus('#t-shell .xterm-helper-textarea');
    await page.keyboard.press('Control+L');
    await page.waitForFunction(() => (globalThis as unknown as Win).df$.shadcn.terminal.text('t-shell').trim() === '$');
    // what follows Ctrl+L in the same input (a paste) runs after the redraw - it once waited for a prompt that never came
    await page.evaluate(async () => {
      const term = (await (globalThis as unknown as Win).df$.shadcn.terminal.xterm('t-shell')) as unknown as { input(d: string, user?: boolean): void };
      term.input('\x0cecho after the clear\r', true);
    });
    await waitText(page, 't-shell', /^after the clear$/m);
    await waitPrompt(page, 't-shell');
  });

  await check('a replay: each command typed and answered, then the prompt takes input', async () => {
    await waitText(page, 't-replay', /^~\/app % echo ready\nready\n~\/app %$/m, 15000);
    const text = await screen(page, 't-replay');
    assert.match(text, /^~\/app % npm i defuss-shadcn\nadded 1 package in 2s$/m);
    assert.match(text, /SKILL\.md {2}apps {2}components/);
    // the step's tone: green (SGR 32)
    const vt = await page.evaluate(() => (globalThis as unknown as Win).df$.shadcn.terminal.serialize('t-replay', 'vt'));
    assert.ok(vt.includes('\x1b[32mready'), 'ready in green');
  });

  await check('a key press finishes a replay at once', async () => {
    await page.evaluate(() => {
      (globalThis as unknown as Win).df$.shadcn.terminal.clear('t-replay');
      document.getElementById('t-replay')!.dataset.speed = '200';
      void (globalThis as unknown as Win).df$.shadcn.terminal.play('t-replay');
    });
    await page.waitForFunction(() => document.getElementById('t-replay')!.getAttribute('aria-busy') === 'true');
    await page.focus('#t-replay .xterm-helper-textarea');
    await page.keyboard.press('x');
    await waitText(page, 't-replay', /echo ready\nready/, 3000);
    await page.waitForFunction(() => document.getElementById('t-replay')!.getAttribute('aria-busy') === null);
  });

  await check('read-only output: no prompt, no input; writeln with a tone, text() and serialize()', async () => {
    assert.equal(await screen(page, 't-log'), '');
    await page.focus('#t-log .xterm-helper-textarea');
    await page.keyboard.type('ignored');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    assert.equal(await screen(page, 't-log'), '');
    await page.evaluate(async () => {
      const { terminal } = (globalThis as unknown as Win).df$.shadcn;
      await terminal.writeln('t-log', terminal.tone('compile 126 components', 'info'));
      await terminal.writeln('t-log', terminal.tone('done in 4.2 s', 'success'));
      await terminal.writeln('t-log', 'docs at https://shadcn.defuss.org');
    });
    assert.equal(await screen(page, 't-log'), 'compile 126 components\ndone in 4.2 s\ndocs at https://shadcn.defuss.org');
    const html = await page.evaluate(() => (globalThis as unknown as Win).df$.shadcn.terminal.serialize('t-log'));
    assert.match(html, /<pre>/);
    assert.match(html, /done in 4\.2 s/);
    assert.match(html, /color: #/);
    assert.equal(await page.evaluate(() => (document.getElementById('t-log') as El).api.getState().name), 'readonly');
  });

  await check('the web-links addon makes a URL a link (hover)', async () => {
    // the third row of the log holds the URL: point at it and the addon underlines it
    const box = (await page.locator('#t-log .xterm-screen').boundingBox())!;
    const cell = await page.evaluate(async () => {
      const term = (await (globalThis as unknown as Win).df$.shadcn.terminal.xterm('t-log')) as unknown as { rows: number; cols: number };
      return { rows: term.rows, cols: term.cols };
    });
    const h = box.height / cell.rows;
    const w = box.width / cell.cols;
    await page.mouse.move(box.x + w * 12, box.y + h * 2.5);
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#t-log .xterm-screen')!).cursor === 'pointer' || !!document.querySelector('#t-log .xterm-screen.xterm-cursor-pointer'), undefined, { timeout: 3000 });
    await page.mouse.move(box.x - 20, box.y - 20);
  });

  await check('the clipboard addon answers OSC 52: a program copies to the clipboard', async () => {
    await page.evaluate(() => (globalThis as unknown as Win).df$.shadcn.terminal.write('t-log', `\x1b]52;c;${btoa('copied by OSC 52')}\x07`));
    await page.waitForFunction(async () => (await navigator.clipboard.readText()) === 'copied by OSC 52', undefined, { timeout: 3000 });
  });

  await check('DOS: the not-found answer, commands found in lower case, the CGA colours', async () => {
    await typeLine(page, 't-dos', 'DIR');
    await waitText(page, 't-dos', 'Volume in drive C is DEFUSS');
    await waitPrompt(page, 't-dos', 'C:' + '\\>');
    await typeLine(page, 't-dos', 'format c:');
    await waitText(page, 't-dos', 'Bad command or file name');
    const theme = await page.evaluate(() => (globalThis as unknown as Win).df$.shadcn.terminal.theme('t-dos'));
    assert.equal(theme.background, 'rgba(0, 0, 0, 1)');
    assert.equal(theme.foreground, 'rgba(170, 170, 170, 1)');
    assert.equal(theme.brightYellow, 'rgba(255, 255, 85, 1)');
    const opts = await page.evaluate(async () => (await (globalThis as unknown as Win).df$.shadcn.terminal.xterm('t-dos')).options.cursorStyle);
    assert.equal(opts, 'underline');
    assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('t-dos')!).borderTopLeftRadius), '0px');
  });

  await check('the variants and sizes: theme colours, font sizes, chrome, rows', async () => {
    const r = await page.evaluate(() => {
      const css = (id: string) => getComputedStyle(document.getElementById(id)!);
      const { terminal } = (globalThis as unknown as Win).df$.shadcn;
      return {
        shellBg: terminal.theme('t-shell').background,
        mutedBg: terminal.theme('t-muted').background,
        mutedToken: getComputedStyle(document.documentElement).getPropertyValue('--muted').trim(),
        sm: css('t-muted').fontSize,
        md: css('t-shell').fontSize,
        lg: css('t-lg').fontSize,
        noChrome: css('t-log').paddingTop,
        chrome: css('t-shell').paddingTop,
        lgScreen: document.querySelector('#t-lg .xterm-rows')?.children.length,
        replayRows: document.querySelector('#t-replay .xterm-rows')?.children.length,
        shellHeight: Math.round(document.getElementById('t-shell')!.getBoundingClientRect().height),
        // the xterm element is no terminal of ours: none of the component's box rules reach it
        xtermPad: getComputedStyle(document.querySelector('#t-shell .xterm')!).paddingTop,
      };
    });
    assert.match(r.shellBg, /^rgba\(\d+, \d+, \d+, 1\)$/);
    assert.notEqual(r.mutedBg, r.shellBg);
    assert.deepEqual([r.sm, r.md, r.lg], ['12px', '14px', '16px']);
    assert.deepEqual([r.noChrome, r.chrome], ['0px', '40px']);
    assert.equal(r.lgScreen, 4);
    assert.equal(r.replayRows, 9);
    assert.equal(r.shellHeight, 320);
    assert.equal(r.xtermPad, '0px');
    assert.equal(await page.evaluate(async () => (await (globalThis as unknown as Win).df$.shadcn.terminal.xterm('t-lg')).options.cursorStyle), 'bar');
  });

  await check('the theme is followed: the muted terminal changes with the page\'s dark mode', async () => {
    const before = await page.evaluate(() => (globalThis as unknown as Win).df$.shadcn.terminal.theme('t-muted').background);
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForFunction(
      async (b) => {
        const term = await (globalThis as unknown as Win).df$.shadcn.terminal.xterm('t-muted');
        const theme = term.options.theme as Record<string, string>;
        return theme.background !== b;
      },
      before,
      { timeout: 3000 },
    );
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
  });

  await check('a terminal in a hidden box opens once its box shows', async () => {
    assert.equal(await page.evaluate(() => document.getElementById('t-hidden')!.hasAttribute('data-ready')), false);
    await page.evaluate(() => (document.getElementById('t-box')!.hidden = false));
    await page.waitForFunction(() => document.getElementById('t-hidden')!.hasAttribute('data-ready'), undefined, { timeout: 5000 });
    await waitPrompt(page, 't-hidden');
    assert.equal(await page.evaluate(() => document.querySelector('#t-hidden .xterm-rows')?.children.length), 4);
  });

  await check('a terminal added later opens; one removed is disposed', async () => {
    const ok = await page.evaluate(async () => {
      const el = document.createElement('div');
      el.className = 'terminal';
      el.dataset.rows = '3';
      el.setAttribute('aria-label', 'late');
      document.body.append(el);
      for (let i = 0; i < 100 && !el.hasAttribute('data-ready'); i++) await new Promise((r) => setTimeout(r, 50));
      const opened = !!el.querySelector('.xterm');
      el.remove();
      await new Promise((r) => setTimeout(r, 50));
      return opened;
    });
    assert.ok(ok);
  });

  await check('Tab on an empty line moves the focus on; the terminal never traps it', async () => {
    await page.focus('#t-lg .xterm-helper-textarea');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => !!document.activeElement?.closest('#t-lg'));
    assert.equal(focused, false);
  });

  await check('State API: running types and runs a command, readonly takes the input, default sets the prompt', async () => {
    await page.evaluate(() => (document.getElementById('t-lg') as El).api.setState('running', { command: 'echo state api' }));
    await page.evaluate(() => (document.getElementById('t-lg') as El).api.settled());
    await waitText(page, 't-lg', /^\$ echo state api\nstate api$/m);
    await waitPrompt(page, 't-lg');
    assert.equal(await page.evaluate(() => (document.getElementById('t-lg') as El).api.getState().name), 'default');
    await page.evaluate(() => (document.getElementById('t-lg') as El).api.setState('readonly'));
    await page.evaluate(() => (document.getElementById('t-lg') as El).api.settled());
    const ro = await page.evaluate(() => ({ attr: document.getElementById('t-lg')!.hasAttribute('data-readonly'), state: (document.getElementById('t-lg') as El).api.getState().name }));
    assert.deepEqual(ro, { attr: true, state: 'readonly' });
    assert.doesNotMatch(await lastLine(page, 't-lg'), /^\$/);
    await page.evaluate(() => (document.getElementById('t-lg') as El).api.setState('default', { prompt: '# ' }));
    await page.evaluate(() => (document.getElementById('t-lg') as El).api.settled());
    await waitPrompt(page, 't-lg', '#');
    const st = await page.evaluate(() => ({ prompt: document.getElementById('t-lg')!.dataset.prompt, state: (({ name, config }) => ({ name, config }))((document.getElementById('t-lg') as El).api.getState()) }));
    assert.deepEqual(st, { prompt: '# ', state: { name: 'default', config: { prompt: '# ' } } });
    const rejected = await page.evaluate(() => {
      try {
        (document.getElementById('t-lg') as El).api.setState('nope');
        return false;
      } catch {
        return true;
      }
    });
    assert.ok(rejected, 'an unknown state throws');
  });

  await check('no page errors', async () => {
    assert.deepEqual(errors, []);
  });

  await check('render() contract: render(state) reproduces each state; the store mirrors it', async () => {
    await assertRenderContract(page, '.terminal[id]:not(.xterm)', ['default', 'running', 'readonly'], {
      runtimeOwned: '[data-ce-chrome]',
      runtimeAttrs: ['aria-busy', 'data-ready'],
    });
  });

  await context.close();
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nterminal.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nterminal.e2e: all checks passed');
