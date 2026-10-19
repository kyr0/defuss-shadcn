// dist/components/mermaid/mermaid.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.9.10") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals, defussQuery, componentState, bindComponent } = __df$shared;
var df$ = defussGlobals();
var dfDollar = defussQuery();
var mermaidStates = ["default", "rendered", "error"];
var MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@12.0.0/dist/mermaid.esm.min.mjs";
var modulePromise = null;
var moduleUrl = "";
function load(url) {
  const vendorUrl = url || (dfDollar('meta[name="mermaid-module"]').get(0) ?? null)?.content || MERMAID_URL;
  if (modulePromise && vendorUrl === moduleUrl)
    return modulePromise;
  moduleUrl = vendorUrl;
  const pending = import(/* @vite-ignore */ vendorUrl).then((m) => m.default ?? m);
  pending.catch(() => {
    if (modulePromise === pending)
      modulePromise = null;
  });
  modulePromise = pending;
  return pending;
}
var probe = null;
function toHex(css) {
  if (!css || css === "none")
    return "";
  probe ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!probe)
    return "";
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = "rgba(1, 2, 3, 0.5)";
  probe.fillStyle = css;
  if (probe.fillStyle === "rgba(1, 2, 3, 0.5)")
    return "";
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
  const hex = (n) => n.toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}${a < 255 ? hex(a) : ""}`;
}
function mermaidTheme(el) {
  const cs = getComputedStyle(el);
  const tok = (name, fallback) => toHex(cs.getPropertyValue(name).trim()) || fallback;
  const background = tok("--background", "#ffffff");
  const foreground = tok("--foreground", "#0a0a0a");
  const card = tok("--card", background);
  const cardFg = tok("--card-foreground", foreground);
  const muted = tok("--muted", "#f5f5f5");
  const mutedFg = tok("--muted-foreground", "#737373");
  const border = tok("--border", "#e5e5e5");
  const primary = tok("--primary", foreground);
  const primaryFg = tok("--primary-foreground", background);
  const secondary = tok("--secondary", muted);
  const accent = tok("--accent", muted);
  const accentFg = tok("--accent-foreground", foreground);
  const destructive = tok("--destructive", "#dc2626");
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(background.slice(i, i + 2), 16));
  const dark = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5;
  return {
    darkMode: dark,
    background,
    fontFamily: cs.fontFamily || "system-ui, sans-serif",
    fontSize: "14px",
    textColor: foreground,
    primaryColor: card,
    primaryTextColor: cardFg,
    primaryBorderColor: mutedFg,
    mainBkg: card,
    nodeBorder: mutedFg,
    nodeTextColor: cardFg,
    secondaryColor: secondary,
    secondaryTextColor: foreground,
    secondaryBorderColor: border,
    tertiaryColor: muted,
    tertiaryTextColor: foreground,
    tertiaryBorderColor: border,
    lineColor: mutedFg,
    defaultLinkColor: mutedFg,
    edgeLabelBackground: background,
    titleColor: foreground,
    clusterBkg: muted,
    clusterBorder: border,
    actorBkg: card,
    actorBorder: mutedFg,
    actorTextColor: cardFg,
    actorLineColor: border,
    signalColor: foreground,
    signalTextColor: foreground,
    labelBoxBkgColor: muted,
    labelBoxBorderColor: border,
    labelTextColor: foreground,
    loopTextColor: foreground,
    activationBkgColor: muted,
    activationBorderColor: mutedFg,
    sequenceNumberColor: primaryFg,
    noteBkgColor: accent,
    noteTextColor: accentFg,
    noteBorderColor: border,
    classText: cardFg,
    labelColor: cardFg,
    altBackground: muted,
    stateBkg: card,
    stateLabelColor: cardFg,
    compositeBackground: muted,
    compositeTitleBackground: muted,
    innerEndBackground: foreground,
    specialStateColor: foreground,
    pie1: primary,
    errorBkgColor: destructive,
    errorTextColor: primaryFg
  };
}
function sourceOf(fig) {
  const pre = dfDollar(fig).find(":scope > pre.mermaid").get(0) ?? null;
  if (!pre)
    return "";
  return Array.from(pre.childNodes).map((n) => n.nodeType === Node.TEXT_NODE ? n.data : n.nodeType === Node.ELEMENT_NODE ? dfDollar("<div></div>").append(n.cloneNode(true)).html() ?? "" : "").join("").replace(/^\n+|\s+$/g, "");
}
function outputOf(fig) {
  let out = dfDollar(fig).find(":scope > .mermaid-output").get(0) ?? null;
  if (!out) {
    out = document.createElement("div");
    out.className = "mermaid-output";
    out.setAttribute("data-ce-chrome", "");
    dfDollar(fig).find(":scope > pre.mermaid").get(0)?.after(out);
  }
  return out;
}
function clearError(fig) {
  dfDollar(fig).find(":scope > .mermaid-error").get(0)?.remove();
}
function showError(fig, message) {
  clearError(fig);
  dfDollar(fig).find(":scope > .mermaid-output").get(0)?.remove();
  const out = document.createElement("output");
  out.className = "mermaid-error";
  out.setAttribute("role", "alert");
  out.setAttribute("data-ce-chrome", "");
  out.textContent = message;
  dfDollar(fig).find(":scope > pre.mermaid").get(0)?.after(out);
  fig.dataset.state = "error";
  fig.dataset.stateName = "error";
}
var seq = 0;
var queue = Promise.resolve();
function renderDiagram(fig) {
  if (fig.dataset.state !== "rendered")
    fig.dataset.state = "pending";
  const job = queue.then(async () => {
    const source = sourceOf(fig);
    if (!fig.isConnected || !source) {
      if (fig.dataset.state === "pending")
        delete fig.dataset.state;
      return false;
    }
    let mermaid;
    try {
      mermaid = await load();
    } catch {
      showError(fig, `Mermaid could not be loaded from ${moduleUrl} - the diagram source is shown instead.`);
      return false;
    }
    const theme = mermaidTheme(fig);
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      suppressErrorRendering: true,
      theme: "base",
      themeVariables: theme
    });
    try {
      const { svg, bindFunctions } = await mermaid.render(`defuss-mermaid-${++seq}`, source);
      if (!fig.isConnected)
        return false;
      clearError(fig);
      const out = outputOf(fig);
      const parsed = new DOMParser().parseFromString(svg, "text/html").body.firstElementChild;
      dfDollar(out).empty();
      if (parsed)
        dfDollar(out).append(document.importNode(parsed, true));
      const el = dfDollar(out).find("svg").get(0);
      const label = fig.getAttribute("aria-label");
      if (el) {
        el.removeAttribute("height");
        el.style.maxWidth = "";
        el.setAttribute("role", "img");
        if (label && !dfDollar(el).find(":scope > title").get(0))
          el.setAttribute("aria-label", label);
      }
      bindFunctions?.(out);
      fig.dataset.state = "rendered";
      fig.dataset.stateName = "rendered";
      fig._mermaidTheme = JSON.stringify(theme);
      return true;
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      showError(fig, `This diagram could not be rendered.
${text.split(`
`).slice(0, 4).join(`
`)}`);
      return false;
    }
  });
  queue = job.catch(() => {
    return;
  });
  return job;
}
function renderAll() {
  return Promise.all([...dfDollar(".mermaid-diagram[data-init]").toArray()].map(renderDiagram));
}
function applyMarkup(fig, stateName, config = {}) {
  dfDollar(fig).children(".mermaid-output, .mermaid-error").remove();
  if (stateName === "default") {
    dfDollar(fig).attr("data-state", null);
    return;
  }
  if (stateName === "rendered") {
    dfDollar(fig).attr("data-state", "rendered");
    return;
  }
  const out = dfDollar('<output class="mermaid-error" role="alert" data-ce-chrome></output>').text(typeof config.message === "string" ? config.message : "This diagram could not be rendered.");
  dfDollar(fig).children("pre.mermaid").after(out);
  dfDollar(fig).attr("data-state", "error");
}
function triggerStateChange(fig, stateName, config) {
  switch (stateName) {
    case "default":
      clearError(fig);
      dfDollar(fig).find(":scope > .mermaid-output").get(0)?.remove();
      delete fig.dataset.state;
      fig.dataset.stateName = "default";
      return;
    case "rendered":
      return renderDiagram(fig);
    case "error":
      showError(fig, typeof config.message === "string" ? config.message : "This diagram could not be rendered.");
      return;
  }
}
var mermaidApi = componentState({
  component: "mermaid",
  states: mermaidStates,
  apply: (fig, state) => triggerStateChange(fig, state.name, state.config),
  read: (fig, state) => {
    const error = dfDollar(fig).children(".mermaid-error").get(0);
    const config = { ...state.config, ...error ? { message: error.textContent ?? "" } : {} };
    return { name: fig.dataset.stateName || "default", config };
  },
  markup: (el, state) => applyMarkup(el, state.name, state.config)
});
df$.mermaidApi = mermaidApi;
df$.mermaidStates = mermaidStates;
df$.mermaid = { load, render: renderDiagram, renderAll, theme: mermaidTheme, url: MERMAID_URL };
var themeWatched = false;
function watchTheme() {
  if (themeWatched)
    return;
  themeWatched = true;
  let timer = 0;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      dfDollar('.mermaid-diagram[data-state="rendered"]').toArray().forEach((fig) => {
        if (JSON.stringify(mermaidTheme(fig)) !== fig._mermaidTheme)
          renderDiagram(fig);
      });
    }, 80);
  };
  const mo = new MutationObserver(schedule);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
  if (document.head)
    mo.observe(document.head, { childList: true, subtree: true, characterData: true });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", schedule);
}
function init() {
  dfDollar("pre.mermaid:not(.mermaid-diagram > pre)").toArray().forEach((pre) => {
    const fig = document.createElement("figure");
    fig.className = "mermaid-diagram";
    pre.before(fig);
    fig.append(pre);
  });
  dfDollar(".mermaid-diagram:not([data-init])").toArray().forEach((fig) => {
    fig.dataset.init = "";
    if (!dfDollar(fig).find(":scope > pre.mermaid").get(0))
      return;
    fig.dataset.stateName = "default";
    bindComponent(fig, mermaidApi);
    watchTheme();
    renderDiagram(fig);
  });
}
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

//# debugId=A8084BCD3E998B4A64756E2164756E21
//# sourceMappingURL=mermaid.js.map
