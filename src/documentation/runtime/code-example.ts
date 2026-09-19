// -- code-example.js -------------------------------------------------
// Host runtime for the docs CodeExample widget (docs-site-only, not shipped).
// Renders each `.code-example` card (emitted statically by the docs build from
// the canonical `example` fence) as a live sandboxed preview: the exact source
// in the textarea becomes the iframe srcdoc verbatim (plan §4 — one source;
// editor and execution share the same bytes), and the state panel is generated
// EXCLUSIVELY from the schema JSON the SSR component embedded in `data-schema`
// (§10 — never component-name branching).
//
// Protocol (plan §9): host → sandbox {type:'ce-host', ch, kind:'set-state'|
// 'action'|'read-state'|'set-dark'}; sandbox → host {type:'ce', ch, kind:
// 'ready'|'state'|'error'|'height'}. `ch` is a per-example channel id, so
// examples on one page cannot cross-talk. The iframe is sandbox="allow-scripts"
// ONLY (§9): no allow-same-origin — edited examples cannot touch the page.
//
// One document-level `message` listener routes by channel through a registry
// (per-example listeners would leak across SPA navigations). Every observed
// sandbox state is mirrored onto the host element as `data-state-values` — the
// §11 contract ("the DOM is authoritative") made assertable from the outside
// (tests + e2e read it without reaching into the opaque-origin iframe).
//
// No ES module (matches the other docs runtime scripts). No globals beyond the
// staged docs namespace (AGENTS.md "No window globals"): all state is inside
// this IIFE.

(function () {
  'use strict';

  var RERUN_DEBOUNCE_MS = 400;
  var MIN_FRAME_HEIGHT = 64;
  var MAX_FRAME_HEIGHT = 900;
  /** shipped docs stylesheets mirrored into the sandbox (path fragments) */
  var STYLE_FRAGMENTS = [
    'default-semantic-tokens.css',
    'sizing.css',
    'docs-theme.css',
    'docs-utilities.css',
    'components/all.css',
  ];
  // ?raw: under the Vite dev/preview server (bun run dev, Vitest) a plain .js
  // fetch gets Vite's module transform (HMR boilerplate breaks the bridge);
  // ?raw returns the bytes verbatim. Static hosts (build, Pages, jsDelivr)
  // ignore query strings, so production serves the identical file either way.
  var RAW = '?raw';
  var BRIDGE_URL = 'templates/sandbox-bridge.js' + RAW;
  var TEMPLATE_URL = 'templates/sandbox-doc.html' + RAW;
  // Vite's dev/preview server injects its HMR client into served HTML (it
  // even survives ?raw in the Vitest browser server). The sandbox must not
  // load it: it needs import.meta + a WebSocket the sandbox can't provide,
  // and its load error would red-flag a perfectly good preview.
  var VITE_CLIENT = /<script[^>]*\/@vite\/client[^>]*><\/script>\s*/g;

  /**
   * Vite dev/preview servers answer ?raw with a JS module wrapper
   * (`export default "<file>"`, JSON-escaped); static hosts ignore the query
   * and return the bytes. Unwrap when the wrapper is present so every host
   * gets the identical raw text.
   */
  function unwrapRaw(t) {
    if (t.indexOf('export default') !== 0) return t;
    // Vite dev wraps raw imports as `export default "…json-escaped…"` possibly
    // followed by `;` / a sourcemap comment — parse ONLY the string literal
    var m = /^export default ("(?:[^"\\]|\\.)*")/.exec(t);
    if (m) {
      try {
        return JSON.parse(m[1]);
      } catch {
        /* not the wrapper — return as-is */
      }
    }
    return t;
  }
  function cleanTemplate(t) {
    return unwrapRaw(t).replace(VITE_CLIENT, '');
  }
  function cachedFetch(url) {
    var promise = null;
    return function () {
      if (!promise)
        promise = fetch(url)
          .then(function (r) {
            if (!r.ok) throw new Error(url + ' → HTTP ' + r.status);
            return r.text();
          })
          .then(unwrapRaw)
          .catch(function (e) {
            promise = null;
            throw e;
          });
      return promise;
    };
  }
  var sandboxTemplate = (function () {
    var promise = null;
    return function () {
      if (!promise)
        promise = fetch(TEMPLATE_URL)
          .then(function (r) {
            if (!r.ok) throw new Error(TEMPLATE_URL + ' → HTTP ' + r.status);
            return r.text();
          })
          .then(cleanTemplate)
          .catch(function (e) {
            promise = null;
            throw e;
          });
      return promise;
    };
  })();
  var bridgeSource = cachedFetch(BRIDGE_URL);

  /** absolute URLs of the docs stylesheets the preview renders against —
   * taken from the live <link> tags, so the jsDelivr CDN mirror just works. */
  function styleUrls() {
    var out = [];
    document.querySelectorAll('link[rel="stylesheet"]').forEach(function (l) {
      var href = l.getAttribute('href') || '';
      for (var i = 0; i < STYLE_FRAGMENTS.length; i++)
        if (href.indexOf(STYLE_FRAGMENTS[i]) >= 0) {
          out.push(l.href);
          break;
        }
    });
    // active tweakcn theme sheet (theme-switcher.js), when one is applied
    var theme = document.getElementById('theme-css');
    if (theme && theme.getAttribute('href')) out.push(theme.href);
    return out;
  }

  /** the shipped runtime bundle (df$) as TEXT, inlined into each srcdoc: a
   * module <script src> from the sandbox's opaque origin would need CORS that
   * static hosts (Bun.serve screenshot server!) don't send; inlining removes
   * the dependency. URL derived like the mirror rewrites it (local + CDN). */
  var runtimeTextPromise = null;
  function runtimeText() {
    if (!runtimeTextPromise) {
      var link = Array.prototype.find.call(
        document.querySelectorAll('link[rel="stylesheet"]'),
        function (l) {
          return (l.href || '').indexOf('components/all') >= 0;
        },
      );
      var url = link ? link.getAttribute('href').replace(/\.css(\?.*)?$/, '.js') : '../components/all.js';
      runtimeTextPromise = fetch(url + (url.includes('?') ? '&' : '?') + 'raw')
        .then(function (r) {
          if (!r.ok) throw new Error('components bundle → HTTP ' + r.status);
          return r.text();
        })
        .then(function (t) {
          return unwrapRaw(t).replace(/<\/script/gi, '<\\/script'); // srcdoc-safe (all.js is import-free, plan §2.3)
        })
        .catch(function (e) {
          runtimeTextPromise = null;
          throw e;
        });
    }
    return runtimeTextPromise;
  }

  // -- editor mapping: mirrors editorFor() in the shared contract (plan §3:
  // schema hint when recognized, generic fallback by type — no branching) ----
  function editorFor(spec) {
    var byType =
      spec.type === 'boolean' ? 'checkbox' : spec.type === 'number' ? 'number' : spec.type === 'enum' ? 'select' : 'text';
    var hint = spec.editor && spec.editor.component;
    var known = ['text', 'number', 'checkbox', 'radio', 'select'];
    return { kind: known.indexOf(hint) >= 0 ? hint : byType, props: (spec.editor && spec.editor.props) || {} };
  }

  /** ch → controller; the single global listener + dark observer route here. */
  var registry = {};

  addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.type !== 'ce' || !d.ch) return; // per-example channel (§9): foreign postMessages ignored
    var c = registry[d.ch];
    if (c) c.onMessage(d);
  });

  // dark-mode toggle → every sandbox (layout.js flips <html class="dark">; the
  // sandboxes follow via postMessage — a rebuild would discard example state)
  new MutationObserver(function () {
    var dark = document.documentElement.classList.contains('dark');
    for (var ch in registry) registry[ch].send('set-dark', { value: dark });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  function init() {
    // NOTE: registry is intentionally NEVER cleared — init() re-runs after
    // every SPA navigation (onPageReady), and wiping it would orphan the
    // sandboxes of cards already booted on this page (their bridge messages
    // would silently drop). Stale channels of detached iframes are inert:
    // their documents are gone and send() no-ops once contentWindow is dead.
    document.querySelectorAll('.code-example:not([data-init])').forEach(function (el) {
      initExample(el);
    });
  }

  function initExample(root) {
    root.dataset.init = '';
    var frame = root.querySelector('.code-example-frame');
    var errBox = root.querySelector('.code-example-error');
    var src = root.querySelector('.code-example-src');
    var statePanel = root.querySelector('[data-panel="state"]');
    var codePanel = root.querySelector('[data-panel="code"]');
    var minHeight = Math.max(MIN_FRAME_HEIGHT, Number(root.dataset.height) || 0);
    var original = src.value;
    var schema = null;
    try {
      if (root.dataset.schema) schema = JSON.parse(root.dataset.schema);
    } catch {
      /* malformed schema: State tab stays empty; verify's `component schemas`
         gate fails the build on the file itself, so this stays silent here */
    }
    // §9 per-example channel id: nothing on the page can cross-talk without it
    var ch = 'ce' + Math.random().toString(36).slice(2, 10);
    var rows = {}; // state name → control element
    var observed = {}; // last sandbox-observed values (§11: DOM wins)
    // No state overlay on purpose: the SOURCE is the single truth. Panel edits
    // serialize into the editor (§4 inverted), so a rebuild re-materializes
    // them from the code itself — replaying stored panel values would stomp
    // code edits (the exact desync users report).

    // -- srcdoc assembly (environment infra only — plan §6) -----------------
    var CE_SCRIPT_OPEN = '<scr' + 'ipt data-ce-chrome>';
    var CE_SCRIPT_CLOSE = '</scr' + 'ipt>';
    function buildSrcdoc(source) {
      return Promise.all([sandboxTemplate(), bridgeSource(), runtimeText()]).then(function (parts) {
        var dark = document.documentElement.classList.contains('dark');
        var styles = styleUrls()
          .map(function (u) {
            return '<link rel="stylesheet" href="' + u + '" />';
          })
          .join('\n');
        // all.js ships import-free (plan §2.3); it runs as a CLASSIC inline
        // script at END OF BODY in the opaque-origin sandbox — a module src=
        // would need CORS headers static hosts don't send, and in <head> the
        // component MutationObservers would run before <body> exists. Wrapped
        // in a function scope: on the host all.js loads as a module so its
        // top-level `var df$` is module-local; unwrapped in a classic script
        // that var would clobber the callable globalThis.df$ core Reflect.sets.
        // lucide mirrors the host page so icon examples render.
        var scripts =
          CE_SCRIPT_OPEN + '(function(){\n' + parts[2] + '\n})();' + CE_SCRIPT_CLOSE +
          '\n<scr' + 'ipt src="https://unpkg.com/lucide@1.8.0" data-ce-chrome></scr' + 'ipt>' +
          '\n' + CE_SCRIPT_OPEN + 'globalThis.lucide && lucide.createIcons();' + CE_SCRIPT_CLOSE + '\n';
        // function replacements: injected bytes contain `$` sequences (df$ in
        // all.js, `$&` in sources) that String.replace would expand as patterns
        return parts[0]
          .replace('<html lang="en">', () =>
            dark ? '<html lang="en" class="dark" style="color-scheme:dark">' : '<html lang="en">',
          )
          .replace('<!--CE_STYLES-->', () => styles)
          .replace('<!--CE_SOURCE-->', () => source)
          .replace('<!--CE_CH-->', () => JSON.stringify(ch))
          .replace('<!--CE_SCHEMA-->', () => (schema ? JSON.stringify(schema).replace(/</g, '\\u003c') : '{}'))
          .replace('<!--CE_BRIDGE-->', () => '\n' + scripts + CE_SCRIPT_OPEN.replace('data-ce-chrome', 'id="ce-bridge" data-ce-chrome') + parts[1] + CE_SCRIPT_CLOSE + '\n');
      });
    }

    var lastRun = ''; // the source bytes the running sandbox was built from
    function run(source) {
      lastRun = source;
      errBox.hidden = true;
      errBox.textContent = '';
      buildSrcdoc(source).then(
        function (doc) {
          frame.srcdoc = doc;
        },
        function (e) {
          showError('sandbox load failed: ' + (e && e.message ? e.message : String(e)));
        },
      );
    }
    function showError(message, stack) {
      errBox.hidden = false;
      errBox.textContent = message + (stack ? '\n' + stack : '');
    }

    // -- state controls (generated from schema ONLY — plan §10) -------------
    function buildControls() {
      statePanel.textContent = '';
      if (!schema || !Object.keys(schema.states).length) {
        var p = document.createElement('p');
        p.className = 'code-example-note';
        p.textContent = schema
          ? 'This component schema declares no states.'
          : 'No schema — this example renders without generated state controls.';
        statePanel.appendChild(p);
        return;
      }
      var grid = document.createElement('div');
      grid.className = 'code-example-states';
      Object.keys(schema.states).forEach(function (name) {
        var spec = schema.states[name];
        var ed = editorFor(spec);
        var row = document.createElement('div');
        row.className = 'code-example-row';
        row.dataset.stateName = name;
        var label = document.createElement('label');
        label.textContent = name;
        row.appendChild(label);
        var control;
        if (ed.kind === 'checkbox') {
          control = document.createElement('input');
          control.type = 'checkbox';
        } else if (ed.kind === 'number') {
          control = document.createElement('input');
          control.type = 'number';
          if (ed.props.min !== undefined) control.min = String(ed.props.min);
          if (ed.props.max !== undefined) control.max = String(ed.props.max);
          if (ed.props.step !== undefined) control.step = String(ed.props.step);
        } else if (ed.kind === 'radio') {
          control = document.createElement('div'); // radio group over the schema values
          control.className = 'code-example-radio-group';
          (spec.values || []).forEach(function (v) {
            var wrap = document.createElement('label');
            var r = document.createElement('input');
            r.type = 'radio';
            r.value = v;
            r.name = ch + '-' + name;
            r.addEventListener('change', function () {
              if (r.checked) api.send('set-state', { state: name, value: v });
            });
            wrap.appendChild(r);
            wrap.appendChild(document.createTextNode(' ' + v));
            control.appendChild(wrap);
          });
        } else if (ed.kind === 'select') {
          control = document.createElement('select');
          if (!('default' in spec)) control.appendChild(new Option('—', '')); // unset is a legal DOM state
          (spec.values || []).forEach(function (v) {
            control.appendChild(new Option(v, v));
          });
        } else {
          control = document.createElement('input');
          control.type = 'text';
        }
        control.classList.add('code-example-control');
        // one funnel: control → sandbox mutation → serialized back into code
        function sendControl() {
          api.send('set-state', {
            state: name,
            value:
              ed.kind === 'checkbox'
                ? control.checked
                : ed.kind === 'number'
                  ? control.value === ''
                    ? null
                    : Number(control.value)
                  : control.value,
          });
        }
        control.addEventListener('change', sendControl);
        // text/number fields: `change` fires only on blur/Enter — typing must
        // sync live, debounced so we don't spam the sandbox per keystroke
        if (ed.kind === 'text' || ed.kind === 'number') {
          var keyTimer = null;
          control.addEventListener('keyup', function () {
            if (keyTimer) clearTimeout(keyTimer);
            keyTimer = setTimeout(sendControl, 250);
          });
        }
        // editor hints ride as data-* (currency/locale formatting is display-level;
        // the state VALUE stays a plain number — §3)
        if (ed.props.format) control.setAttribute('data-format', String(ed.props.format));
        if (ed.props.currency) control.setAttribute('data-currency', String(ed.props.currency));
        if (ed.props.locale) control.setAttribute('data-locale', String(ed.props.locale));
        row.appendChild(control);
        grid.appendChild(row);
        rows[name] = control;
        if ('default' in spec) applyLocal(name, ed.kind, spec.default); // §11: DOM observation replaces this on ready
      });
      statePanel.appendChild(grid);
      var actions = Object.keys(schema.actions || {});
      if (actions.length) {
        var bar = document.createElement('div');
        bar.className = 'code-example-actions';
        actions.forEach(function (name) {
          var b = document.createElement('button');
          b.type = 'button';
          b.dataset.action = name;
          b.textContent = name + '()';
          b.addEventListener('click', function () {
            api.send('action', { action: name });
          });
          bar.appendChild(b);
        });
        statePanel.appendChild(bar);
      }
    }
    function applyLocal(name, kind, value) {
      var control = rows[name];
      if (!control) return;
      if (document.activeElement && control.contains(document.activeElement)) return; // never fight typing
      if (kind === 'checkbox') control.checked = !!value;
      else if (control.classList.contains('code-example-radio-group'))
        control.querySelectorAll('input').forEach(function (r) {
          r.checked = r.value === String(value);
        });
      else control.value = value === null || value === undefined ? '' : String(value);
    }

    var api = {
      send: function (kind, extra) {
        var msg = { type: 'ce-host', ch: ch, kind: kind };
        for (var k in extra) msg[k] = extra[k];
        if (frame.contentWindow) frame.contentWindow.postMessage(msg, '*');
      },
      onMessage: function (d) {
        if (d.kind === 'ready') {
          // fresh DOM parsed from the (possibly edited) source → observe it;
          // code is truth, so NOTHING is replayed over the new instance
          api.send('read-state', {});
        } else if (d.kind === 'state') {
          observed = d.values || {};
          root.dataset.stateValues = JSON.stringify(observed); // §11 mirror, assertable
          Object.keys(observed).forEach(function (name) {
            var spec = schema && schema.states[name];
            if (spec) applyLocal(name, editorFor(spec).kind, observed[name]);
          });
        } else if (d.kind === 'source') {
          // bidirectional editor sync (§4, inverted): the sandbox serialized its
          // live DOM (state attrs + reflected values), so panel edits and preview
          // typing both show up in the code. Written back only while the editor
          // still holds exactly the bytes the running sandbox was built from —
          // never over an un-run edit, never mid-typing (the editor is truth).
          if (d.source && !rerunTimer && document.activeElement !== src && src.value === lastRun) {
            src.value = d.source; // programmatic write fires no input → no re-run loop
            lastRun = d.source; // the editor now mirrors the running DOM exactly
          }
        } else if (d.kind === 'error') {
          showError(d.message || 'Sandbox error', d.stack);
        } else if (d.kind === 'height') {
          frame.style.height = Math.min(MAX_FRAME_HEIGHT, Math.max(minHeight, (d.height || 0) + 2)) + 'px';
        }
      },
    };
    registry[ch] = api;

    // State-API-style handle on the host element (AGENTS.md "State API"):
    // create-screenshots.ts and tests drive [data-state-demo] via api.setState;
    // a schema state maps to a sandbox mutation and 'default' resets every
    // state to its schema default. The bridge mirrors observed values onto
    // data-state-values, so getState() works from outside the opaque frame.
    root.api = {
      setState: function (name, config) {
        var spec = schema && schema.states[name];
        if (spec) {
          var value =
            config && 'value' in config
              ? config.value
              : spec.type === 'boolean'
                ? true
                : 'default' in spec
                  ? spec.default
                  : null;
          api.send('set-state', { state: name, value: value });
          return;
        }
        if (name === 'default') {
          Object.keys((schema && schema.states) || {}).forEach(function (k) {
            if ('default' in schema.states[k]) api.send('set-state', { state: k, value: schema.states[k].default });
          });
          return;
        }
        throw new Error(
          'CodeExample: unknown state "' + name + '" (schema states: ' + Object.keys((schema && schema.states) || {}).join(', ') + ')',
        );
      },
      getState: function () {
        return { name: JSON.parse(root.dataset.stateValues || '{}'), config: {} };
      },
    };

    // -- toolbar -------------------------------------------------------------
    root.querySelectorAll('.code-example-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var which = tab.dataset.tab;
        root.querySelectorAll('.code-example-tab').forEach(function (t) {
          t.setAttribute('aria-pressed', String(t === tab));
        });
        codePanel.hidden = which !== 'code';
        statePanel.hidden = which !== 'state';
        if (which === 'state') api.send('read-state', {});
      });
    });
    var rerunTimer = null;
    src.addEventListener('input', function () {
      if (rerunTimer) clearTimeout(rerunTimer);
      rerunTimer = setTimeout(function () {
        rerunTimer = null;
        run(src.value);
      }, RERUN_DEBOUNCE_MS);
    });
    root.querySelector('.code-example-reset').addEventListener('click', function () {
      src.value = original;
      run(src.value);
    });
    root.querySelector('.code-example-copy').addEventListener('click', function (ev) {
      var btn = ev.currentTarget;
      navigator.clipboard
        .writeText(src.value)
        .then(function () {
          btn.textContent = 'Copied';
          setTimeout(function () {
            btn.textContent = 'Copy';
          }, 1200);
        })
        .catch(function () {
          btn.textContent = 'Copy failed';
        });
    });

    buildControls();
    run(src.value);
  }

  // first load + every SPA navigation (docs.onPageReady — the same hook site.js
  // and shiki use; layout.js installs df$.shadcn.docs before this fires)
  document.addEventListener('DOMContentLoaded', function () {
    init();
    var docs = globalThis.df$ && globalThis.df$.shadcn && globalThis.df$.shadcn.docs;
    if (docs && docs.onPageReady) docs.onPageReady(init);
  });
})();
