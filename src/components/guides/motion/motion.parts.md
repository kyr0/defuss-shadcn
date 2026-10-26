<!-- The individual examples of Motion: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="data-df-entrance"
<code data-df-entrance="up">up</code>
```

```html example part label="data-df-entrance (open)"
<details class="accordion-item" name="hb-qa" open data-df-entrance="up">
  <summary class="accordion-trigger" style="font-size: 1.9rem; padding-block: 1.4rem"
    ><span>Did cars shrink because people moved away?</span
    ><svg
      class="accordion-chevron"
      aria-hidden="true"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d="m6 9 6 6 6-6" /></svg
  ></summary>
  <div class="accordion-content" style="font-size: 1.6rem; line-height: 1.5"
    ><p style="margin: 0 0 1.4rem"
      >No - the region grew 3% over the period; car trips fell while total trips rose from 997k to 1.12 M.</p
    ></div
  >
</details>
```

```html example part label="data-df-stagger"
<ul
  data-df-stagger=""
  style="--df-motion-stagger-step: 140ms; margin: 0 0 0.85rem; padding: 0; list-style: none; display: grid; gap: 0.5rem"
>
  <li data-df-entrance="up" class="card" style="padding: 0.5rem 0.85rem"
    >Entrance vocabulary - fifteen directions, zero JS</li
  >
  <li data-df-entrance="up" class="card" style="padding: 0.5rem 0.85rem"
    >animation-composition: add - your transforms survive</li
  >
  <li data-df-entrance="up" class="card" style="padding: 0.5rem 0.85rem"
    >Deterministic replay: cancel → play, finished/cancel handles</li
  >
  <li data-df-entrance="up" class="card" style="padding: 0.5rem 0.85rem"
    >1ms under prefers-reduced-motion - contract intact</li
  >
</ul>
```
