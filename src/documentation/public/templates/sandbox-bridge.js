// Sandbox bridge for the docs CodeExample widget (environment infrastructure
// only — plan §6: it supplies the bridge + state plumbing, never example
// behavior; the example source runs verbatim). Injected inline into the srcdoc
// by runtime/code-example.ts after the example source, so its classic script
// registers error listeners BEFORE example module scripts run.
//
// Protocol (plan §9): parent -> sandbox {type:'ce', ch, kind:'set-state'|
// 'action'|'read-state'}; sandbox -> parent {type:'ce', ch, kind:'ready'|
// 'state'|'error'|'height'}. Every message carries the per-example channel id
// so examples on one page cannot cross-talk.
(function () {
  'use strict';

  // The host injects the channel + schema right before this script (as
  // globalThis.__CE_CH / globalThis.__CE_SCHEMA assignments).
  var ch = globalThis.__CE_CH;
  var schema = globalThis.__CE_SCHEMA || { states: {}, actions: {} };

  function post(kind, extra) {
    var msg = { type: 'ce', ch: ch, kind: kind };
    if (extra) for (var k in extra) msg[k] = extra[k];
    parent.postMessage(msg, '*');
  }

  // -- targets ----------------------------------------------------------
  /** 'root' = the [data-example-root] element, else the first real element in
   * the body (the example's own markup; chrome is the template's own nodes). */
  function resolve(target) {
    if (target && target.kind === 'selector') return document.querySelector(target.selector);
    var marked = document.querySelector('[data-example-root]');
    if (marked) return marked;
    for (var el = document.body.firstElementChild; el; el = el.nextElementSibling) {
      if (el.hasAttribute('data-ce-chrome')) continue; // template chrome, never the example
      return el;
    }
    return null;
  }

  function readMop(el, mop) {
    if (!el) return null;
    if (mop.kind === 'property') {
      var v = el[mop.name];
      return typeof v === 'object' ? String(v) : v; // FileList etc. → not state
    }
    if (mop.kind === 'attribute') return el.hasAttribute(mop.name) ? el.getAttribute(mop.name) : null;
    return el.classList.contains(mop.name); // class
  }

  function applyMop(el, mop, value) {
    if (!el) return;
    if (mop.kind === 'api') {
      // drive the component's OWN State API (AGENTS.md contract): composite
      // states (accordion batch, tabs activation, popover open-with-side-
      // effects) are only expressible through the runtime that owns them.
      if (!el.api || !el.api.setState) return;
      // name '*' ⇒ the editor VALUE is the state name (enum across distinct
      // runtime states, e.g. accordion all-open/all-closed); a falsy value
      // (or a fixed name toggled off) returns to the authored 'default'.
      if (mop.name === '*') {
        if (value === true || value === false || value === null || value === undefined || value === '') el.api.setState('default');
        else el.api.setState(String(value));
        return;
      }
      // args map: named config keys the runtime's own state contract expects
      // (slider {value}, calendar {date|minDate|maxDate}, carousel {index}…) —
      // '@value' substitutes the editor value, anything else passes through
      if (mop.args) {
        var cfg = {};
        for (var k in mop.args) cfg[k] = mop.args[k] === '@value' ? value : mop.args[k];
        el.api.setState(mop.name, cfg);
        return;
      }
      if (value === false || value === null || value === undefined) el.api.setState('default');
      else if (typeof value === 'object') el.api.setState(mop.name, value);
      else el.api.setState(mop.name, { value: value });
      return;
    }
    if (mop.kind === 'property') {
      el[mop.name] = value;
      return;
    }
    if (mop.kind === 'attribute') {
      // boolean true serializes as 'true', not '' — ARIA enumerations like
      // aria-invalid require the literal token ('' would not match [aria-invalid="true"])
      if (value === false || value === null || value === undefined) el.removeAttribute(mop.name);
      else el.setAttribute(mop.name, value === true ? 'true' : String(value));
      return;
    }
    el.classList.toggle(mop.name, !!value); // class
  }

  // -- source serialization (bidirectional editor sync) ----------------------
  // The example's own body children (never template chrome) serialized back to
  // HTML, with dynamic form properties reflected onto attributes so `value`/
  // `checked` set at runtime appear in the shown code. The host writes this
  // into the CodeExample editor: state changes in the panel are visible in the
  // source — one source of truth, kept honest in both directions.
  function serializeSource() {
    var out = [];
    for (var el = document.body.firstElementChild; el; el = el.nextElementSibling) {
      if (el.hasAttribute('data-ce-chrome')) continue;
      // the toast component auto-mounts its region into <body> at load —
      // runtime infrastructure, not example source; never serialize it
      if (el.id === 'toast-container') continue;
      var clone = el.cloneNode(true);
      // querySelectorAll never matches SELF — a root-level <input> (the common
      // example shape) would lose its runtime value without the matches() leg
      var live = el.matches('input, textarea') ? [el] : Array.prototype.slice.call(el.querySelectorAll('input, textarea'));
      var mirror = el.matches('input, textarea')
        ? [clone]
        : Array.prototype.slice.call(clone.querySelectorAll('input, textarea'));
      for (var i = 0; i < live.length; i++) {
        var l = live[i];
        var c = mirror[i];
        if (l.type === 'checkbox' || l.type === 'radio') c.toggleAttribute('checked', l.checked);
        else if (l.tagName === 'TEXTAREA') c.textContent = l.value;
        else if (l.tagName === 'SELECT') {
          c.querySelectorAll('option').forEach(function (o, oi) {
            o.toggleAttribute('selected', !!(l.options[oi] && l.options[oi].selected));
          });
        } else c.setAttribute('value', l.value);
      }
      out.push(clone.outerHTML);
    }
    return out.join('\n');
  }

  function readStates() {
    var values = {};
    for (var name in schema.states) {
      var spec = schema.states[name];
      var el = resolve(spec.target);
      var obs = spec.observation || spec.mutation;
      if (!el || !obs) continue;
      // an observation may address a different element than the mutation
      // (e.g. the wrapper owns the State API while the inner <input> carries
      // the value) — honor its own target when declared
      var oel = spec.observation && spec.observation.target ? resolve(spec.observation.target) : el;
      if (!oel) continue;
      var v = readMop(oel, obs);
      if (typeof v === 'string' && /^(true|false)$/.test(v)) v = v === 'true'; // attribute booleans normalize
      // boolean states read through an ATTRIBUTE observation are true when the
      // attribute exists and is not the literal "false" (data-error="" → true,
      // aria-pressed="false" → false); one keyed on a state-NAME attribute
      // (data-state-name — every State API writes it) are true exactly when the
      // written name equals the runtime state this row drives
      if (spec.type === 'boolean' && obs.kind === 'attribute' && typeof v === 'string') {
        var rn = spec.mutation && spec.mutation.kind === 'api' ? spec.mutation.name : name;
        v = v !== 'false' && (v === '' || v === 'true' || v === rn);
      }
      // §11: observable DOM value wins; when the observation is NOT available
      // (missing attribute) fall back to the schema default — never invent one
      if (v === null || v === undefined) v = 'default' in spec ? spec.default : null;
      values[name] = v === undefined ? null : v;
    }
    return values;
  }

  var syncQueued = false;
  // post the serialized source only after a HOST mutation (set-state/action/
  // overlay replay): a fresh sandbox parsed the very source the editor shows,
  // so re-serializing it before any change would only reformat bytes.
  var sourceDirty = false;
  // True content height, never the viewport: documentElement.scrollHeight is
  // max(content, viewport), so reporting it once the iframe is taller than the
  // content echoes the current frame height back +2px — an ratchet that grew
  // the preview on every state change. The template's `body{display:flow-root}`
  // makes body border-box + margins the exact content height; scrollHeight is
  // only trusted while it genuinely exceeds the viewport.
  function contentHeight() {
    var de = document.documentElement;
    var cs = getComputedStyle(document.body);
    var natural = Math.ceil(
      document.body.getBoundingClientRect().height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom),
    );
    return de.scrollHeight > de.clientHeight ? Math.max(natural, de.scrollHeight) : natural;
  }
  function sync() {
    if (syncQueued) return;
    syncQueued = true;
    // setTimeout, NOT requestAnimationFrame: rAF is suspended for iframes the
    // compositor doesn't render (off-screen on a long doc page), which silently
    // froze every state round-trip of previews scrolled out of view.
    setTimeout(function () {
      syncQueued = false;
      post('state', { values: readStates() });
      if (sourceDirty) {
        sourceDirty = false;
        post('source', { source: serializeSource() }); // editor shows the live DOM (bidirectional §4)
      }
      post('height', { height: contentHeight() });
    }, 0);
  }

  // -- errors -----------------------------------------------------------
  // Capture phase catches BOTH module compile/load errors (dispatched on the
  // <script> element, don't bubble) and runtime errors (dispatched on window).
  // Only the EXAMPLE's own scripts report: chrome (all.js/lucide/bridge,
  // marked data-ce-chrome) and stylesheets are environment noise, and an
  // offline CDN must not red-flag a perfectly good preview.
  addEventListener('error', function (e) {
    var t = e.target;
    if (t && t !== globalThis && t.tagName) {
      if (t.tagName !== 'SCRIPT' || (t.hasAttribute && t.hasAttribute('data-ce-chrome'))) return;
      post('error', { message: 'Example script failed to load or compile' });
      return;
    }
    var msg = e.message || 'Unknown error';
    post('error', { message: String(msg), stack: e.error && e.error.stack ? String(e.error.stack) : undefined });
  }, true);
  addEventListener('unhandledrejection', function (e) {
    post('error', { message: 'Unhandled rejection: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason)) });
  });

  // -- inbound ----------------------------------------------------------
  addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.type !== 'ce-host' || d.ch !== ch) return; // per-example channel (§9): never cross-talk
    if (d.kind === 'set-state') {
      var spec = schema.states[d.state];
      if (!spec || !spec.mutation) return;
      sourceDirty = true;
      var el = resolve(spec.target);
      if (spec.mutation.kind === 'property' && (d.state === 'open' || spec.mutation.name === 'open')) {
        // dialog-style boolean: drive the native modal API, not a raw property
        if (d.value && typeof el.showModal === 'function' && !el.open) el.showModal();
        else if (!d.value && el.open && typeof el.close === 'function') el.close();
        sync();
        return;
      }
      applyMop(el, spec.mutation, d.value);
      sync();
    } else if (d.kind === 'action') {
      var act = schema.actions[d.action];
      if (!act) return;
      var target = resolve(act.target);
      if (!target) return;
      sourceDirty = true;
      if (act.operation.kind === 'method' && typeof target[act.operation.name] === 'function')
        target[act.operation.name]();
      else if (act.operation.kind === 'event')
        target.dispatchEvent(new Event(act.operation.name, { bubbles: true, cancelable: true }));
      sync();
    } else if (d.kind === 'read-state') {
      post('state', { values: readStates() });
    }
  });

  // -- dark mode ----------------------------------------------------------
  // The host bakes `class="dark"` + color-scheme into the srcdoc itself, and
  // mirrors live toggles via postMessage so a theme flip never re-runs the
  // example (its console listeners etc. would be lost by a full rebuild).
  addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.type !== 'ce-host' || d.ch !== ch) return;
    if (d.kind === 'set-dark') {
      document.documentElement.classList.toggle('dark', !!d.value);
      document.documentElement.style.colorScheme = d.value ? 'dark' : 'light';
    }
  });

  // any direct preview interaction re-reads state (§11: DOM is authoritative),
  // and value/attr-changing interactions also mark the source dirty so the
  // next sync serializes them into the editor — code stays the single truth.
  // (click excluded: it only mirrors state; a click that changes something
  // fires change/close/toggle too — no spurious editor rewrites on focus clicks)
  // scroll: the scroll-area component's observable state IS the scroll position
  ['input', 'change', 'close', 'toggle', 'scroll'].forEach(function (ev) {
    document.addEventListener(ev, function () {
      sourceDirty = true;
      sync();
    }, true);
  });
  document.addEventListener('click', sync, true);
  new MutationObserver(sync).observe(document.body, { childList: true, attributes: true, subtree: true, characterData: true });

  addEventListener('DOMContentLoaded', function () {
    post('ready');
    sync();
  });
  addEventListener('load', sync);
})();
