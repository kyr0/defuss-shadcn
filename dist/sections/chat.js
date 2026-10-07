// dist/components/session/session.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.9.7") {
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
function scrollToEnd(s, { smooth = true } = {}) {
  s.setAttribute("data-stick", "");
  scrollViewport(s, s._parts.viewport.scrollHeight, smooth);
}
function scrollToStart(s, { smooth = true } = {}) {
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
  s.dispatchEvent(new CustomEvent("session-visibility", { bubbles: true, detail: { currentAnchorId: currentId, visibleMessageIds: ids } }));
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

//# debugId=0452FD6FC2BC529164756E2164756E21
//# sourceMappingURL=chat.js.map
