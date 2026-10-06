---
name: Docs Content
type: BLK
section: website
why: Long-form HTML - headings, paragraphs, <pre><code>, tables, notes - styled for reading in one class scope; no script.
when: A page of documentation. The surrounding nav is docs-navigation; a how-to answer is help-article; code with tabs and copy is code-block.
where: dist/components/docs-content/docs-content.css
supportedStates: default
---

# Pattern: Docs Content

## Native basis
An `<article>`: breadcrumbs, `<h1>`, a lead, meta (updated `<time>`, edit link), prose (`.mk-docs-content-prose`) with headings, lists, inline and block code, a table and callouts (`data-tone`), and previous / next links.

Built from: [Breadcrumb](../../navigation/breadcrumb/component-skill.md).

---

## Native Web APIs
- [`<article>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/article) - a self-contained item
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) - machine-readable dates
- [`<table>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table) - real tabular data
- [`text-wrap`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap) - balanced titles, pretty paragraphs

---

## Structure

```html
<article class="mk-docs-content" aria-labelledby="dc-title">
  <nav class="breadcrumb" aria-label="Breadcrumb"><ol class="breadcrumb-list"><li class="breadcrumb-item"><a class="breadcrumb-link" href="#">Docs</a></li><li class="breadcrumb-separator" aria-hidden="true">/</li><li class="breadcrumb-item"><a class="breadcrumb-link" href="#">Guides</a></li><li class="breadcrumb-separator" aria-hidden="true">/</li><li class="breadcrumb-item"><span class="breadcrumb-page" aria-current="page">Offline sync</span></li></ol></nav>
  <h1 class="mk-docs-content-title" id="dc-title">Offline sync</h1>
  <p class="mk-docs-content-lead">How Acme keeps working without a connection, and what happens when two people edit the same thing.</p>
  <div class="mk-docs-content-meta"><span>Updated <time datetime="2026-09-28">28 Sep 2026</time></span><span>6 min read</span><a href="#"><i data-lucide="pencil"></i> Edit this page</a></div>
  <div class="mk-docs-content-prose">
    <p>Every change you make is written to your device first. When you are back online, Acme sends the changes in the order you made them - nothing waits for the network.</p>
    <h2 id="dc-enable">Turn it on</h2>
    <p>Offline sync is on by default for new workspaces. For older ones, enable it in <code>Settings → Sync</code> or with the CLI:</p>
    <pre><code>acme workspace sync --offline on</code></pre>
    <aside class="mk-docs-content-callout" role="note"><i data-lucide="info"></i><p><strong>Note:</strong> the first sync downloads the whole workspace - on a slow connection this can take a few minutes.</p></aside>
    <h2 id="dc-conflicts">Conflicts</h2>
    <p>When two people change the same field offline, the later change wins and the earlier one is kept in the history:</p>
    <ul><li>Text merges character by character.</li><li>Fields like status keep the last value.</li><li>Deletions always win over edits.</li></ul>
    <table><thead><tr><th>Change</th><th>Resolution</th></tr></thead><tbody><tr><td>Both edit a paragraph</td><td>Merged</td></tr><tr><td>Both set a status</td><td>Latest wins</td></tr><tr><td>One deletes, one edits</td><td>Deleted</td></tr></tbody></table>
    <aside class="mk-docs-content-callout" data-tone="warning" role="note"><i data-lucide="triangle-alert"></i><p><strong>Warning:</strong> clearing your browser data before syncing deletes unsynced changes.</p></aside>
    <aside class="mk-docs-content-callout" data-tone="tip" role="note"><i data-lucide="lightbulb"></i><p><strong>Tip:</strong> the cloud icon in the header shows how many changes are waiting.</p></aside>
  </div>
  <nav class="mk-docs-content-pager" aria-label="Pagination"><a href="#" rel="prev"><small>Previous</small><strong>← Workspaces</strong></a><a href="#" rel="next"><small>Next</small><strong>Permissions →</strong></a></nav>
</article>
```

---

## Variants

| Attribute | Behavior |
|-----------|----------|
| Default | A readable column with prose, code, tables and callouts |
| `data-tone` | Callout colors: note (blue), warning (amber), tip (green) |

---

## ARIA

| Element | Attribute | Notes |
|---------|-----------|-------|
| callouts | `role="note"` + a label word | "Note", "Warning" in text - not only color |
| code | `<pre><code>` | Readable, selectable |
| pager | `<nav aria-label="Pagination">` + `rel` | Previous / next page |

---

## Notes
- Keep paragraphs short and examples runnable.
