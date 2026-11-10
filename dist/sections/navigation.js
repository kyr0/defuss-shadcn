// dist/components/pagination/pagination.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.9.14") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals, defussQuery, componentState, bindComponent } = __df$shared;
var df$ = defussGlobals();
var dfDollar = defussQuery();
var paginationStates = ["default"];
var numAttr = (el, key, fallback) => {
  const v = parseInt(el.dataset[key] ?? "", 10);
  return Number.isFinite(v) ? v : fallback;
};
function renderWindow(nav) {
  const list = dfDollar(nav).find(".pagination-list").get(0);
  const prev = dfDollar(nav).find(".pagination-prev").get(0);
  const next = dfDollar(nav).find(".pagination-next").get(0);
  const prevLi = prev?.closest("li") ?? null;
  const nextLi = next?.closest("li") ?? null;
  if (!list || !prev || !next || !prevLi || !nextLi)
    return;
  const min = Math.max(1, numAttr(nav, "minPage", 1));
  const max = Math.max(min, numAttr(nav, "maxPage", 1));
  const active = Math.min(max, Math.max(min, numAttr(nav, "activePage", min)));
  dfDollar(prev).attr("aria-disabled", active <= min ? "true" : null);
  dfDollar(next).attr("aria-disabled", active >= max ? "true" : null);
  if (!nav.hasAttribute("data-active-page"))
    return;
  const count = Math.max(1, numAttr(nav, "pageDisplayCount", 5));
  if (nav.dataset.activePage !== String(active))
    nav.dataset.activePage = String(active);
  const start = Math.max(min, Math.min(active - Math.floor((count - 1) / 2), max - count + 1));
  const end = Math.min(max, start + count - 1);
  const survivors = new Map;
  let n = prevLi.nextSibling;
  while (n && n !== nextLi) {
    const node = n;
    n = n.nextSibling;
    const page = node.nodeType === Node.ELEMENT_NODE ? dfDollar(node).find(".pagination-link[data-page]").attr("data-page") : null;
    const p = page ? parseInt(page, 10) : NaN;
    if (Number.isFinite(p) && p >= start && p <= end) {
      node.remove();
      survivors.set(p, node);
    } else
      node.remove();
  }
  for (const node of windowNodes(start, end, min, max, active, survivors))
    dfDollar(nextLi).before(node);
}
function windowNodes(start, end, min, max, active, survivors) {
  const out = [];
  const ellipsis = () => {
    const li = document.createElement("li");
    const s = document.createElement("span");
    s.className = "pagination-ellipsis";
    s.setAttribute("aria-hidden", "true");
    s.textContent = "…";
    li.append(s);
    return li;
  };
  const pageLink = (p) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.className = "pagination-link" + (p === active ? " pagination-active" : "");
    a.href = "#";
    a.dataset.page = String(p);
    if (p === active)
      a.setAttribute("aria-current", "page");
    a.textContent = String(p);
    li.append(a);
    return li;
  };
  if (start > min)
    out.push(ellipsis());
  for (let p = start;p <= end; p++) {
    if (p === active || !survivors.has(p))
      out.push(pageLink(p));
    else {
      const node = survivors.get(p);
      const a = dfDollar(node).find("a").get(0);
      a?.classList.remove("pagination-active");
      a?.removeAttribute("aria-current");
      out.push(node);
    }
  }
  if (end < max)
    out.push(ellipsis());
  return out;
}
function setPage(nav, page) {
  const min = Math.max(1, numAttr(nav, "minPage", 1));
  const max = Math.max(min, numAttr(nav, "maxPage", 1));
  const next = Math.min(max, Math.max(min, page));
  if (next === numAttr(nav, "activePage", min))
    return;
  nav.dataset.activePage = String(next);
  nav.dispatchEvent(new CustomEvent("pagination-change", { bubbles: true, detail: { page: next } }));
}
function applyConfig(nav, config) {
  const a = config.activePage ?? config.page;
  if (a !== undefined && numAttr(nav, "activePage", 1) !== Number(a))
    nav.dataset.activePage = String(a);
  if (config.minPage !== undefined && numAttr(nav, "minPage", 1) !== Number(config.minPage))
    nav.dataset.minPage = String(config.minPage);
  if (config.maxPage !== undefined && numAttr(nav, "maxPage", 1) !== Number(config.maxPage))
    nav.dataset.maxPage = String(config.maxPage);
  if (config.pageDisplayCount !== undefined && numAttr(nav, "pageDisplayCount", 5) !== Number(config.pageDisplayCount))
    nav.dataset.pageDisplayCount = String(config.pageDisplayCount);
}
function applyMarkup(nav, config = {}) {
  applyConfig(nav, config);
  if (nav.hasAttribute("data-active-page"))
    renderWindow(nav);
}
function triggerStateChange(nav, stateName, config = {}) {
  if (stateName !== "default")
    return;
  applyConfig(nav, config);
  if (nav.hasAttribute("data-active-page"))
    renderWindow(nav);
}
var paginationApi = componentState({
  component: "pagination",
  states: paginationStates,
  apply: (nav, state) => triggerStateChange(nav, state.name, state.config),
  read: (nav, state) => {
    return {
      name: nav.dataset.stateName || "default",
      config: {
        ...state.config,
        activePage: numAttr(nav, "activePage", 1),
        minPage: numAttr(nav, "minPage", 1),
        maxPage: numAttr(nav, "maxPage", 1),
        pageDisplayCount: numAttr(nav, "pageDisplayCount", 5)
      }
    };
  },
  markup: (el, state) => applyMarkup(el, state.config)
});
df$.paginationApi = paginationApi;
df$.paginationStates = paginationStates;
function init() {
  dfDollar(".pagination:not([data-init])").toArray().forEach((nav) => {
    nav.dataset.init = "";
    bindComponent(nav, paginationApi);
    if (nav.hasAttribute("data-active-page"))
      renderWindow(nav);
    new MutationObserver(() => {
      if (nav.hasAttribute("data-active-page"))
        renderWindow(nav);
    }).observe(nav, {
      attributes: true,
      attributeFilter: ["data-active-page", "data-min-page", "data-max-page", "data-page-display-count", "data-size"]
    });
    nav.addEventListener("click", (e) => {
      const link = e.target.closest(".pagination-link[data-page], .pagination-prev, .pagination-next");
      if (!link)
        return;
      e.preventDefault();
      if (link.classList.contains("pagination-link")) {
        setPage(nav, parseInt(link.dataset.page ?? "1", 10));
      } else if (link.classList.contains("pagination-prev")) {
        setPage(nav, numAttr(nav, "activePage", 1) - 1);
      } else {
        setPage(nav, numAttr(nav, "activePage", 1) + 1);
      }
    });
    nav.addEventListener("pagination-next", () => setPage(nav, numAttr(nav, "activePage", 1) + 1));
    nav.addEventListener("pagination-prev", () => setPage(nav, numAttr(nav, "activePage", 1) - 1));
  });
}
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

// dist/components/steps/steps.js
var __df$core2 = globalThis.df$;
var __df$shared2 = __df$core2 && __df$core2.shadcn && __df$core2.shadcn.shared;
if (!__df$shared2 || __df$shared2.abi !== "0.9.14") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals2, defussQuery: defussQuery2, componentState: componentState2, bindComponent: bindComponent2 } = __df$shared2;
var df$2 = defussGlobals2();
var dfDollar2 = defussQuery2();
var stepsStates = ["default"];
var numAttr2 = (el, key, fallback) => {
  const v = parseInt(el.dataset[key] ?? "", 10);
  return Number.isFinite(v) ? v : fallback;
};
function renderSteps(ol) {
  const items = Array.from(dfDollar2(ol).find(".step").toArray());
  if (items.length === 0)
    return;
  const total = items.length;
  const active = Math.min(total, Math.max(1, numAttr2(ol, "activeStep", 1)));
  const raw = ol.dataset.errorStep ?? "";
  const error = raw === "true" ? active : parseInt(raw, 10) || 0;
  if (ol.dataset.activeStep !== String(active))
    ol.dataset.activeStep = String(active);
  items.forEach((item, i) => {
    const n = i + 1;
    const status = n === error ? "error" : n < active ? "complete" : n === active ? "current" : null;
    if (status)
      item.dataset.status = status;
    else
      delete item.dataset.status;
    if (status === "current")
      item.setAttribute("aria-current", "step");
    else
      item.removeAttribute("aria-current");
  });
}
function applyMarkup2(ol, config = {}) {
  if (config.activeStep !== undefined && numAttr2(ol, "activeStep", 1) !== Number(config.activeStep))
    ol.dataset.activeStep = String(config.activeStep);
  if (config.errorStep !== undefined && numAttr2(ol, "errorStep", 0) !== Number(config.errorStep)) {
    if (Number(config.errorStep))
      ol.dataset.errorStep = String(config.errorStep);
    else
      delete ol.dataset.errorStep;
  }
  if (config.size !== undefined && (ol.dataset.size ?? "md") !== config.size)
    ol.dataset.size = String(config.size);
  if (ol.hasAttribute("data-active-step"))
    renderSteps(ol);
}
function triggerStateChange2(ol, stateName, config = {}) {
  if (stateName !== "default")
    return;
  const a = config.activeStep ?? config.step ?? config.page;
  if (a !== undefined && numAttr2(ol, "activeStep", 1) !== Number(a))
    ol.dataset.activeStep = String(a);
  if (config.errorStep !== undefined) {
    if (numAttr2(ol, "errorStep", 0) !== Number(config.errorStep)) {
      if (Number(config.errorStep))
        ol.dataset.errorStep = String(config.errorStep);
      else
        delete ol.dataset.errorStep;
    }
  } else if (config.activeStepError === true)
    ol.dataset.errorStep = ol.dataset.activeStep ?? "1";
  else if (config.activeStepError === false)
    delete ol.dataset.errorStep;
  if (config.size !== undefined && (ol.dataset.size ?? "md") !== config.size)
    ol.dataset.size = String(config.size);
  if (ol.hasAttribute("data-active-step"))
    renderSteps(ol);
}
var stepsApi = componentState2({
  component: "steps",
  states: stepsStates,
  apply: (ol, state) => triggerStateChange2(ol, state.name, state.config),
  read: (ol, state) => {
    return {
      name: ol.dataset.stateName || "default",
      config: {
        ...state.config,
        activeStep: numAttr2(ol, "activeStep", 1),
        activeStepError: numAttr2(ol, "errorStep", 0) === numAttr2(ol, "activeStep", 1) && numAttr2(ol, "errorStep", 0) !== 0,
        errorStep: numAttr2(ol, "errorStep", 0),
        size: ol.dataset.size ?? "md"
      }
    };
  },
  markup: (el, state) => applyMarkup2(el, state.config)
});
df$2.stepsApi = stepsApi;
df$2.stepsStates = stepsStates;
function init2() {
  dfDollar2(".steps:not([data-init])").toArray().forEach((ol) => {
    ol.dataset.init = "";
    bindComponent2(ol, stepsApi);
    if (ol.hasAttribute("data-active-step"))
      renderSteps(ol);
    new MutationObserver(() => {
      if (ol.hasAttribute("data-active-step"))
        renderSteps(ol);
    }).observe(ol, {
      attributes: true,
      attributeFilter: ["data-active-step", "data-error-step", "data-size"]
    });
    ol.addEventListener("click", (e) => {
      const item = e.target.closest(".step[data-clickable]");
      if (!item || !ol.contains(item))
        return;
      const items = Array.from(dfDollar2(ol).find(".step").toArray());
      ol.dataset.activeStep = String(items.indexOf(item) + 1);
      delete ol.dataset.errorStep;
    });
    ol.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ")
        return;
      const ind = e.target.closest(".step[data-clickable] .step-indicator");
      if (!ind)
        return;
      e.preventDefault();
      ind.click();
    });
  });
}
init2();
new MutationObserver(init2).observe(document, { childList: true, subtree: true });

// dist/components/tabs/tabs.js
var __df$core3 = globalThis.df$;
var __df$shared3 = __df$core3 && __df$core3.shadcn && __df$core3.shadcn.shared;
if (!__df$shared3 || __df$shared3.abi !== "0.9.14") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals3, defussQuery: defussQuery3, componentState: componentState3, bindComponent: bindComponent3 } = __df$shared3;
var df$3 = defussGlobals3();
var dfDollar3 = defussQuery3();
var tabsStates = ["default", "active", "disabled"];
var ICON = ":scope > :is(svg, img, i, .tab-icon)";
var LUCIDE_NAME = /^[a-z][a-z0-9-]*$/;
var iconOf = (tab) => {
  const icon = dfDollar3(tab).find(ICON).get(0);
  if (!icon)
    return "";
  return icon.getAttribute("data-lucide") ?? icon.textContent.trim();
};
var labelOf = (tab) => {
  const label = dfDollar3(tab).find(":scope > .tab-label").get(0);
  if (label)
    return label.textContent.trim();
  return Array.from(tab.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join("").trim();
};
var setLabel = (tab, text) => {
  const label = dfDollar3(tab).find(":scope > .tab-label").get(0);
  if (label) {
    label.textContent = text;
    return;
  }
  Array.from(tab.childNodes).forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE)
      n.remove();
  });
  tab.append(document.createTextNode(text));
};
var setIcon = (tab, icon) => {
  dfDollar3(tab).find(ICON).get(0)?.remove();
  if (!icon)
    return;
  const el = document.createElement(LUCIDE_NAME.test(icon) ? "i" : "span");
  el.className = "tab-icon";
  el.setAttribute("aria-hidden", "true");
  if (el.tagName === "I")
    el.setAttribute("data-lucide", icon);
  else
    el.textContent = icon;
  tab.prepend(el);
  if (el.tagName === "I")
    globalThis.lucide?.createIcons?.();
};
var applyContent = (tab, config) => {
  if (typeof config.label === "string" && config.label !== labelOf(tab))
    setLabel(tab, config.label);
  if (typeof config.icon === "string" && config.icon !== iconOf(tab))
    setIcon(tab, config.icon);
};
var triggersOf = (el) => {
  const list = el.getAttribute("role") === "tablist" ? el : el.closest('[role="tablist"]');
  return Array.from(dfDollar3(list).find('[role="tab"]').toArray());
};
var activateTab = (tab, triggers) => {
  triggers.forEach((t) => {
    t.setAttribute("aria-selected", "false");
    t.setAttribute("tabindex", "-1");
    t.dataset.stateName = t.disabled ? "disabled" : "default";
    const panel = dfDollar3("#" + CSS.escape(t.getAttribute("aria-controls"))).get(0);
    if (panel)
      panel.hidden = true;
  });
  tab.setAttribute("aria-selected", "true");
  tab.removeAttribute("tabindex");
  tab.dataset.stateName = "active";
  const panel = dfDollar3("#" + CSS.escape(tab.getAttribute("aria-controls"))).get(0);
  if (panel)
    panel.hidden = false;
};
var nextEnabled = (from, triggers) => {
  const i = triggers.indexOf(from);
  for (let k = 1;k <= triggers.length; k++) {
    const c = triggers[(i + k) % triggers.length];
    if (!c.disabled && c !== from)
      return c;
  }
  return null;
};
var tabName = (tab) => tab.disabled ? "disabled" : tab.getAttribute("aria-selected") === "true" ? "active" : "default";
var restoreTab = (tab) => {
  tab.disabled = tab._authored.disabled;
  if (labelOf(tab) !== tab._authored.label)
    setLabel(tab, tab._authored.label);
  if (iconOf(tab) !== tab._authored.icon)
    setIcon(tab, tab._authored.icon);
  tab.dataset.stateName = tabName(tab);
};
var authoredTab = (triggers) => triggers.find((t) => t._authored.selected) || triggers.find((t) => !t.disabled);
function triggerStateChange3(el, stateName, config) {
  const triggers = triggersOf(el);
  const isList = el.getAttribute("role") === "tablist";
  const reenter = Object.keys(config).length > 0 && tabsApi.getState(el).name === stateName;
  if (isList) {
    if (!reenter) {
      switch (stateName) {
        case "default": {
          triggers.forEach(restoreTab);
          const tab = authoredTab(triggers);
          if (tab)
            activateTab(tab, triggers);
          break;
        }
        case "active":
          triggers.forEach((t) => {
            if (t.disabled && !t._authored.disabled)
              t.disabled = false;
          });
          break;
        case "disabled":
          triggers.forEach((t) => {
            t.disabled = true;
            t.dataset.stateName = "disabled";
          });
          break;
      }
    }
    const pick = typeof config.index === "number" ? triggers[config.index] : typeof config.id === "string" ? triggers.find((t) => t.id === config.id) : null;
    if (pick && !pick.disabled)
      activateTab(pick, triggers);
    return;
  }
  const tab = el;
  if (!reenter) {
    switch (stateName) {
      case "default": {
        const wasSelected = tab.getAttribute("aria-selected") === "true";
        tab.disabled = false;
        if (tab._authored.selected)
          activateTab(tab, triggers);
        else if (wasSelected) {
          const other = authoredTab(triggers.filter((t) => t !== tab)) || nextEnabled(tab, triggers);
          if (other && other !== tab)
            activateTab(other, triggers);
          else
            tab.setAttribute("aria-selected", "false");
        }
        tab.dataset.stateName = tabName(tab);
        break;
      }
      case "active":
        if (!tab.disabled)
          activateTab(tab, triggers);
        break;
      case "disabled": {
        const wasSelected = tab.getAttribute("aria-selected") === "true";
        tab.disabled = true;
        tab.dataset.stateName = "disabled";
        if (wasSelected) {
          const other = nextEnabled(tab, triggers);
          if (other)
            activateTab(other, triggers);
          tab.dataset.stateName = "disabled";
        }
        break;
      }
    }
  }
  applyContent(tab, config);
}
var selectMarkup = (tab, triggers) => {
  triggers.forEach((t) => dfDollar3(t).attr("aria-selected", "false").attr("tabindex", "-1"));
  dfDollar3(tab).attr("aria-selected", "true").attr("tabindex", null);
};
var selectedOf = (t) => dfDollar3(t).attr("aria-selected") === "true";
var disabledOf = (t) => dfDollar3(t).attr("disabled") != null;
function listMarkup(list, stateName, config) {
  const triggers = dfDollar3(list).find('[role="tab"]').toArray();
  if (stateName === "default") {
    const tab = triggers.find(selectedOf) || triggers.find((t) => !disabledOf(t));
    if (tab)
      selectMarkup(tab, triggers);
  } else if (stateName === "disabled")
    triggers.forEach((t) => dfDollar3(t).attr("disabled", ""));
  const pick = typeof config?.index === "number" ? triggers[config.index] : typeof config?.id === "string" ? triggers.find((t) => t.id === config.id) : null;
  if (pick && !disabledOf(pick))
    selectMarkup(pick, triggers);
}
function tabMarkup(tab, stateName, config) {
  if (stateName === "active")
    dfDollar3(tab).attr("disabled", null).attr("aria-selected", "true").attr("tabindex", null);
  else
    dfDollar3(tab).attr("disabled", stateName === "disabled" ? "" : null);
  applyContent(tab, config ?? {});
}
var tabsApi = componentState3({
  component: "tabs",
  states: tabsStates,
  apply: (el, state, _previous, incoming) => triggerStateChange3(el, state.name, incoming),
  read: (el, state) => {
    if (el.getAttribute("role") === "tablist") {
      const triggers = triggersOf(el);
      const selected = triggers.findIndex((t) => t.getAttribute("aria-selected") === "true");
      const authored = triggers.findIndex((t) => t._authored?.selected);
      const name = triggers.every((t) => t.disabled) ? "disabled" : selected === authored || authored < 0 && selected <= 0 ? "default" : "active";
      return { name, config: { ...state.config, index: selected, id: triggers[selected]?.id ?? "" } };
    }
    return {
      name: tabName(el),
      config: { ...state.config, label: labelOf(el), icon: iconOf(el) }
    };
  },
  markup: (el, state) => (el.getAttribute("role") === "tablist" ? listMarkup : tabMarkup)(el, state.name, state.config),
  mergeConfig: true
});
df$3.tabsApi = tabsApi;
df$3.tabsStates = tabsStates;
function init3() {
  dfDollar3('[role="tablist"]:not([data-init]):has(.tab-trigger)').toArray().forEach((tablist) => {
    tablist.dataset.init = "";
    const triggers = Array.from(dfDollar3(tablist).find('[role="tab"]').toArray());
    triggers.forEach((t) => {
      t._authored = {
        selected: t.getAttribute("aria-selected") === "true",
        disabled: t.disabled,
        label: labelOf(t),
        icon: iconOf(t)
      };
      bindComponent3(t, tabsApi);
    });
    bindComponent3(tablist, tabsApi);
    const side = tablist.closest(".tabs")?.getAttribute("data-side");
    if ((side === "left" || side === "right") && !tablist.hasAttribute("aria-orientation")) {
      tablist.setAttribute("aria-orientation", "vertical");
    }
    const vertical = () => {
      const now = tablist.closest(".tabs")?.getAttribute("data-side");
      if (now === "left" || now === "right")
        return true;
      if (now === "top" || now === "bottom")
        return false;
      return tablist.getAttribute("aria-orientation") === "vertical";
    };
    triggers.forEach((trigger) => {
      trigger.addEventListener("click", () => {
        activateTab(trigger, triggers);
      });
      trigger.addEventListener("keydown", (e) => {
        const current = triggers.indexOf(trigger);
        let next;
        const forward = vertical() ? "ArrowDown" : "ArrowRight";
        const backward = vertical() ? "ArrowUp" : "ArrowLeft";
        switch (e.key) {
          case forward:
            e.preventDefault();
            for (let i = 1;i <= triggers.length; i++) {
              const c = triggers[(current + i) % triggers.length];
              if (!c.disabled) {
                next = c;
                break;
              }
            }
            break;
          case backward:
            e.preventDefault();
            for (let i = 1;i <= triggers.length; i++) {
              const c = triggers[(current - i + triggers.length) % triggers.length];
              if (!c.disabled) {
                next = c;
                break;
              }
            }
            break;
          case "Home":
            e.preventDefault();
            next = triggers.find((t) => !t.disabled);
            break;
          case "End":
            e.preventDefault();
            next = triggers.slice().reverse().find((t) => !t.disabled);
            break;
        }
        if (next && !next.disabled) {
          activateTab(next, triggers);
          next.focus();
        }
      });
    });
  });
}
function revealFragment() {
  let id = "";
  try {
    id = decodeURIComponent(location.hash.slice(1));
  } catch {
    return;
  }
  if (!id || id.startsWith("/"))
    return;
  const target = dfDollar3("#" + CSS.escape(id)).get(0);
  if (!target)
    return;
  const hidden = [];
  const panelOf = (el) => el ? dfDollar3(el).closest('[role="tabpanel"]').get(0) : undefined;
  for (let panel = panelOf(target);panel; panel = panelOf(panel.parentElement))
    if (panel.hidden)
      hidden.unshift(panel);
  if (!hidden.length)
    return;
  for (const panel of hidden) {
    const tab = dfDollar3('[role="tab"][aria-controls="' + CSS.escape(panel.id) + '"]').get(0);
    const tablist = tab && dfDollar3(tab).closest('[role="tablist"]').get(0);
    if (!tab || tab.disabled || !tablist)
      return;
    activateTab(tab, dfDollar3(tablist).find('[role="tab"]').toArray());
  }
  target.scrollIntoView();
}
var fragmentsBound = false;
function initAll() {
  const before = dfDollar3('[role="tablist"][data-init]').length;
  init3();
  if (dfDollar3('[role="tablist"][data-init]').length !== before)
    revealFragment();
  if (!fragmentsBound) {
    fragmentsBound = true;
    addEventListener("hashchange", revealFragment);
  }
}
initAll();
new MutationObserver(initAll).observe(document, { childList: true, subtree: true });

// dist/components/dropdown/dropdown.js
var __df$core4 = globalThis.df$;
var __df$shared4 = __df$core4 && __df$core4.shadcn && __df$core4.shadcn.shared;
if (!__df$shared4 || __df$shared4.abi !== "0.9.14") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals4, safeShowPopover, defussQuery: defussQuery4, componentState: componentState4, bindComponent: bindComponent4 } = __df$shared4;
var df$4 = defussGlobals4();
var dfDollar4 = defussQuery4();
var dropdownStates = ["default", "open"];
var ITEM = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';
var isDisabled = (el) => el.disabled || el.getAttribute("aria-disabled") === "true";
var itemsOf = (menu) => Array.from(dfDollar4(menu).find(ITEM).toArray()).filter((i) => i.closest('[role="menu"]') === menu && !isDisabled(i));
var subOf = (trigger) => dfDollar4(trigger).closest(".dropdown-sub").children(".dropdown-sub-content").get(0) ?? null;
var rootOf = (menu) => {
  let m = menu;
  while (m?.parentElement?.closest(".dropdown-content[popover]"))
    m = m.parentElement.closest(".dropdown-content[popover]");
  return m;
};
var HOVER_OPEN = 120;
var HOVER_CLOSE = 220;
function applyMarkup3(_el, _stateName) {}
function triggerStateChange4(menu, stateName, _config) {
  switch (stateName) {
    case "default":
      try {
        menu.hidePopover();
      } catch {}
      break;
    case "open":
      safeShowPopover(menu);
      break;
  }
}
var dropdownApi = componentState4({
  component: "dropdown",
  states: dropdownStates,
  apply: (menu, state) => triggerStateChange4(menu, state.name, state.config),
  markup: (el, state) => applyMarkup3(el, state.name)
});
df$4.dropdownApi = dropdownApi;
df$4.dropdownStates = dropdownStates;
var anchorSeq = 0;
function highlight(menu, item, focus = true) {
  itemsOf(menu).forEach((i) => {
    if (i !== item)
      i.removeAttribute("data-highlighted");
  });
  if (item) {
    item.setAttribute("data-highlighted", "");
    if (focus)
      item.focus({ preventScroll: true });
  }
}
function activate(menu, item) {
  if (isDisabled(item))
    return;
  const role = item.getAttribute("role");
  if (item.classList.contains("dropdown-sub-trigger")) {
    openSub(item, true);
    return;
  }
  if (role === "menuitemcheckbox") {
    const checked = item.getAttribute("aria-checked") !== "true";
    item.setAttribute("aria-checked", String(checked));
    item.dispatchEvent(new CustomEvent("dropdown:select", {
      bubbles: true,
      detail: { item, value: item.dataset.value ?? item.textContent.trim(), checked }
    }));
    return;
  }
  if (role === "menuitemradio") {
    const group = item.closest('[role="group"]') ?? menu;
    dfDollar4(group).find('[role="menuitemradio"]').toArray().forEach((r) => {
      if (r.closest('[role="menu"]') === menu)
        r.setAttribute("aria-checked", String(r === item));
    });
    item.dispatchEvent(new CustomEvent("dropdown:select", {
      bubbles: true,
      detail: { item, value: item.dataset.value ?? item.textContent.trim(), checked: true }
    }));
    return;
  }
  item.dispatchEvent(new CustomEvent("dropdown:select", {
    bubbles: true,
    detail: { item, value: item.dataset.value ?? item.textContent.trim() }
  }));
  try {
    rootOf(menu).hidePopover();
  } catch {}
}
function openSub(trigger, focusFirst) {
  const sub = subOf(trigger);
  if (!sub || isDisabled(trigger))
    return;
  clearTimeout(sub._closeTimer);
  sub._focusFirst = focusFirst;
  if (!sub.matches(":popover-open")) {
    try {
      sub.showPopover();
    } catch {}
  } else if (focusFirst)
    highlight(sub, itemsOf(sub)[0]);
}
function closeSub(sub) {
  if (sub?.matches(":popover-open")) {
    try {
      sub.hidePopover();
    } catch {}
  }
}
function wireMenu(menu) {
  if (menu._wired)
    return;
  menu._wired = true;
  const own = (e) => e.target instanceof Element && e.target.closest('[role="menu"]') === menu;
  const openSubs = () => Array.from(dfDollar4(menu).find(".dropdown-sub-content").toArray()).filter((s) => s.parentElement.closest('[role="menu"]') === menu && s.matches(":popover-open"));
  menu.addEventListener("mousemove", (e) => {
    if (!own(e))
      return;
    const item = e.target.closest(ITEM);
    if (!item || isDisabled(item))
      return;
    if (!(item.hasAttribute("data-highlighted") && item === document.activeElement))
      highlight(menu, item);
    if (menu._hoverItem === item)
      return;
    menu._hoverItem = item;
    clearTimeout(menu._hoverTimer);
    const sub = item.classList.contains("dropdown-sub-trigger") ? subOf(item) : null;
    menu._hoverTimer = setTimeout(() => {
      openSubs().forEach((s) => {
        if (s !== sub)
          closeSub(s);
      });
      if (sub)
        openSub(item, false);
    }, sub ? HOVER_OPEN : HOVER_CLOSE);
  });
  menu.addEventListener("mouseleave", (e) => {
    clearTimeout(menu._hoverTimer);
    menu._hoverItem = null;
    const to = e.relatedTarget;
    if (to instanceof Element && to.closest(".dropdown-sub-content") && menu.contains(to))
      return;
    itemsOf(menu).forEach((i) => {
      if (!(i.classList.contains("dropdown-sub-trigger") && subOf(i)?.matches(":popover-open")))
        i.removeAttribute("data-highlighted");
    });
  });
  menu.addEventListener("mousedown", (e) => {
    if (!own(e))
      return;
    const hit = e.target instanceof Element ? e.target.closest(`${ITEM}, input, textarea, select`) : null;
    if (!hit || isDisabled(hit))
      e.preventDefault();
  });
  menu.addEventListener("click", (e) => {
    if (!own(e))
      return;
    const item = e.target.closest(ITEM);
    if (!item)
      return;
    activate(menu, item);
  });
  menu.addEventListener("keydown", (e) => {
    if (!own(e))
      return;
    const items = itemsOf(menu);
    const current = items.indexOf(document.activeElement);
    const isSub = menu.classList.contains("dropdown-sub-content");
    const rtl = getComputedStyle(menu).direction === "rtl";
    const inward = rtl ? "ArrowLeft" : "ArrowRight";
    const outward = rtl ? "ArrowRight" : "ArrowLeft";
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        highlight(menu, items[(current + 1) % items.length]);
        break;
      case "ArrowUp":
        e.preventDefault();
        highlight(menu, items[(current - 1 + items.length) % items.length]);
        break;
      case "Home":
        e.preventDefault();
        highlight(menu, items[0]);
        break;
      case "End":
        e.preventDefault();
        highlight(menu, items[items.length - 1]);
        break;
      case inward:
        if (document.activeElement?.classList.contains("dropdown-sub-trigger")) {
          e.preventDefault();
          openSub(document.activeElement, true);
        }
        break;
      case outward:
        if (isSub) {
          e.preventDefault();
          closeSub(menu);
        }
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        if (isSub)
          closeSub(menu);
        else
          menu.hidePopover();
        break;
      case "Tab":
        try {
          rootOf(menu).hidePopover();
        } catch {}
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (document.activeElement?.matches(ITEM) && !isDisabled(document.activeElement))
          document.activeElement.click();
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const k = e.key.toLowerCase();
          const rest = items.slice(current + 1).concat(items.slice(0, current + 1));
          const match = rest.find((item) => item.textContent.trim().toLowerCase().startsWith(k));
          if (match)
            highlight(menu, match);
        }
    }
  });
}
function wireSub(wrap) {
  const trigger = dfDollar4(wrap).find(":scope > .dropdown-sub-trigger").get(0);
  const sub = dfDollar4(wrap).find(":scope > .dropdown-sub-content").get(0);
  if (!trigger || !sub || sub._subWired)
    return;
  sub._subWired = true;
  sub.dataset.init = "";
  if (!sub.hasAttribute("popover"))
    sub.setAttribute("popover", "auto");
  if (!sub.id)
    sub.id = `dropdown-sub-${++anchorSeq}`;
  const anchor = `--dropdown-sub-${anchorSeq}-${sub.id}`;
  trigger.style.anchorName = anchor;
  sub.style.positionAnchor = anchor;
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", sub.id);
  wireMenu(sub);
  sub.addEventListener("toggle", (e) => {
    const open = e.newState === "open";
    trigger.setAttribute("aria-expanded", String(open));
    if (open) {
      trigger.setAttribute("data-highlighted", "");
      if (sub._focusFirst)
        highlight(sub, itemsOf(sub)[0]);
    } else {
      itemsOf(sub).forEach((i) => {
        i.removeAttribute("data-highlighted");
      });
      if (sub.contains(document.activeElement) || document.activeElement === document.body)
        trigger.focus({ preventScroll: true });
    }
  });
  sub.addEventListener("mouseenter", () => {
    const parent = trigger.closest('[role="menu"]');
    if (parent)
      clearTimeout(parent._hoverTimer);
    highlight(parent, trigger, false);
  });
}
function init4() {
  dfDollar4("[data-dropdown-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const menu = dfDollar4("#" + CSS.escape(trigger.dataset.dropdownTrigger)).get(0);
    if (!menu)
      return;
    const anchorId = `--dropdown-${menu.id}`;
    trigger.style.anchorName = anchorId;
    menu.style.positionAnchor = anchorId;
    if (!trigger.hasAttribute("aria-haspopup"))
      trigger.setAttribute("aria-haspopup", "menu");
    if (!trigger.hasAttribute("aria-controls"))
      trigger.setAttribute("aria-controls", menu.id);
    if (!trigger.hasAttribute("popovertarget"))
      trigger.setAttribute("popovertarget", menu.id);
    menu._trigger = trigger;
    menu.addEventListener("toggle", (e) => {
      if (e.target !== menu)
        return;
      const open = e.newState === "open";
      trigger.setAttribute("aria-expanded", String(open));
      if (open) {
        const first = itemsOf(menu)[0];
        if (first && !menu._noFocus)
          highlight(menu, first);
        menu._noFocus = false;
      } else {
        itemsOf(menu).forEach((i) => {
          i.removeAttribute("data-highlighted");
        });
        const active = document.activeElement;
        const other = active instanceof Element && active !== trigger ? active.closest("[data-dropdown-trigger]") : null;
        const otherOpen = other ? dfDollar4("#" + CSS.escape(other.getAttribute("data-dropdown-trigger"))).get(0)?.matches(":popover-open") : false;
        if (!otherOpen && (!active || active === document.body || menu.contains(active) || other))
          trigger.focus({ preventScroll: true });
      }
    });
    wireMenu(menu);
    dfDollar4(menu).find(".dropdown-sub").toArray().forEach(wireSub);
  });
  dfDollar4(".dropdown-sub").toArray().forEach(wireSub);
  dfDollar4(".dropdown-content[popover]:not(.dropdown-sub-content):not([data-init])").toArray().forEach((menu) => {
    menu.dataset.init = "";
    bindComponent4(menu, dropdownApi);
  });
}
init4();
new MutationObserver(init4).observe(document, { childList: true, subtree: true });

// dist/components/menubar/menubar.js
var __df$core5 = globalThis.df$;
var __df$shared5 = __df$core5 && __df$core5.shadcn && __df$core5.shadcn.shared;
if (!__df$shared5 || __df$shared5.abi !== "0.9.14") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals5, safeShowPopover: safeShowPopover2, defussQuery: defussQuery5, componentState: componentState5, bindComponent: bindComponent5 } = __df$shared5;
var df$5 = defussGlobals5();
var dfDollar5 = defussQuery5();
var menubarStates = ["default", "open"];
var triggersOf2 = (bar) => Array.from(dfDollar5(bar).find(".menubar-trigger").toArray()).filter((t) => t.closest(".menubar") === bar && !t.disabled && t.getAttribute("aria-disabled") !== "true");
var menuOf = (trigger) => dfDollar5("#" + CSS.escape(trigger.dataset.dropdownTrigger || trigger.getAttribute("popovertarget") || "")).get(0);
var openMenuOf = (bar) => triggersOf2(bar).map(menuOf).find((m) => m?.matches(":popover-open")) ?? null;
function setRoving(bar, active) {
  triggersOf2(bar).forEach((t) => t.setAttribute("tabindex", t === active ? "0" : "-1"));
}
function openMenu(bar, trigger, quiet = false) {
  const menu = menuOf(trigger);
  if (!menu)
    return;
  setRoving(bar, trigger);
  if (menu.matches(":popover-open")) {
    if (!quiet)
      focusItem(menu);
    return;
  }
  menu._noFocus = quiet;
  if (quiet)
    trigger.focus({ preventScroll: true });
  safeShowPopover2(menu);
}
function focusItem(menu, last = false) {
  const own = Array.from(dfDollar5(menu).find('[role^="menuitem"]').toArray()).filter((x) => x.closest('[role="menu"]') === menu && !x.disabled && x.getAttribute("aria-disabled") !== "true");
  own.forEach((x) => x.removeAttribute("data-highlighted"));
  const item = last ? own.at(-1) : own[0];
  item?.setAttribute("data-highlighted", "");
  item?.focus({ preventScroll: true });
}
function applyMarkup4(_el, _stateName) {}
function triggerStateChange5(bar, stateName, config) {
  switch (stateName) {
    case "default": {
      const open = openMenuOf(bar);
      if (open) {
        try {
          open.hidePopover();
        } catch {}
      }
      break;
    }
    case "open": {
      const ts = triggersOf2(bar);
      const t = typeof config.menu === "number" ? ts[config.menu] : config.menu ? ts.find((x) => x.dataset.dropdownTrigger === config.menu) : ts[0];
      if (t)
        openMenu(bar, t);
      break;
    }
  }
}
var menubarApi = componentState5({
  component: "menubar",
  states: menubarStates,
  apply: (bar, state) => {
    bar.dataset.stateName = state.name;
    triggerStateChange5(bar, state.name, state.config);
  },
  read: (bar, state) => {
    const open = openMenuOf(bar);
    return { name: open ? "open" : "default", config: { ...state.config, menu: open?.id ?? null } };
  },
  markup: (el, state) => applyMarkup4(el, state.name)
});
df$5.menubarApi = menubarApi;
df$5.menubarStates = menubarStates;
function init5() {
  dfDollar5(".menubar:not([data-init])").toArray().forEach((bar) => {
    bar.dataset.init = "";
    if (!bar.hasAttribute("role"))
      bar.setAttribute("role", "menubar");
    bindComponent5(bar, menubarApi);
    const triggers = triggersOf2(bar);
    triggers.forEach((t) => {
      if (!t.hasAttribute("role"))
        t.setAttribute("role", "menuitem");
    });
    setRoving(bar, triggers[0]);
    triggers.forEach((t) => {
      menuOf(t)?.addEventListener("toggle", () => {
        bar.dataset.stateName = openMenuOf(bar) ? "open" : "default";
      });
    });
    bar.addEventListener("pointerover", (e) => {
      const t = e.target instanceof Element ? e.target.closest(".menubar-trigger") : null;
      if (!t || t.closest(".menubar") !== bar || !triggersOf2(bar).includes(t))
        return;
      const open = openMenuOf(bar);
      if (open && menuOf(t) !== open)
        openMenu(bar, t, true);
    });
    bar.addEventListener("keydown", (e) => {
      const ts = triggersOf2(bar);
      const rtl = getComputedStyle(bar).direction === "rtl";
      const next = rtl ? "ArrowLeft" : "ArrowRight";
      const prev = rtl ? "ArrowRight" : "ArrowLeft";
      const onTrigger = e.target instanceof Element && e.target.classList.contains("menubar-trigger");
      const openMenuEl = openMenuOf(bar);
      const i = onTrigger ? ts.indexOf(e.target) : ts.findIndex((t) => menuOf(t) === openMenuEl);
      if (i < 0)
        return;
      const step = (d) => ts[(i + d + ts.length) % ts.length];
      if (onTrigger) {
        const moveTo = (t) => {
          if (openMenuEl)
            openMenu(bar, t);
          else {
            setRoving(bar, t);
            t.focus();
          }
        };
        switch (e.key) {
          case next:
            e.preventDefault();
            moveTo(step(1));
            break;
          case prev:
            e.preventDefault();
            moveTo(step(-1));
            break;
          case "Home":
            e.preventDefault();
            setRoving(bar, ts[0]);
            ts[0].focus();
            break;
          case "End":
            e.preventDefault();
            setRoving(bar, ts[ts.length - 1]);
            ts[ts.length - 1].focus();
            break;
          case "ArrowDown":
          case "Enter":
          case " ":
            e.preventDefault();
            openMenu(bar, ts[i]);
            break;
          case "ArrowUp": {
            e.preventDefault();
            const menu = menuOf(ts[i]);
            if (menu && !menu.matches(":popover-open")) {
              menu.addEventListener("toggle", (ev) => {
                if (ev.newState === "open")
                  focusItem(menu, true);
              }, { once: true });
              openMenu(bar, ts[i]);
            } else {
              openMenu(bar, ts[i]);
              if (menu)
                focusItem(menu, true);
            }
            break;
          }
        }
        return;
      }
      if (e.defaultPrevented)
        return;
      if (e.key === next) {
        e.preventDefault();
        openMenu(bar, step(1));
      } else if (e.key === prev) {
        e.preventDefault();
        openMenu(bar, step(-1));
      }
    });
  });
}
init5();
new MutationObserver(init5).observe(document, { childList: true, subtree: true });

// dist/components/navigation-menu/navigation-menu.js
var __df$core6 = globalThis.df$;
var __df$shared6 = __df$core6 && __df$core6.shadcn && __df$core6.shadcn.shared;
if (!__df$shared6 || __df$shared6.abi !== "0.9.14") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals6, safeShowPopover: safeShowPopover3, defussQuery: defussQuery6, componentState: componentState6, bindComponent: bindComponent6 } = __df$shared6;
var df$6 = defussGlobals6();
var dfDollar6 = defussQuery6();
var navigationMenuStates = ["default", "open"];
function applyMarkup5(_el, _stateName) {}
function triggerStateChange6(content, stateName, _config) {
  switch (stateName) {
    case "default":
      try {
        content.hidePopover();
      } catch {}
      break;
    case "open":
      safeShowPopover3(content);
      break;
  }
}
var navigationMenuApi = componentState6({
  component: "navigation-menu",
  states: navigationMenuStates,
  apply: (content, state) => triggerStateChange6(content, state.name, state.config),
  markup: (el, state) => applyMarkup5(el, state.name)
});
df$6.navigationMenuApi = navigationMenuApi;
df$6.navigationMenuStates = navigationMenuStates;
function init6() {
  dfDollar6(".nav-menu-trigger[popovertarget]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const content = dfDollar6("#" + CSS.escape(trigger.getAttribute("popovertarget"))).get(0);
    if (!content)
      return;
    const anchorId = `--nav-menu-${content.id}`;
    trigger.style.anchorName = anchorId;
    content.style.positionAnchor = anchorId;
  });
  dfDollar6(".nav-menu-content[popover]:not([data-init])").toArray().forEach((content) => {
    content.dataset.init = "";
    bindComponent6(content, navigationMenuApi);
  });
}
init6();
new MutationObserver(init6).observe(document, { childList: true, subtree: true });

// dist/components/theme-switcher/theme-switcher.js
var __df$core7 = globalThis.df$;
var __df$shared7 = __df$core7 && __df$core7.shadcn && __df$core7.shadcn.shared;
if (!__df$shared7 || __df$shared7.abi !== "0.9.14") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals7, defussQuery: defussQuery7, loadTheme, sheetUrl, safeShowPopover: safeShowPopover4, componentState: componentState7, bindComponent: bindComponent7, persisted } = __df$shared7;
var df$7 = defussGlobals7();
var dfDollar7 = defussQuery7();
var themeSwitcherStates = ["default", "open"];
var STORAGE_KEY = "defuss-shadcn-color-theme";
var LINK_ID = "theme-css";
var THEME_EVENT = "defuss-theme-change";
var chosen;
var remembered = () => chosen ??= persisted(STORAGE_KEY, "default");
function themeHref(root, id) {
  if (root.dataset.themeBase)
    return `${root.dataset.themeBase}/${id}.css`;
  const tokens = dfDollar7("#tokens-css").get(0) || dfDollar7('link[href*="default-semantic-tokens.css"]').get(0);
  if (tokens)
    return new URL(`../${id}.css`, sheetUrl(tokens)).href;
  return `${id}.css`;
}
function applyThemeId(root, id) {
  let link = dfDollar7("#" + CSS.escape(LINK_ID)).get(0);
  if (!id || id === "default") {
    link?.remove();
    remembered().set("default");
    loadTheme("default").catch(() => {
      return;
    });
    syncTrigger(root, "default");
    document.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { id: "default" } }));
    return;
  }
  remembered().set(id);
  if (link && link.dataset.themeId === id) {
    syncTrigger(root, id);
    return;
  }
  link?.remove();
  link = document.createElement("link");
  link.id = LINK_ID;
  link.rel = "stylesheet";
  link.dataset.themeId = id;
  link.href = themeHref(root, id);
  const tokens = dfDollar7("#tokens-css").get(0) || dfDollar7('link[href*="default-semantic-tokens.css"]').get(0);
  if (tokens)
    dfDollar7(tokens).after(link);
  else
    dfDollar7(document.head).append(link);
  loadTheme(id, themeHref(root, id).replace(/\.css(?=$|[?#])/, ".json")).catch(() => {
    return;
  });
  syncTrigger(root, id);
  document.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { id } }));
}
function syncTrigger(root, id) {
  const $root = dfDollar7(root);
  const trigger = $root.find(".theme-switcher-trigger")[0];
  const items = Array.from($root.find(".theme-switcher-item"));
  const active = items.find((i) => i.dataset.themeId === id);
  items.forEach((i) => dfDollar7(i).attr("aria-checked", i === active ? "true" : "false"));
  if (!trigger)
    return;
  const dot = dfDollar7(trigger).find(".theme-switcher-dot")[0];
  const label = dfDollar7(trigger).find(".theme-switcher-label")[0];
  const first = active?.dataset.themeColors?.split(",")[0]?.trim();
  if (dot)
    dfDollar7(dot).css("background", first || "");
  if (label && (active || id === "default"))
    dfDollar7(label).text(active?.dataset.themeLabel || "Default");
  root.dataset.themeId = id;
}
function applyMarkup6(_el, _stateName) {}
function triggerStateChange7(menu, stateName, _config) {
  switch (stateName) {
    case "default":
      try {
        menu.hidePopover();
      } catch {}
      break;
    case "open":
      safeShowPopover4(menu);
      break;
  }
}
var themeSwitcherApi = Object.assign(componentState7({
  component: "theme-switcher",
  states: themeSwitcherStates,
  apply: (menu, state) => triggerStateChange7(menu, state.name, state.config),
  markup: (el, state) => applyMarkup6(el, state.name)
}), {
  select(menu, id) {
    const root = menu.closest(".theme-switcher");
    if (!root)
      throw new Error("theme-switcher: menu is not inside a .theme-switcher root");
    applyThemeId(root, id);
  }
});
df$7.themeSwitcherApi = themeSwitcherApi;
df$7.themeSwitcherStates = themeSwitcherStates;
function init7() {
  dfDollar7(".theme-switcher-menu:not([data-init])").toArray().forEach((menu) => {
    menu.dataset.init = "";
    const root = menu.closest(".theme-switcher");
    const trigger = (root ? dfDollar7(root).find(".theme-switcher-trigger").get(0) : undefined) ?? (menu.id && dfDollar7(`[popovertarget="${menu.id}"]`).get(0));
    const getItems = () => Array.from(dfDollar7(menu).find(".theme-switcher-item").toArray());
    if (trigger) {
      const anchorId = `--theme-switcher-${menu.id || "menu"}`;
      dfDollar7(trigger).css("anchorName", anchorId);
      dfDollar7(menu).css("positionAnchor", anchorId);
    }
    menu.addEventListener("toggle", () => {
      if (trigger)
        dfDollar7(trigger).attr("aria-expanded", menu.matches(":popover-open") ? "true" : "false");
      if (menu.matches(":popover-open")) {
        const first = getItems()[0];
        first?.focus();
        if (first)
          requestAnimationFrame(() => {
            if (menu.matches(":popover-open") && document.activeElement === trigger)
              first.focus();
          });
      }
    });
    getItems().forEach((item) => {
      const holder = dfDollar7(item).find(".theme-switcher-dots").get(0);
      if (holder && !holder.childElementCount) {
        const spans = (item.dataset.themeColors || "").split(",").slice(0, 5).map((c) => c.trim()).filter(Boolean).map((c) => `<span style="background:${c}"></span>`).join("");
        dfDollar7(holder).html(spans);
      }
    });
    menu.addEventListener("click", (e) => {
      const item = e.target.closest(".theme-switcher-item");
      if (!item || !root)
        return;
      applyThemeId(root, item.dataset.themeId || "default");
      menu.hidePopover();
      trigger?.focus();
    });
    menu.addEventListener("keydown", (e) => {
      const items = getItems();
      const idx = items.indexOf(document.activeElement);
      let next = -1;
      if (e.key === "ArrowDown")
        next = idx < 0 ? 0 : (idx + 1) % items.length;
      else if (e.key === "ArrowUp")
        next = idx < 0 ? 0 : (idx - 1 + items.length) % items.length;
      else if (e.key === "Home")
        next = 0;
      else if (e.key === "End")
        next = items.length - 1;
      if (next >= 0) {
        e.preventDefault();
        items[next].focus();
      }
    });
    bindComponent7(menu, themeSwitcherApi);
    if (root) {
      const initial = dfDollar7("#" + CSS.escape(LINK_ID)).get(0)?.dataset.themeId || remembered().value || "default";
      if (initial !== "default" || dfDollar7("#" + CSS.escape(LINK_ID)).get(0))
        syncTrigger(root, initial);
    }
  });
}
document.addEventListener(THEME_EVENT, (e) => {
  const id = e.detail?.id || "default";
  dfDollar7(".theme-switcher").toArray().forEach((root) => syncTrigger(root, id));
});
init7();
new MutationObserver(init7).observe(document, { childList: true, subtree: true });

// dist/components/language-switcher/language-switcher.js
var __df$core8 = globalThis.df$;
var __df$shared8 = __df$core8 && __df$core8.shadcn && __df$core8.shadcn.shared;
if (!__df$shared8 || __df$shared8.abi !== "0.9.14") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals8, defussQuery: defussQuery8, componentState: componentState8, bindComponent: bindComponent8 } = __df$shared8;
var df$8 = defussGlobals8();
var dfDollar8 = defussQuery8();
var languageSwitcherStates = ["default", "open"];
var SEED = `af Afrikaans|Afrikaans|za
am Amharic|አማርኛ|et
ar Arabic|العربية|sa
bg Bulgarian|български|bg
bg-Latn Bulgarian (Latin)|bulgarski|bg
bn Bangla|বাংলা|bd
bs Bosnian|bosanski|ba
ca Catalan|català|es-ct
ceb Cebuano|Binisaya|ph
co Corsican|corsu|fr
cs Czech|čeština|cz
cy Welsh|Cymraeg|gb-wls
da Danish|dansk|dk
de German|Deutsch|de
el Greek|Ελληνικά|gr
el-Latn Greek (Latin)|Ellinika|gr
en English|English|gb
eo Esperanto|Esperanto|
es Spanish|español|es
et Estonian|eesti|ee
eu Basque|euskara|es-pv
fa Persian|فارسی|ir
fi Finnish|suomi|fi
fil Filipino|Filipino|ph
fr French|français|fr
fy Western Frisian|Frysk|nl
ga Irish|Gaeilge|ie
gd Scottish Gaelic|Gàidhlig|gb-sct
gl Galician|galego|es-ga
gu Gujarati|ગુજરાતી|in
ha Hausa|Hausa|ng
haw Hawaiian|ʻŌlelo Hawaiʻi|us
hi Hindi|हिन्दी|in
hi-Latn Hindi (Latin)|Hindi|in
hmn Hmong|Hmoob|la
hr Croatian|hrvatski|hr
ht Haitian Creole|Kreyòl ayisyen|ht
hu Hungarian|magyar|hu
hy Armenian|հայերեն|am
id Indonesian|Bahasa Indonesia|id
ig Igbo|Asụsụ Igbo|ng
is Icelandic|íslenska|is
it Italian|italiano|it
iw Hebrew|עברית|il
ja Japanese|日本語|jp
ja-Latn Japanese (Latin)|Nihongo|jp
jv Javanese|Basa Jawa|id
ka Georgian|ქართული|ge
kk Kazakh|қазақ тілі|kz
km Khmer|ខ្មែរ|kh
kn Kannada|ಕನ್ನಡ|in
ko Korean|한국어|kr
ku Kurdish|Kurdî|iq
ky Kyrgyz|кыргызча|kg
la Latin|Latina|va
lb Luxembourgish|Lëtzebuergesch|lu
lo Lao|ລາວ|la
lt Lithuanian|lietuvių|lt
lv Latvian|latviešu|lv
mg Malagasy|Malagasy|mg
mi Māori|Māori|nz
mk Macedonian|македонски|mk
ml Malayalam|മലയാളം|in
mn Mongolian|монгол|mn
mr Marathi|मराठी|in
ms Malay|Bahasa Melayu|my
mt Maltese|Malti|mt
my Burmese|မြန်မာ|mm
ne Nepali|नेपाली|np
nl Dutch|Nederlands|nl
no Norwegian|norsk|no
ny Nyanja|Chichewa|mw
pa Punjabi|ਪੰਜਾਬੀ|in
pl Polish|polski|pl
ps Pashto|پښتو|af
pt Portuguese|português|pt
ro Romanian|română|ro
ru Russian|русский|ru
ru-Latn Russian (Latin)|Russkiy|ru
sd Sindhi|سنڌي|pk
si Sinhala|සිංහල|lk
sk Slovak|slovenčina|sk
sl Slovenian|slovenščina|si
sm Samoan|Gagana Sāmoa|ws
sn Shona|chiShona|zw
so Somali|Soomaali|so
sq Albanian|shqip|al
sr Serbian|српски|rs
st Southern Sotho|Sesotho|ls
su Sundanese|Basa Sunda|id
sv Swedish|svenska|se
sw Swahili|Kiswahili|tz
ta Tamil|தமிழ்|in
te Telugu|తెలుగు|in
tg Tajik|тоҷикӣ|tj
th Thai|ไทย|th
tr Turkish|Türkçe|tr
uk Ukrainian|українська|ua
ur Urdu|اردو|pk
uz Uzbek|oʻzbekcha|uz
vi Vietnamese|Tiếng Việt|vn
xh Xhosa|isiXhosa|za
yi Yiddish|ייִדיש|il
yo Yoruba|Èdè Yorùbá|ng
zh Chinese|中文|cn
zh-Latn Chinese (Pinyin)|Zhōngwén|cn
zu Zulu|isiZulu|za`;
var RTL = new Set(["ar", "fa", "iw", "he", "ps", "sd", "ur", "yi"]);
var LANGUAGES = SEED.split(`
`).map((line) => {
  const sp = line.indexOf(" ");
  const code = line.slice(0, sp);
  const [english, native, region] = line.slice(sp + 1).split("|");
  return { code, english, native, region, dir: RTL.has(code) ? "rtl" : "ltr" };
});
var BY_CODE = new Map(LANGUAGES.map((l) => [l.code.toLowerCase(), l]));
var ALIAS = { he: "iw", nb: "no", tl: "fil" };
var settings = {
  flags: "https://cdn.jsdelivr.net/npm/flag-icons@7.2.3/flags/{shape}/{region}.svg"
};
var resolve = (t) => typeof t === "string" ? dfDollar8("#" + CSS.escape(t)).get(0) ?? dfDollar8(t).get(0) : t;
var esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function partsOf(tag) {
  try {
    const l = new Intl.Locale(tag);
    return { language: l.language, script: l.script ?? "", region: (l.region ?? "").toLowerCase() };
  } catch {
    const [language = "", ...rest] = tag.split(/[-_]/);
    return {
      language: language.toLowerCase(),
      script: rest.find((p) => p.length === 4) ?? "",
      region: (rest.find((p) => p.length === 2) ?? "").toLowerCase()
    };
  }
}
function seedOf(tag) {
  const { language, script } = partsOf(tag);
  const lang = ALIAS[language] ?? language;
  return BY_CODE.get(tag.toLowerCase()) ?? (script ? BY_CODE.get(`${lang}-${script}`.toLowerCase()) : undefined) ?? BY_CODE.get(lang);
}
var capitalize = (name, locale) => {
  if (!name)
    return name;
  let first;
  try {
    first = name.charAt(0).toLocaleUpperCase(locale);
  } catch {
    first = name.charAt(0).toUpperCase();
  }
  return first + name.slice(1);
};
var displayCache = new Map;
function displayNames(locale, type) {
  const key = `${type}:${locale}`;
  if (!displayCache.has(key)) {
    let d = null;
    try {
      d = new Intl.DisplayNames([locale], { type, fallback: "none" });
      if (new Intl.Locale(d.resolvedOptions().locale).language !== partsOf(locale).language)
        d = null;
    } catch {
      d = null;
    }
    displayCache.set(key, d);
  }
  return displayCache.get(key) ?? null;
}
function cldrName(locale, type, code) {
  try {
    return displayNames(locale, type)?.of(code);
  } catch {
    return;
  }
}
function nameIn(tag, locale) {
  const seed = seedOf(tag);
  const { region } = partsOf(tag);
  const self = partsOf(locale).language === partsOf(tag).language;
  if (seed && !region && seed.code.toLowerCase() === tag.toLowerCase().replace(/^he$/, "iw")) {
    if (self)
      return capitalize(seed.native, tag);
    if (partsOf(locale).language === "en")
      return seed.english;
  }
  const n = cldrName(locale, "language", tag.replace(/^iw\b/, "he"));
  if (n && n.toLowerCase() !== tag.toLowerCase())
    return capitalize(n, locale);
  const base = seed ? self ? capitalize(seed.native, tag) : seed.english : tag;
  if (!region)
    return base;
  const regionName = cldrName(locale, "region", region.toUpperCase()) ?? region.toUpperCase();
  return `${base} (${regionName})`;
}
function regionFor(el, tag) {
  for (const pair of (el.dataset.flags || "").split(/\s+/).filter(Boolean)) {
    const [t, r] = pair.split(":");
    if (t && t.toLowerCase() === tag.toLowerCase())
      return (r || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  }
  return (partsOf(tag).region || seedOf(tag)?.region || "").replace(/[^a-z0-9-]/g, "");
}
var languagesOf = (el) => {
  const list = (el.dataset.languages || "en").split(/[\s,]+/).filter(Boolean);
  return list.length ? list : ["en"];
};
var valueOf = (el, languages = languagesOf(el)) => {
  const v = (el.dataset.value || "").toLowerCase();
  return languages.find((l) => l.toLowerCase() === v) ?? languages[0];
};
var nextOf = (el, tag) => {
  const languages = languagesOf(el);
  return languages[(languages.indexOf(tag) + 1) % languages.length];
};
var codeLabel = (tag) => {
  const { language, region } = partsOf(tag);
  return (region ? `${language}-${region}` : language).toUpperCase();
};
var dirOf = (tag) => RTL.has(partsOf(tag).language) ? "rtl" : "ltr";
var idPart = (tag) => tag.toLowerCase().replace(/[^a-z0-9-]/g, "-");
function flagHtml(el, tag) {
  if (el.dataset.flag === "none")
    return "";
  const region = regionFor(el, tag);
  const shape = ["square", "circle", "squircle"].includes(el.dataset.flagShape || "") ? "1x1" : "4x3";
  const url = region ? settings.flags.replace("{shape}", shape).replace("{region}", region) : "";
  const image = region ? ` data-region="${esc(region)}" style="--language-switcher-flag: url('${esc(url)}')"` : "";
  return `<span class="language-switcher-flag" data-code="${esc(partsOf(tag).language.toUpperCase())}"${image} aria-hidden="true"></span>`;
}
var GLOBE = '<svg class="language-switcher-icon" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>';
var CHEVRON = '<svg class="combobox-chevron" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>';
function faceHtml(el, tag) {
  const display = el.dataset.display || "label";
  const flag = flagHtml(el, tag) || (display === "icon" ? GLOBE : "");
  const text = display === "icon" ? "" : display === "code" ? codeLabel(tag) : el.dataset.names === "ui" ? nameIn(tag, valueOf(el)) : nameIn(tag, tag);
  return `${flag}${text ? `<span class="language-switcher-label" lang="${esc(tag)}" dir="${dirOf(tag)}">${esc(text)}</span>` : ""}`;
}
var labelOf2 = (el) => el.dataset.label || el.getAttribute("aria-label") || "Language";
var ariaOf = (el, tag) => `${labelOf2(el)}: ${nameIn(tag, tag)}`;
function namesOf(el, tag, ui) {
  const own = nameIn(tag, tag), shown = nameIn(tag, ui);
  if (el.dataset.names === "native")
    return { name: own, lang: tag, alt: "", altLang: tag };
  if (el.dataset.names === "ui")
    return { name: shown, lang: ui, alt: shown === own ? "" : own, altLang: tag };
  return { name: own, lang: tag, alt: shown === own ? "" : shown, altLang: ui };
}
var optionInner = (el, tag, ui) => {
  const n = namesOf(el, tag, ui);
  return `${flagHtml(el, tag)}<span class="language-switcher-name" lang="${esc(n.lang)}" dir="${dirOf(n.lang)}">${esc(n.name)}</span><span class="language-switcher-alt" lang="${esc(n.altLang)}" dir="${dirOf(n.altLang)}"${n.alt ? "" : " hidden"}>${esc(n.alt)}</span>`;
};
function comboboxHtml(el, uid) {
  const languages = languagesOf(el);
  const value = valueOf(el, languages);
  const search = el.dataset.search || "Search languages...";
  const options = languages.map((tag) => `<div role="option" id="${uid}-${idPart(tag)}" class="combobox-item language-switcher-option" data-value="${esc(tag)}" aria-selected="${tag === value}">${optionInner(el, tag, value)}</div>`).join("");
  const icon = (el.dataset.display || "label") === "icon";
  return `<div class="combobox language-switcher-combobox" data-ce-chrome${el.dataset.size ? ` data-size="${esc(el.dataset.size)}"` : ""}>
<button type="button" class="btn combobox-trigger" data-variant="${esc(el.dataset.buttonVariant || "ghost")}"${icon ? ' data-size="icon"' : ""} aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(ariaOf(el, value))}" aria-controls="${uid}-popover"><span class="combobox-value">${faceHtml(el, value)}</span>${icon ? "" : CHEVRON}</button>
<div id="${uid}-popover" class="combobox-content language-switcher-content" popover>
<div class="combobox-search"${languages.length > 7 ? "" : " data-quiet"}><input class="combobox-search-input" type="text" role="combobox" autocomplete="off" aria-expanded="true" aria-controls="${uid}-listbox" aria-activedescendant="" aria-autocomplete="list" placeholder="${esc(search)}" aria-label="${esc(search)}"></div>
<div id="${uid}-listbox" role="listbox" class="combobox-listbox" aria-label="${esc(labelOf2(el))}"><div class="combobox-empty" hidden>${esc(el.dataset.empty || "No language found.")}</div>${options}</div>
</div>
</div>`;
}
function swapHtml(el) {
  const value = valueOf(el);
  return `<label class="swap language-switcher-swap"${el.dataset.swap === "fade" ? "" : ` data-variant="${esc(el.dataset.swap || "flip")}"`} data-ce-chrome${el.dataset.size ? ` data-size="${esc(el.dataset.size)}"` : ""}>
<input type="checkbox" role="button" aria-label="${esc(swapLabel(el, value))}">
<span class="swap-off">${faceHtml(el, value)}</span>
<span class="swap-on">${faceHtml(el, nextOf(el, value))}</span>
</label>`;
}
function menuHtml(el) {
  const value = valueOf(el);
  return `<div class="language-switcher-menu" data-ce-chrome>${languagesOf(el).map((tag) => `<button type="button" class="dropdown-item dropdown-radio language-switcher-item" role="menuitemradio" tabindex="-1" aria-checked="${tag === value}" data-value="${esc(tag)}">${optionInner(el, tag, value)}</button>`).join("")}</div>`;
}
var swapLabel = (el, value) => {
  const next = nextOf(el, value);
  return `${ariaOf(el, value)} - ${el.dataset.next || "next"}: ${nameIn(next, next)}`;
};
var STRUCTURE = [
  "languages",
  "variant",
  "display",
  "names",
  "flag",
  "flags",
  "flagShape",
  "size",
  "buttonVariant",
  "search",
  "empty",
  "next",
  "swap"
];
var structureOf = (el) => STRUCTURE.map((k) => el.dataset[k] ?? "").join("|");
var chromeOf = (el) => dfDollar8(el).children("[data-ce-chrome]").get(0);
function draw(el) {
  const uid = el.id ? `${el.id}-ls` : el._lsId ??= `language-switcher-${++sequence}`;
  const focused = el.contains(document.activeElement);
  dfDollar8(el).children("[data-ce-chrome]").remove();
  const variant = el.dataset.variant;
  dfDollar8(el).append(dfDollar8(variant === "swap" ? swapHtml(el) : variant === "menu" ? menuHtml(el) : comboboxHtml(el, uid)));
  el._lsStructure = structureOf(el);
  el._lsValue = valueOf(el);
  if (focused)
    dfDollar8(el).find('.combobox-trigger, .swap > input, .language-switcher-item[aria-checked="true"]').get(0)?.focus();
}
var sequence = 0;
function update(el) {
  if (el._lsStructure !== structureOf(el) || !chromeOf(el))
    return draw(el);
  const value = valueOf(el);
  const changed = el._lsValue !== value;
  el._lsValue = value;
  const chrome = dfDollar8(chromeOf(el));
  if (el.dataset.variant === "swap") {
    const input = chrome.find(":scope > input").get(0);
    if (changed) {
      const [shown, hidden] = input.checked ? [".swap-on", ".swap-off"] : [".swap-off", ".swap-on"];
      chrome.find(`:scope > ${shown}`).html(faceHtml(el, value));
      chrome.find(`:scope > ${hidden}`).html(faceHtml(el, nextOf(el, value)));
    }
    dfDollar8(input).attr("aria-label", swapLabel(el, value));
    return;
  }
  if (el.dataset.variant === "menu") {
    if (!changed)
      return;
    chrome.find(".language-switcher-item").each((_i, item) => {
      const tag = item.dataset.value || "";
      dfDollar8(item).attr("aria-checked", String(tag === value)).html(optionInner(el, tag, value));
    });
    return;
  }
  chrome.find(".combobox-trigger").attr("aria-label", ariaOf(el, value));
  chrome.find('[role="listbox"]').attr("aria-label", labelOf2(el));
  if (!changed)
    return;
  chrome.find(".combobox-value").html(faceHtml(el, value)).attr("data-placeholder", null);
  chrome.find(".language-switcher-option").each((_i, option) => {
    const tag = option.dataset.value || "";
    dfDollar8(option).attr("aria-selected", String(tag === value)).html(optionInner(el, tag, value));
  });
}
function choose(el, tag, announce = true) {
  const languages = languagesOf(el);
  const next = languages.find((l) => l.toLowerCase() === String(tag).toLowerCase());
  if (!next)
    return false;
  const previous = valueOf(el, languages);
  if (el.dataset.value !== next)
    dfDollar8(el).attr("data-value", next);
  update(el);
  if (announce && next !== previous)
    el.dispatchEvent(new CustomEvent("language-change", {
      bubbles: true,
      detail: { value: next, previous, name: nameIn(next, next), dir: dirOf(next) }
    }));
  return true;
}
var popoverOf = (el) => dfDollar8(el).find(":scope > .language-switcher-combobox > .combobox-content").get(0);
var isOpen = (el) => {
  try {
    return !!popoverOf(el)?.matches(":popover-open");
  } catch {
    return false;
  }
};
function applyMarkup7(el, _name, config) {
  const languages = languagesOf(el);
  const value = languages.find((l) => l.toLowerCase() === String(config?.value ?? "").toLowerCase());
  if (value)
    dfDollar8(el).attr("data-value", value);
}
function triggerStateChange8(el, name, config) {
  if (config?.value)
    choose(el, config.value, false);
  const popover = popoverOf(el);
  if (!popover)
    return;
  if (name === "open" && !isOpen(el))
    dfDollar8(el).find(".combobox-trigger").get(0)?.click();
  else if (name !== "open" && isOpen(el))
    popover.hidePopover();
}
var languageSwitcherApi = componentState8({
  component: "language-switcher",
  states: languageSwitcherStates,
  mergeConfig: true,
  apply: (el, state) => triggerStateChange8(el, state.name, state.config),
  read: (el) => ({ name: isOpen(el) ? "open" : "default", config: { value: valueOf(el) } }),
  markup: (el, state) => applyMarkup7(el, state.name, state.config)
});
df$8.languageSwitcherApi = languageSwitcherApi;
df$8.languageSwitcherStates = languageSwitcherStates;
function init8() {
  dfDollar8(".language-switcher:not([data-init])").each((_i, el) => {
    el.dataset.init = "";
    if (!el.dataset.value || valueOf(el) !== el.dataset.value)
      dfDollar8(el).attr("data-value", valueOf(el));
    draw(el);
    dfDollar8(el).on("combobox:change", (e) => {
      const value = e.detail?.values?.[0];
      el._lsValue = "";
      if (!value || !choose(el, value))
        update(el);
      languageSwitcherApi.commit(el, isOpen(el) ? "open" : "default", { value: valueOf(el) });
    });
    dfDollar8(el).on("change", (e) => {
      const input = e.target;
      if (!input.matches(".language-switcher-swap > input") || input.closest(".language-switcher") !== el)
        return;
      choose(el, nextOf(el, valueOf(el)));
      languageSwitcherApi.commit(el, "default", { value: valueOf(el) });
    });
    const pick = (item) => {
      const it = item;
      if (!it?.matches?.(".language-switcher-item") || it.closest(".language-switcher") !== el)
        return;
      el._lsValue = "";
      if (!choose(el, it.dataset.value || ""))
        update(el);
      languageSwitcherApi.commit(el, "default", { value: valueOf(el) });
    };
    dfDollar8(el).on("dropdown:select", (e) => pick(e.detail?.item));
    dfDollar8(el).on("click", (e) => {
      const item = e.target?.closest?.(".language-switcher-item");
      if (item && !item.closest('[role="menu"]'))
        pick(item);
    });
    dfDollar8(el).on("keydown", (e) => {
      const input = e.target;
      if (e.key !== "Enter" || !input.matches?.(".language-switcher-swap > input"))
        return;
      e.preventDefault();
      input.click();
    });
    el.addEventListener("toggle", () => languageSwitcherApi.commit(el, isOpen(el) ? "open" : "default", { value: valueOf(el) }), true);
    new MutationObserver(() => update(el)).observe(el, { attributes: true, attributeFilter: OBSERVED });
    bindComponent8(el, languageSwitcherApi, { name: "default", config: { value: valueOf(el) } });
  });
}
var OBSERVED = [
  "data-value",
  "data-label",
  "aria-label",
  ...STRUCTURE.map((k) => "data-" + k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()))
];
df$8.languageSwitcher = {
  languages: () => LANGUAGES.map((l) => ({ ...l })),
  name: (tag, locale) => nameIn(tag, locale ?? tag),
  region: (tag) => partsOf(tag).region || seedOf(tag)?.region || "",
  choose: (target, tag) => {
    const el = resolve(target);
    if (!el || !choose(el, tag))
      return false;
    languageSwitcherApi.commit(el, isOpen(el) ? "open" : "default", { value: valueOf(el) });
    return true;
  },
  bind: (target, i18n) => {
    const el = resolve(target);
    if (!el || !i18n)
      return () => {};
    const follow = (locale) => {
      if (locale && locale.toLowerCase() !== valueOf(el).toLowerCase() && choose(el, locale, false))
        languageSwitcherApi.commit(el, isOpen(el) ? "open" : "default", { value: valueOf(el) });
    };
    follow(i18n.locale);
    const onChange = (e) => {
      const value = e.detail.value;
      if (value !== i18n.locale)
        i18n.setLocale(value);
    };
    el.addEventListener("language-change", onChange);
    const stop = i18n.subscribe?.((snapshot) => follow(snapshot.locale));
    return () => {
      el.removeEventListener("language-change", onChange);
      stop?.();
    };
  },
  configure: (options) => {
    if (options?.flags)
      settings.flags = options.flags;
  }
};
init8();
new MutationObserver(init8).observe(document, { childList: true, subtree: true });

//# debugId=917312E901D435B864756E2164756E21
//# sourceMappingURL=navigation.js.map
