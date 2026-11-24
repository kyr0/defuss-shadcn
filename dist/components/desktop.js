// dist/components/window-manager/window-manager.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.10.1") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals, defussQuery, componentState, bindComponent } = __df$shared;
var df$ = defussGlobals();
var dfDollar = defussQuery();
var byId = (id) => (id ? dfDollar("#" + CSS.escape(id)).get(0) : undefined) ?? null;
var windowManagerStates = ["default", "desktop"];
var resolve = (target) => typeof target === "string" ? dfDollar("#" + CSS.escape(target)).get(0) ?? dfDollar(target).get(0) : target;
var managerOf = (w) => w.closest(".window-manager");
var own = (m) => dfDollar(m).find("dialog.window").toArray().filter((w) => managerOf(w) === m);
var seq = 0;
var stateOf = (w) => !w.open ? "closed" : w.hasAttribute("data-minimized") ? "minimized" : w.hasAttribute("data-maximized") ? "maximized" : "default";
function entries(m) {
  return own(m).filter((w) => w.open && !w.hasAttribute("data-share-remote")).sort((a, b) => (a._wmOpened ?? 0) - (b._wmOpened ?? 0)).map((w) => ({
    id: w.id,
    title: dfDollar(w).find(".window-title").get(0)?.textContent?.trim() ?? "",
    icon: dfDollar(w).find(".window-icon").attr("data-lucide") ?? "",
    glyph: dfDollar(w).find(".window-icon").attr("data-glyph") ?? "",
    state: stateOf(w),
    active: w.hasAttribute("data-active")
  }));
}
function refresh(m) {
  for (const w of own(m)) {
    if (!w.id)
      w.id = `window-${Math.random().toString(36).slice(2, 8)}`;
    if (w.open && !w._wmWasOpen)
      w._wmOpened = ++seq;
    w._wmWasOpen = w.open;
  }
  const windows = entries(m);
  const active = windows.find((e) => e.active && e.state !== "minimized")?.id ?? "";
  const key = JSON.stringify([windows, active]);
  if (key === m._wmKey)
    return;
  m._wmKey = key;
  if (m.dataset.stateName === "desktop" && windows.some((e) => e.state !== "minimized"))
    m.dataset.stateName = "default";
  m.dispatchEvent(new CustomEvent("window-manager-change", { bubbles: true, detail: { windows, active } }));
}
var later = (m) => {
  if (m._wmQueued)
    return;
  m._wmQueued = true;
  queueMicrotask(() => {
    m._wmQueued = false;
    refresh(m);
    if (m.dataset.scrollbars === "virtual")
      requestAnimationFrame(() => drawScrollbars(m));
  });
};
var win = () => df$.win;
var winApi = () => df$.windowApi;
function applyMarkup(el, stateName) {
  dfDollar(el).attr("data-desktop-shown", stateName === "desktop" ? "" : null);
}
function triggerStateChange(m, stateName) {
  if (stateName === "desktop") {
    m._wmShown = entries(m).filter((e) => e.state !== "minimized").map((e) => e.id);
    for (const id of m._wmShown)
      winApi()?.setState(byId(id), "minimized", {});
  } else if (m._wmShown) {
    for (const id of m._wmShown) {
      const w = byId(id);
      if (w?.open && w.hasAttribute("data-minimized"))
        winApi()?.setState(w, "default", {});
    }
    m._wmShown = null;
  }
  m.dataset.stateName = stateName;
  applyMarkup(m, stateName);
}
var windowManagerApi = componentState({
  component: "window-manager",
  states: windowManagerStates,
  apply: (m, state) => triggerStateChange(m, state.name),
  read: (m, state) => ({ name: m.dataset.stateName || "default", config: state.config }),
  markup: (el, state) => applyMarkup(el, state.name)
});
df$.windowManagerApi = windowManagerApi;
df$.windowManagerStates = windowManagerStates;
var windows = (target) => {
  const m = resolve(target);
  return m ? entries(m) : [];
};
var active = (target) => {
  const m = resolve(target);
  return m ? own(m).find((w) => w.open && w.hasAttribute("data-active") && !w.hasAttribute("data-minimized")) : undefined;
};
var toggle = (target) => {
  const w = resolve(target);
  if (!w)
    return "";
  const m = managerOf(w);
  if (w.hasAttribute("data-minimized"))
    winApi()?.setState(w, w._wmMaximized ? "maximized" : "default", {});
  else if (m && active(m) === w) {
    w._wmMaximized = w.hasAttribute("data-maximized");
    winApi()?.setState(w, "minimized", {});
  } else
    win()?.focus(w);
  return stateOf(w);
};
var showDesktop = (target) => {
  const m = resolve(target);
  if (!m)
    return false;
  const showing = m.dataset.stateName === "desktop";
  windowManagerApi.setState(m, showing ? "default" : "desktop", {});
  return !showing;
};
var cascade = (target, step = 28) => {
  const m = resolve(target);
  if (m)
    win()?.cascade(m, step);
};
var tile = (target) => {
  const m = resolve(target);
  if (m)
    win()?.tile(m);
};
var windowManagerActions = { windows, active, toggle, showDesktop, cascade, tile };
df$.windowManager = windowManagerActions;
var calibrated = null;
addEventListener("pointermove", (e) => calibrated = { x: e.screenX - e.clientX, y: e.screenY - e.clientY, sx: screenX, sy: screenY }, { capture: true, passive: true });
var viewportOrigin = () => calibrated ? { x: calibrated.x + screenX - calibrated.sx, y: calibrated.y + screenY - calibrated.sy } : { x: screenX + (outerWidth - innerWidth) / 2, y: screenY + outerHeight - innerHeight };
var screenBox = (el) => {
  const r = el.getBoundingClientRect();
  const o = viewportOrigin();
  return { x: o.x + r.left, y: o.y + r.top, w: r.width, h: r.height };
};
var inside = (b, p) => p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h;
var overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
var PEER = Math.random().toString(36).slice(2);
var fieldsOf = (w) => dfDollar(w).find("input, textarea, select").toArray().map((el) => el.type === "checkbox" || el.type === "radio" ? el.checked : el.value);
var setFields = (w, values) => {
  const els = dfDollar(w).find("input, textarea, select").toArray();
  if (els.length !== values.length)
    return;
  els.forEach((el, i) => {
    if (el.type === "checkbox" || el.type === "radio")
      el.checked = !!values[i];
    else
      el.value = String(values[i] ?? "");
  });
};
function place(m, w, box, bounded) {
  const desk = screenBox(m);
  win()?.resize(w, box.w, box.h);
  win()?.move(w, box.x - desk.x, box.y - desk.y, bounded);
}
function dropRemote(w) {
  if (!w.hasAttribute("data-share-remote"))
    return;
  w.removeAttribute("data-share-remote");
  w.inert = false;
  win()?.close(w);
}
function share(m) {
  let channel;
  try {
    channel = new BroadcastChannel("defuss-shadcn:window-manager:" + m.dataset.share);
  } catch {
    return;
  }
  const post = (msg) => channel.postMessage({ ...msg, from: PEER });
  const byIdHere = (id) => own(m).find((w) => w.id === id);
  let last = { x: 0, y: 0 };
  let dragged = "";
  let frame = 0;
  m.addEventListener("pointermove", (e) => {
    const w = e.target.closest?.("dialog.window[data-dragging]");
    if (!w || managerOf(w) !== m)
      return;
    last = { x: e.screenX, y: e.screenY };
    dragged = w.id;
    if (frame)
      return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      post({ type: "move", id: w.id, box: screenBox(w), desk: screenBox(m) });
    });
  });
  m.addEventListener("window-move", (e) => {
    const w = e.target;
    if (w.id !== dragged || managerOf(w) !== m)
      return;
    dragged = "";
    cancelAnimationFrame(frame);
    frame = 0;
    const desk = screenBox(m);
    post({ type: "drop", id: w.id, box: screenBox(w), desk, point: last, fields: fieldsOf(w) });
    if (inside(desk, last))
      return;
    clearTimeout(w._shareWait);
    w._shareWait = setTimeout(() => win()?.move(w, w.offsetLeft, w.offsetTop), 400);
  });
  channel.onmessage = ({ data }) => {
    if (!data || data.from === PEER)
      return;
    const w = byIdHere(data.id);
    if (!w)
      return;
    if (data.type === "take") {
      if (data.to !== PEER)
        return;
      clearTimeout(w._shareWait);
      w.removeAttribute("data-dragging");
      win()?.close(w);
      return;
    }
    const desk = screenBox(m);
    const openHere = w.open && !w.hasAttribute("data-share-remote");
    if (data.type === "move") {
      if (openHere)
        return;
      if (!overlaps(desk, data.box))
        return dropRemote(w);
      if (!w.open) {
        w.setAttribute("data-share-remote", "");
        w.inert = true;
        win()?.open(w);
      }
      place(m, w, data.box, false);
      return;
    }
    if (data.type === "drop") {
      const mine = inside(desk, data.point) && !inside(data.desk, data.point);
      if (!mine)
        return dropRemote(w);
      w.removeAttribute("data-share-remote");
      w.inert = false;
      if (!w.open)
        win()?.open(w);
      place(m, w, data.box, true);
      setFields(w, data.fields ?? []);
      win()?.focus(w);
      later(m);
      channel.postMessage({ type: "take", id: w.id, to: data.from, from: PEER });
    }
  };
}
var SCROLLER_SEL = ".window-body, .window-body > *, .window-body > * > *, textarea";
var scrolls = (v) => v === "auto" || v === "scroll";
var span = (cls) => {
  const el = document.createElement("span");
  el.className = cls;
  return el;
};
function makeBar(s, axis) {
  const el = span("window-manager-scrollbar");
  el.dataset.axis = axis;
  const dec = span("window-manager-scrollbar-button");
  dec.dataset.step = "-1";
  const inc = span("window-manager-scrollbar-button");
  inc.dataset.step = "1";
  const track = span("window-manager-scrollbar-track");
  const thumb = span("window-manager-scrollbar-thumb");
  track.append(thumb);
  el.append(dec, track, inc);
  const pos = axis === "y" ? "scrollTop" : "scrollLeft";
  const hold = (e, step) => {
    e.preventDefault();
    const part = e.currentTarget;
    part.setPointerCapture(e.pointerId);
    part.dataset.pressed = "";
    let timer = 0;
    const stop = () => {
      clearTimeout(timer);
      clearInterval(timer);
      delete part.dataset.pressed;
      part.removeEventListener("pointerup", stop);
      part.removeEventListener("pointercancel", stop);
    };
    part.addEventListener("pointerup", stop);
    part.addEventListener("pointercancel", stop);
    if (step() === false)
      return;
    timer = setTimeout(() => {
      timer = setInterval(() => step() === false && stop(), 50);
    }, 300);
  };
  for (const b of [dec, inc])
    b.addEventListener("pointerdown", (e) => hold(e, () => void (s[pos] += Number(b.dataset.step) * 16)));
  track.addEventListener("pointerdown", (e) => {
    if (e.target === thumb)
      return;
    const at = axis === "y" ? e.clientY : e.clientX;
    hold(e, () => {
      const r = thumb.getBoundingClientRect();
      const [from, to] = axis === "y" ? [r.top, r.bottom] : [r.left, r.right];
      if (at >= from && at <= to)
        return false;
      const page = axis === "y" ? s.clientHeight : s.clientWidth;
      s[pos] += (at < from ? -1 : 1) * page;
    });
  });
  thumb.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    thumb.setPointerCapture(e.pointerId);
    thumb.dataset.pressed = "";
    const start = axis === "y" ? e.clientY : e.clientX;
    const was = s[pos];
    const [size, client, length] = axis === "y" ? [s.scrollHeight, s.clientHeight, track.clientHeight - thumb.offsetHeight] : [s.scrollWidth, s.clientWidth, track.clientWidth - thumb.offsetWidth];
    const move = (m) => {
      const d = (axis === "y" ? m.clientY : m.clientX) - start;
      s[pos] = was + d * (size - client) / Math.max(1, length);
    };
    const up = () => {
      delete thumb.dataset.pressed;
      thumb.removeEventListener("pointermove", move);
      thumb.removeEventListener("pointerup", up);
      thumb.removeEventListener("pointercancel", up);
    };
    thumb.addEventListener("pointermove", move);
    thumb.addEventListener("pointerup", up);
    thumb.addEventListener("pointercancel", up);
  });
  return { el, track, thumb };
}
function placeThumb(s, bar, axis) {
  const [size, client, at] = axis === "y" ? [s.scrollHeight, s.clientHeight, s.scrollTop] : [s.scrollWidth, s.clientWidth, s.scrollLeft];
  const length = axis === "y" ? bar.track.clientHeight : bar.track.clientWidth;
  const thumb = Math.max(Math.min(length, 12), Math.round(length * client / Math.max(size, 1)));
  const offset = size > client ? Math.round((length - thumb) * at / (size - client)) : 0;
  const [lengthProp, offsetProp] = axis === "y" ? ["height", "top"] : ["width", "left"];
  bar.thumb.style[lengthProp] = thumb + "px";
  bar.thumb.style[offsetProp] = offset + "px";
}
function offsetIn(el, w) {
  let x = 0;
  let y = 0;
  let n = el;
  while (n && n !== w) {
    x += n.offsetLeft;
    y += n.offsetTop;
    const p = n.offsetParent;
    if (p && p !== w) {
      x += p.clientLeft - p.scrollLeft;
      y += p.clientTop - p.scrollTop;
    }
    n = p;
  }
  return { x, y };
}
function layoutScroll(w, s) {
  const d = s._drawnScroll;
  if (!s.getClientRects().length) {
    d.y.el.hidden = d.x.el.hidden = d.corner.hidden = true;
    return;
  }
  const cs = getComputedStyle(s);
  const inset = parseFloat(cs.getPropertyValue("--window-scrollbar-inset")) || 0;
  const thick = parseFloat(getComputedStyle(d.y.el).width) || 16;
  const wantY = scrolls(cs.overflowY) && s.scrollHeight > s.clientHeight + 1;
  const wantX = scrolls(cs.overflowX) && s.scrollWidth > s.clientWidth + 1;
  s.style.paddingInlineEnd = wantY ? "calc(" + d.pad.end + " + " + (thick + inset) + "px)" : "";
  s.style.paddingBlockEnd = wantX ? "calc(" + d.pad.bottom + " + " + (thick + inset) + "px)" : "";
  const needY = scrolls(cs.overflowY) && s.scrollHeight > s.clientHeight + 1;
  const needX = scrolls(cs.overflowX) && s.scrollWidth > s.clientWidth + 1;
  if (needY !== wantY || needX !== wantX) {
    s.style.paddingInlineEnd = needY ? "calc(" + d.pad.end + " + " + (thick + inset) + "px)" : "";
    s.style.paddingBlockEnd = needX ? "calc(" + d.pad.bottom + " + " + (thick + inset) + "px)" : "";
  }
  const { x: left, y: top } = offsetIn(s, w);
  const sr = { width: s.offsetWidth, height: s.offsetHeight };
  d.y.el.hidden = !needY;
  d.x.el.hidden = !needX;
  d.corner.hidden = !needX || !needY;
  const both = needX && needY ? thick : 0;
  Object.assign(d.y.el.style, {
    left: left + sr.width - inset - thick + "px",
    top: top + inset + "px",
    height: sr.height - 2 * inset - both + "px"
  });
  Object.assign(d.x.el.style, {
    left: left + inset + "px",
    top: top + sr.height - inset - thick + "px",
    width: sr.width - 2 * inset - both + "px"
  });
  Object.assign(d.corner.style, {
    left: left + sr.width - inset - thick + "px",
    top: top + sr.height - inset - thick + "px"
  });
  if (needY)
    placeThumb(s, d.y, "y");
  if (needX)
    placeThumb(s, d.x, "x");
}
function drawScrollbars(m) {
  for (const w of own(m)) {
    if (!w.open)
      continue;
    for (const s of dfDollar(w).find(SCROLLER_SEL).toArray()) {
      if (s.closest(".window-manager-scrollbars, .terminal") || s._drawnScroll === false)
        continue;
      if (!s._drawnScroll) {
        const cs = getComputedStyle(s);
        if (!scrolls(cs.overflowY) && !scrolls(cs.overflowX)) {
          s._drawnScroll = false;
          continue;
        }
        let layer = dfDollar(w).children(".window-manager-scrollbars").get(0);
        if (!layer) {
          layer = span("window-manager-scrollbars");
          layer.setAttribute("aria-hidden", "true");
          w.append(layer);
        }
        const d = {
          y: makeBar(s, "y"),
          x: makeBar(s, "x"),
          corner: span("window-manager-scrollbar-corner"),
          pad: { end: cs.paddingInlineEnd, bottom: cs.paddingBlockEnd }
        };
        layer.append(d.y.el, d.x.el, d.corner);
        s._drawnScroll = d;
        s.setAttribute("data-drawn-scroll", "");
        let frame = 0;
        const follow = () => {
          if (frame)
            return;
          frame = requestAnimationFrame(() => {
            frame = 0;
            layoutScroll(w, s);
          });
        };
        s.addEventListener("scroll", follow, { passive: true });
        s.addEventListener("input", follow);
        new ResizeObserver(follow).observe(s);
        new ResizeObserver(follow).observe(w);
        w.addEventListener("transitionend", follow);
        w.addEventListener("animationend", follow);
        new MutationObserver(follow).observe(s, { childList: true, subtree: true, characterData: true });
      }
      layoutScroll(w, s);
    }
  }
}
function init() {
  dfDollar(".window-manager:not([data-init])").toArray().forEach((m) => {
    m.dataset.init = "";
    m.dataset.stateName = m.hasAttribute("data-desktop-shown") ? "desktop" : "default";
    bindComponent(m, windowManagerApi);
    new MutationObserver(() => later(m)).observe(m, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["open", "data-active", "data-minimized", "data-maximized", "id"]
    });
    m.addEventListener("close", () => later(m), true);
    if (m.dataset.share)
      share(m);
    later(m);
  });
}
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

// dist/components/desktop-manager/desktop-manager.js
var __df$core2 = globalThis.df$;
var __df$shared2 = __df$core2 && __df$core2.shadcn && __df$core2.shadcn.shared;
if (!__df$shared2 || __df$shared2.abi !== "0.10.1") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals2, defussQuery: defussQuery2, componentState: componentState2, bindComponent: bindComponent2 } = __df$shared2;
var df$2 = defussGlobals2();
var dfDollar2 = defussQuery2();
var desktopManagerStates = ["default", "selected"];
var SLOP = 4;
var resolve2 = (target) => typeof target === "string" ? dfDollar2("#" + CSS.escape(target)).get(0) ?? dfDollar2(target).get(0) : target;
var icons = (m) => dfDollar2(m).find(":scope > .desktop-icon").toArray();
var valueOf = (i) => i.dataset.value ?? dfDollar2(i).find(".desktop-icon-label").text().trim();
var selectedOf = (m) => icons(m).filter((i) => i.getAttribute("aria-selected") === "true");
function applyMarkup2(m, stateName, values = []) {
  const on = new Set(stateName === "selected" ? values : []);
  for (const i of icons(m))
    dfDollar2(i).attr("aria-selected", on.has(valueOf(i)) ? "true" : "false");
}
function triggerStateChange2(m, stateName, config) {
  applyMarkup2(m, stateName, config.values ?? []);
  const first = selectedOf(m)[0];
  if (first)
    setCurrent(m, first, false);
}
var desktopManagerApi = componentState2({
  component: "desktop-manager",
  states: desktopManagerStates,
  events: ["desktop-select"],
  apply: (m, state) => triggerStateChange2(m, state.name, state.config),
  read: (m) => {
    const values = selectedOf(m).map(valueOf);
    return values.length ? { name: "selected", config: { values } } : { name: "default", config: {} };
  },
  markup: (el, state) => applyMarkup2(el, state.name, state.config.values ?? [])
});
df$2.desktopManagerApi = desktopManagerApi;
df$2.desktopManagerStates = desktopManagerStates;
function setCurrent(m, icon, focus = true) {
  for (const i of icons(m))
    i.tabIndex = i === icon ? 0 : -1;
  if (focus)
    icon.focus({ preventScroll: true });
}
function emit(m, type, values) {
  m.dispatchEvent(new CustomEvent(type, { bubbles: true, detail: { values } }));
}
function choose(m, list) {
  const before = selectedOf(m).map(valueOf).join(`
`);
  const on = new Set(list);
  for (const i of icons(m))
    i.setAttribute("aria-selected", on.has(i) ? "true" : "false");
  const values = selectedOf(m).map(valueOf);
  if (values.join(`
`) !== before)
    m.dispatchEvent(new CustomEvent("desktop-select", { bubbles: true, detail: { values } }));
}
var hits = (a, b) => !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
function band(m, down) {
  const box = () => m.getBoundingClientRect();
  const base = down.ctrlKey || down.metaKey ? selectedOf(m) : [];
  const { clientX: x0, clientY: y0 } = down;
  let el = null;
  m.setPointerCapture(down.pointerId);
  const move = (e) => {
    if (!el) {
      if (Math.hypot(e.clientX - x0, e.clientY - y0) < SLOP)
        return;
      el = document.createElement("div");
      el.className = "desktop-manager-band";
      m.append(el);
      m.setAttribute("data-selecting", "");
    }
    const b = box();
    const left = Math.min(x0, e.clientX), top = Math.min(y0, e.clientY);
    const w = Math.abs(e.clientX - x0), h = Math.abs(e.clientY - y0);
    el.style.left = `${left - b.left + m.scrollLeft}px`;
    el.style.top = `${top - b.top + m.scrollTop}px`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    const r = new DOMRect(left, top, w, h);
    const inside = icons(m).filter((i) => hits(i.getBoundingClientRect(), r));
    choose(m, [...new Set([...base, ...inside])]);
  };
  const up = () => {
    m.removeEventListener("pointermove", move);
    m.removeEventListener("pointerup", up);
    m.removeEventListener("pointercancel", up);
    if (el) {
      el.remove();
      m.removeAttribute("data-selecting");
      const first = selectedOf(m)[0];
      if (first)
        setCurrent(m, first, false);
    } else if (!base.length)
      choose(m, []);
  };
  m.addEventListener("pointermove", move);
  m.addEventListener("pointerup", up);
  m.addEventListener("pointercancel", up);
}
function grid(m) {
  const cs = getComputedStyle(m);
  const rows = cs.gridTemplateRows.split(" ").filter((x) => x.endsWith("px")).length || 1;
  const cellH = parseFloat(cs.gridTemplateRows) || 80;
  const cellW = parseFloat(cs.gridAutoColumns) || 80;
  const gapY = parseFloat(cs.rowGap) || 0, gapX = parseFloat(cs.columnGap) || 0;
  return {
    rows,
    cellH,
    cellW,
    gapY,
    gapX,
    padT: parseFloat(cs.paddingTop) || 0,
    padL: parseFloat(cs.paddingLeft) || 0
  };
}
var cellAt = (g, x, y) => ({
  row: Math.min(g.rows, Math.max(1, Math.floor((y - g.padT) / (g.cellH + g.gapY)) + 1)),
  col: Math.max(1, Math.floor((x - g.padL) / (g.cellW + g.gapX)) + 1)
});
function dragIcons(m, icon, down) {
  const { clientX: x0, clientY: y0 } = down;
  let moving = false;
  icon.setPointerCapture(down.pointerId);
  const sel = () => selectedOf(m);
  const move = (e) => {
    const dx = e.clientX - x0, dy = e.clientY - y0;
    if (!moving && Math.hypot(dx, dy) < SLOP)
      return;
    moving = true;
    m.setAttribute("data-dragging", "");
    for (const i of sel())
      i.style.translate = `${dx}px ${dy}px`;
  };
  const up = (e) => {
    icon.removeEventListener("pointermove", move);
    icon.removeEventListener("pointerup", up);
    icon.removeEventListener("pointercancel", up);
    if (!moving)
      return;
    m.removeAttribute("data-dragging");
    icon._dmDragged = true;
    const g = grid(m);
    const box = m.getBoundingClientRect();
    const moved = sel();
    const taken = new Set(icons(m).filter((i) => !moved.includes(i)).map((i) => {
      const c = cellAt(g, i.offsetLeft + i.offsetWidth / 2, i.offsetTop + i.offsetHeight / 2);
      return `${c.row}/${c.col}`;
    }));
    for (const i of moved) {
      const r = i.getBoundingClientRect();
      let c = cellAt(g, r.left + r.width / 2 - box.left + m.scrollLeft, r.top + r.height / 2 - box.top + m.scrollTop);
      while (taken.has(`${c.row}/${c.col}`))
        c = c.row < g.rows ? { row: c.row + 1, col: c.col } : { row: 1, col: c.col + 1 };
      taken.add(`${c.row}/${c.col}`);
      i.style.translate = "";
      i.style.gridArea = `${c.row} / ${c.col}`;
    }
    if (e.type === "pointercancel")
      return;
  };
  icon.addEventListener("pointermove", move);
  icon.addEventListener("pointerup", up);
  icon.addEventListener("pointercancel", up);
}
function nearest(m, from, key) {
  const a = from.getBoundingClientRect();
  const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best, bestD = Infinity;
  for (const i of icons(m)) {
    if (i === from)
      continue;
    const b = i.getBoundingClientRect();
    const dx = b.left + b.width / 2 - ax, dy = b.top + b.height / 2 - ay;
    const ahead = key === "ArrowDown" ? dy > 1 : key === "ArrowUp" ? dy < -1 : key === "ArrowRight" ? dx > 1 : dx < -1;
    if (!ahead)
      continue;
    const d = key === "ArrowDown" || key === "ArrowUp" ? Math.abs(dy) + 3 * Math.abs(dx) : Math.abs(dx) + 3 * Math.abs(dy);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}
function rename(m, icon) {
  const label = dfDollar2(icon).find(".desktop-icon-label").get(0);
  if (!label || label.isContentEditable)
    return;
  const old = label.textContent ?? "";
  label.contentEditable = "true";
  label.focus();
  getSelection()?.selectAllChildren(label);
  const done = (keep) => {
    label.removeEventListener("keydown", key);
    label.removeEventListener("blur", blur);
    label.removeAttribute("contenteditable");
    const text = (label.textContent ?? "").trim();
    if (!keep || !text || text === old.trim())
      label.textContent = old;
    else
      m.dispatchEvent(new CustomEvent("desktop-rename", {
        bubbles: true,
        detail: { value: valueOf(icon), label: text }
      }));
    setCurrent(m, icon);
  };
  const key = (e) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      done(true);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      done(false);
    }
  };
  const blur = () => done(false);
  label.addEventListener("keydown", key);
  label.addEventListener("blur", blur);
}
function bind(m) {
  m.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest('[contenteditable="true"]'))
      return;
    const icon = e.target.closest(".desktop-icon");
    if (!icon || !m.contains(icon)) {
      if (e.target === m) {
        e.preventDefault();
        m.focus({ preventScroll: true });
        band(m, e);
      }
      return;
    }
    e.preventDefault();
    const sel = selectedOf(m);
    if (e.shiftKey && m._dmAnchor && m.contains(m._dmAnchor)) {
      const all = icons(m);
      const [a, b] = [all.indexOf(m._dmAnchor), all.indexOf(icon)].sort((x, y) => x - y);
      choose(m, all.slice(a, b + 1));
    } else if (e.ctrlKey || e.metaKey) {
      choose(m, sel.includes(icon) ? sel.filter((i) => i !== icon) : [...sel, icon]);
      m._dmAnchor = icon;
    } else {
      if (!sel.includes(icon))
        choose(m, [icon]);
      else
        icon._dmNarrow = sel.length > 1;
      m._dmAnchor = icon;
    }
    setCurrent(m, icon);
    if (icon.getAttribute("aria-selected") === "true")
      dragIcons(m, icon, e);
  });
  m.addEventListener("click", (e) => {
    const icon = e.target.closest(".desktop-icon");
    if (!icon)
      return;
    if (icon._dmNarrow && !icon._dmDragged && !(e.ctrlKey || e.metaKey || e.shiftKey))
      choose(m, [icon]);
    icon._dmNarrow = false;
    icon._dmDragged = false;
  });
  m.addEventListener("dblclick", (e) => {
    const icon = e.target.closest(".desktop-icon");
    if (icon)
      emit(m, "desktop-open", [valueOf(icon)]);
  });
  m.addEventListener("keydown", (e) => {
    if (e.target.closest('[contenteditable="true"]'))
      return;
    const all = icons(m);
    const cur = e.target.closest(".desktop-icon");
    if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      choose(m, all);
      return;
    }
    if (e.key === "Escape") {
      choose(m, []);
      return;
    }
    if (e.key === "Enter" && selectedOf(m).length) {
      e.preventDefault();
      emit(m, "desktop-open", selectedOf(m).map(valueOf));
      return;
    }
    if (e.key === "Delete" && selectedOf(m).length) {
      e.preventDefault();
      emit(m, "desktop-delete", selectedOf(m).map(valueOf));
      return;
    }
    if (e.key === "F2" && cur) {
      e.preventDefault();
      rename(m, cur);
      return;
    }
    if (e.key === " " && cur) {
      e.preventDefault();
      const sel = selectedOf(m);
      if (e.ctrlKey || e.metaKey)
        choose(m, sel.includes(cur) ? sel.filter((i) => i !== cur) : [...sel, cur]);
      else
        choose(m, [cur]);
      m._dmAnchor = cur;
      return;
    }
    if (!e.key.startsWith("Arrow"))
      return;
    e.preventDefault();
    const from = cur ?? all.find((i) => i.tabIndex === 0) ?? all[0];
    if (!from)
      return;
    const next = cur ? nearest(m, from, e.key) : from;
    if (!next)
      return;
    setCurrent(m, next);
    if (e.shiftKey) {
      const anchor = m._dmAnchor && m.contains(m._dmAnchor) ? m._dmAnchor : from;
      m._dmAnchor = anchor;
      const [a, b] = [all.indexOf(anchor), all.indexOf(next)].sort((x, y) => x - y);
      choose(m, all.slice(a, b + 1));
    } else if (!(e.ctrlKey || e.metaKey)) {
      choose(m, [next]);
      m._dmAnchor = next;
    }
  });
  m.addEventListener("focus", () => {
    const cur = icons(m).find((i) => i.tabIndex === 0);
    if (cur && document.activeElement === m && !m.hasAttribute("data-selecting"))
      cur.focus({ preventScroll: true });
  });
}
var select = (target, values) => {
  const m = resolve2(target);
  if (!m)
    return [];
  desktopManagerApi.setState(m, values.length ? "selected" : "default", values.length ? { values } : {});
  return selectedOf(m).map(valueOf);
};
var selected = (target) => {
  const m = resolve2(target);
  return m ? selectedOf(m).map(valueOf) : [];
};
var arrange = (target) => {
  const m = resolve2(target);
  if (m)
    for (const i of icons(m)) {
      i.style.gridArea = "";
      if (!i.getAttribute("style"))
        i.removeAttribute("style");
    }
};
var desktopManagerActions = { select, selected, arrange };
df$2.desktopManager = desktopManagerActions;
function init2() {
  dfDollar2(".desktop-manager:not([data-init])").toArray().forEach((m) => {
    m.dataset.init = "";
    if (!m.hasAttribute("tabindex"))
      m.tabIndex = -1;
    const all = icons(m);
    for (const i of all)
      if (!i.hasAttribute("aria-selected"))
        i.setAttribute("aria-selected", "false");
    const first = all.find((i) => i.getAttribute("aria-selected") === "true") ?? all[0];
    if (first)
      setCurrent(m, first, false);
    bind(m);
    bindComponent2(m, desktopManagerApi);
  });
}
init2();
new MutationObserver(init2).observe(document, { childList: true, subtree: true });

// dist/components/taskbar/taskbar.js
var __df$core3 = globalThis.df$;
var __df$shared3 = __df$core3 && __df$core3.shadcn && __df$core3.shadcn.shared;
if (!__df$shared3 || __df$shared3.abi !== "0.10.1") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals3, defussQuery: defussQuery3, componentState: componentState3, bindComponent: bindComponent3 } = __df$shared3;
var df$3 = defussGlobals3();
var dfDollar3 = defussQuery3();
var byId2 = (id) => (id ? dfDollar3("#" + CSS.escape(id)).get(0) : undefined) ?? null;
var taskbarStates = ["default"];
var POSITIONS = ["bottom", "top", "left", "right"];
var managerOf2 = (bar) => {
  const id = bar.dataset.taskbarFor;
  return id ? byId2(id) : null;
};
function applyMarkup3(bar, _stateName, config) {
  if (config.position !== undefined)
    dfDollar3(bar).attr("data-position", config.position === "bottom" ? null : config.position);
  if (config.align !== undefined)
    dfDollar3(bar).attr("data-align", config.align === "start" ? null : config.align);
}
function triggerStateChange3(bar, stateName, config) {
  if (config.position !== undefined && !POSITIONS.includes(config.position))
    throw new Error(`taskbar: no position ${config.position}`);
  applyMarkup3(bar, stateName, config);
}
var taskbarApi = componentState3({
  component: "taskbar",
  states: taskbarStates,
  apply: (bar, state) => triggerStateChange3(bar, state.name, state.config),
  read: (bar) => ({
    name: "default",
    config: { position: bar.dataset.position || "bottom", align: bar.dataset.align || "start" }
  }),
  markup: (el, state) => applyMarkup3(el, state.name, state.config)
});
df$3.taskbarApi = taskbarApi;
df$3.taskbarStates = taskbarStates;
function render(bar, windows) {
  const list = dfDollar3(bar).find(".taskbar-windows").get(0);
  if (!list)
    return;
  const have = new Map(dfDollar3(list).find(":scope > .taskbar-window").toArray().map((b) => [b.dataset.window, b]));
  const keep = new Set;
  for (const w of windows) {
    keep.add(w.id);
    let b = have.get(w.id);
    if (!b) {
      b = document.createElement("button");
      b.type = "button";
      b.className = "taskbar-window";
      b.dataset.window = w.id;
      dfDollar3(b).html('<span class="taskbar-window-icon" aria-hidden="true"></span><span class="taskbar-window-title"></span>');
    }
    list.append(b);
    const icon = dfDollar3(b).find(".taskbar-window-icon").get(0);
    const key = w.glyph ? `glyph:${w.glyph}` : w.icon;
    if (icon.dataset.icon !== key) {
      icon.dataset.icon = key;
      dfDollar3(icon).html(w.glyph ? `<span class="desktop-glyph" data-glyph="${w.glyph}"></span>` : w.icon ? `<i data-lucide="${w.icon}"></i>` : "");
    }
    const title = dfDollar3(b).find(".taskbar-window-title").get(0);
    if (title.textContent !== w.title)
      title.textContent = w.title;
    b.title = w.title;
    b.setAttribute("aria-pressed", String(w.active && w.state !== "minimized"));
    b.toggleAttribute("data-minimized", w.state === "minimized");
  }
  for (const [id, b] of have)
    if (!keep.has(id))
      b.remove();
  if (windows.some((w) => w.icon))
    globalThis.lucide?.createIcons?.();
}
function bind2(bar) {
  const m = managerOf2(bar);
  if (m) {
    m.setAttribute("data-taskbar", "");
    m.addEventListener("window-manager-change", (e) => render(bar, e.detail.windows));
    const model = df$3.windowManager?.windows(m);
    if (model)
      render(bar, model);
  }
  bar.addEventListener("click", (e) => {
    const b = e.target.closest(".taskbar-window");
    if (b?.dataset.window)
      df$3.windowManager?.toggle(b.dataset.window);
  });
  bar.addEventListener("keydown", (e) => {
    const list = e.target.closest(".taskbar-windows");
    if (!list || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key))
      return;
    const all = dfDollar3(list).find(".taskbar-window").toArray();
    const at = all.indexOf(e.target);
    const next = e.key === "Home" ? all[0] : e.key === "End" ? all.at(-1) : all[(at + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1) + all.length) % all.length];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  });
}
var manager = (target) => {
  const bar = typeof target === "string" ? byId2(target) ?? dfDollar3(target).get(0) ?? null : target;
  return bar ? managerOf2(bar) : null;
};
var taskbarActions = { manager };
df$3.taskbar = taskbarActions;
function init3() {
  dfDollar3(".taskbar:not([data-init])").toArray().forEach((bar) => {
    bar.dataset.init = "";
    bind2(bar);
    bindComponent3(bar, taskbarApi);
  });
}
init3();
new MutationObserver(init3).observe(document, { childList: true, subtree: true });

// dist/components/tray/tray.js
var __df$core4 = globalThis.df$;
var __df$shared4 = __df$core4 && __df$core4.shadcn && __df$core4.shadcn.shared;
if (!__df$shared4 || __df$shared4.abi !== "0.10.1") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals4, defussQuery: defussQuery4, componentState: componentState4, bindComponent: bindComponent4 } = __df$shared4;
var df$4 = defussGlobals4();
var dfDollar4 = defussQuery4();
var byId3 = (id) => (id ? dfDollar4("#" + CSS.escape(id)).get(0) : undefined) ?? null;
var trayStates = ["default"];
var resolve3 = (target) => typeof target === "string" ? dfDollar4("#" + CSS.escape(target)).get(0) ?? dfDollar4(target).get(0) : target;
function applyMarkup4(tray, _stateName, config) {
  if (config.seconds !== undefined)
    dfDollar4(tray).attr("data-seconds", config.seconds ? "" : null);
  if (config.date !== undefined)
    dfDollar4(tray).attr("data-date", config.date ? "" : null);
}
function tick(tray) {
  const clock = dfDollar4(tray).find(".tray-clock").get(0);
  if (!clock)
    return;
  const lang = tray.closest("[lang]")?.getAttribute("lang") || undefined;
  const now = new Date;
  const time = new Intl.DateTimeFormat(lang, {
    hour: "numeric",
    minute: "2-digit",
    second: tray.hasAttribute("data-seconds") ? "2-digit" : undefined
  }).format(now);
  const date = tray.hasAttribute("data-date") ? new Intl.DateTimeFormat(lang, { dateStyle: "short" }).format(now) : "";
  const text = date ? `${time}
${date}` : time;
  if (clock.textContent !== text)
    clock.textContent = text;
  clock.dateTime = now.toISOString().slice(0, tray.hasAttribute("data-seconds") ? 19 : 16);
}
function triggerStateChange4(tray, stateName, config) {
  applyMarkup4(tray, stateName, config);
  tick(tray);
}
var trayApi = componentState4({
  component: "tray",
  states: trayStates,
  apply: (tray, state) => triggerStateChange4(tray, state.name, state.config),
  read: (tray) => ({
    name: "default",
    config: { seconds: tray.hasAttribute("data-seconds"), date: tray.hasAttribute("data-date") }
  }),
  markup: (el, state) => applyMarkup4(el, state.name, state.config)
});
df$4.trayApi = trayApi;
df$4.trayStates = trayStates;
var managerOf3 = (tray) => {
  const id = tray.closest(".taskbar")?.dataset.taskbarFor;
  return id ? byId3(id) : null;
};
var add = (target, options) => {
  const tray = resolve3(target);
  if (!tray)
    return null;
  let b = dfDollar4(tray).find(`.tray-item[data-id="${CSS.escape(options.id)}"]`).get(0);
  if (!b) {
    b = document.createElement("button");
    b.type = "button";
    b.className = "tray-item";
    b.dataset.id = options.id;
    const clock = dfDollar4(tray).find(".tray-clock").get(0);
    if (clock)
      clock.before(b);
    else
      tray.append(b);
  }
  b.setAttribute("aria-label", options.label);
  b.title = options.label;
  dfDollar4(b).html(`<i data-lucide="${options.icon}"></i>`);
  if (options.popover)
    b.setAttribute("popovertarget", options.popover);
  badge(b, options.badge ?? "");
  globalThis.lucide?.createIcons?.();
  return b;
};
var remove = (target, id) => {
  const tray = resolve3(target);
  const b = tray ? dfDollar4(tray).find(`.tray-item[data-id="${CSS.escape(id)}"]`).get(0) : undefined;
  b?.remove();
  return !!b;
};
function badge(item, value) {
  if (value === "" || value === 0)
    item.removeAttribute("data-badge");
  else
    item.dataset.badge = String(value);
}
var trayActions = { add, remove, badge };
df$4.tray = trayActions;
function init4() {
  dfDollar4(".tray:not([data-init])").toArray().forEach((tray) => {
    tray.dataset.init = "";
    tick(tray);
    const loop = () => {
      if (!tray.isConnected)
        return;
      tick(tray);
      setTimeout(loop, 1000 - Date.now() % 1000 + 5);
    };
    setTimeout(loop, 1000 - Date.now() % 1000 + 5);
    tray.addEventListener("click", (e) => {
      if (e.target.closest(".tray-show-desktop")) {
        const m = managerOf3(tray);
        if (m)
          df$4.windowManager?.showDesktop(m);
      }
    });
    bindComponent4(tray, trayApi);
  });
}
init4();
new MutationObserver(init4).observe(document, { childList: true, subtree: true });

// dist/components/start-menu/start-menu.js
var __df$core5 = globalThis.df$;
var __df$shared5 = __df$core5 && __df$core5.shadcn && __df$core5.shadcn.shared;
if (!__df$shared5 || __df$shared5.abi !== "0.10.1") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals5, defussQuery: defussQuery5, componentState: componentState5, bindComponent: bindComponent5 } = __df$shared5;
var df$5 = defussGlobals5();
var dfDollar5 = defussQuery5();
var byId4 = (id) => (id ? dfDollar5("#" + CSS.escape(id)).get(0) : undefined) ?? null;
var startMenuStates = ["default", "open"];
var ITEM = ".start-menu-item";
var resolve4 = (target) => typeof target === "string" ? dfDollar5("#" + CSS.escape(target)).get(0) ?? dfDollar5(target).get(0) : target;
var labelOf = (i) => (dfDollar5(i).find(".start-menu-label").get(0)?.textContent ?? i.textContent ?? "").replace(/\s+/g, " ").trim();
var valueOf2 = (i) => i.dataset.value ?? labelOf(i);
var reachable = (menu) => dfDollar5(menu).find(ITEM).toArray().filter((i) => i.checkVisibility());
function applyMarkup5(menu, _stateName, query = "") {
  dfDollar5(menu).find(".start-menu-search input").attr("value", query || null);
}
function filter(menu, q) {
  const query = q.trim().toLowerCase();
  menu.toggleAttribute("data-searching", !!query);
  const all = dfDollar5(menu).find(ITEM).toArray();
  for (const i of all) {
    if (i.hasAttribute("aria-haspopup"))
      continue;
    i.toggleAttribute("data-match", !!query && labelOf(i).toLowerCase().includes(query));
  }
  if (query) {
    for (const sub of dfDollar5(menu).find(".start-menu-sub").toArray())
      if (sub.matches(":popover-open"))
        sub.hidePopover();
  }
  const empty = dfDollar5(menu).find(".start-menu-empty").get(0);
  if (empty)
    empty.hidden = !query || all.some((i) => i.hasAttribute("data-match"));
}
function triggerStateChange5(menu, stateName, config) {
  const input = dfDollar5(menu).find(".start-menu-search input").get(0);
  if (stateName === "open") {
    if (!menu.matches(":popover-open"))
      menu.showPopover();
    if (input && config.query !== undefined && input.value !== config.query) {
      input.value = config.query;
      filter(menu, config.query);
    }
  } else if (menu.matches(":popover-open"))
    menu.hidePopover();
  applyMarkup5(menu, stateName, input?.value ?? "");
}
var startMenuApi = componentState5({
  component: "start-menu",
  states: startMenuStates,
  events: ["toggle", "input"],
  apply: (menu, state) => triggerStateChange5(menu, state.name, state.config),
  read: (menu) => {
    const q = dfDollar5(menu).find(".start-menu-search input").get(0)?.value ?? "";
    return menu.matches(":popover-open") ? { name: "open", config: q ? { query: q } : {} } : { name: "default", config: {} };
  },
  markup: (el, state) => applyMarkup5(el, state.name, state.config.query ?? "")
});
df$5.startMenuApi = startMenuApi;
df$5.startMenuStates = startMenuStates;
function openFolder(item, focusFirst) {
  const sub = byId4(item.getAttribute("aria-controls") ?? "");
  if (!sub)
    return;
  const level = item.closest(".start-menu-sub, .start-menu");
  for (const other of dfDollar5(level).find(':scope [aria-haspopup][aria-expanded="true"]').toArray())
    if (other !== item && other.closest(".start-menu-sub, .start-menu") === level)
      closeFolder(other);
  const name = `--start-menu-${item.getAttribute("aria-controls")}`;
  item.style.setProperty("anchor-name", name);
  sub.style.setProperty("position-anchor", name);
  if (!sub.matches(":popover-open"))
    sub.showPopover();
  item.setAttribute("aria-expanded", "true");
  if (focusFirst)
    reachable(sub)[0]?.focus();
}
function closeFolder(item) {
  const sub = byId4(item.getAttribute("aria-controls") ?? "");
  if (sub?.matches(":popover-open"))
    sub.hidePopover();
  item.setAttribute("aria-expanded", "false");
}
function pick(menu, item) {
  if (item.hasAttribute("aria-haspopup"))
    return openFolder(item, true);
  menu.dispatchEvent(new CustomEvent("start-select", {
    bubbles: true,
    detail: { value: valueOf2(item), label: labelOf(item) }
  }));
  startMenuApi.setState(menu, "default", {});
}
function bind3(menu) {
  const input = dfDollar5(menu).find(".start-menu-search input").get(0);
  menu.addEventListener("toggle", (e) => {
    const open = e.newState === "open";
    for (const b of dfDollar5(`[popovertarget="${CSS.escape(menu.id)}"]`).toArray())
      b.setAttribute("aria-expanded", String(open));
    if (open) {
      if (input?.checkVisibility())
        input.focus();
      else
        reachable(menu)[0]?.focus();
    } else {
      for (const f of dfDollar5(menu).find('[aria-haspopup][aria-expanded="true"]').toArray())
        closeFolder(f);
      if (input) {
        input.value = "";
        filter(menu, "");
      }
    }
  });
  input?.addEventListener("input", () => filter(menu, input.value));
  menu.addEventListener("click", (e) => {
    const item = e.target.closest(ITEM);
    if (item && !item.hasAttribute("disabled"))
      pick(menu, item);
  });
  menu.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse")
      return;
    const item = e.target.closest(ITEM);
    if (!item)
      return;
    if (item.hasAttribute("aria-haspopup"))
      openFolder(item, false);
    else {
      const level = item.closest(".start-menu-sub, .start-menu");
      for (const f of dfDollar5(level).find('[aria-haspopup][aria-expanded="true"]').toArray())
        if (f.closest(".start-menu-sub, .start-menu") === level)
          closeFolder(f);
    }
  });
  menu.addEventListener("keydown", (e) => {
    const items = reachable(menu);
    const cur = e.target.closest(ITEM);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const level = cur?.closest(".start-menu-sub") ?? null;
      const list = level ? items.filter((i) => i.closest(".start-menu-sub") === level) : items.filter((i) => !i.closest(".start-menu-sub"));
      const k = cur ? list.indexOf(cur) : -1;
      const next = list[(k + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length];
      next?.focus();
      return;
    }
    if (e.key === "ArrowRight" && cur?.hasAttribute("aria-haspopup")) {
      e.preventDefault();
      openFolder(cur, true);
      return;
    }
    if (e.key === "ArrowLeft" && cur?.closest(".start-menu-sub")) {
      e.preventDefault();
      const sub = cur.closest(".start-menu-sub");
      const opener = dfDollar5(menu).find(`[aria-controls="${CSS.escape(sub.id)}"]`).get(0);
      if (opener) {
        closeFolder(opener);
        opener.focus();
      }
      return;
    }
    if (e.key === "Enter" && e.target === input) {
      e.preventDefault();
      const first = items.find((i) => i.hasAttribute("data-match"));
      if (first)
        pick(menu, first);
      return;
    }
    if (e.key === "Escape" && cur?.closest(".start-menu-sub")) {
      e.preventDefault();
      e.stopPropagation();
      const sub = cur.closest(".start-menu-sub");
      const opener = dfDollar5(menu).find(`[aria-controls="${CSS.escape(sub.id)}"]`).get(0);
      if (opener) {
        closeFolder(opener);
        opener.focus();
      }
      return;
    }
    if (input?.checkVisibility() && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.target !== input) {
      input.focus();
    }
  });
}
var openMenu = (target, query = "") => {
  const m = resolve4(target);
  if (m)
    startMenuApi.setState(m, "open", { query });
  return m;
};
var closeMenu = (target) => {
  const m = resolve4(target);
  if (m)
    startMenuApi.setState(m, "default", {});
  return m;
};
var toggleMenu = (target) => {
  const m = resolve4(target);
  if (!m)
    return false;
  const opening = !m.matches(":popover-open");
  startMenuApi.setState(m, opening ? "open" : "default", opening ? { query: "" } : {});
  return opening;
};
var startMenuActions = { open: openMenu, close: closeMenu, toggle: toggleMenu };
df$5.startMenu = startMenuActions;
function init5() {
  dfDollar5(".start-menu[popover]:not([data-init])").toArray().forEach((menu) => {
    menu.dataset.init = "";
    for (const f of dfDollar5(menu).find(`${ITEM}[aria-controls]`).toArray()) {
      f.setAttribute("aria-haspopup", "menu");
      if (!f.hasAttribute("aria-expanded"))
        f.setAttribute("aria-expanded", "false");
    }
    const name = `--start-menu-${menu.id}`;
    menu.style.setProperty("position-anchor", name);
    for (const b of dfDollar5(`[popovertarget="${CSS.escape(menu.id)}"]`).toArray()) {
      b.style.setProperty("anchor-name", name);
      b.setAttribute("aria-expanded", "false");
    }
    bind3(menu);
    bindComponent5(menu, startMenuApi);
  });
}
if (!document.__startMenuInit) {
  document.__startMenuInit = true;
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !e.ctrlKey)
      return;
    let menu;
    for (let p = document.activeElement;p && !menu; p = p.parentElement)
      menu = dfDollar5(p).find(".start-menu[popover]").get(0);
    menu ??= dfDollar5(".start-menu[popover]").get(0);
    if (!menu)
      return;
    e.preventDefault();
    toggleMenu(menu);
  });
}
init5();
new MutationObserver(init5).observe(document, { childList: true, subtree: true });

// dist/components/logon/logon.js
var __df$core6 = globalThis.df$;
var __df$shared6 = __df$core6 && __df$core6.shadcn && __df$core6.shadcn.shared;
if (!__df$shared6 || __df$shared6.abi !== "0.10.1") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals6, defussQuery: defussQuery6, componentState: componentState6, bindComponent: bindComponent6 } = __df$shared6;
var df$6 = defussGlobals6();
var dfDollar6 = defussQuery6();
var logonStates = ["default", "signing-in", "error", "signed-in"];
var resolve5 = (target) => typeof target === "string" ? dfDollar6("#" + CSS.escape(target)).get(0) ?? dfDollar6(target).get(0) : target;
var users = (el) => dfDollar6(el).find(".logon-user").toArray();
var nameOf = (u) => (dfDollar6(u).find(".logon-name").get(0)?.textContent ?? u.textContent ?? "").trim();
function applyMarkup6(el, stateName, config) {
  const user = stateName === "default" ? "" : config.user ?? "";
  for (const u of users(el))
    dfDollar6(u).attr("aria-pressed", user && u.dataset.user === user ? "true" : "false");
  dfDollar6(el).attr("data-user", user || null);
  dfDollar6(el).attr("data-signed-in", stateName === "signed-in" ? "" : null);
  const form = dfDollar6(el).find(".logon-form");
  form.attr("hidden", stateName === "signing-in" || stateName === "error" ? null : "");
  const picked = users(el).find((u) => u.dataset.user === user);
  form.find(".logon-for").text(picked ? nameOf(picked) : "");
  const err = dfDollar6(el).find(".logon-error");
  err.attr("hidden", stateName === "error" ? null : "");
  err.text(stateName === "error" ? config.message ?? "" : "");
  form.find('input[type="password"]').attr("aria-invalid", stateName === "error" ? "true" : null);
}
function triggerStateChange6(el, stateName, config) {
  applyMarkup6(el, stateName, config);
  el.dataset.stateName = stateName;
  const input = dfDollar6(el).find('.logon-form input[type="password"]').get(0);
  if (stateName === "signing-in" || stateName === "error") {
    if (input) {
      if (stateName === "signing-in")
        input.value = "";
      requestAnimationFrame(() => input.focus());
      if (stateName === "error")
        input.select();
    }
  } else if (input)
    input.value = "";
  if (stateName === "default")
    users(el)[0]?.focus({ preventScroll: true });
}
var logonApi = componentState6({
  component: "logon",
  states: logonStates,
  apply: (el, state) => triggerStateChange6(el, state.name, state.config),
  read: (el) => {
    const name = el.dataset.stateName || "default";
    if (name === "default")
      return { name, config: {} };
    const user = el.dataset.user ?? "";
    if (name !== "error")
      return { name, config: { user } };
    return { name, config: { user, message: dfDollar6(el).find(".logon-error").text() } };
  },
  markup: (el, state) => applyMarkup6(el, state.name, state.config)
});
df$6.logonApi = logonApi;
df$6.logonStates = logonStates;
function pickUser(el, u) {
  const user = u.dataset.user ?? nameOf(u);
  if (u.hasAttribute("data-no-password")) {
    logonApi.setState(el, "signing-in", { user });
    submit(el, user, "");
  } else
    logonApi.setState(el, "signing-in", { user });
}
function submit(el, user, password) {
  el.dispatchEvent(new CustomEvent("logon-submit", { bubbles: true, detail: { user, password } }));
}
function bind4(el) {
  el.addEventListener("click", (e) => {
    const u = e.target.closest(".logon-user");
    if (u)
      pickUser(el, u);
    const p = e.target.closest("[data-logon-power]");
    if (p)
      el.dispatchEvent(new CustomEvent("logon-power", {
        bubbles: true,
        detail: { action: p.dataset.logonPower ?? "" }
      }));
  });
  dfDollar6(el).find(".logon-form").on("submit", (e) => {
    e.preventDefault();
    const input = dfDollar6(el).find('.logon-form input[type="password"]').get(0);
    submit(el, el.dataset.user ?? "", input?.value ?? "");
  });
  el.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && e.target.closest(".logon-form")) {
      e.preventDefault();
      logonApi.setState(el, "default", {});
    }
    const u = e.target.closest(".logon-user");
    if (!u || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key))
      return;
    const all = users(el);
    const next = all[(all.indexOf(u) + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1) + all.length) % all.length];
    e.preventDefault();
    next.focus();
  });
}
var fail = (target, message) => {
  const el = resolve5(target);
  if (el)
    logonApi.setState(el, "error", { user: el.dataset.user ?? "", message });
  return el;
};
var done = (target) => {
  const el = resolve5(target);
  if (el)
    logonApi.setState(el, "signed-in", { user: el.dataset.user ?? "" });
  return el;
};
var lock = (target) => {
  const el = resolve5(target);
  if (el)
    logonApi.setState(el, "default", {});
  return el;
};
var logonActions = { fail, done, lock };
df$6.logon = logonActions;
function init6() {
  dfDollar6(".logon:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    for (const u of users(el))
      if (!u.hasAttribute("aria-pressed"))
        u.setAttribute("aria-pressed", "false");
    el.dataset.stateName = el.hasAttribute("data-signed-in") ? "signed-in" : "default";
    if (el.dataset.stateName === "signed-in")
      applyMarkup6(el, "signed-in", { user: el.dataset.user ?? "" });
    bind4(el);
    bindComponent6(el, logonApi);
  });
}
init6();
new MutationObserver(init6).observe(document, { childList: true, subtree: true });

//# debugId=EE4143F8A1C9368A64756E2164756E21
//# sourceMappingURL=desktop.js.map
