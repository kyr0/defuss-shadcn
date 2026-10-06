// dist/components/sidebar/sidebar.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.9.6") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { bindGlobalKeys, defussGlobals, defussQuery, componentState, bindComponent } = __df$shared;
var df$ = defussGlobals();
var dfDollar = defussQuery();
var sidebarStates = ["default", "collapsed"];
function applyMarkup(el, stateName) {
  dfDollar(el).attr("data-state", stateName === "collapsed" ? "collapsed" : el._authoredState ??= dfDollar(el).attr("data-state") || "expanded");
}
function triggerStateChange(sidebar, stateName, _config) {
  switch (stateName) {
    case "default":
      sidebar.dataset.state = sidebar._defaultState ?? "expanded";
      break;
    case "collapsed":
      sidebar.dataset.state = "collapsed";
      break;
  }
}
var sidebarApi = componentState({
  component: "sidebar",
  states: sidebarStates,
  apply: (sidebar, state) => {
    sidebar._pinned = true;
    triggerStateChange(sidebar, state.name, state.config);
  },
  read: (sidebar, state) => {
    return {
      name: sidebar.dataset.state === "collapsed" ? "collapsed" : "default",
      config: state.config
    };
  },
  markup: (el, state) => applyMarkup(el, state.name)
});
df$.sidebarApi = sidebarApi;
df$.sidebarStates = sidebarStates;
function init() {
  dfDollar(".app-sidebar:not([data-init])").toArray().forEach((sidebar) => {
    sidebar.dataset.init = "";
    sidebar._defaultState = sidebar.dataset.state || "expanded";
    sidebar._pinned = !!sidebar.dataset.stateName;
    bindComponent(sidebar, sidebarApi);
    const triggerId = sidebar.id ? `[data-sidebar-trigger="${sidebar.id}"]` : ".sidebar-trigger";
    dfDollar(triggerId).toArray().forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const state = sidebar.dataset.state === "collapsed" ? "expanded" : "collapsed";
        sidebar.dataset.state = state;
        sidebar._pinned = true;
      });
    });
    document.__sidebarAutoRo?.observe(sidebar.parentElement ?? sidebar);
    autoCollapseSidebar(sidebar);
  });
  dfDollar("[data-sidebar-mobile]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const dialog = dfDollar("#" + CSS.escape(trigger.dataset.sidebarMobile)).get(0);
    if (!dialog)
      return;
    trigger.addEventListener("click", () => {
      dialog.showModal();
    });
    dfDollar(dialog).find(".sidebar-mobile-close").toArray().forEach((btn) => {
      btn.addEventListener("click", () => {
        dialog.close();
      });
    });
  });
}
var AUTO_COLLAPSE_BELOW = 24 * 16;
var AUTO_COLLAPSE_ABOVE = 28 * 16;
function autoCollapseSidebar(sidebar) {
  if (sidebar._pinned)
    return;
  const avail = (sidebar.parentElement ?? document.body).clientWidth || window.innerWidth;
  const collapsed = sidebar.dataset.state === "collapsed";
  if (!collapsed && avail < AUTO_COLLAPSE_BELOW)
    sidebar.dataset.state = "collapsed";
  else if (collapsed && avail >= AUTO_COLLAPSE_ABOVE) {
    sidebar.dataset.state = sidebar._defaultState ?? "expanded";
  }
}
if (typeof ResizeObserver !== "undefined" && !document.__sidebarAutoRo) {
  const pending = new Set;
  let frame = 0;
  document.__sidebarAutoRo = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target.classList?.contains("app-sidebar"))
        pending.add(entry.target);
      entry.target.querySelectorAll?.(".app-sidebar").forEach((s) => pending.add(s));
    }
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      pending.forEach(autoCollapseSidebar);
      pending.clear();
    });
  });
}
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
if (!document.__sidebarKbInit) {
  document.__sidebarKbInit = true;
  bindGlobalKeys((e) => {
    if (!(e.metaKey || e.ctrlKey) || e.key !== "b")
      return;
    const sidebar = dfDollar(".app-sidebar").get(0);
    if (!sidebar)
      return;
    e.preventDefault();
    sidebar.dataset.state = sidebar.dataset.state === "collapsed" ? "expanded" : "collapsed";
    sidebar._pinned = true;
    return true;
  });
}

// dist/components/resizer/resizer.js
var __df$core2 = globalThis.df$;
var __df$shared2 = __df$core2 && __df$core2.shadcn && __df$core2.shadcn.shared;
if (!__df$shared2 || __df$shared2.abi !== "0.9.6") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals2, defussQuery: defussQuery2, componentState: componentState2, bindComponent: bindComponent2 } = __df$shared2;
var df$2 = defussGlobals2();
var dfDollar2 = defussQuery2();
var resizerStates = ["default"];
var HANDLES = ["n", "e", "s", "w", "ne", "nw", "se", "sw"];
var CLASS_NUMBERS = Array.from({ length: 81 }, (_, i) => i + 16);
var clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
var numAttr = (el, key, fallback) => {
  const v = parseFloat(el.dataset[key] ?? "");
  return Number.isFinite(v) ? v : fallback;
};
function targetOf(wrapper) {
  for (const el of Array.from(wrapper.children)) {
    if (!el.hasAttribute("data-handle"))
      return el;
  }
  return null;
}
function handleSet(wrapper) {
  const spec = (wrapper.dataset.handles || "se").trim();
  const requested = spec === "all" ? [...HANDLES] : spec.split(/[\s,]+/).filter((h) => HANDLES.includes(h));
  const axis = wrapper.dataset.axis || "both";
  if (axis === "both")
    return requested;
  const moves = (h) => axis === "w" ? /e|w/.test(h) : /n|s/.test(h);
  return requested.filter(moves);
}
function ladderTokens(wrapper, axis) {
  const custom = axis === "w" ? wrapper.dataset.wClasses : wrapper.dataset.hClasses;
  if (custom)
    return custom.trim().split(/\s+/);
  return CLASS_NUMBERS.map((n) => `${axis}-${n}`);
}
var LADDER_PX = new Map;
function tokenPx(wrapper, token, axis) {
  const key = axis + token;
  let px = LADDER_PX.get(key);
  if (px !== undefined)
    return px;
  const target = targetOf(wrapper);
  const had = Array.from(target.classList).filter((c) => /^[wh]-[\d.]+$/.test(c));
  had.forEach((c) => target.classList.remove(c));
  target.classList.add(token);
  const box = target.getBoundingClientRect();
  px = (axis === "w" ? box.width : box.height) / zoomOf(wrapper);
  target.classList.remove(token);
  had.forEach((c) => target.classList.add(c));
  LADDER_PX.set(key, px);
  return px;
}
function nearestToken(wrapper, ladder, wantedPx, axis) {
  let best = ladder[0];
  let bestD = Infinity;
  for (const token of ladder) {
    const d = Math.abs(tokenPx(wrapper, token, axis) - wantedPx);
    if (d < bestD) {
      bestD = d;
      best = token;
    }
  }
  return best;
}
function setClassSize(el, token, ladder) {
  const owned = new Set(ladder);
  for (const cls of Array.from(el.classList))
    if (owned.has(cls) && cls !== token)
      el.classList.remove(cls);
  if (!el.classList.contains(token))
    el.classList.add(token);
}
function setPxSize(el, axis, px) {
  const prop = axis === "w" ? "width" : "height";
  const value = `${Math.round(px)}px`;
  if (el.style.getPropertyValue(prop) !== value)
    el.style.setProperty(prop, value);
}
function bounds(wrapper, axis) {
  const min = numAttr(wrapper, axis === "w" ? "minW" : "minH", numAttr(wrapper, "min", 80));
  const max = numAttr(wrapper, axis === "w" ? "maxW" : "maxH", numAttr(wrapper, "max", 2000));
  return [min, max];
}
function zoomOf(el) {
  const zs = getComputedStyle(el).zoom || "1";
  const z = zs.includes("%") ? parseFloat(zs) / 100 : parseFloat(zs);
  return Number.isFinite(z) && z > 0 ? z : 1;
}
function currentPx(wrapper, axis) {
  const target = targetOf(wrapper);
  if (!target)
    return 0;
  const box = target.getBoundingClientRect();
  const raw = axis === "w" ? box.width : box.height;
  return Math.round(raw / zoomOf(wrapper));
}
function applySize(wrapper, axis, px) {
  const target = targetOf(wrapper);
  if (!target)
    return;
  const mode = wrapper.dataset.resizeMode || "px";
  const [min, max] = bounds(wrapper, axis);
  const wanted = clamp(px, min, max);
  let resolved = wanted;
  if (mode === "classes") {
    const ladder = ladderTokens(wrapper, axis);
    setClassSize(target, nearestToken(wrapper, ladder, wanted, axis), ladder);
    resolved = currentPx(wrapper, axis);
  } else if (mode !== "controlled") {
    const step = Math.max(1, numAttr(wrapper, "step", 1));
    resolved = Math.round(wanted / step) * step;
    setPxSize(target, axis, resolved);
  }
  if (mode !== "controlled") {
    const key = axis === "w" ? "width" : "height";
    const value = String(Math.round(resolved));
    if (wrapper.dataset[key] !== value)
      wrapper.dataset[key] = value;
  }
  wrapper.dispatchEvent(new CustomEvent("resizer-resize", {
    bubbles: true,
    detail: {
      axis,
      width: axis === "w" ? mode === "controlled" ? Math.round(wanted) : currentPx(wrapper, "w") : currentPx(wrapper, "w"),
      height: axis === "h" ? mode === "controlled" ? Math.round(wanted) : currentPx(wrapper, "h") : currentPx(wrapper, "h")
    }
  }));
}
function applyMarkup2(_el, _stateName) {}
function triggerStateChange2(wrapper, stateName, config = {}) {
  if (stateName !== "default")
    return;
  if (config.width !== undefined || wrapper._defaultSize)
    applySize(wrapper, "w", Number(config.width ?? wrapper._defaultSize?.[0]));
  if (config.height !== undefined || wrapper._defaultSize)
    applySize(wrapper, "h", Number(config.height ?? wrapper._defaultSize?.[1]));
}
var resizerApi = componentState2({
  component: "resizer",
  states: resizerStates,
  apply: (wrapper, state) => triggerStateChange2(wrapper, state.name, state.config),
  read: (wrapper, state) => {
    return {
      name: wrapper.dataset.stateName || "default",
      config: {
        ...state.config,
        width: currentPx(wrapper, "w"),
        height: currentPx(wrapper, "h"),
        mode: wrapper.dataset.resizeMode || "px"
      }
    };
  },
  markup: (el, state) => applyMarkup2(el, state.name)
});
df$2.resizerApi = resizerApi;
df$2.resizerStates = resizerStates;
var HANDLE_LABEL = {
  n: "top edge",
  s: "bottom edge",
  e: "right edge",
  w: "left edge",
  ne: "top-right corner",
  nw: "top-left corner",
  se: "bottom-right corner",
  sw: "bottom-left corner"
};
function makeHandle(wrapper, h) {
  const el = document.createElement("span");
  el.className = "resizer-handle";
  el.dataset.handle = h;
  el.setAttribute("role", "separator");
  el.setAttribute("tabindex", "0");
  if (h.length === 1)
    el.setAttribute("aria-orientation", h === "n" || h === "s" ? "horizontal" : "vertical");
  el.setAttribute("aria-label", `Resize ${HANDLE_LABEL[h]}`);
  el.setAttribute("data-ce-chrome", "");
  el.addEventListener("pointerdown", (ev) => startDrag(wrapper, el, ev));
  el.addEventListener("keydown", (ev) => handleKeys(wrapper, el, ev));
  el.addEventListener("dblclick", () => {
    if (wrapper.dataset.variant === "divider")
      resizerApi.setState(wrapper, "default");
  });
  return el;
}
function syncHandles(wrapper) {
  const want = handleSet(wrapper);
  for (const el of Array.from(dfDollar2(wrapper).find(":scope > .resizer-handle").toArray())) {
    if (!want.includes(el.dataset.handle))
      el.remove();
  }
  for (const h of want) {
    if (!dfDollar2(wrapper).find(`:scope > .resizer-handle[data-handle="${h}"]`).get(0))
      dfDollar2(wrapper).append(makeHandle(wrapper, h));
  }
}
function handleKeys(wrapper, handle, ev) {
  const sides = handle.dataset.handle;
  if (!sides)
    return;
  const edge = wrapper.dataset.keys === "edge" && sides.length === 1;
  const OUT = { e: "ArrowRight", w: "ArrowLeft", s: "ArrowDown", n: "ArrowUp" };
  const IN = { e: "ArrowLeft", w: "ArrowRight", s: "ArrowUp", n: "ArrowDown" };
  const dir = edge ? ev.key === OUT[sides] ? 1 : ev.key === IN[sides] ? -1 : 0 : ev.key === "ArrowRight" || ev.key === "ArrowUp" ? 1 : ev.key === "ArrowLeft" || ev.key === "ArrowDown" ? -1 : 0;
  if (dir === 0 && ev.key !== "Home" && ev.key !== "End")
    return;
  ev.preventDefault();
  const step = (numAttr(wrapper, "stepKey", 10) || 10) * (ev.shiftKey ? 10 : 1);
  const apply = (axis) => {
    const [min, max] = bounds(wrapper, axis);
    const cur = currentPx(wrapper, axis);
    applySize(wrapper, axis, ev.key === "Home" ? min : ev.key === "End" ? max : cur + dir * step);
  };
  if (sides.includes("e") || sides.includes("w"))
    apply("w");
  if (sides.includes("n") || sides.includes("s"))
    apply("h");
}
function startDrag(wrapper, handle, ev) {
  if (ev.button !== 0)
    return;
  ev.preventDefault();
  handle.setPointerCapture(ev.pointerId);
  const side = handle.dataset.handle || "se";
  const axis = wrapper.dataset.axis || "both";
  const startX = ev.clientX;
  const startY = ev.clientY;
  const startW = currentPx(wrapper, "w");
  const startH = currentPx(wrapper, "h");
  const z = zoomOf(wrapper);
  const dx = side.includes("w") ? -1 : side.includes("e") ? 1 : 0;
  const dy = side.includes("n") ? -1 : side.includes("s") ? 1 : 0;
  wrapper.dataset.resizing = side;
  const onUp = () => {
    delete wrapper.dataset.resizing;
    handle.removeEventListener("pointermove", onMove);
    handle.removeEventListener("pointerup", onUp);
    handle.removeEventListener("pointercancel", onUp);
    handle.removeEventListener("lostpointercapture", onUp);
    document.removeEventListener("pointercancel", onUp);
  };
  document.addEventListener("pointercancel", onUp);
  const onMove = (e) => {
    if (e.buttons === 0) {
      onUp();
      return;
    }
    if (dx !== 0 && axis !== "h")
      applySize(wrapper, "w", startW + dx * (e.clientX - startX) / z);
    if (dy !== 0 && axis !== "w")
      applySize(wrapper, "h", startH + dy * (e.clientY - startY) / z);
  };
  handle.addEventListener("pointermove", onMove);
  handle.addEventListener("pointerup", onUp);
  handle.addEventListener("pointercancel", onUp);
  handle.addEventListener("lostpointercapture", onUp);
}
function init2() {
  const fresh = dfDollar2(".resizer:not([data-init])").toArray().filter((wrapper) => wrapper instanceof HTMLElement).filter((wrapper) => {
    wrapper.dataset.init = "";
    return !!targetOf(wrapper);
  });
  for (const wrapper of fresh)
    wrapper._defaultSize = [currentPx(wrapper, "w"), currentPx(wrapper, "h")];
  fresh.forEach((wrapper) => {
    bindComponent2(wrapper, resizerApi);
    syncHandles(wrapper);
    const target = targetOf(wrapper);
    target?.style.setProperty("resize", "none");
    new MutationObserver((records) => {
      for (const r of records) {
        if (r.attributeName === "data-handles" || r.attributeName === "data-axis") {
          syncHandles(wrapper);
          continue;
        }
        const axis = r.attributeName === "data-width" ? "w" : "h";
        const v = parseFloat(wrapper.dataset[axis === "w" ? "width" : "height"] ?? "");
        if (Number.isFinite(v) && Math.abs(currentPx(wrapper, axis) - v) > 0.5)
          applySize(wrapper, axis, v);
      }
    }).observe(wrapper, { attributes: true, attributeFilter: ["data-width", "data-height", "data-handles", "data-axis"] });
    wrapper.addEventListener("resizer-reset", () => resizerApi.setState(wrapper, "default"));
  });
}
init2();
new MutationObserver(init2).observe(document, { childList: true, subtree: true });

// dist/components/border-layout/border-layout.js
var __df$core3 = globalThis.df$;
var __df$shared3 = __df$core3 && __df$core3.shadcn && __df$core3.shadcn.shared;
if (!__df$shared3 || __df$shared3.abi !== "0.9.6") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals3, defussQuery: defussQuery3, componentState: componentState3, bindComponent: bindComponent3, persisted } = __df$shared3;
var df$3 = defussGlobals3();
var dfDollar3 = defussQuery3();
var borderLayoutStates = ["default", "collapsed"];
var SIDES = {
  north: { handle: "s", axis: "h", size: "height" },
  south: { handle: "n", axis: "h", size: "height" },
  west: { handle: "e", axis: "w", size: "width" },
  east: { handle: "w", axis: "w", size: "width" }
};
var REGIONS = Object.keys(SIDES);
var num = (v, fallback) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};
var resolve = (t) => typeof t === "string" ? dfDollar3("#" + CSS.escape(t)).get(0) ?? dfDollar3(t).get(0) : t;
var regionOf = (layout, side) => dfDollar3(layout).find(`:scope > .border-layout-${side}`).get(0);
var paneOf = (region) => region.classList.contains("resizer") ? Array.from(region.children).find((c) => !c.classList.contains("resizer-handle")) : region;
var sizeOf = (region, side) => {
  if (region.hasAttribute("data-collapsed"))
    return 0;
  const box = region.getBoundingClientRect();
  return Math.round(SIDES[side].axis === "w" ? box.width : box.height);
};
function setSize(region, side, px) {
  const { size } = SIDES[side];
  const pane = paneOf(region);
  if (!pane)
    return;
  const value = String(Math.round(px));
  if (region.hasAttribute("data-init") && region.api)
    region.dataset[size] = value;
  else
    pane.style[size] = `${value}px`;
}
function clamp2(layout) {
  const centerMin = num(layout.dataset.centerMin, 120);
  const style = getComputedStyle(layout);
  const gapW = num(style.columnGap, 0) * 2;
  const gapH = num(style.rowGap, 0) * 2;
  const pad = (a, b) => num(style[a], 0) + num(style[b], 0);
  const innerW = layout.clientWidth - pad("paddingLeft", "paddingRight") - gapW;
  const innerH = layout.clientHeight - pad("paddingTop", "paddingBottom") - gapH;
  const OPPOSITE = { north: "south", south: "north", west: "east", east: "west" };
  for (const side of REGIONS) {
    const region = regionOf(layout, side);
    if (!region?.classList.contains("resizer"))
      continue;
    const other = regionOf(layout, OPPOSITE[side]);
    const taken = other ? sizeOf(other, OPPOSITE[side]) : 0;
    const room = (SIDES[side].axis === "w" ? innerW : innerH) - taken - centerMin;
    const authoredMax = num(region.dataset.maxAuthored, Infinity);
    const max = Math.max(num(region.dataset.min, 48), Math.min(room, authoredMax));
    region.dataset[SIDES[side].axis === "w" ? "maxW" : "maxH"] = String(Math.round(max));
    if (!region.hasAttribute("data-collapsed") && sizeOf(region, side) > max + 1)
      setSize(region, side, max);
  }
}
function aria(layout) {
  for (const side of REGIONS) {
    const region = regionOf(layout, side);
    const handle = region ? dfDollar3(region).children(".resizer-handle").get(0) : null;
    if (!handle)
      continue;
    const pane = paneOf(region);
    if (pane && !pane.id)
      pane.id = `${layout.id || "border-layout"}-${side}-${Math.random().toString(36).slice(2, 7)}`;
    if (pane)
      handle.setAttribute("aria-controls", pane.id);
    const name = region.getAttribute("aria-label") || pane?.getAttribute("aria-label") || side;
    handle.setAttribute("aria-label", `Resize ${name}`);
    handle.setAttribute("aria-valuenow", String(sizeOf(region, side)));
    handle.setAttribute("aria-valuemin", String(region.hasAttribute("data-collapsible") || layout.hasAttribute("data-collapsible") ? 0 : num(region.dataset.min, 48)));
    handle.setAttribute("aria-valuemax", String(num(region.dataset[SIDES[side].axis === "w" ? "maxW" : "maxH"], 2000)));
  }
}
var collapsible = (layout, region) => region.hasAttribute("data-collapsible") || layout.hasAttribute("data-collapsible");
function collapse(layout, side, collapsed) {
  const region = regionOf(layout, side);
  if (!region)
    return;
  const was = region.hasAttribute("data-collapsed");
  if (was === collapsed)
    return;
  region.toggleAttribute("data-collapsed", collapsed);
  aria(layout);
  save(layout);
  layout.dispatchEvent(new CustomEvent("border-layout-collapse", { bubbles: true, detail: { region: side, collapsed } }));
  syncState(layout);
}
function syncState(layout) {
  const folded = REGIONS.filter((s) => regionOf(layout, s)?.hasAttribute("data-collapsed"));
  const name = folded.length ? "collapsed" : "default";
  if (layout.store)
    borderLayoutApi.commit(layout, name, folded.length ? { regions: folded } : {});
  else
    layout.dataset.stateName = name;
}
var saved = new Map;
var savedFor = (layout) => {
  const key = `defuss-shadcn:border-layout:${layout.dataset.save}`;
  if (!saved.has(key)) {
    saved.set(key, persisted(key, {}, {
      validate: (v) => typeof v === "object" && v !== null && !Array.isArray(v)
    }));
  }
  return saved.get(key);
};
function save(layout) {
  if (!layout.dataset.save || layout._restoring)
    return;
  const data = {};
  for (const side of REGIONS) {
    const region = regionOf(layout, side);
    if (!region?.classList.contains("resizer"))
      continue;
    const pane = paneOf(region);
    const px = Math.round(num(pane?.style[SIDES[side].size], NaN));
    data[side] = { size: Number.isFinite(px) ? px : null, collapsed: region.hasAttribute("data-collapsed") };
  }
  savedFor(layout).set(data);
}
function restore(layout) {
  if (!layout.dataset.save)
    return;
  const data = savedFor(layout).value;
  if (!Object.keys(data).length)
    return;
  layout._restoring = true;
  for (const side of REGIONS) {
    const region = regionOf(layout, side);
    const saved = data[side];
    if (!region || !saved)
      continue;
    if (saved.size)
      setSize(region, side, saved.size);
    region.toggleAttribute("data-collapsed", !!saved.collapsed);
  }
  layout._restoring = false;
}
function applyMarkup3(el, stateName, config) {
  const want = new Set(stateName === "collapsed" ? config?.regions ?? (config?.region ? [config.region] : []) : []);
  for (const side of REGIONS) {
    const region = regionOf(el, side);
    if (region)
      dfDollar3(region).attr("data-collapsed", want.has(side) ? "" : null);
  }
}
function triggerStateChange3(layout, stateName, config) {
  if (stateName === "default") {
    for (const side of REGIONS) {
      const region = regionOf(layout, side);
      if (!region)
        continue;
      region.removeAttribute("data-collapsed");
      if (!region._authored)
        continue;
      region.dataset[SIDES[side].axis === "w" ? "maxW" : "maxH"] = region.dataset.maxAuthored ?? "2000";
      setSize(region, side, region._authored);
    }
    clamp2(layout);
  } else {
    const want = new Set(config.regions ?? (config.region ? [config.region] : []));
    for (const side of REGIONS) {
      const region = regionOf(layout, side);
      if (region)
        region.toggleAttribute("data-collapsed", want.has(side));
    }
  }
  aria(layout);
  save(layout);
}
var borderLayoutApi = componentState3({
  component: "border-layout",
  states: borderLayoutStates,
  apply: (layout, state) => {
    triggerStateChange3(layout, state.name, state.config);
    syncState(layout);
  },
  markup: (el, state) => applyMarkup3(el, state.name, state.config)
});
df$3.borderLayoutApi = borderLayoutApi;
df$3.borderLayoutStates = borderLayoutStates;
function init3() {
  dfDollar3(".border-layout:not([data-init])").toArray().forEach((layout) => {
    layout.dataset.init = "";
    for (const side of REGIONS) {
      const region = regionOf(layout, side);
      if (!region?.classList.contains("resizer"))
        continue;
      const d = region.dataset;
      d.handles ??= SIDES[side].handle;
      d.axis ??= SIDES[side].axis;
      d.keys ??= "edge";
      d.min ??= "48";
      if (d.max)
        d.maxAuthored = d.max;
      const pane = paneOf(region);
      const prop = SIDES[side].size;
      const authored = pane?.style[prop] ?? "";
      if (authored.endsWith("%")) {
        const inner = prop === "width" ? layout.clientWidth : layout.clientHeight;
        pane.style[prop] = `${Math.round(parseFloat(authored) / 100 * inner)}px`;
      }
      region._authored = sizeOf(region, side) || null;
    }
    restore(layout);
    const before = (e) => {
      const handle = e.target.closest?.(".resizer-handle");
      if (!handle || handle.parentElement?.parentElement !== layout)
        return;
      clamp2(layout);
      const side = REGIONS.find((s) => handle.parentElement.classList.contains(`border-layout-${s}`));
      if (e.type === "pointerdown" && side && handle.parentElement.hasAttribute("data-collapsed"))
        collapse(layout, side, false);
    };
    layout.addEventListener("pointerdown", before, true);
    layout.addEventListener("keydown", before, true);
    layout.addEventListener("focusin", (e) => {
      before(e);
      aria(layout);
    });
    const toggle = (handle) => {
      const region = handle.parentElement;
      const side = REGIONS.find((s) => region.classList.contains(`border-layout-${s}`));
      if (!side || !collapsible(layout, region))
        return;
      collapse(layout, side, !region.hasAttribute("data-collapsed"));
    };
    layout.addEventListener("dblclick", (e) => {
      const handle = e.target.closest(".resizer-handle");
      if (handle && handle.parentElement?.parentElement === layout)
        toggle(handle);
    });
    layout.addEventListener("keydown", (e) => {
      const handle = e.target.closest?.(".resizer-handle");
      if (e.key === "Enter" && handle && handle.parentElement?.parentElement === layout) {
        e.preventDefault();
        toggle(handle);
      }
    });
    layout.addEventListener("resizer-resize", (e) => {
      if (e.target.parentElement !== layout)
        return;
      aria(layout);
      save(layout);
    });
    new ResizeObserver(() => {
      clamp2(layout);
      aria(layout);
    }).observe(layout);
    bindComponent3(layout, borderLayoutApi);
    syncState(layout);
    queueMicrotask(() => {
      clamp2(layout);
      aria(layout);
    });
  });
}
df$3.borderLayout = {
  collapse: (target, side) => {
    const l = resolve(target);
    if (l)
      collapse(l, side, true);
  },
  expand: (target, side) => {
    const l = resolve(target);
    if (l)
      collapse(l, side, false);
  },
  toggle: (target, side) => {
    const l = resolve(target);
    const region = l && regionOf(l, side);
    if (!region)
      return false;
    collapse(l, side, !region.hasAttribute("data-collapsed"));
    return region.hasAttribute("data-collapsed");
  },
  resize: (target, side, px) => {
    const l = resolve(target);
    const r = l && regionOf(l, side);
    if (r) {
      clamp2(l);
      setSize(r, side, px);
    }
  },
  sizes: (target) => {
    const l = resolve(target);
    const out = {};
    if (l)
      for (const side of REGIONS) {
        const r = regionOf(l, side);
        if (r)
          out[side] = sizeOf(r, side);
      }
    return out;
  }
};
init3();
new MutationObserver(init3).observe(document, { childList: true, subtree: true });

// dist/components/panel/panel.js
var __df$core4 = globalThis.df$;
var __df$shared4 = __df$core4 && __df$core4.shadcn && __df$core4.shadcn.shared;
if (!__df$shared4 || __df$shared4.abi !== "0.9.6") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals4, defussQuery: defussQuery4, componentState: componentState4, bindComponent: bindComponent4 } = __df$shared4;
var df$4 = defussGlobals4();
var dfDollar4 = defussQuery4();
var panelStates = ["default", "minimized", "maximized", "closed"];
var SIDES2 = ["north", "south", "west", "east", "center"];
var resolve2 = (t) => typeof t === "string" ? dfDollar4("#" + CSS.escape(t)).get(0) ?? dfDollar4(t).get(0) : t;
var toolInput = (panel, tool) => dfDollar4(panel).find(`:scope > .panel-header .panel-${tool} > input[type="checkbox"]`).get(0);
function regionOf2(panel) {
  const parent = panel.parentElement;
  if (!parent)
    return null;
  if (parent.classList.contains("border-layout"))
    return panel;
  if (parent.classList.contains("resizer") && parent.parentElement?.classList.contains("border-layout"))
    return parent;
  if (parent.classList.contains("border-layout-center") && parent.parentElement?.classList.contains("border-layout"))
    return parent;
  return null;
}
var sideOf = (region) => region ? SIDES2.find((s) => region.classList.contains(`border-layout-${s}`)) ?? null : null;
var hostOf = (panel) => panel.parentElement?.closest(".border-layout, [data-panel-host]") ?? null;
function applyMarkup4(el, stateName) {
  dfDollar4(el).attr("data-minimized", stateName === "minimized" ? "" : null).attr("data-maximized", stateName === "maximized" ? "" : null);
  dfDollar4(el).attr("hidden", stateName === "closed" ? "" : null);
  dfDollar4(el).children(".panel-body").attr("inert", stateName === "minimized" ? "" : null);
}
function triggerStateChange4(panel, stateName) {
  const minimized = stateName === "minimized";
  const maximized = stateName === "maximized";
  const closed = stateName === "closed";
  panel.toggleAttribute("data-minimized", minimized);
  panel.toggleAttribute("data-maximized", maximized);
  panel.toggleAttribute("hidden", closed);
  const min = toolInput(panel, "minimize");
  const max = toolInput(panel, "maximize");
  if (min)
    min.checked = minimized;
  if (max)
    max.checked = maximized;
  const body = dfDollar4(panel).find(":scope > .panel-body").get(0);
  if (body)
    body.toggleAttribute("inert", minimized);
  const region = regionOf2(panel);
  if (region && region !== panel) {
    region.toggleAttribute("data-panel-minimized", minimized);
    region.toggleAttribute("data-panel-closed", closed);
    const handle = dfDollar4(region).find(":scope > .resizer-handle").get(0);
    if (handle)
      handle.inert = minimized || maximized || closed;
  }
  const host = hostOf(panel);
  if (maximized && host) {
    panel._host = host;
    host.setAttribute("data-panel-maximized", "");
  } else if (panel._host) {
    if (!dfDollar4(panel._host).find(".panel[data-maximized]").get(0))
      panel._host.removeAttribute("data-panel-maximized");
    panel._host = null;
  }
}
var panelApi = componentState4({
  component: "panel",
  states: panelStates,
  apply: (panel, state) => {
    const from = panel.dataset.stateName || "default";
    triggerStateChange4(panel, state.name);
    queueMicrotask(() => syncToggles(panel));
    if (from !== state.name) {
      panel.dispatchEvent(new CustomEvent("panel-change", { bubbles: true, detail: { state: state.name, previous: from, region: sideOf(regionOf2(panel)) } }));
    }
  },
  markup: (el, state) => applyMarkup4(el, state.name)
});
df$4.panelApi = panelApi;
df$4.panelStates = panelStates;
function init4() {
  dfDollar4(".panel:not([data-init])").toArray().forEach((panel) => {
    panel.dataset.init = "";
    const side = sideOf(regionOf2(panel));
    if (side)
      panel.dataset.region = side;
    const header = dfDollar4(panel).find(":scope > .panel-header").get(0);
    const body = dfDollar4(panel).find(":scope > .panel-body").get(0);
    if (body) {
      if (!body.id)
        body.id = `panel-${Math.random().toString(36).slice(2, 8)}-body`;
      toolInput(panel, "minimize")?.setAttribute("aria-controls", body.id);
    }
    panel.addEventListener("change", (e) => {
      const input = e.target;
      if (!(input instanceof HTMLInputElement) || input.closest(".panel") !== panel)
        return;
      if (input === toolInput(panel, "minimize"))
        panelApi.setState(panel, input.checked ? "minimized" : "default");
      else if (input === toolInput(panel, "maximize"))
        panelApi.setState(panel, input.checked ? "maximized" : "default");
    });
    header?.addEventListener("dblclick", (e) => {
      if (panel.dataset.titleCollapse === "false" || e.target.closest(".panel-tools") || !toolInput(panel, "minimize"))
        return;
      document.getSelection()?.removeAllRanges();
      panelApi.setState(panel, panel.hasAttribute("data-minimized") ? "default" : "minimized");
    });
    dfDollar4(panel).on("click", (e) => {
      const close = e.target?.closest?.(".panel-close");
      if (!close || close.closest(".panel") !== panel)
        return;
      panelApi.setState(panel, "closed");
      if (panel.id)
        dfDollar4(`[data-panel-open="${CSS.escape(panel.id)}"], [data-panel-toggle="${CSS.escape(panel.id)}"]`).get(0)?.focus();
    });
    panel.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || !panel.hasAttribute("data-maximized"))
        return;
      e.stopPropagation();
      panelApi.setState(panel, "default");
      toolInput(panel, "maximize")?.focus();
    });
    bindComponent4(panel, panelApi);
    const start = panel.hasAttribute("hidden") ? "closed" : panel.hasAttribute("data-maximized") || toolInput(panel, "maximize")?.checked ? "maximized" : panel.hasAttribute("data-minimized") || toolInput(panel, "minimize")?.checked ? "minimized" : "default";
    triggerStateChange4(panel, start);
    panel.dataset.stateName = start;
    syncToggles(panel);
  });
}
var act = (t, state) => {
  const panel = resolve2(t);
  if (panel?.api)
    panel.api.setState(state);
  return panel ?? null;
};
var panelActions = {
  minimize: (target) => act(target, "minimized"),
  maximize: (target) => act(target, "maximized"),
  restore: (target) => act(target, "default"),
  close: (target) => act(target, "closed"),
  open: (target) => act(target, "default"),
  toggle: (target) => {
    const panel = resolve2(target);
    if (!panel?.api)
      return false;
    panel.api.setState(panel.hasAttribute("data-minimized") ? "default" : "minimized");
    return panel.hasAttribute("data-minimized");
  }
};
df$4.panel = panelActions;
var openersBound = false;
function bindOpeners() {
  if (openersBound)
    return;
  openersBound = true;
  dfDollar4(document).on("click", (e) => {
    const trigger = e.target?.closest?.("[data-panel-open], [data-panel-toggle]");
    if (!trigger)
      return;
    const id = trigger.dataset.panelOpen ?? trigger.dataset.panelToggle;
    const panel = dfDollar4(`#${CSS.escape(id)}`).get(0);
    if (!panel?.api)
      return;
    if (trigger.hasAttribute("data-panel-toggle") && panel.dataset.stateName !== "closed") {
      panel.api.setState("closed");
      return;
    }
    panel.api.setState("default");
    dfDollar4(panel).find(":scope > .panel-header .panel-tools :is(input, button)").get(0)?.focus();
  });
}
function syncToggles(panel) {
  if (!panel.id)
    return;
  for (const t of dfDollar4(`[data-panel-toggle="${CSS.escape(panel.id)}"]`).toArray()) {
    t.setAttribute("aria-expanded", String(panel.dataset.stateName !== "closed" && !panel.hidden));
    t.setAttribute("aria-controls", panel.id);
  }
}
bindOpeners();
init4();
new MutationObserver(init4).observe(document, { childList: true, subtree: true });

// dist/components/property-grid/property-grid.js
var __df$core5 = globalThis.df$;
var __df$shared5 = __df$core5 && __df$core5.shadcn && __df$core5.shadcn.shared;
if (!__df$shared5 || __df$shared5.abi !== "0.9.6") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals5, defussQuery: defussQuery5, componentState: componentState5, bindComponent: bindComponent5 } = __df$shared5;
var df$5 = defussGlobals5();
var dfDollar5 = defussQuery5();
var propertyGridStates = ["default", "editing"];
var isGroup = (v) => v !== null && typeof v === "object";
var pathKey = (path) => path.join(".");
var toPath = (path) => Array.isArray(path) ? path.map(String) : String(path).split(".").filter((s) => s !== "");
var clone = (v) => v === undefined ? undefined : structuredClone(v);
var configOf = (root) => root._config ?? root.store?.value.config ?? {};
var optionsOf = (root) => root._options ?? {};
function getAt(obj, path) {
  let at = obj;
  for (const k of path) {
    if (!isGroup(at))
      return;
    at = at[k];
  }
  return at;
}
function setAt(obj, path, value) {
  if (!path.length)
    return value;
  const [head, ...rest] = path;
  const copy = Array.isArray(obj) ? [...obj] : { ...obj };
  copy[head] = setAt(isGroup(obj) ? obj[head] : undefined, rest, value);
  return copy;
}
function typeOf(value, conf) {
  if (conf?.type)
    return conf.type;
  if (conf?.options)
    return "enum";
  if (value === null)
    return "null";
  if (Array.isArray(value))
    return "array";
  if (typeof value === "object")
    return "object";
  if (typeof value === "boolean")
    return "boolean";
  if (typeof value === "number")
    return "number";
  if (typeof value === "string") {
    if (/^#[0-9a-f]{6}$/i.test(value))
      return "color";
    if (/^\d{4}-\d{2}-\d{2}$/.test(value))
      return "date";
    if (value.includes(`
`))
      return "text";
  }
  return "string";
}
function confOf(root, path) {
  const sc = optionsOf(root).sourceConfig ?? {};
  return sc[pathKey(path)] ?? sc[path[path.length - 1]] ?? null;
}
function fill(cell, content) {
  if (content == null || content === false)
    return false;
  dfDollar5(cell).empty();
  if (content instanceof Node)
    dfDollar5(cell).append(content);
  else
    dfDollar5(cell).text(String(content));
  return true;
}
function defaultValue(cell, value, type) {
  dfDollar5(cell).empty();
  const span = document.createElement("span");
  if (type === "object" || type === "array") {
    span.className = "property-grid-summary";
    const n = Object.keys(value).length;
    dfDollar5(span).text(type === "array" ? `[${n} ${n === 1 ? "item" : "items"}]` : `{${n} ${n === 1 ? "property" : "properties"}}`);
  } else if (type === "boolean") {
    span.className = "property-grid-bool";
    span.dataset.value = String(value);
    dfDollar5(span).text(String(value));
  } else if (type === "color") {
    span.className = "property-grid-color";
    const swatch = document.createElement("i");
    swatch.className = "property-grid-swatch";
    swatch.style.background = value;
    swatch.setAttribute("aria-hidden", "true");
    dfDollar5(span).append(swatch).append(document.createTextNode(value));
  } else if (type === "json") {
    span.className = "property-grid-summary";
    dfDollar5(span).text(JSON.stringify(value));
  } else if (type === "null") {
    span.className = "property-grid-null";
    dfDollar5(span).text("null");
  } else {
    dfDollar5(span).text(String(value ?? ""));
  }
  dfDollar5(cell).append(span);
}
function rowsOf(root, source) {
  const out = [];
  const collapsed = new Set(configOf(root).collapsed ?? []);
  const sort = root.dataset.sort;
  const walk = (obj, path, depth) => {
    let keys = Object.keys(obj);
    if (!Array.isArray(obj) && (sort === "asc" || sort === "desc")) {
      keys = keys.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }) * (sort === "desc" ? -1 : 1));
    }
    for (const key of keys) {
      const p = [...path, key];
      const value = obj[key];
      const conf = confOf(root, p);
      if (conf?.hidden)
        continue;
      out.push({ path: p, key, value, depth, conf, type: typeOf(value, conf), group: isGroup(value) && !conf?.type });
      if (isGroup(value) && !conf?.type && !collapsed.has(pathKey(p)))
        walk(value, p, depth + 1);
    }
  };
  if (isGroup(source))
    walk(source, [], 0);
  return out;
}
function renderRows(root) {
  const { source = {} } = configOf(root);
  const opts = optionsOf(root);
  let table = dfDollar5(root).children(".property-grid-table").get(0);
  const focused = table?.contains(document.activeElement) ? document.activeElement.closest("tr")?.dataset.path : null;
  if (!table) {
    table = document.createElement("table");
    table.className = "property-grid-table";
    const head = document.createElement("thead");
    const tr = document.createElement("tr");
    for (const [label, cls] of [[root.dataset.keyLabel || "Property", "property-grid-key"], [root.dataset.valueLabel || "Value", "property-grid-value"]]) {
      const th = document.createElement("th");
      th.scope = "col";
      th.className = cls;
      dfDollar5(th).text(label);
      tr.append(th);
    }
    head.append(tr);
    if (root.hasAttribute("data-headless"))
      head.hidden = true;
    table.append(head, document.createElement("tbody"));
    dfDollar5(root).append(table);
  }
  const body = dfDollar5(table).children("tbody").get(0);
  dfDollar5(body).empty();
  const readonlyAll = root.hasAttribute("data-readonly");
  const rows = rowsOf(root, source);
  for (const row of rows) {
    const tr = document.createElement("tr");
    tr._path = row.path;
    tr.className = row.group ? "property-grid-group" : "property-grid-row";
    tr.dataset.path = pathKey(row.path);
    tr.dataset.type = row.type;
    if (row.depth)
      tr.style.setProperty("--depth", String(row.depth));
    const keyCell = document.createElement("th");
    keyCell.scope = "row";
    keyCell.className = "property-grid-key";
    const valueCell = document.createElement("td");
    valueCell.className = "property-grid-value";
    const ctx = { path: [...row.path], depth: row.depth, type: row.type, config: row.conf, source, grid: root };
    if (row.conf?.description)
      keyCell.title = row.conf.description;
    const keyText = document.createElement("span");
    keyText.className = "property-grid-label";
    if (!fill(keyText, opts.keyRenderFn?.(row.key, row.value, ctx)))
      dfDollar5(keyText).text(row.conf?.displayName ?? row.key);
    if (row.group) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "property-grid-toggle";
      const open = !(configOf(root).collapsed ?? []).includes(tr.dataset.path);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.tabIndex = -1;
      dfDollar5(toggle).append(keyText);
      dfDollar5(keyCell).append(toggle);
    } else {
      dfDollar5(keyCell).append(keyText);
    }
    if (!fill(valueCell, opts.valueRenderFn?.(row.value, row.key, ctx)))
      defaultValue(valueCell, row.value, row.type);
    const readonly = readonlyAll || row.conf?.readOnly || row.group && !opts.getEditorFn;
    if (readonly)
      tr.dataset.readonly = "";
    else
      valueCell.setAttribute("aria-label", `${row.conf?.displayName ?? row.key}: edit`);
    valueCell.tabIndex = -1;
    tr.append(keyCell, valueCell);
    body.append(tr);
  }
  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.className = "property-grid-empty";
    const td = document.createElement("td");
    td.colSpan = 2;
    dfDollar5(td).text(root.dataset.emptyText || "No properties.");
    tr.append(td);
    body.append(tr);
  }
  const target = focusTargets(root);
  const keep = target.find((t) => t.closest("tr")?.dataset.path === focused) ?? target.find((t) => t.closest("tr")?.dataset.path === root._current) ?? target[0];
  if (keep) {
    keep.tabIndex = 0;
    root._current = keep.closest("tr").dataset.path;
    if (focused)
      keep.focus();
  }
}
var focusTargets = (root) => dfDollar5(root).find(".property-grid-table > tbody > tr").toArray().map((tr) => tr.classList.contains("property-grid-group") ? dfDollar5(tr).find(".property-grid-toggle").get(0) : dfDollar5(tr).children(".property-grid-value").get(0)).filter(Boolean);
function moveFocus(root, from, by) {
  const targets = focusTargets(root);
  const at = targets.indexOf(from);
  const next = targets[by === Infinity ? targets.length - 1 : by === -Infinity ? 0 : Math.max(0, Math.min(targets.length - 1, at + by))];
  if (!next)
    return;
  for (const t of targets)
    t.tabIndex = -1;
  next.tabIndex = 0;
  root._current = next.closest("tr").dataset.path;
  next.focus();
}
function defaultEditor(type, value, conf) {
  let el;
  if (type === "boolean") {
    el = document.createElement("input");
    el.type = "checkbox";
    el.className = "switch";
    el.setAttribute("role", "switch");
    el.checked = !!value;
    return { el, getValue: () => el.checked, immediate: true };
  }
  if (type === "enum") {
    el = document.createElement("select");
    el.className = "select";
    el.dataset.size = "xs";
    for (const opt of conf?.options ?? []) {
      const o = document.createElement("option");
      const [v, label] = isGroup(opt) ? [opt.value, opt.label ?? opt.value] : [opt, opt];
      o.value = String(v);
      dfDollar5(o).text(String(label));
      if (v === value)
        o.selected = true;
      el.append(o);
    }
    const values = (conf?.options ?? []).map((o) => isGroup(o) ? o.value : o);
    return { el, getValue: () => values.find((v) => String(v) === el.value) ?? el.value, immediate: true };
  }
  if (type === "text" || type === "object" || type === "array" || type === "json") {
    el = document.createElement("textarea");
    el.className = "textarea";
    el.rows = type === "text" ? 3 : 5;
    const json = type !== "text";
    el.value = json ? JSON.stringify(value, null, 2) : String(value ?? "");
    return {
      el,
      multiline: true,
      getValue: () => json ? JSON.parse(el.value) : el.value,
      validate: () => {
        if (!json)
          return "";
        try {
          JSON.parse(el.value);
          return "";
        } catch (error) {
          return String(error.message ?? error);
        }
      }
    };
  }
  el = document.createElement("input");
  el.className = type === "color" ? "property-grid-color-input" : "input";
  if (type !== "color")
    el.dataset.size = "xs";
  el.type = type === "number" ? "number" : type === "color" ? "color" : type === "date" ? "date" : "text";
  if (type === "number") {
    el.step = conf?.step ?? "any";
    if (conf?.min != null)
      el.min = conf.min;
    if (conf?.max != null)
      el.max = conf.max;
    el.inputMode = "decimal";
  }
  el.value = value == null ? "" : String(value);
  return {
    el,
    immediate: type === "color" || type === "date",
    getValue: () => type === "number" ? el.value === "" ? null : el.valueAsNumber : type === "null" && el.value === "" ? null : el.value,
    validate: () => type === "number" && el.value !== "" && Number.isNaN(el.valueAsNumber) ? "not a number" : el.validity && !el.validity.valid ? el.validationMessage : ""
  };
}
function editorFor(root, row, value) {
  const conf = confOf(root, row._path);
  const type = row.dataset.type;
  const ctx = { path: [...row._path], type, config: conf, source: configOf(root).source, grid: root };
  const custom = optionsOf(root).getEditorFn?.(row._path[row._path.length - 1], value, ctx);
  if (custom === false)
    return null;
  if (custom instanceof HTMLElement) {
    const el = custom;
    return { el, immediate: el.type === "checkbox" || el.tagName === "SELECT", getValue: () => el.type === "checkbox" ? el.checked : el.type === "number" || el.type === "range" ? el.valueAsNumber : el.value };
  }
  if (custom && custom.el)
    return custom;
  return defaultEditor(type, value, conf);
}
function openEditor(root, path) {
  closeEditor(root);
  const row = dfDollar5(root).find(".property-grid-table > tbody > tr").toArray().find((tr) => tr.dataset.path === path);
  if (!row || row.hasAttribute("data-readonly"))
    return false;
  const cell = dfDollar5(row).children(".property-grid-value").get(0);
  const value = getAt(configOf(root).source, row._path);
  const editor = editorFor(root, row, value);
  if (!editor)
    return false;
  const wrap = document.createElement("div");
  wrap.className = "property-grid-editor";
  dfDollar5(wrap).append(editor.el);
  cell.dataset.editing = "";
  dfDollar5(cell).empty().append(wrap);
  root._editor = { path, row, cell, editor, value };
  const target = editor.el.matches?.("input, select, textarea, button, [tabindex]") ? editor.el : dfDollar5(editor.el).find("input, select, textarea, button, [tabindex]").get(0) ?? editor.el;
  (editor.focus ?? (() => target.focus?.()))();
  if (target.select && target.type !== "checkbox" && target.type !== "color" && target.type !== "date")
    target.select();
  return true;
}
function ruleProblem(conf, value) {
  if (!conf)
    return "";
  const say = (fallback) => conf.message || fallback;
  const empty = value === null || value === undefined || value === "" || Array.isArray(value) && !value.length;
  if (conf.required && empty)
    return say("Required");
  if (empty)
    return "";
  if (typeof value === "number") {
    if (Number.isNaN(value))
      return say("Not a number");
    if (conf.integer && !Number.isInteger(value))
      return say("Must be a whole number");
    if (conf.min != null && value < conf.min)
      return say(`Must be at least ${conf.min}`);
    if (conf.max != null && value > conf.max)
      return say(`Must be at most ${conf.max}`);
  }
  if (typeof value === "string") {
    if (conf.minLength != null && value.length < conf.minLength)
      return say(`At least ${conf.minLength} characters`);
    if (conf.maxLength != null && value.length > conf.maxLength)
      return say(`At most ${conf.maxLength} characters`);
    if (conf.pattern && !new RegExp(`^(?:${conf.pattern})$`).test(value))
      return say("Does not match the expected format");
  }
  if (Array.isArray(value)) {
    if (conf.minItems != null && value.length < conf.minItems)
      return say(`At least ${conf.minItems}`);
    if (conf.maxItems != null && value.length > conf.maxItems)
      return say(`At most ${conf.maxItems}`);
  }
  return "";
}
function showProblem(ed, control, problem) {
  control.setAttribute?.("aria-invalid", "true");
  const wrap = dfDollar5(ed.cell).children(".property-grid-editor").get(0) ?? ed.cell;
  let note = dfDollar5(wrap).children(".property-grid-error").get(0);
  if (!note) {
    note = document.createElement("div");
    note.className = "property-grid-error";
    note.setAttribute("role", "alert");
    note.id = `pg-error-${Math.random().toString(36).slice(2, 8)}`;
    dfDollar5(wrap).append(note);
    control.setAttribute?.("aria-describedby", note.id);
  }
  dfDollar5(note).text(problem);
}
function closeEditor(root) {
  if (!root._editor)
    return;
  root._editor = null;
  renderRows(root);
}
function commit(root, then = "stay") {
  const ed = root._editor;
  if (!ed)
    return true;
  const control = dfDollar5(ed.editor.el).find("input, select, textarea").get(0) ?? ed.editor.el;
  const { path, row } = ed;
  const key = row._path[row._path.length - 1];
  let problem = ed.editor.validate?.() ?? "";
  let value;
  if (!problem) {
    try {
      value = ed.editor.getValue();
    } catch (error) {
      problem = String(error.message ?? error);
    }
  }
  if (!problem)
    problem = ruleProblem(confOf(root, row._path), value);
  if (!problem) {
    const answer = optionsOf(root).validateFn?.(key, value, { path: [...row._path], type: row.dataset.type, config: confOf(root, row._path), source: configOf(root).source, grid: root });
    if (typeof answer === "string" && answer)
      problem = answer;
    else if (answer === false)
      problem = "Invalid value";
  }
  if (problem) {
    showProblem(ed, control, problem);
    return false;
  }
  const oldValue = ed.value;
  closeEditor(root);
  const same = JSON.stringify(value) === JSON.stringify(oldValue);
  const before = new CustomEvent("property-grid-beforechange", { bubbles: true, cancelable: true, detail: { path, key, value, oldValue } });
  if (same || !root.dispatchEvent(before)) {
    root.api.setState("default", { editing: null });
    restoreFocus(root, path, then);
    return true;
  }
  const source = setAt(configOf(root).source, row._path, value);
  root.api.setState("default", { source, editing: null });
  root.dispatchEvent(new CustomEvent("property-grid-change", { bubbles: true, detail: { path, key, value, oldValue, source: clone(source) } }));
  restoreFocus(root, path, then);
  return true;
}
function restoreFocus(root, path, then) {
  const target = focusTargets(root).find((t) => t.closest("tr").dataset.path === path);
  if (!target)
    return;
  if (then === "next" || then === "prev")
    moveFocus(root, target, then === "next" ? 1 : -1);
  else if (then === "stay")
    moveFocus(root, target, 0);
}
function applyMarkup5(el, state) {
  dfDollar5(el).attr("data-editing", state.name === "editing" && state.config?.editing ? String(state.config.editing) : null);
}
function triggerStateChange5(root, state, incoming) {
  root._config = state.config ?? {};
  applyMarkup5(root, state);
  const rebuild = !dfDollar5(root).children(".property-grid-table").get(0) || "source" in (incoming ?? {}) || "collapsed" in (incoming ?? {});
  if (rebuild) {
    root._editor = null;
    renderRows(root);
  }
  if (state.name === "editing" && state.config?.editing) {
    if (root._editor?.path !== state.config.editing) {
      if (!openEditor(root, state.config.editing))
        queueMicrotask(() => root.api.setState("default", { editing: null }));
    }
  } else if (root._editor) {
    closeEditor(root);
  }
}
var propertyGridApi = componentState5({
  component: "property-grid",
  states: propertyGridStates,
  mergeConfig: true,
  apply: (root, state, _previous, incoming) => triggerStateChange5(root, state, incoming),
  markup: (el, state) => applyMarkup5(el, state)
});
df$5.propertyGridApi = propertyGridApi;
df$5.propertyGridStates = propertyGridStates;
var resolve3 = (target) => typeof target === "string" ? dfDollar5(target).get(0) : target;
df$5.propertyGrid = {
  configure(target, options = {}) {
    const root = resolve3(target);
    if (!root)
      return null;
    const { source, ...rest } = options;
    root._options = { ...root._options, ...rest };
    if (!root.api) {
      if (source !== undefined)
        root._pendingSource = clone(source);
      return root;
    }
    if (source !== undefined)
      root.api.setState("default", { source: clone(source), editing: null });
    else
      root.api.setState(root.store.value.name, { collapsed: configOf(root).collapsed ?? [] });
    return root;
  },
  setSource(target, source) {
    const root = resolve3(target);
    if (!root)
      return;
    if (!root.api)
      root._pendingSource = clone(source ?? {});
    else
      root.api.setState("default", { source: clone(source ?? {}), editing: null, collapsed: [] });
  },
  getSource: (target) => clone(configOf(resolve3(target)).source ?? {}),
  setProperty(target, path, value) {
    const root = resolve3(target);
    if (!root)
      return;
    const p = toPath(path);
    const oldValue = getAt(configOf(root).source, p);
    const source = setAt(configOf(root).source, p, clone(value));
    root.api.setState(root.store.value.name === "editing" ? "default" : root.store.value.name, { source, editing: null });
    root.dispatchEvent(new CustomEvent("property-grid-change", { bubbles: true, detail: { path: pathKey(p), key: p[p.length - 1], value: clone(value), oldValue, source: clone(source) } }));
  },
  getProperty: (target, path) => clone(getAt(configOf(resolve3(target)).source, toPath(path))),
  edit: (target, path) => {
    resolve3(target)?.api.setState("editing", { editing: pathKey(toPath(path)) });
  },
  commit: (target) => commit(resolve3(target)),
  cancel: (target) => {
    resolve3(target)?.api.setState("default", { editing: null });
  },
  expand(target, path) {
    const root = resolve3(target);
    const key = pathKey(toPath(path));
    root?.api.setState(root.store.value.name, { collapsed: (configOf(root).collapsed ?? []).filter((p) => p !== key) });
  },
  collapse(target, path) {
    const root = resolve3(target);
    const key = pathKey(toPath(path));
    const collapsed = new Set(configOf(root)?.collapsed ?? []);
    collapsed.add(key);
    root?.api.setState(root.store.value.name, { collapsed: [...collapsed] });
  }
};
function toggleGroup(root, path) {
  const collapsed = new Set(configOf(root).collapsed ?? []);
  if (collapsed.has(path))
    collapsed.delete(path);
  else
    collapsed.add(path);
  root.api.setState("default", { collapsed: [...collapsed], editing: null });
}
function init5() {
  dfDollar5(".property-grid:not([data-init])").toArray().forEach((root) => {
    root.dataset.init = "";
    let source = root._pendingSource ?? {};
    const script = dfDollar5(root).children("script.property-grid-source").get(0);
    try {
      if (root._pendingSource)
        delete root._pendingSource;
      else if (script)
        source = JSON.parse(script.textContent || "{}");
      else if (root.dataset.source)
        source = JSON.parse(root.dataset.source);
    } catch (error) {
      console.error("[property-grid] invalid source JSON", error);
    }
    const conf = dfDollar5(root).children("script.property-grid-config").get(0);
    if (conf) {
      try {
        root._options = { ...root._options, sourceConfig: JSON.parse(conf.textContent || "{}") };
      } catch (error) {
        console.error("[property-grid] invalid config JSON", error);
      }
    }
    if (!root.getAttribute("role"))
      root.setAttribute("role", "group");
    dfDollar5(root).on("click", (e) => {
      const t = e.target;
      if (!t?.closest || t.closest(".property-grid-editor"))
        return;
      const toggle = t.closest(".property-grid-toggle");
      if (toggle) {
        toggleGroup(root, toggle.closest("tr").dataset.path);
        return;
      }
      const cell = t.closest(".property-grid-value");
      const row = cell?.closest("tr");
      if (!row || row.closest("thead") || row.hasAttribute("data-readonly"))
        return;
      root.api.setState("editing", { editing: row.dataset.path });
    });
    dfDollar5(root).on("keydown", (e) => {
      const t = e.target;
      if (root._editor && root._editor.cell.contains(t)) {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          const { path } = root._editor;
          root.api.setState("default", { editing: null });
          restoreFocus(root, path, "stay");
        } else if (e.key === "Enter" && (!(root._editor.editor.multiline || root._editor.editor.ownsEnter) || e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          commit(root);
        } else if (e.key === "Tab") {
          const targets = focusTargets(root);
          const at = targets.findIndex((x) => x.closest("tr") === root._editor.row);
          const edge = e.shiftKey ? at <= 0 : at >= targets.length - 1;
          if (!edge)
            e.preventDefault();
          commit(root, edge ? "none" : e.shiftKey ? "prev" : "next");
        }
        return;
      }
      const row = t.closest?.("tr");
      if (!row || !root.contains(row) || row.closest("thead"))
        return;
      const keys = { ArrowDown: 1, ArrowUp: -1, Home: -Infinity, End: Infinity, PageDown: 10, PageUp: -10 };
      if (e.key in keys) {
        e.preventDefault();
        moveFocus(root, t, keys[e.key]);
      } else if (row.classList.contains("property-grid-group") && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Enter" || e.key === " ")) {
        const open = !(configOf(root).collapsed ?? []).includes(row.dataset.path);
        if (e.key === "ArrowLeft" && open || e.key === "ArrowRight" && !open || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleGroup(root, row.dataset.path);
        }
      } else if ((e.key === "Enter" || e.key === "F2") && !row.hasAttribute("data-readonly")) {
        e.preventDefault();
        root.api.setState("editing", { editing: row.dataset.path });
      }
    });
    dfDollar5(root).on("change", (e) => {
      if (root._editor?.editor.immediate && root._editor.cell.contains(e.target))
        commit(root, "stay");
    });
    dfDollar5(root).on("focusout", (e) => {
      const ed = root._editor;
      if (!ed || !ed.cell.contains(e.target) || ed.cell.contains(e.relatedTarget))
        return;
      setTimeout(() => {
        if (root._editor === ed && !ed.cell.contains(document.activeElement))
          commit(root, "none");
      }, 0);
    });
    bindComponent5(root, propertyGridApi, { name: "default", config: { source, editing: null, collapsed: [] } });
    triggerStateChange5(root, { name: "default", config: { source, editing: null, collapsed: [] } }, { source });
  });
}
init5();
new MutationObserver(init5).observe(document, { childList: true, subtree: true });

// dist/components/window/window.js
var __df$core6 = globalThis.df$;
var __df$shared6 = __df$core6 && __df$core6.shadcn && __df$core6.shadcn.shared;
if (!__df$shared6 || __df$shared6.abi !== "0.9.6") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals6, defussQuery: defussQuery6, componentState: componentState6, bindComponent: bindComponent6 } = __df$shared6;
var df$6 = defussGlobals6();
var dfDollar6 = defussQuery6();
var windowStates = ["default", "maximized", "minimized", "closed"];
var topZ = 10;
var KEEP = 48;
var resolve4 = (target) => typeof target === "string" ? dfDollar6("#" + CSS.escape(target)).get(0) ?? dfDollar6(target).get(0) : target;
var titleOf = (w) => dfDollar6(w).find(".window-title").get(0)?.textContent?.trim() ?? "";
var posOf = (w) => ({ x: w.offsetLeft, y: w.offsetTop });
function moveTo(w, x, y) {
  const parent = w.offsetParent;
  const bar = dfDollar6(w).find(".window-titlebar").get(0);
  if (parent) {
    const ctl = dfDollar6(w).find(".window-controls").get(0)?.offsetWidth ?? 0;
    const maxX = parent.clientWidth - KEEP - ctl;
    const minX = KEEP + ctl - w.offsetWidth;
    const maxY = parent.clientHeight - (bar?.offsetHeight ?? KEEP);
    x = Math.min(Math.max(x, minX), maxX);
    y = Math.min(Math.max(y, 0), Math.max(maxY, 0));
  }
  w.style.setProperty("--window-x", `${Math.round(x)}px`);
  w.style.setProperty("--window-y", `${Math.round(y)}px`);
  return { x: Math.round(x), y: Math.round(y) };
}
function raise(w) {
  if (!w.open)
    return;
  if (w.hasAttribute("data-active") && Number(w.style.zIndex) === topZ)
    return;
  topZ += 1;
  w.style.zIndex = String(topZ);
  dfDollar6(".window[data-active]").toArray().forEach((o) => {
    if (o !== w)
      o.removeAttribute("data-active");
  });
  w.setAttribute("data-active", "");
  w.dispatchEvent(new CustomEvent("window-focus", { bubbles: true, detail: { title: titleOf(w) } }));
}
function showQuietly(w) {
  const prev = document.activeElement;
  w.show();
  if (prev && prev !== document.body && prev.isConnected && prev.focus)
    prev.focus({ preventScroll: true });
  else if (w.contains(document.activeElement))
    document.activeElement.blur();
}
function activateTopmost() {
  const open = Array.from(dfDollar6(".window[open]").toArray());
  if (!open.length)
    return;
  const top = open.reduce((a, b) => Number(b.style.zIndex || 0) > Number(a.style.zIndex || 0) ? b : a);
  raise(top);
}
function stashSize(w) {
  if (w._stash)
    return;
  w._stash = { width: w.style.width, height: w.style.height };
  w.style.width = "";
  w.style.height = "";
}
function restoreSize(w) {
  if (!w._stash)
    return;
  w.style.width = w._stash.width;
  w.style.height = w._stash.height;
  w._stash = null;
}
function applyMarkup6(el, stateName) {
  const open = stateName !== "closed";
  dfDollar6(el).attr("open", open ? "" : null);
  dfDollar6(el).attr("data-maximized", stateName === "maximized" ? "" : null);
  dfDollar6(el).attr("data-minimized", stateName === "minimized" ? "" : null);
  dfDollar6(el).find(".window-maximize").attr("aria-label", stateName === "maximized" ? "Restore" : "Maximize");
  dfDollar6(el).find(".window-minimize").attr("aria-label", stateName === "minimized" ? "Restore" : "Minimize");
}
function triggerStateChange6(w, stateName, config) {
  const maxBtn = dfDollar6(w).find(".window-maximize").get(0);
  if (stateName !== "closed" && !w.open)
    showQuietly(w);
  switch (stateName) {
    case "default":
      w.removeAttribute("data-maximized");
      w.removeAttribute("data-minimized");
      restoreSize(w);
      if (config.x !== undefined && config.y !== undefined)
        moveTo(w, Number(config.x), Number(config.y));
      raise(w);
      break;
    case "maximized":
      w.removeAttribute("data-minimized");
      stashSize(w);
      w.setAttribute("data-maximized", "");
      raise(w);
      break;
    case "minimized":
      w.removeAttribute("data-maximized");
      stashSize(w);
      w.setAttribute("data-minimized", "");
      break;
    case "closed":
      if (w.open)
        w.close();
      w.removeAttribute("data-maximized");
      w.removeAttribute("data-minimized");
      break;
  }
  if (maxBtn)
    maxBtn.setAttribute("aria-label", stateName === "maximized" ? "Restore" : "Maximize");
  dfDollar6(w).find(".window-minimize").get(0)?.setAttribute("aria-label", stateName === "minimized" ? "Restore" : "Minimize");
}
var windowApi = componentState6({
  component: "window",
  states: windowStates,
  apply: (w, state) => {
    w.dataset.stateName = state.name;
    triggerStateChange6(w, state.name, state.config);
  },
  read: (w, state) => {
    const name = !w.open ? "closed" : w.dataset.stateName || "default";
    return { name, config: name === "closed" ? {} : state.config };
  },
  markup: (el, state) => applyMarkup6(el, state.name)
});
df$6.windowApi = windowApi;
df$6.windowStates = windowStates;
function bindDrag(w, bar) {
  bar.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest("button, a, input, select, textarea"))
      return;
    raise(w);
    if (w.hasAttribute("data-maximized"))
      return;
    e.preventDefault();
    const start = posOf(w);
    const { clientX: sx, clientY: sy } = e;
    bar.setPointerCapture(e.pointerId);
    w.setAttribute("data-dragging", "");
    const onMove = (m) => moveTo(w, start.x + m.clientX - sx, start.y + m.clientY - sy);
    const onUp = () => {
      bar.removeEventListener("pointermove", onMove);
      bar.removeEventListener("pointerup", onUp);
      bar.removeEventListener("pointercancel", onUp);
      w.removeAttribute("data-dragging");
      w.dispatchEvent(new CustomEvent("window-move", { bubbles: true, detail: posOf(w) }));
    };
    bar.addEventListener("pointermove", onMove);
    bar.addEventListener("pointerup", onUp);
    bar.addEventListener("pointercancel", onUp);
  });
  bar.addEventListener("dblclick", (e) => {
    if (e.target.closest("button"))
      return;
    windowApi.setState(w, w.hasAttribute("data-maximized") ? "default" : "maximized", {});
  });
  bar.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 64 : 16;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d || w.hasAttribute("data-maximized") || e.target !== bar)
      return;
    e.preventDefault();
    const p = posOf(w);
    moveTo(w, p.x + d[0], p.y + d[1]);
    w.dispatchEvent(new CustomEvent("window-move", { bubbles: true, detail: posOf(w) }));
  });
}
function init6() {
  dfDollar6("dialog.window:not([data-init])").toArray().forEach((w) => {
    w.dataset.init = "";
    const bar = dfDollar6(w).find(":scope > .window-titlebar").get(0);
    if (bar) {
      if (!bar.hasAttribute("tabindex"))
        bar.tabIndex = 0;
      bindDrag(w, bar);
    }
    if (!w.hasAttribute("aria-labelledby") && !w.hasAttribute("aria-label")) {
      const title = dfDollar6(w).find(".window-title").get(0);
      if (title) {
        if (!title.id)
          title.id = `window-title-${Math.random().toString(36).slice(2, 8)}`;
        w.setAttribute("aria-labelledby", title.id);
      }
    }
    w.addEventListener("pointerdown", () => raise(w), true);
    w.addEventListener("focusin", () => raise(w));
    dfDollar6(w).find(".window-maximize").get(0)?.addEventListener("click", () => windowApi.setState(w, w.hasAttribute("data-maximized") ? "default" : "maximized", {}));
    dfDollar6(w).find(".window-close").get(0)?.addEventListener("click", (e) => {
      e.preventDefault();
      windowApi.setState(w, "closed", {});
    });
    dfDollar6(w).find(".window-minimize").get(0)?.addEventListener("click", () => windowApi.setState(w, w.hasAttribute("data-minimized") ? "default" : "minimized", {}));
    w.addEventListener("close", () => {
      if (w.open)
        return;
      w.dataset.stateName = "closed";
      w.removeAttribute("data-active");
      w.removeAttribute("data-maximized");
      w.removeAttribute("data-minimized");
      activateTopmost();
    });
    bindComponent6(w, windowApi);
    const initial = !w.open ? "closed" : w.hasAttribute("data-maximized") ? "maximized" : w.hasAttribute("data-minimized") ? "minimized" : "default";
    w.dataset.stateName = initial;
    dfDollar6(w).find(".window-maximize").attr("aria-label", initial === "maximized" ? "Restore" : "Maximize");
    dfDollar6(w).find(".window-minimize").attr("aria-label", initial === "minimized" ? "Restore" : "Minimize");
    if (w.open) {
      w.style.zIndex = String(++topZ);
      dfDollar6(".window[data-active]").toArray().forEach((o) => o.removeAttribute("data-active"));
      w.setAttribute("data-active", "");
    }
  });
}
function create(options = {}) {
  const { title = "Untitled", icon, content, html, statusbar, id, x, y, width, height, chrome, resizable = true, parent, focus = true, flush = false } = options;
  const host = resolve4(parent) ?? dfDollar6(".window-desktop").get(0) ?? document.body;
  const w = document.createElement("dialog");
  w.className = "window";
  if (id)
    w.id = id;
  if (chrome)
    w.dataset.chrome = chrome;
  if (resizable)
    w.setAttribute("data-resizable", "");
  const count = dfDollar6(host).find(":scope > .window").toArray().length;
  w.style.setProperty("--window-x", typeof x === "number" ? `${x}px` : x ?? `${24 + count % 8 * 28}px`);
  w.style.setProperty("--window-y", typeof y === "number" ? `${y}px` : y ?? `${24 + count % 8 * 28}px`);
  if (width !== undefined)
    w.style.setProperty("--window-w", typeof width === "number" ? `${width}px` : width);
  if (height !== undefined)
    w.style.setProperty("--window-h", typeof height === "number" ? `${height}px` : height);
  const bar = document.createElement("header");
  bar.className = "window-titlebar";
  if (icon) {
    const i = document.createElement("i");
    i.className = "window-icon";
    i.setAttribute("data-lucide", icon);
    bar.append(i);
  }
  const h = document.createElement("h2");
  h.className = "window-title";
  h.textContent = title;
  const controls = document.createElement("form");
  controls.method = "dialog";
  controls.className = "window-controls";
  for (const [cls, label, type] of [["window-minimize", "Minimize", "button"], ["window-maximize", "Maximize", "button"], ["window-close", "Close", "submit"]]) {
    const b = document.createElement("button");
    b.type = type;
    b.className = cls;
    b.setAttribute("aria-label", label);
    controls.append(b);
  }
  bar.append(h, controls);
  const body = document.createElement("div");
  body.className = "window-body";
  if (flush)
    body.setAttribute("data-flush", "");
  if (content instanceof Node)
    body.append(content);
  else if (typeof html === "string")
    body.append(document.createRange().createContextualFragment(html));
  else if (content !== undefined)
    body.textContent = String(content);
  w.append(bar, body);
  if (statusbar !== undefined) {
    const s = document.createElement("footer");
    s.className = "window-statusbar";
    s.textContent = String(statusbar);
    w.append(s);
  }
  host.append(w);
  init6();
  showQuietly(w);
  if (focus)
    windowApi.setState(w, "default", {});
  if (icon)
    globalThis.lucide?.createIcons?.();
  return w;
}
var list = (scope, all = false) => dfDollar6(resolve4(scope) ?? document).find(all ? ".window" : ".window[open]").toArray();
function cascade(scope, step = 28) {
  list(scope).sort((a, b) => Number(a.style.zIndex || 0) - Number(b.style.zIndex || 0)).forEach((w, i) => {
    windowApi.setState(w, "default", {});
    moveTo(w, 16 + i * step, 16 + i * step);
  });
}
function tile(scope) {
  const wins = list(scope);
  if (!wins.length)
    return;
  const cols = Math.ceil(Math.sqrt(wins.length));
  const rows = Math.ceil(wins.length / cols);
  wins.forEach((w, i) => {
    windowApi.setState(w, "default", {});
    const p = w.offsetParent;
    if (!p)
      return;
    const cw = p.clientWidth / cols, ch = p.clientHeight / rows;
    w.style.width = "";
    w.style.height = "";
    w.style.setProperty("--window-w", `${Math.floor(cw)}px`);
    w.style.setProperty("--window-h", `${Math.floor(ch)}px`);
    moveTo(w, i % cols * cw, Math.floor(i / cols) * ch);
  });
}
var windowActions = {
  create,
  open: (target, config = {}) => {
    const w = resolve4(target);
    if (w)
      windowApi.setState(w, "default", config);
    return w;
  },
  close: (target) => {
    const w = resolve4(target);
    if (w)
      windowApi.setState(w, "closed", {});
    return w;
  },
  focus: (target) => {
    const w = resolve4(target);
    if (w?.open)
      raise(w);
    return w;
  },
  move: (target, x, y) => {
    const w = resolve4(target);
    return w ? moveTo(w, x, y) : null;
  },
  resize: (target, width, height) => {
    const w = resolve4(target);
    if (!w)
      return null;
    w.style.width = "";
    w.style.height = "";
    w.style.setProperty("--window-w", typeof width === "number" ? `${width}px` : width);
    if (height !== undefined)
      w.style.setProperty("--window-h", typeof height === "number" ? `${height}px` : height);
    return w;
  },
  maximize: (target) => {
    const w = resolve4(target);
    if (w)
      windowApi.setState(w, "maximized", {});
    return w;
  },
  minimize: (target) => {
    const w = resolve4(target);
    if (w)
      windowApi.setState(w, "minimized", {});
    return w;
  },
  restore: (target) => {
    const w = resolve4(target);
    if (w)
      windowApi.setState(w, "default", {});
    return w;
  },
  toggleMaximize: (target) => {
    const w = resolve4(target);
    if (w)
      windowApi.setState(w, w.hasAttribute("data-maximized") ? "default" : "maximized", {});
    return w;
  },
  active: () => dfDollar6(".window[open][data-active]").get(0),
  list,
  cascade,
  tile
};
df$6.win = windowActions;
init6();
new MutationObserver(init6).observe(document, { childList: true, subtree: true });

//# debugId=E90E9B12A01968D564756E2164756E21
//# sourceMappingURL=application.js.map
