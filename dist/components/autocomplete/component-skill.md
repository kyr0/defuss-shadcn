---
name: Autocomplete
type: MOL
why: An input with a manual popover listbox anchored under it (CSS anchor positioning, APG combobox) - suggestions from local records, a URL or your own network client, every request a defuss-dataview request; debounced, the in-flight request aborted by the next keystroke, pages loaded as the list scrolls.
when: Searching data too big or too remote to put in a select - places, people, products, tickets - as the user types. A Combobox for a short fixed list of options; a Select when typing adds nothing.
where: dist/components/autocomplete/autocomplete.css + dist/components/autocomplete/autocomplete.js
supportedStates: default, open, loading, empty, error
---

# Pattern: Autocomplete

## Native basis
A text `<input>` (the APG [combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
with list autocomplete) and a `popover="manual"` popup holding a
`role="listbox"` - focus never leaves the input, `aria-activedescendant` names
the active option, and CSS anchor positioning keeps the popup under the input
(flipping above when there is no room). Every search is a
[defuss-dataview](https://www.npmjs.com/package/defuss-dataview) request -
`{ query, filters, sorters, page, pageSize }` - so local records go through the
same engine (`df$.dataview`) a server can run, and a remote client receives a
request it can hand straight to it.

---

## Native Web APIs
- [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) - `popover="manual"`: the popup sits in the top layer, the focus stays in the input
- [CSS Anchor Positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning) - `anchor()` / `anchor-size()` place and size the popup; `position-try-fallbacks: flip-block`
- [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) - a keystroke aborts the request in flight; the signal reaches `fetch()` and your own client
- [`fetch()`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) - the default network client (`data-url`)
- [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) + `transition-behavior: allow-discrete` - the popup fades in and out of `display: none`
- [`overscroll-behavior`](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior) - scrolling the list never scrolls the page
- [WAI-ARIA combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) - `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-busy`
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) · [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) · [`forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

---

## Structure

Author the input; the component makes the popup (listbox, status line, empty
and error notes) and wires the ARIA:

```html
<div class="autocomplete" id="city" data-label-field="name" data-sort="population:desc"
     data-debounce="200" data-page-size="20" data-empty-text="No city like that.">
  <label class="label" for="city-input">City</label>
  <input class="input autocomplete-input" id="city-input" type="text" placeholder="Search cities…">
  <input type="hidden" name="city" class="autocomplete-value">   <!-- optional: the chosen value -->
</div>
```

Then bind the data - one of three ways:

```js
const { autocomplete } = df$.shadcn;
const el = document.getElementById('city');

// 1. local records - a dataview source filters, sorts and pages them
autocomplete.configure(el, { rows: cities });

// 2. a URL - the default client: GET /api/cities?q=ber&page=0&pageSize=20&sort=population:desc
autocomplete.configure(el, { url: '/api/cities' });
autocomplete.configure(el, {
  url: (request) => `https://example.com/search?name=${encodeURIComponent(request.query)}`,
  client: {
    fetch: (url, init) => fetch(url, { ...init, credentials: 'include' }),   // your transport
    headers: { authorization: `Bearer ${token}` },
    parse: (json) => ({ rows: json.results ?? [], hasMore: false }),         // your shape
  },
});

// 3. your own client - anything that answers a dataview request
autocomplete.configure(el, {
  load: async (request, { signal }) => {
    const res = await fetch('/graphql', { method: 'POST', body: JSON.stringify(request), signal });
    return res.json();     // records, or { rows, total?, hasMore? }
  },
});
```

A loader answers with an array of records or `{ rows, total, hasMore }`
(`items` / `data` / `results` work as `rows`). Without `hasMore` the list
asks for another page while pages come back full (or while `total` says more
are left). The `signal` aborts when the user types again or closes the list -
pass it to `fetch()`; an aborted request is ignored, never shown.

Options can be rendered freely (`render(option, record, { query, index })`);
the default shows the label with the typed text marked (`.autocomplete-match`).

---

## Variants

| Attribute / option | Default | Behaviour |
|-----------|---------|-----------|
| `data-debounce` / `debounce` | `200` | Milliseconds of quiet typing before a search |
| `data-min-chars` / `minChars` | `1` | Shorter queries close the list |
| `data-page-size` / `pageSize` | `20` | Records a page; the next page loads near the end of the list |
| `data-sort="field:asc\|desc"` / `sorters` | none | The pre-configured sort (dataview sorters) |
| `filters` | none | Pre-configured filters added to every request |
| `data-search-field` / `searchField` | the label field | The field the query filters |
| `data-match="contains\|startsWith"` / `match` | `contains` | How the query matches (case-insensitive locally) |
| `data-label-field` / `label` | `label` | The field (or function) shown and written to the input |
| `data-value-field` / `value` | `id` | The field (or function) written to `.autocomplete-value` |
| `data-url` / `url` | none | The default client's endpoint (string or `(request) => url`) |
| `client.fetch` / `client.headers` / `client.parse` | `fetch`, none, as is | Customize the default client |
| `rows` / `load` | none | Local records / your own client |
| `data-empty-text` | `No matches.` | The empty note |

---

## States

| State | Meaning |
|-------|---------|
| `default` | Closed (and nothing in flight) |
| `open` | The list shows suggestions |
| `loading` | The first page is on its way - placeholder rows, `aria-busy="true"` on the input |
| `empty` | The query matched nothing - `data-empty-text` |
| `error` | The source failed - its message and a Retry button (`config.message`) |

The config is `{ query, value, label }` (merged on each `setState`), so
`el.store` says what was typed and what was chosen. `setState('open', { query })`
types a query and searches; `setState('default')` closes and aborts.

```js
const el = document.querySelector('#city');
el.api.setState('open', { query: 'Lis' });
el.store.subscribe(({ name, config }) => console.log(name, config.value));
el.addEventListener('autocomplete-select', (e) => console.log(e.detail.record));
el.addEventListener('autocomplete-request', (e) => console.log(e.detail.request)); // every request
```

Registry globals: `df$.shadcn.autocompleteApi` / `df$.shadcn.autocompleteStates`;
`df$.shadcn.autocomplete` has `configure`, `search`, `close`, `records`.

---

## API

<!-- generated from the source by `bun run api-docs` - edit the JSDoc in the .ts, not this section -->

**Every element:** `el.api.setState(name, config?)` · `el.api.getState()` · `el.api.render(state?)` · `el.api.settled()`; `el.store` - a defuss-store store of `{ name, config }` (subscribe to follow, set to drive).

**Registry:** `df$.shadcn.autocompleteApi` - `setState(el, name, config?)`, `getState(el)`, `render(state)`, `store(el)`, `commit(el, name, config?)`; `df$.shadcn.autocompleteStates` = `default`, `open`, `loading`, `empty`, `error`.

### `df$.shadcn.autocomplete`

| Member | Description |
|---|---|
| `configure(target, config = {})` | Bind data and behavior. Data (one of): rows (local records - a dataview source), url (string or (request) => url; the default client GETs it with ?q=&page=&pageSize=&sort=), load(request, { signal }) - your own client, returning records or { rows, hasMore, total }. client: { fetch, headers, parse(json, request) } customizes the default client. Query: searchField, match ('contains' \| 'startsWith'), sorters, filters, pageSize, debounce (ms), minChars. Display: label / value (field names or functions), render(option, record, { query, index }). |
| `search(target, query)` | search for a query now (no debounce) |
| `close(target)` | close the popup and cancel what is in flight |
| `records(target)` | the records the list holds now |

### Events

| Event | `detail` | Description |
|---|---|---|
| `autocomplete-request` | `request` | Fires before every request (each page) - detail.request is the dataview request the loader receives. |
| `autocomplete-select` | `record`, `value`, `label` | Fires when a suggestion is taken - its record, value and label. |

---

## ARIA

| Attribute | Element | When |
|-----------|---------|------|
| `role="combobox"` + `aria-autocomplete="list"` | `.autocomplete-input` | Set by the component |
| `aria-controls` | `.autocomplete-input` | Set: the listbox's id |
| `aria-expanded` | `.autocomplete-input` | `true` while the popup shows |
| `aria-activedescendant` | `.autocomplete-input` | The active option |
| `aria-busy="true"` | `.autocomplete-input` | In `loading` |
| `role="listbox"` + `aria-label` | `.autocomplete-list` | Set (the label falls back to the input's `aria-label`) |
| `role="option"` + `aria-selected` | `.autocomplete-option` | Set per option |
| `role="status"` | `.autocomplete-status` | The counts line - "20 of 1,284 · scroll for more" |

Keyboard (APG combobox): ↓ opens / moves, ↑ moves, Page Up / Down move by ten,
Enter takes the active option, Escape closes (a second Escape clears the
input), Tab closes. Pressing an option takes it.

---

## Notes
- **Cancellation is by AbortSignal** - a client that ignores the signal still
  never shows a stale answer (each request carries a sequence number), but it
  wastes the network: pass the signal on.
- **Local filtering is case-insensitive** (the shared dataview source); a
  server decides its own matching - the request says `op: 'contains'` or
  `'startsWith'`.
- Label the input with a `<label for>` (or `aria-label`); the listbox borrows
  the name.
