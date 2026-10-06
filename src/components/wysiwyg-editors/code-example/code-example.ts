// -- HTML Preview Editor (code-example) ------------------------------------------
// An HTML source and its live preview in one card: the source is a <textarea>
// (undo, selection and form submission stay native) under a Shiki-coloured
// paint layer, the preview a sandboxed iframe (srcdoc, opaque origin) that runs
// the source verbatim against the design system - one source, so the code
// shown and the code run cannot differ. Around the preview: a device toolbar
// (phone / tablet / desktop / full, rotate, width × height, zoom, resize
// handles on every side), Code and State tabs, Reset, Copy and Fullscreen.
//
// The State tab is generated from a component schema (`data-schema`, the
// dist/schemas contract): its controls drive the previewed component through a
// bridge script inside the sandbox, and every change the preview makes is
// serialized back into the source - code, preview and controls stay in sync.
//
// Shipped in the EXTRA bundle wysiwyg.js / wysiwyg.css (never in all.*): a page
// loads it after all.js (or core.js + its components).
//
// State API (AGENTS.md "State API"): 'default' = preview only, 'code' = the
// source open, 'state' = the state controls open, 'fullscreen' = the card
// fills the screen; config { source } (+ { panel } in fullscreen).

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

// VERIFIED: (verify's component types ratchet - tsc -p tsconfig.components.json) every type
// this file's API docs state - arguments, return values, event details - holds
// against its code: a wrong one is a new type error and fails the build.

/** A stylesheet for the previews: a URL, or CSS text. */
type CodeExampleStyle = string | { css: string };
/** A script for the previews: a URL (fetched once), or JS text. */
type CodeExampleScript = string | { js: string };

/** What configure() takes - every key optional, kept for every preview built afterwards. */
interface CodeExampleConfig {
  /** the previews' stylesheets, or a function of the source returning them (default: the page's own stylesheets) */
  styles?: CodeExampleStyle[] | ((source: string) => CodeExampleStyle[] | Promise<CodeExampleStyle[]>) | null;
  /** the previews' scripts, or a function of the source returning them (default: the page's all / core bundle, inlined) */
  scripts?: CodeExampleScript[] | ((source: string) => CodeExampleScript[] | Promise<CodeExampleScript[]>) | null;
  /** markup after the runtime (an icon library), or a function of the source returning it */
  tail?: string | ((source: string) => string);
  /** theme CSS layered last in every preview, or a function returning it - refreshTheme() re-reads it */
  theme?: string | (() => string | Promise<string>) | null;
  /** your own highlighter: code and a language → the HTML of coloured spans (null: show it plain) */
  highlight?: ((code: string, language: string) => string | null | Promise<string | null>) | null;
  /** the ESM URL Shiki is imported from (the default highlighter) */
  shiki?: string;
  /** the Shiki themes for light and dark */
  themes?: { light: string; dark: string };
}

/** What code-example-change carries. */
interface CodeExampleChangeDetail {
  /** the source now */
  source: string;
  /** 'input': typed in the editor; 'api': setSource(), reset() or setState() */
  origin: 'input' | 'api';
}

/** What code-example-error carries. */
interface CodeExampleErrorDetail {
  /** the error message shown under the preview */
  message: string;
  /** the stack, when the preview's script threw */
  stack?: string;
}

/** What code-example-ready carries. */
interface CodeExampleReadyDetail {
  /** the source the preview ran */
  source: string;
}

const codeExampleStates = ['default', 'code', 'state', 'fullscreen'];

/** setState() configs per state (getState() reports the source - and in fullscreen the open panel). */
export interface CodeExampleStateConfigs {
  /** The preview alone - both panels closed. */
  default: {
    /** replace the source and rerun the preview (getState() reports the source now) */
    source?: string;
  };
  /** The source editor is open (and painted). */
  code: {
    /** replace the source and rerun the preview */
    source?: string;
  };
  /** The state controls are open (a card with data-schema; without one it lands in default). */
  state: {
    /** replace the source and rerun the preview */
    source?: string;
  };
  /** The card fills the screen (data-fullscreen). */
  fullscreen: {
    /** replace the source and rerun the preview */
    source?: string;
    /** the panel kept open below the stage, null for none */
    panel?: 'code' | 'state' | null;
  };
}

/** The Shiki build the default highlighter loads on first use (pinned ESM). */
const SHIKI_URL = 'https://esm.sh/shiki@3.0.0';
const RERUN_DEBOUNCE_MS = 400;
const MIN_FRAME_HEIGHT = 64;
const MAX_FRAME_HEIGHT = 900;
const REM_PX = 16; // data-height is authored in rem
const IO_ROOT_MARGIN = '600px 0px'; // previews boot near the viewport…
const IDLE_BOOT_MS = 1500; // …and the rest once the page is idle
const VP_DEVICES = { phone: [390, 844], tablet: [834, 1112] };
const VP_MODES = ['phone', 'tablet', 'desktop', 'full'];
/** the frame's sandbox per data-sandbox: opaque origin; embed (a third-party player) and links (new-tab links) widen one card */
const SANDBOXES = {
  default: { sandbox: 'allow-scripts allow-forms', allow: 'clipboard-write' },
  embed: { sandbox: 'allow-scripts allow-forms allow-same-origin allow-presentation allow-popups', allow: 'clipboard-write; autoplay; encrypted-media; fullscreen; picture-in-picture' },
  links: { sandbox: 'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox', allow: 'clipboard-write' },
};

// lucide icons (ISC) - inline, so the card needs no icon library
const ICONS = {
  'rotate-cw': '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
  'smartphone': '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
  'tablet': '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><line x1="12" x2="12.01" y1="18" y2="18"/>',
  'monitor': '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
  'app-window': '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 4v4"/><path d="M2 8h20"/><path d="M6 4v4"/>',
  'code-xml': '<path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>',
  'sliders-horizontal': '<path d="M10 5H3"/><path d="M12 19H3"/><path d="M14 3v4"/><path d="M16 17v4"/><path d="M21 12h-9"/><path d="M21 19h-5"/><path d="M21 5h-7"/><path d="M8 10v4"/><path d="M8 12H3"/>',
  'rotate-ccw': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  'maximize': '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  'minimize': '<path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>',
  'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'copy': '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  'check': '<path d="M20 6 9 17l-5-5"/>',
};
const icon = (name) =>
  `<svg class="lucide lucide-${name}" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
/** a toolbar button's content: icon + label */
const buttonContent = (name, label) => `${icon(name)}<span>${label}</span>`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// -- configuration --------------------------------------------------------------------------------

/**
 * What every preview is built from. `null` = discovered from the host page:
 * its stylesheets as <link>s, its all / core (+ wysiwyg when the source uses
 * this component) bundle fetched and inlined.
 */
const config: Required<CodeExampleConfig> = {
  styles: null,
  scripts: null,
  tail: '',
  theme: null,
  highlight: null,
  shiki: SHIKI_URL,
  themes: { light: 'github-light', dark: 'github-dark' },
};

const cache = new Map();
/** fetch a URL's text once per page (a failed fetch is retried next time) */
function fetchText(url) {
  if (!cache.has(url)) {
    const p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
      return r.text();
    });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return cache.get(url);
}

const BUNDLE_SCRIPT = /\/(all|core|wysiwyg)(?:\.min)?\.js(?:[?#]|$)/;
/** the host's runtime bundles: all/core first, wysiwyg only when the source nests this component */
function discoverScripts(source) {
  const out = [];
  dfDollar<HTMLScriptElement>('script[src]').each((_i, s) => {
    const m = BUNDLE_SCRIPT.exec(s.src);
    if (!m || (m[1] === 'wysiwyg' && !/\bcode-example\b/.test(source))) return;
    if (!out.includes(s.src)) out.push(s.src);
  });
  return out.sort((a, b) => Number(/wysiwyg/.test(a)) - Number(/wysiwyg/.test(b)));
}
function discoverStyles() {
  const out = [];
  dfDollar<HTMLLinkElement>('link[rel="stylesheet"]').each((_i, l) => {
    if (l.href && !out.includes(l.href)) out.push(l.href);
  });
  return out;
}

/** a config entry list - an array or a function of the source */
const entries = (value, source, fallback) => Promise.resolve(typeof value === 'function' ? value(source) : value ?? fallback());
/** inline a script's text as a classic script in its own function scope (a bundle's top-level names stay local) */
const scriptTag = (js) => `<script data-ce-chrome>(function(){\n${String(js).replace(/<\/script/gi, '<\\/script')}\n})();</script>`;

function resolveStyles(source) {
  return entries(config.styles, source, discoverStyles).then((list) =>
    (list || []).map((e) => (typeof e === 'string' ? `<link rel="stylesheet" href="${esc(e)}" data-ce-chrome>` : `<style data-ce-chrome>${String(e.css ?? '').replace(/<\/style/gi, '<\\/style')}</style>`)).join('\n'),
  );
}
function resolveScripts(source) {
  return entries(config.scripts, source, () => discoverScripts(source)).then((list) =>
    Promise.all((list || []).map((e) => (typeof e === 'string' ? fetchText(e) : Promise.resolve(e.js ?? '')))).then((texts) => texts.map(scriptTag).join('\n')),
  );
}
function resolveTheme() {
  return Promise.resolve(typeof config.theme === 'function' ? config.theme() : config.theme ?? '').then((css) => String(css ?? ''), () => '');
}

// -- the sandbox bridge ---------------------------------------------------------------------------

/**
 * Runs INSIDE the preview (serialized into the srcdoc, so it may use nothing
 * but its arguments and the preview's globals): routes the host's messages to
 * the previewed markup, reports its state, height, errors and serialized
 * source back. DOM work goes through the preview's df$ (the runtime the
 * preview loaded); without it the preview still runs and reports its height.
 * Protocol: host → sandbox { type: 'ce-host', ch, kind }, sandbox → host
 * { type: 'ce', ch, kind } - the per-card channel id keeps cards apart.
 */
function sandboxBridge(ch, schema) {
  const $ = globalThis.df$;
  const states = (schema && schema.states) || {};
  const actions = (schema && schema.actions) || {};
  const one = (sel) => ($ ? $(sel).get(0) || null : null);
  const all = (root, sel) => {
    const out = [];
    if ($) $(root).find(sel).each((_i, n) => { out.push(n); });
    return out;
  };

  // forms run their handlers; the navigation a submit starts is cancelled
  // (it would replace the preview) - method="dialog" closes a dialog instead
  document.addEventListener('submit', (e) => {
    const method = (e.submitter && e.submitter.getAttribute('formmethod')) || (e.target as HTMLFormElement).getAttribute('method');
    if ((method || '').toLowerCase() !== 'dialog') e.preventDefault();
  });
  // an about:srcdoc document resolves links against the host page: a link
  // never leaves the preview - a fragment jumps in place, the rest is cancelled
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0) return;
    const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
    if (!a || a.hasAttribute('download')) return;
    const target = (a.getAttribute('target') || '').toLowerCase();
    if (target && target !== '_self') return;
    const href = a.getAttribute('href') || '';
    if (/^(mailto|tel|sms):/i.test(href)) return;
    e.preventDefault();
    if (href.charAt(0) === '#' && href.length > 1) location.hash = href.slice(1);
  });

  const post = (kind, extra?) => parent.postMessage(Object.assign({ type: 'ce', ch, kind }, extra || {}), '*');

  /** the schema target: a selector, the [data-example-root], else the first element of the source */
  function resolve(target) {
    if (target && target.kind === 'selector') return one(target.selector);
    const marked = one('[data-example-root]');
    if (marked) return marked;
    for (let el = document.body.firstElementChild; el; el = el.nextElementSibling) if (!el.hasAttribute('data-ce-chrome')) return el;
    return null;
  }
  function readMop(el, mop) {
    if (!el) return null;
    if (mop.kind === 'api') {
      if (!el.api || !el.api.getState) return null;
      const st = el.api.getState();
      if (mop.name === '@state') return st.name;
      return st.config && mop.name in st.config ? st.config[mop.name] : null;
    }
    if (mop.kind === 'property') {
      const v = el[mop.name];
      return typeof v === 'object' ? String(v) : v;
    }
    if (mop.kind === 'attribute') return el.hasAttribute(mop.name) ? el.getAttribute(mop.name) : null;
    return el.classList.contains(mop.name);
  }
  function applyMop(el, mop, value) {
    if (!el) return;
    if (mop.kind === 'api') {
      if (!el.api || !el.api.setState) return;
      const stateName = mop.name === '@current' && el.api.getState ? el.api.getState().name : mop.name;
      if (mop.name === '*') {
        if (value === true || value === false || value === null || value === undefined || value === '') el.api.setState('default');
        else el.api.setState(String(value));
        return;
      }
      if (mop.args) {
        const usesValue = Object.keys(mop.args).some((k) => mop.args[k] === '@value');
        if (value === false && !usesValue) return void el.api.setState('default');
        const cfg = {};
        for (const k in mop.args) cfg[k] = mop.args[k] === '@value' ? value : mop.args[k];
        el.api.setState(stateName, cfg);
        return;
      }
      if (value === false || value === null || value === undefined) el.api.setState('default');
      else if (typeof value === 'object') el.api.setState(mop.name, value);
      else el.api.setState(mop.name, { value });
      return;
    }
    if (mop.kind === 'property') { el[mop.name] = value; return; }
    if (mop.kind === 'attribute') {
      if (value === false || value === null || value === undefined) el.removeAttribute(mop.name);
      else el.setAttribute(mop.name, value === true ? 'true' : String(value));
      return;
    }
    el.classList.toggle(mop.name, !!value);
  }
  /** the previewed markup as source: chrome dropped, live form values reflected onto attributes */
  function serializeSource() {
    if (!$) return '';
    const chrome = '[data-ce-chrome], #toast-container';
    const live = all(document.body, 'input, textarea').filter((n) => !n.closest(chrome));
    const clone = document.body.cloneNode(true);
    $(clone).find(chrome).remove();
    const mirror = all(clone, 'input, textarea');
    live.forEach((l, i) => {
      const c = mirror[i];
      if (!c) return;
      if (l.type === 'checkbox' || l.type === 'radio') c.toggleAttribute('checked', l.checked);
      else if (l.tagName === 'TEXTAREA') c.textContent = l.value;
      else c.setAttribute('value', l.value);
    });
    return ($(clone).html() || '').trim();
  }
  function readStates() {
    const values = {};
    for (const name in states) {
      const spec = states[name];
      const el = resolve(spec.target);
      const obs = spec.observation || spec.mutation;
      if (!el || !obs) continue;
      const oel = spec.observation && spec.observation.target ? resolve(spec.observation.target) : el;
      if (!oel) continue;
      let v = !spec.observation && obs.kind === 'api' ? oel.classList.contains(obs.name) : readMop(oel, obs);
      if (typeof v === 'string' && /^(true|false)$/.test(v)) v = v === 'true';
      if (spec.type === 'boolean' && spec.observation && obs.kind === 'api' && obs.name === '@state' && typeof v === 'string') {
        v = v === (spec.mutation && spec.mutation.kind === 'api' ? spec.mutation.name : name);
      }
      if (spec.type === 'boolean' && obs.kind === 'attribute' && typeof v === 'string') {
        const rn = spec.mutation && spec.mutation.kind === 'api' ? spec.mutation.name : name;
        v = v !== 'false' && (v === '' || v === 'true' || v === rn);
      }
      if (v === null || v === undefined) v = 'default' in spec ? spec.default : null;
      values[name] = v === undefined ? null : v;
    }
    return values;
  }
  // true content height (body is flow-root): never the viewport, which would ratchet the frame taller
  function contentHeight() {
    const de = document.documentElement;
    const cs = getComputedStyle(document.body);
    const natural = Math.ceil(document.body.getBoundingClientRect().height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom));
    return de.scrollHeight > de.clientHeight ? Math.max(natural, de.scrollHeight) : natural;
  }
  let syncQueued = false;
  let sourceDirty = false; // only a change serializes the source back
  // setTimeout, never rAF: rAF stops for previews scrolled out of view
  function sync() {
    if (syncQueued) return;
    syncQueued = true;
    setTimeout(() => {
      syncQueued = false;
      post('state', { values: readStates() });
      if (sourceDirty) {
        sourceDirty = false;
        post('source', { source: serializeSource() });
      }
      post('height', { height: contentHeight() });
    }, 0);
  }
  // the source's own scripts report errors; chrome (bundles, bridge) and stylesheets do not
  addEventListener('error', (e) => {
    const t = e.target as HTMLElement | null;
    if (t && (t as EventTarget) !== globalThis && t.tagName) {
      if (t.tagName !== 'SCRIPT' || t.hasAttribute('data-ce-chrome')) return;
      post('error', { message: 'Example script failed to load or compile' });
      return;
    }
    post('error', { message: String(e.message || 'Unknown error'), stack: e.error && e.error.stack ? String(e.error.stack) : undefined });
  }, true);
  addEventListener('unhandledrejection', (e) => {
    post('error', { message: `Unhandled rejection: ${e.reason && e.reason.message ? e.reason.message : String(e.reason)}` });
  });
  addEventListener('message', (e) => {
    const d = e.data;
    if (!d || d.type !== 'ce-host' || d.ch !== ch) return;
    if (d.kind === 'set-state') {
      const spec = states[d.state];
      if (!spec || !spec.mutation) return;
      sourceDirty = true;
      const el = resolve(spec.target);
      if (el && spec.mutation.kind === 'property' && (d.state === 'open' || spec.mutation.name === 'open')) {
        // a dialog's open state drives the native modal API
        if (d.value && typeof el.showModal === 'function' && !el.open) el.showModal();
        else if (!d.value && el.open && typeof el.close === 'function') el.close();
      } else applyMop(el, spec.mutation, d.value);
      sync();
    } else if (d.kind === 'action') {
      const act = actions[d.action];
      const target = act && resolve(act.target);
      if (!target) return;
      sourceDirty = true;
      if (act.operation.kind === 'method' && typeof target[act.operation.name] === 'function') target[act.operation.name]();
      else if (act.operation.kind === 'event') target.dispatchEvent(new Event(act.operation.name, { bubbles: true, cancelable: true }));
      sync();
    } else if (d.kind === 'read-state') post('state', { values: readStates() });
    else if (d.kind === 'set-dark') {
      document.documentElement.classList.toggle('dark', !!d.value);
      document.documentElement.style.colorScheme = d.value ? 'dark' : 'light';
    } else if (d.kind === 'set-theme') {
      const tag = one('#ce-theme');
      if (tag) $(tag).text(d.css || '');
    } else if (d.kind === 'measure') sync();
    else if (d.kind === 'pointer-release') {
      // a drag released over the host page never saw its pointerup here
      let pr;
      try {
        pr = new PointerEvent('pointercancel', { bubbles: true, cancelable: true });
      } catch {
        pr = new Event('pointercancel', { bubbles: true });
      }
      document.dispatchEvent(pr);
    }
  });
  // Escape with the focus inside the preview leaves the card's fullscreen -
  // unless the preview's own overlay (an open dialog / popover) takes it first
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    if ($ && $('dialog[open], :popover-open').get(0)) return;
    post('escape');
  });
  ['input', 'change', 'close', 'toggle', 'scroll'].forEach((ev) => document.addEventListener(ev, () => { sourceDirty = true; sync(); }, true));
  document.addEventListener('click', sync, true);
  new MutationObserver(sync).observe(document.body, { childList: true, attributes: true, subtree: true, characterData: true });
  // height-only follow-up for what no mutation announces (transitions, late layout)
  let lastHeight = -1;
  let heightQueued = false;
  function syncHeight() {
    if (heightQueued) return;
    heightQueued = true;
    setTimeout(() => {
      heightQueued = false;
      const h = contentHeight();
      if (h === lastHeight) return;
      lastHeight = h;
      post('height', { height: h });
    }, 0);
  }
  if (typeof ResizeObserver === 'function') new ResizeObserver(syncHeight).observe(document.body);
  document.addEventListener('transitionend', syncHeight, true);
  const ready = () => { post('ready'); sync(); };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', ready);
  else ready();
  addEventListener('load', sync);
}

// -- the preview document ------------------------------------------------------------------------

const SCRIPT_OPEN = '<script data-ce-chrome>';
const SCRIPT_CLOSE = '</script>';

/** the srcdoc of a card's preview: styles, theme, the source verbatim, the runtime, the bridge */
function buildSrcdoc(root, source) {
  const c = root._ce;
  return Promise.all([resolveStyles(source), resolveScripts(source), resolveTheme()]).then(([styles, scripts, theme]) => {
    const dark = document.documentElement.classList.contains('dark');
    const stage = (dfDollar(root).attr('data-preview-style') || '').replace(/\s*[{}<>]\s*/g, '');
    const tail = typeof config.tail === 'function' ? config.tail(source) : config.tail || '';
    const schema = c.schema ? JSON.stringify(c.schema).replace(/</g, '\\u003c') : 'null';
    // a source that nests this component hands its preview the same assets
    const nested = /\bcode-example\b/.test(source) ? nestedConfig(source) : Promise.resolve('');
    return nested.then((nestedScript) =>
      `<!DOCTYPE html>\n<html lang="en"${dark ? ' class="dark" style="color-scheme:dark"' : ''}>\n<head>\n<meta charset="UTF-8">\n${styles}\n` +
      `<style id="ce-theme" data-ce-chrome>${theme.replace(/<\/style/gi, '<\\/style')}</style>\n` +
      `<style data-ce-chrome>body{display:flow-root;margin:2.5rem 1.5rem;background:var(--background);color:var(--foreground);${stage}}</style>\n</head>\n<body>\n` +
      `${source}\n${scripts}\n${nestedScript}${tail}\n` +
      `<script id="ce-bridge" data-ce-chrome>(${sandboxBridge.toString().replace(/<\/script/gi, '<\\/script')})(${JSON.stringify(c.ch)}, ${schema});${SCRIPT_CLOSE}\n</body>\n</html>`,
    );
  });
}

/** a chrome script configuring a nested preview with this page's resolved assets */
function nestedConfig(source) {
  return Promise.all([
    entries(config.styles, source, discoverStyles),
    entries(config.scripts, source, () => discoverScripts(source)),
  ]).then(([styles, scripts]) =>
    Promise.all((scripts || []).map((e) => (typeof e === 'string' ? fetchText(e) : Promise.resolve(e.js ?? '')))).then((texts) => {
      const cfg = { styles: styles || [], scripts: texts.map((js) => ({ js })) };
      const json = JSON.stringify(cfg).replace(/</g, '\\u003c');
      return `${SCRIPT_OPEN}globalThis.df$&&df$.shadcn.codeExample&&df$.shadcn.codeExample.configure(${json});${SCRIPT_CLOSE}\n`;
    }),
  );
}

/** ch → card: one message listener and one dark observer route by channel */
const registry = new Map();

function send(root, kind, extra?) {
  const frame = root._ce?.frame;
  if (frame?.contentWindow) frame.contentWindow.postMessage(Object.assign({ type: 'ce-host', ch: root._ce.ch, kind }, extra || {}), '*');
}

// the page's scripts have configured the component before any preview builds
const pageReady = new Promise((resolve) => {
  const go = () => setTimeout(resolve, 0);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go, { once: true });
  else go();
});

/** build (or rebuild) the card's preview from a source */
function run(root, source) {
  const c = root._ce;
  c.lastRun = source;
  c.booted = true;
  showError(root, null);
  pageReady
    .then(() => buildSrcdoc(root, source))
    .then(
      (doc) => {
        if (c.lastRun === source) dfDollar(c.frame).attr('srcdoc', doc);
      },
      (e) => showError(root, `Preview could not be built: ${e?.message ?? String(e)}`),
    );
}

function showError(root, message, stack?) {
  const box = root._ce?.error;
  if (!box) return;
  dfDollar(box).prop('hidden', !message);
  dfDollar(box).text(message ? message + (stack ? `\n${stack}` : '') : '');
  if (message) {
    // The preview reported an error - the source's own script threw, or failed to load - or the preview could not be built.
    root.dispatchEvent(new CustomEvent<CodeExampleErrorDetail>('code-example-error', { bubbles: true, detail: { message, stack } }));
  }
}

// -- the shell --------------------------------------------------------------------------------------

function shellMarkup(root) {
  const sb = SANDBOXES[dfDollar(root).attr('data-sandbox') ?? 'default'] ?? SANDBOXES.default;
  const vp = (mode, glyph, label, title) =>
    `<button type="button" class="code-example-vp" data-vp="${mode}" aria-pressed="${mode === 'full'}" title="${title}">${buttonContent(glyph, label)}</button>`;
  const title = esc(dfDollar(root).attr('aria-label') || 'Preview');
  return (
    `<div class="code-example-stage">` +
    `<div class="code-example-screen" data-mode="full">` +
    `<div class="resizer code-example-resizer" data-handles="all" data-resize-mode="controlled" data-axis="both" data-min="240" data-max="1600" data-min-h="240" data-max-h="1400">` +
    `<div class="code-example-device"><iframe class="code-example-frame" sandbox="${sb.sandbox}" allow="${sb.allow}" title="${title}"></iframe>` +
    `<span class="code-example-device-island" aria-hidden="true"></span><span class="code-example-device-home" aria-hidden="true"></span></div></div></div>` +
    `<output class="code-example-error" role="alert" hidden></output>` +
    `<button type="button" class="code-example-full-exit" title="Exit fullscreen (Esc)" aria-label="Exit fullscreen">${icon('x')}</button>` +
    `</div>` +
    `<div class="code-example-toolbar">` +
    `<span class="code-example-viewport" role="group" aria-label="Preview device">` +
    `<button type="button" class="code-example-vp" data-vp="rotate" title="Swap orientation (phone/tablet)" aria-disabled="true">${buttonContent('rotate-cw', 'Rotate')}</button>` +
    vp('phone', 'smartphone', 'Phone', 'Phone 390×844') + vp('tablet', 'tablet', 'Tablet', 'Tablet 834×1112') +
    vp('desktop', 'monitor', 'Desktop', 'Desktop 1024') + vp('full', 'app-window', 'Full', 'Full width') +
    `</span><span class="code-example-sep" aria-hidden="true"></span>` +
    `<span class="code-example-size"><input class="code-example-vp-w" type="number" min="240" step="10" inputmode="numeric" placeholder="Width" aria-label="Custom preview width (px)"><span class="code-example-vp-x" aria-hidden="true">×</span>` +
    `<input class="code-example-vp-h" type="number" min="240" step="10" inputmode="numeric" placeholder="Full" aria-label="Custom preview height (px)" disabled></span>` +
    `<span class="code-example-sep" aria-hidden="true"></span>` +
    `<span class="code-example-size"><input class="code-example-vp-z" type="number" min="25" max="100" step="5" inputmode="numeric" placeholder="Auto" aria-label="Preview zoom (%)"><span class="code-example-vp-x" aria-hidden="true">%</span></span>` +
    `<span class="code-example-spacer"></span>` +
    `<button type="button" class="code-example-tab" data-tab="code" aria-pressed="false" title="Show or hide the source">${buttonContent('code-xml', 'Code')}</button>` +
    (dfDollar(root).attr('data-schema') ? `<button type="button" class="code-example-tab" data-tab="state" aria-pressed="false" title="Show or hide the state controls">${buttonContent('sliders-horizontal', 'State')}</button>` : '') +
    `<button type="button" class="code-example-reset" title="Restore the original source and rerun">${buttonContent('rotate-ccw', 'Reset')}</button>` +
    `<button type="button" class="code-example-full" title="Preview fullscreen (Esc to exit)">${buttonContent('maximize', 'Fullscreen')}</button>` +
    `</div>` +
    `<div class="code-example-panel" data-panel="code" hidden>` +
    `<button type="button" class="code-example-copy" title="Copy the source">${buttonContent('copy', 'Copy')}</button>` +
    `<div class="code-example-editor"><div class="code-example-paint" aria-hidden="true"></div></div></div>` +
    (dfDollar(root).attr('data-schema') ? `<div class="code-example-panel" data-panel="state" hidden></div>` : '')
  );
}

/**
 * The card's parts: authored as a whole (the docs render it server-side) or
 * built here from the bare markup - a .code-example around one <textarea>.
 * Idempotent; render() runs it on a detached copy too.
 */
function ensureShell(root) {
  const $root = dfDollar(root);
  if ($root.children('.code-example-toolbar').length) return;
  const source = $root.children('textarea').get(0);
  $root.append(dfDollar(shellMarkup(root)));
  if (!source) return;
  dfDollar(source).attr('class', ['code-example-src', source.getAttribute('class')].filter(Boolean).join(' '));
  if (!source.hasAttribute('spellcheck')) dfDollar(source).attr('spellcheck', 'false');
  if (!source.hasAttribute('aria-label')) dfDollar(source).attr('aria-label', 'Source');
  if (!source.hasAttribute('rows')) dfDollar(source).attr('rows', '10');
  $root.find('.code-example-editor').append(source);
}

const part = (root, sel) => dfDollar(root).find(sel).get(0) || null;

// -- highlighting -------------------------------------------------------------------------------------

let shikiModule = null;
/** the pinned Shiki ESM, imported once - a failure (offline, a host that rewrites dynamic imports) rejects, and the paint stays plain */
function loadShiki(shikiUrl) {
  if (!shikiModule) {
    shikiModule = Promise.resolve().then(() => import(/* @vite-ignore */ shikiUrl));
    shikiModule.catch(() => { shikiModule = null; });
  }
  return shikiModule;
}

/** code → HTML of coloured spans (no wrapper), or null for plain text */
/**
 * The configured highlighter: code and a language → a Promise of HTML (coloured spans), or null.
 * @param code - the source text
 * @param language - a Shiki language id ('html', 'css', 'ts', ...)
 * @returns the HTML of coloured spans, null when the highlighter gives none
 */
function highlight(code: string, language: string): Promise<string | null> {
  if (typeof config.highlight === 'function') return Promise.resolve().then(() => config.highlight(code, language));
  return loadShiki(config.shiki).then((m) =>
    m.codeToHtml(code, { lang: language, themes: config.themes, defaultColor: false, cssVariablePrefix: '--code-example-' }),
  ).then((html) => {
    const inner = /<code[^>]*>([\s\S]*)<\/code>/.exec(String(html ?? ''));
    return inner ? inner[1] : null;
  });
}

/** rendered at all - a closed panel says no, off-screen says yes */
const rendered = (el) => (typeof el.checkVisibility === 'function' ? el.checkVisibility() : el.getClientRects().length > 0);

/** paint the source - only while the editor shows; plain until the colours land */
function paint(root) {
  const c = root._ce;
  if (!c?.paint) return;
  if (!rendered(c.editor)) { c.stale = true; return; }
  c.stale = false;
  const value = c.src.value;
  if (c.painted === value) return;
  const apply = (html) => {
    dfDollar(c.paint).html(`${html}\n`); // the newline keeps an empty last line's height
    dfDollar(c.editor).attr('data-painted', '');
    syncScroll(root);
  };
  clearTimeout(c.plainTimer);
  // colours usually land within a frame; a slow first load shows the text plain meanwhile
  c.plainTimer = setTimeout(() => { if (c.src.value === value && c.painted !== value) apply(esc(value)); }, 100);
  highlight(value, dfDollar(root).attr('data-language') || 'html').then(
    (html) => {
      if (c.src.value !== value) return;
      clearTimeout(c.plainTimer);
      c.painted = value;
      apply(typeof html === 'string' ? html : esc(value));
    },
    () => {
      if (c.src.value !== value) return;
      clearTimeout(c.plainTimer);
      c.painted = value;
      apply(esc(value));
    },
  );
}

function syncScroll(root) {
  const c = root._ce;
  c.paint.scrollTop = c.src.scrollTop;
  c.paint.scrollLeft = c.src.scrollLeft;
}

/** a page write to the source: repaints, no input event, no rerun loop */
function writeSource(root, value) {
  const c = root._ce;
  if (c.src.value !== value) c.src.value = value;
  dfDollar(root).attr('data-edited', value !== c.original ? '' : null);
  paint(root);
}

// -- editing ------------------------------------------------------------------------------------------

/** insert at the selection, keeping the native undo stack where the browser allows it */
function insertText(input, text) {
  input.focus();
  let done = false;
  try {
    done = document.execCommand('insertText', false, text);
  } catch {
    done = false;
  }
  if (!done) {
    input.setRangeText(text, input.selectionStart, input.selectionEnd, 'end');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

/** Tab / Shift+Tab indent the selected lines (Escape, then Tab leaves); Enter keeps the indentation */
function onKeydown(root, e) {
  const c = root._ce;
  const input = c.src;
  if (input.readOnly || e.isComposing) return;
  if (e.key === 'Escape') { c.escaped = true; return; }
  if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if (c.escaped) { c.escaped = false; return; }
    e.preventDefault();
    const value = input.value;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    if (start === end && !e.shiftKey) return void insertText(input, '  ');
    const next = value.slice(lineStart, end).split('\n').map((l) => (e.shiftKey ? l.replace(/^( {1,2}|\t)/, '') : `  ${l}`)).join('\n');
    input.setSelectionRange(lineStart, end);
    insertText(input, next);
    input.setSelectionRange(lineStart, lineStart + next.length);
    return;
  }
  c.escaped = false;
  if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const value = input.value;
    const lineStart = value.lastIndexOf('\n', input.selectionStart - 1) + 1;
    const indent = /^[\t ]*/.exec(value.slice(lineStart, input.selectionStart))?.[0] ?? '';
    if (!indent) return;
    e.preventDefault();
    insertText(input, `\n${indent}`);
  }
}

// -- the state controls (generated from the schema only) -------------------------------------------

/** a schema state's editor: the schema's hint when known, else by type */
function editorFor(spec) {
  const byType = spec.type === 'boolean' ? 'checkbox' : spec.type === 'number' ? 'number' : spec.type === 'enum' ? 'radio' : 'text';
  const hint = spec.editor && spec.editor.component;
  return { kind: ['text', 'number', 'checkbox', 'radio', 'select'].includes(hint) ? hint : byType, props: (spec.editor && spec.editor.props) || {} };
}

function buildControls(root) {
  const c = root._ce;
  const panel = part(root, '.code-example-panel[data-panel="state"]');
  if (!panel) return;
  const schema = c.schema;
  dfDollar(panel).text('');
  if (!schema || !Object.keys(schema.states || {}).length) {
    const p = document.createElement('p');
    p.className = 'code-example-note';
    p.textContent = schema ? 'This component schema declares no states.' : 'No schema - no state controls.';
    dfDollar(panel).append(p);
    return;
  }
  const grid = document.createElement('div');
  grid.className = 'code-example-states';
  for (const name of Object.keys(schema.states)) {
    const spec = schema.states[name];
    const ed = editorFor(spec);
    const row = document.createElement('div');
    row.className = 'code-example-row';
    row.dataset.stateName = name;
    const label = document.createElement('label');
    label.textContent = name;
    dfDollar(row).append(label);
    let control;
    if (ed.kind === 'checkbox') {
      control = document.createElement('input');
      control.type = 'checkbox';
    } else if (ed.kind === 'number') {
      control = document.createElement('input');
      control.type = 'number';
      for (const k of ['min', 'max', 'step']) if (ed.props[k] !== undefined) control[k] = String(ed.props[k]);
    } else if (ed.kind === 'radio') {
      control = document.createElement('div');
      control.className = 'code-example-radio-group';
      for (const v of spec.values || []) {
        const wrap = document.createElement('label');
        const r = document.createElement('input');
        r.type = 'radio';
        r.value = v;
        r.name = `${c.ch}-${name}`;
        dfDollar(r).on('change', () => { if (r.checked) send(root, 'set-state', { state: name, value: v }); });
        dfDollar(wrap).append(r);
        dfDollar(wrap).append(document.createTextNode(` ${v}`));
        dfDollar(control).append(wrap);
      }
    } else if (ed.kind === 'select') {
      control = document.createElement('select');
      if (!('default' in spec)) dfDollar(control).append(new Option('—', ''));
      for (const v of spec.values || []) dfDollar(control).append(new Option(v, v));
    } else {
      control = document.createElement('input');
      control.type = 'text';
    }
    control.classList.add('code-example-control');
    const sendControl = () =>
      send(root, 'set-state', {
        state: name,
        value: ed.kind === 'checkbox' ? control.checked : ed.kind === 'number' ? (control.value === '' ? null : Number(control.value)) : control.value,
      });
    // radios send from their own inputs - the bubbling change must not send twice
    if (ed.kind !== 'radio') dfDollar(control).on('change', sendControl);
    if (ed.kind === 'text' || ed.kind === 'number') {
      let keyTimer = 0;
      dfDollar(control).on('keyup', () => { clearTimeout(keyTimer); keyTimer = setTimeout(sendControl, 250); });
    }
    for (const k of ['format', 'currency', 'locale']) if (ed.props[k]) control.setAttribute(`data-${k}`, String(ed.props[k]));
    dfDollar(row).append(control);
    dfDollar(grid).append(row);
    c.rows[name] = control;
    if ('default' in spec) applyControl(root, name, spec.default);
  }
  dfDollar(panel).append(grid);
  const acts = Object.keys(schema.actions || {});
  if (acts.length) {
    const bar = document.createElement('div');
    bar.className = 'code-example-actions';
    for (const name of acts) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.action = name;
      b.textContent = `${name}()`;
      dfDollar(b).on('click', () => send(root, 'action', { action: name }));
      dfDollar(bar).append(b);
    }
    dfDollar(panel).append(bar);
  }
}

/** show an observed value in its control (never while the user types in it) */
function applyControl(root, name, value) {
  const control = root._ce.rows[name];
  if (!control || (document.activeElement && control.contains(document.activeElement))) return;
  if (control.type === 'checkbox') control.checked = !!value;
  else if (control.classList.contains('code-example-radio-group')) dfDollar(control).find('input').each((_i, r) => { r.checked = r.value === String(value); });
  else control.value = value === null || value === undefined ? '' : String(value);
}

/** el.preview: drives the PREVIEWED component (its schema states) - installed on the first 'ready', when the bridge listens */
function previewHandle(root) {
  const c = root._ce;
  return {
    setState: (name, value) => {
      const spec = c.schema?.states?.[name];
      if (!spec && name !== 'default') throw new Error(`code-example: unknown preview state "${name}" (schema states: ${Object.keys(c.schema?.states ?? {}).join(', ')})`);
      if (!spec) {
        for (const k of Object.keys(c.schema?.states ?? {})) if ('default' in c.schema.states[k]) send(root, 'set-state', { state: k, value: c.schema.states[k].default });
        return;
      }
      const v = value && typeof value === 'object' && 'value' in value ? value.value
        : ['boolean', 'number', 'string'].includes(typeof value) ? value
        : spec.type === 'boolean' ? true : 'default' in spec ? spec.default : null;
      send(root, 'set-state', { state: name, value: v });
    },
    getState: () => ({ ...c.observed }),
  };
}

// -- messages from the previews -----------------------------------------------------------------------

function onMessage(root, d) {
  const c = root._ce;
  if (d.kind === 'ready') {
    // a fresh preview of the (possibly edited) source: observe it, replay nothing
    send(root, 'read-state');
    c.ready = true;
    if (!root.preview) root.preview = previewHandle(root);
    // The preview finished loading the source - its state can be driven (el.preview) from now on.
    root.dispatchEvent(new CustomEvent<CodeExampleReadyDetail>('code-example-ready', { bubbles: true, detail: { source: c.lastRun } }));
  } else if (d.kind === 'state') {
    c.observed = d.values || {};
    dfDollar(root).attr('data-state-values', JSON.stringify(c.observed));
    for (const name of Object.keys(c.observed)) applyControl(root, name, c.observed[name]);
  } else if (d.kind === 'source') {
    // the preview serialized a change into source - written only while the editor
    // still holds exactly what the preview runs (never over an un-run edit)
    if (d.source && !c.rerunTimer && document.activeElement !== c.src && c.src.value === c.lastRun) {
      writeSource(root, d.source);
      c.lastRun = d.source;
    }
  } else if (d.kind === 'error') showError(root, d.message || 'Preview error', d.stack);
  else if (d.kind === 'escape') leaveOverlays(); // Escape inside a preview is Escape on the page
  else if (d.kind === 'height') {
    // device modes pin the frame to the device box; measured modes follow the content
    if (c.vpMode !== 'phone' && c.vpMode !== 'tablet') c.frame.style.height = `${Math.min(MAX_FRAME_HEIGHT, Math.max(c.minHeight, (d.height || 0) + 2))}px`;
  }
}

// -- the device toolbar -----------------------------------------------------------------------------

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
/** trailing debounce: the shared one when the runtime offers it */
function debounce(fn, wait) {
  const shared = df$.shared?.debounce;
  if (typeof shared === 'function') return shared(fn, wait);
  let t = 0;
  return () => { clearTimeout(t); t = setTimeout(fn, wait); };
}

// VERIFIED: (CPU profile of diagram.html, 12 cards) layout reads and style writes run in separate
// passes over every card at once: a read after a write forces a synchronous layout of the whole
// page, and one per card cost ~5 s of main thread before load; batched, the page loads in ~2 s.

/** fit each card's canvas into its stage (Auto) or apply the typed Zoom % */
function vpZoomAll(roots) {
  const plan = [];
  for (const root of roots) {
    const c = root._ce;
    if (!c.vpZ) continue;
    const canvas = c.resizer || c.device;
    const manual = clamp(Math.round(Number(c.vpZ.value) || 0), 0, 100);
    if (manual >= 25) plan.push({ root, canvas, z: Math.min(manual, 100) });
    else if (!c.fitFrozen) plan.push({ root, canvas, z: 0 }); // a user-sized canvas tracks 1:1 - the stage scrolls instead
  }
  // natural width = unzoomed box (CSS zoom feeds back into layout): clear every fitted zoom, then read
  for (const p of plan) if (!p.z) p.canvas.style.zoom = '';
  for (const p of plan) {
    if (p.z) continue;
    const c = p.root._ce;
    const box = p.canvas.getBoundingClientRect();
    let fit = Math.max(c.stage.clientWidth - 24, 120) / (box.width || 1);
    if (dfDollar(p.root).attr('data-fullscreen') != null && (c.vpMode === 'phone' || c.vpMode === 'tablet') && box.height) {
      fit = Math.min(fit, Math.max(c.stage.clientHeight - 24, 120) / box.height);
    }
    p.z = clamp(Math.floor(Math.min(fit, 1) * 20) * 5, 25, 100);
  }
  for (const p of plan) {
    p.canvas.style.zoom = p.z < 100 ? String(p.z / 100) : '';
    dfDollar(p.root).attr('data-vp-zoom', String(p.z));
  }
}

function vpZoomApply(root) {
  vpZoomAll([root]);
}

/** size each card's canvas for its viewport mode, fit it, then align a wider canvas to the stage start */
function vpApplyAll(roots) {
  for (const root of roots) {
    const c = root._ce;
    const dev = c.vpMode === 'phone' || c.vpMode === 'tablet';
    const rawW = Number(c.vpW.value);
    const w = rawW > 0 ? clamp(rawW, 240, 1600) : 0;
    const rawH = Number(c.vpH.value);
    const h = rawH > 0 ? clamp(rawH, 240, 1400) : 0;
    if (c.resizer) c.resizer.style.cssText = '';
    c.device.style.cssText = '';
    c.frame.style.width = '100%';
    if (dev) {
      if (c.resizer && w) c.resizer.style.width = `${w}px`;
      if (c.resizer && h) c.resizer.style.height = `${h}px`;
      c.frame.style.height = '100%';
    } else {
      if (c.resizer && w) c.resizer.style.width = `${w}px`;
      if (c.frame.style.height === '100%') c.frame.style.height = '';
      send(root, 'measure');
    }
  }
  vpZoomAll(roots);
  // a device box may overflow the stage vertically; a wider measured canvas scrolls from its start
  // (overflow first: a scrollbar changes the stage's clientWidth the measure compares against)
  for (const root of roots) {
    const c = root._ce;
    c.stage.style.overflow = c.vpMode === 'phone' || c.vpMode === 'tablet' ? 'visible' : 'auto';
  }
  const wide = roots.map((root) => {
    const c = root._ce;
    const canvas = c.resizer || c.device;
    return canvas.getBoundingClientRect().width * ((Number(dfDollar(root).attr('data-vp-zoom')) || 100) / 100) > c.stage.clientWidth - 24;
  });
  roots.forEach((root, i) => {
    const c = root._ce;
    const dev = c.vpMode === 'phone' || c.vpMode === 'tablet';
    c.stage.style.justifyContent = !dev && wide[i] ? 'flex-start' : '';
    dfDollar(root).attr('data-vp-mode', c.vpMode);
    dfDollar(c.screen).attr('data-mode', c.vpMode);
    if (c.resizer) {
      const axis = dev ? 'both' : 'w';
      if (dfDollar(c.resizer).attr('data-axis') !== axis) dfDollar(c.resizer).attr('data-axis', axis);
    }
  });
}

function vpApply(root) {
  vpApplyAll([root]);
}

/** the cards initialized in one pass get their first fit together, in one microtask */
const fitQueue = new Set<HTMLElement>();
function scheduleFit(root) {
  if (!fitQueue.size) queueMicrotask(() => {
    const roots = [...fitQueue].filter((r) => r.isConnected);
    fitQueue.clear();
    vpApplyAll(roots);
  });
  fitQueue.add(root);
}

function vpSetMode(root, mode) {
  const c = root._ce;
  c.vpMode = mode;
  c.fitFrozen = false;
  const dev = !!VP_DEVICES[mode];
  if (c.vpRotate) {
    dfDollar(c.vpRotate).prop('disabled', !dev);
    dfDollar(c.vpRotate).attr('aria-disabled', String(!dev));
  }
  dfDollar(c.screen).attr('data-landscape', null);
  dfDollar(c.vpH).prop('disabled', !dev);
  if (dev) {
    c.vpW.value = String(VP_DEVICES[mode][0]);
    c.vpH.placeholder = 'Height';
    c.vpH.value = String(VP_DEVICES[mode][1]);
  } else {
    c.vpW.value = mode === 'desktop' ? '1024' : '';
    c.vpH.value = '';
    c.vpH.placeholder = 'Full';
  }
  dfDollar(root).find('.code-example-vp[data-vp]').each((_i, b) => {
    if (b.dataset.vp !== 'rotate') dfDollar(b).attr('aria-pressed', String(b.dataset.vp === mode));
  });
  vpApply(root);
}

function initViewport(root) {
  const c = root._ce;
  c.vpW = part(root, '.code-example-vp-w');
  c.vpH = part(root, '.code-example-vp-h');
  c.vpZ = part(root, '.code-example-vp-z');
  c.vpRotate = part(root, '.code-example-vp[data-vp="rotate"]');
  if (!c.screen || !c.device || !c.vpW || !c.vpH) return;
  c.vpMode = 'full';
  dfDollar(root).find('.code-example-vp[data-vp]').each((_i, b) => {
    if (b.dataset.vp !== 'rotate') dfDollar(b).on('click', () => vpSetMode(root, b.dataset.vp));
  });
  const boot = dfDollar(root).attr('data-vp-mode');
  if (boot && boot !== 'full' && VP_MODES.includes(boot)) vpSetMode(root, boot);
  if (c.vpZ) {
    // an empty (Auto) zoom field steps from 100 on the first spinner click / arrow / wheel; an untouched seed reverts on blur
    let seeded = false;
    dfDollar(c.vpZ).on('input', () => { seeded = false; vpZoomApply(root); });
    const seed = (e) => {
      if (c.vpZ.value) return;
      if (e.type === 'keydown' && !/^(ArrowUp|ArrowDown|PageUp|PageDown)$/.test(e.key)) return;
      c.vpZ.value = '100';
      seeded = true;
    };
    dfDollar(c.vpZ).on('pointerdown', seed);
    dfDollar(c.vpZ).on('keydown', seed);
    dfDollar(c.vpZ).on('wheel', seed);
    dfDollar(c.vpZ).on('click', () => { if (seeded) c.vpZ.select(); });
    dfDollar(c.vpZ).on('blur', () => { if (seeded) c.vpZ.value = ''; seeded = false; });
  }
  if (c.vpRotate) {
    dfDollar(c.vpRotate).on('click', () => {
      if (c.vpRotate.disabled) return;
      const w = c.vpW.value;
      c.vpW.value = c.vpH.value;
      c.vpH.value = w;
      dfDollar(c.screen).attr('data-landscape', dfDollar(c.screen).attr('data-landscape') == null ? '1' : null);
      vpApply(root);
    });
  }
  for (const inp of [c.vpW, c.vpH]) {
    dfDollar(inp).on('change', () => {
      if (inp === c.vpH && c.vpH.disabled) return;
      c.fitFrozen = true; // a typed size is deliberate, like a drag
      vpApply(root);
    });
  }
  if (c.resizer) {
    scheduleFit(root);
    const settle = debounce(() => vpApply(root), 120);
    // the resizer component (all.js) owns the gesture; the toolbar owns the size
    dfDollar(c.resizer).on('resizer-resize', (ev) => {
      const d = (ev as CustomEvent).detail;
      if (!d) return;
      const dev = c.vpMode === 'phone' || c.vpMode === 'tablet';
      if (d.axis === 'h' && !dev) return;
      c.fitFrozen = true;
      const w = Math.round(clamp(d.width, 240, 1600));
      c.vpW.value = String(w);
      c.resizer.style.width = `${w}px`;
      if (dev) {
        const h = Math.round(clamp(d.height, 240, 1400));
        c.vpH.value = String(h);
        c.resizer.style.height = `${h}px`;
      }
      settle();
    });
  }
}

// -- State API ----------------------------------------------------------------------------------------

/** the panel a state opens */
const panelOf = (name, cfg) => (name === 'code' || name === 'state' ? name : name === 'fullscreen' ? (cfg?.panel ?? null) : null);

/**
 * The markup of a state - the one place a state becomes attributes: the open
 * panel and its pressed tab, data-fullscreen with the Fullscreen button's
 * label, data-edited when the source differs from the authored one. setState
 * runs it on the live card, render() on a detached copy of the authored markup.
 */
function applyMarkup(el, name, cfg) {
  ensureShell(el);
  const $el = dfDollar(el);
  const hasState = $el.find('.code-example-panel[data-panel="state"]').length > 0;
  let open = panelOf(name, cfg);
  if (open === 'state' && !hasState) open = null;
  $el.find('.code-example-tab').each((_i, t) => { dfDollar(t).attr('aria-pressed', String(t.dataset.tab === open)); });
  $el.find('.code-example-panel').each((_i, p) => { dfDollar(p).attr('hidden', p.dataset.panel === open ? null : ''); });
  const full = name === 'fullscreen';
  $el.attr('data-fullscreen', full ? '' : null);
  $el.find('.code-example-full').html(full ? buttonContent('minimize', 'Exit fullscreen') : buttonContent('maximize', 'Fullscreen'));
  const src = $el.find<HTMLTextAreaElement>('textarea.code-example-src').get(0);
  const original = src ? src.defaultValue : '';
  $el.attr('data-edited', typeof cfg?.source === 'string' && cfg.source !== original ? '' : null);
}

/** the state the card shows: fullscreen, else the open panel */
function readState(el) {
  const $el = dfDollar(el);
  const open = $el.find('.code-example-tab[aria-pressed="true"]').get(0)?.dataset.tab ?? null;
  const source = el._ce?.src.value ?? '';
  if ($el.attr('data-fullscreen') != null) return { name: 'fullscreen', config: { source, panel: open } };
  return { name: open === 'code' || open === 'state' ? open : 'default', config: { source } };
}

/** UI side of setState: the source, the markup, then what the markup implies (paint, fullscreen, controls) */
function triggerStateChange(root, state, incoming) {
  const c = root._ce;
  if (typeof incoming?.source === 'string' && incoming.source !== c.src.value) {
    writeSource(root, incoming.source);
    run(root, incoming.source);
    emitChange(root, 'api');
  }
  const cfg = { ...state.config, source: c.src.value };
  if (state.name === 'state' && !part(root, '.code-example-panel[data-panel="state"]')) {
    applyMarkup(root, 'default', cfg);
    dfDollar(root).attr('data-state-name', 'default'); // no state controls - lands in default
  } else applyMarkup(root, state.name, cfg);
  if (state.name !== 'fullscreen' && document.fullscreenElement === root) document.exitFullscreen?.().catch(() => {});
  if (panelOf(state.name, state.config) === 'code') paint(root);
  if (panelOf(state.name, state.config) === 'state') send(root, 'read-state');
  setTimeout(() => refit(root), 50); // the stage size changed with the panels / fullscreen
}

/** the source changed - typing settles first (data-debounce, default the rerun delay) */
function emitChange(root, origin) {
  // Fires after the source changed and the preview reran - typing (debounced), setSource(), reset(), setState() with a { source }; the source and where the change came from: 'input' or 'api'.
  root.dispatchEvent(new CustomEvent<CodeExampleChangeDetail>('code-example-change', { bubbles: true, detail: { source: root._ce.src.value, origin } }));
}

/** Registry-level API; pass the card explicitly. Unknown names throw. */
export const codeExampleApi = componentState({
  component: 'code-example',
  states: codeExampleStates,
  apply: (root, state, _previous, incoming) => triggerStateChange(root, state, incoming),
  // typing, the tabs and the Fullscreen button change the state without setState
  read: (root) => readState(root),
  events: ['input', 'click'],
  markup: (el, state) => applyMarkup(el, state.name, state.config),
});

df$.codeExampleApi = codeExampleApi;
df$.codeExampleStates = codeExampleStates;

// -- df$.shadcn.codeExample --------------------------------------------------------------------------

const resolveCard = (target) => (typeof target === 'string' ? dfDollar(target).get(0) : target) ?? null;

function refit(root) {
  if (root._ce?.vpW) vpApply(root);
}

/** native fullscreen when the browser grants it; the overlay (data-fullscreen) either way */
function enterFullscreen(root) {
  const panel = readState(root).config.panel;
  root.api.setState('fullscreen', { panel });
  const req = root.requestFullscreen ? root.requestFullscreen() : null;
  req?.catch?.(() => {}); // refused (an embedded page, no gesture) - the overlay stays
}
function exitFullscreen(root) {
  const open = readState(root).config.panel;
  root.api.setState(open === 'code' || open === 'state' ? open : 'default');
}

/** Escape: every card in the fullscreen overlay returns (native fullscreen exits by itself) */
function leaveOverlays() {
  for (const root of registry.values()) if (dfDollar(root).attr('data-fullscreen') != null && document.fullscreenElement !== root) exitFullscreen(root);
}

df$.codeExample = {
  /** Configure every preview on the page: { styles, scripts } (arrays of URLs or { css } / { js } texts, or a function of the source returning one - default: the page's own stylesheets and all/core bundle), tail (markup after the runtime, e.g. an icon library), theme (CSS text or a function returning it - layered last, re-read by refreshTheme), highlight(code, language) → HTML of coloured spans (default: Shiki), shiki (its ESM URL), themes ({ light, dark } Shiki themes). Previews built afterwards use it.
   * @param options - the keys to change; the cards on the page repaint their source
   */
  configure(options: CodeExampleConfig = {}): void {
    for (const k of Object.keys(options)) if (k in config) config[k] = options[k];
    dfDollar('.code-example[data-init]').each((_i, root) => {
      if (root._ce) { root._ce.painted = null; paint(root); }
    });
  },
  /**
   * The card's current source.
   * @param target - the .code-example card or its selector
   * @returns the editor's text ('' when the target is not a card)
   */
  source: (target: string | HTMLElement): string => resolveCard(target)?._ce?.src.value ?? '',
  /**
   * Replace the source and rerun the preview (the state stays; data-edited follows).
   * @param target - the .code-example card or its selector
   * @param source - the new source
   */
  setSource(target: string | HTMLElement, source: string): void {
    const root = resolveCard(target);
    if (root?.api) root.api.setState(readState(root).name, { ...readState(root).config, source: String(source ?? '') });
  },
  /**
   * Back to the authored source, rerun.
   * @param target - the .code-example card or its selector
   */
  reset(target: string | HTMLElement): void {
    const root = resolveCard(target);
    if (root?._ce) df$.codeExample.setSource(root, root._ce.original);
  },
  /**
   * Rebuild the preview from the current source now.
   * @param target - the .code-example card or its selector
   */
  run(target: string | HTMLElement): void {
    const root = resolveCard(target);
    if (root?._ce) run(root, root._ce.src.value);
  },
  /**
   * Switch the preview device: 'phone' | 'tablet' | 'desktop' | 'full'.
   * @param target - the .code-example card or its selector
   * @param mode - the device width the preview takes
   */
  viewport(target: string | HTMLElement, mode: 'phone' | 'tablet' | 'desktop' | 'full'): void {
    const root = resolveCard(target);
    if (root?._ce && VP_MODES.includes(mode)) vpSetMode(root, mode);
  },
  /**
   * Drive a state of the previewed component (a state of its schema) - the State tab's controls do the same.
   * @param target - the .code-example card or its selector
   * @param name - the state's name in the component's schema
   * @param value - its new value (the schema's type for it)
   */
  setPreviewState(target: string | HTMLElement, name: string, value: string | number | boolean): void {
    const root = resolveCard(target);
    if (root?._ce) send(root, 'set-state', { state: name, value });
  },
  /**
   * The previewed component's observed state values (as the State tab shows them).
   * @param target - the .code-example card or its selector
   * @returns a copy of the values the preview reported, by state name
   */
  previewState: (target: string | HTMLElement): Record<string, string | number | boolean> => ({ ...resolveCard(target)?._ce?.observed }),
  /** Re-read the configured theme and hand it to every preview (no rebuild - the previews keep their state). */
  refreshTheme(): void {
    resolveTheme().then((css) => { for (const root of registry.values()) send(root, 'set-theme', { css }); });
  },
  highlight,
  /**
   * Copy the card's source to the clipboard.
   * @param target - the .code-example card or its selector
   * @returns true when the clipboard took it
   */
  async copy(target: string | HTMLElement): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(resolveCard(target)?._ce?.src.value ?? '');
      return true;
    } catch {
      return false;
    }
  },
};

// -- page-level wiring (once) ----------------------------------------------------------------------

if (!document.__codeExampleInit) {
  document.__codeExampleInit = true;
  addEventListener('message', (e) => {
    const d = e.data;
    if (!d || d.type !== 'ce' || !d.ch) return;
    const root = registry.get(d.ch);
    if (root) onMessage(root, d);
  });
  // a drag inside a preview released over the page: the preview never sees the pointerup
  const release = () => { for (const root of registry.values()) send(root, 'pointer-release'); };
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);
  addEventListener('blur', release);
  // dark mode follows the page without a rebuild (the previews keep their state)
  new MutationObserver(() => {
    const dark = document.documentElement.classList.contains('dark');
    for (const root of registry.values()) send(root, 'set-dark', { value: dark });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('fullscreenchange', () => {
    // the browser left fullscreen (Esc): the card follows
    for (const root of registry.values()) if (dfDollar(root).attr('data-fullscreen') != null && document.fullscreenElement !== root && root._ce.native) exitFullscreen(root);
    for (const root of registry.values()) root._ce.native = document.fullscreenElement === root;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') leaveOverlays();
  });
  addEventListener('resize', debounce(() => {
    vpZoomAll([...registry.values()].filter((root) => root._ce.vpZ && !root._ce.vpZ.value));
  }, 120));
}

// -- init -----------------------------------------------------------------------------------------------

// previews boot lazily: near the viewport, or once the page is idle
const io = typeof IntersectionObserver === 'function'
  ? new IntersectionObserver((list) => {
      for (const en of list) {
        if (en.isIntersecting && (en.target as HTMLElement)._ce && !(en.target as HTMLElement)._ce.booted) {
          io.unobserve(en.target);
          run(en.target, (en.target as HTMLElement)._ce.src.value);
        }
        // a hidden editor paints once it shows up
        if (en.isIntersecting && (en.target as HTMLElement)._ce?.stale) paint(en.target);
      }
    }, { rootMargin: IO_ROOT_MARGIN })
  : null;
let idleTimer = 0;
function bootRemaining() {
  for (const root of registry.values()) if (!root._ce.booted && root.isConnected) run(root, root._ce.src.value);
}

function initCard(root) {
  ensureShell(root);
  const src = part(root, 'textarea.code-example-src');
  if (!src) return;
  let schema = null;
  try {
    schema = JSON.parse(dfDollar(root).attr('data-schema') || 'null');
  } catch {
    schema = null; // a malformed schema: no state controls
  }
  const c = {
    ch: `ce${Math.random().toString(36).slice(2, 10)}`,
    src,
    original: src.defaultValue,
    schema,
    frame: part(root, '.code-example-frame'),
    stage: part(root, '.code-example-stage'),
    screen: part(root, '.code-example-screen'),
    device: part(root, '.code-example-device'),
    resizer: part(root, '.code-example-resizer'),
    error: part(root, '.code-example-error'),
    editor: part(root, '.code-example-editor'),
    paint: part(root, '.code-example-paint'),
    minHeight: Math.max(MIN_FRAME_HEIGHT, (Number(dfDollar(root).attr('data-height')) || 0) * REM_PX),
    rows: {},
    observed: {},
    lastRun: '',
    rerunTimer: 0,
    booted: false,
    ready: false,
  };
  root._ce = c;
  registry.set(c.ch, root);
  // el.store + el.api: `$('#card').api.setState('code')`
  bindComponent(root, codeExampleApi, { name: 'default', config: { source: src.value } });
  buildControls(root);
  initViewport(root);
  // the tabs toggle: a second click on the open tab closes it
  dfDollar(root).find('.code-example-tab').each((_i, tab) => {
    dfDollar(tab).on('click', () => {
      const next = dfDollar(tab).attr('aria-pressed') === 'true' ? null : tab.dataset.tab;
      if (dfDollar(root).attr('data-fullscreen') != null) root.api.setState('fullscreen', { panel: next });
      else root.api.setState(next ?? 'default');
    });
  });
  dfDollar(src).on('input', () => {
    dfDollar(root).attr('data-edited', src.value !== c.original ? '' : null);
    paint(root);
    clearTimeout(c.rerunTimer);
    c.rerunTimer = setTimeout(() => {
      c.rerunTimer = 0;
      run(root, src.value);
      emitChange(root, 'input');
    }, RERUN_DEBOUNCE_MS);
  });
  dfDollar(src).on('scroll', () => syncScroll(root));
  dfDollar(src).on('keydown', (e) => onKeydown(root, e));
  const reset = part(root, '.code-example-reset');
  if (reset) dfDollar(reset).on('click', () => df$.codeExample.reset(root));
  const copy = part(root, '.code-example-copy');
  if (copy) {
    dfDollar(copy).on('click', async () => {
      const ok = await df$.codeExample.copy(root);
      dfDollar(copy).html(buttonContent(ok ? 'check' : 'copy', ok ? 'Copied' : 'Copy failed'));
      setTimeout(() => dfDollar(copy).html(buttonContent('copy', 'Copy')), 1200);
    });
  }
  const full = part(root, '.code-example-full');
  if (full) dfDollar(full).on('click', () => (dfDollar(root).attr('data-fullscreen') != null ? exitFullscreen(root) : enterFullscreen(root)));
  const exit = part(root, '.code-example-full-exit');
  if (exit) dfDollar(exit).on('click', () => exitFullscreen(root));
  // in fullscreen the stage follows the screen and the panels - refit once per burst
  if (c.stage && typeof ResizeObserver === 'function') {
    const settle = debounce(() => { if (dfDollar(root).attr('data-fullscreen') != null) refit(root); }, 60);
    new ResizeObserver(settle).observe(c.stage);
  }
  if (io) io.observe(root);
  else run(root, src.value);
}

function init() {
  let found = 0;
  dfDollar('.code-example:not([data-init])').each((_i, root) => {
    dfDollar(root).data('init', '');
    initCard(root);
    found++;
  });
  if (!found) return;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(bootRemaining, IDLE_BOOT_MS);
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
