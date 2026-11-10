---
name: Language Switcher
type: MOL
section: navigation
why: The shipped Combobox (searchable listbox, keys, light dismiss), Swap (one checkbox, CSS faces) or a Dropdown Menu's radio items written by the runtime from one element - the 107 CLD3 languages are preseeded, Intl.DisplayNames names any other pair, flags are cached SVG files.
when: Switching the page's language in a site header, a footer, a toolbar or an app's settings - the page lists the languages it supports; for a free choice among many values that are not languages, use a Combobox.
where: dist/components/language-switcher/language-switcher.css + dist/components/language-switcher/language-switcher.js
supportedStates: default, open
---

# Language Switcher

## Native basis

One `<div class="language-switcher">` that names the languages the page supports (`data-languages`, BCP 47 tags)
and the one shown (`data-value`). The runtime writes a shipped component into it: a **Combobox** (`popover`
listbox with a search field - the default), a **Swap** (`data-variant="swap"`: a checkbox whose faces show the
language and the next one; each click moves on) or the **radio items of a Dropdown Menu** (`data-variant="menu"`:
one `menuitemradio` per language, for a user or settings menu). The names come from a preseeded table of every language CLD3
detects and from the browser's `Intl.DisplayNames`; the flags are SVGs laid over the language code.

## Native Web APIs

- [`Intl.DisplayNames`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DisplayNames) - a language's or a dialect's name in any other language (CLDR data in the browser)
- [`Intl.Locale`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale) - splits a tag into language, script and region (`de-AT`, `zh-Latn`)
- [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) - the Combobox's list: top layer, light dismiss, Escape
- [CSS Anchor Positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning) - the list placed under the trigger, `flip-inline` / `flip-block` at the viewport's edges
- [`<input type="checkbox">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/checkbox) + [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) - the Swap's faces turn over with no script
- [`lang`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/lang) / [`dir`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/dir) - each language's name is marked up in its own language and direction
- [`attr()`](https://developer.mozilla.org/en-US/docs/Web/CSS/attr) - the language code under a flag, shown when the flag image is missing
- [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) - `language-change` for the page and for defuss-i18n
- [WAI-ARIA Combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) - listbox popup, `aria-activedescendant`, arrows, Enter, Escape
- [WAI-ARIA Menu pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) - `menuitemradio` items in a `role="group"`: the Dropdown Menu's arrows, Enter / Space and checks
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion), [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast), [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) - no flag motion, a stronger flag edge, a system-color frame

## Structure

```html
<div class="language-switcher" id="lang" data-languages="en de fr es" data-value="en" data-label="Language"></div>
```

The runtime writes the face (marked `data-ce-chrome`) into the element - a [Combobox](../../forms-inputs/combobox/component-skill.md)
whose trigger is a [Button](../../actions/button/component-skill.md), or a [Swap](../../actions/swap/component-skill.md):

```html
<div class="language-switcher" data-languages="en de" data-value="en" data-variant="swap" data-display="code"></div>
```

In a [Dropdown Menu](../dropdown/component-skill.md) the root is a radio group of the menu (`role="group"` and a
name); the runtime writes one `dropdown-item dropdown-radio` per language, the menu moves through them, checks the
one picked and stays open:

```html
<div id="me-menu" role="menu" popover class="dropdown-content">
  <button role="menuitem" class="dropdown-item" tabindex="-1">My issues</button>
  <div class="dropdown-separator" role="separator"></div>
  <div class="dropdown-label">Language</div>
  <div class="language-switcher" role="group" aria-label="Language" data-variant="menu" data-languages="en de" data-value="en"></div>
</div>
```

Tie it to defuss-i18n once; a pick sets the locale, a locale set elsewhere moves the switcher:

```html
<script type="module">
  import { createI18n } from 'https://cdn.jsdelivr.net/npm/defuss-i18n@0.2.0/dist/core.js';
  const locale = createI18n({ locale: 'en', fallback: ['en'] });
  df$.shadcn.languageSwitcher.bind('lang', locale);
</script>
```

## Variants

| Attribute | Values | Behavior |
| --- | --- | --- |
| `data-variant` | *(none)*, `swap`, `menu` | a Combobox with every supported language (default); a Swap that moves on to the next language with each click; radio items for a Dropdown Menu (the root a `role="group"` inside the menu) |
| `data-display` | `label` (default), `code`, `icon` | the flag and the language's name; the flag and its code (`DE`, `DE-AT`); the flag alone (the globe without flags) |
| `data-names` | `both` (default), `native`, `ui` | the list shows each language in itself and in the language shown; only in itself; the trigger and the list in the language shown |
| `data-flag` | `none` | no flags (the icon display shows a globe) |
| `data-flag-shape` | `rect` (default, 4:3), `rounded`, `square`, `squircle`, `circle` | the flag's outline - the last three load the 1:1 drawings |
| `data-flag-style` | `flat` (default), `ring`, `shadow`, `glossy` | the flag's finish: as drawn, a hairline in the text color, a lifted edge, a light gloss |
| `data-align` | `end` | the list opens toward the start edge (a switcher at the end of a header) |
| `data-swap` | `flip` (default), `rotate`, `fade` | the Swap's turn (`fade` = the Swap's plain variant) |
| `data-button-variant` | a [Button](../../actions/button/component-skill.md) variant | the trigger's look (default `ghost`) |

## Sizes

| Attribute | Values | Behavior |
| --- | --- | --- |
| `data-size` | `xs`, `sm`, `md`, `lg`, `xl` | the Combobox's (or the Swap's: `sm`, `lg`) size ladder |
| `data-flag-size` | `xs` 0.75rem, `sm` 0.875rem, *(md)* 1rem, `lg` 1.25rem, `xl` 1.75rem | the flag's height (width 4:3 or 1:1) |

## Data attributes

| Attribute | Purpose |
| --- | --- |
| `data-languages` | the supported languages, BCP 47 tags separated by spaces: `en de`, a dialect `de-AT`, a script `zh-Latn`; only these are listed |
| `data-value` | the language shown (written by the runtime; the first language when absent or unknown) |
| `data-flags` | flag overrides per language: `en:us pt:br ca:es-ct` (a region or a subdivision; `de:` = no flag) |
| `aria-label` (with `role="group"`) or `data-label` | the accessible name's prefix ("Language: Deutsch") and the list's name (default "Language") - `aria-label` is the one defuss-i18n translates (`data-i18n-aria-label-de="Sprache"`) |
| `data-search` / `data-empty` | the search field's placeholder and the empty list's text (the search field shows from eight languages) |
| `data-next` | the Swap's word for the language it moves to ("next") |

## ARIA

| Attribute | Element | Notes |
| --- | --- | --- |
| `aria-label` | trigger | `data-label` + the language shown, in that language ("Language: Deutsch") |
| `aria-haspopup="listbox"`, `aria-expanded` | trigger | the Combobox's popup |
| `role="listbox"` / `role="option"`, `aria-selected` | list | one option selected - the language shown |
| `lang`, `dir` | names | every name in its own language and direction, so a screen reader pronounces it |
| `role="button"`, `aria-label` | Swap checkbox | "Language: English - next: Deutsch" (the checked state means nothing here) |
| `role="group"` + `aria-label` / `role="menuitemradio"`, `aria-checked` | Menu root / items | authored on the root; the runtime writes the items, the one shown checked |
| `aria-hidden="true"` | flags | decoration - the name carries the meaning |

## States

| State | Meaning |
| --- | --- |
| `default` | the language shown (`{ value }` - one of `data-languages`) |
| `open` | the Combobox's list shown (the Swap and the Menu have no list of their own) |

```js
document.querySelector('#lang').api.setState('default', { value: 'de' }); // quietly: no language-change
document.querySelector('#lang').api.setState('open');
df$.shadcn.languageSwitcher.choose('lang', 'fr'); // as a click: language-change fires
```

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type LanguageSwitcherState = 'default' | 'open'</code> - `setState(name, config)` takes the config of the state it names (`LanguageSwitcherStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The chosen language shown. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value?</code></td><td><code>string</code></td><td>the language: one of data-languages (a BCP 47 tag)</td></tr></table> |
| `open` | The list of languages shown (the Combobox face). <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value?</code></td><td><code>string</code></td><td>the language: one of data-languages (a BCP 47 tag)</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends LanguageSwitcherState&gt;(name: S, config?: LanguageSwitcherStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>LanguageSwitcherStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: LanguageSwitcherState; config: LanguageSwitcherStateConfigs[LanguageSwitcherState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: LanguageSwitcherState; config: LanguageSwitcherStateConfigs[LanguageSwitcherState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: LanguageSwitcherState; config: LanguageSwitcherStateConfigs[LanguageSwitcherState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: LanguageSwitcherState; config: LanguageSwitcherStateConfigs[LanguageSwitcherState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: LanguageSwitcherState; config: LanguageSwitcherStateConfigs[LanguageSwitcherState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.languageSwitcherApi.setState&lt;S extends LanguageSwitcherState&gt;(el: HTMLElement, name: S, config?: LanguageSwitcherStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>LanguageSwitcherStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.languageSwitcherApi.getState(el: HTMLElement): { name: LanguageSwitcherState; config: LanguageSwitcherStateConfigs[LanguageSwitcherState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: LanguageSwitcherState; config: LanguageSwitcherStateConfigs[LanguageSwitcherState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.languageSwitcherApi.render(state: { name: LanguageSwitcherState; config: LanguageSwitcherStateConfigs[LanguageSwitcherState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: LanguageSwitcherState; config: LanguageSwitcherStateConfigs[LanguageSwitcherState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.languageSwitcherApi.store(el: HTMLElement): Store&lt;{ name: LanguageSwitcherState; config: LanguageSwitcherStateConfigs[LanguageSwitcherState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: LanguageSwitcherState; config: LanguageSwitcherStateConfigs[LanguageSwitcherState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.languageSwitcherApi.commit&lt;S extends LanguageSwitcherState&gt;(el: HTMLElement, name: S, config?: LanguageSwitcherStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>LanguageSwitcherStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.languageSwitcherStates: LanguageSwitcherState[]</code> | The declared states, 'default' first: <code>default</code>, <code>open</code>. |

### `df$.shadcn.languageSwitcher`

| Member | Description |
|---|---|
| <code>languages(): LanguageInfo[]</code> | Every language the switcher knows: the 107 CLD3 codes with their English name, their own name, the region of their flag and their direction. <b>Returns</b> <code>LanguageInfo[]</code> - a copy of the list |
| <code>name(tag: string, locale?: string): string</code> | A language's name in a locale - the preseeded names for a CLD3 code in itself and in English, the browser's (CLDR) names for every other pair, the preseeded ones when the browser has none. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>tag</code></td><td><code>string</code></td><td>the language (a BCP 47 tag: "de", "de-AT", "zh-Latn")</td></tr><tr><td><code>locale?</code></td><td><code>string</code></td><td>the language to name it in (default: the language itself)</td></tr></table> <b>Returns</b> <code>string</code> - the name, capitalized for the start of a label |
| <code>region(tag: string): string</code> | The region whose flag stands for a language: its own region, else the preseeded one. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>tag</code></td><td><code>string</code></td><td>the language (a BCP 47 tag)</td></tr></table> <b>Returns</b> <code>string</code> - the region (ISO 3166, lowercase; '' for a language without one, like Esperanto) |
| <code>choose(target: string \| HTMLElement, tag: string): boolean</code> | Chooses a language of data-languages as a click would: the face changes and language-change fires. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .language-switcher element, its id or a selector</td></tr><tr><td><code>tag</code></td><td><code>string</code></td><td>the language</td></tr></table> <b>Returns</b> <code>boolean</code> - false when the switcher does not offer it |
| <code>bind(target: string \| HTMLElement, i18n: LanguageSwitcherI18n): (() =&gt; void)</code> | Ties the switcher to a defuss-i18n instance both ways: a pick sets its locale, a locale set elsewhere moves the switcher (quietly - no language-change). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .language-switcher element, its id or a selector</td></tr><tr><td><code>i18n</code></td><td><code>LanguageSwitcherI18n</code></td><td>the instance (createI18n) - anything with locale, setLocale() and subscribe()</td></tr></table> <b>Returns</b> <code>(() =&gt; void)</code> - a function that unties them |
| <code>configure(options: LanguageSwitcherOptions): void</code> | Where the flags come from - set it before the first switcher draws (to self-host the SVGs). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>options</code></td><td><code>LanguageSwitcherOptions</code></td><td>the flag URL pattern</td></tr></table> |

### Events

| Event | Description |
|---|---|
| `language-change` | Fires when the user (or choose()) picks another language: the one chosen, the one before, its own name and its direction - bind() turns it into the i18n locale. <code>detail</code>: <code>LanguageSwitcherChangeDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value</code></td><td><code>string</code></td><td>the language chosen now (a BCP 47 tag)</td></tr><tr><td><code>previous</code></td><td><code>string</code></td><td>the language before</td></tr><tr><td><code>name</code></td><td><code>string</code></td><td>its name in itself ("Deutsch")</td></tr><tr><td><code>dir</code></td><td><code>'ltr' \| 'rtl'</code></td><td>its writing direction</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `LanguageInfo` | One language the switcher knows. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>code</code></td><td><code>string</code></td><td>its CLD3 code (a BCP 47 tag; iw is Hebrew, he works too)</td></tr><tr><td><code>english</code></td><td><code>string</code></td><td>its name in English</td></tr><tr><td><code>native</code></td><td><code>string</code></td><td>its name in itself</td></tr><tr><td><code>region</code></td><td><code>string</code></td><td>the region whose flag stands for it (ISO 3166, lowercase; a subdivision like gb-wls); '' for none</td></tr><tr><td><code>dir</code></td><td><code>'ltr' \| 'rtl'</code></td><td>its writing direction</td></tr></table> |
| `LanguageSwitcherChangeDetail` | What language-change carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>value</code></td><td><code>string</code></td><td>the language chosen now (a BCP 47 tag)</td></tr><tr><td><code>previous</code></td><td><code>string</code></td><td>the language before</td></tr><tr><td><code>name</code></td><td><code>string</code></td><td>its name in itself ("Deutsch")</td></tr><tr><td><code>dir</code></td><td><code>'ltr' \| 'rtl'</code></td><td>its writing direction</td></tr></table> |
| `LanguageSwitcherI18n` | What a defuss-i18n instance (or any locale store of that shape) offers bind(). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>locale</code></td><td><code>string</code></td><td>the locale shown now</td></tr><tr><td><code>setLocale</code></td><td><code>(locale: string) =&gt; unknown</code></td><td>switches the locale</td></tr><tr><td><code>subscribe?</code></td><td><code>(listener: (snapshot: { locale: string }) =&gt; void) =&gt; ()</code></td><td>follows locale changes; returns the function that stops it</td></tr></table> |
| `LanguageSwitcherOptions` | configure()'s options. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>flags?</code></td><td><code>string</code></td><td>the flag URL pattern: {shape} becomes 4x3 or 1x1, {region} the region (default: flag-icons 7.2.3 on jsDelivr)</td></tr></table> |

## Notes

- **Languages**: the table holds the 107 language codes CLD3 detects (its README lists them; some sources count 109) -
  its English name, its name in itself and the region of its flag (`df$.shadcn.languageSwitcher.languages()`).
  `iw` is CLD3's Hebrew (`he` works too). Any other tag works as well: `Intl.DisplayNames` names it.
- **Dialects**: a tag with a region is a language of its own - `en-GB en-US`, `de-DE de-AT de-CH`, `pt-PT pt-BR`
  show their CLDR names ("British English", "Österreichisches Deutsch") and the region's flag.
- **A flag is not a language**: the default regions are a convention (English - the United Kingdom, Arabic - Saudi
  Arabia, Spanish - Spain). Override them with `data-flags`, leave them out with `data-flag="none"`, or name the
  dialect. Flags are [flag-icons](https://github.com/lipis/flag-icons) 7.2.3 (MIT) from jsDelivr;
  `df$.shadcn.languageSwitcher.configure({ flags: '/flags/{shape}/{region}.svg' })` self-hosts them.
- **defuss-i18n**: `bind(el, i18n)` is the only wiring a page needs - the switcher never translates; the page's
  `createDomI18n(df$).bind(...)` does. `language-change` (`{ value, previous, name, dir }`) fires on a pick.
- The Swap suits two to four languages; with more, the Combobox lists them all at once. The Menu suits a user or
  settings menu: every language in view, checked like the menu's other options.
