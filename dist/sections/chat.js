// dist/components/session/session.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.10.1") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals, defussQuery, componentState, bindComponent } = __df$shared;
var df$ = defussGlobals();
var dfDollar = defussQuery();
var sessionStates = ["default", "detached", "streaming"];
var num = (el, key, fallback) => {
  const v = parseFloat(el.dataset[key]);
  return Number.isFinite(v) ? v : fallback;
};
var reduced = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
var resolve = (t) => typeof t === "string" ? dfDollar("#" + CSS.escape(t)).get(0) ?? dfDollar(t).get(0) : t;
var parts = (s) => ({
  viewport: dfDollar(s).find(":scope > .session-viewport").get(0),
  content: dfDollar(s).find(":scope > .session-viewport > .session-content").get(0)
});
var fromEnd = (v) => v.scrollHeight - v.scrollTop - v.clientHeight;
function scrollViewport(s, top, smooth) {
  const { viewport } = s._parts;
  s.setAttribute("data-autoscrolling", "");
  viewport.scrollTo({ top, behavior: smooth && !reduced() ? "smooth" : "instant" });
  clearTimeout(s._settle);
  s._settle = setTimeout(() => settle(s), smooth ? 700 : 50);
}
function settle(s) {
  clearTimeout(s._settle);
  s.removeAttribute("data-autoscrolling");
  measure(s);
}
function measure(s) {
  const { viewport } = s._parts;
  if (!viewport)
    return;
  const threshold = num(s, "threshold", 48);
  const start = viewport.scrollTop > 1;
  const end = fromEnd(viewport) > 1;
  const tokens = [start && "start", end && "end"].filter(Boolean).join(" ");
  if (tokens)
    s.setAttribute("data-scrollable", tokens);
  else
    s.removeAttribute("data-scrollable");
  dfDollar(s).find(".session-scroll-button").toArray().forEach((b) => {
    const active = b.dataset.to === "start" ? start : end;
    b.dataset.active = String(active);
    b.inert = !active;
  });
  s._height = viewport.scrollHeight;
  if (!s.hasAttribute("data-autoscrolling")) {
    const reserved = parseFloat(s._parts.content.style.paddingBlockEnd) > 0;
    const stick = fromEnd(viewport) <= threshold && !reserved;
    setStick(s, stick);
  }
  track(s);
}
function setStick(s, stick) {
  s.toggleAttribute("data-stick", stick);
  const name = s.dataset.stateName;
  if (name === "streaming")
    return;
  const next = stick ? "default" : "detached";
  if (name !== next)
    sessionApi.commit(s, next, {});
}
function hold(s, target, ms) {
  s._opening = target;
  clearTimeout(s._holdTimer);
  s._holdTimer = setTimeout(() => {
    s._opening = null;
  }, ms);
}
function anchorSpace(s) {
  const a = s._anchor;
  const { viewport, content } = s._parts;
  if (!a || !content.contains(a)) {
    if (content.style.paddingBlockEnd)
      content.style.paddingBlockEnd = "";
    s._anchor = null;
    return;
  }
  const pad = parseFloat(content.style.paddingBlockEnd) || 0;
  const vpPad = parseFloat(getComputedStyle(viewport).paddingBlockEnd) || 0;
  const below = content.offsetTop + content.offsetHeight - pad - a.offsetTop;
  const need = Math.max(0, Math.round(viewport.clientHeight - vpPad - num(s, "peek", 48) - below));
  if (need !== Math.round(pad))
    content.style.paddingBlockEnd = need ? `${need}px` : "";
  if (need) {
    const short = anchorTop(s, a) - (viewport.scrollHeight - viewport.clientHeight);
    if (short > 0)
      content.style.paddingBlockEnd = `${need + Math.ceil(short)}px`;
  }
}
var anchorTop = (s, item) => item.offsetTop - num(s, "peek", 48);
function endHold(s) {
  clearTimeout(s._holdTimer);
  s._opening = null;
}
function scrollToEnd(s, { smooth = true } = {}) {
  endHold(s);
  s.setAttribute("data-stick", "");
  scrollViewport(s, s._parts.viewport.scrollHeight, smooth);
}
function scrollToStart(s, { smooth = true } = {}) {
  endHold(s);
  s.removeAttribute("data-stick");
  scrollViewport(s, 0, smooth);
}
function scrollToMessage(s, id, { smooth = true } = {}) {
  const item = dfDollar(s._parts.content).find(`.session-item[data-message-id="${CSS.escape(id)}"]`).get(0);
  if (!item)
    return false;
  s.removeAttribute("data-stick");
  scrollViewport(s, anchorTop(s, item), smooth);
  hold(s, () => anchorTop(s, item), smooth ? 900 : 400);
  return true;
}
function applyMarkup(el, stateName) {
  const { content } = parts(el);
  if (content)
    dfDollar(content).attr("aria-busy", stateName === "streaming" ? "true" : null);
}
function triggerStateChange(s, stateName, config) {
  const { content } = s._parts;
  if (stateName === "streaming")
    content.setAttribute("aria-busy", "true");
  else
    content.removeAttribute("aria-busy");
  switch (stateName) {
    case "default":
      scrollToEnd(s, { smooth: config.smooth !== false });
      break;
    case "detached":
      s.removeAttribute("data-stick");
      if (config.to === "start")
        scrollToStart(s);
      else if (typeof config.to === "string")
        scrollToMessage(s, config.to);
      break;
    case "streaming":
      if (s.hasAttribute("data-stick"))
        scrollToEnd(s, { smooth: false });
      break;
  }
}
var sessionApi = componentState({
  component: "session",
  states: sessionStates,
  apply: (s, state) => {
    s.dataset.stateName = state.name;
    triggerStateChange(s, state.name, state.config);
  },
  markup: (el, state) => applyMarkup(el, state.name)
});
df$.sessionApi = sessionApi;
df$.sessionStates = sessionStates;
function onItems(s, records) {
  const { viewport } = s._parts;
  if (s._anchor && records.some((r) => r.removedNodes.length)) {
    const top = s._top ?? viewport.scrollTop;
    anchorSpace(s);
    if (s._anchor && Math.abs(viewport.scrollTop - top) > 1)
      scrollViewport(s, top, false);
  }
  const before = s._height ?? viewport.scrollHeight;
  let prepended = false;
  let appended = false;
  let anchored = null;
  for (const r of records) {
    if (!r.addedNodes.length)
      continue;
    if (r.nextSibling === null) {
      appended = true;
      for (const node of r.addedNodes)
        if (node.nodeType === 1 && node.matches(".session-item[data-anchor]"))
          anchored = node;
    } else if (r.previousSibling === null)
      prepended = true;
  }
  if (prepended && !appended) {
    const added = records.flatMap((r) => [...r.addedNodes]).filter((n) => n.nodeType === 1);
    added.forEach((n) => {
      n.style.contentVisibility = "visible";
    });
    s.setAttribute("data-autoscrolling", "");
    viewport.scrollTop += viewport.scrollHeight - before;
    added.forEach((n) => {
      n.style.contentVisibility = "";
    });
    settle(s);
    return;
  }
  if (appended) {
    const added = records.filter((r) => r.nextSibling === null).flatMap((r) => [...r.addedNodes]).filter((n) => n.nodeType === 1);
    added.forEach((n) => {
      n.style.contentVisibility = "visible";
    });
    requestAnimationFrame(() => requestAnimationFrame(() => added.forEach((n) => {
      n.style.contentVisibility = "";
      if (!n.getAttribute("style"))
        n.removeAttribute("style");
    })));
  }
  if (anchored) {
    s._anchor = anchored;
    anchorSpace(s);
    s.removeAttribute("data-stick");
    scrollViewport(s, anchorTop(s, anchored), true);
    hold(s, () => anchorTop(s, anchored), 900);
    if (s.dataset.stateName !== "streaming")
      sessionApi.commit(s, "detached", {});
    return;
  }
  if (appended && s.hasAttribute("data-stick"))
    scrollViewport(s, viewport.scrollHeight, s.dataset.stateName !== "streaming");
  else
    measure(s);
}
function onResize(s) {
  const { viewport } = s._parts;
  anchorSpace(s);
  if (s._opening) {
    s.setAttribute("data-autoscrolling", "");
    viewport.scrollTop = s._opening();
    settle(s);
    return;
  }
  if (s.hasAttribute("data-stick") && fromEnd(viewport) > 1) {
    s.setAttribute("data-autoscrolling", "");
    viewport.scrollTop = viewport.scrollHeight;
    settle(s);
  } else
    measure(s);
}
function track(s) {
  if (!s.hasAttribute("data-track"))
    return;
  const { viewport, content } = s._parts;
  const top = viewport.getBoundingClientRect().top;
  const bottom = top + viewport.clientHeight;
  const items = Array.from(dfDollar(content).find(":scope > .session-item").toArray());
  const visible = items.filter((it) => {
    const r = it.getBoundingClientRect();
    return r.bottom > top && r.top < bottom;
  });
  const line = top + viewport.clientHeight / 3;
  let current = null;
  for (const it of items) {
    if (!it.hasAttribute("data-anchor"))
      continue;
    if (it.getBoundingClientRect().top <= line)
      current = it;
    else
      break;
  }
  current ??= items.find((it) => it.hasAttribute("data-anchor")) ?? null;
  const ids = visible.map((it) => it.dataset.messageId).filter(Boolean);
  const currentId = current?.dataset.messageId ?? null;
  if (currentId === s._currentId && ids.join() === s._visibleIds)
    return;
  s._currentId = currentId;
  s._visibleIds = ids.join();
  items.forEach((it) => it.toggleAttribute("data-current", it === current));
  s.dispatchEvent(new CustomEvent("session-visibility", {
    bubbles: true,
    detail: { currentAnchorId: currentId, visibleMessageIds: ids }
  }));
}
function bindDrop(s) {
  const hasFiles = (e) => [...e.dataTransfer?.types ?? []].includes("Files");
  if (!s.dataset.dropLabel)
    s.dataset.dropLabel = "Drop files to attach";
  const accept = (s.dataset.dropAccept || "").split(",").map((a) => a.trim()).filter(Boolean);
  const ok = (file) => !accept.length || accept.some((a) => a.endsWith("/*") ? file.type.startsWith(a.slice(0, -1)) : a.startsWith(".") ? file.name.toLowerCase().endsWith(a.toLowerCase()) : file.type === a);
  s.addEventListener("dragenter", (e) => {
    if (hasFiles(e)) {
      e.preventDefault();
      s.setAttribute("data-drop-active", "");
    }
  });
  s.addEventListener("dragover", (e) => {
    if (hasFiles(e)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  });
  s.addEventListener("dragleave", (e) => {
    if (!s.contains(e.relatedTarget))
      s.removeAttribute("data-drop-active");
  });
  s.addEventListener("drop", (e) => {
    if (!hasFiles(e))
      return;
    e.preventDefault();
    s.removeAttribute("data-drop-active");
    const files = [...e.dataTransfer.files].filter(ok);
    if (files.length)
      s.dispatchEvent(new CustomEvent("session-drop", { bubbles: true, detail: { files } }));
  });
}
function follow(s, options = {}) {
  if (s.dataset.stateName === "streaming")
    scrollToEnd(s, options);
  else
    sessionApi.setState(s, "default", options);
}
function init() {
  dfDollar(".session:not([data-init])").toArray().forEach((s) => {
    const p = parts(s);
    if (!p.viewport || !p.content)
      return;
    s.dataset.init = "";
    s._parts = p;
    const { viewport, content } = p;
    if (!viewport.hasAttribute("role"))
      viewport.setAttribute("role", "region");
    if (!viewport.hasAttribute("aria-label"))
      viewport.setAttribute("aria-label", "Messages");
    if (!viewport.hasAttribute("tabindex"))
      viewport.tabIndex = 0;
    if (!content.hasAttribute("role"))
      content.setAttribute("role", "log");
    if (!content.hasAttribute("aria-relevant"))
      content.setAttribute("aria-relevant", "additions");
    viewport.addEventListener("scroll", () => {
      s._top = viewport.scrollTop;
      if (s.hasAttribute("data-autoscrolling"))
        return track(s);
      s._opening = null;
      measure(s);
    }, { passive: true });
    ["wheel", "touchstart", "keydown", "pointerdown"].forEach((type) => viewport.addEventListener(type, () => {
      s._opening = null;
    }, { passive: true }));
    viewport.addEventListener("scrollend", () => settle(s));
    new MutationObserver((records) => onItems(s, records)).observe(content, { childList: true });
    new ResizeObserver(() => onResize(s)).observe(content);
    new ResizeObserver(() => measure(s)).observe(viewport);
    dfDollar(s).find(".session-scroll-button").toArray().forEach((b) => {
      b.addEventListener("click", () => b.dataset.to === "start" ? scrollToStart(s) : follow(s));
    });
    if (s.hasAttribute("data-drop"))
      bindDrop(s);
    bindComponent(s, sessionApi);
    s.setAttribute("data-pending-scroll", "");
    s.dataset.stateName = "default";
    const where = s.dataset.defaultPosition || "end";
    const last = [...dfDollar(content).find(":scope > .session-item[data-anchor]").toArray()].pop();
    if (where === "start")
      s._opening = () => 0;
    else if (where === "last-anchor" && last)
      s._opening = () => anchorTop(s, last);
    if (s._opening) {
      scrollViewport(s, s._opening(), false);
      hold(s, s._opening, 1000);
    } else {
      s.setAttribute("data-stick", "");
      scrollViewport(s, viewport.scrollHeight, false);
    }
    s.removeAttribute("data-pending-scroll");
  });
}
function toItem(content, { id, anchor } = {}) {
  let node = content;
  if (typeof content === "string")
    node = document.createRange().createContextualFragment(content);
  const single = node instanceof Element && node.classList.contains("session-item");
  const item = single ? node : document.createElement("div");
  if (!single) {
    item.className = "session-item";
    item.append(node);
  }
  if (id)
    item.dataset.messageId = id;
  if (anchor)
    item.setAttribute("data-anchor", "");
  return item;
}
df$.session = {
  append(target, content, options) {
    const s = resolve(target);
    const item = toItem(content, options);
    s?._parts?.content.append(item);
    return item;
  },
  prepend(target, content, options) {
    const s = resolve(target);
    const items = (Array.isArray(content) ? content : [content]).map((c) => toItem(c, options));
    s?._parts?.content.prepend(...items);
    return items;
  },
  scrollToEnd: (target, options) => {
    const s = resolve(target);
    if (s)
      follow(s, options);
  },
  scrollToStart: (target, options) => {
    const s = resolve(target);
    if (s)
      scrollToStart(s, options);
  },
  scrollToMessage: (target, id, options) => {
    const s = resolve(target);
    return s ? scrollToMessage(s, id, options) : false;
  },
  isAtEnd: (target) => {
    const s = resolve(target);
    return !!s && fromEnd(s._parts.viewport) <= num(s, "threshold", 48);
  }
};
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

// dist/components/chat-components/chat-components.js
var __df$core2 = globalThis.df$;
var __df$shared2 = __df$core2 && __df$core2.shadcn && __df$core2.shadcn.shared;
if (!__df$shared2 || __df$shared2.abi !== "0.10.1") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals2, defussQuery: defussQuery2, componentState: componentState2, bindComponent: bindComponent2, persisted } = __df$shared2;
var df$2 = defussGlobals2();
var dfDollar2 = defussQuery2();
var FENCE = "ui::component-schema";
var FIELD_TYPES = [
  "input",
  "textarea",
  "number",
  "currency",
  "select",
  "radio",
  "checkbox",
  "switch",
  "slider",
  "rating",
  "date"
];
var CONTENT_TYPES = ["text", "list", "table", "facts", "plan", "alert", "divider"];
var NODE_TYPES = [...CONTENT_TYPES, ...FIELD_TYPES, "questionnaire"];
var NAME_RE = /^[A-Za-z][\w-]*$/;
var NODE_KEYS = new Set([
  "type",
  "name",
  "label",
  "hint",
  "text",
  "title",
  "tone",
  "items",
  "ordered",
  "columns",
  "rows",
  "facts",
  "steps",
  "required",
  "default",
  "placeholder",
  "inputType",
  "min",
  "max",
  "step",
  "unit",
  "currency",
  "locale",
  "minLength",
  "maxLength",
  "pattern",
  "lines",
  "options",
  "other",
  "branches",
  "autoAdvance",
  "review"
]);
var isField = (n) => FIELD_TYPES.includes(n?.type) || n?.type === "plan" && !!n.name;
function validate(spec) {
  const out = [];
  const err = (path, message) => out.push({ path, message, level: "error" });
  const warn = (path, message) => out.push({ path, message, level: "warning" });
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    err("", "a Component Schema document is a JSON object");
    return out;
  }
  if (spec.schema !== undefined && spec.schema !== "component-schema")
    err("schema", 'must be "component-schema"');
  if (spec.version === undefined)
    warn("version", "missing - read as 1");
  else if (spec.version !== 1)
    err("version", `version ${JSON.stringify(spec.version)} is not supported (1)`);
  for (const k of ["id", "title", "description"])
    if (spec[k] !== undefined && typeof spec[k] !== "string")
      err(k, "must be a string");
  for (const k of Object.keys(spec))
    if (!["schema", "version", "id", "title", "description", "body", "actions"].includes(k))
      warn(k, "unknown key, ignored");
  const names = new Set;
  const body = spec.body ?? [];
  if (!Array.isArray(body))
    err("body", "must be a list of nodes");
  else {
    const steps = new Set;
    const nodeCheck = (n, path, inStep = false, stepIds = null) => {
      if (!n || typeof n !== "object" || Array.isArray(n))
        return err(path, "a node is an object");
      if (!NODE_TYPES.includes(n.type))
        return err(`${path}.type`, `unknown type ${JSON.stringify(n.type)}`);
      for (const k of Object.keys(n))
        if (!NODE_KEYS.has(k))
          warn(`${path}.${k}`, "unknown key, ignored");
      if (inStep && !isField(n) && n.type !== "text")
        err(`${path}.type`, "a questionnaire step holds fields and text");
      if (isField(n)) {
        if (typeof n.name !== "string" || !NAME_RE.test(n.name))
          err(`${path}.name`, "a field needs a name (letters, digits, - and _, starting with a letter)");
        else if (names.has(n.name))
          err(`${path}.name`, `the name "${n.name}" is used twice`);
        else
          names.add(n.name);
        if (n.label !== undefined && typeof n.label !== "string")
          err(`${path}.label`, "must be a string");
      }
      const str = (k) => n[k] !== undefined && typeof n[k] !== "string" && err(`${path}.${k}`, "must be a string");
      ["text", "title", "hint", "placeholder", "unit", "other", "pattern", "review"].forEach(str);
      if ((n.type === "text" || n.type === "alert") && typeof n.text !== "string" && typeof n.title !== "string")
        err(`${path}.text`, "missing");
      if (n.type === "list" && (!Array.isArray(n.items) || !n.items.length))
        err(`${path}.items`, "a list of texts");
      if (n.type === "table") {
        if (!Array.isArray(n.columns) || !n.columns.length)
          err(`${path}.columns`, "a list of headings");
        if (!Array.isArray(n.rows))
          err(`${path}.rows`, "a list of rows");
        else
          n.rows.forEach((r, i) => {
            if (!Array.isArray(r))
              err(`${path}.rows[${i}]`, "a row is a list of cells");
          });
      }
      if (n.type === "facts" && (!Array.isArray(n.facts) || !n.facts.length))
        err(`${path}.facts`, "a list of { label, value }");
      if (n.type === "plan" && (!Array.isArray(n.steps) || !n.steps.length))
        err(`${path}.steps`, "a list of steps");
      if (n.type === "plan" && Array.isArray(n.steps))
        n.steps.forEach((s, i) => {
          if (!s || typeof s.title !== "string")
            err(`${path}.steps[${i}].title`, "missing");
        });
      if (["select", "radio"].includes(n.type) && (!Array.isArray(n.options) || !n.options.length))
        err(`${path}.options`, "a list of choices");
      if (n.options !== undefined) {
        if (!Array.isArray(n.options))
          err(`${path}.options`, "a list of choices");
        else {
          const seen = new Set;
          n.options.forEach((o, i) => {
            const v = typeof o === "string" ? o : o?.value;
            if (typeof v !== "string" || !v)
              err(`${path}.options[${i}]`, "a choice is a text or { value, label }");
            else if (seen.has(v))
              err(`${path}.options[${i}].value`, `"${v}" twice`);
            else
              seen.add(v);
            if (o && typeof o === "object" && o.goto !== undefined && stepIds && !stepIds.has(o.goto))
              err(`${path}.options[${i}].goto`, `no step "${o.goto}"`);
          });
        }
      }
      if (n.type === "currency" && (typeof n.currency !== "string" || !/^[A-Z]{3}$/.test(n.currency)))
        err(`${path}.currency`, "an ISO 4217 code such as EUR");
      if (n.inputType !== undefined && !["text", "email", "url", "tel", "time"].includes(n.inputType))
        err(`${path}.inputType`, "text, email, url, tel or time");
      if (n.tone !== undefined && !["default", "destructive"].includes(n.tone))
        err(`${path}.tone`, "default or destructive");
      if (typeof n.min === "number" && typeof n.max === "number" && n.min > n.max)
        err(`${path}.min`, "above max");
      if (n.pattern !== undefined)
        try {
          new RegExp(n.pattern);
        } catch {
          err(`${path}.pattern`, "not a regular expression");
        }
      if (n.type === "questionnaire") {
        if (inStep)
          return err(path, "a questionnaire does not nest");
        if (!Array.isArray(n.steps) || !n.steps.length)
          return err(`${path}.steps`, "a list of steps");
        const ids = new Set;
        n.steps.forEach((s, i) => {
          if (!s || typeof s.id !== "string" || !NAME_RE.test(s.id))
            err(`${path}.steps[${i}].id`, "a step needs an id");
          else if (ids.has(s.id) || s.id === "review")
            err(`${path}.steps[${i}].id`, `"${s.id}" twice or reserved`);
          else
            ids.add(s.id);
        });
        n.steps.forEach((s, i) => {
          const sp = `${path}.steps[${i}]`;
          if (!s)
            return;
          if (typeof s.title !== "string")
            err(`${sp}.title`, "missing");
          if (s.next !== undefined && !ids.has(s.next) && s.next !== "review")
            err(`${sp}.next`, `no step "${s.next}"`);
          if (!Array.isArray(s.fields) || !s.fields.some(isField))
            err(`${sp}.fields`, "a step asks with fields");
          else
            s.fields.forEach((f, j) => nodeCheck(f, `${sp}.fields[${j}]`, true, ids));
        });
        if (n.branches !== undefined) {
          if (typeof n.branches !== "object" || Array.isArray(n.branches))
            err(`${path}.branches`, "an object by step id");
          else
            for (const [id, list] of Object.entries(n.branches)) {
              if (!ids.has(id))
                err(`${path}.branches.${id}`, `no step "${id}"`);
              if (!Array.isArray(list))
                err(`${path}.branches.${id}`, "a list of { when, goto }");
              else
                list.forEach((b, i) => {
                  if (!b || b.when === undefined)
                    err(`${path}.branches.${id}[${i}].when`, "missing");
                  if (!b || !ids.has(b.goto) && b.goto !== "review")
                    err(`${path}.branches.${id}[${i}].goto`, `no step "${b?.goto}"`);
                });
            }
        }
        for (const s of n.steps)
          steps.add(s?.id);
      }
    };
    body.forEach((n, i) => nodeCheck(n, `body[${i}]`));
    const q = body.filter((n) => n?.type === "questionnaire");
    if (q.length > 1)
      err("body", "one questionnaire per card");
    if (q.length && body.some(isField))
      err("body", "a card with a questionnaire asks only through it");
  }
  if (spec.actions !== undefined) {
    if (!Array.isArray(spec.actions))
      err("actions", "a list of { id, label }");
    else {
      const ids = new Set;
      spec.actions.forEach((a, i) => {
        const p = `actions[${i}]`;
        if (!a || typeof a !== "object")
          return err(p, "an action is { id, label }");
        if (typeof a.id !== "string" || !a.id)
          err(`${p}.id`, "missing");
        else if (ids.has(a.id))
          err(`${p}.id`, `"${a.id}" twice`);
        else
          ids.add(a.id);
        if (typeof a.label !== "string" || !a.label)
          err(`${p}.label`, "missing");
        if (a.reply !== undefined && typeof a.reply !== "string")
          err(`${p}.reply`, "must be a string");
        if (a.variant !== undefined && !["default", "secondary", "outline", "ghost", "destructive"].includes(a.variant))
          err(`${p}.variant`, "a Button variant");
      });
    }
  }
  return out;
}
var esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var inline = (v) => esc(v).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
var attr = (name, v) => v === undefined || v === null || v === false ? "" : v === true ? ` ${name}` : ` ${name}="${esc(v)}"`;
var optionsOf = (n) => (n.options ?? []).map((o) => typeof o === "string" ? { value: o, label: o } : { ...o, label: o.label ?? o.value });
var actionsOf = (spec) => spec.actions?.length ? spec.actions : (spec.body ?? []).some((n) => isField(n) || n?.type === "questionnaire") ? [{ id: "submit", label: "Send", submit: true }] : [];
var scriptJson = (v) => JSON.stringify(v).replace(/</g, "\\u003c");
function hintOf(n, id) {
  return n.hint ? `<p class="chat-components-hint" id="${id}-hint">${inline(n.hint)}</p>` : "";
}
var described = (n, id) => n.hint ? ` aria-describedby="${id}-hint"` : "";
function choices(n, id, kind, inStep) {
  const list = optionsOf(n);
  const def = n.default;
  const checked = (v) => Array.isArray(def) ? def.includes(v) : def === v;
  const cls = kind === "radio" ? 'class="radio"' : 'class="checkbox"';
  const rows = list.map((o, i) => {
    const cid = `${id}-${i}`;
    const own = `type="${kind}" name="${esc(n.name)}" value="${esc(o.value)}"${attr("checked", checked(o.value))}${attr("required", kind === "radio" && n.required && i === 0)}`;
    if (inStep)
      return `<label class="questionnaire-choice"><input ${own}${attr("data-goto", o.goto)}><span class="questionnaire-choice-label">${esc(o.label)}</span></label>`;
    const text = `<span class="chat-components-choice-label">${esc(o.label)}</span>${o.description ? `<span class="chat-components-choice-description">${esc(o.description)}</span>` : ""}`;
    return `<div class="chat-components-choice"><input ${cls} id="${cid}" ${own}><label for="${cid}">${text}</label></div>`;
  });
  if (n.other) {
    const cid = `${id}-other`;
    const otherName = `${n.name}Other`;
    rows.push(inStep ? `<label class="questionnaire-choice"><input type="${kind}" name="${esc(n.name)}" value="other"><span class="questionnaire-choice-label">${esc(n.other)}</span><input class="questionnaire-other" name="${esc(otherName)}" aria-label="${esc(n.other)}"></label>` : `<div class="chat-components-choice" data-other><input ${cls} type="${kind}" name="${esc(n.name)}" id="${cid}" value="other"><label for="${cid}"><span class="chat-components-choice-label">${esc(n.other)}</span></label><input class="input chat-components-other" data-size="sm" name="${esc(otherName)}" aria-label="${esc(n.other)}"></div>`);
  }
  if (inStep)
    return `<div class="questionnaire-choices">${rows.join("")}</div>${hintOf(n, id)}`;
  return `<fieldset class="chat-components-group" data-field="${esc(n.name)}"${described(n, id)}><legend class="label">${esc(n.label ?? n.name)}</legend>${rows.join("")}${hintOf(n, id)}</fieldset>`;
}
function fieldMarkup(n, prefix, inStep = false) {
  const id = `${prefix}-${n.name}`;
  const label = `<label class="label" for="${id}">${esc(n.label ?? n.name)}</label>`;
  const wrap = (control) => `<div class="${inStep ? "questionnaire-field" : "chat-components-field"}" data-field="${esc(n.name)}">${label}${control}${hintOf(n, id)}</div>`;
  const def = n.default ?? undefined;
  const common = `id="${id}" name="${esc(n.name)}"${attr("required", n.required)}${described(n, id)}`;
  switch (n.type) {
    case "input":
      return wrap(`<input class="input" type="${n.inputType ?? "text"}" ${common}${attr("placeholder", n.placeholder)}${attr("value", def)}${attr("minlength", n.minLength)}${attr("maxlength", n.maxLength)}${attr("pattern", n.pattern)}>`);
    case "textarea":
      return wrap(`<textarea class="textarea" rows="${Number(n.lines) || 3}" ${common}${attr("placeholder", n.placeholder)}${attr("minlength", n.minLength)}${attr("maxlength", n.maxLength)}>${esc(def ?? "")}</textarea>`);
    case "date":
      return wrap(`<input class="input" type="date" ${common}${attr("min", n.min)}${attr("max", n.max)}${attr("value", def)}>`);
    case "number":
      return wrap(`<div class="number-input"><button type="button" data-action="decrement" aria-label="Decrease">−</button><input type="number" ${common}${attr("min", n.min)}${attr("max", n.max)}${attr("step", n.step)}${attr("value", def)}${attr("placeholder", n.placeholder)}>${n.unit ? `<label class="number-input-unit" for="${id}">${esc(n.unit)}</label>` : ""}<button type="button" data-action="increment" aria-label="Increase">+</button></div>`);
    case "currency":
      return wrap(`<div class="number-input" data-currency="${esc(n.currency)}"${attr("data-locale", n.locale)}${attr("data-min", n.min)}${attr("data-max", n.max)}><input type="text" id="${id}"${attr("required", n.required)}${described(n, id)}${attr("value", def)}${attr("placeholder", n.placeholder)}><input type="hidden" name="${esc(n.name)}" data-number-output data-answer></div>`);
    case "select":
      return wrap(`<select class="select" ${common}><option value=""${attr("selected", def === undefined)}>${esc(n.placeholder ?? "Choose ...")}</option>${optionsOf(n).map((o) => `<option value="${esc(o.value)}"${attr("selected", def === o.value)}${attr("data-goto", inStep ? o.goto : undefined)}>${esc(o.label)}</option>`).join("")}</select>`);
    case "radio":
      return choices(n, id, "radio", inStep);
    case "checkbox":
      if (n.options)
        return choices(n, id, "checkbox", inStep);
      return `<div class="chat-components-choice" data-field="${esc(n.name)}"><input class="checkbox" type="checkbox" ${common}${attr("checked", def === true)}><label for="${id}"><span class="chat-components-choice-label">${esc(n.label ?? n.name)}</span></label>${hintOf(n, id)}</div>`;
    case "switch":
      return `<div class="switch-item chat-components-switch" data-field="${esc(n.name)}"><input class="switch" type="checkbox" role="switch" ${common}${attr("checked", def === true)}><label for="${id}">${esc(n.label ?? n.name)}</label>${hintOf(n, id)}</div>`;
    case "slider": {
      const min = n.min ?? 0;
      const max = n.max ?? 100;
      const value = def ?? min;
      return wrap(`<div class="chat-components-slider"><input class="slider" type="range" ${common}${attr("min", min)}${attr("max", max)}${attr("step", n.step)}${attr("data-unit", n.unit)} value="${esc(value)}"><output for="${id}" class="chat-components-output">${esc(value)}</output></div>`);
    }
    case "rating": {
      const stars = Math.max(1, Math.min(10, Number(n.max) || 5));
      const items = Array.from({ length: stars }, (_, i) => {
        const v = i + 1;
        return `<label class="rating-item"><input class="rating-input" type="radio" name="${esc(n.name)}" value="${v}" aria-label="${v} ${v === 1 ? "star" : "stars"}"${attr("checked", def === v)}${attr("required", n.required && i === 0)}></label>`;
      }).join("");
      if (inStep)
        return `<div class="rating" role="radiogroup" aria-label="${esc(n.label ?? n.name)}">${items}</div>${hintOf(n, id)}`;
      return `<fieldset class="chat-components-group" data-field="${esc(n.name)}"><legend class="label">${esc(n.label ?? n.name)}</legend><div class="rating" role="radiogroup" aria-label="${esc(n.label ?? n.name)}">${items}</div>${hintOf(n, id)}</fieldset>`;
    }
    default:
      return "";
  }
}
function contentMarkup(n, prefix) {
  switch (n.type) {
    case "text":
      return `<p class="chat-components-text">${n.title ? `<strong>${esc(n.title)}</strong> ` : ""}${inline(n.text ?? "")}</p>`;
    case "list": {
      const tag = n.ordered ? "ol" : "ul";
      return `<${tag} class="chat-components-list">${n.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${tag}>`;
    }
    case "table":
      return `<div class="table-container"><table class="table">${n.label ? `<caption class="table-caption">${esc(n.label)}</caption>` : ""}<thead><tr class="table-row">${n.columns.map((c) => `<th class="table-head">${esc(c)}</th>`).join("")}</tr></thead><tbody>${n.rows.map((r) => `<tr class="table-row">${r.map((c) => `<td class="table-cell"${typeof c === "number" ? " data-numeric" : ""}>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    case "facts":
      return `<dl class="chat-components-facts">${n.facts.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join("")}</dl>`;
    case "plan": {
      const rows = n.steps.map((s, i) => {
        const text = `<span class="chat-components-plan-title">${inline(s.title)}</span>${s.description ? `<span class="chat-components-plan-description">${inline(s.description)}</span>` : ""}`;
        if (!n.name)
          return `<li>${text}</li>`;
        const cid = `${prefix}-${n.name}-${i}`;
        const value = s.id ?? String(i + 1);
        const on = Array.isArray(n.default) ? n.default.includes(value) : true;
        return `<li><input class="checkbox" type="checkbox" name="${esc(n.name)}" id="${cid}" value="${esc(value)}"${attr("checked", on)}><label for="${cid}">${text}</label></li>`;
      });
      return `<ol class="chat-components-plan"${n.name ? ` data-field="${esc(n.name)}" data-checkable` : ""}${n.label ? ` aria-label="${esc(n.label)}"` : ""}>${rows.join("")}</ol>`;
    }
    case "alert":
      return `<div class="alert"${n.tone === "destructive" ? ' data-variant="destructive"' : ""}><div class="alert-content">${n.title ? `<h5 class="alert-title">${esc(n.title)}</h5>` : ""}${n.text ? `<p class="alert-description">${inline(n.text)}</p>` : ""}</div></div>`;
    case "divider":
      return '<hr class="separator">';
    default:
      return "";
  }
}
function questionnaireMarkup(n, prefix, submitLabel) {
  const q = `${prefix}-q`;
  const steps = n.steps.map((s) => {
    const fields = (s.fields ?? []).map((f) => f.type === "text" ? contentMarkup(f, q) : fieldMarkup(f, q, true)).join("");
    return `<fieldset class="questionnaire-step" data-step="${esc(s.id)}"${attr("data-next", s.next)}${attr("data-optional", !!s.optional)}><legend class="questionnaire-title">${esc(s.title)}</legend>${s.description ? `<p class="questionnaire-description">${inline(s.description)}</p>` : ""}${fields}</fieldset>`;
  }).join("");
  const validate = {};
  for (const s of n.steps)
    for (const f of s.fields ?? [])
      if (f.type === "currency" && f.required)
        (validate[s.id] ??= []).push({
          assert: [{ field: f.name, op: "answered" }],
          message: "Enter an amount.",
          field: f.name
        });
  const rules = { branches: n.branches ?? {}, validate };
  return `<form class="questionnaire chat-components-questionnaire" id="${q}" aria-label="${esc(n.title ?? "Questions")}" data-persist="none"${attr("data-auto-advance", !!n.autoAdvance)}><div class="questionnaire-progress"></div>${steps}<fieldset class="questionnaire-step" data-step="review" data-end><legend class="questionnaire-title">${esc(n.review ?? "Check your answers")}</legend><div class="questionnaire-summary"></div></fieldset><div class="questionnaire-actions"><button class="btn" data-variant="ghost" type="button" data-questionnaire="back">Back</button><button class="btn" data-variant="outline" type="submit" data-questionnaire="skip">Skip</button><button class="btn" type="submit" data-questionnaire="next">Continue</button><button class="btn" type="submit" data-questionnaire="submit">${esc(submitLabel)}</button></div><script type="application/json" class="questionnaire-rules">${scriptJson(rules)}</script></form>`;
}
function cardMarkup(spec, prefix) {
  const body = spec.body ?? [];
  const q = body.find((n) => n.type === "questionnaire");
  const actions = actionsOf(spec);
  const submit = actions.find((a) => a.submit);
  const header = spec.title || spec.description ? `<div class="card-header">${spec.title ? `<h3 class="card-title">${esc(spec.title)}</h3>` : ""}${spec.description ? `<p class="card-description">${inline(spec.description)}</p>` : ""}</div>` : "";
  const content = body.map((n) => n.type === "questionnaire" ? questionnaireMarkup(n, prefix, submit?.label ?? "Send") : isField(n) && n.type !== "plan" ? fieldMarkup(n, prefix) : contentMarkup(n, prefix)).join("");
  const shown = q ? actions.filter((a) => !a.submit) : actions;
  const buttons = shown.map((a) => `<button class="btn" type="${a.submit ? "submit" : "button"}" data-chat-action="${esc(a.id)}"${a.variant && a.variant !== "default" ? ` data-variant="${esc(a.variant)}"` : ""}>${esc(a.label)}</button>`).join("");
  const footer = buttons ? `<div class="card-footer chat-components-actions">${buttons}</div>` : "";
  const answers = `<dl class="chat-components-facts chat-components-answers" hidden></dl>`;
  const tag = q ? "div" : "form";
  return `<${tag} class="card chat-components-card" data-size="sm"${spec.title ? ` aria-labelledby="${prefix}-title"` : ""}>${header.replace('class="card-title"', `class="card-title" id="${prefix}-title"`)}<div class="card-content chat-components-content">${content}${answers}</div>${footer}</${tag}>`;
}
function markup(spec, { id = "", answers = null } = {}) {
  const ident = id || `cc-${Math.random().toString(36).slice(2, 8)}`;
  const label = typeof spec?.title === "string" ? ` aria-label="${esc(spec.title)}"` : "";
  const answered = answers ? `<script type="application/json" class="chat-components-answers">${scriptJson(answers)}</script>` : "";
  return `<div class="chat-components" id="${esc(ident)}"${label}><script type="application/json" class="chat-components-schema">${scriptJson(spec)}</script>${answered}</div>`;
}
function fieldsOf(spec) {
  const out = new Map;
  const walk = (list) => {
    for (const n of list ?? []) {
      if (n?.type === "questionnaire")
        for (const s of n.steps ?? [])
          walk(s.fields);
      else if (isField(n))
        out.set(n.name, n);
    }
  };
  walk(spec?.body);
  return out;
}
var toNumber = (v) => v === "" || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v);
function typed(n, v) {
  if (v === undefined)
    return null;
  switch (n.type) {
    case "number":
    case "currency":
    case "slider":
    case "rating":
      return Array.isArray(v) ? null : toNumber(v);
    case "switch":
      return v === true || v === "on" || v === "true";
    case "checkbox":
      if (!n.options)
        return v === true || v === "on" || v === "true";
      return Array.isArray(v) ? v.map(String) : v ? [String(v)] : [];
    case "plan":
      return Array.isArray(v) ? v.map(String) : v ? [String(v)] : [];
    default:
      return v === "" || v === null ? null : Array.isArray(v) ? v.map(String) : String(v);
  }
}
function readAnswers(root) {
  const spec = root._spec;
  const out = {};
  const body = root._body;
  const controls = (name) => dfDollar2(body).find(`[name="${CSS.escape(name)}"]`).toArray();
  for (const [name, n] of fieldsOf(spec)) {
    const list = controls(name);
    if (!list.length)
      continue;
    let v;
    const first = list[0];
    if (first.type === "radio")
      v = list.find((c) => c.checked)?.value ?? null;
    else if (first.type === "checkbox")
      v = n.options || n.type === "plan" ? list.filter((c) => c.checked).map((c) => c.value) : first.checked;
    else
      v = first.value;
    out[name] = typed(n, v);
    if (n.other) {
      const text = controls(`${name}Other`)[0]?.value ?? "";
      const picked = Array.isArray(out[name]) ? out[name].includes("other") : out[name] === "other";
      if (picked)
        out[`${name}Other`] = text || null;
    }
  }
  return out;
}
function writeAnswers(root, answers) {
  const body = root._body;
  for (const [name, n] of fieldsOf(root._spec)) {
    if (!(name in answers))
      continue;
    const v = answers[name];
    const list = dfDollar2(body).find(`[name="${CSS.escape(name)}"]`).toArray();
    for (const c of list) {
      if (c.type === "radio")
        c.checked = String(v) === c.value;
      else if (c.type === "checkbox")
        c.checked = Array.isArray(v) ? v.includes(c.value) : v === true;
      else if (n.type === "currency") {
        const wrapper = c.closest(".number-input");
        if (wrapper?.api)
          wrapper.api.setState("default", { value: v });
        else
          c.value = v == null ? "" : String(v);
      } else if (String(c.value) !== String(v ?? ""))
        c.value = v == null ? "" : String(v);
    }
    if (n.other && answers[`${name}Other`] != null) {
      const other = dfDollar2(body).find(`[name="${CSS.escape(name + "Other")}"]`).get(0);
      if (other)
        other.value = String(answers[`${name}Other`]);
    }
    if (n.type === "slider")
      dfDollar2(body).find(`input[name="${CSS.escape(name)}"]`).get(0)?.dispatchEvent(new Event("input", { bubbles: true }));
  }
}
function answerText(n, v, answers) {
  if (v === null || v === undefined || Array.isArray(v) && !v.length)
    return "-";
  const label = (x) => x === "other" && n.other ? answers[`${n.name}Other`] || n.other : n.type === "plan" ? n.steps.find((s, i) => (s.id ?? String(i + 1)) === x)?.title ?? x : optionsOf(n).find((o) => o.value === x)?.label ?? x;
  switch (n.type) {
    case "currency":
      try {
        return new Intl.NumberFormat(n.locale || undefined, { style: "currency", currency: n.currency }).format(v);
      } catch {
        return `${v} ${n.currency}`;
      }
    case "switch":
      return v ? "Yes" : "No";
    case "checkbox":
      return n.options ? v.map(label).join(", ") : v ? "Yes" : "No";
    case "rating":
      return `${v} of ${Number(n.max) || 5}`;
    case "number":
    case "slider":
      return `${v}${n.unit ? ` ${n.unit}` : ""}`;
    case "select":
    case "radio":
      return label(v);
    case "plan":
      return v.map(label).join(", ");
    default:
      return String(v);
  }
}
function summary(spec, answers, action = "") {
  const fields = fieldsOf(spec);
  const parts = [];
  for (const [name, n] of fields) {
    if (!(name in answers))
      continue;
    parts.push(`${n.label ?? name}: ${answerText(n, answers[name], answers)}`);
  }
  const act = actionsOf(spec ?? {}).find((a) => a.id === action);
  if (!parts.length)
    return act?.reply ?? act?.label ?? action;
  return parts.join("; ");
}
function answersMarkup(spec, answers) {
  const rows = [];
  for (const [name, n] of fieldsOf(spec))
    if (name in answers)
      rows.push(`<div><dt>${esc(n.label ?? name)}</dt><dd>${esc(answerText(n, answers[name], answers))}</dd></div>`);
  return rows.join("");
}
var chatComponentsStates = ["default", "answered", "cancelled"];
function applyMarkup2(root, name) {
  dfDollar2(root).attr("data-answered", name === "default" ? null : name);
}
function triggerStateChange2(root, name, config = {}) {
  applyMarkup2(root, name);
  const body = root._body;
  if (!body || root._invalid)
    return;
  const open = name === "default";
  if (name === "answered" && config.answers)
    writeAnswers(root, config.answers);
  for (const c of dfDollar2(body).find("input, select, textarea, button").toArray()) {
    if (c.closest(".questionnaire-actions") && !open)
      continue;
    c.disabled = !open && !c.matches("[data-chat-action]");
  }
  for (const b of dfDollar2(body).find("[data-chat-action]").toArray()) {
    const chosen = !open && b.dataset.chatAction === config.action;
    b.toggleAttribute("data-chosen", chosen);
    b.disabled = !open;
    if (chosen)
      b.setAttribute("aria-pressed", "true");
    else
      b.removeAttribute("aria-pressed");
  }
  const q = dfDollar2(body).find(".chat-components-questionnaire").get(0);
  const list = dfDollar2(body).find(".chat-components-answers").get(0);
  if (q)
    q.hidden = !open;
  if (list) {
    const rows = name === "answered" && q ? answersMarkup(root._spec, config.answers ?? {}) : "";
    dfDollar2(list).html(rows);
    list.hidden = !rows;
  }
}
var chatComponentsApi = componentState2({
  component: "chat-components",
  states: chatComponentsStates,
  apply: (root, state) => triggerStateChange2(root, state.name, state.config),
  markup: (root, state) => applyMarkup2(root, state.name)
});
df$2.chatComponentsApi = chatComponentsApi;
df$2.chatComponentsStates = chatComponentsStates;
function scriptOf(root, cls) {
  const s = dfDollar2(root).children(`script.${cls}`).get(0);
  if (!s)
    return;
  try {
    return JSON.parse(s.textContent || "null");
  } catch (error) {
    return { __parseError: String(error.message ?? error) };
  }
}
function finish(root, action, answers) {
  const spec = root._spec;
  const result = action.cancel ? { action: action.id } : { action: action.id, answers };
  root.api.setState(action.cancel ? "cancelled" : "answered", result);
  const detail = {
    id: spec.id ?? "",
    action: action.id,
    answers: action.cancel ? {} : answers,
    reply: action.reply ?? null,
    summary: action.cancel || action.reply ? action.reply ?? action.label : summary(spec, answers, action.id)
  };
  root.dispatchEvent(new CustomEvent("chat-components-answer", { bubbles: true, detail }));
}
function build(root) {
  const spec = scriptOf(root, "chat-components-schema");
  root._spec = spec && !spec.__parseError ? spec : null;
  const problems = spec?.__parseError ? [{ path: "", message: `the JSON does not parse: ${spec.__parseError}`, level: "error" }] : validate(spec);
  root._problems = problems;
  const errors = problems.filter((p) => p.level === "error");
  root._invalid = errors.length > 0;
  root.toggleAttribute("data-invalid", root._invalid);
  let body = dfDollar2(root).children(".chat-components-body").get(0);
  if (!body) {
    body = document.createElement("div");
    body.className = "chat-components-body";
    root.append(body);
  }
  root._body = body;
  if (root._invalid) {
    dfDollar2(body).html(`<div class="alert" data-variant="destructive" role="alert"><div class="alert-content"><h5 class="alert-title">This card cannot be shown</h5><p class="alert-description">${errors.slice(0, 4).map((e) => esc(`${e.path || "document"}: ${e.message}`)).join("<br>")}</p></div></div>`);
    return;
  }
  root._uid ??= root.id || `cc-${Math.random().toString(36).slice(2, 8)}`;
  dfDollar2(body).html(cardMarkup(spec, root._uid));
}
function init2() {
  dfDollar2(".chat-components:not([data-init])").each((_i, root) => {
    dfDollar2(root).data("init", "");
    build(root);
    const answered = scriptOf(root, "chat-components-answers");
    const start = answered && !answered.__parseError ? { name: answered.answers || !answered.action ? "answered" : "cancelled", config: answered } : { name: "default", config: {} };
    if (start.name !== "default")
      triggerStateChange2(root, start.name, start.config);
    bindComponent2(root, chatComponentsApi, start);
    dfDollar2(root).on("submit", (e) => {
      const form = e.target.closest("form");
      if (!form?.classList.contains("chat-components-card"))
        return;
      e.preventDefault();
      const id = e.submitter?.dataset.chatAction;
      const action = actionsOf(root._spec).find((a) => a.id === id) ?? actionsOf(root._spec).find((a) => a.submit);
      if (action)
        finish(root, action, readAnswers(root));
    });
    dfDollar2(root).on("click", (e) => {
      const b = e.target.closest?.("button[data-chat-action]");
      if (!b || b.type === "submit" || !root.contains(b))
        return;
      const action = actionsOf(root._spec).find((a) => a.id === b.dataset.chatAction);
      if (action)
        finish(root, action, action.cancel || action.reply ? {} : readAnswers(root));
    });
    dfDollar2(root).on("questionnaire-submit", (e) => {
      const action = actionsOf(root._spec).find((a) => a.submit) ?? { id: "submit", label: "Send", submit: true };
      const raw = e.detail?.answers ?? {};
      const answers = {};
      for (const [name, n] of fieldsOf(root._spec)) {
        if (name in raw)
          answers[name] = typed(n, raw[name]);
        if (n.other && raw[`${name}Other`])
          answers[`${name}Other`] = String(raw[`${name}Other`]);
      }
      finish(root, action, answers);
    });
    dfDollar2(root).on("input", (e) => {
      const t = e.target;
      if (t.classList?.contains("chat-components-other") && t.value) {
        const choice = dfDollar2(t).closest("[data-other]").find('input[value="other"]').get(0);
        if (choice)
          choice.checked = true;
      }
    });
  });
}
var resolve2 = (target) => typeof target === "string" ? dfDollar2(target).get(0) : target;
function jsonSchema() {
  const str = { type: "string" };
  const option = {
    anyOf: [
      str,
      {
        type: "object",
        required: ["value"],
        properties: { value: str, label: str, description: str, goto: str }
      }
    ]
  };
  const node = {
    type: "object",
    required: ["type"],
    properties: {
      type: { enum: NODE_TYPES },
      name: { type: "string", pattern: NAME_RE.source },
      label: str,
      hint: str,
      text: str,
      title: str,
      tone: { enum: ["default", "destructive"] },
      items: { type: "array", items: str },
      ordered: { type: "boolean" },
      columns: { type: "array", items: str },
      rows: { type: "array", items: { type: "array", items: { type: ["string", "number"] } } },
      facts: {
        type: "array",
        items: {
          type: "object",
          required: ["label", "value"],
          properties: { label: str, value: { type: ["string", "number"] } }
        }
      },
      steps: {
        type: "array",
        items: {
          type: "object",
          required: ["title"],
          properties: {
            id: str,
            title: str,
            description: str,
            fields: { type: "array", items: { $ref: "#/$defs/node" } },
            optional: { type: "boolean" },
            next: str
          }
        }
      },
      required: { type: "boolean" },
      default: { type: ["string", "number", "boolean", "array", "null"] },
      placeholder: str,
      inputType: { enum: ["text", "email", "url", "tel", "time"] },
      min: { type: ["number", "string"] },
      max: { type: ["number", "string"] },
      step: { type: "number" },
      unit: str,
      currency: { type: "string", pattern: "^[A-Z]{3}$" },
      locale: str,
      minLength: { type: "integer" },
      maxLength: { type: "integer" },
      pattern: str,
      lines: { type: "integer" },
      options: { type: "array", items: option },
      other: str,
      branches: {
        type: "object",
        additionalProperties: {
          type: "array",
          items: { type: "object", required: ["when", "goto"], properties: { when: {}, goto: str } }
        }
      },
      autoAdvance: { type: "boolean" },
      review: str
    }
  };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "Component Schema",
    description: "A card a chat shows with the system components: content (text, list, table, facts, plan, alert, divider), fields (input, textarea, number, currency, select, radio, checkbox, switch, slider, rating, date) or one multi-step questionnaire, and actions or quick replies. Every text is plain text with inline **bold**, *emphasis* and `code`.",
    type: "object",
    required: ["version"],
    properties: {
      schema: { const: "component-schema" },
      version: { const: 1 },
      id: str,
      title: str,
      description: str,
      body: { type: "array", items: { $ref: "#/$defs/node" } },
      actions: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "label"],
          properties: {
            id: str,
            label: str,
            variant: { enum: ["default", "secondary", "outline", "ghost", "destructive"] },
            submit: { type: "boolean" },
            reply: str,
            cancel: { type: "boolean" }
          }
        }
      }
    },
    $defs: { node }
  };
}
function fences(markdown) {
  const out = [];
  const re = /^([ \t]*)(`{3,}|~{3,})[ \t]*ui::component-schema[ \t]*$/gm;
  let m;
  while (m = re.exec(markdown)) {
    const start = m.index;
    const fence = m[2];
    const from = m.index + m[0].length + 1;
    const close = new RegExp(`^[ \\t]*${fence[0] === "`" ? "`" : "~"}{${fence.length},}[ \\t]*$`, "m");
    const rest = markdown.slice(from);
    const c = close.exec(rest);
    const source = c ? rest.slice(0, c.index) : rest;
    const end = c ? from + c.index + c[0].length : markdown.length;
    let spec = null;
    let error = "";
    if (c)
      try {
        spec = JSON.parse(source);
      } catch (e) {
        error = String(e.message ?? e);
      }
    out.push({
      start,
      end: Math.min(end + (markdown[end] === `
` ? 1 : 0), markdown.length),
      source,
      spec,
      closed: !!c,
      error
    });
    re.lastIndex = end;
  }
  return out;
}
df$2.chatComponents = {
  fence: FENCE,
  validate: (spec) => validate(spec),
  markup: (spec, options) => markup(spec, options ?? {}),
  mount(target, spec) {
    const root = resolve2(target);
    const script = dfDollar2(root).children("script.chat-components-schema").get(0);
    if (script)
      dfDollar2(script).text(JSON.stringify(spec));
    build(root);
    root.api?.setState("default", {});
  },
  answers: (target) => readAnswers(resolve2(target)),
  summary: (spec, answers, action) => summary(spec, answers ?? {}, action ?? ""),
  jsonSchema: () => jsonSchema(),
  tool: (name) => ({
    type: "function",
    function: {
      name: name || "show_components",
      description: "Show the user a card in the chat: content, fields to answer (text, numbers, money, choices, dates, ratings), a multi-step questionnaire, or buttons and quick replies. The answers come back as the next user message.",
      parameters: jsonSchema()
    }
  }),
  fences: (markdown) => fences(String(markdown ?? ""))
};
var fill = (text, answers) => String(text ?? "").replace(/\{\{\s*([\w-]+)\s*\}\}/g, (_m, k) => answers[k] == null ? "" : Array.isArray(answers[k]) ? answers[k].join(", ") : String(answers[k]));
var wait = (ms) => new Promise((r) => setTimeout(r, ms));
var reducedMotion = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
function testWhen(when, answers) {
  const q = df$2.questionnaire;
  if (!q?.test)
    throw new Error("chat-script: branches need the Questionnaire (df$.shadcn.questionnaire.test)");
  return q.test(when, answers);
}
function createRun(script, hooks = {}, saved, delay = true) {
  const st = saved ? structuredClone(saved) : { node: script.start, answers: {}, history: [], waiting: "busy", rows: 0, marks: [] };
  const emit = (fn, ...args) => {
    if (fn === "say" || fn === "ask" || fn === "user")
      st.rows++;
    hooks[fn]?.(...args);
  };
  const pause = async (text) => {
    if (!delay || reducedMotion())
      return;
    emit("typing", true);
    await wait(Math.min(1400, 350 + String(text).length * 12));
    emit("typing", false);
  };
  const nextOf = (node) => {
    for (const b of node.branches ?? [])
      if (testWhen(b.when, st.answers))
        return b.goto;
    return node.next ?? null;
  };
  async function enter(id) {
    const node = id ? script.nodes[id] : null;
    if (!id || !node) {
      st.waiting = "end";
      emit("end", { ...st.answers }, [...st.history]);
      return;
    }
    st.node = id;
    st.history.push(id);
    st.marks.push({ rows: st.rows, answers: { ...st.answers } });
    st.waiting = "busy";
    emit("step", id, { ...st.answers });
    const lines = node.say === undefined ? [] : Array.isArray(node.say) ? node.say : [node.say];
    for (const line of lines) {
      await pause(line);
      emit("say", fill(line, st.answers), id);
    }
    if (node.ask) {
      await pause("");
      emit("ask", node.ask, id);
      st.waiting = "components";
    } else if (node.input)
      st.waiting = "text";
    else if (node.end) {
      st.waiting = "end";
      emit("end", { ...st.answers }, [...st.history]);
    } else
      await enter(nextOf(node));
  }
  const routed = (node, text) => node.match?.find((m) => m.pattern === undefined ? true : new RegExp(m.pattern, "i").test(text))?.goto ?? null;
  const run = {
    start: async () => {
      if (saved && st.history.length)
        return;
      await enter(script.start);
    },
    reply: async (text) => {
      const node = script.nodes[st.node];
      const value = String(text ?? "").trim();
      if (!value || !node || st.waiting === "busy" || st.waiting === "end")
        return;
      emit("user", value, st.node);
      const route = routed(node, value);
      if (st.waiting === "text") {
        st.answers[node.input] = value;
        await enter(route ?? nextOf(node));
      } else if (route)
        await enter(route);
      else {
        await pause("");
        emit("say", script.fallback ?? "Please answer with the card above.", st.node);
      }
    },
    answer: async (detail) => {
      const node = script.nodes[st.node];
      if (!node || st.waiting !== "components")
        return;
      emit("user", detail.summary, st.node);
      Object.assign(st.answers, detail.answers ?? {});
      st.answers[node.ask?.id || st.node] = detail.action;
      await enter(nextOf(node));
    },
    back: async () => {
      if (st.waiting === "busy")
        return false;
      const asks = (id) => !!(script.nodes[id]?.ask || script.nodes[id]?.input);
      let i = st.history.length - 1;
      if (st.waiting !== "end")
        i--;
      while (i >= 0 && !asks(st.history[i]))
        i--;
      if (i < 0)
        return false;
      const id = st.history[i];
      const mark = st.marks[i];
      st.history = st.history.slice(0, i);
      st.marks = st.marks.slice(0, i);
      st.answers = { ...mark.answers };
      st.rows = mark.rows;
      hooks.rewind?.(mark.rows);
      await enter(id);
      return true;
    },
    restart: async () => {
      st.answers = {};
      st.history = [];
      st.marks = [];
      st.rows = 0;
      hooks.rewind?.(0);
      await enter(script.start);
    },
    state: () => structuredClone(st)
  };
  return run;
}
function botRow(html, bot, row = true) {
  return `<div class="message${row ? " chat-script-row" : ""}"><div class="message-avatar"><span class="avatar" data-size="sm"><span class="avatar-fallback">${esc(bot.initials ?? "B")}</span></span></div><div class="message-content">${html}</div></div>`;
}
var bubble = (text, variant = "secondary") => `<div class="bubble"${variant ? ` data-variant="${variant}"` : ""}><div class="bubble-content">${inline(text)}</div></div>`;
function runInSession(target, script, options = {}) {
  const session = resolve2(target);
  const S = df$2.session;
  const bot = { name: "Bot", initials: "B", ...options.bot };
  const log = [];
  const stored = options.persist ? persisted(options.persist, null, {
    validate: (v) => v === null || typeof v === "object" && Array.isArray(v.log)
  }) : null;
  const save = () => queueMicrotask(() => stored?.set({ log: structuredClone(log), state: run.state() }));
  let typingRow = null;
  let cards = 0;
  const write = (entry) => {
    let html = "";
    if (entry.kind === "say")
      html = botRow(bubble(entry.text), bot);
    else if (entry.kind === "user")
      html = `<div class="message chat-script-row" data-align="end"><div class="message-content">${bubble(entry.text, "")}</div></div>`;
    else if (entry.kind === "ask")
      html = botRow(markup(entry.spec, { id: `${session.id || "chat"}-card-${++cards}`, answers: entry.result ?? null }), bot);
    const item = S.append(session, html);
    const row = dfDollar2(item).find(".chat-script-row").get(0) ?? item;
    row._chatScript = entry;
    return row;
  };
  const rows = () => dfDollar2(session).find(".chat-script-row").toArray();
  const hooks = {
    say: (text, node) => {
      const e = { kind: "say", text, node };
      log.push(e);
      write(e);
      save();
    },
    user: (text, node) => {
      const e = { kind: "user", text, node };
      log.push(e);
      write(e);
      save();
    },
    ask: (spec, node) => {
      const e = { kind: "ask", spec, node };
      log.push(e);
      write(e);
      save();
    },
    typing: (on) => {
      if (on && !typingRow)
        typingRow = S.append(session, botRow(`<div class="bubble" data-variant="secondary"><div class="bubble-content" role="status" aria-label="${esc(bot.name)} is typing"><span class="bubble-typing" aria-hidden="true"><span></span><span></span><span></span></span></div></div>`, bot, false));
      else if (!on && typingRow) {
        (typingRow.closest(".session-item") ?? typingRow).remove();
        typingRow = null;
      }
    },
    rewind: (n) => {
      log.length = n;
      rows().slice(n).forEach((r) => (r.closest(".session-item") ?? r).remove());
      save();
    },
    step: (node, answers) => options.on?.step?.(node, answers),
    end: (answers, history) => {
      save();
      options.on?.end?.(answers, history);
    }
  };
  const saved = stored?.value;
  if (saved?.log?.length) {
    log.push(...saved.log);
    for (const e of saved.log)
      write(e);
  }
  const run = createRun(script, hooks, saved?.state ?? null, options.delay !== false);
  const onAnswer = (e) => {
    const detail = e.detail;
    const card = e.target.closest(".chat-components");
    const entry = card?.closest(".chat-script-row")?._chatScript;
    if (!entry || entry !== [...log].reverse().find((x) => x.kind === "ask"))
      return;
    entry.result = card.api?.getState().config ?? null;
    run.answer(detail);
  };
  session.addEventListener("chat-components-answer", onAnswer);
  const composer = options.composer ? resolve2(options.composer) : null;
  if (composer) {
    const field = dfDollar2(composer).find('textarea, input[type="text"]').get(0);
    composer.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = field?.value ?? "";
      if (!text.trim())
        return;
      field.value = "";
      run.reply(text);
    });
    field?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        composer.requestSubmit?.();
      }
    });
  }
  run.start();
  return run;
}
df$2.chatScript = {
  create: (script, hooks, state) => createRun(script, hooks ?? {}, state ?? null),
  run: (target, script, options) => runInSession(target, script, options ?? {}),
  validate(script) {
    const out = [];
    const err = (path, message) => out.push({ path, message, level: "error" });
    if (!script || typeof script !== "object")
      return [{ path: "", message: "a script is an object", level: "error" }];
    const nodes = script.nodes ?? {};
    if (!nodes[script.start])
      err("start", `no node "${script.start}"`);
    for (const [id, n] of Object.entries(nodes)) {
      const p = `nodes.${id}`;
      for (const to of [n.next, ...(n.branches ?? []).map((b) => b.goto), ...(n.match ?? []).map((m) => m.goto)])
        if (to !== undefined && !nodes[to])
          err(p, `leads to "${to}", which does not exist`);
      if (!n.ask && !n.input && !n.end && !n.next && !n.branches?.length)
        err(p, "leads nowhere: next, branches or end");
      if (n.ask)
        for (const q of validate(n.ask))
          out.push({ ...q, path: `${p}.ask${q.path ? "." + q.path : ""}` });
      for (const [i, m] of (n.match ?? []).entries())
        if (m.pattern !== undefined)
          try {
            new RegExp(m.pattern, "i");
          } catch {
            err(`${p}.match[${i}].pattern`, "not a regular expression");
          }
    }
    return out;
  }
};
init2();
new MutationObserver(init2).observe(document, { childList: true, subtree: true });

//# debugId=2B56F24DDDB1FFC364756E2164756E21
//# sourceMappingURL=chat.js.map
