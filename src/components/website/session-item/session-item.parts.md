<!-- The individual examples of Session Item: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Session Item"
<article class="mk-session-item" aria-labelledby="ss-2" style="--mk-session-color: oklch(0.62 0.17 240)">
  <div class="mk-session-item-time"
    ><time datetime="2026-11-12T10:45">10:45</time><span>11:30</span><small>45 min</small></div
  >
  <div class="mk-session-item-body">
    <span class="mk-session-item-track">Engineering</span>
    <h3 class="mk-session-item-title" id="ss-2">Sync that never fails</h3>
    <p class="mk-session-item-desc">How a CRDT engine survives trains, tunnels and transatlantic flights.</p>
    <ul class="mk-session-item-speakers"
      ><li
        ><span class="avatar" data-size="sm"><img class="avatar-image" src="images/mk-portrait.png" alt="" /></span
        >Sophie Tan</li
      ></ul
    >
    <span class="mk-session-item-room"><i data-lucide="map-pin"></i>Room A</span>
  </div>
  <label class="mk-session-item-save"
    ><input type="checkbox" name="schedule" value="ss-2" /><span class="mk-session-item-save-off"
      ><i data-lucide="plus"></i> Add</span
    ><span class="mk-session-item-save-on"><i data-lucide="check"></i> Added</span
    ><span class="sr-only"> Sync that never fails to my schedule</span></label
  >
</article>
```

```html example part label="Session Item (keynote)"
<article
  class="mk-session-item"
  data-variant="keynote"
  aria-labelledby="ss-1"
  style="--mk-session-color: oklch(0.6 0.2 300)"
>
  <div class="mk-session-item-time"
    ><time datetime="2026-11-12T09:30">09:30</time><span>10:15</span><small>45 min</small></div
  >
  <div class="mk-session-item-body">
    <span class="mk-session-item-track">Keynote</span>
    <h3 class="mk-session-item-title" id="ss-1">The quiet product: building for attention, not engagement</h3>
    <ul class="mk-session-item-speakers"
      ><li
        ><span class="avatar" data-size="sm"><img class="avatar-image" src="images/mk-portrait2.png" alt="" /></span
        >Priya Natarajan</li
      ></ul
    >
    <span class="mk-session-item-room"><i data-lucide="map-pin"></i>Main hall</span>
  </div>
  <label class="mk-session-item-save"
    ><input type="checkbox" name="schedule" value="ss-1" checked /><span class="mk-session-item-save-off"
      ><i data-lucide="plus"></i> Add</span
    ><span class="mk-session-item-save-on"><i data-lucide="check"></i> Added</span
    ><span class="sr-only"> The quiet product: building for attention, not engagement to my schedule</span></label
  >
</article>
```

```html example part label="Session Item (break)"
<article class="mk-session-item" data-variant="break" aria-labelledby="ss-b">
  <div class="mk-session-item-time"
    ><time datetime="2026-11-12T10:15">10:15</time><span>10:45</span><small>30 min</small></div
  >
  <div class="mk-session-item-body">
    <h3 class="mk-session-item-title" id="ss-b">Coffee break ☕</h3>
  </div>
</article>
```

```html example part label="Session Item (cover)"
<article
  class="mk-session-item"
  data-variant="cover"
  aria-labelledby="sc-1"
  style="--mk-session-color: oklch(0.6 0.2 300)"
>
  <img
    class="mk-session-item-cover"
    src="https://picsum.photos/id/452/800/600"
    alt="A crowd raising their hands under blue stage lights"
  />
  <div class="mk-session-item-time"><time datetime="2027-05-12T09:30">09:30</time><span>10:15</span></div>
  <div class="mk-session-item-body">
    <span class="mk-session-item-live">Live now</span>
    <span class="mk-session-item-track">Keynote</span>
    <h3 class="mk-session-item-title" id="sc-1">The quiet product: building for attention, not engagement</h3>
    <ul class="mk-session-item-tags" aria-label="Format and level"
      ><li>Keynote</li
      ><li>All levels</li></ul
    >
    <ul class="mk-session-item-speakers"
      ><li
        ><span class="avatar" data-size="sm"
          ><img class="avatar-image" src="https://i.pravatar.cc/96?img=45" alt="" /></span
        >Priya Natarajan</li
      ></ul
    >
    <span class="mk-session-item-room"><i data-lucide="map-pin"></i>Main hall</span>
    <ul class="mk-session-item-links">
      <li
        ><a href="#"
          ><i data-lucide="share-2"></i>Share<span class="sr-only">
            of The quiet product: building for attention, not engagement</span
          ></a
        ></li
      >
    </ul>
  </div>
  <label class="mk-session-item-save"
    ><input type="checkbox" name="schedule" value="sc-1" /><span class="mk-session-item-save-off"
      ><i data-lucide="plus"></i> Add</span
    ><span class="mk-session-item-save-on"><i data-lucide="check"></i> Added</span
    ><span class="sr-only"> The quiet product: building for attention, not engagement to my schedule</span></label
  >
</article>
```
