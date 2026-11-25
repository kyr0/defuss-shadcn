// dist/components/sidebar/sidebar.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.10.2") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { bindGlobalKeys, defussGlobals, defussQuery, componentState, bindComponent } = __df$shared;
var df$ = defussGlobals();
var dfDollar = defussQuery();
var sidebarStates = ["default", "collapsed"];
function applyMarkup(el, stateName) {
  dfDollar(el).attr("data-state", stateName === "collapsed" ? "collapsed" : "expanded");
}
function triggerStateChange(sidebar, stateName, _config) {
  switch (stateName) {
    case "default":
      sidebar.dataset.state = "expanded";
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
if (!__df$shared2 || __df$shared2.abi !== "0.10.2") {
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
    }).observe(wrapper, {
      attributes: true,
      attributeFilter: ["data-width", "data-height", "data-handles", "data-axis"]
    });
    wrapper.addEventListener("resizer-reset", () => resizerApi.setState(wrapper, "default"));
  });
}
init2();
new MutationObserver(init2).observe(document, { childList: true, subtree: true });

// dist/components/border-layout/border-layout.js
var __df$core3 = globalThis.df$;
var __df$shared3 = __df$core3 && __df$core3.shadcn && __df$core3.shadcn.shared;
if (!__df$shared3 || __df$shared3.abi !== "0.10.2") {
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
  layout.dispatchEvent(new CustomEvent("border-layout-collapse", {
    bubbles: true,
    detail: { region: side, collapsed }
  }));
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
var stackOf = (region) => {
  const pane = region && paneOf(region);
  return pane?.classList.contains("border-layout-stack") ? pane : null;
};
var panelsOf = (stack) => Array.from(stack.children).filter((c) => c.classList.contains("panel"));
var isRow = (stack, side) => stack.dataset.direction === "row" || stack.dataset.direction !== "column" && (side === "north" || side === "south");
var extent = (panel, row) => {
  const box = panel.getBoundingClientRect();
  return row ? box.width : box.height;
};
var minOf = (panel) => {
  const bar = dfDollar3(panel).children(".panel-header").get(0)?.getBoundingClientRect().height ?? 40;
  return num(panel.dataset.min, Math.round(bar + 32));
};
var open = (panel) => !panel.hidden && !panel.hasAttribute("data-minimized");
var titleOf = (panel) => dfDollar3(panel).find(":scope > .panel-header .panel-title").text().trim() || panel.getAttribute("aria-label") || "";
var keepOf = (stack) => stack.hasAttribute("data-exclusive") ? 1 : Math.max(0, Math.floor(num(stack.dataset.keep, 0)));
function keepOpen(stack, again) {
  const n = keepOf(stack);
  if (!n)
    return;
  const opened = panelsOf(stack).filter(open);
  const order = (stack._order ?? []).filter((p) => opened.includes(p));
  for (const p of opened)
    if (!order.includes(p))
      order.push(p);
  stack._order = order;
  const keep = new Set(order.slice(-n));
  for (const p of opened) {
    if (keep.has(p))
      continue;
    if (p.api)
      p.api.setState("minimized");
    else if ((stack._waits = (stack._waits ?? 0) + 1) < 50)
      setTimeout(again);
  }
}
var levelsOf = (stack) => stack.hasAttribute("data-levels");
function drill(stack, panels) {
  const was = stack._wasOpen;
  stack._wasOpen = new Set(panels.filter(open));
  if (!was || !stack.hasAttribute("data-drill"))
    return;
  const reopened = panels.find((p) => open(p) && !was.has(p) && stack._seen?.has(p));
  stack._seen = new Set(panels);
  if (reopened)
    dropAfter(stack, reopened);
}
function dropAfter(stack, panel) {
  const panels = panelsOf(stack);
  for (const p of panels.slice(panels.indexOf(panel) + 1)) {
    const d = p.previousElementSibling;
    if (d?.classList.contains("border-layout-stack-divider"))
      d.remove();
    p.remove();
  }
}
function report(stack, panels) {
  const detail = { panels, open: panels.filter(open) };
  const was = stack._reported;
  stack._reported = detail;
  const same = (a, b) => a.length === b.length && a.every((p, i) => p === b[i]);
  if (!was || same(was.panels, detail.panels) && same(was.open, detail.open))
    return;
  stack.dispatchEvent(new CustomEvent("border-layout-stack-change", { bubbles: true, detail }));
}
function syncStack(layout, side, region, stack) {
  keepOpen(stack, () => syncStack(layout, side, region, stack));
  drill(stack, panelsOf(stack));
  const row = isRow(stack, side);
  const panels = panelsOf(stack);
  if (!stack._seen)
    stack._seen = new Set(panels);
  for (const p of panels)
    stack._seen.add(p);
  for (const panel of panels.slice(1)) {
    const prev = panel.previousElementSibling;
    if (prev?.classList.contains("border-layout-stack-divider"))
      continue;
    dfDollar3(panel).before(dfDollar3(`<div class="border-layout-stack-divider" role="separator" aria-orientation="${row ? "vertical" : "horizontal"}" data-ce-chrome></div>`));
  }
  let last = null, pending = null;
  for (const child of Array.from(stack.children)) {
    if (child.classList.contains("border-layout-stack-divider")) {
      child._prev = child._next = null;
      if (last && !pending)
        pending = child;
      else if (!child.hidden)
        child.hidden = true;
    } else if (child.classList.contains("panel") && !child.hidden) {
      if (pending) {
        if (pending.hidden)
          pending.hidden = false;
        pending._prev = last;
        pending._next = child;
        pending = null;
      }
      last = child;
    }
  }
  if (pending && !pending.hidden)
    pending.hidden = true;
  for (const d of dfDollar3(stack).children(".border-layout-stack-divider").toArray())
    if (!d.nextElementSibling?.classList.contains("panel"))
      d.remove();
  const levels = levelsOf(stack);
  for (const d of dfDollar3(stack).children(".border-layout-stack-divider").toArray()) {
    const live = !d.hidden && open(d._prev) && (levels || open(d._next));
    d.setAttribute("aria-disabled", String(!live));
    d.tabIndex = live ? 0 : -1;
    if (!d._prev)
      continue;
    if (!d._prev.id)
      d._prev.id = `${stack.id || layout.id || "stack"}-${Math.random().toString(36).slice(2, 7)}`;
    d.setAttribute("aria-controls", d._prev.id);
    d.setAttribute("aria-label", `Resize ${titleOf(d._prev) || "panel"}`);
    if (live && levels) {
      d.setAttribute("aria-valuenow", String(Math.round(extent(d._prev, row))));
      d.setAttribute("aria-valuemin", String(minOf(d._prev)));
      d.setAttribute("aria-valuemax", String(maxLevel(d._prev)));
    } else if (live) {
      const both = extent(d._prev, row) + extent(d._next, row);
      d.setAttribute("aria-valuenow", String(Math.round(extent(d._prev, row))));
      d.setAttribute("aria-valuemin", String(minOf(d._prev)));
      d.setAttribute("aria-valuemax", String(Math.round(both - minOf(d._next))));
    }
  }
  if (stack.hasAttribute("data-drill"))
    for (const p of panels) {
      const header = dfDollar3(p).children(".panel-header").get(0);
      if (!header)
        continue;
      const crumb = p.hasAttribute("data-minimized");
      if (crumb) {
        header.tabIndex = 0;
        header.setAttribute("role", "button");
        header.setAttribute("aria-label", `Back to ${titleOf(p) || "this level"}`);
      } else if (header.getAttribute("role") === "button") {
        header.removeAttribute("tabindex");
        header.removeAttribute("role");
        header.removeAttribute("aria-label");
      }
    }
  const shown = panels.filter((p) => !p.hidden);
  const folded = shown.length > 0 && shown.every((p) => p.hasAttribute("data-minimized"));
  region.toggleAttribute("data-panel-minimized", folded);
  region.toggleAttribute("data-stack-closed", panels.length > 0 && !shown.length);
  const handle = region.classList.contains("resizer") ? dfDollar3(region).children(".resizer-handle").get(0) : null;
  if (handle)
    handle.inert = folded || !shown.length;
  report(stack, panels);
}
var maxLevel = (panel) => num(panel.dataset.max, 640);
function moveDivider(layout, side, divider, delta) {
  const { _prev: a, _next: b } = divider;
  const stack = divider.parentElement;
  if (a && levelsOf(stack)) {
    if (!open(a))
      return;
    const px = extent(a, true) + (side === "east" ? -delta : delta);
    a.style.setProperty("--panel-size", `${Math.round(Math.min(Math.max(px, minOf(a)), maxLevel(a)))}px`);
    return;
  }
  if (!a || !b || !open(a) || !open(b))
    return;
  const sizes = new Map(panelsOf(stack).filter(open).map((p) => [p, extent(p, isRow(stack, side))]));
  const both = sizes.get(a) + sizes.get(b);
  const next = Math.min(Math.max(sizes.get(a) + delta, minOf(a)), both - minOf(b));
  sizes.set(a, next);
  sizes.set(b, both - next);
  for (const [p, px] of sizes)
    p.style.setProperty("--border-layout-share", String(Math.round(px)));
}
function initStacks(layout) {
  for (const side of REGIONS) {
    const region = regionOf(layout, side);
    const stack = stackOf(region);
    if (!stack || stack._stackInit)
      continue;
    stack._stackInit = true;
    const sync = () => syncStack(layout, side, region, stack);
    sync();
    new MutationObserver((records) => {
      const panel = (r) => r.target.parentElement === stack && r.target.classList.contains("panel");
      if (records.some((r) => r.type === "childList" && r.target === stack || r.type === "attributes" && panel(r)))
        sync();
    }).observe(stack, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-minimized", "hidden"]
    });
    queueMicrotask(sync);
    stack.addEventListener("pointerdown", (e) => {
      const divider = e.target.closest?.(".border-layout-stack-divider");
      if (!divider || divider.parentElement !== stack || divider.getAttribute("aria-disabled") === "true")
        return;
      e.preventDefault();
      divider.setPointerCapture(e.pointerId);
      divider.setAttribute("data-resizing", "");
      let at = isRow(stack, side) ? e.clientX : e.clientY;
      const move = (ev) => {
        const pos = isRow(stack, side) ? ev.clientX : ev.clientY;
        moveDivider(layout, side, divider, pos - at);
        at = pos;
        sync();
      };
      const end = () => {
        divider.removeAttribute("data-resizing");
        divider.removeEventListener("pointermove", move);
        divider.removeEventListener("pointerup", end);
        divider.removeEventListener("pointercancel", end);
        save(layout);
      };
      divider.addEventListener("pointermove", move);
      divider.addEventListener("pointerup", end);
      divider.addEventListener("pointercancel", end);
    });
    const bar = (e) => {
      if (!stack.hasAttribute("data-drill"))
        return null;
      const header = e.target.closest?.(".panel-header");
      const panel = header?.parentElement;
      if (!panel || panel.parentElement !== stack || !panel.hasAttribute("data-minimized"))
        return null;
      if (e.target.closest(".panel-tools"))
        return null;
      return panel;
    };
    stack.addEventListener("click", (e) => bar(e)?.api?.setState("default"));
    stack.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ")
        return;
      const panel = bar(e);
      if (!panel)
        return;
      e.preventDefault();
      panel.api?.setState("default");
    });
    stack.addEventListener("keydown", (e) => {
      const divider = e.target.closest?.(".border-layout-stack-divider");
      if (!divider || divider.parentElement !== stack || divider.getAttribute("aria-disabled") === "true")
        return;
      const step = e.shiftKey ? 100 : 10;
      const back = isRow(stack, side) ? "ArrowLeft" : "ArrowUp", fwd = isRow(stack, side) ? "ArrowRight" : "ArrowDown";
      let delta = e.key === back ? -step : e.key === fwd ? step : e.key === "Home" ? -1e6 : e.key === "End" ? 1e6 : 0;
      if (!delta)
        return;
      if (levelsOf(stack) && side === "east" && (e.key === "Home" || e.key === "End"))
        delta = -delta;
      e.preventDefault();
      moveDivider(layout, side, divider, delta);
      sync();
      save(layout);
    });
  }
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
    const stack = stackOf(region);
    const weights = stack ? panelsOf(stack).map((p) => num(p.style.getPropertyValue("--border-layout-share"), 0) || null) : null;
    if (!region?.classList.contains("resizer")) {
      if (weights)
        data[side] = { stack: weights };
      continue;
    }
    const pane = paneOf(region);
    const px = Math.round(num(pane?.style[SIDES[side].size], NaN));
    data[side] = { size: Number.isFinite(px) ? px : null, collapsed: region.hasAttribute("data-collapsed") };
    if (weights)
      data[side].stack = weights;
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
    if (region.classList.contains("resizer"))
      region.toggleAttribute("data-collapsed", !!saved.collapsed);
    const stack = stackOf(region);
    if (stack && Array.isArray(saved.stack))
      panelsOf(stack).forEach((p, i) => {
        if (saved.stack[i])
          p.style.setProperty("--border-layout-share", String(saved.stack[i]));
      });
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
    initStacks(layout);
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
var resolveStack = (target) => {
  const el = typeof target === "string" ? dfDollar3(`#${CSS.escape(target)}`).get(0) ?? dfDollar3(target).get(0) : target;
  return el?.classList.contains("border-layout-stack") ? el : null;
};
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
  push: (stack, panel) => {
    const st = resolveStack(stack);
    if (!st)
      return null;
    const el = typeof panel === "string" ? dfDollar3(panel).get(0) : panel;
    if (!el)
      return null;
    el.removeAttribute("data-minimized");
    dfDollar3(st).append(el);
    return el;
  },
  pop: (stack, panel) => {
    const st = resolveStack(stack);
    if (!st)
      return null;
    const panels = panelsOf(st);
    const el = typeof panel === "number" ? panels[panel] : typeof panel === "string" ? panels.find((p) => p.id === panel) : panels.includes(panel) ? panel : undefined;
    if (!el)
      return null;
    dropAfter(st, el);
    const api = el.api;
    if (api)
      api.setState("default");
    else
      el.removeAttribute("data-minimized");
    return el;
  },
  levels: (stack) => {
    const st = resolveStack(stack);
    const panels = st ? panelsOf(st) : [];
    return { panels, open: panels.filter(open) };
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
if (!__df$shared4 || __df$shared4.abi !== "0.10.2") {
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
      panel.dispatchEvent(new CustomEvent("panel-change", {
        bubbles: true,
        detail: {
          state: state.name,
          previous: from,
          region: sideOf(regionOf2(panel))
        }
      }));
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
if (!__df$shared5 || __df$shared5.abi !== "0.10.2") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals5, defussQuery: defussQuery5, componentState: componentState5, bindComponent: bindComponent5, asEditor, builtinEditor, editorControl, editorKey, editorProblem, focusEditor, valueType } = __df$shared5;
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
var typeOf = (value, conf) => valueType(value, conf);
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
    for (const [label, cls] of [
      [root.dataset.keyLabel || "Property", "property-grid-key"],
      [root.dataset.valueLabel || "Value", "property-grid-value"]
    ]) {
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
var defaultEditor = (type, value, conf) => builtinEditor(type, value, conf, { colorClass: "property-grid-color-input" });
function editorFor(root, row, value) {
  const conf = confOf(root, row._path);
  const type = row.dataset.type;
  const ctx = { path: [...row._path], type, config: conf, source: configOf(root).source, grid: root };
  const custom = optionsOf(root).getEditorFn?.(row._path[row._path.length - 1], value, ctx);
  if (custom === false)
    return null;
  return asEditor(custom) ?? defaultEditor(type, value, conf);
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
  focusEditor(editor);
  return true;
}
var ruleProblem = (conf, value) => editorProblem(conf, value);
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
  const control = editorControl(ed.editor);
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
    const answer = optionsOf(root).validateFn?.(key, value, {
      path: [...row._path],
      type: row.dataset.type,
      config: confOf(root, row._path),
      source: configOf(root).source,
      grid: root
    });
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
  const before = new CustomEvent("property-grid-beforechange", {
    bubbles: true,
    cancelable: true,
    detail: { path, key, value, oldValue }
  });
  if (same || !root.dispatchEvent(before)) {
    root.api.setState("default", { editing: null });
    restoreFocus(root, path, then);
    return true;
  }
  const source = setAt(configOf(root).source, row._path, value);
  root.api.setState("default", { source, editing: null });
  root.dispatchEvent(new CustomEvent("property-grid-change", {
    bubbles: true,
    detail: { path, key, value, oldValue, source: clone(source) }
  }));
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
    root.api.setState(root.store.value.name === "editing" ? "default" : root.store.value.name, {
      source,
      editing: null
    });
    root.dispatchEvent(new CustomEvent("property-grid-change", {
      bubbles: true,
      detail: { path: pathKey(p), key: p[p.length - 1], value: clone(value), oldValue, source: clone(source) }
    }));
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
        const act = editorKey(e, root._editor.editor);
        if (act === "cancel") {
          e.preventDefault();
          e.stopPropagation();
          const { path } = root._editor;
          root.api.setState("default", { editing: null });
          restoreFocus(root, path, "stay");
        } else if (act === "commit") {
          e.preventDefault();
          commit(root);
        } else if (act === "next" || act === "prev") {
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

// dist/components/property-tree/property-tree.js
var __df$core6 = globalThis.df$;
var __df$shared6 = __df$core6 && __df$core6.shadcn && __df$core6.shadcn.shared;
if (!__df$shared6 || __df$shared6.abi !== "0.10.2") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals6, defussQuery: defussQuery6, componentState: componentState6, bindComponent: bindComponent6, virtualWindow, sizerHeight, scrollIntoViewTop, asEditor: asEditor2, builtinEditor: builtinEditor2, editorControl: editorControl2, editorKey: editorKey2, focusEditor: focusEditor2, valueType: valueType2 } = __df$shared6;
var df$6 = defussGlobals6();
var dfDollar6 = defussQuery6();
var propertyTreeStates = ["default", "editing"];
var DSON_URL = "https://cdn.jsdelivr.net/npm/defuss-dson@1.1.2/dist/index.mjs";
var dsonModule = null;
function loadDson(url = DSON_URL) {
  const vendorUrl = url;
  dsonModule ??= Promise.resolve().then(() => import(/* @vite-ignore */ vendorUrl)).then((m) => m.DSON ?? m.default);
  return dsonModule;
}
function kindOf(v) {
  if (v === null)
    return "null";
  const t = typeof v;
  if (t !== "object")
    return t;
  if (Array.isArray(v))
    return "array";
  if (v instanceof Map)
    return "map";
  if (v instanceof Set)
    return "set";
  if (v instanceof Date)
    return "date";
  if (v instanceof RegExp)
    return "regexp";
  if (v instanceof Error)
    return "error";
  if (ArrayBuffer.isView(v))
    return "typed";
  return "object";
}
var CONTAINERS = new Set(["object", "array", "map", "set"]);
var isContainer = (v) => CONTAINERS.has(kindOf(v));
function entries(v) {
  const kind = kindOf(v);
  if (kind === "array")
    return v.map((x, i) => [i, i, x]);
  if (kind === "map")
    return [...v].map(([k, x], i) => [i, k, x]);
  if (kind === "set")
    return [...v].map((x, i) => [i, i, x]);
  if (kind === "object")
    return Object.keys(v).map((k) => [k, k, v[k]]);
  return [];
}
var sizeOf2 = (v) => {
  const kind = kindOf(v);
  return kind === "map" || kind === "set" ? v.size : kind === "array" ? v.length : Object.keys(v).length;
};
function childAt(c, token) {
  const kind = kindOf(c);
  if (kind === "map")
    return [...c.values()][token];
  if (kind === "set")
    return [...c][token];
  return c?.[token];
}
function keyAt(c, token) {
  return kindOf(c) === "map" ? [...c.keys()][token] : token;
}
function refill(c, list) {
  c.clear();
  if (c instanceof Map)
    for (const [k, v] of list)
      c.set(k, v);
  else
    for (const v of list)
      c.add(v);
}
function setChild(c, token, value) {
  const kind = kindOf(c);
  if (kind === "map") {
    const list = [...c];
    list[token] = [list[token][0], value];
    refill(c, list);
  } else if (kind === "set") {
    const list = [...c];
    list[token] = value;
    refill(c, list);
  } else
    c[token] = value;
}
var pointerOf = (path) => path.map((t) => "/" + String(t).replace(/~/g, "~0").replace(/\//g, "~1")).join("");
function toPath2(p) {
  if (Array.isArray(p))
    return p;
  if (!p)
    return [];
  return p.split("/").slice(1).map((t) => t.replace(/~1/g, "/").replace(/~0/g, "~")).map((t) => /^\d+$/.test(t) ? Number(t) : t);
}
function locate(tree, path) {
  let parent = tree._holder;
  let token = "value";
  let node = tree._holder.value;
  for (const t of path) {
    if (!isContainer(node))
      return null;
    const tok = kindOf(node) === "object" ? String(t) : Number(t);
    parent = node;
    token = tok;
    node = childAt(node, tok);
  }
  return { parent, token, node };
}
function snapshot(c) {
  const kind = kindOf(c);
  if (kind === "map")
    return { kind, list: [...c] };
  if (kind === "set")
    return { kind, list: [...c] };
  if (kind === "array")
    return { kind, list: c.slice() };
  return { kind, list: Object.keys(c).map((k) => [k, c[k]]) };
}
function restore2(c, snap) {
  if (snap.kind === "map" || snap.kind === "set")
    refill(c, snap.list);
  else if (snap.kind === "array")
    c.splice(0, c.length, ...snap.list);
  else {
    for (const k of Object.keys(c))
      delete c[k];
    for (const [k, v] of snap.list)
      c[k] = v;
  }
}
function firstPaths(root) {
  const first = new Map;
  let level = [[root, []]];
  while (level.length) {
    const next = [];
    for (const [v, path] of level) {
      if (!isContainer(v) || first.has(v))
        continue;
      first.set(v, pointerOf(path));
      for (const [token, , child] of entries(v))
        if (isContainer(child))
          next.push([child, [...path, token]]);
    }
    level = next;
  }
  return first;
}
function summary(v, kind = kindOf(v)) {
  switch (kind) {
    case "string":
      return JSON.stringify(v);
    case "bigint":
      return `${v}n`;
    case "date":
      return Number.isNaN(v.getTime()) ? "Invalid Date" : v.toISOString();
    case "regexp":
    case "symbol":
      return String(v);
    case "function":
      return `ƒ ${v.name || "anonymous"}()`;
    case "error":
      return `${v.name}: ${v.message}`;
    case "typed":
      return `${v.constructor.name}(${v.length ?? v.byteLength}) [${Array.from(v.slice?.(0, 8) ?? []).join(", ")}${(v.length ?? 0) > 8 ? ", ..." : ""}]`;
    case "array": {
      const n = v.length;
      return `[${n} ${n === 1 ? "item" : "items"}]`;
    }
    case "map":
      return `Map(${v.size})`;
    case "set":
      return `Set(${v.size})`;
    case "object": {
      const n = Object.keys(v).length;
      return `{${n} ${n === 1 ? "key" : "keys"}}`;
    }
    default:
      return String(v);
  }
}
var keyLabel = (key, parentKind) => parentKind === "map" ? typeof key === "string" ? JSON.stringify(key) : summary(key) : String(key);
function buildRows(tree) {
  const root = tree._holder.value;
  const open = new Set(configOf2(tree).expanded ?? []);
  const first = tree._first;
  const rows = [];
  const walk = (v, path, depth, key, parentKind) => {
    const pointer = pointerOf(path);
    const kind = kindOf(v);
    const row = { path, pointer, depth, key, parentKind, value: v, kind };
    if (CONTAINERS.has(kind)) {
      const at = first.get(v);
      if (at !== pointer) {
        row.isRef = true;
        row.ref = at;
        row.cycle = pointer.startsWith(at + "/") || at === "";
      } else {
        row.container = true;
        row.count = sizeOf2(v);
        row.open = open.has(pointer);
      }
    }
    rows.push(row);
    if (row.container && row.open)
      for (const [token, k, child] of entries(v))
        walk(child, [...path, token], depth + 1, k, kind);
  };
  walk(root, [], 0, null, null);
  if (tree.hasAttribute("data-hide-root") && rows[0]?.container) {
    rows.shift();
    for (const r of rows)
      r.depth--;
  }
  tree._rows = rows;
}
var configOf2 = (tree) => tree._config ?? tree.store?.value.config ?? {};
var optionsOf2 = (tree) => tree._options ?? {};
var contextOf = (tree, row) => {
  const at = locate(tree, row.path);
  return {
    path: [...row.path],
    pointer: row.pointer,
    key: row.key,
    kind: row.kind,
    parent: row.path.length ? at?.parent : null,
    root: tree._holder.value,
    tree
  };
};
function fillRow(tree, el, row, index) {
  el._row = row;
  el._index = index;
  el.dataset.kind = row.kind;
  el.style.setProperty("--depth", String(row.depth));
  el.setAttribute("aria-level", String(row.depth + 1));
  if (row.container)
    el.setAttribute("aria-expanded", String(row.open));
  else
    el.removeAttribute("aria-expanded");
  el.toggleAttribute("data-ref", !!row.isRef);
  delete el.dataset.editing;
  const [toggle, key, value, type, actions] = el.children;
  toggle.toggleAttribute("data-leaf", !row.container);
  key.textContent = row.key === null ? tree.dataset.rootLabel ?? "root" : keyLabel(row.key, row.parentKind);
  key.dataset.keyKind = row.key === null ? "root" : row.parentKind === "object" ? "key" : row.parentKind === "map" ? "map" : "index";
  value.textContent = "";
  value.dataset.kind = row.kind;
  const custom = !row.isRef && optionsOf2(tree).renderValue?.(value, row.value, contextOf(tree, row));
  if (!custom) {
    if (row.isRef) {
      const link = document.createElement("button");
      link.type = "button";
      link.className = "property-tree-ref";
      link.tabIndex = -1;
      link.dataset.pointer = row.ref;
      link.textContent = `${row.cycle ? "cycle" : "ref"} ${row.ref || "/"}`;
      value.append(link);
    } else if (row.kind === "string" && /^#[0-9a-f]{6}$/i.test(row.value)) {
      const swatch = document.createElement("i");
      swatch.className = "property-tree-swatch";
      swatch.style.background = row.value;
      swatch.setAttribute("aria-hidden", "true");
      value.append(swatch, document.createTextNode(summary(row.value)));
    } else
      value.textContent = summary(row.value, row.kind);
  }
  type.textContent = row.isRef ? "ref" : row.kind === "typed" ? row.value.constructor.name : row.kind;
  actions.setAttribute("aria-label", `Actions for ${key.textContent}`);
  const label = key.textContent + ": " + (row.isRef ? `reference to ${row.ref || "the root"}` : summary(row.value, row.kind));
  el.setAttribute("aria-label", label);
}
function renderRows2(tree) {
  const pool = tree._pool;
  if (!pool || !tree._rows)
    return;
  const rows = tree._rows;
  const h = tree._rowHeight;
  const win = virtualWindow(tree._viewport.scrollTop, tree._viewport.clientHeight, h, rows.length);
  tree._sizer.style.height = `${sizerHeight(rows.length, h)}px`;
  while (pool.children.length < win.count) {
    const el = document.createElement("div");
    el.className = "property-tree-row";
    el.setAttribute("role", "treeitem");
    el.id = `${tree._uid}-row-${pool.children.length}`;
    for (const part of ["toggle", "key", "value", "type"]) {
      const span = document.createElement("span");
      span.className = `property-tree-${part}`;
      if (part === "toggle" || part === "type")
        span.setAttribute("aria-hidden", "true");
      el.append(span);
    }
    const actions = document.createElement("button");
    actions.type = "button";
    actions.className = "property-tree-actions";
    actions.tabIndex = -1;
    actions.setAttribute("aria-haspopup", "menu");
    el.append(actions);
    pool.append(el);
  }
  while (pool.children.length > win.count)
    pool.lastElementChild.remove();
  pool.style.translate = `0 ${win.shift}px`;
  const selected = configOf2(tree).selected ?? null;
  let active = null;
  let edShown = false;
  for (let i = 0;i < pool.children.length; i++) {
    const el = pool.children[i];
    const index = win.first + i;
    const row = rows[index];
    const key = `${tree._gen}:${index}`;
    if (el._key !== key) {
      el._key = key;
      fillRow(tree, el, row, index);
    }
    const ed = tree._editor;
    if (ed && ed.pointer === row.pointer) {
      edShown = true;
      if (!el.contains(ed.wrap)) {
        const focused = ed.wrap.contains(document.activeElement) || document.activeElement === document.body;
        placeEditor(el, ed);
        if (focused)
          editorControl2(ed.editor).focus({ preventScroll: true });
      }
    }
    el.setAttribute("aria-selected", String(row.pointer === selected));
    el.toggleAttribute("data-active", index === tree._active);
    if (index === tree._active)
      active = el;
  }
  if (active)
    tree._viewport.setAttribute("aria-activedescendant", active.id);
  else
    tree._viewport.removeAttribute("aria-activedescendant");
  if (tree._editor && !edShown && !tree._writing)
    queueMicrotask(() => {
      if (tree._editor && !commit2(tree, false))
        cancel(tree, false);
    });
}
function refresh(tree, structural = true) {
  if (structural)
    tree._first = firstPaths(tree._holder.value);
  buildRows(tree);
  tree._gen = (tree._gen || 0) + 1;
  tree._active = Math.max(0, Math.min(tree._rows.length - 1, tree._active ?? 0));
  renderRows2(tree);
}
function activate(tree, index) {
  const total = tree._rows?.length ?? 0;
  if (!total)
    return;
  tree._active = Math.max(0, Math.min(total - 1, index));
  const vp = tree._viewport;
  vp.scrollTop = scrollIntoViewTop(tree._active, vp.scrollTop, vp.clientHeight, tree._rowHeight, total);
  renderRows2(tree);
}
var indexOf = (tree, pointer) => tree._rows.findIndex((r) => r.pointer === pointer);
function change(tree, detail, containers, apply) {
  if (tree.hasAttribute("data-readonly"))
    return false;
  const before = new CustomEvent("property-tree-beforechange", {
    bubbles: true,
    cancelable: true,
    detail
  });
  if (!tree.dispatchEvent(before)) {
    tree._viewPatch = null;
    return false;
  }
  const unique = [...new Set(containers)];
  const was = unique.map((c) => [c, snapshot(c)]);
  apply();
  const now = unique.map((c) => [c, snapshot(c)]);
  tree._undo.push({ was, now, detail });
  tree._redo = [];
  done(tree, detail);
  return true;
}
function done(tree, detail) {
  tree._writing = true;
  const view = tree._viewPatch ?? {};
  tree._viewPatch = null;
  propertyTreeApi.setState(tree, "default", {
    ...view,
    version: (configOf2(tree).version ?? 0) + 1,
    editing: null,
    editingKey: false
  });
  refresh(tree);
  tree._writing = false;
  tree.dispatchEvent(new CustomEvent("property-tree-change", { bubbles: true, detail }));
}
function undoStep(tree, back) {
  const from = back ? tree._undo : tree._redo;
  const step = from.pop();
  if (!step)
    return false;
  for (const [c, snap] of back ? step.was : step.now)
    restore2(c, snap);
  (back ? tree._redo : tree._undo).push(step);
  done(tree, { ...step.detail, op: back ? "undo" : "redo" });
  return true;
}
function convert(value, kind) {
  const from = kindOf(value);
  const text = from === "string" ? value : CONTAINERS.has(from) ? "" : summary(value, from);
  switch (kind) {
    case "string":
      return from === "string" ? value : text;
    case "number": {
      const n = Number(from === "bigint" ? Number(value) : value);
      return Number.isFinite(n) ? n : 0;
    }
    case "boolean":
      return from === "string" ? value === "true" : !!value;
    case "null":
      return null;
    case "object":
      return from === "array" ? Object.assign({}, value) : from === "map" ? Object.fromEntries(value) : {};
    case "array":
      return from === "object" ? Object.values(value) : from === "set" || from === "map" ? [...value.values()] : [];
    case "map":
      return from === "object" ? new Map(Object.entries(value)) : new Map;
    case "set":
      return from === "array" ? new Set(value) : new Set;
    case "date":
      return new Date(from === "string" || from === "number" ? value : Date.now());
    case "bigint":
      try {
        return BigInt(from === "number" ? Math.trunc(value) : from === "string" ? value : 0);
      } catch {
        return 0n;
      }
    default:
      return value;
  }
}
function freeKey(c, name) {
  const has = (k) => c instanceof Map ? c.has(k) : Object.prototype.hasOwnProperty.call(c, k);
  if (!has(name))
    return name;
  let n = 2;
  while (has(`${name} ${n}`))
    n++;
  return `${name} ${n}`;
}
var ops = {
  set(tree, path, value) {
    const at = locate(tree, path);
    if (!at)
      return false;
    return change(tree, { op: "set", path, pointer: pointerOf(path), value, oldValue: at.node }, [at.parent], () => setChild(at.parent, at.token, value));
  },
  type(tree, path, kind) {
    const at = locate(tree, path);
    if (!at || kindOf(at.node) === kind)
      return false;
    const value = convert(at.node, kind);
    return change(tree, { op: "type", path, pointer: pointerOf(path), value, oldValue: at.node }, [at.parent], () => setChild(at.parent, at.token, value));
  },
  rename(tree, path, key) {
    const at = locate(tree, path);
    if (!at || !path.length)
      return false;
    const c = at.parent;
    const kind = kindOf(c);
    const old = keyAt(c, at.token);
    if (old === key || kind !== "object" && kind !== "map")
      return false;
    const newPath = kind === "object" ? [...path.slice(0, -1), String(key)] : path;
    return change(tree, { op: "rename", path: newPath, pointer: pointerOf(newPath), value: key, oldValue: old }, [c], () => {
      if (kind === "map")
        refill(c, [...c].map(([k, v]) => [k === old ? key : k, v]));
      else {
        const list = Object.keys(c).map((k) => [k === old ? String(key) : k, c[k]]);
        for (const k of Object.keys(c))
          delete c[k];
        for (const [k, v] of list)
          c[k] = v;
      }
      const before = pointerOf(path);
      const after = pointerOf(newPath);
      if (before !== after)
        tree._viewPatch = {
          expanded: (configOf2(tree).expanded ?? []).map((p) => p === before || p.startsWith(before + "/") ? after + p.slice(before.length) : p)
        };
    });
  },
  add(tree, path, key, value = "", index) {
    const at = locate(tree, path);
    if (!at || !isContainer(at.node))
      return null;
    const c = at.node;
    const kind = kindOf(c);
    let token;
    if (kind === "array")
      token = index ?? c.length;
    else if (kind === "set")
      token = c.size;
    else if (kind === "map")
      token = c.size;
    else
      token = freeKey(c, key == null ? "key" : String(key));
    const newPath = [...path, token];
    const ok = change(tree, { op: "add", path: newPath, pointer: pointerOf(newPath), value, oldValue: undefined }, [c], () => {
      if (kind === "array")
        c.splice(token, 0, value);
      else if (kind === "set")
        c.add(value);
      else if (kind === "map")
        c.set(freeKey(c, key == null ? "key" : key), value);
      else
        c[token] = value;
      const open = new Set(configOf2(tree).expanded ?? []);
      open.add(pointerOf(path));
      tree._viewPatch = { expanded: [...open] };
    });
    return ok ? newPath : null;
  },
  remove(tree, path) {
    const at = locate(tree, path);
    if (!at || !path.length)
      return false;
    const c = at.parent;
    const kind = kindOf(c);
    return change(tree, { op: "remove", path, pointer: pointerOf(path), value: undefined, oldValue: at.node }, [c], () => {
      if (kind === "array")
        c.splice(at.token, 1);
      else if (kind === "map" || kind === "set")
        refill(c, [...c].filter((_, i) => i !== at.token));
      else
        delete c[at.token];
    });
  },
  duplicate(tree, path) {
    const at = locate(tree, path);
    if (!at || !path.length)
      return null;
    const c = at.parent;
    const kind = kindOf(c);
    let copy;
    try {
      copy = structuredClone(at.node);
    } catch {
      copy = at.node;
    }
    let newPath = path;
    const ok = change(tree, { op: "add", path, pointer: pointerOf(path), value: copy, oldValue: undefined }, [c], () => {
      if (kind === "array") {
        c.splice(at.token + 1, 0, copy);
        newPath = [...path.slice(0, -1), at.token + 1];
      } else if (kind === "set") {
        const list = [...c];
        list.splice(at.token + 1, 0, copy);
        refill(c, list);
      } else if (kind === "map") {
        const list = [...c];
        const k = keyAt(c, at.token);
        list.splice(at.token + 1, 0, [
          freeKey(c, typeof k === "string" ? `${k} copy` : `${String(k)} copy`),
          copy
        ]);
        refill(c, list);
        newPath = [...path.slice(0, -1), at.token + 1];
      } else {
        const name = freeKey(c, `${at.token} copy`);
        const list = Object.keys(c).flatMap((k) => k === at.token ? [
          [k, c[k]],
          [name, copy]
        ] : [[k, c[k]]]);
        for (const k of Object.keys(c))
          delete c[k];
        for (const [k, v] of list)
          c[k] = v;
        newPath = [...path.slice(0, -1), name];
      }
    });
    return ok ? newPath : null;
  },
  move(tree, path, by) {
    const at = locate(tree, path);
    if (!at || !path.length)
      return null;
    const c = at.parent;
    const kind = kindOf(c);
    const keys = kind === "object" ? Object.keys(c) : null;
    const from = keys ? keys.indexOf(at.token) : at.token;
    const to = from + by;
    const size = keys ? keys.length : sizeOf2(c);
    if (to < 0 || to >= size)
      return null;
    const newPath = [...path.slice(0, -1), keys ? at.token : to];
    const ok = change(tree, { op: "move", path: newPath, pointer: pointerOf(newPath), value: to, oldValue: from }, [c], () => {
      const list = keys ? keys.map((k) => [k, c[k]]) : kind === "array" ? c.slice() : [...c];
      const [item] = list.splice(from, 1);
      list.splice(to, 0, item);
      if (kind === "array")
        c.splice(0, c.length, ...list);
      else if (kind === "map" || kind === "set")
        refill(c, list);
      else {
        for (const k of Object.keys(c))
          delete c[k];
        for (const [k, v] of list)
          c[k] = v;
      }
    });
    return ok ? newPath : null;
  }
};
function jsonSafe(v, seen = new Set) {
  const kind = kindOf(v);
  if (kind === "object" || kind === "array") {
    if (seen.has(v))
      return false;
    seen.add(v);
    return entries(v).every(([, , x]) => jsonSafe(x, seen));
  }
  return kind === "string" || kind === "boolean" || kind === "null" || kind === "number" && Number.isFinite(v);
}
function defaultEditor2(row) {
  const v = row.value;
  const input = (text, read, check) => {
    const el = document.createElement("input");
    el.className = "input";
    el.dataset.size = "xs";
    el.value = text;
    return { el, getValue: () => read(el.value), validate: () => check(el.value) };
  };
  switch (row.kind) {
    case "string":
    case "number":
    case "boolean":
      return builtinEditor2(valueType2(v), v, null, { colorClass: "property-tree-color-input" });
    case "null":
    case "undefined":
      return input("", (s) => {
        if (s.trim() === "")
          return row.kind === "null" ? null : undefined;
        try {
          return JSON.parse(s);
        } catch {
          return s;
        }
      }, () => "");
    case "bigint":
      return input(String(v), (s) => BigInt(s.trim()), (s) => /^\s*-?\d+\s*$/.test(s) ? "" : "A whole number");
    case "date": {
      const local = Number.isNaN(v.getTime()) ? "" : new Date(v.getTime() - v.getTimezoneOffset() * 60000).toISOString().slice(0, 23);
      const el = document.createElement("input");
      el.type = "datetime-local";
      el.step = "0.001";
      el.className = "input";
      el.dataset.size = "xs";
      el.value = local;
      return { el, getValue: () => new Date(el.value), validate: () => el.value ? "" : "A date and time" };
    }
    case "regexp":
      return input(String(v), (s) => {
        const m = /^\/(.*)\/([dgimsuvy]*)$/s.exec(s.trim());
        return m ? new RegExp(m[1], m[2]) : new RegExp(s);
      }, (s) => {
        try {
          const m = /^\/(.*)\/([dgimsuvy]*)$/s.exec(s.trim());
          if (m)
            new RegExp(m[1], m[2]);
          else
            new RegExp(s);
          return "";
        } catch (e) {
          return String(e.message);
        }
      });
    case "object":
    case "array":
      return jsonSafe(v) ? builtinEditor2("json", v) : null;
    default:
      return null;
  }
}
function placeEditor(el, ed) {
  ed.el = el;
  el.dataset.editing = ed.key ? "key" : "value";
  const cell = el.children[ed.key ? 1 : 2];
  cell.textContent = "";
  cell.append(ed.wrap);
}
function openEditor2(tree, pointer, key = false) {
  if (tree.hasAttribute("data-readonly"))
    return false;
  if (tree._editor && !commit2(tree, false))
    return false;
  const path = toPath2(pointer);
  if (indexOf(tree, pointer) < 0)
    reveal(tree, path);
  const index = indexOf(tree, pointer);
  const row = tree._rows[index];
  if (!row || row.isRef)
    return false;
  const ctx = contextOf(tree, row);
  let editor;
  if (key) {
    if (row.key === null || row.parentKind !== "object" && !(row.parentKind === "map" && typeof row.key === "string"))
      return false;
    const el = document.createElement("input");
    el.className = "input";
    el.dataset.size = "xs";
    el.value = String(row.key);
    editor = { el, getValue: () => el.value, validate: () => el.value === "" ? "A key" : "" };
  } else {
    const custom = optionsOf2(tree).getEditorFn?.([...row.path], row.value, ctx);
    if (custom === false)
      return false;
    editor = asEditor2(custom) ?? defaultEditor2(row);
  }
  if (!editor)
    return false;
  activate(tree, index);
  const wrap = document.createElement("span");
  wrap.className = "property-tree-editor";
  wrap.append(editor.el);
  const ed = { pointer, path: row.path, row, key, editor, wrap, el: null };
  tree._editor = ed;
  const el = dfDollar6(tree._pool).children(".property-tree-row").toArray().find((r) => r._index === index);
  if (el)
    placeEditor(el, ed);
  wrap.addEventListener("keydown", (e) => {
    e.stopPropagation();
    const act = editorKey2(e, editor);
    if (!act)
      return;
    e.preventDefault();
    if (act === "cancel")
      cancel(tree);
    else if (commit2(tree) && (act === "next" || act === "prev"))
      activate(tree, (tree._active ?? 0) + (act === "next" ? 1 : -1));
  });
  for (const type of ["click", "dblclick", "pointerdown"])
    wrap.addEventListener(type, (e) => e.stopPropagation());
  wrap.addEventListener("change", () => {
    if (editor.immediate)
      commit2(tree);
  });
  wrap.addEventListener("focusout", (e) => {
    if (wrap.contains(e.relatedTarget))
      return;
    setTimeout(() => {
      if (tree._editor === ed && !wrap.contains(document.activeElement))
        commit2(tree, false);
    }, 0);
  });
  tree._writing = true;
  propertyTreeApi.setState(tree, "editing", { editing: pointer, editingKey: key });
  tree._writing = false;
  focusEditor2(editor);
  return true;
}
function cancel(tree, focus = true) {
  if (!tree._editor)
    return;
  tree._editor = null;
  closeEditor2(tree, focus);
}
function closeEditor2(tree, focus) {
  tree._writing = true;
  propertyTreeApi.setState(tree, "default", { editing: null, editingKey: false });
  tree._writing = false;
  tree._gen++;
  renderRows2(tree);
  if (focus)
    tree._viewport.focus({ preventScroll: true });
}
function commit2(tree, focus = true) {
  const ed = tree._editor;
  if (!ed)
    return true;
  let problem = ed.editor.validate?.() ?? "";
  let value;
  if (!problem) {
    try {
      value = ed.editor.getValue();
    } catch (error) {
      problem = String(error.message ?? error);
    }
  }
  const ctx = { ...contextOf(tree, ed.row), kind: ed.key ? "key" : ed.row.kind };
  if (!problem && ed.key) {
    const at = locate(tree, ed.path);
    const c = at?.parent;
    const taken = c instanceof Map ? c.has(value) : Object.prototype.hasOwnProperty.call(c ?? {}, value);
    if (value !== ed.row.key && taken)
      problem = `"${value}" is already a key here`;
  }
  if (!problem) {
    const answer = optionsOf2(tree).validateFn?.([...ed.path], value, ctx);
    if (typeof answer === "string" && answer)
      problem = answer;
    else if (answer === false)
      problem = "Invalid value";
  }
  if (problem) {
    const control = editorControl2(ed.editor);
    control.setAttribute("aria-invalid", "true");
    let note = dfDollar6(ed.wrap).children(".property-tree-error").get(0);
    if (!note) {
      note = document.createElement("span");
      note.className = "property-tree-error";
      note.setAttribute("role", "alert");
      note.id = `pt-error-${Math.random().toString(36).slice(2, 8)}`;
      ed.wrap.append(note);
      control.setAttribute("aria-describedby", note.id);
    }
    dfDollar6(note).text(problem);
    return false;
  }
  tree._editor = null;
  let changed;
  if (ed.key)
    changed = value !== ed.row.key && ops.rename(tree, ed.path, value);
  else {
    const same = value === ed.row.value || typeof value !== "object" && Object.is(value, ed.row.value);
    changed = !same && ops.set(tree, ed.path, value);
  }
  if (!changed)
    closeEditor2(tree, false);
  else if (ed.key) {
    const at = indexOf(tree, pointerOf(ed.row.parentKind === "object" ? [...ed.path.slice(0, -1), String(value)] : ed.path));
    if (at >= 0)
      activate(tree, at);
  }
  if (focus)
    tree._viewport.focus({ preventScroll: true });
  return true;
}
var TYPES = ["string", "number", "boolean", "null", "object", "array", "map", "set", "date", "bigint"];
function menuFor(tree, row) {
  const readonly = tree.hasAttribute("data-readonly");
  const items = [];
  const isRoot = row.key === null;
  if (row.container)
    items.push({
      action: "add",
      label: row.kind === "object" || row.kind === "map" ? "Add property" : "Add item",
      disabled: readonly
    });
  if (row.container)
    items.push({ action: "toggle", label: row.open ? "Collapse" : "Expand" });
  if (row.isRef)
    items.push({ action: "follow", label: "Go to the first appearance" });
  if (!row.isRef)
    items.push({ action: "edit", label: "Edit value", disabled: readonly || !defaultEditor2(row) });
  if (!isRoot && (row.parentKind === "object" || row.parentKind === "map"))
    items.push({
      action: "rename",
      label: "Rename key",
      disabled: readonly || row.parentKind === "map" && typeof row.key !== "string"
    });
  if (!isRoot) {
    items.push({ action: "duplicate", label: "Duplicate", disabled: readonly, sep: true });
    items.push({ action: "up", label: "Move up", disabled: readonly });
    items.push({ action: "down", label: "Move down", disabled: readonly });
  }
  if (!row.isRef)
    TYPES.forEach((t, i) => items.push({ action: `type:${t}`, label: `As ${t}`, checked: row.kind === t, disabled: readonly, sep: i === 0 }));
  items.push({ action: "copy-path", label: "Copy path", sep: true });
  items.push({ action: "copy-json", label: "Copy as JSON" });
  if (!isRoot)
    items.push({ action: "remove", label: "Delete", disabled: readonly, sep: true });
  return items;
}
function openMenu(tree, index, anchor) {
  const row = tree._rows[index];
  if (!row)
    return;
  activate(tree, index);
  const menu = tree._menu;
  menu.textContent = "";
  for (const item of menuFor(tree, row)) {
    if (item.sep && menu.children.length) {
      const sep = document.createElement("div");
      sep.className = "property-tree-menu-separator";
      sep.setAttribute("role", "separator");
      menu.append(sep);
    }
    const b = document.createElement("button");
    b.type = "button";
    b.className = "property-tree-menu-item";
    b.dataset.action = item.action;
    b.setAttribute("role", item.checked !== undefined ? "menuitemradio" : "menuitem");
    if (item.checked !== undefined)
      b.setAttribute("aria-checked", String(item.checked));
    b.disabled = !!item.disabled;
    b.tabIndex = -1;
    b.textContent = item.label;
    menu.append(b);
  }
  menu._pointer = row.pointer;
  const el = anchor ?? dfDollar6(tree._pool).children(".property-tree-row").toArray().find((r) => r._index === index)?.lastElementChild;
  if (el) {
    for (const r of dfDollar6(tree._pool).find(".property-tree-actions").toArray())
      r.style.removeProperty("anchor-name");
    el.style.setProperty("anchor-name", `--${tree._uid}-menu`);
    el.setAttribute("aria-expanded", "true");
    menu._anchor = el;
  }
  menu.style.setProperty("position-anchor", `--${tree._uid}-menu`);
  if (!menu.matches(":popover-open"))
    menu.showPopover();
  dfDollar6(menu).children("button:not(:disabled)").get(0)?.focus();
}
async function runAction(tree, pointer, action) {
  const index = indexOf(tree, pointer);
  const row = tree._rows[index];
  if (!row)
    return;
  const path = row.path;
  if (action === "add") {
    const added = ops.add(tree, path, row.kind === "map" ? "key" : "key", "");
    if (added) {
      const p = pointerOf(added);
      openEditor2(tree, p, row.kind === "object" || row.kind === "map");
    }
  } else if (action === "toggle")
    toggle(tree, pointer);
  else if (action === "follow")
    reveal(tree, toPath2(row.ref), true);
  else if (action === "edit")
    openEditor2(tree, pointer);
  else if (action === "rename")
    openEditor2(tree, pointer, true);
  else if (action === "duplicate") {
    const p = ops.duplicate(tree, path);
    if (p)
      activate(tree, indexOf(tree, pointerOf(p)));
  } else if (action === "up" || action === "down") {
    const p = ops.move(tree, path, action === "up" ? -1 : 1);
    if (p)
      activate(tree, indexOf(tree, pointerOf(p)));
  } else if (action.startsWith("type:"))
    ops.type(tree, path, action.slice(5));
  else if (action === "remove")
    ops.remove(tree, path);
  else if (action === "copy-path")
    await navigator.clipboard?.writeText(pointer || "/").catch(() => {});
  else if (action === "copy-json")
    await navigator.clipboard?.writeText(toJson(row.value, 2)).catch(() => {});
  if (!tree._editor)
    tree._viewport.focus({ preventScroll: true });
}
function toJson(value, space) {
  const first = firstPaths(value);
  const seen = new Set;
  const plain = (v, pointer) => {
    const kind = kindOf(v);
    if (CONTAINERS.has(kind)) {
      if (seen.has(v) || first.get(v) !== pointer)
        return { $ref: first.get(v) || "#" };
      seen.add(v);
    }
    switch (kind) {
      case "array":
        return v.map((x, i) => plain(x, `${pointer}/${i}`));
      case "set":
        return [...v].map((x, i) => plain(x, `${pointer}/${i}`));
      case "map":
        return Object.fromEntries([...v].map(([k, x], i) => [String(k), plain(x, `${pointer}/${i}`)]));
      case "object":
        return Object.fromEntries(Object.keys(v).map((k) => [k, plain(v[k], `${pointer}/${k.replace(/~/g, "~0").replace(/\//g, "~1")}`)]));
      case "bigint":
        return String(v);
      case "date":
        return Number.isNaN(v.getTime()) ? null : v.toISOString();
      case "regexp":
        return String(v);
      case "typed":
        return Array.from(v);
      case "undefined":
      case "function":
      case "symbol":
        return null;
      case "error":
        return { name: v.name, message: v.message };
      default:
        return v;
    }
  };
  return JSON.stringify(plain(value, ""), null, space);
}
function setOpen(tree, pointers) {
  tree._writing = true;
  propertyTreeApi.setState(tree, tree.store.value.name, { expanded: pointers });
  tree._writing = false;
  refresh(tree, false);
}
function toggle(tree, pointer, open) {
  const set = new Set(configOf2(tree).expanded ?? []);
  const now = open ?? !set.has(pointer);
  if (now)
    set.add(pointer);
  else
    for (const p of [...set])
      if (p === pointer || p.startsWith(pointer + "/"))
        set.delete(p);
  setOpen(tree, [...set]);
}
function reveal(tree, path, select = false) {
  const set = new Set(configOf2(tree).expanded ?? []);
  for (let i = 0;i < path.length; i++)
    set.add(pointerOf(path.slice(0, i)));
  setOpen(tree, [...set]);
  const index = indexOf(tree, pointerOf(path));
  if (index < 0)
    return false;
  activate(tree, index);
  if (select)
    selectRow(tree, index);
  return true;
}
function selectRow(tree, index) {
  const row = tree._rows[index];
  if (!row)
    return;
  tree._writing = true;
  propertyTreeApi.setState(tree, tree.store.value.name, { selected: row.pointer });
  tree._writing = false;
  renderRows2(tree);
}
function applyMarkup6(el, state) {
  dfDollar6(el).attr("data-editing", state.name === "editing" && state.config?.editing != null ? String(state.config.editing) : null);
}
function triggerStateChange6(tree, state, incoming) {
  tree._config = state.config ?? {};
  applyMarkup6(tree, state);
  if (tree._writing || !tree._holder)
    return;
  if ("expanded" in (incoming ?? {}) || "version" in (incoming ?? {}))
    refresh(tree, "version" in (incoming ?? {}));
  else
    renderRows2(tree);
  if (state.name === "editing" && state.config?.editing != null) {
    if (tree._editor?.pointer !== state.config.editing || tree._editor?.key !== !!state.config.editingKey) {
      if (!openEditor2(tree, state.config.editing, !!state.config.editingKey))
        queueMicrotask(() => propertyTreeApi.setState(tree, "default", { editing: null, editingKey: false }));
    }
  } else if (tree._editor)
    cancel(tree, false);
}
var propertyTreeApi = componentState6({
  component: "property-tree",
  states: propertyTreeStates,
  mergeConfig: true,
  apply: (tree, state, _previous, incoming) => triggerStateChange6(tree, state, incoming),
  markup: (el, state) => applyMarkup6(el, state)
});
df$6.propertyTreeApi = propertyTreeApi;
df$6.propertyTreeStates = propertyTreeStates;
var resolve4 = (target) => typeof target === "string" ? dfDollar6(target).get(0) : target;
function setValue(tree, value) {
  tree._holder = { value };
  tree._undo = [];
  tree._redo = [];
  tree._active = 0;
  tree._editor = null;
  const open = isContainer(value) ? [""] : [];
  tree._writing = true;
  propertyTreeApi.setState(tree, "default", {
    expanded: open,
    selected: null,
    editing: null,
    editingKey: false,
    version: 0
  });
  tree._writing = false;
  refresh(tree);
}
df$6.propertyTree = {
  configure(target, options = {}) {
    const tree = resolve4(target);
    if (!tree)
      return null;
    const { value, ...rest } = options;
    tree._options = { ...tree._options, ...rest };
    if ("value" in options) {
      if (!tree.store)
        tree._pendingValue = { value };
      else
        setValue(tree, value);
    } else if (tree._holder)
      refresh(tree);
    return tree;
  },
  setValue(target, value) {
    const tree = resolve4(target);
    if (!tree.store)
      tree._pendingValue = { value };
    else
      setValue(tree, value);
  },
  value: (target) => resolve4(target)._holder?.value,
  json: (target, space) => toJson(resolve4(target)._holder?.value, space),
  async dson(target) {
    const tree = resolve4(target);
    const DSON = await loadDson(optionsOf2(tree).urls?.dson);
    return DSON.stringify(tree._holder?.value);
  },
  get: (target, path) => locate(resolve4(target), toPath2(path))?.node,
  set: (target, path, value) => ops.set(resolve4(target), toPath2(path), value),
  add: (target, path, key, value, index) => ops.add(resolve4(target), toPath2(path), key, value === undefined ? "" : value, index),
  remove: (target, path) => ops.remove(resolve4(target), toPath2(path)),
  rename: (target, path, key) => ops.rename(resolve4(target), toPath2(path), key),
  setType: (target, path, kind) => ops.type(resolve4(target), toPath2(path), kind),
  undo: (target) => undoStep(resolve4(target), true),
  redo: (target) => undoStep(resolve4(target), false),
  edit: (target, path, key = false) => openEditor2(resolve4(target), pointerOf(toPath2(path)), key),
  commit: (target) => commit2(resolve4(target)),
  cancel: (target) => cancel(resolve4(target)),
  reveal: (target, path) => reveal(resolve4(target), toPath2(path), true),
  expandAll(target, depth = Infinity) {
    const tree = resolve4(target);
    const out = [];
    const first = tree._first;
    const walk = (v, path) => {
      const pointer = pointerOf(path);
      if (!isContainer(v) || first.get(v) !== pointer || path.length > depth - 1)
        return;
      out.push(pointer);
      for (const [t, , x] of entries(v))
        walk(x, [...path, t]);
    };
    walk(tree._holder.value, []);
    setOpen(tree, out);
  },
  collapseAll(target) {
    setOpen(resolve4(target), [""]);
  }
};
var uid = 0;
function onKeydown(tree, e) {
  if (e.target.closest?.(".property-tree-editor, .property-tree-menu"))
    return;
  const index = tree._active ?? 0;
  const row = tree._rows?.[index];
  if (!row)
    return;
  const page = Math.max(1, Math.floor(tree._viewport.clientHeight / tree._rowHeight) - 1);
  const mod = e.ctrlKey || e.metaKey;
  if (mod && (e.key === "z" || e.key === "Z")) {
    e.preventDefault();
    undoStep(tree, !e.shiftKey);
    return;
  }
  if (mod && (e.key === "y" || e.key === "Y")) {
    e.preventDefault();
    undoStep(tree, false);
    return;
  }
  switch (e.key) {
    case "ArrowDown":
      if (e.altKey) {
        const p = ops.move(tree, row.path, 1);
        if (p)
          activate(tree, indexOf(tree, pointerOf(p)));
      } else
        activate(tree, index + 1);
      break;
    case "ArrowUp":
      if (e.altKey) {
        const p = ops.move(tree, row.path, -1);
        if (p)
          activate(tree, indexOf(tree, pointerOf(p)));
      } else
        activate(tree, index - 1);
      break;
    case "ArrowRight":
      if (row.container && !row.open)
        toggle(tree, row.pointer, true);
      else if (row.container)
        activate(tree, index + 1);
      break;
    case "ArrowLeft":
      if (row.container && row.open)
        toggle(tree, row.pointer, false);
      else if (row.path.length) {
        const parent = indexOf(tree, pointerOf(row.path.slice(0, -1)));
        if (parent >= 0)
          activate(tree, parent);
      }
      break;
    case "Home":
      activate(tree, 0);
      break;
    case "End":
      activate(tree, tree._rows.length - 1);
      break;
    case "PageDown":
      activate(tree, index + page);
      break;
    case "PageUp":
      activate(tree, index - page);
      break;
    case " ":
      selectRow(tree, index);
      break;
    case "Enter":
      if (row.isRef)
        reveal(tree, toPath2(row.ref), true);
      else if (row.container && !mod && !e.shiftKey)
        toggle(tree, row.pointer);
      else if (mod && row.container)
        runAction(tree, row.pointer, "add");
      else
        openEditor2(tree, row.pointer, e.shiftKey);
      break;
    case "F2":
      if (!openEditor2(tree, row.pointer, e.shiftKey))
        return;
      break;
    case "Insert":
      runAction(tree, row.container ? row.pointer : pointerOf(row.path.slice(0, -1)), "add");
      break;
    case "Delete":
      ops.remove(tree, row.path);
      break;
    case "Backspace":
      if (!mod)
        return;
      ops.remove(tree, row.path);
      break;
    case "d":
    case "D":
      if (!mod)
        return;
      runAction(tree, row.pointer, "duplicate");
      break;
    case "ContextMenu":
      openMenu(tree, index);
      break;
    case "F10":
      if (!e.shiftKey)
        return;
      openMenu(tree, index);
      break;
    default:
      return;
  }
  e.preventDefault();
}
function onMenuKey(tree, e) {
  const items = dfDollar6(tree._menu).children("button:not(:disabled)").toArray();
  const at = items.indexOf(document.activeElement);
  const go = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: items.length - 1 }[e.key];
  if (go !== undefined) {
    e.preventDefault();
    items[(go + items.length) % items.length]?.focus();
  } else if (e.key === "Escape" || e.key === "Tab") {
    e.preventDefault();
    tree._menu.hidePopover();
    tree._viewport.focus({ preventScroll: true });
  }
}
function init6() {
  dfDollar6(".property-tree:not([data-init])").toArray().forEach((tree) => {
    tree.dataset.init = "";
    tree._uid = tree.id || `property-tree-${++uid}`;
    const viewport = document.createElement("div");
    viewport.className = "property-tree-viewport";
    viewport.setAttribute("role", "tree");
    viewport.tabIndex = 0;
    viewport.setAttribute("aria-label", tree.getAttribute("aria-label") || "Value");
    if (tree.hasAttribute("data-readonly"))
      viewport.setAttribute("aria-readonly", "true");
    const sizer = document.createElement("div");
    sizer.className = "property-tree-sizer";
    const pool = document.createElement("div");
    pool.className = "property-tree-rows";
    pool.setAttribute("role", "presentation");
    sizer.append(pool);
    viewport.append(sizer);
    const menu = document.createElement("div");
    menu.className = "property-tree-menu";
    menu.setAttribute("popover", "");
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Node actions");
    dfDollar6(tree).append(viewport).append(menu);
    tree._viewport = viewport;
    tree._sizer = sizer;
    tree._pool = pool;
    tree._menu = menu;
    tree._rowHeight = parseFloat(getComputedStyle(tree).getPropertyValue("--property-tree-row-height")) || 28;
    tree._undo = [];
    tree._redo = [];
    let queued = false;
    viewport.addEventListener("scroll", () => {
      if (queued)
        return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        renderRows2(tree);
      });
    }, { passive: true });
    new ResizeObserver(() => renderRows2(tree)).observe(viewport);
    viewport.addEventListener("keydown", (e) => onKeydown(tree, e));
    viewport.addEventListener("click", (e) => {
      const t = e.target;
      const el = t.closest?.(".property-tree-row");
      if (!el || !pool.contains(el))
        return;
      tree._active = el._index;
      if (t.closest(".property-tree-actions"))
        return openMenu(tree, el._index, t.closest(".property-tree-actions"));
      if (t.closest(".property-tree-ref"))
        return reveal(tree, toPath2(el._row.ref), true);
      if (t.closest(".property-tree-toggle") && el._row.container)
        return toggle(tree, el._row.pointer);
      selectRow(tree, el._index);
    });
    viewport.addEventListener("dblclick", (e) => {
      const t = e.target;
      const el = t.closest?.(".property-tree-row");
      if (!el || !pool.contains(el) || t.closest(".property-tree-toggle, .property-tree-actions"))
        return;
      const onKey = !!t.closest(".property-tree-key");
      if (openEditor2(tree, el._row.pointer, onKey && el._row.key !== null))
        e.preventDefault();
      else if (el._row.container)
        toggle(tree, el._row.pointer);
    });
    menu.addEventListener("click", (e) => {
      const b = e.target.closest?.(".property-tree-menu-item");
      if (!b || b.disabled)
        return;
      menu.hidePopover();
      runAction(tree, menu._pointer, b.dataset.action);
    });
    menu.addEventListener("keydown", (e) => onMenuKey(tree, e));
    menu.addEventListener("toggle", (e) => {
      if (e.newState === "closed")
        menu._anchor?.setAttribute("aria-expanded", "false");
    });
    const script = dfDollar6(tree).children("script.property-tree-source").get(0);
    const config = { expanded: [], selected: null, editing: null, editingKey: false, version: 0 };
    bindComponent6(tree, propertyTreeApi, { name: "default", config });
    if (tree._pendingValue) {
      setValue(tree, tree._pendingValue.value);
      delete tree._pendingValue;
    } else if (script && script.type === "application/dson") {
      tree.dataset.loading = "";
      setValue(tree, undefined);
      loadDson(optionsOf2(tree).urls?.dson).then((DSON) => {
        if (tree._holder.value === undefined)
          setValue(tree, DSON.parse(script.textContent || "null"));
      }).catch((error) => console.error("[property-tree] DSON source", error)).finally(() => delete tree.dataset.loading);
    } else {
      let value = {};
      try {
        if (script)
          value = JSON.parse(script.textContent || "null");
      } catch (error) {
        console.error("[property-tree] invalid source JSON", error);
      }
      setValue(tree, value);
    }
  });
}
init6();
new MutationObserver(init6).observe(document, { childList: true, subtree: true });

// dist/components/window/window.js
var __df$core7 = globalThis.df$;
var __df$shared7 = __df$core7 && __df$core7.shadcn && __df$core7.shadcn.shared;
if (!__df$shared7 || __df$shared7.abi !== "0.10.2") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals7, defussQuery: defussQuery7, componentState: componentState7, bindComponent: bindComponent7 } = __df$shared7;
var df$7 = defussGlobals7();
var dfDollar7 = defussQuery7();
var windowStates = ["default", "maximized", "minimized", "closed"];
var topZ = 10;
var KEEP = 48;
var resolve5 = (target) => typeof target === "string" ? dfDollar7("#" + CSS.escape(target)).get(0) ?? dfDollar7(target).get(0) : target;
var titleOf2 = (w) => dfDollar7(w).find(".window-title").get(0)?.textContent?.trim() ?? "";
var posOf = (w) => ({ x: w.offsetLeft, y: w.offsetTop });
function moveTo(w, x, y, bounded = true) {
  const parent = w.offsetParent;
  const bar = dfDollar7(w).find(".window-titlebar").get(0);
  if (parent && bounded) {
    const ctl = dfDollar7(w).find(".window-controls").get(0)?.offsetWidth ?? 0;
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
var deskOf = (w) => w.parentElement?.closest(".window-manager, .window-desktop") ?? document;
function raise(w) {
  if (!w.open)
    return;
  if (w.hasAttribute("data-active") && Number(w.style.zIndex) === topZ)
    return;
  topZ += 1;
  w.style.zIndex = String(topZ);
  dfDollar7(deskOf(w)).find(".window[data-active]").toArray().forEach((o) => {
    if (o !== w && deskOf(o) === deskOf(w))
      o.removeAttribute("data-active");
  });
  w.setAttribute("data-active", "");
  w.dispatchEvent(new CustomEvent("window-focus", { bubbles: true, detail: { title: titleOf2(w) } }));
}
function showQuietly(w) {
  const prev = document.activeElement;
  w.show();
  if (prev && prev !== document.body && prev.isConnected && prev.focus)
    prev.focus({ preventScroll: true });
  else if (w.contains(document.activeElement))
    document.activeElement.blur();
}
function activateTopmost(closed) {
  const desk = deskOf(closed);
  const open = dfDollar7(desk).find(".window[open]").toArray().filter((o) => deskOf(o) === desk);
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
function applyMarkup7(el, stateName) {
  const open = stateName !== "closed";
  dfDollar7(el).attr("open", open ? "" : null);
  dfDollar7(el).attr("data-maximized", stateName === "maximized" ? "" : null);
  dfDollar7(el).attr("data-minimized", stateName === "minimized" ? "" : null);
  dfDollar7(el).find(".window-maximize").attr("aria-label", stateName === "maximized" ? "Restore" : "Maximize");
  dfDollar7(el).find(".window-minimize").attr("aria-label", stateName === "minimized" ? "Restore" : "Minimize");
}
function triggerStateChange7(w, stateName, config) {
  const maxBtn = dfDollar7(w).find(".window-maximize").get(0);
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
  dfDollar7(w).find(".window-minimize").get(0)?.setAttribute("aria-label", stateName === "minimized" ? "Restore" : "Minimize");
}
var windowApi = componentState7({
  component: "window",
  states: windowStates,
  apply: (w, state) => {
    w.dataset.stateName = state.name;
    triggerStateChange7(w, state.name, state.config);
  },
  read: (w, state) => {
    const name = !w.open ? "closed" : w.dataset.stateName || "default";
    return { name, config: name === "closed" ? {} : state.config };
  },
  markup: (el, state) => applyMarkup7(el, state.name)
});
df$7.windowApi = windowApi;
df$7.windowStates = windowStates;
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
    const free = !!w.closest("[data-share]");
    const onMove = (m) => moveTo(w, start.x + m.clientX - sx, start.y + m.clientY - sy, !free);
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
function init7() {
  dfDollar7("dialog.window:not([data-init])").toArray().forEach((w) => {
    w.dataset.init = "";
    const bar = dfDollar7(w).find(":scope > .window-titlebar").get(0);
    if (bar) {
      if (!bar.hasAttribute("tabindex"))
        bar.tabIndex = 0;
      bindDrag(w, bar);
    }
    if (!w.hasAttribute("aria-labelledby") && !w.hasAttribute("aria-label")) {
      const title = dfDollar7(w).find(".window-title").get(0);
      if (title) {
        if (!title.id)
          title.id = `window-title-${Math.random().toString(36).slice(2, 8)}`;
        w.setAttribute("aria-labelledby", title.id);
      }
    }
    w.addEventListener("pointerdown", () => raise(w), true);
    w.addEventListener("focusin", () => raise(w));
    dfDollar7(w).find(".window-maximize").get(0)?.addEventListener("click", () => windowApi.setState(w, w.hasAttribute("data-maximized") ? "default" : "maximized", {}));
    dfDollar7(w).find(".window-close").get(0)?.addEventListener("click", (e) => {
      e.preventDefault();
      windowApi.setState(w, "closed", {});
    });
    dfDollar7(w).find(".window-minimize").get(0)?.addEventListener("click", () => windowApi.setState(w, w.hasAttribute("data-minimized") ? "default" : "minimized", {}));
    w.addEventListener("close", () => {
      if (w.open)
        return;
      w.dataset.stateName = "closed";
      w.removeAttribute("data-active");
      w.removeAttribute("data-maximized");
      w.removeAttribute("data-minimized");
      activateTopmost(w);
    });
    bindComponent7(w, windowApi);
    const initial = !w.open ? "closed" : w.hasAttribute("data-maximized") ? "maximized" : w.hasAttribute("data-minimized") ? "minimized" : "default";
    w.dataset.stateName = initial;
    dfDollar7(w).find(".window-maximize").attr("aria-label", initial === "maximized" ? "Restore" : "Maximize");
    dfDollar7(w).find(".window-minimize").attr("aria-label", initial === "minimized" ? "Restore" : "Minimize");
    if (w.open) {
      w.style.zIndex = String(++topZ);
      dfDollar7(deskOf(w)).find(".window[data-active]").toArray().forEach((o) => {
        if (deskOf(o) === deskOf(w))
          o.removeAttribute("data-active");
      });
      w.setAttribute("data-active", "");
    }
  });
}
function create(options = {}) {
  const { title = "Untitled", icon, content, html, statusbar, id, x, y, width, height, chrome, resizable = true, parent, focus = true, flush = false } = options;
  const host = resolve5(parent) ?? dfDollar7(".window-desktop").get(0) ?? document.body;
  const w = document.createElement("dialog");
  w.className = "window";
  if (id)
    w.id = id;
  if (chrome)
    w.dataset.chrome = chrome;
  if (resizable)
    w.setAttribute("data-resizable", "");
  const count = dfDollar7(host).find(":scope > .window").toArray().length;
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
  for (const [cls, label, type] of [
    ["window-minimize", "Minimize", "button"],
    ["window-maximize", "Maximize", "button"],
    ["window-close", "Close", "submit"]
  ]) {
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
  init7();
  showQuietly(w);
  if (focus)
    windowApi.setState(w, "default", {});
  if (icon)
    globalThis.lucide?.createIcons?.();
  return w;
}
var list = (scope, all = false) => dfDollar7(resolve5(scope) ?? document).find(all ? ".window" : ".window[open]").toArray();
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
    const w = resolve5(target);
    if (w)
      windowApi.setState(w, "default", config);
    return w;
  },
  close: (target) => {
    const w = resolve5(target);
    if (w)
      windowApi.setState(w, "closed", {});
    return w;
  },
  focus: (target) => {
    const w = resolve5(target);
    if (w?.open)
      raise(w);
    return w;
  },
  move: (target, x, y, bounded = true) => {
    const w = resolve5(target);
    return w ? moveTo(w, x, y, bounded) : null;
  },
  resize: (target, width, height) => {
    const w = resolve5(target);
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
    const w = resolve5(target);
    if (w)
      windowApi.setState(w, "maximized", {});
    return w;
  },
  minimize: (target) => {
    const w = resolve5(target);
    if (w)
      windowApi.setState(w, "minimized", {});
    return w;
  },
  restore: (target) => {
    const w = resolve5(target);
    if (w)
      windowApi.setState(w, "default", {});
    return w;
  },
  toggleMaximize: (target) => {
    const w = resolve5(target);
    if (w)
      windowApi.setState(w, w.hasAttribute("data-maximized") ? "default" : "maximized", {});
    return w;
  },
  active: () => dfDollar7(".window[open][data-active]").toArray().reduce((a, b) => !a || Number(b.style.zIndex || 0) > Number(a.style.zIndex || 0) ? b : a, undefined),
  list,
  cascade,
  tile
};
df$7.win = windowActions;
init7();
new MutationObserver(init7).observe(document, { childList: true, subtree: true });

// dist/components/doc-comments/doc-comments.js
var __df$core8 = globalThis.df$;
var __df$shared8 = __df$core8 && __df$core8.shadcn && __df$core8.shadcn.shared;
if (!__df$shared8 || __df$shared8.abi !== "0.10.2") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals8, defussQuery: defussQuery8, componentState: componentState8, bindComponent: bindComponent8 } = __df$shared8;
var df$8 = defussGlobals8();
var dfDollar8 = defussQuery8();
var docCommentsStates = ["default", "current"];
var FLASH_MS = 1600;
var ICONS = {
  up: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>',
  down: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  reply: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>',
  quote: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/></svg>',
  link: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 10 20 15 15 20"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/></svg>'
};
var esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
function renderMarkdown(md) {
  const inline = (t) => esc(t).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>").replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/\n/g, "<br>");
  return md.trim().split(/\n\s*\n/).map((p) => `<p>${inline(p.trim())}</p>`).join("");
}
var initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
function formatTime(iso) {
  if (!iso)
    return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()))
    return iso;
  const sameDay = d.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat(undefined, sameDay ? { hour: "numeric", minute: "2-digit" } : { month: "short", day: "numeric" }).format(d);
}
function documentOf(el) {
  const id = dfDollar8(el).attr("data-for");
  return id ? dfDollar8("#" + CSS.escape(id)).get(0) ?? null : el.previousElementSibling;
}
function blockOf(root, id) {
  return dfDollar8(root).find(`[data-id="${CSS.escape(id)}"]`).get(0) ?? dfDollar8(root).find("#" + CSS.escape(id)).get(0) ?? (root.id === id ? root : null);
}
function findRange(block, text, occurrence = 0) {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let all = "";
  let n;
  while (n = walker.nextNode()) {
    nodes.push(n);
    all += n.data;
  }
  let from = 0;
  let at = -1;
  for (let i = 0;i <= occurrence; i++) {
    at = all.indexOf(text, from);
    if (at < 0)
      return null;
    from = at + 1;
  }
  const range = document.createRange();
  let offset = 0;
  let started = false;
  for (const node of nodes) {
    const end = offset + node.data.length;
    if (!started && at < end) {
      range.setStart(node, at - offset);
      started = true;
    }
    if (started && at + text.length <= end) {
      range.setEnd(node, at + text.length - offset);
      return range;
    }
    offset = end;
  }
  return null;
}
function wrapRange(range, make) {
  const marks = [];
  const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let n;
  if (range.commonAncestorContainer.nodeType === Node.TEXT_NODE)
    nodes.push(range.commonAncestorContainer);
  while (n = walker.nextNode())
    if (range.intersectsNode(n))
      nodes.push(n);
  const { startContainer, startOffset, endContainer, endOffset } = range;
  for (const node of nodes) {
    let target = node;
    let endCut = node === endContainer ? endOffset : -1;
    if (node === startContainer && startOffset > 0) {
      target = node.splitText(startOffset);
      if (endCut >= 0)
        endCut -= startOffset;
    }
    if (endCut >= 0 && endCut < target.data.length)
      target.splitText(endCut);
    if (!target.data)
      continue;
    const mark = make();
    target.before(mark);
    mark.append(target);
    marks.push(mark);
  }
  return marks;
}
function unwrap(mark) {
  const parent = mark.parentNode;
  if (!parent)
    return;
  while (mark.firstChild)
    dfDollar8(mark).before(mark.firstChild);
  mark.remove();
  parent.normalize();
}
function anchorOf(data, c) {
  let cur = c;
  const seen = new Set;
  while (cur && !cur.anchor && cur.parent && !seen.has(cur.id)) {
    seen.add(cur.id);
    cur = data.comments.find((x) => x.id === cur.parent);
  }
  return cur?.anchor;
}
function placeMarks(el) {
  const root = documentOf(el);
  const data = runtimeOf(el).data;
  if (!root)
    return;
  for (const c of data.comments) {
    if (c.parent)
      continue;
    const anchor = anchorOf(data, c);
    if (!anchor || dfDollar8(root).find(`mark.doc-comments-mark[data-comment="${CSS.escape(c.id)}"]`).length)
      continue;
    const block = blockOf(root, anchor.block);
    const range = block && findRange(block, anchor.text, anchor.occurrence ?? 0);
    if (!range)
      continue;
    wrapRange(range, () => {
      const m = document.createElement("mark");
      m.className = "doc-comments-mark";
      m.dataset.comment = c.id;
      if (c.color)
        m.dataset.color = c.color;
      m.title = `Comment by ${c.author}`;
      return m;
    });
  }
}
function clearMarks(el) {
  const root = documentOf(el);
  if (!root)
    return;
  dfDollar8(root).find("mark.doc-comments-mark, mark.doc-comments-flash").each((_i, m) => unwrap(m));
}
var runtimeOf = (el) => {
  if (!el._comments)
    el._comments = { data: { version: 1, comments: [] }, drafts: {} };
  return el._comments;
};
function ordered(el) {
  const data = runtimeOf(el).data;
  const root = documentOf(el);
  const tops = data.comments.filter((c) => !c.parent || !data.comments.some((p) => p.id === c.parent));
  const markOf = (c) => root ? dfDollar8(root).find(`mark.doc-comments-mark[data-comment="${CSS.escape(c.id)}"]`).get(0) : undefined;
  tops.sort((a, b) => {
    const ma = markOf(a), mb = markOf(b);
    if (!ma || !mb)
      return ma ? -1 : mb ? 1 : 0;
    return ma.compareDocumentPosition(mb) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });
  return tops;
}
var quoteMarkup = (data, q, i) => {
  const note = q.note ? `<span class="doc-comments-quote-note">${renderMarkdown(q.note)}</span>` : "";
  if (!("comment" in q))
    return `<button class="doc-comments-quote" type="button" data-doc-comments-action="flash" data-quote="${i}" title="Scroll to the quoted text">${ICONS.quote}<q>${esc(q.text)}</q>${note}</button>`;
  const target = data.comments.find((x) => x.id === q.comment);
  if (!target)
    return "";
  const anchor = anchorOf(data, target);
  const excerpt = target.body.replace(/\*\*|[*`]/g, "").trim().split(`
`)[0].slice(0, 80);
  const label = anchor ? `<q>${esc(anchor.text)}</q>` : `<span>${esc(excerpt)}</span>`;
  return `<button class="doc-comments-quote doc-comments-link" type="button" data-doc-comments-action="link" data-quote="${i}" title="Go to the comment">${ICONS.link}${label}${note}</button>`;
};
var cardMarkup = (data, c, depth) => {
  const anchor = anchorOf(data, c);
  const replies = data.comments.filter((r) => r.parent === c.id).sort((a, b) => String(a.time ?? "").localeCompare(String(b.time ?? "")));
  const color = c.color ? ` data-color="${esc(c.color)}"` : "";
  return `<li class="card doc-comments-card" data-id="${esc(c.id)}"${color} data-depth="${depth}">
  <div class="card-header doc-comments-card-header">
    <span class="avatar" data-size="sm"><span class="avatar-fallback">${esc(initials(c.author))}</span></span>
    <div class="doc-comments-meta"><strong class="doc-comments-author">${esc(c.author)}</strong>${c.time ? ` <time class="doc-comments-time" datetime="${esc(c.time)}">${esc(formatTime(c.time))}</time>` : ""}</div>
  </div>
  ${depth === 0 && anchor ? `<button class="doc-comments-anchor" type="button" data-doc-comments-action="go" title="Scroll to the text">${esc(anchor.text)}</button>` : ""}
  <div class="card-content doc-comments-body">${renderMarkdown(c.body)}</div>
  ${(c.quotes ?? []).map((q, i) => quoteMarkup(data, q, i)).join("")}
  <div class="card-footer doc-comments-actions">
    <button class="btn" data-variant="ghost" data-size="sm" type="button" data-doc-comments-action="reply" aria-expanded="false">${ICONS.reply} Reply</button>
  </div>
  <form class="textarea-group doc-comments-reply" hidden aria-label="Reply">
    <textarea class="textarea" data-rows="2" data-max-rows="6" aria-label="Your reply" placeholder="Reply..."></textarea>
    <div class="textarea-group-actions">
      <span class="textarea-group-spacer"></span>
      <button class="btn" data-variant="ghost" data-size="sm" type="button" data-doc-comments-action="cancel">Cancel</button>
      <button class="btn" data-size="sm" type="submit">Reply</button>
    </div>
  </form>
  ${replies.length ? `<ol class="doc-comments-replies">${replies.map((r) => cardMarkup(data, r, depth + 1)).join("")}</ol>` : ""}
</li>`;
};
function renderColumn(el) {
  const data = runtimeOf(el).data;
  const tops = ordered(el);
  const head = `<div class="doc-comments-head">
  <span class="doc-comments-title">Comments <span class="badge" data-variant="secondary" data-count>${data.comments.length}</span></span>
  <div class="btn-group" role="group" aria-label="Go to comment">
    <button class="btn" data-variant="outline" data-size="icon-sm" type="button" data-doc-comments-action="prev" aria-label="Previous comment">${ICONS.up}</button>
    <button class="btn" data-variant="outline" data-size="icon-sm" type="button" data-doc-comments-action="next" aria-label="Next comment">${ICONS.down}</button>
  </div>
</div>
<ol class="doc-comments-list">${tops.map((c) => cardMarkup(data, c, 0)).join("")}</ol>
${data.comments.length ? "" : '<p class="doc-comments-empty">No comments yet.</p>'}`;
  const keep = dfDollar8(el).children("script.doc-comments-source").get(0);
  dfDollar8(el).html(head);
  if (keep)
    el.prepend(keep);
  const current = dfDollar8(el).attr("data-current");
  if (current)
    markCurrent(el, current);
  dfDollar8(el).find(".doc-comments-card").each((_i, card) => showComposer(card, runtimeOf(el).drafts[card.dataset.id ?? ""] ?? null));
}
function showComposer(card, text) {
  const form = dfDollar8(card).children("form.doc-comments-reply").get(0);
  if (!form)
    return;
  form.hidden = text === null;
  dfDollar8(form).find("textarea").val(text ?? "");
  dfDollar8(card).children(".doc-comments-actions").find('[data-doc-comments-action="reply"]').attr("aria-expanded", String(text !== null));
}
function emitDraft(el, id, text) {
  el.dispatchEvent(new CustomEvent("doc-comments-draft", { bubbles: true, detail: { id, text } }));
}
function applyMarkup8(el, name, config) {
  dfDollar8(el).attr("data-current", name === "current" && config.id ? String(config.id) : null);
}
function markCurrent(el, id) {
  dfDollar8(el).find(".doc-comments-card[aria-current]").each((_i, c) => dfDollar8(c).attr("aria-current", null));
  const root = documentOf(el);
  if (root)
    dfDollar8(root).find("mark.doc-comments-mark[data-current]").each((_i, m) => dfDollar8(m).attr("data-current", null));
  if (!id)
    return;
  dfDollar8(el).find(`.doc-comments-card[data-id="${CSS.escape(id)}"]`).each((_i, c) => dfDollar8(c).attr("aria-current", "true"));
  if (root)
    dfDollar8(root).find(`mark.doc-comments-mark[data-comment="${CSS.escape(id)}"]`).each((_i, m) => dfDollar8(m).attr("data-current", ""));
}
var reduced = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
var scrollTo = (node, block) => node?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block, inline: "nearest" });
function triggerStateChange8(el, stateName, config) {
  applyMarkup8(el, stateName, config);
  const id = stateName === "current" ? String(config.id ?? "") : null;
  markCurrent(el, id);
  if (id) {
    scrollTo(dfDollar8(el).find(`.doc-comments-card[data-id="${CSS.escape(id)}"]`).get(0), "nearest");
    const root = documentOf(el);
    if (root)
      scrollTo(dfDollar8(root).find(`mark.doc-comments-mark[data-comment="${CSS.escape(id)}"]`).get(0), "center");
  }
}
var docCommentsApi = componentState8({
  component: "doc-comments",
  states: docCommentsStates,
  apply: (el, state) => triggerStateChange8(el, state.name, state.config),
  read: (el) => {
    const id = dfDollar8(el).attr("data-current");
    return id ? { name: "current", config: { id } } : { name: "default", config: {} };
  },
  markup: (el, state) => applyMarkup8(el, state.name, state.config)
});
df$8.docCommentsApi = docCommentsApi;
df$8.docCommentsStates = docCommentsStates;
function emitChange(el, id) {
  el.dispatchEvent(new CustomEvent("doc-comments-change", {
    bubbles: true,
    detail: { comments: runtimeOf(el).data.comments.length, id }
  }));
}
function select(el, id, source) {
  if (!runtimeOf(el).data.comments.some((c) => c.id === id))
    return false;
  el.api?.setState("current", { id });
  el.dispatchEvent(new CustomEvent("doc-comments-select", { bubbles: true, detail: { id, source } }));
  return true;
}
var cardIds = (el) => dfDollar8(el).find(".doc-comments-card").toArray().map((c) => c.dataset.id ?? "");
function step(el, dir, source) {
  const ids = cardIds(el);
  if (!ids.length)
    return null;
  const cur = dfDollar8(el).attr("data-current");
  const at = cur ? ids.indexOf(cur) : -1;
  const next = at < 0 ? dir > 0 ? 0 : ids.length - 1 : (at + dir + ids.length) % ids.length;
  select(el, ids[next], source);
  return ids[next];
}
function flash(el, quote) {
  const root = documentOf(el);
  const block = root && blockOf(root, quote.block);
  const range = block && findRange(block, quote.text, quote.occurrence ?? 0);
  const found = !!range;
  if (range) {
    const marks = wrapRange(range, () => {
      const m = document.createElement("mark");
      m.className = "doc-comments-flash";
      return m;
    });
    scrollTo(marks[0], "center");
    setTimeout(() => marks.forEach(unwrap), FLASH_MS);
  }
  el.dispatchEvent(new CustomEvent("doc-comments-flash", {
    bubbles: true,
    detail: { block: quote.block, text: quote.text, found }
  }));
  return found;
}
function addComment(el, comment) {
  const data = runtimeOf(el).data;
  if (!comment.body || !comment.body.trim())
    return null;
  if (comment.parent && !data.comments.some((c) => c.id === comment.parent))
    return null;
  if (!comment.parent && !comment.anchor)
    return null;
  let id = comment.id || `c${data.comments.length + 1}`;
  while (data.comments.some((c) => c.id === id))
    id = `${id}-${Math.random().toString(36).slice(2, 6)}`;
  const parent = comment.parent ? data.comments.find((c) => c.id === comment.parent) : undefined;
  const full = {
    ...comment,
    id,
    author: comment.author || dfDollar8(el).attr("data-author") || "You",
    time: comment.time ?? new Date().toISOString(),
    body: comment.body.trim(),
    color: comment.color ?? parent?.color
  };
  runtimeOf(el).data = { version: 1, comments: [...data.comments, full] };
  placeMarks(el);
  renderColumn(el);
  emitChange(el, id);
  return id;
}
function load(el, data) {
  clearMarks(el);
  const comments = Array.isArray(data?.comments) ? data.comments.filter((c) => c && typeof c.id === "string" && typeof c.body === "string").map((c) => ({ ...c, author: c.author || "Anonymous" })) : [];
  runtimeOf(el).data = { version: 1, comments };
  runtimeOf(el).drafts = {};
  placeMarks(el);
  renderColumn(el);
  emitChange(el);
}
function setDrafts(el, drafts) {
  const ids = new Set(runtimeOf(el).data.comments.map((c) => c.id));
  runtimeOf(el).drafts = Object.fromEntries(Object.entries(drafts ?? {}).filter(([id, text]) => ids.has(id) && typeof text === "string"));
  dfDollar8(el).find(".doc-comments-card").each((_i, card) => showComposer(card, runtimeOf(el).drafts[card.dataset.id ?? ""] ?? null));
}
function sourceOf(el) {
  const text = dfDollar8(el).children("script.doc-comments-source").get(0)?.textContent ?? "";
  if (!text.trim())
    return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
function onAction(el, button) {
  const action = button.dataset.docCommentsAction;
  const card = button.closest(".doc-comments-card");
  const id = card?.dataset.id ?? "";
  if (action === "prev")
    step(el, -1, "nav");
  else if (action === "next")
    step(el, 1, "nav");
  else if (action === "go" && id)
    select(el, id, "card");
  else if ((action === "flash" || action === "link") && card) {
    const c = runtimeOf(el).data.comments.find((x) => x.id === id);
    const q = c?.quotes?.[Number(button.dataset.quote)];
    if (!q)
      return;
    if ("comment" in q)
      select(el, q.comment, "link");
    else
      flash(el, q);
  } else if (action === "reply" && card) {
    const drafts = runtimeOf(el).drafts;
    if (drafts[id] === undefined) {
      drafts[id] = "";
      showComposer(card, "");
      emitDraft(el, id, "");
    }
    dfDollar8(card).children("form.doc-comments-reply").find("textarea").get(0)?.focus();
  } else if (action === "cancel" && card) {
    delete runtimeOf(el).drafts[id];
    showComposer(card, null);
    emitDraft(el, id, null);
  }
}
function init8() {
  dfDollar8(".doc-comments:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    bindComponent8(el, docCommentsApi);
    const source = sourceOf(el);
    runtimeOf(el).data = source ? { version: 1, comments: source.comments ?? [] } : { version: 1, comments: [] };
    placeMarks(el);
    renderColumn(el);
    dfDollar8(el).on("click", (e) => {
      const button = e.target.closest("[data-doc-comments-action]");
      if (button && el.contains(button))
        onAction(el, button);
    });
    dfDollar8(el).on("submit", (e) => {
      const form = e.target.closest("form.doc-comments-reply");
      if (!form)
        return;
      e.preventDefault();
      const card = form.closest(".doc-comments-card");
      const body = dfDollar8(form).find("textarea").get(0)?.value ?? "";
      if (!card?.dataset.id || !body.trim())
        return;
      delete runtimeOf(el).drafts[card.dataset.id];
      emitDraft(el, card.dataset.id, null);
      addComment(el, { parent: card.dataset.id, body });
    });
    dfDollar8(el).on("input", (e) => {
      const area = e.target;
      const id = area.closest("form.doc-comments-reply")?.closest(".doc-comments-card")?.dataset.id;
      if (!id)
        return;
      runtimeOf(el).drafts[id] = area.value;
      emitDraft(el, id, area.value);
    });
    const root = documentOf(el);
    if (root) {
      dfDollar8(root).on("click", (e) => {
        const mark = e.target.closest("mark.doc-comments-mark");
        if (mark?.dataset.comment)
          select(el, mark.dataset.comment, "mark");
      });
      dfDollar8(root).on("editorjs-ready", () => {
        placeMarks(el);
        renderColumn(el);
      });
      dfDollar8(root).on("editorjs-change", () => placeMarks(el));
    }
  });
}
var resolve6 = (target) => typeof target === "string" ? dfDollar8(target).get(0) : target;
df$8.docComments = {
  load: (target, data) => {
    const el = resolve6(target);
    if (el)
      load(el, data);
  },
  data: (target) => {
    const el = resolve6(target);
    return el ? structuredClone(runtimeOf(el).data) : { version: 1, comments: [] };
  },
  add: (target, comment) => {
    const el = resolve6(target);
    return el ? addComment(el, comment) : null;
  },
  reply: (target, parentId, body, author) => {
    const el = resolve6(target);
    return el ? addComment(el, { parent: parentId, body, author }) : null;
  },
  go: (target, id) => {
    const el = resolve6(target);
    return el ? select(el, id, "api") : false;
  },
  next: (target) => {
    const el = resolve6(target);
    return el ? step(el, 1, "api") : null;
  },
  prev: (target) => {
    const el = resolve6(target);
    return el ? step(el, -1, "api") : null;
  },
  flash: (target, quote) => {
    const el = resolve6(target);
    return el ? flash(el, quote) : false;
  },
  drafts: (target) => {
    const el = resolve6(target);
    return el ? { ...runtimeOf(el).drafts } : {};
  },
  setDrafts: (target, drafts) => {
    const el = resolve6(target);
    if (el)
      setDrafts(el, drafts);
  },
  refresh: (target) => {
    const el = resolve6(target);
    if (el) {
      placeMarks(el);
      renderColumn(el);
    }
  }
};
init8();
new MutationObserver(init8).observe(document, { childList: true, subtree: true });

//# debugId=B0630787D114411164756E2164756E21
//# sourceMappingURL=application.js.map
