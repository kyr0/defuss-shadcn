<!-- The individual examples of Steps: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Steps (xs)"
<ol class="steps" data-size="xs" style="max-width: 22rem; width: 100%; flex: 1">
  <li class="step" data-status="complete">
    <div class="step-indicator"
      ><svg
        aria-hidden="true"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M20 6 9 17l-5-5" /></svg
    ></div>
    <div class="step-content"><p class="step-title">Account</p></div>
  </li>
  <li class="step" data-status="current" aria-current="step">
    <div class="step-indicator">2</div>
    <div class="step-content"><p class="step-title">Profile</p></div>
  </li>
  <li class="step">
    <div class="step-indicator">3</div>
    <div class="step-content"><p class="step-title">Done</p></div>
  </li>
</ol>
```

```html example part label="Steps (sm)"
<ol class="steps" data-size="sm" style="max-width: 22rem; width: 100%; flex: 1">
  <li class="step" data-status="complete">
    <div class="step-indicator"
      ><svg
        aria-hidden="true"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M20 6 9 17l-5-5" /></svg
    ></div>
    <div class="step-content"><p class="step-title">Account</p></div>
  </li>
  <li class="step" data-status="current" aria-current="step">
    <div class="step-indicator">2</div>
    <div class="step-content"><p class="step-title">Profile</p></div>
  </li>
  <li class="step">
    <div class="step-indicator">3</div>
    <div class="step-content"><p class="step-title">Done</p></div>
  </li>
</ol>
```

```html example part label="Steps (md)"
<ol class="steps" data-size="md" style="max-width: 22rem; width: 100%; flex: 1">
  <li class="step" data-status="complete">
    <div class="step-indicator"
      ><svg
        aria-hidden="true"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M20 6 9 17l-5-5" /></svg
    ></div>
    <div class="step-content"><p class="step-title">Account</p></div>
  </li>
  <li class="step" data-status="current" aria-current="step">
    <div class="step-indicator">2</div>
    <div class="step-content"><p class="step-title">Profile</p></div>
  </li>
  <li class="step">
    <div class="step-indicator">3</div>
    <div class="step-content"><p class="step-title">Done</p></div>
  </li>
</ol>
```

```html example part label="Steps (lg)"
<ol class="steps" data-size="lg" style="max-width: 22rem; width: 100%; flex: 1">
  <li class="step" data-status="complete">
    <div class="step-indicator"
      ><svg
        aria-hidden="true"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M20 6 9 17l-5-5" /></svg
    ></div>
    <div class="step-content"><p class="step-title">Account</p></div>
  </li>
  <li class="step" data-status="current" aria-current="step">
    <div class="step-indicator">2</div>
    <div class="step-content"><p class="step-title">Profile</p></div>
  </li>
  <li class="step">
    <div class="step-indicator">3</div>
    <div class="step-content"><p class="step-title">Done</p></div>
  </li>
</ol>
```

```html example part label="Steps (xl)"
<ol class="steps" data-size="xl" style="max-width: 22rem; width: 100%; flex: 1">
  <li class="step" data-status="complete">
    <div class="step-indicator"
      ><svg
        aria-hidden="true"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M20 6 9 17l-5-5" /></svg
    ></div>
    <div class="step-content"><p class="step-title">Account</p></div>
  </li>
  <li class="step" data-status="current" aria-current="step">
    <div class="step-indicator">2</div>
    <div class="step-content"><p class="step-title">Profile</p></div>
  </li>
  <li class="step">
    <div class="step-indicator">3</div>
    <div class="step-content"><p class="step-title">Done</p></div>
  </li>
</ol>
```

```html example part label="Steps (primary)"
<ol class="steps" data-variant="primary" data-active-step="3">
  <li class="step" data-status="complete">
    <div class="step-indicator">1</div>
    <div class="step-content"><p class="step-title">Register</p></div>
  </li>
  <li class="step" data-status="complete">
    <div class="step-indicator">2</div>
    <div class="step-content"><p class="step-title">Choose plan</p></div>
  </li>
  <li class="step" data-status="current" aria-current="step">
    <div class="step-indicator">3</div>
    <div class="step-content"><p class="step-title">Purchase</p></div>
  </li>
  <li class="step">
    <div class="step-indicator">4</div>
    <div class="step-content"><p class="step-title">Receive product</p></div>
  </li>
</ol>
```

```html example part label="Steps (secondary)"
<ol class="steps" data-variant="secondary" data-active-step="3">
  <li class="step" data-status="complete">
    <div class="step-indicator">1</div>
    <div class="step-content"><p class="step-title">Register</p></div>
  </li>
  <li class="step" data-status="complete">
    <div class="step-indicator">2</div>
    <div class="step-content"><p class="step-title">Choose plan</p></div>
  </li>
  <li class="step" data-status="current" aria-current="step">
    <div class="step-indicator">3</div>
    <div class="step-content"><p class="step-title">Purchase</p></div>
  </li>
  <li class="step">
    <div class="step-indicator">4</div>
    <div class="step-content"><p class="step-title">Receive product</p></div>
  </li>
</ol>
```

```html example part label="Steps (accent)"
<ol class="steps" data-variant="accent" data-active-step="3">
  <li class="step" data-status="complete">
    <div class="step-indicator">1</div>
    <div class="step-content"><p class="step-title">Register</p></div>
  </li>
  <li class="step" data-status="complete">
    <div class="step-indicator">2</div>
    <div class="step-content"><p class="step-title">Choose plan</p></div>
  </li>
  <li class="step" data-status="current" aria-current="step">
    <div class="step-indicator">3</div>
    <div class="step-content"><p class="step-title">Purchase</p></div>
  </li>
  <li class="step">
    <div class="step-indicator">4</div>
    <div class="step-content"><p class="step-title">Receive product</p></div>
  </li>
</ol>
```

```html example part label="Steps (info)"
<ol class="steps" data-variant="info" data-active-step="3">
  <li class="step" data-status="complete">
    <div class="step-indicator">1</div>
    <div class="step-content"><p class="step-title">Register</p></div>
  </li>
  <li class="step" data-status="complete">
    <div class="step-indicator">2</div>
    <div class="step-content"><p class="step-title">Choose plan</p></div>
  </li>
  <li class="step" data-status="current" aria-current="step">
    <div class="step-indicator">3</div>
    <div class="step-content"><p class="step-title">Purchase</p></div>
  </li>
  <li class="step">
    <div class="step-indicator">4</div>
    <div class="step-content"><p class="step-title">Receive product</p></div>
  </li>
</ol>
```

```html example part label="Steps (success)"
<ol class="steps" data-variant="success" data-active-step="3">
  <li class="step" data-status="complete">
    <div class="step-indicator">1</div>
    <div class="step-content"><p class="step-title">Register</p></div>
  </li>
  <li class="step" data-status="complete">
    <div class="step-indicator">2</div>
    <div class="step-content"><p class="step-title">Choose plan</p></div>
  </li>
  <li class="step" data-status="current" aria-current="step">
    <div class="step-indicator">3</div>
    <div class="step-content"><p class="step-title">Purchase</p></div>
  </li>
  <li class="step">
    <div class="step-indicator">4</div>
    <div class="step-content"><p class="step-title">Receive product</p></div>
  </li>
</ol>
```

```html example part label="Steps (warning)"
<ol class="steps" data-variant="warning" data-active-step="3">
  <li class="step" data-status="complete">
    <div class="step-indicator">1</div>
    <div class="step-content"><p class="step-title">Register</p></div>
  </li>
  <li class="step" data-status="complete">
    <div class="step-indicator">2</div>
    <div class="step-content"><p class="step-title">Choose plan</p></div>
  </li>
  <li class="step" data-status="current" aria-current="step">
    <div class="step-indicator">3</div>
    <div class="step-content"><p class="step-title">Purchase</p></div>
  </li>
  <li class="step">
    <div class="step-indicator">4</div>
    <div class="step-content"><p class="step-title">Receive product</p></div>
  </li>
</ol>
```

```html example part label="Steps (destructive)"
<ol class="steps" data-variant="destructive" data-active-step="3">
  <li class="step" data-status="complete">
    <div class="step-indicator">1</div>
    <div class="step-content"><p class="step-title">Register</p></div>
  </li>
  <li class="step" data-status="complete">
    <div class="step-indicator">2</div>
    <div class="step-content"><p class="step-title">Choose plan</p></div>
  </li>
  <li class="step" data-status="current" aria-current="step">
    <div class="step-indicator">3</div>
    <div class="step-content"><p class="step-title">Purchase</p></div>
  </li>
  <li class="step">
    <div class="step-indicator">4</div>
    <div class="step-content"><p class="step-title">Receive product</p></div>
  </li>
</ol>
```
