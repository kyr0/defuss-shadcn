// dist/components/presentation/presentation.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.9.8") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals, animateCount, bindGlobalKeys, clampIndex, coerceIndex, draw, entrance, anim, defussQuery, componentState, bindComponent } = __df$shared;
var df$ = defussGlobals();
var dfDollar = defussQuery();
var presentationStates = ["default", "notes", "fullscreen"];
var DEFAULT_IN = "fadeIn";
var DEFAULT_OUT = "fadeOut";
function channelFor(name) {
  if (!anim.names.includes(name)) {
    throw new Error(`presentation: unknown animation "${name}" (supported: ${anim.names.join(", ")})`);
  }
  return anim[name];
}
function animSpec(root, slide, phase, forward) {
  const p = phase === "in" ? "animIn" : "animOut";
  const pick = (suffix = "") => slide.dataset[p + suffix] ?? root.dataset[p + suffix];
  const travel = phase === "in" ? forward ? "east" : "west" : forward ? "west" : "east";
  const opts = { direction: pick("Direction") ?? travel };
  const num = (suffix) => {
    const n = parseFloat(pick(suffix) ?? "");
    return Number.isFinite(n) ? n : undefined;
  };
  if (num("Duration") !== undefined)
    opts.duration = num("Duration");
  if (num("Scale") !== undefined)
    opts.scale = num("Scale");
  if (num("Blocks") !== undefined)
    opts.blocks = Math.round(num("Blocks"));
  if (num("Stagger") !== undefined)
    opts.stagger = num("Stagger");
  if (pick("Easing"))
    opts.easing = pick("Easing");
  if (pick("Origin"))
    opts.origin = pick("Origin");
  if (pick("Distance"))
    opts.distance = pick("Distance");
  if (pick("Color"))
    opts.color = pick("Color");
  return { name: pick() || (phase === "in" ? DEFAULT_IN : DEFAULT_OUT), opts };
}
var probe = null;
function rgbOf(css) {
  if (!css || typeof document === "undefined")
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
function contrast(a, b) {
  const lum = (c) => {
    const [r, g, bl] = c.slice(0, 3).map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
function curtainColor(root, from, to, declared) {
  const surfaces = [from, to].map((s) => rgbOf(getComputedStyle(s).backgroundColor)).filter((c) => !!c && c[3] > 0.5);
  const cs = getComputedStyle(root);
  const candidates = [
    declared,
    cs.getPropertyValue("--presentation-accent").trim(),
    getComputedStyle(from).color,
    cs.getPropertyValue("--presentation-ink").trim(),
    cs.getPropertyValue("--presentation-paper").trim()
  ];
  for (const c of candidates) {
    if (!c)
      continue;
    const rgb = rgbOf(c);
    if (rgb && surfaces.every((bg) => contrast(rgb, bg) >= 1.6))
      return c;
  }
  return getComputedStyle(from).color;
}
var slidesOf = (root) => Array.from(dfDollar(root).find(":scope > [data-slide]").toArray());
var indexOf = (root) => coerceIndex(root.dataset.currentSlide, 0);
var nativeDeck = null;
function enterFullscreen(root) {
  const host = root;
  if (typeof host.requestFullscreen === "function") {
    host.requestFullscreen().then(() => {
      nativeDeck = root;
    }, () => {
      root.dataset.fullscreen = "";
    });
    return;
  }
  host.webkitRequestFullscreen?.();
  nativeDeck = root;
  root.dataset.fullscreen = "";
}
function exitFullscreen(root) {
  delete root.dataset.fullscreen;
  const doc = document;
  if ((doc.fullscreenElement ?? doc.webkitFullscreenElement) === root) {
    try {
      (doc.exitFullscreen?.bind(doc) ?? doc.webkitExitFullscreen?.bind(doc))?.();
    } catch {}
  }
  if (nativeDeck === root)
    nativeDeck = null;
}
function applyMarkup(root, stateName, config = {}) {
  const slides = slidesOf(root);
  const want = config.index ?? config.slide;
  if (want !== undefined && slides.length) {
    const target = slides[clampIndex(want, slides.length)];
    slides.forEach((slide) => {
      const on = slide === target;
      dfDollar(slide).attr("data-active", on ? "" : null).attr("inert", on ? null : "").attr("aria-hidden", String(!on));
    });
  }
  if (stateName === "notes")
    root.toggleAttribute("data-notes", config.value !== false);
  else if (typeof config.notes === "boolean")
    root.toggleAttribute("data-notes", config.notes);
  else if (stateName === "default" && want === undefined && config.fullscreen === undefined)
    root.removeAttribute("data-notes");
}
function triggerStateChange(root, stateName, config = {}) {
  if (!presentationStates.includes(stateName)) {
    throw new Error(`presentation: unknown state "${stateName}" (supported: ${presentationStates.join(", ")})`);
  }
  const want = config.index ?? config.slide;
  if (stateName !== "notes" && typeof config.notes === "boolean")
    root.toggleAttribute("data-notes", config.notes);
  if (stateName === "default") {
    if (want !== undefined) {
      const to = clampIndex(want, slidesOf(root).length);
      if (to !== indexOf(root))
        root._presentationActivate?.(to);
    }
    if (want === undefined && config.notes === undefined && config.fullscreen === undefined) {
      delete root.dataset.notes;
      exitFullscreen(root);
    }
    return;
  }
  if (stateName === "notes") {
    root.toggleAttribute("data-notes", config.value !== false);
    return;
  }
  if (config.value === false)
    exitFullscreen(root);
  else
    enterFullscreen(root);
}
var presentationApi = componentState({
  component: "presentation",
  states: presentationStates,
  apply: (root, state) => triggerStateChange(root, state.name, state.config),
  read: (root, state) => {
    return {
      name: root.dataset.stateName || "default",
      config: {
        ...state.config,
        slide: indexOf(root),
        notes: root.hasAttribute("data-notes"),
        fullscreen: root.hasAttribute("data-fullscreen")
      }
    };
  },
  markup: (el, state) => applyMarkup(el, state.name, state.config)
});
df$.presentationApi = presentationApi;
df$.presentationStates = presentationStates;
var keysBound = false;
function bindKeyboard() {
  if (keysBound)
    return;
  keysBound = true;
  bindGlobalKeys((e) => {
    const target = e.target;
    const root = target?.closest(".presentation") ?? (dfDollar(".presentation").get(0) ?? null);
    if (!root)
      return;
    if (e.key === " " && target?.closest('button, a, [role="button"]'))
      return;
    const total = slidesOf(root).length;
    const go = (index, forward) => root._presentationActivate?.(index, forward);
    const step = (delta) => {
      const next = indexOf(root) + delta;
      if (root.hasAttribute("data-loop") && total > 1)
        go((next + total) % total, delta > 0);
      else
        go(next, delta > 0);
    };
    let handled = true;
    switch (e.key) {
      case "ArrowRight":
      case "PageDown":
      case " ":
        step(1);
        break;
      case "ArrowLeft":
      case "PageUp":
        step(-1);
        break;
      case "Home":
        go(0);
        break;
      case "End":
        go(total - 1);
        break;
      case "n":
      case "N":
        root.toggleAttribute("data-notes");
        break;
      case "f":
      case "F":
        triggerStateChange(root, "fullscreen", { value: !root.hasAttribute("data-fullscreen") });
        break;
      default:
        handled = false;
    }
    if (!handled)
      return;
    e.preventDefault();
    return true;
  });
}
var hashBound = false;
function bindHash() {
  if (hashBound)
    return;
  hashBound = true;
  addEventListener("hashchange", () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id)
      return;
    const slide = dfDollar("#" + CSS.escape(id)).get(0);
    const root = slide?.closest(".presentation");
    if (root && slide)
      root._presentationActivate?.(slidesOf(root).indexOf(slide));
  });
}
var fullscreenBound = false;
function bindFullscreen() {
  if (fullscreenBound)
    return;
  fullscreenBound = true;
  document.addEventListener("fullscreenchange", () => {
    const el = document.fullscreenElement;
    if (el?.classList.contains("presentation"))
      el.dataset.fullscreen = "";
    if (!el && nativeDeck) {
      delete nativeDeck.dataset.fullscreen;
      nativeDeck = null;
    }
  });
}
function init() {
  dfDollar(".presentation:not([data-init])").toArray().forEach((root) => {
    root.dataset.init = "";
    bindComponent(root, presentationApi);
    const enter = (target) => {
      const slides = slidesOf(root);
      slides.forEach((slide) => {
        const on = slide === target;
        slide.toggleAttribute("data-active", on);
        slide.inert = !on;
        slide.setAttribute("aria-hidden", String(!on));
        dfDollar(slide).find("video[autoplay]").toArray().forEach((video) => {
          if (on) {
            video.currentTime = 0;
            video.play()?.catch(() => {});
          } else
            video.pause();
        });
      });
      dfDollar(target).find("[data-count]").toArray().forEach((el) => animateCount(el));
      dfDollar(target).find("[data-df-entrance]").toArray().forEach((el) => {
        entrance(el);
      });
      dfDollar(target).find("[data-df-draw]").toArray().forEach((el) => {
        draw(el);
      });
    };
    const transition = (from, to, forward) => {
      root._presentationSettle?.();
      root._presentationSettle = undefined;
      const inSpec = animSpec(root, to, "in", forward);
      if (!from || from === to) {
        enter(to);
        channelFor(inSpec.name === "blocksIn" ? "fadeIn" : inSpec.name).play(to, inSpec.opts);
        return;
      }
      if (inSpec.name === "blocksIn") {
        const cfg = {
          ...inSpec.opts,
          duration: (inSpec.opts.duration ?? 1500) / 2,
          color: curtainColor(root, from, to, inSpec.opts.color)
        };
        root.setAttribute("data-curtain", "");
        const cover = channelFor("blocksIn").play(from, cfg);
        let flipped = false;
        const flip = () => {
          if (flipped)
            return;
          flipped = true;
          cover.reset();
          enter(to);
          root.removeAttribute("data-curtain");
          const reveal = channelFor("blocksOut").play(to, cfg);
          root._presentationSettle = () => reveal.finish();
        };
        root._presentationSettle = () => {
          cover.finish();
          flip();
        };
        cover.finished.then(flip);
        return;
      }
      const outSpec = animSpec(root, from, "out", forward);
      from.setAttribute("data-leaving", "");
      enter(to);
      const arriving = channelFor(inSpec.name).play(to, inSpec.opts);
      const leaving = channelFor(outSpec.name === "blocksOut" ? DEFAULT_OUT : outSpec.name).play(from, outSpec.opts);
      let done = false;
      const cleanup = () => {
        if (done)
          return;
        done = true;
        from.removeAttribute("data-leaving");
        leaving.reset();
      };
      leaving.finished.then(cleanup);
      root._presentationSettle = () => {
        arriving.finish();
        cleanup();
      };
    };
    let booted = false;
    const activate = (index, forward) => {
      const slides = slidesOf(root);
      if (slides.length === 0)
        return;
      const clamped = clampIndex(index, slides.length);
      const previous = booted ? slides.find((s) => s.hasAttribute("data-active")) : undefined;
      const fromIndex = previous ? slides.indexOf(previous) : -1;
      if (booted && previous === slides[clamped])
        return;
      booted = true;
      transition(previous, slides[clamped], forward ?? clamped >= fromIndex);
      root.dataset.currentSlide = String(clamped);
      const counter = dfDollar(root).find(".presentation-counter").get(0);
      if (counter)
        counter.textContent = `${clamped + 1} / ${slides.length}`;
      const progress = dfDollar(root).find("progress.presentation-progress").get(0);
      if (progress) {
        progress.setAttribute("max", String(slides.length));
        progress.setAttribute("value", String(clamped + 1));
      }
      const loop = root.hasAttribute("data-loop");
      const prev = dfDollar(root).find('[data-presentation-action="prev"]').get(0) ?? null;
      const next = dfDollar(root).find('[data-presentation-action="next"]').get(0) ?? null;
      if (prev)
        prev.disabled = clamped === 0 && !loop;
      if (next)
        next.disabled = clamped === slides.length - 1 && !loop;
      const pad = (n) => String(n).padStart(2, "0");
      const number = dfDollar(slides[clamped]).find(".presentation-slide-number").get(0);
      if (number)
        number.textContent = `${pad(clamped + 1)}⁄${pad(slides.length)}`;
    };
    root._presentationActivate = activate;
    const applyScale = () => {
      const cs = getComputedStyle(root);
      const w = parseFloat(cs.getPropertyValue("--presentation-width")) || 1600;
      const h = parseFloat(cs.getPropertyValue("--presentation-height")) || 900;
      const box = root.getBoundingClientRect();
      const scale = Math.min(box.width / w, box.height / h);
      if (Number.isFinite(scale) && scale > 0)
        root.style.setProperty("--presentation-scale", String(scale));
    };
    new ResizeObserver(applyScale).observe(root);
    root.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("[data-presentation-action]");
      if (!btn || !root.contains(btn))
        return;
      const total = slidesOf(root).length;
      const at = indexOf(root);
      switch (btn.getAttribute("data-presentation-action")) {
        case "next":
          activate(root.hasAttribute("data-loop") ? (at + 1) % total : at + 1, true);
          break;
        case "prev":
          activate(root.hasAttribute("data-loop") && at === 0 ? total - 1 : at - 1, false);
          break;
        case "first":
          activate(0);
          break;
        case "last":
          activate(total - 1);
          break;
        case "notes":
          root.toggleAttribute("data-notes");
          break;
        case "fullscreen":
          triggerStateChange(root, "fullscreen", { value: !root.hasAttribute("data-fullscreen") });
          break;
      }
    });
    bindKeyboard();
    bindHash();
    bindFullscreen();
    const hashId = decodeURIComponent(location.hash.slice(1));
    const hashIndex = hashId ? slidesOf(root).findIndex((s) => s.id === hashId) : -1;
    activate(hashIndex >= 0 ? hashIndex : coerceIndex(root.dataset.currentSlide, 0));
    applyScale();
  });
}
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

//# debugId=B624D127846E80DB64756E2164756E21
//# sourceMappingURL=presentations.js.map
