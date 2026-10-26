<!-- The individual examples of Menubar: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Menubar (lg)"
<div class="menubar" data-size="lg" role="menubar" aria-label="Large">
  <button class="menubar-trigger" data-dropdown-trigger="mbv3-file">File</button>
  <div id="mbv3-file" role="menu" popover="" class="dropdown-content" aria-label="File" style="min-width: 14rem">
    <button role="menuitem" class="dropdown-item" tabindex="-1">New<span class="dropdown-shortcut">⌘N</span></button>
    <button role="menuitem" class="dropdown-item" tabindex="-1">Open…<span class="dropdown-shortcut">⌘O</span></button>
  </div>
  <button class="menubar-trigger" data-dropdown-trigger="mbv3-edit">Edit</button>
  <div id="mbv3-edit" role="menu" popover="" class="dropdown-content" aria-label="Edit" style="min-width: 14rem">
    <button role="menuitem" class="dropdown-item" tabindex="-1">Undo<span class="dropdown-shortcut">⌘Z</span></button>
  </div>
</div>
```

```html example part label="Menubar (ghost)"
<div class="menubar" data-variant="ghost" role="menubar" aria-label="Ghost">
  <button class="menubar-trigger" data-dropdown-trigger="mbv2-file">File</button>
  <div id="mbv2-file" role="menu" popover="" class="dropdown-content" aria-label="File" style="min-width: 14rem">
    <button role="menuitem" class="dropdown-item" tabindex="-1">New<span class="dropdown-shortcut">⌘N</span></button>
    <button role="menuitem" class="dropdown-item" tabindex="-1">Open…<span class="dropdown-shortcut">⌘O</span></button>
  </div>
  <button class="menubar-trigger" data-dropdown-trigger="mbv2-edit">Edit</button>
  <div id="mbv2-edit" role="menu" popover="" class="dropdown-content" aria-label="Edit" style="min-width: 14rem">
    <button role="menuitem" class="dropdown-item" tabindex="-1">Undo<span class="dropdown-shortcut">⌘Z</span></button>
  </div>
</div>
```

```html example part label="Menubar (ghost, sm)"
<div class="menubar" role="menubar" aria-label="Document" data-variant="ghost" data-size="sm" id="de-menu">
  <button class="menubar-trigger" data-dropdown-trigger="de-m-file">File</button>
  <div class="dropdown-content" id="de-m-file" role="menu" popover="" aria-label="File">
    <button class="dropdown-item" role="menuitem" tabindex="-1" data-de-action="new"
      ><i data-lucide="file-plus"></i> New document</button
    >
    <div class="dropdown-sub">
      <button class="dropdown-item dropdown-sub-trigger" role="menuitem" tabindex="-1"
        ><i data-lucide="folder-open"></i> Open</button
      >
      <div class="dropdown-content dropdown-sub-content" role="menu" popover="" aria-label="Open">
        <button class="dropdown-item" role="menuitem" tabindex="-1" data-de-action="open-markdown"
          ><i data-lucide="file-text"></i> Markdown...</button
        >
        <button class="dropdown-item" role="menuitem" tabindex="-1" data-de-action="open-annotations"
          ><i data-lucide="message-square-text"></i> Comment annotations...</button
        >
      </div>
    </div>
    <div class="dropdown-separator" role="separator"></div>
    <button class="dropdown-item" role="menuitem" tabindex="-1" data-de-action="save"
      ><i data-lucide="save"></i> Save <span class="dropdown-shortcut">⌘S</span></button
    >
    <button class="dropdown-item" role="menuitem" tabindex="-1" data-de-action="save-as"
      ><i data-lucide="download"></i> Save as... <span class="dropdown-shortcut">⇧⌘S</span></button
    >
    <div class="dropdown-sub">
      <button class="dropdown-item dropdown-sub-trigger" role="menuitem" tabindex="-1"
        ><i data-lucide="file-output"></i> Export</button
      >
      <div class="dropdown-content dropdown-sub-content" role="menu" popover="" aria-label="Export">
        <button class="dropdown-item" role="menuitem" tabindex="-1" data-de-action="export-annotations"
          ><i data-lucide="file-json"></i> Comment annotations (JSON)</button
        >
      </div>
    </div>
    <div class="dropdown-separator" role="separator"></div>
    <button class="dropdown-item" role="menuitem" tabindex="-1" data-de-action="share"
      ><i data-lucide="share-2"></i> Share...</button
    >
  </div>
  <button class="menubar-trigger" data-dropdown-trigger="de-m-edit">Edit</button>
  <div class="dropdown-content" id="de-m-edit" role="menu" popover="" aria-label="Edit">
    <button class="dropdown-item" role="menuitem" tabindex="-1" data-de-action="comment"
      ><i data-lucide="message-square-plus"></i> Comment <span class="dropdown-shortcut">⌘K</span></button
    >
    <div class="dropdown-separator" role="separator"></div>
    <button class="dropdown-item" role="menuitem" tabindex="-1" data-de-action="prev-comment"
      ><i data-lucide="chevron-up"></i> Previous comment</button
    >
    <button class="dropdown-item" role="menuitem" tabindex="-1" data-de-action="next-comment"
      ><i data-lucide="chevron-down"></i> Next comment</button
    >
  </div>
  <button class="menubar-trigger" data-dropdown-trigger="de-m-insert">Insert</button>
  <div class="dropdown-content" id="de-m-insert" role="menu" popover="" aria-label="Insert">
    <button class="dropdown-item" role="menuitem" tabindex="-1" data-de-command="table"
      ><i data-lucide="table"></i> Table</button
    >
    <button class="dropdown-item" role="menuitem" tabindex="-1" data-de-command="delimiter"
      ><i data-lucide="minus"></i> Divider</button
    >
  </div>
  <button class="menubar-trigger" data-dropdown-trigger="de-m-format">Format</button>
  <div class="dropdown-content" id="de-m-format" role="menu" popover="" aria-label="Format">
    <div class="dropdown-sub">
      <button class="dropdown-item dropdown-sub-trigger" role="menuitem" tabindex="-1"
        ><i data-lucide="bold"></i> Text</button
      >
      <div class="dropdown-content dropdown-sub-content" role="menu" popover="" aria-label="Text">
        <button class="dropdown-item" role="menuitem" tabindex="-1" data-de-command="bold"
          ><i data-lucide="bold"></i> Bold <span class="dropdown-shortcut">⌘B</span></button
        >
        <button class="dropdown-item" role="menuitem" tabindex="-1" data-de-command="italic"
          ><i data-lucide="italic"></i> Italic <span class="dropdown-shortcut">⌘I</span></button
        >
        <button class="dropdown-item" role="menuitem" tabindex="-1" data-de-command="underline"
          ><i data-lucide="underline"></i> Underline <span class="dropdown-shortcut">⌘U</span></button
        >
        <button class="dropdown-item" role="menuitem" tabindex="-1" data-de-command="marker"
          ><i data-lucide="highlighter"></i> Highlight</button
        >
        <button class="dropdown-item" role="menuitem" tabindex="-1" data-de-command="inline-code"
          ><i data-lucide="code"></i> Inline code</button
        >
      </div>
    </div>
    <div class="dropdown-sub">
      <button class="dropdown-item dropdown-sub-trigger" role="menuitem" tabindex="-1"
        ><i data-lucide="heading"></i> Paragraph styles</button
      >
      <div class="dropdown-content dropdown-sub-content" role="menu" popover="" aria-label="Paragraph styles">
        <button class="dropdown-item" role="menuitem" tabindex="-1" data-de-command="paragraph"
          ><i data-lucide="pilcrow"></i> Normal text</button
        >
        <button class="dropdown-item" role="menuitem" tabindex="-1" data-de-command="header:1"
          ><i data-lucide="heading-1"></i> Heading 1</button
        >
        <button class="dropdown-item" role="menuitem" tabindex="-1" data-de-command="header:2"
          ><i data-lucide="heading-2"></i> Heading 2</button
        >
        <button class="dropdown-item" role="menuitem" tabindex="-1" data-de-command="header:3"
          ><i data-lucide="heading-3"></i> Heading 3</button
        >
      </div>
    </div>
    <div class="dropdown-sub">
      <button class="dropdown-item dropdown-sub-trigger" role="menuitem" tabindex="-1"
        ><i data-lucide="list"></i> Bullets &amp; numbering</button
      >
      <div class="dropdown-content dropdown-sub-content" role="menu" popover="" aria-label="Bullets and numbering">
        <button class="dropdown-item" role="menuitem" tabindex="-1" data-de-command="list:unordered"
          ><i data-lucide="list"></i> Bulleted list</button
        >
        <button class="dropdown-item" role="menuitem" tabindex="-1" data-de-command="list:ordered"
          ><i data-lucide="list-ordered"></i> Numbered list</button
        >
        <button class="dropdown-item" role="menuitem" tabindex="-1" data-de-command="list:checklist"
          ><i data-lucide="list-checks"></i> Checklist</button
        >
      </div>
    </div>
    <div class="dropdown-separator" role="separator"></div>
    <button class="dropdown-item" role="menuitem" tabindex="-1" data-de-command="quote"
      ><i data-lucide="quote"></i> Quote</button
    >
    <button class="dropdown-item" role="menuitem" tabindex="-1" data-de-command="code"
      ><i data-lucide="square-code"></i> Code block</button
    >
  </div>
  <button class="menubar-trigger" data-dropdown-trigger="de-m-view">View</button>
  <div class="dropdown-content" id="de-m-view" role="menu" popover="" aria-label="View">
    <button
      class="dropdown-item dropdown-check"
      role="menuitemcheckbox"
      aria-checked="false"
      tabindex="-1"
      data-de-view="sidebar"
      >Document list</button
    >
    <div class="dropdown-separator" role="separator"></div>
    <div role="group" aria-label="Annotation layers">
      <div class="dropdown-label" data-inset="">Annotation layers</div>
      <button
        class="dropdown-item dropdown-check"
        role="menuitemcheckbox"
        aria-checked="true"
        tabindex="-1"
        data-de-view="findings"
        >Findings</button
      >
      <button
        class="dropdown-item dropdown-check"
        role="menuitemcheckbox"
        aria-checked="true"
        tabindex="-1"
        data-de-view="summary"
        >Summary</button
      >
    </div>
  </div>
</div>
```

```html example part label="Menubar (muted, sm)"
<div class="menubar" data-variant="muted" data-size="sm" role="menubar" aria-label="Muted, small">
  <button class="menubar-trigger" data-dropdown-trigger="mbv1-file">File</button>
  <div id="mbv1-file" role="menu" popover="" class="dropdown-content" aria-label="File" style="min-width: 14rem">
    <button role="menuitem" class="dropdown-item" tabindex="-1">New<span class="dropdown-shortcut">⌘N</span></button>
    <button role="menuitem" class="dropdown-item" tabindex="-1">Open…<span class="dropdown-shortcut">⌘O</span></button>
  </div>
  <button class="menubar-trigger" data-dropdown-trigger="mbv1-edit">Edit</button>
  <div id="mbv1-edit" role="menu" popover="" class="dropdown-content" aria-label="Edit" style="min-width: 14rem">
    <button role="menuitem" class="dropdown-item" tabindex="-1">Undo<span class="dropdown-shortcut">⌘Z</span></button>
  </div>
</div>
```
