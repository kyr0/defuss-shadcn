// dist/components/code-example/code-example.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.9.7") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals, defussQuery, componentState, bindComponent } = __df$shared;
var df$ = defussGlobals();
var dfDollar = defussQuery();
var codeExampleStates = ["default", "code", "state", "fullscreen"];
var SHIKI_URL = "https://esm.sh/shiki@3.0.0";
var RERUN_DEBOUNCE_MS = 400;
var MIN_FRAME_HEIGHT = 64;
var MAX_FRAME_HEIGHT = 900;
var REM_PX = 16;
var IO_ROOT_MARGIN = "600px 0px";
var IDLE_BOOT_MS = 1500;
var VP_DEVICES = { phone: [390, 844], tablet: [834, 1112] };
var VP_MODES = ["phone", "tablet", "desktop", "full"];
var SANDBOXES = {
  default: { sandbox: "allow-scripts allow-forms", allow: "clipboard-write" },
  embed: { sandbox: "allow-scripts allow-forms allow-same-origin allow-presentation allow-popups", allow: "clipboard-write; autoplay; encrypted-media; fullscreen; picture-in-picture" },
  links: { sandbox: "allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox", allow: "clipboard-write" }
};
var ICONS = {
  "rotate-cw": '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
  smartphone: '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
  tablet: '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><line x1="12" x2="12.01" y1="18" y2="18"/>',
  monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
  "app-window": '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 4v4"/><path d="M2 8h20"/><path d="M6 4v4"/>',
  "code-xml": '<path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>',
  "sliders-horizontal": '<path d="M10 5H3"/><path d="M12 19H3"/><path d="M14 3v4"/><path d="M16 17v4"/><path d="M21 12h-9"/><path d="M21 19h-5"/><path d="M21 5h-7"/><path d="M8 10v4"/><path d="M8 12H3"/>',
  "rotate-ccw": '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  minimize: '<path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>'
};
var icon = (name) => `<svg class="lucide lucide-${name}" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
var buttonContent = (name, label) => `${icon(name)}<span>${label}</span>`;
var esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var config = {
  styles: null,
  scripts: null,
  tail: "",
  theme: null,
  highlight: null,
  shiki: SHIKI_URL,
  themes: { light: "github-light", dark: "github-dark" }
};
var cache = new Map;
function fetchText(url) {
  if (!cache.has(url)) {
    const p = fetch(url).then((r) => {
      if (!r.ok)
        throw new Error(`${url} → HTTP ${r.status}`);
      return r.text();
    });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return cache.get(url);
}
var BUNDLE_SCRIPT = /\/(all|core|wysiwyg)(?:\.min)?\.js(?:[?#]|$)/;
function discoverScripts(source) {
  const out = [];
  dfDollar("script[src]").each((_i, s) => {
    const m = BUNDLE_SCRIPT.exec(s.src);
    if (!m || m[1] === "wysiwyg" && !/\b(?:code-example|editorjs)\b/.test(source))
      return;
    if (!out.includes(s.src))
      out.push(s.src);
  });
  return out.sort((a, b) => Number(/wysiwyg/.test(a)) - Number(/wysiwyg/.test(b)));
}
function discoverStyles() {
  const out = [];
  dfDollar('link[rel="stylesheet"]').each((_i, l) => {
    if (l.href && !out.includes(l.href))
      out.push(l.href);
  });
  return out;
}
var entries = (value, source, fallback) => Promise.resolve(typeof value === "function" ? value(source) : value ?? fallback());
var scriptTag = (js) => `<script data-ce-chrome>(function(){
${String(js).replace(/<\/script/gi, "<\\/script")}
})();</script>`;
function resolveStyles(source) {
  return entries(config.styles, source, discoverStyles).then((list) => (list || []).map((e) => typeof e === "string" ? `<link rel="stylesheet" href="${esc(e)}" data-ce-chrome>` : `<style data-ce-chrome>${String(e.css ?? "").replace(/<\/style/gi, "<\\/style")}</style>`).join(`
`));
}
function resolveScripts(source) {
  return entries(config.scripts, source, () => discoverScripts(source)).then((list) => Promise.all((list || []).map((e) => typeof e === "string" ? fetchText(e) : Promise.resolve(e.js ?? ""))).then((texts) => texts.map(scriptTag).join(`
`)));
}
function resolveTheme() {
  return Promise.resolve(typeof config.theme === "function" ? config.theme() : config.theme ?? "").then((css) => String(css ?? ""), () => "");
}
function sandboxBridge(ch, schema) {
  const $ = globalThis.df$;
  const states = schema && schema.states || {};
  const actions = schema && schema.actions || {};
  const one = (sel) => $ ? $(sel).get(0) || null : null;
  const all = (root, sel) => {
    const out = [];
    if ($)
      $(root).find(sel).each((_i, n) => {
        out.push(n);
      });
    return out;
  };
  document.addEventListener("submit", (e) => {
    const method = e.submitter && e.submitter.getAttribute("formmethod") || e.target.getAttribute("method");
    if ((method || "").toLowerCase() !== "dialog")
      e.preventDefault();
  });
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0)
      return;
    const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
    if (!a || a.hasAttribute("download"))
      return;
    const target = (a.getAttribute("target") || "").toLowerCase();
    if (target && target !== "_self")
      return;
    const href = a.getAttribute("href") || "";
    if (/^(mailto|tel|sms):/i.test(href))
      return;
    e.preventDefault();
    if (href.charAt(0) === "#" && href.length > 1)
      location.hash = href.slice(1);
  });
  const post = (kind, extra) => parent.postMessage(Object.assign({ type: "ce", ch, kind }, extra || {}), "*");
  function resolve(target) {
    if (target && target.kind === "selector")
      return one(target.selector);
    const marked = one("[data-example-root]");
    if (marked)
      return marked;
    for (let el = document.body.firstElementChild;el; el = el.nextElementSibling)
      if (!el.hasAttribute("data-ce-chrome"))
        return el;
    return null;
  }
  function readMop(el, mop) {
    if (!el)
      return null;
    if (mop.kind === "api") {
      if (!el.api || !el.api.getState)
        return null;
      const st = el.api.getState();
      if (mop.name === "@state")
        return st.name;
      return st.config && mop.name in st.config ? st.config[mop.name] : null;
    }
    if (mop.kind === "property") {
      const v = el[mop.name];
      return typeof v === "object" ? String(v) : v;
    }
    if (mop.kind === "attribute")
      return el.hasAttribute(mop.name) ? el.getAttribute(mop.name) : null;
    return el.classList.contains(mop.name);
  }
  function applyMop(el, mop, value) {
    if (!el)
      return;
    if (mop.kind === "api") {
      if (!el.api || !el.api.setState)
        return;
      const stateName = mop.name === "@current" && el.api.getState ? el.api.getState().name : mop.name;
      if (mop.name === "*") {
        if (value === true || value === false || value === null || value === undefined || value === "")
          el.api.setState("default");
        else
          el.api.setState(String(value));
        return;
      }
      if (mop.args) {
        const usesValue = Object.keys(mop.args).some((k) => mop.args[k] === "@value");
        if (value === false && !usesValue)
          return void el.api.setState("default");
        const cfg = {};
        for (const k in mop.args)
          cfg[k] = mop.args[k] === "@value" ? value : mop.args[k];
        el.api.setState(stateName, cfg);
        return;
      }
      if (value === false || value === null || value === undefined)
        el.api.setState("default");
      else if (typeof value === "object")
        el.api.setState(mop.name, value);
      else
        el.api.setState(mop.name, { value });
      return;
    }
    if (mop.kind === "property") {
      el[mop.name] = value;
      return;
    }
    if (mop.kind === "attribute") {
      if (value === false || value === null || value === undefined)
        el.removeAttribute(mop.name);
      else
        el.setAttribute(mop.name, value === true ? "true" : String(value));
      return;
    }
    el.classList.toggle(mop.name, !!value);
  }
  function serializeSource() {
    if (!$)
      return "";
    const chrome = "[data-ce-chrome], #toast-container";
    const live = all(document.body, "input, textarea").filter((n) => !n.closest(chrome));
    const clone = document.body.cloneNode(true);
    $(clone).find(chrome).remove();
    const mirror = all(clone, "input, textarea");
    live.forEach((l, i) => {
      const c = mirror[i];
      if (!c)
        return;
      if (l.type === "checkbox" || l.type === "radio")
        c.toggleAttribute("checked", l.checked);
      else if (l.tagName === "TEXTAREA")
        c.textContent = l.value;
      else
        c.setAttribute("value", l.value);
    });
    return ($(clone).html() || "").trim();
  }
  function readStates() {
    const values = {};
    for (const name in states) {
      const spec = states[name];
      const el = resolve(spec.target);
      const obs = spec.observation || spec.mutation;
      if (!el || !obs)
        continue;
      const oel = spec.observation && spec.observation.target ? resolve(spec.observation.target) : el;
      if (!oel)
        continue;
      let v = !spec.observation && obs.kind === "api" ? oel.classList.contains(obs.name) : readMop(oel, obs);
      if (typeof v === "string" && /^(true|false)$/.test(v))
        v = v === "true";
      if (spec.type === "boolean" && spec.observation && obs.kind === "api" && obs.name === "@state" && typeof v === "string") {
        v = v === (spec.mutation && spec.mutation.kind === "api" ? spec.mutation.name : name);
      }
      if (spec.type === "boolean" && obs.kind === "attribute" && typeof v === "string") {
        const rn = spec.mutation && spec.mutation.kind === "api" ? spec.mutation.name : name;
        v = v !== "false" && (v === "" || v === "true" || v === rn);
      }
      if (v === null || v === undefined)
        v = "default" in spec ? spec.default : null;
      values[name] = v === undefined ? null : v;
    }
    return values;
  }
  function contentHeight() {
    const de = document.documentElement;
    const cs = getComputedStyle(document.body);
    const natural = Math.ceil(document.body.getBoundingClientRect().height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom));
    return de.scrollHeight > de.clientHeight ? Math.max(natural, de.scrollHeight) : natural;
  }
  let syncQueued = false;
  let sourceDirty = false;
  function sync() {
    if (syncQueued)
      return;
    syncQueued = true;
    setTimeout(() => {
      syncQueued = false;
      post("state", { values: readStates() });
      if (sourceDirty) {
        sourceDirty = false;
        post("source", { source: serializeSource() });
      }
      post("height", { height: contentHeight() });
    }, 0);
  }
  addEventListener("error", (e) => {
    const t = e.target;
    if (t && t !== globalThis && t.tagName) {
      if (t.tagName !== "SCRIPT" || t.hasAttribute("data-ce-chrome"))
        return;
      post("error", { message: "Example script failed to load or compile" });
      return;
    }
    post("error", { message: String(e.message || "Unknown error"), stack: e.error && e.error.stack ? String(e.error.stack) : undefined });
  }, true);
  addEventListener("unhandledrejection", (e) => {
    post("error", { message: `Unhandled rejection: ${e.reason && e.reason.message ? e.reason.message : String(e.reason)}` });
  });
  addEventListener("message", (e) => {
    const d = e.data;
    if (!d || d.type !== "ce-host" || d.ch !== ch)
      return;
    if (d.kind === "set-state") {
      const spec = states[d.state];
      if (!spec || !spec.mutation)
        return;
      sourceDirty = true;
      const el = resolve(spec.target);
      if (el && spec.mutation.kind === "property" && (d.state === "open" || spec.mutation.name === "open")) {
        if (d.value && typeof el.showModal === "function" && !el.open)
          el.showModal();
        else if (!d.value && el.open && typeof el.close === "function")
          el.close();
      } else
        applyMop(el, spec.mutation, d.value);
      sync();
    } else if (d.kind === "action") {
      const act = actions[d.action];
      const target = act && resolve(act.target);
      if (!target)
        return;
      sourceDirty = true;
      if (act.operation.kind === "method" && typeof target[act.operation.name] === "function")
        target[act.operation.name]();
      else if (act.operation.kind === "event")
        target.dispatchEvent(new Event(act.operation.name, { bubbles: true, cancelable: true }));
      sync();
    } else if (d.kind === "read-state")
      post("state", { values: readStates() });
    else if (d.kind === "set-dark") {
      document.documentElement.classList.toggle("dark", !!d.value);
      document.documentElement.style.colorScheme = d.value ? "dark" : "light";
    } else if (d.kind === "set-theme") {
      const tag = one("#ce-theme");
      if (tag)
        $(tag).text(d.css || "");
    } else if (d.kind === "measure")
      sync();
    else if (d.kind === "pointer-release") {
      let pr;
      try {
        pr = new PointerEvent("pointercancel", { bubbles: true, cancelable: true });
      } catch {
        pr = new Event("pointercancel", { bubbles: true });
      }
      document.dispatchEvent(pr);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || e.defaultPrevented)
      return;
    if ($ && $("dialog[open], :popover-open").get(0))
      return;
    post("escape");
  });
  ["input", "change", "close", "toggle", "scroll"].forEach((ev) => document.addEventListener(ev, () => {
    sourceDirty = true;
    sync();
  }, true));
  document.addEventListener("click", sync, true);
  new MutationObserver(sync).observe(document.body, { childList: true, attributes: true, subtree: true, characterData: true });
  let lastHeight = -1;
  let heightQueued = false;
  function syncHeight() {
    if (heightQueued)
      return;
    heightQueued = true;
    setTimeout(() => {
      heightQueued = false;
      const h = contentHeight();
      if (h === lastHeight)
        return;
      lastHeight = h;
      post("height", { height: h });
    }, 0);
  }
  if (typeof ResizeObserver === "function")
    new ResizeObserver(syncHeight).observe(document.body);
  document.addEventListener("transitionend", syncHeight, true);
  const ready = () => {
    post("ready");
    sync();
  };
  if (document.readyState === "loading")
    addEventListener("DOMContentLoaded", ready);
  else
    ready();
  addEventListener("load", sync);
}
var SCRIPT_OPEN = "<script data-ce-chrome>";
var SCRIPT_CLOSE = "</script>";
function buildSrcdoc(root, source) {
  const c = root._ce;
  return Promise.all([resolveStyles(source), resolveScripts(source), resolveTheme()]).then(([styles, scripts, theme]) => {
    const dark = document.documentElement.classList.contains("dark");
    const stage = (dfDollar(root).attr("data-preview-style") || "").replace(/\s*[{}<>]\s*/g, "");
    const tail = typeof config.tail === "function" ? config.tail(source) : config.tail || "";
    const schema = c.schema ? JSON.stringify(c.schema).replace(/</g, "\\u003c") : "null";
    const nested = /\bcode-example\b/.test(source) ? nestedConfig(source) : Promise.resolve("");
    return nested.then((nestedScript) => `<!DOCTYPE html>
<html lang="en"${dark ? ' class="dark" style="color-scheme:dark"' : ""}>
<head>
<meta charset="UTF-8">
${styles}
` + `<style id="ce-theme" data-ce-chrome>${theme.replace(/<\/style/gi, "<\\/style")}</style>
` + `<style data-ce-chrome>body{display:flow-root;margin:2.5rem 1.5rem;background:var(--background);color:var(--foreground);${stage}}</style>
</head>
<body>
` + `${source}
${scripts}
${nestedScript}${tail}
` + `<script id="ce-bridge" data-ce-chrome>(${sandboxBridge.toString().replace(/<\/script/gi, "<\\/script")})(${JSON.stringify(c.ch)}, ${schema});${SCRIPT_CLOSE}
</body>
</html>`);
  });
}
function nestedConfig(source) {
  return Promise.all([
    entries(config.styles, source, discoverStyles),
    entries(config.scripts, source, () => discoverScripts(source))
  ]).then(([styles, scripts]) => Promise.all((scripts || []).map((e) => typeof e === "string" ? fetchText(e) : Promise.resolve(e.js ?? ""))).then((texts) => {
    const cfg = { styles: styles || [], scripts: texts.map((js) => ({ js })) };
    const json = JSON.stringify(cfg).replace(/</g, "\\u003c");
    return `${SCRIPT_OPEN}globalThis.df$&&df$.shadcn.codeExample&&df$.shadcn.codeExample.configure(${json});${SCRIPT_CLOSE}
`;
  }));
}
var registry = new Map;
function send(root, kind, extra) {
  const frame = root._ce?.frame;
  if (frame?.contentWindow)
    frame.contentWindow.postMessage(Object.assign({ type: "ce-host", ch: root._ce.ch, kind }, extra || {}), "*");
}
var pageReady = new Promise((resolve) => {
  const go = () => setTimeout(resolve, 0);
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", go, { once: true });
  else
    go();
});
function run(root, source) {
  const c = root._ce;
  c.lastRun = source;
  c.booted = true;
  showError(root, null);
  pageReady.then(() => buildSrcdoc(root, source)).then((doc) => {
    if (c.lastRun === source)
      dfDollar(c.frame).attr("srcdoc", doc);
  }, (e) => showError(root, `Preview could not be built: ${e?.message ?? String(e)}`));
}
function showError(root, message, stack) {
  const box = root._ce?.error;
  if (!box)
    return;
  dfDollar(box).prop("hidden", !message);
  dfDollar(box).text(message ? message + (stack ? `
${stack}` : "") : "");
  if (message) {
    root.dispatchEvent(new CustomEvent("code-example-error", { bubbles: true, detail: { message, stack } }));
  }
}
function shellMarkup(root) {
  const sb = SANDBOXES[dfDollar(root).attr("data-sandbox") ?? "default"] ?? SANDBOXES.default;
  const vp = (mode, glyph, label, title) => `<button type="button" class="code-example-vp" data-vp="${mode}" aria-pressed="${mode === "full"}" title="${title}">${buttonContent(glyph, label)}</button>`;
  const title = esc(dfDollar(root).attr("aria-label") || "Preview");
  return `<div class="code-example-stage">` + `<div class="code-example-screen" data-mode="full">` + `<div class="resizer code-example-resizer" data-handles="all" data-resize-mode="controlled" data-axis="both" data-min="240" data-max="1600" data-min-h="240" data-max-h="1400">` + `<div class="code-example-device"><iframe class="code-example-frame" sandbox="${sb.sandbox}" allow="${sb.allow}" title="${title}"></iframe>` + `<span class="code-example-device-island" aria-hidden="true"></span><span class="code-example-device-home" aria-hidden="true"></span></div></div></div>` + `<output class="code-example-error" role="alert" hidden></output>` + `<button type="button" class="code-example-full-exit" title="Exit fullscreen (Esc)" aria-label="Exit fullscreen">${icon("x")}</button>` + `</div>` + `<div class="code-example-toolbar">` + `<span class="code-example-viewport" role="group" aria-label="Preview device">` + `<button type="button" class="code-example-vp" data-vp="rotate" title="Swap orientation (phone/tablet)" aria-disabled="true">${buttonContent("rotate-cw", "Rotate")}</button>` + vp("phone", "smartphone", "Phone", "Phone 390×844") + vp("tablet", "tablet", "Tablet", "Tablet 834×1112") + vp("desktop", "monitor", "Desktop", "Desktop 1024") + vp("full", "app-window", "Full", "Full width") + `</span><span class="code-example-sep" aria-hidden="true"></span>` + `<span class="code-example-size"><input class="code-example-vp-w" type="number" min="240" step="10" inputmode="numeric" placeholder="Width" aria-label="Custom preview width (px)"><span class="code-example-vp-x" aria-hidden="true">×</span>` + `<input class="code-example-vp-h" type="number" min="240" step="10" inputmode="numeric" placeholder="Full" aria-label="Custom preview height (px)" disabled></span>` + `<span class="code-example-sep" aria-hidden="true"></span>` + `<span class="code-example-size"><input class="code-example-vp-z" type="number" min="25" max="100" step="5" inputmode="numeric" placeholder="Auto" aria-label="Preview zoom (%)"><span class="code-example-vp-x" aria-hidden="true">%</span></span>` + `<span class="code-example-spacer"></span>` + `<button type="button" class="code-example-tab" data-tab="code" aria-pressed="false" title="Show or hide the source">${buttonContent("code-xml", "Code")}</button>` + (dfDollar(root).attr("data-schema") ? `<button type="button" class="code-example-tab" data-tab="state" aria-pressed="false" title="Show or hide the state controls">${buttonContent("sliders-horizontal", "State")}</button>` : "") + `<button type="button" class="code-example-reset" title="Restore the original source and rerun">${buttonContent("rotate-ccw", "Reset")}</button>` + `<button type="button" class="code-example-full" title="Preview fullscreen (Esc to exit)">${buttonContent("maximize", "Fullscreen")}</button>` + `</div>` + `<div class="code-example-panel" data-panel="code" hidden>` + `<button type="button" class="code-example-copy" title="Copy the source">${buttonContent("copy", "Copy")}</button>` + `<div class="code-example-editor"><div class="code-example-paint" aria-hidden="true"></div></div></div>` + (dfDollar(root).attr("data-schema") ? `<div class="code-example-panel" data-panel="state" hidden></div>` : "");
}
function ensureShell(root) {
  const $root = dfDollar(root);
  if ($root.children(".code-example-toolbar").length)
    return;
  const source = $root.children("textarea").get(0);
  $root.append(dfDollar(shellMarkup(root)));
  if (!source)
    return;
  dfDollar(source).attr("class", ["code-example-src", source.getAttribute("class")].filter(Boolean).join(" "));
  if (!source.hasAttribute("spellcheck"))
    dfDollar(source).attr("spellcheck", "false");
  if (!source.hasAttribute("aria-label"))
    dfDollar(source).attr("aria-label", "Source");
  if (!source.hasAttribute("rows"))
    dfDollar(source).attr("rows", "10");
  $root.find(".code-example-editor").append(source);
}
var part = (root, sel) => dfDollar(root).find(sel).get(0) || null;
var shikiModule = null;
function loadShiki(shikiUrl) {
  if (!shikiModule) {
    shikiModule = Promise.resolve().then(() => import(/* @vite-ignore */ shikiUrl));
    shikiModule.catch(() => {
      shikiModule = null;
    });
  }
  return shikiModule;
}
function highlight(code, language) {
  if (typeof config.highlight === "function")
    return Promise.resolve().then(() => config.highlight(code, language));
  return loadShiki(config.shiki).then((m) => m.codeToHtml(code, { lang: language, themes: config.themes, defaultColor: false, cssVariablePrefix: "--code-example-" })).then((html) => {
    const inner = /<code[^>]*>([\s\S]*)<\/code>/.exec(String(html ?? ""));
    return inner ? inner[1] : null;
  });
}
var rendered = (el) => typeof el.checkVisibility === "function" ? el.checkVisibility() : el.getClientRects().length > 0;
function paint(root) {
  const c = root._ce;
  if (!c?.paint)
    return;
  if (!rendered(c.editor)) {
    c.stale = true;
    return;
  }
  c.stale = false;
  const value = c.src.value;
  if (c.painted === value)
    return;
  const apply = (html) => {
    dfDollar(c.paint).html(`${html}
`);
    dfDollar(c.editor).attr("data-painted", "");
    syncScroll(root);
  };
  clearTimeout(c.plainTimer);
  c.plainTimer = setTimeout(() => {
    if (c.src.value === value && c.painted !== value)
      apply(esc(value));
  }, 100);
  highlight(value, dfDollar(root).attr("data-language") || "html").then((html) => {
    if (c.src.value !== value)
      return;
    clearTimeout(c.plainTimer);
    c.painted = value;
    apply(typeof html === "string" ? html : esc(value));
  }, () => {
    if (c.src.value !== value)
      return;
    clearTimeout(c.plainTimer);
    c.painted = value;
    apply(esc(value));
  });
}
function syncScroll(root) {
  const c = root._ce;
  c.paint.scrollTop = c.src.scrollTop;
  c.paint.scrollLeft = c.src.scrollLeft;
}
function writeSource(root, value) {
  const c = root._ce;
  if (c.src.value !== value)
    c.src.value = value;
  dfDollar(root).attr("data-edited", value !== c.original ? "" : null);
  paint(root);
}
function insertText(input, text) {
  input.focus();
  let done = false;
  try {
    done = document.execCommand("insertText", false, text);
  } catch {
    done = false;
  }
  if (!done) {
    input.setRangeText(text, input.selectionStart, input.selectionEnd, "end");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
}
function onKeydown(root, e) {
  const c = root._ce;
  const input = c.src;
  if (input.readOnly || e.isComposing)
    return;
  if (e.key === "Escape") {
    c.escaped = true;
    return;
  }
  if (e.key === "Tab" && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if (c.escaped) {
      c.escaped = false;
      return;
    }
    e.preventDefault();
    const value = input.value;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const lineStart = value.lastIndexOf(`
`, start - 1) + 1;
    if (start === end && !e.shiftKey)
      return void insertText(input, "  ");
    const next = value.slice(lineStart, end).split(`
`).map((l) => e.shiftKey ? l.replace(/^( {1,2}|\t)/, "") : `  ${l}`).join(`
`);
    input.setSelectionRange(lineStart, end);
    insertText(input, next);
    input.setSelectionRange(lineStart, lineStart + next.length);
    return;
  }
  c.escaped = false;
  if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const value = input.value;
    const lineStart = value.lastIndexOf(`
`, input.selectionStart - 1) + 1;
    const indent = /^[\t ]*/.exec(value.slice(lineStart, input.selectionStart))?.[0] ?? "";
    if (!indent)
      return;
    e.preventDefault();
    insertText(input, `
${indent}`);
  }
}
function editorFor(spec) {
  const byType = spec.type === "boolean" ? "checkbox" : spec.type === "number" ? "number" : spec.type === "enum" ? "radio" : "text";
  const hint = spec.editor && spec.editor.component;
  return { kind: ["text", "number", "checkbox", "radio", "select"].includes(hint) ? hint : byType, props: spec.editor && spec.editor.props || {} };
}
function buildControls(root) {
  const c = root._ce;
  const panel = part(root, '.code-example-panel[data-panel="state"]');
  if (!panel)
    return;
  const schema = c.schema;
  dfDollar(panel).text("");
  if (!schema || !Object.keys(schema.states || {}).length) {
    const p = document.createElement("p");
    p.className = "code-example-note";
    p.textContent = schema ? "This component schema declares no states." : "No schema - no state controls.";
    dfDollar(panel).append(p);
    return;
  }
  const grid = document.createElement("div");
  grid.className = "code-example-states";
  for (const name of Object.keys(schema.states)) {
    const spec = schema.states[name];
    const ed = editorFor(spec);
    const row = document.createElement("div");
    row.className = "code-example-row";
    row.dataset.stateName = name;
    const label = document.createElement("label");
    label.textContent = name;
    dfDollar(row).append(label);
    let control;
    if (ed.kind === "checkbox") {
      control = document.createElement("input");
      control.type = "checkbox";
    } else if (ed.kind === "number") {
      control = document.createElement("input");
      control.type = "number";
      for (const k of ["min", "max", "step"])
        if (ed.props[k] !== undefined)
          control[k] = String(ed.props[k]);
    } else if (ed.kind === "radio") {
      control = document.createElement("div");
      control.className = "code-example-radio-group";
      for (const v of spec.values || []) {
        const wrap = document.createElement("label");
        const r = document.createElement("input");
        r.type = "radio";
        r.value = v;
        r.name = `${c.ch}-${name}`;
        dfDollar(r).on("change", () => {
          if (r.checked)
            send(root, "set-state", { state: name, value: v });
        });
        dfDollar(wrap).append(r);
        dfDollar(wrap).append(document.createTextNode(` ${v}`));
        dfDollar(control).append(wrap);
      }
    } else if (ed.kind === "select") {
      control = document.createElement("select");
      if (!("default" in spec))
        dfDollar(control).append(new Option("—", ""));
      for (const v of spec.values || [])
        dfDollar(control).append(new Option(v, v));
    } else {
      control = document.createElement("input");
      control.type = "text";
    }
    control.classList.add("code-example-control");
    const sendControl = () => send(root, "set-state", {
      state: name,
      value: ed.kind === "checkbox" ? control.checked : ed.kind === "number" ? control.value === "" ? null : Number(control.value) : control.value
    });
    if (ed.kind !== "radio")
      dfDollar(control).on("change", sendControl);
    if (ed.kind === "text" || ed.kind === "number") {
      let keyTimer = 0;
      dfDollar(control).on("keyup", () => {
        clearTimeout(keyTimer);
        keyTimer = setTimeout(sendControl, 250);
      });
    }
    for (const k of ["format", "currency", "locale"])
      if (ed.props[k])
        control.setAttribute(`data-${k}`, String(ed.props[k]));
    dfDollar(row).append(control);
    dfDollar(grid).append(row);
    c.rows[name] = control;
    if ("default" in spec)
      applyControl(root, name, spec.default);
  }
  dfDollar(panel).append(grid);
  const acts = Object.keys(schema.actions || {});
  if (acts.length) {
    const bar = document.createElement("div");
    bar.className = "code-example-actions";
    for (const name of acts) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.action = name;
      b.textContent = `${name}()`;
      dfDollar(b).on("click", () => send(root, "action", { action: name }));
      dfDollar(bar).append(b);
    }
    dfDollar(panel).append(bar);
  }
}
function applyControl(root, name, value) {
  const control = root._ce.rows[name];
  if (!control || document.activeElement && control.contains(document.activeElement))
    return;
  if (control.type === "checkbox")
    control.checked = !!value;
  else if (control.classList.contains("code-example-radio-group"))
    dfDollar(control).find("input").each((_i, r) => {
      r.checked = r.value === String(value);
    });
  else
    control.value = value === null || value === undefined ? "" : String(value);
}
function previewHandle(root) {
  const c = root._ce;
  return {
    setState: (name, value) => {
      const spec = c.schema?.states?.[name];
      if (!spec && name !== "default")
        throw new Error(`code-example: unknown preview state "${name}" (schema states: ${Object.keys(c.schema?.states ?? {}).join(", ")})`);
      if (!spec) {
        for (const k of Object.keys(c.schema?.states ?? {}))
          if ("default" in c.schema.states[k])
            send(root, "set-state", { state: k, value: c.schema.states[k].default });
        return;
      }
      const v = value && typeof value === "object" && "value" in value ? value.value : ["boolean", "number", "string"].includes(typeof value) ? value : spec.type === "boolean" ? true : ("default" in spec) ? spec.default : null;
      send(root, "set-state", { state: name, value: v });
    },
    getState: () => ({ ...c.observed })
  };
}
function onMessage(root, d) {
  const c = root._ce;
  if (d.kind === "ready") {
    send(root, "read-state");
    c.ready = true;
    if (!root.preview)
      root.preview = previewHandle(root);
    root.dispatchEvent(new CustomEvent("code-example-ready", { bubbles: true, detail: { source: c.lastRun } }));
  } else if (d.kind === "state") {
    c.observed = d.values || {};
    dfDollar(root).attr("data-state-values", JSON.stringify(c.observed));
    for (const name of Object.keys(c.observed))
      applyControl(root, name, c.observed[name]);
  } else if (d.kind === "source") {
    if (d.source && !c.rerunTimer && document.activeElement !== c.src && c.src.value === c.lastRun) {
      writeSource(root, d.source);
      c.lastRun = d.source;
    }
  } else if (d.kind === "error")
    showError(root, d.message || "Preview error", d.stack);
  else if (d.kind === "escape")
    leaveOverlays();
  else if (d.kind === "height") {
    if (c.vpMode !== "phone" && c.vpMode !== "tablet")
      c.frame.style.height = `${Math.min(MAX_FRAME_HEIGHT, Math.max(c.minHeight, (d.height || 0) + 2))}px`;
  }
}
var clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
function debounce(fn, wait) {
  const shared = df$.shared?.debounce;
  if (typeof shared === "function")
    return shared(fn, wait);
  let t = 0;
  return () => {
    clearTimeout(t);
    t = setTimeout(fn, wait);
  };
}
function vpZoomAll(roots) {
  const plan = [];
  for (const root of roots) {
    const c = root._ce;
    if (!c.vpZ)
      continue;
    const canvas = c.resizer || c.device;
    const manual = clamp(Math.round(Number(c.vpZ.value) || 0), 0, 100);
    if (manual >= 25)
      plan.push({ root, canvas, z: Math.min(manual, 100) });
    else if (!c.fitFrozen)
      plan.push({ root, canvas, z: 0 });
  }
  for (const p of plan)
    if (!p.z)
      p.canvas.style.zoom = "";
  for (const p of plan) {
    if (p.z)
      continue;
    const c = p.root._ce;
    const box = p.canvas.getBoundingClientRect();
    let fit = Math.max(c.stage.clientWidth - 24, 120) / (box.width || 1);
    if (dfDollar(p.root).attr("data-fullscreen") != null && (c.vpMode === "phone" || c.vpMode === "tablet") && box.height) {
      fit = Math.min(fit, Math.max(c.stage.clientHeight - 24, 120) / box.height);
    }
    p.z = clamp(Math.floor(Math.min(fit, 1) * 20) * 5, 25, 100);
  }
  for (const p of plan) {
    p.canvas.style.zoom = p.z < 100 ? String(p.z / 100) : "";
    dfDollar(p.root).attr("data-vp-zoom", String(p.z));
  }
}
function vpZoomApply(root) {
  vpZoomAll([root]);
}
function vpApplyAll(roots) {
  for (const root of roots) {
    const c = root._ce;
    const dev = c.vpMode === "phone" || c.vpMode === "tablet";
    const rawW = Number(c.vpW.value);
    const w = rawW > 0 ? clamp(rawW, 240, 1600) : 0;
    const rawH = Number(c.vpH.value);
    const h = rawH > 0 ? clamp(rawH, 240, 1400) : 0;
    if (c.resizer)
      c.resizer.style.cssText = "";
    c.device.style.cssText = "";
    c.frame.style.width = "100%";
    if (dev) {
      if (c.resizer && w)
        c.resizer.style.width = `${w}px`;
      if (c.resizer && h)
        c.resizer.style.height = `${h}px`;
      c.frame.style.height = "100%";
    } else {
      if (c.resizer && w)
        c.resizer.style.width = `${w}px`;
      if (c.frame.style.height === "100%")
        c.frame.style.height = "";
      send(root, "measure");
    }
  }
  vpZoomAll(roots);
  for (const root of roots) {
    const c = root._ce;
    c.stage.style.overflow = c.vpMode === "phone" || c.vpMode === "tablet" ? "visible" : "auto";
  }
  const wide = roots.map((root) => {
    const c = root._ce;
    const canvas = c.resizer || c.device;
    return canvas.getBoundingClientRect().width * ((Number(dfDollar(root).attr("data-vp-zoom")) || 100) / 100) > c.stage.clientWidth - 24;
  });
  roots.forEach((root, i) => {
    const c = root._ce;
    const dev = c.vpMode === "phone" || c.vpMode === "tablet";
    c.stage.style.justifyContent = !dev && wide[i] ? "flex-start" : "";
    dfDollar(root).attr("data-vp-mode", c.vpMode);
    dfDollar(c.screen).attr("data-mode", c.vpMode);
    if (c.resizer) {
      const axis = dev ? "both" : "w";
      if (dfDollar(c.resizer).attr("data-axis") !== axis)
        dfDollar(c.resizer).attr("data-axis", axis);
    }
  });
}
function vpApply(root) {
  vpApplyAll([root]);
}
var fitQueue = new Set;
function scheduleFit(root) {
  if (!fitQueue.size)
    queueMicrotask(() => {
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
    dfDollar(c.vpRotate).prop("disabled", !dev);
    dfDollar(c.vpRotate).attr("aria-disabled", String(!dev));
  }
  dfDollar(c.screen).attr("data-landscape", null);
  dfDollar(c.vpH).prop("disabled", !dev);
  if (dev) {
    c.vpW.value = String(VP_DEVICES[mode][0]);
    c.vpH.placeholder = "Height";
    c.vpH.value = String(VP_DEVICES[mode][1]);
  } else {
    c.vpW.value = mode === "desktop" ? "1024" : "";
    c.vpH.value = "";
    c.vpH.placeholder = "Full";
  }
  dfDollar(root).find(".code-example-vp[data-vp]").each((_i, b) => {
    if (b.dataset.vp !== "rotate")
      dfDollar(b).attr("aria-pressed", String(b.dataset.vp === mode));
  });
  vpApply(root);
}
function initViewport(root) {
  const c = root._ce;
  c.vpW = part(root, ".code-example-vp-w");
  c.vpH = part(root, ".code-example-vp-h");
  c.vpZ = part(root, ".code-example-vp-z");
  c.vpRotate = part(root, '.code-example-vp[data-vp="rotate"]');
  if (!c.screen || !c.device || !c.vpW || !c.vpH)
    return;
  c.vpMode = "full";
  dfDollar(root).find(".code-example-vp[data-vp]").each((_i, b) => {
    if (b.dataset.vp !== "rotate")
      dfDollar(b).on("click", () => vpSetMode(root, b.dataset.vp));
  });
  const boot = dfDollar(root).attr("data-vp-mode");
  if (boot && boot !== "full" && VP_MODES.includes(boot))
    vpSetMode(root, boot);
  if (c.vpZ) {
    let seeded = false;
    dfDollar(c.vpZ).on("input", () => {
      seeded = false;
      vpZoomApply(root);
    });
    const seed = (e) => {
      if (c.vpZ.value)
        return;
      if (e.type === "keydown" && !/^(ArrowUp|ArrowDown|PageUp|PageDown)$/.test(e.key))
        return;
      c.vpZ.value = "100";
      seeded = true;
    };
    dfDollar(c.vpZ).on("pointerdown", seed);
    dfDollar(c.vpZ).on("keydown", seed);
    dfDollar(c.vpZ).on("wheel", seed);
    dfDollar(c.vpZ).on("click", () => {
      if (seeded)
        c.vpZ.select();
    });
    dfDollar(c.vpZ).on("blur", () => {
      if (seeded)
        c.vpZ.value = "";
      seeded = false;
    });
  }
  if (c.vpRotate) {
    dfDollar(c.vpRotate).on("click", () => {
      if (c.vpRotate.disabled)
        return;
      const w = c.vpW.value;
      c.vpW.value = c.vpH.value;
      c.vpH.value = w;
      dfDollar(c.screen).attr("data-landscape", dfDollar(c.screen).attr("data-landscape") == null ? "1" : null);
      vpApply(root);
    });
  }
  for (const inp of [c.vpW, c.vpH]) {
    dfDollar(inp).on("change", () => {
      if (inp === c.vpH && c.vpH.disabled)
        return;
      c.fitFrozen = true;
      vpApply(root);
    });
  }
  if (c.resizer) {
    scheduleFit(root);
    const settle = debounce(() => vpApply(root), 120);
    dfDollar(c.resizer).on("resizer-resize", (ev) => {
      const d = ev.detail;
      if (!d)
        return;
      const dev = c.vpMode === "phone" || c.vpMode === "tablet";
      if (d.axis === "h" && !dev)
        return;
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
var panelOf = (name, cfg) => name === "code" || name === "state" ? name : name === "fullscreen" ? cfg?.panel ?? null : null;
function applyMarkup(el, name, cfg) {
  ensureShell(el);
  const $el = dfDollar(el);
  const hasState = $el.find('.code-example-panel[data-panel="state"]').length > 0;
  let open = panelOf(name, cfg);
  if (open === "state" && !hasState)
    open = null;
  $el.find(".code-example-tab").each((_i, t) => {
    dfDollar(t).attr("aria-pressed", String(t.dataset.tab === open));
  });
  $el.find(".code-example-panel").each((_i, p) => {
    dfDollar(p).attr("hidden", p.dataset.panel === open ? null : "");
  });
  const full = name === "fullscreen";
  $el.attr("data-fullscreen", full ? "" : null);
  $el.find(".code-example-full").html(full ? buttonContent("minimize", "Exit fullscreen") : buttonContent("maximize", "Fullscreen"));
  const src = $el.find("textarea.code-example-src").get(0);
  const original = src ? src.defaultValue : "";
  $el.attr("data-edited", typeof cfg?.source === "string" && cfg.source !== original ? "" : null);
}
function readState(el) {
  const $el = dfDollar(el);
  const open = $el.find('.code-example-tab[aria-pressed="true"]').get(0)?.dataset.tab ?? null;
  const source = el._ce?.src.value ?? "";
  if ($el.attr("data-fullscreen") != null)
    return { name: "fullscreen", config: { source, panel: open } };
  return { name: open === "code" || open === "state" ? open : "default", config: { source } };
}
function triggerStateChange(root, state, incoming) {
  const c = root._ce;
  if (typeof incoming?.source === "string" && incoming.source !== c.src.value) {
    writeSource(root, incoming.source);
    run(root, incoming.source);
    emitChange(root, "api");
  }
  const cfg = { ...state.config, source: c.src.value };
  if (state.name === "state" && !part(root, '.code-example-panel[data-panel="state"]')) {
    applyMarkup(root, "default", cfg);
    dfDollar(root).attr("data-state-name", "default");
  } else
    applyMarkup(root, state.name, cfg);
  if (state.name !== "fullscreen" && document.fullscreenElement === root)
    document.exitFullscreen?.().catch(() => {});
  if (panelOf(state.name, state.config) === "code")
    paint(root);
  if (panelOf(state.name, state.config) === "state")
    send(root, "read-state");
  setTimeout(() => refit(root), 50);
}
function emitChange(root, origin) {
  root.dispatchEvent(new CustomEvent("code-example-change", { bubbles: true, detail: { source: root._ce.src.value, origin } }));
}
var codeExampleApi = componentState({
  component: "code-example",
  states: codeExampleStates,
  apply: (root, state, _previous, incoming) => triggerStateChange(root, state, incoming),
  read: (root) => readState(root),
  events: ["input", "click"],
  markup: (el, state) => applyMarkup(el, state.name, state.config)
});
df$.codeExampleApi = codeExampleApi;
df$.codeExampleStates = codeExampleStates;
var resolveCard = (target) => (typeof target === "string" ? dfDollar(target).get(0) : target) ?? null;
function refit(root) {
  if (root._ce?.vpW)
    vpApply(root);
}
function enterFullscreen(root) {
  const panel = readState(root).config.panel;
  root.api.setState("fullscreen", { panel });
  const req = root.requestFullscreen ? root.requestFullscreen() : null;
  req?.catch?.(() => {});
}
function exitFullscreen(root) {
  const open = readState(root).config.panel;
  root.api.setState(open === "code" || open === "state" ? open : "default");
}
function leaveOverlays() {
  for (const root of registry.values())
    if (dfDollar(root).attr("data-fullscreen") != null && document.fullscreenElement !== root)
      exitFullscreen(root);
}
df$.codeExample = {
  configure(options = {}) {
    for (const k of Object.keys(options))
      if (k in config)
        config[k] = options[k];
    dfDollar(".code-example[data-init]").each((_i, root) => {
      if (root._ce) {
        root._ce.painted = null;
        paint(root);
      }
    });
  },
  source: (target) => resolveCard(target)?._ce?.src.value ?? "",
  setSource(target, source) {
    const root = resolveCard(target);
    if (root?.api)
      root.api.setState(readState(root).name, { ...readState(root).config, source: String(source ?? "") });
  },
  reset(target) {
    const root = resolveCard(target);
    if (root?._ce)
      df$.codeExample.setSource(root, root._ce.original);
  },
  run(target) {
    const root = resolveCard(target);
    if (root?._ce)
      run(root, root._ce.src.value);
  },
  viewport(target, mode) {
    const root = resolveCard(target);
    if (root?._ce && VP_MODES.includes(mode))
      vpSetMode(root, mode);
  },
  setPreviewState(target, name, value) {
    const root = resolveCard(target);
    if (root?._ce)
      send(root, "set-state", { state: name, value });
  },
  previewState: (target) => ({ ...resolveCard(target)?._ce?.observed }),
  refreshTheme() {
    resolveTheme().then((css) => {
      for (const root of registry.values())
        send(root, "set-theme", { css });
    });
  },
  highlight,
  async copy(target) {
    try {
      await navigator.clipboard.writeText(resolveCard(target)?._ce?.src.value ?? "");
      return true;
    } catch {
      return false;
    }
  }
};
if (!document.__codeExampleInit) {
  document.__codeExampleInit = true;
  addEventListener("message", (e) => {
    const d = e.data;
    if (!d || d.type !== "ce" || !d.ch)
      return;
    const root = registry.get(d.ch);
    if (root)
      onMessage(root, d);
  });
  const release = () => {
    for (const root of registry.values())
      send(root, "pointer-release");
  };
  addEventListener("pointerup", release);
  addEventListener("pointercancel", release);
  addEventListener("blur", release);
  new MutationObserver(() => {
    const dark = document.documentElement.classList.contains("dark");
    for (const root of registry.values())
      send(root, "set-dark", { value: dark });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("fullscreenchange", () => {
    for (const root of registry.values())
      if (dfDollar(root).attr("data-fullscreen") != null && document.fullscreenElement !== root && root._ce.native)
        exitFullscreen(root);
    for (const root of registry.values())
      root._ce.native = document.fullscreenElement === root;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape")
      leaveOverlays();
  });
  addEventListener("resize", debounce(() => {
    vpZoomAll([...registry.values()].filter((root) => root._ce.vpZ && !root._ce.vpZ.value));
  }, 120));
}
var io = typeof IntersectionObserver === "function" ? new IntersectionObserver((list) => {
  for (const en of list) {
    if (en.isIntersecting && en.target._ce && !en.target._ce.booted) {
      io.unobserve(en.target);
      run(en.target, en.target._ce.src.value);
    }
    if (en.isIntersecting && en.target._ce?.stale)
      paint(en.target);
  }
}, { rootMargin: IO_ROOT_MARGIN }) : null;
var idleTimer = 0;
function bootRemaining() {
  for (const root of registry.values())
    if (!root._ce.booted && root.isConnected)
      run(root, root._ce.src.value);
}
function initCard(root) {
  ensureShell(root);
  const src = part(root, "textarea.code-example-src");
  if (!src)
    return;
  let schema = null;
  try {
    schema = JSON.parse(dfDollar(root).attr("data-schema") || "null");
  } catch {
    schema = null;
  }
  const c = {
    ch: `ce${Math.random().toString(36).slice(2, 10)}`,
    src,
    original: src.defaultValue,
    schema,
    frame: part(root, ".code-example-frame"),
    stage: part(root, ".code-example-stage"),
    screen: part(root, ".code-example-screen"),
    device: part(root, ".code-example-device"),
    resizer: part(root, ".code-example-resizer"),
    error: part(root, ".code-example-error"),
    editor: part(root, ".code-example-editor"),
    paint: part(root, ".code-example-paint"),
    minHeight: Math.max(MIN_FRAME_HEIGHT, (Number(dfDollar(root).attr("data-height")) || 0) * REM_PX),
    rows: {},
    observed: {},
    lastRun: "",
    rerunTimer: 0,
    booted: false,
    ready: false
  };
  root._ce = c;
  registry.set(c.ch, root);
  bindComponent(root, codeExampleApi, { name: "default", config: { source: src.value } });
  buildControls(root);
  initViewport(root);
  dfDollar(root).find(".code-example-tab").each((_i, tab) => {
    dfDollar(tab).on("click", () => {
      const next = dfDollar(tab).attr("aria-pressed") === "true" ? null : tab.dataset.tab;
      if (dfDollar(root).attr("data-fullscreen") != null)
        root.api.setState("fullscreen", { panel: next });
      else
        root.api.setState(next ?? "default");
    });
  });
  dfDollar(src).on("input", () => {
    dfDollar(root).attr("data-edited", src.value !== c.original ? "" : null);
    paint(root);
    clearTimeout(c.rerunTimer);
    c.rerunTimer = setTimeout(() => {
      c.rerunTimer = 0;
      run(root, src.value);
      emitChange(root, "input");
    }, RERUN_DEBOUNCE_MS);
  });
  dfDollar(src).on("scroll", () => syncScroll(root));
  dfDollar(src).on("keydown", (e) => onKeydown(root, e));
  const reset = part(root, ".code-example-reset");
  if (reset)
    dfDollar(reset).on("click", () => df$.codeExample.reset(root));
  const copy = part(root, ".code-example-copy");
  if (copy) {
    dfDollar(copy).on("click", async () => {
      const ok = await df$.codeExample.copy(root);
      dfDollar(copy).html(buttonContent(ok ? "check" : "copy", ok ? "Copied" : "Copy failed"));
      setTimeout(() => dfDollar(copy).html(buttonContent("copy", "Copy")), 1200);
    });
  }
  const full = part(root, ".code-example-full");
  if (full)
    dfDollar(full).on("click", () => dfDollar(root).attr("data-fullscreen") != null ? exitFullscreen(root) : enterFullscreen(root));
  const exit = part(root, ".code-example-full-exit");
  if (exit)
    dfDollar(exit).on("click", () => exitFullscreen(root));
  if (c.stage && typeof ResizeObserver === "function") {
    const settle = debounce(() => {
      if (dfDollar(root).attr("data-fullscreen") != null)
        refit(root);
    }, 60);
    new ResizeObserver(settle).observe(c.stage);
  }
  if (io)
    io.observe(root);
  else
    run(root, src.value);
}
function init() {
  let found = 0;
  dfDollar(".code-example:not([data-init])").each((_i, root) => {
    dfDollar(root).data("init", "");
    initCard(root);
    found++;
  });
  if (!found)
    return;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(bootRemaining, IDLE_BOOT_MS);
}
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

// dist/components/editorjs/editorjs.js
var __df$core2 = globalThis.df$;
var __df$shared2 = __df$core2 && __df$core2.shadcn && __df$core2.shadcn.shared;
if (!__df$shared2 || __df$shared2.abi !== "0.9.7") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals2, defussQuery: defussQuery2, componentState: componentState2, bindComponent: bindComponent2 } = __df$shared2;
var df$2 = defussGlobals2();
var dfDollar2 = defussQuery2();
var editorjsStates = ["default", "readonly"];
var EDITORJS_URL = "https://cdn.jsdelivr.net/npm/@editorjs/editorjs@2.31.7/dist/editorjs.mjs";
var EDITORJS_TOOLS = {
  header: "https://cdn.jsdelivr.net/npm/@editorjs/header@2.8.9/dist/header.mjs",
  list: "https://cdn.jsdelivr.net/npm/@editorjs/list@2.0.9/dist/editorjs-list.mjs",
  quote: "https://cdn.jsdelivr.net/npm/@editorjs/quote@2.7.6/dist/quote.mjs",
  code: "https://cdn.jsdelivr.net/npm/@editorjs/code@2.9.4/dist/code.mjs",
  delimiter: "https://cdn.jsdelivr.net/npm/@editorjs/delimiter@1.4.2/dist/delimiter.mjs",
  marker: "https://cdn.jsdelivr.net/npm/@editorjs/marker@1.4.0/dist/marker.mjs",
  inlineCode: "https://cdn.jsdelivr.net/npm/@editorjs/inline-code@1.5.2/dist/inline-code.mjs",
  table: "https://cdn.jsdelivr.net/npm/@editorjs/table@2.4.6/dist/table.mjs"
};
var MARKED_URL = "https://cdn.jsdelivr.net/npm/marked@18.1.0/lib/marked.esm.js";
var modules = new Map;
function loadModule(vendorUrl) {
  let pending = modules.get(vendorUrl);
  if (!pending) {
    pending = import(/* @vite-ignore */ vendorUrl).then((m) => m.default ?? m);
    modules.set(vendorUrl, pending);
  }
  return pending;
}
async function loadVendor(toolNames) {
  const [EditorJS, marked, ...tools] = await Promise.all([loadModule(EDITORJS_URL), loadModule(MARKED_URL), ...toolNames.map((n) => loadModule(EDITORJS_TOOLS[n]))]);
  return { EditorJS, marked, tools: Object.fromEntries(toolNames.map((n, i) => [n, tools[i]])) };
}
function markdownToBlocks(md, marked) {
  const inline = (t) => marked.parseInline(t).replace(/<code>/g, '<code class="inline-code">').replace(/<(\/?)strong>/g, "<$1b>").replace(/<(\/?)em>/g, "<$1i>");
  const items = (list) => (list.items ?? []).map((it) => {
    const own = (it.tokens ?? []).filter((t) => t.type !== "list");
    const sub = (it.tokens ?? []).find((t) => t.type === "list");
    return { content: inline(own.map((t) => t.text ?? t.raw ?? "").join(" ").trim()), meta: it.task ? { checked: !!it.checked } : {}, items: sub ? items(sub) : [] };
  });
  const blocks = [];
  for (const t of marked.lexer(md)) {
    switch (t.type) {
      case "heading":
        blocks.push({ type: "header", data: { text: inline(t.text ?? ""), level: Math.min(6, Math.max(1, t.depth ?? 2)) } });
        break;
      case "paragraph":
        blocks.push({ type: "paragraph", data: { text: inline(t.text ?? "") } });
        break;
      case "list":
        blocks.push({ type: "list", data: { style: t.items?.some((i) => i.task) ? "checklist" : t.ordered ? "ordered" : "unordered", meta: {}, items: items(t) } });
        break;
      case "blockquote":
        blocks.push({ type: "quote", data: { text: inline((t.tokens ?? []).map((x) => x.text ?? "").join(`
`)), caption: "", alignment: "left" } });
        break;
      case "code":
        blocks.push({ type: "code", data: { code: t.text ?? "" } });
        break;
      case "hr":
        blocks.push({ type: "delimiter", data: {} });
        break;
      case "table":
        blocks.push({ type: "table", data: { withHeadings: true, content: [(t.header ?? []).map((c) => inline(c.text)), ...(t.rows ?? []).map((r) => r.map((c) => inline(c.text)))] } });
        break;
      case "html":
        blocks.push({ type: "paragraph", data: { text: t.raw ?? "" } });
        break;
      default:
        break;
    }
  }
  blocks.forEach((b, i) => {
    b.id = `b${i + 1}`;
  });
  return blocks;
}
function inlineToMarkdown(html) {
  return html.replace(/<br\s*\/?>/gi, `  
`).replace(/<(b|strong)>([\s\S]*?)<\/\1>/gi, "**$2**").replace(/<(i|em)>([\s\S]*?)<\/\1>/gi, "*$2*").replace(/<u>([\s\S]*?)<\/u>/gi, "$1").replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`").replace(/<mark[^>]*>([\s\S]*?)<\/mark>/gi, "$1").replace(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim();
}
function blocksToMarkdown(blocks) {
  const list = (items, style, depth) => items.map((it, i) => {
    const bullet = style === "ordered" ? `${i + 1}.` : style === "checklist" ? `- [${it.meta?.checked ? "x" : " "}]` : "-";
    const sub = it.items?.length ? `
` + list(it.items, style, depth + 1) : "";
    return `${"  ".repeat(depth)}${bullet} ${inlineToMarkdown(it.content)}${sub}`;
  }).join(`
`);
  return blocks.map((b) => {
    const d = b.data;
    switch (b.type) {
      case "header":
        return `${"#".repeat(Number(d.level) || 2)} ${inlineToMarkdown(String(d.text ?? ""))}`;
      case "paragraph":
        return inlineToMarkdown(String(d.text ?? ""));
      case "list":
        return list(d.items ?? [], String(d.style ?? "unordered"), 0);
      case "quote":
        return inlineToMarkdown(String(d.text ?? "")).split(`
`).map((l) => `> ${l}`).join(`
`) + (d.caption ? `
> - ${inlineToMarkdown(String(d.caption))}` : "");
      case "code":
        return "```\n" + String(d.code ?? "") + "\n```";
      case "delimiter":
        return "---";
      case "table": {
        const rows = d.content ?? [];
        if (!rows.length)
          return "";
        const line = (r) => `| ${r.map(inlineToMarkdown).join(" | ")} |`;
        const [head, ...body] = rows;
        return d.withHeadings === false ? rows.map(line).join(`
`) : [line(head), `| ${head.map(() => "---").join(" | ")} |`, ...body.map(line)].join(`
`);
      }
      default:
        return "";
    }
  }).filter(Boolean).join(`

`) + `
`;
}
function applyMarkup2(el, stateName) {
  dfDollar2(el).attr("data-readonly", stateName === "readonly" ? "" : null);
}
function triggerStateChange2(el, stateName) {
  applyMarkup2(el, stateName);
  const editor = el._editorjs;
  if (editor)
    editor.isReady.then(() => editor.readOnly.toggle(stateName === "readonly")).catch(() => {
      return;
    });
}
var editorjsApi = componentState2({
  component: "editorjs",
  states: editorjsStates,
  apply: (el, state) => triggerStateChange2(el, state.name),
  read: (el, state) => ({ name: el.hasAttribute("data-readonly") ? "readonly" : "default", config: state.config }),
  markup: (el, state) => applyMarkup2(el, state.name)
});
df$2.editorjsApi = editorjsApi;
df$2.editorjsStates = editorjsStates;
var DEFAULT_TOOLS = Object.keys(EDITORJS_TOOLS);
function sourceOf(el) {
  const script = dfDollar2(el).children("script.editorjs-source").get(0);
  const text = script?.textContent ?? "";
  if (!script || !text.trim())
    return { markdown: "" };
  if (/json/i.test(script.type)) {
    try {
      return { data: JSON.parse(text) };
    } catch {
      return { markdown: text };
    }
  }
  return { markdown: text.replace(/^\n/, "") };
}
function inlineCommand(name) {
  if (name === "bold" || name === "italic" || name === "underline")
    return document.execCommand(name);
  const sel = globalThis.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed)
    return false;
  const range = sel.getRangeAt(0);
  const tag = name === "marker" ? "mark" : name === "inline-code" ? "code" : null;
  if (!tag)
    return false;
  const wrapper = document.createElement(tag);
  if (name === "marker")
    wrapper.className = "cdx-marker";
  if (name === "inline-code")
    wrapper.className = "inline-code";
  try {
    range.surroundContents(wrapper);
  } catch {
    wrapper.append(range.extractContents());
    range.insertNode(wrapper);
  }
  return true;
}
function currentBlock(el, editor) {
  const anchor = globalThis.getSelection()?.anchorNode;
  const node = anchor && (anchor.nodeType === Node.ELEMENT_NODE ? anchor : anchor.parentElement);
  const holder = node && el.contains(node) ? node.closest(".ce-block") : null;
  if (holder)
    return editor.blocks.getBlockByElement(holder);
  const index = editor.blocks.getCurrentBlockIndex();
  return index >= 0 ? editor.blocks.getBlockByIndex(index) : undefined;
}
async function runCommand(el, name) {
  const editor = el._editorjs;
  if (!editor)
    return false;
  await editor.isReady;
  if (["bold", "italic", "underline", "marker", "inline-code"].includes(name))
    return inlineCommand(name);
  const [kind, arg] = name.split(":");
  const current = currentBlock(el, editor);
  if (kind === "delimiter" || kind === "table") {
    const index = current ? editor.blocks.getBlockIndex(current.id) : editor.blocks.getBlocksCount() - 1;
    editor.blocks.insert(kind, kind === "table" ? { withHeadings: true, content: [["", ""], ["", ""]] } : {}, {}, index + 1, true);
    return true;
  }
  if (!current)
    return false;
  if (kind === "paragraph") {
    await editor.blocks.convert(current.id, "paragraph");
    return true;
  }
  if (kind === "header") {
    const level = Math.min(6, Math.max(1, Number(arg) || 2));
    if (current.name !== "header")
      await editor.blocks.convert(current.id, "header", { level });
    const block = editor.blocks.getById(current.id);
    if (block)
      await editor.blocks.update(block.id, { level });
    return true;
  }
  if (kind === "list") {
    const style = arg === "ordered" ? "ordered" : arg === "checklist" ? "checklist" : "unordered";
    if (current.name !== "list")
      await editor.blocks.convert(current.id, "list", { style });
    else
      await editor.blocks.update(current.id, { style });
    return true;
  }
  if (kind === "quote" || kind === "code") {
    await editor.blocks.convert(current.id, kind);
    return true;
  }
  return false;
}
function syncToolbar(el) {
  const bar = el._toolbar;
  if (!bar || !el.contains(document.activeElement))
    return;
  const editor = el._editorjs;
  const current = editor ? currentBlock(el, editor) : undefined;
  const anchor = globalThis.getSelection()?.anchorNode;
  const node = anchor && (anchor.nodeType === Node.ELEMENT_NODE ? anchor : anchor.parentElement);
  const holder = node && el.contains(node) ? node.closest(".ce-block") : null;
  const level = holder ? dfDollar2(holder).find(".ce-header").get(0)?.tagName.replace(/^H/i, "") ?? "" : "";
  const listStyle = holder && dfDollar2(holder).find(".cdx-list").length ? dfDollar2(holder).find(".cdx-list--checklist").length ? "checklist" : dfDollar2(holder).find(".cdx-list--ordered").length ? "ordered" : "unordered" : "";
  dfDollar2(bar).find("[data-editor-command]").toArray().forEach((b) => {
    const name = b.dataset.editorCommand ?? "";
    const [kind, arg] = name.split(":");
    let on = null;
    if (kind === "bold")
      on = !!node?.closest("b, strong");
    else if (kind === "italic")
      on = !!node?.closest("i, em");
    else if (kind === "underline")
      on = !!node?.closest("u");
    else if (kind === "paragraph")
      on = current?.name === "paragraph";
    else if (kind === "header")
      on = current?.name === "header" && (!arg || arg === level);
    else if (kind === "list")
      on = current?.name === "list" && (!arg || arg === listStyle);
    else if (kind === "quote" || kind === "code")
      on = current?.name === kind;
    if (on !== null && b.hasAttribute("aria-pressed"))
      dfDollar2(b).attr("aria-pressed", String(on));
  });
}
async function mount(el) {
  const toolNames = (dfDollar2(el).attr("data-tools") ?? "").split(/\s+/).filter((n) => EDITORJS_TOOLS[n]);
  const tools = toolNames.length ? toolNames : DEFAULT_TOOLS;
  const { EditorJS, tools: loaded, marked } = await loadVendor(tools);
  if (!el.isConnected)
    return;
  el._marked = marked;
  const source = sourceOf(el);
  const data = source.data ?? { blocks: markdownToBlocks(source.markdown ?? "", marked) };
  let holder = dfDollar2(el).children(".editorjs-holder").get(0);
  if (!holder) {
    holder = document.createElement("div");
    holder.className = "editorjs-holder";
    dfDollar2(el).append(holder);
  }
  const config = {};
  for (const name of tools) {
    const cls = loaded[name];
    config[name] = name === "list" ? { class: cls, inlineToolbar: true, config: { defaultStyle: "unordered" } } : name === "header" ? { class: cls, inlineToolbar: true, config: { levels: [1, 2, 3, 4], defaultLevel: 2 } } : name === "quote" || name === "table" ? { class: cls, inlineToolbar: true } : cls;
  }
  const Ctor = EditorJS;
  const editor = new Ctor({
    holder,
    data,
    tools: config,
    readOnly: el.hasAttribute("data-readonly"),
    placeholder: dfDollar2(el).attr("data-placeholder") ?? "Write...",
    minHeight: 0,
    onChange: async () => {
      el.dispatchEvent(new CustomEvent("editorjs-change", { bubbles: true, detail: { blocks: editor.blocks.getBlocksCount() } }));
    }
  });
  el._editorjs = editor;
  await editor.isReady;
  if (!el.isConnected)
    return;
  dfDollar2(el).attr("data-ready", "");
  el.dispatchEvent(new CustomEvent("editorjs-ready", { bubbles: true, detail: { blocks: data.blocks.length } }));
}
function init2() {
  dfDollar2(".editorjs:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    bindComponent2(el, editorjsApi);
    const barId = dfDollar2(el).attr("data-toolbar");
    const bar = barId ? dfDollar2("#" + CSS.escape(barId)).get(0) : undefined;
    if (bar) {
      el._toolbar = bar;
      dfDollar2(bar).on("mousedown", (e) => {
        if (e.target.closest("[data-editor-command]"))
          e.preventDefault();
      });
      dfDollar2(bar).on("click", (e) => {
        const button = e.target.closest("[data-editor-command]");
        if (!button)
          return;
        runCommand(el, button.dataset.editorCommand ?? "").then(() => syncToolbar(el));
      });
    }
    mount(el).catch(() => {
      dfDollar2(el).attr("data-error", "");
    });
  });
}
if (!document.__editorjsInit) {
  document.__editorjsInit = true;
  document.addEventListener("selectionchange", () => {
    for (const el of dfDollar2(".editorjs[data-ready]").toArray())
      syncToolbar(el);
  });
}
var resolve = (target) => typeof target === "string" ? dfDollar2(target).get(0) : target;
var editorOf = (target) => resolve(target)?._editorjs;
df$2.editorjs = {
  load: (url) => loadModule(url || EDITORJS_URL),
  url: EDITORJS_URL,
  markdown: async (target) => {
    const editor = editorOf(target);
    if (!editor)
      return "";
    await editor.isReady;
    return blocksToMarkdown((await editor.save()).blocks);
  },
  setMarkdown: async (target, markdown) => {
    const el = resolve(target);
    const editor = el?._editorjs;
    if (!el || !editor)
      return;
    await editor.isReady;
    await editor.blocks.render({ blocks: markdownToBlocks(markdown, el._marked) });
  },
  blocks: async (target) => {
    const editor = editorOf(target);
    if (!editor)
      return null;
    await editor.isReady;
    return editor.save();
  },
  setBlocks: async (target, data) => {
    const editor = editorOf(target);
    if (!editor)
      return;
    await editor.isReady;
    await editor.blocks.render(data);
  },
  command: (target, name) => {
    const el = resolve(target);
    return el ? runCommand(el, name) : Promise.resolve(false);
  },
  editor: (target) => editorOf(target),
  toBlocks: (target, markdown) => {
    const marked = resolve(target)?._marked;
    return marked ? markdownToBlocks(markdown, marked) : [];
  },
  toMarkdown: (blocks) => blocksToMarkdown(blocks)
};
init2();
new MutationObserver(init2).observe(document, { childList: true, subtree: true });

//# debugId=444D2F183803FB0A64756E2164756E21
//# sourceMappingURL=wysiwyg.js.map
