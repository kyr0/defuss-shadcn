<!-- The individual examples of Team Member: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Team Member"
<article class="mk-team-member" aria-labelledby="tm-0">
  <div class="mk-team-member-portrait">
    <img class="mk-team-member-photo" src="https://i.pravatar.cc/480?img=25" alt="Portrait of Sophie Tan" />
    <span class="mk-team-member-tag"><i data-lucide="map-pin"></i>Lisbon</span>
    <ul class="mk-team-member-links">
      <li
        ><a href="#" aria-label="Sophie Tan on LinkedIn"
          ><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path
              d="M5 3.5A2.5 2.5 0 1 1 5 8.5 2.5 2.5 0 0 1 5 3.5ZM3 10h4v11H3V10Zm7 0h3.8v1.6h.1c.5-1 1.8-1.9 3.6-1.9 3.9 0 4.5 2.5 4.5 5.8V21h-4v-4.9c0-1.2 0-2.7-1.7-2.7s-2 1.3-2 2.6v5h-4V10Z"
            /></svg></a
      ></li>
      <li
        ><a href="#" aria-label="Sophie Tan on GitHub"
          ><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path
              d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2.1c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5Z"
            /></svg></a
      ></li>
      <li
        ><a href="#" aria-label="Sophie Tan on X"
          ><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path
              d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L.8 2h6.4l4.4 5.9L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z"
            /></svg></a
      ></li>
      <li
        ><a href="#" aria-label="Email Sophie Tan"><i data-lucide="mail"></i></a
      ></li>
    </ul>
  </div>
  <div class="mk-team-member-body">
    <h3 class="mk-team-member-name" id="tm-0">Sophie Tan</h3>
    <p class="mk-team-member-role">Head of Engineering</p>
    <p class="mk-team-member-bio">Builds the sync engine. Previously at a database company you have heard of.</p>
  </div>
</article>
```

```html example part label="Team Member (horizontal)"
<article class="mk-team-member" data-variant="horizontal" aria-labelledby="tm-h0">
  <div class="mk-team-member-portrait">
    <img class="mk-team-member-photo" src="https://i.pravatar.cc/480?img=16" alt="Portrait of Priya Natarajan" />
    <span class="mk-team-member-tag"><i data-lucide="map-pin"></i>Remote</span>
    <ul class="mk-team-member-links">
      <li
        ><a href="#" aria-label="Priya Natarajan on LinkedIn"
          ><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path
              d="M5 3.5A2.5 2.5 0 1 1 5 8.5 2.5 2.5 0 0 1 5 3.5ZM3 10h4v11H3V10Zm7 0h3.8v1.6h.1c.5-1 1.8-1.9 3.6-1.9 3.9 0 4.5 2.5 4.5 5.8V21h-4v-4.9c0-1.2 0-2.7-1.7-2.7s-2 1.3-2 2.6v5h-4V10Z"
            /></svg></a
      ></li>
      <li
        ><a href="#" aria-label="Priya Natarajan on GitHub"
          ><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path
              d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2.1c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5Z"
            /></svg></a
      ></li>
      <li
        ><a href="#" aria-label="Priya Natarajan on X"
          ><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path
              d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L.8 2h6.4l4.4 5.9L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z"
            /></svg></a
      ></li>
      <li
        ><a href="#" aria-label="Email Priya Natarajan"><i data-lucide="mail"></i></a
      ></li>
    </ul>
  </div>
  <div class="mk-team-member-body">
    <h3 class="mk-team-member-name" id="tm-h0">Priya Natarajan</h3>
    <p class="mk-team-member-role">Chief Product Officer</p>
    <p class="mk-team-member-bio">Leads product and research after eight years building tools for hospitals.</p>
  </div>
</article>
```

```html example part label="Team Member (compact)"
<article class="mk-team-member" data-variant="compact" aria-labelledby="tm-c0">
  <div class="mk-team-member-portrait">
    <img class="mk-team-member-photo" src="https://i.pravatar.cc/480?img=25" alt="Portrait of Sophie Tan" />
    <ul class="mk-team-member-links">
      <li
        ><a href="#" aria-label="Sophie Tan on LinkedIn"
          ><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path
              d="M5 3.5A2.5 2.5 0 1 1 5 8.5 2.5 2.5 0 0 1 5 3.5ZM3 10h4v11H3V10Zm7 0h3.8v1.6h.1c.5-1 1.8-1.9 3.6-1.9 3.9 0 4.5 2.5 4.5 5.8V21h-4v-4.9c0-1.2 0-2.7-1.7-2.7s-2 1.3-2 2.6v5h-4V10Z"
            /></svg></a
      ></li>
      <li
        ><a href="#" aria-label="Sophie Tan on GitHub"
          ><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path
              d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2.1c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5Z"
            /></svg></a
      ></li>
      <li
        ><a href="#" aria-label="Sophie Tan on X"
          ><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path
              d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L.8 2h6.4l4.4 5.9L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z"
            /></svg></a
      ></li>
      <li
        ><a href="#" aria-label="Email Sophie Tan"><i data-lucide="mail"></i></a
      ></li>
    </ul>
  </div>
  <div class="mk-team-member-body">
    <h3 class="mk-team-member-name" id="tm-c0">Sophie Tan</h3>
    <p class="mk-team-member-role">Head of Engineering</p>
  </div>
</article>
```
