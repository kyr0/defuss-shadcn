// dist/components/avatar/avatar.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.9.7") {
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
if (!__df$shared2 || __df$shared2.abi !== "0.9.7") {
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
if (!__df$shared3 || __df$shared3.abi !== "0.9.7") {
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
if (!__df$shared4 || __df$shared4.abi !== "0.9.7") {
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

// dist/components/iframe/iframe.js
var __df$core5 = globalThis.df$;
var __df$shared5 = __df$core5 && __df$core5.shadcn && __df$core5.shadcn.shared;
if (!__df$shared5 || __df$shared5.abi !== "0.9.7") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals5, defussQuery: defussQuery5, componentState: componentState5, bindComponent: bindComponent5 } = __df$shared5;
var df$5 = defussGlobals5();
var dfDollar5 = defussQuery5();
var iframeStates = ["default", "loaded"];
var PROTOCOL = "defuss:iframe";
var framed = () => globalThis.parent !== globalThis;
function applyMarkup5(el, stateName) {
  dfDollar5(el).attr("data-loaded", stateName === "loaded" ? "" : null);
}
function triggerStateChange5(el, stateName) {
  applyMarkup5(el, stateName);
}
var iframeApi = componentState5({
  component: "iframe",
  states: iframeStates,
  apply: (el, state) => triggerStateChange5(el, state.name),
  read: (el, state) => ({ name: el.hasAttribute("data-loaded") ? "loaded" : "default", config: state.config }),
  markup: (el, state) => applyMarkup5(el, state.name)
});
df$5.iframeApi = iframeApi;
df$5.iframeStates = iframeStates;
var frameOf = (el) => dfDollar5(el).children("iframe.iframe-frame").get(0);
function accepts(el, origin) {
  if (origin === globalThis.location.origin)
    return true;
  return (dfDollar5(el).attr("data-origins") ?? "").split(/\s+/).includes(origin);
}
function targetOrigin(el, frame) {
  const listed = (dfDollar5(el).attr("data-origins") ?? "").split(/\s+/).filter(Boolean);
  try {
    const own = frame.contentWindow?.location.origin;
    if (own && own !== "null")
      return own;
  } catch {}
  const named = listed.find((o) => o !== "null");
  return named ?? "*";
}
function setHeight(el, height) {
  const h = Math.ceil(height);
  if (!(h > 0) || el._iframeHeight === h)
    return;
  el._iframeHeight = h;
  el.style.setProperty("--iframe-height", `${h}px`);
  el.dispatchEvent(new CustomEvent("iframe-resize", { bubbles: true, detail: { height: h } }));
}
function followContent(el, frame) {
  let doc = null;
  try {
    doc = frame.contentDocument;
  } catch {
    doc = null;
  }
  if (!doc?.documentElement)
    return false;
  el._iframeObserver?.disconnect();
  const measure = () => setHeight(el, doc.documentElement.getBoundingClientRect().height);
  const ro = new ResizeObserver(measure);
  ro.observe(doc.documentElement);
  if (doc.body)
    ro.observe(doc.body);
  el._iframeObserver = ro;
  measure();
  return true;
}
function follow(el, frame) {
  if (dfDollar5(el).attr("data-fit") !== "content" || followContent(el, frame))
    return;
  frame.contentWindow?.postMessage({ type: PROTOCOL, kind: "hello" }, targetOrigin(el, frame));
}
function onLoad(el, frame) {
  applyMarkup5(el, "loaded");
  follow(el, frame);
}
function init5() {
  dfDollar5(".iframe:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    bindComponent5(el, iframeApi);
    const frame = frameOf(el);
    if (!frame)
      return;
    dfDollar5(frame).on("load", () => onLoad(el, frame));
    follow(el, frame);
    if (document.readyState !== "complete")
      globalThis.addEventListener("load", () => onLoad(el, frame), { once: true });
  });
}
if (!document.__iframeInit) {
  document.__iframeInit = true;
  globalThis.addEventListener("message", (e) => {
    const data = e.data;
    if (!data || data.type !== PROTOCOL)
      return;
    if (e.source === globalThis.parent && framed()) {
      const parentOrigin = dfDollar5(document.documentElement).attr("data-iframe-parent");
      if (parentOrigin && parentOrigin !== e.origin)
        return;
      if (data.kind === "hello") {
        if (document.documentElement.hasAttribute("data-iframe-child"))
          sendToParent({ type: PROTOCOL, kind: "size", height: Math.ceil(document.documentElement.getBoundingClientRect().height) });
        return;
      }
      if (data.kind !== "message")
        return;
      document.dispatchEvent(new CustomEvent("iframe-message", { detail: { name: String(data.name ?? ""), detail: data.detail, origin: e.origin } }));
      return;
    }
    const el = dfDollar5(".iframe[data-init]").toArray().find((f) => frameOf(f)?.contentWindow === e.source);
    if (!el || !accepts(el, e.origin))
      return;
    if (data.kind === "size" && dfDollar5(el).attr("data-fit") === "content" && typeof data.height === "number")
      setHeight(el, data.height);
    if (data.kind === "message") {
      el.dispatchEvent(new CustomEvent("iframe-message", { bubbles: true, detail: { name: String(data.name ?? ""), detail: data.detail, origin: e.origin } }));
    }
  });
}
function sendToParent(wire) {
  if (!framed())
    return false;
  const origin = dfDollar5(document.documentElement).attr("data-iframe-parent") || "*";
  globalThis.parent.postMessage(wire, origin);
  return true;
}
if (framed() && document.documentElement.hasAttribute("data-iframe-child") && !document.__iframeChildInit) {
  document.__iframeChildInit = true;
  let last = 0;
  new ResizeObserver(() => {
    const height = Math.ceil(document.documentElement.getBoundingClientRect().height);
    if (height !== last) {
      last = height;
      sendToParent({ type: PROTOCOL, kind: "size", height });
    }
  }).observe(document.documentElement);
}
var resolve = (target) => typeof target === "string" ? dfDollar5(target).get(0) : target;
df$5.iframe = {
  post: (target, name, detail) => {
    const el = resolve(target);
    const frame = el && frameOf(el);
    if (!el || !frame?.contentWindow)
      return false;
    frame.contentWindow.postMessage({ type: PROTOCOL, kind: "message", name, detail }, targetOrigin(el, frame));
    return true;
  },
  send: (name, detail) => sendToParent({ type: PROTOCOL, kind: "message", name, detail }),
  resize: (target) => {
    const el = resolve(target);
    const frame = el && frameOf(el);
    return !!el && !!frame && followContent(el, frame);
  }
};
init5();
new MutationObserver(init5).observe(document, { childList: true, subtree: true });

// dist/components/qr-code/qr-code.js
var __df$core6 = globalThis.df$;
var __df$shared6 = __df$core6 && __df$core6.shadcn && __df$core6.shadcn.shared;
if (!__df$shared6 || __df$shared6.abi !== "0.9.7") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals6, defussQuery: defussQuery6, componentState: componentState6, bindComponent: bindComponent6, unbindComponent } = __df$shared6;
var df$6 = defussGlobals6();
var dfDollar6 = defussQuery6();
var qrcodegen;
(function(qrcodegen) {

  class QrCode {
    version;
    errorCorrectionLevel;
    static encodeText(text, ecl) {
      const segs = qrcodegen.QrSegment.makeSegments(text);
      return QrCode.encodeSegments(segs, ecl);
    }
    static encodeBinary(data, ecl) {
      const seg = qrcodegen.QrSegment.makeBytes(data);
      return QrCode.encodeSegments([seg], ecl);
    }
    static encodeSegments(segs, ecl, minVersion = 1, maxVersion = 40, mask = -1, boostEcl = true) {
      if (!(QrCode.MIN_VERSION <= minVersion && minVersion <= maxVersion && maxVersion <= QrCode.MAX_VERSION) || mask < -1 || mask > 7)
        throw new RangeError("Invalid value");
      let version;
      let dataUsedBits;
      for (version = minVersion;; version++) {
        const dataCapacityBits = QrCode.getNumDataCodewords(version, ecl) * 8;
        const usedBits = QrSegment.getTotalBits(segs, version);
        if (usedBits <= dataCapacityBits) {
          dataUsedBits = usedBits;
          break;
        }
        if (version >= maxVersion)
          throw new RangeError("Data too long");
      }
      for (const newEcl of [QrCode.Ecc.MEDIUM, QrCode.Ecc.QUARTILE, QrCode.Ecc.HIGH]) {
        if (boostEcl && dataUsedBits <= QrCode.getNumDataCodewords(version, newEcl) * 8)
          ecl = newEcl;
      }
      let bb = [];
      for (const seg of segs) {
        appendBits(seg.mode.modeBits, 4, bb);
        appendBits(seg.numChars, seg.mode.numCharCountBits(version), bb);
        for (const b of seg.getData())
          bb.push(b);
      }
      assert(bb.length == dataUsedBits);
      const dataCapacityBits = QrCode.getNumDataCodewords(version, ecl) * 8;
      assert(bb.length <= dataCapacityBits);
      appendBits(0, Math.min(4, dataCapacityBits - bb.length), bb);
      appendBits(0, (8 - bb.length % 8) % 8, bb);
      assert(bb.length % 8 == 0);
      for (let padByte = 236;bb.length < dataCapacityBits; padByte ^= 236 ^ 17)
        appendBits(padByte, 8, bb);
      let dataCodewords = [];
      while (dataCodewords.length * 8 < bb.length)
        dataCodewords.push(0);
      bb.forEach((b, i) => dataCodewords[i >>> 3] |= b << 7 - (i & 7));
      return new QrCode(version, ecl, dataCodewords, mask);
    }
    size;
    mask;
    modules = [];
    isFunction = [];
    constructor(version, errorCorrectionLevel, dataCodewords, msk) {
      this.version = version;
      this.errorCorrectionLevel = errorCorrectionLevel;
      if (version < QrCode.MIN_VERSION || version > QrCode.MAX_VERSION)
        throw new RangeError("Version value out of range");
      if (msk < -1 || msk > 7)
        throw new RangeError("Mask value out of range");
      this.size = version * 4 + 17;
      let row = [];
      for (let i = 0;i < this.size; i++)
        row.push(false);
      for (let i = 0;i < this.size; i++) {
        this.modules.push(row.slice());
        this.isFunction.push(row.slice());
      }
      this.drawFunctionPatterns();
      const allCodewords = this.addEccAndInterleave(dataCodewords);
      this.drawCodewords(allCodewords);
      if (msk == -1) {
        let minPenalty = 1e9;
        for (let i = 0;i < 8; i++) {
          this.applyMask(i);
          this.drawFormatBits(i);
          const penalty = this.getPenaltyScore();
          if (penalty < minPenalty) {
            msk = i;
            minPenalty = penalty;
          }
          this.applyMask(i);
        }
      }
      assert(0 <= msk && msk <= 7);
      this.mask = msk;
      this.applyMask(msk);
      this.drawFormatBits(msk);
      this.isFunction = [];
    }
    getModule(x, y) {
      return 0 <= x && x < this.size && 0 <= y && y < this.size && this.modules[y][x];
    }
    drawFunctionPatterns() {
      for (let i = 0;i < this.size; i++) {
        this.setFunctionModule(6, i, i % 2 == 0);
        this.setFunctionModule(i, 6, i % 2 == 0);
      }
      this.drawFinderPattern(3, 3);
      this.drawFinderPattern(this.size - 4, 3);
      this.drawFinderPattern(3, this.size - 4);
      const alignPatPos = this.getAlignmentPatternPositions();
      const numAlign = alignPatPos.length;
      for (let i = 0;i < numAlign; i++) {
        for (let j = 0;j < numAlign; j++) {
          if (!(i == 0 && j == 0 || i == 0 && j == numAlign - 1 || i == numAlign - 1 && j == 0))
            this.drawAlignmentPattern(alignPatPos[i], alignPatPos[j]);
        }
      }
      this.drawFormatBits(0);
      this.drawVersion();
    }
    drawFormatBits(mask) {
      const data = this.errorCorrectionLevel.formatBits << 3 | mask;
      let rem = data;
      for (let i = 0;i < 10; i++)
        rem = rem << 1 ^ (rem >>> 9) * 1335;
      const bits = (data << 10 | rem) ^ 21522;
      assert(bits >>> 15 == 0);
      for (let i = 0;i <= 5; i++)
        this.setFunctionModule(8, i, getBit(bits, i));
      this.setFunctionModule(8, 7, getBit(bits, 6));
      this.setFunctionModule(8, 8, getBit(bits, 7));
      this.setFunctionModule(7, 8, getBit(bits, 8));
      for (let i = 9;i < 15; i++)
        this.setFunctionModule(14 - i, 8, getBit(bits, i));
      for (let i = 0;i < 8; i++)
        this.setFunctionModule(this.size - 1 - i, 8, getBit(bits, i));
      for (let i = 8;i < 15; i++)
        this.setFunctionModule(8, this.size - 15 + i, getBit(bits, i));
      this.setFunctionModule(8, this.size - 8, true);
    }
    drawVersion() {
      if (this.version < 7)
        return;
      let rem = this.version;
      for (let i = 0;i < 12; i++)
        rem = rem << 1 ^ (rem >>> 11) * 7973;
      const bits = this.version << 12 | rem;
      assert(bits >>> 18 == 0);
      for (let i = 0;i < 18; i++) {
        const color = getBit(bits, i);
        const a = this.size - 11 + i % 3;
        const b = Math.floor(i / 3);
        this.setFunctionModule(a, b, color);
        this.setFunctionModule(b, a, color);
      }
    }
    drawFinderPattern(x, y) {
      for (let dy = -4;dy <= 4; dy++) {
        for (let dx = -4;dx <= 4; dx++) {
          const dist = Math.max(Math.abs(dx), Math.abs(dy));
          const xx = x + dx;
          const yy = y + dy;
          if (0 <= xx && xx < this.size && 0 <= yy && yy < this.size)
            this.setFunctionModule(xx, yy, dist != 2 && dist != 4);
        }
      }
    }
    drawAlignmentPattern(x, y) {
      for (let dy = -2;dy <= 2; dy++) {
        for (let dx = -2;dx <= 2; dx++)
          this.setFunctionModule(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) != 1);
      }
    }
    setFunctionModule(x, y, isDark) {
      this.modules[y][x] = isDark;
      this.isFunction[y][x] = true;
    }
    addEccAndInterleave(data) {
      const ver = this.version;
      const ecl = this.errorCorrectionLevel;
      if (data.length != QrCode.getNumDataCodewords(ver, ecl))
        throw new RangeError("Invalid argument");
      const numBlocks = QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver];
      const blockEccLen = QrCode.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver];
      const rawCodewords = Math.floor(QrCode.getNumRawDataModules(ver) / 8);
      const numShortBlocks = numBlocks - rawCodewords % numBlocks;
      const shortBlockLen = Math.floor(rawCodewords / numBlocks);
      let blocks = [];
      const rsDiv = QrCode.reedSolomonComputeDivisor(blockEccLen);
      for (let i = 0, k = 0;i < numBlocks; i++) {
        let dat = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
        k += dat.length;
        const ecc = QrCode.reedSolomonComputeRemainder(dat, rsDiv);
        if (i < numShortBlocks)
          dat.push(0);
        blocks.push(dat.concat(ecc));
      }
      let result = [];
      for (let i = 0;i < blocks[0].length; i++) {
        blocks.forEach((block, j) => {
          if (i != shortBlockLen - blockEccLen || j >= numShortBlocks)
            result.push(block[i]);
        });
      }
      assert(result.length == rawCodewords);
      return result;
    }
    drawCodewords(data) {
      if (data.length != Math.floor(QrCode.getNumRawDataModules(this.version) / 8))
        throw new RangeError("Invalid argument");
      let i = 0;
      for (let right = this.size - 1;right >= 1; right -= 2) {
        if (right == 6)
          right = 5;
        for (let vert = 0;vert < this.size; vert++) {
          for (let j = 0;j < 2; j++) {
            const x = right - j;
            const upward = (right + 1 & 2) == 0;
            const y = upward ? this.size - 1 - vert : vert;
            if (!this.isFunction[y][x] && i < data.length * 8) {
              this.modules[y][x] = getBit(data[i >>> 3], 7 - (i & 7));
              i++;
            }
          }
        }
      }
      assert(i == data.length * 8);
    }
    applyMask(mask) {
      if (mask < 0 || mask > 7)
        throw new RangeError("Mask value out of range");
      for (let y = 0;y < this.size; y++) {
        for (let x = 0;x < this.size; x++) {
          let invert;
          switch (mask) {
            case 0:
              invert = (x + y) % 2 == 0;
              break;
            case 1:
              invert = y % 2 == 0;
              break;
            case 2:
              invert = x % 3 == 0;
              break;
            case 3:
              invert = (x + y) % 3 == 0;
              break;
            case 4:
              invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 == 0;
              break;
            case 5:
              invert = x * y % 2 + x * y % 3 == 0;
              break;
            case 6:
              invert = (x * y % 2 + x * y % 3) % 2 == 0;
              break;
            case 7:
              invert = ((x + y) % 2 + x * y % 3) % 2 == 0;
              break;
            default:
              throw new Error("Unreachable");
          }
          if (!this.isFunction[y][x] && invert)
            this.modules[y][x] = !this.modules[y][x];
        }
      }
    }
    getPenaltyScore() {
      let result = 0;
      for (let y = 0;y < this.size; y++) {
        let runColor = false;
        let runX = 0;
        let runHistory = [0, 0, 0, 0, 0, 0, 0];
        for (let x = 0;x < this.size; x++) {
          if (this.modules[y][x] == runColor) {
            runX++;
            if (runX == 5)
              result += QrCode.PENALTY_N1;
            else if (runX > 5)
              result++;
          } else {
            this.finderPenaltyAddHistory(runX, runHistory);
            if (!runColor)
              result += this.finderPenaltyCountPatterns(runHistory) * QrCode.PENALTY_N3;
            runColor = this.modules[y][x];
            runX = 1;
          }
        }
        result += this.finderPenaltyTerminateAndCount(runColor, runX, runHistory) * QrCode.PENALTY_N3;
      }
      for (let x = 0;x < this.size; x++) {
        let runColor = false;
        let runY = 0;
        let runHistory = [0, 0, 0, 0, 0, 0, 0];
        for (let y = 0;y < this.size; y++) {
          if (this.modules[y][x] == runColor) {
            runY++;
            if (runY == 5)
              result += QrCode.PENALTY_N1;
            else if (runY > 5)
              result++;
          } else {
            this.finderPenaltyAddHistory(runY, runHistory);
            if (!runColor)
              result += this.finderPenaltyCountPatterns(runHistory) * QrCode.PENALTY_N3;
            runColor = this.modules[y][x];
            runY = 1;
          }
        }
        result += this.finderPenaltyTerminateAndCount(runColor, runY, runHistory) * QrCode.PENALTY_N3;
      }
      for (let y = 0;y < this.size - 1; y++) {
        for (let x = 0;x < this.size - 1; x++) {
          const color = this.modules[y][x];
          if (color == this.modules[y][x + 1] && color == this.modules[y + 1][x] && color == this.modules[y + 1][x + 1])
            result += QrCode.PENALTY_N2;
        }
      }
      let dark = 0;
      for (const row of this.modules)
        dark = row.reduce((sum, color) => sum + (color ? 1 : 0), dark);
      const total = this.size * this.size;
      const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
      assert(0 <= k && k <= 9);
      result += k * QrCode.PENALTY_N4;
      assert(0 <= result && result <= 2568888);
      return result;
    }
    getAlignmentPatternPositions() {
      if (this.version == 1)
        return [];
      else {
        const numAlign = Math.floor(this.version / 7) + 2;
        const step = this.version == 32 ? 26 : Math.ceil((this.version * 4 + 4) / (numAlign * 2 - 2)) * 2;
        let result = [6];
        for (let pos = this.size - 7;result.length < numAlign; pos -= step)
          result.splice(1, 0, pos);
        return result;
      }
    }
    static getNumRawDataModules(ver) {
      if (ver < QrCode.MIN_VERSION || ver > QrCode.MAX_VERSION)
        throw new RangeError("Version number out of range");
      let result = (16 * ver + 128) * ver + 64;
      if (ver >= 2) {
        const numAlign = Math.floor(ver / 7) + 2;
        result -= (25 * numAlign - 10) * numAlign - 55;
        if (ver >= 7)
          result -= 36;
      }
      assert(208 <= result && result <= 29648);
      return result;
    }
    static getNumDataCodewords(ver, ecl) {
      return Math.floor(QrCode.getNumRawDataModules(ver) / 8) - QrCode.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver] * QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver];
    }
    static reedSolomonComputeDivisor(degree) {
      if (degree < 1 || degree > 255)
        throw new RangeError("Degree out of range");
      let result = [];
      for (let i = 0;i < degree - 1; i++)
        result.push(0);
      result.push(1);
      let root = 1;
      for (let i = 0;i < degree; i++) {
        for (let j = 0;j < result.length; j++) {
          result[j] = QrCode.reedSolomonMultiply(result[j], root);
          if (j + 1 < result.length)
            result[j] ^= result[j + 1];
        }
        root = QrCode.reedSolomonMultiply(root, 2);
      }
      return result;
    }
    static reedSolomonComputeRemainder(data, divisor) {
      let result = divisor.map((_) => 0);
      for (const b of data) {
        const factor = b ^ result.shift();
        result.push(0);
        divisor.forEach((coef, i) => result[i] ^= QrCode.reedSolomonMultiply(coef, factor));
      }
      return result;
    }
    static reedSolomonMultiply(x, y) {
      if (x >>> 8 != 0 || y >>> 8 != 0)
        throw new RangeError("Byte out of range");
      let z = 0;
      for (let i = 7;i >= 0; i--) {
        z = z << 1 ^ (z >>> 7) * 285;
        z ^= (y >>> i & 1) * x;
      }
      assert(z >>> 8 == 0);
      return z;
    }
    finderPenaltyCountPatterns(runHistory) {
      const n = runHistory[1];
      assert(n <= this.size * 3);
      const core = n > 0 && runHistory[2] == n && runHistory[3] == n * 3 && runHistory[4] == n && runHistory[5] == n;
      return (core && runHistory[0] >= n * 4 && runHistory[6] >= n ? 1 : 0) + (core && runHistory[6] >= n * 4 && runHistory[0] >= n ? 1 : 0);
    }
    finderPenaltyTerminateAndCount(currentRunColor, currentRunLength, runHistory) {
      if (currentRunColor) {
        this.finderPenaltyAddHistory(currentRunLength, runHistory);
        currentRunLength = 0;
      }
      currentRunLength += this.size;
      this.finderPenaltyAddHistory(currentRunLength, runHistory);
      return this.finderPenaltyCountPatterns(runHistory);
    }
    finderPenaltyAddHistory(currentRunLength, runHistory) {
      if (runHistory[0] == 0)
        currentRunLength += this.size;
      runHistory.pop();
      runHistory.unshift(currentRunLength);
    }
    static MIN_VERSION = 1;
    static MAX_VERSION = 40;
    static PENALTY_N1 = 3;
    static PENALTY_N2 = 3;
    static PENALTY_N3 = 40;
    static PENALTY_N4 = 10;
    static ECC_CODEWORDS_PER_BLOCK = [
      [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
      [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
      [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
      [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
    ];
    static NUM_ERROR_CORRECTION_BLOCKS = [
      [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
      [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
      [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
      [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
    ];
  }
  qrcodegen.QrCode = QrCode;
  function appendBits(val, len, bb) {
    if (len < 0 || len > 31 || val >>> len != 0)
      throw new RangeError("Value out of range");
    for (let i = len - 1;i >= 0; i--)
      bb.push(val >>> i & 1);
  }
  function getBit(x, i) {
    return (x >>> i & 1) != 0;
  }
  function assert(cond) {
    if (!cond)
      throw new Error("Assertion error");
  }

  class QrSegment {
    mode;
    numChars;
    bitData;
    static makeBytes(data) {
      let bb = [];
      for (const b of data)
        appendBits(b, 8, bb);
      return new QrSegment(QrSegment.Mode.BYTE, data.length, bb);
    }
    static makeNumeric(digits) {
      if (!QrSegment.isNumeric(digits))
        throw new RangeError("String contains non-numeric characters");
      let bb = [];
      for (let i = 0;i < digits.length; ) {
        const n = Math.min(digits.length - i, 3);
        appendBits(parseInt(digits.substr(i, n), 10), n * 3 + 1, bb);
        i += n;
      }
      return new QrSegment(QrSegment.Mode.NUMERIC, digits.length, bb);
    }
    static makeAlphanumeric(text) {
      if (!QrSegment.isAlphanumeric(text))
        throw new RangeError("String contains unencodable characters in alphanumeric mode");
      let bb = [];
      let i;
      for (i = 0;i + 2 <= text.length; i += 2) {
        let temp = QrSegment.ALPHANUMERIC_CHARSET.indexOf(text.charAt(i)) * 45;
        temp += QrSegment.ALPHANUMERIC_CHARSET.indexOf(text.charAt(i + 1));
        appendBits(temp, 11, bb);
      }
      if (i < text.length)
        appendBits(QrSegment.ALPHANUMERIC_CHARSET.indexOf(text.charAt(i)), 6, bb);
      return new QrSegment(QrSegment.Mode.ALPHANUMERIC, text.length, bb);
    }
    static makeSegments(text) {
      if (text == "")
        return [];
      else if (QrSegment.isNumeric(text))
        return [QrSegment.makeNumeric(text)];
      else if (QrSegment.isAlphanumeric(text))
        return [QrSegment.makeAlphanumeric(text)];
      else
        return [QrSegment.makeBytes(QrSegment.toUtf8ByteArray(text))];
    }
    static makeEci(assignVal) {
      let bb = [];
      if (assignVal < 0)
        throw new RangeError("ECI assignment value out of range");
      else if (assignVal < 1 << 7)
        appendBits(assignVal, 8, bb);
      else if (assignVal < 1 << 14) {
        appendBits(2, 2, bb);
        appendBits(assignVal, 14, bb);
      } else if (assignVal < 1e6) {
        appendBits(6, 3, bb);
        appendBits(assignVal, 21, bb);
      } else
        throw new RangeError("ECI assignment value out of range");
      return new QrSegment(QrSegment.Mode.ECI, 0, bb);
    }
    static isNumeric(text) {
      return QrSegment.NUMERIC_REGEX.test(text);
    }
    static isAlphanumeric(text) {
      return QrSegment.ALPHANUMERIC_REGEX.test(text);
    }
    constructor(mode, numChars, bitData) {
      this.mode = mode;
      this.numChars = numChars;
      this.bitData = bitData;
      if (numChars < 0)
        throw new RangeError("Invalid argument");
      this.bitData = bitData.slice();
    }
    getData() {
      return this.bitData.slice();
    }
    static getTotalBits(segs, version) {
      let result = 0;
      for (const seg of segs) {
        const ccbits = seg.mode.numCharCountBits(version);
        if (seg.numChars >= 1 << ccbits)
          return Infinity;
        result += 4 + ccbits + seg.bitData.length;
      }
      return result;
    }
    static toUtf8ByteArray(str) {
      str = encodeURI(str);
      let result = [];
      for (let i = 0;i < str.length; i++) {
        if (str.charAt(i) != "%")
          result.push(str.charCodeAt(i));
        else {
          result.push(parseInt(str.substr(i + 1, 2), 16));
          i += 2;
        }
      }
      return result;
    }
    static NUMERIC_REGEX = /^[0-9]*$/;
    static ALPHANUMERIC_REGEX = /^[A-Z0-9 $%*+.\/:-]*$/;
    static ALPHANUMERIC_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
  }
  qrcodegen.QrSegment = QrSegment;
})(qrcodegen || (qrcodegen = {}));
(function(qrcodegen) {
  var QrCode;
  (function(QrCode) {

    class Ecc {
      ordinal;
      formatBits;
      static LOW = new Ecc(0, 1);
      static MEDIUM = new Ecc(1, 0);
      static QUARTILE = new Ecc(2, 3);
      static HIGH = new Ecc(3, 2);
      constructor(ordinal, formatBits) {
        this.ordinal = ordinal;
        this.formatBits = formatBits;
      }
    }
    QrCode.Ecc = Ecc;
  })(QrCode = qrcodegen.QrCode || (qrcodegen.QrCode = {}));
})(qrcodegen || (qrcodegen = {}));
(function(qrcodegen) {
  var QrSegment;
  (function(QrSegment) {

    class Mode {
      modeBits;
      numBitsCharCount;
      static NUMERIC = new Mode(1, [10, 12, 14]);
      static ALPHANUMERIC = new Mode(2, [9, 11, 13]);
      static BYTE = new Mode(4, [8, 16, 16]);
      static KANJI = new Mode(8, [8, 10, 12]);
      static ECI = new Mode(7, [0, 0, 0]);
      constructor(modeBits, numBitsCharCount) {
        this.modeBits = modeBits;
        this.numBitsCharCount = numBitsCharCount;
      }
      numCharCountBits(ver) {
        return this.numBitsCharCount[Math.floor((ver + 7) / 17)];
      }
    }
    QrSegment.Mode = Mode;
  })(QrSegment = qrcodegen.QrSegment || (qrcodegen.QrSegment = {}));
})(qrcodegen || (qrcodegen = {}));
var qrCodeStates = ["default", "empty", "error"];
var INPUT_DEFAULTS = { value: "", ecc: "M", version: "auto", label: "QR code", size: "md", variant: "plain" };
var INPUT_ATTRIBUTES = ["data-value", "data-ecc", "data-version", "data-size", "data-variant"];
var ERROR_MESSAGES = {
  "capacity-exceeded": "Data exceeds the selected QR code capacity.",
  "invalid-text": "QR code data contains invalid Unicode.",
  "invalid-markup": "Invalid QR code markup.",
  unavailable: "QR code unavailable."
};
var INPUT_KEYS = ["value", "ecc", "version", "label", "size", "variant"];
var CONFIG_KEYS = new Set([...INPUT_KEYS, "message", "actualVersion", "moduleCount", "errorCode"]);
var partsOf = (el, part) => dfDollar6(el).find(":scope > .qr-code-" + part).toArray();
var attr = (el, name) => dfDollar6(el).attr(name);
function writeAttribute(el, name, value) {
  if (attr(el, name) !== value)
    dfDollar6(el).attr(name, value);
}
function addPart(el, markup) {
  const caption = dfDollar6(el).find(":scope > figcaption:last-child");
  if (caption.length)
    caption.before(markup);
  else
    dfDollar6(el).append(markup);
}
function validVersion(value) {
  return value === "auto" || typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 40;
}
function validateConfig(config) {
  if (!config || typeof config !== "object" || Array.isArray(config))
    throw new TypeError("qr-code: config must be a record");
  for (const key of Object.keys(config)) {
    if (!CONFIG_KEYS.has(key))
      throw new TypeError("qr-code: unknown option " + key);
    const value = config[key];
    if (value === undefined)
      continue;
    let valid;
    switch (key) {
      case "value":
      case "label":
      case "message":
        valid = typeof value === "string";
        break;
      case "ecc":
        valid = typeof value === "string" && ["L", "M", "Q", "H"].includes(value);
        break;
      case "version":
        valid = validVersion(value);
        break;
      case "size":
        valid = typeof value === "string" && ["sm", "md", "lg"].includes(value);
        break;
      case "variant":
        valid = value === "plain" || value === "outline";
        break;
      case "actualVersion":
        valid = typeof value === "number" && validVersion(value);
        break;
      case "moduleCount":
        valid = typeof value === "number" && Number.isInteger(value) && value >= 21 && value <= 177 && (value - 17) % 4 === 0;
        break;
      case "errorCode":
        valid = typeof value === "string" && Object.hasOwn(ERROR_MESSAGES, value);
        break;
      default:
        valid = false;
    }
    if (!valid)
      throw new TypeError("qr-code: invalid " + key);
  }
}
function authoredInputs(el) {
  const config = { ...INPUT_DEFAULTS };
  let invalid = false;
  for (const key of INPUT_KEYS) {
    if (key === "label")
      continue;
    const raw = attr(el, "data-" + key);
    if (raw === undefined || raw === null)
      continue;
    const value = key === "version" && /^(?:[1-9]|[1-3][0-9]|40)$/.test(raw) ? Number(raw) : raw;
    try {
      validateConfig({ [key]: value });
      Object.assign(config, { [key]: value });
    } catch {
      invalid = true;
    }
  }
  const symbol = partsOf(el, "symbol")[0];
  config.label = symbol && attr(symbol, "aria-label") || "QR code";
  return { config, invalid };
}
function normalizeConfig(config, defaults) {
  validateConfig(config);
  const result = { ...defaults };
  for (const key of INPUT_KEYS)
    if (config[key] !== undefined)
      Object.assign(result, { [key]: config[key] });
  if (!result.label.trim())
    result.label = "QR code";
  if (config.message !== undefined)
    result.message = config.message;
  if (config.errorCode !== undefined)
    result.errorCode = config.errorCode;
  return result;
}
function validText(value) {
  for (let i = 0;i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 55296 && code <= 56319) {
      const next = value.charCodeAt(++i);
      if (!(next >= 56320 && next <= 57343))
        return false;
    } else if (code >= 56320 && code <= 57343)
      return false;
  }
  return true;
}
function encodeGeometry(config, key) {
  const ecc = { L: qrcodegen.QrCode.Ecc.LOW, M: qrcodegen.QrCode.Ecc.MEDIUM, Q: qrcodegen.QrCode.Ecc.QUARTILE, H: qrcodegen.QrCode.Ecc.HIGH }[config.ecc];
  const segments = Array.from(config.value).some((character) => character.codePointAt(0) > 127) ? [qrcodegen.QrSegment.makeEci(26), qrcodegen.QrSegment.makeBytes(Array.from(new TextEncoder().encode(config.value)))] : qrcodegen.QrSegment.makeSegments(config.value);
  const min = config.version === "auto" ? 1 : config.version;
  const max = config.version === "auto" ? 40 : config.version;
  const qr = qrcodegen.QrCode.encodeSegments(segments, ecc, min, max, -1, false);
  const extent = qr.size + 8;
  const runs = [];
  for (let y = 0;y < qr.size; y++) {
    for (let x = 0;x < qr.size; ) {
      if (!qr.getModule(x, y)) {
        x++;
        continue;
      }
      const start = x++;
      while (x < qr.size && qr.getModule(x, y))
        x++;
      const width = x - start;
      runs.push("M" + (start + 4) + "," + (y + 4) + "h" + width + "v1h-" + width + "z");
    }
  }
  return {
    key,
    actualVersion: qr.version,
    moduleCount: qr.size,
    markup: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + extent + " " + extent + '" width="' + extent + '" height="' + extent + '" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges"><rect width="' + extent + '" height="' + extent + '" fill="#fff"></rect><path d="' + runs.join("") + '" fill="#000"></path></svg>'
  };
}
function applyMarkup6(el, stateName, source, defaults) {
  if (!qrCodeStates.includes(stateName))
    throw new Error("qr-code: unknown state " + stateName);
  const config = normalizeConfig(source, defaults);
  let name = stateName;
  let errorCode;
  let geometry;
  let symbols = partsOf(el, "symbol");
  let statuses = partsOf(el, "status");
  if (!symbols.length) {
    addPart(el, '<div class="qr-code-symbol" role="img"></div>');
    symbols = partsOf(el, "symbol");
  }
  if (!statuses.length) {
    addPart(el, '<output class="qr-code-status" hidden></output>');
    statuses = partsOf(el, "status");
  }
  if (symbols.length !== 1 || statuses.length !== 1) {
    name = "error";
    errorCode = "invalid-markup";
  } else if (name === "default") {
    delete config.message;
    delete config.errorCode;
    if (config.value.length === 0)
      name = "empty";
    else if (config.value.length > 7089) {
      name = "error";
      errorCode = "capacity-exceeded";
    } else if (!validText(config.value)) {
      name = "error";
      errorCode = "invalid-text";
    } else {
      const key = JSON.stringify([config.value, config.ecc, config.version]);
      try {
        geometry = el._qrCodeCache?.key === key ? el._qrCodeCache : encodeGeometry(config, key);
      } catch (error) {
        name = "error";
        errorCode = error instanceof RangeError ? "capacity-exceeded" : "unavailable";
      }
    }
  }
  if (name === "error") {
    config.errorCode = errorCode ?? config.errorCode ?? "unavailable";
    config.message = config.message?.trim() ? config.message : ERROR_MESSAGES[config.errorCode];
  } else if (name === "empty") {
    delete config.errorCode;
    config.message = config.message?.trim() ? config.message : "No QR code data.";
  } else {
    delete config.message;
    delete config.errorCode;
    config.actualVersion = geometry.actualVersion;
    config.moduleCount = geometry.moduleCount;
  }
  el._qrCodeCache = geometry;
  for (const key of INPUT_KEYS)
    if (key !== "label")
      writeAttribute(el, "data-" + key, String(config[key]));
  for (const symbol of symbols) {
    writeAttribute(symbol, "role", "img");
    writeAttribute(symbol, "aria-label", config.label);
    const markup = geometry?.markup ?? "";
    if (dfDollar6(symbol).html() !== markup)
      dfDollar6(symbol).html(markup);
    dfDollar6(symbol).prop("hidden", name !== "default");
  }
  for (const status of statuses) {
    if (dfDollar6(status).text() !== (config.message ?? ""))
      dfDollar6(status).text(config.message ?? "");
    dfDollar6(status).prop("hidden", name === "default");
  }
  dfDollar6(el).attr("data-state-name", name);
  return { name, config };
}
function triggerStateChange6(el, stateName, config, previous, incoming) {
  validateConfig(incoming);
  const next = { ...config };
  if (stateName !== previous.name && !Object.hasOwn(incoming, "message"))
    delete next.message;
  if (stateName !== previous.name && !Object.hasOwn(incoming, "errorCode"))
    delete next.errorCode;
  el._qrCodeDefaults ??= authoredInputs(el).config;
  el._qrCodeState = applyMarkup6(el, stateName, next, el._qrCodeDefaults);
}
var qrCodeApi = componentState6({
  component: "qr-code",
  states: qrCodeStates,
  mergeConfig: true,
  apply: (el, state, previous, incoming) => triggerStateChange6(el, state.name, state.config, previous, incoming),
  read: (el, state) => el._qrCodeState ? { name: el._qrCodeState.name, config: { ...el._qrCodeState.config } } : state,
  markup: (el, state) => {
    applyMarkup6(el, state.name, state.config, authoredInputs(el).config);
  }
});
df$6.qrCodeApi = qrCodeApi;
df$6.qrCodeStates = qrCodeStates;
function updateAttributes(el, requested) {
  const previous = el._qrCodeState;
  if (!previous || !el._qrCodeBoundApi)
    return;
  const changed = INPUT_ATTRIBUTES.filter((name) => requested.has(name));
  if (!changed.length)
    return;
  const read = authoredInputs(el);
  const config = { ...previous.config };
  for (const name of changed)
    config[name.slice(5)] = read.config[name.slice(5)];
  const name = read.invalid ? "error" : previous.config.errorCode === "invalid-markup" || changed.some((key) => ["data-value", "data-ecc", "data-version"].includes(key)) ? "default" : previous.name;
  if (read.invalid) {
    config.errorCode = "invalid-markup";
    config.message = ERROR_MESSAGES["invalid-markup"];
  }
  qrCodeApi.setState(el, name, config);
}
function init6() {
  for (const el of dfDollar6(".qr-code:not([data-init])").toArray()) {
    el.dataset.init = "";
    const read = authoredInputs(el);
    const saved = el._qrCodeState;
    el._qrCodeDefaults ??= read.config;
    const authoredName = attr(el, "data-state-name") ?? "default";
    const malformed = read.invalid || !qrCodeStates.includes(authoredName);
    const name = saved?.name ?? (malformed ? "error" : authoredName);
    const config = saved ? { ...saved.config } : { ...read.config };
    if (!saved && malformed)
      Object.assign(config, { errorCode: "invalid-markup", message: ERROR_MESSAGES["invalid-markup"] });
    el._qrCodeBoundApi = bindComponent6(el, qrCodeApi, { name, config });
    const changed = saved && INPUT_ATTRIBUTES.filter((key) => attr(el, key) !== String(saved.config[key.slice(5)]));
    if (changed?.length) {
      for (const key of changed)
        config[key.slice(5)] = read.config[key.slice(5)];
      if (read.invalid)
        Object.assign(config, { errorCode: "invalid-markup", message: ERROR_MESSAGES["invalid-markup"] });
    }
    const restoreName = changed?.length && (read.invalid || saved?.config.errorCode === "invalid-markup" || changed.some((key) => ["data-value", "data-ecc", "data-version"].includes(key))) ? read.invalid ? "error" : "default" : name;
    qrCodeApi.setState(el, restoreName, config);
  }
}
function rootsIn(node) {
  if (!(node instanceof Element))
    return [];
  return [...dfDollar6(node).filter(".qr-code").toArray(), ...dfDollar6(node).find(".qr-code").toArray()];
}
init6();
new MutationObserver((records) => {
  const changed = new Map;
  let added = false;
  for (const record of records) {
    if (record.type === "attributes") {
      const el = record.target;
      if (record.attributeName === "data-state-name")
        changed.delete(el);
      else if (el._qrCodeBoundApi && record.attributeName) {
        const fields = changed.get(el) ?? new Set;
        fields.add(record.attributeName);
        changed.set(el, fields);
      }
    } else {
      added ||= record.addedNodes.length > 0;
      for (const node of record.removedNodes)
        for (const el of rootsIn(node)) {
          if (el.isConnected || !el._qrCodeBoundApi)
            continue;
          const bound = el._qrCodeBoundApi;
          unbindComponent(el);
          if (el.api === bound)
            delete el.api;
          delete el._qrCodeBoundApi;
          dfDollar6(el).attr("data-init", null);
        }
    }
  }
  if (added)
    init6();
  for (const [el, fields] of changed)
    if (el.isConnected)
      updateAttributes(el, fields);
}).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: [...INPUT_ATTRIBUTES, "data-state-name"] });

// dist/components/table/table.js
var __df$core7 = globalThis.df$;
var __df$shared7 = __df$core7 && __df$core7.shadcn && __df$core7.shadcn.shared;
if (!__df$shared7 || __df$shared7.abi !== "0.9.7") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals7, defussQuery: defussQuery7, componentState: componentState7, bindComponent: bindComponent7, textLocale } = __df$shared7;
var df$7 = defussGlobals7();
var dfDollar7 = defussQuery7();
var tableStates = ["default", "sorted", "selected"];
var bodyOf = (table) => table.tBodies[0];
var bodyRows = (table) => [...bodyOf(table)?.rows ?? []];
var rowBox = (row) => dfDollar7(row).find(':scope > .table-select input[type="checkbox"]').get(0);
var headBox = (table) => dfDollar7(table.tHead).find('.table-select input[type="checkbox"]').get(0);
function enhanceHead(table) {
  dfDollar7(table.tHead).find(".table-sort").each((_i, btn) => {
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
    if (dfDollar7(th).find(".table-sort").get(0))
      th.setAttribute("aria-sort", i === col ? direction : "none");
  });
  table._sort = { column: col, direction };
}
function unsort(table) {
  const body = bodyOf(table);
  if (body && table._original)
    body.append(...table._original.filter((r) => r.parentElement === body));
  dfDollar7(table.tHead).find("[aria-sort]").attr("aria-sort", "none");
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
  dfDollar7(table.tHead).find("[aria-sort]").attr("aria-sort", "none");
  table._sort = null;
  announceMove(table, row);
}
function initReorder(table) {
  let dragged = null;
  const clear = () => dfDollar7(table).find("[data-drop]").toArray().forEach((r) => r.removeAttribute("data-drop"));
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
    const row = dfDollar7(table).find("tbody > tr[data-drop]").get(0);
    if (!dragged || !row)
      return;
    e.preventDefault();
    const ref = row.dataset.drop === "before" ? row : row.nextSibling;
    if (ref)
      dfDollar7(ref).before(dragged);
    else
      dfDollar7(row.parentElement).append(dragged);
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
      dfDollar7(ref).before(row);
    else
      dfDollar7(row.parentElement).append(row);
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
function triggerStateChange7(table, stateName, config) {
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
var tableApi = componentState7({
  component: "table",
  states: tableStates,
  apply: (table, state) => triggerStateChange7(table, state.name, state.config),
  read: (table, state) => {
    const selected = bodyRows(table).flatMap((r, i) => r.getAttribute("aria-selected") === "true" ? [i] : []);
    return { name: table.dataset.stateName || "default", config: { ...state.config, sort: table._sort ?? null, selected } };
  },
  markup: (el, state) => {
    enhanceHead(el);
    triggerStateChange7(el, state.name, state.config);
  }
});
df$7.tableApi = tableApi;
df$7.tableStates = tableStates;
function init7() {
  dfDollar7("table.table:not([data-init])").toArray().forEach((table) => {
    table.dataset.init = "";
    table.dataset.stateName = "default";
    table._original = bodyRows(table);
    table._sort = null;
    bindComponent7(table, tableApi);
    enhanceHead(table);
    dfDollar7(table.tHead).find(".table-sort").toArray().forEach((btn) => {
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
    const pre = dfDollar7(table.tHead).find('th[aria-sort="ascending"], th[aria-sort="descending"]').get(0);
    if (pre)
      sortBy(table, pre.cellIndex, pre.getAttribute("aria-sort"));
    if (dfDollar7(table).find('.table-select input[type="checkbox"]').get(0)) {
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
    if (dfDollar7(table).find(".table-handle").get(0))
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
init7();
new MutationObserver(init7).observe(document, { childList: true, subtree: true });

// dist/components/tree-view/tree-view.js
var __df$core8 = globalThis.df$;
var __df$shared8 = __df$core8 && __df$core8.shadcn && __df$core8.shadcn.shared;
if (!__df$shared8 || __df$shared8.abi !== "0.9.7") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals8, defussQuery: defussQuery8, componentState: componentState8, bindComponent: bindComponent8 } = __df$shared8;
var df$8 = defussGlobals8();
var dfDollar8 = defussQuery8();
var treeViewStates = ["default", "expanded"];
function applyMarkup7(el, stateName) {
  if (stateName === "expanded")
    dfDollar8(el).attr("open", "");
}
function triggerStateChange8(details, stateName, _config) {
  switch (stateName) {
    case "default":
      details.open = details._defaultOpen ?? false;
      break;
    case "expanded":
      details.open = true;
      break;
  }
}
var treeViewApi = componentState8({
  component: "tree-view",
  states: treeViewStates,
  apply: (details, state) => triggerStateChange8(details, state.name, state.config),
  read: (details, state) => {
    return {
      name: details.open ? "expanded" : "default",
      config: state.config
    };
  },
  markup: (el, state) => applyMarkup7(el, state.name)
});
df$8.treeViewApi = treeViewApi;
df$8.treeViewStates = treeViewStates;
var itemOf = (row) => row.closest('[role="treeitem"]');
var isDisabled = (item) => item?.getAttribute("aria-disabled") === "true";
function selectItem(tree, item) {
  if (!item || isDisabled(item) || item.getAttribute("aria-selected") === "true")
    return;
  dfDollar8(tree).find('[role="treeitem"][aria-selected="true"]').toArray().forEach((other) => other.setAttribute("aria-selected", "false"));
  item.setAttribute("aria-selected", "true");
  tree.dispatchEvent(new CustomEvent("tree-select", { bubbles: true, detail: { item } }));
}
var checkOf = (item) => item ? dfDollar8(item).find(":scope > .tree-leaf > .tree-check, :scope > details > .tree-branch-trigger > .tree-check").get(0) : undefined;
var childItems = (item) => [...dfDollar8(item).find(":scope > details > .tree-group").get(0)?.children ?? []].filter((li) => li.matches('[role="treeitem"]'));
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
  dfDollar8(tree).find('[role="treeitem"]').toArray().forEach((item) => {
    const box = checkOf(item);
    if (box)
      item.setAttribute("aria-checked", box.indeterminate ? "mixed" : String(box.checked));
  });
}
function checkedValues(tree) {
  return [...dfDollar8(tree).find(".tree-check").toArray()].filter((b) => b.checked && !b.indeterminate).map((b) => b.value !== "on" ? b.value : dfDollar8(b).closest('[role="treeitem"]').find(":scope > * > span:last-child, :scope > details > summary > span:last-child").get(0)?.textContent ?? "");
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
  dfDollar8(tree).find(".tree-check").toArray().forEach((box) => {
    if (!box.hasAttribute("aria-label") && !box.hasAttribute("aria-labelledby")) {
      const label = dfDollar8(box.parentElement).find(":scope > span:last-child").get(0);
      if (label) {
        label.id ||= `${tree.id || "tree"}-lbl-${n++}-${Math.random().toString(36).slice(2, 7)}`;
        box.setAttribute("aria-labelledby", label.id);
      }
    }
  });
  if (cascades(tree)) {
    dfDollar8(tree).find('[role="treeitem"]').toArray().forEach((item) => {
      const b = checkOf(item);
      if (b?.checked)
        checkDown(item, true);
    });
    const leaves = [...dfDollar8(tree).find('[role="treeitem"]').toArray()].filter((i) => !childItems(i).length);
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
  dfDollar8(tree).find("[data-drop]").toArray().forEach((r) => r.removeAttribute("data-drop"));
}
function announceMove2(tree, item) {
  const parentItem = item.parentElement.closest('[role="treeitem"]');
  const index = [...item.parentElement.children].indexOf(item);
  tree.dispatchEvent(new CustomEvent("tree-reorder", { bubbles: true, detail: { item, parent: parentItem ?? tree, index } }));
}
function initSortable(tree) {
  let dragged = null;
  const rows = () => dfDollar8(tree).find(".tree-branch-trigger, .tree-leaf").toArray();
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
    const row = dfDollar8(tree).find("[data-drop]").get(0);
    if (!dragged || !row)
      return;
    e.preventDefault();
    const target = itemOf(row);
    const where = row.dataset.drop;
    if (where === "inside") {
      const details = dfDollar8(target).find(":scope > details").get(0);
      details.open = true;
      dfDollar8(details).find(":scope > .tree-group").get(0).append(dragged);
    } else {
      const ref = where === "before" ? target : target.nextSibling;
      if (ref)
        dfDollar8(ref).before(dragged);
      else
        dfDollar8(target.parentElement).append(dragged);
    }
    clearDrop(tree);
    announceMove2(tree, dragged);
    if (tree.hasAttribute("data-checkable") && cascades(tree)) {
      dfDollar8(tree).find('[role="treeitem"]').toArray().forEach((i) => {
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
    dfDollar8(ref).before(item);
  else
    dfDollar8(item.parentElement).append(item);
  row.focus();
  announceMove2(tree, item);
}
function init8() {
  dfDollar8('.tree[role="tree"]:not([data-init])').toArray().forEach((tree) => {
    tree.dataset.init = "";
    const selectable = tree.hasAttribute("data-selectable");
    if (selectable) {
      dfDollar8(tree).find('[role="treeitem"]').toArray().forEach((item) => {
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
    dfDollar8(tree).find(".tree-branch").toArray().forEach((details) => {
      const treeitem = details.closest('[role="treeitem"]');
      if (!treeitem)
        return;
      details._defaultOpen = details.open;
      bindComponent8(details, treeViewApi);
      details.addEventListener("toggle", () => {
        treeitem.setAttribute("aria-expanded", String(details.open));
        details.dataset.stateName = details.open ? "expanded" : "default";
      });
    });
    tree.addEventListener("keydown", (e) => {
      const target = e.target.closest(".tree-branch-trigger, .tree-leaf");
      if (!target)
        return;
      const allItems = Array.from(dfDollar8(tree).find(".tree-branch-trigger, .tree-leaf").toArray());
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
init8();
new MutationObserver(init8).observe(document, { childList: true, subtree: true });

// dist/components/calendar/calendar.js
var __df$core9 = globalThis.df$;
var __df$shared9 = __df$core9 && __df$core9.shadcn && __df$core9.shadcn.shared;
if (!__df$shared9 || __df$shared9.abi !== "0.9.7") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals9, defussQuery: defussQuery9, componentState: componentState9, bindComponent: bindComponent9, textLocale: textLocale2 } = __df$shared9;
var df$9 = defussGlobals9();
var dfDollar9 = defussQuery9();
var calSeq = 0;
var calendarStates = ["default"];
function applyMarkup8(el, config) {
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
function triggerStateChange9(cal, stateName, config) {
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
var calendarApi = Object.assign(componentState9({
  component: "calendar",
  states: calendarStates,
  apply: (cal, state) => triggerStateChange9(cal, state.name, state.config),
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
  markup: (el, state) => applyMarkup8(el, state.config)
}), {
  setDays(cal, days, options = {}) {
    const holder = dayHolderOf(cal);
    holder._calDays = options.merge ? { ...holder._calDays, ...days } : { ...days };
    rerender(cal);
  }
});
df$9.calendarApi = calendarApi;
df$9.calendarStates = calendarStates;
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
  return Array.from(dfDollar9(owner).find(".calendar").toArray()).filter((c) => c.closest(".calendar-range") === owner);
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
  dfDollar9(owner).find("input[data-range-input]").toArray().forEach((input) => {
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
  const script = Array.from(dfDollar9(holder).find("script.calendar-days").toArray()).find((el) => el.parentElement === holder);
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
  const panel = dfDollar9(el).find(".calendar-picker").get(0);
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
  dfDollar9(panel).morph(html);
}
function renderHeader(el) {
  const st = el._calState;
  if (!st)
    return;
  const view = el.dataset.view || "days";
  const heading = dfDollar9(el).find(".calendar-heading").get(0);
  if (heading) {
    const text = view === "months" ? String(st.pickYear) : view === "years" ? `${st.pickPage} – ${st.pickPage + YEARS_PER_PAGE - 1}` : `${names(el).months[st.month]} ${st.year}`;
    dfDollar9(heading).text(text);
    if (heading.tagName === "BUTTON") {
      dfDollar9(heading).attr("aria-label", view === "months" ? `${text}, choose a year` : view === "years" ? `Years ${text}, back to the days` : `${text}, choose a month and year`);
      dfDollar9(heading).attr("aria-expanded", String(view !== "days"));
    }
  }
  const labels = view === "months" ? ["Previous year", "Next year"] : view === "years" ? ["Previous years", "Next years"] : ["Previous month", "Next month"];
  dfDollar9(el).find('.calendar-nav[data-action="prev-month"]').attr("aria-label", labels[0]);
  dfDollar9(el).find('.calendar-nav[data-action="next-month"]').attr("aria-label", labels[1]);
  const monthSel = dfDollar9(el).find('.calendar-select[data-part="month"]').get(0);
  const yearSel = dfDollar9(el).find('.calendar-select[data-part="year"]').get(0);
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
  dfDollar9(select).html(html);
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
  const grid = dfDollar9(el).find(".calendar-grid").get(0);
  const panel = dfDollar9(el).find(".calendar-picker").get(0);
  if (!st || !panel)
    return;
  if (view !== "days" && (el.dataset.view || "days") === "days" && grid) {
    dfDollar9(panel).css("minHeight", `${grid.offsetHeight}px`).css("width", `${grid.offsetWidth}px`);
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
    const pick = dfDollar9(el).find(".calendar-day[data-selected] button").get(0) ?? dfDollar9(el).find(".calendar-day[data-today]:not([data-outside]) button").get(0) ?? dfDollar9(el).find(".calendar-day:not([data-outside]):not([data-disabled]) button").get(0);
    pick?.focus();
  } else {
    const pick = dfDollar9(panel).find(".calendar-pick[aria-current]:not([disabled])").get(0) ?? dfDollar9(panel).find(".calendar-pick:not([disabled])").get(0);
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
  const grid = dfDollar9(el).find(".calendar-grid").get(0);
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
  dfDollar9(grid).morph(renderGrid(year, month, selectedDay, el.dataset.calId || "", st.minDate, st.maxDate, range, days, names(el)));
  if (focusKey)
    dfDollar9(grid).find(`[data-cal-date="${focusKey}"] button`).get(0)?.focus();
  const selDate = dfDollar9(el).find(".calendar-day[data-selected]").get(0)?.getAttribute("data-cal-date");
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
function init9() {
  dfDollar9(".calendar:not([data-init])").toArray().forEach((cal) => {
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
    bindComponent9(cal, calendarApi);
    Object.assign(cal.api, {
      setDays: (days, options) => calendarApi.setDays(cal, days, options)
    });
    const header = dfDollar9(cal).find(".calendar-header").get(0);
    let heading = dfDollar9(cal).find(".calendar-heading").get(0);
    if (cal.dataset.caption === "dropdown" && header) {
      if (heading)
        dfDollar9(heading).attr("hidden", "");
      const caption = document.createElement("span");
      caption.className = "calendar-caption";
      dfDollar9(caption).html(`<select class="calendar-select" data-part="month" aria-label="Month">${names(cal).months.map((n, m) => `<option value="${m}">${esc(n)}</option>`).join("")}</select>` + `<select class="calendar-select" data-part="year" aria-label="Year"></select>`);
      if (heading)
        dfDollar9(heading).after(caption);
      else
        dfDollar9(header).append(caption);
      fillYears(cal, dfDollar9(caption).find('[data-part="year"]').get(0));
      caption.addEventListener("change", (e) => {
        const sel = e.target;
        const m = Number(dfDollar9(caption).find('[data-part="month"]').get(0).value);
        const y = Number(dfDollar9(caption).find('[data-part="year"]').get(0).value);
        jumpTo(cal, y, m);
        sel.focus();
      });
    } else if (heading && heading.tagName !== "BUTTON") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = heading.className;
      button.setAttribute("aria-live", heading.getAttribute("aria-live") || "polite");
      dfDollar9(heading).replaceWith(button);
      heading = button;
    }
    if (heading && heading.tagName === "BUTTON") {
      dfDollar9(heading).attr("aria-haspopup", "grid");
      if (!dfDollar9(cal).find(".calendar-picker").get(0)) {
        const panel = document.createElement("div");
        panel.className = "calendar-picker";
        panel.setAttribute("role", "group");
        const grid = dfDollar9(cal).find(".calendar-grid").get(0);
        if (grid)
          dfDollar9(grid).after(panel);
        else
          dfDollar9(cal).append(panel);
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
          const picks = Array.from(dfDollar9(cal).find(".calendar-pick").toArray());
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
        const target = dfDollar9(keyOwner).find(`.calendar-day:not([data-outside])[data-cal-date="${isoDate(from)}"] button`).get(0);
        target?.focus();
        return;
      }
      const allBtns = Array.from(dfDollar9(cal).find(".calendar-day button").toArray());
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
init9();
new MutationObserver(init9).observe(document, { childList: true, subtree: true });

// dist/components/carousel/carousel.js
var __df$core10 = globalThis.df$;
var __df$shared10 = __df$core10 && __df$core10.shadcn && __df$core10.shadcn.shared;
if (!__df$shared10 || __df$shared10.abi !== "0.9.7") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals10, defussQuery: defussQuery10, componentState: componentState10, bindComponent: bindComponent10 } = __df$shared10;
var df$10 = defussGlobals10();
var dfDollar10 = defussQuery10();
var carSeq = 0;
var carouselStates = ["default"];
function applyMarkup9(_el, _stateName) {}
function triggerStateChange10(carousel, config) {
  const index = Number(config?.index ?? 0);
  if (typeof carousel._goTo === "function")
    carousel._goTo(index);
}
var carouselApi = componentState10({
  component: "carousel",
  states: carouselStates,
  apply: (carousel, state) => triggerStateChange10(carousel, state.config),
  read: (carousel, state) => {
    return {
      name: carousel.dataset.stateName || "default",
      config: { ...state.config, index: Number(carousel.dataset.currentIndex || 0) }
    };
  },
  markup: (el, state) => applyMarkup9(el, state.name)
});
df$10.carouselApi = carouselApi;
df$10.carouselStates = carouselStates;
function init10() {
  dfDollar10(".carousel:not([data-init])").toArray().forEach((carousel) => {
    carousel.dataset.init = "";
    bindComponent10(carousel, carouselApi);
    const viewport = dfDollar10(carousel).find(".carousel-viewport").get(0);
    const prevBtn = dfDollar10(carousel).find(".carousel-prev").get(0);
    const nextBtn = dfDollar10(carousel).find(".carousel-next").get(0);
    const dotsContainer = dfDollar10(carousel).find(".carousel-dots").get(0);
    const counter = dfDollar10(carousel).find(".carousel-counter").get(0);
    if (!viewport)
      return;
    const slides = () => Array.from(dfDollar10(viewport).find(".carousel-slide").toArray());
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
          dfDollar10(prevBtn).prop("disabled", currentIndex <= 0);
        if (nextBtn)
          dfDollar10(nextBtn).prop("disabled", currentIndex >= allSlides.length - 1);
      }
      if (dotsContainer)
        dfDollar10(dotsContainer).find(".carousel-dot").each(function(i) {
          dfDollar10(this).attr("aria-current", i === currentIndex ? "true" : "false");
        });
      if (counter)
        dfDollar10(counter).text(`Slide ${currentIndex + 1} of ${allSlides.length}`);
      allSlides.forEach((slide, i) => {
        dfDollar10(slide).attr("aria-label", `${i + 1} of ${allSlides.length}`);
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
      dfDollar10(dotsContainer).morph(html);
    };
    if (dotsContainer) {
      renderDots();
      dotsContainer.addEventListener("click", (e) => {
        const dot = e.target.closest(".carousel-dot");
        if (!dot)
          return;
        const idx = Array.from(dfDollar10(dotsContainer).find(".carousel-dot").toArray()).indexOf(dot);
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
init10();
new MutationObserver(init10).observe(document, { childList: true, subtree: true });

// dist/components/sortable/sortable.js
var __df$core11 = globalThis.df$;
var __df$shared11 = __df$core11 && __df$core11.shadcn && __df$core11.shadcn.shared;
if (!__df$shared11 || __df$shared11.abi !== "0.9.7") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals11, defussQuery: defussQuery11, componentState: componentState11, bindComponent: bindComponent11 } = __df$shared11;
var df$11 = defussGlobals11();
var dfDollar11 = defussQuery11();
var sortableStates = ["default"];
var drag = null;
var sortableLabels = (list) => dfDollar11(list).find(".sortable-item").map((item) => dfDollar11(item).find("span:not(.sortable-handle):not(.sortable-moves)").text().trim());
function applyMarkup10(_el, _stateName) {}
function triggerStateChange11(list, stateName, config) {
  if (stateName !== "default")
    return;
  dfDollar11(list).append(list._defaultOrder ?? []);
  list._syncMoves?.();
  if (config?.index !== undefined) {
    const item = dfDollar11(list).find(".sortable-item")[Number(config.index)];
    list._setActive?.(item);
  }
}
var sortableApi = componentState11({
  component: "sortable",
  states: sortableStates,
  apply: (list, state) => triggerStateChange11(list, state.name, state.config),
  read: (list, state) => {
    const items = Array.from(dfDollar11(list).find(".sortable-item"));
    const active = dfDollar11(list).find(".sortable-item[data-active]")[0];
    return {
      name: list.dataset.stateName || "default",
      config: {
        ...state.config,
        order: sortableLabels(list),
        activeIndex: active ? items.indexOf(active) : -1
      }
    };
  },
  markup: (el, state) => applyMarkup10(el, state.name)
});
df$11.sortableApi = sortableApi;
df$11.sortableStates = sortableStates;
function init11() {
  dfDollar11(".sortable:not([data-init])").toArray().forEach((list) => {
    list.dataset.init = "";
    bindComponent11(list, sortableApi);
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
      dfDollar11(list).after(liveRegion);
    }
    function announce(msg) {
      dfDollar11(liveRegion).text("");
      requestAnimationFrame(() => {
        dfDollar11(liveRegion).text(msg);
      });
    }
    function getItems() {
      return Array.from(dfDollar11(list).find('.sortable-item:not([aria-disabled="true"])'));
    }
    function getAllItems() {
      return Array.from(dfDollar11(list).find(".sortable-item"));
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
      dfDollar11(list).append(all.map((el, i) => fixed[i] ? el : movable[m++]));
      return slot;
    }
    function syncMoves() {
      const all = getAllItems();
      const free = all.map((el) => !isLocked(el));
      all.forEach((item, i) => {
        const label = getItemLabel(item);
        dfDollar11(item).find(".sortable-move").each(function() {
          const up = this.dataset.move === "up";
          const room = up ? free.slice(0, i).some(Boolean) : free.slice(i + 1).some(Boolean);
          dfDollar11(this).prop("disabled", isLocked(item) || !room);
          if (!this.hasAttribute("aria-label") || this.dataset.autoLabel !== undefined) {
            dfDollar11(this).attr("aria-label", `Move ${label} ${up ? "up" : "down"}`).data("autoLabel", "");
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
        dfDollar11(before).before(item);
      else
        dfDollar11(list).append(item);
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
        dfDollar11(items[0]).attr("tabindex", "0");
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
      return group ? Array.from(dfDollar11(".sortable[data-group]").toArray()).filter((l) => l.dataset.group === group) : [list];
    };
    function getActiveItem() {
      return dfDollar11(list).find(".sortable-item[data-active]")[0];
    }
    function setActive(item, focus = true) {
      getAllItems().forEach((el) => {
        dfDollar11(el).data("active", null).attr("tabindex", "-1");
      });
      if (item) {
        dfDollar11(item).data("active", "").attr("tabindex", "0");
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
      dfDollar11(clone).find(".sortable-handle, .sortable-moves, .sortable-move").toArray().forEach((el) => el.remove());
      return clone.textContent.trim();
    }
    const allItems = getAllItems();
    allItems.forEach((item, i) => {
      dfDollar11(item).attr("tabindex", i === 0 ? "0" : "-1");
    });
    syncMoves();
    const accepts = () => !!drag && (drag.from === list || !!list.dataset.group && list.dataset.group === drag.from.dataset.group);
    const clearOver = () => {
      dfDollar11(list).find("[data-over]").data("over", null);
      dfDollar11(list).data("over", null);
    };
    list.addEventListener("dragstart", (e) => {
      const item = e.target.closest?.(".sortable-item");
      if (!item || !list.contains(item) || isLocked(item))
        return;
      drag = { item, from: list };
      dfDollar11(item).data("dragging", "");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "");
    });
    list.addEventListener("dragend", () => {
      if (drag)
        dfDollar11(drag.item).data("dragging", null);
      groupLists().forEach((l) => {
        dfDollar11(l).data("over", null);
        dfDollar11(l).find("[data-over]").data("over", null);
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
        dfDollar11(item).data("over", pos < midpoint ? "before" : "after");
      } else {
        dfDollar11(list).data("over", "end");
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
      const target = dfDollar11(list).find(".sortable-item[data-over]")[0];
      const position = target ? dfDollar11(target).data("over") : "end";
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
      const target = button.disabled ? dfDollar11(item).find(`.sortable-move[data-move="${button.dataset.move === "up" ? "down" : "up"}"]`).get(0) : button;
      target?.focus();
    });
    list.addEventListener("keydown", (e) => {
      if (e.target.closest?.(".sortable-move"))
        return;
      const active = getActiveItem() || dfDollar11(list).find('.sortable-item[tabindex="0"]')[0];
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
init11();
new MutationObserver(init11).observe(document, { childList: true, subtree: true });

//# debugId=FB2300AB1289F1D564756E2164756E21
//# sourceMappingURL=data-display.js.map
