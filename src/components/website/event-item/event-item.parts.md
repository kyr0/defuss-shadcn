<!-- The individual examples of Event Item: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Event Item"
<article class="mk-event-item">
  <time class="mk-event-item-date" datetime="2026-10-14T18:00"><span>Oct</span><b>14</b></time>
  <div class="mk-event-item-body">
    <h3 class="mk-event-item-title"><a href="#">Calm Product Meetup Lisbon</a></h3>
    <ul class="mk-event-item-meta"
      ><li><i data-lucide="clock"></i>Tue 18:00 – 21:00</li
      ><li><i data-lucide="map-pin"></i>LX Factory, Lisbon</li></ul
    >
    <div class="mk-event-item-tags"
      ><span class="badge" data-variant="secondary" data-size="sm">In person</span
      ><span class="badge" data-variant="secondary" data-size="sm">Free</span></div
    >
  </div>
  <a class="btn" data-variant="outline" data-size="sm" href="#" aria-label="Register for Calm Product Meetup Lisbon"
    >Register</a
  >
</article>
```

```html example part label="Event Item (card)"
<article class="mk-event-item" data-variant="card">
  <img class="mk-event-item-media" src="https://picsum.photos/seed/ev-meetup/800/450" alt="" />
  <time class="mk-event-item-date" datetime="2026-10-14T18:00"><span>Oct</span><b>14</b></time>
  <div class="mk-event-item-body">
    <h3 class="mk-event-item-title"><a href="#">Calm Product Meetup Lisbon</a></h3>
    <ul class="mk-event-item-meta"
      ><li><i data-lucide="clock"></i>Tue 18:00</li
      ><li><i data-lucide="map-pin"></i>Lisbon</li></ul
    >
    <div class="mk-event-item-tags"><span class="badge" data-variant="secondary" data-size="sm">In person</span></div>
  </div>
  <a class="btn" data-variant="outline" data-size="sm" href="#" aria-label="Register for Calm Product Meetup Lisbon"
    >Register</a
  >
</article>
```

```html example part label="Event Item (compact)"
<article class="mk-event-item" data-variant="compact">
  <time class="mk-event-item-date" datetime="2026-10-14"><span>Oct</span><b>14</b></time>
  <div class="mk-event-item-body">
    <h3 class="mk-event-item-title"><a href="#">Calm Product Meetup</a></h3>
    <ul class="mk-event-item-meta"
      ><li><i data-lucide="clock"></i>18:00</li
      ><li><i data-lucide="map-pin"></i>Lisbon</li></ul
    >
  </div>
  <a class="btn" data-variant="outline" data-size="sm" href="#" aria-label="Register for Calm Product Meetup"
    >Register</a
  >
</article>
```
