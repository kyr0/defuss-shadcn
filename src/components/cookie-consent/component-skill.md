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
