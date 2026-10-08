// dist/components/typewriter/typewriter.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.9.8") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals, defussQuery, componentState, bindComponent } = __df$shared;
var df$ = defussGlobals();
var dfDollar = defussQuery();
var typewriterStates = ["default", "paused", "done"];
var num = (el, key, fallback) => {
  const v = parseFloat(el.dataset[key]);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
};
var reducedMotion = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
var graphemes = (text) => globalThis.Intl?.Segmenter ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), (s) => s.segment) : Array.from(text);
function paint(tw, index, count) {
  const src = tw._sources[index];
  tw._text.textContent = src.chars.slice(0, count).join("");
  tw._text.className = `typewriter-text${src.className ? ` ${src.className}` : ""}`;
  tw._text.setAttribute("style", src.style);
  tw.dataset.index = String(index);
  tw._index = index;
  tw._count = count;
}
var phase = (tw, name) => {
  tw.dataset.phase = name;
};
function stop(tw) {
  clearTimeout(tw._timer);
  tw._timer = 0;
}
function keyDelay(tw, base) {
  if (!tw.hasAttribute("data-variable"))
    return base;
  return base * (0.5 + Math.random());
}
function step(tw) {
  if (!tw.isConnected)
    return stop(tw);
  const src = tw._sources[tw._index];
  const last = tw._index === tw._sources.length - 1;
  const loop = tw.hasAttribute("data-loop");
  const next = (fn, ms) => {
    tw._timer = setTimeout(() => fn(tw), ms);
  };
  if (tw._deleting) {
    if (tw._count > 0) {
      phase(tw, "deleting");
      paint(tw, tw._index, tw._count - 1);
      return next(step, keyDelay(tw, num(tw, "deleteSpeed", 35)));
    }
    tw._deleting = false;
    paint(tw, (tw._index + 1) % tw._sources.length, 0);
    return next(step, num(tw, "speed", 70));
  }
  if (tw._count < src.chars.length) {
    phase(tw, "typing");
    paint(tw, tw._index, tw._count + 1);
    return next(step, keyDelay(tw, num(tw, "speed", 70)));
  }
  tw.dispatchEvent(new CustomEvent("typewriter-typed", { bubbles: true, detail: { index: tw._index, text: src.text } }));
  if (last && !loop)
    return finish(tw);
  phase(tw, "holding");
  tw._deleting = true;
  return next(step, num(tw, "pause", 1500));
}
function finish(tw) {
  typewriterApi.setState(tw, "done", { index: tw._index });
  tw.dispatchEvent(new CustomEvent("typewriter-done", { bubbles: true, detail: { index: tw._index } }));
}
function stepInstant(tw) {
  if (!tw.isConnected)
    return stop(tw);
  const last = tw._index === tw._sources.length - 1;
  paint(tw, tw._index, tw._sources[tw._index].chars.length);
  phase(tw, "idle");
  if (last && !tw.hasAttribute("data-loop"))
    return finish(tw);
  tw._timer = setTimeout(() => {
    paint(tw, (tw._index + 1) % tw._sources.length, 0);
    stepInstant(tw);
  }, num(tw, "pause", 1500) + 1000);
}
function run(tw, delay = 0) {
  stop(tw);
  const go = () => reducedMotion() ? stepInstant(tw) : step(tw);
  if (delay)
    tw._timer = setTimeout(go, delay);
  else
    go();
}
function applyMarkup(_el, _stateName) {}
function triggerStateChange(tw, stateName, config, previous) {
  const count = tw._sources.length;
  const asked = config.index === undefined || config.index === "" ? NaN : Number(config.index);
  const pick = Number.isInteger(asked) ? Math.min(Math.max(asked, 0), count - 1) : undefined;
  switch (stateName) {
    case "default":
      if (pick === undefined && previous === "paused") {
        run(tw);
        break;
      }
      tw._deleting = false;
      paint(tw, pick ?? 0, 0);
      phase(tw, "idle");
      run(tw, config.immediate ? 0 : num(tw, "startDelay", 0));
      break;
    case "paused":
      stop(tw);
      phase(tw, "idle");
      break;
    case "done": {
      stop(tw);
      const index = pick ?? tw._index ?? 0;
      paint(tw, index, tw._sources[index].chars.length);
      phase(tw, "idle");
      break;
    }
  }
}
var typewriterApi = componentState({
  component: "typewriter",
  states: typewriterStates,
  apply: (tw, state, previous) => {
    tw.dataset.stateName = state.name;
    triggerStateChange(tw, state.name, state.config, previous.name);
  },
  markup: (el, state) => applyMarkup(el, state.name)
});
df$.typewriterApi = typewriterApi;
df$.typewriterStates = typewriterStates;
function init() {
  dfDollar(".typewriter:not([data-init])").toArray().forEach((tw) => {
    tw.dataset.init = "";
    const children = Array.from(tw.children);
    if (!children.length)
      return;
    tw._sources = children.map((c) => ({
      text: c.textContent ?? "",
      chars: graphemes(c.textContent ?? ""),
      className: c.getAttribute("class") ?? "",
      style: c.getAttribute("style") ?? ""
    }));
    children.forEach((c) => c.classList.add("typewriter-source"));
    const line = document.createElement("span");
    line.className = "typewriter-line";
    line.setAttribute("aria-hidden", "true");
    tw._text = document.createElement("span");
    tw._text.className = "typewriter-text";
    const cursor = document.createElement("span");
    cursor.className = "typewriter-cursor";
    line.append(tw._text, cursor);
    tw.append(line);
    if (tw.hasAttribute("data-reserve")) {
      const ghost = document.createElement("span");
      ghost.className = "typewriter-ghost";
      ghost.setAttribute("aria-hidden", "true");
      tw._sources.forEach((s) => {
        const g = document.createElement("span");
        g.textContent = s.text;
        dfDollar(ghost).append(g);
      });
      tw.append(ghost);
    }
    bindComponent(tw, typewriterApi);
    paint(tw, 0, 0);
    phase(tw, "idle");
    tw.dataset.stateName = "default";
    if (tw.dataset.trigger === "visible" && globalThis.IntersectionObserver) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          typewriterApi.setState(tw, "default", {});
        }
      });
      io.observe(tw);
    } else {
      typewriterApi.setState(tw, "default", {});
    }
  });
}
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

//# debugId=9D5D9310B530867364756E2164756E21
//# sourceMappingURL=primitives.js.map
