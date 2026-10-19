import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Page } from 'playwright';
import { startServer } from '../server.ts';
import { assertRenderContract } from '../lib/render-contract.ts';
import { offlineJsdelivr } from '../lib/vendor-offline.ts';

/**
 * Why: E2E for the shipped Visual Editor (GrapesJS over the system's markup). GrapesJS is served OFFLINE from the
 * pinned devDependency (node_modules/grapesjs - the exact files the component requests from jsDelivr), so every
 * request is counted. Verifies: lazy loading (no editor → nothing requested; four editors → the build once), no
 * telemetry, the documented markup of EVERY component through the editor and back (html()), blocks (click and drag)
 * with renamed ids whose references follow, the controls (undo / redo / duplicate / remove), selection + apply()
 * and what it refuses, what the parser drops, the markup round trip into another editor, the outline, readonly and the
 * device, the events, dark mode, and the render contract.
 */

const ROOT = join(import.meta.dirname, '..', '..', '..');
const FIXTURE = '/tests/e2e/wysiwyg-editors/visual-editor.e2e-fixture.html';
const ENGINE = 'https://cdn.jsdelivr.net/npm/grapesjs@0.23.6/dist/grapes.min.js';
const ENGINE_CSS = 'https://cdn.jsdelivr.net/npm/grapesjs@0.23.6/dist/css/grapes.min.css';
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

const waitReady = (page: Page) =>
  page.waitForFunction(
    () => [...document.querySelectorAll('.visual-editor')].every((e) => e.hasAttribute('data-ready') || e.hasAttribute('data-error')),
    undefined,
    { timeout: 30000 },
  );

async function open(): Promise<{ page: Page; requests: string[]; errors: string[] }> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const requests = await offlineJsdelivr(page);
  await page.goto(server.url + FIXTURE, { waitUntil: 'load' });
  await waitReady(page);
  return { page, requests, errors };
}

/** a markup string as a comparable list: element per line with its attributes sorted (style through the CSS parser,
 *  so `a:1;` and `a: 1` agree), non-blank text trimmed */
const SHAPE = `(html) => {
  const t = document.createElement('template');
  t.innerHTML = html;
  const out = [];
  const css = (v) => { const s = document.createElement('span'); s.setAttribute('style', v); return s.style.cssText; };
  const walk = (n, d) => {
    for (const c of n.childNodes) {
      if (c.nodeType === 1) {
        const attrs = [...c.attributes].map((a) => a.name + '=' + (a.name === 'style' ? css(a.value) : a.value)).sort().join(' ');
        out.push(d + '<' + c.localName + ' ' + attrs + '>');
        walk(c.localName === 'template' ? c.content : c, d + 1);
      } else if (c.nodeType === 3 && c.textContent.trim()) out.push(d + '"' + c.textContent.trim().replace(/\\s+/g, ' ') + '"');
    }
  };
  walk(t.content, 0);
  return out;
}`;

try {
  await check('lazy: a page with the component but no editor requests nothing from the CDN', async () => {
    const page = await browser.newPage();
    const requests = await offlineJsdelivr(page);
    // a page of the server's origin (module scripts load same-origin), then markup without an editor
    await page.goto(`${server.url}/dist/components/core.css`);
    await page.setContent(
      '<!doctype html><html><body><p>none</p><script type="module" src="/dist/components/core.js"></script><script type="module" src="/dist/components/visual-editor/visual-editor.js"></script></body></html>',
    );
    await page.waitForFunction(() => !!(globalThis as any).df$?.shadcn?.visualEditor);
    await page.waitForTimeout(300);
    assert.deepEqual(requests, []);
    await page.close();
  });

  const { page, requests, errors } = await open();

  await check('four editors: the pinned build and its stylesheet are requested once each; every editor is ready; telemetry is off', async () => {
    assert.equal(requests.filter((u) => u === ENGINE).length, 1, requests.join('\n'));
    assert.equal(requests.filter((u) => u === ENGINE_CSS).length, 1, requests.join('\n'));
    const r = await page.evaluate(() => ({
      ready: [...document.querySelectorAll('.visual-editor')].map((e) => e.hasAttribute('data-ready')),
      canvases: document.querySelectorAll('.visual-editor > .visual-editor-canvas').length,
      sheets: document.querySelectorAll('link[data-visual-editor-vendor]').length,
      telemetry: ((globalThis as any).df$.shadcn.visualEditor.editor('#ve-compose') as any).getConfig().telemetry,
    }));
    assert.deepEqual(r, { ready: [true, true, true, true], canvases: 4, sheets: 1, telemetry: false });
  });

  await check('html(): the authored page comes back element-for-element, inline styles where they were written', async () => {
    const r = await page.evaluate(`(() => {
      const shape = ${SHAPE};
      const src = document.querySelector('#ve-compose > script.visual-editor-source').textContent;
      return { a: shape(src), b: shape(df$.shadcn.visualEditor.html('#ve-compose')) };
    })()`) as { a: string[]; b: string[] };
    assert.deepEqual(r.b, r.a);
    assert.ok(r.b.some((l) => l.includes('style=max-width: 26rem; margin: 1.5rem auto;')), 'the inline style stays on its element');
  });

  // every component's documented markup (each skill's first ```html block, scripts aside) through the editor and back
  const blocks: { name: string; html: string }[] = [];
  const comps = join(ROOT, 'src', 'components');
  for (const section of readdirSync(comps, { withFileTypes: true }).filter((d) => d.isDirectory()))
    for (const c of readdirSync(join(comps, section.name))) {
      const skill = join(comps, section.name, c, 'component-skill.md');
      if (!existsSync(skill)) continue;
      const first = /```html\n([\s\S]*?)```/.exec(readFileSync(skill, 'utf8'));
      if (first) blocks.push({ name: c, html: first[1].replace(/<script\b[\s\S]*?<\/script>/gi, '') });
    }
  await check(`fidelity: the documented markup of all ${blocks.length} components comes back from the editor element-for-element`, async () => {
    const diffs = (await page.evaluate(`(async (list) => {
      const shape = ${SHAPE};
      const ve = df$.shadcn.visualEditor;
      const out = [];
      for (const b of list) {
        ve.setHtml('#ve-project', b.html);
        const a = shape(b.html), z = shape(ve.html('#ve-project'));
        const i = a.findIndex((x, k) => x !== z[k]);
        if (i >= 0 || a.length !== z.length) out.push(b.name + '\\n      in:  ' + (a[i] ?? '(end)') + '\\n      out: ' + (z[i] ?? '(end)'));
      }
      return out;
    })(${JSON.stringify(blocks)})`)) as string[];
    assert.deepEqual(diffs, [], `${diffs.length} component(s) change in the editor:\n    ${diffs.join('\n    ')}`);
  });
  // the fidelity check replaced #ve-project's page - load it again for the checks below
  await page.reload();
  await waitReady(page);

  await check('blocks: a click inserts into the selected element; the same block twice renames its ids and moves every reference', async () => {
    const r = await page.evaluate(() => {
      const ve = (globalThis as any).df$.shadcn.visualEditor;
      const content = ve.outline('#ve-compose')[0].children.find((n: any) => n.label.startsWith('div.card-content'));
      ve.select('#ve-compose', content.path);
      (document.getElementById('blk-email') as HTMLElement).click();
      ve.select('#ve-compose', content.path);
      (document.getElementById('blk-email') as HTMLElement).click();
      const t = document.createElement('template');
      t.innerHTML = ve.html('#ve-compose');
      const c = t.content;
      return {
        ids: [...c.querySelectorAll('.card-content [id]')].map((e) => e.id),
        fors: [...c.querySelectorAll('.card-content label')].map((l) => l.getAttribute('for')),
        described: [...c.querySelectorAll('.card-content input')].map((i) => i.getAttribute('aria-describedby')),
      };
    });
    assert.deepEqual(r, {
      ids: ['email', 'email-hint', 'email-2', 'email-hint-2'],
      fors: ['email', 'email-2'],
      described: ['email-hint', 'email-hint-2'],
    });
  });

  await check('a block whose markup is a <script type="text/html"> data block inserts it (a list written with df$().html())', async () => {
    const html = await page.evaluate(() => {
      const ve = (globalThis as any).df$.shadcn.visualEditor;
      ve.select('#ve-compose', '0.0.0');
      (document.getElementById('blk-badge') as HTMLElement).click();
      return ve.html('#ve-compose');
    });
    assert.ok(html.includes('<span data-variant="secondary" class="badge">New</span>') || html.includes('<span class="badge" data-variant="secondary">New</span>'), html.slice(0, 400));
    await page.evaluate(() => (globalThis as any).df$.shadcn.visualEditor.undo('#ve-compose'));
  });

  await check('controls: Undo and Redo follow the history (disabled at its ends); Duplicate and Remove need a selection', async () => {
    const before = await page.evaluate(() => (globalThis as any).df$.shadcn.visualEditor.html('#ve-compose'));
    await page.click('#ctl-undo');
    const undone = await page.evaluate(() => (globalThis as any).df$.shadcn.visualEditor.html('#ve-compose'));
    assert.ok(undone.split('email-2').length < before.split('email-2').length, 'undo removed the last insertion');
    assert.equal(await page.isDisabled('#ctl-redo'), false);
    await page.click('#ctl-redo');
    assert.equal(await page.evaluate(() => (globalThis as any).df$.shadcn.visualEditor.html('#ve-compose')), before);
    await page.evaluate(() => (globalThis as any).df$.shadcn.visualEditor.select('#ve-compose', null));
    assert.equal(await page.isDisabled('#ctl-duplicate'), true);
    assert.equal(await page.isDisabled('#ctl-remove'), true);
    const n = await page.evaluate(() => {
      const ve = (globalThis as any).df$.shadcn.visualEditor;
      ve.select('#ve-compose', '0.0.0');
      return ve.selection('#ve-compose').tag;
    });
    assert.equal(n, 'h3');
    await page.click('#ctl-duplicate');
    assert.equal((await page.evaluate(() => (globalThis as any).df$.shadcn.visualEditor.html('#ve-compose'))).split('Welcome').length - 1, 2);
    await page.click('#ctl-remove');
    assert.equal((await page.evaluate(() => (globalThis as any).df$.shadcn.visualEditor.html('#ve-compose'))).split('Welcome').length - 1, 1);
  });

  await check('drag: a block dragged into the canvas drops its markup (HTML Drag and Drop events, as a pointer drag sends them)', async () => {
    const dropped = await page.evaluate(async () => {
      const ve = (globalThis as any).df$.shadcn.visualEditor;
      const editor = ve.editor('#ve-compose') as any;
      const block = document.getElementById('blk-alert')!;
      const target = editor.Canvas.getDocument().querySelector('.card-title') as HTMLElement;
      const r = target.getBoundingClientRect();
      const dt = new DataTransfer();
      block.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
      const at = { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.left + 5, clientY: r.bottom - 2 };
      for (const type of ['dragenter', 'dragover', 'dragover']) {
        target.dispatchEvent(new DragEvent(type, at));
        await new Promise((res) => setTimeout(res, 30));
      }
      target.dispatchEvent(new DragEvent('drop', at));
      block.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }));
      await new Promise((res) => setTimeout(res, 50));
      return ve.html('#ve-compose');
    });
    assert.ok(dropped.includes('Your changes are live.'), dropped.slice(0, 400));
  });

  await check('selection + apply(): text of a text-only element (as text, never markup), data-variant set and removed', async () => {
    const r = await page.evaluate(() => {
      const ve = (globalThis as any).df$.shadcn.visualEditor;
      const first = ve.select('#ve-inspect', '0.0');
      const text = ve.apply('#ve-inspect', { text: 'Ready to <b>launch</b>?' });
      ve.select('#ve-inspect', '0.2');
      const variant = ve.apply('#ve-inspect', { attributes: { 'data-variant': 'secondary' } });
      const cleared = ve.apply('#ve-inspect', { attributes: { 'data-variant': null } });
      return { first: first.tag, text: text.text, variant: variant.attributes['data-variant'], cleared: cleared.attributes['data-variant'] ?? null, html: ve.html('#ve-inspect') };
    });
    assert.equal(r.first, 'h3');
    assert.equal(r.text, 'Ready to <b>launch</b>?');
    assert.ok(r.html.includes('Ready to &lt;b&gt;launch&lt;/b&gt;?'), 'the text is escaped, not parsed');
    assert.equal(r.variant, 'secondary');
    assert.equal(r.cleared, null);
  });

  await check('apply() refuses an on* handler and a javascript: URL; a non-text element refuses text', async () => {
    const r = await page.evaluate(() => {
      const ve = (globalThis as any).df$.shadcn.visualEditor;
      const tryIt = (fn: () => unknown) => {
        try {
          fn();
          return 'applied';
        } catch (e) {
          return (e as Error).message;
        }
      };
      ve.select('#ve-inspect', '0.1');
      return {
        handler: tryIt(() => ve.apply('#ve-inspect', { attributes: { onclick: 'alert(1)' } })),
        url: tryIt(() => ve.apply('#ve-inspect', { attributes: { href: 'javascript:alert(1)' } })),
        container: (ve.select('#ve-inspect', '0'), tryIt(() => ve.apply('#ve-inspect', { text: 'x' }))),
      };
    });
    assert.match(r.handler, /not editable/);
    assert.match(r.url, /must not run code/);
    assert.match(r.container, /text-only/);
  });

  await check('the parser drops <script>, on* handlers and javascript: URLs from a page', async () => {
    const html = await page.evaluate(() => {
      const ve = (globalThis as any).df$.shadcn.visualEditor;
      ve.setHtml('#ve-inspect', '<p onclick="alert(1)">Hi <a href="javascript:alert(2)">there</a></p><script>alert(3)</script>');
      return ve.html('#ve-inspect');
    });
    assert.ok(!/onclick|javascript:|<script/i.test(html), html);
    assert.ok(html.includes('Hi'), html);
  });

  await check('nothing that runs gets in - srcdoc, an obfuscated javascript: URL, data: documents, object / embed / base, an SVG animation of an href, a template\'s content - through setHtml, insert and replace; an image data: URL stays', async () => {
    const r = await page.evaluate(async () => {
      const ve = (globalThis as any).df$.shadcn.visualEditor;
      const T = '#ve-inspect';
      const bad = (n: number) =>
        `<iframe srcdoc="&lt;script&gt;top.__ran = (top.__ran || []).concat('srcdoc ${n}')&lt;/script&gt;"></iframe>` +
        `<a href=" JAVA&#9;SCRIPT:top.__ran=1">a</a><a href="data:text/html,x">b</a><iframe src="data:text/html,&lt;b&gt;x&lt;/b&gt;"></iframe>` +
        '<object data="x.swf"></object><embed src="x.swf"><base href="https://example.com/">' +
        '<svg><a><set attributeName="href" to="javascript:alert(1)"></set><text>t</text></a></svg>' +
        '<template><p onclick="alert(1)">tpl</p><script>alert(1)</script></template>' +
        '<img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">';
      ve.setHtml(T, `<main>${bad(1)}</main>`);
      const set = ve.html(T);
      ve.select(T, '0');
      ve.insert(T, bad(2));
      ve.select(T, '0');
      ve.replace(T, `<main>${bad(3)}</main>`);
      const all = ve.html(T);
      await new Promise((res) => setTimeout(res, 600));
      return { set, all, ran: (globalThis as any).__ran ?? null };
    });
    for (const html of [r.set, r.all]) {
      assert.doesNotMatch(html, /srcdoc|javascript|data:text|<object|<embed|<base|<set\b|onclick|<script/i, html);
      assert.match(html, /<img alt="" src="data:image\/gif;base64,/, 'an image data: URL stays');
      assert.match(html, /<template><p>tpl<\/p><\/template>/, "a template's content is cleaned, not lost");
    }
    assert.equal(r.ran, null, 'no script ran');
  });

  await check('the markup is the whole page: html() of one editor loads into another (setHtml) as the same page, history cleared', async () => {
    const r = await page.evaluate(() => {
      const ve = (globalThis as any).df$.shadcn.visualEditor;
      ve.setHtml('#ve-inspect', ve.html('#ve-project'));
      return { same: ve.html('#ve-inspect') === ve.html('#ve-project'), undo: ve.undo('#ve-inspect') };
    });
    assert.deepEqual(r, { same: true, undo: false });
  });

  await check('outline(): the element tree with its paths and labels; select(path) selects from it; neither names an id the markup never had', async () => {
    await page.reload();
    await waitReady(page);
    const r = await page.evaluate(() => {
      const ve = (globalThis as any).df$.shadcn.visualEditor;
      const outline = ve.outline('#ve-project');
      return {
        root: outline[0].label,
        labels: outline[0].children.map((n: any) => `${n.path} ${n.label}`),
        rootId: 'id' in ve.select('#ve-project', '0').attributes,
        selected: ve.select('#ve-project', '0.2').tag,
      };
    });
    // the styled <section> has no id in the markup - GrapesJS made one for the rule it keeps the style in
    assert.equal(r.root, 'section');
    assert.equal(r.rootId, false);
    assert.deepEqual(r.labels, ['0.0 h3.h3', '0.1 p.text-muted-foreground', '0.2 button.btn']);
    assert.equal(r.selected, 'button');
  });

  await check('lock(): one unit - its parts are not changed, copied or removed and lose those tools, a block goes after it, Undo keeps the lock; replace() swaps it in place, still locked; lock(false) releases it', async () => {
    const r = await page.evaluate(() => {
      const ve = (globalThis as any).df$.shadcn.visualEditor;
      const T = '#ve-project';
      const out: Record<string, any> = { locked: ve.lock(T, '0'), missing: ve.lock(T, '9') };
      ve.select(T, '0.2'); // the button: a part of the unit
      out.unit = ve.selection(T).unit;
      out.tools = (ve.editor(T).getSelected().get('toolbar') ?? []).map((t: any) => String(t.command)).filter((c: string) => c.startsWith('tlb-'));
      try {
        ve.apply(T, { text: 'Changed' });
        out.apply = 'applied';
      } catch (e) {
        out.apply = (e as Error).message;
      }
      out.remove = ve.remove(T);
      out.duplicate = ve.duplicate(T);
      out.inserted = ve.insert(T, '<p class="after">after the unit</p>');
      out.html = ve.html(T);
      ve.undo(T);
      ve.select(T, '0.1');
      out.kept = ve.selection(T).unit;
      ve.select(T, '0');
      out.replaced = ve.replace(T, '<section style="padding: 1.5rem"><h3 class="h3">Team</h3><p>For everyone.</p></section>');
      out.after = ve.html(T);
      ve.select(T, '0.0');
      out.stillLocked = ve.selection(T).unit;
      ve.lock(T, '0', false);
      ve.select(T, '0.0');
      out.released = ve.selection(T).unit;
      ve.select(T, null); // the checks after this one start from no selection
      return out;
    });
    assert.equal(r.locked, true);
    assert.equal(r.missing, false);
    assert.equal(r.unit, '0');
    assert.deepEqual(r.tools, []);
    assert.match(r.apply, /locked/);
    assert.equal(r.remove, false);
    assert.equal(r.duplicate, false);
    assert.equal(r.inserted, 1);
    assert.match(r.html, /<\/section>\s*<p class="after">after the unit<\/p>/, 'the block goes after the unit, not into it');
    assert.equal(r.kept, '0', 'an undo keeps the lock');
    assert.equal(r.replaced.path, '0');
    assert.equal(r.replaced.unit, '0');
    assert.match(r.after, /^<section style="padding: 1.5rem"><h3 class="h3">Team<\/h3><p>For everyone.<\/p><\/section>/);
    assert.equal(r.stillLocked, '0');
    assert.equal(r.released, null);
  });

  await check('events: visual-editor-select reports the selection, visual-editor-change the page after a change (debounced)', async () => {
    const r = await page.evaluate(async () => {
      const ve = (globalThis as any).df$.shadcn.visualEditor;
      const el = document.getElementById('ve-project')!;
      const got: { select?: unknown; change?: string } = {};
      el.addEventListener('visual-editor-select', (e) => (got.select = (e as CustomEvent).detail.selection?.tag));
      el.addEventListener('visual-editor-change', (e) => (got.change = (e as CustomEvent).detail.html));
      ve.select('#ve-project', '0.0');
      ve.insert('#ve-project', '<p class="added">Added</p>');
      await new Promise((res) => setTimeout(res, 400));
      return got;
    });
    assert.equal(r.select, 'h3');
    assert.ok(String(r.change).includes('Added'), String(r.change));
  });

  await check('readonly: the authored data-readonly canvas is inert; device phone is 390px wide; the device select drives the state', async () => {
    const r = await page.evaluate(() => {
      const el = document.getElementById('ve-phone')!;
      const frame = (globalThis as any).df$.shadcn.visualEditor.editor(el).Canvas.getFrameEl() as HTMLIFrameElement;
      const s = el.api!.getState();
      return { state: { name: s.name, config: s.config }, inert: (el.querySelector('.visual-editor-canvas') as HTMLElement).inert, width: Math.round(frame.getBoundingClientRect().width) };
    });
    assert.deepEqual(r.state, { name: 'readonly', config: { device: 'phone' } });
    assert.equal(r.inert, true);
    assert.equal(r.width, 390);
    await page.selectOption('#ctl-device', 'tablet');
    const after = await page.evaluate(() => {
      const el = document.getElementById('ve-phone')!;
      const s = el.api!.getState();
      return { state: { name: s.name, config: s.config }, attr: el.dataset.device };
    });
    assert.deepEqual(after, { state: { name: 'readonly', config: { device: 'tablet' } }, attr: 'tablet' });
    await page.evaluate(() => document.getElementById('ve-phone')!.api!.setState('default', { device: 'desktop' }));
    const editable = await page.evaluate(() => ({
      inert: (document.querySelector('#ve-phone .visual-editor-canvas') as HTMLElement).inert,
      readonly: document.getElementById('ve-phone')!.hasAttribute('data-readonly'),
      device: document.getElementById('ve-phone')!.hasAttribute('data-device'),
    }));
    assert.deepEqual(editable, { inert: false, readonly: false, device: false });
  });

  await check('dark mode: the host page\'s .dark reaches every canvas', async () => {
    const r = await page.evaluate(async () => {
      document.documentElement.classList.add('dark');
      await new Promise((res) => setTimeout(res, 50));
      const dark = [...document.querySelectorAll('.visual-editor')].map((el) => (globalThis as any).df$.shadcn.visualEditor.editor(el).Canvas.getDocument().documentElement.classList.contains('dark'));
      document.documentElement.classList.remove('dark');
      return dark;
    });
    assert.deepEqual(r, [true, true, true, true]);
  });

  await check('no page errors', async () => {
    assert.deepEqual(errors, []);
  });

  await check('render(): reproduces the authored markup 1:1 and every state', async () => {
    await assertRenderContract(page, '.visual-editor[id]', ['default', 'readonly'], {
      runtimeAttrs: ['data-ready', 'data-error'],
      runtimeOwned: '.visual-editor-canvas',
      settled: '.visual-editor:not([data-ready]):not([data-error])',
    });
  });
} finally {
  await browser.close();
  server.stop();
}

if (failures) {
  console.error(`visual-editor.e2e: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('visual-editor.e2e: all checks passed');
