// dist/components/anim-canvas/anim-canvas.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.9.8") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals, defussQuery, anim, bindGlobalKeys, entrance, draw, animateCount, componentState, bindComponent } = __df$shared;
var df$ = defussGlobals();
var dfDollar = defussQuery();
var animCanvasStates = ["default", "overview"];
var DIRS = {
  east: [1, 0],
  west: [-1, 0],
  south: [0, 1],
  north: [0, -1]
};
function channelFor(name) {
  if (!anim.names.includes(name)) {
    throw new Error(`anim-canvas: unknown animation "${name}" (supported: ${anim.names.join(", ")})`);
  }
  return anim[name];
}
function animNameFor(slide) {
  return slide.dataset.animIn || "slideIn";
}
function animOptsFor(slide, travel) {
  const d = slide.dataset;
  const p = "animIn";
  const opts = { direction: d[`${p}Direction`] ?? travel };
  const duration = parseFloat(d[`${p}Duration`] ?? "");
  if (Number.isFinite(duration))
    opts.duration = duration;
  const delay = parseFloat(d[`${p}Delay`] ?? "");
  if (Number.isFinite(delay))
    opts.delay = delay;
  if (d[`${p}Easing`])
    opts.easing = d[`${p}Easing`];
  if (d[`${p}Origin`])
    opts.origin = d[`${p}Origin`];
  if (d[`${p}Distance`])
    opts.distance = d[`${p}Distance`];
  const blocks = parseInt(d[`${p}Blocks`] ?? "", 10);
  if (Number.isFinite(blocks))
    opts.blocks = blocks;
  const stagger = parseFloat(d[`${p}Stagger`] ?? "");
  if (Number.isFinite(stagger))
    opts.stagger = stagger;
  if (d[`${p}Color`])
    opts.color = d[`${p}Color`];
  return opts;
}
var transformFor = (v) => `translate(${v.tx}px, ${v.ty}px) scale(${v.s})`;
var reducedMotion = () => typeof globalThis.matchMedia === "function" && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
function panDuration(root) {
  if (reducedMotion())
    return 1;
  const v = parseFloat(root.dataset.panDuration ?? "");
  return Number.isFinite(v) ? v : 1500;
}
function focusView(root, ctx, slide) {
  const box = root.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0)
    return null;
  const p = ctx.pos.get(slide) ?? { x: 0, y: 0 };
  const s = Math.min(box.width / ctx.w, box.height / ctx.h);
  return {
    s,
    tx: (box.width - ctx.w * s) / 2 - p.x * (ctx.w + ctx.gap) * s,
    ty: (box.height - ctx.h * s) / 2 - p.y * (ctx.h + ctx.gap) * s
  };
}
function overviewView(root, ctx) {
  const box = root.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0)
    return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of ctx.pos.values()) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const bw = (maxX - minX + 1) * (ctx.w + ctx.gap) - ctx.gap;
  const bh = (maxY - minY + 1) * (ctx.h + ctx.gap) - ctx.gap;
  const s = Math.min(box.width / bw, box.height / bh) * 0.92;
  return {
    s,
    tx: (box.width - bw * s) / 2 - minX * (ctx.w + ctx.gap) * s,
    ty: (box.height - bh * s) / 2 - minY * (ctx.h + ctx.gap) * s
  };
}
function panTo(root, ctx, view, animate = true) {
  if (!view)
    return Promise.resolve();
  ctx.pan?.cancel();
  ctx.pan = null;
  const to = transformFor(view);
  const from = ctx.view ? transformFor(ctx.view) : null;
  ctx.view = view;
  if (!animate || !from || from === to || panDuration(root) <= 1) {
    ctx.board.style.transform = to;
    return Promise.resolve();
  }
  const flight = ctx.board.animate([{ transform: from }, { transform: to }], {
    duration: panDuration(root),
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    fill: "both"
  });
  ctx.pan = flight;
  return flight.finished.catch(() => {
    return;
  }).then(() => {
    if (ctx.pan === flight) {
      ctx.board.style.transform = to;
      flight.cancel();
      ctx.pan = null;
    }
  });
}
function applySlideState(root, ctx) {
  const overview = root.hasAttribute("data-overview");
  for (const s of ctx.slides) {
    const on = overview || s === ctx.active;
    s.inert = !on;
    if (on)
      s.removeAttribute("aria-hidden");
    else
      s.setAttribute("aria-hidden", "true");
  }
  dfDollar(root).find("[data-anim-canvas-go]").toArray().forEach((el) => {
    const dir = el.getAttribute("data-anim-canvas-go");
    if (dir === "overview" || !(el instanceof HTMLButtonElement))
      return;
    el.disabled = !ctx.active.dataset[dir];
  });
}
function activate(root, ctx, slide) {
  ctx.active = slide;
  for (const s of ctx.slides)
    s.toggleAttribute("data-active", s === slide);
  root.dataset.currentSlide = slide.id;
  applySlideState(root, ctx);
}
function arrivalLead(root) {
  return reducedMotion() ? 0 : Math.round(panDuration(root) * 0.35);
}
var CONTENT_LAG = 280;
function cssMs(v) {
  const first = (v || "").split(",")[0].trim();
  const n = parseFloat(first);
  if (!Number.isFinite(n))
    return 0;
  return first.endsWith("ms") ? n : n * 1000;
}
function replayContent(slide, offset) {
  const withOffset = (el) => {
    const d = el.dataset;
    if (d.animCanvasBaseDelay === undefined)
      d.animCanvasBaseDelay = String(cssMs(getComputedStyle(el).animationDelay));
    return parseFloat(d.animCanvasBaseDelay) + offset;
  };
  dfDollar(slide).find("[data-df-entrance]").toArray().forEach((el) => {
    entrance(el, undefined, { delay: withOffset(el) });
  });
  dfDollar(slide).find("[data-df-draw]").toArray().forEach((el) => {
    draw(el, { delay: withOffset(el) });
  });
  dfDollar(slide).find("[data-count]").toArray().forEach((el) => {
    animateCount(el, { delay: offset });
  });
}
function settle(slide) {
  for (const a of slide.getAnimations({ subtree: true })) {
    try {
      a.finish();
    } catch {
      a.cancel();
    }
  }
}
function arrive(root, target, travel) {
  const lead = arrivalLead(root);
  const inName = animNameFor(target);
  const opts = animOptsFor(target, travel);
  if (opts.delay === undefined)
    opts.delay = lead;
  channelFor(inName === "blocksIn" ? "blocksOut" : inName).play(target, opts);
  replayContent(target, (opts.delay ?? lead) + (reducedMotion() ? 0 : CONTENT_LAG));
}
async function goTo(root, ctx, id) {
  const target = ctx.byId.get(id);
  if (!target) {
    console.error(`anim-canvas: goTo("${id}") - no .anim-canvas-slide with that id in this canvas`);
    return;
  }
  if (ctx.busy)
    return;
  if (target === ctx.active && !root.hasAttribute("data-overview"))
    return;
  ctx.busy = true;
  try {
    if (root.hasAttribute("data-overview")) {
      root.removeAttribute("data-overview");
      activate(root, ctx, target);
      replayContent(target, reducedMotion() ? 0 : Math.round(panDuration(root) * 0.5));
      await panTo(root, ctx, focusView(root, ctx, target));
      return;
    }
    const from = ctx.pos.get(ctx.active) ?? { x: 0, y: 0 };
    const to = ctx.pos.get(target) ?? from;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const travel = dx > 0 ? "east" : dx < 0 ? "west" : dy > 0 ? "south" : dy < 0 ? "north" : "east";
    settle(ctx.active);
    activate(root, ctx, target);
    const pan = panTo(root, ctx, focusView(root, ctx, target));
    arrive(root, target, travel);
    await pan;
  } finally {
    ctx.busy = false;
  }
}
function enterOverview(root, ctx) {
  if (root.hasAttribute("data-overview"))
    return;
  ctx.busy = true;
  root.setAttribute("data-overview", "");
  applySlideState(root, ctx);
  panTo(root, ctx, overviewView(root, ctx)).then(() => {
    ctx.busy = false;
  });
}
function exitOverview(root, ctx, focus) {
  if (!root.hasAttribute("data-overview"))
    return;
  ctx.busy = true;
  root.removeAttribute("data-overview");
  if (focus && ctx.byId.get(focus.id) === focus) {
    activate(root, ctx, focus);
    replayContent(focus, reducedMotion() ? 0 : Math.round(panDuration(root) * 0.5));
  } else
    applySlideState(root, ctx);
  panTo(root, ctx, focusView(root, ctx, ctx.active)).then(() => {
    ctx.busy = false;
  });
}
function toggleOverview(root, ctx) {
  if (root.hasAttribute("data-overview"))
    exitOverview(root, ctx);
  else
    enterOverview(root, ctx);
}
function applyMarkup(root, stateName, config = {}) {
  const slides = dfDollar(root).find(".anim-canvas-slide").toArray();
  if (slides.length === 0)
    return;
  const overview = stateName === "overview" && config.value !== false;
  const active = slides.find((sl) => sl.id === config.slide) ?? slides.find((sl) => sl.hasAttribute("data-active")) ?? slides[0];
  dfDollar(root).attr("data-overview", overview ? "" : null).attr("data-current-slide", active.id);
  for (const sl of slides) {
    const on = overview || sl === active;
    dfDollar(sl).attr("data-active", sl === active ? "" : null).attr("inert", on ? null : "").attr("aria-hidden", on ? null : "true");
  }
  dfDollar(root).find("[data-anim-canvas-go]").each((_i, el) => {
    const dir = el.getAttribute("data-anim-canvas-go");
    if (dir === "overview" || !(el instanceof HTMLButtonElement))
      return;
    dfDollar(el).attr("disabled", active.dataset[dir] ? null : "");
  });
}
function triggerStateChange(root, stateName, config = {}) {
  if (!animCanvasStates.includes(stateName)) {
    throw new Error(`anim-canvas: unknown state "${stateName}" (supported: ${animCanvasStates.join(", ")})`);
  }
  const ctx = root._animCanvas;
  if (!ctx)
    return;
  if (stateName === "overview") {
    if (config.value === false)
      exitOverview(root, ctx);
    else
      enterOverview(root, ctx);
    return;
  }
  if (typeof config.slide === "string")
    goTo(root, ctx, config.slide);
  else if (root.hasAttribute("data-overview"))
    exitOverview(root, ctx);
  else
    panTo(root, ctx, focusView(root, ctx, ctx.active));
}
var animCanvasApi = componentState({
  component: "anim-canvas",
  states: animCanvasStates,
  apply: (root, state) => triggerStateChange(root, state.name, state.config),
  read: (root, state) => {
    const ctx = root._animCanvas;
    return {
      name: root.dataset.stateName || "default",
      config: {
        ...state.config,
        slide: ctx?.active.id,
        overview: root.hasAttribute("data-overview")
      }
    };
  },
  markup: (el, state) => applyMarkup(el, state.name, state.config)
});
df$.animCanvasApi = animCanvasApi;
df$.animCanvasStates = animCanvasStates;
function pickCanvas(target) {
  const focused = target instanceof HTMLElement ? target.closest(".anim-canvas") : null;
  if (focused)
    return focused;
  const all = Array.from(dfDollar(".anim-canvas").toArray());
  return all.find((r) => {
    const b = r.getBoundingClientRect();
    return b.bottom > 0 && b.top < globalThis.innerHeight && b.right > 0 && b.left < globalThis.innerWidth;
  }) ?? all[0] ?? null;
}
var keysBound = false;
function bindKeys() {
  if (keysBound)
    return;
  keysBound = true;
  bindGlobalKeys((e) => {
    const key = e.key;
    const dir = key === "ArrowRight" ? "east" : key === "ArrowLeft" ? "west" : key === "ArrowDown" ? "south" : key === "ArrowUp" ? "north" : null;
    const toggle = key === "o" || key === "O" || key === "Escape";
    if (!dir && !toggle)
      return;
    const root = pickCanvas(e.target);
    const ctx = root?._animCanvas;
    if (!root || !ctx)
      return;
    if (dir && !ctx.active.dataset[dir])
      return;
    e.preventDefault();
    if (dir)
      goTo(root, ctx, ctx.active.dataset[dir]);
    else
      toggleOverview(root, ctx);
    return true;
  });
}
function init() {
  dfDollar(".anim-canvas:not([data-init])").toArray().forEach((root) => {
    root.dataset.init = "";
    bindComponent(root, animCanvasApi);
    let board = dfDollar(root).find(":scope > .anim-canvas-board").get(0) ?? null;
    if (!board) {
      board = document.createElement("div");
      board.className = "anim-canvas-board";
      for (const slide of Array.from(dfDollar(root).find(":scope > .anim-canvas-slide").toArray())) {
        dfDollar(board).append(slide);
      }
      root.prepend(board);
    }
    const slides = dfDollar(board).find(".anim-canvas-slide");
    if (slides.length === 0)
      return;
    const cs = getComputedStyle(root);
    const w = parseFloat(cs.getPropertyValue("--anim-canvas-width")) || 1280;
    const h = parseFloat(cs.getPropertyValue("--anim-canvas-height")) || 720;
    const gapRaw = parseFloat(cs.getPropertyValue("--anim-canvas-gap"));
    const gap = Number.isFinite(gapRaw) && gapRaw >= 0 ? gapRaw : 80;
    const byId = new Map;
    for (const s of slides) {
      if (!s.id) {
        console.error("anim-canvas: every .anim-canvas-slide needs an id - the data-east/west/north/south relation map references slides by id");
        continue;
      }
      byId.set(s.id, s);
    }
    const start = slides.find((s) => s.hasAttribute("data-active")) ?? slides[0];
    const pos = new Map([[start, { x: 0, y: 0 }]]);
    const queue = [start];
    for (let qi = 0;qi < queue.length; qi++) {
      const cur = queue[qi];
      const p = pos.get(cur);
      for (const dir of Object.keys(DIRS)) {
        const ref = cur.dataset[dir];
        if (!ref)
          continue;
        const neighbor = byId.get(ref);
        if (!neighbor) {
          console.error(`anim-canvas: #${cur.id || "(unnamed)"} declares data-${dir}="${ref}" but no .anim-canvas-slide with id="${ref}" exists in this canvas - dangling id ref`);
          continue;
        }
        const np = { x: p.x + DIRS[dir][0], y: p.y + DIRS[dir][1] };
        const existing = pos.get(neighbor);
        if (existing) {
          if (existing.x !== np.x || existing.y !== np.y) {
            console.error(`anim-canvas: conflicting position for #${ref} - reached as (${np.x},${np.y}) from #${cur.id}, already placed at (${existing.x},${existing.y}); the relation map must be consistent`);
          }
          continue;
        }
        pos.set(neighbor, np);
        queue.push(neighbor);
      }
    }
    const unreachable = slides.filter((s) => !pos.has(s));
    if (unreachable.length) {
      console.error(`anim-canvas: ${unreachable.map((s) => `#${s.id || "(unnamed)"}`).join(", ")} unreachable from #${start.id || "(the first slide)"} - wire them into the data-east/west/north/south relation map`);
      let fx = Math.max(...Array.from(pos.values()).map((p) => p.x)) + 1;
      for (const s of unreachable)
        pos.set(s, { x: fx++, y: 0 });
    }
    const taken = new Map;
    for (const [s, p] of pos) {
      const k = `${p.x},${p.y}`;
      const other = taken.get(k);
      if (other) {
        console.error(`anim-canvas: #${s.id || "(unnamed)"} and #${other.id || "(unnamed)"} both land on board cell (${k}) - the relation map must give every slide its own cell`);
      } else
        taken.set(k, s);
    }
    for (const [s, p] of pos) {
      s.style.left = `${p.x * (w + gap)}px`;
      s.style.top = `${p.y * (h + gap)}px`;
      s.style.width = `${w}px`;
      s.style.height = `${h}px`;
    }
    for (const s of slides) {
      if (s.dataset.animIn)
        channelFor(s.dataset.animIn);
      if (s.dataset.animOut) {
        console.warn(`anim-canvas: #${s.id || "(unnamed)"} declares data-anim-out="${s.dataset.animOut}" - ignored: only the ARRIVING slide animates (declare its data-anim-in)`);
      }
    }
    const ctx = { board, slides, byId, pos, w, h, gap, active: start, busy: false, view: null, pan: null };
    root._animCanvas = ctx;
    root.addEventListener("click", (e) => {
      const c = root._animCanvas;
      if (!c)
        return;
      const t = e.target;
      const control = t?.closest?.("[data-anim-canvas-go]");
      if (control && root.contains(control)) {
        const dir = control.getAttribute("data-anim-canvas-go");
        if (dir === "overview")
          toggleOverview(root, c);
        else {
          const id = c.active.dataset[dir];
          if (id)
            goTo(root, c, id);
        }
        return;
      }
      if (!root.hasAttribute("data-overview"))
        return;
      const tile = t?.closest?.(".anim-canvas-slide");
      if (tile && c.slides.includes(tile))
        exitOverview(root, c, tile);
    });
    const frame = () => {
      const c = root._animCanvas;
      if (!c)
        return;
      panTo(root, c, root.hasAttribute("data-overview") ? overviewView(root, c) : focusView(root, c, c.active), false);
    };
    new ResizeObserver(frame).observe(root);
    activate(root, ctx, start);
    frame();
    dfDollar(start).find("[data-count]").toArray().forEach((el) => {
      animateCount(el);
    });
  });
}
bindKeys();
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

//# debugId=0114608F5B9D2F8564756E2164756E21
//# sourceMappingURL=guides.js.map
