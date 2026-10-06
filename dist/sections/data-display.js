// dist/components/avatar/avatar.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.9.5") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals, defussQuery, componentState, bindComponent } = __df$shared;
var df$ = defussGlobals();
var dfDollar = defussQuery();
var avatarStates = ["default", "error"];
function applyMarkup(el, stateName) {
  const img = dfDollar(el).find(".avatar-image");
  if (stateName === "error")
    img.attr("data-error", "").css("display", "none");
  else
    img.attr("data-error", null).css("display", "");
}
function triggerStateChange(wrapper, stateName, _config) {
  const img = dfDollar(wrapper).find(".avatar-image").get(0);
  if (!img)
    return;
  switch (stateName) {
    case "default":
      img.removeAttribute("data-error");
      img.style.display = "";
      break;
    case "error":
      img.setAttribute("data-error", "");
      img.style.display = "none";
      break;
  }
}
var avatarApi = componentState({
  component: "avatar",
  states: avatarStates,
  apply: (wrapper, state) => triggerStateChange(wrapper, state.name, state.config),
  read: (wrapper, state) => {
    const img = dfDollar(wrapper).find(".avatar-image").get(0);
    const errored = img ? img.hasAttribute("data-error") : true;
    return {
      name: errored ? "error" : "default",
      config: state.config
    };
  },
  markup: (el, state) => applyMarkup(el, state.name)
});
df$.avatarApi = avatarApi;
df$.avatarStates = avatarStates;
function init() {
  dfDollar(".avatar:not([data-init])").toArray().forEach((wrapper) => {
    wrapper.dataset.init = "";
    bindComponent(wrapper, avatarApi);
    const img = dfDollar(wrapper).find(".avatar-image").get(0);
    if (!img)
      return;
    img.dataset.init = "";
    if (img.complete && img.naturalWidth === 0)
      applyError();
    img.addEventListener("error", applyError);
    function applyError() {
      img.setAttribute("data-error", "");
      img.style.display = "none";
      wrapper.dataset.stateName = "error";
    }
  });
}
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

// dist/components/diff/diff.js
var __df$core2 = globalThis.df$;
var __df$shared2 = __df$core2 && __df$core2.shadcn && __df$core2.shadcn.shared;
if (!__df$shared2 || __df$shared2.abi !== "0.9.5") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals2, defussQuery: defussQuery2, componentState: componentState2, bindComponent: bindComponent2 } = __df$shared2;
var df$2 = defussGlobals2();
var dfDollar2 = defussQuery2();
var diffStates = ["default", "before", "after"];
var rangeOf = (el) => dfDollar2(el).find(":scope > .diff-range").get(0);
function paint(el) {
  const range = rangeOf(el);
  if (!range)
    return;
  const min = parseFloat(range.min || "0");
  const max = parseFloat(range.max || "100");
  const pct = max === min ? 50 : (parseFloat(range.value) - min) / (max - min) * 100;
  el.style.setProperty("--diff-pos", `${pct}%`);
  el.dataset.stateName = pct >= 100 ? "before" : pct <= 0 ? "after" : "default";
}
function setPosition(el, pct) {
  const range = rangeOf(el);
  if (!range)
    return;
  const min = parseFloat(range.min || "0");
  const max = parseFloat(range.max || "100");
  const value = min + Math.min(100, Math.max(0, pct)) / 100 * (max - min);
  range.value = String(value);
  paint(el);
  range.dispatchEvent(new Event("input", { bubbles: true }));
}
function pointerPct(el, e) {
  const r = el.getBoundingClientRect();
  if (el.dataset.orientation === "vertical")
    return (e.clientY - r.top) / r.height * 100;
  const x = (e.clientX - r.left) / r.width * 100;
  return getComputedStyle(el).direction === "rtl" ? 100 - x : x;
}
function applyMarkup2(el, stateName) {
  const pct = stateName === "before" ? 100 : stateName === "after" ? 0 : null;
  if (pct !== null)
    dfDollar2(el).css("--diff-pos", pct + "%");
}
function triggerStateChange2(el, stateName, config) {
  switch (stateName) {
    case "default":
      setPosition(el, config?.position ?? el._defaultPosition ?? 50);
      break;
    case "before":
      setPosition(el, 100);
      break;
    case "after":
      setPosition(el, 0);
      break;
  }
}
var diffApi = componentState2({
  component: "diff",
  states: diffStates,
  apply: (el, state) => triggerStateChange2(el, state.name, state.config),
  read: (el, state) => {
    const pct = parseFloat(el.style.getPropertyValue("--diff-pos")) || 0;
    const name = pct >= 100 ? "before" : pct <= 0 ? "after" : "default";
    return { name, config: { ...state.config, position: Math.round(pct * 100) / 100 } };
  },
  markup: (el, state) => applyMarkup2(el, state.name)
});
df$2.diffApi = diffApi;
df$2.diffStates = diffStates;
function init2() {
  dfDollar2(".diff:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    const range = rangeOf(el);
    if (!range)
      return;
    paint(el);
    el._defaultPosition = parseFloat(el.style.getPropertyValue("--diff-pos")) || 50;
    bindComponent2(el, diffApi);
    range.addEventListener("input", () => paint(el));
    range.addEventListener("keydown", (e) => {
      const big = e.shiftKey ? 10 : 1;
      const deltas = { ArrowRight: big, ArrowUp: big, ArrowLeft: -big, ArrowDown: -big, PageUp: 10, PageDown: -10 };
      let d = deltas[e.key];
      if (d === undefined)
        return;
      e.preventDefault();
      const pct = parseFloat(el.style.getPropertyValue("--diff-pos")) || 0;
      if (el.dataset.orientation === "vertical" && (e.key === "ArrowUp" || e.key === "ArrowDown"))
        d = -d;
      if (el.dataset.orientation !== "vertical" && getComputedStyle(el).direction === "rtl" && e.key.startsWith("Arrow"))
        d = -d;
      setPosition(el, pct + d);
    });
    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target === range)
        return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      el.dataset.dragging = "";
      setPosition(el, pointerPct(el, e));
      range.focus({ preventScroll: true });
    });
    el.addEventListener("pointermove", (e) => {
      if (el.hasPointerCapture(e.pointerId) || el.dataset.follow === "hover" && e.pointerType === "mouse") {
        setPosition(el, pointerPct(el, e));
      }
    });
    const end = (e) => {
      if (el.hasPointerCapture(e.pointerId))
        el.releasePointerCapture(e.pointerId);
      delete el.dataset.dragging;
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  });
}
init2();
new MutationObserver(init2).observe(document, { childList: true, subtree: true });

// dist/components/countdown/countdown.js
var __df$core3 = globalThis.df$;
var __df$shared3 = __df$core3 && __df$core3.shadcn && __df$core3.shadcn.shared;
if (!__df$shared3 || __df$shared3.abi !== "0.9.5") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals3, defussQuery: defussQuery3, componentState: componentState3, bindComponent: bindComponent3 } = __df$shared3;
var df$3 = defussGlobals3();
var dfDollar3 = defussQuery3();
var countdownStates = ["default", "running", "paused", "finished"];
var UNITS = [
  ["days", 86400],
  ["hours", 3600],
  ["minutes", 60],
  ["seconds", 1]
];
var isTimer = (el) => el.hasAttribute("data-until") || el.hasAttribute("data-duration");
function writeValue(span, n) {
  const v = Math.max(0, Math.min(999, Math.round(n)));
  span.style.setProperty("--value", String(v));
  span.textContent = String(v);
}
var valuesOf = (el) => el.classList.contains("countdown") ? [...dfDollar3(el).find(":scope > span").toArray()] : [...dfDollar3(el).find(".countdown > span").toArray()];
function split(seconds, spans) {
  let rest = Math.max(0, Math.floor(seconds));
  const out = new Map;
  for (const [unit, size] of UNITS) {
    const span = spans.find((s) => s.dataset.unit === unit);
    if (!span)
      continue;
    const v = Math.floor(rest / size);
    out.set(span, v);
    rest -= v * size;
  }
  return out;
}
var fmt = (() => {
  const DF = Intl.DurationFormat;
  return DF ? new DF(undefined, { style: "long" }) : null;
})();
function label(el, parts) {
  if (el._authorLabel)
    return;
  const d = {};
  for (const [span, v] of parts)
    d[span.dataset.unit] = v;
  const text = fmt ? fmt.format(d) : Object.entries(d).map(([u, v]) => `${v} ${u}`).join(", ");
  el.setAttribute("aria-label", text || "0");
}
function remaining(el) {
  if (el._paused != null)
    return el._paused;
  return Math.max(0, (el._deadline - Date.now()) / 1000);
}
function paintTimer(el) {
  const left = remaining(el);
  const parts = split(Math.ceil(left - 0.001), valuesOf(el));
  for (const [span, v] of parts)
    writeValue(span, v);
  label(el, parts);
  if (left <= 0 && el.dataset.stateName !== "finished")
    finish(el);
}
function stop(el) {
  clearTimeout(el._tick);
  el._tick = 0;
}
function schedule(el) {
  stop(el);
  paintTimer(el);
  if (el.dataset.stateName !== "running")
    return;
  const ms = ((el._deadline - Date.now()) % 1000 + 1000) % 1000 || 1000;
  el._tick = setTimeout(() => schedule(el), ms + 5);
}
function finish(el) {
  stop(el);
  el._paused = 0;
  el.dataset.stateName = "finished";
  for (const [span, v] of split(0, valuesOf(el)))
    writeValue(span, v);
  el.dispatchEvent(new CustomEvent("countdown:finished", { bubbles: true }));
}
function authoredDeadline(el) {
  if (el.dataset.until)
    return Date.parse(el.dataset.until);
  return Date.now() + parseFloat(el.dataset.duration || "0") * 1000;
}
function applyMarkup3(el, stateName, config) {
  const spans = valuesOf(el);
  if (stateName === "finished") {
    for (const [span, v] of split(0, spans))
      writeValue(span, v);
    return;
  }
  if (isTimer(el) || stateName !== "default")
    return;
  if (config?.value !== undefined && spans[0])
    writeValue(spans[0], config.value);
  if (config?.values) {
    for (const span of spans)
      if (span.dataset.unit in config.values)
        writeValue(span, config.values[span.dataset.unit]);
  }
}
function triggerStateChange3(el, stateName, config) {
  if (!isTimer(el) && (stateName === "running" || stateName === "paused")) {
    el.dataset.stateName = stateName;
    return;
  }
  switch (stateName) {
    case "default":
      if (isTimer(el)) {
        el._deadline = authoredDeadline(el);
        el._paused = el.hasAttribute("data-paused") ? (el._deadline - Date.now()) / 1000 : null;
        el.dataset.stateName = el._paused != null ? "paused" : "running";
        schedule(el);
      } else {
        const spans = valuesOf(el);
        if (config?.value !== undefined && spans[0])
          writeValue(spans[0], config.value);
        if (config?.values) {
          for (const s of spans)
            if (s.dataset.unit in config.values)
              writeValue(s, config.values[s.dataset.unit]);
        }
        if (config?.value === undefined && !config?.values)
          el._authored?.forEach((v, s) => writeValue(s, v));
        el.dataset.stateName = "default";
      }
      break;
    case "running": {
      if (config?.until)
        el._deadline = Date.parse(config.until);
      else if (config?.duration != null)
        el._deadline = Date.now() + config.duration * 1000;
      else if (el._paused != null)
        el._deadline = Date.now() + el._paused * 1000;
      el._paused = null;
      el.dataset.stateName = "running";
      schedule(el);
      break;
    }
    case "paused":
      el._paused = remaining(el);
      el.dataset.stateName = "paused";
      stop(el);
      paintTimer(el);
      break;
    case "finished":
      finish(el);
      break;
  }
}
var countdownApi = componentState3({
  component: "countdown",
  states: countdownStates,
  apply: (el, state) => triggerStateChange3(el, state.name, state.config),
  read: (el, state) => {
    const values = {};
    valuesOf(el).forEach((s, i) => values[s.dataset.unit || i] = parseFloat(s.style.getPropertyValue("--value")) || 0);
    const config = { ...state.config, values };
    if (isTimer(el))
      config.remaining = Math.round(remaining(el));
    return { name: el.dataset.stateName || "default", config };
  },
  markup: (el, state) => applyMarkup3(el, state.name, state.config)
});
df$3.countdownApi = countdownApi;
df$3.countdownStates = countdownStates;
function init3() {
  dfDollar3(".countdown-group:not([data-init]), .countdown:not([data-init])").toArray().forEach((el) => {
    if (el.classList.contains("countdown") && !isTimer(el) && el.parentElement?.closest(".countdown-group[data-until], .countdown-group[data-duration]"))
      return;
    if (el.classList.contains("countdown-group") && !isTimer(el))
      return;
    el.dataset.init = "";
    bindComponent3(el, countdownApi);
    el._authored = new Map(valuesOf(el).map((s) => [s, parseFloat(s.style.getPropertyValue("--value")) || 0]));
    if (isTimer(el)) {
      el._authorLabel = el.hasAttribute("aria-label");
      if (!el.hasAttribute("role"))
        el.setAttribute("role", "timer");
      triggerStateChange3(el, "default", {});
    } else {
      el.dataset.stateName = "default";
    }
  });
}
init3();
new MutationObserver(init3).observe(document, { childList: true, subtree: true });

// dist/components/image/image.js
var __df$core4 = globalThis.df$;
var __df$shared4 = __df$core4 && __df$core4.shadcn && __df$core4.shadcn.shared;
if (!__df$shared4 || __df$shared4.abi !== "0.9.5") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals4, defussQuery: defussQuery4, componentState: componentState4, bindComponent: bindComponent4 } = __df$shared4;
var df$4 = defussGlobals4();
var dfDollar4 = defussQuery4();
var imageStates = ["default", "error"];
function applyMarkup4(el, stateName) {
  dfDollar4(el).find("img").first().attr("data-error", stateName === "error" ? "" : null);
}
function triggerStateChange4(figure, stateName, _config) {
  const img = dfDollar4(figure).find("img")[0];
  if (!img)
    return;
  switch (stateName) {
    case "default":
      dfDollar4(img).data("error", null);
      break;
    case "error":
      dfDollar4(img).data("error", "");
      break;
  }
}
var imageApi = componentState4({
  component: "image",
  states: imageStates,
  apply: (figure, state) => triggerStateChange4(figure, state.name, state.config),
  read: (figure, state) => {
    const img = dfDollar4(figure).find("img")[0];
    return {
      name: img && dfDollar4(img).data("error") !== undefined ? "error" : "default",
      config: state.config
    };
  },
  markup: (el, state) => applyMarkup4(el, state.name)
});
df$4.imageApi = imageApi;
df$4.imageStates = imageStates;
var galleryIO = typeof IntersectionObserver === "function" ? new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting)
      continue;
    galleryIO.unobserve(e.target);
    readyGallery(e.target);
  }
}, { rootMargin: "300px" }) : null;
function readyGallery(gallery) {
  const imgs = [...dfDollar4(gallery).find(":scope > img, :scope > picture img").toArray()];
  Promise.all(imgs.map((img) => (img.decode ? img.decode() : Promise.resolve()).catch(() => {
    return;
  }))).then(() => {
    gallery.dataset.ready = "";
  });
}
function initHoverGalleries() {
  dfDollar4(".hover-gallery:not([data-init])").toArray().forEach((gallery) => {
    gallery.dataset.init = "";
    dfDollar4(gallery).find(":scope > img, :scope > picture img").toArray().forEach((img, i) => {
      if (img.loading === "lazy")
        img.loading = "eager";
      if (i > 0 && !img.hasAttribute("fetchpriority"))
        img.fetchPriority = "low";
    });
    if (galleryIO)
      galleryIO.observe(gallery);
    else
      readyGallery(gallery);
  });
}
function init4() {
  initHoverGalleries();
  dfDollar4(".image:not([data-init])").toArray().forEach((figure) => {
    figure.dataset.init = "";
    bindComponent4(figure, imageApi);
    const img = dfDollar4(figure).find("img")[0];
    if (!img)
      return;
    if (img.complete && img.naturalWidth === 0) {
      dfDollar4(img).data("error", "");
    }
    img.addEventListener("error", () => {
      dfDollar4(img).data("error", "");
      figure.dataset.stateName = "error";
    });
    img.addEventListener("load", () => {
      dfDollar4(img).data("error", null);
      figure.dataset.stateName = "default";
    });
    const srcLow = img.dataset.srcLow;
    const srcHigh = img.dataset.srcHigh;
    if (srcLow || srcHigh) {
      const retina = !!srcHigh && globalThis.matchMedia("(min-resolution: 2dppx)").matches;
      const finalSrc = retina ? srcHigh : img.getAttribute("src");
      if (retina)
        img.dataset.srcHighLoaded = "";
      if (srcLow && finalSrc) {
        dfDollar4(img).data("loading", "");
        img.src = srcLow;
        const preload = new Image;
        preload.onload = preload.onerror = () => {
          img.src = finalSrc;
          dfDollar4(img).data("loading", null);
        };
        preload.src = finalSrc;
      } else if (retina) {
        img.src = srcHigh;
      }
    }
  });
}
init4();
new MutationObserver(init4).observe(document, { childList: true, subtree: true });
var lightbox = null;
var lightboxImg = null;
var lightboxFigure = null;
var zoom = 1;
var rotation = 0;
function getLightbox() {
  if (lightbox)
    return lightbox;
  lightbox = document.createElement("dialog");
  lightbox.className = "image-lightbox";
  lightbox.setAttribute("aria-label", "Image preview");
  dfDollar4(lightbox).html(`
    <div class="image-lightbox-content">
      <img src="" alt="" />
    </div>
    <div class="image-lightbox-toolbar">
      <button class="image-lightbox-btn" data-action="zoom-in" aria-label="Zoom in">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
      </button>
      <button class="image-lightbox-btn" data-action="zoom-out" aria-label="Zoom out">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
      </button>
      <button class="image-lightbox-btn" data-action="rotate-left" aria-label="Rotate left">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 2v6h6"/><path d="M2.66 15.57a10 10 0 1 0 .57-8.38"/></svg>
      </button>
      <button class="image-lightbox-btn" data-action="rotate-right" aria-label="Rotate right">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38"/></svg>
      </button>
      <button class="image-lightbox-btn" data-action="reset" aria-label="Reset">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
      </button>
      <button class="image-lightbox-btn" data-action="close" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`);
  lightboxImg = dfDollar4(lightbox).find(".image-lightbox-content > img")[0];
  dfDollar4(lightbox).find(".image-lightbox-toolbar")[0].addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn)
      return;
    const action = btn.dataset.action;
    if (action === "zoom-in") {
      zoom = Math.min(zoom + 0.25, 5);
      upgradeLightboxToHigh();
    } else if (action === "zoom-out")
      zoom = Math.max(zoom - 0.25, 0.25);
    else if (action === "rotate-left")
      rotation -= 90;
    else if (action === "rotate-right")
      rotation += 90;
    else if (action === "reset") {
      zoom = 1;
      rotation = 0;
    } else if (action === "close") {
      lightbox.close();
      return;
    }
    applyTransform();
  });
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox)
      lightbox.close();
  });
  dfDollar4(document.body).append(lightbox);
  return lightbox;
}
function upgradeLightboxToHigh() {
  if (!lightboxFigure)
    return;
  const img = dfDollar4(lightboxFigure).find("img")[0];
  if (img && img.dataset.srcFull)
    return;
  const srcHigh = img && img.dataset.srcHigh;
  if (!srcHigh || img.dataset.srcHighLoaded !== undefined)
    return;
  img.dataset.srcHighLoaded = "";
  img.src = srcHigh;
  if (lightboxImg)
    lightboxImg.src = srcHigh;
}
function applyTransform() {
  if (lightboxImg) {
    dfDollar4(lightboxImg).css("transform", `scale(${zoom}) rotate(${rotation}deg)`);
  }
}
function openLightbox(figure) {
  const lb = getLightbox();
  zoom = 1;
  rotation = 0;
  const img = dfDollar4(figure).find("img")[0];
  lightboxFigure = figure;
  const $img = dfDollar4(lightboxImg);
  $img.attr("src", img.src).attr("alt", img.alt || "").css("transform", null).css("width", null);
  const srcFull = img.dataset.srcFull;
  if (srcFull) {
    const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 0;
    if (ratio)
      $img.css("width", `min(90vw, calc(85vh * ${ratio.toFixed(4)}))`);
    const full = new Image;
    full.onload = () => {
      if (lightboxFigure !== figure || !lb.open)
        return;
      $img.attr("src", srcFull).css("width", null);
    };
    full.src = srcFull;
  }
  lb.showModal();
}
if (!document.__imagePreviewInit) {
  document.__imagePreviewInit = true;
  document.addEventListener("click", (e) => {
    const figure = e.target.closest(".image[data-preview]");
    if (!figure)
      return;
    const img = dfDollar4(figure).find("img")[0];
    if (!img || dfDollar4(img).data("error") !== undefined)
      return;
    openLightbox(figure);
  });
}

// dist/components/table/table.js
var __df$core5 = globalThis.df$;
var __df$shared5 = __df$core5 && __df$core5.shadcn && __df$core5.shadcn.shared;
if (!__df$shared5 || __df$shared5.abi !== "0.9.5") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals5, defussQuery: defussQuery5, componentState: componentState5, bindComponent: bindComponent5, textLocale } = __df$shared5;
var df$5 = defussGlobals5();
var dfDollar5 = defussQuery5();
var tableStates = ["default", "sorted", "selected"];
var bodyOf = (table) => table.tBodies[0];
var bodyRows = (table) => [...bodyOf(table)?.rows ?? []];
var rowBox = (row) => dfDollar5(row).find(':scope > .table-select input[type="checkbox"]').get(0);
var headBox = (table) => dfDollar5(table.tHead).find('.table-select input[type="checkbox"]').get(0);
function enhanceHead(table) {
  dfDollar5(table.tHead).find(".table-sort").each((_i, btn) => {
    const th = btn.closest("th");
    if (th && !th.hasAttribute("aria-sort"))
      th.setAttribute("aria-sort", "none");
  });
}
function cellValue(row, col) {
  const cell = row.cells[col];
  if (!cell)
    return "";
  return cell.dataset.sortValue ?? cell.textContent.trim();
}
function sortBy(table, col, direction) {
  const body = bodyOf(table);
  if (!body)
    return;
  const lang = textLocale(table);
  const collator = new Intl.Collator(lang, { numeric: true, sensitivity: "base" });
  const dir = direction === "descending" ? -1 : 1;
  const rows = bodyRows(table);
  rows.sort((a, b) => {
    const x = cellValue(a, col);
    const y = cellValue(b, col);
    const nx = Number(x);
    const ny = Number(y);
    const c = x !== "" && y !== "" && Number.isFinite(nx) && Number.isFinite(ny) ? nx - ny : collator.compare(x, y);
    return c * dir;
  });
  body.append(...rows);
  [...table.tHead?.rows[0]?.cells ?? []].forEach((th, i) => {
    if (dfDollar5(th).find(".table-sort").get(0))
      th.setAttribute("aria-sort", i === col ? direction : "none");
  });
  table._sort = { column: col, direction };
}
function unsort(table) {
  const body = bodyOf(table);
  if (body && table._original)
    body.append(...table._original.filter((r) => r.parentElement === body));
  dfDollar5(table.tHead).find("[aria-sort]").attr("aria-sort", "none");
  table._sort = null;
}
function syncSelection(table, announce = true) {
  const rows = bodyRows(table);
  const boxes = rows.map(rowBox).filter(Boolean);
  rows.forEach((row) => {
    const box = rowBox(row);
    if (box)
      row.setAttribute("aria-selected", String(box.checked));
  });
  const head = headBox(table);
  if (head) {
    const on = boxes.filter((b) => b.checked).length;
    head.checked = boxes.length > 0 && on === boxes.length;
    head.indeterminate = on > 0 && on < boxes.length;
  }
  if (announce) {
    const selected = rows.filter((r) => r.getAttribute("aria-selected") === "true");
    table.dispatchEvent(new CustomEvent("table-select", { bubbles: true, detail: { rows: selected, count: selected.length } }));
  }
}
function selectRows(table, which) {
  const rows = bodyRows(table);
  rows.forEach((row, i) => {
    const on = which === "all" || Array.isArray(which) && which.includes(i);
    const box = rowBox(row);
    if (!box)
      return;
    box.checked = on;
    row.setAttribute("aria-selected", String(on));
  });
  syncSelection(table);
}
function announceMove(table, row) {
  table.dispatchEvent(new CustomEvent("table-reorder", { bubbles: true, detail: { row, index: bodyRows(table).indexOf(row) } }));
}
function moved(table, row) {
  dfDollar5(table.tHead).find("[aria-sort]").attr("aria-sort", "none");
  table._sort = null;
  announceMove(table, row);
}
function initReorder(table) {
  let dragged = null;
  const clear = () => dfDollar5(table).find("[data-drop]").toArray().forEach((r) => r.removeAttribute("data-drop"));
  table.addEventListener("pointerdown", (e) => {
    const handle = e.target.closest?.(".table-handle");
    if (handle)
      handle.closest("tr").draggable = true;
  });
  table.addEventListener("dragstart", (e) => {
    const row = e.target.closest?.("tbody > tr");
    if (!row || !row.draggable)
      return;
    dragged = row;
    row.dataset.dragging = "";
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", row.cells[1]?.textContent.trim() ?? "");
  });
  table.addEventListener("dragover", (e) => {
    const row = e.target.closest?.("tbody > tr");
    if (!dragged || !row || row === dragged)
      return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const r = row.getBoundingClientRect();
    const where = e.clientY - r.top < r.height / 2 ? "before" : "after";
    if (row.dataset.drop !== where) {
      clear();
      row.dataset.drop = where;
    }
  });
  table.addEventListener("drop", (e) => {
    const row = dfDollar5(table).find("tbody > tr[data-drop]").get(0);
    if (!dragged || !row)
      return;
    e.preventDefault();
    const ref = row.dataset.drop === "before" ? row : row.nextSibling;
    if (ref)
      dfDollar5(ref).before(dragged);
    else
      dfDollar5(row.parentElement).append(dragged);
    clear();
    moved(table, dragged);
  });
  table.addEventListener("dragend", () => {
    if (dragged) {
      delete dragged.dataset.dragging;
      dragged.draggable = false;
    }
    dragged = null;
    clear();
  });
  table.addEventListener("keydown", (e) => {
    if (!e.altKey || e.key !== "ArrowUp" && e.key !== "ArrowDown")
      return;
    const row = e.target.closest?.("tbody > tr");
    if (!row)
      return;
    e.preventDefault();
    const sib = e.key === "ArrowUp" ? row.previousElementSibling : row.nextElementSibling;
    if (!sib)
      return;
    const ref = e.key === "ArrowUp" ? sib : sib.nextSibling;
    if (ref)
      dfDollar5(ref).before(row);
    else
      dfDollar5(row.parentElement).append(row);
    e.target.focus();
    moved(table, row);
  });
}
function measureLocks(table) {
  const n = parseInt(table.dataset.lockStart || "0", 10);
  if (n < 2)
    return;
  const first = table.rows[0];
  if (!first)
    return;
  for (let i = 1;i < n; i++)
    table.style.setProperty(`--table-lock-${i}`, `${first.cells[i - 1]?.getBoundingClientRect().width ?? 0}px`);
}
function triggerStateChange5(table, stateName, config) {
  switch (stateName) {
    case "default":
      unsort(table);
      selectRows(table, []);
      break;
    case "sorted": {
      const sort = config?.sort ?? {};
      const direction = config?.direction ?? sort.direction;
      sortBy(table, config?.column ?? sort.column ?? 0, direction === "descending" ? "descending" : "ascending");
      if (Array.isArray(config?.selected))
        selectRows(table, config.selected);
      break;
    }
    case "selected":
      if (config && "sort" in config) {
        if (config.sort)
          sortBy(table, config.sort.column ?? 0, config.sort.direction === "descending" ? "descending" : "ascending");
        else
          unsort(table);
      }
      selectRows(table, config?.rows ?? config?.selected ?? [0]);
      break;
  }
}
var tableApi = componentState5({
  component: "table",
  states: tableStates,
  apply: (table, state) => triggerStateChange5(table, state.name, state.config),
  read: (table, state) => {
    const selected = bodyRows(table).flatMap((r, i) => r.getAttribute("aria-selected") === "true" ? [i] : []);
    return { name: table.dataset.stateName || "default", config: { ...state.config, sort: table._sort ?? null, selected } };
  },
  markup: (el, state) => {
    enhanceHead(el);
    triggerStateChange5(el, state.name, state.config);
  }
});
df$5.tableApi = tableApi;
df$5.tableStates = tableStates;
function init5() {
  dfDollar5("table.table:not([data-init])").toArray().forEach((table) => {
    table.dataset.init = "";
    table.dataset.stateName = "default";
    table._original = bodyRows(table);
    table._sort = null;
    bindComponent5(table, tableApi);
    enhanceHead(table);
    dfDollar5(table.tHead).find(".table-sort").toArray().forEach((btn) => {
      const th = btn.closest("th");
      btn.addEventListener("click", () => {
        const col = th.cellIndex;
        const now = th.getAttribute("aria-sort");
        const next = now === "ascending" ? "descending" : now === "descending" ? "none" : "ascending";
        if (next === "none")
          unsort(table);
        else
          sortBy(table, col, next);
        table.dataset.stateName = next === "none" ? "default" : "sorted";
        table.dispatchEvent(new CustomEvent("table-sort", { bubbles: true, detail: { column: col, direction: next } }));
      });
    });
    const pre = dfDollar5(table.tHead).find('th[aria-sort="ascending"], th[aria-sort="descending"]').get(0);
    if (pre)
      sortBy(table, pre.cellIndex, pre.getAttribute("aria-sort"));
    if (dfDollar5(table).find('.table-select input[type="checkbox"]').get(0)) {
      let last = null;
      table.addEventListener("click", (e) => {
        const box = e.target.closest?.('.table-select input[type="checkbox"]');
        if (!box)
          return;
        if (box === headBox(table)) {
          const on = box.checked;
          bodyRows(table).forEach((r) => {
            const b = rowBox(r);
            if (b && !b.disabled)
              b.checked = on;
          });
        } else {
          const rows = bodyRows(table);
          const row = box.closest("tr");
          if (e.shiftKey && last && rows.includes(last)) {
            const [a, b] = [rows.indexOf(last), rows.indexOf(row)].sort((x, y) => x - y);
            rows.slice(a, b + 1).forEach((r) => {
              const rb = rowBox(r);
              if (rb && !rb.disabled)
                rb.checked = box.checked;
            });
          }
          last = row;
        }
        syncSelection(table);
        table.dataset.stateName = bodyRows(table).some((r) => r.getAttribute("aria-selected") === "true") ? "selected" : "default";
      });
      syncSelection(table, false);
    }
    if (dfDollar5(table).find(".table-handle").get(0))
      initReorder(table);
    if (table.dataset.lockStart) {
      measureLocks(table);
      let frame = 0;
      new ResizeObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => measureLocks(table));
      }).observe(table);
    }
  });
}
init5();
new MutationObserver(init5).observe(document, { childList: true, subtree: true });

// dist/components/tree-view/tree-view.js
var __df$core6 = globalThis.df$;
var __df$shared6 = __df$core6 && __df$core6.shadcn && __df$core6.shadcn.shared;
if (!__df$shared6 || __df$shared6.abi !== "0.9.5") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals6, defussQuery: defussQuery6, componentState: componentState6, bindComponent: bindComponent6 } = __df$shared6;
var df$6 = defussGlobals6();
var dfDollar6 = defussQuery6();
var treeViewStates = ["default", "expanded"];
function applyMarkup5(el, stateName) {
  if (stateName === "expanded")
    dfDollar6(el).attr("open", "");
}
function triggerStateChange6(details, stateName, _config) {
  switch (stateName) {
    case "default":
      details.open = details._defaultOpen ?? false;
      break;
    case "expanded":
      details.open = true;
      break;
  }
}
var treeViewApi = componentState6({
  component: "tree-view",
  states: treeViewStates,
  apply: (details, state) => triggerStateChange6(details, state.name, state.config),
  read: (details, state) => {
    return {
      name: details.open ? "expanded" : "default",
      config: state.config
    };
  },
  markup: (el, state) => applyMarkup5(el, state.name)
});
df$6.treeViewApi = treeViewApi;
df$6.treeViewStates = treeViewStates;
var itemOf = (row) => row.closest('[role="treeitem"]');
var isDisabled = (item) => item?.getAttribute("aria-disabled") === "true";
function selectItem(tree, item) {
  if (!item || isDisabled(item) || item.getAttribute("aria-selected") === "true")
    return;
  dfDollar6(tree).find('[role="treeitem"][aria-selected="true"]').toArray().forEach((other) => other.setAttribute("aria-selected", "false"));
  item.setAttribute("aria-selected", "true");
  tree.dispatchEvent(new CustomEvent("tree-select", { bubbles: true, detail: { item } }));
}
var checkOf = (item) => item ? dfDollar6(item).find(":scope > .tree-leaf > .tree-check, :scope > details > .tree-branch-trigger > .tree-check").get(0) : undefined;
var childItems = (item) => [...dfDollar6(item).find(":scope > details > .tree-group").get(0)?.children ?? []].filter((li) => li.matches('[role="treeitem"]'));
var cascades = (tree) => tree.dataset.checkable !== "independent";
function checkDown(item, checked) {
  for (const child of childItems(item)) {
    const box = checkOf(child);
    if (box && !box.disabled) {
      box.checked = checked;
      box.indeterminate = false;
    }
    checkDown(child, checked);
  }
}
function rollUp(tree, item) {
  let parent = item.parentElement?.closest('[role="treeitem"]');
  while (parent && tree.contains(parent)) {
    const box = checkOf(parent);
    if (box) {
      const kids = childItems(parent).map(checkOf).filter(Boolean);
      const on = kids.filter((k) => k.checked && !k.indeterminate).length;
      const mixed = kids.some((k) => k.indeterminate);
      box.checked = kids.length > 0 && on === kids.length;
      box.indeterminate = mixed || on > 0 && on < kids.length;
    }
    parent = parent.parentElement?.closest('[role="treeitem"]');
  }
}
function syncAria(tree) {
  dfDollar6(tree).find('[role="treeitem"]').toArray().forEach((item) => {
    const box = checkOf(item);
    if (box)
      item.setAttribute("aria-checked", box.indeterminate ? "mixed" : String(box.checked));
  });
}
function checkedValues(tree) {
  return [...dfDollar6(tree).find(".tree-check").toArray()].filter((b) => b.checked && !b.indeterminate).map((b) => b.value !== "on" ? b.value : dfDollar6(b).closest('[role="treeitem"]').find(":scope > * > span:last-child, :scope > details > summary > span:last-child").get(0)?.textContent ?? "");
}
function onCheck(tree, item) {
  const box = checkOf(item);
  if (!box)
    return;
  box.indeterminate = false;
  if (cascades(tree)) {
    checkDown(item, box.checked);
    rollUp(tree, item);
  }
  syncAria(tree);
  tree.dispatchEvent(new CustomEvent("tree-check", { bubbles: true, detail: { item, checked: box.checked, values: checkedValues(tree) } }));
}
function initChecks(tree) {
  let n = 0;
  dfDollar6(tree).find(".tree-check").toArray().forEach((box) => {
    if (!box.hasAttribute("aria-label") && !box.hasAttribute("aria-labelledby")) {
      const label = dfDollar6(box.parentElement).find(":scope > span:last-child").get(0);
      if (label) {
        label.id ||= `${tree.id || "tree"}-lbl-${n++}-${Math.random().toString(36).slice(2, 7)}`;
        box.setAttribute("aria-labelledby", label.id);
      }
    }
  });
  if (cascades(tree)) {
    dfDollar6(tree).find('[role="treeitem"]').toArray().forEach((item) => {
      const b = checkOf(item);
      if (b?.checked)
        checkDown(item, true);
    });
    const leaves = [...dfDollar6(tree).find('[role="treeitem"]').toArray()].filter((i) => !childItems(i).length);
    leaves.forEach((leaf) => rollUp(tree, leaf));
  }
  syncAria(tree);
  tree.addEventListener("change", (e) => {
    if (!e.target.matches?.(".tree-check"))
      return;
    onCheck(tree, itemOf(e.target));
  });
}
function clearDrop(tree) {
  dfDollar6(tree).find("[data-drop]").toArray().forEach((r) => r.removeAttribute("data-drop"));
}
function announceMove2(tree, item) {
  const parentItem = item.parentElement.closest('[role="treeitem"]');
  const index = [...item.parentElement.children].indexOf(item);
  tree.dispatchEvent(new CustomEvent("tree-reorder", { bubbles: true, detail: { item, parent: parentItem ?? tree, index } }));
}
function initSortable(tree) {
  let dragged = null;
  const rows = () => dfDollar6(tree).find(".tree-branch-trigger, .tree-leaf").toArray();
  rows().forEach((row) => {
    if (!isDisabled(itemOf(row)))
      row.draggable = true;
  });
  tree.addEventListener("dragstart", (e) => {
    const row = e.target.closest?.(".tree-branch-trigger, .tree-leaf");
    if (!row)
      return;
    dragged = itemOf(row);
    dragged.dataset.dragging = "";
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", row.textContent.trim());
  });
  tree.addEventListener("dragover", (e) => {
    const row = e.target.closest?.(".tree-branch-trigger, .tree-leaf");
    if (!dragged || !row)
      return;
    const target = itemOf(row);
    if (target === dragged || dragged.contains(target))
      return clearDrop(tree);
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const r = row.getBoundingClientRect();
    const y = (e.clientY - r.top) / r.height;
    const isBranch = row.matches(".tree-branch-trigger");
    const where = isBranch ? y < 0.25 ? "before" : y > 0.75 ? "after" : "inside" : y < 0.5 ? "before" : "after";
    if (row.dataset.drop !== where) {
      clearDrop(tree);
      row.dataset.drop = where;
    }
  });
  tree.addEventListener("dragleave", (e) => {
    if (!tree.contains(e.relatedTarget))
      clearDrop(tree);
  });
  tree.addEventListener("drop", (e) => {
    const row = dfDollar6(tree).find("[data-drop]").get(0);
    if (!dragged || !row)
      return;
    e.preventDefault();
    const target = itemOf(row);
    const where = row.dataset.drop;
    if (where === "inside") {
      const details = dfDollar6(target).find(":scope > details").get(0);
      details.open = true;
      dfDollar6(details).find(":scope > .tree-group").get(0).append(dragged);
    } else {
      const ref = where === "before" ? target : target.nextSibling;
      if (ref)
        dfDollar6(ref).before(dragged);
      else
        dfDollar6(target.parentElement).append(dragged);
    }
    clearDrop(tree);
    announceMove2(tree, dragged);
    if (tree.hasAttribute("data-checkable") && cascades(tree)) {
      dfDollar6(tree).find('[role="treeitem"]').toArray().forEach((i) => {
        if (!childItems(i).length)
          rollUp(tree, i);
      });
      syncAria(tree);
    }
  });
  tree.addEventListener("dragend", () => {
    if (dragged)
      delete dragged.dataset.dragging;
    dragged = null;
    clearDrop(tree);
  });
}
function moveByKey(tree, row, dir) {
  const item = itemOf(row);
  const sib = dir < 0 ? item.previousElementSibling : item.nextElementSibling;
  if (!sib)
    return;
  const ref = dir < 0 ? sib : sib.nextSibling;
  if (ref)
    dfDollar6(ref).before(item);
  else
    dfDollar6(item.parentElement).append(item);
  row.focus();
  announceMove2(tree, item);
}
function init6() {
  dfDollar6('.tree[role="tree"]:not([data-init])').toArray().forEach((tree) => {
    tree.dataset.init = "";
    const selectable = tree.hasAttribute("data-selectable");
    if (selectable) {
      dfDollar6(tree).find('[role="treeitem"]').toArray().forEach((item) => {
        if (!isDisabled(item) && !item.hasAttribute("aria-selected"))
          item.setAttribute("aria-selected", "false");
      });
    }
    if (tree.hasAttribute("data-checkable"))
      initChecks(tree);
    if (tree.hasAttribute("data-sortable"))
      initSortable(tree);
    const checkable = tree.hasAttribute("data-checkable");
    tree.addEventListener("click", (e) => {
      const row = e.target.closest(".tree-branch-trigger, .tree-leaf");
      if (!row || !tree.contains(row))
        return;
      const item = itemOf(row);
      if (isDisabled(item)) {
        e.preventDefault();
        return;
      }
      if (selectable)
        selectItem(tree, item);
      const box = checkOf(item);
      if (checkable && !selectable && box && row.matches(".tree-leaf") && e.target !== box && !box.disabled) {
        box.checked = !box.checked;
        onCheck(tree, item);
      }
    });
    dfDollar6(tree).find(".tree-branch").toArray().forEach((details) => {
      const treeitem = details.closest('[role="treeitem"]');
      if (!treeitem)
        return;
      details._defaultOpen = details.open;
      bindComponent6(details, treeViewApi);
      details.addEventListener("toggle", () => {
        treeitem.setAttribute("aria-expanded", String(details.open));
        details.dataset.stateName = details.open ? "expanded" : "default";
      });
    });
    tree.addEventListener("keydown", (e) => {
      const target = e.target.closest(".tree-branch-trigger, .tree-leaf");
      if (!target)
        return;
      const allItems = Array.from(dfDollar6(tree).find(".tree-branch-trigger, .tree-leaf").toArray());
      const visibleItems = allItems.filter((item) => item.checkVisibility());
      const index = visibleItems.indexOf(target);
      if (e.altKey && tree.hasAttribute("data-sortable") && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        moveByKey(tree, target, e.key === "ArrowUp" ? -1 : 1);
        return;
      }
      if (e.key === " " && checkable) {
        const box = checkOf(itemOf(target));
        if (box && !box.disabled && !isDisabled(itemOf(target))) {
          e.preventDefault();
          box.checked = !box.checked;
          onCheck(tree, itemOf(target));
          return;
        }
      }
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (index < visibleItems.length - 1)
            visibleItems[index + 1].focus();
          break;
        case "ArrowUp":
          e.preventDefault();
          if (index > 0)
            visibleItems[index - 1].focus();
          break;
        case "ArrowRight":
          e.preventDefault();
          {
            const detailsR = target.closest("details.tree-branch");
            if (detailsR && !detailsR.open && !isDisabled(itemOf(target)))
              detailsR.open = true;
          }
          break;
        case "Enter":
        case " ": {
          const item = itemOf(target);
          if (isDisabled(item)) {
            e.preventDefault();
            break;
          }
          if (!selectable)
            break;
          if (target.matches("span.tree-leaf"))
            e.preventDefault();
          selectItem(tree, item);
          break;
        }
        case "ArrowLeft":
          e.preventDefault();
          {
            const detailsL = target.closest("details.tree-branch");
            if (detailsL && detailsL.open)
              detailsL.open = false;
          }
          break;
        case "Home":
          e.preventDefault();
          if (visibleItems.length)
            visibleItems[0].focus();
          break;
        case "End":
          e.preventDefault();
          if (visibleItems.length)
            visibleItems[visibleItems.length - 1].focus();
          break;
      }
    });
  });
}
init6();
new MutationObserver(init6).observe(document, { childList: true, subtree: true });

// dist/components/calendar/calendar.js
var __df$core7 = globalThis.df$;
var __df$shared7 = __df$core7 && __df$core7.shadcn && __df$core7.shadcn.shared;
if (!__df$shared7 || __df$shared7.abi !== "0.9.5") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals7, defussQuery: defussQuery7, componentState: componentState7, bindComponent: bindComponent7, textLocale: textLocale2 } = __df$shared7;
var df$7 = defussGlobals7();
var dfDollar7 = defussQuery7();
var calSeq = 0;
var calendarStates = ["default"];
function applyMarkup6(el, config) {
  const now = new Date;
  el._calState = {
    year: config?.year ?? now.getFullYear(),
    month: config?.month ?? now.getMonth(),
    selected: config?.selected ?? config?.day ?? null,
    minDate: config?.minDate ?? null,
    maxDate: config?.maxDate ?? null
  };
  renderCalendar(el, el._calState.year, el._calState.month, el._calState.selected);
}
function triggerStateChange7(cal, stateName, config) {
  const state = cal._calState;
  if (!state || stateName !== "default")
    return;
  const owner = rangeOwnerOf(cal);
  if (owner && (("start" in (config ?? {})) || ("end" in (config ?? {})))) {
    const r = rangeState(owner);
    const iso = (v) => typeof v === "string" && ISO_DAY.test(v) ? v : null;
    r.start = iso(config.start);
    r.end = r.start ? iso(config.end) : null;
    if (r.end && r.end < r.start)
      r.end = null;
    r.hover = null;
    if (r.start) {
      const [y, m] = r.start.split("-").map(Number);
      r.year = y;
      r.month = m - 1;
    }
    syncRange(owner);
    return;
  }
  const now = new Date;
  if (typeof config?.minDate === "string")
    state.minDate = config.minDate || null;
  if (typeof config?.maxDate === "string")
    state.maxDate = config.maxDate || null;
  if (typeof config?.date === "string" && /^\d{4}(-\d{2}(-\d{2})?)?$/.test(config.date)) {
    const [y, m, d] = config.date.split("-").map(Number);
    state.year = y;
    state.month = (m ?? now.getMonth() + 1) - 1;
    state.selected = d ?? null;
  } else {
    state.year = config?.year ?? now.getFullYear();
    state.month = config?.month ?? now.getMonth();
    state.selected = config?.day ?? config?.selected ?? null;
  }
  renderCalendar(cal, state.year, state.month, state.selected);
}
var isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
var calendarApi = Object.assign(componentState7({
  component: "calendar",
  states: calendarStates,
  apply: (cal, state) => triggerStateChange7(cal, state.name, state.config),
  read: (cal, current) => {
    const view = cal._calState ?? {};
    return {
      name: cal.dataset.stateName || "default",
      config: {
        ...current.config,
        year: view.year,
        month: view.month,
        selected: view.selected,
        minDate: view.minDate ?? null,
        maxDate: view.maxDate ?? null,
        view: cal.dataset.view || "days",
        ...rangeOwnerOf(cal) ? { rangeStart: rangeState(rangeOwnerOf(cal)).start, rangeEnd: rangeState(rangeOwnerOf(cal)).end } : {}
      }
    };
  },
  markup: (el, state) => applyMarkup6(el, state.config)
}), {
  setDays(cal, days, options = {}) {
    const holder = dayHolderOf(cal);
    holder._calDays = options.merge ? { ...holder._calDays, ...days } : { ...days };
    rerender(cal);
  }
});
df$7.calendarApi = calendarApi;
df$7.calendarStates = calendarStates;
var nameSets = new Map;
function names(el) {
  const locale = textLocale2(el);
  if (!nameSets.has(locale)) {
    nameSets.set(locale, {
      days: Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, i))),
      months: Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(2024, i, 1))),
      full: new Intl.DateTimeFormat(locale, { dateStyle: "full" })
    });
  }
  return nameSets.get(locale);
}
var daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
var firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
var isToday = (year, month, day) => {
  const now = new Date;
  return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
};
var isoInRange = (iso, min, max) => (!min || iso >= min) && (!max || iso <= max);
var ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
function rangeOwnerOf(cal) {
  return cal.closest(".calendar-range") ?? (cal.dataset.mode === "range" ? cal : null);
}
function calendarsOf(owner) {
  if (!owner.classList.contains("calendar-range"))
    return [owner];
  return Array.from(dfDollar7(owner).find(".calendar").toArray()).filter((c) => c.closest(".calendar-range") === owner);
}
function rangeState(owner) {
  if (owner._range)
    return owner._range;
  const start = ISO_DAY.test(owner.dataset.rangeStart ?? "") ? owner.dataset.rangeStart : null;
  let end = ISO_DAY.test(owner.dataset.rangeEnd ?? "") ? owner.dataset.rangeEnd : null;
  if (end && (!start || end < start))
    end = null;
  const anchor = start ?? (/^\d{4}-\d{2}/.test(owner.dataset.currentDate ?? "") ? owner.dataset.currentDate : isoDate(new Date));
  const [y, m] = anchor.split("-").map(Number);
  owner._range = { start, end, hover: null, year: y, month: m - 1 };
  return owner._range;
}
var monthAt = (year, month, index) => {
  const d = new Date(year, month + index, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
};
var isoToDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
function renderRange(owner) {
  const r = rangeState(owner);
  calendarsOf(owner).forEach((cal, i) => {
    const state = cal._calState;
    if (!state)
      return;
    const { year, month } = monthAt(r.year, r.month, i);
    state.year = year;
    state.month = month;
    state.selected = null;
    renderCalendar(cal, year, month, null);
  });
}
function syncRange(owner) {
  const r = rangeState(owner);
  for (const [key, value] of [["rangeStart", r.start], ["rangeEnd", r.end]]) {
    if (value)
      owner.dataset[key] = value;
    else
      delete owner.dataset[key];
  }
  dfDollar7(owner).find("input[data-range-input]").toArray().forEach((input) => {
    const value = (input.dataset.rangeInput === "end" ? r.end : r.start) ?? "";
    if (input.value === value)
      return;
    input.value = value;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  renderRange(owner);
}
var esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var MARK = /^[a-z][a-z0-9-]*$/;
function dayHolderOf(cal) {
  const owner = rangeOwnerOf(cal);
  return owner && owner.classList.contains("calendar-range") ? owner : cal;
}
function daysOf(cal) {
  const holder = dayHolderOf(cal);
  if (holder._calDays)
    return holder._calDays;
  const script = Array.from(dfDollar7(holder).find("script.calendar-days").toArray()).find((el) => el.parentElement === holder);
  let days = {};
  if (script) {
    try {
      days = JSON.parse(script.textContent || "{}") ?? {};
    } catch {
      days = {};
    }
  }
  holder._calDays = days;
  return days;
}
function rerender(cal) {
  const owner = rangeOwnerOf(cal);
  if (owner)
    renderRange(owner);
  else {
    const st = cal._calState;
    if (st)
      renderCalendar(cal, st.year, st.month, st.selected);
  }
}
function dayData(days, iso, full) {
  const d = days?.[iso];
  if (!d || typeof d !== "object")
    return { attrs: "", note: "", aria: "", blocked: false };
  let attrs = "";
  if (typeof d.mark === "string" && MARK.test(d.mark))
    attrs += ` data-mark="${d.mark}"`;
  const note = d.note != null && d.note !== "" ? String(d.note) : "";
  if (note)
    attrs += " data-note";
  if (d.label)
    attrs += ` title="${esc(d.label)}"`;
  const aria = ` aria-label="${esc([full.format(isoToDate(iso)), d.label, note].filter(Boolean).join(", "))}"`;
  return { attrs, note: note ? `<span class="calendar-day-note">${esc(note)}</span>` : "", aria, blocked: d.disabled === true };
}
var YEARS_PER_PAGE = 12;
var pageStart = (year) => year - (year % YEARS_PER_PAGE + YEARS_PER_PAGE) % YEARS_PER_PAGE;
var pad2 = (n) => String(n).padStart(2, "0");
var monthOff = (y, m, min, max) => !isoInRange(`${y}-${pad2(m + 1)}-${pad2(daysInMonth(y, m))}`, min, null) || !isoInRange(`${y}-${pad2(m + 1)}-01`, null, max);
var yearOff = (y, min, max) => !isoInRange(`${y}-12-31`, min, null) || !isoInRange(`${y}-01-01`, null, max);
function renderPicker(el) {
  const st = el._calState;
  const panel = dfDollar7(el).find(".calendar-picker").get(0);
  if (!st || !panel)
    return;
  const now = new Date;
  let html = "";
  if (el.dataset.view === "months") {
    const y = st.pickYear;
    html = names(el).months.map((name, m) => {
      const current = y === st.year && m === st.month ? ' aria-current="true"' : "";
      const today = y === now.getFullYear() && m === now.getMonth() ? " data-today" : "";
      const off = monthOff(y, m, st.minDate, st.maxDate) ? " disabled" : "";
      return `<button type="button" class="calendar-pick" data-month="${m}" id="${el.dataset.calId}-m${m}"${current}${today}${off}>${esc(name.slice(0, 3))}</button>`;
    }).join("");
  } else {
    const start = st.pickPage;
    for (let y = start;y < start + YEARS_PER_PAGE; y++) {
      const current = y === st.year ? ' aria-current="true"' : "";
      const today = y === now.getFullYear() ? " data-today" : "";
      const off = yearOff(y, st.minDate, st.maxDate) ? " disabled" : "";
      html += `<button type="button" class="calendar-pick" data-year="${y}" id="${el.dataset.calId}-y${y}"${current}${today}${off}>${y}</button>`;
    }
  }
  dfDollar7(panel).morph(html);
}
function renderHeader(el) {
  const st = el._calState;
  if (!st)
    return;
  const view = el.dataset.view || "days";
  const heading = dfDollar7(el).find(".calendar-heading").get(0);
  if (heading) {
    const text = view === "months" ? String(st.pickYear) : view === "years" ? `${st.pickPage} – ${st.pickPage + YEARS_PER_PAGE - 1}` : `${names(el).months[st.month]} ${st.year}`;
    dfDollar7(heading).text(text);
    if (heading.tagName === "BUTTON") {
      dfDollar7(heading).attr("aria-label", view === "months" ? `${text}, choose a year` : view === "years" ? `Years ${text}, back to the days` : `${text}, choose a month and year`);
      dfDollar7(heading).attr("aria-expanded", String(view !== "days"));
    }
  }
  const labels = view === "months" ? ["Previous year", "Next year"] : view === "years" ? ["Previous years", "Next years"] : ["Previous month", "Next month"];
  dfDollar7(el).find('.calendar-nav[data-action="prev-month"]').attr("aria-label", labels[0]);
  dfDollar7(el).find('.calendar-nav[data-action="next-month"]').attr("aria-label", labels[1]);
  const monthSel = dfDollar7(el).find('.calendar-select[data-part="month"]').get(0);
  const yearSel = dfDollar7(el).find('.calendar-select[data-part="year"]').get(0);
  if (yearSel) {
    if (!Array.from(yearSel.options).some((o) => Number(o.value) === st.year))
      fillYears(el, yearSel);
    yearSel.value = String(st.year);
  }
  if (monthSel) {
    Array.from(monthSel.options).forEach((o, m) => {
      o.disabled = monthOff(st.year, m, st.minDate, st.maxDate);
    });
    monthSel.value = String(st.month);
  }
}
function fillYears(el, select) {
  const st = el._calState;
  const now = new Date().getFullYear();
  const bound = (attr, date, fallback) => {
    const v = Number(el.dataset[attr]);
    if (Number.isInteger(v) && v > 0)
      return v;
    const fromDate = date ? Number(String(date).slice(0, 4)) : NaN;
    return Number.isInteger(fromDate) ? fromDate : fallback;
  };
  let from = bound("yearFrom", st.minDate, now - 100);
  let to = bound("yearTo", st.maxDate, now + 10);
  from = Math.min(from, st.year);
  to = Math.max(to, st.year);
  let html = "";
  for (let y = to;y >= from; y--)
    html += `<option value="${y}">${y}</option>`;
  dfDollar7(select).html(html);
}
function jumpTo(el, year, month) {
  const st = el._calState;
  const owner = rangeOwnerOf(el);
  if (owner) {
    const rs = rangeState(owner);
    const first = monthAt(year, month, -calendarsOf(owner).indexOf(el));
    rs.year = first.year;
    rs.month = first.month;
    renderRange(owner);
    return;
  }
  st.year = year;
  st.month = month;
  st.selected = null;
  renderCalendar(el, year, month, null);
}
function setView(el, view) {
  const st = el._calState;
  const grid = dfDollar7(el).find(".calendar-grid").get(0);
  const panel = dfDollar7(el).find(".calendar-picker").get(0);
  if (!st || !panel)
    return;
  if (view !== "days" && (el.dataset.view || "days") === "days" && grid) {
    dfDollar7(panel).css("minHeight", `${grid.offsetHeight}px`).css("width", `${grid.offsetWidth}px`);
  }
  if (view === "months" && st.pickYear == null)
    st.pickYear = st.year;
  if (view === "years")
    st.pickPage = pageStart(st.pickYear ?? st.year);
  if (view === "days") {
    delete el.dataset.view;
    st.pickYear = null;
  } else
    el.dataset.view = view;
  if (view !== "days")
    renderPicker(el);
  renderHeader(el);
  if (view === "days") {
    const pick = dfDollar7(el).find(".calendar-day[data-selected] button").get(0) ?? dfDollar7(el).find(".calendar-day[data-today]:not([data-outside]) button").get(0) ?? dfDollar7(el).find(".calendar-day:not([data-outside]):not([data-disabled]) button").get(0);
    pick?.focus();
  } else {
    const pick = dfDollar7(panel).find(".calendar-pick[aria-current]:not([disabled])").get(0) ?? dfDollar7(panel).find(".calendar-pick:not([disabled])").get(0);
    pick?.focus();
  }
  el.dispatchEvent(new CustomEvent("calendar:view", { bubbles: true, detail: { view, year: st.year, month: st.month } }));
}
var renderGrid = (year, month, selectedDay, calId, minDate, maxDate, range, days, locale = names(null)) => {
  const full = locale.full;
  const rangeAttrs = (iso) => {
    if (!range || !range.start)
      return "";
    const end = range.end ?? range.preview;
    let a = "";
    const span = end && end !== range.start ? " data-range-span" : "";
    if (iso === range.start)
      a += ' data-range-start aria-selected="true"' + span;
    if (range.end && iso === range.end && iso !== range.start)
      a += ' data-range-end aria-selected="true"' + span;
    else if (range.end && iso === range.end)
      a += " data-range-end";
    else if (!range.end && end && iso === end && iso !== range.start)
      a += " data-range-end data-range-preview" + span;
    if (end && iso > range.start && iso < end)
      a += range.end ? ' data-in-range aria-selected="true"' : " data-in-range data-range-preview";
    return a;
  };
  const total = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);
  const prevTotal = daysInMonth(year, month - 1);
  let html = "<thead><tr>";
  for (let d = 0;d < 7; d++) {
    html += `<th class="calendar-day-label" scope="col">${locale.days[d]}</th>`;
  }
  html += "</tr></thead><tbody>";
  let dayNum = 1;
  let nextDayNum = 1;
  const rows = Math.ceil((startDay + total) / 7);
  for (let r = 0;r < rows; r++) {
    html += "<tr>";
    for (let c = 0;c < 7; c++) {
      const cellIndex = r * 7 + c;
      if (cellIndex < startDay) {
        const prevDay = prevTotal - startDay + cellIndex + 1;
        const iso = isoDate(new Date(year, month - 1, prevDay));
        const dd = dayData(days, iso, full);
        const off = !isoInRange(iso, minDate, maxDate) || dd.blocked ? " data-disabled" : "";
        html += `<td class="calendar-day" data-outside${off}${dd.attrs} id="${calId}-${iso}" data-cal-date="${iso}"><button tabindex="-1" data-day="${prevDay}" data-outside="prev"${dd.aria}>${prevDay}${dd.note}</button></td>`;
      } else if (dayNum > total) {
        const iso = isoDate(new Date(year, month + 1, nextDayNum));
        const dd = dayData(days, iso, full);
        const off = !isoInRange(iso, minDate, maxDate) || dd.blocked ? " data-disabled" : "";
        html += `<td class="calendar-day" data-outside${off}${dd.attrs} id="${calId}-${iso}" data-cal-date="${iso}"><button tabindex="-1" data-day="${nextDayNum}" data-outside="next"${dd.aria}>${nextDayNum}${dd.note}</button></td>`;
        nextDayNum++;
      } else {
        let attrs = "";
        if (isToday(year, month, dayNum))
          attrs += " data-today";
        if (dayNum === selectedDay)
          attrs += ' data-selected aria-selected="true"';
        const iso = isoDate(new Date(year, month, dayNum));
        const dd = dayData(days, iso, full);
        if (!isoInRange(iso, minDate, maxDate) || dd.blocked)
          attrs += " data-disabled";
        attrs += rangeAttrs(iso) + dd.attrs;
        html += `<td class="calendar-day"${attrs} id="${calId}-${iso}" data-cal-date="${iso}"><button data-day="${dayNum}"${dd.aria}>${dayNum}${dd.note}</button></td>`;
        dayNum++;
      }
    }
    html += "</tr>";
  }
  html += "</tbody>";
  return html;
};
var renderCalendar = (el, year, month, selectedDay) => {
  const grid = dfDollar7(el).find(".calendar-grid").get(0);
  if (!grid)
    return;
  const st = el._calState ?? {};
  if (el.dataset.view && (st.year !== year || st.month !== month))
    delete el.dataset.view;
  if (st.year !== undefined) {
    st.year = year;
    st.month = month;
  }
  renderHeader(el);
  el.dataset.currentDate = selectedDay ? isoDate(new Date(year, month, selectedDay)) : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  if (st.minDate)
    el.dataset.minDate = st.minDate;
  else
    el.removeAttribute("data-min-date");
  if (st.maxDate)
    el.dataset.maxDate = st.maxDate;
  else
    el.removeAttribute("data-max-date");
  const active = el.ownerDocument.activeElement;
  const focusKey = active && el.contains(active) ? active.closest(".calendar-day")?.getAttribute("data-cal-date") : null;
  const owner = rangeOwnerOf(el);
  const r = owner ? rangeState(owner) : null;
  const range = r ? { start: r.start, end: r.end, preview: !r.end && r.start && r.hover && r.hover >= r.start ? r.hover : null } : null;
  const days = daysOf(el);
  el.toggleAttribute("data-notes", Object.values(days).some((d) => d && d.note != null && d.note !== ""));
  dfDollar7(grid).morph(renderGrid(year, month, selectedDay, el.dataset.calId || "", st.minDate, st.maxDate, range, days, names(el)));
  if (focusKey)
    dfDollar7(grid).find(`[data-cal-date="${focusKey}"] button`).get(0)?.focus();
  const selDate = dfDollar7(el).find(".calendar-day[data-selected]").get(0)?.getAttribute("data-cal-date");
  if (selDate)
    grid.setAttribute("data-selected-date", selDate);
  else
    grid.removeAttribute("data-selected-date");
  const viewKey = `${year}-${month}`;
  if (el._viewKey !== viewKey) {
    el._viewKey = viewKey;
    el.dispatchEvent(new CustomEvent("calendar:view", { bubbles: true, detail: { view: "days", year, month } }));
  }
};
function init7() {
  dfDollar7(".calendar:not([data-init])").toArray().forEach((cal) => {
    cal.dataset.init = "";
    cal.dataset.calId = cal.id || `dfsc-${++calSeq}`;
    const now = new Date;
    const state = cal._calState = {
      year: now.getFullYear(),
      month: now.getMonth(),
      selected: null,
      minDate: cal.dataset.minDate || null,
      maxDate: cal.dataset.maxDate || null
    };
    if (/^\d{4}(-\d{2}(-\d{2})?)?$/.test(cal.dataset.currentDate ?? "")) {
      const [y, m, d] = cal.dataset.currentDate.split("-").map(Number);
      state.year = y;
      state.month = (m ?? now.getMonth() + 1) - 1;
      state.selected = d ?? null;
    }
    bindComponent7(cal, calendarApi);
    Object.assign(cal.api, {
      setDays: (days, options) => calendarApi.setDays(cal, days, options)
    });
    const header = dfDollar7(cal).find(".calendar-header").get(0);
    let heading = dfDollar7(cal).find(".calendar-heading").get(0);
    if (cal.dataset.caption === "dropdown" && header) {
      if (heading)
        dfDollar7(heading).attr("hidden", "");
      const caption = document.createElement("span");
      caption.className = "calendar-caption";
      dfDollar7(caption).html(`<select class="calendar-select" data-part="month" aria-label="Month">${names(cal).months.map((n, m) => `<option value="${m}">${esc(n)}</option>`).join("")}</select>` + `<select class="calendar-select" data-part="year" aria-label="Year"></select>`);
      if (heading)
        dfDollar7(heading).after(caption);
      else
        dfDollar7(header).append(caption);
      fillYears(cal, dfDollar7(caption).find('[data-part="year"]').get(0));
      caption.addEventListener("change", (e) => {
        const sel = e.target;
        const m = Number(dfDollar7(caption).find('[data-part="month"]').get(0).value);
        const y = Number(dfDollar7(caption).find('[data-part="year"]').get(0).value);
        jumpTo(cal, y, m);
        sel.focus();
      });
    } else if (heading && heading.tagName !== "BUTTON") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = heading.className;
      button.setAttribute("aria-live", heading.getAttribute("aria-live") || "polite");
      dfDollar7(heading).replaceWith(button);
      heading = button;
    }
    if (heading && heading.tagName === "BUTTON") {
      dfDollar7(heading).attr("aria-haspopup", "grid");
      if (!dfDollar7(cal).find(".calendar-picker").get(0)) {
        const panel = document.createElement("div");
        panel.className = "calendar-picker";
        panel.setAttribute("role", "group");
        const grid = dfDollar7(cal).find(".calendar-grid").get(0);
        if (grid)
          dfDollar7(grid).after(panel);
        else
          dfDollar7(cal).append(panel);
      }
      heading.addEventListener("click", () => {
        const view = cal.dataset.view || "days";
        setView(cal, view === "days" ? "months" : view === "months" ? "years" : "days");
      });
    }
    const owner = rangeOwnerOf(cal);
    if (owner) {
      const r = rangeState(owner);
      const { year, month } = monthAt(r.year, r.month, calendarsOf(owner).indexOf(cal));
      state.year = year;
      state.month = month;
      state.selected = null;
      syncRange(owner);
      if (!owner._rangeWired) {
        owner._rangeWired = true;
        owner.addEventListener("mouseleave", () => {
          const rs = rangeState(owner);
          if (!rs.hover)
            return;
          rs.hover = null;
          renderRange(owner);
        });
      }
    } else {
      renderCalendar(cal, state.year, state.month, state.selected);
    }
    const preview = (e) => {
      const o = rangeOwnerOf(cal);
      if (!o)
        return;
      const rs = rangeState(o);
      if (!rs.start || rs.end)
        return;
      const cell = e.target.closest?.(".calendar-day:not([data-outside]):not([data-disabled])");
      const iso = cell?.getAttribute("data-cal-date") ?? null;
      if (!iso || iso === rs.hover)
        return;
      rs.hover = iso;
      renderRange(o);
    };
    cal.addEventListener("mouseover", preview);
    cal.addEventListener("focusin", preview);
    cal.addEventListener("click", (e) => {
      const nav = e.target.closest(".calendar-nav");
      const view = cal.dataset.view;
      if (view && nav) {
        const dir = nav.dataset.action === "prev-month" ? -1 : 1;
        if (view === "months")
          state.pickYear += dir;
        else
          state.pickPage += dir * YEARS_PER_PAGE;
        renderPicker(cal);
        renderHeader(cal);
        return;
      }
      const pick = e.target.closest(".calendar-pick");
      if (pick && !pick.disabled) {
        if (pick.dataset.year !== undefined) {
          state.pickYear = Number(pick.dataset.year);
          setView(cal, "months");
        } else {
          jumpTo(cal, state.pickYear, Number(pick.dataset.month));
          setView(cal, "days");
        }
        return;
      }
      const rangeOwner = rangeOwnerOf(cal);
      if (nav && rangeOwner) {
        const rs = rangeState(rangeOwner);
        const { year, month } = monthAt(rs.year, rs.month, nav.dataset.action === "prev-month" ? -1 : 1);
        rs.year = year;
        rs.month = month;
        renderRange(rangeOwner);
        return;
      }
      const rangeBtn = rangeOwner && e.target.closest(".calendar-day button");
      if (rangeBtn) {
        const cell = rangeBtn.closest(".calendar-day");
        if (cell.hasAttribute("data-outside") || cell.hasAttribute("data-disabled"))
          return;
        const iso = cell.getAttribute("data-cal-date");
        const rs = rangeState(rangeOwner);
        if (!rs.start || rs.end || iso < rs.start) {
          rs.start = iso;
          rs.end = null;
        } else {
          rs.end = iso;
        }
        rs.hover = null;
        syncRange(rangeOwner);
        rangeOwner.dispatchEvent(new CustomEvent("calendar:range", {
          detail: {
            start: rs.start ? isoToDate(rs.start) : null,
            end: rs.end ? isoToDate(rs.end) : null,
            startIso: rs.start,
            endIso: rs.end
          },
          bubbles: true
        }));
        return;
      }
      if (nav) {
        const action = nav.dataset.action;
        if (action === "prev-month") {
          state.month--;
          if (state.month < 0) {
            state.month = 11;
            state.year--;
          }
          state.selected = null;
        } else if (action === "next-month") {
          state.month++;
          if (state.month > 11) {
            state.month = 0;
            state.year++;
          }
          state.selected = null;
        }
        renderCalendar(cal, state.year, state.month, state.selected);
        return;
      }
      const dayBtn = e.target.closest(".calendar-day button");
      if (dayBtn && !dayBtn.closest("[data-disabled]")) {
        const day = parseInt(dayBtn.dataset.day, 10);
        const outside = dayBtn.dataset.outside;
        if (outside === "prev") {
          state.month--;
          if (state.month < 0) {
            state.month = 11;
            state.year--;
          }
          state.selected = day;
        } else if (outside === "next") {
          state.month++;
          if (state.month > 11) {
            state.month = 0;
            state.year++;
          }
          state.selected = day;
        } else {
          state.selected = day;
        }
        renderCalendar(cal, state.year, state.month, state.selected);
        cal.dispatchEvent(new CustomEvent("calendar:select", {
          detail: { date: new Date(state.year, state.month, state.selected) },
          bubbles: true
        }));
      }
    });
    cal.addEventListener("keydown", (e) => {
      if (cal.dataset.view) {
        if (e.key === "Escape") {
          e.preventDefault();
          setView(cal, "days");
          return;
        }
        const pickBtn = e.target.closest(".calendar-pick");
        const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 4, ArrowUp: -4 }[e.key];
        if (pickBtn && step) {
          e.preventDefault();
          const picks = Array.from(dfDollar7(cal).find(".calendar-pick").toArray());
          picks[picks.indexOf(pickBtn) + step]?.focus();
        }
        return;
      }
      const dayBtn = e.target.closest(".calendar-day button");
      if (!dayBtn)
        return;
      const keyOwner = rangeOwnerOf(cal);
      const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 }[e.key];
      if (keyOwner && step) {
        e.preventDefault();
        const from = isoToDate(dayBtn.closest(".calendar-day").getAttribute("data-cal-date"));
        from.setDate(from.getDate() + step);
        const target = dfDollar7(keyOwner).find(`.calendar-day:not([data-outside])[data-cal-date="${isoDate(from)}"] button`).get(0);
        target?.focus();
        return;
      }
      const allBtns = Array.from(dfDollar7(cal).find(".calendar-day button").toArray());
      const idx = allBtns.indexOf(dayBtn);
      let next = null;
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          next = allBtns[idx + 1];
          break;
        case "ArrowLeft":
          e.preventDefault();
          next = allBtns[idx - 1];
          break;
        case "ArrowDown":
          e.preventDefault();
          next = allBtns[idx + 7];
          break;
        case "ArrowUp":
          e.preventDefault();
          next = allBtns[idx - 7];
          break;
      }
      if (next)
        next.focus();
    });
  });
}
init7();
new MutationObserver(init7).observe(document, { childList: true, subtree: true });

// dist/components/carousel/carousel.js
var __df$core8 = globalThis.df$;
var __df$shared8 = __df$core8 && __df$core8.shadcn && __df$core8.shadcn.shared;
if (!__df$shared8 || __df$shared8.abi !== "0.9.5") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals8, defussQuery: defussQuery8, componentState: componentState8, bindComponent: bindComponent8 } = __df$shared8;
var df$8 = defussGlobals8();
var dfDollar8 = defussQuery8();
var carSeq = 0;
var carouselStates = ["default"];
function applyMarkup7(_el, _stateName) {}
function triggerStateChange8(carousel, config) {
  const index = Number(config?.index ?? 0);
  if (typeof carousel._goTo === "function")
    carousel._goTo(index);
}
var carouselApi = componentState8({
  component: "carousel",
  states: carouselStates,
  apply: (carousel, state) => triggerStateChange8(carousel, state.config),
  read: (carousel, state) => {
    return {
      name: carousel.dataset.stateName || "default",
      config: { ...state.config, index: Number(carousel.dataset.currentIndex || 0) }
    };
  },
  markup: (el, state) => applyMarkup7(el, state.name)
});
df$8.carouselApi = carouselApi;
df$8.carouselStates = carouselStates;
function init8() {
  dfDollar8(".carousel:not([data-init])").toArray().forEach((carousel) => {
    carousel.dataset.init = "";
    bindComponent8(carousel, carouselApi);
    const viewport = dfDollar8(carousel).find(".carousel-viewport").get(0);
    const prevBtn = dfDollar8(carousel).find(".carousel-prev").get(0);
    const nextBtn = dfDollar8(carousel).find(".carousel-next").get(0);
    const dotsContainer = dfDollar8(carousel).find(".carousel-dots").get(0);
    const counter = dfDollar8(carousel).find(".carousel-counter").get(0);
    if (!viewport)
      return;
    const slides = () => Array.from(dfDollar8(viewport).find(".carousel-slide").toArray());
    const isVertical = carousel.dataset.orientation === "vertical";
    const isLoop = carousel.hasAttribute("data-loop");
    const autoplayDelay = carousel.dataset.autoplay ? parseInt(carousel.dataset.autoplay, 10) : 0;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior = reducedMotion ? "auto" : "smooth";
    let currentIndex = 0;
    let autoplayTimer = null;
    if (!carousel.hasAttribute("role"))
      carousel.setAttribute("role", "region");
    carousel.setAttribute("aria-roledescription", "carousel");
    if (!carousel.hasAttribute("aria-label"))
      carousel.setAttribute("aria-label", "Carousel");
    slides().forEach((slide, i) => {
      slide.setAttribute("role", "group");
      slide.setAttribute("aria-roledescription", "slide");
      if (!slide.hasAttribute("aria-label")) {
        slide.setAttribute("aria-label", `${i + 1} of ${slides().length}`);
      }
    });
    const scrollToIndex = (index) => {
      const allSlides = slides();
      if (!allSlides.length)
        return;
      let target = index;
      if (isLoop) {
        target = (index % allSlides.length + allSlides.length) % allSlides.length;
      } else {
        target = Math.max(0, Math.min(index, allSlides.length - 1));
      }
      const slide = allSlides[target];
      if (isVertical) {
        viewport.scrollTo({ top: slide.offsetTop - viewport.offsetTop, behavior });
      } else {
        viewport.scrollTo({ left: slide.offsetLeft - viewport.offsetLeft, behavior });
      }
    };
    const updateState = (index) => {
      const allSlides = slides();
      if (!allSlides.length)
        return;
      currentIndex = index;
      carousel.dataset.currentIndex = String(index);
      if (!isLoop) {
        if (prevBtn)
          dfDollar8(prevBtn).prop("disabled", currentIndex <= 0);
        if (nextBtn)
          dfDollar8(nextBtn).prop("disabled", currentIndex >= allSlides.length - 1);
      }
      if (dotsContainer)
        dfDollar8(dotsContainer).find(".carousel-dot").each(function(i) {
          dfDollar8(this).attr("aria-current", i === currentIndex ? "true" : "false");
        });
      if (counter)
        dfDollar8(counter).text(`Slide ${currentIndex + 1} of ${allSlides.length}`);
      allSlides.forEach((slide, i) => {
        dfDollar8(slide).attr("aria-label", `${i + 1} of ${allSlides.length}`);
      });
    };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const idx = slides().indexOf(entry.target);
          if (idx !== -1)
            updateState(idx);
        }
      }
    }, { root: viewport, threshold: 0.5 });
    slides().forEach((slide) => observer.observe(slide));
    const goNext = () => scrollToIndex(currentIndex + 1);
    const goPrev = () => scrollToIndex(currentIndex - 1);
    if (prevBtn)
      prevBtn.addEventListener("click", goPrev);
    if (nextBtn)
      nextBtn.addEventListener("click", goNext);
    carousel._goTo = scrollToIndex;
    const carId = carousel.dataset.carouselId ||= carousel.id || `dfsc-${++carSeq}`;
    let dotCount = -1;
    const renderDots = () => {
      if (!dotsContainer)
        return;
      const n = slides().length;
      if (dotCount === -1 && dotsContainer.children.length) {
        dotCount = n;
        return;
      }
      if (n === dotCount)
        return;
      dotCount = n;
      const html = Array.from({ length: n }, (_, i) => `<button id="${carId}-dot-${i}" class="carousel-dot" aria-label="Go to slide ${i + 1}" aria-current="${i === currentIndex ? "true" : "false"}"></button>`).join("");
      dfDollar8(dotsContainer).morph(html);
    };
    if (dotsContainer) {
      renderDots();
      dotsContainer.addEventListener("click", (e) => {
        const dot = e.target.closest(".carousel-dot");
        if (!dot)
          return;
        const idx = Array.from(dfDollar8(dotsContainer).find(".carousel-dot").toArray()).indexOf(dot);
        if (idx !== -1)
          scrollToIndex(idx);
      });
    }
    let lastSlideCount = slides().length;
    const syncObserver = new MutationObserver(() => {
      const n = slides().length;
      if (n !== lastSlideCount) {
        lastSlideCount = n;
        renderDots();
        observer.disconnect();
        slides().forEach((slide) => observer.observe(slide));
        updateState(Math.min(currentIndex, Math.max(0, n - 1)));
      }
    });
    if (viewport)
      syncObserver.observe(viewport, { childList: true });
    carousel.addEventListener("keydown", (e) => {
      const prevKey = isVertical ? "ArrowUp" : "ArrowLeft";
      const nextKey = isVertical ? "ArrowDown" : "ArrowRight";
      if (e.key === prevKey) {
        e.preventDefault();
        goPrev();
      }
      if (e.key === nextKey) {
        e.preventDefault();
        goNext();
      }
      if (e.key === "Home") {
        e.preventDefault();
        scrollToIndex(0);
      }
      if (e.key === "End") {
        e.preventDefault();
        scrollToIndex(slides().length - 1);
      }
    });
    if (!carousel.hasAttribute("tabindex")) {
      carousel.setAttribute("tabindex", "0");
    }
    const startAutoplay = () => {
      if (!autoplayDelay)
        return;
      stopAutoplay();
      autoplayTimer = setInterval(goNext, autoplayDelay);
      viewport.setAttribute("aria-live", "off");
    };
    const stopAutoplay = () => {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
      viewport.setAttribute("aria-live", "polite");
    };
    if (autoplayDelay) {
      startAutoplay();
      carousel.addEventListener("mouseenter", stopAutoplay);
      carousel.addEventListener("mouseleave", startAutoplay);
      carousel.addEventListener("focusin", stopAutoplay);
      carousel.addEventListener("focusout", startAutoplay);
    } else {
      viewport.setAttribute("aria-live", "polite");
    }
    updateState(0);
  });
}
init8();
new MutationObserver(init8).observe(document, { childList: true, subtree: true });

// dist/components/sortable/sortable.js
var __df$core9 = globalThis.df$;
var __df$shared9 = __df$core9 && __df$core9.shadcn && __df$core9.shadcn.shared;
if (!__df$shared9 || __df$shared9.abi !== "0.9.5") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals9, defussQuery: defussQuery9, componentState: componentState9, bindComponent: bindComponent9 } = __df$shared9;
var df$9 = defussGlobals9();
var dfDollar9 = defussQuery9();
var sortableStates = ["default"];
var drag = null;
var sortableLabels = (list) => dfDollar9(list).find(".sortable-item").map((item) => dfDollar9(item).find("span:not(.sortable-handle):not(.sortable-moves)").text().trim());
function applyMarkup8(_el, _stateName) {}
function triggerStateChange9(list, stateName, config) {
  if (stateName !== "default")
    return;
  dfDollar9(list).append(list._defaultOrder ?? []);
  list._syncMoves?.();
  if (config?.index !== undefined) {
    const item = dfDollar9(list).find(".sortable-item")[Number(config.index)];
    list._setActive?.(item);
  }
}
var sortableApi = componentState9({
  component: "sortable",
  states: sortableStates,
  apply: (list, state) => triggerStateChange9(list, state.name, state.config),
  read: (list, state) => {
    const items = Array.from(dfDollar9(list).find(".sortable-item"));
    const active = dfDollar9(list).find(".sortable-item[data-active]")[0];
    return {
      name: list.dataset.stateName || "default",
      config: {
        ...state.config,
        order: sortableLabels(list),
        activeIndex: active ? items.indexOf(active) : -1
      }
    };
  },
  markup: (el, state) => applyMarkup8(el, state.name)
});
df$9.sortableApi = sortableApi;
df$9.sortableStates = sortableStates;
function init9() {
  dfDollar9(".sortable:not([data-init])").toArray().forEach((list) => {
    list.dataset.init = "";
    bindComponent9(list, sortableApi);
    const isHorizontal = list.dataset.orientation === "horizontal";
    const NEXT_KEY = isHorizontal ? "ArrowRight" : "ArrowDown";
    const PREV_KEY = isHorizontal ? "ArrowLeft" : "ArrowUp";
    const NEXT_LIST_KEY = isHorizontal ? "ArrowDown" : "ArrowRight";
    const PREV_LIST_KEY = isHorizontal ? "ArrowUp" : "ArrowLeft";
    let liveRegion = list.nextElementSibling;
    if (!liveRegion || !liveRegion.classList.contains("sortable-live")) {
      liveRegion = document.createElement("span");
      liveRegion.className = "sortable-live";
      liveRegion.setAttribute("aria-live", "assertive");
      liveRegion.setAttribute("role", "status");
      dfDollar9(list).after(liveRegion);
    }
    function announce(msg) {
      dfDollar9(liveRegion).text("");
      requestAnimationFrame(() => {
        dfDollar9(liveRegion).text(msg);
      });
    }
    function getItems() {
      return Array.from(dfDollar9(list).find('.sortable-item:not([aria-disabled="true"])'));
    }
    function getAllItems() {
      return Array.from(dfDollar9(list).find(".sortable-item"));
    }
    const isLocked = (el) => el.getAttribute("aria-disabled") === "true";
    const listName = () => list.getAttribute("aria-label") || "the list";
    function place(item, target) {
      const all = getAllItems();
      const from = all.indexOf(item);
      const n = all.length;
      const fixed = all.map(isLocked);
      const t = Math.max(0, Math.min(n - 1, target));
      const dir = t < from ? -1 : 1;
      let slot = t;
      while (slot >= 0 && slot < n && fixed[slot])
        slot += dir;
      if (slot < 0 || slot >= n) {
        slot = t;
        while (slot >= 0 && slot < n && fixed[slot])
          slot -= dir;
      }
      if (slot < 0 || slot >= n || slot === from)
        return -1;
      const movable = all.filter((el) => !isLocked(el) && el !== item);
      const k = fixed.slice(0, slot).filter((f) => !f).length;
      movable.splice(k, 0, item);
      let m = 0;
      dfDollar9(list).append(all.map((el, i) => fixed[i] ? el : movable[m++]));
      return slot;
    }
    function syncMoves() {
      const all = getAllItems();
      const free = all.map((el) => !isLocked(el));
      all.forEach((item, i) => {
        const label = getItemLabel(item);
        dfDollar9(item).find(".sortable-move").each(function() {
          const up = this.dataset.move === "up";
          const room = up ? free.slice(0, i).some(Boolean) : free.slice(i + 1).some(Boolean);
          dfDollar9(this).prop("disabled", isLocked(item) || !room);
          if (!this.hasAttribute("aria-label") || this.dataset.autoLabel !== undefined) {
            dfDollar9(this).attr("aria-label", `Move ${label} ${up ? "up" : "down"}`).data("autoLabel", "");
          }
        });
      });
    }
    list._syncMoves = syncMoves;
    function moved(item, slot, focus = true) {
      const n = getAllItems().length;
      announce(`${getItemLabel(item)}, moved to position ${slot + 1} of ${n}`);
      setActive(item, focus);
      syncMoves();
      list.dispatchEvent(new CustomEvent("sortable-change", {
        bubbles: true,
        detail: { item, index: slot }
      }));
    }
    function receive(item, index, from, focus = true) {
      const all = getAllItems();
      const before = all[Math.max(0, index)];
      if (before)
        dfDollar9(before).before(item);
      else
        dfDollar9(list).append(item);
      const slot = getAllItems().indexOf(item);
      announce(`${getItemLabel(item)}, moved to ${listName()}, position ${slot + 1} of ${getAllItems().length}`);
      setActive(item, focus);
      syncMoves();
      from._released?.(item);
      list.dispatchEvent(new CustomEvent("sortable-change", {
        bubbles: true,
        detail: { item, index: slot, from }
      }));
    }
    list._receive = receive;
    list._released = (item) => {
      const items = getItems();
      if (items.length && !items.some((el) => el.getAttribute("tabindex") === "0")) {
        dfDollar9(items[0]).attr("tabindex", "0");
      }
      if (!items.length)
        list.removeAttribute("data-active-index");
      syncMoves();
      list.dispatchEvent(new CustomEvent("sortable-change", {
        bubbles: true,
        detail: { item, index: -1, to: item.closest(".sortable") }
      }));
    };
    const groupLists = () => {
      const group = list.dataset.group;
      return group ? Array.from(dfDollar9(".sortable[data-group]").toArray()).filter((l) => l.dataset.group === group) : [list];
    };
    function getActiveItem() {
      return dfDollar9(list).find(".sortable-item[data-active]")[0];
    }
    function setActive(item, focus = true) {
      getAllItems().forEach((el) => {
        dfDollar9(el).data("active", null).attr("tabindex", "-1");
      });
      if (item) {
        dfDollar9(item).data("active", "").attr("tabindex", "0");
        list.dataset.activeIndex = String(getItems().indexOf(item));
        if (focus)
          item.focus();
      } else {
        list.removeAttribute("data-active-index");
      }
    }
    list._setActive = setActive;
    list._defaultOrder = getAllItems();
    function getItemLabel(item) {
      const clone = item.cloneNode(true);
      dfDollar9(clone).find(".sortable-handle, .sortable-moves, .sortable-move").toArray().forEach((el) => el.remove());
      return clone.textContent.trim();
    }
    const allItems = getAllItems();
    allItems.forEach((item, i) => {
      dfDollar9(item).attr("tabindex", i === 0 ? "0" : "-1");
    });
    syncMoves();
    const accepts = () => !!drag && (drag.from === list || !!list.dataset.group && list.dataset.group === drag.from.dataset.group);
    const clearOver = () => {
      dfDollar9(list).find("[data-over]").data("over", null);
      dfDollar9(list).data("over", null);
    };
    list.addEventListener("dragstart", (e) => {
      const item = e.target.closest?.(".sortable-item");
      if (!item || !list.contains(item) || isLocked(item))
        return;
      drag = { item, from: list };
      dfDollar9(item).data("dragging", "");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "");
    });
    list.addEventListener("dragend", () => {
      if (drag)
        dfDollar9(drag.item).data("dragging", null);
      groupLists().forEach((l) => {
        dfDollar9(l).data("over", null);
        dfDollar9(l).find("[data-over]").data("over", null);
      });
      drag = null;
    });
    list.addEventListener("dragover", (e) => {
      if (!accepts())
        return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const item = e.target.closest?.(".sortable-item");
      clearOver();
      if (item && list.contains(item)) {
        if (item === drag.item)
          return;
        const rect = item.getBoundingClientRect();
        const midpoint = isHorizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
        const pos = isHorizontal ? e.clientX : e.clientY;
        dfDollar9(item).data("over", pos < midpoint ? "before" : "after");
      } else {
        dfDollar9(list).data("over", "end");
      }
    });
    list.addEventListener("dragleave", (e) => {
      if (!list.contains(e.relatedTarget))
        clearOver();
    });
    list.addEventListener("drop", (e) => {
      if (!accepts())
        return;
      e.preventDefault();
      const target = dfDollar9(list).find(".sortable-item[data-over]")[0];
      const position = target ? dfDollar9(target).data("over") : "end";
      clearOver();
      const { item: dragged, from } = drag;
      const all = getAllItems();
      if (from !== list) {
        const index = target ? all.indexOf(target) + (position === "before" ? 0 : 1) : all.length;
        receive(dragged, index, from);
        return;
      }
      if (target === dragged)
        return;
      const fromIndex = all.indexOf(dragged);
      let slotTarget = target ? all.indexOf(target) + (position === "before" ? 0 : 1) : all.length;
      if (fromIndex < slotTarget)
        slotTarget -= 1;
      const slot = place(dragged, slotTarget);
      if (slot >= 0)
        moved(dragged, slot);
    });
    list.addEventListener("click", (e) => {
      const button = e.target.closest?.(".sortable-move");
      if (!button || button.disabled || !list.contains(button))
        return;
      const item = button.closest(".sortable-item");
      const from = getAllItems().indexOf(item);
      const slot = place(item, from + (button.dataset.move === "up" ? -1 : 1));
      if (slot < 0)
        return;
      moved(item, slot, false);
      const target = button.disabled ? dfDollar9(item).find(`.sortable-move[data-move="${button.dataset.move === "up" ? "down" : "up"}"]`).get(0) : button;
      target?.focus();
    });
    list.addEventListener("keydown", (e) => {
      if (e.target.closest?.(".sortable-move"))
        return;
      const active = getActiveItem() || dfDollar9(list).find('.sortable-item[tabindex="0"]')[0];
      if (!active)
        return;
      const items = getItems();
      const idx = items.indexOf(active);
      if (e.key === NEXT_KEY && !e.altKey) {
        e.preventDefault();
        const next = items[idx + 1];
        if (next)
          setActive(next);
      } else if (e.key === PREV_KEY && !e.altKey) {
        e.preventDefault();
        const prev = items[idx - 1];
        if (prev)
          setActive(prev);
      } else if (e.key === "Home") {
        e.preventDefault();
        if (items.length)
          setActive(items[0]);
      } else if (e.key === "End") {
        e.preventDefault();
        if (items.length)
          setActive(items[items.length - 1]);
      } else if ((e.key === NEXT_KEY || e.key === PREV_KEY) && e.altKey) {
        e.preventDefault();
        const from = getAllItems().indexOf(active);
        const slot = place(active, from + (e.key === NEXT_KEY ? 1 : -1));
        if (slot >= 0)
          moved(active, slot);
      } else if ((e.key === NEXT_LIST_KEY || e.key === PREV_LIST_KEY) && e.altKey && list.dataset.group) {
        e.preventDefault();
        const lists = groupLists();
        const other = lists[lists.indexOf(list) + (e.key === NEXT_LIST_KEY ? 1 : -1)];
        if (!other?._receive)
          return;
        other._receive(active, getAllItems().indexOf(active), list);
      }
    });
    list.addEventListener("focusin", (e) => {
      const target = e.target;
      const item = target.closest(".sortable-item");
      if (!item || !list.contains(item))
        return;
      setActive(item, target === item);
    });
  });
}
init9();
new MutationObserver(init9).observe(document, { childList: true, subtree: true });

//# debugId=138E13867B7FDAC864756E2164756E21
//# sourceMappingURL=data-display.js.map
