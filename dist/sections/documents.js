// dist/components/invoice/invoice.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.9.10") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals, defussQuery, componentState, bindComponent } = __df$shared;
var df$ = defussGlobals();
var dfDollar = defussQuery();
var invoiceStates = ["default"];
var LABELS = {
  de: { net: "Summe netto", tax: "zzgl. {rate} USt auf {base}", total: "Rechnungsbetrag" },
  en: { net: "Subtotal", tax: "Tax {rate} on {base}", total: "Total" }
};
var pow10 = (k) => 10n ** BigInt(k);
function dec(value) {
  const m = /^\s*([+-]?)(\d*)(?:\.(\d+))?\s*$/.exec(String(value ?? ""));
  if (!m || !m[2] && !m[3])
    return null;
  const frac = m[3] ?? "";
  return { n: BigInt((m[2] || "0") + frac) * (m[1] === "-" ? -1n : 1n), s: frac.length };
}
function round(n, from, to) {
  if (from <= to)
    return n * pow10(to - from);
  const d = pow10(from - to);
  const q = n / d;
  const r = n % d;
  return 2n * (r < 0n ? -r : r) >= d ? q + (n < 0n ? -1n : 1n) : q;
}
function str(n, s) {
  const neg = n < 0n;
  const digits = (neg ? -n : n).toString().padStart(s + 1, "0");
  const body = s ? `${digits.slice(0, -s)}.${digits.slice(-s)}` : digits;
  return neg ? `-${body}` : body;
}
var minorDigits = (currency) => new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
function need(value, field, index) {
  const d = dec(value);
  if (!d)
    throw new RangeError(`line ${index + 1}: ${field} "${value}" is no number (write a decimal with a dot)`);
  return d;
}
function compute(lines, currency = "EUR") {
  const digits = minorDigits(currency);
  const amounts = [];
  const bases = new Map;
  for (const [i, line] of lines.entries()) {
    const q = need(line.quantity, "quantity", i);
    const p = need(line.price, "price", i);
    const amount = round(q.n * p.n, q.s + p.s, digits);
    amounts.push(amount);
    const rate = need(line.vat, "vat", i);
    const key = str(rate.n, rate.s);
    const entry = bases.get(key) ?? { rate, base: 0n };
    entry.base += amount;
    bases.set(key, entry);
  }
  const net = amounts.reduce((a, b) => a + b, 0n);
  const taxes = [];
  let tax = 0n;
  for (const [key, { rate, base }] of bases) {
    if (rate.n === 0n)
      continue;
    const t = round(base * rate.n, digits + rate.s + 2, digits);
    tax += t;
    taxes.push({ rate: key, base: str(base, digits), tax: str(t, digits) });
  }
  return {
    currency,
    digits,
    lines: amounts.map((a) => str(a, digits)),
    net: str(net, digits),
    taxes,
    total: str(net + tax, digits)
  };
}
function ibanOf(value) {
  const v = value.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(v))
    return null;
  const digits = (v.slice(4) + v.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  return BigInt(digits) % 97n === 1n ? v : null;
}
function textElement(value, field, max) {
  const v = String(value ?? "").trim();
  if (/[\r\n]/.test(v))
    throw new RangeError(`payment code: the ${field} holds a line break`);
  const length = [...v].length;
  if (length > max)
    throw new RangeError(`payment code: the ${field} has ${length} characters, at most ${max}`);
  return v;
}
function epc(transfer) {
  const iban = ibanOf(String(transfer.iban ?? ""));
  if (!iban)
    throw new RangeError(`payment code: IBAN "${transfer.iban}" is no IBAN (its form or its check digits)`);
  const bic = String(transfer.bic ?? "").replace(/\s+/g, "").toUpperCase();
  if (bic && !/^[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/.test(bic))
    throw new RangeError(`payment code: BIC "${transfer.bic}" is no BIC (8 or 11 characters)`);
  const name = textElement(transfer.name, "name", 70);
  if (!name)
    throw new RangeError("payment code: the beneficiary name is missing");
  const a = dec(transfer.amount);
  if (!a || a.s > 2 && a.n % pow10(a.s - 2) !== 0n)
    throw new RangeError(`payment code: amount "${transfer.amount}" is no amount in euro (a decimal with a dot, two decimals at most)`);
  const cents = round(a.n, a.s, 2);
  if (cents < 1n || cents > 99999999999n)
    throw new RangeError(`payment code: amount ${str(cents, 2)} is outside 0.01 to 999999999.99 euro`);
  const remittance = textElement(transfer.remittance, "remittance", 140);
  const lines = ["BCD", "002", "1", "SCT", bic, name, iban, `EUR${str(cents, 2)}`, "", "", remittance];
  while (lines[lines.length - 1] === "")
    lines.pop();
  const text = lines.join(`
`);
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > 331)
    throw new RangeError(`payment code: ${bytes} bytes, at most 331`);
  return text;
}
function paymentOf(el, totals, currency) {
  const $el = dfDollar(el);
  const none = (error, authored = false) => ({ text: "", error, authored });
  if ($el.attr("data-iban") == null)
    return none("");
  if (!totals)
    return none("payment code: no totals");
  if (currency !== "EUR")
    return none(`payment code: a SEPA credit transfer is in euro, the invoice in ${currency}`);
  if (dec(totals.total).n <= 0n)
    return none("payment code: nothing is due");
  try {
    const text = epc({
      iban: String($el.attr("data-iban")),
      bic: $el.attr("data-bic") ?? "",
      name: $el.attr("data-payee") ?? "",
      amount: totals.total,
      remittance: $el.attr("data-remittance") ?? ""
    });
    return { text, error: "", authored: false };
  } catch (e) {
    return none(e instanceof Error ? e.message : String(e), true);
  }
}
var rowsOf = (root) => dfDollar(root).find(".invoice-items > tbody > tr").toArray().filter((tr) => dfDollar(tr).attr("data-price") != null);
var lineOf = (tr) => ({
  quantity: dfDollar(tr).attr("data-quantity") ?? "1",
  price: dfDollar(tr).attr("data-price") ?? "0",
  vat: dfDollar(tr).attr("data-vat") ?? "0"
});
function settingsOf(el, state) {
  const lang = dfDollar(el).closest("[lang]").attr("lang");
  return {
    locale: String(state?.config?.locale || dfDollar(el).attr("data-locale") || lang || "en-US"),
    currency: String(state?.config?.currency || dfDollar(el).attr("data-currency") || "EUR").toUpperCase()
  };
}
var labelsFor = (locale) => LABELS[locale.toLowerCase().split("-")[0]] ?? LABELS.en;
var esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function applyMarkup(el, state) {
  const { locale, currency } = settingsOf(el, state);
  const rows = rowsOf(el);
  let totals = null;
  let error = "";
  try {
    totals = compute(rows.map(lineOf), currency);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  const digits = minorDigits(currency);
  const money = (d) => new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: d, maximumFractionDigits: d });
  const amount = money(digits);
  const quantity = new Intl.NumberFormat(locale, { maximumFractionDigits: 3 });
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 3 });
  const whole = new Intl.NumberFormat(locale);
  dfDollar(el).attr("data-locale", locale).attr("data-currency", currency);
  rows.forEach((tr, i) => {
    const line = lineOf(tr);
    const [q, p, v] = [dec(line.quantity), dec(line.price), dec(line.vat)];
    dfDollar(tr).attr("data-invalid", q && p && v ? null : "");
    const priceDigits = Math.min(Math.max(digits, p?.s ?? 0), 6);
    const cell = (role, text) => dfDollar(tr).children(`[data-invoice="${role}"]`).text(text);
    cell("position", whole.format(i + 1));
    cell("quantity", q ? quantity.format(Number(line.quantity)) : "");
    cell("price", p ? money(priceDigits).format(Number(line.price)) : "");
    cell("vat", v ? percent.format(Number(line.vat) / 100) : "");
    cell("amount", totals ? amount.format(Number(totals.lines[i])) : "");
  });
  const words = labelsFor(locale);
  const row = (cls, label, value, rate) => `<tr class="${cls}"${rate ? ` data-rate="${esc(rate)}"` : ""}><th scope="row">${esc(label)}</th><td>${esc(value)}</td></tr>`;
  const markup = totals ? row("invoice-net", words.net, amount.format(Number(totals.net))) + totals.taxes.map((t) => row("invoice-tax", words.tax.replace("{rate}", percent.format(Number(t.rate) / 100)).replace("{base}", amount.format(Number(t.base))), amount.format(Number(t.tax)), t.rate)).join("") + row("invoice-total", words.total, amount.format(Number(totals.total))) : row("invoice-error", error, "");
  const payment = paymentOf(el, totals, currency);
  dfDollar(el).find(".invoice-payment > .qr-code").each((_i, code) => {
    dfDollar(code).attr("data-ecc", "M").attr("data-value", payment.text).attr("hidden", payment.text ? null : "");
  });
  const reason = payment.authored ? row("invoice-error", payment.error, "") : "";
  dfDollar(el).find(".invoice-totals").html(`<tbody>${markup}${reason}</tbody>`);
  return { totals, error, payment: payment.text, paymentError: payment.error };
}
function triggerStateChange(el, state) {
  const { totals, error, payment, paymentError } = applyMarkup(el, state);
  el._totals = totals;
  el.dispatchEvent(new CustomEvent("invoice-totals", {
    bubbles: true,
    detail: { locale: String(dfDollar(el).attr("data-locale")), totals, error, payment, paymentError }
  }));
}
var invoiceApi = componentState({
  component: "invoice",
  states: invoiceStates,
  mergeConfig: true,
  apply: (el, state) => triggerStateChange(el, state),
  read: (el, state) => ({
    name: "default",
    config: {
      ...state.config,
      locale: dfDollar(el).attr("data-locale"),
      currency: dfDollar(el).attr("data-currency")
    }
  }),
  markup: (el, state) => {
    applyMarkup(el, state);
  }
});
df$.invoiceApi = invoiceApi;
df$.invoiceStates = invoiceStates;
var resolve = (target) => typeof target === "string" ? dfDollar(target).get(0) : target;
df$.invoice = {
  compute: (lines, currency) => compute(lines, currency),
  epc: (transfer) => epc(transfer),
  totals: (target) => resolve(target)?._totals ? structuredClone(resolve(target)._totals) : null,
  labels: (lang, labels) => {
    const key = lang.toLowerCase().split("-")[0];
    LABELS[key] = { ...LABELS[key] ?? LABELS.en, ...labels };
    dfDollar(".invoice[data-init]").each((_i, el) => {
      if (String(dfDollar(el).attr("data-locale")).toLowerCase().split("-")[0] === key)
        el.api.setState("default");
    });
  }
};
function init() {
  dfDollar(".invoice:not([data-init])").each((_i, el) => {
    dfDollar(el).data("init", "");
    bindComponent(el, invoiceApi, { name: "default", config: settingsOf(el, null) });
    triggerStateChange(el, el.store.value);
    new MutationObserver(() => el.isConnected && el.api.setState("default")).observe(el, {
      attributes: true,
      attributeFilter: ["data-iban", "data-bic", "data-payee", "data-remittance"]
    });
    const tbody = dfDollar(el).find(".invoice-items > tbody").get(0);
    if (tbody) {
      new MutationObserver((records) => {
        const lines = records.some((r) => r.type === "childList" && r.target === tbody || r.type === "attributes" && r.target !== tbody);
        if (lines && el.isConnected)
          el.api.setState("default");
      }).observe(tbody, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-quantity", "data-price", "data-vat"]
      });
    }
  });
}
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

//# debugId=622B4675EF8E960A64756E2164756E21
//# sourceMappingURL=documents.js.map
