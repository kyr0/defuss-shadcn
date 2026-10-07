// dist/components/toggle/toggle.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.9.7") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals, defussQuery, componentState, bindComponent } = __df$shared;
var df$ = defussGlobals();
var dfDollar = defussQuery();
var toggleStates = ["default", "pressed"];
function applyMarkup(toggle, stateName, defaultPressed) {
  dfDollar(toggle).attr("aria-pressed", stateName === "pressed" ? "true" : defaultPressed);
}
function triggerStateChange(toggle, stateName, _config) {
  applyMarkup(toggle, stateName, toggle._defaultPressed ?? "false");
}
var toggleApi = componentState({
  component: "toggle",
  states: toggleStates,
  apply: (toggle, state) => triggerStateChange(toggle, state.name, state.config),
  read: (toggle, state) => ({ name: dfDollar(toggle).attr("aria-pressed") === "true" ? "pressed" : "default", config: state.config }),
  markup: (toggle, state) => {
    const authored = state.model.attrs.find(([name]) => name === "aria-pressed");
    applyMarkup(toggle, state.name, authored ? authored[1] : "false");
  }
});
df$.toggleApi = toggleApi;
df$.toggleStates = toggleStates;
function init() {
  dfDollar(".toggle:not([data-init]):not(.toggle-group .toggle)").each((_i, toggle) => {
    dfDollar(toggle).data("init", "");
    toggle._defaultPressed = dfDollar(toggle).attr("aria-pressed") || "false";
    bindComponent(toggle, toggleApi, { name: toggle._defaultPressed === "true" ? "pressed" : "default", config: {} });
    dfDollar(toggle).on("click", () => {
      dfDollar(toggle).attr("aria-pressed", String(dfDollar(toggle).attr("aria-pressed") !== "true"));
    });
  });
}
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

// dist/components/toggle-group/toggle-group.js
var __df$core2 = globalThis.df$;
var __df$shared2 = __df$core2 && __df$core2.shadcn && __df$core2.shadcn.shared;
if (!__df$shared2 || __df$shared2.abi !== "0.9.7") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals2, defussQuery: defussQuery2, componentState: componentState2, bindComponent: bindComponent2 } = __df$shared2;
var df$2 = defussGlobals2();
var dfDollar2 = defussQuery2();
var toggleGroupStates = ["default", "disabled"];
function applyMarkup2(el, stateName) {
  dfDollar2(el).attr("data-disabled", stateName === "disabled" ? "" : null);
}
function triggerStateChange2(group, stateName, _config) {
  switch (stateName) {
    case "default":
      group.removeAttribute("data-disabled");
      break;
    case "disabled":
      group.setAttribute("data-disabled", "");
      break;
  }
}
var toggleGroupApi = componentState2({
  component: "toggle-group",
  states: toggleGroupStates,
  apply: (group, state) => triggerStateChange2(group, state.name, state.config),
  read: (group, state) => {
    return {
      name: group.hasAttribute("data-disabled") ? "disabled" : "default",
      config: state.config
    };
  },
  markup: (el, state) => applyMarkup2(el, state.name)
});
df$2.toggleGroupApi = toggleGroupApi;
df$2.toggleGroupStates = toggleGroupStates;
function init2() {
  dfDollar2(".toggle-group:not([data-init])").toArray().forEach((group) => {
    group.dataset.init = "";
    bindComponent2(group, toggleGroupApi);
    const type = group.getAttribute("data-type") || "single";
    const getToggles = () => Array.from(dfDollar2(group).find(".toggle:not(:disabled)").toArray());
    const initTabindex = () => {
      const toggles = getToggles();
      if (toggles.length === 0)
        return;
      const pressed = toggles.find((t) => t.getAttribute("aria-pressed") === "true");
      const active = pressed || toggles[0];
      toggles.forEach((t) => {
        t.setAttribute("tabindex", t === active ? "0" : "-1");
      });
    };
    initTabindex();
    group.addEventListener("click", (e) => {
      const toggle = e.target.closest(".toggle");
      if (!toggle || toggle.disabled || group.hasAttribute("data-disabled"))
        return;
      const toggles = getToggles();
      const pressed = toggle.getAttribute("aria-pressed") === "true";
      if (type === "single") {
        toggles.forEach((t) => t.setAttribute("aria-pressed", "false"));
        if (!pressed)
          toggle.setAttribute("aria-pressed", "true");
      } else {
        toggle.setAttribute("aria-pressed", String(!pressed));
      }
      toggles.forEach((t) => t.setAttribute("tabindex", t === toggle ? "0" : "-1"));
    });
    group.addEventListener("keydown", (e) => {
      const toggle = e.target.closest(".toggle");
      if (!toggle || group.hasAttribute("data-disabled"))
        return;
      const toggles = getToggles();
      const idx = toggles.indexOf(toggle);
      if (idx === -1)
        return;
      const vertical = group.getAttribute("data-orientation") === "vertical";
      const fwd = vertical ? "ArrowDown" : "ArrowRight";
      const bwd = vertical ? "ArrowUp" : "ArrowLeft";
      let next;
      if (e.key === fwd) {
        e.preventDefault();
        next = (idx + 1) % toggles.length;
      } else if (e.key === bwd) {
        e.preventDefault();
        next = (idx - 1 + toggles.length) % toggles.length;
      } else if (e.key === "Home") {
        e.preventDefault();
        next = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        next = toggles.length - 1;
      }
      if (next !== undefined) {
        toggles[idx].setAttribute("tabindex", "-1");
        toggles[next].setAttribute("tabindex", "0");
        toggles[next].focus();
      }
    });
  });
}
init2();
new MutationObserver(init2).observe(document, { childList: true, subtree: true });

// dist/components/toolbar/toolbar.js
var __df$core3 = globalThis.df$;
var __df$shared3 = __df$core3 && __df$core3.shadcn && __df$core3.shadcn.shared;
if (!__df$shared3 || __df$shared3.abi !== "0.9.7") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals3, defussQuery: defussQuery3, componentState: componentState3, bindComponent: bindComponent3 } = __df$shared3;
var df$3 = defussGlobals3();
var dfDollar3 = defussQuery3();
var toolbarStates = ["default"];
function applyMarkup3(_el, _stateName) {}
function triggerStateChange3(toolbar, items, stateName, config) {
  if (stateName !== "default" || items.length === 0)
    return;
  const target = items[Math.min(Number(config?.focus ?? 0), items.length - 1)] || items[0];
  items.forEach((item) => item.setAttribute("tabindex", item === target ? "0" : "-1"));
  if (toolbar.contains(document.activeElement))
    target.focus();
}
var toolbarApi = componentState3({
  component: "toolbar",
  states: toolbarStates,
  apply: (toolbar, state) => {
    const items = toolbarItems(toolbar);
    triggerStateChange3(toolbar, items, state.name, state.config);
  },
  read: (toolbar, state) => {
    const items = toolbarItems(toolbar);
    const idx = items.findIndex((item) => item.getAttribute("tabindex") === "0");
    return {
      name: toolbar.dataset.stateName || "default",
      config: { ...state.config, rovingIndex: idx }
    };
  },
  markup: (el, state) => applyMarkup3(el, state.name)
});
df$3.toolbarApi = toolbarApi;
df$3.toolbarStates = toolbarStates;
var toolbarItems = (toolbar) => Array.from(dfDollar3(toolbar).find('button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])').toArray());
function init3() {
  dfDollar3('.toolbar[role="toolbar"]:not([data-init])').toArray().forEach((toolbar) => {
    toolbar.dataset.init = "";
    bindComponent3(toolbar, toolbarApi);
    const items = toolbarItems(toolbar);
    if (items.length === 0)
      return;
    items.forEach((item, i) => {
      item.setAttribute("tabindex", i === 0 ? "0" : "-1");
    });
    toolbar.addEventListener("keydown", (e) => {
      const current = items.indexOf(document.activeElement);
      if (current === -1)
        return;
      const vertical = toolbar.getAttribute("aria-orientation") === "vertical";
      const fwd = vertical ? "ArrowDown" : "ArrowRight";
      const bwd = vertical ? "ArrowUp" : "ArrowLeft";
      let next;
      if (e.key === fwd) {
        e.preventDefault();
        next = (current + 1) % items.length;
      } else if (e.key === bwd) {
        e.preventDefault();
        next = (current - 1 + items.length) % items.length;
      } else if (e.key === "Home") {
        e.preventDefault();
        next = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        next = items.length - 1;
      }
      if (next !== undefined) {
        items[current].setAttribute("tabindex", "-1");
        items[next].setAttribute("tabindex", "0");
        items[next].focus();
      }
    });
  });
}
init3();
new MutationObserver(init3).observe(document, { childList: true, subtree: true });

//# debugId=CE1D26E761D7C68464756E2164756E21
//# sourceMappingURL=actions.js.map
