/* -- Visual Editor ------------------------------------------------------ */
/* A thin adapter around GrapesJS (BSD-3-Clause), the drag-and-drop HTML   */
/* editor - zero editor bytes ship here. The element authors its page in a */
/* <script type="text/html" class="visual-editor-source"> (a data block:   */
/* inert, nothing in it starts); the first editor on a page loads the      */
/* pinned GrapesJS build                                                   */
/* and mounts it over that markup, styled by the host page's own sheets.   */
/* What it edits is the markup the component skills document: out of the   */
/* editor comes the same markup, inline styles back on their elements.     */
/* VERIFIED: (tmp/probe-grapes.ts, 2026-10-14) 234 of 239 components'      */
/* documented markup round-trips element-for-element; the plain video /    */
/* iframe types below take the rest but the invoice (visual-editor.e2e     */
/* pins the list). Telemetry is off: GrapesJS's default POSTs the page's   */
/* domain to app.grapesjs.com on every non-localhost host. The page is    */
/* HTML in and HTML out (no GrapesJS project JSON: its loader bypasses the */
/* parser that drops scripts, and kept generated ids as authored ones).    */

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js -
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent, sheetUrl } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

const visualEditorStates = ['default', 'readonly'];

/** The canvas widths the editor previews - the HTML Preview Editor's devices. */
export type VisualEditorDevice = 'desktop' | 'tablet' | 'phone';

// VERIFIED: (verify's API docs gate) the states below are exactly the declared ones, each
// described, and every config field typed, described and named in the code.
/** setState() configs per state. */
export interface VisualEditorStateConfigs {
  /** Editing: elements select, blocks drop, the changes of apply() land. */
  default: {
    /** the canvas width: desktop (the editor's width), tablet (834px) or phone (390px) */
    device?: VisualEditorDevice;
  };
  /** Read only: the page shows as authored - the canvas is inert, nothing selects, drops or edits. */
  readonly: {
    /** the canvas width: desktop, tablet or phone */
    device?: VisualEditorDevice;
  };
}

/** The selected element, as the editor holds it. */
export interface VisualEditorSelection {
  /** where it sits: child indexes from the page root, dot-joined ("0.2" = the third child of the first element) */
  path: string;
  /** its tag name, lowercase */
  tag: string;
  /** its attributes as the markup has them, except class (id, data-*, aria-*, ...) - never an id the editor made */
  attributes: Record<string, string>;
  /** its classes, in order */
  classes: string[];
  /** its text when it holds text only (a heading, a button label), else null */
  text: string | null;
  /** the path of the locked unit it belongs to (lock() - the element itself or an ancestor), null when it is free */
  unit: string | null;
}

/** A change to the selected element. */
export interface VisualEditorChange {
  /** attributes to set; null removes one (on* handlers and javascript: / data: / vbscript: URLs are refused) */
  attributes?: Record<string, string | null>;
  /** the classes, replacing the element's */
  classes?: string[];
  /** the text of a text-only element (written as text, never parsed as markup) */
  text?: string;
}

/** One element of the page outline - the tree a layers view shows. */
export interface VisualEditorNode {
  /** where it sits (the path select() takes) */
  path: string;
  /** the tag, its id (one the markup gave it) or first class: `section.card`, `input#email` */
  label: string;
  /** its child elements */
  children: VisualEditorNode[];
}

/** What visual-editor-change carries. */
export interface VisualEditorChangeDetail {
  /** the page markup after the change (html()) */
  html: string;
}

/** What visual-editor-select carries. */
export interface VisualEditorSelectDetail {
  /** the selected element, or null when the selection was cleared */
  selection: VisualEditorSelection | null;
}

/** What visual-editor-ready carries. */
export interface VisualEditorReadyDetail {
  /** the page markup the editor started with */
  html: string;
}

/** The pinned GrapesJS build the component loads (never @latest) - the UMD file, imported as a module: it installs
 *  globalThis.grapesjs. VERIFIED: (tmp/probe-grapes.ts) a dynamic import of it defines grapesjs.init, version 0.23.6. */
export const VISUAL_EDITOR_URL = 'https://cdn.jsdelivr.net/npm/grapesjs@0.23.6/dist/grapes.min.js';
/** GrapesJS's own stylesheet (the canvas frame, the selection badge and toolbar), pinned with the build. */
export const VISUAL_EDITOR_CSS_URL = 'https://cdn.jsdelivr.net/npm/grapesjs@0.23.6/dist/css/grapes.min.css';

/** the canvas widths per device - the HTML Preview Editor's phone and tablet */
const DEVICES = [
  { id: 'desktop', name: 'desktop', width: '' },
  { id: 'tablet', name: 'tablet', width: '834px', widthMedia: '834px' },
  { id: 'phone', name: 'phone', width: '390px', widthMedia: '390px' },
];

/** The part of a GrapesJS component this adapter uses. */
interface ModelLike {
  get(prop: string): unknown;
  set(props: Record<string, unknown>, opts?: { avoidStore?: boolean }): void;
  getId(): string;
  getStyle(): Record<string, unknown>;
  find(selector: string): ModelLike[];
  getAttributes(): Record<string, string>;
  addAttributes(attrs: Record<string, string>): void;
  removeAttributes(names: string[]): void;
  getClasses(): string[];
  setClass(classes: string[]): void;
  components(content?: string): CollectionLike;
  parent(): ModelLike | undefined;
  toHTML(): string;
  remove(): void;
  getEl(): HTMLElement | undefined;
}
interface CollectionLike {
  length: number;
  models: ModelLike[];
  add(content: string, opts?: { at?: number }): ModelLike | ModelLike[];
  indexOf(model: ModelLike): number;
}
/** The part of a GrapesJS editor this adapter uses. */
interface EditorLike {
  getHtml(opts?: { attributes?: (model: ModelLike, attrs: Record<string, string>) => Record<string, string> }): string;
  getCss(): string;
  setComponents(html: string): void;
  addComponents(html: string): ModelLike | ModelLike[];
  getSelected(): ModelLike | undefined;
  select(model: ModelLike | null): void;
  getWrapper(): ModelLike;
  setDevice(name: string): void;
  on(event: string, fn: (...args: unknown[]) => void): void;
  onReady(fn: () => void): void;
  getConfig(): Record<string, unknown>;
  UndoManager: { undo(): void; redo(): void; hasUndo(): boolean; hasRedo(): boolean; clear(): void };
  Canvas: { getDocument(): Document | undefined; startDrag(source: { content: string }): void; endDrag(): void };
  Components: { addType(id: string, def: Record<string, unknown>): void };
}
/** The global the GrapesJS build installs. */
interface GrapesLike {
  init(config: Record<string, unknown>): EditorLike;
  version?: string;
}

let engine: Promise<GrapesLike> | null = null;
/** link GrapesJS's stylesheet into the page once (it styles only the editor's own chrome, .gjs-*) */
function linkSheet(css: string): void {
  if (dfDollar('link[data-visual-editor-vendor]').length) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = css;
  link.dataset.visualEditorVendor = '';
  dfDollar(document.head).append(link);
}
/** import the pinned build once (the only dynamic import shipped code may contain - verify's vendor gate). The
 *  import runs a microtask later: Vitest's browser mode rewrites a dynamic import into a call that can throw synchronously
 *  in a fixture frame (the math components' finding) - a failure must reach the promise, never the caller. */
function loadEngine(url: string = VISUAL_EDITOR_URL, css: string = VISUAL_EDITOR_CSS_URL): Promise<GrapesLike> {
  if (!engine) {
    linkSheet(css);
    engine = Promise.resolve()
      .then(() => import(/* @vite-ignore */ url))
      .then(() => {
        const g = (globalThis as { grapesjs?: GrapesLike }).grapesjs;
        if (!g?.init) throw new Error('GrapesJS did not install globalThis.grapesjs');
        return g;
      });
    engine.catch(() => {
      engine = null;
    });
  }
  return engine;
}

/** GrapesJS gives <video> and <iframe> default attributes (allowfullscreen, frameborder) and an empty <table> a
 *  <tbody> the markup never had - plain types keep them as authored. VERIFIED: (tmp/probe-grapes-m0.ts P2;
 *  visual-editor.e2e "fidelity" - the invoice's empty .invoice-totals table) */
function plainTypes(editor: EditorLike): void {
  const types: [string, unknown][] = [
    ['video', false],
    ['iframe', false],
    ['table', ['thead', 'tbody', 'tfoot', 'tr', 'caption', 'colgroup']],
  ];
  for (const [tag, droppable] of types)
    editor.Components.addType(`plain-${tag}`, {
      extend: 'default',
      isComponent: (node: Element) => node.tagName?.toLowerCase() === tag,
      model: { defaults: { tagName: tag, droppable } },
    });
}

/** the host page's styles for the canvas: its stylesheets by URL (sheetUrl - the address may have moved), its
 *  <style> elements as text (a sandboxed preview inlines every sheet) - never GrapesJS's own */
function hostStyles(): { links: string[]; css: string } {
  const links = (dfDollar('link[rel="stylesheet"]').toArray() as HTMLLinkElement[])
    .filter((l) => !l.hasAttribute('data-visual-editor-vendor'))
    .map((l) => sheetUrl(l))
    .filter(Boolean);
  const css = (dfDollar('style').toArray() as HTMLStyleElement[]).map((s) => s.textContent ?? '').join('\n');
  return { links, css };
}

/** the markup the element authors: its <script type="text/html" class="visual-editor-source">, '' without one */
function sourceOf(el: HTMLElement): string {
  return String(dfDollar(el).children('script.visual-editor-source').get(0)?.textContent ?? '').trim();
}

const parse = (html: string): HTMLElement => new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body;
const escapeText = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** attributes whose value names one element by id */
const REF_ONE = new Set([
  'for',
  'form',
  'list',
  'popovertarget',
  'commandfor',
  'aria-activedescendant',
  'aria-details',
  'aria-errormessage',
]);
/** attributes whose value names several, space-separated */
const REF_MANY = new Set([
  'aria-controls',
  'aria-labelledby',
  'aria-describedby',
  'aria-owns',
  'aria-flowto',
  'headers',
]);

/**
 * Give the ids of inserted markup that the page already uses a free name (`email` → `email-2`) and move every
 * reference with them - labels, ARIA, popover / command targets, `href="#…"` and data-* values naming an id - so a
 * block dropped twice keeps two working labels or dialogs. (GrapesJS renames a colliding id too, but leaves the
 * references on the old one.)
 */
function remapIds(html: string, taken: Set<string>): string {
  const body = parse(html);
  const map = new Map<string, string>();
  for (const node of dfDollar(body).find('[id]').toArray() as HTMLElement[]) {
    const id = node.id;
    if (!id) continue;
    let next = id;
    for (let n = 2; taken.has(next); n++) next = `${id}-${n}`;
    taken.add(next);
    if (next !== id) {
      map.set(id, next);
      node.id = next;
    }
  }
  if (!map.size) return html;
  for (const node of dfDollar(body).find('*').toArray() as HTMLElement[]) {
    for (const attr of Array.from(node.attributes)) {
      const key = attr.name;
      let v = attr.value;
      if (REF_ONE.has(key) || key.startsWith('data-')) v = map.get(v) ?? v;
      else if (REF_MANY.has(key))
        v = v
          .split(/(\s+)/)
          .map((t) => map.get(t) ?? t)
          .join('');
      else if (key === 'href' && v.startsWith('#')) v = `#${map.get(v.slice(1)) ?? v.slice(1)}`;
      if (v !== attr.value) node.setAttribute(key, v);
    }
  }
  return String(dfDollar(body).html());
}

/** the ids the page uses now */
const pageIds = (editor: EditorLike): Set<string> =>
  new Set(
    (
      dfDollar(parse(htmlOf(editor)))
        .find('[id]')
        .toArray() as HTMLElement[]
    ).map((n) => n.id),
  );

/** a style object as a declaration list (GrapesJS keeps its own bookkeeping under __ keys) */
const styleText = (style: Record<string, unknown> | undefined): string =>
  Object.entries(style ?? {})
    .filter(([k, v]) => !k.startsWith('__') && v !== '' && v !== null && v !== undefined)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join('; ');
/** whether the markup gave the element its id - GrapesJS makes one for an element styled but never given an id, for
 *  the #id rule it keeps the style in; the authored attributes hold only the markup's */
const authoredId = (m: ModelLike): boolean => 'id' in ((m.get('attributes') ?? {}) as Record<string, string>);
/** the element's attributes as the markup has them: without an id GrapesJS made */
function attributesOf(m: ModelLike): Record<string, string> {
  const attrs = { ...m.getAttributes() };
  if (!authoredId(m)) delete attrs.id;
  return attrs;
}
/** the ids GrapesJS made */
const madeIds = (editor: EditorLike): Set<string> =>
  new Set(
    editor
      .getWrapper()
      .find('*')
      .filter((m) => !authoredId(m))
      .map((m) => m.getId()),
  );

/**
 * The page markup: GrapesJS's HTML without the <body> wrapper, each element's style back on it and no id the markup
 * never had. GrapesJS moves a parsed style="" into an #id rule and gives the element a generated id for it
 * (avoidInlineStyle: false, the deprecated way out, drops the style in 0.23.6 - VERIFIED: visual-editor.e2e's first
 * run). VERIFIED: (visual-editor.e2e "fidelity") every component's documented markup comes back element-for-element.
 */
function htmlOf(editor: EditorLike): string {
  return editor
    .getHtml({
      attributes: (m, attrs) => {
        if (!authoredId(m)) delete attrs.id;
        const style = styleText(m.getStyle());
        if (style) attrs.style = style;
        return attrs;
      },
    })
    .replace(/^<body[^>]*>/, '')
    .replace(/<\/body>\s*$/, '');
}

/** the element children of a component (text nodes and comments are not elements of the outline) */
const elements = (m: ModelLike): ModelLike[] =>
  m.components().models.filter((c) => !['textnode', 'comment'].includes(String(c.get('type'))));

/** a component's path from the page root */
function pathOf(editor: EditorLike, m: ModelLike): string {
  const steps: number[] = [];
  const root = editor.getWrapper();
  for (let c: ModelLike | undefined = m; c && c !== root; c = c.parent()) {
    const p = c.parent();
    if (!p) break;
    steps.unshift(elements(p).indexOf(c));
  }
  return steps.join('.');
}
/** the component at a path */
function atPath(editor: EditorLike, path: string): ModelLike | undefined {
  let m: ModelLike | undefined = editor.getWrapper();
  for (const step of path.split('.').filter(Boolean)) m = m ? elements(m)[Number(step)] : undefined;
  return m === editor.getWrapper() ? undefined : m;
}

/** text-only: every child is text (or there is none) and the tag can hold text */
function textOnly(m: ModelLike): boolean {
  const tag = String(m.get('tagName') ?? '').toLowerCase();
  if (['input', 'img', 'br', 'hr', 'video', 'iframe', 'select', 'textarea'].includes(tag)) return false;
  return m.components().models.every((c) => c.get('type') === 'textnode');
}

function selectionOf(editor: EditorLike, m: ModelLike | undefined): VisualEditorSelection | null {
  if (!m) return null;
  const attributes = attributesOf(m);
  delete attributes.class;
  return {
    path: pathOf(editor, m),
    tag: String(m.get('tagName') ?? 'div').toLowerCase(),
    attributes,
    classes: [...m.getClasses()],
    text: textOnly(m) ? (m.getEl()?.textContent ?? '') : null,
    unit: m.get('veLocked') ? pathOf(editor, unitOf(m)) : null,
  };
}

/** GrapesJS's toolbar commands that move, copy or remove the selected element */
const PART_TOOLS = new Set(['tlb-move', 'tlb-clone', 'tlb-delete']);
/** the props a lock changes on a part, as they were before it */
const PART_PROPS = ['droppable', 'editable', 'draggable', 'removable', 'copyable', 'toolbar'];

/** the root of the unit a locked part belongs to; a free element or a root is its own */
function unitOf(m: ModelLike): ModelLike {
  let u = m;
  while (u.get('veLocked') === 'part' && u.parent()) u = u.parent()!;
  return u;
}

/**
 * Lock an element into one unit, or release it. The root moves, copies and goes as a whole; nothing drops into it and
 * its markup is not edited; its parts stay selectable but are not edited, moved, copied or removed, and their toolbar
 * loses those tools (GrapesJS builds it when the element is made). The props live on the models, never in the markup,
 * and stay out of the undo history (avoidStore) - an undo never releases a lock. VERIFIED: (tmp/probe-grapes-style.ts)
 * the props stick on a model; its toolbar keeps move / clone / delete until it is rebuilt.
 */
function setLock(m: ModelLike, locked: boolean): void {
  const quiet = { avoidStore: true };
  const keep = (part: ModelLike) => {
    if (!part.get('veWas')) part.set({ veWas: Object.fromEntries(PART_PROPS.map((p) => [p, part.get(p)])) }, quiet);
  };
  const restore = (part: ModelLike) => {
    const was = part.get('veWas') as Record<string, unknown> | undefined;
    if (was) part.set({ ...was, veWas: null, veLocked: null }, quiet);
  };
  if (!locked) {
    for (const part of [m, ...m.find('*')]) restore(part);
    return;
  }
  keep(m);
  m.set({ veLocked: 'root', droppable: false, editable: false }, quiet);
  for (const part of m.find('*')) {
    keep(part);
    const toolbar = ((part.get('veWas') as { toolbar?: { command?: unknown }[] }).toolbar ?? []).filter(
      (t) => !PART_TOOLS.has(String(t.command)),
    );
    part.set(
      {
        veLocked: 'part',
        droppable: false,
        editable: false,
        draggable: false,
        removable: false,
        copyable: false,
        toolbar,
      },
      quiet,
    );
  }
}

/**
 * A URL that would run code: javascript: or vbscript:, or a data: URL that is not an image. The browser drops tabs
 * and newlines anywhere in a URL and spaces and control characters before it, so " JAVA\tSCRIPT:" is javascript: too.
 * An image (data:image/...) runs nothing where it can be used - an <img>, a poster, an opaque-origin frame.
 */
function unsafeUrl(value: string): boolean {
  let start = 0;
  while (start < value.length && value.charCodeAt(start) <= 0x20) start++;
  const url = value
    .slice(start)
    .replace(/[\t\n\r]/g, '')
    .toLowerCase();
  return /^(?:javascript|vbscript):/.test(url) || (url.startsWith('data:') && !url.startsWith('data:image/'));
}
/** attributes whose value is a URL */
const URL_ATTRS = new Set([
  'href',
  'src',
  'action',
  'formaction',
  'poster',
  'cite',
  'data',
  'background',
  'xlink:href',
]);

/** Refuse what the editor's parser would also drop: an on* handler, srcdoc, a URL that runs code. */
function checkAttribute(name: string, value: string | null): void {
  const key = name.toLowerCase();
  if (!/^[a-z_:][a-z0-9_.:-]*$/.test(key) || key.startsWith('on') || key === 'srcdoc')
    throw new Error(`visual-editor: the attribute ${name} is not editable`);
  if (value !== null && URL_ATTRS.has(key) && unsafeUrl(value))
    throw new Error(`visual-editor: ${name} must not run code (${value.slice(0, 40)})`);
}

/** elements that load or run content of their own - no part of a page made here */
const DROPPED = 'script, base, meta, object, embed, applet, frame, frameset';
/** an SVG animation that would set an href (to="javascript:...") */
const HREF_ANIMATION = /^(?:animate|set|animatemotion|animatetransform)$/i;

/**
 * The markup with nothing in it that runs: script-like elements, on* handlers, srcdoc, URLs that run code, SVG
 * animations of an href - in a template's content too. Every markup passes here before GrapesJS parses it: its parser
 * drops scripts and on* handlers but keeps srcdoc - an <iframe srcdoc="<script>"> ran in the canvas with the host
 * page's origin - and an href of " JAVASCRIPT:..." (VERIFIED: tmp/probe-srcdoc.ts). Parsed in an inert document:
 * nothing loads, nothing runs.
 */
function clean(html: string): string {
  const scrub = (root: ParentNode) => {
    dfDollar(root).find(DROPPED).remove();
    for (const el of dfDollar(root).find('*').toArray() as Element[]) {
      if (HREF_ANIMATION.test(el.localName) && /href$/i.test(el.getAttribute('attributeName') ?? '')) {
        el.remove();
        continue;
      }
      // a copy: removing an attribute changes the live list the loop would walk
      for (const a of Array.from(el.attributes)) {
        const key = a.name.toLowerCase();
        if (key.startsWith('on') || key === 'srcdoc' || (URL_ATTRS.has(key) && unsafeUrl(a.value)))
          el.removeAttribute(a.name);
      }
      if (el.localName === 'template') scrub((el as HTMLTemplateElement).content);
    }
  };
  const body = parse(html);
  scrub(body);
  return dfDollar(body).html() ?? '';
}

/** The markup of a state: readonly and the device are attributes of the element. */
function applyMarkup(el: HTMLElement, name: string, config: { device?: VisualEditorDevice }): void {
  dfDollar(el).attr('data-readonly', name === 'readonly' ? '' : null);
  const device = config.device && config.device !== 'desktop' ? config.device : null;
  dfDollar(el).attr('data-device', device);
}

/** The DOM side of a state: the markup, the inert canvas in readonly, the editor's device. */
function triggerStateChange(el: HTMLElement, name: string, config: { device?: VisualEditorDevice }): void {
  applyMarkup(el, name, config);
  const canvas = dfDollar(el).children('.visual-editor-canvas').get(0) as HTMLElement | undefined;
  if (canvas) canvas.inert = name === 'readonly';
  const editor = el._visualEditor as EditorLike | undefined;
  if (!editor) return;
  if (name === 'readonly') editor.select(null);
  editor.setDevice(config.device && DEVICES.some((d) => d.id === config.device) ? config.device : 'desktop');
}

/** Registry-level API; pass the element explicitly. Unknown names throw. */
export const visualEditorApi = componentState({
  component: 'visual-editor',
  states: visualEditorStates,
  mergeConfig: true,
  apply: (el, state) =>
    triggerStateChange(el as HTMLElement, state.name, state.config as { device?: VisualEditorDevice }),
  read: (el, state) => ({
    name: (el as HTMLElement).hasAttribute('data-readonly') ? 'readonly' : 'default',
    config: { ...state.config, device: ((el as HTMLElement).dataset.device as VisualEditorDevice) || 'desktop' },
  }),
  markup: (el, state) => applyMarkup(el as HTMLElement, state.name, state.config as { device?: VisualEditorDevice }),
});

df$.visualEditorApi = visualEditorApi;
df$.visualEditorStates = visualEditorStates;

/** the outside controls of an editor - [data-visual-editor-for="<id>"] buttons follow the undo history */
function syncControls(el: HTMLElement): void {
  const editor = el._visualEditor as EditorLike | undefined;
  if (!editor || !el.id) return;
  for (const b of dfDollar(
    `[data-visual-editor-for="${CSS.escape(el.id)}"][data-visual-editor-action]`,
  ).toArray() as HTMLButtonElement[]) {
    const action = b.dataset.visualEditorAction;
    const selected = editor.getSelected();
    if (action === 'undo') b.disabled = !editor.UndoManager.hasUndo();
    else if (action === 'redo') b.disabled = !editor.UndoManager.hasRedo();
    else if (action === 'duplicate') b.disabled = !selected || selected.get('copyable') === false;
    else if (action === 'remove') b.disabled = !selected || selected.get('removable') === false;
  }
}

async function mount(el: HTMLElement): Promise<void> {
  const grapes = await loadEngine();
  if (!el.isConnected || el._visualEditor) return;
  const canvas = document.createElement('div');
  canvas.className = 'visual-editor-canvas';
  dfDollar(el).append(canvas);
  const { links, css } = hostStyles();
  const editor = grapes.init({
    container: canvas,
    height: '100%',
    width: 'auto',
    fromElement: false,
    storageManager: false,
    telemetry: false,
    protectedCss: '',
    canvasCss: css,
    noticeOnUnload: false,
    showOffsets: true,
    panels: { defaults: [] },
    styleManager: { sectors: [] },
    selectorManager: { componentFirst: true },
    deviceManager: { devices: DEVICES, default: 'desktop' },
    canvas: { styles: links, scripts: [] },
    plugins: [plainTypes],
    components: clean(sourceOf(el)),
  });
  el._visualEditor = editor;
  await new Promise<void>((resolve) => editor.onReady(resolve));
  if (!el.isConnected) return;
  // the host's dark mode reaches the canvas
  const doc = editor.Canvas.getDocument();
  const dark = () => doc?.documentElement.classList.toggle('dark', document.documentElement.classList.contains('dark'));
  dark();
  new MutationObserver(dark).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  editor.UndoManager.clear();
  let timer: ReturnType<typeof setTimeout> | undefined;
  editor.on('update', () => {
    syncControls(el);
    clearTimeout(timer);
    timer = setTimeout(() => {
      // Fires after the page changed (a drop, a move, an apply(), undo) - debounced 200 ms, with the page markup.
      el.dispatchEvent(
        new CustomEvent<VisualEditorChangeDetail>('visual-editor-change', {
          bubbles: true,
          detail: { html: htmlOf(editor) },
        }),
      );
    }, 200);
  });
  const selected = () => {
    syncControls(el);
    // Fires when the selection changes - the selected element, or null when it was cleared.
    el.dispatchEvent(
      new CustomEvent<VisualEditorSelectDetail>('visual-editor-select', {
        bubbles: true,
        detail: { selection: selectionOf(editor, editor.getSelected()) },
      }),
    );
  };
  editor.on('component:selected', selected);
  editor.on('component:deselected', selected);
  const state = el.api?.getState();
  triggerStateChange(el, state?.name ?? 'default', (state?.config ?? {}) as { device?: VisualEditorDevice });
  dfDollar(el).attr('data-ready', '');
  syncControls(el);
  // Fires once the editor mounted the page - the markup it started with.
  el.dispatchEvent(
    new CustomEvent<VisualEditorReadyDetail>('visual-editor-ready', {
      bubbles: true,
      detail: { html: htmlOf(editor) },
    }),
  );
}

function init() {
  dfDollar('.visual-editor:not([data-init])')
    .toArray()
    .forEach((el: HTMLElement) => {
      el.dataset.init = '';
      // el.store + el.api (AGENTS.md "State through stores")
      bindComponent(el, visualEditorApi);
      mount(el).catch(() => {
        dfDollar(el).attr('data-error', '');
      });
    });
}

const resolve = (target: string | HTMLElement): HTMLElement | undefined =>
  typeof target === 'string' ? dfDollar(target).get(0) : target;
const editorOf = (target: string | HTMLElement): EditorLike | undefined =>
  resolve(target)?._visualEditor as EditorLike | undefined;
/** the editor a control drives: data-visual-editor-for="<id>" */
const controlled = (control: HTMLElement): HTMLElement | undefined => {
  const id = control.closest<HTMLElement>('[data-visual-editor-for]')?.dataset.visualEditorFor;
  return id ? dfDollar(`#${CSS.escape(id)}`).get(0) : undefined;
};
/** the markup a block carries: a <script type="text/html"> data block, else its <template>. A list written with
 *  df$(el).html() needs the data block: defuss-morph drops a template's content (VERIFIED: tmp/probe-studio-template.ts
 *  - neither content nor children survive) */
const blockHtml = (block: HTMLElement): string => {
  const data = dfDollar(block).children('script[type="text/html"]').get(0);
  if (data) return String(data.textContent ?? '').trim();
  const tpl = dfDollar(block).children('template').get(0);
  return tpl ? String(dfDollar(tpl).html() ?? '').trim() : '';
};

/** insert markup: into the selected element when it takes children, else after it, else at the page's end */
function insert(editor: EditorLike, html: string): number {
  const fresh = remapIds(clean(html), pageIds(editor));
  // inside a locked unit nothing is added: the markup goes after the unit
  const picked = editor.getSelected();
  const selected = picked && unitOf(picked);
  const takes = selected && selected.get('droppable') !== false && !textOnly(selected);
  let added: ModelLike | ModelLike[];
  if (selected && takes) added = selected.components().add(fresh);
  else if (selected?.parent()) {
    const parent = selected.parent()!;
    added = parent.components().add(fresh, { at: parent.components().indexOf(selected) + 1 });
  } else added = editor.addComponents(fresh);
  return Array.isArray(added) ? added.length : 1;
}

// the outside controls and the blocks, delegated once per document
if (!document.__visualEditorInit) {
  document.__visualEditorInit = true;
  document.addEventListener('click', (e) => {
    const control = (e.target as HTMLElement).closest<HTMLElement>(
      '[data-visual-editor-for] [data-visual-editor-block], [data-visual-editor-block][data-visual-editor-for], [data-visual-editor-for][data-visual-editor-action]',
    );
    const el = control && controlled(control);
    const editor = el?._visualEditor as EditorLike | undefined;
    if (!control || !el || !editor || el.hasAttribute('data-readonly')) return;
    if (control.hasAttribute('data-visual-editor-block')) insert(editor, blockHtml(control));
    else if (control.dataset.visualEditorAction !== 'device')
      df$.visualEditor[control.dataset.visualEditorAction as 'undo'](el);
  });
  document.addEventListener('change', (e) => {
    const select = (e.target as HTMLElement).closest<HTMLSelectElement>(
      'select[data-visual-editor-for][data-visual-editor-action="device"]',
    );
    const el = select && controlled(select);
    if (select && el?.api) el.api.setState(el.api.getState().name, { device: select.value as VisualEditorDevice });
  });
  // a block dragged into the canvas: GrapesJS takes the drop from here on. VERIFIED: (tmp/probe-grapes-drag.ts) a
  // native draggable + Canvas.startDrag drops into the canvas like GrapesJS's own block view
  document.addEventListener('dragstart', (e) => {
    const block = (e.target as HTMLElement).closest?.<HTMLElement>('[data-visual-editor-block]');
    const el = block && controlled(block);
    const editor = el?._visualEditor as EditorLike | undefined;
    if (!block || !editor || el!.hasAttribute('data-readonly')) return;
    editor.Canvas.startDrag({ content: remapIds(clean(blockHtml(block)), pageIds(editor)) });
  });
  document.addEventListener('dragend', (e) => {
    const block = (e.target as HTMLElement).closest?.<HTMLElement>('[data-visual-editor-block]');
    const editor = block && (controlled(block)?._visualEditor as EditorLike | undefined);
    editor?.Canvas.endDrag();
  });
}

df$.visualEditor = {
  /**
   * Load the pinned GrapesJS build ahead of the first editor (or a self-hosted copy).
   * @param url - the GrapesJS UMD build to load instead of the pinned one
   * @param css - its stylesheet
   * @returns resolves when the engine is installed
   */
  load: (url?: string, css?: string): Promise<unknown> =>
    loadEngine(url || VISUAL_EDITOR_URL, css || VISUAL_EDITOR_CSS_URL),
  /** The pinned GrapesJS build the component loads. */
  url: VISUAL_EDITOR_URL,
  /**
   * The page as markup - the markup the skills document, inline styles where they were written.
   * @param target - the .visual-editor element or its selector
   * @returns the markup, '' before the editor is ready
   */
  html: (target: string | HTMLElement): string => {
    const editor = editorOf(target);
    return editor ? htmlOf(editor) : '';
  },
  /**
   * The CSS the editor holds beside the markup (rules made in the editor; '' while the page has none).
   * @param target - the .visual-editor element or its selector
   * @returns the CSS, '' before the editor is ready
   */
  css: (target: string | HTMLElement): string => {
    const editor = editorOf(target);
    if (!editor) return '';
    // the #id rules html() folds back into style="" are not CSS of the page
    const made = madeIds(editor);
    return editor
      .getCss()
      .replace(/#([\w-]+)\{[^}]*\}/g, (rule, id: string) => (made.has(id) ? '' : rule))
      .trim();
  },
  /**
   * Replace the page (GrapesJS's parser drops scripts, on* handlers and javascript: URLs).
   * @param target - the .visual-editor element or its selector
   * @param html - the new page markup
   */
  setHtml: (target: string | HTMLElement, html: string): void => {
    const editor = editorOf(target);
    if (!editor) return;
    editor.setComponents(clean(html));
    editor.UndoManager.clear();
  },
  /**
   * Insert markup: into the selected element when it takes children, else after it, else at the page's end. Ids the
   * page already uses are renamed (`email` → `email-2`) and every reference moves with them.
   * @param target - the .visual-editor element or its selector
   * @param html - the markup to insert
   * @returns how many top-level elements were inserted (0 before the editor is ready)
   */
  insert: (target: string | HTMLElement, html: string): number => {
    const editor = editorOf(target);
    return editor ? insert(editor, html) : 0;
  },
  /**
   * Select an element by its outline path, or clear the selection.
   * @param target - the .visual-editor element or its selector
   * @param path - the element's path (outline(), selection().path), or null to clear
   * @returns the selection, null when nothing is selected
   */
  select: (target: string | HTMLElement, path: string | null): VisualEditorSelection | null => {
    const editor = editorOf(target);
    if (!editor) return null;
    editor.select(path === null ? null : (atPath(editor, path) ?? null));
    return selectionOf(editor, editor.getSelected());
  },
  /**
   * The selected element.
   * @param target - the .visual-editor element or its selector
   * @returns its path, tag, attributes, classes and text; null when nothing is selected
   */
  selection: (target: string | HTMLElement): VisualEditorSelection | null => {
    const editor = editorOf(target);
    return editor ? selectionOf(editor, editor.getSelected()) : null;
  },
  /**
   * Change the selected element - attributes, classes, text. Refuses on* handlers and URLs that run code.
   * @param target - the .visual-editor element or its selector
   * @param change - what to change
   * @returns the selection after the change, null when nothing is selected
   */
  apply: (target: string | HTMLElement, change: VisualEditorChange): VisualEditorSelection | null => {
    const editor = editorOf(target);
    const m = editor?.getSelected();
    if (!editor || !m) return null;
    if (m.get('veLocked')) throw new Error('visual-editor: the element is locked - change its state, not its markup');
    const attrs = change.attributes ?? {};
    for (const [name, value] of Object.entries(attrs)) checkAttribute(name, value);
    const set = Object.fromEntries(Object.entries(attrs).filter(([, v]) => v !== null)) as Record<string, string>;
    const drop = Object.entries(attrs)
      .filter(([, v]) => v === null)
      .map(([k]) => k);
    if (Object.keys(set).length) m.addAttributes(set);
    if (drop.length) m.removeAttributes(drop);
    if (change.classes) m.setClass(change.classes.filter((c) => /^[^\s<>"']+$/.test(c)));
    if (change.text !== undefined) {
      if (!textOnly(m)) throw new Error('visual-editor: only a text-only element takes text');
      m.components(escapeText(change.text));
    }
    return selectionOf(editor, m);
  },
  /**
   * Insert a copy of the selected element after it (ids renamed, references moved) and select the copy.
   * @param target - the .visual-editor element or its selector
   * @returns true when an element was copied
   */
  duplicate: (target: string | HTMLElement): boolean => {
    const editor = editorOf(target);
    const m = editor?.getSelected();
    const parent = m?.parent();
    if (!editor || !m || !parent || m.get('copyable') === false) return false;
    const added = parent
      .components()
      .add(remapIds(m.toHTML(), pageIds(editor)), { at: parent.components().indexOf(m) + 1 });
    const copy = Array.isArray(added) ? added[0] : added;
    if (m.get('veLocked') === 'root') setLock(copy, true);
    editor.select(copy);
    return true;
  },
  /**
   * Remove the selected element.
   * @param target - the .visual-editor element or its selector
   * @returns true when an element was removed
   */
  remove: (target: string | HTMLElement): boolean => {
    const m = editorOf(target)?.getSelected();
    if (!m || m.get('removable') === false) return false;
    m.remove();
    return true;
  },
  /**
   * Lock an element into one unit, or release it: it moves, copies and goes as a whole, nothing drops into it, and
   * nothing in it is edited, moved, copied or removed (its parts stay selectable). For markup a component renders
   * from its state: change it through the state - replace() with render()'s markup - never through its DOM. The lock
   * lives in the editor, not in the markup, and an undo keeps it.
   * @param target - the .visual-editor element or its selector
   * @param path - the element's path (outline(), selection().path)
   * @param locked - false releases it
   * @returns true when there is an element at the path
   */
  lock: (target: string | HTMLElement, path: string, locked: boolean = true): boolean => {
    const editor = editorOf(target);
    const m = editor && atPath(editor, path);
    if (!m) return false;
    setLock(m, locked);
    return true;
  },
  /**
   * Replace the selected element with markup - the markup of a state, as a component's render() gives it - and
   * select the new element. Its ids keep their names (the element they named is the one replaced); a locked root
   * stays locked; a locked part is refused (replace its unit).
   * @param target - the .visual-editor element or its selector
   * @param html - the markup of one element
   * @returns the new selection, null when nothing was replaced
   */
  replace: (target: string | HTMLElement, html: string): VisualEditorSelection | null => {
    const editor = editorOf(target);
    const m = editor?.getSelected();
    const parent = m?.parent();
    if (!editor || !m || !parent || m.get('veLocked') === 'part') return null;
    const at = parent.components().indexOf(m);
    const locked = m.get('veLocked') === 'root';
    m.remove();
    const added = parent.components().add(clean(html), { at });
    const next = Array.isArray(added) ? added[0] : added;
    if (!next) return null;
    if (locked) setLock(next, true);
    editor.select(next);
    return selectionOf(editor, next);
  },
  /**
   * Undo the last change.
   * @param target - the .visual-editor element or its selector
   * @returns true when there was a change to undo
   */
  undo: (target: string | HTMLElement): boolean => {
    const editor = editorOf(target);
    if (!editor?.UndoManager.hasUndo()) return false;
    editor.UndoManager.undo();
    return true;
  },
  /**
   * Redo the last undone change.
   * @param target - the .visual-editor element or its selector
   * @returns true when there was a change to redo
   */
  redo: (target: string | HTMLElement): boolean => {
    const editor = editorOf(target);
    if (!editor?.UndoManager.hasRedo()) return false;
    editor.UndoManager.redo();
    return true;
  },
  /**
   * The page's element tree - what a layers view (Tree View) shows.
   * @param target - the .visual-editor element or its selector
   * @returns one node per top-level element, [] before the editor is ready
   */
  outline: (target: string | HTMLElement): VisualEditorNode[] => {
    const editor = editorOf(target);
    if (!editor) return [];
    const node = (m: ModelLike, path: string): VisualEditorNode => {
      const attrs = attributesOf(m);
      const tag = String(m.get('tagName') ?? 'div').toLowerCase();
      const first = m.getClasses()[0];
      return {
        path,
        label: attrs.id ? `${tag}#${attrs.id}` : first ? `${tag}.${first}` : tag,
        children: elements(m).map((c, i) => node(c, `${path}.${i}`)),
      };
    };
    return elements(editor.getWrapper()).map((m, i) => node(m, String(i)));
  },
  /**
   * The GrapesJS editor behind an element, for anything this API does not cover.
   * @param target - the .visual-editor element or its selector
   * @returns the editor, or undefined before it mounted
   */
  editor: (target: string | HTMLElement): unknown => editorOf(target),
};

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
