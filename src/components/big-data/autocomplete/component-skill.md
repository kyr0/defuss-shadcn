---
name: Autocomplete
type: MOL
section: big-data
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

<!-- generated from the source by `bun run api-docs` - edit the JSDoc and the types in the .ts, not this section -->

### States

<code>type AutocompleteState = 'default' | 'open' | 'loading' | 'empty' | 'error'</code> - `setState(name, config)` takes the config of the state it names (`AutocompleteStateConfigs[name]`).

| State | Description |
|---|---|
| `default` | Closed, nothing in flight. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>query?</code></td><td><code>string</code></td><td>the query: a string shows it in the input and searches for it; getState() reports the last one</td></tr><tr><td><code>value?</code></td><td><code>unknown</code></td><td>reported by getState(): the chosen suggestion's value, null before a choice</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>reported by getState(): the chosen suggestion's label</td></tr></table> |
| `open` | The list shows suggestions - opening with nothing listed searches for what is typed. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>query?</code></td><td><code>string</code></td><td>the query: a string shows it in the input and searches for it; getState() reports the last one</td></tr><tr><td><code>value?</code></td><td><code>unknown</code></td><td>reported by getState(): the chosen suggestion's value, null before a choice</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>reported by getState(): the chosen suggestion's label</td></tr></table> |
| `loading` | The first page is on its way: placeholder rows, aria-busy on the input. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>query?</code></td><td><code>string</code></td><td>the query: a string shows it in the input and searches for it; getState() reports the last one</td></tr><tr><td><code>value?</code></td><td><code>unknown</code></td><td>reported by getState(): the chosen suggestion's value, null before a choice</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>reported by getState(): the chosen suggestion's label</td></tr></table> |
| `empty` | The query matched nothing - the data-empty-text shows. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>query?</code></td><td><code>string</code></td><td>the query: a string shows it in the input and searches for it; getState() reports the last one</td></tr><tr><td><code>value?</code></td><td><code>unknown</code></td><td>reported by getState(): the chosen suggestion's value, null before a choice</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>reported by getState(): the chosen suggestion's label</td></tr></table> |
| `error` | The source failed: its message and a Retry button. <b>config</b> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>message?</code></td><td><code>string</code></td><td>the message shown (default "Something went wrong.")</td></tr><tr><td><code>query?</code></td><td><code>string</code></td><td>the query: a string shows it in the input and searches for it; getState() reports the last one</td></tr><tr><td><code>value?</code></td><td><code>unknown</code></td><td>reported by getState(): the chosen suggestion's value, null before a choice</td></tr><tr><td><code>label?</code></td><td><code>string</code></td><td>reported by getState(): the chosen suggestion's label</td></tr></table> |

### Every element

| Member | Description |
|---|---|
| <code>el.api.setState&lt;S extends AutocompleteState&gt;(name: S, config?: AutocompleteStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>AutocompleteStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (or await settled()) |
| <code>el.api.getState(): { name: AutocompleteState; config: AutocompleteStateConfigs[AutocompleteState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <b>Returns</b> <code>{ name: AutocompleteState; config: AutocompleteStateConfigs[AutocompleteState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>el.api.render(state?: { name: AutocompleteState; config: AutocompleteStateConfigs[AutocompleteState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state?</code></td><td><code>{ name: AutocompleteState; config: AutocompleteStateConfigs[AutocompleteState]; model?: ElementModel }</code></td><td>a state as getState() returns it (default: the current one)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>el.api.settled(): Promise&lt;void&gt;</code> | Wait for the last state's DOM work (async states: a diagram rendering, a chart mounting). <b>Returns</b> <code>Promise&lt;void&gt;</code> - resolves when nothing is pending |
| <code>el.store: Store&lt;{ name: AutocompleteState; config: AutocompleteStateConfigs[AutocompleteState] }&gt;</code> | A defuss-store store of the element's state - subscribe to follow every change (also the user's), set it to drive the component. |

### Registry

| Member | Description |
|---|---|
| <code>df$.shadcn.autocompleteApi.setState&lt;S extends AutocompleteState&gt;(el: HTMLElement, name: S, config?: AutocompleteStateConfigs[S]): unknown</code> | Enter a state: the DOM work runs (also when it is the current state), the store records it. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>a declared state (an unknown name throws)</td></tr><tr><td><code>config?</code></td><td><code>AutocompleteStateConfigs[S]</code></td><td>that state's config (merged into the stored one when the component merges)</td></tr></table> <b>Returns</b> <code>unknown</code> - what the state's DOM work returned - a Promise for an async state (await it, or el.api.settled()) |
| <code>df$.shadcn.autocompleteApi.getState(el: HTMLElement): { name: AutocompleteState; config: AutocompleteStateConfigs[AutocompleteState]; model?: ElementModel }</code> | The state the element shows now - read back from the DOM, so it includes what the user changed. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>{ name: AutocompleteState; config: AutocompleteStateConfigs[AutocompleteState]; model?: ElementModel }</code> - the state's name, its config and the authored markup model render() starts from |
| <code>df$.shadcn.autocompleteApi.render(state: { name: AutocompleteState; config: AutocompleteStateConfigs[AutocompleteState]; model?: ElementModel }): string</code> | The element's markup in a state - the authored markup with that state applied; a pure function of the state. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>state</code></td><td><code>{ name: AutocompleteState; config: AutocompleteStateConfigs[AutocompleteState]; model?: ElementModel }</code></td><td>a state as getState() returns it (with its model)</td></tr></table> <b>Returns</b> <code>string</code> - the element's outer HTML in that state |
| <code>df$.shadcn.autocompleteApi.store(el: HTMLElement): Store&lt;{ name: AutocompleteState; config: AutocompleteStateConfigs[AutocompleteState] }&gt;</code> | The element's store (bindComponent made it). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr></table> <b>Returns</b> <code>Store&lt;{ name: AutocompleteState; config: AutocompleteStateConfigs[AutocompleteState] }&gt;</code> - a defuss-store store of { name, config } - subscribe to follow every change, set it to drive the component |
| <code>df$.shadcn.autocompleteApi.commit&lt;S extends AutocompleteState&gt;(el: HTMLElement, name: S, config?: AutocompleteStateConfigs[S]): void</code> | Record a state the element reached on its own (no DOM work) - for a component's own handlers. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>el</code></td><td><code>HTMLElement</code></td><td>the component's element</td></tr><tr><td><code>name</code></td><td><code>S</code></td><td>the state it is in</td></tr><tr><td><code>config?</code></td><td><code>AutocompleteStateConfigs[S]</code></td><td>its config</td></tr></table> |
| <code>df$.shadcn.autocompleteStates: AutocompleteState[]</code> | The declared states, 'default' first: <code>default</code>, <code>open</code>, <code>loading</code>, <code>empty</code>, <code>error</code>. |

### `df$.shadcn.autocomplete`

| Member | Description |
|---|---|
| <code>configure(target: string \| HTMLElement, config: AutocompleteConfig = {}): void</code> | Bind data and behavior. Data (one of): rows (local records - a dataview source), url (string or (request) =&gt; url; the default client GETs it with ?q=&amp;page=&amp;pageSize=&amp;sort=), load(request, { signal }) - your own client, returning records or { rows, hasMore, total }. client: { fetch, headers, parse(json, request) } customizes the default client. Query: searchField, match ('contains' \| 'startsWith'), sorters, filters, pageSize, debounce (ms), minChars. Display: label / value (field names or functions), render(option, record, { query, index }). <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .autocomplete element or its selector</td></tr><tr><td><code>config</code></td><td><code>AutocompleteConfig</code> = <code>{}</code></td><td>data source, query and display options, merged into the current config</td></tr></table> |
| <code>search(target: string \| HTMLElement, query: string): Promise&lt;void&gt;</code> | Search for a query now (no debounce): the input shows it and the list loads. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .autocomplete element or its selector</td></tr><tr><td><code>query</code></td><td><code>string</code></td><td>the text to search for</td></tr></table> <b>Returns</b> <code>Promise&lt;void&gt;</code> - settles when the first page has loaded (or the request failed) |
| <code>close(target: string \| HTMLElement): void</code> | Close the popup and cancel what is in flight. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .autocomplete element or its selector</td></tr></table> |
| <code>records(target: string \| HTMLElement): DataviewRow[]</code> | The records the list holds now. <table><tr><th>Argument</th><th>Type</th><th>Description</th></tr><tr><td><code>target</code></td><td><code>string \| HTMLElement</code></td><td>the .autocomplete element or its selector</td></tr></table> <b>Returns</b> <code>DataviewRow[]</code> - a copy of the loaded records, every page so far, in list order |

### Events

| Event | Description |
|---|---|
| `autocomplete-request` | Fires before every request (each page) - detail.request is the dataview request the loader receives. <code>detail</code>: <code>AutocompleteRequestDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>request</code></td><td><code>AutocompleteRequest</code></td><td>the request the loader receives next</td></tr></table> |
| `autocomplete-select` | Fires when a suggestion is taken - its record, value and label. <code>detail</code>: <code>AutocompleteSelectDetail</code> <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>record</code></td><td><code>DataviewRow</code></td><td>the record taken</td></tr><tr><td><code>value</code></td><td><code>unknown</code></td><td>its value (valueField or value()) - also in the hidden value input</td></tr><tr><td><code>label</code></td><td><code>string</code></td><td>its label - now the input's text</td></tr></table> |

### Types

| Type | Description |
|---|---|
| `AutocompleteAnswer` | A loader's answer: the records, or the records with paging facts (items / data / results are read as rows too). = <code>DataviewRow[] \| { rows: DataviewRow[]</code> |
| `AutocompleteConfig` | What configure() takes - every key optional; data attributes set the defaults. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>rows?</code></td><td><code>DataviewRow[]</code></td><td>local records: a dataview source, filtered and sorted in the browser</td></tr><tr><td><code>url?</code></td><td><code>string \| ((request: AutocompleteRequest) =&gt; string)</code></td><td>a JSON endpoint the default client GETs with ?q=&amp;page=&amp;pageSize=&amp;sort=, or a function building the URL per request</td></tr><tr><td><code>load?</code></td><td><code>(request: AutocompleteRequest, options: { signal: AbortSignal }) =&gt; AutocompleteAnswer \| Promise&lt;AutocompleteAnswer&gt;</code></td><td>your own client: answers a request (abort with the signal when the next keystroke supersedes it)</td></tr><tr><td><code>client?</code></td><td><code>{ fetch?: typeof fetch; headers?: Record&lt;string, string&gt;; parse?: (json: unknown, request: AutocompleteRequest) =&gt; AutocompleteAnswer }</code></td><td>the default client's fetch, extra headers and a parse step from the JSON to an answer</td></tr><tr><td><code>searchField?</code></td><td><code>string</code></td><td>the field the query matches (default: the label field)</td></tr><tr><td><code>match?</code></td><td><code>'contains' \| 'startsWith'</code></td><td>how the query matches: anywhere in the field, or at its start</td></tr><tr><td><code>sorters?</code></td><td><code>DataviewSorter[]</code></td><td>the sort order of the results</td></tr><tr><td><code>filters?</code></td><td><code>DataviewFilter[]</code></td><td>filters every request carries</td></tr><tr><td><code>pageSize?</code></td><td><code>number</code></td><td>records per page (default 20)</td></tr><tr><td><code>debounce?</code></td><td><code>number</code></td><td>ms to wait after a keystroke before asking (default 200)</td></tr><tr><td><code>minChars?</code></td><td><code>number</code></td><td>characters before the first request (default 1)</td></tr><tr><td><code>labelField?</code></td><td><code>string</code></td><td>the field shown as the option text (default 'label')</td></tr><tr><td><code>valueField?</code></td><td><code>string</code></td><td>the field written to the hidden value input (default 'id')</td></tr><tr><td><code>label?</code></td><td><code>(record: DataviewRow) =&gt; string</code></td><td>compute the option text instead of reading labelField</td></tr><tr><td><code>value?</code></td><td><code>(record: DataviewRow) =&gt; unknown</code></td><td>compute the value instead of reading valueField</td></tr><tr><td><code>render?</code></td><td><code>(option: HTMLElement, record: DataviewRow, context: { query: string; index: number }) =&gt; void</code></td><td>fill an option element yourself (after the default label markup)</td></tr></table> |
| `AutocompleteRequest` | One request to the loader - a dataview request, one page of one query. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>query</code></td><td><code>string</code></td><td>the text typed</td></tr><tr><td><code>filters</code></td><td><code>DataviewFilter[]</code></td><td>the configured filters, plus the query as a filter on the search field</td></tr><tr><td><code>sorters</code></td><td><code>DataviewSorter[]</code></td><td>the configured sort order</td></tr><tr><td><code>page</code></td><td><code>number</code></td><td>the page asked for, 0-based (scrolling to the end of the list asks for the next)</td></tr><tr><td><code>pageSize</code></td><td><code>number</code></td><td>records per page</td></tr></table> |
| `AutocompleteRequestDetail` | What autocomplete-request carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>request</code></td><td><code>AutocompleteRequest</code></td><td>the request the loader receives next</td></tr></table> |
| `AutocompleteSelectDetail` | What autocomplete-select carries. <table><tr><th>Field</th><th>Type</th><th>Description</th></tr><tr><td><code>record</code></td><td><code>DataviewRow</code></td><td>the record taken</td></tr><tr><td><code>value</code></td><td><code>unknown</code></td><td>its value (valueField or value()) - also in the hidden value input</td></tr><tr><td><code>label</code></td><td><code>string</code></td><td>its label - now the input's text</td></tr></table> |

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
