---
name: Credential Item
type: BLK
section: website
why: An article with a <dl> of dates (<time>) and an external verify link with full context for screen readers - no script.
when: Trust, security and compliance pages. Customer logos are brand-logos; press coverage is press-item.
where: dist/components/credential-item/credential-item.css
supportedStates: default
---

# Pattern: Credential Item

## Native basis
An `<article>`: a seal icon, the credential name, the issuer, a `<dl>` with issued / valid-until dates and the certificate number, and an external "Verify" link.

---

## Native Web APIs
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - a self-contained item
- [`<dl>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl) - term / value pairs
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable dates

---

## Structure

```html
  <article class="mk-credential-item">
    <span class="mk-credential-item-seal" aria-hidden="true"><i data-lucide="shield-check"></i></span>
    <div class="mk-credential-item-body">
      <h3 class="mk-credential-item-name">ISO/IEC 27001:2022</h3>
      <p class="mk-credential-item-issuer">Issued by TÜV Rheinland</p>
      <dl class="mk-credential-item-dates">
        <div><dt>Issued</dt><dd><time datetime="2025-03">Mar 2025</time></dd></div>
        <div><dt>Valid until</dt><dd><time datetime="2028-03">Mar 2028</time></dd></div>
        <div><dt>Certificate</dt><dd><code>ISMS-48213</code></dd></div>
      </dl>
    </div>
    <a class="mk-credential-item-verify" href="#" target="_blank" rel="noopener"><i data-lucide="badge-check"></i> Verify<span class="sr-only"> ISO/IEC 27001:2022 with TÜV Rheinland (opens in a new tab)</span></a>
  </article>
  <article class="mk-credential-item">
    <span class="mk-credential-item-seal" aria-hidden="true"><i data-lucide="lock"></i></span>
    <div class="mk-credential-item-body">
      <h3 class="mk-credential-item-name">SOC 2 Type II</h3>
      <p class="mk-credential-item-issuer">Issued by Prescient Assurance</p>
      <dl class="mk-credential-item-dates">
        <div><dt>Issued</dt><dd><time datetime="2026-01">Jan 2026</time></dd></div>
        <div><dt>Valid until</dt><dd><time datetime="2027-01">Jan 2027</time></dd></div>
        <div><dt>Certificate</dt><dd><code>SOC2-2026-117</code></dd></div>
      </dl>
    </div>
    <a class="mk-credential-item-verify" href="#" target="_blank" rel="noopener"><i data-lucide="badge-check"></i> Verify<span class="sr-only"> SOC 2 Type II with Prescient Assurance (opens in a new tab)</span></a>
  </article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A card with a seal, the details and the verify link |
| `data-variant="compact"` | A row - name, issuer and verify link; dates hidden |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| verify link | `target="_blank" rel="noopener"` + sr-only text | Says what is verified and that it opens a new tab |
| dates | `<time datetime>` | Machine-readable |

---

## Notes
- Link to the issuer's public registry, not to a PDF on your own site.
