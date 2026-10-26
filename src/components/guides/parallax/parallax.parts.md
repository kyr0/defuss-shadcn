<!-- The individual examples of Parallax: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Parallax"
<section class="parallax" style="height: 30rem; background: #000" aria-label="A parallax hero">
  <div class="parallax-layer" style="--parallax-speed: 40%"><img src="images/mk-wide3.png" alt="" /></div>
  <div
    class="parallax-layer"
    style="
      --parallax-speed: 40%;
      z-index: 0;
      background: linear-gradient(to top, rgb(0 0 0 / 0.7), rgb(0 0 0 / 0.1) 60%);
    "
  ></div>
  <div
    class="parallax-layer"
    data-motion="fade"
    style="--parallax-speed: -35%; z-index: 1; color: #fff; text-align: center"
  >
    <div
      ><p style="margin: 0; font-size: 0.875rem; letter-spacing: 0.2em; text-transform: uppercase; opacity: 0.8"
        >Acme 4.0</p
      ><h2 style="margin: 0.5rem 0 0; font-size: clamp(2.5rem, 7vw, 4rem); font-weight: 800; letter-spacing: -0.04em"
        >Ship calmly.</h2
      ></div
    >
  </div>
</section>
```
