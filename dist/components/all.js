// src/shared/state-api.ts
function defussGlobals() {
  globalThis._defussShadcn = globalThis._defussShadcn || {};
  if (typeof globalThis.$ !== "function")
    globalThis.$ = document.querySelector.bind(document);
  return globalThis._defussShadcn;
}
function safeShowPopover(el) {
  const show = () => {
    try {
      el.showPopover();
    } catch {}
  };
  const displayed = () => getComputedStyle(el).display !== "none";
  if (!displayed()) {
    show();
    return;
  }
  const deadline = performance.now() + 500;
  const tick = () => {
    if (!displayed() || performance.now() > deadline)
      show();
    else
      requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// src/components/accordion/accordion.ts
var _defussShadcn = defussGlobals();
var accordionStates = ["default", "all-open", "all-closed"];
function triggerStateChange(accordion, stateName, _config) {
  const items = Array.from(accordion.querySelectorAll(".accordion-item"));
  const gen = (accordion._applyGen ?? 0) + 1;
  accordion._applyGen = gen;
  accordion._applying = true;
  switch (stateName) {
    case "default":
      items.forEach((item, i) => {
        item.open = (accordion._defaultOpen ?? [])[i] ?? item.open;
      });
      break;
    case "all-open":
      items.forEach((item) => {
        item.open = true;
      });
      break;
    case "all-closed":
      items.forEach((item) => {
        item.open = false;
      });
      break;
  }
  setTimeout(() => {
    if (accordion._applyGen === gen)
      accordion._applying = false;
  }, 0);
}
var accordionApi = {
  setState(accordion, stateName, config = {}) {
    if (!accordionStates.includes(stateName)) {
      throw new Error(`accordion: unknown state "${stateName}" (supported: ${accordionStates.join(", ")})`);
    }
    triggerStateChange(accordion, stateName, config);
    accordion.dataset.stateName = stateName;
    accordion._stateConfig = config;
  },
  getState(accordion) {
    return { name: accordion.dataset.stateName || "default", config: accordion._stateConfig ?? {} };
  }
};
_defussShadcn.accordionApi = accordionApi;
_defussShadcn.accordionStates = accordionStates;
function init() {
  document.querySelectorAll('.accordion[data-type="single"]:not([data-init])').forEach((accordion) => {
    accordion.dataset.init = "";
    const items = accordion.querySelectorAll(".accordion-item");
    const collapsible = accordion.hasAttribute("data-collapsible");
    accordion._defaultOpen = Array.from(items).map((item) => item.open);
    accordion.api = {
      setState: (stateName, config) => accordionApi.setState(accordion, stateName, config),
      getState: () => accordionApi.getState(accordion)
    };
    items.forEach((item) => {
      item.addEventListener("beforetoggle", (e) => {
        if (accordion._applying)
          return;
        if (e.newState !== "closed" || collapsible)
          return;
        if (!Array.from(items).some((i) => i !== item && i.open))
          e.preventDefault();
      });
      item.addEventListener("toggle", () => {
        if (accordion._applying)
          return;
        if (item.open) {
          items.forEach((sibling) => {
            if (sibling !== item && sibling.open)
              sibling.open = false;
          });
        } else if (!collapsible) {
          const anyOpen = Array.from(items).some((i) => i.open);
          if (!anyOpen)
            item.open = true;
        }
      });
    });
  });
}
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

// src/components/alert-dialog/alert-dialog.ts
var _defussShadcn2 = defussGlobals();
var alertDialogStates = ["default", "open"];
function triggerStateChange2(dialog, stateName, _config) {
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
var alertDialogApi = {
  setState(dialog, stateName, config = {}) {
    if (!alertDialogStates.includes(stateName)) {
      throw new Error(`alert-dialog: unknown state "${stateName}" (supported: ${alertDialogStates.join(", ")})`);
    }
    triggerStateChange2(dialog, stateName, config);
    dialog.dataset.stateName = stateName;
    dialog._stateConfig = config;
  },
  getState(dialog) {
    return { name: dialog.dataset.stateName || "default", config: dialog._stateConfig ?? {} };
  }
};
_defussShadcn2.alertDialogApi = alertDialogApi;
_defussShadcn2.alertDialogStates = alertDialogStates;
function init2() {
  document.querySelectorAll("[data-alert-dialog-trigger]:not([data-init])").forEach((trigger) => {
    trigger.dataset.init = "";
    const dialog = document.getElementById(trigger.dataset.alertDialogTrigger);
    if (!dialog)
      return;
    trigger.addEventListener("click", () => {
      dialog._trigger = trigger;
      dialog.showModal();
    });
  });
  document.querySelectorAll("dialog.alert-dialog:not([data-init])").forEach((dialog) => {
    dialog.dataset.init = "";
    dialog.api = {
      setState: (stateName, config) => alertDialogApi.setState(dialog, stateName, config),
      getState: () => alertDialogApi.getState(dialog)
    };
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
    });
    dialog.querySelectorAll("[data-alert-dialog-close]").forEach((btn) => {
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
init2();
new MutationObserver(init2).observe(document, { childList: true, subtree: true });

// src/components/avatar/avatar.ts
var _defussShadcn3 = defussGlobals();
var avatarStates = ["default", "error"];
function triggerStateChange3(wrapper, stateName, _config) {
  const img = wrapper.querySelector(".avatar-image");
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
var avatarApi = {
  setState(wrapper, stateName, config = {}) {
    if (!avatarStates.includes(stateName)) {
      throw new Error(`avatar: unknown state "${stateName}" (supported: ${avatarStates.join(", ")})`);
    }
    triggerStateChange3(wrapper, stateName, config);
    wrapper.dataset.stateName = stateName;
    wrapper._stateConfig = config;
  },
  getState(wrapper) {
    const img = wrapper.querySelector(".avatar-image");
    const errored = img ? img.hasAttribute("data-error") : true;
    return {
      name: errored ? "error" : "default",
      config: wrapper._stateConfig ?? {}
    };
  }
};
_defussShadcn3.avatarApi = avatarApi;
_defussShadcn3.avatarStates = avatarStates;
function init3() {
  document.querySelectorAll(".avatar:not([data-init])").forEach((wrapper) => {
    wrapper.dataset.init = "";
    wrapper.api = {
      setState: (stateName, config) => avatarApi.setState(wrapper, stateName, config),
      getState: () => avatarApi.getState(wrapper)
    };
    const img = wrapper.querySelector(".avatar-image");
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
init3();
new MutationObserver(init3).observe(document, { childList: true, subtree: true });

// src/components/calendar/calendar.ts
var _defussShadcn4 = defussGlobals();
var calendarStates = ["default"];
function triggerStateChange4(cal, stateName, config) {
  const state = cal._calState;
  if (!state || stateName !== "default")
    return;
  const now = new Date;
  state.year = config?.year ?? now.getFullYear();
  state.month = config?.month ?? now.getMonth();
  state.selected = config?.day ?? null;
  renderCalendar(cal, state.year, state.month, state.selected);
}
var calendarApi = {
  setState(cal, stateName, config = {}) {
    if (!calendarStates.includes(stateName)) {
      throw new Error(`calendar: unknown state "${stateName}" (supported: ${calendarStates.join(", ")})`);
    }
    triggerStateChange4(cal, stateName, config);
    cal.dataset.stateName = stateName;
    cal._stateConfig = config;
  },
  getState(cal) {
    const state = cal._calState ?? {};
    return {
      name: cal.dataset.stateName || "default",
      config: {
        ...cal._stateConfig,
        year: state.year,
        month: state.month,
        selected: state.selected
      }
    };
  }
};
_defussShadcn4.calendarApi = calendarApi;
_defussShadcn4.calendarStates = calendarStates;
var DAYS = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(new Date(2024, 0, i)));
var MONTHS = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(undefined, { month: "long" }).format(new Date(2024, i, 1)));
var daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
var firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
var isToday = (year, month, day) => {
  const now = new Date;
  return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
};
var renderCalendar = (el, year, month, selectedDay) => {
  const total = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);
  const prevTotal = daysInMonth(year, month - 1);
  const heading = el.querySelector(".calendar-heading");
  if (heading)
    heading.textContent = `${MONTHS[month]} ${year}`;
  const grid = el.querySelector(".calendar-grid");
  if (!grid)
    return;
  let html = "<thead><tr>";
  for (let d = 0;d < 7; d++) {
    html += `<th class="calendar-day-label" scope="col">${DAYS[d]}</th>`;
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
        html += `<td class="calendar-day" data-outside><button tabindex="-1" data-day="${prevDay}" data-outside="prev">${prevDay}</button></td>`;
      } else if (dayNum > total) {
        html += `<td class="calendar-day" data-outside><button tabindex="-1" data-day="${nextDayNum}" data-outside="next">${nextDayNum}</button></td>`;
        nextDayNum++;
      } else {
        let cls = "calendar-day";
        let attrs = "";
        if (isToday(year, month, dayNum))
          attrs += " data-today";
        if (dayNum === selectedDay)
          attrs += " data-selected";
        html += `<td class="${cls}"${attrs}><button data-day="${dayNum}">${dayNum}</button></td>`;
        dayNum++;
      }
    }
    html += "</tr>";
  }
  html += "</tbody>";
  grid.innerHTML = html;
};
function init4() {
  document.querySelectorAll(".calendar:not([data-init])").forEach((cal) => {
    cal.dataset.init = "";
    const now = new Date;
    const state = cal._calState = {
      year: now.getFullYear(),
      month: now.getMonth(),
      selected: null
    };
    cal.api = {
      setState: (stateName, config) => calendarApi.setState(cal, stateName, config),
      getState: () => calendarApi.getState(cal)
    };
    renderCalendar(cal, state.year, state.month, state.selected);
    cal.addEventListener("click", (e) => {
      const nav = e.target.closest(".calendar-nav");
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
      const dayBtn = e.target.closest(".calendar-day button");
      if (!dayBtn)
        return;
      const allBtns = Array.from(cal.querySelectorAll(".calendar-day button"));
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
init4();
new MutationObserver(init4).observe(document, { childList: true, subtree: true });

// src/components/carousel/carousel.ts
var _defussShadcn5 = defussGlobals();
var carouselStates = ["default"];
function triggerStateChange5(carousel, config) {
  const index = Number(config?.index ?? 0);
  if (typeof carousel._goTo === "function")
    carousel._goTo(index);
}
var carouselApi = {
  setState(carousel, stateName, config = {}) {
    if (!carouselStates.includes(stateName)) {
      throw new Error(`carousel: unknown state "${stateName}" (supported: ${carouselStates.join(", ")})`);
    }
    triggerStateChange5(carousel, config);
    carousel.dataset.stateName = stateName;
    carousel._stateConfig = config;
  },
  getState(carousel) {
    return {
      name: carousel.dataset.stateName || "default",
      config: { ...carousel._stateConfig, index: Number(carousel.dataset.currentIndex || 0) }
    };
  }
};
_defussShadcn5.carouselApi = carouselApi;
_defussShadcn5.carouselStates = carouselStates;
function init5() {
  document.querySelectorAll(".carousel:not([data-init])").forEach((carousel) => {
    carousel.dataset.init = "";
    carousel.api = {
      setState: (stateName, config) => carouselApi.setState(carousel, stateName, config),
      getState: () => carouselApi.getState(carousel)
    };
    const viewport = carousel.querySelector(".carousel-viewport");
    const prevBtn = carousel.querySelector(".carousel-prev");
    const nextBtn = carousel.querySelector(".carousel-next");
    const dotsContainer = carousel.querySelector(".carousel-dots");
    const counter = carousel.querySelector(".carousel-counter");
    if (!viewport)
      return;
    const slides = () => Array.from(viewport.querySelectorAll(".carousel-slide"));
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
          prevBtn.disabled = currentIndex <= 0;
        if (nextBtn)
          nextBtn.disabled = currentIndex >= allSlides.length - 1;
      }
      if (dotsContainer) {
        const dots = dotsContainer.querySelectorAll(".carousel-dot");
        dots.forEach((dot, i) => {
          dot.setAttribute("aria-current", i === currentIndex ? "true" : "false");
        });
      }
      if (counter) {
        counter.textContent = `Slide ${currentIndex + 1} of ${allSlides.length}`;
      }
      allSlides.forEach((slide, i) => {
        slide.setAttribute("aria-label", `${i + 1} of ${allSlides.length}`);
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
    if (dotsContainer) {
      const allSlides = slides();
      if (!dotsContainer.children.length && allSlides.length) {
        allSlides.forEach((_, i) => {
          const dot = document.createElement("button");
          dot.className = "carousel-dot";
          dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
          dot.setAttribute("aria-current", i === 0 ? "true" : "false");
          dotsContainer.appendChild(dot);
        });
      }
      dotsContainer.addEventListener("click", (e) => {
        const dot = e.target.closest(".carousel-dot");
        if (!dot)
          return;
        const dots = Array.from(dotsContainer.querySelectorAll(".carousel-dot"));
        const idx = dots.indexOf(dot);
        if (idx !== -1)
          scrollToIndex(idx);
      });
    }
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
init5();
new MutationObserver(init5).observe(document, { childList: true, subtree: true });

// src/components/color-picker/color-picker.ts
var _defussShadcn6 = defussGlobals();
var colorPickerStates = ["default"];
var getInput = (picker) => picker.querySelector('input[type="color"]');
function triggerStateChange6(picker, config) {
  const input = getInput(picker);
  if (!input || config?.value === undefined)
    return;
  input.value = String(config.value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}
var colorPickerApi = {
  setState(picker, stateName, config = {}) {
    if (!colorPickerStates.includes(stateName)) {
      throw new Error(`color-picker: unknown state "${stateName}" (supported: ${colorPickerStates.join(", ")})`);
    }
    triggerStateChange6(picker, config);
    picker.dataset.stateName = stateName;
    picker._stateConfig = config;
  },
  getState(picker) {
    const input = getInput(picker);
    return {
      name: picker.dataset.stateName || "default",
      config: { ...picker._stateConfig, value: input ? input.value : "" }
    };
  }
};
_defussShadcn6.colorPickerApi = colorPickerApi;
_defussShadcn6.colorPickerStates = colorPickerStates;
function init6() {
  document.querySelectorAll(".color-picker:not([data-init])").forEach((picker) => {
    picker.dataset.init = "";
    picker.api = {
      setState: (stateName, config) => colorPickerApi.setState(picker, stateName, config),
      getState: () => colorPickerApi.getState(picker)
    };
    const input = picker.querySelector('input[type="color"]');
    const display = picker.querySelector(".color-picker-value");
    if (!input || !display)
      return;
    display.textContent = input.value;
    input.addEventListener("input", () => {
      display.textContent = input.value;
    });
  });
}
init6();
new MutationObserver(init6).observe(document, { childList: true, subtree: true });

// src/components/combobox/combobox.ts
var _defussShadcn7 = defussGlobals();
var comboboxStates = ["default", "open"];
function triggerStateChange7(popover, stateName, _config) {
  switch (stateName) {
    case "default":
      popover._close?.();
      break;
    case "open":
      popover._open?.();
      break;
  }
}
var comboboxApi = {
  setState(popover, stateName, config = {}) {
    if (!comboboxStates.includes(stateName)) {
      throw new Error(`combobox: unknown state "${stateName}" (supported: ${comboboxStates.join(", ")})`);
    }
    triggerStateChange7(popover, stateName, config);
    popover.dataset.stateName = stateName;
    popover._stateConfig = config;
  },
  getState(popover) {
    const selected = popover.querySelector('[role="option"][aria-selected="true"]');
    return {
      name: popover.matches(":popover-open") ? "open" : "default",
      config: { ...popover._stateConfig, value: selected?.textContent?.trim() ?? "" }
    };
  }
};
_defussShadcn7.comboboxApi = comboboxApi;
_defussShadcn7.comboboxStates = comboboxStates;
function init7() {
  document.querySelectorAll(".combobox:not([data-init])").forEach((wrapper) => {
    wrapper.dataset.init = "";
    const trigger = wrapper.querySelector(".combobox-trigger");
    const valueEl = wrapper.querySelector(".combobox-value");
    const popover = wrapper.querySelector(".combobox-content");
    const searchInput = wrapper.querySelector(".combobox-search-input");
    const listbox = wrapper.querySelector('[role="listbox"]');
    const empty = wrapper.querySelector(".combobox-empty");
    if (!trigger || !popover || !searchInput || !listbox)
      return;
    const allItems = Array.from(listbox.querySelectorAll('[role="option"]'));
    let highlighted = -1;
    const anchorId = `--combobox-${popover.id}`;
    trigger.style.anchorName = anchorId;
    popover.style.positionAnchor = anchorId;
    const placeholder = valueEl?.dataset.placeholder ?? "";
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "combobox-clear";
    clearBtn.setAttribute("aria-label", "Clear selection");
    clearBtn.innerHTML = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
    clearBtn.style.positionAnchor = anchorId;
    trigger.after(clearBtn);
    clearBtn.addEventListener("click", () => {
      allItems.forEach((i) => {
        i.setAttribute("aria-selected", "false");
      });
      if (valueEl) {
        valueEl.textContent = placeholder;
        valueEl.setAttribute("data-placeholder", placeholder);
      }
      trigger.focus();
    });
    const getVisibleItems = () => allItems.filter((item) => !item.hidden && item.getAttribute("aria-disabled") !== "true");
    const open = () => {
      safeShowPopover(popover);
      trigger.setAttribute("aria-expanded", "true");
      searchInput.value = "";
      filter("");
      searchInput.focus();
    };
    const close = () => {
      popover.hidePopover();
      trigger.setAttribute("aria-expanded", "false");
      searchInput.setAttribute("aria-activedescendant", "");
      clearHighlight();
      trigger.focus();
    };
    popover._open = open;
    popover._close = close;
    popover.api = {
      setState: (stateName, config) => comboboxApi.setState(popover, stateName, config),
      getState: () => comboboxApi.getState(popover)
    };
    const isOpen = () => popover.matches(":popover-open");
    const filter = (query) => {
      const q = query.toLowerCase();
      let hasVisible = false;
      allItems.forEach((item) => {
        const match = !q || item.textContent.trim().toLowerCase().includes(q);
        item.hidden = !match;
        if (match)
          hasVisible = true;
      });
      listbox.querySelectorAll(".combobox-group-label").forEach((label) => {
        let next = label.nextElementSibling;
        let groupHasVisible = false;
        while (next && !next.classList.contains("combobox-group-label") && !next.classList.contains("combobox-separator")) {
          if (next.getAttribute("role") === "option" && !next.hidden)
            groupHasVisible = true;
          next = next.nextElementSibling;
        }
        label.hidden = !groupHasVisible;
      });
      listbox.querySelectorAll(".combobox-separator").forEach((sep) => {
        const prev = sep.previousElementSibling;
        const next = sep.nextElementSibling;
        sep.hidden = prev && prev.hidden || next && next.hidden;
      });
      if (empty)
        empty.hidden = hasVisible;
    };
    const clearHighlight = () => {
      allItems.forEach((item) => {
        delete item.dataset.highlighted;
      });
      highlighted = -1;
    };
    const doHighlight = (index) => {
      const items = getVisibleItems();
      clearHighlight();
      if (index < 0 || index >= items.length)
        return;
      highlighted = index;
      items[index].dataset.highlighted = "";
      items[index].scrollIntoView({ block: "nearest" });
      searchInput.setAttribute("aria-activedescendant", items[index].id);
    };
    const selectItem = (item) => {
      if (item.getAttribute("aria-disabled") === "true")
        return;
      allItems.forEach((i) => {
        i.setAttribute("aria-selected", "false");
      });
      item.setAttribute("aria-selected", "true");
      if (valueEl) {
        valueEl.textContent = item.textContent.trim();
        valueEl.removeAttribute("data-placeholder");
      }
      close();
    };
    trigger.addEventListener("click", () => {
      if (isOpen()) {
        close();
      } else {
        open();
      }
    });
    searchInput.addEventListener("input", () => {
      filter(searchInput.value);
      doHighlight(0);
    });
    searchInput.addEventListener("keydown", (e) => {
      const items = getVisibleItems();
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          doHighlight(Math.min(highlighted + 1, items.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          doHighlight(Math.max(highlighted - 1, 0));
          break;
        case "Home":
          e.preventDefault();
          doHighlight(0);
          break;
        case "End":
          e.preventDefault();
          doHighlight(items.length - 1);
          break;
        case "Enter":
          e.preventDefault();
          if (highlighted >= 0 && items[highlighted])
            selectItem(items[highlighted]);
          break;
        case "Escape":
          e.preventDefault();
          close();
          break;
        case "Tab":
          close();
          break;
      }
    });
    listbox.addEventListener("click", (e) => {
      const item = e.target.closest('[role="option"]');
      if (item && !item.hidden && item.getAttribute("aria-disabled") !== "true")
        selectItem(item);
    });
    listbox.addEventListener("mousemove", (e) => {
      const item = e.target.closest('[role="option"]');
      if (item && !item.hidden) {
        const items = getVisibleItems();
        doHighlight(items.indexOf(item));
      }
    });
    popover.addEventListener("toggle", (e) => {
      if (e.newState === "closed") {
        trigger.setAttribute("aria-expanded", "false");
        clearHighlight();
      }
    });
  });
}
init7();
new MutationObserver(init7).observe(document, { childList: true, subtree: true });

// src/components/command/command.ts
var _defussShadcn8 = defussGlobals();
var commandStates = ["default", "open"];
function triggerStateChange8(dialog, stateName, _config) {
  switch (stateName) {
    case "default":
      if (dialog.open)
        dialog.close();
      break;
    case "open":
      if (!dialog.open)
        dialog.showModal();
      {
        const input = dialog.querySelector(".command-input");
        if (input)
          input.focus();
      }
      break;
  }
}
var commandApi = {
  setState(dialog, stateName, config = {}) {
    if (!commandStates.includes(stateName)) {
      throw new Error(`command: unknown state "${stateName}" (supported: ${commandStates.join(", ")})`);
    }
    triggerStateChange8(dialog, stateName, config);
    dialog.dataset.stateName = stateName;
    dialog._stateConfig = config;
  },
  getState(dialog) {
    return { name: dialog.dataset.stateName || "default", config: dialog._stateConfig ?? {} };
  }
};
_defussShadcn8.commandApi = commandApi;
_defussShadcn8.commandStates = commandStates;
var commandKeydownAdded = false;
if (!commandKeydownAdded) {
  commandKeydownAdded = true;
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      const dialog = document.querySelector("dialog.command");
      if (!dialog)
        return;
      e.preventDefault();
      if (dialog.open) {
        dialog.close();
      } else {
        dialog.showModal();
        const input = dialog.querySelector(".command-input");
        if (input)
          input.focus();
      }
    }
  });
}
function getVisibleItems(list) {
  return Array.from(list.querySelectorAll('.command-item:not([hidden]):not([aria-disabled="true"])'));
}
function highlightItem(list, index) {
  const visible = getVisibleItems(list);
  list.querySelectorAll(".command-item[data-highlighted]").forEach((el) => delete el.dataset.highlighted);
  if (visible.length === 0)
    return -1;
  const clamped = (index % visible.length + visible.length) % visible.length;
  visible[clamped].dataset.highlighted = "";
  visible[clamped].scrollIntoView({ block: "nearest" });
  return clamped;
}
function init8() {
  document.querySelectorAll("dialog.command:not([data-init])").forEach((dialog) => {
    dialog.dataset.init = "";
    dialog.api = {
      setState: (stateName, config) => commandApi.setState(dialog, stateName, config),
      getState: () => commandApi.getState(dialog)
    };
    const input = dialog.querySelector(".command-input");
    const list = dialog.querySelector(".command-list");
    const empty = dialog.querySelector(".command-empty");
    if (!input || !list)
      return;
    let highlightIndex = -1;
    const filter = (q) => {
      const query = q.toLowerCase();
      let hasVisible = false;
      list.querySelectorAll(".command-item").forEach((item) => {
        const match = !query || item.textContent.toLowerCase().includes(query);
        item.hidden = !match;
        if (match)
          hasVisible = true;
      });
      list.querySelectorAll(".command-group").forEach((g) => {
        g.hidden = g.querySelectorAll(".command-item:not([hidden])").length === 0;
      });
      list.querySelectorAll(".command-separator").forEach((s) => {
        s.hidden = !!query;
      });
      if (empty)
        empty.hidden = hasVisible;
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
      dialog.dataset.stateName = "default";
      input.value = "";
      filter("");
      list.querySelectorAll(".command-item[data-highlighted]").forEach((el) => delete el.dataset.highlighted);
      highlightIndex = -1;
    });
  });
  document.querySelectorAll("[data-command-trigger]:not([data-init])").forEach((trigger) => {
    trigger.dataset.init = "";
    const dialog = document.getElementById(trigger.dataset.commandTrigger);
    if (!dialog)
      return;
    trigger.addEventListener("click", () => {
      dialog.showModal();
      const input = dialog.querySelector(".command-input");
      if (input)
        input.focus();
    });
  });
}
init8();
new MutationObserver(init8).observe(document, { childList: true, subtree: true });

// src/components/context-menu/context-menu.ts
var _defussShadcn9 = defussGlobals();
var contextMenuStates = ["default", "open"];
function triggerStateChange9(menu, stateName, config) {
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
      safeShowPopover(menu);
      break;
    }
  }
}
var contextMenuApi = {
  setState(menu, stateName, config = {}) {
    if (!contextMenuStates.includes(stateName)) {
      throw new Error(`context-menu: unknown state "${stateName}" (supported: ${contextMenuStates.join(", ")})`);
    }
    triggerStateChange9(menu, stateName, config);
    menu.dataset.stateName = stateName;
    menu._stateConfig = config;
  },
  getState(menu) {
    return {
      name: menu.matches(":popover-open") ? "open" : "default",
      config: menu._stateConfig ?? {}
    };
  }
};
_defussShadcn9.contextMenuApi = contextMenuApi;
_defussShadcn9.contextMenuStates = contextMenuStates;
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
  safeShowPopover(menu);
  menu.dataset.stateName = "open";
}
function init9() {
  document.querySelectorAll("[data-context-menu]:not([data-init])").forEach((trigger) => {
    trigger.dataset.init = "";
    const menu = document.getElementById(trigger.dataset.contextMenu);
    if (!menu)
      return;
    menu.api = {
      setState: (stateName, config) => contextMenuApi.setState(menu, stateName, config),
      getState: () => contextMenuApi.getState(menu)
    };
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
init9();
new MutationObserver(init9).observe(document, { childList: true, subtree: true });

// src/components/dialog/dialog.ts
var _defussShadcn10 = defussGlobals();
var dialogStates = ["default", "open"];
function triggerStateChange10(dialog, stateName, _config) {
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
var dialogApi = {
  setState(dialog, stateName, config = {}) {
    if (!dialogStates.includes(stateName)) {
      throw new Error(`dialog: unknown state "${stateName}" (supported: ${dialogStates.join(", ")})`);
    }
    triggerStateChange10(dialog, stateName, config);
    dialog.dataset.stateName = stateName;
    dialog._stateConfig = config;
  },
  getState(dialog) {
    return { name: dialog.dataset.stateName || "default", config: dialog._stateConfig ?? {} };
  }
};
_defussShadcn10.dialogApi = dialogApi;
_defussShadcn10.dialogStates = dialogStates;
function init10() {
  document.querySelectorAll("[data-dialog-trigger]:not([data-init])").forEach((trigger) => {
    trigger.dataset.init = "";
    const dialog = document.getElementById(trigger.dataset.dialogTrigger);
    if (!dialog)
      return;
    trigger.addEventListener("click", () => {
      dialog._trigger = trigger;
      dialog.showModal();
    });
  });
  document.querySelectorAll("dialog:not(.alert-dialog):not(.sheet):not(.command):not([data-init])").forEach((dialog) => {
    dialog.dataset.init = "";
    dialog.api = {
      setState: (stateName, config) => dialogApi.setState(dialog, stateName, config),
      getState: () => dialogApi.getState(dialog)
    };
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog)
        dialog.close();
    });
    dialog.querySelectorAll("[data-dialog-close]").forEach((btn) => {
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
init10();
new MutationObserver(init10).observe(document, { childList: true, subtree: true });

// src/components/dropdown/dropdown.ts
var _defussShadcn11 = defussGlobals();
var dropdownStates = ["default", "open"];
function triggerStateChange11(menu, stateName, _config) {
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
var dropdownApi = {
  setState(menu, stateName, config = {}) {
    if (!dropdownStates.includes(stateName)) {
      throw new Error(`dropdown: unknown state "${stateName}" (supported: ${dropdownStates.join(", ")})`);
    }
    triggerStateChange11(menu, stateName, config);
    menu.dataset.stateName = stateName;
    menu._stateConfig = config;
  },
  getState(menu) {
    return { name: menu.dataset.stateName || "default", config: menu._stateConfig ?? {} };
  }
};
_defussShadcn11.dropdownApi = dropdownApi;
_defussShadcn11.dropdownStates = dropdownStates;
function init11() {
  document.querySelectorAll("[data-dropdown-trigger]:not([data-init])").forEach((trigger) => {
    trigger.dataset.init = "";
    const menu = document.getElementById(trigger.dataset.dropdownTrigger);
    if (!menu)
      return;
    const anchorId = `--dropdown-${menu.id}`;
    trigger.style.anchorName = anchorId;
    menu.style.positionAnchor = anchorId;
    const getItems = () => {
      return Array.from(menu.querySelectorAll('[role="menuitem"]:not(:disabled), [role="menuitemcheckbox"]:not(:disabled), [role="menuitemradio"]:not(:disabled)'));
    };
    const highlight = (item) => {
      getItems().forEach((i) => {
        i.removeAttribute("data-highlighted");
      });
      if (item) {
        item.setAttribute("data-highlighted", "");
        item.focus();
      }
    };
    if (!trigger.hasAttribute("popovertarget"))
      trigger.setAttribute("popovertarget", menu.id);
    menu.addEventListener("toggle", (e) => {
      const open = e.newState === "open";
      trigger.setAttribute("aria-expanded", open);
      if (open) {
        const first = getItems()[0];
        if (first)
          highlight(first);
      } else {
        getItems().forEach((i) => {
          i.removeAttribute("data-highlighted");
        });
        trigger.focus();
      }
    });
    menu.addEventListener("mousemove", (e) => {
      const item = e.target.closest('[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]');
      if (item && !item.disabled)
        highlight(item);
    });
    menu.addEventListener("mouseleave", () => {
      getItems().forEach((i) => {
        i.removeAttribute("data-highlighted");
      });
    });
    menu.addEventListener("keydown", (e) => {
      const items = getItems();
      const current = items.indexOf(document.activeElement);
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          highlight(items[(current + 1) % items.length]);
          break;
        case "ArrowUp":
          e.preventDefault();
          highlight(items[(current - 1 + items.length) % items.length]);
          break;
        case "Home":
          e.preventDefault();
          highlight(items[0]);
          break;
        case "End":
          e.preventDefault();
          highlight(items[items.length - 1]);
          break;
        case "Escape":
          menu.hidePopover();
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (document.activeElement) {
            const role = document.activeElement.getAttribute("role");
            if (role === "menuitemcheckbox") {
              const checked = document.activeElement.getAttribute("aria-checked") === "true";
              document.activeElement.setAttribute("aria-checked", !checked);
            } else if (role === "menuitemradio") {
              const group = document.activeElement.closest('[role="group"]');
              if (group)
                group.querySelectorAll('[role="menuitemradio"]').forEach((r) => {
                  r.setAttribute("aria-checked", "false");
                });
              document.activeElement.setAttribute("aria-checked", "true");
            } else {
              document.activeElement.click();
              menu.hidePopover();
            }
          }
          break;
        default:
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            const match = items.find((item) => item.textContent.trim().toLowerCase().startsWith(e.key.toLowerCase()));
            if (match)
              highlight(match);
          }
      }
    });
  });
  document.querySelectorAll(".dropdown-content[popover]:not([data-init])").forEach((menu) => {
    menu.dataset.init = "";
    menu.api = {
      setState: (stateName, config) => dropdownApi.setState(menu, stateName, config),
      getState: () => dropdownApi.getState(menu)
    };
  });
}
init11();
new MutationObserver(init11).observe(document, { childList: true, subtree: true });

// src/components/image/image.ts
var _defussShadcn12 = defussGlobals();
var imageStates = ["default", "error"];
function triggerStateChange12(figure, stateName, _config) {
  const img = figure.querySelector("img");
  if (!img)
    return;
  switch (stateName) {
    case "default":
      delete img.dataset.error;
      break;
    case "error":
      img.dataset.error = "";
      break;
  }
}
var imageApi = {
  setState(figure, stateName, config = {}) {
    if (!imageStates.includes(stateName)) {
      throw new Error(`image: unknown state "${stateName}" (supported: ${imageStates.join(", ")})`);
    }
    triggerStateChange12(figure, stateName, config);
    figure.dataset.stateName = stateName;
    figure._stateConfig = config;
  },
  getState(figure) {
    const img = figure.querySelector("img");
    return {
      name: img && img.dataset.error !== undefined ? "error" : "default",
      config: figure._stateConfig ?? {}
    };
  }
};
_defussShadcn12.imageApi = imageApi;
_defussShadcn12.imageStates = imageStates;
function init12() {
  document.querySelectorAll(".image:not([data-init])").forEach((figure) => {
    figure.dataset.init = "";
    figure.api = {
      setState: (stateName, config) => imageApi.setState(figure, stateName, config),
      getState: () => imageApi.getState(figure)
    };
    const img = figure.querySelector("img");
    if (!img)
      return;
    if (img.complete && img.naturalWidth === 0) {
      img.dataset.error = "";
    }
    img.addEventListener("error", () => {
      img.dataset.error = "";
      figure.dataset.stateName = "error";
    });
    img.addEventListener("load", () => {
      delete img.dataset.error;
      figure.dataset.stateName = "default";
    });
  });
}
init12();
new MutationObserver(init12).observe(document, { childList: true, subtree: true });
var lightbox = null;
var lightboxImg = null;
var zoom = 1;
var rotation = 0;
function getLightbox() {
  if (lightbox)
    return lightbox;
  lightbox = document.createElement("dialog");
  lightbox.className = "image-lightbox";
  lightbox.setAttribute("aria-label", "Image preview");
  lightbox.innerHTML = `
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
    </div>`;
  lightboxImg = lightbox.querySelector(".image-lightbox-content > img");
  lightbox.querySelector(".image-lightbox-toolbar").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn)
      return;
    const action = btn.dataset.action;
    if (action === "zoom-in")
      zoom = Math.min(zoom + 0.25, 5);
    else if (action === "zoom-out")
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
  document.body.appendChild(lightbox);
  return lightbox;
}
function applyTransform() {
  if (lightboxImg) {
    lightboxImg.style.transform = `scale(${zoom}) rotate(${rotation}deg)`;
  }
}
function openLightbox(src, alt) {
  const lb = getLightbox();
  zoom = 1;
  rotation = 0;
  lightboxImg.src = src;
  lightboxImg.alt = alt || "";
  lightboxImg.style.transform = "";
  lb.showModal();
}
if (!document.__imagePreviewInit) {
  document.__imagePreviewInit = true;
  document.addEventListener("click", (e) => {
    const figure = e.target.closest(".image[data-preview]");
    if (!figure)
      return;
    const img = figure.querySelector("img");
    if (!img || img.dataset.error !== undefined)
      return;
    openLightbox(img.src, img.alt);
  });
}

// src/components/navigation-menu/navigation-menu.ts
var _defussShadcn13 = defussGlobals();
var navigationMenuStates = ["default", "open"];
function triggerStateChange13(content, stateName, _config) {
  switch (stateName) {
    case "default":
      try {
        content.hidePopover();
      } catch {}
      break;
    case "open":
      safeShowPopover(content);
      break;
  }
}
var navigationMenuApi = {
  setState(content, stateName, config = {}) {
    if (!navigationMenuStates.includes(stateName)) {
      throw new Error(`navigation-menu: unknown state "${stateName}" (supported: ${navigationMenuStates.join(", ")})`);
    }
    triggerStateChange13(content, stateName, config);
    content.dataset.stateName = stateName;
    content._stateConfig = config;
  },
  getState(content) {
    return { name: content.dataset.stateName || "default", config: content._stateConfig ?? {} };
  }
};
_defussShadcn13.navigationMenuApi = navigationMenuApi;
_defussShadcn13.navigationMenuStates = navigationMenuStates;
function init13() {
  document.querySelectorAll(".nav-menu-trigger[popovertarget]:not([data-init])").forEach((trigger) => {
    trigger.dataset.init = "";
    const content = document.getElementById(trigger.getAttribute("popovertarget"));
    if (!content)
      return;
    const anchorId = `--nav-menu-${content.id}`;
    trigger.style.anchorName = anchorId;
    content.style.positionAnchor = anchorId;
  });
  document.querySelectorAll(".nav-menu-content[popover]:not([data-init])").forEach((content) => {
    content.dataset.init = "";
    content.api = {
      setState: (stateName, config) => navigationMenuApi.setState(content, stateName, config),
      getState: () => navigationMenuApi.getState(content)
    };
  });
}
init13();
new MutationObserver(init13).observe(document, { childList: true, subtree: true });

// src/components/number-input/number-input.ts
var _defussShadcn14 = defussGlobals();
var numberInputStates = ["default"];
var getInput2 = (wrapper) => wrapper.querySelector('input[type="number"]');
function triggerStateChange14(wrapper, config) {
  const input = getInput2(wrapper);
  if (!input || config?.value === undefined)
    return;
  input.value = String(config.value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
var numberInputApi = {
  setState(wrapper, stateName, config = {}) {
    if (!numberInputStates.includes(stateName)) {
      throw new Error(`number-input: unknown state "${stateName}" (supported: ${numberInputStates.join(", ")})`);
    }
    triggerStateChange14(wrapper, config);
    wrapper.dataset.stateName = stateName;
    wrapper._stateConfig = config;
  },
  getState(wrapper) {
    const input = getInput2(wrapper);
    return {
      name: wrapper.dataset.stateName || "default",
      config: { ...wrapper._stateConfig, value: input ? input.value : "" }
    };
  }
};
_defussShadcn14.numberInputApi = numberInputApi;
_defussShadcn14.numberInputStates = numberInputStates;
function init14() {
  document.querySelectorAll(".number-input:not([data-init])").forEach((wrapper) => {
    wrapper.dataset.init = "";
    wrapper.api = {
      setState: (stateName, config) => numberInputApi.setState(wrapper, stateName, config),
      getState: () => numberInputApi.getState(wrapper)
    };
    const input = wrapper.querySelector('input[type="number"]');
    const decBtn = wrapper.querySelector('[data-action="decrement"]');
    const incBtn = wrapper.querySelector('[data-action="increment"]');
    if (!input)
      return;
    const update = (direction) => {
      try {
        if (direction > 0)
          input.stepUp();
        else
          input.stepDown();
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      } catch {}
    };
    if (decBtn)
      decBtn.addEventListener("click", () => {
        update(-1);
      });
    if (incBtn)
      incBtn.addEventListener("click", () => {
        update(1);
      });
  });
}
init14();
new MutationObserver(init14).observe(document, { childList: true, subtree: true });

// src/components/popover/popover.ts
var _defussShadcn15 = defussGlobals();
var popoverStates = ["default", "open"];
function triggerStateChange15(popover, stateName, _config) {
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
var popoverApi = {
  setState(popover, stateName, config = {}) {
    if (!popoverStates.includes(stateName)) {
      throw new Error(`popover: unknown state "${stateName}" (supported: ${popoverStates.join(", ")})`);
    }
    triggerStateChange15(popover, stateName, config);
    popover.dataset.stateName = stateName;
    popover._stateConfig = config;
  },
  getState(popover) {
    return { name: popover.dataset.stateName || "default", config: popover._stateConfig ?? {} };
  }
};
_defussShadcn15.popoverApi = popoverApi;
_defussShadcn15.popoverStates = popoverStates;
function init15() {
  document.querySelectorAll("[popovertarget]:not([data-init])").forEach((trigger) => {
    const id = trigger.getAttribute("popovertarget");
    const popover = document.getElementById(id);
    if (!popover || !popover.classList.contains("popover"))
      return;
    trigger.dataset.init = "";
    const anchorId = `--popover-${id}`;
    trigger.style.anchorName = anchorId;
    popover.style.positionAnchor = anchorId;
  });
  document.querySelectorAll(".popover[popover]:not([data-init])").forEach((popover) => {
    popover.dataset.init = "";
    popover.api = {
      setState: (stateName, config) => popoverApi.setState(popover, stateName, config),
      getState: () => popoverApi.getState(popover)
    };
  });
}
init15();
new MutationObserver(init15).observe(document, { childList: true, subtree: true });

// src/components/product-showcase/product-showcase.ts
var _defussShadcn16 = defussGlobals();
var productShowcaseStates = ["default", "playing"];
function triggerStateChange16(showcase, stateName, _config) {
  const video = showcase.querySelector("video");
  switch (stateName) {
    case "default":
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
      showcase.dataset.state = "default";
      break;
    case "playing":
      showcase.dataset.state = "playing";
      if (video) {
        video.muted = true;
        video.play().catch(() => {});
      }
      break;
  }
}
var productShowcaseApi = {
  setState(showcase, stateName, config = {}) {
    if (!productShowcaseStates.includes(stateName)) {
      throw new Error(`product-showcase: unknown state "${stateName}" (supported: ${productShowcaseStates.join(", ")})`);
    }
    triggerStateChange16(showcase, stateName, config);
    showcase.dataset.stateName = stateName;
    showcase._stateConfig = config;
  },
  getState(showcase) {
    const playing = showcase.dataset.state === "playing";
    return {
      name: showcase.dataset.stateName || (playing ? "playing" : "default"),
      config: showcase._stateConfig ?? {}
    };
  }
};
_defussShadcn16.productShowcaseApi = productShowcaseApi;
_defussShadcn16.productShowcaseStates = productShowcaseStates;
function init16() {
  document.querySelectorAll(".mk-showcase:not([data-init])").forEach((showcase) => {
    showcase.dataset.init = "";
    showcase.dataset.state = "default";
    showcase.api = {
      setState: (stateName, config) => productShowcaseApi.setState(showcase, stateName, config),
      getState: () => productShowcaseApi.getState(showcase)
    };
    showcase.querySelector(".mk-showcase-play")?.addEventListener("click", () => {
      productShowcaseApi.setState(showcase, "playing");
    });
    showcase.querySelector("video")?.addEventListener("pause", () => {
      if (showcase.dataset.state === "playing")
        productShowcaseApi.setState(showcase, "default");
    });
  });
}
init16();
new MutationObserver(init16).observe(document, { childList: true, subtree: true });

// src/components/sheet/sheet.ts
var _defussShadcn17 = defussGlobals();
var sheetStates = ["default", "open"];
function triggerStateChange17(sheet, stateName, _config) {
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
var sheetApi = {
  setState(sheet, stateName, config = {}) {
    if (!sheetStates.includes(stateName)) {
      throw new Error(`sheet: unknown state "${stateName}" (supported: ${sheetStates.join(", ")})`);
    }
    triggerStateChange17(sheet, stateName, config);
    sheet.dataset.stateName = stateName;
    sheet._stateConfig = config;
  },
  getState(sheet) {
    return { name: sheet.dataset.stateName || "default", config: sheet._stateConfig ?? {} };
  }
};
_defussShadcn17.sheetApi = sheetApi;
_defussShadcn17.sheetStates = sheetStates;
function init17() {
  document.querySelectorAll("[data-sheet-trigger]:not([data-init])").forEach((trigger) => {
    trigger.dataset.init = "";
    const sheet = document.getElementById(trigger.dataset.sheetTrigger);
    if (!sheet)
      return;
    trigger.addEventListener("click", () => {
      sheet._trigger = trigger;
      sheet.showModal();
    });
  });
  document.querySelectorAll("dialog.sheet:not([data-init])").forEach((sheet) => {
    sheet.dataset.init = "";
    sheet.api = {
      setState: (stateName, config) => sheetApi.setState(sheet, stateName, config),
      getState: () => sheetApi.getState(sheet)
    };
    sheet.addEventListener("click", (e) => {
      if (e.target === sheet)
        sheet.close();
    });
    sheet.querySelectorAll("[data-sheet-close]").forEach((btn) => {
      btn.addEventListener("click", () => {
        sheet.close();
      });
    });
    sheet.addEventListener("close", () => {
      if (sheet.open)
        return;
      sheet.dataset.stateName = "default";
      if (sheet._trigger)
        sheet._trigger.focus();
    });
  });
}
init17();
new MutationObserver(init17).observe(document, { childList: true, subtree: true });

// src/components/sidebar/sidebar.ts
var _defussShadcn18 = defussGlobals();
var sidebarStates = ["default", "collapsed"];
function triggerStateChange18(sidebar, stateName, _config) {
  switch (stateName) {
    case "default":
      sidebar.dataset.state = sidebar._defaultState ?? "expanded";
      break;
    case "collapsed":
      sidebar.dataset.state = "collapsed";
      break;
  }
}
var sidebarApi = {
  setState(sidebar, stateName, config = {}) {
    if (!sidebarStates.includes(stateName)) {
      throw new Error(`sidebar: unknown state "${stateName}" (supported: ${sidebarStates.join(", ")})`);
    }
    triggerStateChange18(sidebar, stateName, config);
    sidebar.dataset.stateName = stateName;
    sidebar._stateConfig = config;
  },
  getState(sidebar) {
    return {
      name: sidebar.dataset.state === "collapsed" ? "collapsed" : "default",
      config: sidebar._stateConfig ?? {}
    };
  }
};
_defussShadcn18.sidebarApi = sidebarApi;
_defussShadcn18.sidebarStates = sidebarStates;
function init18() {
  document.querySelectorAll(".app-sidebar:not([data-init])").forEach((sidebar) => {
    sidebar.dataset.init = "";
    sidebar._defaultState = sidebar.dataset.state || "expanded";
    sidebar.api = {
      setState: (stateName, config) => sidebarApi.setState(sidebar, stateName, config),
      getState: () => sidebarApi.getState(sidebar)
    };
    const triggerId = sidebar.id ? `[data-sidebar-trigger="${sidebar.id}"]` : ".sidebar-trigger";
    document.querySelectorAll(triggerId).forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const state = sidebar.dataset.state === "collapsed" ? "expanded" : "collapsed";
        sidebar.dataset.state = state;
        sidebar.dataset.stateName = state === "collapsed" ? "collapsed" : "default";
      });
    });
  });
  document.querySelectorAll("[data-sidebar-mobile]:not([data-init])").forEach((trigger) => {
    trigger.dataset.init = "";
    const dialog = document.getElementById(trigger.dataset.sidebarMobile);
    if (!dialog)
      return;
    trigger.addEventListener("click", () => {
      dialog.showModal();
    });
    dialog.querySelectorAll(".sidebar-mobile-close").forEach((btn) => {
      btn.addEventListener("click", () => {
        dialog.close();
      });
    });
  });
}
init18();
new MutationObserver(init18).observe(document, { childList: true, subtree: true });
if (!document.__sidebarKbInit) {
  document.__sidebarKbInit = true;
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "b") {
      e.preventDefault();
      const sidebar = document.querySelector(".app-sidebar");
      if (sidebar) {
        sidebar.dataset.state = sidebar.dataset.state === "collapsed" ? "expanded" : "collapsed";
      }
    }
  });
}

// src/components/slider/slider.ts
var _defussShadcn19 = defussGlobals();
var sliderStates = ["default", "disabled"];
function updateSliderValue(el) {
  const min = parseFloat(el.min || 0);
  const max = parseFloat(el.max || 100);
  const value = parseFloat(el.value);
  const percent = max === min ? 0 : (value - min) / (max - min) * 100;
  el.style.setProperty("--slider-value", `${percent}%`);
}
function triggerStateChange19(el, stateName, config) {
  switch (stateName) {
    case "default":
      el.disabled = el._defaultDisabled ?? false;
      if (config?.value !== undefined)
        el.value = String(config.value);
      updateSliderValue(el);
      break;
    case "disabled":
      el.disabled = true;
      break;
  }
}
var sliderApi = {
  setState(el, stateName, config = {}) {
    if (!sliderStates.includes(stateName)) {
      throw new Error(`slider: unknown state "${stateName}" (supported: ${sliderStates.join(", ")})`);
    }
    triggerStateChange19(el, stateName, config);
    el.dataset.stateName = stateName;
    el._stateConfig = config;
  },
  getState(el) {
    return {
      name: el.disabled ? "disabled" : "default",
      config: { ...el._stateConfig, value: el.value }
    };
  }
};
_defussShadcn19.sliderApi = sliderApi;
_defussShadcn19.sliderStates = sliderStates;
function init19() {
  document.querySelectorAll(".slider:not([data-init])").forEach((el) => {
    el.dataset.init = "";
    el._defaultDisabled = el.disabled;
    el.api = {
      setState: (stateName, config) => sliderApi.setState(el, stateName, config),
      getState: () => sliderApi.getState(el)
    };
    updateSliderValue(el);
    el.addEventListener("input", () => updateSliderValue(el));
  });
}
init19();
new MutationObserver(init19).observe(document, { childList: true, subtree: true });

// src/components/sortable/sortable.ts
var _defussShadcn20 = defussGlobals();
var sortableStates = ["default"];
var sortableLabels = (list) => Array.from(list.querySelectorAll(".sortable-item")).map((item) => item.querySelector("span:not(.sortable-handle)")?.textContent?.trim() ?? "");
function triggerStateChange20(list, stateName, config) {
  if (stateName !== "default")
    return;
  for (const item of list._defaultOrder ?? [])
    list.appendChild(item);
  if (config?.index !== undefined) {
    const item = list.querySelectorAll(".sortable-item")[Number(config.index)];
    list._setActive?.(item);
  }
}
var sortableApi = {
  setState(list, stateName, config = {}) {
    if (!sortableStates.includes(stateName)) {
      throw new Error(`sortable: unknown state "${stateName}" (supported: ${sortableStates.join(", ")})`);
    }
    triggerStateChange20(list, stateName, config);
    list.dataset.stateName = stateName;
    list._stateConfig = config;
  },
  getState(list) {
    const items = Array.from(list.querySelectorAll(".sortable-item"));
    const active = list.querySelector(".sortable-item[data-active]");
    return {
      name: list.dataset.stateName || "default",
      config: {
        ...list._stateConfig,
        order: sortableLabels(list),
        activeIndex: active ? items.indexOf(active) : -1
      }
    };
  }
};
_defussShadcn20.sortableApi = sortableApi;
_defussShadcn20.sortableStates = sortableStates;
function init20() {
  document.querySelectorAll(".sortable:not([data-init])").forEach((list) => {
    list.dataset.init = "";
    list.api = {
      setState: (stateName, config) => sortableApi.setState(list, stateName, config),
      getState: () => sortableApi.getState(list)
    };
    const isHorizontal = list.dataset.orientation === "horizontal";
    const NEXT_KEY = isHorizontal ? "ArrowRight" : "ArrowDown";
    const PREV_KEY = isHorizontal ? "ArrowLeft" : "ArrowUp";
    let liveRegion = list.nextElementSibling;
    if (!liveRegion || !liveRegion.classList.contains("sortable-live")) {
      liveRegion = document.createElement("span");
      liveRegion.className = "sortable-live";
      liveRegion.setAttribute("aria-live", "assertive");
      liveRegion.setAttribute("role", "status");
      if (list.parentElement) {
        list.parentElement.insertBefore(liveRegion, list.nextSibling);
      } else {
        list.after(liveRegion);
      }
    }
    function announce(msg) {
      liveRegion.textContent = "";
      requestAnimationFrame(() => {
        liveRegion.textContent = msg;
      });
    }
    function getItems() {
      return Array.from(list.querySelectorAll('.sortable-item:not([aria-disabled="true"])'));
    }
    function getAllItems() {
      return Array.from(list.querySelectorAll(".sortable-item"));
    }
    function getActiveItem() {
      return list.querySelector(".sortable-item[data-active]");
    }
    function setActive(item) {
      getAllItems().forEach((el) => {
        el.removeAttribute("data-active");
        el.setAttribute("tabindex", "-1");
      });
      if (item) {
        item.setAttribute("data-active", "");
        item.setAttribute("tabindex", "0");
        item.focus();
      }
    }
    list._setActive = setActive;
    list._defaultOrder = getAllItems();
    function getItemLabel(item) {
      const handle = item.querySelector(".sortable-handle");
      const clone = item.cloneNode(true);
      if (handle) {
        const handleClone = clone.querySelector(".sortable-handle");
        if (handleClone)
          handleClone.remove();
      }
      return clone.textContent.trim();
    }
    const allItems = getAllItems();
    allItems.forEach((item, i) => {
      item.setAttribute("tabindex", i === 0 ? "0" : "-1");
    });
    let dragged = null;
    list.querySelectorAll(".sortable-item").forEach((item) => {
      if (item.getAttribute("aria-disabled") === "true")
        return;
      item.addEventListener("dragstart", (e) => {
        dragged = item;
        item.setAttribute("data-dragging", "");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", "");
      });
      item.addEventListener("dragend", () => {
        item.removeAttribute("data-dragging");
        list.querySelectorAll("[data-over]").forEach((el) => el.removeAttribute("data-over"));
        dragged = null;
      });
      item.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!dragged || dragged === item)
          return;
        const rect = item.getBoundingClientRect();
        const midpoint = isHorizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
        const pos = isHorizontal ? e.clientX : e.clientY;
        list.querySelectorAll("[data-over]").forEach((el) => {
          if (el !== item)
            el.removeAttribute("data-over");
        });
        item.setAttribute("data-over", pos < midpoint ? "before" : "after");
      });
      item.addEventListener("dragleave", () => {
        item.removeAttribute("data-over");
      });
      item.addEventListener("drop", (e) => {
        e.preventDefault();
        const position = item.getAttribute("data-over");
        item.removeAttribute("data-over");
        if (!dragged || dragged === item)
          return;
        if (position === "before") {
          list.insertBefore(dragged, item);
        } else {
          list.insertBefore(dragged, item.nextSibling);
        }
        const items = getItems();
        const newIndex = items.indexOf(dragged);
        announce(`${getItemLabel(dragged)}, moved to position ${newIndex + 1} of ${items.length}`);
        setActive(dragged);
        list.dispatchEvent(new CustomEvent("sortable-change", {
          bubbles: true,
          detail: { item: dragged, index: newIndex }
        }));
      });
    });
    list.addEventListener("keydown", (e) => {
      const active = getActiveItem() || list.querySelector('.sortable-item[tabindex="0"]');
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
      } else if (e.key === NEXT_KEY && e.altKey) {
        e.preventDefault();
        if (idx < items.length - 1) {
          const sibling = items[idx + 1];
          list.insertBefore(active, sibling.nextSibling);
          const newItems = getItems();
          const newIdx = newItems.indexOf(active);
          announce(`${getItemLabel(active)}, moved to position ${newIdx + 1} of ${newItems.length}`);
          setActive(active);
          list.dispatchEvent(new CustomEvent("sortable-change", {
            bubbles: true,
            detail: { item: active, index: newIdx }
          }));
        }
      } else if (e.key === PREV_KEY && e.altKey) {
        e.preventDefault();
        if (idx > 0) {
          const sibling = items[idx - 1];
          list.insertBefore(active, sibling);
          const newItems = getItems();
          const newIdx = newItems.indexOf(active);
          announce(`${getItemLabel(active)}, moved to position ${newIdx + 1} of ${newItems.length}`);
          setActive(active);
          list.dispatchEvent(new CustomEvent("sortable-change", {
            bubbles: true,
            detail: { item: active, index: newIdx }
          }));
        }
      }
    });
    list.addEventListener("focusin", (e) => {
      const item = e.target.closest(".sortable-item");
      if (item && list.contains(item))
        setActive(item);
    });
  });
}
init20();
new MutationObserver(init20).observe(document, { childList: true, subtree: true });

// src/components/tabs/tabs.ts
var _defussShadcn21 = defussGlobals();
var tabsStates = ["default", "active"];
var activateTab = (tab, triggers) => {
  triggers.forEach((t) => {
    t.setAttribute("aria-selected", "false");
    t.setAttribute("tabindex", "-1");
    t.dataset.stateName = "default";
    const panel2 = document.getElementById(t.getAttribute("aria-controls"));
    if (panel2)
      panel2.hidden = true;
  });
  tab.setAttribute("aria-selected", "true");
  tab.removeAttribute("tabindex");
  tab.dataset.stateName = "active";
  const panel = document.getElementById(tab.getAttribute("aria-controls"));
  if (panel)
    panel.hidden = false;
};
function triggerStateChange21(tab, triggers, stateName, _config) {
  switch (stateName) {
    case "default":
      if (tab._defaultSelected)
        activateTab(tab, triggers);
      else
        activateTab(triggers.find((t) => t._defaultSelected) || triggers[0], triggers);
      break;
    case "active":
      if (!tab.disabled)
        activateTab(tab, triggers);
      break;
  }
}
var tabsApi = {
  setState(tab, stateName, config = {}) {
    if (!tabsStates.includes(stateName)) {
      throw new Error(`tabs: unknown state "${stateName}" (supported: ${tabsStates.join(", ")})`);
    }
    const triggers = Array.from(tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]'));
    triggerStateChange21(tab, triggers, stateName, config);
    tab._stateConfig = config;
  },
  getState(tab) {
    return {
      name: tab.getAttribute("aria-selected") === "true" ? "active" : "default",
      config: tab._stateConfig ?? {}
    };
  }
};
_defussShadcn21.tabsApi = tabsApi;
_defussShadcn21.tabsStates = tabsStates;
function init21() {
  document.querySelectorAll('[role="tablist"]:not([data-init])').forEach((tablist) => {
    tablist.dataset.init = "";
    if (!tablist.querySelector(".tab-trigger"))
      return;
    const triggers = Array.from(tablist.querySelectorAll('[role="tab"]'));
    triggers.forEach((t) => {
      t._defaultSelected = t.getAttribute("aria-selected") === "true";
      t.api = {
        setState: (stateName, config) => tabsApi.setState(t, stateName, config),
        getState: () => tabsApi.getState(t)
      };
    });
    const orientation = tablist.getAttribute("aria-orientation") || "horizontal";
    triggers.forEach((trigger) => {
      trigger.addEventListener("click", () => {
        activateTab(trigger, triggers);
      });
      trigger.addEventListener("keydown", (e) => {
        const current = triggers.indexOf(trigger);
        let next;
        const forward = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
        const backward = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
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
init21();
new MutationObserver(init21).observe(document, { childList: true, subtree: true });

// src/components/toast/toast.ts
var _defussShadcn22 = defussGlobals();
var toastStates = ["default"];
function triggerStateChange22(container, stateName, _config) {
  if (stateName !== "default")
    return;
  container.querySelectorAll(".toast").forEach((el) => toastDismiss(el));
}
var toastApi = {
  setState(container, stateName, config = {}) {
    if (!toastStates.includes(stateName)) {
      throw new Error(`toast: unknown state "${stateName}" (supported: ${toastStates.join(", ")})`);
    }
    triggerStateChange22(container, stateName, config);
    container.dataset.stateName = stateName;
    container._stateConfig = config;
  },
  getState(container) {
    return {
      name: container.dataset.stateName || "default",
      config: { ...container._stateConfig, count: container.querySelectorAll(".toast").length }
    };
  }
};
_defussShadcn22.toastApi = toastApi;
_defussShadcn22.toastStates = toastStates;
var DURATION = 4000;
var MAX_VISIBLE = 3;
var toastCallbacks = new WeakMap;
var toastContainer = document.getElementById("toast-container");
if (!toastContainer) {
  toastContainer = document.createElement("div");
  toastContainer.id = "toast-container";
  toastContainer.className = "toast-container";
  toastContainer.setAttribute("aria-label", "Notifications");
  toastContainer.setAttribute("data-position", "bottom-right");
  document.body.appendChild(toastContainer);
}
var stackToasts = (container) => {
  let offset = 0;
  for (const t of container.querySelectorAll(".toast")) {
    t.style.setProperty("--toast-stack", `${offset}px`);
    offset += t.getBoundingClientRect().height + 8;
  }
};
var toastDismiss = (el, callback) => {
  if (!el || !el.parentNode)
    return;
  const container = el.parentNode;
  el.animate([{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(0.5rem)" }], { duration: 200, easing: "ease", fill: "forwards" }).finished.then(() => {
    try {
      el.hidePopover();
    } catch {}
    el.remove();
    stackToasts(container);
    if (callback)
      callback();
  });
};
var toastCreate = (options) => {
  const o = typeof options === "string" ? { title: options } : options;
  const { title, description, variant, action, onDismiss } = o;
  const duration = o.duration != null ? o.duration : DURATION;
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", variant === "destructive" ? "alert" : "status");
  el.setAttribute("aria-live", variant === "destructive" ? "assertive" : "polite");
  el.setAttribute("aria-atomic", "true");
  el.setAttribute("popover", "manual");
  if (variant)
    el.setAttribute("data-variant", variant);
  const icons = {
    success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
    warning: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    destructive: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>'
  };
  const contentEl = document.createElement("div");
  contentEl.className = "toast-content";
  if (variant && icons[variant]) {
    const tmpl = document.createElement("template");
    tmpl.innerHTML = icons[variant];
    contentEl.appendChild(tmpl.content);
  }
  const textDiv = document.createElement("div");
  textDiv.className = "toast-text";
  if (title) {
    const p = document.createElement("p");
    p.className = "toast-title";
    p.textContent = title;
    textDiv.appendChild(p);
  }
  if (description) {
    const p = document.createElement("p");
    p.className = "toast-description";
    p.textContent = description;
    textDiv.appendChild(p);
  }
  contentEl.appendChild(textDiv);
  const closeBtn = document.createElement("button");
  closeBtn.className = "toast-close";
  closeBtn.setAttribute("aria-label", "Dismiss");
  closeBtn.dataset.toastClose = "";
  closeBtn.innerHTML = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  contentEl.appendChild(closeBtn);
  el.appendChild(contentEl);
  if (action) {
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "toast-actions";
    const actionBtn = document.createElement("button");
    actionBtn.className = "btn";
    actionBtn.setAttribute("data-variant", "outline");
    actionBtn.setAttribute("data-size", "sm");
    actionBtn.dataset.toastAction = "";
    actionBtn.textContent = action.label;
    actionsDiv.appendChild(actionBtn);
    el.appendChild(actionsDiv);
  }
  toastContainer.appendChild(el);
  el.showPopover();
  stackToasts(toastContainer);
  toastCallbacks.set(el, { onDismiss, action });
  if (duration !== Infinity)
    setTimeout(() => {
      toastDismiss(el, onDismiss);
    }, duration);
  const toasts = toastContainer.querySelectorAll(".toast");
  if (toasts.length > MAX_VISIBLE)
    toastDismiss(toasts[0]);
  return el;
};
function init22() {
  document.querySelectorAll("#toast-container:not([data-init])").forEach((container) => {
    container.dataset.init = "";
    container.api = {
      setState: (stateName, config) => toastApi.setState(container, stateName, config),
      getState: () => toastApi.getState(container)
    };
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
init22();
new MutationObserver(init22).observe(document.body, { childList: true, subtree: true });
_defussShadcn22.toast = {
  show: toastCreate,
  success: (o) => toastCreate(Object.assign(typeof o === "string" ? { title: o } : o, { variant: "success" })),
  warning: (o) => toastCreate(Object.assign(typeof o === "string" ? { title: o } : o, { variant: "warning" })),
  info: (o) => toastCreate(Object.assign(typeof o === "string" ? { title: o } : o, { variant: "info" })),
  error: (o) => toastCreate(Object.assign(typeof o === "string" ? { title: o } : o, { variant: "destructive" })),
  dismiss: () => {
    toastContainer.querySelectorAll(".toast").forEach((el) => {
      toastDismiss(el);
    });
  }
};

// src/components/toggle/toggle.ts
var _defussShadcn23 = defussGlobals();
var toggleStates = ["default", "pressed"];
function triggerStateChange23(toggle, stateName, _config) {
  switch (stateName) {
    case "default":
      toggle.setAttribute("aria-pressed", toggle._defaultPressed ?? "false");
      break;
    case "pressed":
      toggle.setAttribute("aria-pressed", "true");
      break;
  }
}
var toggleApi = {
  setState(toggle, stateName, config = {}) {
    if (!toggleStates.includes(stateName)) {
      throw new Error(`toggle: unknown state "${stateName}" (supported: ${toggleStates.join(", ")})`);
    }
    triggerStateChange23(toggle, stateName, config);
    toggle.dataset.stateName = stateName;
    toggle._stateConfig = config;
  },
  getState(toggle) {
    const pressed = toggle.getAttribute("aria-pressed") === "true";
    return {
      name: toggle.dataset.stateName || (pressed ? "pressed" : "default"),
      config: toggle._stateConfig ?? {}
    };
  }
};
_defussShadcn23.toggleApi = toggleApi;
_defussShadcn23.toggleStates = toggleStates;
function init23() {
  document.querySelectorAll(".toggle:not([data-init]):not(.toggle-group .toggle)").forEach((toggle) => {
    toggle.dataset.init = "";
    toggle._defaultPressed = toggle.getAttribute("aria-pressed") || "false";
    toggle.api = {
      setState: (stateName, config) => toggleApi.setState(toggle, stateName, config),
      getState: () => toggleApi.getState(toggle)
    };
    toggle.addEventListener("click", () => {
      const pressed = toggle.getAttribute("aria-pressed") === "true";
      toggle.setAttribute("aria-pressed", !pressed);
      toggle.dataset.stateName = !pressed ? "pressed" : "default";
    });
  });
}
init23();
new MutationObserver(init23).observe(document, { childList: true, subtree: true });

// src/components/toggle-group/toggle-group.ts
var _defussShadcn24 = defussGlobals();
var toggleGroupStates = ["default", "disabled"];
function triggerStateChange24(group, stateName, _config) {
  switch (stateName) {
    case "default":
      group.removeAttribute("data-disabled");
      break;
    case "disabled":
      group.setAttribute("data-disabled", "");
      break;
  }
}
var toggleGroupApi = {
  setState(group, stateName, config = {}) {
    if (!toggleGroupStates.includes(stateName)) {
      throw new Error(`toggle-group: unknown state "${stateName}" (supported: ${toggleGroupStates.join(", ")})`);
    }
    triggerStateChange24(group, stateName, config);
    group.dataset.stateName = stateName;
    group._stateConfig = config;
  },
  getState(group) {
    return {
      name: group.hasAttribute("data-disabled") ? "disabled" : "default",
      config: group._stateConfig ?? {}
    };
  }
};
_defussShadcn24.toggleGroupApi = toggleGroupApi;
_defussShadcn24.toggleGroupStates = toggleGroupStates;
function init24() {
  document.querySelectorAll(".toggle-group:not([data-init])").forEach((group) => {
    group.dataset.init = "";
    group.api = {
      setState: (stateName, config) => toggleGroupApi.setState(group, stateName, config),
      getState: () => toggleGroupApi.getState(group)
    };
    const type = group.getAttribute("data-type") || "single";
    const getToggles = () => Array.from(group.querySelectorAll(".toggle:not(:disabled)"));
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
init24();
new MutationObserver(init24).observe(document, { childList: true, subtree: true });

// src/components/toolbar/toolbar.ts
var _defussShadcn25 = defussGlobals();
var toolbarStates = ["default"];
function triggerStateChange25(toolbar, items, stateName, config) {
  if (stateName !== "default" || items.length === 0)
    return;
  const target = items[Math.min(Number(config?.focus ?? 0), items.length - 1)] || items[0];
  items.forEach((item) => item.setAttribute("tabindex", item === target ? "0" : "-1"));
  if (toolbar.contains(document.activeElement))
    target.focus();
}
var toolbarApi = {
  setState(toolbar, stateName, config = {}) {
    if (!toolbarStates.includes(stateName)) {
      throw new Error(`toolbar: unknown state "${stateName}" (supported: ${toolbarStates.join(", ")})`);
    }
    const items = toolbarItems(toolbar);
    triggerStateChange25(toolbar, items, stateName, config);
    toolbar.dataset.stateName = stateName;
    toolbar._stateConfig = config;
  },
  getState(toolbar) {
    const items = toolbarItems(toolbar);
    const idx = items.findIndex((item) => item.getAttribute("tabindex") === "0");
    return {
      name: toolbar.dataset.stateName || "default",
      config: { ...toolbar._stateConfig, rovingIndex: idx }
    };
  }
};
_defussShadcn25.toolbarApi = toolbarApi;
_defussShadcn25.toolbarStates = toolbarStates;
var toolbarItems = (toolbar) => Array.from(toolbar.querySelectorAll('button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'));
function init25() {
  document.querySelectorAll('.toolbar[role="toolbar"]:not([data-init])').forEach((toolbar) => {
    toolbar.dataset.init = "";
    toolbar.api = {
      setState: (stateName, config) => toolbarApi.setState(toolbar, stateName, config),
      getState: () => toolbarApi.getState(toolbar)
    };
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
init25();
new MutationObserver(init25).observe(document, { childList: true, subtree: true });

// src/components/tooltip/tooltip.ts
var _defussShadcn26 = defussGlobals();
var tooltipStates = ["default", "visible"];
function triggerStateChange26(tip, stateName, _config) {
  switch (stateName) {
    case "default":
      try {
        tip.hidePopover();
      } catch {}
      break;
    case "visible":
      safeShowPopover(tip);
      markGroupOpen();
      break;
  }
}
var tooltipApi = {
  setState(tip, stateName, config = {}) {
    if (!tooltipStates.includes(stateName)) {
      throw new Error(`tooltip: unknown state "${stateName}" (supported: ${tooltipStates.join(", ")})`);
    }
    triggerStateChange26(tip, stateName, config);
    tip.dataset.stateName = stateName;
    tip._stateConfig = config;
  },
  getState(tip) {
    return { name: tip.dataset.stateName || "default", config: tip._stateConfig ?? {} };
  }
};
_defussShadcn26.tooltipApi = tooltipApi;
_defussShadcn26.tooltipStates = tooltipStates;
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
function init26() {
  document.querySelectorAll("[data-tooltip-trigger]:not([data-init])").forEach((trigger) => {
    trigger.dataset.init = "";
    const tip = document.getElementById(trigger.dataset.tooltipTrigger);
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
  document.querySelectorAll(".tooltip[popover]:not([data-init])").forEach((tip) => {
    tip.dataset.init = "";
    tip.api = {
      setState: (stateName, config) => tooltipApi.setState(tip, stateName, config),
      getState: () => tooltipApi.getState(tip)
    };
  });
}
init26();
new MutationObserver(init26).observe(document, { childList: true, subtree: true });
if (!document.__tooltipScrollInit) {
  document.__tooltipScrollInit = true;
  document.addEventListener("scroll", () => {
    document.querySelectorAll(".tooltip:popover-open").forEach((tip) => {
      try {
        tip.hidePopover();
      } catch {}
    });
  }, { passive: true, capture: true });
}

// src/components/tree-view/tree-view.ts
var _defussShadcn27 = defussGlobals();
var treeViewStates = ["default", "expanded"];
function triggerStateChange27(details, stateName, _config) {
  switch (stateName) {
    case "default":
      details.open = details._defaultOpen ?? false;
      break;
    case "expanded":
      details.open = true;
      break;
  }
}
var treeViewApi = {
  setState(details, stateName, config = {}) {
    if (!treeViewStates.includes(stateName)) {
      throw new Error(`tree-view: unknown state "${stateName}" (supported: ${treeViewStates.join(", ")})`);
    }
    triggerStateChange27(details, stateName, config);
    details.dataset.stateName = stateName;
    details._stateConfig = config;
  },
  getState(details) {
    return {
      name: details.open ? "expanded" : "default",
      config: details._stateConfig ?? {}
    };
  }
};
_defussShadcn27.treeViewApi = treeViewApi;
_defussShadcn27.treeViewStates = treeViewStates;
function init27() {
  document.querySelectorAll('.tree[role="tree"]:not([data-init])').forEach((tree) => {
    tree.dataset.init = "";
    tree.querySelectorAll(".tree-branch").forEach((details) => {
      const treeitem = details.closest('[role="treeitem"]');
      if (!treeitem)
        return;
      details._defaultOpen = details.open;
      details.api = {
        setState: (stateName, config) => treeViewApi.setState(details, stateName, config),
        getState: () => treeViewApi.getState(details)
      };
      details.addEventListener("toggle", () => {
        treeitem.setAttribute("aria-expanded", String(details.open));
        details.dataset.stateName = details.open ? "expanded" : "default";
      });
    });
    tree.addEventListener("keydown", (e) => {
      const target = e.target.closest(".tree-branch-trigger, .tree-leaf");
      if (!target)
        return;
      const allItems = Array.from(tree.querySelectorAll(".tree-branch-trigger, .tree-leaf"));
      const visibleItems = allItems.filter((item) => item.checkVisibility());
      const index = visibleItems.indexOf(target);
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
            if (detailsR && !detailsR.open)
              detailsR.open = true;
          }
          break;
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
init27();
new MutationObserver(init27).observe(document, { childList: true, subtree: true });

//# debugId=FC1E29FFBACD051D64756E2164756E21
//# sourceMappingURL=all.js.map
