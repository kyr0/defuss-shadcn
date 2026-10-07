// dist/components/diagram/diagram.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.9.7") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals, defussQuery, componentState, bindComponent } = __df$shared;
var df$ = defussGlobals();
var dfDollar = defussQuery();
var diagramStates = ["default", "playing", "paused", "active"];
var SVG_NS = "http://www.w3.org/2000/svg";
var RUNTIME = ".diagram-delta, .diagram-controls, .diagram-wire-labels, .diagram-wires";
var reducedMotion = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
var authored = (scope, selector) => dfDollar(scope).find(selector).toArray().filter((n) => !n.closest(RUNTIME));
function parseEnd(value) {
  const [ref, side] = String(value || "").split(":");
  const [id, field] = ref.split("#");
  return { id, field: field || null, side: side || null };
}
function edgeListOf(root, canvas) {
  return dfDollar(canvas).children(".diagram-edges").get(0) ?? dfDollar(root).children(".diagram-edges").get(0) ?? null;
}
var edgesIn = (list) => list ? dfDollar(list).find(".diagram-edge").toArray() : [];
function nameOf(el) {
  if (!el)
    return "";
  if (el.dataset.changeLabel)
    return el.dataset.changeLabel;
  const named = dfDollar(el).find(".diagram-node-name, .diagram-group-label").get(0) ?? (el.tagName === "LI" && el.children.length ? el.firstElementChild : null);
  const text = (named ?? el).textContent.replace(/\s+/g, " ").trim();
  return text.length > 48 ? `${text.slice(0, 47)}…` : text;
}
function stepPlan(root) {
  const stepOf = new Map;
  const explicit = authored(root, "[data-step]");
  const nodes = authored(root, ".diagram-node");
  if (explicit.length) {
    explicit.forEach((n) => stepOf.set(n, Math.max(0, parseInt(n.dataset.step, 10) || 0)));
  } else {
    let k = 0;
    const sequence = root.dataset.type === "sequence";
    const units = sequence ? [] : nodes.length ? nodes : authored(root, "tbody > tr");
    if (sequence)
      nodes.forEach((n) => stepOf.set(n, 0));
    units.forEach((n) => stepOf.set(n, ++k));
    authored(root, ".diagram-group").forEach((g) => {
      const inner = units.filter((n) => g.contains(n)).map((n) => stepOf.get(n));
      stepOf.set(g, inner.length ? Math.min(...inner) : 0);
    });
  }
  const byId = new Map(authored(root, "[data-node]").map((n) => [n.dataset.node, n]));
  const stepOfEl = (el) => {
    for (let n = el;n && n !== root; n = n.parentElement)
      if (stepOf.has(n))
        return stepOf.get(n);
    return 0;
  };
  authored(root, ".diagram-edge").forEach((edge, i) => {
    if (stepOf.has(edge))
      return;
    const a = byId.get(parseEnd(edge.dataset.from).id);
    const b = byId.get(parseEnd(edge.dataset.to).id);
    stepOf.set(edge, root.dataset.type === "sequence" ? i + 1 : Math.max(stepOfEl(a), stepOfEl(b)));
  });
  const max = Math.max(0, ...stepOf.values());
  return { stepOf, max };
}
function applyMarkup(root, state) {
  const { stepOf, max } = stepPlan(root);
  applyActivation(root, state.name === "active" ? state.config?.ref ?? null : null);
  if (state.name === "default" || state.name === "active") {
    dfDollar(root).attr("data-step-current", null);
    stepOf.forEach((_s, el) => {
      dfDollar(el).attr("data-step-state", null);
      beat(el, null);
    });
    return;
  }
  const current = stateStep(state, max);
  dfDollar(root).attr("data-step-current", String(current));
  stepOf.forEach((s, el) => {
    dfDollar(el).attr("data-step-state", s <= 0 || s < current ? "past" : s === current ? "current" : "future");
  });
  beats(root, stepOf, current);
}
function beat(el, i) {
  if (i == null)
    el.style.removeProperty("--step-i");
  else
    el.style.setProperty("--step-i", String(i));
  if (el.getAttribute("style") === "")
    el.removeAttribute("style");
}
function beats(root, stepOf, current) {
  const items = [];
  stepOf.forEach((s, el) => {
    if (s === current && current > 0)
      items.push(el);
    else
      beat(el, null);
  });
  const boxes = items.filter((el) => !el.classList.contains("diagram-edge"));
  const index = new Map(boxes.map((el, i) => [el, i]));
  boxes.forEach((el, i) => beat(el, i));
  const nodeOf = (end) => authored(root, "[data-node]").find((n) => n.dataset.node === parseEnd(end).id);
  const at = (el) => {
    for (let n = el;n && n !== root; n = n.parentElement)
      if (index.has(n))
        return index.get(n);
    return -1;
  };
  for (const edge of items.filter((el) => el.classList.contains("diagram-edge"))) {
    beat(edge, Math.max(at(nodeOf(edge.dataset.from)), at(nodeOf(edge.dataset.to)), -0.4) + 0.6);
  }
  return Math.max(1, boxes.length);
}
var edgeRef = (edge) => edge.dataset.edge || `${edge.dataset.from}->${edge.dataset.to}`;
var activatable = (root) => authored(root, "[data-node]").filter((n) => !n.classList.contains("diagram-group") && n.dataset.shape !== "ghost");
function refTarget(root, ref) {
  if (ref == null || ref === "")
    return null;
  const node = activatable(root).find((n) => n.dataset.node === ref);
  if (node)
    return { kind: "node", el: node };
  const edge = authored(root, ".diagram-edge").find((e) => edgeRef(e) === String(ref));
  return edge ? { kind: "edge", el: edge } : null;
}
function applyActivation(root, ref) {
  const nodes = activatable(root);
  const edges = authored(root, ".diagram-edge");
  const target = refTarget(root, ref);
  dfDollar(root).attr("data-active", target ? String(ref) : null);
  const interactive = root.hasAttribute("data-interactive");
  if (!target) {
    for (const el of [...nodes, ...edges])
      dfDollar(el).attr("data-active-state", null);
    if (interactive)
      for (const n of nodes)
        dfDollar(n).attr(pressedAttr(n), "false");
    return;
  }
  const related = new Set;
  const idOf = (end) => parseEnd(end).id;
  if (target.kind === "node") {
    const id = target.el.dataset.node;
    for (const e of edges) {
      if (idOf(e.dataset.from) !== id && idOf(e.dataset.to) !== id)
        continue;
      related.add(e);
      for (const end of [idOf(e.dataset.from), idOf(e.dataset.to)])
        related.add(nodes.find((n) => n.dataset.node === end));
    }
  } else {
    for (const end of [idOf(target.el.dataset.from), idOf(target.el.dataset.to)])
      related.add(nodes.find((n) => n.dataset.node === end));
  }
  for (const el of [...nodes, ...edges]) {
    dfDollar(el).attr("data-active-state", el === target.el ? "active" : related.has(el) ? "related" : "dimmed");
  }
  if (interactive)
    for (const n of nodes)
      dfDollar(n).attr(pressedAttr(n), n === target.el ? "true" : "false");
}
var tablePart = (el) => /^(TR|TD|TH)$/.test(el.tagName);
var pressedAttr = (el) => tablePart(el) ? "aria-selected" : "aria-pressed";
function describe(root, ref) {
  const target = refTarget(root, ref);
  if (!target)
    return null;
  const { kind, el } = target;
  if (el.tagName === "TR") {
    const cells = dfDollar(el).children("th, td").toArray();
    const own = (c) => [...c.childNodes].filter((n) => n.nodeType === 3 || !/^(SMALL)$/.test(n.nodeName)).map((n) => n.textContent).join("").trim();
    const heads = dfDollar(el.closest("table")).find("thead tr").first().children("th, td").toArray();
    const detail = cells.slice(1).map((c, i) => `${heads[i + 1] ? own(heads[i + 1]) : ""} ${c.textContent.trim()}`.trim()).join(" · ");
    return { ref: String(ref), kind, element: el, label: own(cells[0]), detail };
  }
  if (kind === "node") {
    const meta = dfDollar(el).find(".diagram-node-meta").get(0)?.textContent.trim() ?? "";
    return { ref: String(ref), kind, element: el, label: nameOf(el), detail: el.dataset.detail || meta };
  }
  const name = (end) => {
    const n = activatable(root).find((x) => x.dataset.node === parseEnd(end).id);
    return n ? nameOf(n) : parseEnd(end).id;
  };
  const text = el.textContent.trim();
  return { ref: String(ref), kind, element: el, label: `${name(el.dataset.from)} → ${name(el.dataset.to)}${text ? ` · ${text}` : ""}`, detail: el.dataset.detail || "" };
}
function activationOrder(root) {
  const { stepOf } = stepPlan(root);
  const stepFor = (n) => {
    for (let x = n;x && x !== root; x = x.parentElement)
      if (stepOf.has(x))
        return stepOf.get(x);
    return 0;
  };
  return activatable(root).map((n, i) => ({ n, i, s: stepFor(n) })).sort((a, b) => a.s - b.s || a.i - b.i).map((x) => x.n.dataset.node);
}
function stepActivation(root, by) {
  const order = activationOrder(root);
  if (!order.length)
    return;
  const state = root._shown ?? root.store?.value ?? { name: "default" };
  const at = state.name === "active" ? order.indexOf(String(state.config?.ref)) : -1;
  const next = at < 0 ? by > 0 ? 0 : order.length - 1 : (at + by + order.length) % order.length;
  root.api.setState("active", { ref: order[next] });
}
var stepping = (state) => state.name === "playing" || state.name === "paused";
var clampStep = (step, max) => Math.min(max, Math.max(0, Math.round(+step)));
var stateStep = (state, max) => {
  const step = state.config?.step;
  if (step != null && step !== "" && Number.isFinite(+step))
    return clampStep(step, max);
  return state.name === "playing" ? Math.min(1, max) : max;
};
function stepLabel(root, step) {
  const { stepOf } = stepPlan(root);
  for (const [el, s] of stepOf)
    if (s === step)
      return el.dataset.stepLabel || nameOf(el);
  return "";
}
var NORMAL = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] };
var horizontal = (side) => side === "left" || side === "right";
var ROUND = new Set(["dot", "circle", "start", "end", "ring", "event"]);
var r1 = (n) => Math.round(n * 10) / 10;
function sidePoint(r, side, t = 0.5) {
  if (side === "top")
    return { x: r.x + r.w * t, y: r.y };
  if (side === "bottom")
    return { x: r.x + r.w * t, y: r.y + r.h };
  if (side === "left")
    return { x: r.x, y: r.y + r.h * t };
  return { x: r.x + r.w, y: r.y + r.h * t };
}
var center = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
function boundary(r, toward, round) {
  const c = center(r);
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  if (!dx && !dy)
    return c;
  if (round) {
    const l = Math.hypot(dx, dy);
    const rad = Math.min(r.w, r.h) / 2;
    return { x: c.x + dx / l * rad, y: c.y + dy / l * rad };
  }
  const t = Math.min(r.w / 2 / Math.abs(dx || 0.000000001), r.h / 2 / Math.abs(dy || 0.000000001));
  return { x: c.x + dx * t, y: c.y + dy * t };
}
function facingSides(a, b) {
  const ca = center(a);
  const cb = center(b);
  const gapX = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
  const gapY = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
  const useX = gapX > 0 || gapY > 0 ? gapX >= gapY : Math.abs(cb.x - ca.x) >= Math.abs(cb.y - ca.y);
  if (useX)
    return cb.x >= ca.x ? ["right", "left"] : ["left", "right"];
  return cb.y >= ca.y ? ["bottom", "top"] : ["top", "bottom"];
}
function crosses(pts, r) {
  const x0 = r.x + 2;
  const x1 = r.x + r.w - 2;
  const y0 = r.y + 2;
  const y1 = r.y + r.h - 2;
  for (let i = 1;i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (Math.max(a.x, b.x) < x0 || Math.min(a.x, b.x) > x1 || Math.max(a.y, b.y) < y0 || Math.min(a.y, b.y) > y1)
      continue;
    return true;
  }
  return false;
}
function bestSides(a, b, fixedA, fixedB, obstacles, texts = []) {
  const [fa, fb] = facingSides(a.rect, b.rect);
  const sides = ["top", "right", "bottom", "left"];
  let best = null;
  const pa0 = (sa) => sidePoint(a.rect, sa);
  const pb0 = (sb) => sidePoint(b.rect, sb);
  const clearing = (sa, sb) => {
    if (sa !== sb)
      return [null];
    const lo = Math.min(a.rect.x, b.rect.x) - 8;
    const hi = Math.max(a.rect.x + a.rect.w, b.rect.x + b.rect.w) + 8;
    const top = Math.min(a.rect.y, b.rect.y) - 8;
    const bot = Math.max(a.rect.y + a.rect.h, b.rect.y + b.rect.h) + 8;
    const between = obstacles.filter((o) => o !== a && o !== b && (horizontal(sa) ? o.rect.y < bot && o.rect.y + o.rect.h > top : o.rect.x < hi && o.rect.x + o.rect.w > lo));
    if (!between.length)
      return [null];
    if (sa === "top")
      return [null, Math.min(...between.map((o) => o.rect.y), a.rect.y, b.rect.y) - 18];
    if (sa === "bottom")
      return [null, Math.max(...between.map((o) => o.rect.y + o.rect.h), a.rect.y + a.rect.h, b.rect.y + b.rect.h) + 18];
    if (sa === "left")
      return [null, Math.min(...between.map((o) => o.rect.x), a.rect.x, b.rect.x) - 18];
    return [null, Math.max(...between.map((o) => o.rect.x + o.rect.w), a.rect.x + a.rect.w, b.rect.x + b.rect.w) + 18];
  };
  for (const sa of fixedA ? [fixedA] : sides) {
    for (const sb of fixedB ? [fixedB] : sides) {
      for (const outer of clearing(sa, sb)) {
        const pts = elbow(pa0(sa), sa, pb0(sb), sb, 16, outer);
        let score = 0;
        for (let i = 1;i < pts.length; i++)
          score += Math.abs(pts[i].x - pts[i - 1].x) + Math.abs(pts[i].y - pts[i - 1].y);
        score += (pts.length - 2) * 30;
        if (sa !== fa || sb !== fb)
          score += 12;
        for (const o of obstacles) {
          if (o === a || o === b || o.el.contains(a.el) || o.el.contains(b.el))
            continue;
          const r = o.rect;
          if (crosses(pts, { x: r.x - 8, y: r.y - 8, w: r.w + 16, h: r.h + 16 }))
            score += 1e4;
        }
        for (const t of texts)
          if (crosses(pts, t))
            score += 4000;
        if (crosses(pts.slice(1), a.rect) || crosses(pts.slice(0, -1), b.rect))
          score += 5000;
        if (!best || score < best.score)
          best = { score, sa, sb, outer };
      }
    }
  }
  return [best.sa, best.sb, best.outer ?? null];
}
function simplify(points) {
  const out = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.5 && Math.abs(last.y - p.y) < 0.5)
      continue;
    out.push(p);
    while (out.length >= 3) {
      const [a, b, c] = out.slice(-3);
      const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      if (Math.abs(cross) > 0.5)
        break;
      out.splice(out.length - 2, 1);
    }
  }
  return out;
}
function elbow(a, sa, b, sb, gap = 16, outside = null) {
  const na = NORMAL[sa];
  const nb = NORMAL[sb];
  const pts = [a];
  if (horizontal(sa) && horizontal(sb)) {
    if (outside != null) {
      pts.push({ x: outside, y: a.y }, { x: outside, y: b.y });
    } else if (sa !== sb && (b.x - a.x) * na[0] > gap) {
      const mx = (a.x + b.x) / 2;
      pts.push({ x: mx, y: a.y }, { x: mx, y: b.y });
    } else if (sa === sb) {
      const x = sa === "right" ? Math.max(a.x, b.x) + gap * 1.5 : Math.min(a.x, b.x) - gap * 1.5;
      pts.push({ x, y: a.y }, { x, y: b.y });
    } else {
      const x1 = a.x + na[0] * gap;
      const x2 = b.x + nb[0] * gap;
      const my = (a.y + b.y) / 2;
      pts.push({ x: x1, y: a.y }, { x: x1, y: my }, { x: x2, y: my }, { x: x2, y: b.y });
    }
  } else if (!horizontal(sa) && !horizontal(sb)) {
    if (outside != null) {
      pts.push({ x: a.x, y: outside }, { x: b.x, y: outside });
    } else if (sa !== sb && (b.y - a.y) * na[1] > gap) {
      const my = (a.y + b.y) / 2;
      pts.push({ x: a.x, y: my }, { x: b.x, y: my });
    } else if (sa === sb) {
      const y = sa === "bottom" ? Math.max(a.y, b.y) + gap * 1.5 : Math.min(a.y, b.y) - gap * 1.5;
      pts.push({ x: a.x, y }, { x: b.x, y });
    } else {
      const y1 = a.y + na[1] * gap;
      const y2 = b.y + nb[1] * gap;
      const mx = (a.x + b.x) / 2;
      pts.push({ x: a.x, y: y1 }, { x: mx, y: y1 }, { x: mx, y: y2 }, { x: b.x, y: y2 });
    }
  } else if (horizontal(sa)) {
    const corner = { x: b.x, y: a.y };
    if ((corner.x - a.x) * na[0] > 0 && (corner.y - b.y) * nb[1] > 0)
      pts.push(corner);
    else {
      const a1 = { x: a.x + na[0] * gap, y: a.y };
      const b1 = { x: b.x, y: b.y + nb[1] * gap };
      pts.push(a1, { x: a1.x, y: b1.y }, b1);
    }
  } else {
    const corner = { x: a.x, y: b.y };
    if ((corner.y - a.y) * na[1] > 0 && (corner.x - b.x) * nb[0] > 0)
      pts.push(corner);
    else {
      const a1 = { x: a.x, y: a.y + na[1] * gap };
      const b1 = { x: b.x + nb[0] * gap, y: b.y };
      pts.push(a1, { x: b1.x, y: a1.y }, b1);
    }
  }
  pts.push(b);
  return simplify(pts);
}
var corner = 8;
function roundedPath(pts, r = corner) {
  let d = `M${r1(pts[0].x)} ${r1(pts[0].y)}`;
  for (let i = 1;i < pts.length - 1; i++) {
    const p0 = pts[i - 1];
    const p = pts[i];
    const p1 = pts[i + 1];
    const l0 = Math.hypot(p.x - p0.x, p.y - p0.y);
    const l1 = Math.hypot(p1.x - p.x, p1.y - p.y);
    const rr = Math.min(r, l0 / 2, l1 / 2);
    if (rr < 0.5) {
      d += ` L${r1(p.x)} ${r1(p.y)}`;
      continue;
    }
    const a = { x: p.x + (p0.x - p.x) / l0 * rr, y: p.y + (p0.y - p.y) / l0 * rr };
    const b = { x: p.x + (p1.x - p.x) / l1 * rr, y: p.y + (p1.y - p.y) / l1 * rr };
    d += ` L${r1(a.x)} ${r1(a.y)} Q${r1(p.x)} ${r1(p.y)} ${r1(b.x)} ${r1(b.y)}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${r1(last.x)} ${r1(last.y)}`;
}
function labelSpot(pts) {
  let best = 0;
  let at = { x: pts[0].x, y: pts[0].y };
  let along = { x: 1, y: 0 };
  for (let i = 1;i < pts.length; i++) {
    const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (l > best) {
      best = l;
      at = { x: (pts[i].x + pts[i - 1].x) / 2, y: (pts[i].y + pts[i - 1].y) / 2 };
      along = { x: Math.abs(pts[i].x - pts[i - 1].x) > 0.5 ? 1 : 0, y: Math.abs(pts[i].y - pts[i - 1].y) > 0.5 ? 1 : 0, len: l };
    }
  }
  return { at, along };
}
var unit = (from, to) => {
  const l = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return { x: (to.x - from.x) / l, y: (to.y - from.y) / l };
};
var CROW = ["M-11 0L0 -6M-11 0L0 6M-11 0H0", "stroke"];
var HEADS = {
  arrow: { parts: [["M0 0L-9 -4.5L-9 4.5Z", "fill"]], inset: 3 },
  open: { parts: [["M-8 -4.5L0 0L-8 4.5", "stroke"]], inset: 0 },
  triangle: { parts: [["M0 0L-12 -6.5L-12 6.5Z", "hollow"]], inset: 12 },
  "triangle-filled": { parts: [["M0 0L-12 -6.5L-12 6.5Z", "fill"]], inset: 4 },
  diamond: { parts: [["M0 0L-7 -4.5L-14 0L-7 4.5Z", "fill"]], inset: 4 },
  "diamond-open": { parts: [["M0 0L-7 -4.5L-14 0L-7 4.5Z", "hollow"]], inset: 14 },
  dot: { parts: [["M-7 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0", "fill"]], inset: 3 },
  one: { parts: [["M-7 -6V6", "stroke"]], inset: 0 },
  "one-one": { parts: [["M-7 -6V6M-12 -6V6", "stroke"]], inset: 0 },
  many: { parts: [CROW], inset: 0 },
  "one-many": { parts: [CROW, ["M-15 -6V6", "stroke"]], inset: 0 },
  "zero-many": { parts: [CROW, ["M-23 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0", "hollow"]], inset: 0 },
  "zero-one": { parts: [["M-7 -6V6", "stroke"], ["M-19 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0", "hollow"]], inset: 0 },
  none: { parts: [], inset: 0 }
};
function svg(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs))
    if (v != null)
      el.setAttribute(k, String(v));
  return el;
}
function drawHead(group, kind, tip, dir) {
  const head = HEADS[kind] ?? HEADS.arrow;
  const angle = r1(Math.atan2(dir.y, dir.x) * 180 / Math.PI);
  for (const [d, paint] of head.parts) {
    group.append(svg("path", { class: "diagram-wire-head", "data-paint": paint, d, transform: `translate(${r1(tip.x)} ${r1(tip.y)}) rotate(${angle})` }));
  }
}
function inset(pts, by, atStart) {
  if (!by)
    return pts;
  const out = pts.map((p) => ({ ...p }));
  const [i, j] = atStart ? [0, 1] : [out.length - 1, out.length - 2];
  const u = unit(out[i], out[j]);
  const l = Math.hypot(out[j].x - out[i].x, out[j].y - out[i].y);
  const d = Math.min(by, l - 1);
  out[i] = { x: out[i].x + u.x * d, y: out[i].y + u.y * d };
  return out;
}
var panelOf = (canvas) => canvas.closest(".diagram-panel")?.dataset.panel ?? null;
function edgeIn(edge, panel) {
  const change = edge.dataset.change;
  if (panel === "before" && change === "added")
    return null;
  if (panel === "after" && change === "removed")
    return null;
  const before = panel === "before";
  return {
    from: before && edge.dataset.beforeFrom || edge.dataset.from,
    to: before && edge.dataset.beforeTo || edge.dataset.to
  };
}
function layer(canvas, cls, make, keep = false) {
  const existing = dfDollar(canvas).children(`.${cls}`).get(0);
  if (existing) {
    if (keep)
      for (const c of dfDollar(existing).children().toArray())
        c.setAttribute("data-stale", "");
    else
      dfDollar(existing).empty();
    return existing;
  }
  const el = make();
  dfDollar(canvas).append(el);
  return el;
}
function measure(canvas) {
  const box = canvas.getBoundingClientRect();
  const scale = box.width / (canvas.offsetWidth || box.width || 1) || 1;
  const ox = box.left + canvas.clientLeft * scale;
  const oy = box.top + canvas.clientTop * scale;
  const rectOf = (el) => {
    const r = el.getBoundingClientRect();
    return { x: (r.left - ox) / scale, y: (r.top - oy) / scale, w: r.width / scale, h: r.height / scale };
  };
  const settling = [];
  for (const el of dfDollar(canvas).find('[data-step-state="current"]').toArray()) {
    for (const a of el.getAnimations()) {
      if (a.animationName !== "diagram-enter" || a.playState !== "running" || !a.effect)
        continue;
      settling.push([a, a.currentTime]);
      a.currentTime = a.effect.getComputedTiming().endTime ?? 0;
    }
  }
  const nodes = new Map;
  for (const el of dfDollar(canvas).find("[data-node]").toArray()) {
    if (el.closest(".diagram-edges") || !el.getClientRects().length)
      continue;
    nodes.set(el.dataset.node, { el, rect: rectOf(el), round: ROUND.has(el.dataset.shape) });
  }
  for (const [a, t] of settling)
    a.currentTime = t;
  return { nodes, rectOf };
}
var FIT_MIN = 0.7;
function fit(root, canvas) {
  if (canvas.parentElement !== root)
    return;
  canvas.style.zoom = "";
  if (root.dataset.fit === "none")
    return;
  const natural = canvas.offsetWidth;
  const avail = root.clientWidth;
  const z = natural > avail + 1 ? Math.max(FIT_MIN, Math.floor(avail / natural * 1000) / 1000) : 1;
  if (z < 1)
    canvas.style.zoom = String(z);
}
function draw(root, canvas) {
  if (!canvas.isConnected || !canvas.getClientRects().length)
    return;
  if (!canvas._clearPass) {
    for (const side of SIDES) {
      canvas.style.removeProperty(`padding-${side}`);
      canvas.style.removeProperty(`--_inset-${side}`);
    }
  }
  fit(root, canvas);
  const { nodes, rectOf } = measure(canvas);
  const panel = panelOf(canvas);
  const entered = new Set;
  for (const el of dfDollar(canvas).find(':scope > .diagram-wires > .diagram-wire[data-step-state="current"], :scope > .diagram-wire-labels > [data-step-state="current"]').toArray()) {
    entered.add(`${el.tagName.toLowerCase()}|${el.dataset.edgeRef ?? ""}|${el.textContent ?? ""}`);
  }
  const wires = layer(canvas, "diagram-wires", () => {
    const el = svg("svg", { class: "diagram-wires", "aria-hidden": "true", focusable: "false" });
    return el;
  }, true);
  const labels = layer(canvas, "diagram-wire-labels", () => {
    const el = document.createElement("div");
    el.className = "diagram-wire-labels";
    el.setAttribute("aria-hidden", "true");
    return el;
  });
  wires.setAttribute("width", String(canvas.clientWidth));
  wires.setAttribute("height", String(canvas.clientHeight));
  const type = root.dataset.type;
  const list = edgeListOf(root, canvas);
  const drawn = [];
  const sample = dfDollar(canvas).find(".diagram-node:not([data-shape])").get(0) ?? canvas;
  corner = Math.min(14, Math.max(0, parseFloat(getComputedStyle(sample).borderTopLeftRadius) || 0) * 1.2);
  const texts = textRects(canvas, nodes, rectOf);
  const queue = [];
  const label = (text, at, edge, cls = "diagram-wire-label", along = null, g = null) => {
    if (text)
      queue.push({ text, at, edge, cls, along, g });
  };
  const wireGroup = (edge, extra = {}) => {
    const g = svg("g", {
      class: "diagram-wire",
      "data-line": edge?.dataset.line,
      "data-tone": edge?.dataset.tone,
      "data-step-state": edge?.dataset.stepState,
      "data-active-state": edge?.dataset.activeState,
      "data-edge-ref": edge ? edgeRef(edge) : null,
      "data-change": panel === "changes" ? edge?.dataset.change : null,
      ...Object.fromEntries(Object.entries(extra).filter(([k]) => k !== "beatOf"))
    });
    const i = (extra.beatOf ?? edge)?.style?.getPropertyValue("--step-i");
    if (i)
      g.style.setProperty("--step-i", i);
    if (g.dataset.stepState === "current" && entered.has(`g|${g.dataset.edgeRef ?? ""}|`))
      g.setAttribute("data-step-entered", "");
    wires.append(g);
    return g;
  };
  const interactive = root.hasAttribute("data-interactive") && !panel;
  const line = (g, d, solid) => {
    g.append(svg("path", { class: "diagram-wire-line", d, pathLength: solid ? 1 : null }));
    if (interactive && g.dataset.edgeRef)
      g.append(svg("path", { class: "diagram-wire-hit", d }));
  };
  if (type === "sequence")
    drawSequence(canvas, nodes, list, panel, rectOf, wireGroup, line, label, drawn);
  else
    drawEdges(canvas, nodes, list, panel, rectOf, wireGroup, line, label, drawn, texts);
  if (type === "fishbone")
    drawBones(nodes, wireGroup, line);
  const kept = reconcileWires(wires);
  for (const item of queue)
    item.g = kept.get(item.g) ?? item.g;
  sideDotLabels(nodes, wires, rectOf);
  labels._entered = entered;
  placeLabels(queue, labels, wires, nodes, textRects(canvas, nodes, rectOf));
  if (panel === "changes")
    badges(canvas, labels, rectOf);
  flowTokens(labels, wires);
  if (clear(root, canvas, rectOf))
    return;
  root.dispatchEvent(new CustomEvent("diagram-drawn", { detail: { edges: drawn.length, panel } }));
}
function reconcileWires(wires) {
  const sig = (g) => [...g.attributes].filter((a) => a.name !== "data-stale" && a.name !== "data-step-entered").map((a) => `${a.name}=${a.value}`).join(" ") + ">" + dfDollar(g).html();
  const stale = new Map;
  const kept = new Map;
  for (const g of dfDollar(wires).children("[data-stale]").toArray())
    stale.set(`${g.dataset.edgeRef ?? ""}|${sig(g)}`, g);
  for (const g of dfDollar(wires).children(":not([data-stale])").toArray()) {
    const key = `${g.dataset.edgeRef ?? ""}|${sig(g)}`;
    const old = stale.get(key);
    if (!old)
      continue;
    stale.delete(key);
    old.removeAttribute("data-stale");
    kept.set(g, old);
    g.remove();
  }
  for (const g of stale.values())
    g.remove();
  return kept;
}
var CLEARANCE = 20;
var SIDES = ["top", "right", "bottom", "left"];
function clear(root, canvas, rectOf) {
  if ((canvas._clearPass ?? 0) >= 3)
    return false;
  const cs = getComputedStyle(canvas);
  if (!parseFloat(cs.borderTopWidth))
    return false;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const gap = { top: Infinity, right: Infinity, bottom: Infinity, left: Infinity };
  for (const el of dfDollar(canvas).find("*").toArray()) {
    if (el.matches(".diagram-wires, .diagram-wire-labels, .diagram-wire-hit, .diagram-token, g") || !el.getClientRects().length)
      continue;
    const r = rectOf(el);
    if (!r.w && !r.h)
      continue;
    gap.top = Math.min(gap.top, r.y);
    gap.left = Math.min(gap.left, r.x);
    gap.bottom = Math.min(gap.bottom, h - (r.y + r.h));
    gap.right = Math.min(gap.right, w - (r.x + r.w));
  }
  const grow = SIDES.filter((side) => gap[side] < CLEARANCE - 0.5);
  if (!grow.length)
    return false;
  const absolute = dfDollar(canvas).children().toArray().some((c) => getComputedStyle(c).position === "absolute" && !c.matches(".diagram-wires, .diagram-wire-labels"));
  for (const side of grow) {
    const more = Math.ceil(CLEARANCE - gap[side]);
    if (absolute)
      canvas.style.setProperty(`--_inset-${side}`, `${Math.ceil(parseFloat(canvas.style.getPropertyValue(`--_inset-${side}`)) || 0) + more}px`);
    else
      canvas.style.setProperty(`padding-${side}`, `${Math.ceil(parseFloat(cs.getPropertyValue(`padding-${side}`))) + more}px`);
  }
  canvas._clearPass = (canvas._clearPass ?? 0) + 1;
  try {
    draw(root, canvas);
  } finally {
    canvas._clearPass -= 1;
  }
  return true;
}
function textRects(canvas, nodes, rectOf) {
  const out = [];
  for (const n of nodes.values()) {
    if (n.el.classList.contains("diagram-group") || n.el.dataset.shape === "ghost")
      continue;
    if (ROUND.has(n.el.dataset.shape) || n.el.dataset.shape === "event") {
      for (const t of dfDollar(n.el).find(".diagram-node-name, .diagram-node-eyebrow, .diagram-node-meta, .diagram-node-body").toArray())
        if (t.getClientRects().length)
          out.push(rectOf(t));
    }
  }
  const sel = ".diagram-group-label, .diagram-cell, .diagram-tag, .diagram-tick, .diagram-rule > span, .diagram-axis > *, .diagram-phases > li, .diagram-band-labels > *, .diagram-note";
  for (const t of dfDollar(canvas).find(sel).toArray())
    if (!t.closest(RUNTIME) && t.getClientRects().length)
      out.push(rectOf(t));
  return out;
}
function sideDotLabels(nodes, wires, rectOf) {
  const dots = [...nodes.values()].filter((n) => n.el.dataset.shape === "dot" && dfDollar(n.el).children(".diagram-node-name").get(0));
  if (!dots.length)
    return;
  const points = [...wirePoints(wires).values()].flat();
  const others = [...nodes.values()].filter((n) => n.el.dataset.shape !== "ghost" && !n.el.classList.contains("diagram-group"));
  for (const dot of dots) {
    if (dot.el.hasAttribute("data-label-side") && !dot.el._autoSide)
      continue;
    const text = dfDollar(dot.el).children(".diagram-node-name, .diagram-node-meta").toArray();
    let best = null;
    for (const side of ["above", "below", "right", "left"]) {
      dot.el.dataset.labelSide = side;
      let score = side === "above" ? 0 : 1;
      for (const t of text) {
        const r = rectOf(t);
        for (const q of points)
          if (q.x > r.x - 2 && q.x < r.x + r.w + 2 && q.y > r.y - 2 && q.y < r.y + r.h + 2)
            score += 10;
        for (const o of others) {
          if (o === dot)
            continue;
          const ov = Math.max(0, Math.min(r.x + r.w, o.rect.x + o.rect.w) - Math.max(r.x, o.rect.x)) * Math.max(0, Math.min(r.y + r.h, o.rect.y + o.rect.h) - Math.max(r.y, o.rect.y));
          if (ov > 0)
            score += 20;
        }
      }
      if (!best || score < best.score)
        best = { side, score };
      if (score === 0)
        break;
    }
    dot.el._autoSide = true;
    dot.el.dataset.labelSide = best.side;
  }
}
function wirePoints(wires) {
  const out = new Map;
  for (const g of dfDollar(wires).children(".diagram-wire").toArray()) {
    const path = dfDollar(g).children(".diagram-wire-line").get(0);
    if (!path?.getTotalLength)
      continue;
    const len = path.getTotalLength();
    const pts = [];
    for (let t = 0;t <= len; t += 5)
      pts.push(path.getPointAtLength(t));
    out.set(g, pts);
  }
  return out;
}
function placeLabels(queue, layerEl, wires, nodes, texts) {
  if (!queue.length)
    return;
  const placed = [
    ...[...nodes.values()].filter((n) => !n.el.classList.contains("diagram-group") && n.el.dataset.shape !== "ghost").map((n) => n.rect),
    ...texts
  ];
  const points = wirePoints(wires);
  for (const item of queue) {
    const { text, at, edge, cls, along, g } = item;
    const span = document.createElement("span");
    span.className = cls;
    dfDollar(span).text(text);
    for (const name of ["tone", "stepState", "change", "activeState"])
      if (edge?.dataset[name])
        span.dataset[name] = edge.dataset[name];
    if (edge)
      span.dataset.edgeRef = edgeRef(edge);
    if (span.dataset.stepState === "current" && layerEl._entered?.has(`span|${span.dataset.edgeRef ?? ""}|${text}`))
      span.dataset.stepEntered = "";
    const i = edge?.style.getPropertyValue("--step-i");
    if (i)
      span.style.setProperty("--step-i", i);
    dfDollar(layerEl).append(span);
    const w = span.offsetWidth + 4;
    const h = span.offsetHeight + 2;
    const centered = cls === "diagram-wire-label" || cls.includes("diagram-wire-end");
    const box = (q) => centered ? { x: q.x - w / 2, y: q.y - h / 2, w, h } : { x: q.x, y: q.y - h / 2, w, h };
    const cover = (b) => {
      let sum = 0;
      for (const o of placed)
        sum += Math.max(0, Math.min(b.x + b.w, o.x + o.w) - Math.max(b.x, o.x)) * Math.max(0, Math.min(b.y + b.h, o.y + o.h) - Math.max(b.y, o.y));
      for (const [wg, pts] of points) {
        if (wg === g)
          continue;
        for (const q of pts)
          if (q.x > b.x - 1 && q.x < b.x + b.w + 1 && q.y > b.y - 1 && q.y < b.y + b.h + 1)
            sum += 40;
      }
      return sum;
    };
    let pos = at;
    const dir = along ?? { x: 1, y: 0, len: 0 };
    const step = dir.x ? w * 0.6 + 6 : h + 4;
    const across = dir.x ? { x: 0, y: h / 2 + 5 } : { x: w / 2 + 6, y: 0 };
    const room = Math.max(0, (dir.len ?? Infinity) / 2 - (dir.x ? w / 2 : h / 2));
    let least = Infinity;
    for (const [k, j] of [[0, 0], [1, 0], [-1, 0], [2, 0], [-2, 0], [0, -1], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1], [3, 0], [-3, 0]]) {
      if (Math.abs(k * step) > room)
        continue;
      if (!along && (k || j))
        continue;
      const q = { x: at.x + dir.x * k * step + across.x * j, y: at.y + dir.y * k * step + across.y * j };
      const c = cover(box(q)) + (k || j ? 1 : 0);
      if (c < least) {
        least = c;
        pos = q;
      }
      if (c <= 1)
        break;
    }
    placed.push(box(pos));
    span.style.left = `${r1(pos.x)}px`;
    span.style.top = `${r1(pos.y)}px`;
  }
}
function drawEdges(canvas, nodes, list, panel, rectOf, wireGroup, line, label, drawn, texts = []) {
  const plans = [];
  const fig = canvas.closest(".diagram");
  const busRoute = fig?.dataset.route === "bus" || fig?.dataset.type === "organigram";
  const obstacles = [...nodes.values()].filter((n) => !n.el.classList.contains("diagram-group") && n.el.dataset.shape !== "ghost");
  for (const edge of edgesIn(list)) {
    const ends = edgeIn(edge, panel);
    if (!ends)
      continue;
    const from = parseEnd(ends.from);
    const to = parseEnd(ends.to);
    const a = nodes.get(from.id);
    const b = nodes.get(to.id);
    if (!a || !b)
      continue;
    const curve = edge.dataset.curve || "elbow";
    const plan = { edge, from, to, a, b, curve };
    if (a === b)
      plan.curve = "self";
    else if (curve === "around") {
      plan.sa = from.side || "right";
      plan.sb = to.side || plan.sa;
    } else if (curve === "elbow" && busRoute && !from.side && !to.side && Math.abs(center(a.rect).y - center(b.rect).y) > a.rect.h / 2) {
      [plan.sa, plan.sb] = center(b.rect).y > center(a.rect).y ? ["bottom", "top"] : ["top", "bottom"];
    } else if (curve === "elbow") {
      [plan.sa, plan.sb, plan.outer] = bestSides(a, b, from.side, to.side, obstacles, texts);
    }
    plans.push(plan);
  }
  const bus = canvas.closest(".diagram")?.dataset.route === "bus" || canvas.closest(".diagram")?.dataset.type === "organigram";
  const ports = new Map;
  for (const plan of plans) {
    if (!plan.sa || bus)
      continue;
    for (const [end, node, side, other] of [["a", plan.a, plan.sa, plan.b], ["b", plan.b, plan.sb, plan.a]]) {
      if ((end === "a" ? plan.from : plan.to).field)
        continue;
      const key = `${node.el.dataset.node}|${side}`;
      if (!ports.has(key))
        ports.set(key, []);
      ports.get(key).push({ plan, end, node, side, toward: center(other.rect) });
    }
  }
  for (const group of ports.values()) {
    const along = horizontal(group[0].side) ? "y" : "x";
    group.sort((p, q) => p.toward[along] - q.toward[along]);
    const r = group[0].node.rect;
    const length = horizontal(group[0].side) ? r.h : r.w;
    const step = Math.min(18, length * 0.8 / Math.max(1, group.length));
    group.forEach((p, i) => {
      const offset = (i - (group.length - 1) / 2) * step;
      const t = 0.5 + offset / length;
      p.plan[p.end === "a" ? "pa" : "pb"] = sidePoint(r, p.side, t);
    });
  }
  const fieldPoint = (node, field, toward) => {
    const row = dfDollar(node.el).find(`[data-field="${field}"]`).get(0);
    if (!row)
      return null;
    const rr = rectOf(row);
    const left = toward.x < node.rect.x + node.rect.w / 2;
    return { point: { x: left ? node.rect.x : node.rect.x + node.rect.w, y: rr.y + rr.h / 2 }, side: left ? "left" : "right" };
  };
  const solid = [...nodes.values()].filter((n) => !n.el.classList.contains("diagram-group") && n.el.dataset.shape !== "ghost");
  const outside = Math.max(0, ...solid.map((n) => n.rect.x + n.rect.w)) + 24;
  const outsideLeft = Math.min(...solid.map((n) => n.rect.x)) - 24;
  for (const plan of plans) {
    if (!plan.sa)
      continue;
    const { a, b } = plan;
    let pa = plan.pa ?? sidePoint(a.rect, plan.sa);
    let pb = plan.pb ?? sidePoint(b.rect, plan.sb);
    let sa = plan.sa;
    let sb = plan.sb;
    if (plan.from.field) {
      const f = fieldPoint(a, plan.from.field, center(b.rect));
      if (f)
        ({ point: pa, side: sa } = f);
    }
    if (plan.to.field) {
      const f = fieldPoint(b, plan.to.field, pa);
      if (f)
        ({ point: pb, side: sb } = f);
    }
    if (plan.from.field && plan.to.field && sa !== sb && (pb.x - pa.x) * NORMAL[sa][0] <= 16) {
      sb = sa;
      pb = { x: sa === "left" ? b.rect.x : b.rect.x + b.rect.w, y: pb.y };
    }
    const facing = sa !== sb && horizontal(sa) === horizontal(sb);
    const axis = horizontal(sa) ? "y" : "x";
    if (facing && !plan.from.field && !plan.to.field && Math.abs(pa[axis] - pb[axis]) < 14) {
      const lone = (node, side) => (ports.get(`${node.el.dataset.node}|${side}`)?.length ?? 1) === 1;
      const within = (r, v) => axis === "y" ? v > r.y + 4 && v < r.y + r.h - 4 : v > r.x + 4 && v < r.x + r.w - 4;
      if (lone(a, sa) && within(a.rect, pb[axis]))
        pa = { ...pa, [axis]: pb[axis] };
      else if (lone(b, sb) && within(b.rect, pa[axis]))
        pb = { ...pb, [axis]: pa[axis] };
    }
    plan.raw = elbow(pa, sa, pb, sb, 16, plan.curve === "around" ? outside : sa === plan.sa && sb === plan.sb ? plan.outer ?? null : null);
    if (plan.curve === "around" && !plan.from.side && !plan.to.side) {
      const hits = (pts) => solid.filter((o) => o !== a && o !== b && crosses(pts, o.rect)).length;
      const left = elbow(sidePoint(a.rect, "left"), "left", sidePoint(b.rect, "left"), "left", 16, outsideLeft);
      if (hits(left) < hits(plan.raw))
        plan.raw = left;
    }
  }
  if (!bus)
    spreadChannels(plans.filter((plan) => plan.raw));
  for (const plan of plans) {
    const { edge, a, b } = plan;
    let pts;
    let dEnd;
    let dStart;
    let at;
    let path;
    const head = edge.dataset.head || "arrow";
    const tail = edge.dataset.tail || "none";
    if (plan.curve === "self") {
      const r = a.rect;
      const p1 = { x: r.x + r.w * 0.68, y: r.y };
      const p2 = { x: r.x + r.w * 0.32, y: r.y };
      path = `M${r1(p1.x)} ${r1(p1.y)} C${r1(p1.x + 6)} ${r1(r.y - 30)} ${r1(p2.x - 6)} ${r1(r.y - 30)} ${r1(p2.x)} ${r1(p2.y)}`;
      at = { x: p1.x + 8, y: r.y - 18 };
      plan.selfLabel = true;
      pts = [p1, p2];
      dEnd = { x: 0.25, y: 1 };
      dStart = { x: 0.25, y: 1 };
    } else if (plan.curve === "straight" || plan.curve === "curve") {
      const ca = center(a.rect);
      const cb = center(b.rect);
      if (plan.curve === "straight") {
        const pa = boundary(a.rect, cb, a.round);
        const pb = boundary(b.rect, ca, b.round);
        pts = inset(inset([pa, pb], HEADS[tail]?.inset ?? 0, true), HEADS[head]?.inset ?? 0, false);
        path = roundedPath(pts);
        at = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
        dEnd = unit(pa, pb);
        dStart = unit(pb, pa);
        pts = [pa, pb];
      } else {
        const len = Math.hypot(cb.x - ca.x, cb.y - ca.y) || 1;
        let n = { x: -(cb.y - ca.y) / len, y: (cb.x - ca.x) / len };
        const mid = { x: (ca.x + cb.x) / 2, y: (ca.y + cb.y) / 2 };
        const c0 = { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 };
        if (n.x * (mid.x - c0.x) + n.y * (mid.y - c0.y) < 0)
          n = { x: -n.x, y: -n.y };
        const bend = parseFloat(edge.dataset.bend ?? "0.22");
        const ctrl = { x: mid.x + n.x * len * bend, y: mid.y + n.y * len * bend };
        const pa = boundary(a.rect, ctrl, a.round);
        const pb = boundary(b.rect, ctrl, b.round);
        dEnd = unit(ctrl, pb);
        dStart = unit(ctrl, pa);
        const ib = HEADS[head]?.inset ?? 0;
        const pbi = { x: pb.x - dEnd.x * ib, y: pb.y - dEnd.y * ib };
        path = `M${r1(pa.x)} ${r1(pa.y)} Q${r1(ctrl.x)} ${r1(ctrl.y)} ${r1(pbi.x)} ${r1(pbi.y)}`;
        at = { x: 0.25 * pa.x + 0.5 * ctrl.x + 0.25 * pb.x, y: 0.25 * pa.y + 0.5 * ctrl.y + 0.25 * pb.y };
        pts = [pa, pb];
      }
    } else {
      const raw = plan.raw;
      ({ at, along: plan.along } = labelSpot(raw));
      dEnd = unit(raw[raw.length - 2], raw[raw.length - 1]);
      dStart = unit(raw[1], raw[0]);
      pts = inset(inset(raw, HEADS[tail]?.inset ?? 0, true), HEADS[head]?.inset ?? 0, false);
      path = roundedPath(pts);
      pts = raw;
    }
    const g = wireGroup(edge);
    line(g, path, !edge.dataset.line);
    const tip = plan.curve === "self" ? pts[1] : pts[pts.length - 1];
    if (head !== "none")
      drawHead(g, head, tip, dEnd);
    if (tail !== "none")
      drawHead(g, tail, pts[0], dStart);
    g.dataset.path = path;
    copyFlow(edge, g, "2400");
    label(panel === "before" && edge.dataset.before != null ? edge.dataset.before : edge.dataset.label ?? edge.textContent.trim(), at, edge, plan.selfLabel ? "diagram-wire-label diagram-wire-self" : undefined, plan.along ?? null, g);
    const endLabel = (text, p, dir) => {
      if (!text)
        return;
      const perp = { x: -dir.y, y: dir.x };
      label(text, { x: p.x - dir.x * 16 + perp.x * 9, y: p.y - dir.y * 16 + perp.y * 9 }, edge, "diagram-wire-label diagram-wire-end", { x: Math.abs(perp.x) > 0.5 ? 1 : 0, y: Math.abs(perp.y) > 0.5 ? 1 : 0, len: 72 }, g);
    };
    endLabel(edge.dataset.fromLabel, pts[0], dStart);
    endLabel(edge.dataset.toLabel, tip, dEnd);
    drawn.push(edge);
  }
}
function spreadChannels(plans) {
  const channels = new Map;
  for (const plan of plans) {
    const r = plan.raw;
    if (r.length !== 4)
      continue;
    const vertical = Math.abs(r[1].x - r[2].x) < 0.5;
    const key = vertical ? `v${Math.round(r[1].x / 8)}` : `h${Math.round(r[1].y / 8)}`;
    if (!channels.has(key))
      channels.set(key, []);
    channels.get(key).push({ plan, vertical });
  }
  for (const group of channels.values()) {
    if (group.length < 2)
      continue;
    const along = group[0].vertical ? "y" : "x";
    group.sort((p, q) => Math.min(p.plan.raw[1][along], p.plan.raw[2][along]) - Math.min(q.plan.raw[1][along], q.plan.raw[2][along]));
    group.forEach(({ plan, vertical }, i) => {
      const offset = (i - (group.length - 1) / 2) * 10;
      const axis = vertical ? "x" : "y";
      plan.raw = plan.raw.map((pt, j) => j === 1 || j === 2 ? { ...pt, [axis]: pt[axis] + offset } : pt);
    });
  }
}
function drawSequence(canvas, nodes, list, panel, rectOf, wireGroup, line, label, drawn) {
  const bottom = canvas.clientHeight - CLEARANCE;
  for (const node of nodes.values()) {
    if (node.el.dataset.shape === "ghost")
      continue;
    const c = center(node.rect);
    const g = wireGroup(null, { "data-lifeline": "", "data-step-state": node.el.dataset.stepState, "data-active-state": node.el.dataset.activeState, beatOf: node.el });
    line(g, `M${r1(c.x)} ${r1(node.rect.y + node.rect.h)} V${r1(bottom)}`, false);
  }
  for (const edge of edgesIn(list)) {
    const ends = edgeIn(edge, panel);
    if (!ends)
      continue;
    const a = nodes.get(parseEnd(ends.from).id);
    const b = nodes.get(parseEnd(ends.to).id);
    if (!a || !b)
      continue;
    const row = rectOf(edge);
    const y = row.y + row.h * 0.62;
    const x1 = center(a.rect).x;
    const x2 = center(b.rect).x;
    const g = wireGroup(edge);
    const head = edge.dataset.head || (edge.dataset.line === "dashed" ? "open" : "arrow");
    if (a === b) {
      line(g, `M${r1(x1)} ${r1(y - 8)} H${r1(x1 + 30)} V${r1(y + 8)} H${r1(x1 + 4)}`, !edge.dataset.line);
      drawHead(g, head, { x: x1 + 1, y: y + 8 }, { x: -1, y: 0 });
      label(edge.textContent.trim(), { x: x1 + 36, y }, edge, "diagram-wire-label diagram-wire-self", null, g);
    } else {
      const dir = x2 > x1 ? 1 : -1;
      const ib = HEADS[head]?.inset ?? 0;
      line(g, `M${r1(x1)} ${r1(y)} H${r1(x2 - dir * ib)}`, !edge.dataset.line);
      drawHead(g, head, { x: x2, y }, { x: dir, y: 0 });
      label(edge.textContent.trim(), { x: (x1 + x2) / 2, y: y - 11 }, edge, "diagram-wire-label", { x: 1, y: 0, len: Math.abs(x2 - x1) - 16 }, g);
      g.dataset.path = `M${r1(x1)} ${r1(y)} H${r1(x2)}`;
      copyFlow(edge, g, "1600");
    }
    drawn.push(edge);
  }
}
function drawBones(nodes, wireGroup, line) {
  const effect = [...nodes.values()].find((n) => n.el.hasAttribute("data-effect"));
  if (!effect)
    return;
  const bones = [...nodes.values()].filter((n) => n.el.hasAttribute("data-bone"));
  const y = effect.rect.y + effect.rect.h / 2;
  const x0 = Math.min(effect.rect.x, ...bones.map((n) => n.rect.x)) - 8;
  const spine = wireGroup(null, { "data-spine": "", "data-tone": effect.el.dataset.tone });
  line(spine, `M${r1(x0)} ${r1(y)} H${r1(effect.rect.x - 3)}`, true);
  drawHead(spine, "arrow", { x: effect.rect.x, y }, { x: 1, y: 0 });
  for (const bone of bones) {
    const above = bone.rect.y + bone.rect.h / 2 < y;
    const from = { x: bone.rect.x + bone.rect.w / 2, y: above ? bone.rect.y + bone.rect.h : bone.rect.y };
    const dy = Math.abs(y - from.y);
    const to = { x: from.x + dy * 0.577, y };
    const g = wireGroup(null, { "data-bone": "", "data-tone": bone.el.dataset.tone, "data-step-state": bone.el.dataset.stepState, "data-active-state": bone.el.dataset.activeState, beatOf: bone.el });
    line(g, `M${r1(from.x)} ${r1(from.y)} L${r1(to.x)} ${r1(to.y)}`, true);
  }
}
var BADGE = { added: "+", removed: "−", changed: "Δ", moved: "→", rewired: "⇄" };
function badges(canvas, labels, rectOf) {
  for (const el of dfDollar(canvas).find("[data-change]").toArray()) {
    if (el.closest(".diagram-edges, .diagram-wires, .diagram-wire-labels") || !el.getClientRects().length || !BADGE[el.dataset.change])
      continue;
    const r = rectOf(el);
    const chip = document.createElement("span");
    chip.className = "diagram-badge";
    chip.dataset.change = el.dataset.change;
    dfDollar(chip).text(BADGE[el.dataset.change]);
    chip.style.left = `${r1(r.x + r.w)}px`;
    chip.style.top = `${r1(r.y)}px`;
    dfDollar(labels).append(chip);
  }
}
function copyFlow(edge, g, fallback) {
  if (edge.dataset.flow == null)
    return;
  g.dataset.flow = edge.dataset.flow || fallback;
  if (edge.dataset.flowTokens)
    g.dataset.flowTokens = edge.dataset.flowTokens;
  if (edge.dataset.flowDelay)
    g.dataset.flowDelay = edge.dataset.flowDelay;
}
function flowTokens(labels, wires) {
  if (reducedMotion())
    return;
  for (const g of dfDollar(wires).children("[data-flow]").toArray()) {
    if (g.dataset.stepState === "future" || g.dataset.activeState === "dimmed")
      continue;
    const duration = Math.max(800, parseInt(g.dataset.flow, 10) || 2400);
    const count = Math.max(1, Math.min(8, parseInt(g.dataset.flowTokens, 10) || 1));
    const delay = parseInt(g.dataset.flowDelay, 10) || 0;
    for (let i = 0;i < count; i++) {
      const token = document.createElement("span");
      token.className = "diagram-token";
      if (g.dataset.tone)
        token.dataset.tone = g.dataset.tone;
      token.style.offsetPath = `path('${g.dataset.path}')`;
      dfDollar(labels).append(token);
      const once = g.dataset.stepState === "current";
      token.animate?.([{ offsetDistance: "0%", opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 1, offset: 0.92 }, { offsetDistance: "100%", opacity: 0 }], {
        duration,
        delay: once ? delay + i * duration / count : delay - i * duration / count,
        iterations: once ? 1 : Infinity,
        easing: "linear",
        fill: "backwards"
      });
    }
  }
}
var PANEL_TITLES = ["Before", "Changes", "After"];
var CHANGE_WORD = { added: "Added", removed: "Removed", changed: "Changed", moved: "Moved", rewired: "Rewired" };
function panelCanvas(source, panel) {
  const copy = source.cloneNode(true);
  for (const el of [copy, ...dfDollar(copy).find("[id]").toArray()])
    el.removeAttribute("id");
  dfDollar(copy).find(".diagram-wires, .diagram-wire-labels").remove();
  for (const el of dfDollar(copy).find("[data-change]").toArray()) {
    const change = el.dataset.change;
    if (panel === "before" && change === "added" || panel === "after" && change === "removed")
      el.setAttribute("data-delta-hidden", "");
  }
  if (panel === "before") {
    for (const el of dfDollar(copy).find("[data-before]").toArray())
      dfDollar(el).text(el.dataset.before);
    for (const el of [copy, ...dfDollar(copy).find("[data-before-style]").toArray()]) {
      if (el.dataset.beforeStyle != null)
        el.setAttribute("style", el.dataset.beforeStyle);
    }
    for (const key of ["status", "tone", "badge", "shape"]) {
      for (const el of dfDollar(copy).find(`[data-before-${key}]`).toArray()) {
        const old = el.getAttribute(`data-before-${key}`);
        dfDollar(el).attr(`data-${key}`, old === "" ? null : old);
      }
    }
  }
  return copy;
}
function ledger(root, canvas) {
  const names = new Map(authored(canvas, "[data-node]").map((n) => [n.dataset.node, nameOf(n)]));
  const endName = (v) => names.get(parseEnd(v).id) || parseEnd(v).id;
  const list = edgeListOf(root, canvas);
  const items = [...authored(canvas, "[data-change]"), ...list && !canvas.contains(list) ? edgesIn(list).filter((e) => e.dataset.change) : []];
  const entries = [];
  for (const el of items) {
    const change = el.dataset.change;
    if (!CHANGE_WORD[change])
      continue;
    const isEdge = el.classList.contains("diagram-edge");
    let subject = nameOf(el);
    if (isEdge)
      subject = `${endName(el.dataset.from)} → ${endName(el.dataset.to)}${el.textContent.trim() ? ` (${el.textContent.trim()})` : ""}`;
    let note = el.dataset.changeNote || "";
    if (!note && change === "changed") {
      note = [el, ...dfDollar(el).find("[data-before]").toArray()].filter((n) => n.dataset.before != null).map((n) => `${n.dataset.before} → ${n.textContent.trim()}`).join(" · ");
    }
    if (!note && change === "rewired" && isEdge)
      note = `was ${endName(el.dataset.beforeFrom || el.dataset.from)} → ${endName(el.dataset.beforeTo || el.dataset.to)}`;
    entries.push({ change, subject, note });
  }
  return entries;
}
function rebuildDelta(root) {
  const source = dfDollar(root).children(".diagram-canvas").get(0);
  let host = dfDollar(root).children(".diagram-delta").get(0);
  if (!root.hasAttribute("data-delta") || !source) {
    if (host)
      dfDollar(host).remove();
    return;
  }
  if (!host) {
    host = document.createElement("div");
    host.className = "diagram-delta";
    source.after(host);
  }
  dfDollar(host).empty();
  const titles = (root.dataset.deltaLabels || "").split("|").map((s) => s.trim());
  const entries = ledger(root, source);
  ["before", "changes", "after"].forEach((panel, i) => {
    const section = document.createElement("section");
    section.className = "diagram-panel";
    section.dataset.panel = panel;
    const title = document.createElement("h4");
    title.className = "diagram-panel-title";
    dfDollar(title).text(titles[i] || PANEL_TITLES[i]);
    if (panel === "changes") {
      const count = document.createElement("span");
      count.className = "diagram-panel-count";
      dfDollar(count).text(String(entries.length));
      dfDollar(title).append(count);
    }
    const body = document.createElement("div");
    body.className = "diagram-panel-body";
    dfDollar(body).append(panelCanvas(source, panel));
    dfDollar(section).append(title).append(body);
    if (panel === "changes" && entries.length) {
      const ol = document.createElement("ol");
      ol.className = "diagram-ledger";
      for (const entry of entries) {
        const li = document.createElement("li");
        li.className = "diagram-ledger-item";
        li.dataset.change = entry.change;
        const kind = document.createElement("span");
        kind.className = "diagram-ledger-kind";
        dfDollar(kind).text(`${BADGE[entry.change]} ${CHANGE_WORD[entry.change]}`);
        const subject = document.createElement("strong");
        dfDollar(subject).text(entry.subject);
        dfDollar(li).append(kind).append(subject);
        if (entry.note) {
          const note = document.createElement("span");
          note.className = "diagram-ledger-note";
          dfDollar(note).text(entry.note);
          dfDollar(li).append(note);
        }
        dfDollar(ol).append(li);
      }
      dfDollar(section).append(ol);
    }
    dfDollar(host).append(section);
  });
  root._observer?.observe(host);
}
var ICONS = {
  prev: '<path d="m15 18-6-6 6-6"/>',
  next: '<path d="m9 18 6-6-6-6"/>',
  play: '<path d="M6 4l14 8-14 8z"/>',
  pause: '<path d="M7 4v16M17 4v16"/>',
  replay: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  all: '<path d="M4 6h16M4 12h16M4 18h16"/>'
};
function button(action, text, label) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "btn";
  b.dataset.variant = "outline";
  b.dataset.size = "sm";
  b.dataset.action = action;
  if (label)
    b.setAttribute("aria-label", label);
  const icon = svg("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" });
  for (const d of ICONS[action].match(/d="[^"]+"/g))
    icon.append(svg("path", { d: d.slice(3, -1) }));
  b.append(icon);
  if (text) {
    const span = document.createElement("span");
    dfDollar(span).text(text);
    b.append(span);
  }
  return b;
}
function makeControls(root) {
  const bar = document.createElement("div");
  bar.className = "diagram-controls";
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Diagram steps");
  bar.append(button("prev", "", "Previous step"), button("play", "Play"), button("next", "", "Next step"), button("replay", "Replay"), button("all", "Show all"));
  const status = document.createElement("output");
  status.className = "diagram-status";
  status.setAttribute("aria-live", "polite");
  bar.append(status);
  dfDollar(bar).on("click", (e) => {
    const action = e.target.closest?.("[data-action]")?.dataset.action;
    if (action)
      control(root, action);
  });
  dfDollar(bar).on("keydown", (e) => {
    const map = { ArrowLeft: "prev", ArrowRight: "next", Home: "first", End: "all", r: "replay", R: "replay", " ": "toggle" };
    const action = map[e.key];
    if (!action || e.key === " " && e.target.closest?.("button"))
      return;
    e.preventDefault();
    control(root, action);
  });
  const canvas = dfDollar(root).children(".diagram-canvas").get(0);
  const after = dfDollar(root).children(".diagram-delta").get(0) ?? canvas;
  if (after)
    after.after(bar);
  else
    dfDollar(root).append(bar);
  return bar;
}
function updateControls(root) {
  const bar = root._controls;
  if (!bar)
    return;
  const { max } = stepPlan(root);
  const state = root._shown ?? root.store?.value ?? { name: "default", config: {} };
  const playing = state.name === "playing";
  const step = !stepping(state) ? max : stateStep(state, max);
  const play = dfDollar(bar).find('[data-action="play"]').get(0);
  if (play) {
    const swap = dfDollar(play).find("svg").get(0);
    if (swap) {
      dfDollar(swap).empty();
      for (const d of ICONS[playing ? "pause" : "play"].match(/d="[^"]+"/g))
        swap.append(svg("path", { d: d.slice(3, -1) }));
    }
    dfDollar(play).find("span").text(playing ? "Pause" : "Play");
    play.setAttribute("aria-pressed", String(playing));
  }
  dfDollar(bar).find('[data-action="prev"]').prop("disabled", stepping(state) && step <= 1);
  dfDollar(bar).find('[data-action="next"]').prop("disabled", !stepping(state) || step >= max);
  const status = dfDollar(bar).find(".diagram-status");
  if (!stepping(state))
    status.text(`Complete · ${max} ${max === 1 ? "step" : "steps"}`);
  else {
    const name = stepLabel(root, step);
    status.text(`Step ${step} of ${max}${name ? ` · ${name}` : ""}`);
  }
}
function control(root, action) {
  const { max } = stepPlan(root);
  const state = root._shown ?? root.store?.value ?? { name: "default", config: {} };
  const step = !stepping(state) ? max : stateStep(state, max);
  const api = root.api;
  if (action === "toggle")
    action = state.name === "playing" ? "pause" : "play";
  if (action === "play" && state.name === "playing")
    action = "pause";
  if (action === "pause")
    api.setState("paused", { step });
  else if (action === "play")
    api.setState("playing", { step: state.name === "paused" && step < max ? step + 1 : 1 });
  else if (action === "replay")
    api.setState("playing", { step: 1 });
  else if (action === "first")
    api.setState("paused", { step: 1 });
  else if (action === "all")
    api.setState("default");
  else if (action === "prev")
    api.setState("paused", { step: !stepping(state) ? max - 1 : Math.max(1, step - 1) });
  else if (action === "next")
    api.setState("paused", { step: Math.min(max, step + 1) });
}
function msOf(root, name, fallback) {
  const raw = getComputedStyle(root).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n))
    return fallback;
  return raw.endsWith("ms") ? n : raw.endsWith("s") ? n * 1000 : n;
}
function holdOf(root, state) {
  const { stepOf, max } = stepPlan(root);
  const step = stateStep(state, max);
  let boxes = 0;
  stepOf.forEach((s, el) => {
    if (s === step && !el.classList.contains("diagram-edge"))
      boxes++;
  });
  const element = msOf(root, "--diagram-element-ms", 900);
  const appear = msOf(root, "--diagram-step-ms", 800);
  return Math.max(0, boxes - 1) * element + appear + msOf(root, "--diagram-hold", 1200);
}
function sync(root) {
  rebuildDelta(root);
  for (const canvas of canvasesOf(root))
    draw(root, canvas);
  updateControls(root);
}
function canvasesOf(root) {
  const delta = dfDollar(root).children(".diagram-delta").get(0);
  if (delta)
    return dfDollar(delta).find(".diagram-canvas").toArray();
  return dfDollar(root).children(".diagram-canvas").toArray();
}
function triggerStateChange(root, state) {
  applyMarkup(root, state);
  clearTimeout(root._timer);
  const { max } = stepPlan(root);
  const step = stateStep(state, max);
  if (state.name === "playing") {
    root._timer = setTimeout(() => {
      if (!root.isConnected || root.store?.value.name !== "playing")
        return;
      if (step >= max)
        root.api.setState("paused", { step: max });
      else
        root.api.setState("playing", { step: step + 1 });
    }, holdOf(root, state));
  }
  const wasActive = root._shown?.name === "active" ? root._shown.config?.ref ?? null : null;
  root._shown = state;
  sync(root);
  const ref = state.name === "active" ? state.config?.ref ?? null : null;
  const about = describe(root, ref);
  updateOutputs(root, about);
  queueMicrotask(() => {
    if (state.name === "playing" || state.name === "paused") {
      root.dispatchEvent(new CustomEvent("diagram-step", { bubbles: true, detail: { step, max, label: stepLabel(root, step), state: state.name } }));
    }
    if (String(ref ?? "") !== String(wasActive ?? "")) {
      root.dispatchEvent(new CustomEvent("diagram-activate", { bubbles: true, detail: about ?? { ref: null, kind: null, element: null, label: "", detail: "" } }));
    }
  });
}
function updateOutputs(root, about) {
  if (!root.id)
    return;
  for (const out of dfDollar(`[data-diagram-for="${root.id}"]`).toArray()) {
    if (out.tagName !== "OUTPUT")
      continue;
    if (!out.dataset.diagramEmpty)
      out.dataset.diagramEmpty = out.textContent.trim();
    dfDollar(out).text(about ? `${about.label}${about.detail ? ` - ${about.detail}` : ""}` : out.dataset.diagramEmpty);
  }
}
var diagramApi = componentState({
  component: "diagram",
  states: diagramStates,
  apply: (root, state) => triggerStateChange(root, state),
  markup: (el, state) => applyMarkup(el, state)
});
df$.diagramApi = diagramApi;
df$.diagramStates = diagramStates;
var esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
var attr = (name, value) => value == null || value === false ? "" : value === true ? ` ${name}` : ` ${name}="${esc(value)}"`;
var place = (o) => {
  const css = [["--col", o.col], ["--row", o.row], ["--span", o.span], ["--rspan", o.rspan], ["--x", o.x], ["--y", o.y], ["--i", o.i]].filter(([, v]) => v != null).map(([k, v]) => `${k}:${v}`);
  if (o.style)
    css.push(o.style);
  return css.join(";");
};
function nodeMarkup(n, children = "") {
  const before = n.before ?? {};
  const fields = n.fields?.length ? `<ul class="diagram-node-fields">${n.fields.map((f) => {
    const field = typeof f === "string" ? { name: f } : f;
    return `<li${attr("data-field", field.name)}${attr("data-key", field.key)}${attr("data-change", field.change)}><span>${esc(field.name)}</span>${field.type ? `<span>${esc(field.type)}</span>` : ""}</li>`;
  }).join("")}</ul>` : "";
  const ops = n.ops?.length ? `<ul class="diagram-node-ops">${n.ops.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>` : "";
  const text = (cls, key) => n[key] != null ? `<span class="${cls}"${attr("data-before", before[key])}>${esc(n[key])}</span>` : "";
  const beforeStyle = ["col", "row", "span", "rspan", "x", "y"].some((k) => before[k] != null) ? place({ ...n, ...before }) : null;
  return `<div class="diagram-node"${attr("data-node", n.id)}${attr("data-shape", n.shape)}${attr("data-tone", n.tone)}${attr("data-status", n.status)}${attr("data-badge", n.badge)}${attr("data-step", n.step)}${attr("data-change", n.change)}${attr("data-change-note", n.note)}${attr("data-before-style", beforeStyle)}${attr("style", place(n) || null)}>${text("diagram-node-eyebrow", "eyebrow")}${text("diagram-node-name", "name")}${text("diagram-node-meta", "meta")}${fields}${ops}${children}</div>`;
}
function markupOf(spec) {
  const groups = spec.groups ?? [];
  const nodes = spec.nodes ?? [];
  const childrenOf = (id) => [
    ...groups.filter((g) => g.parent === id).map((g) => groupMarkup(g)),
    ...nodes.filter((n) => n.parent === id).map((n) => nodeMarkup(n))
  ].join("");
  function groupMarkup(g) {
    return `<div class="diagram-group"${attr("data-node", g.id)}${attr("data-shape", g.shape)}${attr("data-tone", g.tone)}${attr("data-step", g.step)}${attr("data-change", g.change)}${attr("style", place(g) || null)}><span class="diagram-group-label">${esc(g.label)}</span>${childrenOf(g.id)}</div>`;
  }
  const caption = spec.title || spec.caption ? `<figcaption class="diagram-caption">${spec.eyebrow ? `<span class="diagram-eyebrow">${esc(spec.eyebrow)}</span>` : ""}${spec.title ? `<span class="diagram-title">${esc(spec.title)}</span>` : ""}${spec.caption ? `<span class="diagram-dek">${esc(spec.caption)}</span>` : ""}</figcaption>` : "";
  const phases = spec.phases?.length ? `<ol class="diagram-phases" style="--row:1;--col:1;--span:${spec.cols ?? spec.phases.length}">${spec.phases.map((p) => {
    const phase = typeof p === "string" ? { name: p } : p;
    return `<li${attr("style", phase.span ? `--span:${phase.span}` : null)}>${esc(phase.name)}</li>`;
  }).join("")}</ol>` : "";
  const top = [...groups.filter((g) => !g.parent).map(groupMarkup), ...nodes.filter((n) => !n.parent).map((n) => nodeMarkup(n))].join("");
  const edges = (spec.edges ?? []).map((e) => {
    const before = e.before ?? {};
    return `<li class="diagram-edge"${attr("data-from", e.from)}${attr("data-to", e.to)}${attr("data-line", e.line)}${attr("data-tone", e.tone)}${attr("data-head", e.head)}${attr("data-tail", e.tail)}${attr("data-curve", e.curve)}${attr("data-step", e.step)}${attr("data-flow", e.flow === true ? "" : e.flow)}${attr("data-from-label", e.fromLabel)}${attr("data-to-label", e.toLabel)}${attr("data-change", e.change)}${attr("data-before", before.label)}${attr("data-before-from", before.from)}${attr("data-before-to", before.to)}>${esc(e.label)}</li>`;
  }).join("");
  return `${caption}<div class="diagram-canvas"${attr("style", [spec.cols ? `--cols:${spec.cols}` : "", spec.style ?? ""].filter(Boolean).join(";") || null)}>${phases}${top}</div>${edges ? `<ol class="diagram-edges">${edges}</ol>` : ""}`;
}
function diffSpecs(before, after) {
  const key = (e) => e.id ?? `${e.from}->${e.to}`;
  const merge = (olds = [], news = [], keyOf, compare) => {
    const oldMap = new Map(olds.map((o) => [keyOf(o), o]));
    const newKeys = new Set(news.map(keyOf));
    const out = news.map((n) => {
      const o = oldMap.get(keyOf(n));
      if (!o)
        return { ...n, change: "added" };
      return compare(o, n);
    });
    olds.forEach((o, i) => {
      if (!newKeys.has(keyOf(o)))
        out.splice(Math.min(i, out.length), 0, { ...o, change: "removed" });
    });
    return out;
  };
  const TEXT = ["name", "eyebrow", "meta"];
  const PLACE = ["col", "row", "span", "rspan", "x", "y"];
  const compareNode = (o, n) => {
    const text = TEXT.filter((k) => (o[k] ?? null) !== (n[k] ?? null));
    const kind = ["shape", "tone", "badge"].some((k) => (o[k] ?? null) !== (n[k] ?? null)) || JSON.stringify(o.fields ?? []) !== JSON.stringify(n.fields ?? []);
    const moved = PLACE.filter((k) => (o[k] ?? null) !== (n[k] ?? null));
    if (!text.length && !kind && !moved.length)
      return n;
    const prev = Object.fromEntries([...text, ...moved].map((k) => [k, o[k]]));
    return { ...n, change: text.length || kind ? "changed" : "moved", before: prev };
  };
  const compareEdge = (o, n) => {
    if (o.from !== n.from || o.to !== n.to)
      return { ...n, change: "rewired", before: { from: o.from, to: o.to } };
    if ((o.label ?? "") !== (n.label ?? "") || (o.line ?? "") !== (n.line ?? ""))
      return { ...n, change: "changed", before: { label: o.label ?? "" } };
    return n;
  };
  return {
    ...before,
    ...after,
    groups: merge(before.groups, after.groups, (g) => g.id, (o, n) => o.label !== n.label || PLACE.some((k) => o[k] !== n[k]) ? { ...n, change: "changed" } : n),
    nodes: merge(before.nodes, after.nodes, (n) => n.id, compareNode),
    edges: merge(before.edges, after.edges, key, compareEdge)
  };
}
var resolve = (target) => typeof target === "string" ? dfDollar(target).get(0) : target;
var isDelta = (spec) => !!spec?.before && !!spec?.after;
function specFlags(root, spec) {
  for (const flag of ["steps", "autoplay", "interactive"])
    if (spec[flag])
      root.setAttribute(`data-${flag}`, typeof spec[flag] === "number" ? String(spec[flag]) : "");
}
var TONES = ["none", "accent", "link", "muted", "external", "warn", "ok", "danger"];
var SHAPES = ["box", "pill", "diamond", "store", "circle", "dot", "bar", "note", "activity", "class", "start", "end"];
var NODE_TEXT = [["eyebrow", "diagram-node-eyebrow"], ["name", "diagram-node-name"], ["meta", "diagram-node-meta"]];
var cellText = (c) => (dfDollar(c).children("span").get(0) ?? c).textContent.trim();
var headText = (c) => [...c.childNodes].filter((n) => n.nodeType === 3 || n.nodeName !== "SMALL").map((n) => n.textContent).join("").trim();
function propertiesOf(root, ref) {
  const target = refTarget(root, ref);
  if (!target)
    return null;
  const { el, kind } = target;
  if (el.tagName === "TR") {
    const cells = dfDollar(el).children("th, td").toArray();
    const heads = dfDollar(el.closest("table")).find("thead tr").first().children("th, td").toArray();
    const out = { row: headText(cells[0]) };
    cells.slice(1).forEach((c, i) => {
      out[heads[i + 1] ? headText(heads[i + 1]) : `column ${i + 2}`] = cellText(c);
    });
    return out;
  }
  if (kind === "node") {
    const out = { id: el.dataset.node };
    for (const [key, cls] of NODE_TEXT)
      out[key] = dfDollar(el).find(`.${cls}`).get(0)?.textContent.trim() ?? "";
    out.tone = el.dataset.tone || "none";
    out.shape = el.dataset.shape || "box";
    return out;
  }
  return {
    from: el.dataset.from,
    to: el.dataset.to,
    label: el.textContent.trim(),
    line: el.dataset.line || "solid",
    tone: el.dataset.tone || "none",
    head: el.dataset.head || "arrow",
    tail: el.dataset.tail || "none",
    curve: el.dataset.curve || "elbow"
  };
}
function propertySchemaOf(root, ref) {
  const target = refTarget(root, ref);
  if (!target)
    return {};
  if (target.el.tagName === "TR")
    return { row: { readOnly: true } };
  if (target.kind === "node")
    return { id: { readOnly: true }, tone: { options: TONES }, shape: { options: SHAPES } };
  const ends = Object.keys(HEADS);
  return {
    from: { readOnly: true },
    to: { readOnly: true },
    line: { options: ["solid", "dashed", "dotted", "thick"] },
    tone: { options: ["none", "accent", "link", "ink", "ok", "danger"] },
    head: { options: ends },
    tail: { options: ends },
    curve: { options: ["elbow", "straight", "curve", "around"] }
  };
}
function setPropertiesOf(root, ref, props) {
  const target = refTarget(root, ref);
  if (!target || !props)
    return false;
  const { el, kind } = target;
  const attr = (name, value, none) => dfDollar(el).attr(`data-${name}`, value == null || value === "" || value === none ? null : String(value));
  if (el.tagName === "TR") {
    const cells = dfDollar(el).children("th, td").toArray();
    const heads = dfDollar(el.closest("table")).find("thead tr").first().children("th, td").toArray();
    cells.slice(1).forEach((c, i) => {
      const key = heads[i + 1] ? headText(heads[i + 1]) : `column ${i + 2}`;
      if (key in props && cellText(c) !== String(props[key]))
        dfDollar(dfDollar(c).children("span").get(0) ?? c).text(String(props[key]));
    });
  } else if (kind === "node") {
    const host = dfDollar(el).children(".diagram-node-body").get(0) ?? el;
    for (const [key, cls] of NODE_TEXT) {
      if (!(key in props))
        continue;
      const value = String(props[key] ?? "");
      let span = dfDollar(el).find(`.${cls}`).get(0);
      if (span && !value)
        dfDollar(span).remove();
      else if (span && span.textContent !== value)
        dfDollar(span).text(value);
      else if (!span && value) {
        span = document.createElement("span");
        span.className = cls;
        dfDollar(span).text(value);
        const name = dfDollar(host).children(".diagram-node-name").get(0);
        if (key === "eyebrow")
          host.prepend(span);
        else if (key === "meta" && name)
          name.after(span);
        else
          host.append(span);
      }
    }
    if ("tone" in props)
      attr("tone", props.tone, "none");
    if ("shape" in props)
      attr("shape", props.shape, "box");
  } else {
    if ("label" in props && el.textContent !== String(props.label ?? ""))
      dfDollar(el).text(String(props.label ?? ""));
    if ("line" in props)
      attr("line", props.line, "solid");
    if ("tone" in props)
      attr("tone", props.tone, "none");
    if ("head" in props)
      attr("head", props.head, "arrow");
    if ("tail" in props)
      attr("tail", props.tail, "none");
    if ("curve" in props)
      attr("curve", props.curve, "elbow");
  }
  for (const canvas of canvasesOf(root))
    draw(root, canvas);
  return true;
}
df$.diagram = {
  build(target, spec) {
    const root = resolve(target);
    if (!root)
      return null;
    const delta = isDelta(spec);
    const merged = isDelta(spec) ? diffSpecs(spec.before, spec.after) : spec;
    if (merged.type)
      dfDollar(root).attr("data-type", merged.type);
    specFlags(root, merged);
    if (delta)
      dfDollar(root).attr("data-delta", root.getAttribute("data-delta") ?? "");
    root._controls?.remove();
    root._controls = null;
    dfDollar(root).children(".diagram-delta").remove();
    dfDollar(root).html(markupOf(merged));
    setup(root);
    if (root.api)
      triggerStateChange(root, root.store?.value ?? { name: "default", config: {} });
    return root;
  },
  markup: (spec) => markupOf(isDelta(spec) ? diffSpecs(spec.before, spec.after) : spec),
  diff: (before, after) => diffSpecs(before, after),
  redraw(target) {
    const root = resolve(target);
    if (root)
      for (const canvas of canvasesOf(root))
        draw(root, canvas);
  },
  play: (target, step = 1) => {
    resolve(target)?.api.setState("playing", { step });
  },
  pause: (target) => {
    control(resolve(target), "pause");
  },
  next: (target) => {
    control(resolve(target), "next");
  },
  prev: (target) => {
    control(resolve(target), "prev");
  },
  reset: (target) => {
    resolve(target)?.api.setState("default");
  },
  activate(target, ref) {
    const root = resolve(target);
    if (!root)
      return;
    if (ref == null || ref === "")
      root.api.setState("default");
    else
      root.api.setState("active", { ref: String(ref) });
  },
  activateNext: (target) => {
    stepActivation(resolve(target), 1);
  },
  activatePrev: (target) => {
    stepActivation(resolve(target), -1);
  },
  active(target) {
    const root = resolve(target);
    const state = root?._shown ?? root?.store?.value;
    return state?.name === "active" ? describe(root, state.config?.ref) : null;
  },
  order: (target) => activationOrder(resolve(target)),
  properties: (target, ref) => propertiesOf(resolve(target), ref),
  propertySchema: (target, ref) => propertySchemaOf(resolve(target), ref),
  setProperties: (target, ref, props) => setPropertiesOf(resolve(target), ref, props),
  steps(target) {
    const root = resolve(target);
    const { max } = stepPlan(root);
    const state = root.store?.value ?? { name: "default" };
    return { max, current: !stepping(state) ? max : stateStep(state, max) };
  }
};
function setup(root) {
  if (root.hasAttribute("data-steps") && !root._controls)
    root._controls = makeControls(root);
  if (!root._observer) {
    root._observer = new ResizeObserver(() => {
      if (root._queued)
        return;
      root._queued = true;
      queueMicrotask(() => {
        root._queued = false;
        for (const canvas of canvasesOf(root))
          draw(root, canvas);
      });
    });
    root._observer.observe(root);
  }
  for (const canvas of dfDollar(root).find(".diagram-canvas").toArray())
    root._observer.observe(canvas);
  if (root.hasAttribute("data-interactive"))
    makeInteractive(root);
}
function makeInteractive(root) {
  for (const n of activatable(root)) {
    if (n.getAttribute("tabindex") == null)
      dfDollar(n).attr("tabindex", "0");
    if (!n.getAttribute("role") && !tablePart(n))
      dfDollar(n).attr("role", "button");
    if (n.getAttribute(pressedAttr(n)) == null)
      dfDollar(n).attr(pressedAttr(n), "false");
  }
  if (root._interactive)
    return;
  root._interactive = true;
  const current = () => {
    const state = root._shown ?? root.store?.value ?? { name: "default" };
    return state.name === "active" ? String(state.config?.ref ?? "") : null;
  };
  const toggle = (ref) => current() === ref ? root.api.setState("default") : root.api.setState("active", { ref });
  dfDollar(root).on("click", (e) => {
    const t = e.target;
    if (!t?.closest || t.closest(".diagram-controls, .diagram-delta, .diagram-edges, .diagram-caption, .diagram-legend"))
      return;
    const wire = t.closest("[data-edge-ref]");
    if (wire)
      return toggle(wire.dataset.edgeRef);
    const node = t.closest("[data-node]");
    if (node && activatable(root).includes(node))
      return toggle(node.dataset.node);
    if (t.closest(".diagram-canvas") && current() != null)
      root.api.setState("default");
  });
  dfDollar(root).on("keydown", (e) => {
    const node = e.target?.closest?.("[data-node]");
    if (!node || !activatable(root).includes(node))
      return;
    const focusActive = () => activatable(root).find((n) => n.dataset.node === current())?.focus();
    if (e.key === "Enter" || e.key === " ")
      toggle(node.dataset.node);
    else if (e.key === "Escape")
      root.api.setState("default");
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      stepActivation(root, 1);
      focusActive();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      stepActivation(root, -1);
      focusActive();
    } else
      return;
    e.preventDefault();
  });
}
var controlsBound = false;
function bindOutsideControls() {
  if (controlsBound)
    return;
  controlsBound = true;
  dfDollar(document).on("click", (e) => {
    const trigger = e.target?.closest?.("[data-diagram-for][data-diagram-action]");
    if (!trigger)
      return;
    const root = dfDollar(`#${CSS.escape(trigger.dataset.diagramFor)}`).get(0);
    if (!root?.api)
      return;
    const action = trigger.dataset.diagramAction;
    if (action === "next")
      stepActivation(root, 1);
    else if (action === "prev")
      stepActivation(root, -1);
    else if (action === "clear" || action === "reset")
      root.api.setState("default");
    else if (action === "activate")
      root.api.setState("active", { ref: trigger.dataset.diagramRef });
    else if (action === "play")
      root.api.setState("playing", { step: 1 });
    else if (action === "pause")
      control(root, "pause");
    else if (action === "step-next")
      control(root, "next");
    else if (action === "step-prev")
      control(root, "prev");
  });
}
function init() {
  bindOutsideControls();
  dfDollar(".diagram:not([data-init])").toArray().forEach((root) => {
    root.dataset.init = "";
    const spec = dfDollar(root).children("script.diagram-spec").get(0);
    if (spec && !dfDollar(root).children(".diagram-canvas").get(0)) {
      try {
        const parsed = JSON.parse(spec.textContent);
        const merged = parsed.before && parsed.after ? diffSpecs(parsed.before, parsed.after) : parsed;
        if (parsed.before && parsed.after && !root.hasAttribute("data-delta"))
          root.setAttribute("data-delta", "");
        if (merged.type && !root.dataset.type)
          root.dataset.type = merged.type;
        specFlags(root, merged);
        const holder = document.createElement("div");
        dfDollar(holder).html(markupOf(merged));
        while (holder.firstChild)
          dfDollar(root).append(holder.firstChild);
      } catch (error) {
        console.error("[diagram] invalid spec", error);
      }
    }
    setup(root);
    bindComponent(root, diagramApi, { name: "default", config: {} });
    triggerStateChange(root, { name: "default", config: {} });
    document.fonts?.ready.then(() => root.isConnected && diagramRedraw(root));
    if (root.hasAttribute("data-autoplay") && root.hasAttribute("data-steps")) {
      const delay = Math.max(0, Number(root.getAttribute("data-autoplay")) || 0);
      const onSlide = !!root.closest("[data-slide]");
      let seen = false;
      const io = new IntersectionObserver((entries) => {
        const shown = entries.some((e) => e.isIntersecting);
        if (!shown) {
          if (seen && onSlide)
            clearTimeout(root._autoplay);
          return;
        }
        if (seen && !onSlide)
          return;
        const first = !seen;
        seen = true;
        if (!onSlide)
          io.disconnect();
        if (reducedMotion() || first && root.store?.value.name !== "default")
          return;
        clearTimeout(root._autoplay);
        if (delay || !first)
          root.api.setState("paused", { step: 0 });
        root._autoplay = setTimeout(() => root.isConnected && root.api.setState("playing", { step: 1 }), delay);
      }, { threshold: 0.35 });
      io.observe(root);
    }
  });
}
var diagramRedraw = (root) => {
  for (const canvas of canvasesOf(root))
    draw(root, canvas);
};
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

// dist/components/mermaid/mermaid.js
var __df$core2 = globalThis.df$;
var __df$shared2 = __df$core2 && __df$core2.shadcn && __df$core2.shadcn.shared;
if (!__df$shared2 || __df$shared2.abi !== "0.9.7") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals2, defussQuery: defussQuery2, componentState: componentState2, bindComponent: bindComponent2 } = __df$shared2;
var df$2 = defussGlobals2();
var dfDollar2 = defussQuery2();
var mermaidStates = ["default", "rendered", "error"];
var MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@12.0.0/dist/mermaid.esm.min.mjs";
var modulePromise = null;
var moduleUrl = "";
function load(url) {
  const vendorUrl = url || (dfDollar2('meta[name="mermaid-module"]').get(0) ?? null)?.content || MERMAID_URL;
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
  const pre = dfDollar2(fig).find(":scope > pre.mermaid").get(0) ?? null;
  if (!pre)
    return "";
  return Array.from(pre.childNodes).map((n) => n.nodeType === Node.TEXT_NODE ? n.data : n.nodeType === Node.ELEMENT_NODE ? dfDollar2("<div></div>").append(n.cloneNode(true)).html() ?? "" : "").join("").replace(/^\n+|\s+$/g, "");
}
function outputOf(fig) {
  let out = dfDollar2(fig).find(":scope > .mermaid-output").get(0) ?? null;
  if (!out) {
    out = document.createElement("div");
    out.className = "mermaid-output";
    out.setAttribute("data-ce-chrome", "");
    dfDollar2(fig).find(":scope > pre.mermaid").get(0)?.after(out);
  }
  return out;
}
function clearError(fig) {
  dfDollar2(fig).find(":scope > .mermaid-error").get(0)?.remove();
}
function showError(fig, message) {
  clearError(fig);
  dfDollar2(fig).find(":scope > .mermaid-output").get(0)?.remove();
  const out = document.createElement("output");
  out.className = "mermaid-error";
  out.setAttribute("role", "alert");
  out.setAttribute("data-ce-chrome", "");
  out.textContent = message;
  dfDollar2(fig).find(":scope > pre.mermaid").get(0)?.after(out);
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
      dfDollar2(out).empty();
      if (parsed)
        dfDollar2(out).append(document.importNode(parsed, true));
      const el = dfDollar2(out).find("svg").get(0);
      const label = fig.getAttribute("aria-label");
      if (el) {
        el.removeAttribute("height");
        el.style.maxWidth = "";
        el.setAttribute("role", "img");
        if (label && !dfDollar2(el).find(":scope > title").get(0))
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
  return Promise.all([...dfDollar2(".mermaid-diagram[data-init]").toArray()].map(renderDiagram));
}
function applyMarkup2(fig, stateName, config = {}) {
  dfDollar2(fig).children(".mermaid-output, .mermaid-error").remove();
  if (stateName === "default") {
    dfDollar2(fig).attr("data-state", null);
    return;
  }
  if (stateName === "rendered") {
    dfDollar2(fig).attr("data-state", "rendered");
    return;
  }
  const out = dfDollar2('<output class="mermaid-error" role="alert" data-ce-chrome></output>').text(typeof config.message === "string" ? config.message : "This diagram could not be rendered.");
  dfDollar2(fig).children("pre.mermaid").after(out);
  dfDollar2(fig).attr("data-state", "error");
}
function triggerStateChange2(fig, stateName, config) {
  switch (stateName) {
    case "default":
      clearError(fig);
      dfDollar2(fig).find(":scope > .mermaid-output").get(0)?.remove();
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
var mermaidApi = componentState2({
  component: "mermaid",
  states: mermaidStates,
  apply: (fig, state) => triggerStateChange2(fig, state.name, state.config),
  read: (fig, state) => {
    const error = dfDollar2(fig).children(".mermaid-error").get(0);
    const config = { ...state.config, ...error ? { message: error.textContent ?? "" } : {} };
    return { name: fig.dataset.stateName || "default", config };
  },
  markup: (el, state) => applyMarkup2(el, state.name, state.config)
});
df$2.mermaidApi = mermaidApi;
df$2.mermaidStates = mermaidStates;
df$2.mermaid = { load, render: renderDiagram, renderAll, theme: mermaidTheme, url: MERMAID_URL };
var themeWatched = false;
function watchTheme() {
  if (themeWatched)
    return;
  themeWatched = true;
  let timer = 0;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      dfDollar2('.mermaid-diagram[data-state="rendered"]').toArray().forEach((fig) => {
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
function init2() {
  dfDollar2("pre.mermaid:not(.mermaid-diagram > pre)").toArray().forEach((pre) => {
    const fig = document.createElement("figure");
    fig.className = "mermaid-diagram";
    pre.before(fig);
    fig.append(pre);
  });
  dfDollar2(".mermaid-diagram:not([data-init])").toArray().forEach((fig) => {
    fig.dataset.init = "";
    if (!dfDollar2(fig).find(":scope > pre.mermaid").get(0))
      return;
    fig.dataset.stateName = "default";
    bindComponent2(fig, mermaidApi);
    watchTheme();
    renderDiagram(fig);
  });
}
init2();
new MutationObserver(init2).observe(document, { childList: true, subtree: true });

//# debugId=F701D319994B7DFC64756E2164756E21
//# sourceMappingURL=diagrams.js.map
