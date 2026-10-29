<!-- The individual examples of Tacho: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Tacho"
<div class="tacho" data-color="chart-4" data-sweep="270" data-ticks="1">
  <meter class="tacho-meter" min="0" max="10" value="7" aria-label="Drive">7</meter>
  <output class="tacho-value"></output>
</div>
```

```html example part label="Tacho (sm)"
<div class="tacho" data-size="sm">
  <span class="tacho-caption">Mix</span>
  <meter class="tacho-meter" min="0" max="100" value="40" aria-label="Mix">40</meter>
  <output class="tacho-value"></output>
</div>
```

```html example part label="Tacho (lg)"
<div class="tacho" data-size="lg" data-format="signed" data-sweep="100" data-ticks="25" data-minor="4">
  <span class="tacho-label">E</span>
  <meter class="tacho-meter" min="-50" max="50" low="-5" high="5" optimum="0" value="-8" aria-label="Tuning in cents">
    -8 cents
  </meter>
  <output class="tacho-value">81.9 Hz</output>
  <span class="tacho-caption">E2 · -8 ct</span>
</div>
```
