<!-- The individual examples of Start Menu: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Start Menu"
<div class="start-menu" id="sm-demo" popover="" aria-label="Start">
  <div class="start-menu-head">
    <span class="avatar" data-size="sm"><span class="avatar-fallback">AH</span></span>
    <span>Aron</span>
  </div>
  <label class="start-menu-search">
    <i data-lucide="search"></i>
    <input type="search" placeholder="Search apps" aria-label="Search apps" />
  </label>
  <p class="start-menu-heading">Pinned</p>
  <div class="start-menu-pinned" role="group" aria-label="Pinned">
    <button class="start-menu-item" type="button" data-value="notes">
      <span class="start-menu-icon"><i data-lucide="notebook-pen"></i></span>
      <span class="start-menu-label">Notes</span>
    </button>
    <button class="start-menu-item" type="button" data-value="mail">
      <span class="start-menu-icon"><i data-lucide="mail"></i></span>
      <span class="start-menu-label">Mail</span>
    </button>
    <button class="start-menu-item" type="button" data-value="photos">
      <span class="start-menu-icon"><i data-lucide="images"></i></span>
      <span class="start-menu-label">Photos</span>
    </button>
  </div>
  <p class="start-menu-heading">All apps</p>
  <div class="start-menu-list" role="group" aria-label="All apps">
    <button class="start-menu-item" type="button" aria-controls="sm-acc">
      <span class="start-menu-icon"><i data-lucide="folder"></i></span>
      <span class="start-menu-label">Accessories</span>
    </button>
    <div class="start-menu-sub" id="sm-acc" popover="" aria-label="Accessories">
      <button class="start-menu-item" type="button" data-value="calculator">
        <span class="start-menu-icon"><i data-lucide="calculator"></i></span>
        <span class="start-menu-label">Calculator</span>
      </button>
      <button class="start-menu-item" type="button" aria-controls="sm-games">
        <span class="start-menu-icon"><i data-lucide="folder"></i></span>
        <span class="start-menu-label">Games</span>
      </button>
      <div class="start-menu-sub" id="sm-games" popover="" aria-label="Games">
        <button class="start-menu-item" type="button" data-value="solitaire">
          <span class="start-menu-icon"><i data-lucide="spade"></i></span>
          <span class="start-menu-label">Solitaire</span>
        </button>
      </div>
    </div>
    <button class="start-menu-item" type="button" data-value="terminal">
      <span class="start-menu-icon"><i data-lucide="square-terminal"></i></span>
      <span class="start-menu-label">Terminal</span>
    </button>
    <button class="start-menu-item" type="button" data-value="calendar">
      <span class="start-menu-icon"><i data-lucide="calendar"></i></span>
      <span class="start-menu-label">Calendar</span>
    </button>
  </div>
  <p class="start-menu-empty" hidden>No results</p>
  <div class="start-menu-foot">
    <button class="start-menu-item" type="button" data-value="settings">
      <span class="start-menu-icon"><i data-lucide="settings"></i></span>
      <span class="start-menu-label">Settings</span>
    </button>
    <button class="start-menu-item" type="button" data-value="shutdown" aria-label="Shut down">
      <span class="start-menu-icon"><i data-lucide="power"></i></span>
    </button>
  </div>
</div>
```
