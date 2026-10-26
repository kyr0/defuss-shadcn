<!-- The individual examples of Card: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Card (xs)"
<div class="card" data-size="xs" style="width: 10rem">
  <div class="card-header">
    <h3 class="card-title">Size xs</h3>
    <p class="card-description">Padding and type scale together.</p>
  </div>
  <div class="card-footer"><button class="btn" data-size="xs">Action</button></div>
</div>
```

```html example part label="Card (sm)"
<label class="card" data-size="sm">
  <div class="card-header">
    <span class="flex items-center justify-between"
      ><span class="card-title">Hobby</span><input type="radio" class="radio" name="card-plan" value="hobby"
    /></span>
    <p class="card-description">€0 / month</p>
  </div>
</label>
```

```html example part label="Card (md)"
<div class="card" data-size="md" style="width: 15rem">
  <div class="card-header">
    <h3 class="card-title">Size md</h3>
    <p class="card-description">Padding and type scale together.</p>
  </div>
  <div class="card-footer"><button class="btn" data-size="sm">Action</button></div>
</div>
```

```html example part label="Card (lg)"
<div class="card" data-size="lg" style="width: 18rem">
  <div class="card-header">
    <h3 class="card-title">Size lg</h3>
    <p class="card-description">Padding and type scale together.</p>
  </div>
  <div class="card-footer"><button class="btn" data-size="sm">Action</button></div>
</div>
```

```html example part label="Card (xl)"
<div class="card" data-size="xl" style="width: 21rem">
  <div class="card-header">
    <h3 class="card-title">Size xl</h3>
    <p class="card-description">Padding and type scale together.</p>
  </div>
  <div class="card-footer"><button class="btn" data-size="lg">Action</button></div>
</div>
```

```html example part label="Card (outline)"
<div class="card" data-variant="outline">
  <div class="card-header">
    <h3 class="card-title">Outline</h3>
    <p class="card-description">Border only, no fill.</p>
  </div>
</div>
```

```html example part label="Card (dashed)"
<div class="card" data-variant="dashed">
  <div class="card-header">
    <h3 class="card-title">Dashed</h3>
    <p class="card-description">A drop zone or a placeholder.</p>
  </div>
</div>
```

```html example part label="Card (ghost)"
<div class="card" data-variant="ghost">
  <div class="card-header">
    <h3 class="card-title">Ghost</h3>
    <p class="card-description">No border, no fill.</p>
  </div>
</div>
```

```html example part label="Card (muted)"
<div class="card" data-variant="muted">
  <div class="card-header">
    <h3 class="card-title">Muted</h3>
    <p class="card-description">A soft, borderless surface.</p>
  </div>
</div>
```

```html example part label="Card (elevated)"
<div class="card" data-variant="elevated">
  <div class="card-header">
    <h3 class="card-title">Elevated</h3>
    <p class="card-description">A shadow instead of a border.</p>
  </div>
</div>
```

```html example part label="Card (primary)"
<div class="card" data-variant="primary">
  <div class="card-header">
    <h3 class="card-title">Primary</h3>
    <p class="card-description">The brand surface.</p>
  </div>
</div>
```

```html example part label="Card (neutral)"
<div class="card" data-variant="neutral">
  <div class="card-header">
    <h3 class="card-title">Neutral</h3>
    <p class="card-description">The inverse surface.</p>
  </div>
</div>
```

```html example part label="Card (glass)"
<div class="card" data-variant="glass">
  <div class="card-header">
    <h3 class="card-title">Glass</h3>
    <p class="card-description">Frosted over the pattern behind it.</p>
  </div>
</div>
```
