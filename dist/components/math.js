// dist/components/math-renderer/math-renderer.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.9.11") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals, defussQuery, componentState, bindComponent, mathClone, mathText } = __df$shared;
var df$ = defussGlobals();
var dfDollar = defussQuery();
var mathRendererStates = ["default", "rendered", "highlighted", "error"];
var KATEX_URL = "https://cdn.jsdelivr.net/npm/katex@0.19.0/dist/katex.mjs";
var KATEX_CSS_URL = "https://cdn.jsdelivr.net/npm/katex@0.19.0/dist/katex.min.css";
var katexPromise = null;
var katexLoaded = "";
var sheets = new Map;
var LOAD_MS = 15000;
var metaContent = (name) => (dfDollar(`meta[name="${name}"]`).get(0) ?? null)?.content ?? "";
function sheet(url) {
  const known = sheets.get(url);
  if (known)
    return known;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  link.dataset.mathRenderer = "";
  const pending = new Promise((resolve, reject) => {
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`the KaTeX stylesheet could not be loaded from ${url}`));
  });
  pending.catch(() => {
    if (sheets.get(url) === pending)
      sheets.delete(url);
    link.remove();
  });
  sheets.set(url, pending);
  dfDollar(document.head).append(link);
  return pending;
}
function load(url, css) {
  const katexUrl = url || metaContent("math-renderer-module") || KATEX_URL;
  const cssUrl = css || metaContent("math-renderer-css") || KATEX_CSS_URL;
  if (!katexPromise || katexUrl !== katexLoaded) {
    katexLoaded = katexUrl;
    const pending = Promise.resolve().then(() => import(/* @vite-ignore */ katexUrl)).then((m) => m.default ?? m);
    pending.catch(() => {
      if (katexPromise === pending)
        katexPromise = null;
    });
    katexPromise = pending;
  }
  const both = Promise.all([katexPromise, sheet(cssUrl)]).then(([katex]) => katex);
  let timer = 0;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`KaTeX did not load within ${LOAD_MS / 1000} s`)), LOAD_MS);
  });
  return Promise.race([both, deadline]).finally(() => clearTimeout(timer));
}
var NAMED = new Set([
  "alpha",
  "beta",
  "gamma",
  "delta",
  "epsilon",
  "theta",
  "lambda",
  "mu",
  "pi",
  "rho",
  "sigma",
  "tau",
  "phi",
  "omega",
  "infty",
  "sum",
  "prod"
]);
var OPERATORS = {
  "+": ["+", "bin"],
  "-": ["-", "bin"],
  pm: ["\\pm", "bin"],
  times: ["\\times", "bin"],
  "=": ["=", "rel"],
  "<": ["<", "rel"],
  ">": [">", "rel"],
  le: ["\\le", "rel"],
  ge: ["\\ge", "rel"]
};
var DELIMITERS = { parentheses: ["(", ")"], brackets: ["[", "]"], absolute: ["|", "|"] };
var ID = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
function serialize(tree) {
  const ids = new Set;
  const terms = [];
  let nodes = 0;
  const escape = (v) => v.replace(/[\\{}$&#_%^~]/g, (c) => ({ "\\": "\\textbackslash{}", "^": "\\textasciicircum{}", "~": "\\textasciitilde{}" })[c] ?? `\\${c}`);
  const walk = (n, depth) => {
    if (!n || typeof n !== "object" || ++nodes > 2048 || depth > 64)
      throw new Error("the notation is too large or too deep");
    if (n.id !== undefined) {
      if (typeof n.id !== "string" || !ID.test(n.id) || ids.has(n.id))
        throw new Error(`notation id ${JSON.stringify(n.id)}: ids are unique letters, digits, - and _`);
      ids.add(n.id);
      if (n.description !== undefined && (typeof n.description !== "string" || n.description.length > 512))
        throw new Error(`notation id ${n.id}: the description must be text`);
      if (n.semanticId !== undefined && (typeof n.semanticId !== "string" || !ID.test(n.semanticId)))
        throw new Error(`notation id ${n.id}: semanticId must be an id`);
      terms.push({ id: n.id, semanticId: n.semanticId ?? null, description: n.description ?? n.id });
    }
    let pair;
    let atom = null;
    switch (n.kind) {
      case "symbol": {
        if (typeof n.value !== "string" || !(/^[A-Za-z]$/.test(n.value) || NAMED.has(n.value)))
          throw new Error(`symbol ${JSON.stringify(n.value)}: a single Latin letter, a Greek name, infty, sum or prod`);
        const s = n.value.length === 1 ? n.value : `\\${n.value}`;
        pair = [s, s];
        break;
      }
      case "number":
        if (typeof n.value !== "string" || !/^-?\d+(\.\d+)?$/.test(n.value))
          throw new Error(`number ${JSON.stringify(n.value)}`);
        pair = [n.value, n.value];
        break;
      case "text": {
        const s = `\\text{${escape(mathText(n.value))}}`;
        pair = [s, s];
        break;
      }
      case "operator": {
        const op = Object.hasOwn(OPERATORS, n.value) ? OPERATORS[n.value] : null;
        if (!op)
          throw new Error(`operator ${JSON.stringify(n.value)}`);
        pair = [op[0], op[0]];
        atom = op[1];
        break;
      }
      case "sequence": {
        if (!Array.isArray(n.children) || !n.children.length)
          throw new Error("a sequence needs children");
        const xs = n.children.map((c) => walk(c, depth + 1));
        pair = [xs.map((x) => x[0]).join(" "), xs.map((x) => x[1]).join(" ")];
        break;
      }
      case "fraction": {
        const a = walk(n.numerator, depth + 1);
        const b = walk(n.denominator, depth + 1);
        pair = [`\\frac{${a[0]}}{${b[0]}}`, `\\frac{${a[1]}}{${b[1]}}`];
        break;
      }
      case "power":
      case "subscript": {
        const a = walk(n.base, depth + 1);
        const b = walk(n.kind === "power" ? n.exponent : n.subscript, depth + 1);
        const mark = n.kind === "power" ? "^" : "_";
        pair = [`{${a[0]}}${mark}{${b[0]}}`, `{${a[1]}}${mark}{${b[1]}}`];
        break;
      }
      case "root": {
        const a = walk(n.radicand, depth + 1);
        pair = [`\\sqrt{${a[0]}}`, `\\sqrt{${a[1]}}`];
        break;
      }
      case "group": {
        const d = Object.hasOwn(DELIMITERS, n.delimiter) ? DELIMITERS[n.delimiter] : null;
        if (!d)
          throw new Error(`delimiter ${JSON.stringify(n.delimiter)}`);
        const a = walk(n.child, depth + 1);
        pair = [`\\left${d[0]}${a[0]}\\right${d[1]}`, `\\left${d[0]}${a[1]}\\right${d[1]}`];
        break;
      }
      default:
        throw new Error(`notation kind ${JSON.stringify(n.kind)}`);
    }
    if (n.id === undefined)
      return pair;
    const wrapped = `\\htmlData{df-math-id=${n.id}}{${pair[1]}}`;
    return [pair[0], atom === "bin" ? `\\mathbin{${wrapped}}` : atom === "rel" ? `\\mathrel{${wrapped}}` : wrapped];
  };
  const [latex, marked] = walk(mathClone(tree, 262144), 0);
  return { latex: mathText(latex), marked, terms };
}
var serialized = (source) => source.format === "notation" ? serialize(source.tree) : { latex: mathText(source.text), marked: source.text, terms: [] };
var codeOf = (el) => dfDollar(el).children("code.math-renderer-source").get(0) ?? null;
var scriptOf = (el) => dfDollar(el).children("script.math-renderer-notation").get(0) ?? null;
function authoredSource(el) {
  const script = scriptOf(el);
  if (script)
    return { format: "notation", tree: JSON.parse(script.textContent || "null") };
  return { format: "latex", text: codeOf(el)?.textContent ?? "" };
}
function checked(config) {
  const c = mathClone(config);
  const source = c.source;
  if (!source || source.format !== "latex" && source.format !== "notation")
    throw new Error('source must be { format: "latex", text } or { format: "notation", tree }');
  const known = new Set(serialized(source).terms.map((t) => t.id));
  const selected = c.selected ?? [];
  if (!Array.isArray(selected) || selected.some((id) => typeof id !== "string" || !known.has(id)))
    throw new Error(`selected: unknown term(s) ${JSON.stringify(selected)}`);
  return {
    source,
    selected: [...new Set(selected)],
    message: typeof c.message === "string" ? c.message.slice(0, 2048) : ""
  };
}
var DEFAULT_ERROR = "This formula could not be rendered.";
var isInline = (el) => el.dataset.variant === "inline";
function applyMarkup(el, name, config) {
  dfDollar(el).attr("data-state", name === "default" ? null : name);
  const source = config.source;
  if (source) {
    const script = scriptOf(el);
    if (source.format === "notation") {
      let same = false;
      try {
        same = !!script && JSON.stringify(JSON.parse(script.textContent || "null")) === JSON.stringify(source.tree);
      } catch {
        same = false;
      }
      if (!same) {
        const code = codeOf(el);
        if (code)
          dfDollar(code).text(serialized(source).latex);
        let node = script;
        if (!node) {
          node = document.createElement("script");
          node.type = "application/json";
          node.className = "math-renderer-notation";
          dfDollar(el).append(node);
        }
        dfDollar(node).text(JSON.stringify(source.tree));
      }
    } else {
      if (script)
        dfDollar(script).remove();
      const code = codeOf(el);
      if (code && code.textContent !== source.text)
        dfDollar(code).text(source.text);
    }
  }
  dfDollar(el).children(".math-renderer-error").remove();
  if (name === "error") {
    const out = dfDollar('<output class="math-renderer-error" role="alert" data-ce-chrome></output>').text(config.message || DEFAULT_ERROR);
    const code = codeOf(el);
    if (code)
      dfDollar(code).after(out);
    else
      dfDollar(el).append(out);
  }
}
function outputOf(el) {
  let out = dfDollar(el).children(".math-renderer-output").get(0) ?? null;
  if (!out) {
    out = document.createElement("span");
    out.className = "math-renderer-output";
    out.setAttribute("data-ce-chrome", "");
    const code = codeOf(el);
    if (code)
      dfDollar(code).after(out);
    else
      dfDollar(el).prepend(out);
  }
  return out;
}
function clearOutput(el) {
  dfDollar(el).children(".math-renderer-output, .math-renderer-terms, .math-renderer-description").remove();
  el._formulaKey = "";
}
function katexOptions(el, terms, marked) {
  const ids = new Set(terms.map((t) => t.id));
  return {
    displayMode: !isInline(el),
    output: "htmlAndMathml",
    throwOnError: true,
    strict: "ignore",
    maxExpand: 256,
    maxSize: 20,
    macros: {},
    trust: marked ? (context) => context.command === "\\htmlData" && Object.keys(context.attributes ?? {}).join() === "data-df-math-id" && ids.has(String(context.attributes["data-df-math-id"])) : false
  };
}
function typeset(el, katex, source) {
  const key = JSON.stringify([source, isInline(el)]);
  if (el._formulaKey === key && dfDollar(el).children(".math-renderer-output").get(0))
    return;
  const s = serialized(source);
  const out = outputOf(el);
  katex.render(source.format === "notation" ? s.marked : s.latex, out, katexOptions(el, s.terms, source.format === "notation"));
  dfDollar(el).children(".math-renderer-terms, .math-renderer-description").remove();
  const named = s.terms.filter((t) => t.description !== t.id);
  if (named.length && !isInline(el)) {
    const group = dfDollar('<div class="math-renderer-terms" role="group" data-ce-chrome></div>').attr("aria-label", `Terms of ${el.getAttribute("aria-label") || "the formula"}`);
    named.forEach((t, i) => group.append(dfDollar('<button type="button" class="math-renderer-term" aria-pressed="false"></button>').attr("data-math-term", t.id).attr("tabindex", i === 0 ? "0" : "-1").text(t.description)));
    dfDollar(out).after(group);
    group.after(dfDollar('<output class="math-renderer-description" data-ce-chrome></output>'));
  }
  el._formulaKey = key;
}
function paint(el, selected) {
  const on = new Set(selected);
  dfDollar(el).find(".math-renderer-output [data-df-math-id]").each((_, n) => {
    dfDollar(n).attr("data-selected", on.has(n.dataset.dfMathId ?? "") ? "" : null);
  });
  dfDollar(el).find(".math-renderer-terms [data-math-term]").each((_, n) => {
    dfDollar(n).attr("aria-pressed", String(on.has(n.dataset.mathTerm ?? "")));
  });
  if (el.id)
    dfDollar(`[data-math-for="${CSS.escape(el.id)}"][data-math-term]`).each((_, n) => {
      const hit = on.has(n.dataset.mathTerm ?? "");
      dfDollar(n).attr("data-selected", hit ? "" : null);
      if (n instanceof HTMLButtonElement)
        dfDollar(n).attr("aria-pressed", String(hit));
    });
  const source = el._formulaConfig?.source;
  const terms = source ? serialized(source).terms.filter((t) => on.has(t.id)) : [];
  dfDollar(el).children(".math-renderer-description").text(terms.map((t) => t.description).join("; "));
}
function fail(el, config, message) {
  clearOutput(el);
  el._formulaConfig = { ...config, message };
  applyMarkup(el, "error", el._formulaConfig);
  dfDollar(el).attr("aria-busy", null);
  el.dataset.stateName = "error";
}
function selectionEvent(el, config) {
  const terms = serialized(config.source).terms.filter((t) => config.selected.includes(t.id));
  el.dispatchEvent(new CustomEvent("math-select", {
    bubbles: true,
    detail: {
      ids: terms.map((t) => t.id),
      semanticIds: terms.flatMap((t) => t.semanticId ? [t.semanticId] : []),
      descriptions: terms.map((t) => t.description)
    }
  }));
}
function triggerStateChange(el, name, input) {
  const previous = el._formulaConfig;
  const config = checked({ source: previous?.source ?? authoredSource(el), ...input });
  const gen = (el._applyGen ?? 0) + 1;
  el._applyGen = gen;
  el._formulaConfig = config;
  const changed = JSON.stringify(previous?.selected ?? []) !== JSON.stringify(config.selected);
  if (name === "default" || name === "error") {
    clearOutput(el);
    applyMarkup(el, name, config);
    dfDollar(el).attr("aria-busy", null);
    if (changed)
      selectionEvent(el, config);
    return;
  }
  const finish = (katex) => {
    if (el._applyGen !== gen)
      return;
    try {
      typeset(el, katex, config.source);
    } catch (err) {
      fail(el, config, err instanceof Error ? err.message : String(err));
      return;
    }
    el._formulaConfig = { ...config, message: "" };
    applyMarkup(el, name, el._formulaConfig);
    dfDollar(el).attr("aria-busy", null);
    paint(el, config.selected);
    if (changed)
      selectionEvent(el, config);
  };
  if (katexReady)
    return finish(katexReady);
  dfDollar(el).attr("data-state", "pending").attr("aria-busy", "true");
  return load().then((katex) => {
    katexReady = katex;
    finish(katex);
  }, (err) => {
    if (el._applyGen === gen)
      fail(el, config, `KaTeX could not be loaded - the TeX source is shown instead. ${err instanceof Error ? err.message : ""}`.trim());
  });
}
var katexReady = null;
var mathRendererApi = componentState({
  component: "math-renderer",
  states: mathRendererStates,
  mergeConfig: true,
  apply: (el, state) => triggerStateChange(el, state.name, state.config),
  read: (el, state) => ({
    name: el.dataset.stateName || state.name,
    config: mathClone({ ...state.config, ...el._formulaConfig })
  }),
  markup: (el, state) => applyMarkup(el, state.name, state.config)
});
var formula = (el) => {
  const node = typeof el === "string" ? dfDollar(el).get(0) : el;
  if (!node?.matches?.(".math-renderer") || !node.api)
    throw new Error("not an initialized .math-renderer");
  return node;
};
function setSource(el, source) {
  const node = formula(el);
  return Promise.resolve(mathRendererApi.setState(node, "rendered", { source, selected: [] }));
}
function select(el, ids) {
  const node = formula(el);
  mathRendererApi.setState(node, ids.length ? "highlighted" : "rendered", { selected: ids });
}
async function exportFormula(el, format = "latex") {
  const node = formula(el);
  const source = node._formulaConfig?.source ?? authoredSource(node);
  const { latex } = serialized(source);
  if (format === "latex")
    return latex;
  const katex = await load();
  const host = document.createElement("span");
  katex.render(latex, host, { ...katexOptions(node, [], false), output: "mathml" });
  const math = dfDollar(host).find("math").get(0);
  return math ? new XMLSerializer().serializeToString(math) : "";
}
df$.mathRendererApi = mathRendererApi;
df$.mathRendererStates = mathRendererStates;
df$.mathRenderer = { load, serialize, setSource, select, export: exportFormula, url: KATEX_URL };
function termTarget(target) {
  if (!(target instanceof Element))
    return null;
  const linked = dfDollar(target).closest("[data-math-for][data-math-term]").get(0);
  if (linked) {
    const el = dfDollar(`#${CSS.escape(linked.dataset.mathFor ?? "")}`).get(0);
    return el?.matches(".math-renderer") && el.api ? { el, id: linked.dataset.mathTerm ?? "" } : null;
  }
  const el = dfDollar(target).closest(".math-renderer").get(0);
  if (!el?.api)
    return null;
  const button = dfDollar(target).closest(".math-renderer-term").get(0);
  if (button)
    return { el, id: button.dataset.mathTerm ?? "" };
  const term = dfDollar(target).closest(".math-renderer-output [data-df-math-id]").get(0);
  return term ? { el, id: term.dataset.dfMathId ?? "" } : null;
}
function bindInteraction() {
  if (document.__mathRendererInit)
    return;
  document.__mathRendererInit = true;
  dfDollar(document).on("click", (e) => {
    const hit = termTarget(e.target);
    if (!hit || !hit.id)
      return;
    const current = hit.el._formulaConfig?.selected ?? [];
    select(hit.el, current.length === 1 && current[0] === hit.id ? [] : [hit.id]);
  });
  dfDollar(document).on("keydown", (e) => {
    const ev = e;
    const button = ev.target instanceof Element ? dfDollar(ev.target).closest(".math-renderer-term").get(0) : undefined;
    if (!button)
      return;
    const el = dfDollar(button).closest(".math-renderer").get(0);
    if (ev.key === "Escape") {
      select(el, []);
      return;
    }
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
    if (!keys.includes(ev.key))
      return;
    ev.preventDefault();
    const buttons = dfDollar(el).find(".math-renderer-term").toArray();
    const i = buttons.indexOf(button);
    const next = ev.key === "Home" ? 0 : ev.key === "End" ? buttons.length - 1 : (i + (ev.key === "ArrowRight" || ev.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
    buttons.forEach((b, j) => dfDollar(b).attr("tabindex", j === next ? "0" : "-1"));
    buttons[next]?.focus();
  });
}
function init() {
  dfDollar(".math-renderer:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    if (!codeOf(el))
      return;
    bindInteraction();
    let config;
    try {
      config = checked({ source: authoredSource(el), selected: [] });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      el._formulaConfig = { source: { format: "latex", text: codeOf(el)?.textContent ?? "" }, selected: [], message };
      bindComponent(el, mathRendererApi, { name: "error", config: el._formulaConfig });
      applyMarkup(el, "error", { message });
      el.dataset.stateName = "error";
      return;
    }
    el._formulaConfig = config;
    bindComponent(el, mathRendererApi, { name: "default", config });
    mathRendererApi.setState(el, "rendered", config);
  });
}
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

// dist/components/math-editor/math-editor.js
var __df$core2 = globalThis.df$;
var __df$shared2 = __df$core2 && __df$core2.shadcn && __df$core2.shadcn.shared;
if (!__df$shared2 || __df$shared2.abi !== "0.9.11") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals2, defussQuery: defussQuery2, componentState: componentState2, bindComponent: bindComponent2, mathText: mathText2 } = __df$shared2;
var df$2 = defussGlobals2();
var dfDollar2 = defussQuery2();
var mathEditorStates = ["default", "readonly", "disabled", "invalid", "keyboard-open"];
var MATHLIVE_URL = "https://cdn.jsdelivr.net/npm/mathlive@0.111.0/mathlive.min.mjs";
var mathlivePromise = null;
var mathliveLoaded = "";
var LOAD_MS2 = 15000;
function load2(url) {
  const mathliveUrl = url || (dfDollar2('meta[name="math-editor-module"]').get(0) ?? null)?.content || MATHLIVE_URL;
  if (!mathlivePromise || mathliveUrl !== mathliveLoaded) {
    mathliveLoaded = mathliveUrl;
    const framed = globalThis.self !== globalThis.top;
    if (framed && !("mathVirtualKeyboard" in globalThis))
      Reflect.defineProperty(globalThis, "mathVirtualKeyboard", {
        value: undefined,
        configurable: true,
        writable: true
      });
    const pending = Promise.resolve().then(() => import(/* @vite-ignore */ mathliveUrl)).then((m) => {
      const vendor = m;
      vendor.MathfieldElement.fontsDirectory = new URL("fonts/", new URL(mathliveUrl, document.baseURI)).href;
      vendor.MathfieldElement.soundsDirectory = null;
      vendor.MathfieldElement.computeEngine = null;
      if (framed)
        vendor.initVirtualKeyboardInCurrentBrowsingContext();
      return vendor;
    });
    pending.catch(() => {
      if (mathlivePromise === pending)
        mathlivePromise = null;
    });
    mathlivePromise = pending;
  }
  let timer = 0;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`MathLive did not load within ${LOAD_MS2 / 1000} s`)), LOAD_MS2);
  });
  return Promise.race([mathlivePromise, deadline]).finally(() => clearTimeout(timer));
}
var sourceOf = (el) => dfDollar2(el).children("textarea.math-editor-source").get(0) ?? null;
var fieldOf = (el) => el.hasAttribute("data-ready") ? dfDollar2(el).children("math-field.math-editor-field").get(0) ?? null : null;
var keyboard = () => Reflect.get(globalThis, "mathVirtualKeyboard") ?? null;
var DEFAULT_INVALID = "Enter a complete formula.";
var INCOMPLETE = "Fill in every placeholder of the formula.";
var SYNTAX = "The formula has a syntax error.";
var EDITABLE = new Set(["default", "invalid", "keyboard-open"]);
function labelOf(el, source) {
  const label = source.id ? dfDollar2(el).find(`label[for="${CSS.escape(source.id)}"]`).get(0) : null;
  return (label?.textContent ?? "").trim() || el.getAttribute("aria-label") || "Formula";
}
function applyMarkup2(el, name, config) {
  dfDollar2(el).attr("data-state", name === "default" ? null : name);
  const source = sourceOf(el);
  if (source)
    dfDollar2(source).attr("readonly", name === "readonly" ? "" : null).attr("disabled", name === "disabled" ? "" : null).attr("aria-invalid", name === "invalid" ? "true" : null);
  dfDollar2(el).find("[data-math-command]").each((_, b) => {
    dfDollar2(b).attr("disabled", EDITABLE.has(name) ? null : "");
  });
  dfDollar2(el).children(".math-editor-message").remove();
  if (name === "invalid") {
    const out = dfDollar2('<output class="math-editor-message" role="alert" data-ce-chrome></output>').text(config.message || DEFAULT_INVALID);
    if (source?.id)
      out.attr("id", `${source.id}-message`);
    if (source)
      dfDollar2(source).after(out);
    else
      dfDollar2(el).append(out);
  }
}
var keyboardOwner = null;
function hostOf(el) {
  let host = dfDollar2(el).children(".math-editor-keyboard").get(0) ?? null;
  if (!host) {
    host = document.createElement("div");
    host.className = "math-editor-keyboard";
    host.setAttribute("data-ce-chrome", "");
    const tools = dfDollar2(el).children(".math-editor-tools").get(0);
    if (tools)
      dfDollar2(tools).before(host);
    else
      dfDollar2(el).append(host);
  }
  return host;
}
function fitHost() {
  const kb = keyboard();
  if (!kb || !keyboardOwner)
    return;
  hostOf(keyboardOwner).style.blockSize = `${Math.ceil(kb.boundingRect.height)}px`;
}
function lease(el) {
  const kb = keyboard();
  if (!kb || !fieldOf(el))
    return;
  const previous = keyboardOwner;
  keyboardOwner = el;
  if (previous && previous !== el) {
    const old = dfDollar2(previous).children(".math-editor-keyboard").get(0);
    if (old)
      old.style.blockSize = "";
    kb.hide({ animate: false });
    if (previous.dataset.stateName === "keyboard-open")
      mathEditorApi.setState(previous, "default");
  }
  if (!document.__mathEditorKeyboardInit) {
    document.__mathEditorKeyboardInit = true;
    kb.addEventListener("geometrychange", fitHost);
  }
  kb.container = hostOf(el);
  kb.show({ animate: false });
  fitHost();
}
function release(el) {
  if (keyboardOwner !== el)
    return;
  keyboardOwner = null;
  hostOf(el).style.blockSize = "";
  const kb = keyboard();
  if (!kb)
    return;
  kb.hide({ animate: false });
  kb.container = document.body;
}
function focusField(field) {
  field.focus();
  if (document.activeElement === field)
    return;
  const sink = dfDollar2(field.shadowRoot).find('[part="keyboard-sink"]').get(0);
  sink?.focus();
}
function validity(el, latex) {
  const source = sourceOf(el);
  const field = fieldOf(el);
  const complete = !/\\placeholder\b/.test(latex);
  const message = !complete ? INCOMPLETE : field?.errors.length ? SYNTAX : "";
  source?.setCustomValidity(message);
  return complete;
}
function edited(el) {
  const field = fieldOf(el);
  const source = sourceOf(el);
  if (!field || !source)
    return;
  const latex = mathText2(field.value);
  source.value = latex;
  const complete = validity(el, latex);
  preview(el, field.getValue("latex-without-placeholders"));
  const name = el.dataset.stateName || "default";
  if (name === "invalid" && source.validity.valid)
    mathEditorApi.setState(el, "default", { latex, message: "" });
  else
    mathEditorApi.commit(el, name, { ...mathEditorApi.getState(el).config, latex });
  el.dispatchEvent(new CustomEvent("math-input", { bubbles: true, detail: { latex, complete } }));
}
function preview(el, latex) {
  const ids = (el.dataset.mathPreview ?? "").split(/\s+/).filter(Boolean);
  const renderer = df$2.mathRenderer;
  for (const id of ids) {
    const target = dfDollar2(`#${CSS.escape(id)}`).get(0);
    if (target?.api && renderer)
      renderer.setSource(target, { format: "latex", text: latex });
  }
}
async function mount(el) {
  const source = sourceOf(el);
  if (!source || dfDollar2(el).children("math-field").get(0))
    return;
  const vendor = await load2();
  if (!el.isConnected || dfDollar2(el).children("math-field").get(0))
    return;
  const field = new vendor.MathfieldElement;
  field.className = "math-editor-field";
  field.setAttribute("data-ce-chrome", "");
  field.setAttribute("aria-label", labelOf(el, source));
  if (source.id)
    field.setAttribute("aria-describedby", `${source.id}-message`);
  const mounted = new Promise((resolve) => field.addEventListener("mount", () => resolve(), { once: true }));
  dfDollar2(source).before(field);
  await mounted;
  if (!el.isConnected)
    return;
  field.mathVirtualKeyboardPolicy = "manual";
  field.menuItems = [];
  field.setValue(source.value, { silenceNotifications: true });
  dfDollar2(field).on("input", () => edited(el));
  dfDollar2(el).attr("data-ready", "");
  const name = el.dataset.stateName || "default";
  field.readOnly = name === "readonly";
  field.disabled = name === "disabled";
  validity(el, source.value);
  if (name === "keyboard-open")
    lease(el);
}
function triggerStateChange2(el, name, config) {
  const source = sourceOf(el);
  const field = fieldOf(el);
  if (typeof config.latex === "string" && source) {
    const latex = mathText2(config.latex);
    if (source.value !== latex)
      source.value = latex;
    if (field && field.value !== latex)
      field.setValue(latex, { silenceNotifications: true });
    validity(el, latex);
  }
  applyMarkup2(el, name, config);
  if (field) {
    field.readOnly = name === "readonly";
    field.disabled = name === "disabled";
    if (name === "invalid")
      field.setAttribute("aria-invalid", "true");
    else
      field.removeAttribute("aria-invalid");
  }
  if (name === "keyboard-open")
    lease(el);
  else
    release(el);
}
var mathEditorApi = componentState2({
  component: "math-editor",
  states: mathEditorStates,
  mergeConfig: true,
  apply: (el, state) => triggerStateChange2(el, state.name, state.config),
  read: (el, state) => ({
    name: el.dataset.stateName || state.name,
    config: { ...state.config, latex: sourceOf(el)?.value ?? "" }
  }),
  markup: (el, state) => {
    applyMarkup2(el, state.name, state.config);
    const source = sourceOf(el);
    const latex = state.config.latex;
    if (source && typeof latex === "string" && source.textContent !== latex)
      dfDollar2(source).text(latex);
  }
});
var editor = (el) => {
  const node = typeof el === "string" ? dfDollar2(el).get(0) : el;
  if (!node?.matches?.(".math-editor") || !node.api)
    throw new Error("not an initialized .math-editor");
  return node;
};
function setValue(el, latex) {
  const node = editor(el);
  const name = node.dataset.stateName || "default";
  mathEditorApi.setState(node, name === "invalid" ? "default" : name, { latex: mathText2(latex), message: "" });
  preview(node, latex);
  node.dispatchEvent(new CustomEvent("math-input", {
    bubbles: true,
    detail: { latex, complete: !/\\placeholder\b/.test(latex) }
  }));
}
var INSERTS = {
  fraction: "\\frac{#@}{#?}",
  power: "#@^{#?}",
  subscript: "#@_{#?}",
  root: "\\sqrt{#@}"
};
function command(el, name) {
  const node = editor(el);
  const field = fieldOf(node);
  const state = node.dataset.stateName || "default";
  if (!field || !EDITABLE.has(state))
    return;
  if (Object.hasOwn(INSERTS, name))
    field.insert(INSERTS[name], { focus: true, selectionMode: "placeholder" });
  else if (name === "undo" || name === "redo")
    field.executeCommand(name);
  else if (name === "keyboard")
    mathEditorApi.setState(node, state === "keyboard-open" ? "default" : "keyboard-open");
  else
    throw new Error(`unknown editor command "${name}" (fraction, power, subscript, root, undo, redo, keyboard)`);
  focusField(field);
  if (name !== "keyboard")
    edited(node);
}
function validate(el) {
  const node = editor(el);
  return sourceOf(node)?.checkValidity() ?? true;
}
df$2.mathEditorApi = mathEditorApi;
df$2.mathEditorStates = mathEditorStates;
df$2.mathEditor = { load: load2, setValue, command, validate, url: MATHLIVE_URL };
function bindDocument() {
  if (document.__mathEditorInit)
    return;
  document.__mathEditorInit = true;
  dfDollar2(document).on("click", (e) => {
    const button = e.target instanceof Element ? dfDollar2(e.target).closest("[data-math-command]").get(0) : undefined;
    const el = button ? dfDollar2(button).closest(".math-editor").get(0) : undefined;
    if (button && el?.api)
      command(el, button.dataset.mathCommand ?? "");
  });
  document.addEventListener("invalid", (e) => {
    const source = e.target instanceof HTMLTextAreaElement && e.target.matches(".math-editor > textarea.math-editor-source") ? e.target : null;
    const el = source?.parentElement;
    if (!source || !el?.api)
      return;
    e.preventDefault();
    mathEditorApi.setState(el, "invalid", { message: source.validationMessage || DEFAULT_INVALID });
    const field = fieldOf(el);
    if (!field)
      return;
    focusField(field);
    if (/\\placeholder\b/.test(field.value)) {
      field.position = 0;
      field.executeCommand("moveToNextPlaceholder");
    }
  }, true);
  document.addEventListener("reset", (e) => {
    const form = e.target instanceof HTMLFormElement ? e.target : null;
    if (!form)
      return;
    setTimeout(() => {
      dfDollar2(form).find(".math-editor").toArray().forEach((el) => {
        const source = sourceOf(el);
        const field = fieldOf(el);
        if (!source || !el.api)
          return;
        const name = el.dataset.stateName || "default";
        mathEditorApi.setState(el, name === "invalid" || name === "keyboard-open" ? "default" : name, {
          latex: source.value,
          message: ""
        });
        field?.resetUndo();
        preview(el, source.value);
      });
    });
  });
}
function init2() {
  if (keyboardOwner && !keyboardOwner.isConnected)
    release(keyboardOwner);
  dfDollar2(".math-editor:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    const source = sourceOf(el);
    if (!source)
      return;
    bindDocument();
    const name = source.disabled ? "disabled" : source.readOnly ? "readonly" : "default";
    bindComponent2(el, mathEditorApi, { name, config: { latex: source.value, message: "" } });
    mathEditorApi.setState(el, name, { latex: source.value, message: "" });
    mount(el).catch((err) => {
      dfDollar2(el).attr("data-error", err instanceof Error ? err.message : String(err));
    });
  });
}
init2();
new MutationObserver(init2).observe(document, { childList: true, subtree: true });

// dist/components/math-compute/math-compute.js
var __df$core3 = globalThis.df$;
var __df$shared3 = __df$core3 && __df$core3.shadcn && __df$core3.shadcn.shared;
if (!__df$shared3 || __df$shared3.abi !== "0.9.11") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals3, defussQuery: defussQuery3, componentState: componentState3, bindComponent: bindComponent3, mathClone: mathClone2, mathText: mathText3 } = __df$shared3;
var df$3 = defussGlobals3();
var dfDollar3 = defussQuery3();
var mathComputeStates = ["default", "computing", "result", "explaining", "unsupported", "error"];
var COMPUTE_ENGINE_URL = "https://cdn.jsdelivr.net/npm/@cortex-js/compute-engine@0.149.0/dist/esm-min/compute-engine.js";
var OPERATIONS = [
  "inspect",
  "canonicalize",
  "simplify",
  "evaluate",
  "approximate",
  "compare",
  "solve",
  "differentiate"
];
var DEFAULT_CONTEXT = { domain: "real", variables: {}, assumptions: [], precision: 34 };
var LOAD_MS3 = 30000;
function computeWorker(scope) {
  let engine = null;
  let engineLoaded = "";
  const json = (v) => JSON.parse(JSON.stringify(v));
  const expr = (e) => ({ latex: String(e.latex), json: json(e.json) });
  const bytes = (s) => new TextEncoder().encode(s).length;
  const SAFE = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
  const PREDICATES = ["Equal", "NotEqual", "Greater", "GreaterEqual", "Less", "LessEqual", "Element"];
  const ledger = (raw, real) => {
    const predicates = [];
    let complete = real;
    let nodes = 0;
    const add = (p) => {
      if (!predicates.some((x) => JSON.stringify(x) === JSON.stringify(p)))
        predicates.push(p);
    };
    const ARITY = {
      Divide: 2,
      Rational: 2,
      Subtract: 2,
      Negate: 1,
      Square: 1,
      Sqrt: 1,
      Abs: 1,
      Power: 2,
      Equal: 2,
      NotEqual: 2,
      Less: 2,
      LessEqual: 2,
      Greater: 2,
      GreaterEqual: 2,
      Delimiter: 1
    };
    const walk = (v, depth) => {
      if (++nodes > 1e4 || depth > 96)
        throw new Error("The expression exceeds the structural limits.");
      if (typeof v === "number")
        return;
      if (typeof v === "string") {
        if (!SAFE.test(v) || ["NaN", "Undefined", "ComplexInfinity", "Infinity", "NegativeInfinity", "ImaginaryUnit"].includes(v))
          complete = false;
        return;
      }
      if (!Array.isArray(v) || typeof v[0] !== "string") {
        complete = false;
        return;
      }
      const [op, ...args] = v;
      const variadic = op === "Add" || op === "Multiply" || op === "InvisibleOperator";
      if (!(variadic ? args.length > 0 : ARITY[op] === args.length))
        complete = false;
      if ((op === "Divide" || op === "Rational") && args.length === 2)
        add(["NotEqual", args[1], 0]);
      if (op === "Sqrt" && real && args.length === 1)
        add(["GreaterEqual", args[0], 0]);
      if (op === "Power" && args.length === 2) {
        if (typeof args[1] === "number" && Number.isInteger(args[1])) {
          if (args[1] <= 0)
            add(["NotEqual", args[0], 0]);
        } else
          complete = false;
      }
      args.forEach((a) => walk(a, depth + 1));
    };
    walk(raw, 0);
    return { predicates: predicates.filter((p) => typeof p[1] !== "number"), complete };
  };
  const truth = (ce, p, variable, value) => {
    const r = ce.box(p, { form: "raw" }).subs({ [variable]: value }).evaluate().json;
    return r === "True" ? true : r === "False" ? false : undefined;
  };
  const RELATIONS = {
    "solve.square-both-sides": "implies",
    "solve.quadratic-formula": "candidate",
    "solve.validate-roots": "check"
  };
  const calculate = (job, Engine, version) => {
    const c = job.context;
    if (bytes(job.latex) > 65536 || bytes(job.right) > 65536)
      throw new Error("The input exceeds 65,536 bytes.");
    const ce = new Engine({ precision: c.precision });
    for (const [name, type] of Object.entries(c.variables))
      ce.declare(name, type);
    const fromJson = job.mathJson !== null && job.mathJson !== undefined;
    const parseRaw = () => fromJson ? ce.box(job.mathJson, { form: "raw" }) : ce.parse(job.latex, { form: "raw" });
    let raw = parseRaw();
    if (!raw.isValid)
      throw new Error("The expression is invalid or incomplete.");
    for (const name of raw.unknowns)
      if (!(name in c.variables) && SAFE.test(name))
        ce.declare(name, c.domain);
    for (const a of c.assumptions) {
      if (!Array.isArray(a) || !PREDICATES.includes(String(a[0])))
        throw new Error("An assumption must be a comparison or a membership predicate.");
      const status = ce.assume(ce.box(a, { form: "raw" }));
      if (status === "contradiction")
        throw new Error("The assumptions contradict each other.");
      if (status !== "ok" && status !== "tautology")
        throw new Error(`Unsupported: the engine cannot assume ${JSON.stringify(a)} (${status}).`);
    }
    raw = parseRaw();
    const rawJson = json(raw.json);
    const real = c.domain === "real" && !Object.values(c.variables).includes("complex");
    const L = ledger(rawJson, real);
    const conditions = [
      ...L.predicates.map((p, i) => ({
        id: `input-${i}`,
        latex: ce.box(p, { form: "raw" }).latex,
        json: p,
        origin: "input"
      })),
      ...c.assumptions.map((p, i) => ({
        id: `assumption-${i}`,
        latex: ce.box(p, { form: "raw" }).latex,
        json: json(p),
        origin: "assumption"
      }))
    ];
    const input = fromJson ? ce.box(job.mathJson) : ce.parse(job.latex);
    if (!input.isValid)
      throw new Error("The expression is invalid or incomplete.");
    const notices = [];
    const out = {
      schemaVersion: 1,
      engine: version,
      operation: job.operation,
      input: { latex: fromJson ? String(raw.latex) : job.latex, json: rawJson },
      canonical: expr(input),
      result: expr(input),
      comparison: null,
      conditions,
      coverage: L.complete ? "complete" : "partial",
      steps: [],
      candidates: [],
      notices
    };
    if (JSON.stringify(rawJson) !== JSON.stringify(out.canonical.json))
      notices.push("The engine put the input into its canonical form before any step - that rewrite is not traced.");
    if (!L.complete)
      notices.push("The conditions are complete only for real arithmetic, integer powers and square roots - this input may need more.");
    const native = job.operation === "simplify" ? "simplify" : job.operation === "solve" ? "solve" : job.operation === "differentiate" ? "D" : null;
    const trace = native ? input.explain(native, { variable: job.variable, order: job.order }) : null;
    switch (job.operation) {
      case "inspect":
        out.result = expr(raw);
        break;
      case "canonicalize":
        break;
      case "simplify":
        out.result = expr(trace ? trace.result : input.simplify());
        break;
      case "evaluate":
        out.result = expr(input.evaluate());
        break;
      case "approximate":
        out.result = expr(input.N());
        notices.push(`A numerical approximation to ${c.precision} significant digits - not an exact value.`);
        break;
      case "differentiate":
        out.result = expr(trace.result);
        break;
      case "compare": {
        const right = ce.parse(job.right);
        const rightRaw = ce.parse(job.right, { form: "raw" });
        if (!right.isValid)
          throw new Error("The other side is invalid or incomplete.");
        const R = ledger(json(rightRaw.json), real);
        for (const p of R.predicates)
          if (!conditions.some((x) => JSON.stringify(x.json) === JSON.stringify(p)))
            conditions.push({
              id: `input-${conditions.length}`,
              latex: ce.box(p, { form: "raw" }).latex,
              json: p,
              origin: "input"
            });
        if (!R.complete)
          out.coverage = "partial";
        const answer = job.comparison === "structural" ? raw.isSame(rightRaw) : job.comparison === "identity" ? input.isIdenticallyEqual(right) : input.isEqual(right);
        out.comparison = answer === true ? "true" : answer === false ? "false" : "unknown";
        out.result = expr(right);
        if (out.comparison === "unknown")
          notices.push("The engine could not decide this comparison - unknown is its answer, not false.");
        break;
      }
      case "solve": {
        const roots = input.solve(job.variable);
        if (!Array.isArray(roots))
          throw new Error("Unsupported: the engine returned no solution list for this equation (one equation, one variable).");
        const all = [...roots];
        const collect = (v) => {
          if (!Array.isArray(v))
            return;
          if (v[0] === "Equal" && v[1] === job.variable && v.length === 3) {
            const root = ce.box(v[2]);
            if (!all.some((r) => r.isSame(root)))
              all.push(root);
          } else if (v[0] === "List" || v[0] === "Or" || v[0] === "And")
            v.slice(1).forEach(collect);
        };
        for (const step of trace?.steps ?? [])
          if (/^solve\.(quadratic-formula|validate-roots|roots)$/.test(step.id))
            collect(json(step.value.json));
        const equation = Array.isArray(rawJson) && rawJson[0] === "Equal" ? rawJson : ["Equal", rawJson, 0];
        let approximate = false;
        for (const root of all.slice(0, 64)) {
          if (root.isExact === false) {
            approximate = true;
            out.candidates.push({ value: expr(root), status: "unknown" });
            continue;
          }
          const checks = [
            ...conditions.map((x) => truth(ce, x.json, job.variable, root)),
            truth(ce, equation, job.variable, root)
          ];
          const status = checks.includes(false) ? "rejected" : checks.every((x) => x === true) ? "accepted" : "unknown";
          out.candidates.push({ value: expr(root), status });
        }
        out.result = expr(ce.box(["List", ...out.candidates.filter((x) => x.status === "accepted").map((x) => x.value.json)]));
        if (approximate)
          notices.push("A numerical root cannot be checked exactly - it is listed as undecided.");
        notices.push("Each candidate was substituted into the original equation; the engine does not certify that no solution is missing.");
        break;
      }
    }
    if (trace) {
      let before = expr(trace.initial);
      for (const step of trace.steps.slice(0, 128)) {
        const after = expr(step.value);
        out.steps.push({
          before,
          after,
          rule: String(step.id),
          description: String(step.description),
          relation: RELATIONS[step.id] ?? "transform"
        });
        before = after;
      }
      if (trace.steps.length > 128)
        notices.push("The explanation was cut after 128 steps.");
      if (!trace.steps.length)
        notices.push("The engine reported no steps - the canonical form already was the result.");
    } else if (job.operation !== "inspect" && job.operation !== "canonicalize")
      notices.push("The engine explains simplify, solve and differentiate - this operation has no steps.");
    notices.push("The steps are the engine's own report, not a proof.");
    if (bytes(JSON.stringify(out)) > 2097152)
      throw new Error("The result exceeds 2 MiB.");
    return out;
  };
  scope.addEventListener("message", async (event) => {
    const { id, url, job } = event.data;
    try {
      if (!engine || url !== engineLoaded) {
        engineLoaded = url;
        const engineUrl = url;
        engine = import(/* @vite-ignore */ engineUrl);
        engine.catch(() => {
          engine = null;
        });
      }
      const m = await engine;
      scope.postMessage({ id, phase: "loaded" });
      scope.postMessage({ id, status: "ok", result: calculate(job, m.ComputeEngine, String(m.version ?? "unknown")) });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      scope.postMessage({
        id,
        status: message.startsWith("Unsupported:") ? "unsupported" : "error",
        message: message.replace(/^Unsupported:\s*/, "")
      });
    }
  });
}
var workerUrl = "";
function startWorker() {
  workerUrl ||= URL.createObjectURL(new Blob([`(${computeWorker.toString()})(self);`], { type: "text/javascript" }));
  return new Worker(workerUrl, { name: "defuss-math-compute" });
}
var engineOverride = "";
function engine(url) {
  if (url)
    engineOverride = new URL(url, document.baseURI).href;
  const meta = (dfDollar3('meta[name="math-compute-engine"]').get(0) ?? null)?.content;
  return engineOverride || (meta ? new URL(meta, document.baseURI).href : COMPUTE_ENGINE_URL);
}
var sourceOf2 = (el) => dfDollar3(el).find("textarea.math-compute-source").get(0) ?? null;
var operationOf = (el) => dfDollar3(el).find("select[data-math-operation]").get(0) ?? null;
var rightOf = (el) => dfDollar3(el).find("[data-math-right]").get(0) ?? null;
function checked2(config) {
  const c = mathClone2(config);
  const context = mathClone2(c.context ?? DEFAULT_CONTEXT);
  if (!["real", "complex"].includes(context.domain) || !Number.isInteger(context.precision) || context.precision < 15 || context.precision > 100 || !context.variables || typeof context.variables !== "object" || Array.isArray(context.variables) || !Array.isArray(context.assumptions) || context.assumptions.length > 64 || Object.entries(context.variables).some(([n, t]) => !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(n) || !["real", "complex", "integer"].includes(t)))
    throw new Error('context: { domain: "real" | "complex", variables: { name: "real" | "complex" | "integer" }, assumptions: MathJSON[], precision: 15..100 }');
  const operation = c.operation ?? "simplify";
  if (!OPERATIONS.includes(operation))
    throw new Error(`operation "${operation}" (${OPERATIONS.join(", ")})`);
  const comparison = c.comparison ?? "identity";
  if (!["identity", "value", "structural"].includes(comparison))
    throw new Error(`comparison "${comparison}" (identity, value, structural)`);
  const variable = c.variable ?? "x";
  if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(variable))
    throw new Error(`variable "${variable}"`);
  const order = c.order ?? 1;
  if (!Number.isInteger(order) || order < 1 || order > 4)
    throw new Error("order: 1 to 4");
  const result = c.result ?? null;
  if (result !== null && (result.schemaVersion !== 1 || !Array.isArray(result.steps) || !Array.isArray(result.conditions) || !Array.isArray(result.candidates) || !Array.isArray(result.notices) || typeof result.result?.latex !== "string"))
    throw new Error("result: a math-compute record (schemaVersion 1)");
  const step = c.step ?? -1;
  if (!Number.isInteger(step) || step < -1)
    throw new Error("step: an index from 0 (-1 for none)");
  return {
    latex: mathText3(c.latex ?? ""),
    mathJson: c.mathJson ?? null,
    operation,
    right: mathText3(c.right ?? ""),
    comparison,
    variable,
    order,
    context,
    result,
    step,
    message: typeof c.message === "string" ? c.message.slice(0, 2048) : ""
  };
}
var inputsOf = (c) => JSON.stringify([c.latex, c.mathJson, c.operation, c.right, c.comparison, c.variable, c.order, c.context]);
var STATUS = {
  computing: "Computing ...",
  error: "This could not be computed.",
  unsupported: "This is outside what the engine supports here."
};
function applyMarkup3(el, name) {
  dfDollar3(el).attr("data-state", name === "default" ? null : name).attr("aria-busy", name === "computing" ? "true" : null);
  dfDollar3(el).find("[data-math-run]").attr("disabled", name === "computing" ? "" : null);
  dfDollar3(el).find("[data-math-cancel]").attr("disabled", name === "computing" ? null : "");
  if (!dfDollar3(el).children(".math-compute-status").get(0))
    dfDollar3(el).append(dfDollar3('<output class="math-compute-status" role="status" data-ce-chrome></output>'));
}
function announce(el, name, config) {
  const text = name === "computing" ? STATUS.computing : name === "error" || name === "unsupported" ? config.message || STATUS[name] : "";
  dfDollar3(el).children(".math-compute-status").text(text);
}
function formulaNode(latex, label, inline = false) {
  const node = dfDollar3(inline ? '<span class="math-renderer" data-variant="inline"></span>' : '<figure class="math-renderer"></figure>').attr("aria-label", label);
  node.append(dfDollar3('<code class="math-renderer-source"></code>').text(latex));
  if (!inline)
    node.append(dfDollar3("<figcaption></figcaption>").text(label));
  return node;
}
var RELATION_TEXT = {
  transform: "rewritten by the engine",
  implies: "implies - may add solutions, every candidate is checked",
  candidate: "candidates",
  check: "checked in the original equation"
};
var CANDIDATE = {
  accepted: ["accepted", "default"],
  rejected: ["rejected", "destructive"],
  unknown: ["undecided", "outline"]
};
function paint2(el, name, c) {
  let view = dfDollar3(el).children(".math-compute-view").get(0) ?? null;
  const r = c.result;
  if (!r || name !== "result" && name !== "explaining") {
    if (view)
      dfDollar3(view).remove();
    el._computeView = "";
    return;
  }
  const key = JSON.stringify([r, name, c.step]);
  if (view && el._computeView === key)
    return;
  if (!view) {
    view = dfDollar3('<div class="math-compute-view" data-ce-chrome></div>').get(0);
    const status = dfDollar3(el).children(".math-compute-status").get(0);
    if (status)
      dfDollar3(status).before(view);
    else
      dfDollar3(el).append(view);
  }
  dfDollar3(view).empty();
  const step = name === "explaining" ? r.steps[c.step] : null;
  const pair = dfDollar3('<div class="math-compute-pair"></div>');
  if (step) {
    pair.append(formulaNode(step.before.latex, `Before step ${c.step + 1}`)).append(formulaNode(step.after.latex, `After step ${c.step + 1}`));
  } else {
    pair.append(formulaNode(r.input.latex, "Input"));
    const label = r.operation === "solve" ? "Solutions" : r.operation === "compare" ? "Compared with" : `Result (${r.operation})`;
    pair.append(formulaNode(r.result.latex, label));
  }
  dfDollar3(view).append(pair);
  if (step) {
    const what = dfDollar3('<p class="math-compute-explanation"></p>');
    what.append(dfDollar3("<b></b>").text(`Step ${c.step + 1} of ${r.steps.length}: `));
    what.append(dfDollar3("<span></span>").text(step.description));
    what.append(dfDollar3('<span class="math-compute-rule"></span>').text(` ${step.rule} - ${RELATION_TEXT[step.relation] ?? step.relation}`));
    dfDollar3(view).append(what);
  } else if (r.comparison) {
    const verdict = r.comparison === "true" ? "equal" : r.comparison === "false" ? "not equal" : "unknown";
    const p = dfDollar3('<p class="math-compute-verdict"></p>').text("The engine says: ");
    p.append(dfDollar3('<span class="badge"></span>').attr("data-variant", r.comparison === "true" ? "default" : r.comparison === "false" ? "destructive" : "outline").text(verdict));
    dfDollar3(view).append(p);
  }
  const conditions = dfDollar3('<section class="math-compute-conditions"></section>');
  conditions.append(dfDollar3("<h4></h4>").text("Holds where"));
  if (r.conditions.length) {
    const list = dfDollar3("<ul></ul>");
    for (const k of r.conditions) {
      const li = dfDollar3("<li></li>").append(formulaNode(k.latex, k.origin === "assumption" ? "Assumed" : "Required by the input", true));
      li.append(dfDollar3('<span class="math-compute-origin"></span>').text(k.origin === "assumption" ? " assumed" : " required by the input"));
      list.append(li);
    }
    conditions.append(list);
  } else
    conditions.append(dfDollar3("<p></p>").text("No condition - the input is defined everywhere."));
  conditions.append(dfDollar3('<p class="math-compute-coverage"></p>').text(r.coverage === "complete" ? "Conditions: complete for real arithmetic." : "Conditions: partial - this input may need more."));
  dfDollar3(view).append(conditions);
  if (r.candidates.length) {
    const list = dfDollar3('<ul class="math-compute-candidates"></ul>');
    for (const k of r.candidates) {
      const [text, variant] = CANDIDATE[k.status] ?? CANDIDATE.unknown;
      const li = dfDollar3("<li></li>").append(formulaNode(`${c.variable} = ${k.value.latex}`, `Candidate ${k.value.latex}`, true));
      li.append(dfDollar3('<span class="badge"></span>').attr("data-variant", variant).text(text));
      list.append(li);
    }
    dfDollar3(view).append(dfDollar3('<section class="math-compute-candidates-box"></section>').append(dfDollar3("<h4></h4>").text("Candidates")).append(list));
  }
  if (r.steps.length) {
    const nav = dfDollar3('<nav class="math-compute-steps"></nav>').attr("aria-label", "Steps");
    const list = dfDollar3("<ol></ol>");
    r.steps.forEach((s, i) => {
      const button = dfDollar3('<button type="button" class="math-compute-step"></button>').attr("data-math-step", String(i)).text(s.description);
      if (step && i === c.step)
        button.attr("aria-current", "step");
      list.append(dfDollar3("<li></li>").append(button));
    });
    nav.append(list);
    const tools = dfDollar3('<div class="math-compute-step-tools"></div>');
    tools.append(dfDollar3('<button type="button" class="btn" data-variant="outline" data-size="sm" data-math-step-prev>Previous</button>').attr("disabled", step ? null : ""));
    tools.append(dfDollar3('<button type="button" class="btn" data-variant="outline" data-size="sm" data-math-step-next>Next</button>').attr("disabled", step && c.step >= r.steps.length - 1 ? "" : null));
    if (step)
      tools.append(dfDollar3('<button type="button" class="btn" data-variant="ghost" data-size="sm" data-math-step-result>Result</button>'));
    nav.append(tools);
    dfDollar3(view).append(nav);
  }
  if (r.notices.length) {
    const list = dfDollar3('<ul class="math-compute-notices"></ul>');
    for (const n of r.notices)
      list.append(dfDollar3("<li></li>").text(n));
    dfDollar3(view).append(list);
  }
  if (el._computeRecorded === JSON.stringify(r))
    dfDollar3(view).append(dfDollar3('<p class="math-compute-recorded"></p>').text(`Recorded with Compute Engine ${r.engine} - not computed on this page. Compute runs it again.`));
  const record = dfDollar3('<details class="math-compute-record"></details>');
  record.append(dfDollar3("<summary></summary>").text("The record (JSON)"));
  record.append(dfDollar3("<pre></pre>").text(JSON.stringify(r, null, 2)));
  dfDollar3(view).append(record);
  el._computeView = key;
}
var workers = new Set;
function stop(el) {
  el._computeCancel?.();
}
function start(el, c) {
  stop(el);
  const timeout = Math.min(60000, Math.max(100, Number(el.dataset.timeout) || 5000));
  const id = (el._computeJob ?? 0) + 1;
  el._computeJob = id;
  let worker;
  try {
    worker = el._computeWorker ?? startWorker();
  } catch (err) {
    return Promise.resolve(land(el, "error", { message: `The compute worker could not start: ${err instanceof Error ? err.message : String(err)}` }, "error"));
  }
  el._computeWorker = worker;
  workers.add(el);
  return new Promise((resolve) => {
    let timer = 0;
    const finish = (name, patch, status) => {
      clearTimeout(timer);
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      el._computeCancel = undefined;
      if (el._computeJob === id)
        land(el, name, patch, status);
      resolve();
    };
    const kill = () => {
      worker.terminate();
      if (el._computeWorker === worker)
        el._computeWorker = undefined;
    };
    const onMessage = (e) => {
      const d = e.data;
      if (d.id !== id)
        return;
      if (d.phase === "loaded") {
        clearTimeout(timer);
        timer = setTimeout(() => {
          kill();
          finish("error", { message: `The computation took longer than ${timeout / 1000} s and was stopped.` }, "error");
        }, timeout);
        return;
      }
      if (d.status === "ok" && d.result)
        finish("result", { result: mathClone2(d.result), step: -1, message: "" }, "ok");
      else
        finish(d.status === "unsupported" ? "unsupported" : "error", { message: d.message || "" }, d.status === "unsupported" ? "unsupported" : "error");
    };
    const onError = (e) => {
      e.preventDefault();
      kill();
      finish("error", { message: e.message || "The compute worker failed." }, "error");
    };
    el._computeCancel = () => {
      kill();
      finish("default", { message: "" }, "cancelled");
    };
    timer = setTimeout(() => {
      kill();
      finish("error", { message: `The Compute Engine did not load within ${LOAD_MS3 / 1000} s.` }, "error");
    }, LOAD_MS3);
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    const job = {
      latex: c.latex,
      mathJson: c.mathJson,
      operation: c.operation,
      right: c.right,
      comparison: c.comparison,
      variable: c.variable,
      order: c.order,
      context: c.context
    };
    worker.postMessage({ id, url: engine(), job });
  });
}
function land(el, name, patch, status) {
  mathComputeApi.setState(el, name, patch);
  const result = status === "ok" ? el._computeConfig?.result ?? null : null;
  el.dispatchEvent(new CustomEvent("math-result", {
    bubbles: true,
    detail: { status, result: result ? mathClone2(result) : null, message: patch.message ?? "" }
  }));
}
function triggerStateChange3(el, name, input, incoming) {
  const previous = el._computeConfig;
  let c = checked2(input);
  if (previous && inputsOf(previous) !== inputsOf(c) && !Object.hasOwn(incoming, "result"))
    c = { ...c, result: null, step: -1 };
  if (name !== "computing")
    stop(el);
  let landed = name;
  if ((name === "result" || name === "explaining") && !c.result)
    landed = "default";
  else if (name === "explaining" && c.result && !c.result.steps.length)
    landed = "result";
  if (landed === "explaining" && c.result)
    c = { ...c, step: Math.min(Math.max(c.step, 0), c.result.steps.length - 1) };
  if (landed === "result")
    c = { ...c, step: -1 };
  if (landed !== name)
    el.dataset.stateName = landed;
  el._computeConfig = c;
  const source = sourceOf2(el);
  if (source && c.mathJson === null && source.value !== c.latex)
    source.value = c.latex;
  const operation = operationOf(el);
  if (operation && operation.value !== c.operation)
    operation.value = c.operation;
  const right = rightOf(el);
  if (right && right.value !== c.right)
    right.value = c.right;
  applyMarkup3(el, landed);
  announce(el, landed, c);
  paint2(el, landed, c);
  if (landed === "computing")
    return start(el, c);
}
var mathComputeApi = componentState3({
  component: "math-compute",
  states: mathComputeStates,
  mergeConfig: true,
  apply: (el, state, _previous, incoming) => triggerStateChange3(el, state.name, state.config, incoming),
  read: (el, state) => ({
    name: el.dataset.stateName || state.name,
    config: mathClone2({ ...state.config, ...el._computeConfig })
  }),
  markup: (el, state) => {
    const node = el;
    const config = state.config;
    applyMarkup3(node, state.name);
    const source = sourceOf2(node);
    if (source && typeof config.latex === "string" && (config.mathJson ?? null) === null && source.textContent !== config.latex)
      dfDollar3(source).text(config.latex);
    const operation = operationOf(node);
    if (operation && config.operation && operation.value !== config.operation)
      dfDollar3(operation).find("option").each((_, o) => {
        dfDollar3(o).attr("selected", o.value === config.operation ? "" : null);
      });
  }
});
var panel = (el) => {
  const node = typeof el === "string" ? dfDollar3(el).get(0) : el;
  if (!node?.matches?.(".math-compute") || !node.api)
    throw new Error("not an initialized .math-compute");
  return node;
};
function run(el, patch = {}) {
  const node = panel(el);
  return Promise.resolve(mathComputeApi.setState(node, "computing", patch));
}
function cancel(el) {
  stop(panel(el));
}
function go(el, step) {
  const node = panel(el);
  mathComputeApi.setState(node, step < 0 ? "result" : "explaining", { step: Math.max(-1, Math.trunc(step)) });
}
function next(el) {
  const node = panel(el);
  const c = node._computeConfig;
  if (c?.result?.steps.length)
    go(node, Math.min((node.dataset.stateName === "explaining" ? c.step : -1) + 1, c.result.steps.length - 1));
}
function prev(el) {
  const node = panel(el);
  const c = node._computeConfig;
  if (c && node.dataset.stateName === "explaining")
    go(node, c.step - 1);
}
function exportResult(el) {
  const r = panel(el)._computeConfig?.result;
  return r ? JSON.stringify(r) : null;
}
df$3.mathComputeApi = mathComputeApi;
df$3.mathComputeStates = mathComputeStates;
df$3.mathCompute = { run, cancel, go, next, prev, export: exportResult, engine, url: COMPUTE_ENGINE_URL };
function bindDocument2() {
  if (document.__mathComputeInit)
    return;
  document.__mathComputeInit = true;
  dfDollar3(document).on("click", (e) => {
    const button = e.target instanceof Element ? dfDollar3(e.target).closest("button").get(0) : undefined;
    const el = button ? dfDollar3(button).closest(".math-compute").get(0) : undefined;
    if (!button || !el?.api || button.disabled)
      return;
    if (button.hasAttribute("data-math-run"))
      run(el);
    else if (button.hasAttribute("data-math-cancel"))
      cancel(el);
    else if (button.hasAttribute("data-math-step"))
      go(el, Number(button.dataset.mathStep));
    else if (button.hasAttribute("data-math-step-next"))
      next(el);
    else if (button.hasAttribute("data-math-step-prev"))
      prev(el);
    else if (button.hasAttribute("data-math-step-result"))
      go(el, -1);
  });
  dfDollar3(document).on("input", (e) => {
    const t = e.target instanceof Element ? e.target : null;
    const el = t ? dfDollar3(t).closest(".math-compute").get(0) : undefined;
    if (!t || !el?.api)
      return;
    if (t.matches("textarea.math-compute-source"))
      mathComputeApi.setState(el, "default", {
        latex: t.value,
        mathJson: null,
        message: ""
      });
    else if (t.matches("select[data-math-operation]"))
      mathComputeApi.setState(el, "default", {
        operation: t.value,
        message: ""
      });
    else if (t.matches("[data-math-right]"))
      mathComputeApi.setState(el, "default", { right: t.value, message: "" });
  });
}
function init3() {
  dfDollar3(".math-compute:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    bindDocument2();
    let authored = {};
    let problem = "";
    const script = dfDollar3(el).children("script.math-compute-config").get(0);
    try {
      if (script)
        authored = JSON.parse(script.textContent || "{}");
    } catch (err) {
      problem = `script.math-compute-config: ${err instanceof Error ? err.message : String(err)}`;
    }
    const base = {
      latex: sourceOf2(el)?.value ?? "",
      operation: operationOf(el)?.value || "simplify",
      right: rightOf(el)?.value ?? ""
    };
    let config;
    try {
      config = checked2({ ...base, ...authored });
    } catch (err) {
      problem ||= err instanceof Error ? err.message : String(err);
      config = checked2(base);
    }
    if (config.result)
      el._computeRecorded = JSON.stringify(config.result);
    el._computeConfig = config;
    const name = problem ? "error" : config.result ? config.step >= 0 ? "explaining" : "result" : "default";
    bindComponent3(el, mathComputeApi, { name, config: { ...config, message: problem } });
    mathComputeApi.setState(el, name, { ...config, message: problem });
  });
  for (const el of workers)
    if (!el.isConnected) {
      stop(el);
      el._computeWorker?.terminate();
      el._computeWorker = undefined;
      workers.delete(el);
    }
}
init3();
new MutationObserver(init3).observe(document, { childList: true, subtree: true });

//# debugId=926CC9316822C90D64756E2164756E21
//# sourceMappingURL=math.js.map
