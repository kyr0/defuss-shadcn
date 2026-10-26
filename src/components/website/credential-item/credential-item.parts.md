<!-- The individual examples of Credential Item: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Credential Item"
<article class="mk-credential-item">
  <span class="mk-credential-item-seal" aria-hidden="true"><i data-lucide="shield-check"></i></span>
  <div class="mk-credential-item-body">
    <h3 class="mk-credential-item-name">ISO/IEC 27001:2022</h3>
    <p class="mk-credential-item-issuer">Issued by TÜV Rheinland</p>
    <dl class="mk-credential-item-dates">
      <div
        ><dt>Issued</dt><dd><time datetime="2025-03">Mar 2025</time></dd></div
      >
      <div
        ><dt>Valid until</dt><dd><time datetime="2028-03">Mar 2028</time></dd></div
      >
      <div
        ><dt>Certificate</dt><dd><code>ISMS-48213</code></dd></div
      >
    </dl>
  </div>
  <a class="mk-credential-item-verify" href="#" target="_blank" rel="noopener"
    ><i data-lucide="badge-check"></i> Verify<span class="sr-only">
      ISO/IEC 27001:2022 with TÜV Rheinland (opens in a new tab)</span
    ></a
  >
</article>
```

```html example part label="Credential Item (compact)"
<article class="mk-credential-item" data-variant="compact">
  <span class="mk-credential-item-seal" aria-hidden="true"><i data-lucide="scale"></i></span>
  <div class="mk-credential-item-body">
    <h3 class="mk-credential-item-name">GDPR compliant</h3>
    <p class="mk-credential-item-issuer">Issued by EU data protection review</p>
    <dl class="mk-credential-item-dates">
      <div
        ><dt>Issued</dt><dd><time datetime="2026">2026</time></dd></div
      >
      <div
        ><dt>Valid until</dt><dd><time datetime="2027">2027</time></dd></div
      >
      <div
        ><dt>Certificate</dt><dd><code>DPA-77</code></dd></div
      >
    </dl>
  </div>
  <a class="mk-credential-item-verify" href="#" target="_blank" rel="noopener"
    ><i data-lucide="badge-check"></i> Verify<span class="sr-only">
      GDPR compliant with EU data protection review (opens in a new tab)</span
    ></a
  >
</article>
```
