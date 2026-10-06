---
name: Cookie Consent
type: ORG
why: Built from the library - a Dialog (native modal, focus, Escape, backdrop) holding Buttons, a Select, Tabs, Checkbox rows and Badges; defuss-query owns querying and DOM writes, so consent logic is the only new code.
when: Collect, persist, reopen, or withdraw service-specific privacy choices and gate optional scripts or embeds.
where: dist/components/cookie-consent/cookie-consent.css + dist/components/cookie-consent/cookie-consent.js (+ dialog, button, select, tabs, checkbox, badge CSS - all.css has them)
supportedStates: default, open, preferences, services
---

# Pattern: Cookie Consent

## Native basis

Use a `.cookie-consent` host. The component creates and owns a native
`<dialog class="dialog cookie-consent-dialog">`, including its controls and
floating settings button. Load defuss-shadcn `core.js` before this component,
or use the complete integrated `all.js` alone. No custom elements,
hydration, shadow root or framework wrappers.

### Composition

The generated UI is made of the library's own components - restyle them and
the consent dialog follows:

| Part | Component |
| --- | --- |
| The modal | Dialog - `dialog.dialog` with `.dialog-content` / `-header` / `-title` / `-description` / `-footer` (backdrop, open animation, scroll lock) |
| Accept all / Reject optional | Button (`.btn`, the same variant - equal weight); Settings / Save `data-variant="outline"`; close: ghost `icon-sm` |
| Language | Select (`.select`, `data-size="sm"`) |
| Categories / Services | Tabs markup (`.tab-list` / `.tab-trigger` / `.tab-content`); the tablist carries `data-init` - this component owns the switching |
| Each choice | Checkbox (`.checkbox-item-block` + `.checkbox`, `.field-description`); a mixed category is the checkbox's indeterminate state |
| Required / category / collected data | Badge |
| Floating settings, embed placeholder actions | Button (`outline`, `sm`) |

`dialog.js` excludes `.cookie-consent-dialog` (each component owns its
dialog - AGENTS.md).

## Native Web APIs

- [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog): native modal focus, inert background, Escape, and backdrop.
- [`Storage`](https://developer.mozilla.org/en-US/docs/Web/API/Storage): versioned choices, with in-memory fallback if unavailable.
- [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver): initialize dynamic hosts and reconcile newly inserted resources.
- [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent): `cookie-consent:change` and `cookie-consent:error`.
- [`::backdrop`](https://developer.mozilla.org/en-US/docs/Web/CSS/::backdrop): modal overlay (the Dialog component's).
- [`:indeterminate`](https://developer.mozilla.org/en-US/docs/Web/CSS/:indeterminate): a partly chosen category.
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion): suppress transitions.
- Follow [APG modal dialogs](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) and keyboard tab navigation (Left, Right, Home, End).

## Structure

```html
<button type="button" class="btn" data-variant="outline" data-cookie-consent-open="privacy"
        aria-haspopup="dialog">Privacy settings</button>

<div id="privacy" class="cookie-consent" data-size="md">
  <script type="application/json" data-cookie-consent-config>
    {
      "defaultLanguage": "en",
      "revision": "2026-10",
      "cookieOrigins": [
        { "id": "session", "name": "Session", "category": "essential",
          "description": "Keeps your session working." },
        { "id": "measurement", "name": "Measurement", "category": "functional",
          "description": "Measures website use." },
        { "id": "video", "name": "Video", "category": "functional",
          "description": "Loads the optional video player." }
      ]
    }
  </script>
</div>

<!-- Keep both source attributes absent until consent. -->
<script type="text/plain" data-cookie-consent="measurement"
        data-consent-src="/measurement.js"></script>
<iframe title="Optional video" data-cookie-consent="video"
        data-consent-src="/video-player.html" loading="lazy"></iframe>
```

### Your texts, any language

```html
<div id="privacy" class="cookie-consent">
  <script type="application/json" data-cookie-consent-config>
    {
      "defaultLanguage": "en",
      "translations": {
        "en": { "title": "Cookies at Studio", "acceptAll": "Allow all" },
        "de": { "title": "Cookies bei Studio", "acceptAll": "Alle erlauben" },
        "fr": { "title": "Les cookies chez Studio", "acceptAll": "Tout autoriser" }
      },
      "cookieOrigins": [
        { "id": "support", "name": "Support chat", "category": "functional",
          "description": { "en": "Chat with our team.", "de": "Mit unserem Team chatten.", "fr": "Discuter avec notre équipe." } }
      ]
    }
  </script>
</div>
```

Keys: `title`, `text`, `settings`, `close`, `language`, `preferences`,
`preferencesText`, `categories`, `services`, `acceptAll`, `denyAll`,
`save`, `required`, `privacyPolicy`, `legalNotice`, `moreInformation`,
`blocked`, `activate`, `thirdParty`, `storageError`, `categoryNames` and
`categoryDescriptions` (one entry per category).

Serialize JSON safely: escape literal `<` as `\u003c` before placing dynamic
values inside a script element. Never publish optional scripts with an
executable type, or optional iframes with `src`/`srcdoc`. Initialization
cannot undo requests already sent by the HTML parser.

## Variants

| `data-variant` | Behavior |
| --- | --- |
| `default` / omitted | Centered modal |
| `corner` | Modal at bottom right; background remains inert |
| `banner` | First visit: a NON-modal bar along the bottom of the page (`show()`) - the page stays usable; Settings / Services reopen it as the modal dialog |

## Sizes

| `data-size` | Maximum inline size |
| --- | --- |
| `sm` | 28rem |
| `md` / omitted | 40rem |
| `lg` | 48rem |

## Density

| `data-density` | Content padding |
| --- | --- |
| `compact` | 1rem |
| `comfortable` / omitted | 1.5rem |
| `spacious` | 2rem |

Density changes the padding only - typography and width stay.

## ARIA

| Element | Attribute / behavior |
| --- | --- |
| Generated dialog | `aria-labelledby`, `aria-describedby`; native modal semantics |
| External trigger | `aria-haspopup="dialog"` |
| Language select | Localized `aria-label` |
| Tabs | `tablist`, `tab`, `tabpanel`, `aria-selected`, `aria-controls`, roving tabindex |
| Checkboxes | `<label for>`, `aria-describedby`, `disabled`, mixed category via `indeterminate` |
| Close | Localized accessible name; discards draft choices |

## Notes

- Preserve `cookieOrigins` IDs across visits. Essential services are always
  granted; every optional category, including `other`, begins off. Ignore
  legacy optional `consent: true`. A disabled optional service remains off.
- Keep edits in draft until Save. Accept all / Reject optional commit
  immediately. Close, backdrop, and Escape discard drafts without deciding.
- Texts and languages: English and German are built in. `translations`
  overrides any key per language and adds languages - a new one (`"fr"`)
  only lists what it changes; every key it leaves out falls back to English.
  `defaultLanguage` must be one of them. The picker names each language in
  its own words (`Intl.DisplayNames`). Per service, `description`, `url`
  and `dataCollected` take one value per language (`{ "en": …, "de": …, "fr": … }`).
- Set `revision` whenever a changed purpose requires renewed choice.
  Stored choices expire after `maxAgeDays` (default 180); malformed,
  future-dated, expired, and revision-mismatched records grant only essentials.
- Use `storageKey` for a stable shared policy, `storage: null` for page-only
  choices, and `autoShow: false` for manual opening / demos. Default storage
  key is `defuss-shadcn:<host-id>`; use an authored ID in production.
- Listen for `cookie-consent:change`: detail is `{ state, reason }`.
  Storage failures apply the choice in memory and emit `cookie-consent:error`;
  expose that event in host UI if persistence is required.
- Set `resourceRoot` when mounting multiple independent instances. Each
  script/iframe has one owning instance; the first matching instance claims it.
- Retain inert script placeholders. An accepted script is inserted exactly
  once per placeholder in that instance's document lifetime. Regrant after
  revocation does not execute it again; use host SDK lifecycle code or reload.
  Use `data-consent-type="module"` for modules and `nonce` for CSP.
- Use service `onRevoke` through programmatic configuration to stop timers,
  SDKs, and listeners. Removing a script cannot undo its effects or requests.
  List first-party cookies with exact `name`, `path`, and optional `domain`;
  HttpOnly / third-party cookies require server/browser handling.
- Gate iframe source via `data-consent-src`. Denial unloads it; the generated
  placeholder provides an explicit one-service grant and settings button.
  `data-consent-placeholder="none"` on the iframe skips that placeholder -
  the page brings its own, e.g. a Product Showcase poster with a play button
  that asks for consent before playing (the doc page's YouTube example). Keep
  such a poster local: a thumbnail from the video host is already a request.
- Reconcile asynchronously inserted resources automatically, or call
  `api.updateTagsActivation()` after host rendering. Keep unrecognized
  services inert. Only HTTP(S) resource/policy URLs are accepted.
- Call `api.destroy()` before disposing a mounted host. Removal from the
  document also destroys it automatically. Destroy stops observers and
  listeners, unloads embeds, removes generated UI, and runs revoke hooks.

## States

- `default`: dialog closed; consent decision remains unchanged.
- `open`: initial explanation and three equal-weight actions.
- `preferences`: category choices.
- `services`: individual service choices and metadata.

Drive states through the host's `api.setState(name)`; inspect with
`api.getState()`. For example, set `preferences` to open category choices.
Unknown states throw. Named states change presentation only; they never grant
consent. Registry equivalents are `df$.shadcn.cookieConsentApi.setState(el,
name)` and `df$.shadcn.cookieConsentStates`.

Use `df$.shadcn.cookieConsent.create(root, config)` for lifecycle hooks or
custom storage. The returned instance / `root.api` also exposes `open`,
`close`, `acceptAll`, `denyAll`, `save`, `acceptService`, `revokeService`,
`isServiceAccepted`, `getConsent`, `getDraft`, `setLanguage`, `reset`,
`updateTagsActivation`, and `destroy`. Obtain an existing instance with
`df$.shadcn.cookieConsent.get(root)`; call `init()` after a synchronous host
render if initialization must finish before the next microtask.
- `data-variant="banner"` is the classic first-visit footer: with `autoShow` it opens as a bar (not a modal, no inert page), copy beside the buttons on wide screens; choosing Settings switches it to the modal dialog, a decision closes it. Pair it with `showFloatingButton` (or a footer "Cookie settings" link with `data-cookie-consent-open`) so people can come back.

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type CookieConsentState = 'default' | 'open' | 'preferences' | 'services'</code> - `setState(name, config)` takes the config of the state it names (`CookieConsentStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | The dialog closed (the floating settings button shows after a decision). <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>language?</code></td><td><code>Language</code></td><td>switch the texts to this language (built in, or given in translations); getState() reports the language shown</td></tr></table> |
| `open` | The notice: the texts and the accept / reject / settings buttons. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>language?</code></td><td><code>Language</code></td><td>switch the texts to this language (built in, or given in translations); getState() reports the language shown</td></tr></table> |
| `preferences` | The settings by category. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>language?</code></td><td><code>Language</code></td><td>switch the texts to this language (built in, or given in translations); getState() reports the language shown</td></tr></table> |
| `services` | The settings by service. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>language?</code></td><td><code>Language</code></td><td>switch the texts to this language (built in, or given in translations); getState() reports the language shown</td></tr></table> |

### Every element

`el.api` is the instance (`CookieConsentInstance`, below) - its setState / getState / render run through `el.store`.

| Member | Description |
|---|---|
| <code>el.store: Store&lt;{ name: CookieConsentState; config: CookieConsentStateConfigs[CookieConsentState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.cookieConsentApi.setState&lt;S extends CookieConsentState&gt;(el: HTMLElement, name: S, config?: CookieConsentStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>CookieConsentStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.cookieConsentApi.getState(el: HTMLElement): { name: CookieConsentState; config: CookieConsentStateConfigs[CookieConsentState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: CookieConsentState; config: CookieConsentStateConfigs[CookieConsentState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.cookieConsentApi.render(state: { name: CookieConsentState; config: CookieConsentStateConfigs[CookieConsentState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: CookieConsentState; config: CookieConsentStateConfigs[CookieConsentState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.cookieConsentApi.store(el: HTMLElement): Store&lt;{ name: CookieConsentState; config: CookieConsentStateConfigs[CookieConsentState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: CookieConsentState; config: CookieConsentStateConfigs[CookieConsentState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.cookieConsentApi.commit&lt;S extends CookieConsentState&gt;(el: HTMLElement, name: S, config?: CookieConsentStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>CookieConsentStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.cookieConsentStates: CookieConsentState[]</code> | The declared states, 'default' first: <code>default</code>, <code>open</code>, <code>preferences</code>, <code>services</code>. |

### `df$.shadcn.cookieConsent`

| Member | Description |
|---|---|
| <code>create(root: HTMLElement, config: CookieConsentConfig): CookieConsentInstance</code> | Start a consent manager on root with a config (cookieOrigins, texts, storage ...); a second call returns the same one. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>root</code></td><td><code>HTMLElement</code></td><td>the .cookie-consent element (connected to the document)</td></tr><tr><td><code>config</code></td><td><code>CookieConsentConfig</code></td><td>the services, texts, storage and callbacks</td></tr></table> <b>Returns</b> <code>CookieConsentInstance</code> - its instance - also root's el.api |
| <code>get(root: HTMLElement): CookieConsentInstance \| undefined</code> | The instance a root already has. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>root</code></td><td><code>HTMLElement</code></td><td>the .cookie-consent element</td></tr></table> <b>Returns</b> <code>CookieConsentInstance \| undefined</code> - its instance, undefined before create() |
| <code>init(): void</code> | Declarative configuration: direct child script[type=application/json]. |

### The instance (`CookieConsentInstance`)

| Member | Description |
|---|---|
| <code>setState(name: ConsentView, config?: { language?: Language }): void</code> | Show a view by name (default, open, preferences, services); { language } switches the texts. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>ConsentView</code></td><td>the view</td></tr><tr><td><code>config?</code></td><td><code>{ language?: Language }</code></td><td>language: switch the texts too</td></tr></table> |
| <code>getState(): { name: ConsentView; config: { language: Language }; model?: ElementModel }</code> | The view shown now and the language. <b>Returns</b> <code>{ name: ConsentView; config: { language: Language }; model?: ElementModel }</code> - the view's name, the language and the authored model render() starts from |
| <code>render(state?: DefussShadcnComponentState): string</code> | The markup of a state (the render() contract). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>DefussShadcnComponentState</code></td><td>the state (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the root's markup in that state |
| <code>settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work - the State API every element has (el.api.settled). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves once the view is painted |
| <code>open(): void</code> | Open the consent dialog. |
| <code>close(): void</code> | Close the dialog. |
| <code>acceptAll(): void</code> | Accept every optional service and close. |
| <code>denyAll(): void</code> | Reject every optional service and close. |
| <code>save(): void</code> | Keep the services ticked in the settings and close. |
| <code>acceptService(id: string): void</code> | Accept one service (also what a gated element's Allow does). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the service's id</td></tr></table> |
| <code>revokeService(id: string): void</code> | Revoke one optional service - its scripts and frames unload, its cookies are removed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the service's id</td></tr></table> |
| <code>isServiceAccepted(id: string): boolean</code> | Whether a service is accepted now. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>the service's id</td></tr></table> <b>Returns</b> <code>boolean</code> - true when it is accepted (essential services always are) |
| <code>getConsent(): CookieConsentState</code> | The decision: services, categories, acceptAll / denyAll, language, revision, date. <b>Returns</b> <code>CookieConsentState</code> - a copy of the decision |
| <code>getDraft(): string[]</code> | The services ticked in the settings, not saved yet. <b>Returns</b> <code>string[]</code> - their ids |
| <code>setLanguage(language: Language): void</code> | Switch the texts (a built-in or a translated language). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>language</code></td><td><code>Language</code></td><td>a language code with texts (built in, or in translations)</td></tr></table> |
| <code>reset(): void</code> | Forget the decision (in storage too) and open the notice again. |
| <code>updateTagsActivation(): void</code> | Scan the page again for gated scripts and frames (after adding markup). |
| <code>destroy(): void</code> | Stop: listeners off, optional integrations revoked, the dialog removed. |

### Events

| Event | Description |
|---|---|
| `cookie-consent:change` | Fires on every decision - the consent state and why (accept, deny, save, service, reset, storage). <code>detail</code>: <code>CookieConsentChangeDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>CookieConsentState</code></td><td>the decision now</td></tr><tr><td><code>reason</code></td><td><code>ConsentReason</code></td><td>what changed it</td></tr></table> |
| `cookie-consent:error` | Fires when something fails without breaking the page - storage (kind "storage"), a callback, a revoke hook. <code>detail</code>: <code>CookieConsentErrorDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>kind</code></td><td><code>ConsentErrorKind</code></td><td>what failed</td></tr><tr><td><code>error</code></td><td><code>unknown</code></td><td>what was thrown</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `ConsentErrorKind` | What failed (cookie-consent:error): the config, storage, a callback, the markup, a revoke hook, a URL. = <code>'config' \| 'storage' \| 'callback' \| 'markup' \| 'revoke' \| 'url'</code> |
| `ConsentMessages` | Every text the dialog shows - translations replace any of them. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>title</code></td><td><code>string</code></td><td>the notice's heading</td></tr><tr><td><code>text</code></td><td><code>string</code></td><td>the notice's text</td></tr><tr><td><code>settings</code></td><td><code>string</code></td><td>the button (and floating button) that opens the settings</td></tr><tr><td><code>close</code></td><td><code>string</code></td><td>the button that closes without saving</td></tr><tr><td><code>language</code></td><td><code>string</code></td><td>the language picker's label</td></tr><tr><td><code>preferences</code></td><td><code>string</code></td><td>the settings view's heading</td></tr><tr><td><code>preferencesText</code></td><td><code>string</code></td><td>the settings view's intro</td></tr><tr><td><code>categories</code></td><td><code>string</code></td><td>the categories tab</td></tr><tr><td><code>services</code></td><td><code>string</code></td><td>the services tab</td></tr><tr><td><code>acceptAll</code></td><td><code>string</code></td><td>the accept-all button</td></tr><tr><td><code>denyAll</code></td><td><code>string</code></td><td>the reject-optional button</td></tr><tr><td><code>save</code></td><td><code>string</code></td><td>the save button</td></tr><tr><td><code>required</code></td><td><code>string</code></td><td>the badge on essential services</td></tr><tr><td><code>privacyPolicy</code></td><td><code>string</code></td><td>the privacy policy link</td></tr><tr><td><code>legalNotice</code></td><td><code>string</code></td><td>the legal notice link</td></tr><tr><td><code>moreInformation</code></td><td><code>string</code></td><td>a service's information link</td></tr><tr><td><code>blocked</code></td><td><code>string</code></td><td>after a service's name on gated content it blocks</td></tr><tr><td><code>activate</code></td><td><code>string</code></td><td>the button on gated content that allows its service</td></tr><tr><td><code>thirdParty</code></td><td><code>string</code></td><td>the note that third-party cookies stay (the site cannot remove them)</td></tr><tr><td><code>storageError</code></td><td><code>string</code></td><td>shown when the choice could not be stored</td></tr><tr><td><code>categoryNames</code></td><td><code>Record&lt;CookieCategory, string&gt;</code></td><td>each category's name</td></tr><tr><td><code>categoryDescriptions</code></td><td><code>Record&lt;CookieCategory, string&gt;</code></td><td>each category's description</td></tr></table> |
| `ConsentReason` | Why the decision changed: the buttons (accept, deny, save), one service, a reset, or a decision read from storage. = <code>'accept' \| 'deny' \| 'save' \| 'service' \| 'reset' \| 'storage'</code> |
| `ConsentView` | A view of the consent dialog - the component's states: closed (default), the notice (open), the categories (preferences), the services list. = <code>typeof cookieConsentStates[number]</code> |
| `CookieCategory` | A service's category - essential services are always on. = <code>'essential' \| 'functional' \| 'marketing' \| 'other'</code> |
| `CookieConsentChangeDetail` | What cookie-consent:change carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>CookieConsentState</code></td><td>the decision now</td></tr><tr><td><code>reason</code></td><td><code>ConsentReason</code></td><td>what changed it</td></tr></table> |
| `CookieConsentConfig` | What create() takes (also the JSON in the root's config script). <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>cookieOrigins</code></td><td><code>CookieOrigin[]</code></td><td>every service the site uses</td></tr><tr><td><code>defaultLanguage?</code></td><td><code>Language</code></td><td>the language before the visitor picks one (default: the page's lang, else English)</td></tr><tr><td><code>showFloatingButton?</code></td><td><code>boolean</code></td><td>a floating settings button after the decision (default true)</td></tr><tr><td><code>privacyPolicyUrl?</code></td><td><code>Localized</code></td><td>the privacy policy page</td></tr><tr><td><code>legalNoticeUrl?</code></td><td><code>Localized</code></td><td>the legal notice page</td></tr><tr><td><code>storageKey?</code></td><td><code>string</code></td><td>the storage key of the decision</td></tr><tr><td><code>revision?</code></td><td><code>string</code></td><td>change it to ask everyone again (a new set of services)</td></tr><tr><td><code>maxAgeDays?</code></td><td><code>number</code></td><td>days a decision is kept</td></tr><tr><td><code>storage?</code></td><td><code>Pick&lt;Storage, 'getItem' \| 'setItem' \| 'removeItem'&gt; \| null</code></td><td>where the decision is kept (default localStorage; null: nowhere)</td></tr><tr><td><code>autoShow?</code></td><td><code>boolean</code></td><td>open the notice when no decision is stored (default true)</td></tr><tr><td><code>resourceRoot?</code></td><td><code>Document \| HTMLElement</code></td><td>Defaults to ownerDocument; use a container to isolate resource ownership.</td></tr><tr><td><code>translations?</code></td><td><code>Partial&lt;Record&lt;Language, Partial&lt;ConsentMessages&gt;&gt;&gt;</code></td><td>texts per language - any key left out falls back to English</td></tr><tr><td><code>onChange?</code></td><td><code>(state: CookieConsentState, reason: ConsentReason) =&gt; void</code></td><td>called on every decision with the state and why</td></tr><tr><td><code>onAccept?</code></td><td><code>(state: CookieConsentState) =&gt; void</code></td><td>called when everything is accepted</td></tr><tr><td><code>onDeny?</code></td><td><code>(state: CookieConsentState) =&gt; void</code></td><td>called when the optional services are rejected</td></tr></table> |
| `CookieConsentErrorDetail` | What cookie-consent:error carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>kind</code></td><td><code>ConsentErrorKind</code></td><td>what failed</td></tr><tr><td><code>error</code></td><td><code>unknown</code></td><td>what was thrown</td></tr></table> |
| `CookieConsentInstance` | A consent manager - create() returns it, and it is the root's el.api. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>setState</code></td><td><code>(name: ConsentView, config?: { language?: Language }) =&gt; void</code></td><td>Show a view by name (default, open, preferences, services); { language } switches the texts.</td></tr><tr><td><code>getState</code></td><td><code>() =&gt; { name: ConsentView; config: { language: Language }; model?: ElementModel }</code></td><td>The view shown now and the language.</td></tr><tr><td><code>render</code></td><td><code>(state?: DefussShadcnComponentState) =&gt; string</code></td><td>The markup of a state (the render() contract).</td></tr><tr><td><code>settled</code></td><td><code>() =&gt; Promise&lt;void&gt;</code></td><td>Wait for the last state's DOM work - the State API every element has (el.api.settled).</td></tr><tr><td><code>open</code></td><td><code>() =&gt; void</code></td><td>Open the consent dialog.</td></tr><tr><td><code>close</code></td><td><code>() =&gt; void</code></td><td>Close the dialog.</td></tr><tr><td><code>acceptAll</code></td><td><code>() =&gt; void</code></td><td>Accept every optional service and close.</td></tr><tr><td><code>denyAll</code></td><td><code>() =&gt; void</code></td><td>Reject every optional service and close.</td></tr><tr><td><code>save</code></td><td><code>() =&gt; void</code></td><td>Keep the services ticked in the settings and close.</td></tr><tr><td><code>acceptService</code></td><td><code>(id: string) =&gt; void</code></td><td>Accept one service (also what a gated element's Allow does).</td></tr><tr><td><code>revokeService</code></td><td><code>(id: string) =&gt; void</code></td><td>Revoke one optional service - its scripts and frames unload, its cookies are removed.</td></tr><tr><td><code>isServiceAccepted</code></td><td><code>(id: string) =&gt; boolean</code></td><td>Whether a service is accepted now.</td></tr><tr><td><code>getConsent</code></td><td><code>() =&gt; CookieConsentState</code></td><td>The decision: services, categories, acceptAll / denyAll, language, revision, date.</td></tr><tr><td><code>getDraft</code></td><td><code>() =&gt; string[]</code></td><td>The services ticked in the settings, not saved yet.</td></tr><tr><td><code>setLanguage</code></td><td><code>(language: Language) =&gt; void</code></td><td>Switch the texts (a built-in or a translated language).</td></tr><tr><td><code>reset</code></td><td><code>() =&gt; void</code></td><td>Forget the decision (in storage too) and open the notice again.</td></tr><tr><td><code>updateTagsActivation</code></td><td><code>() =&gt; void</code></td><td>Scan the page again for gated scripts and frames (after adding markup).</td></tr><tr><td><code>destroy</code></td><td><code>() =&gt; void</code></td><td>Stop: listeners off, optional integrations revoked, the dialog removed.</td></tr></table> |
| `CookieConsentState` | The decision - getConsent() returns it, cookie-consent:change carries it. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>revision</code></td><td><code>string</code></td><td>the config revision it was made under</td></tr><tr><td><code>decisionMade</code></td><td><code>boolean</code></td><td>whether the visitor decided (false: no decision yet, or it was reset)</td></tr><tr><td><code>language</code></td><td><code>Language</code></td><td>the language the texts show</td></tr><tr><td><code>acceptedServices</code></td><td><code>string[]</code></td><td>the ids of the accepted services</td></tr><tr><td><code>acceptedCategories</code></td><td><code>CookieCategory[]</code></td><td>the categories every service of which is accepted</td></tr><tr><td><code>updatedAt</code></td><td><code>number \| null</code></td><td>when it was made, ms since the epoch; null before a decision</td></tr><tr><td><code>acceptAll</code></td><td><code>boolean</code></td><td>every optional service accepted</td></tr><tr><td><code>denyAll</code></td><td><code>boolean</code></td><td>every optional service rejected</td></tr></table> |
| `CookieOrigin` | One service the site uses - what the visitor allows or rejects. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>id</code></td><td><code>string</code></td><td>its id: what data-consent-service on gated scripts and frames names</td></tr><tr><td><code>name</code></td><td><code>string</code></td><td>its name in the lists</td></tr><tr><td><code>description</code></td><td><code>Localized</code></td><td>what it does</td></tr><tr><td><code>category</code></td><td><code>CookieCategory</code></td><td>its category</td></tr><tr><td><code>domain?</code></td><td><code>string</code></td><td>the domain it sets cookies on</td></tr><tr><td><code>url?</code></td><td><code>Localized</code></td><td>its privacy information page</td></tr><tr><td><code>dataCollected?</code></td><td><code>Partial&lt;Record&lt;Language, string[]&gt;&gt;</code></td><td>what it collects, per language</td></tr><tr><td><code>consent?</code></td><td><code>boolean</code></td><td>Kept for migration. Optional services never start granted.</td></tr><tr><td><code>disabled?</code></td><td><code>boolean</code></td><td>Essential services are on; disabled optional services stay off.</td></tr><tr><td><code>cookies?</code></td><td><code>Array&lt;string \| { name: string; path?: string; domain?: string }&gt;</code></td><td>the cookies it sets (a name, or name + path / domain) - removed when it is revoked</td></tr><tr><td><code>onRevoke?</code></td><td><code>() =&gt; void</code></td><td>Tear down timers, SDKs, listeners, etc. Removal cannot undo script execution.</td></tr></table> |
| `Language` | A language code (BCP 47). English and German are built in; any other becomes available by passing its texts in `translations` - every key it leaves out falls back to English. = <code>string</code> |
| `Localized` | A text in one language, or per language ({ en, de, ... } - a missing one falls back to English). = <code>string \| Partial&lt;Record&lt;Language, string&gt;&gt;</code> |
