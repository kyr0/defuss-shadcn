<!-- The individual examples of Combobox: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Combobox (xs)"
<div class="combobox flex-1" data-size="xs" style="max-width: 12rem"
  ><button
    class="btn combobox-trigger"
    data-variant="outline"
    aria-haspopup="listbox"
    aria-expanded="false"
    aria-controls="sz-cb-xs"
    ><span class="combobox-value" data-placeholder="Select…">Select…</span
    ><svg
      class="combobox-chevron"
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" /></svg></button
  ><div id="sz-cb-xs" class="combobox-content" popover=""
    ><div class="combobox-search"><input class="combobox-search-input" type="text" placeholder="Search..." /></div
    ><div class="combobox-listbox" role="listbox"
      ><div class="combobox-empty" hidden>No results found.</div
      ><div role="option" class="combobox-item" aria-selected="false">Alpha</div
      ><div role="option" class="combobox-item" aria-selected="false">Beta</div></div
    ></div
  ></div
>
```

```html example part label="Combobox (sm)"
<div class="combobox flex-1" data-size="sm" style="max-width: 12rem"
  ><button
    class="btn combobox-trigger"
    data-variant="outline"
    aria-haspopup="listbox"
    aria-expanded="false"
    aria-controls="sz-cb-sm"
    ><span class="combobox-value" data-placeholder="Select…">Select…</span
    ><svg
      class="combobox-chevron"
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" /></svg></button
  ><div id="sz-cb-sm" class="combobox-content" popover=""
    ><div class="combobox-search"><input class="combobox-search-input" type="text" placeholder="Search..." /></div
    ><div class="combobox-listbox" role="listbox"
      ><div class="combobox-empty" hidden>No results found.</div
      ><div role="option" class="combobox-item" aria-selected="false">Alpha</div
      ><div role="option" class="combobox-item" aria-selected="false">Beta</div></div
    ></div
  ></div
>
```

```html example part label="Combobox (md)"
<div class="combobox flex-1" data-size="md" style="max-width: 12rem"
  ><button
    class="btn combobox-trigger"
    data-variant="outline"
    aria-haspopup="listbox"
    aria-expanded="false"
    aria-controls="sz-cb-md"
    ><span class="combobox-value" data-placeholder="Select…">Select…</span
    ><svg
      class="combobox-chevron"
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" /></svg></button
  ><div id="sz-cb-md" class="combobox-content" popover=""
    ><div class="combobox-search"><input class="combobox-search-input" type="text" placeholder="Search..." /></div
    ><div class="combobox-listbox" role="listbox"
      ><div class="combobox-empty" hidden>No results found.</div
      ><div role="option" class="combobox-item" aria-selected="false">Alpha</div
      ><div role="option" class="combobox-item" aria-selected="false">Beta</div></div
    ></div
  ></div
>
```

```html example part label="Combobox (lg)"
<div class="combobox flex-1" data-size="lg" style="max-width: 12rem"
  ><button
    class="btn combobox-trigger"
    data-variant="outline"
    aria-haspopup="listbox"
    aria-expanded="false"
    aria-controls="sz-cb-lg"
    ><span class="combobox-value" data-placeholder="Select…">Select…</span
    ><svg
      class="combobox-chevron"
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" /></svg></button
  ><div id="sz-cb-lg" class="combobox-content" popover=""
    ><div class="combobox-search"><input class="combobox-search-input" type="text" placeholder="Search..." /></div
    ><div class="combobox-listbox" role="listbox"
      ><div class="combobox-empty" hidden>No results found.</div
      ><div role="option" class="combobox-item" aria-selected="false">Alpha</div
      ><div role="option" class="combobox-item" aria-selected="false">Beta</div></div
    ></div
  ></div
>
```

```html example part label="Combobox (xl)"
<div class="combobox flex-1" data-size="xl" style="max-width: 12rem"
  ><button
    class="btn combobox-trigger"
    data-variant="outline"
    aria-haspopup="listbox"
    aria-expanded="false"
    aria-controls="sz-cb-xl"
    ><span class="combobox-value" data-placeholder="Select…">Select…</span
    ><svg
      class="combobox-chevron"
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" /></svg></button
  ><div id="sz-cb-xl" class="combobox-content" popover=""
    ><div class="combobox-search"><input class="combobox-search-input" type="text" placeholder="Search..." /></div
    ><div class="combobox-listbox" role="listbox"
      ><div class="combobox-empty" hidden>No results found.</div
      ><div role="option" class="combobox-item" aria-selected="false">Alpha</div
      ><div role="option" class="combobox-item" aria-selected="false">Beta</div></div
    ></div
  ></div
>
```
