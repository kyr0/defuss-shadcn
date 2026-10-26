<!-- The individual examples of Collapsible: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Collapsible (sm)"
<details class="collapsible" data-size="sm" data-marker="arrow">
  <summary class="collapsible-trigger">Small</summary>
  <div class="collapsible-content"><p class="m-0">For dense panels.</p></div>
</details>
```

```html example part label="Collapsible (lg, open)"
<details class="collapsible" data-size="lg" data-marker="arrow" open>
  <summary class="collapsible-trigger">Large, semibold</summary>
  <div class="collapsible-content"><p class="m-0">The content keeps its size - only the heading scales.</p></div>
</details>
```

```html example part label="Collapsible (xl)"
<details class="collapsible" data-size="xl" data-marker="arrow">
  <summary class="collapsible-trigger">Extra large, bold</summary>
  <div class="collapsible-content"><p class="m-0">For page-level sections.</p></div>
</details>
```

```html example part label="Collapsible (ghost)"
<details class="collapsible" data-variant="ghost" data-marker="arrow">
  <summary class="collapsible-trigger">Ghost</summary>
  <div class="collapsible-content"><p class="m-0">No surface, no border - the hover tint still shows.</p></div>
</details>
```

```html example part label="Collapsible (muted)"
<details class="collapsible" data-variant="muted" data-marker="arrow">
  <summary class="collapsible-trigger">Muted</summary>
  <div class="collapsible-content"><p class="m-0">A soft surface, no border.</p></div>
</details>
```

```html example part label="Collapsible (primary, open)"
<details class="collapsible" data-variant="primary" data-marker="arrow" open>
  <summary class="collapsible-trigger">Primary</summary>
  <div class="collapsible-content"
    ><p class="m-0">The primary surface - content text is the foreground, softened.</p></div
  >
</details>
```

```html example part label="Collapsible (neutral)"
<details class="collapsible" data-variant="neutral" data-marker="arrow">
  <summary class="collapsible-trigger">Neutral</summary>
  <div class="collapsible-content"><p class="m-0">A charcoal surface, the same in both modes.</p></div>
</details>
```

```html example part label="Collapsible (highlight)"
<details class="collapsible" data-variant="highlight" data-marker="plus">
  <summary class="collapsible-trigger">Highlight when open</summary>
  <div class="collapsible-content"
    ><p class="m-0">Plain while closed, primary once open - the color change animates.</p></div
  >
</details>
```
