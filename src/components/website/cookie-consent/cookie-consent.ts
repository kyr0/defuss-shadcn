import { defussGlobals, defussQuery, componentState, bindComponent, unbindComponent, persisted, reload, forget, persistOk } from '../../../shared/state-api.js';
import type { ElementModel } from '../../../shared/render.js';

const df$ = defussGlobals();
const q = defussQuery();

// VERIFIED: (verify's component types ratchet - tsc -p tsconfig.components.json) every type
// this file's API docs state - arguments, return values, event details - holds
// against its code: a wrong one is a new type error and fails the build.
const cookieConsentStates = ['default', 'open', 'preferences', 'services'] as const;

/** setState() configs per state - el.api is the instance (CookieConsentInstance), whose setState takes these. */
export interface CookieConsentStateConfigs {
  /** The dialog closed (the floating settings button shows after a decision). */
  default: {
    /** switch the texts to this language (built in, or given in translations); getState() reports the language shown */
    language?: Language;
  };
  /** The notice: the texts and the accept / reject / settings buttons. */
  open: {
    /** switch the texts to this language (built in, or given in translations); getState() reports the language shown */
    language?: Language;
  };
  /** The settings by category. */
  preferences: {
    /** switch the texts to this language (built in, or given in translations); getState() reports the language shown */
    language?: Language;
  };
  /** The settings by service. */
  services: {
    /** switch the texts to this language (built in, or given in translations); getState() reports the language shown */
    language?: Language;
  };
}
/** A view of the consent dialog - the component's states: closed (default), the notice (open), the categories (preferences), the services list. */
export type ConsentView = typeof cookieConsentStates[number];
/** A language code (BCP 47). English and German are built in; any other
 *  becomes available by passing its texts in `translations` - every key it
 *  leaves out falls back to English. */
export type Language = string;
/** The built-in languages. */
export const builtInLanguages: readonly Language[] = ['en', 'de'];
/** A service's category - essential services are always on. */
export type CookieCategory = 'essential' | 'functional' | 'marketing' | 'other';
export const categories: readonly CookieCategory[] = ['essential', 'functional', 'marketing', 'other'];
/** A text in one language, or per language ({ en, de, ... } - a missing one falls back to English). */
export type Localized = string | Partial<Record<Language, string>>;

/** One service the site uses - what the visitor allows or rejects. */
export interface CookieOrigin {
  /** its id: what data-consent-service on gated scripts and frames names */
  id: string;
  /** its name in the lists */
  name: string;
  /** what it does */
  description: Localized;
  /** its category */
  category: CookieCategory;
  /** the domain it sets cookies on */
  domain?: string;
  /** its privacy information page */
  url?: Localized;
  /** what it collects, per language */
  dataCollected?: Partial<Record<Language, string[]>>;
  /** Kept for migration. Optional services never start granted. */
  consent?: boolean;
  /** Essential services are on; disabled optional services stay off. */
  disabled?: boolean;
  /** the cookies it sets (a name, or name + path / domain) - removed when it is revoked */
  cookies?: Array<string | { name: string; path?: string; domain?: string }>;
  /** Tear down timers, SDKs, listeners, etc. Removal cannot undo script execution. */
  onRevoke?: () => void;
}

/** Every text the dialog shows - translations replace any of them. */
export interface ConsentMessages {
  /** the notice's heading */
  title: string;
  /** the notice's text */
  text: string;
  /** the button (and floating button) that opens the settings */
  settings: string;
  /** the button that closes without saving */
  close: string;
  /** the language picker's label */
  language: string;
  /** the settings view's heading */
  preferences: string;
  /** the settings view's intro */
  preferencesText: string;
  /** the categories tab */
  categories: string;
  /** the services tab */
  services: string;
  /** the accept-all button */
  acceptAll: string;
  /** the reject-optional button */
  denyAll: string;
  /** the save button */
  save: string;
  /** the badge on essential services */
  required: string;
  /** the privacy policy link */
  privacyPolicy: string;
  /** the legal notice link */
  legalNotice: string;
  /** a service's information link */
  moreInformation: string;
  /** after a service's name on gated content it blocks */
  blocked: string;
  /** the button on gated content that allows its service */
  activate: string;
  /** the note that third-party cookies stay (the site cannot remove them) */
  thirdParty: string;
  /** shown when the choice could not be stored */
  storageError: string;
  /** each category's name */
  categoryNames: Record<CookieCategory, string>;
  /** each category's description */
  categoryDescriptions: Record<CookieCategory, string>;
}

export const translations: Record<string, ConsentMessages> = {
  en: {
    title: 'Your privacy choices',
    text: 'Essential services are always enabled. Choose whether to allow optional services. You can change or withdraw your choices at any time in Privacy settings.',
    settings: 'Privacy settings', close: 'Close without saving', language: 'Language',
    preferences: 'Privacy preferences', preferencesText: 'Choose categories or individual services. Changes apply when you save.',
    categories: 'Categories', services: 'Services', acceptAll: 'Accept all', denyAll: 'Reject optional',
    save: 'Save preferences', required: 'Required', privacyPolicy: 'Privacy policy', legalNotice: 'Legal notice',
    moreInformation: 'More information', blocked: 'is blocked until you allow this service.', activate: 'Allow this service',
    thirdParty: 'Third-party cookies cannot be removed by this site. Use your browser settings to remove them.',
    storageError: 'Your choice applies to this page, but could not be saved for your next visit.',
    categoryNames: { essential: 'Essential', functional: 'Functional', marketing: 'Marketing', other: 'Other' },
    categoryDescriptions: {
      essential: 'Required for the basic functions of this website.',
      functional: 'Optional features and measurement of website use.',
      marketing: 'Advertising, targeting, and campaign measurement.',
      other: 'Additional optional data processing services.',
    },
  },
  de: {
    title: 'Ihre Datenschutz-Auswahl',
    text: 'Notwendige Dienste sind immer aktiv. Entscheiden Sie, welche optionalen Dienste Sie erlauben. Ihre Auswahl können Sie jederzeit in den Datenschutz-Einstellungen ändern oder widerrufen.',
    settings: 'Datenschutz-Einstellungen', close: 'Ohne Speichern schließen', language: 'Sprache',
    preferences: 'Datenschutz-Einstellungen', preferencesText: 'Wählen Sie Kategorien oder einzelne Dienste. Änderungen gelten erst nach dem Speichern.',
    categories: 'Kategorien', services: 'Dienste', acceptAll: 'Alle akzeptieren', denyAll: 'Optionale ablehnen',
    save: 'Auswahl speichern', required: 'Notwendig', privacyPolicy: 'Datenschutzerklärung', legalNotice: 'Impressum',
    moreInformation: 'Mehr Informationen', blocked: 'ist gesperrt, bis Sie diesen Dienst erlauben.', activate: 'Diesen Dienst erlauben',
    thirdParty: 'Cookies von Drittanbietern kann diese Website nicht löschen. Entfernen Sie diese in Ihren Browser-Einstellungen.',
    storageError: 'Ihre Auswahl gilt für diese Seite, konnte aber nicht für Ihren nächsten Besuch gespeichert werden.',
    categoryNames: { essential: 'Notwendig', functional: 'Funktional', marketing: 'Marketing', other: 'Sonstige' },
    categoryDescriptions: {
      essential: 'Für die grundlegenden Funktionen dieser Website erforderlich.',
      functional: 'Optionale Funktionen und Messung der Website-Nutzung.',
      marketing: 'Werbung, Targeting und Kampagnenmessung.',
      other: 'Zusätzliche optionale Dienste zur Datenverarbeitung.',
    },
  },
};

/** What create() takes (also the JSON in the root's config script). */
export interface CookieConsentConfig {
  /** every service the site uses */
  cookieOrigins: CookieOrigin[];
  /** the language before the visitor picks one (default: the page's lang, else English) */
  defaultLanguage?: Language;
  /** a floating settings button after the decision (default true) */
  showFloatingButton?: boolean;
  /** the privacy policy page */
  privacyPolicyUrl?: Localized;
  /** the legal notice page */
  legalNoticeUrl?: Localized;
  /** the storage key of the decision */
  storageKey?: string;
  /** change it to ask everyone again (a new set of services) */
  revision?: string;
  /** days a decision is kept */
  maxAgeDays?: number;
  /** where the decision is kept (default localStorage; null: nowhere) */
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  /** open the notice when no decision is stored (default true) */
  autoShow?: boolean;
  /** Defaults to ownerDocument; use a container to isolate resource ownership. */
  resourceRoot?: Document | HTMLElement;
  /** texts per language - any key left out falls back to English */
  translations?: Partial<Record<Language, Partial<ConsentMessages>>>;
  /** called on every decision with the state and why */
  onChange?: (state: CookieConsentState, reason: ConsentReason) => void;
  /** called when everything is accepted */
  onAccept?: (state: CookieConsentState) => void;
  /** called when the optional services are rejected */
  onDeny?: (state: CookieConsentState) => void;
}

/** The decision - getConsent() returns it, cookie-consent:change carries it. */
export interface CookieConsentState {
  /** the config revision it was made under */
  revision: string;
  /** whether the visitor decided (false: no decision yet, or it was reset) */
  decisionMade: boolean;
  /** the language the texts show */
  language: Language;
  /** the ids of the accepted services */
  acceptedServices: string[];
  /** the categories every service of which is accepted */
  acceptedCategories: CookieCategory[];
  /** when it was made, ms since the epoch; null before a decision */
  updatedAt: number | null;
  /** every optional service accepted */
  acceptAll: boolean;
  /** every optional service rejected */
  denyAll: boolean;
}
/** Why the decision changed: the buttons (accept, deny, save), one service, a reset, or a decision read from storage. */
export type ConsentReason = 'accept' | 'deny' | 'save' | 'service' | 'reset' | 'storage';
/** What failed (cookie-consent:error): the config, storage, a callback, the markup, a revoke hook, a URL. */
export type ConsentErrorKind = 'config' | 'storage' | 'callback' | 'markup' | 'revoke' | 'url';

/** What cookie-consent:change carries. */
interface CookieConsentChangeDetail {
  /** the decision now */
  state: CookieConsentState;
  /** what changed it */
  reason: ConsentReason;
}

/** What cookie-consent:error carries. */
interface CookieConsentErrorDetail {
  /** what failed */
  kind: ConsentErrorKind;
  /** what was thrown */
  error: unknown;
}
type StoredConsent = Pick<CookieConsentState, 'revision' | 'decisionMade' | 'language' | 'acceptedServices' | 'updatedAt'> & { schemaVersion: 1 };
/** A consent manager - create() returns it, and it is the root's el.api. */
export interface CookieConsentInstance {
  /**
   * Show a view by name (default, open, preferences, services); { language } switches the texts.
   * @param name - the view
   * @param config - language: switch the texts too
   */
  setState(name: ConsentView, config?: { language?: Language }): void;
  /**
   * The view shown now and the language.
   * @returns the view's name, the language and the authored model render() starts from
   */
  getState(): { name: ConsentView; config: { language: Language }; model?: ElementModel };
  /**
   * The markup of a state (the render() contract).
   * @param state - the state (default: the current one)
   * @returns the root's markup in that state
   */
  render(state?: DefussShadcnComponentState): string;
  /**
   * Wait for the last state's DOM work - the State API every element has (el.api.settled).
   * @returns resolves once the view is painted
   */
  settled(): Promise<void>;
  /** Open the consent dialog. */
  open(): void;
  /** Close the dialog. */
  close(): void;
  /** Accept every optional service and close. */
  acceptAll(): void;
  /** Reject every optional service and close. */
  denyAll(): void;
  /** Keep the services ticked in the settings and close. */
  save(): void;
  /**
   * Accept one service (also what a gated element's Allow does).
   * @param id - the service's id
   */
  acceptService(id: string): void;
  /**
   * Revoke one optional service - its scripts and frames unload, its cookies are removed.
   * @param id - the service's id
   */
  revokeService(id: string): void;
  /**
   * Whether a service is accepted now.
   * @param id - the service's id
   * @returns true when it is accepted (essential services always are)
   */
  isServiceAccepted(id: string): boolean;
  /**
   * The decision: services, categories, acceptAll / denyAll, language, revision, date.
   * @returns a copy of the decision
   */
  getConsent(): CookieConsentState;
  /**
   * The services ticked in the settings, not saved yet.
   * @returns their ids
   */
  getDraft(): string[];
  /**
   * Switch the texts (a built-in or a translated language).
   * @param language - a language code with texts (built in, or in translations)
   */
  setLanguage(language: Language): void;
  /** Forget the decision (in storage too) and open the notice again. */
  reset(): void;
  /** Scan the page again for gated scripts and frames (after adding markup). */
  updateTagsActivation(): void;
  /** Stop: listeners off, optional integrations revoked, the dialog removed. */
  destroy(): void;
}

// el.api is typed globally (DefussShadcnComponentApi); the instance satisfies it
type ConsentElement = HTMLElement;
type GateRecord = { service: string; active?: HTMLScriptElement; executed?: boolean; wrapper?: HTMLElement; overlay?: HTMLElement; handlers?: Array<() => void> };
const controllers = new Map<HTMLElement, Controller>();
// A resource cannot be driven by two instances (opposing grants would race).
const resourceOwners = new WeakMap<Element, Controller>();
const executedScripts = new WeakSet<Element>();
let uid = 0;

function localize(value: Localized | undefined, language: Language): string {
  if (typeof value === 'string') return value;
  return value?.[language] ?? value?.en ?? Object.values(value ?? {}).find((v) => typeof v === 'string') ?? '';
}
/** The languages a config offers: the built-in ones plus every translated one. */
function languagesOf(config: CookieConsentConfig): Language[] {
  return [...new Set([...builtInLanguages, ...Object.keys(config.translations ?? {})])];
}
const LANGUAGE = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/;
/** A language's own name ("Deutsch", "Français") for the picker. */
function languageName(code: Language): string {
  try {
    const name = new Intl.DisplayNames([code], { type: 'language' }).of(code);
    return name ? name.charAt(0).toLocaleUpperCase(code) + name.slice(1) : code;
  } catch { return code; }
}
function escape(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
function safeUrl(value: string, doc: Document): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, doc.baseURI);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}
function validateConfig(config: CookieConsentConfig): void {
  if (!config || !Array.isArray(config.cookieOrigins)) throw new TypeError('cookie-consent: cookieOrigins must be an array');
  const ids = new Set<string>();
  for (const origin of config.cookieOrigins) {
    if (!origin || !/^[a-zA-Z][\w-]*$/.test(origin.id) || ids.has(origin.id)) throw new TypeError('cookie-consent: service IDs must be unique and match [a-zA-Z][\\w-]*');
    if (typeof origin.name !== 'string' || !origin.name.trim() || !categories.includes(origin.category)
        || !(typeof origin.description === 'string' || (origin.description && typeof origin.description === 'object'))) {
      throw new TypeError(`cookie-consent: invalid service ${origin.id}`);
    }
    if (origin.cookies?.some(cookie => !/^[!#$%&'*+.^_`|~0-9a-zA-Z-]+$/.test(typeof cookie === 'string' ? cookie : cookie.name)
        || (typeof cookie !== 'string' && /[;\r\n]/.test(`${cookie.path ?? ''}${cookie.domain ?? ''}`)))) {
      throw new TypeError(`cookie-consent: invalid cookie descriptor for ${origin.id}`);
    }
    ids.add(origin.id);
  }
  for (const code of Object.keys(config.translations ?? {})) {
    if (!LANGUAGE.test(code)) throw new TypeError(`cookie-consent: invalid language code ${code}`);
  }
  if (config.defaultLanguage !== undefined && !languagesOf(config).includes(config.defaultLanguage)) {
    throw new TypeError(`cookie-consent: unsupported language ${config.defaultLanguage} - add its texts to translations`);
  }
  if (config.revision !== undefined && (typeof config.revision !== 'string' || !config.revision)) throw new TypeError('cookie-consent: revision must be a nonempty string');
  if (config.maxAgeDays !== undefined && (!Number.isFinite(config.maxAgeDays) || config.maxAgeDays <= 0)) throw new TypeError('cookie-consent: maxAgeDays must be positive');
}

class Controller implements CookieConsentInstance {
  readonly root: ConsentElement;
  readonly config: CookieConsentConfig;
  readonly dialog: HTMLDialogElement;
  readonly doc: Document;
  readonly scope: Document | HTMLElement;
  readonly key: string;
  readonly revision: string;
  readonly storage: CookieConsentConfig['storage'];
  /** the stored decision (AGENTS.md "State through stores"): a persisted
   *  store on the configured storage - null when storage is off or blocked */
  readonly saved: ReturnType<typeof persisted<StoredConsent | null>> | null;
  readonly gates = new Map<Element, GateRecord>();
  readonly off: Array<() => void> = [];
  readonly id: string;
  readonly observer: MutationObserver;
  /** the element State API bindComponent gave the root - its settled() is the controller's */
  readonly bound: ReturnType<typeof bindComponent>;
  state: CookieConsentState;
  draft = new Set<string>();
  view: ConsentView = 'default';
  trigger: HTMLElement | null = null;
  destroyed = false;
  storageFailed = false;

  constructor(root: ConsentElement, config: CookieConsentConfig) {
    validateConfig(config);
    this.root = root;
    this.config = { ...config, cookieOrigins: config.cookieOrigins.map(origin => ({ ...origin })) };
    this.doc = root.ownerDocument;
    this.scope = config.resourceRoot ?? this.doc;
    this.id = root.id || `cookie-consent-${++uid}`;
    if (!/^[a-zA-Z][\w-]*$/.test(this.id)) throw new TypeError('cookie-consent: host ID must match [a-zA-Z][\\w-]*');
    this.key = config.storageKey ?? `defuss-shadcn:${this.id}`;
    this.revision = config.revision ?? '1';
    let storage = config.storage;
    if (storage === undefined) {
      try { storage = this.doc.defaultView?.localStorage ?? null; } catch { storage = null; }
    }
    this.storage = storage;
    // the record is the store's value; its own checks (revision, age, ...) run
    // in readStored - the store only guarantees an object or null
    this.saved = storage
      ? persisted<StoredConsent | null>(this.key, null, {
        storage,
        validate: (v): v is StoredConsent | null => v === null || (typeof v === 'object' && !Array.isArray(v)),
        onError: () => { this.storageFailed = true; },
      })
      : null;
    this.state = this.readStored();
    this.draft = new Set(this.state.acceptedServices);
    const authoredView = q(root).attr('data-state-name') as ConsentView | null;
    q(root).attr('id', this.id).attr('data-init', '').attr('data-cookie-consent-ready', '');
    // Own the dialog immediately; generic dialog initialization must not claim it.
    // It is the library's Dialog (.dialog + .dialog-content); dialog.js excludes
    // .cookie-consent-dialog and data-init keeps any other claimant away.
    q(root).append(`<dialog class="dialog cookie-consent-dialog" data-init data-ce-chrome aria-labelledby="${this.id}-title" aria-describedby="${this.id}-description"><div class="dialog-content cookie-consent-content"></div></dialog>`);
    this.dialog = q<HTMLDialogElement>('.cookie-consent-dialog', root)[0];
    // el.store (AGENTS.md "State through stores"); the controller stays
    // el.api - its open() / acceptAll() / ... are the documented surface, and
    // its setState / getState run through the store
    // registered before the first state: the store's apply reaches the
    // controller through the registry (create() sets the same entry again)
    controllers.set(root, this);
    this.bound = bindComponent(root, cookieConsentApi);
    root.api = this;
    this.repaint();
    this.listen(root, 'click', event => this.onClick(event));
    this.listen(root, 'change', event => this.onChange(event));
    this.listen(this.dialog, 'cancel', () => this.close());
    this.listen(this.dialog, 'close', () => {
      if (!this.dialog.open) this.finishClose();
    });
    this.listen(this.doc, 'click', event => {
      const target = event.target instanceof Element ? q(event.target).closest('[data-cookie-consent-open]')[0] : undefined;
      if (target && q(target).attr('data-cookie-consent-open') === this.id) {
        this.trigger = target as HTMLElement;
        this.open();
      }
    });
    if (this.doc.defaultView) this.listen(this.doc.defaultView, 'storage', event => {
      const e = event as StorageEvent;
      if ((e.key === this.key || e.key === null) && e.storageArea === this.storage) {
        const previous = this.state;
        if (this.saved) reload(this.saved);
        this.state = this.readStored();
        this.draft = new Set(this.state.acceptedServices);
        this.revoke(previous);
        this.updateTagsActivation();
        this.repaint();
        this.emit('storage');
        if (!this.state.decisionMade && this.config.autoShow !== false) this.open();
      }
    });
    this.observer = new MutationObserver(() => this.updateTagsActivation());
    this.observer.observe(this.scope, { childList: true, subtree: true });
    controllers.set(root, this);
    this.updateTagsActivation();
    if (authoredView && authoredView !== 'default' && cookieConsentStates.includes(authoredView)) this.setState(authoredView);
    else if (!this.state.decisionMade && config.autoShow !== false) this.setState('open');
  }

  listen(target: EventTarget, type: string, handler: (event: Event) => void): void {
    // defuss-query delegates element events; native document/window targets
    // are managed by the same query API. Capture includes dialog close/cancel.
    q(target).on(type, handler, { capture: true });
    this.off.push(() => q(target).off(type, handler));
  }
  assertAlive(): void {
    if (this.destroyed) throw new Error('cookie-consent: instance was destroyed');
  }
  origin(id: string): CookieOrigin {
    const origin = this.config.cookieOrigins.find(service => service.id === id);
    if (!origin) throw new Error(`cookie-consent: unknown service ${id}`);
    return origin;
  }
  normalize(ids: Iterable<string>): string[] {
    const selected = new Set(ids);
    return this.config.cookieOrigins.filter(service => service.category === 'essential'
      || (!service.disabled && selected.has(service.id))).map(service => service.id).sort();
  }
  makeState(ids: Iterable<string>, decisionMade = false, updatedAt: number | null = null, language = this.config.defaultLanguage ?? 'en'): CookieConsentState {
    const acceptedServices = this.normalize(ids);
    const optional = this.config.cookieOrigins.filter(s => s.category !== 'essential' && !s.disabled);
    return {
      revision: this.revision, decisionMade, language, acceptedServices, updatedAt,
      acceptedCategories: categories.filter(category => category === 'essential' || (() => {
        const services = this.config.cookieOrigins.filter(s => s.category === category && !s.disabled);
        return services.length > 0 && services.every(s => acceptedServices.includes(s.id));
      })()),
      acceptAll: decisionMade && optional.length > 0 && optional.every(s => acceptedServices.includes(s.id)),
      denyAll: decisionMade && optional.every(s => !acceptedServices.includes(s.id)),
    };
  }
  readStored(): CookieConsentState {
    const fallback = this.makeState([]);
    const s = this.saved?.value as Partial<StoredConsent> | null | undefined;
    if (!s) return fallback;
    const age = Date.now() - (s.updatedAt ?? 0);
    if (s.schemaVersion !== 1 || s.revision !== this.revision || s.decisionMade !== true
        || !languagesOf(this.config).includes(s.language ?? '') || !Array.isArray(s.acceptedServices)
        || !s.acceptedServices.every(id => typeof id === 'string') || typeof s.updatedAt !== 'number'
        || !Number.isFinite(s.updatedAt) || age < 0 || age > (this.config.maxAgeDays ?? 180) * 86400000) return fallback;
    return this.makeState(s.acceptedServices, true, s.updatedAt, s.language);
  }
  persist(): void {
    if (!this.saved) { this.storageFailed = this.config.storage !== null; return; }
    const { revision, decisionMade, language, acceptedServices, updatedAt } = this.state;
    this.storageFailed = false;
    this.saved.set({ schemaVersion: 1, revision, decisionMade, language, acceptedServices: [...acceptedServices], updatedAt });
    this.storageFailed ||= !persistOk(this.saved);
  }
  getConsent(): CookieConsentState {
    return { ...this.state, acceptedServices: [...this.state.acceptedServices], acceptedCategories: [...this.state.acceptedCategories] };
  }
  getDraft(): string[] { return [...this.draft].sort(); }
  isServiceAccepted(id: string): boolean {
    this.origin(id);
    return this.state.acceptedServices.includes(id);
  }
  getState(): { name: ConsentView; config: { language: Language }; model?: ElementModel } {
    return cookieConsentApi.getState(this.root) as { name: ConsentView; config: { language: Language }; model?: ElementModel };
  }
  /** the state the dialog shows (the store's read-back) */
  viewState(): { name: ConsentView; config: { language: Language } } {
    return { name: this.dialog.open ? this.view : 'default', config: { language: this.state.language } };
  }
  /** The markup of a state (default: the current one) - AGENTS.md "State API"
   *  → render: the authored host; the dialog the views paint is runtime chrome. */
  render(state?: DefussShadcnComponentState): string {
    return cookieConsentApi.render(state ?? this.getState());
  }
  settled(): Promise<void> {
    return this.bound.settled();
  }
  setState(name: ConsentView, config: { language?: Language } = {}): void {
    cookieConsentApi.setState(this.root, name, config);
  }
  /** the DOM side of a state - the store's apply */
  applyView(name: ConsentView, config: { language?: Language } = {}): void {
    this.assertAlive();
    if (!cookieConsentStates.includes(name)) throw new Error(`cookie-consent: unknown state "${name}"`);
    if (config.language) this.setLanguage(config.language);
    if (name === 'default') { this.close(); return; }
    if (!this.dialog.open) {
      this.draft = new Set(this.state.acceptedServices);
      this.trigger ??= this.doc.activeElement instanceof HTMLElement ? this.doc.activeElement : null;
    }
    this.view = name;
    q(this.root).attr('data-state-name', name);
    this.repaint();
    // banner: the first-visit view is a NON-modal bar along the bottom of the
    // page (show()) - the page stays usable; the settings views need focus,
    // so they reopen as the modal dialog (showModal()). Switching closes and
    // reopens synchronously: the async close event then sees an open dialog
    // and finishClose() does not run.
    const modal = !(this.isBanner() && name === 'open');
    if (this.dialog.open && this.dialog.matches(':modal') !== modal) this.dialog.close();
    if (!this.dialog.open) {
      if (modal) this.dialog.showModal();
      else this.dialog.show();
    }
  }
  /** data-variant="banner": the first view is a bottom bar, not a modal. */
  isBanner(): boolean { return q(this.root).attr('data-variant') === 'banner'; }
  open(): void { this.setState('preferences'); }
  close(): void {
    this.assertAlive();
    if (this.dialog.open) this.dialog.close();
    this.finishClose();
  }
  finishClose(): void {
    this.view = 'default';
    this.draft = new Set(this.state.acceptedServices);
    q(this.root).attr('data-state-name', 'default');
    if (this.trigger?.isConnected) this.trigger.focus();
    this.trigger = null;
  }
  setLanguage(language: Language): void {
    this.assertAlive();
    if (!languagesOf(this.config).includes(language)) throw new Error(`cookie-consent: unsupported language ${language}`);
    this.state.language = language;
    if (this.state.decisionMade) this.persist();
    this.repaint();
    this.refreshOverlays();
  }
  commit(ids: Iterable<string>, reason: ConsentReason, close = true): void {
    this.assertAlive();
    const previous = this.state;
    this.state = this.makeState(ids, true, Date.now(), previous.language);
    this.draft = new Set(this.state.acceptedServices);
    this.persist();
    this.revoke(previous);
    this.updateTagsActivation();
    this.repaint();
    if (close) this.close();
    this.emit(reason);
  }
  acceptAll(): void { this.commit(this.config.cookieOrigins.filter(s => !s.disabled).map(s => s.id), 'accept'); }
  denyAll(): void { this.commit([], 'deny'); }
  save(): void { this.commit(this.draft, 'save'); }
  acceptService(id: string): void {
    const origin = this.origin(id);
    if (origin.disabled && origin.category !== 'essential') throw new Error(`cookie-consent: service ${id} is disabled`);
    this.commit([...this.state.acceptedServices, id], 'service', false);
  }
  revokeService(id: string): void {
    if (this.origin(id).category === 'essential') throw new Error('cookie-consent: essential services cannot be revoked');
    this.commit(this.state.acceptedServices.filter(s => s !== id), 'service', false);
  }
  reset(): void {
    this.assertAlive();
    if (this.saved) {
      this.saved.set(null);
      if (!forget(this.saved)) this.storageFailed = true;
    }
    const previous = this.state;
    this.state = this.makeState([], false, null, previous.language);
    this.draft = new Set(this.state.acceptedServices);
    this.revoke(previous);
    this.updateTagsActivation();
    this.setState('open');
    this.emit('reset');
  }
  error(kind: ConsentErrorKind, error: unknown): void {
    // Fires when something fails without breaking the page - storage (kind "storage"), a callback, a revoke hook.
    this.root.dispatchEvent(new CustomEvent<CookieConsentErrorDetail>('cookie-consent:error', { bubbles: true, detail: { kind, error } }));
  }
  emit(reason: ConsentReason): void {
    // Fires on every decision - the consent state and why (accept, deny, save, service, reset, storage).
    this.root.dispatchEvent(new CustomEvent<CookieConsentChangeDetail>('cookie-consent:change', { bubbles: true, detail: { state: this.getConsent(), reason } }));
    try { this.config.onChange?.(this.getConsent(), reason); } catch (error) { this.error('callback', error); }
    const callback = reason === 'accept' ? this.config.onAccept : reason === 'deny' ? this.config.onDeny : undefined;
    try { callback?.(this.getConsent()); } catch (error) { this.error('callback', error); }
    if (this.storageFailed) this.error('storage', new Error(this.messages().storageError));
  }
  revoke(previous: CookieConsentState): void {
    for (const origin of this.config.cookieOrigins) {
      if (!previous.acceptedServices.includes(origin.id) || this.state.acceptedServices.includes(origin.id)) continue;
      try { origin.onRevoke?.(); } catch (error) { this.error('revoke', error); }
      for (const cookie of origin.cookies ?? []) {
        const c = typeof cookie === 'string' ? { name: cookie, path: '/' } : cookie;
        this.doc.cookie = `${c.name}=; Max-Age=0; Path=${c.path ?? '/'}${c.domain ? `; Domain=${c.domain}` : ''}; SameSite=Lax`;
      }
    }
  }
  messages(): ConsentMessages {
    // a translated-only language starts from English: every key it leaves out
    const base = translations[this.state.language] ?? translations.en;
    const overrides = this.config.translations?.[this.state.language];
    return { ...base, ...overrides, categoryNames: { ...base.categoryNames, ...overrides?.categoryNames }, categoryDescriptions: { ...base.categoryDescriptions, ...overrides?.categoryDescriptions } };
  }
  links(): string {
    const tr = this.messages();
    return ([[this.config.privacyPolicyUrl, tr.privacyPolicy], [this.config.legalNoticeUrl, tr.legalNotice]] as const).map(([value, label]) => {
      const url = safeUrl(localize(value, this.state.language), this.doc);
      return url ? `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)}</a>` : '';
    }).join('');
  }
  /** Repaint the dialog from the consent state (internal; render() is the State API name) */
  repaint(): void {
    if (this.destroyed) return;
    const tr = this.messages();
    const preferenceView = this.view === 'preferences' || this.view === 'services';
    const title = preferenceView ? tr.preferences : tr.title;
    const description = preferenceView ? tr.preferencesText : tr.text;
    // Accept all and Reject optional share one variant: equal weight, by design
    const button = (action: string, text: string, variant = '') => `<button type="button" class="btn"${variant ? ` data-variant="${variant}"` : ''} data-cookie-action="${action}">${escape(text)}</button>`;
    q(this.dialog).attr('lang', this.state.language);
    q(this.root).attr('data-state-name', this.view).attr('data-consent-status', this.state.decisionMade ? 'decided' : 'pending');
    // Composed from the library: Dialog sections, Select, Button, Tabs (the
    // tablist carries data-init - this component owns the switching, tabs.js
    // only lends its styles), Checkbox rows, Badge.
    q('.cookie-consent-content', this.dialog).html(`<header class="dialog-header cookie-consent-header">
      <div><p class="cookie-consent-eyebrow">${escape(tr.settings)}</p><h2 id="${this.id}-title" class="dialog-title cookie-consent-title" tabindex="-1">${escape(title)}</h2></div>
      <div class="cookie-consent-tools"><select class="select" data-size="sm" data-cookie-language aria-label="${escape(tr.language)}">${languagesOf(this.config).map((code) => `<option value="${escape(code)}" lang="${escape(code)}">${escape(languageName(code))}</option>`).join('')}</select>
      <button type="button" class="btn" data-variant="ghost" data-size="icon-sm" data-cookie-action="close" aria-label="${escape(tr.close)}">×</button></div>
      </header><div class="cookie-consent-body"><p id="${this.id}-description" class="dialog-description cookie-consent-description">${escape(description)}</p>
      ${preferenceView ? `<div class="tabs cookie-consent-tabs"><div class="tab-list" role="tablist" data-init aria-label="${escape(tr.preferences)}">
        <button type="button" class="tab-trigger" role="tab" id="${this.id}-categories-tab" data-cookie-action="preferences" aria-controls="${this.id}-categories" aria-selected="${this.view === 'preferences'}" tabindex="${this.view === 'preferences' ? 0 : -1}">${escape(tr.categories)}</button>
        <button type="button" class="tab-trigger" role="tab" id="${this.id}-services-tab" data-cookie-action="services" aria-controls="${this.id}-services" aria-selected="${this.view === 'services'}" tabindex="${this.view === 'services' ? 0 : -1}">${escape(tr.services)}</button></div>
        <section class="tab-content" role="tabpanel" id="${this.id}-categories" aria-labelledby="${this.id}-categories-tab" ${this.view === 'services' ? 'hidden' : ''}>${this.categoryMarkup()}</section>
        <section class="tab-content" role="tabpanel" id="${this.id}-services" aria-labelledby="${this.id}-services-tab" ${this.view !== 'services' ? 'hidden' : ''}>${this.serviceMarkup()}</section></div>` : ''}
      <nav class="cookie-consent-links" aria-label="${escape(tr.moreInformation)}">${this.links()}</nav>
      </div><footer class="dialog-footer cookie-consent-footer">${!preferenceView ? button('preferences', tr.settings, 'outline') : button('save', tr.save, 'outline')}${button('deny', tr.denyAll)}${button('accept', tr.acceptAll)}</footer>`);
    q('[data-cookie-language]', this.dialog).val(this.state.language);
    for (const category of categories) {
      const services = this.config.cookieOrigins.filter(s => s.category === category && !s.disabled);
      const selected = services.filter(s => this.draft.has(s.id)).length;
      q(`[data-cookie-category="${category}"]`, this.dialog)
        .prop('checked', category === 'essential' || (services.length > 0 && selected === services.length))
        .prop('indeterminate', selected > 0 && selected < services.length);
    }
    // Native checked is a dirty form property after user input. Attribute
    // reconciliation alone cannot reset it when a discarded draft is reopened.
    for (const origin of this.config.cookieOrigins) {
      q(`[data-cookie-service="${origin.id}"]`, this.dialog).prop('checked', this.draft.has(origin.id));
    }
    q('.cookie-consent-floating', this.root).remove();
    if (this.config.showFloatingButton !== false) {
      q(this.root).append(`<button type="button" class="btn cookie-consent-floating" data-variant="outline" data-size="sm" data-ce-chrome data-cookie-action="preferences" aria-label="${escape(tr.settings)}" aria-haspopup="dialog">${escape(tr.settings)}</button>`);
    }
    this.bindTabKeys();
  }
  categoryMarkup(): string {
    const tr = this.messages();
    return categories.map(category => {
      const ids = this.config.cookieOrigins.filter(s => s.category === category && !s.disabled).map(s => s.id);
      const required = category === 'essential';
      const box = `${this.id}-category-${category}`;
      return `<div class="cookie-consent-row checkbox-item-block"><input class="checkbox" type="checkbox" id="${box}" data-cookie-category="${category}" ${required || (ids.length > 0 && ids.every(id => this.draft.has(id))) ? 'checked' : ''} ${required || ids.length === 0 ? 'disabled' : ''} aria-describedby="${box}-description"><div><label for="${box}" class="cookie-consent-label">${escape(tr.categoryNames[category])}${required ? ` <span class="badge" data-variant="secondary">${escape(tr.required)}</span>` : ''}</label><p class="field-description" id="${box}-description">${escape(tr.categoryDescriptions[category])}</p></div></div>`;
    }).join('');
  }
  serviceMarkup(): string {
    const tr = this.messages();
    return this.config.cookieOrigins.map(origin => {
      const url = safeUrl(localize(origin.url, this.state.language), this.doc);
      const data = origin.dataCollected?.[this.state.language] ?? origin.dataCollected?.en ?? Object.values(origin.dataCollected ?? {})[0] ?? [];
      const box = `${this.id}-service-${origin.id}`;
      return `<div class="cookie-consent-row checkbox-item-block"><input class="checkbox" type="checkbox" id="${box}" data-cookie-service="${origin.id}" ${this.draft.has(origin.id) ? 'checked' : ''} ${origin.category === 'essential' || origin.disabled ? 'disabled' : ''} aria-describedby="${box}-description"><div><label for="${box}" class="cookie-consent-label">${escape(origin.name)} <span class="badge" data-variant="outline">${escape(tr.categoryNames[origin.category])}</span></label>
        <p class="field-description" id="${box}-description">${escape(localize(origin.description, this.state.language))}</p>
        ${url ? `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(tr.moreInformation)}</a>` : ''}
        ${origin.domain ? `<p class="field-description cookie-consent-note">${escape(origin.domain)} · ${escape(tr.thirdParty)}</p>` : ''}
        ${data.length ? `<ul class="cookie-consent-data">${data.map(value => `<li class="badge" data-variant="secondary">${escape(value)}</li>`).join('')}</ul>` : ''}</div></div>`;
    }).join('');
  }
  bindTabKeys(): void {
    // A single delegated listener on root; no handlers attached to rendered rows.
    if (q(this.root).attr('data-cookie-keys') !== null) return;
    q(this.root).attr('data-cookie-keys', '');
    this.listen(this.root, 'keydown', event => {
      const e = event as KeyboardEvent;
      const target = e.target instanceof Element ? q(e.target).closest('[role="tab"]')[0] : undefined;
      if (!target || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const name: ConsentView = e.key === 'Home' ? 'preferences' : e.key === 'End' ? 'services' : this.view === 'services' ? 'preferences' : 'services';
      this.setState(name);
      q<HTMLElement>(`[data-cookie-action="${name}"]`, this.dialog)[0]?.focus();
    });
  }
  onClick(event: Event): void {
    if (event.target === this.dialog && this.dialog.matches(':modal')) { this.close(); return; }
    const target = event.target instanceof Element ? q(event.target).closest('[data-cookie-action]')[0] : undefined;
    if (!target) return;
    switch (q(target).attr('data-cookie-action')) {
      case 'accept': this.acceptAll(); break;
      case 'deny': this.denyAll(); break;
      case 'save': this.save(); break;
      case 'close': this.close(); break;
      case 'preferences': this.setState('preferences'); break;
      case 'services': this.setState('services'); break;
    }
  }
  onChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    if (q<HTMLElement>(target as HTMLElement).attr('data-cookie-language') !== null) { this.setLanguage(q<HTMLElement>(target as HTMLElement).val() as Language); return; }
    if (!(target instanceof HTMLInputElement)) return;
    const service = q(target).attr('data-cookie-service');
    const category = q(target).attr('data-cookie-category') as CookieCategory | null;
    const checked = Boolean(q(target).prop('checked'));
    if (service) {
      const origin = this.origin(service);
      if (origin.category !== 'essential' && !origin.disabled) {
        if (checked) this.draft.add(service);
        else this.draft.delete(service);
      }
    } else if (category && categories.includes(category) && category !== 'essential') {
      for (const origin of this.config.cookieOrigins.filter(s => s.category === category && !s.disabled)) {
        if (checked) this.draft.add(origin.id);
        else this.draft.delete(origin.id);
      }
    } else return;
    const focusKey = service ? `[data-cookie-service="${service}"]` : `[data-cookie-category="${category}"]`;
    this.repaint();
    q<HTMLElement>(focusKey, this.dialog)[0]?.focus();
  }

  updateTagsActivation(): void {
    if (this.destroyed) return;
    for (const [element, record] of this.gates) {
      if (!element.isConnected || !this.scope.contains(element)) {
        if (record.active) q(record.active).remove();
        record.handlers?.forEach(off => off());
        if (record.wrapper && !element.isConnected) q(record.wrapper).remove();
        this.gates.delete(element);
        resourceOwners.delete(element);
      }
    }
    for (const element of q<HTMLElement>('[data-cookie-consent]:not([data-cookie-consent-active])', this.scope)) {
      const id = q(element).attr('data-cookie-consent');
      const origin = this.config.cookieOrigins.find(s => s.id === id);
      // Unknown services remain inert, never implicitly accepted.
      if (!origin || !['SCRIPT', 'IFRAME'].includes(element.tagName)) continue;
      const owner = resourceOwners.get(element);
      if (owner && owner !== this) continue;
      resourceOwners.set(element, this);
      let record = this.gates.get(element);
      if (!record) {
        record = { service: origin.id, executed: executedScripts.has(element) };
        this.gates.set(element, record);
        if (element.tagName === 'SCRIPT' && !['text/plain', 'text'].includes(q(element).attr('type') ?? '')) {
          record.executed = true;
          this.error('markup', new Error(`cookie-consent: ${origin.id} script must be authored inert (type="text/plain")`));
        }
        if (element.tagName === 'IFRAME' && (q(element).attr('src') || q(element).attr('srcdoc'))) {
          this.error('markup', new Error(`cookie-consent: ${origin.id} iframe must have no src or srcdoc before consent`));
        }
      }
      if (element.tagName === 'SCRIPT') this.syncScript(element as HTMLScriptElement, record);
      else this.syncFrame(element as HTMLIFrameElement, record, origin);
    }
  }
  syncScript(script: HTMLScriptElement, record: GateRecord): void {
    if (!this.state.acceptedServices.includes(record.service)) {
      if (record.active) { q(record.active).remove(); record.active = undefined; }
      return;
    }
    // Exactly once per authored placeholder per document lifetime. On regrant
    // use an SDK-specific host integration/reload; executing scripts twice leaks.
    if (record.executed) return;
    const src = q(script).attr('data-consent-src');
    const url = src ? safeUrl(src, this.doc) : undefined;
    if (src && !url) { record.executed = true; this.error('url', new Error('cookie-consent: invalid script URL')); return; }
    const active = this.doc.createElement('script');
    q(active).attr('data-cookie-consent-active', this.id);
    const type = q(script).attr('data-consent-type') ?? 'text/javascript';
    if (!['text/javascript', 'module'].includes(type)) { record.executed = true; this.error('markup', new Error('cookie-consent: invalid script type')); return; }
    q(active).attr('type', type);
    for (const name of ['async', 'defer', 'integrity', 'crossorigin', 'referrerpolicy', 'nomodule']) {
      const value = q(script).attr(name);
      if (value !== null && value !== undefined) q(active).attr(name, value);
    }
    if (script.nonce) q(active).prop('nonce', script.nonce);
    if (url) q(active).attr('src', url);
    else q(active).text(q(script).text());
    // Mark before insertion: synchronous inline execution may re-enter the API.
    record.executed = true;
    executedScripts.add(script);
    record.active = active;
    q(script).after(active);
  }
  syncFrame(frame: HTMLIFrameElement, record: GateRecord, origin: CookieOrigin): void {
    const allowed = this.state.acceptedServices.includes(record.service);
    if (allowed) {
      const url = safeUrl(q(frame).attr('data-consent-src') ?? '', this.doc);
      if (url && q(frame).attr('src') !== url) q(frame).attr('src', url);
      if (record.overlay) q(record.overlay).prop('hidden', true);
      q(frame).prop('hidden', false);
      return;
    }
    if (q(frame).attr('src')) q(frame).attr('src', 'about:blank').attr('src', null);
    if (q(frame).attr('srcdoc')) q(frame).attr('srcdoc', null);
    q(frame).prop('hidden', true);
    // data-consent-placeholder="none": the page brings its own placeholder
    // (a poster with a play button) - no generated wrapper / overlay
    if (q(frame).attr('data-consent-placeholder') === 'none') return;
    if (!record.wrapper) {
      const wrapper = q('<div class="cookie-consent-embed"></div>')[0] as HTMLElement;
      q(frame).before(wrapper);
      q(frame).appendTo(wrapper);
      record.wrapper = wrapper;
      const overlay = q('<div class="cookie-consent-placeholder"></div>')[0] as HTMLElement;
      q(wrapper).append(overlay);
      record.overlay = overlay;
      this.renderOverlay(record, origin);
    }
    if (record.overlay) q(record.overlay).prop('hidden', false);
  }
  renderOverlay(record: GateRecord, origin: CookieOrigin): void {
    if (!record.overlay) return;
    const tr = this.messages();
    record.handlers?.forEach(off => off());
    q(record.overlay).html(`<p><strong>${escape(origin.name)}</strong> ${escape(tr.blocked)}</p><div class="cookie-consent-embed-actions"><button type="button" class="btn" data-size="sm" data-cookie-allow>${escape(tr.activate)}</button><button type="button" class="btn" data-variant="outline" data-size="sm" data-cookie-settings>${escape(tr.settings)}</button></div>`);
    const allow = q('[data-cookie-allow]', record.overlay);
    const settings = q('[data-cookie-settings]', record.overlay);
    const onAllow = () => this.acceptService(origin.id);
    const onSettings = () => this.open();
    allow.prop('disabled', Boolean(origin.disabled)).on('click', onAllow);
    settings.on('click', onSettings);
    record.handlers = [() => allow.off('click', onAllow), () => settings.off('click', onSettings)];
  }
  refreshOverlays(): void {
    for (const record of this.gates.values()) this.renderOverlay(record, this.origin(record.service));
  }
  destroy(): void {
    if (this.destroyed) return;
    this.close();
    this.observer.disconnect();
    this.off.forEach(off => off());
    this.saved?.destroy();
    // Destroy revokes active optional integrations; inert placeholders stay.
    const previous = this.state;
    this.state = this.makeState([]);
    this.revoke(previous);
    for (const [element, record] of this.gates) {
      if (record.active) q(record.active).remove();
      record.handlers?.forEach(off => off());
      if (element.tagName === 'IFRAME') {
        q(element).attr('src', 'about:blank').attr('src', null).prop('hidden', false);
        if (record.wrapper) { q(record.wrapper).before(element); q(record.wrapper).remove(); }
      }
      resourceOwners.delete(element);
    }
    q(this.dialog).remove();
    q('.cookie-consent-floating', this.root).remove();
    q(this.root).attr('data-init', null).attr('data-cookie-consent-ready', null).attr('data-cookie-keys', null);
    q(this.root).attr('data-cookie-consent-destroyed', '');
    unbindComponent(this.root);
    delete this.root.api;
    controllers.delete(this.root);
    this.destroyed = true;
  }
}

function controllerFor(el: HTMLElement): Controller {
  const instance = controllers.get(el);
  if (!instance) throw new Error('cookie-consent: initialize the element first');
  return instance;
}

function triggerStateChange(el: HTMLElement, stateName: ConsentView, config: { language?: Language }): void {
  controllerFor(el).applyView(stateName, config);
}

export const cookieConsentApi = componentState<HTMLElement>({
  component: 'cookie-consent',
  states: cookieConsentStates,
  apply: (el, state) => triggerStateChange(el, state.name as ConsentView, state.config as { language?: Language }),
  read: (el) => controllerFor(el).viewState(),
  // every view lives in the dialog the controller paints and appends at
  // runtime (data-ce-chrome) - the authored host is the markup of each state
});

export const cookieConsent = {
  /**
   * Start a consent manager on root with a config (cookieOrigins, texts, storage ...); a second call returns the same one.
   * @param root - the .cookie-consent element (connected to the document)
   * @param config - the services, texts, storage and callbacks
   * @returns its instance - also root's el.api
   */
  create(root: HTMLElement, config: CookieConsentConfig): CookieConsentInstance {
    if (controllers.has(root)) return controllers.get(root)!;
    if (!root.isConnected) throw new Error('cookie-consent: root must be connected');
    if (!q(root).hasClass('cookie-consent')) q(root).addClass('cookie-consent');
    q(root).attr('data-cookie-consent-destroyed', null);
    const controller = new Controller(root, config);
    controllers.set(root, controller);
    return controller;
  },
  /**
   * The instance a root already has.
   * @param root - the .cookie-consent element
   * @returns its instance, undefined before create()
   */
  get(root: HTMLElement): CookieConsentInstance | undefined { return controllers.get(root); },
  init,
};

df$.cookieConsentApi = cookieConsentApi;
df$.cookieConsentStates = cookieConsentStates;
df$.cookieConsent = cookieConsent;

/** Declarative configuration: direct child script[type=application/json]. */
function init(): void {
  // Element ownership, not cloned attributes, is the initialization guard:
  // the docs editor serializes data-init and later materializes a fresh host.
  for (const root of q<HTMLElement>('.cookie-consent:not([data-cookie-consent-destroyed]):not([data-cookie-consent-error])')) {
    if (controllers.has(root)) continue;
    const configTag = q('script[type="application/json"][data-cookie-consent-config]', root)[0];
    if (!configTag) continue;
    try {
      cookieConsent.create(root, JSON.parse(q(configTag).text()) as CookieConsentConfig);
    } catch (error) {
      q(root).attr('data-init', '').attr('data-cookie-consent-error', '');
      root.dispatchEvent(new CustomEvent<CookieConsentErrorDetail>('cookie-consent:error', { bubbles: true, detail: { kind: 'config', error } }));
      console.error(error);
    }
  }
  for (const [root, instance] of controllers) if (!root.isConnected) instance.destroy();
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
