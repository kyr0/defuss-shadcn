// dist/components/progress/progress.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.9.5") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals, defussQuery, componentState, bindComponent, textLocale } = __df$shared;
var df$ = defussGlobals();
var dfDollar = defussQuery();
var progressStates = ["default", "indeterminate", "complete"];
var SELECTOR = "progress.progress";
var reducedMotion = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
var maxOf = (el) => el.max || 1;
var clamp = (el, v) => Math.max(0, Math.min(maxOf(el), Number(v) || 0));
var round = (v) => Math.round(v * 10) / 10;
var formats = new Map;
var fmtFor = (node) => {
  const locale = textLocale(node);
  if (!formats.has(locale)) {
    formats.set(locale, {
      pct: new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }),
      num: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
    });
  }
  return formats.get(locale);
};
function text(out, el) {
  const { pct: pctFmt, num: numFmt } = fmtFor(out);
  const v = el.position < 0 ? null : el.value;
  const max = maxOf(el);
  if (v == null)
    return out.dataset.indeterminate ?? "…";
  const pct = v / max;
  const tpl = out.dataset.template;
  if (tpl) {
    return tpl.replaceAll("{value}", numFmt.format(Math.round(v))).replaceAll("{max}", numFmt.format(max)).replaceAll("{percent}", pctFmt.format(pct));
  }
  switch (out.dataset.format) {
    case "fraction":
      return `${numFmt.format(Math.round(v))} / ${numFmt.format(max)}`;
    case "value":
      return numFmt.format(Math.round(v));
    default:
      return pctFmt.format(pct);
  }
}
function outputsOf(el) {
  const outs = new Set;
  if (el.id)
    dfDollar(`output.progress-value[for~="${CSS.escape(el.id)}"]`).toArray().forEach((o) => outs.add(o));
  dfDollar(el).closest(".progress-field").find(".progress-value").toArray().forEach((o) => {
    if (!o.htmlFor?.value || el.id && o.htmlFor.contains(el.id))
      outs.add(o);
  });
  return [...outs];
}
function paint(el) {
  const indeterminate = el.position < 0;
  const pct = indeterminate ? 0 : el.value / maxOf(el);
  el.dataset.level = pct < 0.34 ? "low" : pct < 0.67 ? "mid" : "high";
  el.toggleAttribute("data-complete", !indeterminate && el.value >= maxOf(el));
  let spoken = "";
  for (const out of outputsOf(el)) {
    const t = text(out, el);
    out.value = t;
    out.dataset.text = t;
    out.style.setProperty("--progress-pct", `${(pct * 100).toFixed(2)}%`);
    if (out.dataset.format === "fraction" || out.dataset.template)
      spoken ||= t;
  }
  if (spoken)
    el.setAttribute("aria-valuetext", spoken);
  else
    el.removeAttribute("aria-valuetext");
}
function stopTween(el) {
  if (el._raf)
    cancelAnimationFrame(el._raf);
  el._raf = 0;
}
function commit(el, v, emit = true) {
  const before = el.dataset.stateName;
  el.value = v;
  paint(el);
  const done = v >= maxOf(el);
  el.dataset.stateName = done ? "complete" : "default";
  if (emit)
    el.dispatchEvent(new CustomEvent("progress:change", { bubbles: true, detail: { value: el.value, max: el.max, percent: el.value / maxOf(el) } }));
  if (done && before !== "complete")
    el.dispatchEvent(new CustomEvent("progress:completed", { bubbles: true }));
}
function tween(el, to, duration) {
  stopTween(el);
  const from = el.position < 0 ? 0 : el.value;
  if (!(duration > 0) || reducedMotion() || from === to)
    return commit(el, to);
  const t0 = performance.now();
  el.dataset.stateName = "default";
  el.toggleAttribute("data-running", true);
  const frame = (now) => {
    const k = Math.min(1, (now - t0) / duration);
    if (k < 1) {
      el.value = round(from + (to - from) * k);
      paint(el);
      el._raf = requestAnimationFrame(frame);
    } else {
      el._raf = 0;
      el.removeAttribute("data-running");
      commit(el, to);
    }
  };
  el._raf = requestAnimationFrame(frame);
}
var stepOf = (el) => parseFloat(el.dataset.step || "") || maxOf(el) / 10;
var durationOf = (el) => parseFloat(el.dataset.duration || "") || 3000;
function applyMarkup(el, stateName, config) {
  const authored = el.position < 0 ? null : el.value;
  if (config?.max != null && Number(config.max) !== el.max)
    el.max = Number(config.max);
  if (stateName === "indeterminate")
    dfDollar(el).attr("value", null);
  else
    el.value = stateName === "complete" ? maxOf(el) : clamp(el, config?.value != null ? config.value : authored ?? 0);
  const indeterminate = el.position < 0;
  const pct = indeterminate ? 0 : el.value / maxOf(el);
  dfDollar(el).attr("data-level", pct < 0.34 ? "low" : pct < 0.67 ? "mid" : "high");
  dfDollar(el).attr("data-complete", !indeterminate && el.value >= maxOf(el) ? "" : null);
  const live = el.id ? dfDollar("#" + CSS.escape(el.id)).get(0) : null;
  const spoken = (live ? outputsOf(live) : []).filter((out) => out.dataset.format === "fraction" || out.dataset.template).map((out) => text(out, el))[0];
  dfDollar(el).attr("aria-valuetext", spoken || null);
}
function triggerStateChange(el, stateName, config) {
  switch (stateName) {
    case "default": {
      if (config.max != null && Number(config.max) !== el.max)
        el.max = Number(config.max);
      const to = config.value != null ? clamp(el, config.value) : clamp(el, el._authored ?? 0);
      if (config.duration > 0)
        tween(el, to, config.duration);
      else {
        stopTween(el);
        el.removeAttribute("data-running");
        commit(el, to);
      }
      break;
    }
    case "indeterminate":
      stopTween(el);
      el.removeAttribute("data-running");
      el.removeAttribute("value");
      paint(el);
      el.dataset.stateName = "indeterminate";
      break;
    case "complete":
      if (config.duration > 0)
        tween(el, maxOf(el), config.duration);
      else {
        stopTween(el);
        el.removeAttribute("data-running");
        commit(el, maxOf(el));
      }
      break;
  }
}
var progressApi = componentState({
  component: "progress",
  states: progressStates,
  apply: (el, state) => triggerStateChange(el, state.name, state.config),
  read: (el, state) => {
    const indeterminate = el.position < 0;
    return {
      name: el.dataset.stateName || "default",
      config: { ...state.config, value: indeterminate ? null : el.value, max: el.max, percent: indeterminate ? null : el.value / maxOf(el) }
    };
  },
  markup: (el, state) => applyMarkup(el, state.name, state.config)
});
df$.progressApi = progressApi;
df$.progressStates = progressStates;
function run(el, command) {
  const now = el.position < 0 ? 0 : el.value;
  switch (command) {
    case "reset":
      progressApi.setState(el, "default", { value: 0 });
      break;
    case "increment":
      progressApi.setState(el, "default", { value: now + stepOf(el) });
      break;
    case "decrement":
      progressApi.setState(el, "default", { value: now - stepOf(el) });
      break;
    case "complete":
      progressApi.setState(el, "complete");
      break;
    case "indeterminate":
      progressApi.setState(el, "indeterminate");
      break;
    case "play": {
      if (now >= maxOf(el))
        el.value = 0;
      const rest = 1 - (el.position < 0 ? 0 : el.value) / maxOf(el);
      progressApi.setState(el, "default", { value: maxOf(el), duration: durationOf(el) * rest });
      break;
    }
    case "pause":
      stopTween(el);
      el.removeAttribute("data-running");
      commit(el, el.value);
      break;
    default:
      return false;
  }
  return true;
}
var COMMANDS = ["reset", "increment", "decrement", "complete", "indeterminate", "play", "pause"];
function init() {
  dfDollar(`${SELECTOR}:not([data-init])`).toArray().forEach((el) => {
    el.dataset.init = "";
    bindComponent(el, progressApi);
    el._authored = el.position < 0 ? null : el.value;
    el.dataset.stateName = el.position < 0 ? "indeterminate" : el.value >= maxOf(el) ? "complete" : "default";
    el.addEventListener("command", (e) => {
      const c = String(e.command || "");
      if (c.startsWith("--"))
        run(el, c.slice(2));
    });
    for (const c of COMMANDS)
      el.addEventListener(`progress:${c}`, () => run(el, c));
    paint(el);
  });
}
if (!("commandForElement" in HTMLButtonElement.prototype) && !document.__progressCommandInit) {
  document.__progressCommandInit = true;
  document.addEventListener("click", (e) => {
    const btn = e.target instanceof Element ? e.target.closest('button[commandfor][command^="--"]') : null;
    const el = btn && dfDollar("#" + CSS.escape(btn.getAttribute("commandfor"))).get(0);
    if (el?.matches(`${SELECTOR}[data-init]`))
      run(el, btn.getAttribute("command").slice(2));
  });
}
new MutationObserver((records) => {
  for (const r of records) {
    const el = r.target;
    if (el instanceof HTMLProgressElement && el.matches(`${SELECTOR}[data-init]`) && !el._raf) {
      paint(el);
      el.dataset.stateName = el.position < 0 ? "indeterminate" : el.value >= maxOf(el) ? "complete" : "default";
    }
  }
}).observe(document, { attributes: true, subtree: true, attributeFilter: ["value", "max"] });
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

// dist/components/radial-progress/radial-progress.js
var __df$core2 = globalThis.df$;
var __df$shared2 = __df$core2 && __df$core2.shadcn && __df$core2.shadcn.shared;
if (!__df$shared2 || __df$shared2.abi !== "0.9.5") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals2, defussQuery: defussQuery2, componentState: componentState2, bindComponent: bindComponent2, textLocale: textLocale2 } = __df$shared2;
var df$2 = defussGlobals2();
var dfDollar2 = defussQuery2();
var radialProgressStates = ["default", "indeterminate", "complete"];
var SELECTOR2 = ".radial-progress";
var reducedMotion2 = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
var maxOf2 = (el) => parseFloat(el.getAttribute("aria-valuemax") || "") || 100;
var valueOf = (el) => el.hasAttribute("aria-valuenow") ? parseFloat(el.getAttribute("aria-valuenow")) || 0 : null;
var clamp2 = (el, v) => Math.max(0, Math.min(maxOf2(el), Number(v) || 0));
var round2 = (v) => Math.round(v * 10) / 10;
var formats2 = new Map;
var fmtFor2 = (node) => {
  const locale = textLocale2(node);
  if (!formats2.has(locale)) {
    formats2.set(locale, {
      pct: new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }),
      num: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
    });
  }
  return formats2.get(locale);
};
function text2(el) {
  const { pct: pctFmt, num: numFmt } = fmtFor2(el);
  const v = valueOf(el);
  const max = maxOf2(el);
  if (v == null)
    return el.dataset.indeterminate ?? "…";
  const tpl = el.dataset.template;
  if (tpl) {
    return tpl.replaceAll("{value}", numFmt.format(Math.round(v))).replaceAll("{max}", numFmt.format(max)).replaceAll("{percent}", pctFmt.format(v / max));
  }
  switch (el.dataset.format) {
    case "fraction":
      return `${numFmt.format(Math.round(v))} / ${numFmt.format(max)}`;
    case "value":
      return numFmt.format(Math.round(v));
    default:
      return pctFmt.format(v / max);
  }
}
function labelTarget(el) {
  const slot = dfDollar2(el).find(":scope > .radial-progress-value").get(0);
  if (slot)
    return slot;
  return el.children.length === 0 ? el : null;
}
function paint2(el) {
  const v = valueOf(el);
  const pct = v == null ? 0 : v / maxOf2(el);
  if (v != null)
    el.style.setProperty("--value", String(round2(pct * 100)));
  else
    el.style.removeProperty("--value");
  el.dataset.level = pct < 0.34 ? "low" : pct < 0.67 ? "mid" : "high";
  el.toggleAttribute("data-complete", v != null && v >= maxOf2(el));
  const target = labelTarget(el);
  const t = text2(el);
  if (target)
    target.textContent = t;
  if (el.dataset.format === "fraction" || el.dataset.template)
    el.setAttribute("aria-valuetext", t);
  else if (!el._authorValuetext)
    el.removeAttribute("aria-valuetext");
}
function stopTween2(el) {
  if (el._raf)
    cancelAnimationFrame(el._raf);
  el._raf = 0;
  el.removeAttribute("data-running");
}
function setValue(el, v) {
  if (!el.hasAttribute("aria-valuemin"))
    el.setAttribute("aria-valuemin", "0");
  el.setAttribute("aria-valuenow", String(round2(v)));
  paint2(el);
}
function commit2(el, v) {
  const before = el.dataset.stateName;
  setValue(el, v);
  const done = v >= maxOf2(el);
  el.dataset.stateName = done ? "complete" : "default";
  el.dispatchEvent(new CustomEvent("progress:change", { bubbles: true, detail: { value: v, max: maxOf2(el), percent: v / maxOf2(el) } }));
  if (done && before !== "complete")
    el.dispatchEvent(new CustomEvent("progress:completed", { bubbles: true }));
}
function tween2(el, to, duration) {
  stopTween2(el);
  const from = valueOf(el) ?? 0;
  if (!(duration > 0) || reducedMotion2() || from === to)
    return commit2(el, to);
  const t0 = performance.now();
  el.dataset.stateName = "default";
  el.setAttribute("data-running", "");
  const frame = (now) => {
    const k = Math.min(1, (now - t0) / duration);
    if (k < 1) {
      setValue(el, from + (to - from) * k);
      el._raf = requestAnimationFrame(frame);
    } else {
      stopTween2(el);
      commit2(el, to);
    }
  };
  el._raf = requestAnimationFrame(frame);
}
var stepOf2 = (el) => parseFloat(el.dataset.step || "") || maxOf2(el) / 10;
var durationOf2 = (el) => parseFloat(el.dataset.duration || "") || 3000;
function applyMarkup2(el, stateName, config) {
  const authored = valueOf(el);
  el._authorValuetext = el.hasAttribute("aria-valuetext") && !el.dataset.format && !el.dataset.template;
  if (!el.hasAttribute("aria-valuemin"))
    dfDollar2(el).attr("aria-valuemin", "0");
  if (config?.max != null && Number(config.max) !== maxOf2(el))
    dfDollar2(el).attr("aria-valuemax", String(config.max));
  if (stateName === "indeterminate") {
    dfDollar2(el).attr("aria-valuenow", null);
    paint2(el);
  } else
    setValue(el, stateName === "complete" ? maxOf2(el) : clamp2(el, config?.value != null ? config.value : authored ?? 0));
}
function triggerStateChange2(el, stateName, config) {
  switch (stateName) {
    case "default": {
      if (config.max != null && Number(config.max) !== maxOf2(el))
        el.setAttribute("aria-valuemax", String(config.max));
      const to = clamp2(el, config.value != null ? config.value : el._authored ?? 0);
      if (config.duration > 0)
        tween2(el, to, config.duration);
      else {
        stopTween2(el);
        commit2(el, to);
      }
      break;
    }
    case "indeterminate":
      stopTween2(el);
      el.removeAttribute("aria-valuenow");
      paint2(el);
      el.dataset.stateName = "indeterminate";
      break;
    case "complete":
      if (config.duration > 0)
        tween2(el, maxOf2(el), config.duration);
      else {
        stopTween2(el);
        commit2(el, maxOf2(el));
      }
      break;
  }
}
var radialProgressApi = componentState2({
  component: "radial-progress",
  states: radialProgressStates,
  apply: (el, state) => triggerStateChange2(el, state.name, state.config),
  read: (el, state) => {
    const v = valueOf(el);
    return {
      name: el.dataset.stateName || "default",
      config: { ...state.config, value: v, max: maxOf2(el), percent: v == null ? null : v / maxOf2(el) }
    };
  },
  markup: (el, state) => applyMarkup2(el, state.name, state.config)
});
df$2.radialProgressApi = radialProgressApi;
df$2.radialProgressStates = radialProgressStates;
function run2(el, command) {
  const now = valueOf(el) ?? 0;
  switch (command) {
    case "reset":
      radialProgressApi.setState(el, "default", { value: 0 });
      break;
    case "increment":
      radialProgressApi.setState(el, "default", { value: now + stepOf2(el) });
      break;
    case "decrement":
      radialProgressApi.setState(el, "default", { value: now - stepOf2(el) });
      break;
    case "complete":
      radialProgressApi.setState(el, "complete");
      break;
    case "indeterminate":
      radialProgressApi.setState(el, "indeterminate");
      break;
    case "play": {
      if (now >= maxOf2(el))
        setValue(el, 0);
      const rest = 1 - (valueOf(el) ?? 0) / maxOf2(el);
      radialProgressApi.setState(el, "default", { value: maxOf2(el), duration: durationOf2(el) * rest });
      break;
    }
    case "pause": {
      const held = valueOf(el) ?? 0;
      stopTween2(el);
      commit2(el, held);
      break;
    }
  }
}
var COMMANDS2 = ["reset", "increment", "decrement", "complete", "indeterminate", "play", "pause"];
function init2() {
  dfDollar2(`${SELECTOR2}:not([data-init])`).toArray().forEach((el) => {
    el.dataset.init = "";
    bindComponent2(el, radialProgressApi);
    el._authorValuetext = el.hasAttribute("aria-valuetext") && !el.dataset.format && !el.dataset.template;
    if (!el.hasAttribute("aria-valuenow") && el.style.getPropertyValue("--value") !== "" && el.getAttribute("role") === "progressbar") {
      el.setAttribute("aria-valuenow", String(parseFloat(el.style.getPropertyValue("--value")) / 100 * maxOf2(el)));
    }
    if (!el.hasAttribute("role"))
      el.setAttribute("role", "progressbar");
    if (!el.hasAttribute("aria-valuemin"))
      el.setAttribute("aria-valuemin", "0");
    el._authored = valueOf(el);
    const v = valueOf(el);
    el.dataset.stateName = v == null ? "indeterminate" : v >= maxOf2(el) ? "complete" : "default";
    el.addEventListener("command", (e) => {
      const c = String(e.command || "");
      if (c.startsWith("--"))
        run2(el, c.slice(2));
    });
    for (const c of COMMANDS2)
      el.addEventListener(`progress:${c}`, () => run2(el, c));
    paint2(el);
  });
}
if (!("commandForElement" in HTMLButtonElement.prototype) && !document.__radialProgressCommandInit) {
  document.__radialProgressCommandInit = true;
  document.addEventListener("click", (e) => {
    const btn = e.target instanceof Element ? e.target.closest('button[commandfor][command^="--"]') : null;
    const el = btn && dfDollar2("#" + CSS.escape(btn.getAttribute("commandfor"))).get(0);
    if (el?.matches(`${SELECTOR2}[data-init]`))
      run2(el, btn.getAttribute("command").slice(2));
  });
}
new MutationObserver((records) => {
  for (const r of records) {
    const el = r.target;
    if (el instanceof HTMLElement && el.matches(`${SELECTOR2}[data-init]`) && !el._raf) {
      paint2(el);
      const v = valueOf(el);
      el.dataset.stateName = v == null ? "indeterminate" : v >= maxOf2(el) ? "complete" : "default";
    }
  }
}).observe(document, { attributes: true, subtree: true, attributeFilter: ["aria-valuenow", "aria-valuemax"] });
init2();
new MutationObserver(init2).observe(document, { childList: true, subtree: true });

// dist/components/alert-dialog/alert-dialog.js
var __df$core3 = globalThis.df$;
var __df$shared3 = __df$core3 && __df$core3.shadcn && __df$core3.shadcn.shared;
if (!__df$shared3 || __df$shared3.abi !== "0.9.5") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals3, defussQuery: defussQuery3, componentState: componentState3, bindComponent: bindComponent3 } = __df$shared3;
var df$3 = defussGlobals3();
var dfDollar3 = defussQuery3();
var alertDialogStates = ["default", "open"];
function applyMarkup3(el, stateName) {
  dfDollar3(el).attr("open", stateName === "open" ? "" : null);
}
function triggerStateChange3(dialog, stateName, _config) {
  switch (stateName) {
    case "default":
      if (dialog.open)
        dialog.close();
      break;
    case "open":
      if (!dialog.open)
        dialog.showModal();
      break;
  }
}
var alertDialogApi = componentState3({
  component: "alert-dialog",
  states: alertDialogStates,
  apply: (dialog, state) => triggerStateChange3(dialog, state.name, state.config),
  markup: (el, state) => applyMarkup3(el, state.name)
});
df$3.alertDialogApi = alertDialogApi;
df$3.alertDialogStates = alertDialogStates;
function init3() {
  dfDollar3("[data-alert-dialog-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const dialog = dfDollar3("#" + CSS.escape(trigger.dataset.alertDialogTrigger)).get(0);
    if (!dialog)
      return;
    trigger.addEventListener("click", () => {
      dialog._trigger = trigger;
      dialog.showModal();
    });
  });
  dfDollar3("dialog.alert-dialog:not([data-init])").toArray().forEach((dialog) => {
    dialog.dataset.init = "";
    bindComponent3(dialog, alertDialogApi);
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
    });
    dfDollar3(dialog).find("[data-alert-dialog-close]").toArray().forEach((btn) => {
      btn.addEventListener("click", () => {
        dialog.close();
      });
    });
    dialog.addEventListener("close", () => {
      if (dialog.open)
        return;
      dialog.dataset.stateName = "default";
      if (dialog._trigger)
        dialog._trigger.focus();
    });
  });
}
init3();
new MutationObserver(init3).observe(document, { childList: true, subtree: true });

// dist/components/toast/toast.js
var __df$core4 = globalThis.df$;
var __df$shared4 = __df$core4 && __df$core4.shadcn && __df$core4.shadcn.shared;
if (!__df$shared4 || __df$shared4.abi !== "0.9.5") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals4, defussQuery: defussQuery4, anim, componentState: componentState4, bindComponent: bindComponent4 } = __df$shared4;
var df$4 = defussGlobals4();
var dfDollar4 = defussQuery4();
var toastStates = ["default"];
function applyMarkup4(_el, _stateName) {}
function triggerStateChange4(container, stateName, _config) {
  if (stateName !== "default")
    return;
  dfDollar4(container).find(".toast").toArray().forEach((el) => toastDismiss(el));
}
var toastApi = componentState4({
  component: "toast",
  states: toastStates,
  apply: (container, state) => {
    triggerStateChange4(container, state.name, state.config);
  },
  read: (container, state) => {
    return {
      name: container.dataset.stateName || "default",
      config: { ...state.config, count: dfDollar4(container).find(".toast").toArray().length }
    };
  },
  markup: (el, state) => applyMarkup4(el, state.name)
});
df$4.toastApi = toastApi;
df$4.toastStates = toastStates;
var DURATION = 4000;
var MAX_VISIBLE = 3;
var toastCallbacks = new WeakMap;
var toastContainer = dfDollar4("#toast-container").get(0);
if (!toastContainer) {
  toastContainer = document.createElement("div");
  toastContainer.id = "toast-container";
  toastContainer.className = "toast-container";
  toastContainer.setAttribute("aria-label", "Notifications");
  toastContainer.setAttribute("data-position", "bottom-right");
  dfDollar4(document.body).append(toastContainer);
}
var stackToasts = (container) => {
  const toasts = [...dfDollar4(container).find(".toast:not([data-leaving])").toArray()];
  const piled = container.dataset.stack === "pile" && !container.hasAttribute("data-expanded") && toasts.length > 1;
  const top = (container.dataset.position || "").startsWith("top");
  const sheets = top ? "stack-bottom" : "stack-top";
  let offset = 0;
  const order = container.dataset.stack === "pile" ? [...toasts].reverse() : toasts;
  order.forEach((t, i) => {
    const newest = i === 0;
    t.style.setProperty("--toast-stack", `${piled ? 0 : offset}px`);
    t.toggleAttribute("data-piled", piled && !newest);
    t.classList.toggle(sheets, piled && newest);
    if (piled && newest)
      t.dataset.more = String(toasts.length - 1);
    else
      delete t.dataset.more;
    if (!piled)
      offset += t.getBoundingClientRect().height + 8;
  });
};
var toastDismiss = (el, callback) => {
  if (!el || !el.parentNode || el.hasAttribute("data-leaving"))
    return;
  const container = el.parentNode;
  const out = el._animation?.out;
  if (out && anim[out]) {
    el.setAttribute("data-leaving", "");
    stackToasts(container);
    anim[out].play(el, { duration: el._animation.duration ?? 350, direction: el._animation.direction }).finished.then(() => {
      try {
        el.hidePopover();
      } catch {}
      dfDollar4(el).remove();
      stackToasts(container);
      if (callback)
        callback();
    });
    return;
  }
  el.animate([{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(0.5rem)" }], { duration: 200, easing: "ease", fill: "forwards" }).finished.then(() => {
    try {
      el.hidePopover();
    } catch {}
    dfDollar4(el).remove();
    stackToasts(container);
    if (callback)
      callback();
  });
};
var toastCreate = (options) => {
  const o = typeof options === "string" ? { title: options } : options;
  const { title, description, variant, action, onDismiss, size, density, animation, aura } = o;
  const duration = o.duration != null ? o.duration : DURATION;
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", variant === "destructive" ? "alert" : "status");
  el.setAttribute("aria-live", variant === "destructive" ? "assertive" : "polite");
  el.setAttribute("aria-atomic", "true");
  el.setAttribute("popover", "manual");
  if (variant)
    el.setAttribute("data-variant", variant);
  if (size)
    el.setAttribute("data-size", size);
  if (density)
    el.setAttribute("data-density", density);
  const icons = {
    success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
    warning: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    destructive: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>'
  };
  const contentEl = document.createElement("div");
  contentEl.className = "toast-content";
  if (variant && icons[variant]) {
    dfDollar4(contentEl).append(dfDollar4(icons[variant]));
  }
  const textDiv = document.createElement("div");
  textDiv.className = "toast-text";
  if (title) {
    const p = document.createElement("p");
    p.className = "toast-title";
    dfDollar4(p).text(title);
    dfDollar4(textDiv).append(p);
  }
  if (description) {
    const p = document.createElement("p");
    p.className = "toast-description";
    dfDollar4(p).text(description);
    dfDollar4(textDiv).append(p);
  }
  dfDollar4(contentEl).append(textDiv);
  const closeBtn = document.createElement("button");
  closeBtn.className = "toast-close";
  closeBtn.setAttribute("aria-label", "Dismiss");
  closeBtn.dataset.toastClose = "";
  dfDollar4(closeBtn).html('<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>');
  dfDollar4(contentEl).append(closeBtn);
  let host = el;
  if (aura) {
    const style = aura === true ? "" : String(aura);
    el.classList.add("aura", "aura-md");
    if (style)
      el.classList.add(`aura-${style}`);
    el.dataset.aura = style || "default";
    host = document.createElement("div");
    host.className = "toast-surface";
    dfDollar4(el).append(host);
  }
  dfDollar4(host).append(contentEl);
  if (action) {
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "toast-actions";
    const actionBtn = document.createElement("button");
    actionBtn.className = "btn";
    actionBtn.setAttribute("data-variant", "outline");
    actionBtn.setAttribute("data-size", "sm");
    actionBtn.dataset.toastAction = "";
    dfDollar4(actionBtn).text(action.label);
    dfDollar4(actionsDiv).append(actionBtn);
    dfDollar4(host).append(actionsDiv);
  }
  if (animation) {
    el._animation = typeof animation === "string" ? { in: animation } : animation;
    el.dataset.anim = "";
  }
  dfDollar4(toastContainer).append(el);
  el.showPopover();
  stackToasts(toastContainer);
  const inName = el._animation?.in;
  if (inName && anim[inName])
    anim[inName].play(el, { duration: el._animation.duration ?? 450, direction: el._animation.direction });
  toastCallbacks.set(el, { onDismiss, action });
  if (duration !== Infinity)
    setTimeout(() => {
      toastDismiss(el, onDismiss);
    }, duration);
  const toasts = dfDollar4(toastContainer).find(".toast").toArray();
  if (toasts.length > (toastContainer.dataset.stack === "pile" ? 6 : MAX_VISIBLE))
    toastDismiss(toasts[0]);
  return el;
};
function init4() {
  dfDollar4("#toast-container:not([data-init])").toArray().forEach((container) => {
    container.dataset.init = "";
    bindComponent4(container, toastApi);
    const expand = (on) => {
      if (container.dataset.stack !== "pile")
        return;
      clearTimeout(container._collapse);
      if (on) {
        if (!container.hasAttribute("data-expanded")) {
          container.setAttribute("data-expanded", "");
          stackToasts(container);
        }
      } else {
        container._collapse = setTimeout(() => {
          container.removeAttribute("data-expanded");
          stackToasts(container);
        }, 250);
      }
    };
    container.addEventListener("pointerover", (e) => {
      if (e.target.closest(".toast"))
        expand(true);
    });
    container.addEventListener("pointerout", (e) => {
      if (!e.relatedTarget?.closest?.(".toast"))
        expand(false);
    });
    container.addEventListener("focusin", () => expand(true));
    container.addEventListener("focusout", (e) => {
      if (!e.relatedTarget?.closest?.(".toast"))
        expand(false);
    });
    container.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-toast-close],[data-toast-action]");
      if (!btn)
        return;
      const toast = btn.closest(".toast");
      if (!toast)
        return;
      const cb = toastCallbacks.get(toast) ?? {};
      if (btn.hasAttribute("data-toast-action")) {
        if (cb.action)
          cb.action.onClick();
        toastDismiss(toast);
      } else
        toastDismiss(toast, cb.onDismiss);
    });
  });
}
init4();
new MutationObserver(init4).observe(document.body, { childList: true, subtree: true });
var toastConfigure = (opts = {}) => {
  if (opts.stack)
    toastContainer.dataset.stack = opts.stack;
  if (opts.position)
    toastContainer.setAttribute("data-position", opts.position);
  stackToasts(toastContainer);
  return { stack: toastContainer.dataset.stack || "list", position: toastContainer.dataset.position };
};
var toastActions = {
  configure: toastConfigure,
  show: toastCreate,
  success: (options) => toastCreate(Object.assign(typeof options === "string" ? { title: options } : options, { variant: "success" })),
  warning: (options) => toastCreate(Object.assign(typeof options === "string" ? { title: options } : options, { variant: "warning" })),
  info: (options) => toastCreate(Object.assign(typeof options === "string" ? { title: options } : options, { variant: "info" })),
  error: (options) => toastCreate(Object.assign(typeof options === "string" ? { title: options } : options, { variant: "destructive" })),
  dismiss: () => {
    dfDollar4(toastContainer).find(".toast").toArray().forEach((el) => {
      toastDismiss(el);
    });
  }
};
df$4.toast = toastActions;

//# debugId=01872E5895FE2AE864756E2164756E21
//# sourceMappingURL=feedback-status.js.map
