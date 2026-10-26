<!-- The individual examples of Sidebar: one instance of each kind (variant, size, native state) the docs examples use - not shown on the docs pages; the Studio's library lists them first on the component's page (AGENTS.md "Individual examples"). -->

```html example part label="Sidebar"
<style>
  /* Margin: the scaffold's own glue - the three-column layout and the page
     look. Every control is a shipped component (Sidebar, Menubar, Toolbar,
     Toggle Group, Button, Badge, Avatar, Input, Kbd, Dialog, Textarea,
     Toast, Editor.js, Document Comments) */
  .de {
    container: de / inline-size;
    position: relative;
    display: flex;
    width: 100%;
    height: var(--scaffold-height, 50rem);
    overflow: hidden;
    background: var(--background);
    color: var(--foreground);
    font-size: 0.875rem;
  }
  /* files dragged over the editor: the drop target (the Chat Session's look), its label says what a drop does */
  .de[data-drop-active]::after {
    content: attr(data-drop-label);
    position: absolute;
    inset: 0.75rem;
    z-index: 3;
    display: grid;
    place-items: center;
    padding: 1rem;
    border: 2px dashed var(--ring);
    border-radius: var(--radius-lg);
    background: color-mix(in oklch, var(--background) 92%, transparent);
    color: var(--foreground);
    font-size: 1.125rem;
    font-weight: 600;
    text-align: center;
    text-wrap: balance;
    pointer-events: none;
  }
  @media (forced-colors: active) {
    .de[data-drop-active]::after {
      border-color: Highlight;
      forced-color-adjust: none;
    }
  }
  /* the document list is open or closed, never an icon rail, and sits in the flow (the page
     narrows, nothing overlays it) - the trigger in the header stays visible either way */
  .de .app-sidebar {
    position: relative;
    flex: none;
    height: 100%;
    display: flex;
  }
  .de .app-sidebar[data-state='collapsed'] {
    display: none;
  }
  .de .sidebar-link[data-de-doc] .badge {
    margin-inline-start: auto;
  }
  .de-search {
    padding: 0.5rem 0.75rem 0.25rem;
  }
  .de-main {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }
  .de-top {
    display: flex;
    flex: none;
    align-items: center;
    gap: 0.5rem;
    height: 4rem;
    padding-inline: 0.75rem;
    border-block-end: 1px solid var(--border);
  }
  /* the title above the menubar, as in Google Docs */
  .de-heading {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
  }
  .de-title {
    max-width: 100%;
    margin: 0;
    padding: 0.0625rem 0.375rem;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    background: none;
    color: inherit;
    font: inherit;
    font-size: 1.0625rem;
    font-weight: 600;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    &:hover {
      border-color: var(--border);
    }
    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: 1px;
    }
  }
  .de-saved {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--muted-foreground);
    font-size: 0.75rem;
    white-space: nowrap;
    & svg {
      width: 0.875rem;
      height: 0.875rem;
    }
  }
  .de-saved[data-state='editing'] {
    color: var(--foreground);
  }
  .de .toolbar {
    flex: none;
    flex-wrap: wrap;
    margin: 0.5rem 0.75rem 0;
  }
  .de-body {
    display: flex;
    flex: 1;
    min-height: 0;
  }
  .de-page {
    flex: 1;
    min-width: 0;
    overflow: auto;
    overscroll-behavior: contain;
    padding: 2rem clamp(1rem, 6cqi, 4rem) 6rem;
    background: color-mix(in oklch, var(--muted) 40%, var(--background));
  }
  .de-sheet {
    max-width: 46rem;
    min-height: 100%;
    margin-inline: auto;
    padding: 3rem clamp(1.5rem, 5cqi, 4rem) 4rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--card);
    box-shadow: var(--shadow-sm);
  }
  .de .editorjs {
    --editorjs-measure: 100%;
    --editorjs-min-height: 24rem;
  }
  .de .doc-comments {
    flex: none;
    border-inline-start: 1px solid var(--border);
    background: var(--background);
  }
  .de-status {
    display: flex;
    flex: none;
    align-items: center;
    gap: 0.75rem;
    height: 2rem;
    padding-inline: 0.75rem;
    border-block-start: 1px solid var(--border);
    color: var(--muted-foreground);
    font-size: 0.75rem;
    & .badge {
      font-size: 0.6875rem;
    }
  }
  .de-status-spacer {
    flex: 1;
  }
  /* the annotation layers fit the status bar */
  .de-status .toggle {
    height: 1.5rem;
    padding-inline: 0.5rem;
    font-size: 0.75rem;
    & span {
      color: var(--muted-foreground);
    }
  }
  .de-quote {
    margin: 0 0 0.75rem;
    padding: 0.5rem 0.75rem;
    border-inline-start: 3px solid var(--primary);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    background: var(--muted);
    color: var(--muted-foreground);
    font-style: italic;
  }
  .de-colors .toggle {
    width: 2rem;
    padding: 0;
  }
  .de-colors .toggle::before {
    content: '';
    display: block;
    width: 0.875rem;
    height: 0.875rem;
    border-radius: 50%;
    background: var(--de-c);
  }
  .de-colors .toggle[aria-pressed='true'] {
    outline: 2px solid var(--de-c);
    outline-offset: -2px;
  }
  .de-share-link {
    display: flex;
    gap: 0.5rem;
  }
  .de [hidden] {
    display: none !important;
  }
  .de-comments-toggle {
    display: none;
  }
  @container de (width < 56rem) {
    .de-comments-toggle {
      display: inline-flex;
    }
    .de .doc-comments {
      display: none;
    }
    .de[data-comments] .doc-comments {
      display: flex;
      position: absolute;
      inset-block: 4rem 2rem;
      inset-inline-end: 0;
      z-index: 2;
      box-shadow: var(--shadow-lg);
    }
    .de-page {
      padding-inline: 1rem;
    }
    .de-sheet {
      padding: 2rem 1.25rem 3rem;
    }
  }
</style>
<div class="de sidebar-layout" id="de">
  <aside class="app-sidebar" id="de-sidebar" data-state="collapsed" aria-label="Documents">
    <div class="sidebar-header">
      <a class="sidebar-logo" href="#"
        ><i data-lucide="file-pen-line"></i><span class="sidebar-logo-text">Margin</span></a
      >
    </div>
    <div class="de-search"
      ><input class="input" type="search" placeholder="Search documents" aria-label="Search documents" data-size="sm"
    /></div>
    <div class="sidebar-content">
      <details class="sidebar-group" open>
        <summary><span>My documents</span><i data-lucide="chevron-right"></i></summary>
        <nav class="sidebar-nav" id="de-doc-nav">
          <a class="sidebar-link" href="#" data-de-doc="launch" aria-current="page"
            ><i data-lucide="file-text"></i> <span>Q4 launch plan</span
            ><span class="badge" data-variant="secondary" data-de-count="launch">5</span></a
          >
          <a class="sidebar-link" href="#" data-de-doc="brief"
            ><i data-lucide="file-text"></i> <span>Design brief</span
            ><span class="badge" data-variant="secondary" data-de-count="brief">2</span></a
          >
          <a class="sidebar-link" href="#" data-de-doc="notes"
            ><i data-lucide="file-text"></i> <span>Meeting notes</span
            ><span class="badge" data-variant="secondary" data-de-count="notes" hidden>0</span></a
          >
          <a class="sidebar-link" href="#" data-de-doc="pruefung"
            ><i data-lucide="file-search"></i> <span>Importprüfung</span
            ><span class="badge" data-variant="secondary" data-de-count="pruefung" hidden>0</span></a
          >
        </nav>
      </details>
      <details class="sidebar-group" open>
        <summary><span>Shared with me</span><i data-lucide="chevron-right"></i></summary>
        <nav class="sidebar-nav">
          <a class="sidebar-link" href="#" aria-disabled="true"><i data-lucide="users"></i> <span>Hiring loop</span></a>
          <a class="sidebar-link" href="#" aria-disabled="true"><i data-lucide="users"></i> <span>Brand voice</span></a>
        </nav>
      </details>
    </div>
    <div class="sidebar-footer"
      ><span class="avatar" data-size="sm"><span class="avatar-fallback">YO</span></span> You</div
    >
  </aside>

  <div class="de-main">
    <header class="de-top">
      <button class="sidebar-trigger" data-sidebar-trigger="de-sidebar" aria-label="Toggle documents"
        ><i data-lucide="panel-left"></i
      ></button>
      <div class="de-heading">
        <h1 class="de-title" id="de-title">Q4 launch plan</h1>
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
              <div
                class="dropdown-content dropdown-sub-content"
                role="menu"
                popover=""
                aria-label="Bullets and numbering"
              >
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
      </div>
      <span class="de-saved" id="de-saved" data-state="saved"><i data-lucide="cloud"></i> <span>Saved</span></span>
      <div class="avatar-group" aria-label="Editing now">
        <span class="avatar" data-size="sm"><span class="avatar-fallback">MC</span></span>
        <span class="avatar" data-size="sm"><span class="avatar-fallback">JP</span></span>
        <span class="avatar" data-size="sm"><span class="avatar-fallback">AN</span></span>
      </div>
      <button
        class="btn"
        data-variant="outline"
        data-size="sm"
        type="button"
        data-dialog-trigger="de-share"
        aria-haspopup="dialog"
        ><i data-lucide="share-2"></i> Share</button
      >
      <button
        class="btn de-comments-toggle"
        data-variant="ghost"
        data-size="icon-sm"
        type="button"
        id="de-comments-toggle"
        aria-label="Toggle comments"
        aria-pressed="false"
        ><i data-lucide="message-square-text"></i
      ></button>
    </header>

    <div class="toolbar" role="toolbar" aria-label="Formatting" id="de-bar" data-size="sm">
      <div class="toggle-group" role="group" aria-label="Block" data-type="single">
        <button class="toggle" aria-pressed="false" data-editor-command="paragraph" aria-label="Paragraph" type="button"
          ><i data-lucide="pilcrow"></i
        ></button>
        <button class="toggle" aria-pressed="false" data-editor-command="header:1" aria-label="Heading 1" type="button"
          ><i data-lucide="heading-1"></i
        ></button>
        <button class="toggle" aria-pressed="false" data-editor-command="header:2" aria-label="Heading 2" type="button"
          ><i data-lucide="heading-2"></i
        ></button>
        <button class="toggle" aria-pressed="false" data-editor-command="header:3" aria-label="Heading 3" type="button"
          ><i data-lucide="heading-3"></i
        ></button>
      </div>
      <div class="separator" data-orientation="vertical" role="separator"></div>
      <div class="toggle-group" role="group" aria-label="Text style" data-type="multiple">
        <button class="toggle" aria-pressed="false" data-editor-command="bold" aria-label="Bold" type="button"
          ><i data-lucide="bold"></i
        ></button>
        <button class="toggle" aria-pressed="false" data-editor-command="italic" aria-label="Italic" type="button"
          ><i data-lucide="italic"></i
        ></button>
        <button class="toggle" aria-pressed="false" data-editor-command="underline" aria-label="Underline" type="button"
          ><i data-lucide="underline"></i
        ></button>
      </div>
      <button
        class="btn"
        data-variant="ghost"
        data-size="icon-sm"
        data-editor-command="marker"
        aria-label="Highlight"
        type="button"
        ><i data-lucide="highlighter"></i
      ></button>
      <button
        class="btn"
        data-variant="ghost"
        data-size="icon-sm"
        data-editor-command="inline-code"
        aria-label="Inline code"
        type="button"
        ><i data-lucide="code"></i
      ></button>
      <div class="separator" data-orientation="vertical" role="separator"></div>
      <div class="toggle-group" role="group" aria-label="Lists" data-type="single">
        <button
          class="toggle"
          aria-pressed="false"
          data-editor-command="list:unordered"
          aria-label="Bulleted list"
          type="button"
          ><i data-lucide="list"></i
        ></button>
        <button
          class="toggle"
          aria-pressed="false"
          data-editor-command="list:ordered"
          aria-label="Numbered list"
          type="button"
          ><i data-lucide="list-ordered"></i
        ></button>
        <button
          class="toggle"
          aria-pressed="false"
          data-editor-command="list:checklist"
          aria-label="Checklist"
          type="button"
          ><i data-lucide="list-checks"></i
        ></button>
        <button class="toggle" aria-pressed="false" data-editor-command="quote" aria-label="Quote" type="button"
          ><i data-lucide="quote"></i
        ></button>
        <button class="toggle" aria-pressed="false" data-editor-command="code" aria-label="Code block" type="button"
          ><i data-lucide="square-code"></i
        ></button>
      </div>
      <button
        class="btn"
        data-variant="ghost"
        data-size="icon-sm"
        data-editor-command="delimiter"
        aria-label="Divider"
        type="button"
        ><i data-lucide="minus"></i
      ></button>
      <button
        class="btn"
        data-variant="ghost"
        data-size="icon-sm"
        data-editor-command="table"
        aria-label="Table"
        type="button"
        ><i data-lucide="table"></i
      ></button>
      <div class="separator" data-orientation="vertical" role="separator"></div>
      <button class="btn" data-variant="outline" data-size="sm" type="button" id="de-comment" data-de-action="comment"
        ><i data-lucide="message-square-plus"></i> Comment</button
      >
    </div>

    <div class="de-body">
      <div class="de-page" id="de-page">
        <div class="de-sheet">
          <div class="editorjs" id="de-editor" data-toolbar="de-bar" data-placeholder="Start writing..."> </div>
        </div>
      </div>
      <aside class="doc-comments" id="de-comments" data-for="de-editor" data-author="You" aria-label="Comments">
      </aside>
    </div>

    <footer class="de-status">
      <span id="de-words">0 words</span>
      <span class="badge" data-variant="outline">Markdown</span>
      <div class="toggle-group" role="group" aria-label="Annotation layers" data-type="multiple" id="de-layers" hidden>
        <button class="toggle" type="button" data-size="sm" aria-pressed="true" data-de-layer="findings"
          >Findings <span data-de-layer-count="findings">0</span></button
        >
        <button class="toggle" type="button" data-size="sm" aria-pressed="true" data-de-layer="summary"
          >Summary <span data-de-layer-count="summary">0</span></button
        >
      </div>
      <span class="de-status-spacer"></span>
      <span><kbd class="kbd">⌘</kbd> <kbd class="kbd">K</kbd> comment on the selection</span>
    </footer>
  </div>

  <dialog class="dialog" id="de-share" role="dialog" aria-modal="true" aria-labelledby="de-share-title">
    <div class="dialog-content">
      <div class="dialog-header">
        <h2 class="dialog-title" id="de-share-title">Share this document</h2>
        <p class="dialog-description">Anyone with the link can comment. Editing stays with the workspace.</p>
      </div>
      <div class="dialog-body de-share-link">
        <input
          class="input"
          type="url"
          readonly
          value="https://margin.example/d/q4-launch-plan"
          aria-label="Share link"
          id="de-share-url"
        />
        <button class="btn" data-variant="outline" type="button" id="de-share-copy"
          ><i data-lucide="copy"></i> Copy</button
        >
      </div>
      <div class="dialog-footer">
        <button class="btn" type="button" data-dialog-close="">Done</button>
      </div>
    </div>
  </dialog>

  <dialog class="dialog" id="de-new-comment" role="dialog" aria-modal="true" aria-labelledby="de-new-comment-title">
    <form class="dialog-content" id="de-new-comment-form">
      <div class="dialog-header">
        <h2 class="dialog-title" id="de-new-comment-title">New comment</h2>
        <p class="dialog-description">On the selected text. Markdown works in the comment.</p>
      </div>
      <div class="dialog-body">
        <blockquote class="de-quote" id="de-new-comment-quote"></blockquote>
        <textarea class="textarea" id="de-new-comment-body" data-rows="3" data-max-rows="8" required aria-label="Comment" placeholder="What should change?"></textarea>
        <div class="flex items-center gap-2 mt-3">
          <span class="text-sm text-muted-foreground">Colour</span>
          <div
            class="toggle-group de-colors"
            role="group"
            aria-label="Comment colour"
            data-type="single"
            id="de-new-comment-colors"
          >
            <button
              class="toggle"
              type="button"
              aria-pressed="true"
              data-color="chart-1"
              aria-label="Red"
              style="--de-c: var(--chart-1)"
            ></button>
            <button
              class="toggle"
              type="button"
              aria-pressed="false"
              data-color="chart-2"
              aria-label="Blue"
              style="--de-c: var(--chart-2)"
            ></button>
            <button
              class="toggle"
              type="button"
              aria-pressed="false"
              data-color="chart-3"
              aria-label="Green"
              style="--de-c: var(--chart-3)"
            ></button>
            <button
              class="toggle"
              type="button"
              aria-pressed="false"
              data-color="chart-4"
              aria-label="Yellow"
              style="--de-c: var(--chart-4)"
            ></button>
            <button
              class="toggle"
              type="button"
              aria-pressed="false"
              data-color="chart-5"
              aria-label="Purple"
              style="--de-c: var(--chart-5)"
            ></button>
          </div>
        </div>
      </div>
      <div class="dialog-footer">
        <button class="btn" data-variant="outline" type="button" data-dialog-close="">Cancel</button>
        <button class="btn" type="submit">Comment</button>
      </div>
    </form>
  </dialog>

  <!-- File > Open: the menu items open these pickers (a hidden file input, clicked) -->
  <input
    type="file"
    id="de-file-md"
    accept=".md,.markdown,text/markdown,text/plain"
    hidden
    aria-label="Open a Markdown file"
  />
  <input type="file" id="de-file-json" accept=".json,application/json" hidden aria-label="Open comment annotations" />
</div>
```
