// dist/components/visual-editor/visual-editor.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.9.10") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals, defussQuery, componentState, bindComponent, sheetUrl } = __df$shared;
var df$ = defussGlobals();
var dfDollar = defussQuery();
var visualEditorStates = ["default", "readonly"];
var VISUAL_EDITOR_URL = "https://cdn.jsdelivr.net/npm/grapesjs@0.23.6/dist/grapes.min.js";
var VISUAL_EDITOR_CSS_URL = "https://cdn.jsdelivr.net/npm/grapesjs@0.23.6/dist/css/grapes.min.css";
var DEVICES = [
  { id: "desktop", name: "desktop", width: "" },
  { id: "tablet", name: "tablet", width: "834px", widthMedia: "834px" },
  { id: "phone", name: "phone", width: "390px", widthMedia: "390px" }
];
var engine = null;
function linkSheet(css) {
  if (dfDollar("link[data-visual-editor-vendor]").length)
    return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = css;
  link.dataset.visualEditorVendor = "";
  dfDollar(document.head).append(link);
}
function loadEngine(url = VISUAL_EDITOR_URL, css = VISUAL_EDITOR_CSS_URL) {
  if (!engine) {
    linkSheet(css);
    engine = Promise.resolve().then(() => import(/* @vite-ignore */ url)).then(() => {
      const g = globalThis.grapesjs;
      if (!g?.init)
        throw new Error("GrapesJS did not install globalThis.grapesjs");
      return g;
    });
    engine.catch(() => {
      engine = null;
    });
  }
  return engine;
}
function plainTypes(editor) {
  const types = [
    ["video", false],
    ["iframe", false],
    ["table", ["thead", "tbody", "tfoot", "tr", "caption", "colgroup"]]
  ];
  for (const [tag, droppable] of types)
    editor.Components.addType(`plain-${tag}`, {
      extend: "default",
      isComponent: (node) => node.tagName?.toLowerCase() === tag,
      model: { defaults: { tagName: tag, droppable } }
    });
}
function hostStyles() {
  const links = dfDollar('link[rel="stylesheet"]').toArray().filter((l) => !l.hasAttribute("data-visual-editor-vendor")).map((l) => sheetUrl(l)).filter(Boolean);
  const css = dfDollar("style").toArray().map((s) => s.textContent ?? "").join(`
`);
  return { links, css };
}
function sourceOf(el) {
  return String(dfDollar(el).children("script.visual-editor-source").get(0)?.textContent ?? "").trim();
}
var parse = (html) => new DOMParser().parseFromString(`<body>${html}</body>`, "text/html").body;
var escapeText = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
var REF_ONE = new Set([
  "for",
  "form",
  "list",
  "popovertarget",
  "commandfor",
  "aria-activedescendant",
  "aria-details",
  "aria-errormessage"
]);
var REF_MANY = new Set([
  "aria-controls",
  "aria-labelledby",
  "aria-describedby",
  "aria-owns",
  "aria-flowto",
  "headers"
]);
function remapIds(html, taken) {
  const body = parse(html);
  const map = new Map;
  for (const node of dfDollar(body).find("[id]").toArray()) {
    const id = node.id;
    if (!id)
      continue;
    let next = id;
    for (let n = 2;taken.has(next); n++)
      next = `${id}-${n}`;
    taken.add(next);
    if (next !== id) {
      map.set(id, next);
      node.id = next;
    }
  }
  if (!map.size)
    return html;
  for (const node of dfDollar(body).find("*").toArray()) {
    for (const attr of Array.from(node.attributes)) {
      const key = attr.name;
      let v = attr.value;
      if (REF_ONE.has(key) || key.startsWith("data-"))
        v = map.get(v) ?? v;
      else if (REF_MANY.has(key))
        v = v.split(/(\s+)/).map((t) => map.get(t) ?? t).join("");
      else if (key === "href" && v.startsWith("#"))
        v = `#${map.get(v.slice(1)) ?? v.slice(1)}`;
      if (v !== attr.value)
        node.setAttribute(key, v);
    }
  }
  return String(dfDollar(body).html());
}
var pageIds = (editor) => new Set(dfDollar(parse(htmlOf(editor))).find("[id]").toArray().map((n) => n.id));
var styleText = (style) => Object.entries(style ?? {}).filter(([k, v]) => !k.startsWith("__") && v !== "" && v !== null && v !== undefined).map(([k, v]) => `${k}: ${String(v)}`).join("; ");
var authoredId = (m) => ("id" in (m.get("attributes") ?? {}));
function attributesOf(m) {
  const attrs = { ...m.getAttributes() };
  if (!authoredId(m))
    delete attrs.id;
  return attrs;
}
var madeIds = (editor) => new Set(editor.getWrapper().find("*").filter((m) => !authoredId(m)).map((m) => m.getId()));
function htmlOf(editor) {
  return editor.getHtml({
    attributes: (m, attrs) => {
      if (!authoredId(m))
        delete attrs.id;
      const style = styleText(m.getStyle());
      if (style)
        attrs.style = style;
      return attrs;
    }
  }).replace(/^<body[^>]*>/, "").replace(/<\/body>\s*$/, "");
}
var elements = (m) => m.components().models.filter((c) => !["textnode", "comment"].includes(String(c.get("type"))));
function pathOf(editor, m) {
  const steps = [];
  const root = editor.getWrapper();
  for (let c = m;c && c !== root; c = c.parent()) {
    const p = c.parent();
    if (!p)
      break;
    steps.unshift(elements(p).indexOf(c));
  }
  return steps.join(".");
}
function atPath(editor, path) {
  let m = editor.getWrapper();
  for (const step of path.split(".").filter(Boolean))
    m = m ? elements(m)[Number(step)] : undefined;
  return m === editor.getWrapper() ? undefined : m;
}
function textOnly(m) {
  const tag = String(m.get("tagName") ?? "").toLowerCase();
  if (["input", "img", "br", "hr", "video", "iframe", "select", "textarea"].includes(tag))
    return false;
  return m.components().models.every((c) => c.get("type") === "textnode");
}
function selectionOf(editor, m) {
  if (!m)
    return null;
  const attributes = attributesOf(m);
  delete attributes.class;
  return {
    path: pathOf(editor, m),
    tag: String(m.get("tagName") ?? "div").toLowerCase(),
    attributes,
    classes: [...m.getClasses()],
    text: textOnly(m) ? m.getEl()?.textContent ?? "" : null,
    unit: m.get("veLocked") ? pathOf(editor, unitOf(m)) : null
  };
}
var PART_TOOLS = new Set(["tlb-move", "tlb-clone", "tlb-delete"]);
var PART_PROPS = ["droppable", "editable", "draggable", "removable", "copyable", "toolbar"];
function unitOf(m) {
  let u = m;
  while (u.get("veLocked") === "part" && u.parent())
    u = u.parent();
  return u;
}
function setLock(m, locked) {
  const quiet = { avoidStore: true };
  const keep = (part) => {
    if (!part.get("veWas"))
      part.set({ veWas: Object.fromEntries(PART_PROPS.map((p) => [p, part.get(p)])) }, quiet);
  };
  const restore = (part) => {
    const was = part.get("veWas");
    if (was)
      part.set({ ...was, veWas: null, veLocked: null }, quiet);
  };
  if (!locked) {
    for (const part of [m, ...m.find("*")])
      restore(part);
    return;
  }
  keep(m);
  m.set({ veLocked: "root", droppable: false, editable: false }, quiet);
  for (const part of m.find("*")) {
    keep(part);
    const toolbar = (part.get("veWas").toolbar ?? []).filter((t) => !PART_TOOLS.has(String(t.command)));
    part.set({
      veLocked: "part",
      droppable: false,
      editable: false,
      draggable: false,
      removable: false,
      copyable: false,
      toolbar
    }, quiet);
  }
}
function unsafeUrl(value) {
  let start = 0;
  while (start < value.length && value.charCodeAt(start) <= 32)
    start++;
  const url = value.slice(start).replace(/[\t\n\r]/g, "").toLowerCase();
  return /^(?:javascript|vbscript):/.test(url) || url.startsWith("data:") && !url.startsWith("data:image/");
}
var URL_ATTRS = new Set([
  "href",
  "src",
  "action",
  "formaction",
  "poster",
  "cite",
  "data",
  "background",
  "xlink:href"
]);
function checkAttribute(name, value) {
  const key = name.toLowerCase();
  if (!/^[a-z_:][a-z0-9_.:-]*$/.test(key) || key.startsWith("on") || key === "srcdoc")
    throw new Error(`visual-editor: the attribute ${name} is not editable`);
  if (value !== null && URL_ATTRS.has(key) && unsafeUrl(value))
    throw new Error(`visual-editor: ${name} must not run code (${value.slice(0, 40)})`);
}
var DROPPED = "script, base, meta, object, embed, applet, frame, frameset";
var HREF_ANIMATION = /^(?:animate|set|animatemotion|animatetransform)$/i;
function clean(html) {
  const scrub = (root) => {
    dfDollar(root).find(DROPPED).remove();
    for (const el of dfDollar(root).find("*").toArray()) {
      if (HREF_ANIMATION.test(el.localName) && /href$/i.test(el.getAttribute("attributeName") ?? "")) {
        el.remove();
        continue;
      }
      for (const a of Array.from(el.attributes)) {
        const key = a.name.toLowerCase();
        if (key.startsWith("on") || key === "srcdoc" || URL_ATTRS.has(key) && unsafeUrl(a.value))
          el.removeAttribute(a.name);
      }
      if (el.localName === "template")
        scrub(el.content);
    }
  };
  const body = parse(html);
  scrub(body);
  return dfDollar(body).html() ?? "";
}
function applyMarkup(el, name, config) {
  dfDollar(el).attr("data-readonly", name === "readonly" ? "" : null);
  const device = config.device && config.device !== "desktop" ? config.device : null;
  dfDollar(el).attr("data-device", device);
}
function triggerStateChange(el, name, config) {
  applyMarkup(el, name, config);
  const canvas = dfDollar(el).children(".visual-editor-canvas").get(0);
  if (canvas)
    canvas.inert = name === "readonly";
  const editor = el._visualEditor;
  if (!editor)
    return;
  if (name === "readonly")
    editor.select(null);
  editor.setDevice(config.device && DEVICES.some((d) => d.id === config.device) ? config.device : "desktop");
}
var visualEditorApi = componentState({
  component: "visual-editor",
  states: visualEditorStates,
  mergeConfig: true,
  apply: (el, state) => triggerStateChange(el, state.name, state.config),
  read: (el, state) => ({
    name: el.hasAttribute("data-readonly") ? "readonly" : "default",
    config: { ...state.config, device: el.dataset.device || "desktop" }
  }),
  markup: (el, state) => applyMarkup(el, state.name, state.config)
});
df$.visualEditorApi = visualEditorApi;
df$.visualEditorStates = visualEditorStates;
function syncControls(el) {
  const editor = el._visualEditor;
  if (!editor || !el.id)
    return;
  for (const b of dfDollar(`[data-visual-editor-for="${CSS.escape(el.id)}"][data-visual-editor-action]`).toArray()) {
    const action = b.dataset.visualEditorAction;
    const selected = editor.getSelected();
    if (action === "undo")
      b.disabled = !editor.UndoManager.hasUndo();
    else if (action === "redo")
      b.disabled = !editor.UndoManager.hasRedo();
    else if (action === "duplicate")
      b.disabled = !selected || selected.get("copyable") === false;
    else if (action === "remove")
      b.disabled = !selected || selected.get("removable") === false;
  }
}
async function mount(el) {
  const grapes = await loadEngine();
  if (!el.isConnected || el._visualEditor)
    return;
  const canvas = document.createElement("div");
  canvas.className = "visual-editor-canvas";
  dfDollar(el).append(canvas);
  const { links, css } = hostStyles();
  const editor = grapes.init({
    container: canvas,
    height: "100%",
    width: "auto",
    fromElement: false,
    storageManager: false,
    telemetry: false,
    protectedCss: "",
    canvasCss: css,
    noticeOnUnload: false,
    showOffsets: true,
    panels: { defaults: [] },
    styleManager: { sectors: [] },
    selectorManager: { componentFirst: true },
    deviceManager: { devices: DEVICES, default: "desktop" },
    canvas: { styles: links, scripts: [] },
    plugins: [plainTypes],
    components: clean(sourceOf(el))
  });
  el._visualEditor = editor;
  await new Promise((resolve) => editor.onReady(resolve));
  if (!el.isConnected)
    return;
  const doc = editor.Canvas.getDocument();
  const dark = () => doc?.documentElement.classList.toggle("dark", document.documentElement.classList.contains("dark"));
  dark();
  new MutationObserver(dark).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  editor.UndoManager.clear();
  let timer;
  editor.on("update", () => {
    syncControls(el);
    clearTimeout(timer);
    timer = setTimeout(() => {
      el.dispatchEvent(new CustomEvent("visual-editor-change", {
        bubbles: true,
        detail: { html: htmlOf(editor) }
      }));
    }, 200);
  });
  const selected = () => {
    syncControls(el);
    el.dispatchEvent(new CustomEvent("visual-editor-select", {
      bubbles: true,
      detail: { selection: selectionOf(editor, editor.getSelected()) }
    }));
  };
  editor.on("component:selected", selected);
  editor.on("component:deselected", selected);
  const state = el.api?.getState();
  triggerStateChange(el, state?.name ?? "default", state?.config ?? {});
  dfDollar(el).attr("data-ready", "");
  syncControls(el);
  el.dispatchEvent(new CustomEvent("visual-editor-ready", {
    bubbles: true,
    detail: { html: htmlOf(editor) }
  }));
}
function init() {
  dfDollar(".visual-editor:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    bindComponent(el, visualEditorApi);
    mount(el).catch(() => {
      dfDollar(el).attr("data-error", "");
    });
  });
}
var resolve = (target) => typeof target === "string" ? dfDollar(target).get(0) : target;
var editorOf = (target) => resolve(target)?._visualEditor;
var controlled = (control) => {
  const id = control.closest("[data-visual-editor-for]")?.dataset.visualEditorFor;
  return id ? dfDollar(`#${CSS.escape(id)}`).get(0) : undefined;
};
var blockHtml = (block) => {
  const data = dfDollar(block).children('script[type="text/html"]').get(0);
  if (data)
    return String(data.textContent ?? "").trim();
  const tpl = dfDollar(block).children("template").get(0);
  return tpl ? String(dfDollar(tpl).html() ?? "").trim() : "";
};
function insert(editor, html) {
  const fresh = remapIds(clean(html), pageIds(editor));
  const picked = editor.getSelected();
  const selected = picked && unitOf(picked);
  const takes = selected && selected.get("droppable") !== false && !textOnly(selected);
  let added;
  if (selected && takes)
    added = selected.components().add(fresh);
  else if (selected?.parent()) {
    const parent = selected.parent();
    added = parent.components().add(fresh, { at: parent.components().indexOf(selected) + 1 });
  } else
    added = editor.addComponents(fresh);
  return Array.isArray(added) ? added.length : 1;
}
if (!document.__visualEditorInit) {
  document.__visualEditorInit = true;
  document.addEventListener("click", (e) => {
    const control = e.target.closest("[data-visual-editor-for] [data-visual-editor-block], [data-visual-editor-block][data-visual-editor-for], [data-visual-editor-for][data-visual-editor-action]");
    const el = control && controlled(control);
    const editor = el?._visualEditor;
    if (!control || !el || !editor || el.hasAttribute("data-readonly"))
      return;
    if (control.hasAttribute("data-visual-editor-block"))
      insert(editor, blockHtml(control));
    else if (control.dataset.visualEditorAction !== "device")
      df$.visualEditor[control.dataset.visualEditorAction](el);
  });
  document.addEventListener("change", (e) => {
    const select = e.target.closest('select[data-visual-editor-for][data-visual-editor-action="device"]');
    const el = select && controlled(select);
    if (select && el?.api)
      el.api.setState(el.api.getState().name, { device: select.value });
  });
  document.addEventListener("dragstart", (e) => {
    const block = e.target.closest?.("[data-visual-editor-block]");
    const el = block && controlled(block);
    const editor = el?._visualEditor;
    if (!block || !editor || el.hasAttribute("data-readonly"))
      return;
    editor.Canvas.startDrag({ content: remapIds(clean(blockHtml(block)), pageIds(editor)) });
  });
  document.addEventListener("dragend", (e) => {
    const block = e.target.closest?.("[data-visual-editor-block]");
    const editor = block && controlled(block)?._visualEditor;
    editor?.Canvas.endDrag();
  });
}
df$.visualEditor = {
  load: (url, css) => loadEngine(url || VISUAL_EDITOR_URL, css || VISUAL_EDITOR_CSS_URL),
  url: VISUAL_EDITOR_URL,
  html: (target) => {
    const editor = editorOf(target);
    return editor ? htmlOf(editor) : "";
  },
  css: (target) => {
    const editor = editorOf(target);
    if (!editor)
      return "";
    const made = madeIds(editor);
    return editor.getCss().replace(/#([\w-]+)\{[^}]*\}/g, (rule, id) => made.has(id) ? "" : rule).trim();
  },
  setHtml: (target, html) => {
    const editor = editorOf(target);
    if (!editor)
      return;
    editor.setComponents(clean(html));
    editor.UndoManager.clear();
  },
  insert: (target, html) => {
    const editor = editorOf(target);
    return editor ? insert(editor, html) : 0;
  },
  select: (target, path) => {
    const editor = editorOf(target);
    if (!editor)
      return null;
    editor.select(path === null ? null : atPath(editor, path) ?? null);
    return selectionOf(editor, editor.getSelected());
  },
  selection: (target) => {
    const editor = editorOf(target);
    return editor ? selectionOf(editor, editor.getSelected()) : null;
  },
  apply: (target, change) => {
    const editor = editorOf(target);
    const m = editor?.getSelected();
    if (!editor || !m)
      return null;
    if (m.get("veLocked"))
      throw new Error("visual-editor: the element is locked - change its state, not its markup");
    const attrs = change.attributes ?? {};
    for (const [name, value] of Object.entries(attrs))
      checkAttribute(name, value);
    const set = Object.fromEntries(Object.entries(attrs).filter(([, v]) => v !== null));
    const drop = Object.entries(attrs).filter(([, v]) => v === null).map(([k]) => k);
    if (Object.keys(set).length)
      m.addAttributes(set);
    if (drop.length)
      m.removeAttributes(drop);
    if (change.classes)
      m.setClass(change.classes.filter((c) => /^[^\s<>"']+$/.test(c)));
    if (change.text !== undefined) {
      if (!textOnly(m))
        throw new Error("visual-editor: only a text-only element takes text");
      m.components(escapeText(change.text));
    }
    return selectionOf(editor, m);
  },
  duplicate: (target) => {
    const editor = editorOf(target);
    const m = editor?.getSelected();
    const parent = m?.parent();
    if (!editor || !m || !parent || m.get("copyable") === false)
      return false;
    const added = parent.components().add(remapIds(m.toHTML(), pageIds(editor)), { at: parent.components().indexOf(m) + 1 });
    const copy = Array.isArray(added) ? added[0] : added;
    if (m.get("veLocked") === "root")
      setLock(copy, true);
    editor.select(copy);
    return true;
  },
  remove: (target) => {
    const m = editorOf(target)?.getSelected();
    if (!m || m.get("removable") === false)
      return false;
    m.remove();
    return true;
  },
  lock: (target, path, locked = true) => {
    const editor = editorOf(target);
    const m = editor && atPath(editor, path);
    if (!m)
      return false;
    setLock(m, locked);
    return true;
  },
  replace: (target, html) => {
    const editor = editorOf(target);
    const m = editor?.getSelected();
    const parent = m?.parent();
    if (!editor || !m || !parent || m.get("veLocked") === "part")
      return null;
    const at = parent.components().indexOf(m);
    const locked = m.get("veLocked") === "root";
    m.remove();
    const added = parent.components().add(clean(html), { at });
    const next = Array.isArray(added) ? added[0] : added;
    if (!next)
      return null;
    if (locked)
      setLock(next, true);
    editor.select(next);
    return selectionOf(editor, next);
  },
  undo: (target) => {
    const editor = editorOf(target);
    if (!editor?.UndoManager.hasUndo())
      return false;
    editor.UndoManager.undo();
    return true;
  },
  redo: (target) => {
    const editor = editorOf(target);
    if (!editor?.UndoManager.hasRedo())
      return false;
    editor.UndoManager.redo();
    return true;
  },
  outline: (target) => {
    const editor = editorOf(target);
    if (!editor)
      return [];
    const node = (m, path) => {
      const attrs = attributesOf(m);
      const tag = String(m.get("tagName") ?? "div").toLowerCase();
      const first = m.getClasses()[0];
      return {
        path,
        label: attrs.id ? `${tag}#${attrs.id}` : first ? `${tag}.${first}` : tag,
        children: elements(m).map((c, i) => node(c, `${path}.${i}`))
      };
    };
    return elements(editor.getWrapper()).map((m, i) => node(m, String(i)));
  },
  editor: (target) => editorOf(target)
};
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

//# debugId=84DE4EB1A997D04F64756E2164756E21
//# sourceMappingURL=visual-editor.js.map
