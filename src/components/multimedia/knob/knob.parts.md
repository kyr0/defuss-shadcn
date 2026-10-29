<!-- The individual examples of Knob: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Knob"
<div class="knob">
  <input class="knob-input" type="range" id="kn-part-volume" min="0" max="100" step="any" value="50" />
  <label class="knob-label" for="kn-part-volume">Volume</label>
  <output class="knob-value" for="kn-part-volume">50</output>
</div>
```

```html example part label="Knob (sm)"
<div class="knob" data-size="sm">
  <input class="knob-input" type="range" id="kn-part-unison" min="1" max="16" step="1" value="4" />
  <label class="knob-label" for="kn-part-unison">Unison</label>
  <output class="knob-value" for="kn-part-unison">4</output>
</div>
```

```html example part label="Knob (flat)"
<div class="knob" data-variant="flat" data-color="chart-4">
  <input class="knob-input" type="range" id="kn-part-flat" min="0" max="100" step="any" value="60" />
  <label class="knob-label" for="kn-part-flat">Flat</label>
  <output class="knob-value" for="kn-part-flat">60</output>
</div>
```
