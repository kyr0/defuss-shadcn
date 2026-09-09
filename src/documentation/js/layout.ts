// -- layout.js ------------------------------------------------
// Web Components for the shared site header and sidebar nav.
// SPA client-side router for flash-free navigation.
// Loaded synchronously in <head> so elements render without FOUC.

(function () {
  'use strict';

  // Single-namespace globals (AGENTS.md "No window globals"): this file's
  // globals live under globalThis._defussShadcn — never on window.
  globalThis._defussShadcn = globalThis._defussShadcn || {};
  const docs = (globalThis._defussShadcn.docs = globalThis._defussShadcn.docs || {});

  // Single source of truth for the version shown in the header pill AND the
  // footer. deploy.sh rewrites this one line per release; `verify`'s
  // "version consistency" gate fails if it (or any other version literal in
  // this file) drifts from package.json — the footer once froze an old number
  // forever because it was a second, un-synchronised literal.
  var SITE_VERSION = 'v0.8.3';

  /* -- Wide mode (must run before first paint, like dark mode) ---
     Strips the content max-width so wide layouts (the marketing blocks)
     render at full width. Persisted per-origin, same key discipline as
     the theme. The toggle button lives in <site-header> below. */
  if (localStorage.getItem('defuss-shadcn-wide') === '1') {
    document.documentElement.classList.add('wide');
  }

  /* -- Dark mode (must run before first paint) ----------------- */
  var saved = localStorage.getItem('defuss-shadcn-theme');
  var darkMQ = window.matchMedia('(prefers-color-scheme: dark)');
  var prefersDark = darkMQ.matches;
  if (saved === 'dark' || (!saved && prefersDark)) {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  }

  /* React to OS theme changes in real time (only if user hasn't set a manual preference) */
  darkMQ.addEventListener('change', function (e) {
    if (localStorage.getItem('defuss-shadcn-theme')) return;   // user chose manually — respect it
    document.documentElement.classList.toggle('dark', e.matches);
    document.documentElement.style.colorScheme = e.matches ? 'dark' : 'light';
    var sun = document.getElementById('icon-sun');
    var moon = document.getElementById('icon-moon');
    if (sun) sun.style.display = e.matches ? 'none' : 'block';
    if (moon) moon.style.display = e.matches ? 'block' : 'none';
    if (docs.applyTheme && docs.__activeColorTheme && docs.__activeColorTheme !== 'default') {
      docs.applyTheme(docs.__activeColorTheme);
    }
    if (docs.updateFavicon) docs.updateFavicon();
  });

  /* -- SPA page-ready helper ----------------------------------- */
  /* Doc-site scripts (site.js) call docs.onPageReady(fn)      */
  /* to register functions that run on initial load AND after     */
  /* each SPA navigation. Component modules auto-reinitialize    */
  /* via MutationObserver when the DOM changes.                  */
  var domReady = false;
  document.addEventListener('DOMContentLoaded', function () { domReady = true; });

  docs.onPageReady = function (fn) {
    if (domReady) {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
    (docs.__spaInits = docs.__spaInits || []).push(fn);
  };

  /* -- Navigation data ---------------------------------------- */
  var NAV = [
    { heading: 'Overview', items: [
      { label: 'Introduction', href: 'index.html' },
      { label: 'Installation', href: 'installation.html' },
      { label: 'Theming', href: 'theming.html' },
      { label: 'Dark Mode', href: 'dark-mode.html' },
      { label: 'Data Attribute API', href: 'data-attribute-api.html' },
      { label: 'Architecture', href: 'architecture.html' },
      { label: 'Cascade Layers', href: 'cascade-layers.html' },
      { label: 'ES Modules', href: 'es-modules.html' },
      { label: 'Native Web APIs', href: 'native-web-apis.html' },
      { label: 'Animations', href: 'animations.html' },
      { label: 'Accessibility', href: 'accessibility.html' },
      { label: 'Component Skills', href: 'component-skills.html' },
      { label: 'Changelog', href: 'changelog.html' },
    ]},
    { heading: 'Primitives', items: [
      { label: 'Typography', href: 'typography.html' },
      { label: 'Separator', href: 'separator.html' },
      { label: 'Icon', href: 'icon.html' },
      { label: 'Kbd', href: 'kbd.html' },
    ]},
    { heading: 'Actions', items: [
      { label: 'Button', href: 'button.html' },
      { label: 'Toggle', href: 'toggle.html' },
      { label: 'Toggle Group', href: 'toggle-group.html' },
      { label: 'Button Group', href: 'button-group.html' },
      { label: 'Toolbar', href: 'toolbar.html' },
    ]},
    { heading: 'Forms &amp; Inputs', items: [
      { label: 'Label', href: 'label.html' },
      { label: 'Input', href: 'input.html' },
      { label: 'Textarea', href: 'textarea.html' },
      { label: 'Checkbox', href: 'checkbox.html' },
      { label: 'Radio Group', href: 'radio.html' },
      { label: 'Switch', href: 'switch.html' },
      { label: 'Slider', href: 'slider.html' },
      { label: 'Select', href: 'select.html' },
      { label: 'Number Input', href: 'number-input.html' },
      { label: 'File Input', href: 'file-input.html' },
      { label: 'Color Picker', href: 'color-picker.html' },
      { label: 'Date Picker', href: 'date-picker.html' },
      { label: 'Combobox', href: 'combobox.html' },
      { label: 'Form', href: 'form.html' },
    ]},
    { heading: 'Data Display', items: [
      { label: 'Badge', href: 'badge.html' },
      { label: 'Avatar', href: 'avatar.html' },
      { label: 'Card', href: 'card.html' },
      { label: 'Image', href: 'image.html' },
      { label: 'Statistic', href: 'statistic.html' },
      { label: 'Table', href: 'table.html' },
      { label: 'Collapsible', href: 'collapsible.html' },
      { label: 'Timeline', href: 'timeline.html' },
      { label: 'Tree View', href: 'tree-view.html' },
      { label: 'Calendar', href: 'calendar.html' },
      { label: 'Carousel', href: 'carousel.html' },
      { label: 'Scroll Area', href: 'scroll-area.html' },
      { label: 'Sortable', href: 'sortable.html' },
    ]},
    { heading: 'Feedback &amp; Status', items: [
      { label: 'Spinner', href: 'spinner.html' },
      { label: 'Skeleton', href: 'skeleton.html' },
      { label: 'Progress', href: 'progress.html' },
      { label: 'Alert', href: 'alert.html' },
      { label: 'Alert Dialog', href: 'alert-dialog.html' },
      { label: 'Toast', href: 'toast.html' },
    ]},
    { heading: 'Overlays', items: [
      { label: 'Popover', href: 'popover.html' },
      { label: 'Tooltip', href: 'tooltip.html' },
      { label: 'Context Menu', href: 'context-menu.html' },
      { label: 'Dialog', href: 'dialog.html' },
      { label: 'Sheet', href: 'sheet.html' },
      { label: 'Accordion', href: 'accordion.html' },
      { label: 'Command', href: 'command.html' },
    ]},
    { heading: 'Navigation', items: [
      { label: 'Breadcrumb', href: 'breadcrumb.html' },
      { label: 'Pagination', href: 'pagination.html' },
      { label: 'Steps', href: 'steps.html' },
      { label: 'Tabs', href: 'tabs.html' },
      { label: 'Dropdown Menu', href: 'dropdown.html' },
      { label: 'Navigation Menu', href: 'navigation-menu.html' },
    ]},
    { heading: 'Application', items: [
      { label: 'Sidebar', href: 'sidebar.html' },
    ]},
    { heading: 'Marketing', items: [
      { label: 'Site Header', href: 'site-header.html' },
      { label: 'Hero', href: 'hero.html' },
      { label: 'Product Showcase', href: 'product-showcase.html' },
      { label: 'Brand Logos', href: 'brand-logos.html' },
      { label: 'Feature Details', href: 'feature-details.html' },
      { label: 'Testimonials', href: 'testimonials.html' },
      { label: 'Stats', href: 'stats.html' },
      { label: 'Pricing', href: 'pricing.html' },
      { label: 'Blog', href: 'blog.html' },
      { label: 'FAQ', href: 'faq.html' },
      { label: 'Get In Touch', href: 'get-in-touch.html' },
      { label: 'Newsletter', href: 'newsletter.html' },
      { label: 'Site Footer', href: 'site-footer.html' },
    ]},
  ];

  /* Pages that have been built (have a real doc page) */
  var BUILT = new Set([
    'index.html', 'installation.html', 'theming.html', 'dark-mode.html', 'data-attribute-api.html', 'architecture.html', 'cascade-layers.html', 'es-modules.html', 'native-web-apis.html', 'animations.html', 'accessibility.html', 'component-skills.html', 'changelog.html',
    'typography.html', 'separator.html', 'icon.html', 'kbd.html', 'label.html',
    'button.html', 'toggle.html', 'toggle-group.html', 'button-group.html', 'toolbar.html',
    'input.html', 'textarea.html', 'checkbox.html', 'radio.html', 'switch.html',
    'slider.html', 'select.html', 'number-input.html', 'file-input.html',
    'color-picker.html', 'date-picker.html', 'combobox.html', 'form.html',
    'badge.html', 'avatar.html', 'card.html', 'image.html',
    'statistic.html', 'table.html',
    'collapsible.html', 'timeline.html', 'tree-view.html', 'calendar.html',
    'spinner.html', 'skeleton.html', 'progress.html', 'alert.html', 'alert-dialog.html',
    'toast.html',
    'popover.html', 'tooltip.html', 'context-menu.html',
    'dialog.html', 'sheet.html', 'accordion.html', 'command.html',
    'breadcrumb.html', 'pagination.html', 'steps.html',
    'tabs.html', 'dropdown.html', 'navigation-menu.html',
    'scroll-area.html',
    'site-header.html', 'hero.html', 'product-showcase.html', 'brand-logos.html',
    'feature-details.html', 'testimonials.html', 'stats.html', 'pricing.html',
    'blog.html', 'faq.html', 'get-in-touch.html', 'newsletter.html', 'site-footer.html',
    'carousel.html', 'sidebar.html', 'sortable.html',
  ]);

  /* Detect current filename */
  var currentPage = location.pathname.split('/').pop() || 'index.html';

  /* -- <site-header> ------------------------------------------ */
  class SiteHeader extends HTMLElement {
    connectedCallback() {
      this.style.display = 'contents';
      this.innerHTML =
        '<header class="site-header">' +
          '<button class="sidebar-toggle" id="sidebar-toggle" aria-label="Toggle navigation menu">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>' +
          '</button>' +
          '<a href="index.html" class="header-brand">' +
            '<img src="images/favicon.webp" alt="defuss-shadcn logo" class="header-brand-logo">' +
            '<span class="header-brand-name">defuss<em>-shadcn</em></span>' +
            '<span class="badge header-brand-version" data-variant="outline" style="font-family:var(--font-mono);">' + SITE_VERSION + '</span>' +
          '</a>' +
          /* Search trigger next to the version badge: focusing (or clicking)
             it opens the site's own <dialog class="command"> palette below,
             which IS the search. The input never receives keystrokes — it
             blurs the moment the modal takes focus. */
          '<div class="header-search" role="search">' +
            '<input type="text" class="header-search-input" placeholder="Search docs… (⌘K)" ' +
              'aria-label="Search documentation" autocomplete="off" readonly>' +
          '</div>' +
          '<div style="flex:1;"></div>' +
          '<nav style="display:flex;align-items:center;gap:0.25rem;">' +
            '<a href="https://github.com/kyr0/defuss-shadcn" target="_blank" rel="noopener" class="header-action">' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>' +
              '<span class="github-label">GitHub</span>' +
              '<span class="github-stars"></span>' +
            '</a>' +
            '<button id="wide-toggle" class="header-action theme-toggle-btn" aria-label="Toggle wide layout" aria-pressed="false">' +
              '<svg id="icon-wide-expand" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>' +
              '<svg id="icon-wide-collapse" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>' +
            '</button>' +
            '<button id="theme-toggle" class="header-action theme-toggle-btn" aria-label="Toggle dark mode">' +
              '<svg id="icon-sun" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>' +
              '<svg id="icon-moon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>' +
            '</button>' +
            '<button id="theme-selector-btn" class="header-action theme-toggle-btn" aria-label="Change color theme" popovertarget="theme-popover">' +
              '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"/><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"/><circle cx="6.5" cy="12" r="0.5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>' +
            '</button>' +
          '</nav>' +
        '</header>' +
        '<div id="theme-popover" popover class="theme-popover">' +
          '<div class="theme-popover-header">' +
            '<span class="theme-popover-title">Theme</span>' +
            '<button class="theme-reset-btn" id="theme-reset-btn">Reset</button>' +
          '</div>' +
          '<div class="theme-grid" id="theme-grid"></div>' +
        '</div>' +
        /* Docs-wide search palette — the shipped command component, fed by
           the generated search index (scripts/lib/search-index.ts →
           js/search-index.js). First dialog.command in document order, so
           command.js's Cmd/Ctrl+K targets it, not any in-page demo. */
        '<dialog id="docs-palette" class="command" aria-label="Search documentation">' +
          '<div class="command-content">' +
            '<div class="command-input-wrapper">' +
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>' +
              '<input class="command-input" type="text" placeholder="Search documentation…" autocomplete="off" autocorrect="off" spellcheck="false">' +
            '</div>' +
            '<div class="command-list" id="docs-palette-list"></div>' +
            '<div class="command-empty" hidden>No results found.</div>' +
          '</div>' +
        '</dialog>';

      /* Build theme swatches */
      var grid = this.querySelector('#theme-grid');
      if (grid && docs.THEMES) {
        var activeId = docs.__activeColorTheme || 'default';
        docs.THEMES.forEach(function (t) {
          var btn = document.createElement('button');
          btn.className = 'theme-swatch' + (t.id === activeId ? ' active' : '');
          btn.setAttribute('data-theme-id', t.id);

          var label = document.createElement('span');
          label.className = 'theme-swatch-label';
          label.textContent = t.label;
          btn.appendChild(label);

          var colors = document.createElement('div');
          colors.className = 'theme-swatch-colors';

          // Show 5 color dots: primary, secondary, accent, destructive, muted
          var dotKeys = ['primary', 'secondary', 'accent', 'destructive', 'muted'];
          var isDark = document.documentElement.classList.contains('dark');
          var mode = isDark ? 'dark' : 'light';
          dotKeys.forEach(function (key) {
            var dot = document.createElement('span');
            dot.className = 'theme-swatch-dot';
            var color = null;
            if (t.styles && t.styles[mode]) {
              color = t.styles[mode][key];
            }
            if (!color && t.id === 'default') {
              // Default theme colors from default-semantic-tokens.css
              var defaults = {
                light: { primary: 'oklch(0.205 0.005 285)', secondary: 'oklch(0.94 0.003 247)', accent: 'oklch(0.94 0.003 247)', destructive: 'oklch(0.577 0.245 27.325)', muted: 'oklch(0.94 0.003 247)' },
                dark: { primary: 'oklch(0.985 0.002 247)', secondary: 'oklch(0.22 0.006 285)', accent: 'oklch(0.22 0.006 285)', destructive: 'oklch(0.396 0.141 25.723)', muted: 'oklch(0.22 0.006 285)' }
              };
              color = defaults[mode][key];
            }
            if (color) dot.style.background = color;
            colors.appendChild(dot);
          });
          btn.appendChild(colors);

          btn.addEventListener('click', function () {
            if (docs.applyTheme) docs.applyTheme(t.id);
            var popover = document.getElementById('theme-popover');
            if (popover) popover.hidePopover();
          });

          grid.appendChild(btn);
        });
      }

      /* Reset button */
      var resetBtn = this.querySelector('#theme-reset-btn');
      if (resetBtn) {
        resetBtn.addEventListener('click', function () {
          if (docs.applyTheme) docs.applyTheme('default');
        });
      }

      /* -- Wide mode toggle ------------------------------------- */
      var wideBtn = this.querySelector('#wide-toggle');
      var syncWideBtn = function () {
        if (!wideBtn) return;
        var on = document.documentElement.classList.contains('wide');
        wideBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        var expand = wideBtn.querySelector('#icon-wide-expand');
        var collapse = wideBtn.querySelector('#icon-wide-collapse');
        if (expand) expand.style.display = on ? 'none' : 'block';
        if (collapse) collapse.style.display = on ? 'block' : 'none';
      };
      syncWideBtn(); // the class was applied pre-paint above — reflect it
      if (wideBtn) {
        wideBtn.addEventListener('click', function () {
          var on = document.documentElement.classList.toggle('wide');
          localStorage.setItem('defuss-shadcn-wide', on ? '1' : '0');
          syncWideBtn();
        });
      }

      /* -- Search palette --------------------------------------- */
      /* The header input is a trigger, not a field: clicking it (or Enter/
         Space while focused) opens the <dialog class="command"> palette
         above, whose own input receives the query (the command component
         filters/highlights/keys natively). Deliberately NOT a focus trigger:
         dialog.close() restores focus to the opener synchronously, so a
         focus handler would bounce the palette open on every close.
         Items come from the build-time search index
         (scripts/lib/search-index.ts). */
      var list = this.querySelector('#docs-palette-list');
      var dialog = this.querySelector('#docs-palette');
      var trigger = this.querySelector('.header-search-input');
      var searchWrap = this.querySelector('.header-search');
      if (list && dialog && trigger && searchWrap) {
        var index = (globalThis._defussShadcn.docs && globalThis._defussShadcn.docs.searchIndex) || [];
        var esc = function (s) { return s.replace(/&/g, '&').replace(/</g, '<').replace(/"/g, '"'); };
        var html = '';
        var group = null;
        index.forEach(function (e) {
          if (e.s !== group) {
            if (group !== null) html += '</div>';
            group = e.s;
            html += '<div class="command-group"><p class="command-group-heading">' + esc(group) + '</p>';
          }
          // e.d = the component's taxonomy type (page entries only) — render the
          // same badge the sidebar and doc pages show, so all three agree.
          html += '<button class="command-item" type="button" data-href="' + esc(e.h) + '">' + esc(e.t) +
            (e.d ? typeBadge(e.d) : '') + '</button>';
        });
        if (group !== null) html += '</div>';
        list.innerHTML = html;

        var openPalette = function () {
          if (dialog.open) return;
          dialog.showModal();
          var cmdInput = dialog.querySelector('.command-input');
          if (cmdInput) cmdInput.focus();
        };
        searchWrap.addEventListener('click', openPalette);
        trigger.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault(); // Space would otherwise do nothing on a readonly input
            openPalette();
          }
        });

        /* Navigate after the command component closes the dialog on item
           click (its own Enter handler synthesizes this same click). */
        dialog.addEventListener('click', function (e) {
          var item = e.target.closest('.command-item');
          if (!item) return;
          var href = item.getAttribute('data-href') || '';
          var hashAt = href.indexOf('#');
          var page = hashAt === -1 ? href : href.slice(0, hashAt);
          var id = hashAt === -1 ? '' : href.slice(hashAt + 1);
          if (page === currentPage) {
            if (id) { var el = document.getElementById(id); if (el) { el.scrollIntoView({ block: 'start' }); if (docs.realignWhenSettled) docs.realignWhenSettled(id); } }
            else window.scrollTo(0, 0);
          } else {
            navigateTo(page, true);
            if (id) scrollToWhenReady(id, 0);
          }
        });
      }
    }
  }

  /* The SPA swap is async; poll briefly for the target heading.
     ponytail: 100ms × 20 — swap normally lands <200ms; upgrade path is a
     hook on navigateTo's completion, not needed while the docs stay static. */
  function scrollToWhenReady(id, attempt) {
    var el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ block: 'start' });
      // SPA swap + shiki re-highlight reflow async → the landed offset goes
      // stale (issue #2); re-align once the scroll settles.
      if (docs.realignWhenSettled) docs.realignWhenSettled(id);
      return;
    }
    if (attempt > 20) return;
    setTimeout(function () { scrollToWhenReady(id, attempt + 1); }, 100);
  }

  /* -- Component type badges -----------------------------------
     Every component carries exactly one atomic-design type (ATM | MOL | ORG |
     BLK | TPL — see AGENTS.md "Component taxonomy"). The source of truth is
     each skill's `type:` frontmatter, carried at runtime by the generated
     search index (search-index.ts page entries `d`). Built lazily in
     <site-nav>: search-index.js loads after this file, so module scope would
     still be empty here. Markup is byte-identical to the doc-page badge;
     verify's parity gate compares both against the frontmatter. */
  function typeBadge(type) {
    return ' <span class="type-badge" data-type="' + type + '" title="' + type + '">' + type + '</span>';
  }

  /* -- <site-nav> --------------------------------------------- */
  /* Sections are collapsible groups: the docs dogfood the sidebar
     component's `<details>` pattern (.sidebar-group) — summary heading +
     chevron, open by default, collapse state persisted per section. */
  var NAV_COLLAPSE_KEY = 'defuss-shadcn-nav-collapsed';

  function navCollapsed() {
    try { return JSON.parse(localStorage.getItem(NAV_COLLAPSE_KEY) || '[]'); }
    catch { return []; }
  }

  /* Remembered collapses are a courtesy, not a trap: the section holding the
     current page always renders open (and SPA navigation opens the target). */
  function sectionOpen(heading) {
    return heading === 'Overview' || navCollapsed().indexOf(heading) === -1;
  }

  class SiteNav extends HTMLElement {
    connectedCallback() {
      this.style.display = 'contents';
      var TYPE_BY_PAGE = {};
      ((globalThis._defussShadcn.docs && globalThis._defussShadcn.docs.searchIndex) || []).forEach(function (e) {
        if (e.d && e.h.indexOf('#') === -1) TYPE_BY_PAGE[e.h] = e.d;
      });
      var html = '<aside class="site-sidebar">';
      html += '<div class="sidebar-scroll">';
      NAV.forEach(function (section, i) {
        var isComponentSection = (i > 0);
        var open = sectionOpen(section.heading);
        html += '<details class="nav-section sidebar-group"' + (open ? ' open' : '') + ' data-nav-section="' + section.heading + '" style="margin-bottom:0.75rem;">';
        html += '<summary class="nav-heading">' + section.heading +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></summary>';
        html += '<nav class="sidebar-nav">';
        section.items.forEach(function (item) {
          var cls = 'nav-link';
          if (item.href === currentPage) cls += ' active';
          else if (!BUILT.has(item.href)) cls += ' disabled';
          var badge = isComponentSection && TYPE_BY_PAGE[item.href] ? typeBadge(TYPE_BY_PAGE[item.href]) : '';
          html += '<a class="' + cls + '" href="' + item.href + '" style="display:flex;align-items:center;gap:0.375rem;">' + item.label + badge + '</a>';
        });
        html += '</nav></details>';
      });
      html += '</div>';
      html += '</aside>';
      this.innerHTML = html;

      /* Persist collapses (except Overview — the entry point stays visible) */
      this.querySelectorAll('details[data-nav-section]').forEach(function (d) {
        d.addEventListener('toggle', function () {
          if (d.dataset.navSection === 'Overview') { d.open = true; return; }
          var set = navCollapsed();
          if (d.open) set = set.filter(function (h) { return h !== d.dataset.navSection; });
          else if (set.indexOf(d.dataset.navSection) === -1) set.push(d.dataset.navSection);
          try { localStorage.setItem(NAV_COLLAPSE_KEY, JSON.stringify(set)); } catch { /* private mode */ }
        });
      });
    }
  }

  customElements.define('site-header', SiteHeader);
  customElements.define('site-nav', SiteNav);

  /* -- Mobile sidebar toggle ---------------------------------- */
  function initMobileSidebar() {
    var toggle = document.getElementById('sidebar-toggle');
    var sidebar = document.querySelector('.site-sidebar');
    if (!toggle || !sidebar) return;

    /* Create backdrop element if not already present */
    var backdrop = document.querySelector('.sidebar-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      sidebar.parentElement.appendChild(backdrop);
    }

    function closeSidebar() {
      sidebar.classList.remove('open');
      backdrop.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    function openSidebar() {
      sidebar.classList.add('open');
      backdrop.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
    }

    toggle.addEventListener('click', function () {
      if (sidebar.classList.contains('open')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });

    backdrop.addEventListener('click', closeSidebar);

    /* Close sidebar when a nav link is clicked (mobile) */
    sidebar.addEventListener('click', function (e) {
      if (e.target.closest('a.nav-link')) {
        closeSidebar();
      }
    });

    /* Close sidebar on Escape key */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) {
        closeSidebar();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initMobileSidebar);

  /* -- Sidebar scroll persistence ----------------------------- */
  /* Save scroll position before navigating, restore on load.   */
  /* (With SPA router, sidebar persists — this handles fallback */
  /* cases: first load, hard refresh, external navigation.)     */
  var SCROLL_KEY = 'shadcn-nav-scroll';

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a.nav-link, .site-header a[href="index.html"]');
    if (!link) return;
    var sidebar = document.querySelector('.sidebar-scroll');
    if (sidebar) sessionStorage.setItem(SCROLL_KEY, sidebar.scrollTop);
  });

  /* Restore sidebar scroll & scroll active link into view */
  document.addEventListener('DOMContentLoaded', function () {
    var sidebar = document.querySelector('.sidebar-scroll');
    if (!sidebar) return;
    var saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved) {
      sidebar.scrollTop = parseInt(saved, 10);
      sessionStorage.removeItem(SCROLL_KEY);
    } else {
      /* First visit — scroll active link into view */
      var active = sidebar.querySelector('.nav-link.active');
      if (active) active.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  });

  /* -- Hover prefetch ----------------------------------------- */
  var prefetched = {};
  document.addEventListener('mouseover', function (e) {
    var link = e.target.closest('a.nav-link:not(.disabled)');
    if (!link) return;
    var href = link.getAttribute('href');
    if (href && !prefetched[href] && href !== currentPage && !href.startsWith('http')) {
      prefetched[href] = true;
      var l = document.createElement('link');
      l.rel = 'prefetch';
      l.href = href;
      document.head.appendChild(l);
    }
  });

  /* -- SPA Client-Side Router --------------------------------- */
  /* Intercepts nav link clicks and swaps <main> content         */
  /* without full-page reloads. Sidebar & header persist.        */

  var navigating = false;

  function navigateTo(href, pushState) {
    if (navigating) return;
    if (href === currentPage && pushState !== false) return;
    navigating = true;

    fetch(href)
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      })
      .then(function (html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var newMain = doc.querySelector('main');
        var oldMain = document.querySelector('main');

        if (!newMain || !oldMain) {
          location.href = href;
          return;
        }

        var swap = function () {
          /* Swap main content */
          oldMain.innerHTML = newMain.innerHTML;

          /* Migrate body-level overlays: dialogs/popovers live OUTSIDE
             <main> (the documented "direct child of body" pattern —
             dialog.html, sheet.html), so a main.innerHTML swap alone
             leaves their triggers dead. Remove the previous page's and
             adopt the new page's; component modules re-init them via
             their MutationObserver. */
          document.querySelectorAll('body > dialog, body > [popover]').forEach(function (el) {
            if (!el.closest('site-header')) el.remove();
          });
          doc.querySelectorAll('body > dialog, body > [popover]').forEach(function (el) {
            document.body.appendChild(document.importNode(el, true));
          });

          /* Update document title */
          document.title = doc.title;

          /* Update current page tracker */
          currentPage = href;

          /* Update active nav link */
          document.querySelectorAll('.nav-link').forEach(function (link) {
            link.classList.toggle('active', link.getAttribute('href') === currentPage);
          });

          /* Reveal the section the navigation landed in — a collapsed group
             must not hide the page you just opened (toggle listener then
             persists the un-collapse). */
          var active = document.querySelector('.nav-link.active');
          var grp = active && active.closest('details[data-nav-section]');
          if (grp && !grp.open) grp.open = true;

          /* Push browser history */
          if (pushState !== false) {
            history.pushState({ page: href }, '', href);
          }

          /* Scroll main to top */
          window.scrollTo(0, 0);

          /* Re-initialize all page-ready handlers */
          /* (doc tabs, hljs, copy buttons, lucide, etc.) */
          (docs.__spaInits || []).forEach(function (fn) { fn(); });

          /* Component ES modules auto-reinitialize via MutationObserver */
          /* when the DOM changes — no script re-import needed.         */

          navigating = false;
        };

        /* Use View Transitions API if available. Chromium throws a
           "Transition was skipped. New ViewTransition started" error when two
           transitions overlap — the `navigating` flag only guards the fetch,
           not the async VT, so rapid navs (Enter key + section click) can
           stack them. Track the active transition and swap immediately
           (exactly what a skipped VT does anyway) while one is in flight. */
        if (document.startViewTransition && !docs.__vtActive) {
          var vt = document.startViewTransition(swap);
          docs.__vtActive = true;
          vt.finished.finally(function () { docs.__vtActive = false; });
        } else {
          swap();
        }
      })
      .catch(function () {
        location.href = href;
        navigating = false;
      });
  }

  /* Intercept nav clicks (sidebar links, header logo, prev/next) */
  document.addEventListener('click', function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (e.defaultPrevented) return;
    var link = e.target.closest('a.nav-link:not(.disabled), .site-header a[href="index.html"], a.page-nav-link');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) return;
    e.preventDefault();
    navigateTo(href, true);
  });

  /* Handle browser back/forward */
  window.addEventListener('popstate', function () {
    var page = location.pathname.split('/').pop() || 'index.html';
    navigateTo(page, false);
  });

  /* -- Page extras: footer, TOC, prev/next, edit link, stars -- */

  /* Flat ordered list of all navigable pages */
  var allPages = [];
  NAV.forEach(function (section) {
    section.items.forEach(function (item) {
      if (BUILT.has(item.href)) allPages.push(item);
    });
  });

  var tocObserver = null;

  /* -- Anchor clearance (--anchor-pad) ----------------------
     .page-header is `position: sticky` pinned right under the fixed site
     header, so anything scrolled to the plain 4rem scroll-padding-top lands
     under the page-header bar (issue #2 follow-up). The true clearance is
     site-header + page-header height + a little breathing room — both
     content-dependent, so the browser measures it and publishes the value
     as --anchor-pad, which layout.css wires into scroll-padding-top
     (native fragment jumps, scrollIntoView, and realignWhenSettled all
     read scroll-padding-top, so every scroll path gets the same offset). */
  function updateAnchorPad() {
    var hdr = document.querySelector('.site-header');
    var ph = document.querySelector('.page-header');
    var h = (hdr ? hdr.getBoundingClientRect().height : 0) +
      (ph ? ph.getBoundingClientRect().height : 0) + 8;
    document.documentElement.style.setProperty('--anchor-pad', Math.round(h) + 'px');
  }
  addEventListener('resize', updateAnchorPad);
  /* Component-skill <details> in .page-header change its height when toggled;
     `toggle` bubbles, so one capture listener covers present and future ones. */
  addEventListener('toggle', updateAnchorPad, true);

  function getHeadingText(el) {
    var clone = el.cloneNode(true);
    clone.querySelectorAll('a, span.badge, svg').forEach(function (c) { c.remove(); });
    return clone.textContent.trim();
  }

  function buildToc() {
    var tocContent = document.querySelector('.site-toc-content');
    if (!tocContent) return;
    var main = document.querySelector('main');
    if (!main) return;
    if (tocObserver) { tocObserver.disconnect(); tocObserver = null; }

    /* Collect heading-like elements in document order */
    var candidates = main.querySelectorAll('h2, p.text-sm.font-medium');
    var headings = [];
    candidates.forEach(function (el) {
      /* Skip headings inside collapsed details/page-header */
      if (el.closest('.page-header details')) return;
      var text = getHeadingText(el);
      if (text) headings.push({ el: el, text: text });
    });

    if (headings.length < 2) {
      tocContent.innerHTML = '';
      tocContent.parentElement.style.display = 'none';
      return;
    }

    tocContent.parentElement.style.display = '';
    var html = '<p class="toc-title">On This Page</p>';
    headings.forEach(function (item) {
      var id = item.el.id || 'toc-' + item.text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (!item.el.id) item.el.id = id;
      /* § permalink before every TOC heading — a visible, copyable deep link
         (getHeadingText strips <a> clones, so it never leaks into TOC labels;
         the search index is built statically, so it never leaks there either).
         .preview subtrees are excluded: their h2s are demo/sample markup
         (dialog titles etc.), not doc sections — a § there pollutes the demo. */
      if (!item.el.querySelector('.heading-anchor') && !item.el.closest('.preview')) {
        item.el.insertAdjacentHTML('afterbegin',
          '<a class="heading-anchor" href="#' + id + '" aria-label="Link to section: ' + item.text.replace(/"/g, '"') + '">§</a>');
      }
      html += '<a class="toc-link" href="#' + id + '">' + item.text + '</a>';
    });
    tocContent.innerHTML = html;

    /* Active tracking via IntersectionObserver */
    var tocLinks = tocContent.querySelectorAll('.toc-link');
    tocObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          tocLinks.forEach(function (l) { l.classList.remove('active'); });
          var active = tocContent.querySelector('.toc-link[href="#' + entry.target.id + '"]');
          if (active) active.classList.add('active');
        }
      });
    }, {
      /* Active heading = first one crossing the bottom edge of the header
         stack; reuse the measured --anchor-pad so the band starts below it. */
      rootMargin: '-' + (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 80) + 'px 0px -60% 0px',
    });
    headings.forEach(function (item) { tocObserver.observe(item.el); });
  }

  function buildPrevNext() {
    var existing = document.querySelector('.page-nav');
    if (existing) existing.remove();
    var idx = -1;
    for (var i = 0; i < allPages.length; i++) {
      if (allPages[i].href === currentPage) { idx = i; break; }
    }
    if (idx === -1) return;
    var prev = idx > 0 ? allPages[idx - 1] : null;
    var next = idx < allPages.length - 1 ? allPages[idx + 1] : null;
    if (!prev && !next) return;
    var html = '<nav class="page-nav">';
    if (prev) {
      html += '<a class="page-nav-link page-nav-prev" href="' + prev.href + '">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>' +
        '<div><span class="page-nav-label">Previous</span>' +
        '<span class="page-nav-title">' + prev.label + '</span></div></a>';
    } else {
      html += '<div></div>';
    }
    if (next) {
      html += '<a class="page-nav-link page-nav-next" href="' + next.href + '">' +
        '<div><span class="page-nav-label">Next</span>' +
        '<span class="page-nav-title">' + next.label + '</span></div>' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></a>';
    }
    html += '</nav>';
    var main = document.querySelector('main');
    if (main) main.insertAdjacentHTML('beforeend', html);
  }



  function updateStarCount(count) {
    var el = document.querySelector('.github-stars');
    if (el) el.textContent = count;
  }

  /* One-time setup on DOMContentLoaded */
  document.addEventListener('DOMContentLoaded', function () {
    /* Inject TOC sidebar */
    var layoutWrap = document.querySelector('main') && document.querySelector('main').parentElement;
    if (layoutWrap) {
      layoutWrap.insertAdjacentHTML('beforeend',
        '<aside class="site-toc"><div class="site-toc-content"></div></aside>'
      );
    }

    /* Inject footer */
    if (layoutWrap) {
      layoutWrap.insertAdjacentHTML('afterend',
        '<footer class="site-footer">' +
          '<p class="site-footer-tagline">Agentically engineered with local Qwen3.8-Flash-Next/vLLM, quality-gated automatically, and human-reviewed before release.</p>' +
          '<p class="site-footer-tagline" style="margin-top:0;">Reworked, enhanced and maintained by <a href="https://aron-homberg.de" target="_blank" rel="noopener">Aron Homberg</a></p>' +
          '<span class="site-footer-dot"> · </span>' +
            'MIT Licensed' +
            '<span class="site-footer-dot"> · </span>' +
            '<a href="https://github.com/kyr0/defuss-shadcn" target="_blank" rel="noopener">Source on GitHub</a>' +
        '</footer>'
      );
    }

    /* Fetch GitHub star count (cached in sessionStorage) */
    var cached = sessionStorage.getItem('gh-stars');
    if (cached) {
      updateStarCount(cached);
    } else {
      fetch('https://api.github.com/repos/kyr0/defuss-shadcn')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.stargazers_count != null) {
            var count = String(data.stargazers_count);
            sessionStorage.setItem('gh-stars', count);
            updateStarCount(count);
          }
        })
        .catch(function () { /* silent fail — star count is non-essential */ });
    }
  });

  /* Per-page init (runs on DOMContentLoaded + after each SPA navigation) */
  docs.onPageReady(function () {
    buildToc();
    buildPrevNext();
    updateAnchorPad(); // page header height differs per page — remeasure
    /* A fresh load landed with the 4rem fallback padding (this script measured
       the real clearance only now) — re-align the initial fragment once. */
    if (location.hash.length > 1 && docs.realignWhenSettled) {
      docs.realignWhenSettled(decodeURIComponent(location.hash.slice(1)));
    }
  });
})();
