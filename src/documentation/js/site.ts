// -- site.js -------------------------------------------------
// Doc-site-only script for the defuss-shadcn documentation site.
// Component behavior lives in dist/components/*.js.
// No ES modules — works with file:// protocol.
// Include via <script src="js/site.js" defer></script>

(function () {
  'use strict';

  // Single-namespace globals (AGENTS.md "No window globals"): this file's
  // globals live under globalThis._defussShadcn — never on window.
  globalThis._defussShadcn = globalThis._defussShadcn || {};
  const docs = (globalThis._defussShadcn.docs = globalThis._defussShadcn.docs || {});

  // -- Hash-link scroll correction (issue #2) ----------------
  // Why: scrollIntoView freezes its target offset at call time. When the
  // layout reflows DURING the smooth scroll (shiki swapping every code block
  // in, web-font swaps, late-loading CDN CSS on the published site), the
  // browser stops at the stale offset and the clicked heading ends up hidden
  // under the fixed header — or with a gap above it. Once scrolling settles,
  // re-align once if the heading missed its resting spot (scroll-padding-top).
  // Reader input (wheel/touch/key) aborts the correction — we never fight
  // someone who started scrolling themselves.
  var realignCancel = null;
  function realignWhenSettled(id) {
    // A newer jump supersedes any pending correction — an uncancelled one
    // would yank the page back to the previous heading mid-next-scroll.
    if (realignCancel) realignCancel();
    var timer = null;
    var done = false;
    function cleanup() {
      done = true;
      if (realignCancel === cleanup) realignCancel = null;
      clearTimeout(timer);
      removeEventListener('scroll', arm, true);
      removeEventListener('wheel', abort, true);
      removeEventListener('touchstart', abort, true);
      removeEventListener('keydown', abort, true);
    }
    function abort() { cleanup(); }
    function check() {
      cleanup();
      var t = document.getElementById(id);
      if (!t) return;
      // scrollIntoView's resting offset is the scroller's scroll-padding-top
      var pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      var delta = t.getBoundingClientRect().top - pad;
      // >1px: the page settled at a stale offset — correct it instantly.
      // A target below `pad` that can't scroll further clamps harmlessly.
      if (Math.abs(delta) > 1) window.scrollTo({ top: window.scrollY + delta });
    }
    // any scroll event re-arms the settle timer; check runs 150ms after the last.
    // ponytail: one correction after scrolling goes quiet — a reflow landing
    // AFTER that window (very slow CDN) could still drift; upgrade path is a
    // ResizeObserver on <main> that re-arms arm() while the page is unstable.
    function arm() {
      if (done) return;
      clearTimeout(timer);
      timer = setTimeout(check, 150);
    }
    addEventListener('scroll', arm, { passive: true, capture: true });
    addEventListener('wheel', abort, { once: true, passive: true, capture: true });
    addEventListener('touchstart', abort, { once: true, passive: true, capture: true });
    addEventListener('keydown', abort, { once: true, capture: true });
    realignCancel = cleanup;
    arm(); // an instant jump fires no scroll event — the initial arm covers it
  }
  // Cross-file contract (same discipline as THEMES/onPageReady): layout.ts's
  // palette jumps scroll to headings the same way and need the same correction.
  docs.realignWhenSettled = realignWhenSettled;

  function toggleDark() {
    var isDark = document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', !isDark);
    document.documentElement.style.colorScheme = isDark ? 'light' : 'dark';
    document.getElementById('icon-sun').style.display  = isDark ? 'block' : 'none';
    document.getElementById('icon-moon').style.display = isDark ? 'none'  : 'block';
    localStorage.setItem('defuss-shadcn-theme', isDark ? 'light' : 'dark');
    // Re-apply color theme for the new mode
    if (docs.__activeColorTheme && docs.__activeColorTheme !== 'default' && docs.applyTheme) {
      docs.applyTheme(docs.__activeColorTheme);
    }
    // Update favicon for new mode
    if (docs.updateFavicon) docs.updateFavicon();
  }

  // -- Token swatches (theming page only) ------------------
  function initTokenSwatches() {
    var swatchContainer = document.getElementById('swatch-container');
    if (swatchContainer && !swatchContainer.hasChildNodes()) {
      var pairs = [['background','foreground'],['primary','primary-foreground'],['secondary','secondary-foreground'],['muted','muted-foreground'],['accent','accent-foreground'],['card','card-foreground'],['popover','popover-foreground'],['destructive','destructive-foreground']];
      pairs.forEach(function (p) {
        var surface = p[0], fg = p[1];
        var row = document.createElement('div'); row.className = 'swatch-row';
        row.innerHTML = '<div style="display:flex;gap:0.375rem;flex-shrink:0;"><div style="width:1.875rem;height:1.875rem;border-radius:var(--radius-sm);background:var(--' + surface + ');border:1px solid var(--border);"></div><div style="width:1.875rem;height:1.875rem;border-radius:var(--radius-sm);background:var(--' + fg + ');border:1px solid var(--border);"></div></div><div><p style="margin:0;font-size:0.8125rem;font-family:var(--font-mono);">--' + surface + '</p><p style="margin:0;font-size:0.75rem;color:var(--muted-foreground);font-family:var(--font-mono);">--' + fg + '</p></div><span style="margin-left:auto;font-size:0.75rem;color:var(--muted-foreground);font-family:var(--font-mono);">var(--' + surface + ') var(--' + fg + ')</span>';
        swatchContainer.appendChild(row);
      });
    }
    var sidebarSwatchContainer = document.getElementById('sidebar-swatch-container');
    if (sidebarSwatchContainer && !sidebarSwatchContainer.hasChildNodes()) {
      [['sidebar','sidebar-foreground'],['sidebar-primary','sidebar-primary-foreground'],['sidebar-accent','sidebar-accent-foreground']].forEach(function (p) {
        var surface = p[0], fg = p[1];
        var row = document.createElement('div'); row.className = 'swatch-row';
        row.innerHTML = '<div style="display:flex;gap:0.375rem;flex-shrink:0;"><div style="width:1.875rem;height:1.875rem;border-radius:var(--radius-sm);background:var(--' + surface + ');border:1px solid var(--border);"></div><div style="width:1.875rem;height:1.875rem;border-radius:var(--radius-sm);background:var(--' + fg + ');border:1px solid var(--border);"></div></div><div><p style="margin:0;font-size:0.8125rem;font-family:var(--font-mono);">--' + surface + '</p><p style="margin:0;font-size:0.75rem;color:var(--muted-foreground);font-family:var(--font-mono);">--' + fg + '</p></div><span style="margin-left:auto;font-size:0.75rem;color:var(--muted-foreground);font-family:var(--font-mono);">var(--' + surface + ') var(--' + fg + ')</span>';
        sidebarSwatchContainer.appendChild(row);
      });
      [['sidebar-border','border-sidebar-border'],['sidebar-ring','ring-sidebar-ring']].forEach(function (p) {
        var token = p[0], _utility = p[1];
        var row = document.createElement('div'); row.className = 'swatch-row';
        row.innerHTML = '<div style="width:1.875rem;height:1.875rem;border-radius:var(--radius-sm);background:var(--' + token + ');border:1px solid var(--border);flex-shrink:0;"></div><code>--' + token + '</code><span class="text-sm text-muted-foreground ml-auto">var(--' + token + ')</span>';
        sidebarSwatchContainer.appendChild(row);
      });
    }
  }

  // -- Code collapse/expand ---------------------------------
  var CODE_ICON = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>';

  // Why: a code block is collapsible when it uses the shared snippet markup —
  // a wrapper <div> pairing a .copy-btn with its <pre>. That is true for the
  // per-example snippets under a .preview AND for the standalone CSS/JS source
  // sections at the bottom of every page. Pairing on "next sibling of .preview"
  // (the old rule) missed the source sections entirely: their blocks got no
  // toggle and "Collapse all code" visibly did nothing for them.
  function initCodeCollapse() {
    // Guard against duplicate init (SPA replaces main innerHTML, so this is a safety net)
    if (document.querySelector('.code-collapse-toolbar')) return;

    var main = document.querySelector('main');
    if (!main) return;

    var pairs = [];

    main.querySelectorAll('.copy-btn').forEach(function (btn) {
      var wrapper = btn.parentElement;
      if (!wrapper || wrapper.tagName !== 'DIV' || !wrapper.querySelector('pre')) return;

      wrapper.classList.add('code-block-wrapper');

      var toggle = document.createElement('button');
      toggle.className = 'code-toggle-btn';
      toggle.setAttribute('aria-expanded', 'true');
      toggle.innerHTML = CODE_ICON + ' Hide code';

      wrapper.parentNode.insertBefore(toggle, wrapper);

      toggle.addEventListener('click', function () {
        var collapsed = wrapper.classList.toggle('code-collapsed');
        toggle.setAttribute('aria-expanded', String(!collapsed));
        toggle.innerHTML = CODE_ICON + (collapsed ? ' Show code' : ' Hide code');
        syncAllBtn();
      });

      pairs.push({ toggle: toggle, wrapper: wrapper });
    });

    if (!pairs.length) return;

    // Collapse-all / Expand-all toolbar
    var toolbar = document.createElement('div');
    toolbar.className = 'code-collapse-toolbar';
    var allBtn = document.createElement('button');
    allBtn.className = 'code-collapse-all-btn';
    allBtn.innerHTML = CODE_ICON + ' Collapse all code';
    toolbar.appendChild(allBtn);

    // Move spec <details> out of sticky page-header into scrollable area
    var pageHeader = main.querySelector('.page-header');
    var details = pageHeader ? pageHeader.querySelector('details') : main.querySelector('details');
    if (details && pageHeader && pageHeader.contains(details)) {
      pageHeader.insertAdjacentElement('afterend', details);
    }

    // Place toolbar inside the sticky header (after the last child)
    if (pageHeader) {
      pageHeader.appendChild(toolbar);
    } else if (details) {
      details.insertAdjacentElement('afterend', toolbar);
    } else {
      pairs[0].wrapper.insertAdjacentElement('beforebegin', toolbar);
    }

    function syncAllBtn() {
      var allCollapsed = pairs.every(function (p) { return p.wrapper.classList.contains('code-collapsed'); });
      allBtn.innerHTML = CODE_ICON + (allCollapsed ? ' Expand all code' : ' Collapse all code');
    }

    allBtn.addEventListener('click', function () {
      var allCollapsed = pairs.every(function (p) { return p.wrapper.classList.contains('code-collapsed'); });
      pairs.forEach(function (p) {
        if (allCollapsed) {
          p.wrapper.classList.remove('code-collapsed');
          p.toggle.setAttribute('aria-expanded', 'true');
          p.toggle.innerHTML = CODE_ICON + ' Hide code';
        } else {
          p.wrapper.classList.add('code-collapsed');
          p.toggle.setAttribute('aria-expanded', 'false');
          p.toggle.innerHTML = CODE_ICON + ' Show code';
        }
      });
      syncAllBtn();
    });
  }

  // -- Viewport-width toolbar for .demo[data-viewport] -------
  // Why: layout demos (auto-fit grids, wrapping flex, container queries) only
  // make sense when the reader can change the available width. Any .demo with
  // data-viewport gets a toolbar (Mobile/Tablet/Desktop/Full) that resizes its
  // .demo-viewport — the "mini browser" the demo renders into. Container
  // queries react because the width really changes; no iframes involved.
  var VP_SIZES = [['Mobile', 360], ['Tablet', 768], ['Desktop', 1024], ['Full', null]];
  function initViewportStages() {
    document.querySelectorAll('.demo[data-viewport]:not([data-vp-init])').forEach(function (demo) {
      demo.setAttribute('data-vp-init', '');
      var viewport = demo.querySelector('.demo-viewport');
      if (!viewport) return;
      var toolbar = document.createElement('div');
      toolbar.className = 'vp-toolbar';
      toolbar.setAttribute('role', 'toolbar');
      toolbar.setAttribute('aria-label', 'Preview width');
      VP_SIZES.forEach(function (size) {
        var label = size[0], width = size[1];
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'vp-btn';
        btn.textContent = width ? label + ' ' + width : label;
        btn.setAttribute('aria-pressed', width === null ? 'true' : 'false');
        btn.addEventListener('click', function () {
          toolbar.querySelectorAll('.vp-btn').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
          btn.setAttribute('aria-pressed', 'true');
          viewport.style.inlineSize = width === null ? '100%' : width + 'px';
        });
        toolbar.appendChild(btn);
      });
      demo.insertBefore(toolbar, demo.firstChild);
    });
  }

  // -- Reusable page content initializer -------------------
  // Called on initial load AND after each SPA navigation.
  function initPageContent() {
    // Syntax highlighting handled by shiki-highlight.js module

    // Doc tabs (Preview / Pattern / HTML)
    document.querySelectorAll('.doc-tablist[role="tablist"]').forEach(function (tabList) {
      var buttons = Array.from(tabList.querySelectorAll('.tab-btn'));
      buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var panelId = btn.getAttribute('aria-controls');
          var group = btn.dataset.group;
          buttons.forEach(function (t) { t.setAttribute('aria-selected', 'false'); });
          btn.setAttribute('aria-selected', 'true');
          document.querySelectorAll('[data-tab-group="' + group + '"]').forEach(function (p) { p.classList.remove('active'); });
          var panel = document.getElementById(panelId);
          if (panel) panel.classList.add('active');
        });
      });
    });

    // Copy buttons
    document.querySelectorAll('.copy-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pre = btn.nextElementSibling;
        if (!pre) return;
        navigator.clipboard.writeText(pre.innerText).then(function () {
          btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Copied';
          setTimeout(function () {
            btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg> Copy';
          }, 2000);
        });
      });
    });

    // Lucide icons
    // vendor CDN globals: read via globalThis, never assign (AGENTS.md)
    if (globalThis.lucide) globalThis.lucide.createIcons();

    // Token swatches
    initTokenSwatches();

    // Code collapse/expand toggles
    initCodeCollapse();

    // Viewport-width toolbars on resizable demos
    initViewportStages();
  }

  // Register content initializer with SPA router
  // (runs on initial load AND after each SPA navigation)
  docs.onPageReady(initPageContent);

  // The Component Skill `<details>` (with its `[data-spec-href]` link in the
  // summary) toggles natively — a former modal viewer intercepted these clicks
  // with preventDefault(), which killed that native toggle while duplicating
  // content the panel already renders. Removed: the browser does it for free.

  // -- On DOM ready (one-time setup + initial content init) -
  document.addEventListener('DOMContentLoaded', function () {
    // Sync dark mode icon state
    var isDark = document.documentElement.classList.contains('dark');
    var sun = document.getElementById('icon-sun');
    var moon = document.getElementById('icon-moon');
    if (sun) sun.style.display = isDark ? 'none' : 'block';
    if (moon) moon.style.display = isDark ? 'block' : 'none';

    // Bind theme toggle (once — header persists across SPA navs)
    var themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleDark);

    // Handle hash-link clicks (TOC "On This Page", built-with pills, etc.)
    // Default anchor scroll doesn't always work after SPA navigation, so we
    // scrollIntoView — but its end offset is computed AT CLICK TIME. Any reflow
    // during the smooth scroll (shiki swapping every code block in, web fonts
    // swapping, late jsDelivr CSS on the published CDN site — issue #2) leaves
    // the scroll stopped at a stale offset: the clicked heading ends up hidden
    // under the fixed header (or a gap above it). So once scrolling settles we
    // re-align once; any reader input aborts so we never fight the user.
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link) return;
      var id = link.getAttribute('href').slice(1);
      var target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', '#' + id);
        realignWhenSettled(id);
      }
    });
  });
})();
