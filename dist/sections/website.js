// dist/components/product-showcase/product-showcase.js
var __df$core = globalThis.df$;
var __df$shared = __df$core && __df$core.shadcn && __df$core.shadcn.shared;
if (!__df$shared || __df$shared.abi !== "0.9.6") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals, defussQuery, componentState, bindComponent } = __df$shared;
var df$ = defussGlobals();
var dfDollar = defussQuery();
var productShowcaseStates = ["default", "playing"];
function applyMarkup(el, stateName) {
  dfDollar(el).attr("data-state", stateName === "playing" ? "playing" : "default");
}
function triggerStateChange(showcase, stateName, _config) {
  const video = dfDollar(showcase).find("video").get(0);
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
var productShowcaseApi = componentState({
  component: "product-showcase",
  states: productShowcaseStates,
  apply: (showcase, state) => triggerStateChange(showcase, state.name, state.config),
  read: (showcase, state) => {
    const playing = showcase.dataset.state === "playing";
    return {
      name: showcase.dataset.stateName || (playing ? "playing" : "default"),
      config: state.config
    };
  },
  markup: (el, state) => applyMarkup(el, state.name)
});
df$.productShowcaseApi = productShowcaseApi;
df$.productShowcaseStates = productShowcaseStates;
function init() {
  dfDollar(".mk-showcase:not([data-init])").toArray().forEach((showcase) => {
    showcase.dataset.init = "";
    showcase.dataset.state = "default";
    bindComponent(showcase, productShowcaseApi);
    dfDollar(showcase).find(".mk-showcase-play").get(0)?.addEventListener("click", () => {
      productShowcaseApi.setState(showcase, "playing");
    });
    dfDollar(showcase).find("video").get(0)?.addEventListener("pause", () => {
      if (showcase.dataset.state === "playing")
        productShowcaseApi.setState(showcase, "default");
    });
  });
}
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

// dist/components/cookie-consent/cookie-consent.js
var __df$core2 = globalThis.df$;
var __df$shared2 = __df$core2 && __df$core2.shadcn && __df$core2.shadcn.shared;
if (!__df$shared2 || __df$shared2.abi !== "0.9.6") {
  throw new Error("defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone");
}
var { defussGlobals: defussGlobals2, defussQuery: defussQuery2, componentState: componentState2, bindComponent: bindComponent2, unbindComponent, persisted, reload, forget, persistOk } = __df$shared2;
var df$2 = defussGlobals2();
var q = defussQuery2();
var cookieConsentStates = ["default", "open", "preferences", "services"];
var builtInLanguages = ["en", "de"];
var categories = ["essential", "functional", "marketing", "other"];
var translations = {
  en: {
    title: "Your privacy choices",
    text: "Essential services are always enabled. Choose whether to allow optional services. You can change or withdraw your choices at any time in Privacy settings.",
    settings: "Privacy settings",
    close: "Close without saving",
    language: "Language",
    preferences: "Privacy preferences",
    preferencesText: "Choose categories or individual services. Changes apply when you save.",
    categories: "Categories",
    services: "Services",
    acceptAll: "Accept all",
    denyAll: "Reject optional",
    save: "Save preferences",
    required: "Required",
    privacyPolicy: "Privacy policy",
    legalNotice: "Legal notice",
    moreInformation: "More information",
    blocked: "is blocked until you allow this service.",
    activate: "Allow this service",
    thirdParty: "Third-party cookies cannot be removed by this site. Use your browser settings to remove them.",
    storageError: "Your choice applies to this page, but could not be saved for your next visit.",
    categoryNames: { essential: "Essential", functional: "Functional", marketing: "Marketing", other: "Other" },
    categoryDescriptions: {
      essential: "Required for the basic functions of this website.",
      functional: "Optional features and measurement of website use.",
      marketing: "Advertising, targeting, and campaign measurement.",
      other: "Additional optional data processing services."
    }
  },
  de: {
    title: "Ihre Datenschutz-Auswahl",
    text: "Notwendige Dienste sind immer aktiv. Entscheiden Sie, welche optionalen Dienste Sie erlauben. Ihre Auswahl können Sie jederzeit in den Datenschutz-Einstellungen ändern oder widerrufen.",
    settings: "Datenschutz-Einstellungen",
    close: "Ohne Speichern schließen",
    language: "Sprache",
    preferences: "Datenschutz-Einstellungen",
    preferencesText: "Wählen Sie Kategorien oder einzelne Dienste. Änderungen gelten erst nach dem Speichern.",
    categories: "Kategorien",
    services: "Dienste",
    acceptAll: "Alle akzeptieren",
    denyAll: "Optionale ablehnen",
    save: "Auswahl speichern",
    required: "Notwendig",
    privacyPolicy: "Datenschutzerklärung",
    legalNotice: "Impressum",
    moreInformation: "Mehr Informationen",
    blocked: "ist gesperrt, bis Sie diesen Dienst erlauben.",
    activate: "Diesen Dienst erlauben",
    thirdParty: "Cookies von Drittanbietern kann diese Website nicht löschen. Entfernen Sie diese in Ihren Browser-Einstellungen.",
    storageError: "Ihre Auswahl gilt für diese Seite, konnte aber nicht für Ihren nächsten Besuch gespeichert werden.",
    categoryNames: { essential: "Notwendig", functional: "Funktional", marketing: "Marketing", other: "Sonstige" },
    categoryDescriptions: {
      essential: "Für die grundlegenden Funktionen dieser Website erforderlich.",
      functional: "Optionale Funktionen und Messung der Website-Nutzung.",
      marketing: "Werbung, Targeting und Kampagnenmessung.",
      other: "Zusätzliche optionale Dienste zur Datenverarbeitung."
    }
  }
};
var controllers = new Map;
var resourceOwners = new WeakMap;
var executedScripts = new WeakSet;
var uid = 0;
function localize(value, language) {
  if (typeof value === "string")
    return value;
  return value?.[language] ?? value?.en ?? Object.values(value ?? {}).find((v) => typeof v === "string") ?? "";
}
function languagesOf(config) {
  return [...new Set([...builtInLanguages, ...Object.keys(config.translations ?? {})])];
}
var LANGUAGE = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/;
function languageName(code) {
  try {
    const name = new Intl.DisplayNames([code], { type: "language" }).of(code);
    return name ? name.charAt(0).toLocaleUpperCase(code) + name.slice(1) : code;
  } catch {
    return code;
  }
}
function escape(value) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function safeUrl(value, doc) {
  if (!value)
    return;
  try {
    const url = new URL(value, doc.baseURI);
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return;
  }
}
function validateConfig(config) {
  if (!config || !Array.isArray(config.cookieOrigins))
    throw new TypeError("cookie-consent: cookieOrigins must be an array");
  const ids = new Set;
  for (const origin of config.cookieOrigins) {
    if (!origin || !/^[a-zA-Z][\w-]*$/.test(origin.id) || ids.has(origin.id))
      throw new TypeError("cookie-consent: service IDs must be unique and match [a-zA-Z][\\w-]*");
    if (typeof origin.name !== "string" || !origin.name.trim() || !categories.includes(origin.category) || !(typeof origin.description === "string" || origin.description && typeof origin.description === "object")) {
      throw new TypeError(`cookie-consent: invalid service ${origin.id}`);
    }
    if (origin.cookies?.some((cookie) => !/^[!#$%&'*+.^_`|~0-9a-zA-Z-]+$/.test(typeof cookie === "string" ? cookie : cookie.name) || typeof cookie !== "string" && /[;\r\n]/.test(`${cookie.path ?? ""}${cookie.domain ?? ""}`))) {
      throw new TypeError(`cookie-consent: invalid cookie descriptor for ${origin.id}`);
    }
    ids.add(origin.id);
  }
  for (const code of Object.keys(config.translations ?? {})) {
    if (!LANGUAGE.test(code))
      throw new TypeError(`cookie-consent: invalid language code ${code}`);
  }
  if (config.defaultLanguage !== undefined && !languagesOf(config).includes(config.defaultLanguage)) {
    throw new TypeError(`cookie-consent: unsupported language ${config.defaultLanguage} - add its texts to translations`);
  }
  if (config.revision !== undefined && (typeof config.revision !== "string" || !config.revision))
    throw new TypeError("cookie-consent: revision must be a nonempty string");
  if (config.maxAgeDays !== undefined && (!Number.isFinite(config.maxAgeDays) || config.maxAgeDays <= 0))
    throw new TypeError("cookie-consent: maxAgeDays must be positive");
}

class Controller {
  root;
  config;
  dialog;
  doc;
  scope;
  key;
  revision;
  storage;
  saved;
  gates = new Map;
  off = [];
  id;
  observer;
  state;
  draft = new Set;
  view = "default";
  trigger = null;
  destroyed = false;
  storageFailed = false;
  constructor(root, config) {
    validateConfig(config);
    this.root = root;
    this.config = { ...config, cookieOrigins: config.cookieOrigins.map((origin) => ({ ...origin })) };
    this.doc = root.ownerDocument;
    this.scope = config.resourceRoot ?? this.doc;
    this.id = root.id || `cookie-consent-${++uid}`;
    if (!/^[a-zA-Z][\w-]*$/.test(this.id))
      throw new TypeError("cookie-consent: host ID must match [a-zA-Z][\\w-]*");
    this.key = config.storageKey ?? `defuss-shadcn:${this.id}`;
    this.revision = config.revision ?? "1";
    let storage = config.storage;
    if (storage === undefined) {
      try {
        storage = this.doc.defaultView?.localStorage ?? null;
      } catch {
        storage = null;
      }
    }
    this.storage = storage;
    this.saved = storage ? persisted(this.key, null, {
      storage,
      validate: (v) => v === null || typeof v === "object" && !Array.isArray(v),
      onError: () => {
        this.storageFailed = true;
      }
    }) : null;
    this.state = this.readStored();
    this.draft = new Set(this.state.acceptedServices);
    const authoredView = q(root).attr("data-state-name");
    q(root).attr("id", this.id).attr("data-init", "").attr("data-cookie-consent-ready", "");
    q(root).append(`<dialog class="dialog cookie-consent-dialog" data-init data-ce-chrome aria-labelledby="${this.id}-title" aria-describedby="${this.id}-description"><div class="dialog-content cookie-consent-content"></div></dialog>`);
    this.dialog = q(".cookie-consent-dialog", root)[0];
    controllers.set(root, this);
    bindComponent2(root, cookieConsentApi);
    root.api = this;
    this.repaint();
    this.listen(root, "click", (event) => this.onClick(event));
    this.listen(root, "change", (event) => this.onChange(event));
    this.listen(this.dialog, "cancel", () => this.close());
    this.listen(this.dialog, "close", () => {
      if (!this.dialog.open)
        this.finishClose();
    });
    this.listen(this.doc, "click", (event) => {
      const target = event.target instanceof Element ? q(event.target).closest("[data-cookie-consent-open]")[0] : undefined;
      if (target && q(target).attr("data-cookie-consent-open") === this.id) {
        this.trigger = target;
        this.open();
      }
    });
    if (this.doc.defaultView)
      this.listen(this.doc.defaultView, "storage", (event) => {
        const e = event;
        if ((e.key === this.key || e.key === null) && e.storageArea === this.storage) {
          const previous = this.state;
          if (this.saved)
            reload(this.saved);
          this.state = this.readStored();
          this.draft = new Set(this.state.acceptedServices);
          this.revoke(previous);
          this.updateTagsActivation();
          this.repaint();
          this.emit("storage");
          if (!this.state.decisionMade && this.config.autoShow !== false)
            this.open();
        }
      });
    this.observer = new MutationObserver(() => this.updateTagsActivation());
    this.observer.observe(this.scope, { childList: true, subtree: true });
    controllers.set(root, this);
    this.updateTagsActivation();
    if (authoredView && authoredView !== "default" && cookieConsentStates.includes(authoredView))
      this.setState(authoredView);
    else if (!this.state.decisionMade && config.autoShow !== false)
      this.setState("open");
  }
  listen(target, type, handler) {
    q(target).on(type, handler, { capture: true });
    this.off.push(() => q(target).off(type, handler));
  }
  assertAlive() {
    if (this.destroyed)
      throw new Error("cookie-consent: instance was destroyed");
  }
  origin(id) {
    const origin = this.config.cookieOrigins.find((service) => service.id === id);
    if (!origin)
      throw new Error(`cookie-consent: unknown service ${id}`);
    return origin;
  }
  normalize(ids) {
    const selected = new Set(ids);
    return this.config.cookieOrigins.filter((service) => service.category === "essential" || !service.disabled && selected.has(service.id)).map((service) => service.id).sort();
  }
  makeState(ids, decisionMade = false, updatedAt = null, language = this.config.defaultLanguage ?? "en") {
    const acceptedServices = this.normalize(ids);
    const optional = this.config.cookieOrigins.filter((s) => s.category !== "essential" && !s.disabled);
    return {
      revision: this.revision,
      decisionMade,
      language,
      acceptedServices,
      updatedAt,
      acceptedCategories: categories.filter((category) => category === "essential" || (() => {
        const services = this.config.cookieOrigins.filter((s) => s.category === category && !s.disabled);
        return services.length > 0 && services.every((s) => acceptedServices.includes(s.id));
      })()),
      acceptAll: decisionMade && optional.length > 0 && optional.every((s) => acceptedServices.includes(s.id)),
      denyAll: decisionMade && optional.every((s) => !acceptedServices.includes(s.id))
    };
  }
  readStored() {
    const fallback = this.makeState([]);
    const s = this.saved?.value;
    if (!s)
      return fallback;
    const age = Date.now() - (s.updatedAt ?? 0);
    if (s.schemaVersion !== 1 || s.revision !== this.revision || s.decisionMade !== true || !languagesOf(this.config).includes(s.language ?? "") || !Array.isArray(s.acceptedServices) || !s.acceptedServices.every((id) => typeof id === "string") || typeof s.updatedAt !== "number" || !Number.isFinite(s.updatedAt) || age < 0 || age > (this.config.maxAgeDays ?? 180) * 86400000)
      return fallback;
    return this.makeState(s.acceptedServices, true, s.updatedAt, s.language);
  }
  persist() {
    if (!this.saved) {
      this.storageFailed = this.config.storage !== null;
      return;
    }
    const { revision, decisionMade, language, acceptedServices, updatedAt } = this.state;
    this.storageFailed = false;
    this.saved.set({ schemaVersion: 1, revision, decisionMade, language, acceptedServices: [...acceptedServices], updatedAt });
    this.storageFailed ||= !persistOk(this.saved);
  }
  getConsent() {
    return { ...this.state, acceptedServices: [...this.state.acceptedServices], acceptedCategories: [...this.state.acceptedCategories] };
  }
  getDraft() {
    return [...this.draft].sort();
  }
  isServiceAccepted(id) {
    this.origin(id);
    return this.state.acceptedServices.includes(id);
  }
  getState() {
    return cookieConsentApi.getState(this.root);
  }
  viewState() {
    return { name: this.dialog.open ? this.view : "default", config: { language: this.state.language } };
  }
  render(state) {
    return cookieConsentApi.render(state ?? this.getState());
  }
  setState(name, config = {}) {
    cookieConsentApi.setState(this.root, name, config);
  }
  applyView(name, config = {}) {
    this.assertAlive();
    if (!cookieConsentStates.includes(name))
      throw new Error(`cookie-consent: unknown state "${name}"`);
    if (config.language)
      this.setLanguage(config.language);
    if (name === "default") {
      this.close();
      return;
    }
    if (!this.dialog.open) {
      this.draft = new Set(this.state.acceptedServices);
      this.trigger ??= this.doc.activeElement instanceof HTMLElement ? this.doc.activeElement : null;
    }
    this.view = name;
    q(this.root).attr("data-state-name", name);
    this.repaint();
    const modal = !(this.isBanner() && name === "open");
    if (this.dialog.open && this.dialog.matches(":modal") !== modal)
      this.dialog.close();
    if (!this.dialog.open) {
      if (modal)
        this.dialog.showModal();
      else
        this.dialog.show();
    }
  }
  isBanner() {
    return q(this.root).attr("data-variant") === "banner";
  }
  open() {
    this.setState("preferences");
  }
  close() {
    this.assertAlive();
    if (this.dialog.open)
      this.dialog.close();
    this.finishClose();
  }
  finishClose() {
    this.view = "default";
    this.draft = new Set(this.state.acceptedServices);
    q(this.root).attr("data-state-name", "default");
    if (this.trigger?.isConnected)
      this.trigger.focus();
    this.trigger = null;
  }
  setLanguage(language) {
    this.assertAlive();
    if (!languagesOf(this.config).includes(language))
      throw new Error(`cookie-consent: unsupported language ${language}`);
    this.state.language = language;
    if (this.state.decisionMade)
      this.persist();
    this.repaint();
    this.refreshOverlays();
  }
  commit(ids, reason, close = true) {
    this.assertAlive();
    const previous = this.state;
    this.state = this.makeState(ids, true, Date.now(), previous.language);
    this.draft = new Set(this.state.acceptedServices);
    this.persist();
    this.revoke(previous);
    this.updateTagsActivation();
    this.repaint();
    if (close)
      this.close();
    this.emit(reason);
  }
  acceptAll() {
    this.commit(this.config.cookieOrigins.filter((s) => !s.disabled).map((s) => s.id), "accept");
  }
  denyAll() {
    this.commit([], "deny");
  }
  save() {
    this.commit(this.draft, "save");
  }
  acceptService(id) {
    const origin = this.origin(id);
    if (origin.disabled && origin.category !== "essential")
      throw new Error(`cookie-consent: service ${id} is disabled`);
    this.commit([...this.state.acceptedServices, id], "service", false);
  }
  revokeService(id) {
    if (this.origin(id).category === "essential")
      throw new Error("cookie-consent: essential services cannot be revoked");
    this.commit(this.state.acceptedServices.filter((s) => s !== id), "service", false);
  }
  reset() {
    this.assertAlive();
    if (this.saved) {
      this.saved.set(null);
      if (!forget(this.saved))
        this.storageFailed = true;
    }
    const previous = this.state;
    this.state = this.makeState([], false, null, previous.language);
    this.draft = new Set(this.state.acceptedServices);
    this.revoke(previous);
    this.updateTagsActivation();
    this.setState("open");
    this.emit("reset");
  }
  error(kind, error) {
    this.root.dispatchEvent(new CustomEvent("cookie-consent:error", { bubbles: true, detail: { kind, error } }));
  }
  emit(reason) {
    this.root.dispatchEvent(new CustomEvent("cookie-consent:change", { bubbles: true, detail: { state: this.getConsent(), reason } }));
    try {
      this.config.onChange?.(this.getConsent(), reason);
    } catch (error) {
      this.error("callback", error);
    }
    const callback = reason === "accept" ? this.config.onAccept : reason === "deny" ? this.config.onDeny : undefined;
    try {
      callback?.(this.getConsent());
    } catch (error) {
      this.error("callback", error);
    }
    if (this.storageFailed)
      this.error("storage", new Error(this.messages().storageError));
  }
  revoke(previous) {
    for (const origin of this.config.cookieOrigins) {
      if (!previous.acceptedServices.includes(origin.id) || this.state.acceptedServices.includes(origin.id))
        continue;
      try {
        origin.onRevoke?.();
      } catch (error) {
        this.error("revoke", error);
      }
      for (const cookie of origin.cookies ?? []) {
        const c = typeof cookie === "string" ? { name: cookie, path: "/" } : cookie;
        this.doc.cookie = `${c.name}=; Max-Age=0; Path=${c.path ?? "/"}${c.domain ? `; Domain=${c.domain}` : ""}; SameSite=Lax`;
      }
    }
  }
  messages() {
    const base = translations[this.state.language] ?? translations.en;
    const overrides = this.config.translations?.[this.state.language];
    return { ...base, ...overrides, categoryNames: { ...base.categoryNames, ...overrides?.categoryNames }, categoryDescriptions: { ...base.categoryDescriptions, ...overrides?.categoryDescriptions } };
  }
  links() {
    const tr = this.messages();
    return [[this.config.privacyPolicyUrl, tr.privacyPolicy], [this.config.legalNoticeUrl, tr.legalNotice]].map(([value, label]) => {
      const url = safeUrl(localize(value, this.state.language), this.doc);
      return url ? `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)}</a>` : "";
    }).join("");
  }
  repaint() {
    if (this.destroyed)
      return;
    const tr = this.messages();
    const preferenceView = this.view === "preferences" || this.view === "services";
    const title = preferenceView ? tr.preferences : tr.title;
    const description = preferenceView ? tr.preferencesText : tr.text;
    const button = (action, text, variant = "") => `<button type="button" class="btn"${variant ? ` data-variant="${variant}"` : ""} data-cookie-action="${action}">${escape(text)}</button>`;
    q(this.dialog).attr("lang", this.state.language);
    q(this.root).attr("data-state-name", this.view).attr("data-consent-status", this.state.decisionMade ? "decided" : "pending");
    q(".cookie-consent-content", this.dialog).html(`<header class="dialog-header cookie-consent-header">
      <div><p class="cookie-consent-eyebrow">${escape(tr.settings)}</p><h2 id="${this.id}-title" class="dialog-title cookie-consent-title" tabindex="-1">${escape(title)}</h2></div>
      <div class="cookie-consent-tools"><select class="select" data-size="sm" data-cookie-language aria-label="${escape(tr.language)}">${languagesOf(this.config).map((code) => `<option value="${escape(code)}" lang="${escape(code)}">${escape(languageName(code))}</option>`).join("")}</select>
      <button type="button" class="btn" data-variant="ghost" data-size="icon-sm" data-cookie-action="close" aria-label="${escape(tr.close)}">×</button></div>
      </header><div class="cookie-consent-body"><p id="${this.id}-description" class="dialog-description cookie-consent-description">${escape(description)}</p>
      ${preferenceView ? `<div class="tabs cookie-consent-tabs"><div class="tab-list" role="tablist" data-init aria-label="${escape(tr.preferences)}">
        <button type="button" class="tab-trigger" role="tab" id="${this.id}-categories-tab" data-cookie-action="preferences" aria-controls="${this.id}-categories" aria-selected="${this.view === "preferences"}" tabindex="${this.view === "preferences" ? 0 : -1}">${escape(tr.categories)}</button>
        <button type="button" class="tab-trigger" role="tab" id="${this.id}-services-tab" data-cookie-action="services" aria-controls="${this.id}-services" aria-selected="${this.view === "services"}" tabindex="${this.view === "services" ? 0 : -1}">${escape(tr.services)}</button></div>
        <section class="tab-content" role="tabpanel" id="${this.id}-categories" aria-labelledby="${this.id}-categories-tab" ${this.view === "services" ? "hidden" : ""}>${this.categoryMarkup()}</section>
        <section class="tab-content" role="tabpanel" id="${this.id}-services" aria-labelledby="${this.id}-services-tab" ${this.view !== "services" ? "hidden" : ""}>${this.serviceMarkup()}</section></div>` : ""}
      <nav class="cookie-consent-links" aria-label="${escape(tr.moreInformation)}">${this.links()}</nav>
      </div><footer class="dialog-footer cookie-consent-footer">${!preferenceView ? button("preferences", tr.settings, "outline") : button("save", tr.save, "outline")}${button("deny", tr.denyAll)}${button("accept", tr.acceptAll)}</footer>`);
    q("[data-cookie-language]", this.dialog).val(this.state.language);
    for (const category of categories) {
      const services = this.config.cookieOrigins.filter((s) => s.category === category && !s.disabled);
      const selected = services.filter((s) => this.draft.has(s.id)).length;
      q(`[data-cookie-category="${category}"]`, this.dialog).prop("checked", category === "essential" || services.length > 0 && selected === services.length).prop("indeterminate", selected > 0 && selected < services.length);
    }
    for (const origin of this.config.cookieOrigins) {
      q(`[data-cookie-service="${origin.id}"]`, this.dialog).prop("checked", this.draft.has(origin.id));
    }
    q(".cookie-consent-floating", this.root).remove();
    if (this.config.showFloatingButton !== false) {
      q(this.root).append(`<button type="button" class="btn cookie-consent-floating" data-variant="outline" data-size="sm" data-ce-chrome data-cookie-action="preferences" aria-label="${escape(tr.settings)}" aria-haspopup="dialog">${escape(tr.settings)}</button>`);
    }
    this.bindTabKeys();
  }
  categoryMarkup() {
    const tr = this.messages();
    return categories.map((category) => {
      const ids = this.config.cookieOrigins.filter((s) => s.category === category && !s.disabled).map((s) => s.id);
      const required = category === "essential";
      const box = `${this.id}-category-${category}`;
      return `<div class="cookie-consent-row checkbox-item-block"><input class="checkbox" type="checkbox" id="${box}" data-cookie-category="${category}" ${required || ids.length > 0 && ids.every((id) => this.draft.has(id)) ? "checked" : ""} ${required || ids.length === 0 ? "disabled" : ""} aria-describedby="${box}-description"><div><label for="${box}" class="cookie-consent-label">${escape(tr.categoryNames[category])}${required ? ` <span class="badge" data-variant="secondary">${escape(tr.required)}</span>` : ""}</label><p class="field-description" id="${box}-description">${escape(tr.categoryDescriptions[category])}</p></div></div>`;
    }).join("");
  }
  serviceMarkup() {
    const tr = this.messages();
    return this.config.cookieOrigins.map((origin) => {
      const url = safeUrl(localize(origin.url, this.state.language), this.doc);
      const data = origin.dataCollected?.[this.state.language] ?? origin.dataCollected?.en ?? Object.values(origin.dataCollected ?? {})[0] ?? [];
      const box = `${this.id}-service-${origin.id}`;
      return `<div class="cookie-consent-row checkbox-item-block"><input class="checkbox" type="checkbox" id="${box}" data-cookie-service="${origin.id}" ${this.draft.has(origin.id) ? "checked" : ""} ${origin.category === "essential" || origin.disabled ? "disabled" : ""} aria-describedby="${box}-description"><div><label for="${box}" class="cookie-consent-label">${escape(origin.name)} <span class="badge" data-variant="outline">${escape(tr.categoryNames[origin.category])}</span></label>
        <p class="field-description" id="${box}-description">${escape(localize(origin.description, this.state.language))}</p>
        ${url ? `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(tr.moreInformation)}</a>` : ""}
        ${origin.domain ? `<p class="field-description cookie-consent-note">${escape(origin.domain)} · ${escape(tr.thirdParty)}</p>` : ""}
        ${data.length ? `<ul class="cookie-consent-data">${data.map((value) => `<li class="badge" data-variant="secondary">${escape(value)}</li>`).join("")}</ul>` : ""}</div></div>`;
    }).join("");
  }
  bindTabKeys() {
    if (q(this.root).attr("data-cookie-keys") !== null)
      return;
    q(this.root).attr("data-cookie-keys", "");
    this.listen(this.root, "keydown", (event) => {
      const e = event;
      const target = e.target instanceof Element ? q(e.target).closest('[role="tab"]')[0] : undefined;
      if (!target || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
        return;
      e.preventDefault();
      const name = e.key === "Home" ? "preferences" : e.key === "End" ? "services" : this.view === "services" ? "preferences" : "services";
      this.setState(name);
      q(`[data-cookie-action="${name}"]`, this.dialog)[0]?.focus();
    });
  }
  onClick(event) {
    if (event.target === this.dialog && this.dialog.matches(":modal")) {
      this.close();
      return;
    }
    const target = event.target instanceof Element ? q(event.target).closest("[data-cookie-action]")[0] : undefined;
    if (!target)
      return;
    switch (q(target).attr("data-cookie-action")) {
      case "accept":
        this.acceptAll();
        break;
      case "deny":
        this.denyAll();
        break;
      case "save":
        this.save();
        break;
      case "close":
        this.close();
        break;
      case "preferences":
        this.setState("preferences");
        break;
      case "services":
        this.setState("services");
        break;
    }
  }
  onChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement))
      return;
    if (q(target).attr("data-cookie-language") !== null) {
      this.setLanguage(q(target).val());
      return;
    }
    if (!(target instanceof HTMLInputElement))
      return;
    const service = q(target).attr("data-cookie-service");
    const category = q(target).attr("data-cookie-category");
    const checked = Boolean(q(target).prop("checked"));
    if (service) {
      const origin = this.origin(service);
      if (origin.category !== "essential" && !origin.disabled) {
        if (checked)
          this.draft.add(service);
        else
          this.draft.delete(service);
      }
    } else if (category && categories.includes(category) && category !== "essential") {
      for (const origin of this.config.cookieOrigins.filter((s) => s.category === category && !s.disabled)) {
        if (checked)
          this.draft.add(origin.id);
        else
          this.draft.delete(origin.id);
      }
    } else
      return;
    const focusKey = service ? `[data-cookie-service="${service}"]` : `[data-cookie-category="${category}"]`;
    this.repaint();
    q(focusKey, this.dialog)[0]?.focus();
  }
  updateTagsActivation() {
    if (this.destroyed)
      return;
    for (const [element, record] of this.gates) {
      if (!element.isConnected || !this.scope.contains(element)) {
        if (record.active)
          q(record.active).remove();
        record.handlers?.forEach((off) => off());
        if (record.wrapper && !element.isConnected)
          q(record.wrapper).remove();
        this.gates.delete(element);
        resourceOwners.delete(element);
      }
    }
    for (const element of q("[data-cookie-consent]:not([data-cookie-consent-active])", this.scope)) {
      const id = q(element).attr("data-cookie-consent");
      const origin = this.config.cookieOrigins.find((s) => s.id === id);
      if (!origin || !["SCRIPT", "IFRAME"].includes(element.tagName))
        continue;
      const owner = resourceOwners.get(element);
      if (owner && owner !== this)
        continue;
      resourceOwners.set(element, this);
      let record = this.gates.get(element);
      if (!record) {
        record = { service: origin.id, executed: executedScripts.has(element) };
        this.gates.set(element, record);
        if (element.tagName === "SCRIPT" && !["text/plain", "text"].includes(q(element).attr("type") ?? "")) {
          record.executed = true;
          this.error("markup", new Error(`cookie-consent: ${origin.id} script must be authored inert (type="text/plain")`));
        }
        if (element.tagName === "IFRAME" && (q(element).attr("src") || q(element).attr("srcdoc"))) {
          this.error("markup", new Error(`cookie-consent: ${origin.id} iframe must have no src or srcdoc before consent`));
        }
      }
      if (element.tagName === "SCRIPT")
        this.syncScript(element, record);
      else
        this.syncFrame(element, record, origin);
    }
  }
  syncScript(script, record) {
    if (!this.state.acceptedServices.includes(record.service)) {
      if (record.active) {
        q(record.active).remove();
        record.active = undefined;
      }
      return;
    }
    if (record.executed)
      return;
    const src = q(script).attr("data-consent-src");
    const url = src ? safeUrl(src, this.doc) : undefined;
    if (src && !url) {
      record.executed = true;
      this.error("url", new Error("cookie-consent: invalid script URL"));
      return;
    }
    const active = this.doc.createElement("script");
    q(active).attr("data-cookie-consent-active", this.id);
    const type = q(script).attr("data-consent-type") ?? "text/javascript";
    if (!["text/javascript", "module"].includes(type)) {
      record.executed = true;
      this.error("markup", new Error("cookie-consent: invalid script type"));
      return;
    }
    q(active).attr("type", type);
    for (const name of ["async", "defer", "integrity", "crossorigin", "referrerpolicy", "nomodule"]) {
      const value = q(script).attr(name);
      if (value !== null && value !== undefined)
        q(active).attr(name, value);
    }
    if (script.nonce)
      q(active).prop("nonce", script.nonce);
    if (url)
      q(active).attr("src", url);
    else
      q(active).text(q(script).text());
    record.executed = true;
    executedScripts.add(script);
    record.active = active;
    q(script).after(active);
  }
  syncFrame(frame, record, origin) {
    const allowed = this.state.acceptedServices.includes(record.service);
    if (allowed) {
      const url = safeUrl(q(frame).attr("data-consent-src") ?? "", this.doc);
      if (url && q(frame).attr("src") !== url)
        q(frame).attr("src", url);
      if (record.overlay)
        q(record.overlay).prop("hidden", true);
      q(frame).prop("hidden", false);
      return;
    }
    if (q(frame).attr("src"))
      q(frame).attr("src", "about:blank").attr("src", null);
    if (q(frame).attr("srcdoc"))
      q(frame).attr("srcdoc", null);
    q(frame).prop("hidden", true);
    if (q(frame).attr("data-consent-placeholder") === "none")
      return;
    if (!record.wrapper) {
      const wrapper = q('<div class="cookie-consent-embed"></div>')[0];
      q(frame).before(wrapper);
      q(frame).appendTo(wrapper);
      record.wrapper = wrapper;
      const overlay = q('<div class="cookie-consent-placeholder"></div>')[0];
      q(wrapper).append(overlay);
      record.overlay = overlay;
      this.renderOverlay(record, origin);
    }
    if (record.overlay)
      q(record.overlay).prop("hidden", false);
  }
  renderOverlay(record, origin) {
    if (!record.overlay)
      return;
    const tr = this.messages();
    record.handlers?.forEach((off) => off());
    q(record.overlay).html(`<p><strong>${escape(origin.name)}</strong> ${escape(tr.blocked)}</p><div class="cookie-consent-embed-actions"><button type="button" class="btn" data-size="sm" data-cookie-allow>${escape(tr.activate)}</button><button type="button" class="btn" data-variant="outline" data-size="sm" data-cookie-settings>${escape(tr.settings)}</button></div>`);
    const allow = q("[data-cookie-allow]", record.overlay);
    const settings = q("[data-cookie-settings]", record.overlay);
    const onAllow = () => this.acceptService(origin.id);
    const onSettings = () => this.open();
    allow.prop("disabled", Boolean(origin.disabled)).on("click", onAllow);
    settings.on("click", onSettings);
    record.handlers = [() => allow.off("click", onAllow), () => settings.off("click", onSettings)];
  }
  refreshOverlays() {
    for (const record of this.gates.values())
      this.renderOverlay(record, this.origin(record.service));
  }
  destroy() {
    if (this.destroyed)
      return;
    this.close();
    this.observer.disconnect();
    this.off.forEach((off) => off());
    this.saved?.destroy();
    const previous = this.state;
    this.state = this.makeState([]);
    this.revoke(previous);
    for (const [element, record] of this.gates) {
      if (record.active)
        q(record.active).remove();
      record.handlers?.forEach((off) => off());
      if (element.tagName === "IFRAME") {
        q(element).attr("src", "about:blank").attr("src", null).prop("hidden", false);
        if (record.wrapper) {
          q(record.wrapper).before(element);
          q(record.wrapper).remove();
        }
      }
      resourceOwners.delete(element);
    }
    q(this.dialog).remove();
    q(".cookie-consent-floating", this.root).remove();
    q(this.root).attr("data-init", null).attr("data-cookie-consent-ready", null).attr("data-cookie-keys", null);
    q(this.root).attr("data-cookie-consent-destroyed", "");
    unbindComponent(this.root);
    delete this.root.api;
    controllers.delete(this.root);
    this.destroyed = true;
  }
}
function controllerFor(el) {
  const instance = controllers.get(el);
  if (!instance)
    throw new Error("cookie-consent: initialize the element first");
  return instance;
}
function triggerStateChange2(el, stateName, config) {
  controllerFor(el).applyView(stateName, config);
}
var cookieConsentApi = componentState2({
  component: "cookie-consent",
  states: cookieConsentStates,
  apply: (el, state) => triggerStateChange2(el, state.name, state.config),
  read: (el) => controllerFor(el).viewState()
});
var cookieConsent = {
  create(root, config) {
    if (controllers.has(root))
      return controllers.get(root);
    if (!root.isConnected)
      throw new Error("cookie-consent: root must be connected");
    if (!q(root).hasClass("cookie-consent"))
      q(root).addClass("cookie-consent");
    q(root).attr("data-cookie-consent-destroyed", null);
    const controller = new Controller(root, config);
    controllers.set(root, controller);
    return controller;
  },
  get(root) {
    return controllers.get(root);
  },
  init: init2
};
df$2.cookieConsentApi = cookieConsentApi;
df$2.cookieConsentStates = cookieConsentStates;
df$2.cookieConsent = cookieConsent;
function init2() {
  for (const root of q(".cookie-consent:not([data-cookie-consent-destroyed]):not([data-cookie-consent-error])")) {
    if (controllers.has(root))
      continue;
    const configTag = q('script[type="application/json"][data-cookie-consent-config]', root)[0];
    if (!configTag)
      continue;
    try {
      cookieConsent.create(root, JSON.parse(q(configTag).text()));
    } catch (error) {
      q(root).attr("data-init", "").attr("data-cookie-consent-error", "");
      root.dispatchEvent(new CustomEvent("cookie-consent:error", { bubbles: true, detail: { kind: "config", error } }));
      console.error(error);
    }
  }
  for (const [root, instance] of controllers)
    if (!root.isConnected)
      instance.destroy();
}
init2();
new MutationObserver(init2).observe(document, { childList: true, subtree: true });

//# debugId=21B3FC34D4E3B0EB64756E2164756E21
//# sourceMappingURL=website.js.map
