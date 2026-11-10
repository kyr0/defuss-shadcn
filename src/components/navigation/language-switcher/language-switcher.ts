// -- Language Switcher --------------------------------------------------------------------------------
// Picks the page's language from the languages it supports (data-languages: BCP 47 tags - "en de", "en-GB en-US
// pt-BR pt-PT"). It knows every language CLD3 detects (107 codes): the English name, the name in the language itself
// and the region whose flag stands for it - the names in any other language come from the browser's
// Intl.DisplayNames (CLDR), the preseeded names when the browser has none. A tag with a region is that dialect: its
// name says so ("British English") and its flag is the region's. Three faces, each of shipped components the runtime
// writes into the element: a Combobox (the default - a searchable list, each language in its own name and in the
// page's), a Swap (data-variant="swap" - one click moves on to the next language) and radio items for a Dropdown
// Menu (data-variant="menu"). data-display shows the
// language's name (label), its code (code) or the flag alone (icon). Flags are SVGs (flag-icons, MIT, pinned on
// jsDelivr - configure({ flags }) to self-host) in a shape, a scale and a finish of data-flag-shape / -size / -style;
// data-flag="none" leaves them out. bind(el, i18n) ties it to a defuss-i18n instance both ways.
//
// VERIFIED: (language-switcher.e2e) the Combobox lists only the supported languages, a pick changes the state and
// fires language-change, the Swap moves on with each click, and bind() follows and drives a defuss-i18n instance.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js -
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();

/** default = the chosen language shown; open = the Combobox's list shown (the Swap has no list). */
const languageSwitcherStates = ['default', 'open'];

/** setState() configs per state. */
export interface LanguageSwitcherStateConfigs {
  /** The chosen language shown. */
  default: {
    /** the language: one of data-languages (a BCP 47 tag) */
    value?: string;
  };
  /** The list of languages shown (the Combobox face). */
  open: {
    /** the language: one of data-languages (a BCP 47 tag) */
    value?: string;
  };
}

/** What language-change carries. */
interface LanguageSwitcherChangeDetail {
  /** the language chosen now (a BCP 47 tag) */
  value: string;
  /** the language before */
  previous: string;
  /** its name in itself ("Deutsch") */
  name: string;
  /** its writing direction */
  dir: 'ltr' | 'rtl';
}

/** One language the switcher knows. */
export interface LanguageInfo {
  /** its CLD3 code (a BCP 47 tag; iw is Hebrew, he works too) */
  code: string;
  /** its name in English */
  english: string;
  /** its name in itself */
  native: string;
  /** the region whose flag stands for it (ISO 3166, lowercase; a subdivision like gb-wls); '' for none */
  region: string;
  /** its writing direction */
  dir: 'ltr' | 'rtl';
}

/** What a defuss-i18n instance (or any locale store of that shape) offers bind(). */
export interface LanguageSwitcherI18n {
  /** the locale shown now */
  readonly locale: string;
  /** switches the locale */
  setLocale(locale: string): unknown;
  /** follows locale changes; returns the function that stops it */
  subscribe?(listener: (snapshot: { locale: string }) => void): () => void;
}

/** configure()'s options. */
export interface LanguageSwitcherOptions {
  /** the flag URL pattern: {shape} becomes 4x3 or 1x1, {region} the region (default: flag-icons 7.2.3 on jsDelivr) */
  flags?: string;
}

// -- the languages CLD3 detects: code, English name, its own name, the flag's region ------------------------------
// VERIFIED: (github.com/google/cld3 README, 2026-11-09) the supported-languages table lists these 107 codes, script
// variants (-Latn) included; iw is the code CLD3 gives Hebrew. The regions are a convention for the flag only - a
// language is not a country, which is why every flag can be switched off or replaced per language.
const SEED = `af Afrikaans|Afrikaans|za
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

const RTL = new Set(['ar', 'fa', 'iw', 'he', 'ps', 'sd', 'ur', 'yi']);
const LANGUAGES: LanguageInfo[] = SEED.split('\n').map((line) => {
  const sp = line.indexOf(' ');
  const code = line.slice(0, sp);
  const [english, native, region] = line.slice(sp + 1).split('|');
  return { code, english, native, region, dir: RTL.has(code) ? 'rtl' : 'ltr' };
});
const BY_CODE = new Map(LANGUAGES.map((l) => [l.code.toLowerCase(), l]));
const ALIAS: Record<string, string> = { he: 'iw', nb: 'no', tl: 'fil' };

const settings: Required<LanguageSwitcherOptions> = {
  flags: 'https://cdn.jsdelivr.net/npm/flag-icons@7.2.3/flags/{shape}/{region}.svg',
};

const resolve = (t) => (typeof t === 'string' ? (dfDollar('#' + CSS.escape(t)).get(0) ?? dfDollar(t).get(0)) : t);
const esc = (v: unknown): string =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

/** a tag's parts: the language, the script, the region (lowercase) */
function partsOf(tag: string): { language: string; script: string; region: string } {
  try {
    const l = new Intl.Locale(tag);
    return { language: l.language, script: l.script ?? '', region: (l.region ?? '').toLowerCase() };
  } catch {
    const [language = '', ...rest] = tag.split(/[-_]/);
    return {
      language: language.toLowerCase(),
      script: rest.find((p) => p.length === 4) ?? '',
      region: (rest.find((p) => p.length === 2) ?? '').toLowerCase(),
    };
  }
}
/** the preseeded entry of a tag: itself, its language + script, its language (aliases followed) */
function seedOf(tag: string): LanguageInfo | undefined {
  const { language, script } = partsOf(tag);
  const lang = ALIAS[language] ?? language;
  return (
    BY_CODE.get(tag.toLowerCase()) ??
    (script ? BY_CODE.get(`${lang}-${script}`.toLowerCase()) : undefined) ??
    BY_CODE.get(lang)
  );
}
const capitalize = (name: string, locale: string): string => {
  if (!name) return name;
  let first: string;
  try {
    first = name.charAt(0).toLocaleUpperCase(locale);
  } catch {
    first = name.charAt(0).toUpperCase();
  }
  return first + name.slice(1);
};
const displayCache = new Map<string, Intl.DisplayNames | null>();
function displayNames(locale: string, type: 'language' | 'region'): Intl.DisplayNames | null {
  const key = `${type}:${locale}`;
  if (!displayCache.has(key)) {
    let d: Intl.DisplayNames | null = null;
    try {
      d = new Intl.DisplayNames([locale], { type, fallback: 'none' });
      // a browser without the locale's names falls back to its own language - those are not the names asked for
      if (new Intl.Locale(d.resolvedOptions().locale).language !== partsOf(locale).language) d = null;
    } catch {
      d = null;
    }
    displayCache.set(key, d);
  }
  return displayCache.get(key) ?? null;
}
/** a CLDR name, or undefined - of() throws on a malformed code (`en_US`), which must not stop the switcher drawing
 *  VERIFIED: (bun, 2026-11-09) Intl.DisplayNames#of('en_US') throws RangeError "argument is not a language id" */
function cldrName(locale: string, type: 'language' | 'region', code: string): string | undefined {
  try {
    return displayNames(locale, type)?.of(code);
  } catch {
    return undefined;
  }
}
/** a language's name in a locale: the preseeded names of a CLD3 code in itself and in English (the same in every
 *  browser), the browser's CLDR names for every other pair, the preseeded ones (+ the region) when it has none */
function nameIn(tag: string, locale: string): string {
  const seed = seedOf(tag);
  const { region } = partsOf(tag);
  const self = partsOf(locale).language === partsOf(tag).language;
  // a preseeded code without a region named in itself or in English: the seed is the reference
  if (seed && !region && seed.code.toLowerCase() === tag.toLowerCase().replace(/^he$/, 'iw')) {
    if (self) return capitalize(seed.native, tag);
    if (partsOf(locale).language === 'en') return seed.english;
  }
  const n = cldrName(locale, 'language', tag.replace(/^iw\b/, 'he'));
  if (n && n.toLowerCase() !== tag.toLowerCase()) return capitalize(n, locale);
  const base = seed ? (self ? capitalize(seed.native, tag) : seed.english) : tag;
  if (!region) return base;
  const regionName = cldrName(locale, 'region', region.toUpperCase()) ?? region.toUpperCase();
  return `${base} (${regionName})`;
}

/** the region whose flag stands for a tag: data-flags' override, the tag's own region, else the seed's */
function regionFor(el: HTMLElement, tag: string): string {
  for (const pair of (el.dataset.flags || '').split(/\s+/).filter(Boolean)) {
    const [t, r] = pair.split(':');
    if (t && t.toLowerCase() === tag.toLowerCase()) return (r || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  }
  return (partsOf(tag).region || seedOf(tag)?.region || '').replace(/[^a-z0-9-]/g, '');
}

// -- the markup the runtime writes ----------------------------------------------------------------------------

const languagesOf = (el: HTMLElement): string[] => {
  const list = (el.dataset.languages || 'en').split(/[\s,]+/).filter(Boolean);
  return list.length ? list : ['en'];
};
const valueOf = (el: HTMLElement, languages = languagesOf(el)): string => {
  const v = (el.dataset.value || '').toLowerCase();
  return languages.find((l) => l.toLowerCase() === v) ?? languages[0];
};
const nextOf = (el: HTMLElement, tag: string): string => {
  const languages = languagesOf(el);
  return languages[(languages.indexOf(tag) + 1) % languages.length];
};
const codeLabel = (tag: string): string => {
  const { language, region } = partsOf(tag);
  return (region ? `${language}-${region}` : language).toUpperCase();
};
const dirOf = (tag: string): 'ltr' | 'rtl' => (RTL.has(partsOf(tag).language) ? 'rtl' : 'ltr');
const idPart = (tag: string): string => tag.toLowerCase().replace(/[^a-z0-9-]/g, '-');

/** a flag: the SVG laid over the language's code (a missing or blocked flag shows the code) */
function flagHtml(el: HTMLElement, tag: string): string {
  if (el.dataset.flag === 'none') return '';
  const region = regionFor(el, tag);
  const shape = ['square', 'circle', 'squircle'].includes(el.dataset.flagShape || '') ? '1x1' : '4x3';
  const url = region ? settings.flags.replace('{shape}', shape).replace('{region}', region) : '';
  const image = region ? ` data-region="${esc(region)}" style="--language-switcher-flag: url('${esc(url)}')"` : '';
  return `<span class="language-switcher-flag" data-code="${esc(partsOf(tag).language.toUpperCase())}"${image} aria-hidden="true"></span>`;
}
const GLOBE =
  '<svg class="language-switcher-icon" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>';
const CHEVRON =
  '<svg class="combobox-chevron" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>';

/** what the trigger or a Swap face shows for a language: its flag (the globe without one) and its name or code */
function faceHtml(el: HTMLElement, tag: string): string {
  const display = el.dataset.display || 'label';
  const flag = flagHtml(el, tag) || (display === 'icon' ? GLOBE : '');
  const text =
    display === 'icon'
      ? ''
      : display === 'code'
        ? codeLabel(tag)
        : el.dataset.names === 'ui'
          ? nameIn(tag, valueOf(el))
          : nameIn(tag, tag);
  return `${flag}${text ? `<span class="language-switcher-label" lang="${esc(tag)}" dir="${dirOf(tag)}">${esc(text)}</span>` : ''}`;
}
/** the switcher's name: data-label, else the root's aria-label (translatable with defuss-i18n), else "Language" */
const labelOf = (el: HTMLElement): string => el.dataset.label || el.getAttribute('aria-label') || 'Language';
const ariaOf = (el: HTMLElement, tag: string): string => `${labelOf(el)}: ${nameIn(tag, tag)}`;
/** an option's two names, each with its language: in itself and in the language shown (data-names orders them) */
function namesOf(
  el: HTMLElement,
  tag: string,
  ui: string,
): { name: string; lang: string; alt: string; altLang: string } {
  const own = nameIn(tag, tag),
    shown = nameIn(tag, ui);
  if (el.dataset.names === 'native') return { name: own, lang: tag, alt: '', altLang: tag };
  if (el.dataset.names === 'ui') return { name: shown, lang: ui, alt: shown === own ? '' : own, altLang: tag };
  return { name: own, lang: tag, alt: shown === own ? '' : shown, altLang: ui };
}
const optionInner = (el: HTMLElement, tag: string, ui: string): string => {
  const n = namesOf(el, tag, ui);
  return `${flagHtml(el, tag)}<span class="language-switcher-name" lang="${esc(n.lang)}" dir="${dirOf(n.lang)}">${esc(n.name)}</span><span class="language-switcher-alt" lang="${esc(n.altLang)}" dir="${dirOf(n.altLang)}"${n.alt ? '' : ' hidden'}>${esc(n.alt)}</span>`;
};

/** the Combobox face: a trigger and a searchable list of the supported languages */
function comboboxHtml(el: HTMLElement, uid: string): string {
  const languages = languagesOf(el);
  const value = valueOf(el, languages);
  const search = el.dataset.search || 'Search languages...';
  const options = languages
    .map(
      (tag) =>
        `<div role="option" id="${uid}-${idPart(tag)}" class="combobox-item language-switcher-option" data-value="${esc(tag)}" aria-selected="${tag === value}">${optionInner(el, tag, value)}</div>`,
    )
    .join('');
  const icon = (el.dataset.display || 'label') === 'icon';
  return `<div class="combobox language-switcher-combobox" data-ce-chrome${el.dataset.size ? ` data-size="${esc(el.dataset.size)}"` : ''}>
<button type="button" class="btn combobox-trigger" data-variant="${esc(el.dataset.buttonVariant || 'ghost')}"${icon ? ' data-size="icon"' : ''} aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(ariaOf(el, value))}" aria-controls="${uid}-popover"><span class="combobox-value">${faceHtml(el, value)}</span>${icon ? '' : CHEVRON}</button>
<div id="${uid}-popover" class="combobox-content language-switcher-content" popover>
<div class="combobox-search"${languages.length > 7 ? '' : ' data-quiet'}><input class="combobox-search-input" type="text" role="combobox" autocomplete="off" aria-expanded="true" aria-controls="${uid}-listbox" aria-activedescendant="" aria-autocomplete="list" placeholder="${esc(search)}" aria-label="${esc(search)}"></div>
<div id="${uid}-listbox" role="listbox" class="combobox-listbox" aria-label="${esc(labelOf(el))}"><div class="combobox-empty" hidden>${esc(el.dataset.empty || 'No language found.')}</div>${options}</div>
</div>
</div>`;
}

/** the Swap face: the language shown on one side, the next one on the other - a click turns it over */
function swapHtml(el: HTMLElement): string {
  const value = valueOf(el);
  return `<label class="swap language-switcher-swap"${el.dataset.swap === 'fade' ? '' : ` data-variant="${esc(el.dataset.swap || 'flip')}"`} data-ce-chrome${el.dataset.size ? ` data-size="${esc(el.dataset.size)}"` : ''}>
<input type="checkbox" role="button" aria-label="${esc(swapLabel(el, value))}">
<span class="swap-off">${faceHtml(el, value)}</span>
<span class="swap-on">${faceHtml(el, nextOf(el, value))}</span>
</label>`;
}
/** the Menu face: one radio item per language for a Dropdown Menu, which moves through them, checks the one picked
 *  and closes nothing - the root (role="group") is their group */
function menuHtml(el: HTMLElement): string {
  const value = valueOf(el);
  return `<div class="language-switcher-menu" data-ce-chrome>${languagesOf(el)
    .map(
      (tag) =>
        `<button type="button" class="dropdown-item dropdown-radio language-switcher-item" role="menuitemradio" tabindex="-1" aria-checked="${tag === value}" data-value="${esc(tag)}">${optionInner(el, tag, value)}</button>`,
    )
    .join('')}</div>`;
}
const swapLabel = (el: HTMLElement, value: string): string => {
  const next = nextOf(el, value);
  return `${ariaOf(el, value)} - ${el.dataset.next || 'next'}: ${nameIn(next, next)}`;
};

// -- drawing: the whole face when its attributes change, the value in place -------------------------------------

const STRUCTURE = [
  'languages',
  'variant',
  'display',
  'names',
  'flag',
  'flags',
  'flagShape',
  'size',
  'buttonVariant',
  'search',
  'empty',
  'next',
  'swap',
] as const;
const structureOf = (el: HTMLElement): string => STRUCTURE.map((k) => el.dataset[k] ?? '').join('|');
const chromeOf = (el: HTMLElement): HTMLElement | undefined =>
  dfDollar(el).children('[data-ce-chrome]').get(0) as HTMLElement | undefined;

/** draws the whole face the attributes ask for */
function draw(el: HTMLElement): void {
  const uid = el.id ? `${el.id}-ls` : (el._lsId ??= `language-switcher-${++sequence}`);
  const focused = el.contains(document.activeElement);
  dfDollar(el).children('[data-ce-chrome]').remove();
  const variant = el.dataset.variant;
  dfDollar(el).append(
    dfDollar(variant === 'swap' ? swapHtml(el) : variant === 'menu' ? menuHtml(el) : comboboxHtml(el, uid)),
  );
  el._lsStructure = structureOf(el);
  el._lsValue = valueOf(el);
  if (focused)
    (
      dfDollar(el).find('.combobox-trigger, .swap > input, .language-switcher-item[aria-checked="true"]').get(0) as
        | HTMLElement
        | undefined
    )?.focus();
}
let sequence = 0;

/** shows the value and the names without drawing the face again (focus, the open list and the Swap's side stay) */
function update(el: HTMLElement): void {
  if (el._lsStructure !== structureOf(el) || !chromeOf(el)) return draw(el);
  const value = valueOf(el);
  const changed = el._lsValue !== value;
  el._lsValue = value;
  const chrome = dfDollar(chromeOf(el));
  if (el.dataset.variant === 'swap') {
    const input = chrome.find(':scope > input').get(0) as HTMLInputElement;
    if (changed) {
      // the side showing gets the value, the side turned away the language after it
      const [shown, hidden] = input.checked ? ['.swap-on', '.swap-off'] : ['.swap-off', '.swap-on'];
      chrome.find(`:scope > ${shown}`).html(faceHtml(el, value));
      chrome.find(`:scope > ${hidden}`).html(faceHtml(el, nextOf(el, value)));
    }
    dfDollar(input).attr('aria-label', swapLabel(el, value));
    return;
  }
  if (el.dataset.variant === 'menu') {
    if (!changed) return;
    // the items stay (focus, the menu's highlight); the check and the names follow the language shown
    chrome.find('.language-switcher-item').each((_i, item: HTMLElement) => {
      const tag = item.dataset.value || '';
      dfDollar(item)
        .attr('aria-checked', String(tag === value))
        .html(optionInner(el, tag, value));
    });
    return;
  }
  chrome.find('.combobox-trigger').attr('aria-label', ariaOf(el, value));
  chrome.find('[role="listbox"]').attr('aria-label', labelOf(el));
  if (!changed) return;
  chrome.find('.combobox-value').html(faceHtml(el, value)).attr('data-placeholder', null);
  // the options stay (the Combobox holds them); their names follow the language shown
  chrome.find('.language-switcher-option').each((_i, option: HTMLElement) => {
    const tag = option.dataset.value || '';
    dfDollar(option)
      .attr('aria-selected', String(tag === value))
      .html(optionInner(el, tag, value));
  });
}

/** chooses a language of data-languages; announce = fire language-change */
function choose(el: HTMLElement, tag: string, announce = true): boolean {
  const languages = languagesOf(el);
  const next = languages.find((l) => l.toLowerCase() === String(tag).toLowerCase());
  if (!next) return false;
  const previous = valueOf(el, languages);
  if (el.dataset.value !== next) dfDollar(el).attr('data-value', next);
  update(el);
  if (announce && next !== previous)
    // Fires when the user (or choose()) picks another language: the one chosen, the one before, its own name and
    // its direction - bind() turns it into the i18n locale.
    el.dispatchEvent(
      new CustomEvent<LanguageSwitcherChangeDetail>('language-change', {
        bubbles: true,
        detail: { value: next, previous, name: nameIn(next, next), dir: dirOf(next) },
      }),
    );
  return true;
}

// -- the state ----------------------------------------------------------------------------------------------

const popoverOf = (el: HTMLElement): HTMLElement | undefined =>
  dfDollar(el).find(':scope > .language-switcher-combobox > .combobox-content').get(0) as HTMLElement | undefined;
const isOpen = (el: HTMLElement): boolean => {
  try {
    return !!popoverOf(el)?.matches(':popover-open');
  } catch {
    return false;
  }
};

/** The markup of a state: the language chosen is data-value. The list ('open') is the runtime's own chrome. */
function applyMarkup(el: HTMLElement, _name: string, config: { value?: string } | undefined) {
  const languages = languagesOf(el);
  const value = languages.find((l) => l.toLowerCase() === String(config?.value ?? '').toLowerCase());
  if (value) dfDollar(el).attr('data-value', value);
}

/** UI side of a state: the language, then the list shown (open) or hidden (default) */
function triggerStateChange(el: HTMLElement, name: string, config: { value?: string }) {
  if (config?.value) choose(el, config.value, false);
  const popover = popoverOf(el);
  if (!popover) return;
  if (name === 'open' && !isOpen(el)) (dfDollar(el).find('.combobox-trigger').get(0) as HTMLElement)?.click();
  else if (name !== 'open' && isOpen(el)) popover.hidePopover();
}

export const languageSwitcherApi = componentState({
  component: 'language-switcher',
  states: languageSwitcherStates,
  mergeConfig: true,
  apply: (el, state) => triggerStateChange(el, state.name, state.config as { value?: string }),
  // the user picks and opens the list without setState
  read: (el) => ({ name: isOpen(el) ? 'open' : 'default', config: { value: valueOf(el) } }),
  markup: (el, state) => applyMarkup(el, state.name, state.config as { value?: string }),
});

df$.languageSwitcherApi = languageSwitcherApi;
df$.languageSwitcherStates = languageSwitcherStates;

// -- init --------------------------------------------------------------------------------------------------

function init() {
  dfDollar('.language-switcher:not([data-init])').each((_i, el: HTMLElement) => {
    el.dataset.init = '';
    // the language shown is part of the markup from the start (render() writes it in every state)
    if (!el.dataset.value || valueOf(el) !== el.dataset.value) dfDollar(el).attr('data-value', valueOf(el));
    draw(el);
    // the Combobox: a pick is the language (a pick of the shown one changes nothing)
    dfDollar(el).on('combobox:change', (e: Event) => {
      const value = (e as CustomEvent<{ values: string[] }>).detail?.values?.[0];
      el._lsValue = '';
      if (!value || !choose(el, value)) update(el);
      languageSwitcherApi.commit(el, isOpen(el) ? 'open' : 'default', { value: valueOf(el) });
    });
    // the Swap: every click turns it over to the next language
    dfDollar(el).on('change', (e: Event) => {
      const input = e.target as HTMLInputElement;
      if (!input.matches('.language-switcher-swap > input') || input.closest('.language-switcher') !== el) return;
      choose(el, nextOf(el, valueOf(el)));
      languageSwitcherApi.commit(el, 'default', { value: valueOf(el) });
    });
    // the Menu: an item picked - through the Dropdown Menu (click, Enter, Space) or a click outside one
    const pick = (item: EventTarget | null | undefined) => {
      const it = item as HTMLElement | null;
      if (!it?.matches?.('.language-switcher-item') || it.closest('.language-switcher') !== el) return;
      el._lsValue = '';
      if (!choose(el, it.dataset.value || '')) update(el);
      languageSwitcherApi.commit(el, 'default', { value: valueOf(el) });
    };
    dfDollar(el).on('dropdown:select', (e: Event) => pick((e as CustomEvent<{ item: HTMLElement }>).detail?.item));
    dfDollar(el).on('click', (e: Event) => {
      const item = (e.target as HTMLElement | null)?.closest?.('.language-switcher-item');
      if (item && !item.closest('[role="menu"]')) pick(item);
    });
    // a checkbox in the role of a button: Enter turns it over too
    dfDollar(el).on('keydown', (e: KeyboardEvent) => {
      const input = e.target as HTMLInputElement;
      if (e.key !== 'Enter' || !input.matches?.('.language-switcher-swap > input')) return;
      e.preventDefault();
      input.click();
    });
    // the list opening and closing is the state
    el.addEventListener(
      'toggle',
      () => languageSwitcherApi.commit(el, isOpen(el) ? 'open' : 'default', { value: valueOf(el) }),
      true,
    );
    // attributes the page changes (a translation writes data-label, a page adds a language) show at once
    new MutationObserver(() => update(el)).observe(el, { attributes: true, attributeFilter: OBSERVED });
    bindComponent(el, languageSwitcherApi, { name: 'default', config: { value: valueOf(el) } });
  });
}
const OBSERVED = [
  'data-value',
  'data-label',
  'aria-label',
  ...STRUCTURE.map((k) => 'data-' + k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())),
];

// -- df$.shadcn.languageSwitcher: the imperative surface --------------------------------------------------------

df$.languageSwitcher = {
  /**
   * Every language the switcher knows: the 107 CLD3 codes with their English name, their own name, the region of
   * their flag and their direction.
   * @returns a copy of the list
   */
  languages: (): LanguageInfo[] => LANGUAGES.map((l) => ({ ...l })),
  /**
   * A language's name in a locale - the preseeded names for a CLD3 code in itself and in English, the browser's
   * (CLDR) names for every other pair, the preseeded ones when the browser has none.
   * @param tag - the language (a BCP 47 tag: "de", "de-AT", "zh-Latn")
   * @param locale - the language to name it in (default: the language itself)
   * @returns the name, capitalized for the start of a label
   */
  name: (tag: string, locale?: string): string => nameIn(tag, locale ?? tag),
  /**
   * The region whose flag stands for a language: its own region, else the preseeded one.
   * @param tag - the language (a BCP 47 tag)
   * @returns the region (ISO 3166, lowercase; '' for a language without one, like Esperanto)
   */
  region: (tag: string): string => partsOf(tag).region || seedOf(tag)?.region || '',
  /**
   * Chooses a language of data-languages as a click would: the face changes and language-change fires.
   * @param target - the .language-switcher element, its id or a selector
   * @param tag - the language
   * @returns false when the switcher does not offer it
   */
  choose: (target: string | HTMLElement, tag: string): boolean => {
    const el = resolve(target);
    if (!el || !choose(el, tag)) return false;
    languageSwitcherApi.commit(el, isOpen(el) ? 'open' : 'default', { value: valueOf(el) });
    return true;
  },
  /**
   * Ties the switcher to a defuss-i18n instance both ways: a pick sets its locale, a locale set elsewhere moves the
   * switcher (quietly - no language-change).
   * @param target - the .language-switcher element, its id or a selector
   * @param i18n - the instance (createI18n) - anything with locale, setLocale() and subscribe()
   * @returns a function that unties them
   */
  bind: (target: string | HTMLElement, i18n: LanguageSwitcherI18n): (() => void) => {
    const el = resolve(target);
    if (!el || !i18n) return () => {};
    const follow = (locale: string) => {
      if (locale && locale.toLowerCase() !== valueOf(el).toLowerCase() && choose(el, locale, false))
        languageSwitcherApi.commit(el, isOpen(el) ? 'open' : 'default', { value: valueOf(el) });
    };
    follow(i18n.locale);
    const onChange = (e: Event) => {
      const value = (e as CustomEvent<LanguageSwitcherChangeDetail>).detail.value;
      if (value !== i18n.locale) i18n.setLocale(value);
    };
    el.addEventListener('language-change', onChange);
    const stop = i18n.subscribe?.((snapshot) => follow(snapshot.locale));
    return () => {
      el.removeEventListener('language-change', onChange);
      stop?.();
    };
  },
  /**
   * Where the flags come from - set it before the first switcher draws (to self-host the SVGs).
   * @param options - the flag URL pattern
   */
  configure: (options: LanguageSwitcherOptions): void => {
    if (options?.flags) settings.flags = options.flags;
  },
};

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
