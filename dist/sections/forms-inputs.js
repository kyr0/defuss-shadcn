// dist/components/otp-input/otp-input.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.9.8") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals, defussQuery, componentState, bindComponent } = __df$shared;
var df$ = defussGlobals();
var dfDollar = defussQuery();
var otpInputStates = ["default", "filled", "invalid"];
var PATTERNS = {
  digits: /[^0-9]/g,
  alphanumeric: /[^a-zA-Z0-9]/g
};
var lengthOf = (otp) => Math.max(1, parseInt(otp.dataset.length || "6", 10) || 6);
function clean(otp, raw) {
  const strip = PATTERNS[otp.dataset.pattern] ?? PATTERNS.digits;
  return raw.replace(strip, "").slice(0, lengthOf(otp));
}
function paint(otp) {
  const field = otp._field;
  if (!field)
    return;
  const value = field.value;
  const focused = document.activeElement === field;
  const caret = Math.min(field.selectionStart ?? value.length, lengthOf(otp) - 1);
  otp._slots.forEach((slot, i) => {
    const char = value[i] ?? "";
    slot.textContent = otp.hasAttribute("data-mask") && char ? "•" : char;
    slot.toggleAttribute("data-filled", char !== "");
    slot.toggleAttribute("data-active", focused && i === caret && value.length < lengthOf(otp));
    slot.toggleAttribute("data-caret", focused && i === value.length && value.length < lengthOf(otp));
  });
}
function announceComplete(otp) {
  otp.dispatchEvent(new CustomEvent("otp-complete", { bubbles: true, detail: { value: otp._field.value } }));
}
function applyMarkup(el, stateName) {
  const invalid = stateName === "invalid";
  dfDollar(el).attr("data-invalid", invalid ? "" : null);
  dfDollar(el).find("input").first().attr("aria-invalid", invalid ? "true" : null);
}
function triggerStateChange(otp, stateName, config) {
  const field = otp._field;
  switch (stateName) {
    case "default":
      otp.removeAttribute("data-invalid");
      field.removeAttribute("aria-invalid");
      if (typeof config.value === "string")
        field.value = clean(otp, config.value);
      break;
    case "filled":
      otp.removeAttribute("data-invalid");
      field.removeAttribute("aria-invalid");
      if (typeof config.value === "string") {
        field.value = clean(otp, config.value);
      } else if (field.value.length < lengthOf(otp)) {
        field.value = "0".repeat(lengthOf(otp));
      }
      break;
    case "invalid":
      otp.setAttribute("data-invalid", "");
      field.setAttribute("aria-invalid", "true");
      if (typeof config.value === "string")
        field.value = clean(otp, config.value);
      break;
  }
  paint(otp);
}
var otpInputApi = componentState({
  component: "otp-input",
  states: otpInputStates,
  apply: (otp, state) => {
    triggerStateChange(otp, state.name, state.config);
  },
  read: (otp, state) => {
    return {
      name: otp.dataset.stateName || "default",
      config: { ...state.config, ...otp._field ? { value: otp._field.value } : {} }
    };
  },
  markup: (el, state) => applyMarkup(el, state.name)
});
df$.otpInputApi = otpInputApi;
df$.otpInputStates = otpInputStates;
function init() {
  dfDollar(".otp-input:not([data-init])").toArray().forEach((otp) => {
    otp.dataset.init = "";
    const field = dfDollar(otp).find("input").get(0);
    if (!field)
      return;
    otp._field = field;
    const length = lengthOf(otp);
    field.maxLength = length;
    if (!field.getAttribute("inputmode")) {
      field.setAttribute("inputmode", otp.dataset.pattern === "alphanumeric" ? "text" : "numeric");
    }
    if (!field.getAttribute("autocomplete"))
      field.setAttribute("autocomplete", "one-time-code");
    const groupSize = parseInt(otp.dataset.groupSize || "0", 10) || 0;
    otp._slots = [];
    const shell = document.createElement("div");
    shell.className = "otp-input-slots";
    shell.setAttribute("aria-hidden", "true");
    for (let i = 0;i < length; i++) {
      if (groupSize && i > 0 && i % groupSize === 0) {
        const sep = document.createElement("div");
        sep.className = "otp-input-separator";
        dfDollar(shell).append(sep);
      }
      const slot = document.createElement("div");
      slot.className = "otp-input-slot";
      dfDollar(shell).append(slot);
      otp._slots.push(slot);
    }
    dfDollar(otp).append(shell);
    const sync = () => {
      const cleaned = clean(otp, field.value);
      if (cleaned !== field.value) {
        const at = field.selectionStart;
        field.value = cleaned;
        if (at !== null)
          field.setSelectionRange(Math.min(at, cleaned.length), Math.min(at, cleaned.length));
      }
      paint(otp);
      if (field.value.length === length) {
        otpInputApi.setState(otp, otp.hasAttribute("data-invalid") ? "invalid" : "filled", {
          value: field.value
        });
        announceComplete(otp);
      }
    };
    field.addEventListener("input", sync);
    field.addEventListener("focus", () => paint(otp));
    field.addEventListener("blur", () => paint(otp));
    field.addEventListener("keyup", () => paint(otp));
    field.addEventListener("click", () => paint(otp));
    field.addEventListener("select", () => paint(otp));
    bindComponent(otp, otpInputApi);
    otpInputApi.setState(otp, field.value.length === length ? "filled" : "default", {});
  });
}
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

// dist/components/slider/slider.js
var __df$core2 = globalThis.df$;
var __df$shared2 = __df$core2 && __df$core2.shadcn && __df$core2.shadcn.shared;
if (!__df$shared2 || __df$shared2.abi !== "0.9.8") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals2, defussQuery: defussQuery2, componentState: componentState2, bindComponent: bindComponent2, textLocale } = __df$shared2;
var df$2 = defussGlobals2();
var dfDollar2 = defussQuery2();
var sliderStates = ["default", "disabled"];
function percentOf(el) {
  const min = parseFloat(el.min || 0);
  const max = parseFloat(el.max || 100);
  return max === min ? 0 : (parseFloat(el.value) - min) / (max - min) * 100;
}
function formatterOf(el) {
  const host = el.closest(".slider-range") ?? el;
  const d = { ...host.dataset, ...el.dataset };
  const step = el.step && el.step !== "any" ? el.step : "1";
  const digits = step.includes(".") ? step.split(".")[1].length : 0;
  const opts = { maximumFractionDigits: digits, minimumFractionDigits: 0 };
  if (d.currency)
    Object.assign(opts, { style: "currency", currency: d.currency });
  else if (d.unit)
    Object.assign(opts, { style: "unit", unit: d.unit, unitDisplay: d.unitDisplay || "short" });
  const lang = textLocale(el);
  try {
    return new Intl.NumberFormat(lang, opts);
  } catch {
    return new Intl.NumberFormat(lang, { maximumFractionDigits: digits });
  }
}
var hasFormat = (el) => {
  const host = el.closest(".slider-range") ?? el;
  return !!(el.dataset.unit || el.dataset.currency || host.dataset.unit || host.dataset.currency);
};
function outputsOf(el) {
  if (!el.id)
    return [];
  return [...dfDollar2("output[for]").toArray()].filter((o) => o.htmlFor.contains(el.id));
}
function emojiThumb(el) {
  const list = (el.dataset.thumbEmoji || "").trim().split(/\s+/).filter(Boolean);
  if (!list.length)
    return;
  const i = Math.min(list.length - 1, Math.floor(percentOf(el) / 100 * list.length));
  const emoji = list[i];
  if (el._emoji === emoji)
    return;
  el._emoji = emoji;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><text x="16" y="17" font-size="26" text-anchor="middle" dominant-baseline="central">${emoji}</text></svg>`;
  el.style.setProperty("--slider-thumb-image", `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
}
function updateSliderValue(el) {
  el.style.setProperty("--slider-value", `${percentOf(el)}%`);
  if (el.dataset.thumbEmoji)
    emojiThumb(el);
  const range = el.closest(".slider-range");
  if (range)
    paintRange(range);
  const fmt = hasFormat(el) ? formatterOf(el) : null;
  if (fmt)
    el.setAttribute("aria-valuetext", fmt.format(parseFloat(el.value)));
  for (const out of outputsOf(el)) {
    const pair = range ? rangeInputs(range) : null;
    const f = fmt ?? formatterOf(el);
    if (pair && out.htmlFor.contains(pair[0].id) && out.htmlFor.contains(pair[1].id)) {
      const a = parseFloat(pair[0].value);
      const b = parseFloat(pair[1].value);
      out.value = a === b ? f.format(a) : f.formatRange(a, b);
    } else {
      out.value = f.format(parseFloat(el.value));
    }
  }
}
var rangeInputs = (range) => [...dfDollar2(range).find(":scope > .slider").toArray()].slice(0, 2);
function paintRange(range) {
  const [lo, hi] = rangeInputs(range);
  if (!lo || !hi)
    return;
  range.style.setProperty("--range-from", `${percentOf(lo)}%`);
  range.style.setProperty("--range-to", `${percentOf(hi)}%`);
}
function initRange(range) {
  const [lo, hi] = rangeInputs(range);
  if (!lo || !hi)
    return;
  const gap = parseFloat(range.dataset.minGap || "0");
  const clamp = (moved) => {
    const a = parseFloat(lo.value);
    const b = parseFloat(hi.value);
    if (b - a < gap || a > b) {
      if (moved === lo)
        lo.value = String(b - gap);
      else
        hi.value = String(a + gap);
    }
    lo.toggleAttribute("data-active", moved === lo);
    hi.toggleAttribute("data-active", moved === hi);
    updateSliderValue(lo);
    updateSliderValue(hi);
  };
  lo.addEventListener("input", () => clamp(lo));
  hi.addEventListener("input", () => clamp(hi));
  for (const s of [lo, hi])
    s.addEventListener("pointerdown", () => {
      lo.toggleAttribute("data-active", s === lo);
      hi.toggleAttribute("data-active", s === hi);
    });
  paintRange(range);
}
function applyMarkup2(el, stateName) {
  if (stateName === "disabled")
    dfDollar2(el).attr("disabled", "");
}
function triggerStateChange2(el, stateName, config) {
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
var sliderApi = componentState2({
  component: "slider",
  states: sliderStates,
  apply: (el, state) => triggerStateChange2(el, state.name, state.config),
  read: (el, state) => {
    return {
      name: el.disabled ? "disabled" : "default",
      config: { ...state.config, value: el.value }
    };
  },
  markup: (el, state) => applyMarkup2(el, state.name)
});
df$2.sliderApi = sliderApi;
df$2.sliderStates = sliderStates;
function init2() {
  dfDollar2(".slider-range:not([data-init])").toArray().forEach((range) => {
    range.dataset.init = "";
    initRange(range);
  });
  dfDollar2(".slider:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    el._defaultDisabled = el.disabled;
    bindComponent2(el, sliderApi);
    if (el.dataset.thumbEmoji && !el.dataset.thumb)
      el.dataset.thumb = "emoji";
    updateSliderValue(el);
    el.addEventListener("input", () => updateSliderValue(el));
  });
}
init2();
new MutationObserver(init2).observe(document, { childList: true, subtree: true });

// dist/components/number-input/number-input.js
var __df$core3 = globalThis.df$;
var __df$shared3 = __df$core3 && __df$core3.shadcn && __df$core3.shadcn.shared;
if (!__df$shared3 || __df$shared3.abi !== "0.9.8") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals3, defussQuery: defussQuery3, componentState: componentState3, bindComponent: bindComponent3, textLocale: textLocale2 } = __df$shared3;
var df$3 = defussGlobals3();
var dfDollar3 = defussQuery3();
var numberInputStates = ["default"];
var getInput = (wrapper) => dfDollar3(wrapper).find('input:not([type="hidden"])').get(0);
function currencyConfig(wrapper) {
  const currency = String(wrapper.dataset.currency || "USD").toUpperCase();
  const locale = wrapper.dataset.locale || textLocale2(wrapper);
  const currencyDisplay = wrapper.dataset.currencyDisplay || "symbol";
  const money = new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay });
  const parts = money.formatToParts(1234567.5);
  const index = (type) => parts.findIndex((p) => p.type === type);
  const fraction = money.resolvedOptions().maximumFractionDigits ?? 2;
  return {
    locale,
    currency,
    fraction,
    decimal: parts.find((p) => p.type === "decimal")?.value ?? ".",
    symbol: parts.find((p) => p.type === "currency")?.value ?? currency,
    prefix: index("currency") < index("integer"),
    grouping: new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
    fixed: new Intl.NumberFormat(locale, { minimumFractionDigits: fraction, maximumFractionDigits: fraction })
  };
}
function parseMoney(text, cfg) {
  let dec = text.lastIndexOf(cfg.decimal);
  if (dec < 0 && cfg.fraction > 0) {
    const alt = cfg.decimal === "," ? "." : ",";
    const i = text.lastIndexOf(alt);
    if (i >= 0 && /^\d*$/.test(text.slice(i + 1)) && text.length - i - 1 <= cfg.fraction)
      dec = i;
  }
  if (cfg.fraction === 0)
    dec = -1;
  const int = (dec < 0 ? text : text.slice(0, dec)).replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  const frac = dec < 0 ? null : text.slice(dec + 1).replace(/\D/g, "").slice(0, cfg.fraction);
  return { int, frac };
}
var moneyText = (int, frac, cfg) => (int ? cfg.grouping.format(BigInt(int)) : frac !== null ? "0" : "") + (frac !== null ? cfg.decimal + frac : "");
var moneyValue = ({ int, frac }) => {
  if (!int && !frac)
    return "";
  const f = (frac ?? "").replace(/0+$/, "");
  return `${int || "0"}${f ? "." + f : ""}`;
};
function maskMoney(wrapper, input, cfg) {
  const raw = input.value;
  const caret = input.selectionStart ?? raw.length;
  const digitsBefore = raw.slice(0, caret).replace(/\D/g, "").length;
  const parsed = parseMoney(raw, cfg);
  const text = moneyText(parsed.int, parsed.frac, cfg);
  if (text !== raw) {
    input.value = text;
    let pos = 0;
    for (let seen = 0;pos < text.length && seen < digitsBefore; pos++)
      if (/\d/.test(text[pos]))
        seen++;
    if (text[pos] === cfg.decimal && raw.slice(0, caret).match(/[.,]$/))
      pos++;
    input.setSelectionRange(pos, pos);
  }
  wrapper._moneyExact = moneyValue(parsed);
  writeMoneyOutput(wrapper, wrapper._moneyExact);
}
function commitMoney(wrapper, input, cfg, number = null, remember = true) {
  const value = number ?? moneyValue(parseMoney(input.value, cfg));
  if (remember)
    wrapper._moneyExact = value === "" || !Number.isFinite(Number(value)) ? "" : String(Number(value));
  if (value === "" || !Number.isFinite(Number(value))) {
    input.value = "";
    writeMoneyOutput(wrapper, "");
    return;
  }
  input.value = cfg.fixed.format(Number(value));
  writeMoneyOutput(wrapper, moneyValue(parseMoney(input.value, cfg)));
}
function writeMoneyOutput(wrapper, value) {
  wrapper.dataset.value = value;
  dfDollar3(wrapper).find("input[data-number-output]").toArray().forEach((out) => {
    if (out.value === value)
      return;
    out.value = value;
    out.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
function placeCurrencySymbol(wrapper, input, cfg) {
  let unit = dfDollar3(wrapper).find(".number-input-unit").get(0);
  if (!unit) {
    unit = document.createElement("label");
    unit.className = "number-input-unit";
    if (input.id)
      unit.htmlFor = input.id;
  }
  unit.textContent = cfg.symbol;
  if (cfg.prefix && unit.nextElementSibling !== input)
    input.before(unit);
  if (!cfg.prefix && input.nextElementSibling !== unit)
    input.after(unit);
}
function setupCurrency(wrapper, input) {
  const cfg = currencyConfig(wrapper);
  wrapper._money = cfg;
  placeCurrencySymbol(wrapper, input, cfg);
  input.setAttribute("inputmode", cfg.fraction > 0 ? "decimal" : "numeric");
  if (wrapper._moneyExact !== undefined) {
    commitMoney(wrapper, input, cfg, wrapper._moneyExact, false);
    return;
  }
  const authored = (input.getAttribute("value") ?? "").trim();
  const machine = /^\d+(\.\d+)?$/.test(authored) ? authored : moneyValue(parseMoney(authored, cfg));
  commitMoney(wrapper, input, cfg, machine === "" ? "" : machine);
}
function formatDecimals(wrapper, input) {
  const d = parseInt(wrapper.dataset.decimals ?? "", 10);
  if (!Number.isFinite(d) || d < 0 || input.value === "")
    return;
  const n = input.valueAsNumber;
  if (!Number.isFinite(n))
    return;
  const fixed = n.toFixed(d);
  if (input.value !== fixed)
    input.value = fixed;
}
function applyMarkup3(_el, _stateName) {}
function triggerStateChange3(wrapper, config) {
  const input = getInput(wrapper);
  if (!input)
    return;
  if (wrapper._money) {
    const machine = config?.number !== undefined ? config.number : config?.value;
    if (machine === undefined)
      return;
    commitMoney(wrapper, input, wrapper._money, machine === "" ? "" : String(machine));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }
  if (config?.value === undefined)
    return;
  input.value = String(config.value);
  formatDecimals(wrapper, input);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
var numberInputApi = componentState3({
  component: "number-input",
  states: numberInputStates,
  apply: (wrapper, state) => triggerStateChange3(wrapper, state.config),
  read: (wrapper, state) => {
    const input = getInput(wrapper);
    return {
      name: wrapper.dataset.stateName || "default",
      config: {
        ...state.config,
        value: input ? input.value : "",
        ...wrapper._money ? { number: wrapper.dataset.value ?? "", currency: wrapper._money.currency, locale: wrapper._money.locale } : {}
      }
    };
  },
  markup: (el, state) => applyMarkup3(el, state.name)
});
df$3.numberInputApi = numberInputApi;
df$3.numberInputStates = numberInputStates;
function init3() {
  dfDollar3(".number-input:not([data-init])").toArray().forEach((wrapper) => {
    wrapper.dataset.init = "";
    bindComponent3(wrapper, numberInputApi);
    const input = getInput(wrapper);
    const decBtn = dfDollar3(wrapper).find('[data-action="decrement"]').get(0);
    const incBtn = dfDollar3(wrapper).find('[data-action="increment"]').get(0);
    if (!input)
      return;
    if (wrapper.hasAttribute("data-currency")) {
      setupCurrency(wrapper, input);
      input.addEventListener("input", (e) => {
        if (e.isComposing)
          return;
        maskMoney(wrapper, input, wrapper._money);
      });
      input.addEventListener("blur", () => {
        commitMoney(wrapper, input, wrapper._money);
      });
      const nudge = (direction) => {
        const step = Number(input.dataset.step || 1);
        const min = input.dataset.min === undefined ? -Infinity : Number(input.dataset.min);
        const max = input.dataset.max === undefined ? Infinity : Number(input.dataset.max);
        const current = Number(moneyValue(parseMoney(input.value, wrapper._money)) || 0);
        const next = Math.min(max, Math.max(min, Math.round((current + direction * step) * 1e6) / 1e6));
        commitMoney(wrapper, input, wrapper._money, String(next));
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      };
      input.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          nudge(e.key === "ArrowUp" ? 1 : -1);
        }
      });
      if (decBtn)
        decBtn.addEventListener("click", () => {
          nudge(-1);
        });
      if (incBtn)
        incBtn.addEventListener("click", () => {
          nudge(1);
        });
      new MutationObserver(() => {
        setupCurrency(wrapper, input);
      }).observe(wrapper, { attributes: true, attributeFilter: ["data-locale", "data-currency", "data-currency-display"] });
      return;
    }
    formatDecimals(wrapper, input);
    input.addEventListener("change", () => {
      formatDecimals(wrapper, input);
    });
    const update = (direction) => {
      try {
        if (direction > 0)
          input.stepUp();
        else
          input.stepDown();
        formatDecimals(wrapper, input);
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
init3();
new MutationObserver(init3).observe(document, { childList: true, subtree: true });

// dist/components/file-input/file-input.js
var __df$core4 = globalThis.df$;
var __df$shared4 = __df$core4 && __df$core4.shadcn && __df$core4.shadcn.shared;
if (!__df$shared4 || __df$shared4.abi !== "0.9.8") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals4, defussQuery: defussQuery4, componentState: componentState4, bindComponent: bindComponent4, textLocale: textLocale3 } = __df$shared4;
var df$4 = defussGlobals4();
var dfDollar4 = defussQuery4();
var fileInputStates = ["default", "dragover", "selected", "error"];
var inputOf = (el) => dfDollar4(el).find(".file-drop-input").get(0);
function accepts(input, file) {
  const list = (input.accept || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!list.length)
    return true;
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  return list.some((a) => a.startsWith(".") ? name.endsWith(a) : a.endsWith("/*") ? type.startsWith(a.slice(0, -1)) : type === a);
}
var lang = (el) => textLocale3(el);
function formatSize(el, bytes) {
  const units = ["byte", "kilobyte", "megabyte", "gigabyte"];
  let i = 0;
  let n = bytes;
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000;
    i++;
  }
  return new Intl.NumberFormat(lang(el), { style: "unit", unit: units[i], unitDisplay: "short", maximumFractionDigits: i ? 1 : 0 }).format(n);
}
var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
function setFiles(input, files) {
  const dt = new DataTransfer;
  for (const f of files)
    dt.items.add(f);
  input.files = dt.files;
}
function renderList(el) {
  const input = inputOf(el);
  const list = dfDollar4(el).find(".file-drop-list").get(0);
  if (!list)
    return;
  (el._urls || []).forEach((u) => URL.revokeObjectURL(u));
  el._urls = [];
  dfDollar4(list).empty().append([...input.files].map((file, i) => {
    const li = document.createElement("li");
    li.className = "file-drop-item";
    const thumb = document.createElement("span");
    thumb.className = "file-drop-thumb";
    thumb.setAttribute("aria-hidden", "true");
    if (file.type.startsWith("image/")) {
      const img = document.createElement("img");
      img.alt = "";
      img.src = URL.createObjectURL(file);
      el._urls.push(img.src);
      thumb.append(img);
    } else {
      thumb.textContent = (file.name.split(".").pop() || "file").slice(0, 4);
    }
    const name = document.createElement("div");
    name.className = "file-drop-name";
    name.textContent = file.name;
    const meta = document.createElement("span");
    meta.className = "file-drop-meta";
    meta.textContent = formatSize(el, file.size);
    name.append(meta);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "file-drop-remove";
    dfDollar4(remove).html(ICON_X);
    remove.setAttribute("aria-label", `Remove ${file.name}`);
    remove.addEventListener("click", () => {
      setFiles(input, [...input.files].filter((_, k) => k !== i));
      el._kept = [...input.files];
      apply(el, [], true);
      el._removing = true;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      el._removing = false;
    });
    li.append(thumb, name, remove);
    return li;
  }));
}
function apply(el, rejected, quiet = false) {
  const input = inputOf(el);
  const err = dfDollar4(el).find(".file-drop-error").get(0);
  const message = rejected.length ? `Not added: ${rejected.map((r) => `${r.file.name} (${r.why})`).join(", ")}` : "";
  if (err) {
    err.textContent = message;
    err.setAttribute("role", "alert");
  }
  el.dataset.stateName = rejected.length ? "error" : input.files.length ? "selected" : "default";
  renderList(el);
  if (!quiet && rejected.length)
    el.dispatchEvent(new CustomEvent("file-drop:rejected", { bubbles: true, detail: { files: rejected.map((r) => r.file), message } }));
}
function onPick(el) {
  const input = inputOf(el);
  const incoming = [...input.files];
  const kept = input.multiple ? el._kept || [] : [];
  const maxSize = parseFloat(el.dataset.maxSize || "Infinity");
  const maxFiles = input.multiple ? parseFloat(el.dataset.maxFiles || "Infinity") : 1;
  const key = (f) => `${f.name}|${f.size}|${f.lastModified}`;
  const seen = new Set(kept.map(key));
  const out = [...kept];
  const rejected = [];
  for (const file of incoming) {
    if (seen.has(key(file)))
      continue;
    if (!accepts(input, file))
      rejected.push({ file, why: "type" });
    else if (file.size > maxSize)
      rejected.push({ file, why: `over ${formatSize(el, maxSize)}` });
    else if (out.length >= maxFiles)
      rejected.push({ file, why: `max ${maxFiles}` });
    else {
      out.push(file);
      seen.add(key(file));
    }
  }
  setFiles(input, out);
  el._kept = out;
  apply(el, rejected);
}
function applyMarkup4(el, stateName, config) {
  const err = dfDollar4(el).find(".file-drop-error").first();
  if (!err.get(0))
    return;
  err.attr("role", "alert");
  if (stateName === "error")
    err.text(config?.message || "Not added: archive.zip (type)");
  else if (stateName !== "dragover")
    err.text("");
}
function triggerStateChange4(el, stateName, config) {
  const input = inputOf(el);
  switch (stateName) {
    case "default":
      setFiles(input, []);
      el._kept = [];
      apply(el, [], true);
      break;
    case "dragover":
      el.dataset.stateName = "dragover";
      break;
    case "selected": {
      const files = (config?.files || [{ name: "report.pdf", size: 248000, type: "application/pdf" }]).map((f) => typeof f === "string" ? { name: f } : f).map((f) => new File([new Uint8Array(Math.min(f.size ?? 0, 5000000))], f.name, { type: f.type || "" }));
      setFiles(input, files);
      el._kept = [...input.files];
      apply(el, [], true);
      break;
    }
    case "error": {
      const err = dfDollar4(el).find(".file-drop-error").get(0);
      if (err)
        err.textContent = config?.message || "Not added: archive.zip (type)";
      el.dataset.stateName = "error";
      break;
    }
  }
}
var fileInputApi = componentState4({
  component: "file-input",
  states: fileInputStates,
  apply: (el, state) => triggerStateChange4(el, state.name, state.config),
  read: (el, state) => {
    const input = inputOf(el);
    return {
      name: el.dataset.stateName || "default",
      config: {
        ...state.config,
        count: input.files.length,
        files: [...input.files].map((f) => f.name),
        ...el.dataset.stateName === "error" ? { message: dfDollar4(el).find(".file-drop-error").text() } : {}
      }
    };
  },
  markup: (el, state) => applyMarkup4(el, state.name, state.config)
});
df$4.fileInputApi = fileInputApi;
df$4.fileInputStates = fileInputStates;
function init4() {
  dfDollar4(".file-drop:not([data-init])").toArray().forEach((el) => {
    const input = inputOf(el);
    if (!input)
      return;
    el.dataset.init = "";
    el.dataset.stateName = "default";
    el._kept = [];
    dfDollar4(el).find(".file-drop-error").attr("role", "alert");
    bindComponent4(el, fileInputApi);
    const zone = dfDollar4(el).find(".file-drop-zone").get(0) || el;
    let depth = 0;
    zone.addEventListener("dragenter", (e) => {
      if (!e.dataTransfer?.types.includes("Files") || input.disabled)
        return;
      depth++;
      el._before = el.dataset.stateName === "dragover" ? el._before : el.dataset.stateName;
      el.dataset.stateName = "dragover";
    });
    zone.addEventListener("dragleave", () => {
      depth = Math.max(0, depth - 1);
      if (!depth && el.dataset.stateName === "dragover")
        el.dataset.stateName = el._before || "default";
    });
    zone.addEventListener("drop", () => {
      depth = 0;
      if (el.dataset.stateName === "dragover")
        el.dataset.stateName = el._before || "default";
    });
    input.addEventListener("change", () => {
      if (!el._removing)
        onPick(el);
    });
  });
}
init4();
new MutationObserver(init4).observe(document, { childList: true, subtree: true });

// dist/components/color-picker/color-picker.js
var __df$core5 = globalThis.df$;
var __df$shared5 = __df$core5 && __df$core5.shadcn && __df$core5.shadcn.shared;
if (!__df$shared5 || __df$shared5.abi !== "0.9.8") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals5, defussQuery: defussQuery5, componentState: componentState5, bindComponent: bindComponent5 } = __df$shared5;
var df$5 = defussGlobals5();
var dfDollar5 = defussQuery5();
var colorPickerStates = ["default"];
var getInput2 = (picker) => dfDollar5(picker).find('input[type="color"]').get(0);
var COLOR_FORMATS = ["hex", "rgb", "hsl", "oklch"];
var num = (n, digits) => String(Number(n.toFixed(digits)));
function formatColor(hex, format) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m)
    return hex;
  const int = parseInt(m[1], 16);
  const [r, g, b] = [int >> 16 & 255, int >> 8 & 255, int & 255];
  switch (format) {
    case "rgb":
      return `rgb(${r} ${g} ${b})`;
    case "hsl": {
      const [rn, gn, bn] = [r / 255, g / 255, b / 255];
      const max = Math.max(rn, gn, bn);
      const min = Math.min(rn, gn, bn);
      const l = (max + min) / 2;
      const d = max - min;
      let h = 0;
      let sat = 0;
      if (d) {
        sat = d / (1 - Math.abs(2 * l - 1));
        h = max === rn ? (gn - bn) / d % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
        h = (h * 60 + 360) % 360;
      }
      return `hsl(${num(h, 1)} ${num(sat * 100, 1)}% ${num(l * 100, 1)}%)`;
    }
    case "oklch": {
      const lin = (c) => {
        const v = c / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      const [lr, lg, lb] = [lin(r), lin(g), lin(b)];
      const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
      const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
      const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
      const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
      const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
      const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
      const C = Math.hypot(A, B);
      if (C < 0.00005)
        return `oklch(${num(L, 4)} 0 0)`;
      const H = (Math.atan2(B, A) * 180 / Math.PI + 360) % 360;
      return `oklch(${num(L, 4)} ${num(C, 4)} ${num(H, 2)})`;
    }
    default:
      return `#${m[1].toLowerCase()}`;
  }
}
var formatOf = (picker) => COLOR_FORMATS.includes(picker.dataset.format) ? picker.dataset.format : "hex";
function syncValue(picker) {
  const input = getInput2(picker);
  if (!input)
    return;
  const format = formatOf(picker);
  const text = formatColor(input.value, format);
  const display = dfDollar5(picker).find(".color-picker-value").get(0);
  if (display && display.textContent !== text)
    display.textContent = text;
  dfDollar5(picker).find("input[data-color-output]").toArray().forEach((out) => {
    if (out.value === text)
      return;
    out.value = text;
    out.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const switcher = dfDollar5(picker).find("select.color-picker-format").get(0);
  if (switcher && switcher.value !== format)
    switcher.value = format;
}
function applyMarkup5(el, config) {
  if (typeof config?.format === "string" && COLOR_FORMATS.includes(config.format) && config.format !== formatOf(el))
    dfDollar5(el).attr("data-format", config.format);
  const input = getInput2(el);
  if (input && typeof config?.value === "string")
    input.value = config.value;
  syncValue(el);
}
function triggerStateChange5(picker, config) {
  if (typeof config?.format === "string" && COLOR_FORMATS.includes(config.format) && config.format !== formatOf(picker)) {
    picker.dataset.format = config.format;
    syncValue(picker);
  }
  const input = getInput2(picker);
  if (!input || config?.value === undefined)
    return;
  input.value = String(config.value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}
var colorPickerApi = componentState5({
  component: "color-picker",
  states: colorPickerStates,
  apply: (picker, state) => triggerStateChange5(picker, state.config),
  read: (picker, state) => {
    const input = getInput2(picker);
    return {
      name: picker.dataset.stateName || "default",
      config: {
        ...state.config,
        value: input ? input.value : "",
        format: formatOf(picker),
        formatted: input ? formatColor(input.value, formatOf(picker)) : ""
      }
    };
  },
  markup: (el, state) => applyMarkup5(el, state.config)
});
df$5.colorPickerApi = colorPickerApi;
df$5.colorPickerStates = colorPickerStates;
function init5() {
  dfDollar5(".color-picker:not([data-init])").toArray().forEach((picker) => {
    picker.dataset.init = "";
    bindComponent5(picker, colorPickerApi);
    const input = dfDollar5(picker).find('input[type="color"]').get(0);
    if (!input)
      return;
    syncValue(picker);
    input.addEventListener("input", () => {
      syncValue(picker);
    });
    dfDollar5(picker).find("select.color-picker-format").get(0)?.addEventListener("change", (e) => {
      picker.dataset.format = e.target.value;
      syncValue(picker);
    });
    new MutationObserver(() => syncValue(picker)).observe(picker, { attributes: true, attributeFilter: ["data-format"] });
  });
}
init5();
new MutationObserver(init5).observe(document, { childList: true, subtree: true });

// dist/components/combobox/combobox.js
var __df$core6 = globalThis.df$;
var __df$shared6 = __df$core6 && __df$core6.shadcn && __df$core6.shadcn.shared;
if (!__df$shared6 || __df$shared6.abi !== "0.9.8") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals6, defussQuery: defussQuery6, safeShowPopover, componentState: componentState6, bindComponent: bindComponent6 } = __df$shared6;
var df$6 = defussGlobals6();
var dfDollar6 = defussQuery6();
var comboboxStates = ["default", "open"];
function applyMarkup6(_el, _stateName) {}
function triggerStateChange6(popover, stateName, _config) {
  switch (stateName) {
    case "default":
      popover._close?.();
      break;
    case "open":
      popover._open?.();
      break;
  }
}
var comboboxApi = componentState6({
  component: "combobox",
  states: comboboxStates,
  apply: (popover, state) => triggerStateChange6(popover, state.name, state.config),
  read: (popover, state) => {
    const selected = Array.from(dfDollar6(popover).find('[role="option"][aria-selected="true"]').toArray());
    const labels = selected.map((o) => o.textContent?.trim() ?? "");
    return {
      name: popover.matches(":popover-open") ? "open" : "default",
      config: {
        ...state.config,
        value: labels.join(", "),
        values: selected.map((o) => o.dataset.value ?? o.textContent?.trim() ?? ""),
        labels
      }
    };
  },
  markup: (el, state) => applyMarkup6(el, state.name)
});
df$6.comboboxApi = comboboxApi;
df$6.comboboxStates = comboboxStates;
var esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var idPart = (t) => t.replace(/[^\w-]/g, "_");
var comboSeq = 0;
function initTags(wrapper) {
  const field = dfDollar6(wrapper).find(".combobox-field").get(0);
  const input = dfDollar6(wrapper).find(".combobox-field-input").get(0);
  const popover = dfDollar6(wrapper).find(".combobox-content").get(0);
  const listbox = dfDollar6(wrapper).find('[role="listbox"]').get(0);
  if (!field || !input || !popover || !listbox)
    return;
  const empty = dfDollar6(wrapper).find(".combobox-empty").get(0);
  const creatable = wrapper.hasAttribute("data-creatable");
  const uid = wrapper.id || popover.id || `dfcb-${++comboSeq}`;
  const options = () => Array.from(dfDollar6(listbox).find('[role="option"]:not(.combobox-create)').toArray());
  const valueOf = (o) => o.dataset.value ?? o.textContent.trim();
  const labelOf = (o) => o.textContent.trim();
  dfDollar6(listbox).attr("aria-multiselectable", "true");
  const anchorId = `--combobox-${uid}`;
  dfDollar6(field).css("anchorName", anchorId);
  dfDollar6(popover).css("positionAnchor", anchorId);
  const tags = document.createElement("span");
  tags.className = "combobox-tags";
  dfDollar6(input).before(tags);
  let createRow = null;
  if (creatable) {
    createRow = document.createElement("div");
    createRow.className = "combobox-item combobox-create";
    createRow.id = `${uid}-create`;
    createRow.setAttribute("role", "option");
    createRow.setAttribute("aria-selected", "false");
    createRow.hidden = true;
    dfDollar6(listbox).append(createRow);
  }
  let highlighted = null;
  const highlight = (el) => {
    if (highlighted)
      dfDollar6(highlighted).data("highlighted", null);
    highlighted = el;
    if (el) {
      dfDollar6(el).data("highlighted", "");
      el.scrollIntoView({ block: "nearest" });
      dfDollar6(input).attr("aria-activedescendant", el.id);
    } else
      dfDollar6(input).attr("aria-activedescendant", null);
  };
  const visible = () => [...options(), ...createRow ? [createRow] : []].filter((o) => !o.hidden && o.getAttribute("aria-disabled") !== "true");
  const isOpen = () => popover.matches(":popover-open");
  const open = () => {
    if (!isOpen())
      safeShowPopover(popover);
    dfDollar6(input).attr("aria-expanded", "true");
  };
  const close = () => {
    if (isOpen())
      popover.hidePopover();
    dfDollar6(input).attr("aria-expanded", "false");
    highlight(null);
  };
  popover._open = () => {
    open();
    filter();
  };
  popover._close = close;
  bindComponent6(popover, comboboxApi);
  const filter = () => {
    const text = input.value.trim();
    const q = text.toLowerCase();
    let exact = null;
    let any = false;
    for (const o of options()) {
      const match = !q || labelOf(o).toLowerCase().includes(q);
      dfDollar6(o).prop("hidden", !match);
      if (match)
        any = true;
      if (q && labelOf(o).toLowerCase() === q)
        exact = o;
    }
    if (createRow) {
      const showCreate = !!text && !exact;
      dfDollar6(createRow).prop("hidden", !showCreate);
      if (showCreate)
        dfDollar6(createRow).text(`Create "${text}"`);
    }
    if (empty)
      dfDollar6(empty).prop("hidden", any || !!createRow && !createRow.hidden);
    highlight(exact ?? (createRow && !createRow.hidden ? createRow : !creatable ? visible()[0] ?? null : null));
  };
  const render = (announce = true, created = null) => {
    const chosen = options().filter((o) => o.getAttribute("aria-selected") === "true");
    const labels = chosen.map(labelOf);
    const values = chosen.map(valueOf);
    const name = wrapper.dataset.name;
    dfDollar6(tags).morph(labels.map((label, i) => `<span class="combobox-tag" id="${uid}-tag-${idPart(values[i])}">${esc(label)}<button type="button" class="combobox-tag-remove" data-value="${esc(values[i])}" aria-label="Remove ${esc(label)}" tabindex="-1"><svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></span>`).join("") + (name ? values.map((v) => `<input type="hidden" name="${esc(name)}" value="${esc(v)}" id="${uid}-input-${idPart(v)}">`).join("") : ""));
    if (input.dataset.placeholder === undefined)
      input.dataset.placeholder = input.placeholder;
    input.placeholder = labels.length ? "" : input.dataset.placeholder;
    if (announce)
      wrapper.dispatchEvent(new CustomEvent("combobox:change", { bubbles: true, detail: { values, labels, created } }));
  };
  const commit = (row) => {
    const text = input.value.trim();
    let created = null;
    if (createRow && row === createRow || !row && creatable && text) {
      if (!text)
        return;
      const exact = options().find((o) => labelOf(o).toLowerCase() === text.toLowerCase());
      if (exact)
        row = exact;
      else {
        const option = document.createElement("div");
        option.className = "combobox-item";
        option.setAttribute("role", "option");
        option.dataset.value = text;
        option.dataset.created = "";
        option.id = `${uid}-opt-${idPart(text)}-${options().length}`;
        dfDollar6(option).text(text);
        if (createRow)
          dfDollar6(createRow).before(option);
        else
          dfDollar6(listbox).append(option);
        row = option;
        created = text;
      }
      dfDollar6(row).attr("aria-selected", "true");
    } else if (row) {
      if (row.getAttribute("aria-disabled") === "true")
        return;
      const on = row.getAttribute("aria-selected") === "true";
      dfDollar6(row).attr("aria-selected", on && !text ? "false" : "true");
    } else
      return;
    dfDollar6(input).val("");
    render(true, created);
    filter();
    input.focus();
  };
  render(false);
  filter();
  field.addEventListener("mousedown", (e) => {
    if (!e.target.closest("button, input")) {
      e.preventDefault();
      input.focus();
    }
  });
  tags.addEventListener("click", (e) => {
    const btn = e.target.closest(".combobox-tag-remove");
    if (!btn)
      return;
    const option = options().find((o) => valueOf(o) === btn.dataset.value);
    if (option)
      dfDollar6(option).attr("aria-selected", "false");
    render();
    filter();
    input.focus();
  });
  input.addEventListener("focus", () => {
    open();
    filter();
  });
  input.addEventListener("input", () => {
    open();
    filter();
  });
  input.addEventListener("keydown", (e) => {
    const rows = visible();
    const at = highlighted ? rows.indexOf(highlighted) : -1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        open();
        highlight(rows[Math.min(at + 1, rows.length - 1)] ?? null);
        break;
      case "ArrowUp":
        e.preventDefault();
        highlight(rows[Math.max(at - 1, 0)] ?? null);
        break;
      case "Enter":
        e.preventDefault();
        commit(highlighted);
        break;
      case ",":
        if (input.value.trim()) {
          e.preventDefault();
          commit(highlighted);
        }
        break;
      case "Backspace": {
        if (input.value !== "")
          break;
        const chosen = options().filter((o) => o.getAttribute("aria-selected") === "true");
        const last = chosen[chosen.length - 1];
        if (!last)
          break;
        e.preventDefault();
        dfDollar6(last).attr("aria-selected", "false");
        render();
        filter();
        break;
      }
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        close();
        break;
    }
  });
  listbox.addEventListener("mousedown", (e) => e.preventDefault());
  listbox.addEventListener("click", (e) => {
    const row = e.target.closest('[role="option"]');
    if (row && !row.hidden)
      commit(row);
  });
  listbox.addEventListener("mousemove", (e) => {
    const row = e.target.closest('[role="option"]');
    if (row && !row.hidden && row !== highlighted)
      highlight(row);
  });
  wrapper.addEventListener("focusout", (e) => {
    if (!wrapper.contains(e.relatedTarget) && !popover.contains(e.relatedTarget))
      close();
  });
  popover.addEventListener("toggle", () => {
    dfDollar6(input).attr("aria-expanded", String(isOpen()));
  });
}
function init6() {
  dfDollar6(".combobox:not([data-init])").toArray().forEach((wrapper) => {
    wrapper.dataset.init = "";
    if (wrapper.hasAttribute("data-tags")) {
      initTags(wrapper);
      return;
    }
    const $wrapper = dfDollar6(wrapper);
    const $trigger = $wrapper.find(".combobox-trigger");
    const $value = $wrapper.find(".combobox-value");
    const $popover = $wrapper.find(".combobox-content");
    const $search = $wrapper.find(".combobox-search-input");
    const $listbox = $wrapper.find('[role="listbox"]');
    const $empty = $wrapper.find(".combobox-empty");
    const trigger = $trigger[0];
    const popover = $popover[0];
    const searchInput = $search[0];
    const listbox = $listbox[0];
    if (!trigger || !popover || !searchInput || !listbox)
      return;
    const allItems = $listbox.find('[role="option"]');
    let highlighted = -1;
    const anchorId = `--combobox-${popover.id}`;
    $trigger.css("anchorName", anchorId);
    $popover.css("positionAnchor", anchorId);
    const placeholder = $value.data("placeholder") ?? "";
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "combobox-clear";
    clearBtn.setAttribute("aria-label", "Clear selection");
    dfDollar6(clearBtn).html('<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>');
    dfDollar6(clearBtn).css("positionAnchor", anchorId);
    $trigger.after(clearBtn);
    const multiple = wrapper.hasAttribute("data-multiple");
    const uid = wrapper.id || popover.id || `dfcb-${++comboSeq}`;
    let tags = null;
    if (multiple) {
      $listbox.attr("aria-multiselectable", "true");
      tags = document.createElement("div");
      tags.className = "combobox-tags";
      tags.setAttribute("role", "list");
      tags.setAttribute("aria-label", `Selected ${trigger.getAttribute("aria-label") || dfDollar6("#" + CSS.escape(trigger.getAttribute("aria-labelledby") || "")).get(0)?.textContent?.trim() || "options"}`);
      dfDollar6(clearBtn).after(tags);
      tags.addEventListener("click", (e) => {
        const btn = e.target.closest(".combobox-tag-remove");
        if (!btn)
          return;
        const option = Array.from(allItems).find((o) => (o.dataset.value ?? o.textContent.trim()) === btn.dataset.value);
        const all = dfDollar6(tags).find(".combobox-tag-remove").toArray();
        const at = all.indexOf(btn);
        if (option)
          dfDollar6(option).attr("aria-selected", "false");
        renderSelection();
        const rest = dfDollar6(tags).find(".combobox-tag-remove").toArray();
        (rest[Math.min(at, rest.length - 1)] ?? trigger).focus();
      });
    }
    const renderSelection = (announce = true) => {
      const chosen = Array.from(allItems).filter((o) => o.getAttribute("aria-selected") === "true");
      const labels = chosen.map((o) => o.textContent.trim());
      const values = chosen.map((o) => o.dataset.value ?? o.textContent.trim());
      const summary = multiple && labels.length > 1 ? ($value.data("selectedLabel") ?? "{n} selected").replace("{n}", String(labels.length)) : labels.join(", ");
      if (labels.length)
        $value.text(summary).attr("data-placeholder", null);
      else
        $value.text(placeholder).attr("data-placeholder", placeholder);
      if (tags) {
        const name = wrapper.dataset.name;
        dfDollar6(tags).morph(labels.map((label, i) => `<span class="combobox-tag" role="listitem" id="${uid}-tag-${idPart(values[i])}">${esc(label)}<button type="button" class="combobox-tag-remove" data-value="${esc(values[i])}" aria-label="Remove ${esc(label)}"><svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></span>`).join("") + (name ? values.map((v) => `<input type="hidden" name="${esc(name)}" value="${esc(v)}" id="${uid}-input-${idPart(v)}">`).join("") : ""));
      }
      if (announce)
        wrapper.dispatchEvent(new CustomEvent("combobox:change", { bubbles: true, detail: { values, labels } }));
    };
    if (multiple)
      renderSelection(false);
    clearBtn.addEventListener("click", () => {
      allItems.attr("aria-selected", "false");
      renderSelection();
      trigger.focus();
    });
    const getVisibleItems = () => allItems.filter((item) => !item.hidden && item.getAttribute("aria-disabled") !== "true");
    const open = () => {
      safeShowPopover(popover);
      $trigger.attr("aria-expanded", "true");
      $search.val("");
      filter("");
      searchInput.focus();
    };
    const close = () => {
      popover.hidePopover();
      $trigger.attr("aria-expanded", "false");
      $search.attr("aria-activedescendant", "");
      clearHighlight();
      trigger.focus();
    };
    popover._open = open;
    popover._close = close;
    bindComponent6(popover, comboboxApi);
    const isOpen = () => popover.matches(":popover-open");
    const filter = (query) => {
      const q = query.toLowerCase();
      let hasVisible = false;
      allItems.forEach((item) => {
        const match = !q || item.textContent.trim().toLowerCase().includes(q);
        dfDollar6(item).prop("hidden", !match);
        if (match)
          hasVisible = true;
      });
      $listbox.find(".combobox-group-label").each(function() {
        const label = this;
        let next = label.nextElementSibling;
        let groupHasVisible = false;
        while (next && !next.classList.contains("combobox-group-label") && !next.classList.contains("combobox-separator")) {
          if (next.getAttribute("role") === "option" && !next.hidden)
            groupHasVisible = true;
          next = next.nextElementSibling;
        }
        dfDollar6(label).prop("hidden", !groupHasVisible);
      });
      $listbox.find(".combobox-separator").each(function() {
        const sep = this;
        const prev = sep.previousElementSibling;
        const next = sep.nextElementSibling;
        dfDollar6(sep).prop("hidden", Boolean(prev && prev.hidden || next && next.hidden));
      });
      if ($empty.length)
        $empty.prop("hidden", hasVisible);
    };
    const clearHighlight = () => {
      allItems.data("highlighted", null);
      highlighted = -1;
    };
    const doHighlight = (index) => {
      const items = getVisibleItems();
      clearHighlight();
      if (index < 0 || index >= items.length)
        return;
      highlighted = index;
      dfDollar6(items[index]).data("highlighted", "");
      items[index].scrollIntoView({ block: "nearest" });
      $search.attr("aria-activedescendant", items[index].id);
    };
    const selectItem = (item) => {
      if (item.getAttribute("aria-disabled") === "true")
        return;
      if (multiple) {
        dfDollar6(item).attr("aria-selected", item.getAttribute("aria-selected") === "true" ? "false" : "true");
        renderSelection();
        searchInput.focus();
        return;
      }
      allItems.attr("aria-selected", "false");
      dfDollar6(item).attr("aria-selected", "true");
      renderSelection();
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
        case "Backspace": {
          if (!multiple || searchInput.value !== "")
            break;
          const chosen = Array.from(allItems).filter((o) => o.getAttribute("aria-selected") === "true");
          const last = chosen[chosen.length - 1];
          if (!last)
            break;
          e.preventDefault();
          dfDollar6(last).attr("aria-selected", "false");
          renderSelection();
          break;
        }
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
    popover.addEventListener("toggle", () => {
      const nowOpen = popover.matches(":popover-open");
      $trigger.attr("aria-expanded", String(nowOpen));
      if (!nowOpen)
        clearHighlight();
    });
  });
}
init6();
new MutationObserver(init6).observe(document, { childList: true, subtree: true });

// dist/components/search-filter/search-filter.js
var __df$core7 = globalThis.df$;
var __df$shared7 = __df$core7 && __df$core7.shadcn && __df$core7.shadcn.shared;
if (!__df$shared7 || __df$shared7.abi !== "0.9.8") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals7, defussQuery: defussQuery7, componentState: componentState7, bindComponent: bindComponent7 } = __df$shared7;
var df$7 = defussGlobals7();
var dfDollar7 = defussQuery7();
var searchFilterStates = ["default", "filled", "searching"];
function setValue(box, value) {
  const field = box._field;
  if (field.value === value)
    return;
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
}
function applyMarkup7(el, stateName) {
  const field = dfDollar7(el).children("input");
  if (!field.attr("enterkeyhint"))
    field.attr("enterkeyhint", "search");
  field.attr("aria-busy", stateName === "searching" ? "true" : null);
}
function triggerStateChange7(box, stateName, config) {
  const field = box._field;
  const value = typeof config.value === "string" ? config.value : undefined;
  if (stateName === "searching")
    field.setAttribute("aria-busy", "true");
  else
    field.removeAttribute("aria-busy");
  switch (stateName) {
    case "default":
      setValue(box, value ?? "");
      break;
    case "filled":
    case "searching":
      if (value !== undefined)
        setValue(box, value);
      break;
  }
}
var searchFilterApi = componentState7({
  component: "search-filter",
  states: searchFilterStates,
  apply: (box, state) => {
    box.dataset.stateName = state.name;
    triggerStateChange7(box, state.name, state.config);
  },
  markup: (el, state) => applyMarkup7(el, state.name)
});
df$7.searchFilterApi = searchFilterApi;
df$7.searchFilterStates = searchFilterStates;
function clear(box) {
  searchFilterApi.setState(box, "default", {});
  box._field.focus();
  box.dispatchEvent(new CustomEvent("search-clear", { bubbles: true }));
}
function init7() {
  dfDollar7(".search-box:not([data-init])").toArray().forEach((box) => {
    box.dataset.init = "";
    const field = dfDollar7(box).find(":scope > input").get(0);
    if (!field)
      return;
    box._field = field;
    if (!field.getAttribute("enterkeyhint"))
      field.setAttribute("enterkeyhint", "search");
    field.addEventListener("input", () => {
      const name = box.dataset.stateName;
      if (field.value === "") {
        if (name !== "default")
          searchFilterApi.setState(box, "default", {});
      } else if (name !== "searching" && name !== "filled") {
        searchFilterApi.setState(box, "filled", {});
      }
    });
    field.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && field.value !== "") {
        e.preventDefault();
        e.stopPropagation();
        clear(box);
      }
    });
    dfDollar7(box).find(":scope > .search-box-clear").get(0)?.addEventListener("click", () => clear(box));
    box.addEventListener("mousedown", (e) => {
      if (e.target !== field && !e.target.closest("button, a")) {
        e.preventDefault();
        field.focus();
      }
    });
    bindComponent7(box, searchFilterApi);
    searchFilterApi.setState(box, field.value === "" ? "default" : "filled", {});
  });
}
init7();
new MutationObserver(init7).observe(document, { childList: true, subtree: true });

//# debugId=7FC3B262CC72A03F64756E2164756E21
//# sourceMappingURL=forms-inputs.js.map
