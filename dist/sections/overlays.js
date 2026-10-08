// dist/components/popover/popover.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.9.7") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals, safeShowPopover, defussQuery, componentState, bindComponent } = __df$shared;
var df$ = defussGlobals();
var dfDollar = defussQuery();
var popoverStates = ["default", "open"];
function applyMarkup(_el, _stateName) {}
function triggerStateChange(popover, stateName, _config) {
  switch (stateName) {
    case "default":
      try {
        popover.hidePopover();
      } catch {}
      break;
    case "open":
      safeShowPopover(popover);
      break;
  }
}
var popoverApi = componentState({
  component: "popover",
  states: popoverStates,
  apply: (popover, state) => triggerStateChange(popover, state.name, state.config),
  markup: (el, state) => applyMarkup(el, state.name)
});
df$.popoverApi = popoverApi;
df$.popoverStates = popoverStates;
function init() {
  dfDollar("[popovertarget]:not([data-init])").toArray().forEach((trigger) => {
    const id = trigger.getAttribute("popovertarget");
    const popover = dfDollar("#" + CSS.escape(id)).get(0);
    if (!popover || !popover.classList.contains("popover"))
      return;
    trigger.dataset.init = "";
    const anchorId = `--popover-${id}`;
    trigger.style.anchorName = anchorId;
    popover.style.positionAnchor = anchorId;
  });
  dfDollar(".popover[popover]:not([data-init])").toArray().forEach((popover) => {
    popover.dataset.init = "";
    bindComponent(popover, popoverApi);
  });
}
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

// dist/components/tooltip/tooltip.js
var __df$core2 = globalThis.df$;
var __df$shared2 = __df$core2 && __df$core2.shadcn && __df$core2.shadcn.shared;
if (!__df$shared2 || __df$shared2.abi !== "0.9.7") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals2, safeShowPopover: safeShowPopover2, defussQuery: defussQuery2, componentState: componentState2, bindComponent: bindComponent2 } = __df$shared2;
var df$2 = defussGlobals2();
var dfDollar2 = defussQuery2();
var tooltipStates = ["default", "visible"];
function applyMarkup2(_el, _stateName) {}
function triggerStateChange2(tip, stateName, _config) {
  switch (stateName) {
    case "default":
      try {
        tip.hidePopover();
      } catch {}
      break;
    case "visible":
      safeShowPopover2(tip);
      markGroupOpen();
      break;
  }
}
var tooltipApi = componentState2({
  component: "tooltip",
  states: tooltipStates,
  apply: (tip, state) => triggerStateChange2(tip, state.name, state.config),
  markup: (el, state) => applyMarkup2(el, state.name)
});
df$2.tooltipApi = tooltipApi;
df$2.tooltipStates = tooltipStates;
var DELAY_DEFAULT = 700;
var CLOSE_DELAY_DEFAULT = 0;
var GROUP_TIMEOUT = 400;
var groupOpen = false;
var groupTimer = null;
function markGroupOpen() {
  groupOpen = true;
  clearTimeout(groupTimer);
}
function scheduleGroupReset() {
  clearTimeout(groupTimer);
  groupTimer = setTimeout(() => {
    groupOpen = false;
  }, GROUP_TIMEOUT);
}
function init2() {
  dfDollar2("[data-tooltip-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const tip = dfDollar2("#" + CSS.escape(trigger.dataset.tooltipTrigger)).get(0);
    if (!tip)
      return;
    const anchorId = `--tooltip-${tip.id}`;
    trigger.style.anchorName = anchorId;
    tip.style.positionAnchor = anchorId;
    trigger.setAttribute("aria-describedby", tip.id);
    const delay = Number(trigger.dataset.delay ?? DELAY_DEFAULT);
    const closeDelay = Number(trigger.dataset.closeDelay ?? CLOSE_DELAY_DEFAULT);
    let openTimer = null;
    let closeTimer = null;
    function show() {
      clearTimeout(closeTimer);
      clearTimeout(openTimer);
      const wait = groupOpen ? 0 : delay;
      openTimer = setTimeout(() => {
        try {
          tip.showPopover();
        } catch {}
        markGroupOpen();
      }, wait);
    }
    function hide() {
      clearTimeout(openTimer);
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => {
        try {
          tip.hidePopover();
        } catch {}
        scheduleGroupReset();
      }, closeDelay);
    }
    trigger.addEventListener("mouseenter", show);
    trigger.addEventListener("mouseleave", hide);
    trigger.addEventListener("focus", show);
    trigger.addEventListener("blur", hide);
  });
  dfDollar2(".tooltip[popover]:not([data-init])").toArray().forEach((tip) => {
    tip.dataset.init = "";
    bindComponent2(tip, tooltipApi);
  });
}
init2();
new MutationObserver(init2).observe(document, { childList: true, subtree: true });
if (!document.__tooltipScrollInit) {
  document.__tooltipScrollInit = true;
  document.addEventListener("scroll", () => {
    dfDollar2(".tooltip:popover-open").toArray().forEach((tip) => {
      try {
        tip.hidePopover();
      } catch {}
    });
  }, { passive: true, capture: true });
}

// dist/components/context-menu/context-menu.js
var __df$core3 = globalThis.df$;
var __df$shared3 = __df$core3 && __df$core3.shadcn && __df$core3.shadcn.shared;
if (!__df$shared3 || __df$shared3.abi !== "0.9.7") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals3, safeShowPopover: safeShowPopover3, defussQuery: defussQuery3, componentState: componentState3, bindComponent: bindComponent3 } = __df$shared3;
var df$3 = defussGlobals3();
var dfDollar3 = defussQuery3();
var contextMenuStates = ["default", "open"];
function keepInView(menu, x, y) {
  const fit = () => {
    const { offsetWidth: w, offsetHeight: h } = menu;
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    if (x + w > vw - 4)
      menu.style.left = `${Math.max(4, Math.min(x - w, vw - w - 4))}px`;
    if (y + h > vh - 4)
      menu.style.top = `${Math.max(4, Math.min(y - h, vh - h - 4))}px`;
  };
  if (menu.matches(":popover-open"))
    fit();
  else
    menu.addEventListener("toggle", (e) => {
      if (e.newState === "open")
        fit();
    }, { once: true });
}
function applyMarkup3(_el, _stateName) {}
function triggerStateChange3(menu, stateName, config) {
  switch (stateName) {
    case "default":
      menu.hidePopover();
      break;
    case "open": {
      const x = Number(config?.x ?? 8);
      const y = Number(config?.y ?? 8);
      menu.style.position = "fixed";
      menu.style.top = `${y}px`;
      menu.style.left = `${x}px`;
      safeShowPopover3(menu);
      keepInView(menu, x, y);
      break;
    }
  }
}
var contextMenuApi = componentState3({
  component: "context-menu",
  states: contextMenuStates,
  apply: (menu, state) => triggerStateChange3(menu, state.name, state.config),
  read: (menu, state) => {
    return {
      name: menu.matches(":popover-open") ? "open" : "default",
      config: state.config
    };
  },
  markup: (el, state) => applyMarkup3(el, state.name)
});
df$3.contextMenuApi = contextMenuApi;
df$3.contextMenuStates = contextMenuStates;
var pendingOpen = null;
var lastRightUp = 0;
if (!document.__ctxMenuReleaseInit) {
  document.__ctxMenuReleaseInit = true;
  document.addEventListener("pointerup", (e) => {
    if (e.button !== 2)
      return;
    lastRightUp = performance.now();
    if (!pendingOpen)
      return;
    const { menu, x, y } = pendingOpen;
    pendingOpen = null;
    openMenuAt(menu, x, y);
  });
  document.addEventListener("pointercancel", () => {
    pendingOpen = null;
  });
}
function openMenuAt(menu, x, y) {
  menu.style.position = "fixed";
  menu.style.top = `${y}px`;
  menu.style.left = `${x}px`;
  safeShowPopover3(menu);
  keepInView(menu, x, y);
  menu.dataset.stateName = "open";
}
function init3() {
  dfDollar3("[data-context-menu]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const menu = dfDollar3("#" + CSS.escape(trigger.dataset.contextMenu)).get(0);
    if (!menu)
      return;
    bindComponent3(menu, contextMenuApi);
    trigger.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (e.pointerId === undefined || e.pointerId < 0) {
        requestAnimationFrame(() => openMenuAt(menu, e.clientX, e.clientY));
        return;
      }
      if (lastRightUp > 0 && performance.now() - lastRightUp < 100) {
        openMenuAt(menu, e.clientX, e.clientY);
        return;
      }
      pendingOpen = { menu, x: e.clientX, y: e.clientY };
    });
    menu.addEventListener("click", (e) => {
      if (e.target.closest(".context-menu-item")) {
        menu.hidePopover();
        menu.dataset.stateName = "default";
      }
    });
    menu.addEventListener("toggle", (e) => {
      if (e.newState === "closed")
        menu.dataset.stateName = "default";
    });
  });
}
init3();
new MutationObserver(init3).observe(document, { childList: true, subtree: true });

// dist/components/dialog/dialog.js
var __df$core4 = globalThis.df$;
var __df$shared4 = __df$core4 && __df$core4.shadcn && __df$core4.shadcn.shared;
if (!__df$shared4 || __df$shared4.abi !== "0.9.7") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals4, defussQuery: defussQuery4, componentState: componentState4, bindComponent: bindComponent4 } = __df$shared4;
var df$4 = defussGlobals4();
var dfDollar4 = defussQuery4();
var dialogStates = ["default", "open"];
function applyMarkup4(dialog, stateName) {
  dfDollar4(dialog).attr("open", stateName === "open" ? "" : null);
}
function triggerStateChange4(dialog, stateName, _config) {
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
var shown = (dialog) => dialog.open ? "open" : "default";
var dialogApi = componentState4({
  component: "dialog",
  states: dialogStates,
  apply: (dialog, state) => triggerStateChange4(dialog, state.name, state.config),
  read: (dialog, state) => ({ name: shown(dialog), config: state.config }),
  markup: (el, state) => applyMarkup4(el, state.name)
});
df$4.dialogApi = dialogApi;
df$4.dialogStates = dialogStates;
function init4() {
  dfDollar4("[data-dialog-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const dialog = dfDollar4("#" + CSS.escape(trigger.dataset.dialogTrigger)).get(0);
    if (!dialog)
      return;
    trigger.addEventListener("click", () => {
      dialog._trigger = trigger;
      dialog.showModal();
    });
  });
  dfDollar4("dialog:not(.alert-dialog):not(.sheet):not(.command):not(.window):not(.cookie-consent-dialog):not([data-init])").toArray().forEach((dialog) => {
    dfDollar4(dialog).data("init", "");
    bindComponent4(dialog, dialogApi, { name: shown(dialog), config: {} });
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog)
        dialog.close();
    });
    dfDollar4(dialog).find("[data-dialog-close]").toArray().forEach((btn) => {
      btn.addEventListener("click", () => {
        dialog.close();
      });
    });
    dialog.addEventListener("close", () => {
      if (dialog.open)
        return;
      if (dialog._trigger)
        dialog._trigger.focus();
    });
  });
}
init4();
new MutationObserver(init4).observe(document, { childList: true, subtree: true });

// dist/components/sheet/sheet.js
var __df$core5 = globalThis.df$;
var __df$shared5 = __df$core5 && __df$core5.shadcn && __df$core5.shadcn.shared;
if (!__df$shared5 || __df$shared5.abi !== "0.9.7") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals5, defussQuery: defussQuery5, componentState: componentState5, bindComponent: bindComponent5 } = __df$shared5;
var df$5 = defussGlobals5();
var dfDollar5 = defussQuery5();
var sheetStates = ["default", "open"];
function applyMarkup5(el, stateName) {
  dfDollar5(el).attr("open", stateName === "open" ? "" : null);
}
function triggerStateChange5(sheet, stateName, _config) {
  switch (stateName) {
    case "default":
      if (sheet.open)
        sheet.close();
      break;
    case "open":
      if (!sheet.open)
        sheet.showModal();
      break;
  }
}
var shown2 = (sheet) => sheet.open ? "open" : "default";
var sheetApi = componentState5({
  component: "sheet",
  states: sheetStates,
  apply: (sheet, state) => triggerStateChange5(sheet, state.name, state.config),
  read: (sheet, state) => ({ name: shown2(sheet), config: state.config }),
  markup: (el, state) => applyMarkup5(el, state.name)
});
df$5.sheetApi = sheetApi;
df$5.sheetStates = sheetStates;
function init5() {
  dfDollar5("[data-sheet-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const sheet = dfDollar5("#" + CSS.escape(trigger.dataset.sheetTrigger)).get(0);
    if (!sheet)
      return;
    trigger.addEventListener("click", () => {
      sheet._trigger = trigger;
      sheet.showModal();
    });
  });
  dfDollar5("dialog.sheet:not([data-init])").toArray().forEach((sheet) => {
    sheet.dataset.init = "";
    bindComponent5(sheet, sheetApi, { name: shown2(sheet), config: {} });
    sheet.addEventListener("click", (e) => {
      if (e.target === sheet)
        sheet.close();
    });
    dfDollar5(sheet).find("[data-sheet-close]").toArray().forEach((btn) => {
      btn.addEventListener("click", () => {
        sheet.close();
      });
    });
    sheet.addEventListener("close", () => {
      if (sheet.open)
        return;
      if (sheet._trigger)
        sheet._trigger.focus();
    });
  });
}
init5();
new MutationObserver(init5).observe(document, { childList: true, subtree: true });

// dist/components/accordion/accordion.js
var __df$core6 = globalThis.df$;
var __df$shared6 = __df$core6 && __df$core6.shadcn && __df$core6.shadcn.shared;
if (!__df$shared6 || __df$shared6.abi !== "0.9.7") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals6, defussQuery: defussQuery6, componentState: componentState6, bindComponent: bindComponent6 } = __df$shared6;
var df$6 = defussGlobals6();
var dfDollar6 = defussQuery6();
var accordionStates = ["default", "all-open", "all-closed"];
function applyMarkup6(accordion, stateName, defaults) {
  dfDollar6(accordion).find(".accordion-item").each((i, item) => {
    const open = stateName === "all-open" ? true : stateName === "all-closed" ? false : defaults ? defaults[i] : null;
    if (open !== null && open !== undefined)
      dfDollar6(item).attr("open", open ? "" : null);
  });
}
function triggerStateChange6(accordion, stateName, _config) {
  const gen = (accordion._applyGen ?? 0) + 1;
  accordion._applyGen = gen;
  accordion._applying = true;
  applyMarkup6(accordion, stateName, accordion._defaultOpen ?? []);
  setTimeout(() => {
    if (accordion._applyGen === gen)
      accordion._applying = false;
  }, 0);
}
var accordionApi = componentState6({
  component: "accordion",
  states: accordionStates,
  apply: (accordion, state) => triggerStateChange6(accordion, state.name, state.config),
  markup: (el, state) => applyMarkup6(el, state.name, null)
});
df$6.accordionApi = accordionApi;
df$6.accordionStates = accordionStates;
function init6() {
  dfDollar6(".accordion:not([data-api])").each((_i, accordion) => {
    dfDollar6(accordion).data("api", "");
    accordion._defaultOpen = dfDollar6(accordion).find(".accordion-item").toArray().map((item) => item.open);
    bindComponent6(accordion, accordionApi);
  });
  dfDollar6('.accordion[data-type="single"]:not([data-init])').each((_i, accordion) => {
    dfDollar6(accordion).data("init", "");
    const items = dfDollar6(accordion).find(".accordion-item").toArray();
    const collapsible = dfDollar6(accordion).attr("data-collapsible") != null;
    items.forEach((item) => {
      dfDollar6(item).on("beforetoggle", (e) => {
        if (accordion._applying)
          return;
        if (e.newState !== "closed" || collapsible)
          return;
        if (!items.some((i) => i !== item && i.open))
          e.preventDefault();
      });
      dfDollar6(item).on("toggle", () => {
        if (accordion._applying)
          return;
        if (item.open) {
          items.forEach((sibling) => {
            if (sibling !== item && sibling.open)
              sibling.open = false;
          });
        } else if (!collapsible) {
          if (!items.some((i) => i.open))
            item.open = true;
        }
      });
    });
  });
}
init6();
new MutationObserver(init6).observe(document, { childList: true, subtree: true });

// dist/components/command/command.js
var __df$core7 = globalThis.df$;
var __df$shared7 = __df$core7 && __df$core7.shadcn && __df$core7.shadcn.shared;
if (!__df$shared7 || __df$shared7.abi !== "0.9.7") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals7, defussQuery: defussQuery7, componentState: componentState7, bindComponent: bindComponent7, bindGlobalKeys } = __df$shared7;
var df$7 = defussGlobals7();
var dfDollar7 = defussQuery7();
var commandStates = ["default", "open"];
function applyMarkup7(el, stateName) {
  dfDollar7(el).attr("open", stateName === "open" ? "" : null);
}
function triggerStateChange7(dialog, stateName, _config) {
  switch (stateName) {
    case "default":
      if (dialog.open)
        dialog.close();
      break;
    case "open":
      if (!dialog.open)
        dialog.showModal();
      {
        const input = dfDollar7(dialog).find(".command-input").get(0);
        if (input)
          input.focus();
      }
      break;
  }
}
var shown3 = (dialog) => dialog.open ? "open" : "default";
var commandApi = componentState7({
  component: "command",
  states: commandStates,
  apply: (dialog, state) => triggerStateChange7(dialog, state.name, state.config),
  read: (dialog, state) => ({ name: shown3(dialog), config: state.config }),
  markup: (el, state) => applyMarkup7(el, state.name)
});
df$7.commandApi = commandApi;
df$7.commandStates = commandStates;
bindGlobalKeys((e) => {
  if (!(e.metaKey || e.ctrlKey) || e.altKey || e.key.toLowerCase() !== "k")
    return;
  const dialog = dfDollar7("dialog.command").get(0);
  if (!dialog)
    return;
  e.preventDefault();
  if (dialog.open)
    dialog.close();
  else {
    dialog.showModal();
    const input = dfDollar7(dialog).find(".command-input").get(0);
    if (input)
      input.focus();
  }
  return true;
}, { editable: true });
function getVisibleItems(list) {
  return Array.from(dfDollar7(list).find('.command-item:not([hidden]):not([aria-disabled="true"])'));
}
function highlightItem(list, index) {
  const visible = getVisibleItems(list);
  dfDollar7(list).find(".command-item[data-highlighted]").data("highlighted", null);
  if (visible.length === 0)
    return -1;
  const clamped = (index % visible.length + visible.length) % visible.length;
  dfDollar7(visible[clamped]).data("highlighted", "");
  visible[clamped].scrollIntoView({ block: "nearest" });
  return clamped;
}
function init7() {
  dfDollar7("dialog.command:not([data-init])").toArray().forEach((dialog) => {
    dialog.dataset.init = "";
    bindComponent7(dialog, commandApi, { name: shown3(dialog), config: {} });
    const input = dfDollar7(dialog).find(".command-input").get(0);
    const list = dfDollar7(dialog).find(".command-list").get(0);
    const empty = dfDollar7(dialog).find(".command-empty").get(0);
    if (!input || !list)
      return;
    let highlightIndex = -1;
    const filter = (q) => {
      const query = q.toLowerCase();
      let hasVisible = false;
      const $items = dfDollar7(list).find(".command-item");
      $items.each(function() {
        const match = !query || this.textContent.toLowerCase().includes(query);
        dfDollar7(this).prop("hidden", !match);
        if (match)
          hasVisible = true;
      });
      dfDollar7(list).find(".command-group").each(function() {
        dfDollar7(this).prop("hidden", dfDollar7(this).find(".command-item:not([hidden])").length === 0);
      });
      dfDollar7(list).find(".command-separator").prop("hidden", !!query);
      if (empty)
        dfDollar7(empty).prop("hidden", hasVisible);
      highlightIndex = highlightItem(list, 0);
    };
    input.addEventListener("input", () => {
      filter(input.value);
    });
    input.addEventListener("keydown", (e) => {
      const visible = getVisibleItems(list);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        highlightIndex = highlightItem(list, highlightIndex + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        highlightIndex = highlightItem(list, highlightIndex - 1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (visible[highlightIndex]) {
          visible[highlightIndex].click();
        }
      } else if (e.key === "Home") {
        e.preventDefault();
        highlightIndex = highlightItem(list, 0);
      } else if (e.key === "End") {
        e.preventDefault();
        highlightIndex = highlightItem(list, visible.length - 1);
      }
    });
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog)
        dialog.close();
      if (e.target.closest(".command-item"))
        dialog.close();
    });
    dialog.addEventListener("close", () => {
      if (dialog.open)
        return;
      dfDollar7(input).val("");
      filter("");
      dfDollar7(list).find(".command-item[data-highlighted]").data("highlighted", null);
      highlightIndex = -1;
    });
  });
  dfDollar7("[data-command-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const dialog = dfDollar7("#" + CSS.escape(trigger.dataset.commandTrigger)).get(0);
    if (!dialog)
      return;
    trigger.addEventListener("click", () => {
      dialog.showModal();
      const input = dfDollar7(dialog).find(".command-input")[0];
      if (input)
        input.focus();
    });
  });
}
init7();
new MutationObserver(init7).observe(document, { childList: true, subtree: true });

//# debugId=23783F4464B34DD164756E2164756E21
//# sourceMappingURL=overlays.js.map
