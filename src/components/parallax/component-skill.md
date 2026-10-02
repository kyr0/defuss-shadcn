---
name: Parallax
type: ATM
why: Scroll-driven animations - a view timeline on the scene drives each layer's translate, animation-timeline view() drives the reveals; the compositor runs it, no scroll listener or IntersectionObserver.
when: Depth in heroes and illustrations, a photo drifting behind copy, sections and cards that rise into view on a long page. Entrance animations that play once on load take motion; animations that play on demand take anim-canvas / the df$.anim engine.
where: dist/components/parallax/parallax.css
supportedStates: default
---

# Pattern: Parallax

## Native basis
A `.parallax` scene declares a view timeline (`view-timeline-name: --parallax`) - its passage through the scrollport, 0% as it enters, 100% as it leaves. Every `.parallax-layer` is an absolutely positioned plane animated on that timeline (`animation-range: cover`): it translates by its speed, far layers lagging, near ones leading. `.parallax-reveal` animates on its own `view()` timeline over the entry range - fade + rise as it scrolls in.

---

## Native Web APIs
- [`view-timeline`](https://developer.mozilla.org/en-US/docs/Web/CSS/view-timeline-name) - the scene's passage through the scrollport
- [`animation-timeline: view()`](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline/view) - a reveal tied to its own entry
- [`animation-range`](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-range) - `cover` for the layers, `entry` for the reveals
- [`translate`](https://developer.mozilla.org/en-US/docs/Web/CSS/translate) - the shift, composited
- [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) - the still composition

---

## Structure

```html
<section class="parallax" style="height:34rem;background:#0b1026" aria-label="A night landscape">
  <div class="parallax-layer" style="--parallax-speed:60%;z-index:-7;background:linear-gradient(#0b1026, #2a1b4f 60%, #5b2a63)"><svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><circle cx="196.2" cy="168.2" r="0.55" fill="#fff" opacity="0.51"/><circle cx="177.3" cy="151.9" r="0.50" fill="#fff" opacity="0.92"/><circle cx="235.8" cy="123.2" r="0.77" fill="#fff" opacity="0.86"/><circle cx="263.0" cy="23.0" r="1.05" fill="#fff" opacity="0.50"/><circle cx="268.8" cy="47.4" r="1.13" fill="#fff" opacity="0.67"/><circle cx="70.5" cy="15.0" r="1.62" fill="#fff" opacity="0.98"/><circle cx="48.3" cy="133.3" r="1.64" fill="#fff" opacity="0.47"/><circle cx="167.7" cy="165.1" r="1.27" fill="#fff" opacity="0.53"/><circle cx="68.2" cy="295.7" r="0.98" fill="#fff" opacity="0.50"/><circle cx="218.8" cy="99.1" r="0.60" fill="#fff" opacity="0.85"/><circle cx="140.7" cy="105.0" r="0.50" fill="#fff" opacity="0.95"/><circle cx="95.5" cy="265.2" r="1.01" fill="#fff" opacity="0.50"/><circle cx="241.2" cy="120.5" r="1.39" fill="#fff" opacity="0.77"/><circle cx="54.4" cy="67.2" r="0.99" fill="#fff" opacity="0.41"/><circle cx="19.1" cy="123.7" r="1.29" fill="#fff" opacity="0.77"/><circle cx="382.1" cy="97.5" r="0.97" fill="#fff" opacity="0.67"/><circle cx="175.5" cy="251.5" r="0.99" fill="#fff" opacity="0.64"/><circle cx="105.6" cy="71.0" r="1.37" fill="#fff" opacity="0.44"/><circle cx="108.1" cy="230.0" r="1.52" fill="#fff" opacity="0.98"/><circle cx="370.7" cy="258.1" r="1.37" fill="#fff" opacity="0.77"/><circle cx="221.8" cy="7.2" r="0.82" fill="#fff" opacity="0.58"/><circle cx="86.1" cy="118.1" r="1.29" fill="#fff" opacity="0.83"/><circle cx="106.7" cy="286.9" r="0.41" fill="#fff" opacity="0.58"/><circle cx="234.3" cy="132.3" r="0.52" fill="#fff" opacity="0.99"/><circle cx="182.5" cy="261.7" r="1.16" fill="#fff" opacity="0.65"/><circle cx="50.0" cy="238.0" r="1.57" fill="#fff" opacity="0.52"/><circle cx="9.8" cy="46.3" r="1.32" fill="#fff" opacity="0.80"/><circle cx="264.1" cy="260.9" r="0.70" fill="#fff" opacity="0.89"/><circle cx="67.5" cy="11.2" r="0.51" fill="#fff" opacity="0.36"/><circle cx="214.8" cy="249.2" r="1.50" fill="#fff" opacity="0.44"/><circle cx="197.6" cy="15.6" r="0.76" fill="#fff" opacity="0.67"/><circle cx="25.6" cy="106.7" r="0.70" fill="#fff" opacity="0.54"/><circle cx="316.2" cy="41.0" r="0.61" fill="#fff" opacity="0.35"/><circle cx="249.6" cy="25.9" r="0.92" fill="#fff" opacity="0.42"/><circle cx="191.2" cy="124.4" r="0.41" fill="#fff" opacity="0.84"/><circle cx="180.6" cy="221.7" r="0.84" fill="#fff" opacity="0.95"/><circle cx="286.8" cy="191.8" r="0.75" fill="#fff" opacity="0.58"/><circle cx="30.9" cy="264.3" r="0.51" fill="#fff" opacity="0.39"/><circle cx="74.5" cy="91.2" r="0.44" fill="#fff" opacity="0.74"/><circle cx="175.8" cy="113.2" r="1.10" fill="#fff" opacity="0.94"/><circle cx="211.3" cy="126.5" r="0.56" fill="#fff" opacity="0.93"/><circle cx="264.8" cy="149.7" r="1.58" fill="#fff" opacity="0.79"/><circle cx="183.4" cy="290.1" r="1.55" fill="#fff" opacity="0.62"/><circle cx="199.1" cy="210.8" r="1.42" fill="#fff" opacity="0.94"/><circle cx="218.0" cy="297.0" r="1.23" fill="#fff" opacity="0.89"/><circle cx="176.1" cy="22.6" r="1.66" fill="#fff" opacity="0.71"/><circle cx="260.9" cy="117.4" r="1.38" fill="#fff" opacity="0.86"/><circle cx="200.9" cy="133.2" r="1.55" fill="#fff" opacity="0.82"/><circle cx="20.7" cy="110.7" r="1.01" fill="#fff" opacity="0.99"/><circle cx="263.5" cy="46.2" r="1.28" fill="#fff" opacity="0.46"/><circle cx="80.0" cy="158.3" r="0.81" fill="#fff" opacity="0.36"/><circle cx="383.8" cy="154.3" r="0.45" fill="#fff" opacity="0.60"/><circle cx="73.6" cy="197.3" r="0.70" fill="#fff" opacity="0.83"/><circle cx="122.2" cy="272.3" r="1.18" fill="#fff" opacity="0.61"/><circle cx="332.1" cy="53.5" r="0.85" fill="#fff" opacity="0.62"/><circle cx="357.7" cy="170.5" r="0.51" fill="#fff" opacity="0.46"/><circle cx="193.9" cy="75.2" r="0.92" fill="#fff" opacity="0.68"/><circle cx="132.2" cy="8.3" r="0.48" fill="#fff" opacity="0.83"/><circle cx="182.5" cy="166.0" r="1.57" fill="#fff" opacity="0.42"/><circle cx="162.0" cy="67.0" r="0.91" fill="#fff" opacity="0.37"/><circle cx="50.9" cy="218.5" r="1.51" fill="#fff" opacity="0.37"/><circle cx="214.7" cy="83.7" r="0.85" fill="#fff" opacity="0.50"/><circle cx="293.0" cy="147.6" r="0.70" fill="#fff" opacity="0.76"/><circle cx="354.7" cy="284.4" r="0.90" fill="#fff" opacity="0.96"/><circle cx="321.0" cy="123.6" r="0.51" fill="#fff" opacity="0.49"/><circle cx="53.6" cy="217.2" r="1.16" fill="#fff" opacity="0.98"/><circle cx="110.4" cy="105.8" r="0.82" fill="#fff" opacity="0.45"/><circle cx="368.1" cy="185.8" r="1.43" fill="#fff" opacity="0.81"/><circle cx="110.5" cy="175.6" r="0.57" fill="#fff" opacity="0.81"/><circle cx="384.7" cy="182.8" r="0.83" fill="#fff" opacity="0.57"/><circle cx="222.6" cy="170.1" r="0.56" fill="#fff" opacity="0.60"/><circle cx="330.4" cy="223.0" r="1.09" fill="#fff" opacity="0.69"/><circle cx="244.1" cy="115.3" r="0.51" fill="#fff" opacity="0.44"/><circle cx="151.1" cy="276.7" r="1.38" fill="#fff" opacity="0.95"/><circle cx="180.0" cy="259.2" r="0.97" fill="#fff" opacity="0.41"/><circle cx="355.3" cy="103.3" r="0.72" fill="#fff" opacity="0.51"/><circle cx="20.4" cy="105.5" r="0.85" fill="#fff" opacity="0.99"/><circle cx="325.8" cy="184.3" r="1.10" fill="#fff" opacity="0.38"/><circle cx="185.1" cy="47.0" r="1.03" fill="#fff" opacity="0.55"/><circle cx="97.1" cy="156.6" r="1.14" fill="#fff" opacity="0.49"/><circle cx="234.6" cy="198.3" r="1.04" fill="#fff" opacity="0.41"/><circle cx="0.1" cy="146.2" r="1.00" fill="#fff" opacity="0.35"/><circle cx="247.8" cy="29.8" r="0.51" fill="#fff" opacity="0.55"/><circle cx="173.0" cy="201.2" r="1.65" fill="#fff" opacity="0.92"/><circle cx="66.9" cy="0.9" r="1.49" fill="#fff" opacity="1.00"/><circle cx="339.3" cy="225.3" r="1.14" fill="#fff" opacity="0.94"/><circle cx="7.7" cy="92.9" r="1.20" fill="#fff" opacity="0.39"/><circle cx="252.2" cy="111.2" r="0.79" fill="#fff" opacity="0.97"/><circle cx="238.3" cy="43.0" r="1.29" fill="#fff" opacity="0.81"/><circle cx="5.4" cy="73.6" r="0.56" fill="#fff" opacity="0.56"/></svg></div>
  <div class="parallax-layer" style="--parallax-speed:52%;z-index:-6"><svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><radialGradient id="glow"><stop offset="0" stop-color="#fff6d6"/><stop offset=".35" stop-color="#ffe9a8" stop-opacity=".9"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient></defs><circle cx="290" cy="95" r="60" fill="url(#glow)"/><circle cx="290" cy="95" r="22" fill="#fff8e1"/></svg></div>
  <div class="parallax-layer" style="--parallax-speed:20%;z-index:-5">
    <h2 style="margin:0;color:#fff;font-size:clamp(2.5rem, 8vw, 4.5rem);font-weight:800;letter-spacing:-0.04em;text-shadow:0 4px 30px rgb(0 0 0 / .4)">Into the night</h2>
  </div>
  <div class="parallax-layer" style="--parallax-speed:34%;z-index:-4"><svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path d="M0 210 L40 170 L80 195 L130 140 L180 185 L230 130 L280 180 L330 145 L400 190 V300 H0Z" fill="#3d2a66"/></svg></div>
  <div class="parallax-layer" style="--parallax-speed:22%;z-index:-3"><svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path d="M0 235 L60 185 L110 225 L170 170 L230 220 L300 175 L360 215 L400 195 V300 H0Z" fill="#2b1d4d"/></svg></div>
  <div class="parallax-layer" style="--parallax-speed:10%;z-index:-2"><svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path d="M0 255 Q80 215 160 248 T320 240 T400 236 V300 H0Z" fill="#1b1335"/></svg></div>
  <div class="parallax-layer" style="--parallax-speed:-18%;z-index:-1"><svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path d="M0 300 V275 L4 266 L9 245 L14 266 L19 275 L23 261.2 L28 229 L33 261.2 L38 275 L42 256.4 L47 213 L52 256.4 L57 275 L61 262.4 L66 233 L71 262.4 L76 275 L80 257.6 L85 217 L90 257.6 L95 275 L99 258.8 L104 221 L109 258.8 L114 275 L118 264.8 L123 241 L128 264.8 L133 275 L137 260 L142 225 L147 260 L152 275 L156 255.2 L161 209 L166 255.2 L171 275 L175 261.2 L180 229 L185 261.2 L190 275 L194 262.4 L199 233 L204 262.4 L209 275 L213 257.6 L218 217 L223 257.6 L228 275 L232 263.6 L237 237 L242 263.6 L247 275 L251 258.8 L256 221 L261 258.8 L266 275 L270 254 L275 205 L280 254 L285 275 L289 266 L294 245 L299 266 L304 275 L308 261.2 L313 229 L318 261.2 L323 275 L327 256.4 L332 213 L337 256.4 L342 275 L346 262.4 L351 233 L356 262.4 L361 275 L365 257.6 L370 217 L375 257.6 L380 275 L384 258.8 L389 221 L394 258.8 L399 275 L403 264.8 L408 241 L413 264.8 L418 275 V300Z" fill="#0a0716"/></svg></div>
</section>
```

Reveal anything:

```html
<section class="parallax-reveal">…</section>
<div class="card parallax-reveal" data-reveal="zoom">…</div>
```

---

## Variants

| Attribute | On | Behavior |
|-----------|----|----------|
| `data-depth="far"` | layer | Lags 50% - the back plane (sky, background photo) |
| `data-depth="mid"` | layer | Lags 25% |
| `data-depth="near"` | layer | Leads by 15% |
| `data-depth="front"` | layer | Leads by 35%, above the content |
| `--parallax-speed` | layer / drift | Any travel - a percentage (`60%`, `-18%`) or a length (`7rem`) - overrides the preset |
| `data-motion` | layer | Stacked on the shift: `zoom` (to `--parallax-scale`, 2.5), `fade` (out), `spin` (`--parallax-turn`, 90deg), `pass` (in, hold, out - give each its own `animation-range`), `zoom fade` |
| `data-sticky` + `.parallax-stage` | scene | The stage pins while the scene scrolls `--parallax-length` (3) stages of `--parallax-stage` (100dvh); the layers play over the pinned stretch |
| `.parallax-drift` | any element | In flow, moves by its own `--parallax-speed` (default 4rem) while it scrolls by |
| `data-axis="inline"` | scene | A sideways scroller - layers shift along the inline axis |
| `data-reveal` | reveal | *(omitted)* fade + rise · `zoom` fade + grow · `fade` fade only; `--parallax-rise` sets the lift |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| scene | `aria-label` (or a heading) | When it is a meaningful region |
| decorative layers | `aria-hidden="true"` on their SVG / `alt=""` on their image | Depth is decoration |
| content | in flow | `.parallax-content` stays interactive and readable |

---

## Notes
- The scene needs a height (the content plane or an explicit one); `overflow: clip` keeps the travelling layers inside it.
- Parallax needs scroll distance to shine: the bigger the gap between speeds and the longer the passage, the deeper the scene. A sticky scene buys distance without a tall picture.
- Layers overscan the scene by 1.5x their speed, so the travel never shows an edge.
- Reduced motion and browsers without scroll-driven animations get the still composition - nothing jumps.
- The timelines sit in an `@supports` rule of their own, so a minifier cannot fold them into the `animation` shorthand.
