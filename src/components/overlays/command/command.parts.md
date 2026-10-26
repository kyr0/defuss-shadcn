<!-- The individual examples of Command Palette: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Command Palette"
<dialog id="demo-cmd" class="command" role="dialog" aria-modal="true" aria-label="Command menu">
  <div class="command-content">
    <div class="command-input-wrapper">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        class="command-input"
        type="text"
        placeholder="Type a command or search..."
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
      />
    </div>
    <div class="command-list">
      <div class="command-group">
        <p class="command-group-heading">Suggestions</p>
        <button class="command-item">Calendar</button>
        <button class="command-item">Search Emoji</button>
        <button class="command-item">Calculator</button>
      </div>
      <div class="command-separator"></div>
      <div class="command-group">
        <p class="command-group-heading">Settings</p>
        <button class="command-item">Profile <span class="command-shortcut">⌘P</span></button>
        <button class="command-item">Billing <span class="command-shortcut">⌘B</span></button>
        <button class="command-item">Settings <span class="command-shortcut">⌘S</span></button>
      </div>
    </div>
    <div class="command-empty" hidden>No results found.</div>
  </div>
</dialog>
```
