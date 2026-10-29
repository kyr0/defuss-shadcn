<!-- The individual examples of Envelope: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Envelope"
<div class="envelope" id="en-part-amp" aria-label="Amp envelope">
  <script type="application/json" class="envelope-source">
    { "attack": 0.02, "decay": 0.35, "sustain": 0.6, "release": 0.6, "decayCurve": 0.6, "releaseCurve": 0.6 }
  </script>
</div>
```

```html example part label="Envelope (sm)"
<div class="envelope" id="en-part-pluck" data-size="sm" aria-label="Pluck envelope">
  <script type="application/json" class="envelope-source">
    { "attack": 0.005, "decay": 0.4, "sustain": 0.5, "release": 0.4, "decayCurve": 0.6, "releaseCurve": 0.6 }
  </script>
</div>
```

```html example part label="Envelope (lg)"
<div class="envelope" id="en-part-eq" data-kind="filter" data-size="lg" data-range="18" aria-label="Equalizer">
  <script type="application/json" class="envelope-source">
    {
      "bands": [
        { "id": "low", "label": "Low cut", "type": "highpass", "frequency": 40, "slope": 24 },
        { "id": "mid", "label": "Mid", "type": "peaking", "frequency": 800, "gain": -3, "Q": 1.4 },
        { "id": "air", "label": "Air", "type": "highshelf", "frequency": 9000, "gain": 4 }
      ]
    }
  </script>
</div>
```
