import assert from 'node:assert/strict';
import { cssSmoke } from './lib/css-smoke.ts';
import { assertLegibleDisabled } from './lib/disabled.ts';

/**
 * Why: the plain file-input is CSS only - verify the 36px (md-step) control frame and that the
 * ::file-selector-button pseudo-element gets the muted fill + divider the
 * sheet defines, plus disabled dimming. The .file-drop zone is
 * scripted: filtering, appending, the list, the drag highlight and the
 * State API run against the real dist/ files.
 */
await cssSmoke('file-input', [
  {
    label: '.file-input is a 36px bordered control (md default)',
    selector: '#fi-default',
    css: { height: '36px', 'border-top-width': '1px', 'font-size': '14px', padding: '0px', cursor: 'pointer' },
  },
  {
    label: '::file-selector-button is full-height, muted, right-divided',
    run: async (page) => {
      const btn = await page.evaluate(() => {
        const s = getComputedStyle(document.querySelector('#fi-default')!, '::file-selector-button');
        return { height: s.height, 'border-right-width': s.borderRightWidth, cursor: s.cursor };
      });
      // computed style resolves the author's `height: calc(100% + 2px)` to the
      // 36px border-box (flush with the frame, no 1px gaps above/below)
      assert.equal(btn.height, '36px', 'button fills the control height');
      assert.equal(btn['border-right-width'], '1px', 'divider between button and file name');
      assert.equal(btn.cursor, 'pointer');
    },
  },
  {
    label: 'disabled file input stays legible: full --input border, muted surface + text, not-allowed',
    run: (page) => assertLegibleDisabled(page, { control: '#fi-disabled', tokens: { 'border-top-color': '--input', 'background-color': '--muted', color: '--muted-foreground' } }),
  },
  {
    label: 'a squeezed file input keeps a readable width for the file name (min 24rem)',
    run: async (page) => {
      const w = await page.evaluate(() => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;width:900px';
        row.innerHTML = '<span style="flex:1 0 800px">wide sibling</span><input type="file" class="file-input" style="flex:0 1 auto;width:auto">';
        document.body.append(row);
        const width = row.querySelector('input')!.getBoundingClientRect().width;
        row.remove();
        return width;
      });
      assert.equal(w, 384);
    },
  },

  { label: 'file-input: data-size="xs" geometry', selector: '#z-fileinput-xs', css: { 'height': '28px' } },
  { label: 'file-input: data-size="sm" geometry', selector: '#z-fileinput-sm', css: { 'height': '32px' } },
  { label: 'file-input: data-size="md" geometry', selector: '#z-fileinput-md', css: { 'height': '36px' } },
  { label: 'file-input: data-size="lg" geometry', selector: '#z-fileinput-lg', css: { 'height': '44px' } },
  { label: 'file-input: data-size="xl" geometry', selector: '#z-fileinput-xl', css: { 'height': '52px' } },
  {
    label: 'drop zone: the invisible native input covers the whole card (click + drop target)',
    run: async (page) => {
      await page.waitForFunction(() => document.querySelectorAll('.file-drop[data-init]').length === 3);
      const r = await page.evaluate(() => {
        const z = document.querySelector('#fd .file-drop-zone')!.getBoundingClientRect();
        const i = document.getElementById('fd-input')!;
        const b = i.getBoundingClientRect();
        return { same: Math.abs(z.width - b.width) <= 4 && Math.abs(z.height - b.height) <= 4 && Math.abs(z.left - b.left) <= 2 && Math.abs(z.top - b.top) <= 2, opacity: getComputedStyle(i).opacity, border: getComputedStyle(document.querySelector('#fd .file-drop-zone')!).borderTopStyle, state: (document.getElementById('fd') as HTMLElement).dataset.stateName };
      });
      assert.ok(r.same, 'input covers the zone (inside its 2px border)');
      assert.equal(r.opacity, '0'); assert.equal(r.border, 'dashed'); assert.equal(r.state, 'default');
    },
  },
  {
    label: 'drop zone: accepted files are listed (preview / extension, name, Intl size), rejected ones named',
    run: async (page) => {
      await page.setInputFiles('#fd-input', [
        { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) },
        { name: 'notes.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(1500) },
        { name: 'archive.zip', mimeType: 'application/zip', buffer: Buffer.alloc(10) },
        { name: 'huge.png', mimeType: 'image/png', buffer: Buffer.alloc(5000) },
      ]);
      const r = await page.evaluate(() => ({
        names: [...document.querySelectorAll('#fd .file-drop-name')].map((n) => n.firstChild!.textContent),
        metas: [...document.querySelectorAll('#fd .file-drop-meta')].map((n) => n.textContent),
        thumbs: [...document.querySelectorAll('#fd .file-drop-thumb')].map((t) => (t.querySelector('img') ? 'img' : t.textContent)),
        files: [...(document.getElementById('fd-input') as HTMLInputElement).files!].map((f) => f.name),
        error: document.querySelector('#fd .file-drop-error')!.textContent,
        role: document.querySelector('#fd .file-drop-error')!.getAttribute('role'),
        state: (document.getElementById('fd') as HTMLElement).dataset.stateName,
      }));
      assert.deepEqual(r.names, ['photo.png', 'notes.pdf']);
      assert.deepEqual(r.files, ['photo.png', 'notes.pdf'], 'input.files holds only the accepted files');
      assert.deepEqual(r.thumbs, ['img', 'pdf']);
      assert.equal(r.metas[1], '1.5 kB');
      assert.ok(r.error!.includes('archive.zip (type)') && r.error!.includes('huge.png (over 2 kB)'), r.error!);
      assert.equal(r.role, 'alert'); assert.equal(r.state, 'error');
    },
  },
  {
    label: 'drop zone: a second pick appends (duplicates skipped), data-max-files caps it',
    run: async (page) => {
      await page.setInputFiles('#fd-input', [
        { name: 'b.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(100) },
        { name: 'c.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(100) },
      ]);
      const r = await page.evaluate(() => ({ files: [...(document.getElementById('fd-input') as HTMLInputElement).files!].map((f) => f.name), error: document.querySelector('#fd .file-drop-error')!.textContent }));
      assert.deepEqual(r.files, ['photo.png', 'notes.pdf', 'b.jpg']);
      assert.ok(r.error!.includes('c.jpg (max 3)'), r.error!);
    },
  },
  {
    label: 'drop zone: remove buttons drop a file from input.files; the last one empties the list',
    run: async (page) => {
      await page.click('#fd .file-drop-item:nth-child(2) .file-drop-remove');
      let names = await page.evaluate(() => [...(document.getElementById('fd-input') as HTMLInputElement).files!].map((f) => f.name));
      assert.deepEqual(names, ['photo.png', 'b.jpg']);
      assert.equal(await page.getAttribute('#fd .file-drop-item:nth-child(1) .file-drop-remove', 'aria-label'), 'Remove photo.png');
      await page.click('#fd .file-drop-item:nth-child(1) .file-drop-remove');
      await page.click('#fd .file-drop-item:nth-child(1) .file-drop-remove');
      names = await page.evaluate(() => [...(document.getElementById('fd-input') as HTMLInputElement).files!].map((f) => f.name));
      assert.deepEqual(names, []);
      assert.equal(await page.$eval('#fd .file-drop-list', (l) => getComputedStyle(l).display), 'none');
      assert.equal(await page.$eval('#fd', (e) => (e as HTMLElement).dataset.stateName), 'default');
    },
  },
  {
    label: 'drop zone: without multiple a new pick replaces the old one',
    run: async (page) => {
      await page.setInputFiles('#fd-one-input', [{ name: 'a.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(10) }]);
      await page.setInputFiles('#fd-one-input', [{ name: 'b.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(10) }]);
      const names = await page.evaluate(() => [...(document.getElementById('fd-one-input') as HTMLInputElement).files!].map((f) => f.name));
      assert.deepEqual(names, ['b.pdf']);
    },
  },
  {
    label: 'drop zone: dragging files over highlights it (dragover), leaving restores',
    run: async (page) => {
      const dt = await page.evaluateHandle(() => { const d = new DataTransfer(); d.items.add(new File(['x'], 'x.png', { type: 'image/png' })); return d; });
      await page.dispatchEvent('#fd .file-drop-zone', 'dragenter', { dataTransfer: dt });
      const over = await page.evaluate(() => ({ state: (document.getElementById('fd') as HTMLElement).dataset.stateName, border: getComputedStyle(document.querySelector('#fd .file-drop-zone')!).borderTopStyle }));
      assert.deepEqual(over, { state: 'dragover', border: 'solid' });
      await page.dispatchEvent('#fd .file-drop-zone', 'dragleave', { dataTransfer: dt });
      assert.equal(await page.$eval('#fd', (e) => (e as HTMLElement).dataset.stateName), 'default');
    },
  },
  {
    label: 'drop zone: data-size="sm" is one row (icon beside the text)',
    run: async (page) => {
      const r = await page.evaluate(() => {
        const i = document.querySelector('#fd-sm .file-drop-icon')!.getBoundingClientRect();
        const t = document.querySelector('#fd-sm .file-drop-title')!.getBoundingClientRect();
        return { beside: t.left > i.right, cols: getComputedStyle(document.querySelector('#fd-sm .file-drop-zone')!).gridTemplateColumns.split(' ').length };
      });
      assert.ok(r.beside); assert.equal(r.cols, 2);
    },
  },
  {
    label: "state API: setState('selected' | 'error' | 'dragover' | 'default'), getState, unknown throws, registry",
    run: async (page) => {
      const r = await page.evaluate(() => {
        const el = document.getElementById('fd') as HTMLElement & { api: { setState(n: string, c?: object): void; getState(): { name: string; config: { count: number; files: string[] } } } };
        el.api.setState('selected', { files: [{ name: 'cv.pdf', size: 1200, type: 'application/pdf' }] });
        const sel = el.api.getState();
        const listed = document.querySelectorAll('#fd .file-drop-item').length;
        el.api.setState('error', { message: 'Nope' });
        const err = [el.dataset.stateName, document.querySelector('#fd .file-drop-error')!.textContent];
        el.api.setState('dragover');
        const drag = el.dataset.stateName;
        el.api.setState('default');
        const def = el.api.getState();
        let thrown = '';
        try { el.api.setState('nope'); } catch (e) { thrown = String(e); }
        const g = globalThis as unknown as { df$: { shadcn: { fileInputStates?: string[]; fileInputApi?: object } } };
        return { sel, listed, err, drag, def, thrown, states: g.df$.shadcn.fileInputStates, api: !!g.df$.shadcn.fileInputApi };
      });
      assert.equal(r.sel.name, 'selected'); assert.deepEqual(r.sel.config.files, ['cv.pdf']); assert.equal(r.listed, 1);
      assert.deepEqual(r.err, ['error', 'Nope']);
      assert.equal(r.drag, 'dragover');
      assert.equal(r.def.name, 'default'); assert.equal(r.def.config.count, 0);
      assert.ok(r.thrown.includes('unknown state'));
      assert.deepEqual(r.states, ['default', 'dragover', 'selected', 'error']); assert.ok(r.api);
    },
  },
]);
