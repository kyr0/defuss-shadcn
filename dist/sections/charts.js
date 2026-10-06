// dist/components/chart/chart.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.9.5") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals, defussQuery, componentState, bindComponent } = __df$shared;
var df$ = defussGlobals();
var dfDollar = defussQuery();
var chartStates = ["default"];
var ECHARTS_NOT_LOADED = 'chart: echarts is not loaded - add <script src="https://cdn.jsdelivr.net/npm/echarts@6.1.0/dist/echarts.min.js"></script> before chart.js';
function echartsRuntime() {
  const echarts = globalThis.echarts;
  if (!echarts)
    throw new Error(ECHARTS_NOT_LOADED);
  return echarts;
}
var isPlain = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
function deepMerge(base, over) {
  const out = { ...base };
  for (const [key, value] of Object.entries(over)) {
    out[key] = isPlain(value) && isPlain(out[key]) ? deepMerge(out[key], value) : value;
  }
  return out;
}
var reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
var probe = null;
function rgba(css) {
  if (!css || css === "none")
    return null;
  probe ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!probe)
    return null;
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = "rgba(1, 2, 3, 0.5)";
  probe.fillStyle = css;
  if (probe.fillStyle === "rgba(1, 2, 3, 0.5)")
    return null;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a / 255];
}
function toRgb(css, alpha = 1) {
  const c = rgba(css);
  if (!c)
    return "";
  const a = +(c[3] * alpha).toFixed(3);
  return a >= 1 ? `rgb(${c[0]}, ${c[1]}, ${c[2]})` : `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;
}
function chartColor(el, value, alpha = 1) {
  const css = value.startsWith("--") ? getComputedStyle(el).getPropertyValue(value).trim() : value;
  return toRgb(css, alpha);
}
function surfaceOf(el) {
  for (let node = el;node; node = node.parentElement) {
    const c = rgba(getComputedStyle(node).backgroundColor);
    if (c && c[3] > 0.5)
      return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  }
  return toRgb(getComputedStyle(document.documentElement).getPropertyValue("--background").trim()) || "#ffffff";
}
function chartTheme(el) {
  const cs = getComputedStyle(el);
  const tok = (name) => cs.getPropertyValue(name).trim();
  const fs = parseFloat(tok("--chart-font-size")) || 13;
  const k = fs / 13;
  const px = (n) => Math.round(n * k * 10) / 10;
  const fg = toRgb(cs.color) || toRgb(tok("--foreground")) || "#111111";
  const muted = toRgb(cs.color, 0.62) || fg;
  const axis = toRgb(cs.color, 0.28) || fg;
  const grid = toRgb(cs.color, 0.1) || fg;
  const surface = surfaceOf(el);
  const palette = [1, 2, 3, 4, 5].map((n) => toRgb(tok(`--chart-${n}`))).filter(Boolean);
  const font = cs.fontFamily || tok("--font-sans") || "system-ui, sans-serif";
  const label = { color: muted, fontSize: fs, fontFamily: font };
  const reduce = reducedMotion();
  const axisBase = {
    nameTextStyle: { ...label },
    nameGap: px(14),
    axisLabel: { ...label, margin: px(10) },
    axisTick: { show: false },
    splitArea: { show: false }
  };
  return {
    ...palette.length > 0 ? { color: palette } : {},
    backgroundColor: "transparent",
    aria: { enabled: true },
    animation: !reduce,
    animationDuration: reduce ? 0 : 750,
    animationEasing: "cubicOut",
    animationDurationUpdate: reduce ? 0 : 900,
    animationEasingUpdate: "cubicInOut",
    textStyle: { fontFamily: font, color: fg, fontSize: fs },
    title: {
      textStyle: { color: fg, fontSize: px(16), fontWeight: 600, fontFamily: font },
      subtextStyle: { ...label }
    },
    grid: { left: px(8), right: px(20), top: px(40), bottom: px(14) },
    legend: {
      top: 0,
      icon: "roundRect",
      itemWidth: px(12),
      itemHeight: px(12),
      itemGap: px(18),
      textStyle: { color: muted, fontSize: fs, fontFamily: font },
      inactiveColor: grid,
      pageTextStyle: { color: muted }
    },
    tooltip: {
      ...toRgb(tok("--popover")) ? { backgroundColor: toRgb(tok("--popover")) } : {},
      borderColor: toRgb(tok("--border")) || axis,
      borderWidth: 1,
      padding: [px(8), px(12)],
      textStyle: { color: toRgb(tok("--popover-foreground")) || fg, fontSize: fs, fontFamily: font },
      extraCssText: "border-radius: var(--radius-md, 8px); box-shadow: var(--shadow-md, 0 6px 16px rgba(0,0,0,.12));",
      axisPointer: {
        lineStyle: { color: axis, width: 1 },
        crossStyle: { color: axis },
        shadowStyle: { color: toRgb(cs.color, 0.05) },
        label: { backgroundColor: fg, color: surface, fontSize: fs }
      }
    },
    categoryAxis: {
      ...axisBase,
      axisLine: { show: true, lineStyle: { color: axis, width: 1 } },
      splitLine: { show: false }
    },
    valueAxis: {
      ...axisBase,
      axisLine: { show: false },
      splitLine: { show: true, lineStyle: { color: grid, width: 1 } }
    },
    logAxis: {
      ...axisBase,
      axisLine: { show: false },
      splitLine: { show: true, lineStyle: { color: grid, width: 1 } }
    },
    timeAxis: {
      ...axisBase,
      axisLine: { show: true, lineStyle: { color: axis, width: 1 } },
      splitLine: { show: false }
    },
    bar: {
      barMaxWidth: px(56),
      itemStyle: { borderRadius: px(4) },
      label: { color: fg, fontSize: fs, fontFamily: font }
    },
    line: {
      symbol: "circle",
      symbolSize: px(7),
      lineStyle: { width: px(2.5), cap: "round", join: "round" },
      label: { color: fg, fontSize: fs, fontFamily: font, textBorderWidth: 0 },
      endLabel: { color: fg, fontSize: fs, fontFamily: font, textBorderWidth: 0 }
    },
    scatter: { symbolSize: px(12), label: { color: fg, fontSize: fs, fontFamily: font } },
    pie: {
      itemStyle: { borderColor: surface, borderWidth: px(2), borderRadius: px(4) },
      label: { color: fg, fontSize: fs, fontFamily: font },
      labelLine: { lineStyle: { color: axis } }
    },
    sunburst: { itemStyle: { borderColor: surface, borderWidth: px(1.5) }, label: { fontSize: fs } },
    treemap: {
      itemStyle: { borderColor: surface, borderWidth: px(2), gapWidth: px(2) },
      label: { fontSize: fs },
      breadcrumb: { show: false }
    },
    sankey: { label: { color: fg, fontSize: fs }, lineStyle: { opacity: 0.35 } },
    radar: { axisName: { color: muted, fontSize: fs } },
    visualMap: { textStyle: { color: muted, fontSize: fs, fontFamily: font } }
  };
}
var instances = new WeakMap;
var observers = new WeakMap;
var live = new Set;
function withMotion(option) {
  return reducedMotion() ? { ...option, animation: false } : option;
}
var CSS_COLOR = /var\(--|^\s*(?:oklch|oklab|lch|lab|hwb|color-mix|color)\(/;
function resolveColors(el, value, cs) {
  if (typeof value === "string") {
    if (!CSS_COLOR.test(value))
      return value;
    const style = cs ?? getComputedStyle(el);
    const css = value.replace(/var\((--[\w-]+)\s*(?:,\s*([^()]*))?\)/g, (_m, name, fallback) => style.getPropertyValue(name).trim() || (fallback ?? "").trim());
    return toRgb(css) || value;
  }
  if (Array.isArray(value)) {
    const style = cs ?? getComputedStyle(el);
    return value.map((v) => resolveColors(el, v, style));
  }
  if (isPlain(value)) {
    const style = cs ?? getComputedStyle(el);
    const out = {};
    for (const [k, v] of Object.entries(value))
      out[k] = resolveColors(el, v, style);
    return out;
  }
  return value;
}
var journals = new WeakMap;
var JOURNAL_CAP = 64;
var isNotMerge = (arg) => arg === true || isPlain(arg) && arg.notMerge === true;
function wrapSetOption(el, inst) {
  const raw = inst.setOption.bind(inst);
  const journal = { ops: [], overflow: false };
  journals.set(el, journal);
  inst._rawSetOption = raw;
  inst.setOption = (option, arg, lazy) => {
    if (isNotMerge(arg)) {
      journal.ops = [];
      journal.overflow = false;
    }
    if (journal.ops.length < JOURNAL_CAP)
      journal.ops.push([option, arg, lazy]);
    else
      journal.overflow = true;
    raw(withMotion(resolveColors(el, option)), arg, lazy);
  };
}
function mount(el, option = {}) {
  const echarts = echartsRuntime();
  observers.get(el)?.disconnect();
  instances.get(el)?.dispose();
  const instance = echarts.init(el, chartTheme(el), { renderer: "svg" });
  wrapSetOption(el, instance);
  instances.set(el, instance);
  live.add(el);
  watchTheme();
  instance.setOption(option, true);
  let frame = 0;
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (!instance.isDisposed?.())
        instance.resize();
    });
  });
  ro.observe(el);
  observers.set(el, ro);
  replayOnSlide(el);
  replayOnView(el);
  return {
    instance,
    setOption: (opt, notMerge = false) => instance.setOption(opt, notMerge),
    dispose: () => {
      viewObserver?.unobserve(el);
      ro.disconnect();
      observers.delete(el);
      instances.delete(el);
      live.delete(el);
      instance.dispose();
    }
  };
}
function instance(el) {
  return instances.get(el);
}
function replay(el, inst) {
  const journal = journals.get(el);
  const raw = inst._rawSetOption;
  if (!journal || !raw || journal.overflow || journal.ops.length === 0)
    return;
  const ops = journal.ops.slice();
  inst.clear?.();
  journal.ops = ops;
  journal.overflow = false;
  for (const [option, arg, lazy] of ops)
    raw(withMotion(resolveColors(el, option)), arg, lazy);
}
var viewObserver;
function replayOnView(el) {
  if (reducedMotion() || el.closest("[data-slide]") || typeof IntersectionObserver !== "function")
    return;
  viewObserver ??= new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting)
        continue;
      const chartEl = entry.target;
      viewObserver?.unobserve(chartEl);
      const i = instances.get(chartEl);
      if (i && chartEl.isConnected && !i.isDisposed?.())
        replay(chartEl, i);
    }
  }, { threshold: 0.3 });
  viewObserver.observe(el);
}
var slideCharts = new WeakMap;
function replayOnSlide(el) {
  if (el.classList.contains("presentation-stage"))
    return;
  const slide = el.closest("[data-slide]");
  if (!slide)
    return;
  let charts = slideCharts.get(slide);
  if (!charts) {
    charts = new Set;
    slideCharts.set(slide, charts);
    const set = charts;
    let wasActive = slide.hasAttribute("data-active");
    new MutationObserver(() => {
      const active = slide.hasAttribute("data-active");
      if (active && !wasActive) {
        for (const chartEl of set) {
          const i = instances.get(chartEl);
          if (i && chartEl.isConnected)
            replay(chartEl, i);
        }
      }
      wasActive = active;
    }).observe(slide, { attributes: true, attributeFilter: ["data-active"] });
  }
  charts.add(el);
}
function retheme(el, inst) {
  inst.setTheme?.(chartTheme(el));
  const journal = journals.get(el);
  const raw = inst._rawSetOption;
  if (!journal || !raw || journal.overflow)
    return;
  for (const [option, arg, lazy] of journal.ops)
    raw(withMotion(resolveColors(el, option)), arg, lazy);
}
var themeWatched = false;
function watchTheme() {
  if (themeWatched)
    return;
  themeWatched = true;
  let timer = 0;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      for (const el of live) {
        const inst = instances.get(el);
        if (!el.isConnected || !inst || inst.isDisposed?.()) {
          live.delete(el);
          continue;
        }
        retheme(el, inst);
      }
    }, 60);
  };
  const mo = new MutationObserver(schedule);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
  if (document.head)
    mo.observe(document.head, { childList: true, subtree: true, characterData: true });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", schedule);
}
function morphable(option) {
  const series = option.series;
  if (series === undefined)
    return option;
  const list = Array.isArray(series) ? series : [series];
  return {
    ...option,
    series: list.map((s) => s.universalTransition === undefined && s.type !== "custom" ? { ...s, universalTransition: { enabled: true } } : s)
  };
}
function chartStory(el, states, { loop = false } = {}) {
  if (!Array.isArray(states) || states.length === 0) {
    throw new Error("chart: chartStory needs at least one option state");
  }
  if (!instances.has(el))
    mount(el, morphable(states[0]));
  let i = 0;
  const go = (n) => {
    i = loop ? (n % states.length + states.length) % states.length : Math.min(Math.max(n, 0), states.length - 1);
    instances.get(el)?.setOption(morphable(states[i]), true);
    return i;
  };
  return { next: () => go(i + 1), prev: () => go(i - 1), go, index: () => i };
}
var DECK_TEMPO = { animationDuration: 1500, animationEasing: "cubicOut", animationDurationUpdate: 1500, animationEasingUpdate: "cubicInOut" };
function chartDeck(deck, { base = {}, states }) {
  const stage = dfDollar(deck).find(":scope > .presentation-stage").get(0) ?? null;
  if (!stage)
    throw new Error('chart: chart.deck() needs a <div class="chart presentation-stage"> child of the .presentation');
  if (!isPlain(states) || Object.keys(states).length === 0)
    throw new Error("chart: chart.deck() needs at least one named state");
  const slides = Array.from(dfDollar(deck).find(":scope > [data-slide]").toArray());
  let current = null;
  let last = null;
  const show = (name) => {
    if (name === null || !(name in states)) {
      stage.removeAttribute("data-visible");
      current = null;
      return;
    }
    const slide = slides.find((s) => s.dataset.chartState === name);
    if (!instances.has(stage) && slide)
      stage.style.color = getComputedStyle(slide).color;
    stage.setAttribute("data-visible", "");
    if (name === current)
      return;
    const returning = current === null && name === last;
    current = name;
    last = name;
    const option = morphable(deepMerge(deepMerge(DECK_TEMPO, base), states[name]));
    const inst = instances.get(stage);
    if (!inst)
      mount(stage, option);
    else if (returning) {
      inst.clear?.();
      inst.setOption(option, true);
    } else
      inst.setOption(option, true);
  };
  const sync = () => {
    const active = slides.find((s) => s.hasAttribute("data-active"));
    show(active?.dataset.chartState ?? null);
  };
  const mo = new MutationObserver(sync);
  slides.forEach((s) => mo.observe(s, { attributes: true, attributeFilter: ["data-active"] }));
  sync();
  return {
    show,
    state: () => current,
    dispose: () => {
      mo.disconnect();
      observers.get(stage)?.disconnect();
      instances.get(stage)?.dispose();
      instances.delete(stage);
      live.delete(stage);
      stage.removeAttribute("data-visible");
    }
  };
}
function applyMarkup(_el, _stateName) {}
function triggerStateChange(el, stateName, config = {}) {
  if (!chartStates.includes(stateName)) {
    throw new Error(`chart: unknown state "${stateName}" (supported: ${chartStates.join(", ")})`);
  }
  if (isPlain(config.option)) {
    const current = instances.get(el);
    if (current)
      current.setOption(config.option, true);
    else
      mount(el, config.option);
  }
}
var chartApi = componentState({
  component: "chart",
  states: chartStates,
  apply: (el, state) => triggerStateChange(el, state.name, state.config),
  read: (el, state) => {
    return {
      name: el.dataset.stateName || "default",
      config: { ...state.config }
    };
  },
  markup: (el, state) => applyMarkup(el, state.name)
});
df$.chartApi = chartApi;
df$.chartStates = chartStates;
df$.chart = { mount, instance, theme: chartTheme, color: chartColor, deck: chartDeck };
df$.chartStory = chartStory;
function init() {
  dfDollar(".chart:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    bindComponent(el, chartApi);
    const boot = () => {
      if (instances.has(el))
        return;
      const raw = el.getAttribute("data-chart");
      if (!raw)
        return;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0)
        return;
      let option;
      try {
        option = JSON.parse(raw);
      } catch (err) {
        throw new Error(`chart: invalid JSON in data-chart - ${err instanceof Error ? err.message : err}`);
      }
      mount(el, option);
    };
    new ResizeObserver(boot).observe(el);
    boot();
  });
}
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

//# debugId=FC6DA2D2EDDA31CB64756E2164756E21
//# sourceMappingURL=charts.js.map
