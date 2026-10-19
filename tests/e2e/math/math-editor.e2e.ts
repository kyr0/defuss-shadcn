import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';

/**
 * Why: E2E for the shipped Formula Editing adapter. The official MathLive build
 * (module + fonts) is served OFFLINE from the pinned devDependency. Verifies:
 * lazy loading, the field taking over from the textarea (which stays the form
 * control), typing that the textarea, the `math-input` event and a linked
 * preview follow, toolbar commands keeping focus in the field, validity that
 * only shows on submit (an empty placeholder blocks it, without the browser's
 * "not focusable" error), FormData and reset, readonly / disabled, the leased
 * virtual keyboard (themed, handed over between editors), and the State API +
 * render() contract.
 */

const FIXTURE = '/tests/e2e/math/math-editor.e2e-fixture.html';
const PINNED = 'https://cdn.jsdelivr.net/npm/mathlive@0.111.0/';
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

const settled = '.math-editor:not([data-ready]):not([data-error])';

try {
  await check('the adapter pins mathlive@0.111.0 (never @latest)', async () => {
    const src = readFileSync(resolve(import.meta.dirname, '../../../dist/components/math-editor/math-editor.js'), 'utf8');
    assert.ok(src.includes(`${PINNED}mathlive.min.mjs`));
    assert.doesNotMatch(src, /mathlive@latest/);
  });

  await check('no editor on the page → MathLive is never requested', async () => {
    const page = await browser.newPage();
    const requests = await offlineJsdelivr(page);
    await page.route(`${server.url}/tests/e2e/__math-editor-empty.html`, (route) =>
      route.fulfill({ contentType: 'text/html', body: '<!doctype html><p>none</p><script type="module" src="/dist/components/core.js"></script><script type="module" src="/dist/components/math-editor/math-editor.js"></script>' }),
    );
    await page.goto(`${server.url}/tests/e2e/__math-editor-empty.html`);
    await page.waitForFunction(() => !!(globalThis as any).df$?.shadcn?.mathEditorApi);
    await page.waitForTimeout(400);
    assert.deepEqual(requests, []);
    await page.close();
  });

  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const requests = await offlineJsdelivr(page);
  await page.goto(`${server.url}${FIXTURE}`);
  await page.waitForFunction((sel) => !document.querySelector(sel) && document.querySelectorAll('.math-editor[data-ready]').length === 4, settled);

  await check('MathLive loads once for four editors', async () => {
    assert.deepEqual(requests.filter((u) => u.endsWith('/mathlive.min.mjs')), [`${PINNED}mathlive.min.mjs`]);
  });

  await check('MathLive\'s fonts load from the fonts/ folder beside the module (its own default names <module>.mjs/fonts/)', async () => {
    const solo = await browser.newPage();
    const log = await offlineJsdelivr(solo);
    await solo.route(`${server.url}/tests/e2e/__math-editor-solo.html`, (route) =>
      route.fulfill({ contentType: 'text/html', body: '<!doctype html><link rel="stylesheet" href="/dist/components/math-editor/math-editor.css"><div class="math-editor"><textarea class="math-editor-source">x^2</textarea></div><script type="module" src="/dist/components/core.js"></script><script type="module" src="/dist/components/math-editor/math-editor.js"></script>' }),
    );
    await solo.goto(`${server.url}/tests/e2e/__math-editor-solo.html`);
    await solo.waitForFunction(() => document.querySelector('.math-editor[data-ready]'));
    await solo.waitForFunction(() => document.fonts.status === 'loaded');
    const fonts = log.filter((u) => u.includes('.woff2'));
    await solo.close();
    assert.ok(fonts.length > 0, 'fonts requested');
    assert.ok(fonts.every((u) => u.startsWith(`${PINNED}fonts/KaTeX_`)), fonts.join('\n'));
  });

  await check('the field takes over: the textarea steps aside but keeps the value; the label names the field', async () => {
    const r = await page.evaluate(() =>
      ['me-area', 'me-second', 'me-readonly', 'me-disabled'].map((id) => {
        const el = document.getElementById(id)!;
        const field = el.querySelector('math-field') as any;
        const source = el.querySelector('textarea')!;
        return { id, chrome: field.hasAttribute('data-ce-chrome'), before: field.nextElementSibling === source, hidden: getComputedStyle(source).display, label: field.getAttribute('aria-label'), same: field.value.replace(/\s/g, '') === source.value.replace(/\s/g, '') };
      }),
    );
    assert.deepEqual(r.map((x) => [x.chrome, x.before, x.hidden, x.same]), [[true, true, 'none', true], [true, true, 'none', true], [true, true, 'none', true], [true, true, 'none', true]]);
    assert.deepEqual(r.map((x) => x.label), ['Area of a circle', 'Second formula', 'Given', 'Locked']);
  });

  await check('the authored textarea names the starting state: readonly, disabled - the toolbar follows', async () => {
    const r = await page.evaluate(() => ({
      states: ['me-area', 'me-readonly', 'me-disabled'].map((id) => document.getElementById(id)!.dataset.stateName),
      field: [(document.querySelector('#me-readonly math-field') as any).readOnly, (document.querySelector('#me-disabled math-field') as any).disabled],
      tools: [...document.querySelectorAll('#me-area [data-math-command]')].every((b) => !(b as HTMLButtonElement).disabled),
    }));
    assert.deepEqual(r, { states: ['default', 'readonly', 'disabled'], field: [true, true], tools: true });
  });

  await check('typing: the textarea, the math-input event and the linked preview follow the field', async () => {
    await page.evaluate(() => {
      (globalThis as any).__inputs = [];
      document.addEventListener('math-input', (e) => (globalThis as any).__inputs.push((e as CustomEvent).detail));
    });
    await page.click('#me-area math-field');
    // MathLive takes focus into its shadow root a moment after the click
    await page.waitForFunction(() => document.activeElement?.closest('.math-editor')?.id === 'me-area');
    await page.keyboard.press('End');
    await page.keyboard.type('+1');
    await page.waitForFunction(() => document.querySelector('#me-preview annotation')?.textContent?.includes('+1'));
    const r = await page.evaluate(() => ({
      textarea: (document.getElementById('me-area-source') as HTMLTextAreaElement).value,
      last: (globalThis as any).__inputs.at(-1),
      state: document.getElementById('me-area')!.api!.getState(),
    }));
    assert.match(r.textarea.replace(/\s/g, ''), /r\^2\+1$/);
    assert.deepEqual(r.last, { latex: r.textarea, complete: true });
    assert.equal(r.state.name, 'default');
    assert.equal(r.state.config.latex, r.textarea);
  });

  await check('a toolbar command wraps the selection in a template and keeps focus in the field; an empty placeholder is a custom error - no red yet', async () => {
    await page.click('#me-area [data-math-command="fraction"]');
    const r = await page.evaluate(() => {
      const source = document.getElementById('me-area-source') as HTMLTextAreaElement;
      return { latex: source.value, custom: source.validity.customError, message: source.validationMessage, state: document.getElementById('me-area')!.dataset.stateName, focus: document.activeElement?.closest('.math-editor')?.id, tag: document.activeElement?.localName };
    });
    assert.match(r.latex, /\\frac\{1\}\{\\placeholder\{\}\}/);
    assert.deepEqual([r.custom, r.message, r.state, r.focus, r.tag], [true, 'Fill in every placeholder of the formula.', 'default', 'me-area', 'math-field']);
  });

  await check('submit with a placeholder left: the editor turns invalid, says why, focus goes to the field - no native bubble on the hidden textarea', async () => {
    await page.click('#me-submit');
    const r = await page.evaluate(() => {
      const el = document.getElementById('me-area')!;
      const msg = el.querySelector('.math-editor-message');
      return { state: el.dataset.stateName, msg: msg?.textContent, role: msg?.getAttribute('role'), id: msg?.id, invalid: el.querySelector('textarea')!.getAttribute('aria-invalid'), described: el.querySelector('math-field')!.getAttribute('aria-describedby'), focus: document.activeElement?.closest('.math-editor')?.id };
    });
    assert.deepEqual(r, { state: 'invalid', msg: 'Fill in every placeholder of the formula.', role: 'alert', id: 'me-area-source-message', invalid: 'true', described: 'me-area-source-message', focus: 'me-area' });
  });

  await check('filling the placeholder leaves invalid; the submission carries the formula once - the disabled editor not at all', async () => {
    await page.keyboard.type('2');
    await page.evaluate(() => {
      document.getElementById('me-form')!.addEventListener('submit', (e) => {
        e.preventDefault();
        (globalThis as any).__data = [...new FormData(e.target as HTMLFormElement)];
      });
    });
    // MathLive reports the edit a moment after the keystroke
    await page.waitForFunction(() => document.getElementById('me-area')!.dataset.stateName !== 'invalid').catch(() => undefined);
    const state = await page.evaluate(() => document.getElementById('me-area')!.dataset.stateName);
    await page.click('#me-submit');
    const data = await page.evaluate(() => (globalThis as any).__data);
    assert.equal(state, 'default');
    assert.equal(data.length, 1);
    assert.equal(data[0][0], 'area');
    // MathLive writes \frac{1}{2} in its short form
    assert.match(data[0][1].replace(/\s/g, ''), /\\frac(12|\{1\}\{2\})$/);
  });

  await check('reset restores the authored formula in the textarea and the field; the preview follows', async () => {
    await page.click('#me-reset');
    await page.waitForFunction(() => (document.querySelector('#me-area math-field') as any).value.replace(/\s/g, '') === 'A=\\pir^2');
    const r = await page.evaluate(() => ({ textarea: (document.getElementById('me-area-source') as HTMLTextAreaElement).value, state: document.getElementById('me-area')!.dataset.stateName }));
    await page.waitForFunction(() => !document.querySelector('#me-preview annotation')?.textContent?.includes('frac'));
    assert.deepEqual(r, { textarea: 'A = \\pi r^2', state: 'default' });
  });

  await check('setValue with the same formula keeps the field, its caret and its undo history', async () => {
    const r = await page.evaluate(() => {
      const el = document.getElementById('me-second')!;
      const field = el.querySelector('math-field') as any;
      field.focus();
      field.executeCommand(['insert', '+0']);
      const undo = field.canUndo();
      const same = field.value;
      (globalThis as any).df$.shadcn.mathEditor.setValue(el, same);
      return { field: el.querySelector('math-field') === field, undo: [undo, field.canUndo()], value: field.value === same };
    });
    assert.deepEqual(r, { field: true, undo: [true, true], value: true });
  });

  await check('validate(): an unfinished formula enters invalid, a finished one leaves it', async () => {
    const r = await page.evaluate(() => {
      const m = (globalThis as any).df$.shadcn.mathEditor;
      const el = document.getElementById('me-second')!;
      m.setValue(el, '\\frac{1}{\\placeholder{}}');
      const bad = [m.validate(el), el.dataset.stateName];
      m.setValue(el, '\\frac{1}{2}');
      const good = [m.validate(el), el.dataset.stateName];
      return { bad, good };
    });
    assert.deepEqual(r, { bad: [false, 'invalid'], good: [true, 'default'] });
  });

  await check('typing in an invalid editor stays where the reader types - no validation jump per keystroke', async () => {
    const m = 'globalThis.df$.shadcn.mathEditor';
    await page.evaluate(`${m}.setValue(document.getElementById('me-second'), '\\\\frac{\\\\placeholder{}}{\\\\placeholder{}}')`);
    // validate() finds the formula unfinished: invalid, the caret in the first empty placeholder
    await page.evaluate(`${m}.validate(document.getElementById('me-second'))`);
    await page.waitForFunction(() => document.activeElement?.closest('.math-editor')?.id === 'me-second');
    await page.keyboard.type('12');
    await page.waitForTimeout(200);
    const r = await page.evaluate(() => ({ value: (document.querySelector('#me-second math-field') as any).value, state: document.getElementById('me-second')!.dataset.stateName }));
    assert.match(r.value, /\\frac\{12\}\{\\placeholder\{\}\}/);
    assert.equal(r.state, 'invalid');
  });

  await check('readonly: the field shows the formula, typing changes nothing; disabled: not focusable', async () => {
    await page.click('#me-readonly math-field');
    await page.waitForFunction(() => document.activeElement?.closest('.math-editor')?.id === 'me-readonly');
    await page.keyboard.type('9');
    const r = await page.evaluate(() => ({
      readonly: (document.getElementById('me-readonly-source') as HTMLTextAreaElement).value,
      field: (document.querySelector('#me-readonly math-field') as any).value.replace(/\s/g, ''),
      disabled: (document.getElementById('me-disabled-source') as HTMLTextAreaElement).hasAttribute('disabled'),
    }));
    assert.deepEqual(r, { readonly: 'a^2 + b^2 = c^2', field: 'a^2+b^2=c^2', disabled: true });
  });

  await check('the virtual keyboard opens in the editor\'s own container, themed from the tokens', async () => {
    await page.click('#me-area [data-math-command="keyboard"]');
    await page.waitForFunction(() => !!document.querySelector('#me-area .math-editor-keyboard .ML__keyboard'));
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const el = document.getElementById('me-area')!;
      const kb = el.querySelector('.math-editor-keyboard .ML__keyboard')!;
      const keycap = kb.querySelector('.MLK__keycap') as HTMLElement | null;
      const probe = document.createElement('div');
      probe.style.background = 'var(--background)';
      probe.style.borderRadius = 'var(--radius-sm)';
      el.append(probe);
      const token = getComputedStyle(probe).backgroundColor;
      const radiusToken = getComputedStyle(probe).borderTopLeftRadius;
      probe.remove();
      return {
        state: el.dataset.stateName,
        visible: (globalThis as any).mathVirtualKeyboard.visible,
        height: Math.round(kb.getBoundingClientRect().height),
        keycap: keycap ? getComputedStyle(keycap).backgroundColor : null,
        token,
        radius: keycap ? getComputedStyle(keycap).borderTopLeftRadius : null,
        radiusToken,
        // every keycap lies inside the container - none clipped at its bottom edge
        inside: (() => {
          const host = el.querySelector('.math-editor-keyboard')!.getBoundingClientRect();
          return [...kb.querySelectorAll('.MLK__layer.is-visible .MLK__keycap')].every((k) => {
            const r = k.getBoundingClientRect();
            return r.height === 0 || (r.top >= host.top - 0.5 && r.bottom <= host.bottom + 0.5);
          });
        })(),
      };
    });
    assert.equal(r.state, 'keyboard-open');
    assert.equal(r.visible, true);
    assert.ok(r.height > 100, `keyboard height ${r.height}px`);
    assert.equal(r.keycap, r.token, 'a keycap takes --background');
    assert.equal(r.radius, r.radiusToken, 'a keycap takes --radius-sm (the pinned private hook)');
    assert.equal(r.inside, true, 'every keycap inside the container');
    // a square theme: the keycaps follow it (MathLive's own keycaps are rounded)
    const square = await page.evaluate(() => {
      const el = document.getElementById('me-area')!;
      el.style.setProperty('--radius-sm', '0px');
      const radius = getComputedStyle(el.querySelector('.math-editor-keyboard .MLK__keycap')!).borderTopLeftRadius;
      el.style.removeProperty('--radius-sm');
      return radius;
    });
    assert.equal(square, '0px');
  });

  await check('one keyboard per window: another editor taking it returns the first to default', async () => {
    const r = await page.evaluate(() => {
      const second = document.getElementById('me-second')!;
      second.api!.setState('keyboard-open');
      return {
        first: document.getElementById('me-area')!.dataset.stateName,
        second: second.dataset.stateName,
        host: !!second.querySelector('.math-editor-keyboard .ML__keyboard'),
        left: !!document.querySelector('#me-area .math-editor-keyboard .ML__keyboard'),
      };
    });
    assert.deepEqual(r, { first: 'default', second: 'keyboard-open', host: true, left: false });
    await page.evaluate(() => document.getElementById('me-second')!.api!.setState('default'));
    assert.equal(await page.evaluate(() => (globalThis as any).mathVirtualKeyboard.visible), false);
  });

  await check('no page errors (and no "not focusable" validation error)', async () => {
    assert.deepEqual(errors, []);
  });

  await check('render() contract: render(state) reproduces each state; the store mirrors it', async () => {
    await assertRenderContract(page, '.math-editor[id]', ['default', 'readonly', 'disabled', 'invalid', 'keyboard-open'], {
      runtimeOwned: '.math-editor-field, .math-editor-keyboard',
      settled,
    });
  });

  await page.close();
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`\nmath-editor.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nmath-editor.e2e: all checks passed');
