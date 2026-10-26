<!-- The individual examples of Toggle: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Toggle (disabled)"
<button class="toggle" aria-pressed="true" disabled>
  <i data-lucide="bold"></i>
</button>
```

```html example part label="Toggle (sm)"
<button class="toggle" type="button" data-size="sm" aria-pressed="true" data-de-layer="findings"
  >Findings <span data-de-layer-count="findings">0</span></button
>
```

```html example part label="Toggle (outline)"
<button class="toggle" data-variant="outline" aria-pressed="true" aria-label="Toggle italic">
  <svg
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <line x1="19" x2="10" y1="4" y2="4" />
    <line x1="14" x2="5" y1="20" y2="20" />
    <line x1="15" x2="9" y1="4" y2="20" />
  </svg>
</button>
```

```html example part label="Toggle (outline, disabled)"
<button class="toggle" data-variant="outline" aria-pressed="false" disabled>Disabled</button>
```

```html example part label="Toggle (outline, xs)"
<button class="toggle" data-variant="outline" data-size="xs" aria-pressed="false">Extra Small</button>
```

```html example part label="Toggle (outline, sm)"
<button class="toggle" data-variant="outline" data-size="sm" aria-pressed="false">Small</button>
```

```html example part label="Toggle (outline, md)"
<button class="toggle" data-variant="outline" data-size="md" aria-pressed="false">Medium</button>
```

```html example part label="Toggle (outline, lg)"
<button class="toggle" data-variant="outline" data-size="lg" aria-pressed="false">Large</button>
```

```html example part label="Toggle (outline, xl)"
<button class="toggle" data-variant="outline" data-size="xl" aria-pressed="false">Extra Large</button>
```
