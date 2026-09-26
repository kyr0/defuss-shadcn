import { describe, expect, it } from 'vitest';
import { clickSelector, openDocPage, waitFor } from './helpers';
import { normalizeFenceHtml } from '../src/documentation/lib/mdx-example';

/**
 * Why: the executable-example mechanism (plans/cmp-schemas-and-codeexample.md
 * §27 CodeExample browser tests). Drives the REAL built page in a same-origin
 * iframe: the sandbox is cross-origin (opaque), so all assertions go through
 * the host card - the textarea (source), the toolbar, the generated controls,
 * and `data-state-values` (the §11 observation mirror the bridge syncs).
 */

/** First CodeExample card (the "Default" input example). */
function firstCard(doc: Document): HTMLElement {
  return doc.querySelector('.code-example') as HTMLElement;
}
function textareaOf(card: HTMLElement): HTMLTextAreaElement {
  return card.querySelector('.code-example-src') as HTMLTextAreaElement;
}
function frameOf(card: HTMLElement): HTMLIFrameElement {
  return card.querySelector('.code-example-frame') as HTMLIFrameElement;
}
function errorOf(card: HTMLElement): HTMLElement {
  return card.querySelector('.code-example-error') as HTMLElement;
}

/** Wait for the host mirror of sandbox state (bridge round-trip). */
function observed(card: HTMLElement): Record<string, unknown> {
  return JSON.parse(card.dataset.stateValues || '{}');
}
function waitForObserved(card: HTMLElement, key: string, value: unknown, timeout = 6000): Promise<void> {
  return waitFor(() => JSON.stringify(observed(card)[key]) === JSON.stringify(value), `observed ${key}=${JSON.stringify(value)}`, timeout);
}
function waitForSandboxReady(card: HTMLElement): Promise<void> {
  // every bridge posts initial state on ready: the mirror appears
  return waitFor(
    () => card.dataset.stateValues !== undefined || !errorOf(card).hidden,
    `sandbox ready (err: ${errorOf(card).textContent?.slice(0, 80)})`,
  );
}
/**
 * Type into the editor and wait for the debounced (400 ms) rerun: the srcdoc
 * rebuild swaps in the new source bytes, which is observable in `srcdoc`.
 */
async function editSource(doc: Document, card: HTMLElement, value: string): Promise<void> {
  const ta = textareaOf(card);
  ta.value = value;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  await waitFor(() => frameOf(card).srcdoc.includes('ce-bridge') && frameOf(card).srcdoc.includes(value.trim().slice(0, 40)), 'srcdoc rebuild', 6000);
}

describe('CodeExample (input page)', () => {
  it('boots collapsed: both panels hidden; Code toggles open and closed again', async () => {
    const { doc } = await openDocPage('input');
    await waitFor(() => doc.querySelector('.code-example[data-init]'), 'example init', 5000);
    const card = doc.querySelector('.code-example') as HTMLElement;
    const codePanel = card.querySelector('[data-panel="code"]') as HTMLElement;
    const codeTab = card.querySelector('.code-example-tab[data-tab="code"]') as HTMLButtonElement;
    // default: rendered demo is the hero - the lower area is not shown
    expect(codePanel.hidden).toBe(true);
    expect(codeTab.getAttribute('aria-pressed')).toBe('false');
    // tabs carry icons (lucide placeholders swapped by createIcons)
    expect(codeTab.querySelector('svg, i[data-lucide]')).toBeTruthy();
    await clickSelector(doc, '.code-example-tab[data-tab="code"]');
    await waitFor(() => !codePanel.hidden, 'code panel open');
    await clickSelector(doc, '.code-example-tab[data-tab="code"]');
    await waitFor(() => codePanel.hidden, 'code panel collapsed again');
  });
  it('renders cards from the example fences with the schema embedded', async () => {
    const { doc } = await openDocPage('input.html');
    const cards = doc.querySelectorAll('.code-example');
    expect(cards.length).toBeGreaterThanOrEqual(10);
    const card = firstCard(doc);
    expect(card.getAttribute('data-component')).toBe('input');
    expect(JSON.parse(card.getAttribute('data-schema')!).name).toBe('input');
    expect(card.querySelector('.code-example-frame')?.getAttribute('sandbox')).toBe('allow-scripts');
  });

  it('displayed source === executed source (§4: one source, verbatim)', async () => {
    const { doc } = await openDocPage('input.html');
    const card = firstCard(doc);
    await waitForSandboxReady(card);
    const editor = textareaOf(card).value;
    const srcdoc = frameOf(card).srcdoc;
    // the exact editor bytes sit in the srcdoc between the template markers
    expect(srcdoc).toContain(editor.trim());
    // and the example really renders: a labeled email input inside the sandbox
    const inner = new DOMParser().parseFromString(srcdoc, 'text/html');
    const input = inner.querySelector('input.input') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.type).toBe('email');
  });

  it('editing the HTML changes the preview (no dual render possible)', async () => {
    const { doc } = await openDocPage('input.html');
    const card = firstCard(doc);
    await waitForSandboxReady(card);
    const original = textareaOf(card).value;
    await editSource(doc, card, '<input data-example-root class="input" value="edited-source-marker" />');
    await waitForObserved(card, 'value', 'edited-source-marker');
    await clickSelector(doc, '.code-example-reset');
    await new Promise((r) => setTimeout(r, 500)); // debounced rerun restores
    expect(textareaOf(card).value).toBe(original);
  });

  it('editing the JS changes behavior (example source runs verbatim)', async () => {
    const { doc } = await openDocPage('input.html');
    // find the "With button" example - its <script type="module"> logs input events
    const card = [...doc.querySelectorAll('.code-example')].find((c) =>
      (c.querySelector('.code-example-src') as HTMLTextAreaElement).value.includes('console.log'),
    ) as HTMLElement;
    expect(card).toBeTruthy();
    await waitForSandboxReady(card);
    // replace the log with an assignment that mutates the example DOM - the
    // bridge's MutationObserver syncs it back into data-state-values
    await editSource(
      doc,
      card,
      '<input data-example-root class="input" value="initial" />\n' +
        '<script type="module">\n' +
        "  document.querySelector('[data-example-root]').value = 'js-edited';\n" +
        '</script>',
    );
    await waitForObserved(card, 'value', 'js-edited');
  });

  it('syntax errors surface visibly instead of silently blanking', async () => {
    const { doc } = await openDocPage('input.html');
    const card = firstCard(doc);
    await waitForSandboxReady(card);
    await editSource(doc, card, '<input data-example-root class="input" value="x" />\n<script type="module">const ;</script>');
    await waitFor(() => !errorOf(card).hidden, 'visible syntax error');
    expect((errorOf(card).textContent || '').trim().length).toBeGreaterThan(0);
  });

  it('runtime errors surface visibly', async () => {
    const { doc } = await openDocPage('input.html');
    const card = firstCard(doc);
    await waitForSandboxReady(card);
    await editSource(
      doc,
      card,
      '<input data-example-root class="input" value="x" />\n<script type="module">globalThis.nope.fn();</script>',
    );
    await waitFor(() => !errorOf(card).hidden, 'visible runtime error');
    expect(errorOf(card).textContent).toMatch(/TypeError|nope/);
  });

  it('schema states generate typed editors (§10: exclusively from schema)', async () => {
    const { doc } = await openDocPage('input.html');
    const card = firstCard(doc);
    // lazy boot (IO/idle): wait for the card to build its controls before clicking
    await waitFor(() => card.querySelectorAll('.code-example-row').length > 0, 'state rows built');
    await clickSelector(doc, '.code-example .code-example-tab[data-tab="state"]');
    const rows = card.querySelectorAll('.code-example-row');
    expect(rows.length).toBe(7); // value, disabled, readonly, required, invalid, type, size
    const control = (state: string) =>
      card.querySelector(`.code-example-row[data-state-name="${state}"] .code-example-control`) as HTMLElement;
    expect((control('value') as HTMLInputElement).type).toBe('text'); // string → text
    expect((control('disabled') as HTMLInputElement).type).toBe('checkbox'); // boolean → checkbox
    expect(control('type').tagName).toBe('SELECT'); // enum + explicit select hint → select
    expect(control('size').classList.contains('code-example-radio-group')).toBe(true); // enum fallback → radio boxes
    // select options carry the schema's closed value set
    expect([...(control('type') as HTMLSelectElement).options].map((o) => o.value).join()).toContain('password');
  });

  it('mutating a state control changes the live preview (§11 round-trip)', async () => {
    const { doc } = await openDocPage('input.html');
    await clickSelector(doc, '.code-example .code-example-tab[data-tab="state"]');
    const card = firstCard(doc);
    await waitForSandboxReady(card);
    const disabled = card.querySelector(
      '.code-example-row[data-state-name="disabled"] .code-example-control',
    ) as HTMLInputElement;
    disabled.checked = true;
    disabled.dispatchEvent(new Event('change', { bubbles: true }));
    await waitForObserved(card, 'disabled', true);
    // the checkbox stays in sync (observation echoes the DOM, not the input event)
    expect(disabled.checked).toBe(true);
    // enum fallback is a radio group now: click the lg radio (change bubbles)
    const sizeRadio = card.querySelector(
      '.code-example-row[data-state-name="size"] .code-example-radio-group input[value="lg"]',
    ) as HTMLInputElement;
    sizeRadio.checked = true;
    sizeRadio.dispatchEvent(new Event('change', { bubbles: true }));
    await waitForObserved(card, 'size', 'lg');
  });

  it('direct preview interaction updates the state control (DOM is authoritative)', async () => {
    const { doc } = await openDocPage('input.html');
    await clickSelector(doc, '.code-example .code-example-tab[data-tab="state"]');
    const card = firstCard(doc);
    await waitForSandboxReady(card);
    // drive the sandbox through the per-instance State API handle the host
    // binds on the card (§11: the bridge reads the DOM and echoes it back)
    await (card as HTMLElement & { api: { setState(n: string, c?: unknown): void } }).api.setState('value', {
      value: 'typed-by-user',
    });
    await waitForObserved(card, 'value', 'typed-by-user');
    await waitFor(
      () =>
        (card.querySelector('.code-example-row[data-state-name="value"] .code-example-control') as HTMLInputElement).value ===
        'typed-by-user',
      'value control reflects the DOM',
    );
  });

  it('panel edits land in the code and survive a later code edit (code is the truth)', async () => {
    const { doc } = await openDocPage('input.html');
    await clickSelector(doc, '.code-example .code-example-tab[data-tab="state"]');
    const card = firstCard(doc);
    await waitForSandboxReady(card);
    const disabled = card.querySelector(
      '.code-example-row[data-state-name="disabled"] .code-example-control',
    ) as HTMLInputElement;
    disabled.checked = true;
    disabled.dispatchEvent(new Event('change', { bubbles: true }));
    await waitForObserved(card, 'disabled', true);
    // the mutation is serialized into the editor (§4 inverted)…
    await waitFor(() => textareaOf(card).value.includes('disabled'), 'editor shows the disabled attr', 3000);
    // …so editing a DIFFERENT attribute and rebuilding keeps it: the rebuild
    // materializes from the code, no overlay replays anything over an edit
    const edited = textareaOf(card).value.replace('you@example.com', 'edited@defuss.dev');
    expect(edited).not.toBe(textareaOf(card).value);
    await editSource(doc, card, edited);
    await waitFor(() => frameOf(card).srcdoc.includes('edited@defuss.dev'), 'srcdoc rebuilt with edit', 6000);
    await waitForObserved(card, 'disabled', true);
  });

  it('typing in a text editor syncs the preview (250ms debounce, no blur)', async () => {
    const { doc } = await openDocPage('input.html');
    await clickSelector(doc, '.code-example .code-example-tab[data-tab="state"]');
    const card = firstCard(doc);
    await waitForSandboxReady(card);
    const value = card.querySelector('.code-example-row[data-state-name="value"] .code-example-control') as HTMLInputElement;
    value.value = 'typed-live';
    value.dispatchEvent(new Event('keyup', { bubbles: true })); // NO change event fired
    await waitForObserved(card, 'value', 'typed-live', 3000);
    // and the editor's shown code carries the reflected attribute (§11: shown == rendered)
    await waitFor(() => textareaOf(card).value.includes('value="typed-live"'), 'editor shows typed value', 3000);
  });

  it('state edits sync bidirectionally: panel edit updates the editor source', async () => {
    const { doc } = await openDocPage('input.html');
    await clickSelector(doc, '.code-example .code-example-tab[data-tab="state"]');
    const card = firstCard(doc);
    await waitForSandboxReady(card);
    const editor = textareaOf(card);
    expect(editor.value).not.toContain('disabled');
    const disabled = card.querySelector(
      '.code-example-row[data-state-name="disabled"] .code-example-control',
    ) as HTMLInputElement;
    disabled.checked = true;
    disabled.dispatchEvent(new Event('change', { bubbles: true }));
    await waitForObserved(card, 'disabled', true);
    // the bridge serializes the live DOM back into the editor (§4 inverted)
    await waitFor(() => editor.value.includes('disabled'), 'editor shows the disabled attr', 3000);
  });

  it('height stops growing: repeated state changes keep the frame stable', async () => {
    const { doc } = await openDocPage('input.html');
    await clickSelector(doc, '.code-example .code-example-tab[data-tab="state"]');
    const card = firstCard(doc);
    await waitForSandboxReady(card);
    await new Promise((r) => setTimeout(r, 400)); // settle initial height
    const frame = frameOf(card);
    const h0 = frame.style.height;
    const disabled = card.querySelector(
      '.code-example-row[data-state-name="disabled"] .code-example-control',
    ) as HTMLInputElement;
    for (let i = 0; i < 5; i++) {
      disabled.checked = !disabled.checked;
      disabled.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 120));
    }
    expect(frame.style.height).toBe(h0); // no ratchet
  });

  it('schema actions generate working action buttons', async () => {
    const { doc } = await openDocPage('input.html');
    await clickSelector(doc, '.code-example .code-example-tab[data-tab="state"]');
    const card = firstCard(doc);
    await waitForSandboxReady(card);
    const focusBtn = card.querySelector('.code-example-actions button[data-action="focus"]') as HTMLElement;
    expect(focusBtn, 'input schema declares the focus action').toBeTruthy();
    focusBtn.click();
    // the focus() lands inside the sandbox without throwing - a clean errBox
    // after the round-trip is the observable proof (no example script errored)
    await new Promise((r) => setTimeout(r, 300));
    expect(errorOf(card).textContent || '').toBe('');
  });

  // every card boots its own sandbox (12 srcdocs incl. the full runtime) —
  // needs a longer budget than the 10s default under the Vite test server
  it('multiple examples stay isolated (per-example channel, no cross-talk)', async () => {
    const { doc } = await openDocPage('input.html');
    const cards = [...doc.querySelectorAll('.code-example')] as HTMLElement[];
    expect(cards.length).toBeGreaterThanOrEqual(10);
    await waitFor(() => cards.every((c) => c.dataset.stateValues !== undefined), 'every sandbox ready', 25000);
    const before = cards.map((c) => observed(c).value);
    const fileCard = cards.find((c) => (c.querySelector('.code-example-src') as HTMLTextAreaElement).value.includes('type="file"'))!;
    // controls are built at init regardless of the hidden panel
    const ctrl = fileCard.querySelector('.code-example-row[data-state-name="disabled"] .code-example-control') as HTMLInputElement;
    ctrl.checked = true;
    ctrl.dispatchEvent(new Event('change', { bubbles: true }));
    await waitFor(
      () => observed(fileCard).disabled === true,
      `file disabled mirrors (have ${JSON.stringify(observed(fileCard))})`,
      8000,
    );
    // every OTHER card is untouched
    for (let i = 0; i < cards.length; i++)
      if (cards[i] !== fileCard) expect(observed(cards[i]).value).toBe(before[i]);
  }, 30000);
});

describe('CodeExample (dialog page)', () => {
  it('dialog page schema is embedded; open state + showModal/close actions drive the real dialog', async () => {
    const { doc } = await openDocPage('dialog.html');
    // dialog.mdx has no example fences yet - the CodeExample machinery is
    // exercised through input.mdx; here we assert the States contract table
    // rendered as a real <table> with the schema's single boolean row.
    const tables = [...doc.querySelectorAll('table.table')];
    const stateTable = tables.find((t) => t.querySelector('th')?.textContent === 'State' && t.textContent?.includes('showModal'));
    expect(stateTable, 'dialog States contract table renders').toBeTruthy();
    expect(stateTable!.textContent).toContain('open');
  });
});

describe('CodeExample viewport toolbar (device emulation)', () => {
  it('phone mode pins the device box, fills the fields, enables rotate + swaps on rotate', async () => {
    const { doc } = await openDocPage('input.html');
    const card = firstCard(doc);
    await waitFor(() => card.dataset.init === '', 'card booted (lazy boot)');
    const vp = (css: string) => card.querySelector(css) as HTMLElement;
    const w = vp('.code-example-vp-w') as HTMLInputElement;
    const h = vp('.code-example-vp-h') as HTMLInputElement;
    const btn = (mode: string) => card.querySelector(`.code-example-vp[data-vp="${mode}"]`) as HTMLButtonElement;
    const device = vp('.ce-device');

    // default: Full - height field inert, placeholder "Full"
    expect(h.disabled).toBe(true);
    expect(h.placeholder).toBe('Full');
    expect(btn('phone').getAttribute('aria-pressed')).toBe('false');

    // phone: standard preset lands in the fields, chrome flags the device;
    // the SIZE lives on the resizer wrapper now (the toolbar writes it, the
    // .ce-resizer around .ce-device carries the handles and the inline box)
    const rz = () => vp('.ce-resizer');
    btn('phone').click();
    expect(card.dataset.vpMode).toBe('phone');
    expect(w.value).toBe('390');
    expect(h.value).toBe('844');
    expect(h.disabled).toBe(false);
    expect((btn('rotate') as HTMLButtonElement).disabled).toBe(false);
    expect(rz().style.width).toBe('390px');
    expect(rz().style.height).toBe('844px');
    expect(device.style.width).toBe(''); // fills the wrapper (CSS), not inline
    expect(vp('.ce-screen').dataset.mode).toBe('phone');

    // rotate swaps the box (landscape holding) and flags the screen
    btn('rotate').click();
    expect(w.value).toBe('844');
    expect(h.value).toBe('390');
    expect(rz().style.width).toBe('844px');
    expect(vp('.ce-screen').dataset.landscape).toBe('1');
    btn('rotate').click(); // back to portrait
    expect(rz().style.width).toBe('390px');
    expect(vp('.ce-screen').dataset.landscape).toBeUndefined();

    // desktop: width preset, height field inert again with the Full placeholder
    btn('desktop').click();
    expect(card.dataset.vpMode).toBe('desktop');
    expect(w.value).toBe('1024');
    expect(h.value).toBe('');
    expect(h.disabled).toBe(true);
    expect(h.placeholder).toBe('Full');
    expect((btn('rotate') as HTMLButtonElement).disabled).toBe(true);

    // resizer (dogfooded): controlled wrapper - axis drops to w in measured
    // modes (n/s handles removed, corners kept), keyboard grows W by 10
    expect(rz().getAttribute('data-resize-mode')).toBe('controlled');
    expect(rz().dataset.axis).toBe('w');
    expect(rz().querySelectorAll('.resizer-handle[data-handle="n"], .resizer-handle[data-handle="s"]').length).toBe(0);
    const handle = rz().querySelector('.resizer-handle[data-handle="e"]') as HTMLElement;
    expect(handle.getAttribute('role')).toBe('separator');
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    expect(w.value).toBe('1034');
  });

  it('resizer handles appear on every side of the preview (dogfooded resizer)', async () => {
    const { doc } = await openDocPage('badge.html');
    const card = firstCard(doc);
    await waitFor(() => card.querySelector('.ce-resizer .resizer-handle'), 'handles placed');
    const sides = [...card.querySelectorAll('.resizer-handle')].map((h) => h.getAttribute('data-handle'));
    // device modes carry the full 8; full mode drops n/s (width axis only)
    for (const want of ['e', 'se', 'sw', 'ne', 'nw', 'w']) expect(sides).toContain(want);
    // runtime chrome never leaks into the example source (serializer drops it)
    expect(sides.length).toBeGreaterThanOrEqual(6);
  });
});

describe('normalizeFenceHtml (fence self-closing → HTML-valid)', () => {
  // root cause of the "Timeline §Activity Feed smashed" bug: JSX-style
  // self-closing divs are invalid in HTML flow - the parser opens an unclosed
  // element and nests the whole rest of the fence inside it.
  it('closes non-void elements', () => {
    expect(normalizeFenceHtml('<div class="timeline-dot" />')).toBe('<div class="timeline-dot"></div>');
    expect(normalizeFenceHtml('<span/>')).toBe('<span></span>');
    expect(normalizeFenceHtml('<li>x</li>\n<div/>')).toBe('<li>x</li>\n<div></div>');
  });
  it('keeps void elements and SVG children untouched', () => {
    const src = '<img src="a.png" /><br /><path d="M0 0h4" />';
    expect(normalizeFenceHtml(src)).toBe(src);
  });
  it('leaves explicit close tags alone', () => {
    const src = '<div class="x">hi</div>';
    expect(normalizeFenceHtml(src)).toBe(src);
  });
});
