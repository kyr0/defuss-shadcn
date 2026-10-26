<!-- The individual examples of QR Code: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="QR Code (sm)"
<figure class="qr-code" data-value="https://example.com" data-ecc="L" data-size="sm">
  <div class="qr-code-symbol" role="img" aria-label="QR code with error correction L"></div>
  <output class="qr-code-status" hidden></output>
  <figcaption class="qr-code-caption">L</figcaption>
</figure>
```

```html example part label="QR Code (outline, lg)"
<figure class="qr-code" data-value="https://example.com" data-size="lg" data-variant="outline">
  <div class="qr-code-symbol" role="img" aria-label="Large QR code for example.com"></div>
  <output class="qr-code-status" hidden></output>
  <figcaption class="qr-code-caption">Large · outline</figcaption>
</figure>
```

```html example part label="QR Code (outline, md)"
<figure class="qr-code" data-value="https://example.com" data-size="md" data-variant="outline">
  <div class="qr-code-symbol" role="img" aria-label="Medium QR code for example.com"></div>
  <output class="qr-code-status" hidden></output>
  <figcaption class="qr-code-caption">Medium · outline</figcaption>
</figure>
```

```html example part label="QR Code (plain, sm)"
<figure class="qr-code" data-value="https://example.com" data-size="sm" data-variant="plain">
  <div class="qr-code-symbol" role="img" aria-label="Small QR code for example.com"></div>
  <output class="qr-code-status" hidden></output>
  <figcaption class="qr-code-caption">Small · plain</figcaption>
</figure>
```
